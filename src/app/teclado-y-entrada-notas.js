// ─── EL TECLADO NO PUEDE TAPAR LO QUE ESTÁS ESCRIBIENDO ──────────────────────
// En el teléfono, el teclado se come la mitad de abajo de la pantalla. Al tocar
// una casilla que está en esa mitad, quedaba escondida detrás: se escribía a
// ciegas, sin ver la nota ni el nombre de la evaluación. Pasa sobre todo en las
// evaluaciones desplegables largas —Participación de Programación abre diez
// casillas, 618px de alto— donde casi cualquiera cae abajo.
//
// El navegador a veces la sube solo, pero dentro de un contenedor con scroll
// propio (`.scroll`) suele dejarla justo bajo el borde del teclado, que se ve
// igual que no hacer nada.
//
// `visualViewport` es lo único que sabe el alto REAL con el teclado abierto:
// window.innerHeight no cambia cuando el teclado aparece.
// El scroll no puede subir un campo que ya está al final del contenido: no hay
// nada abajo contra lo que empujar. La última casilla de una evaluación es
// justo ese caso, y es la que más se toca al ponerse al día. Por eso primero se
// le presta al contenedor el alto que el teclado tapó, y recién después se
// sube el campo.
function espacioTeclado(){
  const vp=window.visualViewport;
  return vp?Math.max(0,Math.round(window.innerHeight-vp.height-(vp.offsetTop||0))):0;
}
function contenedorDesplazable(el){
  return (el.closest&&(el.closest('.modal-sheet')||el.closest('.scroll')))||null;
}
function asegurarVisibleSobreTeclado(el){
  if(!el||!el.getBoundingClientRect)return;
  const cont=contenedorDesplazable(el);
  const oculto=espacioTeclado();
  if(cont&&oculto>0)cont.style.paddingBottom=oculto+'px';
  const alto=window.innerHeight-oculto;
  const r=el.getBoundingClientRect();
  // Margen para que no quede pegada al borde del teclado, sino con aire.
  // Sin `behavior:'smooth'`: la animación no llegaba a correr antes de que el
  // teclado terminara de subir, así que el campo se quedaba tapado igual. Y de
  // paso respeta a quien pidió menos movimiento.
  if(r.bottom>alto-16||r.top<8){
    try{el.scrollIntoView({block:'center'});}
    catch(e){el.scrollIntoView(false);}
  }
}
function soltarEspacioTeclado(){
  document.querySelectorAll('.scroll,.modal-sheet').forEach(c=>{c.style.paddingBottom='';});
}

// Delegado: se engancha una vez y cubre todo lo que se dibuje después, sin que
// cada render tenga que acordarse.
document.addEventListener('focusin',e=>{
  const el=e.target;
  if(!el||!el.matches||!el.matches('input,textarea,select'))return;
  // El teclado tarda en aparecer, y antes de que aparezca la cuenta da bien y
  // no se hace nada. Se mide después.
  setTimeout(()=>{
    // Si ya se fue a otro campo, que ese otro se encargue: mover la pantalla por
    // uno que quedó atrás es peor que no hacer nada.
    if(el.isConnected&&(document.activeElement===el||document.activeElement===document.body))asegurarVisibleSobreTeclado(el);
  },320);
});
// Al cerrarse el teclado el préstamo se devuelve, o queda un hueco en blanco al
// final de la pantalla que nadie explica.
document.addEventListener('focusout',()=>{
  setTimeout(()=>{
    const a=document.activeElement;
    if(!a||!a.matches||!a.matches('input,textarea,select'))soltarEspacioTeclado();
  },120);
});
window.visualViewport&&window.visualViewport.addEventListener('resize',()=>{
  if(espacioTeclado()===0)soltarEspacioTeclado();
});

