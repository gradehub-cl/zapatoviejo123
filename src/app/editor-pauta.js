
// ─── PAUTA MANUAL ───────────────────────────────────────────────────────────
// El borrador vive solo mientras el modal está abierto: cancelar no toca la
// pauta real. Los pesos pueden quedar incompletos porque en semana 1 muchas
// veces todavía no está toda la información.
let pautaDraft=[];
// Evaluaciones con notas que la persona decidió quitar en el editor: {id, hacia}.
// `hacia` es otra evaluación con el mismo nombre, a la que pasan sus notas.
let pautaQuitadas=[];
let pautaDraftError='',pautaDraftErrorIndex=null,pautaDraftErrorTarget='';
// Se abrió desde "Armar mi pauta" (el ramo no tenía evaluaciones): el título
// dice eso y no "Editar evaluaciones", que es lo que dice el botón con pauta.
let pautaArmando=false;
// Los requisitos del programa se conservan. El editor solo escribe los suyos.
function reglasEvaluacionEditor(r,cat){
  const gates=(r.gates||[]).filter(g=>g.type==='min_grade_required'&&g.catId===cat.id);
  const propia=gates.find(g=>g.origen==='editor');
  return {descarte:cat.descarteOrigen==='editor'?String(cat.dropLowest?.count||''):'',
    min:propia?String(propia.min).replace('.',','):'',tope:propia?String(propia.cap).replace('.',','):'',
    descartePrograma:!!cat.dropLowest&&cat.descarteOrigen!=='editor',minimoPrograma:gates.some(g=>g.origen!=='editor')};
}
function validarReglasEvaluacionEditor(reglas,varias,cantidad,escala){
  const descarte=String(reglas.descarte||'').trim();
  const min=String(reglas.min||'').trim(),tope=String(reglas.tope||'').trim();
  const n=Number(descarte);
  if(descarte&&(!/^\d+$/.test(descarte)||n<1||n>99))
    return {campo:'descarte',error:'Escribe entre 1 y 99 notas para descartar, o deja el campo vacío.'};
  if(descarte&&(!varias||(cantidad&&n>=cantidad)))
    return {campo:'descarte',error:'Deja al menos una nota que cuente, o quita el descarte para guardar.'};
  if(min||tope){
    for(const [campo,valor] of [['min',min],['tope',tope]]){
      const nota=Number(valor.replace(',','.'));
      if(!/^\d+(?:[.,]\d{1,2})?$/.test(valor)||nota<escala.min||nota>escala.max)
        return {campo,error:`Escribe ${campo==='min'?'un mínimo':'un tope'} entre ${escala.min} y ${escala.max}.`};
    }
  }
  return {count:descarte?n:null,min:min?Number(min.replace(',','.')):null,cap:tope?Number(tope.replace(',','.')):null};
}
function guardarReglasEvaluacionEditor(r,cat,reglas){
  if(reglas.count!==null){
    cat.dropLowest={count:reglas.count};cat.descarteOrigen='editor';
  }else if(cat.descarteOrigen==='editor'){
    delete cat.dropLowest;delete cat.descarteOrigen;
  }
  const gates=r.gates||[];
  const anterior=gates.find(g=>g.type==='min_grade_required'&&g.origen==='editor'&&g.catId===cat.id);
  if(!anterior?reglas.min===null:anterior.min===reglas.min&&anterior.cap===reglas.cap)return;
  r.gates=gates.filter(g=>g!==anterior);
  if(reglas.min!==null)r.gates.push({type:'min_grade_required',catId:cat.id,min:reglas.min,cap:reglas.cap,origen:'editor'});
}
function reglasEvaluacionEditorHTML({reglas={},varias,manual,abierto,id,permiteCambiarVarias=false,oninput='',invalido=()=>''}){
  const campo=(clave,etiqueta,modo)=>`<label><span>${etiqueta}</span><input type="text" inputmode="${modo}" maxlength="5"
    id="${id(clave)}" value="${esc(reglas[clave]||'')}"${oninput?` oninput="${oninput(clave)}"`:''}${invalido(clave)}></label>`;
  return `<details class="editor-reglas"${abierto?' open':''}>
    <summary>Reglas de esta evaluación</summary>
    <div class="editor-reglas-campos">
      ${reglas.descartePrograma?'<p>El programa ya indica el descarte.</p>':varias||reglas.descarte||permiteCambiarVarias?
        `<div class="editor-reglas-descarte${!varias&&!reglas.descarte?' editor-reglas-al-marcar-varias':''}">`+campo('descarte','Cantidad de notas que se pueden borrar','numeric')+
        `<small>${manual?'Tú eliges qué notas borrar.':'Se descartan las más bajas y siempre queda al menos una nota que cuenta.'}</small></div>`:''}
      ${reglas.minimoPrograma?'<p>El programa ya indica el mínimo de esta evaluación.</p>':
        campo('min','Nota mínima','decimal')+campo('tope','Tope de la nota final','decimal')+
        '<small>Si quedas bajo el mínimo, tu nota final no supera este tope. Deja ambos campos vacíos si no aplica.</small>'}
    </div>
  </details>`;
}
function openPautaManualModal(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  // Además de normalizar al cargar, el editor tolera un ramo legado incompleto.
  // Es el camino mayoritario: los ramos sin preset parten sin evaluaciones.
  if(!Array.isArray(r.categorias))r.categorias=[];
  pautaDraft=r.categorias.map(c=>({id:c.id,nombre:c.nombre,peso:Number(c.peso)||0,tieneNotas:(c.notas||[]).length>0,varias:c.directNota===false||(Number.isInteger(c.slots)&&c.slots>1),cantidad:Number.isInteger(c.slots)&&c.slots>1?c.slots:null,reglas:reglasEvaluacionEditor(r,c)}));
  pautaDraftError='';pautaDraftErrorIndex=null;pautaDraftErrorTarget='';pautaQuitadas=[];
  pautaArmando=!r.categorias.some(c=>String(c.nombre||'').trim());
  if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});
  renderPautaManualModal();openModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-nombre-0');if(i)i.focus();},100);
}
function pautaResumen(){
  const e=estadoPauta(pautaDraft);
  if(e.lista)return`✓ ${r2(e.total)} / 100% · pauta lista`;
  return e.diferencia>0?`${r2(e.total)} / 100% · faltan ${r2(e.diferencia)}%`:`${r2(e.total)} / 100% · te pasas por ${r2(Math.abs(e.diferencia))}%`;
}
// Las plantillas solo ahorran escribir nombres. Jamás sugieren pesos: cada
// estudiante debe confirmarlos contra el programa de su propio curso.
function plantillaPauta(tipo){
  const estructuras={
    'tres-solemnes':['Solemne 1','Solemne 2','Solemne 3','Examen'],
    'tres-pruebas':['Prueba 1','Prueba 2','Prueba 3','Examen'],
    'dos-pruebas':['Prueba 1','Prueba 2','Examen'],
    // Cálculo I, Álgebra Lineal y Cálculo II comparten esta forma. El
    // laboratorio sigue siendo un grupo de tres notas: repetirlo como tres
    // evaluaciones inventaría cómo se reparte su peso.
    'tres-interrogaciones-lab':['Interrogación 1','Interrogación 2','Interrogación 3',{nombre:'Laboratorio',varias:true,cantidad:3},'Examen'],
    // Introducción a la Programación combina evaluaciones grandes, tareas y
    // participación. Es una estructura para partir, no una pauta del curso.
    'dos-interrogaciones-tareas-participacion':['Interrogación 1','Interrogación 2',{nombre:'Tareas',varias:true,cantidad:3},'Participación','Examen'],
  };
  return (estructuras[tipo]||[]).map(fila=>{
    const def=typeof fila==='string'?{nombre:fila}:fila;
    return {id:null,nombre:def.nombre,peso:0,tieneNotas:false,varias:false,cantidad:null,...def};
  });
}
// Derecho UC usa «Solemne» en sus programas y calendario de evaluaciones.
// La carrera guardada puede ser el código de malla o el nombre declarado.
function esDerechoUC(tenant,carrera){return tenant==='uc'&&(carrera==='UC-DERECHO'||carrera==='Derecho');}
// Solo alimenta el placeholder del campo: no arma ninguna estructura.
function ejemploEvaluacion(tenant,carrera){
  return esDerechoUC(tenant,carrera)||tenant==='fen'||tenant==='uai'?'Solemne':'Prueba';
}

