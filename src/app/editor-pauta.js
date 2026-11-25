
// ─── PAUTA MANUAL ───────────────────────────────────────────────────────────
// El borrador vive solo mientras el modal está abierto: cancelar no toca la
// pauta real. Los pesos pueden quedar incompletos porque en semana 1 muchas
// veces todavía no está toda la información.
let pautaDraft=[];
// Solo el borrador: aceptar una lectura Canvas no escribe el ramo hasta Guardar.
let pautaProgramaCanvasDraft=null;
// Evaluaciones con notas que la persona decidió quitar en el editor: {id, hacia}.
// `hacia` es otra evaluación con el mismo nombre, a la que pasan sus notas.
let pautaQuitadas=[];
let pautaDraftError='',pautaDraftErrorIndex=null,pautaDraftErrorTarget='';
// Se abrió desde "Armar mi pauta" (el ramo no tenía evaluaciones): el título
// dice eso y no "Editar evaluaciones", que es lo que dice el botón con pauta.
let pautaArmando=false;
// Los requisitos del programa se conservan. El editor solo escribe los suyos.
function reglasEvaluacionEditor(r,cat){
  const gates=(r.gates||[]).filter(g=>g.type==='min_grade_required'&&g.catId===cat.id);
  const propia=gates.find(g=>g.origen==='editor');
  return {descarte:cat.descarteOrigen==='editor'?String(cat.dropLowest?.count||''):'',
    min:propia?String(propia.min).replace('.',','):'',tope:propia?String(propia.cap).replace('.',','):'',
    descartePrograma:!!cat.dropLowest&&cat.descarteOrigen!=='editor',minimoPrograma:gates.some(g=>g.origen!=='editor'),
    ...(enAppNativa()?{puntos:Number(cat.puntajeTotal)>0?String(cat.puntajeTotal).replace('.',','):'',exigencia:exigenciaValida(cat.exigencia)!==null?String(exigenciaValida(cat.exigencia)).replace('.',','):''}:{})};
}
function validarReglasEvaluacionEditor(reglas,varias,cantidad,escala){
  const descarte=String(reglas.descarte||'').trim();
  const min=String(reglas.min||'').trim(),tope=String(reglas.tope||'').trim();
  const n=Number(descarte);
  if(descarte&&(!/^\d+$/.test(descarte)||n<1||n>99))
    return {campo:'descarte',error:'Escribe entre 1 y 99 notas para descartar, o deja el campo vacío.'};
  if(descarte&&(!varias||(cantidad&&n>=cantidad)))
    return {campo:'descarte',error:'Deja al menos una nota que cuente, o quita el descarte para guardar.'};
  if(min||tope){
    for(const [campo,valor] of [['min',min],['tope',tope]]){
      const nota=Number(valor.replace(',','.'));
      if(!/^\d+(?:[.,]\d{1,2})?$/.test(valor)||nota<escala.min||nota>escala.max)
        return {campo,error:`Escribe ${campo==='min'?'un mínimo':'un tope'} entre ${escala.min} y ${escala.max}.`};
    }
  }
  // Puntaje (solo app): la evaluación se anota en puntos y se pasa a nota con
  // su exigencia, o la del ramo si no tiene una propia.
  const puntaje={};
  if(typeof reglas.puntos==='string'){
    const puntos=reglas.puntos.trim(),total=Number(puntos.replace(',','.'));
    if(puntos&&(!/^\d+(?:[.,]\d{1,2})?$/.test(puntos)||!(total>0)||total>10000))
      return {campo:'puntos',error:'Escribe el puntaje total, entre 1 y 10.000, o deja el campo vacío.'};
    const exig=String(reglas.exigencia||'').trim();
    if(exig&&exigenciaValida(exig)===null)
      return {campo:'exigencia',error:'La exigencia es un porcentaje entre 1 y 99, como 60.'};
    puntaje.puntajeTotal=puntos?total:null;puntaje.exigencia=exig?exigenciaValida(exig):null;
  }
  return {count:descarte?n:null,min:min?Number(min.replace(',','.')):null,cap:tope?Number(tope.replace(',','.')):null,...puntaje};
}
function guardarReglasEvaluacionEditor(r,cat,reglas){
  if('puntajeTotal' in reglas){
    if(reglas.puntajeTotal)cat.puntajeTotal=reglas.puntajeTotal;else delete cat.puntajeTotal;
    if(reglas.puntajeTotal&&reglas.exigencia!==null)cat.exigencia=reglas.exigencia;else delete cat.exigencia;
  }
  if(reglas.count!==null){
    cat.dropLowest={count:reglas.count};cat.descarteOrigen='editor';
  }else if(cat.descarteOrigen==='editor'){
    delete cat.dropLowest;delete cat.descarteOrigen;
  }
  const gates=r.gates||[];
  const anterior=gates.find(g=>g.type==='min_grade_required'&&g.origen==='editor'&&g.catId===cat.id);
  if(!anterior?reglas.min===null:anterior.min===reglas.min&&anterior.cap===reglas.cap)return;
  r.gates=gates.filter(g=>g!==anterior);
  if(reglas.min!==null)r.gates.push({type:'min_grade_required',catId:cat.id,min:reglas.min,cap:reglas.cap,origen:'editor'});
}
function reglasEvaluacionEditorHTML({reglas={},varias,manual,abierto,id,permiteCambiarVarias=false,oninput='',invalido=()=>''}){
  const campo=(clave,etiqueta,modo)=>`<label><span>${etiqueta}</span><input type="text" inputmode="${modo}" maxlength="5"
    id="${id(clave)}" value="${esc(reglas[clave]||'')}"${oninput?` oninput="${oninput(clave)}"`:''}${invalido(clave)}></label>`;
  return `<details class="editor-reglas"${abierto?' open':''}>
    <summary>Reglas de esta evaluación</summary>
    <div class="editor-reglas-campos">
      ${reglas.descartePrograma?'<p>El programa ya indica el descarte.</p>':varias||reglas.descarte||permiteCambiarVarias?
        `<div class="editor-reglas-descarte${!varias&&!reglas.descarte?' editor-reglas-al-marcar-varias':''}">`+campo('descarte','Cantidad de notas que se pueden borrar','numeric')+
        `<small>${manual?'Tú eliges qué notas borrar.':'Se descartan las más bajas y siempre queda al menos una nota que cuenta.'}</small></div>`:''}
      ${reglas.minimoPrograma?'<p>El programa ya indica el mínimo de esta evaluación.</p>':
        campo('min','Nota mínima','decimal')+campo('tope','Tope de la nota final','decimal')+
        '<small>Si quedas bajo el mínimo, tu nota final no supera este tope. Deja ambos campos vacíos si no aplica.</small>'}
      ${enAppNativa()?campo('puntos','Puntaje total, si te la entregan en puntos','decimal')+campo('exigencia','Exigencia (%)','decimal')+
        '<small>Con puntaje total anotas los puntos que sacaste y te los pasamos a nota. Sin exigencia usamos la del ramo.</small>':''}
    </div>
  </details>`;
}
// ─── REQUISITOS QUE COMBINAN EVALUACIONES (solo app) ────────────────────────
// El motor ya calcula `group_min` (compuertasEfectivas): el promedio ponderado
// de varias evaluaciones tiene que llegar a un mínimo. Si no llega, la final
// queda topada, o pasa a ser el promedio de ese grupo (aprobar por partes, como
// la parte teórica y la práctica). Así se escribe (15·I1+20·I2+30·E)/65 ≥ 4,0:
// se marcan I1, I2 y E, y el motor pondera con sus pesos.
// Los del programa se conservan tal cual; el editor solo escribe los suyos.
// null = la sección no se mostró (web) y guardar no toca esos requisitos.
let pautaRequisitosDraft=null;
let pautaClaveNueva=0;
// Una evaluación nueva todavía no tiene id: el requisito la nombra por clave.
function claveFilaPauta(fila){if(!fila.clave)fila.clave=fila.id||('nueva-'+(++pautaClaveNueva));return fila.clave;}
function textoNotaEditor(n){return Number.isFinite(n)?(Number.isInteger(n)?n.toFixed(1):String(n)).replace('.',','):'';}
function requisitosGrupoEditor(r){
  return (r.gates||[]).filter(g=>g.type==='group_min'&&g.origen==='editor').map(g=>({
    nombre:g.nombre||'',claves:[...(g.catIds||[])],min:textoNotaEditor(g.min),
    efecto:g.efecto==='reemplazar'&&g.cap==='self'?'reemplazar':'tope',tope:g.cap==='self'?'3,9':textoNotaEditor(g.cap)}));
}
function requisitoGrupoVacio(){return {nombre:'',claves:[],min:'4,0',efecto:'tope',tope:'3,9'};}
// Valida sin tocar el ramo. Un requisito sin nombre ni evaluaciones se ignora.
function validarRequisitosGrupo(draft,filas,escala){
  const requisitos=[];
  const nota=(texto,campo,i,que)=>{
    const valor=String(texto||'').trim(),n=Number(valor.replace(',','.'));
    if(!/^\d+(?:[.,]\d{1,2})?$/.test(valor)||n<escala.min||n>escala.max)
      return {error:`Escribe ${que} entre ${escala.min} y ${escala.max}.`,campo,i};
    return {n};
  };
  for(let i=0;i<(draft||[]).length;i++){
    const q=draft[i];
    const elegidas=filas.filter(f=>f.nombre.trim()&&q.claves.includes(claveFilaPauta(f)));
    if(!elegidas.length&&!String(q.nombre||'').trim())continue;
    if(!elegidas.length)return {error:'Marca al menos una evaluación para el requisito.',campo:'evals',i};
    const min=nota(q.min,'min',i,'un mínimo');if(min.error)return min;
    let cap='self';
    if(q.efecto!=='reemplazar'){const tope=nota(q.tope,'tope',i,'un tope');if(tope.error)return tope;cap=tope.n;}
    requisitos.push({nombre:String(q.nombre||'').trim()||elegidas.map(f=>f.nombre.trim()).join(' y '),
      filas:elegidas,min:min.n,cap,efecto:q.efecto==='reemplazar'?'reemplazar':'tope'});
  }
  return {requisitos};
}
// Reemplaza solo los requisitos de grupo del editor; idDe traduce cada fila.
function guardarRequisitosGrupo(r,requisitos,idDe){
  const propios=requisitos.map(q=>({type:'group_min',catIds:q.filas.map(idDe).filter(Boolean),min:q.min,cap:q.cap,
    ...(q.efecto==='reemplazar'?{efecto:'reemplazar'}:{}),nombre:q.nombre,origen:'editor'})).filter(g=>g.catIds.length);
  r.gates=[...(r.gates||[]).filter(g=>!(g&&g.type==='group_min'&&g.origen==='editor')),...propios];
}
// Las reglas del editor que nombran una evaluación que ya no existe se van; un
// requisito de grupo solo pierde esa evaluación. Las del programa no se tocan.
function reglasEditorVigentes(gates,vigentes){
  return (gates||[]).map(g=>{
    if(!g||g.origen!=='editor')return g;
    if(Array.isArray(g.catIds)){const ids=g.catIds.filter(id=>vigentes.has(id));return ids.length?(ids.length===g.catIds.length?g:{...g,catIds:ids}):null;}
    return vigentes.has(g.catId)?g:null;
  }).filter(Boolean);
}
function evalsRequisitoHTML(i){
  const q=pautaRequisitosDraft[i],filas=pautaDraft.filter(f=>f.nombre.trim());
  if(!filas.length)return '<small>Primero escribe las evaluaciones.</small>';
  return filas.map(f=>{const k=claveFilaPauta(f);return `<label class="pauta-requisito-eval"><input type="checkbox"${q.claves.includes(k)?' checked':''} onchange="marcarEvalRequisito(${i},'${esc(k)}',this.checked)"><span>${esc(f.nombre.trim())}${f.peso?` · ${r2(f.peso)} %`:''}</span></label>`;}).join('');
}
function requisitosGrupoHTML(){
  if(pautaRequisitosDraft===null)return '';
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const programa=(r?.gates||[]).filter(g=>g.type==='group_min'&&g.origen!=='editor').length;
  const invalido=(i,t)=>pautaDraftErrorIndex===null&&pautaDraftErrorTarget===`req-${t}-${i}`?' aria-invalid="true" aria-describedby="m-pauta-error"':'';
  const campo=(i,clave,etiqueta,valor,oculto=false)=>`<label class="pauta-requisito-nota" id="m-req-${clave}-caja-${i}"${oculto?' hidden':''}><span>${etiqueta}</span><input type="text" inputmode="decimal" maxlength="5" id="m-req-${clave}-${i}" value="${esc(valor)}" oninput="actualizarRequisitoGrupo(${i},'${clave}',this.value)"${invalido(i,clave)}></label>`;
  const items=pautaRequisitosDraft.map((q,i)=>`<fieldset class="pauta-requisito">
      <legend>Requisito ${i+1}</legend>
      <label class="pauta-requisito-nombre"><span>Nombre</span><input type="text" id="m-req-nombre-${i}" value="${esc(q.nombre)}" placeholder="Ej: Parte práctica" maxlength="${NOMBRE_MAX}" oninput="actualizarRequisitoGrupo(${i},'nombre',this.value)"></label>
      <div class="pauta-requisito-evals" id="m-req-evals-${i}" role="group" aria-label="Evaluaciones que se promedian"${invalido(i,'evals')}>${evalsRequisitoHTML(i)}</div>
      ${campo(i,'min','Nota mínima del promedio',q.min)}
      <label class="pauta-requisito-efecto"><span>Si no llegas</span><select id="m-req-efecto-${i}" onchange="actualizarRequisitoGrupo(${i},'efecto',this.value)">
        <option value="tope"${q.efecto!=='reemplazar'?' selected':''}>La final queda topada</option>
        <option value="reemplazar"${q.efecto==='reemplazar'?' selected':''}>La final es este promedio</option>
      </select></label>
      ${campo(i,'tope','Tope de la nota final',q.tope,q.efecto==='reemplazar')}
      <button type="button" class="pauta-requisito-quitar" onclick="quitarRequisitoGrupo(${i})">Quitar requisito</button>
    </fieldset>`).join('');
  return `<details class="editor-reglas pauta-requisitos"${pautaRequisitosDraft.length?' open':''}>
    <summary>Requisitos que combinan evaluaciones</summary>
    <div class="editor-reglas-campos">
      <p>Para cuando el programa exige un mínimo sobre varias evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba.</p>
      ${programa?`<p>El programa ya indica ${programa===1?'un requisito':programa+' requisitos'} de este tipo; se mantiene${programa===1?'':'n'}.</p>`:''}
      ${items}
      <button type="button" class="pauta-agregar" onclick="agregarRequisitoGrupo()"><span aria-hidden="true">+</span> Agregar requisito</button>
    </div>
  </details>`;
}
function refrescarEvalsRequisitos(){
  if(pautaEximicionDraft?.activa&&!document.activeElement?.closest?.('#m-exi-detalle'))pintarEximicion();
  (pautaRequisitosDraft||[]).forEach((_,i)=>{const caja=document.getElementById('m-req-evals-'+i);if(caja)caja.innerHTML=evalsRequisitoHTML(i);});
}
function agregarRequisitoGrupo(){
  if(pautaRequisitosDraft===null)return;
  pautaRequisitosDraft.push(requisitoGrupoVacio());renderPautaManualModal();
  setTimeout(()=>{const i=document.getElementById('m-req-nombre-'+(pautaRequisitosDraft.length-1));if(i)i.focus();},0);
}
function quitarRequisitoGrupo(i){if(pautaRequisitosDraft?.[i]){pautaRequisitosDraft.splice(i,1);limpiarErrorPauta();renderPautaManualModal();}}
function actualizarRequisitoGrupo(i,clave,valor){
  const q=pautaRequisitosDraft?.[i];if(!q)return;
  limpiarErrorPauta();q[clave]=valor;
  if(clave==='efecto'){const caja=document.getElementById('m-req-tope-caja-'+i);if(caja)caja.hidden=valor==='reemplazar';}
}
function marcarEvalRequisito(i,clave,marcada){
  const q=pautaRequisitosDraft?.[i];if(!q)return;
  limpiarErrorPauta();
  q.claves=q.claves.filter(k=>k!==clave);if(marcada)q.claves.push(clave);
}
// ─── EXIMICIÓN PROPIA (solo app) ────────────────────────────────────────────
// Cuando el programa del catálogo no trae eximición, la persona la escribe:
// examen, presentación mínima (promedio ponderado de las evaluaciones que
// marque), mínimos por evaluación y asistencia. El adaptador la calcula por el
// mismo camino del catálogo (eximicionPropia). null = la sección no se mostró.
let pautaEximicionDraft=null;
function eximicionEditor(r){
  if(definicionPresetDelRamo(r)?.eximicion)return {programa:true};
  const p=r.eximicionPropia,ids=new Set((r.categorias||[]).map(c=>c.id));
  if(!p||!ids.has(p.examenId))return {activa:false,examen:'',segun:[],min:'5,0',minimos:[],asistencia:''};
  return {activa:true,examen:p.examenId,segun:(p.segun||[]).filter(id=>ids.has(id)),min:textoNotaEditor(p.min),
    minimos:(p.minimos||[]).filter(m=>ids.has(m.catId)).map(m=>({clave:m.catId,min:textoNotaEditor(m.min)})),
    asistencia:Number.isFinite(p.asistencia)?String(p.asistencia).replace('.',','):''};
}
function validarEximicionEditor(d,filas,escala){
  if(!d||d.programa)return {sinCambios:true};
  if(!d.activa)return {eximicion:null};
  const fila=k=>filas.find(f=>f.nombre.trim()&&claveFilaPauta(f)===k);
  const examen=fila(d.examen);
  if(!examen)return {campo:'examen',error:'Elige de qué evaluación te eximes.'};
  const segun=d.segun.filter(k=>k!==d.examen).map(fila).filter(Boolean);
  if(!segun.length)return {campo:'segun',error:'Marca las evaluaciones que forman tu nota de presentación.'};
  const nota=(texto,campo,que)=>{
    const v=String(texto||'').trim(),n=Number(v.replace(',','.'));
    return /^\d+(?:[.,]\d{1,2})?$/.test(v)&&n>=escala.min&&n<=escala.max?{n}:{campo,error:`Escribe ${que} entre ${escala.min} y ${escala.max}.`};
  };
  const min=nota(d.min,'min','una presentación mínima');if(min.error)return min;
  const minimos=[];
  for(let i=0;i<d.minimos.length;i++){
    const m=d.minimos[i],f=fila(m.clave);
    if(!f&&!String(m.min||'').trim())continue;
    if(!f||f===examen)return {campo:'minimo-eval-'+i,error:'Elige la evaluación de ese mínimo (no puede ser el examen).'};
    const v=nota(m.min,'minimo-'+i,'un mínimo');if(v.error)return v;
    minimos.push({fila:f,min:v.n});
  }
  const a=String(d.asistencia||'').trim(),asistencia=Number(a.replace(',','.').replace('%',''));
  if(a&&!(/^\d+(?:[.,]\d)?\s*%?$/.test(a)&&asistencia>0&&asistencia<=100))
    return {campo:'asistencia',error:'La asistencia mínima es un porcentaje entre 1 y 100, como 75.'};
  return {eximicion:{examen,segun,min:min.n,minimos,...(a?{asistencia}:{})}};
}
function guardarEximicionEditor(r,v,idDe){
  if(v.sinCambios)return;
  const nueva=v.eximicion&&{examenId:idDe(v.eximicion.examen),segun:v.eximicion.segun.map(idDe),min:v.eximicion.min,
    minimos:v.eximicion.minimos.map(m=>({catId:idDe(m.fila),min:m.min})),...(v.eximicion.asistencia?{asistencia:v.eximicion.asistencia}:{})};
  if(JSON.stringify(nueva||null)===JSON.stringify(r.eximicionPropia||null))return;
  // Una confirmación de la regla anterior no vale para la nueva.
  delete r.eximicionConfirmada;
  if(nueva)r.eximicionPropia=nueva;else delete r.eximicionPropia;
}
function opcionesEvalsHTML(elegida,excluir){
  return `<option value="">Elegir</option>`+pautaDraft.filter(f=>f.nombre.trim()).map(f=>{const k=claveFilaPauta(f);
    return k===excluir?'':`<option value="${esc(k)}"${k===elegida?' selected':''}>${esc(f.nombre.trim())}</option>`;}).join('');
}
function detalleEximicionHTML(){
  const d=pautaEximicionDraft;
  const invalido=t=>pautaDraftErrorIndex===null&&pautaDraftErrorTarget==='exi-'+t?' aria-invalid="true" aria-describedby="m-pauta-error"':'';
  const otras=pautaDraft.filter(f=>f.nombre.trim()&&claveFilaPauta(f)!==d.examen);
  const nota=(clave,etiqueta,valor,modo='decimal')=>`<label class="pauta-requisito-nota"><span>${etiqueta}</span><input type="text" inputmode="${modo}" maxlength="5" id="m-exi-${clave}" value="${esc(valor)}" oninput="actualizarEximicion('${clave}',this.value)"${invalido(clave)}></label>`;
  return `<label class="pauta-requisito-efecto"><span>Examen</span><select id="m-exi-examen" onchange="elegirExamenEximicion(this.value)"${invalido('examen')}>${opcionesEvalsHTML(d.examen,null)}</select></label>
    <p>Tu nota de presentación es el promedio ponderado de:</p>
    <div class="pauta-requisito-evals" id="m-exi-segun" role="group" aria-label="Evaluaciones de la nota de presentación"${invalido('segun')}>${otras.length?otras.map(f=>{const k=claveFilaPauta(f);
      return `<label class="pauta-requisito-eval"><input type="checkbox"${d.segun.includes(k)?' checked':''} onchange="marcarSegunEximicion('${esc(k)}',this.checked)"><span>${esc(f.nombre.trim())}${f.peso?` · ${r2(f.peso)} %`:''}</span></label>`;}).join(''):'<small>Primero escribe las evaluaciones.</small>'}</div>
    ${nota('min','Presentación mínima para eximirte',d.min)}
    ${d.minimos.map((m,i)=>`<div class="pauta-exi-minimo"><label class="pauta-requisito-efecto"><span>Mínimo en</span><select id="m-exi-minimo-eval-${i}" onchange="actualizarMinimoEximicion(${i},'clave',this.value)"${invalido('minimo-eval-'+i)}>${opcionesEvalsHTML(m.clave,d.examen)}</select></label>
      <label class="pauta-requisito-nota"><span>Nota mínima</span><input type="text" inputmode="decimal" maxlength="5" id="m-exi-minimo-${i}" value="${esc(m.min)}" oninput="actualizarMinimoEximicion(${i},'min',this.value)"${invalido('minimo-'+i)}></label>
      <button type="button" class="pauta-requisito-quitar" onclick="quitarMinimoEximicion(${i})">Quitar mínimo</button></div>`).join('')}
    <button type="button" class="pauta-agregar" onclick="agregarMinimoEximicion()"><span aria-hidden="true">+</span> Mínimo en una evaluación</button>
    ${nota('asistencia','Asistencia mínima (%), si la piden',d.asistencia)}
    <small>Si cumples, lo confirmas en la ficha del ramo. El examen deja de contar y tu nota final es el promedio de las demás evaluaciones. La presentación se aproxima a la décima.</small>`;
}
function eximicionEditorHTML(){
  const d=pautaEximicionDraft;if(!d)return '';
  return `<details class="editor-reglas pauta-requisitos pauta-eximicion"${d.activa?' open':''}>
    <summary>Eximición del examen</summary>
    <div class="editor-reglas-campos">${d.programa?'<p>El programa ya indica la eximición de este ramo.</p>':`
      <label class="pauta-requisito-eval pauta-eximicion-activa"><input type="checkbox" id="m-exi-activa"${d.activa?' checked':''} onchange="activarEximicion(this.checked)"><span>El programa permite eximirse del examen</span></label>
      <div id="m-exi-detalle"${d.activa?'':' hidden'}>${d.activa?detalleEximicionHTML():''}</div>`}
    </div>
  </details>`;
}
function pintarEximicion(){
  const caja=document.getElementById('m-exi-detalle');
  if(caja&&pautaEximicionDraft&&!pautaEximicionDraft.programa){caja.hidden=!pautaEximicionDraft.activa;caja.innerHTML=pautaEximicionDraft.activa?detalleEximicionHTML():'';}
}
function activarEximicion(si){
  const d=pautaEximicionDraft;if(!d||d.programa)return;
  limpiarErrorPauta();d.activa=!!si;
  // Sugerencia de partida: una evaluación que se llama examen, y todo lo demás
  // como presentación. La persona lo cambia antes de guardar.
  if(d.activa&&!d.examen){const ex=pautaDraft.find(f=>f.nombre.trim()&&/examen/i.test(f.nombre));if(ex)elegirExamenEximicion(claveFilaPauta(ex),true);}
  pintarEximicion();
}
function elegirExamenEximicion(clave,sinPintar){
  const d=pautaEximicionDraft;if(!d)return;
  limpiarErrorPauta();d.examen=clave;
  d.segun=d.segun.filter(k=>k!==clave);
  if(!d.segun.length)d.segun=pautaDraft.filter(f=>f.nombre.trim()).map(claveFilaPauta).filter(k=>k!==clave);
  d.minimos.forEach(m=>{if(m.clave===clave)m.clave='';});
  if(!sinPintar)pintarEximicion();
}
function marcarSegunEximicion(clave,si){const d=pautaEximicionDraft;if(!d)return;limpiarErrorPauta();d.segun=d.segun.filter(k=>k!==clave);if(si)d.segun.push(clave);}
function actualizarEximicion(campo,valor){const d=pautaEximicionDraft;if(!d)return;limpiarErrorPauta();d[campo]=valor;}
function actualizarMinimoEximicion(i,campo,valor){const m=pautaEximicionDraft?.minimos[i];if(!m)return;limpiarErrorPauta();m[campo]=valor;}
function agregarMinimoEximicion(){const d=pautaEximicionDraft;if(!d)return;d.minimos.push({clave:'',min:'4,0'});pintarEximicion();
  setTimeout(()=>{const s=document.getElementById('m-exi-minimo-eval-'+(d.minimos.length-1));if(s)s.focus();},0);}
