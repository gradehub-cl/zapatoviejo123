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

// Mínimo de examen dicho también cuando no hay. La huella la arma la app
// (huellaPauta), así el servidor y pautaEditada se comparan con el mismo dato.
const pronto = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const catsExamen = () => [
  { id: 'e1', nombre: 'Interrogación 1', peso: 35, notas: [{ id: 'ne1', nombre: 'Interrogación 1', valor: 4.8, peso: 1, editadaEn: '2026-09-20T14:05:00.000Z' }] },
  { id: 'e2', nombre: 'Interrogación 2', peso: 35, fecha: pronto, hora: '22:33', fechaOrigen: 'calendario', horaOrigen: 'calendario', notas: [] },
  { id: 'e3', nombre: 'Examen', peso: 30, fecha: '2099-12-10', fechaOrigen: 'usuario', notas: [] },
];
const huella = cats => vm.runInContext(`huellaPauta(${JSON.stringify(cats)})`, app);
const sinMinimoOficial = { id: 'so', nombre: 'Cálculo Sintético', origen: { tenant: 'uc', ramoKey: 'calculo sintetico' }, gates: [], categorias: catsExamen(), pautaHuella: huella(catsExamen()), exigencia: 60 };
const editadas = catsExamen(); editadas[0].peso = 40; editadas[1].peso = 30;
const sinMinimoEditada = { ...sinMinimoOficial, id: 'se', nombre: 'Cálculo Sintético Editado', categorias: editadas, exigencia: undefined, exigenciaPuntaje: 55 };
const reglamento = { id: 'ud', nombre: 'Curso Sintético UDD', origen: { tenant: 'udd', ramoKey: 'curso sintetico udd' }, gates: [], categorias: catsExamen() };
const sinExamen = { id: 'sx', nombre: 'Taller Sintético', origen: { tenant: 'uc', ramoKey: 'taller sintetico' }, gates: [],
  categorias: [{ id: 't', nombre: 'Talleres', peso: 100, slots: 4, notas: [
    { id: 't1', nombre: 'Taller 1', valor: 5, peso: 1, slot: 0 },
    { id: 't3', nombre: 'Taller 3', valor: null, peso: 1, slot: 2, fecha: '2099-10-01', fechaOrigen: 'usuario' }] }] };
chk('la app ve sin editar la pauta oficial', vm.runInContext(`pautaEditada(${JSON.stringify(sinMinimoOficial)})`, app) === false);
chk('y editada la que cambió de pesos', vm.runInContext(`pautaEditada(${JSON.stringify(sinMinimoEditada)})`, app) === true);

const mcp = { console, Response, structuredClone, Intl, HERRAMIENTAS: [], NOMBRES: ['ver_ramo', 'que_necesito_para_aprobar', 'puntaje_a_nota', 'evaluaciones_proximas'],
  fetch: async () => ({ ok: true, json: async () => ({ tenant: 'uc', ramos: [ramo, conCompuerta, conTexto, sinMinimoOficial, sinMinimoEditada, reglamento, sinExamen].map(x => structuredClone(x)) }) }), module: { exports: {} }, exports: {} };
