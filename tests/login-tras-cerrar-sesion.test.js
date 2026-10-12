// Cerrar sesión deja el login igual que al abrir la app de cero: sin la clase
// del carrusel de pestañas, que lo dibujaba corrido hacia abajo (iPhone,
// 2026-10-06). DOM sintético.
const fs = require('fs'), vm = require('vm'), path = require('path');
const raiz = path.join(__dirname, '..');
const src = ['data.js', 'engine.js', 'app.js', 'app-session.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n');
const clases = () => { const c = new Set(); return { add: (...x) => x.forEach(v => c.add(v)), remove: (...x) => x.forEach(v => c.delete(v)), contains: v => c.has(v), toggle() {} }; };
const el = () => ({ style: { setProperty() {}, removeProperty() {} }, classList: clases(), dataset: {}, value: '', innerHTML: '', textContent: '', hidden: false,
  addEventListener() {}, appendChild() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {}, remove() {} });
const ids = {}, app = el();
let scrolls = 0;
const ctx = { window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), scrollTo() { scrolls++; } },
  document: { getElementById: id => ids[id] || (ids[id] = el()), querySelector: s => s === '.app' ? app : null, querySelectorAll: () => [], createElement: el, addEventListener() {}, documentElement: el(), body: el() },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' }, history: { replaceState() {} }, setTimeout, clearTimeout, console };
vm.createContext(ctx); vm.runInContext(src, ctx);
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

app.classList.add('tab-mode');
vm.runInContext('showAuthScreen()', ctx);
chk('el login sale del carrusel de pestañas', !app.classList.contains('tab-mode'));
chk('y vuelve arriba', scrolls === 1);
chk('y queda visible', ids['screen-auth'].classList.contains('active'));
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