function quitarMinimoEximicion(i){const d=pautaEximicionDraft;if(!d?.minimos[i])return;d.minimos.splice(i,1);limpiarErrorPauta();pintarEximicion();}
function openPautaManualModal(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  // Además de normalizar al cargar, el editor tolera un ramo legado incompleto.
  // Es el camino mayoritario: los ramos sin preset parten sin evaluaciones.
  if(!Array.isArray(r.categorias))r.categorias=[];
  pautaDraft=r.categorias.map(c=>({id:c.id,nombre:c.nombre,peso:Number(c.peso)||0,tieneNotas:(c.notas||[]).length>0,varias:(c.directNota===false&&!seVeComoNotaSola(r,c))||(Number.isInteger(c.slots)&&c.slots>1),cantidad:Number.isInteger(c.slots)&&c.slots>1?c.slots:null,reglas:reglasEvaluacionEditor(r,c)}));
  pautaDraftError='';pautaDraftErrorIndex=null;pautaDraftErrorTarget='';pautaQuitadas=[];pautaProgramaCanvasDraft=null;
  pautaRequisitosDraft=enAppNativa()?requisitosGrupoEditor(r):null;
  pautaEximicionDraft=enAppNativa()?eximicionEditor(r):null;
  // La lectura pertenece a esta apertura, nunca a otra cuenta o borrador.
  canvasProgramaRamo.delete(r.id);
  pautaArmando=!r.categorias.some(c=>String(c.nombre||'').trim());
  if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});
  renderPautaManualModal();openModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-nombre-0');if(i)i.focus();},100);
}
function pautaResumen(){
  const e=estadoPauta(pautaDraft);
  if(e.lista)return`✓ ${r2(e.total)} / 100% · ponderaciones listas`;
  return e.diferencia>0?`${r2(e.total)} / 100% · faltan ${r2(e.diferencia)}%`:`${r2(e.total)} / 100% · te pasas por ${r2(Math.abs(e.diferencia))}%`;
}
// Las plantillas solo ahorran escribir nombres. Jamás sugieren pesos: cada
// estudiante debe confirmarlos contra el programa de su propio curso.
function plantillaPauta(tipo){
  const estructuras={
    'tres-solemnes':['Solemne 1','Solemne 2','Solemne 3','Examen'],
    'tres-pruebas':['Prueba 1','Prueba 2','Prueba 3','Examen'],
    'dos-pruebas':['Prueba 1','Prueba 2','Examen'],
    // Cálculo I, Álgebra Lineal y Cálculo II comparten esta forma. El
    // laboratorio sigue siendo un grupo de tres notas: repetirlo como tres
    // evaluaciones inventaría cómo se reparte su peso.
    'tres-interrogaciones-lab':['Interrogación 1','Interrogación 2','Interrogación 3',{nombre:'Laboratorio',varias:true,cantidad:3},'Examen'],
    // Introducción a la Programación combina evaluaciones grandes, tareas y
    // participación. Es una estructura para partir, no una pauta del curso.
    'dos-interrogaciones-tareas-participacion':['Interrogación 1','Interrogación 2',{nombre:'Tareas',varias:true,cantidad:3},'Participación','Examen'],
  };
  return (estructuras[tipo]||[]).map(fila=>{
    const def=typeof fila==='string'?{nombre:fila}:fila;
    return {id:null,nombre:def.nombre,peso:0,tieneNotas:false,varias:false,cantidad:null,...def};
  });
}
// Derecho UC usa «Solemne» en sus programas y calendario de evaluaciones.
// La carrera guardada puede ser el código de malla o el nombre declarado.
function esDerechoUC(tenant,carrera){return tenant==='uc'&&(carrera==='UC-DERECHO'||carrera==='Derecho');}
// Solo alimenta el placeholder del campo: no arma ninguna estructura.
function ejemploEvaluacion(tenant,carrera){
  return esDerechoUC(tenant,carrera)||tenant==='fen'||tenant==='uai'?'Solemne':'Prueba';
}

