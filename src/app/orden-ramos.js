
// ─── ORDEN MANUAL DE RAMOS ─────────────────────────────────────────────────
// En touch, mover al primer contacto vuelve imposible hacer scroll desde una
// tarjeta. La espera separa las dos intenciones: deslizar antes de 420 ms sigue
// siendo scroll; sostener activa el arrastre. Mouse no necesita esa defensa.
const RAMO_LONG_PRESS_MS=420;
const RAMO_MOVE_TOLERANCE=8;
function esperaReordenRamo(pointerType){return pointerType==='touch'?RAMO_LONG_PRESS_MS:0;}
function movimientoCancelaReorden(dx,dy){return Math.hypot(dx,dy)>RAMO_MOVE_TOLERANCE;}

function guardarOrdenRamos(ids){
  if(!Array.isArray(ids)||ids.length!==S.ramos.length||new Set(ids).size!==ids.length)return false;
  const porId=new Map(S.ramos.map(r=>[r.id,r]));
  if(ids.some(id=>!porId.has(id)))return false;
  if(ids.every((id,i)=>S.ramos[i].id===id))return false;
  S.ramos=ids.map(id=>porId.get(id));
  save();
  track('reorder_ramos',{count:S.ramos.length});
  return true;
}

function anunciar(texto){
  let el=document.getElementById('anuncio-a11y');
  if(!el){
    el=document.createElement('div');
    el.id='anuncio-a11y';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    el.style.cssText='position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
    document.body.appendChild(el);
  }
  // Vaciar primero: repetir el mismo texto no dispara el anuncio de nuevo.
  el.textContent='';
  setTimeout(()=>{el.textContent=texto;},30);
}

// Mueve el NODO en vez de volver a dibujar la lista, igual que hace el arrastre
// al soltar. Antes se llamaba a renderHome() y se intentaba devolver el foco al
// asa en el fotograma siguiente, pero el asa ya no era la misma —el render la
// había reemplazado— y el foco terminaba en el body. Quien mueve con teclado
// tenía que volver a tabular hasta el ramo para dar el segundo paso, o sea
// reordenar tres ramos costaba tres recorridos completos.
function moverRamoConTeclado(id,delta){
  if(S.sortMode!=='manual')return;
  const cont=document.getElementById('home-ramos');
  if(!cont)return;
  const filas=[...cont.querySelectorAll('.ramo-row')];
  const desde=filas.findIndex(el=>el.dataset.ramoId===id),hasta=desde+delta;
  if(desde<0||hasta<0||hasta>=filas.length)return;
  if(delta>0)cont.insertBefore(filas[hasta],filas[desde]);
  else cont.insertBefore(filas[desde],filas[hasta]);
  if(!guardarOrdenRamos([...cont.querySelectorAll('.ramo-row')].map(el=>el.dataset.ramoId))){
    renderHome();return;
  }
  // Mover algo con el teclado no se ve: sin esto, quien usa lector de pantalla
  // oye el nombre del ramo pero nunca dónde quedó.
  const fila=filas[desde];
  const nombre=(fila.querySelector('.ramo-name')||{}).textContent||'El ramo';
  anunciar(`${nombre}, posición ${hasta+1} de ${filas.length}`);
}

function activarReordenRamos(container){
  const scroll=container.closest('.scroll');
  [...container.querySelectorAll('.ramo-drag-handle')].forEach(handle=>{
    const row=handle.closest('.ramo-row');
    let timer=null,drag=null,startX=0,startY=0;

    function moverGhost(x,y){
      if(!drag)return;
      drag.x=x;drag.y=y;
      drag.ghost.style.left=(x-drag.offsetX)+'px';
      drag.ghost.style.top=(y-drag.offsetY)+'px';
    }

    function reubicar(x,y){
      if(!drag)return;
      moverGhost(x,y);
      if(scroll){
        const sr=scroll.getBoundingClientRect();
        if(y<sr.top+64)scroll.scrollTop-=12;
        else if(y>sr.bottom-64)scroll.scrollTop+=12;
      }
      const hit=document.elementFromPoint(x,y);
      const target=hit&&hit.closest&&hit.closest('#home-ramos .ramo-row');
      if(!target||target===row||target.parentElement!==container)return;
      const filas=[...container.querySelectorAll('.ramo-row')];
      const desde=filas.indexOf(row),hasta=filas.indexOf(target);
      if(desde<hasta)container.insertBefore(row,target.nextSibling);
      else container.insertBefore(row,target);
    }

    function iniciar(x,y){
      if(drag||S.sortMode!=='manual')return;
      const rect=row.getBoundingClientRect();
      const ghost=row.cloneNode(true);
      ghost.classList.add('ramo-drag-ghost');
      ghost.setAttribute('aria-hidden','true');
      ghost.style.width=rect.width+'px';
      document.body.appendChild(ghost);
      drag={ghost,offsetX:x-rect.left,offsetY:y-rect.top,x,y};
      // En iOS, lo que se levanta con el dedo se siente al despegar.
      vibrar('levantar');
      row.classList.add('ramo-drag-source');
      container.classList.add('ramo-reordering');
      document.body.classList.add('ramo-drag-active');
      moverGhost(x,y);
    }

    function terminar(){
      clearTimeout(timer);timer=null;
      if(!drag)return;
      drag.ghost.remove();drag=null;
      row.classList.remove('ramo-drag-source');
      container.classList.remove('ramo-reordering');
      document.body.classList.remove('ramo-drag-active');
      guardarOrdenRamos([...container.querySelectorAll('.ramo-row')].map(el=>el.dataset.ramoId));
    }

    handle.addEventListener('touchstart',e=>{
      if(e.touches.length!==1)return;
      e.stopPropagation();
      const t=e.touches[0];startX=t.clientX;startY=t.clientY;
      clearTimeout(timer);
      timer=setTimeout(()=>iniciar(startX,startY),esperaReordenRamo('touch'));
    },{passive:true});
    handle.addEventListener('touchmove',e=>{
      if(e.touches.length!==1)return;
      const t=e.touches[0];
      if(!drag&&movimientoCancelaReorden(t.clientX-startX,t.clientY-startY)){
        clearTimeout(timer);timer=null;
        return; // no preventDefault: este gesto sigue siendo scroll
      }
      if(!drag)return;
      e.preventDefault();e.stopPropagation();
      reubicar(t.clientX,t.clientY);
    },{passive:false});
    handle.addEventListener('touchend',e=>{e.stopPropagation();terminar();},{passive:true});
    handle.addEventListener('touchcancel',terminar,{passive:true});

    handle.addEventListener('mousedown',e=>{
      if(e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      iniciar(e.clientX,e.clientY);
      const move=ev=>{ev.preventDefault();reubicar(ev.clientX,ev.clientY);};
      const up=()=>{document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);terminar();};
      document.addEventListener('mousemove',move);
      document.addEventListener('mouseup',up);
    });
    handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    handle.addEventListener('contextmenu',e=>e.preventDefault());
    handle.addEventListener('keydown',e=>{
      const delta=(e.key==='ArrowUp'||e.key==='ArrowLeft')?-1:(e.key==='ArrowDown'||e.key==='ArrowRight')?1:0;
      if(!delta)return;
      e.preventDefault();e.stopPropagation();moverRamoConTeclado(row.dataset.ramoId,delta);
    });
  });
}
