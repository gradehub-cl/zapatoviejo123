// Declaraciones del profesor: memoria de pantalla, nunca notas ni localStorage.
const preparacionesPanel=new Map();
const clavePreparacionPanel=al=>`${currentUser?.id}|${al.id}`;
function preparacionRamoPanel(al,r){return al.preparacion?.ramos?.find(x=>x.ramo_id===r.id)||null;}
async function cargarPreparacionPanel(al,rpc){
 const clave=clavePreparacionPanel(al),anterior=preparacionesPanel.get(clave);
 try{const {data,error}=await rpc('preparacion_alumno',{p_id:al.id});if(error)throw error;
  if(clave!==clavePreparacionPanel(al))return;
  al.preparacion=data;preparacionesPanel.set(clave,data);
 }catch(e){if(clave!==clavePreparacionPanel(al))return;al.preparacion=anterior?{...anterior,errorCarga:true}:['PGRST202','42883'].includes(e?.code)?null:{ramos:[],errorCarga:true};}
}
function coincideMarcaPreparada(m,e){return !m.huerfana&&m.nota_id&&m.nota_id===e.id;}
function preparacionRamoHTML(al,r){
 const pre=preparacionRamoPanel(al,r);
 if(al.preparacion?.errorCarga)return '<p class="pe-sub" role="status">No pudimos actualizar las marcas de preparación. Reabre Alumnos para reintentar; no cambiamos el método guardado.</p>';
 if(!pre)return '';
 const marcada=e=>(pre.marcas||[]).some(m=>!m.huerfana&&(e.nota_id?m.nota_id===e.nota_id:!m.nota_id&&m.cat_id===e.cat_id&&m.numero===e.numero));
 return `<section class="preparacion-panel" data-preparacion-ramo="${esc(r.id)}"><h3>Preparación de evaluaciones</h3><p>${pre.manual?'Preparadas / No preparadas según tus marcas.':'Por ahora se usa la fecha de inicio. La primera marca activa tu selección manual.'}</p>
 <div class="preparacion-lista">${(pre.evaluaciones||[]).map((e,i)=>`<label><input type="checkbox" data-preparacion-eval="${i}"${marcada(e)?' checked':''}${e.ambigua?' disabled':''}><span><b>${esc(e.nombre||e.categoria)}</b><small>${esc(e.categoria||'')}${e.nota_id?'':' · Futura, sin nota guardada'}${e.ambigua?' · No se puede identificar':''}</small></span></label>`).join('')}</div>
 ${(pre.marcas||[]).filter(m=>m.huerfana).map((m,i)=>`<p class="preparacion-huerfana">Marca sin evaluación: ${esc(m.nombre)} de ${esc(m.categoria)} <button type="button" data-preparacion-huerfana="${i}">Borrar marca</button></p>`).join('')}
 <button type="button" data-preparacion-guardar>Guardar selección</button>${pre.manual?'<button type="button" data-preparacion-auto>Volver a usar la fecha de inicio</button>':''}<p role="status" data-preparacion-estado></p></section>`;
}
function enlazarPreparacionPanel(caja,al,r,rpc,alGuardar,vigente){
 const panel=caja.querySelector('[data-preparacion-ramo]'),pre=preparacionRamoPanel(al,r);if(!panel||!pre)return;
 let huerfanas=(pre.marcas||[]).filter(m=>m.huerfana);
 panel.querySelectorAll('[data-preparacion-huerfana]').forEach(b=>{const marca=huerfanas[Number(b.dataset.preparacionHuerfana)];b.addEventListener('click',()=>{huerfanas=huerfanas.filter(x=>x!==marca);b.closest('p').remove();});});
 const guardar=async marcas=>{
  if(!vigente())return;const botones=[...panel.querySelectorAll('button,input')],deshabilitados=botones.map(b=>b.disabled);botones.forEach(b=>b.disabled=true);
  try{const {data,error}=await rpc('guardar_preparacion_alumno',{p_id:al.id,p_ramo:r.id,p_marcas:marcas});if(error)throw error;if(!vigente())return;
   const otras=(al.preparacion?.ramos||[]).filter(p=>p.ramo_id!==r.id);al.preparacion={ramos:[...otras,...data.ramos]};preparacionesPanel.set(clavePreparacionPanel(al),al.preparacion);alGuardar();
  }catch(e){if(vigente()){panel.querySelector('[data-preparacion-estado]').textContent='No pudimos guardar. Las marcas anteriores siguen vigentes. Reintenta o vuelve a Alumnos si dejó de compartir.';botones.forEach((b,i)=>b.disabled=deshabilitados[i]);}}
 };
 panel.querySelector('[data-preparacion-guardar]').addEventListener('click',()=>guardar([...panel.querySelectorAll('input:checked')].map(b=>{const e=pre.evaluaciones[Number(b.dataset.preparacionEval)];return e.nota_id?{nota_id:e.nota_id}:{cat_id:e.cat_id,numero:e.numero};}).concat(huerfanas)));
 panel.querySelector('[data-preparacion-auto]')?.addEventListener('click',()=>guardar(null));
}
function comparacionPreparadasHTML(m){
 const dato=x=>x.diferencia===null?'No disponible':conSignoPanel(x.diferencia)+' puntos frente a GradeHub';
 return `<section class="preparacion-comparacion"><h3>Preparadas / No preparadas</h3><div><p>No preparadas <b>${esc(dato(m.antes))}</b><small>${m.antes.nComparadas} comparables</small></p><p>Preparadas <b>${esc(dato(m.ahora))}</b><small>${m.ahora.nComparadas} comparables</small></p></div><p>${m.cambio===null?`Se necesitan ${MIN_EVALS_COMPARACION} evaluaciones comparables en cada grupo.`:`Cambio entre grupos: ${esc(conSignoPanel(m.cambio))} puntos.`} No demuestra el efecto de las clases.</p></section>`;
}
function grupoPreparadasHTML(g){return `<section class="preparacion-panel"><h2>Por evaluaciones marcadas</h2><p>${g.totalAlumnos} alumnos en ${g.totalRamos} ramos. Cambio mediano: ${g.cambioMediana===null?'No disponible':esc(conSignoPanel(g.cambioMediana))+' puntos'}. No es una comparación por fecha.</p>${g.alumnos.map(m=>`<div><button type="button" data-ver-alumno="${esc(m.id)}" data-alumno-ramo="${esc(m.ramoId)}"><b>${esc(m.nombre)} · ${esc(m.ramo)}</b>${m.sigla?` <small class="ah-fila-sigla">${esc(m.sigla)}</small>`:''}</button>${comparacionPreparadasHTML(m)}</div>`).join('')}</section>`;}
async function verPreparacionCompartida(id){
 const cuenta=currentUser?.id,caja=document.getElementById('modal-content');if(!cuenta||!caja)return;
 caja.innerHTML='<div class="modal-title">Evaluaciones preparadas</div><p role="status">Consultando…</p><button type="button" class="btn-cancel" data-preparacion-volver>Volver</button>';caja.querySelector('button').onclick=closeModal;openModal();
 try{const {data,error}=await supabaseClient.rpc('preparacion_alumno',{p_id:id});if(error)throw error;if(currentUser?.id!==cuenta||!caja.querySelector('[data-preparacion-volver]'))return;
  caja.querySelector('[role=status]').innerHTML=(data.ramos||[]).map(r=>`<section><h3>${esc(S.ramos.find(x=>x.id===r.ramo_id)?.nombre||'Ramo compartido')}</h3><p>${r.manual?'Selección declarada por el profesor':'Se usa la fecha de inicio'}</p><ul>${(r.marcas||[]).map(m=>`<li>${m.huerfana?'Marca sin evaluación: ':''}${esc(m.nombre)} · ${esc(m.categoria)}</li>`).join('')}</ul></section>`).join('');
 }catch(e){if(currentUser?.id===cuenta&&caja.querySelector('[role=status]'))caja.querySelector('[role=status]').textContent='No pudimos cargar las marcas. Vuelve a intentarlo; puedes dejar de compartir desde Ajustes.';}
}
