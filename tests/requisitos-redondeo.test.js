// Los requisitos mínimos se redondean a la décima, igual que la nota final.
// Pautas escritas acá adentro: es un test del mecanismo, no del catálogo.
const fs = require('fs'), vm = require('vm');
const h = fs.readFileSync(__dirname+'/../index.html', 'utf8');
const DATA = fs.readFileSync(__dirname+'/../data.js', 'utf8');
const ENGINE = fs.readFileSync(__dirname+'/../engine.js', 'utf8');
const APP = fs.readFileSync(__dirname+'/../app.js', 'utf8');
const AGENDA = fs.readFileSync(__dirname+'/../render-agenda.js', 'utf8');
// Mismo orden que index.html: datos, motor, interfaz y su render separado.
const src = DATA + '\n' + ENGINE + '\n' + APP + '\n' + AGENDA;
new vm.Script(src);

const stub = { style: { setProperty() {}, removeProperty() {} }, checked: true, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
  // La vuelta del sheet la anima un resorte con requestAnimationFrame. Sin
  // estas, el harness revienta por faltarle una API del navegador y no por un
  // error de la app.
  requestAnimationFrame: fn => setTimeout(() => fn(0), 0), cancelAnimationFrame: clearTimeout,
  performance: { now: () => 0 }
};
vm.createContext(ctx); vm.runInContext(src, ctx);

let ok = 0, fail = 0;
const eq = (n, got, exp, tol) => {
  tol = tol || 0.005;
  const p = (exp === null && got === null) || (typeof got === 'number' && Math.abs(got - exp) < tol);
  if (p) { ok++; console.log('  OK   ' + n + ' = ' + (got === null ? 'null' : got.toFixed(3))); }
  else { fail++; console.log('  FAIL ' + n + ' = ' + got + '  (esperado ' + exp + ')'); }
};


const si = (n, cond) => { if (cond) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const nota = (id, valor) => valor === null ? [] : [{ id, valor, peso: 1 }];

// Un requisito mínimo se mide como la nota final: redondeado a la décima.
// En la UC un 3,95 es 4,0 también para "promedio de pruebas ≥ 4,0"; antes el
// motor exigía 4,00 crudo y topaba en 3,9 a quien tenía 3,95–3,99.
console.log('\nRequisito de grupo (≥ 4,0, si no topa en 3,9)');
function conGrupo(p1, p2, ex, tareas) {
  return {
    id: 'g', nombre: 'Ramo de prueba', creditos: 10,
    categorias: [
      { id: 'p1', nombre: 'Prueba 1', peso: 25, notas: nota('a', p1) },
      { id: 'p2', nombre: 'Prueba 2', peso: 25, notas: nota('b', p2) },
      { id: 'ex', nombre: 'Examen', peso: 30, notas: nota('c', ex) },
      { id: 'ta', nombre: 'Tareas', peso: 20, notas: nota('d', tareas) },
    ],
    gates: [{ type: 'group_min', catIds: ['p1', 'p2', 'ex'], min: 4.0, cap: 3.9, nombre: 'Pruebas y examen' }],
  };
}
// Pruebas y examen: (3,6·25 + 4,0·25 + 4,2·30) / 80 = 3,95 → redondea a 4,0.
let r = conGrupo(3.6, 4.0, 4.2, 6.0);
eq('3,95 en el grupo no topa: final = ponderado', ctx.ramoAvg(r), (3.6*25 + 4*25 + 4.2*30 + 6*20) / 100);
si('3,95 en el grupo no deja compuertas activas', ctx.gatesActivas(r).length === 0);
// (3,6·25 + 3,9·25 + 4,2·30) / 80 = 3,91875 → 3,9: no cumple.
r = conGrupo(3.6, 3.9, 4.2, 6.0);
eq('3,92 en el grupo sí topa en 3,9', ctx.ramoAvg(r), 3.9);
si('3,92 en el grupo deja la compuerta activa', ctx.gatesActivas(r).length === 1);

console.log('\nRequisito de grupo con tope en su propio promedio (FEN)');
function fen(casos, trabajo) {
  return {
    id: 'f', nombre: 'Ramo FEN de prueba', creditos: 6,
    categorias: [
      { id: 'ind', nombre: 'Individual', peso: 70, notas: nota('a', casos) },
      { id: 'gru', nombre: 'Trabajo en grupo', peso: 30, notas: nota('b', trabajo) },
    ],
    gates: [
      { type: 'group_min', catIds: ['ind'], min: 4.0, cap: 'self', nombre: 'Trabajo individual' },
      { type: 'group_min', catIds: ['gru'], min: 4.0, cap: 'self', nombre: 'Trabajo de grupo' },
    ],
  };
}
eq('individual 3,95 cumple: final = ponderado', ctx.ramoAvg(fen(3.95, 6.0)), 3.95*0.7 + 6*0.3);
eq('individual 3,94 no cumple: final = 3,94', ctx.ramoAvg(fen(3.94, 6.0)), 3.94);

console.log('\nMínimo de una evaluación (≥ 4,0, si no topa en 3,9)');
function conMinimo(informes) {
  return {
    id: 'm', nombre: 'Ramo con mínimo', creditos: 10,
    categorias: [
      { id: 'pr', nombre: 'Pruebas', peso: 60, notas: nota('a', 6.5) },
      { id: 'in', nombre: 'Informes', peso: 40, notas: informes.map((v, i) => ({ id: 'i' + i, valor: v, peso: 1 })) },
    ],
    gates: [{ type: 'min_grade_required', catId: 'in', min: 4.0, cap: 3.9, nombre: 'Informes' }],
  };
}
eq('informes 3,9 y 4,0 (promedio 3,95) cumplen', ctx.ramoAvg(conMinimo([3.9, 4.0])), 6.5*0.6 + 3.95*0.4);
eq('informes 3,8 y 4,0 (promedio 3,9) topan', ctx.ramoAvg(conMinimo([3.8, 4.0])), 3.9);

console.log('\nRamo vinculado con mínimo (laboratorio 30%, ambos ≥ 4,0)');
const lab = v => ({ id: 'lab', nombre: 'Laboratorio de prueba', categorias: [{ id: 'l', nombre: 'Laboratorios', peso: 100, notas: nota('l1', v) }], gates: [] });
const teo = { id: 'teo', nombre: 'Teórico de prueba', aporta: { ramo: 'Laboratorio de prueba', peso: 30, min: 4.0 }, categorias: [], gates: [] };
eq('parte propia 3,95: se pondera 70/30', ctx.combinarConRamoVinculado(teo, 3.95, null, [teo, lab(5.0)]), 3.95*0.7 + 5*0.3);
eq('parte propia 3,94: manda la menor', ctx.combinarConRamoVinculado(teo, 3.94, null, [teo, lab(5.0)]), 3.94);
eq('laboratorio 3,95: se pondera 70/30', ctx.combinarConRamoVinculado(teo, 5.0, null, [teo, lab(3.95)]), 5*0.7 + 3.95*0.3);

console.log('\nPunto flotante');
si('3,9499999… (un 3,95 mal guardado) cumple 4,0', ctx.gh_cumpleMinimo(3.9499999999999997, 4.0));
si('3,94 no cumple 4,0', !ctx.gh_cumpleMinimo(3.94, 4.0));
si('un mínimo ya escrito como 3,95 sigue igual: 3,95 cumple', ctx.gh_cumpleMinimo(3.95, 3.95));
si('un mínimo ya escrito como 3,95 sigue igual: 3,94 no cumple', !ctx.gh_cumpleMinimo(3.94, 3.95));

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
