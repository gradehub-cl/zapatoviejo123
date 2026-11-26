// Las once pautas FEN transcritas del catálogo de intercambio (Otoño 2026).
//
// Dos cosas que un cambio de datos puede romper sin que nada lance error:
//   1. Que alguien "arregle" un porcentaje y la pauta deje de ser la del
//      programa. Los pesos van escritos acá, contra el PDF.
//   2. Que una cuenta que YA tiene uno de estos ramos, con su propia pauta y
//      sus notas, cambie al aparecer el preset con el mismo nombre.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, select() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null } };
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

console.log('\n=== Los pesos son los del programa ===');
const ESPERADAS = {
  'Introducción a la Macroeconomía': 'Controles:50x6|Examen:30x1|Seguimiento Macro:5x1|Análisis Flash:5x1|Macro Influencers:10x1',
  'Estadística II': 'Solemne 1:25x1|Solemne 2:25x1|Controles:50x6',
  'Microeconomía I': 'Solemne 1:30x1|Solemne 2:30x1|Examen:40x1',
  'Macroeconomía I': 'Solemne:40x1|Examen:40x1|Controles:20x9',
  'Historia Económica': 'Control 1:15x1|Control 2:15x1|Solemne:30x1|Examen:40x1',
  'Microeconomía II': 'Solemne:35x1|Examen:35x1|Tareas:20x1|Asistencia:10x1',
  'Macroeconomía III': 'Controles de Lectura:25x1|Solemne:30x1|Examen:30x1|Trabajo Grupal:15x1',
  'Microeconomía IV': 'Controles de lectura:20x3|Controles sorpresa:10x1|Solemne:25x1|Examen:25x1|Tareas:20x2',
  'Macroeconomía IV': 'Control de Lectura 1:10x1|Control de Lectura 2:10x1|Control de Lectura 3:10x1|Tareas:20x2|Ensayo:10x1|Examen:40x1',
  'Investigación Operativa': 'Solemne:30x1|Control 1:6x1|Control 2:6x1|Control 3:6x1|Taller Computacional 1:3.6x1|Taller Computacional 2:8.4x1|Examen:40x1',
  'Métodos Cuantitativos': 'Solemne:30x1|Examen:30x1|Controles:30x6|Tareas:10x1',
};
const FEN = g('PRESETS_FEN');
Object.entries(ESPERADAS).forEach(([nombre, esperada]) => {
  const def = FEN[nombre];
  chk(nombre + ' conserva sus ponderaciones', !!def &&
    def.evals.map(([n, p, x]) => n + ':' + p + 'x' + ((x && x.slots) || 1)).join('|') === esperada);
  // Un programa de Otoño no puede llevar fechas a la agenda de otro semestre,
  // ni proteger del consenso los períodos que no son el suyo.
  chk(nombre + ' declara 2026-1 y no trae fechas', !!def && def.periodo === '2026-1' &&
    def.evals.every(([, , x]) => !x || !x.fecha));
  chk(nombre + ' se ofrece al agregar el ramo', !!g('presetRamo')(nombre, 'fen', 'IC'));
});

console.log('\n=== El de Auditoría e IICG no le llega a Ing. Comercial ===');
chk("'Métodos Cuantitativos I' sigue sin pauta", g('findPresetName')('Métodos Cuantitativos I', 'fen', 'IC') === null);
chk("'Métodos Cuantitativos II' sigue sin pauta", g('findPresetName')('Métodos Cuantitativos II', 'fen', 'IC') === null);

console.log('\n=== Una compuerta del programa topa la nota ===');
{
  // Investigación Operativa: "si cumple NF ≥ 4,0 pero no NEX ≥ 3,0, su nota
  // final será 3,8". Todo con 6,0 y examen 2,5 pondera 4,6.
  const p = g('presetRamo')('Investigación Operativa', 'fen', 'IICG');
  const r = { id: 'io', nombre: 'Investigación Operativa', origen: { tenant: 'fen', carrera: 'IICG' }, gates: p.gates,
    categorias: p.categorias.map(c => ({ ...c, notas: [{ id: 'n' + c.id, valor: c.nombre === 'Examen' ? 2.5 : 6.0, peso: 1 }] })) };
  chk('examen bajo 3,0 deja la final en 3,8', Math.abs(g('ramoAvg')(r) - 3.8) < 1e-9);
  r.categorias.find(c => c.nombre === 'Examen').notas[0].valor = 3.0;
  chk('con 3,0 en el examen vale el promedio ponderado (4,8)', Math.abs(g('ramoAvg')(r) - 4.8) < 1e-9);
}

console.log('\n=== Una cuenta que ya tenía el ramo no cambia sola ===');
{
  // Pauta propia, distinta de la del programa, con notas y sin compuertas.
  const categorias = () => [
    { id: 'a', nombre: 'Pruebas', peso: 70, notas: [{ id: 'n1', nombre: 'P1', valor: 5.2, peso: 1 }, { id: 'n2', nombre: 'P2', valor: 3.1, peso: 1 }] },
    { id: 'b', nombre: 'Examen', peso: 30, notas: [{ id: 'n3', nombre: 'Examen', valor: 4.4, peso: 1 }] },
  ];
  const base = { id: 'r1', nombre: 'Macroeconomía I', color: '#000', creditos: 6, origen: { tenant: 'fen', carrera: 'IC' }, gates: [] };
  const cargar = ramo => g('normalize')({ tenant: 'fen', carrera: 'IC', ramos: [JSON.parse(JSON.stringify(ramo))] }).ramos[0];
  const esencia = x => JSON.stringify(x.categorias.map(c => [c.id, c.nombre, c.peso, c.notas.map(n => [n.id, n.valor])]));
  const intacto = (caso, guardado) => {
    const antes = g('ramoAvg')(JSON.parse(JSON.stringify(guardado))), r = cargar(guardado);
    chk(caso + ': mismas evaluaciones, pesos y notas', esencia(r) === esencia(guardado));
    chk(caso + ': no gana compuertas', (r.gates || []).length === 0);
    chk(caso + ': no gana eximición, recuperativo ni regla de ausencias', !r.eximicion && !r.recuperativo && !r.reglasAusenciaJustificada);
    chk(caso + ': mismo promedio', Math.abs(g('ramoAvg')(r) - antes) < 1e-9);
    return r;
  };
  // Escrita a mano (sin huella): su versión manda y no se le ofrece nada.
  const aMano = intacto('pauta escrita a mano', { ...base, categorias: categorias(), pautaHuella: null });
  chk('pauta escrita a mano: no se le ofrece cambiarla', g('cambioDePauta')(aMano) === null);
  // Recibida del consenso y sin editar: se le OFRECE la del programa, pero
  // cargar la cuenta no la cambia. El cambio es un botón, no un efecto.
  const deConsenso = intacto('pauta del consenso', { ...base, categorias: categorias(), pautaHuella: 'Pruebas:70|Examen:30', consensoRespaldos: 4 });
  chk('pauta del consenso: el cambio queda como oferta', g('cambioDePauta')(deConsenso) !== null);
}

console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
