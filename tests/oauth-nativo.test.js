// Login con Google dentro de la app iOS (Capacitor). Antes, la página navegaba
// a Google: Capacitor la mandaba a Safari, la vista web quedaba congelada al
// cancelar y la vuelta a capacitor://localhost no llegaba a la app. Ahora se
// abre en una hoja de Safari, vuelve por cl.gradehub.app:// con un código PKCE
// y la web queda igual. Cliente y plugins falsos; ninguna cuenta real.
const fs = require('fs'), vm = require('vm'), path = require('path');
const raiz = path.join(__dirname, '..');
const src = ['data.js', 'engine.js', 'app.js', 'app-session.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

function app(nativa) {
  const ids = {}, oyentes = {}, llamadas = { oauth: [], abrir: [], cerrar: 0, canje: [], creado: null };
  const el = () => ({ style: { setProperty() {}, removeProperty() {} }, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, dataset: {}, value: '', innerHTML: '', textContent: '', disabled: false,
    addEventListener() {}, appendChild() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}, remove() {} });
  const cliente = { auth: {
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    async signInWithOAuth(args) { llamadas.oauth.push(args); return { data: { url: 'https://proyecto.supabase.co/auth/v1/authorize?provider=google&code_challenge=x' }, error: null }; },
    async exchangeCodeForSession(code) { llamadas.canje.push(code); return { data: { user: { id: 'u-sintetico' } }, error: null }; },
  } };
  const window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    supabase: { createClient: (u, k, o) => { llamadas.creado = o; return cliente; } } };
  if (nativa) window.Capacitor = { isNativePlatform: () => true, Plugins: {
    Browser: { async open(o) { llamadas.abrir.push(o); }, async close() { llamadas.cerrar++; }, addListener(e, f) { oyentes[e] = f; } },
    App: { addListener(e, f) { oyentes[e] = f; } } } };
  const location = { origin: nativa ? 'capacitor://localhost' : 'https://gradehub.cl', pathname: '/', search: '', hash: '', href: '' };
  const ctx = { window, document: { getElementById: id => ids[id] || (ids[id] = el()), createElement: el, addEventListener() {}, documentElement: el(), body: el(), querySelector: () => null, querySelectorAll: () => [] },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, location, history: { replaceState() {} }, setTimeout, clearTimeout, console, URL };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  vm.runInContext(`globalThis.__entradas=0;afterLogin=async()=>{__entradas++;};`, ctx);
  return { ctx, ids, oyentes, llamadas, location, run: c => vm.runInContext(c, ctx) };
}
const espera = () => new Promise(r => setTimeout(r, 0));

(async () => {
  console.log('\n=== En la app: Google en una hoja de Safari, sin mover la página ===');
  const a = app(true);
  chk('el cliente usa PKCE', a.llamadas.creado && a.llamadas.creado.auth.flowType === 'pkce');
  await a.run(`signInWithProvider('google')`);
  const o = a.llamadas.oauth[0];
  chk('pide la URL sin redirigir la página', o && o.options.skipBrowserRedirect === true && o.options.redirectTo === 'cl.gradehub.app://login-callback');
  chk('la abre en la hoja de Safari', a.llamadas.abrir.length === 1 && /authorize/.test(a.llamadas.abrir[0].url));
  chk('la página no se fue a ninguna parte', a.location.href === '');
  chk('mientras tanto el botón queda deshabilitado', a.ids['btn-google'].disabled === true);

  console.log('\n=== Cancelar no traba nada ===');
  a.oyentes.browserFinished();
  chk('cerrar la hoja reactiva el botón', a.ids['btn-google'].disabled === false);

  console.log('\n=== La vuelta con código abre la sesión ===');
  await a.run(`signInWithProvider('google')`);
  a.oyentes.appUrlOpen({ url: 'cl.gradehub.app://login-callback?code=codigo-sintetico' });
  await espera(); await espera();
  chk('canjea el código', a.llamadas.canje[0] === 'codigo-sintetico');
  chk('cierra la hoja y entra', a.llamadas.cerrar >= 1 && a.run('__entradas') === 1 && a.run('currentUser.id') === 'u-sintetico');
  chk('y el botón queda usable si vuelve al login', a.ids['btn-google'].disabled === false);

  console.log('\n=== Lo que no es la vuelta del login, o vuelve sin código ===');
  a.oyentes.appUrlOpen({ url: 'https://gradehub.cl/otra' }); await espera();
  chk('otro enlace se ignora', a.llamadas.canje.length === 1);
  a.oyentes.appUrlOpen({ url: 'cl.gradehub.app://login-callback?error=access_denied&error_description=cancelado' }); await espera(); await espera();
  chk('sin código no canjea ni entra, y lo dice', a.llamadas.canje.length === 1 && a.run('__entradas') === 1 && /No pudimos iniciar sesión con Google/.test(a.ids['auth-error'].textContent));

  console.log('\n=== La web queda igual ===');
  const w = app(false);
  chk('sin PKCE forzado', w.llamadas.creado === undefined);
  await w.run(`signInWithProvider('google')`);
  chk('vuelve a gradehub.cl y deja que Supabase redirija', w.llamadas.oauth[0].options.redirectTo === 'https://gradehub.cl/' && !w.llamadas.oauth[0].options.skipBrowserRedirect);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
