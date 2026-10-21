// ─── MOTOR GRADE HUB (verificado) ───────────────────────────────────────────
// Núcleo de cálculo unificado. Soporta árbol arbitrario + reglas:
// weighted_average · gated_average (ambos hijos ≥ mín) · min_grade_required (piso por hoja).
// FENnotas lo alimenta vía ramoToStructure() (adaptador del modelo categorias→notas).
function gh_excelRound(value,decimals){const f=Math.pow(10,decimals);return Math.sign(value)*Math.round(Math.abs(value)*f)/f;}
// Un requisito mínimo se mide igual que la nota final: redondeado a la décima.
// En la UC un 3,95 es 4,0 también para "promedio de pruebas ≥ 4,0", no solo
// para aprobar el ramo. El 1e-9 evita que un 3,95 exacto, que el punto flotante
// puede guardar como 3,9499999…, se redondee hacia abajo.
function gh_cumpleMinimo(valor,min){return gh_excelRound(valor+1e-9,1)>=min;}
// Una compuerta puede exigir el mínimo SIN aproximación (`exacto:true`): ahí
// 2,96 no es 3,0. Es el art. 27 del reglamento UAndes para dar examen. El 1e-9
// solo absorbe el punto flotante de un 3,0 exacto, no redondea.
function gh_cumpleCompuerta(valor,g){return g&&g.exacto===true?valor+1e-9>=g.min:gh_cumpleMinimo(valor,g.min);}
// La nota oficial que ve la persona: redondeada a la décima con margen de punto
// flotante. Un final de exactamente 3,95 puede llegar como 3,9499999999999993
// (pasa con los pesos 10/10/23/23/34) y sin el margen se leía 3,9 —reprobado—.
// `gh_roundFinal` queda sin margen porque el buscador de la nota necesaria
// depende de su borde exacto.
//
// Una universidad puede redondear en dos pasos (`rounding.previo`): primero a
// esos decimales y después a `decimals`. Ver GH_REGLAS_NOTA_POR_TENANT.
function gh_redondearNota(value,meta,margen){
  const r=meta?.rounding||{},d=r.decimals??1;
  const previo=Number.isInteger(r.previo)&&r.previo>d?gh_excelRound(value+margen,r.previo):value;
  return gh_excelRound(previo+margen,d);
}
function gh_notaOficial(value,meta){if(value===null)return null;return gh_redondearNota(value,meta,1e-9);}
function gh_roundFinal(value,meta){if(value===null)return null;return gh_redondearNota(value,meta,0);}
// Lo más bajo que todavía da `target` como nota oficial. A la décima, 4,0 se
// alcanza desde 3,95; con el paso previo a la centésima, desde 3,945
// (3,945 → 3,95 → 4,0).
function gh_bordeOficial(target,meta){
  const r=meta?.rounding||{},d=r.decimals??1;
  const previo=Number.isInteger(r.previo)&&r.previo>d?0.5/Math.pow(10,r.previo):0;
  return target-0.5/Math.pow(10,d)-previo;
}

// ─── REGLAS DE NOTA POR UNIVERSIDAD ─────────────────────────────────────────
// Un solo motor, y cada universidad declara cómo su promedio se vuelve nota
// oficial. Sin entrada rige la regla común: escala 1 a 7, se aprueba con 4,0 y
// se redondea a la décima. Una entrada solo trae lo que cambia, y cada regla
// lleva el artículo del que sale: no se agrega una por parecido.
//
// Vive en el motor y no en data.js porque el servidor MCP calcula con este
// archivo solo. Si viviera afuera, el agente redondearía distinto que la app.
const GH_REGLAS_NOTA_BASE={grade_scale:{min:1,max:7},rounding:{decimals:1},passing_grade:4.0};
const GH_REGLAS_NOTA_POR_TENANT={
  // Reglamento del Alumno de Pregrado UAndes (2022, vigente con la
  // modificación de marzo de 2026), art. 22: "La nota final de la asignatura
  // se expresa con un decimal. Para su cálculo se aproximan dos decimales."
  // Un 3,946 pasa a 3,95 y queda en 4,0: aprueba. Con la regla común sería 3,9.
  uandes:{rounding:{decimals:1,previo:2}},
};
function gh_reglasNota(tenant){
  const propia=Object.prototype.hasOwnProperty.call(GH_REGLAS_NOTA_POR_TENANT,tenant)?GH_REGLAS_NOTA_POR_TENANT[tenant]:{};
  return {grade_scale:{...GH_REGLAS_NOTA_BASE.grade_scale,...propia.grade_scale},
    rounding:{...GH_REGLAS_NOTA_BASE.rounding,...propia.rounding},
    passing_grade:propia.passing_grade??GH_REGLAS_NOTA_BASE.passing_grade};
}

// ─── PUNTAJE → NOTA ─────────────────────────────────────────────────────────
// La escala lineal con exigencia de las pruebas chilenas: el puntaje de
// aprobación (exigencia × total) vale la nota de aprobación, y de ahí salen dos
// rectas, una hasta la mínima en 0 puntos y otra hasta la máxima en el total.
// Con 50% de exigencia, 25 de 50 es un 4,0; con 60%, hacen falta 30.
// La usa la calculadora pública (calculadora.html) y la usará el ingreso de
// notas de la app: una sola fórmula para las dos. Devuelve null si los datos
// no forman una escala, para que nadie muestre una nota inventada.
function gh_notaDesdePuntaje(puntaje,total,o={}){
  const exigencia=o.exigencia??0.5,nmin=o.nmin??1,naprob=o.naprob??4,nmax=o.nmax??7;
  if(![puntaje,total,exigencia,nmin,naprob,nmax].every(Number.isFinite))return null;
  if(total<=0||puntaje<0||puntaje>total||exigencia<=0||exigencia>=1||!(nmin<naprob&&naprob<nmax))return null;
  const corte=exigencia*total;
  const cruda=puntaje<corte?nmin+(naprob-nmin)*puntaje/corte:naprob+(nmax-naprob)*(puntaje-corte)/(total-corte);
  // El 1e-9 es el mismo margen de gh_notaOficial: un 3,95 o un 4,0 exactos no
  // pueden caer a 3,9 por cómo el punto flotante guarda el número.
  const nota=o.truncar?Math.floor((cruda+1e-9)*10)/10:gh_excelRound(cruda+1e-9,1);
  return {nota,cruda,puntajeAprobacion:corte};
}
function gh_weightOf(node,ov){const o=ov?.[node.id];if(o&&typeof o.weight==='number')return o.weight;return node.weight;}
function gh_meta(s){return s.__meta||{};}
// El recuperativo no es una hoja de la pauta: no tiene peso ni participa en el
// promedio. Se decide sobre la nota FINAL, una vez aplicadas las compuertas.
// `gateLimited` solo bloquea cuando un tope efectivamente BAJÓ la nota hasta el
// rango: una compuerta presente que no cambió el número no inventa una barrera.
function gh_estadoRecuperativo(value,complete,gateLimited,rule,declaration,meta){
  if(!rule||!Number.isFinite(rule.min)||!Number.isFinite(rule.max)||!Number.isFinite(rule.nota))return null;
  const final=gh_notaOficial(value,meta||GH_REGLAS_NOTA_BASE);
  const base={valor:value,final,regla:rule,declaracion:declaration};
  if(value===null)return {...base,motivo:'sin_nota',puedeDeclarar:false};
  if(!complete)return {...base,motivo:'incompleto',puedeDeclarar:false};
  if(gateLimited)return {...base,motivo:'compuerta',puedeDeclarar:false};
  if(final<rule.min||final>rule.max)return {...base,motivo:'fuera_de_rango',puedeDeclarar:false};
  if(declaration==='aprobado')return {...base,valor:rule.nota,motivo:'aprobado',puedeDeclarar:false};
  if(declaration==='reprobado')return {...base,motivo:'reprobado',puedeDeclarar:false};
  return {...base,motivo:'pendiente',puedeDeclarar:true};
}
// "Se elimina la peor nota", "se elimina el 25% de los controles rendidos": una
// de las reglas más comunes de los programas chilenos, y hasta ahora el motor no
// sabía representarla — quedaba declarada en `noCalcula` para que el estudiante
// supiera que su promedio real podía diferir del que veía.
//
// Solo se descartan evaluaciones YA RENDIDAS. Las que faltan no se pueden
// eliminar: todavía no existe una nota mala que sacar, y descontarlas de
// antemano daría un promedio optimista que después baja solo.
//
// OJO CON EL REDONDEO, que es una decisión y no un dato: con 6 controles el 25%
// da 1,5 y el programa no dice qué pasa ahí. Se usa `floor` —se elimina 1— por
// la misma razón por la que no se inventan ponderaciones: es el único número que
// el documento respalda sin ambigüedad. Por eso `drops` viaja en el resultado,
// para que la interfaz muestre CUÁL nota se eliminó en vez de que el estudiante
// vea un promedio que no le cuadra.
function gh_applyDrop(node,known){
  const d=node.drop_lowest;
  if(!d||known.length<2)return [];
  let k=0;
  if(typeof d.count==='number')k=Math.floor(d.count);
  else if(typeof d.fraction==='number')k=Math.floor(d.fraction*known.length);
  if(k<=0)return [];
  // Nunca se descartan todas: si la regla se comiera el grupo entero, el
  // promedio pasaría a null y la categoría desaparecería del cálculo con su
  // ponderación repartida entre las demás. Eso no es "eliminar la peor nota".
  k=Math.min(k,known.length-1);
  const peores=new Set(known.slice().sort((a,b)=>a.value-b.value).slice(0,k));
  const fuera=[];
  for(let i=known.length-1;i>=0;i--){if(peores.has(known[i]))fuera.unshift(known.splice(i,1)[0]);}
  return fuera;
}

