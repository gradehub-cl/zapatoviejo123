// ─── DISTRIBUCIONES SUGERIDAS DE UN RAMO ─────────────────────────────────────
// La RPC `pautas_sugeridas` devuelve reportes por estructura, sección y profe.
// Acá se juntan en "distribuciones": pautas que calculan igual aunque cada uno
// haya escrito los nombres a su manera. Pasó de verdad (2026-11-09): en
// Filosofía: ¿Para Qué? ocho de nueve reportes tenían 30/30/20/20, pero uno
// escribió «Ejercicio de análisis», otro «Análisis en parejas» y otro
// «Parejas», y como la huella incluye el nombre, nunca hubo consenso.
//
// Dos reportes son la misma distribución si:
//   · tienen los mismos pesos (y los mismos mínimos), después de juntar las
//     numeradas como hace la huella («Control 1..7» de 1% = Controles 7%); las
//     casillas no cuentan, porque «Controles R 15%» con o sin «×3» es la misma
//     ponderación y la cantidad la corrige cada uno;
//   · y al menos la mitad de sus evaluaciones se parecen por nombre. Sin esto,
//     «Prueba 1 50% / Prueba 2 50%» y «Trabajo 50% / Examen 50%» serían una.
// De cada distribución se muestra el nombre que predomina en cada evaluación
// (el más repetido, con la ortografía más usada) y la cantidad de casillas que
// más se repite.

// Evaluaciones canónicas de una estructura, conservando cómo se escribieron.
function itemsDistribucion(est){
  const filas=(est||[]).filter(e=>Number(e.peso)>0&&typeof e.nombre==='string'&&e.nombre.trim()).map(e=>({
    clave:nombreHuella(e.nombre),nombre:e.nombre.replace(/\s+/g,' ').trim(),peso:Number(e.peso),
    slots:Number(e.slots)||1,min:Number(e.min)||0,cap:Number(e.cap)||0,
  }));
  return agruparNumeradasHuella(filas).map(f=>{
    if(f.nombre)return f;
    // Serie numerada: «Interrogación 1, 2 y 3» se muestra como «Interrogación».
    const ejemplo=filas.find(x=>x.clave.startsWith(f.clave+' '));
    return {...f,nombre:(ejemplo?ejemplo.nombre.replace(/\s*\d+\s*$/,''):f.clave)||f.clave};
  });
}
const pesoDistribucion=i=>[r2(i.peso),i.min,i.cap].join('~');
function esqueletoDistribucion(items){return items.map(pesoDistribucion).sort().join('|');}
// Palabras que identifican una evaluación: las de cuatro letras o más, ya en
// singular y sin conectores (nombreHuella). Los números no cuentan: «Control 1»
// y «Prueba 1» no se parecen.
function palabrasDistribucion(i){return new Set(i.clave.split(' ').filter(w=>/^[a-z]{4,}$/.test(w)));}
function parecidoDistribucion(a,b){
  if(a.clave===b.clave)return 3;
  const pa=palabrasDistribucion(a),pb=palabrasDistribucion(b);
  let n=0;pa.forEach(w=>{if(pb.has(w))n++;});
  return n?Math.min(2,n):0;
}
// Ordena los ítems de `otro` en las posiciones de `base` (mismo esqueleto).
// Primero se emparejan los más parecidos de todo el grupo de igual peso, y
// recién después lo que quede: emparejar posición por posición le daba a una
// «Charlas» la primera evaluación libre aunque otra posición la necesitara.
function alinearDistribucion(base,otro){
  const asignado=base.map(()=>-1),usados=new Set(),pares=[];
  base.forEach((b,i)=>otro.forEach((o,k)=>{
    if(pesoDistribucion(o)===pesoDistribucion(b))pares.push([parecidoDistribucion(b,o),i,k]);
  }));
  pares.sort((x,y)=>y[0]-x[0]||x[1]-y[1]||x[2]-y[2]);
  let coinciden=0;
  for(const [puntaje,i,k] of pares){
    if(puntaje<=0)break;
    if(asignado[i]>=0||usados.has(k))continue;
    asignado[i]=k;usados.add(k);coinciden++;
  }
  base.forEach((b,i)=>{
    if(asignado[i]>=0)return;
    const k=otro.findIndex((o,kk)=>!usados.has(kk)&&pesoDistribucion(o)===pesoDistribucion(b));
    asignado[i]=k;usados.add(k);
  });
  return {alineados:asignado.map(k=>otro[k]),coinciden};
}
function masVotado(votos,desempate){
  return [...votos.entries()].sort((a,b)=>b[1]-a[1]||desempate(b[0])-desempate(a[0])||(a[0]<b[0]?-1:a[0]>b[0]?1:0))[0][0];
}
// «Análisis» antes que «analisis» cuando empatan: mayúscula inicial y tildes.
const cuidadoNombre=s=>(/^[A-ZÁÉÍÓÚÑ¿¡]/.test(s)?2:0)+(/[áéíóúñü]/i.test(s)?1:0);

