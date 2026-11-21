// Agenda por Día y por Mes (Lucas, 2026-11-18; maqueta aprobada en
// .claude/maqueta-agenda-dia-semana-mes.html). La Semana vive en
// horario-semana.js. Todo lee lo de siempre —agendaEvents(), el horario de
// cada ramo, pendientes()— y no escribe nada: tocar algo abre la ficha, la hoja
// de la clase o la acción de siempre de la Agenda.

// ─── Fechas (hora de Chile, como el horario) ────────────────────────────────
function isoHoyAgenda(ahora=new Date()){return fechaHorarioChile(ahora);}
function sumarDiasAgenda(iso,n){
  const [a,m,d]=iso.split('-').map(Number);
  return new Date(Date.UTC(a,m-1,d+n,12)).toISOString().slice(0,10);
}
// Clave del día en DIAS_HORARIO: L M W J V S D.
function claveDiaAgenda(iso){
  const [a,m,d]=iso.split('-').map(Number);
  return ['D','L','M','W','J','V','S'][new Date(Date.UTC(a,m-1,d,12)).getUTCDay()];
}
function lunesAgenda(iso){
  const i=DIAS_HORARIO.findIndex(([k])=>k===claveDiaAgenda(iso));
  return sumarDiasAgenda(iso,-i);
}
const MESES_AGENDA=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function nombreFechaAgenda(iso){
  const dia=DIAS_HORARIO.find(([k])=>k===claveDiaAgenda(iso))[1];
  return `${dia} ${Number(iso.slice(8))} de ${MESES_AGENDA[Number(iso.slice(5,7))-1]}`;
}
function rangoSemanaAgenda(lunes){
  const vie=sumarDiasAgenda(lunes,4),mes=iso=>MESES_AGENDA[Number(iso.slice(5,7))-1];
  return mes(lunes)===mes(vie)?`${Number(lunes.slice(8))} – ${Number(vie.slice(8))} de ${mes(vie)}`
    :`${Number(lunes.slice(8))} de ${mes(lunes)} – ${Number(vie.slice(8))} de ${mes(vie)}`;
}
const horaValidaAgenda=h=>typeof h==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(h);
function diasEntreAgenda(desde,hasta){
  const t=iso=>{const [a,m,d]=iso.split('-').map(Number);return Date.UTC(a,m-1,d);};
  return Math.round((t(hasta)-t(desde))/86400000);
}

