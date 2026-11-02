
function renderStats(){
  const body=document.getElementById('stats-body');const g=gpa(S.ramos);
  const periodo=body.dataset.histPeriodo||'anterior';
  const heroTitle=document.getElementById('stats-hero-title');
  let totalNotas=0;
  S.ramos.forEach(r=>{
    r.categorias.forEach(cat=>{cat.notas.forEach(n=>{
      if(n.valor!==null)totalNotas++;
    });});
  });

  // Hero title dinámico
  if(heroTitle){
    heroTitle.textContent=totalNotas===0?'Este semestre':enVerano()?`${nombreVerano(S.tenant)} · ${semester()}`:`Sem. ${S.careerSemestre} · ${semester()}`;
  }

  let html='';
  // Cada sección se arma por separado y se emite al final en el orden que el
  // estudiante haya dejado, saltando las que escondió. Vive en el scope de la
  // función porque el historial se construye en otro bloque.
  const piezas={};
  if(totalNotas===0){
    const ramosConPauta=S.ramos.filter(r=>Array.isArray(r.categorias)&&r.categorias.length>0).length;
    const evaluaciones=S.ramos.reduce((n,r)=>n+(Array.isArray(r.categorias)?r.categorias.length:0),0);
    html+=`<div class="ag-empty" style="margin:20px 20px 0;">
      <div class="ag-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 56h48"/><rect x="12" y="34" width="8" height="18" rx="1.5"/><rect x="28" y="22" width="8" height="30" rx="1.5"/><rect x="44" y="14" width="8" height="38" rx="1.5"/>
        </svg>
      </div>
      <div class="ag-empty-title">${S.ramos.length?'Parte con tu primera nota':'Agrega tu primer ramo'}</div>
      <div class="ag-empty-desc">${S.ramos.length?`${S.ramos.length} ${S.ramos.length===1?'ramo':'ramos'} y ${evaluaciones} ${evaluaciones===1?'evaluación configurada':'evaluaciones configuradas'}. Ingresa una nota para ver cuánto necesitas.`:'Agrégalo desde Inicio y acá verás tu avance.'}</div>
      ${ramosConPauta<S.ramos.length?`<div class="ag-empty-desc" style="margin-top:8px;">Falta configurar las evaluaciones de ${S.ramos.length-ramosConPauta} ${S.ramos.length-ramosConPauta===1?'ramo':'ramos'}.</div>`:''}
    </div>`;
  } else {
    const avance=avanceEvaluaciones(S.ramos);
    const historialPrevio=lecturaHistorialPrevio(S.historial);
    const previo=historialPrevio.previo;
    const diff=previo&&g!==null?g-previo.gpa:null;
    const tendencia=diff===null?'':Math.abs(diff)<0.05?'igual que':diff>0?'sobre':'bajo';
    const lectura=diff===null
      ? historialPrevio.estado==='sin_notas'
        ? 'Tu semestre archivado todavía no tiene notas para compararlo.'
        : 'Todavía no tienes un semestre archivado con el que compararte.'
      : Math.abs(diff)<0.05?`Vas igual que en ${esc(previo.label||'el semestre anterior')}.`:`Vas ${nf(Math.abs(diff),2)} puntos ${tendencia} ${esc(previo.label||'el semestre anterior')}.`;
    const falta=loQueFaltaPorRamo(S.ramos);
    const filaNecesidad=x=>{
      const imposible=x.necesita>7.05;
      const ex=exigenciaNotaNecesaria(x.necesita);
      const valor=imposible?'—':nfNecesaria(Math.max(1,x.necesita));
      const color=imposible?'var(--red)':'var(--fg)';
      const sub=imposible
        ? 'Ya no alcanza solo con lo pendiente'
        : x.abierto
          ? `Vas ${fmtPromedio(x.avg)} · puede bajar según cuántas notas te tomen`
          : `Vas ${fmtPromedio(x.avg)} en lo evaluado`;
      return `<button class="ag-row stats-priority-row" onclick="openRamo('${esc(x.ramo.id)}')">
        <span class="ag-row-bar" style="background:${esc(x.ramo.color)}"></span>
        <div class="ag-row-main">
          <div class="ag-row-name">${esc(x.ramo.nombre)}</div>
          <div class="ag-row-sub">${sub}</div>
        </div>
        <div class="stats-priority-medidor">${htmlMedidorNota(imposible?7:x.necesita)}<span class="stats-priority-num" style="color:${color};"><span class="sr-solo">Necesitas </span>${valor}</span><small style="color:${ex.color}">${ex.palabra}</small></div>
      </button>`;
    };
    // El promedio del semestre va en el acento y sin palabra: un semestre no se
    // aprueba ni se reprueba (Lucas, 2026-10-26). La raya blanca es el 4,0. El
    // avance va neutro: llegar al 100% es cierre, no aprobación.
    const anilloPromedio=g===null?'':htmlAnillo({fraccion:(g-1)/6,color:'var(--primary)',marca:0.5,
      etiqueta:`Promedio del semestre: ${fmtPromedio(g)}, en una escala de 1 a 7`,
      centro:`<span class="anillo-valor">${fmtPromedio(g)}</span><span class="anillo-texto">Promedio</span>`});
    const anilloAvance=htmlAnillo({fraccion:avance.pct/100,neutro:true,color:'var(--fg2)',
      etiqueta:`${avance.pct}% de las evaluaciones evaluado`,
      centro:`<span class="anillo-valor">${avance.pct}%</span><span class="anillo-texto">Evaluado</span>`});
    piezas.ritmo=`
    <div class="section-hd" style="padding:6px 20px 8px;">
      <span class="section-hd-title">Avance del semestre</span>
    </div>
    <div class="stat-card stats-situation-card stats-anillos${avance.pct===100?' is-complete':''}" style="margin:0 20px 16px;">
      <div class="stats-anillos-fila">
        <figure class="stats-anillo-dato">${anilloPromedio}<figcaption class="stats-anillo-pie"><b>${totalNotas}</b> nota${totalNotas!==1?'s':''} ingresada${totalNotas!==1?'s':''}</figcaption></figure>
        <figure class="stats-anillo-dato">${anilloAvance}<figcaption class="stats-anillo-pie">del peso evaluable</figcaption></figure>
      </div>
      <div class="stats-situation-reading">${lectura}</div>
    </div>
    `;
    // Qué mueve el promedio: cada ramo suma o resta según cuánto se aleja del
    // promedio y cuánto pesa. Verde lo que suma y rojo lo que resta (Lucas,
    // 2026-10-26): acá el color dice hacia dónde empuja, no si se aprueba.
    const aportes=aporteAlPromedio(S.ramos);
    if(aportes.length>1&&g!==null){
      const max=Math.max(0.05,...aportes.map(a=>Math.abs(a.aporte)));
      piezas.mueven=`
      <div class="section-hd" style="padding:0 20px 8px;">
        <span class="section-hd-title">Qué mueve tu promedio</span>
      </div>
      <div class="stat-card stats-mueven" style="margin:0 20px 16px;">
        ${aportes.map(a=>{
          const igual=Math.abs(a.aporte)<0.005;
          const texto=igual?'0.00':(a.aporte>0?'+':'−')+nf(Math.abs(a.aporte),2);
          const color=igual?'var(--fg3)':a.aporte>0?'var(--green)':'var(--red)';
          return `<button type="button" class="stats-mueven-fila" onclick="openRamo('${esc(a.ramo.id)}')">
            <span class="stats-mueven-cabeza"><span class="stats-mueven-nombre">${esc(a.ramo.nombre)}</span><b class="stats-mueven-delta" style="color:${color}">${texto}</b></span>
            ${htmlBarraCentrada(a.aporte,max,color)}
            <span class="sr-solo">${igual?'No mueve tu promedio':`${a.aporte>0?'Sube':'Baja'} tu promedio en ${nf(Math.abs(a.aporte),2)}`}</span>
          </button>`;
        }).join('')}
        <div class="stat-sub" style="margin-top:8px;">Cuánto sube o baja cada ramo tu ${fmtPromedio(g)}${gpaMode(S.ramos)==='creditos'?', según sus créditos':''}.</div>
      </div>`;
    }
    {
      const proy=proyeccionSemestre(S.ramos);
      // Se muestran solo 3, ordenados por lo que exigen: una lista de ocho ramos
      // deja de ser una prioridad. El texto que lo explicaba se sacó el
      // 2026-10-26 (Lucas): el medidor de cada ramo ya dice cuánto exige.
      if(falta.length){
        piezas.prioridades=`
        <div class="section-hd" style="padding:0 20px 8px;">
          <span class="section-hd-title">Tus prioridades hoy</span>
        </div>
        <div style="padding:0 20px;">
          ${falta.slice(0,3).map(filaNecesidad).join('')}
        </div>`;
      }

      // Cómo va respecto de quienes cursan lo mismo. La sección se pinta vacía
      // y se rellena cuando el servidor responde: bloquear Estadísticas hasta
      // que vuelva una comparación dejaría la pantalla en blanco por algo
      // secundario.
      piezas.curso=`
        <div class="section-hd" style="padding:20px 20px 8px;">
          <span class="section-hd-title">Cómo vas respecto a los demás</span>
        </div>
        <div id="stats-curso" class="stats-curso"></div>`;
      if(proy){
        piezas.rango=`
        <div class="section-hd" style="padding:20px 20px 8px;">
          <span class="section-hd-title">Rango del semestre</span>
        </div>
        <div class="stat-card stats-range-card" style="margin:0 20px 16px;">
          <div class="stat-label">Tu promedio final puede quedar entre</div>
          <div class="stat-val" style="margin-top:4px;">
            <span>${nf(proy.piso)}</span>
            <span style="color:var(--fg3);font-weight:600;"> y </span>
            <span>${nf(proy.techo)}</span>
          </div>
          ${htmlEscalaNotas({piso:proy.piso,techo:proy.techo,actual:g})}
          <div class="stat-sub" style="margin-top:6px;">El rango considera sacar entre 1,0 y 7,0 en todo lo pendiente, incluidas las reglas que pueden topar una nota.</div>
        </div>`;
      }
    }
  }

  // Historial de semestres. El encabezado y el botón para cargar uno anterior van
  // aunque el historial esté vacío: quien llega en cuarto semestre necesita
  // justamente eso, y si solo apareciera con historial ya existente no lo vería
  // nunca.
  {
    const validos=(S.historial||[]).filter(h=>h&&Array.isArray(h.ramos));
    let hist=`<div class="section-hd stats-history-heading" style="padding:0 20px 8px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <span class="section-hd-title">Historial</span>
      <button type="button" class="stats-hist-add" onclick="openSemestreAnteriorModal()">+ Semestre anterior</button>
    </div>`;
    const acumulado=promedioAcumuladoCierre(validos);
    if(acumulado!==null)hist+=`<p class="stats-hist-vacio">Promedio del historial: <strong>${fmtPromedio(acumulado)}</strong></p>`;
    if(!validos.length){
      hist+=`<p class="stats-hist-vacio">Agrega tus semestres anteriores para que cuenten en tu promedio de carrera.</p>`;
    }
    // Un punto por semestre, sin interpolar notas ni cambiar la escala 1–7.
    {
      const serie=serieEvolucionSemestres(validos,g,periodo);
      if(serie.length>=2){
        const ultimo=serie[serie.length-1];
        const anterior=ultimo.actual?serie[serie.length-2]:null;
        const diferencia=anterior?ultimo.v-anterior.v:null;
        const igual=diferencia!==null&&Math.abs(diferencia)<0.05;
        const lectura=diferencia===null?'':igual?`Sin cambio frente a ${anterior.label||'el semestre anterior'}`
          :`${nf(Math.abs(diferencia),2)} puntos ${diferencia>0?'más':'menos'} que en ${anterior.label||'el semestre anterior'}`;
        const etiqueta=x=>x.actual?`Actual · ${x.label}`:x.label||'Semestre anterior';
        hist+=`<figure class="stats-hist-comparacion">
          <figcaption class="stats-hist-titular"><div><span>Promedio por semestre</span><strong>${fmtPromedio(ultimo.v)}</strong>
            ${anterior?`<div class="stats-hist-delta" aria-label="${esc(lectura)}"><b class="${igual?'es-igual':diferencia>0?'es-sube':'es-baja'}">${igual?'Sin cambio':(diferencia>0?'↗ +':'↘ −')+nf(Math.abs(diferencia),2)+' puntos'}</b><span>vs. ${esc(anterior.label||'semestre anterior')}</span></div>`:''}
          </div><span class="stats-hist-periodo-actual">${esc(etiqueta(ultimo))}</span></figcaption>
          ${htmlGraficoEvolucion(serie.map(x=>({etiqueta:etiqueta(x),valor:x.v,actual:x.actual})),'historial')}
          <div class="stats-hist-periodo" role="group" aria-label="Semestres a comparar">${[['anterior','Semestre pasado'],['5','Últimos 5'],['todo','Desde el inicio']].map(([id,texto])=>`<button type="button" data-hist-periodo="${id}" aria-pressed="${periodo===id}" onclick="cambiarPeriodoHistorial('${id}')">${texto}</button>`).join('')}</div>
        </figure>`;
      }
    }
    if(validos.length>0){
      validos.forEach(h=>{
        const isOpen=openHist[h.id];
        const historialGpa=gpaHistorial(h);
        const gpaColor=historialGpa!==null?getColor(historialGpa):'var(--fg3)';
        const ramosHistorial=h.ramos.filter(r=>r&&typeof r==='object');
        const ramosRows=ramosHistorial.map(r=>{
          const avg=histRamoAvg(r,h.ramos);
          return `<button class="hist-ramo-row" onclick="openEditHistRamoModal('${esc(h.id)}','${esc(r.id)}')" aria-label="Editar promedio de ${esc(r.nombre)}">
            <span class="hist-ramo-name">${esc(r.nombre)}${cierreRamoIncompleto(r,h.ramos)?'<small class="cierre-incompleto">Cierre incompleto</small>':''}${r.creditos?`<span class="hist-cr">${r.creditos} cr</span>`:''}</span>
            <span class="hist-ramo-val" style="color:${getColorRamo(r,avg)}">${fmtPromedio(avg)}</span>
            <svg class="ic hist-pencil" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          </button>`;
        }).join('');
        hist+=`
          <div class="hist-card">
            <div class="hist-header" role="button" tabindex="0" onclick="toggleHist('${h.id}')">
              <div style="flex:1;">
                <div style="font-size:0.96875rem;font-weight:700;color:var(--fg);letter-spacing:-.01em;">${esc(h.label)}</div>
                <div style="font-size:0.75rem;color:var(--fg3);margin-top:3px;">${Number.isFinite(h.careerSemestre)?`Sem. ${h.careerSemestre} · `:''}${ramosHistorial.length} ramo${ramosHistorial.length!==1?'s':''}</div>
              </div>
              <span class="hist-gpa" style="color:${gpaColor}">${historialGpa!==null?fmtPromedio(historialGpa):'—'}</span>
              <span style="color:var(--fg3);font-size:0.6875rem;">${isOpen?'▲':'▼'}</span>
            </div>
            <div class="hist-body${isOpen?' open':''}">
              ${ramosRows||'<p style="font-size:0.8125rem;color:var(--fg3);">Sin ramos</p>'}
              <div class="hist-acciones">
                <button type="button" class="hist-accion" onclick="openRenombrarHistModal('${esc(h.id)}')">Editar</button>
                <button type="button" class="hist-accion hist-accion-del" onclick="pedirBorrarHistorial('${esc(h.id)}')">Eliminar semestre</button>
              </div>
            </div>
          </div>`;
      });
    }
    piezas.historial=hist;
  }

  // Tu olfato: cuánto te sacas de verdad cuando dices que te fue bien o mal.
  if(typeof resumenOlfato==='function'&&avisosPruebasDisponibles()){
    const o=resumenOlfato();
    if(o.pares){
      const titular=o.veredicto==='pesimista'?`Eres pesimista: te va ${simConComa(Math.abs(o.diferencia).toFixed(1))} mejor de lo que crees`
        :o.veredicto==='optimista'?`Eres optimista: te va ${simConComa(Math.abs(o.diferencia).toFixed(1))} peor de lo que crees`
        :o.veredicto==='acierto'?'Tienes buen olfato: lo que sientes es lo que te sacas'
        :`Faltan ${3-o.pares} prueba${3-o.pares===1?'':'s'} para tu veredicto`;
      piezas.olfato=`
        <div class="section-hd" style="padding:20px 20px 8px;">
          <span class="section-hd-title">Tu olfato</span>
        </div>
        <div class="stat-card stats-olfato-card" style="margin:0 20px 16px;">
          <div class="stats-olfato-titular">${esc(titular)}</div>
          ${o.filas.map(f=>`<div class="stats-olfato-fila"><span>Cuando dices <b>${esc(f.s.texto)}</b></span><span class="stats-olfato-nota">${esc(f.h.texto)}<small>${f.h.veces===1?'1 vez':f.h.veces+' veces'}</small></span></div>`).join('')}
          <p class="stats-olfato-nota-pie">Se arma con lo que respondes en la pantalla de bloqueo al terminar cada prueba. Solo en este iPhone.</p>
        </div>`;
    }
  }

  // Las secciones se emiten en el orden que dejó el estudiante y sin las que
  // escondió. Una sección que no existe en este semestre —no hay proyección, no
  // hay nada urgente— simplemente no está en `piezas` y se salta sola.
  ordenSecciones().forEach(id=>{
    if(seccionOculta(id))return;
    if(piezas[id])html+=piezas[id];
  });

  body.innerHTML=html;
  enlazarGraficosEvolucion(body);
  // El HTML ya está en pantalla; la comparación se rellena cuando el servidor
  // conteste. Sin await: Estadísticas no espera por una sección secundaria.
  if(!seccionOculta('curso'))pintarPosicionesCurso();
}
