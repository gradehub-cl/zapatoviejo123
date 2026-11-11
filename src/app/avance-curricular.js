// ─── PEGAR EL AVANCE CURRICULAR ──────────────────────────────────────────────
// Cargar tres años a mano, ramo por ramo, es la razón por la que casi nadie llena
// su historial. Esto lee el texto copiado del portal y arma los mismos semestres
// que `guardarSemestreAnterior`: nota final en `avgOverride`, sin evaluaciones y
// sin campos nuevos en `S`.
//
// Solo agrega semestres que no estén en el historial: nunca toca uno existente
// ni el semestre en curso. El texto pegado no se guarda ni se manda a ninguna parte.
const SIGLA_AVANCE_RE=/(?<![A-Z0-9])[A-Z]{3}[0-9]{3,4}[A-Z]?(?![A-Z0-9])/g;
const NOTA_AVANCE_RE=/(?<![\w.,\/-])[1-7][.,][0-9](?![\d.,])/g;
// 202420 es como el portal UC escribe 2024-1; los otros son como se ve en la
// concentración de notas o al copiar desde el celular.
const PERIODO_AVANCE_RE=/\b(20\d{2})(10|20|22)\b|\b(20\d{2})\s*[-\/]\s*([12]|TAV)\b|\b([12])\s*[-\/]\s*(20\d{2})\b|\b(primer|segundo)\s+semestre\s+(?:del?\s+)?(20\d{2})\b|\b(TAV|verano)\s+(?:del?\s+)?(20\d{2})\b/gi;
// "(1)" junto a la nota marca una convalidación: no se cursó, no va al promedio.
const NO_CUENTA_AVANCE_RE=/promedio|\bpp[ae]\b|retir|anulad|convalid|homolog|reconocid|\(\d\)/i;
const TRAMO_MAX_AVANCE=250;

function periodoAvance(m){
  const codigo={10:'v',20:'1',22:'2'};
  if(m[1])return etiquetaSemestre(m[1],codigo[m[2]]);
  if(m[3])return etiquetaSemestre(m[3],/tav/i.test(m[4])?'v':m[4]);
  if(m[5])return etiquetaSemestre(m[6],m[5]);
  if(m[7])return etiquetaSemestre(m[8],/^primer/i.test(m[7])?'1':'2');
  return etiquetaSemestre(m[10],'v');
}

// Recorre el texto en orden: el último semestre visto vale para lo que sigue y la
// última sigla antes de una nota es el ramo cursado. Así da lo mismo si el pegado
// trae una fila por línea o una celda por línea, y en el avance UC la fila del
// requisito (OFG, optativo) no le gana a la del curso que lo cumplió.
// Un semestre escrito después de la nota, en la misma línea, también es de esa fila.
// ponytail: con una celda por línea y la nota ANTES del semestre, la fila tomaría
// el semestre anterior. No hay cómo distinguirlo; la revisión lo deja a la vista.
function leerAvanceCurricular(texto){
  const t=String(texto||'');
  const marcas=[
    ...[...t.matchAll(SIGLA_AVANCE_RE)].map(m=>({tipo:'sigla',m})),
    ...[...t.matchAll(NOTA_AVANCE_RE)].map(m=>({tipo:'nota',m})),
    ...[...t.matchAll(PERIODO_AVANCE_RE)].map(m=>({tipo:'periodo',m}))
  ].sort((a,b)=>a.m.index-b.m.index);
  const filas=[],vistos=new Set();
  let periodo=null,sigla=null,omitidos=0;
  for(const {tipo,m} of marcas){
    if(tipo==='periodo'){periodo=periodoAvance(m);continue;}
    if(tipo==='sigla'){sigla=m;continue;}
    if(!sigla)continue;
    const finSigla=sigla.index+sigla[0].length,finNota=m.index+m[0].length;
    const tramo=t.slice(finSigla,finNota+8),codigo=sigla[0];
    sigla=null;
    const nota=Number(m[0].replace(',','.'));
    if(tramo.length>TRAMO_MAX_AVANCE||nota>7)continue;
    if(NO_CUENTA_AVANCE_RE.test(tramo)){omitidos++;continue;}
    const despues=[...t.slice(finNota).split('\n')[0].matchAll(PERIODO_AVANCE_RE)][0];
    const periodoFila=despues?periodoAvance(despues):periodo;
    const clave=codigo+'|'+periodoFila;
    if(vistos.has(clave))continue;
    vistos.add(clave);
    const celda=t.slice(finSigla,m.index).split(/[\t\n]/).map(c=>c.trim()).find(Boolean)||'';
    filas.push({
      sigla:codigo,
      nombre:celda.split(/\s{2,}|\s\d/)[0].trim()||codigo,
      nota,
      periodo:periodoFila
    });
  }
  return {filas,omitidos};
}

