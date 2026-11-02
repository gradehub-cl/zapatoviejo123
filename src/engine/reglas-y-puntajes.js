// ─── MOTOR GRADE HUB (verificado) ───────────────────────────────────────────
// Núcleo de cálculo unificado. Soporta árbol arbitrario + reglas:
// weighted_average · gated_average (ambos hijos ≥ mín) · min_grade_required (piso por hoja).
// FENnotas lo alimenta vía ramoToStructure() (adaptador del modelo categorias→notas).
function gh_excelRound(value,decimals){const f=Math.pow(10,decimals);return Math.sign(value)*Math.round(Math.abs(value)*f)/f;}
// Un requisito mínimo se mide igual que la nota final: redondeado a la décima.
// En la UC un 3,95 es 4,0 también para "promedio de pruebas ≥ 4,0", no solo
// para aprobar el ramo. El 1e-9 evita que un 3,95 exacto, que el punto flotante
// puede guardar como 3,9499999…, se redondee hacia abajo.
function gh_cumpleMinimo(valor,min){return gh_excelRound(valor+1e-9,1)>=min;}
// Una compuerta puede exigir el mínimo SIN aproximación (`exacto:true`): ahí
// 2,96 no es 3,0. Es el art. 27 del reglamento UAndes para dar examen. El 1e-9
// solo absorbe el punto flotante de un 3,0 exacto, no redondea.
function gh_cumpleCompuerta(valor,g){return g&&g.exacto===true?valor+1e-9>=g.min:gh_cumpleMinimo(valor,g.min);}
// La nota oficial que ve la persona: redondeada a la décima con margen de punto
// flotante. Un final de exactamente 3,95 puede llegar como 3,9499999999999993
// (pasa con los pesos 10/10/23/23/34) y sin el margen se leía 3,9 —reprobado—.
// `gh_roundFinal` queda sin margen porque el buscador de la nota necesaria
// depende de su borde exacto.
//
// Una universidad puede redondear en dos pasos (`rounding.previo`): primero a
// esos decimales y después a `decimals`. Ver GH_REGLAS_NOTA_POR_TENANT.
function gh_redondearNota(value,meta,margen){
  const r=meta?.rounding||{},d=r.decimals??1;
  const previo=Number.isInteger(r.previo)&&r.previo>d?gh_excelRound(value+margen,r.previo):value;
  return gh_excelRound(previo+margen,d);
}
function gh_notaOficial(value,meta){if(value===null)return null;return gh_redondearNota(value,meta,1e-9);}
function gh_roundFinal(value,meta){if(value===null)return null;return gh_redondearNota(value,meta,0);}
// Lo más bajo que todavía da `target` como nota oficial. A la décima, 4,0 se
// alcanza desde 3,95; con el paso previo a la centésima, desde 3,945
// (3,945 → 3,95 → 4,0).
function gh_bordeOficial(target,meta){
  const r=meta?.rounding||{},d=r.decimals??1;
  const previo=Number.isInteger(r.previo)&&r.previo>d?0.5/Math.pow(10,r.previo):0;
  return target-0.5/Math.pow(10,d)-previo;
}

