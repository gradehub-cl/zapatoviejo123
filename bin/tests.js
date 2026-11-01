#!/usr/bin/env node
// Corre todos los tests de `tests/*.test.js`.
//
// Descubre los archivos sin mantener listas compartidas en package.json.
// Uno solo: node tests/<archivo>.test.js. Toda la suite con menos salida:
// npm test -- --resumen (el registro completo queda en .cache/tests.log).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const args=process.argv.slice(2);
if(args.includes('--help')){
  console.log('Uso: npm test [-- --resumen]. Ejecuta siempre todos los tests; --resumen guarda el detalle en .cache/tests.log.');
  process.exit(0);
}
if(args.some(a=>a!=='--resumen')){
  console.error('Opción desconocida. Usa npm test -- --help.');
  process.exit(1);
}
const resumen=args.includes('--resumen');

// Los tests consumen exactamente los scripts que recibirá el navegador.
require('./compilar-js').compilar();

const dir = path.join(__dirname, '..', 'tests');
const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

// `sintaxis` va primero a propósito: si un archivo de la app no parsea, todo lo
// demás va a fallar por la misma causa y con mensajes peores.
archivos.sort((a, b) => (b === 'sintaxis.test.js') - (a === 'sintaxis.test.js'));

const fallaron = [];
// Redirige a un archivo, no a un buffer: un test con mucha salida no pierde
// sus errores ni consume el límite de salida de la conversación.
const cache=path.join(__dirname,'..','.cache');
const temporal=path.join(cache,'tests-'+process.pid+'.log');
let registro;
if(resumen){fs.mkdirSync(cache,{recursive:true});registro=fs.openSync(temporal,'w');}
let corridos=0;
for (const f of archivos) {
  const titulo='\n──────── '+f+'\n';
  if(resumen)fs.writeSync(registro,titulo);else console.log(titulo.trimEnd());
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: resumen?['ignore',registro,registro]:'inherit' });
  // Un test puede fallar de dos formas y NO se ven igual: puede terminar con
  // código 1 después de imprimir sus FAIL, o puede reventar antes de imprimir
  // nada. La segunda no deja ninguna línea que buscar en la salida, así que se
  // reporta aparte — es exactamente el caso que hace inútil grepear por "FAIL".
  if (r.signal) fallaron.push(f + ' (murió con ' + r.signal + ')');
  else if (r.status !== 0) fallaron.push(f + ' (salió ' + r.status + ')');
  corridos++;
  if(resumen&&corridos%50===0)console.log('Tests: '+corridos+'/'+archivos.length);
}
if(resumen){
  fs.closeSync(registro);
  fs.renameSync(temporal,path.join(cache,'tests.log'));
  console.log('Detalle completo: .cache/tests.log');
}

console.log('\n════════════════════════════════════════');
if (fallaron.length) {
  console.log('FALLARON ' + fallaron.length + ' de ' + archivos.length + ':');
  fallaron.forEach(f => console.log('  · ' + f));
  process.exit(1);
}
console.log('Pasaron los ' + archivos.length + ' tests.');