// filas: [{estructura,respaldos,seccion,profe,profesor,mio}] → distribuciones
// ordenadas por respaldo: [{estructura,huella,respaldos,secciones,profes,
// profesores,mios,mismaSeccion}].
function agruparDistribuciones(filas,seccionPropia){
  const grupos=[];
  [...(filas||[])].filter(f=>f&&Number.isSafeInteger(f.respaldos)&&f.respaldos>0&&Array.isArray(f.estructura))
    .sort((a,b)=>b.respaldos-a.respaldos)
    .forEach(f=>{
      const items=itemsDistribucion(f.estructura);if(!items[1])return; // al menos dos evaluaciones
      const esqueleto=esqueletoDistribucion(items);
      let destino=null,alineados=null;
      for(const g of grupos){
        if(g.esqueleto!==esqueleto)continue;
        const al=alinearDistribucion(g.base,items);
        if(al.coinciden*2>=items.length){destino=g;alineados=al.alineados;break;}
      }
      if(!destino){destino={esqueleto,base:items,miembros:[]};grupos.push(destino);alineados=items;}
      destino.miembros.push({items:alineados,fila:f});
    });
  return grupos.map(g=>{
    const estructura=g.base.map((b,pos)=>{
      const claves=new Map(),slots=new Map();
      g.miembros.forEach(({items,fila})=>{
        const i=items[pos];
        claves.set(i.clave,(claves.get(i.clave)||0)+fila.respaldos);
        slots.set(i.slots,(slots.get(i.slots)||0)+fila.respaldos);
      });
      const clave=masVotado(claves,c=>palabrasDistribucion({clave:c}).size);
      const escrituras=new Map();
      g.miembros.forEach(({items,fila})=>{
        const i=items[pos];if(i.clave===clave)escrituras.set(i.nombre,(escrituras.get(i.nombre)||0)+fila.respaldos);
      });
      const casillas=masVotado(slots,n=>n);
      // Con mayúscula inicial: muchos lo escriben todo en minúscula.
      const nombre=masVotado(escrituras,cuidadoNombre);
      return {nombre:nombre.charAt(0).toLocaleUpperCase('es')+nombre.slice(1),peso:b.peso,
        ...(casillas>1?{slots:casillas}:{}),...(b.min?{min:b.min}:{}),...(b.cap?{cap:b.cap}:{})};
    });
    const filas=g.miembros.map(m=>m.fila),suma=fn=>filas.reduce((s,f)=>s+(fn(f)?f.respaldos:0),0);
    const unicos=fn=>[...new Set(filas.map(fn).filter(v=>v!==null&&v!==undefined&&v!==''))];
    return {
      estructura:ordenarEstructuraConsenso(estructura),huella:huellaEstructura(estructura),
      respaldos:suma(()=>true),
      secciones:unicos(f=>Number.isInteger(f.seccion)?f.seccion:null).sort((a,b)=>a-b),
      profes:unicos(f=>typeof f.profe==='string'?f.profe:null),
      profesores:unicos(f=>typeof f.profesor==='string'?limpiarNombreAjeno(f.profesor):null),
      mios:suma(f=>f.mio===true),
      mismaSeccion:Number.isInteger(seccionPropia)?suma(f=>f.seccion===seccionPropia):0,
    };
  }).sort((a,b)=>b.respaldos-a.respaldos||(a.huella<b.huella?-1:1));
}

// ¿Los reportes muestran que el ramo cambia según profesor o sección?
//   · Lo más claro: dos distribuciones con al menos dos estudiantes cada una,
//     de profesores o secciones que no se mezclan (5 del profe A con una pauta
//     y 4 del profe B con otra).
//   · Sin ese dato: una segunda distribución con tres o más estudiantes y al
//     menos 30% de la primera. Un error suelto no llega a eso; Cálculo I, con
//     13 iguales y 2 distintos, tampoco.
function evidenciaNoCoordinado(dists){
  const fuertes=(dists||[]).filter(d=>d.respaldos>=2);
  if(!fuertes[1])return false;
  const marcas=d=>new Set([...d.profes.map(p=>'p:'+p),...d.secciones.map(s=>'s:'+s)]);
  for(let i=0;i<fuertes.length;i++)for(let j=i+1;j<fuertes.length;j++){
    const a=marcas(fuertes[i]),b=marcas(fuertes[j]);
    if(a.size&&b.size&&![...a].some(x=>b.has(x)))return true;
  }
  const [primera,segunda]=fuertes;
  return segunda.respaldos>=3&&segunda.respaldos>=primera.respaldos*0.3;
}

