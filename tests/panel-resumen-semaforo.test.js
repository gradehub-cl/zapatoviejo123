// Resumen de Alumnos: «Cómo van» y el día con que parte la agenda.
// Pautas escritas acá y alumnos sintéticos; nada sale del catálogo.
const test=require('node:test');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},remove(){},value:'',innerHTML:'',textContent:'',dataset:{}});
const ctx={console,setTimeout,clearTimeout,Intl,URL,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'https://example.invalid',pathname:'/',hash:''}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run(`var supabaseClient=null,currentUser=null;
  S=normalize({tenant:'uc',tipoCuenta:'profesor',ramos:[],historial:[]});
  globalThis.__ev=(id,nombre,fecha,valor)=>({id:'c'+id,nombre,peso:50,fecha,notas:valor==null?[]:[{id:'n'+id,nombre,valor}]});
  globalThis.__ramo=(id,previa,fecha)=>({id:'r'+id,nombre:'Ramo '+id,sigla:'TST'+id,gates:[],categorias:[__ev(id+'1','Prueba 1','2026-10-01',previa),__ev(id+'2','Prueba 2',fecha,null)]});
  globalThis.__al=(id,ramos)=>({id,nombre_visible:'Sintético '+id,tenant:'uc',ramos});
  // Cuatro casos en tres alumnos: uno con dos ramos y uno que ya no comparte ninguno.
  globalThis.__grupo=[__al('a',[__ramo('a',6.5,'2026-10-24'),__ramo('x',2.0,'2026-10-24')]),__al('b',[__ramo('b',4.2,'2026-10-27')]),__al('c',[__ramo('c',null,'2026-10-27')]),__al('d',[])];
  globalThis.__hoy=new Date(2026,9,22,10);
  globalThis.__datos=datosResumenAlumnosPanel(__grupo,filasListaPanel(__grupo,__hoy),__hoy);`);

test('el semáforo cuenta un caso por alumno y ramo, con el nivel del motor',()=>{
  const {niveles}=run('alcanceResumenAlumnosPanel(__datos)');
  const esperado={bad:0,warn:0,good:0,neutral:0};
  for(const v of [6.5,2.0,4.2])esperado[run(`nivelRamo(ramoParaPanel(__ramo('t',${v},'2026-10-27')),${v})`)]++;
  esperado.neutral++;
  assert.deepEqual({...niveles},esperado);
  assert.equal(niveles.bad,1,'el 2,0 va reprobando');
  assert.equal(niveles.neutral,1,'quien dejó de compartir ramos no es un caso; el ramo sin notas sí');
  assert.equal(niveles.bad+niveles.warn+niveles.good+niveles.neutral,4);
});

test('el filtro por ramo cambia el semáforo junto con el resto del alcance',()=>{
  const r=run(`alcanceResumenAlumnosPanel(__datos,{ramo:claveRamoResumenPanel(__grupo[0],__grupo[0].ramos[1])})`);
  assert.deepEqual({...r.niveles},{bad:1,warn:0,good:0,neutral:0});
});

test('«Cómo van» dice lo más urgente y cada tramo lleva palabra y cuenta',()=>{
  const html=run('resumenInicioAlumnosHTML(alcanceResumenAlumnosPanel(__datos))');
  assert.match(html,/<strong>1<\/strong> de 4 va reprobando/);
  assert.match(html,/4 ramos compartidos/);
  // El color no es lo único que distingue un tramo (HIG: Charts).
  for(const palabra of ['Reprobando','Al borde','Aprobando','Sin notas'])assert.match(html,new RegExp(`<li data-nivel="\\w+"[^>]*><b>\\d+</b> ${palabra}</li>`));
  assert.match(html,/class="ras-semaforo" aria-hidden="true"/,'la barra es decorativa: la leyenda trae los datos');
  assert.match(html,/class="ras-estado" data-nivel="bad">Reprobando/,'la fila de atención marca su estado');
  // Las tres cifras de siempre siguen ahí.
  for(const t of ['Alumnos conectados','Necesitan atención','Evaluaciones en 7 días'])assert(html.includes(t));
});

test('sin casos no hay tarjeta; solo sin notas, no se habla de reprobar',()=>{
  assert.equal(run('comoVanResumenHTML({bad:0,warn:0,good:0,neutral:0})'),'');
  const sinNotas=run('comoVanResumenHTML({bad:0,warn:0,good:0,neutral:3})');
  assert.match(sinNotas,/<strong>3<\/strong> de 3 siguen sin notas/);
  assert.doesNotMatch(sinNotas,/reprobando<\/p>/);
  assert.match(run('comoVanResumenHTML({bad:0,warn:0,good:2,neutral:1})'),/<strong>2<\/strong> de 3 van aprobando/);
});

test('la agenda parte en el primer día con evaluaciones, o en hoy',()=>{
  const dias=xs=>JSON.stringify(xs.map(n=>({evaluaciones:Array(n).fill(0)})));
  assert.equal(run(`diaInicialResumenPanel(${dias([0,0,3,1,0,0,0])})`),2);
  assert.equal(run(`diaInicialResumenPanel(${dias([2,0,3,0,0,0,0])})`),0,'con algo hoy, hoy');
  assert.equal(run(`diaInicialResumenPanel(${dias([0,0,0,0,0,0,0])})`),0,'semana vacía: hoy');
  // Con el grupo sintético hoy (22) no hay nada y lo primero es el 24.
  assert.equal(run('diaInicialResumenPanel(alcanceResumenAlumnosPanel(__datos).dias)'),2);
  assert.match(run('resumenInicioAlumnosHTML(alcanceResumenAlumnosPanel(__datos),{dia:1})'),/<h3>Mañana<\/h3>/);
});
