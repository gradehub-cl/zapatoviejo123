// ─── CUANDO LA PAUTA OFICIAL CAMBIA ─────────────────────────────────────────
// Un preset se copia al ramo cuando se crea y después queda congelado. Si más
// tarde corregimos el programa —un examen que pasa de 20% a 30%— el estudiante
// se queda con los pesos viejos para siempre y su promedio deja de ser el real.
// No falla nada: el número simplemente empieza a estar equivocado.
//
// La huella es la FORMA de la pauta: nombre y peso de cada evaluación, en
// orden. No incluye ids (son aleatorios) ni notas (son del estudiante). Sirve
// para responder la única pregunta que importa antes de tocar nada: ¿esta
// pauta sigue siendo la que le dimos, o el estudiante la editó?
function huellaPauta(cats){
  return (cats||[]).map(c=>`${c.nombre}:${r2(Number(c.peso)||0)}`).join('|');
}

// Una evaluación que la pauta oficial dejó de tener, pero que el estudiante
// alcanzó a llenar, se queda guardada con sus notas en 0%. Sigue siendo suya y
// se ve en la ficha, pero NO es parte de la pauta: no entra en la huella ni en
// lo que se le reporta al catálogo. Sin esta distinción, la pauta se vería
// eternamente distinta de la oficial y la app ofrecería el mismo cambio para
// siempre.
function catsDePauta(cats){return (cats||[]).filter(c=>!c.fueraDePauta);}

// ¿El estudiante corrigió la pauta que le dimos?
//
// cambioDePauta() ya calcula esto para callarse —cuando la editó, su versión
// manda y no se le ofrece nada—. Pero esa persona es justo la que tiene el dato
// que al catálogo le falta: agarró nuestra pauta oficial y la arregló. Hasta
// acá la app se daba cuenta y no le decía nada.
function pautaEditada(r){
  if(!r||!r.pautaHuella)return false;
  const cats=catsDePauta(r.categorias);
  return cats.length>0&&huellaPauta(cats)!==r.pautaHuella;
}

