-- Amigos: avisos push (solicitudes, amistades aceptadas, invitaciones a grupos
-- y salas reservadas en tus grupos).
--
-- APLÍCALO a mano en el SQL Editor (+ New query) DESPUÉS de amigos.sql,
-- amigos_grupos.sql y amigos_calendario.sql. Se puede correr dos veces. Sin
-- pgcrypto. Además hay que publicar la función supabase/functions/avisos-push
-- y crear el Database Webhook (ver supabase/functions/avisos-push/LEEME.md).
-- Sin eso, los avisos quedan en la cola y se borran solos a las 24 horas.
--
-- CÓMO FUNCIONA
--   1. La app, si la persona activa «Avisos de Amigos» y iOS lo permite,
--      registra el token de ese iPhone (registrar_dispositivo).
--   2. Cuando pasa algo, un trigger escribe en avisos_salientes una fila por
--      cada iPhone de quien recibe el aviso.
--   3. Un Database Webhook manda cada fila nueva a la función avisos-push, que
--      la firma y la envía a Apple (APNs) y la borra de la cola.
--
-- PRIVACIDAD
--   - Opcional: sin token registrado no hay avisos. Apagarlo en la app o cerrar
--     sesión borra el token de ese iPhone.
--   - El aviso dice quién y qué (nombre de pila y username; el nombre del grupo;
--     el lugar y la hora de una sala). Nunca notas, ramos ni horarios.
--   - Respeta todo lo de Amigos: misma universidad y sin bloqueos.
--   - Un fallo al avisar nunca impide la acción (pedir, aceptar, invitar, anotar).
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - push_dispositivos y avisos_salientes: RLS sin políticas y sin permisos.
--   - Ambas con user_id → auth.users ON DELETE CASCADE.
--   - La cola se limpia sola: lo que tiene más de 24 horas se borra.
begin;

create table if not exists public.push_dispositivos (
  token         text primary key check (token ~ '^[0-9a-f]{64,200}$'),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plataforma    text not null default 'ios' check (plataforma in ('ios')),
  actualizado_at timestamptz not null default now()
);
create index if not exists push_dispositivos_user_idx on public.push_dispositivos (user_id);
alter table public.push_dispositivos enable row level security;
revoke all on public.push_dispositivos from public, anon, authenticated;

create table if not exists public.avisos_salientes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  titulo     text not null check (char_length(titulo) <= 80),
  cuerpo     text not null check (char_length(cuerpo) <= 200),
  enlace     text not null check (enlace ~ '^cl\.gradehub\.app://[a-z]+(/[A-Za-z0-9_-]{1,64})?$'),
  created_at timestamptz not null default now()
);
create index if not exists avisos_salientes_creado_idx on public.avisos_salientes (created_at);
alter table public.avisos_salientes enable row level security;
revoke all on public.avisos_salientes from public, anon, authenticated;

-- ─── REGISTRAR EL IPHONE ────────────────────────────────────────────────────
-- Un token es de un iPhone: si otra cuenta lo tenía (se cambió de cuenta en el
-- mismo teléfono), pasa a esta. Hasta 5 iPhones por cuenta: el más viejo sale.
create or replace function public.registrar_dispositivo(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); t text := lower(btrim(coalesce(p_token, '')));
begin
  if t !~ '^[0-9a-f]{64,200}$' then raise exception 'token inválido'; end if;
  insert into public.push_dispositivos(token, user_id) values (t, uid)
  on conflict (token) do update set user_id = excluded.user_id, actualizado_at = now();
  delete from public.push_dispositivos where user_id = uid and token in (
    select token from public.push_dispositivos where user_id = uid order by actualizado_at desc offset 5);
  return true;
end;
$$;

