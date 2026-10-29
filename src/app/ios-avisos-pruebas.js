// ─── AVISOS ANTES DE UNA EVALUACIÓN (app iOS, #645) ─────────────────────────
// Versión sin servidor. Para cada evaluación pendiente CON HORA: notificaciones
// locales de cada fase (repaso, baño y agua, caminar a la sala, cómo te fue) y
// la Actividad en Vivo desde 6 horas antes, con el riel de fases y "¿cómo te fue?".
// Es opt-in y vale por dispositivo: la preferencia no entra a S ni a la nube.
// Sin hora no hay a partir de cuándo contar, así que no se avisa nada.
const CLAVE_AVISOS_PRUEBAS='gradehub_avisos_pruebas';
const DURACION_PRUEBA_MIN=120;
const AVISOS_PRUEBA_MAX=60; // iOS guarda hasta 64 notificaciones pendientes por app
function pluginNotificaciones(){
  if(!pluginWidgets())return null;
  const cap=window.Capacitor;
  return cap&&cap.Plugins&&cap.Plugins.LocalNotifications||null;
}
function avisosPruebasDisponibles(){return !!pluginNotificaciones();}
function avisosPruebasActivos(){try{return localStorage.getItem(CLAVE_AVISOS_PRUEBAS)==='1';}catch(e){return false;}}
function fechaHoraLocal(fecha,hora){
  const f=/^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha||''),h=/^(\d{1,2}):(\d{2})$/.exec(hora||'');
  return f&&h?new Date(+f[1],+f[2]-1,+f[3],+h[1],+h[2]):null;
}
function horaDe(d){return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;}
function pruebasConHora(ahora,dias){
  ahora=ahora||new Date();
  const limite=ahora.getTime()+dias*864e5;
  return agendaEvents().filter(e=>e.pending&&e.hora).map(e=>{
    const inicio=fechaHoraLocal(e.fecha,e.hora);
    if(!inicio)return null;
    return {clave:[e.ramo.id,e.cat.id,e.nota?e.nota.id:'',e.fecha].join('|'),ramoId:e.ramo.id,ramo:e.ramo.nombre,
      sigla:(typeof siglaDeRamo==='function'?siglaDeRamo(e.ramo):null)||null,color:e.ramo.color||null,
      evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,sala:null,
      inicio,fin:new Date(inicio.getTime()+DURACION_PRUEBA_MIN*6e4)};
  }).filter(p=>p&&p.fin.getTime()>ahora.getTime()&&p.inicio.getTime()<=limite);
}
function idAvisoPrueba(clave,fase){
  let h=5381;for(const c of clave)h=((h*33)^c.charCodeAt(0))>>>0;
  return (h%200000000)*4+fase+1;
}
// Los textos de cada fase. Tono de compañero (AGENTS.md); los decide Lucas.
function avisosDePrueba(p,ahora){
  const lugar=p.sala?`la sala ${p.sala}`:'tu sala';
  return [
    [30,'Último repaso',`${p.evaluacion} de ${p.ramo} empieza en 30 minutos.`,'ramo'],
    [15,'Anda al baño y llena tu botella de agua',`${p.evaluacion} empieza en 15 minutos.`,'ramo'],
    [10,`Camina a ${lugar}`,`${p.evaluacion} de ${p.ramo} a las ${horaDe(p.inicio)}.`,'ramo'],
    [-DURACION_PRUEBA_MIN,'¿Cómo crees que te fue?',`${p.evaluacion} de ${p.ramo}. Toca para simular tu nota.`,'simular'],
  ].map(([antes,titulo,cuerpo,destino],fase)=>({id:idAvisoPrueba(p.clave,fase),at:new Date(p.inicio.getTime()-antes*6e4),
    titulo,cuerpo,url:`cl.gradehub.app://${destino}/${p.ramoId}`}))
   .filter(a=>a.at.getTime()>(ahora||new Date()).getTime());
}
async function programarAvisosPruebas(ahora){
  if(esCuentaProfesor())return 0;
  const ln=pluginNotificaciones();if(!ln)return 0;
  try{
    const pendientes=await ln.getPending();
    const nuestras=((pendientes&&pendientes.notifications)||[]).filter(n=>n&&n.extra&&n.extra.gradehub==='prueba');
    if(nuestras.length)await ln.cancel({notifications:nuestras.map(n=>({id:n.id}))});
    if(!avisosPruebasActivos()||!S.onboardingDone)return 0;
    const permiso=await ln.checkPermissions();
    if(!permiso||permiso.display!=='granted')return 0;
    const lista=pruebasConHora(ahora,14).flatMap(p=>avisosDePrueba(p,ahora))
      .sort((a,b)=>a.at-b.at).slice(0,AVISOS_PRUEBA_MAX);
    if(lista.length)await ln.schedule({notifications:lista.map(a=>({id:a.id,title:a.titulo,body:a.cuerpo,
      schedule:{at:a.at},extra:{gradehub:'prueba',url:a.url}}))});
    return lista.length;
  }catch(e){return 0;}
}
// iOS mantiene viva una Actividad hasta 8 horas: 6 antes de la prueba y las 2
// que dura. Las próximas se mandan con su hora de partida (`desde`); desde
// iOS 26 el teléfono las deja programadas y aparecen solas, con la app cerrada.
const HORAS_ACTIVIDAD_ANTES=6,ACTIVIDADES_MAX=3;
function sincronizarActividadesPrueba(ahora){
  if(esCuentaProfesor())return;
  const p=pluginWidgets();if(!p||typeof p.sincronizarActividades!=='function')return;
  ahora=ahora||new Date();
  const vigentes=avisosPruebasActivos()&&S.onboardingDone?pruebasConHora(ahora,3).slice(0,ACTIVIDADES_MAX):[];
  try{
    const r=p.sincronizarActividades({actividades:vigentes.map(x=>({clave:x.clave,ramoId:x.ramoId,ramo:x.ramo,sigla:x.sigla,
      color:x.color,evaluacion:x.evaluacion,sala:x.sala,inicio:x.inicio.getTime(),fin:x.fin.getTime(),
      desde:x.inicio.getTime()-HORAS_ACTIVIDAD_ANTES*36e5}))});
    if(r&&typeof r.catch==='function')r.catch(()=>{});
  }catch(e){}
}
// "¿Cómo te fue?" se responde tocando la Actividad en Vivo, con la app cerrada:
// el iPhone lo deja en el App Group y acá se recoge. Es una sensación, no una
// nota: vive solo en este dispositivo (fuera de S y de la nube) y sirve para
// abrir el simulador con una nota de partida que la persona cambia si quiere.
const CLAVE_SENSACIONES='gradehub_sensaciones';
const SENSACIONES=[
  {valor:1,texto:'Muy mal',nota:'2,5'},{valor:2,texto:'Mal',nota:'3,5'},{valor:3,texto:'Normal',nota:'4,5'},
  {valor:4,texto:'Bien',nota:'5,5'},{valor:5,texto:'Muy bien',nota:'6,5'}];
