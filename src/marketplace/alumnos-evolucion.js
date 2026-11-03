// ─── La pantalla de "antes y ahora" ──────────────────────────────────────────
// Cambio del grupo y aprobación antes/ahora; debajo, cada alumno.
// Las explicaciones del método se consultan al final, después de los datos.
// Sin colores del semáforo: subir respecto del ramo no es "aprobar".
const unDecimalPanel=v=>Math.abs(v).toFixed(1);
const conSignoPanel=v=>(v>0.049?'+':v<-0.049?'−':'')+unDecimalPanel(v);
const porcentajePanel=v=>v===null?'—':Math.round(v*100)+'%';
function frenteAlCursoPanel(d,referencia='el ramo'){
  if(d===null)return 'sin comparación';
  return Math.abs(d)<0.05?`igual que ${referencia}`:`${unDecimalPanel(d)} ${d>0?'sobre':'bajo'} ${referencia}`;
}
// No tener un cambio calculable no significa que no haya comparación con el
// curso: puede faltar una sola evaluación de un período, como en Matías.
function motivoSinCambioPanel(m,{breve=false}={}){
  const antes=Math.max(0,MIN_EVALS_COMPARACION-m.antes.nComparadas);
  const ahora=Math.max(0,MIN_EVALS_COMPARACION-m.ahora.nComparadas);
  if(antes&&ahora)return breve?'Faltan evaluaciones':`Faltan evaluaciones comparables antes y ahora (${MIN_EVALS_COMPARACION} por período)`;
  const n=antes||ahora;
  if(!n)return 'Aún pocos datos para comparar antes y ahora';
  return `Falta${n===1?'':'n'} ${n} evaluaci${n===1?'ón':'ones'} ${breve?(antes?'antes':'ahora'):`comparable${n===1?'':'s'} ${antes?'de antes de empezar':'desde que empezó'}`}`;
}
// Cada alumno en una fila (Lucas, 2026-10-23: Estadísticas necesitaba algo
// visual): dónde estaba respecto del ramo antes de empezar (punto hueco) y
// dónde está ahora (punto lleno), sobre una misma escala con el ramo al
// centro. Ordenados por cuánto cambiaron; tocar la fila abre su ficha. El
// texto de cada fila dice lo mismo que el dibujo, para VoiceOver.
function graficoAlumnosAntesAhoraHTML(g,{seccion=false}={}){
  const ref=seccion?'su sección':'el ramo';
  const conDatos=(g.alumnos||[]).filter(m=>m&&m.antes&&m.ahora&&(m.antes.diferencia!==null||m.ahora.diferencia!==null));
  if(!conDatos.length)return '';
  const lim=Math.max(1,Math.ceil(Math.max(...conDatos.flatMap(m=>[m.antes.diferencia,m.ahora.diferencia]).filter(v=>v!==null).map(Math.abs))));
  const pos=d=>(50+Math.max(-1,Math.min(1,d/lim))*50).toFixed(1);
  const lado=d=>d===null?'sin datos':Math.abs(d)<0.05?`igual que ${ref}`:`${unDecimalPanel(d)} ${d>0?'sobre':'bajo'} ${ref}`;
  const orden=[...conDatos].sort((a,b)=>(b.cambio??-99)-(a.cambio??-99)||String(a.nombre).localeCompare(String(b.nombre),'es'));
  const filas=orden.map(m=>{
    const a=m.antes.diferencia,b=m.ahora.diferencia;
    const tramo=a!==null&&b!==null?`<i class="ah-tramo" style="left:${pos(Math.min(a,b))}%;width:${(pos(Math.max(a,b))-pos(Math.min(a,b))).toFixed(1)}%"></i>`:'';
    return `<li><button type="button" data-ver-alumno="${esc(m.id)}">
      <span class="ah-fila-nombre">${esc(m.nombre)}</span>
      <span class="ah-pista" aria-hidden="true"><i class="ah-centro"></i>${tramo}${a!==null?`<i class="ah-dot ah-dot-antes" style="left:${pos(a)}%"></i>`:''}${b!==null?`<i class="ah-dot ah-dot-ahora" style="left:${pos(b)}%"></i>`:''}</span>
      <span class="ah-fila-valores" aria-hidden="true"><span>Antes <b>${a===null?'—':esc(conSignoPanel(a))}</b></span><span>Ahora <b>${b===null?'—':esc(conSignoPanel(b))}</b></span></span>
      <span class="ah-fila-cambio${m.cambio===null||Math.abs(m.cambio)<0.05?'':m.cambio>0?' ah-sube':' ah-baja'}"><small>Cambio</small>${m.cambio===null?'—':esc(conSignoPanel(m.cambio))}<small>${m.cambio===null?esc(motivoSinCambioPanel(m,{breve:true})):'puntos'}</small></span>
      <span class="sr-solo">Antes: ${lado(a)}. Ahora: ${lado(b)}.${m.cambio===null?' '+esc(motivoSinCambioPanel(m))+'.':''}</span></button></li>`;
  }).join('');
  const fuera=g.alumnos.length-conDatos.length;
  return `<section class="ah-alumnos" aria-labelledby="ah-alumnos-titulo">
    <div class="profesor-hig-lista-cabeza"><h2 id="ah-alumnos-titulo">Por alumno</h2></div>
    <p class="ah-referencia">Puntos frente a ${ref} · 0 = su promedio</p>
    <p class="ah-leyenda-fila"><span><i class="ah-dot ah-dot-antes"></i>Antes</span><span><i class="ah-dot ah-dot-ahora"></i>Ahora</span></p>
    <div class="ah-escala" aria-hidden="true"><span></span><span class="ah-escala-ejes"><span>${lim} bajo</span><span>${seccion?'Su sección':'El ramo'}</span><span>${lim} sobre</span></span><span></span></div>
    <ul class="ah-filas">${filas}</ul>
    ${fuera?`<p class="clase-sin-datos">${fuera} ${fuera===1?'alumno no tiene':'alumnos no tienen'} evaluaciones comparables con fecha todavía.</p>`:''}
  </section>`;
}
// `seccion`: la comparación es con la sección de cada alumno; `sinSeccion`,
// cuántos alumnos no la declararon en algún ramo.
function antesAhoraGrupoHTML(g,{seccion=false,sinSeccion=0}={}){
  if(!g||!g.alumnos.length)return '';
  const respecto=seccion?'Respecto de su sección':'Respecto del ramo';
  const tituloCambio=seccion?'Cambio frente a su sección':'Cambio frente al ramo';
  const conFecha=g.antes.n+g.ahora.n;
  // Proporción de alumnos comparables; no es una nota ni un porcentaje de aprobación.
  // Las mismas piezas que Estadísticas del estudiante (htmlAnillo, 2026-10-26),
  // en el acento y nunca en el semáforo: mejorar frente al ramo no es aprobar.
  const anillo=g.conCambio?htmlAnillo({fraccion:g.mejoraron/g.conCambio,color:'var(--ah-acento)',chico:true,
    etiqueta:`${g.mejoraron} de ${g.conCambio} ${g.conCambio===1?'alumno':'alumnos'} mejoraron`,
    centro:`<span class="anillo-valor">${g.mejoraron}</span><span class="anillo-texto">de ${g.conCambio}</span>`}):'<strong>—</strong>';
  const prom=v=>v===null?'—':esc(fmt(v));
  // Antes y ahora es una comparación: dos barras paralelas en la misma escala
  // se comparan de un vistazo, dos anillos no (Lucas, 2026-10-26).
  const aprobacion=(lado,nombre)=>`<div class="ah-aprobacion-fila"><span>${nombre}</span><span class="ah-aprobacion-pista" aria-hidden="true">${lado.aprobacion===null?'':`<i style="width:${Math.round(lado.aprobacion*100)}%"></i>`}</span><b>${porcentajePanel(lado.aprobacion)}</b></div>`;
  return `<section class="ah-grupo ah-visual" aria-labelledby="ah-titulo">
    <div class="ah-panorama">
      <div class="ah-balance">
        <h2 id="ah-titulo">${tituloCambio}</h2>
        <div class="ah-balance-cifras">
          <div><strong class="ah-dato-principal">${g.cambioMediana===null?'—':esc(conSignoPanel(g.cambioMediana))}<small>puntos</small></strong><span class="ah-dato-contexto">${g.cambioMediana===null?'Aún pocos datos':`Mediana · ${g.conCambio} ${g.conCambio===1?'alumno':'alumnos'}`}</span></div>
          <div class="ah-mejoraron">${anillo}<span class="ah-dato-contexto">Mejoraron</span></div>
        </div>
      </div>
      <div class="ah-resultados">
        <h3>Evaluaciones aprobadas</h3>
        <div class="ah-aprobacion">${aprobacion(g.antes,'Antes')}${aprobacion(g.ahora,'Ahora')}</div>
        <div class="ah-promedios"><span>Promedio de evaluaciones</span><span>Antes <b>${prom(g.antes.promedio)}</b><span aria-hidden="true"> → </span><span class="sr-solo">. </span>Ahora <b>${prom(g.ahora.promedio)}</b></span></div>
      </div>
    </div>
    ${graficoAlumnosAntesAhoraHTML(g,{seccion})}
    <p class="ah-alcance">Desde que empezaron contigo. El cambio no demuestra el efecto de las clases.</p>
    <details class="ah-metodo"><summary>Cómo se calcula</summary><p class="clase-privacidad">Con ${conFecha} ${conFecha===1?'evaluación':'evaluaciones'} con fecha${g.sinFecha?`; ${g.sinFecha} ${g.sinFecha===1?'evaluación sin fecha no cuenta':'evaluaciones sin fecha no cuentan'}`:''}. “${respecto}” compara cada nota con el promedio de ${seccion?'su misma sección en GradeHub':'GradeHub'} en esa misma prueba, antes y después de que empezaran contigo.${sinSeccion?` ${sinSeccion} ${sinSeccion===1?'alumno no declaró su sección en algún ramo: ese ramo no cuenta':'alumnos no declararon su sección en algún ramo: esos ramos no cuentan'}.`:''} El cambio de cada alumno pide al menos ${MIN_EVALS_COMPARACION} evaluaciones comparables antes y ${MIN_EVALS_COMPARACION} después. No prueba que la mejora sea por tus clases: quien busca clases suele hacerlo en su peor momento, y desde ahí se sube algo igual.</p></details>
  </section>`;
}
// El mismo gráfico de evolución del historial. Aquí la magnitud sigue siendo
// nota menos promedio del ramo/sección: 0 es su referencia, no una nota 4,0.
// Cada ramo tiene su propia fecha de inicio y se mantiene en una serie separada.
function graficoAntesAhoraSVG(m,{seccion=false,inicios=null,ficha=false}={}){
  const referencia=seccion?'su sección':'el ramo',etiqueta=seccion?'Sección':'Ramo';
  const pts=m.evaluaciones.filter(e=>e.curso!==null);
  if(pts.length<2)return '';
  const ramos=[...new Set(pts.map(e=>e.ramoId??e.ramo))];
  const lim=Math.max(1,Math.ceil(Math.max(...pts.map(e=>Math.abs(e.nota-e.curso)))));
  const t=f=>Date.parse(f+'T12:00:00Z');
  const periodos=(lista)=>['antes','ahora'].map(lado=>{const n=lista.filter(e=>e.lado===lado).length;return `<span>${lado==='antes'?'Antes':'Ahora'} · ${n} ${n===1?'evaluación':'evaluaciones'}</span>`;}).join('');
  return ramos.map((clave,k)=>{
    const lista=pts.filter(e=>(e.ramoId??e.ramo)===clave),inicio=lista[0].inicio;
    const fechaInicio=inicio&&Number.isFinite(t(inicio))?inicio:null;
    const fechas=lista.map(e=>t(e.fecha)).concat(!ficha&&fechaInicio?[t(fechaInicio)]:[]);
    const t0=Math.min(...fechas),t1=Math.max(...fechas);
    const x=f=>t1>t0?(t(f)-t0)/(t1-t0)*100:50;
    const titulo=lista[0].ramo,compartio=inicios?.get(clave)?.fuente==='compartio';
    const verbo=compartio?'Compartió notas':'Empezó contigo';
    const resumen=`Diferencia con ${referencia} en ${lista.length} evaluaciones de ${titulo}${fechaInicio?`; ${compartio?'compartió notas':'empezó'} el ${fechaCorta(fechaInicio)}`:''}. Línea central: 0, el promedio ${seccion?'de su sección':'del ramo'}.`;
    const serie=lista.map(e=>({valor:e.nota-e.curso,x:x(e.fecha),antes:e.lado==='antes',
      etiqueta:`${e.evaluacion} · ${fechaCorta(e.fecha)}`,
      valorTexto:(e.nota>e.curso?'+':'')+nf(e.nota-e.curso,2)+' puntos',
      detalle:`Nota ${nf(e.nota,2)} · ${etiqueta} ${nf(e.curso,2)} · ${e.lado==='antes'?'Antes':'Ahora'}`,
      lectura:`${e.evaluacion} · ${e.ramo} · ${fechaCorta(e.fecha)} · ${e.lado==='antes'?'antes':'ahora'}: ${nf(e.nota,2)} (${etiqueta.toLowerCase()} ${nf(e.curso,2)}). ${e.nota>e.curso?'+':''}${nf(e.nota-e.curso,2)} puntos frente ${seccion?'a su sección':'al ramo'}`}));
    const grafico=lista.length>=2?htmlGraficoEvolucion(serie,'alumno-'+m.id+'-'+k,`diferencia con ${referencia}`,{
      piso:-lim,techo:lim,referencia:0,marcas:[lim,0,-lim],rotulo:n=>n>0?'+'+n:String(n),resumen,
      marca:fechaInicio&&(!ficha||(t(fechaInicio)>=t0&&t(fechaInicio)<=t1))?{x:x(fechaInicio),etiqueta:(compartio?'Compartió':'Empezó')+' · '+fechaCorta(fechaInicio)}:null
    }):'<p class="clase-sin-datos">Falta otra evaluación comparable para mostrar su evolución.</p>';
    if(ficha)return `<div class="pe-evolucion" aria-label="${esc(resumen)}">${grafico}
      <div class="pe-evolucion-fechas"><span>${esc(fechaCorta(lista[0].fecha))}</span><span>${esc(fechaCorta(lista.at(-1).fecha))}</span></div>
      <div class="pe-evolucion-leyenda"><span><i></i>Alumno frente al grupo</span><span><i class="pe-leyenda-cero"></i>0 = promedio del grupo</span><span><i class="pe-leyenda-inicio"></i>Inicio de clases${fechaInicio?' · '+esc(fechaCorta(fechaInicio))+(compartio?' (día que compartió)':''):': sin fecha'}</span></div></div>`;
    return `<section class="ah-evolucion" aria-label="${esc(resumen)}"><header><h3>${esc(titulo)}</h3><p>${fechaInicio?verbo+' el '+esc(fechaCorta(fechaInicio)):'Sin fecha de inicio'}</p></header>
      <p class="ah-evolucion-referencia">Puntos frente ${seccion?'a su sección':'al ramo'} · 0 = su promedio</p>
      ${grafico}<p class="ah-evolucion-periodos">${periodos(lista)}</p></section>`;
  }).join('');
}

