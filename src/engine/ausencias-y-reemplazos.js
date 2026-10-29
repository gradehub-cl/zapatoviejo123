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
