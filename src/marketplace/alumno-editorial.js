// Ficha del alumno que consulta el profesor: notas compartidas con el mismo motor.
function comparacionEvaluacionPrivada(ramo,nota,comp){
  if(!comp||comp.sinSeccion)return null;
  const c=(ramo.categorias||[]).find(c=>(c.notas||[]).some(n=>n.id===nota.id));
  const ref=(comp.evaluaciones||[]).find(e=>e.clave===claveEvaluacionPanel(nota.nombre))||
    (c&&(c.notas||[]).length===1&&!(c.slots>1)?(comp.categorias||[]).find(e=>e.clave===claveEvaluacionPanel(c.nombre)):null);
  return datosComparacionPanel(ref);
}
function referenciaEvaluacionPrivada(ramo,nota,comp){
  return comparacionEvaluacionPrivada(ramo,nota,comp)?.promedio??null;
}
function ultimaNotaPrivada(ramo,comp){
  // Solo las fechas declaradas permiten decir cuál fue la última.
  return evaluacionesConFechaPanel(ramo,comp).evaluaciones.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha))[0]||null;
}
// Solo cambia la presentación de los valores que ya entrega el motor.
const cifraNotaPrivada=v=>String(v).replace('.',',');
function estadoComparacionPrivada(comp){
  if(comp?.sinSeccion)return 'Sección no disponible · no declarada';
  if(comp?.sinSQL)return 'Comparación no disponible por ahora';
  if(comp?.errorCarga)return 'No pudimos cargar la comparación';
  return 'No disponible · aún pocos datos para comparar';
}
function barraUltimaPrivadaHTML(ramo,comp,seccion=false){
  const ultima=ultimaNotaPrivada(ramo,comp),muestra=ultima?comparacionEvaluacionPrivada(ramo,{id:ultima.id,nombre:ultima.evaluacion},comp):null,ref=muestra?.promedio??null;
  const lugar=seccion?'Sección':'Ramo',pos=v=>((Math.max(1,Math.min(7,v))-1)/6*100).toFixed(2);
  const referencia=ref===null?estadoComparacionPrivada(comp):lugar+' · última evaluación: '+cifraNotaPrivada(fmtPromedio(ref));
  return `<div class="pe-ultima-cabeza"><span>Última nota</span><strong>${ultima?esc(cifraNotaPrivada(fmt(ultima.nota))):'—'}</strong></div>
    <p class="pe-ultima-fecha">${ultima?esc(ultima.evaluacion)+' · '+esc(fechaCorta(ultima.fecha)):'Sin evaluaciones con fecha'}</p>
    <button type="button" class="pe-ultima" data-pe-ultima="${esc(ramo.id)}" aria-label="${esc(ultima?'Última nota '+cifraNotaPrivada(fmt(ultima.nota))+'. '+referencia+'. '+(muestra?textoMuestraPanel(muestra)+'.':''):'Sin última evaluación con fecha.')} Comparar con ${seccion?'el ramo':'su sección'}" aria-pressed="${seccion}">
      <span class="pe-nota-pista" aria-hidden="true">${ultima?`<i style="width:${pos(ultima.nota)}%"></i>`:''}${ref!==null?`<b style="left:${pos(ref)}%"></b>`:''}<em style="left:50%"></em></span>
      <span class="pe-barra-extremos" aria-hidden="true"><span>1</span><span>4</span><span>7</span></span>
      <small>${esc(referencia)} <span aria-hidden="true">↔</span></small>${muestra?`<small>${esc(textoMuestraPanel(muestra))}</small>`:''}</button>`;
}
function pesoEvaluacionPrivada(e){
  const peso=pesoEventoAgenda(e);
  return peso===null?'Peso variable':cifraNotaPrivada(r2(peso))+'% del ramo';
}
function evaluacionesPrivadasHTML(ramo,comp,contexto,ahora){
  const hoy=diaLocalPanel(ahora);let eventos=[];
  try{eventos=agendaEvents([ramo]);}catch(e){}
  const proximas=eventos.filter(e=>e.pending&&e.fecha>=hoy).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const pendientes=proximas.map(e=>{
    const meta=notaParaIrConCuatro(e,contexto)||{},nombre=e.nota?.nombre||e.cat.nombre;
    const dias=Math.round((Date.parse(e.fecha+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/864e5);
    // Esta meta usa lo ya rendido más ESTA evaluación. No supone notas en las demás.
    const valor=meta.nota?cifraNotaPrivada(meta.nota):meta.margen?'1,0':'—';
    const condicion=meta.nota||meta.margen?'Para ir con 4,0 después de rendirla':meta.inalcanzable?'Con esta evaluación sola no alcanza el 4,0':'Aún no se puede calcular';
    return `<li><div><small>${esc(fechaCorta(e.fecha))} · ${dias===0?'Hoy':dias===1?'Mañana':'En '+dias+' días'}${e.hora?' · '+esc(e.hora):''}</small><b>${esc(nombre)}</b><small>${esc(pesoEvaluacionPrivada(e))}</small></div>
      <div class="pe-proxima-meta"><small>Necesita</small><strong>${esc(valor)}</strong></div><p>${esc(condicion)}</p></li>`;
  }).join('');
  // También se conservan las notas sin fecha; no se les inventa un orden temporal.
  const fechas=new Map(evaluacionesConFechaPanel(ramo,comp).evaluaciones.map(e=>[e.id,e.fecha]));
  const pasadas=categoriasDeRamoPanel(ramo).flatMap(c=>c.notas).sort((a,b)=>(fechas.get(b.id)||'').localeCompare(fechas.get(a.id)||''));
  const seccion=!!(comp?.sinSeccion||Number.isInteger(comp?.seccion));
  return `<section class="pe-evaluaciones"><h3>Próximas evaluaciones</h3>${pendientes?`<ul>${pendientes}</ul>`:'<p class="pe-sub">Sin evaluaciones próximas con fecha.</p>'}
    <div class="pe-pasadas-cabeza"><h3>Evaluaciones pasadas</h3><span>${pasadas.length} ${pasadas.length===1?'nota compartida':'notas compartidas'}</span></div>
    ${pasadas.length?`<div class="pe-tabla-scroll"><table><thead><tr><th>Evaluación / fecha</th><th>Alumno</th><th><button type="button" data-pe-comparar aria-label="Comparar evaluaciones con ${seccion?'el ramo':'la sección'}">Promedio ${seccion?'de la sección':'del ramo'} ↔</button></th></tr></thead><tbody>${pasadas.map(n=>{
      const muestra=comparacionEvaluacionPrivada(ramo,n,comp),ref=muestra?.promedio??null,cat=ramo.categorias.find(c=>(c.notas||[]).some(x=>x.id===n.id));
      const peso=cat?pesoEvaluacionPrivada({ramo,cat,nota:n,historialRendida:true}):'';
      return `<tr><th scope="row">${esc(n.nombre)}<small>${fechas.has(n.id)?esc(fechaCorta(fechas.get(n.id))):'Sin fecha'}${peso?' · '+esc(peso):''}</small></th>
        <td><b>${esc(cifraNotaPrivada(fmt(n.valor)))}</b><small>${notaAprobada(n.valor)?'Aprobada':'Bajo 4,0'}</small></td><td>${ref===null?'<span aria-label="Comparación no disponible">No disponible</span>':esc(cifraNotaPrivada(fmtPromedio(ref)))+`<small>${esc(textoMuestraPanel(muestra))}</small>`}</td></tr>`;
    }).join('')}</tbody></table></div>`:'<p class="pe-sub">Todavía no tiene notas.</p>'}</section>`;
}
function ramoAlumnoEditorialHTML(al,r,comp,compUltima,seccionUltima,ahora){
  return conRamosAlumnoPanel(al,contexto=>{
    const ramo=ramoParaPanel(r),prom=ramoAvg(ramo,undefined,contexto),muestra=datosComparacionPanel(comp?.ramo),ref=muestra?.promedio??null;
    const motivo=motivoPromedioAlumnoPanel(ramo,contexto);
    const diferencia=prom!==null&&ref!==null?prom-Number(ref):null;
    const seccion=!!(comp?.sinSeccion||Number.isInteger(comp?.seccion)),m=metricasAlumnoPanel({...al,ramos:[r]},()=>comp);
    let necesaria=null,estado=null;try{necesaria=notaNecesaria(ramo);estado=estadoParaNotaNecesaria(ramo);}catch(e){}
    const exigencia=exigenciaNotaNecesaria(necesaria),inicio=inicioRamoPanel(al,r);
    const progreso=estado&&ramo.categorias.some(c=>c.peso>0)?Math.max(0,Math.min(1,1-estado.pendiente)):null;
    const notas=m.evaluaciones.slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
    const grupo=seccion?'Sección':'Ramo',sinDatos=estadoComparacionPrivada(comp);
    const grafico=graficoAntesAhoraSVG(m,{seccion,inicios:new Map([[r.id,inicio]]),ficha:true});
    return `<div class="pe-ficha-acciones"><button type="button" data-inicio-alumno="${esc(al.id)}" data-inicio-ramo="${esc(r.id)}" aria-label="Editar inicio de clases de ${esc(r.nombre)}">Editar inicio</button></div>
    <div class="pe-alumno-grilla"><section class="pe-alumno-principal"><div class="pe-promedio">
      <div><span>Promedio actual</span><strong>${prom===null?'—':esc(cifraNotaPrivada(fmtPromedio(prom)))}</strong></div>
      <div><span>${grupo}</span><small class="pe-muestra">${esc(textoMuestraPanel(muestra))}</small><strong>${ref===null?'—':esc(cifraNotaPrivada(fmtPromedio(Number(ref))))}</strong></div>
      <div><span>Diferencia</span><strong class="pe-diferencia" style="color:${colorDiferenciaPrivada(diferencia??0)}">${diferencia===null?'—':esc(cifraNotaPrivada(conSignoPanel(diferencia)))}</strong></div></div>
      ${motivo?`<p class="pe-sub">${esc(motivo)}</p>`:''}
      <section class="pe-frente"><div class="pe-frente-cabeza"><h3>Frente al grupo</h3><span>Puntos de nota</span></div>
        <div class="pe-grupo" role="group" aria-label="Grupo de comparación">${[false,true].map(s=>`<button type="button" data-pe-grupo="${s?'seccion':'ramo'}" aria-pressed="${seccion===s}">${s?'Sección':'Ramo'}</button>`).join('')}</div>
        ${grafico||`<p class="pe-sin-grafico" role="status">${ref===null?esc(sinDatos):'Faltan evaluaciones comparables con fecha para mostrar la evolución.'}</p>`}
      </section></section><aside class="pe-contexto"><h3>Este ramo</h3><p class="pe-contexto-sub">${esc(r.sigla||r.nombre)} · ${Number.isInteger(r.seccion)?'Sección '+esc(r.seccion):'Sin sección declarada'}</p>
      <div data-pe-ultima-wrap>${barraUltimaPrivadaHTML(ramo,compUltima,seccionUltima)}</div>
      <section class="pe-necesaria"><div class="pe-necesaria-texto"><b>Necesita en lo pendiente</b><small>Para llegar al 4,0 final</small></div>${exigencia?`<div class="pe-medidor" role="img" aria-label="${esc(necesaria>7.05?'Con lo pendiente no alcanza para aprobar':'Necesita '+cifraNotaPrivada(nfNecesaria(necesaria))+'. '+exigencia.palabra)}">${htmlMedidorNota(necesaria)}<div class="pe-medidor-cifra" aria-hidden="true" style="color:${exigencia.color}"><strong${necesaria>7.05?' class="pe-meta-imposible"':''}>${necesaria>7.05?'No alcanza':esc(cifraNotaPrivada(nfNecesaria(necesaria)))}</strong><small>${esc(exigencia.palabra)}</small></div></div>`:'<p class="pe-sub">'+(estado&&estado.pendiente===0?'Todas las notas ingresadas':'Aún no se puede calcular')+'</p>'}</section>
      <div class="pe-peso"><div><span>Peso evaluado</span><b>${progreso===null?'—':Math.round(progreso*100)+'%'}</b></div>${progreso===null?'':`<div class="pe-peso-barra" role="img" aria-label="${Math.round(progreso*100)}% del peso evaluable completado"><i style="width:${(progreso*100).toFixed(2)}%"></i></div><div class="pe-barra-extremos" aria-hidden="true"><span>0</span><span>50</span><span>100%</span></div>`}</div>
      <div class="pe-par-notas"><span>Primera nota<b>${notas.length?esc(cifraNotaPrivada(fmt(notas[0].nota))):'—'}</b></span><i aria-hidden="true">→</i><span>Última nota<b>${notas.length?esc(cifraNotaPrivada(fmt(notas.at(-1).nota))):'—'}</b></span></div>
    </aside></div>${evaluacionesPrivadasHTML(ramo,comp,contexto,ahora)}
    <details class="pe-categorias"><summary>Ver categorías y promedios</summary>${ramoPanelHTML(r,comp,ahora,contexto,'',true)}</details>`;
  });
}
function contenidoAlumnoEditorialHTML(al,compDe,compGeneral,ahora){
  const ramos=al.ramos||[];
  return `<div class="pe-ficha"><div class="pe-ramos" role="group" aria-label="Ramos compartidos">${ramos.map((r,i)=>`<button type="button" data-pe-ramo="${esc(r.id)}" aria-pressed="${i===0}">${esc(r.nombre)}</button>`).join('')}</div><div data-pe-ramo-contenido>${ramos.length?ramoAlumnoEditorialHTML(al,ramos[0],compDe(al,ramos[0]),compGeneral(al,ramos[0]),false,ahora):'<p class="pe-sub">Ya no tiene ramos compartidos.</p>'}</div><footer class="pe-quitar"><button type="button" class="settings-danger-btn" data-quitar-alumno="${esc(al.id)}" data-nombre="${esc(al.nombre_visible)}">Quitar de mi lista</button></footer></div>`;
}
