// Los conectores no distinguen evaluaciones (Contabilidad FEN, 2026-10-05):
// "Controles Ejercicios" y "Control de Ejercicios" son la misma. Se prueba que
// la app y el servidor digan lo mismo, que lo ya aportado con la huella vieja no
// se reenvíe como voto, y que adoptar una pauta no deje notas en 0% por eso.
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

const conDe = [{ nombre: 'Control de Ejercicios', peso: 40, slots: 4 }, { nombre: 'Solemne', peso: 60 }];
const sinDe = [{ nombre: 'Controles Ejercicios', peso: 40, slots: 4 }, { nombre: 'Solemne', peso: 60 }];
const casos = [
  conDe, sinDe,
  [{ nombre: 'Control de Lectura 1', peso: 3.33 }, { nombre: 'Control de Lectura 2', peso: 3.33 }, { nombre: 'Control de Lectura 3', peso: 3.34 }, { nombre: 'Examen', peso: 90, min: 3, cap: 3.4 }],
  [{ nombre: 'Taller y Proyecto', peso: 50 }, { nombre: 'Prueba de la Unidad 1', peso: 50 }],
  [{ nombre: 'Solemne3', peso: 30 }, { nombre: 'Controles', peso: 70, slots: 5 }],
];

(async () => {
  console.log('\n=== La app agrupa sin conectores ===');
  chk('"Controles Ejercicios" = "Control de Ejercicios"', h(conDe) === h(sinDe));
  chk('la regla anterior las separaba (para reconocer lo ya enviado)', h(conDe, true) !== h(sinDe, true));

  console.log('\n=== La app y el servidor dicen lo mismo ===');
  const { PGlite } = await import('@electric-sql/pglite');
  const sql = fs.readFileSync(path.join(raiz, 'supabase/catalog_consensus.sql'), 'utf8');
  const i = sql.indexOf('create or replace function public.huella_catalogo');
  const db = new PGlite();
  await db.exec(sql.slice(i, sql.indexOf('$$;', i) + 3));
  for (const est of casos) {
    const { rows } = await db.query('select public.huella_catalogo($1::jsonb) as h', [JSON.stringify(est)]);
    chk(`misma huella: ${est.map(e => e.nombre).join(', ')}`, rows[0].h === h(est));
  }
  chk('mismos conectores en los dos lados',
    /w not in \('de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en'\)/.test(sql) &&
    run(`[...CONECTORES_HUELLA].join()`) === 'de,del,la,las,el,los,y,e,en');

  console.log('\n=== Lo aportado con la huella vieja no se reenvía ===');
  run(`globalThis.__r={id:'r1',nombre:'Ramo sintético',origen:null,consensoRespaldos:3,
    categorias:[{id:'a',nombre:'Control de Ejercicios',peso:40,slots:4,notas:[]},{id:'b',nombre:'Solemne',peso:60,notas:[]}],gates:[]};
    __r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(__r)),true);`);
  chk('una pauta recibida del consenso no cuenta como voto propio', run('pautaPropiaParaConsenso(__r)') === false);
  run(`__r.categorias[1].peso=50;__r.categorias.push({id:'c',nombre:'Tarea',peso:10,notas:[]});`);
  chk('si la persona la cambia, sí cuenta', run('pautaPropiaParaConsenso(__r)') === true);

  console.log('\n=== Adoptar una pauta conserva las notas de nombre equivalente ===');
  run(`globalThis.__m={id:'m',nombre:'Ramo sintético',categorias:[
      {id:'x',nombre:'Control de Ejercicios',peso:40,slots:4,notas:[{id:'n1',valor:6.1,slot:0,peso:1}]},
      {id:'y',nombre:'Solemne',peso:60,notas:[{id:'n2',valor:5.0,peso:1}]}],gates:[]};
    fusionarPauta(__m,[{id:'x2',nombre:'Controles Ejercicios',peso:40,slots:4},{id:'y2',nombre:'Solemne',peso:60}]);`);
  chk('la nota del control pasa a "Controles Ejercicios"', run(`__m.categorias.find(c=>c.nombre==='Controles Ejercicios').notas.some(n=>n.valor===6.1)`));
  chk('y no queda nada en 0%', run(`__m.categorias.every(c=>!c.fueraDePauta)`));
  run(`globalThis.__d={id:'d',nombre:'Ramo sintético',categorias:[
      {id:'p',nombre:'Prueba de Teoría',peso:50,notas:[{id:'t1',valor:4,peso:1}]},
      {id:'q',nombre:'Pruebas Teoría',peso:50,notas:[{id:'t2',valor:5,peso:1}]}],gates:[]};
    fusionarPauta(__d,[{id:'z',nombre:'Prueba Teoría',peso:100}]);`);
  chk('con dos candidatas no adivina: las dos quedan conservadas en 0%', run(`__d.categorias.filter(c=>c.fueraDePauta).length===2&&__d.categorias.find(c=>c.nombre==='Prueba Teoría').notas.length===0`));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
