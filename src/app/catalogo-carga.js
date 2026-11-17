
// ─── CATÁLOGO · ACCESO ───────────────────────────────────────────────────────
// Carreras, mallas y portales viven en data.js. Acá solo se elige cuál aplica
// según el tenant.
// Todas las carreras que se pueden DECLARAR, con las que tienen malla primero.
// Si no tenemos la oferta de esa universidad, cae a las que sí tienen malla:
// nunca devuelve vacío, porque un paso obligatorio sin opciones deja al
// estudiante encerrado en el onboarding.
function carrerasDeclarables(t){
  const lista=(typeof CARRERAS_DECLARABLES!=='undefined'&&CARRERAS_DECLARABLES[t])||null;
  if(lista&&lista.length)return lista.slice().sort((a,b)=>(b.malla?1:0)-(a.malla?1:0)||a.n.localeCompare(b.n,'es'));
  return Object.entries(carrerasFor(t)).filter(([c])=>c!=='OTRA').map(([malla,n])=>({n,malla}));
}
// Los sinónimos solo amplían la búsqueda: elegir una opción conserva su nombre
// y código canónicos. No crea otra carrera ni reinterpreta una cuenta existente.
function coincideBusquedaCarrera(carrera,consulta){
  const q=normName(consulta||'');
  return [carrera.n,...(carrera.alias||[])].some(n=>normName(n).includes(q));
}
function carrerasFor(t){
  if(t==='uc')return CARRERAS_UC;
  if(t==='uai')return CARRERAS_UAI;
  if(t==='uandes')return CARRERAS_UANDES;
  if(t==='fen')return CARRERAS;
  // Una universidad sin lista heredada no recibe las carreras de la FEN: al
  // cambiarse a ella en Ajustes, un código como 'IC' quedaba marcado.
  return {};
}
// Solo devuelve una malla si la tenemos verificada para ESA universidad. El
// default era `MALLA`, la de la FEN: cualquier universidad que no fuera UC
// recibía las mallas de Economía y Negocios de la Chile. Con dos tenants
// visibles no se notaba; al agregar el tercero, sí.
function mallaFor(t){
  if(t==='uc')return MALLA_UC;
  if(t==='fen')return MALLA;
  return {};   // sin malla verificada: el estudiante arma sus ramos
}

// La malla de UNA carrera, mirando también las que se cargan aparte. Es distinta
// de `mallaFor`, que reúne las mallas base de una universidad: el buscador puede
// sumar esta malla propia sin meter también las otras 19 de la UAI ni las otras
// 68 de la UC. Así conserva el contexto del estudiante sin contaminar resultados.
function mallaDeCarrera(tenant,carrera){
  if(!carrera)return null;
  const base=(mallaFor(tenant)||{})[carrera];
  if(base)return base;
  const extra=mallasExtraDe(tenant);
  return (extra&&extra[carrera])||null;
}
// Las mallas que viven en su propio archivo, por universidad.
function mallasExtraDe(tenant){
  if(tenant==='uc'&&typeof MALLAS_UC_EXTRA!=='undefined')return MALLAS_UC_EXTRA;
  if(tenant==='uai'&&typeof MALLAS_UAI_EXTRA!=='undefined')return MALLAS_UAI_EXTRA;
  if(tenant==='uandes'&&typeof MALLAS_UANDES_EXTRA!=='undefined')return MALLAS_UANDES_EXTRA;
  if(tenant==='udd'&&typeof MALLAS_UDD_EXTRA!=='undefined')return MALLAS_UDD_EXTRA;
  return null;
}
// Qué archivo trae las mallas diferidas de cada universidad. Sin entrada acá,
// el tenant funciona igual: sin sugerencia automática y agregando ramos a mano.
const ARCHIVO_MALLAS={uc:'mallas-uc.js',uai:'mallas-uai.js',uandes:'mallas-uandes.js',udd:'mallas-udd.js'};

