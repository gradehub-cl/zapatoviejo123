// #1056 + #1080: pauta propia sintética; el programa de JP no se deduce
// de coincidir en pesos. Lucas confirmó las secciones 1 y 2 (2026-2).
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname+'/..',store=new Map(),els=new Map();
const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},children:[],appendChild(n){this.children.push(n)},remove(){},addEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},value:'',innerHTML:'',textContent:'',dataset:{},clientWidth:375});
const get=id=>{if(!els.has(id))els.set(id,el());return els.get(id)};
const ctx={console,setTimeout(){},clearTimeout(){},requestAnimationFrame(){},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:get,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},navigator:{},location:{origin:'',pathname:'/',hash:'',search:''},history:{replaceState(){}},getComputedStyle:()=>({getPropertyValue:()=>''})};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),ctx,{filename:f});
const run=s=>vm.runInContext(s,ctx),plain=x=>JSON.parse(JSON.stringify(x));
const cerca=(a,b)=>assert.ok(typeof a==='number'&&Math.abs(a-b)<1e-9,`esperaba ${b}; llegó ${a}`);
const nombres=['Evaluación 1','Evaluación 2','Evaluación 3','Examen final'];
function propio(seccion,valores=[6,6.5,6.2,null]){return {id:'jp-sintetico',nombre:'Revelación y Fe',sigla:'TTF012',periodo:'2026-2',creditos:10,color:'#888888',origen:{tenant:'uc',carrera:'ING-PC',ramoKey:'TTF012'},seccion,faltas:{activo:true,cantidad:6,limite:6},gates:[],categorias:nombres.map((nombre,i)=>({id:'c'+i,nombre,peso:[20,20,30,30][i],directNota:true,notas:valores[i]===null?[]:[{id:'n'+i,nombre,valor:valores[i],peso:1}]}))};}
function cargar(r){ctx.estado={...run('freshState()'),tenant:'uc',onboardingDone:true,ramos:[r]};run('S=normalize(estado);currentRamoId=S.ramos[0].id');return run('S.ramos[0]');}
const def=run("PRESETS_UC['Revelación y Fe']");assert.deepEqual(Object.keys(def.porSeccion),['1','2']);assert.equal(def.evals,undefined);assert.equal(def.evalsReferencia,undefined);assert.equal(def.bonus,undefined);assert.equal(def.eximicion,undefined);
for(const seccion of [1,2]){const r=cargar(propio(seccion)),antes=JSON.stringify(r.categorias);cerca(ctx.ramoAvg(r),6.31);assert.equal(ctx.estadoEximicion(r).activa,true);assert.deepEqual(plain(r.eximicion.secciones),[1,2]);assert.ok(r.bonus.every(b=>b.secciones.join(',')==='1,2'));assert.equal(ctx.notaNecesaria(r),null);assert.equal(JSON.stringify(r.categorias),antes);}
for(const seccion of [3,4,null]){const r=cargar(propio(seccion));assert.equal(ctx.definicionPresetDelRamo(r),null);assert.equal(ctx.estadoEximicion(r),null);assert.equal(r.bonus,undefined);assert.equal(r.eximicion,undefined);cerca(ctx.ramoAvg(r),436/70);assert.notEqual(ctx.notaNecesaria(r),null);assert.equal(ctx.ramoCompletamenteEvaluado(r),false);}
let r=cargar(propio(1,[4,6,5.5,5]));r.bonusConfirmado={texto:true};r.bonusIngresado={talleres:5};cerca(ctx.ramoAvg(r),5.6);
// Cambiar la sección no espera la recarga para dejar de aplicar un beneficio.
const categorias=JSON.stringify(r.categorias);r.seccion=3;cerca(ctx.ramoAvg(r),5.15);assert.equal(ctx.reglasBonusVigentes(r).length,0);run('save()');assert.equal(r.bonus,undefined);assert.equal(r.bonusIngresado.talleres,5);assert.equal(r.bonusConfirmado.texto,true);assert.equal(JSON.stringify(r.categorias),categorias);
r.seccion=2;run('save()');cerca(ctx.ramoAvg(r),5.6);assert.ok(r.bonus.length===2);const persistido=JSON.parse(store.get('gradehub_v1'));r=cargar(persistido.ramos[0]);cerca(ctx.ramoAvg(r),5.6);
const base=plain(run('S')),local=plain(base),nube=plain(base);local.ramos[0].seccion=4;nube.ramos[0].bonusIngresado.talleres=6;ctx.b=base;ctx.l=local;ctx.n=nube;const fusion=plain(run('fusionarSync(b,l,n)'));r=cargar(fusion.ramos[0]);cerca(ctx.ramoAvg(r),5.15);assert.equal(r.bonusIngresado.talleres,6);assert.equal(JSON.stringify(r.categorias),categorias);
// El mismo engine.js que usa MCP respeta el ámbito persistido, sin catálogo.
const motor=require(root+'/engine.js'),calc=motor.gh_crearCalculoRamo({normName:s=>s.toLowerCase(),copiarRecuperativo:()=>null,definicionPresetDelRamo:r=>({eximicion:r.eximicion,evals:r.eximicion?.pauta}),tenant:()=> 'uc',ramos:()=>[]});
const jp=cargar(propio(1));run('save()');const guardado=plain(jp);cerca(calc.ramoAvg(guardado),6.31);guardado.seccion=3;cerca(calc.ramoAvg(guardado),436/70);assert.equal(calc.estadoEximicion(guardado),null);
const otro=propio(1);otro.sigla='TEB110';assert.equal(ctx.definicionPresetDelRamo(otro),null,'un homónimo no recibe las reglas de TTF012');
// Aceptar un programa oficial sí conserva sus reglas; una pauta de estudiantes
// con pesos iguales no se convierte en el programa de JP.
const datos=propio(1);datos.pautaSugerida={aceptada:{fuente:'programa',secciones:[1,2]}};assert.ok(ctx.definicionPresetDelRamo(datos)?.eximicion);datos.pautaSugerida.aceptada.fuente='catalogo';assert.equal(ctx.definicionPresetDelRamo(datos),null);
console.log('OK TTF012: JP1/2, otros3/4 y sin sección, pesos coincidentes, ámbito persistido/MCP, cambio inmediato, guardado, recarga y sync; notas y contadores intactos');
