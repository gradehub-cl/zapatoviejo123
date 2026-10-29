function correoSugerenciaHref(categoria='sugerencia',mensaje=''){
  const tipos={sugerencia:'Sugerencia',problema:'Problema',otro:'Comentario'};
  const tipo=tipos[categoria]||tipos.otro;
  const t=TENANTS[S.tenant]||{};
  const universidad=t.label||t.name||'No indicada';
  const carrera=S.carreraNombre||S.carrera||'No indicada';
  const perfil=[
    `Nombre para mostrar: ${S.userName||'No indicado'}`,
    `Universidad: ${universidad}`,
    `Carrera: ${carrera}`,
    `Semestre: ${S.careerSemestre||'No indicado'}°`,
  ];
  const detalle=String(mensaje||'').trim();
  const cuerpo=['Hola, GradeHub:','',`Tipo: ${tipo}`,'',...perfil,'','Detalle:',detalle||''].join('\n');
  return `mailto:gradehub.app@gmail.com?subject=${encodeURIComponent(`GradeHub · ${tipo}`)}&body=${encodeURIComponent(cuerpo)}`;
}
function actualizarCorreoSugerencia(){
  const selector=document.getElementById('s-feedback-type');
  const campo=document.getElementById('s-feedback-message');
  const enlace=document.getElementById('feedback-contact');
  if(enlace)enlace.href=correoSugerenciaHref(selector?selector.value:'sugerencia',campo?campo.value:'');
}
function actualizarSugerencia(){
  const campo=document.getElementById('s-feedback-message');
  const cuenta=document.getElementById('s-feedback-count');
  const ayuda=document.getElementById('s-feedback-help');
  if(!campo)return;
  if(cuenta)cuenta.textContent=`${campo.value.length} / 2000`;
  const faltan=Math.max(0,3-campo.value.trim().length);
  if(ayuda){
    ayuda.textContent=faltan
      ?`Mínimo 3 caracteres · te ${faltan===1?'falta 1 carácter':'faltan '+faltan+' caracteres'} para enviarlo.`
      :'Queda asociado a tu cuenta para poder ayudarte.';
    ayuda.classList.toggle('pending',faltan>0);
  }
  if(!faltan)campo.removeAttribute('aria-invalid');
}
async function enviarSugerencia(){
  if(!supabaseClient||!currentUser){showToast('Necesitas iniciar sesión para enviar',true);return;}
  const campo=document.getElementById('s-feedback-message');
  const selector=document.getElementById('s-feedback-type');
  const boton=document.getElementById('s-feedback-send');
  const mensaje=campo?campo.value.trim():'';
  const categoria=selector&&['sugerencia','problema','otro'].includes(selector.value)?selector.value:'otro';
  if(!(mensaje.length>=3)){
    if(campo){campo.setAttribute('aria-invalid','true');actualizarSugerencia();campo.focus();}
    showToast('Escribe al menos 3 caracteres',true);return;
  }
  if(boton){boton.disabled=true;boton.textContent='Enviando…';}
  try{
    const universidad=TENANTS[S.tenant]?S.tenant:null;
    const {error}=await supabaseClient.from('user_feedback').insert({user_id:currentUser.id,categoria,mensaje,universidad});
    if(error)throw error;
    track('submit_feedback',{categoria});
    if(campo)campo.value='';
    actualizarSugerencia();
    showToast('Gracias · recibimos tu comentario');
  }catch(e){
    console.warn('No se pudo enviar el comentario:',e);
    showToast('No pudimos enviarlo. Intenta de nuevo.',true);
  }finally{
    if(boton){boton.disabled=false;boton.textContent='Enviar comentario';actualizarSugerencia();}
  }
}
