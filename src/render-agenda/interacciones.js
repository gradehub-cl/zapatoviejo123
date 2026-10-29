
function proximoDetalleAgenda(actual,nuevo){
  return actual===nuevo?null:nuevo;
}

function toggleAgendaDetalle(trigger){
  const item=trigger&&trigger.closest?trigger.closest('.ag-event'):null;
  const body=document.getElementById('agenda-body');
  if(!item||!body)return;
  const topAntes=trigger.getBoundingClientRect?trigger.getBoundingClientRect().top:null;
  const nuevo=proximoDetalleAgenda(agendaDetalleAbierto,item.dataset.agendaKey);
  agendaDetalleAbierto=nuevo;

  body.querySelectorAll('.ag-event').forEach(candidato=>{
    const boton=candidato.firstElementChild;
    const detalle=candidato.querySelector('.ag-event-detail');
    const abierto=!!nuevo&&candidato.dataset.agendaKey===nuevo;
    candidato.classList.toggle('expanded',abierto);
    if(boton)boton.setAttribute('aria-expanded',abierto?'true':'false');
    if(detalle)detalle.hidden=!abierto;
  });

  // Al cerrar una tarjeta anterior situada arriba, la tocada subiría varios
  // centímetros. Compensar esa diferencia conserva el punto de lectura móvil.
  if(Number.isFinite(topAntes)&&trigger.getBoundingClientRect&&typeof window.scrollBy==='function'){
    requestAnimationFrame(()=>{
      const topDespues=trigger.getBoundingClientRect().top;
      window.scrollBy(0,topDespues-topAntes);
    });
  }
}

function activarDetallesAgenda(body){
  body.querySelectorAll('.ag-event').forEach(item=>{
    const trigger=item.firstElementChild;
    const key=item.dataset.agendaKey;
    if(!trigger||!key)return;
    const chevron=item.querySelector('.ag-event-chevron');
    const chevronAnterior=trigger.querySelector('.chevron-r');
    if(chevronAnterior)chevronAnterior.remove();
    if(chevron)trigger.appendChild(chevron);
    trigger.classList.add('ag-event-trigger');
    trigger.id=`ag-trigger-${key}`;
    trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls',`ag-detail-${key}`);
    trigger.addEventListener('click',()=>toggleAgendaDetalle(trigger));
  });
}

// Los botones de la Agenda se resuelven desde un solo listener del contenedor.
// Así se conserva el teclado nativo de los botones y no se vuelve a abrir una
// puerta de scripts inline mientras los demás archivos migran por separado.
function activarAccionesAgenda(body){
  if(!body||body.dataset.agendaAccionesActivas)return;
  body.dataset.agendaAccionesActivas='true';
  body.addEventListener('click',evento=>{
    const boton=evento.target&&evento.target.closest?evento.target.closest('[data-agenda-action]'):null;
    if(!boton||!body.contains(boton))return;
    const accion=boton.dataset.agendaAction;
    evento.preventDefault();
    evento.stopPropagation();
    if(accion==='ordenar')cambiarOrdenAgenda(boton.dataset.agendaOrden);
    else if(accion==='ver-ramo')openRamo(boton.dataset.ramoId);
    else if(accion==='agregar-fecha'){
      const r=S.ramos.find(x=>x.id===boton.dataset.ramoId);
      const c=r&&(r.categorias||[]).find(x=>x.id===boton.dataset.catId);
      abrirFechaAgenda(r&&c?{ramo:r,cat:c}:agendaSinFecha()[0]);
    }
    else if(accion==='ver-pendiente')corregirFechaDesdeAgenda(boton.dataset.ramoId,boton.dataset.catId,boton.dataset.notaId||null);
    else if(accion==='completar-nota')completarNotaDesdeAgenda(boton.dataset.ramoId,boton.dataset.catId,boton.dataset.notaId||null);
    else if(accion==='corregir-fecha')corregirFechaDesdeAgenda(boton.dataset.ramoId,boton.dataset.catId,boton.dataset.notaId||null);
    else if(accion==='resolver-recorreccion')resolverRecorreccionAgenda(boton.dataset.ramoId,boton.dataset.catId,boton.dataset.notaId);
    else if(accion==='toggle-rendidas')toggleRendidasAgenda();
    else if(accion==='toggle-restantes')toggleRestantesAgenda();
    else if(accion==='toggle-pendientes')togglePendientesAgenda();
    else if(accion==='agregar-evaluacion'){
      openRamo(boton.dataset.ramoId);
      setTimeout(openAddCatModal,320);
    }else if(accion==='agregar-ramo')openAddRamoModal();
  });
}
