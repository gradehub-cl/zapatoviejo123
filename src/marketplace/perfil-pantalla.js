
// Clases › Perfil. Lo mismo que ve el estudiante al tocar «Ver perfil» en un
// anuncio, pero solo si el profesor lo activó: parte apagado.
async function renderPerfilProfesor(caja){
  if(!caja)return;
  const ficha=await perfilProfesorActual();
  if(!caja.isConnected)return;
  const p=ficha.ok?ficha.perfil:null;
  if(!p){caja.innerHTML='';return;}
  if(!tienePerfilCompleto(p)){caja.innerHTML='<p class="profesor-info">Muy pronto vas a poder armar tu perfil público acá.</p>';return;}
  const v=c=>esc(p[c]==null?'':p[c]);
  const tipo=p.tipo_perfil||'profesor',unis=p.universidades||[];
  caja.innerHTML=`<form class="profesor-form profesor-perfil" novalidate>
      <fieldset class="profesor-linea"><legend class="modal-label">Eres</legend><div class="profesor-linea-opciones">
        ${TIPOS_PERFIL.map(([val,txt])=>`<label class="profesor-linea-opcion"><input type="radio" name="pf-tipo" value="${val}"${tipo===val?' checked':''}><span>${txt}</span></label>`).join('')}
      </div></fieldset>
      <label class="modal-label" for="pf-nombre">Nombre público</label><input id="pf-nombre" type="text" maxlength="100" autocomplete="organization" value="${v('nombre_publico')}">
      <label class="modal-label" for="pf-descripcion">Descripción</label><textarea id="pf-descripcion" maxlength="1500" placeholder="Quién eres, cómo haces tus clases y qué experiencia tienes.">${v('presentacion')}</textarea>
      <label class="modal-label" for="pf-instagram">Instagram · opcional</label><input id="pf-instagram" type="text" maxlength="31" autocomplete="off" autocapitalize="none" placeholder="@salvaramos" value="${p.instagram?'@'+v('instagram'):''}">
      <label class="modal-label" for="pf-web">Sitio web · opcional</label><input id="pf-web" type="url" maxlength="160" autocomplete="url" autocapitalize="none" placeholder="https://" value="${v('sitio_web')}">
      <fieldset class="profesor-linea"><legend class="modal-label">Universidades donde enseñas · opcional</legend><div class="profesor-linea-opciones">
        ${UNIVERSIDADES_PERFIL.map(([val,txt])=>`<label class="profesor-linea-opcion"><input type="checkbox" name="pf-uni" value="${val}"${unis.includes(val)?' checked':''}><span>${txt}</span></label>`).join('')}
      </div></fieldset>
      <label class="modal-label" for="pf-ramos">Ramos que enseñas · opcional</label><input id="pf-ramos" type="text" maxlength="500" autocomplete="off" autocapitalize="characters" placeholder="MAT1620, FIS1514" aria-describedby="pf-ramos-ayuda" value="${esc((p.ramos_siglas||[]).join(', '))}">
      <p class="profesor-info" id="pf-ramos-ayuda">Las siglas separadas por coma, hasta 20.</p>
      <label class="profesor-perfil-publico"><input id="pf-publico" type="checkbox"${p.perfil_publico?' checked':''}><span><b>Mostrar mi perfil en mis anuncios</b>Los estudiantes verán «Ver perfil» en cada anuncio publicado, con esto y tus otros anuncios. Nunca tu correo.</span></label>
      <button class="accion-principal" type="submit">Guardar perfil</button>
      <p class="profesor-estado" role="status" aria-live="polite"></p>
    </form>`;
  const form=caja.querySelector('form'),estado=form.querySelector('.profesor-estado'),campo=id=>form.querySelector('#pf-'+id);
  campo('instagram').addEventListener('input',e=>{e.target.value=textoInstagramEscrito(e.target.value);});
  let guardando=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(guardando)return;
    const entrada={tipo_perfil:(form.querySelector('input[name=pf-tipo]:checked')||{}).value,nombre_publico:campo('nombre').value,
      presentacion:campo('descripcion').value,instagram:campo('instagram').value,sitio_web:campo('web').value,
      universidades:[...form.querySelectorAll('input[name=pf-uni]:checked')].map(x=>x.value),ramos:campo('ramos').value,perfil_publico:campo('publico').checked};
    const valido=validarPerfilProfesor(entrada);
    if(!valido.ok){estado.textContent=valido.error;const c=campo({nombre:'nombre',presentacion:'descripcion',instagram:'instagram',web:'web',ramos:'ramos'}[valido.campo]);if(c)c.focus();return;}
    guardando=true;const boton=form.querySelector('button[type=submit]');boton.disabled=true;estado.textContent='Guardando…';
    const r=await guardarPerfilProfesor(entrada);
    guardando=false;boton.disabled=false;
    if(!caja.isConnected)return;
    estado.textContent=r.ok?(r.perfil.perfil_publico?'Perfil guardado. Ya se ve en tus anuncios publicados.':'Perfil guardado. Por ahora no se muestra en tus anuncios.'):r.error;
  });
}

