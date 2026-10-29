-- #632 · Diferencias entre un programa y la pauta del catálogo.
-- Aplicar a mano en Supabase ANTES de publicar la app. Requiere
-- supabase/administradores.sql (lista admin.administradores y MFA).
-- Es aditivo: no modifica user_ramos, notas ni catalog_reports.
begin;

create table if not exists public.reportes_programa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant text not null check (tenant in ('uc','fen','uai','uandes')),
  carrera text check (carrera is null or char_length(carrera) between 1 and 100),
  ramo text not null check (char_length(btrim(ramo)) between 1 and 160),
  evaluacion text check (evaluacion is null or char_length(btrim(evaluacion)) between 1 and 100),
  descripcion text not null check (char_length(btrim(descripcion)) between 10 and 400),
  created_at timestamptz not null default now(),
  dia_utc date not null default (now() at time zone 'UTC')::date,
  constraint reportes_programa_uno_diario unique (user_id, dia_utc)
);
create index if not exists reportes_programa_recientes on public.reportes_programa(created_at desc);
alter table public.reportes_programa enable row level security;
revoke all on public.reportes_programa from public, anon, authenticated;
grant select on public.reportes_programa to authenticated;
drop policy if exists reportes_programa_select_own on public.reportes_programa;
create policy reportes_programa_select_own on public.reportes_programa
  for select to authenticated using (user_id = (select auth.uid()));

-- Sin INSERT directo: el servidor fija user_id y dia_utc y aplica el límite.
create or replace function public.enviar_reporte_programa(
  p_tenant text, p_carrera text, p_ramo text, p_evaluacion text, p_descripcion text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare nuevo_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Necesitas iniciar sesión' using errcode='42501';
  end if;
  if p_tenant not in ('uc','fen','uai','uandes') or p_tenant is null
    or char_length(btrim(coalesce(p_ramo,''))) not between 1 and 160
    or char_length(btrim(coalesce(p_descripcion,''))) not between 10 and 400
    or (p_carrera is not null and char_length(btrim(p_carrera)) not between 1 and 100)
    or (p_evaluacion is not null and char_length(btrim(p_evaluacion)) not between 1 and 100) then
    raise exception 'Revisa los datos del reporte' using errcode='22023';
  end if;
  insert into public.reportes_programa(user_id,tenant,carrera,ramo,evaluacion,descripcion)
  values(auth.uid(),p_tenant,btrim(p_carrera),btrim(p_ramo),btrim(p_evaluacion),btrim(p_descripcion))
  returning id into nuevo_id;
  return nuevo_id;
exception when unique_violation then
  raise exception 'Ya enviaste un reporte hoy. Puedes enviar otro mañana.' using errcode='23505';
end;
$$;
revoke all on function public.enviar_reporte_programa(text,text,text,text,text) from public, anon;
grant execute on function public.enviar_reporte_programa(text,text,text,text,text) to authenticated;

-- Solo una cuenta de la lista de administración con aal2 puede abrir la
-- bandeja. No entrega user_id ni correo; el texto queda fuera de la analítica.
create or replace function public.admin_reportes_programa()
returns jsonb
language plpgsql stable security definer set search_path = public, admin, pg_temp as $$
declare resultado jsonb;
begin
  if auth.uid() is null
    or coalesce(auth.jwt()->>'aal','') <> 'aal2'
    or not exists (select 1 from admin.administradores a where a.user_id=auth.uid()) then
    raise exception 'sin acceso' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb)
    into resultado
  from (
    select id, tenant, carrera, ramo, evaluacion, descripcion, created_at
    from public.reportes_programa order by created_at desc limit 50
  ) t;
  return resultado;
end;
$$;
revoke all on function public.admin_reportes_programa() from public, anon;
grant execute on function public.admin_reportes_programa() to authenticated;
commit;
