// Evaluaciones todavía pendientes que no aparecen en la línea de tiempo porque
// les falta fecha. Se ofrecen como acción, no como un dato perdido.
function agendaSinFecha(){
  const out=[];
  S.ramos.forEach(r=>{
    const calculo=calculoRamoConCompuertas(r);
    const pendientes=new Set(calculo.res.emptyLeaves.map(n=>n.id));
    (r.categorias||[]).forEach(c=>{
      if(c.fecha)return;
      const grupo=calculo.estructura.children.find(g=>g.id===c.id);
      // La estructura ya excluye eximidos y resuelve ausencias justificadas.
      if(!grupo||!(grupo.weight>0))return;
      const fechadas=new Set((c.notas||[]).filter(n=>n.fecha).map(n=>n.id));
      // Una primera nota no cierra las demás casillas. Tampoco se pide fecha
      // para las pendientes que ya aparecen con fecha propia en la Agenda.
      if(!grupo.children.length||grupo.children.some(n=>pendientes.has(n.id)&&!fechadas.has(n.id)))out.push({ramo:r,cat:c});
    });
  });
  return out;
}

function abrirFechaAgenda(item){
  if(!item)return;
  openRamo(item.ramo.id);
  setTimeout(()=>openEditCatModal(item.cat.id),320);
}

function resolverRecorreccionAgenda(ramoId,catId,notaId){
  const ramo=S.ramos.find(r=>r.id===ramoId);
  const cat=ramo&&(ramo.categorias||[]).find(c=>c.id===catId);
  const nota=cat&&(cat.notas||[]).find(n=>n.id===notaId);
  if(!nota||nota.recorreccionPendiente!==true)return;
  delete nota.recorreccionPendiente;
  delete nota.recorreccionHasta;
  save();renderAgenda();showToast('Listo, ya no te recordaremos mandarla');
}

function agendaRecorreccionesHTML(items){
  if(!items.length)return '';
  return `<section class="ag-recorrecciones">
    <div class="ag-list-hd"><span class="section-hd-title">Por mandar a recorregir</span><span class="ag-count">${items.length}</span></div>
    <div class="ag-recorreccion-list">${items.map(e=>`<article class="ag-recorreccion-row">
      <span class="ag-recorreccion-mark" aria-hidden="true"></span>
      <div><strong>${esc(nombreNotaCasilla(e.ramo,e.cat,e.nota))}</strong><span>${esc(e.ramo.nombre)} · aún no la mandas · ${esc(textoPlazoRecorreccion(e.plazo))}</span></div>
      <button type="button" data-agenda-action="resolver-recorreccion" data-ramo-id="${esc(e.ramo.id)}" data-cat-id="${esc(e.cat.id)}" data-nota-id="${esc(e.nota.id)}">Ya la mandé</button>
    </article>`).join('')}</div>
  </section>`;
}

// El orden es una preferencia de lectura de esta sesión, no un dato académico.
// No entra a S ni a gradehub_v1: cambiar cómo se mira la Agenda no justifica
// una migración del estado que ya tienen los estudiantes en producción.
const AGENDA_ORDENES=['recomendado','fecha','peso'];
let agendaOrdenActual='recomendado';
let agendaDetalleAbierto=null;
let agendaRendidasAbiertas=false;
// "Después" muestra tres y deja la siguiente asomada detrás.
//
// Antes caía la lista entera de una. Con un semestre cargado eso son quince o
// veinte evaluaciones seguidas, y una lista así deja de ser una agenda: el
// estudiante tiene que recorrerla para saber qué viene, que es justo lo que la
// pantalla venía a resolver. Las dos prioridades no se tocan.
let agendaRestantesAbiertas=false;
const AGENDA_RESTANTES_VISIBLES=3;
// Pendientes se pliega igual que "Después": va debajo de las prioridades, así
// que no puede empujarlas fuera de la pantalla con una lista larga.
let agendaPendientesAbiertas=false;

