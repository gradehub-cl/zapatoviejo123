
// ─── STORAGE ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gradehub_v1';
// Nombres de ramos y evaluaciones: 40 cortaba nombres oficiales a mitad de
// palabra. 80 cubre holgadamente el catálogo actual y mantiene el dato acotado.
const NOMBRE_MAX = 80;
// De quién es la caché local. Evita que un usuario vea los datos del anterior
// si comparten navegador y la carga desde la nube falla.
const CACHE_OWNER_KEY = 'gradehub_cache_owner';
function setCacheOwner(uid){try{if(uid)localStorage.setItem(CACHE_OWNER_KEY,uid);}catch(e){}}
function getCacheOwner(){try{return localStorage.getItem(CACHE_OWNER_KEY);}catch(e){return null;}}

// El período se declara solo cuando el programa lo dice. La pauta de pesos no
// caduca con él, pero una fecha fija sí: `2026-2` deja de ser una fecha útil al
// comenzar enero de 2027. `desconocido` no se traduce como vigente ni vencido;
// sin período confirmado, la app conserva ponderaciones y no precarga fechas.
function estadoPeriodoPauta(periodo,ahora){
  const m=typeof periodo==='string'&&periodo.match(/^(\d{4})-([12])$/);
  if(!m)return 'desconocido';
  const fecha=ahora&&typeof ahora.getTime==='function'?ahora:new Date();
  const anio=Number(m[1]),semestre=Number(m[2]);
  // El período cierra a la medianoche de Chile, no a la de Greenwich: con
  // Date.UTC vencía a las 20:00 o 21:00 del último día (issue #579, punto 14).
  const hoy=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(fecha);
  const fin=semestre===1?`${anio}-08-01`:`${anio+1}-01-01`;
  return hoy<fin?'vigente':'vencido';
}
function definicionPreset(nombre,tenant,carrera){
  if(tenant!=='uc'){
    const presets=PRESETS_POR_TENANT[tenant];if(!presets)return null;
    const clave=claveCatalogo(nombre,Object.keys(presets),tenant);
    return clave?presets[clave]:null;
  }
  if(tenant!=='uc'||!presetUcDisponible(nombre,carrera))return null;
  const clave=claveUc(nombre);
  return clave?PRESETS_UC[clave]:null;
}
// Una pauta que deja la mitad o más del ramo en grupos sin decir cuántas
// evaluaciones llevan ("Evaluaciones sumativas 60%", sin casillas) no sirve para
// saber qué nota necesitas: no dice qué viene ni cuánto pesa cada prueba.
// Pedido de Lucas del 2026-09-25, a partir de Cálculo III. Esas no se cargan ni
// se anuncian; el dato queda en data.js y vuelve solo si se completa.
const PESO_MAX_GRUPOS_SIN_CANTIDAD=0.5;
function pautaPresetSuficiente(evals){
  const conPeso=(evals||[]).filter(e=>Number(e[1])>0);
  const total=conPeso.reduce((n,e)=>n+Number(e[1]),0);
  if(!total)return false;
  const grupos=conPeso.filter(e=>e[2]&&e[2].lista&&!e[2].slots).reduce((n,e)=>n+Number(e[1]),0);
  return grupos/total<PESO_MAX_GRUPOS_SIN_CANTIDAD;
}
function evalsDePreset(def){return Array.isArray(def)?def:(def&&def.evals||[]);}
function periodoDePreset(def){return !Array.isArray(def)&&def&&typeof def.periodo==='string'?def.periodo:null;}
function infoPeriodoPauta(r){
  if(!r||!r.origen||!r.origen.tenant)return null;
  const def=definicionPreset(r.nombre,r.origen.tenant,r.origen.carrera);
  const evals=Array.isArray(def)?def:(def&&def.evals||[]);
  if(!evals.length||!pautaPresetSuficiente(evals))return null;
  const periodo=periodoDePreset(def);
  return {periodo,estadoPeriodo:estadoPeriodoPauta(periodo)};
}

