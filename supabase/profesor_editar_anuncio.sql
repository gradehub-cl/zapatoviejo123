-- El profesor edita su anuncio publicado y le pone descuento (Lucas, 2026-11-24).
--
-- Hasta ahora un anuncio publicado solo lo corregía GradeHub
-- (admin_editar_anuncio) y el descuento «por venir de GradeHub» con su código
-- lo fijaba solo un admin (admin_descuento_codigo_anuncio). Con esto:
--
-- 1. El profesor dueño propone cambios al contenido de su anuncio publicado,
--    pausado o programado. Desde el 2026-11-24 (Lucas) la edición pasa por
--    revisión: queda en tutor_anuncio_ediciones y el anuncio se sigue
--    mostrando como estaba hasta que un admin la aprueba
--    (admin_resolver_edicion_anuncio). Público, ramos, universidad y tipo NO
--    se cambian acá: definen a quién se le muestra y lo que se cobra.
--    Ni proponer ni aprobar tocan estado, publicado_at, campaña, medición ni
--    cobro: no cuenta como publicación nueva ni reinicia métricas.
-- 2. El descuento y el código los pone el profesor solo si su perfil tiene
--    descuento_propio = true. Parte apagado para todos; se habilita por
--    profesor con admin.descuento_propio_profesor (abajo). Para abrirlo a
--    todos los profesores, ver el final del archivo.
--
-- Cada paso queda en admin.acciones ('enviar_edicion_anuncio',
-- 'aprobar_edicion_anuncio', 'rechazar_edicion_anuncio'); ninguno dispara el
-- aviso «editado por GradeHub», que mira 'editar_anuncio'.
-- Requiere clases_particulares.sql, clases_pack_descuento.sql y
-- administradores.sql aplicados. Reaplicable: no cambia anuncios ni perfiles.

begin;

alter table public.tutor_perfiles add column if not exists descuento_propio boolean not null default false;
-- El profesor la lee (para saber si mostrar el descuento); nadie la escribe
-- desde el cliente: no hay grant de update sobre esta columna.
grant select (descuento_propio) on public.tutor_perfiles to authenticated;

-- Habilitar o quitar el descuento propio a un profesor, desde el SQL Editor:
--   select admin.descuento_propio_profesor('<user_id del profesor>', true);
create or replace function admin.descuento_propio_profesor(p_user_id uuid, p_permitir boolean)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update public.tutor_perfiles set descuento_propio = coalesce(p_permitir, false) where user_id = p_user_id;
  if not found then raise exception 'no existe ese profesor'; end if;
  return case when p_permitir then 'puede poner descuento' else 'sin descuento propio' end;
end;
$$;
revoke all on function admin.descuento_propio_profesor(uuid, boolean) from public, anon, authenticated;

create or replace function public.puedo_poner_descuento()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.descuento_propio from public.tutor_perfiles p
    where p.user_id = auth.uid() and p.estado = 'aprobado'), false);
$$;
revoke all on function public.puedo_poner_descuento() from public, anon;
grant execute on function public.puedo_poner_descuento() to authenticated;

-- Una edición por anuncio a la vez: la última propuesta reemplaza a la anterior.
create table if not exists public.tutor_anuncio_ediciones (
  anuncio_id  uuid primary key references public.tutor_anuncios(id) on delete cascade,
  autor_id    uuid not null references auth.users(id) on delete cascade,
  datos       jsonb not null check (jsonb_typeof(datos) = 'object'),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'rechazada')),
  comentario  text check (comentario is null or char_length(comentario) between 10 and 1000),
  enviada_at  timestamptz not null default now(),
  revisada_at timestamptz
);
alter table public.tutor_anuncio_ediciones enable row level security;
revoke all on public.tutor_anuncio_ediciones from public, anon, authenticated;
grant select on public.tutor_anuncio_ediciones to authenticated;
drop policy if exists tutor_anuncio_ediciones_select_propia on public.tutor_anuncio_ediciones;
create policy tutor_anuncio_ediciones_select_propia on public.tutor_anuncio_ediciones
  for select to authenticated using ((select auth.uid()) = autor_id);

