// Render de las vistas principales. Carga después de app.js: usa sus datos y helpers globales.

// Las recorrecciones pendientes, arriba de los ramos.
//
// Vivían solo en la Agenda y en la ficha del ramo, o sea había que ir a
// buscarlas. Una recorrección con plazo es lo contrario: si te enteras cuando
// abres el ramo, ya puede ser tarde.
//
// El rojo de acá NO es el del semáforo. No dice nada sobre la nota —de hecho la
// nota ya está puesta— sino que se te acaba el plazo para reclamarla. Por eso
// usa `--red` como los errores y el "ya no alcanza" de la calculadora, y nunca
// las clases `good`/`warn`/`bad`, que sí significan aprobado, al borde y
// reprobado.
function renderRecorreccionesHome(){
  const caja=document.getElementById('home-recorrecciones');
  if(!caja)return;
  const items=typeof recorreccionesPendientes==='function'?recorreccionesPendientes():[];
  if(!items.length){caja.style.display='none';caja.innerHTML='';return;}
  const urgentes=items.filter(x=>x.dias!==null&&x.dias<=RECORRECCION_DIAS_URGENTE);
  const plazo=x=>{
    const derecho=textoPlazoRecorreccion(x.plazo);
    if(x.dias===null)return derecho;
    if(x.dias<0)return `${derecho} · venció hace ${Math.abs(x.dias)} ${Math.abs(x.dias)===1?'día':'días'}`;
    if(x.dias===0)return `${derecho} · vence hoy`;
    if(x.dias===1)return `${derecho} · queda 1 día`;
    return `${derecho} · quedan ${x.dias} días`;
  };
  caja.style.display='block';
  caja.className='home-recorrecciones'+(urgentes.length?' urgente':'');
  caja.innerHTML=`
    <div class="home-recorrecciones-hd">
      <span class="section-hd-title">Por mandar a recorregir</span>
      <span class="ag-count">${items.length}</span>
    </div>
    ${items.map(x=>`<article class="home-recorreccion-row${x.dias!==null&&x.dias<=RECORRECCION_DIAS_URGENTE?' urgente':''}" role="button" tabindex="0" onclick="openRamo('${esc(x.ramo.id)}')">
      <div>
        <strong>${esc(nombreNotaCasilla(x.ramo,x.cat,x.nota))}</strong>
        <span>${esc(x.ramo.nombre)} · ${esc(plazo(x))}</span>
      </div>
    </article>`).join('')}`;
}
function renderHome(){
  renderPropuestasPautaHome();
  renderRecorreccionesHome();
  renderWrappedHome();
  const g=gpa(S.ramos);
  const gpael=document.getElementById('home-gpa');
  const emptyHint=document.getElementById('gpa-empty-hint');
  const gpaSub=document.getElementById('home-gpa-sub');
  const gpaMethod=document.getElementById('home-gpa-method');
  const ramosHd=document.getElementById('ramos-hd');
  const tagsEl=document.getElementById('gpa-tags');
  const deltaEl=document.getElementById('gpa-delta');
  const first=(S.userName||'').split(' ')[0]||'';
  document.getElementById('home-greeting').innerHTML=`${fraseInicio()}${first?', <span class="greet-name">'+esc(first)+'</span>':''}`;
  refreshAvatar();
  // Glifo de la universidad junto al wordmark
  const bg=document.getElementById('brand-glyph');
  if(bg){
    bg.innerHTML=tenantGlyphBare(S.tenant);
    const t=TENANTS[S.tenant];
    bg.title=t?t.name:'';
  }

  const sortBtn=document.getElementById('sort-btn');
  if(sortBtn){
    // Los íconos van en SVG como todo el resto: '↕' y '↓' son caracteres con
    // presentación emoji y muchos sistemas los dibujan a color, así que
    // quedaban como emoji sueltos en una interfaz que no usa ninguno. `.ic`
    // mide 1em y ya está alineado para ir dentro de una línea de texto.
    const labels={manual:'Manual',avg:'Por nota',name:'A-Z'};
    const iconos={
      manual:'<path d="M7 6h13M7 12h13M7 18h13"/><circle cx="3.5" cy="6" r=".8" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r=".8" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r=".8" fill="currentColor" stroke="none"/>',
      avg:'<path d="M5 6h14M8 12h11M11 18h8"/>',
      name:'<path d="M5 7h6M5 17h6M16 5v14M13 16l3 3 3-3"/>'
    };
    const label=labels[S.sortMode]||labels.manual;
    sortBtn.innerHTML=`<span>${label}</span><svg class="ic sort-mode-icon" viewBox="0 0 24 24" aria-hidden="true">${iconos[S.sortMode]||iconos.manual}</svg>`;
    sortBtn.setAttribute('aria-label',`Ordenar ramos. Ahora: ${label}`);
  }

  const simGlobalBtn=document.getElementById('sim-global-btn');
  if(S.ramos.length===0){
    gpael.textContent='·';gpael.className='gpa-num empty';
    gpaSub.style.display='none';gpaMethod.style.display='none';emptyHint.style.display='block';
    if(tagsEl)tagsEl.style.display='none';
    if(deltaEl)deltaEl.style.display='none';
    if(simGlobalBtn)simGlobalBtn.style.display='none';
    const mb=document.getElementById('gpa-malla-btn');
    if(mb)mb.style.display=mallaFaltantes().length?'inline-flex':'none';
    // Las insight cards se pintan más abajo; al salir acá quedaban las del
    // semestre recién archivado, apuntando a ramos que ya no existen.
    const ins=document.getElementById('home-insights');
    if(ins){ins.innerHTML='';ins.style.display='none';}
    ramosHd.style.display='none';document.getElementById('home-ramos').innerHTML='';return;
  }
  emptyHint.style.display='none';gpaSub.style.display='block';ramosHd.style.display='flex';
  // El simulador global tiene sentido con 2+ ramos (con 1 es igual al del ramo)
  if(simGlobalBtn)simGlobalBtn.style.display=S.ramos.length>=2?'flex':'none';

  if(g!==null){
    // La nota oficial, su color y la distancia al siguiente nivel parten del
    // mismo redondeo a una décima. El decimal va atenuado con el mismo gradient.
    const rounded=fmtPromedio(g);
    const sep=rounded.indexOf('.');
    const entera=rounded.slice(0,sep);
    const decimal=rounded.slice(sep);
    gpael.innerHTML=`${entera}<span class="gpa-decimal">${decimal}</span>`;
    gpael.className='gpa-num '+colorClass(g)+claseNotaEspecial(g);
    gpael.style.setProperty('--grade-color',getColor(g));
    pintarPromedioExacto('home-gpa-exacto',g);
    gpael.onclick=()=>{
      alternarPromedioExacto();
      pintarPromedioExacto('home-gpa-exacto',g);
      if(!promedioExactoVisible)return;
      const oficial=notaFinalOficial(g);
      const umbrales=[4.0,5.0,6.0,7.0];
      const next=umbrales.find(u=>u>oficial+0.001);
      let msg=`Promedio redondeado: ${fmtPromedio(g)}`;
      if(next!==undefined){
        // El borde sale de la regla de la universidad (3,95 en la común, 3,945
        // en la UAndes) y la distancia se redondea hacia arriba: con 3,949 decía
        // "0.00 para redondear a 4.0".
        const falta=Math.ceil((gh_bordeOficial(next,gh_reglasNota(S.tenant))-g)*100-1e-9)/100;
        msg+=`  ·  ${nf(Math.max(0.01,falta),2)} para redondear a ${nf(next)}`;
      }else{
        msg+=`  ·  máximo`;
      }
      // Transparencia: el modo se explica sin pedir que alguien invente SCT.
      const detalle=descripcionMetodoGpa(S.ramos);
      if(detalle)msg+='\n'+detalle.texto;
      showToast(msg);
    };
    if(pendingGpaFeedback&&Math.abs(pendingGpaFeedback.despues-g)<.0001){
      animarPromedio(gpael,pendingGpaFeedback.antes,pendingGpaFeedback.despues,'gpa');
      pendingGpaFeedback=null;
    }
  }else{
    gpael.textContent='·';gpael.className='gpa-num empty';gpael.onclick=null;
    pintarPromedioExacto('home-gpa-exacto',null);
  }
  const cr=totalCreditos(S.ramos);
  const modo=gpaMode(S.ramos);
  const periodoActual=semester();
  const detalleActual=`${S.ramos.length} ${S.ramos.length===1?'ramo':'ramos'}`
    +(modo==='creditos'?` · ${cr} créditos`:'');
  // El costado derecho del promedio estaba vacío. Llevar aquí el contexto que
  // ya aparecía debajo equilibra el bloque sin inventar otra estadística.
  gpaSub.innerHTML=`<strong>${esc(periodoActual)}</strong><span>${detalleActual}</span>`;
  gpaSub.style.display=S.ramos.length?'flex':'none';
  const detalleMetodo=descripcionMetodoGpa(S.ramos);
  if(detalleMetodo){
    gpaMethod.textContent=detalleMetodo.texto;
    gpaMethod.style.display='block';
  }else if(g===null){
    gpaMethod.textContent='Abre un ramo para ingresar tu primera nota.';
    gpaMethod.style.display='block';
  }else gpaMethod.style.display='none';

  // Chips de estado — contexto exclusivo del promedio general
  if(tagsEl){
    let good=0,goodEnCurso=0,warn=0,bad=0,pend=0;
    S.ramos.forEach(r=>{
      const a=ramoAvg(r),nivel=a===null?'neutral':nivelRamo(r,a);
      if(nivel==='neutral')pend++;
      else if(nivel==='good'){
        if(ramoCompletamenteEvaluado(r))good++;
        else goodEnCurso++;
      }else if(nivel==='warn')warn++;
      else bad++;
    });
    const parts=[];
    if(good)parts.push(`<span class="gpa-tag"><span class="gpa-tag-dot good"></span>${good} aprobado${good!==1?'s':''}</span>`);
    if(goodEnCurso)parts.push(`<span class="gpa-tag"><span class="gpa-tag-dot good"></span>${goodEnCurso} ${goodEnCurso===1?'va':'van'} aprobando</span>`);
    if(warn)parts.push(`<span class="gpa-tag"><span class="gpa-tag-dot warn"></span>${warn} en riesgo</span>`);
    if(bad)parts.push(`<span class="gpa-tag"><span class="gpa-tag-dot bad"></span>${bad} bajo 4.0</span>`);
    if(pend)parts.push(`<span class="gpa-tag"><span class="gpa-tag-dot neutral"></span>${pend} pendiente${pend!==1?'s':''}</span>`);
    tagsEl.innerHTML=parts.join('');
    tagsEl.style.display=parts.length?'flex':'none';
  }

  // Delta vs último semestre archivado (si existe)
  if(deltaEl){
    const last=ultimoHistorialConGpa(S.historial);
    const lastGpa=last?last.gpa:null;
    if(g!==null && lastGpa!==null){
      const diff=g-lastGpa;const abs=Math.abs(diff);
      const kind=abs<0.05?'flat':diff>0?'up':'down';
      const arrow=kind==='up'?'↑':kind==='down'?'↓':'·';
      deltaEl.className='gpa-delta '+kind;
      deltaEl.innerHTML=`<strong>${arrow} ${nf(abs,2)}</strong><span>vs. ${esc(last.label||'semestre anterior')}</span>`;
      deltaEl.title=`vs ${last.label||'semestre anterior'}`;
      deltaEl.style.display='inline-flex';
    }else{
      deltaEl.style.display='none';
    }
  }

  // Insight cards (arriba de la lista de ramos): próxima prueba, riesgo, última nota
  const insightsEl=document.getElementById('home-insights');
  if(insightsEl){
    const cards=[];
    const ne=nextExam();
    if(ne){
      const daysLabel=ne.daysUntil===0?'hoy':ne.daysUntil===1?'mañana':`en ${ne.daysUntil} días`;
      // El color del ramo va en la línea lateral y el ícono, no en el texto:
      // un ramo violeta dejaba "en 2 días" a 3,9:1 en modo claro.
      cards.push(`
        <div class="insight-card" role="button" tabindex="0" style="--insight-color:${esc(ne.ramo.color)}" onclick="openRamo('${esc(ne.ramo.id)}')">
          <div class="insight-icon"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg></div>
          <div class="insight-body">
            <div class="insight-label">Próxima evaluación</div>
            <div class="insight-title">${esc(ne.nombre)} · ${esc(ne.ramo.nombre)}</div>
            <div class="insight-meta"><span class="strong" style="color:var(--fg)">${daysLabel}</span></div>
          </div>
          <span class="chevron-r">›</span>
        </div>`);
    }
    const risky=mostRiskyRamo();
    if(risky){
      // El caso sin salida no se pinta como una advertencia más: si ya no se
      // puede aprobar con lo que queda, la etiqueta y el color tienen que
      // decirlo, no pedir una nota que no existe en la escala.
      // Con los tokens del semáforo y no con hex: '#ff7a8f' y '#ffcf5c' eran
      // los del modo oscuro, y en claro el número quedaba a 2,5:1 y 1,4:1.
      const warnColor=(risky.imposible||!notaAprobadaRamo(risky.ramo,risky.avg))?'var(--red)':'var(--yellow)';
      cards.push(`
        <div class="insight-card" role="button" tabindex="0" style="--insight-color:${warnColor}" onclick="openRamo('${esc(risky.ramo.id)}')">
          <div class="insight-icon"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".8" fill="currentColor"/></svg></div>
          <div class="insight-body">
            <div class="insight-label">${risky.imposible?'Ya no alcanza':'Ramo en riesgo'}</div>
            <div class="insight-title">${esc(risky.ramo.nombre)}</div>
            <div class="insight-meta">${risky.imposible
              ?'Con lo que queda por rendir ya no se llega a 4,0'
              :`Necesitas <span class="strong">${nfNecesaria(risky.needed)}</span> promedio en lo pendiente para aprobar`}</div>
          </div>
          <span class="chevron-r">›</span>
        </div>`);
    }
    // Última nota: solo la muestro si NO hay próxima ni riesgo (para no saturar)
    if(cards.length===0){
      const lg=latestGrade();
      if(lg){
        const noteColor=getColor(lg.nota.valor);
        cards.push(`
          <div class="insight-card" role="button" tabindex="0" style="--insight-color:${noteColor}" onclick="openRamo('${esc(lg.ramo.id)}')">
            <div class="insight-icon"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
            <div class="insight-body">
              <div class="insight-label">Última nota</div>
              <div class="insight-title">${esc(lg.cat.nombre)} · ${esc(lg.ramo.nombre)}</div>
              <div class="insight-meta"><span class="strong">${textoCalificacionNota(lg.nota)}</span></div>
            </div>
            <span class="chevron-r">›</span>
          </div>`);
      }
    }
    insightsEl.innerHTML=cards.join('');
    insightsEl.style.display=cards.length?'block':'none';
  }

  let ramos=[...S.ramos];
  if(S.sortMode==='avg') ramos.sort((a,b)=>{const da=ramoAvg(a)??-1,db=ramoAvg(b)??-1;return db-da;});
  else if(S.sortMode==='name') ramos.sort((a,b)=>a.nombre.localeCompare(b.nombre));

  const c=document.getElementById('home-ramos');
  // La lista sigue montada mientras la persona entra a un ramo. Leer el avance
  // anterior desde esas filas permite distinguir un cierre real de un ramo que
  // ya venía en 100%, sin guardar estado nuevo ni repetir el efecto en cada render.
  const progresosAnteriores=new Map([...c.querySelectorAll('.ramo-row[data-progress]')]
    .map(fila=>[fila.dataset.ramoId,Number(fila.dataset.progress)]));
  c.innerHTML='';
  ramos.forEach(r=>{
    const avg=ramoAvg(r);const nc=r.categorias.length;
    // La lista ya se vació. Si una integración dejó una categoría sin el
    // arreglo `notas`, ese ramo sigue siendo parte del semestre: se muestra
    // como sin notas en vez de borrar visualmente todos los ramos.
    // Notas puestas, no casillas: una casilla creada solo para ponerle fecha
    // dejaba el ramo en "0% evaluado" en vez de decir cuántas evaluaciones tiene.
    const nn=r.categorias.reduce((a,cat)=>a+(Array.isArray(cat.notas)?cat.notas.filter(n=>n&&n.valor!=null).length:0),0);
    const prog=ramoProgress(r);
    const completo=prog.pct===100;
    const recienCerrado=ramoRecienCerrado(progresosAnteriores.get(r.id),prog.pct);
    let metaHtml;
    if(nc===0){
      metaHtml=`<span class="ramo-meta-text">Sin evaluaciones</span>`;
    } else if(nn===0){
      metaHtml=`<span class="ramo-meta-text">${nc} ${nc===1?'evaluación':'evaluaciones'}</span>`;
    } else {
      const pctLabel=completo?'100%':`${prog.pct}% evaluado`;
      metaHtml=`<span class="ramo-meta-text${completo?' is-complete':''}">${pctLabel}</span>`;
    }
    const sig=siglaDeRamo(r);
    const div=document.createElement('div');div.className='ramo-row';div.dataset.ramoId=r.id;div.onclick=()=>openRamo(r.id);
    div.dataset.progress=String(prog.pct);
    div.style.setProperty('--ramo-progress-scale',String(prog.pct/100));
    if(nn>0){
      div.classList.add('has-progress');
      if(completo)div.classList.add('is-complete');
      if(recienCerrado)div.classList.add('just-completed');
    }
    if(S.sortMode==='manual')div.dataset.reorderable='true';
    div.style.setProperty('--ramo-tint',r.color);
    const control=S.sortMode==='manual'
      ? `<button type="button" class="ramo-drag-handle" aria-label="Mantén presionado para mover ${esc(r.nombre)}" title="Mantén presionado para mover">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/></svg>
        </button>`
      : '<span class="chevron-r">›</span>';
    div.innerHTML=`
      <div class="ramo-band" aria-hidden="true" style="background:${esc(r.color)}"></div>
      <div class="ramo-info"><button type="button" class="ramo-name">${esc(r.nombre)}</button><div class="ramo-meta">${sig?`<span class="ramo-sigla">${esc(sig)}</span>`:''}${metaHtml}</div></div>
      <div class="ramo-grade-action"><div class="ramo-nota ${colorClassRamo(r,avg)}" style="--grade-color:${getColorRamo(r,avg)}">${fmtPromedio(avg)}</div>${control}</div>
      ${nc>0?'<span class="ramo-progress-track" aria-hidden="true"><span class="ramo-progress-fill"></span></span>':''}`;
    c.appendChild(div);
  });
  if(S.sortMode==='manual')activarReordenRamos(c);
  // Publicidad de clases junto al ramo que calza. Vive en marketplace.js y
  // decide en el navegador; si no hay nada que mostrar, no pinta nada.
  if(typeof pintarRecomendacionClase==='function')pintarRecomendacionClase(c);
}
// Si las reglas del programa están desplegadas es una preferencia de lectura de
// esta sesión, igual que el orden de la Agenda: no entra a S ni a gradehub_v1.
// Plegar un texto no justifica migrar el estado guardado de nadie.
