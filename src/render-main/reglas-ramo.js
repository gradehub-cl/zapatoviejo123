// La ficha responde qué reglas te afectan hoy. Las frases son deliberadas:
// este es un explicador, no un panel de métricas sin texto (brief de Lucas).
// Solo presentación: estados y promedios vienen del motor existente.
const numeroRegla=n=>String(n).replace('.',',');
function notaEstadoRegla(n){
  if(!Number.isFinite(n))return '—';
  return Math.abs(n-gh_excelRound(n,1))<1e-8?nf(n):fmtPromedioExacto(n);
}
function fuenteReglasRamo(r,def){
  const a=r.pautaSugerida?.aceptada;
  if(Number.isSafeInteger(r.consensoRespaldos)&&r.consensoRespaldos>0)
    return `Reportada por ${r.consensoRespaldos} estudiantes${pautaEditada(r)?' · ponderaciones editadas':''}`;
  if(a&&a.fuente!=='programa')return textoProcedenciaSugerida(a);
  const periodo=periodoDePreset(def);
  return def?(periodo?`Del programa ${periodo}`:'Del catálogo · período no informado'):'De tus ponderaciones';
}
function textoEximicionRegla(e){
  const regla=e.regla,examen=regla.etiqueta||regla.evaluacion||(regla.evaluaciones||[]).join(' y ');
  let condicion=`Te eximes de ${examen} con ${numeroRegla(regla.min)} de presentación`;
  if(Number.isInteger(regla.maxInasistencias))condicion+=` y hasta ${regla.maxInasistencias} faltas`;
  if(Number.isFinite(regla.asistencia))condicion+=` y ${numeroRegla(regla.asistencia)} % de asistencia`;
  if(regla.minimos?.length)condicion+=' y cumpliendo los mínimos de cada grupo';
  let estado=e.activa?'estás eximido':e.puedeConfirmar?'puedes confirmar la eximición en la ficha'
    :e.razon==='examen_rendido'?'se conserva la nota de examen que ingresaste'
    :e.razon==='asistencia'?'falta cumplir o registrar la asistencia'
    :e.pendiente?'faltan notas para comprobarlo':'todavía no cumples todas las condiciones';
  const hoy=Number.isFinite(e.promedio)?`Hoy tienes ${notaEstadoRegla(e.promedio)}: `:'Hoy ';
  return `${condicion}. ${hoy}${estado}.`;
}
function textoBonusRegla(b,r){
  const nombres=ids=>(ids||[]).map(id=>r.categorias.find(c=>c.id===id)?.nombre).filter(Boolean).join(', ');
  if(b.destino==='grupo'){
    const accion=b.operacion==='promediar'?`Promedia un ${nf(b.valor)} con la nota más baja del grupo`
      :'Suma las décimas ganadas a la nota más baja del grupo';
    return `${b.entrada==='confirmacion'?'Si confirmas esta actividad, se '+accion.toLowerCase():accion}${b.etapa==='previa'?' antes de calcular la presentación':''}, con tope ${nf(gh_reglasNota(r.origen?.tenant||S.tenant).grade_scale.max)}.`;
  }
  const destino=b.destino==='final'?'tu nota final':r.categorias.find(c=>c.id===b.destino)?.nombre||'la evaluación';
  const condicion=b.si?` si el promedio de ${nombres(b.si.catIds)} supera ${numeroRegla(b.si.mayorQue)}`:'';
  return b.entrada==='faltas'?`Con hasta ${b.hasta} faltas, sumas ${nf(b.suma)} a ${destino}${condicion}.`
    :`Las décimas que anotes se suman a ${destino}${condicion}${Number.isFinite(b.max)?`, hasta ${b.max} décimas`:''}.`;
}
function modeloReglasRamo(r){
  const def=definicionPresetDelRamo(r),fuente=fuenteReglasRamo(r,def),reglas=[];
  const agregar=(titulo,simple,citas=[],origen=fuente,aviso='')=>reglas.push({titulo,simple,citas,fuente:origen,aviso});
  const ex=estadoEximicion(r);
  if(ex)agregar('Eximición',textoEximicionRegla(ex),typeof ex.regla.ayuda==='string'?[ex.regla.ayuda]:[],ex.regla.origen==='editor'?'De tus ponderaciones':fuente,ex.activa&&Number.isFinite(ex.notaExamen)?`El examen conserva su peso y vale ${nf(ex.notaExamen)}, la mayor nota previa.`:'');
  const activas=gatesActivas(r);
  (r.gates||[]).filter(g=>['min_grade_required','group_min'].includes(g.type)).forEach(g=>{
    const cats=(g.catIds||[g.catId]).map(id=>r.categorias.find(c=>c.id===id)).filter(Boolean);
    if(!cats.length||!Number.isFinite(g.min)||!(g.cap==='self'||Number.isFinite(g.cap)))return;
    const nombre=g.nombre||cats.map(c=>c.nombre).join(' y ');
    const tope=g.cap==='self'?'el promedio de ese grupo':numeroRegla(g.cap);
    const clave=x=>x.nombre||(x.type==='group_min'?'Requisito':r.categorias.find(c=>c.id===x.catId)?.nombre);
    const unica=(r.gates||[]).filter(x=>clave(x)===clave(g)&&x.min===g.min).length===1;
    const activa=unica&&activas.find(a=>a.nombre===clave(g)&&a.min===g.min);
    const efecto=activa?` Hoy el motor aplica este requisito: tope ${notaEstadoRegla(activa.cap)}.`:'';
    agregar(nombre,`Si ${g.type==='group_min'?'el promedio de ':''}${nombre} queda bajo ${numeroRegla(g.min)}${g.exacto?' sin aproximar':''}, la final queda topada en ${tope}.${efecto}`,
      typeof g.ayuda==='string'?[g.ayuda]:[],g.origen==='editor'?'De tus ponderaciones':fuente);
  });
  // Las compuertas implícitas vienen del reglamento. Solo se anuncia su estado
  // devuelto por el motor; no se replica la elección de examen ni su fórmula.
  activas.filter(a=>!(r.gates||[]).some(g=>g.min===a.min&&(g.nombre||r.categorias.find(c=>c.id===g.catId)?.nombre||'Requisito')===a.nombre))
    .forEach(a=>agregar(a.nombre,`Con ${notaEstadoRegla(a.actual)} en ${a.nombre}, el requisito vigente deja un tope de ${notaEstadoRegla(a.cap)}.`,[],'Del reglamento de tu universidad'));
  (r.categorias||[]).filter(c=>c.dropLowest).forEach(c=>{
    const n=c.dropLowest.count,parte=Number.isInteger(n)?`${n} nota${n===1?'':'s'}`:c.dropLowest.fraction?`${numeroRegla(c.dropLowest.fraction*100)} % de las notas`:null;
    if(parte&&(n>0||c.dropLowest.fraction>0))agregar(c.nombre,gh_descarteManual(r,S.tenant)?`${c.nombre}: puedes borrar ${parte}; tú eliges cuáles.`:`${c.nombre}: no cuentan las ${parte} más bajas; siempre queda al menos una.`,[],c.descarteOrigen==='editor'?'De tus ponderaciones':fuente);
  });
  reglasBonusVigentes(r).forEach(b=>agregar(b.pregunta||'Bonus',textoBonusRegla(b,r),b.ayuda?[b.ayuda]:[]));
  reglasCalculadas(r).forEach(s=>agregar('Regla de cálculo',s));
  reglasDelCurso(r).forEach(s=>agregar('Regla del curso',s,[s],fuente,'La app no la aplica automáticamente.'));
  const textosCatalogo=new Set([...reglasDelPreset(r,'noCalcula'),...reglasDelPreset(r,'bonus').map(b=>b.ayuda)]);
  reglasNoCalculadas(r).forEach(s=>agregar('Por revisar',s,textosCatalogo.has(s)?[s]:[],textosCatalogo.has(s)?fuente:'Comprobación de tus ponderaciones','Esta condición no está incluida en el promedio.'));
  const canvas=copiarProgramaCanvas(r.programaCanvas);
  if(canvas){
    const origen=canvas.archivo?`De “${canvas.archivo}” en Canvas`:'Del programa escrito en Canvas';
    canvas.citas.forEach(c=>{
      const tipo=/exim/i.test(c)?'Eximición':/asisten|falta/i.test(c)?'Asistencia':/mínim|minim|tope/i.test(c)?'Mínimo o tope':'Condición del programa';
      agregar(tipo,`${tipo} por revisar: importar el programa no aplica esta condición al promedio.`,[c],origen,'Texto leído de Canvas. Revisa sus condiciones con el curso.');
    });
  }
  return {reglas,eximicion:ex,fuente,canvas};
}
function repartoReglasHTML(r,ex){
  const categorias=(r.categorias||[]).filter(c=>!c.fueraDePauta&&Number.isFinite(c.peso)&&c.peso>0);
  const barra=(nombre,peso)=>barraParalelaEstHTML(esc(nombre),Math.min(1,peso/100),`${numeroRegla(r2(peso))} %`,false,2);
  const fila=c=>{
    const n=Number.isInteger(c.slots)&&c.slots>1?c.slots:0;
    const pesos=n?Array.from({length:n},(_,i)=>Array.isArray(c.pesosCasillas)&&Number(c.pesosCasillas[i])>0?Number(c.pesosCasillas[i]):1):[];
    const suma=pesos.reduce((a,b)=>a+b,0);
    const detalle=n?`<details class="reglas-subpesos"><summary>${n} evaluaciones en ${esc(c.nombre)}${iconoDespliegue(false)}</summary><p>Porcentaje del ramo · reparto de las ponderaciones</p>${pesos.map((p,i)=>barra(etiquetaCasilla(r,c,i),c.peso*p/suma)).join('')}</details>`
      :c.directNota===false?'<small>Cantidad de notas sin declarar: no se inventan subpesos.</small>':'';
    return `<div class="reglas-peso">${barra(c.nombre,c.peso)}${detalle}</div>`;
  };
  const ids=new Set(ex?.regla.segun||[]),presentacion=categorias.filter(c=>ids.has(c.nombre));
  const resto=categorias.filter(c=>!ids.has(c.nombre));
  const grupo=presentacion.length>1?`<div class="reglas-grupo">${barra('Presentación',presentacion.reduce((s,c)=>s+c.peso,0))}<div class="reglas-grupo-hijos">${presentacion.map(fila).join('')}</div></div>`:'';
  const total=categorias.reduce((s,c)=>s+c.peso,0);
  return `<div class="reglas-reparto"><h3>Cómo se reparte <span>${numeroRegla(r2(total))} %</span></h3><p>Peso en la final · escala de 0 a 100 % del ramo.</p>${grupo?grupo+resto.map(fila).join(''):categorias.map(fila).join('')}${ex?.activa?'<p>La eximición se aplica al calcular; aquí se conserva el reparto declarado.</p>':''}</div>`;
}
function reglasRamoHTML(r){
  if(!enAppNativa())return '';
  const modelo=modeloReglasRamo(r);
  if(!modelo.reglas.length)return '';
  const filas=modelo.reglas.map(regla=>`<article class="reglas-fila"><h3>${esc(regla.titulo)}</h3><p class="reglas-simple">${esc(regla.simple)}</p>${regla.aviso?`<small class="reglas-aviso">${esc(regla.aviso)}</small>`:''}
    <details class="reglas-cita"><summary>Lo que dice el programa${iconoDespliegue(false)}</summary>${regla.citas.length?`<p class="reglas-texto-origen">${regla.fuente.includes('Canvas')?'Fragmentos leídos de Canvas; pueden estar recortados.':regla.fuente==='De tus ponderaciones'?'Texto guardado con tus ponderaciones.':'Texto registrado en el catálogo; puede ser un resumen del programa.'}</p>${regla.citas.map(c=>`<blockquote>${esc(c)}</blockquote>`).join('')}`:'<p>No hay una cita textual guardada para esta regla. Comprueba el programa del curso.</p>'}<p class="reglas-fuente">${esc(regla.fuente)}</p></details></article>`).join('');
  const editada=modelo.canvas&&modelo.canvas.pauta!==firmaPautaSugerida(r);
  const fuenteCanvas=modelo.canvas?(modelo.canvas.archivo?`De “${modelo.canvas.archivo}” en Canvas`:'Del programa escrito en Canvas'):null;
  const fuenteFinal=fuenteCanvas?`${modelo.reglas.some(regla=>!regla.fuente.includes('Canvas'))?modelo.fuente+' · ':''}${fuenteCanvas}`:modelo.fuente;
  return `<section class="reglas-ramo" aria-label="Reglas del ramo"><h2>Reglas del ramo</h2><p class="reglas-etiqueta">En simple</p>${filas}${repartoReglasHTML(r,modelo.eximicion)}<footer>${esc(fuenteFinal)}${editada?'<p>Ponderaciones editadas después de importar Canvas. Las citas se conservan como referencia; los pesos son los de tus ponderaciones.</p>':''}</footer></section>`;
}
