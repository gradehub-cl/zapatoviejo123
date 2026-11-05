// ─── ESTADÍSTICAS DE ALUMNOS (Lucas, 2026-11-04) ─────────────────────────────
// Responde dos cosas de un vistazo: si las clases están funcionando y a quién
// hay que ayudar. Los alumnos no toman clases de forma continua, así que con
// marcas se compara por evaluación: con clases frente a sin clases. Sin ninguna
// marca en la cuenta sigue la fecha de inicio de cada ramo, y lo dice. Los dos
// métodos nunca se mezclan en una misma cifra (#976): con marcas, lo que no
// tiene marcas queda en «Por completar». El color solo dice dirección.
const EST_UMBRAL={puntos:.3,percentil:6},EST_LEJOS={puntos:-1,percentil:25},EST_FILAS=30;
const EST_BARRAS=18,EST_INICIO=-1.5,EST_PASO=.2,EST_MUESTRA_CHICA=5;
function estadoEstadisticasPanel(){return {ramos:new Set(),tab:'todos',texto:'',unidad:'puntos',vistos:EST_FILAS,filtros:false,datos:null};}
function signoEstPanel(v,unidad){
  const n=unidad==='percentil'?Math.round(v):+v.toFixed(1);
  return (n>0?'+':n<0?'−':'')+(unidad==='percentil'?String(Math.abs(n)):Math.abs(n).toFixed(1).replace('.',','));
}
const comaEstPanel=v=>v.toFixed(1).replace('.',',');
const ladosEstPanel=metodo=>metodo==='manual'?['Sin clases','Con clases']:['Antes','Ahora'];
function datosEstadisticasPanel(alumnos,compDe){
  const g=metricasGrupoPanel(alumnos,compDe);
  const extra=new Map((alumnos||[]).flatMap(al=>(al.ramos||[]).map(r=>{
    const comp=conUniversidadPanel(al.tenant,()=>compDe(al,r));
    return [`${al.id}|${r.id}`,{personas:datosComparacionPanel(comp?.ramo)?.personas??null,sinSeccion:!!comp?.sinSeccion}];
  })));
  const pares=g.alumnos.map(m=>({...m,...extra.get(`${m.id}|${m.ramoId}`)}));
  return {pares,metodo:pares.some(m=>m.metodo==='manual')?'manual':'fecha',
    hayPercentil:pares.some(m=>resumenPercentilesPanel(m).cambio!==null)};
}
// Una fila: dónde queda cada lado, la diferencia y si pide acción. Se redondea
// antes de clasificar, para que un 0,3 en pantalla no quede bajo el umbral.
function parEstPanel(m,metodo,unidad){
  const per=unidad==='percentil'?resumenPercentilesPanel(m):null,decimales=per?0:1;
  const a=per?per.antes:m.antes.diferencia,b=per?per.ahora:m.ahora.diferencia,bruto=per?per.cambio:m.cambio;
  const cambio=m.metodo===metodo&&bruto!==null?+bruto.toFixed(decimales):null,umbral=EST_UMBRAL[unidad];
  const estado=cambio===null?'sin':cambio<=-umbral?'peor':cambio>=umbral?'mejor':'igual';
  const lejos=cambio!==null&&b<=EST_LEJOS[unidad];
  return {m,a,b,cambio,estado,lejos,revisar:estado==='peor'||lejos};
}
function motivoEstPanel(p,metodo,unidad){
  const {m}=p,[sin,con]=ladosEstPanel(metodo).map(t=>t.toLowerCase());
  if(m.sinSeccion)return 'Sin sección';
  if(m.metodo!==metodo)return 'Sin marcar';
  if(unidad==='percentil')return 'Sin percentil';
  const faltaCon=Math.max(0,MIN_EVALS_COMPARACION-m.ahora.nComparadas),faltaSin=Math.max(0,MIN_EVALS_COMPARACION-m.antes.nComparadas);
  return faltaCon?`Falta ${faltaCon} ${con}`:faltaSin?`Falta ${faltaSin} ${sin}`:'Faltan datos';
}
function resumenEstPanel(lista){
  const comp=lista.filter(p=>p.cambio!==null),evals=lado=>comp.flatMap(p=>p.m.evaluaciones.filter(e=>e.lado===lado));
  const cuenta=k=>comp.filter(p=>p.estado===k).length;
  return {lista,comp,mediana:medianaPanel(comp.map(p=>p.cambio)),peor:cuenta('peor'),igual:cuenta('igual'),mejor:cuenta('mejor'),
    sin:lista.length-comp.length,antes:resumenLadoPanel(evals('antes')),ahora:resumenLadoPanel(evals('ahora'))};
}
const filtradosEstPanel=(datos,estado)=>datos.pares.filter(m=>!estado.ramos.size||estado.ramos.has(claveRamoFiltroPanel(m)))
  .map(m=>parEstPanel(m,datos.metodo,estado.unidad));
