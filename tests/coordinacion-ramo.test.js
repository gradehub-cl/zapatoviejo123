// Ramos coordinados y no coordinados (pedido de Lucas del 2026-11-09).
//
// Un ramo no coordinado cambia de pauta según profesor o sección. Ahí tres
// reportes iguales describen la pauta de un profesor, así que el consenso no
// se aplica solo: se ofrece como sugerencia y nunca se presenta como "pauta de
// N estudiantes" del catálogo. Estos tests fijan quién decide y ese borde.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const raiz = __dirname + '/../';
const el = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false } }, value: '', innerHTML: '', textContent: '', focus() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null }, querySelectorAll() { return [] }, querySelector() { return el }, dataset: {} };
const ctx = vm.createContext({
  console, setTimeout, clearTimeout,
  window: { addEventListener() {}, matchMedia: () => ({ matches: true, addEventListener() {} }) },
  document: { getElementById: () => el, createElement: () => el, addEventListener() {}, documentElement: el, querySelector: () => el, querySelectorAll: () => [], body: el, head: el },
  localStorage: { getItem() { return null }, setItem() {}, removeItem() {} },
  navigator: {}, location: { origin: '', pathname: '/', hash: '' },
});
for (const f of ['data.js', 'engine.js', 'app.js', 'app-session.js']) vm.runInContext(fs.readFileSync(raiz + f, 'utf8'), ctx);
const run = s => vm.runInContext(s, ctx);
const J = JSON.stringify;
const coord = (nombre, tenant) => run(`coordinacionRamo(${J({ nombre, origen: { tenant } })})`);

run("S.tenant='fen';S.onboardingDone=true;currentUser={id:'sintetica'};save=()=>{}");

// ─── Quién decide ───
// 1. El dato explícito del programa (Derecho UC, confirmado por Lucas).
assert.deepEqual(coord('Derecho de Sociedades', 'uc'), { coordinado: false, fuente: 'programa' });
// 2. Una pauta oficial para todo el ramo.
assert.deepEqual(coord('Cálculo I', 'uc'), { coordinado: true, fuente: 'pauta-oficial' });
// 3. La malla: dentro, coordinado; fuera, no.
assert.deepEqual(coord('Negocios I', 'fen'), { coordinado: true, fuente: 'malla' });
assert.deepEqual(coord('Taller Sintético Fuera', 'fen'), { coordinado: false, fuente: 'fuera-de-malla' });
// Sin las mallas diferidas de UC no se afirma que un ramo está fuera.
assert.equal(coord('Exploraciones Sintéticas', 'uc'), null);
assert.equal(run(`ramoCoordinado(${J({ nombre: 'Exploraciones Sintéticas', origen: { tenant: 'uc' } })})`), false, 'desconocido no es coordinado');
assert.equal(run(`ramoNoCoordinado(${J({ nombre: 'Exploraciones Sintéticas', origen: { tenant: 'uc' } })})`), false, 'ni tampoco no coordinado');
run("var MALLAS_UC_EXTRA={'CARRERA-SINTETICA':{1:['Exploraciones Sintéticas']}}");
assert.deepEqual(coord('Exploraciones Sintéticas', 'uc'), { coordinado: true, fuente: 'malla' }, 'al llegar las mallas, la caché se rehace');
assert.deepEqual(coord('Otro Ramo Sintético', 'uc'), { coordinado: false, fuente: 'fuera-de-malla' });

// ─── El consenso no se aplica solo en un ramo no coordinado ───
const EST = [{ nombre: 'Prueba', peso: 60 }, { nombre: 'Examen', peso: 40 }];
const vacio = (nombre, extra) => ({ id: 'r-' + nombre, nombre, origen: { tenant: 'fen', carrera: 'IC' }, categorias: [], gates: [], ...extra });
const fila = (r, respaldos) => ({ ramo: r.nombre, ramo_key: run(`claveReporte(${J(r)})`), estructura: EST, huella: run('huellaEstructura')(EST), respaldos, periodo: run('semester()'), seccion: null });

const fuera = vacio('Taller Sintético Fuera'), malla = vacio('Negocios I');
run(`S.ramos=${J([fuera, malla])}`);
const [rFuera, rMalla] = run('S.ramos');
assert.equal(run('ponerConsensoEnRamo')(rFuera, [fila(rFuera, 9)]), false, 'no coordinado: no se aplica');
assert.equal(rFuera.categorias.length, 0);
assert.equal(run('ponerConsensoEnRamo')(rMalla, [fila(rMalla, 3)]), true, 'coordinado: sigue la regla de siempre');
assert.equal(rMalla.consensoRespaldos, 3);

// Se ofrece como sugerencia, con el texto de cualquier otra (nunca "consenso").
(async () => {
  const opcionesFuera = run('opcionesDeConsensoNoCoordinado')(rFuera, [fila(rFuera, 4)]);
  assert.equal(opcionesFuera.length, 1);
  assert.equal(opcionesFuera[0].respaldos, 4);
  assert.equal(run('opcionesDeConsensoNoCoordinado')(rMalla, [fila(rMalla, 4)]).length, 0);
  assert.equal(run('textoPautaSugerida')(4), 'Reportada por 4 estudiantes, sin confirmar');

  // Con la RPC anterior (sin aplicar la nueva), el consenso no viene entre las
  // filas: igual se ofrece.
  run("supabaseClient={rpc:async n=>n==='pautas_sugeridas'?{error:{code:'PGRST202'}}:{data:[],error:null}}");
  const ctxFuera = run('contextoPautaSugerida')(rFuera);
  const leidas = await run('leerPautaSugerida')(ctxFuera, rFuera, [fila(rFuera, 4)]);
  assert.equal(leidas.length, 1, 'el consenso de un no coordinado llega como sugerencia');
  assert.equal(await run('aceptarPautaSugeridaEnRamo')(rFuera, leidas[0], ctxFuera), true);
  assert.equal(rFuera.consensoRespaldos, undefined, 'aceptarla no la vuelve "pauta por consenso"');
  assert.equal(run('actualizarProcedenciaSugerida')(rFuera, [fila(rFuera, 4)]), false, 'ni después');

  // Con su propia pauta, otra con más respaldo no se ofrece como cambio.
  const conPauta = vacio('Taller Sintético Propio', { categorias: [{ id: 'a', nombre: 'Trabajo', peso: 100, notas: [], ponderaNotas: false, directNota: true }] });
  run(`S.ramos.push(${J(conPauta)})`);
  const rPropio = run('S.ramos[S.ramos.length-1]');
  ctx.cargarConsenso = async () => [fila(rPropio, 8)];
  assert.equal(await run('consensoParaRamo')(rPropio), null);

  // El buscador muestra el ramo, pero sin prometer la pauta de cinco.
  run(`_consensoPorTenant.set(claveCacheConsenso('fen',semester(),null),${J([fila(vacio('Taller Sintético Cinco'), 5)])})`);
  const enBuscador = run("searchCatalog('Taller Sintético Cinco','fen',null,1)").find(r => r.nombre === 'Taller Sintético Cinco');
  assert.ok(enBuscador, 'el ramo sigue apareciendo');
  assert.equal(enBuscador.tienePreset, false);
  assert.equal(enBuscador.consenso, undefined);
  console.log('coordinacion-ramo: OK');
})().catch(e => { console.error(e); process.exit(1); });
