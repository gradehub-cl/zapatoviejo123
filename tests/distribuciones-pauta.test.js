// Distribuciones sugeridas: pesos iguales con nombres distintos se juntan y
// gana el nombre que predomina; la de tu profe o tu sección va primero; y los
// reportes pueden mostrar que un ramo no es coordinado. Datos sintéticos.
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
const J = v => JSON.parse(JSON.stringify(v));
run("S.tenant='fen';S.onboardingDone=true;currentUser={id:'sintetica'};save=()=>{}");
const agrupar = (filas, seccion) => J(run('agruparDistribuciones')(filas, seccion));
const fila = (est, respaldos = 1, extra = {}) => ({ estructura: est, respaldos, seccion: null, profe: null, profesor: null, mio: false, ...extra });
const cuatro = (a, b, c, d) => [{ nombre: a, peso: 30 }, { nombre: b, peso: 30 }, { nombre: c, peso: 20 }, { nombre: d, peso: 20 }];

// ─── Pesos iguales, nombres distintos: una sola distribución ───
{
  const d = agrupar([
    fila(cuatro('Prueba 1', 'Prueba 2', 'Ejercicio de análisis', 'Podcast'), 3),
    fila(cuatro('prueba 1', 'prueba 2', 'Ejercicio análisis', 'podcast')),
    fila(cuatro('Prueba 1', 'Prueba 2', 'Análisis en parejas', 'Podcast grupal')),
    fila(cuatro('Control 1', 'Control 2', 'Ejercicio', 'Podcast')),
  ]);
  assert.equal(d.length, 1, 'cuatro escrituras de la misma pauta');
  assert.equal(d[0].respaldos, 6);
  const nombres = d[0].estructura.map(e => e.nombre).sort();
  assert.deepEqual(nombres, ['Ejercicio de análisis', 'Podcast', 'Prueba 1', 'Prueba 2'], 'gana el nombre más repetido, con su escritura más usada');
}
// Mayúscula inicial y tildes desempatan la escritura.
{
  const d = agrupar([fila(cuatro('Prueba 1', 'Prueba 2', 'analisis', 'Podcast')), fila(cuatro('Prueba 1', 'Prueba 2', 'Análisis', 'Podcast'))]);
  assert.ok(d[0].estructura.some(e => e.nombre === 'Análisis'));
}
// ─── Mismos pesos, nada en común: no se juntan ───
{
  const d = agrupar([
    fila([{ nombre: 'Prueba 1', peso: 50 }, { nombre: 'Prueba 2', peso: 50 }], 2),
    fila([{ nombre: 'Trabajo', peso: 50 }, { nombre: 'Examen', peso: 50 }], 2),
  ]);
  assert.equal(d.length, 2, '50/50 con nombres sin relación son dos pautas');
}
// Pesos distintos nunca se juntan, aunque los nombres sí.
assert.equal(agrupar([
  fila([{ nombre: 'Prueba', peso: 60 }, { nombre: 'Examen', peso: 40 }]),
  fila([{ nombre: 'Prueba', peso: 70 }, { nombre: 'Examen', peso: 30 }]),
]).length, 2);
// ─── Casillas y numeradas ───
{
  const d = agrupar([
    fila([{ nombre: 'Trabajo final', peso: 30 }, { nombre: 'Prueba', peso: 25 }, { nombre: 'Controles R', peso: 15, slots: 3 }, { nombre: 'Tickets de salida', peso: 30 }], 2),
    fila([{ nombre: 'trabajo final', peso: 30 }, { nombre: 'prueba 1', peso: 25 }, { nombre: 'control R', peso: 15 }, { nombre: 'Tickets salida', peso: 30 }]),
  ]);
  assert.equal(d.length, 1, 'con o sin «×3» es la misma ponderación');
  assert.equal(d[0].estructura.find(e => e.peso === 15).slots, 3, 'las casillas más repetidas');
}
{
  const controles = [1, 2, 3, 4, 5, 6, 7].map(n => ({ nombre: 'Control ' + n, peso: 1 }));
  const d = agrupar([
    fila([{ nombre: 'Examen', peso: 30 }, { nombre: 'Interrogación 1', peso: 21 }, { nombre: 'Interrogación 2', peso: 21 }, { nombre: 'Interrogación 3', peso: 21 }, ...controles], 3),
    fila([{ nombre: 'Examen', peso: 30 }, { nombre: 'Prueba 1', peso: 21 }, { nombre: 'Prueba 2', peso: 21 }, { nombre: 'Prueba 3', peso: 21 }, { nombre: 'Controles', peso: 7, slots: 7 }]),
  ]);
  assert.equal(d.length, 1, 'tres interrogaciones de 21% = una de 63% con tres casillas');
  const inter = d[0].estructura.find(e => e.peso === 63);
  assert.equal(inter.nombre, 'Interrogación');
  assert.equal(inter.slots, 3);
  assert.equal(d[0].estructura.find(e => e.peso === 7).slots, 7);
}

