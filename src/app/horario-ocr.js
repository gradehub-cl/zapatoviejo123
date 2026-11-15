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
    // En Mi UC el tipo de clase va SOLO en el color de la celda: se guarda una
    // copia de los colores antes de pasar a blanco y negro.
    const pixeles={ancho:c.width,alto:c.height,datos:new Uint8ClampedArray(d)};
    for(let i=0;i<d.length;i+=4){
      const v=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])<corte?0:255;
      d[i]=d[i+1]=d[i+2]=v;
    }
    ctx2d.putImageData(img,0,0);
    const bn=await aBlob();
    return Object.assign(bn?[original,bn]:[original],{pixeles});
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
      lecturas.push({texto:(data&&data.text)||'',palabras:palabrasDeLectura(data),pixeles:imagenes.pixeles||null});
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
// ─── LA GRILLA: DÍAS, MÓDULOS Y TIPO ────────────────────────────────────────
//
// «Carga Académica» de Mi UC es una grilla: los días arriba (el sábado puede
// salir cortado), y a la izquierda la columna Módulo, con el número y las horas.
// Cada celda trae solo «MAT1610-» y la sección en la línea de abajo; el tipo de
// clase va SOLO en el color de fondo, según la leyenda de arriba (Cátedra
// naranjo, Ayudantía verde, Laboratorio celeste…). La foto no trae sala: esa
// sale de BuscaCursos (proponerHorarioDesdeCatalogo) o la pone la persona.
// Sin una grilla reconocible —sin encabezado de días o sin dos filas de
// módulos— no se propone nada: un horario inventado es peor que uno que falta.
// Las horas salen SOLO de la tabla oficial de módulos (horarioDesdeModulos).
const DIAS_FOTO={LUNES:'L',LUN:'L',MARTES:'M',MAR:'M',MIERCOLES:'W',MIER:'W',MIE:'W',
  JUEVES:'J',JUE:'J',VIERNES:'V',VIE:'V',SABADO:'S',SAB:'S'};
const LETRAS_DIA_FOTO={L:'L',M:'M',W:'W',J:'J',V:'V',S:'S'};
// El tipo se guarda con la palabra que usa el estudiante; el widget lo muestra
// tal cual ("Sala K201 · Cátedra"). Por si la celda lo trae escrito.
const TIPOS_FOTO={CLAS:'Cátedra',CLASE:'Cátedra',CAT:'Cátedra',CATEDRA:'Cátedra',
  AYUD:'Ayudantía',AYU:'Ayudantía',AYUDANTIA:'Ayudantía',
  LAB:'Laboratorio',LABT:'Laboratorio',LABORATORIO:'Laboratorio',
  TAL:'Taller',TALL:'Taller',TALLER:'Taller'};
// La leyenda de Mi UC. Los colores de respaldo se midieron en la leyenda de un
// pantallazo de iPhone (2026-11-15); si la foto trae su leyenda, mandan los
// colores de esa misma foto. "Otro" no es un tipo que valga la pena guardar.
const LEYENDA_FOTO={CATEDRA:'Cátedra',AYUDANTIA:'Ayudantía',LABORATORIO:'Laboratorio',TALLER:'Taller',
  PRACTICA:'Práctica',TESIS:'Tesis',TERRENO:'Terreno',OTRO:'Otro'};
const COLORES_TIPO_UC=[['Cátedra',[250,197,115]],['Ayudantía',[151,203,153]],['Laboratorio',[179,212,244]],
  ['Taller',[199,195,249]],['Práctica',[204,203,154]],['Tesis',[178,240,239]],['Terreno',[255,203,255]],['Otro',[255,154,152]]];
const textoGrillaFoto=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
  .toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g,'');
