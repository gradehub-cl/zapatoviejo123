
// ─── AGENTES CONECTADOS ────────────────────────────────────────────────────
let agentesConectados=[],agentesCargando=false,agentesError='';
// La URL vive SOLO en memoria y solo mientras la pantalla está abierta: es una
// llave de lectura, y guardarla en el dispositivo la volvería permanente sin
// que nadie lo haya pedido.
let agenteUrlActual='';
let propuestasPautaAgente=[],propuestasPautaCargando=false;
// Las propuestas de notas van en su propio arreglo: el modal de pautas lista
// evaluaciones con pesos y mostrarlas ahí las leería como una pauta.
let propuestasNotasAgente=[];
let propuestasFechasAgente=[];
let propuestasRamosAgente=[];

function fechaAgente(valor,vacio){
  const fecha=valor?new Date(valor):null;
  if(!fecha||isNaN(fecha.getTime()))return vacio;
  return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(fecha);
}
const MCP_URL_BASE='https://gradehub.cl/mcp/';
function pintarAgentesConectados(){
  const raiz=document.getElementById('s-agent-list');if(!raiz)return;
  if(agentesCargando){raiz.innerHTML='<div class="agent-list-empty" aria-live="polite">Buscando tus agentes conectados…</div>';return;}
  if(agentesError){raiz.innerHTML=`<div class="agent-list-empty" role="alert">${esc(agentesError)} <button type="button" class="agent-retry" onclick="cargarAgentesConectados()">Reintentar</button></div>`;return;}
  if(!agentesConectados.length){raiz.innerHTML='<div class="agent-list-empty">Todavía no tienes agentes conectados.</div>';return;}
  raiz.innerHTML=agentesConectados.map(a=>{
    const nombre=a.agente||'Agente';
    return `<article class="agent-link-card">
      <div class="agent-link-heading"><div><b>${esc(nombre)}</b><span>Conectado desde ${esc(fechaAgente(a.created_at,'fecha no disponible'))}</span></div><button type="button" class="agent-revoke" onclick="confirmarRevocarAgente('${esc(a.id)}')">Desconectar</button></div>
      <dl class="agent-link-meta"><div><dt>Último uso</dt><dd>${esc(fechaAgente(a.last_used_at,'Aún no se ha usado'))}</dd></div><div><dt>Vence</dt><dd>${esc(fechaAgente(a.expires_at,'fecha no disponible'))}</dd></div></dl>
    </article>`;
  }).join('');
}
async function cargarAgentesConectados(){
  if(!currentUser||!supabaseClient)return;
  const usuario=currentUser;
  agentesCargando=true;agentesError='';pintarAgentesConectados();
  try{
    const {data,error}=await rpcAgente('listar_agentes');
    if(currentUser!==usuario)return;
    if(error)throw error;
    // Copiar solo las cinco columnas declaradas por la RPC: aunque el servidor
    // cambie su respuesta, la interfaz jamás debe terminar mostrando un token.
    agentesConectados=(Array.isArray(data)?data:[]).map(a=>{
      const id=String(a.id||'');
      return {id:/^[A-Za-z0-9_-]{1,64}$/.test(id)?id:'',agente:typeof a.agente==='string'?a.agente:'Agente',created_at:a.created_at||null,last_used_at:a.last_used_at||null,expires_at:a.expires_at||null};
    }).filter(a=>a.id);
  }catch(e){
    if(currentUser!==usuario)return;
    agentesError='No pudimos cargar tus agentes conectados. Intenta de nuevo en un momento.';
  }finally{if(currentUser===usuario){agentesCargando=false;pintarAgentesConectados();}}
}
// Las RPC del agente exigen sesión: resuelven todo con auth.uid(). Una app que
// queda abierta días llega con el JWT vencido, y entonces la base contesta "sin
// sesión" —que es correcto y parece un error nuestro—. Antes de dar por perdida
// la acción se refresca una vez y se reintenta: si la sesión todavía sirve, la
// persona no se enteró de nada.
function sesionCaducada(error){
  const m=(error&&(error.message||error.msg))||'';
  return /sin sesi[oó]n|jwt|token/i.test(m);
}
async function rpcAgente(nombre,args){
  const usuario=currentUser;
  let r=await supabaseClient.rpc(nombre,args);
  if(currentUser!==usuario)return r;
  if(r&&r.error&&sesionCaducada(r.error)){
    try{await supabaseClient.auth.refreshSession();}catch(e){}
    if(currentUser!==usuario)return r;
    r=await supabaseClient.rpc(nombre,args);
  }
  return r;
}
// Para ChatGPT, Claude y Gemini "normales": no pueden canjear un código porque
// no corren comandos, y aceptan un conector remoto como UNA URL pegada en su
// configuración. Sin mostrar el token no hay forma de conectarlos, así que acá
// se muestra, con lo que eso significa dicho en la misma pantalla.
async function crearUrlAgente(){
  if(!currentUser||!supabaseClient){showToast('Inicia sesión para conectar un agente',true);return;}
  const usuario=currentUser;
  const btn=document.getElementById('s-agent-url-create');
  if(btn){btn.disabled=true;btn.textContent='Creando…';}
  try{
    const nombre=(document.getElementById('s-agent-url-nombre')||{}).value||'';
    const {data,error}=await rpcAgente('crear_vinculo_agente',{p_agente:nombre});
    if(currentUser!==usuario)return;
    if(error)throw error;
    const fila=Array.isArray(data)?data[0]:data;
    const token=fila&&fila.token;
    if(typeof token!=='string'||!/^[0-9a-f]{64}$/.test(token))throw new Error('token inválido');
    agenteUrlActual=MCP_URL_BASE+token;
    pintarUrlAgente();
    cargarAgentesConectados();
  }catch(e){
    if(currentUser!==usuario)return;
    const motivo=(e&&(e.message||e.msg))||'';
    showToast(sesionCaducada(e)
      ? 'Tu sesión expiró. Vuelve a entrar y créala otra vez.'
      : ('No pudimos crear la URL'+(motivo?': '+motivo:'. Intenta de nuevo.')),true);
    console.warn('crear_vinculo_agente falló:',e);
  }finally{
    if(btn&&currentUser===usuario){btn.disabled=false;btn.textContent=agenteUrlActual?'Crear otra URL':'Crear URL de conexión';}
  }
}
async function copiarPromptConectorAgente(){
  const texto=((document.getElementById('s-agent-prompt-text')||{}).textContent||'').trim();
  if(!texto){showToast('No pudimos preparar el mensaje. Intenta de nuevo.',true);return;}
  try{await navigator.clipboard.writeText(texto);showToast('Mensaje copiado. Pégaselo a tu agente.');}
  catch(e){showToast('Copia el mensaje del cuadro de arriba',true);}
}
function pintarUrlAgente(){
  const raiz=document.getElementById('s-agent-url');
  if(!raiz)return;
  if(!agenteUrlActual){raiz.innerHTML='';return;}
  raiz.innerHTML=`<div class="agent-url-box">
    <div class="agent-url-warn">Es como una contraseña: quien la tenga ve tus ramos y notas. Pégala solo en el conector; no la envíes por el chat. No se vuelve a mostrar.</div>
    <code class="agent-url-value">${esc(agenteUrlActual)}</code>
    <button type="button" class="agent-refresh" onclick="copiarUrlAgente()">Copiar URL del conector</button>
  </div>`;
}
// Lo que un agente hace con GradeHub no es una función de la app: es lo que el
// estudiante le pide. Estos dos mensajes se copian listos porque escribir uno
// bueno es justo la fricción que hace que nadie lo configure, y un agente al que
// le piden "revisa mis notas" contesta genérico.
//
// Los dos terminan con lo mismo —que no invente y que diga cuando falta un
// dato—. Es la regla que sostiene todo lo demás: un agente que rellena una
// ponderación que no está en GradeHub devuelve un promedio que parece real.
const PROMPTS_AGENTE = {
  repaso: {
    titulo: 'Ponerme al día una vez a la semana',
    bajada: 'Qué se viene, qué ramo está en riesgo, qué nota te falta registrar y dónde rinde estudiar. Los agentes con tareas programadas lo hacen solos cada domingo.',
    texto: `Cada domingo revisa mi GradeHub y ponme al día en un mensaje corto.

Dime cuatro cosas: qué evaluaciones vienen en los próximos diez días y cuánto pesa cada una; en qué ramos estoy en riesgo y qué promedio necesito en lo que me queda para aprobarlos; qué evaluaciones ya pasaron de fecha y siguen sin nota, porque mientras no las registre el promedio que veo no es el real; y en qué me conviene poner las horas de esta semana, mirando cuánto mueve la nota final cada cosa que me queda por rendir.

Si no hay nada urgente, dímelo en una línea en vez de armarme un resumen igual. Y no inventes notas, fechas ni ponderaciones: si algo no está en GradeHub, dime qué falta y pídemelo.`,
  },
  proxima: {
    titulo: 'Un plan para mi próxima evaluación',
    bajada: 'Cuál es, qué día cae, cuánto pesa, qué nota te conviene sacarte y qué hacer cada día hasta entonces.',
    texto: `Mira cuál es mi próxima evaluación en GradeHub y ármame un plan para llegar a ella.

Dime primero cuál es y de qué ramo, qué día cae, cuántos días me quedan contando desde hoy, y cuánto pesa en la nota final de ese ramo.

Después dime qué me conviene sacarme: la nota mínima para no quedar fuera de alcance, la que me deja tranquilo, y cómo queda mi nota final del ramo si me saco un 4,0, un 5,0 o un 6,0. Simúlalo con mis notas reales, no lo estimes.

Cierra con un plan para los días que quedan: qué hacer cada día y qué tengo que tener listo el día anterior. Si esta evaluación pesa poco comparada con lo que me queda después, dímelo derecho para no quemarme en algo que mueve poco.

Si en GradeHub no tengo ninguna evaluación con fecha, no la inventes: dímelo y ayúdame a ponerle las fechas.`,
  },
  plan: {
    titulo: 'Un plan para lo que queda del semestre',
    bajada: 'Mira todos tus ramos desde la fecha de hoy y arma un plan semana por semana, con la evaluación que decide si apruebas.',
    texto: `Revisa todo mi GradeHub y ármame un plan para lo que queda del semestre.

Parte diciéndome en qué fecha estamos hoy y cuántas semanas faltan para mi última evaluación con fecha.

Después ve ramo por ramo: cómo voy, cuánto llevo evaluado, qué promedio necesito en lo que queda para aprobar, y qué necesitaría para llegar a la nota que me gustaría sacar. Dime también qué pasaría si me va mal en la próxima evaluación de cada uno; simúlalo con mis notas reales en vez de estimarlo a ojo.

Cierra con un plan semana por semana hasta que termine el semestre, ordenado por urgencia: qué me conviene estudiar cada semana, cuál es la evaluación que decide si apruebo, y qué decisiones tengo que tomar pronto. Si un ramo ya no da, dímelo derecho en vez de darme ánimo.

No inventes nada: si falta una nota, una fecha o una ponderación, dime cuál y pídemela.`,
  },
};
// Un solo bloque con un desplegable: tres tarjetas abiertas ocupaban media
// pantalla de Ajustes para algo que se usa una vez. El texto elegido se pinta
// en el momento, así que la pantalla sirve igual antes de tocar nada.
function promptAgenteElegido(){
  const sel=document.getElementById('s-agent-prompt-pick');
  const clave=sel&&PROMPTS_AGENTE[sel.value]?sel.value:'repaso';
  return {clave,...PROMPTS_AGENTE[clave]};
}
function pintarPromptAgente(){
  const elegido=promptAgenteElegido();
  const bajada=document.getElementById('s-agent-prompt-bajada');
  const texto=document.getElementById('s-agent-prompt-texto');
  if(bajada)bajada.textContent=elegido.bajada;
  if(texto)texto.textContent=elegido.texto;
}
async function copiarPromptAgente(){
  const {texto}=promptAgenteElegido();
  try{await navigator.clipboard.writeText(texto);showToast('Mensaje copiado. Pégaselo a tu agente.');}
  catch{showToast('No se pudo copiar. Selecciona el texto y cópialo a mano.');}
}
async function copiarUrlAgente(){
  if(!agenteUrlActual)return;
  try{await navigator.clipboard.writeText(agenteUrlActual);showToast('URL copiada');}
  catch(e){showToast('Cópiala del cuadro de arriba',true);}
}
// Se olvida al salir de la pantalla. Volver a entrar no la muestra de nuevo:
// para eso se crea otra, que además queda registrada aparte y se puede
// desconectar sola.
function olvidarUrlAgente(){agenteUrlActual='';}
function olvidarSesionAgentes(){
  olvidarUrlAgente();agentesConectados=[];agentesCargando=false;agentesError='';
}
function confirmarRevocarAgente(id){
  const agente=agentesConectados.find(a=>a.id===id);
  if(!agente)return;
  showConfirm(`¿Desconectar ${agente.agente||'este agente'}?`,'Dejará de ver tus notas, ramos y fechas al tiro. Puedes conectarlo de nuevo cuando quieras.',()=>revocarAgente(id),{label:'Desconectar',danger:true,focusCancel:true});
}
async function revocarAgente(id){
  if(!currentUser||!supabaseClient)return;
  const usuario=currentUser;
  try{
    const {error}=await rpcAgente('revocar_agente',{p_id:id});
    if(currentUser!==usuario)return;
    if(error)throw error;
    agentesConectados=agentesConectados.filter(a=>a.id!==id);
    pintarAgentesConectados();showToast('Agente desconectado');
  }catch(e){if(currentUser===usuario)showToast('No pudimos desconectar ese agente. Intenta de nuevo.',true);}
}

