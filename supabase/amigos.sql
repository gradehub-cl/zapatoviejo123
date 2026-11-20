-- Amigos: username único, amistades, horario compartido, bloqueo y denuncia.
--
-- APLÍCALO a mano en el SQL Editor (+ New query) DESPUÉS de administradores.sql,
-- y ANTES de mergear el PR que llama a estas funciones. Se puede correr dos
-- veces. Sin pgcrypto (tests/sql-sin-pgcrypto.test.js).
--
-- QUÉ ES (Lucas, 2026-11-19): una pestaña Amigos para agregarse por username,
-- ver los ramos y el horario de los amigos, encontrar ventanas libres en común
-- y saber si están en clases. Grupos y notas compartidas tienen su propio SQL
-- (amigos_grupos.sql, amigos_notas.sql), que se aplica después de este.
--
-- PRIVACIDAD
--   - Nadie aparece en un listado ni en una búsqueda parcial. A una persona se
--     la encuentra escribiendo su username exacto, o abriendo su link.
--   - Antes de aceptar, la otra persona ve solo username, nombre, apellido y
--     universidad (lo mismo que mostraría un link de invitación).
--   - Los ramos y el horario se leen únicamente entre amistades aceptadas, y
--     solo si quien los comparte no lo apagó (amigos_compartir_horario). Del
--     JSON de user_ramos salen nombre, sigla, sección y bloques de horario:
--     nunca evaluaciones, notas, pautas ni el historial.
--   - Ninguna función devuelve el user_id ni el correo de otra persona. Una
--     amistad se nombra por su `id`; una persona, por su username.
--   - Un bloqueo, en cualquier dirección, borra la amistad, oculta a cada una
--     de la búsqueda de la otra e impide volver a pedirla.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - Las cinco tablas tienen RLS sin políticas y sin permisos: no se leen ni
--     escriben desde el cliente, solo por las funciones de abajo.
--   - Todas apuntan a auth.users ON DELETE CASCADE por cada persona que
--     nombran. Borrar una cuenta (eliminar_mi_cuenta.sql) borra su username,
--     sus amistades, sus bloqueos en ambas direcciones, sus ajustes y las
--     denuncias que hizo o recibió. `resuelta_por` queda en null, igual que
--     admin.acciones.
--
-- DENUNCIAS (App Review 1.2): un admin con segundo factor las ve con el
-- username denunciado y el motivo, nunca quién denunció. Puede descartarla o
-- quitar el username, que obliga a elegir otro. No hay ocultamiento automático
-- por cantidad: igual que en denuncias_bloqueos.sql, lo decide una persona.
begin;

-- ─── USERNAME ───────────────────────────────────────────────────────────────
-- 3 a 20 caracteres: minúsculas, números, punto y guion bajo. Empieza y
-- termina en letra o número, y sin dos signos seguidos (se leen mal: a.._b).
-- Se guarda ya normalizado; la unicidad es sobre el texto en minúsculas.
create table if not exists public.usernames (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique
              check (username ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' and username !~ '[._]{2}'),
  cambiado_at timestamptz not null default now()
);
alter table public.usernames enable row level security;
revoke all on public.usernames from public, anon, authenticated;

-- ─── AMISTADES ──────────────────────────────────────────────────────────────
-- Una fila por par, en una sola dirección: `de` pidió, `para` responde.
-- Rechazar o eliminar borra la fila; no queda rastro de una solicitud ignorada.
create table if not exists public.amistades (
  id          uuid primary key default gen_random_uuid(),
  de          uuid not null references auth.users(id) on delete cascade,
  para        uuid not null references auth.users(id) on delete cascade,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'aceptada')),
  created_at  timestamptz not null default now(),
  aceptada_at timestamptz,
  check (de <> para)
);
create unique index if not exists amistades_par_idx on public.amistades (least(de, para), greatest(de, para));
create index if not exists amistades_para_idx on public.amistades (para);
alter table public.amistades enable row level security;
revoke all on public.amistades from public, anon, authenticated;

-- ─── BLOQUEOS ───────────────────────────────────────────────────────────────
create table if not exists public.amigos_bloqueos (
  user_id    uuid not null references auth.users(id) on delete cascade,
  bloqueado  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, bloqueado),
  check (user_id <> bloqueado)
);
create index if not exists amigos_bloqueos_bloqueado_idx on public.amigos_bloqueos (bloqueado);
alter table public.amigos_bloqueos enable row level security;
revoke all on public.amigos_bloqueos from public, anon, authenticated;

