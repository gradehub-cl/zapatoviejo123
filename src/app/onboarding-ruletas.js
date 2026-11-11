// ─── RULETAS DEL ONBOARDING (#697) ───────────────────────────────────────────
// Como la del reloj del iPhone: filas de 44 pt que encajan al centro al soltar.
// Se usa con el dedo, la rueda del mouse, un toque en la fila, las flechas del
// teclado y el lector de pantalla (role="spinbutton"). El tamaño de la letra
// va en rem, así que respeta el que eligió la persona.
const RULETA_FILA=44;
const CHEVRON_RULETA=d=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
function montarRuleta(contenedor,{valores,etiqueta,inicial=null,vacio=null,texto=v=>String(v),alCambiar}){
  if(!contenedor)return null;
  const opciones=vacio!==null?[null,...valores]:valores.slice();
  // Arriba y abajo, dos botones chicos para moverla de a uno con un clic (en el
  // computador arrastrar con la rueda no siempre es cómodo). Van fuera del
  // spinbutton: un control no puede llevar otros controles adentro.
  contenedor.className='ruleta-control';
  contenedor.innerHTML='<div class="ruleta"><div class="ruleta-marco" aria-hidden="true"></div><div class="ruleta-lista" aria-hidden="true">'+
    opciones.map((v,i)=>`<div class="ruleta-fila" data-i="${i}">${esc(v===null?vacio:texto(v))}</div>`).join('')+'</div></div>'+
    `<button type="button" class="ruleta-paso ruleta-arriba" aria-label="Anterior">${CHEVRON_RULETA('M6 15l6-6 6 6')}</button>`+
    `<button type="button" class="ruleta-paso ruleta-abajo" aria-label="Siguiente">${CHEVRON_RULETA('M6 9l6 6 6-6')}</button>`;
  const caja=contenedor.querySelector('.ruleta');
  if(!caja)return null;
  caja.setAttribute('role','spinbutton');caja.tabIndex=0;
  caja.setAttribute('aria-labelledby',etiqueta);
  caja.setAttribute('aria-valuemin',String(valores[0]));caja.setAttribute('aria-valuemax',String(valores[valores.length-1]));
  const lista=caja.querySelector('.ruleta-lista');
  // Sin DOM de verdad (un entorno de prueba) no hay ruleta, pero el onboarding sigue.
  if(!lista)return null;
  let idx=Math.max(0,opciones.indexOf(inicial));
  const pintar=()=>{
    lista.querySelectorAll('.ruleta-fila').forEach((f,i)=>f.classList.toggle('es-elegida',i===idx));
    const v=opciones[idx];
    if(v===null){caja.removeAttribute('aria-valuenow');caja.setAttribute('aria-valuetext',vacio);}
    else{caja.setAttribute('aria-valuenow',String(v));caja.setAttribute('aria-valuetext',texto(v));}
  };
  const elegir=(i,{mover=true}={})=>{
    i=Math.max(0,Math.min(opciones.length-1,i));
    const cambio=i!==idx;idx=i;pintar();
    if(mover&&lista.scrollTo)lista.scrollTo({top:i*RULETA_FILA,behavior:movimientoReducido()?'auto':'smooth'});
    if(cambio&&alCambiar)alCambiar(opciones[idx]);
  };
  // Al soltar, la fila que quedó al centro es la elegida. Mientras gira, cada
  // fila que pasa por el centro hace tic, como el selector de iOS.
  let espera=null,filaAlCentro=idx;
  lista.addEventListener('scroll',()=>{
    const f=Math.round(lista.scrollTop/RULETA_FILA);
    if(f!==filaAlCentro&&f>=0&&f<opciones.length){filaAlCentro=f;vibrar('seleccion');}
    clearTimeout(espera);espera=setTimeout(()=>elegir(f,{mover:false}),90);
  },{passive:true});
  // Con el mouse se agarra y se arrastra, como con el dedo. Mientras se
  // arrastra se apaga el encaje, que si no tironea la lista a cada movimiento.
  let arrastre=null;
  lista.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='mouse'||e.button!==0)return;
    arrastre={y:e.clientY,top:lista.scrollTop,movio:false};
    lista.classList.add('arrastrando');
    if(lista.setPointerCapture)lista.setPointerCapture(e.pointerId);
  });
  lista.addEventListener('pointermove',e=>{
    if(!arrastre)return;
    const dy=e.clientY-arrastre.y;
    if(Math.abs(dy)>4)arrastre.movio=true;
    lista.scrollTop=arrastre.top-dy;
  });
  const soltar=()=>{
    if(!arrastre)return;
    const movio=arrastre.movio;arrastre=null;
    lista.classList.remove('arrastrando');
    if(movio){lista.dataset.recienArrastrada='1';elegir(Math.round(lista.scrollTop/RULETA_FILA));}
  };
  lista.addEventListener('pointerup',soltar);lista.addEventListener('pointercancel',soltar);
  lista.addEventListener('click',e=>{
    if(lista.dataset.recienArrastrada){delete lista.dataset.recienArrastrada;return;}
    const f=e.target.closest&&e.target.closest('.ruleta-fila');if(f)elegir(Number(f.dataset.i));
  });
  contenedor.querySelector('.ruleta-arriba').addEventListener('click',()=>elegir(idx-1));
  contenedor.querySelector('.ruleta-abajo').addEventListener('click',()=>elegir(idx+1));
  caja.addEventListener('keydown',e=>{
    const d={ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5}[e.key];
    if(d){e.preventDefault();elegir(idx+d);}
    else if(e.key==='Home'){e.preventDefault();elegir(0);}
    else if(e.key==='End'){e.preventDefault();elegir(opciones.length-1);}
  });
  pintar();
  // Un paso oculto no tiene alto: se ubica la fila cuando el paso se muestra.
  const sincronizar=()=>{lista.scrollTop=idx*RULETA_FILA;};
  sincronizar();
  return {valor:()=>opciones[idx],elegir,sincronizar};
}
const rangoAnios=(desde,hasta)=>Array.from({length:hasta-desde+1},(_,i)=>desde+i);
// La generación parte en el año actual y se guarda en el perfil. La edad ya no
// se pregunta (Lucas, 2026-11-03): los 14 años se declaran al aceptar en la
// entrada, y quien da clases confirma sus 18 en su paso.
let obGeneracion=new Date().getFullYear(),ruletaGeneracion=null,obSemManual=false,obVerano=false,obSemInvalido=false;
// Quien está en TAV lo marca a mano y queda guardado hasta el 1 de marzo
// siguiente: desde ahí vuelve a regir el semestre calculado. Mientras dura no
// se sugieren ramos de la malla, porque en TAV se toman ramos sueltos.
function finDeVerano(fecha=new Date()){const y=fecha.getMonth()>=2?fecha.getFullYear()+1:fecha.getFullYear();return y+'-03-01';}
function enVerano(fecha=new Date()){
  const v=S&&S.verano;if(!v||typeof v.hasta!=='string')return false;
  const hoy=fecha.getFullYear()+'-'+String(fecha.getMonth()+1).padStart(2,'0')+'-'+String(fecha.getDate()).padStart(2,'0');
  return hoy<v.hasta;
}
// El semestre sale de la generación y la fecha (decisión de Lucas, 2026-10-12):
// marzo a julio es el primero del año, agosto a diciembre el segundo, y en
// enero y febrero —el verano— cuenta el que empieza en marzo. Quien entró en
// 2026 va en su 2.º semestre en octubre de 2026 y empieza el 3.º en marzo de 2027.
function semestreSegunGeneracion(generacion,fecha=new Date()){
  return Math.max(1,(fecha.getFullYear()-generacion)*2+(fecha.getMonth()>=7?2:1));
}
// En el paso 1 todavía no se sabe la universidad: el verano no tiene nombre propio.
function nombreVeranoOnboarding(){return selectedTenant?nombreVerano(selectedTenant):'Verano o TAV';}
function actualizarSemestreCalculado(){
  const total=semestresOfrecidos();
  if(!obSemManual)selectedSem=Math.min(total,semestreSegunGeneracion(obGeneracion));
  const caja=document.getElementById('ob-sem-calculado'),grilla=document.getElementById('sem-grid');
  if(!caja)return;
  const editar=document.getElementById('ob-sem-editar');
  const pasaMarzo=!obSemManual&&new Date().getMonth()<2;
  const frase=obVerano?`Estás en <b>${esc(nombreVeranoOnboarding())}</b>.`
    :`${pasaMarzo?'En marzo empiezas':'Vas en'} tu <b>${selectedSem}.º semestre</b>.`;
  caja.innerHTML=`<span>${frase}</span>`+
    (editar&&editar.hidden?'<button type="button" class="ob-sem-cambiar" onclick="mostrarSemestreManual()">Cambiar</button>':'');
  const boton=document.getElementById('ob-sem-verano');
  if(boton){boton.textContent=nombreVeranoOnboarding();boton.setAttribute('aria-pressed',obVerano?'true':'false');}
}
// "Cambiar" pide escribir el semestre, o marcar TAV/verano.
function mostrarSemestreManual(){
  const editar=document.getElementById('ob-sem-editar');if(!editar)return;
  editar.hidden=false;actualizarSemestreCalculado();
  const campo=document.getElementById('ob-sem-input');
  if(campo){campo.value=obVerano?'':String(selectedSem);campo.focus();campo.select&&campo.select();}
}
function escribirSemestreOnboarding(texto){
  const total=semestresOfrecidos();
  const error=document.getElementById('ob-sem-error');
  const limpio=String(texto||'').trim();
  const n=/^\d{1,2}$/.test(limpio)?Number(limpio):NaN;
  obSemInvalido=!(n>=1&&n<=total);
  if(!obSemInvalido){selectedSem=n;obSemManual=true;obVerano=false;}
  if(error)error.textContent=obSemInvalido&&limpio?`Escribe un número entre 1 y ${total}.`:'';
  if(!limpio)obSemInvalido=!obVerano;
  actualizarSemestreCalculado();checkOb();
}
function alternarVeranoOnboarding(){
  obVerano=!obVerano;obSemInvalido=false;
  const campo=document.getElementById('ob-sem-input'),error=document.getElementById('ob-sem-error');
  if(obVerano&&campo)campo.value='';
  if(error)error.textContent='';
  if(!obVerano&&campo)campo.value=String(selectedSem);
  actualizarSemestreCalculado();checkOb();
}
// Fija el camino. Sin paso propio desde 2026-11-03: lo llama obIniciar con la
// intención de la entrada, y «Sigue como estudiante» desde el paso del profesor.
function elegirTipoCuenta(tipo){
  if(tipo!=='estudiante'&&tipo!=='profesor')return;
  obTipo=tipo;
  // obRender y no solo checkOb: el «Paso 1 de 5» pasa a «de 2» para el profesor.
  obRender();
}
// Quien entró por «Soy profesor particular» sin querer sigue sin cerrar sesión.
function seguirComoEstudiante(){
  elegirTipoCuenta('estudiante');
  if(!obPasos().includes(obStep)){obStep=2;obRender();}
}
function datosProfesorOnboarding(){
  const campo=id=>(document.getElementById(id)||{}).value||'';
  return {nombrePublico:campo('ob-prof-nombre'),presentacion:campo('ob-prof-presentacion'),mayorDeEdad:!!(document.getElementById('ob-prof-mayor')||{}).checked};
}
function montarRuletasOnboarding(){
  ruletaGeneracion=montarRuleta(document.getElementById('ob-generacion-ruleta'),{valores:rangoAnios(2000,new Date().getFullYear()),
    etiqueta:'ob-generacion-titulo',inicial:obGeneracion,alCambiar:v=>{obGeneracion=v;actualizarSemestreCalculado();if(document.getElementById('sem-grid')&&!document.getElementById('sem-grid').hidden)initSemGrid();checkOb();}});
}

