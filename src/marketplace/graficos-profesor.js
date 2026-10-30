
// ─── GRÁFICOS DEL PANEL ─────────────────────────────────────────────────────
//
// Barras para comparar categorías; el valor se lee junto a su etiqueta.
// El acento informa, el semáforo queda reservado para riesgo académico.
const CANALES_VIZ=[['recomendacion','Recomendado en Inicio','viz-c1'],['busqueda','Buscaron el ramo','viz-c2'],['lista','Vieron el catálogo','viz-c3']];
const milesViz=n=>new Intl.NumberFormat('es-CL').format(n);
const pctViz=(n,t)=>t?new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:0}).format(n/t):'—';

// Solo se usa en Profesor/Admin. Un dato ausente no recibe una barra de cero.
function barrasDetalleClaseHTML({titulo,filas,unidad='',detalle=''}){
  const max=Math.max(1,...filas.map(f=>Number(f.valor)||0));
  return `<figure class="viz detalle-barras"><figcaption>${esc(titulo)}</figcaption>
    ${detalle?`<p class="detalle-barras-nota">${esc(detalle)}</p>`:''}
    ${filas.map(f=>`<div class="clase-embudo-fila"><span>${esc(f.nombre)}</span><b>${f.valor==null?'—':esc(f.texto??milesViz(f.valor))}${unidad?`<small>${esc(unidad)}</small>`:''}</b>
      ${f.valor==null?'':`<div class="clase-barra" aria-hidden="true"><i style="transform:scaleX(${(f.valor/max).toFixed(4)})"></i></div>`}</div>`).join('')}
  </figure>`;
}

function donaCanalesClase(porCanal,etiqueta='personas'){
  if(!porCanal)return '';
  // El servidor atribuye cada cuenta a un canal. Conservamos su total y
  // comparamos las categorías sobre una misma escala, con etiquetas directas.
  const total=porCanal.recomendacion+porCanal.busqueda+porCanal.lista;
  return barrasDetalleClaseHTML({titulo:'Cómo llegaron',unidad:etiqueta,detalle:`${milesViz(total)} ${etiqueta} en total`,
    filas:CANALES_VIZ.map(([k,nombre])=>({nombre,valor:porCanal[k]}))});
}

// Varias campañas en una sola cuenta, para el resumen de arriba.
function sumarCostosCampana(costos){
  const c=costos.filter(Boolean);
  if(!c.length)return null;
  const partes=c[0].partes.map(p=>({...p,cantidad:0,subtotal:0}));
  c.forEach(x=>x.partes.forEach((p,i)=>{partes[i].cantidad+=p.cantidad;partes[i].subtotal+=p.subtotal;}));
  return {partes,bruto:c.reduce((n,x)=>n+x.bruto,0),total:c.reduce((n,x)=>n+x.total,0),
    tope:c.every(x=>x.tope!==null)?c.reduce((n,x)=>n+x.tope,0):null,agotada:false};
}
// Importes por concepto, con escala común y sin segmentos mínimos inventados.
const PARTES_COSTO_VIZ={contacto:['Contactos','viz-c1'],apertura:['Aperturas','viz-c2'],vista:['Vistas','viz-c3'],dia:['Días publicada','viz-fijo']};
function costoApiladoClase(costo,pesos){
  if(!costo)return '';
  const partes=['contacto','apertura','vista','dia'].map(k=>{const p=costo.partes.find(x=>x.clave===k);return {nombre:PARTES_COSTO_VIZ[k][0],valor:p?p.subtotal:0};}).filter(p=>p.valor>0);
  const total=partes.reduce((n,p)=>n+p.valor,0);
  if(!total)return '';
  return barrasDetalleClaseHTML({titulo:'Costo por concepto',
    detalle:total>costo.total?`${pesos(total)} antes del tope · costo limitado a ${pesos(costo.total)}`:'',
    filas:partes.map(p=>({...p,texto:pesos(p.valor)}))});
}

