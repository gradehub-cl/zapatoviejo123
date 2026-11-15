// Referencia opcional: el oficial sigue siendo ramoAvg con sus compuertas.
function tipoCategoriaPanel(r,c){
 const validos=['prueba','examen','control','laboratorio','tarea','otro'];
 if(validos.includes(c.tipoEvaluacion))return c.tipoEvaluacion;
 const tenant=r.origen?.tenant,tabla=tenant&&GH_TIPOS_EVALUACION_PANEL[tenant];if(!tabla)return null;
 const clave=Object.keys(tabla).find(k=>normName(k)===normName(r.origen.ramoKey))||GH_TIPOS_EVALUACION_PANEL.siglas[String(r.sigla||'').toUpperCase()];
 const tipos=tabla[clave],nombre=tipos&&Object.keys(tipos).find(k=>normName(k)===normName(c.nombre));return nombre?tipos[nombre]:null;
}
function categoriasPruebasPanel(r){return (r.categorias||[]).filter(c=>GH_TIPOS_EVALUACION_PANEL.incluidos.includes(tipoCategoriaPanel(r,c)));}
function promedioPruebasPanel(r){
 const cats=categoriasPruebasPanel(r).filter(c=>c.peso>0),sinClasificar=(r.categorias||[]).filter(c=>!tipoCategoriaPanel(r,c)).length;
 // Misma agregación del motor, árbol de referencia sin reglas académicas.
 const estructura={id:'referencia-pruebas',type:'group',aggregation_rule:'weighted_average',children:cats.map(c=>({id:c.id,type:'group',weight:c.peso,aggregation_rule:'weighted_average',children:hojasCategoria(c)}))};
 return {promedio:calculateFinalGrade(estructura,gradesOf(r)).value,sinClasificar,categorias:cats};
}
function comparacionPruebasPanel(al,r,comp){
 if(!al.soloPruebasPanel||!comp)return comp;
 const cats=categoriasPruebasPanel(r),claves=new Set(cats.map(c=>claveEvaluacionPanel(c.nombre))),notas=new Set(cats.flatMap(c=>(c.notas||[]).map(n=>claveEvaluacionPanel(n.nombre||c.nombre))));
 const categorias=(comp.categorias||[]).filter(c=>claves.has(c.clave)),evaluaciones=(comp.evaluaciones||[]).filter(n=>notas.has(n.clave));
 const incluidas=promedioPruebasPanel(r).categorias.filter(c=>(c.notas||[]).some(n=>Number.isFinite(n.valor)));
 const refs=incluidas.map(c=>datosComparacionPanel(categorias.find(x=>x.clave===claveEvaluacionPanel(c.nombre))||((c.slots||1)===1?evaluaciones.find(x=>x.clave===claveEvaluacionPanel(c.notas?.[0]?.nombre||c.nombre)):null)));
 const total=incluidas.reduce((s,c)=>s+c.peso,0);
 // Con pesos internos desiguales no se reconstruye el promedio desde medias
 // agregadas simples. Las comparaciones de cada evaluación siguen disponibles.
 const pesosIguales=incluidas.every(c=>!c.ponderaNotas&&!(c.pesosCasillas?.some(x=>x!==c.pesosCasillas[0])));
 const ramo=total&&pesosIguales&&refs.every(Boolean)?{promedio:refs.reduce((s,x,i)=>s+x.promedio*incluidas[i].peso,0)/total,personas:null}:null;
 // No inventar n para una media de grupos posiblemente distintos.
 return {...comp,ramo:null,referenciaPruebas:ramo?.promedio??null,categorias,evaluaciones,soloPruebas:true};
}
function avisoPruebasPanel(r){const x=promedioPruebasPanel(r);return `Promedio de referencia: pruebas, exámenes y controles con tipo declarado. Sin compuertas, bonus, vínculos ni descartes. ${x.sinClasificar} categorías sin clasificar quedan fuera. No cambia la nota oficial.`;}