// Devuelve el cambio pendiente, o null. Null significa las tres cosas buenas:
// no hay pauta oficial, ya está al día, o el estudiante la editó a mano —y en
// ese caso su versión manda sobre la nuestra, sin preguntar ni avisar.
function firmaReglasCalculo(r){
  const nombres=new Map((r.categorias||[]).map(c=>[c.id,normName(c.nombre)]));
  return JSON.stringify((r.gates||[]).filter(g=>['conditional_weights','absence_limit'].includes(g.type)).map(g=>({
    type:g.type,nombre:g.nombre,max:g.max,ambigua:g.ambigua,
    cuando:(g.cuando||[]).map(c=>({tipo:c.tipo,min:c.min,algunaMin:c.algunaMin,evals:c.catIds.map(id=>nombres.get(id))})),
    pesos:(g.pesos||[]).map(e=>({evaluacion:nombres.get(e.catId),peso:e.peso})),
    traspasos:(g.traspasos||[]).map(e=>({desde:nombres.get(e.desdeId),hacia:nombres.get(e.haciaId)})),
  })));
}
// Un requisito de grupo (`group_min`) que el catálogo agrega o saca también es
// un cambio de pauta: sin esto, quien ya tenía el ramo seguía viendo su nota sin
// el tope. Se compara por lo que calcula —mínimo, tope y evaluaciones por
// nombre— y no por `nombre`, que es solo la etiqueta y no mueve ninguna nota.
function requisitosDeGrupo(r){
  const nombres=new Map((r.categorias||[]).map(c=>[c.id,normName(c.nombre)]));
  return (r.gates||[]).filter(g=>g.type==='group_min').map(g=>({nombre:g.nombre||'Requisito',min:g.min,
    clave:JSON.stringify([g.min,g.cap,(g.catIds||[]).map(id=>nombres.get(id)).filter(Boolean).sort()])}));
}
function cambioDePauta(r){
  if(!r||!r.origen||!r.origen.tenant||!r.pautaHuella)return null;
  const nombre=findPresetName(r.nombre,r.origen.tenant,r.origen.carrera);
  if(!nombre)return null;
  const p=presetRamo(nombre,r.origen.tenant,r.origen.carrera);
  if(!p)return null;
  const actual=huellaPauta(catsDePauta(r.categorias));
  if(actual!==r.pautaHuella)return null;      // la editó: no se opina
  const oficial=huellaPauta(p.categorias);
  const reglasCambian=firmaReglasCalculo(r)!==firmaReglasCalculo(p);
  const reqAntes=requisitosDeGrupo(r),reqDespues=requisitosDeGrupo(p);
  const claves=lista=>new Set(lista.map(g=>g.clave));
  const reqLlegan=reqDespues.filter(g=>!claves(reqAntes).has(g.clave));
  const reqSeVan=reqAntes.filter(g=>!claves(reqDespues).has(g.clave));
  if(oficial===actual&&!reglasCambian&&!reqLlegan.length&&!reqSeVan.length)return null; // al día
  // Qué cambia exactamente, para poder mostrárselo antes de que decida.
  const antes=new Map(catsDePauta(r.categorias).map(c=>[c.nombre,Number(c.peso)||0]));
  const despues=new Map((p.categorias||[]).map(c=>[c.nombre,Number(c.peso)||0]));
  const cambios=reglasCambian?[{tipo:'regla',nombre:'Se incorporan las fórmulas condicionales y los límites de ausencias definidos por el programa'}]:[];
  const minimo=g=>simConComa(nf(g.min));
  // Si solo cambiaron las evaluaciones del grupo, el requisito es el mismo: esas
  // evaluaciones ya salen en la lista, y decir "nuevo" y "deja de exigirse" del
  // mismo requisito se lee como un error.
  const mismoRequisito=(g,otros)=>oficial!==actual&&otros.some(x=>x.nombre===g.nombre&&x.min===g.min);
  reqLlegan.filter(g=>!mismoRequisito(g,reqSeVan)).forEach(g=>cambios.push({tipo:'regla',nombre:`Nuevo requisito: ${g.nombre} con promedio ${minimo(g)} o más`}));
  reqSeVan.filter(g=>!mismoRequisito(g,reqLlegan)).forEach(g=>cambios.push({tipo:'regla',nombre:`Deja de exigirse: ${g.nombre} con promedio ${minimo(g)} o más`}));
  antes.forEach((peso,nom)=>{
    if(!despues.has(nom))cambios.push({tipo:'se-va',nombre:nom,antes:peso});
    else if(r2(despues.get(nom))!==r2(peso))cambios.push({tipo:'peso',nombre:nom,antes:peso,despues:despues.get(nom)});
  });
  despues.forEach((peso,nom)=>{ if(!antes.has(nom))cambios.push({tipo:'llega',nombre:nom,despues:peso}); });
  // Una evaluación que desaparece se llevaba las notas que el estudiante había
  // escrito ahí. Ya no: se conservan aparte. Igual hay que decírselo, porque su
  // ficha va a quedar con una evaluación en 0% que la pauta oficial no tiene.
  const nombresReconocidos=new Set((p.categorias||[]).flatMap(c=>[
    c.nombre,...(c.nombresAnteriores||[]).map(x=>typeof x==='string'?x:x.nombre),
  ]).map(normName));
  const notasFueraDePauta=cambios.filter(c=>c.tipo==='se-va'&&!nombresReconocidos.has(normName(c.nombre)))
    .some(c=>((r.categorias.find(x=>x.nombre===c.nombre)||{}).notas||[])
      .some(n=>typeof n.valor==='number'));
  return {preset:p,cambios,notasFueraDePauta};
}

