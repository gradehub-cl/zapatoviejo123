
// ─── CONFIGURACIÓN EDITABLE ───────────────────────────────────────────────────
// ─── AGENDA DE EVALUACIONES ──────────────────────────────────────────────────
// Recolecta todas las categorías con fecha ingresada, las ordena y agrupa por
// proximidad. La ingesta de fechas se agrega en el modal de categoría (próximo batch).
// ─── INSIGHT HELPERS (cards inteligentes del home) ─────────────────────────
// Sale de la misma lista que la Agenda y con su mismo criterio de "por venir".
// Tenía su propia cuenta: solo miraba la fecha de la categoría, ignoraba las
// fechas por casilla y daba por rendida una categoría con casillas solo
// fechadas (notas sin valor). Inicio decía "Solemne 1 en 5 días" mientras la
// Agenda ponía primero "Control 1" en 2.
function nextExam(){
  // agendaEvents ya viene ordenada por fecha y hora, sin eximidas.
  const e=agendaEvents().find(e=>estadoEventoAgenda(e)==='por_venir');
  if(!e)return null;
  return {ramo:e.ramo,cat:e.cat,nombre:nombreEventoAgenda(e),date:new Date(e.fecha+'T00:00:00'),daysUntil:diasHasta(e.fecha)};
}

function latestGrade(){
  // Última nota "ingresada" (por orden en el array, aprox porque no guardamos timestamp)
  let last=null;
  S.ramos.forEach(r=>{
    r.categorias.forEach(c=>{
      (c.notas||[]).forEach(n=>{
        if(n.valor===null||n.valor===undefined)return;
        last={ramo:r,cat:c,nota:n};
      });
    });
  });
  return last;
}

function mostRiskyRamo(){
  // La cuenta de cuánto falta por rendir vive en `notaNecesaria`, que sabe de
  // casillas declaradas y del ramo vinculado (Dinámica y su laboratorio son dos
  // actas y una nota). Acá había una tercera copia que repartía por categoría
  // entera: una categoría con `slots:6` y una nota se daba por cerrada, así que
  // con un solo informe de seis esta tarjeta pedía 5,2 donde el número real era
  // 4,07. Tenerla escrita de nuevo es lo que hizo que se equivocara distinto.
  let best=null;
  S.ramos.forEach(r=>{
    if(r.categorias.length===0)return;
    const avg=ramoAvg(r);
    if(avg===null)return;
    if(nivelRamo(r,avg)==='good')return; // no está en riesgo
    const needed=notaNecesaria(r);
    if(needed===null)return; // ya evaluado todo
    if(needed<=1.0)return;   // trivial: le sobra con cualquier nota
    // Un ramo que ya no se puede aprobar con lo que queda es el que MÁS
    // necesita aparecer. Antes se descartaba, y la tarjeta vacía se leía como
    // "no hay problema" justo para quien peor está.
    const imposible=needed>7.05;
    const cand={ramo:r,avg,needed,imposible};
    if(!best) best=cand;
    else if(best.imposible!==cand.imposible) best=cand.imposible?cand:best;
    else if(needed>best.needed) best=cand;
  });
  return best;
}

