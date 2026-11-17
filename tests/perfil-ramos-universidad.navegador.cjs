// QA de formulario real, solo datos sintéticos. Requiere npm run build y Chrome.
// node tests/perfil-ramos-universidad.navegador.cjs
const {spawn}=require('node:child_process'), fs=require('node:fs'), assert=require('node:assert/strict'),path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const os=require('node:os');
const raiz=path.resolve(__dirname,'..');process.chdir(raiz);
fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="'+require('node:url').pathToFileURL(raiz+'/').href+'">');
html=html.replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');
fs.writeFileSync('.cache/ramos-por-uni-qa.html',html);
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-ramos-uni-'));
const browser=spawn(ejecutable,[...(process.env.CI?['--no-sandbox']:[]),
  '--headless','--remote-debugging-pipe','--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--host-resolver-rules=MAP * ~NOTFOUND','--user-data-dir='+perfilTemporal,'about:blank'
],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let seq=0,buf='',sessionId;
const pending=new Map();
browser.stdio[4].on('data',chunk=>{
  buf+=chunk.toString();
  let i;
  while((i=buf.indexOf('\0'))!==-1){
    const msg=JSON.parse(buf.slice(0,i));buf=buf.slice(i+1);
    const call=pending.get(msg.id);
    if(call){pending.delete(msg.id);msg.error?call.reject(Error(JSON.stringify(msg.error))):call.resolve(msg.result);}
  }
});
browser.on('exit',code=>{for(const call of pending.values())call.reject(Error('Chrome exited '+code));});
function cdp(method,params={},global=false){
  return new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});
    browser.stdio[3].write(JSON.stringify({id,method,params,...(!global&&sessionId?{sessionId}:{})})+'\0');
  });
}
async function evaluar(expression){
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
}
async function esperar(expression){
  for(let i=0;i<40;i++){if(await evaluar(expression))return;await delay(100);}
  throw Error('Timeout: '+expression);
}
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/ramos-por-universidad');fs.mkdirSync(dir,{recursive:true});
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
const click=s=>evaluar(q(s)+'.click()');
const value=(s,v,tipo='input')=>evaluar(`(()=>{const n=${q(s)};n.value=${JSON.stringify(v)};n.dispatchEvent(new Event(${JSON.stringify(tipo)},{bubbles:true}));})()`);
const text=s=>evaluar(q(s)+'.textContent.replace(/\\s+/g," ").trim()');

const captura=async nombre=>fs.writeFileSync(path.join(dir,nombre),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));

