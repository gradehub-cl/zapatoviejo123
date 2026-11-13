// node tests/ios-sensacion.navegador.cjs [--antes] — web real con datos sintéticos, sin conexiones externas.
const {spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {setTimeout:delay}=require('node:timers/promises');const raiz=path.resolve(__dirname,'..');process.chdir(raiz);fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');fs.writeFileSync('.cache/nativa-qa.html',html);
const csp=fs.readFileSync('_headers','utf8').match(/^\s*Content-Security-Policy: (.+)$/m)[1];
const server=http.createServer((req,res)=>{const f=path.resolve('.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(raiz+'/')){res.writeHead(404).end();return;}try{const contenido=fs.readFileSync(f);res.writeHead(200,{'Content-Type':({html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',json:'application/json'})[path.extname(f).slice(1)]||'application/octet-stream','Content-Security-Policy':csp});res.end(contenido);}catch{res.writeHead(404).end();}});
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-nativa-'));
const browser=spawn(ejecutable,[...(process.env.CI?['--no-sandbox']:[]),
  '--headless','--remote-debugging-pipe','--no-first-run','--no-default-browser-check','--disable-background-networking',
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1','--user-data-dir='+perfilTemporal,'about:blank'
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
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/ios-sensacion/'+(process.argv.includes('--antes')?'antes':'despues'));fs.mkdirSync(dir,{recursive:true});
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
const click=s=>evaluar(q(s)+'.click()');
const value=(s,v,tipo='input')=>evaluar(`(()=>{const n=${q(s)};n.value=${JSON.stringify(v)};n.dispatchEvent(new Event(${JSON.stringify(tipo)},{bubbles:true}));})()`);
const text=s=>evaluar(q(s)+'.textContent.replace(/\\s+/g," ").trim()');

const captura=async nombre=>fs.writeFileSync(path.join(dir,nombre),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));



(async()=>{try{
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const {targetInfos}=await cdp('Target.getTargets',{},true);({sessionId}=await cdp('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},true));await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['https://*']});
await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`{const Original=Date;globalThis.Date=class extends Original{constructor(...a){super(...(a.length?a:['2026-11-13T15:00:00Z']))}static now(){return +new Original('2026-11-13T15:00:00Z')}}}`});
const medidas=[];
for(const ancho of [375,1440])for(const modo of ['claro','oscuro']){
 await cdp('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:ancho===375});await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:modo==='claro'?'light':'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});await cdp('Page.navigate',{url:'http://127.0.0.1:'+port+'/.cache/nativa-qa.html'});await esperar("typeof showMainApp==='function'");
 await evaluar(`supabaseClient=null;currentUser=null;S=normalize({...freshState(),tenant:'uc',carrera:'ING-PC',userName:'Estudiante sintético',onboardingDone:true,modo:${JSON.stringify(modo)},ramos:[{id:'qa-ramo',nombre:'Curso sintético',sigla:'SYN101',creditos:10,color:'#0d7a6b',categorias:[{id:'qa-prueba',nombre:'Prueba',peso:50,notas:[{id:'qa-nota',nombre:'Prueba',peso:1,valor:5.2}]},{id:'qa-examen',nombre:'Evaluación próxima',peso:50,notas:[],fecha:'2026-11-15',hora:'10:00'}]}]});applyTheme();ocultarCargaInicial();showMainApp();document.getElementById('arranque')?.remove();`);await delay(700);
 assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
 assert.equal(await evaluar("document.documentElement.classList.contains('app-nativa')"),false);
 medidas.push(await evaluar(`({ancho:${ancho},modo:${JSON.stringify(modo)},texto:document.getElementById('screen-home').innerText,body:getComputedStyle(document.body).overflow,alto:document.querySelector('.topbar').getBoundingClientRect().height})`));
 await captura('web-'+ancho+'-'+modo+'.png');
}
if(!process.argv.includes('--antes')){
 // La misma página real: movimiento reducido y hoja con fondo inmóvil.
 await evaluar("document.documentElement.classList.add('app-nativa');openSettings()");await delay(100);
 assert.equal(await evaluar("getComputedStyle(document.querySelector('#screen-home>.scroll')).overflowY"),'hidden','la hoja bloquea el fondo solo en la app');
 assert.equal(await evaluar("getComputedStyle(document.querySelector('.modal-sheet')).transitionDuration"),'0s','hoja sin desplazamiento con Reducir movimiento');
 assert(await evaluar("parseFloat(getComputedStyle(document.getElementById('settings-search')).fontSize)>=16"),'campo de hoja de al menos 16 px, sin zoom');
}
const base=path.resolve('.cache/ios-sensacion/antes');
if(!process.argv.includes('--antes')){
 assert.deepEqual(medidas,JSON.parse(fs.readFileSync(path.join(base,'medidas.json'))),'web: texto y geometría iguales');
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.png')))assert.deepEqual(fs.readFileSync(path.join(dir,f)),fs.readFileSync(path.join(base,f)),'web idéntica píxel a píxel: '+f);
 console.log('PASS web sin cambios: 375/1440 claro/oscuro, capturas idénticas y sin scroll horizontal.');
}else{fs.writeFileSync(path.join(dir,'medidas.json'),JSON.stringify(medidas));console.log('BASE web capturada: 375/1440 claro/oscuro.');}
}finally{server.close();browser.kill();await delay(300);try{fs.rmSync(perfilTemporal,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}})().catch(e=>{console.error(e);process.exitCode=1;});
