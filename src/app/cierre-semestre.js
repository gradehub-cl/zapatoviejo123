// El cierre y Wrapped comparten esta revisión; el motor decide qué queda pendiente.
function notaPortalValida(v){return typeof v==='number'&&Number.isFinite(v)&&v>=1&&v<=7;}
function revisionCierreSemestre(base){
  const pendientes=[];
  for(const r of base&&base.ramos||[]){
    if(notaPortalValida(r.notaOficial)||(!base.actual&&Number.isFinite(r.avgOverride)))continue;
    const {res,estructura}=calculoRamoConCompuertas(r);
    const faltantes=res.emptyLeaves.filter(n=>n.effectiveWeight>0).map(n=>n.name||'Evaluación sin nota');
    for(const c of estructura.children||[]){if(c.weight>0&&!c.children.length)faltantes.push(c.name||'Evaluaciones sin registrar');}
    if(!Number.isFinite(ramoAvg(r,undefined,base.ramos)))faltantes.push('Revisa la pauta y las notas de este ramo');
    if(faltantes.length)pendientes.push({id:r.id,nombre:r.nombre,evaluaciones:[...new Set(faltantes)]});
  }
  // Un ramo que incorpora un laboratorio pendiente tampoco tiene final cerrada.
  for(let vuelta=0;vuelta<(base&&base.ramos||[]).length;vuelta++)for(const r of base.ramos){
    if(notaPortalValida(r.notaOficial)||pendientes.some(p=>p.id===r.id))continue;
    const vinculo=ramoVinculado(r,base.ramos);
    if(vinculo&&pendientes.some(p=>p.id===vinculo.id))pendientes.push({id:r.id,nombre:r.nombre,evaluaciones:['Final de '+vinculo.nombre]});
  }
  return {listo:!!base&&base.ramos.length>0&&pendientes.length===0,pendientes};
}
function cierreRamoIncompleto(r,ramos){
  return !!(r&&r.cierreIncompleto&&!notaPortalValida(r.notaOficial)&&revisionCierreSemestre({actual:false,ramos:ramos||[r]}).pendientes.some(x=>x.id===r.id));
}
function notaFinalCierreRamo(r,v){return gh_notaOficial(v,gh_reglasNota((r&&r.origen&&r.origen.tenant)||(r&&r.cierre&&r.cierre.tenant)||S.tenant));}
function notaRamoParaResumen(r,ramos){
  if(notaPortalValida(r&&r.notaOficial))return r.notaOficial;
  if(cierreRamoIncompleto(r,ramos))return null;
  // El motor ya entiende finales confirmadas mediante avgOverride. Se adapta
  // una copia de los vínculos, sin reescribir notas ni el campo histórico.
  const contexto=ramos&&ramos.some(x=>notaPortalValida(x.notaOficial))
    ?ramos.map(x=>notaPortalValida(x.notaOficial)?{...x,avgOverride:x.notaOficial}:x):ramos;
  const valor=ramoAvg(r,undefined,contexto);
  return r&&r.cierre?notaFinalCierreRamo(r,valor):valor;
}
function promedioAcumuladoCierre(historial){
  const politica=gh_reglasNota(S.tenant).promedioAcademico;
  // Resolver vínculos dentro de su semestre evita enlazar laboratorios de años
  // distintos. Sin política se conserva exactamente el acumulado de #937.
  const finales=(historial||[]).flatMap(h=>{
    const p=politica&&parseEtiquetaSemestre(h.label);
    const periodo=p?p.anio*3+({v:0,1:1,2:2}[p.periodo]):null;
    return ramosDelPromedio(h.ramos||[]).map(r=>{
      const codigo=String(r.sigla||r.origen?.ramoKey||'').trim().toUpperCase();
      return {creditos:r.creditos,avgOverride:notaRamoParaResumen(r,h.ramos),categorias:[],
        ...(politica?{periodo,clave:codigo?(r.origen?.tenant||r.cierre?.tenant||S.tenant)+'|'+codigo:null}:{})};
    });
  }).filter(r=>Number.isFinite(r.avgOverride));
  if(!politica)return gpa(finales);
  // Una sigla y un período identificables, nunca un nombre parecido. La
  // reprobación queda en el PPP original: esta selección es solo del PPA.
  const minimo=gh_reglasNota(S.tenant).passing_grade;
  const vigentes=finales.filter(r=>!politica.excluirReprobadosLuegoAprobados||r.avgOverride>=minimo||!r.clave||r.periodo===null||
    !finales.some(x=>x.clave===r.clave&&x.periodo!==null&&x.periodo>r.periodo&&x.avgOverride>=minimo));
  // El art. 28 exige ponderar: sin créditos no se presenta el respaldo simple
  // de gpa como si fuera un PPA. No se cambian los datos ni sus cachés.
  if(!vigentes.length||vigentes.some(r=>!tieneCreditos(r))||!vigentes.some(r=>r.creditos>0))return null;
  return gh_notaOficial(gpa(vigentes),gh_reglasNota(S.tenant));
}
function datosCierreRamo(r,ramos,periodo){
  return {tenant:(r.origen&&r.origen.tenant)||S.tenant,sigla:claveReporte(r),periodo,
    huella:huellaEstructura(estructuraParaConsenso(estructuraDe(r))),
    calculada:notaFinalCierreRamo(r,ramoAvg({...r,avgOverride:undefined,notaOficial:undefined},undefined,ramos)),
    pauta_origen:r.origen&&r.pautaHuella&&!r.consensoRespaldos&&!r.pautaSugerida?.aceptada&&presetRamo(r.nombre,(r.origen&&r.origen.tenant)||S.tenant,(r.origen&&r.origen.carrera)||S.carrera)&&!pautaEditada(r)?'oficial':'editada'};
}
let archivoSemestreDraft=null,archivoSemestreNotas=null;
function prepararArchivoSemestre(){
  const caja=document.getElementById('modal-content');if(!caja||!S.ramos.length)return;
  if(!archivoSemestreNotas||archivoSemestreNotas.cuenta!==(currentUser&&currentUser.id)||archivoSemestreNotas.estado!==S)archivoSemestreNotas={cuenta:currentUser&&currentUser.id,estado:S,valores:new Map()};
  archivoSemestreDraft={cuenta:currentUser&&currentUser.id,estado:S,version:JSON.stringify(S.ramos)};
  const cierre=revisionCierreSemestre({ramos:S.ramos,actual:true});
  caja.innerHTML=`<div class="modal-title">Archivar ${esc(semester())}</div>
    <p>Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo.</p>
    <form id="form-cierre-semestre"><div class="cierre-lista">${S.ramos.map((r,i)=>{
      const pendiente=cierre.pendientes.find(x=>x.id===r.id),calculada=notaFinalOficial(ramoAvg(r,undefined,S.ramos));
      return `<section class="cierre-ramo"><h3>${esc(r.nombre)}</h3>${pendiente?`<p>Falta: ${pendiente.evaluaciones.map(esc).join(' · ')}</p><button type="button" data-cierre-revisar="${i}">Completar evaluaciones</button>`:`<p>Calculada: ${fmtPromedio(calculada)}</p>`}
      <label for="cierre-oficial-${i}">Nota final oficial <span>del portal de tu universidad</span></label><input id="cierre-oficial-${i}" type="text" inputmode="decimal" maxlength="4" placeholder="—" value="${archivoSemestreNotas.valores.has(r.id)?esc(archivoSemestreNotas.valores.get(r.id)):notaPortalValida(r.notaOficial)?esc(r.notaOficial):''}"></section>`;
    }).join('')}</div><p id="cierre-error" role="alert"></p><div class="modal-btns"><button type="button" class="btn-cancel" onclick="cancelarArchivoSemestre()">Cancelar</button><button type="submit" class="btn-confirm accion-principal">Archivar semestre</button></div></form>`;
  caja.querySelectorAll('[data-cierre-revisar]').forEach(b=>b.addEventListener('click',()=>{const r=S.ramos[Number(b.dataset.cierreRevisar)];S.ramos.forEach((ramo,i)=>archivoSemestreNotas.valores.set(ramo.id,document.getElementById('cierre-oficial-'+i).value));closeModal();if(r)openRamo(r.id);}));
  caja.querySelector('form').addEventListener('submit',e=>{e.preventDefault();guardarArchivoRevisado();});openModal();
}
function cancelarArchivoSemestre(){archivoSemestreNotas=null;archivoSemestreDraft=null;closeModal();}
function guardarArchivoRevisado(){
  const draft=archivoSemestreDraft;
  if(!draft||draft.estado!==S||draft.cuenta!==(currentUser&&currentUser.id)||draft.version!==JSON.stringify(S.ramos)){
    showToast('Tus ramos cambiaron. Revisa el cierre de nuevo.');return;
  }
  const oficiales=[];
  for(let i=0;i<S.ramos.length;i++){
    const campo=document.getElementById('cierre-oficial-'+i),texto=campo.value.trim();
    const valor=texto?notaSemestreAnterior(texto):null;
    if(texto&&!notaPortalValida(valor)){document.getElementById('cierre-error').textContent='Escribe una nota entre 1,0 y 7,0, o deja el campo vacío.';campo.setAttribute('aria-invalid','true');campo.focus();return;}
    oficiales.push(valor);
  }
  const label=semester(),revision=revisionCierreSemestre({ramos:S.ramos,actual:true});
  const copias=JSON.parse(JSON.stringify(S.ramos));
  copias.forEach((r,i)=>{
    if(oficiales[i]!==null)r.notaOficial=oficiales[i];else delete r.notaOficial;
    r.cierreIncompleto=revision.pendientes.some(p=>p.id===r.id)&&oficiales[i]===null;
    r.cierre=datosCierreRamo(S.ramos[i],S.ramos,label);
  });
  S.historial.unshift({id:uid(),label,archivedAt:Date.now(),careerSemestre:S.careerSemestre,gpa:gpa(copias),ramos:copias});
  S.ramos=[];archivoSemestreDraft=null;archivoSemestreNotas=null;save();track('archive_semester',{label});closeModal();renderHome();
}
function abrirNotaOficialHistorial(histId,ramoId){
  const h=S.historial.find(x=>x.id===histId),r=h&&(h.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  const caja=document.getElementById('modal-content');
  caja.innerHTML=`<div class="modal-title">${esc(r.nombre)}</div><p>Nota final del portal de tu universidad. No cambia tus evaluaciones.</p><label class="modal-label" for="hist-nota-oficial">Nota final oficial</label><div class="modal-input"><input id="hist-nota-oficial" type="text" inputmode="decimal" maxlength="4" value="${notaPortalValida(r.notaOficial)?esc(r.notaOficial):''}" placeholder="—"></div>${selectorExclusionPromedio(r,'hist-oficial-promedio')}<p id="hist-oficial-error" role="alert"></p><div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button><button type="button" class="btn-confirm accion-principal" id="hist-oficial-guardar">Guardar</button></div>`;
  caja.querySelector('#hist-oficial-guardar').addEventListener('click',()=>{
    const campo=document.getElementById('hist-nota-oficial'),texto=campo.value.trim(),valor=texto?notaSemestreAnterior(texto):null;
    if(texto&&!notaPortalValida(valor)){document.getElementById('hist-oficial-error').textContent='Escribe una nota entre 1,0 y 7,0.';campo.focus();return;}
    guardarExclusionPromedio(r,'hist-oficial-promedio');
    if(valor===null)delete r.notaOficial;else r.notaOficial=valor;
    if(!r.cierre)r.cierre=datosCierreRamo(r,h.ramos,h.label);
    recomputeHistGpa(h);save();closeModal();renderStats();showToast('Nota oficial actualizada');
  });openModal();
}
let _discrepanciasCierreEnCurso=false;
async function enviarDiscrepanciasCierre(){
  if(_discrepanciasCierreEnCurso||!supabaseClient||!currentUser)return;
  _discrepanciasCierreEnCurso=true;
  const cuenta=currentUser.id,estado=S;let cambios=false;
  try{
    for(const h of estado.historial||[])for(const r of h.ramos||[]){
      if(!currentUser||currentUser.id!==cuenta||S!==estado)return;
      const c=r.cierre;if(!c||!notaPortalValida(c.calculada)||!/^\d{4}-[12v]$/.test(c.periodo||''))continue;
      const oficial=notaPortalValida(r.notaOficial)?r.notaOficial:null;
      if(oficial===null&&!c.discrepanciaEnviada)continue;
      const args={p_tenant:c.tenant,p_sigla:c.sigla,p_periodo:c.periodo,p_huella:c.huella,p_calculada:c.calculada,p_oficial:oficial,p_pauta_origen:c.pauta_origen};
      const firma=JSON.stringify(args);if(c.discrepanciaEnviada===firma)continue;
      const {error}=await supabaseClient.rpc('registrar_discrepancia_nota',args);
      if(!error&&currentUser&&currentUser.id===cuenta&&S===estado&&JSON.stringify({...args,p_oficial:notaPortalValida(r.notaOficial)?r.notaOficial:null})===firma){c.discrepanciaEnviada=firma;cambios=true;}
    }
  }catch(e){}finally{
    _discrepanciasCierreEnCurso=false;
    if(cambios&&currentUser&&currentUser.id===cuenta&&S===estado)save();
  }
}
