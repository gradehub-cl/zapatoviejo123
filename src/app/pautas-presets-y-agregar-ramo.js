function presetRamo(nombre,tenant,carrera,ahora,seccion){
  const def=definicionPreset(nombre,tenant,carrera,seccion);if(!def)return null;
  const evals=Array.isArray(def)?def:(def.evals||[]);
  // Un programa puede traer reglas sin publicar ponderaciones. No se inventa una
  // pauta vacía: sus reglas se muestran por reglasDelPreset(). Tampoco se carga
  // una que es casi toda grupos sin cantidad (pautaPresetSuficiente).
  if(!evals.length||!pautaPresetSuficiente(evals))return null;
  const periodo=periodoDePreset(def);
  const estadoPeriodo=estadoPeriodoPauta(periodo,ahora);
  const incluirFechas=estadoPeriodo==='vigente';
  const categorias=[],gates=[];
  const porNombre={};
  evals.forEach(([nom,peso,extra])=>{
    const id=uid();
    const cat={id,nombre:nom,peso,ponderaNotas:false,directNota:true,notas:[]};
    if(extra&&extra.slots)cat.slots=extra.slots;
    if(extra&&extra.optativa===true&&peso===0)cat.optativa=true;
    if(extra&&typeof extra.slotLabel==='string')cat.slotLabel=extra.slotLabel;
    if(extra&&Number.isInteger(extra.slotStart))cat.slotStart=extra.slotStart;
    if(extra&&Array.isArray(extra.nombresCasillas))cat.nombresCasillas=extra.nombresCasillas.slice();
    if(extra&&Array.isArray(extra.pesosCasillas))cat.pesosCasillas=extra.pesosCasillas.slice();
    // Una corrección de nombres no puede soltar las notas que alguien ya
    // escribió con la versión anterior. También puede reunir categorías
    // antiguas en casillas concretas si el dato nuevo aclara que eran un grupo.
    if(extra&&Array.isArray(extra.nombresAnteriores))cat.nombresAnteriores=extra.nombresAnteriores.map(x=>
      typeof x==='string'?x:{nombre:x.nombre,slot:x.slot,peso:x.peso});
    if(extra&&extra.lista)cat.directNota=false;
    if(extra&&extra.dropLowest)cat.dropLowest=extra.dropLowest;
    // Una pauta de 2026-2 puede seguir siendo buena para sus porcentajes en
    // 2027-1, pero sus días de prueba no. Nunca se inventa una fecha nueva: si
    // el período venció o no se conoce, simplemente no se ofrece.
    if(extra&&extra.fecha&&incluirFechas){cat.fecha=extra.fecha;cat.fechaOrigen='catalogo';}
    categorias.push(cat);porNombre[nom]=id;
    if(extra&&extra.min)gates.push({type:'min_grade_required',catId:id,min:extra.min,cap:extra.cap,nombre:nom,...(extra.exacto===true?{exacto:true}:{})});
  });
  const aporta=(!Array.isArray(def)&&def.aporta)?{...def.aporta}:null;
  (!Array.isArray(def)&&def.grupos||[]).forEach(g=>{
    const ids=g.evals.map(n=>porNombre[n]).filter(Boolean);
    if(ids.length)gates.push({type:'group_min',catIds:ids,min:g.min,cap:g.cap,nombre:g.nombre,...(g.exacto===true?{exacto:true}:{}),...(g.efecto==='reemplazar'?{efecto:'reemplazar'}:{})});
  });
  // Las reglas nuevas usan gates; un ramo ya guardado las recibe únicamente
  // cuando su dueño acepta actualizar la pauta.
  const pauta=categorias.map(c=>({catId:c.id,nombre:c.nombre,peso:c.peso,slots:c.slots||1,dropLowest:c.dropLowest||null}));
  const ids=nombres=>nombres.map(n=>porNombre[n]).filter(Boolean);
  (!Array.isArray(def)&&def.formulasCondicionales||[]).forEach(regla=>{
    const cuando=(regla.cuando||[]).map(c=>({...c,catIds:ids(c.evals)}));
    if(cuando.some((c,i)=>c.catIds.length!==regla.cuando[i].evals.length))return;
    gates.push({type:'conditional_weights',nombre:regla.nombre,pauta,cuando,
      ambigua:regla.ambigua===true,pesos:(regla.pesos||[]).map(e=>({catId:porNombre[e.evaluacion],peso:e.peso}))});
  });
  const limite=!Array.isArray(def)&&def.limiteAusencias;
  if(limite)gates.push({type:'absence_limit',nombre:limite.nombre,pauta,max:limite.max,
    traspasos:limite.desde.map(n=>({desdeId:porNombre[n],haciaId:porNombre[limite.hacia]}))});
  const recuperativo=!Array.isArray(def)?copiarRecuperativo(def.recuperativo):null;
  const reglasAusenciaJustificada=resolverReglasAusencia(def,categorias);
  const reemplazosOptativos=resolverReemplazosOptativos(def,categorias);
  const bonus=resolverBonus(def,categorias);
  const promedioParcial=!Array.isArray(def)&&def.promedioParcial==='por-casilla'?'por-casilla':null;
  return {categorias,gates,aporta,recuperativo,reemplazosOptativos,reglasAusenciaJustificada,bonus,promedioParcial,periodo,estadoPeriodo,
    creditos:(!Array.isArray(def)&&typeof def.creditos==='number')?def.creditos:null};
}