// Las fechas del programa se agregaron después de que miles de ramos ya
// existían, y  solo mira nombre y peso: una fecha nueva no cuenta
// como "la pauta cambió", así que el aviso de actualizar nunca se dispara por
// ella y el ramo se quedaría sin fecha para siempre. Por eso se rellena al
// cargar, igual que la pauta pendiente de acá abajo.
//
// SOLO rellena lo que está vacío. La fecha que escribió el estudiante manda
// sobre la nuestra: puede saber algo que el programa no dice —un cambio
// anunciado en clases, la fecha real de su sección— y pisarla sería moverle la
// Agenda por debajo.
//
// Las cuentas creadas antes de guardar `origen` sí pueden haber recibido una
// pauta oficial, pero hoy se ven igual que un ramo manual. No les inventamos
// esa procedencia: solo usamos el contexto de la cuenta SI la estructura que
// ya tienen coincide completa y en orden con el programa actual. Así una pauta
// manual con el mismo nombre, pero distinta, queda intacta.
function pautaCalzaParaFechas(r,evals){
  const cats=catsDePauta(r&&r.categorias);
  return cats.length===evals.length&&cats.every((c,i)=>{
    const [nombre,peso]=evals[i];
    return normName(c.nombre)===normName(nombre)&&r2(Number(c.peso)||0)===r2(Number(peso)||0);
  });
}
function origenParaFechasOficiales(r,contexto){
  if(r&&r.origen&&r.origen.tenant)return r.origen;
  if(!r||!contexto||!contexto.tenant||!Array.isArray(r.categorias))return null;
  const def=definicionPreset(r.nombre,contexto.tenant,contexto.carrera);
  const evals=Array.isArray(def)?def:(def&&def.evals||[]);
  return def&&pautaCalzaParaFechas(r,evals)?contexto:null;
}
function completarFechasOficiales(r,contexto){
  const origen=origenParaFechasOficiales(r,contexto);
  if(!origen)return;
  const def=definicionPreset(r.nombre,origen.tenant,origen.carrera);
  if(!def||estadoPeriodoPauta(periodoDePreset(def))!=='vigente')return;
  const evals=Array.isArray(def)?def:(def.evals||[]);
  const porNombre=new Map();
  evals.forEach(([nom,,extra])=>{if(extra&&extra.fecha)porNombre.set(normName(nom),extra.fecha);});
  r.categorias.forEach(c=>{
    if(c.fecha)return;
    // `fechaQuitada` distingue "nunca tuvo fecha" de "el estudiante la borró".
    // Sin esa marca las dos se ven igual —ambas son null— y el relleno volvía a
    // poner la fecha oficial en cada carga: quitarla era imposible, la
    // evaluación reaparecía en la Agenda al recargar y no había forma de que la
    // app se enterara de que esa prueba se movió o no va.
    if(c.fechaQuitada)return;
    const f=porNombre.get(normName(c.nombre));
    if(f){c.fecha=f;c.fechaOrigen='catalogo';c.fechaQuitada=false;}
  });
  completarFechasDeSeccion(r,def);
}
// Algunas fechas no son del ramo sino de una sección: los controles de
// Dinámica se rinden en el horario de taller, que cambia entre secciones.
// `fechasPorSeccion` las declara solo para las secciones de las que tenemos
// el dato: `{13:{'Controles':['2026-08-28',…]}}`, una fecha por casilla y en
// orden. Sin sección, o con otra, no se pone nada. Mismas reglas que arriba:
// solo se llena lo vacío y nunca lo que el estudiante borró.
function completarFechasDeSeccion(r,def){
  const porSeccion=!Array.isArray(def)&&def&&def.fechasPorSeccion;
  if(!porSeccion||!Number.isInteger(r.seccion))return;
  const delGrupo=porSeccion[r.seccion];
  if(!delGrupo)return;
  Object.entries(delGrupo).forEach(([nombre,fechas])=>{
    const c=(r.categorias||[]).find(x=>normName(x.nombre)===normName(nombre));
    if(!c||!Array.isArray(fechas))return;
    const slots=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
    if(slots===1){
      if(!c.fecha&&!c.fechaQuitada&&FECHA_RE.test(fechas[0]||'')){c.fecha=fechas[0];c.fechaOrigen='catalogo';c.fechaQuitada=false;}
      return;
    }
    c.notas=Array.isArray(c.notas)?c.notas:[];
    fechas.slice(0,slots).forEach((fecha,slot)=>{
      if(!FECHA_RE.test(fecha||''))return;
      let n=c.notas.find(x=>x.slot===slot);
      if(n&&(n.fecha||n.fechaQuitada))return;
      // Una casilla sin nota se guarda como nota vacía con fecha: es lo mismo
      // que hace la app cuando el estudiante le pone fecha a mano.
      if(!n){n={id:uid(),nombre:etiquetaCasilla(r,c,slot),valor:null,peso:1,slot};c.notas.push(n);}
      n.fecha=fecha;n.fechaOrigen='catalogo';n.fechaQuitada=false;
    });
  });
}

// HH:MM en 24 h. El input[type=time] ya entrega este formato, pero por acá
// también entran respaldos importados y datos de la nube: se valida igual.
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
// Cuándo un plazo pasa a mostrarse en rojo. Dos días deja margen para
// reaccionar: con uno, quien abre la app en la tarde ya no alcanza a mandar
// nada. El rojo acá NO es el del semáforo —no dice nada sobre la nota— sino el
// de urgencia que la app ya usa en errores y en "no alcanza".
const RECORRECCION_DIAS_URGENTE = 2;
const ORIGENES_FECHA=new Set(['usuario','catalogo','calendario','desconocido']);

function origenFechaSeguro(origen){return ORIGENES_FECHA.has(origen)?origen:null;}

// El consenso futuro solo puede contar una decisión explícita del estudiante.
// Catálogo e importación ayudan a llenar la Agenda, pero nunca son un voto.
function fechaAportaRespaldo(item){return !!item&&item.fechaOrigen==='usuario';}
function horaAportaRespaldo(item){return !!item&&item.horaOrigen==='usuario';}

function fechasOficialesRamo(r){
  if(!r||!r.origen||!r.origen.tenant)return new Map();
  const def=definicionPreset(r.nombre,r.origen.tenant,r.origen.carrera);
  const evals=Array.isArray(def)?def:(def&&def.evals||[]);
  const fechas=new Map();
  evals.forEach(([nombre,,extra])=>{if(extra&&extra.fecha)fechas.set(normName(nombre),extra.fecha);});
  return fechas;
}

