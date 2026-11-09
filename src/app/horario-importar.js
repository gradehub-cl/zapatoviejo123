
let _horarioUCReconocido=null,_horarioSeccionesUC=[],_horarioTextoPegado='';
function abrirImportarHorarioBuscacursos(conservarTexto=false){
  if(S.tenant!=='uc')return;
  if(!conservarTexto)_horarioTextoPegado='';
  _horarioUCReconocido=null;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Subir foto de tu horario</div>
    <p class="modal-desc">Sube un pantallazo de tu horario de Mi UC o BuscaCursos. Lo leemos en tu teléfono: <b>la imagen no sale de tu dispositivo</b>. Después revisas los ramos antes de agregarlos.</p>
    <label class="btn-confirm horario-foto-btn" for="m-horario-foto">Elegir foto del horario</label>
    <input type="file" id="m-horario-foto" class="horario-foto-input" accept="image/*" onchange="leerFotoHorario(this)" aria-describedby="m-horario-estado"/>
    <p id="m-horario-estado" class="horario-importar-estado" role="status" aria-live="polite">Solo se reconocerán siglas verificadas en el catálogo UC.</p>
    <details class="horario-texto-alt"${conservarTexto&&_horarioTextoPegado?' open':''}>
      <summary>¿Tienes el horario como texto? Pégalo</summary>
      <textarea id="m-horario-texto" class="horario-importar-texto" rows="5" maxlength="20000" placeholder="Ej.: MAT1610-1, IIC2333-2" aria-label="Tu horario como texto"></textarea>
      <button type="button" class="btn-cancel" id="m-horario-reconocer" onclick="reconocerHorarioBuscacursos()">Revisar texto</button>
    </details>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
    </div>`;
  openModal();
  const entrada=document.getElementById('m-horario-texto');
  entrada.value=_horarioTextoPegado;
}
// `lecturasFoto` (las lecturas de una foto) llega de leerFotoHorario; sin él,
// se lee lo pegado.
async function reconocerHorarioBuscacursos(lecturasFoto){
  if(S.tenant!=='uc')return false;
  const deFoto=Array.isArray(lecturasFoto)||typeof lecturasFoto==='string';
  const estado=document.getElementById('m-horario-estado');
  const entrada=document.getElementById('m-horario-texto');
  if(!estado||(!deFoto&&!entrada))return false;
  const boton=document.getElementById('m-horario-reconocer');
  if(!deFoto&&(!boton||boton.disabled))return false;
  if(!deFoto)_horarioTextoPegado=entrada.value;
  let codigos=deFoto?codigosDeFotoHorario(lecturasFoto):extraerCodigosHorarioBuscacursos(entrada.value);
  _horarioUCReconocido=null;_horarioSeccionesUC=[];
  if(!codigos.length){
    estado.textContent=deFoto
      ?'No encontramos siglas en la foto. Prueba con un pantallazo más nítido, donde se lean códigos como MAT1610-1.'
      :'No encontramos siglas con sección, como MAT1610-1. Revisa lo que pegaste.';
    if(!deFoto)entrada.focus();
    return false;
  }
  if(boton)boton.disabled=true;
  estado.textContent='Cargando el catálogo UC para comprobar las siglas…';
  let cargado=false;
  try{cargado=await cargarCursosUC();}catch(e){}
  // El estudiante puede cerrar el modal mientras llegan los ~660 KB. En ese
  // caso la respuesta tardía no abre una propuesta ni modifica el semestre.
  if(document.getElementById('m-horario-estado')!==estado)return false;
  if(boton)boton.disabled=false;
  const filas=cursosUcExtra();
  if(!cargado||!filas){estado.textContent='No pudimos cargar el catálogo UC. Revisa tu conexión e intenta de nuevo; tu horario sigue aquí.';return false;}

  const porSigla=new Map(filas.filter(f=>Array.isArray(f)&&typeof f[0]==='string').map(f=>[f[0].toUpperCase(),f]));
  // Algunas siglas reales viven solo como pauta en PRESETS_UC y no en
  // cursos-uc.js (TTF012, "Revelación y Fe"): sin esto, el horario las
  // descartaba como si no existieran.
  if(typeof PRESETS_UC==='object'&&PRESETS_UC)Object.entries(PRESETS_UC).forEach(([nombre,preset])=>{
    const sigla=preset&&typeof preset.sigla==='string'?preset.sigla.toUpperCase():'';
    if(sigla&&!porSigla.has(sigla))porSigla.set(sigla,[sigla,nombre,null]);
  });
  // Con el catálogo a mano, la foto se vuelve a leer probando L↔I en las siglas.
  if(deFoto)codigos=codigosDeFotoHorario(lecturasFoto,x=>porSigla.has(x));
  const secciones=new Map();
  codigos.forEach(({sigla,seccion})=>{
    if(!secciones.has(sigla))secciones.set(sigla,new Set());
    secciones.get(sigla).add(seccion);
  });
  const ambiguas=[...secciones].filter(([,s])=>s.size>1).map(([sigla])=>sigla);
  // "IC2233" junto a IIC2233 es la misma sigla leída cortada, no un ramo que
  // falte: avisarla solo haría dudar de un resultado que está bien.
  const conocidas=[...secciones.keys()].filter(sigla=>porSigla.has(sigla));
  const desconocidas=[...secciones.keys()].filter(sigla=>!porSigla.has(sigla)&&!conocidas.some(k=>k!==sigla&&k.endsWith(sigla)));
  // El catálogo combinado decide qué nombre corresponde al preset cuando la
  // malla y el archivo completo llaman distinto al mismo ramo.
  const catalogoPorSigla=new Map(indiceBusquedaCatalogo('uc',S.carrera).todos
    .filter(r=>r.sigla).map(r=>[r.sigla.toUpperCase(),r]));
  _horarioUCReconocido=[...secciones].filter(([sigla,s])=>s.size===1&&porSigla.has(sigla))
    .map(([sigla,s])=>{
      const oficial=porSigla.get(sigla),catalogo=catalogoPorSigla.get(sigla);
      return {sigla,seccion:[...s][0],nombre:(catalogo&&catalogo.nombre)||oficial[1]};
    }).filter(r=>!ramoPropuestoYaEsta(r));

  const yaTienes=[...secciones].filter(([sigla,s])=>s.size===1&&porSigla.has(sigla)
    &&ramoPropuestoYaEsta({sigla,nombre:(catalogoPorSigla.get(sigla)||{}).nombre||porSigla.get(sigla)[1]})).length;
  // Los que ya tienes pueden recibir la sección leída. Solo se ofrece si se
  // leyó una sección y es distinta de la guardada; si ya tenían otra, va
  // DESMARCADO: cambiarla es una decisión, no un relleno (Lucas, 2026-09-28).
  // Aplicarlo escribe solo `seccion`: notas, pauta y créditos no se tocan.
  _horarioSeccionesUC=[...secciones].filter(([sigla,s])=>s.size===1&&[...s][0]!=null&&porSigla.has(sigla))
    .map(([sigla,s])=>{const ramo=ramoConSigla(sigla);return ramo&&ramo.seccion!==[...s][0]
      ?{id:ramo.id,nombre:ramo.nombre,sigla,antes:ramo.seccion??null,seccion:[...s][0]}:null;})
    .filter(Boolean);
  const avisos=[];
  // De una foto, lo que no calza con el catálogo suele ser ruido del lector
  // ("TTF0012"): nombrarlo solo confunde. Se dice qué hacer si falta algo.
  if(desconocidas.length&&!deFoto)avisos.push(`No reconocimos: ${desconocidas.map(esc).join(', ')}.`);
  if(ambiguas.length)avisos.push(`Aparecen varias secciones para ${ambiguas.map(esc).join(', ')}; agrégalo a mano para elegir la correcta.`);
  if(yaTienes)avisos.push(`${yaTienes} ${yaTienes===1?'ramo ya está':'ramos ya están'} en tu semestre.`);
  if(deFoto&&_horarioUCReconocido.some(r=>r.seccion==null))avisos.push('Si no leímos la sección de un ramo, puedes ponerla después en Editar ramo.');
  if(deFoto)avisos.push('¿Falta alguno? Agrégalo a mano o prueba con otra foto.');
  const lista=_horarioUCReconocido.map((r,i)=>`<label class="agent-ramo-row">
    <input type="checkbox" class="agent-ramo-check horario-ramo-check" data-i="${i}" checked/>
    <span><b>${esc(r.nombre)}</b><small>${esc(r.sigla)}${r.seccion!=null?` · Sección ${r.seccion}`:''}</small></span>
  </label>`).join('');
  const listaSecciones=_horarioSeccionesUC.map((r,i)=>`<label class="agent-ramo-row">
    <input type="checkbox" class="agent-ramo-check horario-seccion-check" data-i="${i}"${r.antes==null?' checked':''}/>
    <span><b>${esc(r.nombre)}</b><small>${esc(r.sigla)} · ${r.antes==null?`Sección ${r.seccion}`:`Sección ${r.antes} → ${r.seccion}`}</small></span>
  </label>`).join('');
  const textoBoton=lista&&listaSecciones?'Aplicar lo marcado':lista?'Agregar los marcados':'Poner las secciones';
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Ramos reconocidos</div>
    <p class="modal-desc">Revisa lo que encontramos en el catálogo UC. <b>Todavía no cambiamos nada.</b> Desmarca lo que no corresponde.</p>
    ${avisos.length?`<p class="horario-importar-estado" role="status">${avisos.join(' ')}</p>`:''}
    ${lista?`<div class="agent-ramo-list">${lista}</div>`:listaSecciones?'':'<p class="cat-empty">No hay ramos nuevos para agregar. Puedes probar con otra foto o agregarlos uno por uno.</p>'}
    ${listaSecciones?`<p class="modal-label horario-secciones-titulo">Ponerle la sección a los que ya tienes</p>
    <p class="horario-importar-estado">Solo cambia la sección. Tus notas y tu pauta quedan igual.${_horarioSeccionesUC.some(r=>r.antes!=null)?' Los que ya tenían otra sección van desmarcados: márcalos si la foto está bien.':''}</p>
    <div class="agent-ramo-list">${listaSecciones}</div>`:''}
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="button" class="btn-cancel" onclick="abrirImportarHorarioBuscacursos(true)">Volver</button>
      ${lista||listaSecciones?`<button type="button" class="btn-confirm" onclick="aplicarHorarioBuscacursos()">${textoBoton}</button>`:''}
    </div>`;
  return true;
}
function aplicarHorarioBuscacursos(){
  if(S.tenant!=='uc'||!Array.isArray(_horarioUCReconocido))return false;
  const marcados=[...document.querySelectorAll('.horario-ramo-check')]
    .filter(c=>c.checked).map(c=>_horarioUCReconocido[Number(c.dataset.i)]).filter(Boolean);
  const seccionesMarcadas=[...document.querySelectorAll('.horario-seccion-check')]
    .filter(c=>c.checked).map(c=>(_horarioSeccionesUC||[])[Number(c.dataset.i)]).filter(Boolean);
  if(!marcados.length&&!seccionesMarcadas.length){showToast('No marcaste nada',true);return false;}
  let puestos=0,actualizados=0;
  marcados.forEach(r=>{
    if(ramoPropuestoYaEsta(r))return;
    const creado=crearRamoDesdeCatalogo(r.nombre,r.sigla,r.seccion);
    if(!creado)return;
    if(r.seccion!=null)creado.seccion=r.seccion;
    puestos++;
  });
  // Se vuelve a buscar el ramo por id Y sigla: si entretanto se borró o se le
  // cambió la sigla, no se le escribe nada.
  seccionesMarcadas.forEach(r=>{
    const ramo=(S.ramos||[]).find(x=>x.id===r.id);
    if(!ramo||ramoConSigla(r.sigla)!==ramo)return;
    const seccion=seccionValida(r.seccion);
    if(seccion===null||ramo.seccion===seccion)return;
    ramo.seccion=seccion;
    cargarPautaSeccionVacia(ramo,{tenant:S.tenant,carrera:S.carrera});
    actualizados++;
  });
  if(!puestos&&!actualizados){showToast('Ya tienes esos ramos en tu semestre',true);return false;}
  save();
  if(puestos)track('ramos_horario_agregados',{cantidad:puestos});
  if(actualizados)track('secciones_horario_puestas',{cantidad:actualizados});
  _horarioUCReconocido=null;_horarioSeccionesUC=[];_horarioTextoPegado='';
  const despues=puestos?alAgregarRamo:null;
  alCancelarAgregarRamo=null;
  closeModal();renderHome();
  const partes=[];
  if(puestos)partes.push(puestos===1?'1 ramo agregado':`${puestos} ramos agregados`);
  if(actualizados)partes.push(actualizados===1?'1 sección puesta':`${actualizados} secciones puestas`);
  showToast(partes.join(' y ')+' desde tu horario');
  if(despues)despues();
  return true;
}
