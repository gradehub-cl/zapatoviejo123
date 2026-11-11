// Pauta propia sintética: ningún mecanismo depende de presetRamo().
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const leer=f=>fs.readFileSync(__dirname+'/../'+f,'utf8');
const raiz=(process.env.GRADEHUB_ROOT||(__dirname+'/..')).replace(/\/$/,'')+'/';
const appPath=process.env.GRADEHUB_APP||raiz+'app.js';
const src=[raiz+'data.js',raiz+'engine.js',appPath,raiz+'app-session.js',raiz+'render-main.js',raiz+'render-agenda.js']
  .map(f=>fs.readFileSync(f,'utf8')).join('\n');

function classList(){const clases=new Set();return{add(...xs){xs.forEach(x=>clases.add(x));},remove(...xs){xs.forEach(x=>clases.delete(x));},toggle(x){clases.has(x)?clases.delete(x):clases.add(x);},contains(x){return clases.has(x);}};}
function el(){let html='';const attrs={};const nodo={style:{setProperty(){},removeProperty(){}},classList:classList(),children:[],textContent:'',value:'',dataset:{},hidden:false,
  addEventListener(){},appendChild(h){this.children.push(h);return h;},setAttribute(k,v){attrs[k]=String(v);},removeAttribute(k){delete attrs[k];},getAttribute(k){return attrs[k]||null;},
  querySelector(){return nodo;},querySelectorAll(){return [];},focus(){},select(){},click(){},remove(){},clientWidth:400,clientHeight:700,scrollIntoView(){}};
  Object.defineProperty(nodo,'innerHTML',{get(){return html;},set(v){html=String(v);this.children=[];}});return nodo;}
const ids={};const byId=id=>ids[id]||(ids[id]=el());
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
  document:{getElementById:byId,createElement:el,addEventListener(){},documentElement:el(),querySelector(){return el();},querySelectorAll(){return [];},body:el()},
  localStorage:{datos:{},getItem(k){return this.datos[k]||null},setItem(k,v){this.datos[k]=v},removeItem(k){delete this.datos[k]}},navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},history:{replaceState(){}},
  getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout(fn){fn();return 0},clearTimeout(){},requestAnimationFrame(){return 0},cancelAnimationFrame(){},console,gtag(){}
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const run=codigo=>vm.runInContext(codigo,ctx);
const guardarReal=run('save');
let ok=0,fail=0;
function chk(nombre,cond){if(cond){ok++;console.log('  OK   '+nombre);}else{fail++;console.log('  FAIL '+nombre);}}
function cerca(a,b){return typeof a==='number'&&Math.abs(a-b)<0.005;}

const copia=x=>JSON.parse(JSON.stringify(x));
const cercaDe=(a,b)=>assert.ok(typeof a==='number'&&Math.abs(a-b)<1e-7,`esperaba ${b}; llegó ${a}`);
const evals=[['Primera',20],['Segunda',20],['Tercera',30],['Examen',30]];
const regla={evaluacion:'Examen',segun:['Primera','Segunda','Tercera'],min:5.95,promedio:'simple',maxInasistencias:6,notaExamen:'maxima',
  ignoraDescartes:true,requiereConfirmacion:false,requierePautaOriginal:true,pauta:evals};
const mejoras=[{id:'texto',entrada:'confirmacion',destino:'grupo',catIds:['a','b','c'],operacion:'promediar',valor:7,etapa:'previa'},
  {id:'talleres',entrada:'decimas',destino:'grupo',catIds:['a','b','c','e'],operacion:'distribuir',etapa:'final'}];
