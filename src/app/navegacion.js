const NAV_TABS_BASE=['stats','home','agenda'];
let NAV_TABS=NAV_TABS_BASE.slice();
// Todas las pestañas que pueden existir. Pedir una que esta cuenta no tiene
// (un widget, un enlace) lleva a su pestaña de entrada en vez de a una pantalla vacía.
const PESTANAS=['stats','home','agenda','profesor','alumnos','admin'];
// Dónde abre la app y a dónde se vuelve: Clases para una cuenta de profesor,
// Inicio para todas las demás, incluidas las de estudiante que además dan clases.
function pestanaInicial(){return esCuentaProfesor()?'profesor':'home';}
function recalcularNavTabs(){
  // Una cuenta de profesor (#697) no tiene Inicio, Estadísticas ni Agenda: no
  // estudia acá. Clases y Alumnos las tiene siempre, aprobada o no; mientras
  // no lo esté, cada una explica en qué va. Las cuentas de estudiante que
  // además son profesores aprobados siguen con sus cinco pestañas.
  const soloProfesor=esCuentaProfesor();
  const conProfesor=soloProfesor||(typeof esProfesorAprobado==='function'&&esProfesorAprobado());
  // La de administración, solo para cuentas administradoras. Que aparezca no da
  // acceso a nada: el servidor exige además el segundo factor.
  const conAdmin=typeof esAdministrador==='function'&&esAdministrador();
  // Un profesor aprobado tiene Clases (sus anuncios) y Alumnos (el panel), en
  // pestañas separadas (#697).
  // Un admin puede ocultarle Alumnos a un profesor (2026-10-23).
  const conAlumnos=conProfesor&&!(typeof panelAlumnosOculto==='function'&&panelAlumnosOculto());
  const nuevas=[...(soloProfesor?[]:NAV_TABS_BASE),...(conProfesor?['profesor']:[]),...(conAlumnos?['alumnos']:[]),...(conAdmin?['admin']:[])];
  [...NAV_TABS_BASE.map(t=>[t,!soloProfesor]),['profesor',conProfesor],['alumnos',conAlumnos],['admin',conAdmin]].forEach(([t,ver])=>{
    const btn=document.getElementById('nav-'+t);if(btn)btn.hidden=!ver;
    const pantalla=document.getElementById('screen-'+t);if(pantalla)pantalla.hidden=!ver;
  });
  if(nuevas.join()===NAV_TABS.join())return false;
  NAV_TABS=nuevas;
  // Si a alguien le quitan el acceso estando en su pestaña, no se le deja la
  // pantalla en blanco: vuelve a su pestaña de entrada.
  if(!NAV_TABS.includes(currentTab))showTab(pestanaInicial());
  else setTabTransforms(Math.max(0,NAV_TABS.indexOf(currentTab)),0);
  return true;
}
let currentTab='home';
let currentTabIdx=1;

