function etiquetarCamposDelModal(raiz){
  if(!raiz||typeof raiz.querySelectorAll!=='function')return;
  raiz.querySelectorAll('label.modal-label:not([for])').forEach(lab=>{
    // Una etiqueta que ya envuelve su campo está asociada por anidamiento. Sin
    // esta guarda, la del checkbox "Son varias notas" se llevaba un `for` al
    // campo de FECHA que venía después: peor que no etiquetar, porque el lector
    // anuncia el campo equivocado con toda seguridad.
    if(lab.querySelector('input,select,textarea'))return;
    let el=lab.nextElementSibling,campo=null;
    while(el&&!campo){campo=el.matches&&el.matches('input,select,textarea')?el:el.querySelector&&el.querySelector('input,select,textarea');el=el.nextElementSibling;}
    if(!campo)return;
    if(!campo.id)campo.id='campo-'+Math.random().toString(36).slice(2,9);
    lab.setAttribute('for',campo.id);
  });
}
// ─── Hojas como en iOS (solo en la app) ─────────────────────────────────────
// En la app, cada hoja lleva arriba la barra de iOS: cerrar (X) o volver (‹) a
// la izquierda y la acción principal a la derecha, a la vista aunque la hoja
// sea larga (HIG, Sheets: Cancel al inicio de la barra, Done al final). No se
// reescribe ninguna hoja: se mueven a la barra los botones que ya traen, con su
// onclick y su id. Lo que no es cerrar, volver o confirmar (elegir entre dos,
// borrar, copiar) se queda abajo, igual que en la web.
const HOJA_CERRAR=/^(cancelar|cerrar)$/i,HOJA_VOLVER=/^(atrás|volver)$/i;
const HOJA_CONFIRMAR=/^(guardar|agregar|enviar|marcar|importar|continuar|listo|crear|aplicar|actualizar)\b/i;
function armarBarraDeHoja(c){
  if(!c||typeof c.querySelector!=='function'||c.querySelector(':scope > .hoja-barra'))return;
  const txt=b=>(b.textContent||'').trim();
  const filas=[...c.querySelectorAll('.modal-btns:not(.agent-proposal-actions)')];
  const fila=filas[filas.length-1];
  const enFila=fila?[...fila.querySelectorAll('button')]:[];
  const cancelar=b=>b.classList.contains('btn-cancel');
  const izq=c.querySelector('.settings-back')||c.querySelector('.settings-cerrar')
    ||enFila.find(b=>cancelar(b)&&HOJA_CERRAR.test(txt(b)))||enFila.find(b=>cancelar(b)&&HOJA_VOLVER.test(txt(b)));
  const confirmables=enFila.filter(b=>b!==izq&&b.classList.contains('btn-confirm')&&HOJA_CONFIRMAR.test(txt(b)));
  const der=c.querySelector('.settings-save')||(confirmables.length===1?confirmables[0]:null);
  if(!izq&&!der)return;
  const barra=document.createElement('div');barra.className='hoja-barra';
  [izq,der].forEach((b,i)=>{
    const lado=document.createElement('div');lado.className=i?'hoja-barra-der':'hoja-barra-izq';
    if(b){
      // Un botón de envío fuera de su <form> deja de enviarlo: se le dice cuál es.
      const form=b.form;
      if(form&&b.type==='submit'){if(!form.id)form.id='hoja-form';b.setAttribute('form',form.id);}
      if(i)b.classList.add('hoja-confirmar');
      else{
        b.classList.add(b.classList.contains('settings-back')||HOJA_VOLVER.test(txt(b))?'hoja-volver':'hoja-cerrar');
        if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',txt(b));
      }
      lado.appendChild(b);
    }
    barra.appendChild(lado);
  });
  c.prepend(barra);
  if(fila&&!fila.querySelector('button'))fila.remove();
}
try{
  const contenido=document.getElementById('modal-content');
  if(contenido&&typeof MutationObserver==='function'&&document.documentElement.classList.contains('app-nativa'))
    new MutationObserver(()=>armarBarraDeHoja(contenido)).observe(contenido,{childList:true});
}catch(e){}
let _quienAbrioModal=null;

