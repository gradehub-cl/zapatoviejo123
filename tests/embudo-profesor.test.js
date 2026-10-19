// Embudo del link de un profesor. Datos sintéticos, sin código ni notas en GA.
const fs=require('fs'),vm=require('vm'),path=require('path');
const raiz=path.join(__dirname,'..'),leer=f=>fs.readFileSync(path.join(raiz,f),'utf8');
let ok=0,fallos=0;
function chk(nombre,si){console.log(`  ${si?'OK  ':'FAIL'} ${nombre}`);si?ok++:fallos++;}
function almacen(){
  const datos=new Map();
  return {datos,getItem:k=>datos.get(k)||null,setItem:(k,v)=>datos.set(k,String(v)),removeItem:k=>datos.delete(k)};
}
function pagina(search){
  const eventos=[],localStorage=almacen(),sessionStorage=almacen(),urls=[];
  const el=()=>({style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){},contains(){return false},toggle(){}},
    addEventListener(){},querySelector(){return el()},querySelectorAll(){return []},appendChild(){},setAttribute(){},
    removeAttribute(){},getAttribute(){return null},focus(){},value:'',innerHTML:'',textContent:'',dataset:{}});
  const modal=el();
  const ctx={window:{addEventListener(){},matchMedia:()=>({matches:true,addEventListener(){},addListener(){}})},
    document:{getElementById:id=>id==='modal-content'?modal:el(),createElement:el,addEventListener(){},documentElement:el(),body:el(),querySelector:()=>null,querySelectorAll:()=>[]},
    localStorage,sessionStorage,gtag:(...a)=>eventos.push(a),navigator:{},
    location:{origin:'https://gradehub.cl',pathname:'/',hash:'',search},
    history:{replaceState:(_s,_t,url)=>urls.push(url)},URLSearchParams,
    setTimeout:f=>{f();return 1},clearTimeout(){},console,URL};
  vm.createContext(ctx);
  vm.runInContext(['data.js','engine.js','app.js'].map(leer).join('\n'),ctx);
  vm.runInContext("const ORIGEN_ENTRADA_KEY='gradehub_origen_entrada';var supabaseClient=null;var currentUser=null;",ctx);
  vm.runInContext(leer('marketplace.js'),ctx);
  return {ctx,eventos,localStorage,sessionStorage,urls,run:s=>vm.runInContext(s,ctx)};
}
function auth(tipo,origen){
  const sesion=leer('app-session.js'),eventos=[],sessionStorage=almacen();
  if(origen)sessionStorage.setItem('gradehub_origen_entrada',origen);
  const helper=sesion.slice(sesion.indexOf('const ORIGEN_ENTRADA_KEY='),sesion.indexOf('function passwordPolicyError'));
  const inicio=sesion.indexOf(`async function ${tipo}()`);
  const fin=sesion.indexOf(tipo==='afterSignup'?'async function afterLogin()':'async function syncProfile()',inicio);
  const stop=new Error('detener tras track');
  const ctx={location:{search:'',href:'https://gradehub.cl/'},URL,URLSearchParams,
    history:{state:null,replaceState(){}},sessionStorage,track:(...a)=>eventos.push(a),
    currentUser:{id:'sintetica'},supabaseClient:null,
    aislarCacheEnRegistro:()=>{throw stop},registrarVisitaDiaria:()=>{throw stop},
    restaurarCacheApartada:()=>{throw stop}};
  vm.createContext(ctx);vm.runInContext(helper+sesion.slice(inicio,fin),ctx);
  return {ctx,eventos,sessionStorage,stop};
}
(async()=>{
  const link=pagina('?profe=AB3CDEFG&x=1');
  chk('un link válido registra apertura sin enviar el código',
    link.eventos.length===1&&link.eventos[0][1]==='panel_alumnos_link_abierto'&&
    !JSON.stringify(link.eventos).includes('AB3CDEFG'));
  chk('el link conserva la invitación y marca el origen de la sesión',
    link.localStorage.getItem('gradehub_profe_pendiente')==='AB3CDEFG'&&
    link.sessionStorage.getItem('gradehub_origen_entrada')==='profesor'&&link.urls[0]==='/?x=1');
  const invalido=pagina('?profe=INVALIDO0');
  chk('un código inválido no cuenta ni atribuye el origen',
    invalido.eventos.length===0&&invalido.sessionStorage.datos.size===0);
  for(const tipo of ['afterSignup','afterLogin']){
    const a=auth(tipo,'profesor');
    try{await a.ctx[tipo]()}catch(e){if(e!==a.stop)throw e}
    chk(`${tipo} atribuye el link una sola vez`,
      a.eventos.length===1&&a.eventos[0][1]?.origen==='profesor'&&
      a.ctx.consumirOrigenEntrada()===undefined);
  }
  const sinOrigen=auth('afterLogin',null);
  try{await sinOrigen.ctx.afterLogin()}catch(e){if(e!==sinOrigen.stop)throw e}
  chk('un login normal no queda atribuido al profesor',sinOrigen.eventos[0][1]===undefined);
  link.run(`S.onboardingDone=true;S.ramos=[];S.userName='Alumno sintético';
    currentUser={id:'sintetico'};openModal=()=>{};
    supabaseClient={rpc:async()=>({data:[{nombre_publico:'Profesora sintética'}],error:null})};`);
  chk('la invitación se muestra después de recuperar la cuenta',await link.run('revisarInvitacionProfesor()')===true&&
    link.eventos.at(-1)[1]==='panel_alumnos_invitacion_mostrada');
  chk('la invitación vista limpia origen pendiente para un login futuro',
    link.sessionStorage.getItem('gradehub_origen_entrada')===null);
  link.run(`medirInvitacionCompartida('compartido');medirInvitacionCompartida('copiado');
    medirInvitacionCompartida('cancelado');medirInvitacionCompartida('fallo');`);
  chk('solo compartir o copiar cuenta como envío de link',
    link.eventos.filter(e=>e[1]==='panel_alumnos_link_compartido').length===1&&
    link.eventos.filter(e=>e[1]==='panel_alumnos_link_copiado').length===1);
  chk('ningún evento del recorrido manda nombre, nota ni código',
    !/Alumno sintético|Profesora sintética|AB3CDEFG|4[,\.]0/.test(JSON.stringify(link.eventos)));
  console.log(`\n${fallos?'FAIL: '+fallos:'PASS: '+ok}`);process.exitCode=fallos?1:0;
})().catch(e=>{console.error(e);process.exitCode=1});
