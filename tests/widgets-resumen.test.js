// Widgets de la app iOS (#634): la app arma un resumen con el mismo motor de
// la interfaz y se lo pasa al plugin nativo. Los widgets no calculan. En la web
// no hay plugin y nada de esto corre. Todo sintético.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..');
const leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto(nativa){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const llamadas={guardar:[],borrar:0,registrado:null};
  const window={addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})};
  if(nativa)window.Capacitor={isNativePlatform:()=>true,Plugins:{},registerPlugin(nombre){llamadas.registrado=nombre;return {
    guardarResumen(o){llamadas.guardar.push(o);return Promise.resolve();},borrarResumen(){llamadas.borrar++;return Promise.resolve();}};}};
  const timers=[];
  const ctx={window,document:{getElementById:()=>el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem(){return null},setItem(){},removeItem(){}},navigator:{},location:{origin:'',pathname:'/',hash:''},
    setTimeout:(f)=>{timers.push(f);return timers.length;},clearTimeout:()=>{timers.length=0;},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  const run=c=>vm.runInContext(c,ctx);
  run('syncToCloud=function(){};');
  run(`S.tenant='uc';S.onboardingDone=true;S.ramos=normalize({ramos:[
    {id:'a',nombre:'Cálculo Sintético',color:'#7F77DD',gates:[],categorias:[
      {id:'i1',nombre:'Interrogación 1',peso:30,notas:[{id:'x',valor:4.2}]},
      {id:'i2',nombre:'Interrogación 2',peso:30,fecha:'2026-10-08',notas:[]},
      {id:'ex',nombre:'Examen',peso:40,fecha:'2026-12-01',notas:[]}]},
    {id:'b',nombre:'Física Sintética',color:'#1D9E75',gates:[],categorias:[
      {id:'c0',nombre:'Control 0',peso:20,fecha:'2026-09-01',notas:[]},
      {id:'c1',nombre:'Control 1',peso:40,notas:[{id:'y',valor:5.8}]},
      {id:'c2',nombre:'Control 2',peso:40,fecha:'2026-10-13',notas:[]}]}
  ]}).ramos;`);
  return {run,llamadas,correrTimers:()=>{const t=timers.splice(0);t.forEach(f=>f());}};
}

console.log('=== El resumen sale del mismo motor que la interfaz ===');
const a=contexto(false);
const r=a.run('resumenParaWidgets(new Date(2026,9,6,12))');
chk('versión 1 y fecha de actualización',r.version===1&&typeof r.actualizado==='string');
chk('el promedio general es el oficial de la interfaz',r.promedio.oficial===a.run('notaFinalOficial(gpa(S.ramos))')&&r.promedio.nivel===a.run('nivelNota(gpa(S.ramos))'));
chk('cada ramo con su nota oficial y su nivel',r.ramos.length===2&&r.ramos[0].promedio===a.run('notaFinalOficial(ramoAvg(S.ramos[0]))')&&r.ramos[0].nivel===a.run('nivelRamo(S.ramos[0],ramoAvg(S.ramos[0]))'));
chk('la agenda trae solo lo pendiente desde hoy, en orden',r.agenda.map(e=>e.evaluacion).join()==='Interrogación 2,Control 2,Examen');
chk('lo vencido no aparece',!r.agenda.some(e=>e.evaluacion==='Control 0'));
chk('la nota necesaria es la que muestra la app (redondeada hacia arriba)',r.agenda[0].necesitas===a.run('nfNecesaria(notaNecesaria(S.ramos[0]))'));
chk('lleva el color del ramo para su línea lateral',r.agenda[0].color==='#7F77DD');
chk('no lleva notas individuales ni nombres de personas',!JSON.stringify(r).includes('"valor"')&&!('userName' in r));

console.log('\n=== En la web no hay plugin ===');
a.run('publicarResumenWidgets();borrarResumenWidgets();');
a.correrTimers();
chk('no se registra ningún plugin ni se manda nada',a.run('pluginWidgets()')===null);

