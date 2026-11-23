
// ─── PESTAÑA AMIGOS (Lucas, 2026-11-19) ─────────────────────────────────────
// Agregarse por username, ver qué hacen ahora, ramos en común, ventanas libres
// a la vez, hacer turno, grupos y (si ambos quieren) promedios de los ramos en
// común. Todo pasa por supabase/amigos.sql, amigos_grupos.sql y amigos_notas.sql:
// el servidor nunca entrega ids de cuenta, y acá no se guarda nada en S ni en
// gradehub_v1. La pestaña aparece solo en la app nativa (lo nuevo va solo a la
// app hasta el lanzamiento), con sesión, en cuentas de estudiante y cuando el
// SQL ya está aplicado: si amigos_estado() falla, la app queda como estaba.
// Grupos y notas se sondean aparte: cada SQL se puede aplicar por su cuenta.
const CLAVE_AMIGO_PENDIENTE='gradehub_amigo_pendiente';
const URL_AMIGOS='https://gradehub.cl/';
let amigosDisponibleCache=false,amigosEstadoCache=null,amigosListaCache=null,amigosHorariosCache=new Map(),amigosVersion=0,amigosCargando=false;
let amigosGruposDisponible=false,amigosGruposCache=null,amigosNotasDisponible=false,amigosNotasComparte=false,amigosNotasCache=new Map();
let _notasPublicadas=null,_notasTimer=null;
let amigosCalendarioDisponible=false,amigosPruebasComparte=false,_pruebasPublicadas=null;
let amigosAvisosDisponible=false;

// Un link gradehub.cl/?amigo=usuario deja el username guardado hasta que la
// persona tenga sesión y Amigos esté listo; entonces se abre «Agregar».
(function capturarAmigoDelLink(){
  try{
    if(typeof location==='undefined'||!location.search)return;
    const u=new URLSearchParams(location.search).get('amigo');
    if(u&&/^@?[A-Za-z0-9._]{3,20}$/.test(u))sessionStorage.setItem(CLAVE_AMIGO_PENDIENTE,u.replace(/^@/,'').toLowerCase());
  }catch(e){}
})();

function amigosVisible(){
  return amigosDisponibleCache&&typeof enAppNativa==='function'&&enAppNativa()&&!(typeof esCuentaProfesor==='function'&&esCuentaProfesor());
}
function linkAmigo(username){return `${URL_AMIGOS}?amigo=${encodeURIComponent(username)}`;}
// Los mensajes del SQL ya están escritos para la persona; solo se les pone mayúscula.
function mensajeErrorAmigos(error){
  const m=String(error&&error.message||'').replace(/^.*?exception:\s*/i,'').trim();
  return m&&m.length<=139&&!/function|relation|permission|column|syntax/i.test(m)?m.charAt(0).toUpperCase()+m.slice(1):'No se pudo conectar. Intenta de nuevo.';
}
async function rpcAmigos(nombre,args){
  if(!supabaseClient||!currentUser)throw new Error('hay que haber iniciado sesión');
  const {data,error}=await supabaseClient.rpc(nombre,args||{});
  if(error)throw error;
  return data;
}
// Una pregunta al entrar, sin bloquear nada (igual que profesor y admin).
async function cargarAmigos(){
  const v=amigosVersion;
  if(!supabaseClient||!currentUser){amigosDisponibleCache=false;return false;}
  try{
    const estado=await rpcAmigos('amigos_estado');
    if(v!==amigosVersion)return false;
    amigosDisponibleCache=true;amigosEstadoCache=estado||{};
    await sondearExtrasAmigos(v);
    abrirAmigoPendiente();
    // En la app, la lista se trae al entrar para que el widget no espere a que
    // abras la pestaña.
    if(typeof pluginWidgets==='function'&&pluginWidgets())refrescarAmigos();
    programarRevisionAmigos();
  }catch(e){if(v===amigosVersion)amigosDisponibleCache=false;}
  return amigosDisponibleCache;
}
// Grupos y notas: si su SQL no está aplicado, esa parte simplemente no aparece.
async function sondearExtrasAmigos(v){
  const [g,n,c]=await Promise.allSettled([rpcAmigos('mis_grupos'),rpcAmigos('amigos_notas_estado'),rpcAmigos('amigos_pruebas_estado')]);
  if(v!==amigosVersion)return;
  amigosCalendarioDisponible=c.status==='fulfilled';amigosPruebasComparte=amigosCalendarioDisponible&&c.value===true;
  // Avisos: solo en la app y con amigos_avisos.sql. Olvidar un token que no
  // existe no hace nada y dice si la función está.
  if(pluginAvisosAmigos()){
    try{await rpcAmigos('olvidar_dispositivo',{p_token:'0'});if(v===amigosVersion)amigosAvisosDisponible=true;}catch(e){amigosAvisosDisponible=false;}
    if(amigosAvisosDisponible)renovarAvisosAmigos();
  }
  amigosGruposDisponible=g.status==='fulfilled';amigosGruposCache=amigosGruposDisponible&&Array.isArray(g.value)?g.value:(amigosGruposDisponible?[]:null);
  amigosNotasDisponible=n.status==='fulfilled';amigosNotasComparte=!!(amigosNotasDisponible&&n.value&&n.value.comparte);
}
function olvidarAmigos(){
  if(typeof document!=='undefined')document.querySelector?.('#amigos-body .grupo-actividad')?.remove();
  borrarAmigosWidget();
  amigosVersion++;amigosDisponibleCache=false;amigosEstadoCache=null;amigosListaCache=null;amigosHorariosCache=new Map();
  amigosGruposDisponible=false;amigosGruposCache=null;amigosNotasDisponible=false;amigosNotasComparte=false;amigosNotasCache=new Map();
  amigosGrupoDetalle=null;amigosGrupoProximo=new Map();
  _notasPublicadas=null;clearTimeout(_notasTimer);
  amigosCalendarioDisponible=false;amigosPruebasComparte=false;_pruebasPublicadas=null;amigosAvisosDisponible=false;
  _amigosFirma=null;if(_amigosTimer)clearInterval(_amigosTimer);_amigosTimer=null;
}
// silencioso: la revisión automática no muestra errores ni repinta si nada
// cambió o si la persona está escribiendo en la pestaña.
async function refrescarAmigos(opc={}){
  if(!amigosVisible()||amigosCargando)return;
  amigosCargando=true;const v=amigosVersion;let cambio=true;
  try{
    const [estado,lista,horarios,grupos,notas]=await Promise.all([rpcAmigos('amigos_estado'),rpcAmigos('mis_amistades'),rpcAmigos('amigos_horarios'),
      amigosGruposDisponible?rpcAmigos('mis_grupos'):null,amigosNotasDisponible&&amigosNotasComparte?rpcAmigos('amigos_notas'):null]);
    if(v!==amigosVersion)return;
    const firma=JSON.stringify([estado,lista,horarios,grupos,notas]);
    cambio=firma!==_amigosFirma;_amigosFirma=firma;
    amigosEstadoCache=estado||{};amigosListaCache=lista||[];
    amigosHorariosCache=new Map((horarios||[]).map(h=>[h.id,normalizarRamosAmigo(h.ramos)]));
    if(amigosGruposDisponible)amigosGruposCache=Array.isArray(grupos)?grupos:[];
    amigosNotasCache=new Map((Array.isArray(notas)?notas:[]).map(n=>[n.id,Array.isArray(n.ramos)?n.ramos:[]]));
  }catch(e){
    if(v===amigosVersion&&!amigosListaCache)amigosListaCache=[];
    if(v===amigosVersion&&!opc.silencioso)showToast(mensajeErrorAmigos(e),true);
  }finally{amigosCargando=false;}
  if(v!==amigosVersion)return;
  if(amigosGrupoDetalle&&currentTab==='amigos'){
    if(!amigosGruposCache?.some(g=>g.id===amigosGrupoDetalle.id&&g.estado==='miembro')){
      volverDeGrupo();
    }else await cargarActividadGrupo(amigosGrupoDetalle);
  }
  _amigosRefrescadoAt=Date.now();
  if(typeof currentTab!=='undefined'&&currentTab==='amigos'&&(opc.silencioso?cambio&&!escribiendoEnAmigos():true))pintarAmigos();
  pintarInsigniaAmigos();
  publicarNotasAmigos();publicarPruebasAmigos();publicarAmigosWidget();
  if(!opc.silencioso)cargarProximosGrupos();
}
function renderAmigos(){
  pintarAmigos();
  refrescarAmigos();
}
// Solicitudes de amistad e invitaciones a grupos: las dos esperan una respuesta.
function pendientesAmigos(){
  return (Number(amigosEstadoCache&&amigosEstadoCache.recibidas)||0)+(amigosGruposCache||[]).filter(g=>g.estado==='invitado').length;
}
// El número de solicitudes, sobre el ícono de la pestaña (HIG: Tab bars, badges).
function pintarInsigniaAmigos(){
  const btn=typeof document!=='undefined'&&document.getElementById('nav-amigos');if(!btn)return;
  const n=pendientesAmigos();
  let marca=btn.querySelector('.nav-insignia');
  if(!n){if(marca)marca.remove();btn.setAttribute('aria-label','Amigos');return;}
  if(!marca){marca=document.createElement('span');marca.className='nav-insignia';marca.setAttribute('aria-hidden','true');btn.querySelector('.nav-icon').appendChild(marca);}
  marca.textContent=n>9?'9+':String(n);
  btn.setAttribute('aria-label',`Amigos, ${n} ${n===1?'pendiente':'pendientes'}`);
}

// ─── Widget «Hoy en la u» (app iOS) ───
// Los bloques de clases de los amigos para hoy y los siete días siguientes,
// sacados de lo mismo que muestra la pestaña (resumenHorarioClases, que ya deja
// fuera las clases «no voy»). El widget decide con la hora quién está libre;
// acá no viaja ninguna nota, ramo ni sigla: solo nombre de pila, inicial y horas.
function resumenAmigosParaWidget(ahora=new Date()){
  const amigos=(amigosListaCache||[]).filter(a=>a.estado==='amigos');
  const conClases=amigos.map(a=>{
    const ramos=amigosHorariosCache.get(a.id);if(!ramos)return null;
    const bloques=resumenHorarioClases(ramos,ahora).clasesProximas.slice(0,40).map(c=>({fecha:c.fecha,inicioAt:c.inicioAt,finAt:c.finAt,sala:c.sala||null}));
    if(!bloques.length)return null;
    const nombre=String(a.nombre||a.username).trim().split(/\s+/)[0].slice(0,20);
    return {id:a.id,nombre,inicial:(nombre[0]||'?').toUpperCase(),bloques};
  }).filter(Boolean).slice(0,12);
  return {version:1,actualizado:new Date(ahora).toISOString(),fechaHoy:fechaHorarioChile(new Date(ahora).getTime()),total:amigos.length,amigos:conClases};
}
function publicarAmigosWidget(){
  const p=typeof pluginWidgets==='function'&&pluginWidgets();
  if(!p||typeof p.guardarAmigos!=='function'||!amigosVisible()||!amigosListaCache)return;
  try{const r=p.guardarAmigos({json:JSON.stringify(resumenAmigosParaWidget())});if(r&&typeof r.catch==='function')r.catch(()=>{});}catch(e){}
}
function borrarAmigosWidget(){
  const p=typeof pluginWidgets==='function'&&pluginWidgets();
  if(!p||typeof p.borrarAmigos!=='function')return;
  try{const r=p.borrarAmigos();if(r&&typeof r.catch==='function')r.catch(()=>{});}catch(e){}
}
// ─── Al día sin cerrar la app (Lucas, 2026-11-21) ───
// Antes la lista se pedía solo al entrar: si alguien te agregaba, no lo veías
// hasta cerrar y abrir. Ahora, con la app a la vista, se revisa cada 45 s y al
// volver a ella. En la pestaña Amigos se trae todo; en otra, solo el estado y
// los grupos (dos preguntas) para el número sobre el ícono, y si llegó algo
// nuevo se trae la lista para que al abrir ya esté. Cada 15 minutos se trae
// todo igual, para el widget. Con la app en segundo plano no corre nada.
const AMIGOS_REVISION_MS=45e3;
let _amigosRefrescadoAt=0,_amigosRevisadoAt=0,_amigosRevisando=false,_amigosTimer=null,_amigosFirma=null;
function appALaVista(){return typeof document==='undefined'||document.visibilityState!=='hidden';}
function escribiendoEnAmigos(){
  const a=typeof document!=='undefined'&&document.activeElement;
  return !!(a&&typeof a.closest==='function'&&a.closest('#amigos-body')&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox');
}
async function revisarAmigos(){
  if(!amigosVisible()||amigosCargando||_amigosRevisando||!appALaVista())return;
  _amigosRevisadoAt=Date.now();
  if((typeof currentTab!=='undefined'&&currentTab==='amigos')||Date.now()-_amigosRefrescadoAt>15*6e4)return refrescarAmigos({silencioso:true});
  _amigosRevisando=true;const v=amigosVersion;let nuevo=false;
  try{
    const [estado,grupos]=await Promise.all([rpcAmigos('amigos_estado'),amigosGruposDisponible?rpcAmigos('mis_grupos'):null]);
    if(v!==amigosVersion)return;
    const antes=pendientesAmigos();
    amigosEstadoCache=estado||{};
    if(amigosGruposDisponible&&Array.isArray(grupos))amigosGruposCache=grupos;
    nuevo=pendientesAmigos()!==antes;
    pintarInsigniaAmigos();
  }catch(e){}finally{_amigosRevisando=false;}
  if(nuevo&&v===amigosVersion)return refrescarAmigos({silencioso:true});
}
function programarRevisionAmigos(){
  if(_amigosTimer)clearInterval(_amigosTimer);_amigosTimer=null;
  if(typeof setInterval!=='function'||!amigosVisible()||!appALaVista())return;
  _amigosTimer=setInterval(revisarAmigos,AMIGOS_REVISION_MS);
  if(_amigosTimer&&typeof _amigosTimer.unref==='function')_amigosTimer.unref();
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&Date.now()-_amigosRevisadoAt>5e3)revisarAmigos();
  programarRevisionAmigos();
});

