// Presentación privada Profesor/Admin. No registra eventos ni calcula notas.
const PERIODOS_PRIVADOS=[['1','Hoy'],['7','7 días'],['30','Un mes'],['inicio','Desde el inicio']];
const numeroPrivado=n=>Number.isFinite(n)?new Intl.NumberFormat('es-CL').format(n):'—';
const fechaPrivada=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
function periodoPrivadoHTML(valor='7',hoy=true){
  return `<div class="pe-periodos" role="group" aria-label="Período de estadísticas">${PERIODOS_PRIVADOS.filter(([v])=>hoy||v!=='1').map(([v,t])=>`<button type="button" data-pe-periodo="${v}" aria-pressed="${v===valor}">${t}</button>`).join('')}</div>`;
}
function intervaloPrivado(filas,periodo,ahora=Date.now()){
  const hoy=diaLocalPanel(new Date(ahora)),fin=Date.parse(hoy+'T12:00:00Z');
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
function cifraPrivadaHTML(valor,etiqueta,detalle=''){
  return `<div class="pe-cifra"><strong>${esc(valor)}</strong><span>${esc(etiqueta)}</span>${detalle?`<small>${esc(detalle)}</small>`:''}</div>`;
}
function graficoPrivadoHTML(puntos,{titulo,tipo='columnas',unidad='vistas',id='privado'}={}){
  if(!puntos.length)return '<p class="clase-sin-datos">Aún no hay datos para este período.</p>';
  const max=typeof topeEjeAdmin==='function'?Math.max(2,topeEjeAdmin(Math.max(...puntos.map(p=>p.valor)))):Math.max(2,...puntos.map(p=>p.valor));
  const coords=puntos.map((p,i)=>({x:puntos.length===1?500:i/(puntos.length-1)*1000,y:220*(1-p.valor/max)}));
  const media=puntos.reduce((n,p)=>n+p.valor,0)/puntos.length;
  const gradiente='pe-grad-'+String(id).replace(/[^a-z0-9-]/gi,'');
  let dibujo='';
  if(tipo==='linea'&&puntos.length>1){
    const d=typeof trazoEvolucionNotas==='function'?trazoEvolucionNotas(coords):'M'+coords.map(p=>p.x+','+p.y).join(' L');
    dibujo=`<path d="${d} L1000,220 L0,220 Z" fill="url(#${gradiente})"/><path d="${d}" class="pe-curva"/>`;
  }else{
    const ancho=Math.min(90,1000/puntos.length*.68);
    dibujo=puntos.map((p,i)=>{const x=(i+.5)/puntos.length*1000-ancho/2,y=220*(1-p.valor/max);return `<rect x="${x}" y="${y}" width="${ancho}" height="${220-y}" fill="url(#${gradiente})"/><path d="M${x},${y} h${ancho}" class="pe-curva"/>`;}).join('');
  }
  return `<figure class="pe-grafico" data-pe-grafico><figcaption><h3>${esc(titulo)}</h3><span>${esc(puntos[0].etiqueta)}${puntos.length>1?' – '+esc(puntos[puntos.length-1].etiqueta):''}</span></figcaption>
    <div class="pe-chart"><div class="pe-eje" aria-hidden="true">${[max,max/2,0].map((n,i)=>`<span style="top:${i*50}%">${numeroPrivado(n)}</span>`).join('')}</div>
    <div class="pe-plot" role="slider" tabindex="0" aria-label="Explorar ${esc(titulo)}" aria-valuemin="0" aria-valuemax="${puntos.length-1}" aria-valuenow="${puntos.length-1}" aria-valuetext="${esc(puntos.at(-1).etiqueta+', '+numeroPrivado(puntos.at(-1).valor)+' '+unidad)}" data-pe-puntos="${esc(JSON.stringify(puntos))}" data-pe-max="${max}" data-pe-tipo="${tipo}" data-pe-unidad="${esc(unidad)}">
      <div class="pe-media" style="top:${100*(1-media/max)}%" aria-hidden="true"></div>
      <svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gradiente}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="var(--pe-acento)" stop-opacity=".25"/><stop offset="1" stop-color="var(--pe-acento)" stop-opacity="0"/></linearGradient></defs>${dibujo}</svg>
      <div class="pe-cursor" hidden aria-hidden="true"></div><div class="pe-notita" hidden aria-hidden="true"><span></span><b></b></div>
    </div></div><div class="pe-fechas" aria-hidden="true"><span>${esc(puntos[0].etiqueta)}</span><span>${puntos.length>1?esc(puntos.at(-1).etiqueta):''}</span></div>
    <p class="pe-media-texto">Promedio ${/semana/.test(titulo)?'semanal':'diario'} · ${esc(new Intl.NumberFormat('es-CL',{maximumFractionDigits:1}).format(media))} ${esc(unidad)}</p>
    <details class="pe-tabla"><summary>Ver datos</summary><table><thead><tr><th>Fecha</th><th>${esc(unidad)}</th></tr></thead><tbody>${puntos.map(p=>`<tr><td>${esc(p.etiqueta)}</td><td>${numeroPrivado(p.valor)}</td></tr>`).join('')}</tbody></table></details></figure>`;
}
function enlazarGraficosPrivados(raiz){
  raiz.querySelectorAll('[data-pe-puntos]').forEach(plot=>{
    if(typeof plot.getBoundingClientRect!=='function'||plot.dataset.peEnlazado)return;
    plot.dataset.peEnlazado='1';
    const pts=JSON.parse(plot.dataset.pePuntos),tip=plot.querySelector('.pe-notita'),cursor=plot.querySelector('.pe-cursor');let elegido=pts.length-1,arrastrando=false;
    const ocultar=()=>{tip.hidden=cursor.hidden=true;};
    const elegir=i=>{
      elegido=Math.max(0,Math.min(pts.length-1,i));const p=pts[elegido],barras=plot.dataset.peTipo!=='linea';
      const x=barras?(elegido+.5)/pts.length*100:pts.length===1?50:elegido/(pts.length-1)*100;
      plot.setAttribute('aria-valuenow',String(elegido));plot.setAttribute('aria-valuetext',p.etiqueta+', '+numeroPrivado(p.valor)+' '+plot.dataset.peUnidad);
      tip.querySelector('span').textContent=p.etiqueta;tip.querySelector('b').textContent=numeroPrivado(p.valor)+' '+plot.dataset.peUnidad;
      tip.hidden=cursor.hidden=false;cursor.style.left=x+'%';
      tip.style.left=`clamp(0px, calc(${x}% - 5rem), max(0px, calc(100% - 10rem)))`;
      tip.style.top=Math.max(0,(1-p.valor/Number(plot.dataset.peMax))*plot.clientHeight-tip.offsetHeight-12)+'px';
    };
    const mover=e=>{const r=plot.getBoundingClientRect();elegir(plot.dataset.peTipo==='linea'?Math.round((e.clientX-r.left)/r.width*(pts.length-1)):Math.floor((e.clientX-r.left)/r.width*pts.length));};
    plot.addEventListener('pointerdown',e=>{if(e.button!==0)return;arrastrando=true;plot.focus({preventScroll:true});plot.setPointerCapture(e.pointerId);mover(e);});
    plot.addEventListener('pointermove',e=>{if(arrastrando||e.pointerType==='mouse')mover(e);});
    plot.addEventListener('pointerup',()=>{arrastrando=false;});plot.addEventListener('pointercancel',()=>{arrastrando=false;ocultar();});
    plot.addEventListener('pointerleave',()=>{if(!arrastrando)ocultar();});plot.addEventListener('blur',ocultar);plot.addEventListener('focus',()=>elegir(elegido));
    plot.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')elegir(elegido-1);if(e.key==='ArrowRight')elegir(elegido+1);if(e.key==='Home')elegir(0);if(e.key==='End')elegir(pts.length-1);if(e.key==='Escape')ocultar();});
  });
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
