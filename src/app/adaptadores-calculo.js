// ─── ADAPTADOR DEL CATÁLOGO PARA EL MOTOR ────────────────────────────────────
// Una eximición no agrega una evaluación ni cambia sus pesos: solo marca que
// una evaluación existente ya no se debe rendir. La regla llega del preset y
// se consulta por `origen`, así también funciona para ramos oficiales que se
// crearon antes de que la regla existiera. Un ramo manual del mismo nombre no
// recibe excepciones del catálogo.
function definicionPresetDelRamo(ramo){
  if(ramo?.pautaSugerida?.aceptada)return null; // El programa nuevo espera confirmación en la ficha.
  const origen=ramo&&ramo.origen;
  if(!origen||!origen.tenant)return null;
  if(origen.tenant!=='uc'){
    const presets=PRESETS_POR_TENANT[origen.tenant];if(!presets)return null;
    const nombre=Object.keys(presets).find(n=>normName(n)===normName(ramo.nombre));
    return nombre?presets[nombre]:null;
  }
  if(origen.tenant!=='uc'||!presetUcDisponible(ramo.nombre,origen.carrera))return null;
  const nombre=claveUc(ramo.nombre);
  return nombre?PRESETS_UC[nombre]:null;
}
// singularHuella() agrupa reportes y puede dejar palabras feas; acá el nombre
// se muestra al estudiante. Solo flexionamos vocabulario conocido y dejamos
// intacto lo ambiguo. `slotLabel` sigue siendo la salida para nombres propios.
const SINGULARES_CASILLA={controles:'control',pruebas:'prueba',interrogaciones:'interrogación',
  tareas:'tarea',talleres:'taller',informes:'informe',laboratorios:'laboratorio',
  evaluaciones:'evaluación',solemnes:'solemne',trabajos:'trabajo',
  presentaciones:'presentación',exámenes:'examen',casos:'caso',ensayos:'ensayo',
  actividades:'actividad',quizzes:'quiz',quices:'quiz',tests:'test',entregas:'entrega',
  lecturas:'lectura',proyectos:'proyecto',guías:'guía',ayudantías:'ayudantía',
  cuestionarios:'cuestionario',exposiciones:'exposición',certámenes:'certamen',
  avances:'avance',hitos:'hito',reportes:'reporte',
  // Como primera palabra "Prácticas" es el sustantivo; como segunda
  // ("Controles prácticos") la resuelve ADJETIVOS_CASILLA.
  prácticas:'práctica',
  // Sin tilde, como se escribe muchas veces a mano.
  examenes:'examen',guias:'guia',ayudantias:'ayudantia',certamenes:'certamen',practicas:'practica'};
const ADJETIVOS_CASILLA={prácticos:'práctico',prácticas:'práctica',teóricos:'teórico',
  teóricas:'teórica',escritos:'escrito',escritas:'escrita',cortos:'corto',cortas:'corta',
  finales:'final',parciales:'parcial',orales:'oral',grupales:'grupal',
  individuales:'individual',semanales:'semanal'};
