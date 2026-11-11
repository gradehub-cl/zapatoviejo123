function obTrackPaso(){
  if(obPasosVistos.has(obStep))return;
  obPasosVistos.add(obStep);
  track('onboarding_step',{paso:obStep,etapa:OB_ETAPAS[obStep]});
}
// Entrar al onboarding reinicia el embudo: si alguien cierra sesión y entra con
// otra cuenta sin recargar, su paso 1 tiene que volver a contarse.
// El paso 2 pregunta dónde estudias, así que empieza sin respuesta. `selectedTenant`
// nace en 'fen' porque la app tiene que pintarse de algo antes de saber quién eres,
// pero heredar ese default como si el estudiante lo hubiera elegido dejaba
// "Continuar" habilitado sin decidir nada: quien no se fijaba avanzaba a las
// carreras de FEN, donde la primera opción es "Ingeniería Comercial", y se llevaba
// la malla de otra universidad. `obStepValid(2)` ya exige un tenant; lo que faltaba
// era no dárselo puesto.
function obIniciar(){
  obStep=1;obPasosVistos.clear();selectedTenant=null;obEnviandoProfesor=false;
  ['ob-prof-nombre','ob-prof-presentacion'].forEach(id=>{const c=document.getElementById(id);if(c)c.value='';});
  const mayor=document.getElementById('ob-prof-mayor');if(mayor)mayor.checked=false;
  const error=document.getElementById('ob-prof-error');if(error)error.textContent='';
  elegirTipoCuenta(typeof consumirEntradaProfesor==='function'&&consumirEntradaProfesor()?'profesor':'estudiante');
  montarRuletasOnboarding();renderTenantPick();obRender();checkOb();
}

function obRender(){
  // Cuántos semestres ofrecer depende de la malla, que puede venir en un
  // archivo diferido: se pide acá y el selector se repinta cuando llega.
  // La generación y el semestre están en el paso 1; el profesor no los ve.
  const estudio=document.getElementById('ob-estudio');
  if(estudio)estudio.hidden=obTipo==='profesor';
  if(obStep===1&&obTipo!=='profesor'&&typeof actualizarSemestreCalculado==='function'){actualizarSemestreCalculado();initSemGrid();}
  const alPintar=f=>typeof requestAnimationFrame==='function'?requestAnimationFrame(f):f();
  if(obStep===1&&typeof ruletaGeneracion!=='undefined'&&ruletaGeneracion)alPintar(ruletaGeneracion.sincronizar);
  // Con la carrera ya elegida, el semestre se ajusta a los que tenga antes de
  // sugerir ramos. Si la malla llega después, prepararObRamos repinta y vuelve acá.
  if(obStep===5){if(typeof ajustarSemestreACarrera==='function')ajustarSemestreACarrera();prepararObRamos();}
  // El nombre público parte en el nombre que ya escribió; lo puede cambiar.
  if(obStep===OB_PASO_PROFESOR){
    const publico=document.getElementById('ob-prof-nombre'),nombre=document.getElementById('ob-name');
    if(publico&&nombre&&!publico.value.trim())publico.value=nombre.value.trim();
  }
  obTrackPaso();
  document.querySelectorAll('.ob-step').forEach(el=>{
    el.style.display=(Number(el.dataset.step)===obStep)?'block':'none';
  });
  const bar=document.getElementById('ob-progress-bar');
  if(bar)bar.style.transform='scaleX('+(obProgressPct(obStep)/100)+')';
  const {n,total}=obPosicion(obStep);
  const num=document.querySelector('.ob-step[data-step="'+obStep+'"] .ob-step-num');
  if(num)num.textContent=`Paso ${n} de ${total}`;
  const back=document.getElementById('ob-back');
  // En el primer paso no hay a dónde volver: el mismo botón ofrece salir, para
  // quien entró con la cuenta equivocada o solo estaba mirando (2026-11-03).
  if(back){back.hidden=false;back.textContent=obPasos().indexOf(obStep)>0?'Atrás':'Cerrar sesión';}
  // "tus datos y ramos" es del estudiante: el profesor no carga ramos.
  const nota=document.getElementById('ob-note');
  if(nota)nota.hidden=obTipo==='profesor';
  const next=document.getElementById('ob-next');
  if(next){
    next.textContent=obStep===OB_PASO_PROFESOR?'Enviar postulación':obStep===OB_TOTAL?(obRamos.length?`Continuar con ${obRamos.length} ramo${obRamos.length!==1?'s':''}`:'Continuar sin ramos'):'Continuar';
    next.disabled=obEnviandoProfesor||!obStepValid(obStep);
  }
  // Solo al cambiar de paso: marcar ramos también llama obRender y debe
  // conservar el foco y la posición. El título orienta sin abrir el teclado.
  const screen=document.getElementById('screen-onboard');
  if(screen&&screen.dataset.activeStep!==String(obStep)){
    screen.dataset.activeStep=String(obStep);
    screen.scrollTop=0;
    const wrap=screen.querySelector('.ob-wrap');
    if(wrap)wrap.scrollTop=0;
    const title=screen.querySelector('.ob-step[data-step="'+obStep+'"] .ob-title');
    if(title)title.focus({preventScroll:true});
  }
}

