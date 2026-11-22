// ─── Las historias del Wrapped 2026-2 ───
// El guion completo, con las frases y cuándo sale cada historia, está en
// .claude/wrapped-concepto.md. Las piezas visuales viven en wrapped-hoja.js.

// Una cifra que cuenta desde `desde` hasta su valor cuando aparece la pantalla.
// El texto final es SIEMPRE el que ya formateó la app (`fmtPromedio`, `fmt`),
// escrito con coma: el conteo anima el camino y nunca redondea distinto.
// VoiceOver lee la copia oculta, no cada número intermedio.
function cifraWrapped(texto,desde=1){
  const m=/^([+-]?)(\d+(?:[.,]\d+)?)(%?)$/.exec(String(texto));
  if(!m)return esc(texto);
  const num=m[2].replace(',','.'),dec=(num.split('.')[1]||'').length,final=comaWrapped(texto);
  return `<span class="wrapped-cifra" aria-hidden="true" data-hasta="${num}" data-desde="${desde}" data-dec="${dec}" data-pre="${m[1]}" data-suf="${m[3]}">${final}</span><span class="wrapped-oculto">${final}</span>`;
}

// Los textos compartibles se construyen por separado de la ficha privada:
// nunca se exportan el HTML de la vista, nombres de personas ni nombres de ramos.
function slidesWrapped(d,comp,label,recado,contexto=S){
  const s=[],periodo=esc(label),u=esc(TENANTS[contexto.tenant]?.conArticulo||'tu universidad');
  const muestra=d.nNotas>=4&&d.nRamos>=2;
  const dificil=d.reprobados>0||(Number.isFinite(d.gpa)&&d.gpa<4);
  const cierre=dificil?'Lo que te llevas de este semestre también cuenta para el que viene.':'Ahora sí, guarda el lápiz.';
  s.push({tipo:'umbral',k:periodo,titulo:`Lápices<br>${hojaMarca('abajo.')}`,
    sub:muestra?'Antes de guardar la hoja, ¿te acuerdas de todo lo que pasó?':'Antes de guardar la hoja, tómate un respiro.',viz:filasUmbralWrapped()});
  if(!muestra&&d.ranking.length)s.push({tipo:'ramos',forma:'cuaderno',k:'Del cuaderno',titulo:'Los ramos de tu hoja',
    viz:`<ul class="hoja-ramos">${[...d.ranking].sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre),'es')).map(r=>`<li>${esc(r.nombre)}</li>`).join('')}</ul>`});
  if(muestra)s.push({tipo:'pregunta',prep:{texto:'A ver si llevabas la cuenta.',obj:'lapiz'},
    titulo:'¿Cuántas notas anotaste este semestre?',pregunta:{opciones:alternativasWrapped(d.nNotas),
      bien:`¡Le achuntaste! Fueron ${d.nNotas}.`,mal:`Contamos ${d.nNotas} en tu hoja.`},
    viz:grillaWrapped(d.nNotas)});
  if(d.semana)s.push({forma:'objeto',prep:{texto:'Busca una semana apretada en tu calendario.',obj:'calendario'},
    k:`Semana del ${esc(d.semana.texto)}`,viz:semanaWrapped(d.semana.dias),titulo:`<b>${d.semana.k}</b> evaluaciones en siete días.`});
  if(muestra&&d.remontada)s.push({prep:{texto:'Este ramo tuvo una vuelta.',obj:'escuadra'},
    k:`En ${esc(d.remontada.mes)}, ${esc(d.remontada.r.nombre)} iba en ${fmtPromedio(d.remontada.minimo)}.`,antes:true,
    heroe:curvaWrapped(d.remontada.serie.slice(1),d.remontada.iMinimo-1,d.remontada.final),
    titulo:`Lo cerraste con ${hojaMarca(fmtPromedio(d.remontada.final))}.`,
    compartible:['La vuelta del semestre','Remontada','Un ramo que iba bajo el 4 terminó aprobado.']});
  if(muestra&&d.mejor&&d.mejor.valor>=4)s.push({tipo:'goma',prep:{texto:'Hay una nota bajo el grafito.',sub:'Pasa la goma para verla.',obj:'goma'},
    titulo:`Tu ${hojaMarca('mejor nota')}`,cifra:fmt(d.mejor.valor),nota:`<b>${esc(d.mejor.ramo)}</b><br>${esc(d.mejor.evaluacion)}`,
    compartible:['Mi mejor nota',fmt(d.mejor.valor),'del semestre']});
  if(dificil&&muestra){
    const buenas=[];
    if(d.aprobando&&d.completo)buenas.push(`Sacaste adelante <b>${d.aprobando}</b> ramo${d.aprobando===1?'':'s'}.`);
    buenas.push('Puedes volver a mirar lo que te sirvió y probar otra forma en lo que viene.');
    s.push({tipo:'animo',titulo:'También queda esto.',viz:corchoWrapped(buenas)});
  }
  const curso=comp?.curso,uni=comp?.uni;
  if(muestra&&!dificil){
    const porCurso=posicionWrappedValida(curso)&&curso.mejorQue>=50;
    const grupo=porCurso?curso:uni;
    if(posicionWrappedValida(grupo)&&grupo.mejorQue>=50)s.push({forma:'gigante',prep:{texto:porCurso?'¿Dónde cae tu marca en la regla del curso?':`¿Y en ${u}?`,obj:'regla'},
      k:porCurso?`En ${esc(curso.ramo)} quedaste sobre el`:`En ${u} quedaste sobre el`,antes:true,big:cifraWrapped(grupo.mejorQue+'%',1),
      titulo:porCurso?'de tu curso.':'de quienes usan GradeHub.',
      sub:porCurso?`Entre las ${grupo.total-1} personas de tu ramo que usan GradeHub.`:`Comparamos el promedio simple de tus ramos con el de otras ${grupo.total-1} personas.`,
      viz:reglaWrapped(grupo.mejorQue),fraccion:grupo.mejorQue/100,compartible:['Mi marca en la regla',grupo.mejorQue+'%',porCurso?'de mi curso en GradeHub quedó bajo mi promedio.':'de mi universidad en GradeHub quedó bajo mi promedio simple.']});
  }
  if(muestra&&notaPortalValida(d.gpa))s.push({tipo:'promedio',prep:{texto:dificil?'Un número no cuenta toda la historia.':'Queda una casilla por llenar.',obj:'timbre'},
    k:'Tu promedio del semestre',heroe:casillaWrapped(cifraWrapped(fmtPromedio(d.gpa),1),periodo,!dificil)});
  if(!dificil&&d.personalidad&&d.nNotas>=8&&d.nRamos>=3){
    const p=d.personalidad;
    s.push({tipo:'pregunta',prep:{texto:'Si tu hoja tuviera un apodo…',obj:'burbujas'},titulo:'¿Cuál le pondrías?',
      pregunta:{opciones:p.opciones.map(o=>({texto:esc(o.nombre),correcta:o.id===p.id})),bien:'Elegiste el mismo que tu hoja.',mal:'Así quedó tu hoja:'},
      nota:esc(p.frase)});
  }
  if(recado?.video)s.push({tipo:'video',prep:{texto:'Antes de guardar la hoja, tienes un recado.',obj:'avion'},k:`Un recado de ${esc(recado.video.quien)}`,video:recado.video});
  const conSeccion=(contexto.ramos||[]).find(r=>r.seccion&&d.ranking.some(x=>x.nombre===r.nombre));
  s.push({tipo:'final',k:periodo,titulo:'Hoja entregada.',sub:cierre,big:muestra&&notaPortalValida(d.gpa)?fmtPromedio(d.gpa):null,
    marcas:muestra?d.nNotas:null,compartible:['Mi semestre','Entregué mi hoja.',cierre],...(conSeccion?{accion:{texto:'Calificar profesor',ramo:conSeccion.id}}:{})});
  return s;
}
// Pide el recado al servidor y firma sus archivos (el bucket es privado). Ante
// cualquier error devuelve null: mejor no mostrar la historia que decirle a
// alguien que no calificó cuando sí lo hizo.
async function recadoWrapped(){
  if(typeof supabaseClient==='undefined'||!supabaseClient||!currentUser)return null;
  try{
    const {data,error}=await supabaseClient.rpc('wrapped_recado',{p_tenant:S.tenant,p_periodo:WRAPPED_PERIODO});
    const r=Array.isArray(data)?data[0]:data;
    if(error||!r||!r.hay_videos)return null;
    if(!r.archivo)return {calificaciones:Number(r.calificaciones)||0,video:null};
    const firmar=async ruta=>{if(!ruta)return null;const f=await supabaseClient.storage.from('wrapped').createSignedUrl(ruta,3*3600);return f.error?null:f.data.signedUrl;};
    const [src,poster,subtitulos]=await Promise.all([firmar(r.archivo),firmar(r.poster),firmar(r.subtitulos)]);
    if(!src)return null;
    const clave=String(r.ramo_clave||'').toLowerCase();
    const ramo=(S.ramos||[]).find(x=>String(x.sigla||x.origen?.ramoKey||'').toLowerCase()===clave);
    return {calificaciones:Number(r.calificaciones)||0,video:{src,poster,subtitulos,quien:r.profesor,ramo:ramo?ramo.nombre:clave.toUpperCase()}};
  }catch(e){return null;}
}

