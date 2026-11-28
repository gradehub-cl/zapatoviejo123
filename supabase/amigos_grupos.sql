-- Amigos: grupos de estudio (horarios cruzados entre varias personas).
--
-- APLÍCALO a mano en el SQL Editor (+ New query) DESPUÉS de amigos.sql, y
-- ANTES de mergear el PR que llama a estas funciones. Se puede correr dos
-- veces. Sin pgcrypto. Si no está aplicado, la app no muestra Grupos y el
-- resto de Amigos sigue igual.
--
-- QUÉ ES (Lucas, 2026-11-20): un grupo junta a varios amigos para ver a la
-- vez el horario de todos, encontrar las ventanas en que todos están libres y
-- coordinar quién llega y se va a la misma hora (hacer turno).
--
-- PRIVACIDAD
--   - Solo se invita a amigos aceptados de quien invita. Entrar a un grupo es
--     explícito: la invitación se acepta o se rechaza, y salir es libre.
--   - Dentro del grupo cada miembro ve a los demás (username, nombre, apellido)
--     y, si comparten su horario (amigos_ajustes), sus ramos y bloques. Es
--     decir: un miembro puede ver el horario de alguien que no es su amigo
--     directo; aceptar la invitación es ese consentimiento y la app lo dice.
--   - Del JSON de user_ramos sale lo mismo que en amigos_horarios
--     (amigos_ramos_publicos): nunca notas, pautas ni historial.
--   - Quien invita y la persona invitada antes de aceptar ven solo el nombre del
--     grupo, quién invitó y cuántos son: nada de horarios.
--   - Un bloqueo, en cualquier dirección, impide invitar o aceptar en un grupo
--     donde esté la otra persona, y cada una deja de ver a la otra en los
--     grupos que ya compartían.
--   - Ninguna función devuelve user_id ni correo de nadie.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - Dos tablas con RLS, sin políticas y sin permisos: solo por funciones.
--   - amigos_grupo_miembros.user_id → auth.users ON DELETE CASCADE.
--     amigos_grupos.creador e invitado_por → ON DELETE SET NULL (el grupo
--     sigue para los demás). Cuando no queda ningún miembro, un trigger borra
--     el grupo con sus invitaciones: no quedan grupos huérfanos con nombre.
begin;

create table if not exists public.amigos_grupos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(btrim(nombre)) between 1 and 40),
  creador    uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.amigos_grupos enable row level security;
revoke all on public.amigos_grupos from public, anon, authenticated;