vm.createContext(mcp);
vm.runInContext(leer('engine.js'), mcp);
mcp.motorCompartido = { gh_crearCalculoRamo: mcp.module.exports.gh_crearCalculoRamo, gh_notaDesdePuntaje: mcp.module.exports.gh_notaDesdePuntaje };
vm.runInContext(leer('functions/mcp/[[ruta]].js').replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '') + ';globalThis.__mcp={onRequestPost};', mcp);
const crudo = async (name, args) => {
  const r = await mcp.__mcp.onRequestPost({ params: { ruta: ['f'.repeat(64)] },
    request: { json: async () => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args || {} } }) } });
  return (await r.json()).result;
};
const tool = async (name, args) => JSON.parse((await crudo(name, args)).content[0].text);
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

  console.log('=== examen: el mínimo se dice también cuando no hay ===');
  chk('con compuerta en la pauta: mínimo 3,5 y su origen', c.examen?.minimo === 3.5 && c.examen.reglas?.[0]?.origen === 'pauta' && /mínimo 3,5/.test(c.examen.texto));
  const so = await tool('ver_ramo', { ramo: 'Cálculo Sintético' });
  chk('pauta oficial sin mínimo: lo dice explícito', so.examen?.minimo === null && so.examen.pautaOficialSinEditar === true && /no tiene nota mínima: el programa cargado/.test(so.examen.texto));
  const se = await tool('ver_ramo', { ramo: 'Cálculo Sintético Editado' });
  chk('pauta editada sin mínimo: pide confirmarlo con el programa', se.examen?.minimo === null && se.examen.pautaOficialSinEditar === false && /confírmalo con el programa/.test(se.examen.texto));
  const ud = await tool('ver_ramo', { ramo: 'Curso Sintético UDD' });
  chk('sin compuerta guardada rige el reglamento de la universidad', ud.examen?.minimo === 3 && ud.examen.reglas?.[0]?.origen === 'reglamento' && /reglamento/.test(ud.examen.texto));
  chk('el reglamento no aparece como compuerta guardada', !ud.reglas?.compuertas);
  const sx = await tool('ver_ramo', { ramo: 'Taller Sintético' });
  chk('un ramo sin examen lo dice', Array.isArray(sx.examen?.evaluaciones) && !sx.examen.evaluaciones.length && sx.examen.minimo === null);

  console.log('=== fechas, horas y notas con su origen ===');
  const i2 = so.evaluaciones.find(e => e.nombre === 'Interrogación 2');
  chk('la evaluación trae fecha y hora', i2.fecha === pronto && i2.hora === '22:33');
  chk('y dice que la hora vino de un calendario, no de la persona', i2.origenHora === 'calendario' && i2.origenFecha === 'calendario');
  const examenSo = so.evaluaciones.find(e => e.nombre === 'Examen');
  chk('sin hora no inventa una ni su origen', examenSo.hora === null && examenSo.origenHora === null && examenSo.origenFecha === 'usuario');
  chk('una nota dice cuándo cambió', so.evaluaciones[0].notas[0].editadaEn === '2026-09-20T14:05:00.000Z');
  chk('una nota sin registro no recibe fecha inventada', !('editadaEn' in v.evaluaciones[0].notas[0]));
  const tal = sx.evaluaciones[0];
  chk('la nota dice su casilla contada desde 1', tal.notas[0].casilla === 1 && tal.notas.length === 1);
  chk('la casilla con fecha propia aparece aunque no tenga nota', tal.fechasPorCasilla?.[0]?.casilla === 3 && tal.fechasPorCasilla[0].fecha === '2099-10-01');
  const proximas = await tool('evaluaciones_proximas', { dias: 10 });
  const i2p = proximas.find(p => p.ramo === 'Cálculo Sintético' && p.evaluacion === 'Interrogación 2');
  chk('evaluaciones_proximas lleva el origen de la hora', i2p?.hora === '22:33' && i2p.origenHora === 'calendario');

  console.log('=== exigencia y lo que no se guarda ===');
  chk('la exigencia del ramo con su origen', so.exigencia?.porcentaje === 60 && so.exigencia.origen === 'ramo');
  chk('la de la calculadora si es la única', se.exigencia?.porcentaje === 55 && se.exigencia.origen === 'calculadora');
  chk('sin exigencia lo dice', v.exigencia?.porcentaje === null && /50 %/.test(v.exigencia.texto));
  chk('sinDato nombra puntaje máximo, origen de la nota, sala y temario',
    ['puntajeMaximo', 'origenNota', 'sala', 'temario'].every(k => typeof v.sinDato?.[k] === 'string'));

  console.log('=== puntaje_a_nota usa la fórmula del motor ===');
  const p1 = await tool('puntaje_a_nota', { puntaje: 2, total: 3, exigencia: 60 });
  chk('2 de 3 con 60 % es un 4,5', p1.nota === 4.5 && p1.puntajeAprobacion === 1.8 && p1.origenExigencia === 'pedida');
  const p2 = await tool('puntaje_a_nota', { puntaje: 2, total: 3, ramo: 'Cálculo Sintético' });
  chk('sin exigencia usa la del ramo', p2.exigencia === 60 && p2.origenExigencia === 'ramo' && p2.nota === 4.5);
  const p3 = await tool('puntaje_a_nota', { puntaje: 25, total: 50 });
  chk('sin ramo ni exigencia usa 50 % y lo dice', p3.nota === 4 && p3.origenExigencia === 'por_defecto' && /50 %/.test(p3.supuesto));
  const p4 = await crudo('puntaje_a_nota', { puntaje: 4, total: 3 });
  chk('un puntaje sobre el total es un error MCP', p4.isError === true);
  const p5 = await crudo('puntaje_a_nota', { puntaje: 1, total: 3, exigencia: 0.6 });
  chk('una exigencia escrita como fracción se rechaza', p5.isError === true && /porcentaje/.test(p5.content[0].text));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
