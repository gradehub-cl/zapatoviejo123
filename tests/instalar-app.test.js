// El aviso de "instalar como app" no puede estorbar ni mentir.
//
// Tres reglas que se olvidan fácil: (1) no se ofrece en la primera visita ni a
// quien ya la tiene instalada o ya dijo que no; (2) en iOS no hay API de
// instalación, así que el botón "Instalar" solo aparece cuando el navegador
// entregó su `beforeinstallprompt` —ofrecerlo en Safari sería un botón que no
// hace nada—; (3) vive al pie de Inicio, no flotando encima de la app.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..');
const src=['data.js','engine.js','app.js','render-agenda.js'].map(f=>fs.readFileSync(path.join(raiz,f),'utf8')).join('\n');
const html=fs.readFileSync(path.join(raiz,'index.html'),'utf8');
const css=fs.readFileSync(path.join(raiz,'styles.css'),'utf8');

const aviso={hidden:true,innerHTML:''};
const stub={style:{setProperty(){},removeProperty(){}},addEventListener(){},appendChild(){},classList:{add(){},remove(){},contains(){return false;}},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelectorAll(){return [];},querySelector(){return stub;},closest(){return null;},clientWidth:400,dataset:{},click(){}};
const almacen={};
const oyentes={};
let ua='Mozilla/5.0 (Linux; Android 14) Chrome/124';
let standalone=false;
const ctx={
  window:{addEventListener:(n,f)=>{(oyentes[n]=oyentes[n]||[]).push(f);},matchMedia:q=>({matches:/standalone/.test(q)?standalone:true,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>id==='instalar-aviso'?aviso:stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:()=>stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem:k=>k in almacen?almacen[k]:null,setItem:(k,v)=>{almacen[k]=String(v);},removeItem:k=>{delete almacen[k];}},
  get navigator(){return {userAgent:ua,maxTouchPoints:0,standalone:standalone||undefined};},
  location:{origin:'',pathname:'',hash:''},setTimeout,clearTimeout,console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);
const val=e=>vm.runInContext(e,ctx);
const pintar=()=>{aviso.hidden=true;aviso.innerHTML='';val('pintarAvisoInstalar()');};

let ok=0,fail=0;
const chk=(n,c)=>{if(c){ok++;console.log('  OK   '+n);}else{fail++;console.log('  FAIL '+n);}};

console.log('\n=== Cuándo se ofrece ===');
val(`currentUser={id:'persona-sintetica'};S.ramos=[{categorias:[{notas:[{valor:5.2}]}]}];_promptInstalar={prompt(){},userChoice:Promise.resolve({outcome:"dismissed"})}`);
const estadoAntes=val('JSON.stringify(S)');
val(`contarVisita(new Date(2026,10,10,23,50))`);pintar();
chk('primera sesión con notas no ofrece instalar',aviso.hidden===true);
val(`contarVisita(new Date(2026,10,11,0,10))`);pintar();
chk('cruzar medianoche sin salir tampoco lo ofrece',aviso.hidden===true);
val(`_visitasInstalar.clear();contarVisita(new Date(2026,10,10,23,55))`);pintar();
chk('volver el mismo día no alcanza aunque haya dos visitas',aviso.hidden===true);
val(`_visitasInstalar.clear();contarVisita(new Date(2026,10,11,9))`);pintar();
chk('volver otro día con notas sí lo ofrece',aviso.hidden===false&&/Ten GradeHub como app/.test(aviso.innerHTML));
chk('con prompt del navegador ofrece instalar de verdad',/onclick="instalarApp\(\)"/.test(aviso.innerHTML));
chk('registrar visitas no cambia ningún dato de la cuenta',val('JSON.stringify(S)')===estadoAntes);
val('S.ramos[0].categorias[0].notas=[{valor:null}]');pintar();
chk('otro día pero con solo casillas pendientes no se ofrece',aviso.hidden===true);
val('S.ramos[0].categorias[0].notas=[{valor:NaN}]');pintar();
chk('un valor no finito no cuenta como nota',aviso.hidden===true);
val('S.ramos[0].categorias[0].notas=[{valor:5.2}]');
val(`currentUser={id:'otra-persona'};contarVisita(new Date(2026,10,11))`);pintar();
chk('otra cuenta en el dispositivo tiene su primera sesión',aviso.hidden===true);
val(`currentUser={id:'persona-sintetica'}`);pintar();
chk('volver a la cuenta anterior conserva su elegibilidad',aviso.hidden===false);
// El contador viejo no informa fechas: una cuenta existente comienza a medir
// días desde este cliente y no recibe el aviso por tener muchas recargas.
val(`currentUser={id:'cuenta-antigua'};localStorage.setItem('gradehub_visitas','99');contarVisita(new Date(2026,10,11))`);pintar();
chk('99 visitas heredadas no se interpretan como días distintos',aviso.hidden===true);
val(`currentUser={id:'persona-sintetica'}`);

console.log('\n=== Cuándo NO ===');
standalone=true;pintar();
chk('ya instalada: nada',aviso.hidden===true);
standalone=false;
almacen['gradehub_instalar_no']='1';pintar();
chk('ya dijo que no: nada, y para siempre',aviso.hidden===true);
delete almacen['gradehub_instalar_no'];

console.log('\n=== iOS: instrucciones, no un botón que no hace nada ===');
val('_promptInstalar=null');
ua='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15';
pintar();
chk('Safari de iPhone recibe las instrucciones de Compartir',aviso.hidden===false&&/Agregar a pantalla de inicio/.test(aviso.innerHTML));
chk('y NO un botón Instalar que no haría nada',!/instalarApp\(\)/.test(aviso.innerHTML));
ua='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/124';
pintar();
chk('Chrome en iPhone no puede instalar: no se ofrece',aviso.hidden===true);
ua='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124';
pintar();
chk('un escritorio sin prompt tampoco',aviso.hidden===true);

console.log('\n=== Dónde vive ===');
chk('el aviso está al pie de Inicio, antes del footer',/id="instalar-aviso"[\s\S]{0,200}<footer class="app-footer"/.test(html));
chk('no flota: sin position fija ni z-index',/\.instalar-aviso\{[^}]*\}/.test(css)&&!/\.instalar-aviso\{[^}]*position:(fixed|sticky|absolute)/.test(css));
chk('se cuenta la visita al entrar a la app',/contarVisita\(\);\n  pintarAvisoInstalar\(\);/.test(fs.readFileSync(path.join(raiz,'app.js'),'utf8')));

console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
process.exit(fail?1:0);
