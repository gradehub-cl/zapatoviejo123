// Armador de horarios para la toma de ramos (solo UC: la oferta sale de
// BuscaCursos, #986). Función pura: recibe las secciones que devuelve
// catalogo_uc_secciones_publicas, las siglas elegidas y las preferencias, y
// propone combinaciones de secciones. No lee S, no toca el DOM ni la red, no
// guarda nada y no inventa horarios: un bloque sin día o módulo no cuenta como
// clase, solo se avisa.
//
// Cátedra, laboratorio, taller, práctica y terreno son FIJOS: dos fijos en el
// mismo módulo son tope y esa combinación no se propone. La ayudantía es
// FLEXIBLE por defecto (no siempre es obligatoria): si topa o cae en un día u
// hora que pediste evitar, se propone igual con un aviso y queda más abajo.
// Con `ayudantiaFlexible:false` la ayudantía se trata como un bloque fijo.
//
// Orden: menos días con clases fijas, menos días en total, menos ventanas
// (módulos vacíos entre la primera y la última clase fija del día), menos
// avisos, más profes preferidos y, al final, la sigla/NRC para que el
// resultado no dependa del orden de llegada.
//
// Cupos (idea de HorarioUC, que muestra los cupos por sección; solo la idea,
// ese repo no tiene licencia): dentro de un mismo horario va primero la
// sección con cupos libres. Si ninguna tiene, la combinación se propone igual
// con un aviso y queda más abajo: los cupos de BuscaCursos cambian y hay
// vacantes por escuela que no vemos.
const ARMADOR_TIPOS_FLEXIBLES=new Set(['AYU','AYUD']);
const ARMADOR_MAX_NODOS=200000;
const ARMADOR_MAX_RESULTADOS=5;

