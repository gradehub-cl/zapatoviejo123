function extraerCodigosHorarioBuscacursos(texto){
  const encontrados=new Map(),conSeccion=new Set();
  // Incluye las siglas atípicas que existen en el catálogo oficial: EDU21DC,
  // ESM01AD y UC_0001. La forma sola nunca autoriza un ramo: manda el catálogo.
  const patron=/(^|[^A-Z0-9_])([A-Z]{2,5}\d{2,4}[A-Z]{0,2}|UC_\d{4})(?:\s*[-‐‑‒–—]\s*(\d{1,3}))?(?![A-Z0-9_])/gi;
  for(const match of String(texto||'').matchAll(patron)){
    const sigla=match[2].toUpperCase();
    const seccion=match[3]===undefined?null:seccionValida(Number(match[3]));
    if(match[3]!==undefined&&seccion===null)continue;
    if(seccion!==null)conSeccion.add(sigla);
    const clave=sigla+'-'+(seccion??'');
    if(!encontrados.has(clave))encontrados.set(clave,{sigla,seccion});
  }
  return [...encontrados.values()].filter(r=>r.seccion!==null||!conSeccion.has(r.sigla));
}

// Lo que el lector confunde en un pantallazo: un uno o una barra por una I, un
// cero por una O ("1IC2233" es IIC2233), y al revés en los números ("MAT161O"
// es MAT1610). Solo se corrige algo con forma de sigla UC —tres letras y tres
// o cuatro cifras, con al menos dos letras de verdad— y el resto del texto no
// se toca. Corregir no autoriza nada: la sigla igual tiene que existir en el
// catálogo para proponerse.
function normalizarTextoOcrHorario(texto){
  return String(texto||'').toUpperCase().replace(/(^|[^A-Z0-9_])([A-Z01|]{3})([0-9OIL|]{3}[0-9OIL|D]?)([A-Z]?)(?=$|[^A-Z0-9_])/g,
    (m,antes,letras,num,extra)=>/[A-Z].*[A-Z]/.test(letras)&&/\d/.test(num)
      ?antes+letras.replace(/[1|]/g,'I').replace(/0/g,'O')+num.replace(/[OD]/g,'0').replace(/[IL|]/g,'1')+extra:m);
}
// La L y la I también se confunden entre letras ("LIC2233"). Si la sigla leída
// no existe, se prueban esos cambios y se acepta solo si UNA variante existe
// en el catálogo: con dos candidatas, adivinar sería inventar el ramo.
function siglaOcrEnCatalogo(sigla,existe){
  if(existe(sigla))return sigla;
  const m=/^([A-Z]{2,5})(.*)$/.exec(sigla);
  if(!m||!/[IL]/.test(m[1]))return sigla;
  const letras=[...m[1]],pos=letras.map((c,i)=>c==='I'||c==='L'?i:-1).filter(i=>i>=0);
  const halladas=new Set();
  for(let mask=1;mask<(1<<pos.length);mask++){
    const v=letras.slice();
    pos.forEach((i,b)=>{if(mask&(1<<b))v[i]=v[i]==='I'?'L':'I';});
    const cand=v.join('')+m[2];
    if(existe(cand))halladas.add(cand);
  }
  return halladas.size===1?[...halladas][0]:sigla;
}

