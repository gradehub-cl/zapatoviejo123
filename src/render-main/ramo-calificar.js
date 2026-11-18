// Opiniones cerradas de ramos. Estado efímero y aviso local separado de gradehub_v1.
const RAMO_CARGAS=['Menos de 3','3 a 6','6 a 10','Más de 10'];
const RAMO_CHIPS_MAX=8;
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
// asistencia: true, false o null («No sé»); undefined es no haber respondido.
function payloadCalificarRamo(c,{carga,facilidad,asistencia,recomienda,etiquetas=[]}={}){
 const ids=new Set(RAMO_ETIQUETAS.map(e=>e.id)),escala=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
 if(!escala(carga,4)||!escala(facilidad,5)||!(asistencia===null||typeof asistencia==='boolean')||typeof recomienda!=='boolean')throw Error('Responde todas las preguntas.');
 if(!Array.isArray(etiquetas)||etiquetas.length>3||etiquetas.some(e=>!ids.has(e)))throw Error('Elige hasta 3 etiquetas de la lista.');
 return {...argumentosCalificarRamo(c),p_carga:carga,p_facilidad:facilidad,p_asistencia:asistencia,p_recomienda:recomienda,p_etiquetas:[...new Set(etiquetas)]};
}
// Formulario nuevo (servidor con `version: 2`): sin horas a la semana (las
// guardadas no se tocan) y con etiquetas escritas. Mismas reglas que
// ramo_opinar en SQL (Lucas, 2026-11-18).
// recomienda: 3 = Sí, 2 = Más o menos, 1 = No.
function payloadOpinarRamo(c,{facilidad,asistencia,recomienda,etiquetas=[],otros=[]}={}){
 const ids=new Set(RAMO_ETIQUETAS.map(e=>e.id)),escala=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
 if(!escala(facilidad,5)||!(asistencia===null||typeof asistencia==='boolean')||!escala(recomienda,3))throw Error('Responde todas las preguntas.');
 const lista=[...new Set(Array.isArray(etiquetas)?etiquetas:[])];
 if(lista.some(e=>!ids.has(e)))throw Error('Elige hasta 3 etiquetas de la lista.');
 const escritas=[];
 for(const t of Array.isArray(otros)?otros:[]){
  const limpio=String(t||'').replace(/\s+/g,' ').trim();
  if([...limpio].length<3||[...limpio].length>20)throw Error('Cada etiqueta escrita tiene entre 3 y 20 letras.');
  if(!escritas.some(x=>normalEtiquetaEscrita(x)===normalEtiquetaEscrita(limpio)))escritas.push(limpio);
 }
 if(lista.length+escritas.length>3)throw Error('Elige hasta 3 etiquetas.');
 return {...argumentosCalificarRamo(c),p_facilidad:facilidad,p_asistencia:asistencia,p_recomienda_nivel:recomienda,p_etiquetas:lista,p_otros:escritas};
}
// Las etiquetas que se ofrecen salen de lo que más se elige en el ramo. Sin
// datos (o sin la RPC) queda la lista fija. Las propias siempre se ven.
//  sug: {disponible, orden:[ids], sin_uso:[ids], propias:[textos]}
// Devuelve [{id}] para las de la lista y [{texto}] para las escritas.
function etiquetasSugeridasRamo(sug,mias=[],escritas=[]){
 const base=RAMO_ETIQUETAS.map(e=>e.id),valida=id=>base.includes(id);
 const propias=escritas.map(texto=>({texto}));
 if(!sug||sug.disponible!==true)return [...base.map(id=>({id})),...propias];
 const orden=[...new Set((Array.isArray(sug.orden)?sug.orden:[]).filter(valida))];
 const sinUso=new Set((Array.isArray(sug.sin_uso)?sug.sin_uso:[]).filter(valida));
 const vistos=new Set(escritas.map(normalEtiquetaEscrita));
 const textos=[];
 for(const t of Array.isArray(sug.propias)?sug.propias:[]){
  const n=normalEtiquetaEscrita(t);if(typeof t!=='string'||!n||vistos.has(n))continue;vistos.add(n);textos.push({texto:t.trim(),sugerida:true});
 }
 // Prioridad: las más elegidas, después las escritas que repiten tres o más,
 // y al final el resto de la lista que alguien usa. Hasta ocho.
 const candidatas=[...orden.map(id=>({id})),...textos,...base.filter(id=>!orden.includes(id)&&!sinUso.has(id)).map(id=>({id}))];
 const visibles=candidatas.slice(0,RAMO_CHIPS_MAX);
 // Lo que la persona ya eligió nunca desaparece.
 for(const id of mias)if(valida(id)&&!visibles.some(x=>x.id===id))visibles.push({id});
 return [...visibles,...propias];
}
// Nivel guardado (3, 2 o 1) o, en una opinión antigua, su Sí o No.
function nivelRecomiendaRamo(mia){
 const n=Number(mia?.recomienda_nivel);
 if(n>=1&&n<=3&&Number.isInteger(n))return n;
 return mia?.recomienda===true?3:mia?.recomienda===false?1:null;
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
 if(/texto no permitido/.test(String(e?.message)))return 'Esa etiqueta no se puede usar.';
 if(/etiquetas/.test(String(e?.message)))return 'Elige hasta 3 etiquetas.';
 return `No pudimos ${accion} tu opinión. Revisa tu conexión e inténtalo de nuevo.`;
}
// «2026-2 · Sección 1» y, si el ramo no es coordinado, «· con <profesor>»:
// cada profesor arma sus pruebas, así que la opinión es de esa sección con ese
// profesor (Lucas, 2026-11-18). El nombre sale de la ficha ya abierta o del
// registro de docentes del semestre vigente; si no se sabe, no se pone.
async function subtituloCalificarRamo(r,c){
 const base=`${c.p_periodo} · Sección ${c.p_seccion}`;
 try{
  const coordinado=typeof coordinacionResumenRamo==='function'?await coordinacionResumenRamo(r,c.tenant):null;
  if(coordinado===true||c.p_periodo!==semester())return base;
  let d=typeof docenteFichaDeRamo==='function'?docenteFichaDeRamo(r):null,nombre=d&&(d.nombre||d.mio);
  if(!nombre&&typeof contextoDocente==='function'&&contextoDocente(r)){
   const {data,error}=await supabaseClient.rpc('profesor_docente_estado',contextoDocente(r));
   const fila=(Array.isArray(data)?data[0]:data)||{};
   if(!error)nombre=limpiarTextoProfesor(fila.nombre_publico||fila.mi_nombre,100);
  }
  return nombre?`${base} · con ${nombreCorto(nombre)}`:base;
 }catch(e){return base;}
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
  const [{data:estado,error},subtitulo]=await Promise.all([cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(c)),subtituloCalificarRamo(r,c)]);if(error)throw error;if(!vigente()||!caja.querySelector('[data-rc-cerrar]'))return false;
  if(!estado?.puede_calificar)throw Error('no disponible');
  const mia=estado.mia||{},seleccion=new Set(mia.etiquetas||[]);
  const radios=(nombre,opciones,valor)=>opciones.map(([v,t])=>`<label class="rc-opcion"><input type="radio" name="${nombre}" value="${v}"${String(valor)===String(v)?' checked':''}><span>${esc(t)}</span></label>`).join('');
  // Con `version: 2` el servidor acepta el formulario nuevo; sin ella (SQL aún
  // no aplicado) sigue el anterior, para no perder respuestas.
  const v2=estado.version===2;
  let sugeridas=null;
  if(v2){
   try{const {data,error:e2}=await cliente.rpc('ramo_etiquetas_sugeridas',argumentosCalificarRamo(c));if(!e2)sugeridas=data;}catch(e){}
   if(!vigente()||!caja.querySelector('[data-rc-cerrar]'))return false;
  }
  const escritasMias=v2&&Array.isArray(mia.otros)?mia.otros.filter(t=>typeof t==='string'&&t.trim()):[];
  const chipEscrita=(texto,marcada)=>`<label class="rc-etiqueta rc-escrita"><input type="checkbox" name="escrita" value="${esc(texto)}"${marcada?' checked':' data-rc-sugerida'}><span>${esc(texto)}</span></label>`;
  const chips=v2?etiquetasSugeridasRamo(sugeridas,[...seleccion],escritasMias):RAMO_ETIQUETAS.map(e=>({id:e.id}));
  const etiquetasHTML=`<fieldset><legend>¿Cómo era? <small>Hasta 3 · opcional</small></legend><div class="rc-etiquetas">${chips.map(x=>x.id
    ?`<label class="rc-etiqueta"><input type="checkbox" name="etiqueta" value="${esc(x.id)}"${seleccion.has(x.id)?' checked':''}><span>${esc(RAMO_ETIQUETAS.find(e=>e.id===x.id).texto)}</span></label>`
    :chipEscrita(x.texto,!x.sugerida)).join('')}${v2?'<label class="rc-etiqueta rc-otro"><input type="checkbox" name="otro" data-rc-otro><span>Otro</span></label>':''}</div>
    ${v2?'<div class="rc-otro-campo" hidden><input type="text" class="rc-otro-texto" maxlength="20" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="Tu etiqueta" aria-label="Escribe tu etiqueta" aria-describedby="rc-otro-cuenta"><span id="rc-otro-cuenta" class="rc-otro-cuenta">0/20</span><button type="button" class="docente-link" data-rc-agregar>Agregar</button></div>':''}</fieldset>`;
  const preguntas={
   facilidad:`<fieldset aria-describedby="rc-facilidad-extremos"><legend>¿Qué tan fácil era sacarse buena nota?</legend><div class="rc-escala">${radios('facilidad',[1,2,3,4,5].map(n=>[n,String(n)]),mia.facilidad)}</div><div class="rc-extremos" id="rc-facilidad-extremos"><span>Muy difícil</span><span>Muy fácil</span></div></fieldset>`,
   carga:`<fieldset><legend>¿Cuántas horas a la semana le dedicaste fuera de clases?</legend><div class="rc-cargas">${radios('carga',RAMO_CARGAS.map((t,i)=>[i+1,t]),mia.carga)}</div></fieldset>`,
   asistencia:`<fieldset><legend>¿Se tomaba asistencia?</legend><div class="rc-asistencia">${radios('asistencia',[['si','Sí'],['no','No'],['nose','No sé']],mia.asistencia===true?'si':mia.asistencia===false?'no':estado.mia?'nose':null)}</div></fieldset>`,
   recomienda:v2
    // Sí / Más o menos / No. Una opinión antigua (solo Sí o No) se lee igual.
    ?`<fieldset><legend>¿Lo recomendarías?</legend><div class="rc-recomienda rc-recomienda-3">${radios('recomienda',[[3,'Sí'],[2,'Más o menos'],[1,'No']],nivelRecomiendaRamo(mia))}</div></fieldset>`
    :`<fieldset><legend>¿Lo recomendarías?</legend><div class="rc-recomienda">${radios('recomienda',[[1,'Sí'],[0,'No']],mia.recomienda===true?1:mia.recomienda===false?0:null)}</div></fieldset>`,
  };
  // Formulario nuevo: sin horas y recomendar antes de las etiquetas (Lucas, 2026-11-18).
  const orden=v2?[preguntas.facilidad,preguntas.asistencia,preguntas.recomienda,etiquetasHTML]
   :[preguntas.facilidad,preguntas.carga,preguntas.asistencia,preguntas.recomienda,etiquetasHTML];
  caja.innerHTML=`<div class="modal-title">${estado.mia?'Tu opinión del ramo':'Calificar ramo'}</div><p class="rc-nombre">${esc(r.nombre)} <small>${esc(subtitulo)}</small></p><p class="rc-ayuda">Responde por tu sección: si cada profesor evalúa distinto, lo mostramos por separado.</p>
   <form class="rc-form" novalidate>${orden.join('')}
   <p class="rc-error" role="alert"></p>${estado.mia?'<button type="button" class="docente-link rc-borrar" data-rc-borrar>Borrar mi opinión</button>':''}
   <div class="modal-btns"><button type="button" class="btn-cancel" data-rc-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Guardar</button></div></form>`;
  const form=caja.querySelector('form'),mensaje=form.querySelector('[role=alert]');
  const otroChip=form.querySelector('[data-rc-otro]'),campoOtro=form.querySelector('.rc-otro-campo'),textoOtro=form.querySelector('.rc-otro-texto');
  // Hasta tres entre las de la lista y las escritas; «Otro» abierto ocupa un lugar.
  const limitar=()=>{
   const checks=[...form.querySelectorAll('[name=etiqueta],[name=escrita],[name=otro]')],n=checks.filter(x=>x.checked).length;
   checks.forEach(x=>x.disabled=!x.checked&&n>=3);
   if(otroChip&&campoOtro.hidden===otroChip.checked){campoOtro.hidden=!otroChip.checked;if(otroChip.checked)enfocarEnHoja(textoOtro);}
  };
  form.addEventListener('change',e=>{
   // Desmarcar una escrita propia la quita; una sugerida queda como opción.
   if(e.target.matches('[name=escrita]:not([data-rc-sugerida])')&&!e.target.checked)e.target.closest('label').remove();
   limitar();
  });limitar();form.querySelector('[data-rc-cancelar]').onclick=cerrar;
  const contarOtro=()=>{form.querySelector('.rc-otro-cuenta').textContent=[...textoOtro.value].length+'/20';};
  // Lo escrito pasa a ser una etiqueta marcada y «Otro» vuelve a quedar libre.
  const agregarEscrita=()=>{
   const t=textoOtro.value.replace(/\s+/g,' ').trim();
   if([...t].length<3){mensaje.textContent='Escribe tu etiqueta.';textoOtro.focus();return false;}
   if([...t].length>20){mensaje.textContent='La etiqueta puede tener hasta 20 caracteres.';textoOtro.focus();return false;}
   mensaje.textContent='';
   const igual=[...form.querySelectorAll('[name=escrita]')].find(x=>normalEtiquetaEscrita(x.value)===normalEtiquetaEscrita(t));
   otroChip.checked=false;
   if(igual)igual.checked=true;else otroChip.closest('label').insertAdjacentHTML('beforebegin',chipEscrita(t,true));
   textoOtro.value='';contarOtro();limitar();
   return true;
  };
  if(otroChip){
   textoOtro.addEventListener('input',contarOtro);
   textoOtro.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(agregarEscrita())[...form.querySelectorAll('[name=escrita]:checked')].pop()?.focus();}});
   form.querySelector('[data-rc-agregar]').onclick=()=>{if(agregarEscrita())[...form.querySelectorAll('[name=escrita]:checked')].pop()?.focus();};
  }
  let enviando=false;
  const guardar=async(rpc,args)=>{
   if(enviando||!vigente()||!form.isConnected)return;enviando=true;const botones=[...form.querySelectorAll('button')];botones.forEach(b=>b.disabled=true);mensaje.textContent='';
   try{
    const {error}=await cliente.rpc(rpc,args);if(error)throw error;if(!vigente()||!form.isConnected)return;
    marcarAvisoCalificarRamo(c);invalidarResumenRamo(c.tenant,c.clave);cerrar();showToast(rpc==='ramo_calificacion_borrar'?'Borramos tu opinión':'Tu opinión quedó guardada');
    if(S.ramos.includes(r)&&currentRamoId===r.id){const opinion=consultarCalificacionRamoFicha(r);renderDocenteRamo(r,opinion);pintarResumenRamoFicha(r,opinion);}
   }catch(e){if(vigente()&&form.isConnected){mensaje.textContent=errorCalificarRamo(e);botones.forEach(b=>b.disabled=false);enviando=false;}}
  };
  form.onsubmit=e=>{
   e.preventDefault();try{
    const valor=n=>form.querySelector(`[name=${n}]:checked`)?.value;
    const rec=valor('recomienda'),asis=valor('asistencia');
    const comunes={facilidad:Number(valor('facilidad')),
     asistencia:asis==='si'?true:asis==='no'?false:asis==='nose'?null:undefined,
     etiquetas:[...form.querySelectorAll('[name=etiqueta]:checked')].map(x=>x.value)};
    if(!v2){guardar('ramo_calificar',payloadCalificarRamo(c,{...comunes,recomienda:rec==='1'?true:rec==='0'?false:null,carga:Number(valor('carga'))}));return;}
    comunes.recomienda=Number(rec)||null;
    if(otroChip.checked&&textoOtro.value.trim()&&!agregarEscrita())return;
    guardar('ramo_opinar',payloadOpinarRamo(c,{...comunes,
     otros:[...form.querySelectorAll('[name=escrita]:checked')].map(x=>x.value)}));
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
