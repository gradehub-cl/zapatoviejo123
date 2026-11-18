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
const decimalRamo=n=>Number.isFinite(Number(n))?Number(n).toFixed(1).replace('.',','):'—';
function bloqueRamoValido(b){return !!b&&Number.isSafeInteger(b.total)&&b.total>=5;}
// «7 de 9 dicen que no se toma asistencia»: un hecho, contado entre quienes se acuerdan.
function asistenciaRamoTexto(b){
 const si=Number(b?.asistencia?.si),no=Number(b?.asistencia?.no);
 if(!Number.isSafeInteger(si)||!Number.isSafeInteger(no)||si<0||no<0||si+no<5||si+no>b.total)return '';
 return si>=no?`${si} de ${si+no} dicen que se toma asistencia`:`${no} de ${si+no} dicen que no se toma asistencia`;
}
function horasRamoTexto(b){
 const lista=Array.isArray(b?.carga)?b.carga:[];let mejor=null;
 for(const x of lista)if(Number.isSafeInteger(x?.n)&&x.n>0&&x.opcion>=1&&x.opcion<=4&&(!mejor||x.n>mejor.n))mejor=x;
 return mejor?RAMO_CARGAS[mejor.opcion-1]:'—';
}
function etiquetasRamoHTML(b){
 const lista=(Array.isArray(b?.etiquetas)?b.etiquetas:[]).filter(e=>Number.isSafeInteger(e.n)&&e.n>=3&&RAMO_ETIQUETAS.some(x=>x.id===e.id));
 return lista.length?`<ul class="rr-etiquetas">${lista.map(e=>`<li>${esc(RAMO_ETIQUETAS.find(x=>x.id===e.id).texto)}</li>`).join('')}</ul>`:'';
}
// Cada cifra en su escala (docs/guia/reglas-y-entrega.md, «Estadísticas pone
// cada número en su escala»): una posición de 1 a 5 o una parte de un total va
// en anillo; las horas, en una barra repartida con el tramo más común
// destacado; la comparación entre profesores, en barras paralelas sobre la
// misma escala. Se muestra solo lo que ayuda a decidir con quién tomarlo.
function anilloRamoHTML({fraccion,valor,de,pie,etiqueta}){
 return `<figure class="stats-anillo-dato rr-anillo">${htmlAnillo({fraccion,chico:true,etiqueta,
  centro:`<span class="anillo-valor">${esc(valor)}</span>${de?`<span class="rr-anillo-de">${esc(de)}</span>`:''}`})}<figcaption class="stats-anillo-pie">${esc(pie)}</figcaption></figure>`;
}
const escala5Ramo=v=>Math.max(0,Math.min(1,(Number(v)-1)/4));
// La palabra que acompaña a la cifra (piezas de Estadísticas: «una palabra»).
function palabraFacilidadRamo(v){const n=Number(v);return n<2.5?'Difícil':n<=3.5?'Media':'Fácil';}
function asistenciaRamo(b){
 const si=Number(b?.asistencia?.si),no=Number(b?.asistencia?.no);
 return Number.isSafeInteger(si)&&Number.isSafeInteger(no)&&si>=0&&no>=0&&si+no>=5&&si+no<=b.total?{si,no,n:si+no}:null;
}
function recomiendanRamo(b){return Math.max(0,Math.min(10,Math.round(Number(b?.recomiendan_de_10)||0)));}
function anillosRamoHTML(b){
 const rec=recomiendanRamo(b),asis=asistenciaRamo(b);
 const mayoria=asis?(asis.si>=asis.no?{palabra:'Sí',n:asis.si}:{palabra:'No',n:asis.no}):null;
 return `<div class="stats-anillos-fila rr-anillos">
  ${anilloRamoHTML({fraccion:escala5Ramo(b.facilidad),valor:decimalRamo(b.facilidad),de:palabraFacilidadRamo(b.facilidad),pie:'Facilidad para sacarse buena nota, de 1 a 5',etiqueta:`Facilidad ${decimalRamo(b.facilidad)} de 5: ${palabraFacilidadRamo(b.facilidad).toLowerCase()}`})}
  ${anilloRamoHTML({fraccion:rec/10,valor:String(rec),de:'de 10',pie:'Lo recomiendan',etiqueta:`${rec} de cada 10 lo recomiendan`})}
  ${mayoria?anilloRamoHTML({fraccion:mayoria.n/asis.n,valor:mayoria.palabra,de:`${mayoria.n} de ${asis.n}`,pie:'¿Se toma asistencia?',etiqueta:asistenciaRamoTexto(b)}):''}
 </div>`;
}
// Una sola barra repartida en los cuatro tramos: se lee de un vistazo cuánto
// pesa el más común sin una tabla de cuatro filas.
function horasRamoHTML(b){
 const lista=RAMO_CARGAS.map((texto,i)=>{const n=Number((Array.isArray(b?.carga)?b.carga:[]).find(x=>x?.opcion===i+1)?.n);return {texto,n:Number.isSafeInteger(n)&&n>=0?n:0};});
 const total=lista.reduce((a,x)=>a+x.n,0),moda=lista.reduce((m,x)=>x.n>m.n?x:m,{n:0});
 if(!total||!moda.n)return '';
 return `<div class="rr-horas"><div class="rr-horas-cabeza"><span>Horas a la semana fuera de clases</span><b>${esc(moda.texto)} h <small>${moda.n} de ${total}</small></b></div>
  <div class="rr-reparto" role="img" aria-label="${esc(lista.map(x=>`${x.texto} horas: ${x.n} de ${total}`).join('; '))}">${lista.filter(x=>x.n).map(x=>`<i${x===moda?' class="rr-destacada"':''} style="flex-grow:${x.n}"></i>`).join('')}</div>
  <div class="rr-reparto-escala" aria-hidden="true"><span>Menos</span><span>Más</span></div></div>`;
}
const METRICAS_RAMO=[
 {titulo:'Facilidad para sacarse buena nota',dato:p=>{const v=Number(p.opiniones?.facilidad);return Number.isFinite(v)?{f:escala5Ramo(v),texto:decimalRamo(v),de:'de 5'}:null;}},
 {titulo:'Lo recomiendan',dato:p=>{const v=recomiendanRamo(p.opiniones);return {f:v/10,texto:String(v),de:'de 10'};}},
 {titulo:'Dicen que se toma asistencia',dato:p=>{const a=asistenciaRamo(p.opiniones);return a?{f:a.si/a.n,texto:String(a.si),de:`de ${a.n}`}:null;}},
 {titulo:'Horas a la semana, lo más común',dato:p=>{const i=RAMO_CARGAS.indexOf(horasRamoTexto(p.opiniones));return i>=0?{f:(i+1)/4,texto:['< 3','3 a 6','6 a 10','> 10'][i],de:'h'}:null;}},
 {titulo:'Cómo enseña',dato:p=>{const v=Number(p.estrellas?.promedio);return Number(p.estrellas?.total)>=3&&v>=1&&v<=5?{f:escala5Ramo(v),texto:decimalRamo(v),de:'de 5'}:null;}},
];
const ENSENA_RAMO=METRICAS_RAMO[METRICAS_RAMO.length-1];
function filaRamoHTML(quien,d){
 return `<li><span class="rr-quien">${esc(quien)}</span><span class="rr-riel" aria-hidden="true"><i style="width:${(Math.max(0.03,d.f)*100).toFixed(1)}%"></i></span><span class="rr-valor">${esc(d.texto)} <small>${esc(d.de)}</small></span></li>`;
}
function comparacionRamoHTML(docentes){
 return METRICAS_RAMO.map(m=>{
  const filas=docentes.map(p=>({p,d:m.dato(p)})).filter(x=>x.d);
  return filas.length?`<section class="rr-metrica"><h4>${esc(m.titulo)}</h4><ul class="rr-filas">${filas.map(({p,d})=>filaRamoHTML(p.nombre,d)).join('')}</ul></section>`:'';
 }).join('');
}
// coordinado: true suma todo al ramo (mismas pruebas en todas las secciones) y
// del profesor muestra solo cómo enseña. false o null (sin dato) compara a los
// profesores lado a lado y nunca muestra un promedio que los mezcle.
function contenidoResumenRamoHTML(d,{coordinado=null}={}){
 if(!resumenRamoDisponible(d))return '<div class="rr-vacio" role="status"><h3>Aún no hay suficientes opiniones</h3><p>El resumen aparece desde 5 estudiantes. Nadie ve respuestas individuales.</p></div>';
 const docentes=Array.isArray(d.docentes)?d.docentes.filter(p=>p&&typeof p.nombre==='string'):[];
 const pie=`<p class="rr-participantes">${d.total} estudiantes respondieron <span>Una respuesta por persona · semestre más reciente</span></p>`;
 if(coordinado===true){
  const conEstrellas=docentes.filter(p=>ENSENA_RAMO.dato(p));
  return `${pie}
 <section class="rr-bloque"><h3>Cómo es el ramo</h3><p>Coordinado: las mismas pruebas en todas las secciones.</p>${anillosRamoHTML(d)}${horasRamoHTML(d)}${etiquetasRamoHTML(d)}</section>
 ${conEstrellas.length?`<section class="rr-bloque"><h3>Cómo enseña cada profesor</h3><ul class="rr-filas">${conEstrellas.map(p=>filaRamoHTML(p.nombre,ENSENA_RAMO.dato(p))).join('')}</ul></section>`:''}`;
 }
 const conDatos=docentes.filter(p=>bloqueRamoValido(p.opiniones)),pocos=docentes.filter(p=>!bloqueRamoValido(p.opiniones));
 return `${pie}
 <section class="rr-bloque rr-por-profesor"><h3>Depende de con quién lo tomes</h3><p>Cada profesor arma sus pruebas, así que los comparamos lado a lado.</p>
 ${conDatos.length?comparacionRamoHTML(conDatos):'<p class="rr-pocos">Todavía no alcanzan para separarlas por profesor.</p>'}
 ${conDatos.length&&pocos.length?`<p class="rr-pocos">Con pocas opiniones todavía: ${pocos.map(p=>esc(p.nombre)).join(', ')}.</p>`:''}</section>`;
}
// Espera las mallas diferidas para saber si el ramo es coordinado. Sin dato, null.
async function coordinacionResumenRamo(r,tenant){
 try{if(typeof asegurarMallasCoordinacion==='function')await asegurarMallasCoordinacion(tenant);}catch(e){}
 try{const c=coordinacionRamo({...r,origen:{...(r.origen||{}),tenant}});return typeof c?.coordinado==='boolean'?c.coordinado:null;}catch(e){return null;}
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
 try{const [d,coordinado]=await Promise.all([cargarResumenRamo(tenant,clave),coordinacionResumenRamo(r,tenant)]);if(vigente())caja.querySelector('[data-rr-body]').innerHTML=contenidoResumenRamoHTML(d,{coordinado});}
 catch(e){if(vigente())caja.querySelector('[data-rr-body]').innerHTML='<p role="status">No pudimos cargar las opiniones. Puedes seguir y agregar el ramo igualmente.</p>';}
}
// «Cómo es este ramo» no se muestra en el buscador ni en la ficha: cuando el
// estudiante ya eligió el ramo, no tiene nada que hacer con esa información.
// Se mostrará solo en la toma de ramos, que aún no definimos (Lucas,
// 2026-11-18). abrirResumenRamo queda para ese momento. En la ficha solo se
// pide la opinión propia.
async function pintarResumenRamoFicha(r,opinion=consultarCalificacionRamoFicha(r)){
 const version=++versionResumenRamoFicha,cuenta=typeof currentUser!=='undefined'&&currentUser?.id;
 const hero=document.querySelector('#screen-ramo .ramo-hero');
 const anterior=document.getElementById('ramo-opinion');if(anterior?.remove)anterior.remove();
 if(!cuenta||!hero||typeof hero.appendChild!=='function'||typeof supabaseClient==='undefined'||!supabaseClient)return;
 const c=contextoCalificarRamo(r),cliente=supabaseClient;
 const vigente=()=>version===versionResumenRamoFicha&&currentUser?.id===cuenta&&supabaseClient===cliente&&S.ramos.includes(r)&&currentRamoId===r.id&&document.getElementById('screen-ramo')?.classList.contains('active');
 try{
  const estado=await opinion;
  if(!vigente())return;
  const invitacion=elegibleAvisoCalificarRamo(r,c,estado),mia=!!estado?.mia;
  if(!invitacion&&!mia)return;
  const linea=document.createElement('div');linea.id='ramo-opinion';linea.className='ramo-opinion';
  linea.innerHTML=`${invitacion?`<div class="ramo-opinion-invitacion"><span>¿Cómo ha sido ${esc(r.nombre)}?</span><button type="button" data-rc-calificar>Dar mi opinión</button><button type="button" data-rc-descartar>Ahora no</button></div>`:mia?'<button type="button" class="ramo-opinion-resumen" data-rc-calificar>Tu opinión del ramo · Editar</button>':''}`;
  linea.querySelector('[data-rc-calificar]')?.addEventListener('click',()=>abrirCalificarRamo(r));
  linea.querySelector('[data-rc-descartar]')?.addEventListener('click',()=>linea.querySelector('.ramo-opinion-invitacion')?.remove());
  hero.appendChild(linea);if(invitacion)marcarAvisoCalificarRamo(c);
 }catch(e){} // Sin SQL/red, la ficha y el cálculo siguen funcionando igual.
}
