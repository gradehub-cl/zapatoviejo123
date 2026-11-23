-- Amigos: calendario del grupo (salas de estudio reservadas y pruebas).
--
-- APLÍCALO a mano en el SQL Editor (+ New query) DESPUÉS de amigos_grupos.sql,
-- y ANTES de mergear el PR que llama a estas funciones. Se puede correr dos
-- veces. Sin pgcrypto. Si no está aplicado, el grupo no muestra Calendario.
--
-- QUÉ ES (Lucas, 2026-11-20): en un grupo de amigos de la misma U, ver qué sala
-- de estudio tiene reservada cada uno y cuándo tiene pruebas, para juntarse a
-- estudiar. Las reservas se anotan a mano: la universidad no ofrece cómo leerlas.
--
-- PRIVACIDAD
--   - Una reserva se anota EN un grupo y la ven solo sus miembros (de la misma
--     U y sin bloqueo con quien mira). Solo quien la anotó la borra.
--   - Las pruebas son opcionales y parten apagadas («Compartir mis pruebas con
--     mis grupos»). La app publica por evaluación por venir: ramo, sigla, nombre
--     de la evaluación y fecha (y hora si la tiene). Nunca notas, ponderaciones
--     ni pautas. Las ven los miembros de los grupos donde está la persona.
--     Apagarlo borra lo publicado.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - Dos tablas con RLS, sin políticas y sin permisos: solo por funciones.
--   - amigos_grupo_reservas: grupo → amigos_grupos ON DELETE CASCADE y
--     user_id → auth.users ON DELETE CASCADE. Salir del grupo borra las propias.
--   - amigos_pruebas: user_id → auth.users ON DELETE CASCADE.
--
-- CÓDIGO DE LA SALA (Lucas, 2026-11-22): en la UC, quien reserva recibe por
-- mail un código que se ingresa en la sala. Se anota opcional con la reserva y
-- lo ve todo el grupo, por si quien reservó no llega. Viaja en `detalle` de
-- grupo_calendario (null en reservas hasta ahora), así el build 4, que no lo
-- lee, sigue igual. Nunca va en el aviso push.
begin;

create table if not exists public.amigos_grupo_reservas (
  id         uuid primary key default gen_random_uuid(),
  grupo_id   uuid not null references public.amigos_grupos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lugar      text not null check (char_length(btrim(lugar)) between 1 and 60),
  fecha      date not null,
  inicio     time not null,
  fin        time not null,
  created_at timestamptz not null default now(),
  check (fin > inicio)
);
alter table public.amigos_grupo_reservas add column if not exists codigo text;
alter table public.amigos_grupo_reservas drop constraint if exists amigos_grupo_reservas_codigo_check;
alter table public.amigos_grupo_reservas add constraint amigos_grupo_reservas_codigo_check
  check (codigo is null or codigo ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,23}$');
create index if not exists amigos_grupo_reservas_grupo_idx on public.amigos_grupo_reservas (grupo_id, fecha);
create index if not exists amigos_grupo_reservas_user_idx on public.amigos_grupo_reservas (user_id);
alter table public.amigos_grupo_reservas enable row level security;
revoke all on public.amigos_grupo_reservas from public, anon, authenticated;