function ramo(valores=[6,6.5,6.2,null],extra={}){
 return {id:'sintetico',nombre:'Curso sintético',color:'#277d8a',creditos:10,origen:null,faltas:{activo:true,cantidad:0,limite:6},gates:[],eximicion:copia(regla),bonus:copia(mejoras),
  categorias:evals.map(([nombre,peso],i)=>({id:['a','b','c','e'][i],nombre,peso,directNota:true,notas:valores[i]===null?[]:[{id:'nota'+i,nombre,valor:valores[i],peso:1}]})),...extra};
}
const motor=require('../engine.js');
const calculo=motor.gh_crearCalculoRamo({normName:n=>n.toLowerCase(),copiarRecuperativo:()=>null,
 definicionPresetDelRamo:r=>({eximicion:r.eximicion,evals:r.eximicion?.pauta}),tenant:()=> 'uc',ramos:()=>[]});
const valor=(r,id)=>calculo.calculoRamoConCompuertas(r).res.breakdown.find(x=>x.id===id)?.value;
let r=ramo();
const original=copia(r);
cercaDe(calculo.estadoEximicion(r).promedio,18.7/3);
assert.equal(calculo.estadoEximicion(r).activa,true);cercaDe(valor(r,'e'),6.5);
cercaDe(calculo.ramoAvg(r),6.31);assert.equal(calculo.notaNecesaria(r),null);
assert.equal(calculo.ramoCompletamenteEvaluado(r),true);assert.deepEqual(r,original,'el cálculo no altera notas ni campos');
r=ramo(undefined,{faltas:null});assert.equal(calculo.estadoEximicion(r).activa,false);
const historicoSinContador=copia(r);delete historicoSinContador.eximicion;delete historicoSinContador.bonus;
assert.equal(calculo.ramoAvg(r),calculo.ramoAvg(historicoSinContador));assert.equal(valor(r,'e'),null);
cercaDe(calculo.ramoAvg(r),(6*20+6.5*20+6.2*30)/70);
r=ramo([5.99,5.99,5.99,null],{eximicionConfirmada:true});
assert.equal(calculo.estadoEximicion(r).activa,true);cercaDe(calculo.estadoEximicion(r).promedio,5.99);
r=ramo([5.94,5.94,5.94,null],{eximicionConfirmada:true});assert.equal(calculo.estadoEximicion(r).activa,false);
r=ramo([5.95,5.95,5.95,null],{eximicionConfirmada:true});assert.equal(calculo.estadoEximicion(r).activa,true);
r.faltas.cantidad=6;assert.equal(calculo.estadoEximicion(r).activa,true);
r.faltas.cantidad=7;assert.equal(calculo.estadoEximicion(r).activa,false);
r=ramo([4,6,5.5,null],{bonusConfirmado:{texto:true}});
// Revelación y Fe: las décimas van a la nota más baja, como dice el programa
// (Lucas, 2026-11-11, "por si acaso"), no repartidas para subir la final.
{
 const def=run("JSON.stringify(PRESETS_UC['Revelación y Fe'].porSeccion[1].bonus.find(b=>b.id==='talleres'))");
 assert.equal(JSON.parse(def).operacion,'sumar','TTF012 suma las décimas a la nota más baja');
 const aLaMasBaja=extra=>ramo(extra.valores,{...extra.ramo,bonus:copia(mejoras).map(b=>b.id==='talleres'?{...b,operacion:'sumar'}:b)});
 // Sin eximición (sin contador) y examen rendido 5,0: la más baja es el examen.
 let x=aLaMasBaja({valores:[6,6.5,6.2,5],ramo:{faltas:null,bonusIngresado:{talleres:5}}});
 cercaDe(valor(x,'e'),5.5);cercaDe(valor(x,'a'),6);
 // Con eximición: 6,0 · 6,5 · 6,2 → E1 6,0 + 0,5 = 6,5; el examen copia la máxima, 6,5.
 x=aLaMasBaja({valores:[6,6.5,6.2,null],ramo:{bonusIngresado:{talleres:5}}});
 cercaDe(valor(x,'a'),6.5);cercaDe(valor(x,'e'),6.5);
 // Tope 7,0: lo que sobra no pasa a otra nota.
 x=aLaMasBaja({valores:[6.8,6.9,7,7],ramo:{faltas:null,bonusIngresado:{talleres:5}}});
 cercaDe(valor(x,'a'),7);cercaDe(valor(x,'b'),6.9);
 console.log('PASS: TTF012 suma las décimas a la nota más baja, con tope 7,0');
}
cercaDe(valor(r,'a'),5.5);cercaDe(calculo.estadoEximicion(r).promedio,17/3);
assert.equal(r.categorias.find(c=>c.id==='a').notas[0].valor,4);
r=ramo([6.8,6.9,7,7],{bonusIngresado:{talleres:5}});
cercaDe(valor(r,'a'),7);cercaDe(calculo.ramoAvg(r),7);
r=ramo([6,6.5,6.2,3],{bonusIngresado:{talleres:5}});
cercaDe(valor(r,'e'),3.5);cercaDe(calculo.ramoAvg(r),5.41);
r=ramo([4,5,6.5,7],{bonusConfirmado:{texto:true},bonusIngresado:{talleres:5}});
cercaDe(valor(r,'a'),5.5);cercaDe(valor(r,'c'),7);cercaDe(calculo.ramoAvg(r),6.3);
r=ramo([6,6.5,6.2,null],{faltas:null,bonusIngresado:{talleres:5}});
cercaDe(valor(r,'a'),6);assert(calculo.calculoRamoConCompuertas(r).res.mejoras.find(x=>x.id==='talleres').pendiente);
r.faltas={activo:true,cantidad:6,limite:6};cercaDe(valor(r,'e'),7);cercaDe(valor(r,'b'),7);
// El examen eximido se fija antes de las décimas: no se recalcula con su mejora.
r=ramo([5,6.5,6.5,null],{eximicionConfirmada:true,bonusConfirmado:{texto:true}});
cercaDe(valor(r,'a'),6);cercaDe(valor(r,'e'),6.5);cercaDe(calculo.estadoEximicion(r).promedio,19/3);
r=ramo([4,6,4,7],{bonusConfirmado:{texto:true}});
cercaDe(valor(r,'c'),5.5);cercaDe(valor(r,'a'),4);
r=ramo(undefined,{eximicionConfirmada:true});r.categorias.find(c=>c.id==='a').peso=25;
assert.equal(calculo.estadoEximicion(r),null,'editar los pesos desactiva la regla del programa');
r=ramo([3,5,4,2],{faltas:null});const sinReglas=copia(r);delete sinReglas.eximicion;delete sinReglas.bonus;
assert.equal(calculo.ramoAvg(r),calculo.ramoAvg(sinReglas),'sin activar conserva exactamente el promedio anterior');
for(const invalido of ['incorrecto',{},[null,{}]]){
 const malformado=ramo([3,5,4,2],{bonus:invalido});cercaDe(calculo.ramoAvg(malformado),calculo.ramoAvg(sinReglas));
}
console.log('PASS: casos numéricos, borde sin aproximar, orden explícito, tope, examen con su peso, empate por mayor peso y cuenta sin activar');

