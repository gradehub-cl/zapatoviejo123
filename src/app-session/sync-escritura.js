
async function subirConVersion(uid){
  try{
    for(let intento=0;intento<3;intento++){
      const base=leerBaseSync(uid);
      const enviado={...S,_rev:(revSync(base)||0)+1};
      let escrito;
      if(!base){
        // No conocemos ninguna copia en la nube: cuenta nueva o lectura sin fila.
        const {error}=await supabaseClient.from('user_ramos').upsert({user_id:uid,data:enviado},{onConflict:'user_id'});
        // Supabase normalmente resuelve la promesa y entrega el fallo acá; el
        // catch por sí solo no lo ve. Marcar la caché como alineada en ese caso
        // deja a la app creyendo que existe un respaldo que nunca se escribió.
        if(error)throw error;
        escrito=true;
      }else{
        // Solo si la nube sigue en la versión que este dispositivo conoce. Una
        // copia de antes de este cambio no tiene `_rev`: se compara con null.
        let consulta=supabaseClient.from('user_ramos').update({data:enviado}).eq('user_id',uid);
        consulta=revSync(base)===null?consulta.is('data->>_rev',null):consulta.eq('data->>_rev',String(revSync(base)));
        const {data:filas,error}=await consulta.select('user_id');
        if(error)throw error;
        escrito=Array.isArray(filas)&&filas.length>0;
      }
      if(escrito){
        // Si entretanto se cambió de cuenta, S y el disco ya son de la otra:
        // la subida quedó hecha, pero no se le anota esta base ni este dueño.
        if(!currentUser||currentUser.id!==uid)return true;
        S._rev=enviado._rev;
        guardarBaseSync(uid,enviado);
        if(typeof enviarDiscrepanciasCierre==='function')enviarDiscrepanciasCierre().catch(()=>{});
        setCacheOwner(uid); // la caché local quedó alineada con esta cuenta
        return true;
      }
      // Otro dispositivo escribió desde la última vez: se fusiona y se reintenta.
      // Nunca sobre la cuenta que entró después: loadFromCloud lee la sesión actual.
      if(!currentUser||currentUser.id!==uid)return false;
      const cloud=await loadFromCloud();
      if(!currentUser||currentUser.id!==uid)return false;
      if(cloud===null){guardarBaseSync(uid,null);continue;}
      if(!fusionarConNube(uid,base,cloud))return false;
    }
    return false;
  }catch(e){
    console.warn('No se pudo respaldar la copia local:',(e&&e.code)||'error');
    return false; // localStorage conserva la copia; se reintenta al próximo save
  }
}
// Con un modal abierto no se reemplaza S: el formulario quedaría editando
// objetos que ya no están en el estado y esa edición se perdería al guardar.
// Se reintenta en un rato; la base no cambia, así que el choque se repite y se
// resuelve cuando el modal se cierre.
function modalAbiertoSync(){
  const modal=typeof document!=='undefined'&&document.getElementById&&document.getElementById('modal');
  return !!(modal&&modal.classList&&modal.classList.contains('open'));
}
function fusionarConNube(uid,base,cloud){
  if(modalAbiertoSync()){setTimeout(syncToCloud,1500);return false;}
  const nube=normalize({...freshState(),...clonarSync(cloud)});
  S=normalize({...freshState(),...fusionarSync(base,S,nube)});
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){}
  guardarBaseSync(uid,nube);
  repintarTrasFusion();
  showToast('Sumamos lo que anotaste en otro dispositivo');
  return true;
}
function repintarTrasFusion(){
  try{
    const activa=typeof document!=='undefined'&&document.querySelector&&document.querySelector('.screen.active');
    const id=activa&&activa.id;
    if(typeof renderHome==='function')renderHome();
    // Las notas de la ficha se escriben en campos que guardan al soltarlos
    // (onchange): repintar ahora borraría lo que se está tecleando. Se repinta
    // al salir del campo; el dato no corre riesgo, porque se guarda buscando la
    // categoría por id en la S nueva.
    const foco=id==='screen-ramo'&&document.activeElement;
    if(foco&&activa.contains&&activa.contains(foco)&&/^(INPUT|TEXTAREA|SELECT)$/.test(foco.tagName||'')){
      foco.addEventListener('focusout',()=>setTimeout(repintarTrasFusion,0),{once:true});
    }else if(id==='screen-ramo'){
      if(S.ramos.some(r=>r.id===currentRamoId)&&typeof renderRamo==='function')renderRamo();
      else if(typeof goHome==='function')goHome();
    }
    if(id==='screen-stats'&&typeof renderStats==='function')renderStats();
    if(id==='screen-agenda'&&typeof renderAgenda==='function')renderAgenda();
  }catch(e){}
}
