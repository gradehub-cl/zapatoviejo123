-- Números públicos para la pantalla de login.
--
-- REAPLICABLE. Cloudflare Pages no ejecuta SQL: se aplica a mano
-- (docs/guia/desplegar.md). La firma de `estadisticas_publicas()` no cambia.
--
-- QUÉ ES. Quien llega a gradehub.cl sin cuenta ve un login y nada más. Una
-- línea del tipo "1.240 estudiantes ya llevan sus notas acá" responde "¿esto lo
-- usa alguien?" antes de pedirle una cuenta.
--
-- QUÉ EXPONE Y QUÉ NO. Solo agregados: cuántas cuentas hay, cuántas entraron
-- esta semana, cuántos ramos y notas hay guardados en total. No sale ningún
-- user_id, correo, nombre, ramo ni nota. La llama la clave publishable sin
-- sesión, así que cualquiera puede leerla — y cualquiera lee lo mismo.
--
-- `activas_7d` cuenta por `last_sign_in_at`, que Supabase actualiza solo al
-- iniciar sesión, no al refrescar un token: quien queda logueado semanas no se
-- cuenta. Es una cota inferior honesta, no el número real de gente que entra.
-- Por eso la pantalla muestra cuentas y notas, que sí son exactas.
--
-- SE PRECALCULA (2026-11-26). Contar recorre user_ramos entero: 314 ms de media
-- con 1.887 cuentas, en una función que cualquiera puede llamar sin sesión, y
-- el 26-11 se cortó 18 veces en el timeout de 3 s de anon (el login se quedaba
-- sin números). pg_cron lo calcula una vez por hora y la función pública lee
-- esa fila: los números pueden ir hasta una hora atrasados, y llamarla mil
-- veces ya no le cuesta nada a la base.

-- El conteo. Solo lo llama el refresco.
create or replace function public.estadisticas_publicas_calcular()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'cuentas',    (select count(*) from auth.users),
    'activas_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'ramos',      coalesce((select sum(jsonb_array_length(coalesce(u.data->'ramos', '[]'::jsonb))) from public.user_ramos u), 0),
    'notas',      coalesce((
      select count(*)
      from public.user_ramos u
      cross join lateral jsonb_array_elements(coalesce(u.data->'ramos', '[]'::jsonb)) r
      cross join lateral jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) c
      cross join lateral jsonb_array_elements(coalesce(c->'notas', '[]'::jsonb)) n
      where (n->>'valor') is not null
    ), 0)
  );
$$;

-- Una sola fila. Sin políticas y sin permisos: la única puerta es la función.
create table if not exists public.estadisticas_publicas_cache (
  id boolean primary key default true check (id),
  datos jsonb not null,
  actualizado_at timestamptz not null default now()
);
alter table public.estadisticas_publicas_cache enable row level security;
revoke all on table public.estadisticas_publicas_cache from public, anon, authenticated;

create or replace function public.estadisticas_publicas_refrescar()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.estadisticas_publicas_cache (id, datos, actualizado_at)
  values (true, public.estadisticas_publicas_calcular(), now())
  on conflict (id) do update set datos = excluded.datos, actualizado_at = excluded.actualizado_at;
$$;

create or replace function public.estadisticas_publicas()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select c.datos from public.estadisticas_publicas_cache c;
$$;

revoke all on function public.estadisticas_publicas_calcular() from public, anon, authenticated;
revoke all on function public.estadisticas_publicas_refrescar() from public, anon, authenticated;
revoke all on function public.estadisticas_publicas() from public;
grant execute on function public.estadisticas_publicas() to anon, authenticated;

-- Primera carga, para que al aplicar el archivo el login no quede sin números.
select public.estadisticas_publicas_refrescar();

-- Una vez por hora. Nombre estable: volver a aplicar actualiza el trabajo en
-- vez de duplicarlo.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('gradehub-estadisticas-publicas', '7 * * * *', 'select public.estadisticas_publicas_refrescar()');
  else
    raise notice 'pg_cron no está activo: los números del login no se van a refrescar (Database → Extensions).';
  end if;
end $$;