// Se corre al leer y solo cambia la copia local. No llama a save(): así las
// cuentas antiguas no sincronizan todas juntas al publicar este cambio; los
// campos viajan a la nube con la próxima edición normal de cada persona.
function migrarOrigenesFecha(r){
  const oficiales=fechasOficialesRamo(r);
  (r.categorias||[]).forEach(c=>{
    c.fechaOrigen=c.fecha?(origenFechaSeguro(c.fechaOrigen)||(oficiales.get(normName(c.nombre))===c.fecha?'catalogo':'desconocido')):null;
    c.horaOrigen=c.hora?(origenFechaSeguro(c.horaOrigen)||'desconocido'):null;
    c.fechaQuitada=!!c.fechaQuitada;c.horaQuitada=!!c.horaQuitada;
    (c.notas||[]).forEach(n=>{
      n.fechaOrigen=n.fecha?(origenFechaSeguro(n.fechaOrigen)||'desconocido'):null;
      n.horaOrigen=n.hora?(origenFechaSeguro(n.horaOrigen)||'desconocido'):null;
      n.fechaQuitada=!!n.fechaQuitada;n.horaQuitada=!!n.horaQuitada;
    });
  });
}

// Editar o confirmar vuelve la fecha una decisión del estudiante. Al quitarla,
// la marca persiste para que ni el catálogo ni una futura sugerencia la reponga.
function marcarFechaUsuario(item,fecha,hora){
  const teniaHora=!!item.hora;
  item.fecha=fecha||null;
  item.hora=item.fecha&&HORA_RE.test(hora||'')?hora:null;
  if(item.fecha){item.fechaOrigen='usuario';item.fechaQuitada=false;}
  else{item.fechaOrigen=null;item.fechaQuitada=true;}
  if(item.hora){item.horaOrigen='usuario';item.horaQuitada=false;}
  else{item.horaOrigen=null;if(teniaHora)item.horaQuitada=true;}
  if(!item.fecha){item.hora=null;item.horaOrigen=null;item.horaQuitada=true;}
  return item;
}

