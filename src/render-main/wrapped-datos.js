
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
function datosWrapped(ramos){
  const lista=ramosDelPromedio(ramos).map(r=>({r,avg:notaRamoParaResumen(r,ramos)})).filter(x=>x.avg!==null);
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
    // Reprobado solo si ya no queda nada por registrar: un ramo abierto no se da por perdido.
    reprobados:lista.filter(x=>ramoCompletamenteEvaluado(x.r)&&!notaAprobadaRamo(x.r,x.avg)).length,
    // «Cerraste» solo si de verdad no queda nada por registrar.
    completo:lista.every(x=>ramoCompletamenteEvaluado(x.r)),
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
    if(typeof n?.valor==='number'&&/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      out.push({r,c,n,fecha,ruta:[ri,ci,ni],orden:out.length,nombre:n.nombre||c.nombre||'Evaluación'});
  })));
  return out.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:a.orden-b.orden);
}
function fechaCortaWrapped(iso){
  const [y,m,d]=iso.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString('es-CL',{day:'numeric',month:'long',timeZone:'UTC'});
}
// La semana (de lunes a domingo) con más evaluaciones rendidas. Desde tres.
function semanaPesadaWrapped(fechadas){
  const por=new Map();
  fechadas.forEach(x=>{
    const [y,m,d]=x.fecha.split('-').map(Number),t=Date.UTC(y,m-1,d),dia=(new Date(t).getUTCDay()+6)%7;
    const lunes=new Date(t-dia*864e5).toISOString().slice(0,10);
    por.set(lunes,(por.get(lunes)||0)+1);
  });
  let mejor=null;por.forEach((k,lunes)=>{if(!mejor||k>mejor.k||(k===mejor.k&&lunes<mejor.lunes))mejor={lunes,k};});
  return mejor&&mejor.k>=3?{...mejor,texto:fechaCortaWrapped(mejor.lunes)}:null;
}
// El semestre como se fue llenando: el promedio general después de cada nota,
// con el mismo `gpa()` de Inicio sobre una copia que solo tiene las notas
// rendidas hasta ese momento. Nunca un promedio propio.
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
    return {x,g:gpa(copia),avgRamo:ramoAvg(copia[ri],undefined,copia),ri};
  });
}
// La nota que más subió el promedio. Desde una décima, como se ve en pantalla.
// Se mide recién cuando todos los ramos tienen alguna nota: antes, cualquier
// nota mueve mucho un promedio de uno o dos ramos y la cifra engañaría.
function notaQueMovioWrapped(evo){
  if(!evo)return null;
  const ramos=new Set(evo.map(p=>p.ri)),vistos=new Set();
  let desde=evo.length;
  for(let i=0;i<evo.length;i++){vistos.add(evo[i].ri);if(vistos.size===ramos.size){desde=i+1;break;}}
  let mejor=null;
  for(let i=desde;i<evo.length;i++){
    const a=evo[i-1].g,b=evo[i].g;
    if(a===null||b===null)continue;
    const delta=Number(fmtPromedio(b))-Number(fmtPromedio(a));
    if(delta>=0.1-1e-9&&(!mejor||delta>mejor.delta))mejor={delta,x:evo[i].x};
  }
  return mejor;
}
// Un ramo que estuvo bajo 4,0 después de su segunda nota y terminó aprobado.
function remontadaWrapped(ramos,evo){
  if(!evo)return null;
  let mejor=null;
  ramos.forEach((r,ri)=>{
    const pasos=evo.filter(p=>p.ri===ri&&p.avgRamo!==null);
    if(pasos.length<3)return;
    const final=ramoAvg(r,undefined,ramos);
    if(final===null||!notaAprobadaRamo(r,final))return;
    const bajo=pasos.slice(1,-1).reduce((m,p)=>!m||p.avgRamo<m.avgRamo?p:m,null);
    if(!bajo||Number(fmtPromedio(bajo.avgRamo))>=4)return;
    const subida=final-bajo.avgRamo;
    if(!mejor||subida>mejor.subida)mejor={r,subida,minimo:bajo.avgRamo,final,mes:fechaCortaWrapped(bajo.x.fecha).split(' ').pop()};
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
  {id:'remontada',nombre:'Remontada profesional',frase:'Cuando parecía perdido, apareciste.'},
  {id:'siete',nombre:'Siete sin miedo',frase:'Algunos sueñan con un 7. Tú los coleccionas.'},
  {id:'parejo',nombre:'Siempre parejo',frase:'Pase lo que pase, tú: constante.'},
  {id:'arranque',nombre:'Arranque fuerte',frase:'Saliste a ganar desde la primera prueba.'},
  {id:'maraton',nombre:'Maratonista',frase:'Más ramos que horas en el día. Y aun así.'},
  {id:'filo',nombre:'Al filo, pero adentro',frase:'Cada décima cuenta. Tú lo sabes mejor que nadie.'},
  {id:'construccion',nombre:'En construcción',frase:'Cada semestre se escribe distinto. Este fue tuyo.'},
];
function personalidadWrapped(d){
  const valores=d.valores,media=valores.reduce((s,v)=>s+v,0)/valores.length;
  const desvio=Math.sqrt(valores.reduce((s,v)=>s+(v-media)**2,0)/valores.length);
  const todos=d.aprobando===d.nRamos,mit=d.mitades;
  const reglas={
    remontada:!!d.remontada||(!!mit&&mit.segunda-mit.primera>=0.8),
    siete:valores.filter(v=>v>=7).length>=2,
    parejo:valores.length>=3&&desvio<=0.4,
    arranque:!!mit&&mit.primera-mit.segunda>=0.8&&todos,
    maraton:d.nRamos>=7||(d.semana?.k||0)>=5,
    filo:todos&&d.ranking.some(x=>{const v=Number(fmtPromedio(x.avg));return v>=4&&v<=4.2;}),
    construccion:true,
  };
  const elegida=PERSONALIDADES_WRAPPED.find(p=>reglas[p.id]);
  // Se muestran cinco alternativas en el orden fijo, siempre con la elegida.
  const otras=PERSONALIDADES_WRAPPED.filter(p=>p!==elegida&&p.id!=='construccion');
  const opciones=PERSONALIDADES_WRAPPED.filter(p=>p===elegida||otras.slice(0,4).includes(p)).slice(0,5);
  return {...elegida,opciones,letra:'ABCDE'[opciones.indexOf(elegida)]};
}
// Contra el semestre anterior del historial. Una baja no se muestra.
function frenteAnteriorWrapped(gpaActual,actual){
  const h=(S.historial||[]).filter(x=>Number.isFinite(x.gpa))[actual?0:1];
  if(!h||gpaActual===null)return null;
  const delta=Number(fmtPromedio(gpaActual))-Number(fmtPromedio(h.gpa));
  if(delta<=-0.05)return null;
  return {label:h.label,delta:Math.round(delta*10)/10};
}
function extrasWrapped(d,ramos,actual){
  const fechadas=notasFechadasWrapped(ramos);
  const evo=evolucionWrapped(ramos,fechadas);
  const primera=fechadas[0]||null;
  const e={
    valores:ramos.flatMap(r=>(r.categorias||[]).flatMap(c=>(c.notas||[]).filter(n=>typeof n.valor==='number').map(n=>n.valor))),
    semana:semanaPesadaWrapped(fechadas),
    primera:primera&&{valor:primera.n.valor,nombre:primera.nombre,ramo:primera.r.nombre},
    movio:notaQueMovioWrapped(evo),
    remontada:remontadaWrapped(ramos,evo),
    mitades:mitadesWrapped(fechadas),
    anterior:frenteAnteriorWrapped(d.gpa,actual),
  };
  Object.assign(d,e);
  d.personalidad=personalidadWrapped(d);
  return d;
}
