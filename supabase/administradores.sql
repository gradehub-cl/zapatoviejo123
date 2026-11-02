-- PR #515 · RESPALDO OBLIGATORIO ANTES DE APLICAR A UNA BASE EXISTENTE.
-- 1. Ejecutar supabase/respaldo_campanas_515.sql UNA VEZ (schema privado,
--    RLS y permisos revocados; falla si ya existe para no pisar el respaldo).
--    Sus consultas incluyen:
--    create table respaldo_515.anuncio_metricas as select * from public.anuncio_metricas;
--    create table respaldo_515.anuncio_alcance as select * from public.anuncio_alcance;
--    create table respaldo_515.anuncio_interacciones as select * from public.anuncio_interacciones;
-- 2. Aplicar clases_particulares.sql, admin_clases.sql, administradores.sql,
--    en ese orden. Cada archivo es transaccional y reaplicable.
-- DESHACER (también si solo se alcanzó a aplicar el primer archivo):
-- 1. No publicar/renovar campañas durante la reversión.
-- 2. Ejecutar supabase/revertir_campanas_515.sql completo en SQL Editor.
--    Bloquea escrituras, archiva TODAS las métricas posteriores, restaura las
--    llaves antiguas y funciones respaldadas, sin restaurar cuentas ni cobros
--    a una foto vieja. Las métricas operativas quedan en la publicación actual.
-- 3. Ejecutar las consultas de docs/marketplace-campanas-seguras.md, sección
--    Reversión. No reaplicar los SQL antiguos por sí solos: sus ON CONFLICT
--    necesitan las llaves anteriores. No borrar respaldo_515 hasta verificar.
-- Ningún deploy ejecuta estos archivos. Solo el SQL Editor de Lucas.

begin;

-- ADMINISTRADORES DE GRADEHUB · verificación en dos pasos.
--
-- Pedido de Lucas del 2026-09-25: una página para ver y administrar las
-- campañas de todos los profesores, que aparezca solo en su cuenta. Que la
-- pestaña se vea solo ahí es cosmético —el repositorio es público—: lo que
-- protege es esto. Las funciones de la página preguntan en el servidor si
-- quien llama está en la lista Y entró con su segundo factor (aal2). AGENTS.md
-- lo exige: con un panel administrativo, la verificación en dos pasos deja de
-- ser opcional.
--
-- Se aplica a mano y es aditivo. Después hay que anotarse en la lista, también
-- a mano y con el correo propio (nunca queda escrito en el repositorio):
--
--   insert into admin.administradores (user_id)
--   select id from auth.users where email = 'TU CORREO';

create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

