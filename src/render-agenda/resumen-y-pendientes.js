
function resumenSemanaAgenda(pendientes){
  const semana=pendientes.filter(e=>e.dias>=0&&e.dias<=7);
  if(!semana.length)return null;
  const pesos=semana.map(pesoEventoAgenda);
  return {cantidad:semana.length,peso:pesos.some(p=>p===null)?null:r2(pesos.reduce((total,p)=>total+p,0))};
}

function resumenSemanaHTML(pendientes){
  const resumen=resumenSemanaAgenda(pendientes);
  if(!resumen)return '';
  return `<div class="ag-list-hd ag-week-hd">
    <span class="section-hd-title">Próximos 7 días</span>
    <span class="ag-count">${resumen.cantidad} eval. · ${resumen.peso===null?'peso variable':resumen.peso+'%'}</span>
  </div>`;
}

function agendaSinFechaHTML(sinFecha){
  if(!sinFecha.length)return '';
  const primera=sinFecha[0];
  return `<section class="ag-undated" aria-label="Evaluaciones sin fecha">
    <div class="ag-undated-copy">
      <span class="ag-undated-kicker">Por completar</span>
      <strong>${sinFecha.length} ${sinFecha.length===1?'evaluación':'evaluaciones'} sin fecha</strong>
      <span>Parte por ${esc(primera.cat.nombre)} · ${esc(primera.ramo.nombre)}</span>
    </div>
    <button type="button" class="ag-undated-action" data-agenda-action="agregar-fecha">Agregar fecha</button>
  </section>`;
}

// Lo que hay que resolver y no tiene una fecha por delante: mandar a
// recorregir, fechas pasadas sin nota y evaluaciones sin fecha. Lo de hoy y
// mañana NO va acá: es lo más próximo que hay y vive en "Tus prioridades".
// Va debajo de las prioridades y plegado como "Después".
function pendientesDeAgenda(ahora){return pendientes(ahora).filter(p=>p.tipo!=='hoy');}
function agendaPendientesHTML(items,ahora=new Date()){
  if(!items.length)return '';
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  const fechaAntigua=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()-42);
  const limiteRevision=isoOf(fechaAntigua.getFullYear(),fechaAntigua.getMonth(),fechaAntigua.getDate());
  const etiqueta=p=>p.tipo==='hoy'?(p.fecha===hoy?'Hoy':'Mañana')
    :p.tipo==='recorregir'?'Mandar a recorregir'
    :p.tipo==='sin-nota'?(p.fecha<limiteRevision?'Revisar fecha':'Fecha pasada sin nota'):'Sin fecha';
  const accion=p=>p.tipo==='sin-fecha'?'agregar-fecha'
    :p.tipo==='sin-nota'?'completar-nota':'ver-pendiente';
  const fechaTexto=p=>{
    if(!p.fecha)return '';
    const f=formatEventDate(p.fecha);
    return `${p.tipo==='recorregir'?'Plazo: ':''}${f.day} ${f.mon}`;
  };
  const ocultas=Math.max(0,items.length-AGENDA_RESTANTES_VISIBLES);
  const plegada=!agendaPendientesAbiertas&&ocultas>0;
  const visibles=plegada?items.slice(0,AGENDA_RESTANTES_VISIBLES+1):items;
  // La cuarta asoma borrosa, como en "Después". No se toca ni se lee por su
  // cuenta: el botón de abajo es el que despliega.
  const fantasma=html=>html.replace(/^<(article|button)( type="button")? class="/,'<$1$2 inert aria-hidden="true" class="ag-event-fantasma ');
  return `<section aria-label="Pendientes" class="ag-pendientes">
    <div class="ag-list-hd"><span class="section-hd-title">Pendientes</span><span class="ag-count">${items.length}</span>${
      agendaPendientesAbiertas&&ocultas>0?`<button type="button" class="ag-rest-toggle" data-agenda-action="toggle-pendientes">Ver menos</button>`:''}</div>
    ${visibles.map((p,i)=>{const fila=filaPendiente(p);return plegada&&i===AGENDA_RESTANTES_VISIBLES?fantasma(fila):fila;}).join('')}
    ${plegada?`<button type="button" class="ag-rest-ver" data-agenda-action="toggle-pendientes">Ver ${ocultas} más</button>`:''}
  </section>`;
  function filaPendiente(p){return p.tipo==='recorregir'?`<article class="ag-recorreccion-row" style="margin-bottom:9px;border:1px solid var(--border);border-radius:8px;background:var(--card)">
      <span class="ag-recorreccion-mark" aria-hidden="true"></span>
      <button type="button" data-agenda-action="ver-pendiente" data-ramo-id="${esc(p.ramo.id)}" data-cat-id="${esc(p.cat.id)}" data-nota-id="${esc(p.nota.id)}"
        style="min-width:0;min-height:44px;padding:0;border:0;background:none;color:var(--fg);text-align:left;font:inherit">
        <strong>${esc(p.nombre)}</strong><span>${esc(p.ramo.nombre)}${p.fecha?` · ${esc(fechaTexto(p))}`:''}</span>
      </button>
      <button type="button" data-agenda-action="resolver-recorreccion" data-ramo-id="${esc(p.ramo.id)}" data-cat-id="${esc(p.cat.id)}" data-nota-id="${esc(p.nota.id)}" style="min-height:44px">Ya la mandé</button>
    </article>`:`<button type="button" class="ag-row" data-agenda-action="${accion(p)}"
      data-ramo-id="${esc(p.ramo.id)}" data-cat-id="${esc(p.cat.id)}" data-nota-id="${esc(p.nota?.id||'')}">
      <span class="ag-row-bar" style="background:${esc(p.ramo.color||'var(--primary)')}" aria-hidden="true"></span>
      <div class="ag-row-main">
        <div class="ag-row-top"><span class="ag-row-when">${etiqueta(p)}</span>${p.fecha?`<span class="ag-row-date">${esc(fechaTexto(p))}</span>`:''}</div>
        <div class="ag-row-name">${esc(p.nombre)}</div>
        <div class="ag-row-sub">${esc(p.ramo.nombre)}</div>
      </div>
      <span class="chevron-r" aria-hidden="true">›</span>
    </button>`;}
}

