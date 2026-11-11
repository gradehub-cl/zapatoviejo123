// El simulador consulta al mismo motor que la ficha. Pautas sintéticas escritas
// acá: ningún caso depende de presetRamo() ni de datos de estudiantes reales.
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const elements=new Map(),writes=[];
function el(){
  let html='';
  const node={style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
    hidden:false,value:'',textContent:'',dataset:{},children:[],clientWidth:390,
    addEventListener(){},appendChild(x){this.children.push(x);return x},setAttribute(){},removeAttribute(){},getAttribute(){return null},
    querySelector(){return node},querySelectorAll(){return []},focus(){},select(){},click(){},remove(){}};
  Object.defineProperty(node,'innerHTML',{get(){return html},set(v){html=String(v);this.children=[]}});
  return node;
}
const byId=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id)};
const ctx={console,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(){},
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>el(),querySelectorAll:()=>[]},
  localStorage:{getItem:()=>null,setItem:(...args)=>writes.push(args),removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}}};
vm.createContext(ctx);
for(const file of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const run=s=>vm.runInContext(s,ctx),S=run('S');
const n=(id,valor,slot)=>({id,nombre:id,valor,peso:1,...(slot===undefined?{}:{slot})});
const c=(id,nombre,peso,notas=[],extra={})=>({id,nombre,peso,notas:notas.length?notas:[n('pendiente-'+id,null)],directNota:true,...extra});
const ramo=(categorias,extra={})=>({id:'r1',nombre:'Ramo sintético',color:'#456',creditos:10,origen:null,gates:[],categorias,...extra});
function pintar(r,{notas={},ausencias={}}={}){
  S.ramos=[r];run("currentRamoId='r1';simState={};simAusencias={};");
  for(const [id,valor] of Object.entries(notas))run(`simState[${JSON.stringify(id)}]=[{id:'hip-'+${JSON.stringify(id)},valor:${valor},peso:1}]`);
  for(const [id,ausencia] of Object.entries(ausencias)){
    ctx.__ausencia=ausencia;
    run(`simAusencias[${JSON.stringify(id)}]=__ausencia`);
  }
  run('renderSimulador()');
  return byId('sim-needed').textContent;
}
const base=()=>ramo([c('prueba','Prueba escrita',50,[n('n1',5)]),c('cierre','Evaluación final',50)]);

console.log('=== Misma cifra que la ficha sin hipótesis ===');
const real=base();
const sim=pintar(real);
assert.equal(byId('sim-avg').textContent,'5,0','el promedio proyectado conserva su valor y muestra coma decimal');
assert.match(byId('sim-cats').innerHTML,/n1: 5,0/,'las notas de la lista usan coma decimal');
run('renderRamo()');
const chip=byId('ramo-min-chip');
const ficha=(chip.innerHTML.match(/aria-label="([^"]*)"/)||[])[1]||chip.textContent;
const numeroFicha=(ficha.match(/Necesitas ([\d.,]+)/)||[])[1];
assert.ok(numeroFicha,`la ficha debe dar una cifra: ${ficha}`);
assert.equal(sim,`Para el 4,0 necesitas ${numeroFicha.replace('.',',')} en lo que queda`);
assert.equal(sim,'Para el 4,0 necesitas 2,9 en lo que queda');
assert.equal(byId('sim-needed').hidden,false);

console.log('=== Notas hipotéticas y ausencia simulada ===');
const tres=()=>ramo([c('prueba','Prueba escrita',30,[n('n1',5)]),c('taller','Taller aplicado',20),c('cierre','Evaluación final',50)]);
assert.equal(pintar(tres(),{notas:{taller:3}}),'Para el 4,0 necesitas 3,7 en lo que queda');
const ausencia=pintar(tres(),{ausencias:{taller:{hacia:'cierre',tipo:'traspaso'}}});
assert.equal(ausencia,'Para el 4,0 necesitas 3,5 en lo que queda');
assert.equal(run('notaNecesaria(simProjectedRamo(S.ramos[0]),4)').toFixed(3),'3.500');
assert.equal(S.ramos[0].ausenciasJustificadas,undefined,'simular la falta no modifica el ramo real');
const movimiento=ramo([c('prueba','Prueba escrita',30,[n('n1',5)]),c('taller','Taller aplicado',20),
  c('control','Control oral',20,[n('n2',3)]),c('cierre','Evaluación final',30)]);
assert.equal(pintar(movimiento),'Para el 4,0 necesitas 3,7 en lo que queda');
run("simSetFalta('taller','traspaso|control')");
assert.equal(byId('sim-needed').textContent,'Para el 4,0 necesitas 4,2 en lo que queda',
  'al mover el peso a una evaluación ya calificada la cifra cambia en vivo');
assert.equal(pintar(tres()),'Para el 4,0 necesitas 3,5 en lo que queda');
byId('sim-in-taller').value='3,0';
run("simAddNota('taller')");
assert.equal(byId('sim-needed').textContent,'Para el 4,0 necesitas 3,7 en lo que queda',
  'una nota hipotética cambia la cifra sin guardarse');

console.log('=== Ausencia ya declarada en una cuenta existente ===');
const declarada=tres();
declarada.ausenciasJustificadas=['taller'];
declarada.reglasAusenciaJustificadaUsuario={declaradaPor:'estudiante',rezagos:[],reemplazos:[],traspasos:[{desdeId:'taller',haciaId:'cierre'}]};
assert.equal(pintar(declarada),ausencia,'la ausencia guardada antes se lee igual que la simulada');
assert.deepEqual(declarada.ausenciasJustificadas,['taller']);
const conPrograma=tres();
conPrograma.ausenciasJustificadas=['taller'];
conPrograma.reglasAusenciaJustificada={reemplazos:[],traspasos:[{desdeId:'taller',haciaId:'cierre'}]};
assert.equal(pintar(conPrograma),ausencia,'una regla del programa también conserva el peso declarado');
const mezclada=ramo([c('prueba','Prueba escrita',20,[n('n1',5)]),c('taller','Taller aplicado',20),
  c('informe','Informe',20),c('cierre','Evaluación final',40)],{
  ausenciasJustificadas:['taller'],
  reglasAusenciaJustificadaUsuario:{declaradaPor:'estudiante',rezagos:[],reemplazos:[],traspasos:[{desdeId:'taller',haciaId:'cierre'}]}});
assert.equal(pintar(mezclada,{ausencias:{informe:{hacia:'cierre',tipo:'traspaso'}}}),
  'Para el 4,0 necesitas 3,9 en lo que queda','las dos ausencias se combinan y el motor aplica el tope de 75%');
assert.deepEqual(mezclada.ausenciasJustificadas,['taller'],'la segunda ausencia sigue siendo solo una hipótesis');

console.log('=== Compuertas que topan la nota ===');
const piso=ramo([c('prueba','Prueba escrita',30,[n('n1',2)]),c('cierre','Evaluación final',70)],{
  gates:[{type:'min_grade_required',catId:'prueba',min:4,cap:3.9,nombre:'Prueba escrita'}]});
assert.match(pintar(piso),/^Con esto ya no alcanzas el 4,0/);
assert.match(byId('sim-needed').textContent,/Prueba escrita.*4,0.*topa/);
const grupo=ramo([c('individual','Trabajo individual',40,[n('n1',3)]),c('cierre','Evaluación final',60)],{
  gates:[{type:'group_min',catIds:['individual'],min:4,cap:'self',nombre:'Trabajo individual'}]});
assert.match(pintar(grupo),/^Con esto ya no alcanzas el 4,0/);
assert.match(byId('sim-needed').textContent,/Trabajo individual.*topa/);

console.log('=== Pendiente bajo compuerta: muestra la condición, no promete aprobación ===');
const pisoPendiente=ramo([c('prueba','Prueba escrita',50,[n('n1',2,0)],{slots:2,directNota:false}),c('cierre','Evaluación final',50,[n('n2',7)])],{
  gates:[{type:'min_grade_required',catId:'prueba',min:4,cap:3.9,nombre:'Prueba escrita'}]});
// La casilla que falta tiene que subir la prueba de 2,0 a 3,95: (2 + 5,9) / 2.
assert.match(pintar(pisoPendiente),/^Para el 4,0 necesitas 5,9 en lo que queda/);
assert.match(byId('sim-needed').textContent,/Además, Prueba escrita debe llegar a 4,0/);
const pisoSimulado=ramo([c('prueba','Prueba escrita',50),c('cierre','Evaluación final',50)],{
  gates:[{type:'min_grade_required',catId:'prueba',min:4,cap:3.9,nombre:'Prueba escrita'}]});
assert.match(pintar(pisoSimulado,{notas:{prueba:3}}),/^Con esto ya no alcanzas el 4,0/,
  'una nota hipotética ocupa su casilla y puede dejar una compuerta definitivamente bajo el mínimo');

console.log('=== Reglas explícitas en pautas propias ===');
const tenantAnterior=S.tenant;
S.tenant='uc';
const examenMinimo=ramo([c('prueba','Prueba escrita',60,[n('prueba-real',7)]),c('examen','Examen',40)],{
  gates:[{type:'min_grade_required',catId:'examen',min:3,cap:3.9,nombre:'Examen'}]});
assert.match(pintar(examenMinimo),/^Para el 4,0 necesitas 3,0 en lo que queda/);
pintar(examenMinimo,{notas:{examen:2.9}});
assert.equal(byId('sim-avg').textContent,'3,9','el promedio de 5,36 queda topado');
pintar(examenMinimo,{notas:{examen:3}});
assert.equal(byId('sim-avg').textContent,'5,4','justo en el mínimo rige el promedio ponderado');

function controles(count){
  return c('controles','Controles',100,[n('primero',2,0),n('segundo',3,1)],{
    slots:3,dropLowest:{count}});
}
for(const [count,actual,proyectado,necesaria] of [[1,'2,5','4,0','4,9'],[2,'2,5','5,0','4,0']]){
  const propia=ramo([controles(count)]);
  assert.equal(pintar(propia),`Para el 4,0 necesitas ${necesaria} en lo que queda`);
  assert.equal(byId('sim-avg').textContent,actual);
  run("simState.controles=[{slot:2,valor:5}];renderSimulador()");
  assert.equal(byId('sim-avg').textContent,proyectado);
  assert.equal(propia.categorias.find(c=>c.nombre==='Controles').notas.length,2);
}

const lista=ramo([c('lista','Talleres',100,[n('taller-1',2)],{
  directNota:false,dropLowest:{count:2}})]);
assert.match(pintar(lista),/^No calculamos una nota exacta/);
assert.equal(byId('sim-avg').textContent,'2,0','con una nota no se descarta ninguna');
assert.match(pintar(lista,{notas:{lista:5}}),/^No calculamos una nota exacta/);
assert.equal(byId('sim-avg').textContent,'5,0','con dos notas se descarta solo una');
assert.match(run("lecturaDespuesDeNota(S.ramos[0])"),/la nota mínima depende/);

const controlesFijos=controles(2);
const agenda={ramo:ramo([controlesFijos]),cat:controlesFijos,nota:controlesFijos.notas.find(n=>n.nombre==='primero')};
assert.equal(run('pesoEventoAgenda')(agenda),null,'Agenda no atribuye un peso individual fijo');
assert.equal(run('modeloNotasSombra')(agenda.ramo),null,'sin sombra si una nota pendiente puede cambiar el descarte');

S.tenant='fen';
const fen=ramo([controles(2)]);
pintar(fen);
run("simState.controles=[{slot:2,valor:5}];renderSimulador()");
assert.equal(byId('sim-avg').textContent,'3,3','la simulación FEN incluye las tres notas');
assert.match(run('textoNotasBorrables')(fen,fen.categorias.find(c=>c.nombre==='Controles')),/se pueden borrar 2 notas/);
S.tenant=tenantAnterior;

console.log('=== El reglamento y las reglas personales de una pauta UDD ===');
S.tenant='udd';
const reglaPruebas=(min,cap,editor=true)=>({type:'min_grade_required',catId:'pruebas',min,cap,...(editor?{origen:'editor'}:{})});
const udd=(pruebas,examen,gates=[])=>ramo([
  c('pruebas','Pruebas',60,pruebas===null?[]:[n('nota-pruebas',pruebas)]),
  c('examen','Examen',40,[n('nota-examen',examen)])],{gates});
for(const [examen,gates,esperada] of [
  [2.9,[],2.9],
  [2.9,[reglaPruebas(5,3.9)],2.9],
  [2.9,[reglaPruebas(6.5,3.9)],2.9],
  [2.9,[reglaPruebas(6.5,2.5)],2.5],
  [3,[reglaPruebas(6.5,3.9)],3.9],
  [2.9,[reglaPruebas(5,3.9,false)],4.8],
  [2.9,[reglaPruebas(6.5,3.9,false)],3.9],
  [2.9,[{...reglaPruebas(3,3.9),catId:'examen'}],3.9],
]){
  const completa=udd(6,examen,gates);
  pintar(completa);
  assert.equal(run('notaFinalOficial(ramoAvg(S.ramos[0]))'),esperada);
  assert.equal(byId('sim-avg').textContent,esperada.toFixed(1).replace('.',','));
  const pendiente=udd(null,examen,gates);
  pintar(pendiente,{notas:{pruebas:6}});
  assert.equal(byId('sim-avg').textContent,esperada.toFixed(1).replace('.',','),'la nota hipotética coincide con la final');
}
for(const gates of [[],[reglaPruebas(5,3.9)]]){
  assert.match(pintar(udd(null,2.9,gates)),/^Con esto ya no alcanzas el 4,0/);
  assert.ok(run('notaNecesaria(S.ramos[0],4)')>7);
}
assert.match(pintar(udd(null,2.9,[reglaPruebas(5,3.9,false)])),/^Para el 4,0 necesitas 5,0/);
S.tenant=tenantAnterior;

console.log('=== Persistencia de una pauta propia ===');
const sinReglas=ramo([c('controles','Controles',60,[n('primero',2,0),n('segundo',6,1)],{slots:2}),
  c('examen','Examen',40,[n('examen-real',2.9)])]);
const baseSync={...S,tenant:'uc',ramos:[sinReglas]};
const conReglas=JSON.parse(JSON.stringify(baseSync));
const ramoLocal=conReglas.ramos.find(r=>r.nombre==='Ramo sintético');
Object.assign(ramoLocal.categorias.find(c=>c.nombre==='Controles'),{dropLowest:{count:1},descarteOrigen:'editor'});
ramoLocal.gates=[{type:'min_grade_required',catId:'examen',min:3,cap:3.9,origen:'editor'}];
const nube=JSON.parse(JSON.stringify(baseSync));
nube.ramos.find(r=>r.nombre==='Ramo sintético').categorias.find(c=>c.nombre==='Controles')
  .notas.find(n=>n.nombre==='segundo').valor=7;
const fusion=run('fusionarSync')(baseSync,conReglas,nube);
const leerCopia=estado=>{
  const getItem=ctx.localStorage.getItem;
  ctx.localStorage.getItem=key=>key==='gradehub_v1'?JSON.stringify(estado):null;
  try{return run('loadData().data.ramos.find(r=>r.nombre==="Ramo sintético")');}
  finally{ctx.localStorage.getItem=getItem;}
};
const recargado=leerCopia(fusion);
const guardados=recargado.categorias.find(c=>c.nombre==='Controles');
assert.equal(guardados.dropLowest.count,1);
assert.equal(guardados.descarteOrigen,'editor');
assert.equal(guardados.notas.find(n=>n.nombre==='segundo').valor,7);
assert.equal(recargado.gates.find(g=>g.catId==='examen').cap,3.9);
assert.equal(recargado.gates.find(g=>g.catId==='examen').origen,'editor');
const existente=leerCopia(baseSync);
assert.equal(existente.categorias.find(c=>c.nombre==='Controles').dropLowest,undefined);
assert.equal(existente.gates.length,0);
assert.equal(run('notaFinalOficial')(run('ramoAvg')(existente)),3.6);

console.log('=== Una regla personal cambia la procedencia de la pauta ===');
const conHuella=JSON.parse(JSON.stringify(sinReglas));
conHuella.pautaHuella=run('huellaPauta')(conHuella.categorias);
assert.equal(run('pautaEditada')(conHuella),false);
const firma=run('firmaPautaSugerida')(conHuella);
assert.equal(run('pautaPropiaParaConsenso')(conHuella),true);
conHuella.pautaSugerida={aceptada:{firma}};
assert.equal(run('pautaSugeridaIntacta')(conHuella),true);
run('guardarReglasEvaluacionEditor')(conHuella,conHuella.categorias.find(c=>c.nombre==='Examen'),{count:null,min:3,cap:3.9});
assert.equal(run('pautaSugeridaIntacta')(conHuella),false);
assert.equal(run('pautaEditada')(conHuella),true);
assert.equal(run('pautaPropiaParaConsenso')(conHuella),false);
delete conHuella.pautaSugerida;
conHuella.gates=[];
const controlesPropios=conHuella.categorias.find(c=>c.nombre==='Controles');
run('guardarReglasEvaluacionEditor')(conHuella,controlesPropios,{count:1,min:null,cap:null});
assert.equal(run('pautaEditada')(conHuella),true,'el descarte personal basta aunque nombres y pesos sean los del catálogo');
assert.equal(run('pautaPropiaParaConsenso')(conHuella),false);
controlesPropios.fueraDePauta=true;
assert.equal(run('pautaConReglasNoCompartibles')(conHuella),false);

console.log('=== Imposible, asegurado, pauta incompleta y ramo cerrado ===');
assert.equal(pintar(ramo([c('prueba','Prueba escrita',80,[n('n1',1)]),c('cierre','Evaluación final',20)])),
  'Con esto ya no alcanzas el 4,0');
assert.equal(pintar(ramo([c('prueba','Prueba escrita',90,[n('n1',7)]),c('cierre','Evaluación final',10)])),
  'Ya tienes el 4,0 asegurado');
const casiAsegurado=ramo([c('prueba','Prueba escrita',90,[n('n1',7)]),c('cierre','Evaluación final',10)],{
  gates:[{type:'min_grade_required',catId:'cierre',min:4,cap:3.9}]});
assert.match(pintar(casiAsegurado),/^Para el 4,0 necesitas 4,0 en lo que queda/);
assert.match(byId('sim-needed').textContent,/Evaluación final debe llegar a 4,0/,
  'una compuerta pendiente impide decir que el 4,0 está asegurado');
assert.equal(pintar(ramo([c('prueba','Prueba escrita',40,[n('n1',5)]),c('cierre','Evaluación final',40)])),
  'Completa la pauta para calcularlo');
assert.equal(pintar(ramo([c('prueba','Prueba escrita',50,[n('n1',5)]),c('cierre','Evaluación final',50,[n('n2',4)])])), '');
assert.equal(byId('sim-needed').hidden,true,'un ramo completo solo muestra su promedio final');

console.log('=== Explorar no escribe datos ===');
const explorado=tres();
writes.length=0;
pintar(explorado);
const antes=JSON.stringify(explorado);
run("simToggleFalta('taller')");
run("simSetFalta('taller','traspaso|cierre')");
byId('sim-in-cierre').value='4,5';
run("simAddNota('cierre')");
assert.equal(JSON.stringify(explorado),antes,'la simulación conserva intacto el ramo original');
assert.equal(writes.length,0,'no se toca gradehub_v1 ni otra clave local al simular');
assert.match(fs.readFileSync(path.join(root,'app.js'),'utf8'),/const necesaria=notaNecesaria\(proyectado,meta[,)]/);
console.log('OK: simulador, compuertas, ausencias y ficha');
