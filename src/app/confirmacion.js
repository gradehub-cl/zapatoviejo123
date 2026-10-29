
let _confirmFn=null;
let _quienAbrioConfirm=null,_focoConfirmTimer=null;
function showConfirm(title,desc,fn,opts){
  opts=opts||{};
  const overlay=document.getElementById('confirm-overlay');
  if(!overlay.classList.contains('open'))_quienAbrioConfirm=document.activeElement;
  clearTimeout(_focoConfirmTimer);
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-desc').textContent=desc;
  _confirmFn=fn;
  const btn=document.getElementById('confirm-action');
  btn.textContent=opts.label||'Eliminar';
  btn.className=opts.danger===false?'btn-prim-sm':'btn-danger';
  const borra=opts.danger!==false;
  btn.onclick=()=>{
    if(borra&&typeof vibrar==='function')vibrar('borrar');
    const confirmar=_confirmFn;
    closeConfirm();
    if(confirmar)confirmar();
  };
  const btns=btn.parentElement;
  btns.style.flexDirection=opts.actionFirst?'row-reverse':'row';
  overlay.classList.add('open');
  _focoConfirmTimer=setTimeout(()=>{
    _focoConfirmTimer=null;
    if(!overlay.classList.contains('open'))return;
    const cancelar=btns.querySelector('.btn-cancel-sm');
    (opts.focusCancel&&cancelar?cancelar:btn).focus();
  },50);
}
function closeConfirm(){
  clearTimeout(_focoConfirmTimer);_focoConfirmTimer=null;
  document.getElementById('confirm-overlay').classList.remove('open');
  const volver=_quienAbrioConfirm;_quienAbrioConfirm=null;
  if(volver&&volver.isConnected&&!volver.disabled&&volver!==document.body&&typeof volver.focus==='function'){
    try{volver.focus({preventScroll:true});}catch(e){volver.focus();}
  }
}

// Cobertura real del semestre: contar notas no dice cuánto del ramo ya está
// decidido. Esta métrica usa las ponderaciones de las evaluaciones rendidas.
