

// ─── IMPORTAR FECHAS DESDE .ICS ─────────────────────────────────────────────
// Un .ics viene de fuera de GradeHub: se parsea como texto acotado, se propone
// y recién se aplica después de que la persona revise cada fila. Nunca toca
// pesos, notas ni una fecha existente.
const ICS_IMPORT_MAX_BYTES=512*1024;
const ICS_IMPORT_MAX_EVENTS=250;
const ICS_IMPORT_TITLE_MAX=180;
let icsImportDraft=[];

function bytesIcs(text){
  const value=String(text||'');
  return typeof TextEncoder==='function' ? new TextEncoder().encode(value).length : value.length;
}
function fechaDesdeIcs(value){
  const m=String(value||'').match(/^(\d{4})(\d{2})(\d{2})(?:T\d{4}(?:\d{2})?Z?)?$/);
  if(!m)return null;
  const y=Number(m[1]),mes=Number(m[2]),dia=Number(m[3]);
  const d=new Date(Date.UTC(y,mes-1,dia));
  if(d.getUTCFullYear()!==y||d.getUTCMonth()!==mes-1||d.getUTCDate()!==dia)return null;
  return m[1]+'-'+m[2]+'-'+m[3];
}
function desescaparIcs(value){
  return String(value||'')
    .replace(/\\n/gi,' ')
    .replace(/\\([\\;,])/g,'$1')
    .replace(/\\\\/g,'\\');
}
function parseIcsCalendario(text){
  if(typeof text!=='string'||!text.trim())throw new Error('El archivo está vacío');
  if(bytesIcs(text)>ICS_IMPORT_MAX_BYTES)throw new Error('El archivo supera el límite de 500 KB');
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text))throw new Error('El archivo contiene caracteres no válidos');

  const raw=text.replace(/\r\n?/g,'\n').split('\n');
  const lines=[];
  raw.forEach(line=>{
    if(line.length>2000)throw new Error('El archivo tiene una línea demasiado larga');
    if(/^[ \t]/.test(line)&&lines.length)lines[lines.length-1]+=line.slice(1);
    else lines.push(line);
  });
  if(!lines.includes('BEGIN:VCALENDAR')||!lines.includes('END:VCALENDAR'))throw new Error('No parece ser un calendario .ics');

  const blocks=[];let event=null;
  lines.forEach(line=>{
    if(line==='BEGIN:VEVENT'){
      if(event)throw new Error('El archivo tiene eventos mal cerrados');
      event=[];return;
    }
    if(line==='END:VEVENT'){
      if(!event)throw new Error('El archivo tiene eventos mal cerrados');
      blocks.push(event);event=null;return;
    }
    if(event)event.push(line);
  });
  if(event)throw new Error('El archivo tiene eventos sin cerrar');
  if(!blocks.length)throw new Error('No encontramos eventos en este calendario');
  if(blocks.length>ICS_IMPORT_MAX_EVENTS)throw new Error('El archivo trae más de 250 eventos');

  return blocks.map((block,index)=>{
    let summary='',start='';
    block.forEach(line=>{
      const cut=line.indexOf(':');if(cut<1)return;
      const key=line.slice(0,cut).split(';')[0].toUpperCase();
      const value=line.slice(cut+1);
      if(key==='SUMMARY'&&!summary)summary=desescaparIcs(value);
      if(key==='DTSTART'&&!start)start=value;
    });
    summary=summary.trim().replace(/\s+/g,' ');
    const fecha=fechaDesdeIcs(start);
    if(!summary||summary.length>ICS_IMPORT_TITLE_MAX||/[\u0000-\u001F\u007F]/.test(summary))throw new Error('El evento '+(index+1)+' no trae un título válido');
    if(!fecha)throw new Error('El evento '+(index+1)+' no trae una fecha válida');
    return {titulo:summary,fecha};
  });
}

