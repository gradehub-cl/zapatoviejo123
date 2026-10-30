
// ─── RENOMBRAR O BORRAR UN SEMESTRE DEL HISTORIAL ────────────────────────────
// Un semestre entra al historial por dos puertas —archivar el actual o cargar
// uno anterior a mano— y hasta ahora no salía por ninguna. Quien se equivocaba
// en el año al cargarlo quedaba con esa fila para siempre, contando en su
// promedio de carrera, sin forma de corregirla ni de sacarla.
//
// "Editar" junta el nombre y las notas finales de sus ramos: quien carga un
// semestre a mano y se equivoca en una nota no debería tener que ir ramo por
// ramo. Las notas se guardan como `avgOverride`, igual que al corregir un ramo.

let histRename={id:'',anio:0,periodo:'1',notas:[],nuevos:[],quitados:[]};

function openRenombrarHistModal(histId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const p=parseEtiquetaSemestre(h.label)||{anio:anioActualSemestre(),periodo:'1'};
  const ramos=(h.ramos||[]).filter(r=>r&&typeof r==='object');
  // Se guarda lo que se mostró: un ramo archivado que nadie toca sigue
  // calculándose desde sus evaluaciones en vez de quedar fijo a mano.
  const notas=ramos.map(r=>{const v=histRamoAvg(r,h.ramos);return{id:r.id,txt:v!==null?nf(v):''};});
  histRename={id:histId,anio:p.anio,periodo:p.periodo,notas,nuevos:[],quitados:[]};
  const filas=ramos.map((r,i)=>`
    <div class="rep-row" id="m-hist-ren-fila-${esc(r.id)}" data-quitar="false">
      <div class="rep-name"><span class="hist-ren-nombre">${esc(r.nombre)}</span>${r.creditos?` <span class="rep-tag">${r.creditos} cr</span>`:''}
        <small class="hist-ren-estado" id="m-hist-ren-estado-${esc(r.id)}" role="status" hidden>Se quitará al guardar</small></div>
      <span class="rep-peso-field" style="width:5rem;"><input class="rep-peso-input" style="padding-right:9px;" type="text" inputmode="decimal" id="m-hist-ren-nota-${i}" value="${esc(notas[i].txt)}" maxlength="4" autocomplete="off" placeholder="—" aria-label="Nota final de ${esc(r.nombre)}" oninput="limpiarErrorHistRename()"/></span>
      <button type="button" class="rep-link" id="m-hist-ren-quitar-${esc(r.id)}" data-ramo="${esc(r.id)}" onclick="quitarRamoHistRename(this.dataset.ramo)" aria-label="Quitar ${esc(r.nombre)}">Quitar</button>
    </div>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar ${esc(h.label)}</div>
    <label class="modal-label">Qué semestre fue</label>
    <div class="sem-picker" id="m-hist-sem-ren">${selectorSemestreHTML(histRename.anio,histRename.periodo,'setAnioHistRename','setPeriodoHistRename')}</div>
    <p class="sem-picker-preview" id="m-hist-preview">Quedará como <b>${esc(etiquetaSemestre(histRename.anio,histRename.periodo))}</b></p>
    <label class="modal-label" style="margin-top:14px;">Notas finales</label><div class="rep-box" id="m-hist-ren-ramos">${filas}</div>
    <button type="button" class="course-picker-manual" id="m-hist-ren-agregar" style="min-height:44px;" aria-expanded="false" aria-controls="m-hist-ren-buscador" onclick="alternarBuscadorHistRename()">Agregar ramo</button>
    <div id="m-hist-ren-buscador" hidden>
      <label class="modal-label" for="m-hist-ren-buscar">Busca el ramo</label>
      <div class="course-picker-search"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input id="m-hist-ren-buscar" type="text" placeholder="Nombre o sigla" maxlength="${NOMBRE_MAX}" autocomplete="off" oninput="renderBusquedaSemestreAnterior(this.value,{editar:true})"/></div>
      <div id="m-hist-ren-resultados"></div>
    </div>
    <div id="m-hist-ren-err" role="alert" style="display:none;font-size:0.75rem;color:var(--red);margin:8px 0 0;"></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmRenombrarHist('${esc(histId)}')">Guardar</button>
    </div>`;
  openModal();
}

function alternarBuscadorHistRename(){
  const box=document.getElementById('m-hist-ren-buscador'),boton=document.getElementById('m-hist-ren-agregar');
  if(!box||!boton)return;
  box.hidden=!box.hidden;
  boton.setAttribute('aria-expanded',String(!box.hidden));
  boton.textContent=box.hidden?'Agregar ramo':'Cancelar búsqueda';
  if(!box.hidden)enfocarEnHoja(document.getElementById('m-hist-ren-buscar'));
}

function limpiarErrorHistRename(){
  const err=document.getElementById('m-hist-ren-err');
  if(err){err.textContent='';err.style.display='none';}
}

function agregarRamoHistRename(cod,siglaCod){
  const h=S.historial.find(x=>x.id===histRename.id);if(!h)return;
  const nombre=decodeURIComponent(cod).trim();
  if(!nombre||nombre.length>NOMBRE_MAX)return;
  if([...(h.ramos||[]),...histRename.nuevos].some(r=>r&&normName(r.nombre)===normName(nombre))){
    showToast('Ese ramo ya está en el semestre');return;
  }
  const sigla=siglaCod?decodeURIComponent(siglaCod):null;
  const r={id:uid(),nombre,creditos:creditosDe(nombre,S.tenant,null,sigla),
    color:COLORS[Math.floor(Math.random()*COLORS.length)],categorias:[],origen:{manual:true}};
  histRename.nuevos.push(r);
  // Se agrega solo la fila nueva: no se repinta la hoja ni se pierde una nota
  // que la persona esté corrigiendo. S.historial no cambia hasta Guardar.
  document.getElementById('m-hist-ren-ramos').insertAdjacentHTML('beforeend',`
    <div class="rep-row" id="m-hist-ren-fila-${r.id}">
      <div class="rep-name"><span class="hist-ren-nombre">${esc(r.nombre)}</span>${r.creditos?` <span class="rep-tag">${r.creditos} cr</span>`:''}</div>
      <span class="rep-peso-field" style="width:5rem;"><input class="rep-peso-input" style="padding-right:9px;" type="text" inputmode="decimal" id="m-hist-ren-nueva-${r.id}" maxlength="4" autocomplete="off" placeholder="—" aria-label="Nota final de ${esc(r.nombre)}" oninput="limpiarErrorHistRename()"/></span>
      <button type="button" class="rep-link" onclick="quitarRamoHistRename('${r.id}')" aria-label="Quitar ${esc(r.nombre)}">Quitar</button>
    </div>`);
  const buscar=document.getElementById('m-hist-ren-buscar');
  if(buscar)buscar.value='';
  const resultados=document.getElementById('m-hist-ren-resultados');if(resultados)resultados.innerHTML='';
  const box=document.getElementById('m-hist-ren-buscador');if(box&&!box.hidden)alternarBuscadorHistRename();
  enfocarEnHoja(document.getElementById('m-hist-ren-nueva-'+r.id));
}

function quitarRamoHistRename(id){
  if(histRename.nuevos.some(r=>r.id===id)){
    histRename.nuevos=histRename.nuevos.filter(r=>r.id!==id);
    document.getElementById('m-hist-ren-fila-'+id)?.remove();
    limpiarErrorHistRename();
    enfocarEnHoja(document.getElementById('m-hist-ren-agregar'));
    return;
  }
  const h=S.historial.find(x=>x.id===histRename.id),r=h?.ramos?.find(r=>r&&r.id===id);
  if(!r)return;
  const quitar=!histRename.quitados.includes(id);
  histRename.quitados=quitar?[...histRename.quitados,id]:histRename.quitados.filter(x=>x!==id);
  const i=histRename.notas.findIndex(n=>n.id===id),campo=document.getElementById('m-hist-ren-nota-'+i);
  if(campo)campo.disabled=quitar;
  const fila=document.getElementById('m-hist-ren-fila-'+id);if(fila)fila.setAttribute('data-quitar',String(quitar));
  const estado=document.getElementById('m-hist-ren-estado-'+id);if(estado)estado.hidden=!quitar;
  const boton=document.getElementById('m-hist-ren-quitar-'+id);
  if(boton){boton.textContent=quitar?'Deshacer':'Quitar';boton.setAttribute('aria-label',(quitar?'Deshacer: quitar ':'Quitar ')+r.nombre);}
  limpiarErrorHistRename();
  enfocarEnHoja(quitar?boton:campo);
}

function repintarSelectorHistRename(){
  const box=document.getElementById('m-hist-sem-ren');
  if(box)box.innerHTML=selectorSemestreHTML(histRename.anio,histRename.periodo,'setAnioHistRename','setPeriodoHistRename');
  const pv=document.getElementById('m-hist-preview');
  if(pv)pv.innerHTML=`Quedará como <b>${esc(etiquetaSemestre(histRename.anio,histRename.periodo))}</b>`;
}
function setAnioHistRename(v){histRename.anio=Number(v);repintarSelectorHistRename();}
function setPeriodoHistRename(v){histRename.periodo=v;repintarSelectorHistRename();}

function confirmRenombrarHist(histId,confirmado=false){
  if(histRename.id!==histId)return;
  limpiarErrorHistRename();
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const label=etiquetaSemestre(histRename.anio,histRename.periodo);
  // Se valida todo antes de tocar nada: una nota mala no deja el semestre a medias.
  const cambios=[];
  for(let i=0;i<histRename.notas.length;i++){
    const el=document.getElementById('m-hist-ren-nota-'+i);
    const txt=String(el?el.value:'').trim();
    const orig=histRename.notas[i];
    if(histRename.quitados.includes(orig.id))continue;
    // En blanco o sin tocar, el ramo queda como estaba.
    if(!txt||txt===orig.txt)continue;
    const v=parseNota(txt,S.tenant);
    const r=(h.ramos||[]).find(x=>x&&x.id===orig.id);
    if(isNaN(v)){
      const err=document.getElementById('m-hist-ren-err');
      if(err){err.textContent=`Revisa ${r?r.nombre:'una nota'}: va entre 1,0 y 7,0.`;err.style.display='block';}
      if(el)el.focus();
      return;
    }
    if(r)cambios.push([r,v]);
  }
  const nuevos=[];
  for(const r of histRename.nuevos){
    const el=document.getElementById('m-hist-ren-nueva-'+r.id);
    const txt=String(el?el.value:'').trim(),v=parseNota(txt,S.tenant);
    const duplicado=(h.ramos||[]).some(x=>x&&normName(x.nombre)===normName(r.nombre));
    if(!txt||isNaN(v)||duplicado){
      const err=document.getElementById('m-hist-ren-err');
      if(err){err.textContent=duplicado?`${r.nombre} ya está en el semestre. Quita la fila nueva.`:!txt?`Pon la nota final de ${r.nombre} para agregarlo.`:`Revisa ${r.nombre}: va entre 1,0 y 7,0.`;err.style.display='block';}
      if(el)el.focus();return;
    }
    nuevos.push({...r,avgOverride:v});
  }
  const quitados=(h.ramos||[]).filter(r=>r&&histRename.quitados.includes(r.id));
  if(quitados.length&&!confirmado){
    const edicion=histRename;
    showConfirm(`Quitar ${quitados.length===1?'un ramo':quitados.length+' ramos'} de ${h.label}`,
      `${quitados.map(r=>r.nombre).join(', ')}: se quitarán del semestre con sus notas y evaluaciones guardadas. Su promedio se recalculará.`,
      ()=>{if(histRename===edicion)confirmRenombrarHist(histId,true);},{label:'Quitar y guardar',focusCancel:true});
    return;
  }
  if(h.label===label&&!cambios.length&&!nuevos.length&&!quitados.length){histRename.id='';closeModal();return;}
  h.label=label;
  cambios.forEach(([r,v])=>{r.avgOverride=v;});
  if(nuevos.length||quitados.length)h.ramos=[...(h.ramos||[]).filter(r=>!r||!histRename.quitados.includes(r.id)),...nuevos];
  if(cambios.length||nuevos.length||quitados.length)recomputeHistGpa(h);
  histRename.id='';
  save();track('renombrar_historial',{notas:cambios.length});closeModal();renderHome();renderStats();
  showToast(`${label} actualizado`);
}

function pedirBorrarHistorial(histId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const n=(h.ramos||[]).length;
  showConfirm(
    `Eliminar ${h.label}`,
    `Se borrarán ${n} ramo${n!==1?'s':''} y este semestre dejará de contar en tu promedio de carrera. No se puede deshacer.`,
    ()=>borrarHistorial(histId)
  );
}

function borrarHistorial(histId){
  const i=S.historial.findIndex(x=>x.id===histId);
  if(i<0)return;
  const h=S.historial[i];
  S.historial.splice(i,1);
  save();track('borrar_historial',{manual:!!h.manual});
  closeModal();renderHome();renderStats();
  showToast(`${h.label} eliminado`);
}
