// Ficha del profesor: presenta las notas compartidas con el mismo motor.
function referenciaEvaluacionPrivada(ramo,nota,comp){
  if(!comp||comp.sinSeccion)return null;
  const c=(ramo.categorias||[]).find(c=>(c.notas||[]).some(n=>n.id===nota.id));
  const ref=(comp.evaluaciones||[]).find(e=>e.clave===claveEvaluacionPanel(nota.nombre))||
    (c&&(c.notas||[]).length===1&&!(c.slots>1)?(comp.categorias||[]).find(e=>e.clave===claveEvaluacionPanel(c.nombre)):null);
  return ref&&ref.personas>=5&&ref.promedio!=null?Number(ref.promedio):null;
}
function ultimaNotaPrivada(ramo,comp){
  // Solo las fechas declaradas permiten decir cuál fue la última.
  return evaluacionesConFechaPanel(ramo,comp).evaluaciones.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha))[0]||null;
}
function barraUltimaPrivadaHTML(ramo,comp,seccion=false){
  const ultima=ultimaNotaPrivada(ramo,comp),ref=ultima?referenciaEvaluacionPrivada(ramo,{id:ultima.id,nombre:ultima.evaluacion},comp):null;
  const lugar=seccion?'Sección':'Ramo',pos=v=>((Math.max(1,Math.min(7,v))-1)/6*100).toFixed(2);
  return `<button type="button" class="pe-ultima" data-pe-ultima="${esc(ramo.id)}" aria-label="Última evaluación. Comparar con ${seccion?'el ramo':'su sección'}" aria-pressed="${seccion}">
    <span>Última nota <i aria-hidden="true">↔</i></span><strong>${ultima?esc(fmt(ultima.nota)):'—'}</strong>
    <span>${ultima?esc(ultima.evaluacion)+' · '+esc(fechaCorta(ultima.fecha)):'Sin evaluaciones con fecha'}</span>
    <span class="pe-nota-pista" aria-hidden="true">${ultima?`<i style="width:${pos(ultima.nota)}%"></i>`:''}${ref!==null?`<b style="left:${pos(ref)}%"></b>`:''}<em style="left:50%"></em></span>
    <span class="pe-barra-extremos"><span>1</span><span>4</span><span>7</span></span>
    <small>${comp?.sinSeccion?'Sección no disponible · no declarada':ref===null?lugar+': aún pocos datos':lugar+' '+esc(fmtPromedio(ref))} · tocar para cambiar</small></button>`;
}
function evaluacionesPrivadasHTML(ramo,comp,contexto,ahora){
  const hoy=diaLocalPanel(ahora);let eventos=[];
  try{eventos=agendaEvents([ramo]);}catch(e){}
  const proximas=eventos.filter(e=>e.pending&&e.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const pendientes=proximas.map(e=>{
    const meta=notaParaIrConCuatro(e,contexto)||{},nombre=e.nota?.nombre||e.cat.nombre;
    return `<li><div><b>${esc(nombre)}</b><small>${esc(fechaCorta(e.fecha))}${e.hora?' · '+esc(e.hora):''}</small></div><span>${meta.nota?`<b>${esc(String(meta.nota).replace('.',','))}</b><small>Para ir con 4,0</small>`:meta.margen?'Va con 4,0 con cualquier nota':meta.inalcanzable?'Con esta sola no alcanza el 4,0':'Aún no se puede calcular'}</span></li>`;
  }).join('');
  // También se conservan las notas sin fecha; no se les inventa un orden temporal.
  const fechas=new Map(evaluacionesConFechaPanel(ramo,comp).evaluaciones.map(e=>[e.id,e.fecha]));
  const pasadas=categoriasDeRamoPanel(ramo).flatMap(c=>c.notas).sort((a,b)=>(fechas.get(b.id)||'').localeCompare(fechas.get(a.id)||''));
  const seccion=!!(comp?.sinSeccion||Number.isInteger(comp?.seccion));
  return `<section class="pe-evaluaciones"><h3>Próximas evaluaciones</h3>${pendientes?`<ul>${pendientes}</ul>`:'<p class="pe-sub">Sin evaluaciones próximas con fecha.</p>'}
    <div class="pe-pasadas-cabeza"><h3>Evaluaciones pasadas</h3><button type="button" data-pe-comparar aria-label="Comparar evaluaciones con ${seccion?'el ramo':'la sección'}">${seccion?'Sección':'Ramo'} ↔</button></div>
    ${pasadas.length?`<div class="pe-tabla-scroll"><table><thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th><th>${seccion?'Sección':'Ramo'}</th></tr></thead><tbody>${pasadas.map(n=>{const ref=referenciaEvaluacionPrivada(ramo,n,comp);return `<tr><th scope="row">${esc(n.nombre)}</th><td>${fechas.has(n.id)?esc(fechaCorta(fechas.get(n.id))):'—'}</td><td>${esc(fmt(n.valor))}</td><td>${ref===null?'—':esc(fmtPromedio(ref))}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="pe-sub">Todavía no tiene notas.</p>'}</section>`;
}
function ramoAlumnoEditorialHTML(al,r,comp,compUltima,seccionUltima,ahora){
  return conRamosAlumnoPanel(al,contexto=>{
    const ramo=ramoParaPanel(r),prom=ramoAvg(ramo,undefined,contexto),ref=comp?.ramo&&comp.ramo.personas>=5?comp.ramo.promedio:null;
    const diferencia=prom!==null&&ref!==null?prom-Number(ref):null;
    const seccion=!!(comp?.sinSeccion||Number.isInteger(comp?.seccion)),m=metricasAlumnoPanel({...al,ramos:[r]},()=>comp);
    let necesaria=null,estado=null;try{necesaria=notaNecesaria(ramo);estado=estadoParaNotaNecesaria(ramo);}catch(e){}
    const exigencia=exigenciaNotaNecesaria(necesaria);
    const progreso=estado?Math.max(0,Math.min(1,1-estado.pendiente)):null;
    const fechas=m.evaluaciones.map(e=>e.fecha).sort();
    return `<div class="pe-alumno-grilla"><section><div class="pe-promedio"><span>Promedio actual</span><strong>${prom===null?'—':esc(fmtPromedio(prom))}</strong><p>${comp?.sinSeccion?'Sección no disponible · no declarada':ref===null?'Aún pocos datos para comparar':`${seccion?'Sección':'Ramo'} ${esc(fmtPromedio(Number(ref)))}`}</p>${diferencia===null?'':`<b class="pe-diferencia" style="color:${colorDiferenciaPrivada(diferencia)}">${Math.abs(diferencia)<.05?'A la par':esc(conSignoPanel(diferencia))+' puntos'}</b>`}</div>
      ${graficoAntesAhoraSVG(m,{seccion,inicios:new Map([[r.id,inicioRamoPanel(al,r)]])})||'<p class="pe-sub">Faltan evaluaciones comparables con fecha para mostrar la evolución.</p>'}
      ${lineaInicioRamoHTML(al,r)}
      <p class="pe-sub">${m.cambio===null?esc(motivoSinCambioPanel(m)):'Cambio desde que empezó: '+esc(conSignoPanel(m.cambio))+' puntos frente '+(seccion?'a su sección':'al ramo')}</p>
      ${evaluacionesPrivadasHTML(ramo,comp,contexto,ahora)}
      <details class="pe-categorias"><summary>Ver categorías y promedios</summary>${ramoPanelHTML(r,comp,ahora,contexto,'',true)}</details>
    </section><aside><h3>Este ramo</h3><div data-pe-ultima-wrap>${barraUltimaPrivadaHTML(ramo,compUltima,seccionUltima)}</div>
      <section class="pe-necesaria"><span>Para aprobar · en lo pendiente</span>${exigencia?`<div>${htmlMedidorNota(necesaria)}<strong style="color:${exigencia.color}">${necesaria>7.05?'No alcanza':esc(nfNecesaria(necesaria))}</strong></div><b style="color:${exigencia.color}">${esc(exigencia.palabra)}</b>`:'<p class="pe-sub">'+(estado&&estado.pendiente===0?'Todas las notas ingresadas':'Aún no se puede calcular')+'</p>'}</section>
      <div class="pe-datos-ramo">${cifraPrivadaHTML(progreso===null?'—':Math.round(progreso*100)+'%','Peso evaluado')}${cifraPrivadaHTML(String(categoriasDeRamoPanel(ramo).reduce((n,c)=>n+c.notas.length,0)),'Notas ingresadas')}${cifraPrivadaHTML(fechas.length?fechaPrivada(fechas[0]):'—','Primera nota con fecha')}${cifraPrivadaHTML(fechas.length?fechaPrivada(fechas.at(-1)):'—','Última nota con fecha')}</div></aside></div>`;
  });
}
function contenidoAlumnoEditorialHTML(al,compDe,compGeneral,ahora){
  const ramos=al.ramos||[];
  return `<div class="pe-ficha"><div class="pe-ramos" role="group" aria-label="Ramos compartidos">${ramos.map((r,i)=>`<button type="button" data-pe-ramo="${esc(r.id)}" aria-pressed="${i===0}">${esc(r.nombre)}</button>`).join('')}</div><div data-pe-ramo-contenido>${ramos.length?ramoAlumnoEditorialHTML(al,ramos[0],compDe(al,ramos[0]),compGeneral(al,ramos[0]),false,ahora):'<p class="pe-sub">Ya no tiene ramos compartidos.</p>'}</div><button type="button" class="settings-danger-btn" data-quitar-alumno="${esc(al.id)}" data-nombre="${esc(al.nombre_visible)}">Quitar de mi lista</button></div>`;
}
