
// ─── PESTAÑA AMIGOS (Lucas, 2026-11-19) ─────────────────────────────────────
// Agregarse por username, ver qué hacen ahora, ramos en común y ventanas libres
// a la vez. Todo pasa por las funciones de supabase/amigos.sql: el servidor nunca
// entrega notas ni ids de cuenta, y acá no se guarda nada en S ni en gradehub_v1.
// La pestaña aparece solo con sesión, en cuentas de estudiante y cuando el SQL
// ya está aplicado: si amigos_estado() falla, la app queda como estaba.
const CLAVE_AMIGO_PENDIENTE='gradehub_amigo_pendiente';
const URL_AMIGOS='https://gradehub.cl/';
let amigosDisponibleCache=false,amigosEstadoCache=null,amigosListaCache=null,amigosHorariosCache=new Map(),amigosVersion=0,amigosCargando=false;

// Un link gradehub.cl/?amigo=usuario deja el username guardado hasta que la
// persona tenga sesión y Amigos esté listo; entonces se abre «Agregar».
(function capturarAmigoDelLink(){
  try{
    if(typeof location==='undefined'||!location.search)return;
    const u=new URLSearchParams(location.search).get('amigo');
    if(u&&/^@?[A-Za-z0-9._]{3,20}$/.test(u))sessionStorage.setItem(CLAVE_AMIGO_PENDIENTE,u.replace(/^@/,'').toLowerCase());
  }catch(e){}
})();

function amigosVisible(){return amigosDisponibleCache&&!(typeof esCuentaProfesor==='function'&&esCuentaProfesor());}
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
    abrirAmigoPendiente();
  }catch(e){if(v===amigosVersion)amigosDisponibleCache=false;}
  return amigosDisponibleCache;
}
function olvidarAmigos(){
  amigosVersion++;amigosDisponibleCache=false;amigosEstadoCache=null;amigosListaCache=null;amigosHorariosCache=new Map();
}
async function refrescarAmigos(){
  if(!amigosVisible()||amigosCargando)return;
  amigosCargando=true;const v=amigosVersion;
  try{
    const [estado,lista,horarios]=await Promise.all([rpcAmigos('amigos_estado'),rpcAmigos('mis_amistades'),rpcAmigos('amigos_horarios')]);
    if(v!==amigosVersion)return;
    amigosEstadoCache=estado||{};amigosListaCache=lista||[];
    amigosHorariosCache=new Map((horarios||[]).map(h=>[h.id,normalizarRamosAmigo(h.ramos)]));
  }catch(e){
    if(v===amigosVersion&&!amigosListaCache)amigosListaCache=[];
    if(v===amigosVersion)showToast(mensajeErrorAmigos(e),true);
  }finally{amigosCargando=false;}
  if(typeof currentTab!=='undefined'&&currentTab==='amigos')pintarAmigos();
  pintarInsigniaAmigos();
}
function renderAmigos(){
  pintarAmigos();
  refrescarAmigos();
}
// El número de solicitudes, sobre el ícono de la pestaña (HIG: Tab bars, badges).
function pintarInsigniaAmigos(){
  const btn=typeof document!=='undefined'&&document.getElementById('nav-amigos');if(!btn)return;
  const n=Number(amigosEstadoCache&&amigosEstadoCache.recibidas)||0;
  let marca=btn.querySelector('.nav-insignia');
  if(!n){if(marca)marca.remove();btn.setAttribute('aria-label','Amigos');return;}
  if(!marca){marca=document.createElement('span');marca.className='nav-insignia';marca.setAttribute('aria-hidden','true');btn.querySelector('.nav-icon').appendChild(marca);}
  marca.textContent=n>9?'9+':String(n);
  btn.setAttribute('aria-label',`Amigos, ${n} ${n===1?'solicitud':'solicitudes'}`);
}

