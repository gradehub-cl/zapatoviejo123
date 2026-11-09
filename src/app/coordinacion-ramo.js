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
//   3. Los reportes: dos pautas bien respaldadas de profesores o secciones
//      distintas (distribuciones-pauta.js) dicen que no es coordinado.
//   4. La malla: un ramo que aparece en alguna malla de la universidad se toma
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

// Nombre, sigla y créditos de un ramo no coordinado sin pauta para todos.
// Con sigla, solo si es la del programa: nunca los datos de un homónimo.
function datosRamoNoCoordinado(nombre,sigla,tenant=S.tenant){
  const presets=PRESETS_POR_TENANT[tenant];
  if(!presets)return null;
  const clave=claveCatalogo(nombre,Object.keys(presets),tenant),def=clave&&presets[clave];
  if(!def||Array.isArray(def)||def.coordinado!==false||pautaPresetSuficiente(evalsDePreset(def)))return null;
  if(sigla&&def.sigla&&normName(sigla)!==normName(def.sigla))return null;
  return {nombre:clave,sigla:def.sigla||null,creditos:typeof def.creditos==='number'?def.creditos:null};
}

// El programa publicado que le corresponde a un ramo no coordinado, o null:
//   · el de su sección, si la sección tiene programa (`porSeccion`);
//   · si no, el que calza exacto con su pauta guardada (mismos nombres y
//     pesos): quien ya tenía cargado el programa de las secciones 4 y 5 de
//     Biología de la Célula, o el de Revelación y Fe, conserva sus reglas
//     (eximición, lo que no se calcula) aunque no haya dicho su sección.
// Devuelve la definición completa de ese programa, como un preset coordinado,
// y de dónde sale ({fuente:'programa', secciones} o {fuente:'catalogo'}).
function formaProgramaRamo(lista){
  return lista.map(([n,p])=>normName(n)+':'+r2(Number(p)||0)).sort().join('|');
}
function programaQueCalza(ramo,def){
  if(!ramo||!def||Array.isArray(def)||def.coordinado!==false)return null;
  const {porSeccion,evalsReferencia,...general}=def;
  const programas=[];
  Object.keys(porSeccion||{}).map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b).forEach(n=>{
    const evals=evalsDePreset(porSeccion[n]);
    const previo=programas.find(p=>p.fuente==='programa'&&formaProgramaRamo(p.def.evals)===formaProgramaRamo(evals));
    if(previo){previo.secciones.push(n);return;}
    programas.push({def:{...general,...porSeccion[n]},fuente:'programa',secciones:[n]});
  });
  if(Array.isArray(evalsReferencia)&&evalsReferencia.length)
    programas.push({def:{...general,evals:evalsReferencia},fuente:'catalogo',secciones:[]});
  if(Number.isInteger(ramo.seccion)){
    const suyo=programas.find(p=>p.secciones.includes(ramo.seccion));
    if(suyo)return suyo;
  }
  const cats=catsDePauta(ramo.categorias);
  if(!cats.length)return null;
  const forma=formaProgramaRamo(cats.map(c=>[c.nombre,c.peso]));
  return programas.find(p=>pautaPresetSuficiente(p.def.evals)&&formaProgramaRamo(p.def.evals)===forma)||null;
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

// {coordinado:boolean, fuente:'programa'|'pauta-oficial'|'reportes'|'malla'|'fuera-de-malla'} o null.
function coordinacionRamo(r){
  if(!r||!r.nombre)return null;
  const tenant=r.origen?.tenant||S.tenant;
  if(!tenant)return null;
  const def=pautaOficialDelRamo(r.nombre,tenant);
  if(def&&!Array.isArray(def)&&typeof def.coordinado==='boolean')
    return {coordinado:def.coordinado,fuente:'programa'};
  if(def&&pautaPresetSuficiente(evalsDePreset(def)))return {coordinado:true,fuente:'pauta-oficial'};
  // Los reportes pueden mostrar que el ramo cambia según profesor o sección
  // aunque esté en la malla (distribuciones-pauta.js).
  if(evidenciaCoordinacionDe(r)===true)return {coordinado:false,fuente:'reportes'};
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
