const MIN_EVALUACIONES_REPORTE=2;
let reporteDraft=[],reporteRamoId=null,reporteComentarioDraft='';
function estructuraReporte(r){return estructuraDe(r).map(e=>({...e}));}
function parsePesoReporte(raw){
  const txt=String(raw==null?'':raw).trim().replace(',','.');
  const n=Number(txt);
  return Number.isFinite(n)?r2(Math.max(0,Math.min(100,n))):0;
}
function aplicarPesoReporte(est,i,raw){
  if(!est||!est[i])return est;
  est[i]={...est[i],peso:parsePesoReporte(raw)};return est;
}
function aplicarNombreReporte(est,i,raw){
  if(!est||!est[i])return est;
  est[i]={...est[i],nombre:String(raw==null?'':raw)};return est;
}
function agregarFilaReporte(est){
  if(!est)return est;
  est.push({nombre:'',peso:0});return est;
}
function quitarFilaReporte(est,i){
  if(!est||!est[i])return est;
  est.splice(i,1);return est;
}
function estadoReporte(est){
  const reportables=estructuraParaConsenso(est);
  const sinNombre=(est||[]).some(e=>!String(e.nombre||'').trim());
  const incompleta=(est||[]).length<MIN_EVALUACIONES_REPORTE||(est||[]).some(e=>!(Number(e.peso)>0));
  const total=r2((est||[]).reduce((s,e)=>s+(Number(e.peso)||0),0));
  const diferencia=r2(100-total);
  return {total,diferencia,sinNombre,lista:reportables.length>0&&!sinNombre&&!incompleta&&Math.abs(diferencia)<0.05,incompleta};
}
function textoEstadoReporte(estado){
  if(estado.incompleta)return 'Agrega al menos dos evaluaciones, con nombre y porcentaje mayor que cero.';
  if(estado.sinNombre)return'Ponle nombre a cada evaluación que tenga porcentaje.';
  if(estado.lista)return'Lista para enviar.';
  return estado.diferencia>0
    ?`Falta ${r2(estado.diferencia)}% para llegar a 100.`
    :`Te pasas por ${r2(Math.abs(estado.diferencia))}%.`;
}
function pintarEstadoReporte(){
  const estado=estadoReporte(reporteDraft);
  const total=document.getElementById('m-rep-total');
  const suma=document.getElementById('m-rep-suma');
  const balance=document.getElementById('m-rep-balance');
  if(total)total.className=`rep-total ${estado.lista?'ok':'warn'}`;
  if(suma)suma.textContent=`${r2(estado.total)}%`;
  if(balance){balance.textContent=textoEstadoReporte(estado);balance.className=`rep-balance ${estado.lista?'ok':'warn'}`;}
}
function actualizarReportePeso(i,input){
  if(!input)return;
  let limpio=String(input.value||'').replace(',','.').replace(/[^0-9.]/g,'');
  const punto=limpio.indexOf('.');
  if(punto>=0)limpio=limpio.slice(0,punto+1)+limpio.slice(punto+1).replace(/\./g,'').slice(0,1);
  if(Number(limpio)>100)limpio='100';
  input.value=limpio;
  aplicarPesoReporte(reporteDraft,i,limpio);pintarEstadoReporte();
}
function normalizarReportePeso(i,input){
  if(input&&reporteDraft[i])input.value=r2(reporteDraft[i].peso);
}
function actualizarReporteNombre(i,input){
  if(!input)return;
  aplicarNombreReporte(reporteDraft,i,input.value);pintarEstadoReporte();
}
function actualizarReporteComentario(input){reporteComentarioDraft=input?input.value:'';}
function agregarReporteFila(){
  agregarFilaReporte(reporteDraft);openReportModal(reporteRamoId,true);
  setTimeout(()=>{const campo=document.getElementById(`m-rep-nombre-${reporteDraft.length-1}`);if(campo)campo.focus();},0);
}
function quitarReporteFila(i){
  quitarFilaReporte(reporteDraft,i);openReportModal(reporteRamoId,true);
}

