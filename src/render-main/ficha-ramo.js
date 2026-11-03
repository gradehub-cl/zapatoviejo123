const reglasRamoAbiertas={};
// El promedio sin redondear aparece al tocar el número grande (general o del
// ramo), a su lado y sin pinta de botón: es un dato para quien quiere ver a
// cuánto está de la décima siguiente, no una acción. Vale para la sesión y no
// se guarda. Se TRUNCA a milésimas, nunca se redondea: un 3,9499 redondeado se
// leería 3,950 y diría que ya llegaste al 4,0 cuando no.
let promedioExactoVisible=false;
function alternarPromedioExacto(){promedioExactoVisible=!promedioExactoVisible;}
function fmtPromedioExacto(n){
  // El 1e-9 evita que un 3,95 guardado como 3,9499999… se trunque a 3,949.
  const t=Math.floor((Number(n)+1e-9)*1000)/1000;
  return t.toFixed(3).replace(/0$/,'');
}
function pintarPromedioExacto(id,valor){
  const el=document.getElementById(id);if(!el)return;
  const mostrar=promedioExactoVisible&&typeof valor==='number'&&!isNaN(valor);
  el.textContent=mostrar?fmtPromedioExacto(valor):'';
  el.hidden=!mostrar;
}
function toggleReglasRamo(id){
  reglasRamoAbiertas[id]=!reglasRamoAbiertas[id];
  renderRamo();
}
// Lucas, 2026-11-03: la ficha vuelve al mensaje; el medidor queda en Estadísticas.
function medidorFichaHTML(needed,cual='',condicional=false){
  const cifra=needed>7?'':nfNecesaria(needed).replace('.',',');
  const lectura=needed>7?`Ya no es posible aprobar${cual}`:condicional?`Con ${cifra} en cada evaluación pendiente llegas al 4,0`:`Necesitas ${cifra} en lo pendiente para aprobar${cual}`;
  const numero=needed>7?'':`<strong style="color:${esc(exigenciaNotaNecesaria(needed).color)}">${esc(cifra)}</strong>`;
  const mensaje=needed>7?esc(lectura):condicional?`Con ${numero} en cada evaluación pendiente llegas al 4,0`:`Necesitas ${numero} en lo pendiente para aprobar${esc(cual)}`;
  return `<span class="ficha-mensaje" aria-label="${esc(lectura)}">${mensaje}</span>`;
}

// El motor decide qué falta, incluidos descartes y pesos condicionales.
// La pista completa es el ramo; la banda de la categoría ocupa su peso vigente.
function cantidadEvaluacionesFicha(cat){
  const notas=Array.isArray(cat.notas)?cat.notas:[];
  return cat.directNota?Math.max(1,Number(cat.slots)||0,notas.length):notas.length;
}
function barraCategoriaFichaHTML(r,cat,calculo,serie=[cat]){
  if(serie.reduce((n,c)=>n+cantidadEvaluacionesFicha(c),0)<2)return '';
  const idsCategorias=new Set(serie.map(c=>c.id));
  const categorias=resumenCategoriasCalculadas(r,calculo);
  const partes=categorias.filter(c=>idsCategorias.has(c.id));
  if(!partes.length)return '';
  const peso=partes.reduce((n,c)=>n+c.peso,0);
  const total=categorias.reduce((n,c)=>n+c.peso,0);
  const ids=new Set();
  const hojas=n=>{if(n.type==='leaf')ids.add(n.id);else(n.children||[]).forEach(hojas);};
  calculo.estructura.children.filter(c=>idsCategorias.has(c.id)).forEach(hojas);
  const sinCasillas=calculo.estructura.children.filter(c=>idsCategorias.has(c.id)&&!c.children.length).reduce((n,c)=>n+(Number(c.weight)||0)/total,0);
  const pendientes=sinCasillas+calculo.res.emptyLeaves.filter(n=>ids.has(n.id)).reduce((n,x)=>n+(Number(x.effectiveWeight)||0),0);
  const fraccion=peso/total;
  const evaluado=fraccion>0?Math.max(0,Math.min(1,1-pendientes/fraccion)):0;
  const conocidas=partes.filter(c=>c.valor!==null);
  const pesoConocido=conocidas.reduce((n,c)=>n+c.peso,0);
  const valor=serie.length===1&&cat.directNota&&cat.slots>1?avgPond(cat.notas||[]):pesoConocido?conocidas.reduce((n,c)=>n+c.valor*c.peso,0)/pesoConocido:null;
  const color=valor==null?'var(--fg2)':getColor(valor);
  return `<div class="ficha-peso" role="img" aria-label="${esc(cat.nombre)}: ${r2(peso)}% del ramo, ${Math.round(evaluado*100)}% de su peso evaluado" style="--ficha-peso:${Math.max(0,Math.min(100,peso))}%;--ficha-evaluado:${evaluado*100}%;--ficha-color:${esc(color)}"><span class="ficha-peso-grupo"><i></i></span></div>`;
}
// Un índice de presentación: nunca mezcla categorías ni modifica la pauta.
function pluralSerieFicha(base){
  const enlace=base.match(/^(.*?) (de|del|para|con) (.+)$/i);
  if(enlace)return pluralSerieFicha(enlace[1])+' '+enlace[2]+' '+enlace[3];
  const especiales={examen:'Exámenes',certamen:'Certámenes',test:'Tests'};
  return base.split(/\s+/).map(p=>especiales[p.toLowerCase()]||(/^[A-ZÁÉÍÓÚ]{1,}$/.test(p)?p:/ión$/i.test(p)?p.slice(0,-3)+'iones':/z$/i.test(p)?p.slice(0,-1)+'ces':/[aeiouáéíóú]$/i.test(p)?p+'s':p+'es')).join(' ');
}
function seriesNumeradasFicha(categorias){
  const grupos=new Map(),porCategoria=new Map();
  const entradas=categorias.map(cat=>{
    const m=String(cat.nombre||'').trim().match(/^(.+?)\s*(\d+)$/);
    if(!m||Number(m[2])<1)return null;
    const base=m[1].trim().replace(/\s+n[°º.]$/i,'');
    return {cat,base,numero:Number(m[2]),normal:base.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()};
  }).filter(Boolean);
  const nombres=new Set(entradas.map(e=>e.normal));
  const abreviaturas={i:['interrogacion'],p:['prueba','parcial'],c:['control','certamen'],s:['solemne']};
  const plurales={interrogacion:'Interrogaciones',prueba:'Pruebas',control:'Controles',solemne:'Solemnes',certamen:'Certámenes'};
  for(const {cat,base,numero,normal} of entradas){
    // C puede ser Control o Certamen: solo se expande si la pauta lo aclara.
    const opciones=(abreviaturas[normal]||[]).filter(n=>nombres.has(n));
    const clave=opciones.length===1?opciones[0]:normal==='i'?'interrogacion':normal;
    if(!grupos.has(clave))grupos.set(clave,{nombre:plurales[clave]||pluralSerieFicha(base),categorias:[],numeros:new Set(),ambiguo:false});
    const grupo=grupos.get(clave);
    if(grupo.numeros.has(numero))grupo.ambiguo=true;
    grupo.numeros.add(numero);grupo.categorias.push(cat);
  }
  for(const grupo of grupos.values())if(grupo.categorias.length>1&&!grupo.ambiguo)for(const cat of grupo.categorias)porCategoria.set(cat.id,grupo);
  return porCategoria;
}

