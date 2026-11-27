-- Consenso agregado de fechas y horas de evaluaciones.
--
-- REAPLICABLE. Cloudflare Pages no ejecuta migraciones SQL: se aplica a mano
-- (docs/guia/desplegar.md). La firma de `date_consensus(text)` no cambia.
--
-- La fuente es el blob privado de user_ramos, pero la función proyecta solo la
-- identidad del ramo/evaluación y fecha/hora. Nunca devuelve user_id, notas ni
-- candidatos bajo el umbral. Solo cuentan decisiones explícitas cuyo origen es
-- `usuario`: catálogo y consenso no pueden hacerse eco a sí mismos.
--
-- Umbral: 3 personas distintas, por separado para la fecha y para la hora
-- (era 5; Martín lo bajó a 3 el 2026-11-26 para que aparezca en más ramos).
--
-- SE PRECALCULA (2026-11-26). El cálculo descomprime el JSON de TODAS las
-- cuentas: ~730 ms con 1.887 cuentas, y crece con cada cuenta nueva. El día que
-- la Agenda empezó a pedirlo, cada sesión pagaba eso y en la hora punta 42
-- llamadas murieron en el timeout de 8 s. El resultado no depende de quién
-- pregunta, solo de la universidad, así que pg_cron lo calcula una vez cada 15
-- minutos para todas y `date_consensus` lee esa tabla (< 1 ms).
-- Consecuencia: una fecha recién acordada tarda hasta 15 minutos en sugerirse,
-- y una cuenta borrada deja de contar en el refresco siguiente. La tabla no
-- guarda user_id: solo lo mismo que la función ya devolvía.

create or replace function public.gradehub_consensus_norm(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(trim(coalesce(p_value, ''))), 'áéíóúüñ', 'aeiouun'),
    '[[:space:]]+', ' ', 'g'
  );
$$;

create table if not exists public.date_consensus_cache (
  tenant text not null,
  ramo_key text not null,
  categoria_key text not null,
  nota_key text,
  fecha text not null,
  fecha_respaldos integer not null,
  hora text,
  hora_respaldos integer,
  actualizado_at timestamptz not null default now()
);
create index if not exists date_consensus_cache_tenant on public.date_consensus_cache (tenant);
-- Sin políticas y sin permisos: la única puerta es `date_consensus`.
alter table public.date_consensus_cache enable row level security;
revoke all on table public.date_consensus_cache from public, anon, authenticated;

-- El cálculo de siempre, para todas las universidades de una pasada: `tenant`
-- es una llave más en cada agrupación y en cada cruce.
create or replace function public.date_consensus_calcular()
returns table (
  tenant text,
  ramo_key text,
  categoria_key text,
  nota_key text,
  fecha text,
  fecha_respaldos integer,
  hora text,
  hora_respaldos integer
)
language sql
stable
set search_path = ''
as $$
  with raw as (
    -- Fecha de la categoría completa.
    select
      u.user_id,
      nullif(r->'origen'->>'tenant', '') as tenant,
      nullif(r->'origen'->>'ramoKey', '') as ramo_key,
      public.gradehub_consensus_norm(c->>'nombre') as categoria_key,
      null::text as nota_key,
      nullif(c->>'fecha', '') as fecha,
      nullif(c->>'hora', '') as hora,
      c->>'fechaOrigen' as fecha_origen,
      c->>'horaOrigen' as hora_origen
    from public.user_ramos as u
    cross join lateral jsonb_array_elements(coalesce(u.data->'ramos', '[]'::jsonb)) as r
    cross join lateral jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) as c

    union all

    -- Fecha propia de una nota dentro de una categoría.
    select
      u.user_id,
      nullif(r->'origen'->>'tenant', '') as tenant,
      nullif(r->'origen'->>'ramoKey', '') as ramo_key,
      public.gradehub_consensus_norm(c->>'nombre') as categoria_key,
      public.gradehub_consensus_norm(n->>'nombre') as nota_key,
      nullif(n->>'fecha', '') as fecha,
      nullif(n->>'hora', '') as hora,
      n->>'fechaOrigen' as fecha_origen,
      n->>'horaOrigen' as hora_origen
    from public.user_ramos as u
    cross join lateral jsonb_array_elements(coalesce(u.data->'ramos', '[]'::jsonb)) as r
    cross join lateral jsonb_array_elements(coalesce(r->'categorias', '[]'::jsonb)) as c
    cross join lateral jsonb_array_elements(coalesce(c->'notas', '[]'::jsonb)) as n
  ),
  valid as (
    select *
    from raw
    where tenant is not null
      and ramo_key is not null
      and categoria_key <> ''
      and (nota_key is null or nota_key <> '')
      and fecha ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and to_char(to_date(fecha, 'YYYY-MM-DD'), 'YYYY-MM-DD') = fecha
      -- Las fechas se reaprenden por semestre. Se conserva algo de pasado para
      -- evaluaciones recién rendidas y cinco meses hacia delante para el curso.
      and to_date(fecha, 'YYYY-MM-DD') between current_date - 42 and current_date + 150
  ),
  date_votes as (
    select
      v.tenant,
      v.ramo_key,
      v.categoria_key,
      v.nota_key,
      v.fecha,
      count(distinct user_id)::integer as respaldos
    from valid as v
    where fecha_origen = 'usuario'
    group by v.tenant, v.ramo_key, v.categoria_key, v.nota_key, v.fecha
    having count(distinct user_id) >= 3
  ),
  date_top as (
    select tenant, ramo_key, categoria_key, nota_key, max(respaldos) as respaldos
    from date_votes
    group by tenant, ramo_key, categoria_key, nota_key
  ),
  date_winners as (
    -- Si dos fechas empatan en el mayor respaldo no se elige ninguna.
    select
      d.tenant,
      d.ramo_key,
      d.categoria_key,
      d.nota_key,
      min(d.fecha) as fecha,
      t.respaldos
    from date_votes as d
    join date_top as t
      on t.tenant = d.tenant
     and t.ramo_key = d.ramo_key
     and t.categoria_key = d.categoria_key
     and t.nota_key is not distinct from d.nota_key
     and t.respaldos = d.respaldos
    group by d.tenant, d.ramo_key, d.categoria_key, d.nota_key, t.respaldos
    having count(*) = 1
  ),
  hour_votes as (
    select
      v.tenant,
      v.ramo_key,
      v.categoria_key,
      v.nota_key,
      v.fecha,
      v.hora,
      count(distinct user_id)::integer as respaldos
    from valid as v
    join date_winners as d
      on d.tenant = v.tenant
     and d.ramo_key = v.ramo_key
     and d.categoria_key = v.categoria_key
     and d.nota_key is not distinct from v.nota_key
     and d.fecha = v.fecha
    where v.hora_origen = 'usuario'
      and v.hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    group by v.tenant, v.ramo_key, v.categoria_key, v.nota_key, v.fecha, v.hora
    having count(distinct user_id) >= 3
  ),
  hour_top as (
    select tenant, ramo_key, categoria_key, nota_key, fecha, max(respaldos) as respaldos
    from hour_votes
    group by tenant, ramo_key, categoria_key, nota_key, fecha
  ),
  hour_winners as (
    -- La hora tiene su propio umbral y su propio empate. Una fecha puede ganar
    -- aunque todavía no exista una hora compartida.
    select
      h.tenant,
      h.ramo_key,
      h.categoria_key,
      h.nota_key,
      h.fecha,
      min(h.hora) as hora,
      t.respaldos
    from hour_votes as h
    join hour_top as t
      on t.tenant = h.tenant
     and t.ramo_key = h.ramo_key
     and t.categoria_key = h.categoria_key
     and t.nota_key is not distinct from h.nota_key
     and t.fecha = h.fecha
     and t.respaldos = h.respaldos
    group by h.tenant, h.ramo_key, h.categoria_key, h.nota_key, h.fecha, t.respaldos
    having count(*) = 1
  )
  select
    d.tenant,
    d.ramo_key,
    d.categoria_key,
    d.nota_key,
    d.fecha,
    d.respaldos as fecha_respaldos,
    h.hora,
    h.respaldos as hora_respaldos
  from date_winners as d
  left join hour_winners as h
    on h.tenant = d.tenant
   and h.ramo_key = d.ramo_key
   and h.categoria_key = d.categoria_key
   and h.nota_key is not distinct from d.nota_key
   and h.fecha = d.fecha;
