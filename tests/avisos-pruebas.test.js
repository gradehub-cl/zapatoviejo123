// Avisos antes de una evaluación (app iOS, #645), versión sin servidor:
// notificaciones locales por fase y la Actividad en Vivo dentro de las 8 horas
// previas. Opt-in por dispositivo. En la web no corre nada. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto(nativa,{permiso='granted'}={}){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const ids={};const porId=id=>ids[id]||(ids[id]=el());
  const almacen=new Map();
  const reg={programadas:[],canceladas:[],actividades:[],pendientes:[],pidioPermiso:0};
  const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})};
  if(nativa)window.Capacitor={isNativePlatform:()=>true,
    registerPlugin:()=>({guardarResumen:()=>Promise.resolve(),borrarResumen:()=>Promise.resolve(),
      sincronizarActividades:o=>{reg.actividades.push(o.actividades);return Promise.resolve();}}),
    Plugins:{LocalNotifications:{
      getPending:async()=>({notifications:reg.pendientes}),
      cancel:async o=>{reg.canceladas.push(...o.notifications.map(n=>n.id));reg.pendientes=reg.pendientes.filter(n=>!o.notifications.some(x=>x.id===n.id));},
      checkPermissions:async()=>({display:permiso}),
      requestPermissions:async()=>{reg.pidioPermiso++;return {display:permiso};},
      schedule:async o=>{reg.programadas.push(...o.notifications);reg.pendientes.push(...o.notifications);},
    }}};
  const ctx={window,document:{getElementById:porId,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:k=>almacen.has(k)?almacen.get(k):null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)},
    navigator:{},location:{origin:'',pathname:'/',hash:''},setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  const run=c=>vm.runInContext(c,ctx);
  run(`syncToCloud=function(){};track=function(){};S.tenant='uc';S.onboardingDone=true;S.ramos=normalize({ramos:[
    {id:'a',nombre:'Cálculo Sintético',color:'#7F77DD',gates:[],categorias:[
      {id:'i2',nombre:'Interrogación 2',peso:30,fecha:'2026-10-07',hora:'17:30',notas:[]},
      {id:'sin',nombre:'Tarea sin hora',peso:20,fecha:'2026-10-07',notas:[]},
      {id:'ex',nombre:'Examen',peso:50,fecha:'2026-10-20',hora:'08:20',notas:[]}]},
    {id:'b',nombre:'Física Sintética',color:'#1D9E75',gates:[],categorias:[
      {id:'c1',nombre:'Control 1',peso:50,fecha:'2026-10-01',hora:'10:00',notas:[]},
      {id:'c2',nombre:'Control 2',peso:50,fecha:'2026-10-07',hora:'12:00',notas:[{id:'y',valor:5}]}]}
  ]}).ramos;`);
  return {run,reg,porId,almacen};
}
const AHORA='new Date(2026,9,7,12,0)';

console.log('=== Qué evaluaciones cuentan ===');
const a=contexto(true);
const lista=a.run(`pruebasConHora(${AHORA},14).map(p=>p.evaluacion+'@'+p.inicio.getHours()+':'+p.inicio.getMinutes()+'-'+p.fin.getHours())`);
chk('solo las pendientes con hora, desde ahora y dentro de 14 días',lista.join()==='Interrogación 2@17:30-19,Examen@8:20-10');
chk('sin hora no hay aviso',!lista.some(x=>/Tarea sin hora/.test(x)));
chk('lo que ya pasó o ya tiene nota no cuenta',!lista.some(x=>/Control/.test(x)));

console.log('\n=== Los avisos de cada fase ===');
const avisos=a.run(`avisosDePrueba(pruebasConHora(${AHORA},14)[0],${AHORA}).map(x=>({h:x.at.getHours()+':'+String(x.at.getMinutes()).padStart(2,'0'),t:x.titulo,u:x.url,id:x.id}))`);
chk('30, 15 y 10 minutos antes, y al terminar',avisos.map(x=>x.h).join()==='17:00,17:15,17:20,19:30');
chk('último repaso, baño y agua, caminar a la sala, cómo te fue',/Último repaso/.test(avisos[0].t)&&/baño/.test(avisos[1].t)&&/Camina a tu sala/.test(avisos[2].t)&&/Cómo crees que te fue/.test(avisos[3].t));
chk('"cómo te fue" abre el simulador del ramo; el resto, el ramo',avisos[3].u==='cl.gradehub.app://simular/a'&&avisos[0].u==='cl.gradehub.app://ramo/a');
chk('los identificadores son estables y distintos',new Set(avisos.map(x=>x.id)).size===4&&avisos.every(x=>Number.isInteger(x.id)&&x.id>0&&x.id<2**31));
chk('lo que ya pasó no se programa',a.run(`avisosDePrueba(pruebasConHora(${AHORA},14)[0],new Date(2026,9,7,17,16)).length`)===2);
chk('con sala, dice cuál',a.run(`avisosDePrueba({...pruebasConHora(${AHORA},14)[0],sala:'B12'},${AHORA})[2].titulo`)==='Camina a la sala B12');

