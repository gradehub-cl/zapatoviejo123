// La app iOS se ve menos PWA (pedido de Martín, 2026-10-07): hojas con la barra
// de iOS arriba, Ajustes agrupado, menús desplegables y confirmaciones como
// alertas. Lo visual va solo con html.app-nativa; los menús, en las dos.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const app = leer('app.js'), css = leer('styles.css'), html = leer('index.html');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n=== Qué sube a la barra de la hoja ===');
const re = nombre => new RegExp(app.match(new RegExp(nombre + '=/(.+?)/i'))[1], 'i');
const cerrar = re('HOJA_CERRAR'), volver = re('HOJA_VOLVER'), confirmar = re('HOJA_CONFIRMAR');
chk('Cancelar y Cerrar son la X', ['Cancelar', 'Cerrar'].every(t => cerrar.test(t)));
chk('Atrás y Volver son la flecha', ['Atrás', 'Volver'].every(t => volver.test(t)));
chk('"Ahora no" o "Dejar la mía" no cierran: son una decisión', !cerrar.test('Ahora no') && !cerrar.test('Dejar la mía'));
chk('guardar, agregar o enviar van arriba a la derecha',
  ['Guardar', 'Agregar ramo', 'Enviar reporte', 'Marcar justificada', 'Importar', 'Continuar', 'Listo', 'Guardar como reales'].every(t => confirmar.test(t)));
chk('copiar, elegir o reiniciar se quedan abajo',
  ['Copiar', 'Usar esta', 'Reiniciar todo', 'Eliminar', 'Ver mis ramos', 'Ir a Inicio'].every(t => !confirmar.test(t)));
chk('solo sube una acción a la derecha', /confirmables\.length===1\?confirmables\[0\]:null/.test(app));
chk('lo destructivo nunca sube (solo btn-confirm)', /classList\.contains\('btn-confirm'\)&&HOJA_CONFIRMAR/.test(app));
chk('un botón de envío sigue enviando su formulario', /b\.type==='submit'[\s\S]{0,80}setAttribute\('form'/.test(app));
chk('solo en la app nativa', /classList\.contains\('app-nativa'\)\)\s*new MutationObserver\(\(\)=>armarBarraDeHoja\(contenido\)\)/.test(app));

console.log('\n=== La web no cambia ===');
const bloque = css.slice(css.indexOf('/* ─── App iOS: aspecto nativo'));
// Las @media (transparencia, contraste) no son selectores: se revisa lo de adentro.
const reglas = (bloque.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?=\{)/g) || []).filter(r => !r.trim().startsWith('@'));
chk('todo el bloque de la app va bajo .app-nativa', reglas.length > 10 && reglas.every(r => r.split(',').every(s => s.trim().startsWith('.app-nativa'))));
chk('la caja de cada grupo de Ajustes no existe en la web', /\.settings-nav-card\{display:contents;\}/.test(css));