create or replace function public.olvidar_dispositivo(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.push_dispositivos where token = lower(btrim(coalesce(p_token, ''))) and user_id = uid;
  return found;
end;
$$;

-- ─── ENCOLAR (no se expone) ─────────────────────────────────────────────────
create or replace function public.amigos_avisar(p_user uuid, p_titulo text, p_cuerpo text, p_enlace text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.avisos_salientes where created_at < now() - interval '24 hours';
  insert into public.avisos_salientes(user_id, token, titulo, cuerpo, enlace)
  select p_user, d.token, left(p_titulo, 80), left(p_cuerpo, 200), p_enlace
    from public.push_dispositivos d where d.user_id = p_user;
exception when others then
  -- Avisar es un extra: nunca rompe la acción que lo provocó.
  null;
end;
$$;
revoke all on function public.amigos_avisar(uuid, text, text, text) from public, anon, authenticated;

-- «Beto (@beto_ej)»: nombre de pila si lo tiene, si no el username.
create or replace function public.amigos_quien(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(split_part(btrim(p.nombre), ' ', 1), '') || ' (@' || u.username || ')', '@' || u.username, 'Alguien')
    from (select p_user as id) x
    left join public.usernames u on u.user_id = x.id
    left join public.profiles p on p.id = x.id
$$;
revoke all on function public.amigos_quien(uuid) from public, anon, authenticated;

-- ─── QUÉ AVISA ──────────────────────────────────────────────────────────────
create or replace function public.amigos_aviso_amistad()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.estado = 'pendiente' then
    perform public.amigos_avisar(new.para, 'Solicitud de amistad', public.amigos_quien(new.de) || ' quiere ser tu amigo en GradeHub.', 'cl.gradehub.app://amigos');
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'aceptada' then
    perform public.amigos_avisar(new.de, 'Nuevo amigo', public.amigos_quien(new.para) || ' aceptó tu solicitud.', 'cl.gradehub.app://amigo/' || new.id::text);
  end if;
  return null;
end;
$$;
revoke all on function public.amigos_aviso_amistad() from public, anon, authenticated;
drop trigger if exists amigos_aviso_amistad on public.amistades;
create trigger amigos_aviso_amistad after insert or update of estado on public.amistades
  for each row execute function public.amigos_aviso_amistad();

create or replace function public.amigos_aviso_grupo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.estado = 'invitado' and new.invitado_por is not null then
    perform public.amigos_avisar(new.user_id, 'Invitación a un grupo',
      public.amigos_quien(new.invitado_por) || ' te invitó a «' || (select nombre from public.amigos_grupos where id = new.grupo_id) || '».',
      'cl.gradehub.app://amigos');
  end if;
  return null;
end;
$$;
revoke all on function public.amigos_aviso_grupo() from public, anon, authenticated;
drop trigger if exists amigos_aviso_grupo on public.amigos_grupo_miembros;
create trigger amigos_aviso_grupo after insert on public.amigos_grupo_miembros
  for each row execute function public.amigos_aviso_grupo();

-- Una sala nueva: a los demás miembros del grupo, de la misma U y sin bloqueo.
create or replace function public.amigos_aviso_reserva()
returns trigger language plpgsql security definer set search_path = '' as $$
declare g text := (select nombre from public.amigos_grupos where id = new.grupo_id);
        cuando text := case when new.fecha = (now() at time zone 'America/Santiago')::date then 'hoy'
                            when new.fecha = (now() at time zone 'America/Santiago')::date + 1 then 'mañana'
                            else to_char(new.fecha, 'DD/MM') end;
        m record;
begin
  for m in select x.user_id from public.amigos_grupo_miembros x
            where x.grupo_id = new.grupo_id and x.estado = 'miembro' and x.user_id <> new.user_id
              and public.amigos_misma_u(x.user_id, new.user_id) and not public.amigos_hay_bloqueo(x.user_id, new.user_id)
  loop
    perform public.amigos_avisar(m.user_id, g,
      public.amigos_quien(new.user_id) || ' reservó ' || new.lugar || ', ' || cuando || ' a las ' || to_char(new.inicio, 'HH24:MI') || '.',
      'cl.gradehub.app://amigos');
  end loop;
  return null;
exception when others then return null;
end;
$$;
revoke all on function public.amigos_aviso_reserva() from public, anon, authenticated;
drop trigger if exists amigos_aviso_reserva on public.amigos_grupo_reservas;
create trigger amigos_aviso_reserva after insert on public.amigos_grupo_reservas
  for each row execute function public.amigos_aviso_reserva();

do $$
declare f text;
begin
  foreach f in array array['registrar_dispositivo(text)', 'olvidar_dispositivo(text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
