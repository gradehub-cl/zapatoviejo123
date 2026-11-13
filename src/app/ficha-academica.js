// ─── SUBIR LA FICHA ACADÉMICA (PDF) ─────────────────────────────────────────
// La ficha académica acumulada de la UC trae una fila por ramo con sigla,
// sección, créditos, nombre, nota, semestre y año. Es más limpia que el avance
// curricular, que ordena por requisito de la malla y se desarma al copiarla.
//
// El PDF se lee en el teléfono con pdf.js, servido desde /pdf/ en este mismo
// dominio, y no sale del dispositivo. Del documento solo se usan sigla,
// créditos, nota y semestre: el nombre del estudiante y el RUT que trae el
// encabezado no se leen ni se guardan. Lo leído pasa por la misma revisión
// que el avance pegado (`revisarFilasAvance`) y nada se agrega sin confirmar.
//
// La UC entrega el PDF cifrado con contraseña de dueño vacía (solo restringe
// imprimir o editar). pdf.js lo abre igual; un lector hecho a mano no podría.
const PDF_BASE='/pdf/';
let _pdfjsCargando=null;
function cargarPdfJs(){
  if(!_pdfjsCargando){
    _pdfjsCargando=import(PDF_BASE+'pdf.min.mjs').then(m=>{
      m.GlobalWorkerOptions.workerSrc=PDF_BASE+'pdf.worker.min.mjs';
      return m;
    }).catch(()=>{_pdfjsCargando=null;return null;});
  }
  return _pdfjsCargando;
}

// pdf.js entrega trozos de texto con su posición. Los que comparten altura
// (±2 puntos) son una fila; se ordenan de izquierda a derecha y se separan con
// tabulador, que es como se ve una tabla copiada.
function lineasDeItemsPdf(items){
  const filas=[];
  for(const it of items||[]){
    const texto=String(it&&it.str||'').trim();
    if(!texto||!Array.isArray(it.transform))continue;
    const x=Number(it.transform[4]),y=Number(it.transform[5]);
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    let fila=filas.find(f=>Math.abs(f.y-y)<=2);
    if(!fila){fila={y,celdas:[]};filas.push(fila);}
    fila.celdas.push({x,texto});
  }
  return filas.sort((a,b)=>b.y-a.y).map(f=>f.celdas.sort((a,b)=>a.x-b.x).map(c=>c.texto).join('\t'));
}

// SIGLA · [SECCIÓN] · CRÉDITOS · NOMBRE · [NOTA] · SEM. · AÑO · [(convalidación)]
// La sección falta en exámenes como el de inglés y la nota falta en lo que se
// está cursando. Una nota con letra (A, C, R, P/I) no es un promedio y no entra.
const FILA_FICHA_RE=/^([A-Z]{2,5}\d{2,4}[A-Z]{0,2})\t(?:(\d{1,3})\t)?(\d{1,3})\t([^\t]+)\t(?:([^\t]+)\t)?([^\t]+)\t(20\d{2})(?:\t\((\d)\))?$/;
function leerFichaAcademica(lineas){
  const filas=[],vistos=new Set();
  let omitidos=0;
  for(const linea of lineas||[]){
    const m=FILA_FICHA_RE.exec(String(linea||'').trim());
    if(!m)continue;
    const [,sigla,,creditosTxt,nombre,notaTxt,semTxt,anio,convalidacion]=m;
    // Sin nota: el ramo se está cursando. No es historial.
    if(!notaTxt)continue;
    const nota=/^[1-7][.,]\d$/.test(notaTxt)?Number(notaTxt.replace(',','.')):null;
    const creditos=Number(creditosTxt);
    // Convalidado, aprobado con letra o sin créditos (ECE, inglés, Ruta Novata):
    // no va al promedio. Se cuenta para decir cuántos quedaron fuera.
    if(convalidacion||nota===null||nota>7||!creditos){omitidos++;continue;}
    // Solo 1 y 2 son semestres que conocemos. Otro código queda sin semestre y
    // la revisión lo muestra bloqueado, en vez de adivinar dónde va.
    const periodo=semTxt==='1'||semTxt==='2'?etiquetaSemestre(anio,semTxt):null;
    const clave=sigla+'|'+periodo;
    if(vistos.has(clave))continue;
    vistos.add(clave);
    filas.push({sigla,nombre:nombre.trim(),nota,creditos,periodo});
  }
  return {filas,omitidos};
}

async function lineasDePdf(archivo,pdfjs,{metadatos=false,maxPaginas=10,pararConTexto=false}={}){
  const data=new Uint8Array(await archivo.arrayBuffer());
  const doc=await pdfjs.getDocument({data,isEvalSupported:false,disableFontFace:true}).promise;
  const lineas=[],paginas=doc.numPages;
  try{
    // Una ficha tiene una o dos páginas; el tope evita colgar el teléfono con
    // un PDF que no es la ficha.
    for(let p=1;p<=Math.min(doc.numPages,maxPaginas);p++){
      const pagina=await doc.getPage(p);
      lineas.push(...lineasDeItemsPdf((await pagina.getTextContent()).items));
      if(pararConTexto&&lineas.some(l=>l.trim()))break;
    }
  }finally{doc.destroy();}
  return metadatos?{lineas,paginas}:lineas;
}

function esSeguimientoCurricular(lineas,nombre){
  return /^SC-/i.test(String(nombre||''))||(lineas||[]).slice(0,6).some(l=>/SEGUIMIENTO CURRICULAR/i.test(l));
}

const FICHA_PDF_MAX=5*1024*1024;
async function subirFichaAcademica(input){
  const archivo=input&&input.files&&input.files[0];
  const aviso=document.getElementById('m-avance-aviso');
  const decir=t=>{if(aviso)aviso.textContent=t;};
  if(!archivo)return;
  input.value='';
  if(archivo.size>FICHA_PDF_MAX||!/pdf$/i.test(archivo.type||archivo.name)){
    decir('Ese archivo no es la ficha en PDF. Descárgala de nuevo desde el portal.');
    return;
  }
  decir('Leyendo tu ficha…');
  const pdfjs=await cargarPdfJs();
  if(!pdfjs){decir('No pudimos abrir el lector de PDF. Revisa tu conexión e inténtalo de nuevo.');return;}
  let lineas;
  try{lineas=await lineasDePdf(archivo,pdfjs);}
  catch(e){decir('No pudimos leer ese PDF. Descarga la ficha de nuevo e inténtalo otra vez.');return;}
  const {filas,omitidos}=leerFichaAcademica(lineas);
  if(!filas.length){
    // El «Seguimiento Curricular» (SC-….pdf) se descarga desde el mismo lugar y
    // con el mismo botón: es el error más probable, así que se nombra.
    decir(esSeguimientoCurricular(lineas,archivo.name)
      ?'Ese es el Seguimiento Curricular. Vuelve, elige la pestaña «Ficha Académica Acumulada» y descárgala (el archivo empieza con FAA).'
      :'No encontramos ramos con nota. Sube la ficha académica acumulada (el archivo empieza con FAA).');
    return;
  }
  await revisarFilasAvance(filas,omitidos,()=>!!document.getElementById('m-avance-ficha'));
}
