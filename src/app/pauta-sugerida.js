// Solo se persiste la procedencia y el respaldo visto. Las opciones de la
// consulta se quedan en la ficha hasta que la persona toma una decisión.
function copiarPautaSugerida(d){
  const a=d?.aceptada;
  const respaldos=n=>Number.isSafeInteger(n)&&n>0;
  const texto=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
  const aceptada=a&&respaldos(a.respaldos)&&texto(a.huella,4000)&&
    /^[0-9a-f]{16}$/.test(a.firma)&&/^[0-9a-f]{16}$/.test(a.voto)&&
    texto(a.tenant,20)&&/^\d{4}-[12v]$/.test(a.periodo)&&texto(a.clave,160)&&
    (a.seccion===null||seccionReporte(a)!==null)
    ?{huella:a.huella,respaldos:a.respaldos,firma:a.firma,voto:a.voto,
      tenant:a.tenant,periodo:a.periodo,clave:a.clave,seccion:a.seccion,...copiarFuenteSugerida(a)}:null;
  const descartada=respaldos(d?.descartada)?d.descartada:0;
  return aceptada||descartada?{...(aceptada?{aceptada}:{}),...(descartada?{descartada}:{})}:null;
}

// De dónde salió una sugerencia que no reportaron estudiantes: el programa de
// unas secciones o el catálogo (distribuciones-pauta.js). Campo opcional: sin
// él, la pauta es reportada, como siempre.
function copiarFuenteSugerida(a){
  if(a?.fuente==='catalogo')return {fuente:'catalogo'};
  const secciones=Array.isArray(a?.secciones)?a.secciones.filter(n=>Number.isInteger(n)&&n>=1&&n<=999).slice(0,20):[];
  return a?.fuente==='programa'&&secciones.length?{fuente:'programa',secciones}:{};
}
function textoReferenciaSugerida(o){
  if(o?.fuente==='catalogo')return 'Ponderaciones publicadas para este ramo; pueden no ser las de tu sección';
  if(o?.fuente==='programa')return `Programa oficial de la${o.secciones.length>1?'s secciones':' sección'} ${listaY(o.secciones.map(String))}`;
  return '';
}
function textoProcedenciaSugerida(a){return textoReferenciaSugerida(a)||textoPautaSugerida(a.respaldos);}

