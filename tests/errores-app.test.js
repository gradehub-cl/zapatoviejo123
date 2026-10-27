// Saber cuándo algo se cae (pedido de Martín, 2026-10-09): los errores de
// JavaScript que nadie atrapó se guardan en errores_app, saneados.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const sesion = leer('app-session.js'), sql = leer('supabase/errores_app.sql'), preparar = leer('bin/preparar-ios.sh');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const bloque = sesion.slice(sesion.indexOf('function detalleErrorSeguro('), sesion.indexOf("if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){\n  window.addEventListener('error'"));
// `track` vive en app.js: el arnés representa una app que cargó entera, salvo
// cuando el caso es justamente que app.js no llegó (`conAppJs: false`).
const arnes = ({ usuario = { id: 'u1', email: 'ana@ejemplo.test' }, nativa = true, conAppJs = true, estado } = {}) => {
  const enviados = [];
  const ctx = {
    APP_NATIVA: nativa, currentUser: usuario, currentTab: 'home',
    ...(conAppJs ? { track() {} } : {}),
    S: estado || { userName: 'Ana Pérez', ramos: [{ nombre: 'Introducción a la Microeconomía' }] },
    supabaseClient: { from: t => ({ insert: fila => { enviados.push({ t, ...fila }); return Promise.resolve({}); } }) },
    document: { querySelector: s => s.startsWith('script') ? { src: 'capacitor://localhost/app-session.js?v=abc1234' } : s === '.screen.active' ? { id: 'screen-ramo' } : null },
  };
  vm.createContext(ctx); vm.runInContext(bloque, ctx);
  return { ctx, enviados, run: c => vm.runInContext(c, ctx) };
};

console.log('\n=== Qué se guarda ===');
const a = arnes();
a.run(`reportarError(new TypeError("No se pudo dibujar Introducción a la Microeconomía de Ana Pérez (ana@ejemplo.test) con nota 5.5"), "app.js:120:4")`);
const e = a.enviados[0] || {};
chk('se guarda en errores_app', e.t === 'errores_app');
chk('sin nombres de ramos, personas, correos ni números', !/Microeconom|Ana|ejemplo|5\.5/.test(e.mensaje || '') && /\[dato\]/.test(e.mensaje || ''));
chk('con tipo, archivo y línea, pantalla, plataforma y versión',
  e.tipo === 'TypeError' && e.donde === 'app.js:120:4' && e.pantalla === 'ramo' && e.plataforma === 'app' && e.version === 'abc1234');
chk('en la web dice web', (() => { const w = arnes({ nativa: false }); w.run('reportarError(new Error("x falla"),"a.js:1")'); return w.enviados[0].plataforma === 'web'; })());
chk('dondeDelError deja solo el archivo, sin la ruta del dispositivo', a.run(`dondeDelError("capacitor://localhost/ruta/larga/app.js?v=abc",12,3)`) === 'app.js:12:3');

console.log('\n=== Qué no se guarda ===');
const sin = arnes({ usuario: null }); sin.run('reportarError(new Error("falla"),"a.js:1")');
chk('sin sesión no se envía (la tabla exige cuenta)', sin.enviados.length === 0);
const rep = arnes(); rep.run('reportarError(new Error("igual"),"a.js:1");reportarError(new Error("igual"),"a.js:1")');
chk('el mismo error no se repite en una visita', rep.enviados.length === 1);
const tope = arnes(); tope.run('for(let i=0;i<9;i++)reportarError(new Error("falla "+String.fromCharCode(97+i)),"a.js:"+i)');
chk('máximo 5 por visita', tope.enviados.length === 5);
const cruz = arnes(); cruz.run('reportarError({message:"Script error."},"?")');
chk('"Script error." no dice nada y no se guarda', cruz.enviados.length === 0);
const gcr = arnes(); gcr.run(`reportarError(new ReferenceError("Can't find variable: __gCrWeb"),"?:1:9")`);
chk('lo que inyecta Chrome para iPhone (__gCrWeb) no se guarda', gcr.enviados.length === 0);
// errores_app, 2026-10-26: siete avisos de ResizeObserver y dos de una
// billetera de criptomonedas en una semana. Ninguno rompe nada ni es nuestro.
const ruido = arnes(); ruido.run(`
  reportarError({message:"ResizeObserver loop completed with undelivered notifications."},"#");
  reportarError({message:"ResizeObserver loop limit exceeded"},"?");
  reportarError(new TypeError("undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')"),"?:1:16")`);
chk('los avisos de ResizeObserver y la billetera cripto no se guardan', ruido.enviados.length === 0);

