// El HTML no debe adelantar el login mientras la sesión o los ramos siguen
// pendientes. Promesas controladas prueban cada salida sin esperas artificiales.
const fs = require('fs'), vm = require('vm');
const raiz = __dirname + '/../';
const src = ['data.js', 'engine.js', 'app.js', 'app-session.js', 'render-agenda.js']
  .map(f => fs.readFileSync(raiz + f, 'utf8')).join('\n');

function classList(inicial){
  const clases=new Set(inicial||[]);
  return {add(...xs){xs.forEach(x=>clases.add(x));},remove(...xs){xs.forEach(x=>clases.delete(x));},contains(x){return clases.has(x);}};
}
const html=fs.readFileSync(raiz+'index.html','utf8');
const ids={};
['loading','auth','home','stats','agenda','ramo','onboard','reset','app-error'].forEach(id=>{
  ids['screen-'+id]={style:{},classList:classList(new RegExp('id=\"screen-'+id+'\" class=\"screen[^\"]* active\"').test(html)?['active']:[]),textContent:'',setAttribute(){},removeAttribute(){}};
});
ids['carga-inicial-detalle']={textContent:'Comprobando tu sesión…'};
ids['carga-inicial-reintentar']={hidden:true,addEventListener(event,fn){if(event==='click')this.accion=fn;}};
ids['bottom-nav']={style:{display:'flex'},classList:classList()};
ids['app-error-title']={style:{},classList:classList(),textContent:''};
ids['app-error-desc']={style:{},classList:classList(),textContent:''};
const stub={style:{setProperty(){},removeProperty(){}},classList:classList(),addEventListener(){},appendChild(){},value:'',innerHTML:'',textContent:'',focus(){},select(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},querySelector(){return stub;},querySelectorAll(){return[];},clientWidth:400,dataset:{},click(){}};
const appEl={style:{},classList:classList(['tab-mode'])};
const eventos=[];
const programados=[];
let recargas=0;
const ctx={
  window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
  document:{getElementById:id=>ids[id]||stub,createElement:()=>stub,addEventListener(){},documentElement:{style:{setProperty(){},removeProperty(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null;}},querySelector:q=>q==='.app'?appEl:stub,querySelectorAll:()=>[],body:stub},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},
  location:{origin:'',pathname:'/',search:'',hash:'',reload(){recargas++;}},history:{replaceState(){}},
  gtag:(accion,evento,params)=>eventos.push({accion,evento,params}),
  setTimeout:(fn,ms)=>{programados.push({fn,ms,cancelado:false});return programados.length;},
  clearTimeout:id=>{if(programados[id-1])programados[id-1].cancelado=true;},console,
};
vm.createContext(ctx);vm.runInContext(src,ctx);


const assert=require('node:assert/strict');
const activa=id=>ids['screen-'+id].classList.contains('active');
const diferida=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function iniciar(local=false,listo=true){
  ['loading','auth','home','onboard','reset','app-error'].forEach(id=>ids['screen-'+id].classList.remove('active'));
  ids['screen-loading'].classList.add('active');
  ids['carga-inicial-detalle'].textContent='Comprobando tu sesión…';
  ids['carga-inicial-reintentar'].hidden=true;
  ctx.sesion=diferida();ctx.carga=diferida();
  vm.runInContext(`
    currentUser=null;enRecuperacion=false;S={...freshState(),onboardingDone:${listo}};
    supabaseClient={auth:{onAuthStateChange(fn){window.eventoAuth=fn;},getSession:()=>sesion.promise}};
    showMainApp=()=>document.getElementById('screen-home').classList.add('active');
    obIniciar=()=>{};
    afterLogin=async()=>{await carga.promise;if(S.onboardingDone)enterApp();else enterOnboarding();};
    if(${local})supabaseClient=null;
  `,ctx);
  return vm.runInContext('boot()',ctx);
}
async function main(){
  assert.ok(activa('loading'),'antes de comprobar sesión hay carga');
  assert.ok(!activa('auth'),'el HTML inicial no adelanta un logout');
  let arranque=iniciar();
  assert.ok(activa('loading')&&!activa('auth'),'sesión lenta no muestra login');
  const aviso=programados.findLast(t=>t.ms===12000&&!t.cancelado);
  assert.ok(aviso,'la espera tiene un aviso si se demora');
  aviso.fn();
  assert.ok(!ids['carga-inicial-reintentar'].hidden&&/recarga/.test(ids['carga-inicial-detalle'].textContent),'tras 12 s ofrece recargar sin mostrar login');
  ids['carga-inicial-reintentar'].accion();
  assert.equal(recargas,1,'Recargar reinicia la visita');
  ctx.sesion.resolve({data:{session:{user:{id:'cuenta-sintetica'}}}});
  await new Promise(setImmediate);
  assert.ok(activa('loading')&&!activa('home'),'ramos pendientes mantienen carga');
  assert.equal(ids['carga-inicial-detalle'].textContent,'Preparando tu semestre…');
  ctx.carga.resolve();await arranque;
  assert.ok(activa('home')&&!activa('loading'),'entra apenas la carga termina');

  arranque=iniciar();ctx.sesion.resolve({data:{session:null}});await arranque;
  assert.ok(activa('auth')&&!activa('loading'),'sin sesión muestra login');

  arranque=iniciar();vm.runInContext('S.onboardingDone=false',ctx);
  ctx.sesion.resolve({data:{session:{user:{id:'cuenta-nueva-sintetica'}}}});ctx.carga.resolve();await arranque;
  assert.ok(activa('onboard')&&!activa('loading'),'cuenta nueva entra al onboarding');

  arranque=iniciar();ctx.sesion.reject(new Error('Network request failed'));await arranque;
  assert.ok(activa('app-error')&&!activa('loading'),'error de sesión permite recargar');
  arranque=iniciar();ctx.sesion.resolve({data:{session:{user:{id:'cuenta-sintetica'}}}});
  ctx.carga.reject(new TypeError('fallo sintético'));await arranque;
  assert.ok(activa('app-error')&&!activa('loading'),'error al abrir reemplaza la carga');

  arranque=iniciar();ctx.window.eventoAuth('PASSWORD_RECOVERY',{user:{id:'cuenta-sintetica'}});
  assert.ok(activa('reset')&&!activa('loading'),'recuperación durante espera abre contraseña');
  ctx.sesion.resolve({data:{session:{user:{id:'cuenta-sintetica'}}}});await arranque;
  assert.ok(activa('reset')&&!activa('auth')&&!activa('home'),'recuperación no salta al semestre');

  for(const listo of [true,false]){
    await iniciar(true,listo);
    assert.ok(activa(listo?'home':'onboard')&&!activa('loading'),'modo local conserva su destino');
  }
  console.log('Carga inicial: sesión y datos lentos, login, cuenta nueva, errores, recuperación y modo local OK');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
