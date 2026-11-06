function openEditCatModal(catId){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  editCatError='';
  const reglas=reglasEvaluacionEditor(r,cat);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar evaluación</div>
    <label class="modal-label">Nombre</label>
    <div class="modal-input"><input type="text" id="m-cat-name" value="${esc(cat.nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-cat-error"/></div>
    <p id="m-cat-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    ${pesoControlHTML(cat.peso,catId)}
    ${cat.slots>1?'':`<label class="modal-label" style="display:flex;align-items:center;gap:10px;text-transform:none;font-weight:500;letter-spacing:0;cursor:pointer;margin:2px 0 14px;line-height:1.35;${(cat.notas||[]).length>1?'opacity:.55;cursor:not-allowed;':''}">
      <input type="checkbox" id="m-cat-varias" ${cat.directNota===false?'checked':''} ${(cat.notas||[]).length>1?'disabled':''} style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span>Son varias notas que se promedian ${(cat.notas||[]).length>1?'<span style="color:var(--fg3);">(ya tiene varias notas: para volver a una sola, bórralas)</span>':'<span style="color:var(--fg3);">(controles, laboratorios, tareas)</span>'}</span>
    </label>`}
    ${campoFechaHoraHTML('m-cat',cat.fecha,cat.hora,true)}
    ${cat.directNota===true&&!(Number.isInteger(cat.slots)&&cat.slots>1)?controlRecorreccionHTML((cat.notas||[])[0],cat.fecha):''}
    ${cat.fecha?`<a class="ramo-action" href="${esc(googleCalUrl(r,cat))}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
      Agregar a Google Calendar
    </a>`:''}
    ${reglasEvaluacionEditorHTML({reglas,varias:cat.directNota===false||cat.slots>1,manual:gh_descarteManual(r,S.tenant),id:idReglaModal,permiteCambiarVarias:!(cat.slots>1)})}
    ${opcionAusenciaHojaHTML(r,cat)}
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmEditCat('${catId}')">Guardar</button>
    </div>`;
  openModal();wirePesoControl();
  setTimeout(()=>{const i=document.getElementById('m-cat-name');i.focus();i.select();},100);
  document.getElementById('m-cat-name').addEventListener('keydown',e=>{if(e.key==='Enter')confirmEditCat(catId);});
  document.getElementById('m-cat-name').addEventListener('input',()=>{if(editCatError){editCatError='';limpiarErrorCampo('m-cat-name','m-cat-error');}});
}
function confirmEditCat(catId){
  const input=document.getElementById('m-cat-name');
  const name=(input&&input.value||'').trim();
  if(!name){editCatError='Escribe el nombre de la evaluación para guardarla.';mostrarErrorCampo('m-cat-name','m-cat-error',editCatError);return false;}
  const peso=readPesoControl(cat0Peso(catId));
  const fechaInput=document.getElementById('m-cat-fecha');
  const fecha=(fechaInput&&fechaInput.value)?fechaInput.value:null;
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  const casilla=document.getElementById('m-cat-varias');
  const varias=cat.slots>1||(casilla&&!casilla.disabled?casilla.checked:cat.directNota===false);
  const reglas=leerReglasEvaluacionModal(r,varias,cat.slots);if(!reglas)return false;
  guardarReglasEvaluacionEditor(r,cat,reglas);
  cat.nombre=name;cat.peso=peso;marcarFechaUsuario(cat,fecha,leerHora('m-cat'));
  const notaDirecta=(cat.notas||[])[0];
  aplicarRecorreccion(notaDirecta);
  // La casilla no existe en las de casillas fijas (`slots`), y viene desactivada
  // cuando ya hay dos o más notas: volver a fila simple mostraría una y
  // escondería el resto sin decirlo.
  if(casilla&&!casilla.disabled)cat.directNota=!casilla.checked;
  save();track('edit_categoria',{tiene_fecha:!!fecha,varias_notas:cat.directNota===false});closeModal();renderRamo();
  // La Agenda vive en otra pantalla y no se enteraba: al quitarle la fecha a una
  // evaluación seguía apareciendo ahí hasta que algo más la redibujara. El peso
  // también cambia el promedio que muestra Home.
  if(typeof renderAgenda==='function')renderAgenda();
  if(typeof renderHome==='function')renderHome();
}

// ─── EDITAR NOTA ─────────────────────────────────────────────────────────────
let editNotaError='';
// Abre el editor de UNA casilla de un grupo. La casilla vacía no existe en el
// estado —el motor la deriva a partir de `slots`—, así que para poder ponerle
// fecha hay que crearla pendiente. Sin valor no afecta ningún promedio: el
// motor solo mira las notas que tienen número.
function abrirCasilla(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const cat=r.categorias.find(c=>c.id===catId);if(!cat)return;
  cat.notas=Array.isArray(cat.notas)?cat.notas:[];
  let n=cat.notas.find(x=>x.slot===slot);
  if(!n){
    n=asignarCalificacionNota({id:uid(),nombre:etiquetaCasilla(r,cat,slot),peso:1,slot},'',null);
    cat.notas.push(n);
    save();
  }
  openEditNotaModal(catId,n.id);
}
function openEditNotaModal(catId,notaId){
  editNotaError='';
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  const n=cat.notas.find(x=>x.id===notaId);
  const hasPond=n.peso!==1;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar nota</div>
    <label class="modal-label">Nombre</label>
    <div class="modal-input"><input type="text" id="m-nota-name" value="${esc(nombreNotaCasilla(r,cat,n))}" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-nota-error"/></div>
    <p id="m-nota-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    <label class="modal-label">${etiquetaNotaEntrada()} <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">— vacía si todavía no la rindes</span></label>
    <div class="modal-input"><input type="text" inputmode="${inputModeNota()}" autocapitalize="characters" id="m-nota-val" value="${n.valor!==null?textoCalificacionNota(n):''}"/></div>
    ${campoFechaHoraHTML('m-nota',n.fecha,n.hora,true)}
    ${controlRecorreccionHTML(n,n.fecha||cat.fecha,cat.fecha)}
    <div class="toggle-row">
      <div><div class="toggle-label">Ponderación personalizada</div><div class="toggle-sub">Por defecto se promedia simple</div></div>
      <label class="toggle"><input type="checkbox" id="m-pond-toggle" ${hasPond?'checked':''} onchange="togglePondSlider()"/><span class="toggle-slider"></span></label>
    </div>
    <div id="pond-slider-wrap" style="display:${hasPond?'block':'none'};margin-top:12px;">
      <label class="modal-label">Peso de esta nota: <span id="m-nota-peso-val">${n.peso}</span>%</label>
      <input type="range" min="1" max="100" value="${n.peso}" id="m-nota-peso" oninput="document.getElementById('m-nota-peso-val').textContent=this.value"/>
    </div>
    ${Number.isInteger(n.slot)?opcionAusenciaHojaHTML(r,cat,{slot:n.slot}):''}
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-edit-nota-btn" onclick="confirmEditNota('${catId}','${notaId}')">Guardar</button>
    </div>`;
  openModal();
  enfocarEnHoja(document.getElementById('m-nota-name'));
  document.getElementById('m-nota-name').addEventListener('input',()=>{if(editNotaError){editNotaError='';limpiarErrorCampo('m-nota-name','m-nota-error');}});
}
function confirmEditNota(catId,notaId){
  const input=document.getElementById('m-nota-name');
  const name=(input&&input.value||'').trim();
  const rawNota=document.getElementById('m-nota-val').value;
  const val=parseNota(rawNota);
  // Igual que al crearla: sin valor queda pendiente. Es el camino de vuelta —
  // se anota la evaluación cuando se sabe la fecha y se completa al rendirla.
  if(!name){editNotaError='Escribe el nombre de la nota para guardarla.';mostrarErrorCampo('m-nota-name','m-nota-error',editNotaError);return false;}
  const fechaNota=(document.getElementById('m-nota-fecha')||{}).value||null;
  const usaPond=document.getElementById('m-pond-toggle').checked;
  const peso=usaPond?parseInt(document.getElementById('m-nota-peso').value)||40:1;
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  const n=cat.notas.find(x=>x.id===notaId);
  n.nombre=name;n.peso=peso;
  asignarCalificacionNota(n,rawNota,isNaN(val)?null:val);
  marcarFechaUsuario(n,fechaNota,leerHora('m-nota'));
  aplicarRecorreccion(n);
  save();track('edit_nota',{pendiente:isNaN(val)});closeModal();renderRamo();
  if(!isNaN(val))vibrar('nota');
  if(typeof renderAgenda==='function')renderAgenda();
  showToast(isNaN(val)?'Guardada como pendiente':lecturaDespuesDeNota(r));
}

// «Nota mínima» se juntó con el simulador (Lucas, 2026-10-23): la meta se
// ajusta en la misma hoja. Ver simNotaNecesaria y simCambiarMeta.