function botonNotaEnFilaHTML(catId,slot,nombre,sombras=null){
  const pendiente=sombras?.pendientes.find(p=>p.catId===catId&&p.slot===slot);
  if(pendiente)return botonNotaSombraHTML(sombras,pendiente);
  return `<button type="button" class="nota-en-fila" data-cat-id="${esc(catId)}"${slot===null?'':` data-slot="${slot}"`} aria-label="Anotar nota de ${esc(nombre)}" onclick="event.stopPropagation();abrirNotaEnFila(this)">+ Nota</button>`;
}
function abrirNotaEnFila(boton){
  if(!boton||!boton.isConnected)return;
  const input=document.createElement('input');
  input.type='text';input.className='eval-row-input nota-campo';input.inputMode='decimal';
  if(boton.dataset.sombraValor)input.placeholder=boton.dataset.sombraValor;
  input.autocapitalize='characters';input.maxLength=4;
  input.setAttribute('aria-label',boton.getAttribute('aria-label'));
  if(boton.dataset.sombraClave)input.setAttribute('aria-label','Anotar nota real de '+boton.dataset.sombraNombre);
  let terminado=false;
  const valido=()=>!input.value.trim()||!isNaN(parseNota(input.value));
  const guardar=()=>{
    if(terminado)return;
    if(!valido()){input.setAttribute('aria-invalid','true');showToast('Escribe una calificación válida');return;}
    terminado=true;
    const raw=input.value.trim();
    if(!raw){input.replaceWith(boton);return;}
    if(boton.dataset.slot!==undefined)setSlotNota(boton.dataset.catId,Number(boton.dataset.slot),raw);
    else setDirectNota(boton.dataset.catId,raw);
  };
  input.addEventListener('click',e=>e.stopPropagation());
  input.addEventListener('input',()=>input.removeAttribute('aria-invalid'));
  input.addEventListener('blur',guardar);
  input.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();terminado=true;input.replaceWith(boton);boton.focus({preventScroll:true});}
    else if((e.key==='Enter'||e.key==='Tab')&&!valido()){e.preventDefault();e.stopPropagation();input.setAttribute('aria-invalid','true');showToast('Escribe una calificación válida');}
  });
  boton.replaceWith(input);input.focus({preventScroll:true});
}

