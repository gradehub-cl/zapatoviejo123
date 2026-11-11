
// ─── ENCUESTAS DEL EQUIPO ──────────────────────────────────────────────────
// Datos independientes del semestre. Solo RPC de encuestas: nunca notas/ramos.
let encuestaCuenta=null,encuestaVisita=null,encuestaIntentada=false,encuestaActiva=null,encuestaVersion=0,encuestaCuentaNueva=null;
function olvidarEncuestas(){
  encuestaVersion++;encuestaCuenta=null;encuestaVisita=null;encuestaIntentada=false;encuestaActiva=null;encuestaCuentaNueva=null;
  cerrarHojaEncuesta(false);
  if(typeof document!=='undefined')document.querySelector?.('.encuestas-admin')?.remove?.();
}
function marcarPrimeraSesionEncuesta(uid){
  olvidarEncuestas();encuestaCuenta=uid;encuestaCuentaNueva=uid;
  if(!uid||!globalThis.crypto?.randomUUID)return;
  encuestaVisita=visitaEncuesta(uid);
  try{sessionStorage.setItem('gradehub_encuesta_primera_'+uid,encuestaVisita);}catch(e){}
}
function primeraVisitaEncuesta(uid){
  if(encuestaCuentaNueva===uid)return true;
  try{return sessionStorage.getItem('gradehub_encuesta_primera_'+uid)===encuestaVisita;}catch(e){return false;}
}
function sesionEncuestasCambio(event,uid){
  if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&encuestaCuenta&&encuestaCuenta!==uid))olvidarEncuestas();
}
function visitaEncuesta(uid){
  if(encuestaVisita)return encuestaVisita;
  const clave='gradehub_encuesta_visita_'+uid;
  try{const guardada=sessionStorage.getItem(clave);if(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(guardada||''))return guardada;}catch(e){}
  const visita=crypto.randomUUID();
  try{sessionStorage.setItem(clave,visita);}catch(e){}
  return visita;
}
function encuestaConexion(){return typeof navigator==='undefined'||navigator.onLine!==false;}
function encuestaSigue(uid,version){return currentUser?.id===uid&&encuestaVersion===version;}
function sqlEncuestasAusente(error){return ['PGRST202','42883','42P01'].includes(error?.code);}
async function consultarEncuestaAlEntrar(){
  const uid=currentUser?.id;
  if(!uid||!S.onboardingDone||!supabaseClient||!encuestaConexion()||document.visibilityState==='hidden')return;
  if(encuestaCuenta!==uid){olvidarEncuestas();encuestaCuenta=uid;}
  if(encuestaIntentada)return;
  if(document.getElementById('modal')?.classList.contains('open'))return;
  encuestaIntentada=true;
  if(!globalThis.crypto?.randomUUID)return;
  encuestaVisita=visitaEncuesta(uid);
  const version=encuestaVersion;
  try{
    const {data,error}=await supabaseClient.rpc('encuesta_al_entrar',{p_visita:encuestaVisita});
    if(!encuestaSigue(uid,version)||!encuestaConexion())return;
    if(error||!data?.encuesta)return; // SQL opcional: nada de esto bloquea entrar.
    if(primeraVisitaEncuesta(uid))return;
    encuestaActiva=data.encuesta;
    if(typeof renderSettingsSiAbierto==='function')renderSettingsSiAbierto();
    if(data.mostrar&&document.visibilityState!=='hidden'&&!document.getElementById('modal')?.classList.contains('open'))abrirHojaEncuesta(encuestaActiva);
  }catch(e){} // Sin red o SQL ausente: sin encuesta y sin aviso.
}
function entradaEncuestaHTML(){
  return currentUser?.id===encuestaCuenta&&encuestaActiva
    ?`<div class="agent-proposal-entry"><div><b>Encuesta del equipo</b><span>${encuestaActiva.respuesta?'Puedes editar tu respuesta mientras siga activa.':'Puedes responder cuando quieras.'}</span></div><button type="button" class="agent-refresh" onclick="abrirMiEncuesta()">${encuestaActiva.respuesta?'Editar respuesta':'Responder'}</button></div>`:'';
}
async function abrirMiEncuesta(){
  const uid=currentUser?.id,version=encuestaVersion;
  if(!uid||!encuestaConexion())return;
  try{
    const {data,error}=await supabaseClient.rpc('mi_encuesta_activa');
    if(!encuestaSigue(uid,version))return;
    if(error||!data){encuestaActiva=null;if(!sqlEncuestasAusente(error))showToast('La encuesta ya no está disponible.');return;}
    encuestaActiva=data;closeModal();abrirHojaEncuesta(data);
  }catch(e){if(encuestaSigue(uid,version))showToast('No pudimos abrir la encuesta. Intenta con conexión.',true);}
}
let encuestaCerrarTecla=null,encuestaFocoAnterior=null;
function cerrarHojaEncuesta(volverFoco=true){
  if(typeof document==='undefined')return;
  const hoja=document.getElementById('encuesta-hoja');
  const focoDentro=hoja?.contains?.(document.activeElement);
  hoja?.remove?.();
  if(encuestaCerrarTecla)document.removeEventListener('keydown',encuestaCerrarTecla,true);
  encuestaCerrarTecla=null;
  if(volverFoco&&focoDentro&&encuestaFocoAnterior?.isConnected)encuestaFocoAnterior.focus();
  encuestaFocoAnterior=null;
}
function abrirHojaEncuesta(e,{vistaPrevia=false}={}){
  cerrarHojaEncuesta(false);
  const uid=currentUser?.id,version=encuestaVersion;
  if(!vistaPrevia&&(!uid||!encuestaConexion()))return;
  encuestaFocoAnterior=document.activeElement;
  const hoja=document.createElement('aside');hoja.id='encuesta-hoja';hoja.className='encuesta-hoja';
  hoja.setAttribute('role','dialog');hoja.setAttribute('aria-modal','false');hoja.setAttribute('aria-labelledby','encuesta-pregunta');
  const seleccion=new Set(e.respuesta?.opciones||[]);
  hoja.innerHTML=`<div class="encuesta-agarre" aria-hidden="true"><span></span></div>
    ${vistaPrevia?'<p class="encuesta-nota">Vista previa · Puedes probarla. No se guardan respuestas.</p>':''}
    <header><p>ENCUESTA DEL EQUIPO</p><button type="button" class="encuesta-secundario" data-encuesta-cerrar>Ahora no</button></header>
    <h2 id="encuesta-pregunta" tabindex="-1">${esc(e.pregunta)}</h2>
    <form class="encuesta-form"><p>${e.tipo==='una'?'Elige una opción.':e.tipo==='varias'?'Puedes elegir varias opciones.':'Hasta 280 caracteres. No incluyas datos personales.'}</p>
      ${e.tipo==='texto'?`<label class="encuesta-texto">Tu respuesta<textarea maxlength="560" rows="3" name="texto">${esc(e.respuesta?.texto||'')}</textarea></label><p data-encuesta-cuenta aria-live="polite"></p>`:
        `<fieldset><legend class="sr-only">${esc(e.pregunta)}</legend>${(e.opciones||[]).map((o,i)=>`<label class="encuesta-opcion"><input type="${e.tipo==='una'?'radio':'checkbox'}" name="opcion" value="${i+1}" ${seleccion.has(i+1)?'checked':''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`}
      <p class="encuesta-nota">Es opcional. El equipo ve resultados y textos sin identidad; no se cruzan con tus notas.</p>
      <p data-encuesta-estado role="status" aria-live="polite"></p><button type="submit" class="encuesta-enviar">Enviar</button>
    </form><div class="encuesta-confirmar" hidden><p>¿Cerrar sin enviar tu respuesta?</p><button type="button" data-encuesta-seguir>Seguir respondiendo</button><button type="button" data-encuesta-descartar>Cerrar sin enviar</button></div>`;
  document.body.appendChild(hoja);
  const form=hoja.querySelector('form'),estado=hoja.querySelector('[data-encuesta-estado]'),enviar=form.querySelector('[type=submit]');
  const respuesta=()=>({p_encuesta:e.id,p_opciones:[...form.querySelectorAll('[name=opcion]:checked')].map(n=>Number(n.value)),p_texto:form.elements.texto?.value.trim()||null});
  const inicial=JSON.stringify(respuesta());let enviando=false;
  const actualizar=()=>{
    const r=respuesta(),largo=Array.from(form.elements.texto?.value||'').length;
    enviar.disabled=enviando||(e.tipo==='texto'?!r.p_texto||largo>280:!r.p_opciones.length);
    const cuenta=hoja.querySelector('[data-encuesta-cuenta]');if(cuenta)cuenta.textContent=`${largo} / 280`;
  };
  const pedirCierre=()=>{
    if(JSON.stringify(respuesta())===inicial){cerrarHojaEncuesta();return;}
    form.hidden=true;hoja.querySelector('.encuesta-confirmar').hidden=false;hoja.querySelector('[data-encuesta-seguir]').focus();
  };
  hoja.querySelector('[data-encuesta-cerrar]').addEventListener('click',pedirCierre);
  hoja.querySelector('[data-encuesta-descartar]').addEventListener('click',()=>cerrarHojaEncuesta());
  hoja.querySelector('[data-encuesta-seguir]').addEventListener('click',()=>{form.hidden=false;hoja.querySelector('.encuesta-confirmar').hidden=true;enviar.focus();});
  encuestaCerrarTecla=event=>{
    if(event.key!=='Escape'||['modal','confirm-overlay','user-menu'].some(id=>document.getElementById(id)?.classList.contains('open')))return;
    event.preventDefault();pedirCierre();
  };
  document.addEventListener('keydown',encuestaCerrarTecla,true);
  let comienzo=null;const agarre=hoja.querySelector('.encuesta-agarre');
  agarre.addEventListener('pointerdown',event=>{comienzo=event.clientY;agarre.setPointerCapture?.(event.pointerId);});
  agarre.addEventListener('pointerup',event=>{if(comienzo!==null&&event.clientY-comienzo>60)pedirCierre();comienzo=null;});
  agarre.addEventListener('pointercancel',()=>{comienzo=null;});
  form.addEventListener('input',actualizar);form.addEventListener('change',actualizar);actualizar();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(enviando||enviar.disabled)return;
    if(vistaPrevia){estado.textContent='Vista previa: tu respuesta no se envió.';return;}
    enviando=true;actualizar();estado.textContent='Enviando…';
    try{
      const r=respuesta();
      const {data,error}=await supabaseClient.rpc('responder_encuesta',r);
      if(!encuestaSigue(uid,version)||!hoja.isConnected)return;
      if(error||data!==true){estado.textContent=error?.code==='42501'?'La encuesta ya no está disponible.':'No se envió tu respuesta. Intenta de nuevo.';return;}
      encuestaActiva={...e,respuesta:{opciones:r.p_opciones,texto:r.p_texto}};
      cerrarHojaEncuesta();showToast('Respuesta guardada. Puedes editarla en Ajustes · Sugerencias.');
    }catch(error){if(hoja.isConnected)estado.textContent='No se envió tu respuesta. Intenta con conexión.';}
    finally{enviando=false;if(hoja.isConnected)actualizar();}
  });
  hoja.querySelector('h2').focus({preventScroll:true});
}

function diaChileEncuesta(){
  const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=tipo=>partes.find(x=>x.type===tipo).value;return `${p('year')}-${p('month')}-${p('day')}`;
}
function csvResultadosEncuesta(e,r){
  // Evita interpretar textos libres como fórmulas en Excel/Numbers.
  const celda=v=>'"'+String(v??'').replace(/^[\s]*[=+\-@]/,m=>"'"+m).replace(/"/g,'""')+'"';
  const filas=[['Pregunta','Público','Tipo','Resultado','Cantidad'],[e.pregunta,e.publico,'total','Respuestas',r.total],
    ...(r.opciones||[]).map(x=>[e.pregunta,e.publico,'opcion',x.opcion,x.total]),
    ...(r.textos||[]).map(x=>[e.pregunta,e.publico,'texto',x.texto,x.total])];
  return '\ufeff'+filas.map(f=>f.map(celda).join(',')).join('\r\n')+'\r\n';
}
function descargarResultadosEncuesta(e,r){
  const url=URL.createObjectURL(new Blob([csvResultadosEncuesta(e,r)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='encuesta-'+e.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resultadosEncuestaAdminHTML(r){
  const opciones=r.opciones||[],textos=r.textos||[];
  return `<div class="encuesta-resultados"><p class="encuesta-resultados-total"><b>${Number(r.total)||0}</b> respuestas</p>${opciones.length?barrasAdminHTML({titulo:'Respuestas por opción',resumen:'Cantidad de personas que eligieron cada opción.',filas:opciones.map(x=>({nombre:x.opcion,valor:Number(x.total)||0}))}):''}${textos.map(x=>`<blockquote>${esc(x.texto)} <span>(${Number(x.total)||0})</span></blockquote>`).join('')}<button type="button" data-encuesta-csv>Descargar CSV</button></div>`;
}
async function renderAdminEncuestas(raiz){
  const uid=currentUser?.id,version=encuestaVersion;
  const cabecera='<div class="encuestas-admin"><div class="encuestas-admin-cabecera"><h3>Encuestas</h3><button type="button" data-encuestas-actualizar>Actualizar</button></div>';
  const pintar=contenido=>{raiz.innerHTML=cabecera+contenido+'</div>';raiz.querySelector('[data-encuestas-actualizar]').addEventListener('click',()=>renderAdminEncuestas(raiz));};
  pintar('<p role="status">Cargando…</p>');
  const vista=raiz.querySelector('.encuestas-admin');
  let lista;
  try{
    const {data,error}=await supabaseClient.rpc('admin_encuestas');
    if(!encuestaSigue(uid,version)||raiz.isConnected===false||!vista.isConnected)return;
    if(error){pintar(sqlEncuestasAusente(error)?'<p>Encuestas todavía no disponibles.</p>':'<p role="alert">No pudimos cargar las encuestas. Revisa tu acceso y conexión.</p>');return;}
    lista=Array.isArray(data)?data:[];
  }catch(e){if(encuestaSigue(uid,version)&&vista.isConnected)pintar('<p role="alert">No pudimos cargar las encuestas. Intenta de nuevo con conexión.</p>');return;}
  const publicos=[['todos','Todos'],...Object.entries(TENANTS).map(([id,t])=>[id,t.label||t.short])];
  const hoy=diaChileEncuesta();
  const estadoVisible=e=>e.estado==='terminada'||e.termino<hoy?'Terminada':e.estado==='pausada'?'Pausada':e.inicio>hoy?'Programada':'Activa';
  const vigentes=lista.filter(e=>estadoVisible(e)!=='Terminada'),terminadas=lista.filter(e=>estadoVisible(e)==='Terminada');
  pintar(`<details class="encuesta-crear"><summary>Crear encuesta</summary><form>
    <label>Pregunta<input type="text" name="pregunta" maxlength="280" required></label>
    <label>Tipo<select name="tipo"><option value="una">Una opción</option><option value="varias">Varias opciones</option><option value="texto">Texto corto</option></select></label>
    <label data-opciones-admin>Opciones<textarea name="opciones" rows="3" placeholder="Una por línea, entre 2 y 6" required></textarea></label>
    <label>Público<select name="publico">${publicos.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('')}</select></label>
    <div class="encuesta-fechas"><label>Inicio<input type="date" name="inicio" value="${hoy}" required></label><label>Término<input type="date" name="termino" value="${hoy}" required></label></div>
    <p>Fechas completas de Chile, incluido el día de término. Una encuesta simultánea por público.</p>
    <p role="status" data-crear-estado></p><button type="button" data-encuesta-preview>Vista previa</button><button type="submit" class="encuesta-enviar">Crear encuesta</button>
    </form></details><div class="encuestas-lista">${[...vigentes,...terminadas].map(e=>`<section data-encuesta-admin="${esc(e.id)}"><div class="adu-encuesta-cabeza"><h4>${esc(e.pregunta)}</h4><span class="adu-estado">${estadoVisible(e)}</span></div><p class="adu-nota">${esc(publicos.find(([id])=>id===e.publico)?.[1]||e.publico)} · ${esc(e.inicio.split('-').reverse().join('/'))} a ${esc(e.termino.split('-').reverse().join('/'))}</p>
    <div class="encuesta-acciones">${e.estado!=='terminada'&&e.termino>=hoy?`<button type="button" data-encuesta-cambiar="${e.estado==='activa'?'pausada':'activa'}">${e.estado==='activa'?'Pausar':'Reanudar'}</button><button type="button" data-encuesta-cambiar="terminada">Terminar</button>`:''}<button type="button" data-encuesta-resultados>Ver resultados</button></div><div data-encuesta-totales aria-live="polite"></div></section>`).join('')||'<p>Todavía no hay encuestas.</p>'}</div>`);
  const form=raiz.querySelector('.encuesta-crear form'),f=form.elements,estado=raiz.querySelector('[data-crear-estado]');
  f.tipo.addEventListener('change',()=>{const texto=f.tipo.value==='texto';raiz.querySelector('[data-opciones-admin]').hidden=texto;f.opciones.required=!texto;});
  form.querySelector('[data-encuesta-preview]').addEventListener('click',()=>{
    const pregunta=f.pregunta.value.trim(),tipo=f.tipo.value;
    const opciones=tipo==='texto'?[]:f.opciones.value.split('\n').map(x=>x.trim()).filter(Boolean);
    if(!pregunta){estado.textContent='Escribe la pregunta para ver la vista previa.';f.pregunta.focus();return;}
    if(tipo!=='texto'&&(opciones.length<2||opciones.length>6)){estado.textContent='Escribe entre 2 y 6 opciones, una por línea.';f.opciones.focus();return;}
    estado.textContent='';
    abrirHojaEncuesta({pregunta,tipo,opciones},{vistaPrevia:true});
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();const boton=form.querySelector('[type=submit]');if(boton.disabled)return;
    const opciones=f.tipo.value==='texto'?[]:f.opciones.value.split('\n').map(x=>x.trim()).filter(Boolean);
    if(f.tipo.value!=='texto'&&(opciones.length<2||opciones.length>6)){estado.textContent='Escribe entre 2 y 6 opciones, una por línea.';return;}
    boton.disabled=true;estado.textContent='Creando…';
    try{
      const {data,error}=await supabaseClient.rpc('admin_crear_encuesta',{p_pregunta:f.pregunta.value.trim(),p_tipo:f.tipo.value,p_opciones:opciones,p_publico:f.publico.value,p_inicio:f.inicio.value,p_termino:f.termino.value});
      if(!encuestaSigue(uid,version)||!form.isConnected)return;
      if(error||!data){estado.textContent=error?.message||'No se creó la encuesta. Intenta de nuevo.';return;}
      await renderAdminEncuestas(raiz);
    }catch(e){if(form.isConnected)estado.textContent='No se creó la encuesta. Revisa tu conexión.';}finally{if(form.isConnected)boton.disabled=false;}
  });
  const porId=new Map(lista.map(e=>[e.id,e]));
  raiz.querySelectorAll('[data-encuesta-admin]').forEach(caja=>{
    const e=porId.get(caja.dataset.encuestaAdmin),totales=caja.querySelector('[data-encuesta-totales]');
    caja.querySelectorAll('[data-encuesta-cambiar]').forEach(b=>b.addEventListener('click',()=>{
      const aplicar=async()=>{
        b.disabled=true;
        try{const {data,error}=await supabaseClient.rpc('admin_estado_encuesta',{p_encuesta:e.id,p_estado:b.dataset.encuestaCambiar});
          if(!encuestaSigue(uid,version)||!caja.isConnected)return;
          if(error||data!==true){totales.textContent=error?.message||'No se aplicó el cambio.';return;}await renderAdminEncuestas(raiz);
        }catch(error){if(caja.isConnected)totales.textContent='No se aplicó el cambio. Revisa tu conexión.';}finally{if(b.isConnected)b.disabled=false;}
      };
      if(b.dataset.encuestaCambiar==='terminada')showConfirm('¿Terminar esta encuesta?','Se dejarán de aceptar respuestas. Los resultados se conservan.',aplicar,{label:'Terminar',focusCancel:true});else aplicar();
    }));
    caja.querySelector('[data-encuesta-resultados]').addEventListener('click',async event=>{
      const b=event.currentTarget;if(b.disabled)return;b.disabled=true;totales.textContent='Cargando resultados…';
      try{
        const {data:r,error}=await supabaseClient.rpc('admin_resultados_encuesta',{p_encuesta:e.id});
        if(!encuestaSigue(uid,version)||!caja.isConnected)return;
        if(error||!r){totales.textContent='No pudimos leer los resultados. Verifica tu segundo factor e intenta de nuevo.';return;}
        totales.innerHTML=resultadosEncuestaAdminHTML(r);
        totales.querySelector('[data-encuesta-csv]').addEventListener('click',async event=>{
          const exportar=event.currentTarget;if(exportar.disabled)return;exportar.disabled=true;
          try{
            // Vuelve a exigir MFA y trae los totales actuales antes de exportar.
            const {data:actual,error}=await supabaseClient.rpc('admin_resultados_encuesta',{p_encuesta:e.id});
            if(!encuestaSigue(uid,version)||!caja.isConnected)return;
            if(error||!actual){showToast('No pudimos exportar. Verifica tu segundo factor e intenta de nuevo.',true);return;}
            descargarResultadosEncuesta(e,actual);
          }catch(error){if(encuestaSigue(uid,version))showToast('No pudimos exportar. Intenta con conexión.',true);}
          finally{if(exportar.isConnected)exportar.disabled=false;}
        });
      }catch(error){if(caja.isConnected)totales.textContent='No pudimos leer los resultados. Revisa tu conexión.';}finally{if(b.isConnected)b.disabled=false;}
    });
  });
}
