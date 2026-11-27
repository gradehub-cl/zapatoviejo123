// Hasta dónde puede llegar el promedio con lo que todavía no se rinde.
//
// Es un número que el estudiante va a usar para decidir si sigue peleando un
// ramo o lo suelta, así que el riesgo no es que reviente: es que dé un rango
// plausible y equivocado. Por eso el escenario NO se calcula aparte — se arma
// una copia del ramo con lo pendiente relleno y se la pasa al motor de siempre,
// que ya sabe de compuertas, descartes y ramos que aportan nota a otro.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'render-agenda.js']
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
const proyeccionSemestre = val('proyeccionSemestre');
const loQueFaltaPorRamo = val('loQueFaltaPorRamo');
const normalize = val('normalize');

let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const cerca = (a, b) => a !== null && Math.abs(a - b) < 0.05;

const ramo = (id, cats) => ({ id, nombre: id, categorias: cats, gates: [], notas: [] });
const cat = (id, peso, valor, extra) => ({ id, nombre: id, peso, ponderaNotas: false, directNota: true, notas: valor === null ? [] : [{ id: id + 'n', nombre: 'n', valor, peso: 1 }], ...extra });

console.log('\n=== El rango sale del motor, no de una cuenta aparte ===');
// Mitad rendida con 6,0. El piso es 6,0 y 1,0 al 50% cada uno; el techo, 6,0 y 7,0.
const mitad = normalize({ ramos: [ramo('A', [cat('c1', 50, 6.0), cat('c2', 50, null)])] }).ramos;
const p1 = proyeccionSemestre(mitad);
chk('el piso asume 1,0 en lo que falta', cerca(p1.piso, 3.5));
chk('el techo asume 7,0 en lo que falta', cerca(p1.techo, 6.5));

console.log('\n=== Una compuerta baja el techo, y por eso no se calcula a mano ===');
// El Examen exige 3,0 o la final se topa en 3,4. Con 7,0 en todo lo pendiente
// la cuenta simple daría 6,5; el motor sabe que el 2,0 del examen ya topó.
const conTope = normalize({ ramos: [{ ...ramo('B', [cat('e', 50, 2.0), cat('otra', 50, null)]),
  gates: [{ type: 'min_grade_required', catId: 'e', min: 3.0, cap: 3.4, nombre: 'Examen' }] }] }).ramos;
const p2 = proyeccionSemestre(conTope);
chk('el techo respeta el tope de la compuerta', cerca(p2.techo, 3.4));

console.log('\n=== Las casillas a medio llenar cuentan las que faltan ===');
// Con slots:2 y una sola nota puesta, la otra casilla sigue pendiente. Si se
// mirara solo "¿tiene alguna nota?", este ramo se daría por cerrado y el rango
// saldría más angosto de lo que es.
// La nota va en su casilla (`slot: 0`), como la guarda la ficha.
const conSlots = normalize({ ramos: [ramo('C', [{ ...cat('ctrl', 100, null), slots: 2, directNota: true,
  notas: [{ id: 'c0', nombre: 'Control 1', valor: 6.0, peso: 1, slot: 0 }] }])] }).ramos;
const p3 = proyeccionSemestre(conSlots);
chk('el piso considera la casilla vacía', cerca(p3.piso, 3.5));
chk('y el techo también', cerca(p3.techo, 6.5));