function renderRamo(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r){goHome();return;}
  document.getElementById('grade-gpa-echo')?.remove();
  document.getElementById('ramo-title').textContent=r.nombre;
  const subtitulo=document.getElementById('ramo-subtitulo');
  if(subtitulo)subtitulo.textContent=[siglaDeRamo(r),r.creditos!=null?`${r.creditos} créditos`:''].filter(Boolean).join(' · ');
  const avg=ramoAvg(r);
  const calculo=calculoRamoConCompuertas(r);
  const sombras=notasSombraDelRamo(r);
  const recuperativo=estadoRecuperativo(r,calculo);
  const eximicion=estadoEximicion(r);
  const segundaFecha=estadoSegundaFecha(r);
  const descartes=calculo.res.drops||[];
  const avgEl=document.getElementById('ramo-hero-avg');
  if(avg!==null){
    const s=fmtPromedio(avg);const dot=s.indexOf('.');
    avgEl.innerHTML=`${s.slice(0,dot)}<span class="ramo-decimal">${s.slice(dot)}</span>`;
    avgEl.className='ramo-num '+colorClassRamo(r,avg)+claseNotaEspecial(avg);
    avgEl.style.setProperty('--grade-color',getColorRamo(r,avg));
    avgEl.onclick=()=>{alternarPromedioExacto();pintarPromedioExacto('ramo-hero-exacto',avg);pintarSoloCatedra();};
  } else {
    avgEl.textContent='Sin notas';avgEl.className='ramo-num empty';avgEl.onclick=null;
  }
  pintarPromedioExacto('ramo-hero-exacto',avg);
  // La cátedra sola, al lado de la nota final. Se toca igual que el número
  // grande: los dos muestran o esconden su promedio exacto a la vez.
  const soloEl=document.getElementById('ramo-solo-parte');
  function pintarSoloCatedra(){
    if(!soloEl)return;
    const html=htmlSoloCatedra(r,{exacto:promedioExactoVisible?fmtPromedioExacto:null});
    soloEl.hidden=!html;soloEl.innerHTML=html;
  }
  pintarSoloCatedra();
  if(soloEl)soloEl.onclick=()=>{alternarPromedioExacto();pintarPromedioExacto('ramo-hero-exacto',avg);pintarSoloCatedra();};
  const tp=r.categorias.reduce((a,c)=>a+c.peso,0);
  const categoriasVisibles=r.categorias.filter(c=>!(eximicion&&eximicion.activa&&eximicion.regla.ocultaEvaluacion===true&&eximicion.examenIds.includes(c.id)));
  document.getElementById('ramo-seccion').textContent=r.seccion?`Sección ${r.seccion}`:'';
  document.getElementById('ramo-peso-contexto').textContent=categoriasVisibles.length===0
    ?'Agrega evaluaciones para comenzar':Math.abs(tp-100)>0.001?`${r2(tp)}% ponderado`:'';
  renderDocenteRamo(r);
  const periodoEl=document.getElementById('pauta-periodo');
  if(periodoEl){
    const info=infoPeriodoPauta(r);
    if(!info||!info.periodo){periodoEl.style.display='none';periodoEl.innerHTML='';}
    else{
      periodoEl.className='pauta-periodo';
      periodoEl.innerHTML=`<span>Pauta del ${esc(info.periodo)}</span>`;
      periodoEl.style.display='inline-flex';
    }
  }

  // Notas que un agente propuso para ESTE ramo. Van acá y no en una bandeja
  // aparte porque la decisión se toma mirando el ramo: qué evaluación es, qué
  // nota tiene ahora y de dónde dice el agente que salió la nueva.
  const propEl=document.getElementById('notas-propuestas');
  if(propEl){
    const pendientes=typeof propuestasNotasDeRamo==='function'?propuestasNotasDeRamo(r):[];
    const pendientesFechas=typeof propuestasFechasDeRamo==='function'?propuestasFechasDeRamo(r):[];
    if(!pendientes.length&&!pendientesFechas.length){propEl.style.display='none';propEl.innerHTML='';}
    else{
      propEl.style.display='block';
      propEl.innerHTML=pendientes.map(p=>{
        const filas=p.notas.map(n=>{
          const cat=(r.categorias||[]).find(c=>normName(c.nombre)===normName(n.evaluacion));
          // La misma casilla donde la va a escribir aplicarPropuestaNotas: la
          // `casilla` del agente parte en 1 y `slot` en 0, y compararlas tal cual
          // tachaba la nota de la casilla siguiente.
          const lugar=destinoNotaPropuesta(cat,n);
          const actual=lugar&&lugar.nota&&typeof lugar.nota.valor==='number'?lugar.nota:null;
          // Se muestra la nota que ya está, si la hay: aceptar una propuesta
          // que PISA un 6,2 con un 4,0 es una decisión distinta de anotar una
          // casilla vacía, y no se puede tomar sin ver las dos.
          return `<div class="prop-fila"><span class="prop-eval">${esc(n.evaluacion)}${n.casilla?` · casilla ${n.casilla}`:''}</span>`+
            `<span class="prop-valor">${actual?`<s>${textoCalificacionNota(actual)}</s> → `:''}${fmtNota(n.valor)}</span></div>`;
        }).join('');
        return `<div class="prop-notas-card">
          <div class="prop-notas-head"><b>Un agente propone ${p.notas.length} nota${p.notas.length!==1?'s':''}</b><span>Nada se aplicó todavía.</span></div>
          <div class="prop-notas-lista">${filas}</div>
          <div class="prop-notas-fuente">Según el agente: ${esc(p.fuente)}</div>
          <div class="prop-notas-btns">
            <button type="button" class="ramo-action primary" onclick="aplicarPropuestaNotas('${esc(p.id)}')">Aceptar</button>
            <button type="button" class="ramo-action" onclick="abrirEditarPropuestaNotas('${esc(p.id)}')">Editar</button>
            <button type="button" class="ramo-action" onclick="confirmarDescartarPropuestaNotas('${esc(p.id)}')">Rechazar</button>
          </div>
        </div>`;
      }).join('')+pendientesFechas.map(p=>{
        const filas=p.fechas.map(f=>{
          const cat=(r.categorias||[]).find(c=>normName(c.nombre)===normName(f.evaluacion));
          // Igual que escribirFechaPropuesta: la casilla del agente parte en 1.
          const slot=cat&&f.casilla?slotDeCasilla(cat,f.casilla):null;
          const actual=!cat||slot===undefined?null
            : slot===null?cat
            : (cat.notas||[]).find(x=>x.slot===slot)||null;
          // La fecha que ya está, si la hay. Mover una prueba que ya estaba
          // agendada es otra decisión que ponerle fecha a una que no tenía.
          // `formatEventDate` devuelve {day,mon,dow}: acá salía "[object Object]".
          const antes=actual&&actual.fecha?fechaHoraCorta(actual.fecha,actual.hora):'';
          const nueva=fechaHoraCorta(f.fecha,f.hora);
          return `<div class="prop-fila"><span class="prop-eval">${esc(f.evaluacion)}${f.casilla?` · casilla ${f.casilla}`:''}</span>`+
            `<span class="prop-valor">${antes?`<s>${esc(antes)}</s> → `:''}${esc(nueva)}</span></div>`;
        }).join('');
        return `<div class="prop-notas-card">
          <div class="prop-notas-head"><b>Un agente propone ${p.fechas.length} fecha${p.fechas.length!==1?'s':''}</b><span>Nada se aplicó todavía.</span></div>
          <div class="prop-notas-lista">${filas}</div>
          <div class="prop-notas-fuente">Según el agente: ${esc(p.fuente)}</div>
          <div class="prop-notas-btns">
            <button type="button" class="ramo-action primary" onclick="aplicarPropuestaFechas('${esc(p.id)}')">Aceptar</button>
            <button type="button" class="ramo-action" onclick="abrirEditarPropuestaFechas('${esc(p.id)}')">Editar</button>
            <button type="button" class="ramo-action" onclick="confirmarDescartarPropuestaFechas('${esc(p.id)}')">Rechazar</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Chip nota mínima para el 4.0
  const chipEl=document.getElementById('ramo-min-chip');
  chipEl.textContent='';
  chipEl.removeAttribute('aria-label');
  if(r.categorias.length>0){
    const categoriasActivas=resumenCategoriasCalculadas(r,calculo);
    const totalPeso=categoriasActivas.reduce((a,c)=>a+c.peso,0);
    // ¿Hay un piso de nota activo? (sección calificada bajo su mínimo → topa la final)
    const gateHit=gatesActivas(r)[0]||null;
    // Cuánto falta por rendir, contando CASILLAS y no categorías.
    //
    // Antes salía de `pesoSinNotas`, que da una categoría por cerrada apenas
    // tiene una nota. En Laboratorio de Dinámica —Controles 10% en 5 casillas,
    // Informes 70% en 6, Evaluación de pares 20% en 6— con UN control y UN
    // informe puestos contaba el 80% como rendido y anunciaba "falta 20%",
    // cuando iban 2 de 17 evaluaciones.
    //
    // `emptyLeaves` son las hojas sin nota, con su peso efectivo ya repartido
    // entre las casillas de su categoría, y suman 1 sobre el ramo entero.
    const pendientes=(calculo.res&&calculo.res.emptyLeaves)||[];
    const pesoPendiente=pendientes.reduce((s,l)=>s+(Number(l.effectiveWeight)||0),0);
    const pctPendiente=Math.round(pesoPendiente*100);
    if(eximicion&&eximicion.activa){
      chipEl.style.display='inline-flex';
      chipEl.className='ramo-chip';
      chipEl.textContent=eximicion.regla.etiqueta
        ?`Te eximiste de ${eximicion.regla.etiqueta}`
        :`Te eximiste del ${eximicion.regla.evaluacion}`;
    } else if(gateHit){
      chipEl.style.display='inline-flex';
      chipEl.className='ramo-chip bad';
      chipEl.textContent=textoCompuertaActiva(gateHit);
    } else if(recuperativo&&recuperativo.motivo==='pendiente'){
      chipEl.style.display='inline-flex';
      chipEl.className='ramo-chip warn';chipEl.textContent='Puedes rendir examen recuperativo';
    } else if(ramoCompletamenteEvaluado(r) && notaAprobadaRamo(r,avg)){
      chipEl.style.display='inline-flex';
      chipEl.className='ramo-chip good';chipEl.textContent='✓ Aprobado';
    } else if(ramoCompletamenteEvaluado(r)){
      chipEl.style.display='inline-flex';
      chipEl.className='ramo-chip bad';chipEl.textContent='✕ Reprobado';
    } else if(totalPeso>0){
      // La cuenta sale de `notaNecesaria`, no de una fórmula escrita acá.
      //
      // Acá vivía la última copia a mano —`(4*totalPeso - sumaPonderada) /
      // pesoSinNotas`— y se equivocaba de dos formas a la vez. Repartía por
      // categoría entera, así que "Controles" con 4 casillas y 2 notas contaba
      // como cerrada: `pesoSinNotas` daba 0 y la ficha decía "✕ Reprobado" a
      // alguien que todavía aprobaba con 4,65. Y apuntaba al 4,00 bruto en vez
      // del 3,95 que redondea a 4,0 (#447), así que pedía una décima de más que
      // Estadísticas para el mismo ramo.
      //
      // `notaNecesaria` sabe de casillas declaradas, descartes, compuertas y
      // del ramo vinculado. Es la misma que usan Estadísticas y la calculadora:
      // que el número salga de un solo lugar es la única forma de que no haya
      // dos respuestas a la misma pregunta.
      // En un ramo con laboratorio, la cuenta y el texto son de la cátedra.
      const {valor:needed,cual}=notaNecesariaParaAprobar(r);
      if(needed===null){
        chipEl.style.display='none';
      } else if(avg!==null && needed<=1.0&&!notaNecesariaCondicional(r)){
        // Ya no puede reprobar con lo pendiente → aprobación asegurada
        chipEl.style.display='inline-flex';
        chipEl.className='ramo-chip good';chipEl.textContent=`Va aprobando${cual} · falta ${pctPendiente}%`;
      } else if(needed>7){
        chipEl.style.display='inline-flex';
        chipEl.className='ramo-chip ramo-meta';chipEl.innerHTML=medidorFichaHTML(needed,cual);
      } else {
        chipEl.style.display='inline-flex';
        chipEl.className='ramo-chip ramo-meta';chipEl.innerHTML=medidorFichaHTML(needed,cual,notaNecesariaCondicional(r));
      }
    } else {chipEl.style.display='none';}
  } else {chipEl.style.display='none';}

  // El simulador, con la meta adentro («Nota mínima» se juntó con él, 2026-10-23)
  const hayCats=r.categorias.length>0;
  document.getElementById('sim-btn').style.display=hayCats?'inline-flex':'none';

  // Advertencia de ponderación
  const pw=document.getElementById('peso-warning');
  if(r.categorias.length>0 && Math.abs(tp-100)>0.05){
    pw.style.display='flex';pw.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><div>Las evaluaciones suman <b>${r2(tp)}%</b> — ajústalas para que sumen 100%</div>`;
  } else {pw.style.display='none';}

  // La pauta oficial cambió y este ramo sigue con la vieja. No se toca nada sin
  // que el estudiante apriete: es su ramo y su promedio va a cambiar.
  const pcw=document.getElementById('pauta-cambio');
  if(pcw){
    const cambio=cambioDePauta(r);
    if(cambio){
      const cuantos=cambio.cambios.length;
      pcw.style.display='flex';pcw.className='weight-setup-nudge';
      pcw.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div><b>La pauta de este ramo cambió.</b><br>${cuantos} ${cuantos===1?'cambio':'cambios'} respecto de lo que tienes hoy. Tu promedio se calcula con lo que tienes ahora.<div style="margin-top:8px;"><button type="button" class="rep-link" style="width:auto;padding:7px 12px;margin:0;" onclick="verCambioDePauta('${esc(r.id)}')">Ver qué cambia</button></div></div>`;
    }else if(r.consensoRespaldos){
      // Esta pauta la reportaron estudiantes, no sale de un programa oficial.
      // Decirlo es la diferencia entre una pauta y una ponderación inventada.
      pcw.style.display='flex';pcw.className='weight-setup-nudge';
      pcw.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div><b>Pauta reportada por estudiantes.</b><br>La enviaron ${r.consensoRespaldos} personas de tu universidad. No sale del programa del curso: compárala con la tuya.</div>`;
    }else{pcw.style.display='none';pcw.innerHTML='';}
  }

  // Algunas reglas del programa no caben aún en el motor. El promedio no está
  // "malo": simplemente no incorpora esas excepciones oficiales.
  const ncw=document.getElementById('no-calcula-warning');
  const noCalcula=reglasNoCalculadas(r);
  const delCurso=reglasDelCurso(r);
  const calculadas=reglasCalculadas(r);
  if(noCalcula.length||delCurso.length||calculadas.length){
    ncw.style.display='flex';ncw.className='weight-setup-nudge';
    const items=lista=>`<ul style="margin:6px 0 0;padding-left:17px;">${lista.map(regla=>`<li>${esc(regla)}</li>`).join('')}</ul>`;
    const bloques=[];
    if(calculadas.length)bloques.push(`<b>Reglas que aplicamos al promedio.</b>${items(calculadas)}`);
    if(delCurso.length)bloques.push(`<b>Reglas de tu curso que el promedio no incluye.</b><br>Están en el programa, pero dependen de información que la app no puede tener:${items(delCurso)}`);
    if(noCalcula.length)bloques.push(`<b>Reglas que todavía no calculamos.</b><br>Las vamos a incorporar. Por ahora el promedio no considera:${items(noCalcula)}`);
    // El texto completo ocupaba media pantalla en cada carga de la ficha, todo
    // el rato, aunque el estudiante ya lo hubiera leído. Va plegado.
    //
    // Pero plegado tiene que seguir DICIENDO que existe: esto explica por qué
    // su promedio puede no calzar con el del profesor, y esconderlo del todo
    // sería peor que ocuparle espacio. Por eso el resumen lleva la cuenta.
    const total=noCalcula.length+delCurso.length+calculadas.length;
    const resumen=calculadas.length?`${total} reglas del programa: ${calculadas.length} en el cálculo`:`${total} regla${total!==1?'s':''} del programa que el promedio no incluye`;
    const abierto=reglasRamoAbiertas[r.id]===true;
    ncw.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div>
      <button type="button" class="reglas-toggle" aria-expanded="${abierto?'true':'false'}" onclick="toggleReglasRamo('${esc(r.id)}')">
        <span>${resumen}</span>
        <span class="reglas-chevron" aria-hidden="true">${abierto?'▲':'▼'}</span>
      </button>
      <div class="reglas-cuerpo${abierto?' open':''}">${bloques.join('<div style="height:10px;"></div>')}<span style="display:block;margin-top:6px;">Compáralo con la pauta del curso.</span></div>
    </div>`;
  }else{ncw.style.display='none';ncw.innerHTML='';}

  // Cada pauta pide algo que la app no puede comprobar —Biocel, asistencia de
  // Taller; Matemáticas Avanzadas II UAI, haber rendido todo— y lo declara en
  // `confirmar`. Antes el texto de Biocel estaba fijo acá y se le mostraba a
  // cualquier ramo. Llegar al promedio solo habilita la confirmación: nunca
  // afirma la eximición sola.
  const ew=document.getElementById('eximicion-warning');
  if(ew&&eximicion&&eximicion.regla.requiereConfirmacion===true){
    let texto='',accion='';
    const examenes=eximicion.regla.etiqueta?`de ${esc(eximicion.regla.etiqueta)}`:`del ${esc(eximicion.regla.evaluacion)}`;
    const varios=eximicion.examenIds.length>1;
    if(eximicion.puedeConfirmar){
      texto=`<b>Por tus notas, puedes eximirte ${examenes}.</b><br>Confirma que ingresaste todas tus notas previas al examen${eximicion.regla.confirmar?` y que ${esc(eximicion.regla.confirmar)}`:''}.`;
      accion='<button type="button" style="display:inline-flex;align-items:center;min-height:44px" onclick="confirmarEximicionActual()">Confirmar eximición</button>';
    }else if(eximicion.activa){
      texto=`<b>Te eximiste ${examenes}.</b><br>Ya no ${varios?'aparecen':'aparece'} entre tus evaluaciones pendientes y tu nota de presentación queda como nota final.`;
      accion='<button type="button" style="display:inline-flex;align-items:center;min-height:44px" onclick="corregirEximicionActual()">Corregir confirmación</button>';
    }else if(eximicion.confirmada){
      const causa=eximicion.razon==='incompleto'
        ? 'Todavía faltan notas previas al examen.'
        : eximicion.razon==='minimo_categoria'
          ? `Ya no se cumple el mínimo de ${nf(eximicion.minimoFallido.min)} en ${esc((eximicion.minimoFallido.evaluaciones||[eximicion.minimoFallido.evaluacion]).join(' y '))}.`
          : eximicion.razon==='examen_rendido'
            ? `Ya hay una nota de examen ingresada y vuelve a formar parte del cálculo.`
            : eximicion.razon==='ausencia_justificada'
              ? 'Declaraste una ausencia justificada que exige rendir el examen.'
            : `Tu nota de presentación quedó bajo ${nf(eximicion.regla.min)}.`;
      texto=`<b>Tu confirmación se conserva, pero ya no se aplica.</b><br>${causa} Si vuelves a cumplir las condiciones, la eximición se activa sola.`;
      accion='<button type="button" style="display:inline-flex;align-items:center;min-height:44px" onclick="corregirEximicionActual()">Corregir confirmación</button>';
    }
    if(texto){
      ew.style.display='flex';ew.className='weight-setup-nudge eximicion-note';
      ew.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div>${texto}<div style="margin-top:8px;">${accion}</div></div>`;
    }else{ew.style.display='none';ew.innerHTML='';}
  }else if(ew&&segundaFecha?.aviso){
    ew.style.display='flex';ew.className='weight-setup-nudge eximicion-note';
    ew.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div><b>Podrías rendir un segundo examen.</b><br>${esc(segundaFecha.regla.aviso)}</div>`;
  }else if(ew){ew.style.display='none';ew.innerHTML='';}

  // Contador de faltas: solo si el estudiante lo encendió en Editar ramo. Es
  // su registro, no una regla del programa, así que no toca el promedio.
  const fw=document.getElementById('faltas-contador');
  if(fw){
    if(!faltasActivas(r)){fw.style.display='none';fw.innerHTML='';}
    else{
      const {cantidad,limite}=r.faltas;
      const quedan=limite!=null?limite-cantidad:null;
      const detalle=limite==null?'Anota cada clase a la que no fuiste.'
        :quedan>1?`Te quedan ${quedan} de ${limite}.`
        :quedan===1?`Te queda 1 de ${limite}.`
        :quedan===0?`Llegaste al máximo de ${limite}.`
        :`Pasaste el máximo de ${limite} por ${-quedan}.`;
      fw.style.display='grid';
      fw.className='faltas-card'+(quedan!==null&&quedan<0?' is-excedido':quedan===0?' is-limite':'');
      fw.innerHTML=`<div class="faltas-txt"><span class="faltas-titulo">Faltas</span><span class="faltas-num" aria-live="polite">${cantidad}${limite===null?'':`<small> de ${limite}</small>`}</span><span class="faltas-detalle">${detalle}</span></div>
        <div class="faltas-ctrl">
          <button type="button" class="faltas-btn" onclick="cambiarFaltas(-1)" aria-label="Restar una falta" ${cantidad===0?'disabled':''}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
          <button type="button" class="faltas-btn" onclick="cambiarFaltas(1)" aria-label="Sumar una falta" ${cantidad>=FALTAS_MAX?'disabled':''}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>
        </div>`;
    }
  }

  // Décimas del programa (#631): la persona anota lo que ganó y el motor las
  // suma donde dice la regla. Sin anotar no suma nada, y se dice por qué una
  // décima anotada todavía no cuenta (la condición del programa).
  const bw=document.getElementById('bonus-ramo');
  if(bw){
    const reglas=Array.isArray(r.bonus)?r.bonus:[];
    if(!reglas.length){bw.style.display='none';bw.innerHTML='';}
    else{
      const calc=calculoRamoConCompuertas(r);
      const valorDe=id=>{const n=calc.res.breakdown.find(x=>x.id===id);return n?n.value:null;};
      const cumple=si=>{
        if(!si)return true;
        let acc=0,w=0;
        si.catIds.forEach(id=>{const v=valorDe(id),c=(r.categorias||[]).find(x=>x.id===id);if(v!==null&&c){acc+=v*(Number(c.peso)||0);w+=Number(c.peso)||0;}});
        return w>0&&acc/w>si.mayorQue;
      };
      const coma=n=>String(n).replace('.',',');
      const nombres=ids=>{const n=ids.map(id=>(r.categorias||[]).find(c=>c.id===id)?.nombre).filter(Boolean);return n.length>1?n.slice(0,-1).join(', ')+' y '+n[n.length-1]:(n[0]||'');};
      const destino=b=>b.destino==='final'?'a tu nota final':`al promedio de ${(r.categorias||[]).find(c=>c.id===b.destino)?.nombre||'la evaluación'}`;
      bw.style.display='contents';
      bw.innerHTML=reglas.map(b=>{
        const v=r.bonusIngresado&&Number.isInteger(r.bonusIngresado[b.id])?r.bonusIngresado[b.id]:null;
        const unidad=b.entrada==='decimas'?['décima','décimas']:['falta','faltas'];
        let detalle;
        if(v===null)detalle=esc(b.ayuda);
        else if(b.entrada==='decimas'){
          detalle=v===0?'Anota las que vayas ganando.'
            :!cumple(b.si)?`Todavía no suman: tu promedio ponderado de ${esc(nombres(b.si.catIds))} tiene que superar ${coma(b.si.mayorQue.toFixed(1))}.`
            :`Suman ${coma((Math.min(v,topeBonus(b))/10).toFixed(1))} ${esc(destino(b))}.`;
        }else{
          const quedan=b.hasta-v;
          detalle=v<=b.hasta?`Sumas ${coma(b.suma.toFixed(1))} ${esc(destino(b))}. ${quedan===0?'No puedes faltar a otro.':quedan===1?'Puedes faltar a 1 más.':`Puedes faltar a ${quedan} más.`}`
            :`Con más de ${b.hasta} ${unidad[1]} ya no sumas las ${coma((b.suma*10).toFixed(0))} décimas.`;
        }
        const control=v===null
          ?`<button type="button" class="bonus-anotar" onclick="cambiarBonus('${esc(b.id)}',null)">Anotar</button>`
          :`<div class="faltas-ctrl">
              <button type="button" class="faltas-btn" onclick="cambiarBonus('${esc(b.id)}',-1)" aria-label="Restar una ${unidad[0]}" ${v===0?'disabled':''}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
              <button type="button" class="faltas-btn" onclick="cambiarBonus('${esc(b.id)}',1)" aria-label="Sumar una ${unidad[0]}" ${v>=topeBonus(b)?'disabled':''}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
            </div>`;
        return `<div class="faltas-card bonus-card${b.entrada==='faltas'&&v>b.hasta?' is-excedido':''}" role="group" aria-label="${esc(b.pregunta)}">
          <div class="faltas-txt"><span class="faltas-titulo">${b.entrada==='decimas'?'Décimas':esc(b.pregunta)}</span>${v===null?'':`<span class="faltas-num" aria-live="polite">${v}<small> de ${b.entrada==='decimas'?topeBonus(b):b.hasta}</small></span>`}<span class="faltas-detalle">${detalle}</span></div>${control}</div>`;
      }).join('');
    }
  }

  const rw=document.getElementById('recuperativo-warning');
  if(rw&&recuperativo){
    rw.style.display='flex';rw.className='weight-setup-nudge';rw.style.width='auto';rw.style.margin='12px 20px';
    let texto='',acciones='';
    if(recuperativo.motivo==='pendiente'){
      texto=`<b>¿Rendiste el examen recuperativo?</b><br>Tu promedio final es ${nf(recuperativo.final)}. Elige solo si lo aprobaste o no.`;
      acciones=`<button type="button" onclick="declararRecuperativo('aprobado')">Aprobé</button><button type="button" onclick="declararRecuperativo('reprobado')" style="margin-left:14px;">No aprobé</button>`;
    }else if(recuperativo.motivo==='aprobado'){
      texto=`<b>Recuperativo aprobado.</b><br>Tu nota final queda en ${nf(recuperativo.valor)}.`;
      acciones='<button type="button" onclick="corregirRecuperativo()">Cambiar respuesta</button>';
    }else if(recuperativo.motivo==='reprobado'){
      texto=`<b>Recuperativo reprobado.</b><br>Tu nota final se mantiene en ${nf(recuperativo.valor)}.`;
      acciones='<button type="button" onclick="corregirRecuperativo()">Cambiar respuesta</button>';
    }else if(recuperativo.declaracion){
      const causa=recuperativo.motivo==='incompleto'
        ? 'faltan evaluaciones por registrar'
        : recuperativo.motivo==='compuerta'
        ? 'un requisito incumplido limitó tu nota final'
        : `al corregir tus notas tu promedio quedó en ${nf(recuperativo.final)}, fuera del rango`;
      texto=`<b>Tu declaración del recuperativo se conserva, pero ya no se aplica.</b><br>Esto pasa porque ${causa}.`;
      acciones='<button type="button" onclick="corregirRecuperativo()">Cambiar respuesta</button>';
    }else{rw.style.display='none';rw.innerHTML='';}
    if(rw.style.display!=='none')rw.innerHTML=`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".7" fill="currentColor"/></svg><div>${texto}${acciones}</div>`;
  }else if(rw){rw.style.display='none';rw.innerHTML='';}

  // Reportar la pauta vivía escondido al fondo del modal de "Editar ramo",
  // debajo de Guardar y Cancelar. Nadie entra a editar el nombre de un ramo para
  // avisar que su pauta está mal. Va acá, al pie de las evaluaciones, que es
  // donde el estudiante se da cuenta.
  // Va sin await: es una lectura de red y la ficha ya está pintada.
  pintarConsensoDisponible(r);

  const rep=document.getElementById('ramo-report');
  if(rep){
    // Reportar catálogo corrige una pauta oficial. Las pautas que la persona
    // armó por su cuenta ya se aportan al consenso al quedar completas.
    const oficial=r.origen&&r.origen.tenant&&presetRamo(r.nombre,r.origen.tenant,r.origen.carrera);
    if(r.categorias.length&&oficial){
      rep.style.display='flex';
      rep.onclick=()=>openReportModal(r.id);
      // Este formulario sirve para avisar una corrección de la oficial y
      // agregar contexto; la pauta propia completa ya aporta por sí sola.
      const txt=document.getElementById('ramo-report-text');
      if(txt)txt.textContent=pautaEditada(r)
        ?'Corregiste la pauta oficial · agrega un reporte'
        :'¿La pauta oficial no calza con tu curso? Repórtala';
    }else{rep.style.display='none';rep.onclick=null;}
  }

  const cl=document.getElementById('cat-list');cl.innerHTML='';
  const delCatalogo=pautaCatalogoSinOficial(r);
  const addCatBtn=document.querySelector('.add-cat-btn');
  if(addCatBtn){
    const armar=r.categorias.length===0&&delCatalogo;
    addCatBtn.textContent=armar?'Armar mi pauta':'Editar evaluaciones';
    addCatBtn.setAttribute('aria-label',armar?'Armar mi pauta con nombres y porcentajes':'Editar evaluaciones');
  }
  if(r.categorias.length===0){
    // Un ramo del catálogo sin pauta oficial NO es lo mismo que uno que el
    // estudiante creó a mano. En el primero la app le prometió el ramo y le
    // quedó debiendo las evaluaciones, y decírselo es más honesto que un
    // "Sin evaluaciones" que parece que él no hizo algo.
    const titulo=delCatalogo?'Todavía no tenemos la pauta de este ramo':'Sin evaluaciones';
    const sub=delCatalogo
      ? 'Ármala con el programa del curso. El promedio funciona igual y, si quieres, después la compartes con otros estudiantes.'
      : 'Agrega tus pruebas, controles o tareas con su porcentaje del ramo. Puedes incluir la fecha para que aparezcan en la Agenda.';
    cl.innerHTML=`<div class="empty" style="padding:32px 20px;">
      <div class="empty-icon"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
      <div class="empty-title">${titulo}</div>
      <div class="empty-sub">${sub}</div>
    </div>`;
  }
  const series=seriesNumeradasFicha(r.categorias.filter(c=>!(categoriaEximida(r,c)&&eximicion&&eximicion.regla.ocultaEvaluacion===true)));
  const listasSeries=new Map();
  const adjuntarCategoria=(nodo,cat)=>{
    const serie=series.get(cat.id);
    if(!serie){cl.appendChild(nodo);return;}
    if(!listasSeries.has(serie)){
      const tarjeta=document.createElement('section');tarjeta.className='eval-group ficha-serie';
      const peso=resumenCategoriasCalculadas(r,calculo).filter(c=>serie.categorias.some(x=>x.id===c.id)).reduce((n,c)=>n+c.peso,0);
      tarjeta.innerHTML=`<header class="ficha-serie-hd"><h2>${esc(serie.nombre)}</h2><span>${r2(peso)}% del ramo</span></header>${barraCategoriaFichaHTML(r,{nombre:serie.nombre},calculo,serie.categorias)}`;
      const lista=document.createElement('div');lista.className='ficha-serie-lista';tarjeta.appendChild(lista);
      listasSeries.set(serie,lista);cl.appendChild(tarjeta);
    }
    listasSeries.get(serie).appendChild(nodo);
  };
  r.categorias.forEach(cat=>{
    // `normalize()` repara lo que llega al abrir la app, pero una integración
    // futura puede escribir una categoría después. La ficha debe mostrar esa
    // evaluación vacía —no borrar visualmente toda la pauta— hasta que se
    // pueda corregir el dato.
    const notas=Array.isArray(cat.notas)?cat.notas:[];
    const ausencia=ausenciaDeEvaluacion(r,cat);
    const justificada=ausencia?.declarada&&!ausencia.inactiva;
    const detalleAusencia=ausencia?.declarada?`<button type="button" class="ausencia-estado" onclick="openDetalleAusenciaJustificada('${esc(cat.id)}');event.stopPropagation()"><strong>${ausencia.inactiva?'Declaración no aplicada':'Justificada'}</strong><span>${esc(ausencia.texto)}</span></button>`:'';
    const fechaChip=cat.fecha?`<span class="cat-fecha-chip">${esc(fechaHoraCorta(cat.fecha,cat.hora))}</span>`:'';
    const exenta=categoriaEximida(r,cat);
    const barraPeso=barraCategoriaFichaHTML(r,cat,calculo);
    // La categoría sigue guardada intacta. Solo se oculta mientras la
    // confirmación esté activa, para que corregirla la haga reaparecer.
    if(exenta&&eximicion&&eximicion.regla.ocultaEvaluacion===true)return;
    // Sección de preset: fila directa, solo escribir la nota (estilo simulador)
    if(cat.directNota){
      // Preset con varios espacios (ej: Laboratorio = 3 notas que se promedian) — COLAPSABLE
      if(cat.slots&&cat.slots>1){
        const av=avgPond(notas);
        // Vacío parte compacto, pero al guardar la primera nota (o dejar una
        // anotada para después) hay algo concreto que revisar. `openCats` solo
        // toma el control después de que la persona abrió o cerró a mano.
        const isOpen=openCats[cat.id]===undefined?notas.length>0||!!sombras:openCats[cat.id];
        const wrap=document.createElement('div');wrap.className='eval-group';
        if(av!=null)wrap.style.borderLeftColor=getColor(av);
        let rows='';
        // Se dibujan las casillas declaradas Y las que quedaron más allá.
        //
        // Al bajar las casillas de una categoría —de 3 controles a 2, por
        // ejemplo— la nota del tercero se quedaba guardada y SEGUÍA contando en
        // el promedio, pero dejaba de dibujarse: con 7,0 · 7,0 · 1,0 la ficha
        // mostraba dos sietes y un promedio de 5,0, sin nada que explicara la
        // diferencia. `normalize` tampoco la limpiaba al recargar.
        //
        // No se deja de contar, porque eso cambiaría el promedio de cuentas
        // reales sin que nadie lo pidiera, y es una nota que la persona escribió.
        // Se muestra, que es lo que hizo el #235 con las notas que salen de una
        // pauta oficial: quedan a la vista para que su dueño decida.
        const slotMax=notas.reduce((m,n)=>Number.isInteger(n.slot)?Math.max(m,n.slot):m,-1);
        const casillas=Math.max(cat.slots,slotMax+1);
        for(let i=0;!justificada&&i<casillas;i++){
          const sobra=i>=cat.slots;
          const nota=notas.find(n=>n.slot===i);const v=(nota&&nota.valor!=null)?nota.valor:null;
          const etiqueta=nombreCasilla(r,cat,i);
          // La fecha de la casilla, cuando la tiene. El botón abre el editor de
          // ESA casilla: hasta ahora el grupo solo dejaba escribir el número, y
          // la fecha solo existía para el grupo entero —"Controles" el mismo
          // día—, que no es como se rinden.
          // `formatEventDate` devuelve {day,mon,dow} para la Agenda, no un texto:
          // metido en la plantilla salía "[object Object]" bajo la casilla. El
          // formato corto de la ficha es el mismo que usa el chip del grupo.
          const fSub=nota&&nota.fecha?fechaHoraCorta(nota.fecha,nota.hora):'';
          const recorreccion=nota&&nota.recorreccionPendiente===true;
          const textoRecorreccion=recorreccion?textoPlazoRecorreccion(plazoRecorreccion(nota,cat,S.tenant)):'';
          rows+=`<div class="eval-sub${sobra?' eval-sub-sobra':''}">
            <button type="button" class="eval-sub-open" onclick="event.stopPropagation();abrirCasilla('${cat.id}',${i})" title="Fecha y detalle de ${esc(etiqueta)}" aria-label="Fecha y detalle de ${esc(etiqueta)}">
              <span class="eval-sub-name">${esc(etiqueta)}</span>
              ${sobra?'<span class="eval-sub-aviso">sobra en la pauta · sigue contando</span>':`<span class="eval-sub-fecha">${v==null?'Pendiente':''}${v==null&&fSub?' · ':''}${esc(fSub)}</span>`}
              ${recorreccion?`<span class="recorreccion-chip">Falta mandar${textoRecorreccion!=='sin plazo calculable'?` · ${esc(textoRecorreccion)}`:''}</span>`:''}
            </button>
            ${v==null?botonNotaEnFilaHTML(cat.id,i,etiqueta,sombras):`<input class="eval-row-input sm" inputmode="${inputModeNota()}" autocapitalize="characters" maxlength="4" value="${esc(textoCalificacionNota(nota))}" style="color:${getColor(v)}" onchange="setSlotNota('${cat.id}',${i},this.value)" onclick="event.stopPropagation();" aria-label="${esc(etiqueta)}"/>`}
          </div>`;
        }
        // Casillas con nota, no notas: un duplicado de la misma casilla no es
        // una evaluación más. normalize ya los limpia, pero el contador no
        // puede depender de que eso haya corrido.
        // Cuenta casillas CON NOTA. Antes contaba casillas registradas, y una
        // casilla creada solo para ponerle fecha —sin nota todavía— se sumaba
        // al "2/3 ingresadas" sin que hubiera ninguna nota nueva.
        const notasCount=new Set(notas.filter(n=>Number.isInteger(n.slot)&&n.valor!=null).map(n=>n.slot)).size
          || notas.filter(n=>n&&n.valor!=null).length;
        wrap.innerHTML=`
          <div class="eval-group-hd" role="button" tabindex="0" aria-expanded="${isOpen?'true':'false'}" onclick="toggleCat('${cat.id}')">
            <div style="flex:1;min-width:0;">
              <div class="eval-row-name">${esc(cat.nombre)}</div>
              <div class="eval-row-weight">${r2(cat.peso)}% · promedio de ${cat.slots}${notasCount?` · ${notasCount}/${cat.slots} ingresadas`:''}${fechaChip?' · '+fechaChip:''}${exenta?' · exento/a':''}</div>
            </div>
            <div class="ramo-nota ${justificada?'':colorClass(av)}" style="--grade-color:${getColor(av)};min-width:auto;font-size:${justificada?'.8125':'1.1875'}rem;">${justificada?'Justificada':fmtPromedio(av)}</div>
            <span aria-hidden="true" style="color:var(--fg3);font-size:0.6875rem;margin-left:6px;">${isOpen?'▲':'▼'}</span>
          </div>
          ${barraPeso}
          <div class="eval-group-body${isOpen||justificada?' open':''}">${justificada?detalleAusencia:rows+detalleAusencia}</div>`;
        adjuntarCategoria(wrap,cat);
        return;
      }
      const g=notas[0]?notas[0].valor:null;
      const recorreccion=notas[0]&&notas[0].recorreccionPendiente===true;
      const textoRecorreccion=recorreccion?textoPlazoRecorreccion(plazoRecorreccion(notas[0],cat,S.tenant)):'';
      const row=document.createElement('div');row.className='eval-row';
      if(g!=null)row.style.borderLeftColor=getColor(g);
      row.innerHTML=`
        <div class="eval-row-info" role="button" tabindex="0" onclick="openEditCatModal('${cat.id}')" style="cursor:pointer;">
          <div class="eval-row-name">${esc(cat.nombre)}</div>
          <div class="eval-row-weight">${g==null&&!justificada?'Pendiente · ':''}${r2(cat.peso)}% de la nota final${fechaChip?' · '+fechaChip:''}${exenta?' · exento/a':''}${recorreccion?` <span class="recorreccion-chip">Falta mandar${textoRecorreccion!=='sin plazo calculable'?` · ${esc(textoRecorreccion)}`:''}</span>`:''}</div>
        </div>
        ${justificada?'':g==null?botonNotaEnFilaHTML(cat.id,null,cat.nombre,sombras):`<input class="eval-row-input" inputmode="${inputModeNota()}" autocapitalize="characters" maxlength="4" value="${esc(textoCalificacionNota(notas[0]))}" style="color:${getColor(g)}" onchange="setDirectNota('${cat.id}',this.value)" onclick="event.stopPropagation();" aria-label="Nota de ${esc(cat.nombre)}"/>`}
        ${detalleAusencia}
        ${barraPeso}`;
      adjuntarCategoria(row,cat);
      return;
    }
    const descarte=descartes.find(d=>d.nodeId===cat.id);
    const calculoCategoria=(calculo.res?.breakdown||[]).find(b=>b.id===cat.id);
    const catAvg=calculoCategoria?.value??avgPond(notas);
    // Una lista abierta parte desplegada, y esto es un arreglo, no un gusto.
    //
    // Antes solo se abría sola si había un descarte. O sea una categoría de
    // "varias notas" creada a mano quedaba plegada SIEMPRE: vacía escondía el
    // "+ Agregar nota", que vive adentro, así que no había forma visible de
    // poner la primera; y con notas las escondía también, o sea el estudiante
    // guardaba una y desaparecía de la vista.
    //
    // Es el reporte de tres personas distintas —"le pongo que son varias notas
    // y no me aparece después", "si saco que son varias notas vuelven a
    // aparecer todos"— y explica las cuentas que tienen la pauta armada y
    // ninguna nota guardada.
    //
    // La rama de arriba, la de casillas fijas, ya se abría cuando tenía notas.
    // Eran dos comportamientos distintos para lo mismo sin ninguna razón.
    // `openCats` sigue mandando apenas la persona abre o cierra a mano.
    const isOpen=openCats[cat.id]===undefined?true:openCats[cat.id];
    // La pauta oficial sigue siendo una referencia del programa: no se ofrece
    // borrar una evaluación completa por accidente. Si la persona ya la
    // corrigió, recupera ese control sobre su propia versión. Las filas que la
    // pauta dejó atrás también se pueden limpiar sin tocar lo oficial.
    const pautaOficialIntacta=!pautaCatalogoSinOficial(r)&&!!r.pautaHuella&&!pautaEditada(r);
    const puedeEliminar=!pautaOficialIntacta||!!cat.fueraDePauta;
    const notasDescartadas=new Set((descarte?.dropped||[]).map(n=>n.id));
    const explicacionDescarte=descarte?`<div class="drop-rule-note">${esc(textoDescarte(cat,descarte))}</div>`:'';
    const card=document.createElement('div');card.className='cat-card';
    const notasHTML=notas.length===0?
      `<p style="font-size:0.8125rem;color:var(--fg3);text-align:center;padding:10px 0;">Sin notas aún</p>`:
      notas.map(n=>{
        const descartada=notasDescartadas.has(n.id);
        const textoRecorreccion=n.recorreccionPendiente===true?textoPlazoRecorreccion(plazoRecorreccion(n,cat,S.tenant)):'';
        return `
        <div class="nota-row${descartada?' nota-row-dropped':''}">
          <button class="nota-row-name" aria-label="Editar nota ${esc(n.nombre)}" onclick="openEditNotaModal('${cat.id}','${n.id}');event.stopPropagation();" style="background:none;border:none;cursor:pointer;text-align:left;padding:0;font-family:inherit;font-size:0.875rem;color:var(--fg2);flex:1;">${esc(n.nombre)}</button>
          ${n.peso!==1?`<span class="nota-row-pond">${n.peso}%</span>`:''}
          ${descartada?'<span class="nota-row-drop-tag">No cuenta</span>':''}
          ${n.recorreccionPendiente===true?`<span class="recorreccion-chip">Falta mandar${textoRecorreccion!=='sin plazo calculable'?` · ${esc(textoRecorreccion)}`:''}</span>`:''}
          ${n.fecha?`<span class="cat-fecha-chip">${esc(fechaCorta(n.fecha))}</span>`:''}
          <span class="nota-row-val" style="color:${getColor(n.valor)}">${textoCalificacionNota(n)}</span>
          <button class="nota-row-del" aria-label="Eliminar nota ${esc(n.nombre)}" onclick="deleteNota('${cat.id}','${n.id}');event.stopPropagation();">✕</button>
        </div>`;
      }).join('');
    card.innerHTML=`
      <div class="cat-header">
        <div class="cat-info" role="button" tabindex="0" onclick="openEditCatModal('${cat.id}')" style="cursor:pointer;">
          <div class="cat-name">${esc(cat.nombre)}</div>
          <div class="cat-peso-tag">${r2(cat.peso)}% del ramo · ${notas.length} nota${notas.length!==1?'s':''}${fechaChip?' · '+fechaChip:''}</div>
        </div>
        <span style="font-size:1rem;font-weight:700;color:${justificada?'var(--fg2)':getColor(catAvg)}">${justificada?'Justificada':fmtPromedio(catAvg)}</span>
        ${puedeEliminar?`<button aria-label="Eliminar evaluación ${esc(cat.nombre)}" style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;min-width:44px;min-height:44px;background:var(--red-bg);border:none;border-radius:8px;padding:0;cursor:pointer;color:var(--red);font-size:0.8125rem;" onclick="confirmDeleteCat('${cat.id}');event.stopPropagation();"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>`:''}
        <button aria-label="${isOpen?'Colapsar':'Expandir'} ${esc(cat.nombre)}" aria-expanded="${isOpen?'true':'false'}" style="display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;min-width:44px;min-height:44px;background:var(--muted);border:none;border-radius:8px;padding:0;cursor:pointer;color:var(--fg2);font-size:0.6875rem;" onclick="toggleCat('${cat.id}');event.stopPropagation();">${isOpen?'▲':'▼'}</button>
      </div>
      ${barraPeso}
      <div class="cat-body${isOpen?' open':''}">
        ${explicacionDescarte}
        ${justificada?detalleAusencia:notasHTML+detalleAusencia}
        ${justificada?'':`<button class="add-nota-btn" onclick="openAddNotaModal('${cat.id}');event.stopPropagation();">+ Agregar nota</button>`}
      </div>`;
    adjuntarCategoria(card,cat);
  });
  montarNotasSombra(r,sombras,cl);
}

// Formato corto de fecha para chips: "15 mar"
// Se pinta aparte porque depende de una respuesta del servidor. Mientras no
// llega, la sección no existe: no se muestra un esqueleto ni un "cargando" para
// algo que la mayoría de las veces no va a tener nada que decir.
// Una frase entera, no un número suelto. Antes decía "75%" con "POR SOBRE"
// debajo y no se entendía: podía leerse como un 75% por sobre alguien, o como
// estar por sobre un 75. La frase completa no deja dónde equivocarse.
//
// Habla de COMPAÑEROS, no del total: `curso_posicion` calcula el porcentaje
// contra los OTROS (total - 1), así que poner el total correría el denominador y
// el número diría algo distinto de lo que es. La cuenta sigue a la vista a
// propósito: con cinco participantes el porcentaje solo puede ser 0, 25, 50, 75
// o 100, y sin saber cuántos son suena mucho más fino de lo que es.
//
// "Igual o por sobre": los empates cuentan a favor (ver curso_posicion.sql). Con
// un 7 en un curso lleno de sietes decía "por sobre el 44%" y se leía como que
// la mitad te ganaba, cuando nadie te ganaba.
//
// La frase es la misma para 0 y para 100. "Todos" o "ninguno" sería categórico
// sobre un número redondeado: 199 de 200 también llega acá como 100.
