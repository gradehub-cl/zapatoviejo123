-- Panel de alumnos para profesores particulares.
--
-- APLÍCALO a mano en el SQL Editor de Supabase, DESPUÉS de
-- clases_particulares.sql (tutor_perfiles, tutor_aprobado) y curso_posicion.sql
-- (curso_notas), y ANTES de mergear el PR que llama a estas funciones.
--
-- DECISIÓN DE LUCAS (2026-10-08), tras la reunión con Salva Ramos. Cambia la
-- regla de docs/marketplace-clases.md "un profesor nunca ve notas": ahora un
-- profesor ve las notas de un alumno SOLO si ese alumno lo acepta, ramo por
-- ramo, y puede dejar de compartir cuando quiera.
--   1. Cada profesor aprobado tiene un código fijo (va en su link) que puede
--      renovar si se filtra; el código viejo deja de servir al tiro.
--   2. El alumno abre el link, elige qué ramos comparte y con qué nombre
--      aparece. Nada se comparte sin ese paso.
--   3. El profesor ve, de esos ramos, cada nota tal como el alumno la guardó.
--      El promedio lo calcula SU navegador con ramoAvg, igual que en la app
--      del alumno: el servidor no recalcula notas (ver curso_posicion.sql).
--   4. Además ve el promedio de todo GradeHub en ese ramo y en cada prueba,
--      solo desde 5 personas.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md):
--   - La tabla no se lee ni se escribe desde el cliente: solo por las
--     funciones de abajo, que miran auth.uid().
--   - Ninguna función entrega el user_id ni el correo de la otra persona. El
--     alumno y el profesor se refieren a un compartido por su `id` propio.
--   - Si se borra la cuenta del alumno o la del profesor, el compartido se va
--     con ella (on delete cascade).
--   - Un profesor que deja de estar aprobado (suspendido, rechazado) no ve a
--     nadie; los compartidos quedan, y vuelven a verse si lo reactivan.
--
-- SIN PGCRYPTO: el código sale de gen_random_uuid(), que es de Postgres
-- (ver tests/sql-sin-pgcrypto.test.js).

-- ─── CÓDIGO DEL PROFESOR ────────────────────────────────────────────────────
-- Sin I, O, 0 ni 1: se dicta y se copia de una imagen sin confundirse.
-- No se le da permiso de lectura a `authenticated`: nadie puede listar códigos.
alter table public.tutor_perfiles add column if not exists codigo_alumnos text unique
  check (codigo_alumnos is null or codigo_alumnos ~ '^[A-HJ-NP-Z2-9]{8}$');

-- ─── COMPARTIDOS ────────────────────────────────────────────────────────────
create table if not exists public.profesor_alumnos (
  id             uuid not null default gen_random_uuid() unique,
  tutor_id       uuid not null references auth.users(id) on delete cascade,
  alumno_id      uuid not null references auth.users(id) on delete cascade,
  nombre_visible text not null check (char_length(btrim(nombre_visible)) between 1 and 60),
  -- ids de ramos del alumno (los de user_ramos.data->'ramos'), no siglas: así
  -- comparte SU ramo, con su sección y su pauta, y no "todo lo que se llame así".
  ramos          text[] not null check (cardinality(ramos) between 1 and 30),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (tutor_id, alumno_id),
  check (tutor_id <> alumno_id)
);
create index if not exists profesor_alumnos_alumno_idx on public.profesor_alumnos (alumno_id);