function armadorNombreNormal(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
// BuscaCursos escribe «Apellido Nombre»; quien busca escribe como quiera.
// Coincide si todas las palabras del preferido están en el nombre de la UC.
function armadorProfeCoincide(preferido,profesor){
  const p=armadorNombreNormal(preferido).split(' ').filter(Boolean);
  if(!p.length)return false;
  const palabras=new Set(armadorNombreNormal(profesor).split(' '));
  return p.every(x=>palabras.has(x));
}
function armadorModulosValidos(){
  return (typeof MODULOS_HORARIO_POR_TENANT!=='undefined'&&MODULOS_HORARIO_POR_TENANT.uc)||{};
}
function armadorDiasValidos(){
  return new Set((typeof DIAS_HORARIO!=='undefined'?DIAS_HORARIO:[]).map(([k])=>k));
}
// Lunes a domingo, no orden alfabético (J iría antes que L).
function armadorOrdenDia(d){
  const i=(typeof DIAS_HORARIO!=='undefined'?DIAS_HORARIO:[]).findIndex(([k])=>k===d);
  return i<0?99:i;
}
// Lleva una fila de la RPC a bloques {dia,modulo,tipo,fijo} y marca si la
// fuente traía bloques incompletos (sin día o sin módulo).
function armadorBloquesSeccion(fila,{ayudantiaFlexible=true}={}){
  const modulos=armadorModulosValidos(),dias=armadorDiasValidos();
  const bloques=[];let incompleto=false;
  for(const b of Array.isArray(fila&&fila.horario)?fila.horario:[]){
    const modulo=Number(b&&b.modulo);
    const ds=Array.isArray(b&&b.dias)?b.dias.filter(d=>dias.has(d)):[];
    if(!modulos[modulo]||!ds.length){incompleto=true;continue;}
    const tipo=String(b.tipo||'').toUpperCase();
    const fijo=!(ayudantiaFlexible&&ARMADOR_TIPOS_FLEXIBLES.has(tipo));
    for(const dia of ds)if(!bloques.some(x=>x.dia===dia&&x.modulo===modulo&&x.fijo===fijo))bloques.push({dia,modulo,tipo,fijo});
  }
  bloques.sort((a,b)=>armadorOrdenDia(a.dia)-armadorOrdenDia(b.dia)||a.modulo-b.modulo||Number(b.fijo)-Number(a.fijo)||a.tipo.localeCompare(b.tipo));
  return {bloques,incompleto};
}
// ¿Qué preferencia rompe este bloque? null si ninguna.
function armadorFueraDePreferencia(b,pref){
  if(pref.diasLibres.has(b.dia))return 'dia_libre';
  if(pref.moduloDesde&&b.modulo<pref.moduloDesde)return 'hora';
  if(pref.moduloHasta&&b.modulo>pref.moduloHasta)return 'hora';
  return null;
}
function armadorPreferencias(p){
  p=p||{};
  const entero=v=>Number.isInteger(Number(v))&&Number(v)>0?Number(v):null;
  const profes={};
  for(const [sigla,nombre] of Object.entries(p.profes||{}))if(typeof nombre==='string'&&nombre.trim())profes[String(sigla).toUpperCase()]=nombre;
  return {
    diasLibres:new Set(Array.isArray(p.diasLibres)?p.diasLibres:[]),
    moduloDesde:entero(p.moduloDesde),moduloHasta:entero(p.moduloHasta),profes,
    ayudantiaFlexible:p.ayudantiaFlexible!==false,
    maximo:Math.max(1,Math.min(20,entero(p.maximo)||ARMADOR_MAX_RESULTADOS)),
  };
}
// Secciones con exactamente el mismo horario dan la misma combinación: se
// juntan en un grupo y el estudiante elige el profe dentro de él.
function armadorGrupos(sigla,filas,pref){
  const porFirma=new Map(),descartes={dia_libre:0,hora:0};
  for(const fila of filas){
    const {bloques,incompleto}=armadorBloquesSeccion(fila,pref);
    const rotos=bloques.filter(b=>b.fijo).map(b=>armadorFueraDePreferencia(b,pref)).filter(Boolean);
    if(rotos.length){descartes[rotos[0]]++;continue;}
    const firma=bloques.map(b=>`${b.dia}${b.modulo}${b.fijo?'F':'f'}`).join(',')+(incompleto?'?':'');
    if(!porFirma.has(firma))porFirma.set(firma,{sigla,bloques,incompleto,secciones:[]});
    const preferido=!!pref.profes[sigla]&&(fila.profesores||[]).some(x=>armadorProfeCoincide(pref.profes[sigla],x));
    const libres=Number.isInteger(fila.vacantes_disponibles)&&fila.vacantes_disponibles>=0?fila.vacantes_disponibles:null;
    porFirma.get(firma).secciones.push({nrc:fila.nrc,seccion:fila.seccion,profesores:(fila.profesores||[]).slice(),preferido,cupos:libres});
  }
  const grupos=[...porFirma.values()].map(g=>{
    const sinCupos=s=>s.cupos===0;
    g.secciones.sort((a,b)=>Number(b.preferido)-Number(a.preferido)||Number(sinCupos(a))-Number(sinCupos(b))||a.seccion-b.seccion||a.nrc-b.nrc);
    g.preferido=g.secciones.some(s=>s.preferido);
    g.sinCupos=g.secciones.every(sinCupos);
    return g;
  });
  // Primero los grupos con el profe preferido: si se corta la búsqueda, se
  // cortan por la cola menos interesante.
  grupos.sort((a,b)=>Number(b.preferido)-Number(a.preferido)||a.secciones[0].seccion-b.secciones[0].seccion);
  return {grupos,descartes};
}
function armadorPuntaje(elegidos,pref){
  const fijosPorDia=new Map(),dias=new Set(),avisos=[];
  const ocupado=new Map();
  for(const g of elegidos){
    if(g.incompleto)avisos.push({tipo:'horario_incompleto',siglas:[g.sigla]});
    if(g.sinCupos)avisos.push({tipo:'sin_cupos',siglas:[g.sigla]});
    for(const b of g.bloques){
      dias.add(b.dia);
      if(b.fijo){if(!fijosPorDia.has(b.dia))fijosPorDia.set(b.dia,new Set());fijosPorDia.get(b.dia).add(b.modulo);}
      else{const fuera=armadorFueraDePreferencia(b,pref);if(fuera)avisos.push({tipo:fuera,siglas:[g.sigla],dia:b.dia,modulo:b.modulo});}
      const k=b.dia+b.modulo;
      if(ocupado.has(k)){
        const otro=ocupado.get(k);
        if(otro.sigla!==g.sigla)avisos.push({tipo:'tope',siglas:[otro.sigla,g.sigla],dia:b.dia,modulo:b.modulo});
      }else ocupado.set(k,{sigla:g.sigla});
    }
  }
  let ventanas=0;
  for(const mods of fijosPorDia.values()){
    const lista=[...mods].sort((a,b)=>a-b);
    ventanas+=lista[lista.length-1]-lista[0]+1-lista.length;
  }
  return {diasFijos:fijosPorDia.size,diasTotales:dias.size,ventanas,avisos,
    profesPreferidos:elegidos.filter(g=>g.preferido).length};
}
function armadorComparar(a,b){
  return a.diasFijos-b.diasFijos||a.diasTotales-b.diasTotales||a.ventanas-b.ventanas
    ||a.avisos.length-b.avisos.length||b.profesPreferidos-a.profesPreferidos||(a.clave<b.clave?-1:a.clave>b.clave?1:0);
}
// secciones: filas de catalogo_uc_secciones_publicas (cualquier sigla).
// siglas: ramos que se quieren tomar. preferencias: {diasLibres:['V'],
// moduloDesde:2, moduloHasta:8, profes:{MAT1610:'Pérez'}, maximo:5,
// ayudantiaFlexible:true}.
function armarHorarios(secciones,siglas,preferencias){
  const pref=armadorPreferencias(preferencias);
  const pedidas=[...new Set((Array.isArray(siglas)?siglas:[]).map(s=>String(s||'').trim().toUpperCase()).filter(Boolean))];
  const resultado={combinaciones:[],sinSecciones:[],sinOpciones:[],total:0,incompleto:false};
  if(!pedidas.length)return resultado;
  const porSigla=new Map(pedidas.map(s=>[s,[]]));
  const vistos=new Set();
  for(const f of Array.isArray(secciones)?secciones:[]){
    const s=String(f&&f.sigla||'').toUpperCase();
    if(!porSigla.has(s)||f.vigente===false||vistos.has(f.nrc))continue;
    vistos.add(f.nrc);porSigla.get(s).push(f);
  }
  const ramos=[];
  for(const s of pedidas){
    const filas=porSigla.get(s);
    if(!filas.length){resultado.sinSecciones.push(s);continue;}
    const {grupos,descartes}=armadorGrupos(s,filas,pref);
    if(!grupos.length){resultado.sinOpciones.push({sigla:s,motivo:descartes.dia_libre>=descartes.hora?'dia_libre':'hora'});continue;}
    ramos.push({sigla:s,nombre:filas[0].nombre||s,grupos});
  }
  if(resultado.sinSecciones.length||resultado.sinOpciones.length)return resultado;
  // Los ramos con menos opciones van primero: podan antes.
  ramos.sort((a,b)=>a.grupos.length-b.grupos.length||a.sigla.localeCompare(b.sigla));
  const fijos=new Map(),elegidos=[],encontradas=[];
  let nodos=0;
  const toma=g=>{for(const b of g.bloques)if(b.fijo)fijos.set(b.dia+b.modulo,g.sigla);};
  const suelta=g=>{for(const b of g.bloques)if(b.fijo)fijos.delete(b.dia+b.modulo);};
  const cabe=g=>g.bloques.every(b=>!b.fijo||!fijos.has(b.dia+b.modulo));
  (function recorrer(i){
    if(resultado.incompleto)return;
    if(i===ramos.length){
      const p=armadorPuntaje(elegidos,pref);
      p.clave=elegidos.map(g=>g.sigla+':'+g.secciones[0].nrc).sort().join('|');
      p.grupos=elegidos.slice();
      encontradas.push(p);
      // Conserva solo lo necesario para no crecer sin límite.
      if(encontradas.length>pref.maximo*40){encontradas.sort(armadorComparar);encontradas.length=pref.maximo;}
      return;
    }
    for(const g of ramos[i].grupos){
      if(++nodos>ARMADOR_MAX_NODOS){resultado.incompleto=true;return;}
      if(!cabe(g))continue;
      toma(g);elegidos.push(g);
      recorrer(i+1);
      elegidos.pop();suelta(g);
      if(resultado.incompleto)return;
    }
  })(0);
  resultado.total=encontradas.length;
  encontradas.sort(armadorComparar);
  const nombres=new Map(ramos.map(r=>[r.sigla,r.nombre]));
  resultado.combinaciones=encontradas.slice(0,pref.maximo).map(p=>({
    ramos:p.grupos.slice().sort((a,b)=>a.sigla.localeCompare(b.sigla)).map(g=>({
      sigla:g.sigla,nombre:nombres.get(g.sigla),preferido:g.preferido,
      secciones:g.secciones.map(s=>({...s,profesores:s.profesores.slice()})),
    })),
    bloques:p.grupos.flatMap(g=>g.bloques.map(b=>({...b,sigla:g.sigla})))
      .sort((a,b)=>armadorOrdenDia(a.dia)-armadorOrdenDia(b.dia)||a.modulo-b.modulo||a.sigla.localeCompare(b.sigla)),
    diasFijos:p.diasFijos,diasTotales:p.diasTotales,ventanas:p.ventanas,
    avisos:p.avisos,profesPreferidos:p.profesPreferidos,
  }));
  return resultado;
}
