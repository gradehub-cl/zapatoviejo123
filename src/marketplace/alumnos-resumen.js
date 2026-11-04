// ─── RESUMEN DE ALUMNOS (Lucas, 2026-10-22) ──────────────────────────────────
// La vista con la que abre Alumnos: a quién atender y quién rinde esta semana.
// Sale de lo que el panel ya bajó; no consulta nada nuevo.
const DIAS_SEMANA_PANEL=7,MAX_FILAS_RESUMEN_PANEL=10;
function fechaLargaPanel(iso){
  const d=new Date(iso+'T12:00:00');if(isNaN(d))return iso;
  const dia=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()];
  return `${dia[0].toUpperCase()+dia.slice(1)} ${fechaCorta(iso)}`;
}
function resumenInicioAlumnosPanel(alumnos,ahora=new Date()){
  const dia=d=>{const x=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()+d);return isoOf(x.getFullYear(),x.getMonth(),x.getDate());};
  const hoy=dia(0),limite=dia(DIAS_SEMANA_PANEL);
  const diasA=f=>Math.round((new Date(f+'T12:00:00')-new Date(hoy+'T12:00:00'))/86400000);
  const semana=[];
  (alumnos||[]).forEach(al=>conRamosAlumnoPanel(al,()=>{
    let eventos=[];try{eventos=agendaEvents((al.ramos||[]).map(ramoParaPanel));}catch(e){}
    eventos.filter(e=>e.pending&&e.fecha>=hoy&&e.fecha<=limite).forEach(e=>semana.push({al,fecha:e.fecha,hora:e.hora||null,
      dias:diasA(e.fecha),evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,ramo:e.ramo.nombre}));
  }));
  // Hoy y mañana primero, como en la Agenda (#814); después por fecha y hora.
  const cuando=x=>`${x.fecha}T${x.hora||''}`;
  semana.sort((a,b)=>cuando(a).localeCompare(cuando(b))||String(a.al.nombre_visible).localeCompare(String(b.al.nombre_visible),'es'));
  const filas=alumnosOrdenadosPanel(alumnos||[],ahora);
  const atencion=filas.map(f=>({al:f.al,ramos:(f.porRamo||[]).filter(d=>d.nivel==='bad'||d.nivel==='warn'),exigente:f.exigente}))
    .filter(f=>f.ramos.length);
  const contar=n=>filas.filter(f=>(f.porRamo||[]).some(d=>d.nivel===n)).length;
  return {semana,atencion,conectados:(alumnos||[]).length,reprobando:contar('bad'),alBorde:contar('warn')};
}
function resumenInicioAlumnosHTML(r){
  const texto=n=>n==='bad'?'Reprobando':'Al borde';
  const cifra=(valor,etiqueta,detalle,nivel=null)=>`<div class="ah-cifra"><span class="ah-cifra-valor">${valor}</span><span class="ah-cifra-etiqueta">${etiqueta}</span><small>${detalle}</small>${nivel&&r.conectados>0?`<span class="panel-riesgo-riel panel-riesgo-${nivel}" aria-hidden="true"><i style="transform:scaleX(${Math.min(1,valor/r.conectados).toFixed(4)})"></i></span>`:''}</div>`;
  const mas=(n,vista)=>n>MAX_FILAS_RESUMEN_PANEL?`<button type="button" class="agent-refresh" data-ir-vista="${vista}">Ver ${n-MAX_FILAS_RESUMEN_PANEL} más en la lista</button>`:'';
  // Agrupada por día (2026-10-23): la fecha va una vez como encabezado y no se
  // repite en cada fila; en la fila queda solo la hora, si la hay.
  const diaTexto=x=>x.dias===0?'Hoy':x.dias===1?'Mañana':fechaLargaPanel(x.fecha);
  const visibles=r.semana.slice(0,MAX_FILAS_RESUMEN_PANEL);
  const dias=[...new Set(visibles.map(x=>x.fecha))];
  const semana=r.semana.length?dias.map(f=>{const del=visibles.filter(x=>x.fecha===f);
      return `<h3 class="panel-resumen-dia${del[0].dias<=1?' pronto':''}">${esc(diaTexto(del[0]))}<small>${del.length} ${del.length===1?'evaluación':'evaluaciones'}</small></h3>
      <ul class="panel-resumen-filas">${del.map(x=>`<li><button type="button" data-ver-alumno="${esc(x.al.id)}">
      <span><b>${esc(x.al.nombre_visible)}</b><small>${esc(x.evaluacion)} · ${esc(x.ramo)}</small></span>
      ${x.hora?`<span class="panel-resumen-cuando">${esc(x.hora)}</span>`:''}</button></li>`).join('')}</ul>`;}).join('')+mas(r.semana.length,'lista')
    :'<p class="profesor-hig-vacio">Nadie de tus alumnos tiene evaluaciones en los próximos 7 días.</p>';
  const atencion=r.atencion.length?`<ul class="panel-resumen-filas">${r.atencion.slice(0,MAX_FILAS_RESUMEN_PANEL).map(x=>`<li><button type="button" data-ver-alumno="${esc(x.al.id)}">
      <span><b>${esc(x.al.nombre_visible)}</b><span class="panel-alumnos-fila-estados">${x.ramos.map(d=>`<span class="panel-resumen-sem panel-resumen-${d.nivel}">${esc(d.nombre)} · ${texto(d.nivel)}</span>${d.motivo?`<span class="panel-alumnos-fila-meta">${esc(d.motivo)}</span>`:''}`).join('')}</span></span>
      ${x.exigente&&Number.isFinite(x.exigente.necesita)?`<span class="panel-resumen-cuando"><span class="panel-resumen-meta">Para aprobar</span><b>${x.exigente.necesita>7.05?'No alcanza':esc(nfNecesaria(x.exigente.necesita).replace('.',','))}</b><small>${x.exigente.necesita>7.05?esc(x.exigente.ramo.nombre):`en lo pendiente de ${esc(x.exigente.ramo.nombre)}`}</small></span>`:''}</button></li>`).join('')}</ul>${mas(r.atencion.length,'lista')}`
    :'<p class="profesor-hig-vacio">Ninguno va reprobando ni al borde.</p>';
  return `<div class="ah-cifras panel-resumen-cifras">${cifra(r.conectados,'Alumnos conectados','Comparten sus ramos contigo')}${cifra(r.semana.length,'Evaluaciones próximas','En los próximos 7 días')}${cifra(r.reprobando,'Reprobando algún ramo',`De ${r.conectados} alumnos`,'bad')}${cifra(r.alBorde,'Al borde en algún ramo',`De ${r.conectados} alumnos`,'warn')}</div>
    <div class="panel-alumnos-resumen-columnas">
      <section class="panel-alumnos-resumen-bloque" aria-labelledby="resumen-atencion">
        <div class="profesor-hig-lista-cabeza"><h2 id="resumen-atencion">Necesitan atención</h2></div>
        <div class="panel-alumnos-resumen-scroll" role="region" aria-labelledby="resumen-atencion" tabindex="0">${atencion}</div>
      </section>
      <section class="panel-alumnos-resumen-bloque" aria-labelledby="resumen-semana">
        <div class="profesor-hig-lista-cabeza"><h2 id="resumen-semana">Esta semana</h2></div>
        <div class="panel-alumnos-resumen-scroll" role="region" aria-labelledby="resumen-semana" tabindex="0">${semana}</div>
      </section>
    </div>`;
}
function contenidoAlumnoPanelHTML(al,compDe,ahora){
  return `${(al.ramos||[]).map(r=>{const comp=compDe(al,r)||{};return antesAhoraAlumnoHTML(metricasAlumnoRamoPanel(al,r,compDe),{inicios:new Map([[r.id,inicioRamoPanel(al,r)]]),seccion:comp.sinSeccion||Number.isInteger(comp.seccion),sinSeccion:!!comp.sinSeccion});}).join('')}
    ${(al.ramos||[]).length?(ctx=>(al.ramos||[]).map(r=>ramoPanelHTML(r,compDe(al,r),ahora,ctx,lineaInicioRamoHTML(al,r),(al.ramos||[]).length===1)).join(''))(ramosDelAlumnoPanel(al)):'<p class="clase-sin-datos">Ya no tiene los ramos que te compartió.</p>'}
    <button type="button" class="settings-danger-btn" data-quitar-alumno="${esc(al.id)}" data-nombre="${esc(al.nombre_visible)}">Quitar de mi lista</button>`;
}
function alumnosOrdenadosPanel(lista,ahora=new Date()){
  return lista.map(al=>datosFilaAlumnoPanel(al,ahora))
    .sort((a,b)=>b.prioridad-a.prioridad||b.exigencia-a.exigencia||
      (a.proxima?.fecha||'9999').localeCompare(b.proxima?.fecha||'9999')||
      String(a.al.nombre_visible||'').localeCompare(String(b.al.nombre_visible||''),'es'));
}
// En la pantalla principal solo se generan filas compactas. La ficha completa
// se construye para un alumno cuando el profesor la abre.
function alumnosPanelHTML(lista,compDe,ahora=new Date(),{soloFilas=false,limite=Infinity}={}){
  const abierto=lista.length===1?' open':'';
  const ordenados=alumnosOrdenadosPanel(lista,ahora);
  // Con varios ramos, el estado de cada uno: el peor solo escondía que en el
  // otro va bien (o al revés).
  const texto=n=>n==='bad'?'Reprobando':n==='warn'?'Al borde':n==='good'?'Aprobando':'Sin notas';
  const chip=(n,contenido,aria)=>`<span class="panel-alumnos-fila-estado panel-resumen-sem ${n==='neutral'?'':`panel-resumen-${n}`}" aria-label="${aria}">${contenido}</span>`;
  const estadoHTML=(nivel,porRamo)=>porRamo.length
    ?`<span class="panel-alumnos-fila-estados">${porRamo.map(d=>chip(d.nivel,`${esc(d.nombre)} · ${texto(d.nivel)}`,`${esc(d.nombre)}: ${texto(d.nivel).toLowerCase()}`)).join('')}</span>`
    :chip(nivel,texto(nivel),`Estado: ${texto(nivel).toLowerCase()}`);
  return ordenados.slice(0,limite).map(({al,nivel,proxima,exigente,porRamo})=>conUniversidadPanel(al.tenant,()=>{
    const fila=`<span class="panel-alumnos-fila"><span class="panel-alumnos-fila-cabeza"><b>${esc(al.nombre_visible)}</b><small>${(al.ramos||[]).length} ${(al.ramos||[]).length===1?'ramo':'ramos'}</small></span>
        ${estadoHTML(nivel,porRamo)}
        ${porRamo.filter(d=>d.motivo).map(d=>`<span class="panel-alumnos-fila-meta">${porRamo.length>1?esc(d.nombre)+': ':''}${esc(d.motivo)}</span>`).join('')}
        ${proximaFilaAlumnoHTML(proxima,exigente)}</span>`;
    return soloFilas?`<button type="button" data-ver-alumno="${esc(al.id)}" class="panel-alumnos-alumno panel-alumnos-fila-boton">${fila}<span class="panel-alumnos-abrir" aria-hidden="true">›</span></button>`
      :`<details data-alumno="${esc(al.id)}" class="panel-alumnos-alumno"${abierto}>
      <summary>${fila}</summary>${contenidoAlumnoPanelHTML(al,compDe,ahora)}</details>`;
  })).join('');
}

