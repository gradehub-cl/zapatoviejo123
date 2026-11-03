// Lectura pública para cuentas con sesión: no consulta respuestas individuales.
const resumenesRamo=new Map();
let versionResumenRamoFicha=0,versionHojaResumenRamo=0;
function invalidarResumenRamo(tenant,clave){for(const k of resumenesRamo.keys())if(k.endsWith('|'+tenant+'|'+clave))resumenesRamo.delete(k);}
async function cargarResumenRamo(tenant,clave){
 if(typeof currentUser==='undefined'||!currentUser||typeof supabaseClient==='undefined'||!supabaseClient)return null;
 const cuenta=currentUser.id,cliente=supabaseClient,k=cuenta+'|'+tenant+'|'+clave,cache=resumenesRamo.get(k);
 if(cache&&Date.now()-cache.hora<30000)return cache.promesa;
 const promesa=(async()=>{const {data,error}=await cliente.rpc('ramo_resumen_publico',{p_tenant:tenant,p_ramo_clave:clave});if(error)throw error;return currentUser?.id===cuenta&&supabaseClient===cliente?data:null;})();
 resumenesRamo.set(k,{hora:Date.now(),promesa});try{return await promesa;}catch(e){resumenesRamo.delete(k);throw e;}
}
function resumenRamoDisponible(d){return d?.disponible===true&&Number.isSafeInteger(d.total)&&d.total>=5;}
function distribucionRamoHTML(lista,etiquetas,total){
 if(!Array.isArray(lista)||!Number.isSafeInteger(total)||total<5)return '';
 return `<ul class="rr-distribucion">${etiquetas.map((texto,i)=>{
  const dato=lista.find(x=>x.opcion===i+1),n=Number(dato?.n),seguro=Number.isSafeInteger(n)&&n>=0&&n<=total?n:0;
  return `<li><div><span>${esc(texto)}</span><span>${seguro} <small>de ${total}</small></span></div><div class="rr-pista" aria-hidden="true"><i style="width:${(seguro/total*100).toFixed(2)}%"></i></div></li>`;
 }).join('')}</ul>`;
}
function contenidoResumenRamoHTML(d){
 if(!resumenRamoDisponible(d))return '<div class="rr-vacio" role="status"><h3>Aún no hay suficientes opiniones</h3><p>El resumen aparece desde 5 estudiantes. Nadie ve respuestas individuales.</p></div>';
 const decimal=n=>Number.isFinite(Number(n))?Number(n).toFixed(1).replace('.',','):'—';
 const etiquetas=(Array.isArray(d.etiquetas)?d.etiquetas:[]).filter(e=>Number.isSafeInteger(e.n)&&e.n>=3&&RAMO_ETIQUETAS.some(x=>x.id===e.id));
 return `<p class="rr-participantes">${d.total} estudiantes respondieron <span>Una respuesta por persona · semestre más reciente</span></p>
 <section class="rr-bloque"><h3>Carga fuera de clases</h3><p>Horas a la semana</p>${distribucionRamoHTML(d.carga,RAMO_CARGAS,d.total)}</section>
 <section class="rr-bloque"><h3>Facilidad para sacarse buena nota</h3><p class="rr-cifra">${decimal(d.facilidad)} <small>de 5</small></p>${distribucionRamoHTML(d.facilidad_distribucion,['1 · Muy difícil','2','3','4','5 · Muy fácil'],d.total)}</section>
 <section class="rr-bloque"><h3>¿Lo recomiendan?</h3><p class="rr-cifra">${Math.max(0,Math.min(10,Number(d.recomiendan_de_10)||0))} <small>de cada 10</small></p></section>
 ${etiquetas.length?`<section class="rr-bloque"><h3>Lo que destacan</h3><p>Según estudiantes, no son reglas del programa.</p><ul class="rr-etiquetas">${etiquetas.map(e=>`<li>${esc(RAMO_ETIQUETAS.find(x=>x.id===e.id).texto)}${e.id==='asistencia_obligatoria'?'<small>Según estudiantes</small>':''}</li>`).join('')}</ul></section>`:''}
 <section class="rr-bloque"><h3>Profesores que lo dictan</h3><p>Según secciones informadas en distintos semestres.</p>${(Array.isArray(d.docentes)?d.docentes:[]).length?`<ul class="rr-docentes">${d.docentes.map(p=>{
  const estrellas=Number(p.estrellas?.total)>=3&&Number(p.estrellas?.promedio)>=1&&Number(p.estrellas?.promedio)<=5?`<span class="rr-estrellas">★ ${decimal(p.estrellas.promedio)} de 5</span>`:'';
  const propio=p.ramo&&Number.isSafeInteger(p.ramo.total)&&p.ramo.total>=5?p.ramo:null;
  return `<li><h4>${esc(p.nombre)} ${estrellas}</h4>${propio?`<p>${propio.total} estudiantes · Facilidad ${decimal(propio.facilidad)} de 5</p>${distribucionRamoHTML(propio.carga,RAMO_CARGAS,propio.total)}`:'<p>Sin muestra suficiente para carga y facilidad con este profesor.</p>'}</li>`;
 }).join('')}</ul>`:'<p>Todavía no hay docentes públicos confirmados para este ramo.</p>'}</section>`;
}
function encontrarRamoParaCalificar(tenant,clave){
 const candidatos=S.ramos.map(r=>({r,periodo:semester()})).concat((S.historial||[]).flatMap(h=>(h.ramos||[]).map(r=>({r,periodo:h.label}))));
 return candidatos.find(x=>{const c=contextoCalificarRamo(x.r,x.periodo);return c&&c.tenant===tenant&&c.clave===clave;})||null;
}
async function abrirResumenRamo(r,{tenant=S.tenant,alVolver=null,alAgregar=null}={}){
 const cuenta=typeof currentUser!=='undefined'&&currentUser?.id,cliente=typeof supabaseClient!=='undefined'&&supabaseClient;
 const caja=document.getElementById('modal-content');if(!caja)return;const version=++versionHojaResumenRamo,clave=claveCalificarRamo(r);
 const vigente=()=>version===versionHojaResumenRamo&&currentUser?.id===cuenta&&supabaseClient===cliente&&caja.querySelector('[data-rr-body]')&&document.getElementById('modal').classList.contains('open');
 const propio=cuenta&&!esCuentaProfesor()?encontrarRamoParaCalificar(tenant,clave):null;
 caja.innerHTML=`<div class="modal-title rr-titulo">Cómo es este ramo</div><p class="rc-nombre">${esc(r.nombre)}</p><div class="rr-contenido" data-rr-body><p role="status">${cuenta?'Cargando opiniones…':'Inicia sesión para ver las opiniones.'}</p></div>
 <div class="modal-btns"><button type="button" class="btn-cancel" data-rr-volver>${alVolver?'Volver':'Cerrar'}</button>${alAgregar?'<button type="button" class="btn-confirm" data-rr-agregar>Agregar ramo</button>':propio?'<button type="button" class="btn-confirm" data-rr-calificar>Dar mi opinión</button>':''}</div>`;
 caja.querySelector('[data-rr-volver]').onclick=()=>alVolver?alVolver():closeModal();
 const agregar=caja.querySelector('[data-rr-agregar]');if(agregar)agregar.onclick=alAgregar;
 const calificar=caja.querySelector('[data-rr-calificar]');if(calificar)calificar.onclick=()=>abrirCalificarRamo(propio.r,{periodo:propio.periodo,alVolver:()=>abrirResumenRamo(r,{tenant,alVolver,alAgregar})});
 openModal();const titulo=caja.querySelector('.modal-title');titulo.setAttribute('tabindex','-1');enfocarEnHoja(titulo);if(!cuenta)return;
 try{const d=await cargarResumenRamo(tenant,clave);if(vigente())caja.querySelector('[data-rr-body]').innerHTML=contenidoResumenRamoHTML(d);}
 catch(e){if(vigente())caja.querySelector('[data-rr-body]').innerHTML='<p role="status">No pudimos cargar las opiniones. Puedes seguir y agregar el ramo igualmente.</p>';}
}
// Se agrega al resultado, no a searchCatalog: el motor de búsqueda no espera red.
function accionResumenCatalogoHTML(r){
 return typeof currentUser!=='undefined'&&currentUser?`<button type="button" class="ramo-catalogo-resumen" data-como-ramo data-nombre="${esc(r.nombre)}" data-sigla="${esc(r.sigla||'')}">Cómo es este ramo</button>`:'';
}
function enlazarResumenesCatalogo(caja,q){
 if(!caja?.querySelectorAll)return;const tenant=S.tenant,cuenta=typeof currentUser!=='undefined'&&currentUser?.id,estado=S,despues=alAgregarRamo,cancelar=alCancelarAgregarRamo;
 caja.querySelectorAll('[data-como-ramo]').forEach(b=>b.addEventListener('click',()=>{
  if(!currentUser||currentUser.id!==cuenta||S!==estado)return;
  const r={nombre:b.dataset.nombre,sigla:b.dataset.sigla,origen:{tenant,ramoKey:ramoKey(b.dataset.nombre,tenant,S.carrera,b.dataset.sigla)}};
  const volver=()=>{if(currentUser?.id!==cuenta||S!==estado)return;openAddRamoModal(despues,cancelar);const input=document.getElementById('m-ramo-search');if(input){input.value=q;renderCatalogResults(q);}};
  abrirResumenRamo(r,{tenant,alVolver:volver,alAgregar:()=>{if(currentUser?.id===cuenta&&S===estado)addFromCatalog(r.nombre,r.sigla);}});
 }));
}
async function pintarResumenRamoFicha(r){
 const version=++versionResumenRamoFicha,cuenta=typeof currentUser!=='undefined'&&currentUser?.id;
 const hero=document.querySelector('#screen-ramo .ramo-hero');
 const anterior=document.getElementById('ramo-opinion');if(anterior?.remove)anterior.remove();
 if(!cuenta||!hero||typeof hero.appendChild!=='function'||typeof supabaseClient==='undefined'||!supabaseClient)return;
 const c=contextoCalificarRamo(r),cliente=supabaseClient,tenant=S.tenant;
 const vigente=()=>version===versionResumenRamoFicha&&currentUser?.id===cuenta&&supabaseClient===cliente&&S.ramos.includes(r)&&currentRamoId===r.id&&document.getElementById('screen-ramo')?.classList.contains('active');
 try{
  const [resumen,privado]=await Promise.all([cargarResumenRamo(tenant,claveCalificarRamo(r)),c?cliente.rpc('ramo_calificacion_estado',argumentosCalificarRamo(c)).catch(()=>({data:null})):Promise.resolve({data:null})]);
  if(!vigente())return;const estado=privado.error?null:privado.data,dato=resumenRamoDisponible(resumen);
  const invitacion=elegibleAvisoCalificarRamo(r,c,estado),mia=!!estado?.mia;
  if(!dato&&!invitacion&&!mia)return;
  const linea=document.createElement('div');linea.id='ramo-opinion';linea.className='ramo-opinion';
  linea.innerHTML=`${dato?`<button type="button" class="ramo-opinion-resumen" data-rc-resumen>${resumen.recomiendan_de_10} de cada 10 lo recomiendan · Cómo es este ramo <span aria-hidden="true">›</span></button>`:''}
  ${invitacion?`<div class="ramo-opinion-invitacion"><span>¿Cómo ha sido ${esc(r.nombre)}?</span><button type="button" data-rc-calificar>Dar mi opinión</button><button type="button" data-rc-descartar>Ahora no</button></div>`:mia?'<button type="button" class="ramo-opinion-resumen" data-rc-calificar>Tu opinión del ramo · Editar</button>':''}`;
  linea.querySelector('[data-rc-resumen]')?.addEventListener('click',()=>abrirResumenRamo(r));
  linea.querySelector('[data-rc-calificar]')?.addEventListener('click',()=>abrirCalificarRamo(r));
  linea.querySelector('[data-rc-descartar]')?.addEventListener('click',()=>linea.querySelector('.ramo-opinion-invitacion')?.remove());
  hero.appendChild(linea);if(invitacion)marcarAvisoCalificarRamo(c);
 }catch(e){} // Sin SQL/red, la ficha y el cálculo siguen funcionando igual.
}
