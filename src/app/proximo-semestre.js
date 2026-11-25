// ─── ARMA TU PRÓXIMO SEMESTRE (solo app, solo UC) ───────────────────────────
// Pantalla del armador (2/4, motor en armador-horario.js) con el aviso de
// requisitos (3/3, motor en requisitos-uc.js). El estudiante elige los ramos
// que quiere tomar el próximo período; por cada uno le decimos si cumple los
// prerrequisitos según su historial y, si BuscaCursos ya publicó la oferta, le
// proponemos horarios sin topes.
//
// Solo LEE: la oferta (catalogo_uc_secciones_publicas) y los requisitos
// (catalogo_uc_requisitos) son públicos. No escribe en `gradehub_v1`, en
// Supabase ni en los ramos de este semestre. Lo elegido vive en memoria y se
// olvida al cambiar de cuenta. El aviso nunca bloquea: la UC decide al
// inscribir y hay convalidaciones que no vemos.
//
// Solo UC porque la oferta y los requisitos salen de BuscaCursos y del
// catálogo UC; no hay fuente equivalente para otras universidades.
const PROXIMO_UNIVERSIDADES=new Set(['uc']);
const PROXIMO_ESPERA_MS=8000;
const PROXIMO_MAX_RAMOS=8;
const PROXIMO_SIGLA_RE=/^[A-Z]{2,4}[0-9]{3,4}[A-Z]?$/;
const ICONO_PROXIMO='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/><path d="M12 14v4M10 16h4"/>';
let _proximo=proximoEstadoInicial();

function proximoEstadoInicial(dueno=null){
  return {dueno,ramos:[],requisitos:new Map(),secciones:new Map(),diasLibres:new Set(),
    estadoReq:'listo',estadoHorarios:'listo',paso:'ramos'};
}
function proximoSemestreDisponible(){
  return typeof enAppNativa==='function'&&enAppNativa()&&!esCuentaProfesor()&&PROXIMO_UNIVERSIDADES.has(S.tenant);
}
// '2026-2' → '2027-1'; '2027-1' → '2027-2'. Fuera de forma, null.
function periodoSiguiente(periodo){
  const m=/^(\d{4})-([12])$/.exec(String(periodo||''));
  if(!m)return null;
  return m[2]==='2'?`${Number(m[1])+1}-1`:`${m[1]}-2`;
}
function proximoPeriodo(){return periodoSiguiente(semester());}
function proximoLista(xs){
  const l=[...xs];
  return l.length>1?l.slice(0,-1).join(', ')+' y '+l[l.length-1]:(l[0]||'');
}
// El nombre del catálogo a veces trae la sigla para desambiguar: «Álgebra (MAT1289)».
function proximoNombreLimpio(nombre){return String(nombre||'').replace(/ \([A-Z]{2,4}\d{3,4}[A-Z]?\)$/,'').trim();}

