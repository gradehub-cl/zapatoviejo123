// ─── LISTA DE ALUMNOS (Lucas, 2026-11-05) ────────────────────────────────────
// Responde a quién hay que ver primero. Una fila por alumno y ramo, porque un
// alumno con dos ramos puede ir bien en uno y mal en otro (Salva Ramos,
// 2026-11-03). Sigue a Estadísticas: tokens `.est`, sin teñir por tema, y el
// rojo solo para quien va reprobando o ya no alcanza.
const LISTA_PESTANAS=[['todos','Todos'],['apoyo','Por apoyar'],['semana','Esta semana'],['sin','Sin notas']];
function estadoListaPanel(){return {tab:'todos',ramo:''};}
const claveRamoListaPanel=f=>f.ramo?String((typeof siglaDeRamo==='function'&&siglaDeRamo(f.ramo))||f.ramo.sigla||f.ramo.nombre):'';
function filasListaPanel(alumnos,ahora=new Date()){
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  const semana=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()+6),finSemana=isoOf(semana.getFullYear(),semana.getMonth(),semana.getDate());
  const filas=(alumnos||[]).flatMap(al=>{
    // Quien dejó de tener los ramos que compartió sigue en la lista.
    if(!(al.ramos||[]).length)return [{al,r:null,ramo:null,avg:null,nivel:'neutral',necesita:null,motivo:'',proxima:null,prioridad:0,enSemana:false}];
    return conRamosAlumnoPanel(al,contexto=>al.ramos.map(r=>{
      const ramo=ramoParaPanel(r),d=datosRamoFilaPanel(ramo,contexto);
      let proxima=null;
      try{const e=agendaEvents([ramo]).find(x=>x.pending&&x.fecha>=hoy);
        if(e)proxima={evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,fecha:e.fecha,hora:e.hora||null};}catch(e){}
      return {al,r,...d,proxima,prioridad:prioridadRamoFilaPanel(d),enSemana:!!proxima&&proxima.fecha<=finSemana};
    }));
  });
  return filas.sort((a,b)=>b.prioridad-a.prioridad||(b.necesita??0)-(a.necesita??0)||
    (a.proxima?.fecha||'9999').localeCompare(b.proxima?.fecha||'9999')||
    String(a.al.nombre_visible||'').localeCompare(String(b.al.nombre_visible||''),'es'));
}
function enPestanaListaPanel(f,tab){
  return tab==='apoyo'?f.prioridad>=3:tab==='semana'?f.enSemana:tab==='sin'?f.avg===null:true;
}
function filtrarListaPanel(filas,{tab='todos',ramo=''}={}){
  return filas.filter(f=>enPestanaListaPanel(f,tab)&&(!ramo||claveRamoListaPanel(f)===ramo));
}
// El Excel trae lo que calza con la lista, sin la paginación de la pantalla.
function alumnosDeFilasPanel(filas){
  const m=new Map();
  filas.forEach(f=>{
    if(!m.has(f.al.id))m.set(f.al.id,{...f.al,ramos:[],todosLosRamos:f.al.todosLosRamos||f.al.ramos});
    if(f.r)m.get(f.al.id).ramos.push(f.r);
  });
  return [...m.values()];
}
function pestanasListaHTML(filas,estado){
  const base=filtrarListaPanel(filas,{ramo:estado.ramo});
  return LISTA_PESTANAS.map(([id,texto])=>`<button type="button" data-lista-tab="${id}" aria-pressed="${estado.tab===id}">${texto}<span>${base.filter(f=>enPestanaListaPanel(f,id)).length}</span></button>`).join('');
}
function ramosListaHTML(filas,estado){
  const ramos=new Map();
  filas.forEach(f=>{const k=claveRamoListaPanel(f);if(k&&!ramos.has(k))ramos.set(k,f.ramo.nombre);});
  return `<option value="">Todos los ramos</option>${[...ramos].sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([k,n])=>`<option value="${esc(k)}"${k===estado.ramo?' selected':''}>${esc(n)}</option>`).join('')}`;
}
function filaListaHTML(f){
  return conUniversidadPanel(f.al.tenant,()=>{
    const texto={bad:'Reprobando',warn:'Al borde',good:'Aprobando',neutral:'Sin notas'}[f.nivel];
    const seccion=f.ramo&&f.ramo.seccion?`Sección ${esc(f.ramo.seccion)}`:'';
    const noAlcanza=f.necesita!==null&&f.necesita>7.05;
    const necesita=noAlcanza?'<b class="est-baja">No alcanza</b>':f.necesita!==null?`<b>${esc(nfNecesaria(f.necesita).replace('.',','))}</b><small>en lo pendiente</small>`:'<b class="est-gris">—</b>';
    const proxima=f.proxima?`<b>${esc(f.proxima.evaluacion)}</b><small>${esc(fechaCorta(f.proxima.fecha))}${f.proxima.hora?' · '+esc(f.proxima.hora):''}</small>`:'<b class="est-gris">—</b>';
    return `<button type="button" class="al-fila" data-ver-alumno="${esc(f.al.id)}"${f.r?` data-alumno-ramo="${esc(f.r.id)}"`:''}>
      <span class="al-nombre"><b>${esc(f.al.nombre_visible)}</b></span>
      <span class="al-ramo"><b>${f.ramo?esc(f.ramo.nombre):'Ya no tiene los ramos que te compartió'}</b>${seccion?`<small>${seccion}</small>`:''}${f.motivo?`<small class="al-motivo">${esc(f.motivo)}</small>`:''}</span>
      <span class="al-promedio"><b class="${f.nivel==='bad'?'est-baja':f.avg===null?'est-gris':''}">${f.avg===null?'—':esc(fmtPromedio(f.avg).replace('.',','))}</b><small>${texto}</small></span>
      <span class="al-proxima">${proxima}</span>
      <span class="al-necesita">${necesita}</span>
      <i class="al-abrir" aria-hidden="true">›</i></button>`;
  });
}
function filasListaHTML(filas,limite=Infinity){return filas.slice(0,limite).map(filaListaHTML).join('');}