// 2024-2 > 2024-1 > TAV 2024: la TAV va en enero, antes del primer semestre.
function ordenSemestre(label){
  const p=parseEtiquetaSemestre(label);
  return p?p.anio*10+({v:0,1:1,2:2})[p.periodo]:null;
}

// Por qué una fila no se puede importar; null si se puede.
function bloqueoAvance(fila,historial,actual){
  if(!fila.periodo)return 'sin-semestre';
  const orden=ordenSemestre(fila.periodo);
  if(orden>=ordenSemestre(actual))return 'en-curso';
  return (historial||[]).some(h=>h&&(h.label===fila.periodo||ordenSemestre(h.label)===orden))?'ya-esta':null;
}

// El primer historial manda como "semestre anterior" en Estadísticas, así que un
// semestre viejo no puede quedar arriba de uno más nuevo.
function insertarEnHistorial(historial,entrada){
  const orden=ordenSemestre(entrada.label);
  const i=historial.findIndex(h=>{
    const o=h&&ordenSemestre(h.label);
    return typeof o==='number'&&o<orden;
  });
  historial.splice(i<0?historial.length:i,0,entrada);
}

function ramosHistorialAvance(filas){
  return filas.map(r=>({
    id:uid(),nombre:r.nombre,sigla:r.sigla,color:COLORS[Math.floor(Math.random()*COLORS.length)],
    creditos:r.creditos,avgOverride:r.nota,categorias:[],origen:{manual:true}
  }));
}

let avance={filas:[],bloqueadas:[],omitidos:0};

function avanceCurricularDisponible(){return !esCuentaProfesor()&&!!AVANCE_CURRICULAR[S.tenant];}

