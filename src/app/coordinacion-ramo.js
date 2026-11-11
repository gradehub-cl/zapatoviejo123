// ─── RAMOS COORDINADOS Y NO COORDINADOS ──────────────────────────────────────
// Un ramo coordinado tiene la misma pauta en todas sus secciones (Cálculo I).
// En uno no coordinado cada profesor o sección arma la suya (la mayoría de los
// teológicos y de formación general). La diferencia importa para el consenso:
// en un ramo no coordinado, que tres estudiantes reporten la misma pauta solo
// dice cómo evalúa SU profesor, así que no se le aplica sola a nadie más.
//
// Quién decide, en este orden (pedido de Lucas del 2026-11-09):
//   1. El dato explícito `coordinado` de la pauta oficial. Lo pone el programa
//      o lo confirma Lucas; tener varios profesores no basta (Derecho UC).
//   2. Tener pauta oficial para todo el ramo: alguien la transcribió como una.
//   3. La malla: un ramo que aparece en alguna malla de la universidad se toma
//      como coordinado; uno que no aparece en ninguna (electivos, teológicos,
//      formación general), como no coordinado.
// Devuelve null mientras no se pueda saber: las mallas de UC, UAI, UAndes y
// UDD llegan aparte (catalogo-carga.js). Quien decide con esto espera a
// `asegurarMallasCoordinacion` o, si no puede esperar, no aplica nada.

// La pauta oficial de un ramo sin filtrar por carrera: aquí no se pregunta si
// este estudiante la recibe, sino qué dice el programa del ramo.
function pautaOficialDelRamo(nombre,tenant){
  if(!nombre||!tenant)return null;
  if(tenant==='uc'){
    const clave=claveUc(nombre);
    return clave?PRESETS_UC[clave]:null;
  }
  const presets=PRESETS_POR_TENANT[tenant];if(!presets)return null;
  const clave=claveCatalogo(nombre,Object.keys(presets),tenant);
  return clave?presets[clave]:null;
}

// Nombres normalizados de todas las mallas cargadas de una universidad. La
// caché se invalida cuando llegan las mallas diferidas.
const _nombresMallasCoordinacion={};
function nombresMallasCoordinacion(tenant){
  const extra=mallasExtraDe(tenant);
  const previa=_nombresMallasCoordinacion[tenant];
  if(previa&&previa.extra===extra)return previa.nombres;
  const nombres=new Set();
  for(const mallas of [mallaFor(tenant)||{},extra||{}])
    for(const c in mallas)for(const s in mallas[c])(mallas[c][s]||[]).forEach(n=>nombres.add(normName(n)));
  _nombresMallasCoordinacion[tenant]={extra,nombres};
  return nombres;
}

// {coordinado:boolean, fuente:'programa'|'pauta-oficial'|'malla'|'fuera-de-malla'} o null.
function coordinacionRamo(r){
  if(!r||!r.nombre)return null;
  const tenant=r.origen?.tenant||S.tenant;
  if(!tenant)return null;
  const def=pautaOficialDelRamo(r.nombre,tenant);
  if(def&&!Array.isArray(def)&&typeof def.coordinado==='boolean')
    return {coordinado:def.coordinado,fuente:'programa'};
  if(def&&pautaPresetSuficiente(evalsDePreset(def)))return {coordinado:true,fuente:'pauta-oficial'};
  const nombre=normName(r.nombre),sinonimo=sinonimoDe(r.nombre,tenant);
  const nombres=nombresMallasCoordinacion(tenant);
  if(nombres.has(nombre)||(sinonimo&&nombres.has(normName(sinonimo))))return {coordinado:true,fuente:'malla'};
  // Sin las mallas diferidas no se puede afirmar que el ramo está fuera.
  if(ARCHIVO_MALLAS[tenant]&&!mallasExtraDe(tenant))return null;
  return {coordinado:false,fuente:'fuera-de-malla'};
}
function ramoNoCoordinado(r){return coordinacionRamo(r)?.coordinado===false;}
function ramoCoordinado(r){return coordinacionRamo(r)?.coordinado===true;}

// Trae las mallas diferidas si hacen falta para decidir. Nunca falla: si la
// descarga no resulta, coordinacionRamo sigue devolviendo null para los ramos
// que no están en la malla base.
async function asegurarMallasCoordinacion(tenant){
  if(!tenant||!ARCHIVO_MALLAS[tenant]||mallasExtraDe(tenant))return;
  try{await cargarMallasUC(tenant);}catch(e){}
}
