// La app de Android (Capacitor) comparte todo lo de la app iOS menos lo que
// solo existe en el iPhone: widgets, Actividad en Vivo, Apple nativo y el gesto
// de volver desde el borde. Los avisos de evaluación y Canvas por calendario sí
// corren. Sin getPlatform (los tests viejos) sigue contando como iPhone.
const fs=require('fs'),path=require('path'),vm=require('vm');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

function contexto(plataforma,{canvas=false,protocolo='https:'}={}){
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null},querySelector(){return null},querySelectorAll(){return []},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const window={addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
  if(plataforma){
    window.Capacitor={isNativePlatform:()=>true,registerPlugin:()=>({guardarResumen:()=>Promise.reject(new Error('not implemented'))}),
      Plugins:{LocalNotifications:{getPending:async()=>({notifications:[{id:7,extra:{gradehub:'prueba'}},{id:8,extra:{}}]}),
        cancel:async o=>{(window.__cancelados=window.__cancelados||[]).push(...o.notifications.map(n=>n.id));}},...(canvas?{GradeHubCanvas:{desconectar:async o=>{window.__canvasDesconectado=o.cuenta;return {conectado:false}}}}:{})}};
    if(plataforma!=='sin-plataforma')window.Capacitor.getPlatform=()=>plataforma;
  }
  const ctx={window,document:{getElementById:el,createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}},navigator:{},location:{origin:'https://gradehub.cl',pathname:'/',hash:'',protocol:protocolo},
    setTimeout:f=>{f();return 1;},clearTimeout(){},console,URL,currentUser:{id:'00000000-0000-0000-0000-000000000001'}};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  vm.runInContext(`S.tenant='uc';esCuentaProfesor=()=>false;`,ctx);
  return c=>vm.runInContext(c,ctx);
}

console.log('\n=== Quién es iPhone y quién Android ===');
const android=contexto('android'),ios=contexto('ios'),viejo=contexto('sin-plataforma'),web=contexto(null);
chk('Android es app nativa',android('enAppNativa()')===true);
chk('Android no es iPhone',android('enAppIOS()')===false);
chk('iOS es iPhone',ios('enAppIOS()')===true);
chk('sin getPlatform cuenta como iPhone (tests y binarios viejos)',viejo('enAppIOS()')===true);
chk('la web no es ninguna',web('enAppNativa()')===false&&web('enAppIOS()')===false);
chk('la analítica distingue Android de iOS',android('propsAnaliticaCuenta().plataforma')==='android'&&ios('propsAnaliticaCuenta().plataforma')==='ios'&&web('propsAnaliticaCuenta().plataforma')==='web');
chk('los avisos push de amigos (APNs) no aparecen en Android',android('pluginAvisosAmigos()')===null);

console.log('\n=== Lo que es solo del iPhone ===');
chk('Android no arma un plugin de widgets que falla en cada llamada',android('pluginWidgets()')===null);
chk('el iPhone sí tiene widgets',!!ios('pluginWidgets()'));

console.log('\n=== Lo que Android sí tiene ===');
chk('avisos de evaluación en Android (notificaciones locales)',android('avisosPruebasDisponibles()')===true);
chk('avisos de evaluación siguen en el iPhone',ios('avisosPruebasDisponibles()')===true);
chk('avisos no aparecen en la web',web('avisosPruebasDisponibles()')===false);
chk('Android sin Canvas nativo usa el calendario .ics',android('canvasIcsDisponible()')===true);
const androidCanvas=contexto('android',{canvas:true});
chk('Android con plugin usa Canvas nativo',androidCanvas('canvasDisponible()')===true);
chk('Android con plugin omite el calendario .ics',androidCanvas('canvasIcsDisponible()')===false);
chk('el iPhone con Canvas nativo no muestra el .ics',contexto('ios',{canvas:true})('canvasIcsDisponible()')===false);
chk('la app con la web adentro (capacitor://) no muestra el .ics',contexto('ios',{protocolo:'capacitor:'})('canvasIcsDisponible()')===false);
chk('la web sigue mostrando el .ics',web('canvasIcsDisponible()')===true);
const olfato=r=>r(`SECCIONES_STATS.find(x=>x.id==='olfato').disponible()`);
chk('«Tu olfato» (sale de la Actividad en Vivo) no aparece en Android',olfato(android)===false&&olfato(ios)===true);
const ajustes=leer('app.js');
chk('el texto de los avisos en Android no promete pantalla de bloqueo ni dice iPhone',
  /:'Para las evaluaciones con hora: la noche anterior y 15 minutos antes, para caminar a la sala\. Al terminar, te preguntamos cómo te fue\. Solo en este teléfono\.'/.test(ajustes));

