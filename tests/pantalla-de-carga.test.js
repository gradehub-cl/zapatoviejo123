// La app iOS abría con el splash nativo, después un fondo vacío mientras la vista
// web cargaba (supabase-js bajaba de internet con la pantalla en blanco) y, con
// sesión, el login mientras llegaban los datos. Ahora: splash nativo → pantalla
// de carga web idéntica → la pantalla que corresponde.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const html = leer('index.html'), css = leer('styles.css'), sesion = leer('app-session.js');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n=== Nada en el <head> espera a internet para pintar ===');
const head = html.slice(0, html.indexOf('</head>'));
const bloqueantes = [...head.matchAll(/<script\b[^>]*\bsrc="https?:[^"]*"[^>]*>/g)].filter(m => !/\b(async|defer)\b/.test(m[0]));
chk('ningún script externo sin async en el <head>', bloqueantes.length === 0);
const iSupa = html.indexOf('supabase-js@'), iApp = html.indexOf('src="app-session.js');
chk('supabase-js sigue antes de los scripts de la app', iSupa > 0 && iSupa < html.indexOf('src="data.js') && iSupa < iApp);
chk('la clase app-nativa se pone en el <head>', /classList\.add\('app-nativa'\)/.test(head));

console.log('\n=== La pantalla de carga ===');
const iCarga = html.indexOf('id="arranque"');
chk('va antes del login', iCarga > 0 && iCarga < html.indexOf('id="screen-auth"'));
chk('el splash nativo se oculta recién después de pintarla', /requestAnimationFrame\(\(\)=>requestAnimationFrame\(soltarSplash\)\)/.test(html.slice(iCarga))
  && /function soltarSplash\(\)\{[\s\S]*?SplashScreen\.hide\(\{fadeOutDuration:0\}\)/.test(html));
chk('la respiración parte recién cuando se va el splash', /classList\.add\('vivo'\)/.test(html)
  && /#arranque\.vivo \.arr-arriba\{animation:arrArriba 1\.6s /.test(css) && /RESPIRO_MS=1600;/.test(sesion));
chk('en la web no se muestra', /(^|\n)#arranque\{display:none;\}/.test(css));
chk('se va sola si boot() se cuelga', /\.app-nativa #arranque\{[^}]*animation:arranqueTope [^}]*forwards/.test(css));
chk('sin animación con movimiento reducido', /prefers-reduced-motion:reduce\)\{#arranque\.vivo \.arr-capa\{animation:none;\}\}/.test(css));
const boot = (sesion.match(/async function boot\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
// Al reintentar app.js la página se recarga y la pantalla de carga se queda,
// pero con plazo: si la recarga no llega, se va igual.
chk('boot() la saca por cualquier camino (finally)', /\}finally\{[^}]*if\(recargando\)setTimeout\(quitarArranque,\d+\);else quitarArranque\(\);\s*\}\n\}\n$/.test(boot));

const clases = new Set(); let quitado = false;
const ctx = { setTimeout: f => f(), document: { getElementById: id => id === 'arranque'
  ? { classList: { add: c => clases.add(c) }, remove: () => { quitado = true; } } : null } };
vm.createContext(ctx);
const bloque = sesion.slice(sesion.indexOf('const VIAJE_ARRANQUE_MS='), sesion.indexOf('async function boot()'));
vm.runInContext(bloque + ';function volarAlLogin(){throw 1};quitarArranque();', ctx);
chk('si el viaje falla, igual se desvanece y se va', clases.has('listo') && quitado);

// Hacia el login: el logo de 96 px al centro de un iPhone de 393×852 vuela al
// <img> del login (48 px con 11 de padding, arriba): mismo centro, 26/96 de tamaño.
// Sin sesión la carga es casi instantánea: el viaje espera a que termine la
// primera respiración (1.600 ms desde que se fue el splash).
const viaje = (reducido, respiraDesdeHace = 2000) => {
  const esperas = [];
  const svg = { style: {}, getBoundingClientRect: () => ({ left: 148.5, top: 378, width: 96, height: 96 }) };
  const img = { style: {}, getBoundingClientRect: () => ({ left: 172.5, top: 60, width: 48, height: 48 }) };
  const cls = new Set(), capas = [{ style: {}, animate: () => {} }];
  const el = { classList: { add: c => cls.add(c) }, remove: () => {}, querySelector: () => svg, querySelectorAll: () => capas,
    dataset: { desde: String(10000 - respiraDesdeHace) } };
  const c = { setTimeout: (f, ms) => { esperas.push(ms); f(); }, matchMedia: () => ({ matches: reducido }), performance: { now: () => 10000 },
    getComputedStyle: x => x === img ? { paddingLeft: '11px' } : { transform: 'matrix(1, 0, 0, 1, 0, -5)' },
    document: { getElementById: () => el, querySelector: s => s === '#screen-auth.active .ob-icon img' ? img : null } };
  vm.createContext(c); vm.runInContext(bloque + ';quitarArranque();', c);
  return { svg, img, cls, capas, esperas };
};
const v = viaje(false);
chk('hacia el login el logo vuela a su lugar', v.cls.has('viaje') && v.svg.style.transform === 'translate(0px,-342px) scale(0.2708)');
chk('las capas dejan de respirar y el logo del login vuelve al final', v.capas[0].style.animation === 'none' && v.img.style.opacity === '');
chk('si recién empezó a respirar, espera a que termine la respiración', viaje(false, 400).esperas[0] === 1200);
chk('si ya respiró una vez (con sesión o red lenta), sube altiro', viaje(false, 2500).esperas[0] === 0);
chk('con movimiento reducido solo se desvanece', viaje(true).cls.has('listo') && !viaje(true).cls.has('viaje'));
chk('la duración y la curva del viaje son las mismas en CSS y JS', /#arranque svg\{[^}]*transition:transform \.5s var\(--ease-viaje\)/.test(css) && /--ease-viaje:cubic-bezier\(\.45,0,\.15,1\);/.test(css) && /VIAJE_ARRANQUE_MS=500,VIAJE_ARRANQUE_CURVA='cubic-bezier\(\.45,0,\.15,1\)'/.test(sesion));

console.log('\n=== El splash nativo es igual a la pantalla web ===');
const ios = 'ios/App/App/';
const storyboard = leer(ios + 'Base.lproj/LaunchScreen.storyboard');
chk('fondo FondoArranque y logo Splash de 96 al centro',
  /name="FondoArranque"/.test(storyboard) && /<image name="Splash" width="96" height="96"\/>/.test(storyboard)
  && /firstAttribute="centerX"/.test(storyboard) && /firstAttribute="centerY"/.test(storyboard));
chk('el logo web también mide 96', /#arranque svg\{width:96px;height:96px;/.test(css));
const color = JSON.parse(leer(ios + 'Assets.xcassets/FondoArranque.colorset/Contents.json')).colors;
const hex = c => '#' + ['red', 'green', 'blue'].map(k => c.color.components[k].slice(2).toLowerCase()).join('');
const claro = color.find(c => !c.appearances), oscuro = color.find(c => c.appearances);
const bg = bloque => (bloque.match(/--bg:(#[0-9a-f]{6})/i) || [])[1];
chk('claro igual a --bg', hex(claro) === bg(css.slice(css.indexOf(':root{'))));
chk('oscuro igual a --bg oscuro', hex(oscuro) === bg(css.slice(css.indexOf('@media(prefers-color-scheme:dark)'))));
const imgs = JSON.parse(leer(ios + 'Assets.xcassets/Splash.imageset/Contents.json')).images;
chk('las tres escalas del logo existen', imgs.length === 3 && imgs.every(i => fs.existsSync(path.join(raiz, ios, 'Assets.xcassets/Splash.imageset', i.filename))));
const splash = JSON.parse(leer('capacitor.config.json')).plugins.SplashScreen;
chk('el splash nativo se va solo si la web no lo oculta', splash.launchAutoHide === true && splash.launchShowDuration <= 3000);

console.log(`\n${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
