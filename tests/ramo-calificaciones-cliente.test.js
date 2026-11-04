const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const elementos=new Map(),almacen=new Map();
function nodo(){return {hidden:false,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},innerHTML:'',textContent:'',isConnected:true,value:'',setAttribute(){},removeAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},focus(){}};}
const doc={getElementById:id=>{if(!elementos.has(id))elementos.set(id,nodo());return elementos.get(id);},createElement:nodo,documentElement:nodo(),body:nodo(),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={console,setTimeout,clearTimeout,URL,window:{addEventListener(){},matchMedia:()=>({matches:true,addListener(){},addEventListener(){}})},document:doc,navigator:{},location:{origin:'http://prueba.test',pathname:'/',hash:''},localStorage:{getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`var currentUser={id:'cuenta-sintetica'},supabaseClient=null;S=normalize({tenant:'uc',tipoCuenta:'estudiante',ramos:[{id:'r',nombre:'Ramo propio',sigla:'TST100',seccion:2,creditos:10,gates:[],categorias:[{id:'p',nombre:'Prueba',peso:50,directNota:true,notas:[{id:'n1',nombre:'Prueba',valor:5,peso:1}]},{id:'e',nombre:'Examen',peso:50,directNota:true,notas:[]}]}],historial:[]});globalThis.r=S.ramos[0];`);
const sql=fs.readFileSync(__dirname+'/../supabase/ramo_calificaciones.sql','utf8');
const validas=sql.match(/select array\[([\s\S]*?)\]::text\[\]/)[1].match(/'([^']+)'/g).map(x=>x.slice(1,-1));assert.deepEqual(JSON.parse(run('JSON.stringify(RAMO_ETIQUETAS.map(e=>e.id))')),validas);assert.equal(validas.length,12);
const guardado=run('JSON.stringify(S)'),c=run('contextoCalificarRamo(r)');
assert.equal(c.clave,'tst100');assert.equal(c.p_seccion,2);ctx.__ctx=c;
assert.throws(()=>run("payloadCalificarRamo(__ctx,1,5,true,['otro'])"),/lista/);
assert.throws(()=>run("payloadCalificarRamo(__ctx,1,5,true,Array(4).fill('interesante'))"),/lista/);
for(const exp of ['payloadCalificarRamo(__ctx,0,5,true)','payloadCalificarRamo(__ctx,1,6,true)','payloadCalificarRamo(__ctx,1,3,null)'])assert.throws(()=>run(exp),/preguntas/);
assert.deepEqual(JSON.parse(run("JSON.stringify(payloadCalificarRamo(__ctx,2,4,false,['interesante','interesante']))")),{p_ramo_id:'r',p_seccion:2,p_periodo:c.p_periodo,p_carga:2,p_facilidad:4,p_recomienda:false,p_etiquetas:['interesante']});
assert.equal(run('elegibleAvisoCalificarRamo(r,__ctx,{puede_calificar:true,mia:null})'),true);
assert.equal(run('elegibleAvisoCalificarRamo({...r,categorias:[{...r.categorias[0],peso:49.9},{...r.categorias[1],peso:50.1}]},__ctx,{puede_calificar:true,mia:null})'),false,'49,9% no se redondea a 50 para el aviso');
run('marcarAvisoCalificarRamo(__ctx)');assert.equal(run('elegibleAvisoCalificarRamo(r,__ctx,{puede_calificar:true,mia:null})'),false);
assert.equal(almacen.get('gradehub_v1'),undefined,'el aviso usa una clave separada, sin cambiar la cuenta');
run("currentUser={id:'otra-cuenta'}");assert.equal(run('avisoCalificarRamoVisto(__ctx)'),false,'no se comparte entre cuentas');run("currentUser={id:'cuenta-sintetica'}");
assert.equal(run('avisoCalificarRamoVisto({...__ctx,p_periodo:"2027-1"})'),false,'no se comparte entre períodos');
assert.equal(run('elegibleAvisoCalificarRamo(r,__ctx,{puede_calificar:true,mia:{carga:1}})'),false);
run("S.tipoCuenta='profesor'");assert.equal(run('contextoCalificarRamo(r)'),null);run("S.tipoCuenta='estudiante'");
assert.equal(run('contextoCalificarRamo({...r,seccion:null})'),null);
assert.equal(run('contenidoResumenRamoHTML({disponible:true,total:4,facilidad:4.9,docentes:[{nombre:"No debe aparecer"}]})').includes('No debe aparecer'),false);
const html=run(`contenidoResumenRamoHTML({disponible:true,total:5,carga:[1,2,3,4].map(opcion=>({opcion,n:opcion===1?5:0})),facilidad:4,facilidad_distribucion:[1,2,3,4,5].map(opcion=>({opcion,n:opcion===4?5:0})),recomiendan_de_10:8,etiquetas:[{id:'asistencia_obligatoria',n:3},{id:'interesante',n:2},{id:'texto_inventado',n:9}],docentes:[{nombre:'Docente sintético',estrellas:{total:3,promedio:4.3},ramo:{total:4,facilidad:4.8}}]})`);
assert(html.includes('Según estudiantes'));assert(!html.includes('Muy interesante'));assert(!html.includes('texto_inventado'));assert(html.includes('★ 4,3'));assert(!html.includes('4,8'));assert(!html.includes('anillo'));
assert.equal(run('JSON.stringify(S)'),guardado,'las presentaciones no cambian la pauta ni sus notas');
// Búsqueda y selección existentes no dependen de la RPC ni del contenido del resumen.
run(`globalThis.catalogoOriginal=searchCatalog('calculo','uc','ING-PC',2).map(r=>r.nombre);supabaseClient={rpc:async()=>({data:null,error:{code:'PGRST202'}})};`);
(async()=>{
 await assert.rejects(run("cargarResumenRamo('uc','tst100')"));
 assert.equal(run("JSON.stringify(searchCatalog('calculo','uc','ING-PC',2).map(r=>r.nombre))"),run('JSON.stringify(catalogoOriginal)'));
 assert(run("accionResumenCatalogoHTML({nombre:'Ramo <sintético>',sigla:'TST100'})").includes('&lt;sintético&gt;'));
 const base=run('JSON.stringify(S)');
 run(`S.historial=[{id:'h',label:'2025-2',ramos:[{...r,id:'hist',origen:{tenant:'uc',ramoKey:'TST100'}}]}]`);
 assert(run("contextoCalificarRamo(S.historial[0].ramos[0],'2025-2')"));
 run('S.historial[0].ramos[0].origen=null');assert.equal(run("contextoCalificarRamo(S.historial[0].ramos[0],'2025-2')"),null);
 ctx.__base=base;run('S=JSON.parse(__base)');
 // El botón nombra lo que falta según las dos respuestas propias del servidor.
 run("currentRamoId=S.ramos[0].id;globalThis.r=S.ramos[0];var __abrirProfe=abrirCalificarProfesor,__abrirRamo=abrirCalificarRamo;var __destino='';abrirCalificarProfesor=()=>__destino='profesor';abrirCalificarRamo=()=>__destino='ramo';");
 const boton=doc.getElementById('calif-accion'),raiz=doc.getElementById('ramo-profe');
 let estadoProfesor,estadoRamo,consultas=[];
 ctx.supabaseClient={rpc:async(nombre,args)=>{consultas.push({nombre,args});return{data:nombre==='profesor_docente_estado'?{nombre_publico:'Docente sintético'}:nombre==='profesor_calificacion_estado'?estadoProfesor:estadoRamo};}};
 for(const [profe,ramo,texto,oculto,destino] of [[false,false,'Calificar',false,'profesor'],[true,false,'Calificar ramo',false,'ramo'],[false,true,'Calificar profesor',false,'profesor'],[true,true,'Calificar profesor',true,null]]){
  estadoProfesor={puede_calificar:true,mi_estrellas:profe?5:null};estadoRamo={puede_calificar:true,mia:ramo?{carga:2}:null};consultas=[];
  const opinion=run('consultarCalificacionRamoFicha(r)');ctx.__opinion=opinion;
  await Promise.all([run('renderDocenteRamo(r,__opinion)'),run('pintarResumenRamoFicha(r,__opinion)')]);
  assert.equal(boton.hidden,oculto);assert.match(boton.innerHTML,new RegExp('>'+texto+'<'));
  assert.equal(consultas.filter(x=>x.nombre==='ramo_calificacion_estado').length,1,'una consulta propia compartida por apertura');
  if(!oculto){boton.onclick();assert.equal(run('__destino'),destino);}
 }
 estadoProfesor={puede_calificar:false,mi_estrellas:null};estadoRamo={puede_calificar:true,mia:null};await run('renderDocenteRamo(r)');assert.match(boton.innerHTML,/>Calificar ramo</);assert.equal(boton.hidden,false);
 // Una cuenta existente que ya calificó al profesor ve directamente el ramo.
 estadoProfesor={puede_calificar:true,mi_estrellas:5};await run('renderDocenteRamo(r)');assert.match(boton.innerHTML,/>Calificar ramo</);boton.onclick();assert.equal(run('__destino'),'ramo');
 for(const fallo of ['rpc','red']){
  ctx.supabaseClient.rpc=async(nombre)=>{if(nombre==='ramo_calificacion_estado'){if(fallo==='red')throw Error('sin red');return{error:{code:'PGRST202'}};}return{data:nombre==='profesor_docente_estado'?{}:{puede_calificar:true,mi_estrellas:null}};};
  await run('renderDocenteRamo(r)');assert.equal(boton.hidden,false);assert.match(boton.innerHTML,/>Calificar profesor</,'sin RPC/red conserva el botón del profesor');
 }
 let consultasProfesor=0;ctx.supabaseClient.rpc=async()=>{consultasProfesor++;return{data:{}};};run("S.tipoCuenta='profesor'");await run('renderDocenteRamo(r)');assert.equal(boton.hidden,true);assert.equal(consultasProfesor,0);run("S.tipoCuenta='estudiante'");
 const resolvers=[];ctx.supabaseClient.rpc=nombre=>new Promise(resolve=>resolvers.push({nombre,resolve}));
 const tardia=run('renderDocenteRamo(r)');run("currentRamoId='otro-ramo'");
 for(const {nombre,resolve} of resolvers)resolve({data:nombre==='profesor_docente_estado'?{nombre_publico:'No debe verse'}:{puede_calificar:true,mia:null}});
 await tardia;assert.equal(boton.hidden,true);assert(!raiz.innerHTML.includes('No debe verse'));
 run('currentRamoId=r.id;abrirCalificarProfesor=__abrirProfe;abrirCalificarRamo=__abrirRamo');assert.equal(run('JSON.stringify(S)'),base);
 console.log('OK: etiquetas cerradas, aviso una vez por cuenta/ramo/período, estado intacto, piso, contexto histórico y buscador sin SQL');
})().catch(e=>{console.error(e);process.exit(1)});