function openModal(){
  const ov=document.getElementById('modal');
  // Cambiar una hoja ya abierta conserva el punto de regreso original.
  if(!ov.classList.contains('open'))_quienAbrioModal=document.activeElement;
  ov.classList.add('open');
  const sheet=document.querySelector('.modal-sheet');
  const contenido=document.getElementById('modal-content');
  const titulo=contenido&&typeof contenido.querySelector==='function'?contenido.querySelector('.modal-title'):null;
  if(sheet&&typeof sheet.setAttribute==='function'){
    if(titulo){
      if(!titulo.id)titulo.id='modal-titulo';
      sheet.setAttribute('aria-labelledby',titulo.id);
      sheet.removeAttribute('aria-label');
    }else{
      sheet.removeAttribute('aria-labelledby');
      sheet.setAttribute('aria-label','Ventana');
    }
  }
  etiquetarCamposDelModal(contenido);
  sheet.scrollTop=0;
}
// El cierre no necesita JavaScript: `transition-behavior:allow-discrete` en el
// overlay hace que `display:none` se aplique AL FINAL de la transición, así que
// quitar `.open` basta para que el sheet baje y recién ahí desaparezca.
// La versión anterior de este arreglo llevaba una clase `.cerrando` y un
// `transitionend`; sobraba entera.
// El campo que una hoja enfoca al abrirse. En la app espera a que la hoja
// termine de subir y no desplaza la página: si el foco llegaba antes, WebKit
// corría todo hacia arriba para mostrar un campo que todavía venía subiendo, y
// la hoja quedaba bajo la barra de estado, con el botón de cerrar fuera de la
// vista. En la web sigue como siempre.
function enfocarEnHoja(el,despues){
  if(!el)return;
  const ir=()=>{
    if(!el.isConnected)return;
    if(enAppNativa()){try{el.focus({preventScroll:true});}catch(e){el.focus();}}
    else el.focus();
    if(despues)despues();
  };
  // Solo se espera si la hoja está subiendo (recién abierta); dentro de una
  // hoja ya abierta, como Ajustes, el foco llega como antes.
  const hoja=enAppNativa()&&document.querySelector('#modal.open .modal-sheet');
  const dura=hoja?parseFloat(getComputedStyle(hoja).transitionDuration)*1000||0:0;
  const subiendo=!!(hoja&&hoja.getAnimations&&hoja.getAnimations().length);
  setTimeout(ir,subiendo?Math.max(100,dura):100);
}
function closeModal(){
  const despuesDeCancelar=alCancelarAgregarRamo;
  alAgregarRamo=null;
  alCancelarAgregarRamo=null;
  document.getElementById('modal').classList.remove('open');
  // En el carrusel de pestañas el documento nunca se desplaza: cada pantalla
  // tiene su propio `.scroll`. Si el teclado de iPhone dejó la página corrida
  // al escribir en el modal, se devuelve a su lugar para que el dedo vuelva a
  // mover la lista y no ese desplazamiento fantasma.
  try{
    const app=document.querySelector('.app');
    const se=document.scrollingElement;
    if(app&&app.classList&&app.classList.contains('tab-mode')&&se&&se.scrollTop)se.scrollTop=0;
  }catch(e){}
  // El foco vuelve a quien abrió, salvo que ese elemento ya no exista (un
  // botón de una lista que se volvió a dibujar). Ahí se deja como está: mandarlo
  // al body a la fuerza es peor que dejarlo quieto.
  const volver=_quienAbrioModal;_quienAbrioModal=null;
  if(volver&&volver.isConnected&&typeof volver.focus==='function'&&volver!==document.body){
    try{volver.focus({preventScroll:true});}catch(e){volver.focus();}
  }
  if(despuesDeCancelar)despuesDeCancelar();
}
// En computador, hacer clic en el fondo cierra la ventana. Con mouse es el
// gesto que todo el mundo espera —la confirmación ya lo hacía— y no compite
// con nada: un clic es deliberado y no se puede disparar sin querer mientras
// alguien recorre una lista.
//
// En táctil NO, y no es un olvido. Ahí ese mismo toque es parte del gesto de
// desplazar, y cerrar al tocar fuera fue justo lo que hacía desaparecer el
// simulador a media edición (#422, #424). Un modal que se cierra solo mientras
// alguien escribe notas le borra el trabajo.
//
// Se piden las DOS mitades del clic sobre el fondo. Si alguien empieza a
// seleccionar texto dentro de la hoja y suelta el botón afuera, el navegador
// dispara igual un `click` cuyo target es el overlay: sin esta guarda,
// arrastrar para seleccionar una nota cerraría la ventana.
function punteroDeMouse(){
  try{
    return !!(typeof window!=='undefined'&&window.matchMedia&&
      window.matchMedia('(hover:hover) and (pointer:fine)').matches);
  }catch(e){return false;}
}
let _clicEmpezoEnElFondo=false;
function esElFondoDelModal(el){return !!(el&&el.id==='modal');}
function clicEnElFondo(e){
  const empezoAfuera=_clicEmpezoEnElFondo;
  _clicEmpezoEnElFondo=false;
  if(!empezoAfuera||!esElFondoDelModal(e&&e.target))return false;
  if(!punteroDeMouse())return false;
  // La confirmación se dibuja encima del modal: si está abierta, el clic es suyo.
  const conf=document.getElementById('confirm-overlay');
  if(conf&&conf.classList&&conf.classList.contains('open'))return false;
  const ov=document.getElementById('modal');
  return !!(ov&&ov.classList&&ov.classList.contains('open'));
}
document.addEventListener('mousedown',e=>{_clicEmpezoEnElFondo=esElFondoDelModal(e&&e.target);});
document.addEventListener('click',e=>{if(clicEnElFondo(e))closeModal();});

