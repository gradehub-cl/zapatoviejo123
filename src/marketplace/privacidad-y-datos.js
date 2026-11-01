// ─── CLASES PARTICULARES · DATOS Y PRIVACIDAD ───────────────────────────────
//
// Incluye el espacio privado de profesor, pero no publica anuncios: trae el
// catálogo de avisos activos y decide LOCALMENTE qué ramos calzan.
// La lista de ramos, las notas y cualquier señal de rendimiento no salen del
// dispositivo para segmentar anuncios.

const METRICAS_ANUNCIO = new Set(['impresion', 'clic', 'contacto']);
const FLYER_CLASE_MAX_BYTES = 5*1024*1024;
const FLYER_CLASE_TIPOS = new Set(['image/jpeg','image/png','image/webp']);
const CAMPOS_PUBLICOS_ANUNCIO = 'id,tenant,ramos_siglas,criterios,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,flyer_path,estado,publicado_at,vence_at,created_at';
const CAMPOS_BORRADOR_CLASE = 'id,tenant,ramos_siglas,criterios,modalidad,ubicacion,precio_clp,titulo,descripcion,contacto_tipo,contacto_valor,flyer_path,estado,created_at';

// Columnas que llegaron después, en capas y en el orden en que se aplicaron:
// formato y lugar "otra" con detalles a medida, y después qué datos van bajo
// el título. El SQL se aplica a mano, así que la app puede salir antes que él:
// si el servidor dice que falta una columna, la consulta se repite sin la
// última capa y el catálogo, el panel y los borradores siguen andando. Se
// recuerda para no pedirlas de nuevo en cada consulta.
// La tercera capa (2026-09-30): pack de clases, que escribe el profesor, y el
// descuento por venir de GradeHub, que solo fija GradeHub al aprobar.
// La cuarta (2026-10-23): si el anuncio es una clase o material de apoyo.
const CAPAS_CAMPOS_CLASE=[',modalidad_otra,ubicacion_otra,detalles',',linea_datos',',pack_clases,descuento_gradehub_pct',',tipo',',codigo_descuento'];
let capasColumnasClase=CAPAS_CAMPOS_CLASE.length;
function faltaColumnaClase(error){
  return !!error&&(error.code==='42703'||error.code==='PGRST204'||/column|columna/i.test(String(error.message||'')));
}
async function consultaCamposClase(hacer,base){
  for(;;){
    const capas=capasColumnasClase;
    const r=await hacer(base+CAPAS_CAMPOS_CLASE.slice(0,capas).join(''));
    if(capas===0||!faltaColumnaClase(r&&r.error))return r;
    // Dos consultas a la vez no bajan dos capas por la misma columna.
    capasColumnasClase=Math.min(capasColumnasClase,capas-1);
  }
}
// Hasta dos ramos por anuncio desde el 2026-09-26 (decisión de Lucas): la
// misma clase puede servir a dos siglas, como Dinámica ICE1514 y FIS1514.
const MAX_RAMOS_POR_ANUNCIO=2;
const MAX_DETALLES_CLASE=4,MAX_ETIQUETA_DETALLE=30,MAX_VALOR_DETALLE=80;
const MIN_PACK_CLASES=2,MAX_PACK_CLASES=20;
// Bajo el título de la recomendación caben pocos datos: el profesor elige
// hasta tres. Sin elección son los de siempre.
// El precio no va bajo el título en Inicio (Lucas, 2026-10-25): se ve al
// abrir la clase. Un `linea_datos` guardado con 'precio' simplemente lo omite.
const MAX_LINEA_CLASE=3,LINEA_CLASE_POR_OMISION=['modalidad','ubicacion'];
const MODALIDADES_CLASE=[['individual','Individual'],['grupal','Grupal']];
// Qué se publica (Lucas, 2026-10-23): una clase o material de apoyo (guías,
// apuntes, ejercicios resueltos). Un anuncio sin tipo es una clase, como todos
// los que existían antes.
const TIPOS_ANUNCIO=[['clase','Clase particular'],['material','Material de apoyo']];
const TEXTO_TIPO_ANUNCIO={clase:'Clases que das tú, online o presencial.',material:'Guías, apuntes o ejercicios resueltos que el estudiante consigue por WhatsApp o un link.'};
function esMaterialClase(a){return !!a&&a.tipo==='material';}
function etiquetaTipoClase(a){return esMaterialClase(a)?'Material de apoyo':'Clase particular';}
const UBICACIONES_CLASE=[['online','Online'],['presencial','Presencial'],['hibrido','Híbrida']];

