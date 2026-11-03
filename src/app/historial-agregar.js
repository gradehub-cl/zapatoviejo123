
// ─── SEMESTRES ANTERIORES, CARGADOS A MANO ───────────────────────────────────
// Alguien que llega en cuarto semestre tiene tres años de notas que la app no
// vio. Sin esto empieza con el promedio en blanco y GradeHub le sirve la mitad:
// puede llevar el semestre en curso, pero no sabe cómo va su carrera.
//
// No se le piden las evaluaciones de cada ramo: nadie recuerda las ponderaciones
// de un ramo que cursó hace dos años, y pedirlas convertiría esto en una tarde de
// transcripción. Se pide lo único que sí tiene a mano —el promedio final— y se
// guarda como `avgOverride`, que es el mismo mecanismo con el que ya se corrige
// a mano el promedio de un ramo archivado.
const BUSQUEDA_MIN=2;
let histManual={label:'',anio:0,periodo:'1',ramos:[],paso:1};

function openSemestreAnteriorModal(){
  const anio=anioActualSemestre();
  histManual={label:etiquetaSemestre(anio,'1'),anio,periodo:'1',ramos:[],paso:1};
  renderSemestreAnteriorModal();
  openModal();
}

function renderSemestreAnteriorModal(){
  const box=document.getElementById('modal-content');if(!box)return;
  box.innerHTML = histManual.paso===1 ? pasoRamosSemestreAnterior() : pasoNotasSemestreAnterior();
  if(histManual.paso===1){
    const b=document.getElementById('m-hist-buscar');
    if(b){const pintar=()=>renderBusquedaSemestreAnterior(b.value);b.addEventListener('input',pintar);pintar();}
  }
}

function pasoRamosSemestreAnterior(){
  const filas=histManual.ramos.map((r,i)=>`
    <div class="rep-row">
      <div class="rep-name">${esc(r.nombre)}${r.creditos?` <span class="rep-tag">${r.creditos} cr</span>`:''}</div>
      <button type="button" onclick="quitarRamoSemestreAnterior(${i})" aria-label="Quitar ${esc(r.nombre)}" style="min-height:44px;padding:9px 8px;border:0;border-radius:10px;background:none;color:var(--fg3);font:600 0.75rem var(--font-ui);cursor:pointer;">Quitar</button>
    </div>`).join('');
  return `
    <div class="modal-title">Agregar un semestre anterior</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:14px;">
      Elige los ramos y pon la nota final de cada uno. No necesitas las evaluaciones.
    </p>
    <label class="modal-label">Qu\u00e9 semestre fue</label>
    <div class="sem-picker" id="m-hist-sem">${selectorSemestreHTML(histManual.anio,histManual.periodo,'setAnioSemestreAnterior','setPeriodoSemestreAnterior')}</div>
    <label class="modal-label" for="m-hist-buscar">Busca tus ramos</label>
    <div class="course-picker-search"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input id="m-hist-buscar" type="text" placeholder="Nombre o sigla" maxlength="${NOMBRE_MAX}" autocomplete="off"/></div>
    <div id="m-hist-resultados"></div>
    ${filas?`<label class="modal-label" style="margin-top:14px;">Tus ramos de ese semestre</label><div class="rep-box">${filas}</div>`:''}
    <div class="modal-btns">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" ${histManual.ramos.length?'':'disabled'} onclick="pasarANotasSemestreAnterior()">Continuar</button>
    </div>`;
}

function repintarSelectorSemestreAnterior(){
  histManual.label=etiquetaSemestre(histManual.anio,histManual.periodo);
  // Se repinta solo el selector: volver a dibujar el paso entero borraría lo que
  // la persona lleva escrito en el buscador de ramos.
  const box=document.getElementById('m-hist-sem');
  if(box)box.innerHTML=selectorSemestreHTML(histManual.anio,histManual.periodo,'setAnioSemestreAnterior','setPeriodoSemestreAnterior');
}
function setAnioSemestreAnterior(v){histManual.anio=Number(v);repintarSelectorSemestreAnterior();}
function setPeriodoSemestreAnterior(v){histManual.periodo=v;repintarSelectorSemestreAnterior();}

function renderBusquedaSemestreAnterior(q,{editar=false}={}){
  const prefijo=editar?'m-hist-ren':'m-hist';
  const box=document.getElementById(prefijo+'-resultados');if(!box)return;
  const texto=String(q||'').trim();
  // Con una sola letra el catálogo devuelve medio semestre: no ayuda a nadie.
  if(texto.length<BUSQUEDA_MIN){box.innerHTML='';return;}
  const repintar=()=>{
    const input=document.getElementById(prefijo+'-buscar');
    if(input&&input.value===q)renderBusquedaSemestreAnterior(q,{editar});
  };
  repintarAlCargarMallas(S.tenant,repintar);
  repintarAlCargarCursosUC(S.tenant,repintar,texto,S.carrera);
  const h=editar&&S.historial.find(x=>x.id===histRename.id);
  const elegidos=editar?[...(h?.ramos||[]),...histRename.nuevos]:histManual.ramos;
  const agregar=editar?'agregarRamoHistRename':'agregarRamoSemestreAnterior';
  const res=searchCatalog(texto,S.tenant,S.carrera,8)
    .filter(c=>!elegidos.some(r=>r&&normName(r.nombre)===normName(c.nombre)));
  box.innerHTML=(!res.length&&catalogoUcEnCamino(S.tenant)
      ?'<p class="course-picker-reassurance">Buscando en el catálogo de la UC…</p>':'')
    +res.map(c=>`
    <button type="button" class="course-picker-result" onclick="${agregar}('${obCodificarNombre(c.nombre)}','${obCodificarNombre(c.sigla||'')}')">
      <span class="course-picker-result-name">${esc(c.nombre)}</span>
    </button>`).join('')
    // Un ramo de hace dos años puede no estar en el catálogo de hoy: se agrega igual.
    +`<button type="button" class="course-picker-manual" onclick="${agregar}('${obCodificarNombre(texto)}')">Agregar «${esc(texto)}»</button>`;
}

