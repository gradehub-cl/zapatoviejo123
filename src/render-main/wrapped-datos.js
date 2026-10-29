
// ─── WRAPPED: EL SEMESTRE EN HISTORIAS ───────────────────────────────────────
// Al cierre del semestre, Inicio ofrece un resumen en pantallas que se pasan
// tocando, como las historias. Se arma en el navegador con lo que ya está en
// `S`: no se guarda nada ni se migra nada. La comparación con el resto sale de
// `curso_posicion` y `universidad_posicion`, que solo devuelven porcentajes y
// solo desde cinco personas.
//
// La ventana habilita la acción, no declara completas las notas. El estudiante
// pulsa «Semestre terminado» y el motor revisa el cierre antes de la sorpresa.
// Fechas civiles en Chile, inicio inclusivo y término exclusivo. Sin atajos URL.
const WRAPPED_DESDE='2026-12-01',WRAPPED_HASTA='2027-02-01',WRAPPED_PERIODO='2026-2';
function wrappedDisponible(hoy){
  const d=hoy||new Date();
  if(!Number.isFinite(d.getTime()))return false;
  const partes=new Intl.DateTimeFormat('en',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
  const parte=t=>partes.find(p=>p.type===t).value;
  const iso=`${parte('year')}-${parte('month')}-${parte('day')}`;
  return iso>=WRAPPED_DESDE&&iso<WRAPPED_HASTA;
}

// Los ramos actuales; si ya se archivaron, solo el último del período de esta
// campaña. Nunca se reemplaza una cuenta parcial con un semestre anterior.
function ramosWrapped(){
  // Un ramo vacío también pertenece al cierre: no se oculta detrás del último
  // archivado ni se elimina del resumen para hacer pasar una cuenta parcial.
  if((S.ramos||[]).length)return {ramos:S.ramos,actual:true,label:WRAPPED_PERIODO};
  const h=(S.historial||[])[0];
  return h&&h.label===WRAPPED_PERIODO&&(h.ramos||[]).length?{ramos:h.ramos,actual:false,label:h.label}:null;
}

// No calcula promedios nuevos ni modifica el estado. Casillas, eximición,
// descartes e inasistencias se resuelven en la misma estructura que usa la app.
function cierreWrapped(base){
  const pendientes=[];
  for(const r of base&&base.ramos||[]){
    // El acta importada al historial ya trae la nota final confirmada.
    if(!base.actual&&Number.isFinite(r.avgOverride))continue;
    const {res,estructura}=calculoRamoConCompuertas(r);
    const faltantes=res.emptyLeaves.filter(n=>n.effectiveWeight>0).map(n=>n.name||'Evaluación sin nota');
    for(const c of estructura.children||[]){
      if(c.weight>0&&!c.children.length)faltantes.push(c.name||'Evaluaciones sin registrar');
    }
    if(!Number.isFinite(ramoAvg(r,undefined,base.ramos)))faltantes.push('Revisa la pauta y las notas de este ramo');
    if(faltantes.length)pendientes.push({id:r.id,nombre:r.nombre,evaluaciones:[...new Set(faltantes)]});
  }
  return {listo:!!base&&base.ramos.length>0&&pendientes.length===0,pendientes};
}

function revisarCierreWrapped(base,cierre){
  const cuenta=currentUser&&currentUser.id,tenant=S.tenant;
  const caja=document.getElementById('modal-content');
  caja.innerHTML=`<div class="modal-title">Antes de ver tu resumen</div>
    <p>Revisa estas evaluaciones para cerrar el semestre con tus notas finales.</p>
    <ul style="padding-left:20px;margin:16px 0;line-height:1.5;">${cierre.pendientes.map(r=>`<li><b>${esc(r.nombre)}</b><ul>${r.evaluaciones.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></li>`).join('')}</ul>
    <div class="modal-btns"><button class="btn-cancel" type="button" style="min-height:44px;">Ahora no</button>
    <button class="btn-confirm" type="button" style="min-height:44px;">Revisar notas</button></div>`;
  caja.querySelector('.btn-cancel').addEventListener('click',closeModal);
  caja.querySelector('.btn-confirm').addEventListener('click',()=>{
    closeModal();
    if(base.actual&&(currentUser&&currentUser.id)===cuenta&&S.tenant===tenant&&S.ramos===base.ramos&&S.ramos.some(r=>r.id===cierre.pendientes[0]?.id))openRamo(cierre.pendientes[0].id);
    else if(!base.actual&&(currentUser&&currentUser.id)===cuenta){renderStats();showTab('stats');}
  });
  openModal();
}

// Todo sale de `ramoAvg` y `gpa`: son las únicas fórmulas de promedio que hay,
// y el resumen tiene que decir los mismos números que Inicio.
function datosWrapped(ramos){
  const lista=ramosDelPromedio(ramos).map(r=>({r,avg:ramoAvg(r,undefined,ramos)})).filter(x=>x.avg!==null);
  if(!lista.length)return null;
  let mejor=null,nNotas=0;
  lista.forEach(({r})=>(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{
    if(typeof n.valor!=='number')return;
    nNotas++;
    if(!mejor||n.valor>mejor.valor)mejor={valor:n.valor,ramo:r.nombre,evaluacion:n.nombre||c.nombre};
  })));
  const orden=[...lista].sort((a,b)=>b.avg-a.avg);
  return {
    gpa:gpa(ramos),nRamos:lista.length,nNotas,mejor,
    colores:lista.map(x=>x.r.color),
    // Un color por nota, en orden de ramo: la grilla del semestre.
    notasColores:lista.flatMap(({r})=>(r.categorias||[]).flatMap(c=>(c.notas||[]).filter(n=>typeof n.valor==='number').map(()=>r.color))),
    ranking:orden.map(x=>({nombre:x.r.nombre,color:x.r.color,avg:x.avg})),
    aprobando:lista.filter(x=>notaAprobadaRamo(x.r,x.avg)).length,
    estrella:orden[0],
    // Con un solo ramo, "el que más te costó" sería la misma estrella.
    dificil:orden.length>1?orden[orden.length-1]:null,
  };
}

// Solo para el semestre en curso: es el que tiene promedios en `curso_notas`.
// Si el servidor no contesta o no llegan a cinco, esas pantallas no aparecen.
function posicionWrappedValida(f){
  return f&&Number.isInteger(f.total)&&f.total>=5&&Number.isFinite(f.mejorQue)&&f.mejorQue>=0&&f.mejorQue<=100;
}
async function comparacionWrapped(){
  if(!supabaseClient||!currentUser)return null;
  const cuenta=currentUser.id,tenant=S.tenant,out={};
  const vigente=()=>currentUser&&currentUser.id===cuenta&&S.tenant===tenant;
  try{
    await subirNotasCurso();
    if(!vigente())return null;
    invalidarPosicionesCurso();
    const pos=await cargarPosicionesCurso()||{};
    if(!vigente()){invalidarPosicionesCurso();return null;}
    const top=(S.ramos||[]).filter(r=>posicionWrappedValida(pos[r.id])).sort((a,b)=>pos[b.id].mejorQue-pos[a.id].mejorQue)[0];
    if(top)out.curso={ramo:top.nombre,total:pos[top.id].total,mejorQue:pos[top.id].mejorQue};
  }catch(e){} // La comparación es opcional, incluso si esa RPC no está aplicada.
  if(!vigente())return null;
  try{
    const {data,error}=await supabaseClient.rpc('universidad_posicion',{p_tenant:tenant});
    if(!vigente())return null;
    const f=Array.isArray(data)?data[0]:data;
    const uni=f&&{total:f.total,mejorQue:f.mejor_que};
    if(!error&&posicionWrappedValida(uni))out.uni=uni;
  }catch(e){}
  return vigente()?out:null;
}
