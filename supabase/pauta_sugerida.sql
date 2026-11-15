-- Aplicar manualmente después de consenso_periodo.sql. Reaplicable.
begin;
create or replace function public.pauta_sugerida(
  p_tenant text, p_periodo text, p_ramo_key text, p_seccion integer default null
)
returns table(estructura jsonb, huella text, respaldos integer)
language sql stable security definer set search_path = '' as $$
  with candidatos as (
    select cr.id,cr.user_id,cr.estructura,cr.huella,cr.seccion,cr.updated_at
    from public.catalog_reports cr
    join public.user_ramos u on u.user_id=cr.user_id
    where cr.tenant=p_tenant and cr.periodo=p_periodo
      and (cr.ramo_sigla=p_ramo_key or (nullif(cr.ramo_sigla,'') is null and cr.ramo_norm=p_ramo_key))
      and p_periodo ~ '^[0-9]{4}-[12v]$'
      and length(trim(p_ramo_key)) between 1 and 160
      and (p_seccion is null or p_seccion between 1 and 999)
      and auth.uid() is not null
      and exists (
        select 1 from public.user_ramos solicitante
        where solicitante.user_id=auth.uid()
          and solicitante.data->>'tenant'=p_tenant
          and solicitante.data->>'tipoCuenta' is distinct from 'profesor'
      )
      and u.data->>'onboardingDone'='true' and u.data->>'tenant'=cr.tenant
      and (cr.origen='explicito' or (
        case when jsonb_typeof(cr.estructura)='array' then jsonb_array_length(cr.estructura)>=2 else false end
        and not exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(cr.estructura)='array' then cr.estructura else '[]'::jsonb end) e
          where nullif(trim(e->>'nombre'),'') is null
            or case when jsonb_typeof(e->'peso')='number' then (e->>'peso')::numeric<=0 else true end
        )
      ))
      -- El consenso solo excluye el automático frente al programa. Para
      -- sugerir sobre un ramo vacío, también se excluye el reporte explícito.
      and not exists (
        select 1 from public.pautas_catalogo_registro p
        where p.tenant=cr.tenant and p.periodo in ('',cr.periodo)
          and (p.clave=p_ramo_key or p.clave=cr.ramo_sigla or p.nombre_norm=cr.ramo_norm)
      )
  ), vigentes as (
    select distinct on (user_id) * from candidatos
    where p_seccion is null or seccion is null or seccion=p_seccion
    order by user_id,updated_at desc,id desc
  ), ambiguos as (
    select 1 from vigentes where seccion is not null
    having count(distinct seccion)>1 and count(distinct huella)>1
  ), consenso as (
    select 1 from vigentes
    where p_seccion is not null or not exists (select 1 from ambiguos)
    group by vigentes.huella
    having count(*)>=3 and count(*)::numeric/(select count(*) from vigentes)>=0.60
  ), validos as (
    select v.user_id,v.huella,v.seccion,filas.estructura
    from vigentes v
    cross join lateral (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'nombre',f.nombre,'peso',f.peso,'slots',f.slots,'min',f.minimo,'cap',f.tope
      )) order by f.pos) as estructura
      from (
        select pos,
          case when jsonb_typeof(e->'nombre')='string'
            then trim(regexp_replace(regexp_replace(e->>'nombre',U&'[\0001-\0008\000B\000C\000E-\001F\007F-\009F\200B-\200F\202A-\202E\2066-\2069\FEFF]','','g'),'[[:space:]]+',' ','g'))
          end as nombre,
          case when jsonb_typeof(e->'peso')='number' then (e->>'peso')::numeric end as peso,
          case when jsonb_typeof(e->'slots')='number' then (e->>'slots')::numeric end as slots,
          case when jsonb_typeof(e->'min')='number' then (e->>'min')::numeric end as minimo,
          case when jsonb_typeof(e->'cap')='number' then (e->>'cap')::numeric end as tope,
          e
        from jsonb_array_elements(case when jsonb_typeof(v.estructura)='array' then v.estructura else '[]'::jsonb end)
          with ordinality as j(e,pos)
      ) f
      -- Mismos límites que submit_catalog_report_periodo. Las filas legadas
      -- se comprueban después de elegir el aporte vigente de cada persona.
      having count(*) between 2 and 30 and abs(sum(f.peso)-100)<0.05
        and bool_and(coalesce(length(f.nombre) between 1 and 120 and f.peso>0 and f.peso<=100,false)
          and (not (f.e ? 'slots') or coalesce(f.slots between 1 and 100 and f.slots=trunc(f.slots),false))
          and (not (f.e ? 'min') or coalesce(f.minimo between 1 and 7,false))
          and (not (f.e ? 'cap') or coalesce(f.tope between 1 and 7,false)))
    ) filas
    where nullif(v.huella,'') is not null
      and not exists (select 1 from consenso)
      and (p_seccion is not null or not exists (select 1 from ambiguos))
  ), elegibles as (
    select v.* from validos v
    where (p_seccion is not null and v.seccion=p_seccion)
       or (v.seccion is null
           and not exists (select 1 from validos propia where propia.seccion=p_seccion)
           and not exists (
             select 1 from (
               select distinct on (user_id) c.huella from candidatos c
               where c.seccion is not null order by user_id,updated_at desc,id desc
             ) otra where otra.huella is distinct from v.huella
           ))
  ), grupos as (
    select e.huella,count(*)::int n from elegibles e group by e.huella
  )
  select muestra.estructura,public.huella_catalogo(muestra.estructura),g.n
  from grupos g
  cross join lateral (
    select e.estructura from elegibles e where e.huella=g.huella
    group by e.estructura order by count(*) desc,e.estructura::text collate "C" limit 1
  ) muestra
  where g.n=(select max(n) from grupos)
  order by g.huella collate "C"
  limit 2;
$$;
revoke all on function public.pauta_sugerida(text,text,text,integer) from public,anon;
grant execute on function public.pauta_sugerida(text,text,text,integer) to authenticated;
commit;
