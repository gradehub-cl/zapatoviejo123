// Dos evaluaciones con el mismo nombre ("Controles" 5,0 y "Controles" 6,0) no
// pueden perder notas al cambiar la pauta. fusionarPauta las guardaba en un
// Map por nombre y la segunda pisaba a la primera: sus notas desaparecían al
// adoptar el consenso, actualizar la pauta oficial o aplicar una propuesta.
// Ramos y notas sintéticos.
const fs = require('fs'), vm = require('vm'), path = require('path');
const raiz = path.join(__dirname, '..');
const stub = { style: { setProperty() {}, removeProperty() {} }, addEventListener() {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false; } },
  value: '', innerHTML: '', textContent: '', focus() {}, setAttribute() {}, removeAttribute() {}, getAttribute() { return null; }, querySelectorAll() { return []; }, querySelector() { return stub; }, dataset: {} };
const ctx = { window: { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }) },
  document: { getElementById: () => stub, createElement: () => stub, addEventListener() {}, documentElement: stub, querySelector: () => stub, querySelectorAll: () => [], body: stub },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, location: { origin: '', pathname: '', hash: '' }, setTimeout, clearTimeout, console };
vm.createContext(ctx);
for (const f of ['data.js', 'engine.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
const run = c => vm.runInContext(c, ctx);
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const nota = (id, valor) => ({ id, nombre: 'Nota', valor, peso: 1 });
const ramo = (cats, extra = {}) => ({ id: 'r1', nombre: 'Ramo sintético', gates: [], categorias: JSON.parse(JSON.stringify(cats)), ...extra });
const fusionar = (r, nuevas) => { ctx.__r = r; ctx.__n = nuevas; run('fusionarPauta(__r,__n)'); return r; };
const valores = r => r.categorias.flatMap(c => (c.notas || []).map(n => n.valor)).sort();
const dosControles = [
  { id: 'a', nombre: 'Controles', peso: 20, notas: [nota('n1', 5.0)] },
  { id: 'b', nombre: 'Controles', peso: 20, notas: [nota('n2', 6.0)] },
  { id: 'c', nombre: 'Examen', peso: 60, notas: [] },
];

console.log('\n=== Dos viejas, una nueva ===');
{
  const r = fusionar(ramo(dosControles), [{ id: 'x', nombre: 'Controles', peso: 40 }, { id: 'y', nombre: 'Examen', peso: 60 }]);
  chk('las dos notas siguen en el ramo', JSON.stringify(valores(r)) === JSON.stringify([5, 6]));
  const viva = r.categorias.find(c => c.nombre === 'Controles' && !c.fueraDePauta);
  chk('la primera vieja va a la nueva y conserva su id', viva && viva.id === 'a' && viva.notas.length === 1 && viva.notas[0].valor === 5);
  const fuera = r.categorias.filter(c => c.fueraDePauta);
  chk('la segunda queda fuera de pauta al 0 %, con su id', fuera.length === 1 && fuera[0].id === 'b' && fuera[0].peso === 0 && fuera[0].notas[0].valor === 6);
  chk('la pauta (sin las de 0 %) es la nueva', JSON.stringify(run('catsDePauta')(r.categorias).map(c => [c.nombre, c.peso])) === JSON.stringify([['Controles', 40], ['Examen', 60]]));
  chk('volver a aplicar la misma pauta no cambia nada',
    JSON.stringify(fusionar(JSON.parse(JSON.stringify(r)), [{ id: 'x', nombre: 'Controles', peso: 40 }, { id: 'y', nombre: 'Examen', peso: 60 }]).categorias) === JSON.stringify(r.categorias));
  chk('si la pauta vuelve a traer dos, la conservada revive en su par',
    (() => { const s = fusionar(JSON.parse(JSON.stringify(r)), [{ id: 'x', nombre: 'Controles', peso: 20 }, { id: 'x2', nombre: 'Controles', peso: 20 }, { id: 'y', nombre: 'Examen', peso: 60 }]);
      const cs = s.categorias.filter(c => c.nombre === 'Controles');
      return cs.length === 2 && cs.every(c => !c.fueraDePauta) && cs[0].notas[0].valor === 5 && cs[1].notas[0].valor === 6; })());
}

console.log('\n=== Dos y dos ===');
{
  const r = fusionar(ramo(dosControles), [{ id: 'x', nombre: 'Controles', peso: 15 }, { id: 'x2', nombre: 'controles ', peso: 25 }, { id: 'y', nombre: 'Examen', peso: 60 }]);
  const cs = r.categorias.filter(c => normal(c.nombre) === 'controles');
  function normal(n) { return run('normName')(n); }
  chk('cada una en su par, en orden', cs.length === 2 && cs[0].notas[0].valor === 5 && cs[0].peso === 15 && cs[1].notas[0].valor === 6 && cs[1].peso === 25);
  chk('cada una conserva su id', cs[0].id === 'a' && cs[1].id === 'b');
  chk('nada queda fuera de pauta', r.categorias.every(c => !c.fueraDePauta));
}

console.log('\n=== Sin repetidos, igual que antes ===');
{
  const r = fusionar(ramo([
    { id: 'p', nombre: 'Solemne 1', peso: 50, notas: [nota('s1', 4.2)] },
    { id: 'q', nombre: 'Taller', peso: 50, notas: [nota('t1', 6.8)] },
    { id: 'v', nombre: 'Vacía', peso: 0, notas: [] },
  ]), [{ id: 'x', nombre: 'solemne 1', peso: 60 }, { id: 'y', nombre: 'Examen', peso: 40 }]);
  chk('la que calza toma su nota y su id', r.categorias[0].id === 'p' && r.categorias[0].notas[0].valor === 4.2 && r.categorias[0].peso === 60);
  chk('la nueva llega vacía', r.categorias[1].nombre === 'Examen' && r.categorias[1].notas.length === 0);
  chk('la que sale con nota queda en 0 %; la vacía se va',
    r.categorias.length === 3 && r.categorias[2].id === 'q' && r.categorias[2].fueraDePauta && r.categorias[2].peso === 0);
}

console.log('\n=== Una viva y una ya fuera de pauta con el mismo nombre ===');
{
  const r = fusionar(ramo([
    { id: 'f', nombre: 'Controles', peso: 0, fueraDePauta: true, notas: [nota('m1', 3.9)] },
    { id: 'a', nombre: 'Controles', peso: 40, notas: [nota('m2', 5.5)] },
    { id: 'c', nombre: 'Examen', peso: 60, notas: [] },
  ]), [{ id: 'x', nombre: 'Controles', peso: 40 }, { id: 'y', nombre: 'Examen', peso: 60 }]);
  const viva = r.categorias.find(c => c.nombre === 'Controles' && !c.fueraDePauta);
  chk('manda la viva', viva.id === 'a' && viva.notas[0].valor === 5.5);
  chk('la que estaba fuera sigue conservada', r.categorias.some(c => c.id === 'f' && c.fueraDePauta && c.notas[0].valor === 3.9));
}

console.log('\n=== Copia duplicada por la sincronización (mismas notas) ===');
{
  const r = fusionar(ramo([
    { id: 'a', nombre: 'Controles', peso: 40, notas: [nota('k1', 5.0)] },
    { id: 'b', nombre: 'Controles', peso: 40, notas: [nota('k1', 5.0)] },
  ]), [{ id: 'x', nombre: 'Controles', peso: 100 }]);
  chk('la misma nota no queda dos veces', r.categorias.length === 1 && r.categorias[0].notas.length === 1);
}

console.log('\n=== Ausencias justificadas siguen a su evaluación ===');
{
  const r = fusionar(ramo(dosControles, { ausenciasJustificadas: ['b'] }), [{ id: 'x', nombre: 'Controles', peso: 40 }, { id: 'y', nombre: 'Examen', peso: 60 }]);
  chk('la de la segunda no pasa a la primera', JSON.stringify(r.ausenciasJustificadas) === JSON.stringify(['b']));
}

console.log('\n=== El aviso antes de cambiar ===');
{
  const sobran = run('repetidasSinPareja')(ramo(dosControles), [{ nombre: 'Controles', peso: 40 }, { nombre: 'Examen', peso: 60 }]);
  chk('detecta la repetida que quedaría en 0 %', sobran.length === 1 && sobran[0].id === 'b');
  chk('con dos y dos no sobra nada', run('repetidasSinPareja')(ramo(dosControles), [{ nombre: 'Controles' }, { nombre: 'Controles' }, { nombre: 'Examen' }]).length === 0);
}

console.log('\n=== Adoptar el consenso («Usar esta») ===');
{
  ctx.__r = ramo(dosControles);
  run(`adoptarConsensoEnRamo(__r,{respaldos:3,estructura:[{nombre:'Controles',peso:40},{nombre:'Examen',peso:60}]})`);
  chk('las dos notas siguen en el ramo', JSON.stringify(valores(ctx.__r)) === JSON.stringify([5, 6]));
}

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