-- La lista. Vive en `admin`, que la API no expone: nadie la lee ni la escribe
-- desde el navegador. Se borra con la cuenta.
create table if not exists admin.administradores (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table admin.administradores enable row level security;
revoke all on admin.administradores from public, anon, authenticated;

-- ¿Esta cuenta es administradora? Solo para decidir si se muestra la pestaña:
-- no da acceso a nada. Responde por la propia cuenta y nada más.
create or replace function public.soy_administrador()
returns boolean
language sql
stable
security definer
set search_path = public, admin
as $$
  select auth.uid() is not null
     and exists (select 1 from admin.administradores where user_id = auth.uid());
$$;
revoke all on function public.soy_administrador() from public, anon;
grant execute on function public.soy_administrador() to authenticated;

-- La llave de verdad: administradora Y con el segundo factor verificado en esta
-- sesión. Toda función de la página la llama primero. No tiene grant: se usa
-- desde otras funciones security definer, nunca directo.
create or replace function public.administrador_verificado()
returns boolean
language sql
stable
security definer
set search_path = public, admin
as $$
  select public.soy_administrador()
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke all on function public.administrador_verificado() from public, anon, authenticated;

-- El flyer de un anuncio pendiente vive en Storage privado. El admin con
-- segundo factor puede leerlo para revisar el anuncio; los demás conservan
-- las políticas existentes de flyer visible o propio.
create or replace function public.flyer_revision_admin_visible(p_path text)
returns boolean language sql stable security definer set search_path = public, admin as $$
  select public.administrador_verificado() and exists (
    select 1 from public.tutor_anuncios a
    where a.flyer_path = p_path and a.estado = 'en_revision'
  );
$$;
revoke all on function public.flyer_revision_admin_visible(text) from public, anon;
grant execute on function public.flyer_revision_admin_visible(text) to authenticated;
drop policy if exists tutor_flyers_select_admin_revision on storage.objects;
create policy tutor_flyers_select_admin_revision on storage.objects
for select to authenticated using (
  bucket_id = 'tutor-flyers' and public.flyer_revision_admin_visible(name)
);

-- ─── LA PÁGINA DE ADMINISTRACIÓN DE CLASES ──────────────────────────────────
--
-- Pedido de Lucas del 2026-09-25: ver a todos los profesores con sus anuncios
-- activos y programados, sus números y lo que llevan gastado; marcar cada
-- campaña como cobrada o en deuda; pausar un aviso y pausar a un profesor.
-- Toda función empieza por administrador_verificado(): sin la lista y el
-- segundo factor, error. Toda acción queda registrada en admin.acciones.
--
-- Depende de supabase/clases_particulares.sql (con su sección CAMPAÑAS).

-- Cobrado o en deuda, por campaña: una campaña es un anuncio en una
-- publicación (anuncio + fecha en que se publicó). "Pendiente" es no tener fila.
create table if not exists admin.cobros (
  anuncio_id      uuid not null references public.tutor_anuncios(id) on delete cascade,
  publicado_at    timestamptz not null,
  estado          text not null check (estado in ('cobrado', 'deuda')),
  monto_clp       integer not null check (monto_clp between 0 and 5000000),
  actualizado_at  timestamptz not null default now(),
  primary key (anuncio_id, publicado_at)
);
alter table admin.cobros enable row level security;
revoke all on admin.cobros from public, anon, authenticated;

-- Quién hizo qué y cuándo. Si un profesor reclama que le pausaron un aviso,
-- acá está. Quien actuó queda en null si su cuenta se borra.
create table if not exists admin.acciones (
  id          bigint generated always as identity primary key,
  admin_id    uuid references auth.users(id) on delete set null,
  accion      text not null,
  objetivo    uuid,
  detalle     jsonb,
  created_at  timestamptz not null default now()
);
alter table admin.acciones enable row level security;
revoke all on admin.acciones from public, anon, authenticated;

create or replace function admin.exigir_administrador()
returns void
language plpgsql
stable
security definer
set search_path = public, admin
as $$
begin
  if not public.administrador_verificado() then
    raise exception 'sin acceso' using errcode = '42501';
  end if;
end;
$$;

-- Todo lo que la página muestra, en una sola lectura. El costo va bruto: la
-- app aplica el tope con la misma cuenta que ve el profesor.
-- Aceptar, rechazar y eliminar profesores desde el panel (Lucas, 2026-10-23).
-- Eliminar solo quita el rol de profesor: la cuenta, sus notas y su vida de
-- estudiante quedan intactas. Con campañas, cobros o alumnos conectados no se
-- elimina: se pausa, para no perder el historial ni dejar alumnos colgando.
create or replace function admin.profesor_tiene_historial(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public, admin as $$
  select exists (select 1 from public.tutor_anuncios a where a.autor_id = p_user_id
                   and (a.publicado_at is not null or a.estado in ('publicado', 'pausado', 'expirado')))
      or exists (select 1 from admin.cobros c join public.tutor_anuncios a on a.id = c.anuncio_id where a.autor_id = p_user_id)
      or exists (select 1 from admin.anuncio_publicaciones h join public.tutor_anuncios a on a.id = h.anuncio_id where a.autor_id = p_user_id);
$$;
-- profesor_alumnos.sql puede no estar aplicado: entonces no hay alumnos.
create or replace function admin.alumnos_conectados(p_user_id uuid)
returns integer language plpgsql stable security definer set search_path = public, admin as $$
declare n integer := 0;
begin
  if to_regclass('public.profesor_alumnos') is not null then
    execute 'select count(*) from public.profesor_alumnos where tutor_id = $1' into n using p_user_id;
  end if;
  return n;
end;
$$;

create or replace function public.admin_revisar_postulacion(p_user_id uuid, p_estado text)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare filas integer := 0;
begin
  perform admin.exigir_administrador();
  if p_estado not in ('aprobado', 'rechazado') then raise exception 'estado inválido'; end if;
  -- Se acepta una postulación pendiente o una rechazada por error; se rechaza
  -- solo una pendiente.
  update public.tutor_perfiles set estado = p_estado, revisado_at = now()
   where user_id = p_user_id
     and (estado = 'pendiente' or (estado = 'rechazado' and p_estado = 'aprobado'));
  get diagnostics filas = row_count;
  if filas = 1 then
    insert into admin.acciones (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'revisar_postulacion', p_user_id, jsonb_build_object('estado', p_estado));
  end if;
  return filas = 1;
end;
$$;

-- Nota interna por profesor: solo la ven y la escriben los admins, por
-- ejemplo el acuerdo de comisión. Sin grants: se usa solo por las RPC.
create table if not exists admin.notas_profesor (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  texto          text not null check (char_length(texto) <= 1000),
  admin_id       uuid references auth.users(id) on delete set null,
  actualizado_at timestamptz not null default now()
);
alter table admin.notas_profesor enable row level security;
revoke all on admin.notas_profesor from public, anon, authenticated;

create or replace function public.admin_nota_profesor(p_user_id uuid, p_texto text)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare texto text := btrim(coalesce(p_texto, ''));
begin
  perform admin.exigir_administrador();
  if char_length(texto) > 1000 then raise exception 'la nota puede tener hasta 1000 caracteres'; end if;
  if not exists (select 1 from public.tutor_perfiles where user_id = p_user_id) then return false; end if;
  if texto = '' then
    delete from admin.notas_profesor where user_id = p_user_id;
  else
    insert into admin.notas_profesor (user_id, texto, admin_id) values (p_user_id, texto, auth.uid())
    on conflict (user_id) do update set texto = excluded.texto, admin_id = excluded.admin_id, actualizado_at = now();
  end if;
  insert into admin.acciones (admin_id, accion, objetivo) values (auth.uid(), 'nota_profesor', p_user_id);
  return true;
end;
$$;

-- Mostrar u ocultar el panel de Alumnos de un profesor. Ocultar no borra a
-- nadie: al volver a mostrarlo están los mismos alumnos (profesor_alumnos.sql).
create or replace function public.admin_panel_alumnos_profesor(p_user_id uuid, p_activo boolean)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare filas integer := 0;
begin
  perform admin.exigir_administrador();
  if p_activo is null then raise exception 'falta elegir si se muestra'; end if;
  update public.tutor_perfiles set panel_alumnos = p_activo
   where user_id = p_user_id and panel_alumnos is distinct from p_activo;
  get diagnostics filas = row_count;
  if filas = 1 then
    insert into admin.acciones (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'panel_alumnos', p_user_id, jsonb_build_object('activo', p_activo));
  end if;
  return filas = 1;
end;
$$;

create or replace function public.admin_eliminar_profesor(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare nombre text;
begin
  perform admin.exigir_administrador();
  select nombre_publico into nombre from public.tutor_perfiles where user_id = p_user_id for update;
  if not found then return false; end if;
  if admin.profesor_tiene_historial(p_user_id) then
    raise exception 'tiene campañas con historial: páusalo en vez de eliminarlo';
  end if;
  if admin.alumnos_conectados(p_user_id) > 0 then
    raise exception 'tiene alumnos conectados: páusalo en vez de eliminarlo';
  end if;
  -- Sus borradores y anuncios en revisión: baja lógica, como en la revisión.
  update public.tutor_anuncios set estado = 'eliminado' where autor_id = p_user_id and estado <> 'eliminado';
  delete from public.tutor_perfiles where user_id = p_user_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'eliminar_profesor', p_user_id, jsonb_build_object('nombre', nombre));
  return true;
end;
$$;

create or replace function public.admin_panel_clases()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, admin
as $$
begin
  perform admin.exigir_administrador();
  return coalesce((
    select jsonb_agg(prof order by (prof ->> 'estado') = 'pendiente' desc, prof ->> 'nombre')
    from (
      select jsonb_build_object(
        'user_id', p.user_id,
        'nombre', p.nombre_publico,
        'estado', p.estado,
        'correo', u.email,
        'solicitado_at', p.solicitado_at,
        'presentacion', p.presentacion,
        'logo_aprobado_path', to_jsonb(p)->>'logo_aprobado_path',
        'tiene_historial', admin.profesor_tiene_historial(p.user_id),
        'alumnos_conectados', admin.alumnos_conectados(p.user_id),
        -- to_jsonb: sin profesor_alumnos.sql aplicado la columna no existe.
        'panel_alumnos', coalesce((to_jsonb(p)->>'panel_alumnos')::boolean, true),
        'nota', (select n.texto from admin.notas_profesor n where n.user_id = p.user_id),
        'ultimos_30_dias', jsonb_build_object(
          'vieron', (select count(*) from public.anuncio_alcance x join public.tutor_anuncios a on a.id = x.anuncio_id
                      where a.autor_id = p.user_id and x.dia >= (now() at time zone 'America/Santiago')::date - 30),
          'abrieron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                        where a.autor_id = p.user_id and x.tipo = 'apertura' and x.dia >= (now() at time zone 'America/Santiago')::date - 30),
          'contactaron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                           where a.autor_id = p.user_id and x.tipo = 'contacto' and x.dia >= (now() at time zone 'America/Santiago')::date - 30)),
        'historial', coalesce((select jsonb_agg(h order by h->>'fecha' desc) from (
            select jsonb_build_object('accion', c.accion, 'fecha', c.created_at, 'admin', au.email, 'detalle', c.detalle) h
              from admin.acciones c left join auth.users au on au.id = c.admin_id
             where c.objetivo = p.user_id
                or c.objetivo in (select a.id from public.tutor_anuncios a where a.autor_id = p.user_id)
             order by c.created_at desc limit 10) z), '[]'::jsonb),
        'anuncios', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id,
            'titulo', a.titulo,
            'estado', a.estado,
            'tenant', a.tenant,
            'ramos_siglas', a.ramos_siglas,
            'precio_clp', a.precio_clp,
            'tipo', coalesce(to_jsonb(a)->>'tipo', 'clase'),
            'pack_clases', to_jsonb(a)->'pack_clases',
            'descuento_gradehub_pct', to_jsonb(a)->'descuento_gradehub_pct',
            'codigo_descuento', to_jsonb(a)->'codigo_descuento',
            'descripcion', a.descripcion,
            'modalidad', a.modalidad,
            'modalidad_otra', a.modalidad_otra,
            'ubicacion', a.ubicacion,
            'ubicacion_otra', a.ubicacion_otra,
            'detalles', a.detalles,
            'linea_datos', a.linea_datos,
            'contacto_tipo', a.contacto_tipo,
            'contacto_valor', a.contacto_valor,
            'flyer_path', a.flyer_path,
            'criterios', a.criterios,
            'configuracion_campana', (select jsonb_build_object('dias', k.dias, 'inicio', k.inicio, 'tope_clp', k.tope_clp)
                                       from public.anuncio_campanas k where k.anuncio_id = a.id),
            'publicaciones_anteriores', (select count(*) from admin.anuncio_publicaciones h where h.anuncio_id = a.id),
            'publicado_at', a.publicado_at,
            'vence_at', a.vence_at,
            'created_at', a.created_at,
            'campana', (select to_jsonb(k) from public.costo_campana(a.id) k),
            'cobros', coalesce((select jsonb_agg(jsonb_build_object(
              'publicado_at', h.publicado_at, 'estado', h.estado, 'monto_clp', h.monto_clp,
              'actualizado_at', h.actualizado_at) order by h.publicado_at desc)
              from admin.cobros h where h.anuncio_id = a.id), '[]'::jsonb),
            'cobro', (select jsonb_build_object('estado', c.estado, 'monto_clp', c.monto_clp, 'actualizado_at', c.actualizado_at)
                        from admin.cobros c where c.anuncio_id = a.id and c.publicado_at = a.publicado_at)
          ) order by a.created_at desc)
          from public.tutor_anuncios a where a.autor_id = p.user_id), '[]'::jsonb)
      ) as prof
      from public.tutor_perfiles p
      left join auth.users u on u.id = p.user_id
    ) x), '[]'::jsonb);
