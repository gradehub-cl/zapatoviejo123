// ─── HERRAMIENTAS EN INICIO (Lucas, 2026-11-17) ─────────────────────────────
// La llave inglesa arriba a la derecha de Inicio abre un menú con las
// herramientas de vez en cuando: calculadora, foto del horario, notas de
// Canvas y semestres pasados (HIG: Pull-down buttons). Las mismas siguen en
// Perfil › Herramientas; acá solo quedan más a mano. En la app y en la web
// (Lucas, 2026-11-23): las herramientas ya existían en la web, esto solo las
// acerca. Canvas sigue apareciendo solo donde está su plugin nativo.
const ICONO_HERRAMIENTAS='<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
// Qué herramientas ve esta cuenta. Función pura, como gruposPerfil.
function herramientasInicio({tenant,conCanvas,conFicha}){
  const lista=[['calculadora','Calculadora de nota']];
  if(tenant==='uc')lista.push(['horario','Subir foto del horario']);
  if(conCanvas)lista.push(['canvas','Traer notas de Canvas']);
  if(conFicha)lista.push(['ficha','Cargar semestres pasados']);
  return lista;
}
const ACCIONES_HERRAMIENTAS={
  calculadora:()=>openCalculadoraApp(),
  horario:()=>abrirImportarHorarioBuscacursos(),
  ficha:()=>openAvanceCurricular(),
  canvas:()=>openSettings('canvas',{volverA:'Inicio',accionCanvas:'notas'}),
};
function herramientasInicioDisponibles(){
  if(esCuentaProfesor())return [];
  return herramientasInicio({tenant:S.tenant,conCanvas:typeof canvasDisponible==='function'&&canvasDisponible(),
    conFicha:typeof avanceCurricularDisponible==='function'&&avanceCurricularDisponible()});
}
// La llama renderHome: el botón se ve solo si hay herramientas para esta cuenta.
function pintarHerramientasInicio(){
  const caja=document.getElementById('herramientas-inicio');
  if(!caja)return;
  const lista=herramientasInicioDisponibles();
  caja.hidden=!lista.length;
  const boton=document.getElementById('herramientas-boton');
  if(boton&&!boton.innerHTML.trim())boton.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONO_HERRAMIENTAS}</svg>`;
  const menu=document.getElementById('herramientas-menu');
  if(!menu)return;
  menu.innerHTML=lista.map(([clave,titulo])=>`<button type="button" role="menuitem" data-herramienta="${clave}">
    <svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${clave==='canvas'?ICONO_CANVAS:PERFIL_ICONOS[clave]||''}</svg><span>${esc(titulo)}</span></button>`).join('');
  menu.querySelectorAll('[data-herramienta]').forEach(b=>b.addEventListener('click',()=>{
    cerrarHerramientasInicio(false);
    const accion=ACCIONES_HERRAMIENTAS[b.dataset.herramienta];if(accion)accion();
  }));
}
function cerrarHerramientasInicio(devolverFoco=true){
  const menu=document.getElementById('herramientas-menu'),boton=document.getElementById('herramientas-boton');
  if(!menu||menu.hidden)return;
  menu.hidden=true;if(boton){boton.setAttribute('aria-expanded','false');if(devolverFoco)boton.focus();}
  document.removeEventListener('pointerdown',fueraHerramientasInicio,true);
  document.removeEventListener('keydown',teclaHerramientasInicio,true);
}
function fueraHerramientasInicio(e){
  const caja=document.getElementById('herramientas-inicio');
  if(caja&&!caja.contains(e.target))cerrarHerramientasInicio(false);
}
// Escape cierra; las flechas recorren las opciones, como un menú del sistema.
function teclaHerramientasInicio(e){
  const items=[...document.querySelectorAll('#herramientas-menu [role=menuitem]')];
  if(e.key==='Escape'){e.preventDefault();cerrarHerramientasInicio();return;}
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
  e.preventDefault();
  const i=items.indexOf(document.activeElement),n=items.length;
  if(n)items[(i+(e.key==='ArrowDown'?1:-1)+n)%n].focus();
}
function alternarHerramientasInicio(){
  const menu=document.getElementById('herramientas-menu'),boton=document.getElementById('herramientas-boton');
  if(!menu||!boton)return;
  if(!menu.hidden){cerrarHerramientasInicio();return;}
  pintarHerramientasInicio();
  menu.hidden=false;boton.setAttribute('aria-expanded','true');
  menu.querySelector('[role=menuitem]')?.focus();
  document.addEventListener('pointerdown',fueraHerramientasInicio,true);
  document.addEventListener('keydown',teclaHerramientasInicio,true);
}