$$;

-- Reemplaza la tabla entera. El candado deja leer mientras tanto (quien lee ve
-- la versión anterior hasta el commit) y evita que dos refrescos a la vez dejen
-- filas duplicadas.
create or replace function public.date_consensus_refrescar()
returns void
language sql
security definer
set search_path = ''
as $$
  lock table public.date_consensus_cache in exclusive mode;
  delete from public.date_consensus_cache where true;
  insert into public.date_consensus_cache
    (tenant, ramo_key, categoria_key, nota_key, fecha, fecha_respaldos, hora, hora_respaldos)
  select c.tenant, c.ramo_key, c.categoria_key, c.nota_key, c.fecha, c.fecha_respaldos, c.hora, c.hora_respaldos
  from public.date_consensus_calcular() as c;
$$;

create or replace function public.date_consensus(p_tenant text)
returns table (
  ramo_key text,
  categoria_key text,
  nota_key text,
  fecha text,
  fecha_respaldos integer,
  hora text,
  hora_respaldos integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.ramo_key, c.categoria_key, c.nota_key, c.fecha, c.fecha_respaldos, c.hora, c.hora_respaldos
  from public.date_consensus_cache as c
  where auth.uid() is not null
    and c.tenant = p_tenant
    -- Si el refresco deja de correr, la sugerencia se apaga sola en vez de
    -- seguir mostrando lo que los compañeros tenían hace días.
    and c.actualizado_at > now() - interval '1 day'
  order by c.ramo_key, c.categoria_key, c.nota_key;
$$;

revoke all on function public.gradehub_consensus_norm(text) from public, anon, authenticated;
revoke all on function public.date_consensus_calcular() from public, anon, authenticated;
revoke all on function public.date_consensus_refrescar() from public, anon, authenticated;
revoke all on function public.date_consensus(text) from public, anon;
grant execute on function public.date_consensus(text) to authenticated;

-- Primera carga, para que al aplicar el archivo no quede un rato sin sugerencias.
select public.date_consensus_refrescar();

-- Cada 15 minutos. Nombre estable: volver a aplicar actualiza el trabajo en vez
-- de duplicarlo.
-- ponytail: cron.job_run_details suma ~96 filas al día por este trabajo; si
-- algún día pesa, borrar las de más de una semana.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('gradehub-fechas-compartidas', '*/15 * * * *', 'select public.date_consensus_refrescar()');
  else
    raise notice 'pg_cron no está activo: las fechas de compañeros no se van a refrescar (Database → Extensions).';
  end if;
end $$;
