function gh_bonusActivos(bonus,ingresado,confirmado){
  const out={final:[],porCategoria:{},mejoras:[]};
  (Array.isArray(bonus)?bonus:[]).forEach(b=>{
    const v=ingresado&&ingresado[b&&b.id];
    if(!b)return;
    if(b.destino==='grupo'){
      const valor=b.entrada==='confirmacion'?(confirmado?.[b.id]===true?b.valor:null):b.entrada==='decimas'&&Number.isInteger(v)&&v>=0?v/10:null;
      if(Number.isFinite(valor)&&valor>0)out.mejoras.push({...b,valor});
      return;
    }
    if(typeof v!=='number'||!Number.isFinite(v)||v<0)return;
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
function gh_tieneBonus(node){return !!(node&&((Array.isArray(node.bonus)&&node.bonus.length)||(Array.isArray(node.mejoras)&&node.mejoras.length)||(node.children||[]).some(gh_tieneBonus)));}

function calculateFinalGrade(structure,grades,overrides={}){
  overrides={...overrides};
  const breakdown=[],emptyLeaves=[],gates=[],drops=[],formulas=[],mejoras=[],eximiciones=[];
  const resueltas=new Set();
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
    let ambiguo=false,cambiaGrupo=false;
    const cambiar=(id,valor)=>{
      const nodo=node.children.find(c=>c.id===id);if(!nodo)return;
      let entrada=known.find(c=>c.child.id===id);
      if(!entrada){entrada={child:nodo,weight:gh_weightOf(nodo,overrides)};known.push(entrada);}
      entrada.value=valor;entrada.complete=true;cambiaGrupo=true;
      const fila=breakdown.find(b=>b.id===id);if(fila){fila.value=valor;fila.complete=true;}
      resueltas.add(id);
    };
    const aplicar=etapa=>{
      for(const regla of node.mejoras||[]){
        if((regla.etapa||'previa')!==etapa)continue;
        let fuentes=(regla.catIds||[]).map(id=>known.find(k=>k.child.id===id));
        const completas=fuentes.length&&fuentes.every(k=>k&&k.complete);
        const espera=etapa==='final'&&node.children.some(c=>gh_weightOf(c,overrides)>0&&!known.some(k=>k.child.id===c.id&&k.complete));
        if(!completas||espera){mejoras.push({id:regla.id,pendiente:true});continue;}
        const exenta=eximiciones.find(e=>e.examenId===node.eximicion?.examenId&&e.activa);
        if(regla.operacion==='distribuir'){
          // Con examen eximido, su nota se copia al terminar: las décimas se
          // asignan a notas reales, nunca dos veces al examen derivado.
          if(exenta)fuentes=fuentes.filter(k=>k.child.id!==exenta.examenId);
          const idsEx=node.eximicion?.catIds||[];
          const examen=known.find(k=>k.child.id===exenta?.examenId);
          const lideres=exenta?idsEx:[null];let mejor=null;
          // max(lineal + pesoExamen*max(notas)) = max de un problema lineal
          // por cada posible máxima. Cada uno se resuelve por peso marginal.
          for(const lider of lideres){
            const propuesta=new Map(known.map(k=>[k.child.id,k.value]));let disponible=regla.valor;
            const orden=fuentes.slice().sort((a,b)=>{
              const marginal=k=>k.weight+(k.child.id===lider?(examen?.weight||0):0);
              return marginal(b)-marginal(a)||a.value-b.value;
            });
            for(const fuente of orden){
              const suma=Math.min(disponible,Math.max(0,escalaMax-fuente.value));
              propuesta.set(fuente.child.id,fuente.value+suma);disponible-=suma;
            }
            if(exenta)propuesta.set(exenta.examenId,Math.max(...idsEx.map(id=>propuesta.get(id))));
            const total=known.reduce((a,k)=>a+k.weight*propuesta.get(k.child.id),0);
            if(!mejor||total>mejor.total+1e-10)mejor={total,propuesta};
          }
          for(const fuente of fuentes){
            const antes=fuente.value,valor=mejor?.propuesta.get(fuente.child.id)??antes;
            if(valor<=antes+1e-10)continue;
            cambiar(fuente.child.id,valor);
            mejoras.push({id:regla.id,destinoId:fuente.child.id,antes,valor,pendiente:false});
          }
          continue;
        }
        const minima=Math.min(...fuentes.map(k=>k.value));
        // Empates: la mejora va a la evaluación de mayor ponderación.
        const candidatas=fuentes.filter(k=>Math.abs(k.value-minima)<1e-10).sort((a,b)=>b.weight-a.weight);
        const elegida=candidatas[0];
        const valor=Math.min(escalaMax,regla.operacion==='promediar'? (elegida.value+regla.valor)/2:elegida.value+regla.valor);
        cambiar(elegida.child.id,valor);
        mejoras.push({id:regla.id,destinoId:elegida.child.id,antes:minima,valor,pendiente:false});
      }
    };
    aplicar('previa');
    const ex=node.eximicion;
    if(ex){
      const fuentes=(ex.catIds||[]).map(id=>known.find(k=>k.child.id===id));
      const examen=known.find(k=>k.child.id===ex.examenId);
      const completas=fuentes.length&&fuentes.every(k=>k&&k.complete);
      const total=fuentes.reduce((a,k)=>a+(k?k.weight:0),0);
      const promedio=!completas?null:ex.promedio==='simple'?fuentes.reduce((a,k)=>a+k.value,0)/fuentes.length:total>0?fuentes.reduce((a,k)=>a+k.value*k.weight,0)/total:null;
      const elegible=promedio!==null&&promedio+1e-10>=ex.min;
      const activa=!examen&&elegible&&ex.confirmada===true&&ex.asistencia!==false&&!ambiguo;
      const notaExamen=activa?Math.max(...fuentes.map(k=>k.value)):null;
      eximiciones.push({examenId:ex.examenId,promedio,elegible,activa,notaExamen,pendiente:!completas,
        puedeConfirmar:!examen&&elegible&&ex.confirmada!==true,
        razon:examen?'examen_rendido':!completas?'incompleto':!elegible?'promedio':ex.asistencia===false?'asistencia':activa?'cumple':'falta_confirmacion'});
      if(activa)cambiar(ex.examenId,notaExamen);
    }
    aplicar('final');
    const eximida=eximiciones.find(e=>e.examenId===ex?.examenId&&e.activa);
    if(eximida&&!ambiguo){
      const fuentes=known.filter(k=>ex.catIds.includes(k.child.id));
      eximida.notaExamen=Math.max(...fuentes.map(k=>k.value));
      cambiar(ex.examenId,eximida.notaExamen);
    }
    if(cambiaGrupo)allComplete=node.children.every(c=>known.some(k=>k.child.id===c.id&&k.complete));
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
  function cubierta(node,hereda=false){const si=hereda||resueltas.has(node.id);if(node.type==='leaf'){if(si)resueltas.add(node.id);}else node.children.forEach(c=>cubierta(c,si));}
  cubierta(structure);
  for(let i=emptyLeaves.length-1;i>=0;i--)if(resueltas.has(emptyLeaves[i].id))emptyLeaves.splice(i,1);
  if(formulas.some(f=>f.activa&&!f.ambigua)){
    for(let i=emptyLeaves.length-1;i>=0;i--)if(emptyLeaves[i].effectiveWeight===0)emptyLeaves.splice(i,1);
  }
  gh_leafGates(structure,grades,(gate)=>{gates.push(gate);if(!gate.ok&&rootValue!==null)rootValue=Math.min(rootValue,gate.fail_cap);});
  return {value:gh_roundFinal(rootValue,gh_meta(structure)),raw:rootValue,complete:emptyLeaves.length===0,breakdown,emptyLeaves,gates,drops,formulas,mejoras,eximiciones,weightOverrides:overrides};
}