function singularEtiquetaCasilla(nombre){
  const palabras=String(nombre||'').trim().split(/\s+/);
  const primero=palabras[0],base=SINGULARES_CASILLA[primero.toLowerCase()];
  if(!base||palabras.some(p=>p.toLowerCase()==='y'))return nombre;
  const de=palabras.findIndex(p=>p.toLowerCase()==='de');
  const hasta=de<0?palabras.length:de;
  for(let i=1;i<hasta;i++){
    const p=palabras[i],adjetivo=ADJETIVOS_CASILLA[p.toLowerCase()];
    if(adjetivo)palabras[i]=p===p.toUpperCase()?adjetivo.toUpperCase():
      p[0]===p[0].toUpperCase()?adjetivo[0].toUpperCase()+adjetivo.slice(1):adjetivo;
    else if(/s$/i.test(p))return nombre; // no crear "Trabajo desconocidos"
  }
  palabras[0]=primero===primero.toUpperCase()?base.toUpperCase():
    primero[0]===primero[0].toUpperCase()?base[0].toUpperCase()+base.slice(1):base;
  return palabras.join(' ');
}
// El nombre colectivo de una categoría no siempre es el de cada entrega.
// Ejemplo oficial: el Lab de Dinámica tiene la categoría "Informes", pero sus
// casillas son Informe 0 a Informe 5 porque también existe el Lab 0 online.
// Se consulta el preset como respaldo para que los ramos ya creados antes de
// este campo se dibujen bien sin reescribir sus notas ni forzar una sync.
function detalleCasillas(ramo,cat){
  const def=definicionPresetDelRamo(ramo);
  const evals=Array.isArray(def)?def:(def&&def.evals||[]);
  const extra=(evals.find(([nombre])=>normName(nombre)===normName(cat&&cat.nombre))||[])[2]||{};
  return {
    nombre:typeof cat?.slotLabel==='string'?cat.slotLabel:(typeof extra.slotLabel==='string'?extra.slotLabel:singularEtiquetaCasilla(cat.nombre)),
    inicio:Number.isInteger(cat?.slotStart)?cat.slotStart:(Number.isInteger(extra.slotStart)?extra.slotStart:1),
    // Cuando cada casilla es una cosa distinta y no la N-ésima de lo mismo:
    // "Trabajos de IA" tiene Cápsulas y Talleres, no "Trabajo 1" y "Trabajo 2".
    nombres:Array.isArray(cat?.nombresCasillas)?cat.nombresCasillas:(Array.isArray(extra.nombresCasillas)?extra.nombresCasillas:[]),
  };
}
function etiquetaCasilla(ramo,cat,slot){
  const detalle=detalleCasillas(ramo,cat);
  const propio=detalle.nombres[slot];
  return typeof propio==='string'&&propio.trim()?propio:`${detalle.nombre} ${detalle.inicio+slot}`;
}
// Una nota antigua puede guardar el nombre colectivo ("Controles 1") o el de
// la evaluación de la que vino ("Talleres de Inteligencia Artificial"). Se ve
// con el nombre de su casilla sin reescribirla; si la persona la renombró, su
// nombre manda.
function nombreNotaCasilla(ramo,cat,nota){
  if(!nota||!Number.isInteger(nota.slot)||!(cat&&cat.slots>1))return nota&&nota.nombre||'';
  const inicio=detalleCasillas(ramo,cat).inicio;
  const anteriores=(cat.nombresAnteriores||[]).filter(x=>x&&typeof x==='object'&&x.slot===nota.slot).map(x=>x.nombre);
  return [`${cat.nombre} ${inicio+nota.slot}`,...anteriores].some(n=>normName(n)===normName(nota.nombre))
    ?etiquetaCasilla(ramo,cat,nota.slot):nota.nombre;
}
// Para dibujar una casilla, manda el nombre que su dueño ya guardó, incluso
// antes de ponerle una nota. La etiqueta derivada queda solo como respaldo.
// No se usa al recuperar slots antiguos: ahí el nombre automático es la pauta.
function nombreCasilla(ramo,cat,slot){
  const nota=(Array.isArray(cat.notas)?cat.notas:[]).find(n=>n&&n.slot===slot);
  return (nota&&nombreNotaCasilla(ramo,cat,nota))||etiquetaCasilla(ramo,cat,slot);
}
// El navegador entrega las dependencias que el motor no puede conocer por sí
// mismo (estado actual y catálogo). La misma fábrica queda importable desde
// una Pages Function, sin duplicar el cálculo académico en el agente.
const calculoRamo=gh_crearCalculoRamo({
  normName,
  copiarRecuperativo,
  definicionPresetDelRamo,
  ramos:()=>S.ramos,
  tenant:()=>S.tenant,
});
var {reglasCalculoVigentes,reglasBonusVigentes,reglasAusenciaOficiales,hojasCategoria,ramoToStructure,gradesOf,avgPond,promedioCompletoSinDescarte,notaNecesariaEximicion,estadoEximicion,categoriaEximida,categoriasVigentes,estadoSegundaFecha,estadoAusenciasJustificadas,avgDeGrupo,avgDeGrupoCalculado,calculoRamoConCompuertas,ramoCompletamenteEvaluado,estadoRecuperativo,resumenCategoriasCalculadas,ramoAvg,referenciaRamoVinculado,ramoVinculado,combinarConRamoVinculado,partesDelVinculo,gatesActivas,estadoParaNotaNecesaria,notaNecesaria}=calculoRamo;
// Una compuerta es una excepción explícita al promedio: puede reprobar aunque
// la nota final redondeada llegue a 4,0. Estos helpers mantienen esa excepción
// visible sin contaminar el redondeo normal de todos los demás ramos.
// Una misma explicación de la compuerta en la ficha y en el panel del profesor.
function textoCompuertaActiva(g){
  if(!g)return '';
  return g.grupo
    ? `${g.nombre} va ${fmtPromedio(g.actual)} (mín. ${nf(g.min)}): ${g.efecto==='reemplazar'?'la nota final queda en '+fmtPromedio(g.cap):'topa tu nota final'}`
    : `${g.nombre} bajo ${nf(g.min)}: repruebas pese al promedio`;
}
// Con laboratorio, cada parte tiene que llegar a 4,0 por separado: si una baja,
// la final pasa a ser la más baja de las dos. Por eso una cátedra al borde deja
// el ramo al borde aunque el laboratorio suba el promedio combinado.
const RANGO_NIVEL={bad:0,warn:1,good:2,neutral:3};
function nivelRamo(r,n){
  if(gatesActivas(r).length)return 'bad';
  const nivel=nivelNota(n),partes=r&&r.aporta?partesDelVinculo(r):null;
  if(nivel!=='good'||!partes||partes.propio.valor===null||partes.externo.valor===null)return nivel;
  return [nivel,nivelNota(partes.propio.valor),nivelNota(partes.externo.valor)].reduce((a,b)=>RANGO_NIVEL[b]<RANGO_NIVEL[a]?b:a);
}
function notaAprobadaRamo(r,n){const nivel=nivelRamo(r,n);return nivel==='warn'||nivel==='good';}
function colorClassRamo(r,n){return nivelRamo(r,n);}
// El color sigue al nivel: un 5,0 combinado con la cátedra al borde no se pinta verde.
function getColorRamo(r,n){
  if(gatesActivas(r).length)return getColor(3.9);
  return nivelRamo(r,n)==='warn'&&nivelNota(n)==='good'?getColor(4.9):getColor(n);
}

