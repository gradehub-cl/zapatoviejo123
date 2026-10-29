function obRamosActuales(){if(typeof obVerano!=='undefined'&&obVerano)return [];return ((mallaDeCarrera(selectedTenant,selectedCarrera)||{})[selectedSem]||[]);}
function prepararObRamos(){
  const key=[selectedTenant,selectedCarrera,selectedSem].join(':');
  // Traer la malla antes de decidir qué sugerir. Si no llega, el paso 5 muestra
  // el buscador sin sugerencias, que es como funcionan hoy estas carreras.
  // Al llegar se repinta el paso entero y no solo el selector: el botón ya se
  // había escrito con cero ramos, y decía "Continuar sin ramos" con la malla
  // completa marcada encima.
  if(selectedCarrera&&ARCHIVO_MALLAS[selectedTenant]&&!(mallaFor(selectedTenant)||{})[selectedCarrera]&&!mallasExtraDe(selectedTenant)){
    cargarMallasUC(selectedTenant).then(ok=>{if(ok){obRamosKey=null;if(obStep===5)obRender();}});
  }
  // Lo mismo con las pautas del consenso: el buscador las ofrece en cuanto llegan.
  if(!consensoCargado(selectedTenant)){
    const t=selectedTenant;
    cargarConsenso(t).then(filas=>{if(filas&&filas.length&&obStep===5&&selectedTenant===t)obRender();});
  }
  if(key===obRamosKey)return;
  obRamosKey=key;obManualOpen=false;
  obRamos=obRamosActuales().map(nombre=>({nombre,manual:false}));
  renderObCoursePicker();
}
function obTieneRamo(nombre,sigla){
  return obRamos.some(r=>{
    if(sigla&&r.sigla)return normName(r.sigla)===normName(sigla);
    return normName(r.nombre)===normName(nombre);
  });
}
// encodeURIComponent deja el apóstrofo intacto. Como el valor entra en un
// literal JS delimitado por comillas simples dentro del atributo, se codifica
// también para que un nombre manual no pueda cerrar el handler.
function obCodificarNombre(nombre){return encodeURIComponent(nombre).replace(/'/g,'%27');}
function obToggleRamo(nombre,checked){
  if(checked&&!obTieneRamo(nombre))obRamos.push({nombre,manual:false});
  if(!checked)obRamos=obRamos.filter(r=>normName(r.nombre)!==normName(nombre));
  // El checkbox ya refleja el cambio. Reconstruir el selector completo en cada
  // clic hace saltar su scroll y recalcula todas las filas, justo cuando la
  // persona está marcando varios ramos de su horario.
  obRender();
}
function obToggleRamoCodificado(nombre,checked){obToggleRamo(decodeURIComponent(nombre),checked);}

// Un mismo ramo puede tener dos códigos. El plan común de Ingeniería UC admite
// FIS1514 o ICE1514 y los dos se llaman oficialmente "Dinámica", así que la
// malla sugiere un nombre que no alcanza para saber cuál está tomando: eso lo
// distingue la sigla de su horario. El catálogo guarda la alternativa como
// "Dinámica (ICE1514)", y de ahí salen las variantes.
//
// El paréntesis tiene que contener una SIGLA, no cualquier texto: hay ramos
// como "Diseño en Ingeniería Biomédica I (Capstone)" que son otro ramo, no otra
// versión del mismo, y tratarlos como variante ofrecería una elección falsa.
function variantesDeRamo(nombre,tenant){
  const tabla=CREDITOS_POR_TENANT[tenant||selectedTenant];
  if(!tabla||!nombre)return [];
  const base=String(nombre);
  const siglaDe=k=>{const f=tabla[k];return f&&typeof f[1]==='string'?f[1]:null;};
  const out=tabla[base]?[{nombre:base,sigla:siglaDe(base)}]:[];
  Object.keys(tabla).forEach(k=>{
    const m=k.match(/^(.*) \(([A-Z]{2,4}\d{3,4}[A-Z]?)\)$/);
    if(m&&normName(m[1])===normName(base))out.push({nombre:k,sigla:m[2]});
  });
  return out.length>1?out:[];
}
// Qué variante eligió, por nombre base. Sin elección, la primera: la que la
// malla sugiere.
function variantesSiglaDe(nombre,variantes){const v=variantes.find(x=>x.nombre===nombre);return (v&&v.sigla)||nombre;}
let obVarianteElegida={};
function obVarianteDe(base,variantes){
  const guardada=obVarianteElegida[normName(base)];
  if(guardada&&variantes.some(v=>v.nombre===guardada))return guardada;
  return variantes[0].nombre;
}
function obElegirVariante(baseCod,nombreCod){
  const base=decodeURIComponent(baseCod),elegido=decodeURIComponent(nombreCod);
  const variantes=variantesDeRamo(base);
  if(!variantes.length)return;
  const anterior=obVarianteDe(base,variantes);
  if(anterior===elegido)return;
  obVarianteElegida[normName(base)]=elegido;
  // Cambiar de código no puede dejar las dos versiones marcadas ni perder la
  // marca: si tenía una elegida, la elección se traslada a la nueva.
  if(obTieneRamo(anterior)){
    obRamos=obRamos.filter(r=>normName(r.nombre)!==normName(anterior));
    if(!obTieneRamo(elegido))obRamos.push({nombre:elegido,manual:false});
  }
  renderObCoursePicker();obRender();
}
function obAgregarCatalogo(nombre,sigla){
  const fila=selectedTenant==='uc'?cursoUcCompleto(nombre,sigla):null;
  if(!obTieneRamo(nombre,sigla))obRamos.push({nombre,manual:false,sigla:sigla||null,
    creditos:fila&&typeof fila[2]==='number'?fila[2]:null});
  renderObCoursePicker();obRender();
}
function obAgregarCatalogoCodificado(nombre,sigla){
  obAgregarCatalogo(decodeURIComponent(nombre),sigla?decodeURIComponent(sigla):null);
}
function obToggleManual(){obManualOpen=!obManualOpen;obManualError='';renderObCoursePicker();}
function obAgregarManual(){
  const input=document.getElementById('ob-manual-name');
  const nombre=(input&&input.value||'').trim();
  if(!nombre){
    obManualError='Escribe el nombre del ramo para agregarlo.';
    const error=document.getElementById('ob-manual-error');
    if(error){error.textContent=obManualError;error.hidden=false;}
    if(input){input.setAttribute('aria-invalid','true');input.focus();}
    return false;
  }
  if(!obTieneRamo(nombre))obRamos.push({nombre,manual:true});
  obManualError='';obManualOpen=false;renderObCoursePicker();obRender();
  return true;
}
function obRamosVisibles(sugeridos,elegidos){
  const visibles=[...(sugeridos||[])];
  (elegidos||[]).forEach(r=>{
    const nombre=typeof r==='string'?r:(r&&r.nombre);
    if(nombre&&!visibles.some(n=>normName(n)===normName(nombre)))visibles.push(nombre);
  });
  return visibles;
}
// Ingeniería UC se separa por majors después del plan común. La app conoce
// muchos de esos ramos por su tabla de SCT, pero no puede asumir un major por
// semestre: sería cargarle cursos que quizá nunca toma.
// Sin nada donde buscar: ni malla base de la universidad ni malla propia de la
// carrera. Mirar solo `mallaFor` dejaba a la UAI sin buscador y diciendo que no
// había malla, cuando sus 23 mallas viven aparte en `mallas-uai.js`.
function obSinCatalogo(){
  // El buscador también ofrece ramos de otras carreras. No tener malla propia
  // no elimina las mallas diferidas de la universidad (por ejemplo UAI/Otra).
  return Object.keys(mallaFor(selectedTenant)||{}).length===0&&!mallaDeCarrera(selectedTenant,selectedCarrera)&&!ARCHIVO_MALLAS[selectedTenant];
}
function obCoursePickerIntro(sugeridos){
  if(selectedTenant==='uc'&&selectedCarrera==='ING-PC'&&selectedSem>=5){
    return 'Desde 5° Ingeniería UC se separa por major. Busca cada ramo por nombre o sigla de tu horario.';
  }
  // Hay universidades con carreras declarables pero sin malla ni catálogo
  // verificados. Un buscador sin datos ofrece una salida que no existe: acá se
  // parte directo por el único camino honesto, los ramos del horario.
  if(obSinCatalogo()&&selectedCarreraNombre){
    return `Aún no tenemos una malla verificada para ${esc(selectedCarreraNombre)}. Agrega los ramos de tu horario a mano.`;
  }
  if(!selectedCarrera&&selectedCarreraNombre){
    return `Aún no tenemos una malla verificada para ${esc(selectedCarreraNombre)}. Busca tus ramos o agrégalos a mano.`;
  }
  return sugeridos.length
    ? 'Marca los que tomas este semestre. Puedes buscar y sumar otros ramos.'
    : 'No tenemos ramos sugeridos para este semestre. Busca los de tu horario o agrégalos a mano.';
}
function obCourseSearchLabel(){return selectedTenant==='uc'?'Buscar por nombre o sigla':'Buscar otro ramo';}
function obCourseSearchPlaceholder(){return selectedTenant==='uc'?'Ej.: IIC2333, Termodinámica':'Ej.: Inglés IV, Cálculo II';}
function obCatalogMeta(r){
  const lugar=r.semestre>0?`${r.semestre}° semestre`
    :r.fuente==='catalogo-ingenieria'?'catálogo de Ingeniería UC'
      :r.fuente==='curso-uc'?'curso UC fuera de malla':'fuera de malla';
  const detalles=[r.sigla?esc(r.sigla):'',lugar];
  if(typeof r.creditos==='number')detalles.push(`${r.creditos} créditos`);
  if(r.escuela)detalles.push(esc(r.escuela));
  if(r.tienePreset)detalles.push(r.consenso?`pauta de ${r.consenso} estudiantes`:'con pauta');
  return detalles.filter(Boolean).join(' · ');
}
function renderObCoursePicker(){
  const box=document.getElementById('ob-course-picker');if(!box)return;
  const sugeridos=obRamosActuales();
  const visibles=obRamosVisibles(sugeridos,obRamos);
  const sinCatalogoVerificado=obSinCatalogo();
  const rows=visibles.length?visibles.map(nombre=>{
    // Si el ramo tiene dos códigos, la fila marca uno y ofrece cambiarlo. No se
    // pintan como dos ramos distintos: es el mismo, y marcar los dos sería
    // cargar dos veces el mismo curso.
    const variantes=variantesDeRamo(nombre);
    const elegido=variantes.length?obVarianteDe(nombre,variantes):nombre;
    const sig=variantes.length
      ? `<span class="course-picker-variantes" role="group" aria-label="Código de ${esc(nombre)}">${variantes.map(v=>`
          <button type="button" class="course-picker-sigla${v.nombre===elegido?' sel':''}" aria-pressed="${v.nombre===elegido?'true':'false'}" onclick="obElegirVariante('${obCodificarNombre(nombre)}','${obCodificarNombre(v.nombre)}')">${esc(v.sigla||v.nombre)}</button>`).join('')}</span>`
      : (siglaDeRamo({nombre},selectedTenant)?`<span class="course-picker-sigla-fija">${esc(siglaDeRamo({nombre},selectedTenant))}</span>`:'');
    // Los dos códigos no traen lo mismo. De FIS1514 tenemos la pauta oficial y
    // la regla que junta su nota con la del laboratorio; de ICE1514 no tenemos
    // ninguna de las dos, y no se las copiamos porque son cursos distintos y
    // ese dato no lo tenemos. Elegir el código que aparece en su horario es lo
    // correcto igual, pero tiene que saber qué se lleva y qué no.
    const sinPauta=variantes.length&&!presetRamo(elegido,selectedTenant,selectedCarrera)
      &&variantes.some(v=>presetRamo(v.nombre,selectedTenant,selectedCarrera));
    const aviso=sinPauta
      ? `<p class="course-picker-nota">De ${esc(variantesSiglaDe(elegido,variantes))} todavía no tenemos la pauta: sus evaluaciones las armas tú.</p>`
      : '';
    return `
    <label style="display:flex;align-items:center;gap:11px;padding:10px 2px;border-bottom:1px solid var(--border);cursor:pointer;">
      <input type="checkbox" ${obTieneRamo(elegido)?'checked':''} onchange="obToggleRamoCodificado('${obCodificarNombre(elegido)}',this.checked)" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--primary);"/>
      <span class="course-picker-selected-name">${esc(nombre)}</span>
      ${sig}
    </label>${aviso}`;}).join(''):
    '';
  box.innerHTML=`
    <div class="course-picker">
      <p class="course-picker-intro">${obCoursePickerIntro(sugeridos)}</p>
      ${sinCatalogoVerificado&&!visibles.length?'':`
      <div class="course-picker-section">
        <label class="modal-label">${sugeridos.length?`Sugeridos para ${selectedSem}°`:'Tu semestre'}</label>
        ${rows}
      </div>`}
      ${sinCatalogoVerificado?'':`<div class="course-picker-section">
        <label class="modal-label" for="ob-course-search">${obCourseSearchLabel()}</label>
        <div class="course-picker-search"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg><input id="ob-course-search" type="text" placeholder="${obCourseSearchPlaceholder()}" maxlength="${NOMBRE_MAX}" autocomplete="off" autocapitalize="none"/></div>
        <div id="ob-course-results"></div>
      </div>`}
      <button class="course-picker-manual" type="button" onclick="obToggleManual()">${sinCatalogoVerificado?'Agregar un ramo de mi horario':'¿No aparece? Agregar un ramo a mano'}</button>
      ${obManualOpen?`<div class="course-picker-search" style="margin-top:8px;"><input id="ob-manual-name" type="text" placeholder="Ej.: Electivo de cine" maxlength="${NOMBRE_MAX}" autocomplete="off" aria-describedby="ob-manual-error"/><button type="button" onclick="obAgregarManual()" style="border:0;background:none;color:var(--primary);font:inherit;font-weight:700;">Agregar</button></div><p id="ob-manual-error" role="alert"${obManualError?'':' hidden'} style="margin:6px 0 0;font-size:0.8125rem;color:var(--red);">${esc(obManualError)}</p>`:''}
    </div>`;
  const search=document.getElementById('ob-course-search');
  if(search){const pintar=()=>renderObCourseResults(search.value);search.addEventListener('input',pintar);pintar();}
  const manual=document.getElementById('ob-manual-name');
  if(manual){
    manual.addEventListener('keydown',e=>{if(e.key==='Enter')obAgregarManual();});
    manual.addEventListener('input',()=>{
      if(!obManualError)return;
      obManualError='';manual.removeAttribute('aria-invalid');
      const error=document.getElementById('ob-manual-error');
      if(error){error.textContent='';error.hidden=true;}
    });
  }
}
function renderObCourseResults(q){
  const box=document.getElementById('ob-course-results');if(!box)return;
  const term=(q||'').trim();if(!term){box.innerHTML='';return;}
  const repintar=()=>{
    const input=document.getElementById('ob-course-search');
    if(input&&input.value===q)renderObCourseResults(q);
  };
  repintarAlCargarMallas(selectedTenant,repintar);
  repintarAlCargarCursosUC(selectedTenant,repintar,term,selectedCarrera);
  const res=searchCatalog(term,selectedTenant,selectedCarrera,selectedSem).slice(0,6);
  if(!res.length){
    box.innerHTML=`<p class="course-picker-reassurance">${catalogoUcEnCamino(selectedTenant)
      ?'Buscando en el catálogo de la UC…'
      :'No aparece en tu malla. Puedes agregarlo a mano.'}</p>`;
    return;
  }
  box.innerHTML=res.map(r=>{
    const tengo=obTieneRamo(r.nombre,r.sigla),otro=r.semestre>0&&r.semestre!==selectedSem;
    return `<button class="course-picker-result" type="button" ${tengo?'disabled':`onclick="obAgregarCatalogoCodificado('${obCodificarNombre(r.nombre)}','${obCodificarNombre(r.sigla||'')}')"`}>
      <span class="course-picker-result-info"><span class="course-picker-result-name">${esc(r.nombre)}</span><span class="course-picker-result-meta">${obCatalogMeta(r)}</span></span>
      <span class="chevron-r">${tengo?'✓':'+'}</span>
    </button>${otro?'<p class="course-picker-reassurance">Que sea de otro semestre está bien.</p>':''}`;
  }).join('');
}

// Un evento por paso ALCANZADO. Sin esto solo se sabe cuántos terminaron, no
// dónde se fue el que no terminó — y "se aburrió eligiendo carrera" y "no
// encontró sus ramos" se arreglan distinto.
