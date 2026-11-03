// Metadato aditivo: solo acciones reales fechan notas; cargar datos antiguos no.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const ids={},almacen=new Map(),RealDate=Date;
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},value:'',checked:false,innerHTML:'',textContent:'',dataset:{},children:[],addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return[]},focus(){},select(){},remove(){}});
const get=id=>ids[id]||(ids[id]=el());
const ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},document:{getElementById:get,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:''}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
const reloj=iso=>{ctx.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[iso]));}static now(){return RealDate.parse(iso);}};};
run(`renderRamo=()=>{};renderHome=()=>{};renderAgenda=()=>{};track=()=>{};syncToCloud=()=>{};publicarResumenWidgets=()=>{};showToast=()=>{};closeModal=()=>{};openModal=()=>{};animarPromedio=()=>{};mostrarEcoGpa=()=>{};
 S=normalize({tenant:'uc',onboardingDone:true,ramos:[{id:'r',nombre:'Ramo inventado',creditos:10,gates:[],categorias:[
 {id:'p',nombre:'Pruebas',peso:60,directNota:true,slots:3,notas:[{id:'vieja',nombre:'Primera',slot:0,peso:1,valor:5},{id:'pend',nombre:'Segunda personalizada',slot:1,peso:1,valor:null,fecha:'2026-11-10',hora:'10:00'}]},
 {id:'ex',nombre:'Examen',peso:40,directNota:true,notas:[]}
 ]}],historial:[{id:'h',label:'2026-1',ramos:[{id:'hr',nombre:'Anterior',categorias:[{id:'hc',nombre:'Prueba',peso:100,notas:[{id:'hn',nombre:'Nota vieja',valor:6,peso:1}]}]}]}]});currentRamoId='r';`);
