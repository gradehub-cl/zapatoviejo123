// Embudo de la calculadora: eventos sin datos académicos y origen de un solo uso.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/../calculadora.html','utf8');
const sesion=fs.readFileSync(__dirname+'/../app-session.js','utf8');
let ok=0,fail=0;
function chk(nombre,si){console.log(`  ${si?'OK  ':'FAIL'} ${nombre}`);si?ok++:fail++;}

function calculadora(){
  const eventos=[],timers=[];
  function el(id,valor=''){
    return {id,value:valor,href:id==='abrir-gradehub'?'https://gradehub.cl/?desde=calculadora':'',
      dataset:{},listeners:{},textContent:'',hidden:false,open:false,
      setAttribute(){},removeAttribute(){},addEventListener(tipo,fn){this.listeners[tipo]=fn;}};
  }
  const ids=Object.fromEntries(['puntaje','total','exigencia','nmin','naprob','nmax','error','nota','etiqueta','detalle','tabla-det','tabla','paso','aviso-paso','ayuda','explicacion','calc','abrir-gradehub'].map(id=>[id,el(id)]));
  ids.nmin.value='1,0';ids.naprob.value='4,0';ids.nmax.value='7,0';
  const botones=[el('50'),el('60')];botones[0].dataset.exigencia='50';botones[1].dataset.exigencia='60';
  const radio=el('aproximar');radio.value='aproximar';
  const truncar=el('truncar');truncar.value='truncar';
  const document={activeElement:null,getElementById:id=>ids[id],
    querySelectorAll:q=>q==='[data-exigencia]'?botones:q==='input[name="redondeo"]'?[radio,truncar]:[],
    querySelector:q=>q==='input[name="redondeo"]:checked'?radio:truncar};
  const location={href:'https://gradehub.cl/calculadora'};
  const ctx={document,location,localStorage:{getItem:()=>null,setItem(){}},
    gtag:(...args)=>eventos.push(args),setTimeout:fn=>timers.push(fn),
    gh_notaDesdePuntaje:(p,t)=>p<=t?{nota:4}:null,gh_tablaPuntaje:()=>({paso:1,ajustado:false,filas:[]})};
  const script=html.match(/<script>\s*(\(function\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script>/);
  if(!script)throw Error('No se encontró el script de la calculadora');
  vm.runInNewContext(script[1],ctx);
  return {ids,eventos,timers,location};
}

function authDesde(query,tipo){
  const almacen=new Map(),eventos=[];
  const helper=sesion.slice(sesion.indexOf("const ORIGEN_ENTRADA_KEY="),sesion.indexOf('function passwordPolicyError'));
  const inicio=sesion.indexOf(`async function ${tipo}()`);
  const fin=tipo==='afterSignup'?sesion.indexOf('async function afterLogin()',inicio):sesion.indexOf('async function syncProfile()',inicio);
  if(inicio<0||fin<0)throw Error('No se encontró el flujo de auth');
  const stop=new Error('detener tras track');
  let urlRestante=null;
  const ctx={location:{search:query.split('#')[0],href:'https://gradehub.cl/'+query},URL,URLSearchParams,
    history:{state:null,replaceState(_estado,_titulo,url){urlRestante=url;}},sessionStorage:{
    getItem:k=>almacen.get(k)||null,setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)},
    track:(...args)=>eventos.push(args),currentUser:{id:'sintetica'},supabaseClient:null,
    aislarCacheEnRegistro:()=>{throw stop;},registrarVisitaDiaria:()=>{throw stop;}};
  ctx.restaurarCacheApartada=()=>{throw stop;};
  vm.createContext(ctx);vm.runInContext(helper+sesion.slice(inicio,fin),ctx);
  return {ctx,almacen,eventos,stop,urlRestante:()=>urlRestante};
}

(async()=>{
  const c=calculadora();
  chk('GA usa el mismo ID y consentimiento denegado de la app',
    html.includes('gtag/js?id=G-TS791S6PDM')&&html.includes("gtag('config', 'G-TS791S6PDM')")&&
    html.includes("analytics_storage: 'denied'")&&html.includes("ad_storage: 'denied'"));
  chk('sin resultado válido no hay evento de cálculo',!c.eventos.some(e=>e[1]==='calculadora_calculo'));
  c.ids.puntaje.value='25';c.ids.total.value='50';c.ids.total.listeners.input();
  c.ids.puntaje.value='30';c.ids.puntaje.listeners.input();
  chk('el primer resultado válido se cuenta una vez por visita',c.eventos.filter(e=>e[1]==='calculadora_calculo').length===1);
  chk('ningún evento contiene puntaje ni nota',!JSON.stringify(c.eventos).match(/"25"|"30"|"50"|"nota"/));
  const click={button:0,preventDefault(){this.prevented=true;}};
  c.ids['abrir-gradehub'].listeners.click.call(c.ids['abrir-gradehub'],click);
  chk('el botón conserva el destino y mide la apertura',click.prevented===true&&c.eventos.at(-1)[1]==='calculadora_abrir_gradehub'&&c.ids['abrir-gradehub'].href.endsWith('/?desde=calculadora'));
  c.timers.at(-1)();
  chk('si GA no responde, el enlace navega igual',c.location.href===c.ids['abrir-gradehub'].href);
  const modificado={button:0,metaKey:true,preventDefault(){this.prevented=true;}};
  c.ids['abrir-gradehub'].listeners.click.call(c.ids['abrir-gradehub'],modificado);
  chk('abrir en otra pestaña conserva el gesto normal',!modificado.prevented);

  for(const tipo of ['afterSignup','afterLogin']){
    const h=authDesde('?desde=calculadora',tipo);
    try{await h.ctx[tipo]();}catch(e){if(e!==h.stop)throw e;}
    const nombre=tipo==='afterSignup'?'signup':'login';
    chk(`${nombre} atribuye solo el origen calculadora`,h.eventos.length===1&&h.eventos[0][0]===nombre&&h.eventos[0][1]?.origen==='calculadora');
    chk(`${nombre} consume el origen una sola vez`,!h.almacen.size&&h.ctx.consumirOrigenEntrada()===undefined);
    chk(`${nombre} limpia la URL para que recargar no lo atribuya otra vez`,h.urlRestante()==='/');
  }
  const conOAuth=authDesde('?code=temporal&desde=calculadora#type=recovery','afterLogin');
  chk('limpiar el origen conserva los parámetros y el fragmento de autenticación',conOAuth.urlRestante()==='/?code=temporal#type=recovery');
  const ajeno=authDesde('?desde=externo','afterSignup');
  chk('un origen arbitrario no entra a la analítica',ajeno.ctx.consumirOrigenEntrada()===undefined&&ajeno.almacen.size===0);
  chk('la política explica la medición y el origen temporal',/calculadora, cálculos[\s\S]*?sesión de la pestaña/.test(fs.readFileSync(__dirname+'/../privacidad.html','utf8')));
  console.log(`\nPASS: ${ok}   FAIL: ${fail}`);
  if(fail)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