// ─── Piezas compartidas ─────────────────────────────────────────────────────
// Texto sobre un bloque relleno con el color del ramo: blanco o casi negro,
// el que contraste más (los dos colores del ramo dan ≥4,5:1 con alguno). Si
// el color no se puede leer, el bloque usa el texto del tema.
function textoSobreColorAgenda(color){
  const m=/^#([0-9a-f]{6})$/i.exec(String(color||'').trim());if(!m)return '';
  const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  const n=parseInt(m[1],16),L=0.2126*lin(n>>16&255)+0.7152*lin(n>>8&255)+0.0722*lin(n&255);
  return 1.05/(L+0.05)>=(L+0.05)/0.05?'#ffffff':'#111113';
}
// ‹ etiqueta › y «Hoy» cuando no se está en hoy. Botones de 44 pt.
// `nota`: una línea chica sobre la etiqueta («La semana que viene»).
function navAgendaHTML(etiqueta,tipo,mostrarHoy,nota=''){
  const que=tipo==='mes'?'Mes':tipo==='semana'?'Semana':'Día';
  return `<div class="agenda-nav" data-agenda-nav-tipo="${tipo}">
    <span class="agenda-nav-texto" aria-live="polite">${nota?`<small class="agenda-nav-nota">${esc(nota)}</small>`:''}<b class="agenda-nav-titulo">${esc(etiqueta)}</b></span>
    <div class="agenda-nav-botones">
      ${mostrarHoy?'<button type="button" class="agenda-nav-hoy" data-agenda-nav="0">Hoy</button>':''}
      <button type="button" class="agenda-nav-flecha" data-agenda-nav="-1" aria-label="${que} anterior">‹</button>
      <button type="button" class="agenda-nav-flecha" data-agenda-nav="1" aria-label="${que} siguiente">›</button>
    </div></div>`;
}
function enlazarNavAgenda(raiz,alMover){
  raiz.querySelectorAll('[data-agenda-nav]').forEach(b=>b.addEventListener('click',()=>{
    const tipo=b.closest('[data-agenda-nav-tipo]')?.dataset.agendaNavTipo,paso=Number(b.dataset.agendaNav);
    alMover(paso);
    // Tras repintar, el foco vuelve al mismo control (o a la flecha, si «Hoy» ya no está).
    (document.querySelector(`[data-agenda-nav-tipo="${tipo}"] [data-agenda-nav="${paso}"]`)
      ||document.querySelector(`[data-agenda-nav-tipo="${tipo}"] [data-agenda-nav="1"]`))?.focus();
  }));
}
function etiquetaEventoAgenda(e){
  return `Evaluación: ${nombreEventoAgenda(e)}, ${e.ramo.nombre}, ${nombreFechaAgenda(e.fecha)}${horaValidaAgenda(e.hora)?' a las '+e.hora:''}`;
}
// Una evaluación en una lista: abre la ficha del ramo (acción «ver-ramo» de la Agenda).
function eventoAgendaFilaHTML(e,{conFecha=false}={}){
  const detalle=[e.ramo.nombre,horaValidaAgenda(e.hora)?e.hora:'',conFecha?nombreFechaAgenda(e.fecha):''].filter(Boolean).join(' · ');
  return `<button type="button" class="agenda-fila-eval" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}" style="--ramo:${esc(e.ramo.color||'var(--fg3)')}" aria-label="${esc(etiquetaEventoAgenda(e))}">
    <i aria-hidden="true"></i><span><span class="agenda-fila-t">${esc(nombreEventoAgenda(e))}</span><span class="agenda-fila-s">${esc(detalle)}</span></span></button>`;
}
// «Necesitas X» es el promedio que pide lo pendiente del ramo, no una meta de
// esta prueba: se dice así. Sin dato no se muestra; sobre 7 no alcanza.
function necesitaAgendaHTML(e){
  if(e.estadoAgenda==='con_nota'||!Number.isFinite(e.necesita))return '';
  const imposible=e.necesita>7.05;
  return `<span class="agenda-dia-nec"><small>${imposible?'Lo pendiente':'Necesitas'}</small><b>${imposible?'No alcanza':nfNecesaria(Math.max(1,e.necesita))}</b><small>${imposible?'para aprobar':'en lo pendiente'}</small></span>`;
}
function filaEvaluacionDiaHTML(e,hora){
  return `<button type="button" class="agenda-dia-fila es-eval" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}" style="--ramo:${esc(e.ramo.color||'var(--fg3)')}" aria-label="${esc(etiquetaEventoAgenda(e))}">
        <span class="agenda-dia-hora">${esc(hora)}</span><i aria-hidden="true"></i><span><b><em>Evaluación</em> ${esc(nombreEventoAgenda(e))}</b><span>${esc(e.ramo.nombre)}</span></span></button>`;
}

