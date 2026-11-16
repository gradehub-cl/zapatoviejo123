// Ajustes de interacción de WKWebView. La web no instala listeners ni plugins.
let _aparienciaNativa=null,_errorHapticoHasta=0;
function sincronizarAparienciaNativa(){
  if(!enAppNativa())return;
  const oscuro=prefersDark(),estilo=oscuro?'DARK':'LIGHT';
  if(_aparienciaNativa===estilo)return;_aparienciaNativa=estilo;
  const p=window.Capacitor.Plugins||{};
  // Ambos estilos nombran el fondo: DARK usa texto claro en la barra.
  try{p.StatusBar?.setStyle({style:estilo}).catch(()=>{});}catch(e){}
  try{p.Keyboard?.setStyle({style:estilo}).catch(()=>{});}catch(e){}
}
function avisoErrorNativo(){
  if(!enAppNativa()||Date.now()<_errorHapticoHasta)return;
  _errorHapticoHasta=Date.now()+500;vibrar('error');
}
function ajustarCampoNativo(el){
  // Un binario anterior conserva la compensación web hasta reinstalar.
  if(!enAppNativa()||!window.Capacitor.Plugins?.Keyboard)return false;
  const vp=window.visualViewport;
  const abajo=Math.min(window.innerHeight,(vp?.offsetTop||0)+(vp?.height||window.innerHeight))-16;
  // Solo el contenedor de contenido: scrollIntoView también movía la página.
  let cont=el.parentElement;
  while(cont&&cont!==document.body){
    const css=getComputedStyle(cont);
    if(/auto|scroll/.test(css.overflowY)&&cont.scrollHeight>cont.clientHeight)break;
    cont=cont.parentElement;
  }
  if(!cont||cont===document.body)return true;
  const barra=cont.querySelector('.hoja-barra'),r=el.getBoundingClientRect();
  const arriba=Math.max(cont.getBoundingClientRect().top,barra?.getBoundingClientRect().bottom||0)+16;
  if(r.bottom>abajo)cont.scrollTop+=r.bottom-abajo;
  else if(r.top<arriba)cont.scrollTop+=r.top-arriba;
  return true;
}
function actualizarConexionNativa(){
  if(!enAppNativa())return;
  let aviso=document.getElementById('nativa-sin-red');
  const propia=typeof currentUser!=='undefined'&&currentUser&&getCacheOwner()===currentUser.id;
  const sinRed=navigator.onLine===false&&propia&&S.onboardingDone;
  if(!aviso&&!sinRed)return;
  if(!aviso){aviso=document.createElement('p');aviso.id='nativa-sin-red';aviso.className='nativa-conexion';aviso.setAttribute('role','status');aviso.textContent='Sin conexión · tus cambios quedan en este iPhone.';}
  const pantalla=document.querySelector('#screen-ramo.active')||document.getElementById('screen-'+currentTab);
  const contenido=pantalla?.querySelector('.scroll');
  if(contenido&&aviso.parentElement!==contenido)contenido.prepend(aviso);
  aviso.hidden=!sinRed;
}
(function prepararInteraccionNativa(){
  if(!enAppNativa()||typeof MutationObserver==='undefined'||typeof requestAnimationFrame!=='function')return;
  const alFoco=()=>{const el=document.activeElement;if(el?.matches('input,textarea,select,[contenteditable=true]'))ajustarCampoNativo(el);};
  const alTeclado=(visible)=>{document.documentElement.classList.toggle('nativa-teclado',visible);requestAnimationFrame(alFoco);};
  const k=window.Capacitor.Plugins?.Keyboard;
  try{
    k?.addListener('keyboardWillShow',()=>alTeclado(true))?.catch(()=>{});
    k?.addListener('keyboardDidShow',alFoco)?.catch(()=>{});
    k?.addListener('keyboardWillHide',()=>alTeclado(false))?.catch(()=>{});
    k?.addListener('keyboardDidHide',()=>alTeclado(false))?.catch(()=>{});
  }catch(e){}
  window.addEventListener('keyboardWillHide',()=>alTeclado(false));
  window.addEventListener('keyboardDidHide',()=>alTeclado(false));
  window.visualViewport?.addEventListener('resize',alFoco);
  document.addEventListener('invalid',avisoErrorNativo,true);
  // Solo un cambio de selección; pulsar un botón cualquiera no hace nada.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[role=tab],button[aria-pressed]');
    if(!b||b.disabled||b.classList.contains('password-toggle'))return;
    const antes=b.getAttribute('aria-selected')||b.getAttribute('aria-pressed');
    requestAnimationFrame(()=>{if(b.isConnected&&antes!==(b.getAttribute('aria-selected')||b.getAttribute('aria-pressed')))vibrar('seleccion');});
  },true);
  let pendiente=false;
  const repasar=()=>{
    pendiente=false;sincronizarAparienciaNativa();actualizarConexionNativa();
    // Al volver o cerrar una hoja, WebKit puede conservar el campo oculto
    // como first responder. Se cierra el teclado, sin mover la nueva pantalla.
    const foco=document.activeElement;
    if(document.documentElement.classList.contains('nativa-teclado')&&
      (!foco?.matches('input,textarea,select,[contenteditable=true]')||!foco.getClientRects().length)){
      alTeclado(false);foco?.blur();try{k?.hide()?.catch(()=>{});}catch(e){}
    }
    // Una URL/correo escrito se copia; un botón «Abrir» no se vuelve seleccionable.
    document.querySelectorAll('a[href]').forEach(a=>{
      const copiable=/^(https?:\/\/|[^\s@]+@[^\s@]+\.[^\s@]+$)/i.test(a.textContent.trim());
      if(a.classList.contains('nativa-copiable')!==copiable)a.classList.toggle('nativa-copiable',copiable);
    });
  };
  const programar=()=>{if(!pendiente){pendiente=true;requestAnimationFrame(repasar);}};
  const obs=new MutationObserver(programar);
  obs.observe(document.documentElement,{attributes:true,attributeFilter:['data-modo','style']});
  const app=document.querySelector('.app');if(app)obs.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('online',programar);window.addEventListener('offline',programar);
  document.addEventListener('focusin',e=>{
    if(!e.target.matches?.('input,textarea,select'))return;
    if(parseFloat(getComputedStyle(e.target).fontSize)<16)e.target.style.fontSize='16px';
  });
  programar();
})();