// Una inasistencia justificada no es una nota inventada. La regla del programa
// puede decir dos cosas distintas: reemplazar la nota ausente por otra ya
// rendida, o mover un peso completo a otra evaluación. El adaptador recibe ids
// resueltos desde el preset, por lo que este motor no sabe ni necesita saber el
// nombre del ramo que está calculando.
function gh_clonarArbol(node){return {...node,children:(node.children||[]).map(gh_clonarArbol)};}
function gh_nodosPorId(node,map=new Map()){map.set(node.id,node);(node.children||[]).forEach(hijo=>gh_nodosPorId(hijo,map));return map;}
function gh_claveAusenciaCasilla(catId,slot){return `__gh_ausencia_${catId}_${slot}`;}
function gh_prepararAusenciasJustificadas(structure,grades,regla,declaraciones,norma){
  const declaradas=new Set(Array.isArray(declaraciones)?declaraciones:[]);
  const vacio={estructura:structure,notas:grades,activas:[],pendientes:[],inactivas:[]};
  if(!regla||!declaradas.size)return vacio;
  const base=calculateFinalGrade(structure,grades);
  const valores=new Map(base.breakdown.map(n=>[n.id,n.value]));
  const copia=gh_clonarArbol(structure),nodos=gh_nodosPorId(copia),notas={...grades};
  const activas=[],pendientes=[],inactivas=[],bloqueadas=[],vistas=new Set();
  const maxReemplazos=Number.isInteger(regla.maxReemplazos)&&regla.maxReemplazos>=1?regla.maxReemplazos:null;
  const maxTraspasos=Number.isInteger(regla.maxTraspasos)&&regla.maxTraspasos>=1?regla.maxTraspasos:null;
  let reemplazosDeclarados=0,traspasosDeclarados=0;
  const topePesoDestino=Number.isFinite(norma&&norma.topePesoDestino)?norma.topePesoDestino:null;
  const notaExceso=Number.isFinite(norma&&norma.notaExceso)?norma.notaExceso:1;
  const agregarExceso=(hacia,peso)=>{
    if(!(peso>0))return;
    const id=`__gh_ausencia_exceso__${hacia.id}`;
    let grupo=(copia.children||[]).find(n=>n.id===id);
    if(!grupo){
      let hojaId=`${id}__nota`;
      while(nodos.has(hojaId))hojaId+='_';
      grupo={id,name:`Exceso de acumulación en ${hacia.name}`,weight:0,type:'group',aggregation_rule:'weighted_average',ausenciaExceso:true,
        children:[{id:hojaId,name:'Porcentaje sobre el tope',weight:1,type:'leaf',ausenciaExceso:true}]};
      copia.children.push(grupo);nodos.set(id,grupo);nodos.set(hojaId,grupo.children[0]);notas[hojaId]=notaExceso;
    }
    grupo.weight=(Number(grupo.weight)||0)+peso;
  };
  const revisar=(tipo,entrada)=>{
    if(!entrada||!declaradas.has(entrada.desdeId)||vistas.has(entrada.desdeId))return;
    vistas.add(entrada.desdeId);
    const desde=nodos.get(entrada.desdeId),hacia=tipo==='rezago'?null:nodos.get(entrada.haciaId);
    if(!desde||(tipo!=='rezago'&&!hacia)||desde===hacia){inactivas.push({...entrada,tipo,motivo:'pauta_cambio'});return;}
    if(valores.get(entrada.desdeId)!==null){inactivas.push({...entrada,tipo,motivo:'tiene_nota'});return;}
    if(tipo==='rezago'){pendientes.push({...entrada,tipo,motivo:'espera_rezago'});return;}
    // Algunos programas solo reemplazan la primera ausencia por el examen;
    // las siguientes se rinden aparte. Cuenta las ausencias sin nota en el
    // orden de las evaluaciones declarado por el preset, incluso si aún no
    // llega la nota del examen: una ausencia posterior no puede ocupar su lugar.
    if(tipo==='reemplazo'&&maxReemplazos!==null){
      reemplazosDeclarados++;
      if(reemplazosDeclarados>maxReemplazos){
        if(regla.excesoReemplazos==='rezago')pendientes.push({...entrada,tipo:'rezago',motivo:'espera_rezago'});
        else bloqueadas.push({...entrada,tipo,motivo:'sin_regla_para_exceso'});
        return;
      }
    }
    if(tipo==='reemplazo'&&valores.get(entrada.haciaId)==null){pendientes.push({...entrada,tipo,motivo:'falta_destino'});return;}
    if(tipo==='traspaso'&&maxTraspasos!==null&&++traspasosDeclarados>maxTraspasos){
      bloqueadas.push({...entrada,tipo,motivo:'sin_regla_para_exceso'});return;
    }
    if(tipo==='reemplazo'){
      const id=`ausencia-${entrada.desdeId}`;
      desde.children=[{id,name:'Nota reemplazada',weight:1,type:'leaf'}];
      desde.drop_lowest=null;notas[id]=valores.get(entrada.haciaId);
    }else{
      const pesoDesde=Number(desde.weight)||0,pesoAntes=Number(hacia.weight)||0;
      const pesoPropuesto=pesoAntes+pesoDesde;
      if(norma&&norma.requiereResolucion===true&&topePesoDestino!==null&&pesoPropuesto>topePesoDestino){
        bloqueadas.push({...entrada,tipo,motivo:'supera_tope',topePesoDestino,pesoPropuesto});return;
      }
      const pesoFinal=topePesoDestino===null?pesoPropuesto:Math.min(topePesoDestino,pesoPropuesto);
      const pesoAplicado=Math.max(0,pesoFinal-pesoAntes);
      const pesoExcedente=Math.max(0,pesoDesde-pesoAplicado);
      hacia.weight=pesoFinal;
      desde.weight=0;desde.children=[];desde.drop_lowest=null;
      agregarExceso(hacia,pesoExcedente);
      activas.push({...entrada,tipo,pesoTrasladado:pesoDesde,pesoAplicado,pesoExcedente,
        ...(topePesoDestino===null?{}:{topePesoDestino,notaExceso})});
      return;
    }
    activas.push({...entrada,tipo});
  };
  (regla.rezagos||[]).forEach(entrada=>revisar('rezago',entrada));
  (regla.reemplazos||[]).forEach(entrada=>revisar('reemplazo',entrada));
  (regla.traspasos||[]).forEach(entrada=>revisar('traspaso',entrada));
  // Reemplazo por promedio ponderado de otras evaluaciones sumativas. Se
  // resuelve por ids y pesos del árbol, nunca por nombre de ramo. Si el
  // programa limita las justificaciones, las posteriores reciben su nota
  // declarada antes de calcular el promedio de la primera.
  const promedios=[];
  (regla.promedios||[]).forEach(entrada=>{
    if(!entrada||!declaradas.has(entrada.desdeId)||vistas.has(entrada.desdeId))return;
    vistas.add(entrada.desdeId);
    const desde=nodos.get(entrada.desdeId);
    const otros=Array.isArray(entrada.deIds)?entrada.deIds.map(id=>nodos.get(id)):[];
    if(!desde||!otros.length||otros.some(n=>!n||n===desde)){
      inactivas.push({...entrada,tipo:'promedio',motivo:'pauta_cambio'});return;
    }
    if(valores.get(entrada.desdeId)!==null){
      inactivas.push({...entrada,tipo:'promedio',motivo:'tiene_nota'});return;
    }
    promedios.push({entrada,desde,otros});
  });
  const maxPromedios=Number.isInteger(regla.maxPromedios)&&regla.maxPromedios>=1?regla.maxPromedios:promedios.length;
  const fijarPromedio=(desde,valor)=>{
    const id=`ausencia-${desde.id}`;
    desde.children=[{id,name:'Nota por inasistencia',weight:1,type:'leaf'}];
    desde.drop_lowest=null;notas[id]=valor;valores.set(desde.id,valor);
  };
  promedios.slice(maxPromedios).forEach(({entrada,desde})=>{
    if(Number.isFinite(regla.notaExceso)){
      fijarPromedio(desde,regla.notaExceso);
      activas.push({...entrada,tipo:'nota_exceso',notaExceso:regla.notaExceso});
    }else bloqueadas.push({...entrada,tipo:'promedio',motivo:'sin_regla_para_exceso'});
  });
  promedios.slice(0,maxPromedios).forEach(({entrada,desde,otros})=>{
    const conocidos=otros.map(n=>({valor:valores.get(n.id),peso:Number(n.weight)||0}));
    const total=conocidos.reduce((s,n)=>s+n.peso,0);
    if(!(total>0)||conocidos.some(n=>n.valor==null)){
      pendientes.push({...entrada,tipo:'promedio',motivo:'faltan_sumativas'});return;
    }
    const valor=conocidos.reduce((s,n)=>s+n.valor*n.peso,0)/total;
    fijarPromedio(desde,valor);
    activas.push({...entrada,tipo:'promedio',valor});
  });
  // Una casilla fija tiene su propio peso dentro del grupo. El programa puede
  // reemplazarla por la casilla correspondiente de otro grupo o por el examen.
  // La declaración identifica categoría + número, nunca el id temporal de la
  // nota, que cambia al editarla o al ponerle fecha.
  (regla.reemplazosCasilla||[]).forEach(entrada=>{
    const desdeId=gh_claveAusenciaCasilla(entrada.desdeId,entrada.desdeSlot);
    if(!declaradas.has(desdeId)||vistas.has(desdeId))return;
    vistas.add(desdeId);
    const desde=nodos.get(entrada.desdeId),hacia=nodos.get(entrada.haciaId);
    const hojaDesde=(desde?.children||[]).find(n=>n.slot===entrada.desdeSlot);
    const hojaHacia=Number.isInteger(entrada.haciaSlot)
      ?(hacia?.children||[]).find(n=>n.slot===entrada.haciaSlot):null;
    if(!hojaDesde||!hacia||(Number.isInteger(entrada.haciaSlot)&&!hojaHacia)){
      inactivas.push({...entrada,desdeId,tipo:'reemplazo_casilla',motivo:'pauta_cambio'});return;
    }
    if(typeof notas[hojaDesde.id]==='number'){
      inactivas.push({...entrada,desdeId,tipo:'reemplazo_casilla',motivo:'tiene_nota'});return;
    }
    const valor=hojaHacia?notas[hojaHacia.id]:valores.get(entrada.haciaId);
    if(typeof valor!=='number'){
      pendientes.push({...entrada,desdeId,tipo:'reemplazo_casilla',motivo:'falta_destino'});return;
    }
    notas[hojaDesde.id]=valor;
    activas.push({...entrada,desdeId,tipo:'reemplazo_casilla',valor});
  });
  declaradas.forEach(desdeId=>{if(!vistas.has(desdeId))inactivas.push({desdeId,tipo:'desconocida',motivo:'pauta_cambio'});});
  return {estructura:copia,notas,activas,pendientes,inactivas,bloqueadas};
}
// Reemplazos voluntarios del programa. Cada candidato se mide con el cálculo
// completo del ramo (descartes y compuertas incluidos); si no mejora, la nota
// original queda intacta. Las notas derivadas viven solo en esta copia.
function gh_reemplazosOptativos(structure,grades,reglas,calcular,originales=grades){
  if(!Array.isArray(reglas)||!reglas.length)return {notas:grades,aplicados:[]};
  const nodos=gh_nodosPorId(structure),actual={...grades},aplicados=[];
  const hojas=id=>{
    const nodo=nodos.get(id);
    return nodo&&nodo.type==='group'?(nodo.children||[]).filter(n=>n.type==='leaf'):[];
  };
  const completo=id=>{const lista=hojas(id);return lista.length>0&&lista.every(n=>Number.isFinite(originales[n.id]));};
  const valoresOriginales=new Map(calculateFinalGrade(structure,originales).breakdown.map(n=>[n.id,n.value]));
  for(const regla of reglas){
    if(!regla||typeof regla.fuenteId!=='string'||!Array.isArray(regla.destinosIds)||
       !Array.isArray(regla.rendidasIds)||!completo(regla.fuenteId)||
       regla.rendidasIds.some(id=>!completo(id)))continue;
    const fuente=valoresOriginales.get(regla.fuenteId);
    if(!Number.isFinite(fuente)||Number.isFinite(regla.minFuente)&&fuente+1e-9<regla.minFuente)continue;
    const destinos=regla.destinosIds.flatMap(hojas).filter(n=>Number.isFinite(originales[n.id]));
    const usados=new Set();
    while(true){
      const origen=calcular(actual).valor;
      if(!Number.isFinite(origen))break;
      let mejor=origen,candidato=null;
      for(const hoja of destinos){
        if(usados.has(hoja.id))continue;
        const previo=actual[hoja.id];
        if(regla.tipo==='mezcla'){
          if(!(regla.fraccion>0&&regla.fraccion<=1))continue;
          actual[hoja.id]=previo*(1-regla.fraccion)+fuente*regla.fraccion;
        }else if(regla.tipo==='reemplazo')actual[hoja.id]=fuente;
        else continue;
        const nuevo=calcular(actual).valor;
        if(Number.isFinite(nuevo)&&nuevo>mejor+1e-9){mejor=nuevo;candidato={id:hoja.id,valor:actual[hoja.id]};}
        actual[hoja.id]=previo;
      }
      if(!candidato)break;
      actual[candidato.id]=candidato.valor;
      aplicados.push({tipo:regla.tipo,fuenteId:regla.fuenteId,destinoId:candidato.id});
      usados.add(candidato.id);
      if(regla.cantidad!=='todas')break;
    }
  }
  return {notas:actual,aplicados};
}
// Décimas y bonus que ingresa el estudiante (#631). La regla va en el preset
// del ramo (`bonus` en data.js, que presetRamo copia al ramo) y lo que ganó, en
// `ramo.bonusIngresado[id]`. Sin un valor ingresado no se suma nada: nadie
// recibe décimas por omisión. Devuelve cuánto suma cada destino:
//   entrada 'decimas' → lo ingresado / 10, con el tope `max` (en décimas)
//   entrada 'faltas'  → `suma` si faltó a `hasta` talleres o menos
// `destino` es 'final' o el id de una categoría; `si` condiciona el bonus a que
// el promedio ponderado de esas categorías SUPERE `mayorQue`, sin redondear.
function gh_bonusActivos(bonus,ingresado){
  const out={final:[],porCategoria:{}};
  (Array.isArray(bonus)?bonus:[]).forEach(b=>{
    const v=ingresado&&ingresado[b&&b.id];
    if(!b||typeof v!=='number'||!Number.isFinite(v)||v<0)return;
    let suma=0;
    if(b.entrada==='decimas'){
      const tope=typeof b.max==='number'&&b.max>=0?b.max:v;
      suma=Math.min(v,tope)/10;
    }else if(b.entrada==='faltas'){
      if(Number.isInteger(v)&&typeof b.hasta==='number'&&v<=b.hasta&&typeof b.suma==='number')suma=b.suma;
    }
    if(!(suma>0))return;
    const si=b.si&&Array.isArray(b.si.catIds)&&typeof b.si.mayorQue==='number'?{ids:b.si.catIds,mayorQue:b.si.mayorQue}:null;
    if(b.destino==='final')out.final.push({suma,si});
    else if(typeof b.destino==='string')(out.porCategoria[b.destino]=out.porCategoria[b.destino]||[]).push({suma,si});
  });
  return out;
}
function gh_tieneBonus(node){return !!(node&&((Array.isArray(node.bonus)&&node.bonus.length)||(node.children||[]).some(gh_tieneBonus)));}

