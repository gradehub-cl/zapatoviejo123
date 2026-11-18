// El agente ve las reglas de un ramo en `ver_ramo` (Lucas, 2026-11-17: «que
// puedan ver bien todas las reglas, como las del ramo Revelación y Fe»).
// Datos sintéticos: un ramo con las mismas FORMAS de regla (eximición con
// nota máxima, bonus, descarte, compuerta, faltas), sin atarse al catálogo.
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const pauta = [['Evaluación 1', 20], ['Evaluación 2', 20], ['Evaluación 3', 30], ['Examen final', 30]];
const ramo = {
  id: 'rs', nombre: 'Curso Sintético de Reglas', sigla: 'SIN123', seccion: 1, creditos: 10,
  origen: { tenant: 'uc', carrera: null, ramoKey: 'curso sintetico de reglas' },
  faltas: { activo: true, cantidad: 2, limite: 6 },
  categorias: [
    { id: 'c0', nombre: 'Evaluación 1', peso: 20, notas: [{ id: 'n1', nombre: 'Evaluación 1', valor: 6, peso: 1 }] },
    { id: 'c1', nombre: 'Evaluación 2', peso: 20, notas: [{ id: 'n2', nombre: 'Evaluación 2', valor: 6.2, peso: 1 }] },
    { id: 'c2', nombre: 'Evaluación 3', peso: 30, notas: [{ id: 'n3', nombre: 'Evaluación 3', valor: 5.8, peso: 1 }] },
    { id: 'c3', nombre: 'Examen final', peso: 30, notas: [] },
  ],
  gates: [],
  eximicion: { secciones: [1, 2], evaluacion: 'Examen final', segun: ['Evaluación 1', 'Evaluación 2', 'Evaluación 3'], min: 5.95, promedio: 'simple',
    notaExamen: 'maxima', maxInasistencias: 6, ignoraDescartes: true, requierePautaOriginal: true, requiereConfirmacion: false, pauta },
  bonus: [{ id: 'texto', secciones: [1, 2], entrada: 'confirmacion', destino: 'grupo', catIds: ['c0', 'c1', 'c2'], operacion: 'promediar', valor: 7, etapa: 'previa',
    pregunta: 'Presenté un texto', ayuda: 'Promedia un 7,0 con la menor de E1, E2 y E3.' }],
  reglasDelCurso: ['Una evaluación no rendida sin justificación recibe un 1,0'],
};
const conCompuerta = { ...ramo, id: 'rc', nombre: 'Curso Sintético con Mínimo', sigla: 'SIN456', eximicion: undefined, bonus: undefined, reglasDelCurso: undefined, faltas: undefined, seccion: undefined,
  categorias: [{ id: 'q', nombre: 'Controles', peso: 40, slots: 3, dropLowest: { count: 1 }, notas: [] }, { id: 'x', nombre: 'Examen', peso: 60, notas: [] }],
  gates: [{ type: 'min_grade_required', catId: 'x', min: 3.5, cap: 3.9, nombre: 'Examen' }] };

// La app guarda en el ramo una copia de solo texto de las reglas del curso y
// de las que el motor no calcula, porque el servidor no tiene el catálogo.
function el() { return { style: { setProperty() {} }, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, dataset: {}, value: '', innerHTML: '', textContent: '',
  addEventListener() {}, appendChild() {}, setAttribute() {}, removeAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {} }; }
const app = { console, window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
  document: { getElementById: el, querySelector: () => el(), querySelectorAll: () => [], createElement: el, addEventListener() {}, documentElement: el(), body: el(), head: { appendChild() {} } },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, location: { origin: '', pathname: '/', search: '', hash: '' },
  history: { replaceState() {} }, setTimeout, clearTimeout, requestAnimationFrame() { return 1; } };
vm.createContext(app);
for (const f of ['data.js', 'engine.js', 'app.js']) vm.runInContext(leer(f), app, { filename: f });
vm.runInContext(`PRESETS_FEN['Curso Sintético con Texto']={evals:[['Parcial',50],['Examen',50]],
  reglasDelCurso:['Sin justificar en 48 horas, la evaluación vale 1,0'],noCalcula:['Un taller opcional sube una décima']};`, app);
const normalizado = (extra = {}) => JSON.parse(vm.runInContext(`JSON.stringify(normalize({tenant:'fen',ramos:[${JSON.stringify({ id: 'rt', nombre: 'Curso Sintético con Texto', gates: [], creditos: 6,
  origen: { tenant: 'fen', carrera: null, ramoKey: 'curso sintetico con texto' },
  categorias: [{ id: 'p', nombre: 'Parcial', peso: 50, notas: [{ id: 'np', nombre: 'Parcial', valor: 5, peso: 1 }] }, { id: 'e', nombre: 'Examen', peso: 50, notas: [] }], ...extra })}]}).ramos[0])`, app));