function agregarRamoSemestreAnterior(cod,siglaCod){
  const nombre=decodeURIComponent(cod).trim();
  if(!nombre||histManual.ramos.some(r=>normName(r.nombre)===normName(nombre)))return;
  const sigla=siglaCod?decodeURIComponent(siglaCod):null;
  histManual.ramos.push({nombre,creditos:creditosDe(nombre,S.tenant,null,sigla),nota:''});
  renderSemestreAnteriorModal();
}
function quitarRamoSemestreAnterior(i){histManual.ramos.splice(i,1);renderSemestreAnteriorModal();}

function pasarANotasSemestreAnterior(){
  if(!histManual.ramos.length)return;
  histManual.paso=2;renderSemestreAnteriorModal();
}

function pasoNotasSemestreAnterior(){
  const filas=histManual.ramos.map((r,i)=>`
    <div class="rep-row">
      <div class="rep-name">${esc(r.nombre)}${r.creditos?` <span class="rep-tag">${r.creditos} cr</span>`:''}</div>
      <span class="rep-peso-field"><input class="rep-peso-input" type="text" inputmode="decimal" id="m-hist-nota-${i}" value="${esc(r.nota)}" maxlength="4" autocomplete="off" placeholder="—" aria-label="Nota final de ${esc(r.nombre)}" oninput="actualizarNotaSemestreAnterior(${i},this.value)"/></span>
    </div>`).join('');
  return `
    <div class="modal-title">Notas finales de ${esc(histManual.label||'ese semestre')}</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin-bottom:14px;">
      La nota con la que cerraste cada ramo. Puedes dejar en blanco los que no
      recuerdes: esos no entran al promedio.
    </p>
    <div class="rep-box">${filas}</div>
    <p class="rep-balance" id="m-hist-aviso" role="status" aria-live="polite">${textoAvisoSemestreAnterior()}</p>
    <div class="modal-btns">
      <button class="btn-cancel" onclick="histManual.paso=1;renderSemestreAnteriorModal()">Atr\u00e1s</button>
      <button class="btn-confirm" onclick="guardarSemestreAnterior()">Guardar semestre</button>
    </div>`;
}

function actualizarNotaSemestreAnterior(i,v){
  if(!histManual.ramos[i])return;
  histManual.ramos[i].nota=v;
  const el=document.getElementById('m-hist-aviso');
  if(el)el.textContent=textoAvisoSemestreAnterior();
}

// La escala se comprueba acá y no se delega: una nota fuera de 1,0–7,0 tiene que
// avisarle a la persona en el momento, no desaparecer callada del promedio al
// guardar. Se acepta coma o punto, que es como la gente la escribe.
function notaSemestreAnterior(txt){
  const t=String(txt||'').trim().replace(',','.');
  if(!t)return null;
  const v=Number(t);
  if(!Number.isFinite(v)||v<1||v>7)return null;
  return r2(v);
}
function notasValidasSemestreAnterior(){
  return histManual.ramos
    .map(r=>({...r,valor:notaSemestreAnterior(r.nota)}))
    .filter(r=>r.valor!==null);
}
function textoAvisoSemestreAnterior(){
  const conNota=notasValidasSemestreAnterior();
  const fuera=histManual.ramos.filter(r=>String(r.nota||'').trim()&&notaSemestreAnterior(r.nota)===null);
  if(fuera.length)return `Revisa ${fuera.map(r=>r.nombre).join(', ')}: la nota va entre 1,0 y 7,0.`;
  if(!conNota.length)return 'Pon al menos una nota para guardar el semestre.';
  const prom=gpa(conNota.map(r=>({...r,avgOverride:r.valor,categorias:[]})));
  return `${conNota.length} de ${histManual.ramos.length} con nota · promedio ${prom!==null?nf(prom,2):'—'}`;
}

function guardarSemestreAnterior(){
  const conNota=notasValidasSemestreAnterior();
  if(!conNota.length){showToast('Pon al menos una nota para guardar',true);return;}
  const label=etiquetaSemestre(histManual.anio,histManual.periodo);
  // Se guardan SOLO los ramos con nota: uno sin nota no aporta al promedio y
  // aparecería en el historial como si estuviera pendiente de algo.
  const ramos=conNota.map(r=>({
    id:uid(),nombre:r.nombre,color:COLORS[Math.floor(Math.random()*COLORS.length)],
    creditos:r.creditos,avgOverride:r.valor,categorias:[],origen:{manual:true}
  }));
  S.historial.unshift({
    id:uid(),label,archivedAt:Date.now(),manual:true,
    gpa:gpa(ramos),ramos
  });
  save();track('semestre_anterior_agregado',{ramos:ramos.length});
  closeModal();renderHome();renderStats();
  showToast(`${label} agregado al historial`);
}

function confirmArchiveSemester(){prepararArchivoSemestre();}