// ─── LEER EL HORARIO DESDE UNA FOTO ─────────────────────────────────────────
//
// Nadie tiene su horario como texto: lo tiene como pantallazo. La foto se lee
// EN EL TELÉFONO con Tesseract.js, servido desde /ocr/ en este mismo dominio:
// la imagen no sale del dispositivo y no hay un tercero que la vea. Se baja
// solo cuando alguien elige una foto (unos 7 MB la primera vez, después queda
// en caché). Lo leído pasa por el mismo camino que el texto pegado: solo se
// proponen siglas del catálogo UC y nada se agrega sin que la persona lo marque.
// Compilar WebAssembly exige 'wasm-unsafe-eval' en la CSP (_headers).
const OCR_BASE='/ocr/';
let _tesseractCargando=null;
function cargarTesseract(){
  if(window.Tesseract)return Promise.resolve(true);
  if(_tesseractCargando)return _tesseractCargando;
  _tesseractCargando=new Promise(resolve=>{
    const s=document.createElement('script');
    s.src=OCR_BASE+'tesseract.min.js';
    s.onload=()=>resolve(!!window.Tesseract);
    s.onerror=()=>{_tesseractCargando=null;resolve(false);};
    document.head.appendChild(s);
  });
  return _tesseractCargando;
}
// Módulo mínimo con una instrucción SIMD: si el navegador lo valida, se usa el
// motor SIMD, que lee bastante más rápido. Si no, el normal.
function wasmSimdDisponible(){
  try{return typeof WebAssembly==='object'&&WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));}
  catch(e){return false;}
}
// Una foto de 12 MP no lee mejor que una de 2.400 px y en un iPhone puede
// quedarse sin memoria. Al revés, un pantallazo chico (de computador, a 1x)
// tiene letras de pocos píxeles y el lector confunde más: se agranda al doble.
//
// Devuelve dos versiones: la imagen tal cual y una en blanco y negro. En Mi UC
// las siglas son azules sobre celdas naranjas, celestes y verdes, y con ese
// contraste el lector casi no lee nada; en blanco y negro, los fondos y la
// grilla desaparecen y quedan las letras. Pero en un pantallazo limpio la
// versión en blanco y negro lee PEOR, así que se leen las dos y se juntan.
const OCR_UMBRAL_BN=0.55;
async function imagenesParaOcr(file){
  const LADO=2400,CHICO=1400;
  try{
    if(typeof createImageBitmap!=='function')return [file];
    const bmp=await createImageBitmap(file);
    const lado=Math.max(bmp.width,bmp.height);
    const escala=lado>LADO?LADO/lado:lado<CHICO?2:1;
    const c=document.createElement('canvas');
    c.width=Math.round(bmp.width*escala);c.height=Math.round(bmp.height*escala);
    const ctx2d=c.getContext('2d');
    ctx2d.drawImage(bmp,0,0,c.width,c.height);
    bmp.close&&bmp.close();
    const aBlob=()=>new Promise(r=>c.toBlob(b=>r(b),'image/png'));
    const original=escala===1?file:(await aBlob())||file;
    const img=ctx2d.getImageData(0,0,c.width,c.height),d=img.data,corte=OCR_UMBRAL_BN*255;
    for(let i=0;i<d.length;i+=4){
      const v=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])<corte?0:255;
      d[i]=d[i+1]=d[i+2]=v;
    }
    ctx2d.putImageData(img,0,0);
    const bn=await aBlob();
    return bn?[original,bn]:[original];
  }catch(e){return [file];}
}
async function leerFotoOcr(file,progreso){
  if(!await cargarTesseract())throw new Error('ocr-no-carga');
  const base=new URL(OCR_BASE,location.href).href;
  let paso=0,pasos=1;
  const worker=await window.Tesseract.createWorker('eng',1,{
    workerPath:base+'worker.min.js',
    corePath:base+(wasmSimdDisponible()?'tesseract-core-simd-lstm.wasm.js':'tesseract-core-lstm.wasm.js'),
    langPath:base.replace(/\/$/,''),
    workerBlobURL:false,
    logger:m=>{if(progreso&&m&&m.status==='recognizing text'&&typeof m.progress==='number')progreso((paso+m.progress)/pasos);},
  });
  try{
    // tesseract.js usa por defecto un solo bloque de texto (modo 6). Un
    // horario es una grilla, y el modo automático (3) la lee bastante mejor:
    // con el 6, un pantallazo de celular perdía ramos y cambiaba secciones.
    await worker.setParameters({tessedit_pageseg_mode:'3'});
    const imagenes=await imagenesParaOcr(file);
    pasos=imagenes.length;
    const lecturas=[];
    for(;paso<imagenes.length;paso++){
      const {data}=await worker.recognize(imagenes[paso],{},{text:true,blocks:true});
      lecturas.push({texto:(data&&data.text)||'',palabras:palabrasDeLectura(data)});
    }
    return lecturas;
  }finally{try{await worker.terminate();}catch(e){}}
}

// Cada palabra con su caja en la imagen. Sin cajas (otra versión del lector),
// queda la lectura de corrido.
function palabrasDeLectura(data){
  const out=[];
  try{
    (data&&data.blocks||[]).forEach(bl=>(bl.paragraphs||[]).forEach(pa=>(pa.lines||[]).forEach(li=>(li.words||[]).forEach(w=>{
      if(w&&typeof w.text==='string'&&w.bbox)out.push({texto:w.text,x0:w.bbox.x0,y0:w.bbox.y0,x1:w.bbox.x1,y1:w.bbox.y1});
    }))));
  }catch(e){}
  return out;
}

