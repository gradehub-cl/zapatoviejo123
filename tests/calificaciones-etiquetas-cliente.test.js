// Calificar ramo, ronda 2 (Lucas, 2026-11-18): orden de preguntas, estudio en
// vez de horas, «Otro», etiquetas que se adaptan a lo más elegido y el mismo
// sistema en Calificar profesor. Funciona antes y después del SQL nuevo.
// Solo datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function nodo(){const n={hidden:false,checked:false,disabled:false,value:'',style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return true},toggle(){}},dataset:{},innerHTML:'',textContent:'',isConnected:true,
 setAttribute(){},removeAttribute(){},appendChild(){},addEventListener(){},insertAdjacentHTML(){},closest(){return n},matches(){return false},querySelector(){return nodo()},querySelectorAll(){return []},focus(){},remove(){}};return n;}
const elementos=new Map();
const doc={getElementById:id=>{if(!elementos.has(id))elementos.set(id,nodo());return elementos.get(id);},createElement:nodo,documentElement:nodo(),body:nodo(),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={console,setTimeout,clearTimeout,URL,window:{addEventListener(){},matchMedia:()=>({matches:true,addListener(){},addEventListener(){}})},document:doc,navigator:{},location:{origin:'http://prueba.test',pathname:'/',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
run(`var currentUser={id:'cuenta-sintetica'};S=normalize({tenant:'uc',tipoCuenta:'estudiante',ramos:[{id:'r',nombre:'Ramo sintético',sigla:'TST100',seccion:1,gates:[],categorias:[{id:'p',nombre:'Prueba',peso:100,directNota:true,notas:[]}]}],historial:[]});globalThis.r=S.ramos[0];globalThis.__c=contextoCalificarRamo(r);`);
const base={facilidad:3,asistencia:null,estudio:2,recomienda:true};ctx.__b=base;

// ── Payload nuevo ──
let p=json("payloadOpinarRamo(__c,{...__b,etiquetas:['mucha_lectura','mucha_lectura'],otros:['  Mucha   tarea ','mucha TAREA']})");
assert.deepEqual(p.p_etiquetas,['mucha_lectura']);assert.deepEqual(p.p_otros,['Mucha tarea'],'escritas normalizadas y sin repetir');
assert.equal(p.p_estudio,2);assert.equal('p_carga' in p,false,'el formulario nuevo no pregunta horas');
for(const cambio of ['{estudio:0}','{estudio:5}','{estudio:undefined}','{facilidad:6}','{asistencia:undefined}','{recomienda:null}'])
 assert.throws(()=>run(`payloadOpinarRamo(__c,{...__b,...${cambio}})`),/preguntas/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,etiquetas:['mucha_lectura','interesante'],otros:['Muy practico','Mucha tarea']})"),/hasta 3/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,otros:['ab']})"),/entre 3 y 20/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,otros:['x'.repeat(21)]})"),/entre 3 y 20/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,etiquetas:['inventada']})"),/lista/);

// ── Etiquetas sugeridas del ramo ──
const ids=s=>json(`etiquetasSugeridasRamo(${s}).map(x=>x.id||('«'+x.texto+'»'))`);
const fija=json('RAMO_ETIQUETAS.map(e=>e.id)');
assert.deepEqual(ids('null'),fija,'sin datos o sin RPC: la lista fija');
assert.deepEqual(ids('{disponible:false}'),fija);
let l=ids("{disponible:true,orden:['mucha_lectura','buen_material'],sin_uso:[],propias:[]}");
assert.deepEqual(l.slice(0,2),['mucha_lectura','buen_material'],'las más elegidas primero');assert.equal(l.length,8);
l=ids("{disponible:true,orden:['mucha_lectura'],sin_uso:['interesante','trabajo_grupo'],propias:['Mucha matemática']}");
assert(!l.includes('interesante')&&!l.includes('trabajo_grupo'),'la que nadie elige se oculta');
assert.equal(l[1],'«Mucha matemática»','una escrita popular toma su lugar, después de las más elegidas');assert(l.length<=8);
l=ids("{disponible:true,orden:['mucha_lectura'],sin_uso:['interesante'],propias:[]},['interesante'],['Mi etiqueta']");
assert(l.includes('interesante'),'lo que la persona ya eligió nunca desaparece');assert.equal(l.at(-1),'«Mi etiqueta»');
l=ids("{disponible:true,orden:['inventada','mucha_lectura'],sin_uso:[],propias:['Mi etiqueta','mi  ETIQUETA',null,'']},[],['Mi etiqueta']");
assert(!l.includes('inventada'),'ids desconocidos se ignoran');assert.equal(l.filter(x=>x==='«Mi etiqueta»').length,1,'sin repetir la propia');
l=ids("{disponible:true,orden:[],sin_uso:[],propias:['a1','b2','c3','d4','e5','f6','g7','h8','i9']}");assert.equal(l.length,8,'nunca más de ocho');

