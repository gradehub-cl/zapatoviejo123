
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
    const hojas=reales.map(n=>({id:n.id,name:n.nombre,weight:(n.peso||1)*(Number.isInteger(n.slot)&&porSlot.get(n.slot)===n?pesoCasilla(c,n.slot):1),type:'leaf',slot:n.slot,...(!porSlot.has(n.slot)?{unassigned:true}:{})}));
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
  function reglaDeEximicion(r){
    const def=definicionPresetDelRamo(r),regla=def?.eximicion;
    if(!regla)return null;
    if(regla.requierePautaOriginal===true){
      const evals=def.evals||regla.pauta||[],cats=r.categorias||[];
      if(!Array.isArray(evals)||evals.length!==cats.length||evals.some(([nombre,peso,extra])=>{
        const c=cats.find(c=>normName(c.nombre)===normName(nombre));
        return !c||Math.abs(c.peso-peso)>0.001||(c.slots||1)!==(extra?.slots||1)||(c.dropLowest?.count||0)!==(extra?.dropLowest?.count||0);
      }))return null;
    }
    return regla;
  }
  function reglasBonusVigentes(r){
    const cats=r.categorias||[];
    return (Array.isArray(r.bonus)?r.bonus:[]).filter(b=>b&&(b.destino!=='grupo'||
      Array.isArray(b.catIds)&&b.catIds.length&&b.catIds.every(id=>cats.some(c=>c.id===id))
      &&(!b.pauta||Array.isArray(b.pauta)&&b.pauta.length===cats.length&&b.pauta.every(e=>{
      const c=cats.find(c=>c.id===e.catId);
      return c&&normName(c.nombre)===normName(e.nombre)&&c.peso===e.peso&&(c.slots||1)===e.slots
        &&JSON.stringify(c.dropLowest||null)===JSON.stringify(e.dropLowest||null);
    }))));
  }
  function ramoToStructure(r){
    const bonus=gh_bonusActivos(reglasBonusVigentes(r),r.bonusIngresado,r.bonusConfirmado);
    const conBonus=(nodo,lista)=>lista&&lista.length?{...nodo,bonus:lista}:nodo;
    const ex=reglaDeEximicion(r);
    const idDe=n=>(r.categorias||[]).find(c=>normName(c.nombre)===normName(n))?.id;
    const eximicion=ex?.notaExamen==='maxima'&&ex.segun?.every(n=>idDe(n))&&idDe(ex.evaluacion)
      ?{catIds:ex.segun.map(idDe),examenId:idDe(ex.evaluacion),min:ex.min,promedio:ex.promedio,confirmada:ex.requiereConfirmacion!==true||r.eximicionConfirmada===true,
        asistencia:!Number.isInteger(ex.maxInasistencias)||r.faltas?.activo===true&&Number.isInteger(r.faltas.cantidad)&&r.faltas.cantidad<=ex.maxInasistencias}:null;
    return conBonus({__meta:reglasNota(),mejoras:bonus.mejoras,eximicion,
      id:'final',name:r.nombre||'Ramo',type:'group',aggregation_rule:'weighted_average',
      formulas_condicionales:reglasCalculoVigentes(r).filter(g=>g.type==='conditional_weights'),
      children:categoriasVigentes(r).filter(c=>c.peso>0||(c.optativa===true&&(c.notas||[]).some(n=>Number.isFinite(n.valor)))).map(c=>conBonus({id:c.id,name:c.nombre,weight:c.peso,type:'group',aggregation_rule:'weighted_average',
        drop_lowest:gh_descarteManual(r,typeof deps.tenant==='function'?deps.tenant():null)?null:c.dropLowest||null,
        partial_weight:Number.isInteger(c.slots)&&c.slots>1,children:hojasCategoria(c)},bonus.porCategoria[c.id]))},bonus.final);
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
  function promedioCompletoParaEximicion(cat,ignoraDescartes){
    const promedio=promedioCompletoSinDescarte(cat);
    if(promedio===null||ignoraDescartes)return promedio;
    const descarte=cat.dropLowest;
    const cantidad=Number.isInteger(descarte?.count)?descarte.count:0;
    if(cantidad<=0)return promedio;
    const notas=notasVigentesSinDescarte(cat).map(n=>n.valor).sort((a,b)=>a-b).slice(cantidad);
    return notas.length?notas.reduce((s,n)=>s+n,0)/notas.length:null;
  }
  function estadoEximicion(ramo){
    const def=definicionPresetDelRamo(ramo);
    const regla=reglaDeEximicion(ramo);
    if(!regla||!Array.isArray(regla.segun)||typeof regla.ignoraDescartes!=='boolean')return null;
    const categorias=ramo.categorias||[];
    if(regla.requierePautaOriginal===true){
      const evals=def.evals||regla.pauta||[];
      if(categorias.length!==evals.length||evals.some(([nombre,peso,extra])=>{
        const cat=categorias.find(c=>normName(c.nombre)===normName(nombre));
        const slots=extra?.slots||1,descartes=extra?.dropLowest?.count||0;
        return !cat||Math.abs((Number(cat.peso)||0)-peso)>0.001
          ||(cat.slots||1)!==slots||(cat.dropLowest?.count||0)!==descartes;
      }))return null;
    }
    const nombresExamen=Array.isArray(regla.evaluaciones)?regla.evaluaciones:[regla.evaluacion];
    if(!nombresExamen.length||nombresExamen.some(n=>typeof n!=='string'))return null;
    const examenes=nombresExamen.map(nombre=>categorias.find(c=>normName(c.nombre)===normName(nombre)));
    if(examenes.some(c=>!c)||new Set(examenes.map(c=>c.id)).size!==examenes.length)return null;
    const confirmada=ramo.eximicionConfirmada===true;
    const base={activa:false,pendiente:false,examenId:examenes[0].id,examenIds:examenes.map(c=>c.id),regla,confirmada};
    if(regla.notaExamen==='maxima'){
      const res=calculateFinalGrade(ramoToStructure(ramo),gradesOf(ramo));
      const estado=res.eximiciones.find(e=>e.examenId===examenes[0].id);
      return estado?{...base,...estado}:null;
    }
    if(examenes.some(c=>avgPond(c.notas)!==null))return {...base,razon:'examen_rendido'};
    if(regla.sinAusenciasJustificadas===true&&(ramo.ausenciasJustificadas||[]).length)
      return {...base,razon:'ausencia_justificada'};
    const fuentes=regla.segun.map(nombre=>categorias.find(c=>normName(c.nombre)===normName(nombre))).filter(Boolean);
    if(fuentes.length!==regla.segun.length)return null;
    const promedios=fuentes.map(c=>promedioCompletoParaEximicion(c,regla.ignoraDescartes));
    if(promedios.some(p=>p===null))return {...base,pendiente:true,razon:'incompleto'};
    const pesoTotal=fuentes.reduce((s,c)=>s+(Number(c.peso)||0),0);
    const promedio=pesoTotal>0?fuentes.reduce((s,c,i)=>s+promedios[i]*(Number(c.peso)||0),0)/pesoTotal:null;
    const cumple=valor=>regla.comparaNotaOficial===true
      ? gh_notaOficial(valor,reglasNota())>=regla.min
      : valor>=regla.min;
    const minimoFallido=(Array.isArray(regla.minimos)?regla.minimos:[]).find(condicion=>{
      const nombres=Array.isArray(condicion.evaluaciones)?condicion.evaluaciones:[condicion.evaluacion];
      const cats=nombres.map(nombre=>categorias.find(c=>normName(c.nombre)===normName(nombre)));
      if(!nombres.length||cats.some(c=>!c)||!Number.isFinite(condicion.min))return true;
      if(condicion.cadaNota===true){
        const notas=cats.flatMap(notasVigentesSinDescarte);
        return !notas.length||notas.some(n=>regla.comparaNotaOficial===true
          ?gh_notaOficial(n.valor,reglasNota())<condicion.min:n.valor<condicion.min);
      }
      const valores=cats.map(c=>promedioCompletoParaEximicion(c,regla.ignoraDescartes));
      const peso=cats.reduce((s,c)=>s+(Number(c.peso)||0),0);
      const valor=valores.some(v=>v===null)||peso<=0?null
        :cats.reduce((s,c,i)=>s+valores[i]*(Number(c.peso)||0),0)/peso;
      return valor===null||(regla.comparaNotaOficial===true
        ?gh_notaOficial(valor,reglasNota())<condicion.min:valor<condicion.min);
    });
    if(minimoFallido)return {...base,promedio,razon:'minimo_categoria',minimoFallido};
    const elegible=promedio!==null&&cumple(promedio);
    const requiereConfirmacion=regla.requiereConfirmacion===true;
    const activa=elegible&&(!requiereConfirmacion||confirmada);
    return {...base,activa,elegible,promedio,
      puedeConfirmar:elegible&&requiereConfirmacion&&!confirmada,
      razon:!elegible?'promedio':activa?'cumple':'falta_confirmacion'};
  }
  function categoriaEximida(ramo,cat){const estado=estadoEximicion(ramo);return !!(estado&&estado.activa&&estado.examenIds.includes(cat.id));}
  function categoriasVigentes(ramo){
    const regla=reglaDeEximicion(ramo);
    // Un examen reemplazado mantiene su 30%: solo deja de estar pendiente.
    if(regla?.notaExamen==='maxima')return (ramo.categorias||[]).filter(c=>!c.fueraDePauta);
    return (ramo&&ramo.categorias||[]).filter(c=>!categoriaEximida(ramo,c));
  }
  function estadoSegundaFecha(ramo){
    const def=definicionPresetDelRamo(ramo);
    const regla=!Array.isArray(def)&&def&&def.segundaFecha;
    if(!regla)return null;
    const examen=(ramo.categorias||[]).find(c=>normName(c.nombre)===normName(regla.evaluacion));
    const notaExamen=examen?avgPond(examen.notas):null;
    if(notaExamen===null)return {aviso:false,regla};
    if(regla.requiereTodas===true&&!ramoCompletamenteEvaluado(ramo))return {aviso:false,regla};
    const final=gh_notaOficial(ramoAvg(ramo),reglasNota());
    if(final===null)return {aviso:false,regla};
    const promedioPonderado=Number.isFinite(regla.promedioPonderadoMin)
      ?calculoRamoConCompuertas(ramo).res.raw:null;
    const aviso=(!Number.isFinite(regla.finalMin)||final>=regla.finalMin)
      &&(!Number.isFinite(regla.finalMax)||final<=regla.finalMax)
      &&(!Number.isFinite(regla.examenMenorQue)||gh_notaOficial(notaExamen,reglasNota())<regla.examenMenorQue)
      &&(!Number.isFinite(regla.promedioPonderadoMin)
        ||(promedioPonderado!==null&&promedioPonderado+1e-9>=regla.promedioPonderadoMin));
    return {aviso,final,regla};
  }
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
  // Regla del reglamento sin escribir compuertas en los datos del estudiante.
  // La pauta explícita sigue mandando; no adivinamos entre dos exámenes.
  function compuertasEfectivas(r){
    const guardadas=Array.isArray(r.gates)?r.gates:[];
    if(guardadas.some(g=>g?.origen!=='editor'))return guardadas;
    const norma=gh_reglasNota(r.origen?.tenant||(typeof deps.tenant==='function'?deps.tenant():null)).examenFinal;
    if(!norma)return guardadas;
    const finales=categoriasVigentes(r).filter(c=>c.peso>0&&norma.nombres.includes(normName(c.nombre)));
    if(finales.length!==1)return guardadas;
    const examen=finales[0];
    if(guardadas.some(g=>g.catId===examen.id||g.catIds?.includes(examen.id)))return guardadas;
    // Primero rige el reglamento. Las reglas personales solo pueden bajar
    // ese resultado, incluso cuando también fallan sus mínimos.
    return [{type:'group_min',catIds:[examen.id],nombre:examen.nombre,min:norma.min,cap:'self',efecto:'reemplazar'},...guardadas];
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
      // El núcleo pondera las casillas conocidas por su fracción rendida.
      // No se recalcula una segunda media que pierda descartes o beneficios.
      if(v!==null){
        for(const g of compuertasEfectivas(r)){
          if(g.type==='min_grade_required'){
            const valor=valorParaCompuerta(r,res,g.catId);
            if(valor!==null && !gh_cumpleCompuerta(valor,g)){
              const siguiente=Math.min(v,g.cap);if(siguiente<v)limitadoPorCompuerta=true;v=siguiente;
            }
          } else if(g.type==='group_min'){
            const ga=avgDeGrupoCalculado(res,arbol,g.catIds);
            if(ga!==null && !gh_cumpleCompuerta(ga,g)){
              const tope=(g.cap==='self')?ga:g.cap;
              const siguiente=g.efecto==='reemplazar'?tope:Math.min(v,tope);if(siguiente!==v)limitadoPorCompuerta=true;v=siguiente;
            }
          }
        }
      }
      return {res,valor:v,limitadoPorCompuerta,estructura:arbol,notas:notasEvaluadas,ausencias};
    }
    const elegidas=gh_reemplazosOptativos(estructura,notas,r.reemplazosOptativos,calcular,gradesOf(r));
    return {...calcular(elegidas.notas),reemplazosOptativosAplicados:elegidas.aplicados};
  }
  function coberturaAvance(base){
    // Una simulación antigua sin casilla reconocible conserva su promedio,
    // pero no permite afirmar qué casilla se rindió. No se reasigna ni borra.
    if(!base.estructura.children.some(c=>c.partial_weight&&c.children.some(h=>h.unassigned)))return base.res.coverage;
    const arbol=gh_clonarArbol(base.estructura);
    arbol.children.forEach(c=>{if(c.partial_weight)c.children=c.children.filter(h=>!h.unassigned);});
    return calculateFinalGrade(arbol,base.notas).coverage;
  }
  function avanceRamo(r,calculo){
    const declarado=(r.categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
    if(declarado<=0)return {pct:0,pending:0,total:0};
    const base=calculo||calculoRamoConCompuertas(r);
    const vigente=categoriasVigentes(r).reduce((s,c)=>s+(Number(c.peso)||0),0);
    const total=Math.max(100,declarado);
    let cobertura=coberturaAvance(base);
    const otro=ramoVinculado(r);
    if(otro){
      const pesos=pesosRendidosVinculo(r,base,calculoRamoConCompuertas(otro),true);
      if(pesos)cobertura=pesos.propio+pesos.externo;
    }
    const done=declarado-vigente+vigente*cobertura;
    return {pct:Math.round(done/total*100),pending:total-done,total};
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
      if(c.optativa===true&&c.peso===0||categoriaEximida(r,c))return true;
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
  function referenciaRamoVinculado(r){
    if(!r?.aporta?.ramo)return null;
    const link=r.aporta,preset=typeof definicionPresetDelRamo==='function'?definicionPresetDelRamo(r):null;
    const sigla=link.sigla||(preset?.aporta&&normName(preset.aporta.ramo)===normName(link.ramo)?preset.aporta.sigla:null);
    return {...link,...(sigla?{sigla:String(sigla).trim().toUpperCase()}:{})};
  }
  function ramoVinculado(r,ramosContexto){
    const link=referenciaRamoVinculado(r);if(!link)return null;
    const lista=(ramosContexto||S.ramos||[]).filter(x=>x!==r);
    const codigo=x=>{const v=String(x.sigla||x.origen?.ramoKey||'').trim().toUpperCase();return /^[A-Z]{2,6}[0-9]{3,5}[A-Z]?$/.test(v)?v:'';};
    const porSigla=link.sigla&&lista.find(x=>codigo(x)===link.sigla);
    if(porSigla)return porSigla;
    // Compatibilidad con ramos antiguos sin sigla; un código contradictorio
    // no se ignora solo porque el nombre coincide.
    return lista.find(x=>(!link.sigla||!codigo(x))&&normName(x.nombre)===normName(link.ramo))||null;
  }
  function pesosRendidosVinculo(r,base,ajena,paraAvance=false){
    const parcial=b=>b.estructura.children.some(c=>c.partial_weight&&b.res.breakdown.some(f=>f.id===c.id&&!f.complete));
    if(!parcial(base)&&!parcial(ajena))return null;
    const p=(r.aporta.peso||0)/100;
    const cobertura=paraAvance?coberturaAvance:b=>b.res.coverage;
    return {propio:(1-p)*cobertura(base),externo:p*cobertura(ajena)};
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
    const pesos=pesosRendidosVinculo(r,calculoRamoConCompuertas(r),calculoRamoConCompuertas(otro));
    if(pesos&&pesos.propio+pesos.externo>0)v=(propio*pesos.propio+externo*pesos.externo)/(pesos.propio+pesos.externo);
    if(typeof link.min==='number'&&(!gh_cumpleMinimo(propio,link.min)||!gh_cumpleMinimo(externo,link.min)))v=Math.min(propio,externo);
    return v;
  }
  function gatesActivas(r){
    const calculo=calculoRamoConCompuertas(r);
    const valores=new Map((calculo.res.breakdown||[]).map(n=>[n.id,n.value]));
    const out=[];
    compuertasEfectivas(r).forEach(g=>{
      if(g.type==='min_grade_required'){
        const c=(r.categorias||[]).find(x=>x.id===g.catId);
        if(!c)return;
        const a=Array.isArray(c.pesosCasillas)?valorParaCompuerta(r,calculo.res,c.id):valores.get(c.id);
        if(a!==null&&!gh_cumpleCompuerta(a,g))out.push({nombre:g.nombre||c.nombre,actual:a,min:g.min,cap:g.cap});
      } else if(g.type==='group_min'){
        const ga=avgDeGrupoCalculado(calculo.res,calculo.estructura,g.catIds);
        if(ga!==null&&!gh_cumpleCompuerta(ga,g)){
          out.push({nombre:g.nombre||'Requisito',actual:ga,min:g.min,cap:(g.cap==='self')?ga:g.cap,grupo:true,...(g.efecto?{efecto:g.efecto}:{})});
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
    const compuertas=compuertasEfectivas(ramo).filter(g=>g&&(g.type==='min_grade_required'||g.type==='group_min'));
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
  function notaNecesariaEximicion(ramo){
    const estado=estadoEximicion(ramo);
    if(!estado||estado.regla.notaExamen!=='maxima'||!estado.pendiente||estado.razon==='examen_rendido'
      ||Number.isInteger(estado.regla.maxInasistencias)&&ramo.faltas?.cantidad>estado.regla.maxInasistencias)return null;
    const fuentes=ramo.categorias.filter(c=>estado.regla.segun.some(n=>normName(n)===normName(c.nombre)));
    const pendientes=fuentes.filter(c=>promedioCompletoSinDescarte(c)===null);
    if(!pendientes.length)return null;
    const alcanza=valor=>{
      const copia={...ramo,categorias:ramo.categorias.map(c=>pendientes.includes(c)?{...c,notas:[{id:'__gh_eximir_'+c.id,valor,peso:1}]}:c)};
      return estadoEximicion(copia)?.elegible===true;
    };
    if(!alcanza(7))return 8;
    if(alcanza(1))return 1;
    let bajo=1,alto=7;for(let i=0;i<48;i++){const medio=(bajo+alto)/2;if(alcanza(medio))alto=medio;else bajo=medio;}
    return alto;
  }
  // `soloPropio` pregunta por la parte propia sin el ramo que le aporta: cuánto
  // necesita la cátedra para llegar sola a la meta.
  function notaNecesaria(ramo,meta,opciones){
    const objetivo=Number.isFinite(meta)?meta:4.0;
    if(definicionPresetDelRamo(ramo)?.eximicion?.notaExamen==='maxima'&&ramoCompletamenteEvaluado(ramo))return null;
    const baseInicial=calculoRamoConCompuertas(ramo);
    if(baseInicial.ausencias&&baseInicial.ausencias.bloqueadas&&baseInicial.ausencias.bloqueadas.length)return null;
    // El solver de estructura no conoce los reemplazos voluntarios: proyecta
    // la misma nota en lo pendiente y vuelve a pasar por el cálculo del ramo.
    if(((definicionPresetDelRamo(ramo)?.eximicion?.notaExamen==='maxima')||gh_bonusActivos(reglasBonusVigentes(ramo),ramo.bonusIngresado,ramo.bonusConfirmado).mejoras.length||(Array.isArray(ramo.reemplazosOptativos)&&ramo.reemplazosOptativos.length)||compuertasEfectivas(ramo).some(g=>g.efecto==='reemplazar'))&&
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
        const normal=calculoRamoConCompuertas(copia).valor;
        const ex=estadoEximicion(ramo);
        if(ex?.regla.notaExamen==='maxima'&&ex.razon!=='examen_rendido'){
          const sinExamen={...copia,categorias:copia.categorias.map(c=>ex.examenIds.includes(c.id)?ramo.categorias.find(x=>x.id===c.id):c)};
          if(estadoEximicion(sinExamen)?.activa){const exento=calculoRamoConCompuertas(sinExamen).valor;return normal===null?exento:Math.max(normal,exento);}
        }
        return normal;
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
  return {notaFinalOficial:valor=>gh_notaOficial(valor,reglasNota()),reglasCalculoVigentes,reglasBonusVigentes,reglasAusenciaOficiales,hojasCategoria,ramoToStructure,gradesOf,avgPond,promedioCompletoSinDescarte,notaNecesariaEximicion,estadoEximicion,categoriaEximida,categoriasVigentes,estadoSegundaFecha,estadoAusenciasJustificadas,avgDeGrupo,avgDeGrupoCalculado,calculoRamoConCompuertas,ramoCompletamenteEvaluado,estadoRecuperativo,resumenCategoriasCalculadas,avanceRamo,ramoAvg,referenciaRamoVinculado,ramoVinculado,combinarConRamoVinculado,partesDelVinculo,gatesActivas,estadoParaNotaNecesaria,notaNecesaria};
}

if(typeof module!=='undefined'&&module.exports)module.exports={gh_crearCalculoRamo,gh_reglasNota,gh_notaOficial,gh_cumpleCompuerta,gh_bonusActivos,gh_notaDesdePuntaje,gh_tablaPuntaje};