create table if not exists public.amigos_pruebas (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  pruebas    jsonb not null default '[]'::jsonb check (jsonb_typeof(pruebas) = 'array' and jsonb_array_length(pruebas) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.amigos_pruebas enable row level security;
revoke all on public.amigos_pruebas from public, anon, authenticated;

-- Salir del grupo (o que te saquen) se lleva tus reservas de ese grupo.
create or replace function public.amigos_reservas_al_salir()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.amigos_grupo_reservas where grupo_id = old.grupo_id and user_id = old.user_id;
  return null;
end;
$$;
revoke all on function public.amigos_reservas_al_salir() from public, anon, authenticated;
drop trigger if exists amigos_reservas_al_salir on public.amigos_grupo_miembros;
create trigger amigos_reservas_al_salir after delete on public.amigos_grupo_miembros
  for each row execute function public.amigos_reservas_al_salir();

-- ─── RESERVAS ───────────────────────────────────────────────────────────────
-- Hasta 60 días adelante y 30 reservas por venir por persona y grupo.
-- La versión sin código se borra: con las dos, una llamada de 5 argumentos
-- (build 4) sería ambigua. p_codigo tiene default, así que esa llamada sirve.
drop function if exists public.agregar_reserva_grupo(uuid, text, date, time, time);
create or replace function public.agregar_reserva_grupo(p_grupo uuid, p_lugar text, p_fecha date, p_inicio time, p_fin time, p_codigo text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); l text := btrim(coalesce(p_lugar, '')); id uuid;
        hoy date := (now() at time zone 'America/Santiago')::date;
        cod text := nullif(regexp_replace(btrim(coalesce(p_codigo, '')), '[[:space:]]+', ' ', 'g'), '');
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  if char_length(l) not between 1 and 60 then raise exception 'escribe dónde: hasta 60 caracteres'; end if;
  if public.amigos_texto_ofensivo(l) then raise exception 'ese texto no está permitido'; end if;
  if p_fecha is null or p_fecha < hoy or p_fecha > hoy + 60 then raise exception 'la fecha va de hoy a 60 días más'; end if;
  if p_inicio is null or p_fin is null or p_fin <= p_inicio then raise exception 'la hora de término va después de la de inicio'; end if;
  if cod is not null and cod !~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,23}$' then raise exception 'el código va con letras y números: hasta 24'; end if;
  if (select count(*) from public.amigos_grupo_reservas where grupo_id = p_grupo and user_id = uid and fecha >= hoy) >= 30 then
    raise exception 'ya tienes 30 reservas por venir en este grupo';
  end if;
  insert into public.amigos_grupo_reservas(grupo_id, user_id, lugar, fecha, inicio, fin, codigo)
  values (p_grupo, uid, l, p_fecha, p_inicio, p_fin, cod) returning amigos_grupo_reservas.id into id;
  return id;
end;
$$;

create or replace function public.borrar_reserva_grupo(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amigos_grupo_reservas where id = p_id and user_id = uid;
  return found;
end;
$$;

-- ─── PRUEBAS ────────────────────────────────────────────────────────────────
-- Una fecha de verdad (no 2026-02-30): así el calendario puede convertirla sin fallar.
create or replace function public.amigos_fecha_valida(p text)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if coalesce(p, '') !~ '^20[0-9]{2}-[01][0-9]-[0-3][0-9]$' then return false; end if;
  return to_char(p::date, 'YYYY-MM-DD') = p;
exception when others then return false;
end;
$$;
revoke all on function public.amigos_fecha_valida(text) from public, anon, authenticated;

create or replace function public.amigos_pruebas_estado()
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return exists (select 1 from public.amigos_pruebas where user_id = uid);
end;
$$;

-- Lo que no pasa el filtro se descarta: no frena una sincronización.
create or replace function public.publicar_mis_pruebas(p_pruebas jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); limpio jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'ramo', left(btrim(r ->> 'ramo'), 80),
           'sigla', nullif(left(upper(btrim(coalesce(r ->> 'sigla', ''))), 20), ''),
           'nombre', left(btrim(r ->> 'nombre'), 80),
           'fecha', r ->> 'fecha',
           'hora', case when coalesce(r ->> 'hora', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then r ->> 'hora' end)
           order by r ->> 'fecha'), '[]'::jsonb)
    into limpio
    from (select r from jsonb_array_elements(case when jsonb_typeof(p_pruebas) = 'array' then p_pruebas else '[]'::jsonb end) r
           where jsonb_typeof(r) = 'object'
             and public.amigos_fecha_valida(r ->> 'fecha')
             and char_length(btrim(coalesce(r ->> 'ramo', ''))) between 1 and 200
             and char_length(btrim(coalesce(r ->> 'nombre', ''))) between 1 and 200
           limit 60) t;
  insert into public.amigos_pruebas(user_id, pruebas) values (uid, limpio)
  on conflict (user_id) do update set pruebas = excluded.pruebas, updated_at = now();
  return jsonb_array_length(limpio);
end;
$$;

create or replace function public.dejar_de_compartir_pruebas()
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amigos_pruebas where user_id = uid;
  return true;
end;
$$;

-- ─── EL CALENDARIO DEL GRUPO ────────────────────────────────────────────────
-- De hoy a `p_dias` días: reservas del grupo y pruebas de quienes comparten.
-- tipo: 'reserva' | 'prueba'. `mia`: la anoté yo (para poder borrarla).
-- detalle: en una reserva, el código de la sala; en una prueba, la sigla.
create or replace function public.grupo_calendario(p_grupo uuid, p_dias integer default 21)
returns table(tipo text, id uuid, username text, nombre text, yo boolean, fecha date, inicio text, fin text, titulo text, detalle text)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
        hoy date := (now() at time zone 'America/Santiago')::date;
        hasta date := hoy + least(greatest(coalesce(p_dias, 21), 1), 60);
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  return query
  select 'reserva'::text, r.id, u.username, p.nombre, r.user_id = uid, r.fecha,
         to_char(r.inicio, 'HH24:MI'), to_char(r.fin, 'HH24:MI'), r.lugar, r.codigo
    from public.amigos_grupo_reservas r
    join public.usernames u on u.user_id = r.user_id
    left join public.profiles p on p.id = r.user_id
   where r.grupo_id = p_grupo and r.fecha between hoy and hasta
     and public.amigos_es_miembro(p_grupo, r.user_id)
     and (r.user_id = uid or (public.amigos_misma_u(uid, r.user_id) and not public.amigos_hay_bloqueo(uid, r.user_id)))
  union all
  select 'prueba'::text, null::uuid, u.username, p.nombre, m.user_id = uid, (e ->> 'fecha')::date,
         e ->> 'hora', null::text, e ->> 'nombre', coalesce(e ->> 'sigla', e ->> 'ramo')
    from public.amigos_grupo_miembros m
    join public.amigos_pruebas ap on ap.user_id = m.user_id
    join public.usernames u on u.user_id = m.user_id
    left join public.profiles p on p.id = m.user_id
    cross join lateral jsonb_array_elements(ap.pruebas) e
   where m.grupo_id = p_grupo and m.estado = 'miembro'
     and (m.user_id = uid or (public.amigos_misma_u(uid, m.user_id) and not public.amigos_hay_bloqueo(uid, m.user_id)))
     and public.amigos_fecha_valida(e ->> 'fecha')
     and (e ->> 'fecha')::date between hoy and hasta
  order by 6, 7 nulls first;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'agregar_reserva_grupo(uuid, text, date, time, time, text)', 'borrar_reserva_grupo(uuid)', 'amigos_pruebas_estado()',
    'publicar_mis_pruebas(jsonb)', 'dejar_de_compartir_pruebas()', 'grupo_calendario(uuid, integer)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
