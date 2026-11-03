
function renderAgenda(){
  const body=document.getElementById("agenda-body");if(!body)return;
  activarAccionesAgenda(body);
  agendaDetalleAbierto=null;
  const resumenInicial=document.getElementById('agenda-sub');
  if(resumenInicial)resumenInicial.textContent='';
  const events=agendaEvents();
  const sinFecha=agendaSinFecha();
  const rendidas=agendaRendidas();
  const ahora=new Date();
  const listaPendientes=pendientesDeAgenda(ahora);

  const expBtn=document.getElementById("agenda-export-btn");
  // Importar fechas sirve justo cuando la Agenda aún no tiene ninguna. El menú
  // decide cuáles opciones de salida aplican; esconder el acceso lo volvería
  // inaccesible para su caso principal.
  if(expBtn)expBtn.style.display="block";

  if(events.length===0&&listaPendientes.length===0&&rendidas.length===0){
    const hayRamos=S.ramos.length>0;
    const primerRamo=hayRamos?S.ramos[0]:null;
    const primeraSinFecha=sinFecha[0];
    const title=primeraSinFecha?"Anota tu primera fecha":hayRamos?"Agrega tus evaluaciones":"Agrega tu primer ramo";
    const desc=primeraSinFecha
      ? `Tienes ${sinFecha.length} ${sinFecha.length===1?'evaluación sin fecha':'evaluaciones sin fecha'}. Puedes partir por ${esc(primeraSinFecha.cat.nombre)}.`
      : hayRamos
      ? "Registra tus pruebas, entregas y exámenes para organizarlos acá."
      : "Después podrás poner fecha a sus evaluaciones y ver qué se viene.";
    const ctaLabel=primeraSinFecha?"Poner primera fecha":hayRamos?"Agregar evaluación":"Agregar mi primer ramo";
    const ctaAction=primeraSinFecha?'agregar-fecha':hayRamos?'agregar-evaluacion':'agregar-ramo';
    const ctaRamo=hayRamos?` data-ramo-id="${esc(primerRamo.id)}"`:'';
    body.innerHTML=`
      <div class="ag-empty">
        <div class="ag-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16h40"/><path d="M12 32h40"/><path d="M12 48h26"/>
            <circle cx="6" cy="16" r="2.4" fill="currentColor" stroke="none"/>
            <circle cx="6" cy="32" r="2.4" fill="currentColor" stroke="none"/>
            <circle cx="6" cy="48" r="2.4" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div class="ag-empty-title">${title}</div>
        <div class="ag-empty-desc">${desc}</div>
        <button type="button" class="ag-empty-cta" data-agenda-action="${ctaAction}"${ctaRamo}>${ctaLabel}</button>
      </div>`;
    return;
  }

  if(events.length===0){
    body.innerHTML=agendaPendientesHTML(listaPendientes,ahora)+agendaRendidasHTML(rendidas,[]);
    const sub=document.getElementById('agenda-sub');
    if(sub)sub.textContent=listaPendientes.length?`${listaPendientes.length} pendiente${listaPendientes.length!==1?'s':''}`:'Todo al día';
    activarDetallesAgenda(body);
    return;
  }

  const clasificados=events.map(e=>({...e,estadoAgenda:estadoEventoAgenda(e)}));
  const eventosPendientes=clasificados.filter(e=>e.estadoAgenda!=='con_nota').map(withPriority);
  // Hoy y mañana también: son lo más próximo y van en "Tus prioridades".
  const porVenir=eventosPendientes.filter(e=>e.estadoAgenda==='por_venir');
  const fechasPasadas=eventosPendientes.filter(e=>e.estadoAgenda==='esperando_nota'||e.estadoAgenda==='requiere_revision');
  const fechasPorRevisar=fechasPasadas.filter(e=>e.estadoAgenda==='requiere_revision');
  const ordenadas=ordenarAgenda(porVenir,agendaOrdenActual);

  // Subtítulo del hero: resume el estado en una línea
  const sub=document.getElementById('agenda-sub');
  if(sub){
    if(listaPendientes.length>0){
      sub.textContent=`${listaPendientes.length} pendiente${listaPendientes.length!==1?'s':''}${porVenir.length?` · ${porVenir.length} por venir`:''}`;
    }else if(porVenir.length===0&&fechasPasadas.length===0){
      sub.textContent='Todo al día';
    }else if(porVenir.length===0){
      sub.textContent=`${fechasPasadas.length} fecha${fechasPasadas.length!==1?'s':''} pasada${fechasPasadas.length!==1?'s':''} sin nota`;
    }else{
      const prox=porVenir.reduce((min,e)=>e.dias<min.dias?e:min,porVenir[0]);
      const partes=[`${porVenir.length} por venir`,`la próxima ${cuandoTexto(prox.dias).toLowerCase()}`];
      if(fechasPasadas.length)partes.push(`${fechasPasadas.length} sin nota`);
      if(fechasPorRevisar.length)partes.push(`${fechasPorRevisar.length} por revisar`);
      sub.textContent=partes.join(' · ');
    }
  }

  // Las prioridades van siempre arriba; Pendientes, debajo y plegado.
  let html='';

  // Las dos primeras se leen antes de escanear la lista. El orden elegido
  // también decide cuáles son: "Recomendado" usa la mezcla académica existente;
  // Fecha y Peso son overrides explícitos del estudiante.
  if(porVenir.length>0){
    const destacadas=destacadasAgenda(porVenir,agendaOrdenActual);
    // El aviso del ramo va en su primera aparición, sea tarjeta o fila.
    const ramosConAviso=new Set();
    destacadas.forEach(e=>{e.mostrarAlerta=!ramosConAviso.has(e.ramo.id);ramosConAviso.add(e.ramo.id);});
    const restantes=ordenadas.slice(destacadas.length);
    html+=`<div class="ag-priority-heading">${agendaOrdenHTML(agendaOrdenActual)}</div>`;
    // Las dos iban lado a lado, en mitades iguales. En 375px esa mitad no
    // alcanzaba para el contenido: "Métodos Matemáti", "es lo que más te
    // convie…". Y sobre todo, dos cosas del mismo tamaño no son una jerarquía:
    // si las dos gritan igual, el estudiante tiene que leer las dos para saber
    // cuál es primero. Ahora la primera ocupa el ancho y la segunda va debajo,
    // más contenida — se ve cuál manda antes de leer nada.
    html+=`<div class="ag-priority-stack">${destacadas.map((e,i)=>agendaEventoHTML(e,agendaDestacadaHTML(e,i),porVenir,i===0?'priority':'priority-sec')).join('')}</div>`;
    // La alerta de "necesitas X para aprobar" es del ramo, no de la evaluación:
    // se muestra solo en la más prioritaria de cada ramo para no repetirla.
    const ramosVistos=new Set(destacadas.map(e=>e.ramo.id));
    restantes.forEach(e=>{
      e.mostrarAlerta=!ramosVistos.has(e.ramo.id);
      ramosVistos.add(e.ramo.id);
    });
    if(restantes.length){
      const ocultas=Math.max(0,restantes.length-AGENDA_RESTANTES_VISIBLES);
      const plegada=!agendaRestantesAbiertas&&ocultas>0;
      // Plegada se dibujan cuatro: tres enteras y la siguiente a medio salir,
      // borrosa. No es un decorado ni una copia: es la fila de verdad, con su
      // markup normal y una clase encima. Anidarla dentro de un botón dejaba el
      // contenido vacío y sacaba su detalle fuera de la lista.
      const visibles=plegada?restantes.slice(0,AGENDA_RESTANTES_VISIBLES+1):restantes;
      html+=`<div class="ag-list-hd ag-rest-heading"><span class="section-hd-title">Después</span><span class="ag-count">${restantes.length}</span>${
        agendaRestantesAbiertas&&ocultas>0
          ? `<button type="button" class="ag-rest-toggle" data-agenda-action="toggle-restantes">Ver menos</button>`
          : ''}</div>`;
      html+=`<div class="ag-rest-list${plegada?' plegada':''}">${
        visibles.map((e,i)=>{
          const fantasma=plegada&&i===AGENDA_RESTANTES_VISIBLES;
          const fila=agendaEventoHTML(e,agendaItemHTML(e,medidorRamoAgendaHTML),porVenir);
          return fantasma?fila.replace('class="ag-event ','class="ag-event ag-event-fantasma '):fila;
        }).join('')}`;
      if(plegada){
        html+=`<button type="button" class="ag-rest-ver" data-agenda-action="toggle-restantes">Ver ${ocultas} más</button>`;
      }
      html+=`</div>`;
    }
  } else if(!listaPendientes.length){
    html+=`<div class="ag-alldone">
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      <div><div class="ag-alldone-t">Nada pendiente.</div><div class="ag-alldone-s">Todas tus evaluaciones con fecha ya están rendidas.</div></div>
    </div>`;
  }

  html+=agendaPendientesHTML(listaPendientes,ahora);
  html+=agendaRendidasHTML(rendidas,porVenir);

  body.innerHTML=html;
  activarDetallesAgenda(body);
}
