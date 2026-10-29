function ramoKey(nombre,tenant,carrera,sigla){
  // Dos carreras que le dicen distinto al mismo ramo tienen que dar la misma
  // clave, o sus reportes no se juntan nunca y el consenso no llega a tres.
  nombre=sinonimoDe(nombre,tenant)||nombre;
  if(tenant!=='uc')return normName(nombre);
  if(typeof sigla==='string'&&sigla.trim())return sigla.trim().toUpperCase();
  const directa=siglaUC(nombre,carrera);if(directa)return directa;
  const credito=Object.keys(CREDITOS_UC||{}).find(n=>normName(n)===normName(nombre));
  if(credito&&CREDITOS_UC[credito]&&CREDITOS_UC[credito][1])return CREDITOS_UC[credito][1];
  const completa=cursoUcCompleto(nombre,null);
  return (completa&&completa[0])||normName(nombre);
}
function origenActual(nombre,sigla){return {tenant:S.tenant,carrera:S.carrera,ramoKey:ramoKey(nombre,S.tenant,S.carrera,sigla)};}

// La clave de consenso se fija al CREAR el ramo y se guarda para que sobreviva
// a que el estudiante le cambie el nombre. Eso está bien y no se toca.
//
// Pero un sinónimo declarado DESPUÉS deja dos claves vivas para el mismo ramo,
// y sus reportes dejan de sumar entre sí: justo lo que el sinónimo venía a
// arreglar. Acá se canoniza la clave GUARDADA. No se recalcula desde el nombre
// —eso borraría lo que la clave protege— y no toca ninguna clave que no esté
// declarada como sinónimo.
function claveCanonica(clave,tenant,carrera){
  if(!clave)return clave;
  const tabla=(typeof SINONIMOS!=='undefined'&&SINONIMOS[tenant])||{};
  const alias=Object.keys(tabla).find(x=>normName(x)===normName(clave));
  return alias?ramoKey(tabla[alias],tenant,carrera):clave;
}

// \u2500\u2500\u2500 REPORTES DE CAT\u00c1LOGO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Si a un estudiante le cambiaron las ponderaciones respecto de lo que trae el
// cat\u00e1logo, puede reportarlo. Cuando varios coinciden en la MISMA estructura,
// esa versi\u00f3n pasa a ser la sugerida para los dem\u00e1s.

// Estructura m\u00ednima y ordenada de un ramo, para comparar y contar consenso.
function estructuraDe(r){
  return ordenarEstructuraConsenso(catsDePauta(r.categorias)
    .map(c=>{
      const g=(r.gates||[]).find(x=>x.catId===c.id);
      // r2, no un decimal. Con un decimal, los tres Controles de Lectura de
      // Contabilidad (3,33 · 3,33 · 3,34) se reportaban como 3,3 y la pauta
      // sumaba 99,9: el modal abría bloqueado con "Falta 0.1%" sin que el
      // estudiante tocara nada, y la RPC la habría rechazado igual. El resto
      // del camino del reporte ya trabajaba con dos decimales —parsePesoReporte
      // usa r2—, así que el único que cortaba era este.
      const o={nombre:c.nombre,peso:r2(c.peso||0)};
      if(c.slots>1)o.slots=c.slots;
      if(g){o.min=g.min;o.cap=g.cap;}
      return o;
    }));
}

// Orden por nombre normalizado, NO por localeCompare(): sin locale fijo,
// localeCompare usa el idioma del dispositivo y "Óptica" va antes de "Oral"
// en español pero después en polaco. El orden viaja dentro de `estructura` y
// de la huella, así que dos estudiantes con la MISMA pauta y distinto idioma
// no agruparían nunca y el consenso no se formaría, en silencio. El segundo
// criterio desempata los nombres que normalizan igual.
function ordenarEstructuraConsenso(est){
  return [...(est||[])].sort((a,b)=>{
    const ka=normName(a.nombre),kb=normName(b.nombre);
    if(ka!==kb)return ka<kb?-1:1;
    return a.nombre<b.nombre?-1:a.nombre>b.nombre?1:0;
  });
}

// Lo que de verdad se reporta: la pauta sin las evaluaciones en 0%.
//
// Una evaluación en 0% no aporta al promedio, así que no forma parte de la
// ponderación — pero sí rompía el consenso, que agrupa por estructura exacta.
// Pasó de verdad: cinco personas reportaron Métodos Matemáticos I diciendo
// exactamente lo mismo (tres de 20% y examen de 40%) y quedaron en cinco grupos
// de uno, porque a cada una le sobró la evaluación vieja de la pauta oficial y
// la dejó en 0% con un nombre distinto: "Solemne", "N", "O", "X". Cinco
// personas de acuerdo y consenso cero.
//
// Se filtra al ENVIAR y al comparar, no al armar el borrador: en el modal el
// estudiante tiene que poder ver una fila en 0% para subirla.
function estructuraParaConsenso(est){
  return ordenarEstructuraConsenso((est||[])
    .filter(e=>Number(e.peso)>0)
    .map(e=>({...e,nombre:limpiarNombreAjeno(e.nombre)})));
}