-- ─── AJUSTES ────────────────────────────────────────────────────────────────
-- Sin fila = comparte su horario con sus amigos: aceptar una amistad es el
-- consentimiento. Se apaga desde la pestaña y deja de verse al tiro.
create table if not exists public.amigos_ajustes (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  comparte_horario boolean not null default true,
  updated_at       timestamptz not null default now()
);
alter table public.amigos_ajustes enable row level security;
revoke all on public.amigos_ajustes from public, anon, authenticated;

-- ─── DENUNCIAS ──────────────────────────────────────────────────────────────
create table if not exists public.amigos_denuncias (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  denunciado   uuid not null references auth.users(id) on delete cascade,
  -- El username de ese momento: si lo cambia, el admin igual sabe qué se denunció.
  username     text not null,
  motivo       text not null check (motivo in ('username_ofensivo', 'acoso', 'suplantacion', 'spam', 'otro')),
  detalle      text check (detalle is null or char_length(detalle) <= 500),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'descartada', 'resuelta')),
  created_at   timestamptz not null default now(),
  resuelta_at  timestamptz,
  resuelta_por uuid references auth.users(id) on delete set null,
  check (user_id <> denunciado)
);
create index if not exists amigos_denuncias_pendientes_idx on public.amigos_denuncias (estado, created_at);
alter table public.amigos_denuncias enable row level security;
revoke all on public.amigos_denuncias from public, anon, authenticated;

-- ─── AUXILIARES (no se exponen) ─────────────────────────────────────────────
-- Normaliza lo que escribió la persona: sin espacios, sin @ inicial, minúsculas.
create or replace function public.amigos_normalizar(p text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(p, '')), '^@+', ''))
$$;
revoke all on function public.amigos_normalizar(text) from public, anon, authenticated;

-- Nombres que nadie puede tomar: confunden con el equipo o con una institución.
create or replace function public.amigos_username_reservado(p text)
returns boolean language sql immutable set search_path = '' as $$
  select p = any (array['admin','administrador','administracion','soporte','support','ayuda','help',
                        'gradehub','oficial','official','staff','equipo','moderador','mod','root','sistema',
                        'system','null','undefined','api','www','app','ios','android','profesor','profe',
                        'uc','fen','uai','udd','uandes','uchile','puc','amigos','perfil','inicio','agenda'])
      or p like '%gradehub%' or p like 'admin%' or p like '%soporte%'
$$;
revoke all on function public.amigos_username_reservado(text) from public, anon, authenticated;

-- Filtro de groserías e insultos para usernames y nombres de grupo (App
-- Review 1.2: contenido de usuarios). Misma idea que profesor_texto_permitido:
-- vive en la base, no solo en la app. Raíces fuertes se buscan en cualquier
-- parte (un username no tiene espacios); las que aparecen dentro de nombres
-- reales, solo como palabra suelta: no se rechaza «gilberto», «penelope»,
-- «maricel», «vergara» ni «computacion». Se deshace
-- el leetspeak común (0→o, 1→i, 3→e, 4→a, 5→s, 7→t).
create or replace function public.amigos_texto_ofensivo(p text)
returns boolean language sql immutable set search_path = '' as $$
  with t as (select translate(lower(coalesce(p, '')), 'áéíóúüñ013457', 'aeiouunoieast') as x)
  select x ~ '(weon|weona|hueon|huevon|aweon|culia|conchetu|conchesu|maricon|mierd|ctm|csm|ptm|idiota|imbecil|estupid|pendej|cabron|zorra|perra|nazi|hitler|violador|pedofil|racista|porno|cocain|suicid)'
      -- «puto» al empezar una palabra: atrapa «putoelquelee» sin tocar «computacion».
      or x ~ '(^|[^a-z])put[ao]'
      or x ~ ('(^|[^a-z])(' || array_to_string(array['wn','wna','wea','weas','ql','qlo','gil','gila','pico','raja','culo','culos','poto','longi','flaite','facho','caca',
                                                    'pichula','pene','verga','sexo','tetas','droga','drogas'],'|') || ')([^a-z]|$)')
  from t
$$;
revoke all on function public.amigos_texto_ofensivo(text) from public, anon, authenticated;