// Exportar: una fila por alumno, ramo y evaluación, armada en el navegador con
// lo que el panel ya tiene; no pasa por ningún servidor. Punto y coma y coma
// decimal, como lo abre Excel en Chile; Google Sheets lo detecta igual.
function celdaCsvPanel(v){
  if(v===null||v===undefined)return '';
  let s=String(v);
  // El nombre lo escribe el alumno: "=…" no puede llegar a Excel como fórmula.
  // Un número negativo ("-1,0") no es una fórmula y tiene que llegar como número.
  if(/^[=+\-@\t\r]/.test(s)&&!/^-\d+(,\d+)?$/.test(s))s="'"+s;
  return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
// `compSeccionDe` da la comparación con la sección de cada alumno: va en las
// cuatro columnas que siguen al inicio de clases. Los tamaños de muestra se
// agregan después, sin mover las columnas que ya existían.
function csvAlumnosPanel(alumnos,compDe,compSeccionDe=null){
  const num=v=>v===null||v===undefined?'':String(v).replace('.',',');
  const gh=e=>{const dato=datosComparacionPanel(e);return dato?num(fmtPromedio(dato.promedio)):'';};
  // Las de "antes y ahora" (#697) y cuándo empezó en el ramo (2026-10-20) van
  // al final para no mover las columnas que alguien ya usa en su planilla.
  const filas=[['Alumno','Ramo','Sigla','Categoría','Evaluación','Nota','Promedio del ramo','GradeHub evaluación','GradeHub categoría','GradeHub ramo','Fecha','Antes o desde que empezó','Diferencia con el ramo','Empezó contigo en este ramo','Sección','Sección evaluación','Sección categoría','Sección ramo','Estudiantes en GradeHub (ramo)','Estudiantes en GradeHub (sección)','Método','Preparó con el profesor','Percentil evaluación','Percentil antes','Percentil ahora','Cambio percentil']];
  alumnos.forEach(al=>conUniversidadPanel(al.tenant,()=>{const ctx=ramosDelAlumnoPanel(al);
    const conFecha=new Map(metricasAlumnoPanel(al,compDe).evaluaciones.map(e=>[e.id,e]));
    const tiempo=id=>{const e=conFecha.get(id);if(!e)return ['','sin fecha',''];
      return [e.fecha||'',e.metodo==='manual'?'':e.lado==='antes'?'antes':'desde que empezó',e.curso===null?'':num((e.nota-e.curso).toFixed(1))];};
    (al.ramos||[]).forEach(r=>{
    const empezo=inicioRamoPanel(al,r).dia||'';
    const seccion=Number.isInteger(r.seccion)?r.seccion:'no declarada';
    const compSec=(compSeccionDe&&compSeccionDe(al,r))||{};
    const secNota=new Map((compSec.evaluaciones||[]).map(e=>[e.clave,e]));
    const secCategoria=new Map((compSec.categorias||[]).map(e=>[e.clave,e]));
    const ramo=ramoParaPanel(r),comp=compDe(al,r)||{};
    const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
    const sigla=(typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||'';
    const porNota=new Map((comp.evaluaciones||[]).map(e=>[e.clave,e]));
    const porCategoria=new Map((comp.categorias||[]).map(e=>[e.clave,e]));
    const base=[al.nombre_visible,ramo.nombre,sigla];
    const prom=avg===null?'':num(fmtPromedio(avg)),ghRamo=gh(comp.ramo);
    const categorias=categoriasDeRamoPanel(ramo);
    const muestras=[datosComparacionPanel(comp.ramo)?.personas??'',datosComparacionPanel(compSec.ramo)?.personas??''];
    // Un ramo sin notas igual sale, para que el archivo tenga a todos.
    if(!categorias.length){filas.push([...base,'','','',prom,'','',ghRamo,'','','',empezo,seccion,'','',gh(compSec.ramo),...muestras,preparacionRamoPanel(al,r)?.manual?'manual':'fecha','','','','','']);return;}
    categorias.forEach(c=>c.notas.forEach(n=>filas.push([...base,c.nombre,n.nombre,num(fmt(n.valor)),prom,
      gh(porNota.get(n.clave)),gh(porCategoria.get(c.clave)),ghRamo,...tiempo(n.id),empezo,
      seccion,gh(secNota.get(n.clave)),gh(secCategoria.get(c.clave)),gh(compSec.ramo),...muestras,preparacionRamoPanel(al,r)?.manual?'manual':'fecha',preparacionRamoPanel(al,r)?.manual?(conFecha.get(n.id)?.lado==='ahora'?'sí':'no'):'',num(percentilEvaluacionPanel(al,r,n.id,comp)),...['antes','ahora','cambio'].map(k=>num(resumenPercentilesPanel(metricasAlumnoRamoPanel(al,r,compDe))[k]))])));
  });}));
  return filas.map(f=>f.map(celdaCsvPanel).join(';')).join('\r\n');
}
// Una fila por ramo compartido. Las diferencias usan exactamente el corte y
// las comparaciones del panel; sin muestra suficiente la celda queda vacía.
function csvResumenAlumnosPanel(alumnos,compDe,compSeccionDe=null,ahora=new Date()){
  const num=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'':String(v).replace('.',',');
  const prom=v=>v===null||v===undefined?'':num(fmtPromedio(Number(v)));
  const comparable=x=>{const dato=datosComparacionPanel(x);return dato?prom(dato.promedio):'';};
  const diferencia=v=>v===null||v===undefined?'':num(v.toFixed(1));
  const estado={good:'Aprobando',warn:'Al borde',bad:'Reprobando',neutral:'Sin notas'};
  const filas=[['Alumno','Ramo','Sigla','Sección','Empezó contigo en este ramo','Promedio del ramo','GradeHub ramo','Sección ramo','Diferencia con el ramo antes','Diferencia con el ramo desde que empezó','Cambio','Estado','Próxima evaluación','Nota necesaria para aprobar','Estudiantes en GradeHub (ramo)','Estudiantes en GradeHub (sección)','Método','No preparadas frente a GradeHub','Preparadas frente a GradeHub','Cambio entre grupos','Percentil antes','Percentil ahora','Cambio percentil']];
  (alumnos||[]).forEach(al=>conRamosAlumnoPanel(al,ctx=>{
    (al.ramos||[]).forEach(r=>{
      const ramo=ramoParaPanel(r),comp=compDe(al,r)||{};
      const sec=(compSeccionDe&&compSeccionDe(al,r))||{};
      const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
      const nivel=avg===null?'neutral':nivelRamo(ramo,avg);
      const met=metricasAlumnoRamoPanel(al,r,compDe);
      const proxima=proximaEvaluacionPanel(ramo,ahora,ctx);
      filas.push([al.nombre_visible,ramo.nombre,
        (typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||'',
        Number.isInteger(r.seccion)?r.seccion:'no declarada',
        inicioRamoPanel(al,r).dia||'',prom(avg),comparable(comp.ramo),comparable(sec.ramo),
        met.metodo==='manual'?'':diferencia(met.antes.diferencia),met.metodo==='manual'?'':diferencia(met.ahora.diferencia),
        met.metodo==='manual'?'':diferencia(met.cambio),estado[nivel]||'Sin notas',
        proxima?proxima.evaluacion:'',proxima&&proxima.necesita?num(proxima.necesita):'',
        datosComparacionPanel(comp.ramo)?.personas??'',datosComparacionPanel(sec.ramo)?.personas??'',met.metodo,met.metodo==='manual'?diferencia(met.antes.diferencia):'',met.metodo==='manual'?diferencia(met.ahora.diferencia):'',met.metodo==='manual'?diferencia(met.cambio):'',...['antes','ahora','cambio'].map(k=>num(resumenPercentilesPanel(met)[k]))]);
    });
  }));
  return filas.map(f=>f.map(celdaCsvPanel).join(';')).join('\r\n');
}
async function exportarAlumnosPanel(lista,compDe,compSeccionDe=null,formato='detalle',ejemplo=false){
  const hoy=new Date(),dd=n=>String(n).padStart(2,'0');
  const nombre=`gradehub-alumnos${ejemplo?'-ejemplo':''}${formato==='resumen'?'-resumen':''}-${hoy.getFullYear()}-${dd(hoy.getMonth()+1)}-${dd(hoy.getDate())}.csv`;
  // La marca BOM hace que Excel lea bien las tildes.
  const csv=formato==='resumen'?csvResumenAlumnosPanel(lista,compDe,compSeccionDe,hoy):csvAlumnosPanel(lista,compDe,compSeccionDe);
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  if(!ejemplo)track('panel_alumnos_exportado',{alumnos:lista.length});
  // En el teléfono, guardar un archivo es la hoja de compartir del sistema.
  try{
    const archivo=typeof File==='function'?new File([blob],nombre,{type:blob.type}):null;
    const tactil=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
    if(tactil&&archivo&&navigator.share&&navigator.canShare&&navigator.canShare({files:[archivo]})){
      await navigator.share({files:[archivo]});return;
    }
  }catch(e){if(e&&e.name==='AbortError')return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=nombre;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(ejemplo?'Archivo de ejemplo descargado.':'Archivo descargado.');
}
function elegirArchivoAlumnosPanel(alElegir){
  const caja=document.getElementById('modal-content');if(!caja)return;
  caja.innerHTML=`<div class="modal-title" id="modal-titulo">Exportar a Excel</div>
    <p class="compartir-explica">Elige el archivo que necesitas.</p>
    <div class="panel-alumnos-exportar-opciones">
      <button type="button" data-exportar-panel="detalle"><b>Detalle por evaluación</b><span>Una fila por evaluación, para tablas dinámicas</span></button>
      <button type="button" data-exportar-panel="resumen"><b>Resumen por alumno</b><span>Una fila por alumno y ramo, para gráficos</span></button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" id="alumnos-exportar-cancelar">Cancelar</button></div>`;
  openModal();
  caja.querySelector('#alumnos-exportar-cancelar').addEventListener('click',closeModal);
  caja.querySelectorAll('[data-exportar-panel]').forEach(b=>b.addEventListener('click',()=>{
    const formato=b.dataset.exportarPanel;
    closeModal();alElegir(formato);
  }));
}

// La pestaña "Alumnos" (#697): el panel ya no vive dentro de Clases.
let versionTabAlumnos=0;
async function renderAlumnosTab(){
  const raiz=document.getElementById('alumnos-body');
  if(!raiz)return;
  const usuario=currentUser,version=++versionTabAlumnos;
  // Una cuenta de profesor tiene esta pestaña desde el primer día (#697), pero
  // sus consultas exigen estar aprobado: mientras no lo esté, se dice por qué
  // está vacía en vez de mostrar un error.
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor()){
    if(perfilProfesorConocido()===undefined)await cargarPerfilProfesor().catch(()=>{});
    if(currentUser!==usuario||version!==versionTabAlumnos)return;
    if(!esProfesorAprobado()){
      raiz.innerHTML='<div class="profesor-hig">'+
        '<p class="profesor-info" role="status">Cuando aprobemos tu postulación, acá vas a ver las notas que tus alumnos decidan compartirte.</p></div>';
      return;
    }
  }
  renderAlumnosProfesor(raiz);
}
