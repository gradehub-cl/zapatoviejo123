// Eliminar la cuenta (#665, guía 5.1.1(v) de App Review): después del borrado en
// la nube no puede quedar ninguna copia de las notas en el dispositivo, ni en
// los widgets, Actividades o avisos del iPhone. Antes quedaba la base de
// sincronización y no se llamaba a la limpieza nativa. Si el borrado remoto
// falla, no se toca nada: la persona conserva sus notas y puede reintentar.
// Cuenta, ramo y nota sintéticos; el cliente de Supabase es un doble.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const leer=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const fuente=['data.js','engine.js','app.js','app-session.js'].map(leer).join('\n');
const UID='11111111-1111-4111-8111-111111111111';
const MARCA='ramo-sintetico-borrado';

function arnes({fallaRemoto=false}={}){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const copia=JSON.stringify({ramos:[{id:MARCA,nombre:'Curso sintético',categorias:[{id:'c',nombre:'Prueba',peso:100,notas:[{id:'n',valor:5.5}]}]}],onboardingDone:true});
  const almacen=new Map([['gradehub_v1',copia],['gradehub_cache_owner',UID],['gradehub_v1_base',copia],
    ['gradehub_v1_pre_import',copia],['gradehub_curso_siglas','["SYN100"]'],['gradehub_v1_respaldo_'+UID,copia],
    // Preferencia del dispositivo, no de la cuenta: tiene que sobrevivir.
    ['gradehub_canvas_avisos_leidos_'+UID,'[]'],['gradehub_sombras','0']]);
  const nativo={borrar:0,actividades:[],cancelados:[],rpc:[],salidas:0,recargas:0,subidas:0,canvas:[]};
  const timers=new Map();let nTimer=0;
  const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}}),
    Capacitor:{isNativePlatform:()=>true,Plugins:{
      // El token de Canvas de la cuenta sale del llavero (auditoría App Store #1193).
      GradeHubCanvas:{desconectar(o){nativo.canvas.push(o.cuenta);return Promise.resolve({conectado:false});},estado:()=>Promise.resolve({conectado:true})},
      GradeHubWidgets:{guardarResumen:()=>Promise.resolve(),borrarResumen(){nativo.borrar++;return Promise.resolve();},
        sincronizarActividades(o){nativo.actividades.push(o.actividades);return Promise.resolve();}},
      LocalNotifications:{getPending:()=>Promise.resolve({notifications:[{id:7,extra:{gradehub:'prueba'}},{id:8,extra:{}}]}),
        cancel(o){nativo.cancelados.push(...o.notifications.map(n=>n.id));return Promise.resolve();}}}}};
  const ctx={window,document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'',pathname:'/',hash:'',reload(){nativo.recargas++;}},
    setTimeout:f=>{timers.set(++nTimer,f);return nTimer;},clearTimeout:id=>{timers.delete(id);},console:{...console,warn(){}},URL};
  vm.createContext(ctx);vm.runInContext(fuente,ctx);
  ctx.__cliente={rpc:async nombre=>{nativo.rpc.push(nombre);return {error:fallaRemoto?{message:'sintético'}:null};},
    auth:{signOut:async()=>{nativo.salidas++;return {error:null};}}};
  ctx.__nativo=nativo;
  const run=c=>vm.runInContext(c,ctx);
  run(`supabaseClient=__cliente;currentUser={id:'${UID}'};showToast=()=>{};showAuthScreen=()=>{};closeModal=()=>{};track=()=>{};
    syncNow=()=>{__nativo.subidas++;};S.onboardingDone=true;S.ramos=normalize(JSON.parse(localStorage.getItem('gradehub_v1'))).ramos;`);
  return {run,almacen,nativo,correrTimers:()=>{const t=[...timers.values()];timers.clear();t.forEach(f=>f());}};
}
const conNotas=h=>[...h.almacen].filter(([,v])=>v.includes(MARCA)).map(([k])=>k);

(async()=>{
  const h=arnes();
  assert.equal(h.run('S.ramos.length'),1,'parte con el ramo sintético cargado');
  h.run('syncToCloud()');
  assert.notEqual(h.run('_syncTimer'),null,'hay una subida esperando');
  await h.run('eliminarCuenta()');
  await new Promise(r=>setImmediate(r)); // getPending → cancel
  assert.deepEqual(h.nativo.rpc,['eliminar_mi_cuenta']);
  assert.deepEqual(conNotas(h),[],'ninguna clave local conserva las notas');
  for(const k of ['gradehub_v1','gradehub_cache_owner','gradehub_v1_base','gradehub_v1_pre_import','gradehub_curso_siglas','gradehub_v1_respaldo_'+UID,'gradehub_canvas_avisos_leidos_'+UID])
    assert.equal(h.almacen.has(k),false,k+' se borra');
  assert.equal(h.almacen.get('gradehub_sombras'),'0','una preferencia del dispositivo no se toca');
  assert.equal(h.nativo.borrar,1,'se borra el resumen de los widgets');
  assert.deepEqual(h.nativo.canvas,[UID],'se borra el token de Canvas de esa cuenta, y solo de esa');
  assert.equal(JSON.stringify(h.nativo.actividades),'[[]]','no quedan Actividades en Vivo');
  assert.deepEqual(h.nativo.cancelados,[7],'se cancelan los avisos de pruebas y solo esos');
  assert.equal(h.nativo.salidas,1,'cierra la sesión');
  assert.equal(h.run('currentUser'),null);
  assert.equal(h.run('S.ramos.length'),0,'tampoco quedan en memoria');
  assert.equal(h.run('_syncTimer'),null);
  h.correrTimers();
  assert.equal(h.nativo.subidas,0,'la subida pendiente no corre contra la cuenta borrada');
  assert.equal(h.nativo.recargas,1,'recarga para volver a la entrada');

  const f=arnes({fallaRemoto:true});
  const antes=JSON.stringify([...f.almacen]);
  await f.run('eliminarCuenta()');
  assert.equal(JSON.stringify([...f.almacen]),antes,'si la nube falla, la copia local queda intacta');
  assert.equal(f.nativo.borrar,0,'y los widgets también');
  assert.deepEqual(f.nativo.canvas,[],'y el token de Canvas sigue en el llavero');
  assert.equal(f.nativo.salidas,0);
  assert.equal(f.run('currentUser.id'),UID,'sigue con su sesión para reintentar');
  assert.equal(f.run('S.ramos.length'),1);
  f.correrTimers();
  assert.equal(f.nativo.recargas,0);
  console.log('OK: eliminar la cuenta limpia copias locales, widgets, Actividades y avisos; un fallo remoto no borra nada');
})().catch(e=>{console.error(e);process.exitCode=1;});