-- El user_id de un username, solo si existe y nadie bloqueó a nadie.
create or replace function public.amigos_resolver(p_username text, p_yo uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.user_id from public.usernames u
   where u.username = public.amigos_normalizar(p_username)
     and not exists (select 1 from public.amigos_bloqueos b
                      where (b.user_id = p_yo and b.bloqueado = u.user_id)
                         or (b.user_id = u.user_id and b.bloqueado = p_yo))
$$;
revoke all on function public.amigos_resolver(text, uuid) from public, anon, authenticated;

-- Lo único que sale del JSON de user_ramos hacia otra persona: por ramo del
-- semestre activo, nombre, sigla, sección y los bloques a los que va. Nunca
-- evaluaciones, notas, pautas ni historial. La usan amigos_horarios y, en
-- amigos_grupos.sql, grupo_detalle.
create or replace function public.amigos_ramos_publicos(p_data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
             'nombre', r ->> 'nombre',
             'sigla', coalesce(nullif(r ->> 'sigla', ''), r -> 'origen' ->> 'ramoKey'),
             'seccion', case when jsonb_typeof(r -> 'seccion') = 'number' then r -> 'seccion' end,
             'horario', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'dias', b -> 'dias', 'inicio', b ->> 'inicio', 'fin', b ->> 'fin',
                         'sala', b ->> 'sala', 'tipo', b ->> 'tipo'))
                  from jsonb_array_elements(case when jsonb_typeof(r -> 'horario') = 'array' then r -> 'horario' else '[]'::jsonb end) b
                 where jsonb_typeof(b) = 'object' and coalesce((b ->> 'noVoy')::boolean, false) = false
              ), '[]'::jsonb)))
      from jsonb_array_elements(case when jsonb_typeof(p_data -> 'ramos') = 'array' then p_data -> 'ramos' else '[]'::jsonb end) r
     where jsonb_typeof(r) = 'object'
  ), '[]'::jsonb)
$$;
revoke all on function public.amigos_ramos_publicos(jsonb) from public, anon, authenticated;

create or replace function public.amigos_exigir_sesion()
returns uuid language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'hay que haber iniciado sesión' using errcode = '42501'; end if;
  return uid;
end;
$$;
revoke all on function public.amigos_exigir_sesion() from public, anon, authenticated;

-- ─── MI ESTADO ──────────────────────────────────────────────────────────────
-- La app la llama al abrir Amigos. Si falla porque no existe, el SQL todavía
-- no está aplicado y la pestaña no se muestra.
create or replace function public.amigos_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return jsonb_build_object(
    'username', (select username from public.usernames where user_id = uid),
    'cambiado_at', (select cambiado_at from public.usernames where user_id = uid),
    'comparte_horario', coalesce((select comparte_horario from public.amigos_ajustes where user_id = uid), true),
    'recibidas', (select count(*) from public.amistades where para = uid and estado = 'pendiente'));
end;
$$;

-- ¿Está libre este username? Para avisar mientras se escribe. No dice de quién es.
create or replace function public.amigos_username_disponible(p_username text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); n text := public.amigos_normalizar(p_username);
begin
  if n !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' or n ~ '[._]{2}' then return 'invalido'; end if;
  if public.amigos_username_reservado(n) then return 'reservado'; end if;
  if public.amigos_texto_ofensivo(n) then return 'no_permitido'; end if;
  if exists (select 1 from public.usernames where username = n and user_id <> uid) then return 'ocupado'; end if;
  return 'disponible';
end;
$$;

-- Elegir o cambiar el username. Cambiarlo, una vez cada 30 días: así nadie
-- salta de nombre en nombre para que no lo encuentren después de molestar.
create or replace function public.fijar_username(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); n text := public.amigos_normalizar(p_username);
        actual public.usernames%rowtype;
begin
  if n !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' or n ~ '[._]{2}' then
    raise exception 'username inválido: de 3 a 20 letras, números, punto o guion bajo';
  end if;
  if public.amigos_username_reservado(n) then raise exception 'ese username está reservado'; end if;
  if public.amigos_texto_ofensivo(n) then raise exception 'ese username no está permitido'; end if;
  select * into actual from public.usernames where user_id = uid;
  if found and actual.username = n then return n; end if;
  if found and actual.cambiado_at > now() - interval '30 days' then
    raise exception 'el username se puede cambiar una vez cada 30 días';
  end if;
  if exists (select 1 from public.usernames where username = n) then raise exception 'ese username ya está ocupado'; end if;
  insert into public.usernames(user_id, username) values (uid, n)
  on conflict (user_id) do update set username = excluded.username, cambiado_at = now();
  return n;
end;
$$;

-- ─── BUSCAR ─────────────────────────────────────────────────────────────────
-- Solo por username exacto. relacion: yo, amigos, enviada, recibida o ninguna.
create or replace function public.buscar_usuario(p_username text)
returns table(username text, nombre text, apellido text, universidad text, relacion text)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); otro uuid := public.amigos_resolver(p_username, uid);
begin
  if otro is null then return; end if;
  return query
  select u.username, p.nombre, p.apellido, p.universidad,
         case when otro = uid then 'yo'
              when a.estado = 'aceptada' then 'amigos'
              when a.de = uid then 'enviada'
              when a.para = uid then 'recibida'
              else 'ninguna' end
    from public.usernames u
    left join public.profiles p on p.id = u.user_id
    left join public.amistades a on least(a.de, a.para) = least(uid, otro) and greatest(a.de, a.para) = greatest(uid, otro)
   where u.user_id = otro;
