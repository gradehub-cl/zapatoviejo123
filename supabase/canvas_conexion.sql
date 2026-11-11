-- #1063, PR 1. Instalación manual por Lucas/Martín, NO ejecutada por el deploy.
-- Requiere supabase/agente_mcp.sql (agent_links). Reaplicable, sin carga inicial.
-- Antes de publicar: revisión legal y secretos de Pages distintos por entorno:
-- CANVAS_TOKEN_KEY (32 bytes base64) y SUPABASE_SECRET_KEY (solo servidor).
-- El cifrado nunca sale por una RPC de estudiante/agente: lectura solo service_role.
begin;
create table if not exists public.canvas_conexiones (
  user_id uuid primary key references auth.users(id) on delete cascade,
  host text not null check (host = 'https://cursos.canvas.uc.cl'),
  token_cifrado text not null check (length(token_cifrado) between 52 and 192 and token_cifrado ~ '^[A-Za-z0-9+/]+={0,2}$'),
  iv text not null check (iv ~ '^[A-Za-z0-9+/]{16}$'),
  vence timestamptz not null,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz
);
alter table public.canvas_conexiones enable row level security;
-- Sin políticas ni grants directos, tampoco para el servidor: solo RPC.
revoke all on public.canvas_conexiones from public, anon, authenticated, service_role;

create or replace function public.guardar_canvas_conexion(p_token_cifrado text, p_iv text, p_vence timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'sin sesión'; end if;
  if p_token_cifrado is null or length(p_token_cifrado) not between 52 and 192
    or p_token_cifrado !~ '^[A-Za-z0-9+/]+={0,2}$' or p_iv is null or p_iv !~ '^[A-Za-z0-9+/]{16}$'
    or p_vence is null or p_vence <= now() or p_vence > now() + interval '90 days'
    then raise exception 'conexión inválida'; end if;
  insert into public.canvas_conexiones(user_id, host, token_cifrado, iv, vence)
    values(v_user, 'https://cursos.canvas.uc.cl', p_token_cifrado, p_iv, p_vence)
    on conflict(user_id) do update set token_cifrado=excluded.token_cifrado,
      iv=excluded.iv, vence=excluded.vence, creado=now(), ultimo_uso=null;
  return jsonb_build_object('conectado',true,'vence',p_vence);
end $$;
create or replace function public.borrar_canvas_conexion()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.canvas_conexiones where user_id=auth.uid();
  return jsonb_build_object('conectado',false,'vence',null);
end $$;

-- Exclusiva del servidor. El MCP usará p_token: misma resolución que agente_datos,
-- sin cambiar permisos/estado de los agentes existentes. p_user_id lo usa la
-- Function web solo después de verificar /auth/v1/user. Nunca acepta ambos.
create or replace function public.canvas_conexion_interna(p_user_id uuid default null, p_token text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_fila jsonb;
begin
  if (p_user_id is null) = (p_token is null) then return null; end if;
  if p_token is not null then
    if p_token !~ '^[0-9a-f]{64}$' then return null; end if;
    select user_id into v_user from public.agent_links where token=p_token and expires_at>now();
  else v_user := p_user_id;
  end if;
  if v_user is null then return null; end if;
  delete from public.canvas_conexiones where user_id=v_user and vence<=now();
  update public.canvas_conexiones set ultimo_uso=now() where user_id=v_user
    returning jsonb_build_object('user_id',user_id,'host',host,'token_cifrado',token_cifrado,'iv',iv,'vence',vence) into v_fila;
  return v_fila;
end $$;

-- Tras un 401 de Canvas, solo borra la versión que hizo ese pedido. Un 401
-- tardío de un token anterior no puede borrar la conexión recién reemplazada.
create or replace function public.canvas_borrar_rechazada(p_user_id uuid, p_iv text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  delete from public.canvas_conexiones where user_id=p_user_id and iv=p_iv;
  return jsonb_build_object('borrada',found);
end $$;

revoke all on function public.guardar_canvas_conexion(text,text,timestamptz), public.borrar_canvas_conexion(),
  public.canvas_conexion_interna(uuid,text), public.canvas_borrar_rechazada(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.guardar_canvas_conexion(text,text,timestamptz), public.borrar_canvas_conexion() to authenticated;
grant execute on function public.canvas_conexion_interna(uuid,text), public.canvas_borrar_rechazada(uuid,text) to service_role;
commit;