// ─── DÍA ────────────────────────────────────────────────────────────────────
let agendaDiaOffset=0;
function diaAgendaHTML(fecha,ahora=new Date()){
  const hoyIso=isoHoyAgenda(ahora),esHoy=fecha===hoyIso;
  const todos=agendaEvents();
  const evs=todos.filter(e=>e.fecha===fecha).map(withPriority);
  const clases=bloquesSemanaHorario(S.ramos||[]).get(claveDiaAgenda(fecha))||[];
  const p=partesHorarioChile(ahora),minutoAhora=Number(p.hour)*60+Number(p.minute);
  let html='';
  if(evs.length){
    html+=`<h2 class="section-hd-title agenda-dia-seccion">${esHoy?'Se rinde hoy':'Ese día'}</h2><div class="agenda-dia-pruebas">${evs.map(e=>`<button type="button" class="agenda-dia-prueba" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}" style="--ramo:${esc(e.ramo.color||'var(--fg3)')}" aria-label="${esc(etiquetaEventoAgenda(e))}">
      <i aria-hidden="true"></i>
      <span class="agenda-dia-que"><b>${esc(nombreEventoAgenda(e))}</b><span>${esc(e.ramo.nombre)}</span><span>${[horaValidaAgenda(e.hora)?esc(e.hora):'',pesoEventoAgendaTexto(e),e.estadoAgenda==='con_nota'?'ya evaluada':''].filter(Boolean).join(' · ')}</span></span>
      ${necesitaAgendaHTML(e)}</button>`).join('')}</div>`;
  }
  // El día en orden: clases y evaluaciones con hora juntas; sin hora, al final.
  const filas=[
    ...clases.map(x=>({min:x.ini,html:`<button type="button" class="agenda-dia-fila${x.bloque.noVoy?' no-voy':''}" data-horario-ramo="${esc(x.ramo.id)}" data-horario-bloque="${esc(x.bloque.id)}" style="--ramo:${esc(x.ramo.color||'var(--fg3)')}" aria-label="${esc(etiquetaClaseSemana(x,nombreFechaAgenda(fecha)))}">
        <span class="agenda-dia-hora">${esc(x.bloque.inicio)}</span><i aria-hidden="true"></i><span><b>${esc(x.ramo.nombre)}</b><span>${esc([x.bloque.noVoy?'No vas':x.bloque.tipo,`${x.bloque.inicio}–${x.bloque.fin}`,x.bloque.sala].filter(Boolean).join(' · '))}</span></span></button>`})),
    ...evs.filter(e=>horaValidaAgenda(e.hora)).map(e=>({min:minutosHorario(e.hora),eval:true,html:filaEvaluacionDiaHTML(e,e.hora)})),
  ].sort((a,b)=>a.min-b.min||(a.eval?1:0)-(b.eval?1:0));
  const sinHora=evs.filter(e=>!horaValidaAgenda(e.hora));
  if(filas.length||sinHora.length){
    let linea=esHoy?`<span class="agenda-dia-ahora" role="img" aria-label="Ahora, ${p.hour}:${p.minute}"></span>`:'';
    const partes=filas.map(f=>{
      if(linea&&f.min>minutoAhora){const l=linea;linea='';return l+f.html;}
      return f.html;
    });
    if(linea&&filas.length)partes.push(linea);
    html+=`<h2 class="section-hd-title agenda-dia-seccion">Tu día</h2><div class="agenda-dia-linea">${partes.join('')}${sinHora.map(e=>filaEvaluacionDiaHTML(e,'Sin hora')).join('')}</div>`;
  }else{
    const proxima=todos.filter(e=>e.fecha>fecha&&e.pending!==false).sort((a,b)=>a.fecha.localeCompare(b.fecha))[0];
    html+=`<div class="agenda-dia-vacio"><p>Nada agendado ${esHoy?'para hoy':'este día'}.</p>${proxima?`<button type="button" class="agenda-dia-proxima" data-agenda-ir-dia="${esc(proxima.fecha)}">Lo próximo: ${esc(nombreEventoAgenda(proxima))} · ${esc(proxima.ramo.nombre)}, ${esc(nombreFechaAgenda(proxima.fecha).toLowerCase())}</button>`:''}</div>`;
  }
  // Lo pendiente (notas por poner, fechas por revisar) solo en hoy: es lo que
  // hay que resolver ahora, no algo de un día cualquiera.
  if(esHoy&&typeof agendaPendientesHTML==='function')html+=agendaPendientesHTML(pendientesDeAgenda(ahora),ahora);
  return html;
}
// «Hoy, sábado 21 de noviembre»; lejos de hoy, solo la fecha.
function etiquetaDiaAgenda(fecha,dias){
  const nombre=nombreFechaAgenda(fecha);
  return dias===0||dias===1||dias===-1?`${cuandoTexto(dias)}, ${nombre[0].toLowerCase()}${nombre.slice(1)}`:nombre;
}
function renderDiaAgenda(body,ahora=new Date()){
  const hoyIso=isoHoyAgenda(ahora),fecha=sumarDiasAgenda(hoyIso,agendaDiaOffset);
  // El título y el resumen son de la Agenda (encabezadoAgenda); la fecha del
  // día va en el navegador, donde se mueve con ‹ ›.
  const dias=diasEntreAgenda(hoyIso,fecha);
  body.innerHTML=navAgendaHTML(etiquetaDiaAgenda(fecha,dias),'dia',dias!==0)+diaAgendaHTML(fecha,ahora);
  const repintar=()=>{if(typeof currentTab==='undefined'||currentTab==='agenda')renderAgenda();};
  enlazarNavAgenda(body,paso=>{agendaDiaOffset=paso===0?0:agendaDiaOffset+paso;renderAgenda();});
  body.querySelectorAll('[data-agenda-ir-dia]').forEach(b=>b.addEventListener('click',()=>{agendaDiaOffset=diasEntreAgenda(hoyIso,b.dataset.agendaIrDia);renderAgenda();}));
  body.querySelectorAll('[data-horario-ramo]').forEach(b=>b.addEventListener('click',()=>abrirClaseHorario(b.dataset.horarioRamo,b.dataset.horarioBloque,()=>{repintar();if(typeof renderHome==='function')renderHome();})));
  if(typeof activarDetallesAgenda==='function')activarDetallesAgenda(body);
}