function openAvanceCurricular(){
  if(!avanceCurricularDisponible())return;
  const fuente=AVANCE_CURRICULAR[S.tenant];
  // La ficha en PDF va primero: es una tabla limpia y no depende de cómo copie
  // el celular. Pegar el avance queda como alternativa, igual que en el horario.
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Cargar tus semestres anteriores</div>
    <p class="modal-desc">Sube tu ${esc(fuente.ficha)} en PDF. La leemos en tu teléfono: <b>el archivo no sale de tu dispositivo</b>, y antes de agregar nada vas a poder revisarlo.</p>
    <ol class="avance-pasos">
      <li>Abre el <a href="${esc(fuente.url)}" target="_blank" rel="noopener">${esc(fuente.sistema)}</a> con tu cuenta UC y toca «Consultar».</li>
      <li>Elige la pestaña «${esc(fuente.pestanaFicha)}».</li>
      <li>Toca «Descargar». El archivo empieza con ${esc(fuente.archivoFicha)}.</li>
    </ol>
    <p class="settings-help">También llegas desde ${esc(fuente.alternativa)}. Si el portal muestra un error, entra de nuevo por ahí.</p>
    <label class="btn-confirm horario-foto-btn" for="m-avance-ficha">Subir ficha en PDF</label>
    <input type="file" id="m-avance-ficha" class="horario-foto-input" accept="application/pdf,.pdf" onchange="subirFichaAcademica(this)" aria-describedby="m-avance-aviso"/>
    <p class="settings-help" id="m-avance-aviso" role="status" aria-live="polite">Solo leemos siglas, créditos, notas y semestres.</p>
    <details class="horario-texto-alt">
      <summary>¿No tienes el PDF? Pega tu ${esc(fuente.documento)}</summary>
      <p class="settings-help">En el mismo sistema, abre la pestaña «${esc(fuente.pestanaAvance)}», selecciona toda la página, cópiala y pégala acá. Da lo mismo si viene texto de más.</p>
      <textarea id="m-avance-texto" class="horario-importar-texto" rows="5" maxlength="200000" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Tu ${esc(fuente.documento)} copiado" oninput="document.getElementById('m-avance-leer').disabled=!this.value.trim()"></textarea>
      <button type="button" class="btn-cancel" id="m-avance-leer" disabled onclick="leerAvancePegado()">Revisar texto</button>
    </details>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="openSemestreAnteriorModal()">Atrás</button>
    </div>`;
  openModal();
}

async function leerAvancePegado(){
  const campo=document.getElementById('m-avance-texto');
  if(!campo)return;
  const {filas,omitidos}=leerAvanceCurricular(campo.value);
  if(!filas.length){
    const aviso=document.getElementById('m-avance-aviso');
    // Distingue "no hay notas" (copió solo los ramos en curso) de "no es el avance".
    const conSiglas=(campo.value.match(SIGLA_AVANCE_RE)||[]).length>0;
    if(aviso)aviso.textContent=conSiglas
      ?'Encontramos ramos, pero sin notas. Copia la pestaña «Seguimiento Curricular» completa, no solo los ramos en curso.'
      :'No reconocimos el texto. Copia toda la pestaña «Seguimiento Curricular» e inténtalo de nuevo.';
    return;
  }
  await revisarFilasAvance(filas,omitidos,()=>document.getElementById('m-avance-texto')===campo);
}

// Lo comparten el texto pegado y la ficha académica en PDF: completa nombre y
// créditos desde el catálogo, marca lo que no se puede importar y abre la
// revisión. `sigueAbierto` evita pintar sobre otra pantalla si la persona
// cerró el modal, cambió de cuenta o de universidad mientras se cargaba.
async function revisarFilasAvance(filas,omitidos,sigueAbierto){
  const boton=document.getElementById('m-avance-leer');
  const cuenta=currentUser?.id,tenant=S.tenant;
  if(boton)boton.disabled=true;
  // El nombre y los créditos oficiales salen del catálogo. Sin él (sin conexión)
  // quedan el nombre leído y créditos en null, igual que un ramo escrito a mano.
  await cargarCursosUC();
  if(currentUser?.id!==cuenta||S.tenant!==tenant||!sigueAbierto()||
    !document.getElementById('modal')?.classList.contains('open'))return;
  const actual=semester();
  const conDatos=filas.map(r=>{
    const fila=cursoUcCompleto(null,r.sigla),nombre=(fila&&fila[1])||r.nombre;
    // Los créditos de la ficha son los del registro de la persona: mandan.
    const creditos=typeof r.creditos==='number'?r.creditos:(creditosDe(nombre,S.tenant,null,r.sigla)??null);
    return {...r,nombre,creditos,bloqueo:bloqueoAvance(r,S.historial,actual),marcada:true};
  });
  avance={
    filas:conDatos.filter(r=>!r.bloqueo).sort((a,b)=>ordenSemestre(b.periodo)-ordenSemestre(a.periodo)),
    bloqueadas:conDatos.filter(r=>r.bloqueo),
    omitidos
  };
  renderRevisionAvance();
}

function textoNoImportadosAvance(){
  const cuenta=b=>avance.bloqueadas.filter(r=>r.bloqueo===b).length;
  const ya=[...new Set(avance.bloqueadas.filter(r=>r.bloqueo==='ya-esta').map(r=>r.periodo))];
  const fuera=[
    cuenta('en-curso')&&`del semestre en curso (${cuenta('en-curso')})`,
    cuenta('sin-semestre')&&`sin semestre (${cuenta('sin-semestre')})`,
    // La ficha también deja fuera notas con letra (A, R) y ramos sin créditos.
    avance.omitidos&&`convalidados, retirados o sin nota numérica (${avance.omitidos})`
  ].filter(Boolean);
  return [
    ya.length?`Ya en tu historial, sin cambios: ${ya.join(', ')}.`:'',
    fuera.length?`Sin agregar: ${fuera.join(', ')}.`:''
  ].filter(Boolean).join(' ');
}

function renderRevisionAvance(){
  let semestre=null;
  const filas=avance.filas.map((r,i)=>{
    const titulo=r.periodo!==semestre?`<label class="modal-label" style="margin-top:12px;">${esc(r.periodo)}</label>`:'';
    semestre=r.periodo;
    return `${titulo}
    <label style="display:flex;align-items:center;gap:11px;min-height:44px;padding:6px 2px;border-bottom:1px solid var(--border);cursor:pointer;">
      <input type="checkbox" ${r.marcada?'checked':''} onchange="marcarAvance(${i},this.checked)" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span style="flex:1;min-width:0;font-size:0.875rem;color:var(--fg);">${esc(r.nombre)} <span class="rep-tag">${esc(r.sigla)}</span></span>
      <span style="font-size:0.875rem;font-weight:600;color:var(--fg);font-variant-numeric:tabular-nums;">${nf(r.nota,1).replace('.',',')}</span>
    </label>`;
  }).join('');
  const fuera=textoNoImportadosAvance();
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Revisa antes de guardar</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:10px;">
      ${filas?'Compara con tu portal y desmarca lo que no calce. Se agregan como semestres nuevos a tu historial.':'No hay semestres nuevos para agregar.'}
    </p>
    ${filas?`<div style="max-height:46vh;overflow-y:auto;margin-bottom:12px;">${filas}</div>`:''}
    ${fuera?`<p class="settings-help">${esc(fuera)}</p>`:''}
    <div class="modal-btns">
      <button class="btn-cancel" onclick="openAvanceCurricular()">Atrás</button>
      <button class="btn-confirm" id="m-avance-guardar" onclick="guardarAvanceCurricular()"></button>
    </div>`;
  actualizarBotonAvance();
  openModal();
}

