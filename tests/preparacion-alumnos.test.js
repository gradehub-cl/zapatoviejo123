const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const el=()=>({style:{setProperty(){}},classList:{add(){},remove(){},contains(){return false}},appendChild(){},innerHTML:'',textContent:'',value:'',dataset:{},addEventListener(){},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return[]}}),stub=el();
const ctx={console,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}})},document:{getElementById:()=>stub,createElement:el,documentElement:stub,body:stub,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){throw Error('No se guarda la preparación en el dispositivo')},removeItem(){}},location:{origin:'',pathname:'/',hash:''},navigator:{}};
vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`var currentUser={id:'profe-sintetico'};var al={id:'conexion',nombre_visible:'Alumno sintético',tenant:'uc',inicio:'2026-09-15',ramos:[{id:'r',nombre:'Ramo propio',sigla:'SYN100',categorias:[1,2,3,4].map((i)=>({id:'c'+i,nombre:'Prueba '+i,peso:25,directNota:true,fecha:'2026-'+(i<3?'09-0'+i:'10-0'+i),notas:[{id:'n'+i,nombre:'Prueba '+i,valor:i<3?3:5,peso:1}]}))}]};var comp=()=>({evaluaciones:[1,2,3,4].map(i=>({clave:'prueba '+i,promedio:4,personas:10}))});`);
const antes=run('JSON.stringify(al.ramos)'),normal=run('metricasAlumnoRamoPanel(al,al.ramos[0],comp)');assert.equal(normal.cambio,2);
run(`al.preparacion={ramos:[{ramo_id:'r',manual:true,marcas:[{nota_id:'n1'},{nota_id:'n3'}],evaluaciones:[]}]}`);
let m=run('metricasAlumnoRamoPanel(al,al.ramos[0],comp)');assert.equal(m.metodo,'manual');assert.equal(m.antes.n,2);assert.equal(m.ahora.n,2);assert.equal(m.cambio,0,'preparadas/no preparadas no se infieren de la fecha');
assert(run('antesAhoraAlumnoHTML(metricasAlumnoRamoPanel(al,al.ramos[0],comp))').includes('Preparadas / No preparadas'));
const csv=run('csvResumenAlumnosPanel([al],comp)').split('\r\n').map(x=>x.split(';'));assert.equal(csv[1][8],'');assert.equal(csv[1][9],'');assert.equal(csv[1][10],'');assert.equal(csv[1][16],'manual');
run('al.preparacion.ramos[0].marcas=[]');m=run('metricasAlumnoRamoPanel(al,al.ramos[0],comp)');assert.equal(m.metodo,'manual');assert.equal(m.ahora.n,0);assert.equal(m.cambio,null);
run('al.preparacion=null');assert.equal(run('metricasAlumnoRamoPanel(al,al.ramos[0],comp).cambio'),normal.cambio);
run(`var otro={...al,id:'otro',preparacion:{ramos:[{ramo_id:'r',manual:true,marcas:[{nota_id:'n1'},{nota_id:'n3'}],evaluaciones:[]}]}}`);assert.equal(run('metricasGrupoPanel([al,otro],comp).grupos.length'),2);assert.equal(run('metricasGrupoPanel([al,otro],comp).cambioMediana'),null);
assert.equal(run('JSON.stringify(al.ramos)'),antes);
// Solo pruebas filtra también lo que entra por una marca sin fecha.
run(`var conLab={id:'lab',nombre_visible:'Alumno sintético',tenant:'uc',soloPruebasPanel:true,ramos:[{id:'r2',nombre:'Ramo con lab',sigla:'SYN200',categorias:[{id:'p',nombre:'Prueba',tipoEvaluacion:'prueba',peso:50,directNota:true,notas:[{id:'np',nombre:'Prueba',valor:5,peso:1}]},{id:'l',nombre:'Laboratorio',tipoEvaluacion:'laboratorio',peso:50,directNota:true,notas:[{id:'nl',nombre:'Laboratorio',valor:7,peso:1}]}]}],
 preparacion:{ramos:[{ramo_id:'r2',manual:true,marcas:[{nota_id:'np'},{nota_id:'nl'}],evaluaciones:[{nota_id:'np',nombre:'Prueba',nota:5},{nota_id:'nl',nombre:'Laboratorio',nota:7}]}]}}`);
assert.equal(run('metricasAlumnoRamoPanel(conLab,conLab.ramos[0],()=>null).evaluaciones.map(e=>e.id).join()'),'np','un laboratorio marcado no entra a solo pruebas');
run('conLab.soloPruebasPanel=false');assert.equal(run('metricasAlumnoRamoPanel(conLab,conLab.ramos[0],()=>null).evaluaciones.length'),2);
(async()=>{
 await run("cargarPreparacionPanel(al,async()=>({error:{code:'PGRST202'}}))");assert.equal(run('al.preparacion'),null);
 ctx.__datos={ramos:[{ramo_id:'r',manual:true,marcas:[],evaluaciones:[]}]};await run('cargarPreparacionPanel(al,async()=>({data:__datos}))');
 await run("cargarPreparacionPanel(al,async()=>{throw Error('red')})");assert.equal(run('al.preparacion.ramos[0].manual'),true);assert.equal(run('al.preparacion.errorCarga'),true);assert.equal(run('metricasAlumnoRamoPanel(al,al.ramos[0],comp).cambio'),null);
 console.log('OK: regla previa idéntica, manual vacío, selección independiente de fecha, métodos separados, CSV sin reinterpretar, ausencia de SQL y error temporal');
})().catch(e=>{console.error(e);process.exitCode=1});
