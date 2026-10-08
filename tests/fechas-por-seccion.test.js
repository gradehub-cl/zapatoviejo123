// Fechas que dependen de la sección (2026-10-08): los controles de Dinámica se
// rinden en horario de taller, distinto por sección. `fechasPorSeccion` solo
// llena casillas vacías de la sección declarada y nunca pisa lo del estudiante.
// Pauta sintética escrita acá: es un test del mecanismo, no del catálogo.
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
run(`globalThis.def={evals:[['Controles',40,{slots:3}],['Prueba',60]],
  fechasPorSeccion:{7:{'Controles':['2026-08-28','2026-10-09','2026-11-06'],'Prueba':['2026-12-01']}}};
  globalThis.nuevo=(extra)=>({id:'r',nombre:'Ramo sintético',seccion:7,
    categorias:[{id:'c',nombre:'Controles',peso:40,slots:3,notas:[]},{id:'p',nombre:'Prueba',peso:60,notas:[]}],gates:[],...extra});`);
const fechas=()=>run('[0,1,2].map(i=>(R.categorias[0].notas.find(n=>n.slot===i)||{}).fecha||null)');

run('globalThis.R=nuevo();completarFechasDeSeccion(R,def)');
chk('cada casilla recibe su fecha, en orden',JSON.stringify(fechas())===JSON.stringify(['2026-08-28','2026-10-09','2026-11-06']));
chk('las casillas quedan pendientes, sin nota',run('R.categorias[0].notas.every(n=>n.valor===null&&n.fechaOrigen==="catalogo")'));
chk('cada casilla se nombra como la app',run('R.categorias[0].notas.find(n=>n.slot===0).nombre')===run('etiquetaCasilla(R,R.categorias[0],0)'));
chk('una evaluación sin casillas recibe la fecha en la categoría',run('R.categorias[1].fecha')==='2026-12-01');
run('completarFechasDeSeccion(R,def)');
chk('correrlo de nuevo no duplica casillas',run('R.categorias[0].notas.length')===3);

run(`globalThis.R=nuevo();R.categorias[0].notas=[
  {id:'a',nombre:'Control 1',valor:5.5,peso:1,slot:0},
  {id:'b',nombre:'Control 2',valor:null,peso:1,slot:1,fecha:'2026-10-20',fechaOrigen:'usuario'},
  {id:'c3',nombre:'Control 3',valor:null,peso:1,slot:2,fecha:null,fechaQuitada:true}];
  completarFechasDeSeccion(R,def)`);
chk('una casilla con nota recibe la fecha y conserva la nota',run('R.categorias[0].notas.find(n=>n.slot===0).valor')===5.5&&fechas()[0]==='2026-08-28');
chk('la fecha que puso el estudiante manda',fechas()[1]==='2026-10-20'&&run('R.categorias[0].notas.find(n=>n.slot===1).fechaOrigen')==='usuario');
chk('una fecha que el estudiante borró no vuelve',fechas()[2]===null);

run('globalThis.R=nuevo({seccion:8});completarFechasDeSeccion(R,def)');
chk('otra sección no recibe nada',run('R.categorias[0].notas.length')===0&&!run('R.categorias[1].fecha'));
run('globalThis.R=nuevo({seccion:null});completarFechasDeSeccion(R,def)');
chk('sin sección no recibe nada',run('R.categorias[0].notas.length')===0);
run('globalThis.R=nuevo();completarFechasDeSeccion(R,{evals:def.evals})');
chk('una pauta sin fechasPorSeccion no cambia nada',run('R.categorias[0].notas.length')===0);
run('globalThis.R=nuevo();completarFechasDeSeccion(R,{fechasPorSeccion:{7:{"Controles":["no es fecha"]}}})');
chk('una fecha mal escrita se ignora',run('R.categorias[0].notas.length')===0);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
