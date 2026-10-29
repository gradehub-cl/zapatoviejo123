
// ─── RAMOS DE LA MALLA ───────────────────────────────────────────────────────
function mallaFaltantes(){
  if(!S.carrera) return [];
  // En TAV no hay ramos de malla que sugerir.
  const ramos=enVerano()?[]:((mallaFor(S.tenant)[S.carrera]||{})[S.careerSemestre]||[]);
  return ramos.filter(n=>!S.ramos.some(r=>r.nombre.toLowerCase()===n.toLowerCase()));
}
let _mallaSel={}, _mallaList=[];
function openMallaModal(){
  if(!S.carrera){showToast('Primero elige tu carrera en Ajustes');return;}
  _mallaList=mallaFaltantes();
  if(!_mallaList.length){
    const hayMalla=Object.keys((mallaFor(S.tenant)[S.carrera]||{})).length>0;
    showToast(hayMalla?'Ya tienes los ramos obligatorios de tu semestre':'Aún no tenemos la malla de tu carrera — agrega tus ramos con el botón +');
    return;
  }
  _mallaSel={};_mallaList.forEach(n=>_mallaSel[n]=true);
  const rows=_mallaList.map((n,i)=>`
    <label style="display:flex;align-items:center;gap:11px;padding:10px 2px;border-bottom:1px solid var(--border);cursor:pointer;">
      <input type="checkbox" checked onchange="toggleMalla(${i},this.checked)" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span style="font-size:0.875rem;color:var(--fg);">${esc(n)}</span>
    </label>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17A2.5 2.5 0 0 1 6.5 2z"/></svg> Ramos de tu ${S.careerSemestre}° semestre</div>
    <p style="font-size:0.8125rem;color:var(--fg2);margin-bottom:4px;">${esc(carrerasFor(S.tenant)[S.carrera]||'')}</p>
    <p style="font-size:0.75rem;color:var(--fg3);margin-bottom:10px;">Desmarca los que no estés tomando. Los electivos los agregas aparte.</p>
    <div style="max-height:42vh;overflow-y:auto;margin-bottom:12px;">${rows}</div>
    <p id="malla-error" role="alert" hidden style="margin:0 0 10px;font-size:0.75rem;line-height:1.4;color:var(--red);"></p>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Ahora no</button>
      <button class="btn-confirm" id="malla-btn" onclick="confirmAddMalla()" aria-describedby="malla-error">Agregar</button>
    </div>`;
  openModal();updateMallaBtn();
}
function toggleMalla(i,checked){const n=_mallaList[i];if(n!==undefined)_mallaSel[n]=checked;updateMallaBtn();}
function updateMallaBtn(){
  const btn=document.getElementById('malla-btn');if(!btn)return;
  const c=_mallaList.filter(n=>_mallaSel[n]).length;
  btn.disabled=false;btn.removeAttribute('aria-disabled');
  btn.textContent=c?`Agregar ${c} ramo${c!==1?'s':''}`:'Agregar';
  if(c){
    const error=document.getElementById('malla-error');
    if(error){error.textContent='';error.hidden=true;}
  }
}

// Devuelve {categorias, gates} para un ramo del catálogo, o null.
// Las ponderaciones salen de PRESETS_FEN / PRESETS_UC (data.js): acá solo se
// traducen a categorías y compuertas con ids frescos.
// La pauta que a este ramo le corresponde y todavía no tiene. Devuelve null
// salvo que NO haya nada que perder: solo se rellena un ramo del catálogo que
// está completamente vacío. Si el estudiante ya escribió aunque sea una
// evaluación propia, no se toca — su pauta a mano manda sobre la nuestra.