function copiarRecuperativo(regla){
  if(!regla||!Number.isFinite(regla.min)||!Number.isFinite(regla.max)||!Number.isFinite(regla.nota)||regla.min>regla.max)return null;
  return {min:regla.min,max:regla.max,nota:regla.nota};
}
function copiarReemplazosOptativos(lista){
  const reglas=(Array.isArray(lista)?lista:[]).filter(r=>r&&['mezcla','reemplazo'].includes(r.tipo)&&
    typeof r.fuenteId==='string'&&Array.isArray(r.destinosIds)&&r.destinosIds.length&&
    r.destinosIds.every(id=>typeof id==='string')&&
    (!r.rendidasIds||Array.isArray(r.rendidasIds)&&r.rendidasIds.every(id=>typeof id==='string'))&&
    (r.tipo!=='mezcla'||Number.isFinite(r.fraccion)&&r.fraccion>0&&r.fraccion<=1))
    .map(r=>({tipo:r.tipo,fuenteId:r.fuenteId,destinosIds:r.destinosIds.slice(),
      rendidasIds:(r.rendidasIds||[]).slice(),...(Number.isFinite(r.minFuente)?{minFuente:r.minFuente}:{}),
      ...(r.cantidad==='todas'?{cantidad:'todas'}:{}),
      ...(r.tipo==='mezcla'?{fraccion:r.fraccion}:{})}));
  return reglas.length?reglas:null;
}
function resolverReemplazosOptativos(def,categorias){
  const lista=!Array.isArray(def)&&def&&def.reemplazosOptativos;
  if(!Array.isArray(lista))return null;
  const idDe=nombre=>{const c=categorias.find(x=>normName(x.nombre)===normName(nombre));return c&&c.id;};
  return copiarReemplazosOptativos(lista.map(r=>({tipo:r.tipo,fuenteId:idDe(r.fuente),
    destinosIds:(r.destinos||[]).map(idDe),rendidasIds:(r.rendidas||[]).map(idDe),
    minFuente:r.minFuente,fraccion:r.fraccion,cantidad:r.cantidad})).filter(r=>r.fuenteId&&r.destinosIds.every(Boolean)&&r.rendidasIds.every(Boolean)));
}
function copiarReglasAusenciaIds(regla){
  if(!regla)return null;
  const copiar=lista=>(Array.isArray(lista)?lista:[]).filter(x=>x&&typeof x.desdeId==='string'&&typeof x.haciaId==='string').map(x=>({desdeId:x.desdeId,haciaId:x.haciaId}));
  const reemplazos=copiar(regla.reemplazos),traspasos=copiar(regla.traspasos);
  const promedios=(Array.isArray(regla.promedios)?regla.promedios:[])
    .filter(x=>x&&typeof x.desdeId==='string'&&Array.isArray(x.deIds)&&x.deIds.every(id=>typeof id==='string'))
    .map(x=>({desdeId:x.desdeId,deIds:x.deIds.slice()}));
  const reemplazosCasilla=(Array.isArray(regla.reemplazosCasilla)?regla.reemplazosCasilla:[])
    .filter(x=>x&&typeof x.desdeId==='string'&&typeof x.haciaId==='string'&&Number.isInteger(x.desdeSlot)&&x.desdeSlot>=0&&(!('haciaSlot' in x)||(Number.isInteger(x.haciaSlot)&&x.haciaSlot>=0)))
    .map(x=>({desdeId:x.desdeId,desdeSlot:x.desdeSlot,haciaId:x.haciaId,...(Number.isInteger(x.haciaSlot)?{haciaSlot:x.haciaSlot}:{})}));
  return reemplazos.length||traspasos.length||promedios.length||reemplazosCasilla.length?{reemplazos,traspasos,promedios,reemplazosCasilla,
    ...(Number.isInteger(regla.maxReemplazos)&&regla.maxReemplazos>=1?{maxReemplazos:regla.maxReemplazos}:{}),
    ...(Number.isInteger(regla.maxTraspasos)&&regla.maxTraspasos>=1?{maxTraspasos:regla.maxTraspasos}:{}),
    ...(regla.excesoReemplazos==='rezago'?{excesoReemplazos:'rezago'}:{}),
    ...(Number.isInteger(regla.maxPromedios)&&regla.maxPromedios>=1?{maxPromedios:regla.maxPromedios}:{}),
    ...(Number.isFinite(regla.notaExceso)&&regla.notaExceso>=1&&regla.notaExceso<=7?{notaExceso:regla.notaExceso}:{})}:null;
}
function copiarReglasAusenciaUsuario(regla){
  if(!regla||regla.declaradaPor!=='estudiante')return null;
  const base=copiarReglasAusenciaIds(regla)||{reemplazos:[],traspasos:[]};
  const rezagos=(Array.isArray(regla.rezagos)?regla.rezagos:[])
    .filter(x=>x&&typeof x.desdeId==='string')
    .map(x=>({desdeId:x.desdeId}));
  return rezagos.length||base.reemplazos.length||base.traspasos.length
    ?{declaradaPor:'estudiante',rezagos,reemplazos:base.reemplazos,traspasos:base.traspasos}:null;
}
function resolverReglasAusencia(def,categorias){
  const declaracion=!Array.isArray(def)&&def&&def.ausenciasJustificadas;
  if(!declaracion||!Array.isArray(categorias))return null;
  const idDe=nombre=>{const c=categorias.find(x=>normName(x.nombre)===normName(nombre));return c&&c.id;};
  const resolver=lista=>(Array.isArray(lista)?lista:[]).map(x=>({desdeId:idDe(x.desde),haciaId:idDe(x.hacia)})).filter(x=>x.desdeId&&x.haciaId);
  const reemplazos=resolver(declaracion.reemplazos),traspasos=resolver(declaracion.traspasos);
  const promedios=(Array.isArray(declaracion.promedios)?declaracion.promedios:[])
    .map(x=>({desdeId:idDe(x.desde),deIds:(Array.isArray(x.de)?x.de:[]).map(idDe)}))
    .filter(x=>x.desdeId&&x.deIds.length&&x.deIds.every(Boolean));
  const reemplazosCasilla=(Array.isArray(declaracion.reemplazosCasilla)?declaracion.reemplazosCasilla:[])
    .map(x=>({desdeId:idDe(x.desde),desdeSlot:x.desdeSlot,haciaId:idDe(x.hacia),...(Number.isInteger(x.haciaSlot)?{haciaSlot:x.haciaSlot}:{})}))
    .filter(x=>x.desdeId&&x.haciaId&&Number.isInteger(x.desdeSlot)&&x.desdeSlot>=0);
  return reemplazos.length||traspasos.length||promedios.length||reemplazosCasilla.length?{reemplazos,traspasos,promedios,reemplazosCasilla,
    ...(Number.isInteger(declaracion.maxReemplazos)&&declaracion.maxReemplazos>=1?{maxReemplazos:declaracion.maxReemplazos}:{}),
    ...(Number.isInteger(declaracion.maxTraspasos)&&declaracion.maxTraspasos>=1?{maxTraspasos:declaracion.maxTraspasos}:{}),
    ...(declaracion.excesoReemplazos==='rezago'?{excesoReemplazos:'rezago'}:{}),
    ...(Number.isInteger(declaracion.maxPromedios)&&declaracion.maxPromedios>=1?{maxPromedios:declaracion.maxPromedios}:{}),
    ...(Number.isFinite(declaracion.notaExceso)&&declaracion.notaExceso>=1&&declaracion.notaExceso<=7?{notaExceso:declaracion.notaExceso}:{})}:null;
}
// Décimas y bonus del programa (#631). El preset nombra evaluaciones y acá se
// resuelven a las categorías del ramo, como las compuertas. Si una evaluación
// nombrada ya no está (la pauta se editó), esa regla no se carga: sumarle
// décimas a otra cosa sería inventar. Vuelve a la lista de lo no calculado.
function resolverBonus(def,categorias){
  const lista=!Array.isArray(def)&&def&&Array.isArray(def.bonus)?def.bonus:null;
  if(!lista||!Array.isArray(categorias))return null;
  const idDe=nombre=>{const c=categorias.find(x=>normName(x.nombre)===normName(nombre));return c?c.id:null;};
  const out=[];
  lista.forEach(b=>{
    if(!b||typeof b.id!=='string'||!['decimas','faltas'].includes(b.entrada))return;
    const destino=b.a==='final'?'final':idDe(b.a);
    if(!destino)return;
    let si=null;
    if(b.si){
      const ids=(b.si.evals||[]).map(idDe);
      if(!ids.length||ids.some(x=>!x)||typeof b.si.mayorQue!=='number')return;
      si={catIds:ids,mayorQue:b.si.mayorQue};
    }
    out.push({id:b.id,pregunta:String(b.pregunta||''),ayuda:String(b.ayuda||''),entrada:b.entrada,destino,
      ...(typeof b.max==='number'?{max:b.max}:{}),...(typeof b.hasta==='number'?{hasta:b.hasta}:{}),
      ...(typeof b.suma==='number'?{suma:b.suma}:{}),...(si?{si}:{})});
  });
  return out.length?out:null;
}
// Lo que el estudiante ingresó: un entero entre 0 y BONUS_MAX por regla.
const BONUS_MAX=60;
function copiarBonusIngresado(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const out={};
  Object.keys(raw).forEach(k=>{const v=raw[k];if(/^[a-z0-9_-]{1,32}$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=BONUS_MAX)out[k]=v;});
  return Object.keys(out).length?out:null;
}
function ausenciasDeclaradas(raw){return [...new Set((Array.isArray(raw)?raw:[]).filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id)))];}

