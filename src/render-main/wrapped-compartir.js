
// ─── Compartir: la hoja de respuestas como imagen de historia (1080×1920) ───
// Se dibuja en un canvas con las medidas de Figma (wrapped-concepto.md, 4b):
// cuadrícula de 72 px, márgenes de 96 px y la zona segura de las historias
// La imagen se compone exclusivamente con la leyenda pública de esta historia.
// Los nombres de estudiantes, ramos y evaluaciones quedan fuera del canvas.
function textoPlano(html){return new DOMParser().parseFromString(`<p>${html}</p>`,'text/html').body.textContent||'';}
async function imagenWrapped(s,conPromedio=false){
  const W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  const PAPEL='#F3EFE4',CUADRO='#D9D3C3',GRAFITO='#1D1D1F',GRIS='#4A4740',NARANJO='#FF9F3A';
  const fuente=(peso,px)=>`${peso} ${px}px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif`;
  const texto=(t,x,y,peso,px,color=GRAFITO,alinear='left')=>{ctx.fillStyle=color;ctx.font=fuente(peso,px);ctx.textAlign=alinear;ctx.fillText(t,x,y);ctx.textAlign='left';};
  const linea=(x1,y1,x2,y2,ancho)=>{ctx.strokeStyle=GRAFITO;ctx.lineWidth=ancho;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  // El resaltador: un trazo ondulado detrás de la mitad inferior del texto.
  const marca=(x,y,ancho,px,color)=>{
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.strokeStyle=color;ctx.lineWidth=px*.5;ctx.lineCap='butt';
    const yy=y-px*.2;ctx.beginPath();ctx.moveTo(x-12,yy+3);
    ctx.quadraticCurveTo(x+ancho*.25,yy-6,x+ancho*.5,yy+2);ctx.quadraticCurveTo(x+ancho*.75,yy+8,x+ancho+12,yy-2);
    ctx.stroke();ctx.restore();
  };
  ctx.fillStyle=PAPEL;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=CUADRO;
  for(let i=0;i<=W;i+=72)ctx.fillRect(i,0,2,H);
  for(let j=0;j<=H;j+=72)ctx.fillRect(0,j,W,2);
  const X=96,D=W-96,ANCHO=D-X;
  // Encabezado: «HOJA DE RESPUESTAS» y la marca, con doble raya debajo.
  texto('HOJA DE RESPUESTAS',X,298,800,40);
  texto('GradeHub',D,298,700,36,GRAFITO,'right');
  linea(X,330,D,330,2);linea(X,338,D,338,2);
  const etiqueta=(t,y,color=GRIS)=>texto(t,X,y,600,34,color);
  const [tema,dato,detalle]=s.compartible;
  etiqueta(WRAPPED_PERIODO,424);
  texto(tema,X,640,700,48);
  const partir=(cadena,peso,px)=>{
    ctx.font=fuente(peso,px);const lineas=[''];
    for(const palabra of cadena.split(' ')){
      const i=lineas.length-1,unida=[lineas[i],palabra].filter(Boolean).join(' ');
      if(lineas[i]&&ctx.measureText(unida).width>ANCHO)lineas.push(palabra);
      else lineas[i]=unida;
    }
    return lineas;
  };
  const lineas=partir(dato,850,100);
  lineas.forEach((linea,i)=>{
    const y=840+i*116;ctx.font=fuente(850,100);
    marca(X,y,ctx.measureText(linea).width,100,NARANJO);texto(linea,X,y,850,100);
  });
  partir(detalle,500,48).forEach((linea,i)=>texto(linea,X,940+lineas.length*116+i*66,500,48));
  // El dibujo usa exclusivamente el mismo dato que se acaba de revelar.
  const burbuja=(x,y,r,llena)=>{
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=GRAFITO;ctx.lineWidth=3;
    if(llena){ctx.fillStyle=GRAFITO;ctx.fill();}ctx.stroke();
  };
  if(Number.isFinite(s.fraccion)){
    linea(X,1400,D,1400,3);
    for(let i=0;i<=20;i++)linea(X+i*ANCHO/20,1400,X+i*ANCHO/20,i%5?1416:1434,3);
    burbuja(X+ANCHO*s.fraccion,1400,15,true);
  }else if(s.marcas){
    const n=Math.min(s.marcas,60),columnas=15;
    for(let i=0;i<Math.ceil(n/columnas)*columnas;i++)
      burbuja(X+18+i%columnas*59,1320+Math.floor(i/columnas)*40,13,i<n);
  }else{
    ctx.save();ctx.translate(D-150,1408);ctx.rotate(-.07);
    linea(-150,-44,150,-44,3);linea(-150,28,150,28,3);
    texto('ARCHIVADO',0,8,800,38,GRAFITO,'center');ctx.restore();
  }
  linea(X,1512,D,1512,3);
  if(s.tipo==='final'&&conPromedio&&s.big)texto(`Promedio del semestre ${s.big}`,X,1574,700,36);
  texto('gradehub.cl',D,1574,700,40,GRAFITO,'right');
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  return blob?new File([blob],'mi-semestre-gradehub.png',{type:'image/png'}):null;
}
function ofrecerHistoriaWrapped(s,caja){
  if(!s.compartible)return;
  const detalle=s.tipo==='goma'?'La imagen incluye tu mejor nota, sin identificar el ramo.':'';
  caja.insertAdjacentHTML('beforeend',`${detalle?`<p class="wrapped-pie">${detalle}</p>`:''}<button class="wrapped-compartir historia" type="button" disabled>${ICONO_COMPARTIR}<span>Preparando imagen…</span></button>`);
  prepararImagenWrapped(s);
  actualizarCompartirWrapped();
}
// Preparar fuera del gesto; el toque llama share directamente con un File listo.
function prepararImagenWrapped(s){
  if(_wrapped.imagen)return;
  const estado=_wrapped;
  // Mostrar u ocultar el promedio pide otra imagen: la anterior ya no vale, y
  // no puede llegar tarde y compartirse con la opción contraria.
  const pedido=estado.imagen=imagenWrapped(s,!!estado.conPromedio).catch(()=>null).then(async archivo=>{
    const vista=archivo?await vistaImagenWrapped(archivo):null;
    if(_wrapped!==estado||estado.imagen!==pedido)return;
    estado.archivo=archivo;estado.vista=vista;estado.imagenTerminada=true;actualizarCompartirWrapped();
  });
}
// La vista previa va como `data:`, porque la CSP de `_headers` no permite
// imágenes `blob:`: con un blob la tarjeta salía vacía solo en producción.
function vistaImagenWrapped(archivo){
  return new Promise(listo=>{
    if(typeof FileReader==='undefined')return listo(null);
    const lector=new FileReader();
    lector.onload=()=>listo(lector.result);
    lector.onerror=()=>listo(null);
    lector.readAsDataURL(archivo);
  });
}
// Mostrar u ocultar el promedio vuelve a dibujar la hoja. Apagado por defecto:
// el promedio es íntimo y la tarjeta se comparte igual sin él.
function cambiarPromedioWrapped(si){
  if(!_wrapped)return;
  const estado=_wrapped,s=estado.slides[estado.i];
  if(s.tipo!=='final')return;
  estado.conPromedio=!!si;estado.imagen=null;estado.archivo=null;estado.vista=null;estado.imagenTerminada=false;
  const tarjeta=estado.ov.querySelector('.wrapped-tarjeta');
  if(tarjeta)tarjeta.textContent='Preparando tu hoja…';
  actualizarCompartirWrapped();prepararImagenWrapped(s);
}
function actualizarCompartirWrapped(){
  if(!_wrapped)return;
  const listo=!!_wrapped.archivo,caja=_wrapped.ov.querySelector('.wrapped-slide');
  const boton=caja.querySelector('.wrapped-compartir'),descarga=caja.querySelector('.wrapped-descargar');
  if(!boton)return;
  boton.disabled=!listo;if(descarga)descarga.disabled=!listo;
  boton.querySelector('span').textContent=listo?'Compartir esta historia':_wrapped.imagenTerminada?'Imagen no disponible':'Preparando imagen…';
  // La vista previa es la misma imagen que se comparte.
  const vista=caja.querySelector('.wrapped-tarjeta'),s=_wrapped.slides&&_wrapped.slides[_wrapped.i];
  if(vista&&listo&&s?.compartible&&_wrapped.vista){
    vista.innerHTML=`<img src="${_wrapped.vista}" alt="Tu hoja del semestre: ${esc(s.compartible.join('. ')+(_wrapped.conPromedio&&s.big?'. Promedio '+s.big:''))}" width="1080" height="1920">`;
  }
}
function archivoWrappedVigente(){
  return _wrapped&&_wrapped.archivo&&(_wrapped.vistaPrevia||(wrappedDisponible()&&(!_wrapped.version||contextoWrappedVigente(_wrapped))));
}
function descargarWrapped(){
  if(!archivoWrappedVigente())return;
  const archivo=_wrapped.archivo,a=document.createElement('a'),url=URL.createObjectURL(archivo);
  a.href=url;a.download=archivo.name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function compartirWrapped(){
  if(!archivoWrappedVigente())return;
  const estado=_wrapped,archivo=estado.archivo;
  if(!estado.vistaPrevia)track('wrapped_share',{});
  const historia=estado.i;
  if(!estado.pausa&&estado.slides?.length)pausarWrapped(true);
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[archivo]})){
      await navigator.share({files:[archivo],title:'Mi semestre en GradeHub'});
      return;
    }
  }catch(e){if(e&&e.name==='AbortError')return;}
  // Si el navegador rechaza archivos también se puede guardar la historia.
  if(_wrapped===estado&&estado.i===historia&&estado.archivo===archivo)descargarWrapped();
}