console.log('\n=== Con casillas, el relleno ocupa la casilla: igual que escribir la nota a mano ===');
// El relleno sin `slot` quedaba como nota suelta y la casilla seguía pendiente:
// el motor contaba la categoría a medias. Con Controles 50 % y Examen 4,0 el
// techo daba 5,0 en vez de 5,5. Cada caso se compara contra el motor con las
// notas escritas a mano en cada casilla pendiente, sin cuenta aparte.
const ramoAvg = val('ramoAvg'), gpa = val('gpa'), ramoConPendientesEn = val('ramoConPendientesEn');
const copia = x => JSON.parse(JSON.stringify(x));
const nota = (slot, valor, extra) => ({ id: 'n' + slot, nombre: 'Control ' + (slot + 1), valor, peso: 1, slot, ...extra });
const controles = (notas, extra) => ({ id: 'ctrl', nombre: 'Controles', peso: 50, directNota: false, slots: 4, notas, ...extra });
const examen = v => cat('ex', 50, v);
// El ramo como quedaría si la persona escribiera `v` en cada casilla pendiente.
function aMano(r, v) {
  const c = copia(r);
  c.categorias.forEach(k => {
    if (!(k.slots > 1)) { if (!k.notas.some(n => typeof n.valor === 'number')) k.notas.push({ id: 'mano', nombre: 'a mano', valor: v, peso: 1 }); return; }
    for (let s = 0; s < k.slots; s++) {
      const n = k.notas.find(n => n.slot === s);
      if (!n) k.notas.push(nota(s, v));
      else if (typeof n.valor !== 'number') n.valor = v;
    }
  });
  return c;
}
function comoElMotor(nombre, r, piso, techo) {
  const lista = normalize({ ramos: [r] }).ramos;
  const p = proyeccionSemestre(lista);
  chk(nombre + ': piso ' + piso, cerca(p && p.piso, piso));
  chk(nombre + ': techo ' + techo, cerca(p && p.techo, techo));
  chk(nombre + ': el piso es el del motor con las notas a mano', Math.abs(p.piso - gpa([aMano(lista[0], 1.0)])) < 1e-9);
  chk(nombre + ': el techo es el del motor con las notas a mano', Math.abs(p.techo - gpa([aMano(lista[0], 7.0)])) < 1e-9);
  return lista;
}

// 4 casillas vacías + Examen 50 % con 4,0: 7·0,5 + 4·0,5 y 1·0,5 + 4·0,5.
comoElMotor('casillas vacías', ramo('E1', [controles([]), examen(4.0)]), 2.5, 5.5);
// Casillas 1 y 3 con 7,0: techo 7·0,5+2; piso (7+7+1+1)/4·0,5+2.
comoElMotor('casillas a medio llenar', ramo('E2', [controles([nota(0, 7), nota(2, 7)]), examen(4.0)]), 4.0, 5.5);

// Una casilla con fecha y sin nota ya existe en S: se rellena esa misma, sin
// duplicarla, y el ramo real no cambia.
const conFecha = comoElMotor('casilla con fecha pendiente',
  ramo('E3', [controles([nota(0, 5), nota(1, null, { fecha: '2026-10-18' })]), examen(4.0)]), (5 + 3) / 4 * 0.5 + 2, (5 + 21) / 4 * 0.5 + 2);
const antes = JSON.stringify(conFecha);
const sim = ramoConPendientesEn(conFecha[0], 7.0).categorias.find(c => c.id === 'ctrl').notas;
chk('cada casilla queda con una sola nota, en su slot', sim.length === 4 && [0, 1, 2, 3].every(s => sim.filter(n => n.slot === s).length === 1));
chk('la casilla con fecha conserva su fecha', sim.find(n => n.slot === 1)?.fecha === '2026-10-18' && sim.find(n => n.slot === 1)?.valor === 7);
chk('el ramo real no se toca', JSON.stringify(conFecha) === antes && conFecha[0].categorias[0].notas[1].valor === null);

// Lista sin casillas: no se sabe cuántas faltan; se agrega una nota, como hoy.
comoElMotor('lista sin casillas', ramo('E4', [{ id: 'ta', nombre: 'Tareas', peso: 40, directNota: false, notas: [] }, cat('pr', 60, 5.0)]), 3.4, 5.8);

// Descarte de la más baja (UC: descarte automático; la FEN lo hace a mano):
// con 3,0 en la casilla 1, el techo la descarta (7,0) y el piso descarta un
// 1,0: (1+1+3)/3·0,5 + 2.
val("S.tenant='uc'");
comoElMotor('descarte de la más baja', ramo('E5', [controles([nota(0, 3)], { dropLowest: { count: 1 } }), examen(4.0)]), 5 / 3 * 0.5 + 2, 5.5);
val("S.tenant='fen'");

// Casillas con distinto peso (1 y 3): la casilla vacía pesa 3 de 4.
comoElMotor('casillas con peso propio',
  ramo('E6', [{ id: 'ctrl', nombre: 'Controles', peso: 50, directNota: false, slots: 2, pesosCasillas: [1, 3], notas: [nota(0, 5)] }, examen(4.0)]),
  (5 + 3) / 4 * 0.5 + 2, (5 + 21) / 4 * 0.5 + 2);