// Plantillas de estructura, POR TENANT — y FEN no tiene.
//
// El plan común de Ingeniería UC sí tiene una forma estable: tres
// interrogaciones y un examen, y así están sus cuatro presets. Ahí la plantilla
// ahorra tipeo real.
//
// En FEN no existe esa forma. De los diez programas oficiales transcritos, cada
// uno mezcla distinto solemnes, controles de lectura, controles de ejercicios,
// controles sorpresa, trabajos grupales y participación — y ninguno es "3
// solemnes + examen". Ofrecer esa plantilla empujaba a la mayoría a una
// estructura que después tenían que deshacer a mano.
function plantillasPauta(tenant,carrera){
  // Las plantillas UC conocidas vienen de Ingeniería. No hay una estructura
  // común verificada para Derecho: se deja escribir la pauta de cada curso.
  if(esDerechoUC(tenant,carrera))return [];
  return tenant==='uc'
    ?[
      {tipo:'tres-pruebas',label:'3 pruebas + examen'},
      {tipo:'dos-pruebas',label:'2 pruebas + examen'},
      {tipo:'tres-interrogaciones-lab',label:'3 interrogaciones + laboratorio (3) + examen'},
      {tipo:'dos-interrogaciones-tareas-participacion',label:'2 interrogaciones + tareas (3) + participación + examen'},
    ]
    :[];
}
// Son atajos de escritura, no una pauta sugerida: el estudiante elige el
// nombre y siempre define sus propios pesos. Dentro de la UC, Derecho usa
// «Solemne» y el resto conserva las sugerencias de prueba/interrogación.
// Tres vocabularios, no dos. El tercero es el que faltaba: para una
// universidad que no conocemos NO se puede elegir entre el de la FEN y el de
// la UC — hay que no usar ninguno. Antes el default era el de FEN, así que a
// cualquier universidad nueva le habrían aparecido "Solemne 1, Solemne 2", que
// es la señal más rápida de que la app no es para ti.
//
// El neutro usa solo nombres que no pertenecen a una institución: nada de
// "Solemne" (FEN) ni de "Interrogación" (UC).
function sugerenciasEvaluacion(tenant,carrera){
  const comunes=['Laboratorio','Informe','Taller','Proyecto','Tarea','Presentación','Examen'];
  if(esDerechoUC(tenant,carrera))return ['Solemne','Control de lectura','Prueba','Control','Trabajo',...comunes];
  if(tenant==='uc')return ['Interrogación 1','Interrogación 2','Interrogación 3','Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3',...comunes];
  if(tenant==='fen')return ['Solemne 1','Solemne 2','Solemne 3','Control 1','Control 2','Control 3','Prueba sorpresa','Casos y ensayos','Trabajo individual','Trabajo en grupo','Participación',...comunes];
  // La UAI usa las dos palabras, y eso no es una suposición: sale de sus
  // programas. Management 2026-2 dice "tres pruebas solemnes"; Matemáticas
  // Avanzadas II dice "pruebas de cátedra" y "controles"; Razonamiento
  // Cuantitativo con Datos II dice "pruebas" y "laboratorios"; Civilización
  // Contemporánea II dice "evaluaciones de lectura" y "ensayo".
  //
  // Hasta ahora caía en la lista neutra de abajo y nunca le ofrecía "Solemne",
  // que es como se llaman sus evaluaciones más grandes. Lo que NO lleva es
  // "Interrogación": ninguno de sus programas la usa, esa es de la UC.
  if(tenant==='uai')return ['Solemne 1','Solemne 2','Solemne 3','Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3','Control de lectura','Trabajo grupal',...comunes];
  // La UAndes dice "prueba" y "examen" en todas sus normativas, y nunca
  // "solemne". Lo demás también sale de documentos suyos: "controles de
  // lectura" (Reglamento del Alumno, art. 20, y el catálogo de Teología III),
  // "certámenes" (normativa de Kinesiología), "ensayo" y "trabajo escrito"
  // (catálogo de Teología III). "Interrogaciones orales" aparece una sola vez,
  // como ejemplo en el reglamento, y "Interrogación" es la señal de la UC: no va.
  if(tenant==='uandes')return ['Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3','Control de lectura','Certamen','Ensayo','Trabajo escrito',...comunes];
  return ['Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3',...comunes];
}
function opcionesSugerenciasEvaluacion(tenant,carrera){
  return sugerenciasEvaluacion(tenant,carrera).map(nombre=>`<option value="${esc(nombre)}"></option>`).join('');
}
function puedeUsarPlantillaPauta(){
  return pautaDraft.every(fila=>!fila.tieneNotas&&!fila.nombre.trim());
}
function aplicarPlantillaPauta(tipo){
  pautaDraft=plantillaPauta(tipo);if(!pautaDraft.length)return;
  renderPautaManualModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-peso-0');if(i)i.focus();},0);
}
// Una pauta de otro ramo sirve de referencia, no de copia de datos: se llevan
// solo los nombres y porcentajes, nunca notas, fechas, IDs ni reglas.
function ramosParaDuplicarPauta(ramos,ramoActualId){
  return (ramos||[]).filter(r=>r.id!==ramoActualId&&(r.categorias||[]).some(c=>String(c.nombre||'').trim()))
    .map(r=>({id:r.id,nombre:r.nombre,cantidad:r.categorias.filter(c=>String(c.nombre||'').trim()).length}));
}
function pautaDuplicada(ramo){
  return ((ramo&&ramo.categorias)||[]).filter(c=>String(c.nombre||'').trim())
    .map(c=>({id:null,nombre:String(c.nombre).trim(),peso:Number(c.peso)||0,tieneNotas:false,varias:(c.directNota===false&&!seVeComoNotaSola(ramo,c))||(Number.isInteger(c.slots)&&c.slots>1),cantidad:Number.isInteger(c.slots)&&c.slots>1?c.slots:null}));
}
function textoConfirmarPautaDuplicada(origen,copia){
  const cantidad=copia.length;
  return `Vas a copiar ${cantidad} evaluaci${cantidad===1?'ón':'ones'} y sus porcentajes desde ${origen.nombre}. No se copian notas ni fechas. Podrás ajustarla antes de guardar.`;
}
function duplicarPautaDesdeRamo(){
  const selector=document.getElementById('m-pauta-origen')||{};
  const origenId=selector.value;
  // Si cancela la confirmación, el selector no se queda mostrando ese ramo.
  if(origenId)selector.value='';
  const origen=S.ramos.find(r=>r.id===origenId);const copia=pautaDuplicada(origen);
  if(!copia.length){showToast('Elige un ramo con evaluaciones',true);return;}
  showConfirm(`Usar las ponderaciones de ${origen.nombre}`,textoConfirmarPautaDuplicada(origen,copia),()=>{
    pautaDraft=copia;renderPautaManualModal();
    setTimeout(()=>{const i=document.getElementById('m-pauta-peso-0');if(i)i.focus();},0);
  },{label:'Usar ponderaciones'});
}
function renderPautaManualModal(){
  const fuentes=puedeUsarPlantillaPauta()?ramosParaDuplicarPauta(S.ramos,currentRamoId):[];
  const carrera=S.carrera||S.carreraNombre;
  const ejemplo=ejemploEvaluacion(S.tenant,carrera);
  const sugerencias=opcionesSugerenciasEvaluacion(S.tenant,carrera);
  const disponibles=plantillasPauta(S.tenant,carrera);
  const plantillas=(puedeUsarPlantillaPauta()&&disponibles.length)?`<div class="pauta-plantillas">
    <div class="pauta-plantillas-titulo">Parte con una estructura</div>
    <div class="pauta-plantillas-opciones">${disponibles.map(p=>`<button type="button" onclick="aplicarPlantillaPauta('${p.tipo}')">${p.label}</button>`).join('')}</div>
    <div class="pauta-plantillas-nota">Los pesos quedan en 0%. Confírmalos con el programa del curso.</div>
  </div>`:'';
  // Elegir un ramo ya pide confirmación (duplicarPautaDesdeRamo): sin botón aparte.
  const duplicar=fuentes.length?`<label class="pauta-copiar"><span>Copiar de otro ramo</span>
    <select id="m-pauta-origen" onchange="duplicarPautaDesdeRamo()"><option value="">Elegir</option>${fuentes.map(r=>`<option value="${esc(r.id)}">${esc(r.nombre)} · ${r.cantidad} evaluaci${r.cantidad===1?'ón':'ones'}</option>`).join('')}</select></label>`:'';
  // Una sola fila vacía no tiene nada que quitar ni marcar.
  const unaVacia=pautaDraft.length===1&&!pautaDraft[0].nombre.trim()&&!pautaDraft[0].peso;
  const manual=gh_descarteManual(S.ramos.find(r=>r.id===currentRamoId),S.tenant);
  const filas=pautaDraft.map((fila,i)=>{
    // El editor nunca decide un porcentaje. Solo calcula el resto y se lo
    // ofrece a la fila vacía, que la persona elige explícitamente.
    const resto=restoParaPautaFila(i);
    const invalido=t=>pautaDraftErrorIndex===i&&pautaDraftErrorTarget===t?' aria-invalid="true" aria-describedby="m-pauta-error"':'';
    const nombre=esc(fila.nombre||'evaluación');
    const usarResto=!fila.peso&&resto>0?`<button type="button" class="pauta-resto" onclick="usarRestoPauta(${i})">Usar ${r2(resto)}%</button>`:'';
    const cantidad=fila.varias?`<label class="pauta-cantidad">Varias notas · esperas <input type="text" inputmode="numeric" id="m-pauta-cantidad-${i}" value="${fila.cantidad||''}" placeholder="Ej: 4" maxlength="3"${invalido('cantidad')} oninput="actualizarPautaCantidad(${i},this.value)" aria-label="Cantidad esperada de notas para ${nombre}"/></label>`:'';
    const mas=unaVacia?'':`<button type="button" class="pauta-mas" id="m-pauta-quitar-${i}" onclick="abrirMenuPautaFila(this,${i})" aria-haspopup="menu" aria-expanded="false" aria-label="Opciones de ${nombre}"${invalido('quitar')}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg></button>`;
    return `
    <div class="pauta-fila">
      <div class="pauta-fila-main">
        <input type="text" class="pauta-nombre" id="m-pauta-nombre-${i}" value="${esc(fila.nombre)}" placeholder="Ej: ${ejemplo} ${i+1}" maxlength="${NOMBRE_MAX}" list="m-pauta-sugerencias" autocomplete="off" oninput="actualizarPautaNombre(${i},this.value)" onkeydown="pautaTecla(event,${i},'nombre')" aria-label="Nombre de la evaluación"${invalido('nombre')}/>
        <label class="pauta-peso"><input type="text" inputmode="decimal" id="m-pauta-peso-${i}" value="${fila.peso?r2(fila.peso):''}" placeholder="0" maxlength="6" oninput="actualizarPautaPeso(${i},this.value)" onkeydown="pautaTecla(event,${i},'peso')" aria-label="Peso de ${nombre}"${invalido('peso')}/><span aria-hidden="true">%</span></label>
        ${mas}
      </div>${cantidad||usarResto?`
      <div class="pauta-fila-extra">${cantidad}${usarResto}</div>`:''}
      ${reglasEvaluacionEditorHTML({reglas:fila.reglas,varias:fila.varias,manual,
        abierto:pautaDraftErrorIndex===i&&['descarte','min','tope','puntos','exigencia'].includes(pautaDraftErrorTarget),
        id:clave=>`m-pauta-${clave}-${i}`,oninput:clave=>`actualizarReglaPauta(${i},'${clave}',this.value)`,invalido})}
    </div>`;
  }).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${pautaArmando?'Armar mis ponderaciones':'Editar evaluaciones'}</div>
    <p class="pauta-intro">Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas.</p>
    ${typeof canvasProgramaEditorHTML==='function'?canvasProgramaEditorHTML():''}
    ${plantillas}
    ${duplicar}
    ${typeof canvasPesosEditorHTML==='function'?canvasPesosEditorHTML():''}
    <datalist id="m-pauta-sugerencias">${sugerencias}</datalist>
    <div class="pauta-total" id="m-pauta-total">${totalPautaHTML()}</div>
    <p id="m-pauta-error" role="alert"${pautaDraftError?'':' hidden'}>${esc(pautaDraftError)}</p>
    <div class="pauta-lista">${filas}
      <button type="button" class="pauta-agregar" onclick="agregarPautaFila()"><span aria-hidden="true">+</span> Agregar evaluación</button>
    </div>
    ${requisitosGrupoHTML()}
    ${eximicionEditorHTML()}
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="guardarPautaManual()">Guardar</button>
    </div>`;
}
// El total con su barra. La barra es neutra a propósito: el semáforo es de las
// notas, no de cuánto porcentaje lleva escrito la pauta.
function totalPautaHTML(){
  const e=estadoPauta(pautaDraft);
  const avance=Math.min(Math.max(e.total/100,0),1);
  return `<div class="pauta-total-texto${e.lista?' lista':''}" aria-live="polite">${pautaResumen()}</div><div class="pauta-total-barra" aria-hidden="true"><i style="transform:scaleX(${avance.toFixed(3)})"></i></div>`;
}
// "⋯" de cada evaluación: marcar que se promedian varias notas y quitarla.
function abrirMenuPautaFila(boton,i){
  const fila=pautaDraft[i];if(!fila)return;
  abrirMenu(boton,[
    {texto:'Varias notas',marcado:!!fila.varias,accion:()=>actualizarPautaVarias(i,!fila.varias)},
    'sep',
    {texto:'Quitar evaluación',peligro:true,accion:()=>quitarPautaFila(i)}
  ]);
}
function limpiarErrorPauta(){
  pautaDraftError='';pautaDraftErrorIndex=null;pautaDraftErrorTarget='';
  const error=document.getElementById('m-pauta-error');if(error){error.textContent='';error.hidden=true;}
}
function mostrarErrorPauta(i,mensaje,target){
  pautaDraftError=mensaje;pautaDraftErrorIndex=i;pautaDraftErrorTarget=target;
  renderPautaManualModal();
  const id=i===null&&/^(req|exi)-/.test(target)?'m-'+target:`m-pauta-${target}-${i}`;
  setTimeout(()=>{const control=document.getElementById(id);if(control)control.focus();},0);
}
function actualizarReglaPauta(i,clave,valor){
  limpiarErrorPauta();
  if(pautaDraft[i])(pautaDraft[i].reglas??={})[clave]=valor;
}
function actualizarPautaNombre(i,valor){limpiarErrorPauta();if(pautaDraft[i])pautaDraft[i].nombre=valor;refrescarEvalsRequisitos();}
function actualizarPautaVarias(i,valor){
  if(!pautaDraft[i])return;
  pautaDraft[i].varias=!!valor;
  if(!valor)pautaDraft[i].cantidad=null;
  renderPautaManualModal();
}
function actualizarPautaCantidad(i,valor){
  if(!pautaDraft[i])return;
  const limpio=String(valor||'').replace(/[^0-9]/g,'');
  const cantidad=Math.min(100,parseInt(limpio,10)||0);
  pautaDraft[i].cantidad=cantidad>=2?cantidad:null;
  const input=document.getElementById('m-pauta-cantidad-'+i);if(input&&input.value!==limpio)input.value=limpio;
}
function restoParaPautaFila(i){
  const usado=pautaDraft.reduce((s,f,j)=>s+(j===i?0:(Number(f.peso)||0)),0);
  return r2(Math.max(0,100-usado));
}
function usarRestoPauta(i){
  if(!pautaDraft[i])return false;
  const resto=restoParaPautaFila(i);if(resto<=0){mostrarErrorPauta(i,'No queda porcentaje libre para repartir en esta evaluación.','peso');return false;}
  limpiarErrorPauta();
  pautaDraft[i].peso=resto;
  renderPautaManualModal();
  setTimeout(()=>{const input=document.getElementById('m-pauta-peso-'+i);if(input)input.focus();},0);
}
function actualizarPautaPeso(i,valor){
  limpiarErrorPauta();
  if(!pautaDraft[i])return;
  const crudo=String(valor||'').replace(',','.').replace(/[^0-9.]/g,'');
  const partes=crudo.split('.');
  const limpio=partes[0]+(partes.length>1?'.'+partes.slice(1).join('').slice(0,2):'');
  const peso=Math.min(100,Number(limpio)||0);
  pautaDraft[i].peso=peso;
  const input=document.getElementById('m-pauta-peso-'+i);if(input&&input.value!==limpio)input.value=limpio;
  const total=document.getElementById('m-pauta-total');if(total)total.innerHTML=totalPautaHTML();
  refrescarEvalsRequisitos();
}
function agregarPautaFila(){
  pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});renderPautaManualModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-nombre-'+(pautaDraft.length-1));if(i)i.focus();},0);
}
function quitarPautaFila(i){
  if(!pautaDraft[i])return false;
  if(pautaDraft[i].tieneNotas)return quitarPautaFilaConNotas(i);
  const nombre=String(pautaDraft[i].nombre||'').trim();
  showConfirm(nombre?`¿Quitar "${nombre}"?`:'¿Quitar esta evaluación?',
    'Se quitará de tus ponderaciones. Puedes volver a agregarla antes de guardar.',()=>{
      limpiarErrorPauta();
      const totalAntes=pautaDraft.reduce((s,f)=>s+(Number(f.peso)||0),0);
      pautaDraft.splice(i,1);
      repartirPesoRestante(pautaDraft,totalAntes);
      if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});renderPautaManualModal();
    },{label:'Quitar evaluación',focusCancel:true});
  return true;
}
function pautaTecla(e,i,campo){
  if(e.key!=='Enter')return;e.preventDefault();
  if(campo==='nombre'){const p=document.getElementById('m-pauta-peso-'+i);if(p)p.focus();return;}
  const siguiente=document.getElementById('m-pauta-nombre-'+(i+1));
  if(siguiente)siguiente.focus();else agregarPautaFila();
}
function informarAportePauta(){
  if(S.avisoAportePautaVisto===true||S.aportarPautasAutomaticamente===false||esCuentaProfesor())return;
  // Se recuerda al mostrar, también si se cierra con Escape o fuera de la hoja.
  S.avisoAportePautaVisto=true;save();
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Tus ponderaciones ayudan a tus compañeros</div>
    <p class="settings-help">Tus programas se suman en forma anónima para ayudar a tus compañeros. Nunca se comparten tus notas. Puedes desactivarlo en Ajustes.</p>
    <div class="modal-btns"><button type="button" class="btn-confirm" onclick="closeModal()">Entendido</button></div>`;
  openModal();
}
// Un grupo de casillas vacío se dibuja cerrado (render-main.js), y eso está
// bien para una pauta del catálogo con muchos grupos. Pero quien acaba de
// marcar "varias" en su propia pauta esperaba ver dónde poner las notas: tres
// reportes (2026-08-29/30) decían que las evaluaciones "desaparecían" al
// marcarlo y "volvían" al desmarcarlo. Se abre solo el grupo que se armó recién.
function abrirGrupoVacio(cat){
  if(cat&&Number.isInteger(cat.slots)&&cat.slots>1&&!(cat.notas||[]).length)openCats[cat.id]=true;
}
// Quitar una evaluación que ya tiene notas. Si hay otra con el mismo nombre (una
// evaluación repetida), sus notas pasan a esa y no se pierde nada. Si no, se
// borran con ella, y por eso se pide confirmar como una acción destructiva.
function quitarPautaFilaConNotas(i){
  const r=S.ramos.find(x=>x.id===currentRamoId);const fila=pautaDraft[i];
  const cat=r&&(r.categorias||[]).find(c=>c.id===fila.id);if(!cat)return false;
  const nombre=String(fila.nombre||cat.nombre||'').trim();
  const gemela=pautaDraft.find((f,j)=>j!==i&&f.id&&normName(f.nombre)===normName(nombre));
  const n=(cat.notas||[]).filter(x=>typeof x.valor==='number').length;
  const desc=gemela
    ?`Hay otra evaluación llamada "${nombre}": sus notas quedan en esa y no se pierde ninguna.`
    :`Se ${n===1?'borra su nota':`borran sus ${n} notas`} al guardar. No se puede deshacer.`;
  showConfirm(`¿Quitar "${nombre}"?`,desc,()=>{
    limpiarErrorPauta();
    pautaQuitadas.push({id:fila.id,hacia:gemela?gemela.id:null});
    const totalAntes=pautaDraft.reduce((s,f)=>s+(Number(f.peso)||0),0);
    pautaDraft.splice(i,1);
    // Una repetida no deja porcentaje que repartir: la otra ya lo tiene.
    if(!gemela)repartirPesoRestante(pautaDraft,totalAntes);
    if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});
    renderPautaManualModal();
  },{label:gemela?'Quitar repetida':'Quitar y borrar notas',danger:!gemela,focusCancel:true});
  return true;
}
// Lo que una evaluación deja al quitarse: sus notas y sus reglas (un mínimo, un
// grupo) pasan a la gemela; sin gemela se van.
function soltarCategoria(r,cat,destino){
  if(destino){
    const ya=new Set((destino.notas||[]).map(x=>x.id));
    destino.notas=[...(destino.notas||[]),...(cat.notas||[]).filter(x=>!ya.has(x.id))];
  }
  r.gates=destino?unificarCategoriaEnReglas(r.gates,cat.id,destino.id)
    :(r.gates||[]).filter(g=>g.catId!==cat.id).map(g=>Array.isArray(g.catIds)?{...g,catIds:g.catIds.filter(id=>id!==cat.id)}:g);
}
function guardarPautaManual(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const filas=pautaDraft.filter(f=>f.nombre.trim());
  const escala=gh_reglasNota(r.origen?.tenant||S.tenant).grade_scale;
  const reglas=new Map();
  for(const fila of pautaDraft){
    if(!fila.nombre.trim()){
      if(['descarte','min','tope','puntos'].some(campo=>fila.reglas?.[campo]?.trim()))
        return mostrarErrorPauta(pautaDraft.indexOf(fila),'Escribe el nombre de la evaluación que lleva la regla.','nombre');
      continue;
    }
    const anterior=r.categorias.find(c=>c.id===fila.id);
    if(anterior&&fila.cantidad&&fila.cantidad<anterior.slots&&(anterior.notas||[]).some(n=>Number.isInteger(n.slot)&&n.slot>=fila.cantidad))
      return mostrarErrorPauta(pautaDraft.indexOf(fila),'Hay notas guardadas en las casillas que quieres quitar.','cantidad');
    // Varias notas sin cantidad era la lista abierta, que ya no se crea (ver
    // seVeComoNotaSola). La que ya existe con varias notas, o la del programa,
    // puede seguir sin ella.
    if(fila.varias&&!fila.cantidad&&!(anterior&&listaAbiertaPermitida(r,anterior)))
      return mostrarErrorPauta(pautaDraft.indexOf(fila),'Escribe cuántas notas son (2 o más). Si después son más, las agregas con «+ Agregar nota».','cantidad');
    const varias=fila.varias||(anterior?.notas||[]).length>1;
    const cambios=validarReglasEvaluacionEditor(fila.reglas||{},varias,fila.cantidad,escala);
    if(cambios.error)return mostrarErrorPauta(pautaDraft.indexOf(fila),cambios.error,cambios.campo);
    if(fila.reglas?.descartePrograma&&fila.cantidad&&fila.cantidad<=anterior.dropLowest.count&&fila.cantidad!==anterior.slots)
      return mostrarErrorPauta(pautaDraft.indexOf(fila),'La cantidad de notas tiene que superar el descarte del programa.','cantidad');
    reglas.set(fila,cambios);
  }
  const requisitos=pautaRequisitosDraft===null?null:validarRequisitosGrupo(pautaRequisitosDraft,filas,escala);
  const eximicion=validarEximicionEditor(pautaEximicionDraft,filas,escala);
  if(eximicion.error){
    if(pautaEximicionDraft)pautaEximicionDraft.activa=true;
    return mostrarErrorPauta(null,eximicion.error,'exi-'+eximicion.campo);
  }
  if(requisitos?.error){
    const id=requisitos.campo==='evals'?`m-req-nombre-${requisitos.i}`:null;
    mostrarErrorPauta(null,requisitos.error,`req-${requisitos.campo}-${requisitos.i}`);
    if(id)setTimeout(()=>{const c=document.getElementById(id);if(c)c.focus();},0);
    return;
  }
  const ids=new Set(filas.filter(f=>f.id).map(f=>f.id));
  // Las que la persona quitó con notas: pasan a su gemela o se van.
  const quitadas=new Set();
  pautaQuitadas.forEach(q=>{
    const cat=r.categorias.find(c=>c.id===q.id);if(!cat||ids.has(q.id))return;
    soltarCategoria(r,cat,q.hacia&&r.categorias.find(c=>c.id===q.hacia));
    quitadas.add(q.id);
  });
  pautaQuitadas=[];
  r.categorias=r.categorias.filter(c=>!quitadas.has(c.id)&&(ids.has(c.id)||(c.notas||[]).length>0));
  filas.forEach(f=>{
    const existente=f.id&&r.categorias.find(c=>c.id===f.id);
    const cantidadFija=f.varias&&Number.isInteger(f.cantidad)&&f.cantidad>1;
    // Pasar a fila simple una que ya tiene dos o más notas escondería todas
    // menos la primera, así que ahí se respeta lo que hay. Es la misma regla
    // que aplica normalize() al abrir la app.
    if(existente){
      guardarReglasEvaluacionEditor(r,existente,reglas.get(f));
      existente.nombre=f.nombre.trim();existente.peso=f.peso;
      f.catIdGuardado=existente.id;
      if(f.varias){
        // Cantidad declarada = casillas que la ficha puede mostrar y recorrer.
        // Las notas que ya tenía pasan a las primeras casillas, como en «Editar
        // evaluación»; sin eso quedaban fuera de la vista. Sin cantidad solo
        // llega una lista abierta que puede seguir así (guardarPautaManual).
        if(cantidadFija)fijarCantidadVarias(r,existente,f.cantidad);
        else{existente.directNota=false;delete existente.slots;}
      }
      else if((existente.notas||[]).length<=1){existente.directNota=true;delete existente.slots;}
    }
    else{
      const cat={id:uid(),nombre:f.nombre.trim(),peso:f.peso,ponderaNotas:false,directNota:!f.varias||cantidadFija,notas:[]};
      if(cantidadFija)cat.slots=f.cantidad;
      r.categorias.push(cat);
      guardarReglasEvaluacionEditor(r,cat,reglas.get(f));
      f.catIdGuardado=cat.id;
      abrirGrupoVacio(cat);
    }
  });
  if(requisitos)guardarRequisitosGrupo(r,requisitos.requisitos,f=>f.catIdGuardado);
  guardarEximicionEditor(r,eximicion,f=>f.catIdGuardado);
  pautaRequisitosDraft=null;pautaEximicionDraft=null;
  const vigentes=new Set(r.categorias.map(c=>c.id));
  if(Array.isArray(r.gates))r.gates=reglasEditorVigentes(r.gates,vigentes);
  if(enAppNativa()&&pautaProgramaCanvasDraft?.ramoId===r.id){
    r.programaCanvas=crearProgramaCanvas(pautaProgramaCanvasDraft.archivo,pautaProgramaCanvasDraft.citas,r);
    pautaProgramaCanvasDraft=null;
  }
  const estado=estadoPauta(r.categorias);save();track('configurar_pauta',{evaluaciones:filas.length,total:estado.total});closeModal();renderRamo();
  showToast(estado.lista?'✓ Listo, ya suma 100%':'Guardado · puedes completar el resto después');
  // Aviso informativo de una sola vez por cuenta, sin pedir una decisión ni
  // interrumpir cada edición. También informa si todavía faltan porcentajes:
  // el aporte esperará a que la pauta cumpla sus filtros de siempre.
  if(filas.length){
    const estadoAviso=S;
    setTimeout(()=>{if(S===estadoAviso)informarAportePauta();},160);
  }
}
function abrirPautaDesdeNota(){closeModal();setTimeout(openPautaManualModal,120);}