function calculateFinalGrade(structure,grades,overrides={}){
  overrides={...overrides};
  const breakdown=[],emptyLeaves=[],gates=[],drops=[],formulas=[];
  const escalaMax=gh_meta(structure)?.grade_scale?.max??7.0;
  function cumple(condicion,valores){
    const entradas=(condicion.catIds||[]).map(id=>valores.get(id));
    if(!entradas.length||entradas.some(e=>!e||e.value===null||!e.complete))return null;
    const total=entradas.reduce((a,e)=>a+e.weight,0);
    if(!(total>0))return null;
    const promedio=entradas.reduce((a,e)=>a+e.value*e.weight,0)/total;
    if(condicion.tipo==='no_cumple_requisitos')return promedio<condicion.min-1e-10||!entradas.some(e=>e.value>=condicion.algunaMin);
    if(condicion.tipo==='promedio_igual')return Math.abs(promedio-condicion.min)<1e-10;
    if(condicion.tipo==='promedio_menor')return promedio<condicion.min-1e-10;
    return promedio>=condicion.min-1e-10;
  }
  function evalNode(node){
    if(node.type==='leaf'){const g=grades[node.id];const value=(typeof g==='number')?g:null;breakdown.push({id:node.id,name:node.name,value,complete:value!==null});return {value,complete:value!==null};}
    let known=[],allComplete=true;
    for(const c of node.children){const cr=evalNode(c);if(!cr.complete)allComplete=false;if(cr.value!==null)known.push({child:c,value:cr.value,complete:cr.complete,weight:gh_weightOf(c,overrides)});}
    const fuera=gh_applyDrop(node,known);
    if(fuera.length)drops.push({nodeId:node.id,name:node.name,dropped:fuera.map(f=>({id:f.child.id,name:f.child.name,value:f.value})),rendidas:known.length+fuera.length});
    let ambiguo=false;
    const valores=new Map(known.map(e=>[e.child.id,e]));
    (node.formulas_condicionales||[]).forEach(regla=>{
      const resultados=(regla.cuando||[]).map(c=>cumple(c,valores));
      const pendiente=resultados.some(v=>v===null);
      const activa=!pendiente&&resultados.every(v=>v===true);
      formulas.push({nombre:regla.nombre,activa,pendiente,ambigua:activa&&regla.ambigua===true});
      if(!activa)return;
      if(regla.ambigua===true){ambiguo=true;return;}
      (regla.pesos||[]).forEach(e=>{overrides[e.catId]={...overrides[e.catId],weight:e.peso};});
      known.forEach(e=>{e.weight=gh_weightOf(e.child,overrides);});
    });
    let sumW=0,acc=0;
    for(const k of known){acc+=k.value*k.weight;sumW+=k.weight;}
    let value=ambiguo?null:sumW>0?acc/sumW:null;
    if(node.aggregation_rule==='gated_average'&&value!==null){const p=node.rule_params||{};const off=known.filter(k=>!gh_cumpleMinimo(k.value,p.min_required));const locked=off.filter(o=>o.complete);const ok=off.length===0;gates.push({nodeId:node.id,kind:'gated_average',ok,min_required:p.min_required,fail_cap:p.fail_cap,offenders:off.map(o=>o.child.name),lockedOffenders:locked.map(o=>o.child.name),pending:known.length<node.children.length});if(!ok)value=Math.min(value,p.fail_cap);}
    // Las décimas van encima del promedio del nodo, nunca sobre la escala.
    if(value!==null&&Array.isArray(node.bonus))for(const b of node.bonus){
      if(b.si){
        const de=known.filter(k=>b.si.ids.includes(k.child.id));
        const w=de.reduce((x,k)=>x+k.weight,0);
        if(!(w>0)||!(de.reduce((x,k)=>x+k.value*k.weight,0)/w>b.si.mayorQue))continue;
      }
      value=Math.min(escalaMax,value+b.suma);
    }
    breakdown.push({id:node.id,name:node.name,value,complete:allComplete});return {value,complete:allComplete};
  }
  let rootValue=evalNode(structure).value;
  const effW=gh_effWeights(structure,overrides);
  gh_collectEmpty(structure,grades,effW,emptyLeaves);
  if(formulas.some(f=>f.activa&&!f.ambigua)){
    for(let i=emptyLeaves.length-1;i>=0;i--)if(emptyLeaves[i].effectiveWeight===0)emptyLeaves.splice(i,1);
  }
  gh_leafGates(structure,grades,(gate)=>{gates.push(gate);if(!gate.ok&&rootValue!==null)rootValue=Math.min(rootValue,gate.fail_cap);});
  return {value:gh_roundFinal(rootValue,gh_meta(structure)),raw:rootValue,complete:emptyLeaves.length===0,breakdown,emptyLeaves,gates,drops,formulas,weightOverrides:overrides};
}
function gh_effWeights(structure,overrides={}){const eff={};function walk(node,pw){if(node.type==='leaf'){eff[node.id]=pw;return;}const total=node.children.reduce((s,c)=>s+gh_weightOf(c,overrides),0);for(const c of node.children){const norm=total>0?gh_weightOf(c,overrides)/total:0;walk(c,pw*norm);}}walk(structure,1);return eff;}
function gh_collectEmpty(structure,grades,effW,out){function walk(node){if(node.type==='leaf'){if(typeof grades[node.id]!=='number')out.push({id:node.id,name:node.name,effectiveWeight:effW[node.id]});return;}node.children.forEach(walk);}walk(structure);}
function gh_leafGates(structure,grades,emit){function walk(node){if(node.type==='leaf'){if(typeof node.min_grade_required==='number'){const g=grades[node.id];const known=typeof g==='number';const ok=!known||gh_cumpleMinimo(g,node.min_grade_required);emit({nodeId:node.id,kind:'min_grade_required',ok,min_required:node.min_grade_required,fail_cap:node.fail_cap,pending:!known,current:known?g:null,name:node.name});}return;}node.children.forEach(walk);}walk(structure);}
function gh_hasPendingLeaf(node,grades){return node.type==='leaf'?typeof grades[node.id]!=='number':node.children.some(c=>gh_hasPendingLeaf(c,grades));}
function gh_hasPendingDrop(node,grades){
  if(node.type==='leaf')return false;
  return (!!node.drop_lowest&&gh_hasPendingLeaf(node,grades))||node.children.some(c=>gh_hasPendingDrop(c,grades));
}
function gh_hasConditionalFormula(node){return !!(node.formulas_condicionales||[]).length||(node.children||[]).some(gh_hasConditionalFormula);}
function gh_projectGrades(grades,emptyLeaves,value){
  const projected={...grades};
  emptyLeaves.forEach(l=>{projected[l.id]=value;});
  return projected;
}
function solveForTarget(structure,grades,target,overrides={},options={}){
  // La interfaz distingue 7 de 7,001: el adaptador puede pedir el resultado
  // sin redondear y extender la búsqueda para explicar una meta inalcanzable.
  const requiredValue=n=>options.precision===null?n:gh_excelRound(n,2);
  const meta=gh_meta(structure);const scaleMin=meta?.grade_scale?.min??1.0,scaleMax=meta?.grade_scale?.max??7.0;
  // Si la nota oficial se informa a una décima, 3,95 ya llega a 4,0. La meta
  // se resuelve contra ese borde real, no contra el 4,00 bruto que la interfaz
  // nunca muestra. Las compuertas se evalúan aparte, con `gh_cumpleMinimo`.
  const targetRaw=gh_bordeOficial(target,meta);
  const direct=calculateFinalGrade(structure,grades,overrides);const effW=gh_effWeights(structure,overrides);
  let known=0;for(const id in grades){if(typeof grades[id]==='number'&&effW[id]!=null)known+=grades[id]*effW[id];}
  const remainingWeight=direct.emptyLeaves.reduce((s,l)=>s+l.effectiveWeight,0);
  const conditions=[],gateWarnings=[];
  for(const g of direct.gates){
    if(g.kind==='gated_average'&&g.lockedOffenders&&g.lockedOffenders.length>0)gateWarnings.push(`${g.lockedOffenders.join(', ')} ya quedó bajo ${g.min_required} y está completo: la nota queda topada en ${g.fail_cap}.`);
    if(g.kind==='min_grade_required'&&!g.ok&&!g.pending)gateWarnings.push(`${g.name} quedó en ${g.current} (mín. ${g.min_required}): nota topada en ${g.fail_cap}.`);
    if(g.kind==='gated_average'&&g.pending&&(!g.lockedOffenders||g.lockedOffenders.length===0))conditions.push(`Cada componente con compuerta debe terminar en ≥ ${g.min_required}.`);
    if(g.kind==='min_grade_required'&&g.pending)conditions.push(`${g.name} debe ser ≥ ${g.min_required} (si no, repruebas pese al promedio).`);
  }
  if(remainingWeight===0){const reached=direct.value;return {feasible:reached>=target&&gateWarnings.length===0,requiredAverage:null,emptyLeaves:direct.emptyLeaves,message:gateWarnings.length?`Curso completo, con tope por compuerta. Nota final: ${direct.value}.`:(reached>=target?`Ya alcanzaste ${target}.`:`No quedan evaluaciones; tu nota final es ${direct.value}.`),conditions,gateWarnings,scaleMin,scaleMax,dropAware:false};}
  if(gh_hasConditionalFormula(structure)){
    conditions.push('Se proyecta la misma nota en todas las pendientes y se comprueban las fórmulas condicionales del programa.');
    for(let decima=Math.ceil(scaleMin*10);decima<=Math.floor(scaleMax*10);decima++){
      const candidato=decima/10;
      const final=calculateFinalGrade(structure,gh_projectGrades(grades,direct.emptyLeaves,candidato),overrides).value;
      if(final!==null&&final>=target)return {feasible:true,requiredAverage:candidato,emptyLeaves:direct.emptyLeaves,message:'',conditions,gateWarnings,scaleMin,scaleMax,dropAware:true};
    }
    return {feasible:false,requiredAverage:options.extrapolate?scaleMax+1:null,emptyLeaves:direct.emptyLeaves,message:'La meta no se alcanza con una misma nota entre 1,0 y 7,0 en todas las pendientes.',conditions,gateWarnings,scaleMin,scaleMax,dropAware:true};
  }
  // Con una nota pendiente en un grupo que descarta la peor, su peso efectivo
  // depende de su propio valor. En vez de fingir un peso fijo, proyectamos la
  // misma nota en todas las pendientes y buscamos el mínimo que llega a meta.
  const dropAware=gh_hasPendingDrop(structure,grades);
  // Con décimas la nota deja de ser lineal (tienen tope y condición): se busca
  // la nota necesaria con el motor completo, igual que con un descarte.
  if(dropAware||gh_tieneBonus(structure)){
    if(dropAware)conditions.push('El cálculo supone la misma nota en todas las evaluaciones pendientes y considera que la peor nota del grupo se descarta según la regla del programa.');
    const finalCon=value=>calculateFinalGrade(structure,gh_projectGrades(grades,direct.emptyLeaves,value),overrides).value;
    const conMax=finalCon(scaleMax);
    if(conMax===null||gateWarnings.length>0||(!options.extrapolate&&conMax<target))return {feasible:false,requiredAverage:gh_excelRound(scaleMax,2),emptyLeaves:direct.emptyLeaves,message:'',conditions,gateWarnings,scaleMin,scaleMax,dropAware};
    const conMin=finalCon(scaleMin);
    if(conMin!==null&&conMin>=target)return {feasible:true,requiredAverage:scaleMin,emptyLeaves:direct.emptyLeaves,message:'',conditions,gateWarnings,scaleMin,scaleMax,dropAware};
    let lo=scaleMin,hi=scaleMax;
    if(options.extrapolate){
      while(finalCon(hi)<target&&Number.isFinite(hi*2))hi*=2;
    }
    for(let i=0;i<48;i++){
      const mid=(lo+hi)/2;
      if(finalCon(mid)!==null&&finalCon(mid)>=target)hi=mid;else lo=mid;
    }
    return {feasible:hi<=scaleMax,requiredAverage:requiredValue(hi),emptyLeaves:direct.emptyLeaves,message:'',conditions,gateWarnings,scaleMin,scaleMax,dropAware};
  }
  const required=(targetRaw-known)/remainingWeight;const reqRounded=requiredValue(required);
  const feasible=reqRounded>=scaleMin&&reqRounded<=scaleMax&&gateWarnings.length===0;
  return {feasible,requiredAverage:reqRounded,emptyLeaves:direct.emptyLeaves,message:'',conditions,gateWarnings,scaleMin,scaleMax,dropAware};
}