// `x || []` no alcanza cuando el dato no es una lista: un string no vacío es
// truthy y no tiene `.map`, así que `normalize` LANZABA y la app se quedaba sin
// cargar. Es el camino crítico —cargar los ramos guardados— y ahí un throw no
// es un error visible sino una cuenta que no abre, con sus datos intactos y
// fuera de alcance. Lo que no es lista se trata como vacío.
function comoLista(x){return Array.isArray(x)?x:[];}

function normalize(data) {
  // Rellena campos que podrían faltar (ediciones parciales, imports, etc.)
  data.ramos = comoLista(data.ramos).map(r => ({
    ...r,
    id: idSeguro(r.id),
    color: r.color || '#2563eb',
    // Créditos SCT — opcional. Si todos los ramos lo tienen, el promedio se pondera.
    // El 0 se conserva: es un dato exacto, no un faltante. Ver tieneCreditos().
    creditos: (typeof r.creditos === 'number' && r.creditos >= 0) ? r.creditos : null,
    // Sección del curso — opcional, la escribe el estudiante. Sin ella todo
    // funciona igual; un valor que no sea una sección válida se descarta.
    seccion: seccionValida(r.seccion),
    // Contador de faltas — opcional, lo enciende el estudiante en Editar ramo.
    // Sin él (cuentas anteriores) queda en null y no se muestra nada.
    faltas: copiarFaltas(r.faltas),
    // Décimas o talleres que el estudiante anotó para una regla de `bonus`.
    // Sin ellas (cuentas anteriores) queda en null y no se suma nada.
    bonusIngresado: copiarBonusIngresado(r.bonusIngresado),
    // De qué catálogo (universidad + carrera) salió este ramo. null = creado a mano.
    origen: (r.origen && r.origen.tenant) ? {tenant:r.origen.tenant, carrera:r.origen.carrera||null, ramoKey:claveCanonica(typeof r.origen.ramoKey==='string'&&r.origen.ramoKey.trim()?r.origen.ramoKey.trim():ramoKey(r.nombre,r.origen.tenant,r.origen.carrera),r.origen.tenant,r.origen.carrera)} : null,
    // Otro ramo aporta parte de esta nota (el laboratorio de Dinámica).
    aporta: (r.aporta && r.aporta.ramo && r.aporta.peso) ? {ramo:r.aporta.ramo, peso:r.aporta.peso, min:r.aporta.min} : null,
    // La forma de la pauta tal como se la dimos. Si difiere de las categorías
    // actuales, el estudiante la editó y su versión manda.
    pautaHuella: typeof r.pautaHuella === 'string' ? r.pautaHuella : null,
    // La regla oficial y lo que el estudiante declaró son distintos: la regla
    // se puede actualizar desde catálogo; la declaración nunca se inventa.
    recuperativo: copiarRecuperativo(r.recuperativo),
    reemplazosOptativos: copiarReemplazosOptativos(r.reemplazosOptativos),
    recuperativoRendido: ['aprobado','reprobado'].includes(r.recuperativoRendido) ? r.recuperativoRendido : null,
    // La regla viene del programa; la declaración solo dice qué ausencia fue
    // aprobada. Sin declaración, una cuenta anterior calcula exactamente igual.
    reglasAusenciaJustificada: copiarReglasAusenciaIds(r.reglasAusenciaJustificada),
    // El formulario del curso puede exigir rezago o acumulación aunque el
    // catálogo no lo sepa. Esta elección es del estudiante y nunca se presenta
    // como una regla oficial del programa.
    reglasAusenciaJustificadaUsuario: copiarReglasAusenciaUsuario(r.reglasAusenciaJustificadaUsuario),
    ausenciasJustificadas: ausenciasDeclaradas(r.ausenciasJustificadas),
    categorias: comoLista(r.categorias).map(c => ({
      ...c,
      id: idSeguro(c.id),
      // Sin nombre la ficha imprimía literalmente "undefined" donde va el de la
      // evaluación. Es el mismo defecto que ya apareció en Ajustes: un campo
      // que falta se dibuja como la palabra, no como un hueco.
      nombre: typeof c.nombre === 'string' && c.nombre.trim() ? c.nombre : 'Evaluación',
      ponderaNotas: c.ponderaNotas ?? false,
      // `slots` declara casillas fijas. Una versión anterior guardaba por error
      // `directNota:false` junto a `slots`, con lo que la ficha los trataba como
      // una lista abierta y nunca dibujaba las casillas. Se corrige al cargar:
      // no cambia notas, pesos ni cálculo, solo recupera la forma que la persona
      // acababa de declarar. Sin cantidad conocida, `directNota:false` conserva
      // la lista abierta para controles cuyo número todavía no se sabe.
      directNota: Number.isInteger(c.slots) && c.slots > 1 ? true : (c.directNota ?? (comoLista(c.notas).length <= 1)),
      fecha: c.fecha || null, // opcional, ISO YYYY-MM-DD, se ingresa en el modal de categoría
      // La hora va APARTE de la fecha y nunca dentro de ella. Hay miles de
      // evaluaciones guardadas con `fecha` sola: convertirla a fecha-y-hora
      // sería reinterpretar en silencio lo que ya está escrito, y las que no
      // tienen hora quedarían todas a medianoche. Sin fecha no significa nada,
      // así que se descarta.
      hora: (c.fecha && HORA_RE.test(c.hora || '')) ? c.hora : null,
      fechaOrigen: c.fecha?origenFechaSeguro(c.fechaOrigen):null,
      horaOrigen: (c.fecha && HORA_RE.test(c.hora || ''))?origenFechaSeguro(c.horaOrigen):null,
      fechaQuitada: !c.fecha && c.fechaQuitada===true,
      horaQuitada: !(c.fecha && HORA_RE.test(c.hora || '')) && c.horaQuitada===true,
      notas: comoLista(c.notas).map(n => ({
        id: idSeguro(n.id),
        nombre: n.nombre || 'Nota',
        hora: (n.fecha && HORA_RE.test(n.hora || '')) ? n.hora : null,
        valor: n.valor ?? (typeof n === 'number' ? n : null),
        ...(fechaEdicionNotaValida(n.editadaEn)?{editadaEn:fechaEdicionNotaValida(n.editadaEn)}:{}),
        peso: n.peso || 1,
        // La equivalencia numérica alimenta el motor, pero la letra se conserva
        // para que la ficha siga diciendo lo mismo que Mi UC. Ausente significa
        // nota numérica normal y mantiene compatibles todas las cuentas previas.
        ...(calificacionConceptualGuardada(n,data.tenant) ? {calificacionConceptual:calificacionConceptualGuardada(n,data.tenant)} : {}),
        // Es un estado de trámite, no académico. Solo existe sobre una nota ya
        // rendida; ausente conserva exactamente el comportamiento histórico.
        ...(Number.isFinite(n.valor) && n.recorreccionPendiente===true ? {recorreccionPendiente:true} : {}),
        // El plazo para pedirla, si la persona lo anotó. Opcional a propósito:
        // cada facultad fija el suyo y el reglamento UC solo pone un techo de
        // quince días hábiles, así que la app no lo puede deducir de la fecha
        // de la evaluación. Sin plazo el recordatorio funciona igual que antes.
        ...(Number.isFinite(n.valor) && n.recorreccionPendiente===true && FECHA_RE.test(n.recorreccionHasta||'')
          ? {recorreccionHasta:n.recorreccionHasta} : {}),
        // Las casillas fijas se identifican por posición, no por el nombre.
        // Si se pierde `slot` al recargar, Informe 0 sigue guardado pero ya no
        // puede volver a dibujarse en ninguna de las seis casillas.
        ...(Number.isInteger(n.slot) ? {slot:n.slot} : {}),
        // Una nota puede tener su propia fecha y todavía no tener valor: es una
        // evaluación que viene. La fecha de la categoría sirve cuando todo el
        // grupo cae el mismo día; no alcanza para "Casos y ensayos", que son
        // varios casos repartidos por el semestre.
        fecha: n.fecha || null,
        fechaOrigen: n.fecha?origenFechaSeguro(n.fechaOrigen):null,
        horaOrigen: (n.fecha && HORA_RE.test(n.hora || ''))?origenFechaSeguro(n.horaOrigen):null,
        // Igual que en una categoría: si alguien quita una fecha propia, no es
        // un hueco que el catálogo o un importador pueda rellenar por su cuenta.
        fechaQuitada: !n.fecha && n.fechaQuitada===true,
        horaQuitada: !(n.fecha && HORA_RE.test(n.hora || '')) && n.horaQuitada===true,
      }))
    }))
  }));
  // Entre el 30 de agosto y este arreglo, normalize descartaba `slot` de las
  // notas de una categoría con casillas fijas. Recuperamos solo las que se
  // pueden identificar sin ambigüedad por su nombre exacto (Informe 0, Control
  // 2, etc.); una nota con otro nombre no se asigna a ojo.
  data.ramos.forEach(r=>(r.categorias||[]).forEach(c=>{
    if(!Number.isInteger(c.slots)||c.slots<=1)return;
    (c.notas||[]).forEach(n=>{
      if(Number.isInteger(n.slot)&&n.slot>=0&&n.slot<c.slots)return;
      const nombre=normName(n.nombre||'');
      const inicio=detalleCasillas(r,c).inicio;
      const slot=Array.from({length:c.slots},(_,i)=>i)
        .find(i=>normName(etiquetaCasilla(r,c,i))===nombre||normName(`${c.nombre} ${inicio+i}`)===nombre);
      if(slot!==undefined)n.slot=slot;
    });
    // Y el destrozo que dejó ese mismo defecto: mientras `slot` se perdía,
    // `setSlotNota` no encontraba la nota anterior —limpia con
    // `filter(n=>n.slot!==slot)`— y agregaba otra. Reescribir Informe 0 seis
    // veces dejaba SEIS notas de la misma casilla.
    //
    // No es cosmético. `avgPond` las promedia todas, así que quien escribió 5,0
    // y después 6,0 tiene 5,5 de nota en esa categoría: el promedio del ramo
    // está malo. Y el contador y el avance las cuentan como casillas rendidas,
    // que es por qué un ramo con una nota decía 6/6 y 70% evaluado.
    //
    // Se conserva la ÚLTIMA de cada casilla: `setSlotNota` agrega al final, así
    // que es la más reciente y la que el estudiante quiso dejar. Las anteriores
    // eran intentos pisados, no notas distintas.
    const vistas=new Map();
    (c.notas||[]).forEach(n=>{if(Number.isInteger(n.slot))vistas.set(n.slot,n);});
    if(vistas.size<(c.notas||[]).filter(n=>Number.isInteger(n.slot)).length){
      c.notas=(c.notas||[]).filter(n=>!Number.isInteger(n.slot)||vistas.get(n.slot)===n);
    }
  }));
  // Las pautas oficiales llegan DESPUÉS de que el estudiante agregó el ramo.
  // Hasta acá el preset solo se aplicaba al crearlo, así que quien tenía
  // Introducción a la Programación desde antes se quedaba en "Sin evaluaciones"
  // para siempre, aunque su pauta ya estuviera publicada. No falla nada: el
  // ramo simplemente nunca se entera. Por eso se rellena al cargar.
  data.ramos.forEach(r => {
    migrarOrigenesFecha(r);
    repararEvaluacionesRepetidas(r);
    const p = pautaPendiente(r);
    if (p) { r.categorias = p.categorias; r.gates = p.gates; r.aporta = p.aporta || null; r.promedioParcial = p.promedioParcial || null; r.recuperativo = p.recuperativo || null; r.reemplazosOptativos=p.reemplazosOptativos||null; r.reglasAusenciaJustificada=p.reglasAusenciaJustificada||null; r.bonus=p.bonus||null; r.pautaHuella = huellaPauta(p.categorias); }
    // Un cambio de pauta se ofrece y la persona decide. `corrigePautas` es la
    // excepción para una pauta que NOSOTROS publicamos mal: esperar el botón
    // deja su promedio calculando con nuestro error. Se reconoce por la pauta
    // misma y no por `pautaHuella`, que falta en ramos antiguos y en los que
    // aceptaron una propuesta de un agente: tener exactamente nuestra pauta
    // equivocada no es haberla editado. Nunca si una nota quedaría en 0%.
    const corregibles = definicionPresetDelRamo(r)?.corrigePautas;
    const tiene = huellaPauta(catsDePauta(r.categorias));
    if (Array.isArray(corregibles) && corregibles.some(p => huellaPauta(p.map(([nombre, peso]) => ({ nombre, peso }))) === tiene)) {
      r.pautaHuella = tiene;
      const cambio = cambioDePauta(r);
      if (cambio && !cambio.notasFueraDePauta) aplicarCambioDePauta(r, cambio);
    }
    // Un mínimo que el catálogo sacó a propósito (`retiraCompuertas`) seguía
    // topando la nota en los ramos creados antes: el aviso de pauta cambiada
    // compara nombres y pesos, no compuertas. Se quita solo y sin preguntar,
    // como `corrigePautas`: la compuerta era nuestra y quitarla solo puede
    // levantar una nota que topábamos por una regla que decidimos no aplicar.
    // Solo las de una evaluación con ese mínimo y ese tope exactos.
    const retiradas = definicionPresetDelRamo(r)?.retiraCompuertas;
    if (Array.isArray(retiradas) && Array.isArray(r.gates)) {
      r.gates = r.gates.filter(gt => !(gt && gt.type === 'min_grade_required'
        && retiradas.some(x => x && x.min === gt.min && x.cap === gt.cap)));
    }
    // La regla es aditiva y no cambia ningún promedio sin una declaración. Así
    // los ramos oficiales ya creados también pueden ofrecer el recuperativo,
    // sin reinterpretar notas ni tocar ramos manuales.
    const recuperativoOficial=copiarRecuperativo(definicionPresetDelRamo(r)?.recuperativo);
    if(!r.recuperativo&&recuperativoOficial)r.recuperativo=recuperativoOficial;
    // La regla de eximición vive en el catálogo, que el conector MCP no tiene:
    // sin una copia en el ramo, un examen eximido y confirmado seguía pendiente
    // para el agente (60% evaluado en vez de 100%; issue #579, punto 7). La app
    // sigue calculando con el catálogo; la copia solo viaja con los datos y se
    // renueva en cada carga, así que sigue al catálogo si este cambia.
    const eximicionOficial=definicionPresetDelRamo(r)?.eximicion;
    if(eximicionOficial)r.eximicion=JSON.parse(JSON.stringify(eximicionOficial));
    else delete r.eximicion;
    // Las décimas del programa (#631), igual: la regla llega también a los
    // ramos ya creados y se renueva en cada carga para seguir al catálogo. No
    // suma nada hasta que la persona anota lo que ganó (bonusIngresado).
    const bonusOficial=resolverBonus(definicionPresetDelRamo(r),r.categorias);
    if(bonusOficial)r.bonus=bonusOficial;
    else delete r.bonus;
    // La regla usa los ids actuales. Una pauta editada no hereda reglas de otra.
    const defOptativo=definicionPresetDelRamo(r);
    const oficialOptativo=defOptativo&&huellaPauta(catsDePauta(r.categorias))===
      huellaPauta((defOptativo.evals||[]).map(([nombre,peso])=>({nombre,peso})))
      ?resolverReemplazosOptativos(defOptativo,r.categorias):null;
    if(oficialOptativo){
      r.reemplazosOptativos=oficialOptativo;
      (defOptativo.evals||[]).filter(([,peso,extra])=>peso===0&&extra?.optativa===true).forEach(([nombre])=>{
        const c=r.categorias.find(x=>normName(x.nombre)===normName(nombre));
        if(c&&c.peso===0)c.optativa=true;
      });
    }
    else delete r.reemplazosOptativos;
    // Igual que el recuperativo, la regla llega a los ramos oficiales creados
    // antes de publicarla, sin activar nada por sí sola.
    if(!r.reglasAusenciaJustificada){
      const reglaAusencia=resolverReglasAusencia(definicionPresetDelRamo(r),r.categorias);
      if(reglaAusencia)r.reglasAusenciaJustificada=reglaAusencia;
    }
    // Los créditos tenían el mismo problema que la pauta y era peor, porque no
    // se nota: `creditosDe` solo corría al CREAR el ramo, así que quien agregó
    // Introducción a la Programación antes de que su crédito estuviera en la
    // tabla se quedaba con `creditos:null` para siempre. La app le pedía
    // "agrega créditos" por un dato que sí tenemos.
    //
    // Y no es cosmético: el promedio general se pondera por créditos SOLO si
    // todos los ramos con nota los tienen. Un ramo sin créditos hace caer a
    // toda la cuenta a promedio simple, que es otro número.
    //
    // Solo se rellena si está vacío y si el ramo vino del catálogo: un crédito
    // escrito a mano por el estudiante manda sobre la tabla.
    sellarDatosCatalogo(r, r.origen && r.origen.tenant);
    completarFechasOficiales(r,{tenant:data.tenant,carrera:data.carrera});
  });
  data.onboardingDone = Boolean(data.onboardingDone);
  data.careerSemestre = Number(data.careerSemestre) || 1;
  data.userName = data.userName || '';
  // Lo que el estudiante DECLARÓ que estudia. Es lo único que hay cuando su
  // carrera no tiene malla, y es el dato que dice qué malla construir después.
  data.carreraNombre = typeof data.carreraNombre === 'string' && data.carreraNombre.trim()
    ? data.carreraNombre.trim().slice(0, 120) : null;
  // El historial guarda ramos completos y sus ids llegan a los mismos atributos
  // onclick (`toggleHist('<id>')`), así que necesita el mismo saneo. Antes se
  // aceptaba tal cual: un respaldo importado con historial era el mismo agujero.
  data.historial = (Array.isArray(data.historial) ? data.historial : []).map(h => ({
    ...h,
    id: idSeguro(h.id),
    // La etiqueta se pinta en Inicio, Estadísticas e Historial. Desde la app
    // siempre es texto ("2026-1"); un respaldo importado podía traer otra cosa.
    // Se deja como string sin tocar su contenido: escaparla es trabajo de quien
    // la dibuja (esc()), no de este saneo.
    label: typeof h.label === 'string' ? h.label : String(h.label ?? ''),
    ramos: (h.ramos || []).map(r => ({
      ...r,
      id: idSeguro(r.id),
      categorias: comoLista(r.categorias).map(c => ({
        ...c,
        id: idSeguro(c.id),
        notas: comoLista(c.notas).map(n => {
          const {editadaEn,...resto}=n;
          return {...resto,id:idSeguro(n.id),...(fechaEdicionNotaValida(editadaEn)?{editadaEn:fechaEdicionNotaValida(editadaEn)}:{})};
        }),
      })),
    })),
  }));
  data.carrera = data.carrera || null;
  data.tenant = data.tenant || 'fen';
  // Las dos menciones de Ing. Comercial se fusionaron: se elige más adelante en
  // la carrera, así que del 1º al 4º eran idénticas.
  if(data.carrera==='IC-CE'||data.carrera==='IC-AE')data.carrera='IC';
  data.modo = ['claro','oscuro'].includes(data.modo) ? data.modo : 'sistema';
  data.acento = ACENTOS[data.acento] ? data.acento : 'turquesa';
  data.fondo = FONDOS[data.fondo] ? data.fondo : 'neutro';
  data.sortMode = ['manual','avg','name'].includes(data.sortMode) ? data.sortMode : 'manual';
  // Estudiante o profesor (#697). Toda cuenta que no diga 'profesor' es de
  // estudiante: así cargan igual que siempre las que existían antes de esto.
  data.tipoCuenta = data.tipoCuenta === 'profesor' ? 'profesor' : 'estudiante';
  // Año de ingreso a la universidad (#697). Las cuentas anteriores no lo tienen.
  // TAV o verano marcado a mano en el onboarding: vale hasta el 1 de marzo.
  data.verano = data.verano&&typeof data.verano.hasta==='string'&&/^\d{4}-03-01$/.test(data.verano.hasta)?{hasta:data.verano.hasta}:null;
  data.generacion = Number.isInteger(data.generacion)&&data.generacion>=2000&&data.generacion<=new Date().getFullYear()?data.generacion:null;
  return data;
}
function esCuentaProfesor(){return !!(S&&S.tipoCuenta==='profesor');}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { data: normalize(JSON.parse(raw)) };
  } catch(e) {}
  return { data: null };
}