-- Cuándo empezó el alumno con el profesor (#697). Las estadísticas comparan
-- cómo le iba antes y cómo le va desde ahí. Vacía = cuándo compartió, que
-- suele ser después de empezar; el profesor la corrige con fijar_inicio_alumno.
alter table public.profesor_alumnos
  add column if not exists inicio_clases date
  check (inicio_clases between date '2000-01-01' and date '2100-12-31');

-- Cuándo empezó en CADA ramo (2026-10-20, pedido de Salva Ramos): la mitad de
-- sus alumnos toma más de una clase, y quien empezó Cálculo en marzo y Física
-- en septiembre quedaba medido con un solo corte. Llave: el id del ramo
-- compartido; valor: 'AAAA-MM-DD'. Un ramo sin fecha propia usa inicio_clases
-- y, si tampoco hay, cuándo compartió: las filas que ya existen se leen igual.
alter table public.profesor_alumnos
  add column if not exists inicio_ramos jsonb not null default '{}'::jsonb
  check (jsonb_typeof(inicio_ramos) = 'object');

alter table public.profesor_alumnos enable row level security;
revoke all on public.profesor_alumnos from public, anon, authenticated;

-- Un admin puede ocultarle el panel de alumnos a un profesor (Lucas,
-- 2026-10-23). Parte en true: hoy no cambia nada a nadie. El profesor la lee
-- pero no la edita: la cambia admin_panel_alumnos_profesor.
alter table public.tutor_perfiles add column if not exists panel_alumnos boolean not null default true;
grant select (panel_alumnos) on public.tutor_perfiles to authenticated;
-- Profesor aprobado y con el panel visible. Con el panel oculto no se ve a los
-- alumnos ni se conecta nadie nuevo, pero los vínculos no se borran: al
-- volver a mostrarlo están los mismos.
create or replace function public.panel_alumnos_activo(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tutor_perfiles
                  where user_id = p_user_id and estado = 'aprobado' and panel_alumnos);
$$;
revoke all on function public.panel_alumnos_activo(uuid) from public, anon;
grant execute on function public.panel_alumnos_activo(uuid) to authenticated;

-- Normaliza el nombre de una evaluación para juntar la misma prueba escrita
-- distinto ("Interrogación 1", "interrogacion  1"). El cliente usa la misma
-- regla para emparejar cada nota con su promedio.
create or replace function public.clave_evaluacion(p_nombre text)
returns text
language sql
immutable
as $$
  select nullif(btrim(regexp_replace(
    translate(lower(coalesce(p_nombre, '')), 'áàäâéèëêíìïîóòöôúùüûñ', 'aaaaeeeeiiiioooouuuun'),
    '\s+', ' ', 'g')), '')
$$;

-- ─── PROFESOR: su código ────────────────────────────────────────────────────
create or replace function public.codigo_alumnos_profesor(p_renovar boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  actual text;
  nuevo text;
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
begin
  if uid is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  if not public.panel_alumnos_activo(uid) then
    raise exception 'solo un profesor aprobado tiene link para sus alumnos';
  end if;
  select codigo_alumnos into actual from public.tutor_perfiles where user_id = uid;
  if actual is not null and not coalesce(p_renovar, false) then
    return actual;
  end if;
  loop
    bytes := uuid_send(gen_random_uuid());
    nuevo := '';
    for i in 0..7 loop
      nuevo := nuevo || substr(alfabeto, 1 + (get_byte(bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.tutor_perfiles where codigo_alumnos = nuevo);
  end loop;
  update public.tutor_perfiles set codigo_alumnos = nuevo where user_id = uid;
  return nuevo;
end;
$$;

-- ─── ALUMNO: ver a quién corresponde un link ────────────────────────────────
-- Solo lo público del profesor: el nombre y el logo que ya salen en sus avisos.
create or replace function public.profesor_por_codigo(p_codigo text)
returns table (nombre_publico text, logo_path text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  return query
  select t.nombre_publico, t.logo_aprobado_path
  from public.tutor_perfiles t
  where t.codigo_alumnos = upper(btrim(p_codigo)) and t.estado = 'aprobado' and t.panel_alumnos;
end;
$$;

-- La persona que ya comparte con este código puede recuperar SU selección.
-- No entrega el id de ninguna cuenta ni permite leer compartidos ajenos.
create or replace function public.mi_compartido_profesor(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  return (
    select jsonb_build_object('nombre_visible', pa.nombre_visible, 'ramos', pa.ramos)
    from public.profesor_alumnos pa
    join public.tutor_perfiles t on t.user_id = pa.tutor_id
    where pa.alumno_id = auth.uid()
      and t.codigo_alumnos = upper(btrim(p_codigo))
      and t.estado = 'aprobado' and t.panel_alumnos
  );
end;
$$;

-- ─── ALUMNO: compartir, cambiar o dejar de compartir ───────────────────────
create or replace function public.compartir_con_profesor(p_codigo text, p_nombre text, p_ramos text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_tutor uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_ramos text[];
  v_id uuid;
begin
  if uid is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  if exists (select 1 from public.user_ramos ur
             where ur.user_id = uid and ur.data->>'tipoCuenta' = 'profesor') then
    raise exception 'una cuenta de profesor no comparte notas como estudiante';
  end if;
  select user_id into v_tutor from public.tutor_perfiles
    where codigo_alumnos = upper(btrim(p_codigo)) and estado = 'aprobado' and panel_alumnos;
  if v_tutor is null then
    raise exception 'el link no corresponde a ningún profesor';
  end if;
  if v_tutor = uid then
    raise exception 'no puedes compartir contigo mismo';
  end if;
  if char_length(v_nombre) not between 1 and 60 then
    raise exception 'escribe con qué nombre quieres aparecer';
  end if;
  -- Solo ramos que de verdad son de quien comparte.
  select array_agg(distinct r->>'id') into v_ramos
    from public.user_ramos ur, jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
    where ur.user_id = uid and r->>'id' = any (p_ramos);
  if v_ramos is null then
    raise exception 'elige al menos un ramo';
  end if;
  insert into public.profesor_alumnos (tutor_id, alumno_id, nombre_visible, ramos)
  values (v_tutor, uid, v_nombre, v_ramos)
  on conflict (tutor_id, alumno_id)
    do update set nombre_visible = excluded.nombre_visible, ramos = excluded.ramos, updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.dejar_de_compartir(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  delete from public.profesor_alumnos where id = p_id and alumno_id = auth.uid();
  return found;
end;
$$;

-- Con quién comparte el alumno y qué. Para su pantalla de Ajustes.
create or replace function public.mis_profesores()
returns table (id uuid, nombre_publico text, logo_path text, nombre_visible text, ramos text[], desde timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  return query
  select pa.id, t.nombre_publico, t.logo_aprobado_path, pa.nombre_visible, pa.ramos, pa.created_at
  from public.profesor_alumnos pa
  join public.tutor_perfiles t on t.user_id = pa.tutor_id
  where pa.alumno_id = auth.uid()
  order by pa.created_at;
end;
$$;

-- ─── PROFESOR: sus alumnos ──────────────────────────────────────────────────
-- Devuelve, de cada alumno, SOLO los ramos que compartió, tal como los guardó.
-- Un ramo que el alumno borró desaparece solo.
-- Devolver `inicio` (y después `inicio_ramos`) cambia el tipo de retorno:
-- Postgres no lo deja con create or replace, así que se borra y se vuelve a
-- crear (los permisos se vuelven a dar al final del archivo). Una app vieja
-- en caché lee las columnas por nombre e ignora la nueva.
-- `inicio_ramos` trae solo las fechas de ramos que sigue compartiendo.
drop function if exists public.mis_alumnos();
create function public.mis_alumnos()
returns table (id uuid, nombre_visible text, tenant text, ramos jsonb, desde timestamptz, inicio date, inicio_ramos jsonb)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  if not public.panel_alumnos_activo(uid) then
    raise exception 'solo un profesor aprobado ve a sus alumnos';
  end if;
  return query
  select pa.id, pa.nombre_visible, ur.data->>'tenant',
         coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
                   where r->>'id' = any (pa.ramos)), '[]'::jsonb),
         pa.created_at, pa.inicio_clases,
         coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(pa.inicio_ramos) e
                   where e.key = any (pa.ramos)), '{}'::jsonb)
  from public.profesor_alumnos pa
  left join public.user_ramos ur on ur.user_id = pa.alumno_id
  where pa.tutor_id = uid
    and ur.data->>'tipoCuenta' is distinct from 'profesor'
  order by lower(pa.nombre_visible);
end;
$$;

create or replace function public.quitar_alumno(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  delete from public.profesor_alumnos where id = p_id and tutor_id = auth.uid();
  return found;
end;
$$;

-- El profesor corrige cuándo empezó cada alumno con él. null vuelve a usar
-- cuándo compartió. No puede ser futura: no se compara contra lo que no pasó.
create or replace function public.fijar_inicio_alumno(p_id uuid, p_inicio date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  if not public.panel_alumnos_activo(auth.uid()) then
    raise exception 'solo un profesor aprobado ve a sus alumnos';
  end if;
  if p_inicio is not null and (p_inicio < date '2000-01-01' or p_inicio > current_date) then
    raise exception 'la fecha de inicio no puede ser futura';
  end if;
  update public.profesor_alumnos set inicio_clases = p_inicio, updated_at = now()
   where id = p_id and tutor_id = auth.uid();
  return found;
end;
$$;

-- Lo mismo, para un solo ramo. null le quita su fecha propia: vuelve a usar
-- inicio_clases o cuándo compartió. Solo un ramo que el alumno le comparte.
create or replace function public.fijar_inicio_ramo_alumno(p_id uuid, p_ramo text, p_inicio date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'hay que haber iniciado sesión';
  end if;
  if not public.panel_alumnos_activo(auth.uid()) then
    raise exception 'solo un profesor aprobado ve a sus alumnos';
  end if;
  if p_inicio is not null and (p_inicio < date '2000-01-01' or p_inicio > current_date) then
    raise exception 'la fecha de inicio no puede ser futura';
  end if;
  update public.profesor_alumnos
     set inicio_ramos = case when p_inicio is null then inicio_ramos - p_ramo
                             else inicio_ramos || jsonb_build_object(p_ramo, p_inicio::text) end,
         updated_at = now()
   where id = p_id and tutor_id = auth.uid() and p_ramo = any (ramos);
  return found;
end;
$$;

-- ─── PROFESOR: comparación con GradeHub ─────────────────────────────────────
-- El promedio de todos los que llevan ese ramo y el de cada prueba, desde 5
-- personas. Solo para un profesor que tiene al menos un alumno compartiéndole
-- ese ramo: así no sirve para mirar cualquier curso.
--
-- El promedio del ramo sale de curso_notas (lo que cada estudiante ve en su
-- app, al día en los últimos 30 días). El de cada prueba sale de las notas
-- guardadas: una nota no lleva fórmula, así que no se duplica ramoAvg.
--
-- POR CATEGORÍA (2026-10-08, pedido de Lucas): cada estudiante puede renombrar
-- sus notas ("1", "(Falté)"), así que nota por nota casi nunca calzan. Las
-- categorías vienen de la pauta del catálogo y se llaman igual para todos. El
-- promedio de una categoría acá es el ponderado de sus notas por su peso, SIN
-- descartes ni reglas: es una referencia de cómo le va al resto, no la nota de
-- nadie. La del alumno la calcula el navegador con el motor de siempre.
-- UC/FEN se identifican por sigla. UAI/UAndes/UDD, si no la tienen, usan el
-- nombre normalizado guardado en origen.ramoKey, como el consenso de pautas.
-- La función solo construye la clave: no calcula promedios ni expone filas.
create or replace function public.clave_curso_comparacion(p_tenant text, p_ramo jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(upper(btrim(p_ramo->>'sigla')), ''),
    case when lower(p_tenant) in ('uai', 'uandes', 'udd') then
      nullif(upper(btrim(regexp_replace(
        normalize(lower(coalesce(nullif(p_ramo#>>'{origen,ramoKey}', ''), p_ramo->>'nombre', '')), NFD),
        '[\u0300-\u036f]', '', 'g'))), '')
    end);
$$;
revoke all on function public.clave_curso_comparacion(text, jsonb) from public, anon, authenticated;

-- POR SECCIÓN (2026-10-20, pedido de Salva Ramos): comparar a cada alumno con
-- los de su misma sección, no solo con todo GradeHub. La sección es la que el
-- estudiante escribe en Editar ramo (entero 1–999 en el ramo guardado). Sin
-- p_seccion, la comparación de siempre. Mismo piso de cinco personas.
create or replace function public.seccion_calza(p_ramo jsonb, p_seccion integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_seccion is null or p_ramo->'seccion' = to_jsonb(p_seccion);
$$;
revoke all on function public.seccion_calza(jsonb, integer) from public, anon, authenticated;

-- La firma de 2 argumentos se reemplaza por una de 3 (p_seccion opcional). Sin
-- el drop quedarían las dos y una llamada con p_tenant y p_sigla sería ambigua;
-- con p_seccion por omisión, la app vieja en caché sigue llamando igual.
drop function if exists public.comparacion_ramo_profesor(text, text);
create or replace function public.comparacion_ramo_profesor(p_tenant text, p_sigla text, p_seccion integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_tenant text := nullif(lower(btrim(p_tenant)), '');
  v_sigla text := nullif(upper(btrim(p_sigla)), '');
  v_seccion integer := p_seccion;
  v_ramo jsonb;
  v_evaluaciones jsonb;
  v_categorias jsonb;
begin
  if uid is null or v_tenant is null or v_sigla is null
     or (v_seccion is not null and v_seccion not between 1 and 999) then
    return null;
  end if;
  -- Por sección, solo una que declara un alumno que le comparte ese ramo.
  if not public.panel_alumnos_activo(uid) or not exists (
    select 1
    from public.profesor_alumnos pa
    join public.user_ramos ur on ur.user_id = pa.alumno_id,
         jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
    where pa.tutor_id = uid and r->>'id' = any (pa.ramos)
      and ur.data->>'tipoCuenta' is distinct from 'profesor'
      and ur.data->>'tenant' = v_tenant and public.clave_curso_comparacion(v_tenant, r) = v_sigla
      and public.seccion_calza(r, v_seccion)
  ) then
    return null;
  end if;

  select case when count(*) >= 5
              then jsonb_build_object('promedio', round(avg(promedio), 1), 'personas', count(*)) end
    into v_ramo
    from public.curso_notas cn
    where cn.tenant = v_tenant and cn.ramo_sigla = v_sigla and cn.updated_at > now() - interval '30 days'
      and not exists (select 1 from public.user_ramos ur
                      where ur.user_id = cn.user_id and ur.data->>'tipoCuenta' = 'profesor')
      -- curso_notas no guarda la sección: se mira en el ramo que esa persona guardó.
      and (v_seccion is null or exists (
            select 1 from public.user_ramos ur,
                   jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
            where ur.user_id = cn.user_id and ur.data->>'tenant' = v_tenant
              and public.clave_curso_comparacion(v_tenant, r) = v_sigla
              and public.seccion_calza(r, v_seccion)));

  with notas as (
    select ur.user_id,
           coalesce(nullif(btrim(n->>'nombre'), ''), c->>'nombre') as nombre,
           (n->>'valor')::numeric as valor
    from public.user_ramos ur,
         jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r,
         jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) c,
         jsonb_array_elements(coalesce(c->'notas', '[]'::jsonb)) n
    where ur.data->>'tenant' = v_tenant and public.clave_curso_comparacion(v_tenant, r) = v_sigla
      and public.seccion_calza(r, v_seccion)
      and ur.data->>'tipoCuenta' is distinct from 'profesor'
      and jsonb_typeof(n->'valor') = 'number'
      and (n->>'valor')::numeric between 1 and 7
  ),
  -- Una sola nota por persona y prueba: quien la anotó dos veces no pesa doble.
  por_persona as (
    select public.clave_evaluacion(nombre) as clave, min(nombre) as nombre, user_id, avg(valor) as valor
    from notas
    where public.clave_evaluacion(nombre) is not null
    group by 1, user_id
  ),
  agregado as (
    select clave, mode() within group (order by nombre) as nombre,
           round(avg(valor), 1) as promedio, count(*) as personas
    from por_persona
    group by clave
    having count(*) >= 5
  )
  select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'nombre', nombre,
                                               'promedio', promedio, 'personas', personas)
                            order by clave), '[]'::jsonb)
    into v_evaluaciones
    from agregado;

  with notas as (
    select ur.user_id, c->>'nombre' as nombre,
           (n->>'valor')::numeric as valor,
           case when jsonb_typeof(n->'peso') = 'number' and (n->>'peso')::numeric > 0
                then (n->>'peso')::numeric else 1 end as peso
    from public.user_ramos ur,
         jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r,
         jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) c,
         jsonb_array_elements(coalesce(c->'notas', '[]'::jsonb)) n
    where ur.data->>'tenant' = v_tenant and public.clave_curso_comparacion(v_tenant, r) = v_sigla
      and public.seccion_calza(r, v_seccion)
      and ur.data->>'tipoCuenta' is distinct from 'profesor'
      and jsonb_typeof(n->'valor') = 'number'
      and (n->>'valor')::numeric between 1 and 7
  ),
  por_persona as (
    select public.clave_evaluacion(nombre) as clave, min(nombre) as nombre, user_id,
           sum(valor * peso) / sum(peso) as valor
    from notas
    where public.clave_evaluacion(nombre) is not null
    group by 1, user_id
  ),
  agregado as (
    select clave, mode() within group (order by nombre) as nombre,
           round(avg(valor), 1) as promedio, count(*) as personas
    from por_persona
    group by clave
    having count(*) >= 5
  )
  select coalesce(jsonb_agg(jsonb_build_object('clave', clave, 'nombre', nombre,
                                               'promedio', promedio, 'personas', personas)
                            order by clave), '[]'::jsonb)
    into v_categorias
    from agregado;

  return jsonb_build_object('ramo', v_ramo, 'evaluaciones', v_evaluaciones, 'categorias', v_categorias);
end;
$$;

revoke all on function public.clave_evaluacion(text) from public;
revoke all on function public.codigo_alumnos_profesor(boolean) from public, anon;
revoke all on function public.profesor_por_codigo(text) from public, anon;
revoke all on function public.mi_compartido_profesor(text) from public, anon;
revoke all on function public.compartir_con_profesor(text, text, text[]) from public, anon;
revoke all on function public.dejar_de_compartir(uuid) from public, anon;
revoke all on function public.mis_profesores() from public, anon;
revoke all on function public.mis_alumnos() from public, anon;
revoke all on function public.quitar_alumno(uuid) from public, anon;
revoke all on function public.fijar_inicio_alumno(uuid, date) from public, anon;
revoke all on function public.fijar_inicio_ramo_alumno(uuid, text, date) from public, anon;
revoke all on function public.comparacion_ramo_profesor(text, text, integer) from public, anon;
grant execute on function public.clave_evaluacion(text) to authenticated;
grant execute on function public.codigo_alumnos_profesor(boolean) to authenticated;
grant execute on function public.profesor_por_codigo(text) to authenticated;
grant execute on function public.mi_compartido_profesor(text) to authenticated;
grant execute on function public.compartir_con_profesor(text, text, text[]) to authenticated;
grant execute on function public.dejar_de_compartir(uuid) to authenticated;
grant execute on function public.mis_profesores() to authenticated;
grant execute on function public.mis_alumnos() to authenticated;
grant execute on function public.quitar_alumno(uuid) to authenticated;
grant execute on function public.fijar_inicio_alumno(uuid, date) to authenticated;
grant execute on function public.fijar_inicio_ramo_alumno(uuid, text, date) to authenticated;
grant execute on function public.comparacion_ramo_profesor(text, text, integer) to authenticated;

-- Preparación declarada: ausencia de fila = por fecha; [] = manual vacío.
create unique index if not exists profesor_alumnos_propietarios_idx on public.profesor_alumnos(id,tutor_id,alumno_id);
create table if not exists public.profesor_alumnos_preparacion(
 conexion_id uuid not null,
 tutor_id uuid not null references auth.users(id) on delete cascade,
 alumno_id uuid not null references auth.users(id) on delete cascade,
 ramo_id text not null,
 marcas jsonb not null default '[]'::jsonb check(jsonb_typeof(marcas)='array' and jsonb_array_length(marcas)<=200),
 updated_at timestamptz not null default now(),
 primary key(conexion_id,ramo_id),
 foreign key(conexion_id,tutor_id,alumno_id) references public.profesor_alumnos(id,tutor_id,alumno_id) on delete cascade
);
alter table public.profesor_alumnos_preparacion enable row level security;
revoke all on public.profesor_alumnos_preparacion from public,anon,authenticated;

-- Inventario del JSON CRUDO: nunca normaliza ni crea notas en user_ramos.
create or replace function public.preparacion_evaluaciones(p_ramo jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare c jsonb;n jsonb;ns jsonb;salida jsonb='[]';cantidad int;inicio int;i int;num int;ident text;nombre text;forma jsonb;
begin
 for c in select value from jsonb_array_elements(case when jsonb_typeof(p_ramo->'categorias')='array' then p_ramo->'categorias' else '[]'::jsonb end) loop
  if jsonb_typeof(c)<>'object' or nullif(c->>'id','') is null then continue;end if;
  ns=case when jsonb_typeof(c->'notas')='array' then c->'notas' else '[]'::jsonb end;
  cantidad=case when c->>'slots' ~ '^\d{1,3}$' and (c->>'slots')::int between 1 and 200 then (c->>'slots')::int else 1 end;
  inicio=case when c->>'slotStart' ~ '^\d{1,3}$' then (c->>'slotStart')::int else 1 end;
  forma=jsonb_build_object('cantidad',cantidad,'inicio',inicio);
  if c->'directNota'='true'::jsonb then
   for i in 0..cantidad-1 loop
    num=inicio+i;
    select case when count(*)=1 then jsonb_agg(value)->0 else null end into n from jsonb_array_elements(ns) where (cantidad=1 or value->'slot'=to_jsonb(i));
    ident=case when jsonb_typeof(n->'id')='string' then nullif(n->>'id','') end;
    nombre=coalesce(nullif(n->>'nombre',''),nullif(c->'nombresCasillas'->>i,''),case when cantidad=1 then c->>'nombre' else coalesce(c->>'slotLabel',c->>'nombre')||' '||num end);
    salida=salida||jsonb_build_array(jsonb_build_object('cat_id',c->>'id','numero',num,'nota_id',ident,'nombre',nombre,'categoria',c->>'nombre','forma',forma,'nota',n->'valor','fecha',coalesce(n->>'fecha',c->>'fecha'),'ambigua',(select count(*)>1 from jsonb_array_elements(ns) where cantidad=1 or value->'slot'=to_jsonb(i))));
   end loop;
  else
   for n in select value from jsonb_array_elements(ns) loop
    if jsonb_typeof(n->'id')<>'string' or nullif(n->>'id','') is null then continue;end if;
    salida=salida||jsonb_build_array(jsonb_build_object('cat_id',c->>'id','nota_id',n->>'id','nombre',coalesce(nullif(n->>'nombre',''),c->>'nombre'),'categoria',c->>'nombre','nota',n->'valor','fecha',coalesce(n->>'fecha',c->>'fecha')));
   end loop;
  end if;
 end loop;
 return salida;
end;$$;
revoke all on function public.preparacion_evaluaciones(jsonb) from public,anon,authenticated;

-- Lectura con enlace único de futuras. Es VOLATILE: puede completar una marca,
-- nunca el documento del alumno. Ambos participantes pueden leer esta conexión.
create or replace function public.preparacion_alumno(p_id uuid,p_ramo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pa public.profesor_alumnos;datos jsonb;r jsonb;ev jsonb;m jsonb;actual jsonb;v_marcas jsonb;resultado jsonb='[]';candidatas jsonb;fila public.profesor_alumnos_preparacion;manual boolean;
begin
 select * into pa from public.profesor_alumnos where id=p_id for update;
 if not found or auth.uid() is null or not(auth.uid()=pa.alumno_id or (auth.uid()=pa.tutor_id and public.panel_alumnos_activo(auth.uid()))) then raise exception 'conexión no disponible';end if;
 select data into datos from public.user_ramos where user_id=pa.alumno_id;
 for r in select value from jsonb_array_elements(case when jsonb_typeof(datos->'ramos')='array' then datos->'ramos' else '[]'::jsonb end) where value->>'id'=any(pa.ramos) and (p_ramo is null or value->>'id'=p_ramo) loop
  ev=public.preparacion_evaluaciones(r);
  select * into fila from public.profesor_alumnos_preparacion where conexion_id=pa.id and ramo_id=r->>'id';manual=found;
  v_marcas='[]';
  for m in select value from jsonb_array_elements(coalesce(fila.marcas,'[]')) loop
   actual=m;
   if m->>'nota_id' is not null then
    select coalesce(jsonb_agg(value),'[]') into candidatas from jsonb_array_elements(ev) where value->>'nota_id'=m->>'nota_id';
    actual=m||jsonb_build_object('huerfana',jsonb_array_length(candidatas)<>1 or coalesce((candidatas->0->>'ambigua')::boolean,false));
   elsif m->'invalida'='true'::jsonb then actual=m||'{"huerfana":true}'::jsonb;
   else
    select coalesce(jsonb_agg(value),'[]') into candidatas from jsonb_array_elements(ev) where value->>'cat_id'=m->>'cat_id' and value->'numero'=m->'numero' and value->'forma'=m->'forma' and not coalesce((value->>'ambigua')::boolean,false);
    if jsonb_array_length(candidatas)<>1 then actual=m||'{"huerfana":true,"invalida":true}'::jsonb;
    elsif candidatas->0->>'nota_id' is not null then
     if (select count(*) from jsonb_array_elements(ev) where value->>'nota_id'=candidatas->0->>'nota_id')<>1 then actual=m||'{"huerfana":true,"invalida":true}'::jsonb;
     else actual=m||jsonb_build_object('nota_id',candidatas->0->>'nota_id','huerfana',false);end if;
    else actual=m||'{"huerfana":false}'::jsonb;end if;
   end if;
   v_marcas=v_marcas||jsonb_build_array(actual);
  end loop;
  if manual and v_marcas is distinct from fila.marcas then update public.profesor_alumnos_preparacion set marcas=v_marcas,updated_at=now() where conexion_id=pa.id and ramo_id=r->>'id';end if;
  resultado=resultado||jsonb_build_array(jsonb_build_object('ramo_id',r->>'id','manual',manual,'marcas',v_marcas,'evaluaciones',ev));
 end loop;
 return jsonb_build_object('ramos',resultado);
end;$$;

create or replace function public.guardar_preparacion_alumno(p_id uuid,p_ramo text,p_marcas jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pa public.profesor_alumnos;inventario jsonb;previo jsonb;m jsonb;e jsonb;seleccion jsonb='[]';coinciden jsonb;
begin
 select * into pa from public.profesor_alumnos where id=p_id for update;
 if not found or auth.uid() is null or auth.uid()<>pa.tutor_id or not public.panel_alumnos_activo(auth.uid()) or not(p_ramo=any(pa.ramos)) then raise exception 'conexión no disponible';end if;
 inventario=public.preparacion_alumno(p_id,p_ramo)->'ramos'->0;
 if inventario is null then raise exception 'ramo no disponible';end if;
 if p_marcas is null then delete from public.profesor_alumnos_preparacion where conexion_id=pa.id and ramo_id=p_ramo;return public.preparacion_alumno(p_id,p_ramo);end if;
 if jsonb_typeof(p_marcas)<>'array' or jsonb_array_length(p_marcas)>200 then raise exception 'selección inválida';end if;
 for m in select value from jsonb_array_elements(p_marcas) loop
  if jsonb_typeof(m)<>'object' then raise exception 'marca inválida';end if;
  -- Una huérfana ya guardada puede conservarse para corregirla, nunca inventarse.
  select value into previo from jsonb_array_elements(inventario->'marcas') where value=m limit 1;
  if previo is not null then e=previo;
  else
   select coalesce(jsonb_agg(value),'[]') into coinciden from jsonb_array_elements(inventario->'evaluaciones') where not coalesce((value->>'ambigua')::boolean,false) and (
    (nullif(m->>'nota_id','') is not null and value->>'nota_id'=m->>'nota_id') or
    (m->>'nota_id' is null and value->>'nota_id' is null and value->>'cat_id'=m->>'cat_id' and value->'numero'=m->'numero'));
   if jsonb_array_length(coinciden)<>1 then raise exception 'evaluación no disponible o ambigua';end if;
   e=coinciden->0;
   if e->>'nota_id' is null and e->'numero' is null then raise exception 'sin identidad estable';end if;
   e=jsonb_build_object('nota_id',e->>'nota_id','cat_id',e->>'cat_id','numero',e->'numero','nombre',left(e->>'nombre',160),'categoria',left(e->>'categoria',160),'forma',e->'forma','huerfana',false);
  end if;
  if exists(select 1 from jsonb_array_elements(seleccion) x where (e->>'nota_id' is not null and x->>'nota_id'=e->>'nota_id') or (e->>'nota_id' is null and x->>'cat_id'=e->>'cat_id' and x->'numero'=e->'numero')) then raise exception 'marca duplicada';end if;
  seleccion=seleccion||jsonb_build_array(e);
 end loop;
 insert into public.profesor_alumnos_preparacion(conexion_id,tutor_id,alumno_id,ramo_id,marcas) values(pa.id,pa.tutor_id,pa.alumno_id,p_ramo,seleccion) on conflict(conexion_id,ramo_id) do update set marcas=excluded.marcas,updated_at=now();
 return public.preparacion_alumno(p_id,p_ramo);
end;$$;
create or replace function public.limpiar_preparacion_compartida()
returns trigger language plpgsql security definer set search_path='' as $$begin
 delete from public.profesor_alumnos_preparacion where conexion_id=new.id and not(ramo_id=any(new.ramos));return new;
end;$$;
drop trigger if exists limpiar_preparacion_compartida on public.profesor_alumnos;
create trigger limpiar_preparacion_compartida after update of ramos on public.profesor_alumnos for each row execute function public.limpiar_preparacion_compartida();
revoke all on function public.limpiar_preparacion_compartida() from public,anon,authenticated;
revoke all on function public.preparacion_alumno(uuid,text) from public,anon;
revoke all on function public.guardar_preparacion_alumno(uuid,text,jsonb) from public,anon;
grant execute on function public.preparacion_alumno(uuid,text) to authenticated;
grant execute on function public.guardar_preparacion_alumno(uuid,text,jsonb) to authenticated;
