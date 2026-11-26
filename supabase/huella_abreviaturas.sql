-- Huella del consenso: abreviaturas (2026-11-21).
--
-- "I1/I2/I3" con los pesos del programa contaba como una pauta distinta de
-- "Interrogación 1/2/3": 27 reportes UC confirmaban el catálogo y partían el
-- consenso. Ahora una i, p o c sola seguida de número es Interrogación, Prueba
-- o Control, y "lab" es Laboratorio. Igual que nombreHuella() en app.js.
--
-- Reaplicable. Solo redefine public.huella_catalogo (la misma definición que
-- supabase/catalog_consensus.sql; tests/huella-abreviaturas.test.js lo exige)
-- y recalcula la columna huella de los reportes que cambian. No toca
-- estructura, notas, fechas ni pautas de nadie. create or replace conserva
-- los permisos. Verifica después: md5(prosrc) de huella_catalogo.
begin;

create or replace function public.huella_catalogo(p_estructura jsonb)
returns text
language sql
stable
set search_path = public
as $$
  with items as (
    select
      (
        select string_agg(
          case when w ~ '^[a-z]{4,}$'
            then regexp_replace(regexp_replace(replace(w, 'zz', 'z'), 's$', ''), '([lrndjz])e$', '\1')
            else w end,
          ' ' order by i)
        from regexp_split_to_table(
          regexp_replace(
          regexp_replace(
          regexp_replace(
          regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(normalize(lower(e.valor->>'nombre'), NFD), '[\u0300-\u036f]', '', 'g'),
                '[[:space:]]+', ' ', 'g'),
              '([a-z])([0-9])', '\1 \2', 'g'),
            '([0-9])([a-z])', '\1 \2', 'g'),
          '(^| )i(?= [0-9])', '\1interrogacion', 'g'),
          '(^| )p(?= [0-9])', '\1prueba', 'g'),
          '(^| )c(?= [0-9])', '\1control', 'g'),
          '(^| )lab(?= |$)', '\1laboratorio', 'g'),
          ' ') with ordinality as t(w, i)
        where w <> '' and w not in ('de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en')
      ) as clave,
      (e.valor->>'peso')::numeric as peso,
      coalesce((e.valor->>'slots')::numeric, 1) as slots,
      coalesce((e.valor->>'min')::numeric, 0) as min,
      coalesce((e.valor->>'cap')::numeric, 0) as cap
    from jsonb_array_elements(p_estructura) as e(valor)
    where (e.valor->>'peso')::numeric > 0
  ), marcadas as (
    select items.*,
           substring(clave from '^(.+) [0-9]+$') as base,
           slots <= 1 and min = 0 and cap = 0 as agrupable
    from items
  ), series as (
    select base, count(*) as n, sum(peso) as total
    from marcadas
    where base is not null and agrupable
    group by base
    having count(*) >= 3 and max(peso) - min(peso) <= 0.011
  ), canon as (
    select clave, peso, slots, min, cap
    from marcadas as m
    where not (m.agrupable and exists (select 1 from series as s where s.base = m.base))
    union all
    -- 3 × 6,67 = 20,01 es el 20% repartido en tres: cada peso viene redondeado
    -- a dos decimales, así que la suma puede correrse hasta 0,005 por casilla.
    select base,
           case when abs(total - round(total)) <= 0.005 * n + 0.001 then round(total) else round(total, 2) end,
           n, 0, 0
    from series
  )
  select string_agg(fila, '|' order by fila collate "C")
  from (
    select clave || '~' || trim_scale(peso)::text || '~' || trim_scale(slots)::text || '~' ||
           trim_scale(min)::text || '~' || trim_scale(cap)::text as fila
    from canon
  ) as filas;
$$;

update public.catalog_reports
   set huella = coalesce(public.huella_catalogo(estructura), '')
 where huella is distinct from coalesce(public.huella_catalogo(estructura), '');

commit;
