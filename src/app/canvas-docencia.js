// Propuestas privadas de Canvas. Leer no guarda, no informa profesores ni vota.
// El equipo confirmado vive solo en memoria, como docenteFichaActual.
// El nombre del profesor se informa por el registro existente al calificar.
const NOMBRE_DOCENCIA_MIN=3;
const propuestasDocenciaCanvas=new Map();
const equipoDocenciaCanvas=new Map();
let revisionDocenciaCanvas=null;
function personasDocenciaCanvas(lista){
  const vistas=new Set();
  return (Array.isArray(lista)?lista:[]).filter(p=>p&&['profesor','ayudante'].includes(p.rol)&&typeof p.nombre==='string').map(p=>({
    nombre:[...p.nombre.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'').replace(/\s+/g,' ').trim()].slice(0,100).join(''),rol:p.rol,
  })).filter(p=>{
    const clave=p.rol+'|'+p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(p.nombre.length<NOMBRE_DOCENCIA_MIN||p.nombre.includes('@')||p.nombre.includes('://')||vistas.has(clave))return false;vistas.add(clave);return true;
  }).slice(0,150).sort((a,b)=>a.rol.localeCompare(b.rol)||a.nombre.localeCompare(b.nombre,'es'));
}
function cursoCanvasParaRamo(r,cursos){
  const candidatos=(cursos||[]).filter(c=>c.sigla===siglaRamoCanvas(r)&&Number.isInteger(c.seccion)&&c.seccion>=1&&c.seccion<=999);
  return r.seccion?candidatos.find(c=>c.seccion===Number(r.seccion))||null:candidatos.length===1?candidatos[0]:null;
}
function docenciaCanvasDeRamo(r){
  if(!enAppNativa()||esCuentaProfesor()||!r||!S.ramos.includes(r))return null;
  const d=equipoDocenciaCanvas.get(r.id);
  return d&&d.cuenta===currentUser?.id&&d.tenant===S.tenant&&(!r.origen?.tenant||r.origen.tenant===d.tenant)
    &&d.sigla===siglaRamoCanvas(r)&&d.seccion===Number(r.seccion)&&d.periodo===semester()?d:null;
}
function profesoresCanvasRamo(r){return (docenciaCanvasDeRamo(r)?.personas||[]).filter(p=>p.rol==='profesor').map(p=>p.nombre);}
function propuestaDocenciaCanvas(r){
  if(!canvasDisponible()||!S.ramos.includes(r))return null;
  const cursos=[...propuestasDocenciaCanvas.values()].filter(p=>p.estado===S&&p.tenant===S.tenant&&p.cuenta===currentUser?.id&&p.periodo===semester());
  const curso=cursoCanvasParaRamo(r,cursos.map(p=>p.curso));
  const p=curso&&cursos.find(p=>p.curso===curso);if(!p)return null;
  const guardada=docenciaCanvasDeRamo(r),nueva=p.personas.length?p.personas:null;
  return !r.seccion||nueva&&JSON.stringify(nueva)!==JSON.stringify(guardada?.personas)?{...p,ramo:r,seccionAntes:r.seccion??null,equipoAntes:JSON.stringify(guardada?.personas||null),nueva}:null;
}
async function leerDocenciaCanvas(cursos,ctx={estado:S,cuenta:currentUser?.id,periodo:semester(),tenant:S.tenant}){
  const {estado,cuenta,periodo,tenant}=ctx;
  const vigente=()=>S===estado&&S.tenant===tenant&&currentUser?.id===cuenta&&semester()===periodo&&canvasDisponible();
  for(const [k,p] of propuestasDocenciaCanvas)if(p.estado!==estado||p.cuenta!==cuenta||p.periodo!==periodo||p.tenant!==tenant)propuestasDocenciaCanvas.delete(k);
  for(const curso of cursos){
    if(!vigente())return false;
    // El código de curso no identifica el período. Tampoco se toma el equipo
    // de un semestre futuro cuando la app todavía está cerrando el anterior.
    const [anio,parte]=periodo.split('-'),termino=String(curso.periodo||'').toLowerCase();
    if(!termino.includes(anio)||!termino.includes(parte==='1'?'primer':'segundo'))continue;
    let personas=[];
    try{personas=personasDocenciaCanvas(await canvasGet(`courses/${curso.id}/users`,{'enrollment_type[]':['teacher','ta'],'include[]':['enrollments'],per_page:50}));}catch(e){}
    if(!vigente())return false;
    propuestasDocenciaCanvas.set(curso.sigla+'|'+curso.seccion,{curso,personas,estado,cuenta,periodo,tenant});
  }
  return vigente();
}
function listaDocenciaCanvasHTML(personas){
  const grupo=(rol,etiqueta)=>{const nombres=personas.filter(p=>p.rol===rol).map(p=>p.nombre);return nombres.length?'<p style="margin:6px 0;line-height:1.5;overflow-wrap:anywhere;"><b>'+(nombres.length>1?(rol==='profesor'?'Profesores':'Ayudantes'):etiqueta)+':</b> '+nombres.map(esc).join(' · ')+'</p>':'';};
  return grupo('profesor','Profesor')+grupo('ayudante','Ayudante');
}
function abrirRevisionDocenciaCanvas(ramos=S.ramos,alTerminar=null){
  const filas=ramos.map(propuestaDocenciaCanvas).filter(Boolean);
  if(!filas.length)return false;
  revisionDocenciaCanvas={filas,alTerminar,estado:S,cuenta:currentUser.id,periodo:semester(),tenant:S.tenant};
  document.getElementById('modal-content').innerHTML='<div class="modal-title">Sección y equipo de Canvas</div>'
    +'<p class="settings-help">La sección se guarda en tu cuenta. El equipo queda en esta sesión de la app. Informar al profesor se confirma aparte al calificar.</p>'
    +filas.map((p,i)=>'<section style="padding:14px 0;border-top:1px solid var(--border);"><h3 style="font-size:1rem;margin:0 0 8px;">'+esc(p.ramo.nombre)+'</h3>'
      +(!p.seccionAntes?'<label style="display:flex;align-items:center;gap:10px;min-height:44px;"><input type="checkbox" data-canvas-seccion="'+i+'" checked onchange="cambiarSeccionDocenciaCanvas('+i+',this.checked)"><span>Agregar sección '+p.curso.seccion+'</span></label>':'<p class="settings-help">Sección '+p.seccionAntes+' · se conserva</p>')
      +(p.nueva?listaDocenciaCanvasHTML(p.personas)+'<label style="display:flex;align-items:center;gap:10px;min-height:44px;"><input type="checkbox" data-canvas-equipo="'+i+'" checked><span>Mostrar este equipo en mi ficha</span></label>':'')+'</section>').join('')
    +(alTerminar?'<button type="button" class="docente-link" style="min-height:44px;" onclick="cerrarRevisionDocenciaCanvas()">Seguir solo con fechas</button>':'')
    +'<p id="canvas-docencia-error" role="alert" class="calif-error"></p><div class="modal-btns"><button type="button" class="btn-cancel" onclick="cancelarRevisionDocenciaCanvas()">Cancelar</button><button type="button" class="btn-confirm" onclick="guardarRevisionDocenciaCanvas()">Guardar datos elegidos</button></div>';
  openModal();return true;
}
function cambiarSeccionDocenciaCanvas(i,marcada){
  const equipo=document.querySelector('[data-canvas-equipo="'+i+'"]');
  if(equipo){equipo.disabled=!marcada;if(!marcada)equipo.checked=false;}
}
function cancelarRevisionDocenciaCanvas(){revisionDocenciaCanvas=null;closeModal();}
function cerrarRevisionDocenciaCanvas(){const despues=revisionDocenciaCanvas?.alTerminar;revisionDocenciaCanvas=null;closeModal();if(despues)despues();}
function guardarRevisionDocenciaCanvas(){
  const d=revisionDocenciaCanvas;if(!d)return;
  const mensaje=document.getElementById('canvas-docencia-error');
  if(S!==d.estado||S.tenant!==d.tenant||currentUser?.id!==d.cuenta||semester()!==d.periodo){mensaje.textContent='Cambió la cuenta o el semestre. Vuelve a traer los datos.';return;}
  const elegidas=d.filas.map((p,i)=>({p,seccion:!!document.querySelector('[data-canvas-seccion="'+i+'"]')?.checked,equipo:!!document.querySelector('[data-canvas-equipo="'+i+'"]')?.checked})).filter(x=>x.seccion||x.equipo);
  if(!elegidas.length){mensaje.textContent='Elige al menos un dato, o cierra sin guardar.';return;}
  // Valida el lote entero antes de escribir; una sección editada no se pisa.
  for(const {p,seccion,equipo} of elegidas){
    if(!S.ramos.includes(p.ramo)||(p.ramo.seccion??null)!==p.seccionAntes||equipo&&(!seccion&&!p.seccionAntes||JSON.stringify(docenciaCanvasDeRamo(p.ramo)?.personas||null)!==p.equipoAntes)){mensaje.textContent='Revisa la sección antes de guardar el equipo. Si cambió, vuelve a traer los datos.';return;}
  }
  for(const {p,seccion,equipo} of elegidas){
    if(seccion)p.ramo.seccion=p.curso.seccion;
    if(equipo)equipoDocenciaCanvas.set(p.ramo.id,{cuenta:d.cuenta,tenant:d.tenant,periodo:d.periodo,sigla:p.curso.sigla,seccion:p.curso.seccion,personas:p.personas.map(x=>({...x}))});
    if(seccion)completarFechasOficiales(p.ramo,{tenant:S.tenant,carrera:S.carrera});
  }
  if(elegidas.some(x=>x.seccion))save();
  cerrarRevisionDocenciaCanvas();
  if(currentRamoId&&S.ramos.some(r=>r.id===currentRamoId)&&document.getElementById('screen-ramo')?.classList.contains('active'))renderRamo();
}
function pintarDocenciaCanvasRamo(r){
  if(!enAppNativa())return;
  const caja=document.getElementById('ramo-docencia-canvas');if(!caja)return;
  const d=docenciaCanvasDeRamo(r),p=propuestaDocenciaCanvas(r);
  caja.hidden=!d&&!p;
  caja.innerHTML=(d?listaDocenciaCanvasHTML(d.personas)+'<p class="settings-help">De Canvas · '+esc(d.periodo)+' · sección '+d.seccion+'</p>':'')
    +(p?'<button type="button" class="docente-link" style="min-height:44px;" onclick="abrirRevisionDocenciaCanvas(S.ramos.filter(r=>r.id===currentRamoId))">Revisar sección y equipo de Canvas</button>':'');
}
function nombresProfesorCanvasHTML(r){
  const nombres=profesoresCanvasRamo(r);
  return nombres.length?'<datalist id="calif-profes-canvas">'+nombres.map(n=>'<option value="'+esc(n)+'"></option>').join('')+'</datalist>':'';
}
