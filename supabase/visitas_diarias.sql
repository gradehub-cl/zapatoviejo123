-- Una visita por cuenta y por día (#666).
--
-- Los activos y los que vuelven se medían con las renovaciones de sesión de
-- Supabase (auth.refresh_tokens): cerrar sesión borra registros, y una pestaña
-- abierta renueva cada hora y cuenta como activa sin haberse usado. Esto anota
-- solo que la cuenta abrió la app ese día, nada más: ni qué hizo ni a qué hora.
--
-- - Nadie la lee desde la app: sin políticas y sin permisos de tabla. Se
--   escribe solo con registrar_visita(), que usa auth.uid() y la fecha de Chile.
-- - Se borra con la cuenta (ON DELETE CASCADE a auth.users).
-- - Se guarda 13 meses, para comparar un semestre con el mismo del año
--   anterior (decisión de Lucas, 2026-10-12). registrar_visita() borra lo más
--   viejo en cada llamada, así que no depende de una tarea programada.
-- - El equipo la ve agregada en admin.crecimiento_semanal, en el SQL Editor.
--
-- APLÍCALO a mano en el SQL Editor ANTES de mergear el PR que llama a
-- registrar_visita(). Se puede aplicar más de una vez.

begin;

create schema if not exists admin;

create table if not exists public.visitas_diarias (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia     date not null,
  primary key (user_id, dia)
);
create index if not exists visitas_diarias_dia_idx on public.visitas_diarias (dia);

alter table public.visitas_diarias enable row level security;
revoke all on public.visitas_diarias from public, anon, authenticated;

create or replace function public.registrar_visita()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Santiago')::date;
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.visitas_diarias (user_id, dia) values (auth.uid(), hoy)
  on conflict do nothing;
  delete from public.visitas_diarias where dia < (hoy - interval '13 months')::date;
end;
$$;
revoke all on function public.registrar_visita() from public, anon, authenticated;
grant execute on function public.registrar_visita() to authenticated;

-- Por semana (de lunes a domingo), en total ('todas') y por universidad:
--   nuevas       cuentas creadas esa semana
--   activas      cuentas que abrieron la app al menos un día de la semana
--   vuelven      activas esa semana que también lo estuvieron la anterior
--   pct_vuelven  vuelven / activas de la semana anterior
-- La universidad es la que la cuenta tiene hoy en user_ramos.
-- tipoCuenta ausente corresponde a estudiante (cuentas anteriores a #698).
create or replace view admin.crecimiento_semanal as
with activos as (
  select distinct date_trunc('week', dia)::date as semana, user_id
  from public.visitas_diarias
),
cuentas as (
  select u.id as user_id,
         date_trunc('week', u.created_at at time zone 'America/Santiago')::date as semana_alta,
         coalesce(nullif(r.data->>'tenant', ''), 'sin universidad') as universidad,
         case when r.data->>'tipoCuenta' = 'profesor' then 'profesor' else 'estudiante' end as tipo_cuenta
  from auth.users u
  left join public.user_ramos r on r.user_id = u.id
),
semanas as (
  select distinct semana from activos
),
base as (
  select s.semana, c.universidad, c.tipo_cuenta,
         c.semana_alta = s.semana as nueva,
         exists (select 1 from activos a where a.user_id = c.user_id and a.semana = s.semana) as activa,
         exists (select 1 from activos a where a.user_id = c.user_id and a.semana = s.semana - 7) as activa_antes
  from semanas s
  cross join cuentas c
)
select semana,
       case when grouping(universidad) = 1 then 'todas' else universidad end as universidad,
       count(*) filter (where nueva) as nuevas,
       count(*) filter (where activa) as activas,
       count(*) filter (where activa and activa_antes) as vuelven,
       round(100.0 * count(*) filter (where activa and activa_antes)
             / nullif(count(*) filter (where activa_antes), 0), 1) as pct_vuelven,
       count(*) filter (where nueva and tipo_cuenta='estudiante') as nuevas_estudiantes,
       count(*) filter (where nueva and tipo_cuenta='profesor') as nuevas_profesores,
       count(*) filter (where activa and tipo_cuenta='estudiante') as activas_estudiantes,
       count(*) filter (where activa and tipo_cuenta='profesor') as activas_profesores,
       count(*) filter (where activa and activa_antes and tipo_cuenta='estudiante') as vuelven_estudiantes,
       count(*) filter (where activa and activa_antes and tipo_cuenta='profesor') as vuelven_profesores,
       round(100.0 * count(*) filter (where activa and activa_antes and tipo_cuenta='estudiante')
             / nullif(count(*) filter (where activa_antes and tipo_cuenta='estudiante'), 0), 1) as pct_vuelven_estudiantes,
       round(100.0 * count(*) filter (where activa and activa_antes and tipo_cuenta='profesor')
             / nullif(count(*) filter (where activa_antes and tipo_cuenta='profesor'), 0), 1) as pct_vuelven_profesores
from base
group by grouping sets ((semana, universidad), (semana))
order by semana desc, grouping(universidad) desc, universidad;

revoke all on admin.crecimiento_semanal from public, anon, authenticated;

-- Solo cifras agregadas para el panel. La comprobación de MFA se hace aquí,
-- aunque alguien invoque esta RPC fuera de la interfaz.
create or replace function public.crecimiento_semanal_admin()
returns jsonb language plpgsql stable security definer set search_path = public, admin as $$
begin
  if not public.administrador_verificado() then
    raise exception 'administración requiere segundo factor' using errcode='42501';
  end if;
  return coalesce((select jsonb_agg(to_jsonb(f) order by f.semana desc)
    from (select * from admin.crecimiento_semanal
          where universidad='todas' order by semana desc limit 8) f),'[]'::jsonb);
end;
$$;
revoke all on function public.crecimiento_semanal_admin() from public, anon, authenticated;
grant execute on function public.crecimiento_semanal_admin() to authenticated;

commit;