function antesAhoraAlumnoHTML(m,{sinSeccion=false,seccion=false,inicios=null}={}){
  const referencia=seccion?'su sección':'el ramo';
  if(!m||!m.evaluaciones.length)return '';
  const resumen=sinSeccion?'Por sección: no disponible, no declaró su sección'
    :m.cambio===null?esc(motivoSinCambioPanel(m))
    :Math.abs(m.cambio)<0.05?`Igual que antes, respecto ${seccion?'de su sección':'del ramo'}`
    :`${m.cambio>0?'Subió':'Bajó'} ${unDecimalPanel(m.cambio)} puntos respecto ${seccion?'de su sección':'del ramo'}`;
  const filas=m.evaluaciones.map(e=>`<tr><td>${esc(fechaCorta(e.fecha))}</td><td>${esc(e.evaluacion)}<small>${esc(e.ramo)} · ${e.lado==='antes'?'antes':'ahora'}</small></td><td>${esc(fmt(e.nota))}</td><td>${e.curso===null?'—':esc(fmt(e.curso))}</td></tr>`).join('');
  return `<div class="ah-alumno">
    <p class="ah-alumno-resumen">${resumen}</p>
    ${sinSeccion?'':`<p class="ah-alumno-lados"><span>Antes: ${frenteAlCursoPanel(m.antes.diferencia,referencia)}</span><span>Ahora: ${frenteAlCursoPanel(m.ahora.diferencia,referencia)}</span></p>`}
    <div class="panel-alumnos-grafico-detalle">${graficoAntesAhoraSVG(m,{seccion,inicios})}</div>
    <details class="ah-detalle"><summary>Ver sus evaluaciones</summary>
      <table class="panel-alumnos-notas"><thead><tr><th>Fecha</th><th>Evaluación</th><th>Nota</th><th>${seccion?'Sección':'Ramo'}</th></tr></thead><tbody>${filas}</tbody></table>
      ${m.sinFecha?`<p class="clase-sin-datos">${m.sinFecha} ${m.sinFecha===1?'nota sin fecha no cuenta':'notas sin fecha no cuentan'}.</p>`:''}
    </details>
  </div>`;
}

