
// ─── Lado del profesor ───────────────────────────────────────────────────────
function ramoParaPanel(r){
  // Los ramos llegan tal como el alumno los guardó; normalize les completa lo
  // que una versión vieja pudo no escribir, igual que al cargar la app.
  try{const n=typeof normalize==='function'?normalize({ramos:[r]}).ramos[0]:r;return n||r;}catch(e){return r;}
}
// Solo explica una regla del motor; no aplica un tope nuevo ni guarda datos.
function motivoPromedioAlumnoPanel(r){
  if(estadoEximicion(r)?.activa)return '';
  return textoCompuertaActiva(gatesActivas(r)[0]);
}
// Notas agrupadas como en la ficha del ramo: cada categoría con su promedio
// (el del motor, con descartes y reglas) y sus notas debajo.
function categoriasDeRamoPanel(r){
  let valores=new Map();
  try{
    const base=typeof calculoRamoConCompuertas==='function'?calculoRamoConCompuertas(r):null;
    if(base&&base.res)valores=new Map((base.res.breakdown||[]).map(n=>[n.id,n.value]));
  }catch(e){}
  return (r.categorias||[]).map(c=>{
    const notas=(c.notas||[]).filter(n=>typeof n.valor==='number'&&isFinite(n.valor)).map(n=>{
      const nombre=(n.nombre||'').trim()||c.nombre;
      return {id:n.id,nombre,valor:n.valor,clave:claveEvaluacionPanel(nombre)};
    });
    const v=valores.get(c.id);
    const promedio=typeof v==='number'&&isFinite(v)?v:(typeof avgPond==='function'?avgPond(notas):null);
    return {nombre:c.nombre,clave:claveEvaluacionPanel(c.nombre),notas,promedio};
  }).filter(c=>c.notas.length);
}
// La próxima evaluación sin nota del ramo, de hoy en adelante, y cuánto
// necesita en ella para ir con 4 después de rendirla: lo mismo que el alumno
// ve en sus widgets (notaParaIrConCuatro), con las fechas de su Agenda.
// Los ramos que el alumno compartió, que es donde se busca el ramo vinculado.
// Sin esto ramoAvg buscaba en S.ramos, que en el panel son los del PROFESOR: la
// Dinámica de un alumno se combinaba con el laboratorio del profesor. Con una
// búsqueda escrita, igual se usan todos los que compartió, no solo los que se ven.
function ramosDelAlumnoPanel(al){return ((al&&(al.todosLosRamos||al.ramos))||[]).map(ramoParaPanel);}
function proximaEvaluacionPanel(ramo,ahora=new Date(),contexto=[ramo]){
  if(typeof agendaEvents!=='function')return null;
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  let e=null;
  try{e=agendaEvents([ramo]).find(x=>x.pending&&x.fecha>=hoy)||null;}catch(err){return null;}
  if(!e)return null;
  const cuatro=(typeof notaParaIrConCuatro==='function'?notaParaIrConCuatro(e,contexto):null)||{};
  return {evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,fecha:e.fecha,hora:e.hora||null,
    necesita:cuatro.nota||null,margen:!!cuatro.margen,inalcanzable:!!cuatro.inalcanzable};
}
function proximaEvaluacionPanelHTML(p){
  if(!p)return '';
  const cuando=esc(fechaCorta(p.fecha))+(p.hora?' · '+esc(p.hora):'');
  // Sin color: el semáforo es para notas, y esto es una meta.
  const meta=p.necesita?`necesita <b>${esc(p.necesita.replace('.',','))}</b> para ir con 4`
    :p.margen?'va con 4 con cualquier nota'
    :p.inalcanzable?'con esta sola no alcanza el 4':'';
  return `<p class="panel-alumnos-proxima"><span>Próxima: <b>${esc(p.evaluacion)}</b> · ${cuando}</span>${meta?`<span>${meta}</span>`:''}</p>`;
}
// `etiqueta`: true dice "GradeHub"; un texto ("Sección 3") dice ese texto.
function comparacionTexto(prom,personas,etiqueta=false){
  const nombre=etiqueta===true?'GradeHub':etiqueta?esc(etiqueta):'';
  if(prom==null)return `<span class="panel-alumnos-sin">${nombre?nombre+': aún pocos datos':'Aún pocos datos'}</span>`;
  return `<span class="panel-alumnos-gh">${esc(fmtPromedio(Number(prom)))}<small>${nombre?nombre+' · ':''}${personas} personas</small></span>`;
}
// POR SECCIÓN (2026-10-20, pedido de Salva Ramos): el profesor elige comparar
// con todo GradeHub o con la sección de cada alumno, la que escribió en Editar
// ramo. Sin sección declarada no hay con qué comparar y se dice. La elección
// se recuerda en este navegador; si no se puede, parte en GradeHub.
const SIN_SECCION_PANEL=Object.freeze({sinSeccion:true,ramo:null,evaluaciones:[],categorias:[]});
const CLAVE_COMPARA_PANEL='gh_panel_compara';
function comparaSeccionGuardado(){try{return localStorage.getItem(CLAVE_COMPARA_PANEL)==='seccion';}catch(e){return false;}}
function guardarComparaSeccion(v){try{localStorage.setItem(CLAVE_COMPARA_PANEL,v?'seccion':'gradehub');}catch(e){}}
function comparaPanelHTML(seccion){
  const op=(v,t)=>`<button type="button" data-compara="${v}" aria-pressed="${(v==='seccion')===seccion}">${t}</button>`;
  return `<div class="panel-alumnos-compara" role="group" aria-label="Comparar con">${op('gradehub','Ramo')}${op('seccion','Sección')}</div>`;
}
// `extra` va bajo la cabeza del ramo (en el panel, cuándo empezó en él). El
// ramo se pliega con la misma flecha que la fila del alumno; `abierto` dice
// cómo parte.
function ramoPanelHTML(r,comp,ahora=new Date(),contexto,extra='',abierto=true){
  const ramo=ramoParaPanel(r);
  contexto=contexto||[ramo];
  const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,contexto):null;
  const motivo=motivoPromedioAlumnoPanel(ramo);
  const sigla=typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla;
  const porNota=new Map(((comp&&comp.evaluaciones)||[]).map(e=>[e.clave,e]));
  const porCategoria=new Map(((comp&&comp.categorias)||[]).map(e=>[e.clave,e]));
  const categorias=categoriasDeRamoPanel(ramo);
  // Una nota cuyo nombre no calza con nadie no repite "aún pocos datos": la
  // comparación útil está en su categoría.
  const sinSeccion=!!(comp&&comp.sinSeccion),guion='<span class="panel-alumnos-sin">—</span>';
  const nombreComp=comp&&Number.isInteger(comp.seccion)?`Sección ${comp.seccion}`:'GradeHub';
  const deNota=n=>{const e=!sinSeccion&&porNota.get(n.clave);return e?comparacionTexto(e.promedio,e.personas):guion;};
  const deCategoria=c=>{if(sinSeccion)return guion;const e=porCategoria.get(c.clave);return comparacionTexto(e?e.promedio:null,e?e.personas:0);};
  const filas=categorias.map(c=>{
    // Una categoría de una sola nota es una sola fila.
    if(c.notas.length===1)return `<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}</td><td>${esc(fmt(c.notas[0].valor))}</td><td>${deCategoria(c)}</td></tr></tbody>`;
    return `<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}<small>${c.notas.length} notas</small></td><td>${c.promedio===null?'·':esc(fmtPromedio(c.promedio))}</td><td>${deCategoria(c)}</td></tr>
      ${c.notas.map(n=>`<tr class="panel-alumnos-nota"><td>${esc(n.nombre)}</td><td>${esc(fmt(n.valor))}</td><td>${deNota(n)}</td></tr>`).join('')}</tbody>`;
  }).join('');
  return `<details class="panel-alumnos-ramo" data-ramo="${esc(ramo.id)}"${abierto?' open':''}>
    <summary class="panel-alumnos-ramo-cabeza">
      <span class="panel-alumnos-ramo-resumen"><span class="panel-alumnos-ramo-nombre"><b>${esc(ramo.nombre)}</b>${sigla?`<small>${esc(sigla)}</small>`:''}</span>
        <span class="panel-alumnos-ramo-cifras"><span class="panel-alumnos-prom">${avg===null?'Sin notas':esc(fmtPromedio(avg))}<small>promedio</small></span>
        ${sinSeccion?'<span class="panel-alumnos-gh">No disponible<small>sin sección</small></span>'
          :comparacionTexto(comp&&comp.ramo?comp.ramo.promedio:null,comp&&comp.ramo?comp.ramo.personas:0,nombreComp==='GradeHub'?true:nombreComp)}</span></span>
    </summary>
    ${motivo?`<p class="panel-alumnos-proxima">${esc(motivo)}</p>`:''}
    ${extra}
    ${proximaEvaluacionPanelHTML(proximaEvaluacionPanel(ramo,ahora,contexto))}
    ${categorias.length?`<table class="panel-alumnos-notas"><thead><tr><th>Evaluación</th><th>Nota</th><th>${comp&&(sinSeccion||Number.isInteger(comp.seccion))?'Su sección':'GradeHub'}</th></tr></thead>${filas}</table>`
      :'<p class="clase-sin-datos">Todavía no tiene notas en este ramo.</p>'}
  </details>`;
}

