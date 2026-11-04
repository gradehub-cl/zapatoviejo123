
// ─── ESTADÍSTICAS DEL PROFESOR: ANTES Y AHORA (#697) ─────────────────────────
// Cómo les iba a sus alumnos antes de empezar con el profesor y cómo les va
// ahora. La medida principal es la DIFERENCIA CON EL CURSO: la nota menos el
// promedio de GradeHub en esa misma evaluación (desde 5 personas), para que una
// prueba más fácil no parezca una mejora. Una evaluación sin fecha no se puede
// poner antes ni después: queda fuera y se cuenta. Con menos de
// MIN_EVALS_COMPARACION evaluaciones comparables a cada lado no hay "cambio".
// Antes y después no prueba que la mejora sea por las clases: quien busca
// clases suele hacerlo en su peor momento, y desde ahí se sube algo igual.
const MIN_EVALS_COMPARACION=2;
function diaLocalPanel(f){
  // Una fecha sin hora ya es un día: leída con new Date sería medianoche UTC,
  // que en Chile todavía es el día anterior (el 1 de septiembre salía 31 de agosto).
  if(typeof f==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f))return f;
  const d=f instanceof Date?f:new Date(f);if(f==null||isNaN(d))return null;
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const mediaPanel=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
function medianaPanel(xs){
  if(!xs.length)return null;const o=xs.slice().sort((a,b)=>a-b),m=o.length>>1;
  return o.length%2?o[m]:(o[m-1]+o[m])/2;
}
// Cada nota con su fecha (la de la Agenda del alumno) y el promedio del curso
// en esa evaluación. Una categoría de una sola evaluación se compara con su
// categoría, que es la misma prueba.
function evaluacionesConFechaPanel(ramo,comp){
  const porNota=new Map(((comp&&comp.evaluaciones)||[]).map(e=>[e.clave,e]));
  const porCategoria=new Map(((comp&&comp.categorias)||[]).map(e=>[e.clave,e]));
  const out=[],vistas=new Set();
  let eventos=[];try{eventos=typeof agendaEvents==='function'?agendaEvents([ramo]):[];}catch(e){}
  eventos.forEach(e=>(e.notas||[]).forEach(n=>{
    if(typeof n.valor!=='number'||vistas.has(n.id))return;
    vistas.add(n.id);
    const nombre=(n.nombre||'').trim()||e.cat.nombre;
    const unica=!(Number.isInteger(e.cat.slots)&&e.cat.slots>1)&&(e.cat.notas||[]).length<=1;
    const ref=datosComparacionPanel(porNota.get(claveEvaluacionPanel(nombre))||(unica?porCategoria.get(claveEvaluacionPanel(e.cat.nombre)):null));
    out.push({id:n.id,ramo:ramo.nombre,ramoId:ramo.id,evaluacion:nombre,fecha:e.fecha,nota:n.valor,
      curso:ref?.promedio??null,cursoPersonas:ref?.personas??null,
      aprobada:typeof notaAprobada==='function'?notaAprobada(n.valor):n.valor>=4});
  }));
  let sinFecha=0;
  (ramo.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{if(typeof n.valor==='number'&&!vistas.has(n.id))sinFecha++;}));
  return {evaluaciones:out,sinFecha};
}
function resumenLadoPanel(lista){
  const comparadas=lista.filter(e=>e.curso!==null);
  return {n:lista.length,nComparadas:comparadas.length,
    promedio:mediaPanel(lista.map(e=>e.nota)),
    diferencia:mediaPanel(comparadas.map(e=>e.nota-e.curso)),
    aprobacion:lista.length?lista.filter(e=>e.aprobada).length/lista.length:null};
}
// Cuándo empezó con el profesor EN ESE RAMO (pedido de Salva Ramos,
// 2026-10-20: la mitad toma más de una clase, cada una desde otra fecha). La
// fecha propia del ramo; si no, la que el profesor puso para todo (#697); si
// no, cuándo compartió. `fuente` dice cuál de las tres es.
function inicioRamoPanel(al,r){
  const propia=al&&al.inicio_ramos&&r?al.inicio_ramos[r.id]:null;
  if(propia)return {dia:diaLocalPanel(propia),fuente:'ramo'};
  if(al&&al.inicio)return {dia:diaLocalPanel(al.inicio),fuente:'general'};
  return {dia:diaLocalPanel(al&&al.desde),fuente:'compartio'};
}
// `inicio`, si viene, manda sobre la fecha de cada ramo.
function metricasAlumnoPanel(al,compDe,{inicio}={}){
  return conUniversidadPanel(al.tenant,()=>{
    const desde=diaLocalPanel(inicio!==undefined?inicio:(al.inicio||al.desde));
    let evaluaciones=[],sinFecha=0;
    (al.ramos||[]).forEach(r=>{
      const comp=compDe(al,r),x=evaluacionesConFechaPanel(ramoParaPanel(r),comp),pre=preparacionRamoPanel(al,r);
      const corte=inicio!==undefined?desde:inicioRamoPanel(al,r).dia;
      if(pre?.manual){
        // Sin fecha también cuenta si tiene un id crudo: no se inventa un día.
        const ya=new Set(x.evaluaciones.map(e=>e.id));
        for(const e of pre.evaluaciones||[]){if(!e.nota_id||ya.has(e.nota_id)||typeof e.nota!=='number'||e.ambigua)continue;
          const ref=datosComparacionPanel((comp?.evaluaciones||[]).find(c=>c.clave===claveEvaluacionPanel(e.nombre)));
          x.evaluaciones.push({id:e.nota_id,ramo:r.nombre,ramoId:r.id,evaluacion:e.nombre,fecha:e.fecha||null,nota:e.nota,curso:ref?.promedio??null,cursoPersonas:ref?.personas??null,aprobada:notaAprobada(e.nota)});ya.add(e.nota_id);x.sinFecha=Math.max(0,x.sinFecha-1);
        }
      }
      x.evaluaciones.forEach(e=>{e.percentil=percentilEvaluacionPanel(al,r,e.id,comp);e.inicio=corte;e.metodo=pre?.manual?'manual':'fecha';e.lado=pre?.manual?(pre.marcas.some(m=>coincideMarcaPreparada(m,e))?'ahora':'antes'):(corte&&e.fecha<corte?'antes':'ahora');});
      evaluaciones=evaluaciones.concat(x.evaluaciones);sinFecha+=x.sinFecha;
    });
    evaluaciones.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0);
    const antes=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='antes'));
    const ahora=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='ahora'));
    const suficiente=antes.nComparadas>=MIN_EVALS_COMPARACION&&ahora.nComparadas>=MIN_EVALS_COMPARACION;
    const metodos=new Set((al.ramos||[]).map(r=>preparacionRamoPanel(al,r)?.manual?'manual':'fecha'));
    return {id:al.id,nombre:al.nombre_visible,desde,antes,ahora,sinFecha,evaluaciones,metodo:metodos.size>1?'mixto':metodos.has('manual')?'manual':'fecha',
      cambio:suficiente&&!al.preparacion?.errorCarga&&metodos.size<=1?ahora.diferencia-antes.diferencia:null};
  });
}
// Unidad de comparación: una persona en un ramo, con su propio inicio.
// La función de alumno conserva el listado completo para exportar evaluaciones;
// las estadísticas y el CSV de resumen solo consumen este corte por ramo.
function metricasAlumnoRamoPanel(al,r,compDe,{inicio}={}){
  return conUniversidadPanel(al.tenant,()=>{
    const corte=inicio!==undefined?diaLocalPanel(inicio):inicioRamoPanel(al,r).dia;
    const m=metricasAlumnoPanel({...al,ramos:[r]},compDe,{inicio:corte});
    return {...m,tenant:al.tenant,ramoId:r.id,ramo:r.nombre,
      sigla:siglaDeRamo(ramoParaPanel(r))||r.sigla||''};
  });
}
// El grupo: la mediana de los cambios de cada par alumno-ramo,
// cuántos mejoraron de los que tienen datos, y aprobación y promedio de todas
// las evaluaciones juntas, antes y ahora.
function metricasGrupoPanel(alumnos,compDe,{inicioDe}={}){
  const porAlumno=(alumnos||[]).flatMap(al=>(al.ramos||[]).map(r=>metricasAlumnoRamoPanel(al,r,compDe,inicioDe?{inicio:inicioDe(al,r)}:{})));
  const totalAlumnos=new Set(porAlumno.map(m=>m.id)).size;
  const totalRamos=new Set(porAlumno.map(m=>`${m.tenant}|${m.sigla?String(m.sigla).toUpperCase():claveEvaluacionPanel(m.ramo)}`)).size;
  const paresPercentiles=porAlumno.map(resumenPercentilesPanel).filter(p=>p.cambio!==null);
  const percentiles=paresPercentiles.length?{antes:medianaPanel(paresPercentiles.map(p=>p.antes)),ahora:medianaPanel(paresPercentiles.map(p=>p.ahora)),cambio:medianaPanel(paresPercentiles.map(p=>p.cambio))}:null;
  const conCambio=porAlumno.filter(m=>m.cambio!==null);
  const todas=lado=>porAlumno.flatMap(m=>m.evaluaciones.filter(e=>e.lado===lado));
  const metodos=[...new Set(porAlumno.map(m=>m.metodo))];
  return {alumnos:porAlumno,totalAlumnos,totalRamos,percentiles:metodos.length>1?null:percentiles,metodo:metodos.length>1?'mixto':metodos[0]||'fecha',
    grupos:metodos.length>1?metodos.map(metodo=>metricasGrupoPanel((alumnos||[]).map(al=>({...al,ramos:(al.ramos||[]).filter(r=>(preparacionRamoPanel(al,r)?.manual?'manual':'fecha')===metodo)})).filter(al=>al.ramos.length),compDe,inicioDe?{inicioDe}:{})):null,conCambio:conCambio.length,
    mejoraron:conCambio.filter(m=>m.cambio>0).length,
    cambioMediana:metodos.length>1?null:medianaPanel(conCambio.map(m=>m.cambio)),
    antes:resumenLadoPanel(todas('antes')),ahora:resumenLadoPanel(todas('ahora')),
    sinFecha:porAlumno.reduce((s,m)=>s+m.sinFecha,0)};
}