// ─── REGLAS DE NOTA POR UNIVERSIDAD ─────────────────────────────────────────
// Un solo motor, y cada universidad declara cómo su promedio se vuelve nota
// oficial. Sin entrada rige la regla común: escala 1 a 7, se aprueba con 4,0 y
// se redondea a la décima. Una entrada solo trae lo que cambia, y cada regla
// lleva el artículo del que sale: no se agrega una por parecido.
//
// Vive en el motor y no en data.js porque el servidor MCP calcula con este
// archivo solo. Si viviera afuera, el agente redondearía distinto que la app.
const GH_REGLAS_NOTA_BASE={grade_scale:{min:1,max:7},rounding:{decimals:1},passing_grade:4.0};
const GH_REGLAS_NOTA_POR_TENANT={
  // Reglamento del Alumno de Pregrado UAndes (2022, vigente con la
  // modificación de marzo de 2026), art. 22: "La nota final de la asignatura
  // se expresa con un decimal. Para su cálculo se aproximan dos decimales."
  // Un 3,946 pasa a 3,95 y queda en 4,0: aprueba. Con la regla común sería 3,9.
  uandes:{rounding:{decimals:1,previo:2}},
  // UDD, DR50/26 (marzo 2026), arts. 36 y 37: examen mínimo 3,0;
  // si no se cumple, la final ES la nota del examen. Respaldo para pautas
  // manuales sin compuerta, solo con una evaluación final inequívoca.
  udd:{examenFinal:{nombres:['examen','examen final','evaluacion final'],min:3}},
};
function gh_reglasNota(tenant){
  const propia=Object.prototype.hasOwnProperty.call(GH_REGLAS_NOTA_POR_TENANT,tenant)?GH_REGLAS_NOTA_POR_TENANT[tenant]:{};
  return {grade_scale:{...GH_REGLAS_NOTA_BASE.grade_scale,...propia.grade_scale},
    rounding:{...GH_REGLAS_NOTA_BASE.rounding,...propia.rounding},
    passing_grade:propia.passing_grade??GH_REGLAS_NOTA_BASE.passing_grade,
    ...(propia.examenFinal?{examenFinal:propia.examenFinal}:{})};
}

// ─── PUNTAJE → NOTA ─────────────────────────────────────────────────────────
// La escala lineal con exigencia de las pruebas chilenas: el puntaje de
// aprobación (exigencia × total) vale la nota de aprobación, y de ahí salen dos
// rectas, una hasta la mínima en 0 puntos y otra hasta la máxima en el total.
// Con 50% de exigencia, 25 de 50 es un 4,0; con 60%, hacen falta 30.
// La usa la calculadora pública (calculadora.html) y la usará el ingreso de
// notas de la app: una sola fórmula para las dos. Devuelve null si los datos
// no forman una escala, para que nadie muestre una nota inventada.
// Filas de la tabla puntaje → nota, con el incremento que elige la persona (de
// a 1 o de a 0,5 punto, u otro). Solo si dejaría más de 2.000 filas se agranda
// al paso más chico que quepa, para no trabar el teléfono con una prueba de
// 10.000 puntos; `ajustado` lo dice. El total va siempre al final, aunque el
// paso no caiga justo. Cada fila se calcula como i·paso para que 0,1 + 0,2 no
// acumule error.
function gh_tablaPuntaje(total,pedido){
  const max=2000;
  let paso=Number(pedido)>0?Number(pedido):1,ajustado=false;
  if(!(total>0))return {paso,ajustado,filas:[]};
  if(total/paso>max){
    ajustado=true;
    paso=[1,2,5,10,20,25,50,100,250,500,1000,2500,5000,10000].find(x=>x>=paso&&total/x<=max)||Math.ceil(total/max);
  }
  const filas=[];
  for(let i=0;;i++){const x=Math.round(i*paso*100)/100;if(x>=total-1e-9)break;filas.push(x);}
  filas.push(total);
  return {paso,ajustado,filas};
}
function gh_notaDesdePuntaje(puntaje,total,o={}){
  const exigencia=o.exigencia??0.5,nmin=o.nmin??1,naprob=o.naprob??4,nmax=o.nmax??7;
  if(![puntaje,total,exigencia,nmin,naprob,nmax].every(Number.isFinite))return null;
  if(total<=0||puntaje<0||puntaje>total||exigencia<=0||exigencia>=1||!(nmin<naprob&&naprob<nmax))return null;
  const corte=exigencia*total;
  const cruda=puntaje<corte?nmin+(naprob-nmin)*puntaje/corte:naprob+(nmax-naprob)*(puntaje-corte)/(total-corte);
  // El 1e-9 es el mismo margen de gh_notaOficial: un 3,95 o un 4,0 exactos no
  // pueden caer a 3,9 por cómo el punto flotante guarda el número.
  const nota=o.truncar?Math.floor((cruda+1e-9)*10)/10:gh_excelRound(cruda+1e-9,1);
  return {nota,cruda,puntajeAprobacion:corte};
}
