
// ─── Compartir: la tarjeta final como imagen de historia (1080×1920) ───
// Se dibuja en un canvas con los mismos datos y colores que la tarjeta. Los
// colores salen de la pantalla ya pintada (`wrapped-tinta`), así que siguen el
// tema; si el navegador no sabe leerlos, quedan los de respaldo.
function textoPlano(html){return new DOMParser().parseFromString(`<p>${html}</p>`,'text/html').body.textContent||'';}
async function imagenWrapped(s){
  const W=1080,H=1920,cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  // Safari anterior a roundRect también puede exportar la misma tarjeta.
  const tarjetaRedonda=(x,y,w,h,r)=>{
    if(ctx.roundRect){ctx.roundRect(x,y,w,h,r);return;}
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
  };
  const color=(sel,prop,resp)=>{
    const el=_wrapped&&_wrapped.ov.querySelector(sel);
    const v=el?getComputedStyle(el)[prop]:'';
    ctx.fillStyle=resp;ctx.fillStyle=v||resp;return ctx.fillStyle;
  };
  const fondo=color('.wrapped-tarjeta','backgroundColor','#0b1f22'),base=color('.wrapped','backgroundColor','#0a1a1c');
  const luzA=color('.wrapped-tinta.a','color','#1f6f73'),luzB=color('.wrapped-tinta.b','color','#3b3f8f'),brillo=color('.wrapped-tarjeta-big','color','#c9f4f2');
  ctx.fillStyle=base;ctx.fillRect(0,0,W,H);
  const luz=(x,y,r,c)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);};
  luz(180,260,900,luzA);luz(980,1700,1000,luzB);
  // La tarjeta: material sólido, esquinas de 64px.
  const x=72,y=360,w=W-144,h=1240;
  ctx.fillStyle=fondo;ctx.beginPath();tarjetaRedonda(x,y,w,h,64);ctx.fill();
  // El brillo de la esquina, recortado a la tarjeta, como en pantalla.
  ctx.save();ctx.clip();
  const g=ctx.createRadialGradient(x+w-60,y+40,0,x+w-60,y+40,560);g.addColorStop(0,luzB);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=3;ctx.beginPath();tarjetaRedonda(x,y,w,h,64);ctx.stroke();
  const fuente=(peso,px,redonda)=>`${peso} ${px}px ${redonda?'ui-rounded,':''}-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif`;
  const logo=await new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src='logo.svg';});
  if(logo)ctx.drawImage(logo,x+72,y+72,72,72);
  ctx.fillStyle='#fff';ctx.textBaseline='alphabetic';
  ctx.font=fuente(700,48);ctx.fillText('GradeHub',x+(logo?168:72),y+126);
  ctx.font=fuente(600,40);ctx.textAlign='right';ctx.fillText(textoPlano(s.k),x+w-72,y+126);ctx.textAlign='left';
  let cy=y+470;
  if(s.big){
    ctx.fillStyle=brillo;ctx.font=fuente(800,300,true);ctx.fillText(s.big,x+60,cy);
    ctx.fillStyle='#fff';ctx.font=fuente(600,44);ctx.fillText('promedio del semestre',x+72,cy+80);
    cy+=230;
  }
  ctx.font=fuente(500,46);
  s.filas.forEach(([a,b])=>{
    ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+72,cy-70);ctx.lineTo(x+w-72,cy-70);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font=fuente(500,46);ctx.fillText(textoPlano(a),x+72,cy);
    ctx.font=fuente(800,50);ctx.textAlign='right';
    let v=textoPlano(b);while(ctx.measureText(v).width>w-460&&v.length>4)v=v.slice(0,-2)+'…';
    ctx.fillText(v,x+w-72,cy);ctx.textAlign='left';
    cy+=150;
  });
  ctx.fillStyle='#fff';ctx.font=fuente(800,52);ctx.fillText('gradehub.cl',x+72,y+h-80);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
  return blob?new File([blob],'mi-semestre-gradehub.png',{type:'image/png'}):null;
}
// Preparar fuera del gesto; el toque llama share directamente con un File listo.
function prepararImagenWrapped(s){
  if(_wrapped.imagen)return;
  const estado=_wrapped;
  estado.imagen=imagenWrapped(s).catch(()=>null).then(archivo=>{
    if(_wrapped!==estado)return;
    estado.archivo=archivo;estado.imagenTerminada=true;actualizarCompartirWrapped();
  });
}
function actualizarCompartirWrapped(){
  if(!_wrapped)return;
  const listo=!!_wrapped.archivo,caja=_wrapped.ov.querySelector('.wrapped-slide');
  const boton=caja.querySelector('.wrapped-compartir'),descarga=caja.querySelector('.wrapped-descargar');
  if(!boton)return;
  boton.disabled=!listo;descarga.disabled=!listo;
  boton.querySelector('span').textContent=listo?'Compartir':_wrapped.imagenTerminada?'Imagen no disponible':'Preparando imagen…';
}
function descargarWrapped(){
  if(!_wrapped||!_wrapped.archivo||!wrappedDisponible())return;
  const archivo=_wrapped.archivo,a=document.createElement('a'),url=URL.createObjectURL(archivo);
  a.href=url;a.download=archivo.name;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function compartirWrapped(){
  if(!_wrapped||!_wrapped.archivo||!wrappedDisponible())return;
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
  if(_wrapped&&!contextoWrappedVigente(_wrapped))cerrarWrapped(true);
  const base=wrappedDisponible()&&ramosWrapped();
  if(!base){caja.style.display='none';caja.innerHTML='';if(_wrapped)cerrarWrapped(true);return;}
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
