const _consensoPorTenant=new Map();
function claveCacheConsenso(tenant,periodo,seccion){return [tenant,periodo,seccion||''].join('|');}
function consensoVigenteParaRamo(c,r){return c.periodo===periodoReporte(r)&&(c.seccion==null||c.seccion===seccionReporte(r));}
async function cargarConsenso(tenant,periodo,seccion=null){
  if(esCuentaProfesor())return null;
  tenant=tenant||S.tenant;periodo=periodo||periodoReporte(null);
  if(!supabaseClient||!currentUser||!tenant)return null;
  const key=claveCacheConsenso(tenant,periodo,seccion);
  if(_consensoPorTenant.has(key))return _consensoPorTenant.get(key);
  try{
    const {data,error}=await supabaseClient.rpc('catalog_consensus_periodo',{p_tenant:tenant,p_periodo:periodo,p_seccion:seccion});
    if(error)throw error;
    const filas=data||[];_consensoPorTenant.set(key,filas);return filas;
  }catch(e){return null;}
}
function consensoCargado(tenant){return _consensoPorTenant.get(claveCacheConsenso(tenant,periodoReporte(null),null))||null;}

// \u00bfHay una versi\u00f3n con m\u00e1s respaldo que la que tiene este ramo?
// --- COMO VAS RESPECTO DE QUIENES CURSAN TU MISMO RAMO ---
// El promedio de cada ramo sube a `curso_notas` y vuelve convertido en una
// posicion: "mejor que el 70%". Nunca baja una nota ajena al navegador: la
// comparacion la hace el servidor y devuelve dos enteros.
//
// UC y FEN siguen usando la sigla. UAI, UAndes y UDD, cuando no la publican,
// comparten la clave de nombre normalizado del consenso dentro de su tenant.

// Se manda el mismo numero que el estudiante ve en su pantalla, no uno
// recalculado: `ramoAvg` es la unica formula de promedio que existe.
// Un ramo NO guarda su sigla como propiedad: la app la deriva del nombre con
// `siglaDeRamo`. Esto se escribio filtrando por `r.sigla`, que es undefined en
// todos, asi que la lista quedaba vacia y no se subio nunca nada. La tabla
// estaba en cero y la seccion no aparecia jamas.
function siglaParaCurso(r,tenant){
  const s=(r&&r.sigla)||siglaDeRamo(r,tenant);
  return typeof s==='string'&&s.trim()?s.trim():null;
}
function claveRamoCurso(r,tenant){
  const sigla=siglaParaCurso(r,tenant);
  if(sigla)return sigla;
  if(!['uai','uandes','udd'].includes(tenant))return null;
  const origen=r&&r.origen;
  const clave=origen&&origen.tenant===tenant&&origen.ramoKey||ramoKey(r&&r.nombre,tenant,origen&&origen.carrera);
  return typeof clave==='string'&&clave.trim()?normName(clave):null;
}
// Qué claves de ramo mandó esta cuenta desde este dispositivo, como [tenant, clave].
// Hasta el 2026-09-29 solo se recorrían los ramos de AHORA: uno borrado, o
// todos al archivar el semestre, nunca recibían el null que los saca, y su
// último promedio quedaba para siempre en `curso_notas` contando en la
// posición de los demás. Lleva dueño para no mezclar cuentas en un navegador
// compartido, y se borra al cerrar sesión.
const CURSO_SIGLAS_KEY='gradehub_curso_siglas';
// La llave de la fila en el servidor: curso_nota_set normaliza igual.
const claveCurso=(tenant,sigla)=>String(tenant).trim().toLowerCase()+'|'+String(sigla).trim().toUpperCase();
function siglasCursoSubidas(){
  try{
    const d=JSON.parse(localStorage.getItem(CURSO_SIGLAS_KEY)||'null');
    return d&&d.owner===currentUser.id&&Array.isArray(d.siglas)?d.siglas.filter(x=>Array.isArray(x)&&x.length===2):[];
  }catch(e){return [];}
}
function guardarSiglasCurso(siglas){
  try{localStorage.setItem(CURSO_SIGLAS_KEY,JSON.stringify({owner:currentUser.id,siglas}));}catch(e){}
}
// Lo último que se subió, por cuenta. Si cambió un promedio (o es otra cuenta),
// la comparación guardada ya no vale y se vuelve a pedir; si no cambió nada,
// no se repiten las llamadas cada vez que se abre Estadísticas.
let _firmaNotasCurso=null;
async function subirNotasCurso(){
  if(esCuentaProfesor())return;
  if(!supabaseClient||!currentUser)return;
  const firma=currentUser.id+'|'+JSON.stringify((S.ramos||[]).map(r=>[claveRamoCurso(r,S.tenant),ramoAvg(r,undefined,S.ramos)]));
  if(firma===_firmaNotasCurso)return;
  invalidarPosicionesCurso();
  let fallos=0;
  const vigentes=new Map();
  for(const r of (S.ramos||[])){
    const sigla=claveRamoCurso(r,S.tenant);
    if(!sigla)continue;
    vigentes.set(claveCurso(S.tenant,sigla),[S.tenant,sigla]);
    const avg=ramoAvg(r,undefined,S.ramos);
    try{
      const {error}=await supabaseClient.rpc('curso_nota_set',{
        p_tenant:S.tenant,p_sigla:sigla,
        // null saca el ramo del curso: sin notas no hay con que compararse, y
        // dejarlo congelado en su ultima nota ensuciaria el agregado ajeno.
        p_promedio:(avg===null||avg===undefined)?null:avg
      });
      // El cliente de Supabase DEVUELVE el error, no lo lanza: sin esta linea
      // el catch no se activa nunca y un rechazo se pierde entero. Es el mismo
      // agujero que tenia `syncNow` y que hizo invisible la perdida de notas.
      if(error)throw error;
    }catch(e){fallos++;}
  }
  // Lo que se mandó antes y ya no es de ningún ramo (se borró, se archivó el
  // semestre, cambió la sigla o la universidad) sale del curso. Una sigla que
  // otro ramo vigente comparte no se toca. Si el null falla, se sigue
  // recordando para reintentarlo.
  const quedan=[];
  for(const [tenant,sigla] of siglasCursoSubidas()){
    if(vigentes.has(claveCurso(tenant,sigla)))continue;
    try{
      const {error}=await supabaseClient.rpc('curso_nota_set',{p_tenant:tenant,p_sigla:sigla,p_promedio:null});
      if(error)throw error;
    }catch(e){fallos++;quedan.push([tenant,sigla]);}
  }
  guardarSiglasCurso([...vigentes.values(),...quedan]);
  // Que falle no puede romper Estadisticas, pero tampoco puede desaparecer: un
  // catch mudo aca fue la razon de que esto llevara dias sin funcionar.
  if(fallos)console.warn('No se pudieron subir '+fallos+' promedios al curso');
  // Con fallos se reintenta la próxima vez en vez de dar la subida por hecha.
  else _firmaNotasCurso=firma;
}