// No existe una migración implícita: esto se llama solo al agregar o al poner
// una sección. Un ramo manual antiguo conserva su procedencia y sus notas.
const contextosSeccionPauta=new WeakMap();
function datosPautaSeccion(r,contexto){
  const o=r&&(r.origen||contexto||contextosSeccionPauta.get(r));
  if(!o?.tenant)return null;
  const def=definicionPreset(r.nombre,o.tenant,o.carrera,r.seccion);
  if(def?.coordinado!==false||r.sigla&&def.sigla&&r.sigla!==def.sigla)return null;
  return presetRamo(r.nombre,o.tenant,o.carrera,undefined,r.seccion);
}
function ramoConNotasSeccion(r){
  const tiene=notas=>(notas||[]).some(n=>typeof n.valor==='number'&&Number.isFinite(n.valor)||tiene(n.subnotas)||tiene(n.notas));
  return (r.categorias||[]).some(c=>typeof c.nota==='number'||typeof c.directValor==='number'||tiene(c.notas));
}
function ponerPautaDeSeccion(r,p){
  const contexto=contextosSeccionPauta.get(r);
  if(!r.origen&&contexto)r.origen={tenant:contexto.tenant,carrera:contexto.carrera,ramoKey:ramoKey(r.nombre,contexto.tenant,contexto.carrera,r.sigla)};
  r.categorias=p.categorias;r.gates=p.gates;
  for(const campo of ['aporta','promedioParcial','recuperativo','reemplazosOptativos','reglasAusenciaJustificada','bonus'])r[campo]=p[campo]||null;
  r.pautaHuella=huellaPauta(p.categorias);
  delete r.consensoRespaldos;delete r.consensoAportado;
}
function cargarPautaSeccionVacia(r,contexto){
  if(!r||contexto?.soloFechas)return false;
  if(contexto?.tenant&&seccionValida(r.seccion)!=null)contextosSeccionPauta.set(r,{tenant:contexto.tenant,carrera:contexto.carrera});
  if(r.categorias?.length||ramoConNotasSeccion(r))return false;
  const p=datosPautaSeccion(r,contexto);if(!p)return false;
  ponerPautaDeSeccion(r,p);return true;
}
function nombrePresetSeccion(nombre,tenant,carrera){
  const def=definicionBasePreset(nombre,tenant,carrera);
  return def?.coordinado===false?claveCatalogo(nombre,Object.keys(PRESETS_POR_TENANT[tenant]||{}),tenant):null;
}

