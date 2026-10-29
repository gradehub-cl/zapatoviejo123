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
  vm.runInContext(['data.js','engine.js','app.js','render-agenda.js'].map(leer).join('\n'),ctx);
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
// Cálculo I (sintético): I1 = 4,2 (30%), I2 (30%) y Examen (40%) pendientes.
// Para ir con 4 tras la I2: (4,2·30 + x·30)/60 ≥ 3,95 → x ≥ 3,7.
chk('"para ir con 4" cuenta lo evaluado más esa evaluación, nada de lo que viene',r.agenda[0].necesitas==='3.7');
chk('no es el promedio que necesitas en todo lo pendiente',r.agenda[0].necesitas!==a.run('nfNecesaria(notaNecesaria(S.ramos[0]))'));
chk('en la última evaluación del ramo es la nota para cerrarlo con 4',
  a.run(`(()=>{const r=normalize({ramos:[{id:'u',nombre:'Última',color:'#000',gates:[],categorias:[
    {id:'p',nombre:'Prueba',peso:60,notas:[{id:'q',valor:5.0}]},{id:'f',nombre:'Final',peso:40,fecha:'2026-12-01',notas:[]}]}]}).ramos[0];
    const e={ramo:r,cat:r.categorias[1],nota:null};return notaParaIrConCuatro(e).nota===nfNecesaria(notaNecesaria(r));})()`));
chk('con margen: aunque te saques un 1,0 sigues con 4',
  a.run(`(()=>{const r=normalize({ramos:[{id:'m',nombre:'Holgado',color:'#000',gates:[],categorias:[
    {id:'p',nombre:'Prueba',peso:80,notas:[{id:'q',valor:6.5}]},{id:'f',nombre:'Control',peso:20,fecha:'2026-12-01',notas:[]}]}]}).ramos[0];
    return !!notaParaIrConCuatro({ramo:r,cat:r.categorias[1],nota:null}).margen;})()`));
chk('si sola no alcanza, lo dice en vez de inventar un 7,5',
  a.run(`(()=>{const r=normalize({ramos:[{id:'n',nombre:'Difícil',color:'#000',gates:[],categorias:[
    {id:'p',nombre:'Prueba',peso:80,notas:[{id:'q',valor:2.0}]},{id:'f',nombre:'Control',peso:20,fecha:'2026-12-01',notas:[]}]}]}).ramos[0];
    return !!notaParaIrConCuatro({ramo:r,cat:r.categorias[1],nota:null}).inalcanzable;})()`));
chk('una compuerta que topa la nota sube lo que necesitas',
  a.run(`(()=>{const r=normalize({ramos:[{id:'g',nombre:'Con piso',color:'#000',categorias:[
    {id:'p',nombre:'Prueba',peso:50,notas:[{id:'q',valor:6.0}]},{id:'f',nombre:'Examen',peso:50,fecha:'2026-12-01',notas:[]}],
    gates:[{type:'min_grade_required',catId:'f',min:3.0,cap:3.9}]}]}).ramos[0];
    return notaParaIrConCuatro({ramo:r,cat:r.categorias[1],nota:null}).nota;})()`)==='3.0');
chk('no toca los datos guardados',a.run('JSON.stringify(S.ramos)')===a.run('(resumenParaWidgets(new Date(2026,9,6,12)),JSON.stringify(S.ramos))'));
chk('lleva el color del ramo para su línea lateral',r.agenda[0].color==='#7F77DD');
chk('lleva cuánto del ramo define, el mismo de la Agenda',r.agenda[0].parte===30&&r.agenda[1].parte===40);
chk('cada ramo lleva su color para la línea lateral',r.ramos[0].color==='#7F77DD');
chk('las estadísticas son las mismas de la pantalla Estadísticas',r.estadisticas.avance===a.run('avanceEvaluaciones(S.ramos).pct')
  &&r.estadisticas.rango.piso===a.run('nf(proyeccionSemestre(S.ramos).piso)')&&r.estadisticas.rango.techo===a.run('nf(proyeccionSemestre(S.ramos).techo)')
  &&r.estadisticas.exigente.ramoId===a.run('loQueFaltaPorRamo(S.ramos)[0].ramo.id')&&r.estadisticas.exigente.necesitas===a.run('nfNecesaria(loQueFaltaPorRamo(S.ramos)[0].necesita)'));
