// Horario de la semana dentro de la Agenda (Lucas, 2026-11-15, como la #644).
// Lee `ramo.horario` y no escribe nada: editar abre la misma hoja de la ficha
// (abrirHorarioRamo), que valida y guarda.
//
// Desde el 2026-11-18 la Agenda del estudiante se ve por Día | Semana | Mes
// (pedido de una estudiante y de Lucas). Va también en la web: no depende de
// enAppNativa(). El profesor sigue con la lista de siempre ('lista').
const AGENDA_VISTAS=[['dia','Día'],['semana','Semana'],['mes','Mes']];
const CLAVE_VISTA_AGENDA='gh_agenda_vista';
let agendaVista=(()=>{try{const v=localStorage.getItem(CLAVE_VISTA_AGENDA);return AGENDA_VISTAS.some(([k])=>k===v)?v:'dia';}catch(e){return 'dia';}})();
const HORARIO_SEMANA_PX_MIN=0.9;
function vistasAgendaDisponibles(){
  return !(typeof esCuentaProfesor==='function'&&esCuentaProfesor());
}
// Pinta las pestañas y devuelve la vista que corresponde mostrar.
function pintarVistaAgenda(){
  const caja=document.getElementById('agenda-vista');
  const disponible=vistasAgendaDisponibles();
  if(disponible&&!AGENDA_VISTAS.some(([k])=>k===agendaVista))agendaVista='dia';
  const vista=disponible?agendaVista:'lista';
  if(!caja)return vista;
  caja.hidden=!disponible;
  if(!disponible){caja.innerHTML='';return vista;}
  caja.innerHTML=`<div class="agenda-vista" role="group" aria-label="Qué ver en la Agenda">${AGENDA_VISTAS
    .map(([k,t])=>`<button type="button" data-agenda-vista="${k}" aria-pressed="${agendaVista===k}">${t}</button>`).join('')}</div>`;
  caja.querySelectorAll('[data-agenda-vista]').forEach(b=>b.addEventListener('click',()=>{
    if(agendaVista===b.dataset.agendaVista)return;
    agendaVista=b.dataset.agendaVista;
    try{localStorage.setItem(CLAVE_VISTA_AGENDA,agendaVista);}catch(e){}
    renderAgenda();
    document.querySelector(`#agenda-vista [data-agenda-vista="${agendaVista}"]`)?.focus();
  }));
  return vista;
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
// `eventos`: las evaluaciones con fecha (agendaEvents). Las de la semana que se
// ve van encima del horario: con hora, como bloque sólido a su hora; sin hora,
// en la franja «Día» de arriba. `semana` corre la semana (0 = la actual).
function horarioSemanaHTML(ramos,ahora=new Date(),{eventos=[],semana=0}={}){
  const porDia=bloquesSemanaHorario(ramos);
  const todos=[...porDia.values()].flat();
  const hoyIso=isoHoyAgenda(ahora),lunes=sumarDiasAgenda(lunesAgenda(hoyIso),7*semana);
  const fechaDe=k=>sumarDiasAgenda(lunes,DIAS_HORARIO.findIndex(([x])=>x===k));
  const domingo=sumarDiasAgenda(lunes,6);
  const evs=(eventos||[]).filter(e=>e&&e.fecha>=lunes&&e.fecha<=domingo);
  const conHora=evs.filter(e=>horaValidaAgenda(e.hora)),sinHora=evs.filter(e=>!horaValidaAgenda(e.hora));
  if(!todos.length&&!evs.length)return '';
  const evPorDia=k=>evs.filter(e=>e.fecha===fechaDe(k));
  // Lunes a viernes siempre; sábado y domingo solo si hay clases o evaluaciones.
  const dias=DIAS_HORARIO.filter(([k])=>!['S','D'].includes(k)||porDia.has(k)||evPorDia(k).length);
  const minutos=[...todos.map(x=>[x.ini,x.fin]),...conHora.map(e=>{const m=minutosHorario(e.hora);return [m,Math.min(24*60,m+60)];})];
  const desde=minutos.length?Math.floor(Math.min(...minutos.map(x=>x[0]))/60)*60:8*60;
  const hasta=minutos.length?Math.ceil(Math.max(...minutos.map(x=>x[1]))/60)*60:18*60;
  const alto=Math.round((hasta-desde)*HORARIO_SEMANA_PX_MIN);
  const y=m=>Math.round((m-desde)*HORARIO_SEMANA_PX_MIN);
  const p=partesHorarioChile(ahora);
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
  const esHoy=k=>fechaDe(k)===hoyIso;
  // Cada evaluación dice de qué ramo es: el color solo no basta (HIG Color).
  // La sigla se parte entre letras y números, como en las clases.
  const ramoEval=e=>{
    const sg=sigla(e.ramo),m=/^([A-Z_]+)(\d.*)$/.exec(sg||'');
    return `<span class="horario-semana-eval-ramo">${m?`<span>${esc(m[1])}</span><span>${esc(m[2])}</span>`:esc(sg||e.ramo.nombre)}</span>`;
  };
  const evento=(e,n)=>`<button type="button" class="horario-semana-eval" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}" style="top:${y(minutosHorario(e.hora))}px;height:${Math.max(44,y(Math.min(24*60,minutosHorario(e.hora)+60))-y(minutosHorario(e.hora)))}px;--ramo:${esc(e.ramo.color||'var(--fg3)')};--ramo-texto:${textoSobreColorAgenda(e.ramo.color)||'var(--fg)'}"
          aria-label="${esc(etiquetaEventoAgenda(e))}"><b>${esc(nombreEventoAgenda(e))}</b>${ramoEval(e)}<span>${esc(e.hora)}</span></button>`;
  return `<div class="horario-semana" style="--horario-alto:${alto}px;--horario-dias:${dias.length}">
    <div class="horario-semana-cabecera" aria-hidden="true"><span></span>${dias.map(([k,n])=>`<span${esHoy(k)?' class="hoy"':''}>${esc(n.slice(0,3))}<b>${Number(fechaDe(k).slice(8))}</b></span>`).join('')}</div>
    ${sinHora.length?`<div class="horario-semana-todo-dia"><span class="horario-semana-todo-dia-r" aria-hidden="true">Día</span>${dias.map(([k])=>`<div>${evPorDia(k).filter(e=>!horaValidaAgenda(e.hora)).map(e=>`<button type="button" class="horario-semana-chip" data-agenda-action="ver-ramo" data-ramo-id="${esc(e.ramo.id)}" style="--ramo:${esc(e.ramo.color||'var(--fg3)')};--ramo-texto:${textoSobreColorAgenda(e.ramo.color)||'var(--fg)'}" aria-label="${esc(etiquetaEventoAgenda(e))}"><b>${esc(nombreEventoAgenda(e))}</b>${ramoEval(e)}</button>`).join('')}</div>`).join('')}</div>`:''}
    <div class="horario-semana-cuerpo">
      <div class="horario-semana-horas" aria-hidden="true">${horas.map(m=>`<span style="top:${y(m)}px">${String(m/60).padStart(2,'0')}:00</span>`).join('')}</div>
      ${dias.map(([k,n])=>`<div class="horario-semana-dia${esHoy(k)?' hoy':''}" role="group" aria-label="${esc(nombreFechaAgenda(fechaDe(k)))}">
        ${esHoy(k)&&minutoAhora>desde&&minutoAhora<hasta?`<span class="horario-semana-ahora" style="top:${y(minutoAhora)}px" aria-hidden="true"></span>`:''}
        ${(porDia.get(k)||[]).map(x=>`<button type="button" class="horario-semana-clase${x.bloque.noVoy?' no-voy':''}" data-horario-ramo="${esc(x.ramo.id)}" data-horario-bloque="${esc(x.bloque.id)}"
          style="top:${y(x.ini)}px;height:${Math.max(44,y(x.fin)-y(x.ini))}px;left:calc(${x.carril}*100%/${x.carriles});width:calc(100%/${x.carriles});--ramo:${esc(x.ramo.color||'var(--fg3)')}"
          aria-label="${esc(etiquetaClaseSemana(x,n))}">${rotulo(x.ramo,x.carriles>1)}${x.bloque.sala&&x.carriles===1?`<span class="horario-semana-sala">${esc(x.bloque.sala)}</span>`:''}</button>`).join('')}
        ${evPorDia(k).filter(e=>horaValidaAgenda(e.hora)).map(e=>evento(e,n)).join('')}
      </div>`).join('')}
    </div></div>`;
}
let agendaSemanaOffset=0;
// Sábado o domingo sin clases ni evaluaciones lo que queda del fin de semana:
// la semana actual ya pasó entera, así que se abre la que viene (0 o 1).
function semanaBaseAgenda(ahora=new Date(),ramos=S.ramos||[],eventos=agendaEvents()){
  const hoyIso=isoHoyAgenda(ahora),k=claveDiaAgenda(hoyIso);
  if(k!=='S'&&k!=='D')return 0;
  const quedan=k==='S'?['S','D']:['D'];
  const domingo=sumarDiasAgenda(lunesAgenda(hoyIso),6);
  const clases=(ramos||[]).some(r=>copiarHorario(r.horario).some(b=>b.dias.some(d=>quedan.includes(d))));
  const evs=(eventos||[]).some(e=>e&&e.fecha>=hoyIso&&e.fecha<=domingo);
  return clases||evs?0:1;
}
function renderHorarioSemana(body,ahora=new Date()){
  const ramos=(S.ramos||[]);
  const conHorario=ramos.filter(r=>copiarHorario(r.horario).length);
  const fotoUC=S.tenant==='uc';
  const eventos=agendaEvents();
  const base=semanaBaseAgenda(ahora,ramos,eventos),semana=base+agendaSemanaOffset;
  const lunes=sumarDiasAgenda(lunesAgenda(isoHoyAgenda(ahora)),7*semana);
  const nav=navAgendaHTML(rangoSemanaAgenda(lunes),'semana',agendaSemanaOffset!==0,base&&!agendaSemanaOffset?'La semana que viene':'');
  const deLaSemana=eventos.filter(e=>e.fecha>=lunes&&e.fecha<=sumarDiasAgenda(lunes,6)).sort((a,b)=>a.fecha.localeCompare(b.fecha)||String(a.hora||'99').localeCompare(String(b.hora||'99')));
  // En 375 px un chip de 60 px no se lee entero: debajo, la lista con nombres.
  const lista=deLaSemana.length?`<h2 class="section-hd-title agenda-dia-seccion">Evaluaciones de la semana</h2>${deLaSemana.map(e=>eventoAgendaFilaHTML(e,{conFecha:true})).join('')}`:'';
  if(!conHorario.length){
    const hayRamos=ramos.length>0;
    body.innerHTML=`${nav}<div class="ag-empty">
      <div class="ag-empty-title">${hayRamos?'Arma tu horario':'Agrega tu primer ramo'}</div>
      <div class="ag-empty-desc">${hayRamos
        ?(fotoUC?'Sube el pantallazo de «Carga Académica» de Mi UC y armamos tu semana. Antes de guardar, lo revisas.':'Agrega los días y las horas de tus clases.')
        :'Después podrás armar tu horario de clases.'}</div>
      <button type="button" class="ag-empty-cta" data-horario-accion="${hayRamos?(fotoUC?'foto':'agregar'):'ramo'}">${hayRamos?(fotoUC?'Subir foto del horario':'Agregar clase'):'Agregar mi primer ramo'}</button>
      ${hayRamos&&fotoUC?'<button type="button" class="horario-accion horario-semana-secundaria" data-horario-accion="agregar">Agregar a mano</button>':''}
    </div>${lista}`;
  }else{
    // Ver y editar van separados: la semana se lee; el horario se arma en
    // «Tu horario», a un toque, y no ocupa la pantalla del día a día.
    const sinHorario=ramos.length-conHorario.length;
    body.innerHTML=`${nav}
      <div class="horario-semana-barra"><span>${esc(resumenClasesSemana(conHorario))}</span><button type="button" class="horario-semana-editar" data-horario-accion="editar">Editar horario</button></div>
      ${horarioSemanaHTML(conHorario,ahora,{eventos,semana})}
      ${sinHorario?`<button type="button" class="horario-semana-faltan-aviso" data-horario-accion="editar">${sinHorario} ${sinHorario===1?'ramo':'ramos'} sin horario<span>Completar</span></button>`:''}
      ${lista}`;
  }
  const repintar=()=>{if(typeof currentTab==='undefined'||currentTab==='agenda')renderAgenda();};
  // Marcar «no voy» repinta la semana detrás de la hoja e Inicio (Hoy).
  const alCambiarClase=()=>{repintar();if(typeof renderHome==='function')renderHome();};
  enlazarNavAgenda(body,paso=>{agendaSemanaOffset=paso===0?0:agendaSemanaOffset+paso;renderAgenda();});
  body.querySelectorAll('[data-horario-ramo]').forEach(b=>b.addEventListener('click',()=>abrirClaseHorario(b.dataset.horarioRamo,b.dataset.horarioBloque,alCambiarClase)));
  body.querySelectorAll('[data-horario-accion]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.horarioAccion;
    if(a==='foto')abrirImportarHorarioBuscacursos();
    else if(a==='ramo')openAddRamoModal();
    else if(a==='agregar')elegirRamoParaClase(repintar);
    else if(a==='editar')abrirTuHorario(alCambiarClase);
  }));
  if(typeof activarDetallesAgenda==='function')activarDetallesAgenda(body);
}
function resumenClasesSemana(ramos){
  const contar=filtro=>ramos.reduce((n,r)=>n+copiarHorario(r.horario).filter(filtro).reduce((m,b)=>m+b.dias.length,0),0);
  const clases=contar(b=>!b.noVoy),noVas=contar(b=>b.noVoy);
  return `${clases} ${clases===1?'clase':'clases'} a la semana${noVas?` · ${noVas} no vas`:''}`;
}
// «Tu horario»: todo lo que arma o corrige el horario, en una hoja aparte.
// Guardar sigue en abrirHorarioRamo; al volver se reabre esta hoja.
function tuHorarioHTML(){
  const ramos=S.ramos||[],fotoUC=S.tenant==='uc';
  const ayudantias=ramos.flatMap(x=>copiarHorario(x.horario)).filter(esAyudantiaHorario);
  const todasNoVoy=ayudantias.length>0&&ayudantias.every(x=>x.noVoy);
  const fila=r=>{
    const bloques=copiarHorario(r.horario);
    const detalle=bloques.length?bloques.map(b=>`${b.tipo?b.tipo+' ':''}${diasBloqueHorario(b)} ${b.inicio}–${b.fin}${b.noVoy?' (no vas)':''}`).join(' · '):'Sin horario';
    return `<li><button type="button" data-tu-horario-ramo="${esc(r.id)}" style="--ramo:${esc(r.color||'var(--fg3)')}"><i aria-hidden="true"></i><span><b>${esc(r.nombre)}</b><small>${esc(detalle)}</small></span><span class="horario-semana-mas">${bloques.length?'Editar':'Agregar'}</span></button></li>`;
  };
  return `<div class="tu-horario"><h2 class="modal-title" id="modal-titulo">Tu horario</h2>
    <p class="modal-desc">${esc(resumenClasesSemana(ramos))}</p>
    <ul class="tu-horario-ramos">${ramos.map(fila).join('')}</ul>
    <div class="tu-horario-acciones">
      ${fotoUC?'<button type="button" class="horario-accion" data-tu-horario="foto">Subir foto del horario</button>':''}
      <button type="button" class="horario-accion" data-tu-horario="agregar">Agregar clase</button>
      ${ayudantias.length>1?`<button type="button" class="horario-accion" data-tu-horario="${todasNoVoy?'voy':'no-voy'}">${todasNoVoy?'Voy a todas las ayudantías':'No voy a ninguna ayudantía'}</button>`:''}
    </div>
    <div class="modal-btns"><button type="button" class="btn-confirm" data-tu-horario="listo">Listo</button></div></div>`;
}
function abrirTuHorario(alCambiar){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return;
  const caja=document.getElementById('modal-content');if(!caja)return;
  const volver=()=>{if(alCambiar)alCambiar();abrirTuHorario(alCambiar);};
  caja.innerHTML=tuHorarioHTML();
  caja.querySelectorAll('[data-tu-horario-ramo]').forEach(b=>b.addEventListener('click',()=>{
    const r=(S.ramos||[]).find(x=>x.id===b.dataset.tuHorarioRamo);
    if(r)abrirHorarioRamo(r.id,{agregar:false,alGuardado:volver});
  }));
  caja.querySelectorAll('[data-tu-horario]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.tuHorario;
    if(a==='listo')closeModal();
    else if(a==='foto')abrirImportarHorarioBuscacursos();
    else if(a==='agregar')elegirRamoParaClase(volver);
    else{
      const noVoy=a==='no-voy',n=marcarAyudantiasHorario(noVoy);
      if(!n)return;
      if(alCambiar)alCambiar();
      abrirTuHorario(alCambiar);
      showToast(noVoy?`${n} ${n===1?'ayudantía marcada':'ayudantías marcadas'}: no vas`:`Vuelves a ir a ${n} ${n===1?'ayudantía':'ayudantías'}`);
      document.querySelector(`#modal-content [data-tu-horario="${noVoy?'voy':'no-voy'}"]`)?.focus();
    }
  }));
  openModal();
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