// Resumen del grupo (#667): por ramo, cuántos alumnos, su promedio (ramoAvg de
// cada uno, como en su app, y después el promedio simple entre ellos), cómo va
// cada categoría y cada prueba, y cuántos van en cada color del semáforo. Todo
// con lo que el panel ya bajó; la comparación con GradeHub es la misma de
// siempre, agregada y desde 5 personas.
// Cada alumno se calcula con las reglas de nota de SU universidad, no con las
// del profesor que mira. La UAndes redondea a la centésima y después a la
// décima: un 3,946 es 4,0 para un alumno UAndes y 3,9 para uno de la UC. Con
// la universidad del profesor, uno UAndes salía reprobando siendo aprobado, y
// uno UC aprobando siendo reprobado. El motor lee S.tenant en cada llamada:
// acá se pone la del alumno y se restaura siempre, aunque algo falle. Todo lo
// que corre adentro es sincrónico.
function conUniversidadPanel(tenant,fn){
  const conocida=typeof TENANTS==='object'&&TENANTS&&Object.prototype.hasOwnProperty.call(TENANTS,tenant);
  if(!S||!conocida||S.tenant===tenant)return fn();
  const propia=S.tenant;
  S.tenant=tenant;
  try{return fn();}finally{S.tenant=propia;}
}
// El motor busca los ramos vinculados en S.ramos. Durante este cálculo
// sincrónico deben ser los del alumno, nunca los del profesor que mira.
function conRamosAlumnoPanel(al,fn){
  return conUniversidadPanel(al.tenant,()=>{
    const propios=S.ramos,contexto=ramosDelAlumnoPanel(al);
    S.ramos=contexto;
    try{return fn(contexto);}finally{S.ramos=propios;}
  });
}
function resumenAlumnosPanel(alumnos,compDe){
  const media=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  const grupos=new Map();
  (alumnos||[]).forEach(al=>conUniversidadPanel(al.tenant,()=>{const ctx=ramosDelAlumnoPanel(al);(al.ramos||[]).forEach(r=>{
    const ramo=ramoParaPanel(r);
    const sigla=(typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||r.sigla||'';
    // Con la universidad en la clave, un grupo nunca mezcla reglas de nota.
    const clave=`${al.tenant}|`+(sigla?String(sigla).toUpperCase():'nombre|'+claveEvaluacionPanel(ramo.nombre));
    if(!grupos.has(clave))grupos.set(clave,{clave,tenant:al.tenant,nombre:ramo.nombre,sigla,comp:compDe(al,r)||null,alumnos:0,
      promedios:[],semaforo:{good:0,warn:0,bad:0,neutral:0},categorias:new Map()});
    const g=grupos.get(clave);
    g.alumnos++;
    const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
    if(Number.isFinite(avg))g.promedios.push(avg);
    g.semaforo[Number.isFinite(avg)&&typeof nivelRamo==='function'?nivelRamo(ramo,avg):'neutral']++;
    categoriasDeRamoPanel(ramo).forEach(c=>{
      if(!c.clave)return;
      if(!g.categorias.has(c.clave))g.categorias.set(c.clave,{clave:c.clave,nombre:c.nombre,promedios:[],evaluaciones:new Map()});
      const gc=g.categorias.get(c.clave);
      if(Number.isFinite(c.promedio))gc.promedios.push(c.promedio);
      c.notas.forEach(n=>{
        if(!n.clave)return;
        if(!gc.evaluaciones.has(n.clave))gc.evaluaciones.set(n.clave,{clave:n.clave,nombre:n.nombre,notas:[]});
        gc.evaluaciones.get(n.clave).notas.push(n.valor);
      });
    });
  });}));
  return [...grupos.values()].map(g=>({clave:g.clave,tenant:g.tenant,nombre:g.nombre,sigla:g.sigla,comp:g.comp,alumnos:g.alumnos,
    conNotas:g.promedios.length,promedio:media(g.promedios),semaforo:g.semaforo,
    categorias:[...g.categorias.values()].map(c=>({clave:c.clave,nombre:c.nombre,alumnos:c.promedios.length,promedio:media(c.promedios),
      evaluaciones:[...c.evaluaciones.values()].map(e=>({clave:e.clave,nombre:e.nombre,alumnos:e.notas.length,promedio:media(e.notas)}))}))}))
    .sort((x,y)=>y.alumnos-x.alumnos||String(x.nombre).localeCompare(String(y.nombre),'es'));
}
// Dos promedios en la misma escala declarada por la universidad. Un dato
// oculto o ausente no se convierte en nota mínima ni en cero.
function comparacionPromediosPanelHTML(propio,referencia,tenant){
  if(!Number.isFinite(propio)&&!Number.isFinite(referencia))return '';
  const {min,max}=gh_reglasNota(tenant).grade_scale;
  const posicion=n=>(100*(Math.max(min,Math.min(max,n))-min)/(max-min)).toFixed(2);
  return `<div class="panel-curso-comparacion" role="img" aria-label="${esc(`Escala de ${fmtPromedio(min)} a ${fmtPromedio(max)}. Tus alumnos: ${Number.isFinite(propio)?fmtPromedio(propio):'sin notas'}. GradeHub: ${Number.isFinite(referencia)?fmtPromedio(referencia):'aún pocos datos'}.`)}">
    <div aria-hidden="true">
      <span class="panel-curso-escala">${Array.from({length:Math.floor(max)-Math.ceil(min)+1},(_,i)=>`<b style="left:${posicion(Math.ceil(min)+i)}%"></b>`).join('')}${[['propio',propio],['referencia',referencia]].map(([k,n])=>Number.isFinite(n)?`<i class="panel-curso-${k}" style="left:${posicion(n)}%"></i>`:'').join('')}</span>
      <span class="panel-curso-extremos"><span>${esc(fmtPromedio(min))}</span><span class="panel-curso-claves">${Number.isFinite(propio)?'<span><i class="panel-curso-propio"></i>Tus alumnos</span>':''}${Number.isFinite(referencia)?'<span><i class="panel-curso-referencia"></i>GradeHub</span>':''}</span><span>${esc(fmtPromedio(max))}</span></span></div>
  </div>`;
}

function resumenAlumnosPanelHTML(resumen){
  const n=(k,uno,varios)=>`${k} ${k===1?uno:varios}`;
  const prom=v=>v===null?'·':esc(fmtPromedio(v));
  const ramos=resumen.map(g=>conUniversidadPanel(g.tenant,()=>{
    const comp=g.comp||{};
    const porNota=new Map((comp.evaluaciones||[]).map(e=>[e.clave,e]));
    const porCategoria=new Map((comp.categorias||[]).map(e=>[e.clave,e]));
    const gh=e=>comparacionTexto(e?e.promedio:null,e?e.personas:0);
    const dif=g.promedio!==null&&comp.ramo&&comp.ramo.promedio!=null?g.promedio-Number(comp.ramo.promedio):null;
    // El semáforo dice aprobando / al borde / reprobando, nunca decoración.
    const estados=[['good','aprobando'],['warn','al borde'],['bad','reprobando'],['neutral','sin notas']];
    const sem=estados.filter(([k])=>g.semaforo[k])
      .map(([k,t])=>`<span class="panel-resumen-sem panel-resumen-${k}">${g.semaforo[k]} ${t}</span>`).join('');
    const distribucion=g.alumnos>0?`<span class="panel-curso-distribucion" aria-hidden="true">${estados.filter(([k])=>g.semaforo[k]).map(([k])=>`<i class="panel-curso-${k}" style="flex-grow:${g.semaforo[k]}"></i>`).join('')}</span>`:'';
    const filas=g.categorias.map(c=>`<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}<small>${n(c.alumnos,'alumno','alumnos')}</small></td><td>${prom(c.promedio)}</td><td>${gh(porCategoria.get(c.clave))}</td></tr>
      ${c.evaluaciones.length>1?c.evaluaciones.map(e=>`<tr class="panel-alumnos-nota"><td>${esc(e.nombre)}<small>${n(e.alumnos,'nota','notas')}</small></td><td>${prom(e.promedio)}</td><td>${porNota.has(e.clave)?gh(porNota.get(e.clave)):'<span class="panel-alumnos-sin">—</span>'}</td></tr>`).join(''):''}</tbody>`).join('');
    return `<details class="panel-resumen-ramo">
      <summary>
        <span class="panel-resumen-nombre"><b>${esc(g.nombre)}</b><small>${g.sigla?esc(g.sigla)+' · ':''}${n(g.alumnos,'alumno','alumnos')}</small></span>
        <span class="panel-alumnos-prom">${g.promedio===null?'Sin notas':prom(g.promedio)}<small>tus alumnos</small></span>
        ${comparacionTexto(comp.ramo?comp.ramo.promedio:null,comp.ramo?comp.ramo.personas:0,true)}
        <span class="panel-resumen-semaforo">${distribucion}<span class="panel-curso-leyenda">${sem}</span></span>
      </summary>
      ${comparacionPromediosPanelHTML(g.promedio,comp.ramo?comp.ramo.promedio:null,g.tenant)}
      ${dif===null?'':`<p class="panel-resumen-dif">Tus alumnos van <b>${Math.abs(dif)<0.05?'igual que':`${esc(unDecimalPanel(dif))} ${dif>0?'sobre':'bajo'}`}</b> el promedio de GradeHub en este ramo.</p>`}
      ${g.categorias.length?`<table class="panel-alumnos-notas"><thead><tr><th>Evaluación</th><th>Tus alumnos</th><th>GradeHub</th></tr></thead>${filas}</table>`
        :`<p class="clase-sin-datos">${g.promedio===null?'Todavía no hay notas en este ramo.':'Sin detalle por evaluación.'}</p>`}
      <button type="button" class="agent-refresh panel-resumen-ver" data-ver-ramo="${esc(g.sigla||g.nombre)}">Ver ${n(g.alumnos,'alumno','alumnos')} de este ramo</button>
    </details>`;
  })).join('');
  return `<section class="panel-alumnos-resumen" aria-labelledby="resumen-titulo">
    <div class="profesor-hig-lista-cabeza"><h2 id="resumen-titulo">Tus alumnos por ramo</h2><span>${n(resumen.length,'ramo','ramos')}</span></div>
    ${ramos}
    <p class="clase-privacidad">“Tus alumnos” es el promedio simple entre los alumnos con nota. Si van sobre o bajo GradeHub no dice por qué: también cuentan el profesor de cátedra, la sección y lo que cada uno estudia.</p>
  </section>`;
}
