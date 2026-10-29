let _avisosFeedback=[], _cuentaAvisosFeedback=null, _peticionAvisosFeedback=0;
function olvidarAvisosFeedback(){
  _peticionAvisosFeedback++;
  _avisosFeedback=[];_cuentaAvisosFeedback=null;
  const caja=document.getElementById('aviso-feedback-solucionado');
  if(caja&&typeof caja.remove==='function')caja.remove();
}
async function cargarAvisosFeedback(){
  const uid=currentUser?.id;
  if(!uid||!supabaseClient)return;
  const peticion=++_peticionAvisosFeedback;
  try{
    const {data,error}=await supabaseClient.rpc('mis_feedback_solucionados');
    if(peticion!==_peticionAvisosFeedback||currentUser?.id!==uid)return;
    _cuentaAvisosFeedback=uid;
    _avisosFeedback=!error&&Array.isArray(data)?data.filter(a=>a&&typeof a.feedback_id==='string'&&typeof a.solucion==='string'):[];
    pintarAvisoFeedback();
  }catch(e){} // Accesorio: una red caída nunca bloquea las notas ni el login.
}
function pintarAvisoFeedback(){
  const anterior=document.getElementById('aviso-feedback-solucionado');
  if(anterior&&typeof anterior.remove==='function')anterior.remove();
  if(!currentUser||currentUser.id!==_cuentaAvisosFeedback||!_avisosFeedback.length)return;
  const inicio=document.querySelector('#screen-home .scroll');
  if(!inicio)return;
  const aviso=_avisosFeedback[0],caja=document.createElement('aside');
  caja.id='aviso-feedback-solucionado';caja.className='aviso-feedback';
  caja.setAttribute('role','status');caja.setAttribute('aria-live','polite');
  const texto=document.createElement('div'),titulo=document.createElement('strong'),detalle=document.createElement('p');
  titulo.textContent='Solucionamos tu problema';detalle.textContent=aviso.solucion;
  texto.append(titulo,detalle);
  const cerrar=document.createElement('button');
  cerrar.type='button';cerrar.className='aviso-feedback-cerrar';
  cerrar.setAttribute('aria-label','Cerrar aviso de problema solucionado');
  cerrar.innerHTML='<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  cerrar.addEventListener('click',()=>cerrarAvisoFeedback(aviso.feedback_id,cerrar));
  caja.append(texto,cerrar);inicio.prepend(caja);
}
async function cerrarAvisoFeedback(id,boton){
  if(boton.disabled||!currentUser||currentUser.id!==_cuentaAvisosFeedback)return;
  const uid=currentUser.id,peticion=_peticionAvisosFeedback;
  boton.disabled=true;
  try{
    const {data,error}=await supabaseClient.rpc('feedback_solucion_vista',{p_feedback_id:id});
    if(peticion!==_peticionAvisosFeedback||currentUser?.id!==uid)return;
    if(error||data!==true)throw error||new Error('No se pudo cerrar');
    _avisosFeedback=_avisosFeedback.filter(a=>a.feedback_id!==id);
    pintarAvisoFeedback();
    const siguiente=document.querySelector('#aviso-feedback-solucionado button')||document.getElementById('user-avatar');
    if(siguiente)siguiente.focus();
  }catch(e){
    if(peticion===_peticionAvisosFeedback&&currentUser?.id===uid)
      showToast('No pudimos cerrar el aviso. Inténtalo de nuevo.',true);
  }finally{boton.disabled=false;}
}
