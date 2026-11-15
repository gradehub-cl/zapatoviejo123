// ─── CONTROL DE PONDERACIÓN ──────────────────────────────────────────────────
// Input numérico + slider que se sincronizan. El slider salta de 5 en 5 (valores
// redondos, que es lo normal en una pauta); el input acepta hasta dos decimales
// con coma o punto (33,33%). Antes solo enteros: abrir una evaluación de 33,33%
// y guardar la dejaba en 33 sin avisar.
// `excluirCatId` permite calcular cuánto % queda libre sin contarse a sí misma.
function leerPesoTexto(t){return r2(parseFloat(String(t||'').replace(',','.')));}
function pesoTexto(v){return String(r2(v)).replace('.',',');}
function pesoControlHTML(valor,excluirCatId){
  const v=r2(valor||30);
  const r=S.ramos.find(x=>x.id===currentRamoId);
  let usado=0;
  if(r)r.categorias.forEach(c=>{if(c.id!==excluirCatId)usado+=(c.peso||0);});
  const libre=r2(100-usado);
  return `
    <label class="modal-label">Ponderación en el ramo</label>
    <div class="peso-control">
      <div class="peso-field">
        <input type="text" inputmode="decimal" id="m-cat-peso-num" value="${pesoTexto(v)}" maxlength="6" aria-label="Ponderación en porcentaje"/>
        <span class="peso-pct">%</span>
      </div>
      <div class="peso-hint" id="m-peso-hint"></div>
    </div>
    <input type="range" min="0" max="100" step="5" value="${Math.round(v/5)*5}" id="m-cat-peso" class="peso-slider" aria-label="Ajustar ponderación"/>
    <div class="peso-marks" aria-hidden="true"><span style="--p:0">0</span><span style="--p:25">25</span><span style="--p:50">50</span><span style="--p:75">75</span><span style="--p:100">100</span></div>
    <input type="hidden" id="m-peso-libre" value="${libre}"/>`;
}

// Conecta input ↔ slider y actualiza el hint de "cuánto queda"
function wirePesoControl(){
  const num=document.getElementById('m-cat-peso-num');
  const slider=document.getElementById('m-cat-peso');
  const hint=document.getElementById('m-peso-hint');
  const libre=parseFloat((document.getElementById('m-peso-libre')||{}).value)||0;
  if(!num||!slider)return;

  function refreshHint(v){
    if(!hint)return;
    const resto=r2(libre-v);
    if(Math.abs(resto)<0.05){
      hint.textContent='Las evaluaciones suman 100%';
      hint.className='peso-hint ok';
    }else if(resto>0){
      hint.textContent=`Faltan ${r2(resto)}% para completar 100%`;
      hint.className='peso-hint';
    }else{
      hint.textContent=`Te pasas por ${r2(Math.abs(resto))}%`;
      hint.className='peso-hint over';
    }
  }
  function setVal(v,fromInput){
    v=Math.max(0,Math.min(100,v));
    slider.value=String(Math.round(v/5)*5); // el slider siempre cae en múltiplo de 5
    if(!fromInput)num.value=pesoTexto(v);
    refreshHint(v);
  }
  // Escribir a mano: 0–100 con hasta dos decimales
  num.addEventListener('input',()=>{
    const raw=num.value.replace(/[^0-9.,]/g,'');
    if(raw!==num.value)num.value=raw;
    const v=leerPesoTexto(raw);
    if(!isNaN(v))setVal(v,true);
  });
  num.addEventListener('blur',()=>{
    let v=leerPesoTexto(num.value);
    if(isNaN(v)||v<=0)v=1;
    if(v>100)v=100;
    num.value=pesoTexto(v);setVal(v,true);
  });
  // Mover el slider: salta de 5 en 5
  slider.addEventListener('input',()=>{
    const v=parseInt(slider.value,10);
    num.value=String(v);refreshHint(v);
  });
  refreshHint(leerPesoTexto(num.value)||0);
}

// Peso actual de una categoría (fallback si el input quedó vacío al editar)
function cat0Peso(catId){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return 30;
  const c=r.categorias.find(x=>x.id===catId);
  return c?c.peso:30;
}
// Lee el valor final del control (prioriza lo escrito a mano)
function readPesoControl(fallback){
  const num=document.getElementById('m-cat-peso-num');
  let v=num?leerPesoTexto(num.value):NaN;
  if(isNaN(v)){
    const slider=document.getElementById('m-cat-peso');
    v=slider?parseInt(slider.value,10):NaN;
  }
  if(isNaN(v)||v<=0)return fallback==null?30:fallback;
  return Math.min(100,v);
}