(async()=>{
await androidCanvas('olvidarCanvasCuenta()');
chk('la limpieza de cuenta llama al plugin Android con su dueño',
  androidCanvas('window.__canvasDesconectado')===androidCanvas('currentUser.id'));
const puente='android/app/src/main/java/cl/gradehub/app/';
chk('MainActivity registra GradeHubCanvas',leer(puente+'MainActivity.java').includes('registerPlugin(GradeHubCanvas.class)'));
chk('Capacitor Android protege los argumentos del puente también en debug',JSON.parse(leer('capacitor.config.json')).android.loggingBehavior==='none');
const xml='android/app/src/main/res/xml/';
chk('las credenciales quedan fuera del respaldo y la transferencia',[
  'backup_rules.xml','data_extraction_rules.xml'
].every(f=>leer(xml+f).includes('gradehub_canvas_tokens.xml'))&&leer(xml+'data_extraction_rules.xml').includes('device-transfer'));

console.log('\n=== Avisos en Android, sin widgets ===');
android(`S.onboardingDone=true;var __programados=0;programarAvisosPruebas=()=>{__programados++};publicarResumenWidgets()`);
chk('guardar notas programa los avisos aunque no haya widgets',android('__programados')===1);
android('borrarResumenWidgets()');await new Promise(r=>setImmediate(r));
chk('cerrar sesión cancela los avisos de esa cuenta (y solo los nuestros)',JSON.stringify(android('window.__cancelados'))==='[7]');

console.log('\n=== Botón atrás de Android ===');
const atras=contexto('android');
atras(`var __pasos=[];KeyboardEvent=function(t,o){this.type=t;this.key=o.key};
  window.Capacitor.Plugins.App={minimizeApp(){__pasos.push('fondo')}};
  history={back(){__pasos.push('historial')}};showTab=t=>__pasos.push('tab:'+t);
  document.activeElement={dispatchEvent(e){__pasos.push(e.type+':'+e.key)}};
  var __abierto=null,__enRamo=false;
  document.querySelector=s=>__abierto&&s.includes(__abierto)?{}:null;
  document.getElementById=id=>id==='screen-ramo'?{classList:{contains:()=>__enRamo}}:null;`);
chk('con una hoja abierta, atrás la cierra como Escape',atras(`__abierto='#modal.open';atrasAndroid(true)`)==='capa'&&atras('__pasos.pop()')==='keydown:Escape');
chk('con una confirmación abierta, también',atras(`__abierto='.confirm-overlay.open';atrasAndroid(false)`)==='capa');
chk('en un ramo, vuelve a la pestaña',atras(`__abierto=null;__enRamo=true;currentTab='agenda';atrasAndroid(true)`)==='ramo'&&atras('__pasos.pop()')==='tab:agenda');
chk('sin nada encima, recorre el historial de vistas',atras(`__enRamo=false;atrasAndroid(true)`)==='historial');
chk('al final la app se va al fondo, no se cierra',atras(`atrasAndroid(false)`)==='fondo'&&atras('__pasos.pop()')==='fondo');
const exacta=async(permiso,plataforma='android')=>{const r=contexto(plataforma);
  return r('alarmaExactaPermitida')({checkExactNotificationSetting:async()=>({exact_alarm:permiso})});};
chk('Android programa exacta solo si la persona permitió «Alarmas y recordatorios»',await exacta('granted')===true&&await exacta('denied')===false);
chk('en el iPhone no se pregunta',await exacta('denied','ios')===true);
chk('cada aviso dice si va exacto y despierta al teléfono',/schedule:\{at:a\.at,allowWhileIdle:true\},isExactNotification:exacta/.test(leer('app.js')));
chk('«Alarmas y recordatorios» se pide solo al activar los avisos, no al reprogramar',
  (leer('app.js').match(/changeExactNotificationSetting\(\)/g)||[]).length===1&&/async function alternarAvisosPruebas[\s\S]*changeExactNotificationSetting\(\)/.test(leer('app.js')));
chk('preparar no termina en error en Android (la última línea no es un && que falla)',!/\[ "\$PLATAFORMA" = ios \] &&/.test(leer('bin/preparar-ios.sh')));
chk('solo Android escucha el botón atrás',/if\(App&&!APP_IOS&&typeof atrasAndroid==='function'\)App\.addListener\('backButton'/.test(leer('app-session.js')));

console.log('\n=== El .aab de Play ===');
const play=leer('bin/android-play.sh'),gradle=leer('android/app/build.gradle');
chk('ninguna contraseña ni clave en el repo: jarsigner la pide',!/storepass|keypass|storePassword|keyPassword/.test(play+gradle)&&/jarsigner" -keystore "\$KEYSTORE"/.test(play));
chk('la de Play carga gradehub.cl, nunca la versión de prueba',/unset GRADEHUB_SERVIDOR/.test(play)&&/c\.server\.url!=="https:\/\/gradehub\.cl"/.test(play));
chk('sin firma se detiene (jarsigner -verify no sirve de control)',/if \[ -z "\$HUELLA" \]/.test(play)&&!/jarsigner" -verify/.test(play));
chk('la firma tiene que ser la clave de subida de assetlinks.json',/grep -qF "\$HUELLA" \.well-known\/assetlinks\.json/.test(play));
chk('versionCode mayor que el del TWA (1)',+(gradle.match(/versionCode (\d+)/)||[])[1]>1);

console.log('\n=== Apple y el gesto de volver ===');
const app=leer('app.js'),sesion=leer('app-session.js');
chk('Apple nativo solo en el iPhone',/provider==='apple'&&APP_IOS\)\{await entrarConAppleNativo/.test(sesion));
chk('revocar Apple al borrar la cuenta solo en el iPhone',/cuentaConApple\(currentUser\)&&typeof enAppIOS==='function'&&enAppIOS\(\)/.test(app));
chk('volver desde el borde solo en el iPhone',/if\(animando\|\|!enAppIOS\(\)/.test(app));
const constantes=sesion.match(/const APP_NATIVA=.*\n(?:\/\/.*\n)*const APP_IOS=.*/)[0];
const appIos=plataforma=>vm.runInContext(constantes+';APP_IOS',vm.createContext({window:{Capacitor:{isNativePlatform:()=>true,...(plataforma?{getPlatform:()=>plataforma}:{})}}}));
chk('APP_IOS: Android no, iPhone sí, sin getPlatform sí',appIos('android')===false&&appIos('ios')===true&&appIos(null)===true);

console.log(`\n${ok} OK, ${fail} FAIL`);
if(fail)process.exit(1);
})();
