#!/usr/bin/env node
// Pruebas de auth y SQL contra el proyecto de PRUEBA de Supabase, con cuentas
// falsas que se crean y se borran en cada corrida. Las corre
// .github/workflows/prueba.yml en cada PR que toca supabase/ o app-session.js.
//
// Reemplaza lo que se hacía a mano con cuentas reales:
//   - supabase/prueba_aislamiento.sql (una cuenta no lee ni escribe lo de otra),
//   - "borrar una cuenta de prueba y mirar que no queden filas suyas",
//   - "probarlo con una cuenta real" del login y del cambio de contraseña (#729).
//
//   PRUEBA_SUPABASE_URL=… PRUEBA_PUBLISHABLE_KEY=… PRUEBA_SECRET_KEY=… node bin/prueba-e2e.js
//
// NUNCA corre contra producción: si la URL es la de app-session.js, se niega.
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');

function urlProduccion() {
  const fuente = fs.readFileSync(path.join(raiz, 'app-session.js'), 'utf8');
  return (fuente.match(/const SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
}
const mismoProyecto = (a, b) => !!a && !!b && a.replace(/\/+$/, '').toLowerCase() === b.replace(/\/+$/, '').toLowerCase();

// Las tablas con datos de una persona: las que el repo crea con una llave a
// auth.users, más las tres históricas que no tienen archivo. Son las que el
// borrado de cuenta tiene que dejar vacías (ON DELETE CASCADE, AGENTS.md).
function tablasDePersonas() {
  const pares = new Set(['user_ramos.user_id', 'profiles.id', 'catalog_reports.user_id']);
  const dir = path.join(raiz, 'supabase');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of sql.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/gi))
      for (const c of m[2].matchAll(/^\s*(\w+)\s+uuid[^,\n]*references auth\.users/gim)) pares.add(m[1] + '.' + c[1]);
  }
  return [...pares].map(p => { const [tabla, columna] = p.split('.'); return { tabla, columna }; });
}

