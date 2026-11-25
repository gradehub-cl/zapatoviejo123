// Quitar una evaluación de una pauta completa no debería obligar al estudiante
// a resolver decimales periódicos. Revelación y Fe tiene tres evaluaciones de
// 20/20/30 y un examen de 30: al sacar el examen, las restantes mantienen su
// proporción y vuelven a sumar 100.
const fs=require('fs'),vm=require('vm');
const raiz=__dirname+'/../';
const appPath=process.env.GRADEHUB_APP||raiz+'app.js';
const src=[raiz+'data.js',raiz+'engine.js',appPath,raiz+'app-session.js',raiz+'render-main.js',raiz+'render-agenda.js']
  .map(f=>fs.readFileSync(f,'utf8')).join('\n');

function elemento(){return {style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},appendChild(){},remove(){},focus(){this.focused=true},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},value:'',innerHTML:'',textContent:'',hidden:false,dataset:{},clientWidth:375,clientHeight:600,children:[]};}
const ids={};
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>ids[id]||(ids[id]=elemento()),createElement:elemento,addEventListener(){},querySelector(){return elemento()},querySelectorAll(){return []},documentElement:elemento(),body:elemento()},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout(fn){fn();return 0},clearTimeout(){},requestAnimationFrame(){return 0},cancelAnimationFrame(){},console,gtag(){}
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=codigo=>vm.runInContext(codigo,ctx);
let ok=0,fail=0;
function chk(nombre,cond){if(cond){ok++;console.log('  OK   '+nombre);}else{fail++;console.log('  FAIL '+nombre);}}
function cerca(a,b){return Math.abs(a-b)<1e-9;}

console.log('\n=== El editor reparte el peso después de confirmar ===');
run(`
  pautaDraft=[
    {id:'e1',nombre:'Evaluación 1',peso:20,tieneNotas:false},
    {id:'e2',nombre:'Evaluación 2',peso:20,tieneNotas:false},
    {id:'e3',nombre:'Evaluación 3',peso:30,tieneNotas:false},
    {id:'ex',nombre:'Examen final',peso:30,tieneNotas:false}
  ];
  confirmacionPendiente=null;
  showConfirm=(titulo,cuerpo,accion)=>{confirmacionPendiente=accion;};
  renderPautaManualModal=()=>{};
  quitarPautaFila(3);
`);
chk('no cambia la pauta antes de confirmar',run('pautaDraft.length')===4);
run('confirmacionPendiente()');
const pesos=run('pautaDraft.map(f=>f.peso)');
chk('conserva la proporción 2:2:3',cerca(pesos[0]/pesos[2],2/3)&&cerca(pesos[1]/pesos[2],2/3));
chk('las evaluaciones restantes suman exactamente 100%',cerca(pesos.reduce((s,p)=>s+p,0),100));
chk('el editor reconoce la pauta como completa',run('estadoPauta(pautaDraft).lista')===true);

console.log('\n=== Tres tercios no exigen escribir 33,3 periódico ===');
run(`
  pautaDraft=[
    {id:'a',nombre:'A',peso:20,tieneNotas:false},
    {id:'b',nombre:'B',peso:20,tieneNotas:false},
    {id:'c',nombre:'C',peso:20,tieneNotas:false},
    {id:'ex',nombre:'Examen',peso:40,tieneNotas:false}
  ];
  quitarPautaFila(3);confirmacionPendiente();
`);
const tercios=run('pautaDraft.map(f=>f.peso)');
chk('los tres pesos quedan iguales',cerca(tercios[0],tercios[1])&&cerca(tercios[1],tercios[2]));
chk('los tercios internos siguen sumando 100%',cerca(tercios.reduce((s,p)=>s+p,0),100));
run("actualizarPautaPeso(0,'33,33')");
chk('el campo acepta decimales sin convertir 33,33 en 100',cerca(run('pautaDraft[0].peso'),33.33));

console.log('\n=== Una pauta incompleta no se completa inventando ===');
run(`
  pautaDraft=[
    {id:'a',nombre:'A',peso:30,tieneNotas:false},
    {id:'b',nombre:'B',peso:20,tieneNotas:false},
    {id:'c',nombre:'C',peso:10,tieneNotas:false}
  ];
  quitarPautaFila(2);confirmacionPendiente();
`);
chk('si antes no sumaba 100, conserva los pesos conocidos',run('pautaDraft.map(f=>f.peso).join("|")')==='30|20');