// ─── Pintar ───
const inicialAmigo=a=>esc(((a.nombre||a.username||'?').trim()[0]||'?').toUpperCase());
const nombreAmigo=a=>a.nombre?`${a.nombre}${a.apellido?' '+a.apellido:''}`:'@'+a.username;
// Amigos es dentro de la misma U (el servidor ya no entrega a nadie de otra).
// Este cruce queda por si alguien cambia de U con la lista ya cargada: la misma
// sigla puede ser otro ramo en otra universidad.
function mismaUAmigo(a){return !!(a&&a.universidad&&S.tenant&&a.universidad===S.tenant);}
function ramosEnComunAmigo(a,ramos){return mismaUAmigo(a)?ramosEnComun(S.ramos,ramos):[];}
// El mismo código en toda la pestaña (historias, lista, ficha y grupo):
// anillo de color = libre ahora en la u; anillo gris = en clases.
function anilloAmigo(e){return e&&e.estado==='libre'?' libre':e&&e.estado==='clase'?' en-clase':'';}
const ORDEN_ESTADO_AMIGO={clase:0,libre:1,termino:2,sinclases:3,sinhorario:4};
function filaAmigoHTML(a,ahora){
  const ramos=amigosHorariosCache.get(a.id);
  const est=ramos?estadoAhoraAmigo(ramos,ahora):null;
  const comun=ramos?ramosEnComunAmigo(a,ramos).length:0;
  const linea=est?textoEstadoAmigo(est):'No comparte su horario';
  return `<li><button type="button" class="amigo-fila" data-amigos="ver" data-id="${esc(a.id)}">
    <span class="amigo-avatar${est?anilloAmigo(est):''}" aria-hidden="true">${inicialAmigo(a)}</span>
    <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${esc(linea)}</small></span>
    ${comun?`<span class="amigo-comun">${comun} ${comun===1?'ramo':'ramos'} en común</span>`:''}
    <svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
  </button></li>`;
}
// El match de turno en la ficha: destacado si es perfecto, días si es parcial.
function turnoFichaHTML(m){
  if(m.tipo==='ninguno')return '<p class="amigos-vacio-texto">Esta semana ningún día llegan y se van a la misma hora.</p>';
  return `<div class="amigo-turno${m.tipo==='perfecto'?' perfecto':''}"><b>${esc(textoMatchTurno(m))}</b>
    ${m.tipo==='perfecto'?'<small>Llegan y se van a la misma hora todos los días que van.</small>':''}</div>
    <ul class="amigo-lista">${m.dias.map(d=>`<li><span>${esc(d.nombre)}</span><span class="amigo-horas">${esc(textoTurno(d))}</span></li>`).join('')}</ul>`;
}
// Arriba de la lista: con quién puedes hacer turno, los perfectos primero.
function seccionTurnoHTML(amigos){
  if(!S.ramos.some(r=>copiarHorario(r.horario).length))return '';
  const matches=amigos.map(a=>({a,m:amigosHorariosCache.get(a.id)?matchTurno(S.ramos,amigosHorariosCache.get(a.id)):null}))
    .filter(x=>x.m&&x.m.tipo!=='ninguno')
    .sort((x,y)=>(x.m.tipo==='perfecto'?0:1)-(y.m.tipo==='perfecto'?0:1)||y.m.dias.length-x.m.dias.length);
  if(!matches.length)return '';
  return `<section class="perfil-grupo amigos-grupo"><h2>Para hacer turno</h2><ul>${matches.map(({a,m})=>`<li><button type="button" class="amigo-fila" data-amigos="ver" data-id="${esc(a.id)}">
    <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
    <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${esc(m.tipo==='perfecto'?'Todos los días que van':listaDiasTurno(m.dias).replace(/^./,c=>c.toUpperCase()))}</small></span>
    ${m.tipo==='perfecto'?'<span class="amigo-chip perfecto">Match perfecto</span>':''}
    <svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>`).join('')}</ul></section>`;
}
// Lo tuyo (username, cuántos amigos y grupos, compartir perfil) vive en la
// pestaña Perfil (Lucas, 2026-11-21): acá queda solo lo de los amigos.
function cifrasAmigos(){
  if(!amigosListaCache)return null;
  return {amigos:amigosListaCache.filter(a=>a.estado==='amigos').length,grupos:amigosGruposDisponible?(amigosGruposCache||[]).filter(g=>g.estado==='miembro').length:null};
}
// Como las historias de Instagram, pero con lo útil: quién está hoy en la u.
// Anillo de color = libre ahora (para juntarse); gris = en clases.
function historiasAmigosHTML(amigos,ahora){
  const hoy=amigos.map(a=>{const r=amigosHorariosCache.get(a.id);return {a,e:r?estadoAhoraAmigo(r,ahora):null};})
    .filter(x=>x.e&&(x.e.estado==='libre'||x.e.estado==='clase'))
    .sort((x,y)=>(x.e.estado==='libre'?0:1)-(y.e.estado==='libre'?0:1));
  if(!hoy.length)return '';
  return `<section class="amigos-historias" aria-label="Hoy en la u"><ul>${hoy.map(({a,e})=>{
    const pila=(a.nombre||a.username).split(' ')[0],sub=e.estado==='libre'?'Libre':`Hasta ${e.hasta}`;
    return `<li><button type="button" class="amigos-historia" data-amigos="ver" data-id="${esc(a.id)}" aria-label="${esc(nombreAmigo(a))}: ${esc(textoEstadoAmigo(e))}">
      <span class="historia-anillo ${e.estado==='libre'?'libre':'en-clase'}"><span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span></span>
      <span class="historia-nombre">${esc(pila)}</span><small>${esc(sub)}</small></button></li>`;
  }).join('')}</ul></section>`;
}
function pintarAmigos(){
  const caja=typeof document!=='undefined'&&document.getElementById('amigos-body');if(!caja)return;
  if(!amigosVisible()){caja.innerHTML='<p class="amigos-vacio-texto">Inicia sesión para agregar amigos.</p>';return;}
  const e=amigosEstadoCache||{};
  // Sin username no hay a quién agregar todavía: el botón de arriba aparece después.
  const agregar=document.querySelector('#screen-amigos .topbar-link');if(agregar)agregar.hidden=!e.username;
  if(!e.username){pintarElegirUsername(caja);return;}
  if(amigosGrupoDetalle){pintarActividadGrupo(amigosGrupoDetalle);return;}
  // Mientras llega la lista, su forma (como Instagram), no un «Cargando…».
  if(!amigosListaCache){caja.innerHTML=`<div class="amigos-esqueleto" role="status" aria-label="Cargando amigos">
    <div class="amigos-perfil-fila"><span class="esq esq-avatar"></span><span class="esq esq-linea"></span></div>
    ${[1,2,3].map(()=>'<div class="esq-fila"><span class="esq esq-circulo"></span><span class="esq esq-texto"></span></div>').join('')}</div>`;return;}
  const ahora=new Date(),lista=amigosListaCache;
  const amigos=lista.filter(a=>a.estado==='amigos').map(a=>({a,e:amigosHorariosCache.get(a.id)?estadoAhoraAmigo(amigosHorariosCache.get(a.id),ahora):null}))
    .sort((x,y)=>(ORDEN_ESTADO_AMIGO[x.e?.estado]??5)-(ORDEN_ESTADO_AMIGO[y.e?.estado]??5)||nombreAmigo(x.a).localeCompare(nombreAmigo(y.a),'es')).map(x=>x.a);
  const recibidas=lista.filter(a=>a.estado==='recibida'),enviadas=lista.filter(a=>a.estado==='enviada');
  const sub=a=>esc(['@'+a.username,a.universidad&&TENANTS[a.universidad]?TENANTS[a.universidad].short:''].filter(Boolean).join(' · '));
  caja.innerHTML=`
    ${preguntarAvisosHTML(amigos.length+recibidas.length>0)}
    ${historiasAmigosHTML(amigos,ahora)}
    ${recibidas.length?`<section class="perfil-grupo amigos-grupo"><h2>Solicitudes</h2><ul>${recibidas.map(a=>`<li class="amigo-solicitud recibida">
      <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${sub(a)}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="rechazar" data-id="${esc(a.id)}" aria-label="Rechazar a ${esc(nombreAmigo(a))}">Rechazar</button>
      <button type="button" class="amigo-boton principal" data-amigos="aceptar" data-id="${esc(a.id)}" aria-label="Aceptar a ${esc(nombreAmigo(a))}">Aceptar</button></span></li>`).join('')}</ul></section>`:''}
    ${seccionGruposHTML()}
    ${seccionTurnoHTML(amigos)}
    ${amigos.length?`<section class="perfil-grupo amigos-grupo" id="amigos-seccion-amigos"><h2>Tus amigos</h2><ul>${amigos.map(a=>filaAmigoHTML(a,ahora)).join('')}</ul></section>`
      :`<section class="amigos-vacio"><h2>Agrega a tu primer amigo</h2><p>Mándales tu link o búscalos por su username.</p>
        <button type="button" class="btn-primary" data-amigos="invitar">Invitar amigos</button>
        <button type="button" class="amigos-link" data-amigos="agregar">Buscar por username</button></section>`}
    ${enviadas.length?`<section class="perfil-grupo amigos-grupo"><h2>Enviadas</h2><ul>${enviadas.map(a=>`<li class="amigo-solicitud">
      <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${sub(a)}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="cancelar" data-id="${esc(a.id)}" aria-label="Cancelar la solicitud a ${esc(nombreAmigo(a))}">Cancelar</button></span></li>`).join('')}</ul></section>`:''}
    <section class="perfil-grupo amigos-grupo">
      <h2>Privacidad</h2>
      <ul>
        <li><label class="amigos-ajuste" for="amigos-compartir"><span><b>Compartir mi horario</b><small>${amigosGruposDisponible?'Tus amigos y tus grupos':'Tus amigos'} ven tus ramos y tus clases.${amigosNotasDisponible?'':' Nunca tus notas.'}</small></span>
          <input id="amigos-compartir" type="checkbox" role="switch"${e.comparte_horario!==false?' checked':''}></label></li>
        ${amigosNotasDisponible?`<li><label class="amigos-ajuste" for="amigos-notas"><span><b>Compartir notas</b><small>Solo en ramos que toman juntos y con amigos que también comparten.</small></span>
          <input id="amigos-notas" type="checkbox" role="switch"${amigosNotasComparte?' checked':''}></label></li>`:''}
        ${amigosCalendarioDisponible&&amigosGruposDisponible?`<li><label class="amigos-ajuste" for="amigos-pruebas"><span><b>Compartir fechas</b><small>Con tus grupos: ramo, evaluación y fecha de lo que viene. Nunca la nota ni la ponderación.</small></span>
          <input id="amigos-pruebas" type="checkbox" role="switch"${amigosPruebasComparte?' checked':''}></label></li>`:''}
        <li><button type="button" class="perfil-fila" data-amigos="bloqueados"><span class="perfil-fila-titulo">Bloqueados</span><svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>
      </ul>
    </section>`;
  if(!S.ramos.some(r=>copiarHorario(r.horario).length)&&amigos.length)caja.insertAdjacentHTML('afterbegin','<p class="amigos-aviso">Agrega el horario de tus ramos para ver cuándo coinciden con tus amigos.</p>');
}

