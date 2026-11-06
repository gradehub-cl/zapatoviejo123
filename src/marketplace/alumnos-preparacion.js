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
// Una sola escritura para ambas presentaciones. La respuesta vigente manda;
// un error o una navegación no cambia las marcas ni los cálculos guardados.
async function guardarPreparacionPanel(al,r,marcas,rpc,vigente){
 const clave=clavePreparacionPanel(al);
 if(!vigente())return false;
 const {data,error}=await rpc('guardar_preparacion_alumno',{p_id:al.id,p_ramo:r.id,p_marcas:marcas});
 if(error)throw error;
 if(!vigente()||clave!==clavePreparacionPanel(al))return false;
 if(!Array.isArray(data?.ramos))throw Error('Respuesta sin marcas');
 const otras=(al.preparacion?.ramos||[]).filter(p=>p.ramo_id!==r.id);
 al.preparacion={ramos:[...otras,...data.ramos]};preparacionesPanel.set(clave,al.preparacion);return true;
}
function enlazarPreparacionPanel(caja,al,r,rpc,alGuardar,vigente,{alEditar=()=>{},alCancelar=()=>{}}={}){
 const panel=caja.querySelector('[data-preparacion-ramo]'),pre=preparacionRamoPanel(al,r);if(!panel||!pre||al.preparacion?.errorCarga)return;
 let huerfanas=(pre.marcas||[]).filter(m=>m.huerfana),guardando=false;
 const entradas=[...panel.querySelectorAll('[data-preparacion-eval]')],original=entradas.map(b=>b.checked);
 const editar=()=>{
  if(!vigente()||guardando)return;
  panel.querySelectorAll('.fap-casilla,.fap-edicion').forEach(n=>n.hidden=false);
  panel.querySelectorAll('.fap-marca-ver').forEach(n=>n.hidden=true);
  alEditar();
 };
 caja.querySelectorAll('[data-fap-editar]').forEach(b=>b.addEventListener('click',()=>{editar();panel.querySelector('input:not(:disabled)')?.focus();}));
 const cambios=()=>{
  const n=entradas.filter((b,i)=>b.checked!==original[i]).length+(pre.marcas||[]).filter(m=>m.huerfana).length-huerfanas.length;
  const texto=panel.querySelector('[data-fap-cambios]');if(texto)texto.textContent=n+' '+(n===1?'cambio sin guardar':'cambios sin guardar');
  const boton=panel.querySelector('[data-preparacion-guardar]');if(boton&&texto)boton.disabled=!n;
 };
 entradas.forEach(b=>b.addEventListener('change',cambios));
 panel.querySelector('[data-fap-cancelar]')?.addEventListener('click',()=>{if(guardando)return;alCancelar();alGuardar();});
 panel.querySelectorAll('[data-preparacion-huerfana]').forEach(b=>{const marca=huerfanas[Number(b.dataset.preparacionHuerfana)];b.addEventListener('click',()=>{editar();huerfanas=huerfanas.filter(x=>x!==marca);b.closest('p').remove();cambios();});});
 const guardar=async marcas=>{
  if(!vigente()||guardando)return;guardando=true;alEditar();
  const botones=[...caja.querySelectorAll('button,input')],deshabilitados=botones.map(b=>b.disabled);botones.forEach(b=>b.disabled=true);
  try{if(await guardarPreparacionPanel(al,r,marcas,rpc,vigente)){alCancelar();alGuardar();}}
  catch(e){if(vigente()){
   const estado=panel.querySelector('[data-preparacion-estado]');if(estado)estado.textContent='No pudimos guardar. Las marcas anteriores siguen vigentes. Reintenta o cancela.';
   botones.forEach((b,i)=>b.disabled=deshabilitados[i]);
  }}finally{guardando=false;}
 };
 panel.querySelector('[data-preparacion-guardar]')?.addEventListener('click',()=>guardar(entradas.filter(b=>b.checked).map(b=>{const e=pre.evaluaciones[Number(b.dataset.preparacionEval)];return e.nota_id?{nota_id:e.nota_id}:{cat_id:e.cat_id,numero:e.numero};}).concat(huerfanas)));
 panel.querySelector('[data-preparacion-auto]')?.addEventListener('click',()=>showConfirm('Usar la fecha de inicio','Se borran las marcas de este ramo y se vuelve a comparar por fecha.',()=>guardar(null),{label:'Usar fecha',focusCancel:true}));
}
function comparacionPreparadasHTML(m){
 const dato=x=>x.diferencia===null?'No disponible':conSignoPanel(x.diferencia)+' puntos frente a GradeHub';
 return `<section class="preparacion-comparacion"><h3>Preparadas / No preparadas</h3><div><p>No preparadas <b>${esc(dato(m.antes))}</b><small>${m.antes.nComparadas} comparables</small></p><p>Preparadas <b>${esc(dato(m.ahora))}</b><small>${m.ahora.nComparadas} comparables</small></p></div><p>${m.cambio===null?`Se necesitan ${MIN_EVALS_COMPARACION} evaluaciones comparables en cada grupo.`:`Cambio entre grupos: ${esc(conSignoPanel(m.cambio))} puntos.`} No demuestra el efecto de las clases.</p>${percentilesPanelHTML(resumenPercentilesPanel(m),{manual:true})}</section>`;
}
function grupoPreparadasHTML(g){return `<section class="preparacion-panel"><h2>Por evaluaciones marcadas</h2><p>${g.totalAlumnos} alumnos en ${g.totalRamos} ramos. Cambio mediano: ${g.cambioMediana===null?'No disponible':esc(conSignoPanel(g.cambioMediana))+' puntos'}. No es una comparación por fecha.</p>${percentilesPanelHTML(g.percentiles,{grupo:true,manual:true})}${g.alumnos.map(m=>`<div><button type="button" data-ver-alumno="${esc(m.id)}" data-alumno-ramo="${esc(m.ramoId)}"><b>${esc(m.nombre)} · ${esc(m.ramo)}</b>${m.sigla?` <small class="ah-fila-sigla">${esc(m.sigla)}</small>`:''}</button>${comparacionPreparadasHTML(m)}</div>`).join('')}</section>`;}
async function verPreparacionCompartida(id){
 const cuenta=currentUser?.id,caja=document.getElementById('modal-content');if(!cuenta||!caja)return;
 caja.innerHTML='<div class="modal-title">Evaluaciones preparadas</div><p role="status">Consultando…</p><button type="button" class="btn-cancel" data-preparacion-volver>Volver</button>';caja.querySelector('button').onclick=closeModal;openModal();
 try{const {data,error}=await supabaseClient.rpc('preparacion_alumno',{p_id:id});if(error)throw error;if(currentUser?.id!==cuenta||!caja.querySelector('[data-preparacion-volver]'))return;
  caja.querySelector('[role=status]').innerHTML=(data.ramos||[]).map(r=>`<section><h3>${esc(S.ramos.find(x=>x.id===r.ramo_id)?.nombre||'Ramo compartido')}</h3><p>${r.manual?'Selección declarada por el profesor':'Se usa la fecha de inicio'}</p><ul>${(r.marcas||[]).map(m=>`<li>${m.huerfana?'Marca sin evaluación: ':''}${esc(m.nombre)} · ${esc(m.categoria)}</li>`).join('')}</ul></section>`).join('');
 }catch(e){if(currentUser?.id===cuenta&&caja.querySelector('[role=status]'))caja.querySelector('[role=status]').textContent='No pudimos cargar las marcas. Vuelve a intentarlo; puedes dejar de compartir desde Ajustes.';}
}

