function agendaOrdenHTML(activo=agendaOrdenActual){
  const opciones=[['recomendado','Recomendado'],['fecha','Fecha'],['peso','Peso']];
  return `<div class="ag-order-options" role="group" aria-label="Ordenar evaluaciones pendientes">
      ${opciones.map(([valor,label])=>`<button type="button" class="ag-order-option${activo===valor?' active':''}" aria-pressed="${activo===valor?'true':'false'}" data-agenda-action="ordenar" data-agenda-orden="${valor}">${label}</button>`).join('')}
    </div>`;
}

function focoAgendaCopy(e){
  if(e.estadoAgenda==='esperando_nota'||e.estadoAgenda==='requiere_revision')return 'Fecha pasada: agrega la nota o corrige la fecha.';
  if(e.dias===0)return 'Es hoy. Revisa lo esencial y llega con lo importante resuelto.';
  if(e.dias===1)return 'Es mañana: es lo que más te conviene atender ahora.';
  if(e.dias<=2)return `Faltan ${e.dias} días: es lo que más te conviene atender ahora.`;
  if(e.necesita!==null&&e.necesita>5.0)return `Te exige ${nfNecesaria(e.necesita)} en lo pendiente para aprobar: adelántate.`;
  // Sin el "cuándo": la tarjeta ya lo dice en su propia línea justo arriba.
  return 'Por cercanía, peso y cómo vas.';
}

// Con el aviso rojo o ámbar del ramo en la tarjeta, la razón no lo repite:
// dice cuándo es o cuánto pesa.
function razonDestacadaAgenda(e,conAlerta=false){
  if(e.estadoAgenda==='esperando_nota'||e.estadoAgenda==='requiere_revision')return focoAgendaCopy(e);
  if(conAlerta){
    if(e.dias===0)return 'Es hoy. Revisa lo esencial y llega con lo importante resuelto.';
    if(e.dias===1)return 'Es mañana: es lo que más te conviene atender ahora.';
    if(e.dias===2)return 'Faltan 2 días: es lo que más te conviene atender ahora.';
    const pesoAlerta=pesoEventoAgenda(e);
    return pesoAlerta!==null&&pesoAlerta>=30?`Define ${r2(pesoAlerta)}% del ramo.`:'Por cercanía, peso y cómo vas.';
  }
  if(e.necesita!==null&&e.necesita>7.05)return 'Con lo pendiente ya no alcanza para aprobar el ramo.';
  if(e.necesita!==null&&e.necesita>5.0)return `Necesitas ${nfNecesaria(e.necesita)} en lo pendiente para aprobar.`;
  // Desde que hoy y mañana entran a las prioridades, "con tiempo" ya no aplica.
  if(e.avg!==null&&!notaAprobadaRamo(e.ramo,e.avg))return e.dias>=0&&e.dias<=1
    ?`Vas ${fmtPromedio(e.avg)} en el ramo y es ${e.dias===0?'hoy':'mañana'}: repasa lo esencial.`
    :`Vas ${fmtPromedio(e.avg)} en el ramo: conviene prepararla con tiempo.`;
  const peso=pesoEventoAgenda(e);
  if(peso!==null&&peso>=30)return `Define ${r2(peso)}% del ramo.`;
  return focoAgendaCopy(e);
}

function pesoEventoAgendaTexto(e){
  const peso=pesoEventoAgenda(e);
  return peso===null?`Peso variable · grupo ${r2(Number(e.cat.peso)||0)}%`:`${r2(peso)}%`;
}

function agendaDestacadaHTML(e,posicion){
  if(!e)return '';
  const f=formatEventDate(e.fecha);
  const alerta=e.mostrarAlerta?alertaRamoAgendaHTML(e):'';
  return `<button type="button" class="ag-priority-card ${e.nivel}" style="--ag-course:${esc(e.ramo.color)}">
    <span class="ag-priority-bar" aria-hidden="true"></span>
    <div class="ag-priority-top">
      <span class="ag-priority-rank ${e.nivel}">${posicion===0?'Tu foco ahora':'Siguiente'}</span>
      <span class="ag-priority-weight">${pesoEventoAgendaTexto(e)}</span>
    </div>
    <div class="ag-priority-date">${cuandoTexto(e.dias)} <span>· ${f.day} ${f.mon}${e.hora?' · '+esc(e.hora):''}</span></div>
    <div class="ag-priority-name">${esc(nombreEventoAgenda(e))}</div>
    <div class="ag-priority-course"><span class="ag-ramo-dot" style="background:${esc(e.ramo.color)}"></span>${esc(e.ramo.nombre)}</div>
    <div class="ag-priority-reason">${razonDestacadaAgenda(e,!!alerta)}</div>
    ${alerta}
  </button>`;
}

function agendaEventoKey(e){
  // Una categoría puede traer varias notas con fecha propia. La categoría sola
  // no alcanza como llave: dos casos distintos compartirían el mismo panel y
  // los atributos aria dejarían de apuntar a un detalle único.
  return `${e.ramo.id}--${e.cat.id}--${e.nota?.id||'categoria'}`.replace(/[^a-zA-Z0-9_-]/g,'-');
}

