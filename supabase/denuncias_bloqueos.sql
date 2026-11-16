-- Denunciar y bloquear contenido de usuarios (App Review 1.2).
-- Aplicación manual: lo pega Lucas en el SQL Editor (+ New query). Reaplicable.
-- Requiere clases_particulares.sql, perfil_profesor.sql, administradores.sql,
-- directorio_perfiles.sql y profesores.sql.
--
-- Qué guarda:
--   contenido_denuncias: quién denunció (solo para limitar abusos y borrar en
--     cascada; el admin no lo ve), qué contenido, motivo y texto opcional.
--   contenido_bloqueos: qué profesor particular bloqueó cada cuenta.
-- Ninguna de las dos se lee ni escribe directo: solo por las RPC de abajo. El
-- uid de un profesor nunca sale hacia quien denuncia o bloquea: se bloquea desde
-- el id del anuncio o de la ficha pública, que ya son públicos.
--
-- Borrado: las dos tablas apuntan a auth.users ON DELETE CASCADE por quien
-- denuncia/bloquea y por el profesor. Borrar cualquiera de las dos cuentas borra
-- la fila (eliminar_mi_cuenta.sql). `resuelta_por` es del admin y queda en null,
-- igual que admin.acciones.
--
-- No hay ocultamiento automático por cantidad de denuncias (Lucas, 2026-11-15):
-- en un directorio con anuncios pagados, juntar cuentas para bajar a otro profe
-- sería fácil. Una persona del equipo revisa y decide.
begin;

create table if not exists public.contenido_denuncias (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  tipo          text not null check (tipo in ('anuncio', 'perfil', 'opinion')),
  autor_id      uuid references auth.users(id) on delete cascade,
  anuncio_id    uuid references public.tutor_anuncios(id) on delete cascade,
  opinion       jsonb,
  motivo        text not null,
  detalle       text check (detalle is null or char_length(detalle) between 1 and 500),
  estado        text not null default 'pendiente' check (estado in ('pendiente', 'resuelta', 'descartada')),
  creada        timestamptz not null default now(),
  resuelta_at   timestamptz,
  resuelta_por  uuid references auth.users(id) on delete set null,
  constraint contenido_denuncias_objetivo check (
    (tipo = 'anuncio' and autor_id is not null and anuncio_id is not null and opinion is null)
    or (tipo = 'perfil' and autor_id is not null and anuncio_id is null and opinion is null)
    or (tipo = 'opinion' and autor_id is null and anuncio_id is null and opinion is not null))
);
alter table public.contenido_denuncias drop constraint if exists contenido_denuncias_motivo_check;
alter table public.contenido_denuncias add constraint contenido_denuncias_motivo_check
  check (motivo in ('ofensivo', 'enganoso', 'spam', 'datos_personales', 'incorrecto', 'otro'));
create index if not exists contenido_denuncias_pendientes on public.contenido_denuncias(creada) where estado = 'pendiente';
create index if not exists contenido_denuncias_cuenta on public.contenido_denuncias(user_id, creada);
create index if not exists contenido_denuncias_autor on public.contenido_denuncias(autor_id);
alter table public.contenido_denuncias enable row level security;
revoke all on public.contenido_denuncias from public, anon, authenticated;

create table if not exists public.contenido_bloqueos (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  autor_id  uuid not null references auth.users(id) on delete cascade,
  creado    timestamptz not null default now(),
  unique (user_id, autor_id),
  check (user_id <> autor_id)
);
create index if not exists contenido_bloqueos_autor on public.contenido_bloqueos(autor_id);
alter table public.contenido_bloqueos enable row level security;
revoke all on public.contenido_bloqueos from public, anon, authenticated;