const ordenDiaFoto=d=>DIAS_HORARIO.findIndex(([k])=>k===d);
// Una sala UC tiene letras y número ("K201", "BC25", "AP-101"). Un número
// solo es la sección que quedó debajo de la sigla, no una sala.
const SALA_FOTO_RE=/^[A-Z]{1,4}-?\d{1,4}[A-Z]?$/;
function grillaDeFotoHorario(palabras,tenant){
  const tabla=MODULOS_HORARIO_POR_TENANT[tenant];
  if(!tabla||!Array.isArray(palabras)||!palabras.length)return null;
  const inicios=new Map(Object.entries(tabla).map(([m,[ini]])=>[ini,Number(m)]));
  const cx=p=>(p.x0+p.x1)/2,cy=p=>(p.y0+p.y1)/2;
  const candidatos=[];
  palabras.forEach(p=>{
    const t=textoGrillaFoto(p.texto);
    // "Sábad": el pantallazo suele cortar la última columna.
    const d=DIAS_FOTO[t]||(/^SABA/.test(t)?'S':null)||(t.length===1?LETRAS_DIA_FOTO[t]:null);
    if(d)candidatos.push({d,x:cx(p),y:cy(p),h:Math.max(1,p.y1-p.y0),letra:t.length===1});
  });
  // El encabezado es la línea con más días distintos.
  let encabezado=null;
  candidatos.forEach(c=>{
    const dias=new Map();
    candidatos.filter(o=>Math.abs(o.y-c.y)<=Math.max(c.h,o.h)*0.8).sort((a,b)=>a.x-b.x)
      .forEach(o=>{if(!dias.has(o.d))dias.set(o.d,o);});
    if(!encabezado||dias.size>encabezado.size)encabezado=dias;
  });
  if(!encabezado)return null;
  const cols=[...encabezado.values()].sort((a,b)=>a.x-b.x);
  // Tres días con nombre, o cuatro letras sueltas: una "M" sola puede ser cualquier cosa.
  if(cols.length<(cols.every(c=>c.letra)?4:3))return null;
  for(let i=1;i<cols.length;i++)if(ordenDiaFoto(cols[i].d)<=ordenDiaFoto(cols[i-1].d))return null;
  const ultima=cols[cols.length-1];
  const paso=(ultima.x-cols[0].x)/Math.max(1,ordenDiaFoto(ultima.d)-ordenDiaFoto(cols[0].d));
  const bajoEncabezado=Math.max(...cols.map(c=>c.y+c.h/2));
  const margen=cols[0].x-paso*0.5;
  // Filas: a la izquierda de la primera columna, el número del módulo o su
  // hora de inicio ("8:20", "08:20 - 09:30"). La hora de término no es inicio
  // de ningún módulo, así que no se confunde.
  const ys=new Map();
  palabras.forEach(p=>{
    if(cx(p)>=margen||cy(p)<=bajoEncabezado)return;
    const t=String(p.texto||'').trim();
    const hora=/^(\d{1,2})[:.](\d{2})/.exec(t);
    let n=null;
    if(hora)n=inicios.get(hora[1].padStart(2,'0')+':'+hora[2])||null;
    else if(/^\d$/.test(t)&&tabla[t])n=Number(t);
    if(n){if(!ys.has(n))ys.set(n,[]);ys.get(n).push(cy(p));}
  });
  const filas=[...ys].map(([mod,v])=>({mod,y:v.reduce((s,x)=>s+x,0)/v.length})).sort((a,b)=>a.y-b.y);
  if(!filas[1])return null;
  // Las filas forman una recta (y = base + alto·módulo). Con la mediana, una
  // hora mal leída ("08:40" por "09:40") o una que falta no corre las demás:
  // la fila se ubica igual por su posición.
  const mediana=v=>{const o=[...v].sort((a,b)=>a-b);return o[Math.floor(o.length/2)];};
  const pares=[];
  filas.forEach((f,i)=>filas.slice(i+1).forEach(o=>{if(o.mod!==f.mod)pares.push((o.y-f.y)/(o.mod-f.mod));}));
  const alto=mediana(pares);
  if(!(alto>0))return null;
  const baseFilas=mediana(filas.map(f=>f.y-alto*f.mod));
  if(!filas.filter(f=>Math.abs(f.y-baseFilas-alto*f.mod)<=alto*0.35)[1])return null;
  return {paso,alto,bajoEncabezado,
    // Posición de y en módulos: 2,0 es justo a la altura del rótulo del 2.
    fila(y){return (y-baseFilas)/alto;},
    dia(x){
      let mejor=null;
      cols.forEach(c=>{const dist=Math.abs(x-c.x);if(dist<=paso*0.55&&(!mejor||dist<mejor.dist))mejor={d:c.d,dist};});
      if(mejor)return mejor.d;
      // Una columna cuyo encabezado no se leyó se ubica por el paso entre días.
      const i=Math.round(ordenDiaFoto(cols[0].d)+(x-cols[0].x)/paso),d=(DIAS_HORARIO[i]||[])[0];
      return d&&d!=='D'&&!encabezado.has(d)&&Math.abs(x-(cols[0].x+(i-ordenDiaFoto(cols[0].d))*paso))<=paso*0.4?d:null;
    },
    // `desfase`: dónde va la primera sigla de una celda respecto del rótulo
    // de su fila (la hora puede ir centrada y la sigla arriba). La celda va
    // desde esa altura hacia abajo: así un segundo ramo en la misma celda
    // (tope) sigue en su fila. Sin desfase, manda el rótulo más cercano.
    modulo(y,desfase=null){
      const v=(y-baseFilas)/alto,m=desfase==null?Math.round(v):Math.floor(v-desfase+0.25);
      return tabla[m]?m:null;
    },
  };
}
// Color promedio de un cuadrito de la foto, o null fuera de la imagen.
function colorFoto(px,x,y,r=2){
  if(!px||!px.datos)return null;
  x=Math.round(x);y=Math.round(y);
  if(x-r<0||y-r<0||x+r>=px.ancho||y+r>=px.alto)return null;
  const s=[0,0,0];let n=0;
  for(let j=y-r;j<=y+r;j++)for(let i=x-r;i<=x+r;i++){const k=(j*px.ancho+i)*4;s[0]+=px.datos[k];s[1]+=px.datos[k+1];s[2]+=px.datos[k+2];n++;}
  return s.map(v=>v/n);
}
// Los colores de Mi UC son pasteles: celeste (laboratorio) y lila (taller)
// quedan cerca en RGB y una muestra un poco desteñida los confunde. Se compara
// el TINTE (el color menos su componente más baja), que separa bien los ocho
// tipos, y el brillo pesa poco.
const tinteColor=c=>{const m=Math.min(...c);return c.map(v=>v-m);};
const distanciaTinte=(a,b)=>{const ta=tinteColor(a),tb=tinteColor(b);
  return Math.hypot(ta[0]-tb[0],ta[1]-tb[1],ta[2]-tb[2])+Math.abs((a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]))/12;};
