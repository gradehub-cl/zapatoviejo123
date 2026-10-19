// Una pauta que NOSOTROS transcribimos mal se corrige sola al cargar.
//
// Lo normal es ofrecer el cambio y que la persona apriete "Actualizar". Pero
// Introducción a la Programación tenía "Talleres de IA" al 4% cuando el curso
// lo divide en Cápsulas 2% y Talleres 2%: mientras nadie apretara el botón, su
// promedio seguía calculando con nuestro error. `corrigePautas` en el preset
// dice cuál era la pauta equivocada, y normalize() corrige a quien la tenga
// tal cual: no toca una pauta que la persona editó y no deja ninguna nota
// fuera de la pauta.
//
// Se reconoce por la pauta y no por `pautaHuella`: la primera versión
// (`actualizaSola`) dependía de la huella y no alcanzó a una cuenta real cuya
// huella era null —ramo antiguo o pauta aceptada desde un agente—.
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

// La pauta va escrita acá: es un test de mecanismo y el catálogo se edita.
const RAMO = 'Ramo de prueba actualiza sola';
const VIEJA = [['Prueba', 60], ['Tarea', 36], ['Talleres', 4]];
const NUEVA = [['Prueba', 60], ['Tarea', 36], ['Cápsulas', 2], ['Talleres', 2]];
const ponerPreset = (evals, extra = {}) => g('PRESETS_FEN')[RAMO] = { evals, ...extra };

// Un ramo guardado con la pauta vieja tal como la entregamos, con notas.
const guardado = (notas = {}) => {
  const categorias = VIEJA.map(([nombre, peso], i) => ({
    id: 'c' + i, nombre, peso, notas: notas[nombre] == null ? [] : [{ id: 'n' + i, nombre, valor: notas[nombre], peso: 1 }],
  }));
  return { id: 'r1', nombre: RAMO, color: '#000', creditos: null, origen: { tenant: 'fen', carrera: 'IC' },
    gates: [], categorias, pautaHuella: g('huellaPauta')(categorias) };
};
const cargar = ramo => g('normalize')({ tenant: 'fen', carrera: 'IC', ramos: [JSON.parse(JSON.stringify(ramo))] }).ramos[0];
const pesos = r => Object.fromEntries(r.categorias.filter(c => !c.fueraDePauta).map(c => [c.nombre, c.peso]));
const notaEn = (r, nombre) => ((r.categorias.find(c => c.nombre === nombre) || {}).notas || []).map(n => n.valor);

console.log('\n=== Pauta sin editar: se corrige al cargar, con sus notas ===');
{
  ponerPreset(NUEVA, { corrigePautas: [VIEJA] });
  const r = cargar(guardado({ Prueba: 5.5, Talleres: 6.0 }));
  chk('queda con la pauta nueva', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 36, 'Cápsulas': 2, Talleres: 2 }));
  chk('la nota de Talleres sigue en Talleres', JSON.stringify(notaEn(r, 'Talleres')) === '[6]');
  chk('la nota de Prueba sigue en Prueba', JSON.stringify(notaEn(r, 'Prueba')) === '[5.5]');
  chk('ya no ofrece el cambio', g('cambioDePauta')(r) === null);
  // La segunda carga solo rellena campos de fecha vacíos, como con cualquier
  // pauta recién puesta; lo que no puede cambiar es la pauta ni sus notas.
  const esencia = x => JSON.stringify(x.categorias.map(c => [c.id, c.nombre, c.peso, c.notas.map(n => [n.id, n.valor])]));
  chk('cargarlo de nuevo no cambia nada', esencia(cargar(r)) === esencia(r));
}

console.log('\n=== Pauta vieja exacta, pero sin huella guardada ===');
{
  ponerPreset(NUEVA, { corrigePautas: [VIEJA] });
  const r = cargar({ ...guardado({ Talleres: 6.0 }), pautaHuella: null });
  chk('también se corrige', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 36, 'Cápsulas': 2, Talleres: 2 }));
  chk('con su nota en Talleres', JSON.stringify(notaEn(r, 'Talleres')) === '[6]');
  chk('y queda con huella', r.pautaHuella === g('huellaPauta')(r.categorias));
}