// ─── CÁTEDRA Y LABORATORIO ───────────────────────────────────────────────────
// Dinámica se aprueba solo si la cátedra Y el laboratorio llegan cada uno a
// 4,0, pero la ficha mostraba un único número combinado: quien iba bien en el
// lab no podía ver si la cátedra sola lo estaba dejando abajo. La ficha y el
// simulador muestran la cátedra sola al lado del promedio, y lo que falta para
// aprobar habla de la cátedra (`notaNecesariaParaAprobar`).
//
// Solo aparece cuando el laboratorio tiene notas: antes de eso el promedio de
// siempre YA es solo la cátedra, y repetir el mismo número confundiría.
// `fmt` decide la coma decimal: el simulador la usa y la ficha no. `exacto`
// agrega el promedio sin redondear, como el número grande al tocarlo.
function htmlSoloCatedra(r,{fmt=x=>x,exacto=null}={}){
  const partes=partesDelVinculo(r);
  if(!partes||partes.propio.valor===null||partes.externo.valor===null)return '';
  const v=partes.propio.valor;
  return `<span class="solo-parte-num" style="color:${getColorRamo(r,v)}">${fmt(fmtPromedio(v))}</span>`+
    `<span class="solo-parte-label">Solo cátedra${exacto?` · ${exacto(v)}`:''}</span>`;
}
// Lo que falta para aprobar. En un ramo con laboratorio habla solo de la
// cátedra: el lab tiene su propia ficha y su propio "cuánto me falta".
function notaNecesariaParaAprobar(r){
  const partes=partesDelVinculo(r);
  return partes?{valor:partes.propio.necesaria,cual:' cátedra'}:{valor:notaNecesaria(r),cual:''};
}
// Donde el descarte es manual, la app solo avisa cuántas notas permite borrar la
// pauta. Un porcentaje depende de cuántas se rindieron: se traduce a notas con
// el redondeo de la universidad, y nunca a todas las rendidas.
function textoNotasBorrables(r,cat){
  const d=cat&&cat.dropLowest;
  if(!d||!gh_descarteManual(r,S.tenant))return '';
  if(typeof d.fraction==='number'){
    const base=`Según la pauta, se puede borrar el ${Math.round(d.fraction*100)}% de las notas`;
    const rendidas=(cat.notas||[]).filter(n=>typeof n.valor==='number').length;
    const redondear=gh_reglasNota(r&&r.origen&&r.origen.tenant||S.tenant).descarte_redondeo==='arriba'?Math.ceil:Math.floor;
    const k=Math.min(redondear(Math.round(d.fraction*rendidas*1e6)/1e6),rendidas-1);
    return k>=1?`${base}. Con ${rendidas} rendidas, puedes borrar ${k}`:base;
  }
  const n=Math.floor(Number(d.count))||0;
  if(n<1)return '';
  return `Según la pauta, ${n===1?'se puede borrar 1 nota':`se pueden borrar ${n} notas`}`;
}
// Los descartes vienen del motor, pero se explican en la evaluación donde
// ocurren. La nota sigue visible: solo no participa en ese promedio.
function textoDescarte(cat,descarte){
  const notas=descarte.dropped||[];
  const cantidad=notas.length;
  const propia=cat.descarteOrigen==='editor';
  const lista=notas.map(n=>`${n.name} (${propia?fmt(n.value).replace('.',','):fmt(n.value)})`).join(', ');
  const regla=cat.dropLowest||{};
  let redondeo='';
  if(typeof regla.fraction==='number'){
    const porcentaje=Math.round(regla.fraction*100);
    redondeo=` Con ${descarte.rendidas} evaluaciones rendidas, el ${porcentaje}% equivale a ${cantidad} ${cantidad===1?'nota':'notas'}: se redondea hacia abajo.`;
  }
  return `${propia?'Tu pauta':'El programa'} descarta ${cantidad===1?'la nota más baja':'las notas más bajas'} de esta evaluación. ${lista} ${cantidad===1?'no cuenta':'no cuentan'} en este promedio.${redondeo}`;
}