function gruposParecidosFormularioHTML(al,r){
 const pre=preparacionRamoPanel(al,r);if(!pre||al.preparacion?.errorCarga)return '';
 const bases=(pre.evaluaciones||[]).filter(e=>e.nota_id&&Number.isFinite(e.nota)&&e.fecha&&!e.ambigua);
 if(!bases.length)return '';
 return `<details class="est-tarjeta-grande fap-grupos" data-grupos-parecidos>
   <summary><strong>Alumnos que partieron igual</strong></summary>
   <p>Elige una evaluación y un rango de nota. Se comparan evaluaciones posteriores con fecha en ambos grupos.</p>
   <form>
     <label>Evaluación de partida<select name="base">${bases.map(e=>`<option value="${esc(e.nota_id)}">${esc(e.nombre)}</option>`).join('')}</select></label>
     <div class="fap-grupos-rango"><label>Nota desde<input name="minimo" type="number" min="1" max="7" step="0.1" value="2.5" required></label><label>Nota hasta<input name="maximo" type="number" min="1" max="7" step="0.1" value="3.5" required></label></div>
     <button type="submit" class="est-control">Comparar grupo</button>
   </form>
   <div data-grupos-resultado role="status"></div>
 </details>`;
}
function gruposParecidosResultadoHTML(x){
 if(!x?.disponible||!Number.isInteger(x.gradehub?.n)||x.gradehub.n<5||!Number.isInteger(x.propios?.n)||x.propios.n<1)return '<p>No hay suficientes estudiantes con notas y fechas en este rango. Prueba con un rango más amplio u otra evaluación de partida.</p>';
 const coma=t=>String(t).replace('.',',');
 const fila=(nombre,g)=>`<div><h4>${nombre} · ${g.n} ${g.n===1?'estudiante':'estudiantes'}</h4><p>Nota de partida ${esc(coma(unDecimalPanel(g.inicial)))} → posterior ${esc(coma(unDecimalPanel(g.posterior)))}. Cambio ${esc(coma(conSignoPanel(g.cambio)))} puntos.</p>${percentilesPanelHTML({antes:g.percentil_inicial,ahora:g.percentil_posterior,cambio:g.cambio_percentil})}</div>`;
 return `<div class="fap-grupos-resultados">${fila('Tus alumnos del rango',x.propios)}${fila('Resto de GradeHub del rango',x.gradehub)}</div>
   <p>${x.metodos?.includes('fecha')?'Incluye preparación inferida por fecha de inicio.':'Preparación según tus marcas.'} Cada estudiante pesa una vez. Tus alumnos cuentan en las evaluaciones que prepararon. El resto de GradeHub excluye tus conexiones. No demuestra que el cambio se deba a las clases.</p>`;
}
function enlazarGruposParecidos(caja,al,r,rpc,vigente,puedeSalirFicha){
 const panel=caja.querySelector('[data-grupos-parecidos]');if(!panel)return;
 const form=panel.querySelector('form'),salida=panel.querySelector('[data-grupos-resultado]');
 const sigue=()=>vigente()&&caja.contains(panel);
 let consultando=false;
 form.addEventListener('input',()=>{salida.textContent='Vuelve a comparar para aplicar la selección.';});
 form.addEventListener('submit',async evento=>{
  evento.preventDefault();
  if(consultando||!puedeSalirFicha()||!sigue()||!form.reportValidity())return;
  const {base,minimo,maximo}=form.elements,desde=Number(minimo.value),hasta=Number(maximo.value);
  if(desde>hasta){salida.textContent='El mínimo no puede superar el máximo.';return;}
  consultando=true;
  const controles=[...form.querySelectorAll('input,select,button')];
  controles.forEach(b=>b.disabled=true);
  salida.textContent='Comparando…';
  try{
   const {data,error}=await rpc('grupos_parecidos_profesor',{p_id:al.id,p_ramo:r.id,p_nota_base:base.value,p_min:desde,p_max:hasta});
   if(!sigue())return;
   if(error)throw error;
   salida.innerHTML=gruposParecidosResultadoHTML(data);
  }catch(e){
   if(sigue())salida.textContent=['PGRST202','42883'].includes(e?.code)
     ?'Esta comparación no está disponible por ahora.':'No pudimos comparar el grupo. Vuelve a intentarlo.';
  }finally{
   consultando=false;
   if(sigue())controles.forEach(b=>b.disabled=false);
  }
 });
}
