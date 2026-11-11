-- #1063, PR 1. Propuesta manual, pendiente de aprobación de Lucas. NO aplicada.
-- Requiere agente_mcp.sql (agent_links). Reaplicable y sin carga inicial.
-- Pages usa la clave publicable + JWT, y CANVAS_TOKEN_KEY_<n> para AES-GCM.
begin;
create table if not exists public.canvas_conexiones (
  user_id uuid primary key references auth.users(id) on delete cascade,
  host text not null check (host = 'https://cursos.canvas.uc.cl'),
  token_cifrado text not null check (length(token_cifrado) between 52 and 192 and token_cifrado ~ '^[A-Za-z0-9+/]+={0,2}$'),
  iv text not null check (iv ~ '^[A-Za-z0-9+/]{16}$'),
  llave_version smallint not null default 1 check (llave_version > 0),
  vence timestamptz not null,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz
);
-- Compatibilidad del esquema en entornos de prueba que instalaron el borrador.
-- Sus cifrados con la AAD antigua necesitan recifrado: cambiar esta columna no basta.
alter table public.canvas_conexiones add column if not exists llave_version smallint not null default 1 check (llave_version > 0);
create table if not exists public.canvas_conexion_intentos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ventana timestamptz not null default now(),
  intentos smallint not null check (intentos between 1 and 5)
);
alter table public.canvas_conexiones enable row level security;
alter table public.canvas_conexion_intentos enable row level security;
revoke all on public.canvas_conexiones, public.canvas_conexion_intentos from public, anon, authenticated, service_role;

-- Retira las firmas del borrador anterior: ninguna puerta acepta un usuario ajeno.
drop function if exists public.canvas_conexion_interna(uuid,text);
drop function if exists public.canvas_borrar_rechazada(uuid,text);
drop function if exists public.guardar_canvas_conexion(text,text,timestamptz);

create or replace function public.canvas_registrar_intento()
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_permitido boolean;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  -- ON CONFLICT serializa por persona; la condición se comprueba bajo el lock.
  insert into public.canvas_conexion_intentos as i(user_id,ventana,intentos)
    values(auth.uid(),now(),1)
    on conflict(user_id) do update set
      ventana=case when i.ventana<=now()-interval '1 hour' then now() else i.ventana end,
      intentos=case when i.ventana<=now()-interval '1 hour' then 1 else i.intentos+1 end
    where i.ventana<=now()-interval '1 hour' or i.intentos<5
    returning true into v_permitido;
  return coalesce(v_permitido,false);
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;

-- Parámetros text: la conversión de fecha/versión ocurre dentro del bloque
-- protegido; un error de cast no puede repetir un secreto en el mensaje.
create or replace function public.guardar_canvas_conexion(p_token_cifrado text,p_iv text,p_vence text,p_llave_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_vence timestamptz; v_version smallint;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if p_token_cifrado is null or length(p_token_cifrado) not between 52 and 192
    or p_token_cifrado !~ '^[A-Za-z0-9+/]+={0,2}$' or p_iv is null or p_iv !~ '^[A-Za-z0-9+/]{16}$'
    or p_llave_version is null or p_llave_version !~ '^[1-9][0-9]{0,4}$' then raise exception 'conexión inválida'; end if;
  v_version := p_llave_version::smallint;
  v_vence := p_vence::timestamptz;
  if v_vence is null or v_vence<=now() or v_vence>now()+interval '90 days' then raise exception 'conexión inválida'; end if;
  insert into public.canvas_conexiones(user_id,host,token_cifrado,iv,vence,llave_version)
    values(auth.uid(),'https://cursos.canvas.uc.cl',p_token_cifrado,p_iv,v_vence,v_version)
    on conflict(user_id) do update set token_cifrado=excluded.token_cifrado,iv=excluded.iv,
      vence=excluded.vence,llave_version=excluded.llave_version,creado=now(),ultimo_uso=null;
  return jsonb_build_object('conectado',true,'vence',v_vence);
exception when others then
  raise exception using errcode='22023', message='No se pudo guardar la conexión.';
end $$;
create or replace function public.borrar_canvas_conexion()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.canvas_conexiones where user_id=auth.uid();
  -- Desconectar no reinicia el límite de intentos.
  return jsonb_build_object('conectado',false,'vence',null);
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;

create or replace function public.canvas_conexion_mia()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_fila jsonb;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.canvas_conexiones where user_id=auth.uid() and vence<=now();
  update public.canvas_conexiones set ultimo_uso=now() where user_id=auth.uid()
    returning jsonb_build_object('user_id',user_id,'host',host,'token_cifrado',token_cifrado,
      'iv',iv,'vence',vence,'llave_version',llave_version) into v_fila;
  return v_fila;
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;
create or replace function public.canvas_conexion_agente(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_fila jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select user_id into v_user from public.agent_links where token=p_token and expires_at>now();
  if v_user is null then return null; end if;
  delete from public.canvas_conexiones where user_id=v_user and vence<=now();
  update public.canvas_conexiones set ultimo_uso=now() where user_id=v_user
    returning jsonb_build_object('user_id',user_id,'host',host,'token_cifrado',token_cifrado,
      'iv',iv,'vence',vence,'llave_version',llave_version) into v_fila;
  return v_fila;
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;

-- Un 401 tardío no borra una renovación: se compara la versión exacta del pedido (IV).
create or replace function public.canvas_borrar_rechazada(p_iv text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.canvas_conexiones where user_id=auth.uid() and iv=p_iv;
  return jsonb_build_object('borrada',found);
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;
create or replace function public.canvas_borrar_rechazada_agente(p_token text,p_iv text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('borrada',false); end if;
  select user_id into v_user from public.agent_links where token=p_token and expires_at>now();
  delete from public.canvas_conexiones where user_id=v_user and iv=p_iv;
  return jsonb_build_object('borrada',found);
exception when others then
  raise exception using errcode='22023', message='Operación Canvas no disponible.';
end $$;

revoke all on function public.canvas_registrar_intento(), public.guardar_canvas_conexion(text,text,text,text),
  public.borrar_canvas_conexion(), public.canvas_conexion_mia(), public.canvas_conexion_agente(text),
  public.canvas_borrar_rechazada(text), public.canvas_borrar_rechazada_agente(text,text) from public,anon,authenticated;
grant execute on function public.canvas_registrar_intento(), public.guardar_canvas_conexion(text,text,text,text),
  public.borrar_canvas_conexion(), public.canvas_conexion_mia(), public.canvas_borrar_rechazada(text) to authenticated;
grant execute on function public.canvas_conexion_agente(text), public.canvas_borrar_rechazada_agente(text,text) to anon,authenticated;
commit;