r=ramo([6,6,6.8,6.8],{bonusIngresado:{talleres:5}});
cercaDe(valor(r,'c'),7);cercaDe(valor(r,'e'),7);cercaDe(valor(r,'a'),6.1);
r=ramo([6,6,6,null],{eximicionConfirmada:true,bonusIngresado:{talleres:5}});
cercaDe(valor(r,'c'),6.5);cercaDe(valor(r,'e'),6.5);cercaDe(calculo.ramoAvg(r),6.3);
// Oráculo pequeño por enumeración: no replica el optimizador del motor.
for(const valores of [[6,6,6,null],[6,6.5,6.2,null],[6.8,6.8,6.8,null],[5,6.5,6.5,null]]){
 const prueba=ramo(valores,{eximicionConfirmada:true,bonusIngresado:{talleres:5}});
 let mejor=-Infinity;
 for(let a=0;a<=5;a++)for(let b=0;b<=5-a;b++)for(let c=0;c<=5-a-b;c++){
  const vs=[valores[0]+a/10,valores[1]+b/10,valores[2]+c/10];if(vs.some(v=>v>7+1e-10))continue;
  mejor=Math.max(mejor,vs[0]*.2+vs[1]*.2+vs[2]*.3+Math.max(...vs)*.3);
 }
 cercaDe(calculo.ramoAvg(prueba),mejor);
 const gastado=calculo.calculoRamoConCompuertas(prueba).res.mejoras.reduce((a,m)=>a+(m.valor-m.antes||0),0);
 assert(gastado<=.5+1e-9,'el examen copiado no consume ni duplica décimas');
}
r=ramo(undefined,{eximicionConfirmada:true});delete r.faltas;
assert.equal(calculo.estadoEximicion(r).activa,false,'no se inventan cero faltas si el contador no existe');
// La misma pauta propia en app, simulador, Estadísticas y persistencia/sync reales.
ctx.__def={evals:copia(evals),eximicion:copia(regla),bonus:[
 {id:'texto',entrada:'confirmacion',a:'grupo',evals:['Primera','Segunda','Tercera'],operacion:'promediar',valor:7,etapa:'previa'},
 {id:'talleres',entrada:'decimas',a:'grupo',evals:['Primera','Segunda','Tercera','Examen'],operacion:'distribuir',etapa:'final'}]};