// ── Requisitos ──────────────────────────────────────────────────────────────
// Qué decirle por cada ramo. Función pura sobre lo que devuelve
// evaluarRequisitosUC. tono: 'ok' | 'borde' | 'falta' | 'neutro' (semáforo:
// cumple / depende / no cumple; lo demás no se tiñe).
function proximoAvisoRequisito(ev){
  const r=ev&&ev.restriccion;
  const restriccion=r?(r.relacion==='o'?`O bien cumplir esta restricción: ${r.texto}`:r.relacion==='y'?`Además pide: ${r.texto}`:`Restricción: ${r.texto}`):'';
  switch(ev&&ev.estado){
    case 'cumple':return {tono:'ok',titulo:'Cumples los prerrequisitos',restriccion};
    case 'si_apruebas':return {tono:'borde',titulo:`Cumples si apruebas ${proximoLista(ev.cursando)}`,restriccion};
    case 'falta':{
      const faltan=ev.faltan.map(f=>f.co?`${f.sigla} (puede ser en paralelo)`:f.sigla);
      // Con relación «o», la restricción reemplaza a los prerrequisitos: puede
      // que la cumpla y no lo sabemos. No se marca en rojo.
      return {tono:r&&r.relacion==='o'?'borde':'falta',titulo:`Te falta ${proximoLista(faltan)}`,
        detalle:ev.otrasOpciones?'Hay otras combinaciones que también sirven: mira el texto del catálogo.':'',restriccion};
    }
    case 'sin_requisitos':return {tono:'neutro',titulo:'Sin prerrequisitos',restriccion};
    case 'sin_historial':return {tono:'neutro',titulo:'Para revisar si cumples, carga tus semestres pasados',accion:'ficha',restriccion};
    case 'ilegible':return {tono:'neutro',titulo:'No pudimos leer los prerrequisitos',restriccion};
    default:return {tono:'neutro',titulo:'El catálogo UC no tiene datos de este ramo',restriccion};
  }
}
function proximoContexto(estado,siglasPlan,filas){
  const base=requisitosDesdeEstado(estado);
  return {aprobadas:base.aprobadas,cursando:base.cursando,enPlan:new Set(siglasPlan),
    equivalencias:requisitosEquivalencias(filas),conHistorial:base.conHistorial};
}
function proximoEvaluar(sigla){
  const filas=[..._proximo.requisitos.values()].filter(Boolean);
  const fila=_proximo.requisitos.get(sigla);
  if(!fila)return {sigla,estado:'sin_datos',faltan:[],cursando:[],otrasOpciones:false,restriccion:null,texto:''};
  return evaluarRequisitosUC(fila,proximoContexto(S,_proximo.ramos.map(r=>r.sigla),filas));
}
function proximoConEspera(promesa){
  let espera;
  return Promise.race([Promise.resolve(promesa),new Promise(r=>{espera=setTimeout(()=>r({error:{code:'espera'}}),PROXIMO_ESPERA_MS);})])
    .finally(()=>clearTimeout(espera));
}
function proximoCliente(){
  const c=typeof supabaseClient!=='undefined'?supabaseClient:null;
  return c&&typeof c.from==='function'&&typeof c.rpc==='function'?c:null;
}
// Trae las filas que faltan, y también las de las siglas citadas en sus
// prerrequisitos: sus equivalencias cuentan (MAT1512 aprobado vale MAT1620).
async function proximoCargarRequisitos(siglas){
  const cliente=proximoCliente();
  if(!cliente)return false;
  const pedir=async lista=>{
    const faltan=[...new Set(lista)].filter(s=>PROXIMO_SIGLA_RE.test(s)&&!_proximo.requisitos.has(s)).slice(0,200);
    if(!faltan.length)return true;
    const {data,error}=await proximoConEspera(cliente.from('catalogo_uc_requisitos')
      .select('sigla,prerrequisitos,relacion,restricciones,equivalencias').in('sigla',faltan));
    if(error)return false;
    const porSigla=new Map((Array.isArray(data)?data:[]).map(f=>[f.sigla,f]));
    faltan.forEach(s=>_proximo.requisitos.set(s,porSigla.get(s)||null));
    return true;
  };
  try{
    if(!await pedir(siglas))return false;
    return await pedir(siglas.flatMap(s=>{const f=_proximo.requisitos.get(s);return f?requisitosSiglasDe(f.prerrequisitos):[];}));
  }catch(e){return false;}
}

// ── Elegir ramos ────────────────────────────────────────────────────────────
// Los ramos del semestre siguiente de su malla que tienen sigla y que no
// aprobó ni está cursando. Una sugerencia, no una lista obligatoria.
// El semestre que viene. Si ya archivó y subió de semestre al cerrar (el
// archivo guarda el semestre en que se archivó), el que viene es el actual.
function proximoSemestreObjetivo(estado){
  const e=estado||S,sem=Number(e.careerSemestre);
  if(!sem)return null;
  const ultimo=(e.historial||[])[0];
  return !(e.ramos||[]).length&&ultimo&&Number(ultimo.careerSemestre)===sem-1?sem:sem+1;
}
function proximoSugeridos(estado,elegidas=[]){
  const e=estado||S;
  const objetivo=proximoSemestreObjetivo(e);
  if(!e.carrera||!objetivo)return [];
  const nombres=((mallaFor(e.tenant)||{})[e.carrera]||{})[objetivo]||[];
  const {aprobadas,cursando}=requisitosDesdeEstado(e);
  const fuera=new Set([...aprobadas,...cursando,...elegidas]);
  const out=[];
  for(const nombre of nombres){
    const sigla=siglaCatalogoUC(nombre);
    if(sigla&&!fuera.has(sigla)&&!out.some(x=>x.sigla===sigla))out.push({sigla,nombre:proximoNombreLimpio(nombre)});
  }
  return out;
}
// Resultados del buscador de la universidad con sigla. Si escribió una sigla
// que el catálogo de la app no tiene (un electivo, un OFG), se ofrece igual:
// los requisitos y la oferta la conocen.
function proximoResultados(q,estado,elegidas=[]){
  const texto=String(q||'').trim();
  if(!texto)return [];
  const e=estado||S,yaEsta=new Set(elegidas),out=[];
  for(const r of searchCatalog(texto,e.tenant,e.carrera,e.careerSemestre)){
    if(!r.sigla||yaEsta.has(r.sigla)||out.some(x=>x.sigla===r.sigla))continue;
    out.push({sigla:r.sigla,nombre:proximoNombreLimpio(r.nombre)});
    if(out.length>=6)break;
  }
  const sigla=texto.toUpperCase().replace(/\s+/g,'');
  if(PROXIMO_SIGLA_RE.test(sigla)&&!yaEsta.has(sigla)&&!out.some(x=>x.sigla===sigla))out.unshift({sigla,nombre:''});
  return out;
}