// Le muestra el cambio antes de decidir. Sin esto, "Actualizar" sería pedirle
// que confíe a ciegas en que le movamos el promedio.
function verCambioDePauta(ramoId){
  const r=(S.ramos||[]).find(x=>x.id===ramoId);if(!r)return;
  const cambio=cambioDePauta(r);if(!cambio)return;
  const fila=c=>{
    if(c.tipo==='regla')return `<li>${esc(c.nombre)}</li>`;
    if(c.tipo==='peso')return `<li><b>${esc(c.nombre)}</b>: ${r2(c.antes)}% → <b>${r2(c.despues)}%</b></li>`;
    if(c.tipo==='llega')return `<li><b>${esc(c.nombre)}</b>: nueva, ${r2(c.despues)}%</li>`;
    return `<li><b>${esc(c.nombre)}</b>: ya no está en la pauta del catálogo</li>`;
  };
  const aviso=cambio.notasFueraDePauta
    ? `<p class="modal-desc" style="margin-top:10px;">Alguna de las evaluaciones que desaparecen tiene notas tuyas. <b>No se borran</b>: quedan en tu ficha con sus notas y en 0%, así no mueven tu promedio.</p>`
    : `<p class="modal-desc" style="margin-top:10px;">Tus notas se conservan: se reconocen por el nombre de la evaluación.</p>`;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-title">La pauta de este ramo cambió</div>
    <p class="modal-desc">Esto es lo que cambia respecto de lo que tienes hoy en <b>${esc(r.nombre)}</b>.</p>
    <ul style="margin:10px 0 0;padding-left:18px;font-size:0.875rem;color:var(--fg2);line-height:1.6;">${cambio.cambios.map(fila).join('')}</ul>
    ${aviso}
    <div class="modal-btns" style="margin-top:16px;">
      <button type="button" class="btn-cancel" onclick="closeModal()">Dejar como está</button>
      <button type="button" class="btn-confirm" onclick="aplicarPautaNueva('${esc(r.id)}')">Actualizar</button>
    </div>`;
  openModal();
}

// Aplica la pauta nueva conservando las notas por NOMBRE de evaluación: es lo
// único estable entre las dos versiones, porque los ids se generan de nuevo.
// El cambio de datos va aparte de la interfaz: así se puede probar sin montar
// medio navegador, que es lo que obliga a hacer una función que cierra modales.
function actualizarPauta(ramoId){
  const r=(S.ramos||[]).find(x=>x.id===ramoId);if(!r)return false;
  const cambio=cambioDePauta(r);if(!cambio)return false;
  aplicarCambioDePauta(r,cambio);
  return true;
}
// Recibe el ramo y no su id porque normalize() la usa antes de que exista S.
function aplicarCambioDePauta(r,cambio){
  // Por NOMBRE NORMALIZADO, no exacto: una pauta retranscrita cambia mayúsculas,
  // tildes o un espacio sin querer, y con igualdad estricta "Solemne 1" y
  // "solemne 1" eran evaluaciones distintas — la nota se iba por un acento.
  // Los ids no sirven: el preset los genera de nuevo cada vez.
  // Entran TAMBIÉN las huérfanas de una actualización anterior: si el programa
  // vuelve a incluir una evaluación que había sacado, sus notas vuelven con
  // ella en vez de quedar duplicadas —la vieja en 0% y la nueva vacía—. Las de
  // la pauta van después a propósito: si por lo que sea coinciden en nombre,
  // manda la que está viva.
  const ids=fusionarPauta(r,cambio.preset.categorias);
  r.gates=traducirIdsCategoria(cambio.preset.gates,ids);
  r.aporta=cambio.preset.aporta||null;
  r.promedioParcial=cambio.preset.promedioParcial||null;
  r.recuperativo=cambio.preset.recuperativo||null;
  r.reemplazosOptativos=traducirIdsCategoria(cambio.preset.reemplazosOptativos||null,ids);
  r.reglasAusenciaJustificada=traducirIdsCategoria(cambio.preset.reglasAusenciaJustificada||null,ids);
  r.bonus=resolverBonus(definicionPresetDelRamo(r),r.categorias)||null;
  r.pautaHuella=huellaPauta(catsDePauta(r.categorias));
}

// Cambia las evaluaciones de un ramo CONSERVANDO lo que el estudiante escribió.
// Vive aparte porque el trato con sus notas es el mismo venga la pauta de donde
// venga: del programa oficial o de lo que reportaron sus compañeros. Una nota
// es suya y no se pierde porque nosotros cambiemos de fuente.
// Devuelve qué id quedó para cada evaluación de `nuevas` ({idNuevo: idFinal}):
// quien trae compuertas o reglas con los ids del preset las traduce con eso.
//
// Una evaluación que sigue CONSERVA SU ID, y una que llega recibe uno que sale
// de su nombre y del ramo. Nunca uno al azar: corrigePautas corre por separado
// sobre la copia del teléfono y sobre la de la nube, y la sincronización las
// junta por id. Con ids al azar cada copia inventaba los suyos y el ramo
// quedaba con todas sus evaluaciones dos veces (2026-10-15, Laboratorio de
// Dinámica). Con ids que no dependen de quién corrige, las dos copias quedan
// idénticas.
function idCategoriaEstable(r,nombre){
  let h=2166136261;const s=(r&&r.id||'')+'|'+normName(nombre);
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  return 'c'+h.toString(36);
}
function fusionarPauta(r,nuevas){
  const nombresAusencia=new Map((r.categorias||[]).map(c=>[c.id,normName(c.nombre)]));
  const viejas=new Map([...(r.categorias||[]).filter(c=>c.fueraDePauta),...catsDePauta(r.categorias)]
    .map(c=>[normName(c.nombre),c]));
  const idsFinales={},idsUsados=new Set();
  r.categorias=nuevas.map(c=>{
    const fuentes=[{nombre:c.nombre},...(c.nombresAnteriores||[]).map(x=>
      typeof x==='string'?{nombre:x}:x)];
    const usadas=new Set(),idsNotas=new Set(),notas=[];
    let idHeredado=null;
    fuentes.forEach(f=>{
      let k=normName(f.nombre),vieja=viejas.get(k);
      if(!vieja){
        // El mismo nombre salvo conectores o plural ("Controles Ejercicios" y
        // "Control de Ejercicios"): sin esto, adoptar una pauta dejaba esas
        // notas en 0%. Solo si hay una candidata; con dos no se adivina.
        const clave=nombreHuella(f.nombre);
        const candidatas=[...viejas].filter(([,v])=>nombreHuella(v.nombre)===clave);
        if(candidatas.length===1)[k,vieja]=candidatas[0];
      }
      if(!vieja||usadas.has(k))return;
      usadas.add(k);viejas.delete(k);
      if(!idHeredado&&vieja.id&&!idsUsados.has(vieja.id))idHeredado=vieja.id;
      (vieja.notas||[]).forEach(n=>{
        if(n&&n.id&&idsNotas.has(n.id))return;
        const copia={...n};
        if(c.slots>1&&Number.isInteger(f.slot)&&!Number.isInteger(copia.slot))copia.slot=f.slot;
        // Filas con peso propio que se juntan en una: cada nota conserva su peso,
        // así el promedio no se mueve por aceptar la pauta nueva.
        if(Number.isFinite(f.peso))copia.peso=f.peso;
        if(copia.id)idsNotas.add(copia.id);
        notas.push(copia);
      });
    });
    let id=idHeredado||idCategoriaEstable(r,c.nombre);
    while(idsUsados.has(id))id+='_';
    idsUsados.add(id);idsFinales[c.id]=id;
    // Una fila simple dibuja solo su primera nota: si llegan varias, va como lista.
    const varias=notas.length>1&&!(c.slots>1)?{directNota:false}:{};
    return {...c,id,notas,...varias};   // `c` no trae fueraDePauta: revivir la limpia
  });
  // Lo que la pauta nueva ya no tiene NO se borra. La pauta es nuestra; la nota
  // es del estudiante, y la escribió porque rindió esa evaluación. Se queda en
  // 0%, así no mueve el promedio, y sigue estando donde la dejó. Las que quedaron
  // vacías sí se van: no hay nada que conservar y ensucian la ficha.
  viejas.forEach(v=>{
    const conValor=(v.notas||[]).filter(n=>typeof n.valor==='number');
    if(conValor.length)r.categorias.push({...v,peso:0,notas:conValor,fueraDePauta:true});
  });
  // Un cambio de pauta genera ids nuevos. La declaración pertenece a
  // una evaluación por su nombre, no al id efímero; si esa evaluación ya no
  // existe la conservamos como inactiva, igual que una fecha quitada a mano.
  const idAusenciaEnPautaNueva=id=>{
    const casilla=/^__gh_ausencia_(.+)_([0-9]+)$/.exec(id);
    if(casilla)return gh_claveAusenciaCasilla(idAusenciaEnPautaNueva(casilla[1]),Number(casilla[2]));
    const nombre=nombresAusencia.get(id);
    const nueva=(r.categorias||[]).find(c=>[c.nombre,...(c.nombresAnteriores||[]).map(x=>typeof x==='string'?x:x.nombre)]
      .some(n=>normName(n)===nombre));
    return nueva?nueva.id:id;
  };
  r.ausenciasJustificadas=(r.ausenciasJustificadas||[]).map(idAusenciaEnPautaNueva);
  const usuario=copiarReglasAusenciaUsuario(r.reglasAusenciaJustificadaUsuario);
  if(usuario){
    usuario.rezagos=usuario.rezagos.map(x=>({desdeId:idAusenciaEnPautaNueva(x.desdeId)}));
    usuario.reemplazos=usuario.reemplazos.map(x=>({desdeId:idAusenciaEnPautaNueva(x.desdeId),haciaId:idAusenciaEnPautaNueva(x.haciaId)}));
    usuario.traspasos=usuario.traspasos.map(x=>({desdeId:idAusenciaEnPautaNueva(x.desdeId),haciaId:idAusenciaEnPautaNueva(x.haciaId)}));
    r.reglasAusenciaJustificadaUsuario=usuario;
  }
  return idsFinales;
}
// Cambia ids de evaluación dentro de reglas (compuertas, ausencias): cualquier
// texto igual a un id viejo pasa a ser el nuevo. Los ids son al azar o salen de
// un hash, así que no chocan con otros textos de la regla.
// El 2026-10-15 corrigePautas dejó ramos con todas sus evaluaciones dos veces
// (ver idCategoriaEstable): la copia del teléfono y la de la nube se corrigieron
// por separado con ids distintos y la sincronización sumó las dos. Esto las
// vuelve a juntar al cargar. Solo actúa con la huella exacta de ese error, para
// no tocar a nadie que tenga dos evaluaciones con el mismo nombre a propósito:
// ramo del catálogo, mismo nombre, mismo peso y mismas casillas, y una pauta que
// suma más de 100% y vuelve a sumar 100% sin las repetidas. Queda la de id
// menor y las notas se juntan por id: así las dos copias se reparan igual y la
// sincronización no las vuelve a duplicar.
function repararEvaluacionesRepetidas(r){
  if(!r||!r.origen||!Array.isArray(r.categorias))return false;
  const vivas=r.categorias.filter(c=>c&&!c.fueraDePauta);
  const grupos=new Map();
  vivas.forEach(c=>{const k=normName(c.nombre);if(!k)return;if(!grupos.has(k))grupos.set(k,[]);grupos.get(k).push(c);});
  const repetidos=[...grupos.values()].filter(g=>g.length>1&&g.every(c=>r2(Number(c.peso)||0)===r2(Number(g[0].peso)||0)&&
    (Number(c.slots)||1)===(Number(g[0].slots)||1)));
  if(!repetidos.length)return false;
  const total=vivas.reduce((s,c)=>s+(Number(c.peso)||0),0);
  const sobra=repetidos.reduce((s,g)=>s+(Number(g[0].peso)||0)*(g.length-1),0);
  if(!(total>100.05&&Math.abs(total-sobra-100)<=0.05))return false;
  const mapa={},fuera=new Set();
  repetidos.forEach(g=>{
    const orden=[...g].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    const queda=orden[0],ids=new Set((queda.notas||[]).map(n=>n&&n.id));
    orden.slice(1).forEach(c=>{
      (c.notas||[]).forEach(n=>{if(n&&!ids.has(n.id)){ids.add(n.id);queda.notas.push(n);}});
      mapa[c.id]=queda.id;fuera.add(c.id);
    });
  });
  r.categorias=r.categorias.filter(c=>!fuera.has(c&&c.id));
  Object.keys(mapa).forEach(desde=>{r.gates=unificarCategoriaEnReglas(r.gates,desde,mapa[desde]);});
  if(Array.isArray(r.ausenciasJustificadas))r.ausenciasJustificadas=[...new Set(traducirIdsCategoria(r.ausenciasJustificadas,mapa))];
  ['reglasAusenciaJustificada','reglasAusenciaJustificadaUsuario','bonus','reemplazosOptativos'].forEach(k=>{if(r[k])r[k]=traducirIdsCategoria(r[k],mapa);});
  return true;
}
// Una evaluación absorbe a otra: sus reglas apuntan a la que queda y las que
// quedan iguales se cuentan una vez.
function unificarCategoriaEnReglas(gates,desde,hacia){
  const vistas=new Set();
  return traducirIdsCategoria(gates||[],{[desde]:hacia}).filter(g=>{const k=JSON.stringify(g);if(vistas.has(k))return false;vistas.add(k);return true;});
}
function traducirIdsCategoria(valor,mapa){
  if(typeof valor==='string'){
    const casilla=/^__gh_ausencia_(.+)_([0-9]+)$/.exec(valor);
    if(casilla&&Object.prototype.hasOwnProperty.call(mapa,casilla[1]))return gh_claveAusenciaCasilla(mapa[casilla[1]],Number(casilla[2]));
    return Object.prototype.hasOwnProperty.call(mapa,valor)?mapa[valor]:valor;
  }
  if(Array.isArray(valor))return valor.map(v=>traducirIdsCategoria(v,mapa));
  if(valor&&typeof valor==='object'){const out={};Object.keys(valor).forEach(k=>{out[k]=traducirIdsCategoria(valor[k],mapa);});return out;}
  return valor;
}
function aplicarPautaNueva(ramoId){
  if(!actualizarPauta(ramoId))return;
  save();track('pauta_actualizada');closeModal();renderRamo();
  showToast('Pauta actualizada — tus notas se conservaron');
}

function pautaPendiente(r){
  if(!r||!r.origen||!r.origen.tenant)return null;
  if((r.categorias||[]).length||(r.gates||[]).length)return null;
  const nombre=findPresetName(r.nombre,r.origen.tenant,r.origen.carrera);
  return nombre?presetRamo(nombre,r.origen.tenant,r.origen.carrera):null;
}