// Buscador del panel: por el nombre con que el alumno eligió aparecer, o por
// ramo o sigla, sin importar tildes ni mayúsculas. Si calza el nombre se ven
// todos sus ramos; si calza un ramo, solo ese.
function filtrarAlumnosPanel(alumnos,texto){
  const q=claveEvaluacionPanel(texto);
  if(!q)return alumnos;
  const calza=s=>(claveEvaluacionPanel(s)||'').includes(q);
  return alumnos.map(al=>{
    if(calza(al.nombre_visible))return al;
    const ramos=(al.ramos||[]).filter(r=>calza(r.nombre)||calza(r.sigla)||
      (typeof siglaDeRamo==='function'&&calza(siglaDeRamo(r))));
    return ramos.length?{...al,ramos,todosLosRamos:al.todosLosRamos||al.ramos}:null;
  }).filter(Boolean);
}

async function cargarPercentilesPanel(al,rpc){
 try{const {data,error}=await rpc('percentiles_alumno',{p_id:al.id});al.percentiles=!error&&Array.isArray(data)?data:[];}catch(e){al.percentiles=[];}
}
function percentilEvaluacionPanel(al,r,id,comp){
 if(comp?.sinSeccion)return null;
 const f=al.percentiles?.find(x=>x.ramo_id===r.id&&x.nota_id===id),x=f?.[Number.isInteger(comp?.seccion)?'seccion':'ramo'];
 return x&&Number.isInteger(x.personas)&&x.personas>=5&&Number.isFinite(x.percentil)&&x.percentil>=0&&x.percentil<=100?x.percentil:null;
}
function resumenPercentilesPanel(m){
 const lado=k=>{const xs=(m.evaluaciones||[]).filter(e=>e.lado===k&&Number.isFinite(e.percentil)).map(e=>e.percentil);return {n:xs.length,valor:xs.length>=MIN_EVALS_COMPARACION?mediaPanel(xs):null};};
 const a=lado('antes'),b=lado('ahora');return {antes:a.valor,ahora:b.valor,cambio:a.valor!==null&&b.valor!==null?b.valor-a.valor:null};
}
function percentilesPanelHTML(p,{manual=false,grupo=false}={}){
 if(!p||p.antes===null||p.ahora===null)return '<p class="clase-privacidad">Percentiles no disponibles: se necesitan dos evaluaciones por grupo con referencias de al menos cinco estudiantes.</p>';
 const titulo=grupo?'Mediana de percentiles por alumno y ramo':'Posición dentro de GradeHub';
 return `<section class="panel-percentiles"><h3>${titulo}</h3><p>Del p${Math.round(p.antes)} al p${Math.round(p.ahora)} <b class="${p.cambio>0?'ah-sube':p.cambio<0?'ah-baja':''}">${grupo?'Mediana del cambio: ':''}${p.cambio>0?'↑':p.cambio<0?'↓':'='} ${Math.abs(p.cambio).toFixed(0)} puntos percentiles</b></p>${[[manual?'No preparadas':'Antes',p.antes],[manual?'Preparadas':'Ahora',p.ahora]].map(([titulo,v])=>`<div><span>${titulo} · p${Math.round(v)}</span><progress max="100" value="${v}" aria-label="${titulo}, percentil ${Math.round(v)}"></progress></div>`).join('')}<small>Promedio de posiciones por evaluación; no es una nota ni demuestra causalidad. Empates: rango medio.</small></section>`;
}
