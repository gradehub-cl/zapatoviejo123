// Un requisito de grupo que el catálogo agrega le llega a quien ya tenía el ramo.
//
// `cambioDePauta` comparaba nombres, pesos y dos tipos de regla. Un `group_min`
// nuevo —"bajo 4,0 en las individuales repruebas"— no movía nada de eso, así
// que el ramo ya cargado seguía mostrando un promedio sin tope y nunca le
// ofrecía actualizar. La pauta es sintética: lo que se prueba es el mecanismo.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'render-main.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return stub }, clientWidth: 400, dataset: {}, click() {} };
const ctx = {
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: { style: { setProperty() {}, removeProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } }, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console,
};
vm.createContext(ctx); vm.runInContext(src, ctx);
const val = n => vm.runInContext(n, ctx);

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const RAMO = 'Ramo Sintético de Prueba';
const EVALS = [['Solemne', 30], ['Controles', 20], ['Trabajo Grupal', 20], ['Examen', 30]];
const GRUPO = { nombre: 'Evaluaciones individuales', evals: ['Solemne', 'Controles', 'Examen'], min: 4.0, cap: 'self' };
const publicar = grupos => val(`PRESETS_POR_TENANT.fen[${JSON.stringify(RAMO)}]=${JSON.stringify({ evals: EVALS, grupos })}`);

// El ramo como lo guardó quien lo cargó ANTES de que el preset trajera el grupo.
const cargar = grupos => {
  publicar(grupos);
  const p = val(`presetRamo(${JSON.stringify(RAMO)},'fen',null)`);
  const r = { id: 'r1', nombre: RAMO, color: '#000', creditos: null, origen: { tenant: 'fen', carrera: null },
    aporta: null, categorias: p.categorias, gates: p.gates };
  r.categorias.forEach(c => { c.notas = [{ id: 'n-' + c.id, nombre: 'Nota', valor: c.nombre === 'Trabajo Grupal' ? 7 : 3.5, peso: 1 }]; });
  r.pautaHuella = val(`huellaPauta(${JSON.stringify(r.categorias)})`);
  val(`S = ${JSON.stringify({ ...val('S'), tenant: 'fen', ramos: [r] })}`);
  return () => val('S.ramos[0]');
};

console.log('\n=== El catálogo agrega el requisito ===');
let ramo = cargar([]);
chk('sin el requisito, el trabajo grupal lo deja sobre 3,5', val('ramoAvg(S.ramos[0])') > 3.5);
publicar([GRUPO]);
let cambio = val('cambioDePauta(S.ramos[0])');
chk('se ofrece el cambio', !!cambio);
chk('el cambio nombra el requisito nuevo', !!cambio && cambio.cambios.some(c => c.nombre === 'Nuevo requisito: Evaluaciones individuales con promedio 4,0 o más'));
chk('no inventa cambios de peso', !!cambio && cambio.cambios.every(c => c.tipo === 'regla'));
chk('no se aplica solo: el ramo sigue sin compuerta', ramo().gates.length === 0);
chk('se aplica al apretar Actualizar', val(`actualizarPauta('r1')`) === true);
chk('la compuerta apunta a las evaluaciones del ramo', ramo().gates.length === 1 &&
  ramo().gates[0].catIds.every(id => ramo().categorias.some(c => c.id === id)));
chk('las notas siguen ahí', ramo().categorias.every(c => c.notas.length === 1));
chk('ahora el promedio queda topado en 3,5', Math.abs(val('ramoAvg(S.ramos[0])') - 3.5) < 1e-9);
chk('después de actualizar ya no ofrece nada', val('cambioDePauta(S.ramos[0])') === null);

console.log('\n=== Lo que no es un cambio ===');
ramo = cargar([{ ...GRUPO, nombre: 'Individuales' }]);
publicar([GRUPO]);
chk('renombrar el requisito no cuenta: no mueve ninguna nota', val('cambioDePauta(S.ramos[0])') === null);
ramo = cargar([]);
val(`S.ramos[0].categorias[0].peso=35;S.ramos[0].categorias[1].peso=15`);
publicar([GRUPO]);
chk('si el estudiante editó la pauta, no se opina', val('cambioDePauta(S.ramos[0])') === null);

console.log('\n=== El catálogo saca el requisito ===');
ramo = cargar([GRUPO]);
publicar([]);
cambio = val('cambioDePauta(S.ramos[0])');
chk('también se ofrece', !!cambio && cambio.cambios.some(c => c.nombre === 'Deja de exigirse: Evaluaciones individuales con promedio 4,0 o más'));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