// Promedio general. En Chile el PPA se pondera por créditos (SCT), no es simple.
// Si TODOS los ramos con nota tienen créditos → ponderado. Si no → simple.
// Mezclar ambos daría un número engañoso, así que se prefiere lo predecible.
// Un ramo que APORTA a otro no entra por su cuenta al promedio general: su
// nota ya está adentro de la del ramo al que aporta. El Laboratorio de
// Dinámica contaba dos veces —una dentro de Dinámica y otra como ramo suelto—,
// y encima sus 0 SCT hacían caer el PPA a promedio simple, así que un curso de
// cero créditos terminaba pesando igual que uno de diez. Nada de eso falla:
// solo entrega un promedio más alto o más bajo del real.
function esAporteDeOtroRamo(r,ramos){
  if(!r)return false;
  return (ramos||[]).some(x=>x!==r&&ramoVinculado(x,ramos)===r);
}
function ramosDelPromedio(ramos){
  return (ramos||[]).filter(r=>!esAporteDeOtroRamo(r,ramos)&&
    !gh_reglasNota(r.origen?.tenant||r.cierre?.tenant||S.tenant).promedioAcademico?.exclusiones.includes(r.exclusionPromedio));
}
// ¿Sabemos cuántos créditos vale este ramo?
//
// 0 SCT es un dato conocido y exacto, no un faltante: en Ingeniería UC valen 0
// los tres laboratorios de Física y Práctica I. Preguntar por `> 0` los trataba
// como "no tenemos el dato", y con eso UN laboratorio bastaba para tumbar el
// promedio ponderado de todo el semestre a promedio simple — justo lo que la
// tabla de créditos existe para evitar.
function tieneCreditos(r){return typeof r.creditos==='number'&&r.creditos>=0;}