// El logo es de la ficha, no del anuncio: el mismo bloque aparece en el
// formulario y en la página de Clases, y cambiarlo en uno cambia el otro.
async function renderLogoProfesor(caja){
  if(!caja)return;
  const ficha=await perfilProfesorActual();
  if(!caja.isConnected)return;
  const perfil=ficha.ok?ficha.perfil:null,estado=estadoLogoProfesor(perfil);
  if(estado==='no-disponible'){caja.innerHTML='';return;}
  const textos={
    'sin-logo':'Sale a la derecha en todos tus anuncios publicados.',
    'en-revision':perfil.logo_aprobado_path?'Tu logo nuevo está en revisión. Mientras tanto se sigue mostrando el anterior.':'Tu logo está en revisión. Aparecerá en tus anuncios cuando lo aprobemos.',
    'aprobado':'Se muestra en todos tus anuncios publicados.',
  };
  caja.innerHTML=`<div class="profesor-logo">
      <div class="profesor-logo-img" aria-hidden="true"></div>
      <div class="profesor-logo-texto"><strong>Tu logo${estado==='en-revision'?' · en revisión':''}</strong><span>${textos[estado]}</span></div>
    </div>
    <div class="profesor-logo-acciones">
      <label class="btn-cancel profesor-logo-subir">${estado==='sin-logo'?'Subir logo':'Cambiar logo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
      ${estado==='sin-logo'?'':'<button type="button" class="btn-cancel profesor-logo-quitar">Quitar</button>'}
    </div>
    <p class="profesor-estado" role="status" aria-live="polite"></p>`;
  const aviso=caja.querySelector('.profesor-estado');
  const ruta=perfil.logo_path||perfil.logo_aprobado_path;
  const avisarLogo=url=>{try{document.dispatchEvent(new CustomEvent('gradehub:logo-profesor',{detail:url||''}));}catch(e){}};
  if(ruta)urlFlyerClase(ruta).then(url=>{const img=caja.querySelector('.profesor-logo-img');if(url&&img&&img.isConnected)img.innerHTML=imgLogoClase(url);avisarLogo(url);});
  else avisarLogo('');
  caja.querySelector('input[type=file]').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    aviso.textContent='Subiendo logo…';
    const r=await subirLogoProfesor(file);
    if(!caja.isConnected)return;
    if(!r.ok){aviso.textContent=r.error;e.target.value='';return;}
    renderLogoProfesor(caja);
  });
  const quitar=caja.querySelector('.profesor-logo-quitar');
  if(quitar)quitar.addEventListener('click',async()=>{
    aviso.textContent='Quitando logo…';
    const r=await quitarLogoProfesor();
    if(!caja.isConnected)return;
    if(!r.ok){aviso.textContent=r.error;return;}
    renderLogoProfesor(caja);
  });
}

