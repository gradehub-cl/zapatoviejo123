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
