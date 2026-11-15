function limpiarTextoProfesor(valor,maximo){
  return [...String(valor==null?'':valor)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,'')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'')
    .replace(/\s+/g,' ').trim()].slice(0,maximo).join('');
}


let profesorSolicitud=0;
function contextoDocente(r){
  const seccion=Number(r&&r.seccion);
  if(!currentUser||!r||!S.ramos.includes(r)||!Number.isInteger(seccion)||seccion<1||seccion>999)return null;
  return {p_ramo_id:r.id,p_seccion:seccion,p_periodo:semester()};
}
function errorDocente(error){
  const mensaje=String(error&&error.message||'');
  if(/no sincronizados/.test(mensaje))return 'Este ramo o sección aún no está sincronizado. Espera un momento y reintenta.';
  if(/período no vigente/.test(mensaje))return 'Cambió el semestre. Vuelve a abrir la ficha para informar al profesor.';
  return 'No pudimos conectar con el registro. Revisa tu conexión y reintenta.';
}
const SEGUNDOS_NOMBRES=new Set('jose josé maria maría ignacio antonio andres andrés luis paz jesus jesús francisca javiera fernanda alejandra andrea cecilia ignacia isabel ines inés pablo tomas tomás agustin agustín ester esther del'.split(' '));
function nombreCorto(n){
  const p=String(n||'').trim().split(/\s+/),g=[];
  for(let i=0;i<p.length;i++){
    let t=p[i];
    while(/^(de|del|la|las|los|y|san|von|van)$/i.test(p[i])&&i<p.length-1)t+=' '+p[++i];
    g.push(t);
  }
  if(g.length<=2)return g.join(' ');
  const segundoEsNombre=g.length>=4||SEGUNDOS_NOMBRES.has(g[1].toLowerCase());
  return segundoEsNombre?`${g[0]} ${g[1][0].toUpperCase()}. ${g[2]}`:`${g[0]} ${g[1]}`;
}