// La tarjeta de ramo de la vista previa es la misma de Inicio (mismas clases,
// mismo tamaño), con una raya en vez de nota: la nota es de cada estudiante.
function filaRamoVistaPrevia(extra){
  return `<div class="ramo-row has-progress tiene-clase-apoyo${extra}" style="--ramo-tint:var(--fg3);--ramo-progress-scale:.3" aria-hidden="true">
      <div class="ramo-band"></div>
      <div class="ramo-info"><span class="ramo-name">Tu ramo</span><div class="ramo-meta"><span class="ramo-sigla">Sigla</span><span class="ramo-meta-text">30% evaluado</span></div></div>
      <div class="ramo-grade-action"><div class="ramo-nota vista-sin-nota">—</div><span class="chevron-r">›</span></div>
      <span class="ramo-progress-track"><span class="ramo-progress-fill"></span></span></div>`;
}
// La campaña vive aparte del anuncio (anuncio_campanas): el tope es del
// profesor y el anuncio lo lee cualquiera. Sin el SQL de campañas, `falta`
// avisa que no se pudo guardar sin tratarlo como un error de la persona.
// Solo ausencia explícita de esquema: jamás degradar por red, RLS o validación.
function sqlClasesDesactualizado(error){
  return !!error&&['42883','42703','PGRST202','PGRST204','42P01','PGRST205'].includes(error.code);
}
function faltaTablaCampana(error){return sqlClasesDesactualizado(error);}
const compatibilidadSqlClases={campanas:false,cobros:false};
const AVISO_SQL_CLASES='SQL de campañas pendiente. Se usa el modo anterior: los cobros solo se guardan para la publicación actual y los días y el tope pueden no estar guardados. Aplica los tres archivos SQL antes de publicar o renovar campañas.';
async function leerCampanaClase(anuncioId,{diagnostico=false,estricto=false}={}){
  if(!supabaseClient||!anuncioId)return null;
  try{
    const {data,error}=await supabaseClient.from('anuncio_campanas').select('dias,inicio,tope_clp').eq('anuncio_id',anuncioId).maybeSingle();
    if(error){if(estricto)throw error;if(faltaTablaCampana(error)){compatibilidadSqlClases.campanas=true;return diagnostico?{sqlAnterior:true}:null;}console.warn('No se pudo leer la campaña:',error.code||'',error.message||error);return null;}
    compatibilidadSqlClases.campanas=false;return data||null;
  }catch(e){if(estricto)throw e;return null;}
}
async function guardarCampanaClase(anuncioId,datos){
  if(!supabaseClient||!anuncioId)return {ok:false,error:'no pudimos guardar la campaña.'};
  // No se usa upsert: PostgREST lo traduce a ON CONFLICT DO UPDATE SET
  // anuncio_id=…, y el cliente no tiene UPDATE sobre anuncio_id (a propósito:
  // una campaña no se muda de anuncio). Postgres exige ese permiso aunque no
  // haya conflicto, así que fallaba SIEMPRE con 42501 y el anuncio no se podía
  // enviar a revisión. Primero se actualiza; si no había fila, se inserta.
  try{
    const tabla=()=>supabaseClient.from('anuncio_campanas');
    let {data,error}=await tabla().update(datos).eq('anuncio_id',anuncioId).select('anuncio_id');
    if(!error&&!(Array.isArray(data)&&data.length)){
      ({error}=await tabla().insert({anuncio_id:anuncioId,...datos}));
      // Otra pestaña la creó entre medio: ahora sí hay fila que actualizar.
      if(error&&error.code==='23505'){
        ({data,error}=await tabla().update(datos).eq('anuncio_id',anuncioId).select('anuncio_id'));
        if(!error&&!(Array.isArray(data)&&data.length))error={code:'SIN_FILA',message:'la campaña no quedó guardada'};
      }
    }
    if(!error){compatibilidadSqlClases.campanas=false;return {ok:true};}
    if(faltaTablaCampana(error)){compatibilidadSqlClases.campanas=true;return {ok:false,falta:true,error:'el servidor aún no guarda los días y el tope; se usará el proceso de revisión anterior.'};}
    console.warn('No se guardó la campaña:',error.code||'',error.message||error);
    return {ok:false,error:'no pudimos guardar los días y el tope. Intenta de nuevo.'};
  }catch(e){return {ok:false,error:'no pudimos guardar los días y el tope. Intenta de nuevo.'};}
}