// "Empezó contigo el …", en cada ramo: por omisión el día que compartió, que
// suele ser después de la primera clase; el profesor lo corrige ramo por ramo
// y las estadísticas de ese ramo comparan desde ahí.
function lineaInicioRamoHTML(al,r){
  const {dia,fuente}=inicioRamoPanel(al,r);if(!dia)return '';
  return `<p class="panel-alumnos-inicio"><span>Empezó contigo el <b>${esc(fechaCorta(dia))}</b>${fuente==='compartio'?' · el día que compartió':''}</span>
    <button type="button" class="agent-refresh" data-inicio-alumno="${esc(al.id)}" data-inicio-ramo="${esc(r.id)}" aria-label="Cambiar cuándo empezó en ${esc(r.nombre||'este ramo')}">Cambiar</button></p>`;
}
// Hoja con el selector de fecha del sistema (HIG: Date pickers). La fecha no
// puede ser futura: no se compara contra lo que todavía no pasa.
function abrirInicioRamo(al,r,alGuardar,rpc=(nombre,args)=>supabaseClient.rpc(nombre,args)){
  const caja=document.getElementById('modal-content');if(!caja)return;
  const hoy=diaLocalPanel(new Date()),actual=inicioRamoPanel(al,r);
  // Quitar la fecha propia vuelve a la que el profesor puso para todo (#697)
  // o, si no hay, al día que compartió.
  const volverA=al.inicio?`Volver al ${esc(fechaCorta(diaLocalPanel(al.inicio)))}`:'Usar el día que compartió';
  caja.innerHTML=`<div class="modal-title" id="modal-titulo">¿Cuándo empezó ${esc(al.nombre_visible)} contigo en ${esc(r.nombre||'este ramo')}?</div>
    <p class="compartir-explica">Las estadísticas de este ramo comparan cómo le iba antes de esa fecha y cómo le va desde ahí.</p>
    <label class="modal-label" for="inicio-fecha">Primera clase de este ramo</label>
    <div class="modal-input"><input type="date" id="inicio-fecha" min="2000-01-01" max="${hoy}" value="${esc(actual.dia||'')}"></div>
    <p class="compartir-error" id="inicio-error" role="alert" hidden></p>
    ${actual.fuente==='ramo'?`<button type="button" class="rep-link" id="inicio-reset">${volverA}</button>`:''}
    <div class="modal-btns"><button type="button" class="btn-cancel" id="inicio-cancelar">Cancelar</button><button type="button" class="btn-confirm" id="inicio-guardar">Guardar</button></div>`;
  openModal();
  const error=caja.querySelector('#inicio-error'),boton=caja.querySelector('#inicio-guardar');
  const avisar=t=>{error.textContent=t;error.hidden=!t;};
  const guardar=async valor=>{
    boton.disabled=true;avisar('');
    try{
      const {data,error:e}=await rpc('fijar_inicio_ramo_alumno',{p_id:al.id,p_ramo:r.id,p_inicio:valor});
      if(e)throw e;
      // false: el alumno dejó de compartir ese ramo mientras la hoja estaba abierta.
      if(data===false){boton.disabled=false;avisar('Ya no te comparte este ramo.');return;}
      closeModal();showToast('Fecha guardada.');alGuardar();
    }catch(e){boton.disabled=false;avisar(/futura/.test((e&&e.message)||'')?'Elige una fecha que ya pasó.':'No pudimos guardarla. Intenta de nuevo.');}
  };
  caja.querySelector('#inicio-cancelar').addEventListener('click',closeModal);
  boton.addEventListener('click',()=>{
    const v=caja.querySelector('#inicio-fecha').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){avisar('Elige una fecha.');return;}
    if(v>hoy){avisar('Elige una fecha que ya pasó.');return;}
    guardar(v);
  });
  const reset=caja.querySelector('#inicio-reset');if(reset)reset.addEventListener('click',()=>guardar(null));
}
function datosFilaAlumnoPanel(al,ahora=new Date()){
  return conRamosAlumnoPanel(al,contexto=>{
    const visibles=(al.ramos||[]).map(ramoParaPanel);
    const estados={good:0,warn:0,bad:0,neutral:0};
    const datos=visibles.map(ramo=>{
      let avg=null,necesita=null,pendiente=0,nivel='neutral';
      try{
        avg=ramoAvg(ramo,undefined,contexto);
        if(Number.isFinite(avg)){
          nivel=nivelRamo(ramo,avg);
          pendiente=estadoParaNotaNecesaria(ramo).pendiente;
          if(pendiente>0){
            necesita=notaNecesaria(ramo);
            if(!Number.isFinite(necesita))necesita=null;
          }
        }
      }catch(e){}
      estados[nivel]++;
      return {ramo,avg,nivel,necesita,pendiente,motivo:Number.isFinite(avg)?motivoPromedioAlumnoPanel(ramo):''};
    });
    const nivel=estados.bad?'bad':estados.warn?'warn':estados.good?'good':'neutral';
    const prioridad=Math.max(0,...datos.map(d=>d.avg===null?0:d.necesita!==null&&d.necesita>7.05?5
      :d.necesita!==null&&d.necesita>5?4:d.nivel==='bad'?3:d.nivel==='warn'?2:1));
    const exigencia=Math.max(0,...datos.map(d=>Number.isFinite(d.necesita)?d.necesita:0));
    const exigente=datos.filter(d=>Number.isFinite(d.necesita)).sort((a,b)=>b.necesita-a.necesita)[0]||null;
    const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
    let proxima=null;
    try{
      const evento=agendaEvents(visibles).find(e=>e.pending&&e.fecha>=hoy);
      if(evento){
        const d=datos.find(x=>x.ramo===evento.ramo);
        const cuatro=notaParaIrConCuatro(evento,contexto)||{};
        const peso=pesoEventoAgenda(evento);
        proxima={ramo:evento.ramo.nombre,evaluacion:(evento.nota&&evento.nota.nombre)||evento.cat.nombre,
          fecha:evento.fecha,hora:evento.hora||null,avg:d?d.avg:null,necesita:d?d.necesita:null,cuatro,
          // Misma regla que la Agenda: «pesa poco» es menos del 10% del ramo.
          pesaPoco:peso!==null&&peso<EVALUACION_PESA_POCO};
      }
    }catch(e){}
    return {al,nivel,estados,prioridad,exigencia,exigente,proxima,porRamo:datos.map(d=>({nombre:d.ramo.nombre,nivel:d.nivel,motivo:d.motivo}))};
  });
}
function proximaFilaAlumnoHTML(p,exigente){
  if(!p)return `<span class="panel-alumnos-fila-proxima">Sin próxima evaluación con fecha</span>
    <span class="panel-alumnos-fila-meta">${exigente
      ?exigente.necesita>7.05?`Con lo pendiente no alcanza para aprobar ${esc(exigente.ramo.nombre)}`
        :`Para aprobar ${esc(exigente.ramo.nombre)}: ${esc(nfNecesaria(exigente.necesita).replace('.',','))} en lo pendiente`
      :'Aún no se puede calcular cuánto necesita'}</span>`;
  const cuando=fechaCorta(p.fecha)+(p.hora?' · '+p.hora:'');
  let meta='Aún sin notas para calcular cuánto necesita';
  if(p.avg!==null){
    if(p.necesita!==null&&p.necesita>7.05)meta='Con lo pendiente no alcanza para aprobar';
    else if(p.necesita!==null){
      meta=`Para aprobar: ${nfNecesaria(p.necesita).replace('.',',')} en lo pendiente`;
      // Como la Agenda (Lucas, 2026-10-22): si esta sola lo deja en 4,0, se dice
      // la nota, pese lo que pese; si no, y vale menos del 10% del ramo, pesa poco.
      if(p.cuatro.nota)meta+=` · ${p.cuatro.nota.replace('.',',')} en esta para ir con 4`;
      else if(p.pesaPoco)meta+=' · esta evaluación pesa poco';
      else if(p.cuatro.inalcanzable)meta+=' · con esta sola no alcanza';
    }else if(p.cuatro.nota)meta=`${p.cuatro.nota.replace('.',',')} en esta evaluación para ir con 4`;
    else meta='Aún no se puede calcular cuánto necesita';
  }
  return `<span class="panel-alumnos-fila-proxima">Próxima: <b>${esc(p.evaluacion)}</b> · ${esc(p.ramo)} · ${esc(cuando)}</span>
    <span class="panel-alumnos-fila-meta">${esc(meta)}</span>`;
}