function confirmAddMalla(){
  const elegidos=_mallaList.filter(n=>_mallaSel[n]);
  if(!elegidos.length){
    const error=document.getElementById('malla-error');
    if(error){error.textContent='Selecciona al menos un ramo para agregar.';error.hidden=false;}
    const btn=document.getElementById('malla-btn');if(btn)btn.focus();
    return false;
  }
  elegidos.forEach(n=>{
    // Por findPresetName y no por el nombre crudo: la malla dice
    // "Filosofía: ¿Para Qué?" y el preset "Filosofía: ¿para qué?". Buscando
    // exacto no calzaban, así que el ramo se agregaba sin pauta — con la
    // estrella de "pauta oficial" al lado, porque el selector SÍ normaliza.
    const presetName=findPresetName(n,S.tenant,S.carrera);
    const preset=presetName?presetRamo(presetName,S.tenant,S.carrera):null;
    S.ramos.push({id:uid(),nombre:n,color:nextRamoColor(n),origen:origenActual(n),categorias:preset?preset.categorias:[],gates:preset?preset.gates:[],aporta:preset?preset.aporta:null,promedioParcial:preset?preset.promedioParcial:null,recuperativo:preset?preset.recuperativo:null,reglasAusenciaJustificada:preset?preset.reglasAusenciaJustificada:null,bonus:preset?preset.bonus:null,reemplazosOptativos:preset?preset.reemplazosOptativos:null,pautaHuella:preset?huellaPauta(preset.categorias):null});
    consensoAlAgregar(S.ramos[S.ramos.length-1]);
  });
  save();track('add_malla_ramos',{count:elegidos.length,carrera:S.carrera,sem:S.careerSemestre});
  closeModal();
  if(document.getElementById('screen-home').classList.contains('active'))renderHome();
  showToast(`✓ ${elegidos.length} ramo${elegidos.length!==1?'s':''} agregado${elegidos.length!==1?'s':''}`);
}

