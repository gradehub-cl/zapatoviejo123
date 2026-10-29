
// ─── TU OLFATO ────────────────────────────────────────────────────────────────
// Cuando llega la nota de una evaluación que tenía sensación, se juntan las dos:
// "dijiste Bien y te sacaste 6,2". Con eso la app aprende cuánto te sacas de
// verdad cuando dices cada cosa. Vive solo en este dispositivo, como las
// sensaciones: nada de esto entra a S ni a la nube.
const CLAVE_OLFATO='gradehub_olfato',OLFATO_MAX=60;
function notasConValor(cat){return (cat.notas||[]).filter(n=>n&&typeof n.valor==='number'&&isFinite(n.valor));}
function olfatoGuardado(){
  try{const a=JSON.parse(localStorage.getItem(CLAVE_OLFATO)||'[]');return Array.isArray(a)?a.filter(x=>x&&x.valor>=1&&x.valor<=5&&typeof x.nota==='number'):[];}
  catch(e){return [];}
}
// En una prueba, ocho décimas de diferencia ya es otra sensación; en el promedio
// de varias, cinco bastan para que sea costumbre y no casualidad.
function veredictoOlfato(diferencia,umbral=0.8){
  return diferencia>=umbral?'pesimista':diferencia<=-umbral?'optimista':'acierto';
}
// Junta cada sensación con la nota que llegó después. Devuelve lo recién revelado.
function revisarOlfato(){
  const todas=sensacionesGuardadas(),pares=olfatoGuardado(),reveladas=[];
  Object.entries(todas).forEach(([clave,x])=>{
    const [ramoId,catId,notaId]=clave.split('|');
    const r=S.ramos.find(y=>y.id===ramoId),cat=r&&(r.categorias||[]).find(c=>c.id===catId);
    const s=SENSACIONES.find(y=>y.valor===x.valor);
    if(!cat||!s)return;
    const conValor=notasConValor(cat);
    // La nota de esa fecha si estaba anotada como pendiente; si no, la primera
    // que apareció después de responder. Sin forma de saberlo, se espera.
    const nota=notaId?conValor.find(n=>n.id===notaId)
      :Array.isArray(x.previas)?conValor.find(n=>!x.previas.includes(n.id))
      :conValor.length===1?conValor[0]:null;
    if(!nota)return;
    const par={valor:x.valor,nota:Math.round(nota.valor*10)/10,fecha:Date.now()};
    pares.push(par);delete todas[clave];
    const resultado=veredictoOlfato(par.nota-parseNota(s.nota));
    reveladas.push({evaluacion:nota.nombre||cat.nombre,s,nota:par.nota,resultado});
    track('olfato_revelado',{resultado});
  });
  if(reveladas.length){
    try{localStorage.setItem(CLAVE_OLFATO,JSON.stringify(pares.slice(-OLFATO_MAX)));localStorage.setItem(CLAVE_SENSACIONES,JSON.stringify(todas));}catch(e){}
  }
  return reveladas;
}
function textoRevelacion(x){
  const fin={pesimista:'fuiste pesimista',optimista:'fuiste optimista',acierto:'le achuntaste'}[x.resultado];
  return `Dijiste que ${x.evaluacion} te fue ${x.s.texto.toLowerCase()} y te sacaste un ${simConComa(x.nota.toFixed(1))}: ${fin}.`;
}
// Lo que sueles sacarte cuando dices algo; con una sola vez todavía no es costumbre.
function notaHabitual(valor){
  const de=olfatoGuardado().filter(x=>x.valor===valor);
  if(!de[1])return null;
  const prom=de.reduce((a,x)=>a+x.nota,0)/de.length;
  return {prom,veces:de.length,texto:simConComa((Math.round(prom*10)/10).toFixed(1))};
}
function resumenOlfato(){
  const pares=olfatoGuardado();
  const filas=SENSACIONES.map(s=>({s,h:notaHabitual(s.valor)||(()=>{const de=pares.filter(x=>x.valor===s.valor);
    return de.length?{prom:de[0].nota,veces:1,texto:simConComa(de[0].nota.toFixed(1))}:null;})()})).filter(f=>f.h);
  const dif=pares.length?pares.reduce((a,x)=>a+x.nota-parseNota(SENSACIONES[x.valor-1].nota),0)/pares.length:0;
  return {pares:pares.length,filas,diferencia:dif,veredicto:pares.length>=3?veredictoOlfato(dif,0.5):null};
}
function pintarAvisosPruebas(){
  const b=document.getElementById('s-avisos-pruebas');
  if(b)b.textContent=avisosPruebasActivos()?'Desactivar avisos':'Activar avisos';
}
async function alternarAvisosPruebas(){
  const ln=pluginNotificaciones();
  const estado=document.getElementById('s-avisos-estado');
  if(!ln)return false;
  if(avisosPruebasActivos()){
    try{localStorage.removeItem(CLAVE_AVISOS_PRUEBAS);}catch(e){}
    await programarAvisosPruebas();sincronizarActividadesPrueba();pintarAvisosPruebas();
    if(estado)estado.textContent='Avisos desactivados en este iPhone.';
    track('avisos_pruebas_desactivados');
    return false;
  }
  let permiso=null;
  try{permiso=await ln.requestPermissions();}catch(e){}
  if(!permiso||permiso.display!=='granted'){
    if(estado)estado.textContent='Para recibirlos, permite las notificaciones de GradeHub en la app Ajustes del iPhone.';
    return false;
  }
  try{localStorage.setItem(CLAVE_AVISOS_PRUEBAS,'1');}catch(e){}
  await programarAvisosPruebas();sincronizarActividadesPrueba();pintarAvisosPruebas();
  if(estado)estado.textContent='Listo. Te avisaremos antes de cada evaluación que tenga hora.';
  track('avisos_pruebas_activados');
  return true;
}

// Esto recuerda una acción todavía no hecha: mandar una prueba ya rendida a
// recorregir. No tiene una fecha inventada ni es una evaluación pendiente: la
// nota ya existe y sigue contando. Viaja por un carril aparte de la línea de
// tiempo para que la Agenda pueda recordarla aunque nunca tuvo fecha.
function agendaRecorrecciones(){
  const out=[];
  S.ramos.forEach(r=>(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{
    if(n.recorreccionPendiente===true&&Number.isFinite(n.valor))out.push({
      ramo:r,cat:c,nota:n,
      plazo:plazoRecorreccion(n,c,S.tenant),
      editor:c.directNota===true&&!(Number.isInteger(c.slots)&&c.slots>1)?'categoria':'nota',
    });
  })));
  return out;
}


function formatEventDate(iso){
  const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const d=new Date(iso+'T00:00:00');
  return {day:d.getDate(),mon:meses[d.getMonth()],dow:['dom','lun','mar','mié','jue','vie','sáb'][d.getDay()]};
}