function sensacionesGuardadas(){
  try{const o=JSON.parse(localStorage.getItem(CLAVE_SENSACIONES)||'{}');return o&&typeof o==='object'&&!Array.isArray(o)?o:{};}
  catch(e){return {};}
}
async function recogerSensaciones(){
  const p=pluginWidgets();if(!p||typeof p.leerSensaciones!=='function')return 0;
  try{
    const r=await p.leerSensaciones();
    const nuevas=(r&&Array.isArray(r.sensaciones)?r.sensaciones:[])
      .filter(x=>x&&typeof x.clave==='string'&&SENSACIONES.some(s=>s.valor===x.valor));
    if(!nuevas.length)return 0;
    const todas=sensacionesGuardadas(),limite=Date.now()-30*864e5;
    nuevas.forEach(x=>{
      const [ramoId,catId]=x.clave.split('|');
      const r=S.ramos.find(y=>y.id===ramoId),cat=r&&(r.categorias||[]).find(c=>c.id===catId);
      todas[x.clave]={valor:x.valor,fecha:Number(x.fecha)||Date.now(),previas:cat?notasConValor(cat).map(n=>n.id):[]};
      track('sensacion_respondida');
    });
    Object.keys(todas).forEach(k=>{if(!(todas[k].fecha>limite))delete todas[k];});
    try{localStorage.setItem(CLAVE_SENSACIONES,JSON.stringify(todas));}catch(e){}
    return nuevas.length;
  }catch(e){return 0;}
}
// La sensación más reciente de este ramo cuya evaluación sigue sin nota.
function sensacionPendiente(r,ahora){
  const todas=sensacionesGuardadas(),hace=(ahora||Date.now())-3*864e5;
  return Object.entries(todas).map(([clave,x])=>{
    const [ramoId,catId]=clave.split('|');
    const cat=ramoId===r.id&&(r.categorias||[]).find(c=>c.id===catId);
    const s=SENSACIONES.find(y=>y.valor===x.valor);
    return cat&&s&&x.fecha>hace&&!simCatLlena(cat)?{cat,s,fecha:x.fecha}:null;
  }).filter(Boolean).sort((a,b)=>b.fecha-a.fecha)[0]||null;
}
function precargarSensacion(r){
  const x=sensacionPendiente(r);if(!x)return null;
  const inp=document.getElementById('sim-in-'+x.cat.id);if(!inp)return null;
  const propia=notaHabitual(x.s.valor);
  inp.value=propia?propia.texto:x.s.nota;simAddNota(x.cat.id);
  const intro=document.querySelector('.sim-intro');
  if(intro)intro.textContent=propia
    ?`Dijiste que ${x.cat.nombre} te fue ${x.s.texto.toLowerCase()}: partimos con un ${propia.texto}, lo que sueles sacarte cuando dices eso. Cámbialo si quieres.`
    :`Dijiste que ${x.cat.nombre} te fue ${x.s.texto.toLowerCase()}: partimos con un ${x.s.nota}. Cámbialo si quieres.`;
  track('simulador_precargado',{propia:!!propia});
  return x;
}
