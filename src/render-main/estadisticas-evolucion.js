// Solo lectura y estado de vista. Nunca se guardan series ni rangos en S.
let rangoEvolucionStats='semestre';
let cacheEvolucionStats=null;
let limiteLineaTiempoStats=5;

function fechaNotaEvolucion(n,c){
  const fecha=n.fecha||c.fecha;
  if(typeof fecha==='string'&&FECHA_RE.test(fecha)){
    const tiempo=Date.parse(fecha+'T00:00:00');
    if(Number.isFinite(tiempo)&&new Date(tiempo).getDate()===Number(fecha.slice(-2)))return {tiempo,fecha,origen:'evaluacion'};
  }
  const editada=fechaEdicionNotaValida(n.editadaEn);
  if(editada)return {tiempo:Date.parse(editada),fecha:editada,origen:'edicion'};
  return {tiempo:null,fecha:null,origen:null};
}
function textoFechaEvolucion(p){
  if(!p.fecha)return 'Sin fecha';
  if(p.origen==='evaluacion')return fechaCorta(p.fecha);
  return new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short'}).format(new Date(p.tiempo));
}
// Cada paso consulta gpa sobre una copia con solo las notas conocidas hasta ahí.
// Así se conservan créditos, compuertas, descartes y vínculos entre ramos.
function seriePromedioNotas(ramos){
  const copia=(ramos||[]).map(r=>({...r,categorias:(r.categorias||[]).map(c=>({...c,notas:(c.notas||[]).map(n=>({...n,valor:null}))}))}));
  const eventos=[];
  (ramos||[]).forEach((r,ri)=>(r.categorias||[]).forEach((c,ci)=>(c.notas||[]).forEach((n,ni)=>{
    if(!Number.isFinite(n.valor))return;
    eventos.push({...fechaNotaEvolucion(n,c),ri,ci,ni,nombre:nombreNotaCasilla(r,c,n),ramo:r.nombre,nota:n.valor,orden:eventos.length});
  })));
  eventos.sort((a,b)=>a.tiempo===null&&b.tiempo===null?a.orden-b.orden:a.tiempo===null?-1:b.tiempo===null?1:a.tiempo-b.tiempo||a.orden-b.orden);
  let previo=null;
  return eventos.map(e=>{
    copia[e.ri].categorias[e.ci].notas[e.ni].valor=e.nota;
    const valor=gpa(copia);
    const punto={...e,valor,delta:valor!==null&&previo!==null?valor-previo:null};
    if(valor!==null)previo=valor;
    return punto;
  });
}
function modeloEvolucionStats(){
  const clave=JSON.stringify([S.tenant,S.ramos]);
  if(!cacheEvolucionStats||cacheEvolucionStats.clave!==clave)cacheEvolucionStats={clave,puntos:seriePromedioNotas(S.ramos)};
  return cacheEvolucionStats.puntos;
}
function puntosRangoEvolucion(rango,notas,historial,ramos,actual,ahora=new Date()){
  if(rango!=='mes'&&rango!=='semana')return notas;
  const inicio=rango==='mes'?new Date(ahora.getFullYear(),ahora.getMonth(),1):new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()-(ahora.getDay()+6)%7);
  const fin=rango==='mes'?new Date(ahora.getFullYear(),ahora.getMonth()+1,1):new Date(inicio.getFullYear(),inicio.getMonth(),inicio.getDate()+7);
  return notas.filter(p=>p.tiempo!==null&&p.tiempo>=inicio.getTime()&&p.tiempo<fin.getTime());
}
function textoDeltaEvolucion(delta){
  if(delta===null)return 'Primer promedio';
  if(Math.abs(delta)<0.005)return 'Sin cambio';
  return (delta>0?'+':'−')+nf(Math.abs(delta),2).replace('.',',');
}
function hitosEvolucionHTML(puntos,limite){
  const recientes=[...puntos].reverse();
  return `<ol class="stats-evolucion-hitos" role="list" aria-label="Notas de más reciente a más antigua">${recientes.slice(0,limite).map(p=>{
    const sube=p.delta!==null&&p.delta>=0.005,baja=p.delta!==null&&p.delta<=-0.005;
    return `<li><div class="stats-hito-evaluacion"><strong>${esc(p.nombre)}</strong><span>${esc(p.ramo)}</span><span>${p.fecha?`<time datetime="${esc(p.fecha)}">${esc(textoFechaEvolucion(p))}</time>`:'Sin fecha'}</span></div>
      <div class="stats-hito-nota"><span>Nota</span><strong>${nf(p.nota,2).replace('.',',')}</strong></div>
      <p class="stats-hito-promedio">Promedio ${p.valor===null?'—':nf(p.valor,2).replace('.',',')} <span class="${sube?'es-sube':baja?'es-baja':'es-igual'}">${sube?'↑ ':baja?'↓ ':''}${esc(textoDeltaEvolucion(p.delta))}${p.delta===null||Math.abs(p.delta)<0.005?'':' puntos'}</span></p></li>`;
  }).join('')}</ol>${recientes.length>limite?`<button type="button" class="stats-linea-mas" onclick="verMasLineaTiempoStats()">Ver más</button>`:''}`;
}
function lineaTiempoEvolucionHTML(puntos){
  return `<details class="stats-evolucion-linea"><summary>Ver línea de tiempo</summary><div id="stats-evolucion-hitos">${hitosEvolucionHTML(puntos,limiteLineaTiempoStats)}</div></details>`;
}
function verMasLineaTiempoStats(){
  const zona=document.getElementById('stats-evolucion-hitos');if(!zona)return;
  const scroll=zona.closest?.('.scroll'),posicion=scroll?.scrollTop;
  limiteLineaTiempoStats+=5;
  const puntos=puntosRangoEvolucion(rangoEvolucionStats,modeloEvolucionStats());
  zona.innerHTML=hitosEvolucionHTML(puntos,limiteLineaTiempoStats);
  const foco=zona.querySelector('.stats-linea-mas')||zona.querySelector('li:last-child');
  if(foco){if(foco.tagName==='LI')foco.tabIndex=-1;foco.focus({preventScroll:true});}
  if(scroll&&Number.isFinite(posicion))scroll.scrollTop=posicion;
}
function contornoAvanceStatsHTML(pct){
  const valor=Math.max(0,Math.min(100,Number(pct)||0));
  return `<div class="stats-evolucion-avance"><svg class="stats-avance-contorno" aria-hidden="true"><rect class="stats-avance-pista" pathLength="100"/><rect class="stats-avance-relleno" pathLength="100" stroke-dasharray="${valor} 100"/></svg><span class="stats-evolucion-etiqueta">Peso evaluado</span><strong class="stats-avance-cifra">${valor}%</strong><p>Del peso evaluable de tus ramos.</p></div>`;
}
function contenidoEvolucionStatsHTML(){
  if(!['semana','mes','semestre'].includes(rangoEvolucionStats))rangoEvolucionStats='semestre';
  const todos=modeloEvolucionStats();
  const puntos=puntosRangoEvolucion(rangoEvolucionStats,todos,S.historial,S.ramos,semester());
  const validos=puntos.filter(p=>Number.isFinite(p.valor));
  const serie=validos.map(p=>({valor:p.valor,actual:p===validos[validos.length-1],x:validos.length===1?50:undefined,
    etiqueta:p.nombre+' · '+p.ramo,
    valorTexto:'Promedio '+nf(p.valor,2).replace('.',','),
    detalle:textoFechaEvolucion(p)+' · Nota '+nf(p.nota,2).replace('.',',')+' · '+textoDeltaEvolucion(p.delta)+(p.delta===null?'':' puntos'),
    lectura:`${p.nombre} de ${p.ramo}, ${textoFechaEvolucion(p)}, nota ${nf(p.nota,2)}. Promedio ${nf(p.valor,2)}. ${textoDeltaEvolucion(p.delta)}.`}));
  const piso=Math.min(4,Math.floor(Math.min(...validos.map(p=>p.valor))));
  const techo=Math.max(5,Math.ceil(Math.max(...validos.map(p=>p.valor))));
  const grafico=validos.length?htmlGraficoEvolucion(serie,'notas-estudiante','tu promedio en el tiempo',{
    recto:true,unPunto:true,piso,techo,referencia:4,marcas:Array.from({length:techo-piso+1},(_,i)=>techo-i),rotulo:n=>n===4?'4,0':n,
    resumen:'Un paso por nota, con la pauta actual. Las notas sin fecha van al principio en orden guardado.'+' Segmentos rectos; línea discontinua en 4,0.'
  }):`<p class="stats-evolucion-vacio">${puntos.length?'Aún no hay un promedio calculable para estas notas.':rangoEvolucionStats==='mes'?'No hay notas con fecha de este mes.':rangoEvolucionStats==='semana'?'No hay notas con fecha de esta semana.':'Todavía no hay notas para este rango.'}</p>`;
  const opciones=[['semana','Semana'],['mes','Mes'],['semestre','Semestre']];
  const fecha=p=>textoFechaEvolucion(p);
  return `<div class="stats-evolucion-grafico">${grafico}</div>
    ${validos.length?`<div class="stats-evolucion-fechas" aria-hidden="true"><span>${esc(fecha(validos[0]))}</span><span>${validos.length>1?esc(fecha(validos[validos.length-1])):''}</span></div><div class="stats-evolucion-clave"><i aria-hidden="true"></i>4,0 · referencia</div>`:''}
    <div class="stats-evolucion-rangos" role="group" aria-label="Rango del gráfico">${opciones.map(([id,texto])=>`<button type="button" aria-pressed="${rangoEvolucionStats===id}" data-evolucion-rango="${id}" onclick="cambiarRangoEvolucionStats('${id}')">${texto}</button>`).join('')}</div>
    ${puntos.length?lineaTiempoEvolucionHTML(puntos):''}`;
}
function tarjetaEvolucionStatsHTML(g,avance=null,lectura=''){
  if(!['semana','mes','semestre'].includes(rangoEvolucionStats))rangoEvolucionStats='semestre';
  const notas=modeloEvolucionStats(),ultima=notas.filter(p=>p.valor!==null).at(-1);
  const delta=ultima?.delta??null;
  const color=delta===null||Math.abs(delta)<0.005?'var(--fg2)':delta>0?'var(--green)':'var(--red)';
  return `<section class="stats-evolucion stat-card" id="stats-evolucion" aria-labelledby="stats-evolucion-titulo">
    <h2 id="stats-evolucion-titulo">Tu promedio en el tiempo</h2><span class="stats-evolucion-etiqueta">Semestre actual · ${esc(semester())}</span>
    <div class="stats-evolucion-valor">${g===null?'—':nf(g,2).replace('.',',')}</div>
    ${ultima?`<p class="stats-evolucion-ultimo"><strong style="color:${color}">${esc(textoDeltaEvolucion(delta))}</strong>${delta===null?'':` <span>con ${esc(ultima.nombre)} de ${esc(ultima.ramo)}</span>`}</p>`:''}
    <div id="stats-evolucion-contenido">${contenidoEvolucionStatsHTML()}</div>
    ${avance!==null?contornoAvanceStatsHTML(avance):''}
    ${lectura?`<p class="stats-situation-reading">${lectura}</p>`:''}
  </section>`;
}
function cambiarRangoEvolucionStats(rango){
  if(!['semana','mes','semestre'].includes(rango))return;
  const zona=document.getElementById('stats-evolucion-contenido');if(!zona)return;
  const scroll=zona.closest?.('.scroll'),posicion=scroll?.scrollTop;
  rangoEvolucionStats=rango;limiteLineaTiempoStats=5;
  zona.innerHTML=contenidoEvolucionStatsHTML();
  enlazarGraficosEvolucion(zona);
  zona.querySelector(`[data-evolucion-rango="${rango}"]`)?.focus({preventScroll:true});
  if(scroll&&Number.isFinite(posicion))scroll.scrollTop=posicion;
}
