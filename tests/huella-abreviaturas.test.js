// "I1/I2/I3" con los pesos del programa es la MISMA pauta que "Interrogación
// 1/2/3" (reportes de Cálculo II, 2026-11-21). Se prueba que la app y el
// servidor agrupen igual, que no se abrevie lo ambiguo, que la regla anterior
// siga reconociendo lo ya enviado y que el SQL para producción sea el mismo.
// Pautas sintéticas.
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
const h = (est, viejo) => run('huellaEstructura')(est, viejo);
const n = (nombre, viejo) => run('nombreHuella')(nombre, viejo);

const oficial = [{ nombre: 'Interrogación 1', peso: 20 }, { nombre: 'Interrogación 2', peso: 20 }, { nombre: 'Interrogación 3', peso: 20 },
  { nombre: 'Examen', peso: 30 }, { nombre: 'Laboratorio', peso: 10, slots: 3 }];
const abreviada = [{ nombre: 'I1', peso: 20 }, { nombre: 'I2', peso: 20 }, { nombre: 'i 3', peso: 20 },
  { nombre: 'Examen', peso: 30 }, { nombre: 'Lab', peso: 10, slots: 3 }];
const casos = [
  oficial, abreviada,
  [{ nombre: 'P1', peso: 30 }, { nombre: 'P2', peso: 30 }, { nombre: 'C1', peso: 20 }, { nombre: 'Control 2', peso: 20 }],
  [{ nombre: 'Taller IA', peso: 4 }, { nombre: 'T1', peso: 48 }, { nombre: 'Control R1', peso: 48 }],
  [{ nombre: 'Lab 1', peso: 50 }, { nombre: 'Laboratorios', peso: 25 }, { nombre: 'PP', peso: 25 }],
  [{ nombre: 'Prueba de la Unidad 1', peso: 50 }, { nombre: 'C1 parte 2', peso: 50 }],
];

(async () => {
  console.log('\n=== Abreviaturas que son la misma evaluación ===');
  chk('"I1, I2, i 3, Lab" = la pauta oficial escrita completa', h(oficial) === h(abreviada));
  chk('"P1" = "Prueba 1"', n('P1') === n('Prueba 1'));
  chk('"C3" = "Control 3"', n('C3') === n('Control 3'));
  chk('"Lab 2" = "Laboratorio 2"', n('Lab 2') === n('Laboratorio 2'));

  console.log('\n=== Lo ambiguo no se adivina ===');
  chk('"T1" no se vuelve Tarea ni Taller', n('T1') === 't 1');
  chk('"S1" no se vuelve Solemne', n('S1') === 's 1');
  chk('una letra sin número no cambia ("Taller IA", "Plan C")', n('Taller IA') === 'taller ia' && n('Plan C') === 'plan c');
  chk('una letra pegada a otra palabra no cambia ("Control R1")', n('Control R1') === 'control r 1');

  console.log('\n=== La regla anterior sigue igual (yaAportada) ===');
  chk('con la regla anterior, "I1" sigue siendo "i 1"', n('I1', true) === 'i 1');

  console.log('\n=== La app y el servidor dicen lo mismo ===');
  const { PGlite } = await import('@electric-sql/pglite');
  const funcion = archivo => {
    const sql = fs.readFileSync(path.join(raiz, 'supabase', archivo), 'utf8');
    const i = sql.indexOf('create or replace function public.huella_catalogo');
    return i < 0 ? '' : sql.slice(i, sql.indexOf('$$;', i) + 3);
  };
  const base = funcion('catalog_consensus.sql');
  chk('el SQL para producción trae la misma función que catalog_consensus.sql', base && base === funcion('huella_abreviaturas.sql'));
  const db = new PGlite();
  await db.exec(base);
  for (const est of casos) {
    const { rows } = await db.query('select public.huella_catalogo($1::jsonb) as h', [JSON.stringify(est)]);
    chk(`misma huella: ${est.map(e => e.nombre).join(', ')}`, rows[0].h === h(est));
  }
  chk('mismo mapa en los dos lados',
    /'\(\^\| \)i\(\?= \[0-9\]\)', '\\1interrogacion'/.test(base) && /'\(\^\| \)p\(\?= \[0-9\]\)', '\\1prueba'/.test(base) &&
    /'\(\^\| \)c\(\?= \[0-9\]\)', '\\1control'/.test(base) &&
    run('JSON.stringify(ABREVIATURAS_HUELLA)') === '{"i":"interrogacion","p":"prueba","c":"control"}');

  console.log('\n=== Adoptar una pauta conserva las notas abreviadas ===');
  run(`globalThis.__m={id:'m',nombre:'Ramo sintético',categorias:[
      {id:'x',nombre:'I1',peso:50,notas:[{id:'n1',valor:4.5,peso:1}]},
      {id:'y',nombre:'Examen',peso:50,notas:[]}],gates:[]};
    fusionarPauta(__m,[{id:'x2',nombre:'Interrogación 1',peso:50},{id:'y2',nombre:'Examen',peso:50}]);`);
  chk('la nota de "I1" pasa a "Interrogación 1"', run(`__m.categorias.find(c=>c.nombre==='Interrogación 1').notas.some(n=>n.valor===4.5)`));
  chk('y no queda nada en 0%', run(`__m.categorias.every(c=>!c.fueraDePauta)`));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
