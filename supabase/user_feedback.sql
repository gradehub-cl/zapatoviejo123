-- Canal general de sugerencias y comentarios.
--
-- Aditivo y reaplicable. Aplicar en el SQL Editor de Supabase ANTES de mergear
-- el cliente que lo usa. Cloudflare publica archivos estáticos, pero no
-- ejecuta este SQL. Aplicarlo no manda avisos por sí solo.

create table if not exists public.user_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  categoria  text not null check (categoria in ('sugerencia', 'problema', 'otro')),
  mensaje    text not null check (char_length(btrim(mensaje)) between 3 and 2000),
  created_at timestamptz not null default now()
);

-- Universidad de quien escribe (el `tenant` de la app: fen, uc, uai, uandes),
-- para revisar los comentarios por universidad. Null en los anteriores.
alter table public.user_feedback
  add column if not exists universidad text
  check (universidad is null or universidad ~ '^[a-z]{2,12}$');

alter table public.user_feedback enable row level security;

-- El cliente solo puede insertar. No puede listar comentarios propios ni
-- ajenos, editarlos o borrarlos. Lucas y Martín los revisan desde Supabase.
revoke all on public.user_feedback from public, anon, authenticated;
grant insert (user_id, categoria, mensaje, universidad) on public.user_feedback to authenticated;

drop policy if exists user_feedback_insert_own on public.user_feedback;
create policy user_feedback_insert_own
on public.user_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Aviso privado de solución (Lucas, 2026-10-28). Aplicar a mano antes del
-- cliente; aplicar este archivo NO avisa a nadie ni cambia los comentarios.
-- Después de publicar y comprobar el arreglo, desde el SQL Editor:
--   select admin.resolver_feedback('<id del feedback>', 'Qué se solucionó.');
-- No es una RPC administrativa: solo el dueño de la base puede ejecutarla.
alter table public.user_feedback
  add column if not exists solucion text check (char_length(btrim(solucion)) between 3 and 240),
  add column if not exists solucionado_at timestamptz,
  add column if not exists solucion_vista_at timestamptz;

create index if not exists user_feedback_soluciones_pendientes
  on public.user_feedback (user_id, solucionado_at, id)
  where solucionado_at is not null and solucion_vista_at is null;

create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;
create or replace function admin.resolver_feedback(p_feedback_id uuid, p_solucion text)
returns boolean language plpgsql set search_path = '' as $$
begin
  if p_solucion is null or char_length(btrim(p_solucion)) not between 3 and 240 then
    raise exception 'La solución debe tener entre 3 y 240 caracteres';
  end if;
  update public.user_feedback
     set solucion = btrim(p_solucion), solucionado_at = now()
   where id = p_feedback_id and solucionado_at is null;
  return found;
end;
$$;
revoke all on function admin.resolver_feedback(uuid, text) from public, anon, authenticated;

-- Solo el aviso para la cuenta que llama: no el comentario original, el UID
-- ni una bandeja de comentarios ajenos. La tabla sigue siendo INSERT-only.
create or replace function public.mis_feedback_solucionados()
returns table(feedback_id uuid, solucion text, solucionado_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.solucion, f.solucionado_at from public.user_feedback f
   where f.user_id = (select auth.uid()) and f.solucionado_at is not null
     and f.solucion_vista_at is null
   order by f.solucionado_at, f.id limit 20;
$$;
revoke all on function public.mis_feedback_solucionados() from public, anon;
grant execute on function public.mis_feedback_solucionados() to authenticated;

create or replace function public.feedback_solucion_vista(p_feedback_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.user_feedback
     set solucion_vista_at = coalesce(solucion_vista_at, now())
   where id = p_feedback_id and user_id = (select auth.uid()) and solucionado_at is not null;
  return found;
end;
$$;
revoke all on function public.feedback_solucion_vista(uuid) from public, anon;
grant execute on function public.feedback_solucion_vista(uuid) to authenticated;