// Una nota antigua sin `slot` el motor la cuenta aparte de las casillas; la
// proyección hace lo mismo que si se escribiera la nota en las dos casillas.
comoElMotor('nota antigua sin casilla', ramo('E7', [{ ...cat('ctrl', 100, 6.0), slots: 2, directNota: true }]), 8 / 3, 20 / 3);

// Casilla 2 justificada y reemplazada por el Examen (5,0): no se rinde, así
// que no se rellena. Solo falta la 3: techo (4+5+7)/3·0,3 + 5·0,7 = 5,1.
const justificada = {
  ...ramo('E8', [
    { id: 'cc', nombre: 'Controles', peso: 30, slots: 3, directNota: false, notas: [{ id: 'k0', nombre: 'Control 1', valor: 4, peso: 1, slot: 0 }] },
    { id: 'ce', nombre: 'Examen', peso: 70, directNota: true, notas: [{ id: 'ke', nombre: 'Examen', valor: 5, peso: 1 }] }]),
  reglasAusenciaJustificada: { reemplazosCasilla: [{ desdeId: 'cc', desdeSlot: 1, haciaId: 'ce' }] },
  ausenciasJustificadas: ['__gh_ausencia_cc_1'],
};
const pj = proyeccionSemestre(normalize({ ramos: [justificada] }).ramos);
chk('casilla justificada: techo 5,1', cerca(pj && pj.techo, 5.1));
chk('casilla justificada: piso (4+5+1)/3·0,3 + 3,5 = 4,5', cerca(pj && pj.piso, 4.5));
const simJ = ramoConPendientesEn(normalize({ ramos: [justificada] }).ramos[0], 7.0).categorias[0].notas;
chk('la casilla justificada no recibe nota', !simJ.some(n => n.slot === 1) && simJ.some(n => n.slot === 2 && n.valor === 7));

console.log('\n=== Cuándo NO hay rango que mostrar ===');
const cerrado = normalize({ ramos: [ramo('D', [cat('u', 100, 5.0)])] }).ramos;
chk('con todo rendido no se proyecta nada', proyeccionSemestre(cerrado) === null);
chk('sin ramos tampoco', proyeccionSemestre([]) === null);

console.log('\n=== Qué necesitas, y en qué orden ===');
const varios = normalize({ ramos: [
  ramo('Facil', [cat('a', 50, 6.5), cat('b', 50, null)]),
  ramo('Dificil', [cat('a', 50, 2.0), cat('b', 50, null)]),
] }).ramos;
const falta = loQueFaltaPorRamo(varios);
chk('el más exigente va primero', falta[0].ramo.id === 'Dificil');
chk('y el número es lo que hay que sacar en lo que queda',
  cerca(falta[0].necesita, 5.9) && cerca(falta[1].necesita, 1.4));
// Un ramo sin evaluaciones no tiene qué pedir: no debe aparecer con un 4,0
// inventado, porque eso se lee como "te falta rendir algo" cuando no hay pauta.
const sinPauta = normalize({ ramos: [ramo('Vacio', [])] }).ramos;
chk('un ramo sin pauta no aparece en la lista', loQueFaltaPorRamo(sinPauta).length === 0);

console.log('\n=== Una prioridad necesita información real del estudiante ===');
// Principios ya tiene una prueba: con 5,0 en el 25% necesita 3,61 en el resto.
// Tres ramos sin ninguna nota devuelven una meta genérica y hoy ocupan los tres
// cupos de la pantalla, escondiendo el único cálculo que sí describe cómo va.
const conRamosSinEmpezar = normalize({ ramos: [
  ramo('Principios Ecológicos', [cat('p1', 25, 5.0), cat('p2', 40, null), cat('p3', 35, null)]),
  ramo('Sin empezar A', [cat('a', 100, null)]),
  ramo('Sin empezar B', [cat('b', 100, null)]),
  ramo('Sin empezar C', [cat('c', 100, null)]),
] }).ramos;
const prioridadesConDatos = loQueFaltaPorRamo(conRamosSinEmpezar);
chk('Principios no queda tapado por tres ramos sin notas',
  prioridadesConDatos[0]?.ramo.nombre === 'Principios Ecológicos');
chk('el cálculo mostrado se apoya en una nota real',
  prioridadesConDatos.every(x => x.avg !== null));
chk('con 5,0 en el primer 25% pide 3,61 en lo pendiente',
  cerca(prioridadesConDatos[0]?.necesita, 3.61));

console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
