// Rutas de estudiante cerradas para profesor puro. Datos inventados.
const fs=require('fs'),path=require('path'),vm=require('vm');
const assert=require('assert');
const root=path.join(__dirname,'..');
const source=['data.js','engine.js','app.js','render-agenda.js','marketplace.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const node=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false;}},
  addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},remove(){},querySelector(){return null;},querySelectorAll(){return [];},
  value:'',innerHTML:'',textContent:'',dataset:{}});
function setup(tipoCuenta){
  const calls=[];const timers=[];const store={gradehub_avisos_pruebas:'1'};
  const plugin={guardarResumen(){calls.push('widget');return Promise.resolve();},borrarResumen(){calls.push('widget-clear');return Promise.resolve();},
    sincronizarActividades(o){calls.push('activity:'+o.actividades.length);return Promise.resolve();}};
  const notifications={getPending:async()=>({notifications:[]}),checkPermissions:async()=>({display:'granted'}),schedule:async()=>{calls.push('notification');}};
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){}}),
    Capacitor:{isNativePlatform:()=>true,Plugins:{GradeHubWidgets:plugin,LocalNotifications:notifications}}},
    document:{getElementById:node,createElement:node,addEventListener(){},documentElement:node(),body:node(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},console};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const run=s=>vm.runInContext(s,ctx);
  ctx.__fake={rpc:async name=>{calls.push('rpc:'+name);return {data:[],error:null};}};
  ctx.__student={tenant:'uc',onboardingDone:true,ramos:[{id:'synthetic',nombre:'Ramo de prueba',sigla:'TST1000',
    color:'#123456',gates:[],categorias:[{id:'c',nombre:'Prueba',peso:100,notas:[{id:'n',nombre:'Nota',valor:5,peso:1}]}]}]};
  run(`supabaseClient=__fake;currentUser={id:'usuario-sintetico'};S=JSON.parse(JSON.stringify(__student));`);
  ctx.__ads=()=>{calls.push('recommendation');return Promise.resolve([]);};
  run('cargarAnunciosClases=__ads;');
  if(tipoCuenta)run(`S.tipoCuenta=${JSON.stringify(tipoCuenta)};`);
  return {calls,timers,run};
}
async function exercise(tipo){
  const t=setup(tipo);const {run,calls}=t;
  await run('subirNotasCurso()');
  await run('cargarPosicionesCurso()');
  await run('cargarConsenso()');
  await run('consensoParaRamo(S.ramos[0])');
  await run('aplicarConsensoAuto()');
  run('consensoAlAgregar(S.ramos[0])');
  run('ponerConsensoEnRamo(S.ramos[0],[])');
  run('cargarAnunciosRecomendacion(S.tenant,()=>{})');
  run('pintarRecomendacionClase({querySelectorAll(){return []}})');
  run('publicarResumenWidgets()');
  for(const f of t.timers.splice(0))f();
  await run('programarAvisosPruebas(new Date(2026,9,17))');
  run('sincronizarActividadesPrueba(new Date(2026,9,17))');
  return calls;
}
(async()=>{
  const teacher=await exercise('profesor');
  assert(!teacher.some(c=>c==='rpc:curso_nota_set'||c==='rpc:curso_posicion'||c==='rpc:catalog_consensus_periodo'||c==='widget'||c==='notification'||c.startsWith('activity:')&&c!=='activity:0'),teacher.join(','));
  assert(teacher.includes('widget-clear'),'el iPhone limpia el widget anterior');
  for(const kind of [undefined,'estudiante']){
    const student=await exercise(kind);
    assert(student.includes('rpc:curso_nota_set'),`subida de estudiante ${kind}`);
    assert(student.includes('rpc:curso_posicion'),`posición de estudiante ${kind}`);
    assert(student.includes('rpc:catalog_consensus_periodo'),`consenso de estudiante ${kind}`);
    assert(student.includes('widget'),`widget de estudiante ${kind}`);
    assert(student.includes('recommendation'),`recomendación de estudiante ${kind}`);
  }
  const sql=fs.readFileSync(path.join(root,'supabase/curso_posicion.sql'),'utf8')+
    fs.readFileSync(path.join(root,'supabase/universidad_posicion.sql'),'utf8');
  assert((sql.match(/ur\.data->>'tipoCuenta' = 'profesor'/g)||[]).length>=5,
    'las RPC filtran filas antiguas de profesores');
  console.log('PASS profesor-sin-estudiante: profesor puro aislado; estudiantes antiguos y mixtos siguen activos');
})().catch(e=>{console.error(e);process.exitCode=1;});
