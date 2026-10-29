function renderModalColors(){
  const c=document.getElementById('m-colors');if(!c)return;c.innerHTML='';
  chartColors().forEach(col=>{
    const d=document.createElement('div');d.className='color-dot'+(col===modalColor?' sel':'');d.style.background=col;
    d.onclick=()=>{modalColor=col;renderModalColors();};c.appendChild(d);
  });
}
// Matching tolerante: ignora tildes y mayúsculas para encontrar el preset.
// Se memoriza: el buscador de "Agregar ramo" compara ~10.000 cursos UC contra
// los presets y normalizaba los mismos nombres millones de veces. En un iPhone
// eso congelaba la pantalla varios segundos al abrir el modal (2026-09-26). La
// función es pura, así que guardar el resultado no cambia nada más.
const _normNameCache=new Map();
function normName(s){
  if(typeof s!=='string')return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  let v=_normNameCache.get(s);
  if(v===undefined){
    v=s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
    if(_normNameCache.size>50000)_normNameCache.clear();
    _normNameCache.set(s,v);
  }
  return v;
}

// El mismo ramo escrito con y sin número. Hay programas que numeran el primero
// de una serie que en la malla va sin número: "Contabilidad I" es la
// "Contabilidad" del catálogo. Ese estudiante se quedaba sin pauta oficial, sin
// créditos y sin sigla, teniendo el ramo correcto y escribiéndolo distinto.
//
// Dos límites, y ninguno es cosmético. Solo el PRIMERO: "Contabilidad II" es
// otro ramo. Y solo si "X I" no es un ramo de verdad de esa universidad —en FEN
// conviven "Gestión de Personas" (2º) con "Gestión de Personas I" (5º), y pasa
// igual con Marketing, Finanzas y Métodos Cuantitativos. Darle a esos la pauta
// del otro sería calcular el promedio con las ponderaciones equivocadas.
//
// La malla es la que manda sobre qué nombres existen de verdad. Es un literal
// que no cambia en ejecución, así que se recorre una vez por universidad.
const _nombresMalla={};
function ramoDeLaMalla(nombre,tenant){
  if(!_nombresMalla[tenant]){
    const set=new Set(),mallas=mallaFor(tenant)||{};
    for(const c in mallas)for(const s in mallas[c])(mallas[c][s]||[]).forEach(n=>set.add(normName(n)));
    _nombresMalla[tenant]=set;
  }
  return _nombresMalla[tenant].has(normName(nombre));
}

// El nombre canónico de un ramo que se llama de dos formas, o null. La tabla
// vive en data.js y son pares confirmados uno por uno contra el código del
// ramo: acá no se deduce nada.
function sinonimoDe(nombre,tenant){
  const tabla=(typeof SINONIMOS!=='undefined'&&SINONIMOS[tenant])||{};
  const n=normName(nombre);
  const k=Object.keys(tabla).find(x=>normName(x)===n);
  return k?tabla[k]:null;
}

// Busca `nombre` entre `claves` por nombre normalizado. Los dos rescates son
// intentos POSTERIORES: una coincidencia exacta siempre manda.
function claveCatalogo(nombre,claves,tenant){
  const n=normName(nombre);
  const exacta=claves.find(k=>normName(k)===n);
  if(exacta)return exacta;
  const otro=sinonimoDe(nombre,tenant);
  if(otro){
    const porSinonimo=claves.find(k=>normName(k)===normName(otro));
    if(porSinonimo)return porSinonimo;
  }
  if(!/\s+i$/.test(n)||ramoDeLaMalla(nombre,tenant))return null;
  const base=n.replace(/\s+i$/,'');
  return claves.find(k=>normName(k)===base)||null;
}

// Créditos SCT de un ramo. Primero el preset —si existe, es el dato de su
// programa oficial— y si no, la tabla de créditos de la universidad.
//
// Existe porque los dos datos tienen vidas distintas: las ponderaciones cambian
// cada semestre y hay 10 pautas para 88 ramos FEN, pero los créditos casi no
// cambian y de Ingeniería UC están los 146. Atar el crédito al preset dejaba sin
// PPA ponderado a todo el que cargara su malla, que es casi todo el mundo.
//
// Devuelve null cuando no se sabe. OJO: 0 no es null. Un laboratorio de 0 SCT es
// un dato conocido y exacto; null es "no lo tenemos". Confundirlos es lo que
// haría que un ramo sin dato se colara al promedio con peso cero.
const CREDITOS_POR_TENANT={uc:CREDITOS_UC,fen:CREDITOS_FEN};
function creditosDe(nombre,tenant,preset,sigla){
  if(preset&&typeof preset.creditos==='number')return preset.creditos;
  const tabla=CREDITOS_POR_TENANT[tenant];
  if(tabla){
    const clave=claveCatalogo(nombre,Object.keys(tabla),tenant);
    if(clave)return tabla[clave][0];
  }
  if(tenant==='uc'){
    const fila=cursoUcCompleto(nombre,sigla);
    if(fila&&typeof fila[2]==='number')return fila[2];
  }
  return null;
}

