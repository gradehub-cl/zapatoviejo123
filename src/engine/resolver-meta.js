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
