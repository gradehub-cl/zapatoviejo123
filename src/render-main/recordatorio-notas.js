// Recordatorios locales, sin notas ni nombres guardados y fuera de gradehub_v1.
const RECORDATORIOS_NOTAS_CLAVE='gradehub_recordatorios_notas_descartados_v1';
const recordatoriosNotasSesion=new Set();
function ambitoRecordatoriosNotas(){return typeof currentUser!=='undefined'&&currentUser?.id?'cuenta:'+currentUser.id:'local';}
function descartesRecordatoriosNotas(){
  try{const datos=JSON.parse(localStorage.getItem(RECORDATORIOS_NOTAS_CLAVE)||'[]');
    return new Set([...recordatoriosNotasSesion,...(Array.isArray(datos)?datos.filter(x=>typeof x==='string'):[])]);
  }catch(e){return new Set(recordatoriosNotasSesion);}
}
function claveRecordatorioNota(e){
  return JSON.stringify([ambitoRecordatoriosNotas(),S.tenant,e.ramo.id,e.cat.id,e.nota?'nota:'+e.nota.id:'categoria']);
}
function recordatoriosNotasFaltantes(ahora=new Date()){
  if(esCuentaProfesor())return [];
  const descartadas=descartesRecordatoriosNotas(),porRamo=new Map(),silenciadasProfesor=typeof descartesRecordatorioProfesor==='function'?descartesRecordatorioProfesor():new Set();
  // Días de calendario locales: un cambio de hora no convierte siete días en ocho.
  const hoy=Date.UTC(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  for(const e of agendaEvents()){
    if(!e.pending||!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha||''))continue;
    const [a,m,d]=e.fecha.split('-').map(Number),fecha=new Date(Date.UTC(a,m-1,d));
    if(fecha.getUTCFullYear()!==a||fecha.getUTCMonth()!==m-1||fecha.getUTCDate()!==d||(hoy-fecha.getTime())/86400000<=7)continue;
    if(typeof clavesRecordatorioProfesor==='function'&&clavesRecordatorioProfesor(e).some(k=>silenciadasProfesor.has(k)))continue;
    const r=e.ramo;
    if(typeof ramosRecordatorioProfesor==='function'&&ramosRecordatorioProfesor().has(r.id))continue;
    if(r.cierre||notaPortalValida(r.notaOficial)||Number.isFinite(r.avgOverride)||ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r)))continue;
    const clave=claveRecordatorioNota(e);
    if(descartadas.has(clave)||porRamo.has(r.id))continue;
    porRamo.set(r.id,{...e,clave,ambito:ambitoRecordatoriosNotas()});
  }
  // agendaEvents viene ordenada por fecha: una por ramo y las tres más antiguas.
  return [...porRamo.values()].slice(0,3);
}
function recordatorioNotaHTML(e){
  if(!e)return '';
  const nombre=nombreEventoAgenda(e),contexto=nombre+' en '+e.ramo.nombre;
  return `<div class="home-nota-faltante" data-recordatorio-nota="${esc(e.clave)}">
    <span>${e.profesor?'¿Ya tienes la nota de '+esc(nombre)+'? Tu profe la usa para ver cómo vas':esc(nombre)+' · sin nota aún'}</span>
    <button type="button" data-recordatorio-anotar aria-label="Anotar nota de ${esc(contexto)}">Anotar</button>
    <button type="button" data-recordatorio-descartar aria-label="Descartar recordatorio de ${esc(contexto)} en este dispositivo"><span aria-hidden="true">×</span></button>
  </div>`;
}
function montarRecordatoriosNotasHome(caja,items){
  caja.querySelectorAll('[data-recordatorio-nota]').forEach(fila=>{
    const item=items.find(e=>e.clave===fila.dataset.recordatorioNota);if(!item)return;
    fila.onclick=e=>e.stopPropagation();
    fila.querySelector('[data-recordatorio-anotar]').onclick=e=>{e.stopPropagation();abrirRecordatorioNota(item);};
    fila.querySelector('[data-recordatorio-descartar]').onclick=e=>{
      e.stopPropagation();
      if(item.ambito!==ambitoRecordatoriosNotas())return;
      if(item.profesor)descartarRecordatorioProfesor(item);
      else{recordatoriosNotasSesion.add(item.clave);
      try{localStorage.setItem(RECORDATORIOS_NOTAS_CLAVE,JSON.stringify([...descartesRecordatoriosNotas()]));}catch(error){}}
      // No encadenar otro aviso inmediatamente después de descartarlo.
      const foco=fila.closest('.ramo-row')?.querySelector('.ramo-name');fila.remove();foco?.focus({preventScroll:true});
    };
  });
}
function abrirRecordatorioNota(item){
  if(item.ambito!==ambitoRecordatoriosNotas()||esCuentaProfesor())return;
  const r=S.ramos.find(r=>r.id===item.ramo.id),c=r?.categorias.find(c=>c.id===item.cat.id);
  if(!r||!c)return;
  // Validar de nuevo: una nota puede haber llegado por sincronización.
  const vigente=(item.profesor?recordatoriosNotasProfesor():recordatoriosNotasFaltantes()).find(e=>e.clave===item.clave);if(!vigente)return;
  openCats[c.id]=true;openRamo(r.id);
  let intentos=0;
  const enfocar=()=>{
    if(currentRamoId!==r.id||ambitoRecordatoriosNotas()!==item.ambito)return;
    const nodo=[...document.querySelectorAll('#cat-list [data-ficha-categoria]')].find(n=>n.dataset.fichaCategoria===c.id&&n.dataset.fichaRamo===r.id);
    if(!nodo){if(++intentos<30)requestAnimationFrame(enfocar);return;}
    let slot=vigente.nota?.slot;
    if(!vigente.nota&&c.directNota&&c.slots>1)slot=Array.from({length:c.slots},(_,i)=>i).find(i=>!(c.notas||[]).some(n=>n.slot===i&&(n.fecha||n.valor!=null)));
    const boton=[...nodo.querySelectorAll('button.nota-en-fila')].find(b=>Number.isInteger(slot)?b.dataset.slot===String(slot):b.dataset.slot===undefined);
    nodo.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(boton){abrirNotaEnFila(boton);return;}
    if(vigente.nota){openEditNotaModal(c.id,vigente.nota.id);document.getElementById('m-nota-val')?.focus({preventScroll:true});}
    else if(!c.directNota){openAddNotaModal(c.id);document.getElementById('m-nota-val')?.focus({preventScroll:true});}
  };
  enfocar();
}

