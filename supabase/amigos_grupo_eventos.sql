-- Amigos: novedades del grupo (salas, fechas y quién entra).
--
-- APLÍCALO con node bin/sql-produccion.js aplicar supabase/amigos_grupo_eventos.sql
-- DESPUÉS de amigos_grupos.sql y amigos_calendario.sql, y ANTES de mergear el PR
-- que llama a grupo_novedades. Se puede correr dos veces. Sin pgcrypto.
--
-- QUÉ ES (Lucas, 2026-11-22): la pantalla del grupo pasa a ser un hilo de lo que
-- pasa en el grupo, en orden: «Beto anotó Sala B-12», «Carla puso fecha a
-- Interrogación 2», «Dani se unió». Lo que ya está en la Agenda de cada uno no
-- se repite en el grupo.
--
-- PRIVACIDAD
--   - Un evento lo ven solo los miembros del grupo, de la misma U y sin bloqueo
--     con quien mira (las mismas reglas que grupo_calendario).
--   - «Fecha» sale solo de lo que la persona ya comparte con «Compartir fechas»
--     (ramo, sigla, nombre de la evaluación, fecha y hora). Nunca notas ni
--     ponderaciones. Activarlo no avisa todo de golpe: solo lo nuevo después.
--     Dejar de compartir borra sus eventos de fecha.
--   - «Sala» apunta a la reserva: si se borra la reserva, se va el evento, y se
--     muestra con sus datos de hoy (lugar, hora, código).
--   - Salir del grupo se lleva tus eventos de ese grupo. Se guardan 60 días.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - amigos_grupo_eventos: RLS, sin políticas ni permisos; solo por funciones.
--   - grupo → amigos_grupos ON DELETE CASCADE; user_id → auth.users ON DELETE
--     CASCADE; reserva_id → amigos_grupo_reservas ON DELETE CASCADE.
begin;

