
let _horarioUCReconocido=null,_horarioSeccionesUC=[],_horarioClasesUC=[],_horarioAvisosUC=[],_horarioTextoPegado='';
function abrirImportarHorarioBuscacursos(conservarTexto=false){
  const fuente=HORARIO_FOTO_POR_TENANT[S.tenant];
  if(!fuente)return;
  if(!conservarTexto)_horarioTextoPegado='';
  _horarioUCReconocido=null;_horarioClasesUC=[];
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Subir foto de tu horario</div>
    <p class="modal-desc">Sube un pantallazo de tu horario de ${esc(fuente.donde)}. Lo leemos en tu teléfono: <b>la imagen no sale de tu dispositivo</b>. Después revisas los ramos${fuente.horas?' y sus horas de clase':' y sus clases'} antes de agregarlos.</p>
    <label class="btn-confirm horario-foto-btn" for="m-horario-foto">Elegir foto del horario</label>
    <input type="file" id="m-horario-foto" class="horario-foto-input" accept="image/*" onchange="leerFotoHorario(this)" aria-describedby="m-horario-estado"/>
    <p id="m-horario-estado" class="horario-importar-estado" role="status" aria-live="polite">Solo se reconocerán siglas verificadas en el catálogo ${esc(TENANTS[S.tenant].short)}.</p>
    <details class="horario-texto-alt"${conservarTexto&&_horarioTextoPegado?' open':''}>
      <summary>¿Tienes el horario como texto? Pégalo</summary>
      <textarea id="m-horario-texto" class="horario-importar-texto" rows="5" maxlength="20000" placeholder="Ej.: ${esc(fuente.ejemplo)}" aria-label="Tu horario como texto"></textarea>
      <button type="button" class="btn-cancel" id="m-horario-reconocer" onclick="reconocerHorarioBuscacursos()">Revisar texto</button>
    </details>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
    </div>`;
  openModal();
  const entrada=document.getElementById('m-horario-texto');
  entrada.value=_horarioTextoPegado;
}
// Las siglas que el horario puede proponer, con su nombre. La UC además baja
// su catálogo completo (~660 KB); null si no llegó.
async function siglasParaHorario(tenant){
  const porSigla=new Map();
  if(tenant==='uc'){
    let cargado=false;
    try{cargado=await cargarCursosUC();}catch(e){}
    const filas=cursosUcExtra();
    if(!cargado||!filas)return null;
    filas.filter(f=>Array.isArray(f)&&typeof f[0]==='string').forEach(f=>porSigla.set(f[0].toUpperCase(),f));
  }
  // Algunas siglas reales viven solo como pauta y no en cursos-uc.js (TTF012,
  // "Revelación y Fe"): sin esto, el horario las descartaba como si no
  // existieran. En la FEN, las siglas están en la tabla de créditos.
  Object.entries(PRESETS_POR_TENANT[tenant]||{}).forEach(([nombre,preset])=>{
    const sigla=preset&&typeof preset.sigla==='string'?preset.sigla.toUpperCase():'';
    if(sigla&&!porSigla.has(sigla))porSigla.set(sigla,[sigla,nombre,null]);
  });
  Object.entries(CREDITOS_POR_TENANT[tenant]||{}).forEach(([nombre,fila])=>{
    const sigla=Array.isArray(fila)&&typeof fila[1]==='string'?fila[1].toUpperCase():'';
    if(sigla&&!porSigla.has(sigla))porSigla.set(sigla,[sigla,nombre,fila[0]]);
  });
  return porSigla;
}
const resumenHorarioFoto=bloques=>bloques.map(b=>`${diasBloqueHorario(b)} ${b.inicio}–${b.fin}`).join(' · ');
// `lecturasFoto` (las lecturas de una foto) llega de leerFotoHorario; sin él,
// se lee lo pegado.
async function reconocerHorarioBuscacursos(lecturasFoto){
  const tenant=S.tenant,fuente=HORARIO_FOTO_POR_TENANT[tenant];
  if(!fuente)return false;
  const deFoto=Array.isArray(lecturasFoto)||typeof lecturasFoto==='string';
  const estado=document.getElementById('m-horario-estado');
  const entrada=document.getElementById('m-horario-texto');
  if(!estado||(!deFoto&&!entrada))return false;
  const boton=document.getElementById('m-horario-reconocer');
  if(!deFoto&&(!boton||boton.disabled))return false;
  if(!deFoto)_horarioTextoPegado=entrada.value;
  // El horario FEN escribe "ENMEM1505/02": la sigla de la tabla con EN
  // adelante y la sección tras una barra.
  const prefijo=PREFIJO_SIGLA_HORARIO[tenant]||'';
  const sinPrefijo=s=>prefijo&&s.startsWith(prefijo)?s.slice(prefijo.length):s;
  const leer=existe=>(deFoto?codigosDeFotoHorario(lecturasFoto,existe):extraerCodigosHorarioBuscacursos(entrada.value.replace(/\//g,'-')))
    .map(c=>({...c,sigla:sinPrefijo(c.sigla)}));
  let codigos=leer();
  _horarioUCReconocido=null;_horarioSeccionesUC=[];_horarioClasesUC=[];
  if(!codigos.length){
    estado.textContent=deFoto
      ?`No encontramos siglas en la foto. Prueba con un pantallazo más nítido, donde se lean códigos como ${fuente.ejemplo}.`
      :`No encontramos siglas con sección, como ${fuente.ejemplo}. Revisa lo que pegaste.`;
    if(!deFoto)entrada.focus();
    return false;
  }
  if(boton)boton.disabled=true;
  if(tenant==='uc')estado.textContent='Cargando el catálogo UC para comprobar las siglas…';
  const porSigla=await siglasParaHorario(tenant);
  // El estudiante puede cerrar el modal mientras llega el catálogo. En ese
  // caso la respuesta tardía no abre una propuesta ni modifica el semestre.
  if(document.getElementById('m-horario-estado')!==estado||S.tenant!==tenant)return false;
  if(boton)boton.disabled=false;
  if(!porSigla){estado.textContent='No pudimos cargar el catálogo UC. Revisa tu conexión e intenta de nuevo; tu horario sigue aquí.';return false;}

  // Con el catálogo a mano, la foto se vuelve a leer probando L↔I en las siglas.
  const existe=x=>porSigla.has(sinPrefijo(x));
  if(deFoto)codigos=leer(existe);
  // Días y horas de clase, donde la grilla los trae. Por código como se lee.
  const horarios=deFoto&&fuente.horas?bloquesDeFotoHorario(lecturasFoto,existe):new Map();
  const horarioDe=sigla=>horarios.get(prefijo+sigla)||horarios.get(sigla)||[];
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
  const catalogoPorSigla=new Map(indiceBusquedaCatalogo(tenant,S.carrera).todos
    .filter(r=>r.sigla).map(r=>[r.sigla.toUpperCase(),r]));
  const nombreDe=sigla=>(catalogoPorSigla.get(sigla)||{}).nombre||porSigla.get(sigla)[1];
  _horarioUCReconocido=[...secciones].filter(([sigla,s])=>s.size===1&&porSigla.has(sigla))
    .map(([sigla,s])=>({sigla,seccion:[...s][0],nombre:nombreDe(sigla),horario:horarioDe(sigla)}))
    .filter(r=>!ramoPropuestoYaEsta(r));

  const yaTienes=[...secciones].filter(([sigla,s])=>s.size===1&&porSigla.has(sigla)
    &&ramoPropuestoYaEsta({sigla,nombre:nombreDe(sigla)})).length;
  // Los que ya tienes pueden recibir la sección leída. Solo se ofrece si se
  // leyó una sección y es distinta de la guardada; si ya tenían otra, va
  // DESMARCADO: cambiarla es una decisión, no un relleno (Lucas, 2026-09-28).
  // FEN completa el horario solo si está vacío. UC conserva su revisión de
  // clases separada, con reemplazos desmarcados y corrección antes de guardar.
  // Notas, pauta y créditos no se tocan.
  _horarioSeccionesUC=[...secciones].filter(([sigla,s])=>s.size===1&&porSigla.has(sigla))
    .map(([sigla,s])=>{
      const ramo=ramoConSigla(sigla);if(!ramo)return null;
      const leida=[...s][0],seccion=leida!=null&&ramo.seccion!==leida?leida:null;
      const horario=horarioDe(sigla).length&&!copiarHorario(ramo.horario).length?horarioDe(sigla):null;
      return seccion!=null||horario?{id:ramo.id,nombre:ramo.nombre,sigla,antes:ramo.seccion??null,seccion,horario}:null;
    }).filter(Boolean);
  _horarioUCReconocido.forEach(r=>{r.marcado=true;});
  _horarioSeccionesUC.forEach(r=>{r.marcado=r.seccion==null||r.antes==null;});
  // Del pantallazo salen también las clases de cada ramo (días, módulo y
  // tipo) y de BuscaCursos la sala y los profesores. Igual que la sección, al
  // que ya tenía horario se le ofrece DESMARCADO: reemplazarlo es una
  // decisión, no un relleno.
  const avisosClases=[];
  if(deFoto&&!fuente.horas){
    const resultado=await clasesParaRevisionHorario(lecturasFoto,x=>porSigla.has(x),codigos,estado);
    if(document.getElementById('m-horario-estado')!==estado||S.tenant!==tenant)return false;
    avisosClases.push(...resultado.avisos);
    resultado.clases.forEach(({sigla,bloques:leidos,profesores,diferencias})=>{
      const ramo=ramoConSigla(sigla),nuevo=_horarioUCReconocido.find(r=>r.sigla===sigla);
      if(!ramo&&!nuevo)return;
      const antes=ramo?copiarHorario(ramo.horario):[];
      // Una foto nueva no deshace lo que marcó como «no voy» (horario-clases.js).
      const bloques=conservarNoVoyHorario(antes,leidos);
      const igual=x=>JSON.stringify(x.map(({id,...b})=>b));
      if(antes.length&&igual(antes)===igual(bloques))return;
      _horarioClasesUC.push({sigla,nombre:ramo?ramo.nombre:nuevo.nombre,bloques,profesores,diferencias,reemplaza:antes.length>0,
        ramoId:ramo?ramo.id:null,horarioAntes:ramo?JSON.stringify(ramo.horario):null,marcado:!antes.length});
    });
  }
  const avisos=[...avisosClases];
  // De una foto, lo que no calza con el catálogo suele ser ruido del lector
  // ("TTF0012"): nombrarlo solo confunde. Se dice qué hacer si falta algo.
  if(desconocidas.length&&!deFoto)avisos.push(`No reconocimos: ${desconocidas.map(esc).join(', ')}.`);
  if(ambiguas.length)avisos.push(`Aparecen varias secciones para ${ambiguas.map(esc).join(', ')}; agrégalo a mano para elegir la correcta.`);
  if(yaTienes)avisos.push(`${yaTienes} ${yaTienes===1?'ramo ya está':'ramos ya están'} en tu semestre.`);
  if(deFoto&&_horarioUCReconocido.some(r=>r.seccion==null))avisos.push('Si no leímos la sección de un ramo, puedes ponerla después en Editar ramo.');
  if(deFoto&&fuente.horas&&_horarioUCReconocido.some(r=>!r.horario.length))avisos.push('Al que le falte el horario se lo puedes poner en su ficha.');
  if(deFoto)avisos.push('¿Falta alguno? Agrégalo a mano o prueba con otra foto.');
  _horarioAvisosUC=avisos;
  pintarRevisionHorarioUC();
  return true;
}
// Junta la foto con BuscaCursos. De la foto salen día, módulo y tipo (por el
// color de la celda); de BuscaCursos, la sala y los profesores de esa sección.
// Si los dos no calzan, se avisa en la revisión: no se corrige en silencio.
// Sin grilla para un ramo, se usa lo de BuscaCursos; sin BuscaCursos, la foto
// sola y sin sala.
const DIA_CORTO_HORARIO={L:'lun',M:'mar',W:'mié',J:'jue',V:'vie',S:'sáb',D:'dom'};
const textoCeldaHorario=c=>`${DIA_CORTO_HORARIO[c.dia]} mód. ${c.mod}${c.tipo?' '+c.tipo.toLowerCase():''}`;
async function clasesParaRevisionHorario(lecturas,existe,codigos,estado){
  const celdasFoto=celdasDeFotoHorario(lecturas,existe,'uc');
  const periodoFoto=periodoDeFotoHorario(lecturas),periodo=periodoFoto||semester(),avisos=[];
  if(periodoFoto&&periodoFoto!==semester())avisos.push(`Esta foto es del período ${esc(periodoFoto)}: revisa que sea tu horario de ahora.`);
  const secciones=new Map((codigos||[]).filter(c=>c.seccion!=null).map(c=>[c.sigla,c.seccion]));
  const siglas=[...new Set([...celdasFoto.keys(),...secciones.keys()])].filter(s=>existe(s));
  const conSeccion=siglas.filter(s=>secciones.has(s));
  if(conSeccion.length&&estado)estado.textContent='Buscando salas en BuscaCursos…';
  const catalogo=new Map(await Promise.all(conSeccion.map(async sigla=>
    [sigla,await proponerHorarioDesdeCatalogo({tenant:'uc',sigla,seccion:secciones.get(sigla),periodo})])));
  if(conSeccion.length&&![...catalogo.values()].some(Boolean))
    avisos.push('No pudimos traer las salas de BuscaCursos: quedan vacías y puedes ponerlas en Corregir.');
  const clases=[];
  siglas.forEach(sigla=>{
    const foto=celdasFoto.get(sigla)||[],bc=catalogo.get(sigla)||null,diferencias=[];
    let celdas=foto.map(c=>({...c}));
    if(bc&&foto.length){
      const clave=c=>c.dia+'|'+c.mod;
      const deBC=new Map(bc.celdas.map(c=>[clave(c),c]));
      celdas.forEach(c=>{
        const otra=deBC.get(clave(c));
        if(!otra){diferencias.push(`${textoCeldaHorario(c)} no está en BuscaCursos`);return;}
        if(!c.sala&&otra.sala)c.sala=otra.sala;
        if(c.tipo&&otra.tipo&&c.tipo!==otra.tipo)diferencias.push(`${textoCeldaHorario(c)} es ${otra.tipo.toLowerCase()} en BuscaCursos`);
        // Un tipo que la foto no alcanzó a leer no es un desacuerdo: se completa.
        if(!c.tipo&&otra.tipo)c.tipo=otra.tipo;
      });
      const enFoto=new Set(celdas.map(clave));
      bc.celdas.filter(c=>!enFoto.has(clave(c))).forEach(c=>diferencias.push(`BuscaCursos además trae ${textoCeldaHorario(c)}`));
    }else if(bc&&!foto.length)celdas=bc.celdas.map(c=>({...c}));
    const bloques=bloquesDeCeldasHorario('uc',celdas);
    if(bloques.length)clases.push({sigla,bloques,profesores:bc?bc.profesores:[],diferencias});
  });
  return {clases,avisos};
}
// Las clases leídas, en una línea por bloque: "Lun y mié · 08:20–09:30 · Cátedra · K201".
function textoBloqueRevision(b){
  const dias=DIAS_HORARIO.filter(([k])=>b.dias.includes(k)).map(([,n])=>n.slice(0,3).toLowerCase());
  const d=dias.length>1?dias.slice(0,-1).join(', ')+' y '+dias[dias.length-1]:dias[0]||'';
  return [d.charAt(0).toUpperCase()+d.slice(1),b.inicio+'–'+b.fin,b.tipo,b.sala].filter(Boolean).join(' · ');
}
// Lo marcado se guarda en el estado antes de salir de la revisión (Corregir),
// para que al volver siga igual.
function recordarMarcasRevisionHorario(){
  [['.horario-ramo-check',_horarioUCReconocido],['.horario-seccion-check',_horarioSeccionesUC],['.horario-clases-check',_horarioClasesUC]]
    .forEach(([sel,lista])=>document.querySelectorAll(sel).forEach(c=>{const r=(lista||[])[Number(c.dataset.i)];if(r)r.marcado=!!c.checked;}));
}
function pintarRevisionHorarioUC(){
  const avisos=_horarioAvisosUC||[];
  const horasHtml=h=>h&&h.length?`<small>${esc(resumenHorarioFoto(h))}</small>`:'';
  const conHorario=_horarioSeccionesUC.some(r=>r.horario);
  const lista=(_horarioUCReconocido||[]).map((r,i)=>`<label class="agent-ramo-row">
    <input type="checkbox" class="agent-ramo-check horario-ramo-check" data-i="${i}"${r.marcado?' checked':''}/>
    <span><b>${esc(r.nombre)}</b><small>${esc(r.sigla)}${r.seccion!=null?` · Sección ${r.seccion}`:''}</small>${horasHtml(r.horario)}</span>
  </label>`).join('');
  const listaSecciones=_horarioSeccionesUC.map((r,i)=>`<label class="agent-ramo-row">
    <input type="checkbox" class="agent-ramo-check horario-seccion-check" data-i="${i}"${r.marcado?' checked':''}/>
    <span><b>${esc(r.nombre)}</b><small>${esc(r.sigla)}${r.seccion==null?'':r.antes==null?` · Sección ${r.seccion}`:` · Sección ${r.antes} → ${r.seccion}`}</small>${horasHtml(r.horario)}</span>
  </label>`).join('');
  const listaClases=_horarioClasesUC.map((r,i)=>`<div class="horario-revision-ramo">
    <label class="agent-ramo-row">
      <input type="checkbox" class="agent-ramo-check horario-clases-check" data-i="${i}"${r.marcado?' checked':''}/>
      <span><b>${esc(r.nombre)}</b>${r.reemplaza?'<small>Reemplaza el horario que tenías</small>':''}
        <ul class="horario-revision-bloques">${r.bloques.map(b=>`<li>${esc(textoBloqueRevision(b))}</li>`).join('')}</ul>
        ${r.profesores&&r.profesores.length?`<small>${r.profesores.length===1?'Profesor':'Profesores'} según BuscaCursos: ${esc(r.profesores.join(', '))}</small>`:''}
        ${r.diferencias&&r.diferencias.length?`<small class="horario-revision-diferencia">No calza con BuscaCursos: ${esc(r.diferencias.join('; '))}. Revísalo en Corregir.</small>`:''}</span>
    </label>
    <button type="button" class="horario-accion" onclick="corregirClasesRevisionHorario(${i})" aria-label="Corregir las clases de ${esc(r.nombre)}">Corregir</button>
  </div>`).join('');
  const partes=[lista,listaSecciones,listaClases].filter(Boolean).length;
  const textoBoton=partes>1?'Aplicar lo marcado':lista?'Agregar los marcados':listaSecciones?(conHorario?'Completar los marcados':'Poner las secciones'):'Guardar el horario';
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${listaClases?'Tu horario':'Ramos reconocidos'}</div>
    <p class="modal-desc">Revisa lo que leímos. <b>Todavía no cambiamos nada.</b> Desmarca lo que no corresponde.</p>
    ${avisos.length?`<p class="horario-importar-estado" role="status">${avisos.join(' ')}</p>`:''}
    ${lista?`<div class="agent-ramo-list">${lista}</div>`:listaSecciones||listaClases?'':'<p class="cat-empty">No hay ramos nuevos para agregar. Puedes probar con otra foto o agregarlos uno por uno.</p>'}
    ${listaSecciones?`<p class="modal-label horario-secciones-titulo">${conHorario?'Completar los que ya tienes':'Ponerle la sección a los que ya tienes'}</p>
    <p class="horario-importar-estado">${conHorario?'Solo pone la sección y el horario de clases.':'Solo cambia la sección.'} Tus notas y tu pauta quedan igual.${_horarioSeccionesUC.some(r=>r.seccion!=null&&r.antes!=null)?' Los que ya tenían otra sección van desmarcados: márcalos si la foto está bien.':''}</p>
    <div class="agent-ramo-list">${listaSecciones}</div>`:''}
    ${listaClases?`<p class="modal-label horario-secciones-titulo">Clases de cada ramo</p>
    <p class="horario-importar-estado">Días, módulos y tipo salen de tu foto; la sala, de BuscaCursos cuando está. Si algo no calza, tócalo en Corregir. Solo se guarda el horario: tus notas y tu pauta quedan igual.${_horarioClasesUC.some(r=>r.reemplaza)?' Los que ya tenían horario van desmarcados.':''}</p>
    <div class="agent-ramo-list">${listaClases}</div>`:''}
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button type="button" class="btn-cancel" onclick="abrirImportarHorarioBuscacursos(true)">Volver</button>
      ${partes?`<button type="button" class="btn-confirm" onclick="aplicarHorarioBuscacursos()">${textoBoton}</button>`:''}
    </div>`;
}
// Corregir abre la misma hoja de edición de la ficha, pero lo editado vuelve a
// la revisión: nada se guarda hasta Aplicar.
function corregirClasesRevisionHorario(i){
  const r=_horarioClasesUC[i];if(!r)return;
  recordarMarcasRevisionHorario();
  abrirEditorHorario({titulo:`Clases de ${r.nombre}`,bloques:r.bloques,textoGuardar:'Listo',
    alCancelar:pintarRevisionHorarioUC,
    alGuardar:bloques=>{r.bloques=bloques;r.marcado=bloques.length>0;pintarRevisionHorarioUC();}});
}
function aplicarHorarioBuscacursos(){
  if(!HORARIO_FOTO_POR_TENANT[S.tenant]||!Array.isArray(_horarioUCReconocido))return false;
  const marcados=[...document.querySelectorAll('.horario-ramo-check')]
    .filter(c=>c.checked).map(c=>_horarioUCReconocido[Number(c.dataset.i)]).filter(Boolean);
  const seccionesMarcadas=[...document.querySelectorAll('.horario-seccion-check')]
    .filter(c=>c.checked).map(c=>(_horarioSeccionesUC||[])[Number(c.dataset.i)]).filter(Boolean);
  const clasesMarcadas=[...document.querySelectorAll('.horario-clases-check')]
    .filter(c=>c.checked).map(c=>(_horarioClasesUC||[])[Number(c.dataset.i)]).filter(Boolean);
  if(!marcados.length&&!seccionesMarcadas.length&&!clasesMarcadas.length){showToast('No marcaste nada',true);return false;}
  let puestos=0,actualizados=0,horarios=0;
  marcados.forEach(r=>{
    if(ramoPropuestoYaEsta(r))return;
    const creado=crearRamoDesdeCatalogo(r.nombre,r.sigla);
    if(!creado)return;
    if(r.seccion!=null)creado.seccion=r.seccion;
    if(r.horario&&r.horario.length)creado.horario=copiarHorario(r.horario);
    puestos++;
  });
  // Se vuelve a buscar el ramo por id Y sigla: si entretanto se borró o se le
  // cambió la sigla, no se le escribe nada.
  seccionesMarcadas.forEach(r=>{
    const ramo=(S.ramos||[]).find(x=>x.id===r.id);
    if(!ramo||ramoConSigla(r.sigla)!==ramo)return;
    const seccion=r.seccion==null?null:seccionValida(r.seccion);
    if(seccion!==null&&ramo.seccion!==seccion){ramo.seccion=seccion;actualizados++;}
    if(r.horario&&!copiarHorario(ramo.horario).length){ramo.horario=copiarHorario(r.horario);horarios++;}
  });
  // Después de crear los nuevos: el horario de un ramo que no se agregó no
  // tiene dónde ir y se descarta. Si el horario de un ramo que ya tenías
  // cambió mientras revisabas, no se pisa. Solo se escribe `horario`.
  clasesMarcadas.forEach(r=>{
    const ramo=ramoConSigla(r.sigla),bloques=copiarHorario(r.bloques);
    if(!ramo||!bloques.length)return;
    if(r.ramoId!=null&&(ramo.id!==r.ramoId||JSON.stringify(ramo.horario)!==r.horarioAntes))return;
    ramo.horario=bloques;horarios++;
  });
  if(!puestos&&!actualizados&&!horarios){showToast('Ya tienes esos ramos en tu semestre',true);return false;}
  save();
  if(puestos)track('ramos_horario_agregados',{cantidad:puestos});
  if(actualizados)track('secciones_horario_puestas',{cantidad:actualizados});
  if(horarios)track(HORARIO_FOTO_POR_TENANT[S.tenant].horas?'horarios_clases_puestos':'horarios_foto_guardados',{cantidad:horarios});
  _horarioUCReconocido=null;_horarioSeccionesUC=[];_horarioClasesUC=[];_horarioTextoPegado='';
  const despues=puestos?alAgregarRamo:null;
  alCancelarAgregarRamo=null;
  closeModal();renderHome();
  if(horarios&&typeof renderAgenda==='function'&&typeof currentTab!=='undefined'&&currentTab==='agenda')renderAgenda();
  const partes=[];
  if(puestos)partes.push(puestos===1?'1 ramo agregado':`${puestos} ramos agregados`);
  if(actualizados)partes.push(actualizados===1?'1 sección puesta':`${actualizados} secciones puestas`);
  if(horarios)partes.push(horarios===1?'1 horario guardado':`${horarios} horarios guardados`);
  showToast((partes.length>1?partes.slice(0,-1).join(', ')+' y '+partes[partes.length-1]:partes[0])+' desde tu horario');
  if(despues)despues();
  return true;
}
