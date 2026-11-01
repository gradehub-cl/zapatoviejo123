
// ─── EDITAR RAMO ─────────────────────────────────────────────────────────────
let editRamoError='';
function openEditRamoModal(){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  editRamoError='';
  modalColor=r.color;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar ramo</div>
    <label class="modal-label">Nombre del ramo</label>
    <div class="modal-input"><input type="text" id="m-ramo-name" value="${esc(r.nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-ramo-error"/></div>
    <p id="m-ramo-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    <label class="modal-label">Créditos <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">(SCT)</span></label>
    <div class="modal-input"><input type="text" inputmode="numeric" id="m-ramo-creditos" value="${r.creditos!=null?r.creditos:''}" placeholder="Ej: 10" maxlength="3" autocomplete="off"/></div>
    <label class="modal-label" for="m-ramo-seccion">Sección</label>
    <div class="modal-input"><input type="text" inputmode="numeric" id="m-ramo-seccion" value="${r.seccion!=null?r.seccion:''}" placeholder="Ej: 3" maxlength="3" autocomplete="off" aria-describedby="m-ramo-seccion-error"/></div>
    <p id="m-ramo-seccion-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    <span class="modal-label">Profesor</span>
    <button type="button" class="editar-profe" id="editar-profe"><span>Sin profesor<small>Sin calificar</small></span></button>
    <label class="modal-label" style="display:flex;align-items:center;gap:10px;text-transform:none;font-weight:500;letter-spacing:0;cursor:pointer;margin:2px 0 12px;line-height:1.35;">
      <input type="checkbox" id="m-ramo-faltas" ${faltasActivas(r)?'checked':''} onchange="document.getElementById('m-ramo-faltas-limite-box').hidden=!this.checked" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span>Llevar la cuenta de mis faltas <span style="color:var(--fg3);">(aparece en la ficha del ramo)</span></span>
    </label>
    <div id="m-ramo-faltas-limite-box" ${faltasActivas(r)?'':'hidden'}>
      <label class="modal-label" for="m-ramo-faltas-limite">Máximo de faltas <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">(opcional)</span></label>
      <div class="modal-input"><input type="text" inputmode="numeric" id="m-ramo-faltas-limite" value="${r.faltas&&r.faltas.limite!=null?r.faltas.limite:''}" placeholder="Ej: 4" maxlength="2" autocomplete="off" aria-describedby="m-ramo-faltas-error"/></div>
      <p id="m-ramo-faltas-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    </div>
    <label class="modal-label">Color</label>
    <div class="color-row" id="m-colors"></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmEditRamo()">Guardar</button>
    </div>`;
  renderModalColors();openModal();
  if(typeof pintarProfesorEditarRamo==='function')pintarProfesorEditarRamo(r);
  const foco=document.getElementById('m-ramo-name');
  enfocarEnHoja(foco,()=>foco.select());
  document.getElementById('m-ramo-name').addEventListener('keydown',e=>{if(e.key==='Enter')confirmEditRamo();});
  document.getElementById('m-ramo-name').addEventListener('input',()=>{if(editRamoError){editRamoError='';limpiarErrorCampo('m-ramo-name','m-ramo-error');}});
  document.getElementById('m-ramo-seccion').addEventListener('keydown',e=>{if(e.key==='Enter')confirmEditRamo();});
  document.getElementById('m-ramo-seccion').addEventListener('input',()=>limpiarErrorCampo('m-ramo-seccion','m-ramo-seccion-error'));
  document.getElementById('m-ramo-faltas-limite').addEventListener('keydown',e=>{if(e.key==='Enter')confirmEditRamo();});
  document.getElementById('m-ramo-faltas-limite').addEventListener('input',()=>limpiarErrorCampo('m-ramo-faltas-limite','m-ramo-faltas-error'));
}
function confirmEditRamo(){
  const input=document.getElementById('m-ramo-name');
  const name=(input&&input.value||'').trim();
  if(!name){editRamoError='Escribe el nombre del ramo para guardarlo.';mostrarErrorCampo('m-ramo-name','m-ramo-error',editRamoError);return false;}
  // Se valida antes de tocar el ramo: con la sección mal escrita no se guarda
  // nada, ni siquiera el nombre, y el modal sigue abierto con lo escrito.
  const seccion=parseSeccion((document.getElementById('m-ramo-seccion')||{}).value);
  if(seccion===undefined){mostrarErrorCampo('m-ramo-seccion','m-ramo-seccion-error','La sección es un número, como 3. Déjala vacía si no la sabes.');return false;}
  const conFaltas=!!(document.getElementById('m-ramo-faltas')||{}).checked;
  const limiteFaltas=conFaltas?parseLimiteFaltas((document.getElementById('m-ramo-faltas-limite')||{}).value):null;
  if(limiteFaltas===undefined){mostrarErrorCampo('m-ramo-faltas-limite','m-ramo-faltas-error',`El máximo es un número entre 1 y ${FALTAS_MAX}. Déjalo vacío si no lo sabes.`);return false;}
  const r=S.ramos.find(x=>x.id===currentRamoId);
  r.nombre=name;r.color=modalColor;
  r.creditos=parseCreditos((document.getElementById('m-ramo-creditos')||{}).value);
  r.seccion=seccion;
  // Las fechas de la sección (los controles de Dinámica, por ejemplo) se
  // ven al tiro, sin esperar a la próxima carga.
  completarFechasOficiales(r,{tenant:S.tenant,carrera:S.carrera});
  // Apagarlo no borra la cuenta: si se vuelve a encender, sigue donde estaba.
  if(conFaltas)r.faltas={activo:true,cantidad:r.faltas?r.faltas.cantidad:0,limite:limiteFaltas};
  else if(r.faltas)r.faltas={...r.faltas,activo:false};
  save();track('edit_ramo');closeModal();renderRamo();
}
