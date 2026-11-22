// ─── NOTAS PEGADAS DESDE EXCEL ───────────────────────────────────────────────
// Para quien llega a mitad de semestre con sus notas en una planilla. Solo se
// ofrece al terminar el onboarding y solo en la app (Lucas, 2026-11-21): es para
// partir, no una función más del menú.
//
// Se PEGAN celdas en vez de subir un archivo. Copiar desde Excel, Numbers o
// Google Sheets deja el texto separado por tabulaciones. Así no se carga una
// librería de .xlsx y funciona igual en el teléfono. El texto no se guarda ni
// sale del dispositivo.
//
// Lo difícil no es leer, es CALZAR: cada uno escribe «I1», «Int 1» o
// «Interrogación 1», y el ramo ya trae su pauta oficial. Lo que calza se
// muestra antes de guardar, y lo que no calza se puede asignar o dejar fuera.
// Nunca se pisa una nota que ya tenga valor ni se toca la pauta: las notas
// entran por el mismo camino que las propuestas de los agentes
// (`destinoNotaPropuesta` / `escribirNotaPropuesta`).
//
// Formas que entiende:
//   larga     Ramo | Evaluación | Nota          (cada fila, una nota)
//   bloques   Cálculo II                        (fila con solo el ramo)
//             I1 | 5,4                          (y debajo sus notas)
//   ancha     Ramo | I1 | I2 | Examen           (encabezado de evaluaciones)
//             Cálculo II | 5,4 | 6,1 |          (una fila por ramo)
//   varias    Laboratorio | 5,0 | 6,2 | 5,8     (varias notas de lo mismo)
const EXCEL_MAX_TEXTO=100000,EXCEL_MAX_NOTAS=200;
// Abreviaturas comunes. Las de una letra solo valen pegadas a un número («i1»,
// «c2»): una «s» sola no es una solemne.
const EXCEL_TIPOS=[
  [['interrogacion','interro','int'],'interrogacion',['i']],
  [['control','ctrl'],'control',['c']],
  [['prueba','pba'],'prueba',['p']],
  [['solemne','sol'],'solemne',['s']],
  [['examen','exam','ex'],'examen',[]],
  [['tarea','tar'],'tarea',['t']],
  [['laboratorio','lab'],'laboratorio',['l']],
  [['taller','tall'],'taller',[]],
  [['quiz','quizz'],'quiz',['q']],
  [['proyecto','proy'],'proyecto',[]],
  [['ayudantia','ayud','ay'],'ayudantia',[]],
  [['certamen','cert'],'certamen',[]],
  [['parcial'],'parcial',[]],
];

function excelFilas(texto){
  const t=String(texto??'').slice(0,EXCEL_MAX_TEXTO).replace(/\r\n?/g,'\n');
  const lineas=t.split('\n').filter(l=>l.trim());
  const sep=lineas.some(l=>l.includes('\t'))?'\t':lineas.some(l=>l.includes(';'))?';':null;
  return lineas.map(l=>(sep?l.split(sep):[l]).map(c=>c.trim()));
}

// Una nota escrita como nota: 4, 5,4, 5.45. Los enteros de dos cifras («54»)
// no, aunque `parseNota` los corrija al teclear: en una planilla un 20 suele
// ser un porcentaje.
function excelNota(celda){
  const t=String(celda||'').trim();
  if(!/^[1-7]([.,]\d{1,2})?$/.test(t))return null;
  const v=parseNota(t);
  return Number.isFinite(v)?v:null;
}
function excelEsRelleno(celda){
  const t=String(celda||'').trim();
  return !t||/%$/.test(t)||/^[\d.,\s/-]+$/.test(t);
}

