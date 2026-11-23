// Lector conservador y puro: solo usa el anuncio proyectado y la pauta recibida.
// No interpreta instrucciones, no crea evaluaciones ni guarda fechas. Un alias
// ambiguo, alternativas o una fecha dudosa no producen propuestas.
const MESES_ANUNCIO_CANVAS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function destinosAnunciosCanvas(ramo){
  const destinos=[];
  for(const cat of ramo.categorias||[]){
    const notas=cat.notas||[];
    if(!notas.length&&!(cat.slots>1)||(!(cat.slots>1)&&notas.length===1&&(cat.directNota===true||puntajeCanvas([cat.nombre],notas[0].nombre||'','')===3)&&!notas[0].fecha&&!notas[0].hora)){
      if(!cat.fechaQuitada)destinos.push({ramo,cat,nota:null,etiqueta:cat.nombre,nombres:[cat.nombre,...notas.map(n=>n.nombre).filter(Boolean)]});
    }else for(const nota of notas){
      if(!nota.fechaQuitada&&(!cat.fechaQuitada||nota.fecha))destinos.push({ramo,cat,nota,etiqueta:nombreNotaCasilla(ramo,cat,nota),nombres:[nota.nombre,nombreNotaCasilla(ramo,cat,nota)].filter(Boolean)});
    }
    // Igual que «abrirCasilla»: el espacio declarado aún no es una nota guardada.
    // Solo se materializa pendiente al confirmar, sin nota ni peso inventado.
    if(Number.isInteger(cat.slots)&&cat.slots>1&&!cat.fechaQuitada){
      for(let slot=0;slot<cat.slots;slot++)if(!notas.some(n=>n.slot===slot)){
        const etiqueta=etiquetaCasilla(ramo,cat,slot);
        destinos.push({ramo,cat,virtual:true,etiqueta,nombres:[etiqueta],nota:{id:'@canvas-slot-'+slot,nombre:etiqueta,slot,valor:null,peso:1}});
      }
    }
  }
  return destinos;
}
function estadoFechaAnuncioCanvas(t){
  const item=t.nota||t.cat;
  return {fecha:item.fecha||t.cat.fecha||null,hora:item.horaQuitada?null:item.hora||t.cat.hora||null};
}
function fechaCivilAnuncioCanvas(dia,mes,anio){
  const d=new Date(Date.UTC(anio,mes-1,dia));
  return d.getUTCFullYear()===anio&&d.getUTCMonth()===mes-1&&d.getUTCDate()===dia?d.toISOString().slice(0,10):null;
}
function fechaImplicitaAnuncioCanvas(dia,mes,anio,publicado){
  const [y,m]=publicado.split('-').map(Number),base=Date.parse(publicado+'T12:00:00Z');
  let fechas=[];
  if(anio)fechas=[fechaCivilAnuncioCanvas(dia,mes,anio)];
  else if(mes)fechas=[y-1,y,y+1].map(a=>fechaCivilAnuncioCanvas(dia,mes,a));
  else for(const paso of [-1,0,1]){const d=new Date(Date.UTC(y,m-1+paso,1));fechas.push(fechaCivilAnuncioCanvas(dia,d.getUTCMonth()+1,d.getUTCFullYear()));}
  return fechas.filter(Boolean).sort((a,b)=>Math.abs(Date.parse(a+'T12:00:00Z')-base)-Math.abs(Date.parse(b+'T12:00:00Z')-base)||b.localeCompare(a))[0]||null;
}
function fechasEnTextoAnuncioCanvas(texto,publicado){
  const patron=/\b(\d{1,2})\s*(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de(?:l)?\s+)?(\d{4}))?\b|\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b|\b(?:el|al|del|dia)\s+(\d{1,2})(?!\d)(?!\s*(?:de\b|\/|:))\b/g;
  const encontradas=[];
  for(const m of texto.matchAll(patron)){
    if(m[4]&&!m[6]&&/^\/\d/.test(texto.slice(m.index+m[0].length)))return [];
    const dia=Number(m[1]||m[4]||m[7]);
    const mes=m[2]?(m[2]==='setiembre'?9:MESES_ANUNCIO_CANVAS.indexOf(m[2])+1):m[5]?Number(m[5]):null;
    const anio=Number(m[3]||m[6])||null;
    const fecha=fechaImplicitaAnuncioCanvas(dia,mes,anio,publicado);
    if(!fecha)return [];
    encontradas.push({fecha,index:m.index,fin:m.index+m[0].length});
  }
  return encontradas;
}
function mencionesAnuncioCanvas(texto,destinos){
  const halladas=[];
  for(const t of destinos){
    const aliases=[...new Set(t.nombres.flatMap(prefijosEvaluacionIcs))].filter(a=>a.length>=2);
    for(const alias of aliases){
      const patron=alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s*').replace(/([a-z])(\d)/g,'$1\\s*$2');
      for(const m of texto.matchAll(new RegExp('\\b'+patron+'\\b','g'))){
        // El alias tiene que ser una coincidencia exacta del mismo vocabulario
        // de puntajeCanvas, nunca la coincidencia débil solo por tipo.
        if(puntajeCanvas(t.nombres,m[0],'')===3)halladas.push({t,inicio:m.index,fin:m.index+m[0].length});
      }
    }
  }
  const resultado=[];
  for(const h of halladas.sort((a,b)=>a.inicio-b.inicio||b.fin-a.fin)){
    const pisan=halladas.filter(x=>x.inicio<h.fin&&x.fin>h.inicio);
    if(new Set(pisan.map(x=>claveDestinoIcs(x.t))).size!==1)continue;
    if(!resultado.some(x=>x.inicio<h.fin&&x.fin>h.inicio))resultado.push(h);
  }
  return resultado;
}
function fechasDeAnuncioCanvas(anuncio,ramo,ahora=new Date(),incluirIguales=false){
  return leerFechasAnuncioCanvas(anuncio,destinosAnunciosCanvas(ramo),ahora,incluirIguales);
}
// Núcleo puro: recibe también las etiquetas resueltas; no consulta S ni el catálogo.
function leerFechasAnuncioCanvas(anuncio,destinos,ahora,incluirIguales=false){
  const publicado=fechaChileCanvas(anuncio?.posted_at),hoy=fechaChileCanvas(ahora);
  if(!publicado||publicado>hoy)return [];
  const titulo=String(anuncio.title||'').slice(0,180),texto=normName(String(anuncio.texto||'').slice(0,8000));
  const enTitulo=mencionesAnuncioCanvas(normName(titulo),destinos);
  const tituloUnico=[...new Map(enTitulo.map(m=>[claveDestinoIcs(m.t),m])).values()];
  const propuestas=[];
  for(const frase of (normName(titulo)+'\n'+texto).split(/[;\n!?]|\.(?!\d)/).filter(Boolean)){
    if(/\bno\b/.test(frase)&&!/\bsino\b/.test(frase))continue;
    if(/\b(tentativ[a-z]*|quizas|probablemente|posiblemente|podria|confirmar|confirmacion|definir|entre|si|o)\b|\b\d{1,2}\s+o\s+\d{1,2}\b/.test(frase))continue;
    if(/\b(notas?|calificaciones?|resultados?|puntajes?)\b/.test(frase)&&/\b(publicad|disponib)/.test(frase)&&!/(reprogram|se mueve|sera|se rinde|se realiza)/.test(frase))continue;
    const menciones=mencionesAnuncioCanvas(frase,destinos);
    const otroNombre=/\b(?:[icpstq]\s*\d+|interrogacion|control|prueba|examen|solemne|quiz|tarea|laboratorio|ayudantia|clase|reunion)\b/.test(frase);
    const referencias=menciones.length?menciones:tituloUnico.length===1&&!otroNombre?[{...tituloUnico[0],inicio:0,fin:0}]:[];
    const segmentos=referencias.map((m,i)=>({t:m.t,texto:referencias.length===1?frase:frase.slice(m.fin,referencias[i+1]?.inicio??frase.length)}));
    // No asigna una fecha compartida o confusa a la última de varias evaluaciones.
    if(segmentos.length>1&&segmentos.some(s=>!fechasEnTextoAnuncioCanvas(s.texto,publicado).length))continue;
    for(const segmento of segmentos){
      const fechas=fechasEnTextoAnuncioCanvas(segmento.texto,publicado);
      if(!fechas.length||fechas.length>2)continue;
      if(fechas.length===2&&!/(?:se mueve|reprogram|cambi|no\b.*\bsino)/.test(segmento.texto))continue;
      const fecha=fechas.at(-1).fecha;
      if(fecha<hoy||Date.parse(fecha)-Date.parse(publicado)>200*864e5)continue;
      const horas=[...segmento.texto.matchAll(/\b(?:a\s+las?\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/g)];
      if(horas.length>1||/\b\d{1,2}:\d{2}\b/.test(segmento.texto)&&!horas.length)continue;
      const hora=horas.length?horas[0][1].padStart(2,'0')+':'+horas[0][2]:null;
      const salas=[...segmento.texto.matchAll(/\b(?:sala\s+([a-z]?\d{1,4}(?:[-.]\d+)?)|en\s+(?:la\s+)?([a-z]\d{1,4}(?:[-.]\d+)?))\b/g)];
      if(salas.length>1)continue;
      const sala=(salas[0]?.[1]||salas[0]?.[2]||'').toUpperCase()||null,{t}=segmento;
      const {fecha:fechaAnterior,hora:horaAnterior}=estadoFechaAnuncioCanvas(t);
      if(!incluirIguales&&fecha===fechaAnterior&&(!hora||hora===horaAnterior))continue;
      propuestas.push({titulo:t.etiqueta+' · '+t.ramo.nombre,
        fecha,...(hora?{hora}:{}),...(sala?{sala}:{}),fechaAnterior,horaAnterior,
        ramoId:t.ramo.id,target:claveDestinoIcs(t),targetAnuncio:claveDestinoIcs(t),origen:'canvas-anuncio',
        anuncio:{titulo,publicado,instante:anuncio.posted_at},estado:fechaAnterior?'cambio':'nueva'});
    }
  }
  // Dos fechas incompatibles para el mismo destino en un mensaje: ninguna.
  const porDestino=new Map();
  for(const p of propuestas){const lista=porDestino.get(p.target)||[];lista.push(p);porDestino.set(p.target,lista);}
  return [...porDestino.values()].filter(l=>new Set(l.map(p=>p.fecha+'|'+(p.hora||''))).size===1).map(l=>l[0]);
}
function propuestasAnunciosCanvas(anuncios,ramo,ahora){
  const porDestino=new Map(),destinos=destinosAnunciosCanvas(ramo),hoy=fechaChileCanvas(ahora);
  const lista=(Array.isArray(anuncios)?anuncios:[]).filter(a=>fechaChileCanvas(a?.posted_at)&&fechaChileCanvas(a.posted_at)<=hoy)
    .sort((a,b)=>Date.parse(b.posted_at)-Date.parse(a.posted_at));
  for(const original of lista){
    // La proyección de lectura conserva hasta la última letra. Para proponer
    // fechas solo sirven frases completas, como en el puente anterior.
    const a=original.recortado?{...original,texto:original.texto.replace(/[^.;\n]*$/,'')}:original;
    const propuestas=leerFechasAnuncioCanvas(a,destinos,ahora,true);
    const menciones=mencionesAnuncioCanvas(normName(String(a.title||'')+'\n'+String(a.texto||'')),destinos);
    const claves=new Set([...menciones.map(m=>claveDestinoIcs(m.t)),...propuestas.map(p=>p.target)]);
    const instante=Date.parse(a.posted_at);
    for(const clave of claves){
      const p=propuestas.find(p=>p.target===clave)||null,anterior=porDestino.get(clave);
      if(!anterior)porDestino.set(clave,{instante,p});
      // Una comunicación más reciente sin fecha clara bloquea las antiguas.
      // Empates contradictorios tampoco se resuelven adivinando.
      else if(instante===anterior.instante&&(!p||!anterior.p||p.fecha!==anterior.p.fecha||(p.hora||'')!==(anterior.p.hora||'')))anterior.p=null;
    }
  }
  return [...porDestino.values()].map(x=>x.p).filter(p=>p&&(p.fecha!==p.fechaAnterior||p.hora&&p.hora!==p.horaAnterior));
}

// Contexto efímero de la hoja; no forma parte del JSON de la cuenta.
let contextoFechasCanvas=null,avisoAnunciosCanvas='';
function validarContextoFechasCanvas(){
  if(contextoFechasCanvas&&(contextoFechasCanvas.estado!==S||contextoFechasCanvas.cuenta!==(currentUser?.id||null)))throw new Error('Cambió la cuenta. Vuelve a traer las fechas.');
}
function validarPropuestaAnuncioCanvas(p){
  if(!enAppNativa()||p.target!==p.targetAnuncio)throw new Error('Esa propuesta de anuncio ya no está disponible');
  validarContextoFechasCanvas();
  const ramo=(S.ramos||[]).find(r=>r.id===p.ramoId);
  const destino=ramo&&destinosAnunciosCanvas(ramo).find(t=>claveDestinoIcs(t)===p.targetAnuncio);
  const item=destino&&(destino.nota||destino.cat);
  if(!item||estadoFechaAnuncioCanvas(destino).fecha!==p.fechaAnterior||estadoFechaAnuncioCanvas(destino).hora!==p.horaAnterior)throw new Error('La fecha cambió mientras revisabas. Vuelve a traer las fechas.');
  if(p.hora&&!HORA_RE.test(p.hora))throw new Error('La hora propuesta no es válida');
  return destino;
}
function filaAnuncioRevisionCanvas(p,index){
  const fecha=p.hora?fechaHoraCorta(p.fecha,p.hora):fechaCorta(p.fecha);
  const anterior=p.fechaAnterior?(p.horaAnterior?fechaHoraCorta(p.fechaAnterior,p.horaAnterior):fechaCorta(p.fechaAnterior)):null;
  const estado=anterior?'Cambio propuesto: del '+anterior+' al '+fecha:'Fecha propuesta: '+fecha;
  return '<div style="padding:12px 0;border-bottom:1px solid var(--border);overflow-wrap:anywhere;">'
    +'<b style="font-size:1rem;">'+esc(p.titulo)+'</b>'
    +'<p style="font-size:.875rem;line-height:1.5;margin:6px 0;">'+esc(estado)+(p.sala?' · Sala '+esc(p.sala):'')+'</p>'
    +'<p style="font-size:.8125rem;color:var(--fg2);line-height:1.5;margin:6px 0 10px;">Según el anuncio “'+esc(p.anuncio.titulo)+'” del '+esc(fechaCorta(p.anuncio.publicado))+'.'
    +(!p.hora&&p.horaAnterior?' La hora no está indicada; se conserva '+esc(p.horaAnterior)+'.':'')+'</p>'
    +'<label class="modal-label" for="ics-evaluacion-'+index+'">Qué hacer</label>'
    +'<select class="feedback-select" style="min-height:44px;width:100%;margin-bottom:0;" id="ics-evaluacion-'+index+'" data-ics-evaluacion onchange="asignarDestinoIcs('+index+',this.value)">'
    +'<option value=""'+(!p.target?' selected':'')+'>No importar</option>'
    +'<option value="'+esc(p.targetAnuncio)+'"'+(p.target?' selected':'')+'>'+(anterior?'Aceptar cambio':'Agregar fecha')+'</option></select></div>';
}
