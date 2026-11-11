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
      tenant:a.tenant,periodo:a.periodo,clave:a.clave,seccion:a.seccion}:null;
  const descartada=respaldos(d?.descartada)?d.descartada:0;
  return aceptada||descartada?{...(aceptada?{aceptada}:{}),...(descartada?{descartada}:{})}:null;
}

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
  return !!claveReporte(r)&&!pautaPendiente(r)&&
    !definicionPreset(r.nombre,r.origen?.tenant||S.tenant,r.origen?.carrera||S.carrera);
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
async function leerPautaSugerida(ctx,r){
  try{
    const {data,error}=await supabaseClient.rpc('pauta_sugerida',{
      p_tenant:ctx.tenant,p_periodo:ctx.periodo,p_ramo_key:ctx.clave,p_seccion:ctx.seccion,
    });
    if(error||!Array.isArray(data))return [];
    const vistas=new Set();
    const opciones=data.map(f=>opcionPautaSugerida(f,r)).filter(f=>{
      if(!f||vistas.has(f.huella))return false;
      vistas.add(f.huella);return true;
    });
    const max=Math.max(0,...opciones.map(f=>f.respaldos));
    return opciones.filter(f=>f.respaldos===max&&max>(r.pautaSugerida?.descartada||0)).slice(0,2);
  }catch(e){return [];}
}
function aceptarPautaSugeridaEnRamo(r,opcion,ctx){
  if(!elegiblePautaSugerida(r)||JSON.stringify(contextoPautaSugerida(r))!==JSON.stringify(ctx))return false;
  const valida=opcionPautaSugerida(opcion,r);
  if(!valida||valida.respaldos<=(r.pautaSugerida?.descartada||0))return false;
  const pauta=pautaDeConsenso(valida.estructura);
  const ids=fusionarPauta(r,pauta.categorias);
  r.gates=traducirIdsCategoria(pauta.gates,ids);
  r.pautaHuella=huellaPauta(catsDePauta(r.categorias));
  delete r.consensoRespaldos;
  r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(r)));
  r.pautaSugerida={...r.pautaSugerida,aceptada:{
    ...ctx,huella:valida.huella,respaldos:valida.respaldos,
    firma:firmaPautaSugerida(r),voto:hashPautaSugerida(r.consensoAportado),
  }};
  return true;
}
function textoPautaSugerida(n){
  return `Reportada por ${n} estudiante${n===1?'':'s'}, sin confirmar`;
}
function actualizarProcedenciaSugerida(r,cons){
  const a=r.pautaSugerida?.aceptada;
  if(!a||r.consensoRespaldos||!pautaSugeridaIntacta(r))return false;
  const ctx=contextoPautaSugerida(r);
  if(Object.keys(ctx).some(k=>ctx[k]!==a[k]))return false;
  const mia=estructuraParaConsenso(estructuraDe(r));
  const hit=(cons||[]).find(c=>c.ramo_key===ctx.clave&&consensoVigenteParaRamo(c,r)&&
    c.respaldos>=CONSENSO_AUTO&&nadaQueOfrecer(estructuraParaConsenso(c.estructura),mia));
  if(!hit)return false;
  r.consensoRespaldos=hit.respaldos;
  return true;
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
  if(!vigente())return;
  if(ponerConsensoEnRamo(r,cons||[])){save();renderRamo();return;}
  const opciones=await leerPautaSugerida(ctx,r);
  if(!opciones.length||!vigente())return;
  const varias=opciones.length>1;
  const descripcion=(opcion,i)=>{
    const filas=opcion.estructura.map(e=>`<span class="pauta-sugerida-fila">
      <span><span>${esc(e.nombre)}</span>${e.slots>1?`<small>${e.slots} notas</small>`:''}
      ${e.min!==undefined?`<small>Mínimo ${esc(String(e.min).replace('.',','))} · tope ${esc(String(e.cap??SIM_MIN).replace('.',','))}</small>`:''}</span>
      <strong>${r2(e.peso)}%</strong></span>`).join('');
    const contenido=`${varias?`<strong>Opción ${i+1}</strong>`:''}
      <span class="pauta-sugerida-respaldo">${textoPautaSugerida(opcion.respaldos)}</span>${filas}`;
    return varias?`<label class="pauta-sugerida-opcion"><input type="radio" name="pauta-sugerida-opcion" value="${i}" aria-label="Opción ${i+1}, ${textoPautaSugerida(opcion.respaldos)}"><span>${contenido}</span></label>`
      :`<div class="pauta-sugerida-opcion">${contenido}</div>`;
  };
  el.className='pauta-sugerida';
  el.innerHTML=`<fieldset>
    <legend>${varias?'Dos pautas sugeridas':'Pauta sugerida'}</legend>
    <p>Compárala con el programa de tu curso antes de usarla.</p>
    <div class="pauta-sugerida-opciones">${opciones.map(descripcion).join('')}</div>
    </fieldset>
    <div class="modal-btns pauta-sugerida-acciones">
      <button type="button" class="btn-cancel">Ahora no</button>
      <button type="button" class="btn-confirm"${varias?' disabled':''}>Usar esta pauta</button>
    </div>`;
  el.style.display='block';
  const aceptar=el.querySelector('.btn-confirm'),descartar=el.querySelector('.btn-cancel');
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
    r.pautaSugerida={...r.pautaSugerida,descartada:Math.max(r.pautaSugerida?.descartada||0,opciones[0].respaldos)};
    terminar('pauta_sugerida_descartada');
  });
  aceptar.addEventListener('click',async()=>{
    const elegida=opciones[varias?Number(radios.find(i=>i.checked)?.value):0];
    if(!elegida||!vigente())return;
    aceptar.disabled=true;descartar.disabled=true;radios.forEach(i=>{i.disabled=true;});
    // La RPC vuelve a comprobar consenso, programa y sección. Si cambió el
    // respaldo o la estructura, se muestra la versión vigente antes de guardar.
    const actuales=await leerPautaSugerida(ctx,r);
    if(!vigente())return;
    const actual=actuales.find(f=>f.huella===elegida.huella&&f.respaldos===elegida.respaldos&&
      JSON.stringify(f.estructura)===JSON.stringify(elegida.estructura));
    if(!actual||!aceptarPautaSugeridaEnRamo(r,actual,ctx)){
      renderRamo();showToast('La sugerencia cambió. Revisa la ficha para seguir.',true);return;
    }
    terminar('pauta_sugerida_aceptada');
  });
}