function marcarAvance(i,marcada){
  if(!avance.filas[i])return;
  avance.filas[i].marcada=marcada;
  actualizarBotonAvance();
}

function actualizarBotonAvance(){
  const boton=document.getElementById('m-avance-guardar');if(!boton)return;
  const n=avance.filas.filter(r=>r.marcada).length;
  boton.disabled=!n;
  boton.textContent=n===1?'Agregar 1 ramo':`Agregar ${n} ramos`;
}

function guardarAvanceCurricular(){
  const porSemestre=new Map();
  for(const r of avance.filas){
    if(!r.marcada)continue;
    if(!porSemestre.has(r.periodo))porSemestre.set(r.periodo,[]);
    porSemestre.get(r.periodo).push(r);
  }
  if(!porSemestre.size)return;
  let total=0;
  for(const [label,filas] of porSemestre){
    const ramos=ramosHistorialAvance(filas);
    total+=ramos.length;
    insertarEnHistorial(S.historial,{id:uid(),label,archivedAt:Date.now(),manual:true,gpa:gpa(ramos),ramos});
  }
  save();track('avance_curricular_importado',{ramos:total,semestres:porSemestre.size});
  avance={filas:[],bloqueadas:[],omitidos:0};
  closeModal();renderHome();renderStats();
  showToast(`${total===1?'1 ramo agregado':`${total} ramos agregados`} a tu historial`);
}
