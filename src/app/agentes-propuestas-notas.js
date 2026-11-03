function propuestaRamosLimpia(valor){
  const id=valor&&valor.id;
  const fuente=limpiarNombreAjeno(valor&&valor.fuente).slice(0,300);
  const lista=Array.isArray(valor&&valor.evaluaciones)?valor.evaluaciones:[];
  const ramos=lista.map(r=>{
    const nombre=limpiarNombreAjeno(r&&r.nombre);
    if(!nombre)return null;
    const sigla=limpiarNombreAjeno(r&&r.sigla).toUpperCase().slice(0,40);
    const seccion=seccionValida(r&&r.seccion);
    return {nombre,sigla:sigla||null,seccion};
  }).filter(Boolean);
  if(!id||!fuente||!ramos.length||ramos.length>20)return null;
  return {id,fuente,ramos,createdAt:valor.created_at||null};
}
// Un ramo propuesto que la persona ya agregó (desde la app, o aceptando otra
// propuesta) no se vuelve a ofrecer: agregarlo dos veces le duplica el ramo.
function ramoPropuestoYaEsta(r){
  return (S.ramos||[]).some(x=>{
    const existente=x.sigla||siglaDeRamo(x);
    if(r.sigla&&existente)return normName(existente)===normName(r.sigla);
    return normName(x.nombre)===normName(r.nombre);
  });
}
// El ramo guardado con ESA sigla. Solo por sigla: por nombre se confunden los
// homónimos (TEB110 y TTF012 se llaman igual) y no se toca un ramo ajeno.
function ramoConSigla(sigla){
  if(!sigla)return null;
  return (S.ramos||[]).find(x=>{const k=x.sigla||siglaDeRamo(x);return k&&normName(k)===normName(sigla);})||null;
}
function propuestasFechasDeRamo(ramo){
  if(!ramo)return [];
  const clave=ramo.origen&&ramo.origen.ramoKey;
  return propuestasFechasAgente.filter(p=>
    (clave&&p.ramoKey===clave)||normName(p.ramo)===normName(ramo.nombre));
}
// Escribe una fecha propuesta. Con casilla va a esa casilla del grupo —y la
// crea pendiente si no existía, que es el caso normal: la fecha se sabe antes
// que la nota—; sin casilla va a la categoría, que es la fecha del grupo.
// La `casilla` del agente cuenta desde 1 ("el Control 2"), como en el conector
// MCP; `slot` cuenta desde 0. Antes se usaba tal cual: el Control 1 caía en la
// casilla del Control 2 y el último creaba una casilla de más (issue #655).
function slotDeCasilla(cat,casilla){
  const slots=Number.isInteger(cat.slots)&&cat.slots>1?cat.slots:1;
  if(!Number.isInteger(casilla)||casilla<1||casilla>slots)return undefined;
  return slots>1?casilla-1:null;
}
function escribirFechaPropuesta(ramo,cat,prop){
  if(!cat)return false;
  if(prop.casilla){
    const slot=slotDeCasilla(cat,prop.casilla);
    if(slot===undefined)return false;
    // "Casilla 1" de una evaluación sin casillas es la evaluación misma.
    if(slot!==null){
      cat.notas=Array.isArray(cat.notas)?cat.notas:[];
      let n=cat.notas.find(x=>x.slot===slot);
      if(!n){
        n=asignarCalificacionNota({id:uid(),nombre:etiquetaCasilla(ramo,cat,slot),peso:1,slot},'',null);
        cat.notas.push(n);
      }
      marcarFechaUsuario(n,prop.fecha,prop.hora||'');
      return true;
    }
  }
  marcarFechaUsuario(cat,prop.fecha,prop.hora||'');
  return true;
}
async function aplicarPropuestaFechas(id,valores){
  const propuesta=propuestasFechasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const ramo=S.ramos.find(r=>propuestasFechasDeRamo(r).some(p=>p.id===id));
  if(!ramo){showToast('Ese ramo ya no está en tu semestre',true);return;}
  const aplicar=(valores&&valores.length?valores:propuesta.fechas);
  try{
    await resolverPropuestaPauta(id,'aplicada');
    propuestasFechasAgente=propuestasFechasAgente.filter(p=>p.id!==id);
    let puestas=0;
    aplicar.forEach(f=>{
      const cat=(ramo.categorias||[]).find(c=>normName(c.nombre)===normName(f.evaluacion));
      if(escribirFechaPropuesta(ramo,cat,f))puestas++;
    });
    save();
    track('fechas_agente_confirmadas',{fechas:puestas,editadas:!!(valores&&valores.length)});
    closeModal();
    if(currentRamoId===ramo.id)renderRamo();else renderHome();
    if(typeof renderAgenda==='function')renderAgenda();
    showToast(puestas===aplicar.length?`${puestas} fecha${puestas!==1?'s':''} guardada${puestas!==1?'s':''}`
      :`Guardamos ${puestas} de ${aplicar.length}: el resto no calzó con las evaluaciones del ramo`,puestas!==aplicar.length);
  }catch(e){showToast('No pudimos guardar estas fechas. Intenta de nuevo.',true);}
}
function abrirEditarPropuestaFechas(id){
  const propuesta=propuestasFechasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const filas=propuesta.fechas.map((f,i)=>`
    <div class="prop-nota-row">
      <label for="prop-fecha-${i}">${esc(f.evaluacion)}${f.casilla?` · casilla ${f.casilla}`:''}</label>
      <input type="date" id="prop-fecha-${i}" value="${esc(f.fecha)}"/>
    </div>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Revisar las fechas propuestas</div>
    <p class="settings-help" style="margin-top:0;">Cambia lo que no calce y guarda. Nada se aplica hasta que aprietes Guardar.</p>
    <div class="prop-nota-lista">${filas}</div>
    <div class="prop-nota-fuente">Según el agente: ${esc(propuesta.fuente)}</div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="guardarPropuestaFechasEditada('${esc(id)}')">Guardar</button>
    </div>`;
  openModal();
}
function guardarPropuestaFechasEditada(id){
  const propuesta=propuestasFechasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const valores=[];
  for(let i=0;i<propuesta.fechas.length;i++){
    const campo=document.getElementById('prop-fecha-'+i);
    const v=(campo&&campo.value||'').trim();
    // Vaciar una fila la omite. No se aplica la fecha propuesta "por si acaso":
    // borrarla es lo que la persona quiso decir.
    if(!FECHA_PROP_RE.test(v))continue;
    valores.push({...propuesta.fechas[i],fecha:v});
  }
  if(!valores.length){showToast('No quedó ninguna fecha para guardar',true);return;}
  aplicarPropuestaFechas(id,valores);
}
function confirmarDescartarPropuestaFechas(id){
  const propuesta=propuestasFechasAgente.find(p=>p.id===id);if(!propuesta)return;
  showConfirm('¿Rechazar estas fechas?','Se descarta la propuesta. Tu agenda no cambia.',async()=>{
    try{
      await resolverPropuestaPauta(id,'descartada');
      propuestasFechasAgente=propuestasFechasAgente.filter(p=>p.id!==id);
      closeModal();renderRamo();showToast('Propuesta rechazada');
    }catch(e){showToast('No pudimos rechazar esta propuesta. Intenta de nuevo.',true);}
  },{label:'Rechazar',danger:true,focusCancel:true});
}
function propuestaNotasLimpia(valor){
  if(!valor||typeof valor!=='object')return null;
  const id=String(valor.id||'');
  const ramo=String(valor.ramo||'').trim();
  const ramoKey=String(valor.ramo_key||'').trim();
  const fuente=String(valor.fuente||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!ramo||!ramoKey||!fuente||!Array.isArray(valor.evaluaciones))return null;
  const vistas=new Set();
  const notas=[];
  for(const fila of valor.evaluaciones){
    const evaluacion=String(fila&&fila.evaluacion||'').trim();
    const v=Number(fila&&fila.valor);
    const casilla=fila&&fila.casilla==null?null:Number(fila.casilla);
    const clave=normName(evaluacion)+'#'+(casilla==null?'':casilla);
    if(!evaluacion||!Number.isFinite(v)||v<1||v>7||vistas.has(clave))return null;
    if(casilla!==null&&(!Number.isInteger(casilla)||casilla<1||casilla>100))return null;
    vistas.add(clave);notas.push({evaluacion,valor:Math.round(v*100)/100,casilla});
  }
  if(!notas.length||notas.length>60)return null;
  return {id,ramo,ramoKey,fuente,notas,createdAt:valor.created_at||null};
}
function propuestasNotasDeRamo(ramo){
  if(!ramo)return [];
  const clave=ramo.origen&&ramo.origen.ramoKey;
  return propuestasNotasAgente.filter(p=>
    (clave&&p.ramoKey===clave)||normName(p.ramo)===normName(ramo.nombre));
}
// Dónde cae una nota propuesta: {slot, nota} con la nota que ya ocupa ese lugar
// (o undefined si se crea), o null si no calza. La usan escribir la nota y la
// tarjeta que muestra qué nota se pisa, para que las dos digan lo mismo.
function destinoNotaPropuesta(cat,propuesta){
  if(!cat)return null;
  const notas=Array.isArray(cat.notas)?cat.notas:[];
  const slots=Number.isInteger(cat.slots)&&cat.slots>1?cat.slots:1;
  if(slots===1)return {slot:null,nota:notas.find(n=>n.valor===null||n.valor===undefined)||notas[0]};
  // Sin casilla, va a la primera libre. Antes caía en cat.notas[0] cuando
  // todas tenían nota: pisaba una nota ya ingresada sin avisar.
  let slot;
  if(propuesta.casilla)slot=slotDeCasilla(cat,propuesta.casilla);
  else for(let i=0;i<slots&&slot===undefined;i++){
    const n=notas.find(x=>x.slot===i);
    if(!n||n.valor===null||n.valor===undefined)slot=i;
  }
  return slot===undefined?null:{slot,nota:notas.find(n=>n.slot===slot)};
}
// Escribe una nota propuesta en su categoría. Devuelve false si no calza, para
// no dar por aplicada una propuesta que en realidad no entró.
function escribirNotaPropuesta(cat,propuesta,ramo){
  const lugar=destinoNotaPropuesta(cat,propuesta);
  if(!lugar)return false;
  cat.notas=Array.isArray(cat.notas)?cat.notas:[];
  let destino=lugar.nota;
  if(!destino){
    const slot=lugar.slot;
    destino=slot===null?{id:uid(),nombre:cat.nombre,valor:null,peso:1}
      :{id:uid(),nombre:ramo?etiquetaCasilla(ramo,cat,slot):cat.nombre+' '+(slot+1),valor:null,peso:1,slot};
    cat.notas.push(destino);
  }
  asignarValorNota(destino,propuesta.valor);
  return true;
}
// `valores` permite aplicar lo editado en vez de lo propuesto: es el mismo
// camino, con otros números. Lo que no cambia es que la propuesta se marca
// resuelta ANTES de tocar el ramo, para que una red caída no deje una propuesta
// que se pueda aplicar dos veces.
async function aplicarPropuestaNotas(id,valores){
  const propuesta=propuestasNotasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const ramo=S.ramos.find(r=>propuestasNotasDeRamo(r).some(p=>p.id===id));
  if(!ramo){showToast('Ese ramo ya no está en tu semestre',true);return;}
  const aplicar=(valores&&valores.length?valores:propuesta.notas);
  try{
    await resolverPropuestaPauta(id,'aplicada');
    propuestasNotasAgente=propuestasNotasAgente.filter(p=>p.id!==id);
    let puestas=0;
    aplicar.forEach(n=>{
      const cat=(ramo.categorias||[]).find(c=>normName(c.nombre)===normName(n.evaluacion));
      if(escribirNotaPropuesta(cat,n,ramo))puestas++;
    });
    save();
    track('notas_agente_confirmadas',{notas:puestas,editadas:!!(valores&&valores.length)});
    closeModal();
    if(currentRamoId===ramo.id)renderRamo();else renderHome();
    if(typeof renderAgenda==='function')renderAgenda();
    showToast(puestas===aplicar.length?`${puestas} nota${puestas!==1?'s':''} guardada${puestas!==1?'s':''}`
      :`Guardamos ${puestas} de ${aplicar.length}: el resto no calzó con las evaluaciones del ramo`,puestas!==aplicar.length);
  }catch(e){showToast('No pudimos guardar estas notas. Intenta de nuevo.',true);}
}
function abrirEditarPropuestaNotas(id){
  const propuesta=propuestasNotasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const filas=propuesta.notas.map((n,i)=>`
    <div class="prop-nota-row">
      <label for="prop-nota-${i}">${esc(n.evaluacion)}${n.casilla?` · casilla ${n.casilla}`:''}</label>
      <input type="text" id="prop-nota-${i}" class="eval-row-input" inputmode="decimal" value="${esc(String(n.valor).replace('.',','))}" maxlength="4"/>
    </div>`).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Revisar las notas propuestas</div>
    <p class="settings-help" style="margin-top:0;">Cambia lo que no calce y guarda. Nada se aplica hasta que aprietes Guardar.</p>
    <div class="prop-nota-lista">${filas}</div>
    <div class="prop-nota-fuente">Según el agente: ${esc(propuesta.fuente)}</div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="guardarPropuestaNotasEditada('${esc(id)}')">Guardar</button>
    </div>`;
  openModal();
}
function guardarPropuestaNotasEditada(id){
  const propuesta=propuestasNotasAgente.find(p=>p.id===id);
  if(!propuesta)return;
  const valores=[];
  for(let i=0;i<propuesta.notas.length;i++){
    const campo=document.getElementById('prop-nota-'+i);
    const v=parseNota(campo?campo.value:'');
    // Una casilla que quedó vacía o con algo que no es nota se omite, no se
    // guarda como 1,0 ni se inventa: omitir es lo que la persona quiso decir.
    if(isNaN(v)||v<1||v>7)continue;
    valores.push({...propuesta.notas[i],valor:v});
  }
  if(!valores.length){showToast('No quedó ninguna nota válida para guardar',true);return;}
  aplicarPropuestaNotas(id,valores);
}
function confirmarDescartarPropuestaNotas(id){
  const propuesta=propuestasNotasAgente.find(p=>p.id===id);if(!propuesta)return;
  showConfirm('¿Rechazar estas notas?','Se descarta la propuesta. Tus notas no cambian.',async()=>{
    try{
      await resolverPropuestaPauta(id,'descartada');
      propuestasNotasAgente=propuestasNotasAgente.filter(p=>p.id!==id);
      closeModal();renderRamo();showToast('Propuesta rechazada');
    }catch(e){showToast('No pudimos rechazar esta propuesta. Intenta de nuevo.',true);}
  },{label:'Rechazar',danger:true,focusCancel:true});
}
function propuestaPautaLimpia(valor){
  if(!valor||typeof valor!=='object')return null;
  const id=String(valor.id||'');
  const ramo=String(valor.ramo||'').trim();
  const ramoKey=String(valor.ramo_key||'').trim();
  const fuente=String(valor.fuente||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!ramo||!ramoKey||!fuente||!Array.isArray(valor.evaluaciones))return null;
  const nombres=new Set();
  const evaluaciones=[];
  for(const fila of valor.evaluaciones){
    const nombre=String(fila&&fila.nombre||'').trim();
    const peso=Number(fila&&fila.peso);
    const casillas=fila&&fila.casillas==null?null:Number(fila.casillas);
    const clave=normName(nombre);
    if(!nombre||!clave||nombres.has(clave)||!Number.isFinite(peso)||peso<=0||peso>100
      ||(casillas!==null&&(!Number.isInteger(casillas)||casillas<2||casillas>100)))return null;
    nombres.add(clave);evaluaciones.push({nombre,peso:r2(peso),casillas});
  }
  const total=r2(evaluaciones.reduce((s,e)=>s+e.peso,0));
  if(!evaluaciones.length||evaluaciones.length>30||Math.abs(total-100)>=0.05)return null;
  return {id,ramo,ramoKey,evaluaciones,fuente,createdAt:valor.created_at||null};
}
function ramoDePropuestaPauta(propuesta){
  const clave=normName(propuesta&&propuesta.ramoKey);
  return (S.ramos||[]).find(r=>normName((r.origen&&r.origen.ramoKey)||r.nombre)===clave)
    ||(S.ramos||[]).find(r=>normName(r.nombre)===normName(propuesta&&propuesta.ramo))||null;
}
// Inicio recuerda las pautas hasta que su dueña las revise. Una propuesta
// pendiente todavía no cambia el ramo ni participa del consenso.
function renderPropuestasPautaHome(){
  const caja=document.getElementById('home-pautas-propuestas');
  if(!caja)return;
  if(!propuestasPautaAgente.length){caja.style.display='none';caja.innerHTML='';return;}
  caja.style.display='block';
  caja.innerHTML=`
    <div class="home-recorrecciones-hd">
      <span class="section-hd-title">Pautas de tu agente por revisar</span>
      <span class="ag-count">${propuestasPautaAgente.length}</span>
    </div>
    ${propuestasPautaAgente.map(p=>`<button type="button" class="home-propuesta-row" onclick="abrirPropuestasPautaAgente()">
      <strong>${esc((ramoDePropuestaPauta(p)||{}).nombre||p.ramo)}</strong>
      <span>Revisar pauta propuesta</span>
    </button>`).join('')}`;
}
