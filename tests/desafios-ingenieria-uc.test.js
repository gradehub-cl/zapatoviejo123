// Desafíos de la Ingeniería (ING1004): dos bloques que se aprueban por separado.
//
// Programa del Primer Semestre 2026: "promedio ponderado tanto en la
// evaluación individual como en la grupal superior o igual a 4,0. Si se
// reprueba una de las dos instancias la nota de reprobación será el mínimo
// entre la nota obtenida y un 3,9". Es un test de CONTENIDO de esa pauta: se
// busca por nombre, no por índice.
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

g("S.tenant='uc';S.carrera='ING-PC';S.ramos=[]");
const INDIVIDUAL = ['Participación en talleres', 'Tareas', 'Actividades y cuestionarios'];
const GRUPAL = ['Presentaciones', 'Pre-Feria', 'Feria Tecnológica'];
const p = g('presetRamo')('Desafíos de la Ingeniería', 'uc', 'ING-PC');
chk('la pauta se carga para Ingeniería UC', !!p && p.categorias.length === 6);
chk('suma 100%', !!p && Math.abs(p.categorias.reduce((a, c) => a + c.peso, 0) - 100) < 1e-9);
const peso = n => (p.categorias.find(c => c.nombre === n) || {}).peso;
chk('cada bloque pesa 50%', [INDIVIDUAL, GRUPAL].every(b => Math.abs(b.reduce((a, n) => a + peso(n), 0) - 50) < 1e-9));
chk('cuatro tareas y tres presentaciones, como el programa', p.categorias.find(c => c.nombre === 'Tareas').slots === 4 && p.categorias.find(c => c.nombre === 'Presentaciones').slots === 3);
const nombres = new Map(p.categorias.map(c => [c.id, c.nombre]));
const grupos = p.gates.filter(x => x.type === 'group_min');
chk('dos requisitos de bloque con tope 3,9', grupos.length === 2 && grupos.every(x => x.min === 4 && x.cap === 3.9));
chk('con las evaluaciones de cada bloque', grupos.some(x => JSON.stringify(x.catIds.map(id => nombres.get(id)).sort()) === JSON.stringify([...INDIVIDUAL].sort()))
  && grupos.some(x => JSON.stringify(x.catIds.map(id => nombres.get(id)).sort()) === JSON.stringify([...GRUPAL].sort())));
chk('se ofrece: no deja la mitad del ramo sin cantidad', g("pautaPresetSuficiente(PRESETS_UC['Desafíos de la Ingeniería'].evals)") === true);
chk('nada de vocabulario FEN', !/solemne/i.test(JSON.stringify(p.categorias.map(c => c.nombre))));

const ramo = notaDe => {
  const q = g('presetRamo')('Desafíos de la Ingeniería', 'uc', 'ING-PC');
  const r = { id: 'r', nombre: 'Desafíos de la Ingeniería', color: '#000', origen: { tenant: 'uc', carrera: 'ING-PC' }, categorias: q.categorias, gates: q.gates };
  let k = 0;
  r.categorias.forEach(c => {
    const v = notaDe(c.nombre);
    const n = c.slots || 1;
    c.notas = Array.from({ length: n }, (_, i) => ({ id: 'n' + (k++), nombre: c.nombre, valor: v, peso: 1, ...(c.slots ? { slot: i } : {}) }));
  });
  g('S').ramos = [r];
  return r;
};
const prom = r => g('ramoAvg')(r);
const conGrupal3 = ramo(n => INDIVIDUAL.includes(n) ? 7.0 : 3.0);
chk('7,0 individual y 3,0 grupal: el promedio daría 5,0, pero reprueba con 3,9', Math.abs(prom(conGrupal3) - 3.9) < 1e-9);
const bajo = ramo(n => INDIVIDUAL.includes(n) ? 3.0 : 3.6);
chk('si ya está bajo 3,9 queda su nota', Math.abs(prom(bajo) - 3.3) < 1e-9);
const bien = ramo(n => INDIVIDUAL.includes(n) ? 5.0 : 6.0);
chk('con los dos bloques aprobados no se toca', Math.abs(prom(bien) - 5.5) < 1e-9);

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
