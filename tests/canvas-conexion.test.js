// Canvas simulado + RPC reales en Postgres local. Ninguna cuenta/token real.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { webcrypto } = require('node:crypto'), { PGlite } = require('@electric-sql/pglite');
const leer = f => fs.readFileSync(__dirname + '/../' + f, 'utf8');
const A = '00000000-0000-0000-0000-000000000001', B = '00000000-0000-0000-0000-000000000002';
const JWT_A = 'eyJhbGciOiJIUzI1NiJ9.personaA.sintetico', JWT_B = 'eyJhbGciOiJIUzI1NiJ9.personaB.sintetico';
const TOKEN = '123~' + 'A'.repeat(24), OTRO = '456~' + 'B'.repeat(24);
const env = { CANVAS_TOKEN_KEY: Buffer.alloc(32, 37).toString('base64'), SUPABASE_SECRET_KEY: 'sb_secret_SOLO_FIXTURE_SINTETICO' };
const host = 'https://cursos.canvas.uc.cl';
const vence = () => new Date(Date.now() + 30 * 86400000).toISOString();
const json = (v, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
const req = (cuerpo = { token: TOKEN, vence: vence() }, { method = 'POST', jwt = JWT_A, headers = {}, url = 'https://gradehub.cl/canvas-conexion' } = {}) => new Request(url, {
  method, headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}), ...headers },
  ...(method === 'POST' ? { body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) } : {}),
});
(async () => {
  const db = new PGlite(), q = async (s, p = []) => (await db.query(s, p)).rows;
  const ctx = vm.createContext({ Response, Request, URL, Uint8Array, TextEncoder, TextDecoder, AbortController,
    setTimeout, clearTimeout, atob, btoa, crypto: webcrypto, fetch: () => { throw new Error('red prohibida'); } });
  vm.runInContext(leer('functions/canvas-conexion.js').replace(/^export /gm, ''), ctx);
  const fn = vm.runInContext('gestionarConexionCanvas', ctx), descifrar = vm.runInContext('descifrarTokenCanvas', ctx);
  const llave = await webcrypto.subtle.importKey('raw', Buffer.alloc(32, 37), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const fila = async (id = A) => (await q('select * from public.canvas_conexiones where user_id=$1', [id]))[0];
  const como = async (rol, usuario, sql, params = []) => {
    // Solo fixtures: en Supabase estos claims los establece la pasarela JWT.
    await q("select set_config('request.jwt.claim.sub',$1,false)", [usuario || '']);
    await db.exec('set role ' + rol);
    try { return await q(sql, params); } finally { await db.exec('reset role'); }
  };
  const funciones = {
    guardar_canvas_conexion: ['p_token_cifrado', 'p_iv', 'p_vence'], borrar_canvas_conexion: [],
    canvas_conexion_interna: ['p_user_id', 'p_token'], canvas_borrar_rechazada: ['p_user_id', 'p_iv'],
  };
  let llamadas, modo, authStatus, mutar;
  const reset = () => { llamadas = []; modo = 200; authStatus = 200; mutar = null; };
  const pedir = async (url, opt) => {
    llamadas.push({ url, opt });
    assert.equal(opt.redirect, 'manual', 'todas las solicitudes rechazan redirecciones');
    assert(opt.signal, 'Auth, RPC y Canvas tienen plazo');
    if (url.endsWith('/auth/v1/user')) {
      if (authStatus !== 200) return new Response(null, { status: authStatus });
      return json({ id: opt.headers.Authorization === 'Bearer ' + JWT_B ? B : A });
    }
    if (/^https:\/\/[a-z0-9]{20}\.supabase\.co\/rest\/v1\/rpc\//.test(url)) {
      const nombre = url.split('/').pop(), args = JSON.parse(opt.body);
      assert(Object.hasOwn(funciones, nombre));
      const interna = nombre === 'canvas_conexion_interna' || nombre === 'canvas_borrar_rechazada';
      if (interna) {
        assert.equal(opt.headers.apikey, env.SUPABASE_SECRET_KEY);
        assert(!opt.headers.Authorization, 'la clave no se trata como JWT');
      } else assert.equal(opt.headers.apikey, vm.runInContext('PUBLICABLE_PRODUCCION', ctx));
      const id = opt.headers.Authorization === 'Bearer ' + JWT_B ? B : A;
      const params = funciones[nombre].map(k => args[k] ?? null);
      const sql = `select public.${nombre}(${params.map((_, i) => '$' + (i + 1)).join(',')}) valor`;
      try { return json((await como(interna ? 'service_role' : 'authenticated', interna ? null : id, sql, params))[0].valor); }
      catch { return json({ message: 'error SQL sintético' }, 400); }
    }
    assert.equal(url, host + '/api/v1/users/self', 'único host y ruta de Canvas, sin parámetros');
    assert.equal(opt.method, 'GET');
    assert.equal(opt.headers.Authorization, 'Bearer ' + (modo === 'otro' ? OTRO : TOKEN));
    if (mutar) await mutar();
    if (modo === 'error') throw new Error('secreto que no debe salir: ' + TOKEN);
    if (modo === 'grande') return json({ id: 42, nombre: 'x'.repeat(70 * 1024) });
    if (modo === 'html') return new Response('<html>login</html>');
    if (modo === 'sinid') return json({ name: 'Persona sintética' });
    if (modo === 'lento') return new Response(new ReadableStream({ pull: () => new Promise(() => {}) }));
    if (modo === 302) return new Response(null, { status: 302, headers: { Location: 'https://otro.invalid/' } });
    return modo === 200 || modo === 'otro' ? json({ id: 42, name: 'No almacenar este nombre' }) : json({ secreto: TOKEN }, modo);
  };
  const ejecutar = (r = req(), e = env, f = pedir) => fn(r, e, f);
  const sinSecretos = async r => {
    const texto = await r.text();
    assert(!texto.includes(TOKEN) && !texto.includes(OTRO) && !texto.includes(env.CANVAS_TOKEN_KEY) && !texto.includes(env.SUPABASE_SECRET_KEY));
    const guardada = await fila(); if (guardada) assert(!texto.includes(guardada.token_cifrado));
    assert.equal(r.headers.get('Cache-Control'), 'no-store');
    return JSON.parse(texto);
  };
  try {
    await db.exec(leer('bin/supabase-stubs.sql'));
    await db.exec('create table public.user_ramos(user_id uuid references auth.users(id) on delete cascade, data jsonb);');
    await db.exec(leer('supabase/agente_mcp.sql'));
    await q('insert into auth.users(id) values($1),($2)', [A, B]);
    await q('insert into user_ramos values($1,$2::jsonb)', [A, JSON.stringify({ tenant: 'uc', ramos: [
      { id: 'ramo-sintetico', nombre: 'Ramo sintético', categorias: [
        { id: 'evaluacion', nombre: 'Evaluación sintética', notas: [{ id: 'nota', valor: 5.2 }] },
      ] },
    ], existente: true })]);
    const estadoAntes = await q('select * from user_ramos');
    await db.exec(leer('supabase/canvas_conexion.sql'));
    await db.exec(leer('supabase/canvas_conexion.sql'));
    const rls = (await q("select relrowsecurity from pg_class where oid='public.canvas_conexiones'::regclass"))[0];
    assert(rls.relrowsecurity);
    assert.equal((await q("select count(*)::int n from pg_policy where polrelid='public.canvas_conexiones'::regclass"))[0].n, 0);
    for (const rol of ['anon', 'authenticated', 'service_role']) {
      for (const permiso of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        assert.equal((await q("select has_table_privilege($1,'public.canvas_conexiones',$2) ok", [rol, permiso]))[0].ok, false);
      }
    }
    assert.equal(await fila(), undefined, 'instalación no crea conexiones de cuentas existentes');
    for (const rol of ['anon', 'authenticated']) {
      await assert.rejects(como(rol, A, 'select * from canvas_conexiones'), /permission denied/);
      await assert.rejects(como(rol, A, 'select canvas_conexion_interna($1,null)', [B]), /permission denied/);
      await assert.rejects(como(rol, A, 'select canvas_borrar_rechazada($1,$2)', [B, 'A'.repeat(16)]), /permission denied/);
    }
    await assert.rejects(como('anon', null, 'select borrar_canvas_conexion()'), /permission denied/);
    await assert.rejects(como('authenticated', null, 'select borrar_canvas_conexion()'), /sin sesión/);
    const scopes = await q("select prosecdef,proconfig from pg_proc where proname in ('guardar_canvas_conexion','borrar_canvas_conexion','canvas_conexion_interna','canvas_borrar_rechazada')");
    assert.equal(scopes.length, 4);
    assert(scopes.every(s => s.prosecdef && s.proconfig.includes('search_path=""')));
    console.log('PASS: reaplicación, RLS sin políticas/grants y RPC internas inaccesibles al cliente');

    reset(); let r = await ejecutar(req(undefined, { jwt: null }));
    assert.equal(r.status, 401); assert.equal(llamadas.length, 0);
    for (const status of [401, 403, 302]) {
      reset(); authStatus = status; r = await ejecutar(); assert.equal(r.status, 401); assert.equal(llamadas.length, 1);
    }
    reset(); r = await ejecutar(req(undefined, { method: 'GET' })); assert.equal(r.status, 405); assert.equal(llamadas.length, 0);
    for (const bad of [
      { token: TOKEN, vence: vence(), host: 'https://malicioso.invalid' },
      { token: TOKEN, vence: vence(), url: host + '/api/v1/courses' },
      { token: TOKEN, vence: vence(), ruta: '/api/v1/users/self' },
      { token: TOKEN, vence: vence(), user_id: B },
      { token: TOKEN + '\n', vence: vence() }, { token: 'no token', vence: vence() },
      { token: TOKEN, vence: new Date(Date.now() + 91 * 86400000).toISOString() },
      { token: TOKEN, vence: '2020-01-01' }, { token: TOKEN }, [], null, '{json inválido', 'x'.repeat(2100),
    ]) {
      reset(); r = await ejecutar(req(bad)); assert.equal(r.status, 400); assert.equal(llamadas.length, 1);
      await sinSecretos(r);
    }
    for (const headers of [{ Origin: 'https://malicioso.invalid' }, { 'Content-Type': 'text/plain' }]) {
      reset(); r = await ejecutar(req(undefined, { headers })); assert.equal(r.status, 400); assert(llamadas.length <= 1);
    }
    reset(); r = await ejecutar(req(undefined, { url: 'https://gradehub.cl/canvas-conexion?host=otro' }));
    assert.equal(r.status, 400); assert.equal(llamadas.length, 0);
    for (const e of [{}, { ...env, CANVAS_TOKEN_KEY: 'corta' }, { ...env, SUPABASE_SECRET_KEY: '' }]) {
      reset(); r = await ejecutar(req(), e); assert.equal(r.status, 503); assert.equal(llamadas.length, 1); await sinSecretos(r);
    }
    reset();
    r = await ejecutar(req(undefined, { url: 'https://preview.gradehub.pages.dev/canvas-conexion' }));
    assert.equal(r.status, 503); assert.equal(llamadas.length, 0, 'preview no toca Auth/SQL de producción');
    const aislado = { ...env, CANVAS_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', CANVAS_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_SINTETICA_AISLADA' };
    reset(); const llamadasAisladas = [];
    const pedirAislado = async (url, opt) => {
      llamadasAisladas.push(url);
      if (!url.startsWith(host)) {
        assert(url.startsWith(aislado.CANVAS_SUPABASE_URL));
        if (!url.endsWith('/rpc/canvas_conexion_interna')) assert.equal(opt.headers.apikey, aislado.CANVAS_SUPABASE_PUBLISHABLE_KEY);
        if (url.endsWith('/auth/v1/user')) return json({ id: B });
        if (url.endsWith('/rpc/canvas_conexion_interna')) return json(null);
        return json({ conectado: true, vence: vence() });
      }
      return json({ id: 42 });
    };
    r = await ejecutar(req(undefined, { url: 'https://preview.gradehub.pages.dev/canvas-conexion' }), aislado, pedirAislado);
    assert.equal(r.status, 200); assert.equal(llamadasAisladas.length, 4);
    console.log('PASS: JWT verificado, cuerpo acotado, host/ruta/persona inyectados rechazados y preview aislada de producción');

    reset(); const hasta = vence(); r = await ejecutar(req({ token: TOKEN, vence: hasta }));
    assert.equal(r.status, 200); assert.deepEqual(await sinSecretos(r), { conectado: true, vence: hasta });
    const primera = await fila(); assert(primera); assert.notEqual(primera.token_cifrado, TOKEN);
    assert.equal(await descifrar(primera, llave), TOKEN, 'cifrado real AES-GCM ida/vuelta');
    assert(!JSON.stringify(await q('select * from canvas_conexiones')).includes(TOKEN));
    reset(); r = await ejecutar(req({ token: TOKEN, vence: hasta })); assert.equal(r.status, 200);
    const segunda = await fila(); assert.notEqual(primera.iv, segunda.iv); assert.notEqual(primera.token_cifrado, segunda.token_cifrado);
    for (const cambio of [{ user_id: B }, { host: 'https://otro.invalid' }, { vence: new Date(Date.parse(hasta) + 1000).toISOString() },
      { token_cifrado: (segunda.token_cifrado[0] === 'B' ? 'C' : 'B') + segunda.token_cifrado.slice(1) },
      { iv: (segunda.iv[0] === 'B' ? 'C' : 'B') + segunda.iv.slice(1) }]) {
      await assert.rejects(descifrar({ ...segunda, ...cambio }, llave));
    }
    const otraLlave = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    await assert.rejects(descifrar(segunda, otraLlave));
    await assert.rejects(como('authenticated', A, 'select guardar_canvas_conexion($1,$2,$3)', ['plano', 'IV inválido', hasta]), /conexión inválida/);
    await assert.rejects(como('authenticated', A, 'select guardar_canvas_conexion($1,$2,now()+interval \'91 days\')', [segunda.token_cifrado, segunda.iv]), /conexión inválida/);
    console.log('PASS: AES-256-GCM real, IV aleatorio por guardado, AAD por persona/origen/vencimiento y manipulación rechazada');

    // Otra cuenta puede guardar/borrar solo lo suyo: la RPC no recibe user_id.
    reset(); r = await ejecutar(req(undefined, { jwt: JWT_B })); assert.equal(r.status, 200); assert(await fila(B));
    r = await ejecutar(req(undefined, { method: 'DELETE', jwt: JWT_B }), {}); assert.equal(r.status, 200);
    assert.equal(await fila(B), undefined); assert.equal((await fila()).iv, segunda.iv);
    assert.deepEqual(await sinSecretos(r), { conectado: false, vence: null });
    // El MCP resuelve al dueño de su token, únicamente desde el servidor.
    const mcpA = 'a'.repeat(64), mcpB = 'b'.repeat(64), mcpExp = 'e'.repeat(64);
    await q("insert into agent_links(user_id,token,expires_at) values($1,$2,now()+interval '1 day'),($3,$4,now()+interval '1 day'),($1,$5,now()-interval '1 day')", [A, mcpA, B, mcpB, mcpExp]);
    const interna = async args => (await como('service_role', null, 'select canvas_conexion_interna($1,$2) v', args))[0].v;
    assert.equal((await interna([null, mcpA])).user_id, A);
    assert.equal(await interna([null, mcpB]), null);
    assert.equal(await interna([null, mcpExp]), null);
    assert.equal(await interna([A, mcpA]), null);
    assert.equal(await interna([null, 'desconocido']), null);
    await q('delete from agent_links where token=$1', [mcpA]); assert.equal(await interna([null, mcpA]), null);
    console.log('PASS: cuenta nueva/existente, aislamiento A/B, desconexión sin llave y MCP vencido/revocado/ajeno');

    reset(); modo = 401; r = await ejecutar(); assert.equal(r.status, 401); assert.equal(await fila(), undefined);
    await sinSecretos(r);
    reset(); await ejecutar(); const valida = await fila();
    reset(); modo = 401;
    // Token entrante distinto y rechazado: no borra el anterior aún válido.
    const otroRechazado = async (url, opt) => url.startsWith(host) ? json({}, 401) : pedir(url, opt);
    r = await ejecutar(req({ token: OTRO, vence: vence() }), env, otroRechazado);
    assert.equal(r.status, 401); assert.equal((await fila()).iv, valida.iv);
    reset(); modo = 401;
    const renovada = await vm.runInContext('cifrarTokenCanvas', ctx)(OTRO, A, hasta, llave);
    mutar = async () => { await como('authenticated', A, 'select guardar_canvas_conexion($1,$2,$3)', [renovada.token_cifrado, renovada.iv, hasta]); };
    r = await ejecutar(); assert.equal(r.status, 401); assert.equal((await fila()).iv, renovada.iv, '401 tardío no borra una renovación');
    assert.equal(await descifrar(await fila(), llave), OTRO);
    reset(); await ejecutar();
    for (const tipo of [302, 403, 429, 500, 'grande', 'html', 'sinid', 'error']) {
      const antes = await fila(); reset(); modo = tipo; r = await ejecutar();
      assert(r.status >= 500, 'fallo del proveedor/configuración se degrada'); await sinSecretos(r);
      assert.equal((await fila()).iv, antes.iv, 'el fallo no escribe ni borra la conexión');
    }
    reset(); const rpcAusente = async (url, opt) => url.includes('/rest/v1/rpc/') ? json({ details: TOKEN }, 404) : pedir(url, opt);
    r = await ejecutar(req(), env, rpcAusente); assert.equal(r.status, 503); await sinSecretos(r);
    assert(!llamadas.some(c => c.url.startsWith(host)), 'sin SQL no envía el token a Canvas');
    reset();
    const antesDelFallo = await fila();
    const fallaGuardado = async (url, opt) => url.endsWith('/rpc/guardar_canvas_conexion') ? json({ details: TOKEN }, 500) : pedir(url, opt);
    r = await ejecutar(req(), env, fallaGuardado); assert.equal(r.status, 503); await sinSecretos(r);
    assert.equal((await fila()).iv, antesDelFallo.iv, 'fallar al guardar no pisa la conexión existente');
    console.log('PASS: 401 borra la versión rechazada; renovación/reemplazo inválido se protegen; redirects, tamaño, errores y SQL ausente');

    // Plazo incluso con un stream que queda pendiente, sin esperar ocho segundos.
    const timers = vm.createContext({ Response, Request, URL, Uint8Array, TextEncoder, TextDecoder, AbortController, atob, btoa, crypto: webcrypto,
      setTimeout: f => setTimeout(f, 20), clearTimeout });
    vm.runInContext(leer('functions/canvas-conexion.js').replace(/^export /gm, ''), timers);
    reset(); modo = 'lento';
    r = await vm.runInContext('gestionarConexionCanvas', timers)(req(), env, pedir);
    assert.equal(r.status, 504); await sinSecretos(r);
    await q('update canvas_conexiones set vence=now()-interval \'1 second\' where user_id=$1', [A]);
    assert.equal(await interna([A, null]), null); assert.equal(await fila(), undefined);
    reset(); ctx.fetch = pedir;
    r = await vm.runInContext('onRequest', ctx)({ request: req(), env });
    assert.equal(r.status, 200, 'entry point real de Pages conecta'); assert(await fila());
    assert.deepEqual(await q('select * from user_ramos'), estadoAntes, 'conectar, rechazar, renovar y desconectar no reescriben notas existentes');
    await q('delete from auth.users where id=$1', [A]); assert.equal(await fila(), undefined, 'borrar cuenta elimina conexión por FK real');
    assert.deepEqual(await q('select * from user_ramos'), [], 'el borrado de cuenta conserva la cascada de su estado académico');
    await db.exec(leer('supabase/canvas_conexion.sql'));
    assert.equal(await fila(), undefined, 'reaplicar no revive conexiones borradas');
    assert(/functions\/canvas-conexion\.js/.test(leer('.github/workflows/deploy.yml')));
    assert(!/console\.|waitUntil|passThroughOnException/.test(leer('functions/canvas-conexion.js')));

    console.log('PASS: límite de tiempo, vencimiento, borrado de cuenta, estado académico intacto y deploy declarado');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
