
// ─── HISTORIAL EDITABLE ──────────────────────────────────────────────────────
// El promedio de un ramo archivado se puede corregir a mano (avgOverride) sin
// tocar sus evaluaciones. Sirve cuando un profe cambia una nota después del cierre.
function histRamoAvg(r,ramos){
  return notaRamoParaResumen(r,ramos);
}
// Recalcula el promedio del semestre archivado respetando overrides y créditos
function recomputeHistGpa(h){
  // El vínculo y la exclusión del laboratorio pertenecen a este semestre,
  // no a S.ramos. Se usa la misma cuenta que al archivar y al comparar.
  h.gpa=gpa(h.ramos||[]);
}

function openEditHistRamoModal(histId,ramoId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const r=(h.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  if(r.cierre||notaPortalValida(r.notaOficial)){abrirNotaOficialHistorial(histId,ramoId);return;}
  const actual=histRamoAvg(r,h.ramos);
  const calculado=ramoAvg({...r,avgOverride:undefined},undefined,h.ramos);
  const esOverride=typeof r.avgOverride==='number';
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${esc(r.nombre)}</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:16px;">
      Corrige el promedio final de este ramo en <b>${esc(h.label)}</b>. No se tocan sus evaluaciones.
    </p>
    <label class="modal-label">Promedio final (1.0 – 7.0)</label>
    <div class="modal-input"><input type="text" inputmode="decimal" id="m-hist-avg" value="${actual!==null?nf(actual):''}" placeholder="Ej: 5.4" maxlength="4"/></div>
    ${calculado!==null?`<p style="font-size:0.75rem;color:var(--fg3);margin:-6px 0 14px;">Calculado desde sus evaluaciones: <b>${fmtPromedio(calculado)}</b></p>`:''}
    <button type="button" class="btn-cancel" onclick="abrirNotaOficialHistorial('${esc(histId)}','${esc(ramoId)}')">Usar nota del portal</button>
    <div id="m-hist-err" style="display:none;font-size:0.75rem;color:var(--red);margin:-6px 0 12px;"></div>
    <div class="modal-btns">
      ${esOverride?`<button class="btn-cancel" onclick="resetHistRamoAvg('${esc(histId)}','${esc(ramoId)}')">Restaurar</button>`:`<button class="btn-cancel" onclick="closeModal()">Cancelar</button>`}
      <button class="btn-confirm" onclick="confirmEditHistRamo('${esc(histId)}','${esc(ramoId)}')">Guardar</button>
    </div>`;
  openModal();
  setTimeout(()=>{const i=document.getElementById('m-hist-avg');if(i){i.focus();i.select();}},100);
  document.getElementById('m-hist-avg').addEventListener('keydown',e=>{if(e.key==='Enter')confirmEditHistRamo(histId,ramoId);});
}

function confirmEditHistRamo(histId,ramoId){
  const v=parseNota(document.getElementById('m-hist-avg').value);
  const err=document.getElementById('m-hist-err');
  if(isNaN(v)){
    if(err){err.textContent='Escribe una nota entre 1.0 y 7.0.';err.style.display='block';}
    return;
  }
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const r=(h.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  r.avgOverride=v;
  recomputeHistGpa(h);
  save();track('edit_hist_ramo');closeModal();renderStats();
  showToast('Promedio actualizado');
}

function resetHistRamoAvg(histId,ramoId){
  const h=S.historial.find(x=>x.id===histId);if(!h)return;
  const r=(h.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  delete r.avgOverride;
  recomputeHistGpa(h);
  save();closeModal();renderStats();
  showToast('Se restauró el promedio calculado');
}