console.log('\n=== Pauta editada por la persona: su versión manda ===');
{
  ponerPreset(NUEVA, { corrigePautas: [VIEJA] });
  const r0 = guardado();
  r0.categorias[1].peso = 30; r0.categorias.push({ id: 'cx', nombre: 'Control', peso: 6, notas: [] });
  const r = cargar(r0);
  chk('no se toca', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 30, Talleres: 4, Control: 6 }));
  const sinHuella = cargar({ ...r0, pautaHuella: null });
  chk('tampoco sin huella', JSON.stringify(pesos(sinHuella)) === JSON.stringify({ Prueba: 60, Tarea: 30, Talleres: 4, Control: 6 }));
}

console.log('\n=== Sin la marca: se ofrece, no se aplica ===');
{
  ponerPreset(NUEVA);
  const r = cargar(guardado({ Talleres: 6.0 }));
  chk('sigue con la pauta vieja', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 36, Talleres: 4 }));
  chk('y el cambio queda ofrecido', !!g('cambioDePauta')(r));
}

console.log('\n=== Una nota quedaría fuera de la pauta: se pregunta ===');
{
  ponerPreset([['Prueba', 60], ['Tarea', 36], ['Cápsulas', 4]], { corrigePautas: [VIEJA] });
  const r = cargar(guardado({ Talleres: 6.0 }));
  chk('no se aplica solo', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 36, Talleres: 4 }));
  chk('se sigue ofreciendo', !!g('cambioDePauta')(r));
}
delete g('PRESETS_FEN')[RAMO];

console.log('\n=== Casillas con nombre propio ===');
{
  // Sin preset detrás: el nombre viaja en la evaluación guardada.
  const ramo = { id: 'm', nombre: 'Ramo manual', origen: null };
  const cat = { id: 't', nombre: 'Trabajos', slots: 3, nombresCasillas: ['Cápsulas', 'Talleres'],
    nombresAnteriores: [{ nombre: 'Talleres viejos', slot: 1 }] };
  chk('la casilla 1 se llama Cápsulas', g('etiquetaCasilla')(ramo, cat, 0) === 'Cápsulas');
  chk('la casilla 2 se llama Talleres', g('etiquetaCasilla')(ramo, cat, 1) === 'Talleres');
  chk('una casilla sin nombre vuelve al número', g('etiquetaCasilla')(ramo, cat, 2) === 'Trabajo 3');
  chk('una nota que vino de la evaluación anterior se ve con el nombre de su casilla',
    g('nombreNotaCasilla')(ramo, cat, { slot: 1, nombre: 'Talleres viejos' }) === 'Talleres');
  chk('un nombre que puso la persona manda',
    g('nombreNotaCasilla')(ramo, cat, { slot: 1, nombre: 'Mi taller' }) === 'Mi taller');
}

