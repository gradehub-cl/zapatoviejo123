// Marcar evaluaciones por ramo: sugerencia por fecha, solo se guardan las filas
// cambiadas y una falla no detiene a las demás. Datos sintéticos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodo=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return nodo()},querySelectorAll(){return []},dataset:{}});
const ctx={console,setTimeout,clearTimeout,Intl,URL,window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})},
 document:{getElementById:nodo,createElement:nodo,addEventListener(){},documentElement:nodo(),body:nodo(),querySelector:()=>null,querySelectorAll:()=>[]},
 navigator:{},location:{origin:'',pathname:'/',search:'',hash:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},history:{replaceState(){}}};
vm.createContext(ctx);
for(const f of ['data.js','engine.js','app.js','marketplace.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
run('S=normalize({tenant:"uc",tipoCuenta:"profesor",ramos:[],historial:[]});currentUser={id:"profe-sintetico"};');
const ev=(id,nombre,fecha,nota=5)=>({cat_id:'c'+id,nota_id:id,nombre,categoria:nombre,fecha,nota});
const ramo={id:'r1',nombre:'Ramo sintético',sigla:'TST100',origen:null,creditos:10,gates:[],categorias:[]};
const al=(id,pre,extra={})=>({id,nombre_visible:'Alumno '+id,tenant:'uc',desde:'2026-09-01T12:00:00Z',inicio_ramos:{r1:'2026-09-15'},ramos:[{...ramo}],preparacion:{ramos:[{ramo_id:'r1',...pre}]},...extra});
const evs=[ev('i1','I1','2026-09-01'),ev('i2','I2','2026-10-01'),ev('i3','I3','2026-10-20',null),{cat_id:'cx',numero:1,nota_id:null,nombre:'Examen',categoria:'Examen',fecha:'2026-12-01',nota:null},{...ev('amb','Ambigua','2026-10-02'),ambigua:true}];
ctx.__a=[al('b',{manual:true,marcas:[{nota_id:'i1'},{nota_id:'vieja',huerfana:true,nombre:'Vieja'}],evaluaciones:evs}),al('a',{manual:false,marcas:[],evaluaciones:evs})];
run(`globalThis.__clave=identidadResumenRamoPanel(__a[0],ramoParaPanel(__a[0].ramos[0]),__a[0].ramos[0]).clave;globalThis.__m=modeloMarcarPanel(__a,__clave);`);
const sel=i=>run(`[...__m.filas[${i}].seleccion].sort().join()`);
assert.equal(run('__m.filas.map(f=>f.al.id).join()'),'a,b','por nombre');
assert.equal(run('__m.columnas.map(c=>c.nombre).join()'),'I1,I2,I3,Examen','por fecha y sin la ambigua');
assert.equal(sel(0),'i2','por fecha sugiere lo que tiene nota desde el inicio');
assert.equal(sel(1),'i1','lo marcado se respeta');
assert.equal(run('filasCambiadasMarcar(__m).length'),0,'abrir no cambia el método de nadie');
run('marcarCeldaPanel(__m.filas[0],__m.columnas[0],true)');assert.equal(run('filasCambiadasMarcar(__m).length'),1);
run('marcarCeldaPanel(__m.filas[0],__m.columnas[0],false)');assert.equal(run('filasCambiadasMarcar(__m).length'),0,'tocar y deshacer no cuenta');
run('__m.filas[0].aceptada=true');assert.equal(run('filasCambiadasMarcar(__m).length'),1,'aceptar lo sugerido sí cambia el método');
run('marcarCeldaPanel(__m.filas[1],__m.columnas[3],true)');
assert.equal(run('JSON.stringify(marcasDeFilaPanel(__m.filas[1]))'),JSON.stringify([{nota_id:'i1'},{cat_id:'cx',numero:1},{nota_id:'vieja',huerfana:true,nombre:'Vieja'}]),'casilla sin nota por categoría y número, y la huérfana se conserva');
const html=run('marcarRamoHTML(__m)');
assert.match(html,/Lo que quede sin marcar cuenta como sin clases/);assert.match(html,/Aceptar lo sugerido en 1 alumno/);
assert.match(html,/data-marcar-celda="0:0"/);assert.doesNotMatch(html,/Ambigua/);
assert.match(run('estadisticasAlumnosHTML({pares:[],metodo:"fecha",hayPercentil:false},estadoEstadisticasPanel())'),/Todavía no hay|Marcar por ramo/);
(async()=>{
  // Una fila falla, la otra se guarda, y la que falló queda pendiente.
  ctx.__llamadas=[];ctx.__rpc=async(n,a)=>{ctx.__llamadas.push(a.p_id);if(a.p_id==='a')return {data:null,error:{message:'falla sintética'}};return {data:{ramos:[{ramo_id:'r1',manual:true,marcas:a.p_marcas,evaluaciones:evs}]},error:null};};
  ctx.__a.forEach(a=>{a.id=a.id;});
  const r=await run('guardarMarcasPanel(__m,__rpc,()=>true)');
  assert.equal(`${r.guardadas}/${r.total}`,'1/2');
  assert.equal(run('filasCambiadasMarcar(__m).map(f=>f.al.id).join()'),'a','lo que falló sigue pendiente');
  assert.equal(run('__m.filas[0].manual'),false,'sin guardar no cambia de método');
  console.log('PASS marcar por ramo: sugerencia, filas cambiadas, huérfanas y fallas parciales');
})().catch(e=>{console.error(e);process.exitCode=1;});
