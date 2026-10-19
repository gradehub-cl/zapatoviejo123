-- Errores de la app y de la web: saber cuándo algo se cae antes de que alguien
-- nos escriba.
--
-- APLÍCALO UNA VEZ en el SQL Editor de Supabase. Sin la tabla, el cliente
-- intenta guardar y falla en silencio: no rompe nada, pero no se registra.
--
-- Qué llega: cada error de JavaScript que nadie atrapó, saneado en el cliente
-- con detalleErrorSeguro() (app-session.js): sin notas, nombres de ramos,
-- correos, URL ni números. Máximo 5 por visita y sin repetir el mismo.

create table if not exists public.errores_app (
  id          bigint generated always as identity primary key,
  creado      timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plataforma  text not null check (plataforma in ('app', 'web')),
  version     text check (char_length(version) <= 20),
  tipo        text not null check (char_length(tipo) <= 30),
  mensaje     text not null check (char_length(mensaje) between 1 and 120),
  donde       text check (char_length(donde) <= 80),
  pantalla    text check (char_length(pantalla) <= 20)
);

create index if not exists errores_app_creado on public.errores_app (creado desc);

alter table public.errores_app enable row level security;

-- Igual que user_feedback: el cliente solo inserta, y solo a su nombre. No
-- puede leer, editar ni borrar. Lucas y Martín los revisan desde Supabase.
revoke all on public.errores_app from public, anon, authenticated;
grant insert (plataforma, version, tipo, mensaje, donde, pantalla) on public.errores_app to authenticated;

drop policy if exists errores_app_insert_own on public.errores_app;
create policy errores_app_insert_own
on public.errores_app
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Un error dentro de un bucle, o alguien con la clave pública, no llena la
-- tabla: más de 30 en una hora para la misma cuenta se rechazan.
create or replace function public.errores_app_tope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.errores_app
      where user_id = new.user_id and creado > now() - interval '1 hour') >= 30 then
    raise exception 'demasiados errores en una hora';
  end if;
  return new;
end;
$$;

revoke all on function public.errores_app_tope() from public, anon, authenticated;

drop trigger if exists errores_app_tope on public.errores_app;
create trigger errores_app_tope
before insert on public.errores_app
for each row execute function public.errores_app_tope();

-- Para revisarlos (SQL Editor). Los más repetidos de la última semana:
--
--   select plataforma, version, tipo, mensaje, donde, pantalla,
--          count(*) as veces, count(distinct user_id) as personas,
--          max(creado) as ultimo
--   from public.errores_app
--   where creado > now() - interval '7 days'
--   group by 1, 2, 3, 4, 5, 6
--   order by veces desc;