// ─── MES ────────────────────────────────────────────────────────────────────
let agendaMesOffset=0,agendaMesSel=null;
function mesAgendaHTML(ahora=new Date()){
  const todos=agendaEvents();
  if(!todos.length)return '';
  const hoyIso=isoHoyAgenda(ahora);
  const [a0,m0]=hoyIso.split('-').map(Number);
  const base=new Date(Date.UTC(a0,m0-1+agendaMesOffset,1,12));
  const anio=base.getUTCFullYear(),mes=base.getUTCMonth();
  const primero=base.toISOString().slice(0,10),prefijo=primero.slice(0,7);
  const sel=agendaMesSel&&agendaMesSel.startsWith(prefijo)?agendaMesSel:(hoyIso.startsWith(prefijo)?hoyIso:primero);
  const inicio=lunesAgenda(primero),ultimo=new Date(Date.UTC(anio,mes+1,0,12)).toISOString().slice(0,10);
  const porFecha=new Map();todos.forEach(e=>{if(!porFecha.has(e.fecha))porFecha.set(e.fecha,[]);porFecha.get(e.fecha).push(e);});
  const celdas=[];
  for(let i=0;i<42;i++){
    const f=sumarDiasAgenda(inicio,i);
    if(i%7===0&&f>ultimo)break;
    const evs=porFecha.get(f)||[],fuera=!f.startsWith(prefijo);
    const etiqueta=`${nombreFechaAgenda(f)}${evs.length?`, ${evs.length} ${evs.length===1?'evaluación':'evaluaciones'}`:''}${f===hoyIso?', hoy':''}`;
    celdas.push(`<button type="button" class="agenda-mes-dia${fuera?' fuera':''}${f===hoyIso?' hoy':''}" data-mes-dia="${f}" aria-pressed="${f===sel}" aria-label="${esc(etiqueta)}"><span class="agenda-mes-n">${Number(f.slice(8))}</span><span class="agenda-mes-puntos" aria-hidden="true">${evs.slice(0,3).map(e=>`<i style="background:${esc(e.ramo.color||'var(--fg3)')}"></i>`).join('')}</span></button>`);
  }
  const delDia=porFecha.get(sel)||[];
  const nombreMes=MESES_AGENDA[mes][0].toUpperCase()+MESES_AGENDA[mes].slice(1)+' '+anio;
  return `<section class="agenda-mes" aria-label="Calendario del mes">
    ${navAgendaHTML(nombreMes,'mes',agendaMesOffset!==0||sel!==hoyIso)}
    <div class="agenda-mes-semana" aria-hidden="true">${['L','M','M','J','V','S','D'].map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="agenda-mes-grilla">${celdas.join('')}</div>
    <div class="agenda-mes-detalle"><h2 class="section-hd-title agenda-dia-seccion">${esc(nombreFechaAgenda(sel))}${sel===hoyIso?' · hoy':''}</h2>
      ${delDia.length?delDia.map(e=>eventoAgendaFilaHTML(e)).join(''):'<p class="agenda-mes-vacio">Sin evaluaciones este día.</p>'}</div>
  </section>`;
}
function enlazarMesAgenda(body,ahora=new Date()){
  const mes=body.querySelector('.agenda-mes');if(!mes)return;
  const hoyIso=isoHoyAgenda(ahora);
  enlazarNavAgenda(mes,paso=>{
    if(paso===0){agendaMesOffset=0;agendaMesSel=hoyIso;}
    else{agendaMesOffset+=paso;agendaMesSel=null;}
    renderAgenda();
  });
  mes.querySelectorAll('[data-mes-dia]').forEach(b=>b.addEventListener('click',()=>{
    const f=b.dataset.mesDia,[a,m]=f.split('-').map(Number),[ah,mh]=hoyIso.split('-').map(Number);
    agendaMesSel=f;agendaMesOffset=(a-ah)*12+(m-mh);
    renderAgenda();
    document.querySelector(`.agenda-mes [data-mes-dia="${f}"]`)?.focus();
  }));
}