// La sección acompaña al reporte para distinguir ramos no coordinados, donde
// cada sección tiene su propia pauta. No participa de la huella: dos secciones
// con la misma pauta siguen siendo el mismo voto.
function seccionReporte(r){
  const s=r&&r.seccion;
  return Number.isInteger(s)&&s>=1&&s<=999?s:null;
}
// Si el SQL que agrega p_seccion todavía no está aplicado, PostgREST no
// encuentra la firma (PGRST202): se reenvía sin sección para no perder el voto.
// `conSeccion` dice si el servidor la guardó, para reintentarla más adelante.
// Detectado una vez, no se vuelve a probar en la sesión: sin esa marca, cada
// guardado reenviaría todos los votos con sección mientras falte el SQL.
let _servidorSinSeccion=false;
function periodoReporte(r){
  // El período del ramo no es la antigüedad del programa que le dio su pauta.
  return r&&/^\d{4}-[12v]$/.test(r.periodo||'')?r.periodo:semester();
}
async function rpcReporteCatalogo(r,args,{origen='explicito'}={}){
  const seccion=seccionReporte(r);
  const {error}=await supabaseClient.rpc('submit_catalog_report_periodo',{
    ...args,p_seccion:seccion,p_periodo:periodoReporte(r),p_origen:origen,
  });
  // Sin SQL nuevo no se degrada a una llamada sin período/origen.
  return {error,conSeccion:!error&&seccion!==null};
}

// La sigla de un reporte UC no puede depender solo de la malla que ya tenemos.
// Los majors aparecen en CREDITOS_UC antes de que exista su malla: si caen al
// nombre normalizado, dos ramos homónimos pueden formar consenso juntos. La
// tabla de créditos ya es el catálogo oficial que los identificó al buscarlos,
// así que sirve también para agrupar sus reportes sin cambiar datos guardados.
function siglaReporteUC(r){
  const o=r&&r.origen;
  if(!r||(o&&o.tenant!=='uc')||(!o&&S.tenant!=='uc'))return null;
  // Un ramo escrito a mano puede traer la sigla que escribió la persona. Si
  // solo trae nombre, usamos únicamente una coincidencia inequívoca; el SQL
  // hace la misma búsqueda en catalogo_uc para los demás nombres.
  if(!o){
    const directa=siglaConForma(r.sigla);
    if(directa)return directa;
    const encontradas=new Set(Object.entries(CREDITOS_UC||{})
      .filter(([nombre])=>normName(nombre)===normName(r.nombre))
      .map(([,fila])=>siglaConForma(fila&&fila[1])).filter(Boolean));
    // Mismo calce que sigla_catalogo_uc: `busqueda` exacta y una sola sigla.
    if(!encontradas.size){
      const malla=siglaConForma(siglaUC(r.nombre,S.carrera));
      if(malla)return malla;
      const busqueda=normBusqueda(normName(r.nombre));
      (cursosUcExtra()||_cursosUcRemotos).forEach(f=>{
        const sigla=Array.isArray(f)&&normBusqueda(normName(f[1]||''))===busqueda&&siglaConForma(f[0]);
        if(sigla)encontradas.add(sigla);
      });
    }
    return encontradas.size===1?[...encontradas][0]:null;
  }
  // Solo vale algo con forma de sigla. Los ramos agregados antes de que su
  // sigla estuviera en el catálogo guardaron el NOMBRE como ramoKey, y ese
  // nombre viajaba como si fuera la sigla: los reportes de un mismo ramo
  // quedaban en dos grupos (BIO110C por un lado y "BIOLOGIA DE ORGANISMOS…"
  // por otro) y el consenso no llegaba a tres (2026-09-26). No se reescribe el
  // ramoKey guardado: la sigla se resuelve al reportar.
  const fila=cursoUcCompleto(r.nombre,null);
  const clave=Object.keys(CREDITOS_UC).find(n=>normName(n)===normName(r.nombre));
  const candidatas=[r.sigla,o.ramoKey,clave&&CREDITOS_UC[clave]&&CREDITOS_UC[clave][1],siglaUC(r.nombre,o.carrera),fila&&fila[0]];
  for(const c of candidatas){const s=siglaConForma(c);if(s)return s;}
  return null;
}
// La misma forma que exige public.catalogo_uc, más un dígito: "BIO110C" sí,
// "BIOLOGIA DE ORGANISMOS Y COMUNIDADES" no.
function siglaConForma(s){
  const t=typeof s==='string'?s.trim().toUpperCase():'';
  return /^[A-Z0-9_]{3,12}$/.test(t)&&/\d/.test(t)?t:null;
}