// Lo que cada consulta concluyó, por ramo y período, para coordinacionRamo.
const _evidenciaCoordinacion=new Map();
function claveEvidenciaCoordinacion(tenant,periodo,clave){return [tenant,periodo,clave].join('|');}
function evidenciaCoordinacionDe(r){
  try{
    const tenant=r.origen?.tenant||S.tenant,clave=claveReporte(r);
    if(!tenant||!clave)return undefined;
    return _evidenciaCoordinacion.get(claveEvidenciaCoordinacion(tenant,periodoReporte(r),clave));
  }catch(e){return undefined;}
}

// Lee la RPC nueva; si todavía no está aplicada en Supabase, usa la anterior
// (sin sección ni profe) para no dejar a nadie sin sugerencia.
async function leerFilasDistribucion(ctx){
  const args={p_tenant:ctx.tenant,p_periodo:ctx.periodo,p_ramo_key:ctx.clave,p_seccion:ctx.seccion};
  try{
    const {data,error}=await supabaseClient.rpc('pautas_sugeridas',args);
    if(!error&&Array.isArray(data))return {filas:data,completas:true};
  }catch(e){}
  try{
    const {data,error}=await supabaseClient.rpc('pauta_sugerida',args);
    if(!error&&Array.isArray(data))return {filas:data.map(f=>({...f,seccion:null,profe:null,profesor:null,mio:false})),completas:false};
  }catch(e){}
  return null;
}
function registrarEvidenciaCoordinacion(ctx,dists){
  _evidenciaCoordinacion.set(claveEvidenciaCoordinacion(ctx.tenant,ctx.periodo,ctx.clave),evidenciaNoCoordinado(dists));
}
// Antes de aplicar solo un consenso en un ramo que es coordinado solo por estar
// en la malla, se mira si los reportes dicen otra cosa. Con la RPC anterior
// faltan los ramos con consenso, así que no se concluye nada.
async function prepararEvidenciaCoordinacion(r){
  if(coordinacionRamo(r)?.fuente!=='malla'||evidenciaCoordinacionDe(r)!==undefined)return;
  const ctx=contextoPautaSugerida(r);if(!ctx.clave)return;
  const leidas=await leerFilasDistribucion(ctx);
  if(leidas?.completas)registrarEvidenciaCoordinacion(ctx,agruparDistribuciones(leidas.filas,ctx.seccion));
}

// Lo que publican el programa o el catálogo para un ramo no coordinado: el
// programa de cada sección que lo tiene (`porSeccion`) y la pauta del catálogo
// (`evalsReferencia`). No se cargan solas: se ofrecen diciendo de dónde salen,
// y el programa de tu propia sección va primero.
function convertirEvalsReferencia(evals){
  if(!Array.isArray(evals)||!pautaPresetSuficiente(evals))return null;
  const est=evals.filter(e=>Array.isArray(e)&&typeof e[0]==='string'&&Number(e[1])>0).map(e=>({
    nombre:e[0],peso:Number(e[1]),...(e[2]&&Number.isInteger(e[2].slots)&&e[2].slots>1?{slots:e[2].slots}:{}),
  }));
  return est.length>=2?est:null;
}
function opcionesReferencia(r){
  const def=pautaOficialDelRamo(r.nombre,r.origen?.tenant||S.tenant);
  if(!def||Array.isArray(def)||def.coordinado!==false)return [];
  const out=[],porHuella=new Map();
  Object.keys(def.porSeccion||{}).map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b).forEach(n=>{
    const est=convertirEvalsReferencia(evalsDePreset(def.porSeccion[n]));if(!est)return;
    const huella=huellaEstructura(est);
    if(porHuella.has(huella)){porHuella.get(huella).secciones.push(n);return;}
    const o={estructura:ordenarEstructuraConsenso(est),huella,secciones:[n],fuente:'programa'};
    porHuella.set(huella,o);out.push(o);
  });
  const catalogo=convertirEvalsReferencia(def.evalsReferencia);
  if(catalogo&&!porHuella.has(huellaEstructura(catalogo)))
    out.push({estructura:ordenarEstructuraConsenso(catalogo),huella:huellaEstructura(catalogo),secciones:[],fuente:'catalogo'});
  return out.map(o=>({...o,respaldos:1,profesores:[],
    tuya:o.fuente==='programa'&&o.secciones.includes(r.seccion)?'programa':null}));
}
