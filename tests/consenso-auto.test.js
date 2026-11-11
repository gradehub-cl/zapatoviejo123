// El consenso rellena pautas que faltan, y SOLO esas.
//
// La regla dura del proyecto es que las ponderaciones salen de programas
// oficiales. Esto no la rompe: lo que reportan tres estudiantes se aplica
// únicamente donde no hay programa transcrito ni nada escrito por el
// estudiante, y queda marcado como reportado. Lo que estos tests fijan es
// justamente el borde: dónde SÍ y dónde NO.
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

// El guardado real toca localStorage y la nube: acá solo interesa el estado.
let guardados = 0;
ctx.save = () => { guardados++; };

// Un ramo FEN sin pauta oficial. 'Negocios I' está en la malla y no tiene
// programa transcrito, que es exactamente el hueco que esto viene a llenar.
const RAMO = 'Negocios I';
const consenso = (respaldos, estructura) => [{
  ramo: RAMO,
  ramo_key: val(`normName(${JSON.stringify(RAMO)})`),
  estructura,
  huella: 'x',
  respaldos,periodo:val('semester()'),seccion:null,
}];
const EST = [
  { nombre: 'Controles', peso: 30, slots: 3 },
  { nombre: 'Examen', peso: 40, min: 3.5, cap: 3.9 },
  { nombre: 'Trabajo', peso: 30 },
];

const correr = async (filas, ramos) => {
  ctx.cargarConsenso = async () => filas;
  val(`S = ${JSON.stringify({ ...val('S'), ramos })}`);
  const puestas = await ctx.aplicarConsensoAuto();
  return { puestas, ramos: val('S').ramos };
};

const delCatalogo = extra => ({ id: 'a', nombre: RAMO, origen: { tenant: 'fen', carrera: 'IC' }, categorias: [], gates: [], ...extra });

