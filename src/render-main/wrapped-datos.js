
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
function cierreWrapped(base){return revisionCierreSemestre(base);}

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
function aprobadoWrapped(r,nota){
  return notaPortalValida(r.notaOficial)?notaAprobada(nota):notaAprobadaRamo(r,nota);
}
function datosWrapped(ramos){
  const cerrada=r=>notaPortalValida(r.notaOficial)||(ramos!==S.ramos&&notaPortalValida(r.avgOverride))||ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r));
  const lista=ramosDelPromedio(ramos).map(r=>({r,avg:notaRamoParaResumen(r,ramos)})).filter(x=>notaPortalValida(x.avg));
  if(!lista.length)return null;
  let mejor=null,nNotas=0;
  lista.forEach(({r})=>(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{
    if(!notaPortalValida(n.valor))return;
    nNotas++;
    if(!mejor||n.valor>mejor.valor)mejor={valor:n.valor,ramo:r.nombre,evaluacion:n.nombre||c.nombre};
  })));
  const orden=[...lista].sort((a,b)=>b.avg-a.avg);
  return {
    gpa:gpa(ramos),nRamos:lista.length,nNotas,mejor,
    colores:lista.map(x=>x.r.color),
    // Un color por nota, en orden de ramo: la grilla del semestre.
    notasColores:lista.flatMap(({r})=>(r.categorias||[]).flatMap(c=>(c.notas||[]).filter(n=>notaPortalValida(n.valor)).map(()=>r.color))),
    ranking:orden.map(x=>({nombre:x.r.nombre,color:x.r.color,avg:x.avg})),
    aprobando:lista.filter(x=>aprobadoWrapped(x.r,x.avg)).length,
    // Reprobado solo si ya no queda nada por registrar: un ramo abierto no se da por perdido.
    reprobados:lista.filter(x=>cerrada(x.r)&&!aprobadoWrapped(x.r,x.avg)).length,
    // «Cerraste» solo si de verdad no queda nada por registrar.
    completo:lista.every(x=>cerrada(x.r)),
    estrella:orden[0],
    // Con un solo ramo, "el que más te costó" sería la misma estrella.
    dificil:orden.length>1?orden[orden.length-1]:null,
  };
}

