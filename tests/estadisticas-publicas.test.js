// La línea "N estudiantes ya llevan sus notas acá" del login sale de una RPC
// pública. Pública quiere decir que la lee cualquiera sin sesión, así que solo
// puede devolver agregados: este test revienta si alguien le agrega una columna
// con datos de una persona, o si la pantalla la muestra con pocas cuentas.
const fs = require('fs');
const leer = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');
const sql = leer('supabase/estadisticas_publicas.sql'), app = leer('app-session.js'), html = leer('index.html');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const cuerpo = sql.slice(sql.indexOf('as $$'), sql.indexOf('$$;'));
// Ningún SELECT proyecta una fila o un campo: solo count(*) y sum(...).
const selects = cuerpo.replace(/--.*$/gm, '').match(/select\s+[^\n]+/g) || [];
chk('la RPC devuelve solo conteos (count/sum), nunca un campo', selects.length >= 4 && selects.every(s => /^select\s+(jsonb_build_object|count\(\*\)|sum\()/.test(s)) && !/user_id|email/.test(cuerpo));
chk('security definer + stable, y solo anon/authenticated pueden ejecutarla', /security definer/.test(sql) && /\bstable\b/.test(sql) && /grant execute on function public\.estadisticas_publicas\(\) to anon, authenticated/.test(sql));
chk('la app llama a esa RPC desde la pantalla de login', /rpc\('estadisticas_publicas'\)/.test(app) && /cargarEstadisticasPublicas\(\);/.test(app.slice(app.indexOf('function showAuthScreen'))));
chk('con pocas cuentas no se muestra nada', /MINIMO_CUENTAS_PARA_MOSTRAR=\d+/.test(app) && /data\.cuentas>=MINIMO_CUENTAS_PARA_MOSTRAR/.test(app));
chk('el elemento parte oculto', /<div class="auth-stats" id="auth-stats" hidden/.test(html));
// Y `hidden` tiene que ganarle al display de autor: si no, la banda vacía se ve
// mientras la RPC responde y para siempre cuando falla.
const css = leer('styles.css');
chk('oculto de verdad: hay una regla para [hidden]', /#screen-auth \.auth-stats\[hidden\]\{display:none;?\}/.test(css));
// En tres columnas las cifras volvieron a ser una banda encima del acceso y la
// tercera columna es una muestra real de Estadísticas. Por eso ya no existe una
// tarjeta de marketing que pueda quedar vacía; si reaparece, debe ocultarse con
// la banda igual que antes.
chk('sin números tampoco se muestra una tarjeta vacía que los enmarque',
  !/class="auth-proof"/.test(html) || /#screen-auth \.auth-proof:has\(\.auth-stats\[hidden\]\)\{display:none;?\}/.test(css));
// El esqueleto existe para que nada se mueva cuando llegan los datos: mismas
// tres fichas, mismo alto. Y si la consulta falla, la banda se esconde en vez
// de dejar los guiones puestos.
chk('la pantalla de login pinta el esqueleto antes de pedir los datos',
  /pintarEsqueletoEstadisticas\(\);\n  cargarEstadisticasPublicas\(\);/.test(app));
chk('el esqueleto trae las tres etiquetas', /ETIQUETAS_ESTADISTICAS=\['estudiantes','ramos','notas'\]/.test(app));
chk('si la consulta falla o no alcanza el mínimo, la banda se esconde',
  (app.match(/el\.hidden=true;el\.innerHTML='';/g)||[]).length >= 2);

// ─── SQL real: la función pública lee una fila precalculada ───
// Contar recorre todas las cuentas, y esta RPC la llama cualquiera sin sesión.
// Por eso el conteo lo hace pg_cron una vez por hora y la función solo lee.
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
(async () => {
  const db = new PGlite(), u = i => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
  await db.exec(leer('bin/supabase-stubs.sql'));
  await db.exec('alter table auth.users add column last_sign_in_at timestamptz;' +
    'create table public.user_ramos(user_id uuid primary key references auth.users(id) on delete cascade, data jsonb);');
  await db.exec(sql);
  await db.exec(sql); // se puede correr de nuevo
  const comoAnon = async () => {
    await db.exec('set role anon');
    const d = (await db.query('select public.estadisticas_publicas() as d')).rows[0].d;
    await db.exec('reset role');
    return d;
  };
  chk('recién aplicada ya responde (en cero, sin cuentas)', (await comoAnon()).cuentas === 0);
  for (const i of [1, 2]) {
    await db.query('insert into auth.users(id,email,last_sign_in_at) values($1,$2,now())', [u(i), `sintetico${i}@example.invalid`]);
    await db.query('insert into public.user_ramos values($1,$2)', [u(i), JSON.stringify({ ramos: [{ categorias: [{ notas: [{ valor: 5.5 }, { valor: null }] }] }] })]);
  }
  chk('sin refresco sigue mostrando lo anterior', (await comoAnon()).cuentas === 0);
  await db.exec('select public.estadisticas_publicas_refrescar(); select public.estadisticas_publicas_refrescar();');
  const d = await comoAnon();
  chk('tras el refresco cuenta cuentas, ramos y solo las notas con valor', d.cuentas === 2 && d.activas_7d === 2 && d.ramos === 2 && d.notas === 2);
  chk('refrescar no acumula filas', (await db.query('select count(*)::int n from public.estadisticas_publicas_cache')).rows[0].n === 1);
  await db.exec('set role anon');
  for (const s of ['select * from public.estadisticas_publicas_cache', 'select public.estadisticas_publicas_refrescar()', 'select public.estadisticas_publicas_calcular()'])
    await assert.rejects(db.query(s), /permission denied/);
  chk('sin sesión solo se entra por estadisticas_publicas: ni la tabla, ni el conteo, ni el refresco', true);

  console.log(`\n${ok} ok, ${fail} fail`);
  if (fail) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
