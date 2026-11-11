
// Clases › Perfil. Lo mismo que ve el estudiante al tocar «Ver perfil» en un
// anuncio, pero solo si el profesor lo activó: parte apagado.
async function renderPerfilProfesor(caja){
  if(!caja)return;
  const cuenta=sesionProfesorClase();
  const ficha=await perfilProfesorActual();
  if(cuenta!==sesionProfesorClase())return;
  if(!caja.isConnected)return;
  const p=ficha.ok?await perfilConDirectorio(ficha.perfil):null;
  if(!caja.isConnected||cuenta!==sesionProfesorClase())return;
  if(!p){caja.innerHTML='';return;}
  if(!tienePerfilCompleto(p)){caja.innerHTML='<p class="profesor-info">Muy pronto vas a poder armar tu perfil público acá.</p>';return;}
  const v=c=>esc(p[c]==null?'':p[c]);
  const tipo=p.tipo_perfil||'profesor',unis=p.universidades||[],directorio=!!p.directorioDisponible;
  const opcion=(tipoInput,nombre,valor,texto,marcada)=>`<label class="profesor-linea-opcion"><input type="${tipoInput}" name="${nombre}" value="${valor}"${marcada?' checked':''}><span>${texto}</span></label>`;
  caja.innerHTML=`<div data-directorio-metricas-propias></div><h3 class="perfil-editar-titulo">Editar perfil</h3>
    <div class="pfe"><form class="profesor-form profesor-perfil pfe-form" novalidate>
      <section class="pfe-seccion"><h4>Quién eres</h4>
        <fieldset class="profesor-linea"><legend class="modal-label">Eres</legend><div class="profesor-linea-opciones">
          ${TIPOS_PERFIL.map(([val,txt])=>opcion('radio','pf-tipo',val,txt,tipo===val)).join('')}
        </div></fieldset>
        <label class="modal-label" for="pf-nombre">Nombre público</label><input id="pf-nombre" type="text" maxlength="100" autocomplete="organization" value="${v('nombre_publico')}">
        <div data-perfil-logo></div>
        <label class="modal-label" for="pf-descripcion">Descripción</label><textarea id="pf-descripcion" maxlength="1500" placeholder="Quién eres, cómo haces tus clases y qué experiencia tienes.">${v('presentacion')}</textarea>
      </section>
      <section class="pfe-seccion"><h4>Cómo te contactan</h4>
        ${directorio?contactoPerfilHTML(p):''}
        <div data-pf-instagram><label class="modal-label" for="pf-instagram">Instagram · opcional</label><div class="pfe-campo">${iconoCanalPerfil('instagram')}<input id="pf-instagram" type="text" maxlength="31" autocomplete="off" autocapitalize="none" placeholder="@tu_usuario" value="${p.instagram?'@'+v('instagram'):''}"></div></div>
        <label class="modal-label" for="pf-web">Sitio web · opcional</label><div class="pfe-campo">${iconoCanalPerfil('web')}<input id="pf-web" type="url" maxlength="160" autocomplete="url" autocapitalize="none" placeholder="https://" value="${v('sitio_web')}"></div>
      </section>
      <section class="pfe-seccion"><h4>Qué enseñas</h4>
        <fieldset class="profesor-linea"><legend class="modal-label">Universidades</legend><div class="profesor-linea-opciones">
          ${UNIVERSIDADES_PERFIL.map(([val,txt])=>opcion('checkbox','pf-uni',val,txt,unis.includes(val))).join('')}
        </div><p class="directorio-error" data-error-directorio="universidades" role="alert"></p></fieldset>
        <label class="modal-label" for="pf-ramos-buscar">Ramos</label>
        <div class="profesor-ramos" id="pf-ramos-elegidos" aria-live="polite"></div>
        <div class="profesor-ramos-buscar"><input id="pf-ramos-buscar" type="search" autocomplete="off" autocapitalize="characters" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pf-ramos-resultados" placeholder="Busca por sigla o nombre, ej. MAT1620">
          <ul class="profesor-ramos-resultados" id="pf-ramos-resultados" role="listbox" hidden></ul></div>
        <input id="pf-ramos" type="hidden" value="${esc((p.ramos_siglas||[]).join(', '))}">
        ${directorio?`<fieldset class="profesor-linea"><legend class="modal-label">Qué ofreces</legend><div class="profesor-linea-opciones">
          ${CATEGORIAS_DIRECTORIO.map(([val,txt])=>opcion('checkbox','pf-categoria',val,txt,(p.categorias||[]).includes(val))).join('')}</div><p class="directorio-error" data-error-directorio="categorias" role="alert"></p></fieldset>`:''}
      </section>
      ${directorio?`<section class="pfe-seccion"><h4>Tu tarjeta</h4>${tarjetaPerfilCamposHTML(p)}</section>`:''}
      <section class="pfe-seccion"><h4>Dónde apareces</h4>
        <label class="pfe-interruptor"><span><b>En mis anuncios</b><small>Los estudiantes verán «Ver perfil» en cada anuncio publicado. Tu correo de cuenta nunca se comparte.</small></span><input id="pf-publico" type="checkbox" role="switch"${p.perfil_publico?' checked':''}></label>
        ${directorio?`<label class="pfe-interruptor"><span><b>En Clases particulares</b><small>Te encuentran por tu tarjeta. Es independiente de tus anuncios.</small></span><input id="pf-directorio" type="checkbox" role="switch"${p.en_directorio?' checked':''}></label>`:'<p class="profesor-info">El directorio todavía no está disponible. Puedes guardar tu perfil y tus anuncios como siempre.</p>'}
      </section>
      <div class="pfe-guardar"><p class="profesor-estado" role="status" aria-live="polite"></p><button class="accion-principal" type="submit">Guardar perfil</button></div>
    </form>
    <aside class="pfe-previa" aria-label="Vista previa de tu perfil"></aside></div>`;
  renderLogoProfesor(caja.querySelector('[data-perfil-logo]'));
  const form=caja.querySelector('form'),estado=form.querySelector('.profesor-estado'),campo=id=>form.querySelector('#pf-'+id);
  campo('instagram').addEventListener('input',e=>{e.target.value=textoInstagramEscrito(e.target.value);});
  if(directorio){enlazarContactoPerfil(form,p);enlazarColorPerfil(form);mostrarMetricasDirectorio(caja.querySelector('[data-directorio-metricas-propias]'));}
  const nombresRamos=activarBuscadorRamosPerfil(form);
  enlazarPreviaPerfil(form,p,caja.querySelector('.pfe-previa'),nombresRamos);
  let guardando=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(guardando)return;
    const entrada={tipo_perfil:(form.querySelector('input[name=pf-tipo]:checked')||{}).value,nombre_publico:campo('nombre').value,
      presentacion:campo('descripcion').value,instagram:campo('instagram').value,sitio_web:campo('web').value,
      universidades:[...form.querySelectorAll('input[name=pf-uni]:checked')].map(x=>x.value),ramos:campo('ramos').value,perfil_publico:campo('publico').checked};
    if(p.directorioDisponible)Object.assign(entrada,entradaDirectorioFormulario(form));
    const valido=validarPerfilProfesor(entrada);
    if(!valido.ok){
      estado.textContent=valido.campo==='contacto'?'':valido.error;
      mostrarErrorPerfilDirectorio(form,valido);
      const c=campo({nombre:'nombre',presentacion:'descripcion',instagram:'instagram',web:'web',ramos:'ramos-buscar'}[valido.campo]);
      if(c)c.focus();
      return;
    }
    mostrarErrorPerfilDirectorio(form,null);
    guardando=true;const boton=form.querySelector('button[type=submit]');boton.disabled=true;estado.textContent='Guardando…';
    const r=await guardarPerfilProfesor(entrada);
    guardando=false;boton.disabled=false;
    if(!caja.isConnected)return;
    estado.textContent=r.ok?(entrada.en_directorio?'Perfil guardado. Aparecerás en Clases particulares mientras tu perfil esté aprobado.':r.perfil.perfil_publico?'Perfil guardado. Ya se ve en tus anuncios publicados.':'Perfil guardado. Por ahora no se muestra en tus anuncios.'):r.error;
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

const CANALES_PERFIL=[['whatsapp','WhatsApp'],['instagram','Instagram'],['email','Correo'],['','Ninguno']];
const COLORES_TARJETA_PERFIL=['#0d7a6b','#1f5fbf','#6b4fbb','#b3362e','#a8660b','#2b2b30'];
function contactoPerfilHTML(p){
  const tipo=['whatsapp','instagram','email'].includes(p.contacto_tipo)?p.contacto_tipo:'';
  return `<fieldset class="profesor-linea pfe-contacto"><legend class="modal-label">Contacto directo</legend><div class="pfe-canales">
      ${CANALES_PERFIL.map(([val,txt])=>`<label class="pfe-canal"><input type="radio" name="pf-contacto-tipo" value="${val}"${tipo===val?' checked':''}>${val?iconoCanalPerfil(val):''}<span>${txt}</span></label>`).join('')}
    </div></fieldset>
    <div data-pf-contacto-caja><label class="modal-label" for="pf-contacto" id="pf-contacto-etiqueta">Contacto</label><div class="pfe-campo" data-pf-contacto-icono></div>
    <p class="directorio-error" id="pf-contacto-error" data-error-directorio="contacto" role="alert"></p><p class="profesor-info" id="pf-contacto-ayuda"></p></div>`;
}
function tarjetaPerfilCamposHTML(p){
  const color=colorTarjetaDirectorio(p.color_tarjeta);
  return `<label class="modal-label" for="pf-etiqueta">Etiqueta</label><input id="pf-etiqueta" type="text" maxlength="28" value="${esc(p.etiqueta||'')}" placeholder="Clases particulares" aria-describedby="pf-etiqueta-error"><p id="pf-etiqueta-error" class="directorio-error" data-error-directorio="etiqueta" role="alert"></p>
    <p class="modal-label" id="pf-color-titulo">Color</p><div class="pfe-colores" role="group" aria-labelledby="pf-color-titulo">
      ${COLORES_TARJETA_PERFIL.map(c=>`<button type="button" class="pfe-color" data-pf-color="${c}" style="--pfe-color:${c}" aria-label="Color ${c}" aria-pressed="${c===color}"></button>`).join('')}
      <label class="pfe-color pfe-color-propio" title="Otro color"><span class="adm-oculto">Otro color</span><input id="pf-color" type="color" value="${color}"></label>
    </div><p class="directorio-error" data-error-directorio="color" role="alert"></p>`;
}
function entradaDirectorioFormulario(form){
  const v=id=>form.querySelector('#pf-'+id),canal=form.querySelector('[name="pf-contacto-tipo"]:checked')?.value||'';
  const valor=String(v('contacto')?.value||'').trim();
  const contacto=canal==='whatsapp'?whatsappPerfilEscrito(valor).trim():valor;
  return {categorias:[...form.querySelectorAll('[name="pf-categoria"]:checked')].map(x=>x.value),
    etiqueta:v('etiqueta').value,color_tarjeta:v('color').value,contacto_tipo:canal,
    contacto_valor:canal&&contacto!==String(PREFIJO_CONTACTO_CLASE[canal]||'').trim()?contacto:'',en_directorio:v('directorio').checked};
}
function whatsappPerfilEscrito(texto,{completar=true}={}){
  const t=String(texto||'');
  if(!telefonoPerfilEscrito(t))return t;
  // Agregar el código recién al salir del campo conserva el cursor mientras
  // se escribe un celular sin prefijo. El guardado también lo completa.
  return textoWhatsappEscrito(completar&&!t.trimStart().startsWith('+')&&/^9\d{8}$/.test(t.replace(/\D/g,''))?'+56 '+t:t);
}
function enlazarContactoPerfil(form,p){
  const caja=form.querySelector('[data-pf-contacto-caja]'),icono=form.querySelector('[data-pf-contacto-icono]');
  const etiqueta=form.querySelector('#pf-contacto-etiqueta'),ayuda=form.querySelector('#pf-contacto-ayuda'),error=form.querySelector('#pf-contacto-error');
  const instagram=form.querySelector('[data-pf-instagram]');
  const textos={whatsapp:['Tu WhatsApp','+56 9 1234 5678','tel','Se abre un chat contigo desde tu perfil.'],instagram:['Tu Instagram','@tu_usuario','text','Se abre tu perfil de Instagram.'],email:['Tu correo','nombre@correo.cl','email','Solo se obtiene al tocar «Enviar correo».']};
  const escrito={[p.contacto_tipo]:p.contacto_tipo==='whatsapp'?whatsappPerfilEscrito(p.contacto_valor):p.contacto_valor||''};
  const canal=()=>form.querySelector('[name="pf-contacto-tipo"]:checked')?.value||'';
  let mostrado=null;
  const mostrar=()=>{
    const c=canal();
    if(mostrado&&form.querySelector('#pf-contacto'))escrito[mostrado]=form.querySelector('#pf-contacto').value;
    mostrado=c;caja.hidden=!c;if(instagram)instagram.hidden=c==='instagram';error.textContent='';
    if(!c){icono.innerHTML='';return;}
    const [titulo,ejemplo,modo,texto]=textos[c];
    etiqueta.textContent=titulo;ayuda.textContent=texto;
    icono.innerHTML=`${iconoCanalPerfil(c)}<input id="pf-contacto" type="${c==='email'?'email':'text'}" inputmode="${modo}" maxlength="160" autocomplete="off" autocapitalize="none" placeholder="${esc(ejemplo)}" aria-describedby="pf-contacto-ayuda pf-contacto-error">`;
    const entrada=icono.querySelector('input');
    entrada.value=escrito[c]||PREFIJO_CONTACTO_CLASE[c]||'';
    formatearAlEscribir(entrada,t=>c==='whatsapp'?whatsappPerfilEscrito(t,{completar:false}):c==='instagram'?textoInstagramEscrito(t):t);
    entrada.addEventListener('input',()=>{error.textContent='';entrada.removeAttribute('aria-invalid');});
    if(c==='whatsapp')entrada.addEventListener('blur',()=>{
      entrada.value=whatsappPerfilEscrito(entrada.value);
      const valor=entrada.value.trim(),invalido=!!(valor&&valor!=='+56'&&!whatsappValidoPerfil(valor));
      error.textContent=invalido?ERROR_WHATSAPP_CHILE:'';
      if(invalido)entrada.setAttribute('aria-invalid','true');
      else entrada.removeAttribute('aria-invalid');
    });
  };
  form.querySelectorAll('[name="pf-contacto-tipo"]').forEach(r=>r.addEventListener('change',mostrar));
  mostrar();
}
function enlazarColorPerfil(form){
  const entrada=form.querySelector('#pf-color'),botones=[...form.querySelectorAll('[data-pf-color]')];
  const marcar=()=>botones.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pfColor===entrada.value.toLowerCase())));
  botones.forEach(b=>b.addEventListener('click',()=>{entrada.value=b.dataset.pfColor;entrada.dispatchEvent(new Event('input',{bubbles:true}));}));
  entrada.addEventListener('input',marcar);marcar();
}
// Busca en el mismo índice que el anuncio. Las siglas se guardan igual que
// antes, separadas por coma, en el campo oculto. Devuelve cómo leer los nombres.
const MAX_RAMOS_PERFIL=20;
function activarBuscadorRamosPerfil(form){
  const buscar=form.querySelector('#pf-ramos-buscar'),oculto=form.querySelector('#pf-ramos'),lista=form.querySelector('#pf-ramos-resultados'),chips=form.querySelector('#pf-ramos-elegidos');
  let indice={};
  const leer=()=>String(oculto.value||'').split(',').map(x=>siglaAnuncio(x)).filter(Boolean);
  const pintar=()=>{
    const siglas=leer();
    chips.innerHTML=siglas.map(sg=>`<span class="profesor-ramo-chip"><b>${esc(sg)}</b>${indice[sg]?`<span>${esc(indice[sg])}</span>`:''}<button type="button" data-quitar-sigla="${esc(sg)}" aria-label="Quitar ${esc(sg)}">×</button></span>`).join('');
    chips.querySelectorAll('[data-quitar-sigla]').forEach(b=>b.addEventListener('click',()=>escribir(leer().filter(x=>x!==b.dataset.quitarSigla))));
    const lleno=siglas.length>=MAX_RAMOS_PERFIL;buscar.disabled=lleno;
    buscar.placeholder=lleno?'Llegaste a 20 ramos. Quita uno para agregar otro.':'Busca por sigla o nombre, ej. MAT1620';
  };
  const escribir=siglas=>{oculto.value=siglas.join(', ');pintar();oculto.dispatchEvent(new Event('input',{bubbles:true}));};
  let activa=-1;
  const limpiarActiva=()=>{activa=-1;buscar.removeAttribute('aria-activedescendant');};
  const cerrar=()=>{lista.hidden=true;lista.innerHTML='';buscar.setAttribute('aria-expanded','false');limpiarActiva();};
  const elegir=sg=>{const actuales=leer();if(sg&&!actuales.includes(sg)&&actuales.length<MAX_RAMOS_PERFIL)escribir([...actuales,sg]);buscar.value='';cerrar();buscar.focus();};
  const mostrar=()=>{
    const res=buscarRamosParaClase(indice,buscar.value,leer());
    if(!res.length){cerrar();return;}
    limpiarActiva();
    lista.innerHTML=res.map((x,i)=>`<li role="option" id="pf-ramo-op-${i}" aria-selected="false" data-sigla="${esc(x.sigla)}"><b>${esc(x.sigla)}</b><span>${esc(x.nombre)}</span></li>`).join('');
    lista.hidden=false;buscar.setAttribute('aria-expanded','true');
  };
  // Sin universidad elegida se busca en todas: el profesor todavía no la marcó.
  const reindexar=()=>{
    const elegidas=[...form.querySelectorAll('[name="pf-uni"]:checked')].map(x=>x.value);
    const tenants=elegidas.length?elegidas:UNIVERSIDADES_PERFIL.map(([val])=>val);
    indice=Object.assign({},...tenants.map(nombresRamosParaClases).reverse());
    pintar();if(buscar.value)mostrar();
    oculto.dispatchEvent(new Event('input',{bubbles:true}));
  };
  buscar.addEventListener('input',mostrar);
  buscar.addEventListener('keydown',e=>{
    if(e.isComposing)return;
    if(e.key==='Enter'){
      e.preventDefault();
      if(!lista.hidden)elegir(lista.children[Math.max(activa,0)].dataset.sigla);
    }else if(e.key==='Escape'&&!lista.hidden){
      e.preventDefault();e.stopPropagation();cerrar();
    }else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      if(lista.hidden)mostrar();
      if(lista.hidden)return;
      e.preventDefault();
      const opciones=lista.children,paso=e.key==='ArrowDown'?1:-1;
      const anterior=opciones[activa];
      if(anterior)anterior.setAttribute('aria-selected','false');
      activa=(activa<0&&paso<0?opciones.length-1:Math.min(opciones.length-1,Math.max(0,activa+paso)));
      const opcion=opciones[activa];
      opcion.setAttribute('aria-selected','true');
      buscar.setAttribute('aria-activedescendant',opcion.id);
      opcion.scrollIntoView({block:'nearest'});
    }
  });
  lista.addEventListener('mousedown',e=>{if(e.target.closest('[data-sigla]'))e.preventDefault();});
  lista.addEventListener('click',e=>{
    const opcion=e.target.closest('[data-sigla]');
    if(opcion)elegir(opcion.dataset.sigla);
  });
  buscar.addEventListener('blur',cerrar);
  form.querySelectorAll('[name="pf-uni"]').forEach(u=>u.addEventListener('change',reindexar));
  reindexar();
  if(typeof cargarCursosUC==='function')cargarCursosUC().then(ok=>{if(ok&&form.isConnected)reindexar();}).catch(()=>{});
  return ()=>indice;
}
function mostrarErrorPerfilDirectorio(form,valido){
  form.querySelectorAll('[data-error-directorio]').forEach(el=>{el.textContent=valido&&el.dataset.errorDirectorio===valido.campo?valido.error:'';});
  form.querySelectorAll('[aria-invalid="true"]').forEach(el=>el.removeAttribute('aria-invalid'));
  if(!valido)return;
  const id={etiqueta:'etiqueta',color:'color',contacto:'contacto',universidades:'ramos-buscar'}[valido.campo];
  const campo=id?form.querySelector('#pf-'+id):form.querySelector('[name="pf-categoria"]');
  if(campo){campo.setAttribute('aria-invalid','true');campo.focus();}
}
let quitarLogoPreviaDirectorio=null;
// La vista previa muestra la tarjeta y lo que se abre al tocarla, con lo que
// está escrito aunque no se haya guardado. Va inerte: no abre contactos ni
// registra métricas.
function enlazarPreviaPerfil(form,p,caja,nombresRamos){
  let logo='',vista=p.directorioDisponible?'tarjeta':'ficha';
  const datos=()=>{
    const q=id=>form.querySelector('#pf-'+id),insta=String(q('instagram').value||'').trim().replace(/^@/,'');
    return {...p,...(p.directorioDisponible?entradaDirectorioFormulario(form):{}),nombre_publico:q('nombre').value,presentacion:q('descripcion').value,
      tipo_perfil:(form.querySelector('input[name=pf-tipo]:checked')||{}).value,instagram:insta,sitio_web:q('web').value.trim(),
      universidades:[...form.querySelectorAll('input[name=pf-uni]:checked')].map(x=>x.value),
      ramos_siglas:q('ramos').value.split(/[,\s]+/).filter(Boolean),logo_path:logo?'previa':null};
  };
  const pintar=()=>{
    if(!caja.isConnected)return;
    const d=datos(),conTarjeta=!!p.directorioDisponible;
    caja.innerHTML=`<div class="pfe-previa-cabeza"><h4>Vista previa</h4>${conTarjeta?`<div class="pfe-seg" role="group" aria-label="Qué mostrar"><button type="button" data-pfe-vista="tarjeta" aria-pressed="${vista==='tarjeta'}">Tarjeta</button><button type="button" data-pfe-vista="ficha" aria-pressed="${vista==='ficha'}">Al tocarla</button></div>`:''}</div>
      ${vista==='tarjeta'?`<button type="button" class="pfe-previa-tarjeta" data-pfe-vista="ficha" aria-label="Ver lo que se abre al tocar tu tarjeta">${tarjetaDirectorioHTML({...d,logo_path:null},{previa:true,logoURL:logo})}</button><p class="pfe-previa-pista">Toca la tarjeta para ver lo que se abre.</p>`
        :`<div class="pfe-ficha" tabindex="0" role="region" aria-label="Ficha de vista previa">${perfilPublicoHTML(d,null,nombresRamos())}</div>`}`;
    caja.querySelectorAll('.pfe-ficha a,.pfe-ficha button').forEach(accion=>{accion.inert=true;});
    const marco=caja.querySelector('[data-directorio-logo]');if(marco&&logo)marco.innerHTML=imgLogoClase(logo);
    caja.querySelectorAll('[data-pfe-vista]').forEach(b=>b.addEventListener('click',()=>{vista=b.dataset.pfeVista;pintar();caja.querySelector(`.pfe-seg [data-pfe-vista="${vista}"]`)?.focus();}));
  };
  form.addEventListener('input',pintar);form.addEventListener('change',pintar);pintar();
  if(quitarLogoPreviaDirectorio)quitarLogoPreviaDirectorio();
  const cambio=e=>{logo=typeof e.detail==='string'?e.detail:'';pintar();};
  document.addEventListener('gradehub:logo-profesor',cambio);
  quitarLogoPreviaDirectorio=()=>document.removeEventListener('gradehub:logo-profesor',cambio);
  if(p.logo_path||p.logo_aprobado_path)urlFlyerClase(p.logo_path||p.logo_aprobado_path).then(url=>{logo=url;pintar();});
}
