
// ─── Lado del profesor ───────────────────────────────────────────────────────
function ramoParaPanel(r){
  // Los ramos llegan tal como el alumno los guardó; normalize les completa lo
  // que una versión vieja pudo no escribir, igual que al cargar la app.
  try{const n=typeof normalize==='function'?normalize({ramos:[r]}).ramos[0]:r;return n||r;}catch(e){return r;}
}
// Solo explica una regla del motor; no aplica un tope nuevo ni guarda datos.
// Le habla al profesor, no al alumno («repruebas» es de la ficha del alumno),
// y con coma decimal. Si el ramo no tiene compuerta propia, mira el ramo que
// le aporta nota: Dinámica queda en 3,9 cuando su laboratorio no llega a 4,0,
// aunque todas las notas de la cátedra estén sobre 4.
function motivoPromedioAlumnoPanel(r,contexto){
  if(estadoEximicion(r)?.activa)return '';
  const coma=v=>fmtPromedio(v).replace('.',',');
  const g=gatesActivas(r)[0];
  if(g){
    const final=typeof g.cap!=='number'?'reprueba aunque el promedio dé más'
      :g.grupo&&g.efecto==='reemplazar'?`la nota final queda en ${coma(g.cap)}`:`la nota final no pasa de ${coma(g.cap)}`;
    return `${g.nombre} va ${coma(g.actual)} (mín. ${coma(g.min)}): ${final}`;
  }
  let partes=null;
  try{partes=partesDelVinculo(r,contexto);}catch(e){}
  if(!partes||partes.propio.valor===null||partes.externo.valor===null||!partes.externo.ramo)return '';
  const {min,propio,externo}=partes,final=Math.min(propio.valor,externo.valor);
  if(!gh_cumpleMinimo(externo.valor,min))
    return `${externo.ramo.nombre} va ${coma(externo.valor)} (mín. ${coma(min)}): la nota final queda en ${coma(final)}`;
  if(!gh_cumpleMinimo(propio.valor,min))
    return `La cátedra va ${coma(propio.valor)} (mín. ${coma(min)}): la nota final queda en ${coma(final)}`;
  return '';
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
// La RPC ya entrega `personas` por agregado. Sin una muestra conocida de
// cinco o más no se muestra ni se exporta la comparación, tampoco su tamaño.
function datosComparacionPanel(ref){
  if(!ref||!['number','string'].includes(typeof ref.promedio)||String(ref.promedio).trim()==='')return null;
  const personas=Number(ref.personas),promedio=Number(ref.promedio);
  return Number.isSafeInteger(personas)&&personas>=5&&Number.isFinite(promedio)?{promedio,personas}:null;
}
function textoMuestraPanel(ref){
  const dato=datosComparacionPanel(ref);
  return dato?`vs. ${dato.personas} estudiantes en GradeHub`:'No disponible';
}
// `etiqueta`: true dice "GradeHub"; un texto ("Sección 3") dice ese texto.
function comparacionTexto(prom,personas,etiqueta=false){
  const nombre=etiqueta===true?'GradeHub':etiqueta?esc(etiqueta):'';
  const dato=datosComparacionPanel({promedio:prom,personas});
  if(!dato)return `<span class="panel-alumnos-sin">${nombre?nombre+': ':''}No disponible</span>`;
  return `<span class="panel-alumnos-gh">${esc(fmtPromedio(dato.promedio))}${etiqueta&&etiqueta!==true?`<small>${nombre}</small>`:''}<small>${esc(textoMuestraPanel(dato))}</small></span>`;
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
  const motivo=motivoPromedioAlumnoPanel(ramo,contexto);
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
function identidadResumenRamoPanel(al,ramo,r){
  const sigla=(typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||r.sigla||'';
  // Con la universidad en la clave, un grupo nunca mezcla reglas de nota.
  return {sigla,clave:`${al.tenant}|`+(sigla?String(sigla).toUpperCase():'nombre|'+claveEvaluacionPanel(ramo.nombre))};
}
function resumenAlumnosPanel(alumnos,compDe){
  const media=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  const grupos=new Map();
  (alumnos||[]).forEach(al=>conUniversidadPanel(al.tenant,()=>{const ctx=ramosDelAlumnoPanel(al);(al.ramos||[]).forEach(r=>{
    const ramo=ramoParaPanel(r);
    const {sigla,clave}=identidadResumenRamoPanel(al,ramo,r);
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

// La ficha por ramo conserva la nota oficial y el conteo de quienes van
// reprobando. Solo pruebas cambia las cifras de comparación, como en Estadísticas.
function resumenRamosVistaPanel(alumnos,compDe,{seccion=false,soloPruebas=false}={}){
  const base=resumenAlumnosPanel(alumnos,compDe);
  if(!seccion&&!soloPruebas)return base;
  const porRamo=new Map();
  alumnos.forEach(al=>conUniversidadPanel(al.tenant,()=>{
    for(const r of al.ramos||[]){
      const {clave}=identidadResumenRamoPanel(al,ramoParaPanel(r),r);
      if(!porRamo.has(clave))porRamo.set(clave,new Map());
      const particiones=porRamo.get(clave),id=seccion&&Number.isInteger(r.seccion)?r.seccion:null;
      if(!particiones.has(id))particiones.set(id,[]);
      particiones.get(id).push({...al,ramos:[r],todosLosRamos:al.todosLosRamos||al.ramos});
    }
  }));
  const media=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  const porPruebas=lista=>{
    const pares=lista.map(al=>conUniversidadPanel(al.tenant,()=>{
      const r=al.ramos[0],comp=compDe(al,r);
      return [promedioPruebasPanel(r).promedio,comparacionPruebasPanel({...al,soloPruebasPanel:true},r,comp)?.referenciaPruebas];
    })).filter(([p])=>Number.isFinite(p));
    const solo=lista.map(al=>({...al,ramos:al.ramos.map(r=>({...r,categorias:categoriasPruebasPanel(r)}))}));
    return {promedio:media(pares.map(([p])=>p)),conNotas:pares.length,
      referenciaPruebas:pares.every(([,r])=>Number.isFinite(r))?media(pares.map(([,r])=>r)):null,
      categorias:resumenAlumnosPanel(solo,()=>null)[0].categorias};
  };
  return base.map(g=>{
    const particiones=[...porRamo.get(g.clave)].sort(([a],[b])=>(a??Infinity)-(b??Infinity));
    const vistas=particiones.map(([id,lista])=>{
      const sub=resumenAlumnosPanel(lista,compDe)[0];
      return {...sub,seccion:id,...(soloPruebas?porPruebas(lista):{})};
    });
    if(vistas.length===1)return vistas[0];
    // Una referencia de sección no puede representar a alumnos de otras
    // secciones. Mostramos cada muestra por separado, sin inventar un n común.
    const pruebas=soloPruebas?porPruebas(particiones.flatMap(([,lista])=>lista)):{};
    return {...g,...pruebas,comp:null,referenciaPruebas:null,secciones:vistas};
  });
}
function resumenAlumnosPanelHTML(resumen,{seccion=false,soloPruebas=false,filtros=false,abiertos=new Set(),marcar=false}={}){
  if(!resumen.length)return '<p class="profesor-hig-vacio">Todavía no hay ramos compartidos.</p>';
  const nota=v=>Number.isFinite(v)?cifraNotaPrivada(fmtPromedio(v)):'—';
  const alumnos=n=>`${n} ${n===1?'alumno':'alumnos'}`;
  const refDe=g=>soloPruebas
    ?{promedio:g.referenciaPruebas??null,personas:null}
    :datosComparacionPanel(g.comp?.ramo);
  const pieReferencia=(g,ref)=>{
    if(g.secciones)return 'Ver por sección';
    if(ref?.personas)return `${ref.personas} estudiantes`;
    if(Number.isFinite(ref?.promedio))return 'Muestras por evaluación';
    if(g.comp?.sinSeccion||(seccion&&g.seccion===null))return 'Sin sección declarada';
    if(g.comp?.errorCarga)return 'Error al cargar';
    return 'Sin referencia';
  };
  const difDe=(g,ref)=>Number.isFinite(g.promedio)&&Number.isFinite(ref?.promedio)?g.promedio-ref.promedio:null;
  const detalle=(g,nombre)=>conUniversidadPanel(g.tenant,()=>{
    const comp=g.comp||{};
    const porNota=new Map((comp.evaluaciones||[]).map(e=>[e.clave,e]));
    const porCategoria=new Map((comp.categorias||[]).map(e=>[e.clave,e]));
    const ref=refDe(g),dif=difDe(g,ref);
    const max=gh_reglasNota(g.tenant).grade_scale.max;
    const barra=(label,v,principal)=>barraParalelaEstHTML(label,Number.isFinite(v)?Math.max(0,Math.min(1,v/max)):null,nota(v),principal);
    const evaluacion=(e,muestra,sub=false)=>`<li class="ramos-eval${sub?' ramos-eval-nota':''}">
      <div><b>${esc(e.nombre)}</b><small>${esc(sub?`${e.alumnos} ${e.alumnos===1?'nota':'notas'}`:alumnos(e.alumnos))}</small></div>
      <div>${barra('Tus alumnos',e.promedio,true)}${barra('GradeHub',muestra?.promedio??null,false)}</div>
      <small class="ramos-eval-muestra">${muestra?`${muestra.personas} en GradeHub`:'Sin referencia'}</small>
    </li>`;
    const filas=g.categorias.map(c=>{
      const categoria=evaluacion(c,datosComparacionPanel(porCategoria.get(c.clave))||
        (c.evaluaciones.length===1&&c.evaluaciones[0].clave===c.clave?datosComparacionPanel(porNota.get(c.clave)):null));
      return categoria+(c.evaluaciones.length>1||c.evaluaciones.some(e=>e.clave!==c.clave)
        ?c.evaluaciones.map(e=>evaluacion(e,datosComparacionPanel(porNota.get(e.clave)),true)).join(''):'');
    }).join('');
    return `<section class="ramos-detalle-grupo">
      ${nombre?`<div class="ramos-detalle-cabeza"><h4>${esc(nombre)}</h4><span>${esc(alumnos(g.alumnos))}</span><span>Tus alumnos <b>${nota(g.promedio)}</b></span><span>GradeHub <b>${nota(ref?.promedio)}</b> · ${esc(pieReferencia(g,ref))}</span><span>Diferencia <b>${dif===null?'—':signoEstPanel(dif,'puntos')}</b></span></div>`:''}
      ${filas?`<small class="ramos-escala">Barras en escala común de 0 a ${esc(max)}</small><ul class="ramos-evaluaciones">${filas}</ul>`:'<p class="clase-sin-datos">Sin notas por evaluación.</p>'}
    </section>`;
  });
  const filas=[...resumen].sort((a,b)=>b.semaforo.bad-a.semaforo.bad).map((g,i)=>conUniversidadPanel(g.tenant,()=>{
    const ref=refDe(g),dif=difDe(g,ref),chica=g.conNotas<EST_MUESTRA_CHICA;
    const difTexto=dif===null?'—':signoEstPanel(dif,'puntos');
    const direccion=!chica&&difTexto.startsWith('+')?'ramos-sube':!chica&&difTexto.startsWith('−')?'ramos-baja':'ramos-gris';
    const abierto=abiertos.has(g.clave),id=`ramos-detalle-${i}`;
    return `<article class="ramos-fila" data-ramos-fila>
      <div class="ramos-fila-resumen">
        <button type="button" class="ramos-nombre" data-ramos-abrir="${esc(g.clave)}" aria-controls="${id}" aria-expanded="${abierto}">
          <span><b>${esc(g.nombre)}</b>${g.sigla?`<small>${esc(g.sigla)}</small>`:''}</span><span class="ramos-flecha" aria-hidden="true"></span>
        </button>
        <div class="ramos-cifras${chica?' ramos-muestra-chica':''}">
          ${metricaAdminHTML({titulo:'Alumnos',valor:String(g.alumnos)})}
          ${metricaAdminHTML({titulo:soloPruebas?'Prom. pruebas':'Prom. alumnos',valor:nota(g.promedio),pie:chica&&g.conNotas?`${g.conNotas} con nota`:''})}
          ${metricaAdminHTML({titulo:seccion?'GradeHub · sección':'GradeHub',valor:nota(ref?.promedio),pie:pieReferencia(g,ref)})}
          <div class="${direccion}">${metricaAdminHTML({titulo:'Diferencia',valor:difTexto})}</div>
          ${metricaAdminHTML({titulo:'Reprobando',valor:g.semaforo.neutral===g.alumnos?'—':String(g.semaforo.bad),pie:g.semaforo.bad?'Reforzar':''})}
        </div>
        <div class="ramos-acciones">${marcar?`<button type="button" class="agent-refresh ramos-ver" data-marcar-ramo="${esc(g.clave)}" aria-label="Marcar evaluaciones de ${esc(g.nombre)}">Marcar</button>`:''}<button type="button" class="agent-refresh ramos-ver" data-ver-ramo="${esc(g.sigla||g.nombre)}" aria-label="Ver alumnos de ${esc(g.nombre)}">Ver alumnos</button></div>
      </div>
      <div class="ramos-detalle" id="${id}"${abierto?'':' hidden'}>${g.secciones
        ?g.secciones.map(x=>detalle(x,x.seccion===null?'Sin sección declarada':`Sección ${x.seccion}`)).join('')
        :detalle(g,'')}</div>
    </article>`;
  })).join('');
  const activos=Number(seccion)+Number(soloPruebas);
  return `<section class="ramos-panel" aria-label="Tus alumnos por ramo">
    <div class="ramos-herramientas"><span>${resumen.length} ${resumen.length===1?'ramo':'ramos'}</span>
      <details class="ramos-filtros est" data-ramos-filtros${filtros?' open':''}>
        <summary>Filtros${activos?` <span class="est-cuenta">${activos}</span>`:''}</summary>
        <div class="ramos-filtros-cuerpo">${filtrosComparacionEstHTML(seccion,soloPruebas)}</div>
      </details>
    </div>
    <div class="ramos-lista">${filas}</div>
    <footer class="ramos-pie"><span>Estar sobre o bajo GradeHub no demuestra que se deba a las clases.</span>
      <details><summary>Cómo se calcula</summary><p>El promedio reúne a tus alumnos con nota. Reprobando usa la nota oficial. Solo pruebas compara pruebas, exámenes y controles clasificados. GradeHub reúne a quienes comparten el ramo o la sección indicada. Cada referencia requiere al menos cinco estudiantes y es anónima. La diferencia usa los promedios antes de redondearlos. El promedio de pruebas puede reunir varias muestras y por eso el tamaño se indica por evaluación.</p></details>
    </footer>
  </section>`;
}
