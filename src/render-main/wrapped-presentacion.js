// ─── Las historias del Wrapped 2026-2 ───
// El guion completo, con las frases y cuándo sale cada historia, está en
// .claude/wrapped-concepto.md. Las piezas visuales viven en wrapped-hoja.js.

// Una cifra que cuenta desde `desde` hasta su valor cuando aparece la pantalla.
// El texto final es SIEMPRE el que ya formateó la app (`fmtPromedio`, `fmt`),
// escrito con coma: el conteo anima el camino y nunca redondea distinto.
// VoiceOver lee la copia oculta, no cada número intermedio.
function cifraWrapped(texto,desde){
  const m=/^([+-]?)(\d+(?:[.,]\d+)?)(%?)$/.exec(String(texto));
  if(!m)return esc(texto);
  const num=m[2].replace(',','.'),dec=(num.split('.')[1]||'').length,final=comaWrapped(texto);
  return `<span class="wrapped-cifra" aria-hidden="true" data-hasta="${num}" data-desde="${desde||0}" data-dec="${dec}" data-pre="${m[1]}" data-suf="${m[3]}">${final}</span><span class="wrapped-oculto">${final}</span>`;
}

// Cada historia es texto ya escapado. Si una no tiene datos para esta persona,
// no se agrega: nunca un cero inventado. La última es la que se comparte, así
// que lleva solo lo que uno querría mostrar: nada del ramo que más costó.
// El guion (Lucas, 2026-11-07): cada historia cuenta algo. Primero una
// preparación a todo color que dice de qué se va a hablar (`prep`), después la
// revelación, que entra de a una pieza. Las superficies se alternan (papel,
// cuaderno, pizarrón) para que no haya dos pantallas iguales seguidas.
// Si a alguien le fue mal, el tono cambia: menos comparación, más ánimo.
function slidesWrapped(d,comp,label){
  const s=[],pl=n=>n!==1?'s':'',c=comaWrapped;
  const u=esc((TENANTS[S.tenant]&&TENANTS[S.tenant].conArticulo)||'tu universidad');
  const nombre=esc((S.userName||'').trim().split(/\s+/)[0]||'');
  const dificil=(d.reprobados||0)>0||(d.gpa!==null&&d.gpa<4);
  s.push({tipo:'umbral',sup:'pizarron',k:esc(label),titulo:`Lápices<br>${hojaMarca('abajo.')}`,
    sub:d.completo?'Se terminó el semestre. Revisemos tu hoja.':'El semestre llegó al final. Revisemos tu hoja.',viz:filasUmbralWrapped()});
  s.push({tipo:'portada',titulo:nombre?`${nombre}, este fue tu ${esc(label)}.`:`Este fue tu ${esc(label)}.`,sub:'No todo cabe en un promedio. Pero intentemos.'});
  s.push({tipo:'pregunta',sup:'papel',prep:{texto:'Empecemos por algo fácil.'},
    titulo:'¿Cuántas notas anotaste este semestre?',pregunta:{opciones:alternativasWrapped(d.nNotas),
      bien:'Exacto. Llevas la cuenta.',mal:`Fueron ${d.nNotas}.`},
    viz:grillaWrapped(d.nNotas),sub:'Cada una fue una noche antes, una prueba y una espera.'});
  if(d.semana)s.push({sup:'pizarron',prep:{texto:'Hubo una semana que no se olvida.'},
    k:`La del ${esc(d.semana.texto)}`,antes:true,big:cifraWrapped(String(d.semana.k)),titulo:'evaluaciones en siete días.',nota:'Y aquí estás.'});
  if(d.primera){
    const fin=d.mitades?d.mitades.segunda-d.mitades.primera:0;
    s.push({sup:'rayado',prep:{texto:'¿Te acuerdas de cómo partió todo?'},
      k:'Todo empezó con un',big:cifraWrapped(fmt(d.primera.valor),1),sub:`${esc(d.primera.nombre)} · ${esc(d.primera.ramo)}`,
      nota:fin>=0.3?'Mira dónde terminaste.':Math.abs(fin)<0.3?'Y lo sostuviste todo el semestre.':''});
  }
  if(d.movio)s.push({sup:'papel',prep:{texto:'Hubo una nota que lo cambió todo.'},
    k:'Una sola nota.',big:cifraWrapped('+'+fmt(d.movio.delta)),flecha:true,sub:`${esc(d.movio.x.nombre)} de ${esc(d.movio.x.r.nombre)} subió tu promedio.`});
  if(d.remontada)s.push({sup:'pizarron',prep:{texto:'Esta es la historia de una remontada.'},
    k:`En ${esc(d.remontada.mes)}, ${esc(d.remontada.r.nombre)} iba en ${c(fmtPromedio(d.remontada.minimo))}.`,titulo:'Terminó en',big:cifraWrapped(fmtPromedio(d.remontada.final),1),nota:'Nadie lo vio venir. Tú sí.'});
  if(d.mejor)s.push({tipo:'goma',sup:'papel',prep:{texto:'Tu mejor nota quedó escondida.',sub:'Bórrala para verla.'},
    titulo:`Tu ${hojaMarca('mejor nota')}`,cifra:c(fmt(d.mejor.valor)),
    nota:`<b>${esc(d.mejor.ramo)}</b><br>${esc(d.mejor.evaluacion)}`,sub:d.mejor.valor>=7?'Nada más que decir.':''});
  if(d.ranking.length>1){
    const opciones=d.ranking.slice(0,4).map(x=>({texto:esc(x.nombre),correcta:x===d.ranking[0]}));
    const giro=d.nNotas%opciones.length;
    s.push({tipo:'pregunta',sup:'rayado',titulo:'¿Cuál fue tu mejor ramo?',
      pregunta:{opciones:opciones.map((o,i)=>opciones[(i+giro)%opciones.length]),bien:'Lo sabías.',mal:'Tus notas dicen otra cosa.'},
      viz:rankingWrapped(d.ranking)});
  }else s.push({sup:'rayado',titulo:`Tu ramo estrella: ${hojaMarca(esc(d.estrella.r.nombre),2)}`,sub:`Tu mejor promedio: ${c(fmtPromedio(d.estrella.avg))}.`});
  // "Lo sacaste adelante" solo si de verdad lo aprobó: el resumen no celebra
  // lo que el semáforo pinta rojo.
  if(d.dificil)s.push({sup:'pizarron',prep:{texto:'Ahora, el que más pelea dio.'},
    k:'El ramo que más costó',titulo:esc(d.dificil.r.nombre),big:cifraWrapped(fmtPromedio(d.dificil.avg),1),
    sub:!ramoCompletamenteEvaluado(d.dificil.r)?'Todavía quedan evaluaciones por registrar.':notaAprobadaRamo(d.dificil.r,d.dificil.avg)?'Y lo sacaste adelante.':'Un ramo no te define. El próximo va con todo lo que aprendiste.'});
  if(dificil){
    const buenas=[`Anotaste <b>${d.nNotas}</b> nota${pl(d.nNotas)}. No te escondiste de ninguna.`];
    if(d.mejor)buenas.push(`Sacaste un <b>${c(fmt(d.mejor.valor))}</b> en ${esc(d.mejor.ramo)}.`);
    buenas.push(d.aprobando?`Sacaste adelante <b>${d.aprobando}</b> ramo${pl(d.aprobando)}.`:'Llegaste hasta el final. Eso también cuenta.');
    s.push({tipo:'animo',sup:'papel',prep:{texto:'Este semestre pesó.',sub:'Lo sabemos.'},
      titulo:'Pero no fue solo eso.',viz:corchoWrapped(buenas),sub:'El próximo empieza con todo lo que aprendiste en este.'});
  }
  if(d.personalidad){
    const p=d.personalidad,m=d.mitades,dato=p.id==='remontada'&&m?`<br><small>Tu 2.ª mitad del semestre promedió <b>${c(fmt(m.segunda))}</b>; la 1.ª, <b>${c(fmt(m.primera))}</b>.</small>`:'';
    s.push({tipo:'pregunta',sup:'papel',prep:{texto:'Una pregunta más.',sub:'Esta es sobre ti.'},
      titulo:'¿Qué tipo de estudiante fuiste?',pregunta:{opciones:p.opciones.map(o=>({texto:esc(o.nombre),correcta:o.id===p.id})),
        bien:'Te conoces bien.',mal:'Tus notas te ven así:'},
      nota:`${esc(p.frase)}${dato}`});
  }
  // Una sola comparación, y solo si deja bien parado: nadie necesita leer que
  // quedó en el 12% (Lucas, 2026-11-02: cuidar a quien le fue mal).
  if(comp&&comp.curso&&comp.curso.mejorQue>=50)s.push({sup:'rayado',prep:{texto:'¿Y tu curso?',sub:'Nadie ve las notas de nadie.'},
    k:`En ${esc(comp.curso.ramo)} quedaste sobre el`,antes:true,big:cifraWrapped(comp.curso.mejorQue+'%'),titulo:hojaMarca('de tu curso.'),
    sub:`Comparado con ${comp.curso.total-1} personas del ramo que usan GradeHub.`,viz:reglaWrapped(comp.curso.mejorQue)});
  // El servidor compara el promedio simple de los ramos, no el ponderado de
  // Inicio (ver universidad_posicion.sql): por eso la frase dice "tus ramos".
  else if(comp&&comp.uni&&comp.uni.mejorQue>=50)s.push({sup:'rayado',prep:{texto:`¿Y en toda ${u}?`,sub:'Nadie ve las notas de nadie.'},
    k:`En toda ${u}`,big:cifraWrapped(comp.uni.mejorQue+'%'),
    sub:`Con el promedio simple de tus ramos con sigla quedas igual o por sobre el ${comp.uni.mejorQue}% de otras ${comp.uni.total-1} personas de ${u} en GradeHub.`,viz:reglaWrapped(comp.uni.mejorQue)});
  const video=videoParaWrapped();
  if(video!==undefined)s.push({tipo:'video',sup:'pizarron',prep:{texto:'Alguien pasó a dejarte un recado.'},k:'Un recado para ti',video});
  if(d.anterior&&d.anterior.delta>=0.1)s.push({sup:'papel',prep:{texto:`¿Te acuerdas de ${esc(d.anterior.label)}?`},
    k:`Desde ${esc(d.anterior.label)}`,titulo:'Subiste',big:cifraWrapped('+'+fmt(d.anterior.delta)),flecha:true});
  else if(d.anterior)s.push({sup:'papel',titulo:`Mismo nivel que ${esc(d.anterior.label)}.`,sub:'Lo difícil es sostenerlo.'});
  if(d.gpa!==null)s.push({sup:'papel',prep:dificil?{texto:'Un número no cuenta toda la historia.',sub:'Pero aquí está.'}:{texto:'Y ahora, el número que lo resume todo.'},
    k:'Tu promedio',big:cifraWrapped(fmtPromedio(d.gpa),1),sub:`${d.aprobando} de ${d.nRamos} ramo${pl(d.nRamos)} con promedio de aprobación.`,viz:arcoWrapped(d.gpa)});
  const conSeccion=(S.ramos||[]).find(r=>r.seccion&&d.ranking.some(x=>x.nombre===r.nombre));
  if(conSeccion)s.push({k:'Antes de cerrar',titulo:`¿Cómo fue tu profe de ${esc(conSeccion.nombre)}?`,sub:'Lo que cuentas ayuda al resto a elegir.',accion:{texto:'Calificar profesor',ramo:conSeccion.id}});
  s.push({tipo:'cierre',sup:'pizarron',titulo:'Ningún número muestra las noches, los nervios, los cafés.',sub:hojaMarca('Pero este semestre lo hiciste tú.')});
  const filas=[];
  if(d.personalidad)filas.push(['¿Qué tipo de estudiante fuiste?',esc(d.personalidad.nombre),d.personalidad.letra]);
  filas.push(['Ramo estrella',esc(d.estrella.r.nombre)]);
  if(d.mejor)filas.push(['Mejor nota',c(fmt(d.mejor.valor))]);
  s.push({tipo:'final',k:esc(label),nombre,big:d.gpa!==null?c(fmtPromedio(d.gpa)):null,filas});
  return s;
}
// El recado de un profe. Se carga a mano antes del 1 de diciembre: el archivo
// va en /wrapped/, junto con sus subtítulos (.vtt). Sin video, la historia no
// sale; en la vista previa de administración se ve el espacio vacío.
const WRAPPED_VIDEO=null; // {src:'/wrapped/profe.mp4',poster:'/wrapped/profe.jpg',subtitulos:'/wrapped/profe.vtt',quien:'Nombre del profe',ramo:'Ramo',tenants:['uc']}
function videoParaWrapped(){
  const v=WRAPPED_VIDEO;
  if(v&&(!v.tenants||v.tenants.includes(S.tenant)))return v;
  return _wrappedVistaPreviaArmando?null:undefined;
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

let _wrapped=null,_wrappedAbriendo=false,_wrappedVentanaTimer=null,_wrappedVistaPreviaArmando=false;
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
  const comp=base.actual?await Promise.race([comparacionWrapped(),new Promise(r=>setTimeout(()=>r(null),4000))]):null;
  if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');etiqueta.textContent='Semestre terminado';}
  _wrappedAbriendo=false;
  const actual=ramosWrapped();
  if(!wrappedDisponible()||(currentUser&&currentUser.id)!==cuenta||S.tenant!==tenant||!actual||actual.ramos!==base.ramos||JSON.stringify(actual.ramos)!==version||!cierreWrapped(actual).listo)return;
  const datos=datosWrapped(base.ramos);if(!datos)return;
  extrasWrapped(datos,base.ramos,base.actual);
  const slides=slidesWrapped(datos,comp,base.label);
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
    r('b','Microeconomía I',[n('P1',6.1,'2026-08-28'),n('P2',6.5,'2026-10-02'),n('P3',6.7,'2026-11-20')]),
    r('c','Inglés IV',[n('T1',6.0,'2026-09-03'),n('T2',6.2,'2026-09-17'),n('T3',7.0,'2026-10-29')]),
    r('d','Estadística',[n('C1',4.4,'2026-09-14'),n('C2',4.9,'2026-09-16'),n('C3',4.6,'2026-11-18')]),
  ];
}
function abrirWrappedVistaPrevia(){
  if(_wrapped||_wrappedAbriendo)return;
  const ramos=ramosVistaPreviaWrapped(),datos=datosWrapped(ramos);
  extrasWrapped(datos,ramos,true);
  _wrappedVistaPreviaArmando=true;
  let slides;
  try{slides=slidesWrapped(datos,{curso:{ramo:'Cálculo II',mejorQue:82,total:39},uni:{mejorQue:71,total:120}},WRAPPED_PERIODO);}
  finally{_wrappedVistaPreviaArmando=false;}
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
    <div class="wrapped-slide" aria-live="polite"></div>
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
  // La preparación se ve una vez: al volver a una historia ya contada, se
  // muestra directo lo que dice.
  _wrapped.fase=s.prep&&!s.visto?'prep':'revela';
  ov.querySelector('[data-paso="-1"]').disabled=i===0;
  ov.style.setProperty('--acento',HOJA_ACENTOS[i%HOJA_ACENTOS.length]);
  const barras=ov.querySelector('.wrapped-barras');
  barras.setAttribute('aria-label',`Historia ${i+1} de ${slides.length}`);
  barras.innerHTML=slides.map((_,j)=>`<span class="${j<i?'on':j===i?'ahora':''}"></span>`).join('');
  const caja=ov.querySelector('.wrapped-slide');
  caja.scrollTop=0;caja.dataset.tipo=s.tipo||'';
  if(_wrapped.fase==='prep'){
    ov.dataset.sup='acento';caja.dataset.fase='prep';
    ov.querySelector('[data-paso="1"]').textContent='Ver';
    // Palabra por palabra, como quien lo va diciendo. VoiceOver lee la frase entera.
    const palabras=s.prep.texto.split(' ');
    caja.innerHTML=`<p class="wrapped-prep" style="--d:0"><span class="wrapped-oculto">${s.prep.texto}</span><span aria-hidden="true">${palabras.map((w,k)=>`<span style="--w:${k}">${w}</span>`).join(' ')}</span></p>${s.prep.sub?`<p class="wrapped-prep-sub" style="--d:${Math.ceil(palabras.length/2)+2}">${s.prep.sub}</p>`:''}`;
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
  _wrapped.fase='revela';s.visto=true;
  ov.querySelector('[data-paso="1"]').textContent=s.tipo==='umbral'?'Revisar mi hoja':i===slides.length-1?'Terminar':'Siguiente';
  ov.dataset.sup=oscuroWrapped()&&s.sup!=='acento'?'pizarron':s.sup||'papel';
  // `--d` escalona la entrada: primero de qué se habla, después el número.
  let d=0;const p=(cls,html)=>html?`<p class="${cls}" style="--d:${d++}">${html}</p>`:'';
  const caja=ov.querySelector('.wrapped-slide');
  caja.scrollTop=0;caja.dataset.fase='revela';
  if(s.tipo==='final'){
    caja.innerHTML=`${p('wrapped-titulo',`Tu hoja del ${hojaMarca('semestre.')}`)}
      <div class="wrapped-tarjeta" style="--d:${d++}"><p class="wrapped-pie">Preparando tu hoja…</p></div>
      <label class="wrapped-promedio" style="--d:${d++}"><input type="checkbox"${_wrapped.conPromedio?' checked':''}><span>Mostrar mi promedio</span></label>
      <div class="wrapped-acciones" style="--d:${d++}">
        <button class="wrapped-compartir" type="button" disabled>${ICONO_COMPARTIR}<span>Preparando imagen…</span></button>
        <button class="wrapped-descargar" type="button" disabled>Guardar imagen</button></div>`;
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
    if(ya)caja.dataset.respondida='';else delete caja.dataset.respondida;
    programarWrapped();
    return;
  }
  delete caja.dataset.respondida;
  if(s.tipo==='goma'){
    caja.innerHTML=p('wrapped-titulo',s.titulo)
      +`<div class="wrapped-grande con-timbre" style="--d:${d++}">${gomaWrapped(s.cifra,s.borrada)}${s.borrada?hojaTimbre('Nº 1','★ MEJOR NOTA ★ '+esc(slides[slides.length-1].k)+' ★ '):''}</div>`
      +(s.borrada?p('wrapped-sub',s.sub)+(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:''):'');
    if(!s.borrada)armarGomaWrapped(caja.querySelector('.hoja-goma canvas'));
    programarWrapped();
    return;
  }
  if(s.tipo==='video'){
    caja.innerHTML=p('wrapped-k',s.k)+`<div style="--d:${d++}">${videoWrapped(s.video)}</div>`;
    const v=caja.querySelector('video');
    if(v){
      // Mientras habla el profe, la historia espera.
      v.addEventListener('play',()=>{_wrapped.reproduciendo=true;programarWrapped();});
      ['pause','ended'].forEach(ev=>v.addEventListener(ev,()=>{_wrapped.reproduciendo=false;programarWrapped();}));
    }
    programarWrapped();
    return;
  }
  const grande=s.big?`<div class="wrapped-grande${s.timbre?' con-timbre':''}" style="--d:${d++}"><p class="wrapped-big">${s.big}</p>${s.timbre?hojaTimbre('Nº 1','★ MEJOR NOTA ★ '+esc(slides[slides.length-1].k)+' ★ '):''}${s.flecha?hojaFlecha():''}</div>`:'';
  caja.innerHTML=p('wrapped-k',s.k)
    +(s.tipo==='umbral'?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +(s.antes||!s.titulo?grande:'')
    +p('wrapped-titulo',s.titulo)
    +(s.antes||!s.titulo?'':grande)
    // En el ánimo, primero lo bueno y después la frase que lo cierra.
    +(s.tipo==='animo'?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +p('wrapped-sub',s.sub)
    +(s.viz&&s.tipo!=='umbral'&&s.tipo!=='animo'?`<div class="wrapped-viz" style="--d:${d++}">${s.viz}</div>`:'')
    +(s.nota?`<div style="--d:${d++}">${hojaPostit(s.nota,i%2?3:-3)}</div>`:'')
    +(s.accion?`<button class="wrapped-accion" type="button" data-ramo="${esc(s.accion.ramo)}" style="--d:${d++}">${esc(s.accion.texto)}</button>`:'');
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
    const g=rayarGomaWrapped(canvas);if(!g)return borrarGomaWrapped();
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
  // Una pregunta sin responder, una goma sin borrar o un video sonando esperan
  // a la persona.
  if(_wrapped.pausa||movimientoReducido()||document.visibilityState==='hidden'
    ||s.tipo==='umbral'||s.tipo==='final'||s.accion||!_wrapped.ov.querySelector('.wrapped-indice').hidden
    ||(!prep&&((s.tipo==='pregunta'&&s.respuesta===undefined)||(s.tipo==='goma'&&!s.borrada)||(s.tipo==='video'&&(_wrapped.reproduciendo||!s.video)))))return;
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
    const botones=[..._wrapped.ov.querySelectorAll('button:not(:disabled),input')].filter(b=>!b.closest('[hidden]'));
    const indice=botones.indexOf(document.activeElement);
    if(botones.length&&(indice<0||(e.shiftKey?indice===0:indice===botones.length-1))){
      e.preventDefault();botones[e.shiftKey?botones.length-1:0].focus();
    }
  }else if(e.key==='Escape'){
    if(!_wrapped.ov.querySelector('.wrapped-indice').hidden){indiceWrapped(false);_wrapped.ov.querySelector('.wrapped-indice-btn').focus();}
    else cerrarWrapped();
  }
  else if(e.key===' '&&e.target&&e.target.closest('button,input'))return; // La barra activa el control enfocado.
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
