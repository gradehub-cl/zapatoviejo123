// Comunicación (FEN): sin 4,0 en lo individual, se reprueba (#627).
//
// Programa ENCOM1005, Primavera 2026, 4.2.4: las grupales solo cuentan con
// promedio individual de al menos 4,0; si no, se reprueba. Antes quedaba en
// noCalcula y el promedio podía salir APROBADO para quien reprobaba. Es un test
// de CONTENIDO de esa pauta: las evaluaciones se buscan por nombre, no por
// índice, para que un cambio de datos salga como comprobación en rojo.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx);
['data.js', 'engine.js', 'app.js'].forEach(f => vm.runInContext(fs.readFileSync(raiz + f, 'utf8'), ctx));
const g = n => vm.runInContext(n, ctx);
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

g("S.tenant='fen';S.carrera='IC';S.ramos=[]");
const INDIVIDUALES = ['Pitch inicial individual', 'Columna de opinión', 'Solemne: elevator pitch', 'Examen: video storytelling'];
const ramo = notas => {
  const p = g('presetRamo')('Comunicación', 'fen', 'IC');
  const r = { id: 'r', nombre: 'Comunicación', color: '#000', origen: { tenant: 'fen', carrera: 'IC' }, categorias: p.categorias, gates: p.gates };
  r.categorias.forEach((c, i) => { const v = notas(c.nombre); if (v != null) c.notas = [{ id: 'n' + i, nombre: c.nombre, valor: v, peso: 1 }]; });
  g('S').ramos = [r];
  return r;
};

const p = g('presetRamo')('Comunicación', 'fen', 'IC');
const nombres = new Map(p.categorias.map(c => [c.id, c.nombre]));
const grupo = (p.gates || []).find(x => x.type === 'group_min');
chk('la pauta trae el requisito de las individuales', !!grupo && grupo.min === 4 && grupo.cap === 'self');
chk('con las cuatro individuales del programa, y nada más', !!grupo &&
  JSON.stringify(grupo.catIds.map(id => nombres.get(id)).sort()) === JSON.stringify([...INDIVIDUALES].sort()));
chk('suman 60% como dice su tabla', p.categorias.filter(c => INDIVIDUALES.includes(c.nombre)).reduce((a, c) => a + c.peso, 0) === 60);

// Individuales en 3,0 y el resto en 7,0: sin el requisito daba 0,6·3 + 0,4·7 = 4,6.
const reprobado = ramo(n => INDIVIDUALES.includes(n) ? 3.0 : 7.0);
chk('con 3,0 en lo individual y 7,0 en lo grupal, reprueba', g('ramoAvg')(reprobado) < 3.95);
chk('y queda en su promedio individual', Math.abs(g('ramoAvg')(reprobado) - 3.0) < 1e-9);

const aprobado = ramo(n => INDIVIDUALES.includes(n) ? 5.0 : 6.0);
chk('con 5,0 en lo individual el requisito no toca nada', Math.abs(g('ramoAvg')(aprobado) - (0.6 * 5 + 0.4 * 6)) < 1e-9);

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