// ─── VISTAS DE CLASES Y ALUMNOS EN LA BARRA (Lucas, 2026-10-22) ──────────────
// En pantalla ancha, Clases y Alumnos son grupos de la barra lateral, como en
// Supabase: tocar el grupo abre su Resumen y despliega sus secciones; tocar una
// sección abre esa vista. En el celular la barra de abajo no se despliega
// (HIG: Tab bars) y las mismas vistas están en el control de cada pantalla.
// Cada panel, al pintarse, deja acá cómo cambiar de vista sin recargar.
const vistasPanelNav={};
const vistaPendienteNav={};
// La vista que pidió la barra, una sola vez: el panel la toma al pintarse.
function tomarVistaNav(tab){const v=vistaPendienteNav[tab];delete vistaPendienteNav[tab];return v||null;}
function marcarVistaNav(tab,vista){
  if(typeof document==='undefined'||typeof document.querySelectorAll!=='function')return;
  document.querySelectorAll(`[data-nav-vista^="${tab}:"]`).forEach(b=>{
    if(b.dataset.navVista===`${tab}:${vista}`)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}
function irAVistaNav(tab,vista='resumen'){
  if(currentTab===tab&&typeof vistasPanelNav[tab]==='function'){vistasPanelNav[tab](vista);return;}
  vistaPendienteNav[tab]=vista;
  showTab(tab);
}

function setTabTransforms(idx, dragPx){
  const drag=dragPx||0;
  NAV_TABS.forEach((tab,i)=>{
    const el=document.getElementById('screen-'+tab);
    if(!el)return;
    el.style.transform=`translate3d(calc(${(i-idx)*100}% + ${drag}px), 0, 0)`;
  });
}

function showTab(tab,skipAnim){
  if(PESTANAS.includes(tab)&&!NAV_TABS.includes(tab)){
    // La lista puede venir atrasada (recién terminó el onboarding de profesor).
    recalcularNavTabs();
    if(!NAV_TABS.includes(tab))tab=pestanaInicial();
  }
  if(NAV_TABS.includes(tab)){
    // Modo tab: snap del carrusel
    ['ramo','auth','onboard','reset'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
    NAV_TABS.forEach(t=>{const el=document.getElementById('nav-'+t);if(el){el.classList.remove('active');el.removeAttribute('aria-current');}});
    currentTab=tab;currentTabIdx=NAV_TABS.indexOf(tab);
    setTabTransforms(currentTabIdx,0);
    const nb=document.getElementById('nav-'+tab);if(nb){nb.classList.add('active');nb.setAttribute('aria-current','page');}
    // aria-expanded solo con barra lateral: abajo no hay nada que desplegar.
    const conRiel=typeof matchMedia==='function'&&matchMedia('(min-width:1024px)').matches;
    if(typeof document.querySelectorAll==='function')document.querySelectorAll('[data-nav-grupo]').forEach(g=>{
      const abierto=g.dataset.navGrupo===tab;g.hidden=!abierto;
      const dueño=document.getElementById('nav-'+g.dataset.navGrupo);
      if(dueño){if(conRiel)dueño.setAttribute('aria-expanded',String(abierto));else dueño.removeAttribute('aria-expanded');}
    });
    // Refresca la tab visible (por si cambiaron datos)
    if(tab==='home')renderHome();
    else if(tab==='stats')renderStats();
    else if(tab==='agenda')renderAgenda();
    else if(tab==='profesor'&&typeof renderProfesor==='function')renderProfesor();
    else if(tab==='alumnos'&&typeof renderAlumnosTab==='function')renderAlumnosTab();
    else if(tab==='admin'&&typeof renderAdmin==='function')renderAdmin();
    track('screen_view',{screen_name:tab});
  } else {
    // Modo overlay (ramo, auth, etc.)
    ['ramo','auth','onboard','reset'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
    const el=document.getElementById('screen-'+tab);
    if(el)el.classList.add('active');
  }
}
// Salir de un ramo vuelve a la pestaña desde donde se abrió: abierto desde
// Agenda o Estadísticas, Volver llevaba siempre a Inicio. Todos los que llaman
// a goHome() están saliendo de la ficha (Volver, borrar el ramo, un ramo que ya
// no existe).
function goHome(){
  const ramo=document.getElementById('screen-ramo');
  const destino=NAV_TABS.includes(currentTab)?currentTab:'home';
  if(ramo&&ramo.classList.contains('active'))transicionNativa('pop',()=>showTab(destino));
  else showTab(pestanaInicial());
}

// Drag continuo entre tabs — tipo historia de Instagram.
// El track sigue el dedo durante touchmove, snappea a next/prev/actual en touchend.
(function initSwipeNav(){
  let sx=0,sy=0,st=0,tracking=false,decided=false,horizontal=false,dragging=false;
  const HORIZ_LOCK=8;      // px para decidir dirección
  const SNAP_RATIO=0.22;   // 22% del viewport para snap a next/prev
  const SNAP_VELOCITY=0.5; // px/ms → velocity flick para snap con menos distancia
  function viewportW(){return document.querySelector('.app').clientWidth||window.innerWidth;}
  function onStart(e){
    if(!NAV_TABS.includes(currentTab))return;
    // Ignorar en overlays activos
    const overlays=['screen-ramo','screen-auth','screen-onboard','screen-reset'];
    for(const id of overlays){const o=document.getElementById(id);if(o&&o.classList.contains('active'))return;}
    const t=(e.touches&&e.touches[0])||e;
    const el=e.target;
    if(el.closest && el.closest('input,textarea,button,select,.modal-sheet,[role="slider"],input[type=range],.sim-cats,.hist-body'))return;
    sx=t.clientX;sy=t.clientY;st=Date.now();
    tracking=true;decided=false;horizontal=false;dragging=false;
  }
  function onMove(e){
    if(!tracking)return;
    const t=(e.touches&&e.touches[0])||e;
    const dx=t.clientX-sx,dy=t.clientY-sy;
    if(!decided){
      if(Math.abs(dx)<HORIZ_LOCK && Math.abs(dy)<HORIZ_LOCK)return;
      decided=true;
      horizontal=Math.abs(dx)>Math.abs(dy);
      if(horizontal){
        dragging=true;
        document.querySelector('.app').classList.add('dragging');
      } else {
        tracking=false;
        return;
      }
    }
    if(!dragging)return;
    // Prevenir scroll vertical mientras arrastramos horizontal
    if(e.cancelable)e.preventDefault();
    // Aplicar drag con resistencia en los bordes
    let effective=dx;
    if((currentTabIdx===0 && dx>0) || (currentTabIdx===NAV_TABS.length-1 && dx<0)){
      effective=dx*0.35; // rubber-band
    }
    setTabTransforms(currentTabIdx,effective);
  }
  function onEnd(e){
    if(!tracking){document.querySelector('.app').classList.remove('dragging');return;}
    tracking=false;
    if(!dragging){document.querySelector('.app').classList.remove('dragging');return;}
    dragging=false;
    document.querySelector('.app').classList.remove('dragging');
    const t=(e.changedTouches&&e.changedTouches[0])||e;
    const dx=t.clientX-sx,dt=Date.now()-st;
    const vw=viewportW(),velocity=Math.abs(dx)/Math.max(dt,1);
    const shouldSnap=Math.abs(dx)>vw*SNAP_RATIO || velocity>SNAP_VELOCITY;
    let next=currentTabIdx;
    if(shouldSnap){
      if(dx<0 && currentTabIdx<NAV_TABS.length-1)next=currentTabIdx+1;
      else if(dx>0 && currentTabIdx>0)next=currentTabIdx-1;
    }
    showTab(NAV_TABS[next]);
  }
  document.addEventListener('touchstart',onStart,{passive:true});
  document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('touchend',onEnd,{passive:true});
  document.addEventListener('touchcancel',onEnd,{passive:true});
})();

// Deslizar desde el borde izquierdo para salir de un ramo (solo en la app),
// como en cualquier app de iOS. La ficha sigue al dedo 1:1 y la pestaña de
// atrás asoma desde un tercio, oscurecida: el mismo dibujo que el pop animado.
// Al soltar decide por la velocidad y por cuánto se corrió; si sale, termina el
// recorrido desde donde quedó el dedo y recién ahí cambia de pantalla (sin la
// transición, que ya se vio); si no, vuelve a su lugar.
(function initVolverDeslizando(){
  if(typeof document==='undefined'||typeof document.addEventListener!=='function')return;
  const BORDE=24;      // px desde el borde donde parte el gesto
  const BLOQUEO=10;    // px para decidir si es horizontal o un scroll
  let g=null,animando=false;
  const ancho=()=>window.innerWidth||document.documentElement.clientWidth||390;
  function pintar(dx){
    const w=ancho(),p=Math.min(Math.max(dx/w,0),1);
    g.ramo.style.transform=`translate3d(${dx}px,0,0)`;
    g.atras.style.transform=`translate3d(${-0.3*w*(1-p)}px,0,0)`;
    g.atras.style.filter=`brightness(${0.9+0.1*p})`;
  }
  function limpiar(ramo,atras){
    [['transform',ramo],['transition',ramo],['boxShadow',ramo],['transition',atras],['filter',atras]].forEach(([k,el])=>{if(el)el.style[k]='';});
  }
  document.addEventListener('touchstart',e=>{
    if(animando||!enAppNativa()||!e.touches||e.touches.length!==1)return;
    const ramo=document.getElementById('screen-ramo');
    if(!ramo||!ramo.classList.contains('active')||document.documentElement.dataset.nav)return;
    if(document.querySelector('.modal-overlay.open,.confirm-overlay.open,#menu-flotante'))return;
    const t=e.touches[0];if(t.clientX>BORDE)return;
    const destino=NAV_TABS.includes(currentTab)?currentTab:'home';
    const atras=document.getElementById('screen-'+destino);if(!atras)return;
    g={ramo,atras,destino,x0:t.clientX,y0:t.clientY,dx:0,decidido:false,hist:[[t.clientX,Date.now()]]};
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!g)return;
    const t=e.touches[0],dx=t.clientX-g.x0,dy=t.clientY-g.y0;
    if(!g.decidido){
      if(Math.abs(dx)<BLOQUEO&&Math.abs(dy)<BLOQUEO)return;
      if(dx<=0||Math.abs(dy)>=Math.abs(dx)){g=null;return;}
      g.decidido=true;
      document.querySelector('.app').classList.add('dragging');
      g.ramo.style.transition='none';g.atras.style.transition='none';
      g.ramo.style.boxShadow='-12px 0 32px rgba(0,0,0,.18)';
    }
    if(e.cancelable)e.preventDefault();
    g.dx=Math.max(0,dx);pintar(g.dx);
    g.hist.push([t.clientX,Date.now()]);if(g.hist.length>5)g.hist.shift();
  },{passive:false});
  function soltar(){
    if(!g)return;
    const s=g;g=null;
    if(!s.decidido)return;
    const [x1,t1]=s.hist[0],[x2,t2]=s.hist[s.hist.length-1];
    const v=(x2-x1)/Math.max(t2-t1,1); // px/ms; positivo = hacia la derecha
    const w=ancho();
    // Un tirón hacia la derecha sale aunque haya corrido poco; uno de vuelta se
    // queda aunque haya corrido mucho. Si no hubo tirón, manda la mitad.
    const sale=v>0.35||(v>-0.2&&s.dx>w/2);
    const fin=sale?w+60:0,falta=Math.abs(fin-s.dx);
    // Termina a la velocidad del dedo: más rápido si venía rápido.
    const ms=Math.round(Math.min(380,Math.max(160,falta/Math.max(Math.abs(v),0.9))));
    animando=true;
    const curva=`transform ${ms}ms cubic-bezier(.2,.8,.2,1)`;
    s.ramo.style.transition=curva;
    s.atras.style.transition=`${curva},filter ${ms}ms linear`;
    requestAnimationFrame(()=>{
      s.ramo.style.transform=`translate3d(${fin}px,0,0)`;
      s.atras.style.transform=`translate3d(${sale?0:-0.3*w}px,0,0)`;
      s.atras.style.filter=`brightness(${sale?1:0.9})`;
    });
    setTimeout(()=>{
      if(sale)showTab(s.destino);
      limpiar(s.ramo,s.atras);
      if(sale)setTabTransforms(currentTabIdx,0);
      requestAnimationFrame(()=>{document.querySelector('.app').classList.remove('dragging');animando=false;});
    },ms+30);
  }
  document.addEventListener('touchend',soltar,{passive:true});
  document.addEventListener('touchcancel',soltar,{passive:true});
})();