function completarNotaDesdeAgenda(ramoId,catId,notaId){
  openRamo(ramoId);
  // La nota con fecha propia ya existe y se edita; una categoría con varias
  // notas abre el modal para agregar otra. La evaluación directa queda visible
  // en la ficha con su campo de nota listo para escribir.
  setTimeout(()=>{
    if(notaId)openEditNotaModal(catId,notaId);
    else{
      const r=S.ramos.find(x=>x.id===ramoId);
      const c=r&&(r.categorias||[]).find(x=>x.id===catId);
      if(c&&c.directNota===false)openAddNotaModal(catId);
    }
  },320);
}

function corregirFechaDesdeAgenda(ramoId,catId,notaId){
  openRamo(ramoId);
  setTimeout(()=>{
    if(notaId)openEditNotaModal(catId,notaId);
    else openEditCatModal(catId);
  },320);
}

function agendaFechasPasadasHTML(eventos){
  if(!eventos.length)return '';
  const ordenados=[...eventos].sort((a,b)=>{
    const revisarA=a.estadoAgenda==='requiere_revision'?1:0;
    const revisarB=b.estadoAgenda==='requiere_revision'?1:0;
    return revisarB-revisarA||b.fecha.localeCompare(a.fecha);
  });
  return `<section class="ag-waiting" aria-label="Fechas pasadas sin nota">
    <div class="ag-waiting-head">
      <div>
        <span class="ag-waiting-kicker">Por completar</span>
        <strong>Fechas pasadas sin nota</strong>
      </div>
      <span class="ag-count">${ordenados.length}</span>
    </div>
    <p class="ag-waiting-help">Si ya la rendiste, agrega la nota. Si se movió, corrige la fecha.</p>
    <div class="ag-waiting-list">${ordenados.map(e=>{
      const f=formatEventDate(e.fecha);
      const notaId=e.nota?e.nota.id:'';
      const revisar=e.estadoAgenda==='requiere_revision';
      return `<article class="ag-waiting-row${revisar?' needs-review':''}">
        <span class="ag-row-bar" style="background:${esc(e.ramo.color)}"></span>
        <div class="ag-waiting-copy">
          <span class="ag-waiting-meta">${revisar?'<b>Revisar fecha</b>':''}<span>${cuandoTexto(e.dias)} · ${f.day} ${f.mon}</span></span>
          <strong>${esc(nombreEventoAgenda(e))}</strong>
          <span>${esc(e.ramo.nombre)}</span>
        </div>
        <div class="ag-waiting-actions">
          <button type="button" class="ag-waiting-primary" data-agenda-action="completar-nota" data-ramo-id="${esc(e.ramo.id)}" data-cat-id="${esc(e.cat.id)}" data-nota-id="${esc(notaId)}">${e.nota?'Completar nota':'Poner nota'}</button>
          <button type="button" class="ag-waiting-secondary" data-agenda-action="corregir-fecha" data-ramo-id="${esc(e.ramo.id)}" data-cat-id="${esc(e.cat.id)}" data-nota-id="${esc(notaId)}">Corregir fecha</button>
        </div>
      </article>`;
    }).join('')}</div>
  </section>`;
}