async function correr({ url, pub, sec, createClient, log = console.log }) {
  let ok = 0, fail = 0;
  const chk = (n, c, detalle) => { log(`  ${c ? 'OK  ' : 'FAIL'} ${n}${!c && detalle ? ' — ' + detalle : ''}`); if (c) ok++; else fail++; };
  const op = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(url, sec, op);
  const nuevo = () => createClient(url, pub, op);
  const marca = Date.now().toString(36);
  const clave = () => 'Prueba' + Math.random().toString(36).slice(2, 10) + '7';
  const personas = [];

  async function persona(letra) {
    const email = `e2e-${marca}-${letra}@ejemplo.test`, password = clave();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`no se pudo crear la cuenta ${letra}: ${error.message}`);
    personas.push(data.user.id);
    const c = nuevo();
    const r = await c.auth.signInWithPassword({ email, password });
    if (r.error) throw new Error(`no entra la cuenta ${letra}: ${r.error.message}`);
    return { id: data.user.id, email, password, c };
  }

  try {
    log('\n=== Cuentas falsas ===');
    const A = await persona('a'), B = await persona('b');
    chk('se crean y entran con correo y contraseña', !!A.id && !!B.id);

    log('\n=== Aislamiento (prueba_aislamiento.sql) ===');
    const doc = rev => ({ tenant: 'fen', _rev: rev, ramos: [{ id: 'r1', nombre: 'Ramo Sintético', categorias: [] }] });
    let r = await A.c.from('user_ramos').upsert({ user_id: A.id, data: doc(1) }, { onConflict: 'user_id' });
    chk('A guarda sus ramos', !r.error, r.error && r.error.message);
    r = await B.c.from('user_ramos').upsert({ user_id: B.id, data: doc(1) }, { onConflict: 'user_id' });
    chk('B guarda los suyos', !r.error, r.error && r.error.message);
    r = await A.c.from('user_ramos').select('data').eq('user_id', A.id).maybeSingle();
    chk('control: A lee lo suyo', !r.error && r.data?.data?._rev === 1);
    r = await B.c.from('user_ramos').select('user_id').eq('user_id', A.id);
    chk('B no lee lo de A', !r.error && (r.data || []).length === 0);
    r = await B.c.from('user_ramos').update({ data: doc(99) }).eq('user_id', A.id).select('user_id');
    chk('B no escribe lo de A', !r.error && (r.data || []).length === 0);
    r = await B.c.from('user_ramos').delete().eq('user_id', A.id).select('user_id');
    chk('B no borra lo de A', !r.error && (r.data || []).length === 0);
    r = await B.c.from('user_ramos').insert({ user_id: A.id, data: doc(1) });
    chk('B no crea filas a nombre de A', !!r.error);
    r = await nuevo().from('user_ramos').select('user_id');
    chk('sin sesión no se lee nada', !r.error ? (r.data || []).length === 0 : true);

    log('\n=== Sincronización condicional (_rev, #531) ===');
    r = await A.c.from('user_ramos').update({ data: doc(2) }).eq('user_id', A.id).eq('data->>_rev', '1').select('user_id');
    chk('escribe si la nube sigue en la versión conocida', !r.error && (r.data || []).length === 1);
    r = await A.c.from('user_ramos').update({ data: doc(3) }).eq('user_id', A.id).eq('data->>_rev', '1').select('user_id');
    chk('no pisa si otro dispositivo escribió antes', !r.error && (r.data || []).length === 0);

    log('\n=== Perfil, comentarios y errores ===');
    r = await A.c.from('profiles').upsert({ id: A.id, universidad: 'U. de Chile · FEN' });
    chk('A guarda su perfil', !r.error, r.error && r.error.message);
    r = await B.c.from('profiles').select('id').eq('id', A.id);
    chk('B no lee el perfil de A', !r.error ? (r.data || []).length === 0 : true);
    r = await A.c.from('user_feedback').insert({ user_id: A.id, categoria: 'otro', mensaje: 'Comentario sintético de prueba' });
    chk('A manda un comentario', !r.error, r.error && r.error.message);
    r = await B.c.from('user_feedback').insert({ user_id: A.id, categoria: 'otro', mensaje: 'A nombre de otra cuenta' });
    chk('B no manda comentarios a nombre de A', !!r.error);
    r = await A.c.from('errores_app').insert({ plataforma: 'web', tipo: 'Error', mensaje: 'error sintético de prueba' });
    chk('A registra un error', !r.error, r.error && r.error.message);
    r = await A.c.from('errores_app').select('id');
    chk('nadie lee errores_app desde la app', !!r.error || (r.data || []).length === 0);

    log('\n=== Funciones ===');
    r = await nuevo().rpc('estadisticas_publicas');
    chk('estadisticas_publicas responde sin sesión', !r.error, r.error && r.error.message);
    r = await nuevo().rpc('catalog_consensus', { p_tenant: 'fen' });
    chk('catalog_consensus no responde sin sesión', !!r.error);
    r = await A.c.rpc('catalog_consensus', { p_tenant: 'fen' });
    chk('catalog_consensus responde con sesión', !r.error, r.error && r.error.message);

    log('\n=== Cambiar la contraseña (#729) ===');
    const nueva = clave();
    r = await A.c.auth.updateUser({ password: nueva });
    chk('se cambia estando dentro', !r.error, r.error && r.error.message);
    r = await nuevo().auth.signInWithPassword({ email: A.email, password: A.password });
    chk('la anterior ya no entra', !!r.error);
    r = await nuevo().auth.signInWithPassword({ email: A.email, password: nueva });
    chk('la nueva sí', !r.error, r.error && r.error.message);

    log('\n=== Borrar la cuenta no deja filas (ON DELETE CASCADE) ===');
    r = await A.c.rpc('eliminar_mi_cuenta');
    chk('eliminar_mi_cuenta funciona', !r.error, r.error && r.error.message);
    const borrada = await admin.auth.admin.getUserById(A.id);
    chk('la cuenta ya no existe', !!borrada.error || !borrada.data || !borrada.data.user);
    for (const { tabla, columna } of tablasDePersonas()) {
      const q = await admin.from(tabla).select(columna, { count: 'exact', head: true }).eq(columna, A.id);
      if (q.error && /PGRST205|does not exist|schema cache/i.test(q.error.message + q.error.code)) { log(`  --   ${tabla}: no existe en el proyecto de prueba`); continue; }
      chk(`${tabla} quedó sin filas de la cuenta`, !q.error && q.count === 0, q.error ? q.error.message : `${q.count} filas`);
    }
  } catch (e) {
    chk('la corrida terminó', false, e.message);
  } finally {
    for (const id of personas) await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  log(`\nPASS: ${ok}   FAIL: ${fail}`);
  return { ok, fail };
}

if (require.main === module) {
  const url = process.env.PRUEBA_SUPABASE_URL, pub = process.env.PRUEBA_PUBLISHABLE_KEY, sec = process.env.PRUEBA_SECRET_KEY;
  if (!url || !pub || !sec) {
    console.log('::notice::Falta configurar el proyecto de prueba de Supabase (environment supabase-prueba): no se corrieron las pruebas.');
    process.exit(0);
  }
  if (mismoProyecto(url, urlProduccion())) {
    console.error('PRUEBA_SUPABASE_URL es la de producción. Estas pruebas crean y borran cuentas: solo corren en el proyecto de prueba.');
    process.exit(1);
  }
  const { createClient } = require('@supabase/supabase-js');
  correr({ url, pub, sec, createClient }).then(({ fail }) => process.exit(fail ? 1 : 0))
    .catch(e => { console.error(e); process.exit(1); });
}

module.exports = { correr, tablasDePersonas, mismoProyecto, urlProduccion };
