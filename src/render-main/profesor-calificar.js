function etiquetaProfesor(id){
  const e=(typeof PROFESOR_ETIQUETAS!=='undefined'?PROFESOR_ETIQUETAS:[]).find(x=>x.id===id);
  return e?e.texto:'';
}
function htmlResumenCalificacion(estado){
  const total=Math.max(0,Number(estado&&estado.total)||0),promedio=estado&&estado.promedio!=null?Number(estado.promedio):NaN;
  return total>=3&&promedio>=1&&promedio<=5?` · <span class="calif-linea"><span class="calif-estrella-ficha" aria-hidden="true">★</span> <strong>${promedio.toFixed(1)}</strong><span class="calif-sr"> de 5</span></span>`:'';
}
function payloadCalificacion(contexto,estrellas,etiquetas,otros=[]){
  const validas=new Set((typeof PROFESOR_ETIQUETAS!=='undefined'?PROFESOR_ETIQUETAS:[]).map(x=>x.id));
  const lista=[...new Set(etiquetas)].filter(x=>validas.has(x)).slice(0,3);
  return {...contexto,p_estrellas:estrellas,p_etiquetas:lista,p_otros:otros.slice(0,3-lista.length)};
}
// Etiquetas escritas: la misma sin tildes, mayúsculas ni espacios de más cuenta una.
function normalEtiquetaEscrita(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase();}
// Las seis más cercanas; las seleccionadas permanecen aunque cambien las estrellas.
function etiquetasSugeridasProfesor(estrellas,seleccionadas=[]){
  if(!estrellas)return [];
  const cercanas=new Set([...PROFESOR_ETIQUETAS].sort((a,b)=>Math.abs(a.valencia-estrellas)-Math.abs(b.valencia-estrellas)||a.valencia-b.valencia).slice(0,6).map(e=>e.id));
  return PROFESOR_ETIQUETAS.filter(e=>cercanas.has(e.id)||seleccionadas.includes(e.id)).map(e=>e.id);
}
function errorCalificacion(error){
  const mensaje=String(error&&error.message||'');
  if(/texto no permitido/.test(mensaje))return 'Esa etiqueta no se puede usar';
  if(/sin informar/.test(mensaje))return 'Primero dinos quién te hace clases.';
  if(/profesor oculto/.test(mensaje))return 'Este profesor pidió no aparecer en GradeHub, así que no se puede calificar.';
  if(/etiquetas/.test(mensaje))return 'Elige hasta 3 etiquetas.';
  if(/nombre inválido/.test(mensaje))return 'Escribe el nombre completo del profesor.';
  return errorDocente(error);
}
// Mismo criterio que profesor_normalizar en SQL: sin tildes, mayúsculas ni signos.
function nombreProfesorNormal(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
// Solo propone para la confirmación; no publica un nombre ni fabrica consenso.
function profesorPropuestoRamo(r,contexto){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return '';
  if(!r||!contexto||(r.origen?.tenant&&r.origen.tenant!==S.tenant))return '';
  const seccion=Number(contexto.p_seccion);
  if(!Number.isInteger(seccion)||seccion<1||seccion>999||seccion!==Number(r.seccion)
    ||contexto.p_ramo_id!==r.id||contexto.p_periodo!==semester())return '';
  const sigla=String(r.sigla||r.origen?.ramoKey||'').trim().toUpperCase();
  const nombre=PROFESORES_PROPUESTOS[S.tenant]?.[contexto.p_periodo]?.[sigla]?.[seccion];
  return typeof nombre==='string'?nombre:'';
}
// Panel de Calificar profesor: primero quién es y después cómo es.
function abrirCalificarProfesor(r,contexto,{nombre,mio,calif}){
  nombre=nombre||mio||profesorPropuestoRamo(r,contexto);
  const cuenta=currentUser&&currentUser.id;
  const vigente=()=>currentUser&&currentUser.id===cuenta&&S.ramos.includes(r)
    &&JSON.stringify(contextoDocente(r))===JSON.stringify(contexto);
  const contenido=document.getElementById('modal-content');
  const pasoNombre=()=>{
    if(nombre){
      contenido.innerHTML=`<div class="modal-title">Calificar profesor</div>
        <p class="calif-pregunta">¿Es tu profesor <strong>${esc(nombre)}</strong>?</p>
        <div class="modal-btns calif-si-no"><button type="button" class="btn-cancel" data-otro>No, es otra persona</button><button type="button" class="btn-confirm" data-si>Sí, es mi profesor</button></div>`;
      contenido.querySelector('[data-si]').onclick=()=>pasoCalificar(nombre);
      contenido.querySelector('[data-otro]').onclick=()=>pedirNombre(mio&&nombreProfesorNormal(mio)!==nombreProfesorNormal(nombre)?mio:'');
      openModal();enfocarEnHoja(contenido.querySelector('[data-si]'));
    }else{pedirNombre(mio);openModal();}
  };
  const pedirNombre=valor=>{
    contenido.innerHTML=`<div class="modal-title">Calificar profesor</div>
      <form class="calif-nombre" novalidate>
        <label class="modal-label" for="calif-nombre">¿Quién te hace clases?</label>
        <div class="modal-input"><input type="text" id="calif-nombre" class="calif-campo-texto" maxlength="100" autocomplete="off" autocapitalize="words" placeholder="Ej.: María José Pérez" value="${esc(valor||'')}" aria-describedby="calif-nombre-error"></div>
        <p id="calif-nombre-error" class="calif-error" role="alert"></p>
        <div class="modal-btns"><button type="button" class="btn-cancel" data-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Continuar</button></div>
      </form>`;
    const form=contenido.querySelector('form'),input=form.querySelector('input');
    form.querySelector('[data-cancelar]').onclick=closeModal;
    form.onsubmit=e=>{
      e.preventDefault();
      const limpio=limpiarTextoProfesor(input.value,100);
      if(limpio.length<3){form.querySelector('[role=alert]').textContent='Escribe el nombre completo del profesor.';input.focus();return;}
      pasoCalificar(limpio);
    };
    enfocarEnHoja(input);
  };
  const pasoCalificar=elegido=>{
    const mia=Number(calif.mi_estrellas)||0,mias=new Set(Array.isArray(calif.mi_etiquetas)?calif.mi_etiquetas:[]);
    const escritas=Array.isArray(calif.mi_otros)?calif.mi_otros:calif.mi_otro?[calif.mi_otro]:[];
    const chipEscrita=t=>`<label class="calif-chip calif-escrita"><input type="checkbox" name="calif-etiqueta" value="${esc(t)}" data-escrita checked><span>${esc(t)}</span></label>`;
    contenido.innerHTML=`<div class="modal-title">Calificar profesor</div>
      <form class="calif-form" novalidate>
        <p class="calif-quien"><span>${esc(elegido)}</span><button type="button" class="docente-link" data-cambiar>Cambiar</button></p>
        <fieldset class="calif-campo"><legend>¿Cómo lo evalúas como profe?</legend>
          <div class="calif-opciones" data-valor="${mia}">${[1,2,3,4,5].map(n=>`<label class="calif-opcion"><input type="radio" name="calif-estrellas" value="${n}"${n===mia?' checked':''}><span aria-hidden="true">★</span><span class="calif-sr">${n} de 5</span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="calif-campo"><legend>¿Cómo es? <span class="calif-opcional">hasta 3</span></legend>
          <div class="calif-chips">${PROFESOR_ETIQUETAS.map(e=>`<label class="calif-chip" data-valencia="${e.valencia}"><input type="checkbox" name="calif-etiqueta" value="${esc(e.id)}"${mias.has(e.id)?' checked':''}><span>${esc(e.texto)}</span></label>`).join('')}${escritas.map(chipEscrita).join('')}<label class="calif-chip calif-otro"><input type="checkbox" name="calif-etiqueta" value="otro"><span>Otro</span></label></div>
          <div class="calif-otro-campo" hidden><input type="text" class="calif-otro-texto" maxlength="20" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" placeholder="Tu etiqueta" aria-label="Escribe tu etiqueta" aria-describedby="calif-otro-cuenta"><span id="calif-otro-cuenta" class="calif-otro-cuenta">0/20</span><button type="button" class="docente-link" data-agregar>Agregar</button></div>
        </fieldset>
        <p class="calif-error" role="alert"></p>
        ${mia?'<button type="button" class="docente-link calif-borrar" data-borrar>Borrar mi calificación</button>':''}
        <div class="modal-btns"><button type="button" class="btn-cancel" data-cancelar>Cancelar</button><button type="submit" class="btn-confirm">Guardar</button></div>
      </form>`;
    const form=contenido.querySelector('form'),mensaje=form.querySelector('[role=alert]');
    const estrellas=()=>Number((form.querySelector('input[name=calif-estrellas]:checked')||{}).value)||0;
    const marcar=()=>{
      const v=estrellas();form.querySelectorAll('.calif-opcion').forEach((l,i)=>l.classList.toggle('lleno',i<v));
      form.querySelector('.calif-opciones').dataset.valor=v;
      const seleccionadas=[...form.querySelectorAll('input[name=calif-etiqueta]:checked')].map(x=>x.value);
      const sugeridas=new Set(etiquetasSugeridasProfesor(v,seleccionadas));
      form.querySelectorAll('.calif-chip:not(.calif-otro):not(.calif-escrita)').forEach(l=>{l.hidden=!sugeridas.has(l.querySelector('input').value);});
      form.querySelector('.calif-chips').closest('fieldset').hidden=!v;
      const marcadoOtro=form.querySelector('.calif-otro input').checked,campo=form.querySelector('.calif-otro-campo');
      if(campo.hidden===marcadoOtro){campo.hidden=!marcadoOtro;if(marcadoOtro)enfocarEnHoja(campo.querySelector('input'));}
      const chips=[...form.querySelectorAll('input[name=calif-etiqueta]')],n=chips.filter(x=>x.checked).length;
      chips.forEach(x=>{x.disabled=!x.checked&&n>=3;});
    };
    // Desmarcar una escrita la quita: no queda como sugerencia.
    form.addEventListener('change',e=>{if(e.target.matches('[data-escrita]')&&!e.target.checked)e.target.closest('label').remove();marcar();});marcar();
    const textoOtro=form.querySelector('.calif-otro-texto'),otroChip=form.querySelector('.calif-otro input');
    const contar=()=>{form.querySelector('.calif-otro-cuenta').textContent=[...textoOtro.value].length+'/20';};
    textoOtro.addEventListener('input',contar);
    const escritasMarcadas=()=>[...form.querySelectorAll('[data-escrita]:checked')].map(x=>x.value);
    // Lo escrito en «Otro» pasa a ser una etiqueta más; «Otro» vuelve a quedar libre.
    const agregarEscrita=()=>{
      const t=textoOtro.value.replace(/\s+/g,' ').trim();
      if([...t].length<3){mensaje.textContent='Escribe tu etiqueta.';textoOtro.focus();return false;}
      if([...t].length>20){mensaje.textContent='La etiqueta puede tener hasta 20 caracteres.';textoOtro.focus();return false;}
      mensaje.textContent='';
      if(!escritasMarcadas().some(x=>normalEtiquetaEscrita(x)===normalEtiquetaEscrita(t)))otroChip.closest('label').insertAdjacentHTML('beforebegin',chipEscrita(t));
      textoOtro.value='';contar();otroChip.checked=false;marcar();
      return true;
    };
    // El campo se cierra al agregar: el foco pasa a la etiqueta recién puesta.
    const agregarYEnfocar=()=>{if(agregarEscrita()){const ultima=[...form.querySelectorAll('[data-escrita]')].pop();if(ultima)ultima.focus();}};
    form.querySelector('[data-agregar]').onclick=agregarYEnfocar;
    textoOtro.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();agregarYEnfocar();}});
    form.querySelector('[data-cancelar]').onclick=closeModal;
    form.querySelector('[data-cambiar]').onclick=()=>pedirNombre(elegido);
    const enviar=async(pasos,aviso,ofrecerRamo=false)=>{
      const botones=[...form.querySelectorAll('button')];
      if(botones.some(b=>b.disabled)||!vigente())return;
      botones.forEach(b=>{b.disabled=true;});mensaje.textContent='';
      try{
        for(const [rpc,args] of pasos){const {error}=await supabaseClient.rpc(rpc,args);if(error)throw error;}
        closeModal();
        if(vigente()&&currentRamoId===r.id){
          await renderDocenteRamo(r);
          if(vigente()&&!document.getElementById('modal').classList.contains('open')){
            const volver=document.querySelector('#ramo-profe button')||document.getElementById('calif-accion');
            enfocarEnHoja(volver);
          }
        }
        const ofrecida=ofrecerRamo&&vigente()&&typeof ofrecerCalificarRamoTrasProfesor==='function'&&await ofrecerCalificarRamoTrasProfesor(r);
        if(!ofrecida&&vigente())showToast(aviso);
      }catch(error){
        if(form.isConnected){mensaje.textContent=errorCalificacion(error);botones.forEach(b=>{b.disabled=false;});}
      }
    };
    const borrar=form.querySelector('[data-borrar]');
    if(borrar)borrar.onclick=()=>showConfirm('¿Borrar tu calificación?','Se quitarán tus estrellas y etiquetas.',()=>enviar([['profesor_calificacion_borrar',contexto]],'Borramos tu calificación'),{label:'Borrar',danger:true,focusCancel:true});
    form.onsubmit=e=>{
      e.preventDefault();
      if(!estrellas()){mensaje.textContent='Elige de 1 a 5 estrellas.';form.querySelector('input[name=calif-estrellas]').focus();return;}
      if(otroChip.checked&&!agregarEscrita())return;
      const etiquetas=[...form.querySelectorAll('input[name=calif-etiqueta]:checked:not([data-escrita])')].map(x=>x.value).filter(x=>x!=='otro'),otros=escritasMarcadas();
      if(etiquetas.length+otros.length>3){mensaje.textContent='Elige hasta 3 etiquetas.';return;}
      // Primero queda dicho quién es (si cambió) y después la calificación, que es para él.
      const pasos=nombreProfesorNormal(elegido)===nombreProfesorNormal(mio)?[]:[['profesor_docente_informar',{...contexto,p_nombre:elegido}]];
      pasos.push(['profesor_calificar',payloadCalificacion(contexto,estrellas(),etiquetas,otros)]);
      enviar(pasos,'Tu calificación quedó guardada',true);
    };
    enfocarEnHoja(form.querySelector(mia?'input[name=calif-estrellas]:checked':'input[name=calif-estrellas]'));
  };
  // Editar una calificación propia, con su profesor ya dicho, va directo a las estrellas.
  if(mio&&Number(calif.mi_estrellas)){pasoCalificar(mio);openModal();}
  else pasoNombre();
}