const conTexto = normalizado();
chk('la app copia las reglas del curso en el ramo', conTexto.reglasDelCurso?.[0] === 'Sin justificar en 48 horas, la evaluación vale 1,0');
chk('y las que el motor no calcula', conTexto.reglasNoCalculadas?.[0] === 'Un taller opcional sube una décima');
chk('las notas no cambian', conTexto.categorias[0].notas[0].valor === 5);
const manual = JSON.parse(vm.runInContext(`JSON.stringify(normalize({tenant:'fen',ramos:[{id:'rm',nombre:'Curso Sintético con Texto',reglasDelCurso:['vieja'],reglasNoCalculadas:['vieja'],categorias:[]}]}).ramos[0])`, app));
chk('un ramo manual del mismo nombre no recibe reglas y pierde una copia vieja', !('reglasDelCurso' in manual) && !('reglasNoCalculadas' in manual));

const mcp = { console, Response, structuredClone, Intl, HERRAMIENTAS: [], NOMBRES: ['ver_ramo', 'que_necesito_para_aprobar'],
  fetch: async () => ({ ok: true, json: async () => ({ tenant: 'uc', ramos: [structuredClone(ramo), structuredClone(conCompuerta), structuredClone(conTexto)] }) }), module: { exports: {} }, exports: {} };
vm.createContext(mcp);
vm.runInContext(leer('engine.js'), mcp);
mcp.motorCompartido = { gh_crearCalculoRamo: mcp.module.exports.gh_crearCalculoRamo };
vm.runInContext(leer('functions/mcp/[[ruta]].js').replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '') + ';globalThis.__mcp={onRequestPost};', mcp);
const tool = async (name, args) => {
  const r = await mcp.__mcp.onRequestPost({ params: { ruta: ['f'.repeat(64)] },
    request: { json: async () => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args || {} } }) } });
  return JSON.parse((await r.json()).result.content[0].text);
};
(async () => {
  const v = await tool('ver_ramo', { ramo: 'SIN123' });
  chk('se encuentra por sigla, como promete la herramienta', v.nombre === 'Curso Sintético de Reglas' && v.sigla === 'SIN123');
  const ex = v.reglas && v.reglas.eximicion;
  chk('muestra la eximición: evaluación, mínimo y faltas', ex && ex.evaluacion === 'Examen final' && ex.minimo === 5.95 && ex.maxInasistencias === 6 && ex.faltasRegistradas === 2);
  chk('con su estado calculado por el motor', ex && ex.cumple === true && ex.activa === true);
  chk('y un texto en español con coma decimal', ex && /desde 5,95 y con 6 faltas/.test(ex.texto));
  chk('muestra el bonus con su explicación', v.reglas.bonus?.[0]?.pregunta === 'Presenté un texto' && /7,0/.test(v.reglas.bonus[0].texto));
  chk('muestra las faltas y la sección', v.reglas.faltas?.maximo === 6 && v.reglas.seccion === 1);
  chk('muestra las reglas del curso que la app guardó en el ramo', v.reglas.reglasDelCurso?.[0] === 'Una evaluación no rendida sin justificación recibe un 1,0');
  chk('sigue entregando las evaluaciones con sus notas', v.evaluaciones.length === 4 && v.evaluaciones[0].notas[0].valor === 6);
  const c = await tool('ver_ramo', { ramo: 'Curso Sintético con Mínimo' });
  chk('muestra el descarte de la nota más baja', c.reglas?.descartes?.[0]?.evaluacion === 'Controles' && c.reglas.descartes[0].seDescartan === 1);
  chk('muestra la compuerta con su mínimo y tope', c.reglas?.compuertas?.[0]?.minimo === 3.5 && /mínimo 3,5; si no, la final queda en 3,9/.test(c.reglas.compuertas[0].texto));
  chk('un ramo sin eximición no inventa una', !('eximicion' in c.reglas));
  const t = await tool('ver_ramo', { ramo: 'Curso Sintético con Texto' });
  chk('el agente ve la copia que guardó la app', t.reglas?.reglasDelCurso?.[0]?.includes('1,0') && t.reglas?.reglasNoCalculadas?.length === 1);
  const n = await tool('que_necesito_para_aprobar', { ramo: 'sin123' });
  chk('la sigla también sirve para la nota necesaria', n.ramo === 'Curso Sintético de Reglas');
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
