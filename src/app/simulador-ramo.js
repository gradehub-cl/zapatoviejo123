
function openSimuladorModal(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  simState={};simAusencias={};simMeta=4.0;
  document.getElementById('modal-content').innerHTML=`
    <p class="sim-kicker">Simulador</p>
    <div class="modal-title sim-ramo">${esc(r.nombre)}${r.seccion?` · Sección ${r.seccion}`:''}</div>
    <p class="sim-intro">Escribe notas hipotéticas y mira cómo quedaría tu promedio. No se guardan hasta que confirmes.</p>
    <div class="sim-proj">
      <div class="sim-proj-label">Promedio proyectado</div>
      <div class="sim-proj-nums">
        <div class="sim-proj-num" id="sim-avg">—</div>
        <div class="solo-parte" id="sim-solo-parte" hidden></div>
      </div>
      <div id="sim-delta"></div>
      <div class="sim-meta" role="group" aria-labelledby="sim-meta-etiqueta">
        <span id="sim-meta-etiqueta">Tu meta</span>
        <button type="button" class="sim-meta-btn" id="sim-meta-menos" onclick="simCambiarMeta(-0.1)" aria-label="Bajar la meta">−</button>
        <output id="sim-meta" aria-live="polite">4,0</output>
        <button type="button" class="sim-meta-btn" id="sim-meta-mas" onclick="simCambiarMeta(0.1)" aria-label="Subir la meta">+</button>
      </div>
      <div class="sim-needed" id="sim-needed" aria-live="polite" hidden></div>
    </div>
    <div class="sim-section-label">Evaluaciones</div>
    <div class="sim-cats" id="sim-cats"></div>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button class="btn-confirm" id="sim-commit-btn" onclick="simCommit()" disabled>Guardar como reales</button>
    </div>`;
  openModal();
  renderSimulador();
  precargarSensacion(r);
}

// Combina notas reales (con su peso) + hipotéticas (peso 1) de una categoría
function simCombinadas(c){
  // Sin la guarda, una categoría a la que le falte el arreglo de notas revienta
  // acá —y como simCatAvg se llama al pintar, la ventana del simulador quedaba
  // rota apenas se abría. normalize() lo garantiza al cargar, pero no una
  // categoría creada en esta sesión por un camino que lo olvide.
  return [...(Array.isArray(c.notas)?c.notas:[]), ...((simState[c.id]||[]).map(s=>({
    valor:s.valor,peso:1,
    ...(Number.isInteger(s.slot)?{slot:s.slot}:{}),
  })))];
}
function simCatAvg(c){return avgPond(simCombinadas(c));}
// Proyección del simulador: mismo motor y mismas compuertas que el promedio real.
// Mezcla notas reales + hipotéticas y delega en ramoAvg (gate-aware).
function simProjectedRamo(r){
  const base={...r,categorias:r.categorias.map(c=>{
    // Una nota hipotética ocupa la casilla pendiente; si se deja también su
    // placeholder sin valor, la meta la contaría dos veces como pendiente.
    const ocupaCasilla=(simState[c.id]||[]).length&&(c.directNota||c.slots>1);
    const combinadas=simCombinadas(c).filter(n=>!ocupaCasilla||n.valor!==null&&n.valor!==undefined);
    return {...c,notas:combinadas.map((n,i)=>({
      id:n.id||('sim_'+c.id+'_'+i),nombre:n.nombre||'Nota',valor:n.valor,peso:n.peso||1,
      ...(Number.isInteger(n.slot)?{slot:n.slot}:{}),
    }))};
  })};
  // Las ausencias simuladas se inyectan como si fueran una regla del programa y
  // las resuelve el mismo motor: nada de aritmética nueva acá. Se suman a las
  // que el ramo ya tuviera declaradas, porque "y además falto a esta" es
  // justamente la pregunta.
  const entradas=Object.entries(simAusencias).filter(([id,a])=>a&&a.hacia&&a.hacia!==id);
  if(!entradas.length)return base;
  const previa=r.reglasAusenciaJustificada||r.reglasAusenciaJustificadaUsuario||{};
  return {...base,
    reglasAusenciaJustificada:{
      reemplazos:[...(previa.reemplazos||[]),
        ...entradas.filter(([,a])=>a.tipo==='reemplazo').map(([desdeId,a])=>({desdeId,haciaId:a.hacia}))],
      traspasos:[...(previa.traspasos||[]),
        ...entradas.filter(([,a])=>a.tipo!=='reemplazo').map(([desdeId,a])=>({desdeId,haciaId:a.hacia}))],
    },
    ausenciasJustificadas:[...new Set([...(r.ausenciasJustificadas||[]),...entradas.map(([id])=>id)])],
  };
}
// Solo tiene sentido faltar a algo que todavía no rendiste: si ya tienes la
// nota, no faltaste. Tampoco se ofrece cuando le pusiste una nota hipotética,
// que es la pregunta contraria.
function simPuedeFaltar(c){
  return avgPond(Array.isArray(c.notas)?c.notas:[])===null && !(simState[c.id]||[]).length;
}
function simToggleFalta(catId){
  if(simAusencias[catId])delete simAusencias[catId];
  else{
    const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
    // Por defecto, al examen: es a donde lo manda casi toda normativa que sí
    // lo declara, y es lo primero que alguien quiere preguntar. Se busca por
    // nombre y, si no hay, se usa la última evaluación, que suele serlo.
    const otras=(r.categorias||[]).filter(c=>c.id!==catId);
    if(!otras.length){showToast('Necesitas otra evaluación a la que mover el peso',true);return;}
    const destino=otras.find(c=>/examen/i.test(c.nombre||''))||otras[otras.length-1];
    simAusencias[catId]={hacia:destino.id,tipo:'traspaso'};
  }
  renderSimulador();
}
function simSetFalta(catId,valor){
  const [tipo,hacia]=String(valor||'').split('|');
  if(!hacia)return;
  simAusencias[catId]={hacia,tipo:tipo==='reemplazo'?'reemplazo':'traspaso'};
  renderSimulador();
}
function simProjectedAvg(r){return ramoAvg(simProjectedRamo(r));}

