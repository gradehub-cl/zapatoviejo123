// ETI188 entra solo para la sección 4 (syllabus 2026-2 de Constanza Guajardo).
// Lo que se rompe en silencio: que sus pesos dejen de ser el producto exacto
// de NP y NF, y que su pauta o sus fechas lleguen a otra sección o a un ramo
// que ya existe.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'render-main.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } } };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {} }, querySelector: () => null, querySelectorAll: () => [] },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const val = n => vm.runInContext(n, ctx);

let ok = 0, fail = 0;
const chk = (nombre, cond) => { if (cond) { ok++; console.log('  ok   ' + nombre); } else { fail++; console.log('  FAIL ' + nombre); } };

const def = val("PRESETS_UC['Ética para Ingeniería']");
const seccion = def.porSeccion[4];
const peso = n => seccion.evals.find(e => e[0] === n)[1];
const fecha = n => seccion.evals.find(e => e[0] === n)[2].fecha;

chk('la pauta suma 100', seccion.evals.reduce((s, e) => s + e[1], 0) === 100);
chk('los pesos son 70% de NP (35/35/30) y 30% de Examen',
  peso('Prueba 1') === 24.5 && peso('Prueba 2') === 24.5 && peso('Trabajo final') === 21 && peso('Examen') === 30);

const notas = { 'Prueba 1': 6, 'Prueba 2': 5, 'Trabajo final': 7 };
const sinExamen = Object.keys(notas).reduce((s, n) => s + notas[n] * peso(n), 0) / 70;
chk('al eximirse, la nota vuelve a ser NP', Math.abs(sinExamen - (0.35 * 6 + 0.35 * 5 + 0.3 * 7)) < 1e-9);

chk('las fechas son las del syllabus',
  fecha('Prueba 1') === '2026-08-31' && fecha('Prueba 2') === '2026-10-07' && fecha('Examen') === '2026-11-25');
chk('la eximición parte en 5,0 y pide confirmar la asistencia a charlas',
  seccion.eximicion.min === 5 && seccion.eximicion.requiereConfirmacion === true);

chk('ninguna otra sección tiene pauta', Object.keys(def.porSeccion).join() === '4');
chk('sin sección no se carga ninguna pauta', val("presetRamo('Ética para Ingeniería','uc','ING-PC')") === null);
chk('sin sección no aplica la eximición ni las reglas de la 4',
  !def.eximicion && !def.evals && !def.noCalcula && !def.reglasDelCurso);

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