chk('no lleva notas individuales ni nombres de personas',!JSON.stringify(r).includes('"valor"')&&!('userName' in r));

console.log('\n=== Pendientes, en orden de urgencia (#639) ===');
const p=contexto(false);
p.run(`S.ramos[1].categorias[1].notas[0].recorreccionPendiente=true;S.ramos[1].categorias[1].notas[0].nombre='Control 1';delete S.ramos[0].categorias[2].fecha;`);
const lista=p.run(`pendientes(new Date(2026,9,7,12)).map(x=>x.tipo+':'+x.nombre).join()`);
chk('mañana, recorregir, lo que pasó sin nota y lo que no tiene fecha',lista==='hoy:Interrogación 2,recorregir:Control 1,sin-nota:Control 0,sin-fecha:Examen');
chk('lo de pasado mañana todavía no es pendiente',!p.run(`pendientes(new Date(2026,9,6,12)).some(x=>x.tipo==='hoy')`));
chk('una evaluación con nota deja de ser pendiente',p.run(`(S.ramos[1].categorias[0].notas.push({id:'z',valor:5}),!pendientes(new Date(2026,9,7,12)).some(x=>x.tipo==='sin-nota'))`));
const rp=p.run('resumenParaWidgets(new Date(2026,9,7,12))');
chk('el resumen lleva los pendientes menos los de hoy, que el widget saca de la agenda',rp.pendientes.map(x=>x.tipo).join()==='recorregir,sin-fecha'&&rp.pendientes[0].ramoId==='b'&&rp.agenda[0].evaluacion==='Interrogación 2');
chk('pendientes no guarda nada',p.run('JSON.stringify(S.ramos)')===p.run('(pendientes(new Date(2026,9,7,12)),JSON.stringify(S.ramos))'));

console.log('\n=== Horario de clases (#641) ===');
const h=contexto(false);
chk('sin horario guardado va vacío',Array.isArray(h.run('resumenParaWidgets(new Date(2026,9,7,12)).horario'))&&h.run('resumenParaWidgets(new Date(2026,9,7,12)).horario.length')===0);
h.run(`S.ramos[0].horario=[{dia:1,inicio:'8:20',fin:'9:30',sala:'B12',tipo:'catedra'},{dia:3,inicio:'14:50',fin:'16:00'}];
  S.ramos[1].horario=[{dia:7,inicio:'10:00',fin:'11:10'},{dia:2,inicio:'11:00',fin:'10:00'},{dia:2,inicio:'25:00',fin:'26:00'},null];`);
const hz=h.run('resumenParaWidgets(new Date(2026,9,7,12)).horario');
chk('lleva cada clase con su ramo y sala',hz.length===2&&hz[0].ramoId==='a'&&hz[0].ramo==='Cálculo Sintético'&&hz[0].sala==='B12'&&hz[0].tipo==='catedra'&&hz[0].color==='#7F77DD');
chk('sin sala ni tipo van en null',hz[1].sala===null&&hz[1].tipo===null);
chk('un bloque mal formado no va (domingo, fin antes del inicio, hora imposible)',!hz.some(c=>c.ramoId==='b'));

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
chk('estadísticas',b.run(`abrirEnlaceWidget('cl.gradehub.app://estadisticas')`)===true&&b.run('__abierto')==='tab:stats');
chk('un ramo que ya no existe deja en Inicio',b.run(`abrirEnlaceWidget('cl.gradehub.app://ramo/zz')`)===false&&b.run('__abierto')==='tab:home');
b.run(`__abierto=null`);
chk('otro esquema o la vuelta del login no se tocan',b.run(`abrirEnlaceWidget('https://gradehub.cl/ramo/a')`)===false&&b.run(`abrirEnlaceWidget('cl.gradehub.app://login-callback?code=x')`)===false&&b.run('__abierto')===null);