// «Interrogación 1», «I1», «Int. 1» → {tipo:'interrogacion', numero:1}.
function excelClave(nombre){
  const t=normName(String(nombre||'')).replace(/[.#°º:_-]+/g,' ').replace(/\s+/g,' ').trim();
  const m=t.match(/^([a-zñ]+(?: [a-zñ]+)*?)\s*0*(\d{1,3})?$/);
  if(!m)return {tipo:t||null,numero:null};
  const numero=m[2]?Number(m[2]):null;
  const palabras=m[1].split(' ');
  const primera=palabras[0];
  const variantes=[primera,primera.replace(/es$/,''),primera.replace(/s$/,'')];
  for(const [largas,tipo,cortas] of EXCEL_TIPOS){
    if(variantes.some(v=>largas.includes(v))||(numero!==null&&palabras.length===1&&cortas.includes(primera)))
      return {tipo,numero};
  }
  return {tipo:m[1],numero};
}

// Lo pegado → [{ramo, evaluacion, valor}]. `ramo` puede ser null: se resuelve
// al calzar (si tiene un solo ramo, es ese).
function excelExtraer(texto){
  const filas=excelFilas(texto);
  const notas=[];
  const agregar=(ramo,evaluacion,valor)=>{if(notas.length<EXCEL_MAX_NOTAS)notas.push({ramo:ramo||null,evaluacion:String(evaluacion||'').slice(0,80),valor});};
  if(!filas.length)return notas;
  // Ancha: un encabezado sin notas con al menos dos evaluaciones, y filas que
  // parten con el ramo y traen notas en esas columnas.
  const encabezado=filas[0];
  const cuerpo=filas.slice(1);
  const ancha=encabezado.length>=3&&encabezado.every(c=>excelNota(c)===null)&&encabezado.slice(1).filter(c=>c&&!excelEsRelleno(c)).length>=2
    &&cuerpo.some(f=>f[0]&&excelNota(f[0])===null&&f.slice(1).filter(c=>excelNota(c)!==null).length>=2);
  if(ancha){
    for(const f of cuerpo){
      if(!f[0]||excelNota(f[0])!==null)continue;
      f.slice(1).forEach((c,j)=>{
        const v=excelNota(c),evaluacion=encabezado[j+1];
        if(v!==null&&evaluacion&&!excelEsRelleno(evaluacion))agregar(f[0],evaluacion,v);
      });
    }
    return notas;
  }
  let ramoActual=null;
  for(const f of filas){
    const valores=f.map(excelNota).filter(v=>v!==null);
    const textos=f.filter(c=>excelNota(c)===null&&!excelEsRelleno(c));
    if(!valores.length){
      // Una fila con un solo texto es el título de un bloque. Un encabezado
      // («Ramo | Evaluación | Nota») tiene varios y no cambia nada.
      if(textos.length===1)ramoActual=textos[0];
      continue;
    }
    if(!textos.length)continue;
    const ramo=textos.length>=2?textos[0]:ramoActual;
    const evaluacion=textos.length>=2?textos[1]:textos[0];
    valores.forEach(v=>agregar(ramo,evaluacion,v));
  }
  return notas;
}

// El ramo de la planilla entre los del semestre: por sigla, por nombre igual o
// por un nombre que contiene al otro. Solo si hay UNO: ante la duda, no calza.
function excelRamo(texto,ramos){
  if(!texto)return ramos.length===1?ramos[0]:null;
  const t=normName(texto),siglas=(String(texto).toUpperCase().match(/[A-Z]{2,4}\d{3,4}[A-Z]?/g)||[]);
  const porSigla=ramos.filter(r=>{const s=r.sigla||siglaDeRamo(r);return s&&siglas.includes(String(s).toUpperCase());});
  if(porSigla.length===1)return porSigla[0];
  const iguales=ramos.filter(r=>normName(r.nombre)===t);
  if(iguales.length===1)return iguales[0];
  const parecidos=t.length>=5?ramos.filter(r=>{const n=normName(r.nombre);return n.length>=5&&(n.includes(t)||t.includes(n));}):[];
  return parecidos.length===1?parecidos[0]:null;
}

// La evaluación de la pauta: nombre igual, o mismo tipo y número («I1» con
// «Interrogación 1»), o una categoría de varias notas del mismo tipo
// («Lab 2» con «Laboratorio» de 3 casillas → casilla 2).
function excelCategoria(evaluacion,ramo){
  const cats=(ramo&&ramo.categorias)||[];
  const igual=cats.filter(c=>normName(c.nombre)===normName(evaluacion));
  if(igual.length===1)return {cat:igual[0],casilla:null};
  const k=excelClave(evaluacion);
  if(!k.tipo)return null;
  const claves=cats.map(c=>({cat:c,...excelClave(c.nombre)}));
  const exacta=claves.filter(c=>c.tipo===k.tipo&&c.numero!==null&&c.numero===k.numero);
  if(exacta.length===1)return {cat:exacta[0].cat,casilla:null};
  const grupo=claves.filter(c=>c.tipo===k.tipo&&c.numero===null);
  if(grupo.length!==1)return null;
  const cat=grupo[0].cat,slots=Number.isInteger(cat.slots)&&cat.slots>1?cat.slots:1;
  if(slots>1)return {cat,casilla:k.numero!==null&&k.numero<=slots?k.numero:null};
  return k.numero===null||k.numero===1?{cat,casilla:null}:null;
}

// Cada nota con su destino: 'lista' (calza y el lugar está libre), 'ocupada'
// (ya tiene nota: no se toca), 'sin_evaluacion' o 'sin_ramo'.
function excelCalzar(notas,ramos){
  return notas.map((n,i)=>{
    const ramo=excelRamo(n.ramo,ramos||[]);
    if(!ramo)return {...n,i,estado:'sin_ramo'};
    const lugar=excelCategoria(n.evaluacion,ramo);
    if(!lugar)return {...n,i,estado:'sin_evaluacion',ramoId:ramo.id};
    return {...n,i,ramoId:ramo.id,catId:lugar.cat.id,casilla:lugar.casilla,estado:'lista'};
  });
}

// Escribe en orden y revisa el lugar justo antes de cada nota: dos notas de
// «Laboratorio» sin número van a la primera y la segunda casilla libres, y una
// casilla con nota queda como estaba.
function excelAplicar(calzadas,ramos){
  let puestas=0,ocupadas=0;
  for(const n of calzadas){
    if(n.estado!=='lista'||!n.catId)continue;
    const ramo=(ramos||[]).find(r=>r.id===n.ramoId);
    const cat=ramo&&(ramo.categorias||[]).find(c=>c.id===n.catId);
    const propuesta={valor:n.valor,casilla:n.casilla||null};
    const lugar=cat&&destinoNotaPropuesta(cat,propuesta);
    if(!lugar||(lugar.nota&&lugar.nota.valor!==null&&lugar.nota.valor!==undefined)){ocupadas++;continue;}
    if(escribirNotaPropuesta(cat,propuesta,ramo))puestas++;
  }
  return {puestas,ocupadas};
}

// ─── Pantalla ────────────────────────────────────────────────────────────────
let excelBorrador=null;
// Lo pegado, para que «Atrás» en la revisión no obligue a pegarlo de nuevo.
// Vive solo en memoria y se borra al guardar o al abrir de nuevo desde el
// enlace, para que no lo vea otra cuenta en el mismo teléfono.
let excelTextoPegado='';

function excelOfertaOnboardingHTML(){
  if(!enAppNativa()||!(S.ramos||[]).some(r=>(r.categorias||[]).length))return '';
  return `<button type="button" class="ob-excel-enlace" onclick="abrirNotasDesdeExcel()">¿Llevabas tus notas en Excel? Pégalas acá</button>`;
}

function abrirNotasDesdeExcel(conservarTexto){
  excelBorrador=null;
  if(conservarTexto!==true)excelTextoPegado='';
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Pegar tus notas</div>
    <p class="modal-desc">En Excel, Numbers o Google Sheets, selecciona las celdas con tus ramos, evaluaciones y notas, cópialas y pégalas acá. Antes de guardar vas a ver dónde queda cada una.</p>
    <textarea id="m-excel-texto" class="horario-importar-texto" rows="6" maxlength="${EXCEL_MAX_TEXTO}" autocomplete="off" autocapitalize="none" spellcheck="false"
      aria-label="Celdas copiadas de tu planilla" aria-describedby="m-excel-aviso" placeholder="Cálculo II&#9;I1&#9;5,4"
      oninput="document.getElementById('m-excel-leer').disabled=!this.value.trim()">${esc(excelTextoPegado)}</textarea>
    <p class="settings-help" id="m-excel-aviso" role="status" aria-live="polite">El texto no sale de tu teléfono.</p>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Ahora no</button>
      <button type="button" class="btn-confirm" id="m-excel-leer" ${excelTextoPegado.trim()?'':'disabled'} onclick="revisarNotasDesdeExcel()">Revisar</button>
    </div>`;
  openModal();
}

function revisarNotasDesdeExcel(){
  const caja=document.getElementById('m-excel-texto');
  excelTextoPegado=String((caja&&caja.value)||'').slice(0,EXCEL_MAX_TEXTO);
  const notas=excelExtraer(excelTextoPegado);
  const aviso=document.getElementById('m-excel-aviso');
  if(!notas.length){
    if(aviso)aviso.textContent='No encontramos notas. Copia también la columna con el nombre de cada evaluación.';
    return;
  }
  excelBorrador={notas:excelCalzar(notas,S.ramos)};
  renderRevisionExcel();
}

function renderRevisionExcel(){
  if(!excelBorrador)return;
  const calzadas=excelBorrador.notas;
  const nombreRamo=id=>{const r=S.ramos.find(x=>x.id===id);return r?r.nombre:'';};
  const lista=calzadas.filter(n=>n.estado==='lista');
  const porRamo=new Map();
  lista.forEach(n=>{if(!porRamo.has(n.ramoId))porRamo.set(n.ramoId,[]);porRamo.get(n.ramoId).push(n);});
  // El mismo nombre que la ficha le da a cada casilla («Control 2»).
  const destino=n=>{
    const ramo=S.ramos.find(r=>r.id===n.ramoId);
    const cat=((ramo&&ramo.categorias)||[]).find(c=>c.id===n.catId);
    if(!cat)return '';
    return n.casilla?etiquetaCasilla(ramo,cat,n.casilla-1):cat.nombre;
  };
  const filasListas=[...porRamo].map(([id,ns])=>`<section class="excel-ramo"><h3>${esc(nombreRamo(id))}</h3><ul>${ns.map(n=>`
      <li><span>${esc(destino(n))}${normName(destino(n))!==normName(n.evaluacion)?` <small>(${esc(n.evaluacion)})</small>`:''}</span><b>${fmtNota(n.valor)}</b></li>`).join('')}</ul></section>`).join('');
  const sinEval=calzadas.filter(n=>n.estado==='sin_evaluacion');
  const filasSinEval=sinEval.map(n=>{
    const ramo=S.ramos.find(r=>r.id===n.ramoId);
    return `<li><label for="m-excel-cat-${n.i}">${esc(ramo.nombre)} · ${esc(n.evaluacion)} <b>${fmtNota(n.valor)}</b></label>
      <select id="m-excel-cat-${n.i}" onchange="asignarNotaExcel(${n.i},this.value)">
        <option value="">No agregar</option>${(ramo.categorias||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}
      </select></li>`;
  }).join('');
  const sinRamo=calzadas.filter(n=>n.estado==='sin_ramo');
  const ramosSinCalce=[...new Set(sinRamo.map(n=>n.ramo||'Sin ramo'))];
  const total=lista.length;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Revisa antes de guardar</div>
    ${filasListas||'<p class="modal-desc">Ninguna nota calzó sola con tus evaluaciones.</p>'}
    ${sinEval.length?`<section class="excel-ramo"><h3>Elige dónde va</h3><ul class="excel-asignar">${filasSinEval}</ul></section>`:''}
    ${ramosSinCalce.length?`<p class="settings-help">No encontramos ${ramosSinCalce.length===1?'este ramo':'estos ramos'} en tu semestre, así que no se agrega${sinRamo.length===1?'':'n'} ${sinRamo.length===1?'su nota':`sus ${sinRamo.length} notas`}: ${ramosSinCalce.map(esc).join(', ')}.</p>`:''}
    <p class="settings-help">Si una evaluación ya tiene nota, se queda como está.</p>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="abrirNotasDesdeExcel(true)">Atrás</button>
      <button type="button" class="btn-confirm" ${total?'':'disabled'} onclick="guardarNotasDesdeExcel()">${total?`Guardar ${total} nota${total!==1?'s':''}`:'Guardar'}</button>
    </div>`;
}

function asignarNotaExcel(i,catId){
  const n=excelBorrador&&excelBorrador.notas.find(x=>x.i===i);
  if(!n)return;
  if(catId){n.catId=catId;n.casilla=null;n.estado='lista';n.asignada=true;}
  else{n.catId=null;n.estado='sin_evaluacion';}
  renderRevisionExcel();
}

function guardarNotasDesdeExcel(){
  if(!excelBorrador)return;
  const calzadas=excelBorrador.notas;
  const {puestas,ocupadas}=excelAplicar(calzadas,S.ramos);
  excelBorrador=null;excelTextoPegado='';
  save();
  track('notas_excel_guardadas',{notas:puestas,ocupadas,asignadas:calzadas.filter(n=>n.asignada).length,
    sin_calce:calzadas.filter(n=>n.estado!=='lista').length});
  closeModal();
  renderHome();
  if(typeof renderAgenda==='function')renderAgenda();
  showToast(puestas?`${puestas} nota${puestas!==1?'s':''} guardada${puestas!==1?'s':''}${ocupadas?`; ${ocupadas} ya tenía${ocupadas!==1?'n':''} nota`:''}`
    :'No se guardó ninguna: esas evaluaciones ya tenían nota',!puestas);
}
