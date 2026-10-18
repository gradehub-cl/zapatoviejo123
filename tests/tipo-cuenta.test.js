// Tipo de cuenta, estudiante o profesor (#697, PR 1). Sin interfaz todavía:
// fija que toda cuenta existente sigue siendo de estudiante y que el tipo viaja
// con la sincronización como cualquier otro dato de la cuenta.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;},toggle(){}},value:'',innerHTML:'',textContent:'',focus(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},dataset:{}};
const ctx={window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:()=>stub,createElement:()=>stub,addEventListener(){},documentElement:stub,querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},setTimeout,clearTimeout,console};
vm.createContext(ctx);
vm.runInContext(['data.js','engine.js','app.js','app-session.js'].map(leer).join('\n'),ctx);
const run=c=>vm.runInContext(c,ctx);

console.log('=== Toda cuenta existente es de estudiante ===');
chk('una cuenta nueva parte como estudiante',run('freshState().tipoCuenta')==='estudiante');
chk('una cuenta guardada antes de esto carga como estudiante',run('normalize({ramos:[]}).tipoCuenta')==='estudiante');
chk('un valor raro también',run(`normalize({ramos:[],tipoCuenta:'admin'}).tipoCuenta`)==='estudiante'&&run(`normalize({ramos:[],tipoCuenta:'Profesor'}).tipoCuenta`)==='estudiante');
chk('una cuenta de profesor se conserva',run(`normalize({ramos:[],tipoCuenta:'profesor'}).tipoCuenta`)==='profesor');
chk('normalizar no toca los ramos ni las notas',run(`JSON.stringify(normalize({ramos:[{id:'r',nombre:'X',categorias:[{id:'c',nombre:'C',peso:100,notas:[{id:'n',nombre:'N',valor:5.5}]}]}]}).ramos[0].categorias[0].notas[0].valor)`)==='5.5');
run(`S=freshState()`);
chk('esCuentaProfesor: no para estudiante',run('esCuentaProfesor()')===false);
run(`S.tipoCuenta='profesor'`);
chk('esCuentaProfesor: sí para profesor',run('esCuentaProfesor()')===true);

console.log('\n=== Viaja con la sincronización ===');
// Una cuenta convertida en el servidor (PR 7) llega a un dispositivo que
// todavía la tiene como estudiante: gana el cambio de la nube.
const base=JSON.stringify({ramos:[],tipoCuenta:'estudiante'});
ctx.__b=JSON.parse(base);ctx.__l=JSON.parse(base);ctx.__n={ramos:[],tipoCuenta:'profesor'};
chk('si solo cambió la nube, el dispositivo la recibe',run('fusionarSync(__b,__l,__n).tipoCuenta')==='profesor');
ctx.__n=JSON.parse(base);
chk('si nadie la cambió, queda igual',run('fusionarSync(__b,__l,__n).tipoCuenta')==='estudiante');

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
