
// ─── ALCANCE ÚNICO ──────────────────────────────────────────────────────────
//
// Lo que se cobra es cuántas CUENTAS DISTINTAS vieron un aviso. La llamada solo
// manda el id del aviso: la cuenta la pone el servidor con auth.uid() y la
// campaña ya la conoce. No viajan notas, ramos ni el criterio con que se eligió
// el aviso, así que la fila no dice nada de cómo le va a quien lo vio.
//
// El Set evita repetir la llamada dentro de la misma visita. No es la
// deduplicación: esa la hace la llave primaria en el servidor, que es la que
// cuenta para facturar. Acá solo se ahorra red.
// El canal dice por qué camino llegó la cuenta —recomendación, búsqueda o
// lista— porque cada uno se cobra distinto. Es una palabra: lo que la persona
// escribió en el buscador no viaja. El servidor guarda el camino más caro y
// nunca lo baja, así que mandar uno más barato después no descuenta nada.
const CANALES_ALCANCE=new Set(['recomendacion','busqueda','lista']);
const ALCANCE_REGISTRADO=new Set();
const ALCANCE_EN_CURSO=new Map();
async function registrarAlcanceAnuncio(anuncioId,canal='recomendacion'){
  const clave=claveMedicionClase(anuncioId)+':'+canal;
  if(!supabaseClient||!currentUser||!anuncioId||!CANALES_ALCANCE.has(canal)||ALCANCE_REGISTRADO.has(clave))return false;
  if(ALCANCE_EN_CURSO.has(clave))return ALCANCE_EN_CURSO.get(clave);
  const pendiente=(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('registrar_alcance_anuncio',{p_anuncio_id:anuncioId,p_canal:canal});
      if(error)throw error;
      // `false` es una exclusión o deduplicación real del servidor; también
      // queda resuelta. Solo un error de transporte se reintenta.
      ALCANCE_REGISTRADO.add(clave);
      return data===true;
    }catch(error){
      console.warn('No se pudo registrar el alcance del anuncio:',error.message||error);
      return null;
    }finally{ALCANCE_EN_CURSO.delete(clave);}
  })();
  ALCANCE_EN_CURSO.set(clave,pendiente);
  return pendiente;
}

// El total de la propia campaña. Devuelve null si no se pudo consultar, para no
// confundir "no sé" con "nadie lo vio" en una pantalla que habla de plata.
async function alcanceAnuncio(anuncioId){
  if(!supabaseClient||!currentUser||!anuncioId)return null;
  const {data,error}=await supabaseClient.rpc('alcance_anuncio',{p_anuncio_id:anuncioId});
  if(error){console.warn('No se pudo cargar el alcance del anuncio:',error.message||error);return null;}
  return Number.isInteger(data)?data:null;
}