// El total incluye a quien consulta: diez compañeros requieren once personas.
// Se valida al recibir y también al pintar, por si queda una caché anterior.
function posicionCursoVisible(f){
  return !!f&&Number.isInteger(f.total)&&f.total>=11&&Number.isFinite(f.mejorQue)&&f.mejorQue>=0&&f.mejorQue<=100;
}
let _posCursoCache=null;
async function cargarPosicionesCurso(){
  if(esCuentaProfesor())return null;
  if(!supabaseClient||!currentUser)return null;
  if(_posCursoCache)return _posCursoCache;
  const out={};
  for(const r of (S.ramos||[])){
    const sigla=claveRamoCurso(r,S.tenant);
    if(!sigla)continue;
    try{
      const {data,error}=await supabaseClient.rpc('curso_posicion',{p_tenant:S.tenant,p_sigla:sigla});
      if(error)throw error;
      const fila=Array.isArray(data)?data[0]:data;
      // Sin fila = no hay comparación disponible. No se distingue de "fallo la red" a
      // proposito: en los dos casos no hay nada que mostrar.
      // Los dos tienen que ser numero: la frase le resta 1 al total para hablar
      // de companeros, y un total que no lo sea la deja diciendo "NaN".
      if(fila&&typeof fila.mejor_que==='number'&&typeof fila.total==='number'&&posicionCursoVisible({total:fila.total,mejorQue:fila.mejor_que}))out[r.id]={total:fila.total,mejorQue:fila.mejor_que};
    }catch(e){}
  }
  _posCursoCache=out;
  return out;
}
function invalidarPosicionesCurso(){_posCursoCache=null;}

// Apagar esto esconde la seccion para quien lo apaga. Su nota sigue contando en
// el agregado del curso, que es anonimo y no muestra nombres: si cada uno
// pudiera sacarse, el promedio dejaria de representar al curso y la comparacion
// no valdria para nadie.
// --- QUE ESTADISTICAS SEA DE QUIEN LA MIRA ---
// Cada seccion responde una pregunta distinta y no a todos les sirve la misma.
// Quien ya sabe como va no necesita el ritmo arriba; a quien le importa el
// ranking lo quiere primero. En vez de discutir un orden universal, se deja
// mover y esconder.
//
// El orden vive como lista de ids y no como numeros: agregar una seccion nueva
// no obliga a renumerar lo que el estudiante ya acomodo.
