// "N estudiantes reportan otra pauta" no puede aparecer cuando la pauta es la
// misma. Pasó en Contabilidad FEN el 2026-10-05: lo reportado era nuestra pauta
// sin el "de" en un nombre y sin el mínimo del examen. Pauta sintética con la
// misma forma; no se ata al catálogo real.
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

run(`S.tenant='fen';PRESETS_FEN['Ramo Sintético Conta']={evals:[
  ['Control de Lectura 1',3.33],['Control de Lectura 2',3.33],['Control de Lectura 3',3.34],
  ['Control de Ejercicios 1',10],['Control de Ejercicios 2',10],['Control de Ejercicios 3',10],['Control de Ejercicios 4',10],
  ['Controles Sorpresa',5,{lista:true}],['Solemne',20],['Examen',25,{min:3.0,cap:3.4}]]};
  const p=presetRamo('Ramo Sintético Conta','fen',null);
  globalThis.__r={id:'r1',nombre:'Ramo Sintético Conta',origen:{tenant:'fen',carrera:null},categorias:p.categorias,gates:p.gates};`);
const ofrece = async estructura => {
  run(`globalThis.__cons=[{ramo_key:claveReporte(__r),estructura:${JSON.stringify(estructura)},respaldos:3}];cargarConsenso=async()=>__cons;`);
  return !!(await run('consensoParaRamo(__r)'));
};
const reportada = [{ nombre: 'Controles de Lectura', peso: 10, slots: 3 }, { nombre: 'Controles Ejercicios', peso: 40, slots: 4 },
  { nombre: 'Controles sorpresa', peso: 5 }, { nombre: 'Examen', peso: 25 }, { nombre: 'Solemne', peso: 20 }];

(async () => {
  console.log('\n=== La misma pauta escrita distinto no se ofrece ===');
  chk('sin el "de" y sin el mínimo del examen: no hay aviso', !(await ofrece(reportada)));
  chk('con el mínimo del examen igual al nuestro, tampoco', !(await ofrece(reportada.map(e => e.nombre === 'Examen' ? { ...e, min: 3, cap: 3.4 } : e))));

  console.log('\n=== Lo que sí difiere se sigue ofreciendo ===');
  chk('otros pesos', await ofrece(reportada.map(e => e.nombre === 'Solemne' ? { ...e, peso: 25 } : e.nombre === 'Examen' ? { ...e, peso: 20 } : e)));
  chk('una regla que la nuestra no tiene', await ofrece(reportada.map(e => e.nombre === 'Solemne' ? { ...e, min: 3.5, cap: 3.9 } : e)));
  chk('otro mínimo para el examen', await ofrece(reportada.map(e => e.nombre === 'Examen' ? { ...e, min: 4, cap: 3.9 } : e)));
  chk('otra evaluación con otro nombre', await ofrece(reportada.map(e => e.nombre === 'Solemne' ? { ...e, nombre: 'Proyecto' } : e)));
  chk('otra cantidad de controles', await ofrece(reportada.map(e => e.nombre === 'Controles Ejercicios' ? { ...e, slots: 3 } : e)));

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
