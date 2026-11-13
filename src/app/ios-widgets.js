// ─── WIDGETS DE LA APP iOS (#634) ──────────────────────────────────────────
// Los widgets no calculan: la app arma un resumen con las mismas funciones que
// usa la interfaz (notaFinalOficial, nivelRamo, notaNecesaria, nfNecesaria) y
// lo entrega al lado nativo, que lo guarda para que los widgets lo muestren.
// En la web (fuera de la app) no hay plugin y nada de esto corre.
const WIDGETS_VERSION=1;
// Cuánto necesitas en ESTA evaluación para ir con 4 después de rendirla: lo
// ya evaluado más ella, sin suponer nada de lo que viene después (decisión de
// Lucas, 2026-10-08). Si es la última del ramo, es la nota para cerrarlo con 4.
// Se calcula con el motor de siempre (ramoAvg, compuertas, aprobación del ramo)
// sobre una copia con la nota hipotética; nada de esto toca S.
function ramoConNotaHipotetica(r,e,x){
  const copia=JSON.parse(JSON.stringify(r));
  const cat=(copia.categorias||[]).find(k=>k.id===e.cat.id);if(!cat)return null;
  cat.notas=Array.isArray(cat.notas)?cat.notas:[];
  if(e.nota){
    const n=cat.notas.find(k=>k.id===e.nota.id);if(!n)return null;
    n.valor=x;return copia;
  }
  if(Number.isInteger(cat.slots)&&cat.slots>1){
    // Un evento de la categoría cubre sus casillas que no tienen fecha propia.
    const ocupadas=new Set(cat.notas.filter(n=>Number.isInteger(n.slot)).map(n=>n.slot));
    for(let i=0;i<cat.slots;i++)if(!ocupadas.has(i))cat.notas.push({id:'hipotetica'+i,nombre:cat.nombre,peso:1,valor:x,slot:i});
    return copia;
  }
  if(cat.notas.some(n=>typeof n.valor==='number'))return null;
  cat.notas.push({id:'hipotetica',nombre:cat.nombre,peso:1,valor:x});
  return copia;
}
// `ramosContexto` son los ramos donde buscar el vinculado (el laboratorio de
// Dinámica); sin él, los de la persona. El panel del profesor pasa los del alumno.
function notaParaIrConCuatro(e,ramosContexto){
  const aprueba=decimas=>{
    const r=ramoConNotaHipotetica(e.ramo,e,decimas/10);if(!r)return null;
    const v=ramoAvg(r,undefined,ramosContexto);return v===null?null:notaAprobadaRamo(r,v);
  };
  const conUno=aprueba(10),conSiete=aprueba(70);
  if(conUno===null||conSiete===null)return null;
  if(conUno)return {margen:true};
  if(!conSiete)return {inalcanzable:true};
  let bajo=10,alto=70;
  while(alto-bajo>1){const m=(bajo+alto)>>1;if(aprueba(m))alto=m;else bajo=m;}
  return {nota:(alto/10).toFixed(1)};
}
// Lo que hay que hacer, en orden de urgencia (#639): lo de hoy o mañana, mandar
// a recorregir, lo que ya pasó sin nota y lo que no tiene fecha. Se deriva de
// lo que ya existe y no guarda nada. `ahora` se inyecta en los tests.
function pendientes(ahora){
  ahora=ahora||new Date();
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  const m=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()+1);
  const manana=isoOf(m.getFullYear(),m.getMonth(),m.getDate());
  // El mismo nombre que usa la Agenda para cada casilla.
  const item=(tipo,ramo,cat,nota,fecha,hora)=>({tipo,ramo,cat,nota:nota||null,fecha:fecha||null,hora:hora||null,
    nombre:(nota&&nombreNotaCasilla(ramo,cat,nota))||cat.nombre});
  const fechadas=agendaEvents().filter(e=>e.pending&&e.fecha<=manana);
  return [
    ...fechadas.filter(e=>e.fecha>=hoy).map(e=>item('hoy',e.ramo,e.cat,e.nota,e.fecha,e.hora)),
    ...recorreccionesPendientes().map(x=>item('recorregir',x.ramo,x.cat,x.nota,x.plazo&&x.plazo.fecha)),
    ...fechadas.filter(e=>e.fecha<hoy).map(e=>item('sin-nota',e.ramo,e.cat,e.nota,e.fecha)),
    ...agendaSinFecha().map(x=>item('sin-fecha',x.ramo,x.cat)),
  ];
}
function resumenParaWidgets(ahora){
  ahora=ahora||new Date();
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  const sigla=r=>(typeof siglaDeRamo==='function'?siglaDeRamo(r):null)||null;
  const g=gpa(S.ramos);
  const ramos=S.ramos.map(r=>{
    const v=ramoAvg(r);
    return {id:r.id,nombre:r.nombre,color:r.color||null,promedio:v===null?null:notaFinalOficial(v),nivel:v===null?null:nivelRamo(r,v)};
  });
  // Lo de hoy o mañana no va: el widget lo saca de la agenda, que sabe la hora.
  const tareas=pendientes(ahora).filter(p=>p.tipo!=='hoy').slice(0,12).map(p=>({tipo:p.tipo,ramoId:p.ramo.id,ramo:p.ramo.nombre,
    sigla:sigla(p.ramo),color:p.ramo.color||null,evaluacion:p.nombre,fecha:p.fecha}));
  // Las mismas cifras de Estadísticas (renderStats), escritas como allá.
  const proy=proyeccionSemestre(S.ramos),exige=loQueFaltaPorRamo(S.ramos)[0];
  const estadisticas={avance:avanceEvaluaciones(S.ramos).pct,
    rango:proy&&{piso:nf(proy.piso),techo:nf(proy.techo),nivelPiso:nivelNota(proy.piso),nivelTecho:nivelNota(proy.techo)},
    exigente:exige?{ramoId:exige.ramo.id,ramo:exige.ramo.nombre,color:exige.ramo.color||null,
      necesitas:exige.necesita>7.05?null:nfNecesaria(Math.max(1,exige.necesita))}:null};
  const agenda=agendaEvents().filter(e=>e.pending&&e.fecha>=hoy).slice(0,8).map(e=>{
    const cuatro=notaParaIrConCuatro(e)||{};
    return {ramoId:e.ramo.id,ramo:e.ramo.nombre,sigla:sigla(e.ramo),color:e.ramo.color||null,
      evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,fecha:e.fecha,hora:e.hora||null,
      // En esta evaluación, para ir con 4 después de rendirla (ver notaParaIrConCuatro).
      necesitas:cuatro.nota||null,margen:!!cuatro.margen,inalcanzable:!!cuatro.inalcanzable,
      // Cuánto del ramo define, igual que en la Agenda. Si no es fijo (se descarta
      // una nota, no se sabe cuántas habrá), no va: no se inventa un porcentaje.
      parte:(p=>typeof p==='number'&&Number.isFinite(p)&&p>0?Math.round(p*10)/10:null)(pesoEventoAgenda(e))};
  });
  const clases=resumenHorarioClases(esCuentaProfesor()?[]:S.ramos,ahora);
  return {...clases,version:WIDGETS_VERSION,actualizado:ahora.toISOString(),tenant:S.tenant||null,
    promedio:g===null?null:{oficial:notaFinalOficial(g),nivel:nivelNota(g)},ramos,agenda,pendientes:tareas,estadisticas};
}
let _pluginWidgets,_widgetsTimer=null;
function pluginWidgets(){
  if(_pluginWidgets!==undefined)return _pluginWidgets;
  const cap=typeof window!=='undefined'?window.Capacitor:null;
  const nativa=!!(cap&&typeof cap.isNativePlatform==='function'&&cap.isNativePlatform());
  // La app no carga @capacitor/core (no hay build), así que no hay registerPlugin:
  // el puente nativo deja cada plugin registrado en Capacitor.Plugins.
  try{_pluginWidgets=!nativa?null:(cap.Plugins&&cap.Plugins.GradeHubWidgets)
    ||(typeof cap.registerPlugin==='function'?cap.registerPlugin('GradeHubWidgets'):null);}
  catch(e){_pluginWidgets=null;}
  return _pluginWidgets;
}
// Se agrupan los guardados seguidos (escribir varias notas) en un solo envío.
function publicarResumenWidgets(){
  // Una cuenta convertida puede dejar widgets antiguos en este iPhone.
  if(esCuentaProfesor()){borrarResumenWidgets();return;}
  const p=pluginWidgets();if(!p)return;
  clearTimeout(_widgetsTimer);
  _widgetsTimer=setTimeout(()=>{
    try{
      const pedido=S.onboardingDone?p.guardarResumen({json:JSON.stringify(resumenParaWidgets())}):p.borrarResumen();
      if(pedido&&typeof pedido.catch==='function')pedido.catch(()=>{});
    }catch(e){}
    // Después del aviso de "nota agregada", no encima.
    const reveladas=S.onboardingDone?revisarOlfato():[];
    if(reveladas.length)setTimeout(()=>showToast(textoRevelacion(reveladas[reveladas.length-1])),2200);
    programarAvisosPruebas();
    sincronizarActividadesPrueba();
  },400);
}
// Al cerrar sesión no pueden quedar notas de esa cuenta en la pantalla de inicio.
function borrarResumenWidgets(){
  const p=pluginWidgets();if(!p)return;
  clearTimeout(_widgetsTimer);
  try{const pedido=p.borrarResumen();if(pedido&&typeof pedido.catch==='function')pedido.catch(()=>{});}catch(e){}
  // Ni avisos ni tarjetas de la cuenta que salió.
  try{const r=p.sincronizarActividades({actividades:[]});if(r&&typeof r.catch==='function')r.catch(()=>{});}catch(e){}
  const ln=pluginNotificaciones();
  if(ln)Promise.resolve(ln.getPending()).then(r=>{const ids=((r&&r.notifications)||[]).filter(n=>n&&n.extra&&n.extra.gradehub==='prueba').map(n=>({id:n.id}));
    return ids.length?ln.cancel({notifications:ids}):null;}).catch(()=>{});
}
// Tocar un widget abre la pantalla exacta: cl.gradehub.app://ramo/<id>,
// ://agenda, ://estadisticas o ://inicio. Un ramo que ya no existe deja en Inicio.
function abrirEnlaceWidget(url){
  const m=/^cl\.gradehub\.app:\/\/(ramo|simular|agenda|estadisticas|inicio)(?:\/([A-Za-z0-9_-]{1,64}))?\/?$/.exec(String(url||''));
  // Una cuenta de profesor no tiene ramos ni widgets de estudiante.
  if(!m||!S.onboardingDone||esCuentaProfesor())return false;
  if(m[1]==='agenda'){showTab('agenda');return true;}
  if(m[1]==='estadisticas'){showTab('stats');return true;}
  if((m[1]==='ramo'||m[1]==='simular')&&S.ramos.some(r=>r.id===m[2])){
    openRamo(m[2]);
    // "¿Cómo crees que te fue?" abre el simulador del ramo.
    if(m[1]==='simular'){
      setTimeout(()=>{if(typeof openSimuladorModal==='function')openSimuladorModal();},320);
      // Si la respuesta de la Actividad llega después de abrir el simulador, se precarga igual.
      Promise.resolve(recogerSensaciones()).then(n=>{
        if(n&&currentRamoId===m[2]&&document.getElementById('sim-cats')&&!Object.values(simState).some(a=>a&&a.length))
          precargarSensacion(S.ramos.find(r=>r.id===m[2]));
      });
    }
    return true;
  }
  showTab('home');return m[1]==='inicio';
}
