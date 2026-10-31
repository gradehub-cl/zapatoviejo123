
// ─── CAMPAÑAS: CUÁNTO CUESTA ────────────────────────────────────────────────
//
// Decidido por Lucas el 2026-09-25. Una campaña cuesta $100 por día visible,
// y por PERSONA: $10 si la vio, $50 si la abrió y $1.000 si contactó. Cada
// persona cuenta una vez por anuncio en cada cosa. El profesor pone un tope: es
// lo máximo que pagaría, y al llegar la clase deja de mostrarse. Filtrar por
// nota no cuesta más. El cobro es manual: se coordina antes de publicar y nunca pasa del tope.
//
// El servidor tiene la misma tarifa (tarifa_campana_clp) y es el que cuenta;
// esto solo arma la cuenta para mostrarla. Un test exige que coincidan.
// Desde 2026-10-31, precio cero al aprobar = sin costo. La instantánea
// del servidor conserva la tarifa de campañas anteriores y de anuncios editados.
const TARIFA_CAMPANA={dia:100,vista:10,apertura:50,contacto:1000};
const DIAS_CAMPANA_POR_OMISION=10,MAX_DIAS_CAMPANA=60,MIN_TOPE_CAMPANA=1000,MAX_TOPE_CAMPANA=5000000;
const TOPE_CAMPANA_POR_OMISION=10000;

// La fecha de hoy en Chile como AAAA-MM-DD: las campañas empiezan a medianoche
// de Chile, no de Londres.
function hoyChileClase(ahora=Date.now()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date(ahora));
}
function sumarDiasFechaClase(fecha,dias){
  const t=Date.parse(fecha+'T12:00:00Z');
  return Number.isFinite(t)?new Date(t+dias*864e5).toISOString().slice(0,10):'';
}
function diasEntreFechasClase(desde,hasta){
  const a=Date.parse(desde+'T12:00:00Z'),b=Date.parse(hasta+'T12:00:00Z');
  return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/864e5):NaN;
}

// Días, inicio (vacío = apenas se apruebe) y tope, como los guarda la base.
function validarCampanaClase(entrada,ahora=Date.now(),precio=null){
  const e=entrada||{};
  const dias=Number(e.dias),tope=Number(e.tope_clp),inicio=String(e.inicio||'').trim();
  if(!Number.isSafeInteger(dias)||dias<1||dias>MAX_DIAS_CAMPANA)
    return {ok:false,campo:'dias',error:`La campaña dura entre 1 y ${MAX_DIAS_CAMPANA} días.`};
  if(inicio&&(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!Number.isFinite(Date.parse(inicio+'T12:00:00Z'))))
    return {ok:false,campo:'inicio',error:'Revisa la fecha de inicio.'};
  if(inicio&&inicio<hoyChileClase(ahora))
    return {ok:false,campo:'inicio',error:'La fecha de inicio ya pasó. Déjala vacía para partir apenas la aprobemos.'};
  if(precio!==0&&(!Number.isSafeInteger(tope)||tope<MIN_TOPE_CAMPANA||tope>MAX_TOPE_CAMPANA))
    return {ok:false,campo:'tope',error:`Pon un tope entre ${pesosClase(MIN_TOPE_CAMPANA)} y ${pesosClase(MAX_TOPE_CAMPANA)}.`};
  return {ok:true,datos:{dias,inicio:inicio||null,tope_clp:precio===0?null:tope}};
}

// La cuenta de una campaña, con cada concepto a la vista. `total` nunca pasa
// del tope: eso es lo que el profesor pagaría.
function tarifaCampanaClase(concepto,sinCosto=false){return sinCosto?0:TARIFA_CAMPANA[concepto];}
async function leerCostoCampanaClase(anuncioId){
  const args={p_anuncio_id:anuncioId};
  const r=await supabaseClient.rpc('campana_anuncio_con_tarifa',args);
  return r.error&&sqlClasesDesactualizado(r.error)?supabaseClient.rpc('campana_anuncio',args):r;
}
function costoCampanaClase(c){
  if(!c)return null;
  const n=k=>Number.isSafeInteger(c[k])&&c[k]>0?c[k]:0;
  const partes=[
    {clave:'vista',cantidad:n('vistas'),precio:tarifaCampanaClase('vista',c.sin_costo===true)},
    {clave:'apertura',cantidad:n('aperturas'),precio:tarifaCampanaClase('apertura',c.sin_costo===true)},
    {clave:'contacto',cantidad:n('contactos'),precio:tarifaCampanaClase('contacto',c.sin_costo===true)},
    {clave:'dia',cantidad:n('dias_cobrados'),precio:tarifaCampanaClase('dia',c.sin_costo===true)},
  ].map(p=>({...p,subtotal:p.cantidad*p.precio}));
  const bruto=partes.reduce((s,p)=>s+p.subtotal,0);
  const tope=c.sin_costo===true?null:Number.isSafeInteger(c.tope_clp)?c.tope_clp:null;
  return {sinCosto:c.sin_costo===true,partes,bruto,tope,total:tope===null?bruto:Math.min(bruto,tope),agotada:tope!==null&&bruto>=tope};
}
// "120 personas te vieron ($1.200) · 15 la abrieron ($750) · …"
function lineaCostoCampanaClase(costo){
  if(!costo)return '';
  const miles=x=>new Intl.NumberFormat('es-CL').format(x);
  const texto={
    vista:x=>`${miles(x)} ${x===1?'persona te vio':'personas te vieron'}`,
    apertura:x=>`${miles(x)} ${x===1?'la abrió':'la abrieron'}`,
    contacto:x=>`${miles(x)} ${x===1?'te contactó':'te contactaron'}`,
    dia:x=>`${miles(x)} ${x===1?'día':'días'} publicada`,
  };
  return costo.partes.map(p=>`${texto[p.clave](p.cantidad)} (${pesosClase(p.subtotal)})`).join(' · ');
}

// Pide solo el catálogo público de una universidad. No recibe `ramos` como
// parámetro ni lee S.ramos: esos datos nunca cruzan esta frontera de red.
async function cargarAnunciosClases(tenant,{propagarError=false}={}){
  const universidad=String(tenant||'').trim();
  if(!supabaseClient||!universidad){if(propagarError)throw new Error('Catálogo no disponible');return [];}
  const ahora=new Date().toISOString();
  try{
    const anuncios=[],vistos=new Set(),tamano=60;
    for(let desde=0;;desde+=tamano){
      const {data,error}=await consultaCamposClase(campos=>supabaseClient.from('tutor_anuncios')
        .select(campos).eq('tenant',universidad).eq('estado','publicado')
        .or(`vence_at.is.null,vence_at.gt.${ahora}`)
        .order('publicado_at',{ascending:false}).order('id',{ascending:true})
        .range(desde,desde+tamano-1),CAMPOS_PUBLICOS_ANUNCIO);
      if(error)throw error;
      const pagina=Array.isArray(data)?data:[];
      pagina.forEach(a=>{if(!vistos.has(a.id)){vistos.add(a.id);anuncios.push(a);}});
      if(pagina.length<tamano)return anuncios;
    }
  }catch(error){console.warn('No se pudieron cargar las clases particulares:',error.message||error);if(propagarError)throw error;return [];}
}
