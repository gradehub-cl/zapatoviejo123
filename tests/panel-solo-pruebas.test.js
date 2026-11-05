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

test('pruebas y laboratorio: referencia separada del oficial, con compuerta y pendientes',()=>{
 run(`var propio={id:'propio',nombre:'Pauta propia',sigla:'SYN100',categorias:[{id:'pr',nombre:'Pruebas propias',tipoEvaluacion:'prueba',peso:60,directNota:true,slots:2,notas:[{id:'n1',nombre:'P1',slot:0,valor:3,fecha:'2026-09-01'},{id:'n2',nombre:'P2',slot:1,valor:5,fecha:'2026-10-01'}]},{id:'lab',nombre:'Laboratorio propio',tipoEvaluacion:'laboratorio',peso:40,notas:[{id:'nl',nombre:'L1',valor:7,fecha:'2026-10-02'}]},{id:'pend',nombre:'Pendiente',peso:0,notas:[]}],gates:[{type:'min_grade_required',catId:'pr',min:4.5,cap:3.9}]};var estudiante={id:'a',tenant:'uc',nombre_visible:'Alumno sintético',inicio:'2026-09-15',ramos:[propio]};`);
 const original=run('JSON.stringify(propio)'),oficial=run('ramoAvg(ramoParaPanel(propio))');assert.equal(oficial,3.9);
 assert.equal(run('promedioPruebasPanel(propio).promedio'),4);assert.equal(run('promedioPruebasPanel(propio).sinClasificar'),1);
 run('estudiante.soloPruebasPanel=true');const met=run('metricasAlumnoPanel(estudiante,()=>null)');assert.equal(met.evaluaciones.length,2);assert(!met.evaluaciones.some(e=>e.id==='nl'));assert.equal(met.cambio,null,'mínimos se aplican por fila también con filtro');
 const html=run('ramoAlumnoEditorialHTML(estudiante,propio,null,null,false,new Date(2026,10,4))');assert(html.includes('Promedio actual</span><strong>3,9'));assert(!html.includes('Referencia de pruebas'));assert(html.includes('L1'),'la ficha aprobada abre el ramo completo, aunque Estadísticas filtre pruebas');
 assert.equal(run('JSON.stringify(propio)'),original);assert.equal(run('ramoAvg(ramoParaPanel(propio))'),oficial);
 run('estudiante.soloPruebasPanel=false');assert.equal(run('metricasAlumnoPanel(estudiante,()=>null).evaluaciones.length'),3);
});
test('tipo explícito del catálogo en ramos existentes; no se infiere de nombre en uno manual',()=>{
 run(`var existente={id:'e',nombre:'Cálculo II',sigla:'MAT1620',origen:{tenant:'uc',ramoKey:'Cálculo II'},categorias:[{id:'p',nombre:'Interrogación 1',peso:60,notas:[{id:'np',valor:4}]},{id:'l',nombre:'Laboratorio',peso:40,notas:[{id:'nl',valor:7}]}]}`);
 assert.equal(run('promedioPruebasPanel(existente).promedio'),4);assert.equal(run('promedioPruebasPanel({...existente,origen:null}).promedio'),null);
});