// ─── Pintar ───
const inicialAmigo=a=>esc(((a.nombre||a.username||'?').trim()[0]||'?').toUpperCase());
const nombreAmigo=a=>a.nombre?`${a.nombre}${a.apellido?' '+a.apellido:''}`:'@'+a.username;
const ORDEN_ESTADO_AMIGO={clase:0,libre:1,termino:2,sinclases:3,sinhorario:4};
function filaAmigoHTML(a,ahora){
  const ramos=amigosHorariosCache.get(a.id);
  const est=ramos?estadoAhoraAmigo(ramos,ahora):null;
  const comun=ramos?ramosEnComun(S.ramos,ramos).length:0;
  const linea=est?textoEstadoAmigo(est):'No comparte su horario';
  return `<li><button type="button" class="amigo-fila" data-amigos="ver" data-id="${esc(a.id)}">
    <span class="amigo-avatar${est&&est.estado==='clase'?' en-clase':''}" aria-hidden="true">${inicialAmigo(a)}</span>
    <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${esc(linea)}</small></span>
    ${comun?`<span class="amigo-comun">${comun} ${comun===1?'ramo':'ramos'} en común</span>`:''}
    <svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
  </button></li>`;
}
function pintarAmigos(){
  const caja=typeof document!=='undefined'&&document.getElementById('amigos-body');if(!caja)return;
  if(!amigosVisible()){caja.innerHTML='<p class="amigos-vacio-texto">Inicia sesión para agregar amigos.</p>';return;}
  const e=amigosEstadoCache||{};
  // Sin username no hay a quién agregar todavía: el botón de arriba aparece después.
  const agregar=document.querySelector('#screen-amigos .topbar-link');if(agregar)agregar.hidden=!e.username;
  if(!e.username){pintarElegirUsername(caja);return;}
  if(!amigosListaCache){caja.innerHTML='<p class="amigos-vacio-texto" role="status">Cargando…</p>';return;}
  const ahora=new Date(),lista=amigosListaCache;
  const amigos=lista.filter(a=>a.estado==='amigos').map(a=>({a,e:amigosHorariosCache.get(a.id)?estadoAhoraAmigo(amigosHorariosCache.get(a.id),ahora):null}))
    .sort((x,y)=>(ORDEN_ESTADO_AMIGO[x.e?.estado]??5)-(ORDEN_ESTADO_AMIGO[y.e?.estado]??5)||nombreAmigo(x.a).localeCompare(nombreAmigo(y.a),'es')).map(x=>x.a);
  const recibidas=lista.filter(a=>a.estado==='recibida'),enviadas=lista.filter(a=>a.estado==='enviada');
  const sub=a=>esc(['@'+a.username,a.universidad&&TENANTS[a.universidad]?TENANTS[a.universidad].short:''].filter(Boolean).join(' · '));
  caja.innerHTML=`
    <section class="amigos-yo">
      <div><span class="amigos-yo-user">@${esc(e.username)}</span><small>Así te encuentran tus amigos</small></div>
      <button type="button" class="amigos-invitar" data-amigos="invitar">Invitar</button>
    </section>
    ${recibidas.length?`<section class="perfil-grupo amigos-grupo"><h2>Solicitudes</h2><ul>${recibidas.map(a=>`<li class="amigo-solicitud recibida">
      <span class="amigo-avatar" aria-hidden="true">${inicialAmigo(a)}</span>
      <span class="amigo-texto"><b>${esc(nombreAmigo(a))}</b><small>${sub(a)}</small></span>
      <span class="amigo-acciones"><button type="button" class="amigo-boton" data-amigos="rechazar" data-id="${esc(a.id)}" aria-label="Rechazar a ${esc(nombreAmigo(a))}">Rechazar</button>
      <button type="button" class="amigo-boton principal" data-amigos="aceptar" data-id="${esc(a.id)}" aria-label="Aceptar a ${esc(nombreAmigo(a))}">Aceptar</button></span></li>`).join('')}</ul></section>`:''}
    ${amigos.length?`<section class="perfil-grupo amigos-grupo"><h2>Tus amigos</h2><ul>${amigos.map(a=>filaAmigoHTML(a,ahora)).join('')}</ul></section>`
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
        <li><label class="amigos-ajuste" for="amigos-compartir"><span><b>Compartir mi horario</b><small>Tus amigos ven tus ramos y tus clases. Nunca tus notas.</small></span>
          <input id="amigos-compartir" type="checkbox" role="switch"${e.comparte_horario!==false?' checked':''}></label></li>
        <li><button type="button" class="perfil-fila" data-amigos="bloqueados"><span class="perfil-fila-titulo">Bloqueados</span><svg class="ic perfil-flecha" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>
      </ul>
    </section>`;
  if(!S.ramos.some(r=>copiarHorario(r.horario).length)&&amigos.length)caja.querySelector('.amigos-yo').insertAdjacentHTML('afterend','<p class="amigos-aviso">Agrega el horario de tus ramos para ver cuándo coinciden con tus amigos.</p>');
}