function histogramaEstHTML(r,estado){
  const k=estado.unidad==='percentil'?20:1,barras=Array(EST_BARRAS).fill(0),zonas={peor:[0,5],igual:[6,8],mejor:[9,EST_BARRAS-1]};
  // Cada barra queda dentro de su zona, para que los conteos y el dibujo calcen.
  r.comp.forEach(p=>{const [lo,hi]=zonas[p.estado];barras[Math.min(hi,Math.max(lo,Math.floor((p.cambio/k-EST_INICIO)/EST_PASO+1e-9)))]++;});
  const max=Math.max(1,...barras),zona=i=>i<6?'peor':i<9?'igual':'mejor',elegida=['peor','igual','mejor'].includes(estado.tab)?estado.tab:null;
  const x=v=>(v/k-EST_INICIO)/(EST_PASO*EST_BARRAS)*100,u=estado.unidad;
  const rango=i=>{const a=(EST_INICIO+i*EST_PASO)*k;return `${signoEstPanel(a,u)} a ${signoEstPanel(a+EST_PASO*k,u)}`;};
  const boton=(id,texto,n,c0,c1)=>`<button type="button" class="est-zona est-zona-${id}" data-est-tab="${id}" aria-pressed="${estado.tab===id}" style="grid-column:${c0}/${c1}"><b>${n}</b>${texto}</button>`;
  const marcas=[-1,0,1,2].map(v=>`<span style="left:${x(v*k).toFixed(2)}%">${u==='percentil'?signoEstPanel(v*20,u):signoEstPanel(v,u).replace(',0','')}</span>`).join('');
  return `<div class="est-hist${elegida?' est-hist-elegida':''}">
    <div class="est-zonas">${boton('peor','Peor',r.peor,1,7)}${boton('igual','Igual',r.igual,7,10)}${boton('mejor','Mejor',r.mejor,10,19)}</div>
    <div class="est-barras">${barras.map((n,i)=>`<button type="button" class="est-barra est-barra-${zona(i)}${zona(i)===elegida?' est-barra-on':''}" data-est-tab="${zona(i)}" aria-label="${n} con diferencia de ${rango(i)}" title="${n}: ${rango(i)}"><i style="height:${n?Math.max(3,n/max*100):0}%"></i></button>`).join('')}
      ${r.mediana===null?'':`<span class="est-mediana" style="left:${Math.min(100,Math.max(0,x(r.mediana))).toFixed(2)}%"></span>`}</div>
    <div class="est-eje" aria-hidden="true">${marcas}</div></div>`;
}
function tarjetasEstHTML(r,metodo){
  const [sin,con]=ladosEstPanel(metodo);
  const barra=(nombre,v,texto,ahora)=>`<div class="est-par"><span>${nombre}</span><span class="est-pista${ahora?' est-pista-ahora':''}" aria-hidden="true"><i style="width:${v===null?0:Math.round(v*100)}%"></i></span><b>${texto}</b></div>`;
  const nota=v=>v===null?null:(v-1)/6,prom=v=>v===null?'—':comaEstPanel(v);
  return `<div class="est-tarjetas">
    <div class="est-tarjeta"><h3>Evaluaciones aprobadas</h3>${barra(sin,r.antes.aprobacion,porcentajePanel(r.antes.aprobacion))}${barra(con,r.ahora.aprobacion,porcentajePanel(r.ahora.aprobacion),true)}</div>
    <div class="est-tarjeta"><h3>Promedio de notas</h3>${barra(sin,nota(r.antes.promedio),prom(r.antes.promedio))}${barra(con,nota(r.ahora.promedio),prom(r.ahora.promedio),true)}</div>
    <button type="button" class="est-tarjeta est-tarjeta-boton" data-est-tab="sin"><h3>Por completar</h3><span class="est-tarjeta-cifra">${r.sin}<small>de ${r.lista.length}</small></span><span class="est-tarjeta-accion">${metodo==='manual'?'Marcar evaluaciones o pedir notas':'Ver a quiénes les faltan notas'} ›</span></button>
  </div>`;
}
function ramosEstHTML(datos,estado){
  const grupos=new Map();
  datos.pares.forEach(m=>{const k=claveRamoFiltroPanel(m);if(!grupos.has(k))grupos.set(k,{clave:k,nombre:m.ramo,pares:[],personas:null});
    const g=grupos.get(k);g.pares.push(m);if(m.personas!==null&&m.personas!==undefined)g.personas=Math.max(g.personas||0,m.personas);});
  if(grupos.size<2)return '';
  const tope=estado.unidad==='percentil'?16:.8;
  const filas=[...grupos.values()].sort((a,b)=>b.pares.length-a.pares.length||a.nombre.localeCompare(b.nombre,'es')).map(g=>{
    const r=resumenEstPanel(g.pares.map(m=>parEstPanel(m,datos.metodo,estado.unidad))),v=r.mediana,chica=r.comp.length<EST_MUESTRA_CHICA,sube=v!==null&&v>=0;
    const alumnos=new Set(g.pares.map(m=>m.id)).size,ancho=v===null?0:Math.min(50,Math.abs(v)/tope*50);
    return `<button type="button" class="est-ramo" data-est-ramo="${esc(g.clave)}" aria-pressed="${estado.ramos.has(g.clave)}">
      <b>${esc(g.nombre)}</b><span class="est-ramo-valor ${chica?'est-gris':sube?'est-sube':'est-baja'}">${v===null?'—':esc(signoEstPanel(v,estado.unidad))}</span>
      <small>${g.personas?`${alumnos} de ${g.personas} en GradeHub`:`${alumnos} ${alumnos===1?'alumno':'alumnos'}`}</small>
      <span class="est-mini" aria-hidden="true"><i class="${chica?'est-fondo-gris':sube?'est-fondo-sube':'est-fondo-baja'}" style="${sube?'left':'right'}:50%;width:${ancho.toFixed(1)}%"></i></span></button>`;
  }).join('');
  return `<section class="est-tarjeta-grande est-ramos" aria-labelledby="est-ramos-titulo"><h2 id="est-ramos-titulo">Por ramo</h2><p class="est-pista-texto">Elige uno o más para ver solo sus datos</p><div class="est-ramos-lista">${filas}</div></section>`;
}
const posEstPanel=(v,unidad)=>{const x=unidad==='percentil'?(v-50)/50:v/2;return (50+Math.max(-1,Math.min(1,x))*48).toFixed(1);};
function filaEstHTML(p,metodo,unidad,seccion){
  const {m,a,b,cambio,estado}=p,hay=cambio!==null,clase=estado==='mejor'?'est-sube':estado==='peor'?'est-baja':'est-gris',[sin,con]=ladosEstPanel(metodo);
  const propio=m.metodo===metodo,pa=a!==null&&propio?posEstPanel(a,unidad):null,pb=b!==null&&propio?posEstPanel(b,unidad):null;
  const iniciales=String(m.nombre||'').trim().split(/\s+/).filter(t=>/^\p{L}/u.test(t)).slice(0,2).map(t=>t[0]).join('').toUpperCase();
  const motivo=hay?'':motivoEstPanel(p,metodo,unidad),frente=seccion?'frente a su sección':'frente al ramo';
  const detalle=hay?`${sin} ${signoEstPanel(a,unidad)}. ${con} ${signoEstPanel(b,unidad)}. Diferencia ${signoEstPanel(cambio,unidad)}${unidad==='puntos'?` puntos ${frente}`:' percentiles'}.`:motivo+'.';
  return `<button type="button" class="est-fila" data-ver-alumno="${esc(m.id)}" data-alumno-ramo="${esc(m.ramoId)}" title="${esc(detalle)}">
    <span class="est-quien"><span class="est-avatar" aria-hidden="true">${esc(iniciales)}</span><span class="est-nombre"><b>${esc(m.nombre)}</b><small>${esc(m.ramo)}</small></span></span>
    <span class="est-punto ${hay?clase:'est-gris'}" aria-hidden="true">${hay?`<i class="est-tramo" style="left:${Math.min(pa,pb)}%;width:${Math.abs(pa-pb).toFixed(1)}%"></i>`:''}${pa!==null?`<i class="est-a" style="left:${pa}%"></i>`:''}${pb!==null?`<i class="est-b" style="left:${pb}%"></i>`:''}</span>
    ${hay?`<span class="est-dif ${clase}">${esc(signoEstPanel(cambio,unidad))}${p.lejos?`<small>${unidad==='percentil'?'p'+Math.round(b):comaEstPanel(Math.abs(b))+' bajo'}</small>`:''}</span>`:`<span class="est-falta">${esc(motivo)}</span>`}
    <span class="sr-solo">${esc(detalle)}</span><span class="est-flecha" aria-hidden="true">›</span></button>`;
}
function filasEstadisticasHTML(datos,estado,{seccion=false}={}){
  const q=claveEvaluacionPanel(estado.texto),calza=s=>(claveEvaluacionPanel(s)||'').includes(q);
  const rango=p=>p.revisar?0:p.cambio!==null?1:2,mejorPrimero=estado.tab==='mejor';
  const lista=filtradosEstPanel(datos,estado).filter(p=>(estado.tab==='todos'||p.estado===estado.tab)&&(!q||calza(p.m.nombre)||calza(p.m.ramo)||calza(p.m.sigla)))
    .sort((a,b)=>rango(a)-rango(b)||(mejorPrimero?(b.cambio??0)-(a.cambio??0):(a.cambio??0)-(b.cambio??0))||String(a.m.nombre).localeCompare(String(b.m.nombre),'es'));
  if(!lista.length)return `<div class="est-nadie"><p>Nadie en este grupo.</p><button type="button" data-est-limpiar>Ver todos</button></div>`;
  const cuentas=[0,1,2].map(n=>lista.filter(p=>rango(p)===n).length),titulos=['Por revisar','El resto','Por completar'];
  let html='',ultimo=-1;
  lista.slice(0,estado.vistos).forEach(p=>{const r=rango(p);
    if(estado.tab==='todos'&&r!==ultimo){ultimo=r;html+=`<div class="est-grupo">${titulos[r]}<span>${cuentas[r]}</span></div>`;}
    html+=filaEstHTML(p,datos.metodo,estado.unidad,seccion);});
  const quedan=lista.length-estado.vistos;
  return html+(quedan>0?`<button type="button" class="est-mas" data-est-mas>Ver ${Math.min(EST_FILAS,quedan)} más de ${quedan}</button>`:'');
}
function estadisticasAlumnosHTML(datos,estado,{seccion=false,sinSeccion=0,soloPruebas=false}={}){
  if(!datos||!datos.pares.length)return '<p class="profesor-hig-vacio">Todavía no hay ramos compartidos para comparar.</p>';
  const lista=filtradosEstPanel(datos,estado),r=resumenEstPanel(lista),{metodo}=datos,u=estado.unidad,[sin,con]=ladosEstPanel(metodo);
  const n=r.comp.length,chica=n<EST_MUESTRA_CHICA,umbral=EST_UMBRAL[u],frente=seccion?'frente a su sección':'frente al ramo';
  const tono=r.mediana===null||chica?'est-cifra-chica':r.mediana>=umbral?'est-sube':r.mediana<=-umbral?'est-baja':'';
  const titulo=metodo==='manual'?`Con clases, ${frente}`:`Cambio ${frente}`,verbo=metodo==='manual'?'rinden mejor con clases':'mejoraron';
  const ramosHTML=ramosEstHTML(datos,estado),seg=(campo,valor,texto,activo)=>`<button type="button" data-est-${campo}="${valor}" aria-pressed="${activo}">${texto}</button>`;
  const etiquetas=[...estado.ramos].map(k=>{const m=datos.pares.find(x=>claveRamoFiltroPanel(x)===k);return m?`<button type="button" class="est-etiqueta" data-est-ramo="${esc(k)}" aria-label="Quitar ${esc(m.ramo)}">${esc(m.ramo)}<span aria-hidden="true">✕</span></button>`:'';}).join('');
  const tabs=[['todos','Todos',lista.length],['mejor','Mejor',r.mejor],['igual','Igual',r.igual],['peor','Peor',r.peor],['sin','Por completar',r.sin]];
  const escala=u==='percentil'?['p0','p50','p100']:['2 bajo',seccion?'Su sección':'El ramo','2 sobre'],activos=(seccion?1:0)+(soloPruebas?1:0);
  return `<div class="est">
    <div class="est-barra-herramientas">
      ${datos.hayPercentil?`<div class="est-seg" role="group" aria-label="Medir en">${seg('unidad','puntos','Puntos',u==='puntos')}${seg('unidad','percentil','Percentil',u==='percentil')}</div>`:''}
      <div class="est-filtros-caja"><button type="button" class="est-control" data-est-filtros aria-expanded="${estado.filtros}">Filtros${activos?`<span class="est-cuenta">${activos}</span>`:''}</button>
        ${estado.filtros?`<div class="est-pop"><h3>Comparar con</h3><div class="est-seg" role="group" aria-label="Comparar con">${seg('comparar','gradehub','Todo el ramo',!seccion)}${seg('comparar','seccion','Su sección',seccion)}</div>
          <h3>Evaluaciones</h3><div class="est-seg" role="group" aria-label="Evaluaciones">${seg('solo','0','Todas',!soloPruebas)}${seg('solo','1','Solo pruebas',soloPruebas)}</div></div>`:''}</div>
    </div>
    ${metodo==='fecha'?'<p class="est-aviso">Aún sin marcas: se compara por fecha de inicio. Marca las evaluaciones en la ficha de cada alumno.</p>':''}
    ${seccion&&sinSeccion?`<p class="est-aviso">${sinSeccion} ${sinSeccion===1?'alumno no declaró':'alumnos no declararon'} sección.</p>`:''}
    ${etiquetas?`<div class="est-etiquetas">${etiquetas}</div>`:''}
    <div class="est-arriba${ramosHTML?'':' est-arriba-sola'}">
      <section class="est-tarjeta-grande" aria-label="Resumen">
        <div class="est-heroe">
          <div class="est-respuesta"><h2>${titulo}</h2>
            <p class="est-cifra ${tono}">${r.mediana===null?'—':esc(signoEstPanel(r.mediana,u))}<small>${r.mediana===null?'':u==='percentil'?'percentiles':'puntos'}</small></p>
            <p class="est-sub">${chica?`Solo ${n} con datos suficientes`:`<b>${r.mejor} de ${n}</b> ${verbo}`}</p></div>
          ${histogramaEstHTML(r,estado)}
        </div>
        ${tarjetasEstHTML(r,metodo)}
      </section>
      ${ramosHTML}
    </div>
    <section class="est-tarjeta-grande est-lista" aria-label="Alumnos por ramo">
      <div class="est-lista-cabeza"><div class="est-tabs">${tabs.map(([id,t,c])=>`<button type="button" data-est-tab="${id}" aria-pressed="${estado.tab===id}">${t}<span>${c}</span></button>`).join('')}</div>
        <input type="search" class="est-buscar" data-est-buscar placeholder="Buscar alumno" aria-label="Buscar alumno o ramo" value="${esc(estado.texto)}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div>
      <div class="est-columnas" aria-hidden="true"><span class="est-leyenda"><span>○ ${sin}</span><span>● ${con}</span><span class="est-leyenda-ref">│ ${escala[1]}</span></span><span class="est-escala"><span>${escala[0]}</span><span>${escala[1]}</span><span>${escala[2]}</span></span><span class="est-columna-dif">${metodo==='manual'?'Diferencia':'Cambio'}</span><span></span></div>
      <div id="est-filas">${filasEstadisticasHTML(datos,estado,{seccion})}</div>
    </section>
    <footer class="est-pie"><span>${metodo==='manual'?'La diferencia':'El cambio'} no demuestra que se deba a las clases.</span>
      <details><summary>Cómo se calcula</summary><p>Cada alumno cuenta una vez por ramo. ${metodo==='manual'?'Comparamos las evaluaciones marcadas como preparadas contigo con las que no.':'Comparamos antes y después de su inicio de clases en ese ramo.'} Hacen falta ${MIN_EVALS_COMPARACION} evaluaciones comparables a cada lado, y cada nota se mide frente a su evaluación para que una prueba difícil no castigue. Bajo ${String(EST_UMBRAL.puntos).replace('.',',')} puntos de diferencia se considera igual. Muchos toman clases justo cuando van peor, así que el resultado puede quedarse corto. La referencia sale de al menos 5 estudiantes de GradeHub y nunca ves quiénes son.</p></details></footer>
  </div>`;
}
// Vuelve a pintar sin perder el foco de quien usa teclado o VoiceOver.
function pintarEstadisticasPanel(raiz,estado,opciones){
  const activo=typeof document!=='undefined'?document.activeElement:null,dentro=activo&&typeof raiz.contains==='function'&&raiz.contains(activo);
  const atributo=dentro&&typeof activo.getAttributeNames==='function'?activo.getAttributeNames().find(a=>a.startsWith('data-est-')):null;
  const selector=atributo?`[${atributo}="${(activo.getAttribute(atributo)||'').replace(/["\\]/g,'\\$&')}"]`:null;
  raiz.innerHTML=estadisticasAlumnosHTML(estado.datos,estado,opciones);
  if(selector&&typeof raiz.querySelector==='function')raiz.querySelector(selector)?.focus();
}
// Devuelve qué hacer: 'pintar', una acción para la pantalla o null si no era suyo.
function tocarEstadisticasPanel(e,estado){
  const cerca=sel=>e.target.closest(sel),cerrar=estado.filtros&&!cerca('.est-filtros-caja');
  if(cerrar)estado.filtros=false;
  const filtros=cerca('[data-est-filtros]');if(filtros){estado.filtros=!estado.filtros;return 'pintar';}
  const unidad=cerca('[data-est-unidad]');if(unidad){estado.unidad=unidad.dataset.estUnidad;return 'pintar';}
  const comparar=cerca('[data-est-comparar]');if(comparar)return 'comparar:'+comparar.dataset.estComparar;
  const solo=cerca('[data-est-solo]');if(solo)return 'solo:'+solo.dataset.estSolo;
  const ramo=cerca('[data-est-ramo]');
  if(ramo){const k=ramo.dataset.estRamo;estado.ramos.has(k)?estado.ramos.delete(k):estado.ramos.add(k);estado.vistos=EST_FILAS;return 'pintar';}
  const tab=cerca('[data-est-tab]');
  if(tab){const t=tab.dataset.estTab,zona=['peor','igual','mejor'].includes(t)&&!tab.closest('.est-tabs');estado.tab=zona&&estado.tab===t?'todos':t;estado.vistos=EST_FILAS;return 'pintar';}
  if(cerca('[data-est-mas]')){estado.vistos+=EST_FILAS;return 'pintar';}
  if(cerca('[data-est-limpiar]')){estado.tab='todos';estado.texto='';estado.vistos=EST_FILAS;return 'pintar';}
  return cerrar?'pintar':null;
}