end;
$$;

-- Pausa un aviso publicado o programado. Para volver a mostrarse pasa por
-- revisión, igual que cuando lo pausa el profesor.
create or replace function public.admin_pausar_anuncio(p_anuncio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  filas integer := 0;
begin
  perform admin.exigir_administrador();
  update public.tutor_anuncios set estado = 'pausado'
   where id = p_anuncio_id and estado = 'publicado';
  get diagnostics filas = row_count;
  if filas = 1 then
    insert into admin.acciones (admin_id, accion, objetivo) values (auth.uid(), 'pausar_anuncio', p_anuncio_id);
  end if;
  return filas = 1;
end;
$$;

-- Pausar a un profesor oculta todos sus avisos de una vez sin borrar nada
-- (la política de lectura exige profesor aprobado). Se revierte con 'aprobado'.
create or replace function public.admin_estado_profesor(p_user_id uuid, p_estado text)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  filas integer := 0;
begin
  perform admin.exigir_administrador();
  if p_estado not in ('aprobado', 'suspendido') then
    raise exception 'estado inválido';
  end if;
  update public.tutor_perfiles set estado = p_estado, revisado_at = now()
   where user_id = p_user_id and estado in ('aprobado', 'suspendido') and estado <> p_estado;
  get diagnostics filas = row_count;
  if filas = 1 then
    insert into admin.acciones (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'estado_profesor', p_user_id, jsonb_build_object('estado', p_estado));
  end if;
  return filas = 1;
end;
$$;

-- La fecha identifica qué publicación se está cobrando. Una renovación o
-- una segunda pestaña no pueden redirigir un pago hacia otra campaña.
create or replace function public.admin_marcar_cobro_publicacion(
  p_anuncio_id uuid, p_publicado_at timestamptz, p_estado text, p_monto_clp integer
)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  actual timestamptz;
begin
  perform admin.exigir_administrador();
  if p_estado is null or p_estado not in ('cobrado', 'deuda', 'pendiente') then
    raise exception 'estado de cobro inválido';
  end if;
  select publicado_at into actual from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or p_publicado_at is null or not (
    p_publicado_at is not distinct from actual
    or exists (select 1 from admin.anuncio_publicaciones where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at)
    or exists (select 1 from admin.cobros where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at)
  ) then
    raise exception 'esa publicación no existe';
  end if;
  if p_estado = 'pendiente' then
    delete from admin.cobros where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at;
  else
    if p_monto_clp is null or p_monto_clp not between 0 and 5000000 then
      raise exception 'monto inválido';
    end if;
    insert into admin.cobros (anuncio_id, publicado_at, estado, monto_clp)
    values (p_anuncio_id, p_publicado_at, p_estado, p_monto_clp)
    on conflict (anuncio_id, publicado_at) do update
      set estado = excluded.estado, monto_clp = excluded.monto_clp, actualizado_at = now();
  end if;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'marcar_cobro', p_anuncio_id,
    jsonb_build_object('publicado_at', p_publicado_at, 'estado', p_estado, 'monto_clp', p_monto_clp));
  return true;
