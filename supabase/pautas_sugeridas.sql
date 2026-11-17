-- Pautas sugeridas con sección y profesor (2026-11-09, pedido de Lucas).
-- Aplicar manualmente después de consenso_periodo.sql, pauta_sugerida.sql y
-- profesores.sql. Reaplicable. No toca tablas ni datos: solo crea una función.
--
-- En un ramo no coordinado cada profesor arma su pauta. Para sugerir la que
-- calza, el cliente necesita los reportes agrupados por estructura, sección y
-- profesor. Esta función los entrega así, sin identificar a nadie:
--   · nunca user_id, comentario ni nota; solo estructura saneada y conteos;
--   · el profesor viaja como `profe` opaco (para agrupar) y, con nombre, solo
--     el que ya es público en esa sección (profesor_docente_publico: tres
--     cuentas que coinciden y no está en profesor_ocultos);
--   · `mio` dice si ese reporte es del mismo profesor o sección de quien pide.
-- El agrupamiento por pesos y nombres parecidos lo hace el cliente
-- (src/app/distribuciones-pauta.js), donde se prueba con casos concretos.
--
-- Mismos filtros que pauta_sugerida para elegir reportes, salvo dos cosas:
--   · se devuelven aunque haya consenso: en un ramo no coordinado el consenso
--     no se aplica solo y se ofrece junto a las demás distribuciones;
--   · una pauta oficial marcada `coordinado:false` no excluye los reportes.
begin;
create or replace function public.pautas_sugeridas(
  p_tenant text, p_periodo text, p_ramo_key text, p_seccion integer default null
)
returns table(estructura jsonb, huella text, respaldos integer, seccion integer,
  profe text, profesor text, mio boolean)
language sql stable security definer set search_path = '' as $$
  with solicitante as (
    select auth.uid() as id
    where auth.uid() is not null
      and p_periodo ~ '^[0-9]{4}-[12v]$'
      and length(trim(p_ramo_key)) between 1 and 160
      and (p_seccion is null or p_seccion between 1 and 999)
      and exists (
        select 1 from public.user_ramos s
        where s.user_id=auth.uid() and s.data->>'tenant'=p_tenant
          and s.data->>'tipoCuenta' is distinct from 'profesor'
      )
  ), candidatos as (
    select cr.id,cr.user_id,cr.estructura,cr.huella,cr.seccion,cr.ramo_norm,cr.updated_at
    from public.catalog_reports cr
    join public.user_ramos u on u.user_id=cr.user_id
    where exists (select 1 from solicitante)
      and cr.tenant=p_tenant and cr.periodo=p_periodo
      and (cr.ramo_sigla=p_ramo_key or (nullif(cr.ramo_sigla,'') is null and cr.ramo_norm=p_ramo_key))
      and u.data->>'onboardingDone'='true' and u.data->>'tenant'=cr.tenant
      and (cr.origen='explicito' or (
        case when jsonb_typeof(cr.estructura)='array' then jsonb_array_length(cr.estructura)>=2 else false end
        and not exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(cr.estructura)='array' then cr.estructura else '[]'::jsonb end) e
          where nullif(trim(e->>'nombre'),'') is null
            or case when jsonb_typeof(e->'peso')='number' then (e->>'peso')::numeric<=0 else true end
        )
      ))
      and not exists (
        select 1 from public.pautas_catalogo_registro p
        where p.tenant=cr.tenant and p.periodo in ('',cr.periodo)
          and (p.clave=p_ramo_key or p.clave=cr.ramo_sigla or p.nombre_norm=cr.ramo_norm)
          and p.definicion->>'coordinado' is distinct from 'false'
      )
  ), vigentes as (
    select distinct on (user_id) * from candidatos
    order by user_id,updated_at desc,id desc
  ), claves as (
    -- profesor_contexto guarda la clave del ramo normalizada: sigla, clave de
    -- origen o nombre. Se aceptan las dos formas que puede tener acá.
    select public.profesor_normalizar(p_ramo_key) as k
  ), mi_profe as (
    select a.nombre,a.ramo_clave from public.profesor_aportes a, solicitante s, claves c
    where a.user_id=s.id and a.tenant=p_tenant and a.periodo=p_periodo and a.ramo_clave=c.k
    order by (a.seccion=p_seccion) desc nulls last, a.seccion
    limit 1
  ), con_profe as (
    select v.*,a.nombre as aporte,coalesce(a.seccion,v.seccion) as seccion_final,c.k as ramo_clave
    from vigentes v cross join claves c
    left join lateral (
      select x.nombre,x.seccion from public.profesor_aportes x
      where x.user_id=v.user_id and x.tenant=p_tenant and x.periodo=p_periodo
        and x.ramo_clave in (c.k,public.profesor_normalizar(v.ramo_norm))
      order by (x.seccion=v.seccion) desc nulls last, x.seccion
      limit 1
    ) a on true
  ), validos as (
    select cp.*,filas.estructura as limpia,
      case when cp.seccion_final is not null and p_periodo ~ '^20[0-9]{2}-[12]$'
        then public.profesor_docente_publico(p_tenant,cp.ramo_clave,cp.seccion_final,p_periodo) end as publicado
    from con_profe cp
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
        from jsonb_array_elements(case when jsonb_typeof(cp.estructura)='array' then cp.estructura else '[]'::jsonb end)
          with ordinality as j(e,pos)
      ) f
      having count(*) between 2 and 30 and abs(sum(f.peso)-100)<0.05
        and bool_and(coalesce(length(f.nombre) between 1 and 120 and f.peso>0 and f.peso<=100,false)
          and (not (f.e ? 'slots') or coalesce(f.slots between 1 and 100 and f.slots=trunc(f.slots),false))
          and (not (f.e ? 'min') or coalesce(f.minimo between 1 and 7,false))
          and (not (f.e ? 'cap') or coalesce(f.tope between 1 and 7,false)))
    ) filas
    where nullif(cp.huella,'') is not null
  ), marcados as (
    select v.limpia,v.seccion_final,
      case when v.aporte is not null then left(md5(public.profesor_normalizar(v.aporte)),12) end as profe,
      -- El nombre público de la sección solo se muestra si no lo contradice lo
      -- que informó quien reportó.
      case when v.publicado is not null and (v.aporte is null or public.profesor_coinciden(v.publicado,v.aporte))
        then v.publicado end as profesor,
      coalesce((p_seccion is not null and v.seccion_final=p_seccion), false)
        or exists (select 1 from mi_profe m where v.aporte is not null
          and public.profesor_coinciden_en_ramo(p_tenant,m.ramo_clave,m.nombre,v.aporte)) as mio
    from validos v
  )
  select m.limpia,public.huella_catalogo(m.limpia),count(*)::int,m.seccion_final,m.profe,m.profesor,m.mio
  from marcados m
  group by m.limpia,m.seccion_final,m.profe,m.profesor,m.mio
  order by count(*) desc,public.huella_catalogo(m.limpia) collate "C",m.seccion_final nulls last
  limit 80;
$$;
revoke all on function public.pautas_sugeridas(text,text,text,integer) from public,anon;
grant execute on function public.pautas_sugeridas(text,text,text,integer) to authenticated;
commit;