// Recordatorio reciente de la app: fecha pasada no significa nota publicada.
// Usa los eventos de Agenda y el ingreso existente. Nada nuevo entra a S.
let entradaNotaInicio=null,lecturaCanvasInicio=null;
function claveNotaInicio(e){
  return JSON.stringify([ambitoRecordatoriosNotas(),S.tenant,semester(),e.ramo.id,e.cat.id,
    Number.isInteger(e.slot)?'casilla:'+e.slot:e.nota?'nota:'+e.nota.id:'categoria']);
}
function notasRecientesInicio(ahora=new Date()){
  if(!enAppNativa()||esCuentaProfesor())return [];
  const hoy=fechaChileCanvas(ahora),ventana=RECORDATORIO_NOTAS_POR_TENANT[S.tenant]||RECORDATORIO_NOTAS_POR_TENANT.defecto;
  const descartes=descartesRecordatoriosNotas(),salida=[];
  for(const e of agendaEvents()){
    if(!e.pending||!fechaLocalDesdeISO(e.fecha)||e.fecha>=hoy)continue;
    const dias=(Date.parse(hoy+'T12:00:00Z')-Date.parse(e.fecha+'T12:00:00Z'))/864e5;
    if(dias<ventana.desde||ventana.hasta!==null&&dias>ventana.hasta)continue;
    const r=e.ramo,c=e.cat;
    if(r.cierre||notaPortalValida(r.notaOficial)||Number.isFinite(r.avgOverride)||ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r)))continue;
    // Conserva los descartes anteriores del recordatorio por ramo.
    if(descartes.has(claveRecordatorioNota(e)))continue;
    const fijas=Number.isInteger(c.slots)&&c.slots>1;
    const slots=e.nota?[fijas?e.nota.slot:null]:fijas?Array.from({length:c.slots},(_,i)=>i).filter(i=>!(c.notas||[]).some(n=>n.slot===i&&(n.fecha||n.valor!=null))):[null];
    for(const slot of slots){
      const n=e.nota||(fijas?(c.notas||[]).find(n=>n.slot===slot):null);
      const item={...e,nota:n,slot,inicio:true,ambito:ambitoRecordatoriosNotas(),estado:S};
      item.clave=claveNotaInicio(item);
      if(!descartes.has(item.clave))salida.push(item);
    }
  }
  return salida.sort((a,b)=>b.fecha.localeCompare(a.fecha)||(b.hora||'').localeCompare(a.hora||'')||a.clave.localeCompare(b.clave));
}
function nombreNotaInicio(e){return Number.isInteger(e.slot)?etiquetaCasilla(e.ramo,e.cat,e.slot):nombreEventoAgenda(e);}
function notaInicioYaGuardada(e){
  if(!e||e.estado!==S||e.ambito!==ambitoRecordatoriosNotas()||e.clave!==claveNotaInicio(e)||!S.ramos.includes(e.ramo)||!e.ramo.categorias.includes(e.cat))return false;
  const n=Number.isInteger(e.slot)?(e.cat.notas||[]).find(n=>n.slot===e.slot):e.nota?(e.cat.notas||[]).find(n=>n.id===e.nota.id):(e.cat.notas||[]).find(n=>typeof n.valor==='number');
  return !!n&&Number.isFinite(n.valor);
}
function consumirEntradaNotaInicio(ramo){
  if(!enAppNativa()||entradaNotaInicio?.ramo!==ramo||!notaInicioYaGuardada(entradaNotaInicio))return false;
  entradaNotaInicio=null;return true;
}
function lecturaCanvasGuardadaInicio(){
  return notaInicioYaGuardada(entradaNotaInicio)?lecturaDespuesDeNota(entradaNotaInicio.ramo):null;
}
function descartarNotaInicio(item){
  if(!enAppNativa()||item.estado!==S||item.ambito!==ambitoRecordatoriosNotas()||item.clave!==claveNotaInicio(item))return;
  recordatoriosNotasSesion.add(item.clave);
  try{localStorage.setItem(RECORDATORIOS_NOTAS_CLAVE,JSON.stringify([...descartesRecordatoriosNotas()]));}catch(e){}
  renderNotaPendienteInicio();
}
function contextoCanvasInicioVigente(d){return !!d&&lecturaCanvasInicio===d&&d.estado===S&&d.cuenta===currentUser?.id&&d.tenant===S.tenant&&d.periodo===semester()&&canvasDisponible();}
function propuestaCanvasNotaInicio(item){
  const d=lecturaCanvasInicio;if(!contextoCanvasInicioVigente(d))return null;
  // Canvas no identifica las notas de una lista abierta; no se adivina cuál es.
  if(item.cat.directNota===false&&!Number.isInteger(item.slot))return null;
  const target=claveNotaCanvas({ramo:item.ramo,cat:item.cat,casilla:Number.isInteger(item.slot)?item.slot+1:null});
  return (d.propuestas||[]).find(p=>p.target===target&&p.seccionInicio===(item.ramo.seccion??null))||null;
}
async function consultarCanvasNotasInicio(items){
  if(!items.length||!canvasDisponible())return;
  const firma=JSON.stringify([...new Set(items.map(e=>JSON.stringify([e.ramo.id,e.ramo.seccion??null])))].sort());
  if(contextoCanvasInicioVigente(lecturaCanvasInicio)&&lecturaCanvasInicio.firma===firma&&Date.now()-lecturaCanvasInicio.cuando<300000)return;
  const d={firma,cuando:Date.now(),estado:S,cuenta:currentUser.id,tenant:S.tenant,periodo:semester(),propuestas:[]};lecturaCanvasInicio=d;
  try{
    if(!(await pluginCanvas().estado())?.conectado||!contextoCanvasInicioVigente(d))return;
    const cursos=await cursosCanvas();
    if(!contextoCanvasInicioVigente(d))return;
    for(const r of [...new Set(items.map(e=>e.ramo))]){
      const candidatos=cursos.filter(c=>c.sigla===siglaRamoCanvas(r)&&(!r.seccion||c.seccion===Number(r.seccion)));
      if(candidatos.length!==1)continue;
      const curso=candidatos[0],seccionInicio=r.seccion??null;
      // No atribuye notas de otro período al semestre activo.
      const [anio,parte]=d.periodo.split('-');if(!curso.periodo.includes(anio)||!curso.periodo.includes(parte==='1'?'primer':'segundo'))continue;
      const respuesta=await pluginCanvas().get({path:`courses/${curso.id}/assignments`,params:{'include[]':['submission'],order_by:'due_at',per_page:100}});
      if(!contextoCanvasInicioVigente(d)||!S.ramos.includes(r)||(r.seccion??null)!==seccionInicio)return;
      const destinos=destinosNotaCanvas(r);
      // La tarjeta afirma que es ESTA nota: un parecido solo por tipo no basta.
      d.propuestas.push(...resumenNotasCanvas(respuesta?.data,r).propuestas.filter(p=>{
        const destino=destinos.find(d=>claveNotaCanvas(d)===p.target);
        return destino&&puntajeCanvas(destino.nombres,p.titulo,'')===3;
      }).map(p=>({...p,seccionInicio})));
    }
  }catch(e){
    // Sin conexión o puente antiguo: sigue disponible el ingreso manual.
  }
  if(contextoCanvasInicioVigente(d))renderNotaPendienteInicio(new Date(),false);
}
function guardarNotaInicio(item,raw){
  if(!enAppNativa()||item.estado!==S||item.clave!==claveNotaInicio(item))return false;
  const vigente=notasRecientesInicio().find(e=>e.clave===item.clave);
  if(!vigente){renderNotaPendienteInicio();return false;}
  const valor=parseNota(raw),error=document.getElementById('nota-inicio-error'),campo=document.getElementById('nota-inicio-valor');
  if(!Number.isFinite(valor)){
    error.hidden=false;error.textContent='Escribe una nota válida entre 1,0 y 7,0.';
    campo.setAttribute('aria-invalid','true');campo.focus();return false;
  }
  const c=vigente.cat,r=vigente.ramo;
  let n=vigente.nota||(Number.isInteger(vigente.slot)?(c.notas||[]).find(n=>n.slot===vigente.slot):null);
  if(!n){
    if(!escribirNotaPropuesta(c,{valor,casilla:Number.isInteger(vigente.slot)?vigente.slot+1:null},r))return false;
    n=Number.isInteger(vigente.slot)?c.notas.find(n=>n.slot===vigente.slot):c.notas.find(n=>n.valor===valor);
  }
  asignarCalificacionNota(n,raw,valor);
  entradaNotaInicio=vigente;
  save();track(Number.isInteger(vigente.slot)||c.directNota===false?'set_nota_slot':'set_nota_directa');
  const lectura=lecturaDespuesDeNota(r);
  renderHome();
  if(typeof renderAgenda==='function')renderAgenda();
  vibrar('nota');showToast(lectura);
  return true;
}
function renderNotaPendienteInicio(ahora=new Date(),consultar=true){
  const caja=document.getElementById('home-nota-pendiente');if(!caja)return;
  const items=notasRecientesInicio(ahora),item=items[0],campo=caja.querySelector('#nota-inicio-valor');
  // Una lectura de Canvas no borra lo que la persona ya empezó a escribir.
  if(item&&caja.dataset.clave===item.clave&&(campo?.value||campo&&document.activeElement===campo))return;
  caja.hidden=!item;caja.innerHTML='';if(!item)return;
  caja.dataset.clave=item.clave;
  const propuesta=propuestaCanvasNotaInicio(item),nombre=nombreNotaInicio(item);
  caja.innerHTML=`<div class="nota-inicio-fila"><div class="nota-inicio-texto"><h2 id="nota-inicio-titulo">¿Cómo te fue en ${esc(nombre)}?</h2><p class="nota-inicio-ramo">${esc(item.ramo.nombre)}</p></div>
    <form class="nota-inicio-acciones" novalidate>
      ${propuesta?'<button type="button" data-nota-inicio-canvas>Traer de Canvas</button>':`<button type="button" class="nota-en-fila" data-nota-inicio-poner aria-label="Anotar nota de ${esc(nombre)} en ${esc(item.ramo.nombre)}">+ Nota</button>`}
      <button type="button" data-nota-inicio-ahora>Ahora no</button>
    </form></div><p id="nota-inicio-error" role="alert" hidden></p>`;
  let cancelada=false;
  const ahoraNo=caja.querySelector('[data-nota-inicio-ahora]');
  // El toque en «Ahora no» no debe guardar por blur lo que se estaba escribiendo.
  ahoraNo.onpointerdown=e=>e.preventDefault();
  ahoraNo.onclick=()=>{cancelada=true;descartarNotaInicio(item);};
  if(propuesta)caja.querySelector('[data-nota-inicio-canvas]').onclick=()=>{
    const vigente=notasRecientesInicio().find(e=>e.clave===item.clave),p=vigente&&propuestaCanvasNotaInicio(vigente);
    if(!p)return renderNotaPendienteInicio();
    entradaNotaInicio=vigente;canvasNotasDraft=[{...p}];renderRevisionNotasCanvas();openModal();
  };
  else caja.querySelector('[data-nota-inicio-poner]').onclick=e=>{
    abrirNotaEnFila(e.currentTarget,{idCampo:'nota-inicio-valor',alGuardar:raw=>cancelada?false:guardarNotaInicio(item,raw)});
  };
  caja.querySelector('form').onsubmit=e=>{e.preventDefault();document.getElementById('nota-inicio-valor')?.blur();};
  if(consultar)void consultarCanvasNotasInicio(items);
}