// De las lecturas de una foto, un código por ramo, con su sección.
//
// En Mi UC "MAT1620-2" no cabe en la celda: la sigla queda en una línea y el 2
// en la de abajo. Leído de corrido, el 2 se pierde o se junta con el número de
// módulo de la fila ("MAT1620-9"). Con las cajas de cada palabra, la sección
// es el número que está JUSTO DEBAJO de la sigla y dentro de su ancho, que es
// como lo ve una persona. Sin cajas, solo cuenta una sección en la misma
// línea que la sigla.
//
// Cada ramo aparece varias veces en la grilla, así que se vota: gana la
// sección que más se repite, y con empate el ramo va SIN sección. Una sección
// inventada es peor que una que falta.
//
// La FEN separa la sección con barra ("ENMEM1505/02"): también vale.
const SIGLA_FOTO_RE=/^([A-Z]{2,5}\d{2,4}[A-Z]{0,2}|UC_\d{4})([-‐‑‒–—/](\d{1,3})?)?$/;
const PATRON_SIGLA_FOTO=/(^|[^A-Z0-9_])([A-Z]{2,5}\d{2,4}[A-Z]{0,2}|UC_\d{4})(?:[ \t]*[-‐‑‒–—/][ \t]*(\d{1,3}))?(?![A-Z0-9_])/g;
function seccionDebajo(p,palabras){
  const alto=Math.max(1,p.y1-p.y0);
  const debajo=palabras.filter(q=>q!==p&&/^\d{1,3}$/.test(q.texto.trim())
    &&q.y0>=p.y1-alto*0.3&&q.y0<=p.y1+alto*1.2
    &&(q.x0+q.x1)/2>=p.x0&&(q.x0+q.x1)/2<=p.x1);
  debajo.sort((a,b)=>a.y0-b.y0);
  return debajo.length?seccionValida(Number(debajo[0].texto.trim())):null;
}
function codigosDeFotoHorario(lecturas,existe){
  const votos=new Map();
  const anotar=(sigla,seccion)=>{
    if(existe)sigla=siglaOcrEnCatalogo(sigla,existe);
    if(!votos.has(sigla))votos.set(sigla,new Map());
    if(seccion!==null&&seccion!==undefined)votos.get(sigla).set(seccion,(votos.get(sigla).get(seccion)||0)+1);
  };
  for(const l of [].concat(lecturas||[])){
    const lectura=typeof l==='string'?{texto:l,palabras:[]}:(l||{});
    const palabras=Array.isArray(lectura.palabras)?lectura.palabras:[];
    if(palabras.length){
      for(const p of palabras){
        const t=normalizarTextoOcrHorario(String(p.texto||'').replace(/[.,;:)\]]+$/,'')).trim();
        const m=SIGLA_FOTO_RE.exec(t);
        if(!m)continue;
        const seccion=m[3]!==undefined?seccionValida(Number(m[3])):m[2]?seccionDebajo(p,palabras):null;
        anotar(m[1],seccion);
      }
    }else{
      for(const m of normalizarTextoOcrHorario(lectura.texto).matchAll(PATRON_SIGLA_FOTO))
        anotar(m[2],m[3]===undefined?null:seccionValida(Number(m[3])));
    }
  }
  return [...votos].map(([sigla,v])=>{
    const orden=[...v].sort((a,b)=>b[1]-a[1]);
    const seccion=orden.length&&(orden.length===1||orden[0][1]>orden[1][1])?orden[0][0]:null;
    return {sigla,seccion};
  });
}
const FOTO_HORARIO_MAX=20*1024*1024;
let _horarioLeyendoFoto=false;
// Calificar puede aprovechar la lectura sin abrir la importación de ramos.
// Sin callback sigue el flujo de Agregar ramo y del menú del perfil.
async function leerFotoHorario(input,alLeer=reconocerHorarioBuscacursos){
  const file=input&&input.files&&input.files[0];
  const estado=document.getElementById('m-horario-estado');
  if(!file||!estado)return false;
  if(_horarioLeyendoFoto){estado.textContent='Estamos terminando de leer la foto anterior. Intenta de nuevo en un momento.';input.value='';return false;}
  if(!/^image\//.test(file.type||'')){estado.textContent='Elige una imagen: un pantallazo o una foto de tu horario.';input.value='';return false;}
  if(file.size>FOTO_HORARIO_MAX){estado.textContent='Esa imagen pesa demasiado. Prueba con un pantallazo del horario.';input.value='';return false;}
  _horarioLeyendoFoto=true;input.disabled=true;
  estado.textContent='Preparando el lector… la primera vez se bajan unos 7 MB.';
  let lecturas;
  try{
    lecturas=await leerFotoOcr(file,p=>{
      if(document.getElementById('m-horario-estado')===estado)estado.textContent=`Leyendo tu horario… ${Math.round(p*100)}%`;
    });
  }catch(e){
    if(document.getElementById('m-horario-estado')===estado)
      estado.textContent='No pudimos leer la foto. Revisa tu conexión e intenta de nuevo.';
    return false;
  }finally{_horarioLeyendoFoto=false;input.disabled=false;input.value='';}
  // Si cerró el modal mientras se leía, lo leído no abre nada.
  if(document.getElementById('m-horario-estado')!==estado)return false;
  track('horario_foto_leida');
  return alLeer(lecturas);
}