function abrirProximoSemestre(volviendo=false){
  if(!proximoSemestreDisponible())return;
  const dueno=(typeof currentUser!=='undefined'&&currentUser&&currentUser.id)||'local';
  if(_proximo.dueno!==dueno)_proximo=proximoEstadoInicial(dueno);
  _proximo.paso='ramos';
  if(!volviendo&&typeof track==='function')track('proximo_semestre_abierto');
  const periodo=proximoPeriodo();
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Arma tu próximo semestre</div>
    <p class="modal-desc">Elige los ramos que quieres tomar en ${esc(periodo)}. Te decimos si cumples los prerrequisitos y, cuando BuscaCursos publique la oferta, te armamos horarios sin topes.</p>
    <label class="px-label" for="px-buscar">Agregar ramo</label>
    <input type="search" id="px-buscar" class="px-buscar" maxlength="60" autocomplete="off" autocapitalize="characters" spellcheck="false"
      placeholder="Sigla o nombre, ej.: MAT1620" oninput="proximoBuscar(this.value)" aria-describedby="px-limite"/>
    <div id="px-resultados" class="px-resultados"></div>
    <div id="px-sugeridos"></div>
    <ul id="px-ramos" class="px-ramos" aria-live="polite"></ul>
    <p id="px-limite" class="px-nota">Es una guía con los datos del catálogo UC: la UC decide al inscribir y puede haber convalidaciones que no vemos.</p>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button>
      <button type="button" class="btn-confirm" id="px-ver-horarios" onclick="proximoVerHorarios()">Ver horarios</button>
    </div>`;
  openModal();
  proximoPintarRamos();
}
function proximoBuscar(q){
  const caja=document.getElementById('px-resultados');
  if(!caja)return;
  const lista=proximoResultados(q,S,_proximo.ramos.map(r=>r.sigla));
  caja.innerHTML=lista.map(r=>`<button type="button" class="px-resultado" onclick="proximoAgregar('${r.sigla}',this.dataset.nombre)" data-nombre="${esc(r.nombre)}">
    <span class="px-sigla">${esc(r.sigla)}</span><span class="px-nombre">${r.nombre?esc(r.nombre):'Agregar esta sigla'}</span></button>`).join('');
}
function proximoAgregar(sigla,nombre){
  sigla=String(sigla||'').toUpperCase();
  if(!PROXIMO_SIGLA_RE.test(sigla)||_proximo.ramos.some(r=>r.sigla===sigla))return;
  if(_proximo.ramos.length>=PROXIMO_MAX_RAMOS){showToast(`Hasta ${PROXIMO_MAX_RAMOS} ramos por semestre`);return;}
  _proximo.ramos.push({sigla,nombre:proximoNombreLimpio(nombre)});
  const entrada=document.getElementById('px-buscar');
  if(entrada){entrada.value='';entrada.focus();}
  proximoBuscar('');
  proximoPintarRamos();
}
function proximoQuitar(sigla){
  _proximo.ramos=_proximo.ramos.filter(r=>r.sigla!==sigla);
  proximoPintarRamos();
  document.getElementById('px-buscar')?.focus();
}
function proximoRamoHTML(r){
  let req;
  if(_proximo.estadoReq==='cargando'&&!_proximo.requisitos.has(r.sigla))req='<p class="px-req px-neutro">Revisando prerrequisitos…</p>';
  else if(_proximo.estadoReq==='error'&&!_proximo.requisitos.has(r.sigla))
    req='<p class="px-req px-neutro">No pudimos revisar los prerrequisitos. <button type="button" class="px-enlace" onclick="proximoActualizarRequisitos()">Reintentar</button></p>';
  else{
    const ev=proximoEvaluar(r.sigla),a=proximoAvisoRequisito(ev);
    req=`<p class="px-req px-${a.tono}"><span class="px-punto" aria-hidden="true"></span>${esc(a.titulo)}</p>`
      +(a.detalle?`<p class="px-req-detalle">${esc(a.detalle)}</p>`:'')
      +(a.restriccion?`<p class="px-req-detalle">${esc(a.restriccion)}</p>`:'')
      +(a.accion==='ficha'&&typeof avanceCurricularDisponible==='function'&&avanceCurricularDisponible()?'<button type="button" class="px-enlace" onclick="closeModal();openAvanceCurricular()">Cargar semestres pasados</button>':'')
      +(ev.texto&&ev.estado!=='sin_requisitos'?`<details class="px-catalogo"><summary>Texto del catálogo</summary><p>${esc(ev.texto)}</p></details>`:'');
  }
  return `<li class="px-ramo">
    <div class="px-ramo-cab"><span class="px-sigla">${esc(r.sigla)}</span><span class="px-nombre">${esc(r.nombre)}</span>
      <button type="button" class="px-quitar" onclick="proximoQuitar('${r.sigla}')" aria-label="Quitar ${esc(r.sigla)}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    ${req}</li>`;
}
function proximoPintarRamos(){
  const lista=document.getElementById('px-ramos');
  if(!lista)return;
  const elegidas=_proximo.ramos.map(r=>r.sigla);
  lista.innerHTML=_proximo.ramos.map(proximoRamoHTML).join('');
  const sug=document.getElementById('px-sugeridos');
  if(sug){
    const s=proximoSugeridos(S,elegidas).slice(0,8);
    sug.innerHTML=s.length?`<p class="px-label">De tu malla (${proximoSemestreObjetivo(S)}° semestre)</p><div class="px-chips">${s.map(r=>
      `<button type="button" class="px-chip" onclick="proximoAgregar('${r.sigla}',this.dataset.nombre)" data-nombre="${esc(r.nombre)}" aria-label="Agregar ${esc(r.nombre)} (${r.sigla})">+ ${esc(r.sigla)}</button>`).join('')}</div>`:'';
  }
  const ver=document.getElementById('px-ver-horarios');
  if(ver)ver.disabled=!_proximo.ramos.length;
  if(elegidas.some(s=>!_proximo.requisitos.has(s))&&_proximo.estadoReq!=='cargando')proximoActualizarRequisitos();
}
async function proximoActualizarRequisitos(){
  const siglas=_proximo.ramos.map(r=>r.sigla);
  _proximo.estadoReq='cargando';
  proximoPintarRamos();
  const ok=await proximoCargarRequisitos(siglas);
  _proximo.estadoReq=ok?'listo':'error';
  if(_proximo.paso==='ramos')proximoPintarRamos();
}

