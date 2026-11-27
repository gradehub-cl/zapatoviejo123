// Comparación por alumno y ramo: nunca se anulan dos trayectorias distintas.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const c={console,Intl,URL,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(c);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`var currentUser=null,supabaseClient=null;S.tenant='uc';S.ramos=[];
 const prueba=(id,fecha,nota)=>({id:'c-'+id,nombre:'Prueba '+id,peso:25,directNota:true,notas:[{id:'n-'+id,nombre:'Prueba '+id,valor:nota,fecha,peso:1}]});
 const ramo=(id,nombre,sigla,notas,fechas)=>({id,nombre,sigla,creditos:10,gates:[],categorias:notas.map((n,i)=>prueba(id+i,fechas[i],n))});
 const fechasA=['2026-09-01','2026-09-08','2026-09-22','2026-10-01'];
 const fechasB=['2026-09-15','2026-09-25','2026-10-01','2026-10-08'];
 globalThis.al={id:'ejemplo',tenant:'uc',nombre_visible:'Alumno de ejemplo',desde:'2026-09-10',inicio_ramos:{a:'2026-09-15',b:'2026-10-01'},ramos:[ramo('a','Álgebra sintética','TST101',[3,3,5,5],fechasA),ramo('b','Física sintética','TST102',[5,5,3,3],fechasB)]};
 globalThis.comp=(_al,r)=>({ramo:{promedio:4,personas:6},evaluaciones:r.categorias.map(cat=>({clave:claveEvaluacionPanel(cat.notas[0].nombre),promedio:4,personas:6})),categorias:[]});`);

test('percentiles por evaluación y cambio; sin SQL no hay cero inventado',async()=>{
 run(`al.percentiles=al.ramos.flatMap(r=>r.categorias.map((c,i)=>({ramo_id:r.id,nota_id:c.notas[0].id,ramo:{personas:5,percentil:i<2?35:60},seccion:{personas:4,percentil:80}})));`);
 const m=run('metricasAlumnoRamoPanel(al,al.ramos[0],comp)'),p=run('resumenPercentilesPanel(metricasAlumnoRamoPanel(al,al.ramos[0],comp))');
 assert.equal(p.antes,35);assert.equal(p.ahora,60);assert.equal(p.cambio,25);assert(m.evaluaciones.every(e=>e.percentil!==null));
 assert.equal(run('percentilEvaluacionPanel(al,al.ramos[0],al.ramos[0].categorias[0].notas[0].id,{seccion:1})'),null);
 assert(run('percentilesPanelHTML(resumenPercentilesPanel(metricasAlumnoRamoPanel(al,al.ramos[0],comp)))').includes('ah-sube'));
 const csv=run('csvResumenAlumnosPanel([al],comp)').split('\r\n').map(l=>l.split(';'));assert.deepEqual(csv[1].slice(-3),['35','60','25']);
 await run("cargarPercentilesPanel(al,async()=>({error:{code:'PGRST202'}}))");assert.equal(run('resumenPercentilesPanel(metricasAlumnoRamoPanel(al,al.ramos[0],comp)).cambio'),null);
});
