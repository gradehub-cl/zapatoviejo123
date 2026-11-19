
// ─── AMIGOS: CRUZAR HORARIOS ────────────────────────────────────────────────
// Funciones puras: sin S, sin red, sin DOM. Reciben ramos con `horario` (los
// propios de S.ramos o los de un amigo tal como los entrega amigos_horarios())
// y responden qué comparten, cuándo están libres a la vez y qué hace ahora.
// Todas las horas son civiles de America/Santiago, igual que resumenHorarioClases.

// Lo que llega del servidor puede traer null donde el editor guarda texto vacío,
// y no trae ids (no hacen falta afuera). Se deja con la forma de S.ramos.
function normalizarRamosAmigo(ramos){
  return (Array.isArray(ramos)?ramos:[]).filter(r=>r&&typeof r==='object'&&typeof r.nombre==='string').map((r,i)=>({
    id:'amigo-'+i,nombre:r.nombre,sigla:typeof r.sigla==='string'&&r.sigla?r.sigla:null,
    seccion:Number.isInteger(r.seccion)?r.seccion:null,
    horario:(Array.isArray(r.horario)?r.horario:[]).map(b=>b&&{...b,sala:b.sala||'',tipo:b.tipo||''})
  }));
}
const minutosHorario=h=>{const [a,b]=String(h).split(':').map(Number);return a*60+b;};
const horaDeMinutos=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const diaHorarioChile=instante=>{
  const p=partesHorarioChile(instante),civil=new Date(Date.UTC(+p.year,+p.month-1,+p.day,12));
  return ['D','L','M','W','J','V','S'][civil.getUTCDay()];
};

// Tramos ocupados de un día, ya unidos: [[inicio,fin],…] en minutos.
// Una clase marcada «no voy» no ocupa: a esa hora está libre.
function tramosOcupados(ramos,dia){
  const t=[];
  for(const r of ramos||[])for(const b of copiarHorario(r.horario))if(!b.noVoy&&b.dias.includes(dia))t.push([minutosHorario(b.inicio),minutosHorario(b.fin)]);
  t.sort((x,y)=>x[0]-y[0]);
  const unidos=[];
  for(const [i,f] of t){const u=unidos[unidos.length-1];if(u&&i<=u[1])u[1]=Math.max(u[1],f);else unidos.push([i,f]);}
  return unidos;
}
// Ventanas en que los dos están libres, dentro de la jornada que ambos tienen
// ese día (de la primera clase de cualquiera a la última de cualquiera).
// Sin clases de uno de los dos ese día no hay jornada en común que proponer.
// Solo ventanas de al menos `minimo` minutos: un recreo de 10 no es un plan.
function ventanasLibresEnComun(mios,suyos,dia,{minimo=30}={}){
  const a=tramosOcupados(mios,dia),b=tramosOcupados(suyos,dia);
  if(!a.length||!b.length)return [];
  const desde=Math.min(a[0][0],b[0][0]),hasta=Math.max(a[a.length-1][1],b[b.length-1][1]);
  const ocupado=[...a,...b].sort((x,y)=>x[0]-y[0]),libres=[];
  let cursor=desde;
  for(const [i,f] of ocupado){if(i>cursor)libres.push([cursor,i]);cursor=Math.max(cursor,f);}
  if(hasta>cursor)libres.push([cursor,hasta]);
  return libres.filter(([i,f])=>f-i>=minimo).map(([i,f])=>({inicio:horaDeMinutos(i),fin:horaDeMinutos(f),minutos:f-i}));
}
// Los días de lunes a sábado con al menos una ventana en común.
function semanaLibresEnComun(mios,suyos,opciones){
  return DIAS_HORARIO.filter(([k])=>k!=='D').map(([dia,nombre])=>({dia,nombre,ventanas:ventanasLibresEnComun(mios,suyos,dia,opciones)})).filter(d=>d.ventanas.length);
}
// Ramos que toman los dos, por sigla (o nombre si falta). `mismaSeccion` solo
// cuando ambos la tienen y coincide: así se sabe si van a la misma sala.
function ramosEnComun(mios,suyos){
  const clave=r=>((typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla)||r.nombre||'').toString().trim().toUpperCase();
  const deEl=new Map((suyos||[]).map(r=>[clave(r),r]));
  return (mios||[]).filter(r=>clave(r)&&deEl.has(clave(r))).map(r=>{
    const s=deEl.get(clave(r));
    return {nombre:r.nombre,sigla:clave(r),mismaSeccion:Number.isInteger(r.seccion)&&r.seccion===s.seccion};
  });
}
// Qué está haciendo ahora, solo con su horario (nunca con su ubicación):
//   clase    → en clases hasta `hasta`, con ramo y sala
//   libre    → sin clase ahora; `proxima` si le queda otra hoy
//   termino  → ya tuvo clases hoy y no le quedan
//   sinclases→ hoy no tiene clases
//   sinhorario → no ha cargado su horario
function estadoAhoraAmigo(ramos,ahora=new Date()){
  if(!(ramos||[]).some(r=>copiarHorario(r.horario).length))return {estado:'sinhorario'};
  const ms=new Date(ahora).getTime(),dia=diaHorarioChile(ms),p=partesHorarioChile(ms),min=+p.hour*60+ +p.minute;
  const hoy=[];
  for(const r of ramos)for(const b of copiarHorario(r.horario))if(!b.noVoy&&b.dias.includes(dia))hoy.push({ramo:r.nombre,sigla:r.sigla||null,sala:b.sala||null,inicio:b.inicio,fin:b.fin});
  if(!hoy.length)return {estado:'sinclases'};
  hoy.sort((x,y)=>x.inicio.localeCompare(y.inicio));
  const ahoraClase=hoy.find(c=>minutosHorario(c.inicio)<=min&&min<minutosHorario(c.fin));
  if(ahoraClase){
    // Clases seguidas cuentan como una: «en clases hasta» la última que empalma.
    let hasta=minutosHorario(ahoraClase.fin);
    for(const c of hoy)if(minutosHorario(c.inicio)<=hasta+10&&minutosHorario(c.fin)>hasta)hasta=minutosHorario(c.fin);
    return {estado:'clase',ramo:ahoraClase.ramo,sigla:ahoraClase.sigla,sala:ahoraClase.sala,hasta:horaDeMinutos(hasta)};
  }
  const proxima=hoy.find(c=>minutosHorario(c.inicio)>min);
  if(proxima)return {estado:'libre',proxima};
  return {estado:'termino'};
}
// La frase corta de la lista. Sin sala si no la cargó; sin inventar nada.
function textoEstadoAmigo(e){
  if(!e)return '';
  if(e.estado==='clase')return `En clases hasta las ${e.hasta}${e.sala?` · ${e.sala}`:''}`;
  if(e.estado==='libre')return `Libre · clase a las ${e.proxima.inicio}`;
  if(e.estado==='termino')return 'Terminó por hoy';
  if(e.estado==='sinclases')return 'Sin clases hoy';
  return 'Sin horario cargado';
}
