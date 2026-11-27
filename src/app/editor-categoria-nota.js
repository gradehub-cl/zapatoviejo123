function openEditCatModal(catId){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  editCatError='';
  const reglas=reglasEvaluacionEditor(r,cat);
  const comoLista=cat.directNota===false&&!seVeComoNotaSola(r,cat);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Editar evaluación</div>
    <label class="modal-label">Nombre</label>
    <div class="modal-input"><input type="text" id="m-cat-name" value="${esc(cat.nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-cat-error"/></div>
    <p id="m-cat-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    ${pesoControlHTML(cat.peso,catId)}
    ${cat.slots>1?'':`<label class="modal-label" style="display:flex;min-height:44px;align-items:center;gap:10px;text-transform:none;font-weight:500;letter-spacing:0;cursor:pointer;margin:2px 0 14px;line-height:1.35;${(cat.notas||[]).length>1?'opacity:.55;cursor:not-allowed;':''}">
      <input type="checkbox" id="m-cat-varias" ${comoLista?'checked':''} ${(cat.notas||[]).length>1?'disabled':''} style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span>Son varias notas que se promedian ${(cat.notas||[]).length>1?'<span style="color:var(--fg3);">(ya tiene varias notas: para volver a una sola, bórralas)</span>':'<span style="color:var(--fg3);">(controles, laboratorios, tareas)</span>'}</span>
    </label>
    ${cantidadVariasHTML(cat,comoLista||(cat.notas||[]).length>1,listaAbiertaPermitida(r,cat))}`}
    <div id="m-cat-fecha-grupo" ${cat.slots>1&&!cat.fecha?'hidden':''}>${campoFechaHoraHTML('m-cat',cat.fecha,cat.hora,true)}${sugerenciaFechaHTML('m-cat',fechaCompartida(r,cat,null,cat))}</div>
    <div id="m-cat-fechas-casillas">${cat.slots>1?fechasCasillasHTML(r,cat,cat.slots):''}</div>
    ${cat.directNota===true&&!(Number.isInteger(cat.slots)&&cat.slots>1)?controlRecorreccionHTML((cat.notas||[])[0],cat.fecha):''}
    ${cat.fecha?enlaceGoogleCalHTML(r,cat):''}
    ${reglasEvaluacionEditorHTML({reglas,varias:comoLista||cat.slots>1,manual:gh_descarteManual(r,S.tenant),id:idReglaModal,permiteCambiarVarias:!(cat.slots>1)})}
    ${opcionAusenciaHojaHTML(r,cat)}
    <button type="button" class="btn-eliminar-nota" onclick="confirmDeleteCat('${catId}')">Eliminar evaluación</button>
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="confirmEditCat('${catId}')">Guardar</button>
    </div>`;
  openModal();wirePesoControl();
  const varias=document.getElementById('m-cat-varias'),filaCantidad=document.getElementById('m-cat-cantidad-fila');
  if(varias&&filaCantidad)varias.addEventListener('change',()=>{filaCantidad.hidden=!varias.checked;if(!varias.checked)pintarFechasCasillas(r,cat,null);});
  const cantidad=document.getElementById('m-cat-cantidad');
  if(cantidad)cantidad.addEventListener('input',()=>{const n=parseInt(cantidad.value,10);pintarFechasCasillas(r,cat,n>=2&&n<=CANTIDAD_VARIAS_MAX&&n>=(cat.notas||[]).length?n:null);});
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
  const cantidad=varias&&!(cat.slots>1)?leerCantidadVarias(cat,listaAbiertaPermitida(r,cat)):null;if(cantidad===false)return false;
  const reglas=leerReglasEvaluacionModal(r,varias,cantidad||cat.slots);if(!reglas)return false;
  guardarReglasEvaluacionEditor(r,cat,reglas);
  cat.nombre=name;cat.peso=peso;marcarFechaUsuarioSiCambio(cat,fecha,leerHora('m-cat'));marcarOrigenCompartido(cat,'m-cat');
  const notaDirecta=(cat.notas||[])[0];
  aplicarRecorreccion(notaDirecta);
  // La casilla no existe en las de casillas fijas (`slots`), y viene desactivada
  // cuando ya hay dos o más notas: volver a fila simple mostraría una y
  // escondería el resto sin decirlo.
  if(casilla&&!casilla.disabled)cat.directNota=!casilla.checked;
  if(cantidad)fijarCantidadVarias(r,cat,cantidad);
  if(cat.slots>1)guardarFechasCasillas(r,cat);
  save();track('edit_categoria',{tiene_fecha:!!fecha,varias_notas:cat.directNota===false||cat.slots>1,con_cantidad:!!cantidad});closeModal();renderRamo();
  // La Agenda vive en otra pantalla y no se enteraba: al quitarle la fecha a una
  // evaluación seguía apareciendo ahí hasta que algo más la redibujara. El peso
  // también cambia el promedio que muestra Home.
  if(typeof renderAgenda==='function')renderAgenda();
  if(typeof renderHome==='function')renderHome();
}

// «Son varias notas» sin cantidad es una lista abierta: con la primera nota el
// avance da por evaluado todo su porcentaje, y el grupo tiene una sola fecha.
// Preguntar cuántas son, acá mismo y no solo en «Editar pauta», lo convierte en
// casillas: el avance cuenta solo las rendidas y cada una lleva su fecha
// (comentario de una estudiante, 2026-11-17). Desde 2026-11-22 la cantidad se
// pide siempre: sin ella quedaba una lista abierta, el tercer tipo que ya no se
// crea (ver seVeComoNotaSola). Es la cantidad de la persona, no del programa, y
// crece después con "+ Agregar nota". Solo la lista que ya existe con varias
// notas, o la que el programa declara sin cantidad, puede quedar vacía.
const CANTIDAD_VARIAS_MAX=30;
function cantidadVariasHTML(cat,visible,permiteVacio){
  return `<div id="m-cat-cantidad-fila" ${visible?'':'hidden'} style="margin:-4px 0 14px;">
      <label class="modal-label" for="m-cat-cantidad">¿Cuántas son?</label>
      <div class="modal-input"><input type="text" inputmode="numeric" id="m-cat-cantidad" maxlength="2" placeholder="${permiteVacio?'No sé todavía':'Ej: 4'}" autocomplete="off" aria-describedby="m-cat-cantidad-ayuda m-cat-error"/></div>
      <p id="m-cat-cantidad-ayuda" style="margin:-6px 0 0;font-size:0.8125rem;color:var(--fg3);line-height:1.35;">${permiteVacio?'Con la cantidad, el avance cuenta solo las que ya rendiste y cada una puede tener su fecha.':'Si después son más, las agregas con «+ Agregar nota».'}</p>
    </div>`;
}
// null = sin cantidad; false = error mostrado; número = cantidad válida.
function leerCantidadVarias(cat,permiteVacio){
  const input=document.getElementById('m-cat-cantidad');
  const texto=String(input&&input.value||'').trim();
  const notas=(cat.notas||[]).length;
  let error='';
  if(!texto&&permiteVacio)return null;
  const n=/^\d+$/.test(texto)?parseInt(texto,10):NaN;
  if(!texto)error='Escribe cuántas notas son (2 o más). Si después son más, las agregas con «+ Agregar nota».';
  else if(!Number.isInteger(n)||n<2||n>CANTIDAD_VARIAS_MAX)error=`Escribe un número entre 2 y ${CANTIDAD_VARIAS_MAX}${permiteVacio?', o déjalo vacío si aún no sabes':''}.`;
  else if(n<notas)error=`Ya tiene ${notas} notas: la cantidad tiene que ser ${notas} o más.`;
  if(error){editCatError=error;mostrarErrorCampo('m-cat-cantidad','m-cat-error',error);return false;}
  return n;
}
// Una fecha por casilla. «Agregar fecha» de la Agenda abre esta misma hoja, y
// con una sola fecha para el grupo no había cómo poner cada control en su día.
// La fila i es la casilla i; si todavía no hay casillas (se acaba de escribir
// la cantidad), las notas sin casilla ocupan las primeras filas en su orden,
// igual que en fijarCantidadVarias.
function notasPorFilaCasillas(cat,cantidad){
  const notas=cat.notas||[],filas=Array.from({length:cantidad},()=>null);
  if(cat.slots>1){notas.forEach(n=>{if(Number.isInteger(n.slot)&&n.slot<cantidad)filas[n.slot]=n;});return filas;}
  notas.filter(n=>!Number.isInteger(n.slot)).slice(0,cantidad).forEach((n,i)=>{filas[i]=n;});
  return filas;
}
function fechasCasillasHTML(r,cat,cantidad){
  const filas=notasPorFilaCasillas(cat,cantidad);
  return `<label class="modal-label">Fecha de cada una <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">(opcional — aparecen en la Agenda)</span></label>
    <div class="cat-fechas-casillas" style="display:grid;gap:8px;margin-bottom:14px;">${filas.map((n,i)=>{
      const nombre=cat.slots>1&&n?nombreNotaCasilla(r,cat,n):(n&&n.nombre)||etiquetaCasilla(r,cat,i);
      const f=esc(n&&n.fecha||''),h=esc(n&&n.fecha&&n.hora||''),id='m-casilla-'+i;
      return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span style="flex:1 1 100%;display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;margin-bottom:-8px;font-size:0.8125rem;color:var(--fg2);"><span>${esc(nombre)}</span>${cat.slots>1&&n&&n.fecha?`<a href="${esc(googleCalUrl(r,cat,n))}" target="_blank" rel="noopener noreferrer" aria-label="Agregar ${esc(nombre)} a Google Calendar" style="display:inline-flex;align-items:center;min-height:44px;padding:0 4px;color:var(--fg2);font-size:0.75rem;">Google Calendar</a>`:''}</span>
        <input type="date" id="${id}-fecha" value="${f}" autocomplete="off" aria-label="Fecha de ${esc(nombre)}" style="flex:1 1 9.5rem;min-width:9rem;" oninput="sincronizarHora('${id}')" onfocus="sembrarFechaHoy('${id}')"/>
        <input type="time" id="${id}-hora" value="${h}" autocomplete="off" aria-label="Hora de ${esc(nombre)} (opcional)" style="flex:1 1 7rem;min-width:6.5rem;" ${f?'':'disabled'}/>
      </div>${sugerenciaFechaHTML(id,fechaCompartida(r,cat,n?n.nombre:etiquetaCasilla(r,cat,i),n))}`;}).join('')}</div>
    <p style="margin:-6px 0 14px;font-size:0.8125rem;color:var(--fg3);line-height:1.35;">Para pasarlas todas a tu calendario de una vez: Agenda → Calendario.</p>`;
}
function enlaceGoogleCalHTML(r,cat,nota=null){
  return `<a class="ramo-action" href="${esc(googleCalUrl(r,cat,nota))}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;margin-bottom:14px;">
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
      Agregar a Google Calendar
    </a>`;
}
// Al escribir la cantidad aparecen sus filas; lo ya escrito en ellas se conserva.
function pintarFechasCasillas(r,cat,cantidad){
  const caja=document.getElementById('m-cat-fechas-casillas'),grupo=document.getElementById('m-cat-fecha-grupo');
  if(!caja||cat.slots>1)return;
  const escritas=[];
  for(let i=0;i<CANTIDAD_VARIAS_MAX;i++){const f=document.getElementById(`m-casilla-${i}-fecha`);if(!f)break;escritas.push([f.value,document.getElementById(`m-casilla-${i}-hora`)?.value||'']);}
  caja.innerHTML=cantidad?fechasCasillasHTML(r,cat,cantidad):'';
  escritas.forEach(([f,h],i)=>{const fe=document.getElementById(`m-casilla-${i}-fecha`),ho=document.getElementById(`m-casilla-${i}-hora`);if(fe&&f){fe.value=f;if(ho){ho.disabled=false;ho.value=h;}}});
  if(grupo)grupo.hidden=!!cantidad&&!cat.fecha;
}
// Solo escribe las casillas que cambiaron: una fila que sigue vacía no crea una
// nota ni marca una fecha como quitada.
function guardarFechasCasillas(r,cat){
  cat.notas=Array.isArray(cat.notas)?cat.notas:[];
  for(let i=0;i<cat.slots;i++){
    const campo=document.getElementById(`m-casilla-${i}-fecha`);if(!campo)continue;
    const fecha=campo.value||null,hora=fecha?leerHora('m-casilla-'+i):null;
    let n=cat.notas.find(x=>x.slot===i);
    if(fechaHoraSinCambio(n,fecha,hora))continue;
    if(!n){
      if(!fecha)continue;
      n=asignarCalificacionNota({id:uid(),nombre:etiquetaCasilla(r,cat,i),peso:1,slot:i},'',null);
      cat.notas.push(n);
    }
    marcarFechaUsuario(n,fecha,hora);marcarOrigenCompartido(n,'m-casilla-'+i);
  }
}
// Las notas que ya tenía pasan a las primeras casillas, en el orden en que se
// guardaron, con su nombre, valor y fecha. No se pierde ni se reordena nada.
function fijarCantidadVarias(r,cat,cantidad){
  cat.notas=Array.isArray(cat.notas)?cat.notas:[];
  const usadas=new Set(cat.notas.filter(n=>Number.isInteger(n.slot)).map(n=>n.slot));
  let libre=0;
  cat.notas.forEach(n=>{
    if(Number.isInteger(n.slot))return;
    while(usadas.has(libre))libre++;
    n.slot=libre;usadas.add(libre);
  });
  cat.slots=cantidad;cat.directNota=true;
  if(typeof abrirGrupoVacio==='function')abrirGrupoVacio(cat);
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
    <label class="modal-label" for="m-nota-val">${etiquetaNotaEntrada()} <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">— vacía si todavía no la rindes</span></label>
    <div class="modal-input"><input type="text" inputmode="${inputModeNota()}" autocapitalize="characters" id="m-nota-val" value="${n.valor!==null?textoCalificacionNota(n):''}" aria-describedby="m-nota-val-error"/></div>
    <p id="m-nota-val-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    ${campoFechaHoraHTML('m-nota',n.fecha,n.hora,true)}
    ${n.fecha?enlaceGoogleCalHTML(r,cat,n):''}
    ${controlRecorreccionHTML(n,n.fecha||cat.fecha,cat.fecha)}
    <div class="toggle-row">
      <div><div class="toggle-label">Ponderación personalizada</div><div class="toggle-sub">Por defecto se promedia simple</div></div>
      <label class="toggle"><input type="checkbox" id="m-pond-toggle" ${hasPond?'checked':''} onchange="togglePondSlider()"/><span class="toggle-slider"></span></label>
    </div>
    <div id="pond-slider-wrap" style="display:${hasPond?'block':'none'};margin-top:12px;">
      ${pesoNotaHTML(n.peso)}
    </div>
    ${Number.isInteger(n.slot)?opcionAusenciaHojaHTML(r,cat,{slot:n.slot}):''}
    <button type="button" class="btn-eliminar-nota" onclick="confirmarEliminarNota('${catId}','${notaId}')">Eliminar nota</button>
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-edit-nota-btn" onclick="confirmEditNota('${catId}','${notaId}')">Guardar</button>
    </div>`;
  openModal();
  enfocarEnHoja(document.getElementById('m-nota-name'));
  document.getElementById('m-nota-val').addEventListener('input',()=>limpiarErrorCampo('m-nota-val','m-nota-val-error'));
  document.getElementById('m-nota-name').addEventListener('input',()=>{if(editNotaError){editNotaError='';limpiarErrorCampo('m-nota-name','m-nota-error');}});
}
// Una nota se borra desde su hoja, sea de lista o de un grupo con casillas: en
// el grupo la casilla queda vacía y, si era la última agregada, "Quitar la
// última" la saca. Antes el grupo no lo ofrecía y una nota con número no se
// podía sacar nunca. Con número pregunta antes: es un dato que no vuelve.
// Vacía no hay nada que perder.
function confirmarEliminarNota(catId,notaId){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const n=r?.categorias.find(c=>c.id===catId)?.notas.find(x=>x.id===notaId);if(!n)return;
  const borrar=()=>{closeModal();deleteNota(catId,notaId);};
  if(n.valor==null&&!n.fecha)return borrar();
  showConfirm(`Eliminar "${n.nombre}"`,'Se borra esta nota con su fecha. La evaluación sigue ahí.',borrar);
}
function confirmEditNota(catId,notaId){
  const input=document.getElementById('m-nota-name');
  const name=(input&&input.value||'').trim();
  const rawNota=document.getElementById('m-nota-val').value;
  // Igual que al crearla: sin valor queda pendiente. Es el camino de vuelta —
  // se anota la evaluación cuando se sabe la fecha y se completa al rendirla.
  if(!name){editNotaError='Escribe el nombre de la nota para guardarla.';mostrarErrorCampo('m-nota-name','m-nota-error',editNotaError);return false;}
  const val=leerCalificacionHoja(rawNota);
  if(val===undefined)return false;
  const fechaNota=(document.getElementById('m-nota-fecha')||{}).value||null;
  const usaPond=document.getElementById('m-pond-toggle').checked;
  const peso=usaPond?leerPesoNota():1;
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r.categorias.find(c=>c.id===catId);
  const n=cat.notas.find(x=>x.id===notaId);
  n.nombre=name;n.peso=peso;
  asignarCalificacionNota(n,rawNota,val);
  marcarFechaUsuarioSiCambio(n,fechaNota,leerHora('m-nota'));
  aplicarRecorreccion(n);
  save();track('edit_nota',{pendiente:val===null});closeModal();renderRamo();
  if(val!==null)vibrar('nota');
  if(typeof renderAgenda==='function')renderAgenda();
  showToast(val===null?'Guardada como pendiente':lecturaDespuesDeNota(r));
}

// «Nota mínima» se juntó con el simulador (Lucas, 2026-10-23): la meta se
// ajusta en la misma hoja. Ver simNotaNecesaria y simCambiarMeta.
