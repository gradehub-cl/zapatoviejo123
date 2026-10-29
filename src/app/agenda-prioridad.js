
// ─── PRIORIDAD DE EVALUACIONES ───────────────────────────────────────────────
// La lista no ordena solo por fecha: pondera urgencia × peso × riesgo del ramo.
// Un examen de 40% en 5 días importa más que un control de 5% mañana.

function diasHasta(iso){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const d=new Date(iso+'T00:00:00');
  return Math.round((d-hoy)/86400000);
}

// Cuánto necesita el estudiante en lo que le queda para aprobar el ramo (o null)
function reglaDescarteConCantidadAbierta(ramo){
  return (ramo.categorias||[]).find(c=>c.dropLowest&&!Number.isInteger(c.slots))||null;
}
// Convierte una nota recién ingresada en una consecuencia académica concreta.
// El cálculo habla solo de lo que queda pendiente y respeta compuertas activas.
function lecturaDespuesDeNota(ramo){
  const avg=ramoAvg(ramo);
  if(avg===null)return 'Nota guardada';
  const gate=gatesActivas(ramo)[0];
  if(gate)return `${gate.nombre} quedó en ${fmtPromedio(gate.actual)} · nota topada en ${fmtPromedio(gate.cap)}`;
  const descarteAbierto=reglaDescarteConCantidadAbierta(ramo);
  if(descarteAbierto)return `Vas ${fmtPromedio(avg)} · la nota mínima depende de los próximos ${descarteAbierto.nombre.toLowerCase()}`;
  const necesita=notaNecesaria(ramo);
  if(necesita===null)return `Vas ${fmtPromedio(avg)} · ramo completamente evaluado`;
  if(necesita>7.05)return `Vas ${fmtPromedio(avg)} · ya no alcanza sólo con lo pendiente`;
  if(notaNecesariaCondicional(ramo))return `Vas ${fmtPromedio(avg)} · con ${nfNecesaria(necesita)} en cada evaluación pendiente llegas al 4,0`;
  if(necesita<=1.0)return `Vas ${fmtPromedio(avg)} · tienes margen para aprobar`;
  if(nivelNota(avg)==='good'&&necesita<=4.0)return `Vas ${fmtPromedio(avg)} · buen margen en lo pendiente`;
  return `Vas ${fmtPromedio(avg)} · necesitas ${nfNecesaria(necesita)} en lo pendiente para aprobar`;
}

// Hasta dónde llega "ahora". Un mes es lo que alguien alcanza a preparar y
// reorganizar; más allá, saber que un ramo va mal no cambia qué haces hoy.
const HORIZONTE_FOCO=30;

// Seis semanas cubren una demora académica larga sin convertir el resto del
// semestre en una espera silenciosa. Después de 42 días, la Agenda no asume
// que se rindió: pide revisar si falta la nota o si la fecha quedó obsoleta.
const DIAS_PARA_REVISAR_FECHA=42;

// La fecha describe cuándo estaba agendada una evaluación, no demuestra que se
// haya rendido. Una fecha pasada sin nota sigue pendiente para los cálculos,
// pero en la Agenda es otra clase de pendiente: espera confirmación o la nota,
// no compite con lo que todavía se puede estudiar.
function estadoEventoAgenda(e,dias){
  if(!e.pending)return 'con_nota';
  const d=Number.isFinite(dias)?dias:diasHasta(e.fecha);
  if(d<-DIAS_PARA_REVISAR_FECHA)return 'requiere_revision';
  return d<0?'esperando_nota':'por_venir';
}

