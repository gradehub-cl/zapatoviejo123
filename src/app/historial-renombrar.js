
// ─── RENOMBRAR O BORRAR UN SEMESTRE DEL HISTORIAL ────────────────────────────
// Un semestre entra al historial por dos puertas —archivar el actual o cargar
// uno anterior a mano— y hasta ahora no salía por ninguna. Quien se equivocaba
// en el año al cargarlo quedaba con esa fila para siempre, contando en su
// promedio de carrera, sin forma de corregirla ni de sacarla.
//
// "Editar" junta el nombre y las notas finales de sus ramos: quien carga un
// semestre a mano y se equivoca en una nota no debería tener que ir ramo por
// ramo. Las notas se guardan como `avgOverride`, igual que al corregir un ramo.

let histRename={id:'',anio:0,periodo:'1',notas:[]};

function openRenombrarHistModal(histId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const p=parseEtiquetaSemestre(h.label)||{anio:anioActualSemestre(),periodo:'1'};
  const ramos=(h.ramos||[]).filter(r=>r&&typeof r==='object');
  // Se guarda lo que se mostró: un ramo archivado que nadie toca sigue
  // calculándose desde sus evaluaciones en vez de quedar fijo a mano.
  const notas=ramos.map(r=>{const v=histRamoAvg(r,h.ramos);return{id:r.id,txt:v!==null?nf(v):''};});
  histRename={id:histId,anio:p.anio,periodo:p.periodo,notas};
  const filas=ramos.map((r,i)=>`
    <div class="rep-row">
      <div class="rep-name">${esc(r.nombre)}${r.creditos?` <span class="rep-tag">${r.creditos} cr</span>`:''}</div>
      <span class="rep-peso-field"><input class="rep-peso-input" type="text" inputmode="decimal" id="m-hist-ren-nota-${i}" value="${esc(notas[i].txt)}" maxlength="4" autocomplete="off" placeholder="—" aria-label="Nota final de ${esc(r.nombre)}"/></span>
    </div>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar ${esc(h.label)}</div>
    <label class="modal-label">Qué semestre fue</label>
    <div class="sem-picker" id="m-hist-sem-ren">${selectorSemestreHTML(histRename.anio,histRename.periodo,'setAnioHistRename','setPeriodoHistRename')}</div>
    <p class="sem-picker-preview" id="m-hist-preview">Quedará como <b>${esc(etiquetaSemestre(histRename.anio,histRename.periodo))}</b></p>
    ${filas?`<label class="modal-label" style="margin-top:14px;">Notas finales</label><div class="rep-box">${filas}</div>`:''}
    <div id="m-hist-ren-err" role="alert" style="display:none;font-size:0.75rem;color:var(--red);margin:8px 0 0;"></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmRenombrarHist('${esc(histId)}')">Guardar</button>
    </div>`;
  openModal();
}

function repintarSelectorHistRename(){
  const box=document.getElementById('m-hist-sem-ren');
  if(box)box.innerHTML=selectorSemestreHTML(histRename.anio,histRename.periodo,'setAnioHistRename','setPeriodoHistRename');
  const pv=document.getElementById('m-hist-preview');
  if(pv)pv.innerHTML=`Quedará como <b>${esc(etiquetaSemestre(histRename.anio,histRename.periodo))}</b>`;
}
function setAnioHistRename(v){histRename.anio=Number(v);repintarSelectorHistRename();}
function setPeriodoHistRename(v){histRename.periodo=v;repintarSelectorHistRename();}

function confirmRenombrarHist(histId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const label=etiquetaSemestre(histRename.anio,histRename.periodo);
  // Se valida todo antes de tocar nada: una nota mala no deja el semestre a medias.
  const cambios=[];
  for(let i=0;i<histRename.notas.length;i++){
    const el=document.getElementById('m-hist-ren-nota-'+i);
    const txt=String(el?el.value:'').trim();
    const orig=histRename.notas[i];
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
  if(h.label===label&&!cambios.length){closeModal();return;}
  h.label=label;
  cambios.forEach(([r,v])=>{r.avgOverride=v;});
  if(cambios.length)recomputeHistGpa(h);
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