// ── Horarios ────────────────────────────────────────────────────────────────
async function proximoCargarSecciones(periodo,siglas){
  const cliente=proximoCliente();
  if(!cliente)return false;
  try{
    const resultados=await Promise.all(siglas.filter(s=>!_proximo.secciones.has(periodo+'|'+s)).map(async s=>{
      const {data,error}=await proximoConEspera(cliente.rpc('catalogo_uc_secciones_publicas',{p_periodo:periodo,p_sigla:s}));
      if(error)return false;
      _proximo.secciones.set(periodo+'|'+s,Array.isArray(data)?data:[]);
      return true;
    }));
    return resultados.every(Boolean);
  }catch(e){return false;}
}
const PROXIMO_DIAS_SEMANA=['L','M','W','J','V'];
function proximoVerHorarios(){
  if(!_proximo.ramos.length)return;
  _proximo.paso='horarios';
  const periodo=proximoPeriodo();
  const nombreDia=Object.fromEntries(DIAS_HORARIO);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">Horarios ${esc(periodo)}</div>
    <div class="px-dias" role="group" aria-labelledby="px-dias-titulo">
      <span id="px-dias-titulo" class="px-label">Día libre</span>
      ${PROXIMO_DIAS_SEMANA.map(d=>`<button type="button" class="px-dia" aria-pressed="${_proximo.diasLibres.has(d)}" aria-label="${nombreDia[d]} libre" onclick="proximoAlternarDia('${d}',this)">${d==='W'?'Mi':nombreDia[d].slice(0,2)}</button>`).join('')}
    </div>
    <div id="px-horarios" aria-live="polite"><p class="px-nota">Buscando secciones en BuscaCursos…</p></div>
    <div class="modal-btns">
      <button type="button" class="btn-cancel" onclick="abrirProximoSemestre(true)">Atrás</button>
    </div>`;
  if(typeof track==='function')track('proximo_horarios_vistos',{ramos:_proximo.ramos.length});
  proximoCargarSecciones(periodo,_proximo.ramos.map(r=>r.sigla)).then(ok=>{
    _proximo.estadoHorarios=ok?'listo':'error';
    if(_proximo.paso==='horarios')proximoPintarHorarios();
  });
}
function proximoAlternarDia(d,boton){
  if(_proximo.diasLibres.has(d))_proximo.diasLibres.delete(d);else _proximo.diasLibres.add(d);
  if(boton)boton.setAttribute('aria-pressed',String(_proximo.diasLibres.has(d)));
  proximoPintarHorarios();
}
function proximoResultadoActual(){
  const periodo=proximoPeriodo(),siglas=_proximo.ramos.map(r=>r.sigla);
  const filas=siglas.flatMap(s=>_proximo.secciones.get(periodo+'|'+s)||[]);
  return {periodo,siglas,filas,resultado:armarHorarios(filas,siglas,{diasLibres:[..._proximo.diasLibres],maximo:5})};
}
// Grilla semanal de una combinación: días con columna, módulos con fila.
// Muestra L a V siempre y sábado solo si hay clases ese día.
function proximoGrillaHTML(combinacion){
  const modulos=MODULOS_HORARIO_POR_TENANT.uc;
  const bloques=combinacion.bloques||[];
  if(!bloques.length)return '';
  const dias=PROXIMO_DIAS_SEMANA.concat(bloques.some(b=>b.dia==='S')?['S']:[]);
  const mods=bloques.map(b=>b.modulo);
  const desde=Math.min(...mods),hasta=Math.max(...mods);
  const nombreDia=Object.fromEntries(DIAS_HORARIO);
  let filas='';
  for(let m=desde;m<=hasta;m++){
    filas+=`<tr><th scope="row"><span class="px-num">${modulos[m]?modulos[m][0]:m}</span></th>`;
    for(const d of dias){
      const aca=bloques.filter(b=>b.dia===d&&b.modulo===m);
      filas+=aca.length?`<td class="${aca.some(b=>b.fijo)?'px-fija':'px-ayu'}${aca.length>1?' px-tope':''}">${aca.map(b=>esc(b.sigla)).join('<br>')}</td>`:'<td></td>';
    }
    filas+='</tr>';
  }
  return `<table class="px-grilla"><thead><tr><th scope="col"><span class="px-oculto">Hora</span></th>${dias.map(d=>`<th scope="col" abbr="${nombreDia[d]}">${d==='W'?'Mi':nombreDia[d].slice(0,2)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
    <p class="px-leyenda"><span><i class="px-fija" aria-hidden="true"></i>Cátedra, laboratorio o taller</span>${bloques.some(b=>!b.fijo)?'<span><i class="px-ayu" aria-hidden="true"></i>Ayudantía</span>':''}</p>`;
}
function proximoAvisoHorario(a){
  const nombreDia=Object.fromEntries(DIAS_HORARIO);
  const cuando=a.dia?` (${nombreDia[a.dia]||a.dia}, ${(MODULOS_HORARIO_POR_TENANT.uc[a.modulo]||[])[0]||''})`:'';
  if(a.tipo==='tope')return `Topa la ayudantía de ${proximoLista(a.siglas)}${cuando}`;
  if(a.tipo==='dia_libre')return `La ayudantía de ${a.siglas[0]} cae en tu día libre${cuando}`;
  if(a.tipo==='hora')return `La ayudantía de ${a.siglas[0]} cae fuera del horario que pediste${cuando}`;
  if(a.tipo==='horario_incompleto')return `BuscaCursos no tiene el horario completo de ${a.siglas[0]}`;
  if(a.tipo==='sin_cupos')return `${a.siglas[0]} no tiene cupos libres en este horario según BuscaCursos`;
  return '';
}
function proximoSeccionTexto(s){
  const profes=(s.profesores||[]).filter(p=>p&&!/^sin informar$/i.test(p));
  const cupos=Number.isInteger(s.cupos)?` · ${s.cupos===0?'sin cupos':s.cupos===1?'1 cupo':s.cupos+' cupos'}`:'';
  return `Secc. ${s.seccion}${profes.length?' · '+profes.join(', '):''}${cupos}`;
}
function proximoHorariosHTML({periodo,siglas,filas,resultado},estadoRed){
  if(estadoRed==='error')return `<p class="px-nota">No pudimos traer la oferta. Revisa tu conexión. <button type="button" class="px-enlace" onclick="proximoVerHorarios()">Reintentar</button></p>`;
  if(!filas.length)return `<p class="px-vacio">BuscaCursos todavía no publica la oferta de ${esc(periodo)}. Cuando esté, aquí verás tus horarios sin topes.</p>`;
  const partes=[];
  if(resultado.sinSecciones.length)partes.push(`<p class="px-vacio">${esc(proximoLista(resultado.sinSecciones))} no ${resultado.sinSecciones.length>1?'tienen':'tiene'} secciones en ${esc(periodo)}. Quítalo para ver horarios.</p>`);
  if(resultado.sinOpciones.length)partes.push(`<p class="px-vacio">Con ese día libre, ${esc(proximoLista(resultado.sinOpciones.map(x=>x.sigla)))} se queda sin secciones. Prueba con otro día.</p>`);
  if(partes.length)return partes.join('');
  if(!resultado.combinaciones.length)return `<p class="px-vacio">No hay forma de tomar ${siglas.length>2?'todos estos ramos':'estos ramos'} sin topes de cátedra o laboratorio. Prueba quitando uno.</p>`;
  const opciones=resultado.combinaciones.map((c,i)=>{
    const avisos=c.avisos.map(proximoAvisoHorario).filter(Boolean);
    return `<section class="px-opcion" aria-labelledby="px-op-${i}">
      <h3 id="px-op-${i}" class="px-opcion-titulo">Opción ${i+1}<span class="px-resumen px-num">${c.diasFijos} día${c.diasFijos!==1?'s':''} · ${c.ventanas} ventana${c.ventanas!==1?'s':''}</span></h3>
      ${proximoGrillaHTML(c)}
      <ul class="px-secciones">${c.ramos.map(r=>`<li><span class="px-sigla">${esc(r.sigla)}</span> ${esc(proximoSeccionTexto(r.secciones[0]))} <span class="px-nrc px-num">NRC ${esc(r.secciones[0].nrc)}</span>${r.secciones.length>1?`<br><span class="px-otras">Mismo horario: ${r.secciones.slice(1).map(s=>'secc. '+esc(s.seccion)).join(', ')}</span>`:''}</li>`).join('')}</ul>
      ${avisos.length?`<ul class="px-avisos">${avisos.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:''}
      <button type="button" class="btn-cancel px-copiar" onclick="proximoCopiarNRC(${i})">Copiar NRC</button>
    </section>`;
  }).join('');
  return opciones+(resultado.incompleto?'<p class="px-nota">Hay demasiadas combinaciones: estas son las mejores que encontramos. Elige un día libre para afinar.</p>':'');
}
function proximoPintarHorarios(){
  const caja=document.getElementById('px-horarios');
  if(!caja)return;
  caja.innerHTML=proximoHorariosHTML(proximoResultadoActual(),_proximo.estadoHorarios);
}
async function proximoCopiarNRC(i){
  const c=proximoResultadoActual().resultado.combinaciones[i];
  if(!c)return;
  const texto=c.ramos.map(r=>`${r.sigla} NRC ${r.secciones[0].nrc}`).join('\n');
  try{await navigator.clipboard.writeText(texto);showToast('NRC copiados');}
  catch(e){showToast('No se pudo copiar');}
}