console.log('\n=== Sin app.js, solo la causa ===');
// La misma semana: seis "Can't find variable: S" en la pantalla de error, en el
// mismo segundo que el "app.js no cargó" que los causó.
const sinApp = arnes({ conAppJs: false });
sinApp.run(`
  reportarError(new Error("app.js no cargó"),"arranque:cargar_app");
  reportarError(new ReferenceError("Can't find variable: S"),"app-session.js:1133:58");
  reportarError(new ReferenceError("Can't find variable: showTab"),"?:623:8")`);
chk('se guarda la causa', sinApp.enviados.length >= 1 && sinApp.enviados[0].donde === 'arranque:cargar_app');
chk('y no la cascada que viene detrás', sinApp.enviados.length === 1);

console.log('\n=== El saneo quita palabras, no pedazos ===');
// Con la carrera "COM" en el estado, "completed" salía "[dato]pleted".
const com = arnes({ estado: { carrera: 'COM', tenant: 'uc', userName: 'Ana Pérez' } });
com.run(`reportarError(new Error("structure completed for Ana Pérez in COM"),"a.js:1")`);
const msg = (com.enviados[0] || {}).mensaje || '';
chk(`"completed" y "structure" quedan enteros (${msg})`, /structure completed/.test(msg));
chk('el nombre y la carrera sueltos se siguen quitando', !/Ana|Pérez|\bCOM\b/.test(msg) && (msg.match(/\[dato\]/g) || []).length === 2);
const acento = arnes({ estado: { userName: 'Álvaro' } });
acento.run(`reportarError(new Error("no se pudo saludar a Álvaro."),"a.js:1")`);
chk('un nombre con tilde al inicio también sale', /a \[dato\]\.$/.test((acento.enviados[0] || {}).mensaje || ''));

console.log('\n=== Escucha lo que nadie atrapó ===');
chk('errores y promesas rechazadas', /addEventListener\('error'/.test(sesion) && /addEventListener\('unhandledrejection'/.test(sesion));
chk('ignora recursos que no cargan (sin mensaje)', /if\(!e\|\|!e\.message\)return;/.test(sesion));

console.log('\n=== Dónde, en una promesa rechazada ===');
// "reading 'M_ID'" (2026-10-14) llegó solo con "promesa": no se sabía si era nuestro.
const p = arnes();
const donde = stack => p.run(`dondeDeLaPromesa(${JSON.stringify({ stack })})`);
chk('Chrome: archivo y línea', donde('TypeError: x\n    at f (https://gradehub.cl/app.js?v=774a70f:1234:56)') === 'promesa · app.js:1234:56');
chk('Safari y la app iOS', donde('f@https://gradehub.cl/render-main.js?v=1:88:12') === 'promesa · render-main.js:88:12' && donde('f@capacitor://localhost/app.js:5:6') === 'promesa · app.js:5:6');
chk('una extensión del navegador se nombra como tal, sin su ruta', donde('at chrome-extension://abc/content.js:10:5') === 'promesa · extensión');
chk('sin stack sigue diciendo "promesa"', p.run('dondeDeLaPromesa(undefined)') === 'promesa' && p.run('dondeDeLaPromesa("texto")') === 'promesa');
chk('el escucha de promesas la usa', /unhandledrejection',e=>\{\s*const donde=dondeDeLaPromesa\(e&&e\.reason\);[\s\S]*?reportarError\(e&&e\.reason,donde\);/.test(sesion));
// Los errores de extensiones ("reading 'M_ID'") no son de GradeHub: no se guardan (2026-10-15).
chk('las promesas de una extensión no se guardan', /if\(donde==='promesa · extensión'\)return;/.test(sesion));
chk('los errores de una extensión no se guardan', /if\(\/\^\(chrome\|moz\|safari-web\)-extension:\/i\.test\(String\(e\.filename\|\|''\)\)\)return;/.test(sesion));

console.log('\n=== La tabla ===');
chk('el cliente solo inserta, a su nombre', /grant insert \(plataforma, version, tipo, mensaje, donde, pantalla\) on public\.errores_app to authenticated;/.test(sql)
  && /revoke all on public\.errores_app from public, anon, authenticated;/.test(sql) && /with check \(\(select auth\.uid\(\)\) = user_id\)/.test(sql));
chk('un tope por hora para la misma cuenta', /errores_app_tope/.test(sql) && />= 30 then/.test(sql));
chk('la app sella su versión con el commit', /git rev-parse --short=7 HEAD/.test(preparar) && /__ASSET_VERSION__/.test(preparar));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
