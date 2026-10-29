function claveUc(nombre){
  return claveCatalogo(nombre,Object.keys(PRESETS_UC),'uc');
}
function presetUcDisponible(nombre,carrera){
  const clave=claveUc(nombre);if(!clave)return false;
  if(carrera==='ING-PC')return true;
  if(carrera!=='COM')return false;
  return PRESETS_UC_COM.some(n=>normName(n)===normName(clave));
}
function findPresetName(nombre,tenant,carrera){
  if(tenant!=='uc'){
    const presets=PRESETS_POR_TENANT[tenant]||{};
    return claveCatalogo(nombre,Object.keys(presets).filter(k=>pautaPresetSuficiente(evalsDePreset(presets[k]))),tenant);
  }
  if(tenant!=='uc'||!MALLA_UC[carrera])return null;
  return claveCatalogo(nombre,presetsUcConPauta(carrera),'uc');
}
// La estrella y el selector prometen ponderaciones precargadas. Un programa
// que solo trae reglas (como Cálculo II) no debe fingir que las tiene, así
// que esos quedan fuera de la búsqueda en vez de descartarse después.
//
// La lista depende solo de la carrera y de PRESETS_UC, que es un literal: se
// arma una vez. Antes se rearmaba en CADA llamada, y armarla compara cada
// preset con todos los demás; con ~10.000 cursos UC en el buscador eran
// decenas de millones de comparaciones al abrir "Agregar ramo".
const _presetsUcConPauta=new Map();
function presetsUcConPauta(carrera){
  const claves=Object.keys(PRESETS_UC),firma=carrera+'|'+claves.length;
  let lista=_presetsUcConPauta.get(firma);
  if(!lista){
    lista=claves.filter(k=>{
      const def=PRESETS_UC[k],evals=Array.isArray(def)?def:(def.evals||[]);
      return evals.length&&pautaPresetSuficiente(evals)&&presetUcDisponible(k,carrera);
    });
    _presetsUcConPauta.set(firma,lista);
  }
  return lista;
}
// Reglas oficiales informativas que todavía no podemos representar en el
// cálculo. Se recuperan por el origen del ramo para no inventarlas en manuales.
function reglasDelPreset(ramo,campo){
  const def=definicionPresetDelRamo(ramo);
  const lista=!Array.isArray(def)&&def&&def[campo];
  return Array.isArray(lista)?lista:[];
}
// Reglas que el motor todavía no sabe calcular: deuda nuestra, se van a ir.
// Una regla de décimas que no se pudo cargar en este ramo (la pauta se editó)
// sigue apareciendo acá, para que nadie la pierda de vista.
function reglasNoCalculadas(ramo){
  const cargadas=new Set((ramo&&Array.isArray(ramo.bonus)?ramo.bonus:[]).map(b=>b.id));
  const sinCargar=reglasDelPreset(ramo,'bonus').filter(b=>b&&!cargadas.has(b.id)&&b.ayuda).map(b=>b.ayuda);
  const pendientes=reglasDelPreset(ramo,'noCalcula').concat(sinCargar);
  const def=definicionPresetDelRamo(ramo);
  const calculadas=reglasCalculoVigentes(ramo);
  if(def?.eximicion?.requierePautaOriginal===true&&!estadoEximicion(ramo))
    pendientes.push('La eximición necesita la pauta del programa. Revisa tus evaluaciones y pesos antes de aplicarla');
  const formula=!Array.isArray(def)&&def&&(def.formulasCondicionales||[]).length;
  const limite=!Array.isArray(def)&&def&&def.limiteAusencias;
  const optativos=!Array.isArray(def)&&def&&(def.reemplazosOptativos||[]).length;
  if(formula&&!calculadas.some(g=>g.type==='conditional_weights'))pendientes.push('La exclusión condicional del programa requiere actualizar a su pauta. Si personalizaste las evaluaciones, tu pauta se conserva y esta regla no se aplica');
  if(limite&&!calculadas.some(g=>g.type==='absence_limit'))pendientes.push('El traspaso por pruebas justificadas y su máximo requieren actualizar a la pauta del programa');
  if(optativos&&!(ramo.reemplazosOptativos||[]).length)pendientes.push('El reemplazo optativo del programa requiere actualizar a su pauta. Si la personalizaste, tu versión se conserva');
  const ausencias=estadoAusenciasJustificadas(ramo);
  if(ausencias&&ausencias.bloqueadas&&ausencias.bloqueadas.length)pendientes.push(`Las pruebas justificadas superan el máximo de ${ausencias.normaAplicada.topePesoDestino}% del examen. El promedio y la nota necesaria quedan pendientes de resolver el derecho a examen o la recuperativa con el curso`);
  return pendientes;
}
function notaNecesariaCondicional(ramo){return reglasCalculoVigentes(ramo).some(g=>g.type==='conditional_weights');}
function motivoCalculoPendiente(ramo){
  const base=calculoRamoConCompuertas(ramo);
  if(base.ausencias?.bloqueadas?.length)return 'El examen supera su ponderación máxima. Confirma con el curso el derecho a examen o la recuperativa antes de calcular la final';
  if(base.res.formulas?.some(f=>f.ambigua))return 'El programa se contradice en el límite 3,8. Confirma con el profesor cómo ponderar las tareas';
  return null;
}
function reglasCalculadas(ramo){
  const calculo=calculoRamoConCompuertas(ramo);
  const formulas=calculo.res.formulas||[];
  const notas=formulas.map(f=>`${f.nombre}: ${f.ambigua?'el programa contradice el límite; confirma con el profesor':f.pendiente?'se resolverá al completar las evaluaciones que deciden la condición':f.activa?'se aplica al promedio':'no se activa con tus notas'}`);
  if((ramo.reemplazosOptativos||[]).length){
    const aplicados=calculo.reemplazosOptativosAplicados||[];
    if(!aplicados.length)notas.push('Reemplazo optativo: todavía no mejora la nota o falta cumplir sus condiciones');
    aplicados.forEach(a=>{
      const origen=ramo.categorias.find(c=>c.id===a.fuenteId);
      const destino=ramo.categorias.find(c=>hojasCategoria(c).some(h=>h.id===a.destinoId));
      notas.push(`Reemplazo optativo: ${origen?.nombre||'la nota nueva'} mejora ${destino?.nombre||'una evaluación'} sin cambiar la nota que ingresaste`);
    });
  }
  const limite=reglasCalculoVigentes(ramo).find(g=>g.type==='absence_limit');
  if(limite)notas.push(`${limite.nombre}. Solo se mueve el peso de una prueba que declares justificada; el máximo del examen es ${limite.max}%`);
  return notas;
}
// Reglas del curso que el promedio NUNCA va a incluir. Decirle al estudiante
// "todavía no las calculamos" sería prometerle algo que no va a pasar: dependen
// de un dato que el programa no da, de algo que decide el profesor caso a caso,
// o son una aproximación deliberada del motor. No son una falta de la app.
function reglasDelCurso(ramo){return reglasDelPreset(ramo,'reglasDelCurso');}
function estadoPauta(categorias){
  const total=(categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
  const diferencia=Math.round((100-total)*10)/10;
  return {total,diferencia,lista:Math.abs(diferencia)<0.05};
}
// Si una pauta completa pierde una evaluación, las que quedan conservan su
// proporción y vuelven a representar el 100% del ramo. Se guarda la fracción
// completa (por ejemplo 100/3), aunque el editor muestre solo dos decimales:
// redondear cada fila por separado dejaría una pauta de 99,99%.
//
// Una pauta que ya estaba incompleta no se toca. Completarla automáticamente
// inventaría porcentajes que el estudiante todavía no ha sacado del programa.
function repartirPesoRestante(categorias,totalAntes){
  if(Math.abs((Number(totalAntes)||0)-100)>=0.05)return false;
  const totalRestante=(categorias||[]).reduce((s,c)=>s+(Number(c.peso)||0),0);
  if(totalRestante<=0)return false;
  const factor=100/totalRestante;
  categorias.forEach(c=>{c.peso=(Number(c.peso)||0)*factor;});
  return true;
}

// Un ramo del catálogo sin preset no es un ramo "vacío" del estudiante: la
// app sí sabe qué curso es, pero todavía no tiene su programa transcrito. Esta
// distinción decide qué ayuda ofrecer sin inventar ponderaciones.
function pautaCatalogoSinOficial(r){
  return !!(r&&r.origen&&r.origen.tenant&&!presetRamo(r.nombre,r.origen.tenant,r.origen.carrera));
}
