// Calificar ramo, ronda 2 (Lucas, 2026-11-18): orden de preguntas en pasado,
// sin horas, «Otro», etiquetas que se adaptan a lo más elegido y el mismo
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
const base={facilidad:3,asistencia:null,recomienda:3};ctx.__b=base;

// ── Payload nuevo ──
let p=json("payloadOpinarRamo(__c,{...__b,etiquetas:['mucha_lectura','mucha_lectura'],otros:['  Mucha   tarea ','mucha TAREA']})");
assert.deepEqual(p.p_etiquetas,['mucha_lectura']);assert.deepEqual(p.p_otros,['Mucha tarea'],'escritas normalizadas y sin repetir');
assert.equal('p_carga' in p,false,'el formulario nuevo no pregunta horas');assert.equal(p.p_recomienda_nivel,3);assert.equal('p_recomienda' in p,false,'el booleano lo deriva el servidor');
assert.equal(json("payloadOpinarRamo(__c,{...__b,recomienda:2})").p_recomienda_nivel,2,'Más o menos');assert.equal('p_estudio' in p,false,'tampoco estudio');
for(const cambio of ['{facilidad:6}','{facilidad:undefined}','{asistencia:undefined}','{recomienda:null}','{recomienda:true}','{recomienda:0}','{recomienda:4}'])
 assert.throws(()=>run(`payloadOpinarRamo(__c,{...__b,...${cambio}})`),/preguntas/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,etiquetas:['mucha_lectura','interesante'],otros:['Muy practico','Mucha tarea']})"),/hasta 3/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,otros:['ab']})"),/entre 3 y 40/);
assert.throws(()=>run("payloadOpinarRamo(__c,{...__b,otros:['x'.repeat(41)]})"),/entre 3 y 40/);
assert.equal(run("payloadOpinarRamo(__c,{...__b,otros:['x'.repeat(40)]})").p_otros[0].length,40,'40 caracteres se aceptan');
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
assert(h.includes('¿Cuántas horas a la semana'),'sin SQL nuevo: formulario anterior con horas');assert(!h.includes('data-rc-otro'));
assert(!h.includes('Más o menos')&&/name="recomienda" value="1"/.test(h)&&/name="recomienda" value="0"/.test(h),'sin SQL nuevo: recomendar sigue en Sí / No');
assert(pos(h,'¿Lo recomendarías?')<pos(h,'¿Cómo era?'),'el anterior conserva su orden');pos(h,'¿Qué tan fácil era sacarse buena nota?');
h=await hoja({version:2});
assert(!h.includes('¿Cuántas horas'),'con SQL nuevo ya no pregunta horas');
const orden=['¿Qué tan fácil era sacarse buena nota?','¿Se tomaba asistencia?','¿Lo recomendarías?','¿Cómo era?'].map(t=>pos(h,t));
assert.deepEqual([...orden].sort((a,b)=>a-b),orden,'orden nuevo: recomendar antes de las etiquetas');
assert(!h.includes('estudiar')&&!h.includes('name="estudio"'),'sin pregunta de estudio');
assert(h.includes('data-rc-otro')&&h.includes('maxlength="40"'),'«Otro» con su campo');
assert(pos(h,'value="3"><span>Sí')<pos(h,'value="2"><span>Más o menos')&&pos(h,'value="2"><span>Más o menos')<pos(h,'value="1"><span>No</span>'),'Sí / Más o menos / No, en ese orden');
assert.equal((h.match(/name="etiqueta"/g)||[]).length,8,'sin sugeridas (RPC ausente): la lista fija');
h=await hoja({version:2,sugeridas:{disponible:true,orden:['mucha_lectura'],sin_uso:['interesante'],propias:['<img src=x onerror=alert(1)>']},mia:{facilidad:4,asistencia:true,recomienda:true,etiquetas:[],otros:['Muy <b>práctico</b>'],carga:2}});
assert(!h.includes('<img')&&h.includes('&lt;img'),'una escrita sugerida va escapada');assert(!h.includes('<b>práctico')&&h.includes('&lt;b&gt;'),'la propia también');
assert(!h.includes('value="interesante"'),'la que nadie elige no se ofrece');assert(pos(h,'value="mucha_lectura"')<pos(h,'value="controles_semanales"'),'la más elegida primero');
assert(/name="facilidad" value="4" checked/.test(h),'conserva lo guardado');
assert(/name="recomienda" value="3" checked/.test(h),'una opinión antigua con «sí» se lee como Sí');
assert.equal(run("nivelRecomiendaRamo({recomienda:false})"),1,'antigua «no» → No');assert.equal(run("nivelRecomiendaRamo({recomienda:null,recomienda_nivel:2})"),2);
assert.equal(run("nivelRecomiendaRamo({recomienda:true,recomienda_nivel:2})"),2,'el nivel manda');assert.equal(run("nivelRecomiendaRamo(null)"),null);
h=await hoja({version:2,mia:{facilidad:2,asistencia:false,recomienda:null,recomienda_nivel:2,etiquetas:[],otros:[]}});
assert(/name="recomienda" value="2" checked/.test(h),'Más o menos guardado');

// ── Resumen (toma de ramos): escritas con tres cuentas ──
assert.equal(run("typeof estudioRamoHTML"),'undefined','sin pregunta de estudio');
const et=run("etiquetasRamoHTML({etiquetas:[{id:'mucha_lectura',n:5}],escritas:[{texto:'<i>Mucha</i> tarea',n:3},{texto:'Poca gente',n:2}]})");
assert(et.includes('Mucha lectura')&&et.includes('&lt;i&gt;Mucha'),'escrita escapada');assert(!et.includes('Poca gente'),'una escrita con dos cuentas no aparece');
const res=run("contenidoResumenRamoHTML({disponible:true,total:6,facilidad:3,recomiendan_de_10:5,mas_o_menos_de_10:3,asistencia:{si:0,no:0},carga:[{opcion:2,n:6}],docentes:[]},{coordinado:true})");
assert(res.includes('Horas a la semana'),'las horas antiguas siguen en el resumen');assert(res.includes('5 de cada 10 lo recomiendan')&&res.includes('3 de 10, más o menos'),'más o menos va aparte');
assert(!run("contenidoResumenRamoHTML({disponible:true,total:6,facilidad:3,recomiendan_de_10:5,asistencia:{si:0,no:0},docentes:[]},{coordinado:true})").includes('más o menos'),'sin dato, no se menciona');
console.log('OK calificaciones ronda 2 (cliente): payload, orden, Otro, sugeridas de ramo y profesor, sin SQL, recomendar en tres, pasado y escapado');
})().catch(e=>{console.error(e);process.exit(1);});
