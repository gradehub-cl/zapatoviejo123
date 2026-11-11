const CONSENSO_CATALOGO=5;
function pautasConsensoCatalogo(tenant){
  const vistas=new Set();
  return (consensoCargado(tenant)||[]).filter(c=>{
    if(!c||typeof c.ramo!=='string'||!c.ramo.trim()||!(c.respaldos>=CONSENSO_CATALOGO))return false;
    if(!pautaDeConsenso(c.estructura).categorias.length)return false;
    // Una fila por ramo: si dos pautas distintas del mismo ramo llegan a cinco,
    // la con más respaldos (el SQL ya ordena así) es la que se ofrece.
    if(vistas.has(c.ramo_key))return false;
    vistas.add(c.ramo_key);return true;
  });
}

// La estructura reportada, con la forma que usa el resto de la app. Espeja a
// presetRamo(), pero solo con lo que el reporte trae de verdad: pesos, `slots`
// y las compuertas de nota mínima. Fechas, grupos, descartes y `aporta` no
// viajan en el reporte, así que no se inventan acá.
// Frontera de confianza: acá entra texto escrito por otro estudiante.
//
// Escapar en el render evita que se EJECUTE, y eso ya está resuelto en toda la
// app. Lo que no resuelve es lo que se puede hacer sin ejecutar nada: un
// carácter de anulación bidireccional da vuelta el resto de la línea, los de
// ancho cero no se ven pero cuentan, y los de control ensucian la ficha. Nada
// de eso es el nombre de una evaluación.
//
// Se limpia UNA vez, al entrar, y no en cada render: si la basura no se guarda,
// no hay que acordarse de filtrarla en los seis lugares que la pintan.
function limpiarNombreAjeno(s){
  const limpio=String(s==null?'':s)
    // Tabulador, salto de línea y retorno quedan fuera de este barrido: los
    // recoge el colapso de espacios de más abajo. Borrarlos acá pegaría las
    // palabras que separaban y "Solemne\n1" quedaría como "Solemne1".
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,'')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'')
    .replace(/\s+/g,' ')
    .trim();
  // Por código y no por índice: cortar a la mitad un emoji deja media pareja.
  return [...limpio].slice(0,NOMBRE_MAX).join('');
}

// La estructura reportada, con la forma que usa el resto de la app.
//
// Los rangos se vuelven a comprobar acá aunque el SQL ya los valide. No es
// desconfianza del servidor: es que este dato lo escribió un desconocido, y la
// validación que lo dejó entrar vive en otro archivo que se puede cambiar sin
// que nadie mire este. Un `min` fuera de escala toparía la nota final de otro
// estudiante, que es lo único que esta app no puede permitirse.
function pautaDeConsenso(est){
  const categorias=[],gates=[];
  const enEscala=v=>typeof v==='number'&&isFinite(v)&&v>=SIM_MIN&&v<=SIM_MAX;
  (est||[]).forEach(e=>{
    if(!e)return;
    const nombre=limpiarNombreAjeno(e.nombre);
    if(!nombre)return;
    const peso=Math.min(100,Math.max(0,Number(e.peso)||0));
    // `typeof number` y no Number(): el SQL exige que venga como número, así
    // que un "3" no viene de un reporte legítimo y no hay por qué adivinarle.
    const slots=typeof e.slots==='number'&&Number.isInteger(e.slots)&&e.slots>1&&e.slots<=100?e.slots:0;
    const id=uid();
    // Sin cantidad, el reporte no distingue "una nota" de "varias sin contar":
    // `firma` en reportes-pauta.js manda 1 en los dos casos. Se toma como una
    // sola, igual que un preset, una evaluación creada a mano o "Reportar
    // pauta". Antes quedaba como lista abierta, y un "Examen" reportado se
    // dibujaba con "+ Agregar nota" en vez de su fila. Quien tenga varias lo
    // marca en el editor ("Son varias notas"), que es el mismo camino de siempre.
    const cat={id,nombre,peso,ponderaNotas:false,directNota:true,notas:[]};
    if(slots)cat.slots=slots;
    categorias.push(cat);
    if(enEscala(e.min))gates.push({type:'min_grade_required',catId:id,min:e.min,cap:enEscala(e.cap)?e.cap:SIM_MIN,nombre});
  });
  return {categorias,gates};
}