// Cerrar con tecla Escape (confirmación tiene prioridad sobre el modal)
// Un <div role="button"> no responde al teclado por su cuenta: el navegador solo
// le da comportamiento de botón a <button>. Sin esto, el elemento se enfoca con
// Tab, se ve enfocado, y apretar Enter no hace nada — peor que no poder llegar,
// porque promete una interacción que no ocurre.
//
// Va delegado y no atributo por atributo: en este archivo el patrón estaba
// escrito de tres formas distintas —con onkeydown, sin él, y sin tabindex— y
// cada elemento nuevo repetía el olvido. Espacio además de Enter, porque un
// botón de verdad responde a los dos.
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const el=e.target&&e.target.closest&&e.target.closest('[role="button"]');
  if(!el||el.tagName==='BUTTON'||el.tagName==='A'||el.disabled)return;
  // Un campo dentro de la tarjeta se queda con su tecla: Enter en un input es
  // enviar, no activar el contenedor.
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))return;
  e.preventDefault();
  el.click();
});

// Una hoja abierta conserva el recorrido del teclado dentro de sus controles.
// La confirmación de encima tiene su propio recorrido y toma la prioridad.
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const modal=document.getElementById('modal');
  const confirmacion=document.getElementById('confirm-overlay');
  if(!modal.classList.contains('open')||confirmacion.classList.contains('open'))return;
  const controles=[...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
    .filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
  const i=controles.indexOf(document.activeElement);
  if(controles.length&&(i<0||(e.shiftKey?i===0:i===controles.length-1))){
    e.preventDefault();
    controles[e.shiftKey?controles.length-1:0].focus({preventScroll:true});
  }
});

// Enter o Tab en una casilla de nota guarda y salta a la siguiente (Shift+Tab,
// a la anterior). Guardar repinta la ficha entera (renderRamo) y el foco caía
// al body: quien llenaba varias notas seguidas tenía que volver a tocar cada
// casilla. Tab solo se intercepta si la nota cambió; si no, no hay repintado y
// el orden nativo sirve.
document.addEventListener('keydown',e=>{
  const el=e.target;
  if(!el.matches||!el.matches('#screen-ramo input.eval-row-input'))return;
  if(e.key!=='Enter'&&!(e.key==='Tab'&&el.value!==el.defaultValue))return;
  e.preventDefault();
  const casillas=()=>[...document.querySelectorAll('#screen-ramo .eval-row-input,#screen-ramo .nota-en-fila')];
  const i=casillas().indexOf(el);
  el.blur(); // dispara onchange → setSlotNota/setDirectNota → renderRamo
  const sig=casillas()[i+(e.shiftKey?-1:1)];
  if(sig){sig.focus();if(sig.select)sig.select();}
});
document.addEventListener('keydown',e=>{
  const conf=document.getElementById('confirm-overlay');
  if(e.key==='Tab'&&conf.classList.contains('open')){
    const botones=[...conf.querySelectorAll('button:not(:disabled)')];
    const i=botones.indexOf(document.activeElement);
    if(botones.length&&(i<0||(e.shiftKey?i===0:i===botones.length-1))){
      e.preventDefault();
      botones[e.shiftKey?botones.length-1:0].focus({preventScroll:true});
    }
    return;
  }
  if(e.key!=='Escape')return;
  if(conf.classList.contains('open'))closeConfirm();
  else if(document.getElementById('modal').classList.contains('open'))closeModal();
});