function gpaMode(ramos){
  const conNota=ramosDelPromedio(ramos).filter(r=>notaRamoParaResumen(r,ramos)!==null);
  if(conNota.length===0)return 'empty';
  return conNota.every(tieneCreditos)?'creditos':'simple';
}
function gpa(ramos){
  const conNota=ramosDelPromedio(ramos).filter(r=>notaRamoParaResumen(r,ramos)!==null);
  if(conNota.length===0)return null;
  // `map` pasa (elemento, índice, array), así que `conNota.map(ramoAvg)` metía
  // el índice en el segundo parámetro de `ramoAvg(r,visitados)`. Del segundo
  // ramo en adelante `visitados` valía un número y `vistos.has(...)` reventaba,
  // tumbando el render entero. La lambda pasa un solo argumento a propósito.
  const simple=()=>{const a=conNota.map(r=>notaRamoParaResumen(r,ramos));return a.reduce((x,y)=>x+y,0)/a.length;};
  if(gpaMode(ramos)==='creditos'){
    let num=0,den=0;
    conNota.forEach(r=>{const a=notaRamoParaResumen(r,ramos);num+=a*r.creditos;den+=r.creditos;});
    // Todo lo rendido vale 0 SCT (un semestre de puros laboratorios): no hay con
    // qué ponderar, pero el estudiante igual tiene notas y merece ver su
    // promedio. Antes devolvía null y la pantalla quedaba sin número.
    return den>0?num/den:simple();
  }
  return simple();
}
// El promedio del semestre no es la nota final oficial de un ramo. Se muestra
// a centésimas, desde el valor bruto de gpa, sin un redondeo intermedio.
// El promedio general va con UN decimal en toda la app, como lo muestran las
// universidades (Lucas, 2026-11-11: 5,42 se ve 5,4). Tocar el promedio en
// Inicio muestra el valor exacto. Las diferencias (deltas y aportes) usan
// fmtDiferenciaPromedio, con dos decimales: con uno, un +0,04 se vería +0,0.
function fmtPromedioGeneral(valor){
  if(!Number.isFinite(valor))return '—';
  return gh_excelRound(valor+1e-9,1).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1,useGrouping:false});
}
function fmtDiferenciaPromedio(valor){
  if(!Number.isFinite(valor))return '—';
  return gh_excelRound(valor+1e-9,2).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:false});
}
// Total de créditos inscritos (solo cuenta los que tienen el dato)
function totalCreditos(ramos){
  return ramos.reduce((s,r)=>s+(tieneCreditos(r)?r.creditos:0),0);
}
// La precisión del PPA depende de que cada ramo ya evaluado tenga SCT. Esto
// solo identifica los datos pendientes para guiar al estudiante: no cambia
// cómo gpa() calcula ni interpreta el promedio.
function ramosSinCreditosParaPpa(ramos){
  return ramosDelPromedio(ramos).filter(r=>ramoAvg(r)!==null&&!tieneCreditos(r));
}
// El modo simple no es un error: es la respuesta honesta mientras falta un SCT
// oficial. Esta función solo lo explica; nunca cambia gpa(), créditos ni ramos.
function descripcionMetodoGpa(ramos){
  const modo=gpaMode(ramos);
  if(modo==='creditos')return{modo,texto:'Promedio ponderado por créditos.'};
  if(modo!=='simple')return null;
  const sinCreditos=ramosSinCreditosParaPpa(ramos);
  const primero=sinCreditos[0];
  if(!primero)return{modo,texto:'Promedio simple.'};
  const uno=sinCreditos.length===1;
  const faltante=uno
    ?`falta el crédito de ${primero.nombre}`
    :`faltan los créditos de ${primero.nombre} y ${sinCreditos.length-1} más`;
  // No hay que esperar a que lleguen: se ponen a mano en Editar ramo (lo pidió
  // un estudiante de la UAndes el 2026-10-06, donde los ramos de carrera no
  // traen créditos). Sigue siendo una frase, no una alarma.
  return{modo,texto:`Promedio simple porque ${faltante}. Si ${uno?'lo':'los'} pones en Editar ramo, se calcula ponderado por créditos.`};
}
function semester(){
  const now=new Date(),m=now.getMonth(),y=now.getFullYear();
  // Ene-Feb = cierre del semestre anterior → año-1 S2
  if(m<=1)return`${y-1}-2`;
  if(m<=6)return`${y}-1`;
  return`${y}-2`;
}
// Una frase por día, no una distinta en cada render: Inicio se vuelve a dibujar
// al agregar notas y una frase que cambia en ese momento se siente aleatoria.
// Ninguna presupone que al estudiante le está yendo bien; acompaña sin mentirle.
const FRASES_INICIO=[
  'Una nota a la vez',
  'Veamos cómo va el semestre',
  'Mantengamos las notas al día',
  'Así va tu semestre',
  'Revisemos qué viene',
  'Sigamos con lo que toca',
  'Todo listo para seguir',
  'Un paso a la vez',
  'Veamos qué sigue',
  'Veamos dónde estamos'
];
function fraseInicio(fecha=new Date()){
  const dia=Math.floor(Date.UTC(fecha.getFullYear(),fecha.getMonth(),fecha.getDate())/86400000);
  return FRASES_INICIO[((dia%FRASES_INICIO.length)+FRASES_INICIO.length)%FRASES_INICIO.length];
}