// ─── Elegir username ───
let _usernameTimer=null;
const TEXTO_USERNAME={invalido:'De 3 a 20: letras, números, punto o guion bajo.',reservado:'Ese username está reservado.',no_permitido:'Ese username no está permitido.',ocupado:'Ya está ocupado.',disponible:'Disponible.'};
function sugerenciaUsername(){
  const base=String(S.userName||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const ap=String(S.userApellido||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const s=(base+(ap?'.'+ap:'')).slice(0,20).replace(/\.$/,'');
  return s.length>=3?s:'';
}
function pintarElegirUsername(caja){
  // La primera vez: qué se gana, en tres líneas, y recién ahí el username
  // (como al empezar en Instagram o BeReal). Solo lo que esta cuenta tendrá.
  const beneficios=[
    ['Quién está en la u','Y quién está libre ahora para juntarse.'],
    ['Libres a la vez y turno','Cuándo coinciden y con quién llegas y te vas.'],
    ...(amigosGruposDisponible?[['Grupos de estudio',amigosCalendarioDisponible?'Salas reservadas y pruebas de todos en un calendario.':'Cuándo están todos libres.']]:[])
  ];
  caja.innerHTML=`<form class="amigos-username" id="amigos-username-form" novalidate>
    <div class="amigos-bienvenida">
      <span class="amigo-avatar perfil-grande" aria-hidden="true">${esc(userInitial())}</span>
      <h2>Tus amigos de la U</h2>
      <ul class="amigos-beneficios">${beneficios.map(([t,d])=>`<li><b>${esc(t)}</b><small>${esc(d)}</small></li>`).join('')}</ul>
    </div>
    <label class="modal-label" for="amigos-username">Elige tu username</label>
    <label class="amigos-campo" for="amigos-username"><span aria-hidden="true">@</span>
      <input id="amigos-username" type="text" inputmode="text" autocapitalize="none" autocomplete="username" spellcheck="false" maxlength="21" value="${esc(sugerenciaUsername())}" aria-describedby="amigos-username-estado"></label>
    <p class="amigos-username-estado" id="amigos-username-estado" role="status" aria-live="polite"></p>
    <button type="submit" class="btn-primary" id="amigos-username-ok" disabled>Continuar</button>
    <p class="amigos-vacio-texto amigos-letra-chica">Solo te encuentran compañeros de tu universidad. Nadie ve tu horario hasta que aceptes una amistad, y nunca tus notas.</p>
  </form>`;
  const input=caja.querySelector('#amigos-username');
  input.addEventListener('input',()=>revisarUsername(input.value));
  caja.querySelector('form').addEventListener('submit',ev=>{ev.preventDefault();guardarUsername(input.value);});
  if(input.value)revisarUsername(input.value);
}
function revisarUsername(valor){
  clearTimeout(_usernameTimer);
  const est=document.getElementById('amigos-username-estado'),ok=document.getElementById('amigos-username-ok');
  const n=String(valor||'').trim().replace(/^@+/,'').toLowerCase();
  ok.disabled=true;est.className='amigos-username-estado';
  if(!n){est.textContent='';return;}
  if(!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(n)||/[._]{2}/.test(n)){est.textContent=TEXTO_USERNAME.invalido;return;}
  est.textContent='Revisando…';
  _usernameTimer=setTimeout(async()=>{
    try{
      const r=await rpcAmigos('amigos_username_disponible',{p_username:n});
      if(document.getElementById('amigos-username')?.value.trim().replace(/^@+/,'').toLowerCase()!==n)return;
      est.textContent=TEXTO_USERNAME[r]||'';est.classList.toggle('libre',r==='disponible');ok.disabled=r!=='disponible';
    }catch(e){est.textContent=mensajeErrorAmigos(e);}
  },350);
}
async function guardarUsername(valor){
  const ok=document.getElementById('amigos-username-ok');if(ok)ok.disabled=true;
  try{
    const u=await rpcAmigos('fijar_username',{p_username:valor});
    amigosEstadoCache={...(amigosEstadoCache||{}),username:u};
    if(typeof vibrar==='function')vibrar('exito');
    renderAmigos();
    abrirAmigoPendiente();
  }catch(e){
    const est=document.getElementById('amigos-username-estado');if(est)est.textContent=mensajeErrorAmigos(e);
    if(ok)ok.disabled=false;
  }
}

// Cambiar el username desde Perfil, como «Nombre de usuario» en Editar perfil
// de Instagram: el campo con el actual, aviso de disponible y el límite de 30
// días dicho antes de escribir, no después de fallar.
const DIAS_CAMBIO_USERNAME=30;
function proximoCambioUsername(cambiadoAt,ahora=new Date()){
  const t=Date.parse(cambiadoAt);if(!Number.isFinite(t))return null;
  const prox=new Date(t+DIAS_CAMBIO_USERNAME*864e5);
  return prox>ahora?prox:null;
}
function abrirCambiarUsername(){
  const e=amigosEstadoCache||{};if(!e.username)return;
  const prox=proximoCambioUsername(e.cambiado_at);
  const fecha=prox&&prox.toLocaleDateString('es-CL',{day:'numeric',month:'long'});
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Username</div>
    <form class="amigos-username amigos-username-hoja" id="amigos-username-cambiar" novalidate>
      <label class="amigos-campo" for="amigos-username"><span aria-hidden="true">@</span>
        <input id="amigos-username" type="text" autocapitalize="none" autocomplete="username" spellcheck="false" maxlength="21" value="${esc(e.username)}" aria-describedby="amigos-username-estado"${prox?' disabled':''}></label>
      <p class="amigos-username-estado" id="amigos-username-estado" role="status" aria-live="polite"></p>
      <p class="amigos-vacio-texto">${prox?`Lo cambiaste hace poco. Podrás volver a cambiarlo el ${esc(fecha)}.`
        :`Tus amigos te seguirán viendo; tu link anterior deja de funcionar. Después podrás cambiarlo de nuevo en ${DIAS_CAMBIO_USERNAME} días.`}</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="submit" form="amigos-username-cambiar" class="btn-confirm" id="amigos-username-ok" disabled>Guardar</button></div>`;
  openModal();
  if(prox)return;
  const input=document.getElementById('amigos-username');
  input.addEventListener('input',()=>{if(input.value.trim().replace(/^@+/,'').toLowerCase()===e.username){clearTimeout(_usernameTimer);document.getElementById('amigos-username-estado').textContent='';document.getElementById('amigos-username-ok').disabled=true;}else revisarUsername(input.value);});
  document.getElementById('amigos-username-cambiar').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const ok=document.getElementById('amigos-username-ok');ok.disabled=true;
    try{
      const u=await rpcAmigos('fijar_username',{p_username:input.value});
      amigosEstadoCache={...(amigosEstadoCache||{}),username:u,cambiado_at:new Date().toISOString()};
      if(typeof vibrar==='function')vibrar('exito');
      closeModal();showToast(`Ahora eres @${u}`);
      if(typeof renderPerfil==='function')renderPerfil();
      pintarAmigos();
    }catch(err){document.getElementById('amigos-username-estado').textContent=mensajeErrorAmigos(err);ok.disabled=false;}
  });
  setTimeout(()=>{input.focus();input.select();},60);
}

// ─── Invitar ───
async function invitarAmigos(){
  const u=amigosEstadoCache&&amigosEstadoCache.username;if(!u)return;
  const link=linkAmigo(u),texto='Agrégame en GradeHub y vemos cuándo tenemos ventanas libres:';
  try{if(typeof navigator.share==='function'){await navigator.share({text:texto,url:link});return;}}
  catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(`${texto} ${link}`);showToast('Link copiado');}
  catch(e){showToast(link);}
}

// ─── Agregar ───
function abrirAgregarAmigo(prefill){
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Agregar amigo</div>
    <form class="amigos-buscar" id="amigos-buscar-form" novalidate>
      <label class="amigos-campo" for="amigos-buscar"><span aria-hidden="true">@</span>
        <input id="amigos-buscar" type="text" enterkeyhint="search" autocapitalize="none" autocomplete="off" spellcheck="false" maxlength="21" placeholder="username" value="${esc(prefill||'')}" aria-label="Username de tu amigo"></label>
      <button type="submit" class="amigo-boton principal">Buscar</button>
    </form>
    <div id="amigos-resultado" aria-live="polite"></div>
    <button type="button" class="amigos-link amigos-link-centro" data-amigos="invitar">O mándales tu link</button>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
  const form=document.getElementById('amigos-buscar-form');
  form.addEventListener('submit',ev=>{ev.preventDefault();buscarAmigo(document.getElementById('amigos-buscar').value);});
  if(prefill)buscarAmigo(prefill);else setTimeout(()=>document.getElementById('amigos-buscar')?.focus(),60);
}
async function buscarAmigo(valor){
  const caja=document.getElementById('amigos-resultado');if(!caja)return;
  const n=String(valor||'').trim().replace(/^@+/,'');
  if(!(n.length>=3)){caja.innerHTML='<p class="amigos-vacio-texto">Escribe su username completo.</p>';return;}
  caja.innerHTML='<p class="amigos-vacio-texto">Buscando…</p>';
  try{
    const r=(await rpcAmigos('buscar_usuario',{p_username:n}))||[];
    if(!r.length){caja.innerHTML='<p class="amigos-vacio-texto">No encontramos a nadie de tu universidad con ese username.</p>';return;}
    const p=r[0],uni=p.universidad&&TENANTS[p.universidad]?TENANTS[p.universidad].short:'';
    const accion={yo:'<span class="amigo-estado">Eres tú</span>',amigos:'<span class="amigo-estado">Ya son amigos</span>',
      enviada:'<span class="amigo-estado">Solicitud enviada</span>',
      recibida:`<button type="button" class="amigo-boton principal" data-amigos="pedir" data-user="${esc(p.username)}">Aceptar</button>`,
      ninguna:`<button type="button" class="amigo-boton principal" data-amigos="pedir" data-user="${esc(p.username)}">Agregar</button>`}[p.relacion]||'';
    caja.innerHTML=`<div class="amigo-solicitud amigos-encontrado"><span class="amigo-avatar" aria-hidden="true">${inicialAmigo(p)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(p))}</b><small>${esc(['@'+p.username,uni].filter(Boolean).join(' · '))}</small></span>
      <span class="amigo-acciones">${accion}</span></div>`;
  }catch(e){caja.innerHTML=`<p class="amigos-vacio-texto">${esc(mensajeErrorAmigos(e))}</p>`;}
}
// El link gradehub.cl/?amigo=usuario abre la app si está instalada (Universal
// Link, ver .well-known/apple-app-site-association en main). Se guarda igual
// que al entrar por la web y «Agregar» se abre apenas haya sesión y username:
// al tiro si ya los hay, o cuando cargarAmigos termine después del login.
function recibirLinkAmigo(url){
  let u;try{u=new URL(String(url||''));}catch(e){return false;}
  if(u.origin!=='https://gradehub.cl'||u.pathname!=='/')return false;
  const n=u.searchParams.get('amigo');
  if(!n||!/^@?[A-Za-z0-9._]{3,20}$/.test(n))return false;
  try{sessionStorage.setItem(CLAVE_AMIGO_PENDIENTE,n.replace(/^@/,'').toLowerCase());}catch(e){}
  abrirAmigoPendiente();
  return true;
}
function abrirAmigoPendiente(){
  let u=null;try{u=sessionStorage.getItem(CLAVE_AMIGO_PENDIENTE);}catch(e){}
  if(!u||!amigosVisible()||!(amigosEstadoCache&&amigosEstadoCache.username))return;
  try{sessionStorage.removeItem(CLAVE_AMIGO_PENDIENTE);}catch(e){}
  if(u===amigosEstadoCache.username)return;
  showTab('amigos');abrirAgregarAmigo(u);
}

// ─── Ficha de un amigo ───
function abrirAmigo(id){
  const a=(amigosListaCache||[]).find(x=>x.id===id);if(!a)return;
  const ramos=amigosHorariosCache.get(id),uni=a.universidad&&TENANTS[a.universidad]?TENANTS[a.universidad].short:'';
  const mioConHorario=S.ramos.some(r=>copiarHorario(r.horario).length);
  let cuerpo,cifras={comun:'–',libres:'–',turno:'–'},estado=null;
  if(!ramos)cuerpo='<p class="amigos-vacio-texto">No comparte su horario.</p>';
  else{
    const est=estadoAhoraAmigo(ramos),comun=ramosEnComunAmigo(a,ramos),semana=semanaLibresEnComun(S.ramos,ramos),turno=matchTurno(S.ramos,ramos);
    estado=est;
    const minutos=semana.reduce((t,d)=>t+d.ventanas.reduce((x,v)=>x+v.minutos,0),0);
    cifras={comun:String(comun.length),libres:!mioConHorario?'–':minutos>=60?`${Math.round(minutos/60)} h`:`${minutos} min`,turno:!mioConHorario?'–':turno.tipo==='perfecto'?'Todos':String(turno.dias.length)};
    const suyoConHorario=ramos.some(r=>copiarHorario(r.horario).length);
    const sinCruce=!mioConHorario?'<p class="amigos-vacio-texto">Agrega tu horario para ver cuándo coinciden.</p>'
      :!suyoConHorario?'<p class="amigos-vacio-texto">Todavía no carga su horario.</p>':'';
    const notas=amigosNotasCache.get(id)||[];
    cuerpo=`<h3 class="modal-label amigo-lista-cabeza"><span>Ramos en común</span>${comun.some(r=>notas.some(x=>x.sigla===r.sigla))?`<span>Promedio de ${esc(a.nombre||'@'+a.username)}</span>`:''}</h3>
      ${comun.length?`<ul class="amigo-lista">${comun.map(r=>{
          const n=notas.find(x=>x.sigla===r.sigla);
          return `<li><span>${esc(r.nombre)}</span><span class="amigo-lista-der">${r.mismaSeccion?'<span class="amigo-chip">Misma sección</span>':''}${n?notaAmigoHTML(n,a):''}</span></li>`;
        }).join('')}</ul>${amigosNotasDisponible&&!amigosNotasComparte?'<p class="amigos-vacio-texto">Activa «Compartir notas» en Privacidad para comparar notas en estos ramos.</p>':''}`
        :'<p class="amigos-vacio-texto">No toman ramos juntos este semestre.</p>'}
      <h3 class="modal-label">Libres a la vez</h3>
      ${sinCruce||(semana.length?`<ul class="amigo-lista">${semana.map(d=>`<li><span>${esc(d.nombre)}</span><span class="amigo-horas">${d.ventanas.map(v=>`${esc(v.inicio)}–${esc(v.fin)}`).join(' · ')}</span></li>`).join('')}</ul>`
        :'<p class="amigos-vacio-texto">Esta semana no tienen ventanas libres en común.</p>')}
      <h3 class="modal-label">Hacer turno</h3>
      ${sinCruce||turnoFichaHTML(turno)}`;
  }
  // El perfil de Instagram: avatar con anillo si está libre, tres cifras de lo
  // que comparten, nombre, «Amigos ▾» (sus opciones) y una acción al lado.
  const anillo=estado&&estado.estado==='libre'?'libre':estado&&estado.estado==='clase'?'en-clase':'';
  document.getElementById('modal-content').innerHTML=`
    <div class="amigos-perfil amigos-perfil-ficha">
      <div class="amigos-perfil-fila">
        <span class="historia-anillo grande ${anillo}"><span class="amigo-avatar perfil-grande" aria-hidden="true">${inicialAmigo(a)}</span></span>
        <div class="amigos-cifras">
          <div class="amigos-cifra"><b>${esc(cifras.comun)}</b><small>en común</small></div>
          <div class="amigos-cifra"><b>${esc(cifras.libres)}</b><small>libres juntos</small></div>
          <div class="amigos-cifra"><b>${esc(cifras.turno)}</b><small>días de turno</small></div>
        </div>
      </div>
      <b class="amigos-perfil-nombre">${esc(nombreAmigo(a))}</b>
      <span class="amigos-perfil-user">${esc(['@'+a.username,uni,a.carrera].filter(Boolean).join(' · '))}</span>
      ${estado?`<span class="amigo-ahora${estado.estado==='clase'?' en-clase':''}">${esc(textoEstadoAmigo(estado))}</span>`:''}
      <div class="amigos-perfil-botones">
        <button type="button" class="amigo-boton" data-amigos="menu-amigo" data-id="${esc(a.id)}" aria-haspopup="true">Amigos <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
        ${amigosGruposDisponible?`<button type="button" class="amigo-boton" data-amigos="grupo-con" data-user="${esc(a.username)}">Armar grupo</button>`:''}
      </div>
    </div>
    ${ramos&&ramos.some(r=>copiarHorario(r.horario).length)?`<button type="button" class="perfil-fila amigo-ver-semana" data-amigos="semana" data-id="${esc(a.id)}"><span class="perfil-fila-titulo">Ver su semana</span><svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`:''}
    ${cuerpo}
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
}
// Su semana en la grilla de la Agenda (como la cuadrícula de un perfil de
// Instagram): sus clases en gris y en el acento las que toman juntos. Solo se
// mira: las clases no se abren ni se editan, así que no son botones.
function semanaAmigoHTML(a,ramos){
  if(typeof horarioSemanaHTML!=='function')return '';
  const comun=new Set(ramosEnComunAmigo(a,ramos).map(r=>r.sigla));
  const conColor=ramos.map(r=>({...r,color:comun.has(String(r.sigla||r.nombre||'').trim().toUpperCase())?'var(--primary)':'var(--fg3)'}));
  return horarioSemanaHTML(conColor,new Date()).replace(/<button type="button"/g,'<div role="img"').replace(/<\/button>/g,'</div>');
}
function abrirSemanaAmigo(id){
  const a=(amigosListaCache||[]).find(x=>x.id===id),ramos=a&&amigosHorariosCache.get(id);if(!ramos)return;
  const grilla=semanaAmigoHTML(a,ramos);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Semana de ${esc(a.nombre||'@'+a.username)}</div>
    ${grilla?`<p class="amigos-vacio-texto amigo-semana-leyenda"><span class="amigo-semana-punto comun" aria-hidden="true"></span>En común contigo <span class="amigo-semana-punto" aria-hidden="true"></span>Solo suyas</p>
      <div class="amigo-semana">${grilla}</div>`:'<p class="amigos-vacio-texto">Todavía no carga su horario.</p>'}
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="ver" data-id="${esc(id)}">Volver</button></div>`;
}
// «Siguiendo ▾» de Instagram: lo que se hace con esta amistad, en un menú.
function abrirMenuAmigo(id){
  const a=(amigosListaCache||[]).find(x=>x.id===id);if(!a)return;
  document.getElementById('modal-content').innerHTML=`
    <div class="amigo-cabecera"><span class="amigo-avatar grande" aria-hidden="true">${inicialAmigo(a)}</span>
      <div><div class="modal-title">${esc(nombreAmigo(a))}</div><p class="amigo-sub">@${esc(a.username)}</p></div></div>
    <div class="grupo-opciones">
      <button type="button" class="grupo-opcion" data-amigos="eliminar" data-id="${esc(a.id)}">Eliminar de amigos</button>
      <button type="button" class="grupo-opcion peligro" data-amigos="bloquear" data-user="${esc(a.username)}">Bloquear</button>
      <button type="button" class="grupo-opcion peligro" data-amigos="denunciar" data-user="${esc(a.username)}">Denunciar</button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="ver" data-id="${esc(a.id)}">Volver</button></div>`;
}
const MOTIVOS_DENUNCIA_AMIGO=[['username_ofensivo','Username ofensivo'],['acoso','Acoso o mensajes que incomodan'],['suplantacion','Se hace pasar por otra persona'],['spam','Spam'],['otro','Otro']];
function abrirDenunciarAmigo(username){
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Denunciar a @${esc(username)}</div>
    <form id="amigos-denuncia" class="amigos-denuncia">
      <fieldset><legend class="modal-label">Qué pasa</legend>
      ${MOTIVOS_DENUNCIA_AMIGO.map(([v,t],i)=>`<label class="amigos-motivo"><input type="radio" name="motivo" value="${v}"${i?'':' checked'}><span>${esc(t)}</span></label>`).join('')}</fieldset>
      <label class="modal-label" for="amigos-denuncia-detalle">Detalle (opcional)</label>
      <textarea id="amigos-denuncia-detalle" maxlength="500" rows="3"></textarea>
      <p class="amigos-vacio-texto">El equipo lo revisa. @${esc(username)} no sabrá quién lo denunció.</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="submit" form="amigos-denuncia" class="btn-confirm">Enviar denuncia</button></div>`;
  openModal();
  document.getElementById('amigos-denuncia').addEventListener('submit',async ev=>{
    ev.preventDefault();const f=ev.target;
    try{
      await rpcAmigos('denunciar_usuario',{p_username:username,p_motivo:f.motivo.value,p_detalle:f.querySelector('textarea').value});
      closeModal();
      showConfirm('Denuncia enviada',`¿Quieres bloquear también a @${username}? Dejarán de verse.`,()=>accionAmigos('bloquear',{user:username,confirmado:true}),{label:'Bloquear',danger:true});
    }catch(e){showToast(mensajeErrorAmigos(e),true);}
  });
}
async function abrirBloqueados(){
  document.getElementById('modal-content').innerHTML=`<div class="modal-title">Bloqueados</div><div id="amigos-bloqueados"><p class="amigos-vacio-texto">Cargando…</p></div>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
  try{
    const l=(await rpcAmigos('mis_bloqueados'))||[],caja=document.getElementById('amigos-bloqueados');if(!caja)return;
    caja.innerHTML=l.length?`<ul class="amigo-lista">${l.map(b=>`<li><span>@${esc(b.username)}</span><button type="button" class="amigo-boton" data-amigos="desbloquear" data-user="${esc(b.username)}">Desbloquear</button></li>`).join('')}</ul>`
      :'<p class="amigos-vacio-texto">No has bloqueado a nadie.</p>';
  }catch(e){showToast(mensajeErrorAmigos(e),true);}
}

// ─── Notas compartidas ───
// Lo que se publica sale del motor de siempre (ramoAvg → notaFinalOficial) y
// del semáforo del ramo: el servidor nunca calcula ni ve notas sueltas.
function resumenNotasAmigos(ramos){
  return (ramos||[]).map(r=>{
    const sigla=String((typeof siglaDeRamo==='function'?siglaDeRamo(r):r&&r.sigla)||'').trim();
    if(!/^[A-Za-z0-9 _.-]{2,20}$/.test(sigla))return null;
    const avg=ramoAvg(r),prom=notaFinalOficial(avg);
    return {sigla:sigla.toUpperCase(),nombre:String(r.nombre||'').slice(0,80),promedio:prom,avance:ramoProgress(r).pct,nivel:prom===null?'neutral':nivelRamo(r,avg)};
  }).filter(Boolean).slice(0,30);
}
// Solo si cambió algo desde la última vez: la sincronización llama seguido.
async function publicarNotasAmigos(){
  if(!amigosVisible()||!amigosNotasDisponible||!amigosNotasComparte)return;
  const datos=resumenNotasAmigos(S.ramos),firma=JSON.stringify(datos),v=amigosVersion;
  if(firma===_notasPublicadas)return;
  try{await rpcAmigos('publicar_mis_notas',{p_ramos:datos});if(v===amigosVersion)_notasPublicadas=firma;}catch(e){}
}
// Cada subida a la nube actualiza lo que se comparte (promedios y pruebas).
function programarPublicarNotasAmigos(){clearTimeout(_notasTimer);_notasTimer=setTimeout(()=>{publicarNotasAmigos();publicarPruebasAmigos();},1500);}

// ─── Pruebas compartidas con los grupos ───
// Las evaluaciones por venir de la Agenda, de acá a 60 días: ramo, sigla,
// nombre, fecha y hora. Nunca la nota ni el peso.
function resumenPruebasAmigos(ramos){
  return agendaEvents(ramos).filter(e=>estadoEventoAgenda(e)==='por_venir'&&diasHasta(e.fecha)<=60).slice(0,60).map(e=>({
    ramo:String(e.ramo.nombre||'').slice(0,80),
    sigla:(typeof siglaDeRamo==='function'&&siglaDeRamo(e.ramo))||null,
    nombre:String(nombreEventoAgenda(e)||'').slice(0,80),fecha:e.fecha,hora:e.hora||null
  }));
}
async function publicarPruebasAmigos(){
  if(!amigosVisible()||!amigosCalendarioDisponible||!amigosPruebasComparte)return;
  const datos=resumenPruebasAmigos(S.ramos),firma=JSON.stringify(datos),v=amigosVersion;
  if(firma===_pruebasPublicadas)return;
  try{await rpcAmigos('publicar_mis_pruebas',{p_pruebas:datos});if(v===amigosVersion)_pruebasPublicadas=firma;}catch(e){}
}
async function cambiarCompartirPruebas(valor){
  const sw=document.getElementById('amigos-pruebas');
  try{
    if(valor){const datos=resumenPruebasAmigos(S.ramos);await rpcAmigos('publicar_mis_pruebas',{p_pruebas:datos});_pruebasPublicadas=JSON.stringify(datos);amigosPruebasComparte=true;}
    else{await rpcAmigos('dejar_de_compartir_pruebas');amigosPruebasComparte=false;_pruebasPublicadas=null;}
  }catch(e){showToast(mensajeErrorAmigos(e),true);if(sw)sw.checked=!valor;}
}

// ─── Avisos push (app iOS) ───
// Opcionales y por iPhone: el token vive en este teléfono (localStorage) y en
// push_dispositivos. Se pregunta con una tarjeta propia antes que el diálogo
// de iOS, que aparece una sola vez en la vida de la app (HIG: Notifications).
const CLAVE_AVISOS_AMIGOS='gradehub_avisos_amigos',CLAVE_AVISOS_PREGUNTA='gradehub_avisos_amigos_pregunta';
function pluginAvisosAmigos(){
  if(typeof pluginWidgets!=='function'||!pluginWidgets())return null;
  const cap=typeof window!=='undefined'&&window.Capacitor;
  return cap&&cap.Plugins&&cap.Plugins.GradeHubAvisos||null;
}
const tokenAvisosAmigos=()=>{try{return localStorage.getItem(CLAVE_AVISOS_AMIGOS)||'';}catch(e){return '';}};
function avisosAmigosActivos(){return !!tokenAvisosAmigos();}
async function activarAvisosAmigos(){
  const p=pluginAvisosAmigos();if(!p)return false;
  try{
    const r=await p.activar();
    if(!r||r.permiso!=='concedido'||!r.token){showToast('Actívalos en Ajustes del iPhone → GradeHub → Notificaciones.',true);return false;}
    await rpcAmigos('registrar_dispositivo',{p_token:r.token});
    try{localStorage.setItem(CLAVE_AVISOS_AMIGOS,r.token);}catch(e){}
    if(typeof vibrar==='function')vibrar('exito');
    return true;
  }catch(e){showToast(mensajeErrorAmigos(e),true);return false;}
}
async function desactivarAvisosAmigos(){
  const t=tokenAvisosAmigos();
  try{localStorage.removeItem(CLAVE_AVISOS_AMIGOS);}catch(e){}
  if(t)try{await rpcAmigos('olvidar_dispositivo',{p_token:t});}catch(e){}
}
// Al entrar: iOS puede cambiar el token, o en este iPhone entró otra cuenta.
// Solo si ya estaban activos y el permiso sigue: sin diálogos nuevos.
async function renovarAvisosAmigos(){
  const p=pluginAvisosAmigos();if(!p||!avisosAmigosActivos())return;
  try{
    const e=await p.estado();
    if(!e||e.permiso!=='concedido'){await desactivarAvisosAmigos();return;}
    const r=await p.activar();
    if(r&&r.token){await rpcAmigos('registrar_dispositivo',{p_token:r.token});try{localStorage.setItem(CLAVE_AVISOS_AMIGOS,r.token);}catch(x){}}
  }catch(e){}
}
// Antes de cerrar sesión (con la sesión todavía viva): este iPhone deja de
// recibir avisos de esa cuenta.
async function olvidarAvisosAmigos(){if(avisosAmigosActivos())await desactivarAvisosAmigos();}
function preguntarAvisosHTML(hayAlgo){
  let respondida=false;try{respondida=!!localStorage.getItem(CLAVE_AVISOS_PREGUNTA);}catch(e){}
  if(!amigosAvisosDisponible||avisosAmigosActivos()||respondida||!hayAlgo)return '';
  return `<section class="amigos-aviso-push" aria-label="Avisos">
    <span class="cal-icono sala" aria-hidden="true"><svg class="ic" viewBox="0 0 24 24"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span>
    <div class="amigo-texto"><b>¿Te avisamos?</b><small>Cuando alguien te agregue, te invite a un grupo o anote una sala.</small></div>
    <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="avisos-no">Ahora no</button><button type="button" class="amigo-boton principal" data-amigos="avisos-si">Activar</button></span>
  </section>`;
}

// ─── Calendario del grupo: salas reservadas y pruebas ───
const ICONO_SALA='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const ICONO_PRUEBA='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
const DIAS_CALENDARIO_GRUPO=60;
function etiquetaDiaCalendario(fecha){
  const hoy=fechaHorarioChile(Date.now());
  if(fecha===hoy)return 'Hoy';if(fecha===sumarDiasAgenda(hoy,1))return 'Mañana';
  const t=new Date(fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'short'});
  return t.charAt(0).toUpperCase()+t.slice(1);
}
// Agrupado por día, como la Agenda. `items` viene de grupo_calendario.
function eventosGrupo(items){
  const eventos=new Map();
  const normalizar=t=>String(t||'').normalize('NFC').trim().toLocaleLowerCase('es').replace(/\s+/g,' ');
  for(const it of items||[]){
    if(it.tipo==='reserva'){eventos.set(it.id,it);continue;}
    if(it.tipo!=='prueba')continue;
    const clave=JSON.stringify([it.fecha,it.inicio||'',normalizar(it.detalle),normalizar(it.titulo)]);
    if(!eventos.has(clave))eventos.set(clave,{...it,clave,personas:[]});
    const personas=eventos.get(clave).personas;
    if(!personas.some(p=>p.username===it.username))personas.push({username:it.username,nombre:it.nombre,yo:it.yo});
  }
  return [...eventos.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.inicio||'24').localeCompare(b.inicio||'24')||a.titulo.localeCompare(b.titulo,'es'));
}
function quienGrupo(p){return p.yo?'Tú':p.nombre?.trim().split(/\s+/)[0]||'@'+p.username;}
function participantesGrupo(personas){
  const nombres=[...personas].sort((a,b)=>Number(!!b.yo)-Number(!!a.yo)||quienGrupo(a).localeCompare(quienGrupo(b),'es')).map(quienGrupo);
  return listaNombres(nombres.length>3?[...nombres.slice(0,3),`${nombres.length-3} más`]:nombres);
}
// ─── Lo de ahora en el grupo (Lucas, 2026-11-22) ───
// Lo que sirve para juntarse va arriba: quién está en la u y cuándo coinciden
// libres. Solo con horarios (nunca ubicación), y lo tuyo sale de tus ramos.
function personasGrupo(d){
  return (d?.filas||[]).filter(f=>f.estado==='miembro').map(f=>({clave:f.username,yo:!!f.yo,nombre:f.nombre,username:f.username,
    ramos:f.yo?S.ramos:(f.ramos?normalizarRamosAmigo(f.ramos):null)}));
}
const ORDEN_AHORA_GRUPO={libre:0,clase:1,termino:2,sinclases:3,sinhorario:4};
function etiquetaAhoraGrupo(e){
  if(!e||e.estado==='sinhorario')return 'Sin horario';
  if(e.estado==='libre')return 'Libre';
  if(e.estado==='clase')return 'Hasta '+e.hasta;
  return e.estado==='termino'?'Ya salió':'No viene hoy';
}
function ahoraGrupoHTML(d,ahora=new Date()){
  const gente=personasGrupo(d).map(p=>({p,e:p.ramos?estadoAhoraAmigo(p.ramos,ahora):null}));
  // Si nadie más comparte horario, no hay nada que mirar todavía.
  if(!gente.some(x=>!x.p.yo&&x.e&&x.e.estado!=='sinhorario'))return '';
  gente.sort((x,y)=>(ORDEN_AHORA_GRUPO[x.e?.estado||'sinhorario']-ORDEN_AHORA_GRUPO[y.e?.estado||'sinhorario'])||Number(y.p.yo)-Number(x.p.yo));
  const libres=gente.filter(x=>x.e?.estado==='libre').length,clase=gente.filter(x=>x.e?.estado==='clase').length;
  const resumen=libres||clase?[libres?`${libres} ${libres===1?'libre':'libres'}`:'',clase?`${clase} en clases`:''].filter(Boolean).join(' · '):'Nadie del grupo está en la u ahora';
  const cara=({p,e})=>{
    const anillo=e?.estado==='libre'?'libre':e?.estado==='clase'?'en-clase':'';
    const nombre=quienGrupo(p),etiqueta=etiquetaAhoraGrupo(e),texto=e&&e.estado!=='sinhorario'?textoEstadoAmigo(e):'Sin horario cargado';
    const interior=`<span class="historia-anillo ${anillo}"><span class="amigo-avatar" aria-hidden="true">${inicialAmigo(p)}</span></span>
      <span class="historia-nombre">${esc(nombre)}</span><small>${esc(etiqueta)}</small>`;
    return p.yo?`<li><span class="amigos-historia" aria-label="Tú: ${esc(texto)}">${interior}</span></li>`
      :`<li><button type="button" class="amigos-historia" data-amigos="grupo-miembro" data-id="${esc(d.id)}" data-user="${esc(p.username)}" aria-label="${esc(nombreAmigo(p))}: ${esc(texto)}">${interior}</button></li>`;
  };
  return `<section class="grupo-ahora" aria-labelledby="grupo-ahora-titulo">
    <div class="grupo-seccion-titulo"><h2 id="grupo-ahora-titulo">Ahora en la u</h2><span>${esc(resumen)}</span></div>
    <div class="amigos-historias grupo-caras"><ul>${gente.map(cara).join('')}</ul></div></section>`;
}
// «Hoy», «Mañana» o «Lunes 24»: corto, para leer de un vistazo.
function diaCortoGrupo(fecha){
  const e=etiquetaDiaCalendario(fecha);
  return e==='Hoy'||e==='Mañana'?e:e.replace(/,.*$/,'')+' '+Number(fecha.slice(8,10));
}
function libresJuntosHTML(d,ahora=new Date()){
  const personas=personasGrupo(d);
  const conHorario=personas.filter(p=>(p.ramos||[]).some(r=>copiarHorario(r.horario).length));
  if(!(conHorario.length>=2))return '';
  const yoSinHorario=!personas.some(p=>p.yo&&conHorario.includes(p));
  const ventanas=proximasLibresJuntos(personas,ahora,{cuantas:2});
  const quienes=v=>participantesGrupo(personas.filter(p=>v.claves.includes(p.clave)));
  const cuerpo=ventanas.length?`<ul class="grupo-libres">${ventanas.map(v=>`<li><button type="button" class="grupo-libre" data-amigos="reserva-nueva" data-id="${esc(d.id)}" data-fecha="${esc(v.fecha)}" data-inicio="${esc(v.inicio)}" data-fin="${esc(v.fin)}" aria-label="${esc(`${diaCortoGrupo(v.fecha)}, de ${v.inicio} a ${v.fin}, con ${quienes(v)}. Anotar una sala para ese horario`)}">
      <span class="grupo-libre-cuando"><b>${esc(diaCortoGrupo(v.fecha))}</b><span>${esc(v.inicio)}–${esc(v.fin)}</span></span>
      <span class="grupo-libre-quienes">${esc(quienes(v))}</span>
      ${FLECHA_GRUPO}</button></li>`).join('')}</ul>`
    :`<p class="grupo-nota">Esta semana no coinciden libres en la u. ${yoSinHorario?'Agrega tu horario para ver cuándo te juntas tú.':''}</p>`;
  return `<section class="grupo-libres-seccion" aria-labelledby="grupo-libres-titulo">
    <div class="grupo-seccion-titulo"><h2 id="grupo-libres-titulo">Libres juntos</h2></div>${cuerpo}</section>`;
}
function calendarioGrupoHTML(id,items){
  const porDia=new Map();
  for(const it of eventosGrupo(items)){
    if(!porDia.has(it.fecha))porDia.set(it.fecha,[]);
    porDia.get(it.fecha).push(it);
  }
  const fila=it=>it.tipo==='reserva'
    ?`<li><button type="button" class="grupo-mensaje grupo-reserva${it.yo?' grupo-mensaje-mio':''}" data-amigos="grupo-reserva" data-id="${esc(id)}" data-reserva="${esc(it.id)}">
      <span class="cal-icono sala">${ICONO_SALA}</span><span><small>Sala reservada · ${esc(quienGrupo(it))}</small><b>${esc(it.titulo)}</b>
      <span>${esc(it.inicio)}–${esc(it.fin)}</span>${it.detalle?`<span class="cal-codigo">Código <b>${esc(it.detalle)}</b></span>`:''}</span>${FLECHA_GRUPO}</button></li>`
    :`<li><button class="grupo-mensaje grupo-prueba" type="button" data-amigos="grupo-prueba" data-id="${esc(id)}" data-prueba="${esc(it.clave)}">
      <span class="cal-icono prueba">${ICONO_PRUEBA}</span><span><small>${esc([it.detalle,it.inicio].filter(Boolean).join(' · '))}</small><b>${esc(it.titulo)}</b>
      <span>${esc(participantesGrupo(it.personas))}</span></span>${FLECHA_GRUPO}</button>
      ${it.personas.length>=2&&it.personas.some(p=>p.yo)?`<button type="button" class="grupo-estudiar" data-amigos="grupo-estudiar" data-id="${esc(id)}" data-prueba="${esc(it.clave)}" aria-label="Estudiar juntos para ${esc(it.titulo)}">Estudiar juntos</button>`:''}</li>`;
  return `<ol class="grupo-hilo">${[...porDia].map(([fecha,lista])=>`<li><h3>${esc(etiquetaDiaCalendario(fecha))}</h3><ul>${lista.map(fila).join('')}</ul></li>`).join('')}</ol>`;
}
function abrirPruebaGrupo(id,clave){
  const d=amigosGrupoDetalle;
  const prueba=d?.id===id&&eventosGrupo(d.cal).find(it=>it.clave===clave);
  if(!prueba)return;
  document.getElementById('modal-content').innerHTML=`<section data-detalle-prueba="${esc(clave)}" data-personas="${esc(JSON.stringify(prueba.personas))}"><p class="modal-label">${esc(prueba.detalle||'Prueba')}</p>
    <h2 class="modal-title">${esc(prueba.titulo)}</h2><p class="grupo-cuando">${esc([etiquetaDiaCalendario(prueba.fecha),prueba.inicio||'Sin hora indicada'].join(' · '))}</p>
    ${prueba.personas.length>=2&&prueba.personas.some(p=>p.yo)?`<button type="button" class="btn-primary grupo-estudiar-principal" data-amigos="grupo-estudiar" data-id="${esc(id)}" data-prueba="${esc(clave)}">Estudiar juntos</button>`:''}
    <h3 class="grupo-etiqueta">La tienen en su calendario</h3><ul class="grupo-celdas">${prueba.personas.map(p=>`<li class="amigo-fila"><span class="amigo-avatar" aria-hidden="true">${inicialAmigo(p)}</span><span>${esc(p.yo?'Tú':nombreAmigo(p))}</span></li>`).join('')}</ul>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Volver al grupo</button></div></section>`;
  openModal();
}
// Una prueba que tienen varios del grupo: anotar sala en la mejor ventana libre
// antes de la prueba, entre quienes la tienen. Sin ventana, el día anterior.
function estudiarJuntos(id,clave){
  const d=amigosGrupoDetalle;
  const prueba=d?.id===id&&eventosGrupo(d.cal).find(it=>it.clave===clave);
  if(!prueba)return;
  const enLaPrueba=new Set(prueba.personas.map(p=>p.username));
  const personas=personasGrupo(d).filter(p=>p.yo||enLaPrueba.has(p.username));
  const v=mejorLibreAntesDe(personas,prueba);
  const para=`Para estudiar ${prueba.titulo}${prueba.detalle?' ('+prueba.detalle+')':''}`;
  if(document.getElementById('modal').classList.contains('open'))closeModal();
  if(v)abrirReservaNueva(id,{fecha:v.fecha,inicio:v.inicio,fin:v.fin,para:`${para}. Coinciden libres ${participantesGrupo(personas.filter(p=>v.claves.includes(p.clave))).replace(/^Tú\b/,'tú')}.`});
  else{
    const hoy=fechaHorarioChile(Date.now()),antes=sumarDiasAgenda(prueba.fecha,-1);
    abrirReservaNueva(id,{fecha:antes>=hoy?antes:hoy,para:`${para}. No encontramos un horario libre en común antes de la prueba: elige uno.`});
  }
}
function abrirReservaGrupo(id,reserva){
  const d=amigosGrupoDetalle;
  const it=d?.id===id&&d.cal?.find(e=>e.tipo==='reserva'&&e.id===reserva);
  if(!it)return;
  document.getElementById('modal-content').innerHTML=`<section data-detalle-reserva="${esc(it.id)}"><p class="modal-label">Sala reservada</p>
    <h2 class="modal-title">${esc(it.titulo)}</h2><p>${esc(etiquetaDiaCalendario(it.fecha))} · ${esc(it.inicio)}–${esc(it.fin)}</p>
    ${it.detalle?`<p class="cal-codigo grupo-codigo">Código de la sala <b>${esc(it.detalle)}</b></p>`:''}
    <p>Anotada por ${esc(it.yo?'ti':nombreAmigo(it))}.</p>
    ${it.yo?`<button type="button" class="grupo-salir" data-amigos="reserva-borrar" data-id="${esc(it.id)}" data-grupo="${esc(id)}">Borrar reserva</button>`:''}
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Volver al grupo</button></div></section>`;
  openModal();
}
// `pre`: {fecha,inicio,fin,para} desde «Libres juntos» o «Estudiar juntos».
function abrirReservaNueva(id,pre={}){
  const visita=amigosGrupoDetalle;
  const hoy=fechaHorarioChile(Date.now()),max=sumarDiasAgenda(hoy,DIAS_CALENDARIO_GRUPO);
  const hora=h=>/^([01]\d|2[0-3]):[0-5]\d$/.test(h||'')?h:null;
  const fecha=/^\d{4}-\d{2}-\d{2}$/.test(pre.fecha||'')&&pre.fecha>=hoy&&pre.fecha<=max?pre.fecha:hoy;
  const inicio=hora(pre.inicio)||'14:00',fin=hora(pre.fin)&&hora(pre.fin)>inicio?pre.fin:(inicio<'22:00'?horaAmigo(minutosAmigo(inicio)+120):'23:59');
  document.getElementById('modal-content').innerHTML=`
    <h2 class="modal-title">Anotar sala</h2>
    ${pre.para?`<p class="grupo-para">${esc(pre.para)}</p>`:''}
    <form id="amigos-reserva-form" class="amigos-grupo-form">
      <label class="modal-label" for="amigos-reserva-lugar">Dónde</label>
      <input id="amigos-reserva-lugar" class="amigos-grupo-nombre" type="text" maxlength="60" required autocomplete="off" placeholder="Sala B-12, Biblioteca San Joaquín">
      <label class="modal-label" for="amigos-reserva-fecha">Día</label>
      <input id="amigos-reserva-fecha" class="amigos-grupo-nombre" type="date" required min="${hoy}" max="${max}" value="${fecha}">
      <div class="cal-horas">
        <label><span class="modal-label">Desde</span><input id="amigos-reserva-inicio" class="amigos-grupo-nombre" type="time" required value="${inicio}"></label>
        <label><span class="modal-label">Hasta</span><input id="amigos-reserva-fin" class="amigos-grupo-nombre" type="time" required value="${fin}"></label>
      </div>
      <label class="modal-label" for="amigos-reserva-codigo">Código de la sala (opcional)</label>
      <input id="amigos-reserva-codigo" class="amigos-grupo-nombre" type="text" maxlength="24" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="El que te llegó por mail">
      <p class="amigos-vacio-texto">La ve solo este grupo, con el código si lo anotas: así entra cualquiera aunque tú no llegues. La reserva en sí la haces en el sistema de tu universidad.</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="submit" form="amigos-reserva-form" class="btn-confirm">Anotar sala</button></div>`;
  openModal();
  document.getElementById('amigos-reserva-form').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const form=ev.currentTarget;
    if(form.hasAttribute('aria-busy'))return;
    const v=k=>document.getElementById('amigos-reserva-'+k).value;
    if(!v('lugar').trim()){showToast('Escribe dónde',true);return;}
    if(v('fin')<=v('inicio')){document.getElementById('amigos-reserva-fin').focus();showToast('La hora de término debe ser posterior a la de inicio.',true);return;}
    // Sin código no se manda p_codigo: la llamada queda igual que antes.
    const codigo=v('codigo').trim().replace(/\s+/g,' ');
    if(codigo&&!/^[A-Za-z0-9][A-Za-z0-9 -]{0,23}$/.test(codigo)){document.getElementById('amigos-reserva-codigo').focus();showToast('El código va con letras y números',true);return;}
    const enviar=document.querySelector('[form="amigos-reserva-form"]');
    form.setAttribute('aria-busy','true');enviar.disabled=true;
    const vigente=()=>visita===amigosGrupoDetalle&&form.isConnected&&document.getElementById('modal').classList.contains('open');
    try{
      await rpcAmigos('agregar_reserva_grupo',{p_grupo:id,p_lugar:v('lugar'),p_fecha:v('fecha'),p_inicio:v('inicio'),p_fin:v('fin'),...(codigo?{p_codigo:codigo}:{})});
      if(!vigente())return;
      if(typeof vibrar==='function')vibrar('exito');
      showToast('Sala anotada');
      abrirGrupo(id);
    }catch(e){if(vigente())showToast(mensajeErrorAmigos(e),true);}
    finally{form.removeAttribute('aria-busy');enviar.disabled=false;}
  });
}
// El promedio del amigo con el semáforo de siempre; sin notas, en gris.
function notaAmigoHTML(n,a){
  const quien=a&&a.nombre?a.nombre:'Tu amigo';
  if(n.promedio==null)return `<span class="amigo-nota neutral">Sin notas</span>`;
  const txt=notaConComa(Number(n.promedio).toFixed(1));
  return `<span class="amigo-nota ${esc(['good','warn','bad'].includes(n.nivel)?n.nivel:'neutral')}" aria-label="${esc(quien)} lleva ${esc(txt)}">${esc(txt)}</span>`;
}
async function cambiarCompartirNotas(valor){
  const sw=document.getElementById('amigos-notas');
  try{
    if(valor){
      const datos=resumenNotasAmigos(S.ramos);
      await rpcAmigos('publicar_mis_notas',{p_ramos:datos});
      _notasPublicadas=JSON.stringify(datos);amigosNotasComparte=true;
    }else{
      await rpcAmigos('dejar_de_compartir_notas');
      amigosNotasComparte=false;_notasPublicadas=null;amigosNotasCache=new Map();
    }
  }catch(e){showToast(mensajeErrorAmigos(e),true);if(sw)sw.checked=!valor;return;}
  refrescarAmigos();
}

// ─── Grupos ───
const ICONO_GRUPO='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.6 14.2c2.4-.3 4.4 1.2 4.9 4.3"/></svg>';
const ICONO_MAS='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const FLECHA_GRUPO='<svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
const personasTxt=n=>`${n} ${n===1?'persona':'personas'}`;
// El mismo tope que amigos_grupos.sql: no es un nombre académico (NOMBRE_MAX).
const GRUPO_NOMBRE_MAX=40;
let amigosGrupoDetalle=null;
// Lo próximo de cada grupo, para la lista («Interrogación 2 · martes 24»). Se
// llena al abrir un grupo y al cargar la lista; nunca inventa si no hay dato.
let amigosGrupoProximo=new Map();
function proximoGrupoTexto(cal){
  const ev=eventosGrupo(cal||[]).find(e=>e.tipo==='reserva'||(e.personas||[]).length>=2)||eventosGrupo(cal||[])[0];
  if(!ev)return '';
  const cuando=diaCortoGrupo(ev.fecha);
  return ev.tipo==='reserva'?`Sala ${cuando.toLowerCase()}${ev.inicio?' a las '+ev.inicio:''}`:`${ev.titulo} · ${cuando.toLowerCase()}`;
}
async function cargarProximosGrupos(){
  if(!amigosCalendarioDisponible||!amigosGruposCache)return;
  const v=amigosVersion,mios=amigosGruposCache.filter(g=>g.estado==='miembro').slice(0,6);
  const res=await Promise.allSettled(mios.map(g=>rpcAmigos('grupo_calendario',{p_grupo:g.id,p_dias:14})));
  if(v!==amigosVersion)return;
  let cambio=false;
  res.forEach((r,i)=>{if(r.status!=='fulfilled')return;const t=proximoGrupoTexto(r.value);if(amigosGrupoProximo.get(mios[i].id)!==t){amigosGrupoProximo.set(mios[i].id,t);cambio=true;}});
  if(cambio&&typeof currentTab!=='undefined'&&currentTab==='amigos'&&!amigosGrupoDetalle&&!escribiendoEnAmigos())pintarAmigos();
}
// «Beto, Dani y Flor»: la lista que muestran WhatsApp e Instagram bajo un grupo.
function listaNombres(nombres){
  const n=(nombres||[]).filter(Boolean);
  return n.length<=1?(n[0]||''):n.slice(0,-1).join(', ')+' y '+n[n.length-1];
}
// Dos iniciales superpuestas, como el avatar de un grupo en Instagram o iMessage.
// Sin nadie más todavía, el ícono de personas.
function avatarGrupoHTML(nombres,grande){
  const n=(nombres||[]).filter(Boolean).slice(0,2),ini=t=>esc((String(t).trim()[0]||'?').toUpperCase());
  const clase=`amigo-avatar grupo${grande?' grande':''}`;
  if(!(n.length>=2))return `<span class="${clase}" aria-hidden="true">${n.length?ini(n[0]):ICONO_GRUPO}</span>`;
  return `<span class="${clase} pila" aria-hidden="true"><span>${ini(n[0])}</span><span>${ini(n[1])}</span></span>`;
}
// Bajo el nombre: quiénes están. Si son más de los que llegan, «y 2 más».
function lineaGrupo(g){
  const otros=(g.nombres||[]).filter(Boolean).slice(0,2),resto=Math.max(0,(g.miembros||0)-(g.estado==='miembro'?1:0)-otros.length);
  const quienes=g.estado==='miembro'?['Tú',...otros]:otros.slice();
  if(resto)quienes.push(`${resto} más`);
  return listaNombres(quienes)||personasTxt(g.miembros||0);
}
function seccionGruposHTML(){
  if(!amigosGruposDisponible)return '';
  const grupos=amigosGruposCache||[],invit=grupos.filter(g=>g.estado==='invitado'),mios=grupos.filter(g=>g.estado==='miembro');
  const hayAmigos=(amigosListaCache||[]).some(a=>a.estado==='amigos');
  return `<section id="amigos-seccion-grupos" class="perfil-grupo amigos-grupo amigos-grupos" aria-labelledby="amigos-grupos-titulo">
    <h2 id="amigos-grupos-titulo">Grupos</h2>
    ${invit.length?`<h3 class="grupo-etiqueta">Invitaciones</h3><ul class="grupo-celdas grupo-invitaciones" role="list">
    ${invit.map(g=>`<li class="amigo-solicitud recibida">
      ${avatarGrupoHTML(g.nombres)}
      <span class="amigo-texto"><b>${esc(g.nombre)}</b><small>${esc(g.invitado_por?`@${g.invitado_por} te invitó`:'Te invitaron')}</small>${g.nombres?.length?`<small>${esc(lineaGrupo(g))}</small>`:''}</span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="grupo-rechazar" data-id="${esc(g.id)}" aria-label="Rechazar la invitación a ${esc(g.nombre)}">Rechazar</button>
      <button type="button" class="amigo-boton principal" data-amigos="grupo-aceptar" data-id="${esc(g.id)}" aria-label="Unirme a ${esc(g.nombre)}">Unirme</button></span></li>`).join('')}</ul>`:''}
    ${mios.length&&invit.length?'<h3 class="grupo-etiqueta">Tus grupos</h3>':''}
    ${mios.length||hayAmigos?`<ul class="grupo-celdas" role="list">
    ${mios.map(g=>`<li><button type="button" class="amigo-fila" data-amigos="grupo" data-id="${esc(g.id)}">
      ${avatarGrupoHTML(g.nombres)}
      <span class="amigo-texto"><b>${esc(g.nombre)}</b><small>${esc(lineaGrupo(g))}</small>${amigosGrupoProximo.get(g.id)?`<small class="grupo-proximo">${esc(amigosGrupoProximo.get(g.id))}</small>`:''}</span>
      ${FLECHA_GRUPO}</button></li>`).join('')}
    ${hayAmigos?`<li><button type="button" class="amigo-fila amigos-fila-mas" data-amigos="grupo-nuevo">
      <span class="amigo-avatar" aria-hidden="true">${ICONO_MAS}</span>
      <span class="amigo-texto"><b>Crear grupo</b>${mios.length?'':'<small>Comparte pruebas, salas y horarios</small>'}</span>${FLECHA_GRUPO}</button></li>`:''}
  </ul>`:''}
    ${!mios.length&&!invit.length&&!hayAmigos?'<p class="amigos-vacio-texto">Cuando tengas amigos en GradeHub, podrás crear un grupo.</p>':''}
  </section>`;
}
// Elegir amigos, como al crear un grupo en WhatsApp: los marcados aparecen
// arriba como fichas que se pueden quitar. `fuera`: usernames que ya están.
function elegirAmigosHTML(fuera){
  const lista=(amigosListaCache||[]).filter(a=>a.estado==='amigos'&&!(fuera||[]).includes(a.username));
  if(!lista.length)return '<p class="amigos-vacio-texto">No te quedan amigos por invitar.</p>';
  return `<p class="grupo-seleccion-estado" role="status">Elige a quién invitar</p>
    <div class="amigos-elegidos"></div>
    <ul class="amigos-elegir-lista grupo-celdas" role="list">${lista.map(a=>`<li><label class="amigos-elegir">
    <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span><span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b>${a.nombre?`<small>@${esc(a.username)}</small>`:''}</span>
    <input type="checkbox" name="u" value="${esc(a.username)}" data-nombre="${esc(a.nombre||'@'+a.username)}"></label></li>`).join('')}</ul>`;
}
// Repinta las fichas de arriba y avisa cuántos van marcados.
function enlazarElegirAmigos(form,alCambiar){
  const pintar=()=>{
    const marcados=[...form.querySelectorAll('input[name=u]:checked')];
    const caja=form.querySelector('.amigos-elegidos');
    const estado=form.querySelector('.grupo-seleccion-estado');
    if(estado)estado.textContent=marcados.length?`${personasTxt(marcados.length)} ${marcados.length===1?'seleccionada':'seleccionadas'}`:'Elige a quién invitar';
    if(caja)caja.innerHTML=marcados.map(i=>`<button type="button" class="amigos-elegido" data-quitar="${esc(i.value)}" aria-label="Quitar a ${esc(i.dataset.nombre)}"><span>${esc(i.dataset.nombre)}</span><span aria-hidden="true">×</span></button>`).join('');
    alCambiar(marcados);
  };
  form.addEventListener('change',pintar);
  form.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-quitar]');if(!b)return;
    const i=[...form.querySelectorAll('input[name=u]')].find(x=>x.value===b.dataset.quitar);
    if(i){i.checked=false;pintar();i.focus();}
  });
  pintar();
}
// Nombre opcional, como en Instagram: sin nombre se llama como sus personas.
function abrirGrupoNuevo(preUser){
  const hayAmigos=(amigosListaCache||[]).some(a=>a.estado==='amigos');
  document.getElementById('modal-content').innerHTML=`
    <h2 class="modal-title grupo-titulo">Crear grupo</h2>
    <form id="amigos-grupo-form" class="amigos-grupo-form" novalidate>
      <label class="grupo-etiqueta" for="amigos-grupo-nombre">Nombre <small>(opcional)</small></label>
      <input id="amigos-grupo-nombre" class="amigos-grupo-nombre" type="text" maxlength="${GRUPO_NOMBRE_MAX}" autocomplete="off" placeholder="Ej. Grupo de estudio">
      <fieldset><legend class="grupo-etiqueta">Amigos</legend>${hayAmigos?elegirAmigosHTML([]):'<p class="amigos-vacio-texto">Agrega amigos para armar un grupo.</p>'}</fieldset>
      <p class="grupo-privacidad">Al entrar al grupo, cada persona comparte su horario si lo tiene activado en Amigos. Las notas quedan privadas.</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="submit" form="amigos-grupo-form" class="btn-confirm" id="amigos-grupo-crear" disabled>Crear</button></div>`;
  openModal();
  const form=document.getElementById('amigos-grupo-form'),nombre=document.getElementById('amigos-grupo-nombre'),crear=document.getElementById('amigos-grupo-crear');
  if(preUser){const i=[...form.querySelectorAll('input[name=u]')].find(x=>x.value===preUser);if(i)i.checked=true;}
  enlazarElegirAmigos(form,m=>{crear.disabled=!m.length||form.hasAttribute('aria-busy');});
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const marcados=[...form.querySelectorAll('input[name=u]:checked')];
    if(crear.disabled||!marcados.length)return;
    crear.disabled=true;crear.textContent='Creando…';form.setAttribute('aria-busy','true');
    const v=amigosVersion;
    try{
      const id=await rpcAmigos('crear_grupo',{p_nombre:nombre.value.trim()||'Grupo de estudio',p_usernames:marcados.map(i=>i.value)});
      if(v!==amigosVersion)return;
      if(typeof vibrar==='function')vibrar('exito');
      showToast('Grupo creado');
      await refrescarAmigos();
      if(v===amigosVersion&&form.isConnected&&document.getElementById('modal').classList.contains('open'))abrirGrupo(id);
    }catch(e){if(v===amigosVersion)showToast(mensajeErrorAmigos(e),true);}
    finally{form.removeAttribute('aria-busy');crear.textContent='Crear';crear.disabled=!form.querySelector('input[name=u]:checked');}
  });
}
function volverDeGrupo(){
  const id=amigosGrupoDetalle?.id,arriba=amigosGrupoDetalle?.origenScroll||0;
  amigosGrupoDetalle=null;
  if(document.getElementById('modal')?.classList.contains('open'))closeModal();
  pintarAmigos();
  const scroll=document.querySelector('#screen-amigos .scroll');
  if(scroll)scroll.scrollTop=arriba;
  const fila=[...document.querySelectorAll('#amigos-body [data-amigos="grupo"]')].find(b=>b.dataset.id===id);
  fila?.focus({preventScroll:true});
}
async function abrirGrupo(id){
  if(!amigosVisible()||!id)return;
  if(document.getElementById('modal').classList.contains('open'))closeModal();
  const scroll=document.querySelector('#screen-amigos .scroll');
  const d={id,filas:[],cal:null,cargando:true,origenScroll:amigosGrupoDetalle?.origenScroll??scroll?.scrollTop??0};
  if(scroll)scroll.scrollTop=0;
  amigosGrupoDetalle=d;
  pintarActividadGrupo(d);
  document.getElementById('grupo-actividad-titulo')?.focus?.({preventScroll:true});
  await cargarActividadGrupo(d);
}
async function cargarActividadGrupo(d){
  if(d.consultando)return;
  d.consultando=true;
  const v=amigosVersion,cuenta=currentUser?.id;
  const vigente=()=>amigosGrupoDetalle===d&&v===amigosVersion&&currentUser?.id===cuenta;
  try{
    const [filas,cal]=await Promise.all([rpcAmigos('grupo_detalle',{p_grupo:d.id}),
      amigosCalendarioDisponible?rpcAmigos('grupo_calendario',{p_grupo:d.id,p_dias:DIAS_CALENDARIO_GRUPO}).catch(()=>null):null]);
    if(!vigente())return;
    d.filas=filas||[];d.cal=cal;d.error=false;
    if(Array.isArray(cal))amigosGrupoProximo.set(d.id,proximoGrupoTexto(cal));
    const g=amigosGruposCache?.find(g=>g.id===d.id),miembros=d.filas.filter(f=>f.estado==='miembro');
    d.resumen={estado:'miembro',miembros:miembros.length,nombres:miembros.filter(f=>!f.yo).map(quienGrupo)};
    if(g)Object.assign(g,d.resumen);
  }catch(e){
    if(!vigente())return;
    d.filas=[];d.cal=null;d.error=true;
  }finally{d.consultando=false;}
  if(!vigente())return;
  d.cargando=false;
  pintarActividadGrupo(d);
  const reserva=document.querySelector('#modal.open [data-detalle-reserva]');
  if(reserva&&!d.cal?.some(it=>it.tipo==='reserva'&&it.id===reserva.dataset.detalleReserva))closeModal();
  const prueba=document.querySelector('#modal.open [data-detalle-prueba]');
  if(prueba){
    const evento=eventosGrupo(d.cal).find(e=>e.clave===prueba.dataset.detallePrueba);
    if(!evento)closeModal();
    else if(prueba.dataset.personas!==JSON.stringify(evento.personas))abrirPruebaGrupo(d.id,evento.clave);
  }
  if(document.querySelector('#modal.open .grupo-ficha')&&d.firmaInfo!==JSON.stringify(d.filas)){
    if(d.error)closeModal();else pintarGrupo(d.id,d.filas);
  }
}
function pintarActividadGrupo(d){
  const caja=document.getElementById('amigos-body');if(!caja)return;
  const g=amigosGruposCache?.find(x=>x.id===d.id);
  const cabecera=d.resumen||g;
  const pendientes=d.filas.filter(f=>f.estado==='invitado').length;
  const id=esc(d.id);
  const acceso=(accion,texto)=>`<button type="button" class="amigos-link" data-amigos="${accion}" data-id="${id}">${texto}</button>`;
  const nombre=esc(g?.nombre||'Grupo');
  let actividad;
  if(!amigosCalendarioDisponible)actividad='<p>El calendario del grupo aún no está disponible.</p>';
  else if(d.cal===null)actividad=`<p>No se pudo actualizar el calendario.</p>${acceso('grupo','Reintentar')}`;
  else if(d.cal?.length)actividad=calendarioGrupoHTML(d.id,d.cal);
  else if(pendientes&&cabecera?.miembros===1)actividad='<p>Por ahora solo estás tú. Cuando tus amigos se unan, verán aquí las salas y las pruebas que compartan.</p>';
  else actividad=`<p>Aún no hay pruebas compartidas ni salas anotadas para los próximos ${DIAS_CALENDARIO_GRUPO} días.</p>`;
  const contenido=`<section class="grupo-actividad"><header class="grupo-barra">
    <button type="button" class="grupo-atras" data-amigos="grupo-volver" aria-label="Volver a Amigos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4-8 8 8 8"/></svg></button>
    <h1 id="grupo-actividad-titulo" tabindex="-1"><button type="button" class="grupo-identidad" data-amigos="grupo-info" data-id="${id}" ${d.cargando||d.error?'disabled':''} aria-label="Información de ${nombre}" aria-describedby="grupo-participantes">
      ${avatarGrupoHTML(cabecera?.nombres)}<span class="grupo-rotulo"><strong>${nombre}</strong>
      ${cabecera&&!d.error?`<small id="grupo-participantes">${esc(lineaGrupo(cabecera))}${pendientes&&!d.cargando?` · ${pendientes===1?'1 invitación':pendientes+' invitaciones'}`:''}</small>`:''}</span>
    </button></h1></header>
    ${d.cargando?'<p role="status">Cargando grupo…</p>':d.error?`<p role="status">No se pudo cargar el grupo.</p>${acceso('grupo','Reintentar')}`:`
    ${ahoraGrupoHTML(d)}
    ${libresJuntosHTML(d)}
    <div class="grupo-actividad-titulo grupo-seccion-titulo"><h2>Lo que viene</h2>${amigosCalendarioDisponible?acceso('reserva-nueva','Anotar sala'):''}</div>
    ${actividad}`}</section>`;
  if(d.html!==contenido||!caja.querySelector('.grupo-actividad')){
    const activo=document.activeElement;
    const previo=activo&&caja.contains?.(activo)?activo:null;
    d.html=contenido;caja.innerHTML=contenido;
    if(previo){
      const target=previo.dataset;
      const equivalente=[...caja.querySelectorAll('[data-amigos]')].find(b=>target.amigos&&b.dataset.amigos===target.amigos&&b.dataset.prueba===target.prueba&&b.dataset.reserva===target.reserva);
      (equivalente||caja.querySelector('h1'))?.focus({preventScroll:true});
    }
  }
}
function pintarGrupo(id,filas,seccion){
  const g=(amigosGruposCache||[]).find(x=>x.id===id)||{nombre:'Grupo'};
  if(amigosGrupoDetalle?.id===id)amigosGrupoDetalle.firmaInfo=JSON.stringify(filas);
  const ahora=new Date();
  const miembros=filas.filter(f=>f.estado==='miembro');
  const pendientes=filas.filter(f=>f.estado==='invitado');
  const horarios=miembros.filter(f=>!f.yo&&f.ramos).map(f=>({f,ramos:normalizarRamosAmigo(f.ramos)}));
  const mioConHorario=S.ramos.some(r=>copiarHorario(r.horario).length);
  const agendas=[...(mioConHorario?[S.ramos]:[]),...horarios.map(h=>h.ramos)].filter(ramos=>ramos.some(r=>copiarHorario(r.horario).length));
  const horariosSuficientes=agendas.length>=2;
  const semana=horariosSuficientes?semanaLibresGrupo(agendas):[];
  const turnos=mioConHorario?horarios.map(({f,ramos})=>({f,m:matchTurno(S.ramos,ramos)})).filter(x=>x.m.tipo!=='ninguno'):[];
  const nombres=miembros.filter(f=>!f.yo).map(f=>(f.nombre||f.username).split(' ')[0]);
  const hayInvitables=(amigosListaCache||[]).some(a=>a.estado==='amigos'&&!filas.some(f=>f.username===a.username));
  const filaHTML=f=>{
    const ramos=f.ramos?normalizarRamosAmigo(f.ramos):null,est=ramos?estadoAhoraAmigo(ramos,ahora):null;
    const linea=f.estado==='invitado'||f.yo?'@'+f.username:est?textoEstadoAmigo(est):'Horario no disponible';
    const contenido=`<span class="amigo-avatar${est?anilloAmigo(est):''}" aria-hidden="true">${inicialAmigo(f)}</span>
      <span class="amigo-texto"><b>${f.yo?'Tú':esc(nombreAmigo(f))}</b><small>${esc(linea)}</small></span>
      ${f.creador?'<span class="amigo-chip">Admin</span>':''}`;
    return f.yo?`<li class="amigo-solicitud">${contenido}</li>`
      :`<li><button type="button" class="amigo-fila" data-amigos="grupo-miembro" data-id="${esc(id)}" data-user="${esc(f.username)}">${contenido}${FLECHA_GRUPO}</button></li>`;
  };
  document.getElementById('modal-content').innerHTML=`
    <div class="grupo-ficha">
    <div class="grupo-cabecera">
      ${avatarGrupoHTML(nombres,true)}
      <h2 class="modal-title grupo-titulo">${esc(g.nombre)}</h2>
      <p class="amigo-sub">${esc(personasTxt(miembros.length))}</p>
      <button type="button" class="grupo-nombre" data-amigos="grupo-renombrar" data-id="${esc(id)}">
        Cambiar nombre
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></button>
    </div>
    <section class="grupo-seccion">
    <h3 class="grupo-etiqueta">Integrantes</h3>
    <ul class="amigo-lista amigo-lista-personas grupo-celdas" role="list">
      ${hayInvitables?`<li><button type="button" class="amigo-fila amigos-fila-mas" data-amigos="grupo-invitar" data-id="${esc(id)}">
        <span class="amigo-avatar" aria-hidden="true">${ICONO_MAS}</span><span class="amigo-texto"><b>Invitar amigos</b></span>${FLECHA_GRUPO}</button></li>`:''}
      ${miembros.map(filaHTML).join('')}
    </ul>
    </section>
    ${pendientes.length?`<section class="grupo-seccion"><h3 class="grupo-etiqueta" id="grupo-invitaciones" tabindex="-1">Invitaciones pendientes</h3>
      <ul class="amigo-lista amigo-lista-personas grupo-celdas" role="list">${pendientes.map(filaHTML).join('')}</ul></section>`:''}
    <section class="grupo-seccion">
      <h3 class="grupo-etiqueta">Horarios libres en común</h3>
      ${!horariosSuficientes?'<p class="amigos-vacio-texto">Se necesitan al menos dos horarios para calcular las coincidencias.</p>'
        :semana.length?`<ul class="amigo-lista grupo-celdas grupo-horarios" role="list">${semana.map(d=>`<li>
          <span><b>${esc(d.nombre)}</b><small>Libres juntos los ${esc(String(d.personas))} que van ese día</small></span>
          <span class="amigo-horas">${d.ventanas.map(v=>`<span>${esc(v.inicio)}–${esc(v.fin)}</span>`).join('')}</span></li>`).join('')}</ul>`
        :'<p class="amigos-vacio-texto">Esta semana no hay ventanas libres en común.</p>'}
    </section>
    ${turnos.length?`<section class="grupo-seccion"><h3 class="grupo-etiqueta">Hacer turno contigo</h3>
      <ul class="amigo-lista grupo-celdas grupo-horarios" role="list">${turnos.map(({f,m})=>`<li><b>${esc(nombreAmigo(f))}</b>
      <span class="amigo-horas">${esc(m.tipo==='perfecto'?'Coinciden todos los días':listaDiasTurno(m.dias))}</span></li>`).join('')}</ul></section>`:''}
    <button type="button" class="grupo-salir" data-amigos="grupo-salir" data-id="${esc(id)}">
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/></svg>Salir del grupo</button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
  if(seccion==='pendientes')document.getElementById('grupo-invitaciones')?.focus();
}
// Tocar a alguien del grupo: como en WhatsApp, un menú corto. Su ficha si es
// tu amigo; sacarlo si eres admin.
function abrirMiembroGrupo(id,username){
  const f=amigosGrupoDetalle&&amigosGrupoDetalle.id===id&&amigosGrupoDetalle.filas.find(x=>x.username===username);if(!f)return;
  const yo=amigosGrupoDetalle.filas.find(x=>x.yo),amistad=(amigosListaCache||[]).find(a=>a.username===username);
  const opciones=[
    amistad?.estado==='amigos'?`<button type="button" class="grupo-opcion" data-amigos="ver" data-id="${esc(amistad.id)}">Ver ficha de ${esc(f.nombre||'@'+f.username)}</button>`:'',
    amistad?.estado==='enviada'?'<p class="amigo-sub">Solicitud de amistad enviada</p>':'',
    amistad?.estado==='recibida'?`<button type="button" class="grupo-opcion" data-amigos="grupo-aceptar-amistad" data-id="${esc(amistad.id)}" data-user="${esc(username)}">Aceptar solicitud de amistad</button>`:'',
    !amistad?`<button type="button" class="grupo-opcion" data-amigos="grupo-agregar-amigo" data-user="${esc(username)}">Agregar a amigos</button>`:'',
    yo&&yo.creador?`<button type="button" class="grupo-opcion peligro" data-amigos="grupo-quitar" data-id="${esc(id)}" data-user="${esc(username)}">${f.estado==='invitado'?'Retirar invitación':'Sacar del grupo'}</button>`:''
  ].filter(Boolean);
  document.getElementById('modal-content').innerHTML=`
    <div class="amigo-cabecera"><span class="amigo-avatar grande" aria-hidden="true">${inicialAmigo(f)}</span>
      <div><h2 class="modal-title grupo-titulo">${esc(nombreAmigo(f))}</h2>${f.nombre?`<p class="amigo-sub">@${esc(f.username)}</p>`:''}</div></div>
    <div class="grupo-opciones">${opciones.join('')}</div>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo-info" data-id="${esc(id)}">Volver</button></div>`;
  openModal();
}
async function volverAInfoTrasEdicion(id,form){
  const visita=amigosGrupoDetalle;
  if(visita?.id!==id)return;
  await refrescarAmigos();
  if(amigosGrupoDetalle!==visita||!form.isConnected||!document.getElementById('modal').classList.contains('open'))return;
  if(visita.error)closeModal();else pintarGrupo(id,visita.filas);
}
function abrirInvitarGrupo(id){
  const fuera=amigosGrupoDetalle&&amigosGrupoDetalle.id===id?amigosGrupoDetalle.filas.map(f=>f.username):[];
  document.getElementById('modal-content').innerHTML=`
    <h2 class="modal-title grupo-titulo">Invitar amigos</h2>
    <form id="amigos-invitar-form" class="amigos-grupo-form" novalidate>${elegirAmigosHTML(fuera)}</form>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo-info" data-id="${esc(id)}">Volver</button>
      <button type="submit" form="amigos-invitar-form" class="btn-confirm" id="amigos-invitar-ok" disabled>Enviar</button></div>`;
  openModal();
  const ok=document.getElementById('amigos-invitar-ok'),form=document.getElementById('amigos-invitar-form');
  enlazarElegirAmigos(form,m=>{ok.disabled=!m.length||form.hasAttribute('aria-busy');});
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const usernames=[...form.querySelectorAll('input[name=u]:checked')].map(i=>i.value);
    if(ok.disabled||!usernames.length)return;
    ok.disabled=true;ok.textContent='Enviando…';form.setAttribute('aria-busy','true');
    const v=amigosVersion;
    let enviadas=0;
    try{
      for(const u of usernames){
        if(v!==amigosVersion)return;
        await rpcAmigos('invitar_a_grupo',{p_grupo:id,p_username:u});
        enviadas++;
      }
      if(v===amigosVersion)showToast(enviadas===1?'Invitación enviada':'Invitaciones enviadas');
    }catch(e){
      if(v===amigosVersion)showToast(enviadas?`Se enviaron ${enviadas} de ${usernames.length} invitaciones. Puedes volver a invitar a quienes faltan.`:mensajeErrorAmigos(e),true);
    }finally{
      if(enviadas&&v===amigosVersion)await volverAInfoTrasEdicion(id,form);
      form.removeAttribute('aria-busy');ok.textContent='Enviar';ok.disabled=!form.querySelector('input[name=u]:checked');
    }
  });
}
function abrirRenombrarGrupo(id){
  const g=(amigosGruposCache||[]).find(x=>x.id===id)||{nombre:''};
  document.getElementById('modal-content').innerHTML=`
    <h2 class="modal-title grupo-titulo">Cambiar nombre</h2>
    <form id="amigos-renombrar-form" novalidate><label class="grupo-etiqueta" for="amigos-renombrar">Nombre del grupo</label>
    <input id="amigos-renombrar" class="amigos-grupo-nombre" type="text" maxlength="${GRUPO_NOMBRE_MAX}" autocomplete="off" value="${esc(g.nombre)}" required></form>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo-info" data-id="${esc(id)}">Volver</button>
      <button type="submit" form="amigos-renombrar-form" class="btn-confirm" id="amigos-renombrar-ok">Guardar</button></div>`;
  openModal();
  const form=document.getElementById('amigos-renombrar-form'),nombre=document.getElementById('amigos-renombrar'),ok=document.getElementById('amigos-renombrar-ok');
  const actualizar=()=>{ok.disabled=!nombre.value.trim()||nombre.value.trim()===g.nombre||form.hasAttribute('aria-busy');};
  nombre.addEventListener('input',actualizar);
  actualizar();
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    if(ok.disabled)return;
    ok.disabled=true;ok.textContent='Guardando…';form.setAttribute('aria-busy','true');
    const v=amigosVersion;
    try{
      const nuevoNombre=await rpcAmigos('renombrar_grupo',{p_grupo:id,p_nombre:nombre.value.trim()});
      if(v!==amigosVersion)return;
      if(typeof nuevoNombre==='string')g.nombre=nuevoNombre;
      showToast('Nombre actualizado');
      await volverAInfoTrasEdicion(id,form);
    }catch(e){if(v===amigosVersion)showToast(mensajeErrorAmigos(e),true);}
    finally{form.removeAttribute('aria-busy');ok.textContent='Guardar';actualizar();}
  });
}
async function accionGrupo(accion,{id,user,confirmado}={}){
  const g=(amigosGruposCache||[]).find(x=>x.id===id),nombre=g?g.nombre:'el grupo';
  try{
    if(accion==='grupo-aceptar'){
      if(!confirmado)return showConfirm(`¿Unirte a ${nombre}?`,amigosEstadoCache?.comparte_horario===false
        ?'Tu horario está oculto. Si activas «Compartir mi horario» en Amigos, quienes estén en el grupo podrán verlo. Tus notas quedan privadas.'
        :'Las personas del grupo podrán ver tu horario, incluso si aún no son tus amigos. Tus notas quedan privadas.',()=>accionGrupo(accion,{id,confirmado:true}),{label:'Unirme',danger:false});
      await rpcAmigos('responder_grupo',{p_grupo:id,p_aceptar:true});
      if(typeof vibrar==='function')vibrar('exito');
      await refrescarAmigos();abrirGrupo(id);return;
    }
    if(accion==='grupo-rechazar')await rpcAmigos('responder_grupo',{p_grupo:id,p_aceptar:false});
    else if(accion==='grupo-salir'){
      if(!confirmado)return showConfirm(`¿Salir de ${nombre}?`,'Perderás acceso al grupo y a los horarios compartidos allí. No le avisaremos a nadie.',()=>accionGrupo(accion,{id,confirmado:true}),{label:'Salir',danger:true,focusCancel:true});
      await rpcAmigos('salir_de_grupo',{p_grupo:id});volverDeGrupo();
    }else if(accion==='grupo-quitar'){
      if(!confirmado){
        const invitado=amigosGrupoDetalle?.filas.find(f=>f.username===user)?.estado==='invitado';
        return showConfirm(invitado?`¿Retirar la invitación de @${user}?`:`¿Sacar a @${user}?`,
          invitado?'Si ya aceptó la invitación, también saldrá del grupo.':'Perderá acceso al grupo y a los horarios compartidos allí.',
          ()=>accionGrupo(accion,{id,user,confirmado:true}),{label:invitado?'Retirar':'Sacar',danger:true,focusCancel:true});
      }
      await rpcAmigos('quitar_de_grupo',{p_grupo:id,p_username:user});
      await refrescarAmigos();abrirGrupo(id);return;
    }
  }catch(e){showToast(mensajeErrorAmigos(e),true);return;}
  await refrescarAmigos();
}

