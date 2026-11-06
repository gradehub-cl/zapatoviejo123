// Día de las métricas nuevas: calendario chileno, independiente del dispositivo.
function diaMetricasChile(instante=Date.now()){
  const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instante));
  const valor=k=>partes.find(p=>p.type===k).value;
  return valor('year')+'-'+valor('month')+'-'+valor('day');
}
// Presentación privada Profesor/Admin. No registra eventos ni calcula notas.
const PERIODOS_PRIVADOS=[['1','Hoy'],['7','7 días'],['30','Un mes'],['inicio','Desde el inicio']];
const numeroPrivado=n=>Number.isFinite(n)?new Intl.NumberFormat('es-CL').format(n):'—';
const fechaPrivada=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
function periodoPrivadoHTML(valor='7',hoy=true){
  return `<div class="pe-periodos" role="group" aria-label="Período de estadísticas">${PERIODOS_PRIVADOS.filter(([v])=>hoy||v!=='1').map(([v,t])=>`<button type="button" data-pe-periodo="${v}" aria-pressed="${v===valor}">${t}</button>`).join('')}</div>`;
}
function intervaloPrivado(filas,periodo,ahora=Date.now()){
  // Las nuevas métricas usan Chile; las históricas conservan su fecha.
  // Hoy se delimita en Chile, sin depender del dispositivo ni refechar filas.
  const hoy=diaMetricasChile(ahora),fin=Date.parse(hoy+'T12:00:00Z');
  const disponibles=(filas||[]).map(f=>String(f.dia).slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=hoy).sort();
  const desde=periodo==='inicio'?(disponibles[0]||hoy):new Date(fin-(Number(periodo)-1)*864e5).toISOString().slice(0,10);
  return {desde,hasta:hoy,filas:(filas||[]).filter(f=>String(f.dia).slice(0,10)>=desde&&String(f.dia).slice(0,10)<=hoy)};
}
function sumarHistorialPrivado(filas){
  return (filas||[]).reduce((s,f)=>({vistas:s.vistas+Number(f.vistas||0),aperturas:s.aperturas+Number(f.aperturas||0),contactos:s.contactos+Number(f.contactos||0)}),{vistas:0,aperturas:0,contactos:0});
}
function serieHistorialPrivado(filas,periodo,clave='vistas',ahora=Date.now()){
  const rango=intervaloPrivado(filas,periodo,ahora),porDia=new Map();
  rango.filas.forEach(f=>porDia.set(String(f.dia).slice(0,10),(porDia.get(String(f.dia).slice(0,10))||0)+Number(f[clave]||0)));
  const cantidad=Math.round((Date.parse(rango.hasta)-Date.parse(rango.desde))/864e5)+1,paso=cantidad>35?7:1,puntos=[];
  for(let i=0;i<cantidad;i+=paso){
    const inicio=new Date(Date.parse(rango.desde+'T12:00:00Z')+i*864e5).toISOString().slice(0,10);
    const fin=new Date(Date.parse(rango.desde+'T12:00:00Z')+Math.min(cantidad-1,i+paso-1)*864e5).toISOString().slice(0,10);
    let valor=0;for(let j=i;j<Math.min(cantidad,i+paso);j++){const dia=new Date(Date.parse(rango.desde+'T12:00:00Z')+j*864e5).toISOString().slice(0,10);valor+=porDia.get(dia)||0;}
    puntos.push({valor,etiqueta:fechaPrivada(inicio)+(inicio===fin?'':' – '+fechaPrivada(fin))});
  }
  return {...rango,puntos,semanal:paso===7};
}
// Mejora progresiva: conserva el select y sus eventos para los filtros actuales.
function enlazarSelectoresPrivados(raiz){
  if(typeof document==='undefined'||typeof document.createElement!=='function'||typeof raiz.appendChild!=='function')return;
  raiz.querySelectorAll('#admin-hig-estado, #admin-estado-profesor, [data-pe-select]').forEach(select=>{
    if(select.dataset.peMejorado)return;select.dataset.peMejorado='1';
    const etiqueta=select.closest('label'),contenedor=etiqueta?.parentElement||select.parentElement;
    if(!contenedor)return;
    const trigger=document.createElement('button'),menu=document.createElement('div'),id=select.id+'-pe-menu';
    trigger.type='button';trigger.className='pe-selector';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-expanded','false');
    menu.id=id;menu.className='pe-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Estado');menu.setAttribute('popover','auto');
    menu.innerHTML='<p role="presentation">Estado</p>'+[...select.options].map(o=>`<button type="button" role="menuitemradio" tabindex="-1" data-pe-opcion="${esc(o.value)}"><span>${esc(o.textContent)}</span><i aria-hidden="true">✓</i></button>`).join('')+'<button type="button" role="menuitem" tabindex="-1" data-pe-cerrar>Cerrar</button>';
    contenedor.appendChild(trigger);contenedor.appendChild(menu);select.hidden=true;select.tabIndex=-1;if(etiqueta)etiqueta.hidden=true;
    const nativo=typeof menu.showPopover==='function';if(!nativo){menu.removeAttribute('popover');menu.hidden=true;}
    const actualizar=()=>{const o=[...select.options].find(o=>o.value===select.value);trigger.textContent=(o?.textContent||'Estado')+' ⌄';trigger.setAttribute('aria-label','Estado: '+(o?.textContent||'Todos'));menu.querySelectorAll('[data-pe-opcion]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.peOpcion===select.value)));};
    const posicionar=()=>{const movil=window.matchMedia('(max-width: 600px)').matches,r=trigger.getBoundingClientRect();menu.style.width=movil?'calc(100% - 32px)':'220px';menu.style.left=movil?'16px':Math.max(16,Math.min(innerWidth-236,r.left))+'px';menu.style.top=movil?'auto':Math.max(16,Math.min(innerHeight-menu.offsetHeight-16,r.bottom+8))+'px';menu.style.bottom=movil?'max(16px, env(safe-area-inset-bottom))':'auto';};
    const cerrar=(foco=true)=>{trigger.setAttribute('aria-expanded','false');if(nativo){if(menu.matches(':popover-open'))menu.hidePopover();}else menu.hidden=true;if(foco)trigger.focus({preventScroll:true});};
    trigger.addEventListener('click',()=>{actualizar();if(trigger.getAttribute('aria-expanded')==='true'){cerrar();return;}posicionar();if(nativo)menu.showPopover();else menu.hidden=false;posicionar();trigger.setAttribute('aria-expanded','true');menu.querySelector('[aria-checked="true"]')?.focus({preventScroll:true});});
    menu.addEventListener('toggle',e=>trigger.setAttribute('aria-expanded',String(e.newState==='open')));
    menu.querySelectorAll('[data-pe-opcion]').forEach(b=>b.addEventListener('click',()=>{select.value=b.dataset.peOpcion;actualizar();select.dispatchEvent(new Event('change',{bubbles:true}));cerrar();}));
    menu.querySelector('[data-pe-cerrar]').addEventListener('click',()=>cerrar());
    menu.addEventListener('keydown',e=>{const items=[...menu.querySelectorAll('button')].filter(b=>getComputedStyle(b).display!=='none'),i=items.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus({preventScroll:true});}if(e.key==='Escape'){e.preventDefault();cerrar();}if(e.key==='Tab')cerrar(false);});
    select.addEventListener('change',actualizar);actualizar();
  });
}
function colorDiferenciaPrivada(delta){
  if(!Number.isFinite(delta)||Math.abs(delta)<.05)return 'var(--fg2)';
  const t=Math.min(1,Math.abs(delta))*100;
  return `color-mix(in srgb, ${delta>0?'var(--pe-verde-suave)':'var(--yellow)'} ${100-t}%, ${delta>0?'var(--green)':'var(--red)'} ${t}%)`;
}