console.log('\n=== Menús desplegables ===');
chk('el orden abre un menú, no cambia con cada toque', /id="sort-btn" onclick="abrirMenuOrden\(this\)" aria-haspopup="menu"/.test(html) && !/cycleSortMode/.test(app + html));
chk('la opción elegida lleva ✓ y role menuitemradio', /menuitemradio/.test(app) && /it\.marcado\?CHECK_MENU/.test(app));
chk('editar y eliminar van en el "⋯" del ramo', /id="ramo-mas" onclick="abrirMenuRamo\(this\)"/.test(html) && !/onclick="confirmDeleteRamo\(\)"/.test(html));
const menuRamo = app.slice(app.indexOf('function abrirMenuRamo'), app.indexOf('function abrirMenuRamo') + 1400);
chk('eliminar va al final, separado y en rojo', /'sep',\s*\{texto:'Eliminar ramo',peligro:true/.test(menuRamo));
chk('Escape cierra el menú', /Escape'&&document\.getElementById\('menu-flotante'\)\)cerrarMenu\(\)/.test(app));
chk('Ajustes se llama igual en el menú y en la hoja', !/Configuración/.test(html + app));

console.log('\n=== Navegar como en iOS ===');
// Abrir un ramo lo empuja desde la derecha y Volver lo devuelve por el mismo
// camino (View Transitions). Solo en la app; sin soporte cambia de golpe.
const vm = require('vm');
const funcion = app.match(/let _navTransicion=0;\nfunction transicionNativa\([\s\S]*?\n\}/)[0];
const probar = ({ nativa, vt, reducido }) => {
  const hechos = [], raiz = { dataset: {}, classList: { contains: c => c === 'app-nativa' && nativa } };
  const ctx = { document: { documentElement: raiz, startViewTransition: vt ? cb => { hechos.push('vt:' + raiz.dataset.nav); cb(); return { finished: Promise.resolve() }; } : undefined },
    matchMedia: () => ({ matches: reducido }) };
  vm.createContext(ctx); vm.runInContext(funcion + ';transicionNativa("push",()=>__h.push("cambio"))', Object.assign(ctx, { __h: hechos }));
  return hechos.join(',');
};
chk('en la app con View Transitions, el push anima', probar({ nativa: true, vt: true, reducido: false }) === 'vt:push,cambio');
chk('con movimiento reducido es un fundido', probar({ nativa: true, vt: true, reducido: true }) === 'vt:fundido,cambio');
chk('en la web cambia de golpe, como siempre', probar({ nativa: false, vt: true, reducido: false }) === 'cambio');
chk('sin View Transitions (iOS 17 o antes) también cambia', probar({ nativa: true, vt: false, reducido: false }) === 'cambio');
chk('abrir un ramo es push y volver es pop', /transicionNativa\('push',\(\)=>\{[\s\S]{0,300}screen-ramo'\)\.classList\.add\('active'\)/.test(app)
  && /transicionNativa\('pop',\(\)=>showTab\(destino\)\)/.test(app));
chk('Volver regresa a la pestaña desde donde se abrió el ramo', /const destino=NAV_TABS\.includes\(currentTab\)\?currentTab:'home';/.test(app));
chk('la barra de pestañas se queda quieta', /\.app-nativa \.bottom-nav\{view-transition-name:barra-pestanas;\}/.test(css));
chk('el ramo entra y sale por la derecha', /\.app-nativa\[data-nav="push"\]::view-transition-new\(root\)\{animation:navEntraDer/.test(css)
  && /\.app-nativa\[data-nav="pop"\]::view-transition-old\(root\)\{z-index:1;animation:navSaleDer/.test(css));
chk('dentro de Ajustes el contenido entra desde el lado al que se navega',
  /entrarDesde\(document\.querySelector\('\.settings-shell'\),'push'\)/.test(app) && /entrarDesde\(document\.querySelector\('\.settings-shell'\),'pop'\)/.test(app));

console.log('\n=== Vibración: nota, borrar y lo que en iOS ya vibra solo ===');
const vib = app.match(/function vibrar\(tipo\)\{[\s\S]*?\n\}/)[0];
const probarVib = (nativa, tipo) => { const h = []; const ctx = { enAppNativa: () => nativa, window: { Capacitor: { Plugins: { Haptics: {
  impact: o => (h.push('impact:' + o.style), Promise.resolve()), notification: o => (h.push('notification:' + o.type), Promise.resolve()),
  selectionStart: () => (h.push('start'), Promise.resolve()), selectionChanged: () => (h.push('tic'), Promise.resolve()) } } } } };
  vm.createContext(ctx); vm.runInContext('let _hapticaSeleccion=null;' + vib + ';vibrar(' + JSON.stringify(tipo) + ');vibrar(' + JSON.stringify(tipo) + ')', ctx);
  return new Promise(r => setTimeout(() => r(h.join(',')), 0)); };
const vibraciones = (async () => {
chk('al agregar una nota, un toque suave', await probarVib(true, 'nota') === 'impact:LIGHT,impact:LIGHT');
chk('al borrar, la advertencia', await probarVib(true, 'borrar') === 'notification:WARNING,notification:WARNING');
chk('la selección prepara el generador una vez y hace un tic por cambio', await probarVib(true, 'seleccion') === 'start,tic,tic');
chk('al levantar un ramo, un golpe medio', await probarVib(true, 'levantar') === 'impact:MEDIUM,impact:MEDIUM');
chk('en la web no vibra', await probarVib(false, 'nota') === '' && await probarVib(false, 'seleccion') === '');
})();
chk('la ruleta hace tic cuando otra fila pasa por el centro', /if\(f!==filaAlCentro&&f>=0&&f<opciones\.length\)\{filaAlCentro=f;vibrar\('seleccion'\);\}/.test(app));
chk('los interruptores hacen tic al cambiar', /t\.matches\('\.toggle input\[type=checkbox\]'\)\)vibrar\('seleccion'\)/.test(app));
chk('levantar un ramo para reordenar se siente', /drag=\{ghost,[^\n]*\n[^\n]*\n\s*vibrar\('levantar'\);/.test(app));
chk('se llama al guardar una nota válida (casillas, directa, agregar y editar)', (app.match(/vibrar\('nota'\)/g) || []).length === 4);
chk('y al confirmar un borrado y al borrar una nota', /if\(borra&&typeof vibrar==='function'\)vibrar\('borrar'\);/.test(app) && /save\(\);renderRamo\(\);vibrar\('borrar'\);/.test(app));
chk('el plugin de vibración está instalado', !!(JSON.parse(leer('package.json')).dependencies || {})['@capacitor/haptics']);

console.log('\n=== Hojas y alertas se mueven como en iOS ===');
chk('las hojas suben con la curva y la duración de la navegación', /\.app-nativa \.modal-sheet\{transition-duration:var\(--motion-navegar\);transition-timing-function:var\(--ease-navegar\);\}/.test(css)
  && /\.app-nativa \.modal-overlay\{[^}]*display var\(--motion-navegar\) allow-discrete/.test(css));
chk('la alerta entra con fundido y un leve acercamiento', /@starting-style\{\s*\.app-nativa \.confirm-overlay\.open\{opacity:0;\}\s*\.app-nativa \.confirm-overlay\.open \.confirm-box\{transform:scale\(1\.08\);\}/.test(css));
chk('las hojas enfocan su campo con enfocarEnHoja, no con un focus a los 100 ms', !/setTimeout\(\(\)=>(document\.getElementById\('[^']+'\)|\{?inp)\.focus\(\)/.test(app) && (app.match(/enfocarEnHoja\(/g) || []).length >= 7);
chk('en la app el foco no desplaza la página y espera a que la hoja termine de subir', /if\(enAppNativa\(\)\)\{try\{el\.focus\(\{preventScroll:true\}\)/.test(app) && /setTimeout\(ir,subiendo\?Math\.max\(100,dura\):100\)/.test(app));
chk('con movimiento reducido la alerta solo se funde', /prefers-reduced-motion:reduce\)\{\.app-nativa \.confirm-overlay\.open \.confirm-box\{transition:none;\}\}/.test(css));

console.log('\n=== Deslizar desde el borde para volver ===');
const gesto = app.slice(app.indexOf('(function initVolverDeslizando(){'), app.indexOf('(function initVolverDeslizando(){') + 4000);
chk('parte solo desde el borde izquierdo y solo en la app', /const BORDE=24;/.test(gesto) && /!enAppNativa\(\)/.test(gesto) && /t\.clientX>BORDE\)return;/.test(gesto));
chk('no se activa con una hoja, una alerta o un menú abiertos', /\.modal-overlay\.open,\.confirm-overlay\.open,#menu-flotante/.test(gesto));
chk('un scroll vertical no se confunde con el gesto', /Math\.abs\(dy\)>=Math\.abs\(dx\)\)\{g=null;return;\}/.test(gesto));
chk('decide por velocidad o por la mitad, y vuelve a la pestaña de origen', /const sale=v>0\.35\|\|\(v>-0\.2&&s\.dx>w\/2\);/.test(gesto) && /showTab\(s\.destino\)/.test(gesto));
chk('la pestaña de origen queda marcada dentro del ramo', !/\['nav-home','nav-stats','nav-agenda'\]\.forEach\(n=>document\.getElementById\(n\)\.classList\.remove\('active'\)\)/.test(app));

console.log('\n=== Barra de vidrio y nada de página web ===');
chk('barra de pestañas flotante y translúcida', /\.app-nativa \.bottom-nav\{[^}]*border-radius:999px;[^}]*backdrop-filter:blur/.test(css));
chk('opaca con Reducir transparencia y con más contraste', /prefers-reduced-transparency:reduce\)\{\s*\.app-nativa \.bottom-nav\{background:var\(--bg2\);backdrop-filter:none/.test(css)
  && /prefers-contrast:more\)\{\s*\.app-nativa \.bottom-nav\{background:var\(--bg2\);backdrop-filter:none/.test(css));
chk('sin seleccionar texto ni menú de mantener presionado, salvo en campos', /\.app-nativa body\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;\}/.test(css) && /\.app-nativa input,\.app-nativa textarea/.test(css));
chk('sin zoom en la app (la web lo conserva)', /maximum-scale=1, user-scalable=no/.test(html) && /<meta name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"\/>/.test(html));
chk('sin vista previa al mantener presionado un enlace', JSON.parse(leer('capacitor.config.json')).ios.allowsLinkPreview === false);

console.log('\n=== Para la App Store ===');
const pbx = leer('ios/App/App.xcodeproj/project.pbxproj');
for (const f of ['ios/App/App/PrivacyInfo.xcprivacy', 'ios/App/GradeHubWidgets/PrivacyInfo.xcprivacy']) {
  const m = leer(f);
  chk(f.split('/')[2] + ': manifiesto sin rastreo y con el motivo del App Group', /<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(m) && /NSPrivacyAccessedAPICategoryUserDefaults/.test(m) && /<string>1C8F\.1<\/string>/.test(m));
}
chk('los dos manifiestos van en los recursos de la app y del widget', (pbx.match(/PrivacyInfo\.xcprivacy in Resources \*\/,/g) || []).length === 2);
const icono = JSON.parse(leer('ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json')).images;
chk('ícono con versión oscura y teñida', ['dark', 'tinted'].every(v => icono.some(i => (i.appearances || []).some(a => a.value === v) && fs.existsSync(path.join(raiz, 'ios/App/App/Assets.xcassets/AppIcon.appiconset', i.filename)))));

// Las vibraciones de selección se resuelven en una promesa: el resumen las espera.
vibraciones.then(() => {
  console.log(`\n${ok} OK, ${fail} FAIL`);
  if (fail) process.exit(1);
});
