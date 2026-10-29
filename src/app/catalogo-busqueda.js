const _indicesBusquedaCatalogo=new Map();
function fuentesDiferidasCatalogo(tenant){
  return {
    mallas:mallasExtraDe(tenant),
    cursos:tenant==='uc'?cursosUcExtra():null,
    remotos:tenant==='uc'?_cursosUcRemotos:null,
    consenso:consensoCargado(tenant),
  };
}
// El catálogo escribe el nivel en romano —"Matemáticas Avanzadas II"— y la
// gente escribe el número. Nadie teclea romanos en el teléfono: buscar
// "matematicas avanzadas 2" no devolvía NADA, aunque el ramo estuviera en su
// propia malla.
//
// Va aparte de `normName` a propósito, y esto importa: `normName` decide
// IDENTIDAD —con qué preset calza un ramo, qué clave de consenso le toca, si
// dos ramos guardados son el mismo— y tocarla reinterpretaría datos que ya
// están guardados. Esto solo cambia qué aparece mientras alguien escribe.
const ROMANOS_BUSQUEDA={i:'1',ii:'2',iii:'3',iv:'4',v:'5',vi:'6',vii:'7',viii:'8',ix:'9',x:'10',xi:'11',xii:'12'};
function normBusqueda(s){
  return String(s||'').split(' ').map(t=>ROMANOS_BUSQUEDA[t]||t).join(' ');
}
// Palabras de enlace que no distinguen un ramo de otro. Un estudiante UAI dijo
// "Razonamiento Cuantitativo DE Datos" y el catálogo dice "CON Datos": esa
// palabra de tres letras hacía desaparecer el ramo entero de los resultados,
// porque el calce por tokens exige que estén TODOS.
//
// Solo se sacan de la consulta, nunca del nombre del ramo: si alguien busca
// exactamente "de la" no queremos que calce con todo.
const ENLACES_BUSQUEDA=new Set(['de','del','la','el','los','las','y','e','o','u','con','a','al','en','para','un','una','sobre']);
function indiceBusquedaCatalogo(tenant,carrera){
  const key=catalogKey(tenant,carrera),fuentes=fuentesDiferidasCatalogo(tenant);
  const guardado=_indicesBusquedaCatalogo.get(key);
  if(guardado&&guardado.mallas===fuentes.mallas&&guardado.cursos===fuentes.cursos&&guardado.remotos===fuentes.remotos&&guardado.consenso===fuentes.consenso)return guardado;
  const todos=catalogRamosUniversidad(tenant,carrera);
  const indice={
    mallas:fuentes.mallas,cursos:fuentes.cursos,remotos:fuentes.remotos,consenso:fuentes.consenso,todos,
    filas:todos.map(r=>{
      const nombre=normName(r.nombre);
      return {ramo:r,nombre,sigla:normName(r.sigla||''),busqueda:normBusqueda(nombre)};
    }),
    ordenes:new Map(),
  };
  _indicesBusquedaCatalogo.set(key,indice);
  return indice;
}
// "Álgebra (MAT1289)": el mismo nombre que otro ramo, con su código al lado para
// poder distinguirlos. Se reconoce por la forma y no por una marca en el dato
// porque la etiqueta se arma al generar el catálogo, no en la app.
const SIGLA_EN_ETIQUETA=/ \([A-Z]{2,4}\d{3,4}[A-Z]?\)$/;
// La misma forma sobre el nombre ya normalizado, que viene en minúsculas.
const SIGLA_NORMALIZADA=/ \([a-z]{2,4}\d{3,4}[a-z]?\)$/;
function ordenBusquedaCatalogo(indice,semActual){
  const sem=Number(semActual)||0;
  if(indice.ordenes.has(sem))return indice.ordenes.get(sem);
  const filas=indice.filas.slice().sort((a,b)=>{
    const ra=a.ramo,rb=b.ramo;
    if(ra.propio!==rb.propio)return ra.propio?-1:1;
    if(ra.tienePreset!==rb.tienePreset)return ra.tienePreset?-1:1;
    const da=Math.abs(ra.semestre-sem),db=Math.abs(rb.semestre-sem);
    if(da!==db)return da-db;
    return ra.nombre.localeCompare(rb.nombre);
  });
  indice.ordenes.set(sem,filas);
  return filas;
}
function searchCatalog(q,tenant,carrera,semActual){
  const indice=indiceBusquedaCatalogo(tenant,carrera),todos=indice.todos;
  const nq=normName(q);
  // La consulta vacía se usa al abrir el selector. Aprovecha ese momento para
  // dejar listo el desempate antes de que el estudiante empiece a escribir,
  // sin cambiar el orden que históricamente devuelve el catálogo completo.
  const filas=ordenBusquedaCatalogo(indice,semActual);
  if(!nq)return todos.slice();
  const grupos=[[],[],[],[]];
  const nqb=normBusqueda(nq);
  const tkCrudo=nqb.split(/\s+/).filter(Boolean);
  // Los enlaces salen del calce por tokens, no de la consulta entera: el orden
  // exacto y por prefijo sigue compar\u00e1ndose con lo que la persona escribi\u00f3.
  const tk=tkCrudo.filter(t=>!ENLACES_BUSQUEDA.has(t));
  filas.forEach(f=>{
    const r=f.ramo,n=f.nombre,sigla=f.sigla,nb=f.busqueda||n;
    let s=-1;
    if(n===nq||sigla===nq||nb===nqb)s=0;
    else if(n.startsWith(nq)||sigla.startsWith(nq)||nb.startsWith(nqb))s=1;
    else if(n.includes(nq)||sigla.includes(nq)||nb.includes(nqb))s=2;
    else{
      // que "micro 1" encuentre "Microeconom\u00eda I", y "matematicas avanzadas 2"
      // encuentre "Matem\u00e1ticas Avanzadas II". Se exige que la consulta original
      // tuviera m\u00e1s de una palabra para que un token suelto no calce con todo,
      // aunque despu\u00e9s los enlaces la dejen en una sola.
      if(tk.length&&tkCrudo.length>1&&tk.every(t=>nb.includes(t)))s=3;
    }
    // `n` ya viene normalizado por el índice: se conserva en la fila para que el
    // reordenamiento de abajo no tenga que volver a normalizar cada ramo.
    if(s>=0)grupos[s].push({...r,_s:s,_n:n});
  });
  // Las filas ya vienen en el mismo orden de desempate de antes. Separarlas
  // por tipo de coincidencia conserva exacto > prefijo > contenido > tokens,
  // sin ordenar miles de resultados de nuevo en cada tecla.
  const porCoincidencia=grupos[0].concat(grupos[1],grupos[2],grupos[3]);

  // Pero la calidad de la coincidencia no puede mandar sobre de quién es el
  // ramo. Buscando "algebra", un estudiante de Ingeniería recibía primero el
  // "Álgebra" de otra carrera —coincidencia exacta— y su propia "Álgebra
  // Lineal" quedaba segunda, detrás de siete filas que no puede cursar. El
  // ramo de tu malla es literalmente el que vas a tomar: va primero aunque
  // otro calce mejor con lo que escribiste.
  //
  // Y al final van las desambiguaciones —"Álgebra (MAT1289)"—, que existen
  // para distinguir dos ramos con el mismo nombre y son las filas menos
  // informativas de la lista: con once seguidas tapan a "Álgebra Abstracta" o
  // "Álgebra Conmutativa", que sí se distinguen por su nombre.
  // Con una excepción que importa: si la desambiguación pertenece a un ramo que
  // SÍ está en tu malla, no es ruido, es tu otra opción. El plan común de
  // Ingeniería admite "Dinámica" de FIS o de ICE y el estudiante cursa la que le
  // tocó en su horario; mandar "Dinámica (ICE1514)" al fondo la vuelve
  // inencontrable justo para quien la necesita.
  const nombresPropios=new Set();
  porCoincidencia.forEach(r=>{if(r.propio)nombresPropios.add(r._n);});
  const propios=[],normales=[],variantes=[];
  porCoincidencia.forEach(r=>{
    if(r.propio){propios.push(r);return;}
    if(!SIGLA_EN_ETIQUETA.test(r.nombre)){normales.push(r);return;}
    (nombresPropios.has(r._n.replace(SIGLA_NORMALIZADA,''))?propios:variantes).push(r);
  });
  return propios.concat(normales,variantes);
}

// Sello de procedencia para un ramo creado desde el catálogo. La clave queda
// en el ramo, para que el servidor no tenga que duplicar las siglas de data.js.