// Plantillas de estructura, POR TENANT — y FEN no tiene.
//
// El plan común de Ingeniería UC sí tiene una forma estable: tres
// interrogaciones y un examen, y así están sus cuatro presets. Ahí la plantilla
// ahorra tipeo real.
//
// En FEN no existe esa forma. De los diez programas oficiales transcritos, cada
// uno mezcla distinto solemnes, controles de lectura, controles de ejercicios,
// controles sorpresa, trabajos grupales y participación — y ninguno es "3
// solemnes + examen". Ofrecer esa plantilla empujaba a la mayoría a una
// estructura que después tenían que deshacer a mano.
function plantillasPauta(tenant,carrera){
  // Las plantillas UC conocidas vienen de Ingeniería. No hay una estructura
  // común verificada para Derecho: se deja escribir la pauta de cada curso.
  if(esDerechoUC(tenant,carrera))return [];
  return tenant==='uc'
    ?[
      {tipo:'tres-pruebas',label:'3 pruebas + examen'},
      {tipo:'dos-pruebas',label:'2 pruebas + examen'},
      {tipo:'tres-interrogaciones-lab',label:'3 interrogaciones + laboratorio (3) + examen'},
      {tipo:'dos-interrogaciones-tareas-participacion',label:'2 interrogaciones + tareas (3) + participación + examen'},
    ]
    :[];
}
// Son atajos de escritura, no una pauta sugerida: el estudiante elige el
// nombre y siempre define sus propios pesos. Dentro de la UC, Derecho usa
// «Solemne» y el resto conserva las sugerencias de prueba/interrogación.
// Tres vocabularios, no dos. El tercero es el que faltaba: para una
// universidad que no conocemos NO se puede elegir entre el de la FEN y el de
// la UC — hay que no usar ninguno. Antes el default era el de FEN, así que a
// cualquier universidad nueva le habrían aparecido "Solemne 1, Solemne 2", que
// es la señal más rápida de que la app no es para ti.
//
// El neutro usa solo nombres que no pertenecen a una institución: nada de
// "Solemne" (FEN) ni de "Interrogación" (UC).
function sugerenciasEvaluacion(tenant,carrera){
  const comunes=['Laboratorio','Informe','Taller','Proyecto','Tarea','Presentación','Examen'];
  if(esDerechoUC(tenant,carrera))return ['Solemne','Control de lectura','Prueba','Control','Trabajo',...comunes];
  if(tenant==='uc')return ['Interrogación 1','Interrogación 2','Interrogación 3','Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3',...comunes];
  if(tenant==='fen')return ['Solemne 1','Solemne 2','Solemne 3','Control 1','Control 2','Control 3','Prueba sorpresa','Casos y ensayos','Trabajo individual','Trabajo en grupo','Participación',...comunes];
  // La UAI usa las dos palabras, y eso no es una suposición: sale de sus
  // programas. Management 2026-2 dice "tres pruebas solemnes"; Matemáticas
  // Avanzadas II dice "pruebas de cátedra" y "controles"; Razonamiento
  // Cuantitativo con Datos II dice "pruebas" y "laboratorios"; Civilización
  // Contemporánea II dice "evaluaciones de lectura" y "ensayo".
  //
  // Hasta ahora caía en la lista neutra de abajo y nunca le ofrecía "Solemne",
  // que es como se llaman sus evaluaciones más grandes. Lo que NO lleva es
  // "Interrogación": ninguno de sus programas la usa, esa es de la UC.
  if(tenant==='uai')return ['Solemne 1','Solemne 2','Solemne 3','Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3','Control de lectura','Trabajo grupal',...comunes];
  // La UAndes dice "prueba" y "examen" en todas sus normativas, y nunca
  // "solemne". Lo demás también sale de documentos suyos: "controles de
  // lectura" (Reglamento del Alumno, art. 20, y el catálogo de Teología III),
  // "certámenes" (normativa de Kinesiología), "ensayo" y "trabajo escrito"
  // (catálogo de Teología III). "Interrogaciones orales" aparece una sola vez,
  // como ejemplo en el reglamento, y "Interrogación" es la señal de la UC: no va.
  if(tenant==='uandes')return ['Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3','Control de lectura','Certamen','Ensayo','Trabajo escrito',...comunes];
  return ['Prueba 1','Prueba 2','Prueba 3','Control 1','Control 2','Control 3',...comunes];
}
function opcionesSugerenciasEvaluacion(tenant,carrera){
  return sugerenciasEvaluacion(tenant,carrera).map(nombre=>`<option value="${esc(nombre)}"></option>`).join('');
}
function puedeUsarPlantillaPauta(){
  return pautaDraft.every(fila=>!fila.tieneNotas&&!fila.nombre.trim());
}
function aplicarPlantillaPauta(tipo){
  pautaDraft=plantillaPauta(tipo);if(!pautaDraft.length)return;
  renderPautaManualModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-peso-0');if(i)i.focus();},0);
}
// Una pauta de otro ramo sirve de referencia, no de copia de datos: se llevan
// solo los nombres y porcentajes, nunca notas, fechas, IDs ni reglas.
function ramosParaDuplicarPauta(ramos,ramoActualId){
  return (ramos||[]).filter(r=>r.id!==ramoActualId&&(r.categorias||[]).some(c=>String(c.nombre||'').trim()))
    .map(r=>({id:r.id,nombre:r.nombre,cantidad:r.categorias.filter(c=>String(c.nombre||'').trim()).length}));
}
function pautaDuplicada(ramo){
  return ((ramo&&ramo.categorias)||[]).filter(c=>String(c.nombre||'').trim())
    .map(c=>({id:null,nombre:String(c.nombre).trim(),peso:Number(c.peso)||0,tieneNotas:false,varias:c.directNota===false||(Number.isInteger(c.slots)&&c.slots>1),cantidad:Number.isInteger(c.slots)&&c.slots>1?c.slots:null}));
}
function textoConfirmarPautaDuplicada(origen,copia){
  const cantidad=copia.length;
  return `Vas a copiar ${cantidad} evaluaci${cantidad===1?'ón':'ones'} y sus porcentajes desde ${origen.nombre}. No se copian notas ni fechas. Podrás ajustarla antes de guardar.`;
}
function duplicarPautaDesdeRamo(){
  const selector=document.getElementById('m-pauta-origen')||{};
  const origenId=selector.value;
  // Si cancela la confirmación, el selector no se queda mostrando ese ramo.
  if(origenId)selector.value='';
  const origen=S.ramos.find(r=>r.id===origenId);const copia=pautaDuplicada(origen);
  if(!copia.length){showToast('Elige un ramo con evaluaciones',true);return;}
  showConfirm(`Usar la pauta de ${origen.nombre}`,textoConfirmarPautaDuplicada(origen,copia),()=>{
    pautaDraft=copia;renderPautaManualModal();
    setTimeout(()=>{const i=document.getElementById('m-pauta-peso-0');if(i)i.focus();},0);
  },{label:'Usar pauta'});
}
function renderPautaManualModal(){
  const fuentes=puedeUsarPlantillaPauta()?ramosParaDuplicarPauta(S.ramos,currentRamoId):[];
  const carrera=S.carrera||S.carreraNombre;
  const ejemplo=ejemploEvaluacion(S.tenant,carrera);
  const sugerencias=opcionesSugerenciasEvaluacion(S.tenant,carrera);
  const disponibles=plantillasPauta(S.tenant,carrera);
  const plantillas=(puedeUsarPlantillaPauta()&&disponibles.length)?`<div class="pauta-plantillas">
    <div class="pauta-plantillas-titulo">Parte con una estructura</div>
    <div class="pauta-plantillas-opciones">${disponibles.map(p=>`<button type="button" onclick="aplicarPlantillaPauta('${p.tipo}')">${p.label}</button>`).join('')}</div>
    <div class="pauta-plantillas-nota">Los pesos quedan en 0%. Confírmalos con el programa del curso.</div>
  </div>`:'';
  // Elegir un ramo ya pide confirmación (duplicarPautaDesdeRamo): sin botón aparte.
  const duplicar=fuentes.length?`<label class="pauta-copiar"><span>Copiar de otro ramo</span>
    <select id="m-pauta-origen" onchange="duplicarPautaDesdeRamo()"><option value="">Elegir</option>${fuentes.map(r=>`<option value="${esc(r.id)}">${esc(r.nombre)} · ${r.cantidad} evaluaci${r.cantidad===1?'ón':'ones'}</option>`).join('')}</select></label>`:'';
  // Una sola fila vacía no tiene nada que quitar ni marcar.
  const unaVacia=pautaDraft.length===1&&!pautaDraft[0].nombre.trim()&&!pautaDraft[0].peso;
  const manual=gh_descarteManual(S.ramos.find(r=>r.id===currentRamoId),S.tenant);
  const filas=pautaDraft.map((fila,i)=>{
    // El editor nunca decide un porcentaje. Solo calcula el resto y se lo
    // ofrece a la fila vacía, que la persona elige explícitamente.
    const resto=restoParaPautaFila(i);
    const invalido=t=>pautaDraftErrorIndex===i&&pautaDraftErrorTarget===t?' aria-invalid="true" aria-describedby="m-pauta-error"':'';
    const nombre=esc(fila.nombre||'evaluación');
    const usarResto=!fila.peso&&resto>0?`<button type="button" class="pauta-resto" onclick="usarRestoPauta(${i})">Usar ${r2(resto)}%</button>`:'';
    const cantidad=fila.varias?`<label class="pauta-cantidad">Varias notas · esperas <input type="text" inputmode="numeric" id="m-pauta-cantidad-${i}" value="${fila.cantidad||''}" placeholder="—" maxlength="3"${invalido('cantidad')} oninput="actualizarPautaCantidad(${i},this.value)" aria-label="Cantidad esperada de notas para ${nombre}"/></label>`:'';
    const mas=unaVacia?'':`<button type="button" class="pauta-mas" id="m-pauta-quitar-${i}" onclick="abrirMenuPautaFila(this,${i})" aria-haspopup="menu" aria-expanded="false" aria-label="Opciones de ${nombre}"${invalido('quitar')}><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg></button>`;
    return `
    <div class="pauta-fila">
      <div class="pauta-fila-main">
        <input type="text" class="pauta-nombre" id="m-pauta-nombre-${i}" value="${esc(fila.nombre)}" placeholder="Ej: ${ejemplo} ${i+1}" maxlength="${NOMBRE_MAX}" list="m-pauta-sugerencias" autocomplete="off" oninput="actualizarPautaNombre(${i},this.value)" onkeydown="pautaTecla(event,${i},'nombre')" aria-label="Nombre de la evaluación"${invalido('nombre')}/>
        <label class="pauta-peso"><input type="text" inputmode="decimal" id="m-pauta-peso-${i}" value="${fila.peso?r2(fila.peso):''}" placeholder="0" maxlength="6" oninput="actualizarPautaPeso(${i},this.value)" onkeydown="pautaTecla(event,${i},'peso')" aria-label="Peso de ${nombre}"${invalido('peso')}/><span aria-hidden="true">%</span></label>
        ${mas}
      </div>${cantidad||usarResto?`
      <div class="pauta-fila-extra">${cantidad}${usarResto}</div>`:''}
      ${reglasEvaluacionEditorHTML({reglas:fila.reglas,varias:fila.varias,manual,
        abierto:pautaDraftErrorIndex===i&&['descarte','min','tope'].includes(pautaDraftErrorTarget),
        id:clave=>`m-pauta-${clave}-${i}`,oninput:clave=>`actualizarReglaPauta(${i},'${clave}',this.value)`,invalido})}
    </div>`;
  }).join('');
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">${pautaArmando?'Armar mi pauta':'Editar evaluaciones'}</div>
    <p class="pauta-intro">Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas.</p>
    ${plantillas}
    ${duplicar}
    <datalist id="m-pauta-sugerencias">${sugerencias}</datalist>
    <div class="pauta-total" id="m-pauta-total">${totalPautaHTML()}</div>
    <p id="m-pauta-error" role="alert"${pautaDraftError?'':' hidden'}>${esc(pautaDraftError)}</p>
    <div class="pauta-lista">${filas}
      <button type="button" class="pauta-agregar" onclick="agregarPautaFila()"><span aria-hidden="true">+</span> Agregar evaluación</button>
    </div>
    <div class="modal-btns" style="margin-top:14px;">
      <button class="btn-cancel" onclick="closeModal()">Cancelar</button>
      <button class="btn-confirm" onclick="guardarPautaManual()">Guardar</button>
    </div>`;
}
// El total con su barra. La barra es neutra a propósito: el semáforo es de las
// notas, no de cuánto porcentaje lleva escrito la pauta.
function totalPautaHTML(){
  const e=estadoPauta(pautaDraft);
  const avance=Math.min(Math.max(e.total/100,0),1);
  return `<div class="pauta-total-texto${e.lista?' lista':''}" aria-live="polite">${pautaResumen()}</div><div class="pauta-total-barra" aria-hidden="true"><i style="transform:scaleX(${avance.toFixed(3)})"></i></div>`;
}
// "⋯" de cada evaluación: marcar que se promedian varias notas y quitarla.
function abrirMenuPautaFila(boton,i){
  const fila=pautaDraft[i];if(!fila)return;
  abrirMenu(boton,[
    {texto:'Varias notas',marcado:!!fila.varias,accion:()=>actualizarPautaVarias(i,!fila.varias)},
    'sep',
    {texto:'Quitar evaluación',peligro:true,accion:()=>quitarPautaFila(i)}
  ]);
}
function limpiarErrorPauta(){
  pautaDraftError='';pautaDraftErrorIndex=null;pautaDraftErrorTarget='';
  const error=document.getElementById('m-pauta-error');if(error){error.textContent='';error.hidden=true;}
}
function mostrarErrorPauta(i,mensaje,target){
  pautaDraftError=mensaje;pautaDraftErrorIndex=i;pautaDraftErrorTarget=target;
  renderPautaManualModal();
  setTimeout(()=>{const control=document.getElementById(`m-pauta-${target}-${i}`);if(control)control.focus();},0);
}
function actualizarReglaPauta(i,clave,valor){
  limpiarErrorPauta();
  if(pautaDraft[i])(pautaDraft[i].reglas??={})[clave]=valor;
}
function actualizarPautaNombre(i,valor){limpiarErrorPauta();if(pautaDraft[i])pautaDraft[i].nombre=valor;}
function actualizarPautaVarias(i,valor){
  if(!pautaDraft[i])return;
  pautaDraft[i].varias=!!valor;
  if(!valor)pautaDraft[i].cantidad=null;
  renderPautaManualModal();
}
function actualizarPautaCantidad(i,valor){
  if(!pautaDraft[i])return;
  const limpio=String(valor||'').replace(/[^0-9]/g,'');
  const cantidad=Math.min(100,parseInt(limpio,10)||0);
  pautaDraft[i].cantidad=cantidad>=2?cantidad:null;
  const input=document.getElementById('m-pauta-cantidad-'+i);if(input&&input.value!==limpio)input.value=limpio;
}
function restoParaPautaFila(i){
  const usado=pautaDraft.reduce((s,f,j)=>s+(j===i?0:(Number(f.peso)||0)),0);
  return r2(Math.max(0,100-usado));
}
function usarRestoPauta(i){
  if(!pautaDraft[i])return false;
  const resto=restoParaPautaFila(i);if(resto<=0){mostrarErrorPauta(i,'No queda porcentaje libre para repartir en esta evaluación.','peso');return false;}
  limpiarErrorPauta();
  pautaDraft[i].peso=resto;
  renderPautaManualModal();
  setTimeout(()=>{const input=document.getElementById('m-pauta-peso-'+i);if(input)input.focus();},0);
}
function actualizarPautaPeso(i,valor){
  limpiarErrorPauta();
  if(!pautaDraft[i])return;
  const crudo=String(valor||'').replace(',','.').replace(/[^0-9.]/g,'');
  const partes=crudo.split('.');
  const limpio=partes[0]+(partes.length>1?'.'+partes.slice(1).join('').slice(0,2):'');
  const peso=Math.min(100,Number(limpio)||0);
  pautaDraft[i].peso=peso;
  const input=document.getElementById('m-pauta-peso-'+i);if(input&&input.value!==limpio)input.value=limpio;
  const total=document.getElementById('m-pauta-total');if(total)total.innerHTML=totalPautaHTML();
}
function agregarPautaFila(){
  pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});renderPautaManualModal();
  setTimeout(()=>{const i=document.getElementById('m-pauta-nombre-'+(pautaDraft.length-1));if(i)i.focus();},0);
}
function quitarPautaFila(i){
  if(!pautaDraft[i])return false;
  if(pautaDraft[i].tieneNotas)return quitarPautaFilaConNotas(i);
  const nombre=String(pautaDraft[i].nombre||'').trim();
  showConfirm(nombre?`¿Quitar "${nombre}"?`:'¿Quitar esta evaluación?',
    'Se quitará de esta pauta. Puedes volver a agregarla antes de guardar.',()=>{
      limpiarErrorPauta();
      const totalAntes=pautaDraft.reduce((s,f)=>s+(Number(f.peso)||0),0);
      pautaDraft.splice(i,1);
      repartirPesoRestante(pautaDraft,totalAntes);
      if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});renderPautaManualModal();
    },{label:'Quitar evaluación',focusCancel:true});
  return true;
}
function pautaTecla(e,i,campo){
  if(e.key!=='Enter')return;e.preventDefault();
  if(campo==='nombre'){const p=document.getElementById('m-pauta-peso-'+i);if(p)p.focus();return;}
  const siguiente=document.getElementById('m-pauta-nombre-'+(i+1));
  if(siguiente)siguiente.focus();else agregarPautaFila();
}
function ofrecerCompartirPauta(r){
  showConfirm('¿Compartir esta pauta?',
    `Vas a revisar los nombres y porcentajes de ${r.nombre} antes de enviarlos. Si otras personas coinciden, puede ayudar a quienes toman el mismo ramo. Nunca tus notas ni fechas.`,
    ()=>openReportModal(r.id),
    {label:'Revisar antes de enviar',danger:false,focusCancel:true});
}
// Un grupo de casillas vacío se dibuja cerrado (render-main.js), y eso está
// bien para una pauta del catálogo con muchos grupos. Pero quien acaba de
// marcar "varias" en su propia pauta esperaba ver dónde poner las notas: tres
// reportes (2026-08-29/30) decían que las evaluaciones "desaparecían" al
// marcarlo y "volvían" al desmarcarlo. Se abre solo el grupo que se armó recién.
function abrirGrupoVacio(cat){
  if(cat&&Number.isInteger(cat.slots)&&cat.slots>1&&!(cat.notas||[]).length)openCats[cat.id]=true;
}
// Quitar una evaluación que ya tiene notas. Si hay otra con el mismo nombre (una
// evaluación repetida), sus notas pasan a esa y no se pierde nada. Si no, se
// borran con ella, y por eso se pide confirmar como una acción destructiva.
function quitarPautaFilaConNotas(i){
  const r=S.ramos.find(x=>x.id===currentRamoId);const fila=pautaDraft[i];
  const cat=r&&(r.categorias||[]).find(c=>c.id===fila.id);if(!cat)return false;
  const nombre=String(fila.nombre||cat.nombre||'').trim();
  const gemela=pautaDraft.find((f,j)=>j!==i&&f.id&&normName(f.nombre)===normName(nombre));
  const n=(cat.notas||[]).filter(x=>typeof x.valor==='number').length;
  const desc=gemela
    ?`Hay otra evaluación llamada "${nombre}": sus notas quedan en esa y no se pierde ninguna.`
    :`Se ${n===1?'borra su nota':`borran sus ${n} notas`} al guardar. No se puede deshacer.`;
  showConfirm(`¿Quitar "${nombre}"?`,desc,()=>{
    limpiarErrorPauta();
    pautaQuitadas.push({id:fila.id,hacia:gemela?gemela.id:null});
    const totalAntes=pautaDraft.reduce((s,f)=>s+(Number(f.peso)||0),0);
    pautaDraft.splice(i,1);
    // Una repetida no deja porcentaje que repartir: la otra ya lo tiene.
    if(!gemela)repartirPesoRestante(pautaDraft,totalAntes);
    if(!pautaDraft.length)pautaDraft.push({id:null,nombre:'',peso:0,tieneNotas:false,varias:false,cantidad:null});
    renderPautaManualModal();
  },{label:gemela?'Quitar repetida':'Quitar y borrar notas',danger:!gemela,focusCancel:true});
  return true;
}
function guardarPautaManual(){
  const r=S.ramos.find(x=>x.id===currentRamoId);if(!r)return;
  const estabaVacia=!(r.categorias||[]).some(c=>String(c.nombre||'').trim());
  const filas=pautaDraft.filter(f=>f.nombre.trim());
  const escala=gh_reglasNota(r.origen?.tenant||S.tenant).grade_scale;
  const reglas=new Map();
  for(const fila of pautaDraft){
    if(!fila.nombre.trim()){
      if(['descarte','min','tope'].some(campo=>fila.reglas?.[campo]?.trim()))
        return mostrarErrorPauta(pautaDraft.indexOf(fila),'Escribe el nombre de la evaluación que lleva la regla.','nombre');
      continue;
    }
    const anterior=r.categorias.find(c=>c.id===fila.id);
    if(anterior&&fila.cantidad&&fila.cantidad<anterior.slots&&(anterior.notas||[]).some(n=>Number.isInteger(n.slot)&&n.slot>=fila.cantidad))
      return mostrarErrorPauta(pautaDraft.indexOf(fila),'Hay notas guardadas en las casillas que quieres quitar.','cantidad');
    const varias=fila.varias||(anterior?.notas||[]).length>1;
    const cambios=validarReglasEvaluacionEditor(fila.reglas||{},varias,fila.cantidad,escala);
    if(cambios.error)return mostrarErrorPauta(pautaDraft.indexOf(fila),cambios.error,cambios.campo);
    if(fila.reglas?.descartePrograma&&fila.cantidad&&fila.cantidad<=anterior.dropLowest.count&&fila.cantidad!==anterior.slots)
      return mostrarErrorPauta(pautaDraft.indexOf(fila),'La cantidad de notas tiene que superar el descarte del programa.','cantidad');
    reglas.set(fila,cambios);
  }
  const ids=new Set(filas.filter(f=>f.id).map(f=>f.id));
  // Las que la persona quitó con notas: pasan a su gemela o se van.
  const quitadas=new Set();
  pautaQuitadas.forEach(q=>{
    const cat=r.categorias.find(c=>c.id===q.id);if(!cat||ids.has(q.id))return;
    const destino=q.hacia&&r.categorias.find(c=>c.id===q.hacia);
    if(destino){
      const ya=new Set((destino.notas||[]).map(x=>x.id));
      destino.notas=[...(destino.notas||[]),...(cat.notas||[]).filter(x=>!ya.has(x.id))];
    }
    quitadas.add(q.id);
    // Sus reglas (un mínimo, un grupo) pasan a la gemela; sin gemela se van.
    r.gates=destino?unificarCategoriaEnReglas(r.gates,q.id,destino.id)
      :(r.gates||[]).filter(g=>g.catId!==q.id).map(g=>Array.isArray(g.catIds)?{...g,catIds:g.catIds.filter(id=>id!==q.id)}:g);
  });
  pautaQuitadas=[];
  r.categorias=r.categorias.filter(c=>!quitadas.has(c.id)&&(ids.has(c.id)||(c.notas||[]).length>0));
  filas.forEach(f=>{
    const existente=f.id&&r.categorias.find(c=>c.id===f.id);
    const cantidadFija=f.varias&&Number.isInteger(f.cantidad)&&f.cantidad>1;
    // Pasar a fila simple una que ya tiene dos o más notas escondería todas
    // menos la primera, así que ahí se respeta lo que hay. Es la misma regla
    // que aplica normalize() al abrir la app.
    if(existente){
      guardarReglasEvaluacionEditor(r,existente,reglas.get(f));
      existente.nombre=f.nombre.trim();existente.peso=f.peso;
      if(f.varias){
        // Cantidad declarada = casillas que la ficha puede mostrar y recorrer.
        // Sin cantidad, sigue siendo una lista abierta: no inventamos cuántos
        // controles habrá durante el semestre.
        existente.directNota=cantidadFija;
        if(cantidadFija)existente.slots=f.cantidad;
        else delete existente.slots;
        abrirGrupoVacio(existente);
      }
      else if((existente.notas||[]).length<=1){existente.directNota=true;delete existente.slots;}
    }
    else{
      const cat={id:uid(),nombre:f.nombre.trim(),peso:f.peso,ponderaNotas:false,directNota:!f.varias||cantidadFija,notas:[]};
      if(cantidadFija)cat.slots=f.cantidad;
      r.categorias.push(cat);
      guardarReglasEvaluacionEditor(r,cat,reglas.get(f));
      abrirGrupoVacio(cat);
    }
  });
  const vigentes=new Set(r.categorias.map(c=>c.id));
  if(r.gates?.some(g=>g.origen==='editor'&&!vigentes.has(g.catId)))
    r.gates=r.gates.filter(g=>g.origen!=='editor'||vigentes.has(g.catId));
  const estado=estadoPauta(r.categorias);save();track('configurar_pauta',{evaluaciones:filas.length,total:estado.total});closeModal();renderRamo();
  showToast(estado.lista?'✓ Listo, ya suma 100%':'Guardado · puedes completar el resto después');
  // Se ofrece una sola vez, al pasar de sin pauta a pauta completa. Si la
  // persona prefiere no compartirla, el enlace de reporte queda disponible en
  // la ficha; no se le vuelve a interrumpir cada vez que corrige un porcentaje.
  if(estabaVacia&&estado.lista&&!pautaConReglasNoCompartibles(r)&&pautaCatalogoSinOficial(r))setTimeout(()=>ofrecerCompartirPauta(r),160);
}
function abrirPautaDesdeNota(){closeModal();setTimeout(openPautaManualModal,120);}