-- Columnas que un profesor puede proponer. Las mismas para validar y aplicar.
create or replace function admin.campos_edicion_profesor()
returns text[] language sql immutable set search_path = '' as $$
  select array['titulo','descripcion','precio_clp','pack_clases','modalidad','modalidad_otra',
    'ubicacion','ubicacion_otra','detalles','linea_datos','contacto_tipo','contacto_valor',
    'descuento_gradehub_pct','codigo_descuento'];
$$;
revoke all on function admin.campos_edicion_profesor() from public, anon, authenticated;

-- Aplica `datos` sobre el anuncio en memoria, normaliza y valida el
-- descuento, y devuelve la fila resultante. No escribe nada.
create or replace function admin.anuncio_con_edicion(anterior public.tutor_anuncios, datos jsonb)
returns public.tutor_anuncios language plpgsql stable set search_path = '' as $$
declare
  nuevo public.tutor_anuncios%rowtype;
  codigo text;
begin
  nuevo := jsonb_populate_record(anterior, datos);
  codigo := nullif(upper(btrim(coalesce(nuevo.codigo_descuento, ''))), '');
  if nuevo.descuento_gradehub_pct is not null and nuevo.descuento_gradehub_pct not between 1 and 50 then
    raise exception 'el descuento va de 1 a 50';
  end if;
  if codigo is not null and nuevo.descuento_gradehub_pct is null then
    raise exception 'un código necesita un descuento';
  end if;
  if codigo is not null and codigo !~ '^[A-Z0-9][A-Z0-9_-]{2,19}$' then
    raise exception 'el código usa de 3 a 20 letras, números, guion o guion bajo';
  end if;
  nuevo.codigo_descuento := codigo;
  return nuevo;
end;
$$;
revoke all on function admin.anuncio_con_edicion(public.tutor_anuncios, jsonb) from public, anon, authenticated;

-- El profesor envía cambios a revisión. Devuelve true si quedó una edición
-- pendiente; false si lo enviado es igual a lo publicado (y retira la que hubiera).
create or replace function public.profesor_editar_anuncio(p_anuncio_id uuid, p_datos jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  anterior public.tutor_anuncios%rowtype;
  nuevo public.tutor_anuncios%rowtype;
  campos text[] := admin.campos_edicion_profesor();
  previa jsonb;
  cambios jsonb;
  propuesta jsonb;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'los datos deben ser un objeto';
  end if;
  if exists (select 1 from jsonb_object_keys(p_datos) k where not (k = any(campos))) then
    raise exception 'campo no permitido';
  end if;
  if not exists (select 1 from public.tutor_perfiles p where p.user_id = auth.uid() and p.estado = 'aprobado') then
    raise exception 'tu perfil de profesor no está aprobado';
  end if;
  if (p_datos ? 'descuento_gradehub_pct' or p_datos ? 'codigo_descuento') and not public.puedo_poner_descuento() then
    raise exception 'tu cuenta no puede poner descuentos';
  end if;
  select * into anterior from public.tutor_anuncios
    where id = p_anuncio_id and autor_id = auth.uid() for update;
  if not found then return false; end if;
  if anterior.estado not in ('publicado','pausado') then
    raise exception 'este anuncio no se edita desde acá';
  end if;
  -- El editor parte de la propuesta anterior y manda solo lo que cambió:
  -- se suma a lo ya propuesto.
  select e.datos into previa from public.tutor_anuncio_ediciones e where e.anuncio_id = p_anuncio_id;
  nuevo := admin.anuncio_con_edicion(anterior, coalesce(previa, '{}'::jsonb) || p_datos);
  select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(anterior)->k, 'despues', to_jsonb(nuevo)->k)),
         jsonb_object_agg(k, to_jsonb(nuevo)->k)
    into cambios, propuesta from unnest(campos) k
    where (to_jsonb(anterior)->k) is distinct from (to_jsonb(nuevo)->k);
  if cambios is null then
    delete from public.tutor_anuncio_ediciones where anuncio_id = p_anuncio_id;
    return false;
  end if;
  insert into public.tutor_anuncio_ediciones (anuncio_id, autor_id, datos, estado, comentario, enviada_at, revisada_at)
    values (p_anuncio_id, auth.uid(), propuesta, 'pendiente', null, now(), null)
    on conflict (anuncio_id) do update set datos = excluded.datos, estado = 'pendiente', comentario = null,
      enviada_at = now(), revisada_at = null;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'enviar_edicion_anuncio', p_anuncio_id, cambios);
  return true;