// Firma estable del contenido, sin copiar las evaluaciones al metadato.
function hashPautaSugerida(texto){
  let h=0xcbf29ce484222325n;
  for(const letra of texto)h=BigInt.asUintN(64,(h^BigInt(letra.codePointAt(0)))*0x100000001b3n);
  return h.toString(16).padStart(16,'0');
}
function firmaPautaSugerida(r){
  const cats=catsDePauta(r.categorias);
  const nombres=new Map(cats.map(c=>[c.id,c.nombre]));
  return hashPautaSugerida(JSON.stringify([
    estructuraDe(r),cats.map(c=>[c.nombre,c.peso,c.directNota===false,c.dropLowest?.count??null,c.dropLowest?.fraction??null]),
    (r.gates||[]).map(g=>[g.type,nombres.get(g.catId),Array.isArray(g.catIds)?g.catIds.map(id=>nombres.get(id)):null,g.min,g.cap,g.exacto,g.efecto,...(g.origen==='editor'?[g.origen]:[])]),
    firmaReglasCalculo(r),
  ]));
}
function pautaSugeridaIntacta(r){
  const a=r?.pautaSugerida?.aceptada;
  return !!a&&a.firma===firmaPautaSugerida(r);
}
function quitarProcedenciaSugerida(r){
  const descartada=r.pautaSugerida?.descartada;
  if(descartada)r.pautaSugerida={descartada};
  else delete r.pautaSugerida;
}
function repiteVotoSugerido(r,est){
  const a=r?.pautaSugerida?.aceptada;
  return !!a&&a.voto===hashPautaSugerida(huellaEstructura(est));
}
function contextoPautaSugerida(r){
  return {tenant:S.tenant,periodo:periodoReporte(r),clave:claveReporte(r),seccion:seccionReporte(r)};
}
function elegiblePautaSugerida(r){
  if(!r||esCuentaProfesor()||!S.onboardingDone||!currentUser||!supabaseClient)return false;
  if(r.origen?.tenant&&r.origen.tenant!==S.tenant)return false;
  if(r.categorias?.length||r.gates?.length||r.cierre||Number.isFinite(r.avgOverride)||r.pautaSugerida?.aceptada)return false;
  // Un ramo no coordinado sin pauta para la sección de la persona no tiene
  // nada oficial que cargar: ahí entran las sugerencias.
  const def=definicionPreset(r.nombre,r.origen?.tenant||S.tenant,r.origen?.carrera||S.carrera);
  const sinPautaPropia=!def||(!Array.isArray(def)&&def.coordinado===false&&!pautaPresetSuficiente(evalsDePreset(def)));
  return !!claveReporte(r)&&!pautaPendiente(r)&&sinPautaPropia;
}
function opcionPautaSugerida(fila,r){
  if(!fila||typeof fila.huella!=='string'||!fila.huella.trim()||fila.huella.length>4000||
    !Number.isSafeInteger(fila.respaldos)||fila.respaldos<1||!Array.isArray(fila.estructura)||fila.estructura.length>30)return null;
  const enEscala=v=>Number.isFinite(v)&&v>=1&&v<=7;
  const estructura=[];
  for(const e of fila.estructura){
    if(typeof e?.nombre!=='string'||!Number.isFinite(e.peso)||e.peso<=0||e.peso>100||
      (e.slots!==undefined&&(!Number.isInteger(e.slots)||e.slots<1||e.slots>100))||
      (e.min!==undefined&&!enEscala(e.min))||(e.cap!==undefined&&!enEscala(e.cap)))return null;
    const nombre=limpiarNombreAjeno(e.nombre);
    if(!nombre)return null;
    estructura.push({nombre,peso:e.peso,...(e.slots!==undefined?{slots:e.slots}:{}),
      ...(e.min!==undefined?{min:e.min}:{}),...(e.cap!==undefined?{cap:e.cap}:{})});
  }
  if(!estadoReporte(estructura).lista)return null;
  // Una compuerta explícita reemplazaría el mínimo institucional que hoy se
  // infiere para un único examen. Esa combinación no se ofrece como sugerencia.
  const norma=gh_reglasNota(r.origen?.tenant||S.tenant).examenFinal;
  if(norma&&estructura.some(e=>e.min!==undefined)&&estructura.filter(e=>norma.nombres.includes(normName(e.nombre))).length===1)return null;
  return {huella:fila.huella,respaldos:fila.respaldos,estructura:ordenarEstructuraConsenso(estructura)};
}
// En un ramo no coordinado el consenso no se aplica solo (coordinacion-ramo.js)
// y la RPC no lo devuelve como sugerencia: se ofrece desde acá, con el mismo
// texto que cualquier otra, porque describe la pauta de algún profesor.
function opcionesDeConsensoNoCoordinado(r,cons){
  if(!ramoNoCoordinado(r))return [];
  const clave=claveReporte(r);
  return (cons||[]).filter(c=>c&&c.ramo_key===clave&&consensoVigenteParaRamo(c,r)&&c.respaldos>=CONSENSO_AUTO)
    .map(c=>opcionPautaSugerida({huella:c.huella,respaldos:c.respaldos,estructura:c.estructura},r));
}
// ¿La distribución más respaldada se carga sola, como un consenso?
//
// El consenso del servidor exige tres reportes con la pauta escrita IGUAL,
// nombres incluidos. Al 2026-11-21 eso casi nunca pasaba: en Pensamiento
// Crítico II (UAndes) 19 de 19 daban los mismos pesos, pero escribían «Act.
// Semanal», «Act.Semana», «Act. Semana»… y el grupo idéntico más grande era
// de 2. Cada estudiante nuevo tenía que tocar la sugerencia para recibirla.
//
// Acá decide la distribución (mismos pesos y nombres parecidos), con los
// mismos umbrales que el consenso: tres personas o más y al menos el 60% de
// quienes reportaron el ramo (catalog_consensus_periodo). Sin empate, sin
// haberla descartado («Ahora no») y solo en ramos coordinados: en uno no
// coordinado describe la pauta de un profesor. Las demás garantías las pone
// aceptarPautaSugeridaEnRamo: ramo vacío, sin programa oficial ni pendiente.
// `total` cuenta personas, no distribuciones: también las que no calzan.
function distribucionAutomatica(dists,total,r){
  if(!ramoCoordinado(r))return null;
  const [d,otra]=dists||[];
  if(!d||!Number.isSafeInteger(total)||d.respaldos<CONSENSO_AUTO||d.respaldos*5<total*3)return null;
  if(otra&&otra.respaldos===d.respaldos)return null;
  if(d.respaldos<=(r.pautaSugerida?.descartada||0))return null;
  return opcionPautaSugerida({huella:d.huella,respaldos:d.respaldos,estructura:d.estructura},r);
}
// Coordinado: la distribución más respaldada (o dos si empatan), como siempre.
// No coordinado: hasta tres, primero la de tu profe o tu sección.
// `salida.automatica` recibe la opción que se carga sola, si la hay.
const MAX_OPCIONES_NO_COORDINADO=3;
async function leerPautaSugerida(ctx,r,cons,salida){
  try{
    const leidas=await leerFilasDistribucion(ctx)||{filas:[],completas:false};
    // Con la RPC anterior el consenso no viene entre las filas: se suma acá.
    const extras=leidas.completas?[]:opcionesDeConsensoNoCoordinado(r,cons).filter(Boolean)
      .map(o=>({estructura:o.estructura,respaldos:o.respaldos,seccion:null,profe:null,profesor:null,mio:false}));
    const dists=agruparDistribuciones([...leidas.filas,...extras],ctx.seccion);
    if(leidas.completas)registrarEvidenciaCoordinacion(ctx,dists);
    // Solo con las filas completas se sabe cuántas personas reportaron.
    if(salida)salida.automatica=leidas.completas?distribucionAutomatica(dists,
      leidas.filas.reduce((s,f)=>s+(Number.isSafeInteger(f?.respaldos)&&f.respaldos>0?f.respaldos:0),0),r):null;
    const opciones=dists.map(d=>{
      const o=opcionPautaSugerida({huella:d.huella,respaldos:d.respaldos,estructura:d.estructura},r);
      return o&&{...o,secciones:d.secciones,profesores:d.profesores,
        tuya:d.mios>0?'profe':d.mismaSeccion>0?'seccion':null};
    }).filter(Boolean);
    const descartada=r.pautaSugerida?.descartada||0;
    if(!ramoNoCoordinado(r)){
      const max=Math.max(0,...opciones.map(f=>f.respaldos));
      return opciones.filter(f=>f.respaldos===max&&max>descartada).slice(0,2);
    }
    // La de tu profe o tu sección sigue apareciendo aunque hayas dicho «Ahora
    // no» a otras: es justo la que calza con tu curso. El programa oficial de
    // tu sección va antes que todo; el resto de lo publicado, al final.
    const referencias=opcionesReferencia(r).filter(o=>!opciones.some(x=>x.huella===o.huella));
    const prioridad={programa:3,profe:2,seccion:1};
    const porPrioridad=(a,b)=>(prioridad[b.tuya]||0)-(prioridad[a.tuya]||0)||b.respaldos-a.respaldos;
    // Hasta tres reportadas (la tuya primero) y, al final, lo publicado.
    const reportadas=opciones.filter(f=>f.tuya||f.respaldos>descartada).sort(porPrioridad).slice(0,MAX_OPCIONES_NO_COORDINADO);
    const publicadas=referencias.filter(f=>f.tuya||!descartada);
    return [...publicadas.filter(f=>f.tuya),...reportadas,...publicadas.filter(f=>!f.tuya)]
      .slice(0,MAX_OPCIONES_NO_COORDINADO+1);
  }catch(e){return [];}
}
function aceptarPautaSugeridaEnRamo(r,opcion,ctx){
  if(!elegiblePautaSugerida(r)||JSON.stringify(contextoPautaSugerida(r))!==JSON.stringify(ctx))return false;
  const valida=opcionPautaSugerida(opcion,r);
  if(!valida||(!opcion.tuya&&valida.respaldos<=(r.pautaSugerida?.descartada||0)))return false;
  const pauta=pautaDeConsenso(valida.estructura);
  const ids=fusionarPauta(r,pauta.categorias);
  r.gates=traducirIdsCategoria(pauta.gates,ids);
  r.pautaHuella=huellaPauta(catsDePauta(r.categorias));
  delete r.consensoRespaldos;
  r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(r)));
  r.pautaSugerida={...r.pautaSugerida,aceptada:{
    ...ctx,huella:valida.huella,respaldos:valida.respaldos,
    firma:firmaPautaSugerida(r),voto:hashPautaSugerida(r.consensoAportado),...copiarFuenteSugerida(opcion),
  }};
  return true;
}
function textoPautaSugerida(n){
  return `Reportada por ${n} estudiante${n===1?'':'s'}, sin confirmar`;
}
function actualizarProcedenciaSugerida(r,cons){
  const a=r.pautaSugerida?.aceptada;
  if(!a||r.consensoRespaldos||!pautaSugeridaIntacta(r)||!ramoCoordinado(r))return false;
  const ctx=contextoPautaSugerida(r);
  if(Object.keys(ctx).some(k=>ctx[k]!==a[k]))return false;
  const mia=estructuraParaConsenso(estructuraDe(r));
  const hit=(cons||[]).find(c=>c.ramo_key===ctx.clave&&consensoVigenteParaRamo(c,r)&&
    c.respaldos>=CONSENSO_AUTO&&nadaQueOfrecer(estructuraParaConsenso(c.estructura),mia));
  if(!hit)return false;
  r.consensoRespaldos=hit.respaldos;
  return true;
}