// La sigla de un ramo YA CARGADO, para mostrarla junto al nombre. Sale de la
// misma tabla que los créditos, así que sirve para las dos universidades y no
// necesita saber la carrera. Importa donde el nombre no basta: en el plan común
// hay dos ramos llamados "Dinámica" con códigos distintos, y el estudiante
// reconoce el suyo por la sigla de su horario, no por el nombre.
// ¿La pauta encontrada por nombre es de ESTE curso? Si la pauta declara sigla,
// tiene que coincidir: un homónimo con otra sigla no la recibe (ver
// crearRamoDesdeCatalogo, que tampoco se la adjunta).
function pautaCalzaConSigla(nombrePauta,sigla){
  if(!nombrePauta)return false;
  const propia=siglaDePreset(nombrePauta);
  return !propia||!sigla||normName(propia)===normName(sigla);
}
function siglaDePreset(nombre){
  if(typeof PRESETS_UC==='undefined'||!nombre)return null;
  const clave=claveCatalogo(nombre,Object.keys(PRESETS_UC),'uc');
  const def=clave?PRESETS_UC[clave]:null;
  return def&&typeof def.sigla==='string'&&def.sigla?def.sigla:null;
}
// La sigla y los créditos dejan de vivir SOLO en las tablas del navegador y se
// guardan en el ramo. Dos motivos, los dos vistos en producción:
//
// - El catálogo completo de la UC se baja aparte, solo al buscar un ramo. En la
//   pantalla de inicio no está, así que la sigla salía vacía aunque la
//   supiéramos, y los créditos con ella. Guardarla la vuelve independiente de
//   qué archivos alcanzó a cargar esta visita.
// - El servidor MCP no tiene `data.js`. Con la sigla solo en las tablas, la app
//   mostraba "BIO143M" y el agente decía `sigla: null` para el mismo ramo.
//
// Solo sella ramos que vinieron del catálogo. Un ramo escrito a mano no recibe
// nada: si alguien tecleó "Dinámica", afirmar que es FIS1514 y no ICE1514 es
// justo el tipo de dato que no se inventa. Es la misma regla que ya regía para
// los créditos y que `creditos-pendientes.test.js` exige.
function sellarDatosCatalogo(r,tenant){
  if(!r||!r.origen||!r.origen.tenant)return false;
  const t=tenant||r.origen.tenant;
  let cambio=false;
  if(!r.sigla){
    const s=siglaDeRamo(r,t);
    if(s){r.sigla=s;cambio=true;}
  }
  if(r.creditos===null||r.creditos===undefined){
    // Con la pauta del ramo, si es de ESTE curso: TTF012 no está en cursos-uc.js
    // y su crédito vive solo en PRESETS_UC.
    const def=pautaCalzaConSigla(r.nombre,r.sigla)?definicionPresetDelRamo(r):null;
    const cr=creditosDe(r.nombre,t,def,r.origen.ramoKey);
    if(typeof cr==='number'){r.creditos=cr;cambio=true;}
  }
  return cambio;
}
function siglaDeRamo(r,tenant){
  if(!r||!r.nombre)return null;
  // La sigla elegida explícitamente en el catálogo o leída del horario
  // identifica el curso mejor que su nombre (hay homónimos oficiales).
  if(typeof r.sigla==='string'&&r.sigla)return r.sigla;
  // En el onboarding la universidad todavía no está en `S`: se está eligiendo,
  // y vive en `selectedTenant`. Por eso se puede pasar explícita.
  tenant=tenant||(r.origen&&r.origen.tenant)||S.tenant;
  const tabla=CREDITOS_POR_TENANT[tenant];
  if(tabla){
    const clave=claveCatalogo(r.nombre,Object.keys(tabla),tenant);
    const fila=clave?tabla[clave]:null;
    if(fila&&typeof fila[1]==='string')return fila[1];
  }
  // La sigla de un ramo que solo existe como preset. Los OFG y electivos no
  // están en ninguna malla, así que `CREDITOS_UC` no los tiene, y el catálogo
  // completo se baja aparte —solo al buscar un ramo— así que en la pantalla de
  // inicio todavía no llegó: ahí la sigla salía vacía aunque la supiéramos.
  //
  // Va ANTES del catálogo a propósito. Cuando las dos fuentes no coinciden
  // manda la del preset, porque es la del curso cuya pauta estamos prometiendo.
  // "Revelación y Fe" es el caso: el horario oficial la da como TTF012 y el
  // catálogo de programas publica un homónimo, TEB110, que es otro curso.
  // Resolver por nombre contra el catálogo le mostraría al estudiante la sigla
  // de un ramo que no está tomando.
  if(tenant==='uc'){
    const dePreset=siglaDePreset(r.nombre);
    if(dePreset)return dePreset;
  }
  const origenKey=r.origen&&r.origen.ramoKey;
  // Los ramos UC antiguos sin sigla guardaron el nombre normalizado como
  // ramoKey. Solo se muestra la clave si tiene forma de código oficial.
  if(tenant==='uc'&&typeof origenKey==='string'&&/^[A-Z]{2,5}\d{3,4}[A-Z]?$/i.test(origenKey))return origenKey.toUpperCase();
  const completa=tenant==='uc'?cursoUcCompleto(r.nombre,null):null;
  return completa&&typeof completa[0]==='string'?completa[0]:null;
}

// Identificador oficial de un ramo UC. La carrera solo sirve para resolver un
// nombre ambiguo al momento de encontrar su sigla; una vez resuelto, el
// consenso se agrupa por universidad + sigla, nunca por carrera ni semestre.
function siglaUC(nombre,carrera){
  const tabla=SIGLAS_UC[carrera];
  if(!tabla)return null;
  const clave=claveCatalogo(nombre,Object.keys(tabla),'uc');
  return clave?tabla[clave]:null;
}

// \u2500\u2500\u2500 CAT\u00c1LOGO DE RAMOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Capa de consulta sobre MALLA/PRESETS. Todo ramo del cat\u00e1logo pertenece a un
// par (universidad, carrera): nunca se le ofrece a un alumno de la UC un ramo
// que solo existe en la malla de la UANDES.
function catalogKey(tenant,carrera){return (tenant||'')+':'+(carrera||'');}
function siglaCatalogoUC(nombre){
  const fila=typeof CREDITOS_UC!=='undefined'&&CREDITOS_UC[nombre];
  return fila&&typeof fila[1]==='string'?fila[1]:null;
}