console.log('\n=== El lado nativo está en el proyecto ===');
const pbx=leer('ios/App/App.xcodeproj/project.pbxproj');
chk('la extensión de widgets es un target y va embebida en la app',/productType = "com.apple.product-type.app-extension"/.test(pbx)&&/Embed Foundation Extensions/.test(pbx));
// El grupo vive en Firma.xcconfig: con otra cuenta de Apple cambia, y cada uno
// lo pone en su Firma.local.xcconfig sin tocar el proyecto ni el Swift.
const firma=leer('ios/App/Firma.xcconfig');
chk('app y widget comparten el mismo App Group',['ios/App/App/App.entitlements','ios/App/GradeHubWidgets/GradeHubWidgets.entitlements'].every(f=>/<string>\$\(GRADEHUB_APP_GROUP\)<\/string>/.test(leer(f)))&&/^GRADEHUB_APP_GROUP = group\.cl\.gradehub\.app$/m.test(firma));
chk('el Swift lee el grupo del Info.plist de su target',['ios/App/App/Info.plist','ios/App/GradeHubWidgets/Info.plist'].every(f=>/<key>GradeHubAppGroup<\/key>\s*<string>\$\(GRADEHUB_APP_GROUP\)<\/string>/.test(leer(f)))
  &&['ios/App/App/WidgetsPlugin.swift','ios/App/GradeHubWidgets/GradeHubWidgets.swift','ios/App/Shared/ActividadPrueba.swift'].every(f=>/static let grupo = Bundle\.main\.object\(forInfoDictionaryKey: "GradeHubAppGroup"\)/.test(leer(f))));
chk('el plugin y el widget usan la misma clave',/"resumen\.v1"/.test(leer('ios/App/App/WidgetsPlugin.swift'))&&/"resumen\.v1"/.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));

console.log('\n=== La firma de cada uno no entra al proyecto ===');
chk('el proyecto no trae Team ni Bundle ID escritos',!/DEVELOPMENT_TEAM =/.test(pbx)&&!/PRODUCT_BUNDLE_IDENTIFIER = cl\./.test(pbx)
  &&(pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = "\$\(GRADEHUB_BUNDLE_ID\)";/g)||[]).length===2&&(pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = "\$\(GRADEHUB_BUNDLE_ID\)\.widgets";/g)||[]).length===2);
chk('Debug y Release de los dos targets parten de Firma.xcconfig',/#include "App\/Firma\.xcconfig"/.test(leer('ios/debug.xcconfig'))
  &&(pbx.match(/baseConfigurationReference = [0-9A-F]+ \/\* Firma\.xcconfig \*\//g)||[]).length===2&&(pbx.match(/baseConfigurationReference = [0-9A-F]+ \/\* debug\.xcconfig \*\//g)||[]).length===3);
chk('la firma personal va en un archivo que git ignora',/^GRADEHUB_BUNDLE_ID = cl\.gradehub\.app$/m.test(firma)&&/#include\? "Firma\.local\.xcconfig"/.test(firma)&&/^ios\/App\/Firma\.local\.xcconfig$/m.test(leer('.gitignore')));
chk('el widget no calcula notas: no hay promedios ni ponderaciones en Swift',!/\bpeso\b|ponderad|ramoAvg|\.reduce\(/i.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));
chk('la nota en el widget es privada en la pantalla de bloqueo',/privacySensitive/.test(leer('ios/App/GradeHubWidgets/GradeHubWidgets.swift')));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
