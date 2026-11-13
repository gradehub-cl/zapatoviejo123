// QA real con pdf.js, CSP de producción y servicios sintéticos. npm run build; node tests/programas-pdf.navegador.cjs
const {spawn}=require('node:child_process'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {setTimeout:delay}=require('node:timers/promises');
const raiz=path.resolve(__dirname,'..');process.chdir(raiz);fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="/">').replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');
fs.writeFileSync('.cache/programas-qa.html',html);
// Un PDF mínimo y válido; nunca incluye información de una persona.
function pdf(texto){const cuerpos=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];const stream=texto?'BT /F1 12 Tf 40 700 Td ('+texto+') Tj ET':'';cuerpos.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');let s='%PDF-1.4\n',offsets=[0];cuerpos.forEach((c,i)=>{offsets.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+c+'\nendobj\n';});const x=Buffer.byteLength(s);s+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF';return s;}
fs.writeFileSync('.cache/programa-sintetico.pdf',pdf('Programa sintetico - Prueba 100%'));fs.writeFileSync('.cache/escaneo-sintetico.pdf',pdf(''));fs.writeFileSync('.cache/no-pdf.pdf','archivo sintetico que no es PDF');
const csp=fs.readFileSync('_headers','utf8').match(/^\s*Content-Security-Policy: (.+)$/m)[1];
const server=http.createServer((req,res)=>{const f=path.resolve('.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(raiz+'/')){res.writeHead(404).end();return;}try{const contenido=fs.readFileSync(f);res.writeHead(200,{'Content-Type':({html:'text/html',js:'text/javascript',mjs:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',json:'application/json',pdf:'application/pdf'})[path.extname(f).slice(1)]||'application/octet-stream','Content-Security-Policy':csp});res.end(contenido);}catch{res.writeHead(404).end();}});
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-programas-'));
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
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/programas-pdf');fs.mkdirSync(dir,{recursive:true});
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
const click=s=>evaluar(q(s)+'.click()');
const value=(s,v,tipo='input')=>evaluar(`(()=>{const n=${q(s)};n.value=${JSON.stringify(v)};n.dispatchEvent(new Event(${JSON.stringify(tipo)},{bubbles:true}));})()`);
const text=s=>evaluar(q(s)+'.textContent.replace(/\\s+/g," ").trim()');

const captura=async nombre=>fs.writeFileSync(path.join(dir,nombre),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));


