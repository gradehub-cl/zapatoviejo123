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
-- Cómo está armado: resumen_semanal_datos junta los números una sola vez en un
-- jsonb, y de ahí salen las dos versiones del correo: resumen_html (la que se
-- lee) y resumen_texto (la alternativa en texto plano que va en el mismo correo,
-- para clientes que no muestran HTML). Un dato nuevo se agrega en datos y se
-- muestra en las dos.
--
-- APLICAR (una vez, a mano, en el SQL Editor):
--   1. Database → Extensions: activar pg_cron y pg_net.
--   2. En Resend, una API key con permiso solo de envío ("Sending access"), y
--      guardarla en Vault (nunca en el repo):
--        select vault.create_secret('re_…', 'resend_api_key');
--   3. Correr este archivo completo. Programa el envío de los lunes.
--   4. Probar sin esperar al lunes:
--        select admin.resumen_semanal_texto();      -- ver el texto, sin mandar
--        select admin.resumen_html(admin.resumen_semanal_datos());  -- el HTML
--        select admin.enviar_resumen_semanal();     -- mandarlo ahora
--      Si no llega: select * from net._http_response order by created desc limit 1;
--      Para verlo en local con datos sintéticos: VER=1 node tests/resumen-semanal.test.js
--
-- PRIVACIDAD. Solo a las cuentas administradoras (sus correos salen de
-- auth.users, no del repo), desde hola@gradehub.cl vía Resend, igual que los
-- correos de Auth. Lleva conteos y lo que las personas le escribieron al equipo
-- (comentarios, notas de un reporte de pauta). Nunca notas, nombres ni correos.
-- Lo que escribió una persona se escapa antes de entrar al HTML.
--
-- Funciona aunque falte alguna tabla opcional (errores_app, visitas_diarias,
-- tutor_perfiles…): esa sección dice "sin datos" en vez de fallar.

create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

