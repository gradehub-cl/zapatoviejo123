// Tamaños agregados: se muestran desde cinco, nunca se infieren ni se suman.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const c={console,Intl,URL,setTimeout,clearTimeout,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(c);for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`var currentUser=null,supabaseClient=null;S.tenant='uc';S.ramos=[];
 globalThis.r={id:'ramo-ejemplo',nombre:'Ramo sintético',sigla:'TST100',seccion:2,gates:[],categorias:[{id:'cat',nombre:'Pruebas',peso:100,slots:2,directNota:true,notas:[{id:'nota-a',nombre:'Prueba 1',slot:0,valor:5,fecha:'2026-09-01',peso:1},{id:'nota-b',nombre:'Prueba 2',slot:1,valor:6,fecha:'2026-10-01',peso:1}]}]};
 globalThis.al={id:'alumno-sintetico',nombre_visible:'Estudiante de ejemplo',tenant:'uc',desde:'2026-09-15',ramos:[r]};
 globalThis.comparacion=n=>({ramo:{promedio:4.5,personas:n},categorias:[{clave:'pruebas',promedio:4.5,personas:n}],evaluaciones:[{clave:'prueba 1',promedio:4.5,personas:n},{clave:'prueba 2',promedio:4.5,personas:n}]});`);

test('n de ramo, categoría y evaluación se ve desde cinco en ambas referencias',()=>{
 for(const n of [5,23]){c.__n=n;
  const texto='vs. '+n+' estudiantes en GradeHub';
  assert(run('ramoAlumnoEditorialHTML(al,r,comparacion(__n),comparacion(__n),false,new Date())').includes(texto));
  assert(run('evaluacionesPrivadasHTML(r,comparacion(__n),[r],new Date())').includes(texto));
  assert(run('barraUltimaPrivadaHTML(r,comparacion(__n))').includes(texto));
  assert(run('ramoPanelHTML(r,comparacion(__n))').includes(texto));
  assert(run('ramoAlumnoEditorialHTML(al,r,{...comparacion(__n),seccion:2},{...comparacion(__n),seccion:2},true,new Date())').includes(texto));
 }
 const html=run('ramoPanelHTML(r,{ramo:{promedio:4.5,personas:23},categorias:[{clave:"pruebas",promedio:4.5,personas:19}],evaluaciones:[{clave:"prueba 1",promedio:4.5,personas:7}]})');
 for(const n of [23,19,7])assert(html.includes('vs. '+n+' estudiantes en GradeHub'));
});

test('menos de cinco no filtra n ni el promedio en texto, aria, gráfica o CSV',()=>{
 for(const n of [0,1,4]){c.__n=n;
  const texto=run('ramoAlumnoEditorialHTML(al,r,comparacion(__n),comparacion(__n),false,new Date())');assert(!texto.includes('vs. '+n+' estudiantes'));assert(texto.includes('No disponible'));
  assert.equal(run('referenciaEvaluacionPrivada(r,r.categorias[0].notas[0],comparacion(__n))'),null);
  const eventos=run('evaluacionesConFechaPanel(r,comparacion(__n)).evaluaciones');assert(eventos.every(e=>e.curso===null&&e.cursoPersonas===null));
  assert(!run('comparacionTexto(4.5,__n)').includes('4.5'));
  const filas=run('csvResumenAlumnosPanel([al],()=>comparacion(__n),()=>comparacion(__n))').split('\r\n').map(l=>l.split(';'));
  assert.equal(filas[1][6],'');assert.equal(filas[1][7],'');assert.deepEqual(filas[1].slice(-2),['','']);
 }
});

test('sin SQL o con muestra desconocida no se rompe ni se inventa un cero',()=>{
 for(const ref of [null,{sinSQL:true},{errorCarga:true},{ramo:{promedio:4.5},evaluaciones:[],categorias:[]},{ramo:{promedio:4.5,personas:4.7}}]){c.__ref=ref;
  const html=run('ramoAlumnoEditorialHTML(al,r,__ref,__ref,false,new Date())');assert(!html.includes('undefined'));assert(!html.includes('NaN'));assert(!html.includes('vs. 0 estudiantes'));
  const filas=run('csvResumenAlumnosPanel([al],()=>__ref,null)').split('\r\n').map(l=>l.split(';'));assert.deepEqual(filas[1].slice(-2),['','']);
 }
});

test('CSV agrega las muestras al final sin mover columnas previas, con sección propia',()=>{
 const guardado=run('JSON.stringify(al)');
 for(const fn of ['csvAlumnosPanel','csvResumenAlumnosPanel']){
  const filas=run(fn+'([al],()=>comparacion(23),()=>({...comparacion(9),seccion:2}))').split('\r\n').map(l=>l.split(';'));
  const i=filas[0].indexOf('Estudiantes en GradeHub (ramo)');assert.deepEqual(filas[0].slice(i,i+2),['Estudiantes en GradeHub (ramo)','Estudiantes en GradeHub (sección)']);assert.deepEqual(filas[1].slice(i,i+2),['23','9']);assert.equal(filas[0][0],'Alumno');assert.equal(filas[0][1],'Ramo');
  const sin=run(fn+'([al],()=>comparacion(23),()=>comparacion(4))').split('\r\n')[1].split(';');assert.deepEqual(sin.slice(i,i+2),['23','']);
 }
 assert.equal(run('JSON.stringify(al)'),guardado);
});

test('los puntos y la tabla antes/después conservan la muestra específica de la evaluación',()=>{
 const met=run('metricasAlumnoPanel(al,()=>comparacion(23))');assert(met.evaluaciones.every(e=>e.cursoPersonas===23));c.__met=met;
 const html=run('antesAhoraAlumnoHTML(__met)');assert(html.includes('vs. 23 estudiantes en GradeHub'));
});