// Tiempo en una línea de inicio a fin; los días restantes tienen su unidad.
function anilloCampanaClase(a,ahora){
  const avance=avanceCampanaAnuncio(a,ahora),dias=diasRestantesAnuncio(a,ahora);
  if(avance===null||dias===null)return '';
  const fecha=f=>new Date(f).toLocaleDateString('es-CL',{day:'numeric',month:'short'});
  return `<figure class="viz campana-tiempo"><figcaption>Plazo de campaña</figcaption>
    <p><b>${dias}</b><span>${dias===1?'día restante':'días restantes'}</span></p>
    <div class="campana-tiempo-riel" role="img" aria-label="${esc(pctViz(avance,1)+' del plazo transcurrido; quedan '+dias+' días')}"><i style="transform:scaleX(${avance.toFixed(4)})"></i></div>
    <div class="campana-tiempo-fechas"><span>Inicio · ${esc(fecha(a.publicado_at))}</span><span>Fin · ${esc(fecha(a.vence_at))}</span></div>
  </figure>`;
}

// Veces que se mostró por día desde que se publicó. Un día sin barra no es un
// cero: es un día con menos de quince eventos, y se dice así.
function barrasDiasClase(a,agregados,ahora,desdePrimerEvento=false){
  if(!agregados)return '';
  const desde=Date.parse(a.publicado_at||''),hasta=Math.min(ahora,Date.parse(a.vence_at||'')||ahora);
  if(!Number.isFinite(desde))return '';
  const dias=[];
  for(let t=desde;t<=hasta&&dias.length<31;t+=864e5)dias.push(new Date(t).toISOString().slice(0,10));
  if(!dias.length)return '';
  const serie=dias.map(d=>({d,n:(agregados.dias[d]||{}).impresion||0,c:(agregados.dias[d]||{}).contacto||0}));
  const conDatos=serie.filter(x=>x.n),max=topeEjeAdmin(Math.max(0,...serie.map(x=>x.n)));
  const mejor=conDatos.slice().sort((p,q)=>q.n-p.n)[0];
  const fecha=d=>new Date(d+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
  return `<figure class="viz clase-serie"><figcaption>Veces que se mostró por día</figcaption>
    ${mejor?`<p class="clase-serie-pico"><b>${milesViz(mejor.n)}</b><span>máximo diario · ${esc(fecha(mejor.d))}</span></p>`:''}
    ${max?`<div class="clase-serie-area" role="img" aria-label="Veces que se mostró por día. Escala de 0 a ${max}. ${desdePrimerEvento?'Un día sin eventos vale cero':'Los días sin dato publicable se marcan con una raya'}; valores en Ver días.">
      <div class="clase-serie-eje" aria-hidden="true">${[max,max/2,0].map(n=>`<span>${milesViz(n)}</span>`).join('')}</div>
      <div class="clase-serie-columnas" aria-hidden="true">${serie.map(x=>`<span>${x.n?`<i style="transform:scaleY(${(x.n/max).toFixed(4)})"></i>`:(desdePrimerEvento?'':'<b class="clase-dia-sin">—</b>')}</span>`).join('')}</div></div>
      <div class="campana-tiempo-fechas" aria-hidden="true"><span>${esc(fecha(dias[0]))}</span><span>${esc(fecha(dias[dias.length-1]))}</span></div>`:'<p class="clase-sin-datos">Aún no hay días con datos publicables.</p>'}
    ${!desdePrimerEvento&&serie.some(x=>!x.n)?'<p class="detalle-barras-nota">— Menos de 15 eventos</p>':''}
    <details class="clase-serie-tabla"><summary>Ver días</summary><div><table><thead><tr><th scope="col">Día</th><th scope="col">Veces que se mostró</th><th scope="col">Contactos</th></tr></thead>
      <tbody>${serie.map(x=>`<tr><th scope="row">${esc(fecha(x.d))}</th><td>${desdePrimerEvento||x.n?milesViz(x.n):'Menos de 15 eventos'}</td><td>${desdePrimerEvento||x.c?milesViz(x.c):'Menos de 15 eventos'}</td></tr>`).join('')}</tbody></table></div></details>
  </figure>`;
}

// Qué ramo del anuncio mueve más, si el anuncio tiene más de uno.
function barrasRamosClase(a,agregados){
  const siglas=Array.isArray(a.ramos_siglas)?a.ramos_siglas:[];
  if(!agregados||siglas.length<2)return '';
  const filas=siglas.map(sg=>({nombre:sg,valor:(agregados.ramos[sg]||{}).impresion||0}));
  if(!filas.some(f=>f.valor))return '';
  return barrasDetalleClaseHTML({titulo:'Veces que se mostró por ramo',
    detalle:filas.some(f=>!f.valor)?'— Menos de 15 eventos':'',
    filas:filas.sort((p,q)=>q.valor-p.valor).map(f=>({...f,valor:f.valor||null}))});
}

function graficosClase(d,pesos,ahora){
  const arriba=donaCanalesClase(d.porCanal)+anilloCampanaClase(d.a,ahora);
  return (arriba?`<div class="viz-fila">${arriba}</div>`:'')+
    barrasDiasClase(d.a,d.agregados,ahora,Array.isArray(d.historial))+
    costoApiladoClase(d.costo,pesos)+
    barrasRamosClase(d.a,d.agregados)+
    embudoClase(d.totales);
}

function prepararMetricasClase(a,m){
  const totales=m.agregados?m.agregados.total:totalesDeCortes(m.cortes);
  return {a,alcance:m.alcance,porCanal:m.porCanal,totales,agregados:m.agregados,campana:m.campana,historial:m.historial,
    error:m.error||a.campanaError,hayCortes:Object.values(totales).some(n=>n>0),costo:costoCampanaClase(m.campana)};
}
function detalleMetricasClaseHTML(d,pesos,ahora){
  return (d.costo&&d.costo.agotada?'<p class="clase-aviso-tope">Llegó a tu tope: dejó de mostrarse y no suma más costo.</p>':'')+
    cifrasClase(d,pesos,'personas distintas',true)+'<details class="profesor-hig-estadisticas"><summary>Más estadísticas</summary>'+graficosClase(d,pesos,ahora)+
    (d.hayCortes?'':Array.isArray(d.historial)?'<p class="clase-sin-datos">El desglose por ramo aparece cuando hay suficientes datos para que nadie quede identificado.</p>':'<p class="clase-sin-datos">Las veces que se mostró por día aparecen cuando hay suficientes datos para que nadie quede identificado.</p>')+
    (d.costo?`<p class="clase-sin-datos">${esc(lineaCostoCampanaClase(d.costo))}.</p>`:'')+'</details>';
}

function tarjetaPanelClase(a,pesos,ahora){
  const vig=vigenciaAnuncio(a,ahora);
  const [etiqueta,detalle]=ESTADOS_ANUNCIO[vig]||[vig,''];
  const dias=vig==='publicado'?diasRestantesAnuncio(a,ahora):null,avance=vig==='publicado'?avanceCampanaAnuncio(a,ahora):null;
  const empieza=vig==='programado'?new Date(a.publicado_at).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}):'';
  const accion={
    publicado:`<button type="button" class="clase-accion" data-pausar="${esc(a.id)}">Pausar</button>`,
    programado:`<button type="button" class="clase-accion" data-pausar="${esc(a.id)}">Pausar</button>`,
    borrador:`<button type="button" class="clase-accion" data-editar="${esc(a.id)}">Seguir editando</button>`,
    pausado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
    expirado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
    agotado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
  }[vig]||'';
  return `<article class="clase-card" data-anuncio="${esc(a.id)}">
    <div class="clase-card-top">
      <strong>${esc(a.titulo||'Sin título')}</strong>
      <span class="clase-estado clase-estado-${esc(vig)}">${esc(etiqueta)}</span>
    </div>
    <p class="clase-card-meta">${esc((a.ramos_siglas||[]).join(' · '))}${esClaseGratis(a)?' · Gratis':a.precio_clp?' · '+(preciosClase(a).pack?precioClase(a):pesos(preciosClase(a).porClaseFinal)+' por clase'):''}</p>
    ${a.estado==='borrador'&&a.comentario_revision?`<div class="clase-comentario-revision"><strong>Cambios pedidos en la revisión</strong><p>${esc(a.comentario_revision)}</p></div>`:''}
    ${dias!==null?`<div class="clase-vigencia"><span>${dias===0?'Termina hoy':dias===1?'Queda 1 día':`Quedan ${dias} días`}</span>${avance!==null?`<div class="clase-riel"><i style="transform:scaleX(${avance.toFixed(3)})"></i></div>`:''}</div>`
      :`<p class="clase-card-detalle">${esc(empieza?`Empieza el ${empieza}.`:detalle)}</p>`}
    <div class="clase-numeros" data-metricas="${esc(a.id)}"></div>
    ${accion}
  </article>`;
}