// «Profe: Ana Pérez» o «Secciones 2 y 5»: solo nombres ya públicos (tres
// cuentas que coinciden, sin docentes ocultos) y números de sección.
function listaY(xs){return !xs[1]?xs.join(''):xs.slice(0,-1).join(', ')+' y '+xs[xs.length-1];}
function quienPautaSugerida(o){
  if(o.profesores?.length)return (o.profesores.length>1?'Profes: ':'Profe: ')+listaY(o.profesores.slice(0,3));
  if(o.secciones?.length)return (o.secciones.length>1?'Secciones ':'Sección ')+listaY(o.secciones.slice(0,4).map(String))+(o.secciones.length>4?' y otras':'');
  return '';
}
const TUYA_PAUTA_SUGERIDA={programa:'Tu sección',profe:'Tu profe',seccion:'Tu sección'};
function htmlPautaSugerida(opciones,{noCoordinado,sinSeccion,pedirSeccion}){
  const varias=opciones.length>1;
  const descripcion=(opcion,i)=>{
    const filas=opcion.estructura.map(e=>`<span class="pauta-sugerida-fila">
      <span><span>${esc(e.nombre)}</span>${e.slots>1?`<small>${e.slots} notas</small>`:''}
      ${e.min!==undefined?`<small>Mínimo ${esc(String(e.min).replace('.',','))} · tope ${esc(String(e.cap??SIM_MIN).replace('.',','))}</small>`:''}</span>
      <strong>${r2(e.peso)}%</strong></span>`).join('');
    const tuya=TUYA_PAUTA_SUGERIDA[opcion.tuya]||'';
    const origen=textoReferenciaSugerida(opcion)||textoPautaSugerida(opcion.respaldos);
    const quien=opcion.fuente?'':quienPautaSugerida(opcion);
    const contenido=`${varias?`<strong>Opción ${i+1}</strong>`:''}${tuya?`<span class="pauta-sugerida-tuya">${tuya}</span>`:''}
      <span class="pauta-sugerida-respaldo">${esc(origen)}${quien?` · ${esc(quien)}`:''}</span>${filas}`;
    const clase='pauta-sugerida-opcion'+(tuya?' pauta-sugerida-opcion-tuya':'');
    const etiqueta=[`Opción ${i+1}`,tuya,origen,quien].filter(Boolean).join(', ');
    // La de tu profe o tu sección va primero y ya elegida: es la que calza.
    return varias?`<label class="${clase}"><input type="radio" name="pauta-sugerida-opcion" value="${i}"${tuya&&i===0?' checked':''} aria-label="${esc(etiqueta)}"><span>${contenido}</span></label>`
      :`<div class="${clase}">${contenido}</div>`;
  };
  const titulo=noCoordinado?(varias?'Versiones que reportan en este ramo':'Ponderaciones que reportan en este ramo'):(varias?'Dos versiones sugeridas':'Ponderaciones sugeridas');
  const ayuda=noCoordinado?'Este ramo cambia según profesor o sección. Elige la que calce con el programa de tu curso.'
    :'Compárala con el programa de tu curso antes de usarla.';
  // Saber la sección de más estudiantes es lo que permite sugerir la correcta.
  // En la app se pide ahí mismo, sin abrir el editor del ramo (pedirSeccion).
  const pista=pedirSeccion?htmlPedirSeccion(false):noCoordinado&&sinSeccion?`<p class="pauta-sugerida-pista">Si agregas tu sección, te mostramos primero la de tu curso. <button type="button" class="docente-link" data-agregar-seccion>Agregar sección</button></p>`:'';
  const preelegida=varias&&opciones[0].tuya;
  return `<fieldset>
    <legend>${titulo}</legend>
    <p>${ayuda}</p>${pista}
    <div class="pauta-sugerida-opciones">${opciones.map(descripcion).join('')}</div>
    </fieldset>
    <div class="modal-btns pauta-sugerida-acciones">
      <button type="button" class="btn-cancel">Ahora no</button>
      <button type="button" class="btn-confirm"${varias&&!preelegida?' disabled':''}>Usar estas ponderaciones</button>
    </div>`;
}

