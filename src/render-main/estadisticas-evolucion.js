// Solo lectura y estado de vista. Nunca se guardan series ni rangos en S.
let rangoEvolucionStats='semestre';
let cacheEvolucionStats=null;

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
function serieSemestresEvolucion(historial,ramos,actual){
  const puntos=[...(historial||[])].reverse().map(h=>({nombre:h.label||'Semestre anterior',valor:gpaHistorial(h),periodo:parseEtiquetaSemestre(h.label),actual:false})).filter(p=>p.valor!==null);
  const orden=p=>p.periodo?p.periodo.anio*10+(p.periodo.periodo==='v'?0:Number(p.periodo.periodo)):-Infinity;
  puntos.sort((a,b)=>orden(a)-orden(b));
  const valor=gpa(ramos);
  if(valor!==null)puntos.push({nombre:actual,valor,actual:true});
  return puntos.map((p,i)=>({...p,delta:i?p.valor-puntos[i-1].valor:null,fecha:p.nombre}));
}
function puntosRangoEvolucion(rango,notas,historial,ramos,actual,ahora=new Date()){
  if(rango==='carrera')return serieSemestresEvolucion(historial,ramos,actual);
  if(rango!=='mes')return notas;
  const inicio=new Date(ahora.getFullYear(),ahora.getMonth(),1).getTime();
  const fin=new Date(ahora.getFullYear(),ahora.getMonth()+1,1).getTime();
  return notas.filter(p=>p.tiempo!==null&&p.tiempo>=inicio&&p.tiempo<fin);
}
function textoDeltaEvolucion(delta){
  if(delta===null)return 'Primer promedio';
  if(Math.abs(delta)<0.005)return 'Sin cambio';
  return (delta>0?'+':'−')+nf(Math.abs(delta),2).replace('.',',');
}
function tablaEvolucionHTML(puntos,carrera){
  return `<details class="stats-evolucion-tabla"><summary>Ver datos del gráfico</summary>
    <div class="stats-evolucion-tabla-scroll"><table><caption>${carrera?'Promedio de cada semestre archivado y del actual.':'Promedios recalculados con la pauta actual.'}</caption>
      <thead><tr><th scope="col">${carrera?'Semestre':'Evaluación y fecha'}</th>${carrera?'':'<th scope="col">Nota</th>'}<th scope="col">Promedio</th><th scope="col">Cambio</th></tr></thead>
      <tbody>${puntos.map(p=>`<tr><th scope="row">${esc(p.nombre)}${carrera?'':`<small>${esc(p.ramo)} · ${esc(textoFechaEvolucion(p))}</small>`}</th>${carrera?'':`<td>${nf(p.nota,2).replace('.',',')}</td>`}<td>${p.valor===null?'—':nf(p.valor,2).replace('.',',')}</td><td>${esc(textoDeltaEvolucion(p.delta))}</td></tr>`).join('')}</tbody>
    </table></div></details>`;
}
function contenidoEvolucionStatsHTML(){
  const carrera=rangoEvolucionStats==='carrera';
  const todos=modeloEvolucionStats();
  const puntos=puntosRangoEvolucion(rangoEvolucionStats,todos,S.historial,S.ramos,semester());
  const validos=puntos.filter(p=>Number.isFinite(p.valor));
  const serie=validos.map(p=>({valor:p.valor,actual:p===validos[validos.length-1],x:validos.length===1?50:undefined,
    etiqueta:carrera?'Semestre '+p.nombre:p.nombre+' · '+p.ramo,
    valorTexto:'Promedio '+nf(p.valor,2).replace('.',','),
    detalle:carrera?(p.actual?'Semestre actual':'Semestre archivado'):textoFechaEvolucion(p)+' · Nota '+nf(p.nota,2).replace('.',',')+' · '+textoDeltaEvolucion(p.delta)+(p.delta===null?'':' puntos'),
    lectura:carrera?`Semestre ${p.nombre}, promedio ${nf(p.valor,2)}`:`${p.nombre} de ${p.ramo}, ${textoFechaEvolucion(p)}, nota ${nf(p.nota,2)}. Promedio ${nf(p.valor,2)}. ${textoDeltaEvolucion(p.delta)}.`}));
  const piso=Math.min(4,Math.floor(Math.min(...validos.map(p=>p.valor))));
  const techo=Math.max(5,Math.ceil(Math.max(...validos.map(p=>p.valor))));
  const grafico=validos.length?htmlGraficoEvolucion(serie,'notas-estudiante','tu promedio en el tiempo',{
    recto:true,unPunto:true,piso,techo,referencia:4,marcas:Array.from({length:techo-piso+1},(_,i)=>techo-i),rotulo:n=>n===4?'4,0':n,
    resumen:(carrera?'Un punto por semestre.':'Un paso por nota, con la pauta actual. Las notas sin fecha van al principio en orden guardado.')+' Segmentos rectos; línea discontinua en 4,0.'
  }):`<p class="stats-evolucion-vacio">${puntos.length?'Aún no hay un promedio calculable para estas notas.':rangoEvolucionStats==='mes'?'No hay notas con fecha de este mes.':'Todavía no hay notas para este rango.'}</p>`;
  const opciones=[['mes','Mes'],['semestre','Semestre'],...((S.historial||[]).length?[['carrera','Carrera']]:[])];
  const fecha=p=>carrera?p.nombre:textoFechaEvolucion(p);
  return `<div class="stats-evolucion-grafico">${grafico}</div>
    ${validos.length?`<div class="stats-evolucion-fechas" aria-hidden="true"><span>${esc(fecha(validos[0]))}</span><span>${validos.length>1?esc(fecha(validos[validos.length-1])):''}</span></div><div class="stats-evolucion-clave"><i aria-hidden="true"></i>4,0 · referencia</div>`:''}
    <div class="stats-evolucion-rangos" role="group" aria-label="Rango del gráfico">${opciones.map(([id,texto])=>`<button type="button" aria-pressed="${rangoEvolucionStats===id}" data-evolucion-rango="${id}" onclick="cambiarRangoEvolucionStats('${id}')">${texto}</button>`).join('')}</div>
    ${puntos.length?tablaEvolucionHTML(puntos,carrera):''}`;
}
function tarjetaEvolucionStatsHTML(g,anilloAvance='',lectura=''){
  if(rangoEvolucionStats==='carrera'&&!(S.historial||[]).length)rangoEvolucionStats='semestre';
  if(g===null&&(S.historial||[]).length)rangoEvolucionStats='carrera';
  const notas=modeloEvolucionStats(),ultima=notas.filter(p=>p.valor!==null).at(-1);
  const delta=ultima?.delta??null;
  const color=delta===null||Math.abs(delta)<0.005?'var(--fg2)':delta>0?'var(--green)':'var(--red)';
  return `<section class="stats-evolucion stat-card" id="stats-evolucion" aria-labelledby="stats-evolucion-titulo">
    <h2 id="stats-evolucion-titulo">Tu promedio en el tiempo</h2><span class="stats-evolucion-etiqueta">Semestre actual · ${esc(semester())}</span>
    <div class="stats-evolucion-valor">${g===null?'—':nf(g,2).replace('.',',')}</div>
    ${ultima?`<p class="stats-evolucion-ultimo"><strong style="color:${color}">${esc(textoDeltaEvolucion(delta))}</strong>${delta===null?'':` <span>con ${esc(ultima.nombre)} de ${esc(ultima.ramo)}</span>`}</p>`:''}
    <div id="stats-evolucion-contenido">${contenidoEvolucionStatsHTML()}</div>
    ${anilloAvance?`<div class="stats-evolucion-avance">${anilloAvance}<div><span class="stats-evolucion-etiqueta">Peso evaluado</span><p>Del peso evaluable de tus ramos.</p></div></div>`:''}
    ${lectura?`<p class="stats-situation-reading">${lectura}</p>`:''}
  </section>`;
}
function cambiarRangoEvolucionStats(rango){
  if(!['mes','semestre','carrera'].includes(rango)||(rango==='carrera'&&!(S.historial||[]).length))return;
  const zona=document.getElementById('stats-evolucion-contenido');if(!zona)return;
  const scroll=zona.closest?.('.scroll'),posicion=scroll?.scrollTop;
  rangoEvolucionStats=rango;
  zona.innerHTML=contenidoEvolucionStatsHTML();
  enlazarGraficosEvolucion(zona);
  zona.querySelector(`[data-evolucion-rango="${rango}"]`)?.focus({preventScroll:true});
  if(scroll&&Number.isFinite(posicion))scroll.scrollTop=posicion;
}
