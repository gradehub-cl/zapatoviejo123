// Información académica en Ajustes: Universidad, Carrera y Semestre de carrera
// van juntos y antes de "Guardar cambios", que es lo que guarda. "Semestres que
// ya cursaste" va aparte y al final: abre otra hoja y no se guarda con ese botón.
// Antes partía en dos lo que se guarda y el botón quedaba pegado al título
// siguiente (iPhone, 2026-10-06).
const fs = require('fs'), path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const ini = app.indexOf("if(section==='academico')return `"), fin = app.indexOf("if(section==='calendario')", ini);
const panel = app.slice(ini, fin);
const pos = t => panel.indexOf(t);
let ok = 0, fail = 0;
const chk = (n, c) => { if (c) { ok++; console.log('  OK   ' + n); } else { fail++; console.log('  FAIL ' + n); } };
chk('el panel existe', ini > 0 && fin > ini);
chk('Universidad, Carrera y Semestre de carrera, en ese orden', pos('Universidad') < pos('s-carrera-grid') && pos('s-carrera-grid') < pos('Semestre de carrera'));
chk('Guardar cambios va después de lo que guarda', pos('Semestre de carrera') < pos('${guardarBtn()}'));
chk('Semestres que ya cursaste va al final, después de guardar', pos('${guardarBtn()}') < pos('Semestres que ya cursaste') && pos('Semestres que ya cursaste') < pos('openSemestreAnteriorModal'));
console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail ? 1 : 0);
