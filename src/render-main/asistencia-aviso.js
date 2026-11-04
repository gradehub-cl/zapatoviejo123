// Aviso del dispositivo; nunca se guarda en gradehub_v1 ni en la nube.
const AVISO_ASISTENCIA_CLAVE='gradehub_aviso_ofg_v1';
const avisosAsistenciaAbiertos=new Set(),avisosAsistenciaCerrados=new Set();
function esOFG(r){return S.tenant==='uc'&&!!r&&Object.hasOwn(UC_AREAS_FG,String(siglaDeRamo(r)||'').toUpperCase());}
function tieneAvisoAsistencia(r){return esOFG(r)||definicionPresetDelRamo(r)?.asistenciaMinima===true;}
function claveAvisoAsistencia(r){return JSON.stringify([typeof currentUser!=='undefined'&&currentUser?.id?'cuenta:'+currentUser.id:'local',S.tenant,r.id]);}
function leerAvisoAsistencia(r){
 try{const datos=JSON.parse(localStorage.getItem(AVISO_ASISTENCIA_CLAVE)||'{}');
  if(!datos||typeof datos!=='object'||Array.isArray(datos))return null;
  const estado=datos[claveAvisoAsistencia(r)];
  return {datos,aperturas:Number.isInteger(estado?.aperturas)&&estado.aperturas>=0?estado.aperturas:0,cerrado:estado?.cerrado===true};
 }catch(e){return null;} // Sin lectura fiable no insistir con el aviso.
}
function puedeAvisarAsistencia(r){
 return !!(r&&S.ramos.includes(r)&&!esCuentaProfesor()&&!r.cierre&&!notaPortalValida(r.notaOficial)&&!Number.isFinite(r.avgOverride)&&!ramoCompletamenteEvaluado(r)&&!faltasActivas(r)&&tieneAvisoAsistencia(r));
}
// Solo openRamo llama a esta función; editar notas o repintar no cuenta.
function registrarAperturaAvisoAsistencia(r){
 if(!r)return;const clave=claveAvisoAsistencia(r);avisosAsistenciaAbiertos.delete(clave);
 if(!puedeAvisarAsistencia(r)||avisosAsistenciaCerrados.has(clave))return;
 const estado=leerAvisoAsistencia(r);if(!estado||estado.cerrado||estado.aperturas>=2)return;
 try{estado.datos[clave]={aperturas:estado.aperturas+1,cerrado:false};localStorage.setItem(AVISO_ASISTENCIA_CLAVE,JSON.stringify(estado.datos));}
 catch(e){return;} // Tampoco se muestra si no se puede limitar su frecuencia.
 avisosAsistenciaAbiertos.add(clave);track('aviso_ofg_visto');
}
function mostrarAvisoAsistencia(r){
 if(!puedeAvisarAsistencia(r))return false;
 const clave=claveAvisoAsistencia(r),estado=leerAvisoAsistencia(r);
 return !!(estado&&!estado.cerrado&&!avisosAsistenciaCerrados.has(clave)&&avisosAsistenciaAbiertos.has(clave));
}
function descartarAvisoAsistencia(r){
 const clave=claveAvisoAsistencia(r);avisosAsistenciaAbiertos.delete(clave);avisosAsistenciaCerrados.add(clave);
 const estado=leerAvisoAsistencia(r);if(!estado)return;
 try{estado.datos[clave]={aperturas:estado.aperturas,cerrado:true};localStorage.setItem(AVISO_ASISTENCIA_CLAVE,JSON.stringify(estado.datos));}catch(e){}
}
function cerrarAvisoAsistencia(){
 const r=S.ramos.find(r=>r.id===currentRamoId);if(!r||!mostrarAvisoAsistencia(r))return;
 descartarAvisoAsistencia(r);track('aviso_ofg_cerrar');renderRamo();
}
function activarFaltasDesdeAviso(){
 const r=S.ramos.find(r=>r.id===currentRamoId);if(!r||!mostrarAvisoAsistencia(r))return;
 descartarAvisoAsistencia(r);r.faltas=copiarFaltas({activo:true,cantidad:0,limite:null});
 save();track('aviso_ofg_activar');renderRamo();
 document.querySelector('#faltas-contador .faltas-editar')?.focus({preventScroll:true});
}
function avisoAsistenciaHTML(){return `<span class="asistencia-pregunta">¿El ramo tiene un mínimo de asistencia?</span><button type="button" class="asistencia-activar" onclick="activarFaltasDesdeAviso()">Activar contador de faltas</button><button type="button" class="asistencia-cerrar" aria-label="Cerrar aviso de asistencia" onclick="cerrarAvisoAsistencia()">×</button>`;}
function editarLimiteFaltas(boton){
 const r=S.ramos.find(r=>r.id===currentRamoId);if(!r||!faltasActivas(r)||!boton?.isConnected)return;
 const clave=claveAvisoAsistencia(r),campo=document.createElement('input');
 campo.type='text';campo.inputMode='numeric';campo.className='faltas-limite-campo';campo.maxLength=2;
 campo.value=r.faltas.limite==null?'':String(r.faltas.limite);campo.placeholder='Sin máximo';campo.setAttribute('aria-label','Máximo de faltas');
 let terminado=false;
 const vigente=()=>!esCuentaProfesor()&&S.ramos.includes(r)&&currentRamoId===r.id&&claveAvisoAsistencia(r)===clave;
 const guardar=()=>{
  if(terminado||!vigente())return;const limite=parseLimiteFaltas(campo.value);
  if(limite===undefined){campo.setAttribute('aria-invalid','true');showToast(`El máximo es un número entre 1 y ${FALTAS_MAX}. Déjalo vacío si no lo sabes.`);return;}
  terminado=true;
  if(limite!==r.faltas.limite){r.faltas=copiarFaltas({...r.faltas,limite});save();}
  renderRamo();
 };
 campo.addEventListener('input',()=>campo.removeAttribute('aria-invalid'));
 campo.addEventListener('blur',guardar);
 campo.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();terminado=true;campo.replaceWith(boton);boton.focus({preventScroll:true});}
  else if(e.key==='Enter'){e.preventDefault();guardar();if(terminado)document.querySelector('#faltas-contador .faltas-editar')?.focus({preventScroll:true});}
 });
 boton.replaceWith(campo);campo.focus({preventScroll:true});campo.select();
}
