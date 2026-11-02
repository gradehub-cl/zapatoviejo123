
// ─── Compartir: la hoja de respuestas como imagen de historia (1080×1920) ───
// Se dibuja en un canvas con las medidas de Figma (wrapped-concepto.md, 4b):
// cuadrícula de 72 px, márgenes de 96 px y la zona segura de las historias
// (250 px arriba y 340 px abajo, libres). Lleva solo el primer nombre, nunca
// el apellido ni el correo, y el promedio solo si la persona lo pide.
function textoPlano(html){return new DOMParser().parseFromString(`<p>${html}</p>`,'text/html').body.textContent||'';}
async function imagenWrapped(s,conPromedio=false){
  const W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  const PAPEL='#F3EFE4',CUADRO='#D9D3C3',GRAFITO='#1D1D1F',GRIS='#4A4740',NARANJO='#FF9F3A',LIMA='#B6F23A';
  const fuente=(peso,px)=>`${peso} ${px}px -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",system-ui,sans-serif`;
  const texto=(t,x,y,peso,px,color=GRAFITO,alinear='left')=>{ctx.fillStyle=color;ctx.font=fuente(peso,px);ctx.textAlign=alinear;ctx.fillText(t,x,y);ctx.textAlign='left';};
  const recortar=(t,peso,px,max)=>{ctx.font=fuente(peso,px);let v=t;while(ctx.measureText(v).width>max&&v.length>2)v=v.slice(0,-2)+'…';return v;};
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
  etiqueta('Nombre',412);texto('Periodo',D-260,412,600,34,GRIS);
  texto(s.nombre?recortar(textoPlano(s.nombre),600,56,ANCHO-320):'—',X,484,600,56);
  texto(textoPlano(s.k),D-260,484,800,56);
  linea(X,504,D-308,504,3);linea(D-260,504,D,504,3);
  let y=598;
  const pers=s.filas.find(f=>f[2]);
  if(pers){
    etiqueta('1. ¿Qué tipo de estudiante fuiste?',y,GRAFITO);
    'ABCDE'.split('').forEach((l,i)=>{
      const cx=X+36+i*94,cy=y+60,llena=l===pers[2];
      ctx.beginPath();ctx.arc(cx,cy,36,0,Math.PI*2);ctx.lineWidth=3;ctx.strokeStyle=GRAFITO;
      if(llena){ctx.fillStyle=GRAFITO;ctx.fill();}ctx.stroke();
      texto(l,cx,cy+12,700,32,llena?PAPEL:GRAFITO,'center');
    });
    const nombre=recortar(textoPlano(pers[1]),900,68,ANCHO-40),yb=y+210;
    ctx.font=fuente(900,68);const w=ctx.measureText(nombre).width;
    marca(X,yb,w,68,NARANJO);texto(nombre,X,yb,900,68);
    // El círculo a lápiz alrededor de la respuesta.
    ctx.strokeStyle=GRAFITO;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(X+w*.1,yb-86);ctx.quadraticCurveTo(X+w+88,yb-100,X+w+44,yb+16);
    ctx.quadraticCurveTo(X+w*.5,yb+60,X-34,yb+12);ctx.quadraticCurveTo(X-52,yb-82,X+w*.55,yb-94);ctx.stroke();
    y=yb+112;
  }
  const estrella=s.filas.find(f=>f[0]==='Ramo estrella');
  etiqueta(`${pers?2:1}. Ramo estrella`,y,GRAFITO);
  const ramo=recortar(textoPlano(estrella?estrella[1]:''),900,76,ANCHO),yr=y+100;
  ctx.font=fuente(900,76);marca(X,yr,ctx.measureText(ramo).width,76,LIMA);texto(ramo,X,yr,900,76);
  const mejor=s.filas.find(f=>f[0]==='Mejor nota');
  if(mejor){
    etiqueta(`${pers?3:2}. Mejor nota`,yr+94,GRAFITO);
    texto(textoPlano(mejor[1]),X-8,1470,900,250);
    // El timbre: doble anillo, el texto alrededor y la tinta gastada.
    const cx=D-135,cy=1360,r=135;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-12*Math.PI/180);ctx.globalAlpha=.88;ctx.strokeStyle=GRAFITO;
    ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,r*.95,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*.66,0,Math.PI*2);ctx.stroke();
    const anillo=`★ MEJOR NOTA ★ ${textoPlano(s.k)} ★ `;
    ctx.font=fuente(800,20);ctx.fillStyle=GRAFITO;ctx.textAlign='center';
    [...anillo].forEach((c,i)=>{ctx.save();ctx.rotate(i/anillo.length*Math.PI*2);ctx.fillText(c,0,-r*.78);ctx.restore();});
    ctx.font=fuente(900,58);ctx.fillText('Nº 1',0,20);ctx.textAlign='left';
    let t=7;const azar=()=>((t=(t*9301+49297)%233280)/233280);
    ctx.fillStyle=PAPEL;ctx.globalAlpha=1;
    for(let i=0;i<70;i++){ctx.beginPath();ctx.arc((azar()-.5)*2*r,(azar()-.5)*2*r,1+azar()*3,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  // Pie: el promedio solo si la persona lo eligió; si no, las burbujas.
  linea(X,1512,D,1512,3);
  if(conPromedio&&s.big)texto(`Promedio del semestre ${textoPlano(s.big)}`,X,1564,700,34);
  else for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(X+14+i*42,1552,14,0,Math.PI*2);ctx.fillStyle=GRAFITO;ctx.fill();}
  texto('gradehub.cl',D,1566,700,40,GRAFITO,'right');
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  return blob?new File([blob],'mi-semestre-gradehub.png',{type:'image/png'}):null;
}
// Preparar fuera del gesto; el toque llama share directamente con un File listo.
function prepararImagenWrapped(s){
  if(_wrapped.imagen)return;
  const estado=_wrapped;
  estado.imagen=imagenWrapped(s,!!estado.conPromedio).catch(()=>null).then(archivo=>{
    if(_wrapped!==estado)return;
    estado.archivo=archivo;estado.imagenTerminada=true;actualizarCompartirWrapped();
  });
}
// Mostrar u ocultar el promedio vuelve a dibujar la hoja. Apagado por defecto:
// el promedio es íntimo y la tarjeta se comparte igual sin él.
function cambiarPromedioWrapped(si){
  if(!_wrapped)return;
  const estado=_wrapped,s=estado.slides[estado.i];
  if(s.tipo!=='final')return;
  estado.conPromedio=!!si;estado.imagen=null;estado.archivo=null;estado.imagenTerminada=false;
  actualizarCompartirWrapped();prepararImagenWrapped(s);
}
function actualizarCompartirWrapped(){
  if(!_wrapped)return;
  const listo=!!_wrapped.archivo,caja=_wrapped.ov.querySelector('.wrapped-slide');
  const boton=caja.querySelector('.wrapped-compartir'),descarga=caja.querySelector('.wrapped-descargar');
  if(!boton)return;
  boton.disabled=!listo;descarga.disabled=!listo;
  boton.querySelector('span').textContent=listo?'Compartir':_wrapped.imagenTerminada?'Imagen no disponible':'Preparando imagen…';
  // La vista previa es la misma imagen que se comparte.
  const vista=caja.querySelector('.wrapped-tarjeta'),s=_wrapped.slides&&_wrapped.slides[_wrapped.i];
  if(vista&&listo&&s&&s.filas&&typeof URL!=='undefined'&&URL.createObjectURL){
    if(_wrapped.vista)URL.revokeObjectURL(_wrapped.vista);
    _wrapped.vista=URL.createObjectURL(_wrapped.archivo);
    vista.innerHTML=`<img src="${_wrapped.vista}" alt="Tu hoja del semestre: ${esc(textoPlano(s.filas.map(f=>f[0]+' '+f[1]).join('. ')))}" width="1080" height="1920">`;
  }
}
function descargarWrapped(){
  if(!_wrapped||!_wrapped.archivo||(!wrappedDisponible()&&!_wrapped.vistaPrevia))return;
  const archivo=_wrapped.archivo,a=document.createElement('a'),url=URL.createObjectURL(archivo);
  a.href=url;a.download=archivo.name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function compartirWrapped(){
  if(!_wrapped||!_wrapped.archivo||(!wrappedDisponible()&&!_wrapped.vistaPrevia))return;
  const estado=_wrapped,archivo=estado.archivo;
  track('wrapped_share',{});
  try{
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[archivo]})){
      await navigator.share({files:[archivo],title:'Mi semestre en GradeHub'});
      return;
    }
  }catch(e){if(e&&e.name==='AbortError')return;}
  // Si el navegador rechaza archivos también se puede guardar la historia.
  if(_wrapped===estado)descargarWrapped();
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
      <button id="home-wrapped-btn" type="button"><span>Semestre terminado</span></button>
    </div>
    <div class="home-wrapped-pila" aria-hidden="true"><span></span><span></span><span><b>${esc(base.label)}</b></span></div>`;
  document.getElementById('home-wrapped-btn').addEventListener('click',abrirWrapped);
}

// Docente por sección: adaptación acotada del draft #445. Sin persistencia local.