// Progreso del ramo: % de peso evaluado
function ramoProgress(r){
  const categorias=categoriasVigentes(r);
  const pesoDeclarado=(r.categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
  if(pesoDeclarado<=0)return {pct:0,pending:0,total:0};
  const pesoVigente=categorias.reduce((s,c)=>s+(Number(c.peso)||0),0);
  // La parte todavía sin pauta sigue pendiente. Una eximición, en cambio,
  // cubre el peso de esa categoría sin necesitar una nota.
  const total=Math.max(100,pesoDeclarado);
  const pesoEximido=pesoDeclarado-pesoVigente;
  let done=0;
  categorias.forEach(c=>{
    // Una categoría con casillas fijas se evalúa proporcionalmente: una de
    // seis notas de Informes no puede cerrar el 70% del ramo. Solo cuentan
    // notas con valor; una anotada con fecha para rendir después sigue pendiente.
    const notas=Array.isArray(c.notas)?c.notas:[];
    const objetivo=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
    // Se cuentan CASILLAS con nota, no notas: dos valores de la misma casilla
    // son un dato pisado, no dos evaluaciones rendidas. Sin esto, un duplicado
    // hace que el ramo se declare más evaluado de lo que está.
    const evaluadas=objetivo>1
      ? new Set(notas.filter(n=>typeof n.valor==='number'&&Number.isInteger(n.slot)).map(n=>n.slot)).size
      : notas.filter(n=>typeof n.valor==='number').length;
    done+=c.peso*Math.min(1,evaluadas/objetivo);
  });
  done+=pesoEximido;
  return {pct:Math.round(done/total*100),pending:total-done,total};
}
function ramoRecienCerrado(anterior,actual){return Number.isFinite(anterior)&&anterior<100&&actual===100;}

function nombreEventoAgenda(e){return e.nota?nombreNotaCasilla(e.ramo,e.cat,e.nota):e.cat.nombre;}
function pesoEventoAgenda(e){
  const c=e.cat,peso=Number(c.peso)||0;
  const fechadas=(c.notas||[]).filter(n=>n.fecha);
  // Una evaluación directa tiene una sola nota: al reconstruir el historial
  // completo de rendidas, esa nota conserva el peso de su categoría aunque la
  // fecha haya vivido en la categoría o no haya existido nunca.
  if(e.historialRendida===true&&e.nota&&c.directNota===true&&!(Number.isInteger(c.slots)&&c.slots>1)&&(c.notas||[]).length<=1)return peso;
  if(!e.nota&&!fechadas.length)return peso;
  // El porcentaje individual no es fijo si se descarta una nota o no sabemos
  // cuántas habrá. El peso del grupo no puede disfrazarse de peso de esa entrega.
  if(c.dropLowest||!Number.isInteger(c.slots)||c.slots<1)return null;
  const hojas=hojasCategoria(c),total=hojas.reduce((s,h)=>s+h.weight,0);
  if(!total)return null;
  const propias=new Set(fechadas.map(n=>n.id));
  const seleccion=e.nota?hojas.filter(h=>h.id===e.nota.id):hojas.filter(h=>!propias.has(h.id));
  return peso*seleccion.reduce((s,h)=>s+h.weight,0)/total;
}

// Sin argumento, los ramos de la persona. El panel del profesor le pasa los
// ramos que un alumno le compartió, para usar exactamente la misma regla.
function agendaEvents(ramos){
  const out=[];
  (ramos||S.ramos).forEach(r=>{
    r.categorias.forEach(c=>{
      if(categoriaEximida(r,c))return;
      // Las notas con fecha propia son evaluaciones sueltas dentro del grupo:
      // "Casos y ensayos" puede tener tres casos en tres fechas distintas, y
      // cada uno tiene que poder aparecer en su día. Si la nota trae fecha,
      // manda la suya; la de la categoría vale para el grupo entero.
      (c.notas||[]).forEach(n=>{
        if(!n.fecha)return;
        out.push({
          fecha:n.fecha, hora:n.hora||null, ramo:r, cat:c, nota:n,
          pending:n.valor===null||n.valor===undefined,
          notas:[n], targetCount:1,
        });
      });
      if(!c.fecha)return;
      const propias=(c.notas||[]).filter(n=>n.fecha);
      const conFechaPropia=propias.length;
      // Solo cuenta lo rendido, por casilla. Tocar una casilla y cancelar deja
      // una nota vacía guardada (abrirCasilla), y "Guardada como pendiente"
      // también: contarlas daba la evaluación por rendida y desaparecía de la
      // Agenda y de "Próxima evaluación" sin tener nota. Y la fecha del grupo
      // solo cubre las casillas sin fecha propia: esas son eventos aparte.
      const casillas=Number.isInteger(c.slots)&&c.slots>1;
      const rendidas=(c.notas||[]).filter(n=>!n.fecha&&typeof n.valor==='number');
      const notasCount=casillas?new Set(rendidas.map(n=>Number.isInteger(n.slot)?n.slot:n.id)).size:rendidas.length;
      const targetCount=casillas?Math.max(1,c.slots-new Set(propias.filter(n=>Number.isInteger(n.slot)).map(n=>n.slot)).size):1;
      const pending=notasCount<targetCount;
      // Si TODAS las notas del grupo tienen su propia fecha, la del grupo ya no
      // aporta: mostrarla duplicaría lo mismo en otro día.
      if(conFechaPropia&&notasCount<=0&&(c.slots||0)<=conFechaPropia)return;
      out.push({
        fecha:c.fecha, hora:c.hora||null, ramo:r, cat:c, pending,
        notas:(c.notas||[]).filter(n=>!n.fecha), targetCount,
      });
    });
  });
  out.sort((a,b)=>a.fecha.localeCompare(b.fecha)||(a.hora||'').localeCompare(b.hora||''));
  return out;
}