function renderWrappedHome(){
  clearTimeout(_wrappedVentanaTimer);
  const caja=document.getElementById('home-wrapped');
  if(!caja)return;
  if(ramosWrapped())_wrappedVentanaTimer=setTimeout(renderWrappedHome,60000-Date.now()%60000);
  // En Node (los tests) el reloj del minuto mantenía vivo el proceso y la suite
  // no terminaba. `unref` no existe en el navegador, donde todo sigue igual.
  if(_wrappedVentanaTimer&&typeof _wrappedVentanaTimer.unref==='function')_wrappedVentanaTimer.unref();
  if(_wrapped&&!_wrapped.vistaPrevia&&!contextoWrappedVigente(_wrapped))cerrarWrapped(true);
  const base=wrappedDisponible()&&ramosWrapped();
  if(!base){caja.style.display='none';caja.innerHTML='';if(_wrapped&&!_wrapped.vistaPrevia)cerrarWrapped(true);return;}
  caja.style.display='grid';
  // Conservar el botón y su foco mientras la ventana sigue abierta. El reloj
  // no debe quitarlo bajo el dedo ni desconectar el foco de vuelta del modal.
  if(caja.innerHTML)return;
  caja.innerHTML=`<div class="home-wrapped-texto">
      <span class="home-wrapped-k">Cierre del semestre</span>
      <strong>¿Ya tienes todas tus notas?</strong>
      <small>Revisa tu semestre antes de seguir. Tus ramos y notas se conservan.</small>
      <button id="home-wrapped-btn" type="button"><span>Semestre terminado</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
    </div>
    <div class="home-wrapped-pila" aria-hidden="true"><i></i><i></i><i></i><b>${esc(base.label)}</b></div>`;
  document.getElementById('home-wrapped-btn').addEventListener('click',abrirWrapped);
}

// Docente por sección: adaptación acotada del draft #445. Sin persistencia local.