// Pedir la sección en un ramo no coordinado (Lucas, 2026-11-25). Cada sección
// arma su programa, y sin saber la de cada estudiante no se puede sugerir la
// que calza: ni el programa de su sección ni lo que reportan sus compañeros.
// Hasta el 2026-11-25 solo había un enlace dentro de la sugerencia que abría
// el editor completo del ramo; casi nadie la ponía. Ahora se pide ahí mismo,
// en la ficha, mientras el ramo no tenga sección. Solo en la app (lo nuevo va
// a la app hasta el lanzamiento); la web conserva el enlace.
function pideSeccionRamo(r){
  return typeof enAppNativa==='function'&&enAppNativa()&&!esCuentaProfesor()&&!!r&&
    !Number.isInteger(r.seccion)&&!r.cierre&&!Number.isFinite(r.avgOverride)&&ramoNoCoordinado(r);
}
function htmlPedirSeccion(conPonderaciones){
  const para=conPonderaciones?'Así tus compañeros de sección reciben las ponderaciones correctas.'
    :'Así te mostramos primero las ponderaciones de tu curso.';
  return `<div class="pedir-seccion">
    <label for="pedir-seccion-input"><b>¿En qué sección estás?</b><span>Este ramo cambia según la sección. ${para}</span></label>
    <div class="pedir-seccion-fila">
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="pedir-seccion-input" maxlength="3" autocomplete="off" enterkeyhint="done" placeholder="Ej.: 3" aria-describedby="pedir-seccion-error">
      <button type="button" class="pedir-seccion-guardar" data-guardar-seccion>Guardar sección</button>
    </div>
    <p id="pedir-seccion-error" class="pedir-seccion-error" role="alert" hidden></p>
  </div>`;
}
function mostrarPedirSeccion(el,r,conPonderaciones,vigente){
  el.className='pauta-sugerida pauta-sugerida-solo-seccion';
  el.innerHTML=htmlPedirSeccion(conPonderaciones);
  el.style.display='block';
  enlazarPedirSeccion(el,r,vigente);
}
function enlazarPedirSeccion(el,r,vigente){
  const input=el.querySelector('#pedir-seccion-input'),boton=el.querySelector('[data-guardar-seccion]');
  if(!input||!boton)return;
  const guardar=()=>{
    if(!vigente())return;
    const seccion=parseSeccion(input.value);
    if(seccion==null){mostrarErrorCampo('pedir-seccion-input','pedir-seccion-error','Escribe tu sección como un número entre 1 y 999.');return;}
    // Lo mismo que guarda el editor del ramo: la sección y sus fechas.
    r.seccion=seccion;
    completarFechasOficiales(r,{tenant:S.tenant,carrera:S.carrera});
    save();track('seccion_desde_ficha');renderRamo();
  };
  boton.addEventListener('click',guardar);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();guardar();}});
  input.addEventListener('input',()=>limpiarErrorCampo('pedir-seccion-input','pedir-seccion-error'));
}

