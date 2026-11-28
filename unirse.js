const tokenGrupo=location.hash.slice(1);
if(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(tokenGrupo)){
  const abrir=document.getElementById('abrir');
  abrir.href='cl.gradehub.app://grupo#'+tokenGrupo;
  abrir.hidden=false;
}else document.getElementById('detalle').textContent='Falta parte del enlace. Pídele a quien te invitó que lo comparta de nuevo.';