// Créditos: entero 1–60, o null si viene vacío/inválido
// Una sección es el número del curso dentro de la sigla ("MAT1610-3"). Se
// guarda como entero para poder compararla después con BuscaCursos.
const SECCION_MAX=999;
function seccionValida(n){
  return (Number.isInteger(n)&&n>=1&&n<=SECCION_MAX)?n:null;
}
// Vacío = sin sección (null). Algo escrito que no es una sección = undefined,
// para avisar en vez de borrar en silencio lo que la persona escribió.
function parseSeccion(raw){
  const txt=String(raw==null?'':raw).trim();
  if(!txt)return null;
  return /^\d{1,3}$/.test(txt)?(seccionValida(Number(txt))??undefined):undefined;
}
// Faltas a clases: un registro que lleva el estudiante, no una regla del
// programa. No toca ningún promedio. `activo:false` esconde el contador sin
// perder la cuenta, por si se apaga sin querer; `limite` es el máximo que la
// persona anotó (null = no lo sabe).
const FALTAS_MAX=99;
function copiarFaltas(f){
  if(!f||typeof f!=='object'||Array.isArray(f))return null;
  const cantidad=Number.isInteger(f.cantidad)&&f.cantidad>=0?Math.min(f.cantidad,FALTAS_MAX):0;
  const limite=Number.isInteger(f.limite)&&f.limite>=1&&f.limite<=FALTAS_MAX?f.limite:null;
  return {activo:f.activo!==false,cantidad,limite};
}
function faltasActivas(r){return !!(r&&r.faltas&&r.faltas.activo);}
// Vacío = sin máximo (null). Algo escrito que no es un número = undefined.
function parseLimiteFaltas(raw){
  const txt=String(raw==null?'':raw).trim();
  if(!txt)return null;
  const n=/^\d{1,2}$/.test(txt)?Number(txt):NaN;
  return n>=1&&n<=FALTAS_MAX?n:undefined;
}
// Décimas o talleres de una regla de `bonus`. Anotar parte en 0: hasta ahí no
// suma nada. El tope de la regla (5 décimas) también es el del contador.
function topeBonus(b){return b.entrada==='decimas'&&typeof b.max==='number'?b.max:BONUS_MAX;}
function cambiarBonus(id,delta){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const b=r&&(r.bonus||[]).find(x=>x.id===id);if(!b)return;
  const actual=r.bonusIngresado&&Number.isInteger(r.bonusIngresado[id])?r.bonusIngresado[id]:null;
  const nueva=delta===null?0:Math.max(0,Math.min(topeBonus(b),(actual===null?0:actual)+delta));
  if(nueva===actual)return;
  r.bonusIngresado={...(r.bonusIngresado||{}),[id]:nueva};
  save();track('bonus_ingresado',{entrada:b.entrada});renderRamo();
}
function cambiarFaltas(delta){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  if(!faltasActivas(r))return;
  const nueva=Math.max(0,Math.min(FALTAS_MAX,r.faltas.cantidad+delta));
  if(nueva===r.faltas.cantidad)return;
  r.faltas.cantidad=nueva;
  save();track(delta>0?'falta_sumada':'falta_restada');renderRamo();
}
function parseCreditos(raw){
  const n=parseInt(String(raw==null?'':raw).trim(),10);
  return (!isNaN(n)&&n>0&&n<=60)?n:null;
}
function confirmAddRamo(){
  const name=document.getElementById('m-ramo-search').value.trim();
  if(!name){
    mostrarErrorCampo('m-ramo-search','m-ramo-error','Escribe el nombre o la sigla del ramo para agregarlo.');
    return false;
  }
  // Si el nombre coincide con un ramo del catálogo del tenant, carga sus ponderaciones oficiales.
  const presetName=findPresetName(name,S.tenant,S.carrera);
  const preset=presetName?presetRamo(presetName,S.tenant,S.carrera):null;
  const cr=creditosDe(presetName||name,S.tenant,preset);
  S.ramos.push({id:uid(),nombre:presetName||name,color:nextRamoColor(presetName||name),creditos:cr,origen:presetName?origenActual(presetName):null,categorias:preset?preset.categorias:[],gates:preset?preset.gates:[],aporta:preset?preset.aporta:null,promedioParcial:preset?preset.promedioParcial:null,recuperativo:preset?preset.recuperativo:null,reglasAusenciaJustificada:preset?preset.reglasAusenciaJustificada:null,bonus:preset?preset.bonus:null,reemplazosOptativos:preset?preset.reemplazosOptativos:null,pautaHuella:preset?huellaPauta(preset.categorias):null});
  consensoAlAgregar(S.ramos[S.ramos.length-1]);
  const despues=alAgregarRamo;
  alCancelarAgregarRamo=null;
  save();track('add_ramo',{total_ramos:S.ramos.length,preset:!!preset,con_creditos:!!cr});closeModal();renderHome();
  showToast(preset?'Pauta cargada':'Ramo agregado');
  if(despues)despues();
}

