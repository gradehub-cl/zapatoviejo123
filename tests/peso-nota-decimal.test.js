// El peso de una nota admite decimales (2,5%).
//
// La ponderación personalizada de una nota era solo un slider de 1 a 100 y se
// guardaba con parseInt: quien escribía 2,5 quedaba con 2. Ahora hay un campo
// como el de la ponderación de una evaluación. Pauta escrita acá, sin catálogo.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'render-main.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' }, history: { replaceState() {} }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const val = n => vm.runInContext(n, ctx);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

let campos = {};
ctx.document.getElementById = id => campos[id] || stub;
ctx.renderRamo = () => {}; ctx.renderAgenda = () => {}; ctx.closeModal = () => {}; ctx.showToast = () => {}; ctx.track = () => {}; ctx.vibrar = () => {};
vm.runInContext(`save=()=>{};S={tenant:'fen',ramos:[{id:'r1',nombre:'Ramo de prueba',categorias:[{id:'c1',nombre:'Controles',peso:100,directNota:false,notas:[]}]}]};currentRamoId='r1';`, ctx);
const notas = () => val("S.ramos[0].categorias[0].notas");
const agregar = (nombre, valor, peso) => {
  campos = { 'm-nota-name': { value: nombre }, 'm-nota-val': { value: valor }, 'm-nota-fecha': { value: '' }, 'm-nota-hora': { value: '' },
    'm-pond-toggle': { checked: true }, 'm-nota-peso-num': { value: peso } };
  val('confirmAddNota')('c1');
};

console.log('\n=== Agregar con decimales ===');
agregar('Control 1', '6', '2,5');
chk('2,5 con coma se guarda como 2.5', notas()[0].peso === 2.5);
agregar('Control 2', '4', '7.5');
chk('7.5 con punto también', notas()[1].peso === 7.5);
const avg = val('ramoAvg')(val('S.ramos[0]'));
chk('el promedio pondera 2,5 y 7,5 (6·2,5+4·7,5)/10 = 4,5', Math.abs(avg - 4.5) < 1e-9);
agregar('Control 3', '', '');
chk('vacío vuelve a 40, como antes', notas()[2].peso === 40);
agregar('Control 4', '', '250');
chk('más de 100 queda en 100', notas()[3].peso === 100);

console.log('\n=== Editar conserva el decimal ===');
const id = notas()[0].id;
campos['m-nota-name'] = { value: 'Control 1' }; campos['m-nota-val'] = { value: '6' }; campos['m-nota-peso-num'] = { value: '2,5' };
val('confirmEditNota')('c1', id);
chk('sigue en 2.5 después de editar', notas()[0].peso === 2.5);
chk('el campo muestra 2,5 con coma', /value="2,5"/.test(val('pesoNotaHTML')(2.5)));
chk('el slider queda en el entero más cercano', /type="range"[^>]*value="3"/.test(val('pesoNotaHTML')(2.5)));

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