// Las mallas extra de UC y UAI se traen cuando se necesitan y no en cada carga:
// meterlas en data.js habría cobrado ese peso a todo el mundo, incluida la gente
// de FEN. Del archivo completo solo entra al buscador la carrera propia.
//
// Si la descarga falla, la app conserva los presets y catálogos que ya venían
// disponibles y siempre deja agregar el ramo a mano. Un fallo acá no puede
// romper el selector completo.
const _mallasPendientes={};
function cargarMallasUC(tenant){
  tenant=tenant||'uc';
  const archivo=ARCHIVO_MALLAS[tenant];
  if(!archivo)return Promise.resolve(false);
  if(_mallasPendientes[tenant])return _mallasPendientes[tenant];
  _mallasPendientes[tenant]=new Promise(resolve=>{
    if(mallasExtraDe(tenant))return resolve(true);
    const s=document.createElement('script');
    // Hereda el ?v=<sha> del propio app.js: el deploy sella los assets del HTML y
    // este se pide desde JS, así que sin copiar ese query quedaría sin versionar
    // y el service worker podría servir una copia vieja tras un deploy.
    const propio=document.querySelector('script[src*="app.js"]');
    const qs=propio&&propio.src.includes('?')?propio.src.slice(propio.src.indexOf('?')):'';
    s.src=archivo+qs;
    s.onload=()=>resolve(true);
    s.onerror=()=>{_mallasPendientes[tenant]=null;resolve(false);};
    document.head.appendChild(s);
  });
  return _mallasPendientes[tenant];
}

