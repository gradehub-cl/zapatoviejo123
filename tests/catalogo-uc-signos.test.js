// Los ¿ y ? del catálogo UC no vuelven a llegar como «ñ» (#718).
//
// El script que generó cursos-uc.js (#348) no está en el repo: si alguien lo
// vuelve a correr con el mismo problema de codificación, esto lo detecta antes
// de que "Filosofía: ñPara queñ" llegue a la app y deje de calzar con su pauta.
const fs=require('fs');
const s=fs.readFileSync(__dirname+'/../cursos-uc.js','utf8');
// Ahí la ñ no era un signo de pregunta y no se adivinó qué era ("Dñ", "1ñ Parte").
const CONOCIDOS=new Set(['DEM293','IHS193A','IHS193B']);
const rotos=[...s.matchAll(/\["([A-Z0-9]+)","((?:[^"\\]|\\.)*)"/g)]
  .filter(([,sigla,nombre])=>!CONOCIDOS.has(sigla)&&/(^|[\s(])ñ|[A-Za-záéíóúü]ñ($|[\s),:;.])/.test(nombre))
  .map(([,sigla,nombre])=>`${sigla} ${nombre}`);
console.log(rotos.length?`  FAIL ${rotos.length} nombres con ñ en lugar de ¿ o ?:\n    ${rotos.slice(0,10).join('\n    ')}`:'  OK   ningún nombre con ñ en lugar de ¿ o ?');
const preset=/Filosofía: ¿Para que\?/.test(s);
console.log(`  ${preset?'OK  ':'FAIL'} FIL2001 se escribe con sus signos`);
process.exit(rotos.length||!preset?1:0);