// La clave del consenso identifica el ramo compartido, no el lugar que ocupa
// en una malla. En UC la sigla evita confundir cursos homónimos de facultades
// distintas; fuera de UC se conserva el nombre normalizado hasta tener otro
// identificador oficial equivalente.
function claveReporte(r){
  const o=r&&r.origen;
  // En UC manda la sigla, aunque el ramoKey guardado sea el nombre: es la
  // misma clave con la que el servidor agrupa los reportes.
  // Un ramo UC a mano sin sigla inequívoca se agrupa por nombre en el servidor:
  // ramoKey() tomaría la primera sigla de un nombre repetido.
  return siglaReporteUC(r)||(o&&o.ramoKey)||(!o&&S.tenant==='uc'?normName(r&&r.nombre):ramoKey(r&&r.nombre,S.tenant,S.carrera));
}
// Sin sigla, el servidor agrupa por `ramo_norm`: tiene que ser la clave con que
// se lee el consenso, o un ramo renombrado o con sinónimo vota en otro grupo.
function ramoNormReporte(r){return siglaReporteUC(r)?normName(r.nombre):claveReporte(r);}

// «Mi programa dice otra cosa» (#632) se quitó el 2026-11-02: hacía lo mismo
// que «Repórtala», sin corregir la pauta. Los reportes que llegaron siguen en
// Admin › Reportes de programa (supabase/reporte_programa.sql).
function openReportModal(ramoId,conservarBorrador=false){
  const r=S.ramos.find(x=>x.id===(ramoId||currentRamoId));
  if(!r){showToast('No se encontr\u00f3 el ramo',true);return;}
  const est=conservarBorrador?reporteDraft:estructuraReporte(r);
  if(!est.length&&!conservarBorrador){showToast('Agrega las evaluaciones antes de reportar',true);return;}
  if(!conservarBorrador){reporteDraft=est;reporteComentarioDraft='';}
  reporteRamoId=r.id;
  const estado=estadoReporte(est);
  const filas=est.map((e,i)=>`
    <div class="rep-row">
      <div class="rep-name"><input type="text" id="m-rep-nombre-${i}" value="${esc(e.nombre)}" placeholder="Ej: Prueba ${i+1}" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-label="Nombre de la evaluaci\u00f3n ${i+1}" oninput="actualizarReporteNombre(${i},this)" style="width:100%;min-height:44px;padding:9px 10px;border:1.5px solid var(--border2);border-radius:10px;background:var(--bg2);color:var(--fg);font:inherit;font-weight:600;"/>${e.slots?` <span class="rep-tag">${e.slots} notas</span>`:''}${e.min?` <span class="rep-tag">m\u00edn ${nf(e.min)}</span>`:''}</div>
      <span class="rep-peso-field"><input class="rep-peso-input" type="text" inputmode="decimal" id="m-rep-peso-${i}" name="ponderacion-${i}" value="${r2(e.peso)}" maxlength="5" autocomplete="off" aria-describedby="m-rep-balance" oninput="actualizarReportePeso(${i},this)" onblur="normalizarReportePeso(${i},this)"/><span class="rep-peso-suffix" aria-hidden="true">%</span></span>
      <button type="button" onclick="quitarReporteFila(${i})" aria-label="Quitar ${esc(e.nombre||'evaluaci\u00f3n')} del reporte" style="min-height:44px;padding:9px 8px;border:0;border-radius:10px;background:none;color:var(--fg3);font:600 0.75rem var(--font-ui);cursor:pointer;">Quitar</button>
    </div>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Reportar pauta</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:14px;">
      Corrige las evaluaciones de <b>${esc(r.nombre)}</b> como son en tu curso. El cambio queda en tu ramo y,
      si otros reportan lo mismo, pasa al cat\u00e1logo.
    </p>
    <div class="rep-box">
      ${filas}
      <button type="button" onclick="agregarReporteFila()" style="width:100%;margin:8px 0 4px;padding:10px;border:1px dashed var(--border2);border-radius:10px;background:none;color:var(--primary);font:600 0.8125rem var(--font-ui);cursor:pointer;">+ Agregar evaluaci\u00f3n</button>
      <div class="rep-total ${estado.lista?'ok':'warn'}" id="m-rep-total" role="status" aria-live="polite" tabindex="-1">
        <span>Suma</span><span id="m-rep-suma">${r2(estado.total)}%</span>
      </div>
    </div>
    <p class="rep-balance ${estado.lista?'ok':'warn'}" id="m-rep-balance">${textoEstadoReporte(estado)}</p>
    <label class="modal-label" for="m-rep-nota" style="margin-top:16px;">Comentario <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">(opcional)</span></label>
    <div class="modal-input"><input type="text" id="m-rep-nota" value="${esc(reporteComentarioDraft)}" placeholder="Ej: el profe cambi\u00f3 el examen a 40%" maxlength="120" autocomplete="off" oninput="actualizarReporteComentario(this)"/></div>
    <p style="font-size:0.71875rem;color:var(--fg3);line-height:1.45;margin:-4px 0 14px;">
      Se env\u00eda solo la estructura del ramo y tu universidad. Nunca tus notas.
    </p>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" id="m-rep-btn" onclick="enviarReporte('${esc(r.id)}')">Enviar reporte</button>
    </div>`;
  openModal();
}

// Lo que se corrige en "Reportar pauta" también queda en el ramo de quien lo
// reporta. Antes el modal dejaba cambiar nombres, porcentajes y filas, pero eso
// solo viajaba al servidor: la ficha seguía con la pauta anterior y parecía que
// se había borrado (reportado el 2026-09-26). Las notas se conservan por nombre
// con fusionarPauta, igual que al actualizar una pauta del catálogo, y cada
// evaluación que sigue conserva su id, su fecha y su regla de aprobación.
// Devuelve 'igual' | 'aplicada' | 'regla' (no se aplica: se perdería una regla).
function aplicarReporteAlRamo(r,borrador){
  const filas=(borrador||[]).map(e=>({...e,nombre:String(e.nombre||'').trim(),peso:parsePesoReporte(e.peso)}))
    .filter(e=>e.nombre);
  if(!r||!filas.length)return 'igual';
  const actual=catsDePauta(r.categorias);
  const firma=lista=>lista.map(c=>`${normName(c.nombre)}:${r2(Number(c.peso)||0)}:${Number(c.slots)>1?c.slots:1}`).sort().join('|');
  if(firma(filas)===firma(actual))return 'igual';
  const nombres=new Set(filas.map(e=>normName(e.nombre)));
  const conRegla=new Set();
  (r.gates||[]).forEach(g=>{if(g.catId)conRegla.add(g.catId);(g.catIds||[]).forEach(id=>conRegla.add(id));});
  if(actual.some(c=>conRegla.has(c.id)&&!nombres.has(normName(c.nombre))))return 'regla';
  const nuevas=filas.map(e=>{
    const anterior=actual.find(c=>normName(c.nombre)===normName(e.nombre));
    const cat=anterior?{...anterior,nombre:e.nombre,peso:e.peso}
      :{id:uid(),nombre:e.nombre,peso:e.peso,ponderaNotas:false,directNota:true,notas:[]};
    const slots=Number(e.slots)>1?Number(e.slots):null;
    // El modal no edita casillas: una fila sin cantidad conserva las que ya
    // tenía, así ninguna nota queda en una casilla que deja de mostrarse.
    if(slots){cat.slots=slots;cat.directNota=true;}
    return cat;
  });
  fusionarPauta(r,nuevas);
  return 'aplicada';
}

async function enviarReporte(ramoId){
  const r=S.ramos.find(x=>x.id===ramoId);if(!r)return;
  const btn=document.getElementById('m-rep-btn');
  if(!supabaseClient||!currentUser){
    showToast('Necesitas tener sesi\u00f3n iniciada para reportar',true);return;
  }
  const est=estructuraParaConsenso(reporteRamoId===ramoId?reporteDraft.map(e=>({...e})):[]);
  const estado=estadoReporte(est);
  if(!est.length||!estado.lista){
    const total=document.getElementById('m-rep-total');if(total)total.focus();
    showToast(est.length?textoEstadoReporte(estado):'Vuelve a abrir el reporte',true);return;
  }
  if(repiteVotoSugerido(r,est)){
    showToast('Esta pauta ya fue reportada por otros estudiantes.');
    return;
  }
  const notaEl=document.getElementById('m-rep-nota');
  _suspenderAportePautas=true;
  clearTimeout(_aportePautasTimer);
  // Primero la pauta del estudiante: es suya y no depende de que el reporte
  // llegue. Si la red falla, lo que corrigió igual queda guardado.
  const enRamo=reporteRamoId===ramoId?aplicarReporteAlRamo(r,reporteDraft):'igual';
  if(enRamo==='aplicada'){save();if(currentRamoId===r.id&&typeof renderRamo==='function')renderRamo();}
  if(btn){btn.disabled=true;btn.textContent='Enviando\u2026';}
  try{
    // Si había un aporte automático en vuelo, el reporte explícito debe ser
    // el último valor para este ramo, no quedar pisado por una petición vieja.
    if(_aportePautasEnCurso)await _aportePautasEnCurso;
    const {error,conSeccion}=await rpcReporteCatalogo(r,{
      p_tenant:S.tenant,
      // Se conserva como contexto del reporte, pero no participa del consenso.
      p_carrera:(r.origen&&r.origen.carrera)||S.carrera,
      p_ramo:r.nombre,
      p_ramo_norm:ramoNormReporte(r),
      p_ramo_sigla:siglaReporteUC(r),
      p_estructura:est,
      p_huella:huellaEstructura(est),
      p_nota:reporteComentarioDraft.trim()||((notaEl&&notaEl.value.trim())||null),
    });
    if(error)throw error;
    // Un reporte explícito puede describir una corrección que no se pudo
    // aplicar por una compuerta. El aporte automático no debe reemplazarla.
    r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(r)));
    if(conSeccion)r.seccionAportada=seccionReporte(r);
    save();
    track('reporte_catalogo',{tenant:S.tenant});
    closeModal();
    reporteDraft=[];reporteRamoId=null;reporteComentarioDraft='';
    showToast(enRamo==='aplicada'?'Gracias \u00b7 tu reporte qued\u00f3 registrado y tu pauta, actualizada'
      :enRamo==='regla'?'Reporte enviado. Tu pauta no cambi\u00f3: una evaluaci\u00f3n con regla de aprobaci\u00f3n se ajusta en Editar pauta.'
      :'Gracias \u00b7 tu reporte qued\u00f3 registrado');
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='Enviar reporte';}
    // Tabla no creada todav\u00eda \u2192 mensaje entendible en vez del error crudo
    const msg=/relation .* does not exist|schema cache/i.test(e.message||'')
      ? 'Los reportes a\u00fan no est\u00e1n habilitados en el servidor.'
      : enRamo==='aplicada'?'Tu pauta qued\u00f3 guardada, pero el reporte no se pudo enviar. Revisa tu conexi\u00f3n.'
      : 'No se pudo enviar. Revisa tu conexi\u00f3n.';
    showToast(msg,true);
  }finally{_suspenderAportePautas=false;}
}

// Lee el consenso (solo agregados, sin datos de nadie) y avisa si el cat\u00e1logo
// que tiene el estudiante qued\u00f3 desactualizado respecto de lo que reporta el resto.
//
// Una caché por universidad. Era una sola: una cuenta nueva arranca con el
// tenant por defecto, el arranque leía ese consenso y, si en el onboarding
// elegía otra universidad, seguía viendo el ajeno hasta recargar. Fuera de la
// UC el consenso se cruza por nombre, así que "Microeconomía" de una podía
// calzar con la de otra.