// La ficha no llama final a una cátedra que todavía no incluye su laboratorio.
function contextoVinculoRamo(r){
  const link=referenciaRamoVinculado(r),partes=partesDelVinculo(r);
  if(!link?.sigla||!partes)return null;
  if(!partes.externo.ramo)return {link,soloCatedra:true,falta:true,html:`Tu nota final incluye un ${r2(link.peso)}% del ${esc(link.ramo)}. Agrégalo para verla completa`};
  if(partes.externo.valor===null)return {link,soloCatedra:true,falta:false,html:`Agrega notas en ${esc(link.ramo)} para ver la nota combinada. Por ahora, solo cátedra`};
  const propia=partes.propio.valor,externa=partes.externo.valor;
  const estado=(v)=>v===null?'sin notas':notaFinalOficial(v)<partes.min?'bajo el mínimo':'cumple el mínimo';
  return {link,soloCatedra:false,falta:false,html:`Cátedra ${fmtPromedio(propia)} (${estado(propia)}) · Laboratorio ${fmtPromedio(externa)} (${estado(externa)}). Cada ficha conserva su propia nota`};
}
function agregarLaboratorioVinculado(){
  const r=S.ramos.find(x=>x.id===currentRamoId),info=contextoVinculoRamo(r);
  if(!info?.falta)return;
  crearRamoDesdeCatalogo(info.link.ramo,info.link.sigla);save();renderRamo();showToast('Laboratorio agregado');
}