// Adaptador del estado de GradeHub para el núcleo. No lee el DOM ni el estado
// global: la app y, más adelante, una Pages Function entregan sus dependencias.
// Las funciones internas se mantienen junto al motor para que la misma cuenta
// de casillas, descartes, compuertas y ramos vinculados no se reescriba afuera.
function gh_crearCalculoRamo(deps){
  const normName=deps.normName;
  const copiarRecuperativo=deps.copiarRecuperativo;
  const definicionPresetDelRamo=deps.definicionPresetDelRamo;
  // La universidad de la cuenta. Sin ella, la regla común.
  const reglasNota=()=>gh_reglasNota(typeof deps.tenant==='function'?deps.tenant():null);
  const S={get ramos(){return deps.ramos();}};

  // `pesosCasillas` (opcional) dice cuánto pesa cada casilla frente a las
  // otras de la misma evaluación. Lo usa el Laboratorio de Dinámica: el Lab 0
  // no tiene control y ese 10% se lo lleva su evaluación de pares, que pesa
  // 1,5 veces la de los otros laboratorios. Sin el campo, todas pesan 1.
  function pesoCasilla(c,slot){
    const p=Array.isArray(c&&c.pesosCasillas)?Number(c.pesosCasillas[slot]):NaN;
    return Number.isFinite(p)&&p>0?p:1;
  }
  function hojasCategoria(c){
    const notas=Array.isArray(c&&c.notas)?c.notas:[];
    const slots=Number.isInteger(c&&c.slots)&&c.slots>1?c.slots:0;
    if(!slots)return notas.map(n=>({id:n.id,name:n.nombre,weight:(n.peso||1),type:'leaf'}));
    const porSlot=new Map(),sinSlot=[];
    notas.forEach(n=>{
      if(Number.isInteger(n.slot)&&n.slot>=0&&n.slot<slots)porSlot.set(n.slot,n);
      else sinSlot.push(n);
    });
    const reales=[...porSlot.values(),...sinSlot];
    const ids=new Set(reales.map(n=>n.id));
    const hojas=reales.map(n=>({id:n.id,name:n.nombre,weight:(n.peso||1)*(Number.isInteger(n.slot)&&porSlot.get(n.slot)===n?pesoCasilla(c,n.slot):1),type:'leaf',slot:n.slot}));
    for(let slot=0;slot<slots;slot++){
      if(porSlot.has(slot))continue;
      let id=`__gh_pendiente_slot__${c.id}__${slot}`;
      while(ids.has(id))id+='_';
      ids.add(id);
      hojas.push({id,name:`${c.nombre} pendiente ${slot+1}`,weight:pesoCasilla(c,slot),type:'leaf',slot});
    }
    return hojas;
  }
  function reglasCalculoVigentes(r){
    const categorias=(r&&r.categorias||[]).filter(c=>!c.fueraDePauta);
    return (r&&r.gates||[]).filter(g=>['conditional_weights','absence_limit'].includes(g.type)&&
      Array.isArray(g.pauta)&&g.pauta.length===categorias.length&&g.pauta.every(e=>{
        const c=categorias.find(c=>c.id===e.catId);
        return c&&c.peso===e.peso&&(c.slots||1)===e.slots&&normName(c.nombre)===normName(e.nombre)&&JSON.stringify(c.dropLowest||null)===JSON.stringify(e.dropLowest||null);
      }));
  }
  function ramoToStructure(r){
    const bonus=gh_bonusActivos(r.bonus,r.bonusIngresado);
    const conBonus=(nodo,lista)=>lista&&lista.length?{...nodo,bonus:lista}:nodo;
    return conBonus({__meta:reglasNota(),
      id:'final',name:r.nombre||'Ramo',type:'group',aggregation_rule:'weighted_average',
      formulas_condicionales:reglasCalculoVigentes(r).filter(g=>g.type==='conditional_weights'),
      children:categoriasVigentes(r).filter(c=>c.peso>0||(c.optativa===true&&(c.notas||[]).some(n=>Number.isFinite(n.valor)))).map(c=>conBonus({id:c.id,name:c.nombre,weight:c.peso,type:'group',aggregation_rule:'weighted_average',
        drop_lowest:c.dropLowest||null,
        children:hojasCategoria(c)},bonus.porCategoria[c.id]))},bonus.final);
  }
  function gradesOf(r){const g={};(r.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{if(n.valor!==null&&n.valor!==undefined)g[n.id]=n.valor;}));return g;}
  function avgPond(notas){let tv=0,tp=0;notas.forEach(n=>{if(n.valor!==null){tv+=n.valor*(n.peso||1);tp+=(n.peso||1);}});return tp>0?tv/tp:null;}
  function notasVigentesSinDescarte(cat){
    const notas=(cat&&cat.notas||[]).filter(n=>typeof n.valor==='number');
    if(!(Number.isInteger(cat&&cat.slots)&&cat.slots>1))return notas;
    const porCasilla=new Map();
    notas.forEach(n=>{if(Number.isInteger(n.slot))porCasilla.set(n.slot,n);});
    return porCasilla.size?[...porCasilla.values()]:notas;
  }
  function promedioCompletoSinDescarte(cat){
    const objetivo=Number.isInteger(cat&&cat.slots)&&cat.slots>1?cat.slots:1;
    const notas=(cat&&cat.notas||[]).filter(n=>typeof n.valor==='number');
    const vigentes=notasVigentesSinDescarte(cat);
    const conCasilla=objetivo>1&&vigentes.some(n=>Number.isInteger(n.slot));
    const rendidas=conCasilla?vigentes.length:notas.length;
    if(rendidas<objetivo)return null;
    return avgPond(vigentes);
  }
  function estadoEximicion(ramo){
    const def=definicionPresetDelRamo(ramo);
    const regla=!Array.isArray(def)&&def&&def.eximicion;
    if(!regla||!Array.isArray(regla.segun)||regla.ignoraDescartes!==true)return null;
    const categorias=ramo.categorias||[];
    const examen=categorias.find(c=>normName(c.nombre)===normName(regla.evaluacion));
    if(!examen)return null;
    const confirmada=ramo.eximicionConfirmada===true;
    const base={activa:false,pendiente:false,examenId:examen.id,regla,confirmada};
    if(avgPond(examen.notas)!==null)return {...base,razon:'examen_rendido'};
    const fuentes=regla.segun.map(nombre=>categorias.find(c=>normName(c.nombre)===normName(nombre))).filter(Boolean);
    if(fuentes.length!==regla.segun.length)return null;
    const promedios=fuentes.map(promedioCompletoSinDescarte);
    if(promedios.some(p=>p===null))return {...base,pendiente:true,razon:'incompleto'};
    const pesoTotal=fuentes.reduce((s,c)=>s+(Number(c.peso)||0),0);
    const promedio=pesoTotal>0?fuentes.reduce((s,c,i)=>s+promedios[i]*(Number(c.peso)||0),0)/pesoTotal:null;
    const minimoFallido=(Array.isArray(regla.minimos)?regla.minimos:[]).find(condicion=>{
      const cat=categorias.find(c=>normName(c.nombre)===normName(condicion.evaluacion));
      if(!cat||!Number.isFinite(condicion.min))return true;
      if(condicion.cadaNota===true){
        const notas=notasVigentesSinDescarte(cat);
        return !notas.length||notas.some(n=>n.valor<condicion.min);
      }
      const valor=promedioCompletoSinDescarte(cat);
      return valor===null||valor<condicion.min;
    });
    if(minimoFallido)return {...base,promedio,razon:'minimo_categoria',minimoFallido};
    const elegible=promedio!==null&&promedio>=regla.min;
    const requiereConfirmacion=regla.requiereConfirmacion===true;
    const activa=elegible&&(!requiereConfirmacion||confirmada);
    return {...base,activa,elegible,promedio,
      puedeConfirmar:elegible&&requiereConfirmacion&&!confirmada,
      razon:!elegible?'promedio':activa?'cumple':'falta_confirmacion'};
  }
  function categoriaEximida(ramo,cat){const estado=estadoEximicion(ramo);return !!(estado&&estado.activa&&estado.examenId===cat.id);}
  function categoriasVigentes(ramo){return (ramo&&ramo.categorias||[]).filter(c=>!categoriaEximida(ramo,c));}
  function reglasAusenciaOficiales(ramo){
    const limite=reglasCalculoVigentes(ramo).find(g=>g.type==='absence_limit');
    return ramo&&ramo.reglasAusenciaJustificada||(limite&&{traspasos:limite.traspasos})||null;
  }
  function estadoAusenciasJustificadas(ramo){
    if(!ramo)return null;
    const oficial=reglasAusenciaOficiales(ramo);
    const declarada=ramo.reglasAusenciaJustificadaUsuario&&ramo.reglasAusenciaJustificadaUsuario.declaradaPor==='estudiante'
      ? ramo.reglasAusenciaJustificadaUsuario:null;
    const limite=reglasCalculoVigentes(ramo).find(g=>g.type==='absence_limit');
    const regla=oficial||declarada;
    if(!regla)return null;
    // La elección entre rezago y acumulación viene del formulario del curso.
    // El techo y la nota del excedente son una norma institucional distinta.
    const normaFacultad=limite?{nivel:'programa',topePesoDestino:limite.max,requiereResolucion:true}:{nivel:'facultad',topePesoDestino:75,notaExceso:1};
    return {...gh_prepararAusenciasJustificadas(ramoToStructure(ramo),gradesOf(ramo),regla,ramo.ausenciasJustificadas,normaFacultad),
      origenRegla:oficial?'programa':'estudiante',normaAplicada:normaFacultad};
  }
  function avgDeGrupo(r,catIds){
    const set=new Set(catIds||[]);
    let num=0,den=0;
    (r.categorias||[]).forEach(c=>{
      if(!set.has(c.id))return;
      const a=avgPond(c.notas);
      if(a===null)return;
      num+=a*(c.peso||0);den+=(c.peso||0);
    });
    return den>0?num/den:null;
  }
  function avgDeGrupoCalculado(res,estructura,catIds){
    const valores=new Map((res.breakdown||[]).map(n=>[n.id,n.value]));
    const nodos=new Map((estructura.children||[]).map(n=>[n.id,n]));
    let num=0,den=0;
    (catIds||[]).forEach(id=>{
      const peso=Number((nodos.get(id)||{}).weight)||0,valor=valores.get(id);
      if(peso>0&&valor!==null&&valor!==undefined){num+=valor*peso;den+=peso;}
    });
    return den>0?num/den:null;
  }
  // Lo que compara el mínimo de una evaluación. Con pesos por casilla, el
  // promedio que pondera la nota final no es el que se exige: el mínimo de la
  // evaluación de pares del Laboratorio de Dinámica es sobre el promedio simple
  // de las seis (decisión de Lucas, 2026-10-15). Sin pesos por casilla, es el
  // mismo valor de siempre.
  function valorParaCompuerta(r,res,catId){
    const c=(r.categorias||[]).find(x=>x.id===catId);
    if(c&&Array.isArray(c.pesosCasillas)){
      const notas=notasVigentesSinDescarte(c);
      return notas.length?notas.reduce((s,n)=>s+n.valor,0)/notas.length:null;
    }
    const node=res.breakdown.find(b=>b.id===catId);
    return node?node.value:null;
  }
  function calculoRamoConCompuertas(r){
    const ausencias=estadoAusenciasJustificadas(r);
    const estructura=ausencias?ausencias.estructura:ramoToStructure(r);
    const notas=ausencias?ausencias.notas:gradesOf(r);
    function calcular(notasEvaluadas){
      const arbol=gh_clonarArbol(estructura);
      const res=calculateFinalGrade(arbol,notasEvaluadas);
      // Los pesos efectivos solo viven en la copia de cálculo; jamás en las notas.
      Object.entries(res.weightOverrides).forEach(([id,extra])=>{const node=arbol.children.find(n=>n.id===id);if(node)node.weight=extra.weight;});
      let v=ausencias&&ausencias.bloqueadas&&ausencias.bloqueadas.length?null:res.raw,limitadoPorCompuerta=false;
      // Con el semestre a medias, el promedio de siempre pondera cada evaluación
      // con lo que lleva. Un ramo cuya pauta declara `promedioParcial:'por-casilla'`
      // pondera cada nota con su peso efectivo en el ramo: así el Laboratorio de
      // Dinámica da el promedio de los laboratorios que ya hiciste, igual que la
      // planilla oficial. Con todo rendido, las dos cuentas son la misma.
      if(v!==null&&r.promedioParcial==='por-casilla'&&res.emptyLeaves.length){
        const pesos=gh_effWeights(arbol);let suma=0,peso=0;
        Object.entries(notasEvaluadas).forEach(([id,valor])=>{const w=pesos[id];if(typeof valor==='number'&&w>0){suma+=valor*w;peso+=w;}});
        if(peso>0)v=suma/peso;
      }
      if(v!==null && Array.isArray(r.gates)){
        for(const g of r.gates){
          if(g.type==='min_grade_required'){
            const valor=valorParaCompuerta(r,res,g.catId);
            if(valor!==null && !gh_cumpleCompuerta(valor,g)){
              const siguiente=Math.min(v,g.cap);if(siguiente<v)limitadoPorCompuerta=true;v=siguiente;
            }
          } else if(g.type==='group_min'){
            const ga=avgDeGrupoCalculado(res,arbol,g.catIds);
            if(ga!==null && !gh_cumpleCompuerta(ga,g)){
              const tope=(g.cap==='self')?ga:g.cap;
              const siguiente=Math.min(v,tope);if(siguiente<v)limitadoPorCompuerta=true;v=siguiente;
            }
          }
        }
      }
      return {res,valor:v,limitadoPorCompuerta,estructura:arbol,notas:notasEvaluadas,ausencias};
    }
    const elegidas=gh_reemplazosOptativos(estructura,notas,r.reemplazosOptativos,calcular,gradesOf(r));
    return {...calcular(elegidas.notas),reemplazosOptativosAplicados:elegidas.aplicados};
  }
  function ramoCompletamenteEvaluado(r,calculo){
    // Tener nota en todo lo declarado no cierra un ramo cuya pauta aún omite
    // parte de la ponderación. Las categorías eximidas siguen en esta suma:
    // no se deben pedir sus notas para dar por terminado el ramo.
    const pesoDeclarado=(r&&r.categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
    if(Math.abs(pesoDeclarado-100)>0.05)return false;
    const cubiertas=new Set((calculo&&calculo.ausencias&&calculo.ausencias.activas||[]).map(x=>x.desdeId));
    const categorias=categoriasVigentes(r);
    return categorias.length>0&&categorias.every(c=>{
      if(c.optativa===true&&c.peso===0)return true;
      if(cubiertas.has(c.id))return true;
      const objetivo=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
      return (c.notas||[]).filter(n=>typeof n.valor==='number').length>=objetivo;
    });
  }
  function estadoRecuperativo(r,calculo){
    const regla=copiarRecuperativo(r&&r.recuperativo);if(!regla)return null;
    const base=calculo||calculoRamoConCompuertas(r);
    return gh_estadoRecuperativo(base.valor,ramoCompletamenteEvaluado(r,base),base.limitadoPorCompuerta,regla,r.recuperativoRendido,gh_meta(base.estructura));
  }
  function resumenCategoriasCalculadas(r,calculo){
    const base=calculo||calculoRamoConCompuertas(r);
    const valores=new Map((base.res.breakdown||[]).map(n=>[n.id,n.value]));
    return (base.estructura.children||[]).filter(c=>(Number(c.weight)||0)>0).map(c=>({id:c.id,nombre:c.name,peso:Number(c.weight)||0,valor:valores.get(c.id)}));
  }
  function ramoAvg(r,visitados,ramosContexto){
    // Las correcciones manuales solo viven en un ramo archivado. Si falta la
    // caché del semestre, siguen siendo el resultado que la persona confirmó.
    if(r&&typeof r.avgOverride==='number'&&Number.isFinite(r.avgOverride))return r.avgOverride;
    const base=calculoRamoConCompuertas(r);
    const recuperativo=estadoRecuperativo(r,base);
    const v=recuperativo?recuperativo.valor:base.valor;
    return combinarConRamoVinculado(r,v,visitados,ramosContexto);
  }
  function ramoVinculado(r,ramosContexto){
    if(!r||!r.aporta||!r.aporta.ramo)return null;
    const objetivo=normName(r.aporta.ramo);
    return (ramosContexto||S.ramos||[]).find(x=>x!==r&&normName(x.nombre)===objetivo)||null;
  }
  function combinarConRamoVinculado(r,propio,visitados,ramosContexto){
    const link=r&&r.aporta;
    if(!link||propio===null)return propio;
    const vistos=visitados||new Set();
    if(vistos.has(r.id))return propio;
    vistos.add(r.id);
    const otro=ramoVinculado(r,ramosContexto);
    if(!otro)return propio;
    const externo=ramoAvg(otro,vistos,ramosContexto);
    if(externo===null)return propio;
    const p=(link.peso||0)/100;
    let v=propio*(1-p)+externo*p;
    if(typeof link.min==='number'&&(!gh_cumpleMinimo(propio,link.min)||!gh_cumpleMinimo(externo,link.min)))v=Math.min(propio,externo);
    return v;
  }
  function gatesActivas(r){
    const calculo=calculoRamoConCompuertas(r);
    const valores=new Map((calculo.res.breakdown||[]).map(n=>[n.id,n.value]));
    const out=[];
    (r.gates||[]).forEach(g=>{
      if(g.type==='min_grade_required'){
        const c=(r.categorias||[]).find(x=>x.id===g.catId);
        if(!c)return;
        const a=Array.isArray(c.pesosCasillas)?valorParaCompuerta(r,calculo.res,c.id):valores.get(c.id);
        if(a!==null&&!gh_cumpleCompuerta(a,g))out.push({nombre:g.nombre||c.nombre,actual:a,min:g.min,cap:g.cap});
      } else if(g.type==='group_min'){
        const ga=avgDeGrupoCalculado(calculo.res,calculo.estructura,g.catIds);
        if(ga!==null&&!gh_cumpleCompuerta(ga,g)){
          out.push({nombre:g.nombre||'Requisito',actual:ga,min:g.min,cap:(g.cap==='self')?ga:g.cap,grupo:true});
        }
      }
    });
    return out;
  }
  function estadoParaNotaNecesaria(ramo){
    const calculo=calculoRamoConCompuertas(ramo);
    const estructura=calculo.estructura,notas=calculo.notas;
    const total=(estructura.children||[]).reduce((s,c)=>s+(Number(c.weight)||0),0);
    if(total<=0)return {total:0,conocido:0,pendiente:0};
    const pesos=gh_effWeights(estructura);
    const valores=new Map((calculo.res.breakdown||[]).map(c=>[c.id,c.value]));
    const categorias=new Map(categoriasVigentes(ramo).map(c=>[c.id,c]));
    let conocido=0,pesoConocido=0;
    (estructura.children||[]).forEach(grupo=>{
      const c=categorias.get(grupo.id),pesoGrupo=Number(grupo.weight)||0;
      if(!(pesoGrupo>0))return;
      // Las categorías sintéticas (el excedente con 1,0) ya están calificadas.
      // Una categoría directa también cuenta completa cuando tiene valor.
      if(!c||!(Number.isInteger(c.slots)&&c.slots>1)){
        const valor=valores.get(grupo.id);
        if(typeof valor==='number'){conocido+=valor*pesoGrupo;pesoConocido+=pesoGrupo;}
        return;
      }
      (grupo.children||[]).forEach(hoja=>{
        const valor=notas[hoja.id],peso=(pesos[hoja.id]||0)*total;
        if(typeof valor==='number'){conocido+=valor*peso;pesoConocido+=peso;}
      });
    });
    return {total,conocido:conocido/total,pendiente:Math.max(0,1-pesoConocido/total)};
  }
  // Las dos partes de un ramo con `aporta`, cada una por su cuenta: la cátedra
  // de Dinámica y su laboratorio. El promedio combinado no dice cuál de las dos
  // te está dejando abajo, y cada una tiene que llegar sola al mínimo del
  // vínculo. null si el ramo no recibe aporte o si su nota es una corrección
  // manual de un ramo archivado (ahí no hay partes que separar).
  // `necesaria` es lo que le falta a la cátedra sola para su mínimo.
  function partesDelVinculo(r,ramosContexto){
    const link=r&&r.aporta;
    if(!link||!link.ramo||!link.peso)return null;
    if(typeof r.avgOverride==='number'&&Number.isFinite(r.avgOverride))return null;
    const min=typeof link.min==='number'?link.min:4.0;
    const base=calculoRamoConCompuertas(r);
    const recuperativo=estadoRecuperativo(r,base);
    const otro=ramoVinculado(r,ramosContexto);
    return {
      min,
      propio:{valor:recuperativo?recuperativo.valor:base.valor,necesaria:notaNecesaria(r,min,{soloPropio:true})},
      externo:{ramo:otro,valor:otro?ramoAvg(otro,new Set([r.id]),ramosContexto):null},
    };
  }
  // Lo mínimo que hay que sacar en cada evaluación pendiente para que ninguna
  // compuerta tope la final bajo la meta, o null si ninguna la topa.
  //
  // El solver resuelve el promedio ponderado y las compuertas se aplican
  // después (calculoRamoConCompuertas), así que la nota necesaria las ignoraba:
  // con "presentación a examen ≥ 3,0" decía "necesitas 2,9", y con 2,9 en todo
  // lo pendiente la presentación quedaba en 2,9 y topaba la final ahí.
  //
  // Se proyecta la misma nota en todas las pendientes, como el solver, y se
  // miden las compuertas con sus propias reglas. Subir esa nota nunca baja el
  // promedio de una evaluación ni de un grupo, así que basta una bisección. Si
  // ninguna nota alcanza —la compuerta ya cerró bajo la meta—, se devuelve
  // fuera de escala para que la interfaz diga "ya no es posible".
  function exigenciaDeCompuertas(ramo,raiz,notas,objetivo,base){
    const compuertas=(ramo.gates||[]).filter(g=>g&&(g.type==='min_grade_required'||g.type==='group_min'));
    if(!compuertas.length)return null;
    const pendientes=calculateFinalGrade(raiz,notas).emptyLeaves;
    if(!pendientes.length)return null;
    const meta=gh_meta(raiz),borde=gh_bordeOficial(objetivo,meta);
    const escalaMin=meta?.grade_scale?.min??1,escalaMax=meta?.grade_scale?.max??7;
    const nodos=new Map((raiz.children||[]).map(n=>[n.id.slice('propio:'.length),n]));
    const tope=x=>{
      const proyectadas=gh_projectGrades(notas,pendientes,x);
      const res=calculateFinalGrade(raiz,proyectadas);
      const valores=new Map(res.breakdown.map(b=>[b.id,b.value]));
      const valorDe=id=>{const v=valores.get('propio:'+id);return typeof v==='number'?v:null;};
      // Con pesos por casilla el mínimo es sobre el promedio simple de las
      // casillas (valorParaCompuerta), no sobre el ponderado de la categoría.
      const valorEvaluacion=id=>{
        const c=(ramo.categorias||[]).find(x=>x.id===id);
        if(!(c&&Array.isArray(c.pesosCasillas)))return valorDe(id);
        const nodo=nodos.get(id);
        if(!(nodo&&nodo.children))return valorParaCompuerta(ramo,base.res,id);
        const hojas=nodo.children.map(h=>proyectadas[h.id]).filter(v=>typeof v==='number');
        return hojas.length?hojas.reduce((a,b)=>a+b,0)/hojas.length:null;
      };
      let t=Infinity;
      for(const g of compuertas){
        if(g.type==='min_grade_required'){
          const v=valorEvaluacion(g.catId);
          if(v!==null&&!gh_cumpleCompuerta(v,g))t=Math.min(t,g.cap);
        }else{
          let num=0,den=0;
          (g.catIds||[]).forEach(id=>{
            const nodo=nodos.get(id),v=valorDe(id);
            const w=nodo?gh_weightOf(nodo,res.weightOverrides):0;
            if(w>0&&v!==null){num+=v*w;den+=w;}
          });
          if(den>0){const ga=num/den;if(!gh_cumpleCompuerta(ga,g))t=Math.min(t,g.cap==='self'?ga:g.cap);}
        }
      }
      return t;
    };
    const alcanza=x=>tope(x)>=borde;
    if(alcanza(escalaMin))return null;
    let lo=escalaMin,hi=escalaMax;
    while(!alcanza(hi)){
      // Más allá de 64 ninguna nota cambia nada: la compuerta ya cerró.
      if(hi>=64)return escalaMax+1;
      hi*=2;
    }
    for(let i=0;i<48;i++){const mid=(lo+hi)/2;if(alcanza(mid))hi=mid;else lo=mid;}
    return hi;
  }
  // `soloPropio` pregunta por la parte propia sin el ramo que le aporta: cuánto
  // necesita la cátedra para llegar sola a la meta.
  function notaNecesaria(ramo,meta,opciones){
    const objetivo=Number.isFinite(meta)?meta:4.0;
    const baseInicial=calculoRamoConCompuertas(ramo);
    if(baseInicial.ausencias&&baseInicial.ausencias.bloqueadas&&baseInicial.ausencias.bloqueadas.length)return null;
    // El solver de estructura no conoce los reemplazos voluntarios: proyecta
    // la misma nota en lo pendiente y vuelve a pasar por el cálculo del ramo.
    if(Array.isArray(ramo.reemplazosOptativos)&&ramo.reemplazosOptativos.length&&
       !ramo.aporta&&!reglasCalculoVigentes(ramo).some(g=>g.type==='conditional_weights')){
      const pendientes=[];
      categoriasVigentes(ramo).filter(c=>c.peso>0).forEach(c=>{
        const hojas=hojasCategoria(c);
        if(!hojas.length&&c.directNota!==false)
          hojas.push({id:`__gh_pendiente_direct__${c.id}`,name:c.nombre,weight:1,type:'leaf'});
        hojas.forEach(h=>{if(!Number.isFinite(baseInicial.notas[h.id]))pendientes.push({catId:c.id,hoja:h});});
      });
      if(!pendientes.length)return null;
      const borde=gh_bordeOficial(objetivo,gh_meta(baseInicial.estructura));
      const proyectar=nota=>{
        const copia={...ramo,categorias:ramo.categorias.map(c=>({...c,notas:(c.notas||[]).slice()}))};
        pendientes.forEach(({catId,hoja})=>{
          const c=copia.categorias.find(x=>x.id===catId);
          if(!c)return;
          const i=c.notas.findIndex(n=>n.id===hoja.id);
          if(i>=0)c.notas[i]={...c.notas[i],valor:nota};
          else c.notas.push({id:hoja.id,nombre:hoja.name,valor:nota,peso:1,slot:hoja.slot});
        });
        return calculoRamoConCompuertas(copia).valor;
      };
      const minimo=gh_meta(baseInicial.estructura)?.grade_scale?.min??1;
      const maximo=gh_meta(baseInicial.estructura)?.grade_scale?.max??7;
      const alcanza=x=>{const v=proyectar(x);return v!==null&&v+1e-9>=borde;};
      if(alcanza(minimo))return minimo;
      let alto=maximo;
      while(!alcanza(alto)){if(alto>=64)return maximo+1;alto*=2;}
      let bajo=minimo;
      for(let i=0;i<48;i++){const medio=(bajo+alto)/2;if(alcanza(medio))alto=medio;else bajo=medio;}
      return alto;
    }
    const notas={};
    function preparar(r,prefijo){
      const base=calculoRamoConCompuertas(r);
      const valores=new Map(base.res.breakdown.map(n=>[n.id,n.value]));
      const categorias=new Map(categoriasVigentes(r).map(c=>[c.id,c]));
      function copiar(node){
        const id=prefijo+node.id;
        if(typeof base.notas[node.id]==='number')notas[id]=base.notas[node.id];
        return {...node,id,...(node.children?{children:node.children.map(copiar)}:{})};
      }
      // Cada nota proyectada reevalúa la fórmula original; una categoría
      // excluida puede volver a entrar cuando se cumple la condición.
      const fuente=reglasCalculoVigentes(r).some(g=>g.type==='conditional_weights')?ramoToStructure(r):base.estructura;
      const formulas=(fuente.formulas_condicionales||[]).map(g=>({...g,cuando:g.cuando.map(c=>({...c,catIds:c.catIds.map(id=>prefijo+id)})),pesos:(g.pesos||[]).map(e=>({...e,catId:prefijo+e.catId}))}));
      const raiz={...fuente,formulas_condicionales:formulas,children:fuente.children.map(node=>{
        const cat=categorias.get(node.id),valor=valores.get(node.id);
        // Una lista sin cantidad declarada conserva su promedio conocido. Un
        // grupo completo conserva su descarte ya calculado, no sus pesos brutos.
        if(!(cat&&cat.slots>1)||!gh_hasPendingLeaf(node,base.notas)){
          const id=prefijo+node.id;
          if(typeof valor==='number')notas[id]=valor;
          return {id,name:node.name,weight:node.weight,type:'leaf'};
        }
        return copiar(node);
      })};
      // La condición de un bonus a la nota final nombra categorías por id: con
      // el prefijo de acá tiene que seguir encontrándolas.
      if(Array.isArray(raiz.bonus))raiz.bonus=raiz.bonus.map(b=>b.si?{...b,si:{...b.si,ids:b.si.ids.map(id=>prefijo+id)}}:b);
      return raiz;
    }
    const propio=preparar(ramo,'propio:');
    if(!propio.children.some(c=>c.weight>0))return null;
    let estructura=propio;
    const link=ramo.aporta;
    const resolver=(est,meta)=>solveForTarget(est,notas,meta,{}, {precision:null,extrapolate:true}).requiredAverage;
    // Las compuertas son del ramo propio: pesan igual con o sin vinculado.
    const porCompuertas=exigenciaDeCompuertas(ramo,propio,notas,objetivo,baseInicial);
    const conCompuertas=v=>v===null||porCompuertas===null?v:Math.max(v,porCompuertas);
    if(opciones&&opciones.soloPropio)return conCompuertas(resolver(propio,objetivo));
    if(link&&link.peso){
      const p=link.peso/100;
      const otro=ramoVinculado(ramo);
      const externo=otro?preparar(otro,'externo:'):{id:'externo',name:link.ramo,type:'leaf'};
      // El bonus de la nota final es del ramo propio: va en su nodo, no otra
      // vez en el que lo combina con el vinculado.
      estructura={...propio,bonus:undefined,children:[{...propio,id:'propio',weight:1-p},{...externo,id:'externo',weight:p}]};

      // El promedio ponderado NO basta cuando el vínculo declara un mínimo.
      //
      // `combinarConRamoVinculado` dice: si CUALQUIERA de las dos partes queda
      // bajo el mínimo, la nota final es la MENOR de las dos. Dinámica y su
      // laboratorio son el caso: 70/30 con mínimo 4,0.
      //
      // Resolver solo el 70/30 daba números que no sirven. Con el laboratorio
      // en 4,0 decía "necesitas 1,07" y poniendo 1,1 la final quedaba en 3,9,
      // porque la parte propia se iba bajo 4,0 y mandaba ella. Y con el
      // laboratorio en 3,5 decía 1,93 cuando ya no hay nota que salve el ramo.
      //
      // Es el peor error posible en la pregunta que la app existe para
      // responder: no avisa de más, deja reprobar diciendo que vas bien.
      if(typeof link.min==='number'){
        // Si el laboratorio ya cerró bajo el mínimo, no hay nota propia que
        // alcance: la final será la suya. Se devuelve fuera de escala para que
        // la interfaz diga "ya no es posible" en vez de pedir un número.
        if(otro&&ramoCompletamenteEvaluado(otro)){
          const suyo=ramoAvg(otro);
          if(typeof suyo==='number'&&!gh_cumpleMinimo(suyo,link.min))return (gh_meta(estructura)?.grade_scale?.max??7)+1;
        }
        const ponderado=resolver(estructura,objetivo);
        // La parte propia tiene que llegar al mínimo por su cuenta.
        const porSuCuenta=resolver(propio,link.min);
        if(ponderado===null)return conCompuertas(porSuCuenta);
        if(porSuCuenta===null)return conCompuertas(ponderado);
        return conCompuertas(Math.max(ponderado,porSuCuenta));
      }
    }
    // Solo el solver decide cómo cambia el descarte al rendir; las compuertas
    // suben la exigencia cuando topan la final bajo la meta. gatesActivas sigue
    // diciendo cuál está incumplida hoy.
    return conCompuertas(resolver(estructura,objetivo));
  }
  return {notaFinalOficial:valor=>gh_notaOficial(valor,reglasNota()),reglasCalculoVigentes,reglasAusenciaOficiales,hojasCategoria,ramoToStructure,gradesOf,avgPond,promedioCompletoSinDescarte,estadoEximicion,categoriaEximida,categoriasVigentes,estadoAusenciasJustificadas,avgDeGrupo,avgDeGrupoCalculado,calculoRamoConCompuertas,ramoCompletamenteEvaluado,estadoRecuperativo,resumenCategoriasCalculadas,ramoAvg,ramoVinculado,combinarConRamoVinculado,partesDelVinculo,gatesActivas,estadoParaNotaNecesaria,notaNecesaria};
}

if(typeof module!=='undefined'&&module.exports)module.exports={gh_crearCalculoRamo,gh_reglasNota,gh_notaOficial,gh_cumpleCompuerta,gh_bonusActivos,gh_notaDesdePuntaje};
