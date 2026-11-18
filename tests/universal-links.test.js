// Enlaces públicos + arranque/entrada reales, sin cuentas ni red de usuarios.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),os=require('os'),cp=require('child_process');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
const aasa=JSON.parse(leer('.well-known/apple-app-site-association')),detalle=aasa.applinks.details;
assert.deepEqual(detalle.map(d=>d.appIDs),[['PH6XQV8L2M.cl.gradehub.app']]);
assert.deepEqual(detalle[0].components.filter(c=>!c.exclude).map(c=>c['/']),['/']);
const patron=(p,v)=>new RegExp('^'+p.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$').test(v);
function asociado(url){const u=new URL(url);const c=detalle[0].components.find(c=>(!c['/']||patron(c['/'],u.pathname))&&(!c['#']||patron(c['#'],u.hash.slice(1)))&&(!c['?']||(typeof c['?']==='string'?patron(c['?'],u.search.slice(1)):Object.entries(c['?']).every(([k,v])=>(u.searchParams.has(k)?u.searchParams.getAll(k):['']).every(valor=>patron(v,valor))))));return !!c&&!c.exclude;}
for(const ruta of ['/','/?profe=ABCD2345','/?dar-clases','/?desde=calculadora'])assert(asociado('https://gradehub.cl'+ruta),ruta);
for(const ruta of ['/privacidad.html','/terminos','/auth/callback','/login-callback','/cal/token-sintetico','/mcp/','/calculadora','/clase/inventada','/ramo/inventado','/#access_token=sintetico','/#type=recovery'])assert(!asociado('https://gradehub.cl'+ruta),ruta);
for(const k of ['code','token','token_hash','access_token','refresh_token','type','state','error','error_code','error_description'])for(const cola of [k+'=sintetico',k+'=',k,k+'&profe=ABCD2345','profe=ABCD2345&'+k,'profe=ABCD2345&'+k+'=&desde=calculadora',k+'=&'+k+'=sintetico'])assert(!asociado('https://gradehub.cl/?'+cola),cola);
const cabecera=leer('_headers').split('/.well-known/apple-app-site-association\n')[1];
assert(cabecera&&/^  Content-Type: application\/json\s*$/m.test(cabecera));
assert(!fs.existsSync(path.join(raiz,'_redirects')),'revisar redirecciones nuevas antes de confiar en el AASA');
assert(leer('ios/App/App/App.entitlements').includes('<string>applinks:gradehub.cl</string>'));
const deploy=leer('.github/workflows/deploy.yml');assert(deploy.includes('.well-known/assetlinks.json .well-known/apple-app-site-association'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'gh-aasa-dist-'));
try{const excl=[...deploy.matchAll(/--exclude '([^']+)'/g)].map(m=>'--exclude='+m[1]);cp.execFileSync('rsync',['-a',...excl,raiz+'/',temp+'/']);assert.equal(fs.readFileSync(path.join(temp,'.well-known/apple-app-site-association'),'utf8'),leer('.well-known/apple-app-site-association'));}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS AASA: JSON, inventario, auth fuera, entitlement, Content-Type y copia real a dist');

function contexto({nativa=true,lanzamiento,falloLanzamiento=false}={}){
 const ids={},almacen=new Map(),oyentes={},timers=[],llamadas=[],eventos=[],docEventos={};
 const el=()=>{const clases=new Set();return {style:{setProperty(){},removeProperty(){}},classList:{add(...a){a.forEach(x=>clases.add(x));},remove(...a){a.forEach(x=>clases.delete(x));},contains:x=>clases.has(x),toggle(){}},dataset:{},value:'',innerHTML:'',textContent:'',addEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return null;},querySelectorAll(){return [];},focus(){}};};
 const window={addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){},addListener(){}})};
 if(nativa)window.Capacitor={isNativePlatform:()=>true,Plugins:{App:{addListener(n,f){(oyentes[n]??=[]).push(f);},getLaunchUrl(){return falloLanzamiento?Promise.reject(Error('sin URL')):Promise.resolve(lanzamiento?{url:lanzamiento}:undefined);}}}};
 const storage={getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,String(v)),removeItem:k=>almacen.delete(k)};
 const ctx={window,document:{getElementById:id=>ids[id]??=(el()),documentElement:el(),body:el(),createElement:el,querySelector:()=>el(),querySelectorAll:()=>[],addEventListener(n,f){(docEventos[n]??=[]).push(f);}},localStorage:storage,sessionStorage:storage,navigator:{},location:{origin:nativa?'capacitor://localhost':'https://gradehub.cl',pathname:'/',search:'',hash:'',href:'https://gradehub.cl/'},history:{replaceState(){}},URL,URLSearchParams,console,setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){}};
 vm.createContext(ctx);for(const f of ['data.js','engine.js','app.js','app-session.js','marketplace.js','render-main.js','render-agenda.js'])vm.runInContext(leer(f),ctx);
 const run=s=>vm.runInContext(s,ctx);ctx.__llamadas=llamadas;ctx.__eventos=eventos;
 run(`track=(nombre,datos)=>__eventos.push([nombre,datos]);showTab=t=>__llamadas.push(['tab',t]);revisarInvitacionProfesor=async()=>__llamadas.push(['invitacion',profePendiente(),getCacheOwner(),S.ramos.map(r=>r.nombre)]);`);
 const emitir=url=>(oyentes.appUrlOpen||[]).forEach(f=>f({url}));
 const entrar=(uid='u-sintetico')=>run(`currentUser={id:${JSON.stringify(uid)}};S={...freshState(),tenant:'udd',onboardingDone:true,ramos:[]};setCacheOwner(currentUser.id);activarEnlacesUniversales();`);
 return {run,ctx,ids,llamadas,eventos,oyentes,entrar,emitir,almacen,timers};
}
const pausa=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const c=contexto();c.entrar();c.llamadas.length=0;
 const casos=[['https://gradehub.cl/','tab','home'],['https://gradehub.cl/?profe=ABCD2345','invitacion','ABCD2345'],['https://gradehub.cl/?dar-clases','tab','profesor'],['https://gradehub.cl/?desde=calculadora','tab','home'],['https://gradehub.cl/desconocido','tab','home']];
 for(const [url,tipo,destino] of casos){c.emitir(url);assert.deepEqual(c.llamadas.at(-1).slice(0,2),[tipo,destino],url);}
 const n=c.llamadas.length;
 for(const u of ['https://gradehub.cl/?code=sintetico','https://gradehub.cl/#type=recovery','https://gradehub.cl/privacidad.html','https://gradehub.cl/cal/secreto','https://otro.test/?profe=ABCD2345','https://gradehub.cl.ejemplo.test/','https://usuario@gradehub.cl/','http://gradehub.cl/','javascript:alert(1)']){assert.equal(c.run(`recibirEnlaceUniversal(${JSON.stringify(u)})`),false,u);}
 assert.equal(c.llamadas.length,n);
 for(const url of ['https://gradehub.cl/?profe=invalido','https://gradehub.cl/?profe=ABCD2345&profe=ABCD6789','https://gradehub.cl/?profe=ABCD2345&dar-clases']){c.emitir(url);assert.deepEqual(c.llamadas.at(-1).slice(0,2),['tab','home']);}
 assert(c.eventos.every(([n,d])=>n==='panel_alumnos_link_abierto'&&d===undefined),'sin URL, código ni identidad en métricas');
 const login=contexto();login.emitir('https://gradehub.cl/?profe=ABCD2345');assert.equal(login.llamadas.length,0);assert.equal(login.run('profePendiente()'),'ABCD2345');
 login.run(`currentUser={id:'u-sintetico'};S.onboardingDone=true;setCacheOwner('otra-cuenta')`);assert.equal(login.run('activarEnlacesUniversales()'),null);assert.equal(login.llamadas.length,0);
 login.entrar();assert.equal(login.llamadas.filter(x=>x[0]==='invitacion').length,1);login.run('activarEnlacesUniversales()');assert.equal(login.llamadas.length,1);
 login.run(`_visitaSesion++;_enlaceUniversalPendiente=null`);login.emitir('https://gradehub.cl/desconocido');assert.equal(login.llamadas.length,1,'no reutiliza la preparación de otra visita');
 login.run(`currentUser={id:'otra-persona'};setCacheOwner(currentUser.id);activarEnlacesUniversales()`);assert.equal(login.llamadas.length,1,'un destino privado recibido con una cuenta no viaja a la otra');
 const onboarding=contexto();onboarding.emitir('https://gradehub.cl/?dar-clases');assert(onboarding.run('entradaProfesor()'));onboarding.run(`currentUser={id:'nuevo'};setCacheOwner('nuevo');activarEnlacesUniversales()`);assert.equal(onboarding.llamadas.length,0);onboarding.entrar('nuevo');assert.deepEqual(onboarding.llamadas.at(-1),['tab','profesor']);
 const frio=contexto({lanzamiento:'https://gradehub.cl/?profe=ABCD2345'});await pausa();assert.equal(frio.run('profePendiente()'),'ABCD2345');frio.emitir('https://gradehub.cl/?profe=ABCD2345');frio.entrar();assert.equal(frio.llamadas.length,1);assert.equal(frio.eventos.length,1,'getLaunchUrl + evento retenido no duplica la entrada');frio.emitir('https://gradehub.cl/?profe=ABCD2345');assert.equal(frio.llamadas.length,2,'volver a tocar el mismo link sí funciona');
 const reciente=contexto({lanzamiento:'https://gradehub.cl/?profe=ABCD2345'});reciente.emitir('https://gradehub.cl/?profe=ABCD6789');await pausa();reciente.entrar();assert.equal(reciente.llamadas.at(-1)[1],'ABCD6789','un getLaunchUrl atrasado no pisa un toque nuevo');
 await pausa();const fallo=contexto({falloLanzamiento:true});await pausa();fallo.entrar();fallo.emitir('https://gradehub.cl/');assert.equal(fallo.llamadas.at(-1)[1],'home');
 const web=contexto({nativa:false,lanzamiento:'https://gradehub.cl/?profe=ABCD2345'});web.entrar();assert.equal(web.oyentes.appUrlOpen,undefined);assert.equal(web.run(`recibirEnlaceUniversal('https://gradehub.cl/')`),false);assert.equal(web.llamadas.length,0);
 const formulario=contexto();formulario.entrar();formulario.run(`document.getElementById('modal').classList.add('open')`);formulario.emitir('https://gradehub.cl/desconocido');assert(!formulario.ids.modal.classList.contains('open'),'el respaldo a Inicio no queda tapado por la hoja anterior');
 formulario.run(`cambiosSinGuardarNav=()=>true;globalThis.__confirmar=null;showConfirm=(titulo,texto,seguir)=>__confirmar=seguir`);const antes=formulario.llamadas.length;formulario.emitir('https://gradehub.cl/');assert.equal(formulario.llamadas.length,antes,'no pierde un formulario sin confirmar');formulario.run('__confirmar()');assert.equal(formulario.llamadas.length,antes+1);
 formulario.emitir('https://gradehub.cl/?dar-clases');formulario.run(`globalThis.__viejo=__confirmar`);formulario.emitir('https://gradehub.cl/');formulario.run('__viejo()');assert.equal(formulario.llamadas.length,antes+1,'una confirmación vieja no pisa el enlace más reciente');
 console.log('PASS router real: inventario, desconocidos, malformados, auth excluido, frío/caliente, deduplicación, onboarding, sesión/caché y web intacta');
 // afterLogin, enterApp y showMainApp REALES, lectura remota demorada y caché de A.
 const real=contexto();real.run(`
 S=normalize({...freshState(),tenant:'udd',onboardingDone:true,ramos:[{id:'a',nombre:'Privado de A',categorias:[]}]});setCacheOwner('cuenta-a');
 currentUser={id:'cuenta-b'};document.getElementById('screen-auth').classList.add('active');
 globalThis.__entregar=null;loadFromCloud=()=>new Promise(r=>__entregar=r);registrarVisitaDiaria=()=>{};tareasConEstadoAlEntrar=()=>{};cargasAlEntrar=()=>{};syncNow=async()=>true;
 applyTheme=()=>{};publicarResumenWidgets=()=>{};renderHome=()=>{};renderStats=()=>{};renderAgenda=()=>{};recalcularNavTabs=()=>{};contarVisita=()=>{};pintarAvisoInstalar=()=>{};consultarEncuestaAlEntrar=async()=>{};ocultarCargaInicial=()=>{};supabaseClient={};
 recibirEnlaceUniversal('https://gradehub.cl/?profe=ABCD2345');globalThis.__entrada=afterLogin();`);
 assert.equal(real.llamadas.length,0,'espera la carga de B, no usa la caché de A');
 real.run(`__entregar({...freshState(),tenant:'udd',onboardingDone:true,ramos:[{id:'b',nombre:'Curso sintético de B',categorias:[]}]})`);await real.run('__entrada');
 const invitacion=real.llamadas.find(x=>x[0]==='invitacion');assert(invitacion);assert.equal(invitacion[2],'cuenta-b');assert.deepEqual(invitacion[3],['Curso sintético de B']);
 assert(!real.timers.some(f=>f===real.run('revisarInvitacionProfesor')),'no vuelve a programar la misma invitación al entrar');
 console.log('PASS afterLogin real: cambia el dueño y aplica la nube antes de abrir; no comparte automáticamente');
})().catch(e=>{console.error(e);process.exitCode=1;});
