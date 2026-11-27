// Calendario de Canvas (.ics): URL secreta local y revisión compartida de #806.
const CANVAS_ICS_KEY='gradehub_canvas_ics';
// Cualquiera de los Canvas de CANVAS_ICS_POR_TENANT: una URL guardada no se
// borra porque la universidad todavía no esté cargada.
const URL_CANVAS_ICS_RE=new RegExp('^https://(?:'+Object.values(CANVAS_ICS_POR_TENANT).map(c=>c.host.replace(/\./g,'\\.')).join('|')+')/feeds/calendars/user_[A-Za-z0-9]{20,80}\\.ics$');
function canvasIcsTenant(){return CANVAS_ICS_POR_TENANT[S.tenant]||null;}
const CANVAS_ICS_SIN_FECHAS='Tu calendario de Canvas no tiene fechas próximas para tus ramos.';
// Si la app trae Canvas nativo para su universidad (la UC, con el token en el
// llavero), manda ese. Si no —la web, Android o la FEN en iPhone— sigue el
// calendario .ics.
function canvasIcsDisponible(){
  return !esCuentaProfesor()&&!!currentUser&&!!canvasIcsTenant()&&!canvasDisponible();
}
// El iPhone vive en capacitor://localhost, sin /canvas-calendario propio: va a
// gradehub.cl. La web y Android ya están ahí.
function urlFuncionCanvasIcs(){
  return typeof location!=='undefined'&&location.protocol==='capacitor:'?'https://gradehub.cl/canvas-calendario':'/canvas-calendario';
}
// Canvas también la ofrece como webcal://; es la misma.
function normalizarUrlCanvasIcs(texto){
  const url=String(texto||'').trim().replace(/^webcal:\/\//i,'https://');
  return URL_CANVAS_ICS_RE.test(url)?url:null;
}
function urlCanvasIcsGuardada(){
  let v=null;
  try{v=JSON.parse(localStorage.getItem(CANVAS_ICS_KEY)||'null');}catch(e){}
  if(!v)return null;
  // De otra cuenta en este navegador: no es de quien está ahora.
  if(!currentUser||v.uid!==currentUser.id||!normalizarUrlCanvasIcs(v.url)){olvidarUrlCanvasIcs();return null;}
  return v.url;
}
function guardarUrlCanvasIcs(url){try{localStorage.setItem(CANVAS_ICS_KEY,JSON.stringify({uid:currentUser.id,url}));}catch(e){}}
function olvidarUrlCanvasIcs(){try{localStorage.removeItem(CANVAS_ICS_KEY);}catch(e){}}

// La fecha de Chile de un DTSTART. Con hora en UTC ("…T025900Z") se convierte:
// una entrega a las 23:59 del 15 llega como el 16 a las 02:59Z. Sin Z (hora
// local o día completo) vale la que trae.
function fechaChileIcs(inicio){
  const m=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z$/.exec(String(inicio||''));
  if(!m)return null;
  const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)));
  return fechaChileCanvas(d);
}
// Canvas pone el curso entre corchetes: "Tarea 2 [MAT1620-2]" o
// "[2026-2 MAT1620-2 Cálculo II]". Si trae el prefijo del horario oficial
// ("ENMEM1505" en la FEN), se lee sin él, como la sigla guardada. Con la sigla se sabe el ramo, y la
// evaluación se empareja como en "Traer fechas" de la app iOS (fechasCanvas).
// Lo que no es de tus ramos y no calza con nada se deja fuera: el calendario de
// Canvas trae también cursos que no llevas acá.
function propuestasCanvasIcs(eventos,ahora){
  ahora=ahora||new Date();
  const hoy=fechaChileCanvas(ahora);
  const porRamo=new Map(),sueltos=[];
  const siglaRe=new RegExp('\\b(?:'+(PREFIJO_SIGLA_HORARIO[S.tenant]||'')+')?([A-Z]{3,4}[0-9]{3,4}[A-Z]?)(?:-\\d{1,3})?\\b');
  (eventos||[]).forEach(ev=>{
    const fecha=fechaChileIcs(ev.inicio)||ev.fecha;
    if(!fecha||fecha<hoy)return;
    const corchetes=(String(ev.titulo).match(/\[[^\]]*\]/g)||[]).join(' ').toUpperCase();
    const sigla=(siglaRe.exec(corchetes)||[])[1];
    const ramo=sigla&&(S.ramos||[]).find(r=>siglaRamoCanvas(r)===sigla);
    const nombre=String(ev.titulo).replace(/\s*\[[^\]]*\]\s{0,}/g,' ').trim();
    if(ramo){
      if(!porRamo.has(ramo.id))porRamo.set(ramo.id,{ramo,tareas:[]});
      // Mediodía UTC queda dentro del mismo día de Chile en ambos horarios.
      porRamo.get(ramo.id).tareas.push({name:nombre||ev.titulo,due_at:fecha+'T12:00:00Z'});
    }else sueltos.push({titulo:ev.titulo,fecha});
  });
  let out=[];
  // El feed no trae grupos de tareas. Resolver cada nombre explícito primero
  // evita que una segunda I2 ocupe la casilla I3 por mera coincidencia de tipo.
  porRamo.forEach(({ramo,tareas})=>tareas.forEach(t=>{out=out.concat(fechasCanvas([t],ramo,ahora));}));
  const vistas=new Set();
  out=out.filter(p=>{const k=p.ramoId+'|'+normName(p.titulo)+'|'+p.fecha;if(vistas.has(k))return false;vistas.add(k);return true;});
  const destinos=destinosIcs();
  sueltos.forEach(ev=>{const target=coincidenciaIcs(ev,destinos);if(target)out.push({...ev,target});});
  // Una evaluación recibe una sola fecha: la primera que la propone.
  const usados=new Set();
  return out.sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,ICS_IMPORT_MAX_EVENTS).map(p=>{
    if(p.target&&usados.has(p.target))return {...p,target:null};
    if(p.target)usados.add(p.target);
    return p;
  });
}
async function pedirCalendarioCanvas(url){
  if(!canvasIcsDisponible())throw new Error('Inicia sesión para traer tu calendario de Canvas.');
  const sesion=supabaseClient&&(await supabaseClient.auth.getSession()).data;
  const token=sesion&&sesion.session&&sesion.session.access_token;
  if(!token)throw new Error('Inicia sesión para traer tu calendario de Canvas.');
  const r=await fetch(urlFuncionCanvasIcs(),{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({url})});
  const texto=await r.text();
  if(!r.ok){let m='No pudimos leer tu calendario de Canvas.';try{m=JSON.parse(texto).error||m;}catch(e){}throw new Error(m);}
  return texto;
}
function avisoCanvasIcs(texto,error){
  const el=document.getElementById('s-canvas-ics-estado');
  if(el){el.textContent=texto;el.classList.toggle('es-error',!!error);}
  else if(texto)showToast(texto,!!error);
}
function pintarCanvasIcsAjustes(){
  const caja=document.getElementById('s-canvas-ics');
  if(!caja||!canvasIcsDisponible())return;
  const {nombre,host}=canvasIcsTenant();
  caja.innerHTML=urlCanvasIcsGuardada()?`
    <p class="settings-help" style="margin-top:0;"><b>Calendario de Canvas conectado.</b> Su URL está guardada solo en este dispositivo.</p>
    <div class="settings-data-actions" style="margin-bottom:0;"><button type="button" id="s-canvas-ics-actualizar" onclick="actualizarDesdeCanvasIcs()">Actualizar desde Canvas</button></div>
    <button type="button" class="settings-reset-btn" onclick="desconectarCanvasIcs()">Desconectar Canvas</button>
    <p class="settings-help" id="s-canvas-ics-estado" role="status" aria-live="polite"></p>`
  :`
    <ol class="canvas-pasos">
      <li>En ${nombre} abre <b>Calendario</b> y toca <b>Fuente de calendario</b>, abajo a la derecha.</li>
      <li>Copia la URL y pégala acá.</li>
    </ol>
    <label class="modal-label" for="s-canvas-ics-url">URL de la fuente de calendario</label>
    <div class="modal-input"><input type="url" class="campo-url" id="s-canvas-ics-url" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="url" placeholder="https://${host}/feeds/calendars/user_…"/></div>
    <button type="button" class="btn-confirm" id="s-canvas-ics-conectar" onclick="conectarCanvasIcs()">Conectar calendario de Canvas</button>
    <p class="settings-help" id="s-canvas-ics-estado" role="status" aria-live="polite">Quien tenga esa URL ve tu calendario: la guardamos solo en este dispositivo y no la sincronizamos.</p>`;
}
async function importarDesdeCanvasIcs(url,vigente=()=>true){
  const cuenta=currentUser?.id,estado=S;
  const texto=await pedirCalendarioCanvas(url);
  if(currentUser?.id!==cuenta||S!==estado||!vigente())return false;
  const eventos=/BEGIN:VEVENT/.test(texto)?parseIcsCalendario(texto,{inicioCrudo:true}):[];
  const propuestas=propuestasCanvasIcs(eventos);
  track('canvas_ics_fechas',{eventos:eventos.length,propuestas:propuestas.length});
  if(!propuestas.length){avisoCanvasIcs(CANVAS_ICS_SIN_FECHAS);return false;}
  // La misma revisión que un .ics: cada fecha se confirma o se deja fuera.
  icsImportDraft=propuestas;
  renderRevisionIcs();
  openModal();
  return true;
}
async function conectarCanvasIcs(){
  if(!canvasIcsDisponible())return;
  const cuenta=currentUser.id,estado=S;
  const vigente=()=>currentUser?.id===cuenta&&S===estado&&canvasIcsDisponible();
  const campo=document.getElementById('s-canvas-ics-url'),boton=document.getElementById('s-canvas-ics-conectar');
  const {nombre,host}=canvasIcsTenant(),url=normalizarUrlCanvasIcs(campo&&campo.value);
  if(!url||!url.startsWith('https://'+host+'/')){avisoCanvasIcs(`Esa no es la URL de la fuente de calendario de ${nombre}. Debe empezar con https://${host}/feeds/calendars/`,true);return;}
  if(boton)boton.disabled=true;
  avisoCanvasIcs('Leyendo tu calendario de Canvas…');
  try{
    const abrioRevision=await importarDesdeCanvasIcs(url,vigente);
    if(!vigente())return;
    // Se guarda solo si Canvas la reconoció: una URL mala no queda pegada.
    guardarUrlCanvasIcs(url);
    if(campo)campo.value='';
    track('canvas_ics_conectado');
    pintarCanvasIcsAjustes();
    if(!abrioRevision)avisoCanvasIcs(CANVAS_ICS_SIN_FECHAS);
  }catch(e){
    if(!vigente())return;
    if(boton)boton.disabled=false;
    avisoCanvasIcs((e&&e.message)||'No pudimos leer tu calendario de Canvas.',true);
  }
}
async function actualizarDesdeCanvasIcs(){
  if(!canvasIcsDisponible())return;
  const cuenta=currentUser.id,estado=S;
  const vigente=()=>currentUser?.id===cuenta&&S===estado&&canvasIcsDisponible();
  const url=urlCanvasIcsGuardada();
  if(!url){pintarCanvasIcsAjustes();return;}
  const boton=document.getElementById('s-canvas-ics-actualizar');
  if(boton)boton.disabled=true;
  avisoCanvasIcs('Buscando fechas nuevas en Canvas…');
  try{if(await importarDesdeCanvasIcs(url,vigente)&&vigente())avisoCanvasIcs('');}
  catch(e){if(vigente())avisoCanvasIcs((e&&e.message)||'No pudimos leer tu calendario de Canvas.',true);}
  finally{if(boton)boton.disabled=false;}
}
function desconectarCanvasIcs(){
  const cuenta=currentUser?.id,estado=S;
  showConfirm('Desconectar Canvas','Se borra de este dispositivo la URL de tu calendario. Tus fechas no cambian. Si crees que alguien más la tiene, genera una nueva en Canvas.',()=>{
    if(currentUser?.id!==cuenta||S!==estado)return;
    olvidarUrlCanvasIcs();
    track('canvas_ics_desconectado');
    pintarCanvasIcsAjustes();
  },{label:'Desconectar',focusCancel:true});
}
