// Solo memoria para el contenido. El teléfono recuerda exclusivamente hashes por cuenta.
let cacheAvisosCanvas=null;
const turnosAvisosCanvas={inicio:0,ficha:0};
const fechaPublicacionCanvas=new Intl.DateTimeFormat('es-CL',{timeZone:'America/Santiago',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const claveLeidosCanvas=uid=>'gradehub_canvas_avisos_leidos_'+uid;
function limpiarAvisosCanvas(borrar){
  // La hoja conserva el DOM al cerrar. Descarta también el borrador abierto desde un aviso.
  if(cacheAvisosCanvas?.revision&&contextoFechasCanvas===cacheAvisosCanvas.revision){
    icsImportDraft=[];
    contextoFechasCanvas=null;
    const revision=document.getElementById('ics-revision-lista');
    if(revision?.closest?.('#modal.open'))closeModal();
    if(revision?.isConnected)document.getElementById('modal-content').replaceChildren();
  }
  cacheAvisosCanvas=null;
  turnosAvisosCanvas.inicio++;turnosAvisosCanvas.ficha++;
  if(borrar&&typeof currentUser!=='undefined'&&currentUser?.id){
    try{localStorage.removeItem(claveLeidosCanvas(currentUser.id));}catch(e){}
  }
  for(const vista of ['inicio','ficha']){
    const caja=document.getElementById('avisos-canvas-'+vista);
    if(caja){caja.hidden=true;caja.replaceChildren?.();}
  }
  const lista=document.getElementById('lista-avisos-canvas');
  if(lista?.isConnected&&lista.closest?.('#modal.open'))closeModal();
  lista?.remove?.();
}
function contextoAvisosCanvas(){
  if(cacheAvisosCanvas?.uid===currentUser.id&&cacheAvisosCanvas.estado===S)return cacheAvisosCanvas;
  limpiarAvisosCanvas(false);
  let ids=[];
  try{ids=JSON.parse(localStorage.getItem(claveLeidosCanvas(currentUser.id))||'[]');}catch(e){}
  cacheAvisosCanvas={uid:currentUser.id,estado:S,leidos:new Set(Array.isArray(ids)?ids:[]),cursos:new Map()};
  return cacheAvisosCanvas;
}
function vigenteAvisosCanvas(c){
  return c===cacheAvisosCanvas&&currentUser?.id===c.uid&&S===c.estado&&canvasDisponible();
}
function lecturaTemporalCanvas(mapa,clave,leer){
  const entrada=mapa.get(clave);
  if(entrada&&entrada.hasta>Date.now())return entrada.promesa;
  // Las dos pantallas pueden pedir el mismo curso antes de que termine la primera lectura.
  const nueva={hasta:Infinity};
  nueva.promesa=leer().then(datos=>{
    nueva.hasta=Date.now()+4*60000;
    return datos;
  },error=>{
    if(mapa.get(clave)===nueva)mapa.delete(clave);
    throw error;
  });
  mapa.set(clave,nueva);
  return nueva.promesa;
}
async function leerCursoAvisosCanvas(id){
  const datos=await canvasGet('courses/'+id+'/discussion_topics',{only_announcements:'true',per_page:50});
  return Promise.all(datos.filter(a=>a&&Number.isFinite(Date.parse(a.posted_at))).sort((a,b)=>Date.parse(b.posted_at)-Date.parse(a.posted_at)).map(async a=>{
    const bytes=new TextEncoder().encode(JSON.stringify([id,a.title,a.posted_at]));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return {...a,hash:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')};
  }));
}
async function gruposAvisosCanvas(c,ramoId){
  const cursos=await lecturaTemporalCanvas(c.cursos,'lista',cursosCanvas);
  const grupos=[];
  for(const ramo of S.ramos){
    if(!vigenteAvisosCanvas(c))break;
    if(ramoId!=null&&ramo.id!==ramoId)continue;
    const sigla=siglaRamoCanvas(ramo);
    const opciones=cursos.filter(x=>x.sigla===sigla&&(!ramo.seccion||Number(ramo.seccion)===x.seccion));
    if(opciones.length!==1)continue;
    const id=opciones[0].id;
    try{
      const avisos=await lecturaTemporalCanvas(c.cursos,id,()=>leerCursoAvisosCanvas(id));
      grupos.push({ramo,id,avisos});
    }catch(e){
      if(!vigenteAvisosCanvas(c))break;
      // Un curso puede denegar anuncios con un token que sigue vigente.
      if(Number(e?.code)===401&&await estadoConexionCanvas()===false)throw e;
      grupos.push({ramo,id,error:true,avisos:[]});
    }
  }
  return grupos;
}
function nodoAvisoCanvas(tipo,texto){
  const el=document.createElement(tipo);if(texto!=null)el.textContent=texto;return el;
}
function filaAvisoCanvas(aviso,curso,fechas,contexto){
  const fila=nodoAvisoCanvas('article');
  const titulo=nodoAvisoCanvas('h4',aviso.title||'Aviso del curso');
  const fecha=nodoAvisoCanvas('time',fechaPublicacionCanvas.format(new Date(aviso.posted_at)));
  fecha.dateTime=aviso.posted_at;
  const texto=String(aviso.texto||'');
  const largo=texto.length>320;
  const resumen=largo?texto.slice(0,320)+'…':texto;
  const cuerpo=nodoAvisoCanvas('p',resumen);
  fila.append(titulo,fecha,cuerpo);

  const leido=nodoAvisoCanvas('button');
  function actualizar(){
    const yaLeido=contexto.leidos.has(aviso.hash);
    leido.textContent=yaLeido?'Marcar como no leído':'Marcar como leído';
    fila.classList.toggle('aviso-nuevo',!yaLeido);
  }
  function marcar(valor){
    if(!vigenteAvisosCanvas(contexto))return;
    if(valor)contexto.leidos.add(aviso.hash);
    else contexto.leidos.delete(aviso.hash);
    try{localStorage.setItem(claveLeidosCanvas(contexto.uid),JSON.stringify([...contexto.leidos]));}catch(e){}
    actualizar();
    pintarAvisosCanvas('inicio');
  }
  if(largo){
    const mas=nodoAvisoCanvas('button','Ver más');
    mas.setAttribute('aria-expanded','false');
    mas.onclick=()=>{
      const abrir=mas.getAttribute('aria-expanded')==='false';
      mas.setAttribute('aria-expanded',String(abrir));
      mas.textContent=abrir?'Ver menos':'Ver más';
      cuerpo.textContent=abrir?texto:resumen;
      if(abrir)marcar(true);
    };
    fila.append(mas);
  }
  if(aviso.recortado){
    const link=nodoAvisoCanvas('a','Abrir en Canvas');
    link.href='https://cursos.canvas.uc.cl/courses/'+curso+'/announcements';
    link.target='_blank';
    link.rel='noopener noreferrer';
    fila.append(link);
  }
  if(fechas.length){
    const revisar=nodoAvisoCanvas('button','Revisar fecha propuesta');
    revisar.onclick=()=>{
      if(!vigenteAvisosCanvas(contexto))return;
      icsImportDraft=fechas.map(p=>({...p}));
      contextoFechasCanvas={estado:S,cuenta:contexto.uid,avisos:''};
      contexto.revision=contextoFechasCanvas;
      renderRevisionIcs();
      openModal();
    };
    fila.append(revisar);
  }
  actualizar();
  leido.onclick=()=>marcar(!contexto.leidos.has(aviso.hash));
  fila.append(leido);
  return fila;
}
function pintarListaAvisosCanvas(caja,grupos,contexto){
  caja.replaceChildren();
  for(const {id,ramo,avisos,error} of grupos){
    caja.append(nodoAvisoCanvas('h3',caja.id==='avisos-canvas-ficha'?'Avisos de Canvas':ramo.nombre));
    if(!avisos.length){
      caja.append(nodoAvisoCanvas('p',error?'No pudimos cargar los avisos de este ramo.':'Este curso aún no tiene avisos.'));
      continue;
    }
    const propuestas=propuestasAnunciosCanvas(avisos,ramo,new Date());
    for(const aviso of avisos){
      const fechas=propuestas.filter(p=>p.anuncio.instante===aviso.posted_at&&p.anuncio.titulo===String(aviso.title||'').slice(0,180));
      caja.append(filaAvisoCanvas(aviso,id,fechas,contexto));
    }
  }
}
function abrirListaAvisosCanvas(grupos,contexto){
  if(!vigenteAvisosCanvas(contexto))return;
  const lista=nodoAvisoCanvas('section');
  lista.id='lista-avisos-canvas';
  lista.className='avisos-canvas';
  pintarListaAvisosCanvas(lista,grupos,contexto);
  const titulo=nodoAvisoCanvas('h2','Avisos de Canvas');
  titulo.className='modal-title';
  lista.prepend(titulo);
  const cerrar=nodoAvisoCanvas('button','Cerrar');
  cerrar.className='settings-cerrar';
  cerrar.onclick=closeModal;
  lista.append(cerrar);
  document.getElementById('modal-content').replaceChildren(lista);
  openModal();
}
async function pintarAvisosCanvas(vista,ramoId){
  const caja=document.getElementById('avisos-canvas-'+vista);
  if(!caja)return;
  if(!canvasDisponible()){
    if(cacheAvisosCanvas)limpiarAvisosCanvas(false);
    return;
  }
  const c=contextoAvisosCanvas(),turno=++turnosAvisosCanvas[vista];
  const vigente=()=>vigenteAvisosCanvas(c)&&turnosAvisosCanvas[vista]===turno;
  if(vista==='ficha'&&caja.dataset.ramo!==String(ramoId)){caja.hidden=true;caja.replaceChildren();caja.dataset.ramo=String(ramoId);}
  try{
    const conectado=await estadoConexionCanvas();
    if(!vigente())return;
    if(conectado===false){limpiarAvisosCanvas(false);return;}
    if(!conectado)throw Error();
    const grupos=await gruposAvisosCanvas(c,ramoId);
    if(!vigente())return;
    if(vista==='ficha')pintarListaAvisosCanvas(caja,grupos,c);
    else{
      caja.replaceChildren();
      const n=new Set(grupos.flatMap(g=>g.avisos.filter(a=>!c.leidos.has(a.hash)).map(a=>a.hash))).size;
      if(n){
        const boton=nodoAvisoCanvas('button',n===1?'1 aviso nuevo':n+' avisos nuevos');
        boton.onclick=()=>abrirListaAvisosCanvas(grupos,c);
        caja.append(boton);
      }
      if(grupos.some(g=>g.error))caja.append(nodoAvisoCanvas('p','No pudimos actualizar todos los avisos de Canvas.'));
    }
    caja.hidden=!caja.childElementCount;
  }catch(e){
    if(!vigente())return;
    if(Number(e?.code)===401){
      const conectado=await estadoConexionCanvas();
      if(!vigente())return;
      if(conectado===false){limpiarAvisosCanvas(false);return;}
    }
    caja.replaceChildren(nodoAvisoCanvas('p','No pudimos cargar los avisos de Canvas. Intenta al volver a abrir esta pantalla.'));caja.hidden=false;
  }
}
