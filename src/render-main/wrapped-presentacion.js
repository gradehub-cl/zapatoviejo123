
// ─── Piezas visuales de cada pantalla ───
// Todo lo que llevan adentro es texto ya escapado o números que calculó la app.
// Los gráficos son decorado con `aria-hidden`; el ranking conserva su lista
// accesible porque contiene nombres y promedios que no se repiten en el texto.

// Una cifra que cuenta desde `desde` hasta su valor cuando aparece la pantalla.
// El texto final es SIEMPRE el que ya formateó la app (`fmtPromedio`, `fmt`):
// el conteo anima el camino y nunca redondea distinto. VoiceOver lee la copia
// oculta, no cada número intermedio.
function cifraWrapped(texto,desde){
  const m=/^(\d+(?:\.\d+)?)(%?)$/.exec(texto);
  if(!m)return esc(texto);
  const dec=(m[1].split('.')[1]||'').length;
  return `<span class="wrapped-cifra" aria-hidden="true" data-hasta="${m[1]}" data-desde="${desde||0}" data-dec="${dec}" data-suf="${m[2]}">${texto}</span><span class="wrapped-oculto">${texto}</span>`;
}
// Un punto por nota, del color de su ramo: el semestre entero de un vistazo.
function grillaWrapped(colores){
  return `<div class="wrapped-grilla" aria-hidden="true">${colores.slice(0,80).map((c,i)=>`<span style="--c:${esc(c)};--d:${2+i*.12}"></span>`).join('')}</div>`;
}
// El promedio sobre la escala chilena, de 1,0 a 7,0, con la marca del 4,0. El
// arco va en blanco: el semáforo no se usa como decorado.
function arcoWrapped(g){
  const t=Math.min(Math.max((g-1)/6,0),1),x=100-80*Math.cos(Math.PI*t),y=100-80*Math.sin(Math.PI*t);
  return `<svg class="wrapped-arco" viewBox="0 0 200 118" aria-hidden="true">
    <path class="pista" d="M20 100A80 80 0 0 1 180 100" pathLength="100"/>
    <path class="valor" d="M20 100A80 80 0 0 1 180 100" pathLength="100" style="--v:${(t*100).toFixed(1)}"/>
    <line x1="100" y1="12" x2="100" y2="28"/><text x="100" y="9" text-anchor="middle">4,0</text>
    <text x="20" y="116" text-anchor="middle">1,0</text><text x="180" y="116" text-anchor="middle">7,0</text>
    <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/>
  </svg>`;
}
// Los ramos ordenados por promedio. La línea de color a la izquierda es la
// misma que en Inicio: el color del ramo vive ahí y no tiñe la barra.
function rankingWrapped(ranking){
  return `<ol class="wrapped-ranking">${ranking.slice(0,5).map((x,i)=>`
    <li class="${i===0?'top':''}" style="--c:${esc(x.color)};--d:${3+i/2};--v:${Math.max((x.avg-1)/6,.02).toFixed(3)}">
      <span>${esc(x.nombre)}</span><b>${fmtPromedio(x.avg)}</b><i></i></li>`).join('')}</ol>`;
}
// Una regla de 0 a 100 con "Tú" encima. Se lee como posición, no como nota.
function reglaWrapped(p){
  return `<div class="wrapped-regla" aria-hidden="true" style="--p:${Math.min(Math.max(p,0),100)}">
    <div class="pista"><i></i></div><b>Tú</b><span>0%</span><span>100%</span></div>`;
}