function obStepValid(step,datos){
  const d=datos||{
    tipo:obTipo,
    nombre:(document.getElementById('ob-name')||{}).value||'',
    tenant:selectedTenant,carrera:selectedCarrera,semestre:selectedSem,
    verano:typeof obVerano!=='undefined'&&obVerano,semInvalido:typeof obSemInvalido!=='undefined'&&obSemInvalido,
    carreraNombre:selectedCarreraNombre,
    ...datosProfesorOnboarding()
  };
  // El paso 1 pide el nombre y, a quien estudia, un semestre válido (o verano).
  if(step===1)return !!String(d.nombre||'').trim()&&(d.tipo==='profesor'||(!d.semInvalido&&(!!d.semestre||!!d.verano)));
  if(step===2)return !!d.tenant;
  if(step===3)return !!(d.carrera||String(d.carreraNombre||'').trim());
  if(step===5)return true;
  // Los mismos largos que exige postularProfesor: si el botón se habilita, la
  // postulación no rebota por largo. Y dar clases exige 18 años (#697).
  if(step===OB_PASO_PROFESOR){
    const publico=String(d.nombrePublico||'').trim(),texto=String(d.presentacion||'').trim();
    return d.mayorDeEdad===true&&publico.length>=2&&publico.length<=100&&texto.length>=20&&texto.length<=1500;
  }
  return false;
}
// Cuánto lleva, contado en los pasos de SU camino: el profesor tiene tres.
function obPosicion(step){const p=obPasos();return {n:p.indexOf(step)+1,total:p.length};}
function obProgressPct(step){const {n,total}=obPosicion(step);return Math.round(n/total*100);}

// En TAV no se sugieren ramos de la malla: se toman ramos sueltos.