// La meta del simulador (Lucas, 2026-10-23): «Nota mínima» y «Simular» eran
// dos botones que respondían casi lo mismo. Ahora hay uno solo, y la meta
// parte en 4,0 (aprobar) y se ajusta de a 0,1 en la misma hoja. No se guarda.
// El número lo resuelve el motor sobre el mismo ramo que pinta el proyectado.
let simMeta=4.0;
function simCambiarMeta(d){
  simMeta=Math.round(Math.min(7,Math.max(1,simMeta+d))*10)/10;
  renderSimulador();
}
function simNotaNecesaria(proyectado,meta=simMeta){
  const m=simConComa(meta.toFixed(1)),aprobar=Math.abs(meta-4)<1e-9;
  // Con un descarte cuya cantidad no se conoce, el efecto depende de notas que
  // no existen: no se inventa un número (era de la calculadora).
  const descarteAbierto=reglaDescarteConCantidadAbierta(proyectado);
  if(descarteAbierto)return {texto:`No calculamos una nota exacta mientras falte saber cuántas evaluaciones de ${descarteAbierto.nombre} habrá`,
    detalle:'El programa descarta la peor nota, así que su efecto depende de las notas que todavía no existen.'};
  const peso=(proyectado.categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
  if(Math.abs(peso-100)>0.05)return {texto:'Completa la pauta para calcularlo'};
  const calculo=calculoRamoConCompuertas(proyectado);
  const motivo=motivoCalculoPendiente(proyectado);
  if(motivo)return {texto:'Resultado pendiente de confirmar con el curso',detalle:motivo};
  // Lo pendiente se mide igual que notaNecesaria: una categoría sin notas y
  // sin cantidad declarada no siempre aparece en emptyLeaves, y el simulador
  // daba el ramo por cerrado mientras «Nota mínima» pedía una nota.
  const quedaPendiente=calculo.res.emptyLeaves.length>0||estadoParaNotaNecesaria(proyectado).pendiente>1e-9;
  if(!quedaPendiente&&!notaNecesariaCondicional(proyectado)){
    // Ramo cerrado: si llegó a la meta o no (era de la calculadora).
    const avg=ramoAvg(proyectado);
    if(avg===null||aprobar)return null;
    const ok=notaFinalOficial(avg)>=notaFinalOficial(meta);
    return {texto:ok?`Ya tienes el ${m}`:`Ya no quedan evaluaciones para llegar a ${m}`};
  }

  const vinculo=partesDelVinculo(proyectado);
  // En un ramo con laboratorio, lo que falta es para la cátedra sola.
  const necesaria=notaNecesaria(proyectado,meta,vinculo?{soloPropio:true}:null);
  const deCatedra=vinculo?' de cátedra':'';
  const nodos=new Map((calculo.estructura.children||[]).map(c=>[c.id,c]));
  const compuertas=(proyectado.gates||[]).map(g=>{
    const activa=gatesActivas({...proyectado,gates:[g]})[0]||null;
    const ids=g.type==='group_min'?g.catIds:[g.catId];
    const pendiente=(ids||[]).some(id=>{
      const nodo=nodos.get(id);
      return nodo&&gh_hasPendingLeaf(nodo,calculo.notas);
    });
    return {g,activa,pendiente};
  });
  const bloqueante=compuertas.find(x=>x.activa&&!x.pendiente);
  if(bloqueante&&meta>bloqueante.activa.cap+1e-9)return {texto:`Con esto ya no alcanzas el ${m}`,
    detalle:`${bloqueante.activa.nombre} está bajo el mínimo de ${simConComa(fmtPromedio(bloqueante.activa.min))} y topa la nota.`};
  if(necesaria===null)return null;
  if(!Number.isFinite(necesaria)||necesaria>7)return {texto:`Con esto ya no alcanzas el ${m}${deCatedra}`};

  const pendientes=compuertas.filter(x=>x.pendiente);
  const condiciones=pendientes.map(x=>{
    const ids=x.g.type==='group_min'?x.g.catIds:[x.g.catId];
    const nombre=x.g.nombre||(ids||[]).map(id=>(proyectado.categorias||[]).find(c=>c.id===id)?.nombre).filter(Boolean).join(' y ')||'el requisito del ramo';
    return `Además, ${nombre} debe llegar a ${simConComa(fmtPromedio(x.g.min))} para cumplir su mínimo.`;
  }).join(' ');
  if(notaNecesariaCondicional(proyectado))return {texto:`Con ${simConComa(nfNecesaria(necesaria))} en cada evaluación pendiente llegas a ${m}`,detalle:'Cambiar una nota puede activar otra fórmula. Comprueba cada escenario en el simulador.'};
  if(necesaria<=1)return pendientes.length
    ?{texto:`El promedio ponderado ya alcanza el ${m}${deCatedra}`,detalle:condiciones}
    :{texto:`Ya tienes el ${m}${deCatedra} asegurado`};
  return {texto:vinculo
    ?(aprobar?`Para aprobar cátedra necesitas ${simConComa(nfNecesaria(necesaria))} en lo que queda`:`Para el ${m} de cátedra necesitas ${simConComa(nfNecesaria(necesaria))} en lo que queda`)
    :`Para el ${m} necesitas ${simConComa(nfNecesaria(necesaria))} en lo que queda`,detalle:condiciones};
}

function renderSimuladorResumen(r){
  const real=ramoAvg(r);
  const proyectado=simProjectedRamo(r);
  const proj=ramoAvg(proyectado);
  const hasSim=Object.values(simState).some(arr=>arr&&arr.length);

  const avgEl=document.getElementById('sim-avg');
  avgEl.textContent=proj!==null?simConComa(fmtPromedio(proj)):'—';
  avgEl.style.color=proj!==null?getColorRamo(proyectado,proj):'var(--fg3)';

  const deltaEl=document.getElementById('sim-delta');
  // ¿La proyección quedó topada por un piso de nota? Avisar el porqué.
  const gateHit=(r.gates||[]).find(g=>{if(g.type!=='min_grade_required')return false;const c=r.categorias.find(x=>x.id===g.catId);if(!c)return false;const a=avgPond(simCombinadas(c));return a!==null&&!gh_cumpleCompuerta(a,g);});
  if(gateHit&&proj!==null){
    deltaEl.className='sim-delta down';
    deltaEl.textContent=`${gateHit.nombre} bajo ${simConComa(gateHit.min.toFixed(1))}: la nota queda topada en ${simConComa(gateHit.cap.toFixed(1))}`;
    deltaEl.style.display='inline-block';
  } else if(proj!==null&&real!==null&&hasSim){
    const d=r2(notaFinalOficial(proj)-notaFinalOficial(real));
    const cls=d>0?'up':d<0?'down':'flat';
    deltaEl.className='sim-delta '+cls;
    deltaEl.textContent=`${d>0?'+':''}${simConComa(d.toFixed(1))} vs tu ${simConComa(fmtPromedio(real))} actual`;
    deltaEl.style.display='inline-block';
  } else if(real!==null){
    deltaEl.className='sim-delta flat';
    deltaEl.textContent=`Tu promedio actual: ${simConComa(fmtPromedio(real))}`;
    deltaEl.style.display='inline-block';
  } else {deltaEl.style.display='none';}

  const metaEl=document.getElementById('sim-meta');
  if(metaEl)metaEl.textContent=simConComa(simMeta.toFixed(1));
  const menos=document.getElementById('sim-meta-menos'),mas=document.getElementById('sim-meta-mas');
  if(menos)menos.disabled=simMeta<=1;if(mas)mas.disabled=simMeta>=7;
  const neededEl=document.getElementById('sim-needed');
  const necesaria=simNotaNecesaria(proyectado);
  if(neededEl){
    neededEl.hidden=!necesaria;
    neededEl.textContent=necesaria?[necesaria.texto,necesaria.detalle].filter(Boolean).join(' '):'';
  }
  const soloEl=document.getElementById('sim-solo-parte');
  if(soloEl){
    const html=htmlSoloCatedra(proyectado,{fmt:simConComa});
    soloEl.hidden=!html;soloEl.innerHTML=html;
  }

  const cb=document.getElementById('sim-commit-btn');if(cb)cb.disabled=!hasSim;
}

function renderSimulador(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  renderSimuladorResumen(r);

  document.getElementById('sim-cats').innerHTML=r.categorias.map(c=>{
    const catAvg=simCatAvg(c);
    // `c.notas` puede no venir: normalize() lo garantiza al cargar, pero una
    // categoría recién creada en esta sesión por un camino que lo olvide llega
    // sin el arreglo, y ahí `c.notas.map` reventaba al ABRIR el simulador —o
    // sea la ventana quedaba rota sin decir por qué. El resto del archivo ya usa
    // esta guarda; acá faltaba.
    const falta=simAusencias[c.id]||null;
    const notasReales=Array.isArray(c.notas)?c.notas:[];
    // Una casilla con fecha y sin nota todavía no es una nota: desde que cada
    // casilla puede tener su propia fecha existen notas con `valor` en null, y
    // se colaban como una etiqueta vacía ("Laboratorio 1: ").
    const realChips=notasReales.filter(n=>n&&n.valor!==null&&n.valor!==undefined)
      .map(n=>`<span class="sim-chip real">${esc(nombreNotaCasilla(r,c,n))}: ${simConComa(textoCalificacionNota(n))}</span>`).join('');
    const campos=simCamposNotaHTML(r,c);
    return `
      <div class="sim-cat">
        <div class="sim-cat-head">
          <div><div class="sim-cat-name">${esc(c.nombre)}</div><div class="sim-cat-meta">${r2(c.peso)}% del ramo</div></div>
          <div class="sim-cat-avg" id="sim-cat-avg-${esc(c.id)}" style="color:${getColor(catAvg)}">${simConComa(fmtPromedio(catAvg))}</div>
        </div>
        ${realChips?`<div class="sim-chips">${realChips}</div>`:''}
        ${falta?`<div class="sim-falta activa">
          <div class="sim-falta-hd"><b>Ausencia simulada</b><button type="button" class="sim-falta-x" onclick="simToggleFalta('${c.id}')" aria-label="Ya no faltar a ${esc(c.nombre)}">✕</button></div>
          <label class="sim-falta-label" for="sim-falta-${c.id}">¿Qué pasa con su ${r2(c.peso)}%?</label>
          <select id="sim-falta-${c.id}" onchange="simSetFalta('${c.id}',this.value)">${
            (r.categorias||[]).filter(o=>o.id!==c.id).map(o=>{
              const t=esc(o.nombre);
              return `<option value="traspaso|${esc(o.id)}"${falta.tipo!=='reemplazo'&&falta.hacia===o.id?' selected':''}>El ${r2(c.peso)}% se suma a ${t}</option>`+
                     `<option value="reemplazo|${esc(o.id)}"${falta.tipo==='reemplazo'&&falta.hacia===o.id?' selected':''}>Me ponen la nota de ${t}</option>`;
            }).join('')}</select>
          ${falta.tipo==='reemplazo'?'':'<small class="sim-falta-hint">La acumulación tiene un máximo de 75%. El excedente cuenta con nota 1,0.</small>'}
        </div>`:''}
        ${falta?'':`<div class="sim-fields" id="sim-fields-${esc(c.id)}">${campos}</div>`}
      </div>`;
  }).join('');
}

// Una evaluación de nota única (Solemne, Examen) es UNA nota: si ya la tiene,
// real o hipotética, no hay nada más que simular ahí. Antes se podía "agregar"
// un 7.0 encima del 5.5 real y el simulador promediaba los dos; al guardar, la
// categoría quedaba con dos notas que la ficha muestra como una sola casilla.
function simCatLlena(cat){
  if(!cat.directNota||(Number.isInteger(cat.slots)&&cat.slots>1))return false;
  return (cat.notas||[]).some(n=>n.valor!=null)||((simState[cat.id]||[]).length>0);
}
function simCampoNotaHTML(r,c,slot,indice,nota,ofreceFalta){
  const id=`sim-in-${c.id}${indice?'-'+indice:''}`;
  const etiqueta=Number.isInteger(slot)?nombreCasilla(r,c,slot)
    :c.directNota?'Nota hipotética':`Nota ${indice+1}`;
  const sugerencia=conceptosNota().length?'1,0–7,0 o D/A/R':'1,0–7,0';
  return `<div class="sim-field-row">
    <label for="${esc(id)}">${esc(etiqueta)}</label>
    <div class="sim-field-control">
      <input type="text" inputmode="${inputModeNota()}" autocapitalize="characters"
        id="${esc(id)}" data-sim-id="${esc(nota?.id||'')}" value="${nota?esc(simConComa(textoCalificacionNota(nota))):''}"
        placeholder="${sugerencia}" aria-label="Nota hipotética de ${esc(etiqueta)}"
        oninput="simNotaAlEscribir(${esc(JSON.stringify(c.id))},${Number.isInteger(slot)?slot:'null'},this)"
        onblur="simNotaAlSalir(${esc(JSON.stringify(c.id))},${Number.isInteger(slot)?slot:'null'},this)"/>
      ${ofreceFalta?`<button type="button" class="sim-falta-btn" id="sim-falta-btn-${esc(c.id)}"
        onclick="simToggleFalta(${esc(JSON.stringify(c.id))})">Falté</button>`:''}
    </div>
  </div>`;
}
function simCamposNotaHTML(r,c){
  const notas=simState[c.id]||[];
  if(Number.isInteger(c.slots)&&c.slots>1){
    const ocupadas=new Set((c.notas||[]).filter(n=>n&&n.valor!=null&&Number.isInteger(n.slot)).map(n=>n.slot));
    return Array.from({length:c.slots},(_,slot)=>slot).filter(slot=>!ocupadas.has(slot))
      .map((slot,i)=>simCampoNotaHTML(r,c,slot,i,notas.find(n=>n.slot===slot),i===0&&simPuedeFaltar(c))).join('');
  }
  if(c.directNota){
    if((c.notas||[]).some(n=>n&&n.valor!=null))return '';
    return simCampoNotaHTML(r,c,null,0,notas[0],simPuedeFaltar(c));
  }
  return [...notas.map((n,i)=>simCampoNotaHTML(r,c,null,i,n,false)),
    simCampoNotaHTML(r,c,null,notas.length,null,simPuedeFaltar(c))].join('');
}
// La nota entra al estado temporal en cada tecla. El resumen se repinta sin
// reconstruir los campos: hacerlo aquí le quitaría el foco al teclado del iPhone.
function simNotaAlEscribir(catId,slot,input){
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const c=r&&(r.categorias||[]).find(x=>x.id===catId);if(!c||!input)return;
  const raw=input.value,val=parseNota(raw);
  // Primero la traducción habitual de notas (55 → 5,5; D/A/R). Una cifra
  // realmente fuera de escala, como 9, se acerca al borde como en el stepper.
  const fuera=/^\s*[+-]?\d(?:[.,]\d{0,2})?\s*$/.test(raw)?parseFloat(raw.replace(',','.')):NaN;
  const nota=!isNaN(val)?val:Number.isFinite(fuera)?Math.min(7,Math.max(1,fuera)):NaN;
  const lista=simState[catId]||(simState[catId]=[]);
  const fija=Number.isInteger(slot);
  const id=input.dataset?.simId||'';
  const indice=fija?lista.findIndex(n=>n.slot===slot):c.directNota?0:lista.findIndex(n=>n.id===id);
  const anterior=indice>=0?lista[indice]:null;
  if(isNaN(nota)){
    if(anterior)lista.splice(indice,1);
    if(input.dataset)input.dataset.simId='';
    // Al borrar la última nota de un grupo abierto, sobra el campo vacío que
    // había aparecido a continuación. Quitarlo no mueve el foco actual.
    if(anterior&&!fija&&!c.directNota&&input.closest){
      const siguiente=input.closest('.sim-field-row')?.nextElementSibling;
      if(siguiente&&!siguiente.nextElementSibling&&!siguiente.querySelector('input')?.value)siguiente.remove();
    }
  }else if(anterior){
    asignarCalificacionNota(anterior,raw,nota);
  }else{
    const nueva=asignarCalificacionNota({id:uid(),...(fija?{slot}:{})},raw,nota);
    const fila=!fija&&!c.directNota&&input.closest?input.closest('.sim-field-row'):null;
    const posicion=fila?.parentElement?Array.from(fila.parentElement.children).indexOf(fila):-1;
    if(posicion>=0)lista.splice(Math.min(posicion,lista.length),0,nueva);
    else lista.push(nueva);
    if(input.dataset)input.dataset.simId=nueva.id;
    // Una categoría sin cantidad declarada siempre deja una casilla vacía al
    // final. Se añade sin reemplazar el input que la persona está editando.
    if(!fija&&!c.directNota&&fila){
      const contenedor=fila.parentElement;
      if(contenedor&&!fila.nextElementSibling&&contenedor.insertAdjacentHTML)
        contenedor.insertAdjacentHTML('beforeend',simCampoNotaHTML(r,c,null,lista.length,null,false));
    }
  }
  if(!lista.length)delete simState[catId];
  renderSimuladorResumen(r);
  const avg=document.getElementById('sim-cat-avg-'+catId);
  if(avg){const n=simCatAvg(c);avg.textContent=simConComa(fmtPromedio(n));avg.style.color=getColor(n);}
  const falta=document.getElementById('sim-falta-btn-'+catId);
  if(falta)falta.hidden=!simPuedeFaltar(c);
}
function simNotaAlSalir(catId,slot,input){
  const lista=simState[catId]||[];
  const nota=Number.isInteger(slot)?lista.find(n=>n.slot===slot)
    :lista.find(n=>n.id===input.dataset?.simId);
  input.value=nota?simConComa(textoCalificacionNota(nota)):'';
}
function simAddNota(catId){
  const inp=document.getElementById('sim-in-'+catId);if(!inp)return;
  const rawNota=inp.value;
  const val=parseNota(rawNota);
  if(isNaN(val)){showToast('Ingresa una nota entre 1,0 y 7,0',true);return;}
  const r=S.ramos.find(x=>x.id===currentRamoId);
  const cat=r&&(r.categorias||[]).find(c=>c.id===catId);if(!cat)return;
  if(simCatLlena(cat)){showToast(`${cat.nombre} es una sola nota y ya la tiene`,true);return;}
  if(!simState[catId])simState[catId]=[];
  const tieneCasillas=Number.isInteger(cat.slots)&&cat.slots>1;
  let slot;
  if(tieneCasillas){
    const ocupadas=new Set([
      ...(cat.notas||[]).filter(n=>Number.isInteger(n.slot)).map(n=>n.slot),
      ...simState[catId].filter(n=>Number.isInteger(n.slot)).map(n=>n.slot),
    ]);
    slot=Array.from({length:cat.slots},(_,i)=>i).find(i=>!ocupadas.has(i));
    if(slot===undefined){showToast(`Ya simulaste las ${cat.slots} casillas de ${cat.nombre}`,true);return;}
  }
  simState[catId].push(asignarCalificacionNota({id:uid(),...(slot===undefined?{}:{slot})},rawNota,val));
  renderSimulador();
  setTimeout(()=>{const i=document.getElementById('sim-in-'+catId);if(i)i.focus();},30);
}
function simCommit(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const total=Object.values(simState).reduce((a,arr)=>a+(arr?arr.length:0),0);
  if(total===0)return;
  showConfirm('Guardar como notas reales',`Se agregarán ${total} nota${total!==1?'s':''} hipotética${total!==1?'s':''} como notas reales en este ramo.`,()=>{
    r.categorias.forEach(c=>{
      (simState[c.id]||[]).forEach(s=>{
        const conCasilla=Number.isInteger(s.slot);
        c.notas.push({
          id:uid(),nombre:conCasilla?nombreCasilla(r,c,s.slot):'Simulada '+(c.notas.length+1),
          valor:s.valor,peso:1,...(s.calificacionConceptual?{calificacionConceptual:s.calificacionConceptual}:{}),...(conCasilla?{slot:s.slot}:{}),
        });
        openCats[c.id]=true;
      });
    });
    simState={};
    save();track('sim_commit',{notas:total});
    closeModal();renderRamo();
    showToast('✓ Notas agregadas');
  },{label:'Guardar',danger:false});
}