console.log('\n=== Borrar desde la ficha usa la misma regla y conserva notas ===');
run(`
  S={ramos:[{id:'r',nombre:'Ramo',categorias:[
    {id:'a',nombre:'A',peso:20,notas:[{id:'n',valor:5,peso:1}]},
    {id:'b',nombre:'B',peso:20,notas:[]},
    {id:'c',nombre:'C',peso:20,notas:[]},
    {id:'ex',nombre:'Examen',peso:40,notas:[]}
  ]}]};currentRamoId='r';save=()=>{};renderRamo=()=>{};renderHome=()=>{};renderAgenda=()=>{};
  confirmDeleteCat('ex');confirmacionPendiente();
`);
const ficha=run('S.ramos[0].categorias');
chk('la eliminación directa también deja 100%',cerca(ficha.reduce((s,c)=>s+c.peso,0),100));
chk('la nota que ya existía no cambia',ficha[0].notas.length===1&&ficha[0].notas[0].valor===5);

console.log('\n=== La hoja «Editar evaluación» permite eliminarla, en todos los casos ===');
run('closeModal=()=>{};openModal=()=>{};wirePesoControl=()=>{};showToast=()=>{};track=()=>{};renderAgenda=()=>{};renderHome=()=>{};textoConfirmacion="";showConfirm=(t,d,f)=>{textoConfirmacion=d;confirmacionPendiente=f;};');
const armar=(b,gates=[])=>{ctx.__r=JSON.stringify([{id:'r',nombre:'Ramo',gates,categorias:[
  {id:'a',nombre:'A',peso:60,directNota:true,notas:[{id:'na',nombre:'A',valor:6,peso:1}]},b]}]);
  run("S={...freshState(),tenant:'fen',ramos:JSON.parse(__r)};currentRamoId='r';confirmacionPendiente=null;");};
for(const [caso,extra] of [['sin notas',{notas:[]}],['con nota',{notas:[{id:'n',nombre:'B',valor:5,peso:1}]}],
  ['pendiente con fecha',{notas:[{id:'n',nombre:'B',valor:null,peso:1,fecha:'2026-12-01'}]}],
  ['grupo de casillas',{slots:3,notas:[{id:'n',nombre:'B 1',valor:5,peso:1,slot:0}]}],
  ['lista',{directNota:false,notas:[{id:'n',nombre:'x',valor:5,peso:1},{id:'m',nombre:'y',valor:4,peso:1}]}]]){
  armar({id:'b',nombre:'B',peso:40,directNota:true,...extra});
  run("openEditCatModal('b')");
  chk(`${caso}: la hoja la ofrece`,/confirmDeleteCat\('b'\)/.test(ids['modal-content'].innerHTML));
  run("confirmDeleteCat('b')");
  chk(`${caso}: no borra antes de confirmar`,run('S.ramos[0].categorias.length')===2);
  run('confirmacionPendiente()');
  chk(`${caso}: queda fuera y la otra conserva su nota`,run('S.ramos[0].categorias.map(c=>c.id+c.peso+c.notas[0].valor).join()')==='a1006');
}
armar({id:'b',nombre:'B',peso:40,directNota:true,notas:[{id:'n',valor:5,peso:1}]},[
  {type:'min_grade_required',catId:'b',min:4,cap:3.9},{type:'group_min',catIds:['a','b'],min:4,cap:'self'}]);
run("confirmDeleteCat('b')");
chk('avisa que borra la nota y reparte el porcentaje',/borra su nota/.test(run('textoConfirmacion'))&&/40% se reparte/.test(run('textoConfirmacion')));
run('confirmacionPendiente()');
chk('su mínimo se va y el grupo deja de mirarla',run('JSON.stringify(S.ramos[0].gates.map(g=>g.catIds||g.catId))')==='[["a"]]');
armar({id:'b',nombre:'a',peso:60,directNota:true,notas:[{id:'nb',valor:5,peso:1}]});
run("confirmDeleteCat('b');confirmacionPendiente()");
chk('una repetida le pasa su nota a la otra',run('S.ramos[0].categorias[0].notas.map(n=>n.id).join()')==='na,nb');
armar({id:'b',nombre:'B',peso:40,directNota:true,notas:[]});
run("confirmDeleteCat('b');S=JSON.parse(JSON.stringify(S));confirmacionPendiente()");
chk('si la sincronización reemplazó el estado, borra en el vigente',run('S.ramos[0].categorias.length')===1);
armar({id:'b',nombre:'B',peso:40,directNota:true,notas:[]});
ctx.__base=run('JSON.stringify(S)');run("confirmDeleteCat('b');confirmacionPendiente()");
chk('la copia de la nube no la revive',run('fusionarSync(JSON.parse(__base),S,JSON.parse(__base)).ramos[0].categorias.length')===1);

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);process.exit(fail?1:0);
