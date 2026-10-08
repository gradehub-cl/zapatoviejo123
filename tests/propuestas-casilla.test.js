// La `casilla` de una propuesta del agente cuenta desde 1 y `slot` desde 0
// (issue #655): "Control 1" va a la primera casilla, el último no crea una de
// más, y una nota sin casilla nunca pisa otra ya ingresada. Pauta sintética.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const nodo={style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},dataset:{}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>nodo,createElement:()=>nodo,addEventListener(){},documentElement:nodo,querySelector:()=>nodo,querySelectorAll:()=>[],body:nodo},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
  setTimeout,clearTimeout,console,syncToCloud(){}};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
run(`globalThis.nuevo=()=>({id:'r',nombre:'Ramo sintético',categorias:[
  {id:'c',nombre:'Controles',peso:40,slots:3,notas:[]},
  {id:'i',nombre:'Informes',peso:30,slots:2,slotLabel:'Informe',slotStart:0,notas:[]},
  {id:'e',nombre:'Examen',peso:30,notas:[]}],gates:[]});
  globalThis.cat=(R,id)=>R.categorias.find(c=>c.id===id);`);

console.log('\n=== Fechas ===');
run(`globalThis.R=nuevo();escribirFechaPropuesta(R,cat(R,'c'),{casilla:1,fecha:'2026-10-01'});escribirFechaPropuesta(R,cat(R,'c'),{casilla:3,fecha:'2026-11-01'});`);
chk('el Control 1 va a la primera casilla',run(`cat(R,'c').notas.find(n=>n.slot===0).fecha`)==='2026-10-01');
chk('el Control 3 de 3 va a la última, sin casilla extra',run(`cat(R,'c').notas.find(n=>n.slot===2).fecha`)==='2026-11-01'&&run(`cat(R,'c').notas.every(n=>n.slot<3)`));
chk('la casilla se nombra como en la app',run(`cat(R,'c').notas.find(n=>n.slot===0).nombre`)===run(`etiquetaCasilla(R,cat(R,'c'),0)`));
chk('una casilla fuera de rango no se aplica',run(`escribirFechaPropuesta(R,cat(R,'c'),{casilla:4,fecha:'2026-12-01'})`)===false);
chk('"casilla 1" de una evaluación sin casillas es la evaluación',run(`escribirFechaPropuesta(R,cat(R,'e'),{casilla:1,fecha:'2026-12-05'})`)===true&&run(`cat(R,'e').fecha`)==='2026-12-05'&&run(`cat(R,'e').notas.length`)===0);
run(`escribirFechaPropuesta(R,cat(R,'i'),{casilla:1,fecha:'2026-09-01'})`);
chk('con casillas desde 0, la casilla 1 es el Informe 0',run(`cat(R,'i').notas.find(n=>n.slot===0).nombre`)==='Informe 0');

console.log('\n=== Notas ===');
run(`globalThis.R=nuevo();escribirNotaPropuesta(cat(R,'c'),{casilla:1,valor:5.5},R);escribirNotaPropuesta(cat(R,'c'),{casilla:3,valor:6.1},R);`);
chk('la nota del Control 1 va a la primera casilla',run(`cat(R,'c').notas.find(n=>n.slot===0).valor`)===5.5);
chk('la del Control 3 va a la última, sin casilla extra',run(`cat(R,'c').notas.find(n=>n.slot===2).valor`)===6.1&&run(`cat(R,'c').notas.every(n=>n.slot<3)`));
run(`escribirNotaPropuesta(cat(R,'c'),{valor:4.2},R)`);
chk('sin casilla, va a la primera libre',run(`cat(R,'c').notas.find(n=>n.slot===1).valor`)===4.2);
chk('con todas llenas, no pisa ninguna',run(`escribirNotaPropuesta(cat(R,'c'),{valor:1.0},R)`)===false&&run(`cat(R,'c').notas.map(n=>n.valor).sort().join()`)==='4.2,5.5,6.1');
chk('una casilla fuera de rango no se aplica',run(`escribirNotaPropuesta(cat(R,'c'),{casilla:4,valor:7},R)`)===false);
run(`globalThis.R=nuevo();cat(R,'c').notas=[{id:'x',nombre:'Control 2',valor:null,peso:1,slot:1,fecha:'2026-10-09'}];escribirNotaPropuesta(cat(R,'c'),{casilla:2,valor:5},R)`);
chk('una casilla pendiente con fecha recibe la nota y conserva la fecha',run(`cat(R,'c').notas.length`)===1&&run(`cat(R,'c').notas[0].valor`)===5&&run(`cat(R,'c').notas[0].fecha`)==='2026-10-09');
chk('el promedio usa la casilla correcta',run(`ramoAvg(R)`)===5);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