function withPriority(e){
  const dias=diasHasta(e.fecha);
  const peso=pesoEventoAgenda(e)||0;
  const avg=ramoAvg(e.ramo);
  const necesita=notaNecesaria(e.ramo);
  const estadoAgenda=estadoEventoAgenda(e,dias);

  // Una fecha pasada sin nota no desaparece, pero tampoco puede ser "Tu foco
  // ahora": la nota suele llegar días después y la prueba puede haberse movido.
  // Todo evento por venir queda por encima, incluso si pesa poco o está lejos.
  if(estadoAgenda==='esperando_nota'||estadoAgenda==='requiere_revision'){
    const nivel=estadoAgenda==='requiere_revision'?'revision':'espera';
    return {...e,dias,score:-1000+dias,nivel,estadoAgenda,avg,necesita};
  }

  // Urgencia: decae de forma CONTINUA, con vida media de tres semanas.
  //
  // Antes eran tramos, y el último —"más de 30 días"— metía en la misma bolsa
  // algo a cinco semanas y algo a cuatro meses. Ahí el tiempo dejaba de existir
  // y entre dos evaluaciones lejanas solo competía el peso: un examen de 30% en
  // diciembre le ganaba a una interrogación de 15% en septiembre.
  const urgencia=100*Math.pow(2,-dias/21);

  // Un ramo que ya no se puede aprobar no compite por "Tu foco ahora"
  // (Lucas, 2026-10-20): su riesgo no suma y su puntaje baja. Sigue en la
  // Agenda, pero el tiempo se va primero a lo que todavía se puede salvar.
  const imposible=necesita!==null&&necesita>7.05;
  // Riesgo: si el ramo va mal, sus evaluaciones suben de prioridad
  let riesgo=0;
  if(avg!==null){
    if(!notaAprobadaRamo(e.ramo,avg))riesgo=45;
    else if(nivelRamo(e.ramo,avg)==='warn')riesgo=20;
  }
  // Si necesita una nota alta en lo que queda, es una alerta real
  if(necesita!==null){
    if(necesita>6.0)riesgo+=30;
    else if(necesita>5.0)riesgo+=15;
  }

  // El riesgo del ramo reordena, pero solo dentro del horizonte que uno puede
  // preparar: avisar de un examen a cuatro meses porque el ramo va mal es
  // volver a poner algo lejano en el lugar de "ahora".
  const riesgoAplicado=(!imposible&&dias>=0&&dias<=HORIZONTE_FOCO)?riesgo:0;

  // Los tres factores se MULTIPLICAN, no se suman, y ese es el arreglo de
  // fondo. Sumando, `peso*1.2` valía 36 puntos fijos para un 30%: como la
  // urgencia tiende a cero con el tiempo, el peso terminaba ganando siempre si
  // la evaluación estaba lo bastante lejos. Multiplicando, la cercanía manda y
  // el peso y el riesgo modulan: un 30% pesa un 30% más que un 0%, esté donde
  // esté, pero nunca convierte diciembre en "ahora".
  const score=urgencia*(1+peso/100)*(1+riesgoAplicado/100)*(imposible?0.25:1);

  // Nivel legible para el color de la barra. Va por DÍAS y no por el valor de
  // `urgencia`: los cortes viejos (85, 35) eran los escalones de la escala
  // anterior, y con la curva continua "urgencia>=85" pasó de significar dos
  // días a significar cinco sin que nadie lo decidiera. Los umbrales en días
  // son los mismos de antes, ahora escritos como lo que siempre fueron.
  let nivel='baja';
  if(dias<=2&&peso>=20)nivel='critica';
  else if(riesgo>=45||dias<=2)nivel='alta';
  else if(dias<=14||peso>=30)nivel='media';

  return {...e,dias,score,nivel,estadoAgenda,avg,necesita};
}

function cuandoTexto(dias){
  if(dias<0)return dias===-1?'Ayer':`Hace ${Math.abs(dias)} días`;
  if(dias===0)return 'Hoy';
  if(dias===1)return 'Mañana';
  if(dias<=7)return `En ${dias} días`;
  if(dias<=13)return `En ${dias} días`;
  if(dias<=30){const sem=Math.round(dias/7);return `En ${sem} semana${sem!==1?'s':''}`;}
  const m=Math.round(dias/30);return `En ${m} mes${m!==1?'es':''}`;
}

