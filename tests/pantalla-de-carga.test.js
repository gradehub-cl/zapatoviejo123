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
chk('el splash nativo se oculta recién después de pintarla', /requestAnimationFrame\([\s\S]{0,80}SplashScreen\.hide\(\)/.test(html.slice(iCarga)));
chk('en la web no se muestra', /(^|\n)#arranque\{display:none;\}/.test(css));
chk('se va sola si boot() se cuelga', /\.app-nativa #arranque\{[^}]*animation:arranqueTope [^}]*forwards/.test(css));
chk('sin animación con movimiento reducido', /prefers-reduced-motion:reduce\)\{#arranque \.arr-capa\{animation:none;\}\}/.test(css));
const boot = (sesion.match(/async function boot\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
chk('boot() la saca por cualquier camino (finally)', /\}finally\{quitarArranque\(\);\}\n\}\n$/.test(boot));

const clases = new Set(); let quitado = false;
const ctx = { setTimeout: f => f(), document: { getElementById: id => id === 'arranque'
  ? { classList: { add: c => clases.add(c) }, remove: () => { quitado = true; } } : null } };
vm.createContext(ctx);
vm.runInContext(sesion.match(/function quitarArranque\(\)\{[\s\S]*?\n\}/)[0] + ';quitarArranque();', ctx);
chk('quitarArranque() la desvanece y la saca', clases.has('listo') && quitado);

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