// Avanza y retrocede por los pasos del camino elegido, no de a uno: el
// profesor va del 1 a su paso propio.
function obNext(){
  if(!obStepValid(obStep))return;
  const pasos=obPasos(),i=pasos.indexOf(obStep);
  if(i>=0&&i<pasos.length-1){obStep=pasos[i+1];obRender();}
  else completeOnboarding();
}
function obBack(){
  if(obEnviandoProfesor)return;
  const pasos=obPasos(),i=pasos.indexOf(obStep);
  if(i>0){obStep=pasos[i-1];obRender();}
  else signOut();
}

// checkOb se llama desde los grids y el input: solo refresca el estado del botón
function checkOb(){
  const next=document.getElementById('ob-next');
  if(next)next.disabled=obEnviandoProfesor||!obStepValid(obStep);
}

// Devuelve el PRIMER paso obligatorio que quedó sin responder, o 0 si están
// todos. Es `obStepValid` recorrido entero: lo que habilita cada botón es lo
// mismo que exige el final, por construcción y no por acuerdo.
// Se recorren los pasos del camino elegido; ninguno es el 0, así que 0 sigue
// significando "están todos".
function obPasoIncompleto(){
  for(const paso of obPasos())if(!obStepValid(paso))return paso;
  return 0;
}

