// Solo presentación: el mismo resumen que reciben los widgets.
let temporizadorClasesHoy=null;
function clasesHoyHTML(resumen,ahora=new Date()){
  const ms=new Date(ahora).getTime(),vigentes=resumen.clasesHoy.filter(c=>Date.parse(c.finAt)>ms);
  const actual=vigentes.find(c=>Date.parse(c.inicioAt)<=ms),principal=actual||vigentes[0];
  if(!principal)return '';
  const otras=vigentes.filter(c=>c.id!==principal.id);
  const linea=c=>[c.tipo,c.sala?'Sala '+c.sala:'Sala sin indicar'].filter(Boolean).join(' · ');
  return `<section class="clases-hoy" aria-labelledby="clases-hoy-titulo"><header><h2 id="clases-hoy-titulo">Hoy</h2><span>${actual?'En clase':'Próxima clase'}</span></header>
    <button type="button" class="clases-hoy-principal" data-clase-ramo="${esc(principal.ramoId)}"><span class="clases-hoy-hora">${actual?'Hasta las '+esc(principal.fin):esc(principal.inicio)}<small>${actual?'Desde las '+esc(principal.inicio):'Hasta las '+esc(principal.fin)}</small></span><span class="clases-hoy-nombre"><b>${esc(principal.ramo)}</b><small>${esc(linea(principal))}</small></span><span aria-hidden="true">›</span></button>
    ${otras.length?`<ul>${otras.map(c=>`<li><button type="button" data-clase-ramo="${esc(c.ramoId)}"><time datetime="${esc(c.inicioAt)}">${esc(c.inicio)}</time><span><b>${esc(c.ramo)}</b><small>${esc(linea(c))}</small></span><span aria-hidden="true">›</span></button></li>`).join('')}</ul>`:''}</section>`;
}
function renderClasesHoy(ahora=new Date()){
  clearTimeout(temporizadorClasesHoy);temporizadorClasesHoy=null;
  const ancla=document.getElementById('ramos-hd');if(!ancla||typeof ancla.insertAdjacentElement!=='function')return;
  let caja=document.getElementById('home-horario');
  if(!caja){caja=document.createElement('div');caja.id='home-horario';ancla.insertAdjacentElement('beforebegin',caja);}
  const resumen=esCuentaProfesor()?{clasesHoy:[]}:resumenHorarioClases(S.ramos,ahora);
  caja.innerHTML=clasesHoyHTML(resumen,ahora);caja.hidden=!caja.innerHTML;
  caja.querySelectorAll('[data-clase-ramo]').forEach(b=>b.addEventListener('click',()=>openRamo(b.dataset.claseRamo)));
  // Cambia en los límites reales de clase y en la medianoche de Chile. No
  // recalcula notas ni escribe datos al pasar el tiempo.
  if(esCuentaProfesor()||!S.ramos.some(r=>copiarHorario(r.horario).length))return;
  const ms=new Date(ahora).getTime(),manana=new Date(Date.parse(resumen.fechaHoy+'T12:00:00Z')+864e5).toISOString().slice(0,10);
  const medianoche=instanteHorarioChile(manana,'00:00')||instanteHorarioChile(manana,'01:00');
  const cambios=[Date.parse(medianoche),...resumen.clasesHoy.flatMap(c=>[Date.parse(c.inicioAt),Date.parse(c.finAt)])].filter(t=>t>ms);
  temporizadorClasesHoy=setTimeout(()=>renderClasesHoy(),Math.min(2147483647,Math.max(1,Math.min(...cambios)-ms+50)));
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){clearTimeout(temporizadorClasesHoy);temporizadorClasesHoy=null;}
  else if(typeof S!=='undefined'&&S.onboardingDone)renderClasesHoy();
});