-- Dueño de un anuncio publicado o de una ficha aprobada. Interna.
create or replace function admin.autor_de_contenido(p_tipo text, p_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case p_tipo
    when 'anuncio' then (select a.autor_id from public.tutor_anuncios a where a.id = p_id and a.estado = 'publicado')
    when 'perfil' then (select p.user_id from public.tutor_perfiles p where p.directorio_id = p_id and p.estado = 'aprobado')
  end;
$$;
revoke all on function admin.autor_de_contenido(text, uuid) from public, anon, authenticated;

-- Hasta 20 denuncias por día y cuenta; repetir la misma denuncia pendiente la
-- actualiza en vez de duplicarla.
create or replace function admin.guardar_denuncia(p_tipo text, p_autor uuid, p_anuncio uuid, p_opinion jsonb,
  p_motivo text, p_detalle text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); texto text := nullif(btrim(coalesce(p_detalle, '')), ''); fila bigint;
begin
  if uid is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  if p_motivo is null or p_motivo not in ('ofensivo', 'enganoso', 'spam', 'datos_personales', 'incorrecto', 'otro') then
    raise exception 'motivo inválido';
  end if;
  if char_length(texto) > 500 then raise exception 'el detalle puede tener hasta 500 caracteres'; end if;
  if p_autor = uid then raise exception 'no puedes denunciar tu propio contenido'; end if;
  select d.id into fila from public.contenido_denuncias d
   where d.user_id = uid and d.estado = 'pendiente' and d.tipo = p_tipo
     and d.autor_id is not distinct from p_autor and d.anuncio_id is not distinct from p_anuncio
     and d.opinion is not distinct from p_opinion;
  if fila is not null then
    update public.contenido_denuncias set motivo = p_motivo, detalle = texto, creada = now() where id = fila;
    return fila;
  end if;
  if (select count(*) from public.contenido_denuncias d where d.user_id = uid and d.creada > now() - interval '1 day') >= 20 then
    raise exception 'demasiadas denuncias';
  end if;
  insert into public.contenido_denuncias(user_id, tipo, autor_id, anuncio_id, opinion, motivo, detalle)
  values (uid, p_tipo, p_autor, p_anuncio, p_opinion, p_motivo, texto) returning id into fila;
  return fila;
end;
$$;
revoke all on function admin.guardar_denuncia(text, uuid, uuid, jsonb, text, text) from public, anon, authenticated;

-- Anuncio publicado o ficha aprobada. p_id es el id del anuncio o el
-- directorio_id de la ficha (el `id` que ya recibe la app).
create or replace function public.denunciar_contenido(p_tipo text, p_id uuid, p_motivo text, p_detalle text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare autor uuid;
begin
  if p_tipo not in ('anuncio', 'perfil') then raise exception 'tipo inválido'; end if;
  autor := admin.autor_de_contenido(p_tipo, p_id);
  if autor is null then raise exception 'contenido no disponible'; end if;
  perform admin.guardar_denuncia(p_tipo, autor, case when p_tipo = 'anuncio' then p_id end, null, p_motivo, p_detalle);
  return true;
end;
$$;

-- La calificación que se publica de un docente (nombre por consenso y
-- promedio). Se identifica con el ramo propio, como el resto de profesores.sql;
-- se guarda el docente publicado, nunca quién calificó.
create or replace function public.denunciar_opinion_profesor(p_ramo_id text, p_seccion integer, p_periodo text,
  p_motivo text, p_detalle text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c record; d text;
begin
  select * into strict c from public.profesor_contexto(p_ramo_id, p_seccion);
  d := public.profesor_docente_publico(c.tenant, c.ramo_clave, p_seccion, p_periodo);
  if d is null then raise exception 'contenido no disponible'; end if;
  perform admin.guardar_denuncia('opinion', null, null,
    jsonb_build_object('tenant', c.tenant, 'ramo_clave', c.ramo_clave, 'seccion', p_seccion, 'periodo', p_periodo, 'docente', d),
    p_motivo, p_detalle);
  return true;
end;
$$;

create or replace function public.bloquear_autor(p_tipo text, p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); autor uuid;
begin
  if uid is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  if p_tipo not in ('anuncio', 'perfil') then raise exception 'tipo inválido'; end if;
  autor := admin.autor_de_contenido(p_tipo, p_id);
  if autor is null then raise exception 'contenido no disponible'; end if;
  if autor = uid then raise exception 'no puedes bloquearte'; end if;
  insert into public.contenido_bloqueos(user_id, autor_id) values (uid, autor) on conflict (user_id, autor_id) do nothing;
  return true;
end;
$$;

create or replace function public.desbloquear_autor(p_bloqueo bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare filas integer;
begin
  if auth.uid() is null then raise exception 'sin sesión' using errcode = '42501'; end if;
  delete from public.contenido_bloqueos where id = p_bloqueo and user_id = auth.uid();
  get diagnostics filas = row_count;
  return filas = 1;
end;
$$;

-- Lo que la app necesita para filtrar y para Ajustes: el nombre público, las
-- fichas y los anuncios publicados de cada bloqueado. Nunca su uid.
create or replace function public.mis_bloqueos()
returns table(id bigint, nombre text, perfiles uuid[], anuncios uuid[], creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.id, coalesce(p.nombre_publico, 'Profesor particular'),
    case when p.directorio_id is null then '{}'::uuid[] else array[p.directorio_id] end,
    array(select a.id from public.tutor_anuncios a where a.autor_id = b.autor_id and a.estado = 'publicado' order by a.id),
    b.creado
  from public.contenido_bloqueos b left join public.tutor_perfiles p on p.user_id = b.autor_id
  where b.user_id = auth.uid()
  order by b.creado desc;
$$;

-- Administración (lista + segundo factor). Muestra el contenido denunciado y
-- cuántas denuncias pendientes tiene, nunca quién denunció.
create or replace function public.admin_denuncias()
returns table(id bigint, tipo text, motivo text, detalle text, creada timestamptz, autor_id uuid,
  autor_nombre text, autor_estado text, anuncio_id uuid, anuncio_titulo text, anuncio_descripcion text,
  anuncio_estado text, perfil_presentacion text, opinion jsonb, docente_oculto boolean, mismas integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform admin.exigir_administrador();
  return query
    select d.id, d.tipo, d.motivo, d.detalle, d.creada, d.autor_id, p.nombre_publico, p.estado,
      d.anuncio_id, a.titulo, a.descripcion, a.estado, p.presentacion, d.opinion,
      d.tipo = 'opinion' and exists(select 1 from public.profesor_ocultos o
        where o.tenant = d.opinion->>'tenant' and public.profesor_coinciden(o.nombre, d.opinion->>'docente')),
      (select count(*)::integer from public.contenido_denuncias x where x.estado = 'pendiente'
        and x.tipo = d.tipo and x.autor_id is not distinct from d.autor_id
        and x.anuncio_id is not distinct from d.anuncio_id and x.opinion is not distinct from d.opinion)
    from public.contenido_denuncias d
    left join public.tutor_perfiles p on p.user_id = d.autor_id
    left join public.tutor_anuncios a on a.id = d.anuncio_id
    where d.estado = 'pendiente'
    order by d.creada;
end;
$$;

-- Cierra la denuncia y las demás pendientes sobre el mismo contenido.
create or replace function public.admin_resolver_denuncia(p_id bigint, p_estado text)
returns integer language plpgsql security definer set search_path = '' as $$
declare d public.contenido_denuncias%rowtype; filas integer;
begin
  perform admin.exigir_administrador();
  if p_estado not in ('resuelta', 'descartada') then raise exception 'estado inválido'; end if;
  select * into d from public.contenido_denuncias where id = p_id and estado = 'pendiente';
  if not found then return 0; end if;
  update public.contenido_denuncias x set estado = p_estado, resuelta_at = now(), resuelta_por = auth.uid()
   where x.estado = 'pendiente' and x.tipo = d.tipo and x.autor_id is not distinct from d.autor_id
     and x.anuncio_id is not distinct from d.anuncio_id and x.opinion is not distinct from d.opinion;
  get diagnostics filas = row_count;
  insert into admin.acciones(admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'resolver_denuncia', d.autor_id, jsonb_build_object('denuncia', p_id, 'tipo', d.tipo, 'estado', p_estado, 'cerradas', filas));
  return filas;
end;
$$;

-- Opiniones: deja de publicarse el docente y su calificación en esa
-- universidad (profesor_ocultos, motivo 'abuso'), sin revelar ni tocar a
-- quienes calificaron. Se revierte borrando la fila desde el SQL Editor.
-- Excluir aportes de una cuenta autora sigue siendo el procedimiento de
-- profesores.sql («Suprimir»).
create or replace function public.admin_ocultar_docente_denunciado(p_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.contenido_denuncias%rowtype;
begin
  perform admin.exigir_administrador();
  select * into d from public.contenido_denuncias where id = p_id and tipo = 'opinion';
  if not found then raise exception 'denuncia no encontrada'; end if;
  insert into public.profesor_ocultos(tenant, nombre, motivo)
  values (d.opinion->>'tenant', d.opinion->>'docente', 'abuso') on conflict (tenant, nombre) do nothing;
  insert into admin.acciones(admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'ocultar_docente', null, jsonb_build_object('denuncia', p_id, 'tenant', d.opinion->>'tenant'));
  return true;
end;
$$;

revoke all on function public.denunciar_contenido(text, uuid, text, text),
  public.denunciar_opinion_profesor(text, integer, text, text, text),
  public.bloquear_autor(text, uuid), public.desbloquear_autor(bigint), public.mis_bloqueos(),
  public.admin_denuncias(), public.admin_resolver_denuncia(bigint, text),
  public.admin_ocultar_docente_denunciado(bigint) from public, anon;
grant execute on function public.denunciar_contenido(text, uuid, text, text),
  public.denunciar_opinion_profesor(text, integer, text, text, text),
  public.bloquear_autor(text, uuid), public.desbloquear_autor(bigint), public.mis_bloqueos(),
  public.admin_denuncias(), public.admin_resolver_denuncia(bigint, text),
  public.admin_ocultar_docente_denunciado(bigint) to authenticated;

commit;