end;
$$;

-- ─── SOLICITUDES ────────────────────────────────────────────────────────────
-- Si la otra persona ya me había pedido, pedirle de vuelta es aceptar.
-- Hasta 30 solicitudes por día: lo justo para agregar al curso entero.
create or replace function public.solicitar_amistad(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); otro uuid := public.amigos_resolver(p_username, uid);
        a public.amistades%rowtype;
begin
  if not exists (select 1 from public.usernames where user_id = uid) then
    raise exception 'elige tu username antes de agregar amigos';
  end if;
  if otro is null then raise exception 'no encontramos a esa persona'; end if;
  if otro = uid then raise exception 'no puedes agregarte a ti'; end if;
  select * into a from public.amistades
   where least(de, para) = least(uid, otro) and greatest(de, para) = greatest(uid, otro);
  if found then
    if a.estado = 'aceptada' then return 'amigos'; end if;
    if a.de = uid then return 'enviada'; end if;
    update public.amistades set estado = 'aceptada', aceptada_at = now() where id = a.id;
    return 'amigos';
  end if;
  if (select count(*) from public.amistades where de = uid and created_at > now() - interval '1 day') >= 30 then
    raise exception 'demasiadas solicitudes hoy; intenta mañana';
  end if;
  insert into public.amistades(de, para) values (uid, otro);
  return 'enviada';
end;
$$;

