// Horario de la semana dentro de la Agenda (Lucas, 2026-11-15: «Evaluaciones |
// Horario», como la #644). Solo en la app nativa: hasta el lanzamiento, lo
// nuevo va solo a la app. Lee `ramo.horario` y no escribe nada: editar abre la
// misma hoja de la ficha (abrirHorarioRamo), que valida y guarda.
let agendaVista='evaluaciones';
const HORARIO_SEMANA_PX_MIN=0.9;
function vistaHorarioDisponible(){
  return typeof enAppNativa==='function'&&enAppNativa()&&!(typeof esCuentaProfesor==='function'&&esCuentaProfesor());
}
// Pinta el control segmentado y devuelve la vista que corresponde mostrar.
function pintarVistaAgenda(){
  const caja=document.getElementById('agenda-vista');
  const disponible=vistaHorarioDisponible();
  if(!disponible)agendaVista='evaluaciones';
  if(!caja)return agendaVista;
  caja.hidden=!disponible;
  if(!disponible){caja.innerHTML='';return agendaVista;}
  caja.innerHTML=`<div class="agenda-vista" role="group" aria-label="Qué ver en la Agenda">${[['evaluaciones','Evaluaciones'],['horario','Horario']]
    .map(([k,t])=>`<button type="button" data-agenda-vista="${k}" aria-pressed="${agendaVista===k}">${t}</button>`).join('')}</div>`;
  caja.querySelectorAll('[data-agenda-vista]').forEach(b=>b.addEventListener('click',()=>{
    if(agendaVista===b.dataset.agendaVista)return;
    agendaVista=b.dataset.agendaVista;renderAgenda();
    document.querySelector(`#agenda-vista [data-agenda-vista="${agendaVista}"]`)?.focus();
  }));
  return agendaVista;
}
const minutosHorario=h=>{const [a,b]=h.split(':').map(Number);return a*60+b;};
// Los bloques de la semana, uno por día, con su carril si se topan.
function bloquesSemanaHorario(ramos){
  const porDia=new Map();
  (ramos||[]).forEach(r=>copiarHorario(r.horario).forEach(b=>b.dias.forEach(d=>{
    if(!porDia.has(d))porDia.set(d,[]);
    porDia.get(d).push({ramo:r,bloque:b,ini:minutosHorario(b.inicio),fin:minutosHorario(b.fin)});
  })));
  porDia.forEach(lista=>{
    lista.sort((a,b)=>a.ini-b.ini||a.fin-b.fin||String(a.ramo.nombre).localeCompare(String(b.ramo.nombre)));
    // Grupos que se topan: cada clase toma el primer carril libre y todas las
    // del grupo dividen el ancho por igual.
    let grupo=[],finGrupo=-1;
    const cerrar=()=>{const n=Math.max(...grupo.map(x=>x.carril))+1;grupo.forEach(x=>{x.carriles=n;});grupo=[];};
    lista.forEach(x=>{
      if(grupo.length&&x.ini>=finGrupo)cerrar();
      const ocupados=new Set(grupo.filter(o=>o.fin>x.ini).map(o=>o.carril));
      let c=0;while(ocupados.has(c))c++;
      x.carril=c;grupo.push(x);finGrupo=Math.max(finGrupo,x.fin);
    });
    if(grupo.length)cerrar();
  });
  return porDia;
}
function etiquetaClaseSemana(x,nombreDia){
  return [x.ramo.nombre,`${nombreDia} de ${x.bloque.inicio} a ${x.bloque.fin}`,x.bloque.tipo,x.bloque.sala?'sala '+x.bloque.sala:'',x.bloque.noVoy?'no vas':''].filter(Boolean).join(', ');
}
// Tocar una clase abre su hoja: «Voy a esta clase» se aplica al tiro
// (interruptor, HIG Toggles) y, si es ayudantía, se pueden marcar todas.
// Editar el horario del ramo sigue a un toque.
function abrirClaseHorario(ramoId,bloqueId,alCambiar){
  const ramo=(S.ramos||[]).find(r=>r.id===ramoId);
  const bloque=ramo&&copiarHorario(ramo.horario).find(b=>b.id===bloqueId);
  if(!bloque||esCuentaProfesor())return;
  const caja=document.getElementById('modal-content');
  const pintar=()=>{
    const r=(S.ramos||[]).find(x=>x.id===ramoId),b=r&&copiarHorario(r.horario).find(x=>x.id===bloqueId);
    if(!b){closeModal();return;}
    const ayudantias=(S.ramos||[]).flatMap(x=>copiarHorario(x.horario)).filter(esAyudantiaHorario);
    const todasNoVoy=ayudantias.length>0&&ayudantias.every(x=>x.noVoy);
    const detalle=[b.tipo,`${diasBloqueHorario(b)} ${b.inicio}–${b.fin}`,b.sala].filter(Boolean).join(' · ');
    caja.innerHTML=`<div class="horario-clase-hoja"><h2 class="modal-title" id="modal-titulo">${esc(r.nombre)}</h2>
      <p class="modal-desc">${esc(detalle)}</p>
      <label class="horario-voy horario-voy-grande"><span>Voy a esta clase</span><input type="checkbox" role="switch" data-voy${b.noVoy?'':' checked'}></label>
      <p class="horario-voy-ayuda">Si no vas, queda apagada en tu semana y no sale en Hoy, en el widget ni en los avisos.</p>
      ${esAyudantiaHorario(b)&&ayudantias.length>1?`<button type="button" class="horario-accion" data-ayudantias="${todasNoVoy?'voy':'no-voy'}">${todasNoVoy?'Voy a todas las ayudantías':'No voy a ninguna ayudantía'}</button>`:''}
      <div class="modal-btns"><button type="button" class="btn-cancel" data-editar-ramo>Editar horario</button><button type="button" class="btn-confirm" data-listo>Listo</button></div></div>`;
    caja.querySelector('[data-voy]').addEventListener('change',e=>{
      if(marcarNoVoyHorario(ramoId,bloqueId,!e.target.checked)){if(alCambiar)alCambiar();pintar();caja.querySelector('[data-voy]')?.focus();}
    });
    caja.querySelector('[data-ayudantias]')?.addEventListener('click',e=>{
      const noVoy=e.currentTarget.dataset.ayudantias==='no-voy',n=marcarAyudantiasHorario(noVoy);
      if(!n)return;
      if(alCambiar)alCambiar();pintar();
      showToast(noVoy?`${n} ${n===1?'ayudantía marcada':'ayudantías marcadas'}: no vas`:`Vuelves a ir a ${n} ${n===1?'ayudantía':'ayudantías'}`);
      caja.querySelector('[data-ayudantias]')?.focus();
    });
    caja.querySelector('[data-editar-ramo]').addEventListener('click',()=>abrirHorarioRamo(ramoId,{alGuardado:alCambiar}));
    caja.querySelector('[data-listo]').addEventListener('click',()=>closeModal());
  };
  pintar();openModal();
}
function horarioSemanaHTML(ramos,ahora=new Date()){
  const porDia=bloquesSemanaHorario(ramos);
  const todos=[...porDia.values()].flat();
  if(!todos.length)return '';
  // Lunes a viernes siempre; sábado y domingo solo si hay clases.
  const dias=DIAS_HORARIO.filter(([k])=>!['S','D'].includes(k)||porDia.has(k));
  const desde=Math.floor(Math.min(...todos.map(x=>x.ini))/60)*60;
  const hasta=Math.ceil(Math.max(...todos.map(x=>x.fin))/60)*60;
  const alto=Math.round((hasta-desde)*HORARIO_SEMANA_PX_MIN);
  const y=m=>Math.round((m-desde)*HORARIO_SEMANA_PX_MIN);
  const p=partesHorarioChile(ahora);
  const hoy=['D','L','M','W','J','V','S'][new Date(Date.UTC(+p.year,+p.month-1,+p.day,12)).getUTCDay()];
  const minutoAhora=Number(p.hour)*60+Number(p.minute);
  const horas=[];for(let m=desde;m<=hasta;m+=60)horas.push(m);
  const sigla=r=>(typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla)||'';
  // En una columna de teléfono "MAT1620" no cabe: se parte entre letras y
  // números ("MAT" / "1620"), nunca a la mitad. Si dos clases se topan, cada
  // una va a medio ancho y queda solo la parte de letras; el nombre completo
  // está en la etiqueta para VoiceOver y al tocarla.
  const rotulo=(r,angosto)=>{
    const s=sigla(r),m=/^([A-Z_]+)(\d.*)$/.exec(s);
    if(!s)return `<b class="horario-semana-nombre">${esc(r.nombre)}</b>`;
    if(!m)return `<b>${esc(s)}</b>`;
    return `<b><span>${esc(m[1])}</span>${angosto?'':`<span>${esc(m[2])}</span>`}</b>`;
  };
  return `<div class="horario-semana" style="--horario-alto:${alto}px;--horario-dias:${dias.length}">
    <div class="horario-semana-cabecera" aria-hidden="true"><span></span>${dias.map(([k,n])=>`<span${k===hoy?' class="hoy"':''}>${esc(n.slice(0,3))}</span>`).join('')}</div>
    <div class="horario-semana-cuerpo">
      <div class="horario-semana-horas" aria-hidden="true">${horas.map(m=>`<span style="top:${y(m)}px">${String(m/60).padStart(2,'0')}:00</span>`).join('')}</div>
      ${dias.map(([k,n])=>`<div class="horario-semana-dia${k===hoy?' hoy':''}" role="group" aria-label="${esc(n)}">
        ${k===hoy&&minutoAhora>desde&&minutoAhora<hasta?`<span class="horario-semana-ahora" style="top:${y(minutoAhora)}px" aria-hidden="true"></span>`:''}
        ${(porDia.get(k)||[]).map(x=>`<button type="button" class="horario-semana-clase${x.bloque.noVoy?' no-voy':''}" data-horario-ramo="${esc(x.ramo.id)}" data-horario-bloque="${esc(x.bloque.id)}"
          style="top:${y(x.ini)}px;height:${Math.max(44,y(x.fin)-y(x.ini))}px;left:calc(${x.carril}*100%/${x.carriles});width:calc(100%/${x.carriles});--ramo:${esc(x.ramo.color||'var(--fg3)')}"
          aria-label="${esc(etiquetaClaseSemana(x,n))}">${rotulo(x.ramo,x.carriles>1)}${x.bloque.sala&&x.carriles===1?`<span class="horario-semana-sala">${esc(x.bloque.sala)}</span>`:''}</button>`).join('')}
      </div>`).join('')}
    </div></div>`;
}
function renderHorarioSemana(body,ahora=new Date()){
  const ramos=(S.ramos||[]);
  const conHorario=ramos.filter(r=>copiarHorario(r.horario).length);
  const sinHorario=ramos.filter(r=>!copiarHorario(r.horario).length);
  const titulo=document.getElementById('agenda-title'),sub=document.getElementById('agenda-sub');
  const expBtn=document.getElementById('agenda-export-btn');if(expBtn)expBtn.style.display='none';
  if(titulo)titulo.textContent='Tu semana';
  const fotoUC=S.tenant==='uc';
  if(!conHorario.length){
    if(sub)sub.textContent='';
    const hayRamos=ramos.length>0;
    body.innerHTML=`<div class="ag-empty">
      <div class="ag-empty-title">${hayRamos?'Arma tu horario':'Agrega tu primer ramo'}</div>
      <div class="ag-empty-desc">${hayRamos
        ?(fotoUC?'Sube el pantallazo de «Carga Académica» de Mi UC y armamos tu semana. Antes de guardar, lo revisas.':'Agrega los días y las horas de tus clases.')
        :'Después podrás armar tu horario de clases.'}</div>
      <button type="button" class="ag-empty-cta" data-horario-accion="${hayRamos?(fotoUC?'foto':'agregar'):'ramo'}">${hayRamos?(fotoUC?'Subir foto del horario':'Agregar clase'):'Agregar mi primer ramo'}</button>
      ${hayRamos&&fotoUC?'<button type="button" class="horario-accion horario-semana-secundaria" data-horario-accion="agregar">Agregar a mano</button>':''}
    </div>`;
  }else{
    const contar=filtro=>conHorario.reduce((n,r)=>n+copiarHorario(r.horario).filter(filtro).reduce((m,b)=>m+b.dias.length,0),0);
    const clases=contar(b=>!b.noVoy),noVas=contar(b=>b.noVoy);
    if(sub)sub.textContent=`${clases} ${clases===1?'clase':'clases'} a la semana${noVas?` · ${noVas} no vas`:''}`;
    body.innerHTML=`${horarioSemanaHTML(conHorario,ahora)}
      <div class="horario-semana-acciones">
        <button type="button" class="horario-accion" data-horario-accion="agregar">Agregar clase</button>
        ${fotoUC?'<button type="button" class="horario-accion" data-horario-accion="foto">Subir foto del horario</button>':''}
      </div>
      ${sinHorario.length?`<section class="horario-semana-faltan" aria-labelledby="horario-faltan-t"><h2 id="horario-faltan-t" class="section-hd-title">Sin horario</h2>
        <ul>${sinHorario.map(r=>`<li><button type="button" data-horario-agregar="${esc(r.id)}"><span>${esc(r.nombre)}</span><span class="horario-semana-mas">Agregar</span></button></li>`).join('')}</ul></section>`:''}`;
  }
  const repintar=()=>{if(typeof currentTab==='undefined'||currentTab==='agenda')renderAgenda();};
  // Marcar «no voy» repinta la semana detrás de la hoja e Inicio (Hoy).
  const alCambiarClase=()=>{repintar();if(typeof renderHome==='function')renderHome();};
  body.querySelectorAll('[data-horario-ramo]').forEach(b=>b.addEventListener('click',()=>abrirClaseHorario(b.dataset.horarioRamo,b.dataset.horarioBloque,alCambiarClase)));
  body.querySelectorAll('[data-horario-agregar]').forEach(b=>b.addEventListener('click',()=>abrirHorarioRamo(b.dataset.horarioAgregar,{alGuardado:repintar})));
  body.querySelectorAll('[data-horario-accion]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.horarioAccion;
    if(a==='foto')abrirImportarHorarioBuscacursos();
    else if(a==='ramo')openAddRamoModal();
    else if(a==='agregar')elegirRamoParaClase(repintar);
  }));
}
// Agregar clase: primero el ramo, después la hoja de siempre con un bloque nuevo.
function elegirRamoParaClase(alGuardado){
  const ramos=S.ramos||[];
  if(ramos.length===1){abrirHorarioRamo(ramos[0].id,{agregar:copiarHorario(ramos[0].horario).length>0,alGuardado});return;}
  const caja=document.getElementById('modal-content');
  caja.innerHTML=`<h2 class="modal-title">¿De qué ramo es la clase?</h2>
    <div class="horario-elegir-ramo">${ramos.map(r=>`<button type="button" data-elegir-ramo="${esc(r.id)}" style="--ramo:${esc(r.color||'var(--fg3)')}"><span>${esc(r.nombre)}</span><small>${esc((typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla)||'')}</small></button>`).join('')}</div>
    <div class="modal-btns"><button type="button" class="btn-cancel" data-cancelar-elegir>Cancelar</button></div>`;
  caja.querySelector('[data-cancelar-elegir]').addEventListener('click',closeModal);
  caja.querySelectorAll('[data-elegir-ramo]').forEach(b=>b.addEventListener('click',()=>{
    const r=ramos.find(x=>x.id===b.dataset.elegirRamo);
    if(r)abrirHorarioRamo(r.id,{agregar:copiarHorario(r.horario).length>0,alGuardado});
  }));
  openModal();
}