// Fecha y hora van juntas en la interfaz porque así se piensan ("la I1 es el
// martes a las 14:00"), pero separadas en el dato. La hora queda deshabilitada
// mientras no haya fecha: una hora suelta no se puede poner en ninguna agenda.
function campoFechaHoraHTML(idBase,fecha,hora,conQuitar){
  const f=esc(fecha||''),h=esc(hora||'');
  return `<label class="modal-label">Fecha <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">(opcional — aparece en la Agenda)</span></label>
    <div class="modal-input" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input type="date" id="${idBase}-fecha" value="${f}" autocomplete="off" style="flex:1 1 9.5rem;min-width:9rem;" oninput="sincronizarHora('${idBase}')" onfocus="sembrarFechaHoy('${idBase}')"/>
      <input type="time" id="${idBase}-hora" value="${h}" autocomplete="off" aria-label="Hora (opcional)" style="flex:1 1 7rem;min-width:6.5rem;" ${fecha?'':'disabled'}/>
      ${conQuitar&&fecha?`<button type="button" onclick="limpiarFechaHora('${idBase}')" style="flex:0 0 auto;padding:10px 12px;background:var(--muted);border:none;border-radius:8px;color:var(--fg2);font-size:0.75rem;font-weight:600;cursor:pointer;">Quitar</button>`:''}
    </div>`;
}
// El campo nativo parte vacío y obliga a escribir el año completo cada vez, aunque
// una evaluación del semestre siempre cae en el año en curso. Al entrar al campo
// vacío se siembra HOY: el año queda puesto y normalmente solo hay que corregir
// el día y el mes.
//
// Se hace al enfocar y no al abrir el modal a propósito: quien no toca la fecha
// no se lleva una puesta sin querer, y el botón Quitar sigue estando para
// borrarla. Tampoco pisa una fecha que ya existía.
function sembrarFechaHoy(idBase){
  const f=document.getElementById(idBase+'-fecha');
  if(!f||f.value)return;
  const hoy=new Date();
  const mm=String(hoy.getMonth()+1).padStart(2,'0'),dd=String(hoy.getDate()).padStart(2,'0');
  f.value=`${hoy.getFullYear()}-${mm}-${dd}`;
  sincronizarHora(idBase);
}
// Quitar la fecha se lleva la hora: quedaría un dato que no se puede mostrar.
function sincronizarHora(idBase){
  const f=document.getElementById(idBase+'-fecha'),h=document.getElementById(idBase+'-hora');
  if(!f||!h)return;
  h.disabled=!f.value;
  if(!f.value)h.value='';
  if(idBase==='m-cat'||idBase==='m-nota')actualizarAvisoPlazoRecorreccion(idBase);
}
function limpiarFechaHora(idBase){
  const f=document.getElementById(idBase+'-fecha');
  if(f)f.value='';
  sincronizarHora(idBase);
}
function leerHora(idBase){
  const f=document.getElementById(idBase+'-fecha'),h=document.getElementById(idBase+'-hora');
  if(!f||!f.value||!h)return null;
  return HORA_RE.test(h.value||'')?h.value:null;
}

