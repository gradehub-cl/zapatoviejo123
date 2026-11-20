
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
  }catch(e){if(v===amigosVersion)amigosDisponibleCache=false;}
  return amigosDisponibleCache;
}
// Grupos y notas: si su SQL no está aplicado, esa parte simplemente no aparece.
async function sondearExtrasAmigos(v){
  const [g,n,c]=await Promise.allSettled([rpcAmigos('mis_grupos'),rpcAmigos('amigos_notas_estado'),rpcAmigos('amigos_pruebas_estado')]);
  if(v!==amigosVersion)return;
  amigosCalendarioDisponible=c.status==='fulfilled';amigosPruebasComparte=amigosCalendarioDisponible&&c.value===true;
  amigosGruposDisponible=g.status==='fulfilled';amigosGruposCache=amigosGruposDisponible&&Array.isArray(g.value)?g.value:(amigosGruposDisponible?[]:null);
  amigosNotasDisponible=n.status==='fulfilled';amigosNotasComparte=!!(amigosNotasDisponible&&n.value&&n.value.comparte);
}
function olvidarAmigos(){
  amigosVersion++;amigosDisponibleCache=false;amigosEstadoCache=null;amigosListaCache=null;amigosHorariosCache=new Map();
  amigosGruposDisponible=false;amigosGruposCache=null;amigosNotasDisponible=false;amigosNotasComparte=false;amigosNotasCache=new Map();
  _notasPublicadas=null;clearTimeout(_notasTimer);
  amigosCalendarioDisponible=false;amigosPruebasComparte=false;_pruebasPublicadas=null;
}
async function refrescarAmigos(){
  if(!amigosVisible()||amigosCargando)return;
  amigosCargando=true;const v=amigosVersion;
  try{
    const [estado,lista,horarios,grupos,notas]=await Promise.all([rpcAmigos('amigos_estado'),rpcAmigos('mis_amistades'),rpcAmigos('amigos_horarios'),
      amigosGruposDisponible?rpcAmigos('mis_grupos'):null,amigosNotasDisponible&&amigosNotasComparte?rpcAmigos('amigos_notas'):null]);
    if(v!==amigosVersion)return;
    amigosEstadoCache=estado||{};amigosListaCache=lista||[];
    amigosHorariosCache=new Map((horarios||[]).map(h=>[h.id,normalizarRamosAmigo(h.ramos)]));
    if(amigosGruposDisponible)amigosGruposCache=Array.isArray(grupos)?grupos:[];
    amigosNotasCache=new Map((Array.isArray(notas)?notas:[]).map(n=>[n.id,Array.isArray(n.ramos)?n.ramos:[]]));
  }catch(e){
    if(v===amigosVersion&&!amigosListaCache)amigosListaCache=[];
    if(v===amigosVersion)showToast(mensajeErrorAmigos(e),true);
  }finally{amigosCargando=false;}
  if(typeof currentTab!=='undefined'&&currentTab==='amigos')pintarAmigos();
  pintarInsigniaAmigos();
  publicarNotasAmigos();publicarPruebasAmigos();
}
function renderAmigos(){
  pintarAmigos();
  refrescarAmigos();
}
// El número de solicitudes, sobre el ícono de la pestaña (HIG: Tab bars, badges).
function pintarInsigniaAmigos(){
  const btn=typeof document!=='undefined'&&document.getElementById('nav-amigos');if(!btn)return;
  // Solicitudes de amistad e invitaciones a grupos: las dos esperan una respuesta.
  const n=(Number(amigosEstadoCache&&amigosEstadoCache.recibidas)||0)+(amigosGruposCache||[]).filter(g=>g.estado==='invitado').length;
  let marca=btn.querySelector('.nav-insignia');
  if(!n){if(marca)marca.remove();btn.setAttribute('aria-label','Amigos');return;}
  if(!marca){marca=document.createElement('span');marca.className='nav-insignia';marca.setAttribute('aria-hidden','true');btn.querySelector('.nav-icon').appendChild(marca);}
  marca.textContent=n>9?'9+':String(n);
  btn.setAttribute('aria-label',`Amigos, ${n} ${n===1?'pendiente':'pendientes'}`);
}

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
// La cabecera de un perfil de Instagram: avatar y tres cifras al lado, el nombre
// abajo y dos botones del mismo peso («Editar username», «Compartir perfil»).
function cabeceraPerfilAmigosHTML(e,amigos,ahora){
  const grupos=(amigosGruposCache||[]).filter(g=>g.estado==='miembro').length;
  const enLaU=amigos.filter(a=>{const r=amigosHorariosCache.get(a.id),est=r&&estadoAhoraAmigo(r,ahora);return est&&(est.estado==='clase'||est.estado==='libre');}).length;
  const nombre=[S.userName,S.userApellido].filter(Boolean).join(' ');
  const t=typeof TENANTS!=='undefined'&&TENANTS[S.tenant];
  const linea=[t?t.short:'',S.carreraNombre].filter(Boolean).join(' · ');
  const cifra=(n,txt,accion)=>accion?`<button type="button" class="amigos-cifra" data-amigos="${accion}"><b>${n}</b><small>${txt}</small></button>`:`<div class="amigos-cifra"><b>${n}</b><small>${txt}</small></div>`;
  return `<section class="amigos-perfil">
    <div class="amigos-perfil-fila">
      <span class="amigo-avatar perfil-grande" aria-hidden="true">${esc(userInitial())}</span>
      <div class="amigos-cifras">
        ${cifra(amigos.length,amigos.length===1?'amigo':'amigos',amigos.length?'ir-amigos':'')}
        ${amigosGruposDisponible?cifra(grupos,grupos===1?'grupo':'grupos',grupos?'ir-grupos':''):''}
        ${cifra(enLaU,'en la u','')}
      </div>
    </div>
    ${nombre?`<b class="amigos-perfil-nombre">${esc(nombre)}</b>`:''}
    <span class="amigos-perfil-user">@${esc(e.username)}${linea?` · ${esc(linea)}`:''}</span>
    <div class="amigos-perfil-botones">
      <button type="button" class="amigo-boton" data-amigos="editar-username">Editar username</button>
      <button type="button" class="amigo-boton" data-amigos="invitar">Compartir perfil</button>
    </div>
  </section>`;
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
    ${cabeceraPerfilAmigosHTML(e,amigos,ahora)}
    ${historiasAmigosHTML(amigos,ahora)}
    ${recibidas.length?`<section class="perfil-grupo amigos-grupo"><h2>Solicitudes</h2><ul>${recibidas.map(a=>`<li class="amigo-solicitud recibida">
      <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${sub(a)}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="rechazar" data-id="${esc(a.id)}" aria-label="Rechazar a ${esc(nombreAmigo(a))}">Rechazar</button>
      <button type="button" class="amigo-boton principal" data-amigos="aceptar" data-id="${esc(a.id)}" aria-label="Aceptar a ${esc(nombreAmigo(a))}">Aceptar</button></span></li>`).join('')}</ul></section>`:''}
    ${seccionTurnoHTML(amigos)}
    ${amigos.length?`<section class="perfil-grupo amigos-grupo" id="amigos-seccion-amigos"><h2>Tus amigos</h2><ul>${amigos.map(a=>filaAmigoHTML(a,ahora)).join('')}</ul></section>`
      :`<section class="amigos-vacio"><h2>Agrega a tu primer amigo</h2><p>Mándales tu link o búscalos por su username.</p>
        <button type="button" class="btn-primary" data-amigos="invitar">Invitar amigos</button>
        <button type="button" class="amigos-link" data-amigos="agregar">Buscar por username</button></section>`}
    ${seccionGruposHTML()}
    ${enviadas.length?`<section class="perfil-grupo amigos-grupo"><h2>Enviadas</h2><ul>${enviadas.map(a=>`<li class="amigo-solicitud">
      <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${sub(a)}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="cancelar" data-id="${esc(a.id)}" aria-label="Cancelar la solicitud a ${esc(nombreAmigo(a))}">Cancelar</button></span></li>`).join('')}</ul></section>`:''}
    <section class="perfil-grupo amigos-grupo">
      <h2>Privacidad</h2>
      <ul>
        <li><label class="amigos-ajuste" for="amigos-compartir"><span><b>Compartir mi horario</b><small>${amigosGruposDisponible?'Tus amigos y tus grupos':'Tus amigos'} ven tus ramos y tus clases.${amigosNotasDisponible?'':' Nunca tus notas.'}</small></span>
          <input id="amigos-compartir" type="checkbox" role="switch"${e.comparte_horario!==false?' checked':''}></label></li>
        ${amigosNotasDisponible?`<li><label class="amigos-ajuste" for="amigos-notas"><span><b>Compartir mis promedios</b><small>Solo en ramos que toman juntos y con amigos que también comparten.</small></span>
          <input id="amigos-notas" type="checkbox" role="switch"${amigosNotasComparte?' checked':''}></label></li>`:''}
        ${amigosCalendarioDisponible&&amigosGruposDisponible?`<li><label class="amigos-ajuste" for="amigos-pruebas"><span><b>Compartir mis pruebas con mis grupos</b><small>Ramo, nombre y fecha de lo que viene. Nunca la nota ni la ponderación.</small></span>
          <input id="amigos-pruebas" type="checkbox" role="switch"${amigosPruebasComparte?' checked':''}></label></li>`:''}
        <li><button type="button" class="perfil-fila" data-amigos="bloqueados"><span class="perfil-fila-titulo">Bloqueados</span><svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>
      </ul>
    </section>`;
  if(!S.ramos.some(r=>copiarHorario(r.horario).length)&&amigos.length)caja.querySelector('.amigos-perfil').insertAdjacentHTML('afterend','<p class="amigos-aviso">Agrega el horario de tus ramos para ver cuándo coinciden con tus amigos.</p>');
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
        }).join('')}</ul>${amigosNotasDisponible&&!amigosNotasComparte?'<p class="amigos-vacio-texto">Activa «Compartir mis promedios» en Privacidad para comparar notas en estos ramos.</p>':''}`
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

// ─── Calendario del grupo: salas reservadas y pruebas ───
const ICONO_SALA='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const ICONO_PRUEBA='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
function etiquetaDiaCalendario(fecha){
  const d=diasHasta(fecha);
  if(d===0)return 'Hoy';if(d===1)return 'Mañana';
  const t=new Date(fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'short'});
  return t.charAt(0).toUpperCase()+t.slice(1);
}
// Agrupado por día, como la Agenda. `items` viene de grupo_calendario.
function calendarioGrupoHTML(id,items){
  const porDia=new Map();
  for(const it of items||[]){const f=String(it.fecha).slice(0,10);if(!porDia.has(f))porDia.set(f,[]);porDia.get(f).push(it);}
  const quien=it=>it.yo?'Tú':(it.nombre||'@'+it.username).split(' ')[0];
  const fila=it=>it.tipo==='reserva'
    ?`<li class="cal-item"><span class="cal-icono sala" aria-hidden="true">${ICONO_SALA}</span>
        <span class="amigo-texto"><b>${esc(it.titulo)}</b><small>${esc(`${it.inicio}–${it.fin} · ${quien(it)}`)}</small></span>
        ${it.yo?`<button type="button" class="amigos-link cal-borrar" data-amigos="reserva-borrar" data-id="${esc(it.id)}" data-grupo="${esc(id)}" aria-label="Borrar la reserva de ${esc(it.titulo)}">Borrar</button>`:''}</li>`
    :`<li class="cal-item"><span class="cal-icono prueba" aria-hidden="true">${ICONO_PRUEBA}</span>
        <span class="amigo-texto"><b>${esc(it.titulo)}${it.detalle?` · ${esc(it.detalle)}`:''}</b><small>${esc([it.inicio,quien(it)].filter(Boolean).join(' · '))}</small></span></li>`;
  const cuerpo=porDia.size?[...porDia].map(([f,l])=>`<li class="cal-dia"><h4>${esc(etiquetaDiaCalendario(f))}</h4><ul>${l.map(fila).join('')}</ul></li>`).join('')
    :`<li><p class="amigos-vacio-texto">Nada en las próximas tres semanas.${amigosPruebasComparte?'':' Activa «Compartir mis pruebas» en Privacidad para que el grupo vea las tuyas.'}</p></li>`;
  return `<h3 class="modal-label">Calendario</h3>
    <ul class="cal-grupo">${cuerpo}</ul>
    <button type="button" class="amigo-fila amigos-fila-mas cal-anotar" data-amigos="reserva-nueva" data-id="${esc(id)}">
      <span class="amigo-avatar" aria-hidden="true">${ICONO_MAS}</span><span class="amigo-texto"><b>Anotar sala reservada</b></span></button>`;
}
function abrirReservaNueva(id){
  const hoy=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const max=new Date(Date.now()+60*864e5).toISOString().slice(0,10);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Sala reservada</div>
    <form id="amigos-reserva-form" class="amigos-grupo-form" novalidate>
      <label class="modal-label" for="amigos-reserva-lugar">Dónde</label>
      <input id="amigos-reserva-lugar" class="amigos-grupo-nombre" type="text" maxlength="60" autocomplete="off" placeholder="Sala B-12, Biblioteca San Joaquín">
      <label class="modal-label" for="amigos-reserva-fecha">Día</label>
      <input id="amigos-reserva-fecha" class="amigos-grupo-nombre" type="date" min="${hoy}" max="${max}" value="${hoy}">
      <div class="cal-horas">
        <label><span class="modal-label">Desde</span><input id="amigos-reserva-inicio" class="amigos-grupo-nombre" type="time" value="14:00"></label>
        <label><span class="modal-label">Hasta</span><input id="amigos-reserva-fin" class="amigos-grupo-nombre" type="time" value="16:00"></label>
      </div>
      <p class="amigos-vacio-texto">La ve solo este grupo. La reserva en sí la haces en el sistema de tu universidad.</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo" data-id="${esc(id)}">Volver</button>
      <button type="submit" form="amigos-reserva-form" class="btn-confirm">Guardar</button></div>`;
  document.getElementById('amigos-reserva-form').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const v=k=>document.getElementById('amigos-reserva-'+k).value;
    if(!v('lugar').trim()){showToast('Escribe dónde',true);return;}
    try{
      await rpcAmigos('agregar_reserva_grupo',{p_grupo:id,p_lugar:v('lugar'),p_fecha:v('fecha'),p_inicio:v('inicio'),p_fin:v('fin')});
      if(typeof vibrar==='function')vibrar('exito');
      abrirGrupo(id);
    }catch(e){showToast(mensajeErrorAmigos(e),true);}
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
const personasTxt=n=>`${n} ${n===1?'persona':'personas'}`;
// El mismo tope que amigos_grupos.sql: no es un nombre académico (NOMBRE_MAX).
const GRUPO_NOMBRE_MAX=40;
let amigosGrupoDetalle=null;
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
  const otros=g.nombres||[],resto=Math.max(0,(g.miembros||0)-(g.estado==='miembro'?1:0)-otros.length);
  const quienes=g.estado==='miembro'?['Tú',...otros]:otros.slice();
  if(resto)quienes.push(`${resto} más`);
  return listaNombres(quienes)||personasTxt(g.miembros||0);
}
function seccionGruposHTML(){
  if(!amigosGruposDisponible)return '';
  const grupos=amigosGruposCache||[],invit=grupos.filter(g=>g.estado==='invitado'),mios=grupos.filter(g=>g.estado==='miembro');
  return `<section class="perfil-grupo amigos-grupo" id="amigos-seccion-grupos"><h2>Grupos</h2><ul>
    ${invit.map(g=>`<li class="amigo-solicitud recibida">
      ${avatarGrupoHTML(g.nombres)}
      <span class="amigo-texto" title="${esc(lineaGrupo(g))}"><b>${esc(g.nombre)}</b><small>${esc(g.invitado_por?`@${g.invitado_por} te invitó`:'Te invitaron')}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="grupo-rechazar" data-id="${esc(g.id)}" aria-label="Rechazar ${esc(g.nombre)}">Rechazar</button>
      <button type="button" class="amigo-boton principal" data-amigos="grupo-aceptar" data-id="${esc(g.id)}" aria-label="Unirme a ${esc(g.nombre)}">Unirme</button></span></li>`).join('')}
    ${mios.map(g=>`<li><button type="button" class="amigo-fila" data-amigos="grupo" data-id="${esc(g.id)}">
      ${avatarGrupoHTML(g.nombres)}
      <span class="amigo-texto"><b>${esc(g.nombre)}</b><small>${esc(lineaGrupo(g))}</small></span>
      <svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>`).join('')}
    <li><button type="button" class="amigo-fila amigos-fila-mas" data-amigos="grupo-nuevo">
      <span class="amigo-avatar" aria-hidden="true">${ICONO_MAS}</span>
      <span class="amigo-texto"><b>Nuevo grupo</b>${mios.length?'':'<small>Para ver cuándo están todos libres</small>'}</span></button></li>
  </ul></section>`;
}
// Elegir amigos, como al crear un grupo en WhatsApp: los marcados aparecen
// arriba como fichas que se pueden quitar. `fuera`: usernames que ya están.
function elegirAmigosHTML(fuera){
  const lista=(amigosListaCache||[]).filter(a=>a.estado==='amigos'&&!(fuera||[]).includes(a.username));
  if(!lista.length)return '<p class="amigos-vacio-texto">No te quedan amigos por invitar.</p>';
  return `<div class="amigos-elegidos" aria-live="polite"></div>
    <ul class="amigos-elegir-lista">${lista.map(a=>`<li><label class="amigos-elegir"><input type="checkbox" name="u" value="${esc(a.username)}" data-nombre="${esc(a.nombre||'@'+a.username)}">
    <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span><span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>@${esc(a.username)}</small></span></label></li>`).join('')}</ul>`;
}
// Repinta las fichas de arriba y avisa cuántos van marcados.
function enlazarElegirAmigos(form,alCambiar){
  const pintar=()=>{
    const marcados=[...form.querySelectorAll('input[name=u]:checked')];
    const caja=form.querySelector('.amigos-elegidos');
    if(caja)caja.innerHTML=marcados.map(i=>`<button type="button" class="amigos-elegido" data-quitar="${esc(i.value)}" aria-label="Quitar a ${esc(i.dataset.nombre)}">${esc(i.dataset.nombre)}<span aria-hidden="true">×</span></button>`).join('');
    alCambiar(marcados);
  };
  form.addEventListener('change',pintar);
  form.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-quitar]');if(!b)return;
    const i=[...form.querySelectorAll('input[name=u]')].find(x=>x.value===b.dataset.quitar);if(i){i.checked=false;pintar();}
  });
  pintar();
}
// Nombre opcional, como en Instagram: sin nombre se llama como sus personas.
function abrirGrupoNuevo(preUser){
  const hayAmigos=(amigosListaCache||[]).some(a=>a.estado==='amigos');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Nuevo grupo</div>
    <form id="amigos-grupo-form" class="amigos-grupo-form" novalidate>
      <label class="modal-label" for="amigos-grupo-nombre">Nombre (opcional)</label>
      <input id="amigos-grupo-nombre" class="amigos-grupo-nombre" type="text" maxlength="${GRUPO_NOMBRE_MAX}" autocomplete="off" placeholder="Estudio Micro">
      <fieldset><legend class="modal-label">Personas</legend>${hayAmigos?elegirAmigosHTML([]):'<p class="amigos-vacio-texto">Agrega amigos para armar un grupo.</p>'}</fieldset>
      <p class="amigos-vacio-texto">Quienes se unan verán el horario de los demás. Nunca sus notas.</p>
    </form>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="submit" form="amigos-grupo-form" class="btn-confirm" id="amigos-grupo-crear" disabled>Crear</button></div>`;
  openModal();
  const form=document.getElementById('amigos-grupo-form'),nombre=document.getElementById('amigos-grupo-nombre'),crear=document.getElementById('amigos-grupo-crear');
  const sugerido=m=>listaNombres([...m.map(i=>i.dataset.nombre.replace(/^@/,'').split(' ')[0]),'tú']).slice(0,GRUPO_NOMBRE_MAX);
  if(preUser){const i=[...form.querySelectorAll('input[name=u]')].find(x=>x.value===preUser);if(i)i.checked=true;}
  enlazarElegirAmigos(form,m=>{crear.disabled=!m.length;crear.textContent=m.length>1?`Crear (${m.length})`:'Crear';nombre.placeholder=m.length?sugerido(m):'Estudio Micro';});
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const marcados=[...form.querySelectorAll('input[name=u]:checked')];
    if(!marcados.length)return;
    try{
      const id=await rpcAmigos('crear_grupo',{p_nombre:nombre.value.trim()||sugerido(marcados),p_usernames:marcados.map(i=>i.value)});
      if(typeof vibrar==='function')vibrar('exito');
      closeModal();await refrescarAmigos();abrirGrupo(id);
    }catch(e){showToast(mensajeErrorAmigos(e),true);}
  });
}
async function abrirGrupo(id){
  const g=(amigosGruposCache||[]).find(x=>x.id===id);
  document.getElementById('modal-content').innerHTML=`<div class="modal-title">${esc(g?g.nombre:'Grupo')}</div><p class="amigos-vacio-texto" role="status">Cargando…</p>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
  let filas,cal=null;
  try{
    [filas,cal]=await Promise.all([rpcAmigos('grupo_detalle',{p_grupo:id}),
      amigosCalendarioDisponible?rpcAmigos('grupo_calendario',{p_grupo:id}).catch(()=>null):null]);
    filas=filas||[];
  }catch(e){closeModal();showToast(mensajeErrorAmigos(e),true);refrescarAmigos();return;}
  amigosGrupoDetalle={id,filas,cal};
  pintarGrupo(id,filas,cal);
}
// La ficha del grupo sigue a «Info. del grupo» de WhatsApp: cabecera centrada
// (avatar, nombre que se toca para cambiarlo, «Grupo · N personas»), lo útil,
// la lista de personas que empieza con «Agregar personas» y salir al final.
function pintarGrupo(id,filas,cal){
  const g=(amigosGruposCache||[]).find(x=>x.id===id)||{nombre:'Grupo'};
  const ahora=new Date();
  const miembros=filas.filter(f=>f.estado==='miembro');
  const conRamos=filas.filter(f=>!f.yo&&f.ramos).map(f=>normalizarRamosAmigo(f.ramos));
  const mioConHorario=S.ramos.some(r=>copiarHorario(r.horario).length);
  const semana=semanaLibresGrupo([mioConHorario?S.ramos:[],...conRamos]);
  const enClases=filas.filter(f=>!f.yo&&f.ramos&&estadoAhoraAmigo(normalizarRamosAmigo(f.ramos),ahora).estado==='clase').length;
  const nombres=filas.filter(f=>!f.yo&&f.estado==='miembro').map(f=>(f.nombre||f.username).split(' ')[0]);
  const filaHTML=f=>{
    const ramos=f.ramos?normalizarRamosAmigo(f.ramos):null,est=ramos?estadoAhoraAmigo(ramos,ahora):null;
    const linea=f.estado==='invitado'?'Invitación pendiente':est?textoEstadoAmigo(est):f.yo?'@'+f.username:'No comparte su horario';
    const contenido=`<span class="amigo-avatar${est?anilloAmigo(est):''}" aria-hidden="true">${inicialAmigo(f)}</span>
      <span class="amigo-texto"><b>${f.yo?'Tú':esc(nombreAmigo(f))}</b><small>${esc(linea)}</small></span>
      ${f.creador?'<span class="amigo-chip">Admin</span>':''}`;
    return f.yo?`<li class="amigo-solicitud">${contenido}</li>`
      :`<li><button type="button" class="amigo-fila" data-amigos="grupo-miembro" data-id="${esc(id)}" data-user="${esc(f.username)}">${contenido}</button></li>`;
  };
  document.getElementById('modal-content').innerHTML=`
    <div class="grupo-cabecera">
      ${avatarGrupoHTML(nombres,true)}
      <button type="button" class="grupo-nombre" data-amigos="grupo-renombrar" data-id="${esc(id)}" aria-label="Cambiar el nombre de ${esc(g.nombre)}">${esc(g.nombre)}
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></button>
      <p class="amigo-sub">Grupo · ${esc(personasTxt(miembros.length))}${enClases?` · ${enClases} en clases`:''}</p>
    </div>
    ${Array.isArray(cal)?calendarioGrupoHTML(id,cal):''}
    <h3 class="modal-label">Todos libres a la vez</h3>
    ${!mioConHorario&&!(conRamos.length>=2)?'<p class="amigos-vacio-texto">Agrega tu horario para ver cuándo coinciden.</p>'
      :semana.length?`<ul class="amigo-lista">${semana.map(d=>`<li><span>${esc(d.nombre)}${d.personas<1+conRamos.length?` <small class="amigo-de">${d.personas} de ${1+conRamos.length}</small>`:''}</span><span class="amigo-horas">${d.ventanas.map(v=>`${esc(v.inicio)}–${esc(v.fin)}`).join(' · ')}</span></li>`).join('')}</ul>`
      :'<p class="amigos-vacio-texto">Esta semana no tienen ventanas libres en común.</p>'}
    ${(()=>{
      if(!mioConHorario)return '';
      const t=filas.filter(f=>!f.yo&&f.ramos).map(f=>({f,m:matchTurno(S.ramos,normalizarRamosAmigo(f.ramos))})).filter(x=>x.m.tipo!=='ninguno');
      return t.length?`<h3 class="modal-label">Hacer turno contigo</h3><ul class="amigo-lista">${t.map(({f,m})=>`<li><span>${esc(nombreAmigo(f))}</span><span class="amigo-horas">${esc(m.tipo==='perfecto'?'Match perfecto':listaDiasTurno(m.dias))}</span></li>`).join('')}</ul>`:'';
    })()}
    <h3 class="modal-label">${esc(personasTxt(filas.length))}</h3>
    <ul class="amigo-lista amigo-lista-personas">
      <li><button type="button" class="amigo-fila amigos-fila-mas" data-amigos="grupo-invitar" data-id="${esc(id)}">
        <span class="amigo-avatar" aria-hidden="true">${ICONO_MAS}</span><span class="amigo-texto"><b>Agregar personas</b></span></button></li>
      ${filas.map(filaHTML).join('')}
    </ul>
    <button type="button" class="grupo-salir" data-amigos="grupo-salir" data-id="${esc(id)}">
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/></svg>Salir del grupo</button>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
}
// Tocar a alguien del grupo: como en WhatsApp, un menú corto. Su ficha si es
// tu amigo; sacarlo si eres admin.
function abrirMiembroGrupo(id,username){
  const f=amigosGrupoDetalle&&amigosGrupoDetalle.id===id&&amigosGrupoDetalle.filas.find(x=>x.username===username);if(!f)return;
  const yo=amigosGrupoDetalle.filas.find(x=>x.yo),amigo=(amigosListaCache||[]).find(a=>a.estado==='amigos'&&a.username===username);
  const opciones=[
    amigo?`<button type="button" class="grupo-opcion" data-amigos="ver" data-id="${esc(amigo.id)}">Ver ficha de ${esc(f.nombre||'@'+f.username)}</button>`:'',
    !amigo?`<button type="button" class="grupo-opcion" data-amigos="grupo-agregar-amigo" data-user="${esc(username)}">Agregar a amigos</button>`:'',
    yo&&yo.creador?`<button type="button" class="grupo-opcion peligro" data-amigos="grupo-quitar" data-id="${esc(id)}" data-user="${esc(username)}">Sacar del grupo</button>`:''
  ].filter(Boolean);
  document.getElementById('modal-content').innerHTML=`
    <div class="amigo-cabecera"><span class="amigo-avatar grande" aria-hidden="true">${inicialAmigo(f)}</span>
      <div><div class="modal-title">${esc(nombreAmigo(f))}</div><p class="amigo-sub">@${esc(f.username)}</p></div></div>
    <div class="grupo-opciones">${opciones.join('')}</div>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo" data-id="${esc(id)}">Volver</button></div>`;
}
function abrirInvitarGrupo(id){
  const fuera=amigosGrupoDetalle&&amigosGrupoDetalle.id===id?amigosGrupoDetalle.filas.map(f=>f.username):[];
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Invitar al grupo</div>
    <form id="amigos-invitar-form" class="amigos-grupo-form" novalidate>${elegirAmigosHTML(fuera)}</form>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo" data-id="${esc(id)}">Volver</button>
      <button type="submit" form="amigos-invitar-form" class="btn-confirm" id="amigos-invitar-ok" disabled>Invitar</button></div>`;
  const ok=document.getElementById('amigos-invitar-ok');
  enlazarElegirAmigos(document.getElementById('amigos-invitar-form'),m=>{ok.disabled=!m.length;ok.textContent=m.length>1?`Invitar (${m.length})`:'Invitar';});
  document.getElementById('amigos-invitar-form').addEventListener('submit',async ev=>{
    ev.preventDefault();
    const usernames=[...ev.target.querySelectorAll('input[name=u]:checked')].map(i=>i.value);
    if(!usernames.length){abrirGrupo(id);return;}
    try{
      for(const u of usernames)await rpcAmigos('invitar_a_grupo',{p_grupo:id,p_username:u});
      showToast(usernames.length===1?'Invitación enviada':'Invitaciones enviadas');
    }catch(e){showToast(mensajeErrorAmigos(e),true);}
    abrirGrupo(id);
  });
}
function abrirRenombrarGrupo(id){
  const g=(amigosGruposCache||[]).find(x=>x.id===id)||{nombre:''};
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Cambiar nombre</div>
    <form id="amigos-renombrar-form" novalidate><input id="amigos-renombrar" class="amigos-grupo-nombre" type="text" maxlength="${GRUPO_NOMBRE_MAX}" autocomplete="off" value="${esc(g.nombre)}" aria-label="Nombre del grupo"></form>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-amigos="grupo" data-id="${esc(id)}">Volver</button>
      <button type="submit" form="amigos-renombrar-form" class="btn-confirm">Guardar</button></div>`;
  document.getElementById('amigos-renombrar-form').addEventListener('submit',async ev=>{
    ev.preventDefault();
    try{await rpcAmigos('renombrar_grupo',{p_grupo:id,p_nombre:document.getElementById('amigos-renombrar').value});await refrescarAmigos();abrirGrupo(id);}
    catch(e){showToast(mensajeErrorAmigos(e),true);}
  });
}
async function accionGrupo(accion,{id,user,confirmado}={}){
  const g=(amigosGruposCache||[]).find(x=>x.id===id),nombre=g?g.nombre:'el grupo';
  try{
    if(accion==='grupo-aceptar'){
      if(!confirmado)return showConfirm(`¿Unirte a ${nombre}?`,'Las personas del grupo verán tu horario, aunque no sean tus amigos. Nunca tus notas.',()=>accionGrupo(accion,{id,confirmado:true}),{label:'Unirme',danger:false});
      await rpcAmigos('responder_grupo',{p_grupo:id,p_aceptar:true});
      if(typeof vibrar==='function')vibrar('exito');
      await refrescarAmigos();abrirGrupo(id);return;
    }
    if(accion==='grupo-rechazar')await rpcAmigos('responder_grupo',{p_grupo:id,p_aceptar:false});
    else if(accion==='grupo-salir'){
      if(!confirmado)return showConfirm(`¿Salir de ${nombre}?`,'Dejarás de ver los horarios del grupo y ellos el tuyo. No le avisaremos a nadie.',()=>accionGrupo(accion,{id,confirmado:true}),{label:'Salir',danger:true});
      await rpcAmigos('salir_de_grupo',{p_grupo:id});closeModal();
    }else if(accion==='grupo-quitar'){
      if(!confirmado)return showConfirm(`¿Sacar a @${user}?`,'Dejará de ver los horarios del grupo. No le avisaremos.',()=>accionGrupo(accion,{id,user,confirmado:true}),{label:'Sacar',danger:true});
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
    else if(acc==='grupo-nuevo')abrirGrupoNuevo();
    else if(acc==='grupo-con')abrirGrupoNuevo(user);
    else if(acc==='reserva-nueva')abrirReservaNueva(id);
    else if(acc==='reserva-borrar'){const g=b.dataset.grupo;showConfirm('¿Borrar esta reserva del calendario?','Solo la quita del grupo. Si reservaste en tu universidad, cancélala allá.',async()=>{try{await rpcAmigos('borrar_reserva_grupo',{p_id:id});abrirGrupo(g);}catch(e){showToast(mensajeErrorAmigos(e),true);}},{label:'Borrar'});}
    else if(acc==='menu-amigo')abrirMenuAmigo(id);
    else if(acc==='semana')abrirSemanaAmigo(id);
    else if(acc==='editar-username')abrirCambiarUsername();
    else if(acc==='ir-amigos'||acc==='ir-grupos'){const sec=document.getElementById(acc==='ir-amigos'?'amigos-seccion-amigos':'amigos-seccion-grupos');if(sec)sec.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
    else if(acc==='grupo-invitar')abrirInvitarGrupo(id);
    else if(acc==='grupo-renombrar')abrirRenombrarGrupo(id);
    else if(acc==='grupo-miembro')abrirMiembroGrupo(id,user);
    else if(acc==='grupo-agregar-amigo')accionAmigos('pedir',{user});
    else if(acc.startsWith('grupo-'))accionGrupo(acc,{id,user});
    else accionAmigos(acc,{id,user});
  });
  document.addEventListener('change',ev=>{
    if(ev.target&&ev.target.id==='amigos-compartir')cambiarCompartirHorario(ev.target.checked);
    else if(ev.target&&ev.target.id==='amigos-notas')cambiarCompartirNotas(ev.target.checked);
    else if(ev.target&&ev.target.id==='amigos-pruebas')cambiarCompartirPruebas(ev.target.checked);
  });
}
