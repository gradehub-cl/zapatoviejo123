// El registro de fuentes (docs/programas-uc-2026.json, #632) tiene que decir lo
// mismo que la pauta. Si alguien cambia un peso en data.js sin volver a mirar
// el programa, esto falla y obliga a actualizar la cita o a revisar el cambio.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(raiz + 'data.js', 'utf8') + ';this.U=PRESETS_UC;', ctx);
const registro = JSON.parse(fs.readFileSync(raiz + 'docs/programas-uc-2026.json', 'utf8'));
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const forma = evals => JSON.stringify((evals || []).map(e => [e[0], Math.round(e[1] * 1000) / 1000]));
for (const p of registro.programas) {
  const d = ctx.U[p.nombre_catalogo];
  const evals = Array.isArray(d) ? d : d && d.evals;
  chk(`${p.nombre_catalogo}: la pauta existe`, !!evals);
  chk(`${p.nombre_catalogo}: mismas evaluaciones y pesos que el registro`, forma(evals) === forma(p.evaluaciones));
  chk(`${p.nombre_catalogo}: suma 100`, Math.abs(p.suma_ponderaciones - 100) < 1e-6);
  chk(`${p.nombre_catalogo}: dice de qué archivo sale`, typeof p.archivo_fuente === 'string' && p.archivo_fuente.length > 4);
}
console.log('\nPASS: ' + ok + '   FAIL: ' + fail);
process.exit(fail ? 1 : 0);
