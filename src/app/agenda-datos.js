
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
function ramoProgress(r){return calculoRamo.avanceRamo(r);}
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

// ─── FECHAS DE COMPAÑEROS ────────────────────────────────────────────────────
// La RPC date_consensus (supabase/date_consensus.sql) devuelve la fecha en que
// coinciden 3 o más cuentas para una evaluación del mismo ramo. Es solo una
// sugerencia: nunca llena ni pisa una fecha sola. Se lee una vez por sesión y
// no se guarda en el estado: "3 compañeros" envejece.
let _fechasCompartidas=null,_fechasCompartidasClave=null,_fechasCompartidasPromesa=null;
const normFechaCompartida=s=>String(s||'').trim().toLowerCase()
  .replace(/[áéíóúüñ]/g,c=>({á:'a',é:'e',í:'i',ó:'o',ú:'u',ü:'u',ñ:'n'})[c]).replace(/\s+/g,' ');
function cargarFechasCompartidas(){
  if(typeof currentUser==='undefined'||!currentUser||typeof supabaseClient==='undefined'||!supabaseClient||!S.tenant)return Promise.resolve(false);
  const clave=currentUser.id+'|'+S.tenant;
  if(_fechasCompartidasClave===clave)return _fechasCompartidasPromesa;
  _fechasCompartidasClave=clave;_fechasCompartidas=null;
  const tenant=S.tenant;
  _fechasCompartidasPromesa=supabaseClient.rpc('date_consensus',{p_tenant:tenant}).then(({data,error})=>{
    if(error||_fechasCompartidasClave!==clave||!Array.isArray(data))return false;
    _fechasCompartidas=new Map(data.filter(f=>FECHA_RE.test(f.fecha||'')&&Number.isSafeInteger(f.fecha_respaldos))
      .map(f=>[[tenant,f.ramo_key,f.categoria_key,f.nota_key||''].join('|'),{fecha:f.fecha,hora:HORA_RE.test(f.hora||'')?f.hora:null,respaldos:f.fecha_respaldos}]));
    return _fechasCompartidas.size>0;
  // Sin la función aplicada o sin red, la app sigue igual, sin sugerencias.
  },()=>false);
  return _fechasCompartidasPromesa;
}
// Sugerencia para una evaluación (nota=null) o para una casilla por su nombre.
// Solo si todavía no tiene fecha y la persona no la quitó a propósito.
function fechaCompartida(r,cat,nombreNota,item){
  if(!_fechasCompartidas||!r||!cat||!r.origen||!r.origen.ramoKey||item&&(item.fecha||item.fechaQuitada))return null;
  const f=_fechasCompartidas.get([r.origen.tenant,r.origen.ramoKey,normFechaCompartida(cat.nombre),nombreNota==null?'':normFechaCompartida(nombreNota)].join('|'));
  return f&&f.respaldos>=3?f:null;
}
function textoFechaCompartida(f){
  const d=formatEventDate(f.fecha);
  return `${f.respaldos} compañeros la tienen el ${d.dow} ${d.day} ${d.mon}${f.hora?`, ${f.hora}`:''}`;
}
// En el editor: una línea bajo el campo de fecha con un botón que la copia.
// Guardar decide; el botón solo llena los campos.
function sugerenciaFechaHTML(idBase,f){
  if(!f)return '';
  return `<p id="${idBase}-compartida" style="display:flex;align-items:center;gap:8px;margin:-6px 0 14px;font-size:0.8125rem;color:var(--fg2);line-height:1.35;">
      <span style="flex:1;min-width:0;">${esc(textoFechaCompartida(f))}</span>
      <button type="button" onclick="usarFechaCompartida('${idBase}','${f.fecha}','${f.hora||''}')" style="flex:0 0 auto;min-height:44px;padding:0 14px;background:var(--muted);border:none;border-radius:8px;color:var(--fg);font-size:0.8125rem;font-weight:600;cursor:pointer;">Usar</button>
    </p>`;
}
function usarFechaCompartida(idBase,fecha,hora){
  const f=document.getElementById(idBase+'-fecha'),h=document.getElementById(idBase+'-hora');
  if(!f)return;
  f.value=fecha;f.dataset.compartida=fecha;sincronizarHora(idBase);
  if(h&&hora){h.value=hora;h.dataset.compartida=hora;}
  const linea=document.getElementById(idBase+'-compartida');if(linea)linea.hidden=true;
}
// Después de marcarFechaUsuario: si lo guardado es lo que vino de compañeros
// (sin cambios), queda como 'consenso' y no cuenta como un voto más.
function marcarOrigenCompartido(item,idBase){
  const f=document.getElementById(idBase+'-fecha'),h=document.getElementById(idBase+'-hora');
  if(!item.fecha||!f||f.dataset.compartida!==item.fecha)return;
  item.fechaOrigen='consenso';
  if(item.hora&&h&&h.dataset.compartida===item.hora)item.horaOrigen='consenso';
}
