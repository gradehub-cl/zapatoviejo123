// «Calificar ramo»: semestre y sección siempre; el profesor solo si el ramo no
// es coordinado (Lucas, 2026-11-18). Solo datos sintéticos.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function nodo(){return {hidden:false,style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false}},dataset:{},innerHTML:'',textContent:'',isConnected:true,value:'',setAttribute(){},removeAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},focus(){}};}
const elementos=new Map();
const doc={getElementById:id=>{if(!elementos.has(id))elementos.set(id,nodo());return elementos.get(id);},createElement:nodo,documentElement:nodo(),body:nodo(),addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]};
const ctx={console,setTimeout,clearTimeout,URL,window:{addEventListener(){},matchMedia:()=>({matches:true,addListener(){},addEventListener(){}})},document:doc,navigator:{},location:{origin:'http://prueba.test',pathname:'/',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`var currentUser={id:'cuenta-sintetica'};S=normalize({tenant:'uc',tipoCuenta:'estudiante',ramos:[{id:'r',nombre:'Ramo sintético',sigla:'TST100',seccion:1,gates:[],categorias:[{id:'p',nombre:'Prueba',peso:100,directNota:true,notas:[]}]}],historial:[]});globalThis.r=S.ramos[0];`);
let llamadas=0,respuesta={data:{nombre_publico:'María José Pérez Soto'}};
ctx.supabaseClient={rpc:async(n)=>{if(n==='profesor_docente_estado'){llamadas++;return respuesta;}return {data:null};}};
(async()=>{
  const c=run('contextoCalificarRamo(r)'),periodo=run('semester()');ctx.__c=c;
  run('var __coord=false;coordinacionResumenRamo=async()=>__coord');
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1 · con María J. Pérez`,'no coordinado: con el profesor, en nombre corto');
  run('__coord=null');
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1 · con María J. Pérez`,'sin dato de coordinación también');
  run('__coord=true');llamadas=0;
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1`,'coordinado: sin profesor');
  assert.equal(llamadas,0,'coordinado no consulta al profesor');
  run('__coord=false');respuesta={error:{message:'sin red'}};
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1`,'si falla, sin profesor');
  respuesta={data:{nombre_publico:null,mi_nombre:'Ana Rojas'}};
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1 · con Ana Rojas`,'el nombre que informó el propio estudiante');
  respuesta={data:{}};
  assert.equal(await run('subtituloCalificarRamo(r,__c)'),`${periodo} · Sección 1`,'sin profesor registrado, sin «con»');
  // Un semestre anterior: la sección es de ese semestre y el registro de
  // docentes es del vigente, así que no se adivina el profesor.
  ctx.__h={...c,p_periodo:'2025-1'};llamadas=0;respuesta={data:{nombre_publico:'No debe verse'}};
  assert.equal(await run('subtituloCalificarRamo(r,__h)'),'2025-1 · Sección 1');assert.equal(llamadas,0);
  console.log('OK calificar ramo: semestre, sección y profesor solo si no es coordinado');
})().catch(e=>{console.error(e);process.exit(1);});