// Estado efímero de la ficha, ligado a cuenta, ramo, sección y semestre.
// Nunca se escribe en S ni en localStorage.
let docenteFichaActual=null;
function docenteFichaDeRamo(r){
  const d=docenteFichaActual,c=contextoDocente(r);
  return d&&d.cuenta===(currentUser&&currentUser.id)&&d.ramoId===r.id
    &&JSON.stringify(d.contexto)===JSON.stringify(c)?d:null;
}
async function consultarDocenteRamo(r){
  const cuenta=currentUser&&currentUser.id,contexto=contextoDocente(r);
  if(!contexto)return null;
  const [docente,calificacion]=await Promise.all([
    supabaseClient.rpc('profesor_docente_estado',contexto),
    supabaseClient.rpc('profesor_calificacion_estado',contexto)]);
  if(docente.error)throw docente.error;
  if(calificacion.error)throw calificacion.error;
  if(!currentUser||currentUser.id!==cuenta||JSON.stringify(contextoDocente(r))!==JSON.stringify(contexto))return null;
  const fila=x=>(Array.isArray(x.data)?x.data[0]:x.data)||{};
  const estado=fila(docente),calif=fila(calificacion);
  return {cuenta,ramoId:r.id,contexto,nombre:limpiarTextoProfesor(estado.nombre_publico,100),mio:limpiarTextoProfesor(estado.mi_nombre,100),calif};
}
async function renderDocenteRamo(r){
  const raiz=document.getElementById('ramo-profe'),boton=document.getElementById('calif-accion');
  if(!raiz||!boton)return;
  const solicitud=++profesorSolicitud,cuenta=currentUser&&currentUser.id,contexto=contextoDocente(r);
  docenteFichaActual=null;raiz.innerHTML='';boton.hidden=true;boton.onclick=null;boton.removeAttribute('aria-label');
  if(!currentUser)return;
  boton.innerHTML='<span aria-hidden="true">★</span><span>Calificar profesor</span>';
  if(!contexto){
    boton.hidden=false;boton.onclick=()=>abrirSeccionParaCalificar(r);return;
  }
  const vigente=()=>solicitud===profesorSolicitud&&currentUser&&currentUser.id===cuenta&&currentRamoId===r.id
    &&JSON.stringify(contextoDocente(r))===JSON.stringify(contexto);
  try{
    const d=await consultarDocenteRamo(r);if(!d||!vigente())return;
    docenteFichaActual=d;
    const {nombre,mio,calif,contexto}=d,quien=nombre||mio,mia=Number(calif.mi_estrellas)||0;
    const nota=quien?htmlResumenCalificacion(calif):'',promedioAccesible=nota?`. Promedio ${Number(calif.promedio).toFixed(1)} de 5`:'';
    raiz.innerHTML=quien?`${calif.puede_calificar===true?`<button type="button" aria-label="${esc(`Profesor ${quien}${promedioAccesible}. ${mia?'Editar tu calificación':'Calificar profesor'}`)}"><span>${esc(nombreCorto(quien))}${nota}</span></button>`:`<span>${esc(nombreCorto(quien))}${nota}</span>`}`:'';
    const tocar=raiz.querySelector('button');
    if(tocar)tocar.onclick=()=>{if(docenteFichaDeRamo(r)===d)abrirCalificarProfesor(r,contexto,d);};
    boton.hidden=calif.puede_calificar!==true||!!mia;
    boton.onclick=()=>{if(docenteFichaDeRamo(r)===d)abrirCalificarProfesor(r,contexto,d);};
  }catch(error){
    if(!vigente())return;
    boton.hidden=false;boton.textContent='Reintentar';boton.onclick=()=>renderDocenteRamo(r);
    boton.setAttribute('aria-label','Reintentar consultar al profesor');
    showToast(errorDocente(error));
  }
}
// La sección se pide dentro de Calificar, con la misma hoja del nombre. Sigue
// siendo opcional para llevar el ramo; solo se necesita para identificar al profe.
function abrirSeccionParaCalificar(r){
  const cuenta=currentUser&&currentUser.id,periodo=semester(),tenant=S.tenant;
  if(!cuenta||!S.ramos.includes(r)||currentRamoId!==r.id)return;
  // El horario puede escribir la sigla con prefijo: el de la FEN dice ENMEM1505.
  const prefijo=PREFIJO_SIGLA_HORARIO[tenant];
  const sigla=prefijo!=null?String(siglaDeRamo(r,tenant)||'').toUpperCase():'',codigo=(prefijo||'')+sigla;
  const contenido=document.getElementById('modal-content');
  contenido.innerHTML=`<div class="modal-title">Calificar profesor</div>
    <form class="calif-nombre" novalidate>
      <label class="modal-label" for="m-ramo-seccion">¿Cuál es tu sección?</label>
      <div class="modal-input"><input type="text" inputmode="numeric" id="m-ramo-seccion" maxlength="3" autocomplete="off" enterkeyhint="go" placeholder="Ej.: 3" aria-describedby="calif-seccion-error"></div>
      <p id="calif-seccion-error" class="calif-error" role="alert"></p>
      ${sigla?`<button type="button" class="horario-importar-link" data-foto>Sube una foto de tu horario</button>
      <input type="file" id="m-horario-foto" accept="image/*" hidden aria-label="Foto de tu horario">
      <p id="m-horario-estado" class="horario-importar-estado" role="status" aria-live="polite">Y te agregamos las secciones automáticamente.</p>`:''}
      <div class="modal-btns"><button type="button" class="btn-cancel" data-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Continuar</button></div>
    </form>`;
  const form=contenido.querySelector('form'),input=form.querySelector('input'),mensaje=form.querySelector('[role=alert]'),boton=form.querySelector('[type=submit]');
  const vigente=()=>currentUser&&currentUser.id===cuenta&&S.tenant===tenant&&semester()===periodo
    &&S.ramos.includes(r)&&currentRamoId===r.id&&form.isConnected&&contenido.contains(form)
    &&document.getElementById('modal').classList.contains('open');
  input.addEventListener('input',()=>limpiarErrorCampo('m-ramo-seccion','calif-seccion-error'));
  form.querySelector('[data-cancelar]').onclick=closeModal;
  const foto=form.querySelector('[type=file]'),subirFoto=form.querySelector('[data-foto]');
  if(foto&&subirFoto){
    subirFoto.onclick=()=>foto.click();
    foto.onchange=async()=>{
      if(!vigente()||boton.disabled)return;
      boton.disabled=true;input.disabled=true;subirFoto.disabled=true;
      try{
        await leerFotoHorario(foto,lecturas=>{
          if(!vigente()||String(siglaDeRamo(r,tenant)||'').toUpperCase()!==sigla)return false;
          // Mismo lector y votación de secciones que al importar el horario.
          // Solo sirve la sigla de ESTE ramo; un empate no elige sección.
          const encontrada=codigosDeFotoHorario(lecturas).find(c=>c.sigla===codigo);
          const estado=form.querySelector('[role=status]');
          if(!encontrada||encontrada.seccion==null){
            estado.textContent=`No pudimos identificar la sección de ${codigo}. Prueba con otra foto o escríbela arriba.`;
            return false;
          }
          input.value=String(encontrada.seccion);
          limpiarErrorCampo('m-ramo-seccion','calif-seccion-error');
          estado.textContent=`${codigo} · Sección ${encontrada.seccion}. Revisa el número antes de continuar.`;
          return true;
        });
      }finally{
        boton.disabled=false;input.disabled=false;subirFoto.disabled=false;
        if(vigente())enfocarEnHoja(input);
      }
    };
  }
  form.onsubmit=async e=>{
    e.preventDefault();if(boton.disabled||!vigente())return;
    const seccion=parseSeccion(input.value);
    if(seccion==null){mostrarErrorCampo('m-ramo-seccion','calif-seccion-error','Escribe tu sección como un número entre 1 y 999.');return;}
    boton.disabled=true;boton.textContent='Guardando…';input.disabled=true;if(subirFoto)subirFoto.disabled=true;mensaje.textContent='';mensaje.hidden=false;
    try{
      r.seccion=seccion;
      completarFechasOficiales(r,{tenant:S.tenant,carrera:S.carrera});
      save();
      // El registro de profesores valida la sección contra user_ramos: no
      // consultarlo hasta que este cambio esté respaldado en la cuenta.
      const guardada=await respaldoAlDia();if(!vigente()||r.seccion!==seccion)return;
      if(!guardada){mensaje.textContent='No pudimos guardar tu sección. Inténtalo de nuevo.';return;}
      const d=await consultarDocenteRamo(r);if(!vigente()||r.seccion!==seccion)return;
      if(!d||d.calif.puede_calificar!==true){mensaje.textContent='Por ahora no puedes calificar al profesor de esta sección.';return;}
      renderRamo();
      abrirCalificarProfesor(r,d.contexto,d);
    }catch(error){if(vigente())mensaje.textContent=errorDocente(error);}
    finally{boton.disabled=false;boton.textContent='Continuar';input.disabled=false;if(subirFoto)subirFoto.disabled=false;}
  };
  openModal();enfocarEnHoja(input);
}
// En Editar ramo el camino es visible y tiene su propio estado de carga/error.
async function pintarProfesorEditarRamo(r){
  const boton=document.getElementById('editar-profe');if(!boton)return;
  const cuenta=currentUser&&currentUser.id,contexto=contextoDocente(r);
  if(!contexto){boton.disabled=true;boton.innerHTML='<span>Sin profesor<small>Agrega y guarda la sección para calificar</small></span>';return;}
  boton.disabled=true;boton.innerHTML='<span>Consultando profesor…</span>';
  try{
    const d=docenteFichaDeRamo(r)||await consultarDocenteRamo(r);
    if(!d||!boton.isConnected||document.getElementById('editar-profe')!==boton||!currentUser||currentUser.id!==cuenta)return;
    docenteFichaActual=d;
    const quien=d.nombre||d.mio,mia=Number(d.calif.mi_estrellas)||0;
    boton.innerHTML=`<span>${quien?esc(nombreCorto(quien)):'Sin profesor'}<small>${mia?`Tu calificación: ${mia} de 5`:'Sin calificar'}</small></span><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;
    boton.setAttribute('aria-label',`Profesor ${quien||'sin informar'}. ${mia?`Tu calificación: ${mia} de 5`:'Sin calificar'}`);
    boton.disabled=d.calif.puede_calificar!==true;
    boton.onclick=()=>{
      if(docenteFichaDeRamo(r)!==d)return;
      const campos=[...document.querySelectorAll('#modal-content input')];
      const cambios=campos.some(x=>x.type==='checkbox'?x.checked!==x.defaultChecked:x.value!==x.defaultValue)||modalColor!==r.color;
      const abrir=()=>{if(docenteFichaDeRamo(r)===d)abrirCalificarProfesor(r,d.contexto,d);};
      if(cambios){showConfirm('Hay cambios sin guardar','Guarda el ramo antes de calificar o descarta esos cambios para continuar.',abrir,{label:'Descartar cambios',danger:true,focusCancel:true});return;}
      abrir();
    };
  }catch(error){
    if(!boton.isConnected||!currentUser||currentUser.id!==cuenta)return;
    boton.disabled=false;boton.innerHTML='<span>Reintentar consultar al profesor</span>';boton.onclick=()=>pintarProfesorEditarRamo(r);
  }
}

// Calificación del profesor: estrellas y hasta 3 etiquetas de PROFESOR_ETIQUETAS
// (cómo es como profe), incluida una etiqueta escrita, corta y filtrada. El promedio junta las secciones y
// semestres en que ese docente dictó este ramo y no se publica bajo 3.
