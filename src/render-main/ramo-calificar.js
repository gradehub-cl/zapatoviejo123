// Opiniones cerradas de ramos. Estado efímero y aviso local separado de gradehub_v1.
const RAMO_CARGAS=['Menos de 3','3 a 6','6 a 10','Más de 10'];
const avisosRamoVistos=new Set();
let versionCalificarRamo=0;
function claveCalificarRamo(r){return nombreProfesorNormal(r?.sigla||r?.origen?.ramoKey||r?.nombre||'');}
function contextoCalificarRamo(r,periodo=semester()){
 if(typeof currentUser==='undefined'||!currentUser||esCuentaProfesor()||!r||!Number.isInteger(r.seccion)||r.seccion<1||r.seccion>999)return null;
 let tenant;
 if(periodo===semester()&&S.ramos.includes(r))tenant=S.tenant;
 else{
  const h=(S.historial||[]).find(h=>h.label===periodo&&(h.ramos||[]).includes(r));
  if(!h||!/^20\d{2}-[12]$/.test(periodo)||periodo>semester())return null;
  tenant=r.origen?.tenant||r.cierre?.tenant;
  if(r.origen?.tenant&&r.cierre?.tenant&&r.origen.tenant!==r.cierre.tenant)return null;
 }
 if(!TENANTS[tenant]||(r.origen?.tenant&&r.origen.tenant!==tenant))return null;
 return {p_ramo_id:r.id,p_seccion:r.seccion,p_periodo:periodo,tenant,clave:claveCalificarRamo(r)};
}
function argumentosCalificarRamo(c){return {p_ramo_id:c.p_ramo_id,p_seccion:c.p_seccion,p_periodo:c.p_periodo};}
// Una promesa por dibujo de ficha, compartida por el botón y su resumen. La
// respuesta propia vive solo en memoria; no se marca como calificado en S.
async function consultarCalificacionRamoFicha(r){
 const c=contextoCalificarRamo(r),cliente=typeof supabaseClient==='undefined'?null:supabaseClient,cuenta=typeof currentUser==='undefined'?null:currentUser?.id;
 if(!c||!cliente)return null;
 try{
  const {data,error}=await cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(c));
  if(error||currentUser?.id!==cuenta||supabaseClient!==cliente||JSON.stringify(contextoCalificarRamo(r))!==JSON.stringify(c))return null;
  const estado=Array.isArray(data)?data[0]:data;
  return typeof estado?.puede_calificar==='boolean'?estado:null;
 }catch(e){return null;} // Sin SQL/red: el botón conserva el flujo del profesor.
}
function payloadCalificarRamo(c,carga,facilidad,recomienda,etiquetas=[]){
 const ids=new Set(RAMO_ETIQUETAS.map(e=>e.id));
 if(!Number.isInteger(carga)||carga<1||carga>4||!Number.isInteger(facilidad)||facilidad<1||facilidad>5||typeof recomienda!=='boolean')throw Error('Completa las tres preguntas.');
 if(!Array.isArray(etiquetas)||etiquetas.length>3||etiquetas.some(e=>!ids.has(e)))throw Error('Elige hasta 3 etiquetas de la lista.');
 return {...argumentosCalificarRamo(c),p_carga:carga,p_facilidad:facilidad,p_recomienda:recomienda,p_etiquetas:[...new Set(etiquetas)]};
}
function claveAvisoCalificarRamo(c){return `gh_ramo_calificar_v1:${currentUser.id}:${c.tenant}:${c.clave}:${c.p_periodo}`;}
function avisoCalificarRamoVisto(c){
 const k=claveAvisoCalificarRamo(c);try{return avisosRamoVistos.has(k)||localStorage.getItem(k)==='1';}catch(e){return avisosRamoVistos.has(k);}
}
function marcarAvisoCalificarRamo(c){const k=claveAvisoCalificarRamo(c);avisosRamoVistos.add(k);try{localStorage.setItem(k,'1');}catch(e){}}
function elegibleAvisoCalificarRamo(r,c,estado){
 const progreso=ramoProgress(r),mitad=progreso.total>0&&progreso.total-progreso.pending>=progreso.total/2;
 return !!(c&&estado?.puede_calificar&&!estado.mia&&!avisoCalificarRamoVisto(c)&&(ramoCompletamenteEvaluado(r)||mitad));
}
function errorCalificarRamo(e,accion='guardar'){
 if(/PGRST202|42883/.test(String(e?.code)))return 'Las calificaciones de ramos aún no están disponibles.';
 if(/profesor no califica/.test(String(e?.message)))return 'Las cuentas de profesor no califican ramos.';
 if(/no sincronizados/.test(String(e?.message)))return 'Este ramo o sección aún no está sincronizado. Vuelve a intentarlo en un momento.';
 return `No pudimos ${accion} tu opinión. Revisa tu conexión e inténtalo de nuevo.`;
}
async function abrirCalificarRamo(r,{periodo=semester(),alVolver=null}={}){
 const c=contextoCalificarRamo(r,periodo);if(!c||typeof supabaseClient==='undefined'||!supabaseClient)return false;
 const cuenta=currentUser.id,cliente=supabaseClient,caja=document.getElementById('modal-content'),version=++versionCalificarRamo;if(!caja)return false;
 const vigente=()=>version===versionCalificarRamo&&currentUser?.id===cuenta&&supabaseClient===cliente&&caja.isConnected!==false&&document.getElementById('modal')?.classList.contains('open')
  &&JSON.stringify(contextoCalificarRamo(r,periodo))===JSON.stringify(c);
 const cerrar=()=>alVolver?alVolver():closeModal();
 caja.innerHTML=`<div class="modal-title">Calificar ramo</div><p class="rc-nombre">${esc(r.nombre)}</p><p role="status">Cargando tu opinión…</p><button type="button" class="btn-cancel" data-rc-cerrar>Volver</button>`;
 caja.querySelector('[data-rc-cerrar]').onclick=cerrar;openModal();
 try{
  const {data:estado,error}=await cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(c));if(error)throw error;if(!vigente()||!caja.querySelector('[data-rc-cerrar]'))return false;
  if(!estado?.puede_calificar)throw Error('no disponible');
  const mia=estado.mia||{},seleccion=new Set(mia.etiquetas||[]);
  const radios=(nombre,opciones,valor)=>opciones.map(([v,t])=>`<label class="rc-opcion"><input type="radio" name="${nombre}" value="${v}"${String(valor)===String(v)?' checked':''}><span>${esc(t)}</span></label>`).join('');
  caja.innerHTML=`<div class="modal-title">${estado.mia?'Tu opinión del ramo':'Calificar ramo'}</div><p class="rc-nombre">${esc(r.nombre)} <small>${esc(periodo)} · Sección ${c.p_seccion}</small></p>
   <form class="rc-form" novalidate>
   <fieldset><legend>¿Cuántas horas a la semana le dedicaste fuera de clases?</legend><div class="rc-cargas">${radios('carga',RAMO_CARGAS.map((t,i)=>[i+1,t]),mia.carga)}</div></fieldset>
   <fieldset aria-describedby="rc-facilidad-extremos"><legend>¿Qué tan fácil es sacarse buena nota?</legend><div class="rc-escala">${radios('facilidad',[1,2,3,4,5].map(n=>[n,String(n)]),mia.facilidad)}</div><div class="rc-extremos" id="rc-facilidad-extremos"><span>Muy difícil</span><span>Muy fácil</span></div></fieldset>
   <fieldset><legend>¿Lo recomendarías?</legend><div class="rc-recomienda">${radios('recomienda',[[1,'Sí'],[0,'No']],mia.recomienda===true?1:mia.recomienda===false?0:null)}</div></fieldset>
   <fieldset><legend>¿Cómo es? <small>Hasta 3 · opcional</small></legend><div class="rc-etiquetas">${RAMO_ETIQUETAS.map(e=>`<label class="rc-etiqueta"><input type="checkbox" name="etiqueta" value="${e.id}"${seleccion.has(e.id)?' checked':''}><span>${esc(e.texto)}</span></label>`).join('')}</div></fieldset>
   <p class="rc-error" role="alert"></p>${estado.mia?'<button type="button" class="docente-link rc-borrar" data-rc-borrar>Borrar mi opinión</button>':''}
   <div class="modal-btns"><button type="button" class="btn-cancel" data-rc-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Guardar</button></div></form>`;
  const form=caja.querySelector('form'),mensaje=form.querySelector('[role=alert]');
  const limitar=()=>{const checks=[...form.querySelectorAll('[name=etiqueta]')],n=checks.filter(x=>x.checked).length;checks.forEach(x=>x.disabled=!x.checked&&n>=3);};
  form.addEventListener('change',limitar);limitar();form.querySelector('[data-rc-cancelar]').onclick=cerrar;
  let enviando=false;
  const guardar=async(rpc,args)=>{
   if(enviando||!vigente()||!form.isConnected)return;enviando=true;const botones=[...form.querySelectorAll('button')];botones.forEach(b=>b.disabled=true);mensaje.textContent='';
   try{
    const {error}=await cliente.rpc(rpc,args);if(error)throw error;if(!vigente()||!form.isConnected)return;
    marcarAvisoCalificarRamo(c);invalidarResumenRamo(c.tenant,c.clave);cerrar();showToast(rpc==='ramo_calificar'?'Tu opinión quedó guardada':'Borramos tu opinión');
    if(S.ramos.includes(r)&&currentRamoId===r.id){const opinion=consultarCalificacionRamoFicha(r);renderDocenteRamo(r,opinion);pintarResumenRamoFicha(r,opinion);}
   }catch(e){if(vigente()&&form.isConnected){mensaje.textContent=errorCalificarRamo(e);botones.forEach(b=>b.disabled=false);enviando=false;}}
  };
  form.onsubmit=e=>{
   e.preventDefault();try{
    const valor=n=>form.querySelector(`[name=${n}]:checked`)?.value;
    const rec=valor('recomienda');const payload=payloadCalificarRamo(c,Number(valor('carga')),Number(valor('facilidad')),rec==='1'?true:rec==='0'?false:null,[...form.querySelectorAll('[name=etiqueta]:checked')].map(x=>x.value));guardar('ramo_calificar',payload);
   }catch(e){mensaje.textContent=e.message;enfocarEnHoja(form.querySelector('input:not(:checked)'));}
  };
  const borrar=form.querySelector('[data-rc-borrar]');if(borrar)borrar.onclick=()=>showConfirm('¿Borrar tu opinión del ramo?','Se quitarán tus respuestas y etiquetas.',()=>guardar('ramo_calificacion_borrar',argumentosCalificarRamo(c)),{label:'Borrar',danger:true,focusCancel:true});
  enfocarEnHoja(form.querySelector('input'));return true;
 }catch(e){if(vigente()&&caja.querySelector('[data-rc-cerrar]')){caja.querySelector('[role=status]').textContent=errorCalificarRamo(e,'cargar');}return false;}
}
async function ofrecerCalificarRamoTrasProfesor(r){
 const c=contextoCalificarRamo(r);if(!c)return;
 const cuenta=currentUser.id,cliente=supabaseClient,caja=document.getElementById('modal-content');
 try{
  const {data,error}=await cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(c));
  if(error||!data?.puede_calificar||data.mia||currentUser?.id!==cuenta||!S.ramos.includes(r)||document.getElementById('modal').classList.contains('open'))return;
  caja.innerHTML=`<div class="modal-title">¿Y el ramo?</div><p class="rc-nombre">${esc(r.nombre)}</p><p>La calificación del profesor quedó guardada.</p><div class="modal-btns"><button type="button" class="btn-cancel" data-rc-no>Ahora no</button><button type="button" class="btn-confirm" data-rc-si>Calificar ramo</button></div>`;
  caja.querySelector('[data-rc-no]').onclick=closeModal;caja.querySelector('[data-rc-si]').onclick=()=>abrirCalificarRamo(r);marcarAvisoCalificarRamo(c);openModal();enfocarEnHoja(caja.querySelector('[data-rc-si]'));return true;
 }catch(e){return false;}
}
async function ofrecerCalificarRamosCerrados(ramos,periodo){
 if(typeof currentUser==='undefined'||!currentUser||esCuentaProfesor())return;
 let elegibles=ramos.filter(r=>!r.cierreIncompleto&&contextoCalificarRamo(r,periodo));if(!elegibles.length||typeof supabaseClient==='undefined'||!supabaseClient)return;
 const cuenta=currentUser.id,cliente=supabaseClient;
 try{
  const estados=await Promise.all(elegibles.map(r=>cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(contextoCalificarRamo(r,periodo)))));
  if(currentUser?.id!==cuenta||supabaseClient!==cliente||document.getElementById('modal').classList.contains('open'))return;
  elegibles=elegibles.filter((r,i)=>!estados[i].error&&estados[i].data?.puede_calificar&&!estados[i].data.mia);
 }catch(e){return;}
 if(!elegibles.length)return;
 const caja=document.getElementById('modal-content');if(!caja)return;
 caja.innerHTML=`<div class="modal-title">¿Cómo fueron tus ramos?</div><p>Si quieres, deja tu opinión de los que cerraste.</p><div class="rc-cerrados">${elegibles.map((r,i)=>`<button type="button" data-rc-ramo="${i}">${esc(r.nombre)}<span aria-hidden="true">›</span></button>`).join('')}</div><div class="modal-btns"><button type="button" class="btn-cancel" data-rc-no>Ahora no</button></div>`;
 caja.querySelector('[data-rc-no]').onclick=closeModal;caja.querySelectorAll('[data-rc-ramo]').forEach(b=>b.onclick=()=>abrirCalificarRamo(elegibles[Number(b.dataset.rcRamo)],{periodo,alVolver:()=>ofrecerCalificarRamosCerrados(ramos,periodo)}));openModal();
}