function completeOnboarding(){
  const name=document.getElementById('ob-name').value.trim();
  // UNA sola fuente de verdad para "¿se puede seguir?": la misma función que
  // decide si el botón va habilitado. Antes esta guarda derivaba su propia
  // condición y exigía `selectedCarrera` —el código de la malla— mientras el
  // paso 3 se conformaba con la carrera declarada por nombre. Las dos se
  // desincronizaron y dejaron encerradas a 69 de las 71 carreras de la UC: el
  // botón decía "Continuar con N ramos", se apretaba y no pasaba nada.
  //
  // Mientras se pregunte acá lo mismo que se preguntó para habilitar el botón,
  // ese desacuerdo no puede volver a existir. Y si algún día pasa igual, se
  // dice: un paso obligatorio sin responder devuelve a su pantalla en vez de
  // dejar al estudiante apretando un botón muerto.
  const pasoIncompleto=obPasoIncompleto();
  if(pasoIncompleto){
    obStep=pasoIncompleto;obRender();
    showToast('Falta un dato para crear tu cuenta',true);
    return;
  }
  if(obTipo==='profesor'){completarOnboardingProfesor(name);return;}
  S.userName=name;S.careerSemestre=selectedSem;S.generacion=obGeneracion;S.verano=obVerano?{hasta:finDeVerano()}:null;S.carrera=selectedCarrera;S.carreraNombre=selectedCarreraNombre;S.tenant=selectedTenant;
  obRamos.forEach(item=>{
    if(S.ramos.some(r=>normName(r.nombre)===normName(item.nombre)))return;
    const preset=!item.manual?presetRamo(item.nombre,selectedTenant,selectedCarrera):null;
    const creditos=typeof item.creditos==='number'?item.creditos:creditosDe(item.nombre,selectedTenant,preset,item.sigla);
    S.ramos.push({id:uid(),nombre:item.nombre,color:nextRamoColor(item.nombre),origen:item.manual?null:origenActual(item.nombre,item.sigla),creditos,categorias:preset?preset.categorias:[],gates:preset?preset.gates:[],aporta:preset?preset.aporta:null,promedioParcial:preset?preset.promedioParcial:null,recuperativo:preset?preset.recuperativo:null,reglasAusenciaJustificada:preset?preset.reglasAusenciaJustificada:null,bonus:preset?preset.bonus:null,reemplazosOptativos:preset?preset.reemplazosOptativos:null,pautaHuella:preset?huellaPauta(preset.categorias):null});
    consensoAlAgregar(S.ramos[S.ramos.length-1]);
  });
  S.onboardingDone=true;save();
  syncProfile();
  // La declaración de edad (los 14 años del aviso de la entrada) queda anotada
  // con su fecha. Va acá y no en el formulario de correo porque por el
  // onboarding pasan también las cuentas de Google, que nunca vieron ese
  // formulario — y con ellas, la aceptación de los términos.
  registrarDeclaracionEdad({generacion:obGeneracion});
  // `carrera` es un código de una lista cerrada y puede viajar. El nombre
  // declarado NO: es texto escrito por el estudiante y la analítica no recibe
  // texto suyo — lo prohíbe tests/analitica.test.js y lo promete la política.
  // La bandera dice lo único que la analítica necesita: si le pudimos cargar la
  // malla o no. Quién estudia qué se cuenta en la base, no acá.
  track('onboarding_complete',{semestre:selectedSem,carrera:selectedCarrera,con_malla:!!selectedCarrera,ramos:obRamos.length});
  enterApp();
  const oficiales=obRamos.filter(item=>!item.manual&&!!presetRamo(item.nombre,selectedTenant,selectedCarrera)).length;
  mostrarRamosCargados(obRamos.length,oficiales);
}
// La cuenta de profesor queda creada solo si la postulación llegó: sin su
// `tutor_perfiles` sería una cuenta sin nada adentro. Si ya existía (un reintento
// después de un corte), cuenta como enviada.
async function completarOnboardingProfesor(name){
  if(obEnviandoProfesor)return;
  const error=document.getElementById('ob-prof-error'),next=document.getElementById('ob-next');
  const {nombrePublico,presentacion}=datosProfesorOnboarding();
  obEnviandoProfesor=true;
  if(error)error.textContent='';
  if(next){next.disabled=true;next.textContent='Enviando…';}
  let resultado={ok:false,error:'No pudimos enviar tu postulación. Intenta de nuevo.'};
  try{
    resultado=await postularProfesor(nombrePublico,presentacion);
    if(!resultado.ok){
      const previo=await perfilProfesorActual();
      if(previo&&previo.ok&&previo.perfil)resultado={ok:true,perfil:previo.perfil};
    }
  }catch(e){}
  obEnviandoProfesor=false;
  if(!resultado.ok){
    if(error)error.textContent=resultado.error||'No pudimos enviar tu postulación. Intenta de nuevo.';
    obRender();
    return;
  }
  S.userName=name;S.tipoCuenta='profesor';
  S.onboardingDone=true;save();
  syncProfile();
  registrarDeclaracionEdad();
  if(typeof olvidarPerfilProfesor==='function')olvidarPerfilProfesor();
  track('onboarding_complete',{tipo:'profesor'});
  enterApp();
  // Si se recuperó una postulación previa, Clases ya muestra su estado exacto.
  // No se le anuncia como recién recibida si fue rechazada o suspendida.
  if(resultado.perfil?.estado!=='pendiente')return;
  const modal=document.getElementById('modal-content');
  modal.innerHTML=`
    <div class="modal-title">Recibimos tu postulación</div>
    <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0;">Puedes preparar tu anuncio en Clases mientras revisamos tu postulación. Podrás publicarlo cuando quede aprobada.</p>
    <div class="modal-btns"><button class="btn-confirm" onclick="closeModal()">Entendido</button></div>`;
  openModal();
}
// Quien ya pasó su primer semestre tiene notas anteriores: se le ofrece cargarlas
// todas de una con la ficha académica (Lucas, 2026-11-11). Es opcional; si no
// la sube, el historial sigue disponible desde el menú del perfil y Ajustes.
// Encendida para todo estudiante UC desde su 2.º semestre (Lucas, 2026-11-11).
function ofertaFichaOnboardingHTML(){
  if(!(Number(S.careerSemestre)>1)||!avanceCurricularDisponible()||(S.historial||[]).length)return '';
  return `<button type="button" class="ob-ficha-oferta" onclick="openAvanceCurricular()">
      <strong>Carga todos tus semestres pasados de una</strong>
      <span>Sube tu ficha académica en PDF y armamos tu historial y tu PPA.</span>
    </button>`;
}
function mostrarRamosCargados(cantidad,oficiales){
  const modal=document.getElementById('modal-content');
  if(!cantidad){
    modal.innerHTML=`
      <div class="modal-title">Ya puedes explorar GradeHub</div>
      <div class="courses-loaded">
        <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0;">Cuando quieras, agrega tu primer ramo desde Inicio.</p>
      </div>
      ${ofertaFichaOnboardingHTML()}
      <div class="modal-btns"><button class="btn-confirm" onclick="closeModal()">Ir a Inicio</button></div>`;
    openModal();return;
  }

  const ramosTxt=`${cantidad} ramo${cantidad!==1?'s':''} agregado${cantidad!==1?'s':''}`;
  const oficialesTxt=`${oficiales} ramo${oficiales!==1?'s':''} con pauta`;
  const pendientes=cantidad-oficiales;
  let titulo,principal,detalle;
  if(oficiales===cantidad){
    titulo='Tu semestre está listo';
    principal=oficialesTxt;
    detalle='Ya tienen sus porcentajes. Ingresa tus notas en cada ramo.';
  }else if(oficiales>0){
    titulo='Tus ramos están listos';
    principal=oficialesTxt;
    detalle=`Ya tienen sus porcentajes. ${pendientes===1?'Al otro agrégale':`A los otros ${pendientes} agrégales`} sus evaluaciones.`;
  }else{
    titulo='Ahora, las evaluaciones';
    principal=ramosTxt;
    detalle='Agrega las evaluaciones y sus porcentajes en cada ramo.';
  }
  modal.innerHTML=`
    <div class="modal-title">${titulo}</div>
    <div class="courses-loaded">
      <div class="courses-loaded-count">${principal}</div>
      <p style="font-size:0.8125rem;color:var(--fg2);line-height:1.5;margin:0;">${detalle}</p>
      ${oficiales?`<p style="font-size:0.75rem;color:var(--fg3);margin:2px 0 0;">${ramosTxt}</p>`:''}
    </div>
    ${ofertaFichaOnboardingHTML()}
    <div class="modal-btns"><button class="btn-confirm" onclick="closeModal()">Ver mis ramos</button></div>`;
  openModal();
}
