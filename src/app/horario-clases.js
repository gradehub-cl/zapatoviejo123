// Clases recurrentes del semestre. No son evaluaciones ni eventos de Canvas.
const ZONA_HORARIO='America/Santiago';
const FORMATO_HORARIO_CHILE=new Intl.DateTimeFormat('en-CA',{timeZone:ZONA_HORARIO,
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const horaHorarioValida=h=>typeof h==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(h);
function bloqueHorarioValido(b){
  return !!b&&typeof b==='object'&&Array.isArray(b.dias)&&b.dias.length>0&&
    b.dias.every(d=>DIAS_HORARIO.some(([k])=>k===d))&&horaHorarioValida(b.inicio)&&horaHorarioValida(b.fin)&&b.fin>b.inicio&&
    (b.sala===undefined||typeof b.sala==='string')&&(b.tipo===undefined||typeof b.tipo==='string');
}
function copiarHorario(horario){
  if(!Array.isArray(horario))return [];
  const usados=new Set();
  return horario.filter(bloqueHorarioValido).map((b,i)=>{
    const dias=DIAS_HORARIO.map(([k])=>k).filter(k=>b.dias.includes(k));
    const sala=(b.sala||'').trim().slice(0,100),tipo=(b.tipo||'').trim().slice(0,NOMBRE_MAX);
    // IDs para la fusión existente por elemento. Un respaldo sin id recibe uno
    // determinista: dos dispositivos no inventan dos clases de la misma fila.
    let hash=2166136261;
    for(const c of JSON.stringify([dias,b.inicio,b.fin,sala,tipo]))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
    let id=typeof b.id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(b.id)?b.id:'horario-'+hash.toString(36);
    if(usados.has(id))id='horario-'+hash.toString(36)+'-'+i;
    usados.add(id);return {id,dias,inicio:b.inicio,fin:b.fin,sala,tipo};
  });
}
// Traduce SOLO los módulos con fuente. Cada módulo sigue siendo un bloque:
// no se inventa una clase durante el descanso entre dos módulos.
function horarioDesdeModulos(tenant,dias,modulos,{sala='',tipo=''}={}){
  const tabla=MODULOS_HORARIO_POR_TENANT[tenant];
  if(!tabla||!Array.isArray(modulos)||!modulos.length||modulos.some(m=>!tabla[m]))return [];
  return copiarHorario([...new Set(modulos)].map(m=>({dias,inicio:tabla[m][0],fin:tabla[m][1],sala,tipo})));
}
// Punto de entrada futuro para catalogo_uc_secciones. Null = sin propuesta.
// No consulta una tabla inexistente, ni escribe. Quien lo implemente debe
// devolver bloques para REVISIÓN: nunca aplicar sin confirmación.
function proponerHorarioDesdeCatalogo({tenant,sigla,seccion}={}){return null;}
function partesHorarioChile(instante){
  return Object.fromEntries(FORMATO_HORARIO_CHILE.formatToParts(new Date(instante)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function fechaHorarioChile(instante){
  const p=partesHorarioChile(instante);return p.year+'-'+p.month+'-'+p.day;
}
function instanteHorarioChile(fecha,hora){
  const [a,m,d]=fecha.split('-').map(Number),[h,min]=hora.split(':').map(Number);
  const civil=Date.UTC(a,m-1,d,h,min);let instante=civil;
  for(let i=0;i<4;i++){
    const p=partesHorarioChile(instante),leido=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    if(leido===civil)return new Date(instante).toISOString();
    instante+=civil-leido;
  }
  // La hora inexistente del salto de verano no se mueve a otra clase.
  return null;
}
// Función única para Inicio y el payload nativo. Sin S, notas, red ni guardados.
function resumenHorarioClases(ramos,ahora=new Date()){
  const ms=new Date(ahora).getTime(),fechaHoy=fechaHorarioChile(ms),clases=[];
  const [a,m,d]=fechaHoy.split('-').map(Number);
  for(let offset=0;offset<=7;offset++){
    const civil=new Date(Date.UTC(a,m-1,d+offset,12)),fecha=civil.toISOString().slice(0,10);
    const dia=['D','L','M','W','J','V','S'][civil.getUTCDay()];
    for(const r of ramos||[])for(const b of copiarHorario(r.horario)){
      if(!b.dias.includes(dia))continue;
      const inicioAt=instanteHorarioChile(fecha,b.inicio),finAt=instanteHorarioChile(fecha,b.fin);
      if(!inicioAt||!finAt)continue;
      clases.push({id:String(r.id)+':'+b.id+':'+fecha,ramoId:r.id,ramo:r.nombre,
        sigla:(typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla)||null,
        fecha,inicio:b.inicio,fin:b.fin,inicioAt,finAt,sala:b.sala||null,tipo:b.tipo||null,
        enlace:'cl.gradehub.app://ramo/'+encodeURIComponent(r.id)});
    }
  }
  clases.sort((x,y)=>x.inicioAt.localeCompare(y.inicioAt)||x.finAt.localeCompare(y.finAt)||String(x.ramoId).localeCompare(String(y.ramoId))||x.id.localeCompare(y.id));
  const clasesHoy=clases.filter(c=>c.fecha===fechaHoy);
  const clasesProximas=clases.filter(c=>Date.parse(c.finAt)>ms);
  const enCurso=clasesProximas.find(c=>Date.parse(c.inicioAt)<=ms);
  return {zonaHoraria:ZONA_HORARIO,fechaHoy,clasesHoy,proximaClase:enCurso||clasesProximas[0]||null,clasesProximas};
}
const diasBloqueHorario=b=>DIAS_HORARIO.filter(([k])=>b.dias.includes(k)).map(([,nombre])=>nombre.slice(0,3).toLowerCase()).join(', ');
function pintarHorarioRamo(r){
  const lista=document.getElementById('cat-list');if(!lista||typeof lista.insertAdjacentElement!=='function')return;
  let caja=document.getElementById('ramo-horario');
  if(!caja){caja=document.createElement('section');caja.id='ramo-horario';caja.className='horario-ficha';lista.insertAdjacentElement('afterend',caja);}
  const bloques=copiarHorario(r.horario);
  caja.innerHTML=`<header><h2>Horario</h2><button type="button" class="horario-accion" data-editar-horario>${bloques.length?'Editar':'Agregar bloque'}</button></header>
    ${bloques.length?`<ul>${bloques.map(b=>`<li><span>${esc(diasBloqueHorario(b))}</span><b>${esc(b.inicio)}–${esc(b.fin)}</b><span>${esc([b.tipo,b.sala].filter(Boolean).join(' · ')||'Sin sala')}</span></li>`).join('')}</ul>`:'<p>Agrega los días y las horas de tus clases.</p>'}`;
  caja.querySelector('[data-editar-horario]').addEventListener('click',()=>abrirHorarioRamo(r.id));
}
function abrirHorarioRamo(ramoId){
  const ramo=S.ramos.find(r=>r.id===ramoId);if(!ramo||esCuentaProfesor())return;
  const inicial=JSON.stringify(ramo.horario),tenant=S.tenant,cuenta=typeof currentUser==='undefined'?null:currentUser?.id;
  let bloques=copiarHorario(ramo.horario);
  const nuevo=()=>({id:uid(),dias:[],inicio:'',fin:'',sala:'',tipo:''});
  if(!bloques.length)bloques.push(nuevo());
  const caja=document.getElementById('modal-content');
  const leer=()=>{bloques=[...caja.querySelectorAll('[data-horario-bloque]')].map(row=>({id:row.dataset.horarioBloque,
    dias:[...row.querySelectorAll('[name=dia]:checked')].map(n=>n.value),
    ...Object.fromEntries(['inicio','fin','sala','tipo'].map(k=>[k,row.querySelector('[name='+k+']').value]))}));};
  const pintar=()=>{
    caja.innerHTML=`<form class="horario-editor"><h2 class="modal-title">Horario de ${esc(ramo.nombre)}</h2>
      <p class="modal-desc">Se repite cada semana. Horas de Chile.</p><div class="horario-bloques">${bloques.map((b,i)=>`
      <fieldset data-horario-bloque="${esc(b.id)}"><legend>Bloque ${i+1}</legend>
        <div class="horario-dias" role="group" aria-label="Días del bloque ${i+1}">${DIAS_HORARIO.map(([k,n])=>`<label><input type="checkbox" name="dia" value="${k}"${b.dias.includes(k)?' checked':''}><span aria-hidden="true">${esc(n.slice(0,3))}</span><span class="horario-sr">${esc(n)}</span></label>`).join('')}</div>
        <div class="horario-campos"><label>Inicio<input type="time" name="inicio" step="60" required value="${esc(b.inicio)}"></label><label>Fin<input type="time" name="fin" step="60" required value="${esc(b.fin)}"></label>
        <label>Sala <small>(opcional)</small><input type="text" name="sala" maxlength="100" value="${esc(b.sala)}" placeholder="Ej.: K201"></label>
        <label>Tipo <small>(opcional)</small><input type="text" name="tipo" maxlength="${NOMBRE_MAX}" value="${esc(b.tipo)}" placeholder="CLAS, AYUD, LAB…"></label></div>
        <div class="horario-bloque-acciones"><button type="button" data-copiar="${i}" class="horario-accion">Copiar bloque</button><button type="button" data-quitar="${i}" class="horario-accion">Quitar</button></div>
      </fieldset>`).join('')}</div>
      <button type="button" class="horario-accion" data-agregar-bloque>+ Agregar bloque</button>
      <p class="horario-error" role="alert" tabindex="-1"></p><div class="modal-btns"><button type="button" class="btn-cancel" data-cancelar-horario>Cancelar</button><button type="submit" class="btn-confirm">Guardar horario</button></div></form>`;
    caja.querySelector('[data-cancelar-horario]').addEventListener('click',closeModal);
    const enfocarUltimo=()=>caja.querySelectorAll('[data-horario-bloque]')[bloques.length-1]?.querySelector('input')?.focus();
    caja.querySelector('[data-agregar-bloque]').addEventListener('click',()=>{leer();bloques.push(nuevo());pintar();enfocarUltimo();});
    caja.querySelectorAll('[data-copiar]').forEach(b=>b.addEventListener('click',()=>{leer();bloques.push({...bloques[+b.dataset.copiar],id:uid(),dias:[...bloques[+b.dataset.copiar].dias]});pintar();enfocarUltimo();}));
    caja.querySelectorAll('[data-quitar]').forEach(b=>b.addEventListener('click',()=>{leer();bloques.splice(+b.dataset.quitar,1);pintar();caja.querySelector('[data-agregar-bloque]').focus();}));
    caja.querySelector('form').addEventListener('submit',e=>{
      e.preventDefault();leer();const error=caja.querySelector('.horario-error');
      const indice=bloques.findIndex(b=>!bloqueHorarioValido(b));
      if(indice!==-1){error.textContent=`Revisa el bloque ${indice+1}: elige al menos un día y una hora de fin posterior al inicio.`;error.focus();return;}
      const actual=S.ramos.find(r=>r.id===ramoId);
      if(!actual||tenant!==S.tenant||cuenta!==(typeof currentUser==='undefined'?null:currentUser?.id)||JSON.stringify(actual.horario)!==inicial){error.textContent='El ramo o su horario cambió. Cierra y vuelve a abrir para revisarlo.';error.focus();return;}
      actual.horario=copiarHorario(bloques);save();closeModal();renderRamo();renderHome();showToast('Horario guardado');
    });
  };
  pintar();openModal();
}