// Un borrador en Supabase es una clase COMPLETA, todavía no un formulario a
// medio escribir: la tabla exige estos campos. No se añade nada a gradehub_v1.
// El nombre de un ramo sin la sigla entre paréntesis: "Dinámica (ICE1514)" y
// "Dinámica" son el mismo ramo para quien lee el anuncio.
function nombreBaseRamoClase(nombre){return String(nombre||'').replace(/\s*\([^)]*\)\s*$/,'').trim();}
function mismoRamoClase(a,b){
  const n=x=>nombreBaseRamoClase(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return !!n(a)&&n(a)===n(b);
}
const ERROR_DOS_RAMOS_CLASE='Dos siglas solo se juntan si son el mismo ramo, como Dinámica ICE1514 y FIS1514. Si enseñas otro ramo, arma otro anuncio.';
function validarBorradorClase(entrada,nombresPorSigla){
  if(!entrada||typeof entrada!=='object'||Array.isArray(entrada))return {ok:false,campo:'clase',error:'Completa los datos de tu clase.'};
  const tenant=String(entrada.tenant||'').trim();
  if(!UNIVERSIDADES_PERFIL.some(([v])=>v===tenant))return {ok:false,campo:'tenant',error:'Elige una universidad.'};
  const titulo=String(entrada.titulo||'').trim();
  if(titulo.length<5||titulo.length>90)return {ok:false,campo:'titulo',error:'Ponle un título de 5 a 90 caracteres.'};
  const descripcion=String(entrada.descripcion||'').trim();
  if(descripcion.length<20||descripcion.length>1500)return {ok:false,campo:'descripcion',error:entrada.tipo==='material'
    ?'Cuenta qué trae el material (20 a 1500 caracteres).':'Cuenta qué harás en la clase (20 a 1500 caracteres).'};
  const siglas=Array.isArray(entrada.ramos_siglas)?entrada.ramos_siglas.map(s=>String(s||'').trim().toUpperCase()):[];
  // Un ramo por anuncio (decisión de Lucas del 2026-09-25), con una
  // excepción desde el 2026-09-26: dos siglas del MISMO ramo, como Dinámica
  // ICE1514 y FIS1514. Dos ramos distintos siguen siendo dos anuncios. La base
  // exige uno o dos con un trigger; que sean el mismo ramo lo revisa esta
  // validación y quien aprueba, porque la base no conoce los nombres.
  if(siglas.length<1||siglas.some(s=>!/^[A-Z0-9-]{2,24}$/.test(s)))
    return {ok:false,campo:'ramos_siglas',error:'Elige el ramo de tu clase.'};
  if(siglas.length>MAX_RAMOS_POR_ANUNCIO||new Set(siglas).size!==siglas.length)
    return {ok:false,campo:'ramos_siglas',error:'Un anuncio puede tener hasta dos ramos. Si enseñas más, arma otro anuncio.'};
  if(siglas.length===2){
    const nombres=nombresPorSigla||nombresRamosParaClases(entrada.tenant);
    if(!mismoRamoClase(nombres[siglas[0]],nombres[siglas[1]]))return {ok:false,campo:'ramos_siglas',error:ERROR_DOS_RAMOS_CLASE};
  }
  if(!criteriosClaseValidos(entrada.criterios))return {ok:false,campo:'criterios',error:'Revisa el promedio y el avance elegidos para tu público.'};
  const tipo=entrada.tipo==='material'?'material':'clase';
  // Un material no tiene formato, lugar ni pack: lo que venga se ignora.
  if(tipo==='material')entrada={...entrada,modalidad:'',ubicacion:'',modalidad_otra:'',ubicacion_otra:'',pack_clases:''};
  // Formato y lugar son opcionales. "Otra" exige escribirla: una opción
  // elegida sin texto se mostraría como nada.
  const opcion=(valor,validas,texto,campo,nombre)=>{
    const v=String(valor||'');
    if(!v)return {ok:true,valor:null,otra:null};
    if(v==='otra'){
      const t=String(texto||'').trim();
      if(t.length<2||t.length>40)return {ok:false,campo:campo+'_otra',error:`Escribe ${nombre} en 2 a 40 caracteres.`};
      return {ok:true,valor:'otra',otra:t};
    }
    return validas.includes(v)?{ok:true,valor:v,otra:null}:{ok:false,campo,error:`Revisa ${nombre}.`};
  };
  const mod=opcion(entrada.modalidad,MODALIDADES_CLASE.map(o=>o[0]),entrada.modalidad_otra,'modalidad','el formato');
  if(!mod.ok)return mod;
  const ubi=opcion(entrada.ubicacion,UBICACIONES_CLASE.map(o=>o[0]),entrada.ubicacion_otra,'ubicacion','dónde es la clase');
  if(!ubi.ok)return ubi;
  const detallesCrudos=entrada.detalles==null?[]:entrada.detalles;
  if(!Array.isArray(detallesCrudos))return {ok:false,campo:'detalles',error:'Revisa los detalles de tu clase.'};
  // Una fila sin nada escrito no es un detalle: es una casilla que quedó vacía.
  const detalles=detallesCrudos.map(d=>({etiqueta:String(d&&d.etiqueta||'').trim(),valor:String(d&&d.valor||'').trim()}))
    .filter(d=>d.etiqueta||d.valor);
  if(detalles.length>MAX_DETALLES_CLASE)return {ok:false,campo:'detalles',error:`Puedes agregar hasta ${MAX_DETALLES_CLASE} detalles.`};
  if(detalles.some(d=>!d.etiqueta||!d.valor))return {ok:false,campo:'detalles',error:'Cada detalle necesita un nombre y lo que dice, por ejemplo "Duración: 90 minutos".'};
  if(detalles.some(d=>d.etiqueta.length>MAX_ETIQUETA_DETALLE||d.valor.length>MAX_VALOR_DETALLE))
    return {ok:false,campo:'detalles',error:`Cada detalle va con un nombre de hasta ${MAX_ETIQUETA_DETALLE} caracteres y un texto de hasta ${MAX_VALOR_DETALLE}.`};
  const modalidad=mod.valor,ubicacion=ubi.valor;
  let linea_datos=null;
  if(entrada.linea_datos!=null){
    // 'precio' se sigue aceptando (borradores de antes del 2026-10-25) pero
    // ya no se guarda: no va bajo el título.
    const validas=new Set([...LINEA_CLASE_POR_OMISION,'precio',...detalles.map(d=>'detalle:'+d.etiqueta)]);
    const claves=Array.isArray(entrada.linea_datos)?[...new Set(entrada.linea_datos.map(x=>String(x||'').trim()))]:[];
    if(claves.length<1||claves.length>MAX_LINEA_CLASE||claves.some(c=>!validas.has(c)))
      return {ok:false,campo:'linea_datos',error:`Elige de 1 a ${MAX_LINEA_CLASE} datos para mostrar bajo el título.`};
    const sinPrecio=claves.filter(c=>c!=='precio');
    linea_datos=sinPrecio.length?sinPrecio:null;
  }
  // Pack: el precio sigue siendo POR CLASE y el pack solo dice cuántas trae.
  // Vacío = sin pack. Una clase gratis no se vende en pack.
  let pack_clases=null;
  if(entrada.pack_clases!==null&&entrada.pack_clases!==undefined&&entrada.pack_clases!==''){
    const n=Number(entrada.pack_clases);
    if(!Number.isSafeInteger(n)||n<MIN_PACK_CLASES||n>MAX_PACK_CLASES)
      return {ok:false,campo:'pack_clases',error:`Un pack trae entre ${MIN_PACK_CLASES} y ${MAX_PACK_CLASES} clases. Déjalo vacío si cobras por clase.`};
    if(entrada.precio_clp===0)return {ok:false,campo:'pack_clases',error:'Una clase gratis no se vende en pack. Deja vacío el pack.'};
    pack_clases=n;
  }
  // $0 es una clase gratis (pedido de Lucas del 2026-09-25). Entre $1 y $999
  // no hay clase que valga eso: casi siempre es un precio a medio escribir.
  if(!Number.isSafeInteger(entrada.precio_clp)||!(entrada.precio_clp===0||(entrada.precio_clp>=1000&&entrada.precio_clp<=500000)))
    return {ok:false,campo:'precio_clp',error:`Indica el precio ${tipo==='material'?'del material':'de la clase'} entre $1.000 y $500.000, o $0 si es gratis.`};
  const contacto_tipo=String(entrada.contacto_tipo||''),contacto_valor=String(entrada.contacto_valor||'').trim();
  // WhatsApp desde el 2026-09-25 (decisión de Lucas): es el canal que usan
  // todos y el único que abre con el mensaje escrito. El número no se muestra;
  // el estudiante llega por el botón y así el contacto se mide. Una clase
  // GRATIS puede, además, llevar a un Instagram o a un link de inscripción.
  if(!contactosPermitidosClase(entrada.precio_clp,tipo).includes(contacto_tipo))
    return {ok:false,campo:'contacto_valor',error:entrada.precio_clp===0
      ?`Elige cómo te contactarán: WhatsApp, Instagram o un link${tipo==='material'?'':' de inscripción'}.`
      :tipo==='material'?'Elige cómo lo consiguen: tu WhatsApp o un link.':'Las clases pagadas se contactan por WhatsApp. Escribe tu número.'};
  if(contacto_valor.length<3||contacto_valor.length>160)return {ok:false,campo:'contacto_valor',error:'Revisa el dato de contacto.'};
  // El formulario rellena "+56 " o "@" solo: sin esta comprobación el prefijo
  // solo, sin número ni usuario, pasaba como contacto válido y el anuncio
  // llegaba a revisión con un botón que no lleva a ninguna parte.
  if(!enlaceContactoClase(contacto_tipo,contacto_valor))return {ok:false,campo:'contacto_valor',error:ERROR_CONTACTO_CLASE[contacto_tipo]};
  // Lista blanca: nunca aceptar un estado de publicación, marcas de pago ni
  // datos académicos del estudiante enviados junto con el formulario.
  return {ok:true,datos:{tipo,tenant,ramos_siglas:siglas,
    criterios:{promedioMenorA:entrada.criterios.promedioMenorA,avanceMinimo:entrada.criterios.avanceMinimo},
    modalidad,ubicacion,modalidad_otra:mod.otra,ubicacion_otra:ubi.otra,detalles:detalles.length?detalles:null,linea_datos,
    precio_clp:entrada.precio_clp,pack_clases,titulo,descripcion,contacto_tipo,contacto_valor}};
}

const ERROR_CONTACTO_CLASE={
  whatsapp:'Escribe tu número de WhatsApp completo, por ejemplo +56 9 1234 5678.',
  instagram:'Escribe tu usuario de Instagram, por ejemplo @salvaramos.',
  enlace:'Pega el link de inscripción completo, que empiece con https://.',
};
// Qué contactos admite un anuncio según su precio y su tipo. El servidor exige
// lo mismo: una clase pagada, solo WhatsApp; un material pagado, WhatsApp o un
// link para conseguirlo; gratis, cualquiera de los tres.
const CONTACTOS_CLASE=[['whatsapp','WhatsApp'],['instagram','Instagram'],['enlace','Link de inscripción']];
function contactosPermitidosClase(precio,tipo='clase'){
  if(precio===0)return ['whatsapp','instagram','enlace'];
  return tipo==='material'?['whatsapp','enlace']:['whatsapp'];
}
function opcionesContactoClase(precio,tipo='clase'){
  const permitidos=contactosPermitidosClase(precio,tipo);
  return CONTACTOS_CLASE.filter(([clave])=>permitidos.includes(clave))
    .map(([clave,texto])=>[clave,clave==='enlace'&&tipo==='material'?'Link para conseguirlo':texto]);
}
