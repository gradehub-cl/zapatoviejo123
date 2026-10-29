const CACHE_APARTADA_PREFIX='gradehub_v1_respaldo_';
function llaveCacheApartada(owner){return CACHE_APARTADA_PREFIX+owner;}
function borrarCacheApartada(owner){
  try{localStorage.removeItem(llaveCacheApartada(owner||'sin_dueno'));}catch(e){}
}
function apartarCacheLocal(owner){
  const data=localStorage.getItem(STORAGE_KEY)||JSON.stringify(S);
  const key=llaveCacheApartada(owner||'sin_dueno');
  // Una caché vacía temporal no debe pisar un respaldo anterior con ramos.
  const anterior=localStorage.getItem(key);
  if(anterior){
    try{
      const guardado=JSON.parse(anterior);
      const actual=JSON.parse(data);
      const tieneDatos=x=>!!(x?.ramos?.length||x?.historial?.length||x?.onboardingDone||x?.userName);
      if(tieneDatos(JSON.parse(guardado.data))&&!tieneDatos(actual))return;
    }catch(e){}
  }
  const baseCruda=localStorage.getItem(SYNC_BASE_KEY);
  let base=null;
  try{if(JSON.parse(baseCruda||'null')?.owner===owner)base=baseCruda;}catch(e){}
  localStorage.setItem(key,JSON.stringify({owner:owner||null,data,base}));
}
function aislarCacheEnRegistro(uid){
  const owner=getCacheOwner();
  const datosPrevios=!!(S.ramos?.length||S.historial?.length||S.onboardingDone||S.userName);
  const importable=!owner&&datosPrevios;
  if(owner===uid)return {propia:true,importable:false};
  if(!owner&&!datosPrevios){
    S=freshState();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));setCacheOwner(uid);}catch(e){}
    return {propia:false,importable:false};
  }
  const previa=localStorage.getItem(STORAGE_KEY),base=localStorage.getItem(SYNC_BASE_KEY);
  try{
    if(owner||importable)apartarCacheLocal(owner);
    const vacia=freshState();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(vacia));
    localStorage.removeItem(SYNC_BASE_KEY);if(typeof olvidarBaseSesion==='function')olvidarBaseSesion();
    localStorage.setItem(CACHE_OWNER_KEY,uid);
    S=vacia;
    return {propia:false,importable};
  }catch(e){
    // Si falla una de las escrituras, la cuenta nueva no debe reclamar la
    // caché antigua. Recuperamos sus claves antes de salir del registro.
    try{
      if(previa===null)localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY,previa);
      if(base===null)localStorage.removeItem(SYNC_BASE_KEY);
      else localStorage.setItem(SYNC_BASE_KEY,base);
      if(owner)localStorage.setItem(CACHE_OWNER_KEY,owner);
      else localStorage.removeItem(CACHE_OWNER_KEY);
    }catch(_){}
    if(typeof olvidarBaseSesion==='function')olvidarBaseSesion();
    return null;
  }
}
function restaurarCacheApartada(uid){
  const key=llaveCacheApartada(uid);
  let previa=null,basePrevia=null,ownerPrevio=null,mutada=false;
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return false;
    const copia=JSON.parse(raw);
    if(copia.owner!==uid||typeof copia.data!=='string')return false;
    const restaurada=normalize(JSON.parse(copia.data));
    // Si la cuenta ya tiene una caché con datos, es más reciente que esta copia.
    if(getCacheOwner()===uid&&(S.ramos?.length||S.historial?.length||S.onboardingDone||S.userName))return false;
    previa=localStorage.getItem(STORAGE_KEY);
    basePrevia=localStorage.getItem(SYNC_BASE_KEY);
    ownerPrevio=getCacheOwner();
    const otro=ownerPrevio;
    if(otro&&otro!==uid)apartarCacheLocal(otro);
    mutada=true;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(restaurada));
    if(copia.base)localStorage.setItem(SYNC_BASE_KEY,copia.base);
    else localStorage.removeItem(SYNC_BASE_KEY);
    if(typeof olvidarBaseSesion==='function')olvidarBaseSesion();
    localStorage.setItem(CACHE_OWNER_KEY,uid);
    S=restaurada;
    localStorage.removeItem(key);
    return true;
  }catch(e){
    if(!mutada)return false;
    try{
      if(previa===null)localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY,previa);
      if(basePrevia===null)localStorage.removeItem(SYNC_BASE_KEY);
      else localStorage.setItem(SYNC_BASE_KEY,basePrevia);
      if(ownerPrevio)localStorage.setItem(CACHE_OWNER_KEY,ownerPrevio);
      else localStorage.removeItem(CACHE_OWNER_KEY);
    }catch(_){}
    if(typeof olvidarBaseSesion==='function')olvidarBaseSesion();
    return false;
  }
}
async function importarCacheSinDueno(uid){
  if(currentUser?.id!==uid)return;
  try{
    const key=llaveCacheApartada('sin_dueno');
    const copia=JSON.parse(localStorage.getItem(key)||'null');
    if(!copia||copia.owner!==null||typeof copia.data!=='string')return;
    const restaurada=normalize(JSON.parse(copia.data));
    localStorage.setItem(STORAGE_KEY,JSON.stringify(restaurada));
    S=restaurada;
    localStorage.removeItem(key);
    const respaldado=await syncNow();await syncProfile();
    showToast(respaldado
      ? '✓ Tus ramos quedaron guardados en la nube'
      : 'Tus ramos siguen en este dispositivo, pero no pudimos respaldarlos. No cierres sesión.',!respaldado);
    enterApp();
  }catch(e){showToast('No pudimos traer los ramos de este dispositivo. Siguen guardados aquí.',true);}
}
// Los avisos del feedback viven fuera de S y de la caché de notas. Leerlos no
// bloquea la entrada; sin el SQL aplicado, la app sigue sin mostrar un aviso.