// ─── Elegir username ───
let _usernameTimer=null;
const TEXTO_USERNAME={invalido:'De 3 a 20: letras, números, punto o guion bajo.',reservado:'Ese username está reservado.',ocupado:'Ya está ocupado.',disponible:'Disponible.'};
function sugerenciaUsername(){
  const base=String(S.userName||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const ap=String(S.userApellido||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const s=(base+(ap?'.'+ap:'')).slice(0,20).replace(/\.$/,'');
  return s.length>=3?s:'';
}
function pintarElegirUsername(caja){
  caja.innerHTML=`<form class="amigos-username" id="amigos-username-form" novalidate>
    <h2>Elige tu username</h2>
    <p>Así te encuentran tus amigos. Nadie ve tu horario hasta que lo aceptes.</p>
    <label class="amigos-campo" for="amigos-username"><span aria-hidden="true">@</span>
      <input id="amigos-username" type="text" inputmode="text" autocapitalize="none" autocomplete="username" spellcheck="false" maxlength="21" value="${esc(sugerenciaUsername())}" aria-describedby="amigos-username-estado"></label>
    <p class="amigos-username-estado" id="amigos-username-estado" role="status" aria-live="polite"></p>
    <button type="submit" class="btn-primary" id="amigos-username-ok" disabled>Continuar</button>
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
    if(!r.length){caja.innerHTML='<p class="amigos-vacio-texto">No encontramos a nadie con ese username.</p>';return;}
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
  let cuerpo;
  if(!ramos)cuerpo='<p class="amigos-vacio-texto">No comparte su horario.</p>';
  else{
    const est=estadoAhoraAmigo(ramos),comun=ramosEnComun(S.ramos,ramos),semana=semanaLibresEnComun(S.ramos,ramos);
    cuerpo=`<p class="amigo-ahora${est.estado==='clase'?' en-clase':''}">${esc(textoEstadoAmigo(est))}</p>
      <h3 class="modal-label">Ramos en común</h3>
      ${comun.length?`<ul class="amigo-lista">${comun.map(r=>`<li><span>${esc(r.nombre)}</span>${r.mismaSeccion?'<span class="amigo-chip">Misma sección</span>':''}</li>`).join('')}</ul>`
        :'<p class="amigos-vacio-texto">No toman ramos juntos este semestre.</p>'}
      <h3 class="modal-label">Libres a la vez</h3>
      ${!mioConHorario?'<p class="amigos-vacio-texto">Agrega tu horario para ver cuándo coinciden.</p>'
        :!ramos.some(r=>copiarHorario(r.horario).length)?'<p class="amigos-vacio-texto">Todavía no carga su horario.</p>'
        :semana.length?`<ul class="amigo-lista">${semana.map(d=>`<li><span>${esc(d.nombre)}</span><span class="amigo-horas">${d.ventanas.map(v=>`${esc(v.inicio)}–${esc(v.fin)}`).join(' · ')}</span></li>`).join('')}</ul>`
        :'<p class="amigos-vacio-texto">Esta semana no tienen ventanas libres en común.</p>'}`;
  }
  document.getElementById('modal-content').innerHTML=`
    <div class="amigo-cabecera"><span class="amigo-avatar grande" aria-hidden="true">${inicialAmigo(a)}</span>
      <div><div class="modal-title">${esc(nombreAmigo(a))}</div><p class="amigo-sub">${esc(['@'+a.username,uni,a.carrera].filter(Boolean).join(' · '))}</p></div></div>
    ${cuerpo}
    <div class="amigo-peligro">
      <button type="button" class="amigos-link" data-amigos="eliminar" data-id="${esc(a.id)}">Eliminar de amigos</button>
      <button type="button" class="amigos-link" data-amigos="bloquear" data-user="${esc(a.username)}">Bloquear</button>
      <button type="button" class="amigos-link" data-amigos="denunciar" data-user="${esc(a.username)}">Denunciar</button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
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
    else accionAmigos(acc,{id,user});
  });
  document.addEventListener('change',ev=>{if(ev.target&&ev.target.id==='amigos-compartir')cambiarCompartirHorario(ev.target.checked);});
}