-- ─── Ayudas chicas para armar el correo ────────────────────────────────────
create or replace function admin.resumen_esc(s text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(coalesce(s, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- 1234 → "1.234"
create or replace function admin.resumen_num(n bigint) returns text
language sql immutable set search_path = '' as $$
  select replace(to_char(n, 'FM999,999,990'), ',', '.')
$$;

create or replace function admin.resumen_n(n bigint, uno text, varios text) returns text
language sql immutable set search_path = '' as $$
  select admin.resumen_num(n) || ' ' || case when n = 1 then uno else varios end
$$;

-- fen → FEN, uandes → UAndes
create or replace function admin.resumen_u(t text) returns text
language sql immutable set search_path = '' as $$
  select case lower(t) when 'uandes' then 'UAndes' when 'sin universidad' then t else upper(t) end
$$;

-- [{clave:'fen', c:2}, {clave:'uc', c:1}] → "fen 2, uc 1"
create or replace function admin.resumen_lista(a jsonb) returns text
language sql immutable set search_path = '' as $$
  select string_agg(coalesce(x->>'clave', '?') || ' ' || (x->>'c'), ', ' order by o)
    from jsonb_array_elements(coalesce(a, '[]')) with ordinality as e(x, o)
$$;

-- ─── Los números de la semana ──────────────────────────────────────────────
-- Una sección es null cuando falta su tabla.
create or replace function admin.resumen_semanal_datos(p_hasta timestamptz default now())
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  desde timestamptz := p_hasta - interval '7 days';
  d1 date := (desde at time zone 'America/Santiago')::date;
  d2 date := (p_hasta at time zone 'America/Santiago')::date;
  meses constant text[] := array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
                                  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  d jsonb;
  x jsonb;
begin
  d := jsonb_build_object('desde', d1, 'hasta', d2,
    -- "12 al 19 de octubre de 2026" · "28 de septiembre al 5 de octubre de 2026"
    'semana', extract(day from d1)::int
      || case when extract(month from d1) <> extract(month from d2)
              then ' de ' || meses[extract(month from d1)::int] else '' end
      || ' al ' || extract(day from d2)::int || ' de ' || meses[extract(month from d2)::int]
      || ' de ' || extract(year from d2)::int);

  -- ─── Uso ──────────────────────────────────────────────────────────────────
  select jsonb_build_object(
           'nuevas', count(*) filter (where created_at >= desde and created_at < p_hasta),
           'total', count(*))
    into x from auth.users;
  if to_regclass('public.user_ramos') is not null then
    x := x || jsonb_build_object('por_tenant', (
      select coalesce(jsonb_agg(jsonb_build_object('clave', tenant, 'c', c) order by c desc), '[]')
        from (select coalesce(u.data->>'tenant', 'sin universidad') as tenant, count(*) as c
                from auth.users a join public.user_ramos u on u.user_id = a.id
               where a.created_at >= desde and a.created_at < p_hasta
               group by 1) y));
  end if;
  if to_regclass('public.visitas_diarias') is not null then
    x := x || (select jsonb_build_object(
                 'entraron', count(distinct user_id) filter (where dia >= d1),
                 'entraron_antes', count(distinct user_id) filter (where dia < d1))
                 from public.visitas_diarias
                where dia >= ((desde - interval '7 days') at time zone 'America/Santiago')::date
                  and dia < d2 + 1);
  end if;
  d := d || jsonb_build_object('uso', x);

  -- ─── Errores de la app ───────────────────────────────────────────────────
  if to_regclass('public.errores_app') is not null then
    select jsonb_build_object('total', count(*), 'cuentas', count(distinct user_id))
      into x from public.errores_app where creado >= desde and creado < p_hasta;
    x := x || jsonb_build_object(
      'grupos', (select coalesce(jsonb_agg(to_jsonb(g) - 'ultimo' order by g.veces desc, g.ultimo desc), '[]') from (
        select count(*) as veces, count(distinct e.user_id) as cuentas, max(e.creado) as ultimo,
               not exists (
                 select 1 from public.errores_app v
                  where v.creado < desde and v.tipo = e.tipo and v.mensaje = e.mensaje
                    and v.donde is not distinct from e.donde) as nuevo,
               e.tipo, e.mensaje, e.donde, e.pantalla, e.plataforma, e.version
          from public.errores_app e
         where e.creado >= desde and e.creado < p_hasta
         group by e.tipo, e.mensaje, e.donde, e.pantalla, e.plataforma, e.version
         order by count(*) desc, max(e.creado) desc
         limit 15) g),
      'por_version', (select coalesce(jsonb_agg(jsonb_build_object('clave', version, 'c', c) order by c desc), '[]')
        from (select version, count(*) as c from public.errores_app
               where creado >= desde and creado < p_hasta group by 1) y));
    d := d || jsonb_build_object('errores', x);
  end if;

  -- ─── Comentarios ─────────────────────────────────────────────────────────
  if to_regclass('public.user_feedback') is not null then
    d := d || jsonb_build_object('comentarios', jsonb_build_object(
      'total', (select count(*) from public.user_feedback where created_at >= desde and created_at < p_hasta),
      'items', (select coalesce(jsonb_agg(to_jsonb(y) - 'created_at' order by y.created_at), '[]') from (
        select categoria, universidad, left(regexp_replace(mensaje, '\s+', ' ', 'g'), 400) as mensaje, created_at
          from public.user_feedback
         where created_at >= desde and created_at < p_hasta
         order by created_at
         limit 30) y)));
  end if;

  -- ─── Pautas reportadas ───────────────────────────────────────────────────
  if to_regclass('public.catalog_reports') is not null then
    d := d || jsonb_build_object('pautas', jsonb_build_object(
      'total', (select count(*) from public.catalog_reports where updated_at >= desde and updated_at < p_hasta),
      'por_tenant', (select coalesce(jsonb_agg(jsonb_build_object('clave', tenant, 'c', c) order by c desc), '[]')
        from (select tenant, count(*) as c from public.catalog_reports
               where updated_at >= desde and updated_at < p_hasta group by 1) y),
      -- Un grupo es la misma pauta (huella) del mismo ramo, como catalog_consensus.
      -- "Llegó" a 3 o 5 cuando ahora tiene esas personas y antes de la semana no.
      -- Es aproximado: quien vuelve a reportar mueve su updated_at a esta semana.
      'hitos', (select coalesce(jsonb_agg(to_jsonb(h) order by h.umbral desc, h.ahora desc), '[]') from (
        with g as (
          select tenant, coalesce(nullif(ramo_sigla, ''), ramo_norm) as clave, huella, min(ramo) as ramo,
                 count(distinct user_id) as ahora,
                 count(distinct user_id) filter (where updated_at < desde) as antes
            from public.catalog_reports
           where updated_at < p_hasta
           group by 1, 2, 3
        )
        select umbral, tenant, ramo, ahora
          from g cross join (values (3), (5)) as u(umbral)
         where ahora >= umbral and antes < umbral) h),
      'notas', (select coalesce(jsonb_agg(to_jsonb(y) - 'updated_at' order by y.updated_at), '[]') from (
        select tenant, ramo, left(regexp_replace(nota, '\s+', ' ', 'g'), 300) as nota, updated_at
          from public.catalog_reports
         where updated_at >= desde and updated_at < p_hasta and nullif(btrim(nota), '') is not null
         order by updated_at
         limit 20) y)));
  end if;

  -- ─── Profesores: lo que espera una revisión del equipo ───────────────────
  if to_regclass('public.tutor_perfiles') is not null then
    x := jsonb_build_object('postulaciones', (select count(*) from public.tutor_perfiles where estado = 'pendiente'));
    if to_regclass('public.tutor_anuncios') is not null then
      x := x || jsonb_build_object('anuncios', (select count(*) from public.tutor_anuncios where estado = 'en_revision'));
    end if;
    d := d || jsonb_build_object('profesores', x);
  end if;

  -- ─── Salud de los datos ──────────────────────────────────────────────────
  -- bug = algo que la app no debería guardar nunca. Lo demás es contexto.
  if to_regclass('public.user_ramos') is not null then
    select jsonb_build_object('cuentas', count(*), 'ramos', coalesce(sum(
             case when jsonb_typeof(data->'ramos') = 'array' then jsonb_array_length(data->'ramos') else 0 end), 0))
      into x from public.user_ramos;
    x := x || jsonb_build_object('chequeos', (
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
      select jsonb_agg(jsonb_build_object('nombre', nombre, 'bug', bug, 'casos', casos, 'cuentas', cuentas) order by orden)
        from chequeos));
    d := d || jsonb_build_object('salud', x);
  end if;

  return d;
end;
$$;

-- ─── Versión en texto plano ────────────────────────────────────────────────
create or replace function admin.resumen_texto(d jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  t text;
  s jsonb;
  e jsonb;
  n bigint;
begin
  t := 'GradeHub · semana del ' || to_char((d->>'desde')::date, 'DD-MM')
    || ' al ' || to_char((d->>'hasta')::date, 'DD-MM-YYYY') || E'\n';

  s := d->'uso';
  t := t || E'\nUSO\nCuentas nuevas: ' || (s->>'nuevas') || ' (total ' || (s->>'total') || ')'
    || coalesce(' · ' || admin.resumen_lista(s->'por_tenant'), '');
  if s ? 'entraron' then
    t := t || E'\nEntraron esta semana: ' || (s->>'entraron') || ' (la anterior: ' || (s->>'entraron_antes') || ')';
  end if;
  t := t || E'\n';

  t := t || E'\nERRORES';
  s := d->'errores';
  if s is null then
    t := t || E'\nSin datos (falta supabase/errores_app.sql)\n';
  else
    t := t || ' (' || (s->>'total') || ' en ' || (s->>'cuentas') || ' cuentas)';
    for e in select value from jsonb_array_elements(s->'grupos') loop
      t := t || format(E'\n  %s× · %s cuentas · %s%s: %s%s%s · %s%s',
        e->>'veces', e->>'cuentas', case when (e->>'nuevo')::boolean then 'NUEVO · ' end,
        e->>'tipo', e->>'mensaje', ' · ' || (e->>'donde'), ' · ' || (e->>'pantalla'),
        e->>'plataforma', ' ' || (e->>'version'));
    end loop;
    t := t || coalesce(E'\nPor versión: ' || admin.resumen_lista(s->'por_version'), '') || E'\n';
  end if;

  t := t || E'\nCOMENTARIOS';
  s := d->'comentarios';
  if s is null then
    t := t || E'\nSin datos\n';
  else
    t := t || ' (' || (s->>'total') || ')';
    for e in select value from jsonb_array_elements(s->'items') loop
      t := t || format(E'\n  [%s%s] %s', e->>'categoria', ' · ' || (e->>'universidad'), e->>'mensaje');
    end loop;
    n := (s->>'total')::bigint - jsonb_array_length(s->'items');
    if n > 0 then t := t || E'\n  … y ' || n || ' más'; end if;
    t := t || E'\n';
  end if;

  t := t || E'\nPAUTAS REPORTADAS';
  s := d->'pautas';
  if s is null then
    t := t || E'\nSin datos\n';
  else
    t := t || E'\nReportes: ' || (s->>'total') || coalesce(' (' || admin.resumen_lista(s->'por_tenant') || ')', '');
    for e in select value from jsonb_array_elements(s->'hitos') loop
      t := t || format(E'\n  Llegó a %s: %s · %s (%s personas)', e->>'umbral', e->>'tenant', e->>'ramo', e->>'ahora');
    end loop;
    for e in select value from jsonb_array_elements(s->'notas') loop
      t := t || format(E'\n  Comentario · %s · %s: %s', e->>'tenant', e->>'ramo', e->>'nota');
    end loop;
    t := t || E'\n';
  end if;

  s := d->'profesores';
  if s is not null then
    t := t || E'\nPROFESORES\nPostulaciones por revisar: ' || (s->>'postulaciones')
      || coalesce(' · Anuncios por revisar: ' || (s->>'anuncios'), '') || E'\n';
  end if;

  -- ⚠ = algo que la app no debería guardar nunca (un bug). Lo demás es contexto.
  s := d->'salud';
  if s is not null then
    t := t || E'\nSALUD DE LOS DATOS (' || (s->>'cuentas') || ' cuentas, ' || (s->>'ramos') || ' ramos)';
    for e in select value from jsonb_array_elements(s->'chequeos') loop
      t := t || E'\n'
        || case when (e->>'bug')::boolean and (e->>'casos')::numeric > 0 then '  ⚠ ' else '    ' end
        || (e->>'nombre') || ': ' || (e->>'casos')
        || case when (e->>'casos')::numeric > 0 then ' (' || (e->>'cuentas') || ' cuentas)' else '' end;
    end loop;
    t := t || E'\n';
  end if;

  return t;
end;
$$;

create or replace function admin.resumen_semanal_texto(p_hasta timestamptz default now())
returns text
language sql
set search_path = ''
as $$ select admin.resumen_texto(admin.resumen_semanal_datos(p_hasta)) $$;

-- ─── Versión HTML: la que se lee ───────────────────────────────────────────
-- Tablas y estilos inline porque así lo entienden Gmail, Outlook y el correo
-- del iPhone. Arriba lo que pide acción ("Para revisar"); el resto, por sección.
-- Los colores son los de la app: turquesa de marca, rojo y ámbar del semáforo
-- solo para lo que es un bug o algo nuevo.
create or replace function admin.resumen_html(d jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  h text := '';
  s jsonb;
  e jsonb;
  n bigint;
  bugs bigint;
  nuevos bigint;
  revisar text := '';
  linea text;
  fuente constant text := '-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif';
  tarjeta constant text := '<tr><td class="card" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:20px 22px">';
  fin constant text := '</td></tr><tr><td style="height:12px;font-size:0;line-height:0">&nbsp;</td></tr>';
  titulo constant text := '<h2 class="tx" style="margin:0 0 10px;font-size:17px;line-height:22px;font-weight:600;color:#1c1917">%s<span class="t3" style="font-weight:400;color:#78716c">%s</span></h2>';
  parrafo constant text := '<p class="t2" style="margin:0;font-size:15px;line-height:22px;color:#57534e">%s</p>';
  pie constant text := '<p class="t3" style="margin:12px 0 0;font-size:13px;line-height:18px;color:#78716c">%s</p>';
  tabla constant text := '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">';
  kpi constant text := '<td width="50%%" valign="top" style="padding:%s"><div class="card" style="background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;padding:14px 16px">'
    || '<div class="t2" style="font-size:13px;line-height:18px;color:#57534e">%s</div>'
    || '<div class="tx" style="font-size:30px;line-height:38px;font-weight:700;letter-spacing:-0.5px;color:#1c1917;font-variant-numeric:tabular-nums">%s</div>'
    || '<div class="t3" style="font-size:13px;line-height:18px;color:#78716c">%s</div></div></td>';
  -- punto de color · texto · número a la derecha
  fila constant text := '<tr><td valign="top" width="18" class="ln" style="padding:9px 0;border-top:1px solid #f0efee;color:%s;font-size:11px;line-height:22px">●</td>'
    || '<td valign="top" class="ln tx" style="padding:9px 0;border-top:1px solid #f0efee;font-size:15px;line-height:22px;color:#1c1917">%s</td>'
    || '<td valign="top" align="right" class="ln tx" style="padding:9px 0 9px 12px;border-top:1px solid #f0efee;font-size:15px;line-height:22px;font-weight:600;color:#1c1917;white-space:nowrap;font-variant-numeric:tabular-nums">%s</td></tr>';
  gris constant text := '<span class="t3" style="color:#78716c">%s</span>';
  cita constant text := '<div class="ln" style="border-left:3px solid #e7e5e4;padding:1px 0 1px 12px;margin:0 0 14px">'
    || '<div class="t3" style="font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#78716c">%s</div>'
    || '<div class="tx" style="margin-top:3px;font-size:15px;line-height:22px;color:#1c1917">%s</div></div>';
  rojo constant text := '#c02b3f';
  ambar constant text := '#96590a';
  marca constant text := '#0d7a6b';
  neutro constant text := '#a8a29e';
begin
  -- ─── Encabezado ──────────────────────────────────────────────────────────
  h := h || '<tr><td style="padding:0 4px 18px">'
    || '<div class="ac" style="font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:' || marca || '">GradeHub</div>'
    || '<h1 class="tx" style="margin:4px 0 0;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.4px;color:#1c1917">Resumen de la semana</h1>'
    || '<div class="t2" style="margin-top:4px;font-size:15px;line-height:20px;color:#57534e">' || admin.resumen_esc(d->>'semana') || '</div>'
    || '</td></tr>';

  -- ─── Los cuatro números ──────────────────────────────────────────────────
  s := d->'uso';
  n := (s->>'entraron')::bigint - (s->>'entraron_antes')::bigint;
  h := h || '<tr><td>' || tabla || '<tr>'
    || format(kpi, '0 6px 12px 0', 'Cuentas nuevas', admin.resumen_num((s->>'nuevas')::bigint),
              'de ' || admin.resumen_num((s->>'total')::bigint) || ' en total')
    || format(kpi, '0 0 12px 6px', 'Entraron', coalesce(admin.resumen_num((s->>'entraron')::bigint), '—'),
              case when n is null then 'sin datos'
                   when n > 0 then admin.resumen_num(n) || ' más que la anterior'
                   when n < 0 then admin.resumen_num(-n) || ' menos que la anterior'
                   else 'igual que la anterior' end)
    || '</tr><tr>'
    || format(kpi, '0 6px 12px 0', 'Errores', coalesce(admin.resumen_num((d->'errores'->>'total')::bigint), '—'),
              coalesce('en ' || admin.resumen_n((d->'errores'->>'cuentas')::bigint, 'cuenta', 'cuentas'), 'sin datos'))
    || format(kpi, '0 0 12px 6px', 'Comentarios', coalesce(admin.resumen_num((d->'comentarios'->>'total')::bigint), '—'),
              case when d ? 'comentarios' then 'desde la app' else 'sin datos' end)
    || '</tr></table></td></tr>';
  select string_agg(admin.resumen_u(x->>'clave') || ' ' || (x->>'c'), ' · ' order by o) into linea
    from jsonb_array_elements(coalesce(s->'por_tenant', '[]')) with ordinality as a(x, o);
  if linea is not null then
    h := h || '<tr><td style="padding:0 4px 14px">'
      || format(pie, 'Cuentas nuevas por universidad: ' || admin.resumen_esc(linea)) || '</td></tr>';
  end if;

  -- ─── Para revisar: lo que pide hacer algo, primero ───────────────────────
  select count(*) into bugs from jsonb_array_elements(coalesce(d->'salud'->'chequeos', '[]')) c
   where (c->>'bug')::boolean and (c->>'casos')::numeric > 0;
  select count(*) into nuevos from jsonb_array_elements(coalesce(d->'errores'->'grupos', '[]')) g
   where (g->>'nuevo')::boolean;
  if bugs > 0 then
    revisar := revisar || format(fila, rojo, 'Datos guardados que la app no debería guardar nunca', admin.resumen_n(bugs, 'chequeo', 'chequeos'));
  end if;
  if nuevos > 0 then
    revisar := revisar || format(fila, ambar, 'Errores que no habían pasado antes', admin.resumen_num(nuevos));
  end if;
  n := (d->'profesores'->>'postulaciones')::bigint;
  if n > 0 then revisar := revisar || format(fila, marca, 'Postulaciones de profesor por revisar', admin.resumen_num(n)); end if;
  n := (d->'profesores'->>'anuncios')::bigint;
  if n > 0 then revisar := revisar || format(fila, marca, 'Anuncios de profesor por revisar', admin.resumen_num(n)); end if;
  n := jsonb_array_length(coalesce(d->'pautas'->'hitos', '[]'));
  if n > 0 then revisar := revisar || format(fila, marca, 'Pautas que llegaron a 3 o 5 personas', admin.resumen_num(n)); end if;
  h := h || tarjeta || format(titulo, 'Para revisar', '')
    || case when revisar = ''
         then format(parrafo, '<span style="color:#0f766e;font-weight:700">✓</span> Semana tranquila: no hay nada que revisar.')
         else tabla || revisar || '</table>' end
    || fin;

  -- ─── Errores ─────────────────────────────────────────────────────────────
  s := d->'errores';
  h := h || tarjeta;
  if s is null then
    h := h || format(titulo, 'Errores', '') || format(parrafo, 'Sin datos: falta aplicar supabase/errores_app.sql.');
  elsif (s->>'total')::bigint = 0 then
    h := h || format(titulo, 'Errores', '') || format(parrafo, 'Ninguno esta semana.');
  else
    h := h || format(titulo, 'Errores', ' · ' || admin.resumen_num((s->>'total')::bigint)
                     || ' en ' || admin.resumen_n((s->>'cuentas')::bigint, 'cuenta', 'cuentas')) || tabla;
    for e in select value from jsonb_array_elements(s->'grupos') loop
      h := h || format('<tr><td valign="top" width="44" class="ln tx" style="padding:10px 0;border-top:1px solid #f0efee;font-size:15px;line-height:20px;font-weight:700;color:#1c1917;font-variant-numeric:tabular-nums">%s×</td>'
        || '<td valign="top" class="ln" style="padding:10px 0;border-top:1px solid #f0efee">'
        || '<div class="tx" style="font-size:14px;line-height:20px;color:#1c1917;word-break:break-word">%s<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px">%s</span></div>'
        || '<div class="t3" style="margin-top:2px;font-size:13px;line-height:18px;color:#78716c">%s</div></td></tr>',
        e->>'veces',
        case when (e->>'nuevo')::boolean
             then '<span style="display:inline-block;padding:0 7px;border-radius:999px;background:#fdf9e7;color:' || ambar
                  || ';font-size:11px;line-height:18px;font-weight:700;letter-spacing:0.3px">NUEVO</span> ' end,
        admin.resumen_esc(concat_ws(': ', e->>'tipo', e->>'mensaje')),
        admin.resumen_esc(concat_ws(' · ', admin.resumen_n((e->>'cuentas')::bigint, 'cuenta', 'cuentas'),
                                    e->>'donde', e->>'pantalla', nullif(concat_ws(' ', e->>'plataforma', e->>'version'), ''))));
    end loop;
    h := h || '</table>';
    linea := admin.resumen_lista(s->'por_version');
    if linea is not null then
      h := h || format(pie, 'Por versión: ' || admin.resumen_esc(replace(linea, ', ', ' · ')));
    end if;
  end if;
  h := h || fin;

  -- ─── Comentarios ─────────────────────────────────────────────────────────
  s := d->'comentarios';
  h := h || tarjeta;
  if s is null then
    h := h || format(titulo, 'Comentarios', '') || format(parrafo, 'Sin datos.');
  elsif (s->>'total')::bigint = 0 then
    h := h || format(titulo, 'Comentarios', '') || format(parrafo, 'Nadie escribió esta semana.');
  else
    h := h || format(titulo, 'Comentarios', ' · ' || admin.resumen_num((s->>'total')::bigint));
    for e in select value from jsonb_array_elements(s->'items') loop
      h := h || format(cita, admin.resumen_esc(concat_ws(' · ', e->>'categoria', admin.resumen_u(e->>'universidad'))),
                       admin.resumen_esc(e->>'mensaje'));
    end loop;
    n := (s->>'total')::bigint - jsonb_array_length(s->'items');
    if n > 0 then h := h || format(parrafo, '… y ' || admin.resumen_num(n) || ' más.'); end if;
  end if;
  h := h || fin;

  -- ─── Pautas reportadas ───────────────────────────────────────────────────
  s := d->'pautas';
  h := h || tarjeta;
  if s is null then
    h := h || format(titulo, 'Pautas reportadas', '') || format(parrafo, 'Sin datos.');
  else
    h := h || format(titulo, 'Pautas reportadas', ' · ' || admin.resumen_n((s->>'total')::bigint, 'reporte', 'reportes'));
    select string_agg(admin.resumen_u(x->>'clave') || ' ' || (x->>'c'), ' · ' order by o) into linea
      from jsonb_array_elements(s->'por_tenant') with ordinality as a(x, o);
    h := h || format(parrafo, coalesce('Por universidad: ' || admin.resumen_esc(linea), 'Nadie reportó una pauta esta semana.'));
    if jsonb_array_length(s->'hitos') > 0 then
      h := h || '<div style="height:10px"></div>' || tabla;
      for e in select value from jsonb_array_elements(s->'hitos') loop
        h := h || format(fila, marca,
          'Llegó a ' || (e->>'umbral') || ': ' || admin.resumen_esc(e->>'ramo') || ' ' || format(gris, '· ' || admin.resumen_esc(admin.resumen_u(e->>'tenant'))),
          admin.resumen_n((e->>'ahora')::bigint, 'persona', 'personas'));
      end loop;
      h := h || '</table>';
    end if;
    if jsonb_array_length(s->'notas') > 0 then
      h := h || '<div style="height:14px"></div>';
      for e in select value from jsonb_array_elements(s->'notas') loop
        h := h || format(cita, admin.resumen_esc(concat_ws(' · ', admin.resumen_u(e->>'tenant'), e->>'ramo')),
                         admin.resumen_esc(e->>'nota'));
      end loop;
    end if;
  end if;
  h := h || fin;

  -- ─── Profesores ──────────────────────────────────────────────────────────
  s := d->'profesores';
  if s is not null then
    h := h || tarjeta || format(titulo, 'Profesores', '') || tabla;
    n := (s->>'postulaciones')::bigint;
    h := h || format(fila, case when n > 0 then marca else neutro end, 'Postulaciones por revisar', admin.resumen_num(n));
    n := (s->>'anuncios')::bigint;
    if n is not null then
      h := h || format(fila, case when n > 0 then marca else neutro end, 'Anuncios por revisar', admin.resumen_num(n));
    end if;
    h := h || '</table>' || fin;
  end if;

  -- ─── Salud de los datos ──────────────────────────────────────────────────
  -- Primero lo que es bug, después el contexto. Lo que está en cero va en una
  -- sola línea: que se vea qué se revisó sin tener que leer diez ceros.
  s := d->'salud';
  if s is not null then
    h := h || tarjeta || format(titulo, 'Salud de los datos', ' · ' || admin.resumen_n((s->>'cuentas')::bigint, 'cuenta', 'cuentas')
                                || ', ' || admin.resumen_n((s->>'ramos')::bigint, 'ramo', 'ramos'));
    linea := '';
    for e in select c from jsonb_array_elements(s->'chequeos') with ordinality as a(c, o)
              where (c->>'casos')::numeric > 0
              order by not (c->>'bug')::boolean, o loop
      linea := linea || format(fila, case when (e->>'bug')::boolean then rojo else neutro end,
        admin.resumen_esc(e->>'nombre') || ' ' || format(gris, '· ' || admin.resumen_n((e->>'cuentas')::bigint, 'cuenta', 'cuentas')),
        admin.resumen_num((e->>'casos')::bigint));
    end loop;
    if linea <> '' then
      h := h || tabla || linea || '</table>'
        || format(pie, '<span style="color:' || rojo || '">●</span> la app no debería guardarlo nunca &nbsp; <span style="color:'
                       || neutro || '">●</span> contexto');
    end if;
    select string_agg(c->>'nombre', ', ' order by o) into linea
      from jsonb_array_elements(s->'chequeos') with ordinality as a(c, o)
     where (c->>'casos')::numeric = 0;
    if linea is not null then
      h := h || format(pie, '<span style="color:#0f766e;font-weight:700">✓</span> Sin casos: ' || admin.resumen_esc(linea) || '.');
    end if;
    h := h || fin;
  end if;

  -- ─── Pie ─────────────────────────────────────────────────────────────────
  h := h || '<tr><td style="padding:8px 16px 0;text-align:center">'
    || '<p class="t3" style="margin:0;font-size:12px;line-height:18px;color:#78716c">Llega cada lunes a las cuentas administradoras de GradeHub. '
    || 'Trae conteos y lo que la gente le escribió al equipo; nunca notas, nombres ni correos.</p></td></tr>';

  -- Lo que muestra la bandeja de entrada junto al asunto.
  linea := concat_ws(' · ',
    admin.resumen_n((d->'uso'->>'nuevas')::bigint, 'cuenta nueva', 'cuentas nuevas'),
    admin.resumen_n((d->'errores'->>'total')::bigint, 'error', 'errores'),
    admin.resumen_n((d->'comentarios'->>'total')::bigint, 'comentario', 'comentarios'),
    case when bugs > 0 then admin.resumen_n(bugs, 'alerta de datos', 'alertas de datos') end);

  return '<!doctype html><html lang="es"><head><meta charset="utf-8">'
    || '<meta name="viewport" content="width=device-width,initial-scale=1">'
    || '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">'
    || '<title>Resumen de la semana</title><style>'
    || '@media (prefers-color-scheme:dark){body,.bg{background:#0c0a09!important}'
    || '.card{background:#1c1917!important;border-color:#292524!important}.ln{border-color:#292524!important}'
    || '.tx{color:#f5f5f4!important}.t2{color:#d6d3d1!important}.t3{color:#a8a29e!important}.ac{color:#2dd4bf!important}}'
    || '</style></head>'
    || '<body class="bg" style="margin:0;padding:0;background:#f5f5f4;-webkit-text-size-adjust:100%">'
    || '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' || admin.resumen_esc(linea) || '</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#f5f5f4">'
    || '<tr><td align="center" style="padding:28px 12px 32px">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:' || fuente || '">'
    || h
    || '</table></td></tr></table></body></html>';
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
  d jsonb;
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
  d := admin.resumen_semanal_datos(now());
  select net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || clave, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'GradeHub <hola@gradehub.cl>',
      'to', para,
      'subject', 'GradeHub · semana del ' || (d->>'semana'),
      'html', admin.resumen_html(d),
      'text', admin.resumen_texto(d))
  ) into id;
  return id;
end;
$$;

revoke all on function admin.resumen_esc(text) from public, anon, authenticated;
revoke all on function admin.resumen_num(bigint) from public, anon, authenticated;
revoke all on function admin.resumen_n(bigint, text, text) from public, anon, authenticated;
revoke all on function admin.resumen_u(text) from public, anon, authenticated;
revoke all on function admin.resumen_lista(jsonb) from public, anon, authenticated;
revoke all on function admin.resumen_semanal_datos(timestamptz) from public, anon, authenticated;
revoke all on function admin.resumen_texto(jsonb) from public, anon, authenticated;
revoke all on function admin.resumen_html(jsonb) from public, anon, authenticated;
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
