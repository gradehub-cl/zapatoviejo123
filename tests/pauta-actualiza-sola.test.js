// Una pauta que NOSOTROS transcribimos mal se corrige sola al cargar.
//
// Lo normal es ofrecer el cambio y que la persona apriete "Actualizar". Pero
// Introducción a la Programación tenía "Talleres de IA" al 4% cuando el curso
// lo divide en Cápsulas 2% y Talleres 2%: mientras nadie apretara el botón, su
// promedio seguía calculando con nuestro error. `actualizaSola` en el preset
// aplica el cambio en normalize(), con los mismos límites de siempre: no toca
// una pauta que la persona editó y no deja ninguna nota fuera de la pauta.
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
  ponerPreset(NUEVA, { actualizaSola: true });
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

console.log('\n=== Pauta editada por la persona: su versión manda ===');
{
  ponerPreset(NUEVA, { actualizaSola: true });
  const r0 = guardado();
  r0.categorias[1].peso = 30; r0.categorias.push({ id: 'cx', nombre: 'Control', peso: 6, notas: [] });
  const r = cargar(r0);
  chk('no se toca', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 30, Talleres: 4, Control: 6 }));
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
  ponerPreset([['Prueba', 60], ['Tarea', 36], ['Cápsulas', 4]], { actualizaSola: true });
  const r = cargar(guardado({ Talleres: 6.0 }));
  chk('no se aplica solo', JSON.stringify(pesos(r)) === JSON.stringify({ Prueba: 60, Tarea: 36, Talleres: 4 }));
  chk('se sigue ofreciendo', !!g('cambioDePauta')(r));
}
delete g('PRESETS_FEN')[RAMO];

console.log('\n=== Introducción a la Programación ===');
{
  const p = g('PRESETS_UC')['Introducción a la Programación'];
  const evals = Object.fromEntries(p.evals.map(([n, w]) => [n, w]));
  chk('Cápsulas de IA al 2%', evals['Cápsulas de Inteligencia Artificial'] === 2);
  chk('Talleres de IA al 2%', evals['Talleres de Inteligencia Artificial'] === 2);
  chk('suma 100', Math.abs(Object.values(evals).reduce((a, b) => a + b, 0) - 100) < 1e-9);
  chk('se corrige sola', p.actualizaSola === true);
}

console.log(`\n${ok} ok, ${fail} fallos`);
if (fail) process.exit(1);
