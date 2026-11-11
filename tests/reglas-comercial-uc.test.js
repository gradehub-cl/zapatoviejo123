const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('path');
const root=process.env.GRADEHUB_ROOT||(process.env.GRADEHUB_APP?path.dirname(process.env.GRADEHUB_APP):path.join(__dirname,'..'));
function sandbox(){
  const store=new Map(),elements=new Map();
  const element=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelectorAll(){return []},querySelector(){return null},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
  const ctx={console,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,addEventListener(){},documentElement:element(),body:element(),querySelector(){return null},querySelectorAll(){return []}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''},history:{replaceState(){}},setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){}};
  vm.createContext(ctx);
  for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
  ctx.run=s=>vm.runInContext(s,ctx);return ctx;
}

const ctx=sandbox(),plain=x=>JSON.parse(JSON.stringify(x));
const at=new Date('2026-10-05T12:00:00Z');
function curso(nombre){const p=ctx.presetRamo(nombre,'uc','COM',at);return {id:'curso',nombre,origen:{tenant:'uc',carrera:'COM'},...p,pautaHuella:ctx.huellaPauta(p.categorias)};}
function poner(r,nombre,valor){const c=r.categorias.find(c=>c.nombre===nombre);assert.ok(c);c.notas=valor===null?[]:Array.from({length:c.slots||1},(_,slot)=>({id:'nota-'+c.id+'-'+slot,nombre:'Nota',valor,peso:1,...(c.slots?{slot}:{})}));}
function todo(r,valores){for(const [nombre,valor] of Object.entries(valores))poner(r,nombre,valor);return r;}
function cercano(a,b){assert.ok(Math.abs(a-b)<1e-9,`${a} debe ser ${b}`);}
const estrategia=curso('Estrategia Competitiva');
todo(estrategia,{'Participación':7,'Prueba 1':3.7,'Prueba 2':3.7,'Examen':3.7});
// A failed requirement excludes both boosts even when their grades are high.
cercano(ctx.ramoAvg(estrategia),3.7);
assert.equal(ctx.calculoRamoConCompuertas(estrategia).res.emptyLeaves.length,0,'Las actividades excluidas no quedan pendientes');
assert.equal(ctx.notaNecesaria(estrategia,4),null);
poner(estrategia,'Prueba 1',4);
const actividades=estrategia.categorias.find(c=>c.nombre==='Actividades');
actividades.notas=[1,4,5,6].map((valor,slot)=>({id:'a'+slot,nombre:'Actividad',valor,peso:1,slot}));
cercano(ctx.ramoAvg(estrategia),7*.1+5*.1+4*.23+3.7*.23+3.7*.34);
// Exactly 3.75 with one 4.0 meets both conditions, not merely the average.
todo(estrategia,{'Prueba 1':4,'Prueba 2':4,'Examen':(3.75-.2875*8)/.425});
assert.equal(ctx.calculoRamoConCompuertas(estrategia).res.formulas[0].activa,false);
todo(estrategia,{'Prueba 1':3.8,'Prueba 2':3.8,'Examen':3.8});
cercano(ctx.ramoAvg(estrategia),3.8);
// A personalized weight disables the accepted rule, without mutating grades.
const personal=plain(estrategia);personal.categorias[0].peso=11;
assert.equal(ctx.reglasCalculoVigentes(personal).length,0);
const manual=plain(estrategia);manual.gates=[];manual.origen=null;
assert.equal(ctx.calculoRamoConCompuertas(manual).res.formulas.length,0);
const gerencial=curso('Contabilidad Gerencial');
todo(gerencial,{'Ejercicios, casos y tareas':7,'Prueba 1':3.7,'Prueba 2':3.7,'Examen':3.7});
cercano(ctx.ramoAvg(gerencial),3.7);
poner(gerencial,'Ejercicios, casos y tareas',3.9);
cercano(ctx.ramoAvg(gerencial),.2*3.9+.8*3.7);
poner(gerencial,'Ejercicios, casos y tareas',7);
todo(gerencial,{'Prueba 1':3.8,'Prueba 2':3.8,'Examen':3.8});
assert.equal(ctx.ramoAvg(gerencial),null,'No decide el límite contradictorio');
todo(gerencial,{'Prueba 1':3.81,'Prueba 2':3.81,'Examen':3.81});
cercano(ctx.ramoAvg(gerencial),.2*7+.8*3.81);
// Known exam average but unknown tasks cannot activate a task-dependent rule.
poner(gerencial,'Ejercicios, casos y tareas',null);
assert.equal(ctx.calculoRamoConCompuertas(gerencial).res.formulas[0].pendiente,true);
for(const [nombre,max,pesos] of [['Empresas y Legislación',70,[30,30,40]],['Ética, Economía y Empresa',60,[20,20,35]]]){
 const r=curso(nombre),prueba=r.categorias.find(c=>c.nombre==='Prueba 1');
 poner(r,'Prueba 2',5);poner(r,'Examen',6);
 const otras=r.categorias.filter(c=>!['Prueba 1','Prueba 2','Examen'].includes(c.nombre));
 otras.forEach(c=>poner(r,c.nombre,7));
 r.ausenciasJustificadas=[prueba.id];
 const before=JSON.stringify(r.categorias);
 const estado=ctx.estadoAusenciasJustificadas(r);
 assert.equal(estado.activas.length,1);
 assert.equal(estado.normaAplicada.topePesoDestino,max);
 assert.equal(estado.estructura.children.find(c=>c.name==='Examen').weight,pesos[0]+pesos[2]);
 cercano(ctx.ramoAvg(r),(5*pesos[1]+6*(pesos[0]+pesos[2])+otras.reduce((a,c)=>a+7*c.peso,0))/100);
 assert.equal(JSON.stringify(r.categorias),before,'El cálculo no reescribe pesos ni notas');
 const p2=r.categorias.find(c=>c.nombre==='Prueba 2');poner(r,'Prueba 2',null);r.ausenciasJustificadas.push(p2.id);
 assert.equal(ctx.estadoAusenciasJustificadas(r).bloqueadas.length,1);
 assert.equal(ctx.ramoAvg(r),null,'No inventa final cuando se excede el límite');
 assert.equal(ctx.notaNecesaria(r,4),null);
 assert.ok(ctx.reglasNoCalculadas(r).some(t=>t.includes('superan')));
 // A graded test is not an absence, even if a stale declaration remains.
 poner(r,'Prueba 2',5);poner(r,'Prueba 1',4);
 assert.equal(ctx.estadoAusenciasJustificadas(r).activas.length,0);
}
// Existing accounts don't acquire new rules on reload, and explicit update
// offers rule changes even when every category already matches the catalog.
const viejo=curso('Estrategia Competitiva');viejo.gates=[];
todo(viejo,{'Participación':7,'Prueba 1':3.7,'Prueba 2':3.7,'Examen':3.7});
ctx.viejo=viejo;ctx.run("S.tenant='uc';S.carrera='COM';S.ramos=[viejo]");
const anterior=ctx.ramoAvg(viejo),copia=JSON.stringify(viejo.categorias);
ctx.run('S=normalize(S)');const cargado=ctx.run('S.ramos[0]');
assert.equal(ctx.ramoAvg(cargado),anterior);
assert.equal(cargado.gates.length,0);
assert.equal(ctx.cambioDePauta(cargado).cambios[0].tipo,'regla');
assert.ok(ctx.actualizarPauta('curso'));
const actualizado=ctx.run('S.ramos[0]');
cercano(ctx.ramoAvg(actualizado),3.7);
assert.equal(actualizado.categorias.find(c=>c.nombre==='Prueba 1').notas[0].valor,3.7);
assert.equal(ctx.cambioDePauta(actualizado),null,'No ofrece actualizar una regla ya aceptada');
// Same-number target projections are checked against the real final formula,
// including the downward jump when low participation enters at a threshold.
for(const nombre of ['Estrategia Competitiva','Contabilidad Gerencial']){
 for(const conocida of [1,3,3.7,3.8,4,5,7]){
  const r=curso(nombre);
  r.categorias.forEach(c=>{if(!c.slots)poner(r,c.nombre,conocida);});
  poner(r,'Examen',null);
  const antes=JSON.stringify(r);
  const necesaria=ctx.notaNecesaria(r,4);
  assert.equal(JSON.stringify(r),antes);
  if(necesaria!==null&&necesaria<=7){
   const proy=plain(r);proy.categorias.forEach(c=>{
    if(c.slots){c.notas=Array.from({length:c.slots},(_,slot)=>({id:'proy'+slot,nombre:'Nota',valor:necesaria,peso:1,slot}));}
    else if(!c.notas.length)poner(proy,c.nombre,necesaria);
   });
   const final=ctx.ramoAvg(proy);assert.ok(final!==null&&ctx.notaFinalOficial(final)>=4,`${nombre}: recomendación ${necesaria} debe aprobar, dio ${final}`);
  }
 }
}
// Concrete downward jump: 3.9 approves while 4.0 makes two low boosts enter.
const salto=curso('Estrategia Competitiva');
todo(salto,{'Participación':1,'Prueba 1':3.99,'Prueba 2':3.99,'Examen':null});
salto.categorias.find(c=>c.nombre==='Actividades').notas=[1,1,1,1].map((valor,slot)=>({id:'salto'+slot,nombre:'Nota',valor,peso:1,slot}));
assert.equal(ctx.notaNecesaria(salto,4),3.9);
poner(salto,'Examen',3.9);assert.equal(ctx.notaFinalOficial(ctx.ramoAvg(salto)),4);
poner(salto,'Examen',4);assert.ok(ctx.notaFinalOficial(ctx.ramoAvg(salto))<4);
// The declaration UI recognizes the saved bounded rule without asking the
// student to invent a destination. A blocked transfer explains the real limit.
const ui=curso('Ética, Economía y Empresa');
const u1=ui.categorias.find(c=>c.nombre==='Prueba 1'),u2=ui.categorias.find(c=>c.nombre==='Prueba 2');
assert.equal(ctx.ausenciaDeEvaluacion(ui,u1).oficial,true);
assert.equal(ctx.ausenciaDeEvaluacion(ui,ui.categorias.find(c=>c.nombre==='Examen')),null);
ctx.ui=ui;ctx.run("S.ramos=[ui];currentRamoId=ui.id;save=()=>{};renderRamo=()=>{};showToast=()=>{}");
ctx.declararAusenciaJustificada(u1.id);
assert.ok(ui.ausenciasJustificadas.includes(u1.id));
ctx.declararAusenciaJustificada(u2.id);
assert.ok(ctx.ausenciaDeEvaluacion(ui,u2).texto.includes('60%'));
assert.equal(ctx.ausenciaDeEvaluacion(ui,u2).inactiva,false);
// Shared server factory must use saved gates without access to the catalog.
const server=ctx.run("gh_crearCalculoRamo({normName,copiarRecuperativo,definicionPresetDelRamo:()=>null,ramos:()=>[]})");
const compartido=plain(gerencial);todo(compartido,{'Ejercicios, casos y tareas':7,'Prueba 1':3.7,'Prueba 2':3.7,'Examen':3.7});
assert.equal(server.ramoAvg(compartido),ctx.ramoAvg(compartido));
poner(compartido,'Examen',null);
assert.equal(server.notaNecesaria(compartido,4),ctx.notaNecesaria(compartido,4));
// Mechanism fixture is synthetic: it doesn't depend on catalog weights.
const arbol={id:'final',type:'group',aggregation_rule:'weighted_average',
 children:[{id:'apoyo',name:'Apoyo',weight:20,type:'leaf'},{id:'a',name:'A',weight:40,type:'leaf'},{id:'b',name:'B',weight:40,type:'leaf'}],
 formulas_condicionales:[{nombre:'Excluir apoyo bajo el umbral',cuando:[{tipo:'promedio_menor',catIds:['a','b'],min:4}],pesos:[{catId:'apoyo',peso:0},{catId:'a',peso:50},{catId:'b',peso:50}]}]};
const grades={apoyo:7,a:3,b:3},sinCambio=JSON.stringify(arbol);
cercano(ctx.calculateFinalGrade(arbol,grades).raw,3);
cercano(ctx.calculateFinalGrade(arbol,{apoyo:7,a:4,b:4}).raw,4.6);
assert.equal(JSON.stringify(arbol),sinCambio,'El motor no reescribe el árbol original');
for(const nombre of ['Contabilidad Gerencial','Estrategia Competitiva','Empresas y Legislación','Ética, Economía y Empresa']){
 const r=curso(nombre),cargado=ctx.normalize({tenant:'uc',carrera:'COM',ramos:[plain(r)]}).ramos[0];
 assert.equal(ctx.reglasCalculoVigentes(cargado).length,ctx.reglasCalculoVigentes(r).length,'Las reglas aceptadas sobreviven la recarga');
 assert.equal(ctx.firmaReglasCalculo(cargado),ctx.firmaReglasCalculo(r));
}
console.log('Reglas Comercial UC: condiciones, límites, metas, actualización explícita y motor compartido verificadas');