create table if not exists public.amigos_grupo_eventos (
  id         uuid primary key default gen_random_uuid(),
  grupo_id   uuid not null references public.amigos_grupos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  tipo       text not null check (tipo in ('sala', 'fecha', 'union')),
  reserva_id uuid references public.amigos_grupo_reservas(id) on delete cascade,
  datos      jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists amigos_grupo_eventos_grupo_idx on public.amigos_grupo_eventos (grupo_id, created_at desc);
create index if not exists amigos_grupo_eventos_user_idx on public.amigos_grupo_eventos (user_id);
create index if not exists amigos_grupo_eventos_reserva_idx on public.amigos_grupo_eventos (reserva_id);
alter table public.amigos_grupo_eventos enable row level security;
revoke all on public.amigos_grupo_eventos from public, anon, authenticated;

-- Lo viejo se va solo: cada evento nuevo limpia su grupo.
create or replace function public.amigos_eventos_limpiar(p_grupo uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.amigos_grupo_eventos where grupo_id = p_grupo and created_at < now() - interval '60 days';
$$;
revoke all on function public.amigos_eventos_limpiar(uuid) from public, anon, authenticated;

-- ─── Sala anotada ───────────────────────────────────────────────────────────
-- Un error acá nunca impide anotar la sala.
create or replace function public.amigos_evento_sala()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.amigos_eventos_limpiar(new.grupo_id);
  insert into public.amigos_grupo_eventos(grupo_id, user_id, tipo, reserva_id) values (new.grupo_id, new.user_id, 'sala', new.id);
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.amigos_evento_sala() from public, anon, authenticated;
drop trigger if exists amigos_evento_sala on public.amigos_grupo_reservas;
create trigger amigos_evento_sala after insert on public.amigos_grupo_reservas
  for each row execute function public.amigos_evento_sala();

-- ─── Alguien entra al grupo (acepta la invitación) ─────────────────────────
create or replace function public.amigos_evento_union()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado='miembro' and new.invitado_por is not null and (tg_op='INSERT' or old.estado='invitado') then
    perform public.amigos_eventos_limpiar(new.grupo_id);
    insert into public.amigos_grupo_eventos(grupo_id, user_id, tipo) values (new.grupo_id, new.user_id, 'union');
  end if;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.amigos_evento_union() from public, anon, authenticated;
drop trigger if exists amigos_evento_union on public.amigos_grupo_miembros;
create trigger amigos_evento_union after insert or update of estado on public.amigos_grupo_miembros
  for each row execute function public.amigos_evento_union();

-- Salir del grupo (o que te saquen) se lleva tus eventos de ese grupo.
create or replace function public.amigos_eventos_al_salir()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.amigos_grupo_eventos where grupo_id = old.grupo_id and user_id = old.user_id;
  return null;
end;
$$;
revoke all on function public.amigos_eventos_al_salir() from public, anon, authenticated;
drop trigger if exists amigos_eventos_al_salir on public.amigos_grupo_miembros;
create trigger amigos_eventos_al_salir after delete on public.amigos_grupo_miembros
  for each row execute function public.amigos_eventos_al_salir();

-- ─── Fecha nueva o cambiada ────────────────────────────────────────────────
-- Al publicar las pruebas (publicar_mis_pruebas), las entradas que antes no
-- estaban tal cual: fecha puesta o cambiada. La primera publicación (activar
-- «Compartir fechas») no avisa. Hasta 5 por vez, y una misma fecha no se repite
-- en el grupo en 3 días aunque otra persona la ponga igual.
create or replace function public.amigos_evento_fechas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare e jsonb; d jsonb; g uuid;
        hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if tg_op <> 'UPDATE' then return null; end if;
  for e in
    select x from jsonb_array_elements(new.pruebas) x
     where public.amigos_fecha_valida(x ->> 'fecha') and (x ->> 'fecha')::date >= hoy
       and not exists (select 1 from jsonb_array_elements(old.pruebas) o
                        where o ->> 'ramo' = x ->> 'ramo' and coalesce(o ->> 'sigla', '') = coalesce(x ->> 'sigla', '')
                          and o ->> 'nombre' = x ->> 'nombre' and o ->> 'fecha' = x ->> 'fecha'
                          and coalesce(o ->> 'hora', '') = coalesce(x ->> 'hora', ''))
     limit 5
  loop
    d := jsonb_build_object('ramo', e ->> 'ramo', 'sigla', e ->> 'sigla', 'nombre', e ->> 'nombre', 'fecha', e ->> 'fecha', 'hora', e ->> 'hora');
    for g in select m.grupo_id from public.amigos_grupo_miembros m where m.user_id = new.user_id and m.estado = 'miembro' loop
      if not exists (select 1 from public.amigos_grupo_eventos v
                      where v.grupo_id = g and v.tipo = 'fecha' and v.datos = d and v.created_at > now() - interval '3 days') then
        perform public.amigos_eventos_limpiar(g);
        insert into public.amigos_grupo_eventos(grupo_id, user_id, tipo, datos) values (g, new.user_id, 'fecha', d);
      end if;
    end loop;
  end loop;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.amigos_evento_fechas() from public, anon, authenticated;
drop trigger if exists amigos_evento_fechas on public.amigos_pruebas;
create trigger amigos_evento_fechas after insert or update on public.amigos_pruebas
  for each row execute function public.amigos_evento_fechas();

-- Dejar de compartir fechas borra sus eventos de fecha.
create or replace function public.amigos_eventos_sin_fechas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.amigos_grupo_eventos where user_id = old.user_id and tipo = 'fecha';
  return null;
end;
$$;
revoke all on function public.amigos_eventos_sin_fechas() from public, anon, authenticated;
drop trigger if exists amigos_eventos_sin_fechas on public.amigos_pruebas;
create trigger amigos_eventos_sin_fechas after delete on public.amigos_pruebas
  for each row execute function public.amigos_eventos_sin_fechas();

-- Las salas por venir que ya existen entran al hilo con su fecha de creación,
-- para que el hilo no parta vacío. Reaplicable: no duplica.
insert into public.amigos_grupo_eventos(grupo_id, user_id, tipo, reserva_id, created_at)
select r.grupo_id, r.user_id, 'sala', r.id, r.created_at
  from public.amigos_grupo_reservas r
 where r.fecha >= (now() at time zone 'America/Santiago')::date
   and not exists (select 1 from public.amigos_grupo_eventos e where e.reserva_id = r.id);

-- ─── Leer el hilo ───────────────────────────────────────────────────────────
-- Lo más nuevo primero. `datos` de una sala sale de la reserva tal como está hoy.
create or replace function public.grupo_novedades(p_grupo uuid, p_limite integer default 40)
returns table(id uuid, tipo text, username text, nombre text, yo boolean, creado timestamptz, datos jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  return query
  select e.id, e.tipo, u.username, p.nombre, e.user_id = uid, e.created_at,
         case when e.tipo = 'sala' then jsonb_build_object('reserva', r.id, 'lugar', r.lugar, 'fecha', r.fecha,
                'inicio', to_char(r.inicio, 'HH24:MI'), 'fin', to_char(r.fin, 'HH24:MI'), 'codigo', r.codigo)
              else e.datos end
    from public.amigos_grupo_eventos e
    join public.usernames u on u.user_id = e.user_id
    left join public.profiles p on p.id = e.user_id
    left join public.amigos_grupo_reservas r on r.id = e.reserva_id
   where e.grupo_id = p_grupo and e.created_at > now() - interval '60 days'
     and public.amigos_es_miembro(p_grupo, e.user_id)
     and (e.user_id = uid or (public.amigos_misma_u(uid, e.user_id) and not public.amigos_hay_bloqueo(uid, e.user_id)))
     and (e.tipo <> 'sala' or r.id is not null)
     and (e.tipo <> 'fecha' or exists (select 1 from public.amigos_pruebas ap where ap.user_id = e.user_id))
   order by e.created_at desc
   limit least(greatest(coalesce(p_limite, 40), 1), 100);
end;
$$;
revoke all on function public.grupo_novedades(uuid, integer) from public, anon;
grant execute on function public.grupo_novedades(uuid, integer) to authenticated;

commit;
