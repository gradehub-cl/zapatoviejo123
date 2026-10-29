function avanceEvaluaciones(ramos){
  let total=0,evaluado=0;
  (ramos||[]).forEach(r=>{
    // El resumen del semestre usa exactamente el mismo criterio que Home.
    // Una categoría con seis casillas y una nota solo aporta una sexta parte
    // de su peso; si se contara completa, la barra afirmaría que el semestre
    // avanzó más de lo que realmente se ha evaluado.
    const progreso=ramoProgress(r);
    total+=progreso.total;
    evaluado+=progreso.total-progreso.pending;
  });
  return {total,evaluado,pct:total>0?Math.round(evaluado/total*100):0};
}
// confirmArchiveSemester agrega lo más reciente al inicio; nunca usar el último
// elemento del array para comparar el semestre actual.
function gpaHistorial(h){
  if(!h||typeof h!=='object')return null;
  if(typeof h.gpa==='number'&&Number.isFinite(h.gpa))return h.gpa;
  if(!Array.isArray(h.ramos))return null;
  // Un respaldo antiguo puede no traer la caché `gpa`. Recalcular al leer
  // recupera la comparación sin tocar el historial persistido ni subir una
  // migración masiva a cuentas que ya existen.
  try{
    const ramos=h.ramos.filter(r=>r&&typeof r==='object');
    const calculado=gpa(ramos);
    return typeof calculado==='number'&&Number.isFinite(calculado)?calculado:null;
  }catch(e){return null;}
}
function ultimoHistorialConGpa(historial){
  for(const h of historial||[]){
    const promedio=gpaHistorial(h);
    if(promedio!==null)return {...h,gpa:promedio};
  }
  return null;
}
function lecturaHistorialPrevio(historial){
  const previo=ultimoHistorialConGpa(historial);
  if(previo)return {previo,estado:'comparable'};
  const hayArchivado=(historial||[]).some(h=>h&&Array.isArray(h.ramos));
  return {previo:null,estado:hayArchivado?'sin_notas':'sin_historial'};
}

// ─── PROYECCIÓN DEL SEMESTRE ─────────────────────────────────────────────────
// Hasta dónde puede llegar el promedio con lo que TODAVÍA no se rinde.
//
// No se calcula a mano: se arma una copia del ramo con las evaluaciones
// pendientes rellenas y se la pasa al motor de siempre. Así el escenario
// respeta compuertas, descartes y el ramo que aporta nota a otro — hacer la
// cuenta aparte daría un número más simple y a veces mentiroso, justo en la
// pantalla que dice "hasta acá puedes llegar".
function ramoConPendientesEn(ramo,valor){
  return {...ramo,categorias:(ramo.categorias||[]).map(c=>{
    if(categoriaEximida(ramo,c))return c;
    const objetivo=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
    const puestas=(c.notas||[]).filter(n=>n.valor!==null&&n.valor!==undefined);
    if(puestas.length>=objetivo)return c;
    const faltan=objetivo-puestas.length;
    const relleno=Array.from({length:faltan},(_,i)=>({id:'sim-'+i,nombre:'sim',valor,peso:1}));
    return {...c,notas:[...puestas,...relleno]};
  })};
}

// Devuelve null cuando no hay nada que proyectar: sin ramos, o con todo rendido
// (ahí el promedio ya no es un rango, es un número y se muestra como tal).
function proyeccionSemestre(ramos){
  const lista=(ramos||[]).filter(r=>(r.categorias||[]).length);
  if(!lista.length)return null;
  const pendientes=lista.some(r=>categoriasVigentes(r).some(c=>{
    const objetivo=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
    return (c.notas||[]).filter(n=>n.valor!==null&&n.valor!==undefined).length<objetivo;
  }));
  if(!pendientes)return null;
  const piso=gpa(lista.map(r=>ramoConPendientesEn(r,1.0)));
  const techo=gpa(lista.map(r=>ramoConPendientesEn(r,7.0)));
  if(piso===null||techo===null)return null;
  return {piso,techo,recorrido:techo-piso};
}

// Qué necesita cada ramo en lo que le queda, ordenado por dificultad. Lo que
// pide 6,8 va primero: es donde hay que decidir hoy, no al final del semestre.
// Un ramo sin ninguna nota devuelve el 4,0 genérico de la escala, pero eso no
// describe la situación de esa persona y puede llenar los tres cupos dejando
// fuera un ramo que sí tiene una exigencia calculada desde sus resultados.
function loQueFaltaPorRamo(ramos){
  return (ramos||[]).map(r=>{
    const avg=ramoAvg(r);
    const necesita=notaNecesaria(r);
    return {ramo:r,avg,necesita,abierto:!!reglaDescarteConCantidadAbierta(r)};
  }).filter(x=>x.avg!==null&&x.necesita!==null)
    .sort((a,b)=>b.necesita-a.necesita);
}

// Cuánto sube o baja cada ramo el promedio general: (su nota − el promedio) ×
// lo que pesa. Sale de la misma cuenta que gpa() —por créditos si todos los
// tienen, si no simple— y los aportes suman cero. Ordenado de más a menos.
function aporteAlPromedio(ramos){
  const g=gpa(ramos);if(g===null)return [];
  const conNota=ramosDelPromedio(ramos).map(r=>({ramo:r,avg:ramoAvg(r,undefined,ramos)})).filter(x=>x.avg!==null);
  const porCreditos=gpaMode(ramos)==='creditos'&&conNota.reduce((s,x)=>s+x.ramo.creditos,0)>0;
  const peso=x=>porCreditos?x.ramo.creditos:1;
  const total=conNota.reduce((s,x)=>s+peso(x),0);
  if(!(total>0))return [];
  return conNota.map(x=>({ramo:x.ramo,avg:x.avg,aporte:(x.avg-g)*peso(x)/total})).sort((a,b)=>b.aporte-a.aporte);
}
