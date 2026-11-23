
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
const minutosAmigo=h=>{const [a,b]=String(h).split(':').map(Number);return a*60+b;};
const horaAmigo=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const diaAmigoChile=instante=>{
  const p=partesHorarioChile(instante),civil=new Date(Date.UTC(+p.year,+p.month-1,+p.day,12));
  return ['D','L','M','W','J','V','S'][civil.getUTCDay()];
};

// Tramos ocupados de un día, ya unidos: [[inicio,fin],…] en minutos.
// Una clase marcada «no voy» no ocupa: a esa hora está libre.
function tramosOcupados(ramos,dia){
  const t=[];
  for(const r of ramos||[])for(const b of copiarHorario(r.horario))if(!b.noVoy&&b.dias.includes(dia))t.push([minutosAmigo(b.inicio),minutosAmigo(b.fin)]);
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
  return libres.filter(([i,f])=>f-i>=minimo).map(([i,f])=>({inicio:horaAmigo(i),fin:horaAmigo(f),minutos:f-i}));
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
  const ms=new Date(ahora).getTime(),dia=diaAmigoChile(ms),p=partesHorarioChile(ms),min=+p.hour*60+ +p.minute;
  const hoy=[];
  for(const r of ramos)for(const b of copiarHorario(r.horario))if(!b.noVoy&&b.dias.includes(dia))hoy.push({ramo:r.nombre,sigla:r.sigla||null,sala:b.sala||null,inicio:b.inicio,fin:b.fin});
  if(!hoy.length)return {estado:'sinclases'};
  hoy.sort((x,y)=>x.inicio.localeCompare(y.inicio));
  const ahoraClase=hoy.find(c=>minutosAmigo(c.inicio)<=min&&min<minutosAmigo(c.fin));
  if(ahoraClase){
    // Clases seguidas cuentan como una: «en clases hasta» la última que empalma.
    let hasta=minutosAmigo(ahoraClase.fin);
    for(const c of hoy)if(minutosAmigo(c.inicio)<=hasta+10&&minutosAmigo(c.fin)>hasta)hasta=minutosAmigo(c.fin);
    return {estado:'clase',ramo:ahoraClase.ramo,sigla:ahoraClase.sigla,sala:ahoraClase.sala,hasta:horaAmigo(hasta)};
  }
  const proxima=hoy.find(c=>minutosAmigo(c.inicio)>min);
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

// ─── Grupos: libres a la vez entre varias personas ───
// `listas` es un arreglo de horarios (uno por persona, el propio incluido).
// Cuenta solo a quienes tienen clases ese día: quien no va a la u ese día no
// está para juntarse, pero tampoco borra la ventana de los demás. Hacen falta
// al menos dos personas en la u. `personas` dice cuántas son.
function ventanasLibresGrupo(listas,dia,{minimo=30}={}){
  const tramos=(listas||[]).map(l=>tramosOcupados(l,dia)).filter(t=>t.length);
  if(!(tramos.length>=2))return {personas:tramos.length,ventanas:[]};
  const desde=Math.min(...tramos.map(t=>t[0][0])),hasta=Math.max(...tramos.map(t=>t[t.length-1][1]));
  const ocupado=tramos.flat().sort((x,y)=>x[0]-y[0]),libres=[];
  let cursor=desde;
  for(const [i,f] of ocupado){if(i>cursor)libres.push([cursor,i]);cursor=Math.max(cursor,f);}
  if(hasta>cursor)libres.push([cursor,hasta]);
  return {personas:tramos.length,ventanas:libres.filter(([i,f])=>f-i>=minimo).map(([i,f])=>({inicio:horaAmigo(i),fin:horaAmigo(f),minutos:f-i}))};
}
function semanaLibresGrupo(listas,opciones){
  return DIAS_HORARIO.filter(([k])=>k!=='D').map(([dia,nombre])=>({dia,nombre,...ventanasLibresGrupo(listas,dia,opciones)})).filter(d=>d.ventanas.length);
}

// ─── Grupos: cuándo juntarse (Lucas, 2026-11-22) ───
// Alguien está «en la u y libre» en los huecos entre su primera y su última
// clase del día (las «no voy» no ocupan). Una ventana sirve si coinciden al
// menos dos, y contigo si tienes horario: es para que TÚ te juntes. Se parte
// donde cambia quién está, así cada ventana dice exactamente con quiénes.
// `personas`: [{clave,yo,ramos}]. `desde`: minuto del día desde el que mirar.
function libresJuntosDia(personas,dia,{minimo=45,desde=0}={}){
  const huecos=[];
  for(const p of personas||[]){
    const t=tramosOcupados(p.ramos,dia);
    for(let i=0;i<t.length-1;i++)if(t[i+1][0]>t[i][1])huecos.push({p,a:t[i][1],b:t[i+1][0]});
  }
  const conmigo=(personas||[]).some(p=>p.yo&&(p.ramos||[]).some(r=>copiarHorario(r.horario).length));
  const marcas=[...new Set(huecos.flatMap(h=>[h.a,h.b]).concat(desde))].filter(m=>m>=desde).sort((x,y)=>x-y);
  const tramos=[];
  for(let i=0;i<marcas.length-1;i++){
    const a=marcas[i],b=marcas[i+1];
    const quienes=(personas||[]).filter(p=>huecos.some(h=>h.p===p&&h.a<=a&&b<=h.b));
    const clave=quienes.map(p=>p.clave).join('|'),u=tramos[tramos.length-1];
    if(u&&u.b===a&&u.clave===clave)u.b=b;else tramos.push({a,b,clave,quienes});
  }
  return tramos.filter(t=>t.quienes.length>=2&&(!conmigo||t.quienes.some(p=>p.yo))&&t.b-t.a>=minimo)
    .map(t=>({inicio:horaAmigo(t.a),fin:horaAmigo(t.b),minutos:t.b-t.a,claves:t.quienes.map(p=>p.clave)}));
}
const diaDeFechaAmigo=f=>['D','L','M','W','J','V','S'][new Date(f+'T12:00:00Z').getUTCDay()];
// Las próximas ventanas, de hoy en adelante (hoy, desde ahora). Con `antesDe`
// ({fecha,hora}) solo las que terminan antes de una prueba.
function proximasLibresJuntos(personas,ahora=new Date(),{cuantas=2,dias=7,minimo=45,antesDe=null}={}){
  const ms=new Date(ahora).getTime(),hoy=fechaHorarioChile(ms),p=partesHorarioChile(ms),min=+p.hour*60+ +p.minute;
  const out=[];
  for(let i=0;i<dias&&out.length<cuantas;i++){
    const fecha=sumarDiasAgenda(hoy,i);
    if(antesDe&&fecha>antesDe.fecha)break;
    for(const v of libresJuntosDia(personas,diaDeFechaAmigo(fecha),{minimo,desde:i===0?min:0})){
      if(antesDe&&fecha===antesDe.fecha&&(!antesDe.hora||minutosAmigo(v.fin)>minutosAmigo(antesDe.hora)))continue;
      out.push({fecha,...v});
      if(out.length>=cuantas)break;
    }
  }
  return out;
}
// Para estudiar antes de una prueba: la ventana con más gente de la prueba y,
// si empatan, la más cercana a la prueba (el repaso sirve más cerca).
function mejorLibreAntesDe(personas,prueba,ahora=new Date()){
  const hoy=fechaHorarioChile(new Date(ahora).getTime());
  if(!prueba||!prueba.fecha||prueba.fecha<hoy)return null;
  const dias=Math.min(14,Math.round((new Date(prueba.fecha+'T12:00:00Z')-new Date(hoy+'T12:00:00Z'))/864e5)+1);
  const todas=proximasLibresJuntos(personas,ahora,{cuantas:40,dias,antesDe:{fecha:prueba.fecha,hora:prueba.inicio||null}});
  return todas.reduce((mejor,v)=>!mejor||v.claves.length>mejor.claves.length||(v.claves.length===mejor.claves.length)?v:mejor,null);
}

// ─── Hacer turno: llegan y se van a la misma hora ───
// Un día sirve para hacer turno (irse juntos, compartir auto o micro) solo si
// los dos llegan Y se van a la misma hora: la primera clase y la última a las
// que van, con a lo más `tolerancia` minutos de diferencia. Las clases marcadas
// «no voy» no cuentan (tramosOcupados las salta): si no vas a la de las 8:20,
// llegas a la siguiente.
const DIAS_TURNO=()=>DIAS_HORARIO.filter(([k])=>k!=='D');
function turnoEnComun(mios,suyos,{tolerancia=20}={}){
  return DIAS_TURNO().map(([dia,nombre])=>{
    const a=tramosOcupados(mios,dia),b=tramosOcupados(suyos,dia);
    if(!a.length||!b.length)return null;
    const llegan=Math.abs(a[0][0]-b[0][0])<=tolerancia,salen=Math.abs(a[a.length-1][1]-b[b.length-1][1])<=tolerancia;
    if(!llegan||!salen)return null;
    // Se sale a la hora del que entra primero y se vuelve con el que termina último.
    return {dia,nombre,llegada:horaAmigo(Math.min(a[0][0],b[0][0])),salida:horaAmigo(Math.max(a[a.length-1][1],b[b.length-1][1]))};
  }).filter(Boolean);
}
// perfecto → van a la u los mismos días y en todos llegan y se van juntos.
// dia      → coinciden algunos días (`dias`).
// ninguno  → ningún día.
function matchTurno(mios,suyos,opciones){
  const dias=turnoEnComun(mios,suyos,opciones);
  if(!dias.length)return {tipo:'ninguno',dias};
  const van=l=>DIAS_TURNO().filter(([d])=>tramosOcupados(l,d).length).map(([d])=>d).join();
  return {tipo:van(mios)===van(suyos)&&dias.length===van(mios).split(',').length?'perfecto':'dia',dias};
}
// «lunes», «lunes y miércoles», «lunes, martes y jueves».
function listaDiasTurno(dias){
  const n=(dias||[]).map(d=>d.nombre.toLowerCase());
  return n.length<=1?(n[0]||''):n.slice(0,-1).join(', ')+' y '+n[n.length-1];
}
function textoMatchTurno(m){
  if(!m||m.tipo==='ninguno')return '';
  return m.tipo==='perfecto'?'Match perfecto de turno':`Match de turno el ${listaDiasTurno(m.dias)}`;
}
// «Llegan 08:20 · se van 15:10».
function textoTurno(d){return `Llegan ${d.llegada} · se van ${d.salida}`;}