(async()=>{
 const {targetInfos}=await cdp('Target.getTargets',{},true);
 ({sessionId}=await cdp('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},true));
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['http://*','https://*']});
 for(const ancho of [1440,375])for(const modo of ['claro','oscuro']){
  await cdp('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:ancho===375});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-color-scheme',value:modo==='claro'?'light':'dark'}]});
  await cdp('Page.navigate',{url:'file://'+path.resolve('.cache/ramos-por-uni-qa.html')});await esperar("typeof enlazarRamosUniversidadPerfil==='function'");
  await evaluar(`window.errores=[];window.addEventListener('error',e=>errores.push(e.message));window.guardadoQA=null;
   window.perfilQA={id:'00000000-0000-4000-8000-000000000001',nombre_publico:'Apoyo de prueba',presentacion:'Perfil sintético de ejercicios y tutorías en tres universidades. No son datos de una cuenta real.',tipo_perfil:'empresa',categorias:['plataforma'],etiqueta:'Plataformas y apps',color_tarjeta:'#126b63',en_directorio:true,perfil_publico:true,estado:'aprobado',universidades:['uc'],ramos_siglas:['SYN101'],ramos_por_universidad:null,sitio_web:'https://plataforma.example.invalid/',instagram:null,contacto_tipo:null,contacto_valor:null,logo_path:null,anuncios:[]};
   currentUser={id:perfilQA.id};supabaseClient={from:()=>({select(){return this},eq(){return this},update(d){guardadoQA=d;Object.assign(perfilQA,d);return this},async maybeSingle(){return {data:perfilQA,error:null}}}),rpc:async()=>({data:[],error:null})};
   nombresRamosParaClases=t=>t==='uc'?{SYN101:'Cálculo sintético',SYN102:'Álgebra sintética'}:t==='uai'?{UAI101:'Matemáticas sintéticas'}:t==='udd'?{UDD101:'Taller sintético'}:{};cargarCursosUC=async()=>false;
   PRESETS_POR_TENANT.uai['Programa sintético UAI']={sigla:'UAI202'};
   S=normalize({...freshState(),tenant:'uc',tipoCuenta:'profesor',onboardingDone:true,userName:'Cuenta de prueba',ramos:[],historial:[]});S.modo='${modo}';aplicarModo();perfilProfesorCache=perfilQA;perfilProfesorResuelto=true;vistaClasesActual='perfil';showMainApp();`);
  await esperar("!!document.querySelector('#pf-ramos-buscar')");
  assert.equal(await evaluar("document.querySelectorAll('[data-pf-ramos-uni]').length"),0,'una universidad conserva el buscador único');
  await evaluar("document.querySelector('.pfe form').requestSubmit()");await esperar('!!guardadoQA');assert.equal(await evaluar('guardadoQA.ramos_por_universidad'),null,'no migrar al cargar o guardar sin editar ramos');
  await evaluar(`Object.assign(perfilQA,{universidades:['uc','uai','udd'],ramos_siglas:['SYN101','UAI101','UDD101'],ramos_por_universidad:{uc:['SYN101'],uai:['UAI101'],udd:['UDD101']}});guardadoQA=null;renderPerfilProfesor(document.querySelector('#clases-perfil'))`);
  await esperar("document.querySelectorAll('[data-pf-ramos-uni]').length===3");
  assert.match(await text('#pf-ramos-uc-elegidos'),/SYN101.*Cálculo sintético/);assert.match(await text('#pf-ramos-uai-elegidos'),/UAI101.*Matemáticas sintéticas/);assert.match(await text('#pf-ramos-udd-elegidos'),/UDD101.*Taller sintético/);
  await value('#pf-ramos-uai-buscar','UAI202');assert.match(await text('#pf-ramos-uai-resultados'),/Programa sintético UAI/);
  await value('#pf-ramos-uai-buscar','UAI777');await click('#pf-ramos-uai-resultados [data-sigla=UAI777]');
  assert.match(await text('#pf-ramos-uai-elegidos'),/UAI777/);assert.doesNotMatch(await text('#pf-ramos-uc-elegidos'),/UAI777/);
  await evaluar("document.querySelector('[data-pf-ramos-editor]').closest('.pfe-seccion').scrollIntoView({block:'start'})");await delay(350);
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  await captura('ramos-por-uni-formulario-'+ancho+'-'+modo+'.png');
  await click('[name=pf-uni][value=uai]');await esperar("document.querySelector('#confirm-overlay').classList.contains('open')");
  assert.match(await text('#confirm-desc'),/UAI101.*UAI777/);assert.equal(await evaluar("document.querySelector('[name=pf-uni][value=uai]').checked"),true);
  await click('#confirm-overlay .btn-cancel-sm');assert.match(await text('#pf-ramos-uai-elegidos'),/UAI101/);
  await click('[name=pf-uni][value=uai]');await click('#confirm-action');assert.equal(await evaluar("!!document.querySelector('[data-pf-ramos-uni=uai]')"),false);
  await evaluar("document.querySelector('.pfe form').requestSubmit()");await esperar('!!guardadoQA');
  assert.deepEqual(await evaluar('guardadoQA.universidades'),['uc','udd']);assert.deepEqual(await evaluar('guardadoQA.ramos_siglas'),['SYN101','UDD101']);assert.deepEqual(await evaluar('guardadoQA.ramos_por_universidad'),{uc:['SYN101'],udd:['UDD101']});
  // Perfil antiguo con tres universidades: conserva la lista, exige completar
  // la asignación solo al editar esa organización y no adivina por catálogo.
  await evaluar(`Object.assign(perfilQA,{universidades:['uc','uai','udd'],ramos_siglas:['SYN101','UAI101','UDD101'],ramos_por_universidad:null});guardadoQA=null;renderPerfilProfesor(document.querySelector('#clases-perfil'))`);
  await esperar("document.querySelectorAll('[data-pf-asignar]').length===3");assert.match(await text('[data-pf-ramos-editor]'),/Ordena tus ramos por universidad/);
  await evaluar("document.querySelector('.pfe form').requestSubmit()");await esperar('!!guardadoQA');assert.equal(await evaluar('guardadoQA.ramos_por_universidad'),null);
  await evaluar('guardadoQA=null');await value('[data-pf-asignar=SYN101]','uc','change');
  await evaluar("document.querySelector('.pfe form').requestSubmit()");assert.equal(await evaluar('guardadoQA'),null);assert.match(await text('[data-error-directorio=ramos]'),/Asigna los ramos pendientes/);
  await value('[data-pf-asignar=UAI101]','uai','change');await value('[data-pf-asignar=UDD101]','udd','change');
  await evaluar("document.querySelector('.pfe form').requestSubmit()");await esperar('!!guardadoQA');assert.deepEqual(await evaluar('guardadoQA.ramos_por_universidad'),{uc:['SYN101'],uai:['UAI101'],udd:['UDD101']});
  assert.doesNotMatch(await text('[data-pf-ramos-editor]'),/Ordena tus ramos por universidad/,'el aviso desaparece al completar la asignación');
  await evaluar(`perfilQA.ramos_por_universidad={uc:Array.from({length:10},(_,i)=>'UC'+i),uai:Array.from({length:10},(_,i)=>'UAI'+i),udd:[]};perfilQA.ramos_siglas=Object.values(perfilQA.ramos_por_universidad).flat();renderPerfilProfesor(document.querySelector('#clases-perfil'))`);
  await esperar("!!document.querySelector('#pf-ramos-uai-buscar')");
  assert.equal(await evaluar("document.querySelector('#pf-ramos-uai-buscar').disabled"),true);
  await click('#pf-ramos-uc-elegidos [data-quitar-sigla=UC0]');
  assert.equal(await evaluar("document.querySelector('#pf-ramos-uai-buscar').disabled"),false);
  assert.doesNotMatch(await evaluar("document.querySelector('#pf-ramos-uai-buscar').placeholder"),/Llegaste/);
  await evaluar("delete perfilQA.ramos_por_universidad;guardadoQA=null;renderPerfilProfesor(document.querySelector('#clases-perfil'))");
  await esperar("!!document.querySelector('#pf-ramos-buscar')");await evaluar("document.querySelector('.pfe form').requestSubmit()");await esperar('!!guardadoQA');
  assert.equal(await evaluar("Object.hasOwn(guardadoQA,'ramos_por_universidad')"),false,'sin la columna se sigue guardando el perfil anterior');
  assert.deepEqual(await evaluar('errores'),[]);
  console.log(ancho,modo,'OK: 1/3 universidades, búsqueda y entrada manual, quitar/cancelar, unión, legado conservado y asignación explícita');
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser.kill());