// Espacio separado de las notas. El SQL es manual: si todavía no existe,
// esta puerta explica el fallo y no interviene en el arranque de GradeHub.
// El espacio de profesor vive en su propia PESTAÑA desde el 2026-09-21: armar un
// anuncio con su público y su cotización es una tarea de varios pasos y no cabe
// en una ventana. El cuerpo se separa del modal para que las dos entradas —la
// pestaña y el menú, mientras exista— pinten exactamente lo mismo.
async function renderProfesor(){
  const raiz=document.getElementById('profesor-body');
  if(!raiz)return;
  await renderEspacioProfesor(raiz,{titulo:false});
}
async function openEspacioProfesor(){
  const raiz=document.getElementById('modal-content');
  raiz.innerHTML='<div class="modal-title" id="modal-titulo">Espacio de profesor</div><p class="profesor-info" role="status">Revisando tu acceso…</p>';
  openModal();
  await renderEspacioProfesor(raiz,{titulo:true});
}
async function renderEspacioProfesor(raiz,{titulo=true}={}){
  const cabecera=t=>titulo?`<div class="modal-title" id="modal-titulo">${t}</div>`:'';
  // Toda pantalla que termina acá tiene que poder cerrarse. Desde que el modal
  // no se cierra ni arrastrándolo ni tocando fuera, una ventana sin botón deja a
  // la persona encerrada — y estas son de una sola línea, sin formulario ni
  // botones propios. En la pestaña no va: ahí no hay nada que cerrar.
  const salida=()=>titulo?'<div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>':'';
  raiz.innerHTML=cabecera('Espacio de profesor')+'<p class="profesor-info" role="status">Revisando tu acceso…</p>';
  const ficha=await perfilProfesorActual();
  if(!ficha.ok){raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="alert">${esc(ficha.error)}</p>`+salida();return;}
  if(!ficha.perfil){renderPostulacionProfesor(raiz);return;}
  if(ficha.perfil.estado==='pendiente'){
    const mios=await misAnunciosClase();
    const fecha=new Date(ficha.perfil.solicitado_at);
    const enviada=Number.isFinite(fecha.getTime())
      ?`Enviada el ${new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(fecha)}.`
      :'Fecha de envío no disponible.';
    const borradores=mios.ok?mios.anuncios.filter(a=>a.estado==='borrador'):[];
    raiz.innerHTML=cabecera('Espacio de profesor')+
      `<div class="profesor-hig"><section class="clases-seccion" aria-labelledby="profesor-postulacion-titulo"><h2 id="profesor-postulacion-titulo">Tu postulación</h2><p class="profesor-info" role="status">Está pendiente de revisión. ${esc(enviada)}</p><p class="profesor-info">Te avisaremos cuando esté aprobada. Mientras tanto, puedes preparar un anuncio y guardarlo como borrador.</p></section>`+
      `<section class="clases-seccion" aria-labelledby="profesor-borradores-titulo"><h2 id="profesor-borradores-titulo">Tu borrador</h2>`+
      (mios.ok
        ?borradores.length
          ?`<div class="clase-lista">${borradores.map(a=>`<div class="clase-card"><div class="clase-card-top"><strong>${esc(a.titulo||'Sin título')}</strong><span class="clase-estado">Borrador</span></div><p class="clase-card-meta">Nadie lo ve todavía.</p><button type="button" class="clase-accion" data-borrador-pendiente="${esc(a.id)}">Seguir preparando</button></div>`).join('')}</div>`
          :'<p class="profesor-info">Todavía no tienes un borrador.</p><button type="button" class="btn-confirm" id="clase-nueva-pendiente">Preparar anuncio</button>'
        :`<p class="profesor-info" role="alert">${esc(mios.error)}</p>`)+
      '</section></div>'+salida();
    const nueva=raiz.querySelector('#clase-nueva-pendiente');
    if(nueva)nueva.addEventListener('click',()=>renderBorradorProfesor(raiz,null,{pendiente:true}));
    if(typeof raiz.querySelectorAll==='function')raiz.querySelectorAll('[data-borrador-pendiente]').forEach(b=>b.addEventListener('click',()=>{
      const anuncio=borradores.find(a=>a.id===b.dataset.borradorPendiente);
      if(anuncio)renderBorradorProfesor(raiz,anuncio,{pendiente:true});
    }));
    return;
  }
  if(ficha.perfil.estado!=='aprobado'){
    const avisos={pendiente:'Tu postulación está esperando revisión. Todavía no puedes ofrecer clases.',rechazado:'Tu postulación no fue aprobada. Puedes escribirnos desde Sugerencias para revisar el motivo.',suspendido:'Tu acceso de profesor está suspendido. Tus notas como estudiante siguen disponibles.'};
    raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="status">${esc(avisos[ficha.perfil.estado]||'Tu perfil necesita revisión.')}</p>`+salida();
    return;
  }
  const mios=await misAnunciosClase();
  if(!mios.ok){raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="alert">${esc(mios.error)}</p>`+salida();return;}
  await renderPanelProfesor(raiz,mios.anuncios,{cabecera,salida});
}

// La puerta desde Ajustes: solo la postulación, sin el espacio completo. Quien
// todavía no postula no tiene anuncios que mostrarle.
function postularComoProfesor(){
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  renderPostulacionProfesor(raiz);
  openModal();
}
function renderPostulacionProfesor(raiz){
  raiz.innerHTML=`<div class="modal-title" id="modal-titulo">Postula para ofrecer clases</div>
    <p class="profesor-info">Tu cuenta de estudiante sigue igual. Un miembro de nuestro equipo revisará tu postulación. Mientras esperas, podrás preparar un borrador de anuncio.</p>
    <form class="profesor-form" id="profesor-postular">
      <label class="modal-label" for="profesor-nombre">Nombre público</label><input id="profesor-nombre" type="text" maxlength="100" minlength="2" required autocomplete="name">
      <label class="modal-label" for="profesor-presentacion">Qué ramos enseñas y qué experiencia tienes</label><textarea id="profesor-presentacion" minlength="20" maxlength="1500" required></textarea>
      <p class="profesor-info">Nadie verá tus notas. Cada anuncio que prepares necesitará otra aprobación.</p>
      <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button><button class="btn-confirm" type="submit">Enviar postulación</button></div>
      <p class="profesor-estado" role="status" aria-live="polite"></p>
    </form>`;
  const form=raiz.querySelector('#profesor-postular'),estado=form.querySelector('.profesor-estado');
  let enviando=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(enviando)return;
    if(!form.reportValidity())return;
    enviando=true;
    const boton=form.querySelector('button');boton.disabled=true;estado.textContent='Enviando postulación…';
    const resultado=await postularProfesor(form.querySelector('#profesor-nombre').value,form.querySelector('#profesor-presentacion').value);
    if(resultado.ok){
      // El estado en memoria quedó viejo: sin esto Ajustes seguiría ofreciendo
      // postular a alguien que acaba de hacerlo.
      olvidarPerfilProfesor();
      if(typeof cargarPerfilProfesor==='function')cargarPerfilProfesor().then(()=>{
        if(typeof renderSettingsSiAbierto==='function')renderSettingsSiAbierto();
      }).catch(()=>{});
      raiz.innerHTML='<div class="modal-title" id="modal-titulo">Postulación enviada</div><p class="profesor-info" role="status">Quedó pendiente de revisión. Aún no puedes publicar clases. En Ajustes · Clases particulares puedes ver en qué va.</p><div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>';
      return;
    }
    estado.textContent=resultado.error;boton.disabled=false;enviando=false;
    if(resultado.campo)form.querySelector(resultado.campo==='nombre'?'#profesor-nombre':'#profesor-presentacion').focus();
  });
}

// Compatibilidad mientras se aplica el SQL nuevo: la RLS deja leer propios y
// publicados, pero autor_id no es una columna pública. No usar este camino
// cuando ya existe la RPC paginada del profesor.
async function misAnunciosClaseLegado(){
    const {data,error}=await consultaCamposClase(campos=>supabaseClient.from('tutor_anuncios')
      .select(campos).order('created_at',{ascending:false}),CAMPOS_PUBLICOS_ANUNCIO);
    if(error)throw error;
    const todos=Array.isArray(data)?data:[];
    // Si no se puede confirmar un publicado, se falla entero en vez de
    // adivinar: mostrar uno ajeno o esconder uno propio serían los dos malos.
    const propio=await Promise.all(todos.map(async a=>{
      if(a.estado!=='publicado')return true;
      const r=await supabaseClient.rpc('anuncio_propio',{p_anuncio_id:a.id,p_editable:false});
      if(r.error)throw r.error;
      return r.data===true;
    }));
    return todos.filter((_,i)=>propio[i]);
}
async function misAnunciosClase(){
  if(!sesionProfesorClase())return {ok:false,error:'Inicia sesión para ver tus clases.'};
  try{
    const anuncios=[],tamano=60;
    for(let desde=0;;desde+=tamano){
      const {data,error}=await supabaseClient.rpc('mis_anuncios_profesor',{p_desde:desde,p_tamano:tamano});
      if(error){
        if(desde===0&&sqlClasesDesactualizado(error))return {ok:true,anuncios:await misAnunciosClaseLegado()};
        throw error;
      }
      const pagina=Array.isArray(data)?data:[];
      anuncios.push(...pagina);
      if(pagina.length<tamano)return {ok:true,anuncios};
    }
  }catch(e){return {ok:false,error:'No pudimos consultar tus clases. Intenta de nuevo.'};}
}

const ESTADOS_ANUNCIO={
  borrador:['Borrador','Nadie lo ve todavía.'],
  en_revision:['En revisión','No se publica hasta que lo aprobemos.'],
  publicado:['Publicado','Se está mostrando a tu público.'],
  programado:['Programado','Empieza el día que elegiste.'],
  pausado:['Pausado','Dejó de mostrarse.'],
  expirado:['Terminado','La campaña llegó a su fin.'],
  agotado:['Tope alcanzado','Dejó de mostrarse al llegar a tu tope.'],
  sin_confirmar:['Sin confirmar','No pudimos consultar el estado de la campaña. Vuelve a abrir tu espacio.'],
  eliminado:['Borrado','Se retiró de la revisión. Sus cobros anteriores siguen disponibles en administración.'],
};

// Lo que se cobra son PERSONAS DISTINTAS alcanzadas, así que ese es el número
// grande. Los cortes por día y tipo vienen del servidor solo cuando superan los
// quince eventos: por debajo no se devuelven, y decir "0 clics" ahí sería
// mentir. Con pocos datos se dice que son pocos, no que son cero.
// Solo un anuncio que ALCANZÓ a publicarse puede tener números. Un borrador o
// uno esperando aprobación no los vio nadie, y mostrarle "23 personas · va
// costando $49.000" a quien todavía espera el visto bueno es inventarle un
// gasto que no existe.
const ANUNCIO_YA_SE_MOSTRO=new Set(['publicado','pausado','expirado']);
// `porCanal` es null si el servidor todavía no separa caminos (SQL sin
// aplicar): ahí se usa el total de siempre y todo se cobra como segmentado,
// que es como se cotizaba antes. Nunca se inventa un reparto.
async function metricasDeAnuncio(anuncio){
  const salida={alcance:null,porCanal:null,cortes:[],agregados:null,historial:null,eventos:null,campana:anuncio&&anuncio.campana||null,error:false};
  if(!anuncio||!ANUNCIO_YA_SE_MOSTRO.has(anuncio.estado))return salida;
  // La campaña: personas que vieron, abrieron y contactaron, y días cobrados.
  // Sin el SQL de campañas no hay costo que mostrar, y no se inventa.
  if(!salida.campana)try{
    const {data,error}=await leerCostoCampanaClase(anuncio.id);
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    const fila=!error&&Array.isArray(data)?data[0]:null;
    if(fila&&['vistas','aperturas','contactos','dias_cobrados'].every(k=>Number.isInteger(fila[k])))salida.campana=fila;
  }catch(e){salida.error=true;}
  try{
    const {data,error}=await supabaseClient.rpc('alcance_anuncio_por_canal',{p_anuncio_id:anuncio.id});
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    if(!error&&Array.isArray(data)){
      const por={recomendacion:0,busqueda:0,lista:0};
      data.forEach(f=>{if(por[f.canal]!==undefined&&Number.isInteger(f.cuentas))por[f.canal]=f.cuentas;});
      salida.porCanal=por;salida.alcance=por.recomendacion+por.busqueda+por.lista;
    }
  }catch(e){salida.error=true;}
  if(salida.alcance===null)try{
    const {data,error}=await supabaseClient.rpc('alcance_anuncio',{p_anuncio_id:anuncio.id});
    if(error)salida.error=true;
    if(!error&&Number.isInteger(data))salida.alcance=data;
  }catch(e){salida.error=true;}
  try{
    const {data,error}=await supabaseClient.rpc('resumen_metricas_anuncio',{p_anuncio_id:anuncio.id});
    if(error)salida.error=true;
    if(!error&&Array.isArray(data))salida.cortes=data;
  }catch(e){salida.error=true;}
  // Totales por una dimensión a la vez, con el mismo umbral de quince. Si el
  // servidor todavía no tiene la función, se arman desde los cortes finos.
  try{
    const {data,error}=await supabaseClient.rpc('totales_metricas_anuncio',{p_anuncio_id:anuncio.id});
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    if(!error&&Array.isArray(data))salida.agregados=agregadosDeFilas(data);
  }catch(e){salida.error=true;}
  if(!salida.agregados)salida.agregados=agregadosDeFilas([
    ...salida.cortes.map(c=>({vista:'dia',clave:c.dia,tipo:c.tipo,eventos:c.eventos})),
    ...salida.cortes.map(c=>({vista:'ramo',clave:c.ramo_sigla,tipo:c.tipo,eventos:c.eventos})),
    ...salida.cortes.map(c=>({vista:'total',clave:'',tipo:c.tipo,eventos:c.eventos}))]);
  try{
    const {data,error}=await supabaseClient.rpc('historial_anuncio',{p_anuncio_id:anuncio.id,p_dias:null});
    if(!error&&Array.isArray(data))salida.historial=data;
  }catch(e){} // El resumen anterior sigue disponible sin el SQL nuevo.
  try{
    const {data,error}=await supabaseClient.rpc('resumen_eventos_anuncio',{p_anuncio_id:anuncio.id});
    const tipos=['impresion','clic','contacto'];
    const cifras=data&&tipos.every(k=>data[k]===null||Number.isSafeInteger(data[k])&&data[k]>=0);
    const anterior=cifras&&data.anterior===true&&data.desde===null;
    const medido=cifras&&!data.anterior&&Number.isFinite(Date.parse(data.desde));
    if(!error&&(anterior||medido))salida.eventos=data;
  }catch(e){} // Nunca usa el agregado heredado como si midiera repeticiones.
  return salida;
}

// {total:{impresion,clic,contacto}, dias:{'2026-09-25':{...}}, ramos:{MAT1620:{...}}}
function agregadosDeFilas(filas){
  const vacio=()=>({impresion:0,clic:0,contacto:0});
  const a={total:vacio(),dias:{},ramos:{}};
  for(const f of filas||[]){
    const n=Number(f.eventos)||0;
    if(!(f.tipo in a.total)||n<=0)continue;
    if(f.vista==='total')a.total[f.tipo]+=n;
    else if(f.vista==='dia'){(a.dias[f.clave]=a.dias[f.clave]||vacio())[f.tipo]+=n;}
    else if(f.vista==='ramo'){(a.ramos[f.clave]=a.ramos[f.clave]||vacio())[f.tipo]+=n;}
  }
  return a;
}

function totalesDeCortes(cortes){
  const por={impresion:0,clic:0,contacto:0};
  (cortes||[]).forEach(c=>{if(por[c.tipo]!==undefined)por[c.tipo]+=Number(c.eventos)||0;});
  return por;
}

// La RLS deja que el profesor lleve su aviso a borrador, a revisión o a pausa.
// NO lo deja publicar ni expirar: eso lo marca el equipo. O sea pausar es una
// puerta de una sola dirección para él, y hay que decírselo ANTES de que la
// cruce: para volver a mostrarse, el aviso pasa por revisión otra vez.
async function cambiarEstadoAnuncio(id,estado){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para administrar tus clases.'};
  if(!['borrador','en_revision','pausado'].includes(estado))return {ok:false,error:'Ese cambio no te corresponde a ti.'};
  try{
    const {data,error}=await consultaCamposClase(campos=>supabaseClient.from('tutor_anuncios')
      .update({estado}).eq('id',id).select(campos).single(),CAMPOS_PUBLICOS_ANUNCIO);
    if(error||!data)return {ok:false,error:'No pudimos cambiar el estado. Intenta de nuevo.'};
    return {ok:true,anuncio:data};
  }catch(e){return {ok:false,error:'No pudimos cambiar el estado. Intenta de nuevo.'};}
}

function pausarAnuncioClase(id,alTerminar){
  showConfirm('¿Pausar esta clase?',
    'Deja de mostrarse al tiro y no se te cobra por nadie más. Para volver a publicarla tiene que pasar por revisión de nuevo: no se reanuda sola.',
    async()=>{
      const r=await cambiarEstadoAnuncio(id,'pausado');
      showToast(r.ok?'Clase pausada':r.error,!r.ok);
      if(r.ok&&typeof alTerminar==='function')alTerminar();
    },{label:'Pausar',danger:false});
}

function retomarAnuncioClase(id,alTerminar){
  showConfirm('¿Volver a publicarla?',
    'Pasa a borrador para que la revises. Cuando la envíes, la revisamos antes de publicarla de nuevo.',
    async()=>{
      const r=await cambiarEstadoAnuncio(id,'borrador');
      showToast(r.ok?'Quedó como borrador':r.error,!r.ok);
      if(r.ok&&typeof alTerminar==='function')alTerminar(r.anuncio||null);
    },{label:'Seguir',danger:false});
}

// Un publicado cuya fecha ya pasó está TERMINADO aunque la fila todavía diga
// "publicado": nadie más lo ve —la RLS filtra por vence_at— y nada en el
// servidor le cambia el estado al vencer. Decirle "se está mostrando" sería
// mentirle sobre una campaña que ya cerró.
function vigenciaAnuncio(a,ahora=Date.now()){
  if(!a)return '';
  if(a.estado==='publicado'){
    const vence=Date.parse(a.vence_at||''),desde=Date.parse(a.publicado_at||'');
    if(Number.isFinite(vence)&&vence<=ahora)return 'expirado';
    if(Number.isFinite(desde)&&desde>ahora)return 'programado';
    if(a.campanaError)return 'sin_confirmar';
    if(a.campana&&costoCampanaClase(a.campana)?.agotada)return 'agotado';
    return 'publicado';
  }
  return a.estado;
}
// La página se ordena por lo que el profesor puede HACER con cada anuncio.
function gruposPanelClases(anuncios,ahora=Date.now()){
  const g={activos:[],programados:[],revision:[],borradores:[],cerrados:[],sinConfirmar:[]};
  for(const a of anuncios||[]){
    const e=vigenciaAnuncio(a,ahora);
    (e==='publicado'?g.activos:e==='programado'?g.programados:e==='en_revision'?g.revision:e==='borrador'?g.borradores:e==='sin_confirmar'?g.sinConfirmar:g.cerrados).push(a);
  }
  return g;
}
function diasRestantesAnuncio(a,ahora=Date.now()){
  const vence=Date.parse(a&&a.vence_at||'');
  return Number.isFinite(vence)?Math.max(0,Math.ceil((vence-ahora)/864e5)):null;
}
// Cuánto de la campaña ya pasó, entre 0 y 1, para el riel de vigencia.
function avanceCampanaAnuncio(a,ahora=Date.now()){
  const desde=Date.parse(a&&a.publicado_at||''),hasta=Date.parse(a&&a.vence_at||'');
  if(!Number.isFinite(desde)||!Number.isFinite(hasta)||hasta<=desde)return null;
  return Math.min(Math.max((ahora-desde)/(hasta-desde),0),1);
}

// Las personas siguen siendo de la campaña. Las veces en total vienen SOLO de
// resumen_eventos_anuncio: lo medido más una vez por cada persona de antes de
// la medición. El agregado heredado nunca se usa como sustituto.
function cifrasClase({alcance,campana,costo,eventos=null},pesos,etiquetaPersonas='personas distintas',conPresupuesto=false){
  const miles=n=>new Intl.NumberFormat('es-CL').format(n);
  const medido=!!eventos;
  const veces=k=>eventos&&Number.isSafeInteger(eventos[k])&&eventos[k]>=0?eventos[k]:null;
  // Con la campaña medida, las personas vienen de ahí: son exactas y son lo
  // que se cobra. Sin ella, el alcance de siempre, y abrir o contactar solo
  // se saben como veces.
  const etapas=[
    ['Se mostró',campana?campana.vistas:alcance,veces('impresion'),true],
    ['La abrieron',campana?campana.aperturas:null,veces('clic'),false],
    ['Te contactaron',campana?campana.contactos:null,veces('contacto'),false]];
  const maxPersonas=Math.max(1,...etapas.map(([,p])=>Number(p)||0));
  const mitad=(v,d)=>`<div><b>${v}</b><small>${d}</small></div>`;
  const html=etapas.filter(([,p,v,siempre])=>siempre||p!==null&&p!==undefined||v!==null).map(([t,p,v])=>
    `<div class="clase-etapa${t==='Te contactaron'?' clase-etapa-contactos':''}"><span>${t}</span><div class="clase-par">${
      [p!==null&&p!==undefined?mitad(miles(p),etiquetaPersonas):campana||!v?mitad('—',etiquetaPersonas):'',
       medido?mitad(v===null?'—':miles(v),'en total'):''].filter(Boolean).join('<i class="clase-par-sep" aria-hidden="true">/</i>')}</div>${p!==null&&p!==undefined?`<div class="clase-etapa-riel" aria-hidden="true"><i style="transform:scaleX(${(p/maxPersonas).toFixed(4)})"></i></div>`:''}</div>`).join('');
  const f=[];
  if(costo&&!costo.sinCosto&&!conPresupuesto)f.push(['Va costando',pesos(costo.total),costo.tope!==null?`de tu tope de ${pesos(costo.tope)}`:'hasta ahora']);
  if(costo&&!costo.sinCosto&&campana&&campana.contactos)f.push(['Por contacto',pesos(Math.round(costo.total/campana.contactos)),'lo que costó cada uno']);
  const ocultos=medido&&['impresion','clic','contacto'].some(k=>eventos[k]===null)?' Los totales menores a 15 quedan ocultos.':'';
  const nota=eventos?.anterior?'Esta campaña terminó antes de contar cada vez: el total cuenta una vez por persona.'+ocultos
    :medido?`Desde el ${new Date(eventos.desde).toLocaleDateString('es-CL',{timeZone:'America/Santiago',day:'numeric',month:'long'})} se cuenta cada vez; antes, una vez por persona.`+ocultos
    :'El total de veces aún no está disponible. Las cifras de personas distintas se conservan.';
  return `<div class="clase-etapas">${html}</div><p class="clase-privacidad">${esc(nota)}</p>`+(conPresupuesto?presupuestoProfesorHTML(costo):'')+(f.length?`<div class="clase-nums">${f.map(([t,v,d])=>
    `<div class="clase-num"><span>${t}</span><b>${v}</b><small>${d}</small></div>`).join('')}</div>`:'');
}

// Agregado histórico: no equivale al nuevo total de repeticiones.
// Las barras comparten escala y conservan sus registros originales.
function embudoClase(totales){
  if(!totales.impresion)return '';
  const filas=[['Se mostró',totales.impresion],['La abrieron',totales.clic],['Te contactaron',totales.contacto]].filter(([,n])=>n>0);
  if(filas.length<2)return '';
  return barrasDetalleClaseHTML({titulo:'Interacciones',filas:filas.map(([nombre,valor])=>({nombre,valor})),unidad:'registros'});
}