run("PRESETS_UC['Curso sintético']=__def");
function cargar(r){ctx.__ramo=r;run("S={...freshState(),tenant:'uc',carrera:'ING-PC',ramos:[__ramo]};currentRamoId=__ramo.id;save=()=>{};track=()=>{}");}
r=ramo(undefined,{origen:{tenant:'uc',carrera:'ING-PC'},eximicionConfirmada:true});cargar(r);
cercaDe(run('ramoAvg(__ramo)'),6.31);cercaDe(run('gpa(S.ramos)'),6.31);
run('renderRamo()');assert.doesNotMatch(byId('eximicion-warning').innerHTML,/role="switch"/);
assert.match(byId('cat-list').children.map(x=>x.innerHTML).join(''),/Cuenta como 6,5 por eximición/);
run('cambiarFaltas(7)');assert.equal(run('estadoEximicion(__ramo).activa'),false);assert.equal(r.categorias.find(c=>c.id==='e').notas.length,0);
run('cambiarFaltas(-1)');assert.equal(run('estadoEximicion(__ramo).activa'),true);
r=ramo([4,6,5.5,5],{origen:{tenant:'uc',carrera:'ING-PC'}});cargar(r);
run("declararMejora('texto',true)");assert.equal(r.bonusConfirmado.texto,true);cercaDe(run('ramoAvg(__ramo)'),5.45);
run("cambiarBonus('talleres',-1)");assert.equal(r.bonusIngresado.talleres,0);
for(let i=0;i<5;i++)run("cambiarBonus('talleres',1)");assert.equal(r.bonusIngresado.talleres,5);
// Editar la pauta no puede dejar un beneficio viejo activo hasta la recarga.
const resueltas=run('resolverBonus(__def,__ramo.categorias)');
const personalizada=copia(r);personalizada.bonus=copia(resueltas);personalizada.categorias.find(c=>c.id==='c').peso=25;
assert.equal(calculo.reglasBonusVigentes(personalizada).length,0);
const topada=ramo([6,6,6,null],{eximicionConfirmada:true,bonusIngresado:{talleres:5},gates:[{type:'min_grade_required',catId:'e',min:7,cap:3.9}]});
cercaDe(calculo.ramoAvg(topada),3.9);assert.equal(calculo.gatesActivas(topada).length,1);
const persistido=JSON.stringify(r);ctx.__estado=copia(run('S'));
run('S=normalize(__estado)');const recargado=copia(run('S.ramos[0]'));
assert.equal(recargado.bonusConfirmado.texto,true);assert.equal(recargado.bonusIngresado.talleres,5);
assert.equal(recargado.categorias.find(c=>c.id==='a').notas[0].valor,4);
cercaDe(run('ramoAvg(S.ramos[0])'),calculo.ramoAvg(r));
const base=copia(run('S')), local=copia(base), nube=copia(base);
local.ramos[0].eximicionConfirmada=true;nube.ramos[0].bonusIngresado.talleres=6;
ctx.__base=base;ctx.__local=local;ctx.__nube=nube;
const fusion=copia(run('fusionarSync(__base,__local,__nube)'));
assert.equal(fusion.ramos[0].eximicionConfirmada,true);assert.equal(fusion.ramos[0].bonusIngresado.talleres,6);
assert.equal(fusion.ramos[0].bonusConfirmado.texto,true);
// Simula la tercera evaluación y comprueba el mismo motor sin guardar.
r=ramo([6,6,null,null],{origen:{tenant:'uc',carrera:'ING-PC'},eximicionConfirmada:true});cargar(r);
run("simState={c:[{valor:6}]};simAusencias={}");
cercaDe(run('ramoAvg(simProjectedRamo(__ramo))'),6);
cercaDe(run('notaNecesariaEximicion(__ramo)'),5.85);
assert.equal(r.categorias.find(c=>c.id==='c').notas.length,0);
const necesaria=calculo.notaNecesaria(r,6);assert(necesaria<=6+1e-6);
const proyectado=copia(r);proyectado.categorias.find(c=>c.id==='c').notas=[{id:'futura',valor:necesaria,peso:1}];
assert(calculo.notaFinalOficial(calculo.ramoAvg(proyectado))>=6);
// Guardar real: una conexión MCP recién agregada no espera una recarga.
r=ramo(undefined,{origen:{tenant:'uc',carrera:'ING-PC'}});delete r.eximicion;cargar(r);
run('syncToCloud=()=>{};publicarResumenWidgets=()=>{}');guardarReal();
const guardado=JSON.parse(ctx.localStorage.datos[run('STORAGE_KEY')]);
assert.equal(guardado.ramos[0].eximicion.requiereConfirmacion,false);
assert(Array.isArray(guardado.ramos[0].eximicion.pauta));
assert.equal(guardado.ramos[0].eximicionConfirmada,undefined);
cercaDe(calculo.ramoAvg(guardado.ramos[0]),6.31);
console.log('PASS: ficha, gpa de Estadísticas, simulador, meta con eximición, controles, recarga y fusión sin tocar sync');

