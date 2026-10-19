-- Resumen semanal por correo (pedido de Martín, 2026-10-14).
--
-- Cada lunes a las 12:00 UTC (9:00 en Chile en verano, 8:00 en invierno) llega
-- a cada cuenta de admin.administradores un correo con lo que pasó en la semana:
-- uso, errores de la app (errores_app), comentarios, pautas reportadas,
-- profesores por revisar y la salud de los datos guardados. Reemplaza "corre
-- esta consulta y pégame el JSON".
--
-- La salud de los datos (punto 11 de la misma conversación) recorre user_ramos y
-- cuenta formas que la app no debería guardar nunca: notas fuera de 1 a 7, notas
-- que no son número, ids de ramo repetidos, etc. Detecta un bug antes de que
-- alguien lo reporte. Solo cuenta: no lista cuentas, nombres ni notas.
--
-- APLICAR (una vez, a mano, en el SQL Editor):
--   1. Database → Extensions: activar pg_cron y pg_net.
--   2. En Resend, una API key con permiso solo de envío ("Sending access"), y
--      guardarla en Vault (nunca en el repo):
--        select vault.create_secret('re_…', 'resend_api_key');
--   3. Correr este archivo completo. Programa el envío de los lunes.
--   4. Probar sin esperar al lunes:
--        select admin.resumen_semanal_texto();      -- ver el texto, sin mandar
--        select admin.enviar_resumen_semanal();     -- mandarlo ahora
--      Si no llega: select * from net._http_response order by created desc limit 1;
--
-- PRIVACIDAD. Solo a las cuentas administradoras (sus correos salen de
-- auth.users, no del repo), desde hola@gradehub.cl vía Resend, igual que los
-- correos de Auth. Lleva conteos y lo que las personas le escribieron al equipo
-- (comentarios, notas de un reporte de pauta). Nunca notas, nombres ni correos.
--
-- Funciona aunque falte alguna tabla opcional (errores_app, visitas_diarias,
-- tutor_perfiles…): esa sección dice "sin datos" en vez de fallar.

create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

create or replace function admin.resumen_semanal_texto(p_hasta timestamptz default now())
returns text
language plpgsql
set search_path = ''
as $$
declare
  desde timestamptz := p_hasta - interval '7 days';
  t text := '';
  linea text;
  n bigint;
  n2 bigint;
