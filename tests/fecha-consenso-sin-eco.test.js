// #1338: una fecha adoptada de compañeros ('consenso') no puede volverse voto
// propio solo porque la persona abrió la evaluación para poner la nota o
// cambiar el peso. 3 fijan, 10 adoptan: cuando las 10 anotan su nota el
// contador no puede subir a 13. Solo cuenta si la fecha u hora cambió.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ids={};
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',checked:false,disabled:false,innerHTML:'',textContent:'',dataset:{},children:[],addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){},select(){},remove(){},closest(){return null}});
const get=id=>ids[id]||(ids[id]=el());
const ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:get,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
run(`renderRamo=()=>{};renderHome=()=>{};renderAgenda=()=>{};track=()=>{};syncToCloud=()=>{};publicarResumenWidgets=()=>{};showToast=()=>{};closeModal=()=>{};openModal=()=>{};animarPromedio=()=>{};mostrarEcoGpa=()=>{};vibrar=()=>{};
 S=normalize({tenant:'uc',onboardingDone:true,ramos:[{id:'r',nombre:'Ramo inventado',creditos:10,gates:[],categorias:[
  {id:'ex',nombre:'Examen',peso:40,directNota:true,fecha:'2026-12-03',hora:'10:00',fechaOrigen:'consenso',horaOrigen:'consenso',notas:[]},
  {id:'ct',nombre:'Controles',peso:30,directNota:false,notas:[{id:'c1',nombre:'Control 1',peso:1,valor:null,fecha:'2026-11-20',hora:'09:00',fechaOrigen:'consenso',horaOrigen:'consenso'}]},
  {id:'tr',nombre:'Trabajo',peso:30,directNota:true,notas:[]}
 ]}]});currentRamoId='r';`);
const cat=id=>json(`S.ramos[0].categorias.find(c=>c.id==='${id}')`);
const nota=()=>json(`S.ramos[0].categorias.find(c=>c.id==='ct').notas[0]`);
const abrirCat=(c,fecha,hora,peso)=>{get('m-cat-name').value=c.nombre;get('m-cat-peso-num').value=String(peso);get('m-cat-fecha').value=fecha||'';get('m-cat-hora').value=hora||'';};
const abrirNota=(n,valor,fecha,hora)=>{get('m-nota-name').value=n.nombre;get('m-nota-val').value=valor;get('m-nota-fecha').value=fecha||'';get('m-nota-hora').value=hora||'';get('m-pond-toggle').checked=false;};

// Poner la nota sin tocar la fecha adoptada.
abrirNota(nota(),'5,5','2026-11-20','09:00');run("confirmEditNota('ct','c1')");
let n=nota();
assert.equal(n.valor,5.5);
assert.equal(n.fechaOrigen,'consenso','poner la nota no vuelve propia la fecha adoptada');
assert.equal(n.horaOrigen,'consenso');
assert.equal(run("fechaAportaRespaldo(S.ramos[0].categorias.find(c=>c.id==='ct').notas[0])"),false,'no suma un voto a date_consensus');

// Cambiar solo el peso de una evaluación con fecha adoptada.
abrirCat(cat('ex'),'2026-12-03','10:00',45);run("confirmEditCat('ex')");
let c=cat('ex');
assert.equal(c.peso,45);
assert.equal(c.fechaOrigen,'consenso','cambiar el peso no vuelve propia la fecha adoptada');
assert.equal(c.horaOrigen,'consenso');
assert.equal(c.fecha,'2026-12-03');assert.equal(c.hora,'10:00');

// Guardar una evaluación sin fecha, sin ponerle fecha, no la marca como quitada:
// si no, ni el programa ni los compañeros podrían sugerirla después.
abrirCat(cat('tr'),'','',30);run("confirmEditCat('tr')");
c=cat('tr');
assert.equal(c.fecha,null);assert.notEqual(c.fechaQuitada,true,'no se quita lo que nunca estuvo');

// Cambiar la fecha sí es una decisión propia.
abrirCat(cat('ex'),'2026-12-04','10:00',45);run("confirmEditCat('ex')");
c=cat('ex');
assert.equal(c.fecha,'2026-12-04');assert.equal(c.fechaOrigen,'usuario','una fecha distinta cuenta como propia');
// Y cambiar solo la hora, también.
abrirNota(nota(),'5,5','2026-11-20','11:30');run("confirmEditNota('ct','c1')");
n=nota();
assert.equal(n.hora,'11:30');assert.equal(n.horaOrigen,'usuario');assert.equal(n.fechaOrigen,'usuario');
// Quitar la fecha deja constancia, como antes.
abrirNota(nota(),'5,5','','');run("confirmEditNota('ct','c1')");
n=nota();
assert.equal(n.fecha,null);assert.equal(n.fechaQuitada,true);

// Confirmar explícitamente (grupo, propuesta) sigue marcando como propia.
const explicita={fecha:'2026-09-08',hora:'09:30',fechaOrigen:'consenso',horaOrigen:'consenso'};
run('marcarFechaUsuario')(explicita,explicita.fecha,explicita.hora);
assert.equal(explicita.fechaOrigen,'usuario');

console.log('fecha-consenso-sin-eco: OK');