// La línea de tiempo exige fecha; el historial de notas no. Se arma aparte para
// que una evaluación rendida nunca desaparezca de la Agenda por no tenerla.
function agendaRendidas(){
  const out=[];
  let orden=0;
  S.ramos.forEach(r=>(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{
    if(!Number.isFinite(n.valor))return;
    out.push({
      fecha:n.fecha||c.fecha||null,
      hora:(n.fecha?n.hora:c.hora)||null,
      ramo:r,cat:c,nota:n,notas:[n],pending:false,targetCount:1,
      estadoAgenda:'con_nota',historialRendida:true,ordenPauta:orden++,
    });
  })));
  return out.sort((a,b)=>{
    if(a.fecha&&b.fecha)return b.fecha.localeCompare(a.fecha)||(b.hora||'').localeCompare(a.hora||'')||b.ordenPauta-a.ordenPauta;
    if(a.fecha)return -1;
    if(b.fecha)return 1;
    // Sin una fecha no se inventa cronología: la última fila de la pauta es la
    // referencia cerrada y el resto queda disponible al desplegar.
    return b.ordenPauta-a.ordenPauta;
  });
}

function toggleRendidasAgenda(){
  agendaRendidasAbiertas=!agendaRendidasAbiertas;
  renderAgenda();
}

function toggleRestantesAgenda(){
  agendaRestantesAbiertas=!agendaRestantesAbiertas;
  renderAgenda();
}
function togglePendientesAgenda(){
  agendaPendientesAbiertas=!agendaPendientesAbiertas;
  renderAgenda();
}

function ordenarAgenda(pendientes,orden='recomendado'){
  const criterio=AGENDA_ORDENES.includes(orden)?orden:'recomendado';
  // La hora también es cronología: dos pruebas el mismo día salían por puntaje
  // y "Después" podía apuntar a la de la tarde estando la de la mañana.
  const cuando=e=>`${e.fecha}T${e.hora||''}`;
  return [...pendientes].sort((a,b)=>{
    if(criterio==='fecha'){
      const porFecha=cuando(a).localeCompare(cuando(b));
      return porFecha||b.score-a.score;
    }
    if(criterio==='peso'){
      const porPeso=(pesoEventoAgenda(b)??-1)-(pesoEventoAgenda(a)??-1);
      return porPeso||cuando(a).localeCompare(cuando(b))||b.score-a.score;
    }
    // Hoy y mañana van primero, en orden de hora (Lucas, 2026-10-22): mañana
    // se rinde igual aunque en el ramo tengas un 7, y el puntaje la dejaba bajo
    // una de un ramo en riesgo que es en cinco días. Salvo un ramo que ya no
    // se puede aprobar: ese no compite por el foco (Lucas, 2026-10-20). Desde
    // pasado mañana manda el puntaje de siempre: cercanía × peso × riesgo.
    const inmediata=e=>e.dias>=0&&e.dias<=1&&!(e.necesita!=null&&e.necesita>7.05);
    if(inmediata(a)!==inmediata(b))return inmediata(a)?-1:1;
    if(inmediata(a))return cuando(a).localeCompare(cuando(b))||b.score-a.score;
    return b.score-a.score;
  });
}

function destacadasAgenda(pendientes,orden='recomendado'){
  return ordenarAgenda(pendientes,orden).slice(0,2);
}

function cambiarOrdenAgenda(orden){
  if(!AGENDA_ORDENES.includes(orden)||orden===agendaOrdenActual)return;
  agendaOrdenActual=orden;
  renderAgenda();
}

// Ordenar es un control secundario: se decide una vez y después se mira la
// lista. Tenía una franja propia con su etiqueta, así que competía de igual a
// igual con las evaluaciones; ahora viaja en la línea del encabezado, que es
// donde se espera un control de vista.
//
// Va en "Tus prioridades" y no en "Próximos 7 días" porque ese encabezado es
// condicional: sin nada esta semana se devuelve vacío y se llevaba el control
// con él. Quien tenía su próxima prueba en dos semanas se quedaba sin poder
// ordenar una lista de dieciséis evaluaciones, sin ningún error a la vista.
// "Tus prioridades" existe siempre que haya algo por venir, que es exactamente
// cuando ordenar significa algo. Además el orden elegido decide cuáles son las
// dos destacadas, así que el control queda al lado de lo que cambia.