// La Agenda conoce la nota necesaria como promedio de TODO lo pendiente. Si
// quedan varias evaluaciones, presentarla como "la nota que necesitas aquí"
// sería una precisión falsa: depende de cómo le vaya en las demás.
function referenciaEvaluacionAgenda(e){
  if(e.estadoAgenda==='con_nota'||e.pending===false){
    const nota=avgPond(e.notas);
    return nota===null?{
      titulo:'Evaluación registrada',
      texto:'Abre el ramo para revisar cómo quedó anotada.',
    }:{
      titulo:`Nota registrada: ${fmt(nota)}`,
      texto:'Ya cuenta en el promedio actual del ramo.',
    };
  }
  const descarte=reglaDescarteConCantidadAbierta(e.ramo);
  if(descarte)return {
    titulo:'Todavía no hay una meta exacta',
    texto:`Depende de cuántas notas entren en ${descarte.nombre}.`,
  };
  if(e.necesita===null)return {
    titulo:'Todavía no hay una meta calculable',
    texto:'Completa la pauta del ramo para estimar cuánto necesitas.',
  };
  if(e.necesita>7.05)return {
    titulo:'No alcanza solo con lo pendiente',
    texto:'Abre el ramo para revisar alternativas y reglas de aprobación.',
  };
  if(e.necesita<=1.0)return {
    titulo:'Tienes margen para aprobar',
    texto:'Incluso un promedio bajo en lo pendiente mantiene el ramo sobre 4,0.',
  };
  return {
    titulo:`${nfNecesaria(e.necesita)} para aprobar`,
    texto:`Necesitas ${nfNecesaria(e.necesita)} promedio en lo pendiente para llegar a 4,0.`,
  };
}

function siguienteEvaluacionAgenda(actual,pendientes){
  const cronologia=ordenarAgenda(pendientes,'fecha');
  const indice=cronologia.findIndex(e=>agendaEventoKey(e)===agendaEventoKey(actual));
  if(indice>=0)return cronologia[indice+1]||null;
  // Las rendidas no pertenecen a la lista de pendientes, pero desde su detalle
  // todavía conviene saber cuál es la próxima cosa que sí queda por preparar.
  if(!actual.fecha)return cronologia[0]||null;
  return cronologia.find(e=>{
    const fechaActual=`${actual.fecha}T${actual.hora||'00:00'}`;
    const fechaCandidata=`${e.fecha}T${e.hora||'00:00'}`;
    return fechaCandidata>fechaActual;
  })||null;
}

function detalleEvaluacionAgendaHTML(e,pendientes){
  const referencia=referenciaEvaluacionAgenda(e);
  const siguiente=siguienteEvaluacionAgenda(e,pendientes);
  const key=agendaEventoKey(e);
  const despues=siguiente?{
    titulo:nombreEventoAgenda(siguiente),
    texto:`${cuandoTexto(siguiente.dias)} · ${siguiente.ramo.nombre}`,
  }:{
    titulo:'Nada más agendado',
    texto:'Es la última evaluación pendiente con fecha.',
  };
  return `<div class="ag-event-detail" id="ag-detail-${key}" role="region" aria-labelledby="ag-trigger-${key}" hidden>
    <div class="ag-event-detail-block">
      <span class="ag-event-detail-label">Tu referencia</span>
      <strong>${esc(referencia.titulo)}</strong>
      <span>${esc(referencia.texto)}</span>
    </div>
    <div class="ag-event-detail-block">
      <span class="ag-event-detail-label">Después</span>
      <strong>${esc(despues.titulo)}</strong>
      <span>${esc(despues.texto)}</span>
    </div>
    <button type="button" class="ag-event-course" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}">Ver ramo</button>
  </div>`;
}

function agendaEventoHTML(e,contenido,pendientes,tipo='row'){
  const key=agendaEventoKey(e);
  return `<div class="ag-event ag-event-${tipo}" data-agenda-key="${key}">
    ${contenido}
    <span class="ag-event-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg></span>
    ${detalleEvaluacionAgendaHTML(e,pendientes)}
  </div>`;
}

function agendaRendidaHTML(e){
  const a=avgPond(e.notas);
  const notaUnica=e.notas.length===1?e.notas[0]:null;
  const f=e.fecha?formatEventDate(e.fecha):null;
  return `<button type="button" class="ag-row done" style="--ag-course:${esc(e.ramo.color)}">
    <span class="ag-row-bar" style="background:${esc(e.ramo.color)}"></span>
    <div class="ag-row-main">
      <div class="ag-row-top"><span class="ag-row-when done">${f?`${f.day} ${f.mon}${e.hora?' · '+esc(e.hora):''}`:'Sin fecha'}</span><span class="ag-row-peso">${pesoEventoAgendaTexto(e)}</span></div>
      <div class="ag-row-name">${esc(nombreEventoAgenda(e))}</div>
      <div class="ag-row-sub"><span class="ag-ramo-dot" style="background:${esc(e.ramo.color)}"></span>${esc(e.ramo.nombre)}</div>
    </div>
    ${a!==null?`<span class="ramo-nota ${colorClass(a)}" style="--grade-color:${getColor(a)};min-width:auto;font-size:1.1875rem;">${notaUnica?textoCalificacionNota(notaUnica):fmtPromedio(a)}</span>`:""}
    <span class="chevron-r">›</span>
  </button>`;
}

function agendaRendidasHTML(items,pendientes){
  if(!items.length)return '';
  const visibles=agendaRendidasAbiertas?items:items.slice(0,1);
  return `<section class="ag-rendidas">
    <button type="button" class="ag-rendidas-toggle" data-agenda-action="toggle-rendidas" aria-expanded="${agendaRendidasAbiertas?'true':'false'}">
      <span class="section-hd-title">Ya rendidas</span><span class="ag-count">${items.length}</span>
      <span class="ag-rendidas-hint">${agendaRendidasAbiertas?'Ver última':'Ver todas'}</span>
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
    </button>
    <div class="ag-rendidas-list">${visibles.map(e=>agendaEventoHTML(e,agendaRendidaHTML(e),pendientes,'done')).join('')}</div>
  </section>`;
}
