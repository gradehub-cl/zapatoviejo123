// Recordatorios locales, sin notas ni nombres guardados y fuera de gradehub_v1.
const RECORDATORIOS_NOTAS_CLAVE='gradehub_recordatorios_notas_descartados_v1';
const recordatoriosNotasSesion=new Set();
function ambitoRecordatoriosNotas(){return typeof currentUser!=='undefined'&&currentUser?.id?'cuenta:'+currentUser.id:'local';}
function descartesRecordatoriosNotas(){
  try{const datos=JSON.parse(localStorage.getItem(RECORDATORIOS_NOTAS_CLAVE)||'[]');
    return new Set([...recordatoriosNotasSesion,...(Array.isArray(datos)?datos.filter(x=>typeof x==='string'):[])]);
  }catch(e){return new Set(recordatoriosNotasSesion);}
}
function claveRecordatorioNota(e){
  return JSON.stringify([ambitoRecordatoriosNotas(),S.tenant,e.ramo.id,e.cat.id,e.nota?'nota:'+e.nota.id:'categoria']);
}
function recordatoriosNotasFaltantes(ahora=new Date()){
  if(esCuentaProfesor())return [];
  const descartadas=descartesRecordatoriosNotas(),porRamo=new Map();
  // Días de calendario locales: un cambio de hora no convierte siete días en ocho.
  const hoy=Date.UTC(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  for(const e of agendaEvents()){
    if(!e.pending||!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha||''))continue;
    const [a,m,d]=e.fecha.split('-').map(Number),fecha=new Date(Date.UTC(a,m-1,d));
    if(fecha.getUTCFullYear()!==a||fecha.getUTCMonth()!==m-1||fecha.getUTCDate()!==d||(hoy-fecha.getTime())/86400000<=7)continue;
    const r=e.ramo;
    if(r.cierre||notaPortalValida(r.notaOficial)||Number.isFinite(r.avgOverride)||ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r)))continue;
    const clave=claveRecordatorioNota(e);
    if(descartadas.has(clave)||porRamo.has(r.id))continue;
    porRamo.set(r.id,{...e,clave,ambito:ambitoRecordatoriosNotas()});
  }
  // agendaEvents viene ordenada por fecha: una por ramo y las tres más antiguas.
  return [...porRamo.values()].slice(0,3);
}
function recordatorioNotaHTML(e){
  if(!e)return '';
  const nombre=nombreEventoAgenda(e),contexto=nombre+' en '+e.ramo.nombre;
  return `<div class="home-nota-faltante" data-recordatorio-nota="${esc(e.clave)}">
    <span>${esc(nombre)} · sin nota aún</span>
    <button type="button" data-recordatorio-anotar aria-label="Anotar nota de ${esc(contexto)}">Anotar</button>
    <button type="button" data-recordatorio-descartar aria-label="Descartar recordatorio de ${esc(contexto)} en este dispositivo"><span aria-hidden="true">×</span></button>
  </div>`;
}
function montarRecordatoriosNotasHome(caja,items){
  caja.querySelectorAll('[data-recordatorio-nota]').forEach(fila=>{
    const item=items.find(e=>e.clave===fila.dataset.recordatorioNota);if(!item)return;
    fila.onclick=e=>e.stopPropagation();
    fila.querySelector('[data-recordatorio-anotar]').onclick=e=>{e.stopPropagation();abrirRecordatorioNota(item);};
    fila.querySelector('[data-recordatorio-descartar]').onclick=e=>{
      e.stopPropagation();
      if(item.ambito!==ambitoRecordatoriosNotas())return;
      recordatoriosNotasSesion.add(item.clave);
      try{localStorage.setItem(RECORDATORIOS_NOTAS_CLAVE,JSON.stringify([...descartesRecordatoriosNotas()]));}catch(error){}
      // No encadenar otro aviso inmediatamente después de descartarlo.
      const foco=fila.closest('.ramo-row')?.querySelector('.ramo-name');fila.remove();foco?.focus({preventScroll:true});
    };
  });
}
function abrirRecordatorioNota(item){
  if(item.ambito!==ambitoRecordatoriosNotas()||esCuentaProfesor())return;
  const r=S.ramos.find(r=>r.id===item.ramo.id),c=r?.categorias.find(c=>c.id===item.cat.id);
  if(!r||!c)return;
  // Validar de nuevo: una nota puede haber llegado por sincronización.
  const vigente=recordatoriosNotasFaltantes().find(e=>e.clave===item.clave);if(!vigente)return;
  openCats[c.id]=true;openRamo(r.id);
  let intentos=0;
  const enfocar=()=>{
    if(currentRamoId!==r.id||ambitoRecordatoriosNotas()!==item.ambito)return;
    const nodo=[...document.querySelectorAll('#cat-list [data-ficha-categoria]')].find(n=>n.dataset.fichaCategoria===c.id&&n.dataset.fichaRamo===r.id);
    if(!nodo){if(++intentos<30)requestAnimationFrame(enfocar);return;}
    let slot=vigente.nota?.slot;
    if(!vigente.nota&&c.directNota&&c.slots>1)slot=Array.from({length:c.slots},(_,i)=>i).find(i=>!(c.notas||[]).some(n=>n.slot===i&&(n.fecha||n.valor!=null)));
    const boton=[...nodo.querySelectorAll('button.nota-en-fila')].find(b=>Number.isInteger(slot)?b.dataset.slot===String(slot):b.dataset.slot===undefined);
    nodo.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(boton){abrirNotaEnFila(boton);return;}
    if(vigente.nota){openEditNotaModal(c.id,vigente.nota.id);document.getElementById('m-nota-val')?.focus({preventScroll:true});}
    else if(!c.directNota){openAddNotaModal(c.id);document.getElementById('m-nota-val')?.focus({preventScroll:true});}
  };
  enfocar();
}
