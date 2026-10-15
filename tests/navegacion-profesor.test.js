// Una cuenta de profesor tiene solo Clases y Alumnos, y abre en Clases (#697, PR 3).
//
// Lo que se fija acá, además de lo nuevo, es que las cuentas que ya existen no
// cambian: una de estudiante sigue con sus tres pestañas y una de estudiante
// que además es profesor aprobado sigue con las cinco (las de Lucas y Martín).
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'app-session.js', 'marketplace.js', 'render-main.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');
const html = fs.readFileSync(raiz + 'index.html', 'utf8');

const nuevo = () => ({ style: { setProperty() {}, removeProperty() {} }, checked: false, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', hidden: false, focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return null }, clientWidth: 400, clientHeight: 400, scrollTop: 0, dataset: {}, click() {}, closest() { return null }, insertBefore() {}, removeChild() {}, remove() {}, getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 } }, children: [], firstElementChild: null, contains() { return false } });
const elementos = {};
const el = id => (elementos[id] = elementos[id] || nuevo());
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
  document: { getElementById: el, createElement: nuevo, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => null, querySelectorAll: () => [], body: nuevo() },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' },
  history: { replaceState() {} }, setTimeout, clearTimeout, console, gtag() {},
  requestAnimationFrame() { return 0 }, cancelAnimationFrame() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const run = n => vm.runInContext(n, ctx);
// Las pantallas se pintan en otros tests; acá importa a cuál se llega.
run(`var _pintadas=[];
  renderHome=()=>_pintadas.push('home');renderStats=()=>_pintadas.push('stats');renderAgenda=()=>_pintadas.push('agenda');
  renderProfesor=()=>_pintadas.push('profesor');renderAlumnosTab=()=>_pintadas.push('alumnos');renderAdmin=()=>_pintadas.push('admin');
  esAdministrador=()=>false;`);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const tabs = () => run('NAV_TABS.join()');
const cuenta = (tipo, aprobado) => {
  run(`S=normalize(Object.assign(freshState(),{onboardingDone:true${tipo ? `,tipoCuenta:'${tipo}'` : ''}}))`);
  run(`perfilProfesorCache=${aprobado ? "{estado:'aprobado'}" : 'null'}`);
  run('recalcularNavTabs()');
};

console.log('\n=== Una cuenta de estudiante no cambia ===');
// Una cuenta vieja no trae tipoCuenta: normalize la deja de estudiante (#698).
cuenta(null, false);
chk('tiene Estadísticas, Inicio y Agenda', tabs() === 'stats,home,agenda');
chk('abre en Inicio', run('pestanaInicial()') === 'home');
chk('Clases y Alumnos siguen escondidas', el('nav-profesor').hidden && el('nav-alumnos').hidden && el('screen-profesor').hidden);
chk('Inicio a la vista', !el('nav-home').hidden && !el('screen-home').hidden);
run("showTab('profesor')");
chk('pedir Clases sin tenerla lleva a Inicio', run('currentTab') === 'home');

console.log('\n=== Estudiante que además es profesor aprobado (cuentas mixtas) ===');
cuenta('estudiante', true);
chk('tiene sus cinco pestañas, como hoy', tabs() === 'stats,home,agenda,profesor,alumnos');
chk('y sigue abriendo en Inicio', run('pestanaInicial()') === 'home');

console.log('\n=== Una cuenta de profesor ===');
cuenta('profesor', false);
chk('tiene solo Clases y Alumnos, aunque no esté aprobada', tabs() === 'profesor,alumnos');
chk('abre en Clases', run('pestanaInicial()') === 'profesor');
chk('Inicio, Estadísticas y Agenda quedan escondidas, botón y pantalla',
  ['stats', 'home', 'agenda'].every(t => el('nav-' + t).hidden && el('screen-' + t).hidden));
chk('Clases y Alumnos a la vista', !el('nav-profesor').hidden && !el('nav-alumnos').hidden && !el('screen-alumnos').hidden);
run('_pintadas.length=0'); run("showTab('agenda')");
chk('pedir la Agenda lleva a Clases', run('currentTab') === 'profesor' && run('_pintadas.join()') === 'profesor');
run("showTab('alumnos')");
chk('Alumnos se abre', run('currentTab') === 'alumnos');
run("currentTab='home'"); run('goHome()');
chk('volver lleva a Clases, no a Inicio', run('currentTab') === 'profesor');
chk('un enlace de widget no abre nada', run("abrirEnlaceWidget('cl.gradehub.app://agenda')") === false);
cuenta('profesor', true);
chk('aprobada, las mismas dos pestañas', tabs() === 'profesor,alumnos');

console.log('\n=== Recién creada, con la lista todavía de estudiante ===');
// Al terminar el onboarding de profesor la lista viene de la sesión anterior.
run("S=normalize(Object.assign(freshState(),{onboardingDone:true}));perfilProfesorCache=null;recalcularNavTabs();S.tipoCuenta='profesor'");
run("showTab(pestanaInicial())");
chk('mostrar Clases rearma la lista y llega', run('currentTab') === 'profesor' && tabs() === 'profesor,alumnos');

console.log('\n=== Al cerrar sesión vuelve todo a estudiante ===');
run("S=freshState();perfilProfesorCache=null;recalcularNavTabs()");
chk('tres pestañas de nuevo', tabs() === 'stats,home,agenda' && !el('nav-home').hidden && !el('screen-home').hidden);

console.log('\n=== Sin Inicio, igual se llega a Ajustes ===');
const topbar = id => (html.match(new RegExp(`<div id="screen-${id}"[\\s\\S]*?<div class="scroll">`)) || [''])[0];
chk('Clases tiene su avatar con el menú de la cuenta', /class="avatar-btn" onclick="toggleUserMenu\(event\)"[^>]*aria-haspopup="menu"/.test(topbar('profesor')));
chk('Alumnos también', /class="avatar-btn" onclick="toggleUserMenu\(event\)"/.test(topbar('alumnos')));
cuenta('profesor', false); run('openUserMenu()');
chk('el menú no ofrece la malla a un profesor', el('um-malla').style.display === 'none');
cuenta(null, false); run('openUserMenu()');
chk('a un estudiante sí', el('um-malla').style.display === 'flex');

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
