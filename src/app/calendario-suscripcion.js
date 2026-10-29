
// ─── FEED SUSCRIBIBLE ────────────────────────────────────────────────────────
// El .ics de arriba es una foto: si después cambias una fecha, el archivo ya
// bajado no se entera. El feed es una URL que el calendario consulta solo, así
// que la suscripción se hace una vez y queda.
//
// El .ics lo arma una Cloudflare Pages Function (functions/cal/[token].js), no
// el navegador: Google lo pide desde sus servidores, sin sesión. El token sale
// de una RPC `security definer` y va en la ruta, que es el único lugar donde
// Google puede llevar un secreto.
let _feedUrl=null;
let _feedUsuario=null,_feedVersion=0;

async function pedirFeedCalendario(regenerar){
  if(!supabaseClient||!currentUser)return null;
  const usuario=currentUser,version=++_feedVersion;
  const {data,error}=await supabaseClient.rpc(regenerar?'calendar_feed_revoke':'calendar_feed_token');
  if(currentUser!==usuario||version!==_feedVersion)return null;
  if(error)throw error;
  _feedUrl=location.origin+'/cal/'+data;
  _feedUsuario=usuario;
  return _feedUrl;
}

async function pintarFeedCalendario(regenerar){
  const inp=document.getElementById('s-cal-url');if(!inp)return;
  inp.value=regenerar?'Generando una nueva…':'Generando…';
  const usuario=currentUser,pendiente=pedirFeedCalendario(regenerar),version=_feedVersion;
  const vigente=()=>currentUser===usuario&&version===_feedVersion&&document.getElementById('s-cal-url')===inp;
  try{
    const url=await pendiente;
    if(vigente()&&url)inp.value=url;
  }catch(e){
    if(!vigente())return;
    inp.value='';
    showToast('No pudimos generar tu URL. Intenta de nuevo.',true);
  }
}

function copiarFeedCalendario(){
  const inp=document.getElementById('s-cal-url');
  if(!inp||!inp.value||!_feedUrl||_feedUsuario!==currentUser){showToast('Todavía se está generando',true);return;}
  navigator.clipboard.writeText(_feedUrl)
    .then(()=>{track('calendar_feed_copiado');showToast('URL copiada — pégala en tu calendario');})
    .catch(()=>{inp.select();showToast('Cópiala a mano: quedó seleccionada',true);});
}

// Regenerar rompe la suscripción que ya esté puesta en el calendario, así que se
// confirma: el estudiante tiene que volver a agregarla en Google.
function revocarFeedCalendario(){
  showConfirm('Generar una URL nueva',
    'La URL actual deja de funcionar al instante. Si ya la agregaste a tu calendario, vas a tener que volver a suscribirte con la nueva.',
    ()=>{track('calendar_feed_revocado');pintarFeedCalendario(true);},
    {label:'Generar nueva'});
}

// Importar un archivo .ics y suscribirse a una URL se parecen desde afuera,
// pero se comportan distinto. En especial, iOS mezcla una importación con un
// calendario existente aunque el archivo declare su propio nombre. La Agenda
// muestra esta elección antes de descargar para que esa diferencia sea visible.
function openAgendaCalendarOptions(){
  const tieneEventos=agendaEvents().length>0;
  const opcionesSalida=tieneEventos?`
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0 0 14px;">
      Recomendado: <b>se actualiza sola</b> cuando cambias una fecha y queda como un calendario aparte.
    </p>
    <button class="btn-primary" type="button" onclick="openCalendarSubscriptionFromAgenda()">Suscribirme al calendario</button>
    <div style="height:1px;background:var(--border);margin:20px 0 16px;"></div>
    <label class="modal-label">Exportar archivo .ics</label>
    <p class="settings-help" style="margin-top:0;">Una copia del momento: no se actualiza si cambias una fecha.</p>
    <p class="settings-help"><b>En iPhone</b> se suman a un calendario que ya existe.</p>
    <div class="settings-data-actions" style="margin-bottom:0;">
      <button type="button" onclick="exportCalendarSnapshotFromAgenda()">Exportar copia</button>
    </div>
    <div style="height:1px;background:var(--border);margin:20px 0 16px;"></div>`:
    `<p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0 0 14px;">
      Todavía no tienes fechas. Tráelas desde tu calendario.
    </p>`;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Conecta GradeHub y tu calendario</div>
    ${opcionesSalida}
    <label class="modal-label">Importar archivo .ics</label>
    <p class="settings-help" style="margin-top:0;">Desde Apple, Google u Outlook. Revisas cada fecha antes de agregarla.</p>
    <div class="settings-data-actions" style="margin-bottom:0;">
      <button${tieneEventos?'':' class="btn-primary"'} type="button" onclick="abrirImportarCalendario()">Importar fechas</button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>`;
  openModal();
  track('calendar_options_opened');
}

function openCalendarSubscriptionFromAgenda(){
  track('calendar_subscription_from_agenda');
  closeModal();
  setTimeout(()=>openSettings('calendario'),220);
}

function exportCalendarSnapshotFromAgenda(){
  closeModal();
  exportarCalendario();
}

// Una evaluación suelta a Google Calendar, con un toque desde el teléfono.
//
// El .ics de acá arriba sirve para todos los calendarios, pero para meterlo a
// Google hay que entrar a calendar.google.com desde un computador e importar el
// archivo a mano — en el celular, que es donde está casi todo el mundo, la
// descarga no lleva a ninguna parte.
//
// Esto es la URL de plantilla de Google: abre el evento prellenado y el
// estudiante solo aprieta Guardar. Sin API, sin OAuth, sin backend y sin
// permisos nuevos: es un link. No sincroniza — si después cambias la fecha en
// GradeHub, el evento en Google se queda con la vieja.
function googleCalUrl(ramo,cat){
  if(!cat||!cat.fecha)return '';
  const p=new URLSearchParams({
    action:'TEMPLATE',
    text:`${cat.nombre} — ${ramo.nombre}`,
    dates:`${icsDate(cat.fecha)}/${icsDatePlus1(cat.fecha)}`,
    details:`Vale ${r2(cat.peso||0)}% de ${ramo.nombre}. Agendado desde GradeHub.`,
  });
  return 'https://calendar.google.com/calendar/render?'+p.toString();
}

function exportarCalendario(){
  const evs=agendaEvents();
  if(evs.length===0){showToast('Primero agrega fechas a tus evaluaciones',true);return;}
  try{
    const blob=new Blob([buildICS()],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='gradehub-evaluaciones.ics';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast(`${evs.length} ${evs.length===1?'evaluación exportada':'evaluaciones exportadas'}`);
    track('export_ics',{eventos:evs.length});
  }catch(err){
    showToast('No se pudo exportar el calendario',true);
  }
}
