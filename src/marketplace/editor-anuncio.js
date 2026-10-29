
function renderBorradorProfesor(raiz,anuncio,{pendiente=false,admin=false,profesor=null,volverAdmin=null}={}){
  let id=anuncio&&anuncio.id||null,flyerActual=anuncio&&anuncio.flyer_path||null;
  const valor=(campo,defecto='')=>esc(anuncio&&anuncio[campo]!=null?anuncio[campo]:defecto);
  const tipoContactoInicial=anuncio&&PREFIJO_CONTACTO_CLASE[anuncio.contacto_tipo]!==undefined?anuncio.contacto_tipo:'whatsapp';
  const elegir=(opciones,actual)=>opciones.map(([clave,texto])=>`<option value="${clave}"${actual===clave?' selected':''}>${texto}</option>`).join('');
  // Siempre hay cómo salir sin guardar ni enviar (Lucas, 2026-10-24).
  raiz.innerHTML='<div class="profesor-hig profesor-hig-editor">'+
    `<button type="button" class="profesor-volver" id="pr-volver"><span aria-hidden="true">‹</span> ${admin?'Anuncios':pendiente?'Volver':'Tus anuncios'}</button>`+
    cabeceraProfesorHTML(admin?`Editando el anuncio de ${profesor&&profesor.nombre||'este profesor'}`:id?'Edita tu borrador.':'Prepara tu clase.',
    admin?'Corrige el anuncio y revisa cómo se verá. El profesor recibirá un aviso al guardar.':pendiente?'Puedes guardar tu anuncio mientras revisamos tu postulación. Nadie lo verá todavía.':'Nada se publica al guardar. Completa tu clase, revisa el público y luego envíala a revisión.','',raiz.id==='modal-content'?'modal-titulo':'profesor-titulo',admin?'ADMINISTRACIÓN':undefined)+`
    ${anuncio&&anuncio.comentario_revision?`<div class="clase-comentario-revision"><strong>Cambios pedidos en la revisión</strong><p>${esc(anuncio.comentario_revision)}</p></div>`:''}
    <form class="profesor-form" id="profesor-borrador">
      <!-- Campos y vista previa van juntos para que la vista previa, sticky en
           computador, se detenga donde termina esta fila y no baje a los botones. -->
      <div class="profesor-form-cuerpo">
      <div class="profesor-form-campos">
      <details class="profesor-seccion" open><summary><h3 id="pr-seccion-titulo">${esMaterialClase(anuncio)?'1. Tu material':'1. Tu clase'}</h3></summary><div class="profesor-seccion-cuerpo">
      ${!admin&&(capasColumnasClase>=4||esMaterialClase(anuncio))?`<fieldset class="profesor-tipo" id="pr-tipo-caja"><legend class="modal-label">Qué publicas</legend>
        <div class="profesor-tipo-opciones">${TIPOS_ANUNCIO.map(([v,t])=>`<label><input type="radio" name="pr-tipo" value="${v}"${(esMaterialClase(anuncio)?'material':'clase')===v?' checked':''}><span>${t}</span></label>`).join('')}</div>
        <p class="profesor-info" id="pr-tipo-ayuda">${esMaterialClase(anuncio)?TEXTO_TIPO_ANUNCIO.material:TEXTO_TIPO_ANUNCIO.clase}</p></fieldset>`:''}
      <label class="modal-label" for="pr-titulo">Título del anuncio</label><input id="pr-titulo" type="text" minlength="5" maxlength="90" required value="${valor('titulo')}">
      <label class="modal-label" for="pr-descripcion">Descripción</label><textarea id="pr-descripcion" minlength="20" maxlength="1500" required placeholder="Qué van a trabajar, cómo son tus clases y tu experiencia con el ramo.">${valor('descripcion')}</textarea>
      <label class="modal-label" for="pr-precio" id="pr-precio-etiqueta">${esMaterialClase(anuncio)?'Precio del material':'Precio por clase'}</label><input id="pr-precio" type="text" inputmode="numeric" autocomplete="off" required placeholder="$15.000" aria-describedby="pr-precio-ayuda" value="${esc(textoPesosEscrito(anuncio&&anuncio.precio_clp))}"><p class="profesor-info" id="pr-precio-ayuda">${esMaterialClase(anuncio)?'Si el material es gratis':'Si la clase es gratis'}, pon $0: se mostrará como "Gratis".</p>
      <div class="profesor-solo-clase" id="pr-solo-clase"${esMaterialClase(anuncio)?' hidden':''}>
      <label class="modal-label" for="pr-pack">Clases por pack · opcional</label><input id="pr-pack" type="number" inputmode="numeric" min="${MIN_PACK_CLASES}" max="${MAX_PACK_CLASES}" step="1" placeholder="Ej. 4" aria-describedby="pr-pack-ayuda" value="${valor('pack_clases')}"><p class="profesor-info" id="pr-pack-ayuda">Si vendes un pack, pon cuántas clases trae. El precio de arriba sigue siendo por clase: mostramos el total del pack.</p>
      <label class="modal-label" for="pr-modalidad">Formato · opcional</label><select id="pr-modalidad">${elegir([['','No indicar'],...MODALIDADES_CLASE,['otra','Otra…']],anuncio&&anuncio.modalidad||'')}</select>
      <input id="pr-modalidad-otra" type="text" maxlength="40" aria-label="Escribe el formato" placeholder="Ej. grupos de hasta 3" value="${valor('modalidad_otra')}" ${anuncio&&anuncio.modalidad==='otra'?'':'hidden'}>
      <label class="modal-label" for="pr-ubicacion">Dónde · opcional</label><select id="pr-ubicacion">${elegir([['','No indicar'],...UBICACIONES_CLASE,['otra','Otra…']],anuncio&&anuncio.ubicacion||'')}</select>
      <input id="pr-ubicacion-otra" type="text" maxlength="40" aria-label="Escribe dónde es la clase" placeholder="Ej. en tu casa o en la biblioteca" value="${valor('ubicacion_otra')}" ${anuncio&&anuncio.ubicacion==='otra'?'':'hidden'}>
      </div>
      <div class="profesor-detalles" id="pr-detalles-caja">
        <span class="modal-label">Detalles · opcional</span>
        <p class="profesor-info">Lo que quieras destacar, como "Duración: 90 minutos" o "Incluye: guía de ejercicios". Hasta ${MAX_DETALLES_CLASE}.</p>
        <div id="pr-detalles"></div>
        <button class="btn-cancel profesor-detalle-agregar" id="pr-agregar-detalle" type="button">Agregar un detalle</button>
      </div>
      <fieldset class="profesor-linea" id="pr-linea-caja">
        <legend class="modal-label">Bajo el título · hasta ${MAX_LINEA_CLASE}</legend>
        <p class="profesor-info">Es lo primero que lee el estudiante en Inicio, junto a su ramo. Elige lo que más ayuda a decidir; el resto aparece cuando abre tu clase.</p>
        <div class="profesor-linea-opciones" id="pr-linea"></div>
      </fieldset>
      <div class="profesor-contacto-tipo" id="pr-contacto-tipo-caja" hidden>
        <label class="modal-label" for="pr-contacto-tipo">Cómo te contactarán</label><select id="pr-contacto-tipo">${elegir(CONTACTOS_CLASE,tipoContactoInicial)}</select>
        <p class="profesor-info">Como la clase es gratis, puedes llevar a tu Instagram o a un link de inscripción en vez de WhatsApp.</p>
      </div>
      <label class="modal-label" for="pr-contacto" id="pr-contacto-etiqueta">Tu WhatsApp</label><input id="pr-contacto" type="text" minlength="3" maxlength="160" required autocomplete="off" aria-describedby="pr-contacto-error pr-contacto-ayuda" placeholder="${esc(EJEMPLO_CONTACTO_CLASE[tipoContactoInicial])}" value="${esc(anuncio&&anuncio.contacto_valor!=null?anuncio.contacto_valor:PREFIJO_CONTACTO_CLASE[tipoContactoInicial])}">
      <p id="pr-contacto-error" role="alert" hidden style="margin:6px 0 0;font-size:0.8125rem;color:var(--red);"></p>
      <p class="profesor-info" id="pr-contacto-ayuda"></p>
      ${admin?'<p class="profesor-info">El flyer y el logo se muestran en la vista previa. Desde acá no se cambian.</p><p class="profesor-info" id="pr-imagenes-aviso" role="status"></p>':`<label class="modal-label" for="pr-flyer">Flyer · opcional</label><input id="pr-flyer" type="file" accept="image/jpeg,image/png,image/webp" ${pendiente?'disabled':''}><p class="profesor-info">${pendiente?'Podrás subir el flyer cuando aprobemos tu postulación.':'JPG, PNG o WebP · máximo 5 MB. Primero se guarda el borrador y después se sube la imagen.'}</p>
      <button class="btn-cancel" id="pr-quitar-flyer" type="button" ${flyerActual?'':'hidden'}>Quitar flyer guardado</button>
      <div id="pr-logo"></div>`}
      <div class="profesor-flyer-preview" hidden><img alt="Vista previa del flyer"></div>
      </div></details>
      <details class="profesor-seccion" open><summary><h3>2. Público</h3></summary><div class="profesor-seccion-cuerpo">
      <label class="modal-label" for="pr-tenant">Universidad</label><select id="pr-tenant">${elegir([['uc','UC'],['fen','FEN'],['uai','UAI'],['uandes','UAndes']],anuncio&&anuncio.tenant||S.tenant)}</select>
      <label class="modal-label" for="pr-siglas-buscar">Ramo de tu clase</label>
      <div class="profesor-ramos" id="pr-ramos-elegidos" aria-live="polite"></div>
      <div class="profesor-ramos-buscar">
        <input id="pr-siglas-buscar" type="search" autocomplete="off" placeholder="Busca por nombre o sigla, ej. Cálculo II" aria-describedby="pr-siglas-ayuda" aria-controls="pr-ramos-resultados">
        <ul class="profesor-ramos-resultados" id="pr-ramos-resultados" role="listbox" hidden></ul>
      </div>
      <p class="profesor-info" id="pr-siglas-ayuda">Si tu ramo tiene dos siglas, como Dinámica ICE1514 y FIS1514, puedes elegir las dos. Otro ramo va en otro anuncio. Si no aparece, escribe su sigla completa.</p>
      <input id="pr-siglas" type="hidden" value="${esc(anuncio&&Array.isArray(anuncio.ramos_siglas)?anuncio.ramos_siglas.join(', '):'')}">
      ${admin&&anuncio&&!anuncio.criterios?'<p class="profesor-info">Este anuncio tiene público general. Se conserva mientras no cambies el promedio o el mínimo evaluado.</p>':''}
      <label class="modal-label" for="pr-promedio">Promedio menor a</label><input id="pr-promedio" type="number" min="1.1" max="7" step="0.1" required value="${esc(anuncio&&anuncio.criterios?anuncio.criterios.promedioMenorA:5)}">
      <label class="modal-label" for="pr-avance">Mínimo evaluado · %</label><input id="pr-avance" type="number" min="0" max="99" step="1" required value="${esc(anuncio&&anuncio.criterios?anuncio.criterios.avanceMinimo:20)}">
      <p class="profesor-info">GradeHub calcula el público sin mostrarte notas ni identidades.</p>
      </div></details>
      ${admin?'':`<details class="profesor-seccion" open><summary><h3>3. Tu campaña</h3></summary><div class="profesor-seccion-cuerpo">
      <div class="profesor-campana">
        <div class="profesor-campana-fechas">
          <div><label class="modal-label" for="pr-inicio">Empieza · opcional</label><input id="pr-inicio" type="date" min="${hoyChileClase()}"></div>
          <div><label class="modal-label" for="pr-dias">Días</label><input id="pr-dias" type="number" inputmode="numeric" min="1" max="${MAX_DIAS_CAMPANA}" step="1" required value="${DIAS_CAMPANA_POR_OMISION}"></div>
          <div><label class="modal-label" for="pr-fin">Termina</label><input id="pr-fin" type="date" min="${hoyChileClase()}"></div>
        </div>
        <p class="profesor-info">Sin fecha de inicio, parte apenas la aprobemos. Puedes elegir los días o la fecha de término: el otro se ajusta solo.</p>
        <label class="modal-label" for="pr-tope">Tope · lo máximo que pagarías</label><input id="pr-tope" type="text" inputmode="numeric" autocomplete="off" required placeholder="${esc(textoPesosEscrito(TOPE_CAMPANA_POR_OMISION))}" value="${esc(textoPesosEscrito(TOPE_CAMPANA_POR_OMISION))}">
        <p class="profesor-info">Cuesta ${pesosClase(TARIFA_CAMPANA.dia)} por día publicada y, por persona, ${pesosClase(TARIFA_CAMPANA.vista)} si la ve, ${pesosClase(TARIFA_CAMPANA.apertura)} si la abre y ${pesosClase(TARIFA_CAMPANA.contacto)} si te contacta. Cada persona cuenta una vez. Al llegar al tope deja de mostrarse: nunca pagas más que eso. El pago se coordina con GradeHub antes de publicar.</p>
        <p class="profesor-campana-resumen" id="pr-campana-resumen" aria-live="polite"></p><button type="button" class="btn-cancel" id="pr-reintentar-campana" hidden>Reintentar carga de campaña</button>
      </div>
      </div></details>`}
      </div>
      <section class="profesor-form-vista" aria-labelledby="pr-vista-titulo">
      <div class="vista-cabeza"><h3 id="pr-vista-titulo">${admin?'3':'4'}. Así la van a ver</h3></div>
      <!-- Solo la vista de celular. La de computador era la pantalla entera de
           Inicio achicada a la columna del formulario, y quedaba ilegible; el
           banner dice lo mismo en los dos, y la mayoría entra desde el iPhone. -->
      <div class="profesor-vista-previa modo-celular" id="pr-vista">
        <div class="vista-solo-cel"><p class="profesor-info">En Inicio, junto al ramo del estudiante:</p>
        <div class="vista-celular">${filaRamoVistaPrevia('')}<aside class="clase-apoyo vista-anuncio"></aside></div></div>
        <p class="profesor-info">La nota del ramo es la de cada estudiante: acá va una raya porque cambia para cada uno.</p>
        <p class="profesor-info">Al abrirla, y en el catálogo de clases, con tu flyer si subiste uno:</p>
        <div class="vista-catalogo" aria-hidden="true"></div>
      </div>
      </section>
      </div>
      <div class="profesor-form-acciones">
      <div class="modal-btns"><button class="${admin?'accion-principal':pendiente?'btn-confirm':'btn-cancel'}" id="pr-guardar" type="button">${admin?'Guardar cambios':'Guardar borrador'}</button>${admin||pendiente?'':'<button class="btn-confirm" id="pr-enviar" type="button">Enviar a revisión</button>'}</div>
      <p class="profesor-estado" role="status" aria-live="polite">${admin?'Los cambios se guardan en este anuncio, sin cambiar su publicación ni su campaña.':id?'Borrador recuperado. Puedes seguir editándolo.':'Completa la clase para guardar el primer borrador.'}</p>
      </div>
    </form></div>`;
  const form=raiz.querySelector('#profesor-borrador'),campo=id=>form.querySelector('#pr-'+id),estado=form.querySelector('.profesor-estado');
  let procesando=false,campanaLista=admin||!id;
  // Vista previa en vivo: el mismo contenido que verá el estudiante en Inicio,
  // armado con lo que el profesor lleva escrito y su logo.
  const vista=form.querySelector('#pr-vista');
  let logoVista='';
  const valorCampo=id=>{const el=campo(id);return el?String(el.value||''):'';};
  // Clase o material (2026-10-23). Sin el selector (SQL sin aplicar), clase.
  const tipoElegido=()=>{if(admin)return esMaterialClase(anuncio)?'material':'clase';const r=typeof form.querySelector==='function'&&form.querySelector('input[name="pr-tipo"]:checked');return r&&r.value==='material'?'material':'clase';};
  // Qué datos van bajo el título. Se guarda como claves, en el orden en que se
  // muestran; si coincide con lo de siempre se guarda null, como los anuncios
  // que ya existían.
  const lineaElegida=new Set(Array.isArray(anuncio&&anuncio.linea_datos)?anuncio.linea_datos:LINEA_CLASE_POR_OMISION);
  const cajaLinea=campo('linea');let firmaLinea='';
  const borradorEnVivo=()=>({...(admin?{descuento_gradehub_pct:anuncio.descuento_gradehub_pct,codigo_descuento:anuncio.codigo_descuento}:{}),tipo:tipoElegido(),titulo:valorCampo('titulo').trim(),precio_clp:pesosDeTexto(valorCampo('precio')),pack_clases:valorCampo('pack').trim()===''?null:Number(valorCampo('pack')),
    modalidad:valorCampo('modalidad'),modalidad_otra:valorCampo('modalidad-otra').trim(),
    ubicacion:valorCampo('ubicacion'),ubicacion_otra:valorCampo('ubicacion-otra').trim(),
    detalles:leerDetalles(),linea_datos:[...lineaElegida]});
  const lineaParaGuardar=b=>{
    const claves=opcionesLineaClase(b).map(o=>o.clave);
    const elegidas=claves.filter(c=>lineaElegida.has(c)),omision=claves.filter(c=>LINEA_CLASE_POR_OMISION.includes(c));
    return elegidas.join()===omision.join()?null:elegidas;
  };
  const pintarLinea=b=>{
    if(!cajaLinea||typeof cajaLinea.querySelectorAll!=='function')return;
    const ops=opcionesLineaClase(b),firma=JSON.stringify(ops.map(o=>[o.clave,o.nombre,o.texto]));
    // Sin nada que elegir (un material sin detalles), no se muestra la pregunta.
    const cajaPregunta=campo('linea-caja');if(cajaPregunta)cajaPregunta.hidden=!ops.length;
    // Solo se rehace si cambiaron las opciones: marcar una casilla no le quita
    // el foco.
    if(firma!==firmaLinea){
      firmaLinea=firma;
      cajaLinea.innerHTML=ops.map(o=>`<label class="profesor-linea-opcion"><input type="checkbox" value="${esc(o.clave)}"><span><b>${esc(o.nombre)}</b> ${esc(o.texto)}</span></label>`).join('');
    }
    const marcadas=ops.filter(o=>lineaElegida.has(o.clave)).length;
    cajaLinea.querySelectorAll('input').forEach(i=>{i.checked=lineaElegida.has(i.value);i.disabled=!i.checked&&marcadas>=MAX_LINEA_CLASE;});
  };
  // Una casilla dispara input y después change, y el formulario repinta con
  // los dos: la elección se anota en el primero para que el repintado no
  // devuelva la casilla a como estaba.
  const anotarLinea=e=>{
    const i=e.target;if(!i||i.type!=='checkbox')return;
    if(i.checked)lineaElegida.add(i.value);else lineaElegida.delete(i.value);
  };
  if(cajaLinea){cajaLinea.addEventListener('input',anotarLinea);cajaLinea.addEventListener('change',anotarLinea);}
  const actualizarVista=()=>{
    const borrador=borradorEnVivo();
    pintarLinea(borrador);
    if(!vista||typeof vista.querySelectorAll!=='function')return;
    pintarVistaCatalogo(borrador);
    vista.querySelectorAll('.vista-anuncio').forEach(el=>{el.innerHTML=contenidoRecomendacionClase(borrador,{logoUrl:logoVista,vistaPrevia:true});});
    const sigla=valorCampo('siglas').split(',').map(x=>siglaAnuncio(x)).filter(Boolean)[0]||'';
    const nombre=sigla?(nombresRamosParaClases(valorCampo('tenant')||S.tenant)[sigla]||sigla):'Tu ramo';
    vista.querySelectorAll('.ramo-name').forEach(el=>{el.textContent=nombre;});
    vista.querySelectorAll('.ramo-sigla').forEach(el=>{el.textContent=sigla||'Sigla';});
  };
  // La tarjeta del catálogo, abierta, con el flyer que eligió (el guardado o el
  // que acaba de escoger, antes de subirlo). El botón no lleva a ninguna parte.
  let flyerVista='';
  const pintarVistaCatalogo=borrador=>{
    const caja=vista.querySelector('.vista-catalogo');
    if(!caja)return;
    const elegidas=valorCampo('siglas').split(',').map(x=>siglaAnuncio(x)).filter(Boolean);
    const siglasVista=elegidas.length?elegidas:['SIGLA'];
    const nombres=siglasVista.map(sg=>nombresRamosParaClases(valorCampo('tenant')||S.tenant)[sg]).filter(Boolean);
    caja.innerHTML=tarjetaCatalogoClase({...borrador,id:'vista-previa',titulo:borrador.titulo||'Tu clase',
      descripcion:valorCampo('descripcion').trim()||'Acá va la descripción de tu clase.',ramos_siglas:siglasVista,nombres_ramos:nombres,
      ...(t=>({contacto_tipo:t,contacto_valor:(v=>v&&v!==PREFIJO_CONTACTO_CLASE[t].trim()?v:EJEMPLO_CONTACTO_CLASE[t])(valorCampo('contacto').trim())}))(contactosPermitidosClase(pesosDeTexto(valorCampo('precio')),tipoElegido()).includes(valorCampo('contacto-tipo'))?valorCampo('contacto-tipo'):'whatsapp'),flyer_path:flyerVista?'vista-previa':null},{abierta:true});
    const flyer=caja.querySelector('.catalogo-clase-flyer');
    if(flyer){flyer.removeAttribute('data-flyer');flyer.hidden=false;flyer.innerHTML=`<img src="${esc(flyerVista)}" alt="">`;}
    if(logoVista){const cabeza=caja.querySelector('.catalogo-clase-cabeza');if(cabeza)cabeza.insertAdjacentHTML('beforeend',`<div class="catalogo-clase-logo">${imgLogoClase(logoVista)}</div>`);}
    caja.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.setAttribute('tabindex','-1');});
  };
  form.addEventListener('input',actualizarVista);form.addEventListener('change',actualizarVista);
  // El logo vive en la ficha: se pide una vez y se actualiza cuando lo cambian.
  if(!admin&&typeof document!=='undefined'&&document.addEventListener)document.addEventListener('gradehub:logo-profesor',e=>{
    if(!form.isConnected)return;logoVista=e.detail||'';actualizarVista();
  });
  campoPesos(campo('precio'));
  // La campaña: días y fecha de término se ajustan entre sí, y el resumen
  // traduce el tope a algo concreto.
  const inicioC=campo('inicio'),diasC=campo('dias'),finC=campo('fin'),topeC=campo('tope'),resumenC=campo('campana-resumen');
  campoPesos(topeC);
  const baseCampana=()=>valorCampo('inicio')||hoyChileClase();
  const ajustarFin=()=>{const d=Number(valorCampo('dias'));if(finC&&Number.isSafeInteger(d)&&d>0)finC.value=sumarDiasFechaClase(baseCampana(),d-1);};
  const ajustarDias=()=>{const n=diasEntreFechasClase(baseCampana(),valorCampo('fin'));if(diasC&&Number.isFinite(n)&&n>=0)diasC.value=String(n+1);};
  const resumirCampana=()=>{
    if(!resumenC)return;
    const d=Number(valorCampo('dias')),tope=pesosDeTexto(valorCampo('tope'));
    if(!Number.isSafeInteger(d)||d<1||!Number.isSafeInteger(tope)){resumenC.textContent='';return;}
    const porDias=d*TARIFA_CAMPANA.dia,queda=tope-porDias;
    resumenC.textContent=queda<=0
      ?`Tu tope alcanza para ${Math.floor(tope/TARIFA_CAMPANA.dia)} días: la clase dejará de mostrarse antes de terminar.`
      :`${d} ${d===1?'día':'días'} suman ${pesosClase(porDias)}. Te quedan ${pesosClase(queda)} para personas: por ejemplo ${Math.floor(queda/TARIFA_CAMPANA.contacto)} contactos, o ${new Intl.NumberFormat('es-CL').format(Math.floor(queda/TARIFA_CAMPANA.vista))} personas que la ven.`;
  };
  if(inicioC)inicioC.addEventListener('input',()=>{ajustarFin();resumirCampana();});
  if(diasC)diasC.addEventListener('input',()=>{ajustarFin();resumirCampana();});
  if(finC)finC.addEventListener('input',()=>{ajustarDias();resumirCampana();});
  if(topeC)topeC.addEventListener('input',resumirCampana);
  ajustarFin();resumirCampana();
  // No reemplazar una campaña existente por los valores por omisión si falla
  // su lectura. El guardado se habilita solo después de recuperarla.
  const reintentarCampana=campo('reintentar-campana');
  const cargarCampanaGuardada=async()=>{
    campanaLista=false;
    const controles=[diasC,inicioC,finC,topeC,campo('guardar'),campo('enviar')].filter(Boolean);
    controles.forEach(c=>c.disabled=true);
    if(reintentarCampana)reintentarCampana.hidden=true;
    estado.textContent='Recuperando los días y el tope de tu campaña…';
    try{
      const c=await leerCampanaClase(id,{estricto:true});
      if(!form.isConnected)return;
      if(c){
        if(diasC)diasC.value=String(c.dias);
        if(inicioC)inicioC.value=c.inicio&&c.inicio>=hoyChileClase()?c.inicio:'';
        if(topeC)topeC.value=textoPesosEscrito(c.tope_clp);
      }
      ajustarFin();resumirCampana();campanaLista=true;
      controles.forEach(c=>c.disabled=false);
      estado.textContent='Borrador recuperado. Puedes seguir editándolo.';
    }catch(e){
      if(!form.isConnected)return;
      estado.textContent='No pudimos recuperar tu campaña. Reintenta antes de guardar para conservar sus días y su tope.';
      if(reintentarCampana)reintentarCampana.hidden=false;
    }
  };
  if(reintentarCampana)reintentarCampana.addEventListener('click',cargarCampanaGuardada);
  if(id&&!admin)cargarCampanaGuardada();
  // "Otra…" abre su casilla de texto; cualquier otra opción la esconde.
  [['modalidad','modalidad-otra'],['ubicacion','ubicacion-otra']].forEach(([sel,texto])=>{
    const selector=campo(sel),caja=campo(texto);
    if(!selector||!caja)return;
    selector.addEventListener('change',()=>{caja.hidden=selector.value!=='otra';if(!caja.hidden&&typeof caja.focus==='function')caja.focus();});
  });
  const listaDetalles=campo('detalles'),agregarDetalle=campo('agregar-detalle');
  const filaDetalle=(d={})=>{
    if(!listaDetalles||typeof document==='undefined'||!document.createElement)return;
    const fila=document.createElement('div');fila.className='profesor-detalle';
    fila.innerHTML=`<input type="text" class="detalle-etiqueta" maxlength="${MAX_ETIQUETA_DETALLE}" placeholder="Duración" aria-label="Nombre del detalle" value="${esc(d.etiqueta||'')}">
      <input type="text" class="detalle-valor" maxlength="${MAX_VALOR_DETALLE}" placeholder="90 minutos" aria-label="Qué dice el detalle" value="${esc(d.valor||'')}">
      <button type="button" class="profesor-detalle-quitar" aria-label="Quitar este detalle">Quitar</button>`;
    fila.querySelector('.profesor-detalle-quitar').addEventListener('click',()=>{fila.remove();refrescarDetalles();actualizarVista();});
    listaDetalles.appendChild(fila);refrescarDetalles();
  };
  const refrescarDetalles=()=>{if(agregarDetalle&&listaDetalles&&listaDetalles.children)agregarDetalle.hidden=listaDetalles.children.length>=MAX_DETALLES_CLASE;};
  if(agregarDetalle)agregarDetalle.addEventListener('click',()=>{filaDetalle();const ultima=listaDetalles&&listaDetalles.lastElementChild;ultima&&ultima.querySelector('input').focus();});
  const leerDetalles=()=>listaDetalles&&typeof listaDetalles.querySelectorAll==='function'
    ?[...listaDetalles.querySelectorAll('.profesor-detalle')].map(f=>({etiqueta:f.querySelector('.detalle-etiqueta').value,valor:f.querySelector('.detalle-valor').value})):[];
  detallesClase(anuncio).forEach(d=>filaDetalle(d));
  actualizarVista();
  activarBuscadorRamosClase(form,campo);
  const cajaLogo=campo('logo');
  if(cajaLogo&&!pendiente&&!admin)renderLogoProfesor(cajaLogo);
  const avisarImagen=texto=>{const aviso=campo('imagenes-aviso');if(aviso&&aviso.isConnected)aviso.textContent+=(aviso.textContent?' ':'')+texto;};
  if(admin&&profesor&&profesor.logo_aprobado_path)urlFlyerClase(profesor.logo_aprobado_path).then(url=>{if(form.isConnected){logoVista=url||'';actualizarVista();if(!url)avisarImagen('El logo guardado no está disponible en esta vista. Se conserva en el anuncio.');}}).catch(()=>avisarImagen('No pudimos cargar el logo guardado. Se conserva en el anuncio.'));
  // WhatsApp parte con "+56 9 " escrito y se ordena con sus espacios. Si la
  // clase es gratis aparece el selector con Instagram y link de inscripción;
  // si deja de ser gratis, vuelve a WhatsApp.
  const contacto=campo('contacto'),tipoContacto=campo('contacto-tipo'),cajaTipo=campo('contacto-tipo-caja');
  const tipoActual=()=>{const t=tipoContacto?tipoContacto.value:'whatsapp';return contactosPermitidosClase(pesosDeTexto(valorCampo('precio')),tipoElegido()).includes(t)?t:'whatsapp';};
  formatearAlEscribir(contacto,texto=>{const t=tipoActual();return t==='whatsapp'?textoWhatsappEscrito(texto):t==='instagram'?textoInstagramEscrito(texto):texto;});
  const ayudaContacto={whatsapp:'Tu número no aparece en el anuncio. El estudiante te escribe con un botón y el chat parte con «Hola, vi tu clase … en GradeHub. ¿Me puedes dar más información?».',
    instagram:'El botón del anuncio abre tu perfil de Instagram.',enlace:'El botón «Inscribirme» abre este link en una pestaña nueva.'};
  const etiquetaContacto={whatsapp:'Tu WhatsApp',instagram:'Tu Instagram',enlace:'Link de inscripción'};
  let tipoMostrado=null;const escritoPorCanal={};
  let firmaOpciones='';
  const refrescarContacto=()=>{
    // El selector aparece cuando hay más de un canal: clase gratis o material.
    const opciones=opcionesContactoClase(pesosDeTexto(valorCampo('precio')),tipoElegido());
    if(cajaTipo)cajaTipo.hidden=opciones.length<2;
    const firma=opciones.map(o=>o.join(':')).join();
    if(tipoContacto&&firma!==firmaOpciones){
      const elegido=tipoContacto.value;firmaOpciones=firma;
      tipoContacto.innerHTML=opciones.map(([clave,texto])=>`<option value="${clave}"${clave===elegido?' selected':''}>${texto}</option>`).join('');
      if(!opciones.some(o=>o[0]===elegido))tipoContacto.value='whatsapp';
    }
    const t=tipoActual();
    const material=tipoElegido()==='material';
    etiquetaContacto.enlace=material?'Link para conseguirlo':'Link de inscripción';
    ayudaContacto.enlace=material?'El botón «Conseguir el material» abre este link en una pestaña nueva.':'El botón «Inscribirme» abre este link en una pestaña nueva.';
    if(t===tipoMostrado){
      const etiqueta=campo('contacto-etiqueta');if(etiqueta)etiqueta.textContent=etiquetaContacto[t];
      const ayuda=campo('contacto-ayuda');if(ayuda)ayuda.textContent=ayudaContacto[t];
      return;
    }
    if(t===tipoMostrado)return;
    // Cada canal guarda lo suyo: al pasar de WhatsApp a Instagram el número
    // no queda bajo "Tu Instagram", y al volver reaparece tal como estaba.
    if(tipoMostrado!==null&&contacto){
      escritoPorCanal[tipoMostrado]=String(contacto.value||'');
      contacto.value=escritoPorCanal[t]||PREFIJO_CONTACTO_CLASE[t];
    }
    tipoMostrado=t;
    if(contacto){contacto.placeholder=EJEMPLO_CONTACTO_CLASE[t];if(typeof contacto.setAttribute==='function')contacto.setAttribute('inputmode',t==='whatsapp'?'tel':t==='enlace'?'url':'text');}
    const etiqueta=campo('contacto-etiqueta');if(etiqueta)etiqueta.textContent=etiquetaContacto[t];
    const ayuda=campo('contacto-ayuda');if(ayuda)ayuda.textContent=ayudaContacto[t];
  };
  if(tipoContacto&&typeof tipoContacto.addEventListener==='function')tipoContacto.addEventListener('change',refrescarContacto);
  if(campo('precio')&&typeof campo('precio').addEventListener==='function')campo('precio').addEventListener('input',refrescarContacto);
  refrescarContacto();
  // Clase o material: un material no tiene formato, lugar ni pack, y su precio
  // es uno solo. Lo escondido no se borra: si vuelve a clase, sigue ahí.
  const aplicarTipo=()=>{
    const material=tipoElegido()==='material';
    const soloClase=campo('solo-clase');if(soloClase)soloClase.hidden=material;
    const titulo=campo('seccion-titulo');if(titulo)titulo.textContent=material?'1. Tu material':'1. Tu clase';
    const precio=campo('precio-etiqueta');if(precio)precio.textContent=material?'Precio del material':'Precio por clase';
    const ayudaPrecio=campo('precio-ayuda');if(ayudaPrecio)ayudaPrecio.textContent=`${material?'Si el material es gratis':'Si la clase es gratis'}, pon $0: se mostrará como "Gratis".`;
    const ayudaTipo=campo('tipo-ayuda');if(ayudaTipo)ayudaTipo.textContent=TEXTO_TIPO_ANUNCIO[material?'material':'clase'];
    const desc=campo('descripcion');if(desc)desc.placeholder=material
      ?'Qué trae (guías, apuntes, ejercicios resueltos), para qué parte del ramo y cómo se entrega.'
      :'Qué van a trabajar, cómo son tus clases y tu experiencia con el ramo.';
    refrescarContacto();actualizarVista();
  };
  if(typeof form.querySelectorAll==='function')form.querySelectorAll('input[name="pr-tipo"]').forEach(r=>r.addEventListener('change',aplicarTipo));
  aplicarTipo();
  const preview=form.querySelector('.profesor-flyer-preview');
  if(flyerActual)urlFlyerClase(flyerActual).then(url=>{if(url&&preview&&preview.isConnected){preview.querySelector('img').src=url;preview.hidden=false;flyerVista=url;actualizarVista();}else if(admin)avisarImagen('El flyer guardado no está disponible en esta vista. Se conserva en el anuncio.');}).catch(()=>{if(admin)avisarImagen('No pudimos cargar el flyer guardado. Se conserva en el anuncio.');});
  if(!admin)campo('flyer').addEventListener('change',()=>{
    const file=campo('flyer').files&&campo('flyer').files[0],validacion=validarFlyerClase(file);
    if(!validacion.ok){campo('flyer').value='';estado.textContent=validacion.error;return;}
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{if(!preview.isConnected)return;preview.querySelector('img').src=String(reader.result||'');preview.hidden=false;flyerVista=String(reader.result||'');actualizarVista();estado.textContent='Flyer listo para subir cuando guardes.';};
    reader.onerror=()=>{estado.textContent='No pudimos leer ese flyer. Elige otra imagen.';};
    reader.readAsDataURL(file);
  });
  if(!admin)form.querySelector('#pr-quitar-flyer').addEventListener('click',async()=>{
    if(!id||procesando)return;
    procesando=true;
    estado.textContent='Quitando flyer…';
    const resultado=await quitarFlyerClase(id);procesando=false;
    estado.textContent=resultado.ok?resultado.aviso||'Flyer quitado del borrador.':resultado.error;
    if(resultado.ok){flyerActual=null;campo('flyer').value='';preview.hidden=true;form.querySelector('#pr-quitar-flyer').hidden=true;flyerVista='';actualizarVista();}
  });
  // Un campo pendiente dentro de una sección cerrada no se puede mostrar:
  // se abre su sección antes de avisar o de llevar el foco ahí.
  const abrirSeccionDe=el=>{const d=el&&typeof el.closest==='function'?el.closest('details'):null;if(d)d.open=true;return el;};
  const enfocar=el=>{abrirSeccionDe(el);if(el&&typeof el.focus==='function')el.focus();};
  // Un número mal escrito se dice bajo su casilla, en rojo, y la pantalla se
  // lleva hasta ahí: el aviso de abajo del formulario solo no se ve en móvil.
  const errorContacto=campo('contacto-error');
  const marcarContacto=mensaje=>{
    const input=campo('contacto');
    if(errorContacto){errorContacto.textContent=mensaje;errorContacto.hidden=false;}
    if(input&&typeof input.setAttribute==='function')input.setAttribute('aria-invalid','true');
    enfocar(input);
    if(input&&typeof input.scrollIntoView==='function')input.scrollIntoView({block:'center'});
  };
  const limpiarContacto=()=>{
    if(errorContacto&&!errorContacto.hidden){errorContacto.hidden=true;errorContacto.textContent='';}
    const input=campo('contacto');if(input&&typeof input.removeAttribute==='function')input.removeAttribute('aria-invalid');
  };
  if(contacto&&typeof contacto.addEventListener==='function')contacto.addEventListener('input',limpiarContacto);
  const datosDelEditor=()=>({tipo:tipoElegido(),tenant:campo('tenant').value,ramos_siglas:campo('siglas').value.split(',').map(s=>s.trim()),
      criterios:{promedioMenorA:Number(campo('promedio').value),avanceMinimo:Number(campo('avance').value)},
      titulo:campo('titulo').value,descripcion:campo('descripcion').value,precio_clp:pesosDeTexto(campo('precio').value),
      pack_clases:campo('pack')?campo('pack').value.trim():'',
      modalidad:campo('modalidad').value,ubicacion:campo('ubicacion').value,
      modalidad_otra:campo('modalidad-otra')?campo('modalidad-otra').value:'',ubicacion_otra:campo('ubicacion-otra')?campo('ubicacion-otra').value:'',
      detalles:leerDetalles(),linea_datos:lineaParaGuardar(borradorEnVivo()),
      contacto_tipo:tipoActual(),contacto_valor:campo('contacto').value});
  const inicialesAdmin=admin?datosDelEditor():null;
  const procesar=async enviar=>{
    if(enviar&&(pendiente||admin))return;
    if(procesando||!campanaLista)return;
    if(typeof form.querySelectorAll==='function')[...form.querySelectorAll(':invalid')].forEach(abrirSeccionDe);
    if(!form.reportValidity())return;
    const file=!admin&&campo('flyer').files&&campo('flyer').files[0],validacion=validarFlyerClase(file);
    if(!validacion.ok){estado.textContent=validacion.error;campo('flyer').focus();return;}
    const campana=admin?{ok:true}:validarCampanaClase({dias:Number(valorCampo('dias')),inicio:valorCampo('inicio'),tope_clp:pesosDeTexto(valorCampo('tope'))});
    if(!campana.ok){estado.textContent=campana.error;enfocar(campo(campana.campo));return;}
    const datos=datosDelEditor();
    if(admin){
      const validado=validarBorradorClase(datos);
      if(!validado.ok){
        estado.textContent=validado.error;
        if(validado.campo==='contacto_valor')marcarContacto(validado.error);
        else {const mapa={ramos_siglas:'siglas-buscar',criterios:'promedio',precio_clp:'precio',pack_clases:'pack',contacto_tipo:'contacto-tipo',detalles:'agregar-detalle'};enfocar(campo(mapa[validado.campo]||validado.campo));}
        return;
      }
      // Mandar solo lo que se editó conserva valores heredados (por ejemplo,
      // criterios null = público general) aunque el formulario muestre defaults.
      const cambios=Object.fromEntries(Object.entries(validado.datos).filter(([k])=>JSON.stringify(datos[k])!==JSON.stringify(inicialesAdmin[k])));
      for(const [opcion,otra] of [['modalidad','modalidad_otra'],['ubicacion','ubicacion_otra']]){if(opcion in cambios||otra in cambios){cambios[opcion]=validado.datos[opcion];cambios[otra]=validado.datos[otra];}}
      if(!Object.keys(cambios).length){estado.textContent='No hay cambios para guardar.';return;}
      const guardar=async()=>{
        if(procesando||form.isConnected===false)return;
        procesando=true;campo('guardar').disabled=true;estado.textContent='Guardando cambios…';
        try{
          const {data,error}=await supabaseClient.rpc('admin_editar_anuncio',{p_anuncio_id:id,p_datos:cambios});
          if(error){estado.textContent=sqlClasesDesactualizado(error)?'Aplica administradores.sql para editar anuncios desde acá.':'No pudimos guardar los cambios. Revisa los datos e intenta de nuevo.';return;}
          if(data!==true){estado.textContent='No hubo cambios. Si esperabas guardar algo, vuelve a Anuncios y abre el anuncio de nuevo.';return;}
          sinGuardar=false;
          await volverAdmin();
          if(typeof showToast==='function')showToast('Anuncio actualizado');
        }catch(e){estado.textContent='No pudimos guardar los cambios. Revisa tu conexión e intenta de nuevo.';}
        finally{procesando=false;if(campo('guardar')&&campo('guardar').isConnected)campo('guardar').disabled=false;}
      };
      if(anuncio.estado==='publicado')showConfirm('¿Guardar los cambios?','Los estudiantes verán los cambios al tiro.',guardar,{label:'Guardar cambios',danger:false});
      else await guardar();
      return;
    }
    procesando=true;
    const botones=[form.querySelector('#pr-guardar'),form.querySelector('#pr-enviar')].filter(Boolean);botones.forEach(b=>b.disabled=true);
    estado.textContent='Guardando borrador…';
    try{
      const guardado=await guardarBorradorClase(datos,id);
      if(!guardado.ok){estado.textContent=guardado.error;if(guardado.campo==='contacto_valor'){marcarContacto(guardado.error);return;}if(guardado.campo){const mapa={ramos_siglas:'siglas-buscar',criterios:'promedio',precio_clp:'precio',pack_clases:'pack',contacto_tipo:'contacto-tipo',contacto_valor:'contacto',modalidad_otra:'modalidad-otra',ubicacion_otra:'ubicacion-otra',detalles:'agregar-detalle'};enfocar(campo(mapa[guardado.campo]||guardado.campo));}return;}
      id=guardado.anuncio.id;
      sinGuardar=false;
      const guardadaCampana=await guardarCampanaClase(id,campana.datos);
      if(!guardadaCampana.ok&&!guardadaCampana.falta){estado.textContent='Tu clase se guardó, pero '+(guardadaCampana.error||'no se guardaron los días y el tope. No se envió a revisión.');return;}
      if(file){estado.textContent='Borrador guardado. Subiendo flyer…';const subida=await subirFlyerClase(id,file);
        if(!subida.ok){estado.textContent='Borrador guardado, pero '+subida.error;return;}
        flyerActual=subida.path;campo('flyer').value='';form.querySelector('#pr-quitar-flyer').hidden=false;
      }
      if(enviar){estado.textContent='Enviando a revisión…';const respuesta=await enviarBorradorClase(id);
        if(!respuesta.ok){estado.textContent=respuesta.error;if(respuesta.campo==='contacto_valor')marcarContacto(respuesta.error);return;}
        raiz.innerHTML='<div class="modal-title" id="modal-titulo">En revisión</div><p class="profesor-info" role="status">Recibimos tu anuncio. Nadie lo verá hasta que GradeHub lo revise y apruebe.</p>'+(guardadaCampana.falta||respuesta.sqlAnterior?'<p class="profesor-info" role="status">Los días y el tope todavía no se guardaron. GradeHub debe confirmarlos contigo antes de publicar.</p>':'');return;
      }
      // Guardado entero: el formulario se cierra y el borrador aparece en la
      // lista. Si faltó algo (días y tope sin su SQL), se queda abierto con
      // el aviso, para que no se pierda de vista.
      if(guardadaCampana.falta){estado.textContent=(pendiente?'Borrador guardado. Podrás enviarlo a revisión cuando aprobemos tu postulación.':'Borrador guardado.')+' Los días y el tope aún no se guardaron; deben confirmarse antes de publicar.';return;}
      if(!pendiente)vistaClasesAlVolver='anuncios';
      await renderEspacioProfesor(raiz,{titulo:raiz.id==='modal-content'});
      if(typeof showToast==='function')showToast('Borrador guardado');
    }catch(e){estado.textContent='No pudimos completar la acción. Revisa si tu borrador quedó guardado e intenta de nuevo.';
    }finally{procesando=false;botones.forEach(b=>{if(b.isConnected)b.disabled=false;});}
  };
  form.addEventListener('submit',e=>{e.preventDefault();procesar(false);});
  form.querySelector('#pr-guardar').addEventListener('click',()=>procesar(false));
  // Volver sin guardar. Si se escribió algo, se pregunta antes: lo no
  // guardado se pierde.
  let sinGuardar=false;
  form.addEventListener('input',()=>{sinGuardar=true;});
  form.addEventListener('change',()=>{sinGuardar=true;});
  const salir=async()=>{
    if(admin){await volverAdmin();return;}
    if(!pendiente)vistaClasesAlVolver='anuncios';
    await renderEspacioProfesor(raiz,{titulo:raiz.id==='modal-content'});
  };
  const volver=raiz.querySelector('#pr-volver');
  if(volver)volver.addEventListener('click',()=>{
    if(procesando)return;
    if(!sinGuardar){salir();return;}
    showConfirm('¿Salir sin guardar?',admin?'Los cambios que hiciste se pierden. El anuncio queda como estaba.':id?'Los cambios que hiciste desde que guardaste se pierden. Tu borrador queda como estaba.':'Lo que escribiste se pierde.',
      salir,{label:'Salir sin guardar'});
  });
  const enviarBoton=form.querySelector('#pr-enviar');
  if(enviarBoton)enviarBoton.addEventListener('click',()=>procesar(true));
}