const ICONO_CERRAR='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const ICONO_PAUSA='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>';
const ICONO_SEGUIR='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
const ICONO_INDICE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
// El ícono de compartir de iOS: cuadrado abierto con la flecha hacia arriba.
const ICONO_COMPARTIR='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>';
// Cada historia se queda ~6 s, como las de Spotify. El umbral, la acción y la
// tarjeta esperan a la persona; con movimiento reducido nada avanza solo.
const WRAPPED_DURACION=7000;
// La preparación dura lo que toma leerla; tocar la adelanta.
const WRAPPED_PREP=2600;
// Cada pieza de la revelación entra después de la anterior: la historia se
// cuenta de a poco, no aparece de golpe. Mismo valor que `--paso` en el CSS.
const WRAPPED_PASO=260;

let _wrapped=null,_wrappedAbriendo=false,_wrappedVentanaTimer=null;
function contextoWrappedVigente(estado){
  const base=ramosWrapped();
  return wrappedDisponible()&&(currentUser&&currentUser.id)===estado.cuenta&&S.tenant===estado.tenant&&base&&base.ramos===estado.ramos&&JSON.stringify(base.ramos)===estado.version;
}
// Reevaluar al minuto civil y al volver a la app: ni una pestaña abierta de
// noche ni un teléfono que despierta mantienen la sorpresa fuera de fecha.
// Oculta, la historia no avanza sola.
if(typeof document.addEventListener==='function')document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){renderWrappedHome();programarWrapped();}
  else if(_wrapped)clearTimeout(_wrapped.timer);
});
function oscuroWrapped(){
  const m=document.documentElement&&document.documentElement.dataset&&document.documentElement.dataset.modo;
  return m==='oscuro'||(m!=='claro'&&!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches));
}
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
  const espera=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),4000))]);
  const [comp,recado]=await Promise.all([base.actual?espera(comparacionWrapped()):null,base.actual?espera(recadoWrapped()):null]);
  if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');etiqueta.textContent='Semestre terminado';}
  _wrappedAbriendo=false;
  const actual=ramosWrapped();
  if(!wrappedDisponible()||(currentUser&&currentUser.id)!==cuenta||S.tenant!==tenant||!actual||actual.ramos!==base.ramos||JSON.stringify(actual.ramos)!==version||!cierreWrapped(actual).listo)return;
  const datos=datosWrapped(base.ramos);if(!datos)return;
  extrasWrapped(datos,base.ramos);
  const slides=slidesWrapped(datos,comp,base.label,recado);
  track('wrapped_open',{pantallas:slides.length});
  montarWrapped(slides,{foco,cuenta,tenant,ramos:base.ramos,version});
}
// Vista previa para administración (Lucas, 2026-11-02): un semestre sintético,
// sin la fecha de apertura, sin el servidor y sin medir. Ninguna nota real.
function ramosVistaPreviaWrapped(){
  const n=(id,valor,fecha)=>({id,nombre:id,valor,fecha});
  const r=(id,nombre,notas)=>({id:'vista-'+id,nombre,creditos:10,color:'#000',gates:[],categorias:[{id:'vista-'+id+'c',nombre:'Evaluaciones',peso:100,notas}]});
  return [
    r('a','Cálculo II',[n('I1',3.2,'2026-08-20'),n('I2',3.6,'2026-09-15'),n('I3',7.0,'2026-10-20'),n('Examen',5.8,'2026-11-25')]),
    r('b','Cálculo III',[n('P1',6.1,'2026-08-28'),n('P2',6.5,'2026-10-02'),n('P3',6.7,'2026-11-20')]),
    r('c','Inglés IV',[n('T1',6.0,'2026-09-03'),n('T2',6.2,'2026-09-17'),n('T3',7.0,'2026-10-29')]),
    r('d','Estadística',[n('C1',4.4,'2026-09-14'),n('C2',4.9,'2026-09-16'),n('C3',4.6,'2026-11-18')]),
  ];
}
function abrirWrappedVistaPrevia(){
  if(_wrapped||_wrappedAbriendo||typeof esAdministrador!=='function'||!esAdministrador())return;
  const ramos=ramosVistaPreviaWrapped(),datos=datosWrapped(ramos);
  extrasWrapped(datos,ramos);
  // El recado de ejemplo muestra el espacio del video, sin archivo real.
  const slides=slidesWrapped(datos,{curso:{ramo:'Cálculo II',mejorQue:82,total:39},uni:{mejorQue:71,total:120}},WRAPPED_PERIODO,
    {calificaciones:2,video:{src:null,quien:'tu profe',ramo:'Cálculo II'}},{tenant:'uc',ramos});
  montarWrapped(slides,{foco:document.activeElement,vistaPrevia:true});
}
function montarWrapped(slides,estado){
  const ov=document.createElement('div');
  ov.className='wrapped';
  ov.dataset.dir='adelante';
  ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Tu semestre en GradeHub');
  ov.innerHTML=`<div class="wrapped-arriba">
      <div class="wrapped-barras${slides.length>12?' muchas':''}" role="img"></div>
      <button class="wrapped-ctrl wrapped-indice-btn" type="button" aria-label="Ver todas las historias" aria-expanded="false">${ICONO_INDICE}</button>
      <button class="wrapped-ctrl wrapped-pausa" type="button" aria-label="Pausar" aria-pressed="false">${ICONO_PAUSA}</button>
      <button class="wrapped-ctrl wrapped-cerrar" type="button" aria-label="Cerrar">${ICONO_CERRAR}</button></div>
    <div class="wrapped-indice" hidden></div>
    <div class="wrapped-slide" role="group" aria-live="polite" aria-atomic="true"></div>
    <div class="wrapped-pasos">
      <button type="button" data-paso="-1">Anterior</button>
      <button type="button" data-paso="1">Siguiente</button></div>`;
  // Tocar el tercio izquierdo vuelve, el resto avanza: igual que las historias.
  // Mantener presionado pausa, y al soltar no avanza. Los botones "Anterior" y
  // "Siguiente" hacen lo mismo para VoiceOver y el teclado (HIG, Accessibility:
  // "Offer alternatives to gestures").
  let presion=0;
  ov.addEventListener('pointerdown',e=>{if(e.target.closest('.wrapped-slide')){presion=Date.now();if(_wrapped)clearTimeout(_wrapped.timer);}});
  ov.addEventListener('pointerup',()=>{if(presion&&Date.now()-presion>=350)setTimeout(programarWrapped,0);});
  ov.addEventListener('click',e=>{
    const mantuvo=presion&&Date.now()-presion>=350;presion=0;
    if(e.target.closest('.wrapped-cerrar'))return cerrarWrapped();
    if(e.target.closest('.wrapped-pausa'))return pausarWrapped(!_wrapped.pausa);
    if(e.target.closest('.wrapped-indice-btn'))return indiceWrapped(ov.querySelector('.wrapped-indice').hidden);
    const ir=e.target.closest('[data-ir]');if(ir){indiceWrapped(false);return irWrapped(Number(ir.dataset.ir));}
    if(e.target.closest('.wrapped-indice'))return;
    if(e.target.closest('.wrapped-compartir'))return compartirWrapped();
    const op=e.target.closest('[data-op]');if(op)return responderWrapped(Number(op.dataset.op));
    if(e.target.closest('.hoja-goma-btn'))return borrarGomaWrapped();
    if(e.target.closest('.hoja-goma,.hoja-video,.hoja-pregunta'))return;
    if(e.target.closest('.wrapped-descargar'))return descargarWrapped();
    const accion=e.target.closest('[data-ramo]');
    if(accion){const id=accion.dataset.ramo;cerrarWrapped(true);if(S.ramos.some(r=>r.id===id))openRamo(id);return;}
    if(e.target.closest('.wrapped-promedio,input,label'))return;
    const b=e.target.closest('[data-paso]');
    if(!b&&mantuvo)return;
    // El tercio se mide en la columna: en pantalla ancha va centrada.
    const hoja=ov.querySelector('.wrapped-slide').getBoundingClientRect();
    const paso=b?Number(b.dataset.paso):e.clientX<hoja.left+hoja.width/3?-1:1;
    // Durante la preparación, avanzar es revelar lo que viene.
    if(paso>0&&_wrapped.fase==='prep')return revelarWrapped();
    pasarWrapped(paso);
  });
  ov.addEventListener('change',e=>{if(e.target.closest('.wrapped-promedio'))cambiarPromedioWrapped(e.target.checked);});
  arrastreWrapped(ov);
  document.addEventListener('keydown',teclaWrapped);
  document.body.appendChild(ov);
  const fondo=[...document.body.children].filter(el=>el!==ov).map(el=>({el,inert:el.inert}));
  fondo.forEach(({el})=>{el.inert=true;});
  _wrapped={...estado,ov,slides,i:0,fondo,imagen:null,archivo:null,imagenTerminada:false,
    pausa:false,timer:null,conPromedio:false};
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
    y0=ov.querySelector('.wrapped-slide').scrollTop>0||e.target?.closest?.('.hoja-goma,.hoja-video')?null:e.touches[0].clientY;
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
  if(!_wrapped.vistaPrevia&&(!wrappedDisponible()||(_wrapped.version&&!contextoWrappedVigente(_wrapped))))return cerrarWrapped(true);
  const {ov,slides,i}=_wrapped,s=slides[i];
  Object.assign(_wrapped,{imagen:null,archivo:null,vista:null,imagenTerminada:false,conPromedio:false});
  // Cada visita empieza con la preparación, si la historia tiene una.
  _wrapped.fase=s.prep?'prep':'revela';
  ov.querySelector('[data-paso="-1"]').disabled=i===0;
  ov.style.setProperty('--acento',HOJA_ACENTOS[i%HOJA_ACENTOS.length]);
  ov.dataset.sup=oscuroWrapped()?'pizarron':'papel';
  const barras=ov.querySelector('.wrapped-barras');
  barras.setAttribute('aria-label',`Historia ${i+1} de ${slides.length}`);
  barras.innerHTML=slides.map((_,j)=>`<span class="${j<i?'on':j===i?'ahora':''}"></span>`).join('');
  const caja=ov.querySelector('.wrapped-slide');
  caja.scrollTop=0;caja.dataset.tipo=s.tipo||'';
  caja.setAttribute('aria-label',`Historia ${i+1} de ${slides.length}`);
  if(_wrapped.fase==='prep'){
    caja.dataset.fase='prep';caja.dataset.forma='';
    ov.querySelector('[data-paso="1"]').textContent='Ver';
    // Palabra por palabra, como quien lo va diciendo, y al final la frase se
    // resalta en el color de la historia. VoiceOver lee la frase entera.
    const palabras=s.prep.texto.split(' ');
    caja.innerHTML=`${hojaObjeto(s.prep.obj)}<p class="wrapped-prep" style="--d:0"><span class="wrapped-oculto">${s.prep.texto}</span><span aria-hidden="true" style="--n:${palabras.length}">${palabras.map((w,k)=>`<span style="--w:${k}">${w}</span>`).join(' ')}</span></p>${s.prep.sub?`<p class="wrapped-prep-sub" style="--d:${Math.ceil(palabras.length/2)+2}">${s.prep.sub}</p>`:''}`;
    programarWrapped();
    return;
  }
  pintarRevelacionWrapped();
}
// La segunda mitad de la historia: lo que la preparación anunció.
function revelarWrapped(){
  if(!_wrapped||_wrapped.fase!=='prep')return;
  _wrapped.ov.dataset.dir='revela';
  pintarRevelacionWrapped();
}
function pintarRevelacionWrapped(){
  const {ov,slides,i}=_wrapped,s=slides[i];
  _wrapped.fase='revela';
  ov.querySelector('[data-paso="1"]').textContent=s.tipo==='umbral'?'Revisar mi hoja':i===slides.length-1?'Terminar':'Siguiente';
  // `--d` escalona la entrada: primero de qué se habla, después el número.
  let d=0;const p=(cls,html)=>html?`<p class="${cls}" style="--d:${d++}">${html}</p>`:'';
  const caja=ov.querySelector('.wrapped-slide');
  caja.scrollTop=0;caja.dataset.fase='revela';caja.dataset.forma=s.forma||'';
  if(s.tipo==='final'){
    caja.innerHTML=`${p('wrapped-titulo',hojaMarca(s.titulo))}${p('wrapped-sub',s.sub)}
      <div class="wrapped-tarjeta" style="--d:${d++}"><p class="wrapped-pie">Preparando tu hoja…</p></div>
      ${s.big?`<label class="wrapped-promedio" style="--d:${d++}"><input type="checkbox"${_wrapped.conPromedio?' checked':''}><span>Mostrar mi promedio</span></label>`:''}
      <div class="wrapped-acciones" style="--d:${d++}">
        <button class="wrapped-compartir" type="button" disabled>${ICONO_COMPARTIR}<span>Preparando imagen…</span></button>
        <button class="wrapped-descargar" type="button" disabled>Guardar imagen</button></div>
      ${s.accion?`<button class="wrapped-accion" type="button" data-ramo="${esc(s.accion.ramo)}">${s.accion.texto}</button>`:''}`;
    // La imagen se prepara al llegar, no al tocar: Safari exige que el menú de
    // compartir se abra en el mismo toque, y dibujarla ahí lo haría esperar.
    prepararImagenWrapped(s);
    actualizarCompartirWrapped();
    programarWrapped();
    return;
  }
  if(s.tipo==='pregunta'){
    const r=s.respuesta,ya=r!==undefined;
    const acierto=ya&&s.pregunta.opciones[r]&&s.pregunta.opciones[r].correcta;
    caja.innerHTML=p('wrapped-titulo',s.titulo)
      +`<div class="wrapped-viz" style="--d:${ya?0:d++}">${preguntaWrapped(s.pregunta,r)}</div>`
      +(ya?p('wrapped-veredicto',acierto?s.pregunta.bien:s.pregunta.mal)
        +(s.viz?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
        +p('wrapped-sub',s.sub)
        +(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:''):p('wrapped-ayuda','Toca una alternativa.'));
    if(ya)ofrecerHistoriaWrapped(s,caja);
    if(ya)caja.dataset.respondida='';else delete caja.dataset.respondida;
    programarWrapped();
    return;
  }
  delete caja.dataset.respondida;
  if(s.tipo==='goma'){
    caja.innerHTML=s.borrada?p('wrapped-titulo',s.titulo)
      +`<div class="wrapped-grande con-timbre" style="--d:${d++}">${gomaWrapped(s.cifra,true)}${hojaTimbre('Nº 1','★ MEJOR NOTA ★ '+esc(slides[slides.length-1].k)+' ★ ')}</div>`
      +p('wrapped-sub',s.sub)+(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:'')
      :gomaWrapped(s.cifra,false);
    if(s.borrada)ofrecerHistoriaWrapped(s,caja);
    if(!s.borrada)armarGomaWrapped(caja.querySelector('.hoja-goma canvas'));
    programarWrapped();
    return;
  }
  if(s.tipo==='video'){
    caja.innerHTML=p('wrapped-k',s.k)+`<div style="--d:${d++}">${videoWrapped(s.video)}</div>`
      +p('wrapped-sub',s.sub)
      +(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:'')
      +(s.accion?`<button class="wrapped-accion" type="button" data-ramo="${esc(s.accion.ramo)}" style="--d:${d++}">${esc(s.accion.texto)}</button>`:'');
    const v=caja.querySelector('video');
    if(v){
      // Mientras habla el profe, la historia espera.
      v.addEventListener('play',()=>{_wrapped.reproduciendo=true;programarWrapped();});
      ['pause','ended'].forEach(ev=>v.addEventListener(ev,()=>{_wrapped.reproduciendo=false;programarWrapped();}));
      // Si el archivo no llega (red, enlace vencido), se dice en vez de dejar
      // un cuadro negro; la historia sigue esperando a que la persona avance.
      v.addEventListener('error',()=>{_wrapped.reproduciendo=false;const f=v.closest('.hoja-video');if(f)f.outerHTML=videoWrapped({...s.video,src:null,fallo:true});},{once:true});
    }
    programarWrapped();
    return;
  }
  // `heroe` es la pieza que cuenta el dato (la prueba, el corrector, la curva)
  // y va donde iría la cifra grande.
  // En la forma «gigante» el tamaño sale del largo de la cifra, para que
  // llegue a los bordes sin cortarse (82 % y 100 % caben igual).
  const largo=s.forma==='gigante'?`;--n:${String(s.big||'').replace(/<[^>]*>/g,'').length/2}`:'';
  const grande=s.big?`<div class="wrapped-grande${s.timbre?' con-timbre':''}" style="--d:${d++}${largo}"><p class="wrapped-big">${s.big}</p>${s.timbre?hojaTimbre('Nº 1','★ MEJOR NOTA ★ '+esc(slides[slides.length-1].k)+' ★ '):''}</div>`
    :s.heroe?`<div class="wrapped-heroe" style="--d:${d++}">${s.heroe}</div>`:'';
  // Con forma «objeto» el dibujo va antes que el dato, y en grande.
  const vizArriba=s.tipo==='umbral'||s.forma==='objeto';
  const cuerpo=p('wrapped-k',s.k)
    +(vizArriba?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +(s.antes||!s.titulo?grande:'')
    +p('wrapped-titulo',s.titulo)
    +(s.antes||!s.titulo?'':grande)
    // En el ánimo, primero lo bueno y después la frase que lo cierra.
    +(s.tipo==='animo'?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +p('wrapped-sub',s.sub)
    +(s.viz&&!vizArriba&&s.tipo!=='animo'?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:'')
    +(s.accion?`<button class="wrapped-accion" type="button" data-ramo="${esc(s.accion.ramo)}" style="--d:${d++}">${esc(s.accion.texto)}</button>`:'');
  // El post-it y el cuaderno son una hoja encima de la cuadrícula: todo el
  // contenido va adentro.
  caja.innerHTML=s.forma==='postit'||s.forma==='cuaderno'?`<div class="hoja-pagina ${s.forma}">${cuerpo}</div>`:cuerpo;
  ofrecerHistoriaWrapped(s,caja);
  contarWrapped(caja,i);
  programarWrapped();
}
// Responder una pregunta: se marca, se corrige y recién ahí se cuenta el dato.
function responderWrapped(op){
  if(!_wrapped)return;
  const s=_wrapped.slides[_wrapped.i];
  if(s.tipo!=='pregunta'||s.respuesta!==undefined||!s.pregunta.opciones[op])return;
  s.respuesta=op;
  pintarRevelacionWrapped();
  _wrapped.ov.querySelector('.wrapped-veredicto')?.setAttribute('role','status');
}
// La goma sigue al dedo. Con un poco menos de la mitad borrada, se revela
// entera: nadie tiene que frotar hasta el último píxel.
function armarGomaWrapped(canvas){
  if(!canvas||!_wrapped)return;
  const estado=_wrapped,i=estado.i;
  requestAnimationFrame(()=>{
    if(_wrapped!==estado||estado.i!==i||!canvas.isConnected)return;
    const g=rayarGomaWrapped(canvas,canvas.closest('.pantalla'));if(!g)return borrarGomaWrapped();
    const cifra=canvas.parentElement.querySelector('.wrapped-big');
    if(cifra){const a=canvas.getBoundingClientRect(),b=cifra.getBoundingClientRect(),k=g.ancho/Math.max(a.width,1);
      g.zona={x:Math.max(0,Math.round((b.left-a.left)*k)),y:Math.max(0,Math.round((b.top-a.top)*k)),w:Math.round(b.width*k),h:Math.round(b.height*k)};}
    let ultimo=null,trazos=0;
    const punto=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture?.(e.pointerId);ultimo=punto(e);clearTimeout(estado.timer);});
    canvas.addEventListener('pointermove',e=>{
      if(!ultimo)return;
      const p=punto(e);g.c.beginPath();g.c.moveTo(...ultimo);g.c.lineTo(...p);g.c.stroke();ultimo=p;
      if(++trazos%8===0&&borradoGomaWrapped(g)>=.45)borrarGomaWrapped();
    });
    ['pointerup','pointercancel'].forEach(ev=>canvas.addEventListener(ev,()=>{ultimo=null;if(borradoGomaWrapped(g)>=.45)borrarGomaWrapped();}));
  });
}
function borrarGomaWrapped(){
  if(!_wrapped)return;
  const s=_wrapped.slides[_wrapped.i];
  if(s.tipo!=='goma'||s.borrada)return;
  s.borrada=true;
  _wrapped.ov.dataset.dir='revela';
  pintarRevelacionWrapped();
}

// Avanzar solo, salvo donde se espera a la persona o ella lo pidió.
function programarWrapped(){
  if(!_wrapped)return;
  clearTimeout(_wrapped.timer);
  const s=_wrapped.slides[_wrapped.i],prep=_wrapped.fase==='prep';
  // Una pregunta sin responder, una goma sin borrar o el recado del profe
  // esperan a la persona: son pocos videos y nadie debería perdérselo porque
  // no alcanzó a apretar play.
  if(_wrapped.pausa||movimientoReducido()||document.visibilityState==='hidden'
    ||s.tipo==='umbral'||s.tipo==='final'||s.accion||!_wrapped.ov.querySelector('.wrapped-indice').hidden
    ||(!prep&&((s.tipo==='pregunta'&&s.respuesta===undefined)||(s.tipo==='goma'&&!s.borrada)||s.tipo==='video')))return;
  const estado=_wrapped,i=estado.i;
  estado.timer=setTimeout(()=>{if(_wrapped===estado&&estado.i===i)prep?revelarWrapped():pasarWrapped(1);},prep?WRAPPED_PREP:WRAPPED_DURACION);
}
function pausarWrapped(pausa){
  if(!_wrapped)return;
  _wrapped.pausa=pausa;
  const b=_wrapped.ov.querySelector('.wrapped-pausa');
  b.setAttribute('aria-pressed',String(pausa));b.setAttribute('aria-label',pausa?'Seguir':'Pausar');
  b.innerHTML=pausa?ICONO_SEGUIR:ICONO_PAUSA;
  programarWrapped();
}
// El índice: saltar a cualquier historia sin empezar de nuevo.
function indiceWrapped(abrir){
  if(!_wrapped)return;
  const caja=_wrapped.ov.querySelector('.wrapped-indice'),b=_wrapped.ov.querySelector('.wrapped-indice-btn');
  caja.hidden=!abrir;b.setAttribute('aria-expanded',String(abrir));
  if(abrir){
    caja.innerHTML=`<ol>${_wrapped.slides.map((s,j)=>`<li><button type="button" data-ir="${j}"${j===_wrapped.i?' aria-current="step"':''}>${hojaBurbuja(String(j+1),j<=_wrapped.i)}<span>${esc(textoPlano(s.titulo||s.k||'Tu hoja del semestre'))}</span></button></li>`).join('')}</ol>`;
    caja.querySelector('[aria-current]')?.focus({preventScroll:true});
  }
  programarWrapped();
}
function irWrapped(j){
  if(!_wrapped||j<0||j>=_wrapped.slides.length)return;
  const paso=j-_wrapped.i;if(!paso)return programarWrapped();
  _wrapped.i=j;_wrapped.ov.dataset.dir=paso>0?'adelante':'atras';
  pintarWrapped();
}

// Las cifras cuentan cuando les llega su turno en la entrada escalonada. Si la
// persona avanza antes de que termine, el conteo se abandona: nunca hay que
// esperar a una animación (HIG, Motion: "Let people cancel motion").
function contarWrapped(caja,i){
  if(movimientoReducido())return;
  caja.querySelectorAll('.wrapped-cifra').forEach(el=>{
    const hasta=Number(el.dataset.hasta),desde=Number(el.dataset.desde),dec=Number(el.dataset.dec),pre=el.dataset.pre||'',suf=el.dataset.suf;
    const final=el.textContent,retraso=(Number((el.closest('[style*="--d"]')||{style:{getPropertyValue:()=>0}}).style.getPropertyValue('--d'))||0)*WRAPPED_PASO;
    const dur=650;let t0=null;
    el.textContent=pre+comaWrapped(desde.toFixed(dec))+suf;
    const paso=t=>{
      if(!_wrapped||_wrapped.i!==i||!el.isConnected)return;
      if(t0===null)t0=t+retraso;
      const k=Math.min(Math.max((t-t0)/dur,0),1),e=1-Math.pow(1-k,3);
      el.textContent=k<1?pre+comaWrapped((desde+(hasta-desde)*e).toFixed(dec))+suf:final;
      if(k<1)requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function pasarWrapped(paso){
  if(!_wrapped)return;
  const i=_wrapped.i+paso;
  if(i>=_wrapped.slides.length)return cerrarWrapped();
  if(i<0)return programarWrapped();
  const estado=_wrapped,focoEnHistoria=document.activeElement&&document.activeElement.closest('.wrapped-slide');
  _wrapped.i=i;
  // La entrada viene del lado hacia donde se avanzó: adelante entra desde la
  // derecha, atrás desde la izquierda (HIG: consistencia espacial).
  _wrapped.ov.dataset.dir=paso>0?'adelante':'atras';
  pintarWrapped();
  // Compartir y Guardar pertenecen a una historia: al reemplazarla se retiran
  // del DOM. El teclado sigue en el control persistente de ese paso.
  if(focoEnHistoria&&_wrapped===estado)estado.ov.querySelector(`[data-paso="${paso>0?1:-1}"]`).focus({preventScroll:true});
}
function teclaWrapped(e){
  if(!_wrapped)return;
  if(e.key==='Tab'){
    const indiceAbierto=_wrapped.ov.querySelector('.wrapped-indice');
    const dentro=indiceAbierto.hidden?_wrapped.ov:indiceAbierto;
    const botones=[...dentro.querySelectorAll('button:not(:disabled),input,video[controls]')].filter(b=>!b.closest('[hidden]'));
    const indice=botones.indexOf(document.activeElement);
    if(botones.length&&(indice<0||(e.shiftKey?indice===0:indice===botones.length-1))){
      e.preventDefault();botones[e.shiftKey?botones.length-1:0].focus();
    }
  }else if(e.key==='Escape'){
    if(!_wrapped.ov.querySelector('.wrapped-indice').hidden){indiceWrapped(false);_wrapped.ov.querySelector('.wrapped-indice-btn').focus();}
    else cerrarWrapped();
  }
  else if(e.key===' '&&e.target&&e.target.closest('button,input'))return; // La barra activa el control enfocado.
  else if(!_wrapped.ov.querySelector('.wrapped-indice').hidden)return;
  else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();_wrapped.fase==='prep'?revelarWrapped():pasarWrapped(1);}
  else if(e.key==='ArrowLeft')pasarWrapped(-1);
}
// Sale por el mismo camino por el que entró: hacia abajo y desvaneciéndose.
// `yaSalio` es para el arrastre, que ya lo sacó de la pantalla con el dedo.
function cerrarWrapped(yaSalio){
  if(!_wrapped||_wrapped.saliendo)return;
  _wrapped.saliendo=true;clearTimeout(_wrapped.timer);
  document.removeEventListener('keydown',teclaWrapped);
  const {ov,foco,fondo}=_wrapped;
  const fin=()=>{ov.remove();fondo.forEach(({el,inert})=>{el.inert=inert;});_wrapped=null;if(foco&&foco.isConnected&&foco.focus)foco.focus();};
  if(yaSalio===true||movimientoReducido())return fin();
  ov.classList.add('saliendo');
  setTimeout(fin,220);
}
