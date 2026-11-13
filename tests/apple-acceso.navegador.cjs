// node tests/apple-acceso.navegador.cjs — Chrome real, CSP y servicios sintéticos.
const {spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {setTimeout:delay}=require('node:timers/promises');const raiz=path.resolve(__dirname,'..');process.chdir(raiz);fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');fs.writeFileSync('.cache/apple-qa.html',html);
const csp=fs.readFileSync('_headers','utf8').match(/^\s*Content-Security-Policy: (.+)$/m)[1];
const server=http.createServer((req,res)=>{const f=path.resolve('.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(raiz+'/')){res.writeHead(404).end();return;}try{const contenido=fs.readFileSync(f);res.writeHead(200,{'Content-Type':({html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',json:'application/json'})[path.extname(f).slice(1)]||'application/octet-stream','Content-Security-Policy':csp});res.end(contenido);}catch{res.writeHead(404).end();}});
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-apple-'));
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
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/apple-acceso');fs.mkdirSync(dir,{recursive:true});
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
const click=s=>evaluar(q(s)+'.click()');
const value=(s,v,tipo='input')=>evaluar(`(()=>{const n=${q(s)};n.value=${JSON.stringify(v)};n.dispatchEvent(new Event(${JSON.stringify(tipo)},{bubbles:true}));})()`);
const text=s=>evaluar(q(s)+'.textContent.replace(/\\s+/g," ").trim()');

const captura=async nombre=>fs.writeFileSync(path.join(dir,nombre),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));


(async()=>{try{
await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
const {targetInfos}=await cdp('Target.getTargets',{},true);({sessionId}=await cdp('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},true));await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['https://*']});
for(const ancho of [1440,375])for(const modo of ['claro','oscuro']){
 await cdp('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:ancho===375});await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:modo==='claro'?'light':'dark'},{name:'prefers-reduced-motion',value:'reduce'}]});await cdp('Page.navigate',{url:'http://127.0.0.1:'+port+'/.cache/apple-qa.html'});await esperar("typeof signInWithProvider==='function'");
 await evaluar(`currentUser=null;S=normalize({...freshState(),modo:${JSON.stringify(modo)}});aplicarModo();ocultarCargaInicial();supabaseClient={auth:{signInWithOAuth:async a=>{window.oauthQA=a;return {data:{}}}},rpc:async()=>({data:null})};window.fetch=async()=>({ok:true,json:async()=>({external:{apple:true}})});recordarMetodoLogin('apple');showAuthScreen();marcarUltimoLogin();`);await delay(500);
 assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
 const geometria=await evaluar(`(()=>{const a=document.getElementById('btn-apple').getBoundingClientRect(),g=document.getElementById('btn-google').getBoundingClientRect();return {a:{w:a.width,h:a.height,y:a.y},g:{w:g.width,h:g.height,y:g.y}}})()`);assert.equal(geometria.a.w,geometria.g.w);assert.equal(geometria.a.h,geometria.g.h,'igual altura');assert.ok(geometria.a.h>=44&&geometria.a.y<geometria.g.y);
 const colores=await evaluar("(()=>{const c=getComputedStyle(document.getElementById('btn-apple'));return [c.backgroundColor,c.color]})()");assert.deepEqual(colores,modo==='claro'?['rgb(0, 0, 0)','rgb(255, 255, 255)']:['rgb(255, 255, 255)','rgb(0, 0, 0)']);
 assert.ok(await evaluar("[...document.querySelectorAll('#btn-apple img')].every(i=>i.complete&&i.naturalWidth>0)"),'arte local carga con CSP');
 await evaluar("document.getElementById('btn-google').focus()");await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluar("document.activeElement.id"),'btn-apple');assert.ok(await evaluar("parseFloat(getComputedStyle(document.getElementById('btn-apple')).outlineWidth)>=2"));await captura('login-'+ancho+'-'+modo+'.png');
 await click('#btn-apple');await esperar("!!window.oauthQA");assert.equal(await evaluar('oauthQA.provider'),'apple');
 await evaluar("reactivarBotonesOAuth();window.fetch=async()=>({ok:true,json:async()=>({external:{apple:false}})})");await click('#btn-apple');await esperar("document.getElementById('auth-error').textContent.includes('todavía no está disponible')");assert.equal(await evaluar("document.getElementById('btn-apple').disabled"),false);
 await evaluar("document.documentElement.style.fontSize='200%'");assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false,'texto 200% sin scroll horizontal');
}
console.log('PASS navegador Apple: 375/1440 claro/oscuro, orden, igual tamaño ≥44 px, colores 21:1, arte con CSP, foco, marca y errores de configuración.');
}finally{server.close();browser.kill();await delay(300);try{fs.rmSync(perfilTemporal,{recursive:true,force:true,maxRetries:5,retryDelay:100})}catch{}}})().catch(e=>{console.error(e);process.exitCode=1;});
