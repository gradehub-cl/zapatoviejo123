

// ─── Transiciones de la app (solo en la app) ────────────────────────────────
// Abrir un ramo lo empuja desde la derecha y Volver lo devuelve por el mismo
// camino, como la navegación de iOS (HIG Motion; "si algo desaparece por un
// lado, se espera que vuelva por ahí"). Son View Transitions: el navegador
// fotografía la pantalla de antes y la de después y styles.css las desliza;
// la barra de pestañas tiene su propio nombre y se queda quieta. Sin soporte
// (iOS 17 o anterior) cambia de golpe, como antes; con movimiento reducido, un
// fundido. En la web no se usa.
let _navTransicion=0;
function transicionNativa(sentido,cambio){
  const raiz=typeof document!=='undefined'&&document.documentElement;
  if(!raiz||!raiz.classList||!raiz.classList.contains('app-nativa')||typeof document.startViewTransition!=='function'){cambio();return;}
  const n=++_navTransicion;
  raiz.dataset.nav=matchMedia('(prefers-reduced-motion: reduce)').matches?'fundido':sentido;
  document.startViewTransition(cambio).finished.finally(()=>{if(n===_navTransicion)delete raiz.dataset.nav;});
}
// El contenido nuevo de una hoja (Ajustes) entra desde el lado hacia el que se
// navega; la barra de arriba se queda, como en iOS.
function entrarDesde(el,sentido){
  const raiz=typeof document!=='undefined'&&document.documentElement;
  if(el&&raiz&&raiz.classList&&raiz.classList.contains('app-nativa'))el.classList.add('nav-'+sentido);
}
function openRamo(id){
  currentRamoId=id;
  const r=S.ramos.find(x=>x.id===id);
  track('view_ramo',{del_catalogo:!!(r&&r.origen)});
  transicionNativa('push',()=>{
    // La pestaña de donde viene queda marcada, como en iOS: dice a dónde lleva Volver.
    ['home','stats','agenda'].forEach(s=>document.getElementById('screen-'+s).classList.remove('active'));
    document.getElementById('screen-ramo').classList.add('active');
    renderRamo();
  });
}
function horaCorta(hora){return HORA_RE.test(hora||'')?hora:'';}
function fechaHoraCorta(iso,hora){
  const h=horaCorta(hora);
  return fechaCorta(iso)+(h?' · '+h:'');
}
function fechaCorta(iso){
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d=new Date(iso+'T00:00:00');
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}
function declararRecuperativo(resultado){
  if(!['aprobado','reprobado'].includes(resultado))return;
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const estado=estadoRecuperativo(r);
  if(!estado||!estado.puedeDeclarar){showToast('El recuperativo ya no aplica a esta nota',true);return;}
  r.recuperativoRendido=resultado;save();renderRamo();
}
function corregirRecuperativo(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r||!r.recuperativoRendido)return;
  r.recuperativoRendido=null;save();renderRamo();
}
function confirmarEximicionActual(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const estado=estadoEximicion(r);
  if(!estado||!estado.puedeConfirmar){showToast('La eximición todavía no se puede confirmar',true);return;}
  const examenes=estado.regla.etiqueta?`de ${estado.regla.etiqueta}`:`del ${estado.regla.evaluacion}`;
  const requisito=estado.regla.confirmar?` y que ${estado.regla.confirmar}`:'';
  showConfirm('¿Confirmar tu eximición?',
    `Tu nota de presentación es ${nf(estado.promedio)}. Confirma que ya ingresaste todas tus notas previas al examen${requisito}. Te eximirás ${examenes} y tu presentación quedará como nota final.`,()=>{
      r.eximicionConfirmada=true;save();track('confirmar_eximicion');renderRamo();
    },{label:'Confirmar eximición',danger:false});
}
function corregirEximicionActual(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r||r.eximicionConfirmada!==true)return;
  delete r.eximicionConfirmada;save();renderRamo();
}
function evaluacionSinNota(cat){return !(cat?.notas||[]).some(n=>n&&n.valor!=null);}
function porcentajeAusencia(valor){return String(r2(Number(valor)||0)).replace('.',',');}
function declararAusenciaJustificada(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const regla=reglasAusenciaOficiales(r);
  const cat=(r.categorias||[]).find(c=>c.id===catId);
  const esCasilla=Number.isInteger(slot);
  const declarable=esCasilla?(regla?.reemplazosCasilla||[]).some(x=>x.desdeId===catId&&x.desdeSlot===slot)
    :[...(regla&&regla.reemplazos||[]),...(regla&&regla.traspasos||[]),...(regla&&regla.rezagos||[]),...(regla&&regla.promedios||[])].some(x=>x.desdeId===catId);
  const sinNota=esCasilla?!(cat?.notas||[]).some(n=>n.slot===slot&&n.valor!=null):evaluacionSinNota(cat);
  if(!declarable||!cat||!sinNota){showToast('Esa ausencia ya no se puede aplicar a tu pauta',true);return;}
  const clave=esCasilla?gh_claveAusenciaCasilla(catId,slot):catId;
  if(!Array.isArray(r.ausenciasJustificadas))r.ausenciasJustificadas=[];
  if(!r.ausenciasJustificadas.includes(clave))r.ausenciasJustificadas.push(clave);
  save();track('declarar_ausencia_justificada');renderRamo();
}
function ausenciaDeEvaluacion(r,cat,slot){
  if(!r||!cat)return null;
  const esCasilla=Number.isInteger(slot);
  const clave=esCasilla?gh_claveAusenciaCasilla(cat.id,slot):cat.id;
  const declarada=(r.ausenciasJustificadas||[]).includes(clave);
  const oficial=reglasAusenciaOficiales(r);
  const regla=oficial||(r.reglasAusenciaJustificadaUsuario?.declaradaPor==='estudiante'?r.reglasAusenciaJustificadaUsuario:null);
  const entradas=esCasilla?(regla?.reemplazosCasilla||[]).filter(x=>x.desdeSlot===slot).map(x=>({...x,tipo:'reemplazo_casilla'})):[...(regla?.reemplazos||[]).map(x=>({...x,tipo:'reemplazo'})),
    ...(regla?.traspasos||[]).map(x=>({...x,tipo:'traspaso'})),
    ...(regla?.rezagos||[]).map(x=>({...x,tipo:'rezago'})),
    ...(regla?.promedios||[]).map(x=>({...x,tipo:'promedio'}))];
  const entrada=entradas.find(x=>x.desdeId===cat.id);
  const pendiente=esCasilla?!(cat.notas||[]).some(n=>n.slot===slot&&n.valor!=null):evaluacionSinNota(cat);
  if(esCasilla&&!entrada&&!declarada)return null;
  if(!declarada&&(!pendiente||!(Number(cat.peso)>0)||!!oficial&&!entrada))return null;
  const estado=declarada?estadoAusenciasJustificadas(r):null;
  const aplicada=[...(estado?.activas||[]),...(estado?.pendientes||[])].find(x=>x.desdeId===clave);
  const bloqueada=(estado?.bloqueadas||[]).find(x=>x.desdeId===clave);
  const inactiva=(estado?.inactivas||[]).find(x=>x.desdeId===clave)||
    (declarada&&!aplicada&&!bloqueada?{motivo:'pauta_cambio'}:null);
  const detalle=aplicada||bloqueada||inactiva||entrada;
  const destino=(r.categorias||[]).find(c=>c.id===detalle?.haciaId);
  const peso=porcentajeAusencia(esCasilla?cat.peso/cat.slots:cat.peso);
  let texto='';
  if(bloqueada)texto=bloqueada.motivo==='sin_regla_para_exceso'
    ?'El programa no define qué pasa con otra inasistencia justificada. El resultado queda pendiente hasta resolverlo con el curso.'
    :`El traspaso supera el máximo de ${bloqueada.topePesoDestino}% del examen. El resultado queda pendiente hasta resolverlo con el curso.`;
  else if(inactiva)texto=inactiva.motivo==='tiene_nota'
    ?'La declaración se conserva, pero no se aplica porque esta evaluación tiene nota.'
    :'La declaración se conserva, pero no se aplica porque cambió la pauta.';
  else if(detalle?.tipo==='rezago')texto=`Su ${peso}% queda pendiente para rendir en rezago.`;
  else if(detalle?.tipo==='reemplazo')texto=`Su ${peso}% se calcula con la nota ${/^Examen\b/i.test(destino?.nombre||'')?'del ':'de '}${destino?.nombre||'la evaluación de reemplazo'}.`;
  else if(detalle?.tipo==='reemplazo_casilla')texto=`Su ${peso}% se calcula con la nota ${Number.isInteger(detalle.haciaSlot)?`de la casilla ${detalle.haciaSlot+1} de `:'de '}${destino?.nombre||'la evaluación de reemplazo'}.`;
  else if(detalle?.tipo==='promedio')texto=`Su ${peso}% se calcula con el promedio ponderado de las otras evaluaciones sumativas declaradas. Si faltan notas, queda pendiente.`;
  else if(detalle?.tipo==='nota_exceso')texto=`Una segunda inasistencia justificada cuenta como ${nf(detalle.notaExceso)} en esta evaluación.`;
  else if(detalle?.tipo==='traspaso'){
    texto=`Su ${peso}% pasa ${/^Examen\b/i.test(destino?.nombre||'')?'al ':'a '}${destino?.nombre||'otra evaluación'}.`;
    if(aplicada?.pesoExcedente>0)texto+=` El destino queda topado en ${porcentajeAusencia(aplicada.topePesoDestino)}%; el ${porcentajeAusencia(aplicada.pesoExcedente)}% excedente cuenta con nota ${nf(aplicada.notaExceso)}.`;
  }
  if(oficial&&texto&&!inactiva)texto+=' Según el programa.';
  return {declarada,aplicada:!!aplicada,inactiva:!!inactiva,oficial:!!oficial,texto};
}
// "Falté con justificativo" vive dentro de la hoja de la evaluación (la de la
// fecha), no como botón en la ficha: es una excepción, y en cada fila pendiente
// ocupaba más que la propia nota (pedido de Lucas del 2026-09-30). En una
// casilla de un grupo se declara la evaluación completa, como exige el modelo.
function opcionAusenciaHojaHTML(r,cat,{slot}={}){
  let esCasilla=Number.isInteger(slot),a=ausenciaDeEvaluacion(r,cat,slot);
  // La elección personal previa para un grupo sin regla oficial sigue
  // abarcando toda la evaluación, incluso si se abre desde una casilla.
  const desdeCasillaSinRegla=esCasilla&&!a&&!reglasAusenciaOficiales(r);
  if(desdeCasillaSinRegla){a=ausenciaDeEvaluacion(r,cat);esCasilla=false;}
  if(!a)return '';
  if(a.declarada)return esCasilla?`<button type="button" class="ausencia-hoja" onclick="openDetalleAusenciaJustificada('${esc(cat.id)}',${slot})">Justificada · ver detalle</button>`:'';
  return `<div class="hoja-ausencia">
      <button type="button" class="ausencia-hoja" onclick="elegirAusenciaDesdeEvaluacion('${esc(cat.id)}'${esCasilla?`,${slot}`:''})">Falté con justificativo</button>
      <p class="hoja-ausencia-ayuda">${desdeCasillaSinRegla?`Aplica a toda la evaluación ${esc(cat.nombre)}. `:''}Te decimos a dónde va su ${porcentajeAusencia(esCasilla?cat.peso/cat.slots:cat.peso)}%.</p>
    </div>`;
}
function elegirAusenciaDesdeEvaluacion(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r?.categorias.find(c=>c.id===catId);
  const ausencia=ausenciaDeEvaluacion(r,cat,slot);
  if(!ausencia||ausencia.declarada){showToast('Esa ausencia ya no se puede declarar',true);return;}
  if(!ausencia.oficial){openAusenciaJustificadaModal(catId);return;}
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Justificar ${esc(Number.isInteger(slot)?etiquetaCasilla(r,cat,slot):cat.nombre)}</div>
    <p class="ausencia-modal-detalle">${esc(ausencia.texto)}</p>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="button" class="btn-confirm" onclick="declararAusenciaJustificada('${esc(catId)}'${Number.isInteger(slot)?`,${slot}`:''});closeModal()">Marcar justificada</button></div>`;
  openModal();
}
function openDetalleAusenciaJustificada(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r?.categorias.find(c=>c.id===catId);
  const ausencia=ausenciaDeEvaluacion(r,cat,slot);
  if(!ausencia?.declarada)return;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${ausencia.inactiva?'Declaración no aplicada':'Justificada'} · ${esc(Number.isInteger(slot)?etiquetaCasilla(r,cat,slot):cat.nombre)}</div>
    <p class="ausencia-modal-detalle">${esc(ausencia.texto)}</p>
    <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button type="button" class="btn-danger" onclick="confirmarCorreccionAusenciaJustificada('${esc(catId)}'${Number.isInteger(slot)?`,${slot}`:''})">Deshacer justificación</button></div>`;
  openModal();
}
function confirmarCorreccionAusenciaJustificada(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r?.categorias.find(c=>c.id===catId);
  const clave=Number.isInteger(slot)?gh_claveAusenciaCasilla(catId,slot):catId;
  if(!cat||(r.ausenciasJustificadas||[]).includes(clave)===false)return;
  closeModal();
  showConfirm('¿Deshacer la justificación?',`Se restaurará el porcentaje de ${Number.isInteger(slot)?etiquetaCasilla(r,cat,slot):cat.nombre} y podrás ingresar su nota.`,
    ()=>corregirAusenciaJustificada(catId,slot),{label:'Deshacer justificación',focusCancel:true});
}
function configurarAusenciaJustificadaEstudiante(r,desdeId,tipo,haciaId){
  if(!r||reglasAusenciaOficiales(r))return false;
  const desde=(r.categorias||[]).find(c=>c.id===desdeId);
  if(!desde||!(Number(desde.peso)>0)||!evaluacionSinNota(desde))return false;
  if(!['rezago','traspaso'].includes(tipo))return false;
  if(tipo==='traspaso'){
    const hacia=(r.categorias||[]).find(c=>c.id===haciaId);
    if(!hacia||hacia.id===desde.id||!(Number(hacia.peso)>0))return false;
  }
  const actual=copiarReglasAusenciaUsuario(r.reglasAusenciaJustificadaUsuario)||{
    declaradaPor:'estudiante',rezagos:[],reemplazos:[],traspasos:[]};
  actual.rezagos=actual.rezagos.filter(x=>x.desdeId!==desdeId);
  actual.reemplazos=actual.reemplazos.filter(x=>x.desdeId!==desdeId);
  actual.traspasos=actual.traspasos.filter(x=>x.desdeId!==desdeId);
  if(tipo==='rezago')actual.rezagos.push({desdeId});
  else actual.traspasos.push({desdeId,haciaId});
  r.reglasAusenciaJustificadaUsuario=actual;
  if(!Array.isArray(r.ausenciasJustificadas))r.ausenciasJustificadas=[];
  if(!r.ausenciasJustificadas.includes(desdeId))r.ausenciasJustificadas.push(desdeId);
  return true;
}
function openAusenciaJustificadaModal(catId){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const desde=r&&(r.categorias||[]).find(c=>c.id===catId);
  if(!r||reglasAusenciaOficiales(r)||!desde||!evaluacionSinNota(desde)){
    showToast('Esa ausencia ya no se puede configurar',true);return;
  }
  const destinos=(r.categorias||[]).filter(c=>c.id!==catId&&Number(c.peso)>0);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Inasistencia justificada</div>
    <p style="margin:-2px 0 16px;color:var(--fg2);line-height:1.5;">Según el formulario de <b>${esc(r.nombre)}</b>, ¿qué pasa con el ${porcentajeAusencia(desde.peso)}% de <b>${esc(desde.nombre)}</b>?</p>
    <button type="button" class="btn-cancel" style="width:100%;margin-bottom:8px;" onclick="declararAusenciaJustificadaEstudiante('${esc(catId)}','rezago')">Rendir en rezago</button>
    <p style="margin:0 0 18px;color:var(--fg3);font-size:.82rem;line-height:1.45;">Mantiene su porcentaje. La evaluación seguirá pendiente hasta que ingreses la nota del rezago.</p>
    ${destinos.length?`<label class="modal-label" for="m-ausencia-destino">Acumular porcentaje en</label>
      <select id="m-ausencia-destino" class="feedback-select" style="width:100%;margin-bottom:10px;">${destinos.map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)} · ${porcentajeAusencia(c.peso)}%</option>`).join('')}</select>
      <button type="button" class="btn-confirm" style="width:100%;" onclick="declararAusenciaJustificadaEstudiante('${esc(catId)}','traspaso')">Acumular porcentaje</button>
      <p style="margin:8px 0 0;color:var(--fg3);font-size:.82rem;line-height:1.45;">La evaluación de destino no puede superar 75%. Lo que exceda ese tope cuenta con nota 1,0.</p>`:''}
    <div class="modal-btns"><button class="btn-cancel" onclick="closeModal()">Cancelar</button></div>`;
  openModal();
}
function declararAusenciaJustificadaEstudiante(catId,tipo){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const destino=document.getElementById('m-ausencia-destino');
  const haciaId=tipo==='traspaso'&&destino?destino.value:null;
  if(!configurarAusenciaJustificadaEstudiante(r,catId,tipo,haciaId)){
    showToast('No pudimos guardar esa decisión; revisa la pauta',true);return;
  }
  save();track('declarar_ausencia_justificada_estudiante',{tipo});closeModal();renderRamo();
}
function corregirAusenciaJustificada(catId,slot){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const clave=Number.isInteger(slot)?gh_claveAusenciaCasilla(catId,slot):catId;
  r.ausenciasJustificadas=(r.ausenciasJustificadas||[]).filter(id=>id!==clave);
  const usuario=copiarReglasAusenciaUsuario(r.reglasAusenciaJustificadaUsuario);
  if(usuario){
    usuario.rezagos=usuario.rezagos.filter(x=>x.desdeId!==catId);
    usuario.reemplazos=usuario.reemplazos.filter(x=>x.desdeId!==catId);
    usuario.traspasos=usuario.traspasos.filter(x=>x.desdeId!==catId);
    r.reglasAusenciaJustificadaUsuario=(usuario.rezagos.length||usuario.reemplazos.length||usuario.traspasos.length)?usuario:null;
  }
  save();renderRamo();
}
function toggleCat(id){openCats[id]=!openCats[id];renderRamo();}
// Nota por espacio en secciones multi-nota (ej: Laboratorio 1/2/3).