console.log('\n=== En la app se manda al plugin ===');
const b=contexto(true);
b.run('publicarResumenWidgets();publicarResumenWidgets();publicarResumenWidgets();');
b.correrTimers();
chk('usa el plugin GradeHubWidgets',b.llamadas.registrado==='GradeHubWidgets');
chk('varios guardados seguidos son un solo envío',b.llamadas.guardar.length===1);
chk('lo que se manda es el resumen en JSON',JSON.parse(b.llamadas.guardar[0].json).version===1);
b.run('save()');b.correrTimers();
chk('guardar en la app actualiza los widgets',b.llamadas.guardar.length===2);
b.run('S.onboardingDone=false;publicarResumenWidgets();');b.correrTimers();
chk('sin onboarding terminado se borra en vez de mandar',b.llamadas.borrar===1&&b.llamadas.guardar.length===2);
b.run('borrarResumenWidgets()');
chk('borrar al cerrar sesión llama al plugin',b.llamadas.borrar===2);
chk('cerrarSesion lo llama',/borrarResumenWidgets\(\)/.test(leer('app-session.js').slice(leer('app-session.js').indexOf('async function cerrarSesion'),leer('app-session.js').indexOf('async function cerrarSesion')+600)));

// Así llega de verdad en la app: sin @capacitor/core no hay registerPlugin, y el
// puente nativo deja el plugin en Capacitor.Plugins.
const c=contexto(false);
c.run(`window.Capacitor={isNativePlatform:()=>true,Plugins:{GradeHubWidgets:{guardarResumen(o){globalThis.__enviado=o;return Promise.resolve();},borrarResumen(){return Promise.resolve();}}}};_pluginWidgets=undefined;publicarResumenWidgets();`);
c.correrTimers();
chk('sin registerPlugin usa el plugin que deja el puente nativo',c.run('typeof __enviado')==='object'&&JSON.parse(c.run('__enviado.json')).version===1);

console.log('\n=== Tocar un widget abre la pantalla exacta ===');
b.run(`S.onboardingDone=true;globalThis.__abierto=null;openRamo=id=>{__abierto='ramo:'+id};showTab=t=>{__abierto='tab:'+t};`);
chk('ramo existente',b.run(`abrirEnlaceWidget('cl.gradehub.app://ramo/a')`)===true&&b.run('__abierto')==='ramo:a');
chk('la agenda',b.run(`abrirEnlaceWidget('cl.gradehub.app://agenda')`)===true&&b.run('__abierto')==='tab:agenda');
chk('un ramo que ya no existe deja en Inicio',b.run(`abrirEnlaceWidget('cl.gradehub.app://ramo/zz')`)===false&&b.run('__abierto')==='tab:home');
b.run(`__abierto=null`);
chk('otro esquema o la vuelta del login no se tocan',b.run(`abrirEnlaceWidget('https://gradehub.cl/ramo/a')`)===false&&b.run(`abrirEnlaceWidget('cl.gradehub.app://login-callback?code=x')`)===false&&b.run('__abierto')===null);

console.log('\n=== El lado nativo está en el proyecto ===');
const pbx=leer('ios/App/App.xcodeproj/project.pbxproj');
chk('la extensión de widgets es un target y va embebida en la app',/productType = "com.apple.product-type.app-extension"/.test(pbx)&&/Embed Foundation Extensions/.test(pbx));
chk('app y widget comparten el mismo App Group',['ios/App/App/App.entitlements','ios/App/GradeHubWidgets/GradeHubWidgets.entitlements'].every(f=>/group\.cl\.gradehub\.app/.test(leer(f))));
chk('el plugin y el widget usan el mismo grupo y clave',/"group\.cl\.gradehub\.app"/.test(leer('ios/App/App/WidgetsPlugin.swift'))&&/"resumen\.v1"/.test(leer('ios/App/App/WidgetsPlugin.swift'))&&/"resumen\.v1"/.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));
chk('el widget no calcula notas: no hay promedios ni ponderaciones en Swift',!/\bpeso\b|ponderad|ramoAvg|\.reduce\(/i.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));
chk('la nota en el widget es privada en la pantalla de bloqueo',/privacySensitive/.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