// Cada pantalla es texto ya escapado. La última es la que se comparte, así que
// lleva solo lo que uno querría mostrar: nada del ramo que más costó.
function slidesWrapped(d,comp,label){
  const s=[],pl=n=>n!==1?'s':'';
  // `short` ("FEN", "UC"): "En toda U. de Chile · FEN" no se dice así.
  const u=esc((TENANTS[S.tenant]&&TENANTS[S.tenant].short)||'tu universidad');
  const nombre=esc((S.userName||'').split(' ')[0]||'');
  s.push({tipo:'umbral',k:'Antes de seguir',titulo:'Hay algo que queremos mostrarte.',sub:'Un semestre entero. Muchas historias. Algunas quedaron acá.'});
  s.push({tipo:'portada',k:esc(label),titulo:nombre?`${nombre}, este fue tu semestre`:'Este fue tu semestre',sub:'Tus notas, contadas de otra forma.'});
  s.push({k:'Este semestre ingresaste',big:cifraWrapped(String(d.nNotas)),sub:`nota${pl(d.nNotas)} en ${d.nRamos} ramo${pl(d.nRamos)}`,viz:grillaWrapped(d.notasColores)});
  if(d.gpa!==null)s.push({k:'Tu promedio',big:cifraWrapped(fmtPromedio(d.gpa),1),sub:`${d.aprobando} de ${d.nRamos} ramo${pl(d.nRamos)} con promedio de aprobación`,viz:arcoWrapped(d.gpa)});
  if(d.mejor)s.push({tipo:'destello',k:'Tu mejor nota',big:cifraWrapped(fmt(d.mejor.valor),1),sub:`${d.mejor.valor>=7?'Nada más que decir.<br>':''}${esc(d.mejor.evaluacion)} · ${esc(d.mejor.ramo)}`});
  s.push({k:'Tu ramo estrella',titulo:esc(d.estrella.r.nombre),sub:`Tu mejor promedio: ${fmtPromedio(d.estrella.avg)}.`,viz:d.ranking.length>1?rankingWrapped(d.ranking):''});
  // "Lo sacaste adelante" solo si de verdad lo aprobó: el resumen no celebra
  // lo que el semáforo pinta rojo.
  if(d.dificil)s.push({k:'El que más pelea dio',titulo:esc(d.dificil.r.nombre),big:cifraWrapped(fmtPromedio(d.dificil.avg),1),
    sub:!ramoCompletamenteEvaluado(d.dificil.r)?'Todavía quedan evaluaciones por registrar.':notaAprobadaRamo(d.dificil.r,d.dificil.avg)?'Y lo sacaste adelante.':'Un semestre no define a nadie.'});
  if(comp&&comp.curso)s.push({k:`En ${esc(comp.curso.ramo)}`,big:cifraWrapped(comp.curso.mejorQue+'%'),
    sub:frasePosicionCurso(comp.curso.mejorQue,comp.curso.total).replace(/<\/?b>/g,'')+'.',viz:reglaWrapped(comp.curso.mejorQue)});
  // El servidor compara el promedio simple de los ramos, no el ponderado de
  // Inicio (ver universidad_posicion.sql): por eso la frase dice "tus ramos".
  if(comp&&comp.uni)s.push({k:`En toda ${u}`,big:cifraWrapped(comp.uni.mejorQue+'%'),
    sub:`Con el promedio simple de tus ramos con sigla quedas igual o por sobre el ${comp.uni.mejorQue}% de otras ${comp.uni.total-1} personas de ${u} en GradeHub.`,viz:reglaWrapped(comp.uni.mejorQue)});
  const filas=[];
  if(d.mejor)filas.push(['Mejor nota',fmt(d.mejor.valor)]);
  filas.push(['Ramo estrella',esc(d.estrella.r.nombre)]);
  if(comp&&comp.uni)filas.push([`En ${u}`,`sobre el ${comp.uni.mejorQue}%`]);
  s.push({tipo:'final',k:esc(label),big:d.gpa!==null?fmtPromedio(d.gpa):null,filas});
  return s;
}

const ICONO_CERRAR='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
// El ícono de compartir de iOS: cuadrado abierto con la flecha hacia arriba.
const ICONO_COMPARTIR='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';