console.log('\n=== Introducción a la Programación ===');
{
  const p = g('PRESETS_UC')['Introducción a la Programación'];
  const evals = Object.fromEntries(p.evals.map(([n, w, extra]) => [n, { w, extra }]));
  const ia = evals['Trabajos de Inteligencia Artificial'];
  chk('Trabajos de IA al 4% en dos casillas', ia && ia.w === 4 && ia.extra.slots === 2);
  chk('las casillas son Cápsulas y Talleres', ia && JSON.stringify(ia.extra.nombresCasillas) === '["Cápsulas","Talleres"]');
  chk('ya no hay un Talleres suelto', !evals['Talleres de Inteligencia Artificial']);
  chk('suma 100', Math.abs(Object.values(evals).reduce((a, b) => a + b.w, 0) - 100) < 1e-9);
  chk('declara la pauta vieja como corregible', Array.isArray(p.corrigePautas) && p.corrigePautas.length === 1);

  // La cuenta que ya existe: la pauta vieja, sin editar, con nota en Talleres
  // y sin huella —el caso real que la primera versión no alcanzó—.
  const vieja = [['Interrogación 1', 15], ['Interrogación 2', 20], ['Examen', 30], ['Tarea 1', 5], ['Tarea 2', 5],
    ['Tarea 3', 5], ['Nota de participación', 16], ['Talleres de Inteligencia Artificial', 4]]
    .map(([nombre, peso], i) => ({ id: 'v' + i, nombre, peso, notas: [] }));
  vieja[0].notas = [{ id: 'i1', nombre: 'Interrogación 1', valor: 4.8, peso: 1 }];
  vieja[7].notas = [{ id: 'ta', nombre: 'Talleres de Inteligencia Artificial', valor: 6.5, peso: 1 }];
  const r = g('normalize')({ tenant: 'uc', carrera: 'ING-PC', ramos: [{ id: 'ip', nombre: 'Introducción a la Programación',
    color: '#000', origen: { tenant: 'uc', carrera: 'ING-PC' }, gates: [], categorias: vieja,
    pautaHuella: null }] }).ramos[0];
  const trabajos = r.categorias.find(c => c.nombre === 'Trabajos de Inteligencia Artificial');
  chk('la cuenta existente se corrige sola', !!trabajos && trabajos.peso === 4 && !r.categorias.some(c => c.fueraDePauta));
  const nota = trabajos && trabajos.notas.find(n => n.valor === 6.5);
  chk('su nota de talleres queda en la casilla Talleres', !!nota && nota.slot === 1
    && g('nombreNotaCasilla')(r, trabajos, nota) === 'Talleres');
  chk('la Interrogación 1 conserva su nota', JSON.stringify(r.categorias.find(c => c.nombre === 'Interrogación 1').notas.map(n => n.valor)) === '[4.8]');
  chk('Cápsulas queda pendiente', g('etiquetaCasilla')(r, trabajos, 0) === 'Cápsulas' && trabajos.notas.every(n => n.slot !== 0));
}

console.log('\n=== Una compuerta que el catálogo retiró se quita sola ===');
{
  const RAMO2 = 'Ramo de prueba sin mínimos';
  g('PRESETS_FEN')[RAMO2] = { evals: [['Control 1', 30], ['Control 2', 30], ['Examen', 40, { min: 3.0, cap: 3.4 }]],
    retiraCompuertas: [{ min: 1.5, cap: 3.9 }] };
  const cats = [['Control 1', 30, 1.2], ['Control 2', 30, 6.5], ['Examen', 40, 6.0]].map(([nombre, peso, v], i) =>
    ({ id: 'k' + i, nombre, peso, notas: [{ id: 'm' + i, nombre, valor: v, peso: 1 }] }));
  const gates = [
    { type: 'min_grade_required', catId: 'k0', min: 1.5, cap: 3.9, nombre: 'Control 1' },
    { type: 'min_grade_required', catId: 'k1', min: 1.5, cap: 3.9, nombre: 'Control 2' },
    { type: 'min_grade_required', catId: 'k2', min: 3.0, cap: 3.4, nombre: 'Examen' },
  ];
  const cargar = origen => g('normalize')({ tenant: 'fen', ramos: [{ id: 'cg', nombre: RAMO2, color: '#000', origen,
    gates: JSON.parse(JSON.stringify(gates)), categorias: JSON.parse(JSON.stringify(cats)) }] }).ramos[0];
  const delCatalogo = cargar({ tenant: 'fen', carrera: null });
  chk('se van los mínimos de 1,5 que el catálogo retiró', !delCatalogo.gates.some(x => x.min === 1.5));
  chk('el mínimo del Examen se queda', delCatalogo.gates.some(x => x.min === 3.0 && x.cap === 3.4));
  // Con un 1,2 en un control: antes la final quedaba topada en 3,9.
  chk('un control bajo 1,5 ya no topa la nota final', g('ramoAvg')(delCatalogo) > 3.9);
  chk('un ramo manual del mismo nombre no se toca', cargar(null).gates.filter(x => x.min === 1.5).length === 2);
  delete g('PRESETS_FEN')[RAMO2];
}

console.log(`\n${ok} ok, ${fail} fallos`);
if (fail) process.exit(1);