create table if not exists public.amigos_grupo_miembros (
  grupo_id     uuid not null references public.amigos_grupos(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  estado       text not null default 'invitado' check (estado in ('invitado', 'miembro')),
  invitado_por uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (grupo_id, user_id)
);
create index if not exists amigos_grupo_miembros_user_idx on public.amigos_grupo_miembros (user_id);
alter table public.amigos_grupo_miembros enable row level security;
revoke all on public.amigos_grupo_miembros from public, anon, authenticated;

-- Sin miembros no hay grupo: se va con sus invitaciones pendientes.
create or replace function public.amigos_grupo_limpiar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.amigos_grupos g
   where g.id = old.grupo_id
     and not exists (select 1 from public.amigos_grupo_miembros m where m.grupo_id = old.grupo_id and m.estado = 'miembro');
  return null;
end;
$$;
revoke all on function public.amigos_grupo_limpiar() from public, anon, authenticated;
drop trigger if exists amigos_grupo_limpiar on public.amigos_grupo_miembros;
create trigger amigos_grupo_limpiar after delete on public.amigos_grupo_miembros
  for each row execute function public.amigos_grupo_limpiar();

-- ─── AUXILIARES (no se exponen) ─────────────────────────────────────────────
create or replace function public.amigos_son_amigos(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amistades
                  where least(de, para) = least(p_a, p_b) and greatest(de, para) = greatest(p_a, p_b) and estado = 'aceptada')
$$;
create or replace function public.amigos_hay_bloqueo(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amigos_bloqueos
                  where (user_id = p_a and bloqueado = p_b) or (user_id = p_b and bloqueado = p_a))
$$;
-- ¿Alguien del grupo (miembro o invitado) tiene un bloqueo con esta persona?
create or replace function public.amigos_grupo_bloqueo(p_grupo uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amigos_grupo_miembros m
                  where m.grupo_id = p_grupo and m.user_id <> p_user and public.amigos_hay_bloqueo(m.user_id, p_user))
$$;
create or replace function public.amigos_es_miembro(p_grupo uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = p_user and estado = 'miembro')
$$;
-- Invitar a un amigo de quien invita. 15 personas por grupo, invitaciones incluidas.
create or replace function public.amigos_grupo_invitar(p_grupo uuid, p_yo uuid, p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare otro uuid := public.amigos_resolver(p_username, p_yo);
begin
  perform 1 from public.amigos_grupos where id=p_grupo for update;
  if otro is null or otro = p_yo or not public.amigos_son_amigos(p_yo, otro) then
    raise exception 'solo puedes invitar a tus amigos';
  end if;
  if exists (select 1 from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = otro) then return 'ya'; end if;
  if public.amigos_grupo_bloqueo(p_grupo, otro) then raise exception 'no se puede invitar a esa persona a este grupo'; end if;
  if (select count(*) from public.amigos_grupo_miembros where grupo_id = p_grupo) >= 15 then
    raise exception 'un grupo admite hasta 15 personas';
  end if;
  insert into public.amigos_grupo_miembros(grupo_id, user_id, estado, invitado_por) values (p_grupo, otro, 'invitado', p_yo);
  return 'invitado';
end;
$$;
do $$
declare f text;
begin
  foreach f in array array['amigos_son_amigos(uuid, uuid)', 'amigos_hay_bloqueo(uuid, uuid)', 'amigos_grupo_bloqueo(uuid, uuid)',
                           'amigos_es_miembro(uuid, uuid)', 'amigos_grupo_invitar(uuid, uuid, text)']
  loop execute format('revoke all on function public.%s from public, anon, authenticated', f); end loop;
end $$;

-- ─── CREAR E INVITAR ────────────────────────────────────────────────────────
-- Hasta 10 grupos por persona: suficiente para un semestre, poco para spam.
create or replace function public.crear_grupo(p_nombre text, p_usernames text[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); g uuid; n text := btrim(coalesce(p_nombre, '')); u text;
begin
  if not exists (select 1 from public.usernames where user_id = uid) then
    raise exception 'elige tu username antes de crear un grupo';
  end if;
  if char_length(n) not between 1 and 40 then raise exception 'el nombre del grupo va de 1 a 40 caracteres'; end if;
  if public.amigos_texto_ofensivo(n) then raise exception 'ese nombre de grupo no está permitido'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 871));
  if (select count(*) from public.amigos_grupo_miembros where user_id = uid and estado = 'miembro') >= 10 then
    raise exception 'puedes estar en hasta 10 grupos';
  end if;
  insert into public.amigos_grupos(nombre, creador) values (n, uid) returning id into g;
  insert into public.amigos_grupo_miembros(grupo_id, user_id, estado) values (g, uid, 'miembro');
  foreach u in array coalesce(p_usernames, '{}') loop perform public.amigos_grupo_invitar(g, uid, u); end loop;
  return g;
end;
$$;

create or replace function public.invitar_a_grupo(p_grupo uuid, p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  return public.amigos_grupo_invitar(p_grupo, uid, p_username);
end;
$$;

-- Aceptar revisa de nuevo los bloqueos: pudieron cambiar desde la invitación.
create or replace function public.responder_grupo(p_grupo uuid, p_aceptar boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  if not exists (select 1 from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = uid and estado = 'invitado') then
    return false;
  end if;
  if coalesce(p_aceptar, false) then
    perform pg_advisory_xact_lock(hashtextextended(uid::text, 871));
    if (select count(*) from public.amigos_grupo_miembros where user_id = uid and estado = 'miembro') >= 10 then
      raise exception 'puedes estar en hasta 10 grupos';
    end if;
    if public.amigos_grupo_bloqueo(p_grupo, uid) then
      delete from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = uid;
      raise exception 'ese grupo ya no está disponible';
    end if;
    update public.amigos_grupo_miembros set estado = 'miembro' where grupo_id = p_grupo and user_id = uid;
  else
    delete from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = uid;
  end if;
  return true;
end;
$$;

create or replace function public.salir_de_grupo(p_grupo uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amigos_grupo_miembros where grupo_id = p_grupo and user_id = uid;
  return found;
end;
$$;

-- Solo quien lo creó saca a alguien (o retira una invitación).
create or replace function public.quitar_de_grupo(p_grupo uuid, p_username text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); otro uuid;
begin
  if not exists (select 1 from public.amigos_grupos where id = p_grupo and creador = uid) or not public.amigos_es_miembro(p_grupo, uid) then
    raise exception 'solo quien creó el grupo puede sacar a alguien';
  end if;
  select user_id into otro from public.usernames where username = public.amigos_normalizar(p_username);
  if otro is null or otro = uid then return false; end if;
  perform 1 from public.amigos_grupos where id=p_grupo for update;
  delete from public.amigos_grupo_miembros where grupo_id=p_grupo and user_id=otro;
  if not found then return false; end if;
  update public.amigos_grupo_miembros set enlace=null,enlace_vence=null where grupo_id=p_grupo and enlace is not null;
  return true;
end;
$$;

create or replace function public.renombrar_grupo(p_grupo uuid, p_nombre text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); n text := btrim(coalesce(p_nombre, ''));
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  if char_length(n) not between 1 and 40 then raise exception 'el nombre del grupo va de 1 a 40 caracteres'; end if;
  if public.amigos_texto_ofensivo(n) then raise exception 'ese nombre de grupo no está permitido'; end if;
  update public.amigos_grupos set nombre = n where id = p_grupo;
  return n;
end;
$$;

-- ─── LEER ───────────────────────────────────────────────────────────────────
-- Mis grupos y mis invitaciones. `miembros` cuenta solo a quienes aceptaron.
-- `nombres`: hasta tres nombres de pila de otros miembros, para el avatar y la
-- línea «Tú, Beto y Dani» (como WhatsApp antes de unirse). Nada de horarios.
drop function if exists public.mis_grupos();
create or replace function public.mis_grupos()
returns table(id uuid, nombre text, estado text, miembros integer, soy_creador boolean, invitado_por text, nombres text[])
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return query
  select g.id, g.nombre, m.estado,
         (select count(*)::integer from public.amigos_grupo_miembros x where x.grupo_id = g.id and x.estado = 'miembro'),
         g.creador is not distinct from uid,
         (select u.username from public.usernames u where u.user_id = m.invitado_por),
         array(select coalesce(nullif(split_part(btrim(p.nombre), ' ', 1), ''), u.username)
                 from public.amigos_grupo_miembros x
                 join public.usernames u on u.user_id = x.user_id
                 left join public.profiles p on p.id = x.user_id
                where x.grupo_id = g.id and x.estado = 'miembro' and x.user_id <> uid
                  and not public.amigos_hay_bloqueo(uid, x.user_id)
                  and public.amigos_misma_u(uid, x.user_id)
                order by x.created_at limit 3)
    from public.amigos_grupo_miembros m
    join public.amigos_grupos g on g.id = m.grupo_id
   where m.user_id = uid
     and not (m.estado = 'invitado' and public.amigos_grupo_bloqueo(g.id, uid))
   order by (m.estado = 'miembro'), lower(g.nombre);
end;
$$;

-- El grupo por dentro, solo para sus miembros. `ramos` va únicamente de quienes
-- aceptaron y comparten su horario; la fila propia va sin ramos (la app ya los
-- tiene). Quien tiene un bloqueo con quien pregunta no aparece.
create or replace function public.grupo_detalle(p_grupo uuid)
returns table(username text, nombre text, apellido text, estado text, yo boolean, creador boolean, ramos jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  if not public.amigos_es_miembro(p_grupo, uid) then raise exception 'no estás en ese grupo'; end if;
  return query
  select u.username, p.nombre, p.apellido, m.estado, m.user_id = uid,
         (select g.creador from public.amigos_grupos g where g.id = p_grupo) is not distinct from m.user_id,
         case when m.user_id <> uid and m.estado = 'miembro'
                   and coalesce((select s.comparte_horario from public.amigos_ajustes s where s.user_id = m.user_id), true)
              then public.amigos_ramos_publicos(d.data) end
    from public.amigos_grupo_miembros m
    join public.usernames u on u.user_id = m.user_id
    left join public.profiles p on p.id = m.user_id
    left join public.user_ramos d on d.user_id = m.user_id
   where m.grupo_id = p_grupo
     and (m.user_id = uid or (not public.amigos_hay_bloqueo(uid, m.user_id) and public.amigos_misma_u(uid, m.user_id)))
   order by (m.user_id <> uid), (m.estado <> 'miembro'), lower(coalesce(p.nombre, u.username));
end;
$$;

-- Cada integrante puede compartir una invitación reutilizable por siete días. Al salir pierde el enlace.
alter table public.amigos_grupo_miembros add column if not exists enlace uuid,
  add column if not exists enlace_vence timestamptz;
create unique index if not exists amigos_grupo_enlace_idx on public.amigos_grupo_miembros(enlace) where enlace is not null;

create or replace function public.crear_enlace_grupo(p_grupo uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.amigos_exigir_sesion(); token uuid;
begin
  update public.amigos_grupo_miembros set
    enlace=case when enlace_vence>now() then enlace else gen_random_uuid() end,
    enlace_vence=case when enlace_vence>now() then enlace_vence else now()+interval '7 days' end
    where grupo_id=p_grupo and user_id=uid and estado='miembro' returning enlace into token;
  if token is null then raise exception 'no estás en ese grupo'; end if;
  return token;
end; $$;

create or replace function public.abrir_enlace_grupo(p_enlace uuid,p_unirse boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=public.amigos_exigir_sesion(); g uuid; emisor uuid; nombre text; miembro boolean;
begin
  select m.grupo_id into g from public.amigos_grupo_miembros m where m.enlace=p_enlace;
  select a.nombre into nombre from public.amigos_grupos a where a.id=g for update;
  select m.user_id into emisor from public.amigos_grupo_miembros m where m.grupo_id=g and m.enlace=p_enlace
    and m.enlace_vence>now() and m.estado='miembro' for update;
  if emisor is null or not exists(select 1 from public.usernames where user_id=uid)
    or (emisor<>uid and not public.amigos_misma_u(emisor,uid)) or public.amigos_grupo_bloqueo(g,uid)
  then raise exception 'este enlace ya no está disponible para tu cuenta'; end if;
  miembro:=public.amigos_es_miembro(g,uid);
  if p_unirse and not miembro then
    if not exists(select 1 from public.amigos_grupo_miembros where grupo_id=g and user_id=uid) then
      if (select count(*) from public.amigos_grupo_miembros where grupo_id=g)>=15 then raise exception 'el grupo está lleno'; end if;
      perform pg_advisory_xact_lock(hashtextextended(uid::text,871));
      if (select count(*) from public.amigos_grupo_miembros where user_id=uid and estado='miembro')>=10 then
        raise exception 'puedes estar en hasta 10 grupos';
      end if;
      insert into public.amigos_grupo_miembros(grupo_id,user_id,invitado_por,estado) values(g,uid,emisor,'miembro');
    else
      if not public.responder_grupo(g,true) then raise exception 'vuelve a abrir la invitación'; end if;
    end if;
    miembro:=true;
  end if;
  return jsonb_build_object('nombre',nombre,'id',case when miembro then g end);
end; $$;

do $$
declare f text;
begin
  foreach f in array array[
    'crear_enlace_grupo(uuid)', 'abrir_enlace_grupo(uuid, boolean)', 'crear_grupo(text, text[])', 'invitar_a_grupo(uuid, text)', 'responder_grupo(uuid, boolean)', 'salir_de_grupo(uuid)',
    'quitar_de_grupo(uuid, text)', 'renombrar_grupo(uuid, text)', 'mis_grupos()', 'grupo_detalle(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