// Rellena las pautas que FALTAN con lo que reportó el resto.
//
// Por qué solo esos. Un ramo sin evaluaciones no tiene nada que pisar: no hay
// notas que perder ni una pauta que el estudiante haya escrito. En cuanto hay
// algo escrito, el código ya tiene decidido quién manda, y un consenso no lo
// cambia: si la pauta es oficial y cambió, cambioDePauta() se lo MUESTRA y
// espera, porque su promedio va a moverse; y si el estudiante la editó a mano,
// su versión manda sobre la nuestra. Una pauta reportada por tres personas que
// no conoce no puede pesar más que esas dos reglas.
//
// En un ramo vacío, aunque lo agregaran a mano, no hay nada que pisar.
async function aplicarConsensoAuto(){
  if(esCuentaProfesor())return 0;
  // Vacía no corta: un ramo con secciones en disputa solo sale en la consulta
  // de su sección. Esta llamada además deja lista la caché de consensoAlAgregar.
  if(!await cargarConsenso())return 0;
  await traerSiglasRamosManualesUC();
  // Las mallas diferidas se traen solo si hay un ramo vacío que las necesita.
  if((S.ramos||[]).some(r=>!(r.categorias||[]).length&&coordinacionRamo(r)===null))
    await asegurarMallasCoordinacion(S.tenant);
  let puestas=0;
  for(const r of (S.ramos||[])){
    const especifico=await cargarConsenso(S.tenant,periodoReporte(r),seccionReporte(r));
    if(ponerConsensoEnRamo(r,especifico||[]))puestas++;
  }
  if(puestas)save();
  return puestas;
}
function ponerConsensoEnRamo(r,cons){
  if(esCuentaProfesor())return false;
  if(!r||!cons||!cons.length)return false;
  if(r.origen&&r.origen.tenant&&r.origen.tenant!==S.tenant)return false;
  if((r.categorias||[]).length||(r.gates||[]).length)return false;
  // Solo en ramos coordinados: en uno no coordinado, tres reportes iguales
  // describen la pauta de un profesor, no la de todas las secciones. Ahí el
  // consenso se ofrece como sugerencia (pauta-sugerida.js). Sin saberlo aún
  // (mallas diferidas en camino) tampoco se aplica: la ficha vuelve a probar.
  if(!ramoCoordinado(r))return false;
  if(!r.origen&&presetRamo(r.nombre,S.tenant,S.carrera))return false; // una oficial existente manda
  if(pautaPendiente(r))return false;                    // hay programa oficial esperando: ese manda
  const hit=cons.find(c=>c.ramo_key===claveReporte(r)&&consensoVigenteParaRamo(c,r)&&c.respaldos>=CONSENSO_AUTO);
  if(!hit)return false;
  const pauta=pautaDeConsenso(hit.estructura);
  if(!pauta.categorias.length)return false;
  r.categorias=pauta.categorias;
  r.gates=pauta.gates;
  r.pautaHuella=huellaPauta(pauta.categorias);
  // Marca de origen: esta pauta NO sale de un programa oficial. La ficha lo
  // dice, y el día que transcribamos el programa, cambioDePauta() ofrece el
  // cambio como con cualquier otra pauta vieja.
  r.consensoRespaldos=hit.respaldos;
  r.consensoAportado=huellaEstructura(estructuraParaConsenso(estructuraDe(r)));
  return true;
}
// Al agregar un ramo sin pauta, la del consenso entra en el mismo momento —con
// lo ya cargado, sin esperar la red—, no en la próxima sesión. Mismas reglas
// que aplicarConsensoAuto: solo ramos vacíos y nunca sobre una de programa.
function consensoAlAgregar(r){
  if(esCuentaProfesor())return false;
  return ponerConsensoEnRamo(r,consensoCargado(S.tenant));
}