// Huella estable: dos reportes que describen la MISMA pauta producen la misma
// cadena aunque la hayan escrito distinto. Solo sirve para agrupar reportes:
// no cambia los nombres que alguien ve ni la pauta que se guarda.
//
// `public.huella_catalogo()` en supabase/catalog_consensus.sql hace lo mismo y
// es la que decide en el servidor. Si cambias una regla ac\u00e1, c\u00e1mbiala all\u00e1.
//
// Nombre: sin may\u00fasculas ni tildes, "Solemne3" = "Solemne 3", y cada palabra de
// 4+ letras en singular, porque "Controles" y "Control" son la misma evaluaci\u00f3n.
// Sin conectores: "Controles Ejercicios" y "Control de Ejercicios" tambi\u00e9n lo
// son (Contabilidad FEN, 2026-10-05). `conConectores` es la regla anterior, solo
// para reconocer lo que ya se envi\u00f3 con ella (ver yaAportada).
function singularHuella(p){
  if(!/^[a-z]{4,}$/.test(p))return p;
  return p.replace(/zz/g,'z').replace(/s$/,'').replace(/([lrndjz])e$/,'$1');
}
const CONECTORES_HUELLA=new Set(['de','del','la','las','el','los','y','e','en']);
function nombreHuella(nombre,conConectores){
  return normName(nombre).replace(/\s+/g,' ')
    .replace(/([a-z])(?=\d)|(\d)(?=[a-z])/g,'$& ')
    .split(' ').filter(w=>w&&(conConectores||!CONECTORES_HUELLA.has(w))).map(singularHuella).join(' ');
}
// Tres o m\u00e1s evaluaciones numeradas del mismo nombre y el mismo peso son una
// categor\u00eda con casillas: "Control 1, 2 y 3" de 10% cada uno = "Controles" de
// 30% con 3 casillas, que calculan igual. Con pesos distintos NO se juntan:
// 30/35/35 promediado en partes iguales ser\u00eda otra pauta. Tampoco si alguna
// trae casillas o compuerta propia.
const MIN_NUMERADAS_HUELLA=3;
function agruparNumeradasHuella(filas){
  const series=new Map();
  filas.forEach(f=>{
    const m=/^(.+) (\d+)$/.exec(f.clave);
    if(!m||f.slots>1||f.min||f.cap)return;
    if(!series.has(m[1]))series.set(m[1],[]);
    series.get(m[1]).push(f);
  });
  const fuera=new Set(),grupos=[];
  series.forEach((serie,base)=>{
    const pesos=serie.map(f=>f.peso);
    if(serie.length<MIN_NUMERADAS_HUELLA||Math.max(...pesos)-Math.min(...pesos)>0.011)return;
    serie.forEach(f=>fuera.add(f));
    // 3 \u00d7 6,67 = 20,01 es el 20% repartido en tres: cada peso viene redondeado
    // a dos decimales, as\u00ed que la suma puede correrse hasta 0,005 por casilla.
    const total=pesos.reduce((s,p)=>s+p,0),entero=Math.round(total);
    const peso=Math.abs(total-entero)<=0.005*serie.length+0.001?entero:r2(total);
    grupos.push({clave:base,peso,slots:serie.length,min:0,cap:0});
  });
  return filas.filter(f=>!fuera.has(f)).concat(grupos);
}
function huellaEstructura(est,conConectores){
  // Las filas en 0% no son parte de la pauta (#272). Los reportes anteriores a
  // ese arreglo las traen guardadas, y el servidor también las descarta.
  const filas=(est||[]).filter(e=>Number(e.peso)>0).map(e=>({clave:nombreHuella(e.nombre,conConectores),peso:Number(e.peso),
    slots:Number(e.slots)||1,min:e.min||0,cap:e.cap||0}));
  // sort() sin comparador ordena por c\u00f3digo, igual en todos los dispositivos y
  // igual que `collate "C"` en el servidor.
  return agruparNumeradasHuella(filas)
    .map(f=>[f.clave,f.peso,f.slots,f.min,f.cap].join('~')).sort().join('|');
}

// El reporte tiene su propio borrador: corregir lo que se envía al catálogo no
// puede cambiar la pauta, las notas ni los promedios guardados del estudiante.