end;
$$;

-- Compatibilidad con las pestañas que todavía usan el cliente anterior.
create or replace function public.admin_marcar_cobro(p_anuncio_id uuid, p_estado text, p_monto_clp integer)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  desde timestamptz;
begin
  perform admin.exigir_administrador();
  select publicado_at into desde from public.tutor_anuncios where id = p_anuncio_id for update;
  return public.admin_marcar_cobro_publicacion(p_anuncio_id, desde, p_estado, p_monto_clp);
end;
$$;

-- Edición comercial del anuncio. Estado, campañas, medición, cobros,
-- descuento, código y autor conservan sus caminos y permisos actuales.
create or replace function public.admin_editar_anuncio(p_anuncio_id uuid, p_datos jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  anterior public.tutor_anuncios%rowtype;
  nuevo public.tutor_anuncios%rowtype;
  campos text[] := array['titulo','descripcion','precio_clp','pack_clases','modalidad','modalidad_otra',
    'ubicacion','ubicacion_otra','detalles','linea_datos','contacto_tipo','contacto_valor',
    'ramos_siglas','tenant','criterios','tipo'];
  cambios jsonb;
begin
  perform admin.exigir_administrador();
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'los datos deben ser un objeto';
  end if;
  if exists (select 1 from jsonb_object_keys(p_datos) k where not (k = any(campos))) then
    raise exception 'campo no permitido';
  end if;
  select * into anterior from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found then return false; end if;
  if anterior.estado not in ('borrador','en_revision','publicado','pausado') then
    raise exception 'este anuncio ya no se puede editar';
  end if;
  -- Coerción a los tipos reales de la tabla, sin reemplazar sus checks.
  nuevo := jsonb_populate_record(anterior, p_datos);
  select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(anterior)->k, 'despues', to_jsonb(nuevo)->k))
    into cambios from unnest(campos) k
    where (to_jsonb(anterior)->k) is distinct from (to_jsonb(nuevo)->k);
  if cambios is null then return false; end if;
  update public.tutor_anuncios set
    titulo = nuevo.titulo, descripcion = nuevo.descripcion, precio_clp = nuevo.precio_clp,
    pack_clases = nuevo.pack_clases, modalidad = nuevo.modalidad, modalidad_otra = nuevo.modalidad_otra,
    ubicacion = nuevo.ubicacion, ubicacion_otra = nuevo.ubicacion_otra, detalles = nuevo.detalles,
    linea_datos = nuevo.linea_datos, contacto_tipo = nuevo.contacto_tipo, contacto_valor = nuevo.contacto_valor,
    ramos_siglas = nuevo.ramos_siglas, tenant = nuevo.tenant, criterios = nuevo.criterios, tipo = nuevo.tipo
  where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'editar_anuncio', p_anuncio_id, cambios);
  return true;