// Las propuestas no viven en S: son mensajes pendientes del agente, no una
// parte de la pauta que alguien ya eligió. Guardarlas junto al semestre haría
// que una copia vieja las reviviera después de descartarlas en otro dispositivo.
// Lo que llega de la base se sanea igual que la pauta: viene de un agente, o
// sea de texto que alguien más escribió. Una nota fuera de escala o una casilla
// absurda se descartan acá y no llegan a ofrecerse.
// Mismo saneo que las notas: llega de un agente, o sea de texto que escribió
// otro. Una fecha con formato raro o de otro año se descarta acá.
const FECHA_PROP_RE=/^\d{4}-\d{2}-\d{2}$/;
function propuestaFechasLimpia(valor){
  if(!valor||typeof valor!=='object')return null;
  const id=String(valor.id||'');
  const ramo=String(valor.ramo||'').trim();
  const ramoKey=String(valor.ramo_key||'').trim();
  const fuente=String(valor.fuente||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!ramo||!ramoKey||!fuente||!Array.isArray(valor.evaluaciones))return null;
  const anio=new Date().getFullYear();
  const vistas=new Set();
  const fechas=[];
  for(const fila of valor.evaluaciones){
    const evaluacion=String(fila&&fila.evaluacion||'').trim();
    const fecha=String(fila&&fila.fecha||'').trim();
    const hora=fila&&fila.hora?String(fila.hora).trim():null;
    const casilla=fila&&fila.casilla==null?null:Number(fila.casilla);
    const clave=normName(evaluacion)+'#'+(casilla==null?'':casilla);
    if(!evaluacion||!FECHA_PROP_RE.test(fecha)||vistas.has(clave))return null;
    const y=Number(fecha.slice(0,4));
    if(y<anio-1||y>anio+1)return null;
    if(hora&&!HORA_RE.test(hora))return null;
    if(casilla!==null&&(!Number.isInteger(casilla)||casilla<1||casilla>100))return null;
    vistas.add(clave);fechas.push({evaluacion,fecha,hora:hora||null,casilla});
  }
  if(!fechas.length||fechas.length>60)return null;
  return {id,ramo,ramoKey,fuente,fechas,createdAt:valor.created_at||null};
}
// Los ramos que propuso un agente, saneados. Frontera de confianza: el nombre
// lo escribió un agente leyendo un horario, así que pasa por el mismo filtro
// que las pautas ajenas antes de tocar la pantalla.