// Endpoint MCP real con la copia de regla persistida, no catálogo ni preset.
(async()=>{
 const endpoint=leer('functions/mcp/[[ruta]].js').replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
 const s=ramo(undefined,{eximicionConfirmada:true});
 const c=vm.createContext({console,Response,module:{exports:{}},structuredClone,HERRAMIENTAS:[],NOMBRES:['que_necesito_para_aprobar'],validarPropuestaPauta:()=>null,
 fetch:async()=>({ok:true,json:async()=>({tenant:'uc',ramos:[s]})})});
 vm.runInContext(leer('engine.js'),c);c.motorCompartido={gh_crearCalculoRamo:c.module.exports.gh_crearCalculoRamo};
 vm.runInContext(endpoint,c);c.__pedido={params:{ruta:['a'.repeat(64)]},request:{json:async()=>({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'que_necesito_para_aprobar',arguments:{ramo:s.nombre}}})}};
 const respuesta=await vm.runInContext('onRequestPost(__pedido)',c);const body=await respuesta.json();
 assert.equal(body.error,undefined);const datos=JSON.parse(body.result.content[0].text);
 cercaDe(datos.promedioActual,6.31);assert.equal(datos.eximicion.activa,true);cercaDe(datos.eximicion.notaExamen,6.5);
 assert.equal(datos.promedioNecesario,null);
 console.log('PASS: MCP usa el mismo resultado y explica el examen eximido');
})().catch(e=>{console.error(e);process.exitCode=1;});