let _wrapped=null,_wrappedAbriendo=false,_wrappedVentanaTimer=null;
function contextoWrappedVigente(estado){
  const base=ramosWrapped();
  return wrappedDisponible()&&(currentUser&&currentUser.id)===estado.cuenta&&S.tenant===estado.tenant&&base&&base.ramos===estado.ramos&&JSON.stringify(base.ramos)===estado.version;
}
// Reevaluar al minuto civil y al volver a la app: ni una pestaña abierta de
// noche ni un teléfono que despierta mantienen la sorpresa fuera de fecha.
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')renderWrappedHome();});
async function abrirWrapped(){
  const base=wrappedDisponible()&&ramosWrapped();if(!base||_wrapped||_wrappedAbriendo)return;
  const cierre=cierreWrapped(base);if(!cierre.listo){revisarCierreWrapped(base,cierre);return;}
  _wrappedAbriendo=true;
  const cuenta=currentUser&&currentUser.id,tenant=S.tenant;
  const version=JSON.stringify(base.ramos);
  // El foco se guarda ANTES de desactivar el botón: desactivarlo se lo quita,
  // y al cerrar volvía al body en vez de al botón que lo abrió.
  const foco=document.activeElement;
  const btn=document.getElementById('home-wrapped-btn');
  const etiqueta=btn&&btn.querySelector('span');
  if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');etiqueta.textContent='Revisando tus notas…';}
  const comp=base.actual?await Promise.race([comparacionWrapped(),new Promise(r=>setTimeout(()=>r(null),4000))]):null;
  if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');etiqueta.textContent='Semestre terminado';}
  _wrappedAbriendo=false;
  const actual=ramosWrapped();
  if(!wrappedDisponible()||(currentUser&&currentUser.id)!==cuenta||S.tenant!==tenant||!actual||actual.ramos!==base.ramos||JSON.stringify(actual.ramos)!==version||!cierreWrapped(actual).listo)return;
  const datos=datosWrapped(base.ramos);if(!datos)return;
  const slides=slidesWrapped(datos,comp,base.label);
  track('wrapped_open',{pantallas:slides.length});
  const ov=document.createElement('div');
  ov.className='wrapped';
  ov.dataset.dir='adelante';
  ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Tu semestre en GradeHub');
  ov.innerHTML=`<span class="wrapped-luz a"></span><span class="wrapped-luz b"></span><span class="wrapped-luz c"></span>
    <span class="wrapped-tinta a"></span><span class="wrapped-tinta b"></span>
    <div class="wrapped-barras"></div>
    <button class="wrapped-cerrar wrapped-vidrio" type="button" aria-label="Cerrar" style="flex-shrink:0;">${ICONO_CERRAR}</button>
    <div class="wrapped-slide" aria-live="polite"></div>
    <div class="wrapped-pasos" style="position:relative;z-index:2;display:flex;justify-content:space-between;gap:12px;flex-shrink:0;">
      <button class="wrapped-vidrio" type="button" data-paso="-1" style="position:static;opacity:1;padding:0 14px;border-radius:999px;font:inherit;">Anterior</button>
      <button class="wrapped-vidrio" type="button" data-paso="1" style="position:static;opacity:1;padding:0 14px;border-radius:999px;font:inherit;">Siguiente</button></div>`;
  // Tocar el tercio izquierdo vuelve, el resto avanza: igual que las historias.
  // Los botones "Anterior" y "Siguiente" hacen lo mismo para VoiceOver y el
  // teclado, que no tienen cómo tocar un tercio de pantalla (HIG, Accessibility:
  // "Offer alternatives to gestures").
  ov.addEventListener('click',e=>{
    if(e.target.closest('.wrapped-cerrar'))return cerrarWrapped();
    if(e.target.closest('.wrapped-compartir'))return compartirWrapped();
    if(e.target.closest('.wrapped-descargar'))return descargarWrapped();
    const b=e.target.closest('[data-paso]');
    pasarWrapped(b?Number(b.dataset.paso):e.clientX<ov.clientWidth/3?-1:1);
  });
  arrastreWrapped(ov);
  document.addEventListener('keydown',teclaWrapped);
  document.body.appendChild(ov);
  const fondo=[...document.body.children].filter(el=>el!==ov).map(el=>({el,inert:el.inert}));
  fondo.forEach(({el})=>{el.inert=true;});
  _wrapped={ov,slides,i:0,foco,fondo,cuenta,tenant,ramos:base.ramos,version,imagen:null,archivo:null,imagenTerminada:false};
  pintarWrapped();
  ov.querySelector('.wrapped-cerrar').focus();
}