end;
$$;
revoke all on function public.profesor_editar_anuncio(uuid, jsonb) from public, anon;
grant execute on function public.profesor_editar_anuncio(uuid, jsonb) to authenticated;

-- Para el panel de Admin: ediciones pendientes con lo de antes y lo propuesto.
create or replace function public.admin_ediciones_anuncio_pendientes()
returns table(anuncio_id uuid, cambios jsonb, enviada_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform admin.exigir_administrador();
  return query
    select e.anuncio_id,
      (select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(a)->k, 'despues', e.datos->k))
         from jsonb_object_keys(e.datos) k),
      e.enviada_at
    from public.tutor_anuncio_ediciones e join public.tutor_anuncios a on a.id = e.anuncio_id
    where e.estado = 'pendiente'
    order by e.enviada_at;
end;
$$;
revoke all on function public.admin_ediciones_anuncio_pendientes() from public, anon;
grant execute on function public.admin_ediciones_anuncio_pendientes() to authenticated;

-- Aprobar aplica solo columnas de contenido: estado, publicado_at, campaña y
-- medición quedan intactos. Rechazar deja el comentario para el profesor.
create or replace function public.admin_resolver_edicion_anuncio(p_anuncio_id uuid, p_aprobar boolean, p_comentario text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  edicion public.tutor_anuncio_ediciones%rowtype;
  anterior public.tutor_anuncios%rowtype;
  nuevo public.tutor_anuncios%rowtype;
  cambios jsonb;
  texto text := nullif(btrim(coalesce(p_comentario, '')), '');
begin
  perform admin.exigir_administrador();
  select * into edicion from public.tutor_anuncio_ediciones where anuncio_id = p_anuncio_id and estado = 'pendiente' for update;
  if not found then return false; end if;
  if not coalesce(p_aprobar, false) then
    if texto is null or char_length(texto) not between 10 and 1000 then
      raise exception 'escribe un comentario de 10 a 1000 caracteres';
    end if;
    update public.tutor_anuncio_ediciones set estado = 'rechazada', comentario = texto, revisada_at = now()
      where anuncio_id = p_anuncio_id;
    insert into admin.acciones (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'rechazar_edicion_anuncio', p_anuncio_id, jsonb_build_object('comentario', texto));
    return true;
  end if;
  select * into anterior from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or anterior.estado not in ('publicado','pausado') then
    raise exception 'este anuncio ya no se puede editar';
  end if;
  nuevo := admin.anuncio_con_edicion(anterior, edicion.datos);
  select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(anterior)->k, 'despues', to_jsonb(nuevo)->k))
    into cambios from unnest(admin.campos_edicion_profesor()) k
    where (to_jsonb(anterior)->k) is distinct from (to_jsonb(nuevo)->k);
  if cambios is not null then
    update public.tutor_anuncios set
      titulo = nuevo.titulo, descripcion = nuevo.descripcion, precio_clp = nuevo.precio_clp,
      pack_clases = nuevo.pack_clases, modalidad = nuevo.modalidad, modalidad_otra = nuevo.modalidad_otra,
      ubicacion = nuevo.ubicacion, ubicacion_otra = nuevo.ubicacion_otra, detalles = nuevo.detalles,
      linea_datos = nuevo.linea_datos, contacto_tipo = nuevo.contacto_tipo, contacto_valor = nuevo.contacto_valor,
      descuento_gradehub_pct = nuevo.descuento_gradehub_pct, codigo_descuento = nuevo.codigo_descuento
    where id = p_anuncio_id;
  end if;
  delete from public.tutor_anuncio_ediciones where anuncio_id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'aprobar_edicion_anuncio', p_anuncio_id, coalesce(cambios, '{}'::jsonb));
  return true;
end;
$$;
revoke all on function public.admin_resolver_edicion_anuncio(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolver_edicion_anuncio(uuid, boolean, text) to authenticated;

commit;

-- ABRIRLO A TODOS LOS PROFESORES (solo si Lucas lo decide; una vez):
--   alter table public.tutor_perfiles alter column descuento_propio set default true;
--   update public.tutor_perfiles set descuento_propio = true;