let consultaPautaSugerida=0;
let ultimaSugerenciaVista=null;
function pautaSugeridaEnFicha(r){
  return currentRamoId===r.id&&document.getElementById('screen-ramo')?.classList.contains('active');
}
async function pintarPautaSugerida(r,el){
  if(!elegiblePautaSugerida(r)||!pautaSugeridaEnFicha(r))return;
  const consulta=++consultaPautaSugerida,estado=S,usuario=currentUser.id,ctx=contextoPautaSugerida(r);
  const vigente=()=>consulta===consultaPautaSugerida&&S===estado&&currentUser?.id===usuario&&
    S.ramos.find(x=>x.id===r.id)===r&&pautaSugeridaEnFicha(r)&&elegiblePautaSugerida(r)&&
    JSON.stringify(contextoPautaSugerida(r))===JSON.stringify(ctx);
  const cons=await cargarConsenso(ctx.tenant,ctx.periodo,ctx.seccion);
  if(coordinacionRamo(r)===null)await asegurarMallasCoordinacion(ctx.tenant);
  if(!vigente())return;
  // Primero las distribuciones: pueden mostrar que el ramo no es coordinado, y
  // entonces el consenso no se aplica solo.
  const salida={};
  const opciones=await leerPautaSugerida(ctx,r,cons,salida);
  if(!vigente())return;
  if(ponerConsensoEnRamo(r,cons||[])){save();renderRamo();return;}
  // Sin tres iguales letra por letra, la distribución que los junta por pesos
  // y nombres parecidos entra sola si cumple lo mismo (distribucionAutomatica).
  // Queda como una sugerencia aceptada: la ficha dice de dónde salió y, si se
  // forma el consenso exacto, pasa a contarse como tal.
  if(salida.automatica&&aceptarPautaSugeridaEnRamo(r,salida.automatica,ctx)){
    save();track('pauta_sugerida_automatica');renderRamo();return;
  }
  const pedirSeccion=pideSeccionRamo(r);
  if(!opciones.length){
    // Sin nada que sugerir todavía, la sección igual sirve: con ella llegan
    // el programa de su sección y lo que reporten sus compañeros de curso.
    if(pedirSeccion)mostrarPedirSeccion(el,r,false,vigente);
    return;
  }
  const noCoordinado=ramoNoCoordinado(r);
  el.className='pauta-sugerida';
  el.innerHTML=htmlPautaSugerida(opciones,{noCoordinado,sinSeccion:!Number.isInteger(r.seccion),pedirSeccion});
  el.style.display='block';
  enlazarPedirSeccion(el,r,vigente);
  const varias=opciones.length>1;
  const aceptar=el.querySelector('.btn-confirm'),descartar=el.querySelector('.btn-cancel');
  el.querySelector('[data-agregar-seccion]')?.addEventListener('click',()=>{if(vigente())openEditRamoModal();});
  const radios=[...el.querySelectorAll('input[type=radio]')];
  radios.forEach(input=>input.addEventListener('change',()=>{aceptar.disabled=false;}));
  const vista=JSON.stringify([usuario,r.id,ctx,opciones.map(f=>[f.huella,f.respaldos])]);
  if(vista!==ultimaSugerenciaVista){ultimaSugerenciaVista=vista;track('pauta_sugerida_vista');}
  const terminar=evento=>{
    save();track(evento);renderRamo();
    document.querySelector('.add-cat-btn')?.focus();
  };
  descartar.addEventListener('click',()=>{
    if(!vigente())return;
    r.pautaSugerida={...r.pautaSugerida,descartada:Math.max(r.pautaSugerida?.descartada||0,...opciones.map(f=>f.respaldos))};
    terminar('pauta_sugerida_descartada');
  });
  aceptar.addEventListener('click',async()=>{
    const elegida=opciones[varias?Number(radios.find(i=>i.checked)?.value):0];
    if(!elegida||!vigente())return;
    aceptar.disabled=true;descartar.disabled=true;radios.forEach(i=>{i.disabled=true;});
    // La RPC vuelve a comprobar consenso, programa y sección. Si cambió el
    // respaldo o la estructura, se muestra la versión vigente antes de guardar.
    const actuales=await leerPautaSugerida(ctx,r,await cargarConsenso(ctx.tenant,ctx.periodo,ctx.seccion));
    if(!vigente())return;
    const actual=actuales.find(f=>f.huella===elegida.huella&&f.respaldos===elegida.respaldos&&
      JSON.stringify(f.estructura)===JSON.stringify(elegida.estructura));
    if(!actual||!aceptarPautaSugeridaEnRamo(r,actual,ctx)){
      renderRamo();showToast('La sugerencia cambió. Revisa la ficha para seguir.',true);return;
    }
    terminar('pauta_sugerida_aceptada');
  });
}