end;
$$;
revoke all on function public.admin_editar_anuncio(uuid, jsonb) from public, anon;
grant execute on function public.admin_editar_anuncio(uuid, jsonb) to authenticated;

create index if not exists acciones_ediciones_anuncio on admin.acciones (objetivo, id desc)
  where accion = 'editar_anuncio';

-- Un acuse por anuncio: no altera ni expone la auditoría. Al abrir una edición
-- antigua no se da por vista una corrección que haya llegado después.
create table if not exists admin.ediciones_anuncio_vistas (
  anuncio_id uuid primary key references public.tutor_anuncios(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  ultima_accion_id bigint not null references admin.acciones(id) on delete cascade
);
alter table admin.ediciones_anuncio_vistas enable row level security;
revoke all on admin.ediciones_anuncio_vistas from public, anon, authenticated;

create or replace function public.mis_anuncios_editados_gradehub()
returns table(anuncio_id uuid, accion_id bigint, editado_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select distinct on (a.id) a.id, h.id, h.created_at
    from public.tutor_anuncios a join admin.acciones h on h.objetivo = a.id and h.accion = 'editar_anuncio'
    left join admin.ediciones_anuncio_vistas v on v.anuncio_id = a.id and v.autor_id = a.autor_id
    where a.autor_id = auth.uid() and a.estado <> 'eliminado'
      and h.id > coalesce(v.ultima_accion_id, 0)
    order by a.id, h.id desc;
$$;
revoke all on function public.mis_anuncios_editados_gradehub() from public, anon;
grant execute on function public.mis_anuncios_editados_gradehub() to authenticated;

create or replace function public.marcar_edicion_anuncio_vista(p_anuncio_id uuid, p_accion_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tutor_anuncios a join admin.acciones h on h.objetivo = a.id
      where a.id = p_anuncio_id and a.autor_id = auth.uid() and h.id = p_accion_id and h.accion = 'editar_anuncio') then
    return false;
  end if;
  insert into admin.ediciones_anuncio_vistas (anuncio_id, autor_id, ultima_accion_id)
    values (p_anuncio_id, auth.uid(), p_accion_id)
    on conflict (anuncio_id) do update set ultima_accion_id = greatest(admin.ediciones_anuncio_vistas.ultima_accion_id, excluded.ultima_accion_id);
  return true;
end;
$$;
revoke all on function public.marcar_edicion_anuncio_vista(uuid, bigint) from public, anon;
grant execute on function public.marcar_edicion_anuncio_vista(uuid, bigint) to authenticated;

-- Descuento comercial de GradeHub, editado desde Admin (2026-10-24).
-- Reaplicar este archivo no cambia descuentos existentes. La función del
-- SQL Editor, admin.descuento_anuncio, conserva su contrato y sus permisos.
create or replace function public.admin_descuento_anuncio(p_anuncio_id uuid, p_pct integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes integer;
begin
  perform admin.exigir_administrador();
  if p_pct is not null and p_pct not between 1 and 50 then
    raise exception 'el descuento va de 1 a 50 (o null para quitarlo)';
  end if;
  -- El bloqueo conserva el valor anterior real aun con dos admins editando.
  select descuento_gradehub_pct into antes
    from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or antes is not distinct from p_pct then return false; end if;
  -- Sin descuento no hay código: quitarlo quita los dos.
  update public.tutor_anuncios set descuento_gradehub_pct = p_pct,
         codigo_descuento = case when p_pct is null then null else codigo_descuento end
   where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'descuento_anuncio', p_anuncio_id, jsonb_build_object('pct', p_pct, 'antes', antes));
  return true;
end;
$$;
revoke all on function public.admin_descuento_anuncio(uuid, integer) from public, anon;
grant execute on function public.admin_descuento_anuncio(uuid, integer) to authenticated;

-- Descuento y código juntos, en una sola transición (2026-10-25). El código
-- se guarda en mayúsculas; vacío = sin código. Un código sin descuento no
-- tiene sentido y se rechaza.
-- Código de descuento (Lucas, 2026-10-25): «−10% con el código XXX». Solo
-- con descuento; lo fija un admin, el cliente lo lee y nunca lo escribe.
alter table public.tutor_anuncios add column if not exists codigo_descuento text
  check (codigo_descuento is null or codigo_descuento ~ '^[A-Z0-9][A-Z0-9_-]{2,19}$');
grant select (codigo_descuento) on public.tutor_anuncios to anon, authenticated;
create or replace function public.admin_descuento_codigo_anuncio(p_anuncio_id uuid, p_pct integer, p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes_pct integer;
  antes_codigo text;
  codigo text := nullif(upper(btrim(coalesce(p_codigo, ''))), '');
begin
  perform admin.exigir_administrador();
  if p_pct is not null and p_pct not between 1 and 50 then
    raise exception 'el descuento va de 1 a 50 (o null para quitarlo)';
  end if;
  if codigo is not null and p_pct is null then
    raise exception 'un código necesita un descuento';
  end if;
  if codigo is not null and codigo !~ '^[A-Z0-9][A-Z0-9_-]{2,19}$' then
    raise exception 'el código va de 3 a 20 letras o números, sin espacios';
  end if;
  select descuento_gradehub_pct, codigo_descuento into antes_pct, antes_codigo
    from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or (antes_pct is not distinct from p_pct and antes_codigo is not distinct from codigo) then
    return false;
  end if;
  update public.tutor_anuncios set descuento_gradehub_pct = p_pct, codigo_descuento = codigo where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'descuento_anuncio', p_anuncio_id,
          jsonb_build_object('pct', p_pct, 'codigo', codigo, 'antes', antes_pct, 'codigo_antes', antes_codigo));
  return true;
end;
$$;
revoke all on function public.admin_descuento_codigo_anuncio(uuid, integer, text) from public, anon;
grant execute on function public.admin_descuento_codigo_anuncio(uuid, integer, text) to authenticated;

-- Las decisiones del panel reutilizan las mismas transiciones del SQL Editor.
-- Solo una cuenta de la lista con aal2 puede invocarlas; una falla no registra
-- acción ni deja el anuncio a medio cambiar.
create or replace function public.admin_publicar_anuncio(p_anuncio_id uuid)
returns boolean language plpgsql security definer set search_path = public, admin as $$
begin
  perform admin.exigir_administrador();
  if not exists (select 1 from public.anuncio_campanas
                 where anuncio_id = p_anuncio_id and dias is not null and tope_clp is not null) then
    raise exception 'el anuncio necesita días y tope de campaña antes de publicarlo desde el panel';
  end if;
  -- Cero cargo fijo por publicación; días, alcance e interacciones se cobran
  -- por la campaña existente y su tope, sin cambiar la medición.
  perform admin.publicar_anuncio(p_anuncio_id, 0);
  insert into admin.acciones (admin_id, accion, objetivo)
  values (auth.uid(), 'publicar_anuncio', p_anuncio_id);
  return true;
end;
$$;

create or replace function public.admin_devolver_anuncio(p_anuncio_id uuid, p_comentario text)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare
  comentario text := btrim(coalesce(p_comentario, ''));
begin
  perform admin.exigir_administrador();
  if char_length(comentario) not between 10 and 1000 then
    raise exception 'escribe un comentario de 10 a 1000 caracteres';
  end if;
  perform admin.devolver_anuncio(p_anuncio_id);
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'devolver_anuncio', p_anuncio_id, jsonb_build_object('comentario', comentario));
  return true;
end;
$$;

create or replace function public.admin_borrar_anuncio_revision(p_anuncio_id uuid)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare
  actual text;
begin
  perform admin.exigir_administrador();
  select estado into actual from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or actual <> 'en_revision' then
    raise exception 'el anuncio ya no está en revisión; actualiza el panel';
  end if;
  -- Baja lógica: las FK con ON DELETE CASCADE borrarían cobros y medición.
  update public.tutor_anuncios set estado = 'eliminado' where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo)
  values (auth.uid(), 'borrar_anuncio_revision', p_anuncio_id);
  return true;