// Lo aportado antes del 2026-10-05 quedó guardado con la huella de entonces,
// que contaba los conectores. Sin aceptar las dos, cada ramo que recibió una
// pauta del consenso con un "de" en un nombre se reenviaría como voto propio.
function yaAportada(r,est){
  return !!r.consensoAportado&&(r.consensoAportado===huellaEstructura(est)||r.consensoAportado===huellaEstructura(est,true));
}
function esListaSinCantidad(c){
  return !!c&&c.directNota===false&&!(Number.isInteger(c.slots)&&c.slots>1)&&Number(c.peso)>0;
}
// Participan las pautas completas que alguien armó o corrigió, cualquiera sea
// el camino: editor, ramo manual o propuesta del agente ya aceptada. Una pauta
// oficial sin editar y una pauta recibida del propio consenso no son votos
// independientes. El servidor cuenta personas distintas, no envíos.
// Los reportes comparten estructura y pesos. Un descarte o un tope
// personal vigente cambiaría el significado del voto al quitarle la regla.
function pautaConReglasNoCompartibles(r){
  const vigentes=catsDePauta(r.categorias).filter(c=>Number(c.peso)>0);
  return vigentes.some(c=>c.dropLowest?.count>0||c.dropLowest?.fraction>0)||
    (r.gates||[]).some(g=>g.origen==='editor'&&vigentes.some(c=>c.id===g.catId));
}
function pautaPropiaParaConsenso(r){
  if(!r||!Array.isArray(r.categorias)||!r.categorias.length)return false;
  // Una lista abierta ("Son varias notas", sin cantidad) no dice cuántas notas
  // tiene: el reporte la manda como una sola, igual que un "Examen". Su voto
  // describe otra pauta —unos "Controles" de 3 casillas quedan en otro grupo—
  // y, si llega a consenso, a los demás les llega como evaluación de una nota.
  // Se deja de aportar sola; el botón de reporte, donde la persona revisa lo
  // que manda, no cambia.
  if(pautaConReglasNoCompartibles(r)||catsDePauta(r.categorias).some(esListaSinCantidad))return false;
  const est=estructuraDe(r);
  if(typeof estadoReporte==='function'&&!estadoReporte(est).lista)return false;
  if(repiteVotoSugerido(r,estructuraParaConsenso(est)))return false;
  if(presetRamo(r.nombre,(r.origen&&r.origen.tenant)||S.tenant,(r.origen&&r.origen.carrera)||S.carrera))return false;
  if(r.consensoRespaldos){
    return !!r.consensoAportado&&!yaAportada(r,estructuraParaConsenso(estructuraDe(r)));
  }
  const o=r.origen;
  if(!o||!o.tenant)return true;
  const oficial=presetRamo(r.nombre,o.tenant,o.carrera);
  if(oficial&&huellaPauta(catsDePauta(r.categorias))===huellaPauta(oficial.categorias))return false;
  if(r.pautaHuella)return pautaEditada(r);
  return true;
}
// Solo viajan evaluaciones y reglas representables; jamás notas. La huella
// guardada evita reenvíos sin cambios, y un fallo de red deja el aporte pendiente
// para el siguiente guardado o inicio de sesión.
async function aportarPautasAlCatalogo(){
  // Ausente = comportamiento anterior: las cuentas existentes siguen aportando.
  if(S.aportarPautasAutomaticamente===false)return 0;
  if(!supabaseClient||!currentUser)return 0;
  if(_aportePautasEnCurso)return _aportePautasEnCurso;
  const usuarioId=currentUser.id,estado=S;
  _aportePautasEnCurso=(async()=>{
    let n=0;
    for(const r of (estado.ramos||[])){
      if(!currentUser||currentUser.id!==usuarioId||S!==estado||estado.aportarPautasAutomaticamente===false)break;
      if(!pautaPropiaParaConsenso(r))continue;
      if(r.origen&&r.origen.tenant&&r.origen.tenant!==S.tenant)continue;
      const est=estructuraParaConsenso(estructuraDe(r)),huella=huellaEstructura(est);
      // Un voto ya enviado se repite una sola vez si le faltó la sección, para
      // que los reportes anteriores a ella también distingan su sección.
      const seccion=seccionReporte(r);
      if(!huella||(yaAportada(r,est)&&(seccion===null||r.seccionAportada===seccion||_servidorSinSeccion)))continue;
      const enviado=await aportarPropuestaAlCatalogo(r);
      if(!currentUser||currentUser.id!==usuarioId||S!==estado||estado.aportarPautasAutomaticamente===false)break;
      if(enviado){r.consensoAportado=huella;n++;}
    }
    if(n&&currentUser&&currentUser.id===usuarioId&&S===estado)save();
    return n;
  })();
  try{return await _aportePautasEnCurso;}
  finally{
    _aportePautasEnCurso=null;
    if(currentUser&&(currentUser.id!==usuarioId||S!==estado))aportarPautasAlCatalogo().catch(()=>{});
  }
}

// \u00bfEl ramo viene de otro cat\u00e1logo que el actual? (el estudiante se cambi\u00f3 de
// universidad o de carrera y arrastr\u00f3 ramos del anterior)
// La malla y el registro de presets escriben el mismo ramo distinto: en la
// malla es "Filosofía: ¿Para Qué?" y la clave del preset es
// 'Filosofía: ¿para qué?'. Buscar por igualdad exacta hacía que el onboarding
// prometiera la estrella de pauta oficial —esa la calcula findPresetName, que
// sí normaliza— y después creara el ramo vacío. No falla nada: el estudiante
// entra y ve "Todavía no tenemos la pauta de este ramo" en un ramo que sí la
// tiene.
//
// No sirve reusar findPresetName acá: esa exige que el preset traiga
// ponderaciones y deja fuera a los que solo traen reglas, como Cálculo II.

// Preferencia privada de la cuenta: apagar no retira reportes ya entregados.
function cambiarCompartirPautas(activo){
  S.aportarPautasAutomaticamente=activo===true;
  if(!activo){clearTimeout(_aportePautasTimer);_aportePautasTimer=null;}
  save();
}
