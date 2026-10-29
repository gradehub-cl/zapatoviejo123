// ─── EXPORTAR / IMPORTAR ─────────────────────────────────────────────────────
function exportarDatos(){
  const json=localStorage.getItem(STORAGE_KEY);
  if(!json){showToast('No hay datos para exportar');return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(json)
      .then(()=>showToast('✓ Datos copiados al portapapeles'))
      .catch(()=>_mostrarJsonManual(json));
  } else {
    _mostrarJsonManual(json);
  }
}
function _mostrarJsonManual(json){
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Exportar datos</div>
    <p style="font-size:0.8125rem;color:var(--fg2);margin-bottom:10px;">Copia todo este texto y pégalo al importar en el otro dispositivo.</p>
    <textarea id="export-text" readonly style="width:100%;height:120px;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-size:0.6875rem;font-family:monospace;resize:none;background:var(--muted);color:var(--fg);">${esc(json)}</textarea>
    <div class="modal-btns" style="margin-top:12px;">
      <button class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button class="btn-confirm" onclick="document.getElementById('export-text').select();document.execCommand('copy');showToast('✓ Copiado');">Copiar</button>
    </div>`;
  openModal();
  setTimeout(()=>{const t=document.getElementById('export-text');if(t){t.focus();t.select();}},100);
}
function abrirImportar(){
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Importar datos</div>
    <p style="font-size:0.8125rem;color:var(--fg2);margin-bottom:10px;">Pega aquí el texto que exportaste desde el otro dispositivo. <b>Esto reemplazará tus datos actuales.</b></p>
    <textarea id="import-text" placeholder="Pega aquí tu código de exportación..." style="width:100%;height:120px;padding:10px;border:1.5px solid var(--border);border-radius:10px;font-size:0.6875rem;font-family:monospace;resize:none;background:var(--muted);color:var(--fg);"></textarea>
    <div class="modal-btns" style="margin-top:12px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmarImportar()">Importar</button>
    </div>
    ${hayRespaldoPreImport()?`<p style="text-align:center;margin:14px 0 0;font-size:0.78125rem;">
      <button onclick="deshacerImport()" style="border:none;background:none;padding:0;cursor:pointer;font-family:var(--font-ui);font-size:0.78125rem;font-weight:700;color:var(--primary);">Deshacer la última importación</button></p>`:''}`;
  openModal();
  enfocarEnHoja(document.getElementById('import-text'));
}
// Clave del respaldo automático previo a un import. Existe porque importar es
// la única acción de la app que destruye datos sin posible deshacer: reemplaza
// el estado local Y lo sube a la nube, así que también se lleva el respaldo.
const PRE_IMPORT_KEY='gradehub_v1_pre_import';

// Un export válido SIEMPRE trae la lista de ramos, aunque esté vacía. Exigirla
// es lo que distingue un export real de cualquier JSON que ande dando vueltas.
// Sin esto, pegar {"userName":"Ana"} borraba todos los ramos y la app decía
// "importado correctamente".
function esExportValido(o){
  return !!o && typeof o==='object' && !Array.isArray(o) && Array.isArray(o.ramos);
}
function contarNotas(ramos){
  return (ramos||[]).reduce((a,r)=>a+(r.categorias||[]).reduce((b,c)=>b+((c.notas||[]).length),0),0);
}

function confirmarImportar(){
  const text=(document.getElementById('import-text').value||'').trim();
  if(!text){showToast('Pega los datos primero',true);return;}

  let parsed;
  try{ parsed=JSON.parse(text); }
  catch(e){ showToast('Ese texto no es un respaldo de GradeHub',true); return; }

  if(!esExportValido(parsed)){
    showToast('Ese texto no es un respaldo de GradeHub',true);
    return;
  }

  const data=normalize(parsed);
  const actualR=S.ramos?S.ramos.length:0, actualN=contarNotas(S.ramos);
  const nuevoR=data.ramos.length, nuevoN=contarNotas(data.ramos);

  // Decir qué se pierde ANTES, con números. "Esto reemplazará tus datos" no
  // dimensiona nada; "vas a perder 3 ramos con 12 notas" sí.
  const detalle=actualR
    ? `Vas a reemplazar tus ${actualR} ramo${actualR!==1?'s':''} (${actualN} nota${actualN!==1?'s':''}) por ${nuevoR} ramo${nuevoR!==1?'s':''} (${nuevoN} nota${nuevoN!==1?'s':''}).\n\nGuardamos una copia de lo actual por si te arrepientes.`
    : `Se cargarán ${nuevoR} ramo${nuevoR!==1?'s':''} con ${nuevoN} nota${nuevoN!==1?'s':''}.`;

  showConfirm('Importar datos',detalle,()=>{
    // Respaldo antes de tocar nada. Si el import resulta ser el archivo
    // equivocado, esto es lo único que queda.
    try{ if(actualR) localStorage.setItem(PRE_IMPORT_KEY,JSON.stringify(S)); }catch(e){}
    S={...S,...data};
    save();track('import_data',{ramos:nuevoR});
    closeModal();
    showToast('✓ Datos importados');
    setTimeout(()=>location.reload(),1200);
  },{label:'Importar'});
}

// Deshacer el último import. La copia vive solo en este dispositivo.
function hayRespaldoPreImport(){
  try{ return !!localStorage.getItem(PRE_IMPORT_KEY); }catch(e){ return false; }
}
function deshacerImport(){
  let prev;
  try{ prev=JSON.parse(localStorage.getItem(PRE_IMPORT_KEY)||'null'); }catch(e){ prev=null; }
  if(!esExportValido(prev)){ showToast('No hay copia para restaurar',true); return; }
  const r=prev.ramos.length, n=contarNotas(prev.ramos);
  showConfirm('Deshacer importación',
    `Se restauran tus ${r} ramo${r!==1?'s':''} (${n} nota${n!==1?'s':''}) de antes de importar.`,()=>{
      S={...S,...normalize(prev)};
      try{ localStorage.removeItem(PRE_IMPORT_KEY); }catch(e){}
      save();track('undo_import');
      closeModal();
      showToast('✓ Datos restaurados');
      setTimeout(()=>location.reload(),1200);
    },{label:'Restaurar'});
}

// Eliminar la cuenta. Lo hace una función SECURITY DEFINER en la base
// (eliminar_mi_cuenta), no el cliente: borrar un usuario requiere privilegios
// que la sb_publishable_* no tiene y que no pueden vivir en el navegador.
//
// La función no recibe parámetros: usa auth.uid() del token de sesión, así que
// nadie puede borrar la cuenta de otro. Las tres tablas están en CASCADE, así
// que al irse el usuario se van sus notas, su perfil y sus reportes — la
// política de privacidad promete que no quedan copias y esto lo cumple.
//
// Tres confirmaciones a propósito: es la única acción de la app que destruye
// datos en el dispositivo Y en la nube a la vez. Reiniciar app, en comparación,
// conserva la nube.