// ── Profesor ──
const prof=s=>json(`etiquetasSugeridasProfesor(${s})`);
const sinDatos=prof('5,[]');assert.equal(sinDatos.length,6,'sin datos: las seis de esas estrellas');
const conDatos=prof("5,[],{disponible:true,orden:['exigente','cuesta_entenderle'],sin_uso:['motiva'],propias:[]}");
assert(conDatos.includes('exigente')&&conDatos.includes('cuesta_entenderle'),'las dos más elegidas aparecen aunque no sean de esas estrellas');
assert(!conDatos.includes('motiva'),'la que nadie elige se oculta');
assert(prof("5,['motiva'],{disponible:true,orden:[],sin_uso:['motiva'],propias:[]}").includes('motiva'),'salvo que la persona la tenga marcada');
assert.deepEqual(json("escritasSugeridasProfesor({disponible:true,propias:['Explica bien','explica  BIEN','Ya está']},['Ya esta'])"),['Explica bien']);
assert.deepEqual(json('escritasSugeridasProfesor(null)'),[]);

(async()=>{
// ── Hoja de Calificar ramo, antes y después del SQL ──
const caja=doc.getElementById('modal-content');doc.getElementById('modal').classList.contains=()=>true;
run('openModal=()=>{};enfocarEnHoja=()=>{};coordinacionResumenRamo=async()=>false;');
const hoja=async({version,sugeridas,mia=null})=>{
 ctx.supabaseClient={rpc:async n=>{
  if(n==='ramo_calificacion_estado')return {data:{puede_calificar:true,mia,...(version?{version}:{})}};
  if(n==='ramo_etiquetas_sugeridas')return sugeridas===undefined?{error:{code:'PGRST202'}}:{data:sugeridas};
  return {data:null};}};
 await run('abrirCalificarRamo(r)');return caja.innerHTML;
};
const pos=(h,t)=>{const i=h.indexOf(t);assert(i>=0,'falta: '+t);return i;};
let h=await hoja({});
assert(h.includes('¿Cuántas horas a la semana'),'sin SQL nuevo: formulario anterior con horas');assert(!h.includes('Con cuánto tiempo empezaste'));assert(!h.includes('data-rc-otro'));
assert(pos(h,'¿Lo recomendarías?')<pos(h,'¿Cómo es?'),'el anterior conserva su orden');
h=await hoja({version:2});
assert(!h.includes('¿Cuántas horas'),'con SQL nuevo ya no pregunta horas');
const orden=['¿Qué tan fácil','¿Se tomaba asistencia?','¿Con cuánto tiempo empezaste a estudiar para las pruebas?','¿Cómo es?','¿Lo recomendarías?'].map(t=>pos(h,t));
assert.deepEqual([...orden].sort((a,b)=>a-b),orden,'orden nuevo: recomendar al final');
for(const t of ['El día antes','2 a 3 días antes','Una semana antes','Más de una semana antes'])pos(h,t);
assert(h.includes('data-rc-otro')&&h.includes('maxlength="20"'),'«Otro» con su campo');
assert.equal((h.match(/name="etiqueta"/g)||[]).length,8,'sin sugeridas (RPC ausente): la lista fija');
h=await hoja({version:2,sugeridas:{disponible:true,orden:['mucha_lectura'],sin_uso:['interesante'],propias:['<img src=x onerror=alert(1)>']},mia:{facilidad:4,asistencia:true,estudio:3,recomienda:true,etiquetas:[],otros:['Muy <b>práctico</b>'],carga:2}});
assert(!h.includes('<img')&&h.includes('&lt;img'),'una escrita sugerida va escapada');assert(!h.includes('<b>práctico')&&h.includes('&lt;b&gt;'),'la propia también');
assert(!h.includes('value="interesante"'),'la que nadie elige no se ofrece');assert(pos(h,'value="mucha_lectura"')<pos(h,'value="controles_semanales"'),'la más elegida primero');
assert(/value="3" checked/.test(h),'conserva el estudio guardado');

// ── Resumen (toma de ramos): estudio desde cinco respuestas y escritas con tres ──
assert.equal(run("estudioRamoHTML({estudio:[{opcion:1,n:2},{opcion:2,n:2},{opcion:3,n:0},{opcion:4,n:0}]})"),'','bajo cinco respuestas con estudio, nada');
const est=run("estudioRamoHTML({estudio:[{opcion:1,n:1},{opcion:2,n:4},{opcion:3,n:1},{opcion:4,n:0}]})");
assert(est.includes('2 a 3 días antes')&&est.includes('4 de 6'),'el tramo más común y de cuántos');
const et=run("etiquetasRamoHTML({etiquetas:[{id:'mucha_lectura',n:5}],escritas:[{texto:'<i>Mucha</i> tarea',n:3},{texto:'Poca gente',n:2}]})");
assert(et.includes('Mucha lectura')&&et.includes('&lt;i&gt;Mucha'),'escrita escapada');assert(!et.includes('Poca gente'),'una escrita con dos cuentas no aparece');
assert(run("contenidoResumenRamoHTML({disponible:true,total:6,facilidad:3,recomiendan_de_10:5,asistencia:{si:0,no:0},estudio:[{opcion:2,n:6}],docentes:[]},{coordinado:true})").includes('Empezaron a estudiar'));
console.log('OK calificaciones ronda 2 (cliente): payload, orden, Otro, sugeridas de ramo y profesor, sin SQL y escapado');
})().catch(e=>{console.error(e);process.exit(1);});