end;
$$;

-- El comentario de una devolución solo se entrega al autor de ese borrador.
-- Los anuncios públicos y otros profesores nunca pueden consultarlo.
create or replace function public.comentarios_devolucion_profesor()
returns table (anuncio_id uuid, comentario text)
language plpgsql stable security definer set search_path = public, admin as $$
begin
  if auth.uid() is null then raise exception 'inicia sesión' using errcode = '42501'; end if;
  return query
    select a.id, x.detalle->>'comentario'
    from public.tutor_anuncios a
    cross join lateral (
      select h.detalle from admin.acciones h
      where h.objetivo = a.id and h.accion = 'devolver_anuncio'
      order by h.created_at desc, h.id desc limit 1
    ) x
    where a.autor_id = auth.uid() and a.estado = 'borrador';
end;
$$;

-- Una campaña pausada ya dejó de mostrarse y de sumar días. Cerrarla conserva
-- su publicación y su costo, y la deja en el estado terminado para cobrarla.
create or replace function public.admin_terminar_anuncio_pausado(p_anuncio_id uuid, p_publicado_at timestamptz)
returns boolean language plpgsql security definer set search_path = public, admin as $$
declare
  a public.tutor_anuncios%rowtype;
begin
  perform admin.exigir_administrador();
  select * into a from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or a.estado <> 'pausado' or a.publicado_at is distinct from p_publicado_at
     or a.publicado_at is null then
    raise exception 'la campaña pausada cambió; actualiza el panel';
  end if;
  -- La pausa se marca en el anuncio (#657). Un anuncio publicado antes de que
  -- la campaña fuera obligatoria no tiene fila en anuncio_campanas, y igual se
  -- tiene que poder cerrar. Lo que no se cierra es uno sin ninguna marca: se
  -- cobraría hasta hoy. Ese se corrige a mano antes.
  update public.anuncio_campanas set detenido_at = coalesce(detenido_at, a.detenido_at, now())
    where anuncio_id = p_anuncio_id;
  if not found and a.detenido_at is null then
    raise exception 'el anuncio no tiene marcado cuándo se pausó; revísalo antes de terminarlo';
  end if;
  update public.tutor_anuncios set estado = 'expirado' where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'terminar_anuncio_pausado', p_anuncio_id,
    jsonb_build_object('publicado_at', p_publicado_at));
  return true;