// El catálogo completo de la UC pesa mucho más que el arranque de la app y no
// le sirve a otros tenants. Conservamos CURSOS_UC como catálogo mínimo y
// sumamos el archivo diferido cuando llega: si la red falla, buscar sigue
// funcionando exactamente con los datos que ya venían en data.js.
function cursosUcExtra(){
  return typeof CURSOS_UC_FULL!=='undefined'&&Array.isArray(CURSOS_UC_FULL)?CURSOS_UC_FULL:null;
}
function cursosUcDisponibles(){
  const base=typeof CURSOS_UC!=='undefined'&&Array.isArray(CURSOS_UC)?CURSOS_UC:[];
  const extra=cursosUcExtra();
  // La versión completa va primero para que, al reemplazar la muestra, sus
  // créditos y escuela enriquezcan las filas que también existen en el
  // respaldo chico. Las siglas repetidas se filtran al armar el catálogo.
  // Sin el archivo, entran los cursos que ya trajo el servidor.
  return extra?extra.concat(base):_cursosUcRemotos.concat(base);
}
let _cursosUcPendiente=null;
function cargarCursosUC(){
  if(_cursosUcPendiente)return _cursosUcPendiente;
  if(cursosUcExtra())return (_cursosUcPendiente=Promise.resolve(true));
  _cursosUcPendiente=new Promise(resolve=>{
    const s=document.createElement('script');
    // Igual que las mallas, hereda la versión sellada de app.js para que un
    // HTML nuevo nunca se mezcle con una copia vieja del catálogo.
    const propio=document.querySelector('script[src*="app.js"]');
    const qs=propio&&propio.src.includes('?')?propio.src.slice(propio.src.indexOf('?')):'';
    s.src='cursos-uc.js'+qs;
    s.onload=()=>{
      const ok=!!cursosUcExtra();
      if(!ok)_cursosUcPendiente=null;
      resolve(ok);
      if(ok)completarCreditosUCTrasCarga();
    };
    s.onerror=()=>{_cursosUcPendiente=null;resolve(false);};
    document.head.appendChild(s);
  });
  return _cursosUcPendiente;
}
function escuelaCursoUc(indice){
  if(typeof ESCUELAS_UC==='undefined'||!Array.isArray(ESCUELAS_UC))return null;
  return Number.isInteger(indice)&&typeof ESCUELAS_UC[indice]==='string'?ESCUELAS_UC[indice]:null;
}
function cursoUcCompleto(nombre,sigla){
  // Sin el archivo completo, un curso que llegó del servidor igual aporta su
  // sigla y sus créditos al agregarlo.
  const extra=cursosUcExtra()||_cursosUcRemotos;
  if(!extra.length)return null;
  const ns=normName(sigla||''),nn=normName(nombre||'');
  return extra.find(f=>{
    if(!Array.isArray(f))return false;
    return (ns&&normName(f[0]||'')===ns)||(!ns&&nn&&normName(f[1]||'')===nn);
  })||null;
}
// Los créditos de un ramo escrito a mano que resulta ser uno del catálogo.
//
// Durante el onboarding los ~660 KB todavía no llegaron, así que buscar un
// electivo no encuentra nada y la persona termina escribiendo el nombre. Ese
// ramo queda con `origen:null`, y hasta ahora se quedaba sin créditos PARA
// SIEMPRE aunque el dato estuviera en el catálogo desde el principio: la
// función de abajo exigía procedencia y lo saltaba en cada carga posterior.
//
// Se completa SOLO el número. No se le pone sigla ni procedencia: darle origen
// de catálogo le cargaría además su pauta oficial, y eso sí sería reinterpretar
// un ramo que la persona declaró como suyo. Los créditos son un hecho del
// curso; la pauta es una decisión de quien lo cursa.
//
// Y solo cuando el nombre es inequívoco. Hoy ningún nombre del catálogo repite
// con créditos distintos, así que la guarda no se dispara nunca — está igual
// porque el catálogo se edita todo el tiempo y crece con cada semestre. El día
// que aparezcan dos siglas con el mismo nombre y distinto SCT, sin esto
// elegiríamos una al azar y nadie se enteraría.
//
// Sin el archivo completo, mira las filas que trajo `catalogo_uc`: la consulta
// por `busqueda` exacta devuelve TODAS las siglas con ese nombre, así que la
// guarda ve los mismos repetidos que veía con el archivo.
function creditosUCPorNombreUnico(nombre){
  const filas=cursosUcExtra()||_cursosUcRemotos;
  if(!filas.length||!nombre)return null;
  const n=normName(nombre);
  if(!n)return null;
  let cr=null;
  for(const f of filas){
    if(!Array.isArray(f)||normName(f[1]||'')!==n)continue;
    if(typeof f[2]!=='number')return null;
    if(cr===null)cr=f[2];
    else if(cr!==f[2])return null;
  }
  return cr;
}
// El archivo grande llega después de normalize() y también puede llegar mientras
// alguien agrega un ramo desde el catálogo mínimo. Solo completamos créditos
// ausentes; nunca corregimos un valor ya guardado.
function completarCreditosUCTrasCarga(){
  if(S.tenant!=='uc'||!S.onboardingDone||!(cursosUcExtra()||_cursosUcRemotos.length))return false;
  const modoAntes=gpaMode(S.ramos||[]);
  let agregados=0;
  (S.ramos||[]).forEach(r=>{
    if(r.creditos!==null&&r.creditos!==undefined)return;
    if(r.origen&&r.origen.tenant==='uc'){
      sellarDatosCatalogo(r,'uc');
      if(typeof r.creditos==='number')agregados++;
      return;
    }
    // Con procedencia de otra universidad no se toca: sus créditos salen de su
    // propia tabla y el catálogo UC no tiene nada que decir ahí.
    if(r.origen)return;
    const cr=creditosUCPorNombreUnico(r.nombre);
    if(typeof cr==='number'){r.creditos=cr;agregados++;}
  });
  if(!agregados)return false;
  // Una sola escritura/sync para la carga completa, no una por ramo. save()
  // mantiene intacta la clave y el camino habitual de respaldo.
  save();
  renderHome();renderStats();
  // Si con esto todos los ramos con nota tienen créditos, el promedio general
  // cambia de número: se avisa una vez para que no asuste (Lucas, 2026-11-02).
  // No se repite porque después el modo ya es 'creditos'.
  if(modoAntes==='simple'&&gpaMode(S.ramos)==='creditos')
    showToast('Completamos los créditos de tus ramos: tu promedio general ahora se pondera por créditos');
  return true;
}
// El catálogo completo de la UC son 11.853 ramos en un archivo de ~660 KB que se
// baja aparte. Mientras no llega, buscar una sigla no encuentra nada — y decirle
// a alguien "no está, lo agregamos como ramo tuyo" en ese momento le hace crear
// a mano un ramo que SÍ tenemos, perdiendo su sigla, sus créditos y su pauta.
// Con 11 mil pautas en camino ese es justo el error que más cuesta.
