
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
    const ref=porNota.get(claveEvaluacionPanel(nombre))||(unica?porCategoria.get(claveEvaluacionPanel(e.cat.nombre)):null);
    out.push({id:n.id,ramo:ramo.nombre,ramoId:ramo.id,evaluacion:nombre,fecha:e.fecha,nota:n.valor,
      curso:ref&&ref.promedio!=null&&isFinite(Number(ref.promedio))?Number(ref.promedio):null,
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
      const x=evaluacionesConFechaPanel(ramoParaPanel(r),compDe(al,r));
      const corte=inicio!==undefined?desde:inicioRamoPanel(al,r).dia;
      x.evaluaciones.forEach(e=>{e.inicio=corte;e.lado=corte&&e.fecha<corte?'antes':'ahora';});
      evaluaciones=evaluaciones.concat(x.evaluaciones);sinFecha+=x.sinFecha;
    });
    evaluaciones.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0);
    const antes=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='antes'));
    const ahora=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='ahora'));
    const suficiente=antes.nComparadas>=MIN_EVALS_COMPARACION&&ahora.nComparadas>=MIN_EVALS_COMPARACION;
    return {id:al.id,nombre:al.nombre_visible,desde,antes,ahora,sinFecha,evaluaciones,
      cambio:suficiente?ahora.diferencia-antes.diferencia:null};
  });
}
// El grupo: la mediana del cambio (un alumno que subió mucho no la mueve sola),
// cuántos mejoraron de los que tienen datos, y aprobación y promedio de todas
// las evaluaciones juntas, antes y ahora.
function metricasGrupoPanel(alumnos,compDe,{inicioDe}={}){
  const porAlumno=(alumnos||[]).map(al=>metricasAlumnoPanel(al,compDe,inicioDe?{inicio:inicioDe(al)}:{}));
  const conCambio=porAlumno.filter(m=>m.cambio!==null);
  const todas=lado=>porAlumno.flatMap(m=>m.evaluaciones.filter(e=>e.lado===lado));
  return {alumnos:porAlumno,conCambio:conCambio.length,
    mejoraron:conCambio.filter(m=>m.cambio>0).length,
    cambioMediana:medianaPanel(conCambio.map(m=>m.cambio)),
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
