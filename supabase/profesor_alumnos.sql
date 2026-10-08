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

alter table public.profesor_alumnos enable row level security;
revoke all on public.profesor_alumnos from public, anon, authenticated;

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
  if not public.tutor_aprobado(uid) then
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
  where t.codigo_alumnos = upper(btrim(p_codigo)) and t.estado = 'aprobado';
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
  select user_id into v_tutor from public.tutor_perfiles
    where codigo_alumnos = upper(btrim(p_codigo)) and estado = 'aprobado';
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
create or replace function public.mis_alumnos()
returns table (id uuid, nombre_visible text, tenant text, ramos jsonb, desde timestamptz)
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
  if not public.tutor_aprobado(uid) then
    raise exception 'solo un profesor aprobado ve a sus alumnos';
  end if;
  return query
  select pa.id, pa.nombre_visible, ur.data->>'tenant',
         coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
                   where r->>'id' = any (pa.ramos)), '[]'::jsonb),
         pa.created_at
  from public.profesor_alumnos pa
  left join public.user_ramos ur on ur.user_id = pa.alumno_id
  where pa.tutor_id = uid
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
create or replace function public.comparacion_ramo_profesor(p_tenant text, p_sigla text)
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
  v_ramo jsonb;
  v_evaluaciones jsonb;
  v_categorias jsonb;
begin
  if uid is null or v_tenant is null or v_sigla is null then
    return null;
  end if;
  if not public.tutor_aprobado(uid) or not exists (
    select 1
    from public.profesor_alumnos pa
    join public.user_ramos ur on ur.user_id = pa.alumno_id,
         jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r
    where pa.tutor_id = uid and r->>'id' = any (pa.ramos)
      and ur.data->>'tenant' = v_tenant and upper(r->>'sigla') = v_sigla
  ) then
    return null;
  end if;

  select case when count(*) >= 5
              then jsonb_build_object('promedio', round(avg(promedio), 1), 'personas', count(*)) end
    into v_ramo
    from public.curso_notas
    where tenant = v_tenant and ramo_sigla = v_sigla and updated_at > now() - interval '30 days';

  with notas as (
    select ur.user_id,
           coalesce(nullif(btrim(n->>'nombre'), ''), c->>'nombre') as nombre,
           (n->>'valor')::numeric as valor
    from public.user_ramos ur,
         jsonb_array_elements(coalesce(ur.data->'ramos', '[]'::jsonb)) r,
         jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) c,
         jsonb_array_elements(coalesce(c->'notas', '[]'::jsonb)) n
    where ur.data->>'tenant' = v_tenant and upper(r->>'sigla') = v_sigla
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
    where ur.data->>'tenant' = v_tenant and upper(r->>'sigla') = v_sigla
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
revoke all on function public.compartir_con_profesor(text, text, text[]) from public, anon;
revoke all on function public.dejar_de_compartir(uuid) from public, anon;
revoke all on function public.mis_profesores() from public, anon;
revoke all on function public.mis_alumnos() from public, anon;
revoke all on function public.quitar_alumno(uuid) from public, anon;
revoke all on function public.comparacion_ramo_profesor(text, text) from public, anon;
grant execute on function public.clave_evaluacion(text) to authenticated;
grant execute on function public.codigo_alumnos_profesor(boolean) to authenticated;
grant execute on function public.profesor_por_codigo(text) to authenticated;
grant execute on function public.compartir_con_profesor(text, text, text[]) to authenticated;
grant execute on function public.dejar_de_compartir(uuid) to authenticated;
grant execute on function public.mis_profesores() to authenticated;
grant execute on function public.mis_alumnos() to authenticated;
grant execute on function public.quitar_alumno(uuid) to authenticated;
grant execute on function public.comparacion_ramo_profesor(text, text) to authenticated;