// Presentación pura de la propuesta #522. Las acciones y los números siguen
// conectados al flujo de producción; no se importan adaptadores de bin/.
function cabeceraProfesorHTML(titulo,bajada,accion='',idTitulo='profesor-titulo',ceja='TU ESPACIO DE PROFESOR'){
  return `<header class="profesor-hig-cabecera"><div><p class="profesor-hig-ceja">${esc(ceja)}</p><h1 class="modal-title" id="${esc(idTitulo)}">${esc(titulo)}</h1><p>${esc(bajada)}</p></div>${accion}</header>`;
}
function filaProfesorClaseHTML(a,pesos,ahora){
  const vig=vigenciaAnuncio(a,ahora),etiqueta=(ESTADOS_ANUNCIO[vig]||[vig])[0];
  return `<details class="profesor-hig-fila" data-profesor-anuncio="${esc(a.id)}"><summary>
    <span class="profesor-hig-identidad"><b>${esc(a.titulo||'Sin título')}</b><small>${esc((a.ramos_siglas||[]).join(' · '))}</small></span>
    <span class="clase-estado clase-estado-${esc(vig)}" data-estado-campana="${esc(a.id)}">${esc(etiqueta)}</span>
    <span class="profesor-hig-importe"><b data-costo-campana="${esc(a.id)}">${['publicado','pausado','expirado','agotado','sin_confirmar'].includes(vig)?'Cargando…':'—'}</b><small>Costo de campaña</small></span>
    <span class="profesor-hig-flecha" aria-hidden="true">⌄</span>
    </summary><div class="profesor-hig-detalle">${tarjetaPanelClase(a,pesos,ahora)}</div></details>`;
}
// Usa el mismo anillo que Estadísticas. Sin proporción válida queda solo
// la cifra: no dibujamos un 0% cuando falta el denominador.
function datoCircularHTML(porcentaje,valor,etiqueta){
  if(porcentaje===null||porcentaje===undefined||!Number.isFinite(Number(porcentaje))||porcentaje<0||porcentaje>100||typeof htmlAnillo!=='function')return `<strong>${esc(valor)}</strong>`;
  return htmlAnillo({fraccion:porcentaje/100,color:'var(--dato-acento)',chico:true,etiqueta,
    centro:`<span class="anillo-valor">${esc(valor)}</span>`});
}
function presupuestoProfesorHTML(costo){
  if(!costo)return '<p class="clase-sin-datos">No pudimos cargar el costo de la campaña. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>';
  const porcentaje=costo.tope?Math.min(100,Math.round(costo.total/costo.tope*100)):0;
  return `<section class="profesor-hig-presupuesto presupuesto-visual"><div class="dato-circular">${datoCircularHTML(costo.tope?porcentaje:null,costo.tope?porcentaje+'%':'—',`Presupuesto utilizado: ${porcentaje}%`)}</div><div><span>Presupuesto utilizado</span><strong>${pesosClase(costo.total)}</strong><p>${costo.tope!==null?`de tu tope de ${pesosClase(costo.tope)}`:'Sin tope disponible'}</p><small>Publicación actual</small></div></section>`;
}

function seccionPanelClases(titulo,lista,pesos,ahora,vacio){
  if(!lista.length&&!vacio)return '';
  return `<section class="clases-seccion"><h3>${titulo}${lista.length?` <span>${lista.length}</span>`:''}</h3>
    ${lista.length?`<div class="clase-lista">${lista.map(a=>filaProfesorClaseHTML(a,pesos,ahora)).join('')}</div>`:`<p class="clase-sin-datos">${vacio}</p>`}</section>`;
}

// La vista de Clases que estaba abierta: repintar tras pausar o retomar un
// anuncio no devuelve al Resumen.
let vistaClasesActual=null;
// Al guardar un borrador se vuelve a la lista de anuncios (Lucas, 2026-10-23),
// también si el panel estaba abierto como hoja.
let vistaClasesAlVolver=null;