-- Aceptar o rechazar una solicitud que me llegó.
create or replace function public.responder_amistad(p_id uuid, p_aceptar boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  if coalesce(p_aceptar, false) then
    update public.amistades set estado = 'aceptada', aceptada_at = now()
     where id = p_id and para = uid and estado = 'pendiente';
  else
    delete from public.amistades where id = p_id and para = uid and estado = 'pendiente';
  end if;
  return found;
end;
$$;

-- Eliminar a un amigo o cancelar una solicitud que envié. No le avisa a nadie.
create or replace function public.eliminar_amistad(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amistades where id = p_id and (de = uid or para = uid);
  return found;
end;
$$;

-- Todo lo mío: amigos, enviadas y recibidas, con lo justo para reconocerlos.
create or replace function public.mis_amistades()
returns table(id uuid, username text, nombre text, apellido text, universidad text, carrera text, estado text, desde timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return query
  select a.id, u.username, p.nombre, p.apellido, p.universidad,
         -- La carrera, solo entre amigos: una solicitud pendiente no la revela.
         case when a.estado = 'aceptada' then p.carrera end,
         case when a.estado = 'aceptada' then 'amigos' when a.de = uid then 'enviada' else 'recibida' end,
         coalesce(a.aceptada_at, a.created_at)
    from public.amistades a
    join public.usernames u on u.user_id = case when a.de = uid then a.para else a.de end
    left join public.profiles p on p.id = u.user_id
   where a.de = uid or a.para = uid
   order by (a.estado = 'aceptada'), lower(coalesce(p.nombre, u.username));
end;
$$;

-- ─── HORARIO ────────────────────────────────────────────────────────────────
-- Ramos del semestre activo de cada amigo que comparte: nombre, sigla, sección
-- y los bloques a los que va. Nada más del JSON: ni evaluaciones ni notas.
create or replace function public.amigos_horarios()
returns table(id uuid, username text, nombre text, ramos jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return query
  select a.id, u.username, p.nombre, public.amigos_ramos_publicos(d.data)
    from public.amistades a
    join public.usernames u on u.user_id = case when a.de = uid then a.para else a.de end
    left join public.profiles p on p.id = u.user_id
    left join public.user_ramos d on d.user_id = u.user_id
   where (a.de = uid or a.para = uid) and a.estado = 'aceptada'
     and coalesce((select s.comparte_horario from public.amigos_ajustes s where s.user_id = u.user_id), true);
end;
$$;

create or replace function public.amigos_compartir_horario(p_comparte boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  insert into public.amigos_ajustes(user_id, comparte_horario) values (uid, coalesce(p_comparte, true))
  on conflict (user_id) do update set comparte_horario = excluded.comparte_horario, updated_at = now();
  return coalesce(p_comparte, true);
end;
$$;

-- ─── BLOQUEAR Y DENUNCIAR ───────────────────────────────────────────────────
create or replace function public.bloquear_usuario(p_username text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); otro uuid;
begin
  select user_id into otro from public.usernames where username = public.amigos_normalizar(p_username);
  if otro is null or otro = uid then return false; end if;
  insert into public.amigos_bloqueos(user_id, bloqueado) values (uid, otro) on conflict do nothing;
  delete from public.amistades where least(de, para) = least(uid, otro) and greatest(de, para) = greatest(uid, otro);
  return true;
end;
$$;

create or replace function public.desbloquear_usuario(p_username text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amigos_bloqueos b using public.usernames u
   where b.user_id = uid and b.bloqueado = u.user_id and u.username = public.amigos_normalizar(p_username);
  return found;
end;
$$;

create or replace function public.mis_bloqueados()
returns table(username text) language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return query select u.username from public.amigos_bloqueos b join public.usernames u on u.user_id = b.bloqueado
                where b.user_id = uid order by b.created_at desc;
end;
$$;

-- Hasta 10 denuncias por día. Denunciar no bloquea: la app ofrece las dos.
create or replace function public.denunciar_usuario(p_username text, p_motivo text, p_detalle text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); otro uuid; n text := public.amigos_normalizar(p_username);
        det text := nullif(btrim(coalesce(p_detalle, '')), '');
begin
  if p_motivo is null or p_motivo not in ('username_ofensivo', 'acoso', 'suplantacion', 'spam', 'otro') then
    raise exception 'motivo inválido';
  end if;
  if char_length(det) > 500 then raise exception 'el detalle admite hasta 500 caracteres'; end if;
  select user_id into otro from public.usernames where username = n;
  if otro is null then raise exception 'no encontramos a esa persona'; end if;
  if otro = uid then raise exception 'no puedes denunciarte a ti'; end if;
  if (select count(*) from public.amigos_denuncias where user_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'demasiadas denuncias hoy';
  end if;
  insert into public.amigos_denuncias(user_id, denunciado, username, motivo, detalle) values (uid, otro, n, p_motivo, det);
  return true;
end;
$$;

-- ─── ADMIN ──────────────────────────────────────────────────────────────────
create or replace function public.admin_denuncias_usuarios()
returns table(id bigint, username text, username_actual text, motivo text, detalle text, created_at timestamptz, mismas integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform admin.exigir_administrador();
  return query
  select d.id, d.username, u.username, d.motivo, d.detalle, d.created_at,
         (select count(*)::integer from public.amigos_denuncias x where x.denunciado = d.denunciado and x.estado = 'pendiente')
    from public.amigos_denuncias d
    left join public.usernames u on u.user_id = d.denunciado
   where d.estado = 'pendiente'
   order by d.created_at;
end;
$$;

-- 'descartada' cierra todas las pendientes contra esa cuenta. 'resuelta' además
-- le quita el username: tendrá que elegir otro para volver a Amigos.
create or replace function public.admin_resolver_denuncia_usuario(p_id bigint, p_estado text)
returns integer language plpgsql security definer set search_path = '' as $$
declare d public.amigos_denuncias%rowtype; filas integer;
begin
  perform admin.exigir_administrador();
  if p_estado not in ('resuelta', 'descartada') then raise exception 'estado inválido'; end if;
  select * into d from public.amigos_denuncias where id = p_id and estado = 'pendiente';
  if not found then return 0; end if;
  update public.amigos_denuncias set estado = p_estado, resuelta_at = now(), resuelta_por = auth.uid()
   where denunciado = d.denunciado and estado = 'pendiente';
  get diagnostics filas = row_count;
  if p_estado = 'resuelta' then delete from public.usernames where user_id = d.denunciado; end if;
  insert into admin.acciones(admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'resolver_denuncia_usuario', d.denunciado,
          jsonb_build_object('denuncia', p_id, 'username', d.username, 'estado', p_estado, 'cerradas', filas));
  return filas;
end;
$$;

-- ─── PERMISOS ───────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'amigos_estado()', 'amigos_username_disponible(text)', 'fijar_username(text)', 'buscar_usuario(text)',
    'solicitar_amistad(text)', 'responder_amistad(uuid, boolean)', 'eliminar_amistad(uuid)', 'mis_amistades()',
    'amigos_horarios()', 'amigos_compartir_horario(boolean)', 'bloquear_usuario(text)', 'desbloquear_usuario(text)',
    'mis_bloqueados()', 'denunciar_usuario(text, text, text)', 'admin_denuncias_usuarios()',
    'admin_resolver_denuncia_usuario(bigint, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
