const SECCIONES_STATS=[
  {id:'ritmo',      titulo:'Tu promedio en el tiempo'},
  {id:'prioridades',titulo:'Qué mirar primero'},
  {id:'mueven',     titulo:'Qué mueve tu promedio'},
  {id:'curso',      titulo:'Cómo vas en tus ramos'},
  {id:'rango',      titulo:'Rango del semestre'},
  {id:'historial',  titulo:'Historial'},
  // Sale de lo que se responde en la Actividad en Vivo: existe solo en la app.
  {id:'olfato',     titulo:'Tu olfato',disponible:()=>typeof avisosPruebasDisponibles==='function'&&avisosPruebasDisponibles()},
];
function ordenSecciones(){
  const guardado=Array.isArray(S.statsOrden)?S.statsOrden:[];
  const existe=id=>{const d=SECCIONES_STATS.find(s=>s.id===id);return !!d&&(!d.disponible||d.disponible());};
  const validos=guardado.filter(existe);
  // Una seccion nueva no puede quedar invisible solo porque el estudiante
  // guardo su orden antes de que existiera: las que faltan se agregan al final.
  SECCIONES_STATS.forEach(s=>{if(existe(s.id)&&!validos.includes(s.id))validos.push(s.id);});
  return validos;
}
function seccionOculta(id){
  return Array.isArray(S.statsOcultas)&&S.statsOcultas.includes(id);
}
function toggleSeccionStats(id,visible){
  const ocultas=new Set(Array.isArray(S.statsOcultas)?S.statsOcultas:[]);
  if(visible)ocultas.delete(id);else ocultas.add(id);
  S.statsOcultas=[...ocultas];
  save();renderStats();renderEditarSecciones();
}
function moverSeccionStats(id,delta){
  const orden=ordenSecciones();
  const i=orden.indexOf(id),j=i+delta;
  if(i<0||j<0||j>=orden.length)return;
  orden.splice(j,0,orden.splice(i,1)[0]);
  S.statsOrden=orden;
  save();renderStats();renderEditarSecciones();
}
function openEditarSeccionesModal(){
  renderEditarSecciones();
  openModal();
}
function renderEditarSecciones(){
  const box=document.getElementById('modal-content');if(!box)return;
  const orden=ordenSecciones();
  const filas=orden.map((id,i)=>{
    const def=SECCIONES_STATS.find(s=>s.id===id);
    if(!def)return '';
    const visible=!seccionOculta(id);
    return `<div class="sec-row${visible?'':' oculta'}">
      <div class="sec-mover">
        <button type="button" onclick="moverSeccionStats('${esc(id)}',-1)" ${i===0?'disabled':''} aria-label="Subir ${esc(def.titulo)}">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg></button>
        <button type="button" onclick="moverSeccionStats('${esc(id)}',1)" ${i===orden.length-1?'disabled':''} aria-label="Bajar ${esc(def.titulo)}">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      </div>
      <span class="sec-nombre">${esc(def.titulo)}</span>
      <label class="toggle"><input type="checkbox" ${visible?'checked':''} onchange="toggleSeccionStats('${esc(id)}',this.checked)" aria-label="Mostrar ${esc(def.titulo)}"/><span class="toggle-slider"></span></label>
    </div>`;
  }).join('');
  box.innerHTML=`
    <div class="modal-title">Editar Estadísticas</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:14px;">
      Ordena las secciones o esconde las que no miras. Se guarda al momento y
      solo cambia tu pantalla.
    </p>
    <div class="sec-lista">${filas}</div>
    <div class="modal-btns"><button class="btn-confirm" onclick="closeModal()">Listo</button></div>`;
}