const escoger=async archivo=>{const {root}=await cdp('DOM.getDocument');const {nodeId}=await cdp('DOM.querySelector',{nodeId:root.nodeId,selector:'.programa-pdf-form input[type=file]'});await cdp('DOM.setFileInputFiles',{nodeId,files:[path.resolve('.cache/'+archivo)]});};
const semilla=`currentUser=null;supabaseClient=null;S=normalize({...freshState(),tenant:'udd',tipoCuenta:'estudiante',onboardingDone:true,userName:'Cuenta sintética',carrera:'Carrera sintética',ramos:[{id:'ramo-sintetico',nombre:'Curso sintético',sigla:'SYN100',creditos:10,categorias:[{id:'eva',nombre:'Prueba sintética',peso:100,notas:[{id:'n1',valor:5.2,peso:1}]}]}],historial:[]});ocultarCargaInicial();showMainApp();currentUser={id:'00000000-0000-4000-8000-000000000001'};window.registros=[];window.llamadas=[];window.cargas=[];window.duplicadoQA=false;supabaseClient={rpc:async(n,p)=>{llamadas.push([n,p]);if(n==='mis_programas_enviados')return {data:registros};if(n==='programa_ya_recibido')return {data:duplicadoQA};if(n==='enviar_programa'){registros=[{id:'pdf-sintetico',estado:'pendiente'}];return {data:{id:'pdf-sintetico'}};}if(n==='admin_programas_enviados')return {data:[{id:'pdf-sintetico',ramo:'Curso sintético',tenant:'udd',sigla:'SYN100',periodo:'2026-2',ruta:'sintetico.pdf',paginas:1,con_texto:true}]};if(n==='admin_revisar_programa')return {data:true};return {data:[]};},storage:{from:()=>({upload:async(r,f)=>{cargas.push({r,bytes:f.size});return {data:{}}},remove:async()=>({data:[]}),createSignedUrl:async(r,d)=>{llamadas.push(['firma',d]);return {data:{signedUrl:location.origin+'/.cache/programa-sintetico.pdf'}}}})}};window.antesQA=JSON.stringify(S.ramos);openRamo('ramo-sintetico');`;
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const {targetInfos}=await cdp('Target.getTargets',{},true);({sessionId}=await cdp('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},true));
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['https://*']});
 for(const ancho of [1440,375])for(const modo of ['claro','oscuro']){
 await cdp('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:ancho===375});await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-color-scheme',value:modo==='claro'?'light':'dark'}]});
 await cdp('Page.navigate',{url:'http://127.0.0.1:'+port+'/.cache/programas-qa.html'});await esperar("typeof abrirProgramaPdf==='function'");await evaluar(semilla);await evaluar('S.modo='+JSON.stringify(modo)+';aplicarModo()');
 await click('.programa-pdf-boton');await escoger('no-pdf.pdf');await esperar("document.querySelector('.programa-pdf-error').textContent.includes('no es un PDF')");assert.equal(await evaluar('cargas.length'),0);
 await escoger('escaneo-sintetico.pdf');await esperar("document.querySelector('.programa-pdf-archivo').textContent.includes('No detectamos texto')");
 await escoger('programa-sintetico.pdf');await esperar("!document.querySelector('.programa-pdf-form [type=submit]').disabled");assert.doesNotMatch(await text('.programa-pdf-archivo'),/No detectamos texto/);
 assert.equal(await evaluar("document.querySelector('[name=tenant]').value"),'udd');assert.equal(await evaluar("document.querySelector('[type=file]').accept"),'application/pdf,.pdf');
 assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
 assert.ok(await evaluar("[...document.querySelectorAll('.programa-pdf-form button,.programa-pdf-elegir,.programa-pdf-campos input,.programa-pdf-campos select')].every(n=>n.getBoundingClientRect().height>=44)"));
 const ratios=await evaluar(`(()=>{const lum=c=>{const rgb=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);const bg=getComputedStyle(document.querySelector('.modal-sheet')).backgroundColor;return ['.programa-pdf-privacidad','.programa-pdf-archivo','.programa-pdf-campos label'].map(s=>ratio(getComputedStyle(document.querySelector(s)).color,bg));})()`);assert.ok(ratios.every(r=>r>=4.5),'contraste mínimo: '+ratios);
 await captura('formulario-'+ancho+'-'+modo+'.png');
 await evaluar("document.documentElement.style.fontSize='32px'");assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false,'texto 200% sin desborde');await evaluar("document.documentElement.style.fontSize=''");
 await evaluar("document.querySelector('.programa-pdf-form').requestSubmit()");await esperar("document.querySelector('.programa-pdf-estado').textContent.includes('en revisión')");assert.equal(await evaluar('JSON.stringify(S.ramos)===antesQA'),true,'cuenta existente conserva notas y pauta');assert.equal(await evaluar('cargas.length'),1);
 await evaluar("document.querySelector('.programa-pdf-ficha').scrollIntoView({block:'center'})");await delay(500);await captura('ficha-'+ancho+'-'+modo+'.png');
 await evaluar("programasFichaCache.clear();registros=[{estado:'descartado',motivo:'No incluye ponderaciones'}];pintarProgramaPdfRamo(S.ramos.find(r=>r.id==='ramo-sintetico'))");await esperar("document.querySelector('.programa-pdf-estado').textContent.includes('No sirvió')");
 await evaluar("duplicadoQA=true");await click('.programa-pdf-boton');await escoger('programa-sintetico.pdf');await esperar("!document.querySelector('.programa-pdf-form [type=submit]').disabled");await evaluar("document.querySelector('.programa-pdf-form').requestSubmit()");await esperar("!document.getElementById('modal').classList.contains('open')");assert.equal(await evaluar('cargas.length'),1,'duplicado no vuelve a transferirse');
 await evaluar("closeModal();document.querySelectorAll('.screen.active').forEach(n=>n.classList.remove('active'));const a=document.getElementById('screen-admin');a.hidden=false;a.classList.add('active');a.style.transform='none';vistaAdmin.area='usuarios';pintarPanelAdmin(document.getElementById('admin-body'))");await esperar("!!document.querySelector('[data-programas-tab=pdf]')");await click('[data-programas-tab=pdf]');await esperar("!!document.querySelector('[data-descargar]')");await evaluar("document.querySelector('[data-programas-tab=pdf]').scrollIntoView({block:'start'})");await delay(500);await captura('admin-'+ancho+'-'+modo+'.png');
 await click('[data-revisar]');assert.match(await text('[data-estado-programa]'),/motivo/);assert.equal(await evaluar("llamadas.some(x=>x[0]==='admin_revisar_programa')"),false);
 await value('[data-motivo]','Pauta revisada y publicada');await click('[data-revisar]');await esperar("llamadas.some(x=>x[0]==='admin_revisar_programa')");
 }
 console.log('PASS navegador: pdf.js real, CSP, PDF inválido/escaneo/texto, metadatos, envío y estado, notas intactas, deduplicación, Admin y motivo, 375/1440 claro/oscuro y texto 200%.');
 }finally{server.close();browser.kill();await delay(300);try{fs.rmSync(perfilTemporal,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{};}})().catch(e=>{console.error(e);process.exitCode=1;});