function claveDestinoIcs(target){
  return target.ramo.id+'|'+target.cat.id+'|'+(target.nota?target.nota.id:'');
}
function destinosIcs(){
  const out=[];
  (S.ramos||[]).forEach(r=>(r.categorias||[]).forEach(cat=>{
    if(!cat.fecha&&!cat.fechaQuitada)out.push({ramo:r,cat,nota:null});
    (cat.notas||[]).forEach(nota=>{
      if(!nota.fecha&&!nota.fechaQuitada)out.push({ramo:r,cat,nota});
    });
  }));
  return out;
}
function etiquetaDestinoIcs(target){
  return target.ramo.nombre+' · '+(target.nota?nombreNotaCasilla(target.ramo,target.cat,target.nota):target.cat.nombre);
}
function prefijosEvaluacionIcs(nombre){
  const normal=normName(nombre).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  if(!normal)return [];
  const compact=normal.replace(/\s/g,'');
  const first=(normal.match(/^([a-z]+)\s*(\d+)?/)||[]);
  const word=first[1]||'',number=first[2]||'';
  const short=word.startsWith('interrogacion')?'i'
    :word.startsWith('solemne')?'s'
    :word.startsWith('examen')?'ex'
    :word.startsWith('prueba')?'p'
    :word.startsWith('control')?'c'
    :word.startsWith('laboratorio')?'l'
    :word.startsWith('tarea')?'t'
    :word.startsWith('quiz')?'q'
    :word.startsWith('evaluacion')?'ev'
    :word.slice(0,Math.min(3,word.length));
  return [...new Set([normal,compact,word+(number||''),short+(number||'')].filter(Boolean))];
}
function coincidenciaIcs(evento,targets){
  const title=normName(evento.titulo).replace(/[—–-]/g,' ').replace(/\s+/g,' ').trim();
  const matches=targets.filter(target=>{
    const ramo=normName(target.ramo.nombre);
    if(!ramo||!title.endsWith(ramo))return false;
    const prefijo=title.slice(0,title.length-ramo.length).trim();
    const nombres=target.nota?[target.nota.nombre,nombreNotaCasilla(target.ramo,target.cat,target.nota)]:[target.cat.nombre];
    return nombres.some(nombre=>prefijosEvaluacionIcs(nombre).includes(prefijo));
  });
  return matches.length===1?claveDestinoIcs(matches[0]):null;
}
// Lógica compartida por el calendario web y el conector iOS de Canvas UC.
// Recibe respuestas sintéticas o del GET de Canvas; no toca el token, notas,
// ponderaciones ni fechas guardadas. Todo resultado pasa por renderRevisionIcs.
function siglaRamoCanvas(r){
  return String((typeof siglaDeRamo==='function'?siglaDeRamo(r,S.tenant):null)||r.sigla||'').toUpperCase();
}
function fechaChileCanvas(dueAt){
  const d=new Date(dueAt);if(Number.isNaN(d.getTime()))return null;
  const piezas=new Intl.DateTimeFormat('en-US',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const v=Object.fromEntries(piezas.map(p=>[p.type,p.value]));
  return v.year+'-'+v.month+'-'+v.day;
}
function tipoEvaluacionCanvas(nombre){
  const n=normName(nombre).replace(/[^a-z0-9 ]/g,' ').trim();
  const m=/^(interrogacion|solemne|prueba|control|tarea|quiz|laboratorio|examen|evaluacion|i\s*\d|s\s*\d|p\s*\d|c\s*\d|t\s*\d|q\s*\d|ex\s*\d)/.exec(n);
  if(!m)return null;
  const v=m[1];
  return /^i\s*\d/.test(v)?'interrogacion':/^s\s*\d/.test(v)?'solemne':/^p\s*\d/.test(v)?'prueba':/^c\s*\d/.test(v)?'control':/^t\s*\d/.test(v)?'tarea':/^q\s*\d/.test(v)?'quiz':/^ex\s*\d/.test(v)?'examen':v;
}
function resumenFechasCanvas(tareas,ramo,ahora,grupos=[]){
  const hoy=fechaChileCanvas(ahora||new Date());
  const porGrupo=new Map((grupos||[]).map(g=>[String(g.id),String(g.name||'')]));
  const entrada=Array.isArray(tareas)&&tareas.length?tareas:(grupos||[]).flatMap(g=>(g.assignments||[]).map(t=>({...t,assignment_group_id:g.id})));
  const destinos=destinosIcs().filter(t=>t.ramo.id===ramo.id&&(t.nota||!(t.cat.notas||[]).length));
  const usados=new Set(),vistas=new Set(),propuestas=[];
  const conteos={total:entrada.length,sinFecha:0,pasadas:0,duplicadas:0,sinDestino:0};
  for(const tarea of entrada){
    if(!tarea||!tarea.due_at){conteos.sinFecha++;continue;}
    const fecha=fechaChileCanvas(tarea.due_at);
    if(!fecha){conteos.sinFecha++;continue;}
    if(fecha<hoy){conteos.pasadas++;continue;}
    const nombre=String(tarea.name||'').trim().replace(/[\s_-]*P(regunta)?\s*\d+$/i,'').trim();
    if(!nombre){conteos.sinDestino++;continue;}
    const grupo=String(tarea.assignment_group?.name||porGrupo.get(String(tarea.assignment_group_id))||'').trim();
    const clave=normName(nombre)+'|'+fecha+'|'+normName(grupo);
    if(vistas.has(clave)){conteos.duplicadas++;continue;}
    vistas.add(clave);
    const puntuar=(t)=>{
      const nombres=t.nota?[t.nota.nombre,nombreNotaCasilla(t.ramo,t.cat,t.nota)]:[t.cat.nombre];
      const prefijos=nombres.flatMap(prefijosEvaluacionIcs);
      const exacta=(pista)=>prefijosEvaluacionIcs(pista).some(p=>p.length>=2&&prefijos.includes(p));
      if(exacta(nombre))return 3;
      if(grupo&&exacta(grupo))return 2;
      const tipos=nombres.map(tipoEvaluacionCanvas);
      return tipos.includes(tipoEvaluacionCanvas(nombre))&&tipoEvaluacionCanvas(nombre)?1
        :grupo&&tipos.includes(tipoEvaluacionCanvas(grupo))&&tipoEvaluacionCanvas(grupo)?1:0;
    };
    const candidatos=destinos.filter(t=>!usados.has(claveDestinoIcs(t))).map(t=>({t,p:puntuar(t)})).filter(x=>x.p>0)
      .sort((a,b)=>b.p-a.p);
    const target=candidatos.length?claveDestinoIcs(candidatos[0].t):null;
    if(target)usados.add(target);else conteos.sinDestino++;
    propuestas.push({titulo:nombre+' · '+ramo.nombre,fecha,ramoId:ramo.id,target,origen:'canvas'});
  }
  return {propuestas,conteos};
}
function fechasCanvas(tareas,ramo,ahora,grupos){return resumenFechasCanvas(tareas,ramo,ahora,grupos).propuestas;}
function prepararImportacionIcs(text){
  const targets=destinosIcs();
  return parseIcsCalendario(text).map(evento=>{
    const target=coincidenciaIcs(evento,targets);
    return {...evento,target,ramoId:target?targets.find(t=>claveDestinoIcs(t)===target).ramo.id:null};
  });
}
function aplicarPropuestasIcs(propuestas){
  const targets=new Map(destinosIcs().map(target=>[claveDestinoIcs(target),target]));
  const elegidas=(propuestas||[]).filter(p=>p&&p.target);
  if(!elegidas.length)return 0;
  const seen=new Set();
  elegidas.forEach(p=>{
    if(seen.has(p.target))throw new Error('Una evaluación no puede recibir dos fechas');
    seen.add(p.target);
    if(!targets.has(p.target))throw new Error('Una de las fechas ya no está disponible');
    if(!fechaDesdeIcs(String(p.fecha||'').replace(/-/g,'')))throw new Error('Una fecha propuesta no es válida');
  });
  elegidas.forEach(p=>{
    const target=targets.get(p.target);
    const item=target.nota||target.cat;
    item.fecha=p.fecha;item.fechaOrigen='calendario';item.fechaQuitada=false;
  });
  return elegidas.length;
}


function abrirImportarCalendario(){
  icsImportDraft=[];
  document.getElementById('modal-content').innerHTML=[
    '<div class="modal-title">Importar fechas desde un calendario</div>',
    '<p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0 0 14px;">Elige un archivo <b>.ics</b> exportado desde Apple, Google u Outlook. Primero revisas dónde va cada fecha: nada se guarda todavía.</p>',
    '<label class="modal-label" for="ics-file">Archivo de calendario</label>',
    '<div class="modal-input"><input type="file" id="ics-file" accept=".ics,text/calendar" aria-describedby="ics-file-help"/></div>',
    '<p id="ics-file-help" class="settings-help">Máximo 500 KB y 250 eventos. Solo leemos títulos y fechas; tus notas no se tocan.</p>',
    '<div class="modal-btns" style="margin-top:14px;"><button class="btn-cancel" type="button" onclick="closeModal()">Cancelar</button></div>'
  ].join('');
  openModal();
  document.getElementById('ics-file').addEventListener('change',leerArchivoIcs);
}
function leerArchivoIcs(event){
  const file=event&&event.target&&event.target.files&&event.target.files[0];
  if(!file)return;
  if(file.size>ICS_IMPORT_MAX_BYTES){showToast('El archivo supera el límite de 500 KB',true);return;}
  file.text().then(text=>{
    icsImportDraft=prepararImportacionIcs(text);
    renderRevisionIcs();
  }).catch(()=>showToast('No pudimos leer ese archivo',true));
}
function opcionesRamoIcs(selected){
  return '<option value="">Elegir ramo</option>'+(S.ramos||[]).map(r=>
    '<option value="'+esc(r.id)+'"'+(r.id===selected?' selected':'')+'>'+esc(r.nombre)+'</option>').join('');
}
function opcionesDestinoIcs(selected,used,ramoId){
  return ['<option value="">No importar</option>'].concat(destinosIcs().filter(t=>t.ramo.id===ramoId).map(target=>{
    const key=claveDestinoIcs(target);
    const disabled=used.has(key)&&key!==selected?' disabled':'';
    return '<option value="'+esc(key)+'"'+(key===selected?' selected':'')+disabled+'>'+esc(target.nota?nombreNotaCasilla(target.ramo,target.cat,target.nota):target.cat.nombre)+'</option>';
  })).join('');
}
function renderRevisionIcs(){
  const used=new Set(icsImportDraft.map(item=>item.target).filter(Boolean));
  const rows=icsImportDraft.map((item,index)=>{
    const ramoId=item.ramoId||((destinosIcs().find(t=>claveDestinoIcs(t)===item.target)||{}).ramo||{}).id||null;
    const estado=item.target?(item.origen==='canvas'?'Sugerencia de Canvas':'Coincidencia propuesta'):'Sin asignar';
    return '<div style="padding:12px 0;border-bottom:1px solid var(--border);">'
      +'<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;"><b style="font-size:0.875rem;">'+esc(item.titulo)+'</b><span style="font-size:0.75rem;color:var(--fg3);white-space:nowrap;">'+esc(fechaCorta(item.fecha))+'</span></div>'
      +'<div style="font-size:0.75rem;color:var(--fg3);margin:4px 0 8px;">'+estado+'</div>'
      +'<div class="modal-input"><label class="modal-label" for="ics-ramo-'+index+'">Ramo</label><select class="feedback-select" style="min-height:44px;margin-bottom:0;" id="ics-ramo-'+index+'" data-ics-ramo aria-label="Ramo de '+esc(item.titulo)+'" onchange="asignarRamoIcs('+index+',this.value)">'+opcionesRamoIcs(ramoId)+'</select></div>'
      +'<div class="modal-input"><label class="modal-label" for="ics-evaluacion-'+index+'">Evaluación</label><select class="feedback-select" style="min-height:44px;margin-bottom:0;" id="ics-evaluacion-'+index+'" data-ics-evaluacion aria-label="Evaluación de '+esc(item.titulo)+'" onchange="asignarDestinoIcs('+index+',this.value)"'+(ramoId?'':' disabled')+'>'+opcionesDestinoIcs(item.target,used,ramoId)+'</select></div>'
      +'</div>';
  }).join('');
  document.getElementById('modal-content').innerHTML=[
    '<div class="modal-title">Revisa las fechas</div>',
    '<p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0 0 8px;">Las coincidencias son propuestas. Puedes cambiarlas, dejar una sin importar o asignar manualmente las que no calzaron.</p>',
    '<div id="ics-revision-lista" style="max-height:48vh;overflow:auto;border-top:1px solid var(--border);">'+rows+'</div>',
    '<div class="modal-btns" style="margin-top:14px;"><button class="btn-cancel" type="button" onclick="closeModal()">Cancelar</button><button class="btn-confirm" type="button" onclick="confirmarImportarCalendario()">Agregar fechas elegidas</button></div>'
  ].join('');
}
function asignarRamoIcs(index,ramoId){
  if(!Number.isInteger(index)||!icsImportDraft[index])return;
  icsImportDraft[index].ramoId=(S.ramos||[]).some(r=>r.id===ramoId)?ramoId:null;
  icsImportDraft[index].target=null;
  const lista=document.getElementById('ics-revision-lista');const arriba=lista?lista.scrollTop:0;
  renderRevisionIcs();
  const nueva=document.getElementById('ics-revision-lista');if(nueva)nueva.scrollTop=arriba;
  const select=nueva&&nueva.querySelectorAll('[data-ics-evaluacion]')[index];
  if(select)select.focus({preventScroll:true});
}
function asignarDestinoIcs(index,target){
  if(!Number.isInteger(index)||!icsImportDraft[index])return;
  const encontrado=destinosIcs().find(t=>claveDestinoIcs(t)===target);
  const ramoId=icsImportDraft[index].ramoId;
  const valido=encontrado&&(!ramoId||encontrado.ramo.id===ramoId);
  icsImportDraft[index].target=valido?target:null;
  if(valido)icsImportDraft[index].ramoId=encontrado.ramo.id;
  // Se redibuja para deshabilitar el destino recién tomado en las demás filas;
  // sin esto la lista volvía arriba y el foco se perdía en cada elección.
  const lista=document.getElementById('ics-revision-lista');
  const arriba=lista?lista.scrollTop:0;
  renderRevisionIcs();
  const nueva=document.getElementById('ics-revision-lista');
  if(nueva)nueva.scrollTop=arriba;
  const select=nueva&&nueva.querySelectorAll('[data-ics-evaluacion]')[index];
  if(select)select.focus({preventScroll:true});
}
function confirmarImportarCalendario(){
  let aplicadas=0;
  try{aplicadas=aplicarPropuestasIcs(icsImportDraft);}
  catch(error){showToast(error.message||'No pudimos aplicar esas fechas',true);return;}
  if(!aplicadas){showToast('Elige al menos una evaluación para importar',true);return;}
  save();
  if(typeof renderAgenda==='function')renderAgenda();
  const revisadas=icsImportDraft.length;
  icsImportDraft=[];
  closeModal();
  track('import_ics',{eventos:aplicadas,revisados:revisadas});
  showToast(aplicadas+' fecha'+(aplicadas===1?' agregada':'s agregadas'));
}

// Canvas UC en iOS (#648): el token cruza el puente nativo una vez y queda en
// el llavero. Esta capa solo recibe datos por GET y reutiliza las revisiones
// existentes; no guarda token, notas, ponderaciones ni fechas sin confirmar.