assert.equal(run('JSON.stringify(S).includes("editadaEn")'),false,'una cuenta anterior no recibe fechas inventadas');
const promedio=run('ramoAvg(S.ramos[0])');run('save();S=loadData().data');assert.equal(run('ramoAvg(S.ramos[0])'),promedio);assert.equal(run('JSON.stringify(S).includes("editadaEn")'),false);
reloj('2026-10-31T12:00:00.000Z');run("setSlotNota('p',1,'5,2')");
let n=json('S.ramos[0].categorias[0].notas.find(n=>n.slot===1)');assert.equal(n.editadaEn,'2026-10-31T12:00:00.000Z');assert.equal(n.valor,5.2);assert.equal(n.nombre,'Segunda personalizada');assert.equal(n.fecha,'2026-11-10');assert.equal(n.hora,'10:00');
run('S=loadData().data');assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===1).editadaEn'),n.editadaEn,'la caché conserva el campo');
reloj('2026-10-31T13:00:00.000Z');run("setSlotNota('p',1,'5,8')");assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===1).editadaEn'),'2026-10-31T13:00:00.000Z');
reloj('2026-10-31T14:00:00.000Z');run("setSlotNota('p',1,'5,8')");assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===1).editadaEn'),'2026-10-31T13:00:00.000Z','reescribir lo mismo no altera la cronología');
get('m-nota-name').value='Solo otro nombre';get('m-nota-val').value='5,8';get('m-nota-fecha').value='2026-11-12';run("confirmEditNota('p','pend')");assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===1).editadaEn'),'2026-10-31T13:00:00.000Z','nombre/fecha no son una nueva calificación');
run("setSlotNota('p',1,'')");n=json('S.ramos[0].categorias[0].notas.find(n=>n.slot===1)');assert.equal(n.valor,null);assert.equal(n.editadaEn,'2026-10-31T14:00:00.000Z');assert.equal(n.fecha,'2026-11-12');
run("setDirectNota('ex','A')");assert.equal(run('S.ramos[0].categorias[1].notas[0].valor'),5);assert.equal(run('S.ramos[0].categorias[1].notas[0].calificacionConceptual'),'A');assert.equal(run('S.ramos[0].categorias[1].notas[0].editadaEn'),'2026-10-31T14:00:00.000Z');
reloj('2026-10-31T15:00:00.000Z');run("escribirNotaPropuesta(S.ramos[0].categorias[0],{casilla:2,valor:6.2},S.ramos[0])");assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===1).editadaEn'),'2026-10-31T15:00:00.000Z','aceptar una propuesta fecha el cambio, no cuando se propuso');
// El agente no cambia cómo se representa una A ya guardada si propone el mismo 5.
run("escribirNotaPropuesta(S.ramos[0].categorias[1],{valor:5},S.ramos[0])");assert.equal(run('S.ramos[0].categorias[1].notas[0].calificacionConceptual'),'A');
run("escribirFechaPropuesta(S.ramos[0],S.ramos[0].categorias[0],{casilla:3,fecha:'2026-11-25'})");assert.equal(run('S.ramos[0].categorias[0].notas.find(n=>n.slot===2).editadaEn'),'2026-10-31T15:00:00.000Z','una evaluación nueva pendiente se fecha al crearla');
// Simular mantiene S intacto; el guardado real usa la hora de confirmación.
const antesSimular=run('JSON.stringify(S)');run("simState={ex:[asignarCalificacionNota({id:'sim'},'4.5',4.5)]}");assert.equal(run('JSON.stringify(S)'),antesSimular);
reloj('2026-10-31T16:00:00.000Z');run('showConfirm=(t,d,aceptar)=>aceptar();simCommit()');assert.equal(run('S.ramos[0].categorias[1].notas.at(-1).editadaEn'),'2026-10-31T16:00:00.000Z');
for(const mala of [null,17,'ayer','2026-02-30T12:00:00.000Z','2026-10-31']){ctx.__mala=mala;assert.equal(run('fechaEdicionNotaValida(__mala)'),null);}
assert.equal(run("fechaEdicionNotaValida('2026-10-31T10:00:00-03:00')"),'2026-10-31T13:00:00.000Z');
// Una fusión conserva fecha y valor juntos, además de cambios independientes.
const copiar=x=>JSON.parse(JSON.stringify(x));const base=json('S');const nota=d=>d.ramos[0].categorias[0].notas.find(n=>n.slot===1);
nota(base).valor=5;nota(base).editadaEn='2026-10-31T10:00:00.000Z';
function fusion(b,l,c){ctx.__b=b;ctx.__l=l;ctx.__c=c;return json('fusionarSync(__b,__l,__c)');}
let l=copiar(base),c=copiar(base);nota(l).valor=4;nota(l).editadaEn='2026-10-31T11:00:00.000Z';nota(l).nombre='Nombre corregido';nota(c).valor=6;nota(c).editadaEn='2026-10-31T12:00:00.000Z';let mezcla=fusion(base,l,c);assert.equal(nota(mezcla).valor,6);assert.equal(nota(mezcla).editadaEn,nota(c).editadaEn);assert.equal(nota(mezcla).nombre,'Nombre corregido');
mezcla=fusion(base,c,l);assert.equal(nota(mezcla).valor,6);assert.equal(nota(mezcla).editadaEn,nota(c).editadaEn);
mezcla=fusion(null,c,l);assert.equal(nota(mezcla).valor,6,'sin base, dos ediciones fechadas también eligen la más reciente');
l=copiar(base);delete nota(l).editadaEn;c=copiar(base);mezcla=fusion(base,l,c);assert.equal(nota(mezcla).editadaEn,nota(base).editadaEn,'una omisión de una app anterior no borra la marca de ese mismo valor');
nota(l).valor=3;mezcla=fusion(base,l,c);assert.equal(nota(mezcla).valor,3);assert.equal(nota(mezcla).editadaEn,undefined,'no atribuye a un valor antiguo sin fecha la marca de otro valor');
l=copiar(base);c=copiar(base);delete nota(l).editadaEn;delete nota(c).editadaEn;nota(l).valor=4;nota(c).valor=6;mezcla=fusion(base,l,c);assert.equal(nota(mezcla).valor,4,'las colisiones sin fecha mantienen la resolución anterior');
// La fusión también recorre los semestres archivados; no los fecha al cargar.
l=copiar(base);c=copiar(base);
const historica=d=>d.historial[0].ramos[0].categorias[0].notas[0];
historica(l).editadaEn='2026-10-31T11:00:00.000Z';historica(l).valor=5;
historica(c).editadaEn='2026-10-31T12:00:00.000Z';historica(c).valor=7;
mezcla=fusion(base,l,c);assert.equal(historica(mezcla).valor,7);assert.equal(historica(mezcla).editadaEn,historica(c).editadaEn);
// No mezcla una letra de un valor con el número de otro.
l=copiar(base);c=copiar(base);nota(l).valor=6;nota(l).editadaEn='2026-10-31T13:00:00.000Z';nota(c).valor=5;nota(c).calificacionConceptual='A';delete nota(c).editadaEn;
mezcla=fusion(base,l,c);assert.equal(nota(mezcla).valor,6);assert.equal(nota(mezcla).calificacionConceptual,undefined);assert.equal(nota(mezcla).editadaEn,nota(l).editadaEn);
// No se mutan las copias recibidas; metadatos ajenos a notas no se reinterpretan.
const antes=JSON.stringify([base,l,c]);fusion(base,l,c);assert.equal(JSON.stringify([base,l,c]),antes);
console.log('OK: editadaEn aditivo, guardadores reales, persistencia local, agentes, simulación y fusión coherente');
