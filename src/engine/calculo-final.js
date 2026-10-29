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