end;
$$;

revoke all on function public.admin_marcar_cobro_publicacion(uuid, timestamptz, text, integer) from public, anon;
grant execute on function public.admin_marcar_cobro_publicacion(uuid, timestamptz, text, integer) to authenticated;

revoke all on function public.admin_publicar_anuncio(uuid) from public, anon;
revoke all on function public.admin_devolver_anuncio(uuid, text) from public, anon;
revoke all on function public.admin_borrar_anuncio_revision(uuid) from public, anon;
revoke all on function public.comentarios_devolucion_profesor() from public, anon;
revoke all on function public.admin_terminar_anuncio_pausado(uuid, timestamptz) from public, anon;
grant execute on function public.admin_publicar_anuncio(uuid) to authenticated;
grant execute on function public.admin_devolver_anuncio(uuid, text) to authenticated;
grant execute on function public.admin_borrar_anuncio_revision(uuid) to authenticated;
grant execute on function public.comentarios_devolucion_profesor() to authenticated;
grant execute on function public.admin_terminar_anuncio_pausado(uuid, timestamptz) to authenticated;

revoke all on function admin.exigir_administrador() from public, anon, authenticated;
revoke all on function admin.profesor_tiene_historial(uuid) from public, anon, authenticated;
revoke all on function admin.alumnos_conectados(uuid) from public, anon, authenticated;
revoke all on function public.admin_revisar_postulacion(uuid, text) from public, anon;
revoke all on function public.admin_eliminar_profesor(uuid) from public, anon;
grant execute on function public.admin_revisar_postulacion(uuid, text) to authenticated;
grant execute on function public.admin_eliminar_profesor(uuid) to authenticated;
revoke all on function public.admin_nota_profesor(uuid, text) from public, anon;
revoke all on function public.admin_panel_alumnos_profesor(uuid, boolean) from public, anon;
grant execute on function public.admin_nota_profesor(uuid, text) to authenticated;
grant execute on function public.admin_panel_alumnos_profesor(uuid, boolean) to authenticated;
revoke all on function public.admin_panel_clases() from public, anon;
revoke all on function public.admin_pausar_anuncio(uuid) from public, anon;
revoke all on function public.admin_estado_profesor(uuid, text) from public, anon;
revoke all on function public.admin_marcar_cobro(uuid, text, integer) from public, anon;
grant execute on function public.admin_panel_clases() to authenticated;
grant execute on function public.admin_pausar_anuncio(uuid) to authenticated;
grant execute on function public.admin_estado_profesor(uuid, text) to authenticated;
grant execute on function public.admin_marcar_cobro(uuid, text, integer) to authenticated;

commit;