// Deslizar hacia abajo cierra, que es lo que se espera en iOS (HIG, Modality).
// La pantalla sigue al dedo 1:1 y se encoge como una tarjeta que se suelta
// (HIG, Motion: el movimiento sigue al gesto). Al soltar decide la velocidad
// además de la distancia: un tirón rápido cierra aunque haya sido corto. Solo
// arranca con el contenido arriba del todo, para no pelearle el scroll a una
// pantalla con el texto agrandado.
function arrastreWrapped(ov){
  let y0=null,dy=0,t0=0,v=0,yPrev=0,tPrev=0;
  const pintar=y=>{
    const k=Math.min(y,400)/400;
    if(movimientoReducido())return;
    ov.style.transform=y?`translateY(${y}px) scale(${1-k*.08})`:'';
    ov.style.borderRadius=y?`${Math.round(k*36)}px`:'';
  };
  ov.addEventListener('touchstart',e=>{
    y0=ov.querySelector('.wrapped-slide').scrollTop>0?null:e.touches[0].clientY;
    dy=0;v=0;yPrev=y0;tPrev=t0=e.timeStamp;
    ov.style.transition='none';
  },{passive:true});
  ov.addEventListener('touchmove',e=>{
    if(y0===null)return;
    const y=e.touches[0].clientY;
    if(e.timeStamp>tPrev)v=(y-yPrev)/(e.timeStamp-tPrev);
    yPrev=y;tPrev=e.timeStamp;
    dy=Math.max(0,y-y0);
    pintar(dy);
  },{passive:true});
  ov.addEventListener('touchend',()=>{
    if(y0===null)return;
    y0=null;
    if(movimientoReducido()){if(dy>120||(dy>24&&v>.6))cerrarWrapped(true);return;}
    ov.style.transition='transform var(--motion-base) var(--ease-out),border-radius var(--motion-base) var(--ease-out)';
    if(dy>120||(dy>24&&v>.6)){ov.style.transform='translateY(100%) scale(.92)';setTimeout(()=>cerrarWrapped(true),220);}
    else pintar(0);
  });
  ov.addEventListener('touchcancel',()=>{
    y0=null;dy=0;v=0;ov.style.transform='';ov.style.borderRadius='';ov.style.transition='';
  });
}