function setSlotNota(catId,slot,raw){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const cat=r.categorias.find(c=>c.id===catId);if(!cat)return;
  const promedioAntes=ramoAvg(r);const gpaAntes=gpa(S.ramos);
  const txt=String(raw||'').trim();
  // La casilla se EDITA, no se rehace. Antes se borraba y se volvía a crear, y
  // con eso se perdía todo lo que no fuera el número: la fecha de esa casilla,
  // su hora y el nombre que le hubieran puesto. Escribir la nota del Control 2
  // borraba que era el 18 de octubre.
  const existente=cat.notas.find(n=>n.slot===slot);
  const val=txt===''?NaN:parseNota(txt);
  if(txt!==''&&!isNaN(val)){
    if(existente)asignarCalificacionNota(existente,txt,val);
    else cat.notas.push(asignarCalificacionNota({id:uid(),nombre:etiquetaCasilla(r,cat,slot),peso:1,slot},txt,val));
  }else if(existente){
    // Vaciar la nota no borra la casilla si tiene fecha: queda pendiente, que
    // es lo que dice "esto se rinde ese día y todavía no tengo la nota".
    if(existente.fecha)asignarCalificacionNota(existente,'',null);
    else cat.notas=cat.notas.filter(n=>n.slot!==slot);
  }
  save();track('set_nota_slot');renderRamo();
  const notaValida=txt!==''&&!isNaN(parseNota(txt));
  if(notaValida){
    vibrar('nota');
    const promedioDespues=ramoAvg(r);const gpaDespues=gpa(S.ramos);
    animarPromedio(document.getElementById('ramo-hero-avg'),promedioAntes,promedioDespues,'ramo');
    if(cambioDePromedio(gpaAntes,gpaDespues)){
      pendingGpaFeedback={antes:gpaAntes,despues:gpaDespues};
      mostrarEcoGpa(gpaAntes,gpaDespues);
    }
    showToast(lecturaDespuesDeNota(r));
  }
}
// Nota directa para secciones de preset: crea/actualiza/borra la única nota.
function setDirectNota(catId,raw){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const cat=r.categorias.find(c=>c.id===catId);if(!cat)return;
  const promedioAntes=ramoAvg(r);const gpaAntes=gpa(S.ramos);
  const txt=String(raw||'').trim();
  if(txt===''){cat.notas=[];}
  else{
    const val=parseNota(txt);
    if(!isNaN(val)){
      // Igual que las casillas: editar el objeto conserva los metadatos de la
      // nota, incluida una recorrección pendiente.
      const existente=cat.notas[0];
      if(existente){existente.nombre=cat.nombre;existente.peso=1;asignarCalificacionNota(existente,txt,val);}
      else cat.notas=[asignarCalificacionNota({id:uid(),nombre:cat.nombre,peso:1},txt,val)];
    }
  }
  save();track('set_nota_directa');renderRamo();
  const notaValida=txt!==''&&!isNaN(parseNota(txt));
  if(notaValida){
    vibrar('nota');
    const promedioDespues=ramoAvg(r);const gpaDespues=gpa(S.ramos);
    animarPromedio(document.getElementById('ramo-hero-avg'),promedioAntes,promedioDespues,'ramo');
    if(cambioDePromedio(gpaAntes,gpaDespues)){
      pendingGpaFeedback={antes:gpaAntes,despues:gpaDespues};
      mostrarEcoGpa(gpaAntes,gpaDespues);
    }
    showToast(lecturaDespuesDeNota(r));
  }
}
function confirmDeleteRamo(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  showConfirm(`Eliminar "${r.nombre}"`,`Se eliminarán todas las secciones y notas. Esta acción no se puede deshacer.`,()=>{
    track('delete_ramo');S.ramos=S.ramos.filter(x=>x.id!==currentRamoId);save();goHome();
  });
}
function confirmDeleteCat(catId){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const cat=r.categorias.find(c=>c.id===catId);if(!cat)return;
  showConfirm(`Eliminar "${cat.nombre}"`,`Se eliminarán todas las notas de esta evaluación.`,()=>{
    const totalAntes=r.categorias.reduce((s,c)=>s+(Number(c.peso)||0),0);
    r.categorias=r.categorias.filter(c=>c.id!==catId);
    repartirPesoRestante(r.categorias,totalAntes);
    save();renderRamo();
  });
}
function deleteNota(catId,notaId){
  const r=S.ramos.find(x=>x.id===currentRamoId);const cat=r.categorias.find(c=>c.id===catId);
  cat.notas=cat.notas.filter(n=>n.id!==notaId);save();renderRamo();vibrar('borrar');
}