const colorConTinte=c=>Math.max(...c)-Math.min(...c)>=25;
// Los colores de la leyenda: el cuadrito a la izquierda de cada palabra, por
// encima del encabezado de días. Con menos de tres, la paleta de respaldo.
function paletaDeFoto(palabras,px,bajoEncabezado){
  const leidos=new Map();
  palabras.forEach(p=>{
    const tipo=LEYENDA_FOTO[textoGrillaFoto(p.texto)];
    if(!tipo||leidos.has(tipo)||(p.y0+p.y1)/2>=bajoEncabezado)return;
    // El cuadrito está a la izquierda de la palabra. Su borde se mezcla con el
    // blanco, así que se recorre y se queda el punto con más tinte: el centro.
    const h=Math.max(1,p.y1-p.y0),y=(p.y0+p.y1)/2;
    let c=null;
    for(let f=0.3;f<=1.6;f+=0.1){
      const m=colorFoto(px,p.x0-h*f,y,1);
      if(m&&colorConTinte(m)&&(!c||Math.max(...m)-Math.min(...m)>Math.max(...c)-Math.min(...c)))c=m;
    }
    if(c)leidos.set(tipo,c);
  });
  return leidos.size>=3?[...leidos]:COLORES_TIPO_UC;
}
// El fondo de la celda alrededor de la sigla: a los lados de la sección, que
// va centrada debajo, y justo encima. Cada punto vota por el color de la
// leyenda más parecido; el texto y el fondo vacío (gris o blanco) no votan.
function tipoPorColorFoto(p,px,paleta){
  if(!px)return null;
  const w=p.x1-p.x0,h=Math.max(1,p.y1-p.y0);
  const puntos=[[p.x0+w*0.1,p.y1+h*0.55],[p.x1-w*0.1,p.y1+h*0.55],[p.x0+w*0.25,p.y1+h*0.55],[p.x1-w*0.25,p.y1+h*0.55],
    [p.x0+w*0.1,p.y0-h*0.2],[p.x1-w*0.1,p.y0-h*0.2]];
  const votos=new Map();
  puntos.forEach(([x,y])=>{
    const c=colorFoto(px,x,y,1);if(!c||!colorConTinte(c))return;
    let mejor=null;
    paleta.forEach(([tipo,ref])=>{const d=distanciaTinte(c,ref);if(d<=40&&(!mejor||d<mejor.d))mejor={tipo,d};});
    if(mejor)votos.set(mejor.tipo,(votos.get(mejor.tipo)||0)+1);
  });
  const orden=[...votos].sort((a,b)=>b[1]-a[1]);
  if(!orden.length||orden[0][1]<2||(orden[1]&&orden[1][1]===orden[0][1]))return null;
  return orden[0][0]==='Otro'?null:orden[0][0];
}
// Lo que acompaña a una sigla en su celda: las palabras de su misma columna,
// desde la sigla hacia abajo, hasta la próxima sigla o el fin de la fila.
function celdaDeSiglaFoto(p,anclas,palabras,g){
  const cx=q=>(q.x0+q.x1)/2,centro=cx(p);
  const enColumna=q=>Math.abs(cx(q)-centro)<=g.paso*0.5;
  const siguiente=anclas.filter(a=>a!==p&&enColumna(a)&&a.y0>p.y0).reduce((m,a)=>Math.min(m,a.y0),Infinity);
  const tope=Math.min(siguiente,p.y0+g.alto*0.9);
  return palabras.filter(q=>q!==p&&!anclas.includes(q)&&enColumna(q)&&q.y0>=p.y0-(p.y1-p.y0)*0.3&&q.y0<tope)
    .sort((a,b)=>a.y0-b.y0||a.x0-b.x0);
}
function tipoYSalaDeCelda(celda){
  let tipo=null,sala=null;
  celda.forEach((q,i)=>{
    const t=textoGrillaFoto(q.texto);
    if(!tipo&&TIPOS_FOTO[t]){tipo=TIPOS_FOTO[t];return;}
    // "Sala K201" o "Sala: 3": lo que sigue a la palabra Sala es la sala.
    if(t==='SALA'&&celda[i+1]){const s=String(celda[i+1].texto||'').replace(/^[(:\s]+|[).,;:\s]+$/g,'');if(!sala&&s&&s.length<=20)sala=s.toUpperCase();return;}
    if(!sala&&SALA_FOTO_RE.test(t)&&!/^\d+$/.test(t)&&!TIPOS_FOTO[t])sala=t;
  });
  return {tipo,sala};
}
// Las celdas de cada ramo: Map(sigla → [{dia, mod, tipo, sala}]), una por día
// y módulo. El tipo escrito en la celda manda; si no hay, el color. Con varias
// lecturas (la foto tal cual y en blanco y negro), una clase entra si aparece
// en al menos la mitad de las lecturas que encontraron grilla.
function celdasDeFotoHorario(lecturas,existe,tenant){
  const salida=new Map();
  if(!MODULOS_HORARIO_POR_TENANT[tenant])return salida;
  const votos=new Map();let conGrilla=0;
  for(const l of [].concat(lecturas||[])){
    const palabras=l&&Array.isArray(l.palabras)?l.palabras:[];
    const g=grillaDeFotoHorario(palabras,tenant);if(!g)continue;
    conGrilla++;
    const px=l.pixeles&&l.pixeles.datos?l.pixeles:null,paleta=px?paletaDeFoto(palabras,px,g.bajoEncabezado):null;
    // Ancla de una celda: una sigla con guion de sección o, con el catálogo a
    // mano, una que exista. "BC25" tiene forma de sigla, pero es una sala.
    const anclas=[],siglaDe=new Map();
    palabras.forEach(p=>{
      const t=normalizarTextoOcrHorario(String(p.texto||'').replace(/[.,;:)\]]+$/,'')).trim();
      let m=SIGLA_FOTO_RE.exec(t);
      // "11C1103-": con una sola letra de verdad, normalizar no se atreve. Con
      // el catálogo a mano, se prueba 1→I y 0→O en las letras y vale solo si
      // esa sigla existe.
      if(existe&&(!m||!existe(siglaOcrEnCatalogo(m[1],existe)))){
        const m2=SIGLA_FOTO_RE.exec(t.replace(/^[A-Z01|]{3}/,x=>x.replace(/[1|]/g,'I').replace(/0/g,'O')));
        if(m2&&existe(m2[1]))m=m2;
      }
      if(!m)return;
      const sigla=existe?siglaOcrEnCatalogo(m[1],existe):m[1];
      if(existe?!existe(sigla):!m[2])return;
      if((p.y0+p.y1)/2<=g.bajoEncabezado)return;
      anclas.push(p);siglaDe.set(p,sigla);
    });
    // Todas las celdas tienen el mismo diseño, así que todas las siglas están
    // corridas lo mismo respecto del rótulo de su fila. Ese corrimiento común
    // decide la fila de cada una, en vez de mirar cada sigla por separado.
    const restos=anclas.map(p=>{const v=g.fila((p.y0+p.y1)/2);return v-Math.round(v);}).sort((a,b)=>a-b);
    // Con menos de tres siglas no hay mayoría que lo diga: se usa el rótulo tal cual.
    const desfase=restos.length>=3?restos[Math.floor(restos.length/2)]:null;
    const vistos=new Set();
    anclas.forEach(p=>{
      const sigla=siglaDe.get(p),dia=g.dia((p.x0+p.x1)/2),mod=g.modulo((p.y0+p.y1)/2,desfase);
      if(!dia||!mod)return;
      const clave=sigla+'|'+dia+'|'+mod;
      if(vistos.has(clave))return;vistos.add(clave);
      const escrito=tipoYSalaDeCelda(celdaDeSiglaFoto(p,anclas,palabras,g));
      const tipo=escrito.tipo||(px?tipoPorColorFoto(p,px,paleta):null),sala=escrito.sala;
      if(!votos.has(sigla))votos.set(sigla,new Map());
      const v=votos.get(sigla),k=dia+'|'+mod;
      const previo=v.get(k)||{dia,mod,n:0,tipos:new Map(),salas:new Map()};
      previo.n++;
      if(tipo)previo.tipos.set(tipo,(previo.tipos.get(tipo)||0)+1);
      if(sala)previo.salas.set(sala,(previo.salas.get(sala)||0)+1);
      v.set(k,previo);
    });
  }
  const minimo=Math.max(1,Math.ceil(conGrilla/2));
  const masVotado=m=>{const o=[...m].sort((a,b)=>b[1]-a[1]);return o.length&&(o.length===1||o[0][1]>o[1][1])?o[0][0]:'';};
  votos.forEach((v,sigla)=>{
    const celdas=[...v.values()].filter(b=>b.n>=minimo).map(b=>({dia:b.dia,mod:b.mod,tipo:masVotado(b.tipos),sala:masVotado(b.salas)}));
    if(celdas.length)salida.set(sigla,celdas);
  });
  return salida;
}
// De celdas a bloques: cada bloque es un módulo; los días con el mismo módulo,
// tipo y sala van juntos (lunes y miércoles, módulo 1).
function bloquesDeCeldasHorario(tenant,celdas){
  const grupos=new Map();
  (celdas||[]).forEach(c=>{
    const k=c.mod+'|'+(c.tipo||'')+'|'+(c.sala||'');
    if(!grupos.has(k))grupos.set(k,{mod:c.mod,tipo:c.tipo||'',sala:c.sala||'',dias:[]});
    if(!grupos.get(k).dias.includes(c.dia))grupos.get(k).dias.push(c.dia);
  });
  return copiarHorario([...grupos.values()].sort((a,b)=>ordenDiaFoto(a.dias[0])-ordenDiaFoto(b.dias[0])||a.mod-b.mod)
    .flatMap(gr=>horarioDesdeModulos(tenant,gr.dias,[gr.mod],{sala:gr.sala,tipo:gr.tipo})));
}
// Map(sigla → bloques de horario) directo desde la foto, sin BuscaCursos.
function clasesDeFotoHorario(lecturas,existe,tenant){
  const salida=new Map();
  celdasDeFotoHorario(lecturas,existe,tenant).forEach((celdas,sigla)=>{
    const bloques=bloquesDeCeldasHorario(tenant,celdas);if(bloques.length)salida.set(sigla,bloques);
  });
  return salida;
}
// "2026 Primer Semestre" → "2026-1". Sirve para pedir a BuscaCursos el período
// de la foto y avisar si el pantallazo es de otro semestre.
function periodoDeFotoHorario(lecturas){
  for(const l of [].concat(lecturas||[])){
    const t=typeof l==='string'?l:(l&&l.texto)||'';
    const m=/(20\d\d)\s+(Primer|Segundo)\s+Semestre/i.exec(t);
    if(m)return m[1]+'-'+(/^p/i.test(m[2])?'1':'2');
  }
  return null;
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
