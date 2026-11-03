-- Aplicar después de pautas_banco.sql. Reaplicable; no cambia el motor ni pautas.
begin;
create table if not exists public.discrepancias_nota(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 tenant text not null check(tenant in('uc','fen','uai','uandes','udd')),
 sigla text not null check(length(sigla) between 1 and 160),
 periodo text not null check(periodo ~ '^[0-9]{4}-[12v]$'),
 huella text not null check(length(huella) between 1 and 4000),
 calculada numeric not null check(calculada between 1 and 7),
 oficial numeric not null check(oficial between 1 and 7),
 pauta_origen text not null check(pauta_origen in('oficial','editada')),
 created_at timestamptz not null default now(),
 check(abs(calculada-oficial)>=0.1)
);
-- La huella completa puede superar el máximo de una entrada btree.
-- Se conserva como evidencia; solo la clave de deduplicación usa SHA-256.
alter table public.discrepancias_nota add column if not exists huella_sha256 bytea;
update public.discrepancias_nota set huella_sha256=sha256(convert_to(huella,'UTF8')) where huella_sha256 is null;
alter table public.discrepancias_nota alter column huella_sha256 set not null;
create unique index if not exists discrepancias_nota_unica_huella on public.discrepancias_nota(user_id,tenant,sigla,periodo,huella_sha256);
-- Compatibilidad con la primera versión de esta PR, sin borrar discrepancias.
alter table public.discrepancias_nota drop constraint if exists discrepancias_nota_user_id_tenant_sigla_periodo_huella_key;
alter table public.discrepancias_nota enable row level security;
revoke all on public.discrepancias_nota from public,anon,authenticated;
grant select on public.discrepancias_nota to authenticated;
drop policy if exists discrepancias_admin_mfa on public.discrepancias_nota;
create policy discrepancias_admin_mfa on public.discrepancias_nota for select to authenticated using(public.pautas_admin_verificado());
create or replace function public.registrar_discrepancia_nota(p_tenant text,p_sigla text,p_periodo text,p_huella text,p_calculada numeric,p_oficial numeric,p_pauta_origen text)
returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); estado jsonb;
begin
 if uid is null then raise exception 'No hay sesión activa';end if;
 select data into estado from public.user_ramos where user_id=uid;
 if p_tenant is null or not coalesce(estado->>'tenant'=p_tenant,false) and not exists(
 select 1 from jsonb_array_elements(coalesce(estado->'historial','[]')) h,
 jsonb_array_elements(coalesce(h->'ramos','[]')) r where coalesce(r->'origen'->>'tenant',r->'cierre'->>'tenant')=p_tenant) then raise exception 'Universidad incompatible con la cuenta';end if;
 if p_tenant not in('uc','fen','uai','uandes','udd') or p_sigla is null or length(trim(p_sigla)) not between 1 and 160
 or p_periodo is null or p_periodo !~ '^[0-9]{4}-[12v]$' or p_huella is null or length(p_huella) not between 1 and 4000
 or p_calculada is null or p_calculada not between 1 and 7 or (p_oficial is not null and p_oficial not between 1 and 7)
 or p_pauta_origen is null or p_pauta_origen not in('oficial','editada') then raise exception 'Datos de discrepancia inválidos';end if;
 if p_oficial is null or abs(p_calculada-p_oficial)<0.1 then
  delete from public.discrepancias_nota where user_id=uid and tenant=p_tenant and sigla=p_sigla and periodo=p_periodo and huella=p_huella;
  return false;
 end if;
 insert into public.discrepancias_nota(user_id,tenant,sigla,periodo,huella,huella_sha256,calculada,oficial,pauta_origen)
 values(uid,p_tenant,p_sigla,p_periodo,p_huella,sha256(convert_to(p_huella,'UTF8')),p_calculada,p_oficial,p_pauta_origen)
 on conflict(user_id,tenant,sigla,periodo,huella_sha256) do update set calculada=excluded.calculada,oficial=excluded.oficial,pauta_origen=excluded.pauta_origen;
 return true;
end;
$$;
create or replace function public.admin_discrepancias_pauta(p_tenant text,p_sigla text,p_periodo text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
 perform admin.exigir_administrador();
 select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) into resultado from(
 select huella,calculada,oficial,pauta_origen,count(distinct user_id)::integer personas
 from public.discrepancias_nota where tenant=p_tenant and sigla=p_sigla and periodo=p_periodo
 group by huella,calculada,oficial,pauta_origen order by count(distinct user_id) desc,huella
 )v;
 return resultado;
end;
$$;
revoke all on function public.registrar_discrepancia_nota(text,text,text,text,numeric,numeric,text) from public,anon;
grant execute on function public.registrar_discrepancia_nota(text,text,text,text,numeric,numeric,text) to authenticated;
revoke all on function public.admin_discrepancias_pauta(text,text,text) from public,anon;
grant execute on function public.admin_discrepancias_pauta(text,text,text) to authenticated;
commit;