// Solo para el semestre en curso: es el que tiene promedios en `curso_notas`.
// Si el servidor no contesta o no llegan a diez compañeros, esas pantallas no aparecen.
function posicionWrappedValida(f){
  return posicionCursoVisible(f);
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

// ─── Lo nuevo del Wrapped 2026-2 (.claude/wrapped-concepto.md, sección 6) ───
// Todo se calcula acá, en el navegador, sin guardar nada ni enviarlo. Cada
// función devuelve null cuando no hay con qué decirlo: esa pantalla no sale.

// Las notas con valor y fecha, en orden de fecha; el empate conserva el orden
// en que están guardadas. `ruta` ubica la nota en el semestre clonado.
function notasFechadasWrapped(ramos){
  const out=[];
  (ramos||[]).forEach((r,ri)=>(r.categorias||[]).forEach((c,ci)=>(c.notas||[]).forEach((n,ni)=>{
    const fecha=String(n&&(n.fecha||c.fecha)||'').slice(0,10);
    if(notaPortalValida(n?.valor)&&fechaLocalDesdeISO(fecha))
      out.push({r,c,n,fecha,ruta:[ri,ci,ni],orden:out.length,nombre:n.nombre||c.nombre||'Evaluación'});
  })));
  return out.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:a.orden-b.orden);
}
function fechaCortaWrapped(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString('es-CL',{day:'numeric',month:'long',timeZone:'UTC'});
}
// La semana (de lunes a domingo) con más evaluaciones rendidas. Desde tres.
// `dias` cuenta cuántas cayeron cada día, de lunes a domingo, para dibujarla.
function semanaPesadaWrapped(fechadas){
  const por=new Map();
  fechadas.forEach(x=>{
    const [y,m,d]=x.fecha.split('-').map(Number),t=Date.UTC(y,m-1,d),dia=(new Date(t).getUTCDay()+6)%7;
    const lunes=new Date(t-dia*864e5).toISOString().slice(0,10);
    if(!por.has(lunes))por.set(lunes,[0,0,0,0,0,0,0]);
    por.get(lunes)[dia]++;
  });
  let mejor=null;por.forEach((dias,lunes)=>{const k=dias.reduce((s,n)=>s+n,0);if(!mejor||k>mejor.k||(k===mejor.k&&lunes<mejor.lunes))mejor={lunes,k,dias};});
  return mejor&&mejor.k>=3?{...mejor,texto:fechaCortaWrapped(mejor.lunes)}:null;
}
// El promedio del ramo después de cada nota fechada, con la pauta y el motor
// de la ficha. La reconstrucción se hace sobre una copia.
function evolucionWrapped(ramos,fechadas){
  if(fechadas.length<2)return null;
  const copia=JSON.parse(JSON.stringify(ramos));
  const llave=ruta=>ruta.join('.');
  const valores=new Map(fechadas.map(x=>[llave(x.ruta),x.n.valor]));
  copia.forEach((r,ri)=>(r.categorias||[]).forEach((c,ci)=>(c.notas||[]).forEach((n,ni)=>{
    if(valores.has(llave([ri,ci,ni])))n.valor=null;
  })));
  return fechadas.map(x=>{
    const [ri,ci,ni]=x.ruta;
    copia[ri].categorias[ci].notas[ni].valor=x.n.valor;
    return {x,avgRamo:ramoAvg(copia[ri],undefined,copia),ri};
  });
}
// Un ramo que estuvo bajo 4,0 después de su segunda nota y terminó aprobado.
// `serie` es el promedio del ramo después de cada nota, para dibujar la curva.
function remontadaWrapped(ramos,evo){
  if(!evo)return null;
  let mejor=null;
  ramos.forEach((r,ri)=>{
    const pasos=evo.filter(p=>p.ri===ri&&p.avgRamo!==null);
    if(pasos.length<3)return;
    if(pasos.length!==(r.categorias||[]).flatMap(c=>c.notas||[]).filter(n=>notaPortalValida(n.valor)).length)return;
    const final=notaRamoParaResumen(r,ramos);
    if(!notaPortalValida(final)||!aprobadoWrapped(r,final))return;
    const bajo=pasos.slice(1,-1).reduce((m,p)=>!m||p.avgRamo<m.avgRamo?p:m,null);
    if(!bajo||Number(fmtPromedioDato(bajo.avgRamo))>=4)return;
    const subida=final-bajo.avgRamo;
    if(!mejor||subida>mejor.subida)mejor={r,subida,minimo:bajo.avgRamo,final,mes:fechaCortaWrapped(bajo.x.fecha).split(' ').pop(),serie:pasos.map(p=>p.avgRamo),iMinimo:pasos.indexOf(bajo)};
  });
  return mejor;
}
// El promedio simple de las notas de cada mitad del semestre, por fecha. Es una
// descripción de cómo se repartieron las notas, no la nota de nada.
function mitadesWrapped(fechadas){
  if(fechadas.length<4)return null;
  const m=Math.floor(fechadas.length/2),prom=xs=>xs.reduce((s,x)=>s+x.n.valor,0)/xs.length;
  return {primera:prom(fechadas.slice(0,m)),segunda:prom(fechadas.slice(m))};
}
// Una personalidad por reglas fijas; la primera que se cumple gana.
const PERSONALIDADES_WRAPPED=[
  {id:'remontada',nombre:'Remontada profesional',frase:'La segunda parte cambió la historia.'},
  {id:'siete',nombre:'Siete sin miedo',frase:'Más de una vez llenaste la casilla con un siete.'},
  {id:'parejo',nombre:'Siempre parejo',frase:'Tus notas quedaron cerquita unas de otras.'},
  {id:'arranque',nombre:'Arranque fuerte',frase:'Tus primeras notas marcaron el ritmo.'},
  {id:'maraton',nombre:'Maratonista',frase:'Hubo varios ramos que acompañar a la vez.'},
  {id:'filo',nombre:'Al filo, pero adentro',frase:'Hubo un ramo que cerraste por unas décimas.'},
  {id:'construccion',nombre:'A tu ritmo',frase:'Cada ramo tuvo su propio ritmo.'},
];
function personalidadWrapped(d){
  const valores=d.valores;
  if(!valores.length)return null;
  const media=valores.reduce((s,v)=>s+v,0)/valores.length;
  const desvio=Math.sqrt(valores.reduce((s,v)=>s+(v-media)**2,0)/valores.length);
  const todos=d.aprobando===d.nRamos,mit=d.mitades;
  const reglas={
    remontada:!!d.remontada||(!!mit&&mit.segunda-mit.primera>=0.8),
    siete:valores.filter(v=>v>=7).length>=2,
    parejo:valores.length>=3&&desvio<=0.4,
    arranque:!!mit&&mit.primera-mit.segunda>=0.8&&todos,
    maraton:d.nRamos>=7||(d.semana?.k||0)>=5,
    filo:todos&&d.ranking.some(x=>{const v=Number(fmtPromedioDato(x.avg));return v>=4&&v<=4.2;}),
    construccion:true,
  };
  const elegida=PERSONALIDADES_WRAPPED.find(p=>reglas[p.id]);
  // Se muestran cinco alternativas en el orden fijo, siempre con la elegida.
  const otras=PERSONALIDADES_WRAPPED.filter(p=>p!==elegida&&p.id!=='construccion');
  const opciones=PERSONALIDADES_WRAPPED.filter(p=>p===elegida||otras.slice(0,4).includes(p)).slice(0,5);
  return {...elegida,opciones,letra:'ABCDE'[opciones.indexOf(elegida)]};
}
function extrasWrapped(d,ramos){
  const fechadas=notasFechadasWrapped(ramos);
  d.valores=ramos.flatMap(r=>(r.categorias||[]).flatMap(c=>(c.notas||[]).filter(n=>notaPortalValida(n.valor)).map(n=>n.valor)));
  d.semana=semanaPesadaWrapped(fechadas);
  d.remontada=remontadaWrapped(ramos,evolucionWrapped(ramos,fechadas));
  d.mitades=mitadesWrapped(fechadas);
  d.personalidad=personalidadWrapped(d);
  return d;
}

