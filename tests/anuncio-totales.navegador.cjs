// QA de métricas Profesor/Admin reales, solo datos sintéticos. Requiere npm run build y Chrome.
// node tests/anuncio-totales.navegador.cjs
const {spawn}=require('node:child_process'), fs=require('node:fs'), assert=require('node:assert/strict'),path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');
const os=require('node:os');
const raiz=path.resolve(__dirname,'..');process.chdir(raiz);
fs.mkdirSync('.cache',{recursive:true});
let html=fs.readFileSync('index.html','utf8').replace('<head>','<head><base href="'+require('node:url').pathToFileURL(raiz+'/').href+'">');
html=html.replace(/<script src="https:\/\/cdn[.]jsdelivr[.]net\/[^>]*>\s*<\/script>/g,'');
html=html.replace('<script src="app-session.js?v=__ASSET_VERSION__"></script>','<script src="app-session.js?v=__ASSET_VERSION__"></script><script>document.removeEventListener("DOMContentLoaded",boot);</script>');
fs.writeFileSync('.cache/anuncio-totales-qa.html',html);
const ejecutable=process.env.CHROME_PATH||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
assert.ok(ejecutable,'Configura CHROME_PATH con un Chrome local para esta QA');
const perfilTemporal=fs.mkdtempSync(path.join(os.tmpdir(),'gh-anuncio-totales-'));
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
const dir=process.env.GH_QA_OUTPUT||path.resolve('.cache/anuncio-totales');fs.mkdirSync(dir,{recursive:true});
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
  await cdp('Page.navigate',{url:'file://'+path.resolve('.cache/anuncio-totales-qa.html')});await esperar("typeof metricasDeAnuncio==='function'");
  await evaluar(`window.errores=[];window.addEventListener('error',e=>errores.push(e.message));window.rpcsQA=[];window.rolQA='profesor';window.sinSQL=false;
   window.perfilQA={id:'00000000-0000-4000-8000-000000000001',user_id:'00000000-0000-4000-8000-000000000001',nombre_publico:'Docente de prueba',nombre:'Docente de prueba',estado:'aprobado',universidades:['uc'],tipo_perfil:'profesor',presentacion:'Perfil sintético para verificar las métricas de anuncios.',ramos_siglas:['TEST100']};
   window.campanaQA={dias:14,tope_clp:50000,dias_cobrados:7,vistas:120,aperturas:40,contactos:7,costo:10900,agotada:false};
   window.avisoQA={id:'00000000-0000-4000-8000-000000000010',autor_id:perfilQA.id,tenant:'uc',titulo:'Taller de prueba · datos sintéticos',descripcion:'Anuncio ficticio para revisar las cifras de vistas, aperturas y contactos.',ramos_siglas:['TEST100'],precio_clp:15000,estado:'publicado',publicado_at:new Date(Date.now()-7*864e5).toISOString(),vence_at:new Date(Date.now()+7*864e5).toISOString(),campana:campanaQA,criterios:{},configuracion_campana:{dias:14,tope_clp:50000},cobros:[]};
   window.eventosQA={anterior:false,desde:avisoQA.publicado_at,cada_vez_desde:avisoQA.publicado_at,impresion:320,clic:85,contacto:null};
   window.historialQA=[35,41,56,37,62,43,46].map((n,i)=>({anuncio_id:avisoQA.id,publicacion:avisoQA.publicado_at,dia:diaMetricasChile(Date.now()-(6-i)*864e5),vistas:[12,15,21,14,24,16,18][i],aperturas:[4,5,8,6,7,4,6][i],contactos:1,vistas_total:n,aperturas_total:[7,9,14,12,18,11,14][i],contactos_total:[1,2,1,2,1,2,2][i]}));
   currentUser={id:perfilQA.id};supabaseClient={from:()=>({select(){return this},eq(){return this},async maybeSingle(){return {data:perfilQA,error:null}}}),
    auth:{mfa:{listFactors:async()=>({data:{totp:[{id:'factor-sintetico',status:'verified'}]}}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}},
    rpc:async(n,p)=>{rpcsQA.push({n,p});if(sinSQL&&['resumen_eventos_anuncio','admin_historial_anuncios'].includes(n))return {data:null,error:{code:'PGRST202',message:'function missing'}};
     const datos={mis_anuncios_profesor:[avisoQA],campana_anuncio_con_tarifa:[campanaQA],campana_anuncio:[campanaQA],alcance_anuncio:120,alcance_anuncio_por_canal:[{canal:'lista',cuentas:120}],resumen_metricas_anuncio:[],totales_metricas_anuncio:[],historial_anuncio:historialQA.map(d=>({dia:d.dia,vistas:d.vistas,aperturas:d.aperturas,contactos:d.contactos})),resumen_eventos_anuncio:{...eventosQA,contacto:rolQA==='admin'?11:null},admin_panel_clases:[{...perfilQA,anuncios:[avisoQA]}],admin_historial_anuncios:historialQA,admin_alcance_diario:[],admin_anuncio_publico:{total_activos:300,con_ramo:200},admin_reportes_programa:[],admin_encuestas:[]};return {data:datos[n]??[],error:null};}};
   S=normalize({...freshState(),tenant:'uc',tipoCuenta:'profesor',onboardingDone:true,userName:'Cuenta sintética',ramos:[],historial:[]});S.modo=${JSON.stringify(modo)};aplicarModo();
   perfilProfesorCache=perfilQA;perfilProfesorResuelto=true;vistaClasesActual='anuncios';showMainApp();`);
  await esperar("!!document.querySelector('[data-profesor-anuncio] .clase-par')");
  await evaluar("document.querySelector('[data-profesor-anuncio]').open=true;document.querySelector('[data-profesor-anuncio]').scrollIntoView({block:'start'})");await delay(400);
  assert.match(await text('[data-profesor-anuncio]'),/320/);assert.match(await text('[data-profesor-anuncio]'),/85/);
  assert.equal(await evaluar("document.querySelectorAll('[data-profesor-anuncio] .clase-par')[2].textContent"),'7personas distintas/—en total');
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  await captura('anuncio-profesor-'+ancho+'-'+modo+'.png');
  // Misma app y RPC, ahora sesión administrativa con MFA sintética.
  await evaluar("rolQA='admin';soyAdministradorCache=true;recalcularNavTabs();showTab('admin')");
  await esperar("!!document.querySelector('[data-pe-admin-alcance] [data-adm-metrica]')");
  assert.match(await text('[data-pe-admin-alcance]'),/320/);assert.match(await text('[data-pe-admin-alcance]'),/85/);
  await captura('anuncio-admin-resumen-'+ancho+'-'+modo+'.png');
  await click('[data-admin-fila] > summary');
  await click('[data-admin-estadisticas]');
  await esperar("!!document.querySelector('[data-admin-fila] .clase-par')");
  await evaluar("(()=>{const c=document.getElementById('admin-estadisticas-'+avisoQA.id),s=c.closest('.scroll');s.scrollTop+=c.getBoundingClientRect().top-s.getBoundingClientRect().top-20})()");await delay(400);
  assert.match(await text('[data-admin-fila] .clase-etapas'),/11en total/);
  assert.equal(await evaluar('document.documentElement.scrollWidth>innerWidth'),false);
  await captura('anuncio-admin-'+ancho+'-'+modo+'.png');
  // SQL sin instalar: el detalle sigue disponible y no inventa totales.
  const legado=await evaluar("(async()=>{sinSQL=true;const m=await metricasDeAnuncio(avisoQA);return {eventos:m.eventos,error:m.error,html:cifrasClase(prepararMetricasClase(avisoQA,m),String)}})()");
  assert.equal(legado.eventos,null);assert.equal(legado.error,false);assert.match(legado.html,/total de veces aún no está disponible/);assert.doesNotMatch(legado.html,/<small>en total/);
  assert.deepEqual(await evaluar('errores'),[]);
  console.log(ancho,modo,'OK: profesor privado, admin sin umbral, totales diarios, SQL ausente, sin scroll horizontal');
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser.kill());
