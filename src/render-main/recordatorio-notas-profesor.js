// Recordatorio en la app, sin push ni escrituras de notas/consentimiento.
const RECORDATORIOS_PROFESOR_CLAVE='gradehub_recordatorios_profesor_descartados_v1';
const descartesProfesorSesion=new Set();
let recordatoriosProfesorContexto={cuenta:null,ramos:new Set()},versionRecordatoriosProfesor=0;
function ramosRecordatorioProfesor(){return typeof currentUser!=='undefined'&&recordatoriosProfesorContexto.cuenta===currentUser?.id?recordatoriosProfesorContexto.ramos:new Set();}
function clavesRecordatorioProfesor(e){
 const base=[ambitoRecordatoriosNotas(),S.tenant,e.ramo.id,e.cat.id];
 return [JSON.stringify([...base,'dia',e.fecha,e.hora||'']),...(e.nota?.id?[JSON.stringify([...base,'nota',e.nota.id])]:[])];
}
function descartesRecordatorioProfesor(){
 try{const x=JSON.parse(localStorage.getItem(RECORDATORIOS_PROFESOR_CLAVE)||'[]');return new Set([...descartesProfesorSesion,...(Array.isArray(x)?x.filter(k=>typeof k==='string'):[])]);}catch(e){return new Set(descartesProfesorSesion);}
}
function pendientesRecordatorioProfesor(ahora=new Date()){
 if(esCuentaProfesor())return [];
 const ramos=ramosRecordatorioProfesor(),hoy=Date.UTC(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
 return agendaEvents().filter(e=>{
  if(!ramos.has(e.ramo.id)||!e.pending||!/^\d{4}-\d{2}-\d{2}$/.test(e.fecha||''))return false;
  const [a,m,d]=e.fecha.split('-').map(Number),f=new Date(Date.UTC(a,m-1,d));
  const r=e.ramo;
  return f.getUTCFullYear()===a&&f.getUTCMonth()===m-1&&f.getUTCDate()===d&&f.getTime()<hoy&&!r.cierre&&!notaPortalValida(r.notaOficial)&&!Number.isFinite(r.avgOverride)&&!ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r));
 });
}
function recordatoriosNotasProfesor(ahora=new Date()){
 const descartes=descartesRecordatorioProfesor(),porRamo=new Map();
 // La más reciente; cerrar silencia también las antiguas que ya estaban pendientes.
 for(const e of pendientesRecordatorioProfesor(ahora).sort((a,b)=>b.fecha.localeCompare(a.fecha))){
  if(clavesRecordatorioProfesor(e).some(k=>descartes.has(k))||porRamo.has(e.ramo.id))continue;
  porRamo.set(e.ramo.id,{...e,profesor:true,clave:clavesRecordatorioProfesor(e)[0],ambito:ambitoRecordatoriosNotas()});
 }
 return [...porRamo.values()].slice(0,3);
}
function descartarRecordatorioProfesor(item,ahora=new Date()){
 if(item.ambito!==ambitoRecordatoriosNotas())return;
 for(const e of pendientesRecordatorioProfesor(ahora).filter(e=>e.ramo.id===item.ramo.id))clavesRecordatorioProfesor(e).forEach(k=>descartesProfesorSesion.add(k));
 try{localStorage.setItem(RECORDATORIOS_PROFESOR_CLAVE,JSON.stringify([...descartesRecordatorioProfesor()]));}catch(e){}
}
function pintarRecordatoriosProfesorHome(caja,ahora=new Date()){
 const items=[...recordatoriosNotasProfesor(ahora),...recordatoriosNotasFaltantes(ahora)].sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,3);
 caja.querySelectorAll('[data-recordatorio-nota]').forEach(e=>e.remove());
 const filas=[...caja.querySelectorAll('.ramo-row')];
 for(const e of items){const fila=filas.find(f=>f.dataset.ramoId===e.ramo.id);if(!fila)continue;const div=document.createElement('div');div.innerHTML=recordatorioNotaHTML(e);fila.appendChild(div.firstElementChild);}
 montarRecordatoriosNotasHome(caja,items);
}
async function actualizarRecordatoriosProfesorHome(caja,ahora=new Date()){
 const version=++versionRecordatoriosProfesor,cuenta=typeof currentUser!=='undefined'&&currentUser?.id,cliente=typeof supabaseClient!=='undefined'&&supabaseClient;
 if(!cuenta||!cliente||esCuentaProfesor())return;
 const vigente=()=>version===versionRecordatoriosProfesor&&currentUser?.id===cuenta&&supabaseClient===cliente&&caja.isConnected!==false;
 try{const {data,error}=await cliente.rpc('mis_profesores');if(!vigente())return;if(error)throw error;
  recordatoriosProfesorContexto={cuenta,ramos:new Set((Array.isArray(data)?data:[]).flatMap(p=>Array.isArray(p.ramos)?p.ramos.filter(x=>typeof x==='string'):[]))};
 }catch(e){if(!vigente())return;recordatoriosProfesorContexto={cuenta,ramos:new Set()};}
 // Esta consulta no bloquea Inicio; sin SQL/red queda el recordatorio general.
 if(vigente())pintarRecordatoriosProfesorHome(caja,ahora);
}