begin
  t := 'GradeHub · semana del '
    || to_char((desde at time zone 'America/Santiago')::date, 'DD-MM')
    || ' al ' || to_char((p_hasta at time zone 'America/Santiago')::date, 'DD-MM-YYYY') || E'\n';

  -- ─── Uso ──────────────────────────────────────────────────────────────────
  select count(*) filter (where created_at >= desde and created_at < p_hasta), count(*)
    into n, n2 from auth.users;
  t := t || E'\nUSO\nCuentas nuevas: ' || n || ' (total ' || n2 || ')';
  if to_regclass('public.user_ramos') is not null then
    select string_agg(coalesce(tenant, 'sin universidad') || ' ' || c, ', ' order by c desc)
      into linea
      from (select u.data->>'tenant' as tenant, count(*) as c
              from auth.users a join public.user_ramos u on u.user_id = a.id
             where a.created_at >= desde and a.created_at < p_hasta
             group by 1) x;
    if linea is not null then t := t || ' · ' || linea; end if;
  end if;
  if to_regclass('public.visitas_diarias') is not null then
    select count(distinct user_id) filter (where dia >= (desde at time zone 'America/Santiago')::date),
           count(distinct user_id) filter (where dia < (desde at time zone 'America/Santiago')::date)
      into n, n2
      from public.visitas_diarias
     where dia >= ((desde - interval '7 days') at time zone 'America/Santiago')::date
       and dia < (p_hasta at time zone 'America/Santiago')::date + 1;
    t := t || E'\nEntraron esta semana: ' || n || ' (la anterior: ' || n2 || ')';
  end if;
  t := t || E'\n';

  -- ─── Errores de la app ───────────────────────────────────────────────────
  t := t || E'\nERRORES';
  if to_regclass('public.errores_app') is null then
    t := t || E'\nSin datos (falta supabase/errores_app.sql)\n';
  else
    select count(*), count(distinct user_id) into n, n2
      from public.errores_app where creado >= desde and creado < p_hasta;
    t := t || ' (' || n || ' en ' || n2 || ' cuentas)';
    for linea in
      select '  ' || count(*) || '× · ' || count(distinct e.user_id) || ' cuentas · '
          || case when not exists (
               select 1 from public.errores_app v
                where v.creado < desde and v.tipo = e.tipo and v.mensaje = e.mensaje
                  and v.donde is not distinct from e.donde) then 'NUEVO · ' else '' end
          || e.tipo || ': ' || e.mensaje
          || coalesce(' · ' || e.donde, '') || coalesce(' · ' || e.pantalla, '')
          || ' · ' || e.plataforma || coalesce(' ' || e.version, '')
        from public.errores_app e
       where e.creado >= desde and e.creado < p_hasta
       group by e.tipo, e.mensaje, e.donde, e.pantalla, e.plataforma, e.version
       order by count(*) desc, max(e.creado) desc
       limit 15
    loop t := t || E'\n' || linea; end loop;
    select string_agg(coalesce(version, '?') || ' ' || c, ', ' order by c desc) into linea
      from (select version, count(*) as c from public.errores_app
             where creado >= desde and creado < p_hasta group by 1) x;
    if linea is not null then t := t || E'\nPor versión: ' || linea; end if;
    t := t || E'\n';
  end if;

  -- ─── Comentarios ─────────────────────────────────────────────────────────
  t := t || E'\nCOMENTARIOS';
  if to_regclass('public.user_feedback') is null then
    t := t || E'\nSin datos\n';
  else
    select count(*) into n from public.user_feedback where created_at >= desde and created_at < p_hasta;
    t := t || ' (' || n || ')';
    for linea in
      select '  [' || categoria || coalesce(' · ' || universidad, '') || '] '
          || left(regexp_replace(mensaje, '\s+', ' ', 'g'), 400)
        from public.user_feedback
       where created_at >= desde and created_at < p_hasta
       order by created_at
       limit 30
    loop t := t || E'\n' || linea; end loop;
    if n > 30 then t := t || E'\n  … y ' || (n - 30) || ' más'; end if;
    t := t || E'\n';
  end if;

  -- ─── Pautas reportadas ───────────────────────────────────────────────────
  t := t || E'\nPAUTAS REPORTADAS';
  if to_regclass('public.catalog_reports') is null then
    t := t || E'\nSin datos\n';
  else
    select coalesce(sum(c), 0), string_agg(tenant || ' ' || c, ', ' order by c desc)
      into n, linea
      from (select tenant, count(*) as c from public.catalog_reports
             where updated_at >= desde and updated_at < p_hasta group by 1) x;
    t := t || E'\nReportes: ' || n || coalesce(' (' || linea || ')', '');
    -- Un grupo es la misma pauta (huella) del mismo ramo, como catalog_consensus.
    -- "Llegó" a 3 o 5 cuando ahora tiene esas personas y antes de la semana no.
    -- Es aproximado: quien vuelve a reportar mueve su updated_at a esta semana.
    for linea in
      with g as (
        select tenant, coalesce(nullif(ramo_sigla, ''), ramo_norm) as clave, huella, min(ramo) as ramo,
               count(distinct user_id) as ahora,
               count(distinct user_id) filter (where updated_at < desde) as antes
          from public.catalog_reports
         where updated_at < p_hasta
         group by 1, 2, 3
      )
      select '  Llegó a ' || umbral || ': ' || tenant || ' · ' || ramo || ' (' || ahora || ' personas)'
        from g cross join (values (3), (5)) as u(umbral)
       where ahora >= umbral and antes < umbral
       order by umbral desc, ahora desc
    loop t := t || E'\n' || linea; end loop;
    for linea in
      select '  Comentario · ' || tenant || ' · ' || ramo || ': ' || left(regexp_replace(nota, '\s+', ' ', 'g'), 300)
        from public.catalog_reports
       where updated_at >= desde and updated_at < p_hasta and nullif(btrim(nota), '') is not null
       order by updated_at
       limit 20
    loop t := t || E'\n' || linea; end loop;
    t := t || E'\n';
  end if;

  -- ─── Profesores: lo que espera una revisión del equipo ───────────────────
  if to_regclass('public.tutor_perfiles') is not null then
    select count(*) into n from public.tutor_perfiles where estado = 'pendiente';
    t := t || E'\nPROFESORES\nPostulaciones por revisar: ' || n;
    if to_regclass('public.tutor_anuncios') is not null then
      select count(*) into n from public.tutor_anuncios where estado = 'en_revision';
      t := t || ' · Anuncios por revisar: ' || n;
    end if;
    t := t || E'\n';
  end if;

  -- ─── Salud de los datos ──────────────────────────────────────────────────
  -- ⚠ = algo que la app no debería guardar nunca (un bug). Lo demás es contexto.
  if to_regclass('public.user_ramos') is not null then
    select count(*), coalesce(sum(case when jsonb_typeof(data->'ramos') = 'array' then jsonb_array_length(data->'ramos') else 0 end), 0)
      into n, n2 from public.user_ramos;
    t := t || E'\nSALUD DE LOS DATOS (' || n || ' cuentas, ' || n2 || ' ramos)';
    for linea in
      with cuentas as (
        select u.user_id, u.data from public.user_ramos u
      ), ramos as (
        select c.user_id, r.value as r
          from cuentas c
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(c.data->'ramos') = 'array' then c.data->'ramos' else '[]'::jsonb end) r
      ), cats as (
        select ramos.user_id, ramos.r, k.value as k
          from ramos
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(ramos.r->'categorias') = 'array' then ramos.r->'categorias' else '[]'::jsonb end) k
      ), notas as (
        select cats.user_id, cats.k, x.value as nota
          from cats
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(cats.k->'notas') = 'array' then cats.k->'notas' else '[]'::jsonb end) x
      ), chequeos(orden, bug, nombre, casos, cuentas) as (
        select 1, true, 'Cuentas sin lista de ramos',
               count(*), count(distinct user_id)
          from cuentas where jsonb_typeof(data) <> 'object' or jsonb_typeof(data->'ramos') <> 'array'
        union all
        select 2, true, 'Ramos sin lista de evaluaciones',
               count(*), count(distinct user_id)
          from ramos where jsonb_typeof(r->'categorias') is distinct from 'array'
        union all
        select 3, true, 'Evaluaciones sin lista de notas',
               count(*), count(distinct user_id)
          from cats where jsonb_typeof(k->'notas') is distinct from 'array'
        union all
        select 4, true, 'Notas que no son número',
               count(*), count(distinct user_id)
          from notas where jsonb_typeof(nota->'valor') not in ('number', 'null')
        union all
        select 5, true, 'Notas fuera de 1 a 7',
               count(*), count(distinct user_id)
          from notas where jsonb_typeof(nota->'valor') = 'number'
                       and ((nota->>'valor')::numeric < 1 or (nota->>'valor')::numeric > 7)
        union all
        select 6, true, 'Ramos con id repetido en la misma cuenta',
               coalesce(sum(c - 1), 0), count(distinct user_id)
          from (select user_id, r->>'id' as id, count(*) as c from ramos group by 1, 2 having count(*) > 1) d
        union all
        select 7, true, 'Casillas con dos notas',
               coalesce(sum(c - 1), 0), count(distinct user_id)
          from (select user_id, k->>'id' as cat, nota->>'slot' as slot, count(*) as c
                  from notas
                 where jsonb_typeof(nota->'slot') = 'number' and jsonb_typeof(nota->'valor') = 'number'
                 group by 1, 2, 3 having count(*) > 1) d
        union all
        select 8, false, 'Ramos con evaluaciones que no suman 100%',
               count(*), count(distinct user_id)
          from (select user_id, r from ramos
                 where jsonb_typeof(r->'categorias') = 'array' and jsonb_array_length(r->'categorias') > 0) x
         where abs(coalesce((select sum(case when jsonb_typeof(k->'peso') = 'number' then (k->>'peso')::numeric end)
                               from jsonb_array_elements(x.r->'categorias') k), 0) - 100) > 0.05
        union all
        -- "Filosofía: ñPara queñ" (#718): ¿ y ? que llegaron como ñ.
        select 9, false, 'Ramos con ñ en lugar de ¿ o ?',
               count(*), count(distinct user_id)
          from ramos where r->>'nombre' ~ '(^|[[:space:](])ñ|[[:alpha:]]ñ($|[[:space:]),:;.])'
        union all
        select 10, false, 'Ramos UC del catálogo sin créditos',
               count(*), count(distinct user_id)
          from ramos where r->'origen'->>'tenant' = 'uc' and jsonb_typeof(r->'creditos') is distinct from 'number'
      )
      select case when bug and casos > 0 then '  ⚠ ' else '    ' end
          || nombre || ': ' || casos || case when casos > 0 then ' (' || cuentas || ' cuentas)' else '' end
        from chequeos order by orden
    loop t := t || E'\n' || linea; end loop;
    t := t || E'\n';
  end if;

  return t;
end;
$$;

-- Manda el resumen a cada administrador. Devuelve el id de la petición de
-- pg_net, o null si falta la API key (y lo dice con un aviso, sin fallar).
create or replace function admin.enviar_resumen_semanal()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  clave text;
  para jsonb;
  texto text;
  id bigint;
begin
  select decrypted_secret into clave from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
  if clave is null then
    raise notice 'Falta la API key de Resend en Vault (resend_api_key): no se mandó el resumen.';
    return null;
  end if;
  select jsonb_agg(u.email order by u.email) into para
    from admin.administradores a join auth.users u on u.id = a.user_id
   where u.email is not null;
  if para is null then
    raise notice 'No hay cuentas en admin.administradores: no se mandó el resumen.';
    return null;
  end if;
  texto := admin.resumen_semanal_texto(now());
  select net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || clave, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'GradeHub <hola@gradehub.cl>',
      'to', para,
      'subject', 'GradeHub · resumen de la semana',
      'text', texto)
  ) into id;
  return id;
end;
$$;

revoke all on function admin.resumen_semanal_texto(timestamptz) from public, anon, authenticated;
revoke all on function admin.enviar_resumen_semanal() from public, anon, authenticated;

-- Los lunes a las 12:00 UTC. Volver a correr el archivo no duplica el trabajo:
-- cron.schedule con el mismo nombre lo actualiza.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('gradehub-resumen-semanal', '0 12 * * 1', 'select admin.enviar_resumen_semanal()');
  else
    raise notice 'pg_cron no está activo: el resumen no quedó programado (Database → Extensions).';
  end if;
end $$;