(async () => {

console.log('\n=== Rellena el hueco ===');
{
  const { puestas, ramos } = await correr(consenso(3, EST), [delCatalogo()]);
  const r = ramos[0];
  chk('un ramo del catálogo sin pauta recibe la del consenso', puestas === 1 && r.categorias.length === 3);
  chk('conserva los pesos reportados', r.categorias.map(c => c.peso).join() === '30,40,30');
  chk('reconstruye las compuertas de nota mínima',
    r.gates.length === 1 && r.gates[0].type === 'min_grade_required' && r.gates[0].min === 3.5 && r.gates[0].cap === 3.9);
  chk('la compuerta apunta a la evaluación correcta',
    r.gates[0].catId === (r.categorias.find(c => c.nombre === 'Examen') || {}).id);
  chk('respeta slots', (r.categorias.find(c => c.nombre === 'Controles') || {}).slots === 3);
  chk('queda marcada como reportada, no oficial', r.consensoRespaldos === 3);
  chk('no se devuelve como un voto nuevo', !!r.consensoAportado && val(`pautaPropiaParaConsenso(${JSON.stringify(r)})`) === false);
  chk('no inventa fechas', r.categorias.every(c => !c.fecha));
  chk('deja huella para que cambioDePauta pueda ofrecer la oficial después',
    r.pautaHuella === val(`huellaPauta(${JSON.stringify(r.categorias)})`));
}

console.log('\n=== Dónde NO se mete ===');
{
  const conPauta = delCatalogo({ categorias: [{ id: 'c1', nombre: 'Prueba', peso: 100, notas: [] }] });
  const { puestas, ramos } = await correr(consenso(3, EST), [conPauta]);
  chk('un ramo que ya tiene pauta no se toca', puestas === 0 && ramos[0].categorias.length === 1);
}
{
  const aMano = { id: 'b', nombre: RAMO, origen: null, categorias: [], gates: [] };
  const { puestas } = await correr(consenso(3, EST), [aMano]);
  chk('un ramo vacío creado a mano también recibe el consenso', puestas === 1);
}
{
  const nombre='Contabilidad';
  const fila={...consenso(3,EST)[0],ramo:nombre,ramo_key:val(`normName(${JSON.stringify(nombre)})`)};
  const r={id:'b',nombre,origen:null,categorias:[],gates:[]};
  const {puestas}=await correr([fila],[r]);
  chk('un ramo manual con pauta oficial disponible no recibe consenso automático',puestas===0);
}
{
  const { puestas } = await correr(consenso(2, EST), [delCatalogo()]);
  chk('con menos respaldos que CONSENSO_AUTO no se aplica', puestas === 0);
}
{
  const { puestas } = await correr([], [delCatalogo()]);
  chk('sin consenso no pasa nada', puestas === 0);
}
{
  ctx.cargarConsenso = async () => null;
  val(`S = ${JSON.stringify({ ...val('S'), ramos: [delCatalogo()] })}`);
  chk('si el consenso no carga, no explota', (await ctx.aplicarConsensoAuto()) === 0);
}
{
  // Contabilidad SÍ tiene programa oficial transcrito. Aunque tres personas
  // reporten otra cosa, el programa manda: el consenso llena huecos, no pisa.
  const oficial = 'Contabilidad';
  const filas = [{ ramo: oficial, ramo_key: val(`normName(${JSON.stringify(oficial)})`), estructura: EST, huella: 'x', respaldos: 9 }];
  const vacio = { id: 'd', nombre: oficial, origen: { tenant: 'fen', carrera: 'IC' }, categorias: [], gates: [] };
  chk('hay pauta oficial para el ramo de control', !!val(`pautaPendiente(${JSON.stringify(vacio)})`));
  const { puestas } = await correr(filas, [vacio]);
  chk('el programa oficial le gana al consenso', puestas === 0);
}

console.log('\n=== El consenso de una sección no depende del general ===');
{
  // Dos secciones con pautas distintas salen de la consulta general, y si era
  // la única fila de la universidad, la general viene vacía.
  const fila = { ...consenso(3, EST)[0], seccion: 1 };
  ctx.cargarConsenso = async (_t, _p, seccion) => (seccion ? [fila] : []);
  val(`S = ${JSON.stringify({ ...val('S'), ramos: [delCatalogo({ seccion: 1 })] })}`);
  chk('con la general vacía, la sección igual recibe su pauta', (await ctx.aplicarConsensoAuto()) === 1);
}

console.log('\n=== Se escribe con la misma clave con que se lee ===');
{
  const CATS = [{ id: 'c1', nombre: 'Pruebas', peso: 60, notas: [] }, { id: 'c2', nombre: 'Examen', peso: 40, notas: [] }];
  const llamadas = [];
  ctx.__rpc = (nombre, args) => { llamadas.push(args); return { error: null }; };
  val('supabaseClient={rpc:async(n,a)=>__rpc(n,a)}');
  const enviar = async r => {
    llamadas.length = 0;
    chk(`se envía el reporte de "${r.nombre}"`, await ctx.aportarPropuestaAlCatalogo(r));
    return llamadas[0] || {};
  };
  // El servidor agrupa por coalesce(ramo_sigla, ramo_norm).
  const claveServidor = a => a.p_ramo_sigla || a.p_ramo_norm;

  const renombrado = { id: 'e', nombre: 'Negocios I (mi sección)', origen: { tenant: 'fen', carrera: 'IC', ramoKey: val(`normName(${JSON.stringify(RAMO)})`) }, categorias: CATS, gates: [] };
  chk('un ramo renombrado vota en la clave de su ramo', claveServidor(await enviar(renombrado)) === ctx.claveReporte(renombrado));

  const alias = 'Estrategia y Presupuestos';
  const sinonimo = { id: 'f', nombre: alias, origen: { tenant: 'fen', carrera: 'CA', ramoKey: val(`ramoKey(${JSON.stringify(alias)},'fen','CA')`) }, categorias: CATS, gates: [] };
  chk('un sinónimo vota en la clave canónica', claveServidor(await enviar(sinonimo)) === val(`normName('Estrategia y Presupuesto')`));

  const conSigla = { id: 'g', nombre: 'Ramo Sintético', origen: { tenant: 'uc', carrera: 'IC', ramoKey: 'ABC1234' }, categorias: CATS, gates: [] };
  const uc = await enviar(conSigla);
  chk('con sigla, ramo_norm sigue siendo el nombre', uc.p_ramo_sigla === 'ABC1234' && uc.p_ramo_norm === 'ramo sintetico');

  chk('ningún reporte manda el nombre como clave', !/p_ramo_norm:normName/.test(fs.readFileSync(raiz + 'app.js', 'utf8')));
}

console.log('\n=== Un ramo UC escrito a mano calza con su sigla ===');
{
  // Sin cursos-uc.js cargado: el servidor resolvió la sigla por el nombre y la
  // app tiene que llegar a la misma clave consultando catalogo_uc.
  const consultas = [];
  let respuesta = () => ({ data: [], error: null });
  ctx.__catalogo = (campo, valores) => { consultas.push([campo, [...valores]]); return respuesta(valores); };
  val(`supabaseClient={from:()=>({select:()=>({in:async(c,v)=>__catalogo(c,v)})})}`);
  val(`S.tenant='uc'`);
  const manual = (nombre, extra) => ({ id: 'm', nombre, categorias: [], gates: [], ...extra });
  const fila = (nombre, clave) => [{ ...consenso(3, EST)[0], ramo: nombre, ramo_key: clave }];
  const fijar = ramos => val(`S = ${JSON.stringify({ ...val('S'), ramos })}`);

  respuesta = () => ({ data: [{ sigla: 'ZZZ1001', nombre: 'Ramo Sintético Uno', creditos: 10 }], error: null });
  ctx.cargarConsenso = async () => fila('Ramo Sintético Uno', 'ZZZ1001');
  fijar([manual('ramo sintetico uno')]);
  chk('recibe el consenso de su sigla', (await ctx.aplicarConsensoAuto()) === 1);
  chk('consulta por el nombre exacto, no baja el catálogo', consultas.length === 1 && consultas[0][0] === 'busqueda' && consultas[0][1][0] === 'ramo sintetico uno');

  respuesta = () => ({ data: [{ sigla: 'ZZZ2002', nombre: 'Ramo Sintético II', creditos: 10 }], error: null });
  ctx.cargarConsenso = async () => fila('Ramo Sintético II', 'ZZZ2002');
  fijar([manual('Ramo Sintético 2')]);
  chk('"2" y "II" son el mismo nombre, como en el servidor', (await ctx.aplicarConsensoAuto()) === 1);

  // Nombre repetido: el servidor no elige sigla y agrupa por nombre.
  respuesta = () => ({ data: [{ sigla: 'ZZZ3003', nombre: 'Ramo Sintético Doble', creditos: 10 }, { sigla: 'ZZZ3004', nombre: 'Ramo Sintético Doble', creditos: 10 }], error: null });
  ctx.cargarConsenso = async () => fila('Ramo Sintético Doble', 'ramo sintetico doble');
  fijar([manual('Ramo Sintético Doble')]);
  chk('con el nombre repetido no adivina una sigla', (await ctx.aplicarConsensoAuto()) === 1);
  ctx.cargarConsenso = async () => fila('Ramo Sintético Doble', 'ZZZ3003');
  fijar([manual('Ramo Sintético Doble')]);
  chk('ni recibe la pauta de uno de los dos', (await ctx.aplicarConsensoAuto()) === 0);

  consultas.length = 0;
  respuesta = () => { throw new Error('sin red'); };
  ctx.cargarConsenso = async () => fila('Ramo Sintético Cuatro', 'ZZZ4004');
  fijar([manual('Ramo Sintético Cuatro')]);
  chk('si catalogo_uc falla, no explota ni aplica', (await ctx.aplicarConsensoAuto()) === 0);

  consultas.length = 0;
  respuesta = () => ({ data: [{ sigla: 'ZZZ4004', nombre: 'Ramo Sintético Cuatro', creditos: 10 }], error: null });
  fijar([{ id: 'o', nombre: 'Otro', origen: { tenant: 'uc', ramoKey: 'ZZZ5005' }, categorias: [], gates: [] }]);
  await ctx.aplicarConsensoAuto();
  chk('sin ramos manuales no consulta nada', consultas.length === 0);

  // Con pauta propia no se pisa, pero sí tiene que encontrar el aviso.
  const propia = manual('Ramo Sintético Cuatro', { categorias: [{ id: 'c', nombre: 'Mía', peso: 100, notas: [] }] });
  fijar([propia]);
  chk('un ramo manual con pauta no se pisa', (await ctx.aplicarConsensoAuto()) === 0);
  chk('pero queda con la clave del servidor', ctx.claveReporte(propia) === 'ZZZ4004');

  // La malla de la carrera ya sabía la sigla, sin consultar nada.
  val(`SIGLAS_UC.ZZ={'Ramo Sintético Seis':'ZZZ6006'};S.carrera='ZZ'`);
  chk('la sigla de la malla se conserva', ctx.claveReporte(manual('Ramo Sintético Seis')) === 'ZZZ6006');

  consultas.length = 0;
  val(`S.tenant='fen'`);
  fijar([manual('Ramo Sintético Cinco')]);
  ctx.cargarConsenso = async () => [];
  await ctx.aplicarConsensoAuto();
  chk('fuera de la UC no consulta catalogo_uc', consultas.length === 0);
}

console.log('\n=== La ficha no la presenta como oficial ===');
{
  const app = fs.readFileSync(raiz + 'app.js', 'utf8');
  const render = fs.readFileSync(raiz + 'render-main.js', 'utf8');
  const todo = app + render;
  chk('la ficha dice que la reportaron estudiantes', /Pauta reportada por estudiantes/.test(todo));
  chk('y dice que no sale del programa del curso', /No sale del programa del curso|No la sacamos del programa del curso/.test(todo));
  chk('el umbral vive en una constante y no suelto en el código', /const CONSENSO_AUTO=3;/.test(app));
}

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
if (fail) process.exit(1);

})();