// El aviso del ramo en la Agenda: ramo bajo 4,0, nota exigente en lo pendiente
// o que ya no alcanza. Lo usan las filas y las tarjetas de prioridad, y se
// pinta UNA vez por ramo, en su primera aparición (ver renderAgenda): antes
// solo lo tenían las filas, y un ramo en riesgo que estaba en prioridades lo
// decía en gris mientras otro lo decía en rojo.
// Bajo este porcentaje del ramo, una evaluación «pesa poco» (Lucas, 2026-10-22).
const EVALUACION_PESA_POCO=10;
function alertaRamoAgendaHTML(e){
  const icono='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/></svg>';
  const caja=(tono,texto)=>`<div class="ag-alert ${tono}">${icono}${texto}</div>`;
  // Textos y tonos de Lucas (2026-10-20).
  //
  // La GRAVEDAD sale de N, el promedio que necesitas en todo lo pendiente: es
  // lo realista. Si saliera de la nota en esta evaluación, un quiz de 5% podía
  // decir "es urgente, necesitas un 6,8" en un ramo al que le basta un 4,1.
  // El MENSAJE depende de cuánto pesa esta evaluación dentro de lo que queda:
  // si pesa un tercio o más, se dice la nota X en ella que te deja aprobando
  // después de rendirla (la de los widgets); si pesa menos, se habla de N.
  // Urgente va en rojo por decisión de Lucas; importante, en ámbar.
  if(e.necesita===null)return '';
  if(e.necesita>7.05)return caja('bad','No es posible que apruebes este ramo, pero da lo mejor de ti.');
  const N=nfNecesaria(e.necesita);
  if(e.avg===null||notaAprobadaRamo(e.ramo,e.avg))
    return e.necesita>5.0?caja('warn',`Necesitas ${N} en lo que queda para aprobar`):'';
  const urgente=e.necesita>5.0,tono=urgente?'bad':'warn';
  const peso=pesoEventoAgenda(e);
  const pendiente=estadoParaNotaNecesaria(e.ramo).pendiente;
  if(peso===null||!(pendiente>0))return caja(tono,urgente
    ?`Es urgente: necesitas un ${N} en lo pendiente para aprobar el ramo.`
    :`Es importante: necesitas un ${N} en lo pendiente para aprobar el ramo.`);
  // Reglas de Lucas (2026-10-22), con el ramo bajo 4,0:
  // 1. Si esta evaluación sola te puede dejar en 4,0, se dice la nota X que
  //    lo logra, pese lo que pese.
  // 2. Si no, y vale menos del 10% del RAMO, «pesa poco» y se habla de N.
  //    Antes se comparaba con un tercio de lo que quedaba por rendir, y a un
  //    20% con 70% por rendir le decía «pesa poco» (reporte de un usuario).
  const ir=notaParaIrConCuatro(e);
  if(ir&&ir.nota)return caja(tono,urgente
    ?`Es urgente: necesitas un ${ir.nota} para ir aprobando el ramo.`
    :`Es importante: si sacas un ${ir.nota}, estarás aprobando el ramo.`);
  if(peso<EVALUACION_PESA_POCO)return caja(tono,urgente
    ?`Es urgente: esta evaluación pesa poco, pero necesitas un ${N} en lo pendiente para aprobar el ramo.`
    :`Esta evaluación pesa poco, pero una buena nota te ayudará: necesitas un ${N} en lo pendiente para aprobar el ramo.`);
  // 3. Vale 10% o más y sola no alcanza: lo mismo que «pesa poco», sin decirlo (Lucas, 2026-10-22).
  return caja(tono,urgente
    ?`Es urgente: necesitas un ${N} en lo pendiente para aprobar el ramo.`
    :`Una buena nota en esta evaluación te ayudará: necesitas un ${N} en lo pendiente para aprobar el ramo.`);
}
function agendaItemHTML(e){
  const f=formatEventDate(e.fecha);
  const peso=pesoEventoAgenda(e);
  const alerta=e.mostrarAlerta?alertaRamoAgendaHTML(e):'';
  return `<button class="ag-row ${e.nivel}" style="--ag-course:${esc(e.ramo.color)}" onclick="openRamo('${esc(e.ramo.id)}')">
    <span class="ag-row-bar" style="background:${esc(e.ramo.color)}"></span>
    <div class="ag-row-main">
      <div class="ag-row-top">
        <span class="ag-row-when ${e.nivel}">${cuandoTexto(e.dias)}</span>
        <span class="ag-row-date">${f.day} ${f.mon}${e.hora?' · '+esc(e.hora):''}</span>
        <span class="ag-row-peso ${peso!==null&&peso>=30?'heavy':''}">${pesoEventoAgendaTexto(e)}</span>
      </div>
      <div class="ag-row-name">${esc(nombreEventoAgenda(e))}</div>
      <div class="ag-row-sub"><span class="ag-ramo-dot" style="background:${esc(e.ramo.color)}"></span>${esc(e.ramo.nombre)}${e.avg!==null?` · vas ${fmtPromedio(e.avg)}`:''}</div>
      ${alerta}
    </div>
    <span class="chevron-r">›</span>
  </button>`;
}