const idReglaModal=clave=>`m-cat-regla-${clave}`;
function leerReglasEvaluacionModal(r,varias,cantidad){
  const leer=clave=>document.getElementById(idReglaModal(clave))?.value||'';
  const reglas=validarReglasEvaluacionEditor({descarte:leer('descarte'),min:leer('min'),tope:leer('tope')},
    varias,cantidad,gh_reglasNota(r.origen?.tenant||S.tenant).grade_scale);
  if(!reglas.error)return reglas;
  const id=idReglaModal(reglas.campo),campo=document.getElementById(id);
  campo.closest('details').open=true;
  campo.setAttribute('aria-describedby','m-cat-error');
  mostrarErrorCampo(id,'m-cat-error',reglas.error);
  return null;
}
let addCatError='';
function mostrarErrorCampo(inputId,errorId,mensaje){
  const input=document.getElementById(inputId),error=document.getElementById(errorId);
  if(error){error.textContent=mensaje;error.hidden=false;}
  if(input){input.setAttribute('aria-invalid','true');input.focus();}
}
function limpiarErrorCampo(inputId,errorId){
  const input=document.getElementById(inputId),error=document.getElementById(errorId);
  if(input)input.removeAttribute('aria-invalid');
  if(error){error.textContent='';error.hidden=true;}
}
function openAddCatModal(prefillDate){
  addCatError='';
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Nueva evaluación</div>
    <label class="modal-label">Nombre</label>
    <div class="modal-input"><input type="text" id="m-cat-name" placeholder="Ej: Prueba 1, Tarea 2, Laboratorio" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="m-cat-error"/></div>
    <p id="m-cat-error" role="alert" hidden style="margin:-6px 0 10px;font-size:0.8125rem;color:var(--red);"></p>
    ${pesoControlHTML(30,null)}
    <label class="modal-label" style="display:flex;align-items:center;gap:10px;text-transform:none;font-weight:500;letter-spacing:0;cursor:pointer;margin:2px 0 14px;line-height:1.35;">
      <input type="checkbox" id="m-cat-varias" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span>Son varias notas que se promedian <span style="color:var(--fg3);">(controles, laboratorios, tareas)</span></span>
    </label>
    ${campoFechaHoraHTML('m-cat',prefillDate||'',null,false)}
    ${reglasEvaluacionEditorHTML({manual:gh_descarteManual(r,S.tenant),id:idReglaModal,permiteCambiarVarias:true})}
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-add-cat-btn" onclick="confirmAddCat()">Agregar evaluación</button>
    </div>`;
  openModal();wirePesoControl();
  enfocarEnHoja(document.getElementById('m-cat-name'));
  document.getElementById('m-cat-name').addEventListener('input',()=>{if(addCatError){addCatError='';limpiarErrorCampo('m-cat-name','m-cat-error');}});
  document.getElementById('m-cat-name').addEventListener('keydown',e=>{if(e.key==='Enter')confirmAddCat();});
}
function confirmAddCat(){
  const input=document.getElementById('m-cat-name');
  const name=(input&&input.value||'').trim();
  const peso=readPesoControl(30);
  if(!name){addCatError='Escribe el nombre de la evaluación para agregarla.';mostrarErrorCampo('m-cat-name','m-cat-error',addCatError);return false;}
  const fechaInput=document.getElementById('m-cat-fecha');
  const fecha=(fechaInput&&fechaInput.value)?fechaInput.value:null;
  const r=S.ramos.find(x=>x.id===currentRamoId);
  // directNota: una evaluación es UNA nota que se escribe en su fila, igual que
  // en las pautas oficiales. Sin esto quedaba como una lista a la que había que
  // entrar para agregar notas adentro — una "Prueba 1" no tiene notas adentro,
  // tiene una nota. Sigue siendo lo que sale por defecto.
  //
  // Pero "Controles 20%" sí tiene varias notas adentro, y a mano no había forma
  // de decirlo: la casilla es el único camino que tiene el estudiante hacia la
  // tarjeta con "+ Agregar nota" que las pautas oficiales usan vía `lista:true`.
  const varias=!!(document.getElementById('m-cat-varias')||{}).checked;
  const reglas=leerReglasEvaluacionModal(r,varias,null);if(!reglas)return false;
  const hora=leerHora('m-cat');
  const cat={id:uid(),nombre:name,peso,fecha,hora,fechaOrigen:fecha?'usuario':null,horaOrigen:hora?'usuario':null,ponderaNotas:false,directNota:!varias,notas:[]};
  guardarReglasEvaluacionEditor(r,cat,reglas);
  r.categorias.push(cat);
  save();track('add_categoria',{peso,tiene_fecha:!!fecha,varias_notas:varias});closeModal();renderRamo();
}
