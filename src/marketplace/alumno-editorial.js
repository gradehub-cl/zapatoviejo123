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
function evaluacionesPrivadasHTML(ramo,comp,contexto,ahora,al=null){
  const hoy=diaLocalPanel(ahora);let eventos=[];
  try{eventos=agendaEvents([ramo]);}catch(e){}
  const proximas=eventos.filter(e=>e.pending&&e.fecha>=hoy).sort((a,b)=>String(a.fecha||'').localeCompare(String(b.fecha||'')));
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
      const percentil=al?percentilEvaluacionPanel(al,ramo,n.id,comp):null;
      const peso=cat?pesoEvaluacionPrivada({ramo,cat,nota:n,historialRendida:true}):'';
      return `<tr><th scope="row">${esc(n.nombre)}<small>${fechas.has(n.id)?esc(fechaCorta(fechas.get(n.id))):'Sin fecha'}${peso?' · '+esc(peso):''}</small></th>
        <td><b>${esc(cifraNotaPrivada(fmt(n.valor)))}</b><small>${notaAprobada(n.valor)?'Aprobada':'Bajo 4,0'}</small></td><td>${ref===null?'<span aria-label="Comparación no disponible">No disponible</span>':esc(cifraNotaPrivada(fmtPromedio(ref)))+`<small>${esc(textoMuestraPanel(muestra))}</small>`}${percentil===null?'':`<small>Percentil ${Math.round(percentil)} en GradeHub</small>`}</td></tr>`;
    }).join('')}</tbody></table></div>`:'<p class="pe-sub">Todavía no tiene notas.</p>'}</section>`;
}
// Modelo de presentación: notas del ramo actual, identidades de #976 y motor compartido.
// No guarda notas ni convierte las marcas futuras en resultados.
function filasFichaAlumnoPanel(al,r,comp){
  const pre=preparacionRamoPanel(al,r),fechas=new Map(evaluacionesConFechaPanel(r,comp).evaluaciones.map(e=>[e.id,e.fecha]));
  let eventos=[];try{eventos=agendaEvents([r]);}catch(e){}
  const filas=[],ids=new Set();
  const agregar=(c,n,e,indice=null)=>{
    const nota=n&&Number.isFinite(n.valor)?n.valor:null;
    const fecha=fechas.get(n?.id)||n?.fecha||e?.fecha||c.fecha||null;
    filas.push({id:n?.id||null,nombre:n?.nombre||e?.nombre||c.nombre,fecha,nota,
      peso:pesoEvaluacionPrivada({ramo:r,cat:c,nota:n||null,historialRendida:nota!==null}),indice,
      muestra:nota===null?null:comparacionEvaluacionPrivada(r,n,comp),
      preparada:pre?.manual?!!e&&(pre.marcas||[]).some(m=>!m.huerfana&&(e.nota_id?m.nota_id===e.nota_id:!m.nota_id&&m.cat_id===e.cat_id&&m.numero===e.numero)):
        !!fecha&&!!inicioRamoPanel(al,r).dia&&fecha>=inicioRamoPanel(al,r).dia,
      ambigua:!!e?.ambigua});
    if(n?.id)ids.add(n.id);
  };
  (pre?.evaluaciones||[]).forEach((e,i)=>{
    const c=(r.categorias||[]).find(c=>c.id===e.cat_id);if(!c)return;
    const n=(c.notas||[]).find(n=>n.id===e.nota_id);
    agregar(c,n,e,i);
  });
  (r.categorias||[]).forEach(c=>{
    (c.notas||[]).filter(n=>!ids.has(n.id)).forEach(n=>agregar(c,n,null));
    if(!pre?.evaluaciones?.some(e=>e.cat_id===c.id)&&!(c.notas||[]).length){
      eventos.filter(e=>e.cat.id===c.id&&e.pending).forEach(e=>agregar(c,null,{nombre:e.nota?.nombre||c.nombre,fecha:e.fecha}));
    }
  });
  return filas;
}
function datosFichaAlumnoPanel(al,r,comp){
  return conRamosAlumnoPanel(al,contexto=>{
    const ramo=ramoParaPanel(r);
    // La ficha siempre muestra todas las evaluaciones del ramo. Solo pruebas
    // es un filtro de Estadísticas, no se hereda ocultamente al abrir el detalle.
    const alumno={...al,soloPruebasPanel:false};
    let necesaria=null;try{necesaria=notaNecesariaParaAprobar(ramo)?.valor??null;}catch(e){}
    return {promedio:ramoAvg(ramo,undefined,contexto),motivo:motivoPromedioAlumnoPanel(ramo,contexto),necesaria,
      filas:filasFichaAlumnoPanel(alumno,ramo,comp),metricas:metricasAlumnoRamoPanel(alumno,r,()=>comp)};
  });
}
function graficoFichaAlumnoHTML(m,id){
  const notas=m.evaluaciones.filter(e=>e.fecha).slice().sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if(!notas.length)return '<div class="fap-vacio">Todavía no tiene notas con fecha. Las notas sin fecha siguen abajo.</div>';
  const texto=e=>`${e.evaluacion} · ${fechaCorta(e.fecha)}`;
  const serie=notas.map(e=>({valor:e.nota,etiqueta:texto(e),antes:e.lado==='antes',valorTexto:cifraNotaPrivada(fmt(e.nota)),
    detalle:(e.curso===null?'Referencia no disponible':`Referencia ${cifraNotaPrivada(fmtPromedio(e.curso))} · vs. ${e.cursoPersonas} estudiantes en GradeHub`)+` · ${m.metodo==='manual'?(e.lado==='ahora'?'Preparada':'No preparada'):(e.lado==='ahora'?'Desde el inicio':'Antes del inicio')}`,
    lectura:`${texto(e)}, nota ${cifraNotaPrivada(fmt(e.nota))}`}));
  // Una referencia ausente corta la línea: no une muestras que no existen.
  let anterior=false;const trazo=notas.map((e,i)=>{
    if(e.curso===null){anterior=false;return '';}
    const x=notas.length===1?50:i/(notas.length-1)*100,y=(7-e.curso)/6*100;
    const punto=`${anterior?'L':'M'}${x},${y}`;anterior=true;return punto;
  }).join(' ').trim();
  return htmlGraficoEvolucion(serie,'ficha-'+id,'Notas de las evaluaciones',{recto:true,unPunto:true,marcas:[7,6,5,4,3,2,1],rotulo:n=>n,
    resumen:'Notas de 1 a 7. Línea continua: alumno. Discontinua: referencia. Puntos rellenos: preparadas o desde el inicio.'})
    .replace('</svg>',`<path class="fap-referencia" d="${trazo}"/></svg>`)+
    `<div class="fap-extremos"><span>${esc(fechaCorta(notas[0].fecha))}</span><span>${esc(fechaCorta(notas.at(-1).fecha))}</span></div>`;
}
function comparacionFichaAlumnoHTML(m,editable=true){
  const manual=m.metodo==='manual',a=m.antes.diferencia,b=m.ahora.diferencia,cambio=m.cambio;
  const cifra=v=>v===null?'—':signoEstPanel(v,'puntos');
  const limite=Math.max(2,Math.ceil(Math.abs(a)),Math.ceil(Math.abs(b))),pos=v=>posEstPanel(v*2/limite,'puntos');
  return `<div class="fap-metodo"><span>${manual?'Por evaluaciones marcadas':'Por fecha de inicio'}</span>${editable?'<button type="button" data-fap-editar>Marcar evaluaciones</button>':''}</div>
    <div class="fap-lados"><div><span>${manual?'Sin clases':'Antes del inicio'}</span><strong>${esc(cifra(a))}</strong></div><div><span>${manual?'Con clases':'Desde el inicio'}</span><strong>${esc(cifra(b))}</strong></div></div>
    ${cambio===null?'<p class="fap-insuficiente">Faltan evaluaciones comparables: al menos '+MIN_EVALS_COMPARACION+' a cada lado, con referencia disponible.</p>':
      `<div class="est-punto" role="img" aria-label="${esc((manual?'Sin clases ':'Antes del inicio ')+cifra(a)+'; '+(manual?'con clases ':'desde el inicio ')+cifra(b))}"><i class="est-tramo" style="left:${Math.min(pos(a),pos(b))}%;width:${Math.abs(pos(a)-pos(b))}%"></i><i class="est-a" style="left:${pos(a)}%"></i><i class="est-b" style="left:${pos(b)}%"></i></div><div class="fap-escala"><span>−${limite}</span><span>0</span><span>+${limite}</span></div>
      <div class="fap-cambio ${cifra(cambio).startsWith('+')?'fap-sube':cifra(cambio).startsWith('−')?'fap-baja':''}"><strong>${esc(cifra(cambio))}</strong><span>entre grupos</span>${ayudaDiferenciaHTML({metodo:m.metodo,frente:'frente al grupo'})}</div>`}
    <p class="fap-muted">${m.antes.nComparadas} / ${m.ahora.nComparadas} evaluaciones comparables</p>
    <details><summary>Cómo se calcula</summary><p>Nota menos promedio de GradeHub en la misma evaluación. Se requieren ${MIN_EVALS_COMPARACION} comparables por grupo y al menos 5 estudiantes por referencia. Las notas sin referencia no entran en esta diferencia.</p>${m.sinFecha?`<p>${m.sinFecha} notas sin fecha quedan fuera del corte temporal.</p>`:''}</details>`;
}
function ramoAlumnoEditorialHTML(al,r,comp,compUltima,seccionUltima,ahora){
  return conRamosAlumnoPanel(al,()=>{
  const d=datosFichaAlumnoPanel(al,r,comp),m=d.metricas,pre=preparacionRamoPanel(al,r),seccion=!!(comp?.sinSeccion||Number.isInteger(comp?.seccion));
  const muestra=datosComparacionPanel(comp?.ramo),ref=seccion?'Su sección':'Todo el ramo';
  const fila=(e)=>{
    const diferencia=e.nota!==null&&e.muestra?e.nota-e.muestra.promedio:null;
    const etiqueta=m.metodo==='manual'?(e.preparada?'Con clases':'Sin clases'):!e.fecha||!m.desde?'Sin corte por fecha':e.preparada?'Desde el inicio':'Antes del inicio';
    return `<li class="fap-fila"><div><b>${esc(e.nombre)}</b><small>${e.fecha?esc(fechaCorta(e.fecha)):'Sin fecha'} · ${esc(e.peso)}</small></div><strong class="fap-nota">${e.nota===null?'—':esc(cifraNotaPrivada(fmt(e.nota)))}</strong><div class="fap-ref">${e.muestra?esc(cifraNotaPrivada(fmtPromedio(e.muestra.promedio))):'—'}<small>${e.muestra?esc(textoMuestraPanel(e.muestra)):'No disponible'}</small></div><span class="fap-delta ${diferencia!==null&&signoEstPanel(diferencia,'puntos').startsWith('+')?'fap-sube':diferencia!==null&&signoEstPanel(diferencia,'puntos').startsWith('−')?'fap-baja':''}">${diferencia===null?'—':esc(signoEstPanel(diferencia,'puntos'))}</span><div class="fap-marca">${pre&&e.indice!==null&&!al.preparacion?.errorCarga?`<button type="button" data-fap-editar class="fap-marca-ver">${esc(etiqueta)} <span aria-hidden="true">✎</span></button><label class="fap-casilla" hidden><input type="checkbox" data-preparacion-eval="${e.indice}"${m.metodo==='manual'&&e.preparada?' checked':''}${e.ambigua?' disabled':''}><span>Preparada<span class="sr-only">: ${esc(e.nombre)}</span></span></label>`:esc(etiqueta)}</div></li>`;
  };
  const pendientes=d.filas.filter(e=>e.nota===null).sort((a,b)=>(a.fecha||'9999').localeCompare(b.fecha||'9999'));
  const pasadas=d.filas.filter(e=>e.nota!==null).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  const necesaria=d.necesaria===null?'Aún no se puede calcular lo necesario.':d.necesaria>7?'Con lo pendiente ya no alcanza para aprobar.':`Necesita ${cifraNotaPrivada(nfNecesaria(d.necesaria))} en cada evaluación pendiente para aprobar.`;
  return `<div class="fap-contexto"><span class="fap-sigla">${esc(r.sigla||'')}</span><span>${Number.isInteger(r.seccion)?'Sección '+esc(r.seccion):'Sin sección declarada'}</span></div>
    <div class="fap-grilla"><section class="est-tarjeta-grande fap-grafico"><div class="fap-promedio"><div><span>Promedio actual</span><strong>${d.promedio===null?'—':esc(cifraNotaPrivada(fmtPromedio(d.promedio)))}</strong></div><span>${pasadas.length} ${pasadas.length===1?'nota compartida':'notas compartidas'}</span></div>
    ${d.motivo?`<details class="fap-tope"><summary>${esc(d.motivo)} · Ver regla</summary>${ramoPanelHTML(r,comp,ahora,ramosDelAlumnoPanel(al),'',true)}</details>`:''}
    ${graficoFichaAlumnoHTML(m,r.id)}<div class="fap-leyenda"><span>● Alumno</span><span>┄ ${ref}</span><span>○ ${m.metodo==='manual'?'Sin clases':'Antes del inicio'} / ● ${m.metodo==='manual'?'Con clases':'Desde el inicio'}</span></div></section>
    <aside class="est-tarjeta-grande fap-comparacion"><h3>Frente al grupo</h3><div class="est-seg" role="group" aria-label="Referencia de toda la ficha">${[false,true].map(s=>`<button type="button" data-pe-grupo="${s?'seccion':'ramo'}" aria-pressed="${seccion===s}">${s?'Su sección':'Todo el ramo'}</button>`).join('')}</div><p class="fap-muted">${muestra?esc(textoMuestraPanel(muestra)):esc(estadoComparacionPrivada(comp))}</p>${comparacionFichaAlumnoHTML(m,!!pre&&!al.preparacion?.errorCarga)}
    <button type="button" class="fap-enlace" data-inicio-alumno="${esc(al.id)}" data-inicio-ramo="${esc(r.id)}">Editar inicio · ${inicioRamoPanel(al,r).dia?esc(fechaCorta(inicioRamoPanel(al,r).dia)):'Sin fecha'}</button></aside></div>
    <section class="est-tarjeta-grande fap-evaluaciones" data-preparacion-ramo="${esc(r.id)}"><header><div><h3>Evaluaciones</h3><p class="fap-muted">Preparación por evaluación, también las futuras</p></div>${pre&&!al.preparacion?.errorCarga?'<button type="button" class="est-control" data-fap-editar>Editar marcas</button>':''}</header>
    ${al.preparacion?.errorCarga?'<p role="status">No pudimos actualizar las marcas. Reabre Alumnos para reintentar; las anteriores siguen vigentes.</p>':''}
    <div class="fap-edicion" hidden><span data-fap-cambios role="status">Sin cambios</span><button type="button" class="fap-principal" data-preparacion-guardar disabled>Guardar marcas</button><button type="button" data-fap-cancelar>Cancelar</button><p data-preparacion-estado role="status"></p></div>
    <div class="fap-columnas" aria-hidden="true"><span>Evaluación / fecha</span><span>Nota</span><span>${ref}</span><span>Diferencia</span><span>Preparación</span></div>
    <h4>Próximas evaluaciones</h4><ul class="fap-lista">${pendientes.map(fila).join('')||'<li class="fap-vacio">Sin evaluaciones pendientes.</li>'}</ul>${pendientes.length?`<p class="fap-necesaria">${esc(necesaria)}</p>`:''}
    <h4>Evaluaciones pasadas</h4><ul class="fap-lista">${pasadas.map(fila).join('')||'<li class="fap-vacio">Todavía no tiene notas.</li>'}</ul>
    ${(pre?.marcas||[]).filter(m=>m.huerfana).map((m,i)=>`<p>Marca sin evaluación: ${esc(m.nombre)} <button type="button" data-preparacion-huerfana="${i}">Borrar marca</button></p>`).join('')}
    ${pre?.manual?'<details><summary>Método de preparación</summary><button type="button" data-preparacion-auto>Volver a usar la fecha de inicio</button></details>':''}</section>
    ${gruposParecidosFormularioHTML(al,r)}
    <footer class="fap-pie"><span>La diferencia no demuestra que se deba a las clases.</span><details><summary>Ver categorías y promedios</summary>${conRamosAlumnoPanel(al,contexto=>ramoPanelHTML(r,comp,ahora,contexto,'',true))}</details></footer>`;
  });
}
function contenidoAlumnoEditorialHTML(al,compDe,ramoId,ahora){
  const ramos=al.ramos||[],r=ramos.find(r=>String(r.id)===String(ramoId))||ramos[0];
  return `<div class="est fap"><div class="fap-herramientas"><div class="pe-ramos" role="group" aria-label="Ramos compartidos">${ramos.map(opcion=>`<button type="button" data-pe-ramo="${esc(opcion.id)}" aria-pressed="${opcion===r}">${esc(opcion.nombre)}</button>`).join('')}</div><div class="fap-navegacion" data-fap-navegacion></div></div><div data-pe-ramo-contenido>${r?ramoAlumnoEditorialHTML(al,r,compDe(al,r),null,false,ahora):'<p class="est-tarjeta-grande">Ya no tiene ramos compartidos.</p>'}</div><footer class="pe-quitar"><button type="button" class="settings-danger-btn" data-quitar-alumno="${esc(al.id)}" data-nombre="${esc(al.nombre_visible)}">Quitar de mi lista</button></footer></div>`;
}