function pintarWrapped(){
  if(!wrappedDisponible()||(_wrapped?.version&&!contextoWrappedVigente(_wrapped)))return cerrarWrapped(true);
  const {ov,slides,i}=_wrapped,s=slides[i];
  ov.querySelector('[data-paso="-1"]').disabled=i===0;
  ov.querySelector('[data-paso="1"]').textContent=s.tipo==='umbral'?'Descubrir mi semestre':i===slides.length-1?'Terminar':'Siguiente';
  // Las tres luces del fondo cambian de lugar en cada pantalla: es lo que hace
  // sentir que se avanzó, sin mover el texto de su sitio.
  ov.dataset.tono=String(i%4);
  ov.querySelector('.wrapped-barras').innerHTML=slides.map((_,j)=>`<span class="${j<i?'on':j===i?'ahora':''}"></span>`).join('');
  // `--d` escalona la entrada: primero de qué se habla, después el número.
  let d=0;const p=(cls,html)=>html?`<p class="${cls}" style="--d:${d++}">${html}</p>`:'';
  const caja=ov.querySelector('.wrapped-slide');
  caja.scrollTop=0;
  if(s.tipo==='final'){
    caja.innerHTML=`<div class="wrapped-tarjeta" style="--d:0">
        <div class="wrapped-tarjeta-marca"><img src="logo.svg" alt="" width="28" height="28"><span>GradeHub</span><em>${s.k}</em></div>
        ${s.big?`<p class="wrapped-tarjeta-big">${s.big}<small>promedio del semestre</small></p>`:''}
        <div class="wrapped-filas">${s.filas.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>
        <p class="wrapped-marca">gradehub.cl</p>
      </div>
      <div class="wrapped-acciones" style="--d:2">
        <button class="wrapped-compartir wrapped-vidrio" type="button" disabled>${ICONO_COMPARTIR}<span>Preparando imagen…</span></button>
        <button class="wrapped-descargar wrapped-vidrio" type="button" disabled>Descargar imagen</button>
        <p class="wrapped-pie">o saca un pantallazo</p>
      </div>`;
    // La imagen se prepara al llegar, no al tocar: Safari exige que el menú de
    // compartir se abra en el mismo toque, y dibujarla ahí lo haría esperar.
    prepararImagenWrapped(s);
    actualizarCompartirWrapped();
    return;
  }
  const portada=s.tipo==='portada';
  caja.innerHTML=(portada?`<p class="wrapped-poster" aria-hidden="true">${s.k}</p>`:'')
    +p('wrapped-k',s.k)+p('wrapped-titulo',s.titulo)
    +(s.big?(s.tipo==='destello'?`<div class="wrapped-destello" style="--d:${d++}"><span class="wrapped-rayos"></span><p class="wrapped-big">${s.big}</p></div>`:p('wrapped-big',s.big)):'')
    +p('wrapped-sub',s.sub)
    +(s.viz?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +(portada?p('wrapped-pie','Toca para seguir'):'');
  contarWrapped(caja,i);
}

// Las cifras cuentan cuando les llega su turno en la entrada escalonada. Si la
// persona avanza antes de que termine, el conteo se abandona: nunca hay que
// esperar a una animación (HIG, Motion: "Let people cancel motion").
function contarWrapped(caja,i){
  if(movimientoReducido())return;
  caja.querySelectorAll('.wrapped-cifra').forEach(el=>{
    const hasta=Number(el.dataset.hasta),desde=Number(el.dataset.desde),dec=Number(el.dataset.dec),suf=el.dataset.suf;
    const final=el.textContent,retraso=(Number((el.closest('[style*="--d"]')||{style:{getPropertyValue:()=>0}}).style.getPropertyValue('--d'))||0)*80;
    const dur=650;let t0=null;
    el.textContent=desde.toFixed(dec)+suf;
    const paso=t=>{
      if(!_wrapped||_wrapped.i!==i||!el.isConnected)return;
      if(t0===null)t0=t+retraso;
      const k=Math.min(Math.max((t-t0)/dur,0),1),e=1-Math.pow(1-k,3);
      el.textContent=k<1?(desde+(hasta-desde)*e).toFixed(dec)+suf:final;
      if(k<1)requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function pasarWrapped(paso){
  if(!_wrapped)return;
  const i=_wrapped.i+paso;
  if(i>=_wrapped.slides.length)return cerrarWrapped();
  if(i<0)return;
  const estado=_wrapped,focoEnHistoria=document.activeElement&&document.activeElement.closest('.wrapped-slide');
  _wrapped.i=i;
  // La entrada viene del lado hacia donde se avanzó: adelante entra desde la
  // derecha, atrás desde la izquierda (HIG: consistencia espacial).
  _wrapped.ov.dataset.dir=paso>0?'adelante':'atras';
  pintarWrapped();
  // Compartir y Descargar pertenecen a una historia: al reemplazarla se
  // retiran del DOM. El teclado sigue en el control persistente de ese paso.
  if(focoEnHistoria&&_wrapped===estado)estado.ov.querySelector(`[data-paso="${paso>0?1:-1}"]`).focus({preventScroll:true});
}
function teclaWrapped(e){
  if(!_wrapped)return;
  if(e.key==='Tab'){
    const botones=[..._wrapped.ov.querySelectorAll('button:not(:disabled)')];
    const indice=botones.indexOf(document.activeElement);
    if(botones.length&&(indice<0||(e.shiftKey?indice===0:indice===botones.length-1))){
      e.preventDefault();botones[e.shiftKey?botones.length-1:0].focus();
    }
  }else if(e.key==='Escape')cerrarWrapped();
  else if(e.key===' '&&e.target&&e.target.closest('button'))return; // La barra activa el botón enfocado.
  else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();pasarWrapped(1);}
  else if(e.key==='ArrowLeft')pasarWrapped(-1);
}
// Sale por el mismo camino por el que entró: hacia abajo y desvaneciéndose.
// `yaSalio` es para el arrastre, que ya lo sacó de la pantalla con el dedo.
function cerrarWrapped(yaSalio){
  if(!_wrapped||_wrapped.saliendo)return;
  _wrapped.saliendo=true;
  document.removeEventListener('keydown',teclaWrapped);
  const {ov,foco,fondo}=_wrapped;
  const fin=()=>{ov.remove();fondo.forEach(({el,inert})=>{el.inert=inert;});_wrapped=null;if(foco&&foco.isConnected&&foco.focus)foco.focus();};
  if(yaSalio===true||movimientoReducido())return fin();
  ov.classList.add('saliendo');
  setTimeout(fin,220);
}
