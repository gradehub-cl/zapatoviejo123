-- Recado en video del Wrapped (Lucas, 2026-11-07). Requiere profesores.sql y
-- administradores.sql. Reaplicable.
--
-- Profes bien calificados de la UC graban un video. Cada persona ve como mucho
-- uno: el de un profe que tuvo este período y calificó con 4 o 5 estrellas,
-- según el nombre que ella misma informó al calificar. Quien no calificó a
-- nadie ve que por eso no hay recado.
--
-- Cargar un video (desde el panel de Supabase, sin desplegar la app):
--   1. Subir el archivo al bucket privado `wrapped`, p. ej. uc/urvina.mp4
--      (y si hay, uc/urvina.jpg y uc/urvina.vtt con los subtítulos).
--   2. insert into public.wrapped_videos(tenant,profesor,archivo,poster,subtitulos)
--      values ('uc','Ricardo Urvina','uc/urvina.mp4','uc/urvina.jpg','uc/urvina.vtt');
--   Para retirarlo: update public.wrapped_videos set activo=false where archivo='uc/urvina.mp4';
begin;

-- Catálogo de videos. No guarda datos de estudiantes: solo el nombre del profe
-- y dónde está su archivo. Sin acceso directo; se lee por las funciones.
create table if not exists public.wrapped_videos (
  id uuid primary key default gen_random_uuid(),
  tenant text not null check (tenant in ('uc','fen','uai','uandes','udd')),
  profesor text not null check (char_length(profesor) between 3 and 100),
  archivo text not null unique check (archivo ~ '^[a-z0-9][a-z0-9/_.-]{2,150}\.(mp4|webm)$'),
  poster text check (poster is null or poster ~ '^[a-z0-9][a-z0-9/_.-]{2,150}\.(jpg|jpeg|png|webp)$'),
  subtitulos text check (subtitulos is null or subtitulos ~ '^[a-z0-9][a-z0-9/_.-]{2,150}\.vtt$'),
  activo boolean not null default true,
  creado timestamptz not null default now()
);
alter table public.wrapped_videos enable row level security;
revoke all on public.wrapped_videos from public, anon, authenticated;

-- Bucket privado: 50 MB por archivo, solo video, imagen del póster y subtítulos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wrapped', 'wrapped', false, 52428800,
        array['video/mp4','video/webm','image/jpeg','image/png','image/webp','text/vtt'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- El video que le toca a una cuenta: el profe mejor calificado entre los que
-- tienen video, y si empatan, la calificación más reciente. Compara con el
-- nombre que informó esa cuenta (no con el consenso de otra sección) y deja
-- fuera a quien pidió no aparecer. Interna: sin permisos para el cliente.
create or replace function public.wrapped_recado_elegido(p_usuario uuid, p_tenant text, p_periodo text)
returns table(video uuid, profesor text, ramo_clave text, estrellas smallint)
language sql stable security definer set search_path = '' as $$
  select v.id, v.profesor, k.ramo_clave, k.estrellas
  from public.profesor_calificaciones k
  join public.profesor_aportes a using (user_id, tenant, ramo_clave, seccion, periodo)
  join public.wrapped_videos v
    on v.tenant = k.tenant and v.activo and public.profesor_coinciden(v.profesor, a.nombre)
  where k.user_id = p_usuario and k.tenant = p_tenant and k.periodo = p_periodo and k.estrellas >= 4
    and not exists(select 1 from public.profesor_ocultos o
      where o.tenant = k.tenant and public.profesor_coinciden(o.nombre, a.nombre))
  order by k.estrellas desc, k.actualizada desc, v.creado
  limit 1;
$$;

-- Para la app: una sola fila. `hay_videos` dice si esa universidad tiene
-- alguno (si no, el Wrapped no habla del recado); `calificaciones` cuenta las
-- de esta cuenta en el período, y el resto es el video elegido, si hay.
-- Cliente: rpc('wrapped_recado', {p_tenant:'uc', p_periodo:'2026-2'}).
create or replace function public.wrapped_recado(p_tenant text, p_periodo text)
returns table(hay_videos boolean, calificaciones integer, profesor text, ramo_clave text,
  archivo text, poster text, subtitulos text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if p_periodo is null or p_periodo !~ '^20[0-9]{2}-[12]$' then raise exception 'período inválido'; end if;
  return query
    select exists(select 1 from public.wrapped_videos w where w.tenant = p_tenant and w.activo),
      (select count(*)::integer from public.profesor_calificaciones k
        where k.user_id = auth.uid() and k.tenant = p_tenant and k.periodo = p_periodo),
      e.profesor, e.ramo_clave, v.archivo, v.poster, v.subtitulos
    from (select 1) uno
    left join public.wrapped_recado_elegido(auth.uid(), p_tenant, p_periodo) e on true
    left join public.wrapped_videos v on v.id = e.video;
end;
$$;

-- Storage: un archivo lo lee solo quien lo tiene elegido, y administración con
-- segundo factor. Así el video no circula antes ni a quien no le toca.
create or replace function public.wrapped_archivo_visible(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.administrador_verificado() or exists(
    select 1 from public.wrapped_videos v
    join lateral public.wrapped_recado_elegido(auth.uid(), v.tenant, public.profesor_periodo_actual()) e
      on e.video = v.id
    where p_path in (v.archivo, v.poster, v.subtitulos));
$$;

drop policy if exists wrapped_leer on storage.objects;
create policy wrapped_leer on storage.objects
for select to authenticated using (bucket_id = 'wrapped' and public.wrapped_archivo_visible(name));

revoke all on function public.wrapped_recado_elegido(uuid,text,text) from public, anon, authenticated;
revoke all on function public.wrapped_recado(text,text) from public, anon, authenticated;
revoke all on function public.wrapped_archivo_visible(text) from public, anon, authenticated;
grant execute on function public.wrapped_recado(text,text) to authenticated;
-- La política de Storage la evalúa el rol de quien pide el archivo.
grant execute on function public.wrapped_archivo_visible(text) to authenticated;
commit;
