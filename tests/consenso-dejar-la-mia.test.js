// "Dejar la mía" calla el aviso de una pauta reportada hasta que la reporten
// cuatro personas más (pedido de Martín, 2026-10-27). Antes el botón solo
// cerraba la hoja y el aviso volvía a salir en cada visita al ramo.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'render-main.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console, syncToCloud() {},
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const val = n => vm.runInContext(n, ctx);
const J = v => JSON.stringify(v);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// Pauta de ejemplo escrita acá: el test es del mecanismo, no de un ramo.
const ramo = {
  id: 'r1', nombre: 'Ramo de Prueba', categorias: [
    { id: 'a', nombre: 'Prueba 1', peso: 50, notas: [], ponderaNotas: false, directNota: true },
    { id: 'b', nombre: 'Examen', peso: 50, notas: [], ponderaNotas: false, directNota: true },
  ], gates: [],
};
const reportada = [{ nombre: 'Prueba 1', peso: 30 }, { nombre: 'Prueba 2', peso: 30 }, { nombre: 'Examen', peso: 40 }];
const otra = [{ nombre: 'Prueba 1', peso: 20 }, { nombre: 'Examen', peso: 80 }];
const fila = (estructura, respaldos) => ({ ramo_key: val(`claveReporte(${J(ramo)})`), estructura, huella: 'x', respaldos,periodo:val('semester()'),seccion:null });
const consenso = filas => vm.runInContext(`_consensoPorTenant.set(claveCacheConsenso('fen',semester(),null),${J(filas)})`, ctx);
const ofrece = async () => { const h = await val('consensoParaRamo')(val('S.ramos[0]')); return h ? h.respaldos : null; };

(async () => {
  vm.runInContext(`supabaseClient={};currentUser={id:'test'};S.tenant='fen';S.ramos=${J([ramo])};currentRamoId='r1'`, ctx);

  console.log('\n=== Dejar la mía calla el aviso ===');
  consenso([fila(reportada, 5)]);
  chk('sin descartar, se ofrece', await ofrece() === 5);
  await val('dejarLaMia')('r1');
  chk('queda guardado con cuántos eran', J(val('S.ramos[0].consensoDescartado.respaldos')) === '5');
  chk('ya no se ofrece', await ofrece() === null);
  chk('la pauta del estudiante no cambia', val('S.ramos[0].categorias.length') === 2);

  console.log('\n=== Vuelve con cuatro personas más ===');
  consenso([fila(reportada, 8)]);
  chk('con tres más sigue callado', await ofrece() === null);
  consenso([fila(reportada, 9)]);
  chk('con cuatro más vuelve', await ofrece() === 9);

  console.log('\n=== Otra pauta distinta sí se avisa ===');
  consenso([fila(reportada, 5), fila(otra, 3)]);
  chk('la descartada se salta y se ofrece la otra', await ofrece() === 3);

  console.log('\n=== Cuentas que ya existen ===');
  vm.runInContext(`S.ramos=${J([ramo])}`, ctx);
  consenso([fila(reportada, 5)]);
  chk('un ramo sin el campo se comporta como antes', await ofrece() === 5);

  console.log('\n=== El botón ===');
  chk('Dejar la mía llama a dejarLaMia', /onclick="dejarLaMia\([^"]*\)">Dejar la mía/.test(fs.readFileSync(raiz + 'app.js', 'utf8')));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  if (fail) process.exit(1);
})();