console.log('\n=== Opt-in: sin activar no se programa nada ===');
(async()=>{
  await a.run(`programarAvisosPruebas(${AHORA})`);
  chk('sin activar, cero avisos',a.reg.programadas.length===0);
  a.run(`sincronizarActividadesPrueba(${AHORA})`);
  chk('y ninguna Actividad en Vivo',a.reg.actividades.pop().length===0);
  chk('el botón aparece solo en la app',a.run('avisosPruebasDisponibles()')===true);

  console.log('\n=== Activar ===');
  await a.run('alternarAvisosPruebas()');
  chk('pide el permiso en ese momento',a.reg.pidioPermiso===1);
  chk('queda activo solo en este dispositivo, fuera de S',a.almacen.get('gradehub_avisos_pruebas')==='1'&&!/avisos/.test(a.run('JSON.stringify(S)')));
  a.reg.programadas.length=0;a.reg.actividades.length=0;
  await a.run(`programarAvisosPruebas(${AHORA})`);
  chk('programa los avisos de las dos evaluaciones',a.reg.programadas.length===8);
  chk('cada aviso va marcado como de GradeHub',a.reg.programadas.every(n=>n.extra.gradehub==='prueba'&&/^cl\.gradehub\.app:\/\//.test(n.extra.url)));
  const antes=a.reg.programadas.length;
  await a.run(`programarAvisosPruebas(${AHORA})`);
  chk('reprogramar no duplica: cancela los anteriores',a.reg.canceladas.length>=antes&&a.reg.pendientes.length===8);
  a.run(`sincronizarActividadesPrueba(${AHORA})`);
  const act=a.reg.actividades.pop();
  chk('la Actividad en Vivo solo para lo que empieza dentro de 8 horas',act.length===1&&act[0].evaluacion==='Interrogación 2');
  chk('no lleva notas, solo qué evaluación, dónde y cuándo',!('necesitas' in act[0])&&typeof act[0].inicio==='number'&&act[0].fin-act[0].inicio===120*6e4);

  console.log('\n=== Desactivar y cerrar sesión ===');
  await a.run('alternarAvisosPruebas()');
  chk('desactivar cancela todo',a.reg.pendientes.length===0&&!a.almacen.has('gradehub_avisos_pruebas'));
  await a.run('alternarAvisosPruebas()');
  await a.run(`programarAvisosPruebas(${AHORA})`);
  a.run('borrarResumenWidgets()');
  await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
  chk('cerrar sesión termina las Actividades y cancela los avisos',a.reg.actividades.pop().length===0&&a.reg.pendientes.length===0);

  console.log('\n=== Sin permiso ===');
  const b=contexto(true,{permiso:'denied'});
  await b.run('alternarAvisosPruebas()');
  chk('no se activa y dice dónde permitirlo',!b.almacen.has('gradehub_avisos_pruebas')&&/Ajustes del iPhone/.test(b.porId('s-avisos-estado').textContent));

  console.log('\n=== En la web no hay nada de esto ===');
  const w=contexto(false);
  chk('sin plugin de notificaciones',w.run('avisosPruebasDisponibles()')===false);
  chk('activar no hace nada',(await w.run('alternarAvisosPruebas()'))===false&&!w.almacen.has('gradehub_avisos_pruebas'));
  chk('Ajustes solo muestra la opción si hay notificaciones (la app)',/\$\{avisosPruebasDisponibles\(\)\?`[\s\S]{0,200}Avisos antes de tus evaluaciones/.test(leer('app.js')));

  console.log('\n=== Tocar el aviso ===');
  a.run(`globalThis.__abierto=[];openRamo=id=>__abierto.push('ramo:'+id);openSimuladorModal=()=>__abierto.push('simulador');`);
  chk('"cómo te fue" abre el ramo y su simulador',a.run(`abrirEnlaceWidget('cl.gradehub.app://simular/a')`)===true&&a.run('__abierto.join()')==='ramo:a,simulador');
  chk('app-session escucha los toques en los avisos de GradeHub',/localNotificationActionPerformed[\s\S]{0,200}gradehub==='prueba'/.test(leer('app-session.js')));

  console.log('\n=== Lado nativo ===');
  const plugin=leer('ios/App/App/WidgetsPlugin.swift'),widgets=leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift');
  chk('el plugin inicia y termina Actividades en Vivo',/sincronizarActividades/.test(plugin)&&/Activity\.request/.test(plugin)&&/\.end\(/.test(plugin));
  chk('la extensión dibuja la Actividad y la isla dinámica',/ActivityConfiguration\(for: ActividadPruebaAtributos\.self\)/.test(widgets)&&/DynamicIsland/.test(widgets));
  chk('al empezar la prueba pasa a "Suerte" sola',/isStale/.test(widgets)&&/staleDate: estado\.inicio/.test(plugin));
  chk('la app declara que usa Actividades en Vivo',/NSSupportsLiveActivities/.test(leer('ios/App/App/Info.plist')));
  chk('el modelo compartido está en los dos targets',(leer('ios/App/App.xcodeproj/project.pbxproj').match(/ActividadPrueba\.swift in Sources \*\/ = /g)||[]).length===2);

  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
