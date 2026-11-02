// ─── RAMOS PROPUESTOS POR UN AGENTE ─────────────────────────────────────────
//
// Aparece en Inicio y no en Ajustes: quien pegó su horario en el chat vuelve a
// la app a ver sus ramos, no a buscar una bandeja. Se pinta solo si hay algo
// pendiente, y no se aplica nada hasta que la persona lo acepta.
function pintarRamosPropuestos(){
  const el=document.getElementById('ramos-propuestos');
  if(!el)return;
  const propuesta=propuestasRamosAgente[0];
  const nuevos=propuesta?propuesta.ramos.filter(r=>!ramoPropuestoYaEsta(r)):[];
  if(!propuesta||!nuevos.length){el.style.display='none';el.innerHTML='';return;}
  el.className='weight-setup-nudge';
  el.style.width='auto';el.style.margin='12px 20px';
  el.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div><b>Tu agente te propone ${nuevos.length} ${nuevos.length===1?'ramo':'ramos'}.</b><br>Todavía no están agregados. Míralos y decide tú.<div style="margin-top:8px;"><button type="button" class="rep-link" style="width:auto;padding:7px 12px;margin:0;" onclick="abrirRamosPropuestos()">Ver los ramos</button></div></div>`;
  el.style.display='flex';
}
// Cada ramo con su casilla: aceptar la lista entera y aceptar tres de seis son
// el mismo camino. Lo que no se puede es editar el nombre acá — para eso está
// Editar ramo, con la pantalla que ya existe.
function abrirRamosPropuestos(){
  const propuesta=propuestasRamosAgente[0];
  if(!propuesta){showToast('No tienes ramos pendientes');return;}
  const nuevos=propuesta.ramos.filter(r=>!ramoPropuestoYaEsta(r));
  if(!nuevos.length){showToast('Ya tienes todos esos ramos');return;}
  const filas=nuevos.map((r,i)=>{
    const detalle=[r.sigla?esc(r.sigla):'',r.seccion?`Sección ${r.seccion}`:''].filter(Boolean).join(' · ');
    return `<label class="agent-ramo-row">
      <input type="checkbox" class="agent-ramo-check" data-i="${i}" checked/>
      <span><b>${esc(r.nombre)}</b>${detalle?`<small>${detalle}</small>`:''}</span>
    </label>`;
  }).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Ramos por agregar</div>
    <p class="modal-desc">Tu agente los leyó de ${esc(propuesta.fuente)}. <b>No están agregados.</b> Desmarca los que no lleves este semestre.</p>
    <div class="agent-ramo-list">${filas}</div>
    <p class="agent-proposal-help">A los que tengan pauta en el catálogo se les carga al agregarlos. Ninguno llega con notas.</p>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="confirmarDescartarRamosPropuestos()">Descartar</button>
      <button type="button" class="btn-confirm" onclick="aplicarRamosPropuestos()">Agregar los marcados</button>
    </div>`;
  openModal();
}
function confirmarDescartarRamosPropuestos(){
  const propuesta=propuestasRamosAgente[0];
  if(!propuesta)return closeModal();
  showConfirm('¿Descartar los ramos propuestos?','No se agrega ninguno. Tu agente puede proponerlos de nuevo cuando quieras.',()=>descartarRamosPropuestos(propuesta.id),{label:'Descartar',danger:true,focusCancel:true});
}
async function descartarRamosPropuestos(id){
  try{
    await supabaseClient.rpc('resolver_propuesta_pauta_agente',{p_id:id,p_accion:'descartada'});
    propuestasRamosAgente=propuestasRamosAgente.filter(p=>p.id!==id);
    closeModal();pintarRamosPropuestos();showToast('Propuesta descartada');
  }catch{showToast('No se pudo descartar. Intenta de nuevo.',true);}
}
// Se agregan con el mismo camino que un ramo del catálogo, para que lleguen con
// su pauta oficial, sus créditos y su origen. La sección viaja aparte porque el
// catálogo no la conoce: la sabe el horario.
async function aplicarRamosPropuestos(){
  const propuesta=propuestasRamosAgente[0];
  if(!propuesta)return closeModal();
  const nuevos=propuesta.ramos.filter(r=>!ramoPropuestoYaEsta(r));
  const marcados=[...document.querySelectorAll('.agent-ramo-check')]
    .filter(c=>c.checked).map(c=>nuevos[Number(c.dataset.i)]).filter(Boolean);
  if(!marcados.length){showToast('No marcaste ningún ramo',true);return;}
  let puestos=0;
  marcados.forEach(r=>{
    if(ramoPropuestoYaEsta(r))return;
    const creado=crearRamoDesdeCatalogo(r.nombre,r.sigla);
    if(!creado)return;
    if(r.seccion)creado.seccion=r.seccion;
    puestos++;
  });
  save();
  // La propuesta se marca resuelta en el servidor DESPUÉS de guardar los ramos:
  // si la red se cae, la persona ve sus ramos y la propuesta sigue pendiente,
  // que es el lado bueno del error. Al revés perdería las dos cosas.
  try{await supabaseClient.rpc('resolver_propuesta_pauta_agente',{p_id:propuesta.id,p_accion:'aplicada'});}catch{}
  propuestasRamosAgente=propuestasRamosAgente.filter(p=>p.id!==propuesta.id);
  track('ramos_agente_aplicados',{cantidad:puestos});
  closeModal();pintarRamosPropuestos();renderHome();
  showToast(puestos===1?'Ramo agregado':`${puestos} ramos agregados`);
}
async function cargarPropuestasPautaAgente(opts){
  opts=opts||{};
  if(!currentUser||!supabaseClient)return [];
  const usuarioId=currentUser.id;
  propuestasPautaCargando=true;
  try{
    const {data,error}=await supabaseClient.rpc('listar_propuestas_pauta_agente');
    if(error)throw error;
    if(!currentUser||currentUser.id!==usuarioId)return [];
    // `tipo` nace con default 'pauta' en la base, así que una propuesta vieja
    // sin la columna se sigue leyendo como lo que es.
    const filas=Array.isArray(data)?data:[];
    propuestasPautaAgente=filas.filter(f=>(f&&f.tipo||'pauta')==='pauta').map(propuestaPautaLimpia).filter(Boolean);
    propuestasNotasAgente=filas.filter(f=>f&&f.tipo==='notas').map(propuestaNotasLimpia).filter(Boolean);
    propuestasFechasAgente=filas.filter(f=>f&&f.tipo==='fechas').map(propuestaFechasLimpia).filter(Boolean);
    propuestasRamosAgente=filas.filter(f=>f&&f.tipo==='ramos').map(propuestaRamosLimpia).filter(Boolean);
    pintarRamosPropuestos();
    renderPropuestasPautaHome();
    if(opts.mostrar&&propuestasPautaAgente.length)abrirPropuestasPautaAgente();
    else if(opts.mostrar&&opts.avisar)showToast('No tienes pautas pendientes');
    return propuestasPautaAgente;
  }catch(e){
    // La bandeja es una mejora, no una razón para impedir que alguien entre a
    // sus notas. La tabla se aplica manualmente y mientras no exista la app
    // sigue funcionando exactamente como antes.
    if(opts.avisar)showToast('No pudimos cargar las pautas pendientes. Intenta de nuevo.',true);
    return [];
  }finally{propuestasPautaCargando=false;}
}
function filasPropuestaPauta(propuesta){
  return propuesta.evaluaciones.map(e=>`<li><b>${esc(e.nombre)}</b><span>${r2(e.peso)}%${e.casillas?` · ${e.casillas} nota${e.casillas!==1?'s':''}`:''}</span></li>`).join('');
}
function abrirPropuestasPautaAgente(){
  if(!propuestasPautaAgente.length){showToast('No tienes pautas pendientes');return;}
  const tarjetas=propuestasPautaAgente.map(p=>{
    const ramo=ramoDePropuestaPauta(p);
    const sinRamo=!ramo;
    return `<article class="agent-proposal-card">
      <div class="agent-proposal-heading"><div><b>${esc(ramo?ramo.nombre:p.ramo)}</b><span>Propuesta recibida ${esc(fechaAgente(p.createdAt,'recientemente'))}</span></div><span class="agent-proposal-total">100%</span></div>
      <p class="agent-proposal-source"><b>Fuente:</b> ${esc(p.fuente)}</p>
      <ul class="agent-proposal-list">${filasPropuestaPauta(p)}</ul>
      ${sinRamo?`<p class="agent-proposal-warning">Este ramo ya no está en tu semestre. Puedes descartar la propuesta.</p>`:`<p class="agent-proposal-help">Revisa que calce con tu programa. Aplicarla conserva las notas que ya hayas puesto con el mismo nombre.</p>`}
      <div class="modal-btns agent-proposal-actions">
        <button type="button" class="btn-cancel" onclick="confirmarDescartarPropuestaPauta('${esc(p.id)}')">Descartar</button>
        ${sinRamo?'':`<button type="button" class="btn-confirm" onclick="confirmarAplicarPropuestaPauta('${esc(p.id)}')">Aplicar pauta</button>`}
      </div>
    </article>`;
  }).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Pautas por revisar</div>
    <p class="modal-desc">Tu agente propuso estas evaluaciones desde un programa. <b>No se han aplicado.</b> Revísalas antes de decidir.</p>
    <div class="agent-proposals">${tarjetas}</div>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Lo reviso después</button></div>`;
  openModal();
}
function propuestaConReglaQueCambia(r,propuesta){
  const nombres=new Set(propuesta.evaluaciones.map(e=>normName(e.nombre)));
  const porId=new Map((r.categorias||[]).map(c=>[c.id,c]));
  const ids=[];
  (r.gates||[]).forEach(g=>{if(g.catId)ids.push(g.catId);(g.catIds||[]).forEach(id=>ids.push(id));});
  return ids.some(id=>{const cat=porId.get(id);return cat&&!nombres.has(normName(cat.nombre));});
}
function confirmarAplicarPropuestaPauta(id){
  const propuesta=propuestasPautaAgente.find(p=>p.id===id);
  const ramo=ramoDePropuestaPauta(propuesta);
  if(!propuesta||!ramo){showToast('Esta propuesta ya no está disponible',true);return;}
  if(propuestaConReglaQueCambia(ramo,propuesta)){
    showToast('Esta propuesta cambia una evaluación con una regla de aprobación. Revísala manualmente para no perder esa regla.',true);return;
  }
  showConfirm(`¿Aplicar la pauta de ${ramo.nombre}?`,'Cambiarán los nombres y porcentajes de las evaluaciones. Las notas que ya ingresaste se conservan cuando coinciden por nombre.',()=>aplicarPropuestaPauta(id),{label:'Aplicar pauta',danger:false,focusCancel:true});
}
async function resolverPropuestaPauta(id,accion){
  const {error}=await supabaseClient.rpc('resolver_propuesta_pauta_agente',{p_id:id,p_accion:accion});
  if(error)throw error;
  propuestasPautaAgente=propuestasPautaAgente.filter(p=>p.id!==id);
  renderPropuestasPautaHome();
}
async function aportarPropuestaAlCatalogo(r){
  const estructura=estructuraParaConsenso(estructuraDe(r));
  const estado=estadoReporte(estructuraDe(r));
  if(!estructura.length||!estado.lista)return false;
  try{
    const {error,conSeccion}=await rpcReporteCatalogo(r,{
      p_tenant:S.tenant,p_carrera:(r.origen&&r.origen.carrera)||S.carrera,
      p_ramo:r.nombre,p_ramo_norm:normName(r.nombre),p_ramo_sigla:siglaReporteUC(r),
      p_estructura:estructura,p_huella:huellaEstructura(estructura),p_nota:null,
    },{origen:'automatico'});
    if(!error&&conSeccion)r.seccionAportada=seccionReporte(r);
    return !error;
  }catch(e){return false;}
}
async function aplicarPropuestaPauta(id){
  const propuesta=propuestasPautaAgente.find(p=>p.id===id);
  const ramo=ramoDePropuestaPauta(propuesta);
  if(!propuesta||!ramo||!currentUser||!supabaseClient)return;
  try{
    // Primero se marca resuelta en el servidor: si la red cae, no alteramos la
    // pauta local y no dejamos una propuesta que se pueda aplicar dos veces.
    await resolverPropuestaPauta(id,'aplicada');
    _suspenderAportePautas=true;
    clearTimeout(_aportePautasTimer);
    const nuevas=propuesta.evaluaciones.map(e=>{
      const anterior=(ramo.categorias||[]).find(c=>normName(c.nombre)===normName(e.nombre));
      const cat={id:anterior?anterior.id:uid(),nombre:e.nombre,peso:e.peso,ponderaNotas:false,directNota:true,notas:[]};
      if(e.casillas)cat.slots=e.casillas;
      return cat;
    });
    fusionarPauta(ramo,nuevas);
    // El agente leyó ponderaciones, no reglas del programa. Al confirmar su
    // estructura no inventamos ni reemplazamos compuertas, aportes o recuperativos.
    ramo.pautaHuella=null;
    delete ramo.consensoRespaldos;
    save();track('pauta_agente_confirmada',{evaluaciones:propuesta.evaluaciones.length});
    if(_aportePautasEnCurso)await _aportePautasEnCurso;
    const reportada=await aportarPropuestaAlCatalogo(ramo);
    if(reportada){
      ramo.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(ramo)));
      save();
    }
    closeModal();
    if(currentRamoId===ramo.id)renderRamo();else renderHome();
    showToast(reportada?'Pauta aplicada · también la sumamos al consenso':'Pauta aplicada · no pudimos sumarla al consenso ahora');
  }catch(e){showToast('No pudimos aplicar esta pauta. Intenta de nuevo.',true);}
  finally{_suspenderAportePautas=false;}
}
function confirmarDescartarPropuestaPauta(id){
  const propuesta=propuestasPautaAgente.find(p=>p.id===id);if(!propuesta)return;
  showConfirm('¿Descartar esta pauta?','Se elimina esta propuesta pendiente. No cambia tus ramos ni tus notas.',async()=>{
    try{
      await resolverPropuestaPauta(id,'descartada');
      if(propuestasPautaAgente.length)abrirPropuestasPautaAgente();else{closeModal();showToast('Propuesta descartada');}
    }catch(e){showToast('No pudimos descartar esta propuesta. Intenta de nuevo.',true);}
  },{label:'Descartar',danger:true,focusCancel:true});
}