// ─── Evidencia de que el ramo no es coordinado ───
const A = [{ nombre: 'Trabajo final', peso: 30 }, { nombre: 'Prueba', peso: 70 }];
const B = [{ nombre: 'Ensayo', peso: 40 }, { nombre: 'Examen', peso: 60 }];
const evidencia = filas => run('evidenciaNoCoordinado')(run('agruparDistribuciones')(filas));
assert.equal(evidencia([fila(A, 5, { profe: 'p-a' }), fila(B, 4, { profe: 'p-b' })]), true, '5 de un profe y 4 de otro');
assert.equal(evidencia([fila(A, 2, { seccion: 1 }), fila(B, 2, { seccion: 2 })]), true, 'secciones que no se mezclan');
assert.equal(evidencia([fila(A, 3, { profe: 'p-a' }), fila(B, 2, { profe: 'p-a' })]), false, 'el mismo profe con dos pautas: alguien se equivocó');
assert.equal(evidencia([fila(A, 13), fila(B, 2)]), false, 'un error suelto no basta');
assert.equal(evidencia([fila(A, 6), fila(B, 3)]), true, 'sin profe: dos pautas bien respaldadas');
assert.equal(evidencia([fila(A, 4)]), false);

(async () => {
  // ─── La de tu profe primero, destacada y elegida ───
  const ramo = { id: 'r', nombre: 'Taller Sintético Fuera', origen: { tenant: 'fen', carrera: 'IC' }, periodo: '2026-2', categorias: [], gates: [] };
  run(`S.ramos=${JSON.stringify([ramo])}`);
  const r = run('S.ramos[0]');
  const ctxR = run('contextoPautaSugerida')(r);
  ctx.filasPrueba = [
    fila(A, 6, { profe: 'p-a', profesor: 'Ana <b>Pérez</b>' }),
    fila(B, 2, { profe: 'p-b', mio: true, seccion: 4 }),
    fila([{ nombre: 'Proyecto', peso: 55 }, { nombre: 'Presentación', peso: 45 }], 1),
    fila([{ nombre: 'Informe', peso: 65 }, { nombre: 'Defensa', peso: 35 }], 1),
  ];
  run("supabaseClient={rpc:async n=>n==='pautas_sugeridas'?{data:filasPrueba,error:null}:{error:{code:'PGRST202'}}}");
  const opciones = await run('leerPautaSugerida')(ctxR, r, []);
  assert.equal(opciones.length, 3, 'no coordinado: hasta tres');
  assert.equal(opciones[0].tuya, 'profe', 'la de tu profe va primero aunque tenga menos respaldo');
  assert.equal(opciones[1].respaldos, 6);
  assert.equal(run('ramoNoCoordinado')(r), true);
  const html = run('htmlPautaSugerida')(opciones, { noCoordinado: true, sinSeccion: true });
  assert.match(html, /Tu profe/);
  assert.match(html, /value="0" checked/, 'ya elegida');
  assert.ok(!/disabled>Usar esta pauta/.test(html), 'el botón queda listo');
  assert.match(html, /cambia según profesor o sección/);
  assert.match(html, /data-agregar-seccion/, 'sin sección, se invita a agregarla');
  assert.ok(!html.includes('<b>'), 'el nombre del profe se escapa');
  assert.match(html, /Profe: Ana/);
  assert.match(html, /Sección 4/);

  // «Ahora no» no esconde la de tu profe.
  r.pautaSugerida = { descartada: 6 };
  const despues = await run('leerPautaSugerida')(ctxR, r, []);
  assert.equal(despues.length, 1);
  assert.equal(despues[0].tuya, 'profe');
  assert.equal(run('aceptarPautaSugeridaEnRamo')(r, despues[0], ctxR), true, 'y se puede usar');
  delete r.pautaSugerida; r.categorias = []; r.gates = [];

  // ─── La evidencia cambia la coordinación de un ramo de la malla ───
  const malla = { id: 'm', nombre: 'Negocios I', origen: { tenant: 'fen', carrera: 'IC' }, periodo: '2026-2', categorias: [], gates: [] };
  run(`S.ramos.push(${JSON.stringify(malla)})`);
  const rM = run('S.ramos[1]');
  assert.equal(run('coordinacionRamo')(rM).fuente, 'malla');
  ctx.filasPrueba = [fila(A, 5, { profe: 'p-a' }), fila(B, 4, { profe: 'p-b' })];
  const deMalla = await run('leerPautaSugerida')(run('contextoPautaSugerida')(rM), rM, []);
  assert.equal(J(run('coordinacionRamo')(rM)).fuente, 'reportes');
  assert.equal(deMalla.length, 2, 'ahora se muestran las dos');
  const consenso = [{ ramo: rM.nombre, ramo_key: run('claveReporte')(rM), estructura: A, huella: 'x', respaldos: 5, periodo: run('semester()'), seccion: null }];
  assert.equal(run('ponerConsensoEnRamo')(rM, consenso), false, 'y el consenso ya no se aplica solo');

  // Coordinado sin evidencia: como siempre, solo la más respaldada.
  run('_evidenciaCoordinacion.clear()');
  ctx.filasPrueba = [fila(A, 13), fila(B, 2)];
  const coordinado = await run('leerPautaSugerida')(run('contextoPautaSugerida')(rM), rM, []);
  assert.equal(coordinado.length, 1);
  assert.equal(coordinado[0].respaldos, 13);
  // ─── El programa de una sección, como opción con su origen ───
  // Derecho de Sociedades (DER009C): no coordinado, programa solo de la sección 1.
  run("S.tenant='uc';S.carrera='ING-PC'");
  const der = { id: 'd', nombre: 'Derecho de Sociedades', origen: { tenant: 'uc', carrera: 'ING-PC' }, periodo: '2026-2', categorias: [], gates: [] };
  run(`S.ramos=${JSON.stringify([der])}`);
  const rD = run('S.ramos[0]');
  assert.equal(run('elegiblePautaSugerida')(rD), true, 'sin pauta para su sección, recibe sugerencias');
  ctx.filasPrueba = [fila(A, 3)];
  let deDerecho = await run('leerPautaSugerida')(run('contextoPautaSugerida')(rD), rD, []);
  assert.equal(deDerecho.length, 2);
  assert.equal(deDerecho[0].respaldos, 3, 'sin sección: lo reportado primero');
  assert.equal(deDerecho[1].fuente, 'programa');
  assert.equal(run('textoReferenciaSugerida')(deDerecho[1]), 'Programa oficial de la sección 1');
  rD.seccion = 1;
  deDerecho = await run('leerPautaSugerida')(run('contextoPautaSugerida')(rD), rD, []);
  assert.equal(deDerecho[0].tuya, 'programa', 'el programa de su sección va primero');
  assert.match(run('htmlPautaSugerida')(deDerecho, { noCoordinado: true, sinSeccion: false }), /Tu sección[\s\S]*Programa oficial de la sección 1/);
  assert.equal(run('aceptarPautaSugeridaEnRamo')(rD, deDerecho[0], run('contextoPautaSugerida')(rD)), true);
  assert.equal(run('textoProcedenciaSugerida')(rD.pautaSugerida.aceptada), 'Programa oficial de la sección 1', 'la ficha dice de dónde salió');
  assert.equal(J(run('copiarPautaSugerida')(rD.pautaSugerida)).aceptada.fuente, 'programa', 'y se conserva al guardar');
  assert.equal(J(run('copiarPautaSugerida')({ aceptada: { ...J(rD.pautaSugerida.aceptada), fuente: 'inventada' } })).aceptada.fuente, undefined);
  assert.equal(rD.categorias.find(c => c.nombre === 'Examen').peso, 50);
  console.log('distribuciones-pauta: OK');
})().catch(e => { console.error(e); process.exit(1); });
