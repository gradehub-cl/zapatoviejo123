
// ─── EDITAR CATEGORÍA ────────────────────────────────────────────────────────
let editCatError='';
function fechaLocalDesdeISO(iso){
  if(!FECHA_RE.test(iso||''))return null;
  const [a,m,d]=iso.split('-').map(Number);
  const fecha=new Date(a,m-1,d,12,0,0);
  return fecha.getFullYear()===a&&fecha.getMonth()===m-1&&fecha.getDate()===d?fecha:null;
}
function isoFechaLocal(fecha){
  return `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
}
function fechaPascua(ano){
  // Algoritmo gregoriano de Meeus/Jones/Butcher. Viernes y sábado santo son
  // feriados legales en Chile; el domingo ya se descuenta por sí solo.
  const a=ano%19,b=Math.floor(ano/100),c=ano%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const mes=Math.floor((h+l-7*m+114)/31),dia=(h+l-7*m+114)%31+1;
  return new Date(ano,mes-1,dia,12,0,0);
}
function agregarFeriadoMovibleLunes(set,ano,mes,dia){
  const fecha=new Date(ano,mes-1,dia,12,0,0),semana=fecha.getDay();
  if(semana>=2&&semana<=4)fecha.setDate(fecha.getDate()-(semana-1));
  else if(semana===5)fecha.setDate(fecha.getDate()+3);
  set.add(isoFechaLocal(fecha));
}
// Fecha local del solsticio de invierno en Santiago. La ley 21.357 hace
// feriado ese día, no un día fijo de junio. La tabla cubre el horizonte útil
// de evaluaciones que acepta la app y evita fingir que siempre cae el 21.
const SOLSTICIO_INVIERNO_CHILE={
  2021:21,2022:21,2023:21,2024:20,2025:20,2026:21,2027:21,2028:20,
  2029:20,2030:21,2031:21,2032:20,2033:20,2034:21,2035:21,
};
// Feriados nacionales extraordinarios conocidos que no se deducen del
// calendario permanente. Los regionales no se agregan: GradeHub no guarda la
// ubicación del estudiante y adivinarla daría una fecha falsa.
const FERIADOS_NACIONALES_EXTRA_CHILE={
  2025:['2025-11-16','2025-12-14'],
};
function feriadosNacionalesChile(ano){
  const set=new Set([
    `${ano}-01-01`,`${ano}-05-01`,`${ano}-05-21`,`${ano}-07-16`,
    `${ano}-08-15`,`${ano}-09-18`,`${ano}-09-19`,`${ano}-11-01`,
    `${ano}-12-08`,`${ano}-12-25`,
  ]);
  const anoNuevo=new Date(ano,0,1,12,0,0);
  if(anoNuevo.getDay()===0)set.add(`${ano}-01-02`);
  const pascua=fechaPascua(ano);
  [-2,-1].forEach(delta=>{const fecha=new Date(pascua);fecha.setDate(fecha.getDate()+delta);set.add(isoFechaLocal(fecha));});
  agregarFeriadoMovibleLunes(set,ano,6,29);
  agregarFeriadoMovibleLunes(set,ano,10,12);
  const solsticio=SOLSTICIO_INVIERNO_CHILE[ano];
  if(solsticio)set.add(`${ano}-06-${String(solsticio).padStart(2,'0')}`);
  const dieciocho=new Date(ano,8,18,12,0,0);
  if(dieciocho.getDay()===2)set.add(`${ano}-09-17`);
  if(dieciocho.getDay()===3)set.add(`${ano}-09-20`);
  if(dieciocho.getDay()===6)set.add(`${ano}-09-17`);
  const evangelico=new Date(ano,9,31,12,0,0);
  if(evangelico.getDay()===2)evangelico.setDate(evangelico.getDate()-4);
  else if(evangelico.getDay()===3)evangelico.setDate(evangelico.getDate()+2);
  set.add(isoFechaLocal(evangelico));
  (FERIADOS_NACIONALES_EXTRA_CHILE[ano]||[]).forEach(iso=>set.add(iso));
  return set;
}
function sumarDiasHabilesRecorreccionUC(fechaISO,cantidad){
  const fecha=fechaLocalDesdeISO(fechaISO),total=Number(cantidad);
  if(!fecha||!Number.isInteger(total)||total<0)return null;
  let contados=0;
  while(contados<total){
    fecha.setDate(fecha.getDate()+1);
    const iso=isoFechaLocal(fecha);
    if(fecha.getDay()!==0&&!feriadosNacionalesChile(fecha.getFullYear()).has(iso))contados++;
  }
  return isoFechaLocal(fecha);
}
function fechaEvaluacionRecorreccion(n,cat){
  if(FECHA_RE.test(n?.fecha||''))return n.fecha;
  return FECHA_RE.test(cat?.fecha||'')?cat.fecha:null;
}
// La fecha escrita por la persona representa un plazo menor comunicado por su
// Facultad. Nunca puede alargar el máximo UC calculado desde el control.
function plazoRecorreccion(n,cat,tenant=S.tenant){
  const vacio={fecha:null,maximo:null,anotado:null,fuente:null};
  if(!n||n.recorreccionPendiente!==true)return vacio;
  const anotado=FECHA_RE.test(n.recorreccionHasta||'')?n.recorreccionHasta:null;
  const fechaEvaluacion=fechaEvaluacionRecorreccion(n,cat);
  const maximo=tenant==='uc'&&fechaEvaluacion?sumarDiasHabilesRecorreccionUC(fechaEvaluacion,15):null;
  if(anotado&&(!maximo||anotado<maximo))return {fecha:anotado,maximo,anotado,fuente:maximo?'facultad':'anotado'};
  if(maximo)return {fecha:maximo,maximo,anotado,fuente:'maximo_uc'};
  if(anotado)return {fecha:anotado,maximo:null,anotado,fuente:'anotado'};
  return vacio;
}
function textoPlazoRecorreccion(plazo){
  if(!plazo?.fecha)return 'sin plazo calculable';
  if(plazo.fuente==='maximo_uc')return `hasta ${fechaCorta(plazo.fecha)} como máximo`;
  if(plazo.fuente==='facultad')return `hasta ${fechaCorta(plazo.fecha)} según tu Facultad`;
  return `hasta ${fechaCorta(plazo.fecha)}`;
}
function avisoPlazoRecorreccionHTML(fechaEvaluacion){
  if(S.tenant!=='uc')return '';
  const maximo=sumarDiasHabilesRecorreccionUC(fechaEvaluacion,15);
  if(!maximo)return '<p id="m-recorreccion-info" style="font-size:0.8125rem;line-height:1.45;color:var(--fg2);margin:0 0 12px;">Agrega la fecha de la evaluación para calcular el máximo reglamentario. Sin esa fecha no inventaremos un plazo.</p>';
  return `<p id="m-recorreccion-info" style="font-size:0.8125rem;line-height:1.45;color:var(--fg2);margin:0 0 12px;">Por reglamento UC puedes pedirla <b>hasta ${esc(fechaCorta(maximo))} como máximo</b> (15 días hábiles; cuentan los sábados, no los domingos ni feriados nacionales). Tu Facultad puede fijar menos.</p>`;
}
function controlRecorreccionHTML(n,fechaEvaluacion,fechaRespaldo){
  if(!n||!Number.isFinite(n.valor))return '';
  const marcada=n.recorreccionPendiente===true;
  const hasta=marcada&&FECHA_RE.test(n.recorreccionHasta||'')?n.recorreccionHasta:'';
  const maximo=S.tenant==='uc'?sumarDiasHabilesRecorreccionUC(fechaEvaluacion,15):null;
  return `<label class="recorreccion-toggle">
    <input type="checkbox" id="m-recorreccion" ${marcada?'checked':''} onchange="togglePlazoRecorreccion()"/>
    <span><b>Pendiente de mandar a recorregir</b><small>Desmárcalo apenas la mandes.</small></span>
  </label>
  <div class="recorreccion-plazo" id="m-recorreccion-plazo" data-fecha-respaldo="${esc(fechaRespaldo||'')}" style="display:${marcada?'block':'none'};">
    ${avisoPlazoRecorreccionHTML(fechaEvaluacion)}
    <label class="modal-label" for="m-recorreccion-hasta">${maximo?'Si tu Facultad fijó una fecha anterior':'Hasta cuándo puedes pedirla'} <span style="text-transform:none;font-weight:500;color:var(--fg3);letter-spacing:0;">— opcional</span></label>
    <div class="modal-input"><input type="date" id="m-recorreccion-hasta" value="${esc(hasta)}"/></div>
  </div>`;
}
// El plazo solo tiene sentido si la marca está puesta; al sacarla se esconde,
// pero no se borra la fecha hasta guardar: desmarcar sin querer y volver a
// marcar no puede costar el dato.
function togglePlazoRecorreccion(){
  const marca=document.getElementById('m-recorreccion');
  const caja=document.getElementById('m-recorreccion-plazo');
  if(caja)caja.style.display=marca&&marca.checked?'block':'none';
}
function actualizarAvisoPlazoRecorreccion(idBase){
  if(S.tenant!=='uc')return;
  const actual=document.getElementById('m-recorreccion-info');
  const fecha=document.getElementById(idBase+'-fecha');
  if(!actual||!fecha)return;
  const respaldo=(document.getElementById('m-recorreccion-plazo')||{}).dataset?.fechaRespaldo||'';
  const contenedor=document.createElement('div');
  contenedor.innerHTML=avisoPlazoRecorreccionHTML(fecha.value||respaldo);
  const siguiente=contenedor.querySelector('#m-recorreccion-info');
  if(siguiente)actual.replaceWith(siguiente);
}
// Lo que se guarda en la nota al cerrar cualquiera de los dos editores.
function aplicarRecorreccion(n){
  if(!n)return;
  const marca=document.getElementById('m-recorreccion');
  const campo=document.getElementById('m-recorreccion-hasta');
  if(Number.isFinite(n.valor)&&marca?.checked){
    n.recorreccionPendiente=true;
    const hasta=(campo&&campo.value||'').trim();
    if(FECHA_RE.test(hasta))n.recorreccionHasta=hasta;
    else delete n.recorreccionHasta;
  }else{
    delete n.recorreccionPendiente;
    delete n.recorreccionHasta;
  }
}
// Cuántos días corridos faltan para la fecha efectiva: 0 es hoy, negativo es
// vencido, null si no se puede calcular. El vencimiento ya fue obtenido con
// días hábiles; acá solo se expresa cuán cerca está en el calendario.
function diasParaRecorreccion(n,cat,tenant=S.tenant,ahora=new Date()){
  const fecha=plazoRecorreccion(n,cat,tenant).fecha;
  const limite=fechaLocalDesdeISO(fecha);
  if(!limite)return null;
  const hoy=new Date(ahora);hoy.setHours(12,0,0,0);
  return Math.round((limite-hoy)/86400000);
}
function recorreccionUrgente(n,cat,tenant=S.tenant,ahora=new Date()){
  const dias=diasParaRecorreccion(n,cat,tenant,ahora);
  return dias!==null&&dias<=RECORRECCION_DIAS_URGENTE;
}
// Todas las recorrecciones pendientes de la cuenta, con su plazo resuelto.
// Las que vencen antes van primero; las que no tienen plazo, al final.
function recorreccionesPendientes(){
  const out=[];
  (S.ramos||[]).forEach(r=>(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{
    if(n.recorreccionPendiente!==true)return;
    const plazo=plazoRecorreccion(n,c,S.tenant);
    out.push({ramo:r,cat:c,nota:n,plazo,dias:diasParaRecorreccion(n,c,S.tenant)});
  })));
  return out.sort((a,b)=>(a.dias===null?1:0)-(b.dias===null?1:0)||(a.dias||0)-(b.dias||0));
}
