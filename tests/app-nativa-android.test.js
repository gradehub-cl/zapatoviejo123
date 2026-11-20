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
        cancel:async o=>{(window.__cancelados=window.__cancelados||[]).push(...o.notifications.map(n=>n.id));}},...(canvas?{GradeHubCanvas:{}}:{})}};
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

console.log('\n=== Lo que es solo del iPhone ===');
chk('Android no arma un plugin de widgets que falla en cada llamada',android('pluginWidgets()')===null);
chk('el iPhone sí tiene widgets',!!ios('pluginWidgets()'));

console.log('\n=== Lo que Android sí tiene ===');
chk('avisos de evaluación en Android (notificaciones locales)',android('avisosPruebasDisponibles()')===true);
chk('avisos de evaluación siguen en el iPhone',ios('avisosPruebasDisponibles()')===true);
chk('avisos no aparecen en la web',web('avisosPruebasDisponibles()')===false);
chk('Android sin Canvas nativo usa el calendario .ics',android('canvasIcsDisponible()')===true);
chk('el iPhone con Canvas nativo no muestra el .ics',contexto('ios',{canvas:true})('canvasIcsDisponible()')===false);
chk('la app con la web adentro (capacitor://) no muestra el .ics',contexto('ios',{protocolo:'capacitor:'})('canvasIcsDisponible()')===false);
chk('la web sigue mostrando el .ics',web('canvasIcsDisponible()')===true);

(async()=>{
console.log('\n=== Avisos en Android, sin widgets ===');
android(`S.onboardingDone=true;var __programados=0;programarAvisosPruebas=()=>{__programados++};publicarResumenWidgets()`);
chk('guardar notas programa los avisos aunque no haya widgets',android('__programados')===1);
android('borrarResumenWidgets()');await new Promise(r=>setImmediate(r));
chk('cerrar sesión cancela los avisos de esa cuenta (y solo los nuestros)',JSON.stringify(android('window.__cancelados'))==='[7]');

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