// Solo los ramos identificables del plan registrado. No extrapola los optativos,
// menciones ni semestres ausentes a un porcentaje del título.
function avanceCreditosWrapped(malla,creditos,aprobadas){
  if(!malla||!creditos)return null;
  const plan=new Map();
  for(const nombre of Object.values(malla).flat()){
    const ficha=creditos[nombre];
    if(!Array.isArray(ficha)||!Number.isFinite(ficha[0])||ficha[0]<0)return null;
    const id=ficha[1]||nombre;
    if(plan.has(id)&&plan.get(id)!==ficha[0])return null;
    plan.set(id,ficha[0]);
  }
  let total=0,aprobados=0,ramos=0;
  for(const [id,peso] of plan){
    total+=peso;
    if(peso>0&&aprobadas.has(id)){aprobados+=peso;ramos++;}
  }
  return total>0&&ramos>=2?{total,aprobados}:null;
}
function avanceMallaWrapped(ramos,historial,tenant,carrera,ramosArchivados=false){
  const plan=mallaFor(tenant)[carrera],tabla=CREDITOS_POR_TENANT[tenant];
  if(!plan||!tabla)return null;
  const aprobadas=new Set();
  const campana=parseEtiquetaSemestre(WRAPPED_PERIODO);
  const previos=historial.filter(h=>{
    const p=parseEtiquetaSemestre(h.label);
    return p&&(p.anio<campana.anio||(p.anio===campana.anio&&p.periodo!==campana.periodo));
  });
  for(const grupo of [...previos.map(h=>h.ramos||[]),ramos]){
    const actual=grupo===ramos&&!ramosArchivados;
    const pendientes=new Set(revisionCierreSemestre({ramos:grupo,actual}).pendientes.map(r=>r.id));
    for(const r of grupo){
      if((r.origen?.tenant||r.cierre?.tenant||tenant)!==tenant)continue;
      const ficha=tabla[r.nombre];
      const sigla=r.sigla||r.cierre?.sigla||r.origen?.ramoKey;
      const id=sigla?String(sigla).toUpperCase():ficha&&(ficha[1]||r.nombre);
      if(!id||aprobadas.has(id)||pendientes.has(r.id))continue;
      const acta=notaPortalValida(r.notaOficial)||(!actual&&notaPortalValida(r.avgOverride));
      if(!acta&&!ramoCompletamenteEvaluado(r,calculoRamoConCompuertas(r)))continue;
      const nota=notaRamoParaResumen(r,grupo);
      if(notaPortalValida(nota)&&aprobadoWrapped(r,nota))aprobadas.add(id);
    }
  }
  return avanceCreditosWrapped(plan,tabla,aprobadas);
}
