// QA de horario e Inicio reales, solo datos sintéticos. Requiere npm run build y Chrome.
// node tests/clases-hoy.navegador.cjs
const {spawn}=require('node:child_process'), fs=require('node:fs'), assert=require('node:assert/strict'),path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const os=require('node:os');
const raiz=path.resolve(__dirname,'..');process.chdir(raiz);
fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="'+require('node:url').pathToFileURL(raiz+'/').href+'">');
html=html.replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');
fs.writeFileSync('.cache/clases-hoy-qa.html',html);
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-clases-hoy-'));
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
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/clases-hoy');fs.mkdirSync(dir,{recursive:true});
const q=s=>`document.querySelector(${JSON.stringify(s)})`;
const click=s=>evaluar(q(s)+'.click()');
const value=(s,v,tipo='input')=>evaluar(`(()=>{const n=${q(s)};n.value=${JSON.stringify(v)};n.dispatchEvent(new Event(${JSON.stringify(tipo)},{bubbles:true}));})()`);
const text=s=>evaluar(q(s)+'.textContent.replace(/\\s+/g," ").trim()');

const captura=async nombre=>fs.writeFileSync(path.join(dir,nombre),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));

(async()=>{
 const {targetInfos}=await cdp('Target.getTargets',{},true);
 ({sessionId}=await cdp('Target.attachToTarget',{targetId:targetInfos.find(t=>t.type==='page').targetId,flatten:true},true));
 await cdp('Emulation.setLocaleOverride',{locale:'es-CL'});await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setBlockedURLs',{urls:['http://*','https://*']});
 for(const ancho of [1440,375])for(const modo of ['claro','oscuro']){
  await cdp('Emulation.setDeviceMetricsOverride',{width:ancho,height:1000,deviceScaleFactor:1,mobile:ancho===375});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-color-scheme',value:modo==='claro'?'light':'dark'}]});
  await cdp('Page.navigate',{url:'file://'+path.resolve('.cache/clases-hoy-qa.html')});await esperar("typeof resumenHorarioClases==='function'");
  await evaluar(`window.errores=[];window.addEventListener('error',e=>errores.push(e.message));currentUser=null;supabaseClient=null;
   S=normalize({...freshState(),tenant:'uai',tipoCuenta:'estudiante',onboardingDone:true,userName:'Cuenta sintética',ramos:[
    {id:'sintetico-a',nombre:'Cálculo sintético',sigla:'SYN100',creditos:10,categorias:[{id:'eva-a',nombre:'Prueba sintética',peso:100,notas:[{id:'nota-a',valor:5.2,peso:1}]}]},
    {id:'sintetico-b',nombre:'Álgebra sintética',sigla:'SYN200',creditos:10,categorias:[{id:'eva-b',nombre:'Prueba sintética',peso:100,notas:[]}]}
   ],historial:[]});S.modo=${JSON.stringify(modo)};aplicarModo();ocultarCargaInicial();showMainApp();
   window.fechaQA=fechaHorarioChile(new Date());window.ahoraQA=new Date(instanteHorarioChile(fechaQA,'10:15'));
   window.diaQA=['D','L','M','W','J','V','S'][new Date(fechaQA+'T12:00:00Z').getUTCDay()];`);
  assert.equal(await evaluar("!!document.querySelector('.clases-hoy')"),false,'estado antiguo no muestra tarjeta vacía');
  await evaluar("openRamo('sintetico-a')");await esperar("!!document.querySelector('[data-editar-horario]')");await click('[data-editar-horario]');
  await esperar("!!document.querySelector('.horario-editor')");
  assert.equal(await evaluar("document.querySelector('input[name=inicio]').type"),'time');
  await value('input[name=inicio]','10:00','change');await value('input[name=fin]','09:00','change');
  await evaluar("document.querySelector('input[name=dia][value='+diaQA+']').click();document.querySelector('.horario-editor').requestSubmit()");
  assert.match(await text('.horario-error'),/posterior/);assert.equal(await evaluar("Object.hasOwn(S.ramos[0],'horario')"),false);
  await value('input[name=inicio]','09:40','change');await value('input[name=fin]','10:50','change');await value('input[name=sala]','K201');await value('input[name=tipo]','CLAS');
  await click('input[name=dia][value=L]');await click('input[name=dia][value=W]');
  // Asegura hoy seleccionado, además de los dos días sintéticos de prueba.
  await evaluar("document.querySelector('input[name=dia][value='+diaQA+']').checked=true");
  await click('[data-copiar]');assert.equal(await evaluar("document.querySelectorAll('[data-horario-bloque]').length"),2);
  assert.equal(await evaluar("document.querySelectorAll('[name=sala]')[1].value"),'K201');
  const dos=await evaluar("[...document.querySelectorAll('[data-horario-bloque]')].map(r=>r.dataset.horarioBloque)");assert.notEqual(dos[0],dos[1]);
  await value('[data-horario-bloque]:last-child input[name=inicio]','12:20','change');await value('[data-horario-bloque]:last-child input[name=fin]','13:30','change');await value('[data-horario-bloque]:last-child input[name=sala]','B102');
  await evaluar("document.querySelector('.horario-editor').requestSubmit()");await esperar("!document.querySelector('#modal').classList.contains('open')");
  assert.equal(await evaluar('S.ramos[0].horario.length'),2);assert.equal(await evaluar("S.ramos[0].categorias[0].notas[0].valor"),5.2);
  // Guardado y recarga pasan por las funciones reales de persistencia.
  assert.equal(await evaluar("loadData().data.ramos[0].horario.length"),2);
  await click('[data-editar-horario]');await esperar("!!document.querySelector('.horario-editor')");
  await value('[data-horario-bloque] input[name=sala]','No se guarda');await click('[data-cancelar-horario]');
  assert.equal(await evaluar('S.ramos[0].horario[0].sala'),'K201','cancelar conserva dato guardado');
  await click('[data-editar-horario]');await esperar("!!document.querySelector('.horario-editor')");
  await evaluar("document.querySelector('.modal-sheet').scrollTop=0");await delay(3000);
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  await captura('horario-editor-'+ancho+'-'+modo+'.png');
  const ratios=await evaluar(`(()=>{const lum=c=>{const rgb=c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);const bg=getComputedStyle(document.querySelector('.modal-sheet')).backgroundColor,dia=getComputedStyle(document.querySelector('.horario-dias input:checked+span'));return [ratio(getComputedStyle(document.querySelector('.horario-editor')).color,bg),ratio(getComputedStyle(document.querySelector('.horario-campos small')).color,bg),ratio(dia.color,dia.backgroundColor)];})()`);
  assert.ok(ratios.every(n=>n>=4.5),'contraste de texto y selección ≥4,5:1: '+ratios);
  // Texto al 200% sin recortes ni controles menores de 44.
  await evaluar("document.documentElement.style.fontSize='200%'");
  assert.equal(await evaluar("document.querySelector('.modal-sheet').scrollWidth>document.querySelector('.modal-sheet').clientWidth+1"),false);
  assert.equal(await evaluar("[...document.querySelectorAll('.horario-editor button,.horario-editor input[type=time],.horario-dias label')].every(n=>n.getBoundingClientRect().height>=44)"),true);
  await evaluar("document.documentElement.style.fontSize='';document.querySelector('[data-cancelar-horario]').click();showTab('home');renderClasesHoy(ahoraQA)");await delay(350);
  assert.match(await text('.clases-hoy'),/Hasta las 10:50/);assert.match(await text('.clases-hoy'),/12:20/);assert.match(await text('.clases-hoy'),/K201/);
  await evaluar("document.querySelector('.clases-hoy').scrollIntoView({block:'center'})");await delay(150);
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  await captura('clases-hoy-inicio-'+ancho+'-'+modo+'.png');
  await evaluar("document.documentElement.style.fontSize='200%'");
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  assert.equal(await evaluar("[...document.querySelectorAll('.clases-hoy button')].every(n=>n.getBoundingClientRect().height>=44)"),true);
  await evaluar("document.documentElement.style.fontSize='';document.querySelector('[data-clase-ramo]').click()");
  assert.equal(await evaluar('currentRamoId'),'sintetico-a');
  // Un cambio remoto mientras edita no se pisa al guardar.
  await click('[data-editar-horario]');await evaluar("S.ramos[0].horario[0].sala='Cambio de otro dispositivo';document.querySelector('.horario-editor').requestSubmit()");assert.match(await text('.horario-error'),/cambió/);
  await click('[data-cancelar-horario]');
  assert.deepEqual(await evaluar('errores'),[]);
  console.log(ancho,modo,'OK: cuenta antigua, multidía, horas nativas, validación, copia, cancelar/guardar, recarga, ficha, conflicto, 200%, 44px y sin scroll horizontal');
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser.kill());