// Un solo campo: lo que el estudiante escribe es a la vez la búsqueda en su
// malla y el nombre del ramo si no está ahí. Créditos y color se editan
// después en la ficha del ramo — pedirlos acá era pedir una decisión en el
// peor momento, cuando todavía no tiene el ramo.
let alAgregarRamo=null,alCancelarAgregarRamo=null;
function openAddRamoModal(despuesDeAgregar,despuesDeCancelar){
  alAgregarRamo=typeof despuesDeAgregar==='function'?despuesDeAgregar:null;
  alCancelarAgregarRamo=typeof despuesDeCancelar==='function'?despuesDeCancelar:null;
  // Una malla diferida todavía no está en `catalogRamos`, pero justamente se
  // carga al abrir este camino. Ocultar los resultados hasta que exista haría
  // imposible iniciar esa carga para toda la UAI.
  const hayCatalogo=catalogRamos(S.tenant,S.carrera).length>0
    ||presetsFueraDeMalla(S.tenant,S.carrera).length>0
    ||S.tenant==='uc'||!!(S.carrera&&ARCHIVO_MALLAS[S.tenant]);
  const uni=(TENANTS[S.tenant]&&TENANTS[S.tenant].short)||'';
  const buscaPorSigla=S.tenant==='uc';
  const etiquetaRamo=buscaPorSigla?'Nombre o sigla del ramo':'Nombre del ramo';
  const ejemploRamo=buscaPorSigla?'Ej.: IIC2333 o Cálculo II':'Ej.: Microeconomía I';
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Agregar ramo</div>
    <label class="modal-label">${etiquetaRamo}${hayCatalogo&&uni?` <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">· lo buscamos en la malla ${esc(uni)}</span>`:''}</label>
    <div class="modal-input"><input type="text" id="m-ramo-search" placeholder="${ejemploRamo}" maxlength="${NOMBRE_MAX}" autocomplete="off" autocapitalize="none" aria-describedby="m-ramo-error"/></div>
    <p id="m-ramo-error" role="alert" hidden style="margin:7px 0 0;font-size:0.75rem;line-height:1.4;color:var(--red);"></p>
    ${hayCatalogo?'<div id="m-ramo-results" class="cat-results"></div>':''}
    ${S.tenant==='uc'?'<button type="button" class="horario-importar-link" onclick="abrirImportarHorarioBuscacursos()">Subir foto de tu horario</button>':''}
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-add-ramo-btn" onclick="confirmarAgregarRamoConSeccion()">Agregar ramo</button>
    </div>`;
  openModal();

  const input=document.getElementById('m-ramo-search');
  // preventScroll: a los 100 ms la hoja todavía viene subiendo desde abajo de
  // la pantalla, y Safari de iPhone desplazaba la página entera para mostrar
  // el campo. Al cerrar, la página quedaba corrida y la lista no respondía.
  setTimeout(()=>{try{input.focus({preventScroll:true});}catch(e){input.focus();}},100);
  const pintar=()=>{
    limpiarErrorCampo('m-ramo-search','m-ramo-error');
    if(hayCatalogo)renderCatalogResults(input.value);
  };
  input.addEventListener('input',pintar);
  input.addEventListener('keydown',e=>{if(e.key==='Enter')confirmarAgregarRamoConSeccion();});
  pintar();
}

// El botón principal y Enter aceptan la misma sección que la fila elegida.
// No altera el agregador manual ni el de pautas coordinadas.
function confirmarAgregarRamoConSeccion(){
  const texto=(document.getElementById('m-ramo-search')?.value||'').trim();
  const coincidencias=searchCatalog(texto,S.tenant,S.carrera,S.careerSemestre).filter(r=>
    normName(texto)===normName(r.nombre)||r.sigla&&normName(texto)===normName(r.sigla));
  if(coincidencias.some(r=>definicionBasePreset(r.nombre,S.tenant,S.carrera)?.coordinado===false)){
    if(coincidencias.length!==1){mostrarErrorCampo('m-ramo-search','m-ramo-error','Elige el ramo de la lista para confirmar su sigla y sección.');return false;}
    addFromCatalog(coincidencias[0].nombre,coincidencias[0].sigla);return true;
  }
  return confirmAddRamo();
}

// Resultados de búsqueda del catálogo. Solo ramos de la universidad y carrera
// del estudiante — nunca de otra casa de estudios.
function renderCatalogResults(q){
  const box=document.getElementById('m-ramo-results');if(!box)return;
  const repintar=()=>{
    const input=document.getElementById('m-ramo-search');
    if(input&&input.value===q)renderCatalogResults(q);
  };
  repintarAlCargarMallas(S.tenant,repintar);
  repintarAlCargarCursosUC(S.tenant,repintar,q,S.carrera);
  const yaTengo=new Set(S.ramos.map(r=>normName(r.nombre)));
  let res=searchCatalog(q,S.tenant,S.carrera,S.careerSemestre);
  if(S.tenant==='uc'&&!String(q||'').trim())res=priorizarFrecuentesUc(res,yaTengo);
  res=res.slice(0,6);
  if(res.length===0){
    const texto=!q||!q.trim()?'Sin ramos en el catálogo.'
      :catalogoUcEnCamino(S.tenant)?'Buscando en el catálogo de la UC…'
      :'No está en tu malla — lo agregamos como ramo tuyo.';
    box.innerHTML=`<div class="cat-empty">${texto}</div>`;
    return;
  }
  box.innerHTML=res.map((r,i)=>{
    const tengo=yaTengo.has(normName(r.nombre));
    return `<button class="cat-hit${tengo?' ya':''}" ${tengo?'disabled':`onclick="addFromCatalogCodificado('${obCodificarNombre(r.nombre)}','${obCodificarNombre(r.sigla||'')}')"`}>
      <span class="cat-hit-info">
        <span class="cat-hit-name">${esc(r.nombre)}</span>
        <span class="cat-hit-meta">${obCatalogMeta(r)}</span>
      </span>
      ${tengo?'<span class="cat-hit-tag">ya lo tienes</span>':'<span class="chevron-r">+</span>'}
    </button>${selectorSeccionRamoHTML(r.nombre,S.tenant,S.carrera,r.sigla,'agregar-seccion-'+i)}`;
  }).join('');
}

// Agrega directo desde el catálogo, con sello de procedencia y preset si existe
function addFromCatalogCodificado(nombre,sigla){
  addFromCatalog(decodeURIComponent(nombre),sigla?decodeURIComponent(sigla):null);
}
// Crea el ramo y lo deja en S, sin tocar la pantalla ni guardar: así el mismo
// camino sirve para agregar uno a mano y para aceptar varios de una propuesta.
// Devuelve el ramo creado para quien necesite completarlo (la sección, por
// ejemplo, que el catálogo no conoce).
function crearRamoDesdeCatalogo(nombre,sigla,seccion){
  const candidato=findPresetName(nombre,S.tenant,S.carrera)||nombrePresetSeccion(nombre,S.tenant,S.carrera);
  const def=candidato&&definicionBasePreset(candidato,S.tenant,S.carrera);
  if(seccion===undefined&&def?.coordinado===false)seccion=seccionElegidaRamo(nombre,S.tenant,S.carrera,sigla);
  // Dos cursos UC pueden compartir nombre y tener siglas distintas. El
  // horario trae la sigla exacta: nunca adjuntar la pauta de un homónimo.
  const siglaPreset=candidato&&S.tenant==='uc'?siglaDePreset(candidato):null;
  const presetName=sigla&&siglaPreset&&normName(sigla)!==normName(siglaPreset)?null:candidato;
  const preset=presetName?presetRamo(presetName,S.tenant,S.carrera,undefined,seccion):null;
  const fila=S.tenant==='uc'?cursoUcCompleto(nombre,sigla):null;
  // Los créditos de la pauta mandan: buscada sin sigla, la fila del catálogo
  // puede ser la del homónimo (TEB110 tiene 8; TTF012, 10).
  const creditos=typeof preset?.creditos==='number'?preset.creditos:presetName&&typeof def?.creditos==='number'?def.creditos:fila&&typeof fila[2]==='number'?fila[2]:creditosDe(nombre,S.tenant,preset,sigla);
  const ramo={
    id:uid(),nombre:presetName||nombre,color:nextRamoColor(presetName||nombre),sigla:sigla||null,
    creditos,seccion:seccionValida(seccion),origen:origenActual(presetName||nombre,sigla),
    categorias:preset?preset.categorias:[],gates:preset?preset.gates:[],aporta:preset?preset.aporta:null,promedioParcial:preset?preset.promedioParcial:null,recuperativo:preset?preset.recuperativo:null,reglasAusenciaJustificada:preset?preset.reglasAusenciaJustificada:null,bonus:preset?preset.bonus:null,reemplazosOptativos:preset?preset.reemplazosOptativos:null,pautaHuella:preset?huellaPauta(preset.categorias):null,
  };
  S.ramos.push(ramo);
  if(def?.coordinado!==false)consensoAlAgregar(ramo);
  return ramo;
}
function addFromCatalog(nombre,sigla){
  const ramo=crearRamoDesdeCatalogo(nombre,sigla);
  save();track('add_ramo_catalogo',{preset:!!(ramo.categorias||[]).length});
  const despues=alAgregarRamo;
  alCancelarAgregarRamo=null;
  closeModal();renderHome();
  showToast((ramo.categorias||[]).length?'Agregado con sus ponderaciones':avisoSinPautaSeccion(ramo.nombre,S.tenant,S.carrera,ramo.seccion)||'Ramo agregado');
  if(despues)despues();
}

// BuscaCursos repite SIGLA-SECCIÓN en cada bloque del horario. Extraer no
// significa aceptar: las siglas se validan contra cursos-uc.js después.
//
// La sección es opcional: en una foto el lector a veces pierde el "-1", y
// perder la sección no puede costar el ramo entero. Si la misma sigla aparece
// con y sin sección, manda la que la trae.
