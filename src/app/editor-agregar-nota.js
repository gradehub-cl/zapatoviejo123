
let addNotaError='';
function openAddNotaModal(catId){
  addNotaError='';
  const r=S.ramos.find(x=>x.id===currentRamoId);const cat=r.categorias.find(c=>c.id===catId);
  const pauta=estadoPauta(r.categorias);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Nueva nota — ${esc(cat.nombre)}</div>
    ${pauta.lista?'':`<div class="weight-setup-nudge"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"/><path d="M3 8h18"/><path d="M4 8l2 10h12l2-10"/></svg><div><b>Tu pauta suma ${r2(pauta.total)}%.</b><br>Esta nota se guarda igual. Completa el resto cuando tengas la pauta.<br><button type="button" onclick="abrirPautaDesdeNota()">Editar pauta</button></div></div>`}
    <label class="modal-label">Nombre</label>
    <div class="modal-input"><input type="text" id="m-nota-name" placeholder="Ej: Prueba 1" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-nota-error"/></div>
    <p id="m-nota-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    <label class="modal-label">${etiquetaNotaEntrada()} <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">— déjala vacía si todavía no la rindes</span></label>
    <div class="modal-input"><input type="text" inputmode="${inputModeNota()}" autocapitalize="characters" id="m-nota-val" placeholder="${ejemploNotaEntrada()}"/></div>
    ${campoFechaHoraHTML('m-nota','',null,false)}
    <div class="toggle-row">
      <div><div class="toggle-label">Ponderación personalizada</div><div class="toggle-sub">Por defecto se promedia simple</div></div>
      <label class="toggle"><input type="checkbox" id="m-pond-toggle" onchange="togglePondSlider()"/><span class="toggle-slider"></span></label>
    </div>
    <div id="pond-slider-wrap" style="display:none;margin-top:12px;">
      <label class="modal-label">Peso de esta nota: <span id="m-nota-peso-val">40</span>%</label>
      <input type="range" min="1" max="100" value="40" id="m-nota-peso" oninput="document.getElementById('m-nota-peso-val').textContent=this.value"/>
      <div class="slider-desc">Las notas se ponderan por el porcentaje asignado</div>
    </div>
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-add-nota-btn" onclick="confirmAddNota('${catId}')">Agregar nota</button>
    </div>`;
  openModal();
  enfocarEnHoja(document.getElementById('m-nota-name'));
  function checkValid(){
    const v=parseNota(document.getElementById('m-nota-val').value);
    const btn=document.getElementById('m-add-nota-btn');
    if(btn)btn.textContent=isNaN(v)?'Anotar como pendiente':'Agregar nota';
  }
  document.getElementById('m-nota-name').addEventListener('input',()=>{if(addNotaError){addNotaError='';limpiarErrorCampo('m-nota-name','m-nota-error');}checkValid();});
  document.getElementById('m-nota-val').addEventListener('input',checkValid);
}
function togglePondSlider(){
  document.getElementById('pond-slider-wrap').style.display=document.getElementById('m-pond-toggle').checked?'block':'none';
}
function confirmAddNota(catId){
  const input=document.getElementById('m-nota-name');
  const name=(input&&input.value||'').trim();
  const rawNota=document.getElementById('m-nota-val').value;
  const val=parseNota(rawNota);
  // La nota puede quedar pendiente: se registra qué viene y cuándo, y el valor
  // se agrega al rendirla. `gradesOf` y `avgPond` ya ignoran las que no tienen
  // valor, así que una pendiente no arrastra el promedio hacia abajo.
  if(!name){addNotaError='Escribe el nombre de la nota para agregarla.';mostrarErrorCampo('m-nota-name','m-nota-error',addNotaError);return false;}
  const fechaNota=(document.getElementById('m-nota-fecha')||{}).value||null;
  const usaPond=document.getElementById('m-pond-toggle').checked;
  const peso=usaPond?parseInt(document.getElementById('m-nota-peso').value)||40:1;
  const r=S.ramos.find(x=>x.id===currentRamoId);const cat=r.categorias.find(c=>c.id===catId);
  const horaNota=leerHora('m-nota');
  const nueva={id:uid(),nombre:name,peso,fecha:fechaNota,hora:horaNota,fechaOrigen:fechaNota?'usuario':null,horaOrigen:horaNota?'usuario':null};
  asignarCalificacionNota(nueva,rawNota,isNaN(val)?null:val);
  cat.notas.push(nueva);
  openCats[catId]=true;save();track('add_nota',{ponderada:usaPond,pendiente:isNaN(val)});closeModal();renderRamo();
  if(!isNaN(val))vibrar('nota');
  // Si trae fecha entra a la Agenda, que vive en otra pantalla.
  if(typeof renderAgenda==='function')renderAgenda();
  showToast(isNaN(val)?'Anotada para el '+fechaCorta(fechaNota||'')+' — agrega la nota cuando la rindas':lecturaDespuesDeNota(r));
}