// ─── Acciones ───
async function accionAmigos(accion,{id,user,confirmado}={}){
  const a=id&&(amigosListaCache||[]).find(x=>x.id===id),nombre=a?nombreAmigo(a):'@'+user;
  try{
    if(accion==='aceptar'){await rpcAmigos('responder_amistad',{p_id:id,p_aceptar:true});if(typeof vibrar==='function')vibrar('exito');showToast(`Ahora son amigos con ${nombre}`);}
    else if(accion==='rechazar')await rpcAmigos('responder_amistad',{p_id:id,p_aceptar:false});
    else if(accion==='cancelar')await rpcAmigos('eliminar_amistad',{p_id:id});
    else if(accion==='pedir'){
      const r=await rpcAmigos('solicitar_amistad',{p_username:user});
      showToast(r==='amigos'?`Ahora son amigos con @${user}`:'Solicitud enviada');closeModal();
    }else if(accion==='eliminar'){
      if(!confirmado)return showConfirm(`¿Eliminar a ${nombre}?`,'Dejarán de ver sus horarios. No le avisaremos.',()=>accionAmigos('eliminar',{id,confirmado:true}),{label:'Eliminar'});
      await rpcAmigos('eliminar_amistad',{p_id:id});closeModal();
    }else if(accion==='bloquear'){
      if(!confirmado)return showConfirm(`¿Bloquear a @${user}?`,'Dejarán de ser amigos y no podrán encontrarse ni volver a agregarse. No le avisaremos.',()=>accionAmigos('bloquear',{user,confirmado:true}),{label:'Bloquear'});
      await rpcAmigos('bloquear_usuario',{p_username:user});closeModal();showToast(`Bloqueaste a @${user}`);
    }else if(accion==='desbloquear'){await rpcAmigos('desbloquear_usuario',{p_username:user});abrirBloqueados();return;}
  }catch(e){showToast(mensajeErrorAmigos(e),true);return;}
  await refrescarAmigos();
}
async function cambiarCompartirHorario(valor){
  try{
    await rpcAmigos('amigos_compartir_horario',{p_comparte:!!valor});
    amigosEstadoCache={...(amigosEstadoCache||{}),comparte_horario:!!valor};
  }catch(e){
    showToast(mensajeErrorAmigos(e),true);
    const sw=document.getElementById('amigos-compartir');if(sw)sw.checked=!valor;
  }
}
// Un solo oyente para la pestaña y sus hojas: se repintan sin re-enganchar.
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  document.addEventListener('click',ev=>{
    const b=ev.target&&ev.target.closest&&ev.target.closest('[data-amigos]');
    if(!b||!(b.closest('#amigos-body')||b.closest('#modal-content')||b.closest('#screen-amigos')))return;
    const acc=b.dataset.amigos,id=b.dataset.id,user=b.dataset.user;
    if(acc==='ver')abrirAmigo(id);
    else if(acc==='agregar')abrirAgregarAmigo();
    else if(acc==='invitar')invitarAmigos();
    else if(acc==='bloqueados')abrirBloqueados();
    else if(acc==='denunciar')abrirDenunciarAmigo(user);
    else if(acc==='grupo')abrirGrupo(id);
    else if(acc==='grupo-volver')volverDeGrupo();
    else if(acc==='grupo-info'||acc==='grupo-pendientes'){
      const d=amigosGrupoDetalle;
      if(d?.id!==id||d.cargando)return;
      if(d.error)closeModal();else pintarGrupo(id,d.filas,acc==='grupo-pendientes'?'pendientes':null);
    }
    else if(acc==='grupo-reserva')abrirReservaGrupo(id,b.dataset.reserva);
    else if(acc==='grupo-prueba')abrirPruebaGrupo(id,b.dataset.prueba);
    else if(acc==='grupo-nuevo')abrirGrupoNuevo();
    else if(acc==='grupo-con')abrirGrupoNuevo(user);
    else if(acc==='reserva-nueva')abrirReservaNueva(id,{fecha:b.dataset.fecha,inicio:b.dataset.inicio,fin:b.dataset.fin});
    else if(acc==='grupo-estudiar')estudiarJuntos(id,b.dataset.prueba);
    else if(acc==='avisos-si'||acc==='avisos-no'){
      try{localStorage.setItem(CLAVE_AVISOS_PREGUNTA,acc==='avisos-si'?'si':'no');}catch(e){}
      (acc==='avisos-si'?activarAvisosAmigos():Promise.resolve()).then(()=>pintarAmigos());
    }
    else if(acc==='reserva-borrar'){
      const d=amigosGrupoDetalle;
      if(!d||d.id!==b.dataset.grupo)return;
      showConfirm('¿Borrar esta reserva del calendario?','Solo la quita del grupo. Si reservaste en tu universidad, cancélala allá.',async()=>{
        if(d!==amigosGrupoDetalle)return;
        try{await rpcAmigos('borrar_reserva_grupo',{p_id:id});if(d===amigosGrupoDetalle)abrirGrupo(d.id);}
        catch(e){if(d===amigosGrupoDetalle)showToast(mensajeErrorAmigos(e),true);}
      },{label:'Borrar',focusCancel:true});
    }
    else if(acc==='menu-amigo')abrirMenuAmigo(id);
    else if(acc==='semana')abrirSemanaAmigo(id);
    else if(acc==='grupo-invitar')abrirInvitarGrupo(id);
    else if(acc==='grupo-renombrar')abrirRenombrarGrupo(id);
    else if(acc==='grupo-miembro')abrirMiembroGrupo(id,user);
    else if(acc==='grupo-aceptar-amistad'){
      const d=amigosGrupoDetalle;
      if(!d||b.disabled)return;
      b.disabled=true;
      accionAmigos('aceptar',{id}).then(()=>{
        if(d===amigosGrupoDetalle&&b.isConnected&&document.getElementById('modal').classList.contains('open'))abrirMiembroGrupo(d.id,user);
      });
    }
    else if(acc==='grupo-agregar-amigo')accionAmigos('pedir',{user});
    else if(acc.startsWith('grupo-'))accionGrupo(acc,{id,user});
    else accionAmigos(acc,{id,user});
  });
  document.addEventListener('change',ev=>{
    if(ev.target&&ev.target.id==='amigos-compartir')cambiarCompartirHorario(ev.target.checked);
    else if(ev.target&&ev.target.id==='amigos-notas')cambiarCompartirNotas(ev.target.checked);
    else if(ev.target&&ev.target.id==='amigos-pruebas')cambiarCompartirPruebas(ev.target.checked);
    else if(ev.target&&ev.target.id==='amigos-avisos'){
      const sw=ev.target;
      if(sw.checked)activarAvisosAmigos().then(ok=>{if(!ok)sw.checked=false;});else desactivarAvisosAmigos();
    }
  });
}
