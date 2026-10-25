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
  if(!['uc','fen','uai','uandes'].includes(tenant))return {ok:false,campo:'tenant',error:'Elige una universidad.'};
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

// ─── CAMPOS QUE SE ESCRIBEN CON FORMATO ─────────────────────────────────────
//
// Un monto en pesos se ve como se lee: al escribir 15000 aparece $15.000. El
// campo guarda texto y `pesosDeTexto` devuelve el número; por eso es un
// input de texto con teclado numérico y no `type=number`, que no acepta ni el
// signo ni los puntos.
function textoPesosEscrito(texto){
  const digitos=String(texto??'').replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(0,9);
  return digitos?'$'+digitos.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
}
function pesosDeTexto(texto){
  const digitos=String(texto||'').replace(/\D/g,'');
  return digitos?Number(digitos):NaN;
}

// WhatsApp de Chile con sus espacios: "+56 9 1234 5678". Solo se ordena un
// celular chileno; un número de otro país se deja tal como lo escribieron.
//
// El campo parte con "+56 " y NO con "+56 9 ": con el 9 ya puesto, quien
// escribía su número como lo dice ("9 1234 5678") quedaba con un 9 de más, y
// esta función además cortaba en 8 dígitos, así que el último se perdía sin
// aviso. Así se publicó un anuncio cuyo botón abría el chat de un número que no
// era (2026-09-28). Ahora no se corta nada: lo que sobra queda a la vista y la
// validación lo rechaza.
function textoWhatsappEscrito(texto){
  const t=String(texto||'');
  if(!/^\s*\+?\s*56/.test(t))return t;
  const resto=t.replace(/\D/g,'').slice(2);
  if(!resto.startsWith('9'))return t;
  const cel=resto.slice(1);
  return '+56 9 '+(cel.length>4?cel.slice(0,4)+' '+cel.slice(4):cel);
}
// Un número de Chile tiene 9 dígitos después del 56. Uno con el código de país
// y un dígito de más o de menos, o un celular sin el 56 ("9 1234 5678", que
// wa.me leería como de otro país), se puede escribir y guardar en el borrador,
// pero no se envía a revisión: ver enviarBorradorClase.
const ERROR_WHATSAPP_CHILE='Revisa tu número: después del +56 van 9 dígitos, por ejemplo +56 9 1234 5678.';
function whatsappChilenoCompleto(valor){
  const d=String(valor||'').replace(/\D/g,'');
  return /^569\d{8}$/.test(d);
}
function contactoListoParaPublicar(datos){
  if(datos&&datos.contacto_tipo==='whatsapp'&&!whatsappChilenoCompleto(datos.contacto_valor))
    return {ok:false,campo:'contacto_valor',error:ERROR_WHATSAPP_CHILE};
  return {ok:true};
}
function textoInstagramEscrito(texto){
  const t=String(texto||'').replace(/\s+/g,'');
  return t&&!t.startsWith('@')?'@'+t:t;
}
const PREFIJO_CONTACTO_CLASE={whatsapp:'+56 ',instagram:'@',enlace:'https://'};
const EJEMPLO_CONTACTO_CLASE={whatsapp:'+56 9 1234 5678',instagram:'@salvaramos',enlace:'https://forms.gle/…'};

// Reescribe el campo con su formato sin mandar el cursor al final: cuenta
// cuántos caracteres "de verdad" (dígitos, letras) había antes del cursor y lo
// deja después de esa misma cantidad en el texto nuevo. Borrar no reformatea,
// para que la persona pueda borrar un espacio o el prefijo sin que vuelva solo.
function formatearAlEscribir(input,formatear){
  if(!input||typeof input.addEventListener!=='function')return;
  const util=c=>/[\p{L}\p{N}]/u.test(c);
  input.addEventListener('input',e=>{
    if(e&&typeof e.inputType==='string'&&e.inputType.startsWith('delete'))return;
    const antes=String(input.value||''),nuevo=formatear(antes);
    if(nuevo===antes)return;
    const cursor=typeof input.selectionStart==='number'?input.selectionStart:antes.length;
    const utilesAntes=[...antes.slice(0,cursor)].filter(util).length;
    input.value=nuevo;
    let pos=nuevo.length;
    if(utilesAntes<[...nuevo].filter(util).length){
      let vistos=0;
      for(let i=0;i<nuevo.length;i++){if(util(nuevo[i])&&++vistos===utilesAntes){pos=i+1;break;}}
      if(utilesAntes===0)pos=nuevo.search(/[\p{L}\p{N}]/u);
    }
    try{input.setSelectionRange(pos,pos);}catch(err){}
  });
}
function campoPesos(input){formatearAlEscribir(input,textoPesosEscrito);}

// El estado de profesor lo miran dos lugares —la sección de Ajustes y la barra
// de pestañas— y ninguno puede esperar una consulta de red para pintarse. Se
// guarda acá: null mientras no se sabe, y la ficha (o false) cuando se supo.
// Tres estados distintos, y confundirlos deja la pantalla mintiendo: todavía no
// se sabe, no se pudo saber (el SQL del marketplace no está aplicado), o se supo
// —y ahí puede ser una ficha o ninguna—.
let perfilProfesorCache=null,perfilProfesorPedido=false,perfilProfesorResuelto=false,perfilProfesorVersion=0;
function perfilProfesorConocido(){
  if(!perfilProfesorResuelto)return undefined;   // preguntando
  return perfilProfesorCache;                     // ficha, false, o null si no se pudo
}
// Lo decide un admin (profesor_alumnos.sql). Sin la columna, se muestra.
function panelAlumnosOculto(){return !!(perfilProfesorCache&&perfilProfesorCache.panel_alumnos===false);}
function esProfesorAprobado(){
  return !!(perfilProfesorCache&&perfilProfesorCache.estado==='aprobado');
}
// Se llama al entrar. No bloquea nada: si falla —por ejemplo porque el SQL del
// marketplace todavía no está aplicado— la app sigue igual y simplemente no
// aparece ni la pestaña ni el estado en Ajustes.
async function cargarPerfilProfesor(){
  if(perfilProfesorPedido)return perfilProfesorCache;
  const cuenta=sesionProfesorClase(),version=perfilProfesorVersion;
  perfilProfesorPedido=true;
  const r=await perfilProfesorActual();
  if(cuenta!==sesionProfesorClase()||version!==perfilProfesorVersion)return null;
  perfilProfesorCache=r.ok?(r.perfil||false):null;
  perfilProfesorResuelto=true;
  return perfilProfesorCache;
}
// Después de postular o de que cambie el estado, para no dejar la pantalla
// mostrando lo anterior.
function olvidarPerfilProfesor(){perfilProfesorVersion++;perfilProfesorCache=null;perfilProfesorPedido=false;perfilProfesorResuelto=false;}

function sesionProfesorClase(){
  return supabaseClient&&currentUser&&currentUser.id?String(currentUser.id):'';
}

async function perfilProfesorActual(){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para entrar al espacio de profesor.'};
  try{
    // El logo llegó después, y el perfil completo después (2026-10-23): sin
    // su SQL aplicado se pide la ficha que el servidor sí tiene.
    const pedir=campos=>supabaseClient.from('tutor_perfiles').select(campos).eq('user_id',uid).maybeSingle();
    const base='nombre_publico,presentacion,estado,solicitado_at,revisado_at',logo=',logo_id,logo_path,logo_aprobado_path';
    let {data,error}=await pedir(base+logo+CAMPOS_PERFIL_PROFESOR+',panel_alumnos');
    if(faltaColumnaClase(error))({data,error}=await pedir(base+logo+CAMPOS_PERFIL_PROFESOR));
    if(faltaColumnaClase(error))({data,error}=await pedir(base+logo));
    if(faltaColumnaClase(error))({data,error}=await pedir(base));
    // El motivo real queda en la consola. El 2026-09-25 un SQL pegado a medias
    // dejó sin permiso de lectura la ficha, y la pantalla solo decía "todavía
    // no está disponible": un "permission denied" acá lo habría dicho al tiro.
    if(error){console.warn('No se pudo leer la ficha de profesor:',error.code||'',error.message||error);
      return {ok:false,error:'El espacio de profesor todavía no está disponible. Tus notas no se han tocado.'};}
    return {ok:true,perfil:data||null};
  }catch(e){console.warn('No se pudo leer la ficha de profesor:',e);return {ok:false,error:'El espacio de profesor todavía no está disponible. Tus notas no se han tocado.'};}
}

// ─── PERFIL DE PROFESOR O EMPRESA (2026-10-23, base de #643) ─────────────────
// El profesor elige si es profesor o academia, sus redes, ramos y
// universidades, y si el perfil se muestra en sus anuncios. Nada es público
// hasta que lo activa (supabase/perfil_profesor.sql).
const CAMPOS_PERFIL_PROFESOR=',tipo_perfil,instagram,sitio_web,universidades,ramos_siglas,perfil_publico';
const UNIVERSIDADES_PERFIL=[['uc','UC'],['fen','FEN'],['uai','UAI'],['uandes','UAndes']];
const TIPOS_PERFIL=[['profesor','Profesor'],['empresa','Academia o empresa']];
function tienePerfilCompleto(perfil){return !!perfil&&Object.prototype.hasOwnProperty.call(perfil,'perfil_publico');}
function validarPerfilProfesor(e){
  const nombre=String(e.nombre_publico||'').trim(),presentacion=String(e.presentacion||'').trim();
  if(nombre.length<2||nombre.length>100)return {ok:false,campo:'nombre',error:'Escribe un nombre público de 2 a 100 caracteres.'};
  if(presentacion.length<20||presentacion.length>1500)return {ok:false,campo:'presentacion',error:'Escribe una descripción de 20 a 1500 caracteres.'};
  const tipo=e.tipo_perfil==='empresa'?'empresa':e.tipo_perfil==='profesor'?'profesor':null;
  const insta=String(e.instagram||'').trim().replace(/^@/,'');
  if(insta&&!/^[A-Za-z0-9._]{1,30}$/.test(insta))return {ok:false,campo:'instagram',error:'Escribe tu usuario de Instagram, por ejemplo @salvaramos.'};
  const web=String(e.sitio_web||'').trim();
  if(web){
    let u;try{u=new URL(web);}catch(err){return {ok:false,campo:'web',error:'Pega el link completo de tu sitio, que empiece con https://.'};}
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.href.length>160)
      return {ok:false,campo:'web',error:'Pega el link completo de tu sitio, que empiece con https://.'};
  }
  const universidades=[...new Set((e.universidades||[]).filter(t=>UNIVERSIDADES_PERFIL.some(([v])=>v===t)))];
  const ramos=[...new Set(String(e.ramos||'').split(/[,\s]+/).map(x=>x.trim().toUpperCase()).filter(Boolean))];
  if(ramos.length>20)return {ok:false,campo:'ramos',error:'Puedes poner hasta 20 ramos.'};
  if(ramos.some(r=>!/^[A-Z0-9-]{2,24}$/.test(r)))return {ok:false,campo:'ramos',error:'Escribe las siglas de los ramos separadas por coma, por ejemplo MAT1620, FIS1514.'};
  return {ok:true,datos:{nombre_publico:nombre,presentacion,tipo_perfil:tipo,instagram:insta||null,sitio_web:web?new URL(web).href:null,
    universidades:universidades.length?universidades:null,ramos_siglas:ramos.length?ramos:null,perfil_publico:!!e.perfil_publico}};
}
async function guardarPerfilProfesor(entrada){
  const valido=validarPerfilProfesor(entrada);if(!valido.ok)return valido;
  const uid=sesionProfesorClase();if(!uid)return {ok:false,error:'Inicia sesión para guardar tu perfil.'};
  try{
    const {data,error}=await supabaseClient.from('tutor_perfiles').update(valido.datos).eq('user_id',uid)
      .select('nombre_publico'+CAMPOS_PERFIL_PROFESOR).maybeSingle();
    if(faltaColumnaClase(error))return {ok:false,error:'Todavía no podemos guardar el perfil completo. Vuelve a intentarlo en un rato.'};
    if(error||!data){if(error)console.warn('No se guardó el perfil:',error.code||'',error.message||error);return {ok:false,error:'No pudimos guardar tu perfil. Intenta de nuevo.'};}
    perfilProfesorCache=perfilProfesorCache?{...perfilProfesorCache,...data}:perfilProfesorCache;
    return {ok:true,perfil:data};
  }catch(e){return {ok:false,error:'No pudimos guardar tu perfil. Intenta de nuevo.'};}
}

async function postularProfesor(nombre,presentacion){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para postular.'};
  const publico=String(nombre||'').trim(),texto=String(presentacion||'').trim();
  if(publico.length<2||publico.length>100)return {ok:false,campo:'nombre',error:'Escribe un nombre público de 2 a 100 caracteres.'};
  if(texto.length<20||texto.length>1500)return {ok:false,campo:'presentacion',error:'Cuéntanos qué ramos enseñas y tu experiencia (20 a 1500 caracteres).'};
  try{
    const {data,error}=await supabaseClient.from('tutor_perfiles')
      .insert({user_id:uid,nombre_publico:publico,presentacion:texto})
      .select('nombre_publico,presentacion,estado,solicitado_at,revisado_at').single();
    if(error||!data||data.estado!=='pendiente')return {ok:false,error:'No pudimos enviar tu postulación. Intenta de nuevo.'};
    return {ok:true,perfil:data};
  }catch(e){return {ok:false,error:'No pudimos enviar tu postulación. Intenta de nuevo.'};}
}

async function abrirBorradorClase(id){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para ver tus borradores.'};
  if(id&&!/^[0-9a-f-]{36}$/i.test(String(id)))return {ok:false,error:'No encontramos ese borrador.'};
  try{
    // RLS delimita al dueño. autor_id no tiene SELECT público: filtrarlo aquí
    // provocaría un error de permisos o expondría identidades si se concediera.
    const {data,error}=await consultaCamposClase(campos=>{
      let consulta=supabaseClient.from('tutor_anuncios').select(campos).eq('estado','borrador');
      consulta=id?consulta.eq('id',id):consulta.order('created_at',{ascending:false}).limit(1);
      return consulta.maybeSingle();
    },CAMPOS_BORRADOR_CLASE);
    if(error)return {ok:false,error:'No pudimos abrir tu borrador. Intenta de nuevo.'};
    return {ok:true,anuncio:data||null};
  }catch(e){return {ok:false,error:'No pudimos abrir tu borrador. Intenta de nuevo.'};}
}

async function guardarBorradorClase(entrada,id){
  const valido=validarBorradorClase(entrada);
  if(!valido.ok)return valido;
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para guardar el borrador.'};
  if(id&&!/^[0-9a-f-]{36}$/i.test(String(id)))return {ok:false,error:'No encontramos ese borrador.'};
  try{
    const escribir=async campos=>{
      const datos={...valido.datos};
      // Sin el SQL del tipo, una clase se guarda como siempre; un material no
      // se puede guardar como clase: se avisa.
      if(!campos.includes('tipo')){
        if(datos.tipo==='material')return {data:null,error:{message:'sin-material'}};
        delete datos.tipo;
      }
      if(!campos.includes('pack_clases')){
        if(datos.pack_clases)return {data:null,error:{message:'sin-pack'}};
        delete datos.pack_clases;
      }
      if(!campos.includes('linea_datos')){
        if(datos.linea_datos)return {data:null,error:{message:'sin-linea-datos'}};
        delete datos.linea_datos;
      }
      if(!campos.includes('detalles')){
        // El servidor todavía no tiene estas columnas: lo clásico se guarda
        // igual, y lo nuevo se avisa en vez de perderse callado.
        if(datos.modalidad==='otra'||datos.ubicacion==='otra'||datos.detalles||datos.modalidad===null||datos.ubicacion===null)
          return {data:null,error:{message:'sin-columnas-nuevas'}};
        delete datos.modalidad_otra;delete datos.ubicacion_otra;delete datos.detalles;
      }
      const consulta=id
        ?supabaseClient.from('tutor_anuncios').update(datos).eq('id',id).eq('estado','borrador')
        :supabaseClient.from('tutor_anuncios').insert({...datos,autor_id:uid});
      return consulta.select(campos).single();
    };
    const {data,error}=await consultaCamposClase(escribir,CAMPOS_BORRADOR_CLASE);
    // Sin el SQL que acepta $0, el servidor rechaza la clase gratis por su
    // restricción de precio: se dice eso y no "revisa tu conexión".
    if(error&&error.code==='23514'&&valido.datos.precio_clp===0)return {ok:false,campo:'precio_clp',error:'Todavía no podemos guardar clases gratis. Pon un precio por ahora.'};
    if(error&&error.message==='sin-material')return {ok:false,campo:'tipo',error:'Todavía no podemos guardar material de apoyo. Vuelve a intentarlo en un rato.'};
    if(error&&error.message==='sin-pack')return {ok:false,campo:'pack_clases',error:'Todavía no podemos guardar packs. Deja vacío el pack y pon el precio por clase por ahora.'};
    if(error&&error.message==='sin-linea-datos')return {ok:false,campo:'linea_datos',error:'Todavía no podemos guardar qué datos van bajo el título. Deja formato, dónde y precio por ahora.'};
    if(error&&error.message==='sin-columnas-nuevas')return {ok:false,campo:'detalles',error:'Todavía no podemos guardar "Otra", un formato vacío ni detalles a medida. Usa las opciones de la lista por ahora.'};
    if(error||!data||data.estado!=='borrador'){
      // El motivo real queda en la consola: "revisa tu conexión" también sale
      // cuando el servidor rechaza, y sin esto hay que ir a buscarlo a mano.
      if(error)console.warn('No se guardó el borrador:',error.code||'',error.message||error);
      return {ok:false,error:error&&error.code==='42501'
        ?'No pudimos guardar: falta un permiso en el servidor. Tu borrador anterior sigue ahí.'
        :'No se guardó el borrador. Revisa tu conexión e intenta de nuevo.'};
    }
    return {ok:true,anuncio:data};
  }catch(e){return {ok:false,error:'No se guardó el borrador. Revisa tu conexión e intenta de nuevo.'};}
}

async function enviarBorradorClase(id){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para enviar tu anuncio.'};
  if(!/^[0-9a-f-]{36}$/i.test(String(id||'')))return {ok:false,error:'Guarda el borrador antes de enviarlo.'};
  const abierto=await abrirBorradorClase(id);
  if(!abierto.ok)return abierto;
  if(!abierto.anuncio)return {ok:false,error:'Este anuncio ya no es un borrador. Vuelve a abrirlo.'};
  const valido=validarBorradorClase(abierto.anuncio);
  if(!valido.ok)return valido;
  // El borrador se guarda con el número como esté; lo que no pasa es a
  // revisión. Así el profesor tiene que mirar un número mal escrito antes de
  // que un estudiante le escriba a otra persona (decisión de Lucas, 2026-09-28).
  const listo=contactoListoParaPublicar(valido.datos);
  if(!listo.ok)return listo;
  const campana=await leerCampanaClase(id,{diagnostico:true});
  if(!campana?.sqlAnterior&&(!campana||!validarCampanaClase(campana).ok))
    return {ok:false,error:'No se envió: primero guarda los días, la fecha y el tope de la campaña. Tu borrador sigue disponible.'};
  try{
    const {data,error}=await supabaseClient.from('tutor_anuncios')
      .update({estado:'en_revision'}).eq('id',id).eq('estado','borrador')
      .select('id,estado').single();
    if(error||!data||data.estado!=='en_revision')return {ok:false,error:'No se envió a revisión. Tu borrador sigue disponible.'};
    return {ok:true,anuncio:data,sqlAnterior:!!campana?.sqlAnterior};
  }catch(e){return {ok:false,error:'No se envió a revisión. Tu borrador sigue disponible.'};}
}

function validarFlyerClase(file){
  if(!file)return {ok:true,opcional:true};
  if(!FLYER_CLASE_TIPOS.has(String(file.type||'').toLowerCase()))return {ok:false,error:'Usa una imagen JPG, PNG o WebP.'};
  if(!Number.isFinite(file.size)||file.size<=0)return {ok:false,error:'No pudimos leer ese archivo.'};
  if(file.size>FLYER_CLASE_MAX_BYTES)return {ok:false,error:'El flyer no puede pesar más de 5 MB.'};
  return {ok:true,opcional:false};
}

function extensionFlyerClase(tipo){
  return tipo==='image/png'?'png':tipo==='image/webp'?'webp':'jpg';
}

// El anuncio tiene que existir primero: así la RLS puede comprobar tanto la
// carpeta del usuario como el borrador al que pertenece. Nunca se conserva el
// nombre original del archivo.
async function subirFlyerClase(anuncioId,file){
  const valido=validarFlyerClase(file);
  if(!valido.ok)return {ok:false,error:valido.error};
  if(valido.opcional)return {ok:true,path:null};
  if(!supabaseClient||!currentUser||!anuncioId)return {ok:false,error:'Primero guarda el borrador del anuncio.'};
  const id=String(anuncioId).trim(),uid=String(currentUser.id||'').trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!/^[0-9a-f-]{36}$/i.test(uid))return {ok:false,error:'No pudimos identificar el borrador.'};
  const {data:anuncio,error:lecturaError}=await supabaseClient.from('tutor_anuncios')
    .select('flyer_path,estado').eq('id',id).single();
  if(lecturaError||!anuncio)return {ok:false,error:'No encontramos tu borrador. Vuelve a abrirlo antes de subir el flyer.'};
  if(anuncio.estado!=='borrador')return {ok:false,error:'Vuelve el anuncio a borrador antes de cambiar su flyer.'};
  const aleatorio=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'';
  if(!aleatorio)return {ok:false,error:'Tu navegador no pudo preparar un nombre seguro para el flyer.'};
  const path=`${uid}/${id}/${aleatorio}.${extensionFlyerClase(file.type)}`;
  const {error:subidaError}=await supabaseClient.storage.from('tutor-flyers').upload(path,file,{contentType:file.type,upsert:false});
  if(subidaError)return {ok:false,error:subidaError.message||'No pudimos subir el flyer.'};
  const {data:guardado,error:anuncioError}=await supabaseClient.from('tutor_anuncios')
    .update({flyer_path:path}).eq('id',id).eq('estado','borrador')
    .select('flyer_path').single();
  if(anuncioError||!guardado||guardado.flyer_path!==path){
    await supabaseClient.storage.from('tutor-flyers').remove([path]);
    return {ok:false,error:'El flyer subió, pero no pudimos unirlo al borrador. Intenta de nuevo.'};
  }
  const anterior=String(anuncio.flyer_path||'').trim();
  if(anterior&&anterior!==path)await supabaseClient.storage.from('tutor-flyers').remove([anterior]);
  return {ok:true,path};
}

async function urlFlyerClase(path){
  const limpio=String(path||'').trim();
  if(!supabaseClient||!limpio||limpio.includes('..')||!limpio.includes('/'))return '';
  // Las URLs firmadas no son revocables en el acto: se limitan a un minuto.
  const {data,error}=await supabaseClient.storage.from('tutor-flyers').createSignedUrl(limpio,60);
  if(error)return '';
  return String(data&&data.signedUrl||'');
}

async function quitarFlyerClase(anuncioId){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para editar el flyer.'};
  const abierto=await abrirBorradorClase(anuncioId);
  if(!abierto.ok)return abierto;
  if(!abierto.anuncio)return {ok:false,error:'Vuelve el anuncio a borrador antes de quitar el flyer.'};
  const anterior=abierto.anuncio.flyer_path;
  if(!anterior)return {ok:true};
  try{
    const {data,error}=await supabaseClient.from('tutor_anuncios').update({flyer_path:null})
      .eq('id',anuncioId).eq('estado','borrador').select('id,flyer_path').single();
    if(error||!data||data.flyer_path!==null)return {ok:false,error:'No pudimos quitar el flyer. Intenta de nuevo.'};
    // El anuncio ya no lo muestra aunque falle la limpieza de Storage.
    try{
      const {error:borradoError}=await supabaseClient.storage.from('tutor-flyers').remove([anterior]);
      return borradoError?{ok:true,aviso:'Flyer quitado del anuncio; quedó una copia privada por limpiar.'}:{ok:true};
    }catch(e){return {ok:true,aviso:'Flyer quitado del anuncio; quedó una copia privada por limpiar.'};}
  }catch(e){return {ok:false,error:'No pudimos quitar el flyer. Intenta de nuevo.'};}
}

// ─── LOGO DEL PROFESOR ──────────────────────────────────────────────────────
//
// Uno por profesor, en todos sus anuncios. Desde el 2026-09-25 se muestra al
// tiro, sin revisión (lo resuelve un trigger en el servidor). El estado "en
// revisión" se mantiene por si se vuelve a revisar, o si el SQL no está al día.
// Mismas reglas de archivo que el flyer: JPG, PNG o WebP ≤ 5 MB.
function estadoLogoProfesor(perfil){
  if(!perfil||!('logo_id' in perfil))return 'no-disponible';
  if(perfil.logo_path&&perfil.logo_path!==perfil.logo_aprobado_path)return 'en-revision';
  return perfil.logo_aprobado_path?'aprobado':'sin-logo';
}

// Logos sin fondo. Un PNG o WebP transparente se muestra tal cual, sin marco.
// El riesgo es el contraste: un logo verde oscuro sin fondo desaparece en el
// tema oscuro. Al cargar se mira la imagen en chico y, solo si es transparente
// y no se leería sobre el fondo que tiene detrás, se le dibuja un contorno
// claro: sigue sin fondo, como lo subió el profesor.
// Un logo con fondo propio (un JPG) no se toca.
function imgLogoClase(url,extra=''){
  return `<img class="logo-clase" src="${esc(url)}" alt="" crossorigin="anonymous"${extra}>`;
}
function luminanciaClase(r,g,b){
  const c=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);};
  return .2126*c(r)+.7152*c(g)+.0722*c(b);
}
// El color de fondo real detrás del logo: el primer antepasado que no es
// transparente. Chrome devuelve color-mix() como color(srgb …), en 0–1.
function fondoDetrasClase(el){
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
    const bg=String(getComputedStyle(n).backgroundColor||'');
    const nums=(bg.match(/-?[\d.]+/g)||[]).map(Number);
    if(nums.length<3)continue;
    const srgb=/^color\(/.test(bg),alfa=nums.length>3?nums[3]:1;
    if(alfa<.5)continue;
    const [r,g,b]=srgb?nums.slice(0,3).map(v=>v*255):nums.slice(0,3);
    return luminanciaClase(r,g,b);
  }
  return 1;
}
function revisarLogoClase(img){
  const caja=img.parentElement;
  if(!caja||!img.naturalWidth)return;
  // Primero el margen transparente: si se recorta, el logo vuelve a cargar y
  // esta función corre de nuevo con la imagen ya recortada.
  try{if(recortarMargenLogoClase(img))return;}catch(e){}
  if(img.dataset.contorno==='1')return;
  // Un logo casi cuadrado o redondo, a la misma altura que uno ancho, queda
  // chico y su texto ilegible (TuApunte, 2026-10-25): se le da más alto.
  if(caja.classList)caja.classList.toggle('logo-cuadrado',img.naturalWidth/img.naturalHeight<1.4);
  let px;
  try{
    const lado=24,canvas=document.createElement('canvas');canvas.width=canvas.height=lado;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,lado,lado);px=ctx.getImageData(0,0,lado,lado).data;
  }catch(e){return;}
  let transparentes=0,suma=0,visibles=0;
  for(let k=0;k<px.length;k+=4){
    if(px[k+3]<200){transparentes++;continue;}
    suma+=luminanciaClase(px[k],px[k+1],px[k+2]);visibles++;
  }
  caja.classList.remove('logo-contorno');
  if(!visibles||transparentes/(px.length/4)<.1)return;
  const logo=suma/visibles,fondo=fondoDetrasClase(caja);
  if((Math.max(logo,fondo)+.05)/(Math.min(logo,fondo)+.05)<2)dibujarContornoLogoClase(img,caja);
}
// Se prepara una vez, a la resolución original (sin achicar nada; después el
// navegador escala la imagen como cualquier otra). Dos arreglos (TuApunte,
// 2026-10-25: un círculo dentro de un PNG de 1080×1350, con las letras
// caladas):
// - El margen transparente se recorta: si no, el logo ocupa dos tercios de su
//   espacio y se ve chico.
// - Si el logo es una insignia (un círculo o un cuadrado lleno), sus huecos se
//   rellenan de blanco. Las letras caladas se diseñaron sobre blanco: en el
//   tema oscuro dejaban ver el fondo y desaparecían. Un logo de solo letras no
//   se toca: el interior de su «o» no es un hueco de insignia.
function recortarMargenLogoClase(img){
  if(img.dataset.recorte)return false;
  img.dataset.recorte='1';
  const W=img.naturalWidth,H=img.naturalHeight,esc=128/Math.max(W,H);
  const sw=Math.max(1,Math.round(W*esc)),sh=Math.max(1,Math.round(H*esc));
  const c=document.createElement('canvas');c.width=sw;c.height=sh;
  const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,sw,sh);
  const d=x.getImageData(0,0,sw,sh).data;
  let x0=sw,y0=sh,x1=-1,y1=-1;
  for(let y=0;y<sh;y++)for(let i=0;i<sw;i++)if(d[(y*sw+i)*4+3]>8){if(i<x0)x0=i;if(i>x1)x1=i;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)return false;
  // A píxeles originales, con un píxel de muestra de holgura por lado.
  const ox=Math.max(0,Math.floor((x0-1)/esc)),oy=Math.max(0,Math.floor((y0-1)/esc));
  let ow=Math.min(W,Math.ceil((x1+2)/esc))-ox,oh=Math.min(H,Math.ceil((y1+2)/esc))-oy;
  const recorta=ow*oh<=W*H*.85;
  // Un logo enorme se trabaja a 1200 px como máximo, bajando de a la mitad.
  const tope=Math.min(1,1200/Math.max(ow,oh)),fw=Math.max(1,Math.round(ow*tope)),fh=Math.max(1,Math.round(oh*tope));
  const recorte=document.createElement('canvas');recorte.width=ow;recorte.height=oh;
  recorte.getContext('2d').drawImage(img,ox,oy,ow,oh,0,0,ow,oh);
  const r=tope<1?reducirImagenClase({naturalWidth:ow,naturalHeight:oh,_c:recorte},fw,fh):recorte;
  const rellena=rellenarHuecosInsigniaClase(r);
  if(!recorta&&!rellena)return false;
  img.src=r.toDataURL('image/png');
  return true;
}
// Lo transparente que toca el borde es el exterior; lo transparente encerrado
// es un hueco. Solo si lo encerrado por la silueta ocupa al menos el 60% del
// recuadro (un círculo ocupa el 78%) es una insignia y se rellena.
function rellenarHuecosInsigniaClase(canvas){
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true});
  const im=ctx.getImageData(0,0,w,h),d=im.data,n=w*h;
  const fuera=new Uint8Array(n),cola=new Int32Array(n);let ini=0,fin=0;
  const mirar=p=>{if(!fuera[p]&&d[p*4+3]<250){fuera[p]=1;cola[fin++]=p;}};
  for(let i=0;i<w;i++){mirar(i);mirar((h-1)*w+i);}
  for(let y=0;y<h;y++){mirar(y*w);mirar(y*w+w-1);}
  while(ini<fin){
    const p=cola[ini++],px=p%w;
    if(px>0)mirar(p-1);if(px<w-1)mirar(p+1);if(p>=w)mirar(p-w);if(p<n-w)mirar(p+w);
  }
  let dentro=0,huecos=0;
  for(let p=0;p<n;p++)if(!fuera[p]){dentro++;if(d[p*4+3]<250)huecos++;}
  if(!huecos||dentro<n*.6)return false;
  for(let p=0;p<n;p++){
    if(fuera[p])continue;
    const k=p*4,a=d[k+3]/255;
    if(a>=1)continue;
    d[k]=Math.round(d[k]*a+255*(1-a));d[k+1]=Math.round(d[k+1]*a+255*(1-a));d[k+2]=Math.round(d[k+2]*a+255*(1-a));d[k+3]=255;
  }
  ctx.putImageData(im,0,0);
  return true;
}
// Safari achica una imagen grande en un canvas de una vez y sin suavizado;
// bajando de a la mitad cada paso promedia bien. Se usa para la silueta.
function reducirImagenClase(img,w,h){
  let fuente=img._c||img,fw=img.naturalWidth,fh=img.naturalHeight;
  while(fw/2>=w*1.5&&fh/2>=h*1.5){
    const paso=document.createElement('canvas');paso.width=Math.round(fw/2);paso.height=Math.round(fh/2);
    const cp=paso.getContext('2d');cp.imageSmoothingEnabled=true;cp.imageSmoothingQuality='high';
    cp.drawImage(fuente,0,0,paso.width,paso.height);fuente=paso;fw=paso.width;fh=paso.height;
  }
  const out=document.createElement('canvas');out.width=w;out.height=h;
  const co=out.getContext('2d');co.imageSmoothingEnabled=true;co.imageSmoothingQuality='high';
  co.drawImage(fuente,0,0,w,h);
  return out;
}
// El contorno va en una capa aparte, detrás del logo. Antes el logo se
// redibujaba dentro del canvas del contorno, y Safari al achicarlo borraba
// las letras finas (TuApunte en iPhone, 2026-10-25). Ahora el logo es la
// imagen original, que el navegador escala bien, y el canvas solo lleva el
// borde fino del color del texto y un halo suave. Antes era un `filter:
// drop-shadow`, que Safari dibujaba como un halo borroso (2026-09-26).
function dibujarContornoLogoClase(img,caja){
  try{
    caja.querySelectorAll('.logo-clase-borde').forEach(b=>b.remove());
    const dpr=Math.min(3,Math.max(1,(typeof devicePixelRatio==='number'&&devicePixelRatio)||1));
    // El tamaño con que se ve el logo: object-fit: contain dentro de su caja.
    const bw=img.clientWidth||caja.clientWidth||44,bh=img.clientHeight||caja.clientHeight||44;
    const k=Math.min(bw/img.naturalWidth,bh/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*k*dpr)),h=Math.max(1,Math.round(img.naturalHeight*k*dpr));
    const borde=1.2*dpr,halo=3.5*dpr,pad=Math.ceil(halo+1);
    const color=String(getComputedStyle(caja).getPropertyValue('--fg')||'').trim()||'#f1f1f3';
    // La silueta del logo en el color del texto.
    const sil=document.createElement('canvas');sil.width=w;sil.height=h;
    const cs=sil.getContext('2d');cs.drawImage(reducirImagenClase(img,w,h),0,0);
    cs.globalCompositeOperation='source-in';cs.fillStyle=color;cs.fillRect(0,0,w,h);
    const out=document.createElement('canvas');out.width=w+2*pad;out.height=h+2*pad;
    const co=out.getContext('2d');
    // Halo suave: la silueta corrida en un anillo ancho, casi transparente.
    co.globalAlpha=.07;
    for(let n=0;n<24;n++){const a=n/24*2*Math.PI;co.drawImage(sil,pad+Math.cos(a)*halo,pad+Math.sin(a)*halo);}
    // Borde fino y opaco.
    co.globalAlpha=1;
    for(let n=0;n<16;n++){const a=n/16*2*Math.PI;co.drawImage(sil,pad+Math.cos(a)*borde,pad+Math.sin(a)*borde);}
    // Debajo del logo no queda nada: solo el anillo de afuera.
    co.globalCompositeOperation='destination-out';co.drawImage(sil,pad,pad);
    const capa=document.createElement('img');
    capa.className='logo-clase-borde';capa.alt='';capa.setAttribute('aria-hidden','true');
    capa.src=out.toDataURL('image/png');
    capa.style.width=out.width/dpr+'px';capa.style.height=out.height/dpr+'px';
    capa.style.left=img.offsetLeft+img.offsetWidth/2+'px';capa.style.top=img.offsetTop+img.offsetHeight/2+'px';
    caja.insertBefore(capa,img);
    img.dataset.contorno='1';
    caja.classList.add('logo-contorno');
  }catch(e){}
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  // load y error no burbujean: se escuchan en captura para todos los logos.
  document.addEventListener('load',e=>{
    const img=e.target;if(img&&img.classList&&img.classList.contains('logo-clase'))revisarLogoClase(img);
  },true);
  // Si el almacenamiento no respondiera con CORS, la imagen se carga igual,
  // sin revisión de contraste: nunca un logo roto por esto.
  document.addEventListener('error',e=>{
    const img=e.target;
    if(img&&img.classList&&img.classList.contains('logo-clase')&&img.hasAttribute('crossorigin')){const src=img.src;img.removeAttribute('crossorigin');img.src=src;}
  },true);
}

async function subirLogoProfesor(file){
  const valido=validarFlyerClase(file);
  if(!valido.ok)return {ok:false,error:valido.error.replace(/flyer/gi,'logo')};
  if(valido.opcional)return {ok:false,error:'Elige una imagen para tu logo.'};
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para subir tu logo.'};
  const ficha=await perfilProfesorActual();
  if(!ficha.ok||!ficha.perfil)return {ok:false,error:'No pudimos leer tu ficha de profesor.'};
  const logoId=String(ficha.perfil.logo_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(logoId))return {ok:false,error:'Los logos todavía no están disponibles.'};
  const aleatorio=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'';
  if(!aleatorio)return {ok:false,error:'Tu navegador no pudo preparar un nombre seguro para el logo.'};
  const path=`logos/${logoId}/${aleatorio}.${extensionFlyerClase(file.type)}`;
  try{
    const {error:subidaError}=await supabaseClient.storage.from('tutor-flyers').upload(path,file,{contentType:file.type,upsert:false});
    if(subidaError)return {ok:false,error:'No pudimos subir el logo. Intenta de nuevo.'};
    const {data,error}=await supabaseClient.from('tutor_perfiles').update({logo_path:path})
      .eq('user_id',uid).select('logo_path,logo_aprobado_path').single();
    if(error||!data||data.logo_path!==path){
      await supabaseClient.storage.from('tutor-flyers').remove([path]);
      return {ok:false,error:'El logo subió, pero no pudimos guardarlo en tu ficha. Intenta de nuevo.'};
    }
    // Lo que ya no se muestra sobra. Sin revisión el servidor iguala las dos
    // columnas al tiro, así que el logo anterior también se va. Si algún día
    // se vuelve a revisar, el que se sigue mostrando se conserva.
    const enUso=new Set([path,data.logo_aprobado_path].filter(Boolean));
    const sobran=[...new Set([ficha.perfil.logo_path,ficha.perfil.logo_aprobado_path].filter(r=>r&&!enUso.has(r)))];
    if(sobran.length)try{await supabaseClient.storage.from('tutor-flyers').remove(sobran);}catch(e){}
    return {ok:true,perfil:{...ficha.perfil,...data}};
  }catch(e){return {ok:false,error:'No pudimos subir el logo. Intenta de nuevo.'};}
}

async function quitarLogoProfesor(){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para quitar tu logo.'};
  const ficha=await perfilProfesorActual();
  if(!ficha.ok||!ficha.perfil)return {ok:false,error:'No pudimos leer tu ficha de profesor.'};
  try{
    const {error}=await supabaseClient.rpc('quitar_mi_logo');
    if(error)return {ok:false,error:'No pudimos quitar el logo. Intenta de nuevo.'};
    // Ya no se muestra en ninguna parte aunque falle la limpieza de Storage.
    const rutas=[ficha.perfil.logo_path,ficha.perfil.logo_aprobado_path].filter(Boolean);
    if(rutas.length)try{await supabaseClient.storage.from('tutor-flyers').remove([...new Set(rutas)]);}catch(e){}
    return {ok:true};
  }catch(e){return {ok:false,error:'No pudimos quitar el logo. Intenta de nuevo.'};}
}

// Logos aprobados de los anuncios del catálogo, por id de anuncio. El
// catálogo no conoce al autor de cada anuncio y no tiene por qué conocerlo.
async function logosDeAnuncios(ids){
  const lista=[...new Set((ids||[]).filter(id=>/^[0-9a-f-]{36}$/i.test(String(id))))].slice(0,100);
  if(!supabaseClient||!lista.length)return new Map();
  try{
    const {data,error}=await supabaseClient.rpc('logos_de_anuncios',{p_ids:lista});
    if(error||!Array.isArray(data))return new Map();
    return new Map(data.filter(f=>f&&f.anuncio_id&&f.logo_path).map(f=>[f.anuncio_id,f.logo_path]));
  }catch(e){return new Map();}
}

function siglaAnuncio(sigla){
  return String(sigla||'').trim().toUpperCase();
}

function siglaRamoParaClases(ramo){
  const origen=ramo&&ramo.origen;
  if(!origen||!origen.tenant)return '';
  // La app ya sella siglas al cargar el catálogo, incluidas UAI y UAndes.
  // Los ramos antiguos recurren al mismo resolutor que la ficha, sin inferir
  // que cualquier ramoKey sea una sigla (en FEN suele ser un nombre).
  return siglaAnuncio(ramo.sigla||siglaDeRamo(ramo,origen.tenant));
}

// Recibe anuncios ya descargados y ramos que YA viven en el navegador. Esta
// operación no llama a Supabase ni envía notas o ramos para elegir el aviso.
function anunciosParaRamosLocales(anuncios,ramos){
  const porUniversidad=new Map();
  (Array.isArray(ramos)?ramos:[]).forEach(r=>{
    const sigla=siglaRamoParaClases(r),tenant=r&&r.origen&&r.origen.tenant;
    if(!sigla||!tenant)return;
    if(!porUniversidad.has(tenant))porUniversidad.set(tenant,new Set());
    porUniversidad.get(tenant).add(sigla);
  });
  return (Array.isArray(anuncios)?anuncios:[]).map(anuncio=>{
    const siglas=porUniversidad.get(anuncio&&anuncio.tenant);
    if(!siglas)return null;
    const coinciden=(Array.isArray(anuncio&&anuncio.ramos_siglas)?anuncio.ramos_siglas:[])
      .map(siglaAnuncio).filter(sigla=>siglas.has(sigla));
    return coinciden.length?{...anuncio,siglasCoincidentes:coinciden}:null;
  }).filter(Boolean);
}

// No hay una regla oculta por defecto: cada campaña declara su público.
// Un aviso antiguo sin criterios sigue en el catálogo general, pero no se
// personaliza hasta que el anunciante y el equipo acuerden ese público.
function criteriosClaseValidos(c){
  return !!c&&typeof c==='object'&&!Array.isArray(c)&&
    Object.keys(c).length===2&&Number.isFinite(c.promedioMenorA)&&
    c.promedioMenorA>1&&c.promedioMenorA<=7&&Number.isFinite(c.avanceMinimo)&&
    c.avanceMinimo>=0&&c.avanceMinimo<100;
}
// La próxima evaluación sin nota del ramo según su Agenda, si cae entre hoy y
// los próximos DIAS_ANTES_EVALUACION_CLASES días; si no, null. Misma regla
// que agendaEvents: una nota con fecha propia es su propia evaluación, y la
// fecha del grupo cuenta mientras le falten notas para sus casillas.
const DIAS_ANTES_EVALUACION_CLASES=7;
function proximaEvaluacionClases(ramo,ahora=Date.now()){
  const desde=diaLocalClases(ahora),hasta=diaLocalClases(ahora+DIAS_ANTES_EVALUACION_CLASES*864e5);
  const enVentana=f=>typeof f==='string'&&f>=desde&&f<=hasta;
  let proxima=null;
  const anotar=f=>{if(enVentana(f)&&(!proxima||f<proxima))proxima=f;};
  (ramo&&ramo.categorias||[]).forEach(c=>{
    if(typeof categoriaEximida==='function'&&categoriaEximida(ramo,c))return;
    const notas=c.notas||[];
    notas.forEach(n=>{if(n.fecha&&(n.valor===null||n.valor===undefined))anotar(n.fecha);});
    if(c.fecha&&notas.filter(n=>!n.fecha).length<(c.slots||1))anotar(c.fecha);
  });
  return proxima;
}

function seleccionarClaseApoyo(anuncios,ramos,tenant,{descartados=[],ahora=Date.now(),turno=0}={}){
  // Primero los ramos con una evaluación en los próximos días, la más cercana
  // antes (#664: con la prueba encima es cuando alguien escribe a un profesor).
  // Los demás quedan detrás en el orden que eligió la persona, así que quien no
  // tiene fechas en la Agenda ve lo mismo que antes.
  const propios=(Array.isArray(ramos)?ramos:[]).filter(r=>r&&r.origen&&r.origen.tenant===tenant)
    .map((r,i)=>({r,i,f:proximaEvaluacionClases(r,ahora)}))
    .sort((x,y)=>x.f&&y.f?(x.f<y.f?-1:x.f>y.f?1:x.i-y.i):x.f?-1:y.f?1:x.i-y.i)
    .map(x=>x.r);
  const omitidos=new Set(descartados);
  const disponibles=anunciosParaRamosLocales(anuncios,propios).filter(a=>
    a.tenant===tenant&&a.estado==='publicado'&&!omitidos.has(a.id)&&
    (a.vence_at==null||Date.parse(a.vence_at)>ahora)&&criteriosClaseValidos(a.criterios));
  // Después de la próxima evaluación, el orden de ramos que eligió la persona
  // manda. Si varios avisos calzan con
  // el mismo ramo, se alternan en cada apertura de la app: antes ganaba siempre
  // el publicado último, y un profesor con dos clases del mismo ramo casi no
  // veía la otra en Inicio (Salva Ramos, 2026-09-30). Se entrega como máximo
  // una tarjeta, sin escribir ninguna preferencia en S.
  for(const ramo of propios){
    const sigla=siglaRamoParaClases(ramo);
    const candidatos=disponibles.filter(a=>a.siglasCoincidentes.includes(sigla));
    if(!candidatos.length)continue;
    const cats=ramo.categorias||[];
    const total=cats.reduce((s,c)=>s+Number(c.peso||0),0);
    // Las evaluaciones del ramo suman 100 aunque tenga un laboratorio
    // vinculado: el motor combina ese `aporta` encima (Dinámica: 70% cátedra,
    // 30% laboratorio). Esperar 100 menos el laboratorio dejaba sin
    // recomendación a todo el que cursa Dinámica.
    if(!Number.isFinite(total)||Math.abs(total-100)>0.01||
      cats.some(c=>!Number.isFinite(Number(c.peso))||Number(c.peso)<0||c.lista))continue;
    const avance=ramoProgress(ramo);
    if(!Number.isFinite(avance.total)||avance.total<=0||!Number.isFinite(avance.pending)||avance.pending<=0)continue;
    // `pct` está redondeado para la pantalla: 19,9% no debe cumplir 20%.
    const evaluado=100*(avance.total-avance.pending)/avance.total;
    const promedio=ramoAvg(ramo,undefined,ramos);
    if(!Number.isFinite(promedio))continue;
    // Orden estable por id: la rotación no cambia porque llegue otro aviso a la lista.
    const calzan=candidatos.filter(a=>promedio<a.criterios.promedioMenorA&&evaluado+1e-9>=a.criterios.avanceMinimo)
      .sort((x,y)=>String(x.id)<String(y.id)?-1:String(x.id)>String(y.id)?1:0);
    if(calzan.length){
      const i=Number.isSafeInteger(turno)?((turno%calzan.length)+calzan.length)%calzan.length:0;
      return {anuncio:calzan[i],ramo};
    }
  }
  return null;
}

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
function validarCampanaClase(entrada,ahora=Date.now()){
  const e=entrada||{};
  const dias=Number(e.dias),tope=Number(e.tope_clp),inicio=String(e.inicio||'').trim();
  if(!Number.isSafeInteger(dias)||dias<1||dias>MAX_DIAS_CAMPANA)
    return {ok:false,campo:'dias',error:`La campaña dura entre 1 y ${MAX_DIAS_CAMPANA} días.`};
  if(inicio&&(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||!Number.isFinite(Date.parse(inicio+'T12:00:00Z'))))
    return {ok:false,campo:'inicio',error:'Revisa la fecha de inicio.'};
  if(inicio&&inicio<hoyChileClase(ahora))
    return {ok:false,campo:'inicio',error:'La fecha de inicio ya pasó. Déjala vacía para partir apenas la aprobemos.'};
  if(!Number.isSafeInteger(tope)||tope<MIN_TOPE_CAMPANA||tope>MAX_TOPE_CAMPANA)
    return {ok:false,campo:'tope',error:`Pon un tope entre ${pesosClase(MIN_TOPE_CAMPANA)} y ${pesosClase(MAX_TOPE_CAMPANA)}.`};
  return {ok:true,datos:{dias,inicio:inicio||null,tope_clp:tope}};
}

// La cuenta de una campaña, con cada concepto a la vista. `total` nunca pasa
// del tope: eso es lo que el profesor pagaría.
function costoCampanaClase(c){
  if(!c)return null;
  const n=k=>Number.isSafeInteger(c[k])&&c[k]>0?c[k]:0;
  const partes=[
    {clave:'vista',cantidad:n('vistas'),precio:TARIFA_CAMPANA.vista},
    {clave:'apertura',cantidad:n('aperturas'),precio:TARIFA_CAMPANA.apertura},
    {clave:'contacto',cantidad:n('contactos'),precio:TARIFA_CAMPANA.contacto},
    {clave:'dia',cantidad:n('dias_cobrados'),precio:TARIFA_CAMPANA.dia},
  ].map(p=>({...p,subtotal:p.cantidad*p.precio}));
  const bruto=partes.reduce((s,p)=>s+p.subtotal,0);
  const tope=Number.isSafeInteger(c.tope_clp)?c.tope_clp:null;
  return {partes,bruto,tope,total:tope===null?bruto:Math.min(bruto,tope),agotada:tope!==null&&bruto>=tope};
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

// ─── CATÁLOGO GENERAL PARA ESTUDIANTES ─────────────────────────────────────
//
// Esta puerta no es una recomendación: todos los estudiantes de la misma
// universidad reciben los mismos anuncios y el filtro trabaja sobre esa lista
// ya descargada. No lee S.ramos ni una nota para ordenar o esconder resultados.
function normalizarBusquedaClase(texto){
  return String(texto||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}

function nombresRamosParaClases(tenant){
  const nombres={};
  const agregar=(sigla,nombre)=>{
    const codigo=siglaAnuncio(sigla),rotulo=String(nombre||'').trim();
    if(codigo&&rotulo&&!nombres[codigo])nombres[codigo]=rotulo;
  };
  // Créditos y cursos UC son fuentes ya cargadas por la app. No se deduce una
  // sigla desde el texto: si GradeHub no conoce el par, el aviso sigue siendo
  // encontrable por su código y por el texto que escribió el profesor.
  const creditos=typeof CREDITOS_POR_TENANT!=='undefined'&&CREDITOS_POR_TENANT[tenant];
  if(creditos)Object.entries(creditos).forEach(([nombre,fila])=>agregar(fila&&fila[1],nombre));
  if(tenant==='uc'&&typeof cursosUcDisponibles==='function')
    cursosUcDisponibles().forEach(fila=>{if(Array.isArray(fila))agregar(fila[0],fila[1]);});
  if(tenant==='uc'&&typeof SIGLAS_UC!=='undefined')
    Object.values(SIGLAS_UC).forEach(tabla=>Object.entries(tabla||{}).forEach(([nombre,sigla])=>agregar(sigla,nombre)));
  return nombres;
}

function prepararCatalogoClases(anuncios,busqueda,nombresPorSigla={}, {ahora=Date.now()}={}){
  const consulta=normalizarBusquedaClase(busqueda),tokens=consulta.split(' ').filter(Boolean);
  return (Array.isArray(anuncios)?anuncios:[]).filter(a=>{
    if(!a||a.estado!=='publicado')return false;
    if(a.vence_at!=null){const vence=Date.parse(a.vence_at);if(!Number.isFinite(vence)||vence<=ahora)return false;}
    const siglas=(Array.isArray(a.ramos_siglas)?a.ramos_siglas:[]).map(siglaAnuncio).filter(Boolean);
    const nombres=siglas.map(s=>nombresPorSigla[s]).filter(Boolean);
    const texto=normalizarBusquedaClase([a.titulo,a.descripcion,...siglas,...nombres].join(' '));
    return !tokens.length||tokens.every(t=>texto.includes(t));
  }).map(a=>{
    const siglas=(Array.isArray(a.ramos_siglas)?a.ramos_siglas:[]).map(siglaAnuncio).filter(Boolean);
    return {...a,ramos_siglas:siglas,nombres_ramos:siglas.map(s=>nombresPorSigla[s]).filter(Boolean)};
  }).sort((a,b)=>{
    const sa=(a.ramos_siglas.slice().sort()[0]||'ZZZ'),sb=(b.ramos_siglas.slice().sort()[0]||'ZZZ');
    if(sa!==sb)return sa<sb?-1:1;
    const va=a.vence_at?Date.parse(a.vence_at):Infinity,vb=b.vence_at?Date.parse(b.vence_at):Infinity;
    if(va!==vb)return va-vb;
    return String(a.titulo||'').localeCompare(String(b.titulo||''),'es');
  });
}

// Los datos de contacto vienen de contenido revisado, pero igual se construyen
// con lista blanca. Nunca se copia una URL arbitraria a href.
function enlaceContactoClase(tipo,valor,mensaje=''){
  const canal=String(tipo||''),dato=String(valor||'').trim();
  if(canal==='whatsapp'){
    const telefono=dato.replace(/\D/g,'');
    if(telefono.length<8||telefono.length>15)return '';
    const texto=String(mensaje||'').trim();
    return `https://wa.me/${telefono}`+(texto?`?text=${encodeURIComponent(texto)}`:'');
  }
  if(canal==='instagram'){
    const usuario=dato.replace(/^@/,'');
    return /^[A-Za-z0-9._]{1,30}$/.test(usuario)?`https://www.instagram.com/${usuario}/`:'';
  }
  // Un link de inscripción (Google Forms, por ejemplo): solo https, sin usuario
  // ni contraseña dentro, y se arma de nuevo con URL para no copiar a href un
  // texto que el navegador interprete de otra forma.
  if(canal==='enlace'){
    let u;try{u=new URL(dato);}catch(e){return '';}
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||u.href.length>160)return '';
    return u.href;
  }
  if(canal==='email'){
    const correo=dato.toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))return '';
    // El `@` NO se codifica: es el separador del destinatario y el RFC 6068 no
    // lo admite escapado. `encodeURIComponent` lo convertía en %40, y con eso
    // hay clientes de correo que no abren el mensaje o lo abren sin destino —
    // justo el enlace del que depende todo el marketplace.
    //
    // Lo demás sí se codifica: un `?` o un `&` en la dirección los leería el
    // cliente como el inicio de los encabezados del mailto (asunto, cuerpo,
    // copia oculta), no como parte del correo.
    return `mailto:${encodeURIComponent(correo).replace(/%40/g,'@')}`;
  }
  return '';
}

function textoOpcionClase(lista,valor,otra){
  return valor==='otra'?String(otra||'').trim():(new Map(lista).get(valor)||'');
}
function formatoClase(anuncio){
  const a=anuncio||{};
  return [textoOpcionClase(MODALIDADES_CLASE,a.modalidad,a.modalidad_otra),textoOpcionClase(UBICACIONES_CLASE,a.ubicacion,a.ubicacion_otra)]
    .filter(Boolean).join(' · ');
}
// Los detalles que el profesor agregó, ya validados por el servidor. Se vuelven
// a filtrar al mostrarlos: una fila rara no rompe la tarjeta.
function detallesClase(anuncio){
  const d=anuncio&&anuncio.detalles;
  return Array.isArray(d)?d.filter(x=>x&&typeof x.etiqueta==='string'&&typeof x.valor==='string'&&x.etiqueta.trim()&&x.valor.trim())
    .slice(0,MAX_DETALLES_CLASE):[];
}
// El precio de la clase como lo lee el estudiante: $0 es "Gratis".
function esClaseGratis(anuncio){
  return !!anuncio&&anuncio.precio_clp!==null&&anuncio.precio_clp!==''&&Number(anuncio.precio_clp)===0;
}
// Pack y descuento. El precio guardado es SIEMPRE por clase: el pack solo lo
// multiplica, y el descuento por venir de GradeHub lo fija GradeHub al aprobar
// (el profesor no puede escribirlo). Nada de esto toca la medición ni la tarifa.
function preciosClase(a){
  const base=Number(a&&a.precio_clp);
  if(esClaseGratis(a))return {gratis:true};
  if(!a||a.precio_clp===null||a.precio_clp===''||!Number.isFinite(base)||base<=0)return {gratis:false,porClase:null};
  const n=Number.isInteger(a.pack_clases)&&a.pack_clases>=MIN_PACK_CLASES&&a.pack_clases<=MAX_PACK_CLASES?a.pack_clases:null;
  const d=Number.isInteger(a.descuento_gradehub_pct)&&a.descuento_gradehub_pct>=1&&a.descuento_gradehub_pct<=50?a.descuento_gradehub_pct:null;
  const conDescuento=x=>d?Math.round(x*(100-d)/100):x;
  return {gratis:false,pack:n,descuento:d,codigo:d?codigoDescuentoClase(a):null,porClase:base,porClaseFinal:conDescuento(base),
    packTotal:n?base*n:null,packFinal:n?conDescuento(base*n):null};
}
// El código que acompaña al descuento (2026-10-25). Lo fija un admin; acá
// se vuelve a validar porque termina en el texto del anuncio y del WhatsApp.
function codigoDescuentoClase(a){
  const c=a&&typeof a.codigo_descuento==='string'?a.codigo_descuento.trim().toUpperCase():'';
  return /^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(c)?c:null;
}
function textoDescuentoClase(p){
  return p.codigo?`−${p.descuento}% con el código ${p.codigo}`:`−${p.descuento}% por venir de GradeHub`;
}
// Corto, para la línea bajo el título: "4 clases · $11.250 c/u" o "$11.250".
// En un pack se lee el precio por clase y no el total (#664): en la primera
// campaña pagada, el pack de $45.000 casi no se abrió. El total sigue en la
// tarjeta del catálogo, con precioCatalogoHTML.
function precioClase(anuncio){
  const p=preciosClase(anuncio);
  if(p.gratis)return 'Gratis';
  if(p.porClase==null)return pesosClase(anuncio&&anuncio.precio_clp);
  return p.pack?`${p.pack} clases · ${pesosClase(p.porClaseFinal)} c/u`:pesosClase(p.porClaseFinal);
}
// El bloque de precio de la tarjeta. El precio anterior va tachado con texto
// oculto ("antes") para lectores de pantalla, y el descuento en el color de la
// marca: nunca en verde, que en GradeHub significa "aprobado".
function precioCatalogoHTML(a){
  const p=preciosClase(a);
  if(p.gratis)return '<strong>Gratis</strong>';
  if(p.porClase==null)return '';
  const antes=x=>p.descuento?`<del><span class="sr-precio">antes </span>${pesosClase(x)}</del> `:'';
  const chip=p.descuento?`<span class="catalogo-clase-descuento">${esc(textoDescuentoClase(p))}</span>`:'';
  // Un material se compra una vez: sin «por clase» ni pack.
  if(esMaterialClase(a))return `<div class="catalogo-clase-precio"><strong>${antes(p.porClase)}${pesosClase(p.porClaseFinal)}</strong>${chip}</div>`;
  if(p.pack)return `<div class="catalogo-clase-precio"><strong>${antes(p.packTotal)}${pesosClase(p.packFinal)} <small>pack de ${p.pack}</small></strong>${chip}<span class="catalogo-clase-por-clase">${antes(p.porClase)}${pesosClase(p.porClaseFinal)} por clase</span></div>`;
  return `<div class="catalogo-clase-precio"><strong>${antes(p.porClase)}${pesosClase(p.porClaseFinal)} <small>por clase</small></strong>${chip}</div>`;
}
function pesosClase(valor){
  // Nunca un precio negativo. El formulario ya exige entre 1.000 y 500.000, así
  // que un negativo solo puede venir de una fila corrupta o manipulada del
  // servidor — y ahí "$-500" en el catálogo es peor que no mostrar nada.
  const n=Number(valor);
  return new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0})
    .format(Number.isFinite(n)&&n>0?n:0);
}
// El chat parte escrito, para que el profesor sepa de qué anuncio viene. Nunca
// dice nada de las notas de quien escribe.
function mensajeContactoClase(anuncio){
  const titulo=String(anuncio&&anuncio.titulo||'').trim();
  const que=esMaterialClase(anuncio)?'tu material':'tu clase';
  // El código de descuento no va acá (Lucas, 2026-10-25): lo da el estudiante.
  return (titulo?`Hola, vi ${que} «${titulo}» en GradeHub.`:`Hola, vi ${que} en GradeHub.`)+' ¿Me puedes dar más información?';
}
function textoContactoClase(tipo,anuncio){
  if(tipo==='enlace'&&esMaterialClase(anuncio))return 'Conseguir el material';
  return {whatsapp:'Hablar por WhatsApp',instagram:'Ver Instagram',enlace:'Inscribirme',email:'Enviar correo'}[tipo]||'Contactar';
}

let catalogoClasesActual=[],nombresCatalogoClasesActual={};
// Una clase como la ve el estudiante. `sigla` es el ramo por el que se la
// mostramos, para que un contacto se mida en ese ramo.
// Cerrada muestra lo justo para decidir; "Ver clase" la abre (eso es una
// apertura) y recién ahí aparece el botón de WhatsApp (eso es un contacto).
function tarjetaCatalogoClase(a,{sigla,abierta=false}={}){
  const siglaMetrica=sigla||a.ramos_siglas[0]||'';
    const contacto=enlaceContactoClase(a.contacto_tipo,a.contacto_valor,mensajeContactoClase(a));
    const siglas=a.ramos_siglas.join(' · '),nombres=[...new Set((a.nombres_ramos||[]).map(nombreBaseRamoClase).filter(Boolean))].join(' · ');
    // El flyer va como tarjeta aparte, bajo el anuncio y entero: metido al lado
    // del texto se recortaba y en celular no se veía nada. Aparece al abrir la
    // clase, así el catálogo cerrado no se alarga.
    return `<div class="catalogo-clase-bloque"><article class="catalogo-clase-card" data-catalogo-anuncio="${esc(a.id)}">
      <div class="catalogo-clase-contenido">
        <div class="catalogo-clase-cabeza"><div><small>Publicidad · ${etiquetaTipoClase(a)}</small>
        <h3>${esc(a.titulo||etiquetaTipoClase(a))}</h3></div>${logosCatalogoClases.get(a.id)?`<div class="catalogo-clase-logo" data-logo="${esc(logosCatalogoClases.get(a.id))}"></div>`:''}</div>
        <p class="catalogo-clase-ramos"><strong>${esc(siglas)}</strong>${nombres?`<span>${esc(nombres)}</span>`:''}</p>
        <p class="catalogo-clase-descripcion">${esc(a.descripcion||'')}</p>
        <div class="catalogo-clase-datos"><span>${esc(formatoClase(a))}</span>${precioCatalogoHTML(a)}</div>
        ${abierta?'':`<button type="button" class="catalogo-clase-ver" data-abrir="${esc(a.id)}" data-sigla="${esc(siglaMetrica)}" aria-expanded="false">${esMaterialClase(a)?'Ver material':'Ver clase'}</button>`}
        <div class="catalogo-clase-mas"${abierta?'':' hidden'}>
        ${detallesClase(a).length?`<dl class="catalogo-clase-detalles">${detallesClase(a).map(d=>`<div><dt>${esc(d.etiqueta)}</dt><dd>${esc(d.valor)}</dd></div>`).join('')}</dl>`:''}
        ${contacto?`<a class="catalogo-clase-contacto" href="${esc(contacto)}" ${a.contacto_tipo==='email'?'':'target="_blank" rel="noopener noreferrer"'} data-contactar="${esc(a.id)}" data-sigla="${esc(siglaMetrica)}">${esc(textoContactoClase(a.contacto_tipo,a))}</a>`
          :'<p class="catalogo-clase-sin-contacto">El contacto de esta clase necesita revisión.</p>'}
        <div class="catalogo-clase-perfil" data-perfil="${esc(a.id)}"></div>
        </div>
      </div>
    </article>${a.flyer_path?`<figure class="catalogo-clase-flyer" data-flyer="${esc(a.flyer_path)}"${abierta?'':' hidden'}><span>Cargando flyer…</span></figure>`:''}</div>`;
}

// «Ver perfil» en una clase abierta. Solo existe si el profesor activó su
// perfil; si no, o si falla, la tarjeta queda igual que antes. Se despliega en
// la misma tarjeta: un modal encima reemplazaría el catálogo.
const perfilesDeAnuncio=new Map();
function perfilDeAnuncio(id){
  if(!perfilesDeAnuncio.has(id))perfilesDeAnuncio.set(id,(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('perfil_publico_de_anuncio',{p_anuncio_id:id});
      return error?null:(Array.isArray(data)?data[0]:data)||null;
    }catch(e){return null;}
  })());
  return perfilesDeAnuncio.get(id);
}
function perfilPublicoHTML(p,anuncioId){
  const tipo=(TIPOS_PERFIL.find(([v])=>v===p.tipo_perfil)||[])[1]||'';
  const unis=(p.universidades||[]).map(t=>(UNIVERSIDADES_PERFIL.find(([v])=>v===t)||[])[1]).filter(Boolean);
  const insta=enlaceContactoClase('instagram',p.instagram),web=enlaceContactoClase('enlace',p.sitio_web);
  const otros=(p.anuncios||[]).filter(id=>id!==anuncioId).map(id=>catalogoClasesActual.find(a=>a.id===id)).filter(Boolean);
  const sinTitulo=(p.anuncios||[]).filter(id=>id!==anuncioId).length-otros.length;
  return `<div class="perfil-publico-cabeza">${p.logo_path?`<div class="catalogo-clase-logo" data-logo="${esc(p.logo_path)}"></div>`:''}
      <div><h4>${esc(p.nombre_publico)}</h4>${tipo?`<span>${esc(tipo)}</span>`:''}</div></div>
    <p class="perfil-publico-texto">${esc(p.presentacion||'')}</p>
    ${unis.length||(p.ramos_siglas||[]).length?`<dl class="catalogo-clase-detalles">${unis.length?`<div><dt>Universidades</dt><dd>${esc(unis.join(', '))}</dd></div>`:''}${(p.ramos_siglas||[]).length?`<div><dt>Ramos</dt><dd>${esc(p.ramos_siglas.join(', '))}</dd></div>`:''}</dl>`:''}
    ${insta||web?`<p class="perfil-publico-links">${insta?`<a href="${esc(insta)}" target="_blank" rel="noopener noreferrer" data-fuera>Instagram</a>`:''}${web?`<a href="${esc(web)}" target="_blank" rel="noopener noreferrer" data-fuera>Sitio web</a>`:''}</p>`:''}
    ${otros.length||sinTitulo>0?`<div class="perfil-publico-otros"><strong>Sus otras clases</strong><ul>${otros.map(a=>`<li><button type="button" data-ir-anuncio="${esc(a.id)}">${esc(a.titulo||'Clase particular')} · ${esc(a.ramos_siglas.join(', '))}</button></li>`).join('')}${sinTitulo>0?`<li>${otros.length?'Y ':''}${sinTitulo} ${sinTitulo===1?'clase publicada más':'clases publicadas más'}</li>`:''}</ul></div>`:''}`;
}
async function mostrarPerfilEnClase(caja){
  if(caja.dataset.cargado)return;caja.dataset.cargado='1';
  const p=await perfilDeAnuncio(caja.dataset.perfil);
  if(!p||!caja.isConnected)return;
  caja.innerHTML=`<button type="button" class="catalogo-clase-ver perfil-publico-abrir" aria-expanded="false">Ver perfil de ${esc(p.nombre_publico)}</button>
    <section class="perfil-publico" aria-label="Perfil de ${esc(p.nombre_publico)}" hidden>${perfilPublicoHTML(p,caja.dataset.perfil)}</section>`;
  const boton=caja.querySelector('.perfil-publico-abrir'),seccion=caja.querySelector('.perfil-publico');
  boton.addEventListener('click',()=>{
    const abrir=seccion.hidden;seccion.hidden=!abrir;boton.setAttribute('aria-expanded',String(abrir));
    boton.textContent=abrir?'Ocultar perfil':'Ver perfil de '+p.nombre_publico;
    if(abrir&&typeof track==='function')track('perfil_profesor_abierto');
  });
  seccion.querySelectorAll('[data-logo]').forEach(async c=>{const url=await urlFlyerClase(c.dataset.logo);if(!c.isConnected)return;if(url)c.innerHTML=imgLogoClase(url,' loading="lazy"');else c.remove();});
  seccion.querySelectorAll('[data-fuera]').forEach(a=>a.addEventListener('click',e=>{
    if(typeof enAppNativa==='function'&&enAppNativa()&&abrirFuera(a.href))e.preventDefault();
  }));
  seccion.querySelectorAll('[data-ir-anuncio]').forEach(b=>b.addEventListener('click',()=>{
    const destino=document.querySelector(`[data-catalogo-anuncio="${CSS.escape(b.dataset.irAnuncio)}"]`);
    if(destino){destino.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      const ver=destino.querySelector('[data-abrir]');(ver||destino).focus&&(ver||destino).focus({preventScroll:true});}
  }));
}

// Filtros locales sobre el catálogo público; no modifican campañas ni medición.
function filtrarPrecioCatalogoClases(anuncios,{desde='',hasta='',gratis=false,ubicacion='',tipo='',invalido=false}={}){
  const minimo=desde===''?0:Number(desde),maximo=hasta===''?Infinity:Number(hasta);
  const error=!gratis&&(invalido||!Number.isSafeInteger(minimo)||minimo<0||
    !(maximo===Infinity||Number.isSafeInteger(maximo))||maximo<minimo);
  return {error,anuncios:error?[]:anuncios.filter(a=>{
    // Clase o material (2026-10-23). Un anuncio sin tipo es una clase.
    if(tipo&&(esMaterialClase(a)?'material':'clase')!==tipo)return false;
    // Una clase híbrida se dicta online y presencial: calza con los dos filtros.
    if(ubicacion&&a.ubicacion!==ubicacion&&a.ubicacion!=='hibrido')return false;
    if(gratis)return esClaseGratis(a);
    if(desde===''&&hasta==='')return true;
    // Se filtra por lo que paga el estudiante por clase, con el descuento aplicado.
    const precio=Number(preciosClase(a).porClaseFinal??a.precio_clp);
    return a.precio_clp!=null&&a.precio_clp!==''&&Number.isFinite(precio)&&precio>=minimo&&precio<=maximo;
  })};
}
function filtrosCatalogoClases(){
  const desde=document.getElementById('catalogo-desde'),hasta=document.getElementById('catalogo-hasta');
  return {desde:desde.value,hasta:hasta.value,gratis:document.getElementById('catalogo-gratis').checked,
    ubicacion:document.getElementById('catalogo-ubicacion').value,tipo:(document.getElementById('catalogo-tipo')||{}).value||'',
    invalido:desde.validity.badInput||hasta.validity.badInput};
}
function cabeceraCatalogoClasesHTML(){
  return `<div class="catalogo-clases catalogo-redisenado">
    <header class="catalogo-clases-head"><div><p class="catalogo-ceja">CLASES PARTICULARES</p><h1 class="modal-title" id="modal-titulo">Un poco de apoyo. Un gran avance.</h1><p class="catalogo-bajada">Encuentra una clase para ese ramo que necesita un empujón.</p></div><button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button></header>
    <div class="catalogo-herramientas"><div class="catalogo-buscador"><label for="catalogo-clases-buscar">Buscar clases</label>
    <div class="catalogo-clases-busqueda"><input id="catalogo-clases-buscar" type="search" autocomplete="off" placeholder="Busca por ramo o sigla" aria-describedby="catalogo-clases-estado"></div></div>
    <label class="catalogo-filtro">Qué buscas<select id="catalogo-tipo"><option value="">Todo</option>${TIPOS_ANUNCIO.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
    <label class="catalogo-filtro">Modalidad<select id="catalogo-ubicacion"><option value="">Todas</option><option value="online">Online</option><option value="presencial">Presencial</option></select></label>
    <div class="catalogo-precios" role="group" aria-label="Precio por clase en pesos">
      <label class="catalogo-filtro">Desde $<input id="catalogo-desde" type="number" min="0" step="1" inputmode="numeric" placeholder="Sin mínimo" aria-describedby="catalogo-precio-error"></label>
      <label class="catalogo-filtro">Hasta $<input id="catalogo-hasta" type="number" min="0" step="1" inputmode="numeric" placeholder="Sin máximo" aria-describedby="catalogo-precio-error"></label>
      <label class="catalogo-gratis"><input id="catalogo-gratis" type="checkbox">Solo gratis</label>
      <p id="catalogo-precio-error" role="status"></p>
    </div></div>
    <div class="catalogo-lista-cabeza"><h2>Clases en tu universidad</h2><button type="button" id="catalogo-limpiar">Limpiar filtros</button></div>
    <p class="catalogo-clases-estado" id="catalogo-clases-estado" role="status" aria-live="polite">Buscando clases publicadas…</p>
    <div class="catalogo-clases-resultados" id="catalogo-clases-resultados" aria-busy="true"></div>
    <p class="catalogo-privacidad">El catálogo no usa tus notas. Tú eliges qué clase explorar y a quién contactar.</p>
  </div>`;
}
let estadoCargaCatalogo='listo';
function renderCatalogoClases(busqueda=''){
  const raiz=document.getElementById('catalogo-clases-resultados');
  if(!raiz)return;
  const filtros=filtrosCatalogoClases();
  const {anuncios,error}=filtrarPrecioCatalogoClases(prepararCatalogoClases(catalogoClasesActual,busqueda,nombresCatalogoClasesActual),filtros);
  document.getElementById('catalogo-precio-error').textContent=error?'Escribe montos válidos; Hasta debe ser igual o mayor que Desde.':'';
  ['catalogo-desde','catalogo-hasta'].forEach(id=>{const campo=document.getElementById(id);campo.disabled=filtros.gratis;campo.setAttribute('aria-invalid',String(error));});
  const estado=document.getElementById('catalogo-clases-estado');
  if(estadoCargaCatalogo!=='listo'){
    estado.textContent=estadoCargaCatalogo==='cargando'?'Buscando clases publicadas…':'No pudimos cargar las clases. Revisa tu conexión e inténtalo de nuevo.';
    raiz.innerHTML=estadoCargaCatalogo==='error'?'<button type="button" class="catalogo-reintentar">Reintentar</button>':'';
    const reintentar=raiz.querySelector('.catalogo-reintentar');if(reintentar)reintentar.addEventListener('click',openCatalogoClases);
    return;
  }
  if(estado)estado.textContent=anuncios.length
    ?`${anuncios.length} ${(filtros.tipo==='material'?['material encontrado','materiales encontrados']
      :anuncios.some(esMaterialClase)?['resultado','resultados']:['clase encontrada','clases encontradas'])[anuncios.length===1?0:1]}`
    :(busqueda||filtros.desde||filtros.hasta||filtros.gratis||filtros.ubicacion||filtros.tipo?'No encontramos nada con esos filtros. Prueba ampliarlos.':'Todavía no hay clases publicadas en tu universidad.');
  raiz.innerHTML=anuncios.map(a=>tarjetaCatalogoClase(a)).join('');
  activarTarjetasClases(raiz);
  observarImpresionesClases(raiz,anuncios,busqueda);
}

// Contacto medido e imágenes firmadas de las tarjetas dentro de `raiz`. La
// usan el catálogo y la clase abierta desde la recomendación de Inicio.
function activarTarjetasClases(raiz){
  raiz.querySelectorAll('[data-contactar]').forEach(link=>link.addEventListener('click',async e=>{
    e.preventDefault();
    if(link.dataset.contactando==='true')return;
    link.dataset.contactando='true';link.setAttribute('aria-busy','true');
    // Abrir una pestaña vacía dentro del gesto del usuario evita el bloqueo
    // del navegador después del await. La cerramos si no se confirmó el cobro.
    // En la app iOS no hay pestaña que abrir: se abre al final con abrirFuera.
    const nativa=typeof enAppNativa==='function'&&enAppNativa();
    const ventana=!nativa&&link.target==='_blank'&&typeof window!=='undefined'&&typeof window.open==='function'
      ?window.open('about:blank','_blank'):null;
    if(ventana)ventana.opener=null;
    const cargo=await registrarInteraccionMedida(link.dataset.contactar,'contacto',link.dataset.sigla);
    link.dataset.contactando='false';link.removeAttribute('aria-busy');
    if(cargo===null){
      if(ventana&&!ventana.closed)ventana.close();
      showToast('No pudimos registrar el contacto. Revisa tu conexión e intenta de nuevo.',true);
      return;
    }
    if(ventana&&!ventana.closed)ventana.location.href=link.href;
    else if(!(nativa&&abrirFuera(link.href))&&typeof window!=='undefined')window.location.assign(link.href);
  }));
  raiz.querySelectorAll('[data-abrir]').forEach(boton=>boton.addEventListener('click',()=>{
    const tarjeta=boton.closest('.catalogo-clase-card'),mas=tarjeta&&tarjeta.querySelector('.catalogo-clase-mas');
    if(!mas)return;
    mas.hidden=false;boton.remove();
    const bloque=tarjeta.closest('.catalogo-clase-bloque'),flyer=bloque&&bloque.querySelector('.catalogo-clase-flyer');
    if(flyer)flyer.hidden=false;
    registrarInteraccionMedida(boton.dataset.abrir,'apertura',boton.dataset.sigla);
    const contacto=mas.querySelector('.catalogo-clase-contacto');if(contacto)contacto.focus();
    const perfil=mas.querySelector('[data-perfil]');if(perfil)mostrarPerfilEnClase(perfil);
  }));
  raiz.querySelectorAll('.catalogo-clase-mas:not([hidden]) [data-perfil]').forEach(mostrarPerfilEnClase);
  raiz.querySelectorAll('[data-logo]').forEach(async caja=>{
    const url=await urlFlyerClase(caja.dataset.logo);
    if(!caja.isConnected)return;
    if(url)caja.innerHTML=imgLogoClase(url,' loading="lazy"');else caja.remove();
  });
  raiz.querySelectorAll('[data-flyer]').forEach(async caja=>{
    const url=await urlFlyerClase(caja.dataset.flyer);
    if(!caja.isConnected)return;
    caja.innerHTML=url?`<img src="${esc(url)}" alt="" loading="lazy">`:'';
    if(!url)caja.remove();
  });
}

// Una impresión es una tarjeta que se VIO: al menos la mitad en pantalla
// durante un segundo, como dice docs/marketplace-clases.md. Pintarla fuera de
// la vista no cuenta. Se registra una vez por anuncio mientras el catálogo
// está abierto: buscar y volver a pintar no la suma de nuevo.
//
// Va a `anuncio_metricas`, que cuenta eventos y no factura. El alcance por
// catálogo —lo que sí se cobraría, a un precio menor que el segmentado— espera
// a que el servidor distinga por qué camino llegó cada cuenta.
const IMPRESION_VISIBLE=0.5,IMPRESION_MS=1000;
let impresionesCatalogo=new Set(),observadorCatalogo=null,logosCatalogoClases=new Map(),limpiarVisibilidadCatalogo=null;
function observarImpresionesClases(raiz,anuncios,busqueda=''){
  // Si la persona escribió algo, las tarjetas que ve son resultado de buscar.
  const canal=String(busqueda||'').trim()?'busqueda':'lista';
  if(limpiarVisibilidadCatalogo){limpiarVisibilidadCatalogo();limpiarVisibilidadCatalogo=null;}
  if(observadorCatalogo){observadorCatalogo.disconnect();observadorCatalogo=null;}
  if(typeof IntersectionObserver!=='function'||!raiz)return;
  const sigla=new Map((anuncios||[]).map(a=>[a.id,(a.ramos_siglas||[])[0]||'']));
  const timers=new Map(),visibles=new Set(),tarjetas=new Map();
  const programar=(card,id,demora=IMPRESION_MS)=>{
    if(timers.has(id))return;
    timers.set(id,setTimeout(async()=>{
      timers.delete(id);
      const clave=id+':'+canal;
      if(document.visibilityState==='hidden'||!card.isConnected||!visibles.has(id)||impresionesCatalogo.has(clave))return;
      const alcance=await registrarAlcanceAnuncio(id,canal);
      if(alcance===null){
        if(card.isConnected&&visibles.has(id))programar(card,id,5000);
        return;
      }
      const metrica=await registrarMetricaAnuncio(id,'impresion',sigla.get(id));
      if(metrica===null){
        if(card.isConnected&&visibles.has(id))programar(card,id,5000);
        return;
      }
      impresionesCatalogo.add(clave);
    },demora));
  };
  observadorCatalogo=new IntersectionObserver(entradas=>{
    for(const e of entradas){
      const id=e.target.dataset.catalogoAnuncio;
      if(!id)continue;
      if(e.isIntersecting&&e.intersectionRatio>=IMPRESION_VISIBLE){
        visibles.add(id);
        if(document.visibilityState!=='hidden'&&!impresionesCatalogo.has(id+':'+canal))programar(e.target,id);
      }else{
        visibles.delete(id);
        if(timers.has(id)){clearTimeout(timers.get(id));timers.delete(id);}
      }
    }
  },{threshold:[IMPRESION_VISIBLE]});
  const alCambiarVisibilidad=()=>{
    timers.forEach(clearTimeout);timers.clear();
    if(document.visibilityState==='hidden')return;
    visibles.forEach(id=>{const card=tarjetas.get(id);if(card&&card.isConnected&&!impresionesCatalogo.has(id+':'+canal))programar(card,id);});
  };
  if(document.addEventListener)document.addEventListener('visibilitychange',alCambiarVisibilidad);
  limpiarVisibilidadCatalogo=()=>{
    timers.forEach(clearTimeout);timers.clear();
    if(document.removeEventListener)document.removeEventListener('visibilitychange',alCambiarVisibilidad);
  };
  raiz.querySelectorAll('[data-catalogo-anuncio]').forEach(card=>{tarjetas.set(card.dataset.catalogoAnuncio,card);observadorCatalogo.observe(card);});
}

async function openCatalogoClases(){
  impresionesCatalogo=new Set();
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  estadoCargaCatalogo='cargando';catalogoClasesActual=[];nombresCatalogoClasesActual={};logosCatalogoClases=new Map();
  raiz.innerHTML=cabeceraCatalogoClasesHTML();
  openModal();
  const input=raiz.querySelector('#catalogo-clases-buscar');
  const sigueAbierto=()=>input.isConnected&&document.getElementById('catalogo-clases-buscar')===input&&
    document.getElementById('modal').classList.contains('open');
  input.addEventListener('input',()=>renderCatalogoClases(input.value));
  ['catalogo-desde','catalogo-hasta'].forEach(id=>raiz.querySelector('#'+id).addEventListener('input',()=>renderCatalogoClases(input.value)));
  ['catalogo-gratis','catalogo-ubicacion','catalogo-tipo'].forEach(id=>{const el=raiz.querySelector('#'+id);if(el)el.addEventListener('change',()=>renderCatalogoClases(input.value));});
  raiz.querySelector('#catalogo-limpiar').addEventListener('click',()=>{
    ['catalogo-desde','catalogo-hasta','catalogo-ubicacion','catalogo-tipo'].forEach(id=>{const el=raiz.querySelector('#'+id);if(el)el.value='';});
    raiz.querySelector('#catalogo-gratis').checked=false;input.value='';renderCatalogoClases();input.focus();
  });
  const tenant=S.tenant;
  // En UC los nombres del catálogo completo llegan diferidos. Los avisos y sus
  // siglas aparecen al tiro; cuando carga el archivo, se enriquece la búsqueda
  // por nombre sin volver a pedir anuncios ni tocar datos académicos.
  if(tenant==='uc'&&typeof cargarCursosUC==='function'&&typeof cursosUcExtra==='function'&&!cursosUcExtra())
    cargarCursosUC().then(ok=>{if(ok&&sigueAbierto()){nombresCatalogoClasesActual=nombresRamosParaClases(tenant);renderCatalogoClases(input.value);}}).catch(()=>{});
  let anuncios;
  try{anuncios=await cargarAnunciosClases(tenant,{propagarError:true});}
  catch(error){
    if(!sigueAbierto())return;
    estadoCargaCatalogo='error';raiz.querySelector('#catalogo-clases-resultados').setAttribute('aria-busy','false');renderCatalogoClases(input.value);return;
  }
  if(!sigueAbierto())return;
  catalogoClasesActual=anuncios;
  const logos=await logosDeAnuncios(anuncios.map(a=>a.id));
  if(!sigueAbierto())return;
  logosCatalogoClases=logos;estadoCargaCatalogo='listo';
  nombresCatalogoClasesActual=nombresRamosParaClases(tenant);
  const resultados=raiz.querySelector('#catalogo-clases-resultados');if(resultados)resultados.setAttribute('aria-busy','false');
  renderCatalogoClases(input.value);
  input.focus();
}

function payloadMetricaAnuncio(anuncioId,tipo,ramoSigla){
  const evento=String(tipo||'');
  const sigla=siglaAnuncio(ramoSigla);
  if(!METRICAS_ANUNCIO.has(evento)||!anuncioId||!sigla)return null;
  // Lista blanca deliberada. No se agrega user_id, ramos, notas ni device id:
  // auth.uid() autoriza dentro de la RPC y se descarta antes de escribir.
  return {p_anuncio_id:anuncioId,p_tipo:evento,p_ramo_sigla:sigla};
}

// Abrió la clase o tocó contactar: una vez por persona y anuncio, lo cuenta el
// servidor con la cuenta de la sesión. El Set solo ahorra llamadas repetidas.
const INTERACCION_REGISTRADA=new Set();
const INTERACCION_EN_CURSO=new Map();
function claveMedicionClase(anuncioId){
  const anuncio=catalogoClasesActual.find(a=>a.id===anuncioId)||
    (anunciosRecomendacion.lista||[]).find(a=>a.id===anuncioId);
  return (currentUser&&currentUser.id||'')+':'+anuncioId+':'+(anuncio&&anuncio.publicado_at||'');
}
async function registrarInteraccionAnuncio(anuncioId,tipo){
  const clave=claveMedicionClase(anuncioId)+':'+tipo;
  if(!supabaseClient||!currentUser||!anuncioId||!['apertura','contacto'].includes(tipo))return null;
  if(INTERACCION_REGISTRADA.has(clave))return false;
  if(INTERACCION_EN_CURSO.has(clave))return INTERACCION_EN_CURSO.get(clave);
  const pendiente=(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('registrar_interaccion_anuncio',{p_anuncio_id:anuncioId,p_tipo:tipo});
      if(error)throw error;
      INTERACCION_REGISTRADA.add(clave);
      return data===true;
    }catch(error){console.warn('No se pudo registrar la interacción:',error.message||error);return null;}
    finally{INTERACCION_EN_CURSO.delete(clave);}
  })();
  INTERACCION_EN_CURSO.set(clave,pendiente);
  return pendiente;
}
async function registrarMetricaAnuncio(anuncioId,tipo,ramoSigla){
  const payload=payloadMetricaAnuncio(anuncioId,tipo,ramoSigla);
  if(!supabaseClient||!currentUser||!payload)return false;
  try{
    const {data,error}=await supabaseClient.rpc('registrar_metrica_anuncio',payload);
    if(error)throw error;
    return data===true;
  }catch(error){console.warn('No se pudo registrar la métrica del anuncio:',error.message||error);return null;}
}

// El evento auxiliar se intenta solo después de confirmar la fila cobrable.
// Si falla esa segunda llamada, el servidor conserva la marca pendiente y
// este reintento no puede inflar el gráfico aunque se repita.
async function registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos=2}={}){
  const usuario=currentUser&&currentUser.id;
  const cargo=await registrarInteraccionAnuncio(anuncioId,tipo);
  if(cargo===null){
    // La apertura ya ocurrió en pantalla y su botón desapareció: reintentarla
    // sin pedir otro clic. Contacto sí requiere un nuevo gesto para navegar.
    if(tipo==='apertura'&&reintentos>0)setTimeout(()=>{
      if(currentUser&&currentUser.id===usuario)registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos:reintentos-1});
    },5000);
    return null;
  }
  const metrica=await registrarMetricaAnuncio(anuncioId,tipo==='apertura'?'clic':'contacto',sigla);
  if(metrica===null&&reintentos>0)setTimeout(()=>{
    if(currentUser&&currentUser.id===usuario)registrarInteraccionMedida(anuncioId,tipo,sigla,{reintentos:reintentos-1});
  },5000);
  return cargo;
}

// La RPC aplica el mínimo de quince EVENTOS en el servidor. Esta función no
// replica ni relaja el umbral: si no hay filas, simplemente no hay un corte
// seguro para mostrar todavía.
async function resumenMetricasAnuncio(anuncioId){
  if(!supabaseClient||!currentUser||!anuncioId)return [];
  const {data,error}=await supabaseClient.rpc('resumen_metricas_anuncio',{p_anuncio_id:anuncioId});
  if(error){console.warn('No se pudieron cargar las métricas del anuncio:',error.message||error);return [];}
  return Array.isArray(data)?data:[];
}

// ─── ALCANCE ÚNICO ──────────────────────────────────────────────────────────
//
// Lo que se cobra es cuántas CUENTAS DISTINTAS vieron un aviso. La llamada solo
// manda el id del aviso: la cuenta la pone el servidor con auth.uid() y la
// campaña ya la conoce. No viajan notas, ramos ni el criterio con que se eligió
// el aviso, así que la fila no dice nada de cómo le va a quien lo vio.
//
// El Set evita repetir la llamada dentro de la misma visita. No es la
// deduplicación: esa la hace la llave primaria en el servidor, que es la que
// cuenta para facturar. Acá solo se ahorra red.
// El canal dice por qué camino llegó la cuenta —recomendación, búsqueda o
// lista— porque cada uno se cobra distinto. Es una palabra: lo que la persona
// escribió en el buscador no viaja. El servidor guarda el camino más caro y
// nunca lo baja, así que mandar uno más barato después no descuenta nada.
const CANALES_ALCANCE=new Set(['recomendacion','busqueda','lista']);
const ALCANCE_REGISTRADO=new Set();
const ALCANCE_EN_CURSO=new Map();
async function registrarAlcanceAnuncio(anuncioId,canal='recomendacion'){
  const clave=claveMedicionClase(anuncioId)+':'+canal;
  if(!supabaseClient||!currentUser||!anuncioId||!CANALES_ALCANCE.has(canal)||ALCANCE_REGISTRADO.has(clave))return false;
  if(ALCANCE_EN_CURSO.has(clave))return ALCANCE_EN_CURSO.get(clave);
  const pendiente=(async()=>{
    try{
      const {data,error}=await supabaseClient.rpc('registrar_alcance_anuncio',{p_anuncio_id:anuncioId,p_canal:canal});
      if(error)throw error;
      // `false` es una exclusión o deduplicación real del servidor; también
      // queda resuelta. Solo un error de transporte se reintenta.
      ALCANCE_REGISTRADO.add(clave);
      return data===true;
    }catch(error){
      console.warn('No se pudo registrar el alcance del anuncio:',error.message||error);
      return null;
    }finally{ALCANCE_EN_CURSO.delete(clave);}
  })();
  ALCANCE_EN_CURSO.set(clave,pendiente);
  return pendiente;
}

// El total de la propia campaña. Devuelve null si no se pudo consultar, para no
// confundir "no sé" con "nadie lo vio" en una pantalla que habla de plata.
async function alcanceAnuncio(anuncioId){
  if(!supabaseClient||!currentUser||!anuncioId)return null;
  const {data,error}=await supabaseClient.rpc('alcance_anuncio',{p_anuncio_id:anuncioId});
  if(error){console.warn('No se pudo cargar el alcance del anuncio:',error.message||error);return null;}
  return Number.isInteger(data)?data:null;
}

// Espacio separado de las notas. El SQL es manual: si todavía no existe,
// esta puerta explica el fallo y no interviene en el arranque de GradeHub.
// El espacio de profesor vive en su propia PESTAÑA desde el 2026-09-21: armar un
// anuncio con su público y su cotización es una tarea de varios pasos y no cabe
// en una ventana. El cuerpo se separa del modal para que las dos entradas —la
// pestaña y el menú, mientras exista— pinten exactamente lo mismo.
async function renderProfesor(){
  const raiz=document.getElementById('profesor-body');
  if(!raiz)return;
  await renderEspacioProfesor(raiz,{titulo:false});
}
async function openEspacioProfesor(){
  const raiz=document.getElementById('modal-content');
  raiz.innerHTML='<div class="modal-title" id="modal-titulo">Espacio de profesor</div><p class="profesor-info" role="status">Revisando tu acceso…</p>';
  openModal();
  await renderEspacioProfesor(raiz,{titulo:true});
}
async function renderEspacioProfesor(raiz,{titulo=true}={}){
  const cabecera=t=>titulo?`<div class="modal-title" id="modal-titulo">${t}</div>`:'';
  // Toda pantalla que termina acá tiene que poder cerrarse. Desde que el modal
  // no se cierra ni arrastrándolo ni tocando fuera, una ventana sin botón deja a
  // la persona encerrada — y estas son de una sola línea, sin formulario ni
  // botones propios. En la pestaña no va: ahí no hay nada que cerrar.
  const salida=()=>titulo?'<div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>':'';
  raiz.innerHTML=cabecera('Espacio de profesor')+'<p class="profesor-info" role="status">Revisando tu acceso…</p>';
  const ficha=await perfilProfesorActual();
  if(!ficha.ok){raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="alert">${esc(ficha.error)}</p>`+salida();return;}
  if(!ficha.perfil){renderPostulacionProfesor(raiz);return;}
  if(ficha.perfil.estado==='pendiente'){
    const mios=await misAnunciosClase();
    const fecha=new Date(ficha.perfil.solicitado_at);
    const enviada=Number.isFinite(fecha.getTime())
      ?`Enviada el ${new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'}).format(fecha)}.`
      :'Fecha de envío no disponible.';
    const borradores=mios.ok?mios.anuncios.filter(a=>a.estado==='borrador'):[];
    raiz.innerHTML=cabecera('Espacio de profesor')+
      `<div class="profesor-hig"><section class="clases-seccion" aria-labelledby="profesor-postulacion-titulo"><h2 id="profesor-postulacion-titulo">Tu postulación</h2><p class="profesor-info" role="status">Está pendiente de revisión. ${esc(enviada)}</p><p class="profesor-info">Te avisaremos cuando esté aprobada. Mientras tanto, puedes preparar un anuncio y guardarlo como borrador.</p></section>`+
      `<section class="clases-seccion" aria-labelledby="profesor-borradores-titulo"><h2 id="profesor-borradores-titulo">Tu borrador</h2>`+
      (mios.ok
        ?borradores.length
          ?`<div class="clase-lista">${borradores.map(a=>`<div class="clase-card"><div class="clase-card-top"><strong>${esc(a.titulo||'Sin título')}</strong><span class="clase-estado">Borrador</span></div><p class="clase-card-meta">Nadie lo ve todavía.</p><button type="button" class="clase-accion" data-borrador-pendiente="${esc(a.id)}">Seguir preparando</button></div>`).join('')}</div>`
          :'<p class="profesor-info">Todavía no tienes un borrador.</p><button type="button" class="btn-confirm" id="clase-nueva-pendiente">Preparar anuncio</button>'
        :`<p class="profesor-info" role="alert">${esc(mios.error)}</p>`)+
      '</section></div>'+salida();
    const nueva=raiz.querySelector('#clase-nueva-pendiente');
    if(nueva)nueva.addEventListener('click',()=>renderBorradorProfesor(raiz,null,{pendiente:true}));
    if(typeof raiz.querySelectorAll==='function')raiz.querySelectorAll('[data-borrador-pendiente]').forEach(b=>b.addEventListener('click',()=>{
      const anuncio=borradores.find(a=>a.id===b.dataset.borradorPendiente);
      if(anuncio)renderBorradorProfesor(raiz,anuncio,{pendiente:true});
    }));
    return;
  }
  if(ficha.perfil.estado!=='aprobado'){
    const avisos={pendiente:'Tu postulación está esperando revisión. Todavía no puedes ofrecer clases.',rechazado:'Tu postulación no fue aprobada. Puedes escribirnos desde Sugerencias para revisar el motivo.',suspendido:'Tu acceso de profesor está suspendido. Tus notas como estudiante siguen disponibles.'};
    raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="status">${esc(avisos[ficha.perfil.estado]||'Tu perfil necesita revisión.')}</p>`+salida();
    return;
  }
  const mios=await misAnunciosClase();
  if(!mios.ok){raiz.innerHTML=cabecera('Espacio de profesor')+`<p class="profesor-info" role="alert">${esc(mios.error)}</p>`+salida();return;}
  await renderPanelProfesor(raiz,mios.anuncios,{cabecera,salida});
}

// La puerta desde Ajustes: solo la postulación, sin el espacio completo. Quien
// todavía no postula no tiene anuncios que mostrarle.
function postularComoProfesor(){
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  renderPostulacionProfesor(raiz);
  openModal();
}
function renderPostulacionProfesor(raiz){
  raiz.innerHTML=`<div class="modal-title" id="modal-titulo">Postula para ofrecer clases</div>
    <p class="profesor-info">Tu cuenta de estudiante sigue igual. Un miembro de nuestro equipo revisará tu postulación. Mientras esperas, podrás preparar un borrador de anuncio.</p>
    <form class="profesor-form" id="profesor-postular">
      <label class="modal-label" for="profesor-nombre">Nombre público</label><input id="profesor-nombre" type="text" maxlength="100" minlength="2" required autocomplete="name">
      <label class="modal-label" for="profesor-presentacion">Qué ramos enseñas y qué experiencia tienes</label><textarea id="profesor-presentacion" minlength="20" maxlength="1500" required></textarea>
      <p class="profesor-info">Nadie verá tus notas. Cada anuncio que prepares necesitará otra aprobación.</p>
      <div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cancelar</button><button class="btn-confirm" type="submit">Enviar postulación</button></div>
      <p class="profesor-estado" role="status" aria-live="polite"></p>
    </form>`;
  const form=raiz.querySelector('#profesor-postular'),estado=form.querySelector('.profesor-estado');
  let enviando=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(enviando)return;
    if(!form.reportValidity())return;
    enviando=true;
    const boton=form.querySelector('button');boton.disabled=true;estado.textContent='Enviando postulación…';
    const resultado=await postularProfesor(form.querySelector('#profesor-nombre').value,form.querySelector('#profesor-presentacion').value);
    if(resultado.ok){
      // El estado en memoria quedó viejo: sin esto Ajustes seguiría ofreciendo
      // postular a alguien que acaba de hacerlo.
      olvidarPerfilProfesor();
      if(typeof cargarPerfilProfesor==='function')cargarPerfilProfesor().then(()=>{
        if(typeof renderSettingsSiAbierto==='function')renderSettingsSiAbierto();
      }).catch(()=>{});
      raiz.innerHTML='<div class="modal-title" id="modal-titulo">Postulación enviada</div><p class="profesor-info" role="status">Quedó pendiente de revisión. Aún no puedes publicar clases. En Ajustes · Clases particulares puedes ver en qué va.</p><div class="modal-btns"><button type="button" class="btn-cancel" onclick="closeModal()">Cerrar</button></div>';
      return;
    }
    estado.textContent=resultado.error;boton.disabled=false;enviando=false;
    if(resultado.campo)form.querySelector(resultado.campo==='nombre'?'#profesor-nombre':'#profesor-presentacion').focus();
  });
}

// Compatibilidad mientras se aplica el SQL nuevo: la RLS deja leer propios y
// publicados, pero autor_id no es una columna pública. No usar este camino
// cuando ya existe la RPC paginada del profesor.
async function misAnunciosClaseLegado(){
    const {data,error}=await consultaCamposClase(campos=>supabaseClient.from('tutor_anuncios')
      .select(campos).order('created_at',{ascending:false}),CAMPOS_PUBLICOS_ANUNCIO);
    if(error)throw error;
    const todos=Array.isArray(data)?data:[];
    // Si no se puede confirmar un publicado, se falla entero en vez de
    // adivinar: mostrar uno ajeno o esconder uno propio serían los dos malos.
    const propio=await Promise.all(todos.map(async a=>{
      if(a.estado!=='publicado')return true;
      const r=await supabaseClient.rpc('anuncio_propio',{p_anuncio_id:a.id,p_editable:false});
      if(r.error)throw r.error;
      return r.data===true;
    }));
    return todos.filter((_,i)=>propio[i]);
}
async function misAnunciosClase(){
  if(!sesionProfesorClase())return {ok:false,error:'Inicia sesión para ver tus clases.'};
  try{
    const anuncios=[],tamano=60;
    for(let desde=0;;desde+=tamano){
      const {data,error}=await supabaseClient.rpc('mis_anuncios_profesor',{p_desde:desde,p_tamano:tamano});
      if(error){
        if(desde===0&&sqlClasesDesactualizado(error))return {ok:true,anuncios:await misAnunciosClaseLegado()};
        throw error;
      }
      const pagina=Array.isArray(data)?data:[];
      anuncios.push(...pagina);
      if(pagina.length<tamano)return {ok:true,anuncios};
    }
  }catch(e){return {ok:false,error:'No pudimos consultar tus clases. Intenta de nuevo.'};}
}

const ESTADOS_ANUNCIO={
  borrador:['Borrador','Nadie lo ve todavía.'],
  en_revision:['En revisión','No se publica hasta que lo aprobemos.'],
  publicado:['Publicado','Se está mostrando a tu público.'],
  programado:['Programado','Empieza el día que elegiste.'],
  pausado:['Pausado','Dejó de mostrarse.'],
  expirado:['Terminado','La campaña llegó a su fin.'],
  agotado:['Tope alcanzado','Dejó de mostrarse al llegar a tu tope.'],
  sin_confirmar:['Sin confirmar','No pudimos consultar el estado de la campaña. Vuelve a abrir tu espacio.'],
  eliminado:['Borrado','Se retiró de la revisión. Sus cobros anteriores siguen disponibles en administración.'],
};

// Lo que se cobra son PERSONAS DISTINTAS alcanzadas, así que ese es el número
// grande. Los cortes por día y tipo vienen del servidor solo cuando superan los
// quince eventos: por debajo no se devuelven, y decir "0 clics" ahí sería
// mentir. Con pocos datos se dice que son pocos, no que son cero.
// Solo un anuncio que ALCANZÓ a publicarse puede tener números. Un borrador o
// uno esperando aprobación no los vio nadie, y mostrarle "23 personas · va
// costando $49.000" a quien todavía espera el visto bueno es inventarle un
// gasto que no existe.
const ANUNCIO_YA_SE_MOSTRO=new Set(['publicado','pausado','expirado']);
// `porCanal` es null si el servidor todavía no separa caminos (SQL sin
// aplicar): ahí se usa el total de siempre y todo se cobra como segmentado,
// que es como se cotizaba antes. Nunca se inventa un reparto.
async function metricasDeAnuncio(anuncio){
  const salida={alcance:null,porCanal:null,cortes:[],agregados:null,campana:anuncio&&anuncio.campana||null,error:false};
  if(!anuncio||!ANUNCIO_YA_SE_MOSTRO.has(anuncio.estado))return salida;
  // La campaña: personas que vieron, abrieron y contactaron, y días cobrados.
  // Sin el SQL de campañas no hay costo que mostrar, y no se inventa.
  if(!salida.campana)try{
    const {data,error}=await supabaseClient.rpc('campana_anuncio',{p_anuncio_id:anuncio.id});
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    const fila=!error&&Array.isArray(data)?data[0]:null;
    if(fila&&['vistas','aperturas','contactos','dias_cobrados'].every(k=>Number.isInteger(fila[k])))salida.campana=fila;
  }catch(e){salida.error=true;}
  try{
    const {data,error}=await supabaseClient.rpc('alcance_anuncio_por_canal',{p_anuncio_id:anuncio.id});
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    if(!error&&Array.isArray(data)){
      const por={recomendacion:0,busqueda:0,lista:0};
      data.forEach(f=>{if(por[f.canal]!==undefined&&Number.isInteger(f.cuentas))por[f.canal]=f.cuentas;});
      salida.porCanal=por;salida.alcance=por.recomendacion+por.busqueda+por.lista;
    }
  }catch(e){salida.error=true;}
  if(salida.alcance===null)try{
    const {data,error}=await supabaseClient.rpc('alcance_anuncio',{p_anuncio_id:anuncio.id});
    if(error)salida.error=true;
    if(!error&&Number.isInteger(data))salida.alcance=data;
  }catch(e){salida.error=true;}
  try{
    const {data,error}=await supabaseClient.rpc('resumen_metricas_anuncio',{p_anuncio_id:anuncio.id});
    if(error)salida.error=true;
    if(!error&&Array.isArray(data))salida.cortes=data;
  }catch(e){salida.error=true;}
  // Totales por una dimensión a la vez, con el mismo umbral de quince. Si el
  // servidor todavía no tiene la función, se arman desde los cortes finos.
  try{
    const {data,error}=await supabaseClient.rpc('totales_metricas_anuncio',{p_anuncio_id:anuncio.id});
    if(error&&!sqlClasesDesactualizado(error))salida.error=true;
    if(!error&&Array.isArray(data))salida.agregados=agregadosDeFilas(data);
  }catch(e){salida.error=true;}
  if(!salida.agregados)salida.agregados=agregadosDeFilas([
    ...salida.cortes.map(c=>({vista:'dia',clave:c.dia,tipo:c.tipo,eventos:c.eventos})),
    ...salida.cortes.map(c=>({vista:'ramo',clave:c.ramo_sigla,tipo:c.tipo,eventos:c.eventos})),
    ...salida.cortes.map(c=>({vista:'total',clave:'',tipo:c.tipo,eventos:c.eventos}))]);
  return salida;
}

// {total:{impresion,clic,contacto}, dias:{'2026-09-25':{...}}, ramos:{MAT1620:{...}}}
function agregadosDeFilas(filas){
  const vacio=()=>({impresion:0,clic:0,contacto:0});
  const a={total:vacio(),dias:{},ramos:{}};
  for(const f of filas||[]){
    const n=Number(f.eventos)||0;
    if(!(f.tipo in a.total)||n<=0)continue;
    if(f.vista==='total')a.total[f.tipo]+=n;
    else if(f.vista==='dia'){(a.dias[f.clave]=a.dias[f.clave]||vacio())[f.tipo]+=n;}
    else if(f.vista==='ramo'){(a.ramos[f.clave]=a.ramos[f.clave]||vacio())[f.tipo]+=n;}
  }
  return a;
}

function totalesDeCortes(cortes){
  const por={impresion:0,clic:0,contacto:0};
  (cortes||[]).forEach(c=>{if(por[c.tipo]!==undefined)por[c.tipo]+=Number(c.eventos)||0;});
  return por;
}

// La RLS deja que el profesor lleve su aviso a borrador, a revisión o a pausa.
// NO lo deja publicar ni expirar: eso lo marca el equipo. O sea pausar es una
// puerta de una sola dirección para él, y hay que decírselo ANTES de que la
// cruce: para volver a mostrarse, el aviso pasa por revisión otra vez.
async function cambiarEstadoAnuncio(id,estado){
  const uid=sesionProfesorClase();
  if(!uid)return {ok:false,error:'Inicia sesión para administrar tus clases.'};
  if(!['borrador','en_revision','pausado'].includes(estado))return {ok:false,error:'Ese cambio no te corresponde a ti.'};
  try{
    const {data,error}=await consultaCamposClase(campos=>supabaseClient.from('tutor_anuncios')
      .update({estado}).eq('id',id).select(campos).single(),CAMPOS_PUBLICOS_ANUNCIO);
    if(error||!data)return {ok:false,error:'No pudimos cambiar el estado. Intenta de nuevo.'};
    return {ok:true,anuncio:data};
  }catch(e){return {ok:false,error:'No pudimos cambiar el estado. Intenta de nuevo.'};}
}

function pausarAnuncioClase(id,alTerminar){
  showConfirm('¿Pausar esta clase?',
    'Deja de mostrarse al tiro y no se te cobra por nadie más. Para volver a publicarla tiene que pasar por revisión de nuevo: no se reanuda sola.',
    async()=>{
      const r=await cambiarEstadoAnuncio(id,'pausado');
      showToast(r.ok?'Clase pausada':r.error,!r.ok);
      if(r.ok&&typeof alTerminar==='function')alTerminar();
    },{label:'Pausar',danger:false});
}

function retomarAnuncioClase(id,alTerminar){
  showConfirm('¿Volver a publicarla?',
    'Pasa a borrador para que la revises. Cuando la envíes, la revisamos antes de publicarla de nuevo.',
    async()=>{
      const r=await cambiarEstadoAnuncio(id,'borrador');
      showToast(r.ok?'Quedó como borrador':r.error,!r.ok);
      if(r.ok&&typeof alTerminar==='function')alTerminar(r.anuncio||null);
    },{label:'Seguir',danger:false});
}

// Un publicado cuya fecha ya pasó está TERMINADO aunque la fila todavía diga
// "publicado": nadie más lo ve —la RLS filtra por vence_at— y nada en el
// servidor le cambia el estado al vencer. Decirle "se está mostrando" sería
// mentirle sobre una campaña que ya cerró.
function vigenciaAnuncio(a,ahora=Date.now()){
  if(!a)return '';
  if(a.estado==='publicado'){
    const vence=Date.parse(a.vence_at||''),desde=Date.parse(a.publicado_at||'');
    if(Number.isFinite(vence)&&vence<=ahora)return 'expirado';
    if(Number.isFinite(desde)&&desde>ahora)return 'programado';
    if(a.campanaError)return 'sin_confirmar';
    if(a.campana&&costoCampanaClase(a.campana)?.agotada)return 'agotado';
    return 'publicado';
  }
  return a.estado;
}
// La página se ordena por lo que el profesor puede HACER con cada anuncio.
function gruposPanelClases(anuncios,ahora=Date.now()){
  const g={activos:[],programados:[],revision:[],borradores:[],cerrados:[],sinConfirmar:[]};
  for(const a of anuncios||[]){
    const e=vigenciaAnuncio(a,ahora);
    (e==='publicado'?g.activos:e==='programado'?g.programados:e==='en_revision'?g.revision:e==='borrador'?g.borradores:e==='sin_confirmar'?g.sinConfirmar:g.cerrados).push(a);
  }
  return g;
}
function diasRestantesAnuncio(a,ahora=Date.now()){
  const vence=Date.parse(a&&a.vence_at||'');
  return Number.isFinite(vence)?Math.max(0,Math.ceil((vence-ahora)/864e5)):null;
}
// Cuánto de la campaña ya pasó, entre 0 y 1, para el riel de vigencia.
function avanceCampanaAnuncio(a,ahora=Date.now()){
  const desde=Date.parse(a&&a.publicado_at||''),hasta=Date.parse(a&&a.vence_at||'');
  if(!Number.isFinite(desde)||!Number.isFinite(hasta)||hasta<=desde)return null;
  return Math.min(Math.max((ahora-desde)/(hasta-desde),0),1);
}

// Cada etapa con sus dos números juntos: cuántas personas distintas (lo que
// se cobra) y cuántas veces en total (una persona puede verla en la mañana y
// en la tarde). Separados en tarjetas sueltas no se entendía qué medía cada
// uno. Solo se pinta lo que se sabe: el servidor no devuelve cortes con menos
// de quince eventos, y "0 veces" ahí sería inventarlo.
function cifrasClase({alcance,totales,hayCortes,campana,costo},pesos,etiquetaPersonas='personas distintas'){
  const miles=n=>new Intl.NumberFormat('es-CL').format(n);
  const veces=n=>hayCortes&&n?n:null;
  // Con la campaña medida, las personas vienen de ahí: son exactas y son lo
  // que se cobra. Sin ella, el alcance de siempre, y abrir o contactar solo
  // se saben como veces.
  const etapas=[
    ['Se mostró',campana?campana.vistas:alcance,veces(totales.impresion),true],
    ['La abrieron',campana?campana.aperturas:null,veces(totales.clic),false],
    ['Te contactaron',campana?campana.contactos:null,veces(totales.contacto),false]];
  const mitad=(v,d)=>`<div><b>${v}</b><small>${d}</small></div>`;
  const html=etapas.filter(([,p,v,siempre])=>siempre||p!==null&&p!==undefined||v!==null).map(([t,p,v])=>
    `<div class="clase-etapa"><span>${t}</span><div class="clase-par">${
      [p!==null&&p!==undefined?mitad(miles(p),etiquetaPersonas):campana||!v?mitad('—',etiquetaPersonas):'',
       v!==null?mitad(miles(v),'veces en total'):''].filter(Boolean).join('<i class="clase-par-sep" aria-hidden="true">/</i>')}</div></div>`).join('');
  const f=[];
  if(costo)f.push(['Va costando',pesos(costo.total),costo.tope!==null?`de tu tope de ${pesos(costo.tope)}`:'hasta ahora']);
  if(costo&&campana&&campana.contactos)f.push(['Por contacto',pesos(Math.round(costo.total/campana.contactos)),'lo que costó cada uno']);
  return `<div class="clase-etapas">${html}</div>`+(f.length?`<div class="clase-nums">${f.map(([t,v,d])=>
    `<div class="clase-num"><span>${t}</span><b>${v}</b><small>${d}</small></div>`).join('')}</div>`:'');
}

// De quienes la vieron, cuántos tocaron algo. Barras relativas a las
// impresiones y dibujadas con scaleX, no con width.
function embudoClase(totales){
  if(!totales.impresion)return '';
  const filas=[['Se mostró',totales.impresion],['La abrieron',totales.clic],['Te contactaron',totales.contacto]].filter(([,n])=>n>0);
  if(filas.length<2)return '';
  return `<div class="clase-embudo" aria-label="De quienes vieron tu clase, cuántos avanzaron">${filas.map(([t,n])=>
    `<div class="clase-embudo-fila"><span>${t}</span><div class="clase-barra"><i style="transform:scaleX(${(n/totales.impresion).toFixed(3)})"></i></div><b>${n}</b></div>`).join('')}</div>`;
}

// ─── GRÁFICOS DEL PANEL ─────────────────────────────────────────────────────
//
// SVG a mano, sin librerías. Los tres caminos van en tonos de un mismo turquesa,
// del más oscuro al más claro, del más dirigido al más casual. Nada usa el
// semáforo: esto no es una nota. Cada marca lleva su número escrito o en su
// <title>, así el color nunca es lo único que dice algo.
const CANALES_VIZ=[['recomendacion','Recomendado en Inicio','viz-c1'],['busqueda','Buscaron el ramo','viz-c2'],['lista','Vieron el catálogo','viz-c3']];
const milesViz=n=>new Intl.NumberFormat('es-CL').format(n);
const pctViz=(n,t)=>t?new Intl.NumberFormat('es-CL',{style:'percent',maximumFractionDigits:0}).format(n/t):'—';

function donaCanalesClase(porCanal,etiqueta='personas'){
  if(!porCanal)return '';
  const total=porCanal.recomendacion+porCanal.busqueda+porCanal.lista;
  const R=34,C=2*Math.PI*R,GAP=total&&CANALES_VIZ.filter(([k])=>porCanal[k]>0).length>1?2:0;
  let off=0;
  const arcos=total?CANALES_VIZ.filter(([k])=>porCanal[k]>0).map(([k,t,cls])=>{
    const largo=Math.max(C*porCanal[k]/total-GAP,0.5);
    const arco=`<circle class="${cls}" r="${R}" cx="45" cy="45" fill="none" stroke-width="12" stroke-dasharray="${largo.toFixed(2)} ${(C-largo).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 45 45)"><title>${t}: ${milesViz(porCanal[k])} (${pctViz(porCanal[k],total)})</title></circle>`;
    off+=C*porCanal[k]/total;return arco;
  }).join(''):`<circle r="${R}" cx="45" cy="45" fill="none" stroke-width="12" class="viz-vacio"/>`;
  return `<figure class="viz viz-dona" aria-label="Cómo llegaron: ${CANALES_VIZ.map(([k,t])=>t+' '+porCanal[k]).join(', ')}">
    <figcaption>Cómo llegaron</figcaption>
    <div class="viz-dona-cuerpo">
      <svg viewBox="0 0 90 90" role="img" aria-hidden="true">${arcos}<text x="45" y="44" text-anchor="middle" class="viz-dona-num">${milesViz(total)}</text><text x="45" y="57" text-anchor="middle" class="viz-dona-sub">${etiqueta}</text></svg>
      <ul class="viz-leyenda">${CANALES_VIZ.map(([k,t,cls])=>`<li><i class="${cls}"></i><span>${t}</span><b>${milesViz(porCanal[k])}</b><small>${pctViz(porCanal[k],total)}</small></li>`).join('')}</ul>
    </div></figure>`;
}

// Varias campañas en una sola cuenta, para el resumen de arriba.
function sumarCostosCampana(costos){
  const c=costos.filter(Boolean);
  if(!c.length)return null;
  const partes=c[0].partes.map(p=>({...p,cantidad:0,subtotal:0}));
  c.forEach(x=>x.partes.forEach((p,i)=>{partes[i].cantidad+=p.cantidad;partes[i].subtotal+=p.subtotal;}));
  return {partes,bruto:c.reduce((n,x)=>n+x.bruto,0),total:c.reduce((n,x)=>n+x.total,0),
    tope:c.every(x=>x.tope!==null)?c.reduce((n,x)=>n+x.tope,0):null,agotada:false};
}
// En qué se va la plata: una barra apilada con cada concepto.
const PARTES_COSTO_VIZ={contacto:['Contactos','viz-c1'],apertura:['Aperturas','viz-c2'],vista:['Vistas','viz-c3'],dia:['Días publicada','viz-fijo']};
function costoApiladoClase(costo,pesos){
  if(!costo)return '';
  const partes=['contacto','apertura','vista','dia'].map(k=>{const p=costo.partes.find(x=>x.clave===k);return [PARTES_COSTO_VIZ[k][0],p?p.subtotal:0,PARTES_COSTO_VIZ[k][1]];}).filter(([,v])=>v>0);
  const total=partes.reduce((n,[,v])=>n+v,0);
  if(!total)return '';
  return `<figure class="viz viz-costo" aria-label="En qué se va el costo">
    <figcaption>En qué se va · ${pesos(costo.total)}${costo.tope!==null?` de ${pesos(costo.tope)}`:''}</figcaption>
    <div class="viz-apilada">${partes.map(([t,v,cls])=>`<span class="${cls}" style="flex-grow:${v}" title="${t}: ${pesos(v)}"></span>`).join('')}</div>
    <ul class="viz-leyenda">${partes.map(([t,v,cls])=>`<li><i class="${cls}"></i><span>${t}</span><b>${pesos(v)}</b><small>${pctViz(v,total)}</small></li>`).join('')}</ul>
  </figure>`;
}

// Cuánto de la campaña ya pasó, como anillo, con los días que quedan al centro.
function anilloCampanaClase(a,ahora){
  const avance=avanceCampanaAnuncio(a,ahora),dias=diasRestantesAnuncio(a,ahora);
  if(avance===null||dias===null)return '';
  const R=34,C=2*Math.PI*R;
  return `<figure class="viz viz-anillo" aria-label="Campaña: quedan ${dias} días">
    <figcaption>Campaña</figcaption>
    <svg viewBox="0 0 90 90" role="img" aria-hidden="true">
      <circle r="${R}" cx="45" cy="45" fill="none" stroke-width="8" class="viz-vacio"/>
      <circle r="${R}" cx="45" cy="45" fill="none" stroke-width="8" class="viz-avance" stroke-linecap="round" stroke-dasharray="${(C*avance).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 45 45)"><title>${pctViz(avance,1)} de la campaña</title></circle>
      <text x="45" y="47" text-anchor="middle" class="viz-dona-num">${dias}</text><text x="45" y="60" text-anchor="middle" class="viz-dona-sub">${dias===1?'día queda':'días quedan'}</text>
    </svg></figure>`;
}

// Veces que se mostró por día desde que se publicó. Un día sin barra no es un
// cero: es un día con menos de quince eventos, y se dice así.
function barrasDiasClase(a,agregados,ahora){
  if(!agregados)return '';
  const desde=Date.parse(a.publicado_at||''),hasta=Math.min(ahora,Date.parse(a.vence_at||'')||ahora);
  if(!Number.isFinite(desde))return '';
  const dias=[];
  for(let t=desde;t<=hasta&&dias.length<31;t+=864e5)dias.push(new Date(t).toISOString().slice(0,10));
  if(!dias.length)return '';
  const serie=dias.map(d=>({d,n:(agregados.dias[d]||{}).impresion||0,c:(agregados.dias[d]||{}).contacto||0}));
  const max=Math.max(...serie.map(x=>x.n),1),W=Math.max(dias.length*12,120),H=64;
  const ancho=Math.min(8,W/dias.length-3);
  const barras=serie.map((x,i)=>{
    const cx=i*(W/dias.length)+(W/dias.length-ancho)/2,fecha=new Date(x.d+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
    if(!x.n)return `<rect x="${cx.toFixed(1)}" y="${H-2}" width="${ancho.toFixed(1)}" height="2" rx="1" class="viz-vacio-marca"><title>${fecha}: menos de 15 eventos</title></rect>`;
    const h=Math.max(3,(H-6)*x.n/max);
    return `<rect x="${cx.toFixed(1)}" y="${(H-h).toFixed(1)}" width="${ancho.toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="viz-c1"><title>${fecha}: se mostró ${milesViz(x.n)} veces${x.c?`, ${milesViz(x.c)} contactos`:''}</title></rect>`;
  }).join('');
  const conDatos=serie.filter(x=>x.n);
  const mejor=conDatos.sort((p,q)=>q.n-p.n)[0];
  return `<figure class="viz viz-dias" aria-label="Veces que se mostró por día">
    <figcaption>Veces que se mostró por día${mejor?` · mejor día ${new Date(mejor.d+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long'})}`:''}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-hidden="true"><line x1="0" x2="${W}" y1="${H-0.5}" y2="${H-0.5}" class="viz-base"/>${barras}</svg>
    <div class="viz-eje"><span>${new Date(dias[0]+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'})}</span><span>${new Date(dias[dias.length-1]+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'})}</span></div>
    ${conDatos.length?'':'<p class="clase-sin-datos">Cada día aparece cuando junta al menos quince eventos.</p>'}
  </figure>`;
}

// Qué ramo del anuncio mueve más, si el anuncio tiene más de uno.
function barrasRamosClase(a,agregados){
  const siglas=Array.isArray(a.ramos_siglas)?a.ramos_siglas:[];
  if(!agregados||siglas.length<2)return '';
  const filas=siglas.map(sg=>({sg,n:(agregados.ramos[sg]||{}).impresion||0,c:(agregados.ramos[sg]||{}).contacto||0}));
  if(!filas.some(f=>f.n))return '';
  const max=Math.max(...filas.map(f=>f.n),1);
  return `<figure class="viz viz-ramos" aria-label="Veces que se mostró por ramo">
    <figcaption>Por ramo</figcaption>
    ${filas.sort((p,q)=>q.n-p.n).map(f=>`<div class="clase-embudo-fila"><span>${esc(f.sg)}</span><div class="clase-barra"><i style="transform:scaleX(${(f.n/max).toFixed(3)})"></i></div><b>${f.n?milesViz(f.n):'—'}</b></div>`).join('')}
  </figure>`;
}

function graficosClase(d,pesos,ahora){
  const arriba=donaCanalesClase(d.porCanal)+anilloCampanaClase(d.a,ahora);
  return (arriba?`<div class="viz-fila">${arriba}</div>`:'')+
    barrasDiasClase(d.a,d.agregados,ahora)+
    costoApiladoClase(d.costo,pesos)+
    barrasRamosClase(d.a,d.agregados)+
    embudoClase(d.totales);
}

function prepararMetricasClase(a,m){
  const totales=m.agregados?m.agregados.total:totalesDeCortes(m.cortes);
  return {a,alcance:m.alcance,porCanal:m.porCanal,totales,agregados:m.agregados,campana:m.campana,
    error:m.error||a.campanaError,hayCortes:Object.values(totales).some(n=>n>0),costo:costoCampanaClase(m.campana)};
}
function detalleMetricasClaseHTML(d,pesos,ahora){
  return presupuestoProfesorHTML(d.costo)+(d.costo&&d.costo.agotada?'<p class="clase-aviso-tope">Llegó a tu tope: dejó de mostrarse y no suma más costo.</p>':'')+
    cifrasClase(d,pesos)+'<details class="profesor-hig-estadisticas"><summary>Más estadísticas</summary>'+graficosClase(d,pesos,ahora)+'</details>'+
    (d.hayCortes?'':'<p class="clase-sin-datos">Las veces que se mostró por día aparecen cuando hay suficientes datos para que nadie quede identificado.</p>')+
    (d.costo?`<p class="clase-sin-datos">${esc(lineaCostoCampanaClase(d.costo))}.</p>`:'');
}

function tarjetaPanelClase(a,pesos,ahora){
  const vig=vigenciaAnuncio(a,ahora);
  const [etiqueta,detalle]=ESTADOS_ANUNCIO[vig]||[vig,''];
  const dias=vig==='publicado'?diasRestantesAnuncio(a,ahora):null,avance=vig==='publicado'?avanceCampanaAnuncio(a,ahora):null;
  const empieza=vig==='programado'?new Date(a.publicado_at).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}):'';
  const accion={
    publicado:`<button type="button" class="clase-accion" data-pausar="${esc(a.id)}">Pausar</button>`,
    programado:`<button type="button" class="clase-accion" data-pausar="${esc(a.id)}">Pausar</button>`,
    borrador:`<button type="button" class="clase-accion" data-editar="${esc(a.id)}">Seguir editando</button>`,
    pausado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
    expirado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
    agotado:`<button type="button" class="clase-accion" data-retomar="${esc(a.id)}">Volver a publicar</button>`,
  }[vig]||'';
  return `<article class="clase-card" data-anuncio="${esc(a.id)}">
    <div class="clase-card-top">
      <strong>${esc(a.titulo||'Sin título')}</strong>
      <span class="clase-estado clase-estado-${esc(vig)}">${esc(etiqueta)}</span>
    </div>
    <p class="clase-card-meta">${esc((a.ramos_siglas||[]).join(' · '))}${esClaseGratis(a)?' · Gratis':a.precio_clp?' · '+(preciosClase(a).pack?precioClase(a):pesos(preciosClase(a).porClaseFinal)+' por clase'):''}</p>
    ${a.estado==='borrador'&&a.comentario_revision?`<div class="clase-comentario-revision"><strong>Cambios pedidos en la revisión</strong><p>${esc(a.comentario_revision)}</p></div>`:''}
    ${dias!==null?`<div class="clase-vigencia"><span>${dias===0?'Termina hoy':dias===1?'Queda 1 día':`Quedan ${dias} días`}</span>${avance!==null?`<div class="clase-riel"><i style="transform:scaleX(${avance.toFixed(3)})"></i></div>`:''}</div>`
      :`<p class="clase-card-detalle">${esc(empieza?`Empieza el ${empieza}.`:detalle)}</p>`}
    <div class="clase-numeros" data-metricas="${esc(a.id)}"></div>
    ${accion}
  </article>`;
}

// Presentación pura de la propuesta #522. Las acciones y los números siguen
// conectados al flujo de producción; no se importan adaptadores de bin/.
function cabeceraProfesorHTML(titulo,bajada,accion='',idTitulo='profesor-titulo',ceja='TU ESPACIO DE PROFESOR'){
  return `<header class="profesor-hig-cabecera"><div><p class="profesor-hig-ceja">${esc(ceja)}</p><h1 class="modal-title" id="${esc(idTitulo)}">${esc(titulo)}</h1><p>${esc(bajada)}</p></div>${accion}</header>`;
}
function filaProfesorClaseHTML(a,pesos,ahora){
  const vig=vigenciaAnuncio(a,ahora),etiqueta=(ESTADOS_ANUNCIO[vig]||[vig])[0];
  return `<details class="profesor-hig-fila" data-profesor-anuncio="${esc(a.id)}"><summary>
    <span class="profesor-hig-identidad"><b>${esc(a.titulo||'Sin título')}</b><small>${esc((a.ramos_siglas||[]).join(' · '))}</small></span>
    <span class="clase-estado clase-estado-${esc(vig)}" data-estado-campana="${esc(a.id)}">${esc(etiqueta)}</span>
    <span class="profesor-hig-importe"><b data-costo-campana="${esc(a.id)}">${['publicado','pausado','expirado','agotado','sin_confirmar'].includes(vig)?'Cargando…':'—'}</b><small>Costo de campaña</small></span>
    <span class="profesor-hig-flecha" aria-hidden="true">⌄</span>
    </summary><div class="profesor-hig-detalle">${tarjetaPanelClase(a,pesos,ahora)}</div></details>`;
}
function presupuestoProfesorHTML(costo){
  if(!costo)return '<p class="clase-sin-datos">No pudimos cargar el costo de la campaña. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>';
  const porcentaje=costo.tope?Math.min(100,Math.round(costo.total/costo.tope*100)):0;
  return `<section class="profesor-hig-presupuesto"><span>Costo · publicación actual</span><strong>${pesosClase(costo.total)} <small>de ${pesosClase(costo.tope)}</small></strong><progress max="100" value="${porcentaje}" aria-label="Presupuesto utilizado"></progress><p>${porcentaje}% del tope. La campaña deja de mostrarse al alcanzarlo.</p></section>`;
}

function seccionPanelClases(titulo,lista,pesos,ahora,vacio){
  if(!lista.length&&!vacio)return '';
  return `<section class="clases-seccion"><h3>${titulo}${lista.length?` <span>${lista.length}</span>`:''}</h3>
    ${lista.length?`<div class="clase-lista">${lista.map(a=>filaProfesorClaseHTML(a,pesos,ahora)).join('')}</div>`:`<p class="clase-sin-datos">${vacio}</p>`}</section>`;
}

// La vista de Clases que estaba abierta: repintar tras pausar o retomar un
// anuncio no devuelve al Resumen.
let vistaClasesActual=null;
// Al guardar un borrador se vuelve a la lista de anuncios (Lucas, 2026-10-23),
// también si el panel estaba abierto como hoja.
let vistaClasesAlVolver=null;
async function renderPanelProfesor(raiz,anuncios,{cabecera,salida}){
  const pesos=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
  anuncios=await Promise.all(anuncios.map(async a=>{
    if(a.estado!=='publicado')return a;
    try{
      const {data,error}=await supabaseClient.rpc('campana_anuncio',{p_anuncio_id:a.id});
      if(error)return sqlClasesDesactualizado(error)?{...a,campana:null}:{...a,campanaError:true};
      return {...a,campana:Array.isArray(data)?data[0]||null:null};
    }catch(e){return {...a,campanaError:true};}
  }));
  if(anuncios.some(a=>a.estado==='borrador')){
    try{
      const {data,error}=await supabaseClient.rpc('comentarios_devolucion_profesor');
      if(error)throw error;
      const comentarios=new Map((Array.isArray(data)?data:[]).map(f=>[f.anuncio_id,f.comentario]));
      anuncios=anuncios.map(a=>a.estado==='borrador'?{...a,comentario_revision:comentarios.get(a.id)||null}:a);
    }catch(e){
      anuncios=anuncios.map(a=>a.estado==='borrador'?{...a,comentario_revision_error:true}:a);
    }
  }
  let ediciones=[];
  try{
    const {data,error}=await supabaseClient.rpc('mis_anuncios_editados_gradehub');
    if(!error&&Array.isArray(data))ediciones=data.filter(e=>anuncios.some(a=>a.id===e.anuncio_id));
  }catch(e){}
  const ahora=Date.now(),g=gruposPanelClases(anuncios,ahora);
  const conNumeros=[...g.activos,...g.cerrados,...g.sinConfirmar];
  // En su pestaña, «Clases» va en la barra (Lucas, 2026-10-22): sin título
  // grande, la acción principal queda arriba. Abierto como hoja, conserva su
  // título, que la hoja necesita.
  // Misma acción principal que «Invitar alumno» en Alumnos: botón con el acento.
  const crearAnuncio='<button type="button" class="accion-principal" id="clase-nueva">Crear anuncio</button>';
  // Resumen, Anuncios y Perfil (Lucas, 2026-10-22). En pantalla ancha están en
  // la barra lateral y el control de abajo se oculta. El Resumen dice primero
  // lo que pide algo del profesor.
  const enHoja=raiz.id==='modal-content';
  const enDias=f=>f?Math.ceil((new Date(f).getTime()-ahora)/86400000):null;
  const porVencer=g.activos.filter(a=>{const d=enDias(a.vence_at);return d!==null&&d>=0&&d<=3;});
  const devueltos=g.borradores.filter(a=>a.comentario_revision);
  const pendientesHTML=[
    ...ediciones.map(e=>{const a=anuncios.find(a=>a.id===e.anuncio_id);const fecha=new Date(e.editado_at).toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Santiago'});return `<li data-aviso-edicion="${esc(a.id)}"><span><b>${esc(a.titulo||'Sin título')}</b><small>GradeHub editó tu anuncio · ${esc(fecha)}</small></span><button type="button" class="agent-refresh" data-ver-edicion="${esc(a.id)}">Ver anuncio</button></li>`;}),
    ...devueltos.map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Te lo devolvimos con un comentario</small></span><button type="button" class="agent-refresh" data-editar="${esc(a.id)}">Revisar</button></li>`),
    ...g.revision.map(a=>`<li><span><b>${esc(a.titulo||'Sin título')}</b><small>En revisión: te avisamos cuando se publique</small></span></li>`),
    ...porVencer.map(a=>{const d=enDias(a.vence_at);return `<li><span><b>${esc(a.titulo||'Sin título')}</b><small>Su campaña termina ${d===0?'hoy':d===1?'mañana':`en ${d} días`}</small></span></li>`;}),
  ].join('');
  raiz.innerHTML='<div class="profesor-hig">'+
    // «Crear anuncio» vive en Anuncios, donde están los anuncios (Lucas,
    // 2026-10-23). Abierto como hoja, el panel conserva su cabecera con él.
    (enHoja
      ?cabeceraProfesorHTML('Tu conocimiento puede ayudar.','Este es tu espacio para publicar clases y ver cómo les va.',crearAnuncio,'modal-titulo')
      :'')+
    `<nav class="panel-alumnos-vistas tres-vistas" aria-label="Vistas de Clases">
      <button type="button" data-clases-vista="resumen" aria-pressed="true">Resumen</button>
      <button type="button" data-clases-vista="anuncios" aria-pressed="false">Anuncios</button>
      <button type="button" data-clases-vista="perfil" aria-pressed="false">Perfil</button>
    </nav>
    <section class="panel-alumnos-vista" data-clases-panel="resumen" aria-label="Resumen de tus clases">
      <div class="profesor-hig-lista-cabeza"><h2>Pendiente</h2></div>
      ${pendientesHTML?`<ul class="clases-pendientes">${pendientesHTML}</ul>`:'<p class="profesor-hig-vacio">Nada pendiente de tu parte.</p>'}`+
    (anuncios.length?'':`<section class="profesor-hig-intro"><div><h2>Enseña a tu manera.</h2><p>Elige qué ofrecer, a quién llegar y cuánto destinar a tu campaña. Tú pones el límite.</p></div>
      <ol><li><b>Prepara tu clase.</b> Cuenta qué van a trabajar.</li><li><b>Define público y presupuesto.</b> Siempre con un tope.</li><li><b>Revisa y envía.</b> Nada se publica sin aprobación.</li></ol></section>`)+
    `<details class="clases-resumen profesor-hig-resumen" open><summary id="clases-resumen-titulo">Tus clases activas</summary>
       <div id="clases-kpis">${g.activos.length?'<p class="clase-sin-datos">Cargando números…</p>'
         :`<p class="clase-sin-datos">${g.sinConfirmar.length?'No pudimos confirmar qué campañas siguen activas. Vuelve a abrir tu espacio para intentarlo de nuevo.'
           :g.revision.length?'Cuando aprobemos tu clase, acá vas a ver a cuántas personas llega, cuántas te contactan y cuánto va costando.'
           :'Arma un borrador y mándalo a revisión. Cuando se publique, acá vas a ver cómo le va.'}</p>`}</div>
       <p class="clase-privacidad">Las personas se cuentan por anuncio; una misma cuenta puede aparecer en más de uno. “Veces en total” suma cada evento. Nunca ves nombres. El costo de cada campaña nunca pasa de su tope.</p>
     </details></section>
    <section class="panel-alumnos-vista" data-clases-panel="anuncios" aria-label="Tus anuncios" hidden>
    ${enHoja?'':`<div class="profesor-hig-accion">${crearAnuncio}</div>`}
    <div class="profesor-hig-lista-cabeza"><h2>Tus anuncios</h2><span>${anuncios.length} ${anuncios.length===1?'anuncio':'anuncios'}</span></div>`+
    (anuncios.length?'':'<p class="profesor-hig-vacio">Todavía no tienes anuncios. Crea el primero y guárdalo como borrador hasta que esté listo.</p>')+
    seccionPanelClases('Publicadas',g.activos,pesos,ahora)+
    seccionPanelClases('Programadas',g.programados,pesos,ahora)+
    seccionPanelClases('En revisión',g.revision,pesos,ahora)+
    seccionPanelClases('Borradores',g.borradores,pesos,ahora)+
    (g.borradores.some(a=>a.comentario_revision_error)?'<p class="clase-sin-datos" role="alert">No pudimos cargar los comentarios de revisión. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>':'')+
    seccionPanelClases('Pausadas y terminadas',g.cerrados,pesos,ahora)+
    seccionPanelClases('Estado sin confirmar',g.sinConfirmar,pesos,ahora)+
    '</section><section class="panel-alumnos-vista clases-seccion" data-clases-panel="perfil" aria-label="Tu perfil" hidden><h3>Tu perfil</h3><div id="clases-perfil"></div><div id="clases-logo"></div></section>'+
    salida()+'</div>';
  // Cambiar de vista no vuelve a pedir nada: las tres ya están pintadas.
  const activarVistaClases=v=>{
    if(!['resumen','anuncios','perfil'].includes(v))v='resumen';
    vistaClasesActual=v;
    raiz.querySelectorAll('[data-clases-panel]').forEach(p=>{p.hidden=p.dataset.clasesPanel!==v;});
    raiz.querySelectorAll('[data-clases-vista]').forEach(b=>{if(typeof b.setAttribute==='function')b.setAttribute('aria-pressed',String(b.dataset.clasesVista===v));});
    if(!enHoja&&typeof marcarVistaNav==='function')marcarVistaNav('profesor',v);
  };
  raiz.querySelectorAll('[data-clases-vista]').forEach(b=>b.addEventListener('click',()=>activarVistaClases(b.dataset.clasesVista)));
  if(!enHoja&&typeof vistasPanelNav!=='undefined')vistasPanelNav.profesor=v=>{if(raiz.isConnected!==false)activarVistaClases(v);};
  const alVolver=vistaClasesAlVolver;vistaClasesAlVolver=null;
  activarVistaClases(alVolver||(enHoja?'resumen':((typeof tomarVistaNav==='function'&&tomarVistaNav('profesor'))||vistaClasesActual||'resumen')));
  // Al cambiar el estado se vuelve a pedir la lista: el estado, los números y
  // los botones de cada tarjeta dependen de él, y repintar a mano lo que uno
  // cree que cambió es la forma de que una tarjeta quede mintiendo.
  const repintar=()=>renderEspacioProfesor(raiz,{titulo:!!cabecera('x')});
  const nueva=raiz.querySelector('#clase-nueva');
  if(nueva)nueva.addEventListener('click',()=>renderBorradorProfesor(raiz,null));
  const cajaLogo=raiz.querySelector('#clases-logo');
  if(cajaLogo&&cajaLogo.isConnected&&typeof cajaLogo.addEventListener==='function')renderLogoProfesor(cajaLogo);
  const cajaPerfil=raiz.querySelector('#clases-perfil');
  if(cajaPerfil&&cajaPerfil.isConnected&&typeof cajaPerfil.addEventListener==='function')renderPerfilProfesor(cajaPerfil);
  const porVer=new Map(ediciones.map(e=>[e.anuncio_id,e])),abriendoEdicion=new Set();
  const mostrarEdicion=async id=>{
    const edicion=porVer.get(id),a=anuncios.find(a=>a.id===id);
    if(!edicion||!a||abriendoEdicion.has(id))return;
    const fila=[...raiz.querySelectorAll('[data-profesor-anuncio]')].find(f=>f.dataset.profesorAnuncio===id);
    const detalle=fila&&fila.querySelector('.profesor-hig-detalle');
    if(!detalle)return;
    let preview=detalle.querySelector('[data-edicion-preview]');
    if(!preview){
      // La misma tarjeta abierta del catálogo, sin contacto ni medición.
      preview=document.createElement('section');preview.className='vista-catalogo';preview.setAttribute('data-edicion-preview','');
      preview.innerHTML='<h3>Anuncio actualizado por GradeHub</h3>'+tarjetaCatalogoClase(a,{abierta:true});
      preview.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1');});
      detalle.prepend(preview);
      if(a.flyer_path)urlFlyerClase(a.flyer_path).then(url=>{const caja=preview.querySelector('[data-flyer]');if(url&&caja&&caja.isConnected){caja.hidden=false;caja.innerHTML=`<img src="${esc(url)}" alt="Flyer del anuncio">`;}});
    }
    abriendoEdicion.add(id);
    try{
      const {data,error}=await supabaseClient.rpc('marcar_edicion_anuncio_vista',{p_anuncio_id:id,p_accion_id:edicion.accion_id});
      if(error||data!==true)return;
      porVer.delete(id);
      const aviso=[...raiz.querySelectorAll('[data-aviso-edicion]')].find(e=>e.dataset.avisoEdicion===id);
      if(aviso)aviso.remove();
      const pendientes=raiz.querySelector('.clases-pendientes');
      if(pendientes&&!pendientes.children.length)pendientes.innerHTML='<li>Nada pendiente de tu parte.</li>';
    }catch(e){}finally{abriendoEdicion.delete(id);}
  };
  raiz.querySelectorAll('[data-profesor-anuncio]').forEach(f=>f.addEventListener('toggle',()=>{if(f.open)mostrarEdicion(f.dataset.profesorAnuncio);}));
  raiz.querySelectorAll('[data-ver-edicion]').forEach(b=>b.addEventListener('click',()=>{
    activarVistaClases('anuncios');
    const fila=[...raiz.querySelectorAll('[data-profesor-anuncio]')].find(f=>f.dataset.profesorAnuncio===b.dataset.verEdicion);
    if(fila){fila.open=true;mostrarEdicion(b.dataset.verEdicion);const summary=fila.querySelector('summary');if(summary){summary.focus();summary.scrollIntoView({block:'start'});}}
  }));
  raiz.querySelectorAll('[data-editar]').forEach(b=>
    b.addEventListener('click',async()=>{await mostrarEdicion(b.dataset.editar);renderBorradorProfesor(raiz,anuncios.find(a=>a.id===b.dataset.editar)||null);}));
  raiz.querySelectorAll('[data-pausar]').forEach(b=>
    b.addEventListener('click',()=>pausarAnuncioClase(b.dataset.pausar,repintar)));
  // Volver a publicar = volver a borrador y abrirlo: el anuncio pasa por
  // revisión otra vez, y lo natural es revisarlo antes de reenviarlo.
  raiz.querySelectorAll('[data-retomar]').forEach(b=>
    b.addEventListener('click',()=>retomarAnuncioClase(b.dataset.retomar,an=>an?renderBorradorProfesor(raiz,an):repintar())));

  for(const a of g.programados){
    const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);
    if(caja)caja.innerHTML='<p class="clase-sin-datos">Todavía no empieza, así que no hay nada que medir ni que cobrar.</p>';
  }
  for(const a of [...g.revision,...g.borradores]){
    const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);
    if(caja)caja.innerHTML=`<p class="clase-sin-datos">${a.estado==='en_revision'
      ?'Cuando lo aprobemos y empiece a mostrarse, sus números aparecen acá.'
      :'Todavía no se publica, así que no hay nada que medir.'}</p>`;
  }
  conNumeros.forEach(a=>{const caja=raiz.querySelector(`[data-metricas="${a.id}"]`);if(caja)caja.innerHTML='<p class="clase-sin-datos">Cargando…</p>';});

  // Las métricas se piden después de pintar y en paralelo: son dos consultas
  // por anuncio y la lista ya está en pantalla. Si alguna falla, esa tarjeta lo
  // dice y las otras siguen andando.
  const medidas=await Promise.all(conNumeros.map(async a=>{
    const m=await metricasDeAnuncio(a);
    return prepararMetricasClase(a,m);
  }));
  for(const d of medidas){
    const caja=raiz.querySelector(`[data-metricas="${d.a.id}"]`);
    if(!caja||!caja.isConnected)continue;
    const importe=raiz.querySelector(`[data-costo-campana="${d.a.id}"]`);
    if(importe)importe.textContent=d.costo?pesos(d.costo.total):'No disponible';
    if(d.error){caja.innerHTML='<p class="clase-sin-datos" role="alert">No pudimos cargar todas las estadísticas. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>';continue;}
    caja.innerHTML=detalleMetricasClaseHTML(d,pesos,ahora);
  }

  // El resumen suma solo las clases activas: es "cómo me va ahora". Suma lo que
  // se sabe; si ningún anuncio pudo medir su alcance, sale raya y no cero.
  const kpis=raiz.querySelector('#clases-kpis');
  const activas=medidas.filter(d=>vigenciaAnuncio(d.a,ahora)==='publicado');
  if(kpis&&kpis.isConnected&&activas.length){
    if(activas.some(d=>d.error)){kpis.innerHTML='<p class="clase-sin-datos" role="alert">No pudimos cargar el resumen de tus clases. Vuelve a abrir tu espacio para intentarlo de nuevo.</p>';return;}
    const conAlcance=activas.filter(d=>d.alcance!==null);
    const totales={impresion:0,clic:0,contacto:0};
    activas.forEach(d=>Object.keys(totales).forEach(k=>totales[k]+=d.totales[k]));
    const costo=sumarCostosCampana(activas.map(d=>d.costo));
    const conCampana=activas.filter(d=>d.campana);
    const campana=conCampana.length===activas.length?conCampana.reduce((s,d)=>({vistas:s.vistas+d.campana.vistas,
      aperturas:s.aperturas+d.campana.aperturas,contactos:s.contactos+d.campana.contactos}),{vistas:0,aperturas:0,contactos:0}):null;
    const conCanal=activas.filter(d=>d.porCanal);
    const porCanal=conCanal.length?conCanal.reduce((s,d)=>({recomendacion:s.recomendacion+d.porCanal.recomendacion,
      busqueda:s.busqueda+d.porCanal.busqueda,lista:s.lista+d.porCanal.lista}),{recomendacion:0,busqueda:0,lista:0}):null;
    const alcanceTotal=conAlcance.length?conAlcance.reduce((n,d)=>n+d.alcance,0):null;
    kpis.innerHTML=cifrasClase({alcance:alcanceTotal,totales,hayCortes:activas.some(d=>d.hayCortes),campana,costo},pesos,'personas por anuncio')
      .replace('class="clase-etapas"','class="clase-etapas clases-kpis-etapas"').replace('class="clase-nums"','class="clase-nums clases-kpis"')+
      `<div class="viz-fila">${donaCanalesClase(porCanal,'alcances')}${costoApiladoClase(costo,pesos)}</div>`+
      embudoClase(totales);
  }
}

// ─── RAMOS DE LA CLASE ──────────────────────────────────────────────────────
//
// El profesor busca el ramo por nombre o sigla en vez de escribir la sigla
// exacta. Las elegidas se guardan igual que antes, separadas por coma, en el
// campo oculto #pr-siglas: la validación y la base no cambian. La búsqueda usa
// el mismo índice sigla → nombre que el catálogo de clases.
function buscarRamosParaClase(indice,consulta,elegidas=[],max=8){
  // "cálculo 2" tiene que encontrar "Cálculo II": misma regla que el buscador
  // de ramos de la app (normBusqueda pasa romanos a números en ambos lados).
  const romanos=t=>typeof normBusqueda==='function'?normBusqueda(t):t;
  const q=romanos(normalizarBusquedaClase(consulta));
  if(!q)return [];
  const tokens=q.split(' ').filter(Boolean),ya=new Set(elegidas);
  const qSigla=q.replace(/\s+/g,'').toUpperCase();
  const out=[];
  for(const [sigla,nombre] of Object.entries(indice||{})){
    if(ya.has(sigla))continue;
    // Cada palabra escrita tiene que ser el comienzo de una palabra del ramo:
    // "2" calza con "Cálculo II" pero no con el 2 perdido dentro de MAT1492.
    const palabras=romanos(normalizarBusquedaClase(sigla+' '+nombre)).split(/[\s()\-.,]+/);
    if(!tokens.every(t=>palabras.some(w=>w.startsWith(t)))&&!sigla.startsWith(qSigla))continue;
    const n=romanos(normalizarBusquedaClase(nombre));
    out.push({sigla,nombre,rango:sigla===qSigla?0:sigla.startsWith(qSigla)?1:n.startsWith(q)?2:3});
  }
  out.sort((a,b)=>a.rango-b.rango||a.nombre.localeCompare(b.nombre,'es')||a.sigla.localeCompare(b.sigla));
  // Una sigla bien formada que no está en el índice también se puede usar: el
  // índice no es exhaustivo (UAI no publica siglas, y UC carga su catálogo
  // completo recién cuando se busca).
  if(/^[A-Z0-9-]{2,24}$/.test(qSigla)&&!/\s/.test(consulta.trim())&&!indice[qSigla]&&!ya.has(qSigla)&&/\d/.test(qSigla))
    out.push({sigla:qSigla,nombre:'Usar esta sigla',rango:9});
  return out.slice(0,max);
}

function activarBuscadorRamosClase(form,campo){
  const buscar=campo('siglas-buscar'),oculto=campo('siglas'),lista=campo('ramos-resultados'),elegidasCaja=campo('ramos-elegidos'),tenantSel=campo('tenant');
  if(!buscar||!oculto||!lista||!elegidasCaja||typeof buscar.addEventListener!=='function')return;
  let indice={};
  const leer=()=>String(oculto.value||'').split(',').map(x=>siglaAnuncio(x)).filter(Boolean);
  const escribir=siglas=>{
    oculto.value=siglas.join(', ');pintarElegidas();
    // El campo oculto no dispara eventos solo: se avisa para que la vista
    // previa muestre el ramo elegido.
    try{if(typeof Event==='function'&&oculto.dispatchEvent)oculto.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
  };
  const nombreDe=sg=>indice[sg]||'';
  const pintarElegidas=()=>{
    const siglas=leer();
    elegidasCaja.innerHTML=siglas.map(sg=>`<span class="profesor-ramo-chip"><b>${esc(sg)}</b>${nombreDe(sg)?`<span>${esc(nombreDe(sg))}</span>`:''}<button type="button" data-quitar-sigla="${esc(sg)}" aria-label="Quitar ${esc(sg)}">×</button></span>`).join('');
    elegidasCaja.querySelectorAll('[data-quitar-sigla]').forEach(b=>b.addEventListener('click',()=>escribir(leer().filter(x=>x!==b.dataset.quitarSigla))));
    // Con el máximo elegido no se reemplaza ninguno a escondidas: hay que
    // quitar uno para poner otro.
    const lleno=siglas.length>=MAX_RAMOS_POR_ANUNCIO;
    buscar.disabled=lleno;
    buscar.placeholder=lleno?'Ya elegiste dos siglas. Quita una para cambiarla.':siglas.length?'Otra sigla del mismo ramo (opcional)':'Busca por nombre o sigla, ej. Cálculo II';
  };
  const cerrar=()=>{lista.hidden=true;lista.innerHTML='';buscar.setAttribute('aria-expanded','false');};
  const mostrar=()=>{
    const res=buscarRamosParaClase(indice,buscar.value,leer());
    if(!res.length){cerrar();return;}
    lista.innerHTML=res.map((x,i)=>`<li role="option" id="pr-ramo-op-${i}" data-sigla="${esc(x.sigla)}"><b>${esc(x.sigla)}</b><span>${esc(x.nombre)}</span></li>`).join('');
    lista.hidden=false;buscar.setAttribute('aria-expanded','true');
    lista.querySelectorAll('[data-sigla]').forEach(li=>li.addEventListener('mousedown',e=>{e.preventDefault();elegir(li.dataset.sigla);}));
  };
  const elegir=sg=>{
    const actuales=leer();
    if(sg&&actuales.length===1&&actuales[0]!==sg&&!mismoRamoClase(nombreDe(actuales[0]),nombreDe(sg))){
      if(typeof showToast==='function')showToast(ERROR_DOS_RAMOS_CLASE,true);
      buscar.value='';cerrar();buscar.focus();return;
    }
    if(sg&&!actuales.includes(sg)&&actuales.length<MAX_RAMOS_POR_ANUNCIO)escribir([...actuales,sg]);
    buscar.value='';cerrar();buscar.focus();
  };
  const reindexar=()=>{indice=nombresRamosParaClases(tenantSel?tenantSel.value:S.tenant);pintarElegidas();if(buscar.value)mostrar();};
  buscar.addEventListener('input',mostrar);
  buscar.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();const primera=lista.querySelector('[data-sigla]');if(primera)elegir(primera.dataset.sigla);}
    else if(e.key==='Escape')cerrar();
  });
  buscar.addEventListener('blur',()=>setTimeout(cerrar,120));
  if(tenantSel)tenantSel.addEventListener('change',()=>{
    // Una sigla elegida para otra universidad nunca viaja a este anuncio.
    buscar.value='';cerrar();escribir([]);
    reindexar();
    if(tenantSel.value==='uc'&&typeof cargarCursosUC==='function')cargarCursosUC().then(ok=>{if(ok&&form.isConnected)reindexar();}).catch(()=>{});
  });
  reindexar();
  // El catálogo UC completo llega diferido: se busca con lo que hay y se
  // enriquece cuando termina de bajar.
  if((tenantSel?tenantSel.value:S.tenant)==='uc'&&typeof cargarCursosUC==='function')
    cargarCursosUC().then(ok=>{if(ok&&form.isConnected)reindexar();}).catch(()=>{});
}

// Clases › Perfil. Lo mismo que ve el estudiante al tocar «Ver perfil» en un
// anuncio, pero solo si el profesor lo activó: parte apagado.
async function renderPerfilProfesor(caja){
  if(!caja)return;
  const ficha=await perfilProfesorActual();
  if(!caja.isConnected)return;
  const p=ficha.ok?ficha.perfil:null;
  if(!p){caja.innerHTML='';return;}
  if(!tienePerfilCompleto(p)){caja.innerHTML='<p class="profesor-info">Muy pronto vas a poder armar tu perfil público acá.</p>';return;}
  const v=c=>esc(p[c]==null?'':p[c]);
  const tipo=p.tipo_perfil||'profesor',unis=p.universidades||[];
  caja.innerHTML=`<form class="profesor-form profesor-perfil" novalidate>
      <fieldset class="profesor-linea"><legend class="modal-label">Eres</legend><div class="profesor-linea-opciones">
        ${TIPOS_PERFIL.map(([val,txt])=>`<label class="profesor-linea-opcion"><input type="radio" name="pf-tipo" value="${val}"${tipo===val?' checked':''}><span>${txt}</span></label>`).join('')}
      </div></fieldset>
      <label class="modal-label" for="pf-nombre">Nombre público</label><input id="pf-nombre" type="text" maxlength="100" autocomplete="organization" value="${v('nombre_publico')}">
      <label class="modal-label" for="pf-descripcion">Descripción</label><textarea id="pf-descripcion" maxlength="1500" placeholder="Quién eres, cómo haces tus clases y qué experiencia tienes.">${v('presentacion')}</textarea>
      <label class="modal-label" for="pf-instagram">Instagram · opcional</label><input id="pf-instagram" type="text" maxlength="31" autocomplete="off" autocapitalize="none" placeholder="@salvaramos" value="${p.instagram?'@'+v('instagram'):''}">
      <label class="modal-label" for="pf-web">Sitio web · opcional</label><input id="pf-web" type="url" maxlength="160" autocomplete="url" autocapitalize="none" placeholder="https://" value="${v('sitio_web')}">
      <fieldset class="profesor-linea"><legend class="modal-label">Universidades donde enseñas · opcional</legend><div class="profesor-linea-opciones">
        ${UNIVERSIDADES_PERFIL.map(([val,txt])=>`<label class="profesor-linea-opcion"><input type="checkbox" name="pf-uni" value="${val}"${unis.includes(val)?' checked':''}><span>${txt}</span></label>`).join('')}
      </div></fieldset>
      <label class="modal-label" for="pf-ramos">Ramos que enseñas · opcional</label><input id="pf-ramos" type="text" maxlength="500" autocomplete="off" autocapitalize="characters" placeholder="MAT1620, FIS1514" aria-describedby="pf-ramos-ayuda" value="${esc((p.ramos_siglas||[]).join(', '))}">
      <p class="profesor-info" id="pf-ramos-ayuda">Las siglas separadas por coma, hasta 20.</p>
      <label class="profesor-perfil-publico"><input id="pf-publico" type="checkbox"${p.perfil_publico?' checked':''}><span><b>Mostrar mi perfil en mis anuncios</b>Los estudiantes verán «Ver perfil» en cada anuncio publicado, con esto y tus otros anuncios. Nunca tu correo.</span></label>
      <button class="accion-principal" type="submit">Guardar perfil</button>
      <p class="profesor-estado" role="status" aria-live="polite"></p>
    </form>`;
  const form=caja.querySelector('form'),estado=form.querySelector('.profesor-estado'),campo=id=>form.querySelector('#pf-'+id);
  campo('instagram').addEventListener('input',e=>{e.target.value=textoInstagramEscrito(e.target.value);});
  let guardando=false;
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(guardando)return;
    const entrada={tipo_perfil:(form.querySelector('input[name=pf-tipo]:checked')||{}).value,nombre_publico:campo('nombre').value,
      presentacion:campo('descripcion').value,instagram:campo('instagram').value,sitio_web:campo('web').value,
      universidades:[...form.querySelectorAll('input[name=pf-uni]:checked')].map(x=>x.value),ramos:campo('ramos').value,perfil_publico:campo('publico').checked};
    const valido=validarPerfilProfesor(entrada);
    if(!valido.ok){estado.textContent=valido.error;const c=campo({nombre:'nombre',presentacion:'descripcion',instagram:'instagram',web:'web',ramos:'ramos'}[valido.campo]);if(c)c.focus();return;}
    guardando=true;const boton=form.querySelector('button[type=submit]');boton.disabled=true;estado.textContent='Guardando…';
    const r=await guardarPerfilProfesor(entrada);
    guardando=false;boton.disabled=false;
    if(!caja.isConnected)return;
    estado.textContent=r.ok?(r.perfil.perfil_publico?'Perfil guardado. Ya se ve en tus anuncios publicados.':'Perfil guardado. Por ahora no se muestra en tus anuncios.'):r.error;
  });
}

// El logo es de la ficha, no del anuncio: el mismo bloque aparece en el
// formulario y en la página de Clases, y cambiarlo en uno cambia el otro.
async function renderLogoProfesor(caja){
  if(!caja)return;
  const ficha=await perfilProfesorActual();
  if(!caja.isConnected)return;
  const perfil=ficha.ok?ficha.perfil:null,estado=estadoLogoProfesor(perfil);
  if(estado==='no-disponible'){caja.innerHTML='';return;}
  const textos={
    'sin-logo':'Sale a la derecha en todos tus anuncios publicados.',
    'en-revision':perfil.logo_aprobado_path?'Tu logo nuevo está en revisión. Mientras tanto se sigue mostrando el anterior.':'Tu logo está en revisión. Aparecerá en tus anuncios cuando lo aprobemos.',
    'aprobado':'Se muestra en todos tus anuncios publicados.',
  };
  caja.innerHTML=`<div class="profesor-logo">
      <div class="profesor-logo-img" aria-hidden="true"></div>
      <div class="profesor-logo-texto"><strong>Tu logo${estado==='en-revision'?' · en revisión':''}</strong><span>${textos[estado]}</span></div>
    </div>
    <div class="profesor-logo-acciones">
      <label class="btn-cancel profesor-logo-subir">${estado==='sin-logo'?'Subir logo':'Cambiar logo'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
      ${estado==='sin-logo'?'':'<button type="button" class="btn-cancel profesor-logo-quitar">Quitar</button>'}
    </div>
    <p class="profesor-estado" role="status" aria-live="polite"></p>`;
  const aviso=caja.querySelector('.profesor-estado');
  const ruta=perfil.logo_path||perfil.logo_aprobado_path;
  const avisarLogo=url=>{try{document.dispatchEvent(new CustomEvent('gradehub:logo-profesor',{detail:url||''}));}catch(e){}};
  if(ruta)urlFlyerClase(ruta).then(url=>{const img=caja.querySelector('.profesor-logo-img');if(url&&img&&img.isConnected)img.innerHTML=imgLogoClase(url);avisarLogo(url);});
  else avisarLogo('');
  caja.querySelector('input[type=file]').addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];if(!file)return;
    aviso.textContent='Subiendo logo…';
    const r=await subirLogoProfesor(file);
    if(!caja.isConnected)return;
    if(!r.ok){aviso.textContent=r.error;e.target.value='';return;}
    renderLogoProfesor(caja);
  });
  const quitar=caja.querySelector('.profesor-logo-quitar');
  if(quitar)quitar.addEventListener('click',async()=>{
    aviso.textContent='Quitando logo…';
    const r=await quitarLogoProfesor();
    if(!caja.isConnected)return;
    if(!r.ok){aviso.textContent=r.error;return;}
    renderLogoProfesor(caja);
  });
}

// La tarjeta de ramo de la vista previa es la misma de Inicio (mismas clases,
// mismo tamaño), con una raya en vez de nota: la nota es de cada estudiante.
function filaRamoVistaPrevia(extra){
  return `<div class="ramo-row has-progress tiene-clase-apoyo${extra}" style="--ramo-tint:var(--fg3);--ramo-progress-scale:.3" aria-hidden="true">
      <div class="ramo-band"></div>
      <div class="ramo-info"><span class="ramo-name">Tu ramo</span><div class="ramo-meta"><span class="ramo-sigla">Sigla</span><span class="ramo-meta-text">30% evaluado</span></div></div>
      <div class="ramo-grade-action"><div class="ramo-nota vista-sin-nota">—</div><span class="chevron-r">›</span></div>
      <span class="ramo-progress-track"><span class="ramo-progress-fill"></span></span></div>`;
}
// La campaña vive aparte del anuncio (anuncio_campanas): el tope es del
// profesor y el anuncio lo lee cualquiera. Sin el SQL de campañas, `falta`
// avisa que no se pudo guardar sin tratarlo como un error de la persona.
// Solo ausencia explícita de esquema: jamás degradar por red, RLS o validación.
function sqlClasesDesactualizado(error){
  return !!error&&['42883','42703','PGRST202','PGRST204','42P01','PGRST205'].includes(error.code);
}
function faltaTablaCampana(error){return sqlClasesDesactualizado(error);}
const compatibilidadSqlClases={campanas:false,cobros:false};
const AVISO_SQL_CLASES='SQL de campañas pendiente. Se usa el modo anterior: los cobros solo se guardan para la publicación actual y los días y el tope pueden no estar guardados. Aplica los tres archivos SQL antes de publicar o renovar campañas.';
async function leerCampanaClase(anuncioId,{diagnostico=false,estricto=false}={}){
  if(!supabaseClient||!anuncioId)return null;
  try{
    const {data,error}=await supabaseClient.from('anuncio_campanas').select('dias,inicio,tope_clp').eq('anuncio_id',anuncioId).maybeSingle();
    if(error){if(estricto)throw error;if(faltaTablaCampana(error)){compatibilidadSqlClases.campanas=true;return diagnostico?{sqlAnterior:true}:null;}console.warn('No se pudo leer la campaña:',error.code||'',error.message||error);return null;}
    compatibilidadSqlClases.campanas=false;return data||null;
  }catch(e){if(estricto)throw e;return null;}
}
async function guardarCampanaClase(anuncioId,datos){
  if(!supabaseClient||!anuncioId)return {ok:false,error:'no pudimos guardar la campaña.'};
  // No se usa upsert: PostgREST lo traduce a ON CONFLICT DO UPDATE SET
  // anuncio_id=…, y el cliente no tiene UPDATE sobre anuncio_id (a propósito:
  // una campaña no se muda de anuncio). Postgres exige ese permiso aunque no
  // haya conflicto, así que fallaba SIEMPRE con 42501 y el anuncio no se podía
  // enviar a revisión. Primero se actualiza; si no había fila, se inserta.
  try{
    const tabla=()=>supabaseClient.from('anuncio_campanas');
    let {data,error}=await tabla().update(datos).eq('anuncio_id',anuncioId).select('anuncio_id');
    if(!error&&!(Array.isArray(data)&&data.length)){
      ({error}=await tabla().insert({anuncio_id:anuncioId,...datos}));
      // Otra pestaña la creó entre medio: ahora sí hay fila que actualizar.
      if(error&&error.code==='23505'){
        ({data,error}=await tabla().update(datos).eq('anuncio_id',anuncioId).select('anuncio_id'));
        if(!error&&!(Array.isArray(data)&&data.length))error={code:'SIN_FILA',message:'la campaña no quedó guardada'};
      }
    }
    if(!error){compatibilidadSqlClases.campanas=false;return {ok:true};}
    if(faltaTablaCampana(error)){compatibilidadSqlClases.campanas=true;return {ok:false,falta:true,error:'el servidor aún no guarda los días y el tope; se usará el proceso de revisión anterior.'};}
    console.warn('No se guardó la campaña:',error.code||'',error.message||error);
    return {ok:false,error:'no pudimos guardar los días y el tope. Intenta de nuevo.'};
  }catch(e){return {ok:false,error:'no pudimos guardar los días y el tope. Intenta de nuevo.'};}
}

function renderBorradorProfesor(raiz,anuncio,{pendiente=false,admin=false,profesor=null,volverAdmin=null}={}){
  let id=anuncio&&anuncio.id||null,flyerActual=anuncio&&anuncio.flyer_path||null;
  const valor=(campo,defecto='')=>esc(anuncio&&anuncio[campo]!=null?anuncio[campo]:defecto);
  const tipoContactoInicial=anuncio&&PREFIJO_CONTACTO_CLASE[anuncio.contacto_tipo]!==undefined?anuncio.contacto_tipo:'whatsapp';
  const elegir=(opciones,actual)=>opciones.map(([clave,texto])=>`<option value="${clave}"${actual===clave?' selected':''}>${texto}</option>`).join('');
  // Siempre hay cómo salir sin guardar ni enviar (Lucas, 2026-10-24).
  raiz.innerHTML='<div class="profesor-hig profesor-hig-editor">'+
    `<button type="button" class="profesor-volver" id="pr-volver"><span aria-hidden="true">‹</span> ${admin?'Anuncios':pendiente?'Volver':'Tus anuncios'}</button>`+
    cabeceraProfesorHTML(admin?`Editando el anuncio de ${profesor&&profesor.nombre||'este profesor'}`:id?'Edita tu borrador.':'Prepara tu clase.',
    admin?'Corrige el anuncio y revisa cómo se verá. El profesor recibirá un aviso al guardar.':pendiente?'Puedes guardar tu anuncio mientras revisamos tu postulación. Nadie lo verá todavía.':'Nada se publica al guardar. Completa tu clase, revisa el público y luego envíala a revisión.','',raiz.id==='modal-content'?'modal-titulo':'profesor-titulo',admin?'ADMINISTRACIÓN':undefined)+`
    ${anuncio&&anuncio.comentario_revision?`<div class="clase-comentario-revision"><strong>Cambios pedidos en la revisión</strong><p>${esc(anuncio.comentario_revision)}</p></div>`:''}
    <form class="profesor-form" id="profesor-borrador">
      <!-- Campos y vista previa van juntos para que la vista previa, sticky en
           computador, se detenga donde termina esta fila y no baje a los botones. -->
      <div class="profesor-form-cuerpo">
      <div class="profesor-form-campos">
      <details class="profesor-seccion" open><summary><h3 id="pr-seccion-titulo">${esMaterialClase(anuncio)?'1. Tu material':'1. Tu clase'}</h3></summary><div class="profesor-seccion-cuerpo">
      ${!admin&&(capasColumnasClase>=4||esMaterialClase(anuncio))?`<fieldset class="profesor-tipo" id="pr-tipo-caja"><legend class="modal-label">Qué publicas</legend>
        <div class="profesor-tipo-opciones">${TIPOS_ANUNCIO.map(([v,t])=>`<label><input type="radio" name="pr-tipo" value="${v}"${(esMaterialClase(anuncio)?'material':'clase')===v?' checked':''}><span>${t}</span></label>`).join('')}</div>
        <p class="profesor-info" id="pr-tipo-ayuda">${esMaterialClase(anuncio)?TEXTO_TIPO_ANUNCIO.material:TEXTO_TIPO_ANUNCIO.clase}</p></fieldset>`:''}
      <label class="modal-label" for="pr-titulo">Título del anuncio</label><input id="pr-titulo" type="text" minlength="5" maxlength="90" required value="${valor('titulo')}">
      <label class="modal-label" for="pr-descripcion">Descripción</label><textarea id="pr-descripcion" minlength="20" maxlength="1500" required placeholder="Qué van a trabajar, cómo son tus clases y tu experiencia con el ramo.">${valor('descripcion')}</textarea>
      <label class="modal-label" for="pr-precio" id="pr-precio-etiqueta">${esMaterialClase(anuncio)?'Precio del material':'Precio por clase'}</label><input id="pr-precio" type="text" inputmode="numeric" autocomplete="off" required placeholder="$15.000" aria-describedby="pr-precio-ayuda" value="${esc(textoPesosEscrito(anuncio&&anuncio.precio_clp))}"><p class="profesor-info" id="pr-precio-ayuda">${esMaterialClase(anuncio)?'Si el material es gratis':'Si la clase es gratis'}, pon $0: se mostrará como "Gratis".</p>
      <div class="profesor-solo-clase" id="pr-solo-clase"${esMaterialClase(anuncio)?' hidden':''}>
      <label class="modal-label" for="pr-pack">Clases por pack · opcional</label><input id="pr-pack" type="number" inputmode="numeric" min="${MIN_PACK_CLASES}" max="${MAX_PACK_CLASES}" step="1" placeholder="Ej. 4" aria-describedby="pr-pack-ayuda" value="${valor('pack_clases')}"><p class="profesor-info" id="pr-pack-ayuda">Si vendes un pack, pon cuántas clases trae. El precio de arriba sigue siendo por clase: mostramos el total del pack.</p>
      <label class="modal-label" for="pr-modalidad">Formato · opcional</label><select id="pr-modalidad">${elegir([['','No indicar'],...MODALIDADES_CLASE,['otra','Otra…']],anuncio&&anuncio.modalidad||'')}</select>
      <input id="pr-modalidad-otra" type="text" maxlength="40" aria-label="Escribe el formato" placeholder="Ej. grupos de hasta 3" value="${valor('modalidad_otra')}" ${anuncio&&anuncio.modalidad==='otra'?'':'hidden'}>
      <label class="modal-label" for="pr-ubicacion">Dónde · opcional</label><select id="pr-ubicacion">${elegir([['','No indicar'],...UBICACIONES_CLASE,['otra','Otra…']],anuncio&&anuncio.ubicacion||'')}</select>
      <input id="pr-ubicacion-otra" type="text" maxlength="40" aria-label="Escribe dónde es la clase" placeholder="Ej. en tu casa o en la biblioteca" value="${valor('ubicacion_otra')}" ${anuncio&&anuncio.ubicacion==='otra'?'':'hidden'}>
      </div>
      <div class="profesor-detalles" id="pr-detalles-caja">
        <span class="modal-label">Detalles · opcional</span>
        <p class="profesor-info">Lo que quieras destacar, como "Duración: 90 minutos" o "Incluye: guía de ejercicios". Hasta ${MAX_DETALLES_CLASE}.</p>
        <div id="pr-detalles"></div>
        <button class="btn-cancel profesor-detalle-agregar" id="pr-agregar-detalle" type="button">Agregar un detalle</button>
      </div>
      <fieldset class="profesor-linea" id="pr-linea-caja">
        <legend class="modal-label">Bajo el título · hasta ${MAX_LINEA_CLASE}</legend>
        <p class="profesor-info">Es lo primero que lee el estudiante en Inicio, junto a su ramo. Elige lo que más ayuda a decidir; el resto aparece cuando abre tu clase.</p>
        <div class="profesor-linea-opciones" id="pr-linea"></div>
      </fieldset>
      <div class="profesor-contacto-tipo" id="pr-contacto-tipo-caja" hidden>
        <label class="modal-label" for="pr-contacto-tipo">Cómo te contactarán</label><select id="pr-contacto-tipo">${elegir(CONTACTOS_CLASE,tipoContactoInicial)}</select>
        <p class="profesor-info">Como la clase es gratis, puedes llevar a tu Instagram o a un link de inscripción en vez de WhatsApp.</p>
      </div>
      <label class="modal-label" for="pr-contacto" id="pr-contacto-etiqueta">Tu WhatsApp</label><input id="pr-contacto" type="text" minlength="3" maxlength="160" required autocomplete="off" aria-describedby="pr-contacto-error pr-contacto-ayuda" placeholder="${esc(EJEMPLO_CONTACTO_CLASE[tipoContactoInicial])}" value="${esc(anuncio&&anuncio.contacto_valor!=null?anuncio.contacto_valor:PREFIJO_CONTACTO_CLASE[tipoContactoInicial])}">
      <p id="pr-contacto-error" role="alert" hidden style="margin:6px 0 0;font-size:0.8125rem;color:var(--red);"></p>
      <p class="profesor-info" id="pr-contacto-ayuda"></p>
      ${admin?'<p class="profesor-info">El flyer y el logo se muestran en la vista previa. Desde acá no se cambian.</p><p class="profesor-info" id="pr-imagenes-aviso" role="status"></p>':`<label class="modal-label" for="pr-flyer">Flyer · opcional</label><input id="pr-flyer" type="file" accept="image/jpeg,image/png,image/webp" ${pendiente?'disabled':''}><p class="profesor-info">${pendiente?'Podrás subir el flyer cuando aprobemos tu postulación.':'JPG, PNG o WebP · máximo 5 MB. Primero se guarda el borrador y después se sube la imagen.'}</p>
      <button class="btn-cancel" id="pr-quitar-flyer" type="button" ${flyerActual?'':'hidden'}>Quitar flyer guardado</button>
      <div id="pr-logo"></div>`}
      <div class="profesor-flyer-preview" hidden><img alt="Vista previa del flyer"></div>
      </div></details>
      <details class="profesor-seccion" open><summary><h3>2. Público</h3></summary><div class="profesor-seccion-cuerpo">
      <label class="modal-label" for="pr-tenant">Universidad</label><select id="pr-tenant">${elegir([['uc','UC'],['fen','FEN'],['uai','UAI'],['uandes','UAndes']],anuncio&&anuncio.tenant||S.tenant)}</select>
      <label class="modal-label" for="pr-siglas-buscar">Ramo de tu clase</label>
      <div class="profesor-ramos" id="pr-ramos-elegidos" aria-live="polite"></div>
      <div class="profesor-ramos-buscar">
        <input id="pr-siglas-buscar" type="search" autocomplete="off" placeholder="Busca por nombre o sigla, ej. Cálculo II" aria-describedby="pr-siglas-ayuda" aria-controls="pr-ramos-resultados">
        <ul class="profesor-ramos-resultados" id="pr-ramos-resultados" role="listbox" hidden></ul>
      </div>
      <p class="profesor-info" id="pr-siglas-ayuda">Si tu ramo tiene dos siglas, como Dinámica ICE1514 y FIS1514, puedes elegir las dos. Otro ramo va en otro anuncio. Si no aparece, escribe su sigla completa.</p>
      <input id="pr-siglas" type="hidden" value="${esc(anuncio&&Array.isArray(anuncio.ramos_siglas)?anuncio.ramos_siglas.join(', '):'')}">
      ${admin&&anuncio&&!anuncio.criterios?'<p class="profesor-info">Este anuncio tiene público general. Se conserva mientras no cambies el promedio o el mínimo evaluado.</p>':''}
      <label class="modal-label" for="pr-promedio">Promedio menor a</label><input id="pr-promedio" type="number" min="1.1" max="7" step="0.1" required value="${esc(anuncio&&anuncio.criterios?anuncio.criterios.promedioMenorA:5)}">
      <label class="modal-label" for="pr-avance">Mínimo evaluado · %</label><input id="pr-avance" type="number" min="0" max="99" step="1" required value="${esc(anuncio&&anuncio.criterios?anuncio.criterios.avanceMinimo:20)}">
      <p class="profesor-info">GradeHub calcula el público sin mostrarte notas ni identidades.</p>
      </div></details>
      ${admin?'':`<details class="profesor-seccion" open><summary><h3>3. Tu campaña</h3></summary><div class="profesor-seccion-cuerpo">
      <div class="profesor-campana">
        <div class="profesor-campana-fechas">
          <div><label class="modal-label" for="pr-inicio">Empieza · opcional</label><input id="pr-inicio" type="date" min="${hoyChileClase()}"></div>
          <div><label class="modal-label" for="pr-dias">Días</label><input id="pr-dias" type="number" inputmode="numeric" min="1" max="${MAX_DIAS_CAMPANA}" step="1" required value="${DIAS_CAMPANA_POR_OMISION}"></div>
          <div><label class="modal-label" for="pr-fin">Termina</label><input id="pr-fin" type="date" min="${hoyChileClase()}"></div>
        </div>
        <p class="profesor-info">Sin fecha de inicio, parte apenas la aprobemos. Puedes elegir los días o la fecha de término: el otro se ajusta solo.</p>
        <label class="modal-label" for="pr-tope">Tope · lo máximo que pagarías</label><input id="pr-tope" type="text" inputmode="numeric" autocomplete="off" required placeholder="${esc(textoPesosEscrito(TOPE_CAMPANA_POR_OMISION))}" value="${esc(textoPesosEscrito(TOPE_CAMPANA_POR_OMISION))}">
        <p class="profesor-info">Cuesta ${pesosClase(TARIFA_CAMPANA.dia)} por día publicada y, por persona, ${pesosClase(TARIFA_CAMPANA.vista)} si la ve, ${pesosClase(TARIFA_CAMPANA.apertura)} si la abre y ${pesosClase(TARIFA_CAMPANA.contacto)} si te contacta. Cada persona cuenta una vez. Al llegar al tope deja de mostrarse: nunca pagas más que eso. El pago se coordina con GradeHub antes de publicar.</p>
        <p class="profesor-campana-resumen" id="pr-campana-resumen" aria-live="polite"></p><button type="button" class="btn-cancel" id="pr-reintentar-campana" hidden>Reintentar carga de campaña</button>
      </div>
      </div></details>`}
      </div>
      <section class="profesor-form-vista" aria-labelledby="pr-vista-titulo">
      <div class="vista-cabeza"><h3 id="pr-vista-titulo">${admin?'3':'4'}. Así la van a ver</h3></div>
      <!-- Solo la vista de celular. La de computador era la pantalla entera de
           Inicio achicada a la columna del formulario, y quedaba ilegible; el
           banner dice lo mismo en los dos, y la mayoría entra desde el iPhone. -->
      <div class="profesor-vista-previa modo-celular" id="pr-vista">
        <div class="vista-solo-cel"><p class="profesor-info">En Inicio, junto al ramo del estudiante:</p>
        <div class="vista-celular">${filaRamoVistaPrevia('')}<aside class="clase-apoyo vista-anuncio"></aside></div></div>
        <p class="profesor-info">La nota del ramo es la de cada estudiante: acá va una raya porque cambia para cada uno.</p>
        <p class="profesor-info">Al abrirla, y en el catálogo de clases, con tu flyer si subiste uno:</p>
        <div class="vista-catalogo" aria-hidden="true"></div>
      </div>
      </section>
      </div>
      <div class="profesor-form-acciones">
      <div class="modal-btns"><button class="${admin?'accion-principal':pendiente?'btn-confirm':'btn-cancel'}" id="pr-guardar" type="button">${admin?'Guardar cambios':'Guardar borrador'}</button>${admin||pendiente?'':'<button class="btn-confirm" id="pr-enviar" type="button">Enviar a revisión</button>'}</div>
      <p class="profesor-estado" role="status" aria-live="polite">${admin?'Los cambios se guardan en este anuncio, sin cambiar su publicación ni su campaña.':id?'Borrador recuperado. Puedes seguir editándolo.':'Completa la clase para guardar el primer borrador.'}</p>
      </div>
    </form></div>`;
  const form=raiz.querySelector('#profesor-borrador'),campo=id=>form.querySelector('#pr-'+id),estado=form.querySelector('.profesor-estado');
  let procesando=false,campanaLista=admin||!id;
  // Vista previa en vivo: el mismo contenido que verá el estudiante en Inicio,
  // armado con lo que el profesor lleva escrito y su logo.
  const vista=form.querySelector('#pr-vista');
  let logoVista='';
  const valorCampo=id=>{const el=campo(id);return el?String(el.value||''):'';};
  // Clase o material (2026-10-23). Sin el selector (SQL sin aplicar), clase.
  const tipoElegido=()=>{if(admin)return esMaterialClase(anuncio)?'material':'clase';const r=typeof form.querySelector==='function'&&form.querySelector('input[name="pr-tipo"]:checked');return r&&r.value==='material'?'material':'clase';};
  // Qué datos van bajo el título. Se guarda como claves, en el orden en que se
  // muestran; si coincide con lo de siempre se guarda null, como los anuncios
  // que ya existían.
  const lineaElegida=new Set(Array.isArray(anuncio&&anuncio.linea_datos)?anuncio.linea_datos:LINEA_CLASE_POR_OMISION);
  const cajaLinea=campo('linea');let firmaLinea='';
  const borradorEnVivo=()=>({...(admin?{descuento_gradehub_pct:anuncio.descuento_gradehub_pct,codigo_descuento:anuncio.codigo_descuento}:{}),tipo:tipoElegido(),titulo:valorCampo('titulo').trim(),precio_clp:pesosDeTexto(valorCampo('precio')),pack_clases:valorCampo('pack').trim()===''?null:Number(valorCampo('pack')),
    modalidad:valorCampo('modalidad'),modalidad_otra:valorCampo('modalidad-otra').trim(),
    ubicacion:valorCampo('ubicacion'),ubicacion_otra:valorCampo('ubicacion-otra').trim(),
    detalles:leerDetalles(),linea_datos:[...lineaElegida]});
  const lineaParaGuardar=b=>{
    const claves=opcionesLineaClase(b).map(o=>o.clave);
    const elegidas=claves.filter(c=>lineaElegida.has(c)),omision=claves.filter(c=>LINEA_CLASE_POR_OMISION.includes(c));
    return elegidas.join()===omision.join()?null:elegidas;
  };
  const pintarLinea=b=>{
    if(!cajaLinea||typeof cajaLinea.querySelectorAll!=='function')return;
    const ops=opcionesLineaClase(b),firma=JSON.stringify(ops.map(o=>[o.clave,o.nombre,o.texto]));
    // Sin nada que elegir (un material sin detalles), no se muestra la pregunta.
    const cajaPregunta=campo('linea-caja');if(cajaPregunta)cajaPregunta.hidden=!ops.length;
    // Solo se rehace si cambiaron las opciones: marcar una casilla no le quita
    // el foco.
    if(firma!==firmaLinea){
      firmaLinea=firma;
      cajaLinea.innerHTML=ops.map(o=>`<label class="profesor-linea-opcion"><input type="checkbox" value="${esc(o.clave)}"><span><b>${esc(o.nombre)}</b> ${esc(o.texto)}</span></label>`).join('');
    }
    const marcadas=ops.filter(o=>lineaElegida.has(o.clave)).length;
    cajaLinea.querySelectorAll('input').forEach(i=>{i.checked=lineaElegida.has(i.value);i.disabled=!i.checked&&marcadas>=MAX_LINEA_CLASE;});
  };
  // Una casilla dispara input y después change, y el formulario repinta con
  // los dos: la elección se anota en el primero para que el repintado no
  // devuelva la casilla a como estaba.
  const anotarLinea=e=>{
    const i=e.target;if(!i||i.type!=='checkbox')return;
    if(i.checked)lineaElegida.add(i.value);else lineaElegida.delete(i.value);
  };
  if(cajaLinea){cajaLinea.addEventListener('input',anotarLinea);cajaLinea.addEventListener('change',anotarLinea);}
  const actualizarVista=()=>{
    const borrador=borradorEnVivo();
    pintarLinea(borrador);
    if(!vista||typeof vista.querySelectorAll!=='function')return;
    pintarVistaCatalogo(borrador);
    vista.querySelectorAll('.vista-anuncio').forEach(el=>{el.innerHTML=contenidoRecomendacionClase(borrador,{logoUrl:logoVista,vistaPrevia:true});});
    const sigla=valorCampo('siglas').split(',').map(x=>siglaAnuncio(x)).filter(Boolean)[0]||'';
    const nombre=sigla?(nombresRamosParaClases(valorCampo('tenant')||S.tenant)[sigla]||sigla):'Tu ramo';
    vista.querySelectorAll('.ramo-name').forEach(el=>{el.textContent=nombre;});
    vista.querySelectorAll('.ramo-sigla').forEach(el=>{el.textContent=sigla||'Sigla';});
  };
  // La tarjeta del catálogo, abierta, con el flyer que eligió (el guardado o el
  // que acaba de escoger, antes de subirlo). El botón no lleva a ninguna parte.
  let flyerVista='';
  const pintarVistaCatalogo=borrador=>{
    const caja=vista.querySelector('.vista-catalogo');
    if(!caja)return;
    const elegidas=valorCampo('siglas').split(',').map(x=>siglaAnuncio(x)).filter(Boolean);
    const siglasVista=elegidas.length?elegidas:['SIGLA'];
    const nombres=siglasVista.map(sg=>nombresRamosParaClases(valorCampo('tenant')||S.tenant)[sg]).filter(Boolean);
    caja.innerHTML=tarjetaCatalogoClase({...borrador,id:'vista-previa',titulo:borrador.titulo||'Tu clase',
      descripcion:valorCampo('descripcion').trim()||'Acá va la descripción de tu clase.',ramos_siglas:siglasVista,nombres_ramos:nombres,
      ...(t=>({contacto_tipo:t,contacto_valor:(v=>v&&v!==PREFIJO_CONTACTO_CLASE[t].trim()?v:EJEMPLO_CONTACTO_CLASE[t])(valorCampo('contacto').trim())}))(contactosPermitidosClase(pesosDeTexto(valorCampo('precio')),tipoElegido()).includes(valorCampo('contacto-tipo'))?valorCampo('contacto-tipo'):'whatsapp'),flyer_path:flyerVista?'vista-previa':null},{abierta:true});
    const flyer=caja.querySelector('.catalogo-clase-flyer');
    if(flyer){flyer.removeAttribute('data-flyer');flyer.hidden=false;flyer.innerHTML=`<img src="${esc(flyerVista)}" alt="">`;}
    if(logoVista){const cabeza=caja.querySelector('.catalogo-clase-cabeza');if(cabeza)cabeza.insertAdjacentHTML('beforeend',`<div class="catalogo-clase-logo">${imgLogoClase(logoVista)}</div>`);}
    caja.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.setAttribute('tabindex','-1');});
  };
  form.addEventListener('input',actualizarVista);form.addEventListener('change',actualizarVista);
  // El logo vive en la ficha: se pide una vez y se actualiza cuando lo cambian.
  if(!admin&&typeof document!=='undefined'&&document.addEventListener)document.addEventListener('gradehub:logo-profesor',e=>{
    if(!form.isConnected)return;logoVista=e.detail||'';actualizarVista();
  });
  campoPesos(campo('precio'));
  // La campaña: días y fecha de término se ajustan entre sí, y el resumen
  // traduce el tope a algo concreto.
  const inicioC=campo('inicio'),diasC=campo('dias'),finC=campo('fin'),topeC=campo('tope'),resumenC=campo('campana-resumen');
  campoPesos(topeC);
  const baseCampana=()=>valorCampo('inicio')||hoyChileClase();
  const ajustarFin=()=>{const d=Number(valorCampo('dias'));if(finC&&Number.isSafeInteger(d)&&d>0)finC.value=sumarDiasFechaClase(baseCampana(),d-1);};
  const ajustarDias=()=>{const n=diasEntreFechasClase(baseCampana(),valorCampo('fin'));if(diasC&&Number.isFinite(n)&&n>=0)diasC.value=String(n+1);};
  const resumirCampana=()=>{
    if(!resumenC)return;
    const d=Number(valorCampo('dias')),tope=pesosDeTexto(valorCampo('tope'));
    if(!Number.isSafeInteger(d)||d<1||!Number.isSafeInteger(tope)){resumenC.textContent='';return;}
    const porDias=d*TARIFA_CAMPANA.dia,queda=tope-porDias;
    resumenC.textContent=queda<=0
      ?`Tu tope alcanza para ${Math.floor(tope/TARIFA_CAMPANA.dia)} días: la clase dejará de mostrarse antes de terminar.`
      :`${d} ${d===1?'día':'días'} suman ${pesosClase(porDias)}. Te quedan ${pesosClase(queda)} para personas: por ejemplo ${Math.floor(queda/TARIFA_CAMPANA.contacto)} contactos, o ${new Intl.NumberFormat('es-CL').format(Math.floor(queda/TARIFA_CAMPANA.vista))} personas que la ven.`;
  };
  if(inicioC)inicioC.addEventListener('input',()=>{ajustarFin();resumirCampana();});
  if(diasC)diasC.addEventListener('input',()=>{ajustarFin();resumirCampana();});
  if(finC)finC.addEventListener('input',()=>{ajustarDias();resumirCampana();});
  if(topeC)topeC.addEventListener('input',resumirCampana);
  ajustarFin();resumirCampana();
  // No reemplazar una campaña existente por los valores por omisión si falla
  // su lectura. El guardado se habilita solo después de recuperarla.
  const reintentarCampana=campo('reintentar-campana');
  const cargarCampanaGuardada=async()=>{
    campanaLista=false;
    const controles=[diasC,inicioC,finC,topeC,campo('guardar'),campo('enviar')].filter(Boolean);
    controles.forEach(c=>c.disabled=true);
    if(reintentarCampana)reintentarCampana.hidden=true;
    estado.textContent='Recuperando los días y el tope de tu campaña…';
    try{
      const c=await leerCampanaClase(id,{estricto:true});
      if(!form.isConnected)return;
      if(c){
        if(diasC)diasC.value=String(c.dias);
        if(inicioC)inicioC.value=c.inicio&&c.inicio>=hoyChileClase()?c.inicio:'';
        if(topeC)topeC.value=textoPesosEscrito(c.tope_clp);
      }
      ajustarFin();resumirCampana();campanaLista=true;
      controles.forEach(c=>c.disabled=false);
      estado.textContent='Borrador recuperado. Puedes seguir editándolo.';
    }catch(e){
      if(!form.isConnected)return;
      estado.textContent='No pudimos recuperar tu campaña. Reintenta antes de guardar para conservar sus días y su tope.';
      if(reintentarCampana)reintentarCampana.hidden=false;
    }
  };
  if(reintentarCampana)reintentarCampana.addEventListener('click',cargarCampanaGuardada);
  if(id&&!admin)cargarCampanaGuardada();
  // "Otra…" abre su casilla de texto; cualquier otra opción la esconde.
  [['modalidad','modalidad-otra'],['ubicacion','ubicacion-otra']].forEach(([sel,texto])=>{
    const selector=campo(sel),caja=campo(texto);
    if(!selector||!caja)return;
    selector.addEventListener('change',()=>{caja.hidden=selector.value!=='otra';if(!caja.hidden&&typeof caja.focus==='function')caja.focus();});
  });
  const listaDetalles=campo('detalles'),agregarDetalle=campo('agregar-detalle');
  const filaDetalle=(d={})=>{
    if(!listaDetalles||typeof document==='undefined'||!document.createElement)return;
    const fila=document.createElement('div');fila.className='profesor-detalle';
    fila.innerHTML=`<input type="text" class="detalle-etiqueta" maxlength="${MAX_ETIQUETA_DETALLE}" placeholder="Duración" aria-label="Nombre del detalle" value="${esc(d.etiqueta||'')}">
      <input type="text" class="detalle-valor" maxlength="${MAX_VALOR_DETALLE}" placeholder="90 minutos" aria-label="Qué dice el detalle" value="${esc(d.valor||'')}">
      <button type="button" class="profesor-detalle-quitar" aria-label="Quitar este detalle">Quitar</button>`;
    fila.querySelector('.profesor-detalle-quitar').addEventListener('click',()=>{fila.remove();refrescarDetalles();actualizarVista();});
    listaDetalles.appendChild(fila);refrescarDetalles();
  };
  const refrescarDetalles=()=>{if(agregarDetalle&&listaDetalles&&listaDetalles.children)agregarDetalle.hidden=listaDetalles.children.length>=MAX_DETALLES_CLASE;};
  if(agregarDetalle)agregarDetalle.addEventListener('click',()=>{filaDetalle();const ultima=listaDetalles&&listaDetalles.lastElementChild;ultima&&ultima.querySelector('input').focus();});
  const leerDetalles=()=>listaDetalles&&typeof listaDetalles.querySelectorAll==='function'
    ?[...listaDetalles.querySelectorAll('.profesor-detalle')].map(f=>({etiqueta:f.querySelector('.detalle-etiqueta').value,valor:f.querySelector('.detalle-valor').value})):[];
  detallesClase(anuncio).forEach(d=>filaDetalle(d));
  actualizarVista();
  activarBuscadorRamosClase(form,campo);
  const cajaLogo=campo('logo');
  if(cajaLogo&&!pendiente&&!admin)renderLogoProfesor(cajaLogo);
  const avisarImagen=texto=>{const aviso=campo('imagenes-aviso');if(aviso&&aviso.isConnected)aviso.textContent+=(aviso.textContent?' ':'')+texto;};
  if(admin&&profesor&&profesor.logo_aprobado_path)urlFlyerClase(profesor.logo_aprobado_path).then(url=>{if(form.isConnected){logoVista=url||'';actualizarVista();if(!url)avisarImagen('El logo guardado no está disponible en esta vista. Se conserva en el anuncio.');}}).catch(()=>avisarImagen('No pudimos cargar el logo guardado. Se conserva en el anuncio.'));
  // WhatsApp parte con "+56 9 " escrito y se ordena con sus espacios. Si la
  // clase es gratis aparece el selector con Instagram y link de inscripción;
  // si deja de ser gratis, vuelve a WhatsApp.
  const contacto=campo('contacto'),tipoContacto=campo('contacto-tipo'),cajaTipo=campo('contacto-tipo-caja');
  const tipoActual=()=>{const t=tipoContacto?tipoContacto.value:'whatsapp';return contactosPermitidosClase(pesosDeTexto(valorCampo('precio')),tipoElegido()).includes(t)?t:'whatsapp';};
  formatearAlEscribir(contacto,texto=>{const t=tipoActual();return t==='whatsapp'?textoWhatsappEscrito(texto):t==='instagram'?textoInstagramEscrito(texto):texto;});
  const ayudaContacto={whatsapp:'Tu número no aparece en el anuncio. El estudiante te escribe con un botón y el chat parte con «Hola, vi tu clase … en GradeHub. ¿Me puedes dar más información?».',
    instagram:'El botón del anuncio abre tu perfil de Instagram.',enlace:'El botón «Inscribirme» abre este link en una pestaña nueva.'};
  const etiquetaContacto={whatsapp:'Tu WhatsApp',instagram:'Tu Instagram',enlace:'Link de inscripción'};
  let tipoMostrado=null;const escritoPorCanal={};
  let firmaOpciones='';
  const refrescarContacto=()=>{
    // El selector aparece cuando hay más de un canal: clase gratis o material.
    const opciones=opcionesContactoClase(pesosDeTexto(valorCampo('precio')),tipoElegido());
    if(cajaTipo)cajaTipo.hidden=opciones.length<2;
    const firma=opciones.map(o=>o.join(':')).join();
    if(tipoContacto&&firma!==firmaOpciones){
      const elegido=tipoContacto.value;firmaOpciones=firma;
      tipoContacto.innerHTML=opciones.map(([clave,texto])=>`<option value="${clave}"${clave===elegido?' selected':''}>${texto}</option>`).join('');
      if(!opciones.some(o=>o[0]===elegido))tipoContacto.value='whatsapp';
    }
    const t=tipoActual();
    const material=tipoElegido()==='material';
    etiquetaContacto.enlace=material?'Link para conseguirlo':'Link de inscripción';
    ayudaContacto.enlace=material?'El botón «Conseguir el material» abre este link en una pestaña nueva.':'El botón «Inscribirme» abre este link en una pestaña nueva.';
    if(t===tipoMostrado){
      const etiqueta=campo('contacto-etiqueta');if(etiqueta)etiqueta.textContent=etiquetaContacto[t];
      const ayuda=campo('contacto-ayuda');if(ayuda)ayuda.textContent=ayudaContacto[t];
      return;
    }
    if(t===tipoMostrado)return;
    // Cada canal guarda lo suyo: al pasar de WhatsApp a Instagram el número
    // no queda bajo "Tu Instagram", y al volver reaparece tal como estaba.
    if(tipoMostrado!==null&&contacto){
      escritoPorCanal[tipoMostrado]=String(contacto.value||'');
      contacto.value=escritoPorCanal[t]||PREFIJO_CONTACTO_CLASE[t];
    }
    tipoMostrado=t;
    if(contacto){contacto.placeholder=EJEMPLO_CONTACTO_CLASE[t];if(typeof contacto.setAttribute==='function')contacto.setAttribute('inputmode',t==='whatsapp'?'tel':t==='enlace'?'url':'text');}
    const etiqueta=campo('contacto-etiqueta');if(etiqueta)etiqueta.textContent=etiquetaContacto[t];
    const ayuda=campo('contacto-ayuda');if(ayuda)ayuda.textContent=ayudaContacto[t];
  };
  if(tipoContacto&&typeof tipoContacto.addEventListener==='function')tipoContacto.addEventListener('change',refrescarContacto);
  if(campo('precio')&&typeof campo('precio').addEventListener==='function')campo('precio').addEventListener('input',refrescarContacto);
  refrescarContacto();
  // Clase o material: un material no tiene formato, lugar ni pack, y su precio
  // es uno solo. Lo escondido no se borra: si vuelve a clase, sigue ahí.
  const aplicarTipo=()=>{
    const material=tipoElegido()==='material';
    const soloClase=campo('solo-clase');if(soloClase)soloClase.hidden=material;
    const titulo=campo('seccion-titulo');if(titulo)titulo.textContent=material?'1. Tu material':'1. Tu clase';
    const precio=campo('precio-etiqueta');if(precio)precio.textContent=material?'Precio del material':'Precio por clase';
    const ayudaPrecio=campo('precio-ayuda');if(ayudaPrecio)ayudaPrecio.textContent=`${material?'Si el material es gratis':'Si la clase es gratis'}, pon $0: se mostrará como "Gratis".`;
    const ayudaTipo=campo('tipo-ayuda');if(ayudaTipo)ayudaTipo.textContent=TEXTO_TIPO_ANUNCIO[material?'material':'clase'];
    const desc=campo('descripcion');if(desc)desc.placeholder=material
      ?'Qué trae (guías, apuntes, ejercicios resueltos), para qué parte del ramo y cómo se entrega.'
      :'Qué van a trabajar, cómo son tus clases y tu experiencia con el ramo.';
    refrescarContacto();actualizarVista();
  };
  if(typeof form.querySelectorAll==='function')form.querySelectorAll('input[name="pr-tipo"]').forEach(r=>r.addEventListener('change',aplicarTipo));
  aplicarTipo();
  const preview=form.querySelector('.profesor-flyer-preview');
  if(flyerActual)urlFlyerClase(flyerActual).then(url=>{if(url&&preview&&preview.isConnected){preview.querySelector('img').src=url;preview.hidden=false;flyerVista=url;actualizarVista();}else if(admin)avisarImagen('El flyer guardado no está disponible en esta vista. Se conserva en el anuncio.');}).catch(()=>{if(admin)avisarImagen('No pudimos cargar el flyer guardado. Se conserva en el anuncio.');});
  if(!admin)campo('flyer').addEventListener('change',()=>{
    const file=campo('flyer').files&&campo('flyer').files[0],validacion=validarFlyerClase(file);
    if(!validacion.ok){campo('flyer').value='';estado.textContent=validacion.error;return;}
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{if(!preview.isConnected)return;preview.querySelector('img').src=String(reader.result||'');preview.hidden=false;flyerVista=String(reader.result||'');actualizarVista();estado.textContent='Flyer listo para subir cuando guardes.';};
    reader.onerror=()=>{estado.textContent='No pudimos leer ese flyer. Elige otra imagen.';};
    reader.readAsDataURL(file);
  });
  if(!admin)form.querySelector('#pr-quitar-flyer').addEventListener('click',async()=>{
    if(!id||procesando)return;
    procesando=true;
    estado.textContent='Quitando flyer…';
    const resultado=await quitarFlyerClase(id);procesando=false;
    estado.textContent=resultado.ok?resultado.aviso||'Flyer quitado del borrador.':resultado.error;
    if(resultado.ok){flyerActual=null;campo('flyer').value='';preview.hidden=true;form.querySelector('#pr-quitar-flyer').hidden=true;flyerVista='';actualizarVista();}
  });
  // Un campo pendiente dentro de una sección cerrada no se puede mostrar:
  // se abre su sección antes de avisar o de llevar el foco ahí.
  const abrirSeccionDe=el=>{const d=el&&typeof el.closest==='function'?el.closest('details'):null;if(d)d.open=true;return el;};
  const enfocar=el=>{abrirSeccionDe(el);if(el&&typeof el.focus==='function')el.focus();};
  // Un número mal escrito se dice bajo su casilla, en rojo, y la pantalla se
  // lleva hasta ahí: el aviso de abajo del formulario solo no se ve en móvil.
  const errorContacto=campo('contacto-error');
  const marcarContacto=mensaje=>{
    const input=campo('contacto');
    if(errorContacto){errorContacto.textContent=mensaje;errorContacto.hidden=false;}
    if(input&&typeof input.setAttribute==='function')input.setAttribute('aria-invalid','true');
    enfocar(input);
    if(input&&typeof input.scrollIntoView==='function')input.scrollIntoView({block:'center'});
  };
  const limpiarContacto=()=>{
    if(errorContacto&&!errorContacto.hidden){errorContacto.hidden=true;errorContacto.textContent='';}
    const input=campo('contacto');if(input&&typeof input.removeAttribute==='function')input.removeAttribute('aria-invalid');
  };
  if(contacto&&typeof contacto.addEventListener==='function')contacto.addEventListener('input',limpiarContacto);
  const datosDelEditor=()=>({tipo:tipoElegido(),tenant:campo('tenant').value,ramos_siglas:campo('siglas').value.split(',').map(s=>s.trim()),
      criterios:{promedioMenorA:Number(campo('promedio').value),avanceMinimo:Number(campo('avance').value)},
      titulo:campo('titulo').value,descripcion:campo('descripcion').value,precio_clp:pesosDeTexto(campo('precio').value),
      pack_clases:campo('pack')?campo('pack').value.trim():'',
      modalidad:campo('modalidad').value,ubicacion:campo('ubicacion').value,
      modalidad_otra:campo('modalidad-otra')?campo('modalidad-otra').value:'',ubicacion_otra:campo('ubicacion-otra')?campo('ubicacion-otra').value:'',
      detalles:leerDetalles(),linea_datos:lineaParaGuardar(borradorEnVivo()),
      contacto_tipo:tipoActual(),contacto_valor:campo('contacto').value});
  const inicialesAdmin=admin?datosDelEditor():null;
  const procesar=async enviar=>{
    if(enviar&&(pendiente||admin))return;
    if(procesando||!campanaLista)return;
    if(typeof form.querySelectorAll==='function')[...form.querySelectorAll(':invalid')].forEach(abrirSeccionDe);
    if(!form.reportValidity())return;
    const file=!admin&&campo('flyer').files&&campo('flyer').files[0],validacion=validarFlyerClase(file);
    if(!validacion.ok){estado.textContent=validacion.error;campo('flyer').focus();return;}
    const campana=admin?{ok:true}:validarCampanaClase({dias:Number(valorCampo('dias')),inicio:valorCampo('inicio'),tope_clp:pesosDeTexto(valorCampo('tope'))});
    if(!campana.ok){estado.textContent=campana.error;enfocar(campo(campana.campo));return;}
    const datos=datosDelEditor();
    if(admin){
      const validado=validarBorradorClase(datos);
      if(!validado.ok){
        estado.textContent=validado.error;
        if(validado.campo==='contacto_valor')marcarContacto(validado.error);
        else {const mapa={ramos_siglas:'siglas-buscar',criterios:'promedio',precio_clp:'precio',pack_clases:'pack',contacto_tipo:'contacto-tipo',detalles:'agregar-detalle'};enfocar(campo(mapa[validado.campo]||validado.campo));}
        return;
      }
      // Mandar solo lo que se editó conserva valores heredados (por ejemplo,
      // criterios null = público general) aunque el formulario muestre defaults.
      const cambios=Object.fromEntries(Object.entries(validado.datos).filter(([k])=>JSON.stringify(datos[k])!==JSON.stringify(inicialesAdmin[k])));
      for(const [opcion,otra] of [['modalidad','modalidad_otra'],['ubicacion','ubicacion_otra']]){if(opcion in cambios||otra in cambios){cambios[opcion]=validado.datos[opcion];cambios[otra]=validado.datos[otra];}}
      if(!Object.keys(cambios).length){estado.textContent='No hay cambios para guardar.';return;}
      const guardar=async()=>{
        if(procesando||form.isConnected===false)return;
        procesando=true;campo('guardar').disabled=true;estado.textContent='Guardando cambios…';
        try{
          const {data,error}=await supabaseClient.rpc('admin_editar_anuncio',{p_anuncio_id:id,p_datos:cambios});
          if(error){estado.textContent=sqlClasesDesactualizado(error)?'Aplica administradores.sql para editar anuncios desde acá.':'No pudimos guardar los cambios. Revisa los datos e intenta de nuevo.';return;}
          if(data!==true){estado.textContent='No hubo cambios. Si esperabas guardar algo, vuelve a Anuncios y abre el anuncio de nuevo.';return;}
          sinGuardar=false;
          await volverAdmin();
          if(typeof showToast==='function')showToast('Anuncio actualizado');
        }catch(e){estado.textContent='No pudimos guardar los cambios. Revisa tu conexión e intenta de nuevo.';}
        finally{procesando=false;if(campo('guardar')&&campo('guardar').isConnected)campo('guardar').disabled=false;}
      };
      if(anuncio.estado==='publicado')showConfirm('¿Guardar los cambios?','Los estudiantes verán los cambios al tiro.',guardar,{label:'Guardar cambios',danger:false});
      else await guardar();
      return;
    }
    procesando=true;
    const botones=[form.querySelector('#pr-guardar'),form.querySelector('#pr-enviar')].filter(Boolean);botones.forEach(b=>b.disabled=true);
    estado.textContent='Guardando borrador…';
    try{
      const guardado=await guardarBorradorClase(datos,id);
      if(!guardado.ok){estado.textContent=guardado.error;if(guardado.campo==='contacto_valor'){marcarContacto(guardado.error);return;}if(guardado.campo){const mapa={ramos_siglas:'siglas-buscar',criterios:'promedio',precio_clp:'precio',pack_clases:'pack',contacto_tipo:'contacto-tipo',contacto_valor:'contacto',modalidad_otra:'modalidad-otra',ubicacion_otra:'ubicacion-otra',detalles:'agregar-detalle'};enfocar(campo(mapa[guardado.campo]||guardado.campo));}return;}
      id=guardado.anuncio.id;
      sinGuardar=false;
      const guardadaCampana=await guardarCampanaClase(id,campana.datos);
      if(!guardadaCampana.ok&&!guardadaCampana.falta){estado.textContent='Tu clase se guardó, pero '+(guardadaCampana.error||'no se guardaron los días y el tope. No se envió a revisión.');return;}
      if(file){estado.textContent='Borrador guardado. Subiendo flyer…';const subida=await subirFlyerClase(id,file);
        if(!subida.ok){estado.textContent='Borrador guardado, pero '+subida.error;return;}
        flyerActual=subida.path;campo('flyer').value='';form.querySelector('#pr-quitar-flyer').hidden=false;
      }
      if(enviar){estado.textContent='Enviando a revisión…';const respuesta=await enviarBorradorClase(id);
        if(!respuesta.ok){estado.textContent=respuesta.error;if(respuesta.campo==='contacto_valor')marcarContacto(respuesta.error);return;}
        raiz.innerHTML='<div class="modal-title" id="modal-titulo">En revisión</div><p class="profesor-info" role="status">Recibimos tu anuncio. Nadie lo verá hasta que GradeHub lo revise y apruebe.</p>'+(guardadaCampana.falta||respuesta.sqlAnterior?'<p class="profesor-info" role="status">Los días y el tope todavía no se guardaron. GradeHub debe confirmarlos contigo antes de publicar.</p>':'');return;
      }
      // Guardado entero: el formulario se cierra y el borrador aparece en la
      // lista. Si faltó algo (días y tope sin su SQL), se queda abierto con
      // el aviso, para que no se pierda de vista.
      if(guardadaCampana.falta){estado.textContent=(pendiente?'Borrador guardado. Podrás enviarlo a revisión cuando aprobemos tu postulación.':'Borrador guardado.')+' Los días y el tope aún no se guardaron; deben confirmarse antes de publicar.';return;}
      if(!pendiente)vistaClasesAlVolver='anuncios';
      await renderEspacioProfesor(raiz,{titulo:raiz.id==='modal-content'});
      if(typeof showToast==='function')showToast('Borrador guardado');
    }catch(e){estado.textContent='No pudimos completar la acción. Revisa si tu borrador quedó guardado e intenta de nuevo.';
    }finally{procesando=false;botones.forEach(b=>{if(b.isConnected)b.disabled=false;});}
  };
  form.addEventListener('submit',e=>{e.preventDefault();procesar(false);});
  form.querySelector('#pr-guardar').addEventListener('click',()=>procesar(false));
  // Volver sin guardar. Si se escribió algo, se pregunta antes: lo no
  // guardado se pierde.
  let sinGuardar=false;
  form.addEventListener('input',()=>{sinGuardar=true;});
  form.addEventListener('change',()=>{sinGuardar=true;});
  const salir=async()=>{
    if(admin){await volverAdmin();return;}
    if(!pendiente)vistaClasesAlVolver='anuncios';
    await renderEspacioProfesor(raiz,{titulo:raiz.id==='modal-content'});
  };
  const volver=raiz.querySelector('#pr-volver');
  if(volver)volver.addEventListener('click',()=>{
    if(procesando)return;
    if(!sinGuardar){salir();return;}
    showConfirm('¿Salir sin guardar?',admin?'Los cambios que hiciste se pierden. El anuncio queda como estaba.':id?'Los cambios que hiciste desde que guardaste se pierden. Tu borrador queda como estaba.':'Lo que escribiste se pierde.',
      salir,{label:'Salir sin guardar'});
  });
  const enviarBoton=form.querySelector('#pr-enviar');
  if(enviarBoton)enviarBoton.addEventListener('click',()=>procesar(true));
}

// ─── RECOMENDACIÓN EN INICIO ────────────────────────────────────────────────
//
// La segunda puerta de docs/marketplace-clases.md. Una clase cuyo público
// calza con uno de tus ramos aparece junto a ese ramo en Inicio, con su
// etiqueta de publicidad. Reglas que no se negocian:
//
// - Se decide en el navegador con `seleccionarClaseApoyo`: se descargan los
//   anuncios públicos de tu universidad y se comparan acá con tus ramos y notas.
//   Nada de eso viaja para elegir.
// - Solo en Inicio, nunca en la ficha del ramo, la Agenda ni el ingreso de notas.
// - Una en la mañana y una en la tarde (decisión de Lucas del 2026-09-25). Lo
//   único que gasta la franja es cerrarla con la X: recargar o volver a entrar
//   la muestra de nuevo, la misma clase (ajuste del 2026-09-26; antes recargar
//   la hacía desaparecer hasta la franja siguiente). La primera vez que cierras
//   una clase, se esconde hasta la próxima franja; la segunda vez, esa clase no
//   vuelve más en este dispositivo, y recién ahí se le dice.
// - No dice "reprobando" ni diagnostica: ofrece apoyo para el ramo.
// - El cierre y el día viven en `gradehub_marketplace_v1`, aparte de
//   gradehub_v1: apagar esto no toca el estado académico.
//
// RECOMENDACIONES_CLASES_ACTIVAS es el interruptor. Apagarlo esconde el banner
// sin tocar el catálogo, que es la puerta abierta a todos.
const RECOMENDACIONES_CLASES_ACTIVAS=true;
const CLAVE_MARKETPLACE='gradehub_marketplace_v1';
const MAX_DESCARTADOS_CLASES=200;

function leerEstadoMarketplace(){
  try{
    const v=JSON.parse(localStorage.getItem(CLAVE_MARKETPLACE)||'{}');
    return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }catch(e){return {};}
}
function guardarEstadoMarketplace(estado){
  try{localStorage.setItem(CLAVE_MARKETPLACE,JSON.stringify(estado));}catch(e){}
}
function diaLocalClases(ahora=Date.now()){
  const d=new Date(ahora);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// Mañana hasta las 14:00 y tarde desde ahí, en la hora del dispositivo.
const HORA_TARDE_CLASES=14;
function franjaClases(ahora=Date.now()){
  return diaLocalClases(ahora)+(new Date(ahora).getHours()<HORA_TARDE_CLASES?'-manana':'-tarde');
}
// Pura: recibe anuncios, ramos y el estado guardado, y devuelve la
// recomendación de esta franja (o null) junto con el estado que hay que guardar.
// Una apertura de la app = una carga de la página. Volver a Inicio dentro de la
// misma apertura no cambia el banner; abrir la app de nuevo muestra la
// siguiente de las clases que calzan (pedido de Lucas del 2026-09-30).
const VISITA_CLASES=Date.now().toString(36)+Math.random().toString(36).slice(2);
function recomendacionDelDia(anuncios,ramos,tenant,estado,ahora=Date.now(),visita=VISITA_CLASES){
  const franja=franjaClases(ahora),e=estado||{};
  // Cerrada con la X: hasta la próxima franja, aunque se vuelva a abrir.
  if(e.franja===franja&&e.cerrada)return {sel:null,estado:e};
  // Misma apertura: la misma clase, si sigue calzando. Si subiste una nota y
  // dejó de calzar, desaparece en vez de quedarse pegada.
  if(e.visita===visita&&e.anuncioId){
    const sel=seleccionarClaseApoyo((anuncios||[]).filter(a=>a&&a.id===e.anuncioId),ramos,tenant,{descartados:definitivasClases(e),ahora});
    return {sel,estado:e};
  }
  // Apertura nueva: la siguiente en la rotación. `aperturas` cuenta las que ya
  // mostraron algo, así que la primera vez sale la primera.
  const aperturas=Number.isSafeInteger(e.aperturas)&&e.aperturas>=0?e.aperturas:0;
  const sel=seleccionarClaseApoyo(anuncios,ramos,tenant,{descartados:definitivasClases(e),ahora,turno:aperturas});
  // Si no calza ninguna, no se anota nada: una clase publicada más tarde tiene
  // que poder aparecer.
  if(!sel)return {sel:null,estado:e};
  return {sel,estado:{...e,franja,visita,anuncioId:sel.anuncio.id,cerrada:false,aperturas:aperturas+1}};
}

// Las clases cerradas dos veces. La lista `descartados` de la versión anterior
// se ignora: ahí bastaba cerrarla una vez, y con la regla nueva eso no alcanza.
function definitivasClases(e){return Array.isArray(e&&e.descartadasDefinitivas)?e.descartadasDefinitivas:[];}
// Devuelve true si con este cierre la clase queda descartada para siempre.
function descartarRecomendacionClase(anuncioId,ahora=Date.now()){
  const estado=leerEstadoMarketplace();
  const cierres={...(estado.cierres&&typeof estado.cierres==='object'?estado.cierres:{})};
  cierres[anuncioId]=(Number(cierres[anuncioId])||0)+1;
  const definitiva=cierres[anuncioId]>=2;
  const descartadasDefinitivas=definitiva?[...new Set([...definitivasClases(estado),anuncioId])].slice(-MAX_DESCARTADOS_CLASES):definitivasClases(estado);
  guardarEstadoMarketplace({...estado,cierres,descartadasDefinitivas,franja:franjaClases(ahora),anuncioId:null,cerrada:true});
  return definitiva;
}

let anunciosRecomendacion={tenant:null,lista:null,pidiendo:false};
// afterLogin la llama antes de que Inicio exista, en paralelo con la lectura de
// las notas: así el aviso suele estar listo en el primer pintado y no aparece
// después empujando los ramos de abajo (eso es lo que mide el CLS). Quien la
// llama mientras el pedido sigue en vuelo queda esperando el mismo resultado.
function cargarAnunciosRecomendacion(tenant,alTerminar){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return;
  if(anunciosRecomendacion.pidiendo&&anunciosRecomendacion.tenant===tenant){
    anunciosRecomendacion.esperan.push(alTerminar);return;
  }
  const pedido={tenant,lista:null,pidiendo:true,esperan:[alTerminar]};
  anunciosRecomendacion=pedido;
  cargarAnunciosClases(tenant,{propagarError:true}).then(lista=>{
    if(anunciosRecomendacion!==pedido)return;
    anunciosRecomendacion={tenant,lista:Array.isArray(lista)?lista:[],pidiendo:false};
    pedido.esperan.forEach(fn=>fn());
  }).catch(()=>{
    if(anunciosRecomendacion===pedido)anunciosRecomendacion={tenant,lista:null,pidiendo:false};
    // Sin resultado confirmado no se cachea una lista vacía. La siguiente
    // entrada a Inicio vuelve a pedir anuncios sin consumir la recomendación.
  });
}

const RECOMENDACIONES_VISTAS=new Set();
function observarRecomendacionClase(banner,anuncio,sigla){
  const clave=claveMedicionClase(anuncio.id),doc=typeof document==='undefined'?null:document;
  if(typeof IntersectionObserver!=='function'||RECOMENDACIONES_VISTAS.has(clave))return;
  let timer=null,visible=false,registrando=false;
  const registrar=async()=>{
    timer=null;
    if(doc&&doc.visibilityState==='hidden'||!banner.isConnected||!visible||registrando||RECOMENDACIONES_VISTAS.has(clave))return;
    registrando=true;
    const alcance=await registrarAlcanceAnuncio(anuncio.id,'recomendacion');
    const metrica=alcance===null?null:await registrarMetricaAnuncio(anuncio.id,'impresion',sigla);
    registrando=false;
    if(alcance===null||metrica===null){
      if(banner.isConnected&&visible)timer=setTimeout(registrar,5000);
    }else{RECOMENDACIONES_VISTAS.add(clave);obs.disconnect();if(doc&&doc.removeEventListener)doc.removeEventListener('visibilitychange',alCambiarVisibilidad);}
  };
  const obs=new IntersectionObserver(entradas=>{
    const e=entradas[entradas.length-1];
    if(e.isIntersecting&&e.intersectionRatio>=IMPRESION_VISIBLE){
      visible=true;
      if((!doc||doc.visibilityState!=='hidden')&&!timer&&!registrando)timer=setTimeout(registrar,IMPRESION_MS);
    }else{visible=false;if(timer){clearTimeout(timer);timer=null;}}
  },{threshold:[IMPRESION_VISIBLE]});
  const alCambiarVisibilidad=()=>{
    if(timer){clearTimeout(timer);timer=null;}
    if(!banner.isConnected){obs.disconnect();if(doc&&doc.removeEventListener)doc.removeEventListener('visibilitychange',alCambiarVisibilidad);return;}
    if((!doc||doc.visibilityState!=='hidden')&&visible&&!registrando&&!RECOMENDACIONES_VISTAS.has(clave))timer=setTimeout(registrar,IMPRESION_MS);
  };
  if(doc&&doc.addEventListener)doc.addEventListener('visibilitychange',alCambiarVisibilidad);
  obs.observe(banner);
}

// La llama renderHome después de pintar los ramos. Si los anuncios todavía no
// llegan, los pide y vuelve a pintar solo el banner cuando llegan.
// La línea bajo el título: formato, lugar y precio, lo que el profesor llenó.
// Los datos que pueden ir bajo el título, en el orden en que se muestran.
function opcionesLineaClase(anuncio){
  const a=anuncio||{},out=[];
  const mod=textoOpcionClase(MODALIDADES_CLASE,a.modalidad,a.modalidad_otra);
  if(mod)out.push({clave:'modalidad',nombre:'Formato',texto:mod});
  const ubi=textoOpcionClase(UBICACIONES_CLASE,a.ubicacion,a.ubicacion_otra);
  if(ubi)out.push({clave:'ubicacion',nombre:'Dónde',texto:ubi});
  detallesClase(a).forEach(d=>out.push({clave:'detalle:'+d.etiqueta.trim(),nombre:d.etiqueta.trim(),texto:d.valor.trim()}));
  return out;
}
function lineaDatosClase(a){
  const elegidas=Array.isArray(a&&a.linea_datos)?a.linea_datos:LINEA_CLASE_POR_OMISION;
  return opcionesLineaClase(a).filter(o=>elegidas.includes(o.clave)).slice(0,MAX_LINEA_CLASE).map(o=>o.texto).join(' · ');
}
// El mismo contenido para el banner de Inicio y para la vista previa que ve el
// profesor al armar su clase: lo que ve uno es exactamente lo que verá el otro.
function contenidoRecomendacionClase(anuncio,{logoUrl='',vistaPrevia=false}={}){
  const a=anuncio||{},linea=lineaDatosClase(a);
  return `<button type="button" class="clase-apoyo-abrir"${vistaPrevia?' tabindex="-1" aria-hidden="true"':''}>
      <span class="clase-apoyo-texto">
        <span class="ca-cabeza"><small>Publicidad · ${etiquetaTipoClase(a)}</small><strong>${esc(a.titulo||(esMaterialClase(a)?'Tu material':'Tu clase'))}</strong></span>
        <span class="ca-pie">${linea||(vistaPrevia&&!esMaterialClase(a))?`<span class="clase-apoyo-datos">${esc(linea||'Formato · Lugar')}</span>`:''}<span class="clase-apoyo-ver">${esMaterialClase(a)?'Ver material':'Ver clase'} ›</span></span>
      </span>
    </button>
    <span class="clase-apoyo-logo" aria-hidden="true"${logoUrl?'':' hidden'}>${logoUrl?imgLogoClase(logoUrl):''}</span>
    <button type="button" class="clase-apoyo-cerrar" aria-label="No mostrar esta clase"${vistaPrevia?' tabindex="-1"':''}>
      <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>`;
}

function pintarRecomendacionClase(contenedor){
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor()){
    if(contenedor)contenedor.querySelectorAll('.clase-apoyo').forEach(b=>b.remove());
    if(contenedor)contenedor.querySelectorAll('.tiene-clase-apoyo').forEach(f=>{f.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');f.style.removeProperty('--info-mitad');});
    return;
  }
  if(!RECOMENDACIONES_CLASES_ACTIVAS||!contenedor||!currentUser||!supabaseClient||!S||!S.tenant)return;
  contenedor.querySelectorAll('.clase-apoyo').forEach(b=>b.remove());
  contenedor.querySelectorAll('.tiene-clase-apoyo').forEach(f=>{f.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');f.style.removeProperty('--info-mitad');});
  if(anunciosRecomendacion.tenant!==S.tenant||anunciosRecomendacion.lista===null){
    cargarAnunciosRecomendacion(S.tenant,()=>{if(contenedor.isConnected)pintarRecomendacionClase(contenedor);});
    return;
  }
  const {sel,estado}=recomendacionDelDia(anunciosRecomendacion.lista,S.ramos,S.tenant,leerEstadoMarketplace());
  guardarEstadoMarketplace(estado);
  if(!sel)return;
  const fila=[...contenedor.querySelectorAll('.ramo-row')].find(f=>f.dataset.ramoId===String(sel.ramo.id));
  if(!fila)return;
  const {anuncio,ramo}=sel,sigla=siglaRamoParaClases(ramo);
  const banner=document.createElement('aside');
  banner.className='clase-apoyo';
  banner.setAttribute('aria-label','Publicidad: clase particular');
  banner.innerHTML=contenidoRecomendacionClase(anuncio);
  banner.querySelector('.clase-apoyo-abrir').addEventListener('click',()=>{
    registrarInteraccionMedida(anuncio.id,'apertura',sigla);
    abrirClaseRecomendada(anuncio,ramo,sigla);
  });
  banner.querySelector('.clase-apoyo-cerrar').addEventListener('click',()=>{
    const definitiva=descartarRecomendacionClase(anuncio.id);
    fila.classList.remove('tiene-clase-apoyo','junto-der','junto-izq');
    banner.remove();
    if(definitiva&&typeof showToast==='function')showToast('Listo, no te la volvemos a mostrar');
  });
  // El logo del profesor, si tiene uno aprobado. Llega después: el banner no
  // espera a Storage para aparecer, y sin logo simplemente no se muestra.
  logosDeAnuncios([anuncio.id]).then(async logos=>{
    const ruta=logos.get(anuncio.id),caja=banner.querySelector('.clase-apoyo-logo');
    if(!ruta||!caja)return;
    const url=await urlFlyerClase(ruta);
    if(!url||!banner.isConnected)return;
    caja.innerHTML=imgLogoClase(url);caja.hidden=false;
  }).catch(()=>{});
  fila.classList.add('tiene-clase-apoyo');
  // En el DOM el banner va siempre justo después de su ramo: así se lee en
  // orden y en celular (una columna) queda pegado debajo. En la grilla se
  // ubica aparte, en colocarRecomendacionEnGrilla.
  fila.after(banner);
  alinearRecomendacionConRamo(contenedor,fila,banner,{colocar:true});
  observarRecomendacionClase(banner,anuncio,sigla);
}

// En la grilla el ramo y su clase se estiran al alto de la fila. El texto de
// los dos queda centrado, y el título de la clase se alinea con el nombre del
// ramo y sus datos con la sigla. Se mide en pantalla porque un nombre de ramo
// puede ocupar una o dos líneas; se vuelve a medir si cambia el tamaño.
// En la grilla de escritorio la clase ocupa UNA casilla junto a su ramo: la
// de la derecha, o la de la izquierda si el ramo está en la última columna.
// Ramo y clase se fijan en su fila y columna, y el resto de los ramos fluye
// alrededor; el ramo queda exactamente donde estaba sin la clase.
//
// Antes se metía el banner antes o después del ramo en el DOM, con las
// columnas contadas una sola vez. Con el ramo en la última columna, meterlo
// antes empujaba al ramo a la fila siguiente, y la clase quedaba lejos de su
// ramo, con el texto encima de otro (pasó el 2026-09-26 con Dinámica en la
// tercera columna). Ahora se recalcula si cambia el ancho.
function columnasGrillaRamos(contenedor){
  try{
    const cs=getComputedStyle(contenedor);
    if(cs.display!=='grid')return 1;
    // Con la grilla dibujada el valor viene en píxeles, una por columna. Sin
    // dibujar (pantalla oculta) viene como la regla escrita: no se adivina.
    const t=String(cs.gridTemplateColumns||'').trim();
    return /^[\d.]+px( [\d.]+px)*$/.test(t)?t.split(' ').length:0;
  }catch(e){return 1;}
}
function colocarRecomendacionEnGrilla(contenedor,fila,banner){
  const columnas=columnasGrillaRamos(contenedor);
  if(!columnas)return;
  const casillas=[...contenedor.children].filter(el=>el!==banner);
  const i=casillas.indexOf(fila);
  const derecha=columnas>1&&i>=0&&i%columnas<columnas-1;
  const enGrilla=columnas>1&&i>=0;
  banner.classList.toggle('en-casilla',enGrilla);
  banner.classList.toggle('a-la-derecha',enGrilla&&derecha);
  banner.classList.toggle('a-la-izquierda',enGrilla&&!derecha);
  fila.classList.toggle('junto-der',enGrilla&&derecha);
  fila.classList.toggle('junto-izq',enGrilla&&!derecha);
  if(!enGrilla){['--ca-fila','--ca-col-ramo','--ca-col-clase'].forEach(v=>{fila.style.removeProperty(v);banner.style.removeProperty(v);});return;}
  const filaGrilla=Math.floor(i/columnas)+1,col=i%columnas+1;
  [fila,banner].forEach(el=>el.style.setProperty('--ca-fila',String(filaGrilla)));
  fila.style.setProperty('--ca-col-ramo',String(col));
  banner.style.setProperty('--ca-col-clase',String(derecha?col+1:col-1));
}

function alinearRecomendacionConRamo(contenedor,fila,banner,{colocar=false}={}){
  let obs=null;
  const medir=()=>{
    if(!banner.isConnected||!fila.isConnected){if(obs)obs.disconnect();return;}
    if(colocar)colocarRecomendacionEnGrilla(contenedor,fila,banner);
    const info=fila.querySelector('.ramo-info');
    if(info)fila.style.setProperty('--info-mitad',(info.offsetHeight/2)+'px');
    const nombre=fila.querySelector('.ramo-name'),meta=fila.querySelector('.ramo-meta');
    const cabeza=banner.querySelector('.ca-cabeza strong'),pie=banner.querySelector('.clase-apoyo-datos');
    banner.style.setProperty('--ajuste-titulo','0px');banner.style.setProperty('--ajuste-datos','0px');
    // En la vista previa del profesor la grilla va achicada: las distancias en
    // pantalla se pasan a las de la tarjeta sin achicar.
    const escala=(fila.offsetWidth&&fila.getBoundingClientRect().width/fila.offsetWidth)||1;
    if(nombre&&cabeza)banner.style.setProperty('--ajuste-titulo',Math.round((nombre.getBoundingClientRect().top-cabeza.getBoundingClientRect().top)/escala)+'px');
    if(meta&&pie)banner.style.setProperty('--ajuste-datos',Math.round((meta.getBoundingClientRect().top-pie.getBoundingClientRect().top)/escala)+'px');
  };
  if(typeof ResizeObserver==='function'){obs=new ResizeObserver(medir);obs.observe(contenedor);}
  requestAnimationFrame(medir);
}

async function abrirClaseRecomendada(anuncio,ramo,sigla){
  const raiz=document.getElementById('modal-content');
  if(!raiz)return;
  logosCatalogoClases=await logosDeAnuncios([anuncio.id]);
  raiz.innerHTML=`<div class="catalogo-clases">
      <div class="catalogo-clases-head"><div><div class="modal-title" id="modal-titulo">Clase particular</div></div><button type="button" class="settings-cerrar" onclick="closeModal()">Cerrar</button></div>
      <div class="catalogo-clases-resultados">${tarjetaCatalogoClase(anuncio,{sigla,abierta:true})}</div>
      <button type="button" class="btn-cancel clase-apoyo-mas" onclick="openCatalogoClases()">Ver todas las clases</button>
    </div>`;
  activarTarjetasClases(raiz);
  openModal();
}

if(typeof document!=='undefined'){
  const entradaProfesor=document.getElementById('um-profesor');
  if(entradaProfesor)entradaProfesor.addEventListener('click',()=>umGo(openEspacioProfesor));
}

// ─── ADMINISTRACIÓN DE CLASES ───────────────────────────────────────────────
//
// Una pestaña que aparece solo en cuentas de admin.administradores (pedido de
// Lucas del 2026-09-25). Que aparezca o no es cosmético: cada dato y cada
// acción pasa por funciones del servidor que exigen estar en la lista Y haber
// entrado con el segundo factor (supabase/administradores.sql). Por eso la
// página parte por renderPuertaDosPasos.
let soyAdministradorCache=false,sesionMarketplaceVersion=0;
async function cargarSoyAdministrador(){
  if(!supabaseClient||!currentUser)return false;
  const cuenta=sesionProfesorClase(),version=sesionMarketplaceVersion;
  try{
    const {data,error}=await supabaseClient.rpc('soy_administrador');
    if(cuenta!==sesionProfesorClase()||version!==sesionMarketplaceVersion)return false;
    soyAdministradorCache=!error&&data===true;
  }catch(e){if(cuenta===sesionProfesorClase()&&version===sesionMarketplaceVersion)soyAdministradorCache=false;}
  return soyAdministradorCache;
}
function esAdministrador(){return soyAdministradorCache;}
// Al cerrar sesión, lo que se sabía de la cuenta anterior se olvida: si no, quien
// entra después en el mismo navegador sin recargar hereda sus pestañas de
// profesor y de administración y su ficha de profesor en pantalla (reportado
// el 2026-09-30 al crear una cuenta nueva tras usar la de admin).
function olvidarSesionMarketplace(){
  sesionMarketplaceVersion++;
  olvidarEncuestas();
  soyAdministradorCache=false;
  vistaAdmin={area:'anuncios',seccion:'campanas',busqueda:'',estado:''};
  olvidarPerfilProfesor();
  anunciosRecomendacion={tenant:null,lista:null,pidiendo:false};
}

async function renderAdmin(){
  const raiz=document.getElementById('admin-body');
  if(!raiz)return;
  if(typeof renderPuertaDosPasos!=='function'){raiz.innerHTML='<p class="profesor-info">No disponible.</p>';return;}
  await renderPuertaDosPasos(raiz,{titulo:'Entra con tu segundo factor',alPasar:()=>pintarPanelAdmin(raiz)});
}

// Qué pasa con un anuncio hoy, en palabras de quien administra.
function estadoAdminAnuncio(a,costo,ahora=Date.now()){
  const vig=vigenciaAnuncio(a,ahora);
  return [(ESTADOS_ANUNCIO[vig]||[vig])[0],vig];
}
function resumenAdminClases(profesores,ahora=Date.now()){
  const r={profesores:0,pendientes:0,suspendidos:0,activas:0,programadas:0,revision:0,gastado:0,cobrado:0,deuda:0};
  for(const p of profesores||[]){
    if(p.estado==='aprobado')r.profesores++;else if(p.estado==='pendiente')r.pendientes++;else if(p.estado==='suspendido')r.suspendidos++;
    for(const a of p.anuncios||[]){
      const vig=vigenciaAnuncio(a,ahora),costo=costoCampanaClase(a.campana);
      if(vig==='publicado')r.activas++;else if(vig==='programado')r.programadas++;else if(vig==='en_revision')r.revision++;
      if(costo)r.gastado+=costo.total;
      const cobros=Array.isArray(a.cobros)?a.cobros:(a.cobro?[a.cobro]:[]);
      for(const c of cobros){
        if(c.estado==='cobrado')r.cobrado+=c.monto_clp;
        if(c.estado==='deuda')r.deuda+=c.monto_clp;
      }
    }
  }
  return r;
}
function editorCobroAdmin(anuncioId,publicadoAt,estado,monto){
  return `<div class="admin-cobro" data-admin-cobro="${esc(anuncioId)}" data-publicado-at="${esc(publicadoAt)}"><span>Cobro</span>
    <select data-cobro-estado aria-label="Estado del cobro">${[['pendiente','Pendiente'],['cobrado','Cobrado'],['deuda','En deuda']].map(([v,t])=>`<option value="${v}"${v===estado?' selected':''}>${t}</option>`).join('')}</select>
    <input type="text" inputmode="numeric" data-cobro-monto aria-label="Monto" value="${esc(textoPesosEscrito(monto))}">
    <button type="button" class="clase-accion" data-cobro-guardar>Guardar</button></div>`;
}
function revisionAdminAnuncioHTML(a,profesor){
  const c=a.configuracion_campana,listaCampana=c&&Number.isInteger(c.dias)&&Number.isInteger(c.tope_clp);
  const criterios=a.criterios||{},detalles=detallesClase(a);
  const dato=(nombre,valor)=>`<div><dt>${nombre}</dt><dd>${esc(valor||'No indicado')}</dd></div>`;
  const contacto=[a.contacto_tipo,a.contacto_valor].filter(Boolean).join(' · ');
  const inicio=c&&c.inicio?new Date(c.inicio+'T12:00:00').toLocaleDateString('es-CL'):'Al aprobar';
  return `<section class="admin-revision" aria-label="Revisión de ${esc(a.titulo||'anuncio')}">
    <h4>Revisa el anuncio completo</h4>
    <p class="admin-revision-descripcion">${esc(a.descripcion||'Sin descripción')}</p>
    <dl class="admin-revision-datos">
      ${dato('Profesor',profesor&&profesor.nombre)}${dato('Universidad',a.tenant&&a.tenant.toUpperCase())}
      ${dato('Ramos',(a.ramos_siglas||[]).join(' · '))}${dato('Precio',precioClase(a))}
      ${dato('Formato',formatoClase(a))}${dato('Contacto',contacto)}
      ${dato('Público',criterios.promedioMenorA!=null&&criterios.avanceMinimo!=null?`Promedio menor a ${Number(criterios.promedioMenorA).toLocaleString('es-CL')} · desde ${criterios.avanceMinimo}% evaluado`:'General')}
      ${dato('Campaña',listaCampana?`${c.dias} días · parte ${inicio} · tope ${pesosClase(c.tope_clp)}`:'Sin días ni tope configurados')}
      ${detalles.map(d=>dato(d.etiqueta,d.valor)).join('')}
    </dl>
    ${a.flyer_path?`<div class="admin-revision-flyer" data-admin-flyer="${esc(a.flyer_path)}" role="status">Cargando flyer…</div>`:''}
    ${!listaCampana?'<p class="profesor-info" role="alert">Este anuncio heredado no tiene días ni tope. Configura la campaña antes de publicarlo desde el panel.</p>':''}
    <div class="admin-revision-acciones">
      <button type="button" class="btn-confirm" data-admin-publicar="${esc(a.id)}"${listaCampana?'':' disabled'}>Publicar anuncio</button>
      <label>Comentario para el profesor<textarea data-admin-comentario="${esc(a.id)}" maxlength="1000" placeholder="Qué debe corregir antes de volver a enviarlo"></textarea></label>
      <button type="button" class="clase-accion" data-admin-devolver="${esc(a.id)}">Devolver con comentario</button>
      <button type="button" class="clase-accion admin-revision-borrar" data-admin-borrar="${esc(a.id)}">Borrar anuncio</button>
    </div>
  </section>`;
}
// El descuento es de GradeHub: el profesor conserva solo lectura.
function descuentoAdminPct(a){
  const pct=a&&a.descuento_gradehub_pct;
  return Number.isInteger(pct)&&pct>=1&&pct<=50?pct:null;
}
function editorDescuentoAdminHTML(a,estado='cargando',conCodigo=false){
  const pct=descuentoAdminPct(a),id=esc(a.id),campo=`admin-descuento-${id}`,codigo=pct===null?null:codigoDescuentoClase(a);
  const aviso=estado==='sin-sql'?'Aplica administradores.sql para editar el descuento desde acá'
    :estado==='error'?'No pudimos comprobar si se puede editar el descuento. Vuelve a abrir el panel para intentarlo de nuevo.'
    :'Comprobando edición del descuento…';
  return `<h4>Descuento por venir de GradeHub</h4>
    <p class="admin-descuento-actual">Actual: <b>${pct===null?'Sin descuento':esc(textoDescuentoClase({descuento:pct,codigo}).replace(/^−/,''))}</b></p>
    ${estado!=='listo'?`<p class="profesor-info" role="status">${aviso}</p>`:
      `<label for="${campo}">Descuento · %</label>
      <input id="${campo}" type="number" min="1" max="50" step="1" inputmode="numeric" data-descuento-pct value="${pct===null?'':pct}" aria-describedby="${campo}-ayuda ${campo}-error">
      <p class="profesor-info" id="${campo}-ayuda">De 1 a 50%. Lo fija GradeHub, no el profesor.</p>
      ${conCodigo?`<label for="${campo}-codigo">Código · opcional</label><input id="${campo}-codigo" class="admin-descuento-codigo" type="text" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej. GRADEHUB" data-descuento-codigo value="${esc(codigo||'')}" aria-describedby="${campo}-codigo-ayuda ${campo}-error">
      <p class="profesor-info" id="${campo}-codigo-ayuda">El anuncio dirá «−N% con el código …». De 3 a 20 letras o números.</p>`:''}
      <div class="admin-descuento-controles">
        <button type="button" class="accion-principal" data-descuento-guardar>Guardar</button>
        ${pct===null?'':'<button type="button" class="clase-accion" data-descuento-quitar>Quitar</button>'}
      </div>
      <p class="profesor-info" id="${campo}-error" data-descuento-error role="alert"></p>`}`;
}
async function enlazarDescuentosAdmin(raiz,anuncios,llamar){
  const bloques=[...raiz.querySelectorAll('[data-admin-descuento]')];
  if(!bloques.length)return;
  let estado='listo';
  try{
    // Una consulta sin anuncio siempre devuelve false: detecta la función sin
    // editar datos ni generar acciones. Nunca probar con un anuncio real.
    const {error}=await supabaseClient.rpc('admin_descuento_anuncio',{p_anuncio_id:null,p_pct:null});
    if(error)estado=sqlClasesDesactualizado(error)?'sin-sql':'error';
  }catch(e){estado='error';}
  // El código llegó después (2026-10-25): sin su SQL, el bloque sigue igual.
  let conCodigo=false;
  if(estado==='listo')try{
    const {error}=await supabaseClient.rpc('admin_descuento_codigo_anuncio',{p_anuncio_id:null,p_pct:null,p_codigo:null});
    conCodigo=!error;
  }catch(e){}
  bloques.forEach(bloque=>{
    if(bloque.isConnected===false)return;
    const a=anuncios.get(bloque.dataset.adminDescuento);if(!a)return;
    bloque.innerHTML=editorDescuentoAdminHTML(a,estado,conCodigo);
    if(estado!=='listo')return;
    const campo=bloque.querySelector('[data-descuento-pct]'),error=bloque.querySelector('[data-descuento-error]');
    const campoCodigo=bloque.querySelector('[data-descuento-codigo]');
    if(campoCodigo)campoCodigo.addEventListener('input',()=>{campoCodigo.value=campoCodigo.value.toUpperCase().replace(/\s+/g,'');campoCodigo.removeAttribute('aria-invalid');error.textContent='';});
    const guardar=bloque.querySelector('[data-descuento-guardar]'),quitar=bloque.querySelector('[data-descuento-quitar]');
    let pendiente=false;
    campo.addEventListener('input',()=>{campo.removeAttribute('aria-invalid');error.textContent='';});
    const aplicar=async(pct,codigo=null)=>{
      if(pendiente||bloque.isConnected===false)return;
      pendiente=true;
      const controles=[campo,campoCodigo,guardar,quitar].filter(Boolean);controles.forEach(b=>{b.disabled=true;});
      try{
        await llamar(campoCodigo?'admin_descuento_codigo_anuncio':'admin_descuento_anuncio',
          campoCodigo?{p_anuncio_id:a.id,p_pct:pct,p_codigo:pct===null?null:codigo}:{p_anuncio_id:a.id,p_pct:pct},pct===null?'Descuento quitado':'Descuento guardado',e=>{
          if(!sqlClasesDesactualizado(e))return false;
          // También cubre que el SQL deje de estar disponible tras la consulta.
          bloques.forEach(c=>{if(c.isConnected!==false){const anuncio=anuncios.get(c.dataset.adminDescuento);if(anuncio)c.innerHTML=editorDescuentoAdminHTML(anuncio,'sin-sql');}});
          return true;
        });
      }finally{pendiente=false;controles.forEach(b=>{if(b.isConnected!==false)b.disabled=false;});}
    };
    const confirmar=(pct,codigo=null)=>{
      if(a.estado!=='publicado')return aplicar(pct,codigo);
      showConfirm(pct===null?'¿Quitar el descuento?':'¿Guardar el descuento?',
        pct===null?'Los estudiantes verán el precio sin descuento desde ahora.':`Los estudiantes verán el precio con −${pct}%${codigo?` con el código ${codigo}`:''} desde ahora.`,
        ()=>aplicar(pct,codigo),{label:pct===null?'Quitar':'Guardar',danger:false});
    };
    guardar.addEventListener('click',()=>{
      if(pendiente)return;
      const texto=String(campo.value||'').trim(),pct=Number(texto);
      if(!/^\d+$/.test(texto)||!Number.isInteger(pct)||pct<1||pct>50){
        error.textContent='Escribe un porcentaje entero entre 1 y 50.';campo.setAttribute('aria-invalid','true');campo.focus();return;
      }
      const codigo=campoCodigo?campoCodigo.value.trim().toUpperCase()||null:null;
      if(codigo&&!/^[A-Z0-9][A-Z0-9_-]{2,19}$/.test(codigo)){
        error.textContent='El código va de 3 a 20 letras o números, sin espacios.';campoCodigo.setAttribute('aria-invalid','true');campoCodigo.focus();return;
      }
      return confirmar(pct,codigo);
    });
    if(quitar)quitar.addEventListener('click',()=>confirmar(null));
  });
}
// La consulta sin anuncio es un no-op con MFA: nunca prueba con datos reales.
async function enlazarEdicionAdmin(raiz,profesores,volver){
  const cajas=[...raiz.querySelectorAll('[data-admin-edicion]')];
  if(!cajas.length)return;
  try{
    const {error}=await supabaseClient.rpc('admin_editar_anuncio',{p_anuncio_id:null,p_datos:{}});
    if(error)return;
    cajas.forEach(caja=>{
      if(caja.isConnected===false)return;
      const profesor=profesores.find(p=>(p.anuncios||[]).some(a=>a.id===caja.dataset.adminEdicion));
      const anuncio=profesor&&(profesor.anuncios||[]).find(a=>a.id===caja.dataset.adminEdicion);
      if(!anuncio)return;
      caja.innerHTML='<button type="button" class="clase-accion">Editar anuncio</button>';
      caja.querySelector('button').addEventListener('click',()=>{
        renderBorradorProfesor(raiz,anuncio,{admin:true,profesor,volverAdmin:async()=>{
          await volver();
          const caja=[...raiz.querySelectorAll('[data-admin-edicion]')].find(c=>c.dataset.adminEdicion===anuncio.id);
          if(caja){const fila=caja.closest('details');if(fila)fila.open=true;const boton=caja.querySelector('button');if(boton)boton.focus();}
        }});
        const titulo=raiz.querySelector('#profesor-titulo');
        if(titulo){titulo.setAttribute('tabindex','-1');titulo.focus();}
      });
    });
  }catch(e){}
}
function filaAdminAnuncio(a,ahora=Date.now()){
  const costo=costoCampanaClase(a.campana),[estado,clase]=estadoAdminAnuncio(a,costo,ahora);
  const vig=vigenciaAnuncio(a,ahora),publicado=!!a.publicado_at;
  const cobro=a.cobro&&a.cobro.estado||'pendiente',monto=a.cobro?a.cobro.monto_clp:(costo?costo.total:0);
  const fecha=t=>t?new Date(t).toLocaleDateString('es-CL',{day:'numeric',month:'short'}):'';
  const anteriores=(a.cobros||[]).filter(c=>c.publicado_at!==a.publicado_at);
  return `<article class="admin-anuncio" data-admin-anuncio="${esc(a.id)}">
    <div class="admin-anuncio-top"><strong>${esc(a.titulo||'Sin título')}</strong><span class="clase-estado clase-estado-${esc(clase)}">${esc(estado)}</span></div>
    <p class="clase-card-meta">${esc((a.ramos_siglas||[]).join(' · '))} · ${esc(precioClase(a))}${publicado?` · ${fecha(a.publicado_at)} → ${fecha(a.vence_at)}`:''}</p>
    ${costo?`<p class="admin-anuncio-costo"><b>${pesosClase(costo.total)}</b>${costo.tope!==null?` de ${pesosClase(costo.tope)}`:' · sin tope'}</p>
      <p class="clase-sin-datos">${esc(lineaCostoCampanaClase(costo))}</p>`:''}
    ${vig==='expirado'?'<p class="admin-lista-cobro">Campaña terminada · lista para revisar y registrar el cobro.</p>':''}
    ${vig==='eliminado'&&publicado?'<p class="admin-lista-cobro">Anuncio borrado de la revisión. Esta publicación anterior se conserva para el cobro.</p>':''}
    <div class="admin-anuncio-acciones">
      ${['borrador','en_revision','publicado','pausado'].includes(a.estado)?`<span data-admin-edicion="${esc(a.id)}"></span>`:''}
      <button type="button" class="clase-accion" data-admin-estadisticas="${esc(a.id)}" aria-controls="admin-estadisticas-${esc(a.id)}" aria-expanded="false">Ver estadísticas</button>
      ${publicado?editorCobroAdmin(a.id,a.publicado_at,cobro,monto):''}
      ${vig==='publicado'||vig==='programado'?`<button type="button" class="clase-accion" data-admin-pausar="${esc(a.id)}">Pausar aviso</button>`:''}
      ${vig==='pausado'&&publicado?`<button type="button" class="clase-accion" data-admin-terminar="${esc(a.id)}" data-publicado-at="${esc(a.publicado_at)}">Terminar campaña y dejar lista para cobro</button>`:''}
    </div>
    <section class="admin-descuento" data-admin-descuento="${esc(a.id)}">${editorDescuentoAdminHTML(a)}</section>
    <div class="admin-anuncio-estadisticas" id="admin-estadisticas-${esc(a.id)}" data-admin-estadisticas-panel="${esc(a.id)}" hidden></div>
    ${anteriores.length?`<details><summary>Cobros anteriores (${anteriores.length})</summary>${anteriores.map(c=>
      `<div><p class="clase-card-meta">Publicación del ${esc(new Date(c.publicado_at).toLocaleString('es-CL'))} · ${c.estado==='deuda'?'En deuda':'Cobrado'} · ${pesosClase(c.monto_clp)}</p>${editorCobroAdmin(a.id,c.publicado_at,c.estado,c.monto_clp)}</div>`).join('')}</details>`:''}
  </article>`;
}
function tarjetaAdminProfesor(p,ahora=Date.now()){
  const estados={aprobado:'Aprobado',pendiente:'Esperando revisión',suspendido:'Pausado',rechazado:'Rechazado'};
  const anuncios=p.anuncios||[];
  const gastado=anuncios.reduce((n,a)=>{const c=costoCampanaClase(a.campana);return n+(c?c.total:0);},0);
  const accion=p.estado==='aprobado'?`<button type="button" class="clase-accion" data-admin-profesor="${esc(p.user_id)}" data-estado="suspendido">Pausar profesor</button>`
    :p.estado==='suspendido'?`<button type="button" class="clase-accion" data-admin-profesor="${esc(p.user_id)}" data-estado="aprobado">Reactivar</button>`:'';
  return `<section class="admin-profesor">
    <div class="admin-profesor-top"><div><h3>${esc(p.nombre||'Sin nombre')}</h3><p class="clase-card-meta">${esc(p.correo||'')}</p></div>
      <span class="clase-estado clase-estado-${esc(p.estado)}">${esc(estados[p.estado]||p.estado)}</span></div>
    <p class="clase-card-meta">${anuncios.length} ${anuncios.length===1?'anuncio':'anuncios'} · lleva ${pesosClase(gastado)}</p>
    ${accion}${p.estado==='aprobado'?`<span data-admin-ejemplo="${esc(p.user_id)}"></span>`:''}
    ${anuncios.length?`<div class="admin-anuncios">${anuncios.map(a=>filaAdminAnuncio(a,ahora)).join('')}</div>`:''}
  </section>`;
}
async function marcarCobroAdmin(args){
  const actual=await supabaseClient.rpc('admin_marcar_cobro_publicacion',args);
  if(!actual.error){compatibilidadSqlClases.cobros=false;return actual;}
  if(!sqlClasesDesactualizado(actual.error))return actual;
  compatibilidadSqlClases.cobros=true;
  // El RPC antiguo no recibe fecha. Nunca usarlo para un cobro histórico ni
  // para una fila que otra pestaña ya renovó. Se vuelve a leer antes de guardar.
  const panel=await supabaseClient.rpc('admin_panel_clases');
  if(panel.error)return panel;
  const anuncio=(panel.data||[]).flatMap(p=>p.anuncios||[]).find(a=>a.id===args.p_anuncio_id);
  if(!anuncio||!args.p_publicado_at||Date.parse(anuncio.publicado_at)!==Date.parse(args.p_publicado_at))
    return {error:{message:'La publicación cambió o es histórica. Actualiza el panel y aplica el SQL antes de editar ese cobro.'}};
  const {p_anuncio_id,p_estado,p_monto_clp}=args;
  return supabaseClient.rpc('admin_marcar_cobro',{p_anuncio_id,p_estado,p_monto_clp});
}
// Vistas puras de #522; las decisiones siguen en las RPC protegidas.
function filasAdminHig(profesores,ahora=Date.now()){
  return (profesores||[]).flatMap(p=>(p.anuncios||[]).map(a=>{
    const costo=costoCampanaClase(a.campana),estado=estadoAdminAnuncio(a,costo,ahora);
    if(p.estado!=='aprobado'&&['publicado','programado'].includes(vigenciaAnuncio(a,ahora)))
      return {p,a,costo,estado:['Profesor no habilitado','suspendido']};
    return {p,a,costo,estado};
  }));
}
function filtrarAdminHig(filas,{seccion='campanas',busqueda='',estado=''}={}){
  const palabras=normalizarBusquedaClase(busqueda).split(' ').filter(Boolean);
  return filas.filter(f=>(seccion==='cobros'||f.a.estado!=='eliminado')&&
    (seccion!=='revision'||f.a.estado==='en_revision')&&
    (seccion!=='cobros'||f.a.publicado_at||(f.a.cobros||[]).length||f.a.cobro)&&
    (!estado||f.estado[1]===estado)&&palabras.every(t=>normalizarBusquedaClase([f.p.nombre,f.a.titulo,...(f.a.ramos_siglas||[])].join(' ')).includes(t)));
}
function filaAdminHigHTML({p,a,costo,estado},ahora){
  return `<details class="admin-hig-fila" data-admin-fila="${esc(a.id)}"><summary>
    <span class="admin-hig-identidad"><b>${esc(a.titulo||'Sin título')}</b><small>${esc(p.nombre||'Sin nombre')} · ${esc((a.ramos_siglas||[]).join(' · '))}</small>${descuentoAdminPct(a)===null?'':`<span class="admin-descuento-etiqueta">−${descuentoAdminPct(a)}% GradeHub</span>`}</span>
    <span class="clase-estado clase-estado-${esc(estado[1])}">${esc(estado[0])}</span>
    <span class="admin-hig-importe"><b>${costo?pesosClase(costo.total):'—'}</b><small>Costo de campaña</small></span><span aria-hidden="true">⌄</span>
    </summary><div class="admin-hig-detalle">${a.estado==='en_revision'?revisionAdminAnuncioHTML(a,p):''}
    ${filaAdminAnuncio(a,ahora)}</div></details>`;
}
// Aceptar, rechazar y eliminar (Lucas, 2026-10-23). Eliminar solo aparece
// si no hay historial que perder; si lo hay, se explica por qué y se pausa.
function personaAdminHigHTML(p){
  const id=esc(p.user_id),estado=p.estado;
  const fecha=p.solicitado_at&&Number.isFinite(new Date(p.solicitado_at).getTime())
    ?new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'long',timeZone:'America/Santiago'}).format(new Date(p.solicitado_at)):'';
  const alumnos=Number(p.alumnos_conectados)||0;
  const sePuedeEliminar=p.tiene_historial===false&&alumnos===0;
  const porQueNo=p.tiene_historial?'Tiene campañas con cobros: páusalo en vez de eliminarlo.'
    :alumnos?`Tiene ${alumnos} ${alumnos===1?'alumno conectado':'alumnos conectados'}: páusalo en vez de eliminarlo.`:'';
  const acciones=[
    estado==='pendiente'?`<button type="button" class="accion-principal" data-admin-postulacion="${id}" data-estado="aprobado">Aceptar</button><button type="button" class="clase-accion" data-admin-postulacion="${id}" data-estado="rechazado">Rechazar</button>`:'',
    estado==='rechazado'?`<button type="button" class="clase-accion" data-admin-postulacion="${id}" data-estado="aprobado">Aceptar</button>`:'',
    estado==='aprobado'||estado==='suspendido'?`<button type="button" class="clase-accion" data-admin-profesor="${id}" data-estado="${estado==='aprobado'?'suspendido':'aprobado'}">${estado==='aprobado'?'Pausar profesor':'Reactivar profesor'}</button>`:'',
    estado!=='pendiente'&&sePuedeEliminar?`<button type="button" class="clase-accion admin-hig-eliminar" data-admin-eliminar="${id}" data-nombre="${esc(p.nombre||'')}">Eliminar</button>`:'',
  ].join('');
  return `<section class="admin-hig-persona" data-admin-persona="${id}"><div><h3>${esc(p.nombre||'Sin nombre')}</h3><p>${esc(p.correo||'')}</p><p>${esc({aprobado:'Aprobado',pendiente:'Esperando revisión',suspendido:'Suspendido',rechazado:'Rechazado'}[estado]||estado)} · ${(p.anuncios||[]).length} anuncios${estado==='pendiente'&&fecha?` · postuló el ${esc(fecha)}`:''}</p>
    ${estado==='pendiente'&&p.presentacion?`<p class="admin-hig-presentacion">${esc(p.presentacion)}</p>`:''}
    ${estado!=='pendiente'&&porQueNo?`<p class="admin-hig-motivo">${esc(porQueNo)}</p>`:''}</div>
    <div class="admin-hig-persona-acciones">${acciones}${estado==='aprobado'?`<span data-admin-ejemplo="${id}"></span>`:''}</div>
    ${estado==='pendiente'?'':fichaAdminProfesorHTML(p)}</section>`;
}
// La ficha de un profesor (Lucas, 2026-10-23): lo que hace falta para decidir
// y cobrar, sin salir del panel. Sin el SQL nuevo, cada bloque se omite.
const ACCIONES_ADMIN_TEXTO={descuento_anuncio:d=>d&&d.pct!=null?`Fijó un descuento de ${d.pct}% GradeHub`:'Quitó el descuento GradeHub',revisar_postulacion:d=>d&&d.estado==='rechazado'?'Rechazó la postulación':'Aceptó la postulación',
  estado_profesor:d=>d&&d.estado==='suspendido'?'Pausó al profesor':'Reactivó al profesor',panel_alumnos:d=>d&&d.activo?'Mostró el panel de alumnos':'Ocultó el panel de alumnos',
  nota_profesor:()=>'Editó la nota interna',publicar_anuncio:()=>'Publicó un anuncio',devolver_anuncio:()=>'Devolvió un anuncio',pausar_anuncio:()=>'Pausó un anuncio',
  borrar_anuncio_revision:()=>'Borró un anuncio en revisión',terminar_anuncio_pausado:()=>'Terminó una campaña',marcar_cobro:()=>'Registró un cobro'};
function fichaAdminProfesorHTML(p){
  const id=esc(p.user_id),anuncios=(p.anuncios||[]).filter(a=>a.estado!=='eliminado');
  const cuenta=e=>anuncios.filter(a=>e.includes(a.estado)).length;
  const deudas=anuncios.reduce((n,a)=>n+(Array.isArray(a.cobros)?a.cobros:a.cobro?[a.cobro]:[]).filter(c=>c.estado==='deuda').length,0);
  const d30=p.ultimos_30_dias,num=v=>new Intl.NumberFormat('es-CL').format(Number(v)||0);
  const dato=(t,v)=>`<div><dt>${t}</dt><dd>${v}</dd></div>`;
  const alumnos=Number(p.alumnos_conectados)||0,visible=p.panel_alumnos!==false;
  const historial=Array.isArray(p.historial)?p.historial:null;
  const fecha=f=>Number.isFinite(new Date(f).getTime())?new Intl.DateTimeFormat('es-CL',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'America/Santiago'}).format(new Date(f)):'';
  return `<details class="admin-hig-ficha"><summary>Ficha del profesor</summary><div class="admin-hig-ficha-cuerpo">
    <dl class="admin-hig-ficha-datos">
      ${dato('Publicados',num(cuenta(['publicado'])))}${dato('En revisión',num(cuenta(['en_revision'])))}${dato('Borradores',num(cuenta(['borrador'])))}
      ${d30?dato('Lo vieron · 30 días',num(d30.vieron))+dato('Lo abrieron · 30 días',num(d30.abrieron))+dato('Lo contactaron · 30 días',num(d30.contactaron)):''}
      ${dato('Cobros en deuda',num(deudas))}${p.alumnos_conectados!=null?dato('Alumnos conectados',num(alumnos)):''}
    </dl>
    ${p.panel_alumnos!=null&&p.estado==='aprobado'?`<div class="admin-hig-ficha-fila"><span><b>Panel de alumnos</b><small>${visible?'Lo ve en su menú.':'Oculto: no ve a sus alumnos ni se conecta nadie nuevo.'}</small></span>
      <button type="button" class="clase-accion" role="switch" aria-checked="${visible}" data-admin-panel-alumnos="${id}" data-activo="${!visible}" data-alumnos="${alumnos}">${visible?'Ocultar':'Mostrar'}</button></div>`:''}
    ${p.nota!==undefined?`<label class="modal-label" for="admin-nota-${id}">Nota interna · solo la ven los admins</label>
      <textarea id="admin-nota-${id}" class="admin-hig-nota-texto" maxlength="1000" data-admin-nota-texto="${id}" placeholder="Ej. Material: 15% de comisión, código GRADEHUB 5%">${esc(p.nota||'')}</textarea>
      <button type="button" class="clase-accion" data-admin-nota="${id}">Guardar nota</button>`:''}
    ${historial?`<h4>Últimos cambios</h4>${historial.length?`<ul class="admin-hig-historial">${historial.map(h=>`<li><span>${esc((ACCIONES_ADMIN_TEXTO[h.accion]||(()=>h.accion))(h.detalle))}</span><small>${esc(fecha(h.fecha))}${h.admin?' · '+esc(h.admin):''}</small></li>`).join('')}</ul>`:'<p class="admin-hig-motivo">Sin cambios registrados.</p>'}`:''}
  </div></details>`;
}
// El número de postulaciones esperando va en el riel: «Profesores · 2».
function marcarPendientesNavAdmin(n){
  if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
  const b=document.querySelector('[data-nav-vista="admin:profesores"]');if(!b)return;
  b.textContent=n?`Profesores · ${n}`:'Profesores';
  if(n)b.setAttribute('aria-label',`Profesores, ${n} ${n===1?'postulación':'postulaciones'} por revisar`);else b.removeAttribute('aria-label');
}
// Filtro y búsqueda de la lista de profesores. Parte en Pendientes si hay.
const FILTROS_PROFESORES_ADMIN=[['pendiente','Pendientes'],['aprobado','Aprobados'],['suspendido','Pausados'],['','Todos']];
function filtrarProfesoresAdmin(profesores,{estado='',busqueda=''}={}){
  const palabras=normalizarBusquedaClase(busqueda).split(' ').filter(Boolean);
  return (profesores||[]).filter(p=>(!estado||p.estado===estado)&&palabras.every(t=>normalizarBusquedaClase(p.nombre||'').includes(t)));
}
// ─── Gráficos de Estadísticas ──────────────────────────────────────────────
// HIG, Charts y Charting data: un título que dice qué se mide, un resumen con
// la cifra que importa, una sola serie desde cero y los números también en
// texto, para que VoiceOver no dependa del dibujo. Son HTML y no SVG para que
// el texto crezca con el tamaño que eligió la persona. El color es el acento,
// nunca el semáforo: nada de esto es una nota.
const fechaCortaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short'});
const fechaLargaAdmin=d=>new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long'});
// Un tope redondo para el eje y con mitad también redonda: 0 · 30 · 60.
function topeEjeAdmin(max){
  if(!(max>0))return 0;
  const p=10**Math.floor(Math.log10(max));
  return [1,2,4,6,8,10].map(m=>m*p).find(t=>t>=max&&(t/2)%1===0)||10*p;
}
// «+30 (+12%) vs. semana del 6 oct». Con valores, no adjetivos (HIG, Charts).
function variacionAdmin(actual,anterior,contra){
  if(!(anterior>0))return '';
  const d=actual-anterior,pct=Math.round(100*d/anterior);
  return d?`${d>0?'+':'−'}${milesViz(Math.abs(d))} (${d>0?'+':'−'}${Math.abs(pct)}%) vs. ${contra}`:`Igual que ${contra}`;
}
function kpiAdminHTML(titulo,valor,detalle){return `<div><span>${esc(titulo)}</span><strong>${esc(valor)}</strong><p>${esc(detalle||'')}</p></div>`;}
// puntos: [{eje, lectura, valor, tenue}] de lo antiguo a lo nuevo. La columna
// elegida va con el acento lleno y su lectura arriba; tocar o pasar el dedo
// por el área entera elige otra (enlazarGraficosAdmin).
function columnasAdminHTML({titulo,resumen,vacio,puntos,elegido=puntos.length-1,formato=milesViz,tabla=null,dondeValores='en la tabla'}){
  const tope=topeEjeAdmin(Math.max(0,...puntos.map(p=>p.valor)));
  const cabeza=`<figcaption><b>${esc(titulo)}</b>${resumen?`<span>${esc(resumen)}</span>`:''}</figcaption>`;
  if(!tope)return `<figure class="viz admin-grafico">${cabeza}<p class="clase-sin-datos">${esc(vacio)}</p></figure>`;
  return `<figure class="viz admin-grafico" data-admin-grafico>${cabeza}
    <p class="admin-grafico-lectura" data-admin-lectura aria-hidden="true">${esc(puntos[elegido].lectura)}</p>
    <div class="admin-grafico-area" role="img" aria-label="${esc(`${titulo}, gráfico de columnas. ${resumen||''} Los valores están ${dondeValores}.`)}">
      <div class="admin-grafico-guias">${[tope,tope/2,0].map(m=>`<span><i>${esc(formato(m))}</i></span>`).join('')}</div>
      <div class="admin-grafico-columnas">${puntos.map((p,i)=>`<span data-admin-col data-lectura="${esc(p.lectura)}"${i===elegido?' data-elegida':''}${p.tenue?' data-tenue':''}><i style="height:${(100*p.valor/tope).toFixed(1)}%"></i></span>`).join('')}</div>
    </div>
    <div class="viz-eje admin-grafico-eje" aria-hidden="true"><span>${esc(puntos[0].eje)}</span><span>${esc(puntos[puntos.length-1].eje)}</span></div>
    ${tabla?`<details class="admin-grafico-tabla"><summary>Ver como tabla</summary><div><table>
      <thead><tr>${tabla.columnas.map((c,i)=>`<th scope="col"${i?' class="num"':''}>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${tabla.filas.map(f=>`<tr>${f.map((c,i)=>i?`<td class="num">${esc(c)}</td>`:`<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:''}
  </figure>`;
}
// Partes de un total, de mayor a menor, con su número escrito al lado.
function barrasAdminHTML({titulo,resumen,filas}){
  const max=Math.max(1,...filas.map(f=>f.valor));
  return `<figure class="viz admin-grafico"><figcaption><b>${esc(titulo)}</b>${resumen?`<span>${esc(resumen)}</span>`:''}</figcaption>
    <div class="admin-grafico-barras">${filas.map(f=>`<div class="clase-embudo-fila"><span>${esc(f.nombre)}</span><div class="clase-barra" aria-hidden="true"><i style="transform:scaleX(${(f.valor/max).toFixed(3)})"></i></div><b>${esc(f.texto??milesViz(f.valor))}</b></div>`).join('')}</div>
  </figure>`;
}
// La semana en curso no está cerrada: no se compara ni se destaca.
const semanaEnCursoAdmin=(f,ahora)=>Date.parse(String(f.semana).slice(0,10)+'T00:00:00-03:00')+7*864e5>ahora;
function graficosCrecimientoAdminHTML(semanas,ahora){
  const cifra=v=>Number.isFinite(Number(v))?Number(v):0;
  const i=semanas.findIndex(f=>!semanaEnCursoAdmin(f,ahora));
  const cerrada=semanas[i],anterior=semanas[i+1],enCurso=i>0?semanas[0]:null;
  const contra=anterior?`semana del ${fechaCortaAdmin(anterior.semana)}`:'';
  const kpis=cerrada?[
    kpiAdminHTML('Activas',milesViz(cifra(cerrada.activas)),`Semana del ${fechaCortaAdmin(cerrada.semana)}${anterior?' · '+variacionAdmin(cifra(cerrada.activas),cifra(anterior.activas),contra):''}`),
    kpiAdminHTML('Nuevas',milesViz(cifra(cerrada.nuevas)),anterior?variacionAdmin(cifra(cerrada.nuevas),cifra(anterior.nuevas),contra)||'Cuentas creadas esa semana':'Cuentas creadas esa semana'),
    kpiAdminHTML('Volvieron',cerrada.pct_vuelven!=null?`${Number(cerrada.pct_vuelven).toLocaleString('es-CL')}%`:'—',anterior?`${milesViz(cifra(cerrada.vuelven))} de ${milesViz(cifra(anterior.activas))} activas la semana anterior`:'Sin semana anterior para comparar'),
    enCurso?kpiAdminHTML('Esta semana',milesViz(cifra(enCurso.activas)),'Activas hasta hoy · semana en curso'):''].join(''):'';
  const serie=clave=>semanas.slice().reverse().map(f=>({eje:fechaCortaAdmin(f.semana),valor:cifra(f[clave]),tenue:semanaEnCursoAdmin(f,ahora),
    lectura:`Semana del ${fechaLargaAdmin(f.semana)}${semanaEnCursoAdmin(f,ahora)?' (en curso)':''} · ${milesViz(cifra(f[clave]))} ${clave==='activas'?'activas':'nuevas'}`}));
  const elegido=Math.max(0,semanas.length-1-Math.max(i,0));
  return `${kpis?`<div class="admin-hig-resumen" aria-label="Resumen de la última semana cerrada">${kpis}</div>`:''}
    <div class="admin-graficos">
      ${columnasAdminHTML({titulo:'Cuentas activas por semana',resumen:'Abrieron la app al menos un día de la semana.',vacio:'Todavía no hay visitas registradas.',puntos:serie('activas'),elegido,dondeValores:'en el detalle por semana'})}
      ${columnasAdminHTML({titulo:'Cuentas nuevas por semana',resumen:'Se crearon esa semana, estudiantes y profesores.',vacio:'Todavía no hay cuentas nuevas en estas semanas.',puntos:serie('nuevas'),elegido,dondeValores:'en el detalle por semana'})}
    </div>`;
}
// Lo de clases particulares: alcance de los anuncios (admin_estadisticas.sql),
// cobros por mes y anuncios por estado. Sale de lo que el panel ya cargó,
// salvo el alcance diario; sin ese SQL, se explica qué falta y lo demás sigue.
function clasesEstadisticasAdminHTML(profesores,alcance,ahora=Date.now()){
  const pesos=pesosClase,partes=[];
  let kpis='';
  if(Array.isArray(alcance)&&alcance.length){
    const n=v=>Number(v)||0,suma=k=>alcance.reduce((t,d)=>t+n(d[k]),0);
    const vieron=suma('vieron'),abrieron=suma('abrieron'),contactaron=suma('contactaron');
    kpis=[kpiAdminHTML('Vieron un anuncio',milesViz(vieron),'Cuentas distintas por campaña · 30 días'),
      kpiAdminHTML('Lo abrieron',milesViz(abrieron),`${pctViz(abrieron,vieron)} de las que lo vieron`),
      kpiAdminHTML('Contactaron',milesViz(contactaron),`${pctViz(contactaron,vieron)} de las que lo vieron`),
      kpiAdminHTML('De abrir a contactar',pctViz(contactaron,abrieron),'Contactaron de las que lo abrieron')].join('');
    const mejor=alcance.reduce((m,d)=>n(d.vieron)>n(m.vieron)?d:m,alcance[0]);
    partes.push(columnasAdminHTML({titulo:'Alcance por día',vacio:'Ningún anuncio se ha mostrado en los últimos 30 días.',
      resumen:vieron?`${milesViz(vieron)} en 30 días; el día con más fue el ${fechaLargaAdmin(mejor.dia)}, con ${milesViz(n(mejor.vieron))}.`:'',
      puntos:alcance.map(d=>({eje:fechaCortaAdmin(d.dia),valor:n(d.vieron),lectura:`${fechaLargaAdmin(d.dia)} · ${milesViz(n(d.vieron))} vieron · ${milesViz(n(d.abrieron))} abrieron · ${milesViz(n(d.contactaron))} contactaron`})),
      tabla:{columnas:['Día','Vieron','Abrieron','Contactaron'],filas:alcance.slice().reverse().map(d=>[fechaLargaAdmin(d.dia),milesViz(n(d.vieron)),milesViz(n(d.abrieron)),milesViz(n(d.contactaron))])}}));
    partes.push(barrasAdminHTML({titulo:'De ver a contactar',resumen:'Últimos 30 días, todos los anuncios.',filas:[
      {nombre:'Vieron',valor:vieron},{nombre:'Abrieron',valor:abrieron,texto:`${milesViz(abrieron)} · ${pctViz(abrieron,vieron)}`},
      {nombre:'Contactaron',valor:contactaron,texto:`${milesViz(contactaron)} · ${pctViz(contactaron,vieron)}`}]}));
  }
  // Cobros por el mes en que se publicó la campaña, los últimos seis.
  const hoy=new Date(ahora),meses=[];
  for(let k=5;k>=0;k--){const m=new Date(hoy.getFullYear(),hoy.getMonth()-k,1);meses.push({anio:m.getFullYear(),mes:m.getMonth(),fecha:m,cobrado:0,deuda:0});}
  for(const p of profesores||[])for(const a of p.anuncios||[])
    for(const c of Array.isArray(a.cobros)?a.cobros:(a.cobro?[{...a.cobro,publicado_at:a.publicado_at}]:[])){
      const f=new Date(c.publicado_at),m=meses.find(x=>x.anio===f.getFullYear()&&x.mes===f.getMonth());
      if(m&&(c.estado==='cobrado'||c.estado==='deuda'))m[c.estado]+=Number(c.monto_clp)||0;
    }
  const nombreMes=(m,o)=>{const t=m.fecha.toLocaleDateString('es-CL',o);return t.charAt(0).toUpperCase()+t.slice(1);};
  const cobrado=meses.reduce((t,m)=>t+m.cobrado,0),deuda=meses.reduce((t,m)=>t+m.deuda,0);
  partes.push(columnasAdminHTML({titulo:'Cobrado por mes',formato:pesos,vacio:'Todavía no hay cobros registrados en los últimos seis meses.',
    resumen:`${pesos(cobrado)} cobrados en seis meses${deuda?` · ${pesos(deuda)} en deuda`:''}. Cuenta el mes en que se publicó cada campaña.`,
    puntos:meses.map(m=>({eje:nombreMes(m,{month:'short'}),valor:m.cobrado,lectura:`${nombreMes(m,{month:'long',year:'numeric'})} · ${pesos(m.cobrado)} cobrado${m.deuda?` · ${pesos(m.deuda)} en deuda`:''}`})),
    tabla:{columnas:['Mes','Cobrado','En deuda'],filas:meses.slice().reverse().map(m=>[nombreMes(m,{month:'long',year:'numeric'}),pesos(m.cobrado),pesos(m.deuda)])}}));
  const porEstado=new Map();
  filasAdminHig(profesores,ahora).filter(f=>f.a.estado!=='eliminado').forEach(f=>porEstado.set(f.estado[0],(porEstado.get(f.estado[0])||0)+1));
  const total=[...porEstado.values()].reduce((t,v)=>t+v,0);
  if(total)partes.push(barrasAdminHTML({titulo:'Anuncios por estado',resumen:`${milesViz(total)} ${total===1?'anuncio':'anuncios'} en total.`,
    filas:[...porEstado].sort((x,y)=>y[1]-x[1]).map(([nombre,valor])=>({nombre,valor}))}));
  return `<section class="admin-clases-estadisticas" aria-labelledby="admin-clases-estadisticas-titulo"><h3 id="admin-clases-estadisticas-titulo">Clases particulares</h3>
    <p>Alcance de los anuncios, lo cobrado y en qué está cada anuncio.</p>
    ${kpis?`<div class="admin-hig-resumen" aria-label="Resumen de los últimos 30 días">${kpis}</div>`:''}
    ${Array.isArray(alcance)?'':'<p class="admin-hig-nota" role="status">El alcance por día aparece al aplicar supabase/admin_estadisticas.sql.</p>'}
    <div class="admin-graficos">${partes.join('')}</div></section>`;
}
// Tocar o arrastrar por el gráfico elige la columna más cercana; con el mouse,
// al salir vuelve a la que estaba. No hace falta para leer nada: la lectura
// inicial y la tabla ya dicen lo importante (HIG, Charts).
function enlazarGraficosAdmin(raiz){
  raiz.querySelectorAll('[data-admin-grafico]').forEach(fig=>{
    const area=fig.querySelector('.admin-grafico-area'),fila=fig.querySelector('.admin-grafico-columnas'),lectura=fig.querySelector('[data-admin-lectura]');
    const cols=[...fig.querySelectorAll('[data-admin-col]')];
    if(!area||!fila||!lectura||!cols.length)return;
    const inicial=Math.max(0,cols.findIndex(c=>'elegida' in c.dataset));
    const elegir=i=>{cols.forEach((c,j)=>{if(j===i)c.dataset.elegida='';else delete c.dataset.elegida;});lectura.textContent=cols[i].dataset.lectura;};
    const enX=e=>{const r=fila.getBoundingClientRect();if(r.width)elegir(Math.max(0,Math.min(cols.length-1,Math.floor((e.clientX-r.left)/r.width*cols.length))));};
    area.addEventListener('pointerdown',enX);area.addEventListener('pointermove',enX);
    area.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')elegir(inicial);});
  });
}
function crecimientoAdminHTML(semanas,ahora=Date.now()){
  if(!Array.isArray(semanas)||!semanas.length)return '';
  const cifra=v=>Number.isFinite(Number(v))?Number(v):0;
  const dato=(titulo,f,clave)=>`<div><dt>${titulo}</dt><dd><strong>${cifra(f[clave])} total</strong><span>${cifra(f[clave+'_estudiantes'])} estudiantes · ${cifra(f[clave+'_profesores'])} profesores</span></dd></div>`;
  const semana=f=>`<h3>Semana del ${esc(f.semana?fechaLargaAdmin(f.semana):'')}</h3><dl>${dato('Nuevas',f,'nuevas')}${dato('Activas',f,'activas')}${dato('Volvieron',f,'vuelven')}</dl>`;
  return `<section class="admin-crecimiento" aria-labelledby="admin-crecimiento-titulo"><h3 id="admin-crecimiento-titulo">Crecimiento semanal</h3>
    <p>Cuentas nuevas, activas y que volvieron cada semana.</p>${graficosCrecimientoAdminHTML(semanas,ahora)}
    <div class="admin-crecimiento-actual">${semana(semanas[0])}</div>
    ${semanas.length>1?`<details class="admin-crecimiento-historial"><summary>Ver ${semanas.length-1} ${semanas.length===2?'semana anterior':'semanas anteriores'}</summary><ol>${semanas.slice(1).map(f=>`<li>${semana(f)}</li>`).join('')}</ol></details>`:''}</section>`;
}
const AREAS_ADMIN=['profesores','anuncios','estadisticas','usuarios'];
function panelAdminHigHTML(profesores,ahora,crecimiento=[],area='anuncios',alcance=null){
  const filas=filasAdminHig(profesores,ahora),r=resumenAdminClases(profesores,ahora);
  const kpi=(titulo,valor,detalle)=>`<div><span>${titulo}</span><strong>${valor}</strong><p>${detalle}</p></div>`;
  const tab=(nombre,texto)=>`<button type="button" role="tab" id="admin-tab-${nombre}" data-admin-area="${nombre}" aria-controls="admin-area-${nombre}" aria-selected="${nombre===area}" tabindex="${nombre===area?'0':'-1'}">${texto}</button>`;
  const panel=(nombre,contenido)=>`<section class="admin-hig-panel" role="tabpanel" id="admin-area-${nombre}" data-admin-panel="${nombre}" aria-labelledby="admin-tab-${nombre}" tabindex="0"${nombre===area?'':' hidden'}>${contenido}</section>`;
  // Sin cabecera propia: «Administración» va en la barra (Lucas, 2026-10-22).
  // Decía «Todo en orden.» aunque hubiera anuncios esperando revisión.
  return `<div class="admin-hig">
    <div class="admin-hig-areas" role="tablist" aria-label="Secciones de administración">
      ${tab('profesores','Profesores')}${tab('anuncios','Anuncios')}${tab('estadisticas','Estadísticas')}${tab('usuarios','Usuarios')}
    </div>
    ${panel('profesores',`<h2>Profesores</h2>
      <p class="admin-hig-nota">${profesores.length} profesores · ${r.pendientes} esperando revisión. Revisar logos sigue en SQL Editor.</p>
      <div class="admin-hig-filtros"><nav class="panel-alumnos-vistas" aria-label="Filtrar profesores">${FILTROS_PROFESORES_ADMIN.map(([v,t])=>`<button type="button" data-admin-filtro-prof="${v}" aria-pressed="${v===vistaAdmin.profesores}">${t}</button>`).join('')}</nav>
      <input type="search" class="admin-hig-buscar" id="admin-buscar-profesor" placeholder="Buscar por nombre" aria-label="Buscar profesor por nombre" autocomplete="off"></div>
      <div class="admin-hig-profesores" id="admin-lista-profesores"></div>`)}
    ${panel('anuncios',`<h2>Anuncios</h2>
    <div class="admin-hig-resumen" aria-label="Resumen de administración">
    ${kpi('Visibles ahora',filas.filter(f=>f.estado[1]==='publicado').length,'Publicadas y bajo su tope')}
    ${kpi('Por revisar',r.revision,'Anuncios que esperan una decisión')}
    ${kpi('Deuda registrada',pesosClase(r.deuda),'Incluye publicaciones anteriores')}
    ${kpi('Cobrado',pesosClase(r.cobrado),'Historial de pagos registrados')}</div>
    <p class="admin-hig-nota">Revisa y decide los anuncios desde acá. Cada acción queda registrada.</p>
    <nav class="admin-hig-pestanas" aria-label="Vistas de administración"><button type="button" data-admin-seccion="campanas" aria-pressed="true">Campañas</button><button type="button" data-admin-seccion="revision" aria-pressed="false">Por revisar · ${r.revision}</button><button type="button" data-admin-seccion="cobros" aria-pressed="false">Cobros e historial</button></nav>
    <div class="admin-hig-herramientas"><label class="admin-hig-buscar">Buscar<input id="admin-hig-buscar" type="search" placeholder="Profesor, anuncio o ramo" autocomplete="off"></label><label>Estado<select id="admin-hig-estado">${[['','Todos'],['publicado','Publicadas'],['programado','Programadas'],['en_revision','En revisión'],['pausado','Pausadas'],['expirado','Terminadas'],['borrador','Borradores'],['agotado','Tope alcanzado'],['suspendido','Profesor no habilitado'],['eliminado','Borrados con cobros anteriores']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label></div>
    <p class="admin-hig-nota" id="admin-hig-cantidad" role="status" aria-live="polite">${filas.length} anuncios</p>
    <div class="admin-hig-lista">${filas.map(f=>filaAdminHigHTML(f,ahora)).join('')}</div>
    <p class="admin-hig-vacio" id="admin-hig-vacio" hidden>No encontramos anuncios. Prueba otro nombre o amplía los filtros.</p>`)}
    ${panel('estadisticas',`<h2>Estadísticas de GradeHub</h2>
      ${crecimientoAdminHTML(crecimiento,ahora)||'<p class="admin-hig-nota" role="status">No pudimos cargar las cifras de la página por ahora.</p>'}
      ${clasesEstadisticasAdminHTML(profesores,alcance,ahora)}`)}
    ${panel('usuarios',`<h2>Usuarios</h2>
      <div id="admin-encuestas-contenido"><p class="admin-hig-nota">Abre esta sección para gestionar encuestas.</p></div>`)}
  </div>`;
}

// La vista elegida sobrevive al repintado: cada acción vuelve a pintar el
// panel, y quien publicaba desde "Por revisar" caía de vuelta en "Campañas"
// con la búsqueda y el filtro borrados.
let vistaAdmin={area:'anuncios',seccion:'campanas',busqueda:'',estado:''};
async function pintarPanelAdmin(raiz){
  raiz.innerHTML='<p class="profesor-info" role="status">Cargando…</p>';
  let profesores;
  try{
    const {data,error}=await supabaseClient.rpc('admin_panel_clases');
    if(error){console.warn('No se pudo cargar la administración:',error.code||'',error.message||error);
      raiz.innerHTML=`<p class="profesor-info" role="alert">${error.code==='42501'?'Esta cuenta no tiene acceso de administración.':'No pudimos cargar la administración. Intenta de nuevo.'}</p>`;return;}
    profesores=Array.isArray(data)?data:[];
    if(profesores.some(p=>(p.anuncios||[]).some(a=>!Array.isArray(a.cobros))))compatibilidadSqlClases.cobros=true;
  }catch(e){raiz.innerHTML='<p class="profesor-info" role="alert">No pudimos cargar la administración. Intenta de nuevo.</p>';return;}
  // Si el SQL agregado aún no se aplicó, las campañas siguen disponibles.
  // Lo mismo con el alcance diario (admin_estadisticas.sql): null = sin SQL.
  let crecimiento=[],alcance=null;
  const [rc,ra]=await Promise.allSettled([supabaseClient.rpc('crecimiento_semanal_admin'),supabaseClient.rpc('admin_alcance_diario',{p_dias:30})]);
  if(rc.status==='fulfilled'&&rc.value&&!rc.value.error&&Array.isArray(rc.value.data))crecimiento=rc.value.data;
  if(ra.status==='fulfilled'&&ra.value&&!ra.value.error&&Array.isArray(ra.value.data))alcance=ra.value.data;
  const ahora=Date.now();
  // La sección que pidió la barra lateral manda (2026-10-23).
  const pedida=typeof tomarVistaNav==='function'&&tomarVistaNav('admin');
  if(pedida&&AREAS_ADMIN.includes(pedida))vistaAdmin.area=pedida;
  const pendientes=profesores.filter(p=>p.estado==='pendiente').length;
  if(vistaAdmin.profesores===undefined)vistaAdmin.profesores=pendientes?'pendiente':'';
  marcarPendientesNavAdmin(pendientes);
  raiz.innerHTML=(compatibilidadSqlClases.campanas||compatibilidadSqlClases.cobros?`<p class="profesor-info" role="status">${esc(AVISO_SQL_CLASES)}</p>`:'')+panelAdminHigHTML(profesores,ahora,crecimiento,vistaAdmin.area,alcance);
  enlazarGraficosAdmin(raiz);
  const lista=raiz.querySelector('#admin-lista-profesores');
  if(lista&&typeof lista.querySelectorAll==='function'){
    lista.innerHTML=profesores.map(personaAdminHigHTML).join('')+`<p class="admin-hig-motivo" id="admin-profesores-vacio" hidden>${profesores.length?'Nadie calza con este filtro.':'Todavía no hay profesores.'}</p>`;
    const buscar=raiz.querySelector('#admin-buscar-profesor');
    const filtrar=()=>{
      const visibles=new Set(filtrarProfesoresAdmin(profesores,{estado:vistaAdmin.profesores,busqueda:buscar?buscar.value:''}).map(p=>String(p.user_id)));
      lista.querySelectorAll('[data-admin-persona]').forEach(el=>{el.hidden=!visibles.has(el.dataset.adminPersona);});
      raiz.querySelectorAll('[data-admin-filtro-prof]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adminFiltroProf===vistaAdmin.profesores)));
      const vacio=lista.querySelector('#admin-profesores-vacio');if(vacio)vacio.hidden=visibles.size>0;
    };
    raiz.querySelectorAll('[data-admin-filtro-prof]').forEach(b=>b.addEventListener('click',()=>{vistaAdmin.profesores=b.dataset.adminFiltroProf;filtrar();}));
    if(buscar)buscar.addEventListener('input',filtrar);
    filtrar();
  }
  const mostrarArea=nombre=>{
    if(!AREAS_ADMIN.includes(nombre))return;
    vistaAdmin.area=nombre;
    raiz.querySelectorAll('[data-admin-area]').forEach(b=>{
      const activa=b.dataset.adminArea===nombre;
      b.setAttribute('aria-selected',String(activa));b.tabIndex=activa?0:-1;
    });
    raiz.querySelectorAll('[data-admin-panel]').forEach(p=>{p.hidden=p.dataset.adminPanel!==nombre;});
    if(typeof marcarVistaNav==='function')marcarVistaNav('admin',nombre);
    if(nombre==='usuarios'){
      const caja=raiz.querySelector('#admin-encuestas-contenido');
      if(caja&&!caja.querySelector('.encuestas-admin'))renderAdminEncuestas(caja);
    }
  };
  const tabs=[...raiz.querySelectorAll('[data-admin-area]')];
  tabs.forEach((b,i)=>{
    b.addEventListener('click',()=>mostrarArea(b.dataset.adminArea));
    b.addEventListener('keydown',e=>{
      const paso=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
      const siguiente=e.key==='Home'?0:e.key==='End'?tabs.length-1:paso?(i+paso+tabs.length)%tabs.length:-1;
      if(siguiente<0)return;
      e.preventDefault();mostrarArea(tabs[siguiente].dataset.adminArea);tabs[siguiente].focus();
    });
  });
  mostrarArea(vistaAdmin.area);
  if(typeof vistasPanelNav!=='undefined')vistasPanelNav.admin=v=>{if(raiz.isConnected!==false)mostrarArea(v);};
  let seccion=vistaAdmin.seccion;
  const buscar=raiz.querySelector('#admin-hig-buscar'),filtro=raiz.querySelector('#admin-hig-estado');
  buscar.value=vistaAdmin.busqueda;filtro.value=vistaAdmin.estado;
  raiz.querySelectorAll('[data-admin-seccion]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.adminSeccion===seccion)));
  const filtrar=()=>{
    vistaAdmin={...vistaAdmin,seccion,busqueda:buscar.value,estado:filtro.value};
    const filas=filtrarAdminHig(filasAdminHig(profesores,ahora),vistaAdmin),ids=new Set(filas.map(f=>f.a.id));
    raiz.querySelectorAll('[data-admin-fila]').forEach(f=>{f.hidden=!ids.has(f.dataset.adminFila);});
    raiz.querySelector('#admin-hig-cantidad').textContent=`${filas.length} ${filas.length===1?'anuncio':'anuncios'}`;
    raiz.querySelector('#admin-hig-vacio').hidden=filas.length>0;
  };
  buscar.addEventListener('input',filtrar);filtro.addEventListener('change',filtrar);
  raiz.querySelectorAll('[data-admin-seccion]').forEach(b=>b.addEventListener('click',()=>{
    seccion=b.dataset.adminSeccion;
    raiz.querySelectorAll('[data-admin-seccion]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    filtrar();
  }));
  filtrar();
  const repintar=()=>pintarPanelAdmin(raiz);
  const anunciosPorId=new Map(profesores.flatMap(p=>p.anuncios||[]).map(a=>[a.id,a]));
  raiz.querySelectorAll('[data-admin-estadisticas]').forEach(b=>b.addEventListener('click',async()=>{
    const a=anunciosPorId.get(b.dataset.adminEstadisticas);
    const caja=raiz.querySelector('#admin-estadisticas-'+b.dataset.adminEstadisticas);
    if(!a||!caja||b.disabled)return;
    if(!caja.hidden&&b.dataset.estadisticasEstado==='lista'){
      caja.hidden=true;b.textContent='Ver estadísticas';b.setAttribute('aria-expanded','false');return;
    }
    caja.hidden=false;b.setAttribute('aria-expanded','true');
    b.disabled=true;caja.innerHTML='<p class="clase-sin-datos" role="status">Cargando estadísticas…</p>';
    try{
      // El panel puede llevar rato abierto. Releer la fila evita mezclar una
      // publicación nueva con fechas o estado de la vista anterior.
      const {data:panel,error:panelError}=await supabaseClient.rpc('admin_panel_clases');
      if(panelError)throw panelError;
      const actual=(Array.isArray(panel)?panel:[]).flatMap(p=>p.anuncios||[]).find(x=>x.id===a.id);
      if(!actual)throw Error('Aviso no encontrado');
      if(['estado','publicado_at','vence_at'].some(k=>actual[k]!==a[k])){
        await pintarPanelAdmin(raiz);
        showToast('El aviso cambió. Actualicé el panel; abre sus estadísticas de nuevo.');
        return;
      }
      const vig=vigenciaAnuncio(actual,Date.now());
      if(!ANUNCIO_YA_SE_MOSTRO.has(actual.estado)||vig==='programado'){
        caja.innerHTML=`<p class="clase-sin-datos">${vig==='programado'?'Todavía no empieza, así que no hay nada que medir ni cobrar.':actual.estado==='en_revision'?'Cuando se apruebe y empiece a mostrarse, sus estadísticas aparecerán acá.':'Todavía no se publica, así que no hay estadísticas.'}</p>`;
        b.dataset.estadisticasEstado='lista';b.textContent='Ocultar estadísticas';return;
      }
      const m=await metricasDeAnuncio({...actual,campana:null});
      if(caja.isConnected===false)return;
      if(m.error)throw Error('No pudimos cargar las estadísticas. Revisa tu conexión e intenta de nuevo.');
      const d=prepararMetricasClase(actual,m);
      const pesos=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n);
      caja.innerHTML='<h4>Estadísticas del aviso</h4>'+detalleMetricasClaseHTML(d,pesos,Date.now())+
        '<p class="clase-privacidad">Solo totales por anuncio. Nunca nombres ni notas de estudiantes.</p>';
      b.dataset.estadisticasEstado='lista';b.textContent='Ocultar estadísticas';
    }catch(e){
      if(caja.isConnected!==false)caja.innerHTML='<p class="clase-sin-datos" role="alert">No pudimos cargar las estadísticas. Revisa tu conexión e intenta de nuevo.</p>';
      b.dataset.estadisticasEstado='error';b.textContent='Reintentar estadísticas';
    }finally{if(b.isConnected!==false)b.disabled=false;}
  }));
  raiz.querySelectorAll('[data-admin-flyer]').forEach(caja=>{
    urlFlyerClase(caja.dataset.adminFlyer).then(url=>{
      if(!caja.isConnected)return;
      caja.innerHTML=url?`<img src="${esc(url)}" alt="Flyer del anuncio para revisión" loading="lazy">`:'No pudimos cargar el flyer.';
    }).catch(()=>{if(caja.isConnected)caja.textContent='No pudimos cargar el flyer.';});
  });
  const llamar=async(fn,args,ok,alError)=>{
    try{
      const {data,error}=await supabaseClient.rpc(fn,args);
      if(error&&alError&&alError(error))return;
      if(error||data!==true){showToast(error?.message||'No se aplicó el cambio. Actualiza el panel e intenta de nuevo.',true);return;}
      showToast(ok);await repintar();
    }catch(e){showToast('No pudimos completar la acción. Revisa tu conexión e intenta de nuevo.',true);}
  };
  // Alumnos de ejemplo (alumnos_ejemplo.sql): el botón aparece cuando se sabe
  // a quién ya se le activó. Sin el SQL aplicado la consulta falla y no se muestra.
  const cajasEjemplo=[...raiz.querySelectorAll('[data-admin-ejemplo]')];
  if(cajasEjemplo.length)Promise.resolve().then(()=>supabaseClient.rpc('admin_alumnos_ejemplo')).then(r=>{
    if(!r||r.error)return;
    const activos=new Set((r.data||[]).map(String));
    cajasEjemplo.forEach(caja=>{
      if(caja.isConnected===false)return;
      const id=caja.dataset.adminEjemplo,activo=activos.has(id);
      caja.innerHTML=`<button type="button" class="clase-accion">${activo?'Quitar alumnos de ejemplo':'Mostrarle alumnos de ejemplo'}</button>`;
      caja.querySelector('button').addEventListener('click',()=>llamar('admin_fijar_alumnos_ejemplo',{p_user_id:id,p_activo:!activo},
        activo?'Vuelve a ver su panel real':'Verá su panel con alumnos de ejemplo'));
    });
  }).catch(()=>{});
  raiz.querySelectorAll('[data-admin-publicar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Publicar este anuncio?','Se mostrará según los días, la fecha y el tope de su campaña. Las vistas, aperturas y contactos se cobran con las tarifas actuales.',
      ()=>llamar('admin_publicar_anuncio',{p_anuncio_id:b.dataset.adminPublicar},'Anuncio publicado'),{label:'Publicar',danger:false})));
  raiz.querySelectorAll('[data-admin-devolver]').forEach(b=>b.addEventListener('click',async()=>{
    const comentario=raiz.querySelector(`[data-admin-comentario="${b.dataset.adminDevolver}"]`);
    const texto=String(comentario&&comentario.value||'').trim();
    if(texto.length<10||texto.length>1000){showToast('Escribe un comentario de 10 a 1000 caracteres para el profesor.',true);comentario?.focus();return;}
    b.disabled=true;
    await llamar('admin_devolver_anuncio',{p_anuncio_id:b.dataset.adminDevolver,p_comentario:texto},'Anuncio devuelto con comentario');
    if(b.isConnected)b.disabled=false;
  }));
  raiz.querySelectorAll('[data-admin-borrar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Borrar este anuncio?','Desaparecerá de la revisión y del espacio del profesor. Si tuvo campañas anteriores, su medición y sus cobros se conservan.',
      ()=>llamar('admin_borrar_anuncio_revision',{p_anuncio_id:b.dataset.adminBorrar},'Anuncio borrado de la revisión'),
      {label:'Borrar anuncio',danger:true})));
  raiz.querySelectorAll('[data-admin-terminar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Terminar esta campaña?','El aviso ya está pausado. El cierre conserva sus métricas y el costo acumulado; quedará listo para registrar el cobro.',
      ()=>llamar('admin_terminar_anuncio_pausado',{p_anuncio_id:b.dataset.adminTerminar,p_publicado_at:b.dataset.publicadoAt},'Campaña terminada y lista para cobro'),
      {label:'Terminar campaña',danger:false})));
  raiz.querySelectorAll('[data-admin-pausar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm('¿Pausar este aviso?','Deja de mostrarse al tiro. Para volver, el profesor lo manda a revisión otra vez.',
      ()=>llamar('admin_pausar_anuncio',{p_anuncio_id:b.dataset.adminPausar},'Aviso pausado'),{label:'Pausar',danger:false})));
  raiz.querySelectorAll('[data-admin-postulacion]').forEach(b=>b.addEventListener('click',()=>{
    const aceptar=b.dataset.estado==='aprobado';
    showConfirm(aceptar?'¿Aceptar a este profesor?':'¿Rechazar esta postulación?',
      aceptar?'Podrá publicar anuncios (cada uno pasa por revisión) y usar el panel de alumnos.':'No podrá ofrecer clases. Su cuenta de estudiante sigue igual y puedes aceptarlo después.',
      ()=>llamar('admin_revisar_postulacion',{p_user_id:b.dataset.adminPostulacion,p_estado:b.dataset.estado},aceptar?'Profesor aceptado':'Postulación rechazada'),
      {label:aceptar?'Aceptar':'Rechazar',danger:!aceptar});
  }));
  raiz.querySelectorAll('[data-admin-panel-alumnos]').forEach(b=>b.addEventListener('click',()=>{
    const mostrar=b.dataset.activo==='true',n=Number(b.dataset.alumnos)||0;
    if(mostrar){llamar('admin_panel_alumnos_profesor',{p_user_id:b.dataset.adminPanelAlumnos,p_activo:true},'Panel de alumnos visible');return;}
    showConfirm('¿Ocultar su panel de alumnos?',n?`Deja de ver a sus ${n} ${n===1?'alumno':'alumnos'} y nadie nuevo se puede conectar. No se borra nada: al mostrarlo de nuevo están los mismos.`:'No verá la sección Alumnos y nadie se podrá conectar con su link. Puedes mostrarla cuando quieras.',
      ()=>llamar('admin_panel_alumnos_profesor',{p_user_id:b.dataset.adminPanelAlumnos,p_activo:false},'Panel de alumnos oculto'),{label:'Ocultar',danger:false});
  }));
  raiz.querySelectorAll('[data-admin-nota]').forEach(b=>b.addEventListener('click',async()=>{
    const caja=raiz.querySelector(`[data-admin-nota-texto="${b.dataset.adminNota}"]`);
    b.disabled=true;
    try{
      const {data,error}=await supabaseClient.rpc('admin_nota_profesor',{p_user_id:b.dataset.adminNota,p_texto:caja?caja.value:''});
      showToast(error||data!==true?(error?.message||'No se guardó la nota. Actualiza el panel e intenta de nuevo.'):'Nota guardada',!!(error||data!==true));
    }catch(e){showToast('No pudimos guardar la nota. Revisa tu conexión.',true);}
    if(b.isConnected)b.disabled=false;
  }));
  raiz.querySelectorAll('[data-admin-eliminar]').forEach(b=>b.addEventListener('click',()=>
    showConfirm(`¿Eliminar a ${b.dataset.nombre||'este profesor'} como profesor?`,
      'Se borran su ficha y sus borradores. Su cuenta y sus notas de estudiante no se tocan, y puede volver a postular.',
      ()=>llamar('admin_eliminar_profesor',{p_user_id:b.dataset.adminEliminar},'Profesor eliminado'),
      {label:'Eliminar',danger:true})));
  raiz.querySelectorAll('[data-admin-profesor]').forEach(b=>b.addEventListener('click',()=>{
    const pausar=b.dataset.estado==='suspendido';
    showConfirm(pausar?'¿Pausar a este profesor?':'¿Reactivar a este profesor?',
      pausar?'Todos sus avisos dejan de mostrarse al tiro. No se borra nada y se puede revertir.':'Sus avisos publicados y vigentes vuelven a mostrarse.',
      ()=>llamar('admin_estado_profesor',{p_user_id:b.dataset.adminProfesor,p_estado:b.dataset.estado},pausar?'Profesor pausado':'Profesor reactivado'),
      {label:pausar?'Pausar':'Reactivar',danger:false});
  }));
  raiz.querySelectorAll('[data-admin-cobro]').forEach(fila=>{
    const guardar=fila.querySelector('[data-cobro-guardar]'),monto=fila.querySelector('[data-cobro-monto]');
    if(monto)campoPesos(monto);
    if(guardar)guardar.addEventListener('click',async()=>{
      const estado=fila.querySelector('[data-cobro-estado]').value,valor=pesosDeTexto(monto.value);
      if(estado!=='pendiente'&&(!Number.isSafeInteger(valor)||valor<0||valor>5000000)){showToast('Escribe un monto entre $0 y $5.000.000.',true);return;}
      if(guardar.disabled)return;
      guardar.disabled=true;
      try{
        const resultado=await marcarCobroAdmin({p_anuncio_id:fila.dataset.adminCobro,p_publicado_at:fila.dataset.publicadoAt,
          p_estado:estado,p_monto_clp:estado==='pendiente'?null:valor});
        if(resultado.error||resultado.data!==true){showToast(resultado.error?.message||'No se pudo guardar el cobro.',true);return;}
        showToast('Cobro guardado'+(compatibilidadSqlClases.cobros?' con el SQL anterior':''));await repintar();
      }catch(e){showToast('No pudimos guardar el cobro. Intenta de nuevo.',true);}
      finally{if(guardar.isConnected)guardar.disabled=false;}
    });
  });
  await enlazarDescuentosAdmin(raiz,anunciosPorId,llamar);
  await enlazarEdicionAdmin(raiz,profesores,async()=>{vistaAdmin.area='anuncios';await repintar();});
}

// ─── PANEL DE ALUMNOS (decisión de Lucas, 2026-10-08) ───────────────────────
// Un profesor ve las notas de un alumno solo si ese alumno se las comparte, ramo
// por ramo, desde el link del profesor; y deja de verlas cuando el alumno lo
// decide. El SQL (supabase/profesor_alumnos.sql) entrega los ramos tal como el
// alumno los guardó: el promedio lo calcula este navegador con ramoAvg, el mismo
// motor de la app, para que el profesor vea exactamente lo que ve el alumno.
const CLAVE_PROFE_PENDIENTE='gradehub_profe_pendiente';
const URL_PANEL_ALUMNOS='https://gradehub.cl/';

// Misma regla que clave_evaluacion() en SQL: así cada nota encuentra su promedio.
function claveEvaluacionPanel(nombre){
  const s=String(nombre||'').toLowerCase()
    .replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e').replace(/[íìïî]/g,'i')
    .replace(/[óòöô]/g,'o').replace(/[úùüû]/g,'u').replace(/ñ/g,'n')
    .replace(/\s+/g,' ').trim();
  return s||null;
}
function codigoProfeValido(codigo){
  const c=String(codigo||'').trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{8}$/.test(c)?c:null;
}
function linkAlumnosProfesor(codigo){return `${URL_PANEL_ALUMNOS}?profe=${encodeURIComponent(codigo)}`;}
function mensajeInvitacionAlumnos(){
  return 'Hola, si quieres compartir conmigo las notas de tus ramos en GradeHub, abre este link. Tú eliges los ramos y puedes dejar de compartir cuando quieras.';
}
async function compartirInvitacionAlumnos(link){
  try{
    if(typeof navigator.share==='function'){
      await navigator.share({text:mensajeInvitacionAlumnos(),url:link});
      return 'compartido';
    }
  }catch(e){if(e&&e.name==='AbortError')return 'cancelado';}
  try{
    await navigator.clipboard.writeText(`${mensajeInvitacionAlumnos()}\n${link}`);
    return 'copiado';
  }catch(e){return 'fallo';}
}
function medirInvitacionCompartida(resultado){
  if(resultado==='compartido')track('panel_alumnos_link_compartido');
  if(resultado==='copiado')track('panel_alumnos_link_copiado');
}

// El link se abre antes de iniciar sesión: el código espera acá hasta que haya
// una cuenta con su semestre listo. Solo el código, nunca datos del profesor.
function guardarProfePendiente(codigo){
  const c=codigoProfeValido(codigo);if(!c)return false;
  try{localStorage.setItem(CLAVE_PROFE_PENDIENTE,c);}catch(e){}
  return true;
}
function profePendiente(){try{return codigoProfeValido(localStorage.getItem(CLAVE_PROFE_PENDIENTE));}catch(e){return null;}}
function mostrarContextoInvitacionProfesor(){
  if(typeof document==='undefined')return;
  const visible=!!profePendiente();
  ['auth-invitacion-profesor','ob-invitacion-profesor'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.hidden=!visible;
  });
}
function olvidarProfePendiente(){try{localStorage.removeItem(CLAVE_PROFE_PENDIENTE);}catch(e){}mostrarContextoInvitacionProfesor();}
function capturarProfeDeUrl(){
  if(typeof location==='undefined'||typeof URLSearchParams==='undefined')return null;
  const params=new URLSearchParams(location.search||'');
  if(!params.has('profe'))return null;
  const c=guardarProfePendiente(params.get('profe'))?profePendiente():null;
  if(c){
    track('panel_alumnos_link_abierto');
    try{if(typeof ORIGEN_ENTRADA_KEY==='string')sessionStorage.setItem(ORIGEN_ENTRADA_KEY,'profesor');}catch(e){}
  }
  // Fuera de la barra de direcciones: si la persona comparte la página, no
  // reparte el link de su profesor.
  params.delete('profe');
  try{history.replaceState(null,'',location.pathname+(params.toString()?'?'+params:'')+location.hash);}catch(e){}
  return c;
}

let invitacionProfeAbierta=false;
async function revisarInvitacionProfesor(){
  const codigo=profePendiente();
  if(!codigo||invitacionProfeAbierta||!supabaseClient||!currentUser||!S.onboardingDone)return false;
  const uid=currentUser.id;
  invitacionProfeAbierta=true;
  try{
    const {data,error}=await supabaseClient.rpc('profesor_por_codigo',{p_codigo:codigo});
    if(currentUser?.id!==uid)return false;
    if(error){showToast('No pudimos abrir la invitación. Recarga GradeHub para intentarlo de nuevo.',true);return false;}
    const profe=Array.isArray(data)?data[0]:null;
    if(!profe){
      olvidarProfePendiente();
      showToast('Ese link de profesor ya no funciona. Pídele uno nuevo.',true);
      return false;
    }
    // El RPC nuevo solo lee la selección de esta misma persona. Hasta que Lucas
    // aplique el SQL, un servidor anterior sigue usando la hoja de siempre.
    let compartido=null;
    const previo=await supabaseClient.rpc('mi_compartido_profesor',{p_codigo:codigo});
    if(currentUser?.id!==uid)return false;
    if(previo.error){
      if(!['PGRST202','42883'].includes(previo.error.code)){
        showToast('No pudimos revisar lo que ya compartes. Intenta de nuevo.',true);
        return false;
      }
    }else if(previo.data&&Array.isArray(previo.data.ramos))compartido=previo.data;
    abrirHojaInvitacionProfesor(codigo,profe,compartido);
    return true;
  }catch(e){showToast('No pudimos abrir la invitación. Recarga GradeHub para intentarlo de nuevo.',true);return false;}
  finally{invitacionProfeAbierta=false;}
}

function hojaInvitacionProfesorHTML(profe,ramos,nombre,compartido=null){
  const marcados=new Set(compartido?.ramos||[]);
  const filas=ramos.map(r=>{
    const sigla=typeof siglaDeRamo==='function'?siglaDeRamo(r):r.sigla;
    return `<label class="compartir-ramo"><input type="checkbox" value="${esc(r.id)}" data-compartir-ramo${marcados.has(r.id)?' checked':''}>
      <span><b>${esc(r.nombre)}</b>${sigla?`<small>${esc(sigla)}</small>`:''}</span></label>`;
  }).join('');
  return `<div class="compartir-profe">
    <div class="modal-title" id="modal-titulo">${compartido?'Edita lo que compartes con '+esc(profe.nombre_publico):esc(profe.nombre_publico)+' quiere ver tus notas'}</div>
    <p class="compartir-explica">Elige los ramos en que tomas clases con ${esc(profe.nombre_publico)}. Va a ver cada nota de esos ramos y cómo vas comparado con el resto de GradeHub, y puede descargarlas para hacerte seguimiento. Nada más: ni tus otros ramos ni tu correo.</p>
    ${ramos.length?`<div class="compartir-ramos" role="group" aria-label="Ramos que compartes">${filas}</div>`:'<p class="compartir-explica">Primero agrega un ramo para elegir qué compartir.</p>'}
    ${ramos.length?`
    <label class="modal-label" for="compartir-nombre">Cómo quieres aparecer</label>
    <div class="modal-input"><input type="text" id="compartir-nombre" maxlength="60" autocomplete="off" value="${esc(nombre)}"></div>
    <p class="compartir-explica">Puedes dejar de compartir cuando quieras en Ajustes → Datos y cuenta.</p>
    <p class="compartir-error" id="compartir-error" role="alert" hidden></p>`:''}
    <div class="modal-btns">
      <button type="button" class="btn-cancel" id="compartir-no">${compartido?'Cancelar':'Ahora no'}</button>
      ${ramos.length?`<button type="button" class="btn-confirm" id="compartir-si" disabled>${compartido?'Guardar cambios':'Compartir'}</button>`:'<button type="button" class="btn-confirm" id="compartir-agregar">Agregar ramo</button>'}
    </div>
  </div>`;
}

function abrirHojaInvitacionProfesor(codigo,profe,compartido=null){
  const caja=document.getElementById('modal-content');if(!caja)return;
  caja.innerHTML=hojaInvitacionProfesorHTML(profe,S.ramos||[],compartido?.nombre_visible||S.userName||'',compartido);
  openModal();
  track('panel_alumnos_invitacion_mostrada');
  try{if(typeof ORIGEN_ENTRADA_KEY==='string'&&sessionStorage.getItem(ORIGEN_ENTRADA_KEY)==='profesor')sessionStorage.removeItem(ORIGEN_ENTRADA_KEY);}catch(e){}
  const cancelar=caja.querySelector('#compartir-no');
  cancelar.addEventListener('click',()=>{olvidarProfePendiente();closeModal();});
  const agregar=caja.querySelector('#compartir-agregar');
  if(agregar){
    agregar.addEventListener('click',()=>{
      const usuario=currentUser?.id;
      const retomar=()=>{
        if(currentUser?.id===usuario&&profePendiente()===codigo)revisarInvitacionProfesor();
      };
      openAddRamoModal(retomar,retomar);
    });
    return;
  }
  const si=caja.querySelector('#compartir-si'),nombre=caja.querySelector('#compartir-nombre'),aviso=caja.querySelector('#compartir-error');
  const casillas=[...caja.querySelectorAll('[data-compartir-ramo]')];
  const elegidos=()=>casillas.filter(c=>c.checked).map(c=>c.value);
  const actualizar=()=>{si.disabled=!elegidos().length||!nombre.value.trim();};
  casillas.forEach(c=>c.addEventListener('change',actualizar));
  nombre.addEventListener('input',actualizar);
  actualizar();
  si.addEventListener('click',async()=>{
    if(si.disabled)return;
    const ramos=elegidos(),nombreVisible=nombre.value.trim(),uid=currentUser?.id;
    const textoBoton=si.textContent;
    si.disabled=true;nombre.disabled=true;cancelar.disabled=true;
    casillas.forEach(c=>{c.disabled=true;});
    si.textContent=compartido?'Guardando…':'Compartiendo…';
    aviso.hidden=true;
    const r=await compartirConProfesor(codigo,nombreVisible,ramos);
    // La hoja pudo ser reemplazada o la sesión pudo cambiar mientras esperaba.
    if(caja.querySelector('#compartir-si')!==si||currentUser?.id!==uid)return;
    if(r.ok){
      olvidarProfePendiente();closeModal();
      const n=ramos.length;
      showToast(`Listo: ${profe.nombre_publico} ya ve tus notas de ${n} ${n===1?'ramo':'ramos'}.`);
      track('compartir_con_profesor',{ramos:n});
    }else{
      nombre.disabled=false;cancelar.disabled=false;
      casillas.forEach(c=>{c.disabled=false;});
      si.textContent=textoBoton;
      aviso.textContent=r.error;aviso.hidden=false;actualizar();
    }
  });
}

async function compartirConProfesor(codigo,nombre,ramos){
  const pedir=()=>supabaseClient.rpc('compartir_con_profesor',{p_codigo:codigo,p_nombre:String(nombre||'').trim(),p_ramos:ramos});
  try{
    let {error}=await pedir();
    // Un ramo recién agregado puede no haber subido todavía a la nube, que es
    // donde se revisa que sea tuyo: se sube y se intenta una vez más.
    if(error&&/al menos un ramo/.test(error.message||'')&&typeof syncNow==='function'){
      await syncNow();({error}=await pedir());
    }
    if(!error)return {ok:true};
    const m=error.message||'';
    return {ok:false,error:/nombre/.test(m)?'Escribe con qué nombre quieres aparecer.'
      :/al menos un ramo/.test(m)?'No pudimos guardar tus ramos en la nube. Revisa tu conexión e intenta de nuevo.'
      :/ningún profesor/.test(m)?'Ese link ya no funciona. Pídele uno nuevo a tu profesor.'
      :'No pudimos compartir. Intenta de nuevo.'};
  }catch(e){return {ok:false,error:'No pudimos compartir. Revisa tu conexión e intenta de nuevo.'};}
}

// Ajustes → Datos y cuenta: con quién comparte el alumno, y cómo dejar de hacerlo.
async function pintarCompartidosProfesor(){
  const caja=document.getElementById('s-compartidos');
  if(!caja||!supabaseClient||!currentUser)return;
  let lista;
  try{
    const {data,error}=await supabaseClient.rpc('mis_profesores');
    if(error)throw error;
    lista=Array.isArray(data)?data:[];
  }catch(e){caja.innerHTML='<p class="settings-help">No pudimos cargar con quién compartes. Vuelve a abrir esta sección.</p>';return;}
  if(!caja.isConnected)return;
  if(!lista.length){caja.innerHTML='<p class="settings-help">No compartes tus notas con ningún profesor.</p>';return;}
  const nombreRamo=id=>{const r=(S.ramos||[]).find(x=>x.id===id);return r?r.nombre:null;};
  caja.innerHTML=lista.map(p=>{
    const ramos=(p.ramos||[]).map(nombreRamo).filter(Boolean);
    return `<div class="compartido-fila" data-compartido="${esc(p.id)}">
      <div><b>${esc(p.nombre_publico)}</b><small>${ramos.length?esc(ramos.join(' · ')):'Ramos que ya no tienes'} · como «${esc(p.nombre_visible)}»</small></div>
      <button type="button" class="settings-danger-btn" data-dejar="${esc(p.id)}" data-nombre="${esc(p.nombre_publico)}">Dejar de compartir</button>
    </div>`;
  }).join('');
  // Destructivo: se confirma en el diálogo de la app (HIG), con Cancelar a mano.
  caja.querySelectorAll('[data-dejar]').forEach(b=>b.addEventListener('click',()=>{
    showConfirm(`Dejar de compartir con ${b.dataset.nombre}`,
      'Deja de ver tus notas en este momento. Si quieres volver a compartir, abre su link otra vez.',async()=>{
      b.disabled=true;
      try{
        const {error}=await supabaseClient.rpc('dejar_de_compartir',{p_id:b.dataset.dejar});
        if(error)throw error;
        showToast('Dejaste de compartir tus notas.');
        track('dejar_de_compartir_profesor');
        pintarCompartidosProfesor();
      }catch(e){b.disabled=false;showToast('No pudimos dejar de compartir. Intenta de nuevo.',true);}
    },{label:'Dejar de compartir',focusCancel:true});
  }));
}

// ─── Lado del profesor ───────────────────────────────────────────────────────
function ramoParaPanel(r){
  // Los ramos llegan tal como el alumno los guardó; normalize les completa lo
  // que una versión vieja pudo no escribir, igual que al cargar la app.
  try{const n=typeof normalize==='function'?normalize({ramos:[r]}).ramos[0]:r;return n||r;}catch(e){return r;}
}
// Notas agrupadas como en la ficha del ramo: cada categoría con su promedio
// (el del motor, con descartes y reglas) y sus notas debajo.
function categoriasDeRamoPanel(r){
  let valores=new Map();
  try{
    const base=typeof calculoRamoConCompuertas==='function'?calculoRamoConCompuertas(r):null;
    if(base&&base.res)valores=new Map((base.res.breakdown||[]).map(n=>[n.id,n.value]));
  }catch(e){}
  return (r.categorias||[]).map(c=>{
    const notas=(c.notas||[]).filter(n=>typeof n.valor==='number'&&isFinite(n.valor)).map(n=>{
      const nombre=(n.nombre||'').trim()||c.nombre;
      return {id:n.id,nombre,valor:n.valor,clave:claveEvaluacionPanel(nombre)};
    });
    const v=valores.get(c.id);
    const promedio=typeof v==='number'&&isFinite(v)?v:(typeof avgPond==='function'?avgPond(notas):null);
    return {nombre:c.nombre,clave:claveEvaluacionPanel(c.nombre),notas,promedio};
  }).filter(c=>c.notas.length);
}
// La próxima evaluación sin nota del ramo, de hoy en adelante, y cuánto
// necesita en ella para ir con 4 después de rendirla: lo mismo que el alumno
// ve en sus widgets (notaParaIrConCuatro), con las fechas de su Agenda.
// Los ramos que el alumno compartió, que es donde se busca el ramo vinculado.
// Sin esto ramoAvg buscaba en S.ramos, que en el panel son los del PROFESOR: la
// Dinámica de un alumno se combinaba con el laboratorio del profesor. Con una
// búsqueda escrita, igual se usan todos los que compartió, no solo los que se ven.
function ramosDelAlumnoPanel(al){return ((al&&(al.todosLosRamos||al.ramos))||[]).map(ramoParaPanel);}
function proximaEvaluacionPanel(ramo,ahora=new Date(),contexto=[ramo]){
  if(typeof agendaEvents!=='function')return null;
  const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
  let e=null;
  try{e=agendaEvents([ramo]).find(x=>x.pending&&x.fecha>=hoy)||null;}catch(err){return null;}
  if(!e)return null;
  const cuatro=(typeof notaParaIrConCuatro==='function'?notaParaIrConCuatro(e,contexto):null)||{};
  return {evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,fecha:e.fecha,hora:e.hora||null,
    necesita:cuatro.nota||null,margen:!!cuatro.margen,inalcanzable:!!cuatro.inalcanzable};
}
function proximaEvaluacionPanelHTML(p){
  if(!p)return '';
  const cuando=esc(fechaCorta(p.fecha))+(p.hora?' · '+esc(p.hora):'');
  // Sin color: el semáforo es para notas, y esto es una meta.
  const meta=p.necesita?`necesita <b>${esc(p.necesita.replace('.',','))}</b> para ir con 4`
    :p.margen?'va con 4 con cualquier nota'
    :p.inalcanzable?'con esta sola no alcanza el 4':'';
  return `<p class="panel-alumnos-proxima"><span>Próxima: <b>${esc(p.evaluacion)}</b> · ${cuando}</span>${meta?`<span>${meta}</span>`:''}</p>`;
}
// `etiqueta`: true dice "GradeHub"; un texto ("Sección 3") dice ese texto.
function comparacionTexto(prom,personas,etiqueta=false){
  const nombre=etiqueta===true?'GradeHub':etiqueta?esc(etiqueta):'';
  if(prom==null)return `<span class="panel-alumnos-sin">${nombre?nombre+': aún pocos datos':'Aún pocos datos'}</span>`;
  return `<span class="panel-alumnos-gh">${esc(fmtPromedio(Number(prom)))}<small>${nombre?nombre+' · ':''}${personas} personas</small></span>`;
}
// POR SECCIÓN (2026-10-20, pedido de Salva Ramos): el profesor elige comparar
// con todo GradeHub o con la sección de cada alumno, la que escribió en Editar
// ramo. Sin sección declarada no hay con qué comparar y se dice. La elección
// se recuerda en este navegador; si no se puede, parte en GradeHub.
const SIN_SECCION_PANEL=Object.freeze({sinSeccion:true,ramo:null,evaluaciones:[],categorias:[]});
const CLAVE_COMPARA_PANEL='gh_panel_compara';
function comparaSeccionGuardado(){try{return localStorage.getItem(CLAVE_COMPARA_PANEL)==='seccion';}catch(e){return false;}}
function guardarComparaSeccion(v){try{localStorage.setItem(CLAVE_COMPARA_PANEL,v?'seccion':'gradehub');}catch(e){}}
function comparaPanelHTML(seccion){
  const op=(v,t)=>`<button type="button" data-compara="${v}" aria-pressed="${(v==='seccion')===seccion}">${t}</button>`;
  return `<div class="panel-alumnos-compara" role="group" aria-label="Comparar con">${op('gradehub','Todo GradeHub')}${op('seccion','Su sección')}</div>`;
}
// `extra` va bajo la cabeza del ramo (en el panel, cuándo empezó en él). El
// ramo se pliega con la misma flecha que la fila del alumno; `abierto` dice
// cómo parte.
function ramoPanelHTML(r,comp,ahora=new Date(),contexto,extra='',abierto=true){
  const ramo=ramoParaPanel(r);
  contexto=contexto||[ramo];
  const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,contexto):null;
  const sigla=typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla;
  const porNota=new Map(((comp&&comp.evaluaciones)||[]).map(e=>[e.clave,e]));
  const porCategoria=new Map(((comp&&comp.categorias)||[]).map(e=>[e.clave,e]));
  const categorias=categoriasDeRamoPanel(ramo);
  // Una nota cuyo nombre no calza con nadie no repite "aún pocos datos": la
  // comparación útil está en su categoría.
  const sinSeccion=!!(comp&&comp.sinSeccion),guion='<span class="panel-alumnos-sin">—</span>';
  const nombreComp=comp&&Number.isInteger(comp.seccion)?`Sección ${comp.seccion}`:'GradeHub';
  const deNota=n=>{const e=!sinSeccion&&porNota.get(n.clave);return e?comparacionTexto(e.promedio,e.personas):guion;};
  const deCategoria=c=>{if(sinSeccion)return guion;const e=porCategoria.get(c.clave);return comparacionTexto(e?e.promedio:null,e?e.personas:0);};
  const filas=categorias.map(c=>{
    // Una categoría de una sola nota es una sola fila.
    if(c.notas.length===1)return `<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}</td><td>${esc(fmt(c.notas[0].valor))}</td><td>${deCategoria(c)}</td></tr></tbody>`;
    return `<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}<small>${c.notas.length} notas</small></td><td>${c.promedio===null?'·':esc(fmtPromedio(c.promedio))}</td><td>${deCategoria(c)}</td></tr>
      ${c.notas.map(n=>`<tr class="panel-alumnos-nota"><td>${esc(n.nombre)}</td><td>${esc(fmt(n.valor))}</td><td>${deNota(n)}</td></tr>`).join('')}</tbody>`;
  }).join('');
  return `<details class="panel-alumnos-ramo" data-ramo="${esc(ramo.id)}"${abierto?' open':''}>
    <summary class="panel-alumnos-ramo-cabeza">
      <span class="panel-alumnos-ramo-resumen"><span class="panel-alumnos-ramo-nombre"><b>${esc(ramo.nombre)}</b>${sigla?`<small>${esc(sigla)}</small>`:''}</span>
        <span class="panel-alumnos-ramo-cifras"><span class="panel-alumnos-prom">${avg===null?'Sin notas':esc(fmtPromedio(avg))}<small>promedio</small></span>
        ${sinSeccion?'<span class="panel-alumnos-gh">No disponible<small>sin sección</small></span>'
          :comparacionTexto(comp&&comp.ramo?comp.ramo.promedio:null,comp&&comp.ramo?comp.ramo.personas:0,nombreComp==='GradeHub'?true:nombreComp)}</span></span>
    </summary>
    ${extra}
    ${proximaEvaluacionPanelHTML(proximaEvaluacionPanel(ramo,ahora,contexto))}
    ${categorias.length?`<table class="panel-alumnos-notas"><thead><tr><th>Evaluación</th><th>Nota</th><th>${comp&&(sinSeccion||Number.isInteger(comp.seccion))?'Su sección':'GradeHub'}</th></tr></thead>${filas}</table>`
      :'<p class="clase-sin-datos">Todavía no tiene notas en este ramo.</p>'}
  </details>`;
}

// Resumen del grupo (#667): por ramo, cuántos alumnos, su promedio (ramoAvg de
// cada uno, como en su app, y después el promedio simple entre ellos), cómo va
// cada categoría y cada prueba, y cuántos van en cada color del semáforo. Todo
// con lo que el panel ya bajó; la comparación con GradeHub es la misma de
// siempre, agregada y desde 5 personas.
// Cada alumno se calcula con las reglas de nota de SU universidad, no con las
// del profesor que mira. La UAndes redondea a la centésima y después a la
// décima: un 3,946 es 4,0 para un alumno UAndes y 3,9 para uno de la UC. Con
// la universidad del profesor, uno UAndes salía reprobando siendo aprobado, y
// uno UC aprobando siendo reprobado. El motor lee S.tenant en cada llamada:
// acá se pone la del alumno y se restaura siempre, aunque algo falle. Todo lo
// que corre adentro es sincrónico.
function conUniversidadPanel(tenant,fn){
  const conocida=typeof TENANTS==='object'&&TENANTS&&Object.prototype.hasOwnProperty.call(TENANTS,tenant);
  if(!S||!conocida||S.tenant===tenant)return fn();
  const propia=S.tenant;
  S.tenant=tenant;
  try{return fn();}finally{S.tenant=propia;}
}
// El motor busca los ramos vinculados en S.ramos. Durante este cálculo
// sincrónico deben ser los del alumno, nunca los del profesor que mira.
function conRamosAlumnoPanel(al,fn){
  return conUniversidadPanel(al.tenant,()=>{
    const propios=S.ramos,contexto=ramosDelAlumnoPanel(al);
    S.ramos=contexto;
    try{return fn(contexto);}finally{S.ramos=propios;}
  });
}
function resumenAlumnosPanel(alumnos,compDe){
  const media=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  const grupos=new Map();
  (alumnos||[]).forEach(al=>conUniversidadPanel(al.tenant,()=>{const ctx=ramosDelAlumnoPanel(al);(al.ramos||[]).forEach(r=>{
    const ramo=ramoParaPanel(r);
    const sigla=(typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||r.sigla||'';
    // Con la universidad en la clave, un grupo nunca mezcla reglas de nota.
    const clave=`${al.tenant}|`+(sigla?String(sigla).toUpperCase():'nombre|'+claveEvaluacionPanel(ramo.nombre));
    if(!grupos.has(clave))grupos.set(clave,{clave,tenant:al.tenant,nombre:ramo.nombre,sigla,comp:compDe(al,r)||null,alumnos:0,
      promedios:[],semaforo:{good:0,warn:0,bad:0,neutral:0},categorias:new Map()});
    const g=grupos.get(clave);
    g.alumnos++;
    const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
    if(Number.isFinite(avg))g.promedios.push(avg);
    g.semaforo[Number.isFinite(avg)&&typeof nivelRamo==='function'?nivelRamo(ramo,avg):'neutral']++;
    categoriasDeRamoPanel(ramo).forEach(c=>{
      if(!c.clave)return;
      if(!g.categorias.has(c.clave))g.categorias.set(c.clave,{clave:c.clave,nombre:c.nombre,promedios:[],evaluaciones:new Map()});
      const gc=g.categorias.get(c.clave);
      if(Number.isFinite(c.promedio))gc.promedios.push(c.promedio);
      c.notas.forEach(n=>{
        if(!n.clave)return;
        if(!gc.evaluaciones.has(n.clave))gc.evaluaciones.set(n.clave,{clave:n.clave,nombre:n.nombre,notas:[]});
        gc.evaluaciones.get(n.clave).notas.push(n.valor);
      });
    });
  });}));
  return [...grupos.values()].map(g=>({clave:g.clave,tenant:g.tenant,nombre:g.nombre,sigla:g.sigla,comp:g.comp,alumnos:g.alumnos,
    conNotas:g.promedios.length,promedio:media(g.promedios),semaforo:g.semaforo,
    categorias:[...g.categorias.values()].map(c=>({clave:c.clave,nombre:c.nombre,alumnos:c.promedios.length,promedio:media(c.promedios),
      evaluaciones:[...c.evaluaciones.values()].map(e=>({clave:e.clave,nombre:e.nombre,alumnos:e.notas.length,promedio:media(e.notas)}))}))}))
    .sort((x,y)=>y.alumnos-x.alumnos||String(x.nombre).localeCompare(String(y.nombre),'es'));
}
function resumenAlumnosPanelHTML(resumen){
  const n=(k,uno,varios)=>`${k} ${k===1?uno:varios}`;
  const prom=v=>v===null?'·':esc(fmtPromedio(v));
  const ramos=resumen.map(g=>conUniversidadPanel(g.tenant,()=>{
    const comp=g.comp||{};
    const porNota=new Map((comp.evaluaciones||[]).map(e=>[e.clave,e]));
    const porCategoria=new Map((comp.categorias||[]).map(e=>[e.clave,e]));
    const gh=e=>comparacionTexto(e?e.promedio:null,e?e.personas:0);
    const dif=g.promedio!==null&&comp.ramo&&comp.ramo.promedio!=null?g.promedio-Number(comp.ramo.promedio):null;
    // El semáforo dice aprobando / al borde / reprobando, nunca decoración.
    const sem=[['good','aprobando'],['warn','al borde'],['bad','reprobando']].filter(([k])=>g.semaforo[k])
      .map(([k,t])=>`<span class="panel-resumen-sem panel-resumen-${k}">${g.semaforo[k]} ${t}</span>`).join('')+
      (g.semaforo.neutral?`<span class="panel-resumen-sem">${g.semaforo.neutral} sin notas</span>`:'');
    const filas=g.categorias.map(c=>`<tbody><tr class="panel-alumnos-cat"><td>${esc(c.nombre)}<small>${n(c.alumnos,'alumno','alumnos')}</small></td><td>${prom(c.promedio)}</td><td>${gh(porCategoria.get(c.clave))}</td></tr>
      ${c.evaluaciones.length>1?c.evaluaciones.map(e=>`<tr class="panel-alumnos-nota"><td>${esc(e.nombre)}<small>${n(e.alumnos,'nota','notas')}</small></td><td>${prom(e.promedio)}</td><td>${porNota.has(e.clave)?gh(porNota.get(e.clave)):'<span class="panel-alumnos-sin">—</span>'}</td></tr>`).join(''):''}</tbody>`).join('');
    return `<details class="panel-resumen-ramo">
      <summary>
        <span class="panel-resumen-nombre"><b>${esc(g.nombre)}</b><small>${g.sigla?esc(g.sigla)+' · ':''}${n(g.alumnos,'alumno','alumnos')}</small></span>
        <span class="panel-alumnos-prom">${g.promedio===null?'Sin notas':prom(g.promedio)}<small>tus alumnos</small></span>
        ${comparacionTexto(comp.ramo?comp.ramo.promedio:null,comp.ramo?comp.ramo.personas:0,true)}
        <span class="panel-resumen-semaforo">${sem}</span>
      </summary>
      ${dif===null?'':`<p class="panel-resumen-dif">Tus alumnos van <b>${Math.abs(dif)<0.05?'igual que':`${esc(unDecimalPanel(dif))} ${dif>0?'sobre':'bajo'}`}</b> el promedio de GradeHub en este ramo.</p>`}
      ${g.categorias.length?`<table class="panel-alumnos-notas"><thead><tr><th>Evaluación</th><th>Tus alumnos</th><th>GradeHub</th></tr></thead>${filas}</table>`
        :'<p class="clase-sin-datos">Todavía no hay notas en este ramo.</p>'}
      <button type="button" class="agent-refresh panel-resumen-ver" data-ver-ramo="${esc(g.sigla||g.nombre)}">Ver ${n(g.alumnos,'alumno','alumnos')} de este ramo</button>
    </details>`;
  })).join('');
  return `<section class="panel-alumnos-resumen" aria-labelledby="resumen-titulo">
    <div class="profesor-hig-lista-cabeza"><h2 id="resumen-titulo">Tus alumnos por ramo</h2><span>${n(resumen.length,'ramo','ramos')}</span></div>
    ${ramos}
    <p class="clase-privacidad">“Tus alumnos” es el promedio simple entre los alumnos con nota. Si van sobre o bajo GradeHub no dice por qué: también cuentan el profesor de cátedra, la sección y lo que cada uno estudia.</p>
  </section>`;
}

// ─── ESTADÍSTICAS DEL PROFESOR: ANTES Y AHORA (#697) ─────────────────────────
// Cómo les iba a sus alumnos antes de empezar con el profesor y cómo les va
// ahora. La medida principal es la DIFERENCIA CON EL CURSO: la nota menos el
// promedio de GradeHub en esa misma evaluación (desde 5 personas), para que una
// prueba más fácil no parezca una mejora. Una evaluación sin fecha no se puede
// poner antes ni después: queda fuera y se cuenta. Con menos de
// MIN_EVALS_COMPARACION evaluaciones comparables a cada lado no hay "cambio".
// Antes y después no prueba que la mejora sea por las clases: quien busca
// clases suele hacerlo en su peor momento, y desde ahí se sube algo igual.
const MIN_EVALS_COMPARACION=2;
function diaLocalPanel(f){
  // Una fecha sin hora ya es un día: leída con new Date sería medianoche UTC,
  // que en Chile todavía es el día anterior (el 1 de septiembre salía 31 de agosto).
  if(typeof f==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(f))return f;
  const d=f instanceof Date?f:new Date(f);if(f==null||isNaN(d))return null;
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
const mediaPanel=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
function medianaPanel(xs){
  if(!xs.length)return null;const o=xs.slice().sort((a,b)=>a-b),m=o.length>>1;
  return o.length%2?o[m]:(o[m-1]+o[m])/2;
}
// Cada nota con su fecha (la de la Agenda del alumno) y el promedio del curso
// en esa evaluación. Una categoría de una sola evaluación se compara con su
// categoría, que es la misma prueba.
function evaluacionesConFechaPanel(ramo,comp){
  const porNota=new Map(((comp&&comp.evaluaciones)||[]).map(e=>[e.clave,e]));
  const porCategoria=new Map(((comp&&comp.categorias)||[]).map(e=>[e.clave,e]));
  const out=[],vistas=new Set();
  let eventos=[];try{eventos=typeof agendaEvents==='function'?agendaEvents([ramo]):[];}catch(e){}
  eventos.forEach(e=>(e.notas||[]).forEach(n=>{
    if(typeof n.valor!=='number'||vistas.has(n.id))return;
    vistas.add(n.id);
    const nombre=(n.nombre||'').trim()||e.cat.nombre;
    const unica=!(Number.isInteger(e.cat.slots)&&e.cat.slots>1)&&(e.cat.notas||[]).length<=1;
    const ref=porNota.get(claveEvaluacionPanel(nombre))||(unica?porCategoria.get(claveEvaluacionPanel(e.cat.nombre)):null);
    out.push({id:n.id,ramo:ramo.nombre,ramoId:ramo.id,evaluacion:nombre,fecha:e.fecha,nota:n.valor,
      curso:ref&&ref.promedio!=null&&isFinite(Number(ref.promedio))?Number(ref.promedio):null,
      aprobada:typeof notaAprobada==='function'?notaAprobada(n.valor):n.valor>=4});
  }));
  let sinFecha=0;
  (ramo.categorias||[]).forEach(c=>(c.notas||[]).forEach(n=>{if(typeof n.valor==='number'&&!vistas.has(n.id))sinFecha++;}));
  return {evaluaciones:out,sinFecha};
}
function resumenLadoPanel(lista){
  const comparadas=lista.filter(e=>e.curso!==null);
  return {n:lista.length,nComparadas:comparadas.length,
    promedio:mediaPanel(lista.map(e=>e.nota)),
    diferencia:mediaPanel(comparadas.map(e=>e.nota-e.curso)),
    aprobacion:lista.length?lista.filter(e=>e.aprobada).length/lista.length:null};
}
// Cuándo empezó con el profesor EN ESE RAMO (pedido de Salva Ramos,
// 2026-10-20: la mitad toma más de una clase, cada una desde otra fecha). La
// fecha propia del ramo; si no, la que el profesor puso para todo (#697); si
// no, cuándo compartió. `fuente` dice cuál de las tres es.
function inicioRamoPanel(al,r){
  const propia=al&&al.inicio_ramos&&r?al.inicio_ramos[r.id]:null;
  if(propia)return {dia:diaLocalPanel(propia),fuente:'ramo'};
  if(al&&al.inicio)return {dia:diaLocalPanel(al.inicio),fuente:'general'};
  return {dia:diaLocalPanel(al&&al.desde),fuente:'compartio'};
}
// `inicio`, si viene, manda sobre la fecha de cada ramo.
function metricasAlumnoPanel(al,compDe,{inicio}={}){
  return conUniversidadPanel(al.tenant,()=>{
    const desde=diaLocalPanel(inicio!==undefined?inicio:(al.inicio||al.desde));
    let evaluaciones=[],sinFecha=0;
    (al.ramos||[]).forEach(r=>{
      const x=evaluacionesConFechaPanel(ramoParaPanel(r),compDe(al,r));
      const corte=inicio!==undefined?desde:inicioRamoPanel(al,r).dia;
      x.evaluaciones.forEach(e=>{e.inicio=corte;e.lado=corte&&e.fecha<corte?'antes':'ahora';});
      evaluaciones=evaluaciones.concat(x.evaluaciones);sinFecha+=x.sinFecha;
    });
    evaluaciones.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0);
    const antes=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='antes'));
    const ahora=resumenLadoPanel(evaluaciones.filter(e=>e.lado==='ahora'));
    const suficiente=antes.nComparadas>=MIN_EVALS_COMPARACION&&ahora.nComparadas>=MIN_EVALS_COMPARACION;
    return {id:al.id,nombre:al.nombre_visible,desde,antes,ahora,sinFecha,evaluaciones,
      cambio:suficiente?ahora.diferencia-antes.diferencia:null};
  });
}
// El grupo: la mediana del cambio (un alumno que subió mucho no la mueve sola),
// cuántos mejoraron de los que tienen datos, y aprobación y promedio de todas
// las evaluaciones juntas, antes y ahora.
function metricasGrupoPanel(alumnos,compDe,{inicioDe}={}){
  const porAlumno=(alumnos||[]).map(al=>metricasAlumnoPanel(al,compDe,inicioDe?{inicio:inicioDe(al)}:{}));
  const conCambio=porAlumno.filter(m=>m.cambio!==null);
  const todas=lado=>porAlumno.flatMap(m=>m.evaluaciones.filter(e=>e.lado===lado));
  return {alumnos:porAlumno,conCambio:conCambio.length,
    mejoraron:conCambio.filter(m=>m.cambio>0).length,
    cambioMediana:medianaPanel(conCambio.map(m=>m.cambio)),
    antes:resumenLadoPanel(todas('antes')),ahora:resumenLadoPanel(todas('ahora')),
    sinFecha:porAlumno.reduce((s,m)=>s+m.sinFecha,0)};
}

// Buscador del panel: por el nombre con que el alumno eligió aparecer, o por
// ramo o sigla, sin importar tildes ni mayúsculas. Si calza el nombre se ven
// todos sus ramos; si calza un ramo, solo ese.
function filtrarAlumnosPanel(alumnos,texto){
  const q=claveEvaluacionPanel(texto);
  if(!q)return alumnos;
  const calza=s=>(claveEvaluacionPanel(s)||'').includes(q);
  return alumnos.map(al=>{
    if(calza(al.nombre_visible))return al;
    const ramos=(al.ramos||[]).filter(r=>calza(r.nombre)||calza(r.sigla)||
      (typeof siglaDeRamo==='function'&&calza(siglaDeRamo(r))));
    return ramos.length?{...al,ramos,todosLosRamos:al.todosLosRamos||al.ramos}:null;
  }).filter(Boolean);
}
// ─── La pantalla de "antes y ahora" ──────────────────────────────────────────
// Tres cifras del grupo (cifras destacadas, no gráficos) y, en cada alumno, su
// cambio, un gráfico de una sola serie y la lista con las mismas cifras. Nada
// lleva los colores del semáforo: subir respecto del curso no es "aprobar".
const unDecimalPanel=v=>Math.abs(v).toFixed(1);
const conSignoPanel=v=>(v>0.049?'+':v<-0.049?'−':'')+unDecimalPanel(v);
const porcentajePanel=v=>v===null?'—':Math.round(v*100)+'%';
function frenteAlCursoPanel(d,referencia='el curso'){
  if(d===null)return 'sin comparación';
  return Math.abs(d)<0.05?`igual que ${referencia}`:`${unDecimalPanel(d)} ${d>0?'sobre':'bajo'} ${referencia}`;
}
// Cada alumno en una fila (Lucas, 2026-10-23: Estadísticas necesitaba algo
// visual): dónde estaba respecto del curso antes de empezar (punto hueco) y
// dónde está ahora (punto lleno), sobre una misma escala con el curso al
// centro. Ordenados por cuánto cambiaron; tocar la fila abre su ficha. El
// texto de cada fila dice lo mismo que el dibujo, para VoiceOver.
function graficoAlumnosAntesAhoraHTML(g,{seccion=false}={}){
  const ref=seccion?'su sección':'el curso';
  const conDatos=(g.alumnos||[]).filter(m=>m&&m.antes&&m.ahora&&(m.antes.diferencia!==null||m.ahora.diferencia!==null));
  if(!conDatos.length)return '';
  const lim=Math.max(1,Math.ceil(Math.max(...conDatos.flatMap(m=>[m.antes.diferencia,m.ahora.diferencia]).filter(v=>v!==null).map(Math.abs))));
  const pos=d=>(50+Math.max(-1,Math.min(1,d/lim))*50).toFixed(1);
  const lado=d=>d===null?'sin datos':Math.abs(d)<0.05?`igual que ${ref}`:`${unDecimalPanel(d)} ${d>0?'sobre':'bajo'} ${ref}`;
  const orden=[...conDatos].sort((a,b)=>(b.cambio??-99)-(a.cambio??-99)||String(a.nombre).localeCompare(String(b.nombre),'es'));
  const filas=orden.map(m=>{
    const a=m.antes.diferencia,b=m.ahora.diferencia;
    const tramo=a!==null&&b!==null?`<i class="ah-tramo" style="left:${pos(Math.min(a,b))}%;width:${(pos(Math.max(a,b))-pos(Math.min(a,b))).toFixed(1)}%"></i>`:'';
    return `<li><button type="button" data-ver-alumno="${esc(m.id)}">
      <span class="ah-fila-nombre">${esc(m.nombre)}</span>
      <span class="ah-pista" aria-hidden="true"><i class="ah-centro"></i>${tramo}${a!==null?`<i class="ah-dot ah-dot-antes" style="left:${pos(a)}%"></i>`:''}${b!==null?`<i class="ah-dot ah-dot-ahora" style="left:${pos(b)}%"></i>`:''}</span>
      <span class="ah-fila-valores" aria-hidden="true"><span>Antes <b>${esc(lado(a))}</b></span><span>Ahora <b>${esc(lado(b))}</b></span></span>
      <span class="ah-fila-cambio"><small>Cambio</small>${m.cambio===null?'—':esc(conSignoPanel(m.cambio))}<small>puntos</small></span>
      <span class="sr-solo">Antes: ${lado(a)}. Ahora: ${lado(b)}.${m.cambio===null?' Aún pocos datos para el cambio.':''}</span></button></li>`;
  }).join('');
  const fuera=g.alumnos.length-conDatos.length;
  return `<section class="ah-alumnos" aria-labelledby="ah-alumnos-titulo">
    <div class="profesor-hig-lista-cabeza"><h2 id="ah-alumnos-titulo">Cada alumno, antes y ahora</h2></div>
    <p class="panel-alumnos-contexto">Diferencia en puntos de nota frente a ${ref}. Toca un alumno para ver sus evaluaciones.</p>
    <p class="ah-leyenda-fila"><span><i class="ah-dot ah-dot-antes"></i>Antes de empezar contigo</span><span><i class="ah-dot ah-dot-ahora"></i>Desde que empezó</span></p>
    <div class="ah-escala" aria-hidden="true"><span></span><span class="ah-escala-ejes"><span>${lim} bajo</span><span>${seccion?'Su sección':'El curso'}</span><span>${lim} sobre</span></span><span></span></div>
    <ul class="ah-filas">${filas}</ul>
    ${fuera?`<p class="clase-sin-datos">${fuera} ${fuera===1?'alumno no tiene':'alumnos no tienen'} evaluaciones comparables con fecha todavía.</p>`:''}
  </section>`;
}
// `seccion`: la comparación es con la sección de cada alumno; `sinSeccion`,
// cuántos alumnos no la declararon en algún ramo.
function antesAhoraGrupoHTML(g,{seccion=false,sinSeccion=0}={}){
  if(!g||!g.alumnos.length)return '';
  const respecto=seccion?'Respecto de su sección':'Respecto del curso';
  const tituloCambio=seccion?'Cambio frente a su sección':'Cambio frente al curso';
  const conFecha=g.antes.n+g.ahora.n;
  const cifra=(valor,etiqueta,detalle)=>`<div class="ah-cifra"><span class="ah-cifra-valor">${valor}</span><span class="ah-cifra-etiqueta">${etiqueta}</span><small>${detalle}</small></div>`;
  const pocos='Aún pocos datos';
  const cifras=[
    g.cambioMediana===null?cifra('—',tituloCambio,pocos)
      :cifra(esc(conSignoPanel(g.cambioMediana)),tituloCambio,`puntos · mediana de ${g.conCambio} ${g.conCambio===1?'alumno':'alumnos'}`),
    g.conCambio?cifra(`${g.mejoraron} de ${g.conCambio}`,'Mejoraron',respecto.toLowerCase()):cifra('—','Mejoraron',pocos),
    cifra(`${porcentajePanel(g.antes.aprobacion)} → ${porcentajePanel(g.ahora.aprobacion)}`,'Evaluaciones aprobadas','Antes → desde que empezaron')
  ].join('');
  const prom=v=>v===null?'—':esc(fmt(v));
  return `<section class="ah-grupo" aria-labelledby="ah-titulo">
    <div class="profesor-hig-lista-cabeza"><h2 id="ah-titulo">Desde que empezaron contigo</h2></div>
    <p class="panel-alumnos-contexto">${respecto}. El cambio describe sus resultados; no demuestra que se deba a las clases.</p>
    <div class="ah-cifras">${cifras}</div>
    <p class="ah-nota">Promedio de sus evaluaciones: ${prom(g.antes.promedio)} antes · ${prom(g.ahora.promedio)} desde que empezaron contigo.</p>
    ${graficoAlumnosAntesAhoraHTML(g,{seccion})}
    <details class="ah-metodo"><summary>Cómo se calcula</summary><p class="clase-privacidad">Con ${conFecha} ${conFecha===1?'evaluación':'evaluaciones'} con fecha${g.sinFecha?`; ${g.sinFecha} ${g.sinFecha===1?'evaluación sin fecha no cuenta':'evaluaciones sin fecha no cuentan'}`:''}. “${respecto}” compara cada nota con el promedio de ${seccion?'su misma sección en GradeHub':'GradeHub'} en esa misma prueba, antes y después de que empezaran contigo.${sinSeccion?` ${sinSeccion} ${sinSeccion===1?'alumno no declaró su sección en algún ramo: ese ramo no cuenta':'alumnos no declararon su sección en algún ramo: esos ramos no cuentan'}.`:''} El cambio de cada alumno pide al menos ${MIN_EVALS_COMPARACION} evaluaciones comparables antes y ${MIN_EVALS_COMPARACION} después. No prueba que la mejora sea por tus clases: quien busca clases suele hacerlo en su peor momento, y desde ahí se sube algo igual.</p></details>
  </section>`;
}
// Una serie: la diferencia con el curso en cada evaluación comparable. La
// línea del curso (0) va tenue. Si los ramos empezaron en días distintos, cada
// uno lleva su marca y su fecha en la leyenda; los puntos anteriores van huecos.
// Cada punto tiene un área de 12 px para mostrar su detalle.
function graficoAntesAhoraSVG(m,{seccion=false}={}){
  const referencia=seccion?'su sección':'el curso',etiqueta=seccion?'sección':'curso';
  const pts=m.evaluaciones.filter(e=>e.curso!==null);
  if(pts.length<2)return '';
  // PL deja lugar a la escala de la izquierda (2026-10-23): sin ella no se leía
  // cuánto sobre o bajo el curso iba cada punto.
  const W=320,H=96,P=14,PL=30;
  const lim=Math.max(1,Math.ceil(Math.max(...pts.map(e=>Math.abs(e.nota-e.curso)))));
  // Una línea por ramo, cada una de su color, con su nombre en la leyenda (el
  // color solo no basta). Con un ramo los puntos van parejos; con varios, por
  // fecha, para que las líneas calcen en el tiempo.
  const ramos=[...new Set(pts.map(e=>e.ramoId??e.ramo))];
  const varios=ramos.length>1;
  const inicios=ramos.map(clave=>{const e=pts.find(p=>(p.ramoId??p.ramo)===clave);return {nombre:e.ramo,fecha:e.inicio};});
  const variosInicios=varios&&new Set(inicios.map(e=>e.fecha).filter(Boolean)).size>1;
  const t=f=>Date.parse(f+'T12:00:00Z');
  const fechasEje=variosInicios?pts.map(e=>e.fecha).concat(inicios.map(e=>e.fecha).filter(Boolean)):pts.map(e=>e.fecha);
  const t0=Math.min(...fechasEje.map(t)),t1=Math.max(...fechasEje.map(t));
  const xFecha=f=>PL+(t(f)-t0)/(t1-t0)*(W-PL-P);
  const xs=pts.map((e,i)=>varios&&t1>t0?xFecha(e.fecha):PL+i*(W-PL-P)/(pts.length-1));
  const y=d=>H/2-(d/lim)*(H/2-P);
  const corte=pts.findIndex(e=>e.lado==='ahora');
  const unCorte=!variosInicios&&(corte<0||pts.slice(corte).every(e=>e.lado==='ahora'));
  const xc=unCorte&&corte>0?((xs[corte-1]+xs[corte])/2).toFixed(1):null;
  const marcas=variosInicios?inicios.map((e,k)=>{
    if(!e.fecha)return '';
    const iguales=inicios.slice(0,k).filter(p=>p.fecha===e.fecha).length;
    const x=Math.min(W-P,Math.max(P,xFecha(e.fecha)+iguales*3)).toFixed(1);
    return `<line class="ah-marca-ramo ah-serie-${k%4}" x1="${x}" y1="4" x2="${x}" y2="${H-4}"/>`;
  }).join(''):xc?`<line class="ah-inicio" x1="${xc}" y1="4" x2="${xc}" y2="${H-4}"/><text class="ah-eje" x="${(+xc+4).toFixed(1)}" y="12">empezó</text>`:'';
  const series=ramos.map((clave,k)=>{
    const idx=pts.map((e,i)=>(e.ramoId??e.ramo)===clave?i:-1).filter(i=>i>=0);
    const linea=idx.map((i,j)=>`${j?'L':'M'}${xs[i].toFixed(1)} ${y(pts[i].nota-pts[i].curso).toFixed(1)}`).join(' ');
    const puntos=idx.map(i=>{const e=pts[i],cx=xs[i].toFixed(1),cy=y(e.nota-e.curso).toFixed(1);
      return `<g><title>${esc(e.evaluacion)} · ${esc(e.ramo)} · ${esc(fechaCorta(e.fecha))}${unCorte?'':e.lado==='antes'?' · antes':' · ahora'}: ${esc(fmt(e.nota))} (${etiqueta} ${esc(fmt(e.curso))})</title><circle class="ah-zona" cx="${cx}" cy="${cy}" r="12"/><circle class="ah-punto${unCorte||e.lado==='ahora'?'':' ah-antes'}" cx="${cx}" cy="${cy}" r="4"/></g>`;}).join('');
    return `<g class="ah-serie-${k%4}">${idx.length>1?`<path class="ah-linea" d="${linea}"/>`:''}${puntos}</g>`;
  }).join('');
  const inicioTexto=e=>e.fecha?` · desde el ${fechaCorta(e.fecha)}`:' · sin fecha de inicio';
  const leyenda=varios?`<p class="ah-leyenda">${inicios.map((e,k)=>`<span class="ah-serie-${k%4}"><i aria-hidden="true"></i>${esc(e.nombre)}${esc(inicioTexto(e))}</span>`).join('')}</p>`:'';
  const resumen=`Diferencia con ${referencia} en ${pts.length} evaluaciones${varios?` de ${ramos.length} ramos`:''}: antes ${frenteAlCursoPanel(m.antes.diferencia,referencia)}, ahora ${frenteAlCursoPanel(m.ahora.diferencia,referencia)}${varios?'; '+inicios.map(e=>e.nombre+inicioTexto(e)).join('; '):inicios[0].fecha?`; empezó el ${fechaCorta(inicios[0].fecha)}`:''}`;
  return `<svg class="ah-grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resumen)}"><line class="ah-cero" x1="${PL}" y1="${H/2}" x2="${W-P}" y2="${H/2}"/><text class="ah-eje" x="0" y="${P+4}">+${lim}</text><text class="ah-eje" x="0" y="${H/2+4}">${etiqueta}</text><text class="ah-eje" x="0" y="${H-P+4}">−${lim}</text>${marcas}${series}</svg>
    <p class="ah-fechas"><span>${esc(fechaCorta(pts[0].fecha))}</span><span>${esc(fechaCorta(pts[pts.length-1].fecha))}</span></p>
    ${leyenda}<p class="ah-pie">${varios?'Por fecha.':'Evaluaciones en orden de fecha, con igual espacio entre puntos.'} Diferencia en puntos de nota. La línea central es el promedio ${seccion?'de su sección':'del curso'}: arriba, sobre ese promedio; abajo, bajo él.${unCorte?'':' Los puntos huecos son de antes de empezar cada ramo.'}</p>`;
}
function antesAhoraAlumnoHTML(m,{sinSeccion=false,seccion=false}={}){
  const referencia=seccion?'su sección':'el curso';
  if(!m||!m.evaluaciones.length)return '';
  const resumen=sinSeccion?'Por sección: no disponible, no declaró su sección'
    :m.cambio===null?'Aún pocos datos para comparar antes y ahora'
    :Math.abs(m.cambio)<0.05?`Igual que antes, respecto ${seccion?'de su sección':'del curso'}`
    :`${m.cambio>0?'Subió':'Bajó'} ${unDecimalPanel(m.cambio)} puntos respecto ${seccion?'de su sección':'del curso'}`;
  const filas=m.evaluaciones.map(e=>`<tr><td>${esc(fechaCorta(e.fecha))}</td><td>${esc(e.evaluacion)}<small>${esc(e.ramo)} · ${e.lado==='antes'?'antes':'ahora'}</small></td><td>${esc(fmt(e.nota))}</td><td>${e.curso===null?'—':esc(fmt(e.curso))}</td></tr>`).join('');
  return `<div class="ah-alumno">
    <p class="ah-alumno-resumen">${resumen}</p>
    ${sinSeccion?'':`<p class="ah-alumno-lados"><span>Antes: ${frenteAlCursoPanel(m.antes.diferencia,referencia)}</span><span>Ahora: ${frenteAlCursoPanel(m.ahora.diferencia,referencia)}</span></p>`}
    <div class="panel-alumnos-grafico-detalle">${graficoAntesAhoraSVG(m,{seccion})}</div>
    <details class="ah-detalle"><summary>Ver sus evaluaciones</summary>
      <table class="panel-alumnos-notas"><thead><tr><th>Fecha</th><th>Evaluación</th><th>Nota</th><th>${seccion?'Sección':'Curso'}</th></tr></thead><tbody>${filas}</tbody></table>
      ${m.sinFecha?`<p class="clase-sin-datos">${m.sinFecha} ${m.sinFecha===1?'nota sin fecha no cuenta':'notas sin fecha no cuentan'}.</p>`:''}
    </details>
  </div>`;
}

// "Empezó contigo el …", en cada ramo: por omisión el día que compartió, que
// suele ser después de la primera clase; el profesor lo corrige ramo por ramo
// y las estadísticas de ese ramo comparan desde ahí.
function lineaInicioRamoHTML(al,r){
  const {dia,fuente}=inicioRamoPanel(al,r);if(!dia)return '';
  return `<p class="panel-alumnos-inicio"><span>Empezó contigo el <b>${esc(fechaCorta(dia))}</b>${fuente==='compartio'?' · el día que compartió':''}</span>
    <button type="button" class="agent-refresh" data-inicio-alumno="${esc(al.id)}" data-inicio-ramo="${esc(r.id)}" aria-label="Cambiar cuándo empezó en ${esc(r.nombre||'este ramo')}">Cambiar</button></p>`;
}
// Hoja con el selector de fecha del sistema (HIG: Date pickers). La fecha no
// puede ser futura: no se compara contra lo que todavía no pasa.
function abrirInicioRamo(al,r,alGuardar,rpc=(nombre,args)=>supabaseClient.rpc(nombre,args)){
  const caja=document.getElementById('modal-content');if(!caja)return;
  const hoy=diaLocalPanel(new Date()),actual=inicioRamoPanel(al,r);
  // Quitar la fecha propia vuelve a la que el profesor puso para todo (#697)
  // o, si no hay, al día que compartió.
  const volverA=al.inicio?`Volver al ${esc(fechaCorta(diaLocalPanel(al.inicio)))}`:'Usar el día que compartió';
  caja.innerHTML=`<div class="modal-title" id="modal-titulo">¿Cuándo empezó ${esc(al.nombre_visible)} contigo en ${esc(r.nombre||'este ramo')}?</div>
    <p class="compartir-explica">Las estadísticas de este ramo comparan cómo le iba antes de esa fecha y cómo le va desde ahí.</p>
    <label class="modal-label" for="inicio-fecha">Primera clase de este ramo</label>
    <div class="modal-input"><input type="date" id="inicio-fecha" min="2000-01-01" max="${hoy}" value="${esc(actual.dia||'')}"></div>
    <p class="compartir-error" id="inicio-error" role="alert" hidden></p>
    ${actual.fuente==='ramo'?`<button type="button" class="rep-link" id="inicio-reset">${volverA}</button>`:''}
    <div class="modal-btns"><button type="button" class="btn-cancel" id="inicio-cancelar">Cancelar</button><button type="button" class="btn-confirm" id="inicio-guardar">Guardar</button></div>`;
  openModal();
  const error=caja.querySelector('#inicio-error'),boton=caja.querySelector('#inicio-guardar');
  const avisar=t=>{error.textContent=t;error.hidden=!t;};
  const guardar=async valor=>{
    boton.disabled=true;avisar('');
    try{
      const {data,error:e}=await rpc('fijar_inicio_ramo_alumno',{p_id:al.id,p_ramo:r.id,p_inicio:valor});
      if(e)throw e;
      // false: el alumno dejó de compartir ese ramo mientras la hoja estaba abierta.
      if(data===false){boton.disabled=false;avisar('Ya no te comparte este ramo.');return;}
      closeModal();showToast('Fecha guardada.');alGuardar();
    }catch(e){boton.disabled=false;avisar(/futura/.test((e&&e.message)||'')?'Elige una fecha que ya pasó.':'No pudimos guardarla. Intenta de nuevo.');}
  };
  caja.querySelector('#inicio-cancelar').addEventListener('click',closeModal);
  boton.addEventListener('click',()=>{
    const v=caja.querySelector('#inicio-fecha').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){avisar('Elige una fecha.');return;}
    if(v>hoy){avisar('Elige una fecha que ya pasó.');return;}
    guardar(v);
  });
  const reset=caja.querySelector('#inicio-reset');if(reset)reset.addEventListener('click',()=>guardar(null));
}
function datosFilaAlumnoPanel(al,ahora=new Date()){
  return conRamosAlumnoPanel(al,contexto=>{
    const visibles=(al.ramos||[]).map(ramoParaPanel);
    const estados={good:0,warn:0,bad:0,neutral:0};
    const datos=visibles.map(ramo=>{
      let avg=null,necesita=null,pendiente=0,nivel='neutral';
      try{
        avg=ramoAvg(ramo,undefined,contexto);
        if(Number.isFinite(avg)){
          nivel=nivelRamo(ramo,avg);
          pendiente=estadoParaNotaNecesaria(ramo).pendiente;
          if(pendiente>0){
            necesita=notaNecesaria(ramo);
            if(!Number.isFinite(necesita))necesita=null;
          }
        }
      }catch(e){}
      estados[nivel]++;
      return {ramo,avg,nivel,necesita,pendiente};
    });
    const nivel=estados.bad?'bad':estados.warn?'warn':estados.good?'good':'neutral';
    const prioridad=Math.max(0,...datos.map(d=>d.avg===null?0:d.necesita!==null&&d.necesita>7.05?5
      :d.necesita!==null&&d.necesita>5?4:d.nivel==='bad'?3:d.nivel==='warn'?2:1));
    const exigencia=Math.max(0,...datos.map(d=>Number.isFinite(d.necesita)?d.necesita:0));
    const exigente=datos.filter(d=>Number.isFinite(d.necesita)).sort((a,b)=>b.necesita-a.necesita)[0]||null;
    const hoy=isoOf(ahora.getFullYear(),ahora.getMonth(),ahora.getDate());
    let proxima=null;
    try{
      const evento=agendaEvents(visibles).find(e=>e.pending&&e.fecha>=hoy);
      if(evento){
        const d=datos.find(x=>x.ramo===evento.ramo);
        const cuatro=notaParaIrConCuatro(evento,contexto)||{};
        const peso=pesoEventoAgenda(evento);
        proxima={ramo:evento.ramo.nombre,evaluacion:(evento.nota&&evento.nota.nombre)||evento.cat.nombre,
          fecha:evento.fecha,hora:evento.hora||null,avg:d?d.avg:null,necesita:d?d.necesita:null,cuatro,
          // Misma regla que la Agenda: «pesa poco» es menos del 10% del ramo.
          pesaPoco:peso!==null&&peso<EVALUACION_PESA_POCO};
      }
    }catch(e){}
    return {al,nivel,estados,prioridad,exigencia,exigente,proxima,porRamo:datos.map(d=>({nombre:d.ramo.nombre,nivel:d.nivel}))};
  });
}
function proximaFilaAlumnoHTML(p,exigente){
  if(!p)return `<span class="panel-alumnos-fila-proxima">Sin próxima evaluación con fecha</span>
    <span class="panel-alumnos-fila-meta">${exigente
      ?exigente.necesita>7.05?`Con lo pendiente no alcanza para aprobar ${esc(exigente.ramo.nombre)}`
        :`Para aprobar ${esc(exigente.ramo.nombre)}: ${esc(nfNecesaria(exigente.necesita).replace('.',','))} en lo pendiente`
      :'Aún no se puede calcular cuánto necesita'}</span>`;
  const cuando=fechaCorta(p.fecha)+(p.hora?' · '+p.hora:'');
  let meta='Aún sin notas para calcular cuánto necesita';
  if(p.avg!==null){
    if(p.necesita!==null&&p.necesita>7.05)meta='Con lo pendiente no alcanza para aprobar';
    else if(p.necesita!==null){
      meta=`Para aprobar: ${nfNecesaria(p.necesita).replace('.',',')} en lo pendiente`;
      // Como la Agenda (Lucas, 2026-10-22): si esta sola lo deja en 4,0, se dice
      // la nota, pese lo que pese; si no, y vale menos del 10% del ramo, pesa poco.
      if(p.cuatro.nota)meta+=` · ${p.cuatro.nota.replace('.',',')} en esta para ir con 4`;
      else if(p.pesaPoco)meta+=' · esta evaluación pesa poco';
      else if(p.cuatro.inalcanzable)meta+=' · con esta sola no alcanza';
    }else if(p.cuatro.nota)meta=`${p.cuatro.nota.replace('.',',')} en esta evaluación para ir con 4`;
    else meta='Aún no se puede calcular cuánto necesita';
  }
  return `<span class="panel-alumnos-fila-proxima">Próxima: <b>${esc(p.evaluacion)}</b> · ${esc(p.ramo)} · ${esc(cuando)}</span>
    <span class="panel-alumnos-fila-meta">${esc(meta)}</span>`;
}
// ─── RESUMEN DE ALUMNOS (Lucas, 2026-10-22) ──────────────────────────────────
// La vista con la que abre Alumnos: a quién atender y quién rinde esta semana.
// Sale de lo que el panel ya bajó; no consulta nada nuevo.
const DIAS_SEMANA_PANEL=7,MAX_FILAS_RESUMEN_PANEL=10;
function fechaLargaPanel(iso){
  const d=new Date(iso+'T12:00:00');if(isNaN(d))return iso;
  const dia=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][d.getDay()];
  return `${dia[0].toUpperCase()+dia.slice(1)} ${fechaCorta(iso)}`;
}
function resumenInicioAlumnosPanel(alumnos,ahora=new Date()){
  const dia=d=>{const x=new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()+d);return isoOf(x.getFullYear(),x.getMonth(),x.getDate());};
  const hoy=dia(0),limite=dia(DIAS_SEMANA_PANEL);
  const diasA=f=>Math.round((new Date(f+'T12:00:00')-new Date(hoy+'T12:00:00'))/86400000);
  const semana=[];
  (alumnos||[]).forEach(al=>conRamosAlumnoPanel(al,()=>{
    let eventos=[];try{eventos=agendaEvents((al.ramos||[]).map(ramoParaPanel));}catch(e){}
    eventos.filter(e=>e.pending&&e.fecha>=hoy&&e.fecha<=limite).forEach(e=>semana.push({al,fecha:e.fecha,hora:e.hora||null,
      dias:diasA(e.fecha),evaluacion:(e.nota&&e.nota.nombre)||e.cat.nombre,ramo:e.ramo.nombre}));
  }));
  // Hoy y mañana primero, como en la Agenda (#814); después por fecha y hora.
  const cuando=x=>`${x.fecha}T${x.hora||''}`;
  semana.sort((a,b)=>cuando(a).localeCompare(cuando(b))||String(a.al.nombre_visible).localeCompare(String(b.al.nombre_visible),'es'));
  const filas=alumnosOrdenadosPanel(alumnos||[],ahora);
  const atencion=filas.map(f=>({al:f.al,ramos:(f.porRamo||[]).filter(d=>d.nivel==='bad'||d.nivel==='warn'),exigente:f.exigente}))
    .filter(f=>f.ramos.length);
  const contar=n=>filas.filter(f=>(f.porRamo||[]).some(d=>d.nivel===n)).length;
  return {semana,atencion,conectados:(alumnos||[]).length,reprobando:contar('bad'),alBorde:contar('warn')};
}
function resumenInicioAlumnosHTML(r){
  const texto=n=>n==='bad'?'Reprobando':'Al borde';
  const cifra=(valor,etiqueta,detalle)=>`<div class="ah-cifra"><span class="ah-cifra-valor">${valor}</span><span class="ah-cifra-etiqueta">${etiqueta}</span><small>${detalle}</small></div>`;
  const mas=(n,vista)=>n>MAX_FILAS_RESUMEN_PANEL?`<button type="button" class="agent-refresh" data-ir-vista="${vista}">Ver ${n-MAX_FILAS_RESUMEN_PANEL} más en la lista</button>`:'';
  // Agrupada por día (2026-10-23): la fecha va una vez como encabezado y no se
  // repite en cada fila; en la fila queda solo la hora, si la hay.
  const diaTexto=x=>x.dias===0?'Hoy':x.dias===1?'Mañana':fechaLargaPanel(x.fecha);
  const visibles=r.semana.slice(0,MAX_FILAS_RESUMEN_PANEL);
  const dias=[...new Set(visibles.map(x=>x.fecha))];
  const semana=r.semana.length?dias.map(f=>{const del=visibles.filter(x=>x.fecha===f);
      return `<h3 class="panel-resumen-dia${del[0].dias<=1?' pronto':''}">${esc(diaTexto(del[0]))}<small>${del.length} ${del.length===1?'evaluación':'evaluaciones'}</small></h3>
      <ul class="panel-resumen-filas">${del.map(x=>`<li><button type="button" data-ver-alumno="${esc(x.al.id)}">
      <span><b>${esc(x.al.nombre_visible)}</b><small>${esc(x.evaluacion)} · ${esc(x.ramo)}</small></span>
      ${x.hora?`<span class="panel-resumen-cuando">${esc(x.hora)}</span>`:''}</button></li>`).join('')}</ul>`;}).join('')+mas(r.semana.length,'lista')
    :'<p class="profesor-hig-vacio">Nadie de tus alumnos tiene evaluaciones en los próximos 7 días.</p>';
  const atencion=r.atencion.length?`<ul class="panel-resumen-filas">${r.atencion.slice(0,MAX_FILAS_RESUMEN_PANEL).map(x=>`<li><button type="button" data-ver-alumno="${esc(x.al.id)}">
      <span><b>${esc(x.al.nombre_visible)}</b><span class="panel-alumnos-fila-estados">${x.ramos.map(d=>`<span class="panel-resumen-sem panel-resumen-${d.nivel}">${esc(d.nombre)} · ${texto(d.nivel)}</span>`).join('')}</span></span>
      ${x.exigente&&Number.isFinite(x.exigente.necesita)?`<span class="panel-resumen-cuando"><span class="panel-resumen-meta">Para aprobar</span><b>${x.exigente.necesita>7.05?'No alcanza':esc(nfNecesaria(x.exigente.necesita).replace('.',','))}</b><small>${x.exigente.necesita>7.05?esc(x.exigente.ramo.nombre):`en lo pendiente de ${esc(x.exigente.ramo.nombre)}`}</small></span>`:''}</button></li>`).join('')}</ul>${mas(r.atencion.length,'lista')}`
    :'<p class="profesor-hig-vacio">Ninguno va reprobando ni al borde.</p>';
  return `<div class="ah-cifras panel-resumen-cifras">${cifra(r.conectados,'Alumnos conectados','Comparten sus ramos contigo')}${cifra(r.semana.length,'Evaluaciones próximas','En los próximos 7 días')}${cifra(r.reprobando,'Reprobando algún ramo',`De ${r.conectados} alumnos`)}${cifra(r.alBorde,'Al borde en algún ramo',`De ${r.conectados} alumnos`)}</div>
    <div class="panel-alumnos-resumen-columnas">
      <section class="panel-alumnos-resumen-bloque" aria-labelledby="resumen-atencion">
        <div class="profesor-hig-lista-cabeza"><h2 id="resumen-atencion">Necesitan atención</h2></div>
        <p class="panel-alumnos-contexto">Un alumno puede estar al borde en un ramo y reprobando otro.</p>
        <div class="panel-alumnos-resumen-scroll" role="region" aria-labelledby="resumen-atencion" tabindex="0">${atencion}</div>
      </section>
      <section class="panel-alumnos-resumen-bloque" aria-labelledby="resumen-semana">
        <div class="profesor-hig-lista-cabeza"><h2 id="resumen-semana">Esta semana</h2></div>
        <div class="panel-alumnos-resumen-scroll" role="region" aria-labelledby="resumen-semana" tabindex="0">${semana}</div>
      </section>
    </div>`;
}
function contenidoAlumnoPanelHTML(al,compDe,ahora){
  return `${antesAhoraAlumnoHTML(metricasAlumnoPanel(al,compDe),{seccion:(al.ramos||[]).some(r=>{const c=compDe(al,r)||{};return c.sinSeccion||Number.isInteger(c.seccion);}),sinSeccion:(al.ramos||[]).length>0&&(al.ramos||[]).every(r=>(compDe(al,r)||{}).sinSeccion)})}
    ${(al.ramos||[]).length?(ctx=>(al.ramos||[]).map(r=>ramoPanelHTML(r,compDe(al,r),ahora,ctx,lineaInicioRamoHTML(al,r),(al.ramos||[]).length===1)).join(''))(ramosDelAlumnoPanel(al)):'<p class="clase-sin-datos">Ya no tiene los ramos que te compartió.</p>'}
    <button type="button" class="settings-danger-btn" data-quitar-alumno="${esc(al.id)}" data-nombre="${esc(al.nombre_visible)}">Quitar de mi lista</button>`;
}
function alumnosOrdenadosPanel(lista,ahora=new Date()){
  return lista.map(al=>datosFilaAlumnoPanel(al,ahora))
    .sort((a,b)=>b.prioridad-a.prioridad||b.exigencia-a.exigencia||
      (a.proxima?.fecha||'9999').localeCompare(b.proxima?.fecha||'9999')||
      String(a.al.nombre_visible||'').localeCompare(String(b.al.nombre_visible||''),'es'));
}
// En la pantalla principal solo se generan filas compactas. La ficha completa
// se construye para un alumno cuando el profesor la abre.
function alumnosPanelHTML(lista,compDe,ahora=new Date(),{soloFilas=false,limite=Infinity}={}){
  const abierto=lista.length===1?' open':'';
  const ordenados=alumnosOrdenadosPanel(lista,ahora);
  // Con varios ramos, el estado de cada uno: el peor solo escondía que en el
  // otro va bien (o al revés).
  const texto=n=>n==='bad'?'Reprobando':n==='warn'?'Al borde':n==='good'?'Aprobando':'Sin notas';
  const chip=(n,contenido,aria)=>`<span class="panel-alumnos-fila-estado panel-resumen-sem ${n==='neutral'?'':`panel-resumen-${n}`}" aria-label="${aria}">${contenido}</span>`;
  const estadoHTML=(nivel,porRamo)=>porRamo.length
    ?`<span class="panel-alumnos-fila-estados">${porRamo.map(d=>chip(d.nivel,`${esc(d.nombre)} · ${texto(d.nivel)}`,`${esc(d.nombre)}: ${texto(d.nivel).toLowerCase()}`)).join('')}</span>`
    :chip(nivel,texto(nivel),`Estado: ${texto(nivel).toLowerCase()}`);
  return ordenados.slice(0,limite).map(({al,nivel,proxima,exigente,porRamo})=>conUniversidadPanel(al.tenant,()=>{
    const fila=`<span class="panel-alumnos-fila"><span class="panel-alumnos-fila-cabeza"><b>${esc(al.nombre_visible)}</b><small>${(al.ramos||[]).length} ${(al.ramos||[]).length===1?'ramo':'ramos'}</small></span>
        ${estadoHTML(nivel,porRamo)}
        ${proximaFilaAlumnoHTML(proxima,exigente)}</span>`;
    return soloFilas?`<button type="button" data-ver-alumno="${esc(al.id)}" class="panel-alumnos-alumno panel-alumnos-fila-boton">${fila}<span class="panel-alumnos-abrir" aria-hidden="true">›</span></button>`
      :`<details data-alumno="${esc(al.id)}" class="panel-alumnos-alumno"${abierto}>
      <summary>${fila}</summary>${contenidoAlumnoPanelHTML(al,compDe,ahora)}</details>`;
  })).join('');
}

// Exportar: una fila por alumno, ramo y evaluación, armada en el navegador con
// lo que el panel ya tiene; no pasa por ningún servidor. Punto y coma y coma
// decimal, como lo abre Excel en Chile; Google Sheets lo detecta igual.
function celdaCsvPanel(v){
  if(v===null||v===undefined)return '';
  let s=String(v);
  // El nombre lo escribe el alumno: "=…" no puede llegar a Excel como fórmula.
  // Un número negativo ("-1,0") no es una fórmula y tiene que llegar como número.
  if(/^[=+\-@\t\r]/.test(s)&&!/^-\d+(,\d+)?$/.test(s))s="'"+s;
  return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
// `compSeccionDe` da la comparación con la sección de cada alumno: va en las
// cuatro columnas del final, para no mover las que ya existían.
function csvAlumnosPanel(alumnos,compDe,compSeccionDe=null){
  const num=v=>v===null||v===undefined?'':String(v).replace('.',',');
  const gh=e=>e&&e.promedio!=null?num(fmtPromedio(Number(e.promedio))):'';
  // Las de "antes y ahora" (#697) y cuándo empezó en el ramo (2026-10-20) van
  // al final para no mover las columnas que alguien ya usa en su planilla.
  const filas=[['Alumno','Ramo','Sigla','Categoría','Evaluación','Nota','Promedio del ramo','GradeHub evaluación','GradeHub categoría','GradeHub ramo','Fecha','Antes o desde que empezó','Diferencia con el curso','Empezó contigo en este ramo','Sección','Sección evaluación','Sección categoría','Sección ramo']];
  alumnos.forEach(al=>conUniversidadPanel(al.tenant,()=>{const ctx=ramosDelAlumnoPanel(al);
    const conFecha=new Map(metricasAlumnoPanel(al,compDe).evaluaciones.map(e=>[e.id,e]));
    const tiempo=id=>{const e=conFecha.get(id);if(!e)return ['','sin fecha',''];
      return [e.fecha,e.lado==='antes'?'antes':'desde que empezó',e.curso===null?'':num((e.nota-e.curso).toFixed(1))];};
    (al.ramos||[]).forEach(r=>{
    const empezo=inicioRamoPanel(al,r).dia||'';
    const seccion=Number.isInteger(r.seccion)?r.seccion:'no declarada';
    const compSec=(compSeccionDe&&compSeccionDe(al,r))||{};
    const secNota=new Map((compSec.evaluaciones||[]).map(e=>[e.clave,e]));
    const secCategoria=new Map((compSec.categorias||[]).map(e=>[e.clave,e]));
    const ramo=ramoParaPanel(r),comp=compDe(al,r)||{};
    const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
    const sigla=(typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||'';
    const porNota=new Map((comp.evaluaciones||[]).map(e=>[e.clave,e]));
    const porCategoria=new Map((comp.categorias||[]).map(e=>[e.clave,e]));
    const base=[al.nombre_visible,ramo.nombre,sigla];
    const prom=avg===null?'':num(fmtPromedio(avg)),ghRamo=gh(comp.ramo);
    const categorias=categoriasDeRamoPanel(ramo);
    // Un ramo sin notas igual sale, para que el archivo tenga a todos.
    if(!categorias.length){filas.push([...base,'','','',prom,'','',ghRamo,'','','',empezo,seccion,'','',gh(compSec.ramo)]);return;}
    categorias.forEach(c=>c.notas.forEach(n=>filas.push([...base,c.nombre,n.nombre,num(fmt(n.valor)),prom,
      gh(porNota.get(n.clave)),gh(porCategoria.get(c.clave)),ghRamo,...tiempo(n.id),empezo,
      seccion,gh(secNota.get(n.clave)),gh(secCategoria.get(c.clave)),gh(compSec.ramo)])));
  });}));
  return filas.map(f=>f.map(celdaCsvPanel).join(';')).join('\r\n');
}
// Una fila por ramo compartido. Las diferencias usan exactamente el corte y
// las comparaciones del panel; sin muestra suficiente la celda queda vacía.
function csvResumenAlumnosPanel(alumnos,compDe,compSeccionDe=null,ahora=new Date()){
  const num=v=>v===null||v===undefined||!Number.isFinite(Number(v))?'':String(v).replace('.',',');
  const prom=v=>v===null||v===undefined?'':num(fmtPromedio(Number(v)));
  const comparable=x=>x&&x.personas>=5?prom(x.promedio):'';
  const diferencia=v=>v===null||v===undefined?'':num(v.toFixed(1));
  const estado={good:'Aprobando',warn:'Al borde',bad:'Reprobando',neutral:'Sin notas'};
  const filas=[['Alumno','Ramo','Sigla','Sección','Empezó contigo en este ramo','Promedio del ramo','GradeHub ramo','Sección ramo','Diferencia con el curso antes','Diferencia con el curso desde que empezó','Cambio','Estado','Próxima evaluación','Nota necesaria para aprobar']];
  (alumnos||[]).forEach(al=>conRamosAlumnoPanel(al,ctx=>{
    (al.ramos||[]).forEach(r=>{
      const ramo=ramoParaPanel(r),comp=compDe(al,r)||{};
      const sec=(compSeccionDe&&compSeccionDe(al,r))||{};
      const avg=typeof ramoAvg==='function'?ramoAvg(ramo,undefined,ctx):null;
      const nivel=avg===null?'neutral':nivelRamo(ramo,avg);
      const met=metricasAlumnoPanel({...al,ramos:[r]},compDe);
      const proxima=proximaEvaluacionPanel(ramo,ahora,ctx);
      filas.push([al.nombre_visible,ramo.nombre,
        (typeof siglaDeRamo==='function'?siglaDeRamo(ramo):ramo.sigla)||'',
        Number.isInteger(r.seccion)?r.seccion:'no declarada',
        inicioRamoPanel(al,r).dia||'',prom(avg),comparable(comp.ramo),comparable(sec.ramo),
        diferencia(met.antes.diferencia),diferencia(met.ahora.diferencia),
        diferencia(met.cambio),estado[nivel]||'Sin notas',
        proxima?proxima.evaluacion:'',proxima&&proxima.necesita?num(proxima.necesita):'']);
    });
  }));
  return filas.map(f=>f.map(celdaCsvPanel).join(';')).join('\r\n');
}
async function exportarAlumnosPanel(lista,compDe,compSeccionDe=null,formato='detalle',ejemplo=false){
  const hoy=new Date(),dd=n=>String(n).padStart(2,'0');
  const nombre=`gradehub-alumnos${ejemplo?'-ejemplo':''}${formato==='resumen'?'-resumen':''}-${hoy.getFullYear()}-${dd(hoy.getMonth()+1)}-${dd(hoy.getDate())}.csv`;
  // La marca BOM hace que Excel lea bien las tildes.
  const csv=formato==='resumen'?csvResumenAlumnosPanel(lista,compDe,compSeccionDe,hoy):csvAlumnosPanel(lista,compDe,compSeccionDe);
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  if(!ejemplo)track('panel_alumnos_exportado',{alumnos:lista.length});
  // En el teléfono, guardar un archivo es la hoja de compartir del sistema.
  try{
    const archivo=typeof File==='function'?new File([blob],nombre,{type:blob.type}):null;
    const tactil=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
    if(tactil&&archivo&&navigator.share&&navigator.canShare&&navigator.canShare({files:[archivo]})){
      await navigator.share({files:[archivo]});return;
    }
  }catch(e){if(e&&e.name==='AbortError')return;}
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=nombre;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast(ejemplo?'Archivo de ejemplo descargado.':'Archivo descargado.');
}
function elegirArchivoAlumnosPanel(alElegir){
  const caja=document.getElementById('modal-content');if(!caja)return;
  caja.innerHTML=`<div class="modal-title" id="modal-titulo">Exportar a Excel</div>
    <p class="compartir-explica">Elige el archivo que necesitas.</p>
    <div class="panel-alumnos-exportar-opciones">
      <button type="button" data-exportar-panel="detalle"><b>Detalle por evaluación</b><span>Una fila por evaluación, para tablas dinámicas</span></button>
      <button type="button" data-exportar-panel="resumen"><b>Resumen por alumno</b><span>Una fila por alumno y ramo, para gráficos</span></button>
    </div>
    <div class="modal-btns"><button type="button" class="btn-cancel" id="alumnos-exportar-cancelar">Cancelar</button></div>`;
  openModal();
  caja.querySelector('#alumnos-exportar-cancelar').addEventListener('click',closeModal);
  caja.querySelectorAll('[data-exportar-panel]').forEach(b=>b.addEventListener('click',()=>{
    const formato=b.dataset.exportarPanel;
    closeModal();alElegir(formato);
  }));
}

// La pestaña "Alumnos" (#697): el panel ya no vive dentro de Clases.
let versionTabAlumnos=0;
async function renderAlumnosTab(){
  const raiz=document.getElementById('alumnos-body');
  if(!raiz)return;
  const usuario=currentUser,version=++versionTabAlumnos;
  // Una cuenta de profesor tiene esta pestaña desde el primer día (#697), pero
  // sus consultas exigen estar aprobado: mientras no lo esté, se dice por qué
  // está vacía en vez de mostrar un error.
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor()){
    if(perfilProfesorConocido()===undefined)await cargarPerfilProfesor().catch(()=>{});
    if(currentUser!==usuario||version!==versionTabAlumnos)return;
    if(!esProfesorAprobado()){
      raiz.innerHTML='<div class="profesor-hig">'+
        '<p class="profesor-info" role="status">Cuando aprobemos tu postulación, acá vas a ver las notas que tus alumnos decidan compartirte.</p></div>';
      return;
    }
  }
  renderAlumnosProfesor(raiz);
}
// ─── ALUMNOS DE EJEMPLO (2026-10-22, decisión de Lucas) ──────────────────────
// Un administrador lo activa para el profesor que elija (alumnos_ejemplo.sql).
// Ese profesor ve su panel con alumnos SINTÉTICOS de Ingeniería UC: las pautas
// salen de los presets; las notas, los compañeros de curso y las secciones se
// inventan acá, en su navegador. Nada se manda a la base ni entra a ningún
// promedio, y el panel lo dice con una franja. Las fechas van relativas a hoy
// para que el ejemplo no envejezca.
function datosEjemploAlumnosPanel(hoy=new Date()){
  let semilla=20261022;
  const azar=()=>{semilla|=0;semilla=semilla+0x6D2B79F5|0;let t=Math.imul(semilla^semilla>>>15,1|semilla);
    t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const base=new Date(Date.UTC(hoy.getFullYear(),hoy.getMonth(),hoy.getDate())-70*86400000);
  const dia=n=>new Date(base.getTime()+n*86400000).toISOString().slice(0,10);
  const HOY=dia(70);
  const nota=v=>Math.round(Math.min(7,Math.max(1,v+(azar()-.5)*1.4))*10)/10;
  let uid=0;
  const ramoCon=(nombre,seccion,nivel)=>{
    let r=null;try{r=presetRamo(nombre,'uc','ING-PC');}catch(e){}
    if(!r)return null;
    r.id='ejemplo-'+(++uid);r.nombre=r.nombre||nombre;r.color=r.color||'#0d7a6b';
    if(seccion)r.seccion=seccion;
    const cats=r.categorias||[];
    const total=cats.reduce((n,c)=>n+(Number.isInteger(c.slots)&&c.slots>1?c.slots:1),0)||1;
    let k=0;
    cats.forEach(c=>{
      const n=Number.isInteger(c.slots)&&c.slots>1?c.slots:1;
      c.notas=[];delete c.fecha;
      for(let i=0;i<n;i++,k++){
        const fecha=/examen/i.test(c.nombre)?dia(108):dia(Math.round(4+k*(100/total)));
        if(fecha<=HOY)c.notas.push({id:r.id+'-n'+k,nombre:n>1?`${c.nombre} ${i+1}`:c.nombre,valor:nota(nivel(fecha)),fecha});
        else if(!c.fecha)c.fecha=fecha;
      }
    });
    return r;
  };
  // Seis alumnos que suben desde que empiezan; dos sin sección declarada y
  // dos con ramos empezados en fechas distintas.
  const plan=[
    ['Sofía (ejemplo)',3.6,[['Cálculo II',3,28],['Dinámica',2,50]]],
    ['Matías (ejemplo)',3.3,[['Cálculo II',3,35]]],
    ['Valentina (ejemplo)',4.2,[['Dinámica',2,22],['Laboratorio de Dinámica',2,null]]],
    ['Benjamín (ejemplo)',3.8,[['Introducción a la Programación',null,40]]],
    ['Isidora (ejemplo)',4.6,[['Cálculo II',1,15],['Introducción a la Programación',4,45]]],
    ['Tomás (ejemplo)',3.0,[['Cálculo II',null,30]]],
  ];
  const alumnos=plan.map(([nombre,nivelBase,ramos],i)=>{
    const inicio_ramos={};
    const propios=ramos.map(([ramo,seccion,desde])=>{
      const inicio=desde===null?null:dia(desde);
      const r=ramoCon(ramo,seccion,f=>inicio&&f>=inicio?nivelBase+1.1:nivelBase);
      if(r&&inicio)inicio_ramos[r.id]=inicio;
      return r;
    }).filter(Boolean);
    return {id:'ejemplo-alumno-'+i,nombre_visible:nombre,tenant:'uc',desde:dia(32)+'T15:00:00Z',inicio:null,inicio_ramos,ramos:propios};
  }).filter(al=>al.ramos.length);
  // Compañeros de curso: 40 por ramo, secciones 1 a 4 y algunos sin sección.
  const curso=[];
  ['Cálculo II','Dinámica','Laboratorio de Dinámica','Introducción a la Programación'].forEach(nombre=>{
    for(let i=0;i<40;i++){const nivel=3.2+azar()*2.6,r=ramoCon(nombre,i%9===0?null:1+(i%4),()=>nivel);if(r)curso.push(r);}
  });
  return {alumnos,curso};
}
// La misma forma que comparacion_ramo_profesor, con el mismo piso de cinco
// personas. Acá se aplica en el navegador porque los datos también son de acá.
const PISO_PERSONAS_EJEMPLO=5;
function comparacionEjemploPanel(datos,sigla,seccion=null){
  const media=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,red=v=>Math.round(v*10)/10;
  const todos=[...datos.curso,...datos.alumnos.flatMap(a=>a.ramos)]
    .filter(r=>String(claveRamoCurso(r,'uc')||'').toUpperCase()===String(sigla||'').toUpperCase())
    .filter(r=>seccion==null||r.seccion===seccion);
  const porClave=fn=>{const m=new Map();todos.forEach(r=>fn(r).forEach(([k,nombre,v])=>{
    if(!k)return;if(!m.has(k))m.set(k,{nombre,vals:[]});m.get(k).vals.push(v);}));
    return [...m].filter(([,x])=>x.vals.length>=PISO_PERSONAS_EJEMPLO).map(([clave,x])=>({clave,nombre:x.nombre,promedio:red(media(x.vals)),personas:x.vals.length}));};
  const proms=todos.map(r=>{try{return ramoAvg(r,undefined,[r]);}catch(e){return null;}}).filter(Number.isFinite);
  return {ramo:proms.length>=PISO_PERSONAS_EJEMPLO?{promedio:red(media(proms)),personas:proms.length}:null,
    evaluaciones:porClave(r=>(r.categorias||[]).flatMap(c=>(c.notas||[]).map(n=>[claveEvaluacionPanel(n.nombre),n.nombre,n.valor]))),
    categorias:porClave(r=>(r.categorias||[]).filter(c=>(c.notas||[]).length).map(c=>[claveEvaluacionPanel(c.nombre),c.nombre,media(c.notas.map(n=>n.valor))]))};
}
// Las llamadas del panel, respondidas en memoria. Cambiar una fecha o quitar
// a un alumno dura hasta recargar.
function rpcEjemploPanel(datos,nombre,a={}){
  const ok=data=>Promise.resolve({data,error:null});
  if(nombre==='mis_alumnos')return ok(JSON.parse(JSON.stringify(datos.alumnos)));
  if(nombre==='comparacion_ramo_profesor')return ok(comparacionEjemploPanel(datos,a.p_sigla,a.p_seccion??null));
  if(nombre==='fijar_inicio_ramo_alumno'){
    const al=datos.alumnos.find(x=>x.id===a.p_id);if(!al||!al.ramos.some(r=>r.id===a.p_ramo))return ok(false);
    if(a.p_inicio)al.inicio_ramos[a.p_ramo]=a.p_inicio;else delete al.inicio_ramos[a.p_ramo];
    return ok(true);
  }
  if(nombre==='quitar_alumno'){const n=datos.alumnos.length;datos.alumnos=datos.alumnos.filter(x=>x.id!==a.p_id);return ok(datos.alumnos.length<n);}
  return Promise.resolve({data:null,error:{message:'sin respuesta en el ejemplo'}});
}
// Se pregunta en cada carga, así un administrador lo prende o lo apaga y se
// nota al volver a la pestaña. Los alumnos inventados se guardan por cuenta
// para que una fecha cambiada dure hasta recargar. Sin el SQL aplicado la
// consulta falla y el panel sigue siendo el real.
let ejemploAlumnosPanel={usuario:undefined,datos:null};
async function ejemploAlumnosDeCuenta(){
  const usuario=currentUser&&currentUser.id;
  let activo=false;
  try{const {data,error}=await supabaseClient.rpc('mis_alumnos_ejemplo');activo=!error&&data===true;}catch(e){}
  if(!activo||(currentUser&&currentUser.id)!==usuario)return null;
  if(ejemploAlumnosPanel.usuario!==usuario||!ejemploAlumnosPanel.datos)
    ejemploAlumnosPanel={usuario,datos:datosEjemploAlumnosPanel()};
  return ejemploAlumnosPanel.datos;
}
const ALUMNOS_POR_PAGINA=50;
let versionPanelAlumnos=0;
async function renderAlumnosProfesor(raiz,{volver,alumnoId=null,vistaInicial=null}={}){
  // La vista que pidió la barra lateral manda; si no, la que se indicó; si no, el Resumen.
  vistaInicial=(typeof tomarVistaNav==='function'&&tomarVistaNav('alumnos'))||vistaInicial||'resumen';
  const usuario=currentUser,cliente=supabaseClient,version=++versionPanelAlumnos;
  const vigente=()=>currentUser===usuario&&supabaseClient===cliente&&version===versionPanelAlumnos&&raiz.isConnected!==false;
  raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
    '<div class="panel-alumnos-estado" role="status"><h2>Cargando tus alumnos</h2><p>Estamos preparando sus ramos y evaluaciones.</p></div></div>';
  // Con alumnos de ejemplo, lo de los alumnos se responde en memoria. El link
  // de invitación y su renovación siguen siendo los reales del profesor.
  // Se pregunta en paralelo con la carga real, para no sumar una espera.
  let ejemplo=null;
  const rpc=(nombre,args)=>ejemplo?rpcEjemploPanel(ejemplo,nombre,args):supabaseClient.rpc(nombre,args);
  let codigo,alumnos;
  try{
    const [c,reales,datosEjemplo]=await Promise.all([supabaseClient.rpc('codigo_alumnos_profesor'),
      supabaseClient.rpc('mis_alumnos'),ejemploAlumnosDeCuenta()]);
    if(!vigente())return;
    ejemplo=datosEjemplo;
    const a=ejemplo?await rpc('mis_alumnos'):reales;
    if(!vigente())return;
    if(c.error||a.error)throw (c.error||a.error);
    codigo=c.data;alumnos=Array.isArray(a.data)?a.data:[];
  }catch(e){
    if(!vigente())return;
    raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
      '<div class="panel-alumnos-estado" role="alert"><h2>No pudimos cargar tus alumnos</h2><p>Inténtalo de nuevo para ver sus ramos y evaluaciones.</p></div>'+
      `<div class="modal-btns"><button type="button" class="accion-principal" id="alumnos-volver">${volver?'Volver':'Reintentar'}</button></div></div>`;
    // En su pestaña no hay a dónde volver: se ofrece intentarlo de nuevo.
    raiz.querySelector('#alumnos-volver').addEventListener('click',()=>{if(vigente())(volver?volver():renderAlumnosProfesor(raiz));});
    return;
  }
  // Una consulta por ramo distinto, no por alumno. UAI y UAndes pueden usar
  // nombre normalizado cuando no existe sigla, igual que curso_notas.
  const cursos=new Map();
  alumnos.forEach(al=>(al.ramos||[]).forEach(r=>{
    const clave=al.tenant&&claveRamoCurso(r,al.tenant);
    if(clave)cursos.set(claveCurso(al.tenant,clave),null);
  }));
  await Promise.all([...cursos.keys()].map(async k=>{
    const separador=k.indexOf('|'),tenant=k.slice(0,separador),sigla=k.slice(separador+1);
    try{const {data,error}=await rpc('comparacion_ramo_profesor',{p_tenant:tenant,p_sigla:sigla});if(!error)cursos.set(k,data);}catch(e){}
  }));
  if(!vigente())return;
  const compGeneral=(al,r)=>cursos.get(claveCurso(al.tenant,claveRamoCurso(r,al.tenant)||''))||null;
  // Por sección se consulta solo al pedirlo (el control o el Excel), una vez
  // por ramo y sección distintos, de a cuatro para no cargar la base.
  const secciones=new Map();
  const claveSeccion=(al,r)=>{const c=al.tenant&&claveRamoCurso(r,al.tenant);return c&&Number.isInteger(r.seccion)?claveCurso(al.tenant,c)+'|'+r.seccion:null;};
  const compSeccion=(al,r)=>{const k=claveSeccion(al,r);if(!k)return SIN_SECCION_PANEL;
    return secciones.get(k)||{seccion:r.seccion,ramo:null,evaluaciones:[],categorias:[]};};
  let cargandoSecciones=null;
  const cargarSecciones=()=>cargandoSecciones||(cargandoSecciones=(async()=>{
    const pendientes=[...new Set(alumnos.flatMap(al=>(al.ramos||[]).map(r=>claveSeccion(al,r)).filter(Boolean)))];
    const una=async k=>{
      const [tenant,sigla,seccion]=k.split('|');
      try{const {data,error}=await rpc('comparacion_ramo_profesor',{p_tenant:tenant,p_sigla:sigla,p_seccion:Number(seccion)});
        if(!error&&data)secciones.set(k,{...data,seccion:Number(seccion)});}catch(e){}
    };
    for(let i=0;i<pendientes.length;i+=4)await Promise.all(pendientes.slice(i,i+4).map(una));
  })());
  let porSeccion=alumnos.length>0&&comparaSeccionGuardado();
  if(porSeccion)await cargarSecciones();
  if(!vigente())return;
  const compDe=(al,r)=>porSeccion?compSeccion(al,r):compGeneral(al,r);
  const sinSeccionDe=lista=>lista.filter(al=>(al.ramos||[]).some(r=>!claveSeccion(al,r))).length;
  const grupoHTML=lista=>lista.length?antesAhoraGrupoHTML(metricasGrupoPanel(lista,compDe),{seccion:porSeccion,sinSeccion:porSeccion?sinSeccionDe(lista):0}):'';
  const link=linkAlumnosProfesor(codigo);
  const mensaje=mensajeInvitacionAlumnos();
  // Sin alumnos, el link es lo primero que se puede hacer. Con alumnos, se ve
  // primero a quiénes están conectados y luego las cifras del grupo.
  const seccionLink=`<section class="panel-alumnos-link${alumnos.length?' al-final':''}">
      <h2>${alumnos.length?'Invitar alumno':'Invita a tu primer alumno'}</h2>
      <p>Mándale este link. Elegirá qué ramos te comparte y podrá dejar de hacerlo cuando quiera.</p>
      <div class="panel-alumnos-url"><span>Link de invitación</span><code id="alumnos-link">${esc(link)}</code></div>
      <p class="panel-alumnos-codigo">Tu código <strong>${esc(codigo)}</strong></p>
      <button type="button" class="accion-principal" id="alumnos-compartir">Compartir invitación</button>
      <button type="button" class="agent-refresh" id="alumnos-copiar">Copiar link</button>
      <p class="panel-alumnos-mensaje"><strong>Mensaje sugerido para WhatsApp</strong><span>${esc(mensaje)}</span></p>
      <div class="panel-alumnos-renovar"><p>Al cambiar el link, el anterior deja de funcionar. Tus alumnos actuales siguen conectados.</p><button type="button" class="agent-refresh" id="alumnos-renovar">Cambiar link</button></div>
      <p class="clase-privacidad">Piloto gratis: por ahora no se cobra.</p>
    </section>`;
  const listaInicial=alumnosPanelHTML(alumnos,compDe,new Date(),{soloFilas:true,limite:ALUMNOS_POR_PAGINA});
  const privacidad='<p class="clase-privacidad" id="alumnos-privacidad">“GradeHub” es el promedio de todos los usuarios con ese ramo, esa categoría o esa prueba, desde 5 personas; “Su sección”, el de los que declararon su misma sección, también desde 5. Nunca ves quiénes son.</p>';
  // La franja va siempre arriba y no se cierra: nadie puede confundir estos
  // alumnos con los suyos.
  const franjaEjemplo=ejemplo?`<p class="panel-alumnos-ejemplo" role="note"><b>Ejemplo</b> Alumnos y notas inventados para que veas cómo funciona el panel. No se guardan en GradeHub; si los exportas, el archivo dirá «ejemplo».</p>`:'';
  raiz.innerHTML='<div class="profesor-hig alumnos-editorial">'+
    franjaEjemplo+
    // Resumen, Lista, Estadísticas y Ramos (Lucas, 2026-10-22). En pantalla
    // ancha las mismas vistas están en la barra lateral y este control se oculta.
    (alumnos.length?`<nav class="panel-alumnos-vistas${alumnos.length>1?'':' tres-vistas'}" aria-label="Vistas de Alumnos">
      <button type="button" data-panel-vista="resumen" aria-pressed="true">Resumen</button>
      <button type="button" data-panel-vista="lista" aria-pressed="false">Lista</button>
      <button type="button" data-panel-vista="estadisticas" aria-pressed="false">Estadísticas</button>
      ${alumnos.length>1?'<button type="button" data-panel-vista="ramos" aria-pressed="false">Ramos</button>':''}
    </nav>
    <header class="panel-alumnos-cabecera" id="alumnos-cabecera"><h2 id="alumnos-vista-titulo">Resumen</h2></header>
    <div id="alumnos-compara-wrap">${comparaPanelHTML(porSeccion)}</div>
    <section class="panel-alumnos-vista" id="alumnos-vista-resumen" aria-label="Resumen de tus alumnos"></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-lista" aria-label="Lista de alumnos" hidden>
      <div class="profesor-hig-lista-cabeza"><h2>Conectados</h2><span id="alumnos-cuenta" aria-live="polite">${alumnos.length}</span></div>
      <button type="button" class="accion-principal" id="alumnos-ir-invitar">Invitar alumno</button>
      ${alumnos.length>1?`<div class="panel-alumnos-buscar"><input type="search" id="alumnos-buscar" placeholder="Buscar alumnos"
        aria-label="Buscar alumnos por nombre, ramo o sigla" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div>`:''}
      <button type="button" class="agent-refresh panel-alumnos-exportar" id="alumnos-exportar">Exportar a Excel</button>
      <div id="alumnos-lista">${listaInicial}</div>
      <button type="button" class="agent-refresh panel-alumnos-mas" id="alumnos-mas"${alumnos.length<=ALUMNOS_POR_PAGINA?' hidden':''}>Mostrar 50 más</button>
    </section>
    <section class="panel-alumnos-vista" id="alumnos-vista-estadisticas" aria-label="Estadísticas de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista" id="alumnos-vista-ramos" aria-label="Ramos de tus alumnos" hidden></section>
    <section class="panel-alumnos-vista panel-alumnos-ficha" id="alumnos-vista-ficha" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-ficha-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>
      <h2 id="alumnos-ficha-titulo"></h2>
      <div id="alumnos-ficha-compara-wrap">${comparaPanelHTML(porSeccion)}</div>
      <div id="alumnos-ficha-contenido"></div>
    </section>
    <section class="panel-alumnos-vista panel-alumnos-invitacion" id="alumnos-vista-invitar" hidden>
      <button type="button" class="agent-refresh panel-alumnos-regresar" id="alumnos-invitacion-volver"><span aria-hidden="true">‹</span> Volver a la lista</button>${seccionLink}
    </section>${privacidad}`
      :`${seccionLink}<div class="profesor-hig-lista-cabeza"><h2>Conectados</h2><span id="alumnos-cuenta">0</span></div>
        <p class="profesor-hig-vacio">Cuando un alumno abra tu link y acepte, aparece acá con sus notas.</p>`)+
    (volver?'<div class="modal-btns"><button type="button" class="btn-cancel" id="alumnos-volver">Volver</button></div>':'')+'</div>';
  const botonVolver=raiz.querySelector('#alumnos-volver');
  if(botonVolver)botonVolver.addEventListener('click',()=>{if(vigente())volver();});
  const seleccionarLink=()=>{const el=raiz.querySelector('#alumnos-link'),sel=window.getSelection&&window.getSelection();
    if(sel&&el){const rango=document.createRange();rango.selectNodeContents(el);sel.removeAllRanges();sel.addRange(rango);}};
  raiz.querySelector('#alumnos-compartir').addEventListener('click',async()=>{
    if(!vigente())return;
    const resultado=await compartirInvitacionAlumnos(link);
    if(!vigente())return;
    medirInvitacionCompartida(resultado);
    if(resultado==='copiado')showToast('Invitación copiada. Pégala en WhatsApp.');
    if(resultado==='fallo'){seleccionarLink();showToast('No pudimos compartir. Selecciona y copia el link.',true);}
  });
  raiz.querySelector('#alumnos-copiar').addEventListener('click',async()=>{
    if(!vigente())return;
    try{await navigator.clipboard.writeText(link);if(!vigente())return;track('panel_alumnos_link_copiado');showToast('Link copiado.');}
    catch(e){if(!vigente())return;seleccionarLink();showToast('Selecciónalo y cópialo.',true);}
  });
  // Lo que no se deshace se confirma en el diálogo de la app (HIG), con Cancelar a mano.
  const renovar=raiz.querySelector('#alumnos-renovar');
  renovar.addEventListener('click',()=>{if(!vigente())return;showConfirm('Cambiar tu link',
    'El link actual deja de funcionar y tendrás que mandar el nuevo. Los alumnos que ya comparten contigo siguen igual.',async()=>{
      if(!vigente())return;
      renovar.disabled=true;
      try{const {error}=await supabaseClient.rpc('codigo_alumnos_profesor',{p_renovar:true});if(error)throw error;
        if(!vigente())return;
        showToast('Link cambiado.');renderAlumnosProfesor(raiz,{volver,vistaInicial:alumnos.length?'invitar':'lista'});}
      catch(e){if(vigente()){renovar.disabled=false;showToast('No pudimos cambiar el link.',true);}}
    },{label:'Cambiar link',focusCancel:true});});
  if(!alumnos.length){track('panel_alumnos_abierto',{alumnos:0});return;}
  const lista=raiz.querySelector('#alumnos-lista');
  const ficha=raiz.querySelector('#alumnos-vista-ficha');
  const fichaContenido=raiz.querySelector('#alumnos-ficha-contenido');
  const paneles={resumen:raiz.querySelector('#alumnos-vista-resumen'),lista:raiz.querySelector('#alumnos-vista-lista'),
    estadisticas:raiz.querySelector('#alumnos-vista-estadisticas'),
    ramos:raiz.querySelector('#alumnos-vista-ramos'),ficha,invitar:raiz.querySelector('#alumnos-vista-invitar')};
  const nav=raiz.querySelector('.panel-alumnos-vistas');
  const invitar=raiz.querySelector('#alumnos-ir-invitar');
  const comparaWrap=raiz.querySelector('#alumnos-compara-wrap');
  const avisoPrivacidad=raiz.querySelector('#alumnos-privacidad');
  let vista=alumnos,visibles=ALUMNOS_POR_PAGINA,vistaActiva='resumen',seleccionado=null,botonOrigen=null;
  const mas=raiz.querySelector('#alumnos-mas');
  // Se filtra en el navegador, con lo que el panel ya bajó.
  const buscar=raiz.querySelector('#alumnos-buscar');
  const filtrar=()=>{
    if(!vigente()||!buscar)return;
    const texto=buscar.value;vista=filtrarAlumnosPanel(alumnos,texto);visibles=ALUMNOS_POR_PAGINA;
    raiz.querySelector('#alumnos-cuenta').textContent=claveEvaluacionPanel(texto)?`${vista.length} de ${alumnos.length}`:String(alumnos.length);
    pintarLista();
  };
  const pintarLista=()=>{
    lista.innerHTML=vista.length?alumnosPanelHTML(vista,compDe,new Date(),{soloFilas:true,limite:visibles})
      :`<p class="profesor-hig-vacio">No encontramos alumnos para «${esc(raiz.querySelector('#alumnos-buscar')?.value.trim()||'')}».</p>`;
    mas.hidden=vista.length<=visibles;
  };
  const enlazarQuitar=()=>fichaContenido.querySelectorAll('[data-quitar-alumno]').forEach(b=>b.addEventListener('click',()=>{if(!vigente())return;showConfirm(`Quitar a ${b.dataset.nombre}`,
    'Dejas de ver sus notas. Para volver a verlas, tendría que abrir tu link y compartir de nuevo.',async()=>{
      if(!vigente())return;
      b.disabled=true;
      try{const {error}=await rpc('quitar_alumno',{p_id:b.dataset.quitarAlumno});if(error)throw error;
        if(!vigente())return;
        showToast('Lo quitaste de tu lista.');renderAlumnosProfesor(raiz,{volver,vistaInicial:'lista'});}
      catch(e){if(vigente()){b.disabled=false;showToast('No pudimos quitarlo.',true);}}
    },{label:'Quitar',focusCancel:true});}));
  const enlazarInicio=()=>fichaContenido.querySelectorAll('[data-inicio-alumno]').forEach(b=>b.addEventListener('click',()=>{
    if(!vigente())return;
    const al=alumnos.find(x=>x.id===b.dataset.inicioAlumno);
    const r=al&&(al.ramos||[]).find(x=>x.id===b.dataset.inicioRamo);
    if(r)abrirInicioRamo(al,r,()=>{if(vigente())renderAlumnosProfesor(raiz,{volver,alumnoId:al.id});},rpc);
  }));
  const pintarFicha=()=>{
    if(!seleccionado)return;
    raiz.querySelector('#alumnos-ficha-titulo').textContent=seleccionado.nombre_visible||'Alumno';
    fichaContenido.innerHTML=conUniversidadPanel(seleccionado.tenant,()=>contenidoAlumnoPanelHTML(seleccionado,compDe,new Date()));
    enlazarQuitar();enlazarInicio();
  };
  const activarVista=nombre=>{
    if(!vigente())return;
    if(!paneles[nombre]||(nombre==='ramos'&&alumnos.length<2))nombre='resumen';
    // Otra vista parte arriba: la barra lateral la cambiaba y la página quedaba
    // a media altura, mostrando el medio de algo nuevo.
    if(nombre!==vistaActiva){const caja=typeof raiz.closest==='function'&&raiz.closest('.scroll');if(caja)caja.scrollTop=0;}
    vistaActiva=nombre;
    Object.entries(paneles).forEach(([clave,panel])=>{panel.hidden=clave!==nombre;});
    nav.hidden=nombre==='ficha'||nombre==='invitar';
    raiz.querySelector('#alumnos-cabecera').hidden=nav.hidden;
    raiz.querySelector('#alumnos-vista-titulo').textContent=({resumen:'Resumen',lista:'Tus alumnos',estadisticas:'Antes y ahora',ramos:'Por ramo'})[nombre]||'';
    // La comparación solo cambia las cifras de Estadísticas y de la ficha. La
    // ficha tiene su propio control, bajo «‹ Lista» y el nombre (#816).
    comparaWrap.hidden=nombre!=='estadisticas';
    avisoPrivacidad.hidden=nombre==='invitar'||nombre==='resumen';
    nav.querySelectorAll('[data-panel-vista]').forEach(b=>{
      b.setAttribute('aria-pressed',String(b.dataset.panelVista===nombre));
      if(b.dataset.panelVista===nombre&&typeof b.scrollIntoView==='function')b.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    if(nombre==='resumen')paneles.resumen.innerHTML=resumenInicioAlumnosHTML(resumenInicioAlumnosPanel(alumnos));
    if(nombre==='estadisticas')paneles.estadisticas.innerHTML=grupoHTML(alumnos);
    if(nombre==='ramos')paneles.ramos.innerHTML=resumenAlumnosPanelHTML(resumenAlumnosPanel(alumnos,compGeneral));
    if(typeof marcarVistaNav==='function')marcarVistaNav('alumnos',nombre==='ficha'||nombre==='invitar'?'lista':nombre);
  };
  if(typeof vistasPanelNav!=='undefined')vistasPanelNav.alumnos=v=>{if(vigente())activarVista(v);};
  const abrirFicha=(al,origen)=>{
    if(!vigente())return;
    seleccionado=al;botonOrigen=origen||null;pintarFicha();activarVista('ficha');
    const regresar=raiz.querySelector('#alumnos-ficha-volver');
    if(typeof regresar.focus==='function')regresar.focus();
    if(typeof raiz.scrollIntoView==='function')raiz.scrollIntoView({block:'start'});
  };
  nav.querySelectorAll('[data-panel-vista]').forEach(b=>b.addEventListener('click',()=>activarVista(b.dataset.panelVista)));
  invitar.addEventListener('click',()=>{
    if(!vigente())return;
    activarVista('invitar');const compartir=raiz.querySelector('#alumnos-compartir');
    if(typeof compartir.focus==='function')compartir.focus();
  });
  raiz.querySelector('#alumnos-invitacion-volver').addEventListener('click',()=>{
    if(!vigente())return;
    activarVista('lista');if(typeof invitar.focus==='function')invitar.focus();
  });
  raiz.querySelector('#alumnos-ficha-volver').addEventListener('click',()=>{
    if(!vigente())return;
    const id=seleccionado&&String(seleccionado.id);
    activarVista('lista');seleccionado=null;
    const fila=[...lista.querySelectorAll('[data-ver-alumno]')].find(b=>b.dataset.verAlumno===id);
    const foco=fila||(botonOrigen?.isConnected!==false?botonOrigen:null)||raiz.querySelector('#alumnos-buscar')||invitar;
    if(typeof foco.focus==='function')foco.focus();
  });
  // El Resumen y Estadísticas abren la ficha de quien se toque; Ramos lleva a
  // la Lista filtrada por ese ramo.
  const alTocar=e=>{
    if(!vigente()||!e.target||typeof e.target.closest!=='function')return;
    const ir=e.target.closest('[data-ir-vista]');if(ir){activarVista(ir.dataset.irVista);return;}
    const ramo=e.target.closest('[data-ver-ramo]');
    if(ramo&&buscar){buscar.value=ramo.dataset.verRamo;filtrar();activarVista('lista');return;}
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=alumnos.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  };
  ['resumen','estadisticas','ramos'].forEach(v=>paneles[v].addEventListener('click',alTocar));
  lista.addEventListener('click',e=>{
    if(!vigente())return;
    const b=e.target.closest('[data-ver-alumno]');if(!b)return;
    const al=vista.find(x=>String(x.id)===b.dataset.verAlumno);
    if(al)abrirFicha(al,b);
  });
  mas.addEventListener('click',()=>{if(!vigente())return;visibles+=ALUMNOS_POR_PAGINA;pintarLista();});
  if(buscar)buscar.addEventListener('input',filtrar);
  // Cambiar la comparación vuelve a pintar los alumnos y el grupo con lo ya bajado.
  const controles=['#alumnos-compara-wrap','#alumnos-ficha-compara-wrap']
    .map(sel=>raiz.querySelector(`${sel} .panel-alumnos-compara`)).filter(Boolean);
  const botones=controles.flatMap(c=>[...c.querySelectorAll('[data-compara]')]);
  botones.forEach(b=>b.addEventListener('click',async()=>{
    if(!vigente())return;
    const quiere=b.dataset.compara==='seccion';if(quiere===porSeccion)return;
    botones.forEach(x=>{x.disabled=true;});
    if(quiere)await cargarSecciones();
    if(!vigente())return;
    porSeccion=quiere;guardarComparaSeccion(quiere);
    botones.forEach(x=>{x.disabled=false;x.setAttribute('aria-pressed',String((x.dataset.compara==='seccion')===porSeccion));});
    pintarLista();
    if(vistaActiva==='ficha'){
      const abiertos=new Map([...fichaContenido.querySelectorAll('details[data-ramo]')].map(d=>[d.dataset.ramo,d.open]));
      pintarFicha();fichaContenido.querySelectorAll('details[data-ramo]').forEach(d=>{
        if(abiertos.has(d.dataset.ramo))d.open=abiertos.get(d.dataset.ramo);
      });
    }
    if(vistaActiva==='estadisticas')paneles.estadisticas.innerHTML=grupoHTML(alumnos);
    track('panel_alumnos_compara',{seccion:quiere});
  }));
  const fichaInicial=alumnoId&&alumnos.find(x=>String(x.id)===String(alumnoId));
  if(fichaInicial)abrirFicha(fichaInicial);else activarVista(vistaInicial);
  // Exporta todos los que calzan con la búsqueda, en el orden de la lista: el
  // "Mostrar 50 más" es para no pintar 300 filas, no para recortar la planilla
  // (Salva Ramos pidió el desglose de todos sus alumnos). Antes de crear el
  // archivo, recuerda lo que el profesor aceptó en los términos.
  const exportar=raiz.querySelector('#alumnos-exportar');
  if(exportar)exportar.addEventListener('click',async()=>{
    if(!vigente())return;
    const paraExportar=alumnosOrdenadosPanel(vista).map(({al})=>al);
    if(!paraExportar.length){showToast('No hay alumnos que exportar con esa búsqueda.',true);return;}
    // Las columnas de sección van siempre. Se bajan antes del diálogo: el toque
    // en «Exportar» es el que deja abrir la hoja de compartir del iPhone.
    exportar.disabled=true;await cargarSecciones();
    if(!vigente())return;
    exportar.disabled=false;
    elegirArchivoAlumnosPanel(formato=>{
      const n=paraExportar.length;
      showConfirm(ejemplo?'Exportar ejemplo':'Exportar notas',
        ejemplo?`El archivo trae ${n===1?'1 alumno inventado':`${n} alumnos inventados`}, no notas reales. El nombre del archivo dirá «ejemplo».`:
          `El archivo trae las notas que ${n===1?'te compartió 1 alumno':`te compartieron ${n} alumnos`}. Úsalo solo para apoyarlos: no lo publiques ni se lo pases a nadie, y si alguno deja de compartir, borra sus notas del archivo.`,
        ()=>{if(vigente())exportarAlumnosPanel(paraExportar,compGeneral,compSeccion,formato,!!ejemplo);},{label:'Exportar',danger:false});
    });
  });
  if(ejemplo)track('panel_alumnos_ejemplo');
  else track('panel_alumnos_abierto',{alumnos:alumnos.length});
}

// El link del profesor puede llegar antes de que haya sesión: se guarda el
// código y se ofrece compartir apenas la persona entra con su semestre listo.
capturarProfeDeUrl();
mostrarContextoInvitacionProfesor();

// ─── ENCUESTAS DEL EQUIPO ──────────────────────────────────────────────────
// Datos independientes del semestre. Solo RPC de encuestas: nunca notas/ramos.
let encuestaCuenta=null,encuestaVisita=null,encuestaIntentada=false,encuestaActiva=null,encuestaVersion=0,encuestaCuentaNueva=null;
function olvidarEncuestas(){
  encuestaVersion++;encuestaCuenta=null;encuestaVisita=null;encuestaIntentada=false;encuestaActiva=null;encuestaCuentaNueva=null;
  cerrarHojaEncuesta(false);
  if(typeof document!=='undefined')document.querySelector?.('.encuestas-admin')?.remove?.();
}
function marcarPrimeraSesionEncuesta(uid){
  olvidarEncuestas();encuestaCuenta=uid;encuestaCuentaNueva=uid;
  if(!uid||!globalThis.crypto?.randomUUID)return;
  encuestaVisita=visitaEncuesta(uid);
  try{sessionStorage.setItem('gradehub_encuesta_primera_'+uid,encuestaVisita);}catch(e){}
}
function primeraVisitaEncuesta(uid){
  if(encuestaCuentaNueva===uid)return true;
  try{return sessionStorage.getItem('gradehub_encuesta_primera_'+uid)===encuestaVisita;}catch(e){return false;}
}
function sesionEncuestasCambio(event,uid){
  if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&encuestaCuenta&&encuestaCuenta!==uid))olvidarEncuestas();
}
function visitaEncuesta(uid){
  if(encuestaVisita)return encuestaVisita;
  const clave='gradehub_encuesta_visita_'+uid;
  try{const guardada=sessionStorage.getItem(clave);if(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(guardada||''))return guardada;}catch(e){}
  const visita=crypto.randomUUID();
  try{sessionStorage.setItem(clave,visita);}catch(e){}
  return visita;
}
function encuestaConexion(){return typeof navigator==='undefined'||navigator.onLine!==false;}
function encuestaSigue(uid,version){return currentUser?.id===uid&&encuestaVersion===version;}
function sqlEncuestasAusente(error){return ['PGRST202','42883','42P01'].includes(error?.code);}
async function consultarEncuestaAlEntrar(){
  const uid=currentUser?.id;
  if(!uid||!S.onboardingDone||!supabaseClient||!encuestaConexion()||document.visibilityState==='hidden')return;
  if(encuestaCuenta!==uid){olvidarEncuestas();encuestaCuenta=uid;}
  if(encuestaIntentada)return;
  if(document.getElementById('modal')?.classList.contains('open'))return;
  encuestaIntentada=true;
  if(!globalThis.crypto?.randomUUID)return;
  encuestaVisita=visitaEncuesta(uid);
  const version=encuestaVersion;
  try{
    const {data,error}=await supabaseClient.rpc('encuesta_al_entrar',{p_visita:encuestaVisita});
    if(!encuestaSigue(uid,version)||!encuestaConexion())return;
    if(error||!data?.encuesta)return; // SQL opcional: nada de esto bloquea entrar.
    if(primeraVisitaEncuesta(uid))return;
    encuestaActiva=data.encuesta;
    if(typeof renderSettingsSiAbierto==='function')renderSettingsSiAbierto();
    if(data.mostrar&&document.visibilityState!=='hidden'&&!document.getElementById('modal')?.classList.contains('open'))abrirHojaEncuesta(encuestaActiva);
  }catch(e){} // Sin red o SQL ausente: sin encuesta y sin aviso.
}
function entradaEncuestaHTML(){
  return currentUser?.id===encuestaCuenta&&encuestaActiva
    ?`<div class="agent-proposal-entry"><div><b>Encuesta del equipo</b><span>${encuestaActiva.respuesta?'Puedes editar tu respuesta mientras siga activa.':'Puedes responder cuando quieras.'}</span></div><button type="button" class="agent-refresh" onclick="abrirMiEncuesta()">${encuestaActiva.respuesta?'Editar respuesta':'Responder'}</button></div>`:'';
}
async function abrirMiEncuesta(){
  const uid=currentUser?.id,version=encuestaVersion;
  if(!uid||!encuestaConexion())return;
  try{
    const {data,error}=await supabaseClient.rpc('mi_encuesta_activa');
    if(!encuestaSigue(uid,version))return;
    if(error||!data){encuestaActiva=null;if(!sqlEncuestasAusente(error))showToast('La encuesta ya no está disponible.');return;}
    encuestaActiva=data;closeModal();abrirHojaEncuesta(data);
  }catch(e){if(encuestaSigue(uid,version))showToast('No pudimos abrir la encuesta. Intenta con conexión.',true);}
}
let encuestaCerrarTecla=null,encuestaFocoAnterior=null;
function cerrarHojaEncuesta(volverFoco=true){
  if(typeof document==='undefined')return;
  const hoja=document.getElementById('encuesta-hoja');
  const focoDentro=hoja?.contains?.(document.activeElement);
  hoja?.remove?.();
  if(encuestaCerrarTecla)document.removeEventListener('keydown',encuestaCerrarTecla,true);
  encuestaCerrarTecla=null;
  if(volverFoco&&focoDentro&&encuestaFocoAnterior?.isConnected)encuestaFocoAnterior.focus();
  encuestaFocoAnterior=null;
}
function abrirHojaEncuesta(e,{vistaPrevia=false}={}){
  cerrarHojaEncuesta(false);
  const uid=currentUser?.id,version=encuestaVersion;
  if(!vistaPrevia&&(!uid||!encuestaConexion()))return;
  encuestaFocoAnterior=document.activeElement;
  const hoja=document.createElement('aside');hoja.id='encuesta-hoja';hoja.className='encuesta-hoja';
  hoja.setAttribute('role','dialog');hoja.setAttribute('aria-modal','false');hoja.setAttribute('aria-labelledby','encuesta-pregunta');
  const seleccion=new Set(e.respuesta?.opciones||[]);
  hoja.innerHTML=`<div class="encuesta-agarre" aria-hidden="true"><span></span></div>
    ${vistaPrevia?'<p class="encuesta-nota">Vista previa · Puedes probarla. No se guardan respuestas.</p>':''}
    <header><p>ENCUESTA DEL EQUIPO</p><button type="button" class="encuesta-secundario" data-encuesta-cerrar>Ahora no</button></header>
    <h2 id="encuesta-pregunta" tabindex="-1">${esc(e.pregunta)}</h2>
    <form class="encuesta-form"><p>${e.tipo==='una'?'Elige una opción.':e.tipo==='varias'?'Puedes elegir varias opciones.':'Hasta 280 caracteres. No incluyas datos personales.'}</p>
      ${e.tipo==='texto'?`<label class="encuesta-texto">Tu respuesta<textarea maxlength="560" rows="3" name="texto">${esc(e.respuesta?.texto||'')}</textarea></label><p data-encuesta-cuenta aria-live="polite"></p>`:
        `<fieldset><legend class="sr-only">${esc(e.pregunta)}</legend>${(e.opciones||[]).map((o,i)=>`<label class="encuesta-opcion"><input type="${e.tipo==='una'?'radio':'checkbox'}" name="opcion" value="${i+1}" ${seleccion.has(i+1)?'checked':''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`}
      <p class="encuesta-nota">Es opcional. El equipo ve resultados y textos sin identidad; no se cruzan con tus notas.</p>
      <p data-encuesta-estado role="status" aria-live="polite"></p><button type="submit" class="encuesta-enviar">Enviar</button>
    </form><div class="encuesta-confirmar" hidden><p>¿Cerrar sin enviar tu respuesta?</p><button type="button" data-encuesta-seguir>Seguir respondiendo</button><button type="button" data-encuesta-descartar>Cerrar sin enviar</button></div>`;
  document.body.appendChild(hoja);
  const form=hoja.querySelector('form'),estado=hoja.querySelector('[data-encuesta-estado]'),enviar=form.querySelector('[type=submit]');
  const respuesta=()=>({p_encuesta:e.id,p_opciones:[...form.querySelectorAll('[name=opcion]:checked')].map(n=>Number(n.value)),p_texto:form.elements.texto?.value.trim()||null});
  const inicial=JSON.stringify(respuesta());let enviando=false;
  const actualizar=()=>{
    const r=respuesta(),largo=Array.from(form.elements.texto?.value||'').length;
    enviar.disabled=enviando||(e.tipo==='texto'?!r.p_texto||largo>280:!r.p_opciones.length);
    const cuenta=hoja.querySelector('[data-encuesta-cuenta]');if(cuenta)cuenta.textContent=`${largo} / 280`;
  };
  const pedirCierre=()=>{
    if(JSON.stringify(respuesta())===inicial){cerrarHojaEncuesta();return;}
    form.hidden=true;hoja.querySelector('.encuesta-confirmar').hidden=false;hoja.querySelector('[data-encuesta-seguir]').focus();
  };
  hoja.querySelector('[data-encuesta-cerrar]').addEventListener('click',pedirCierre);
  hoja.querySelector('[data-encuesta-descartar]').addEventListener('click',()=>cerrarHojaEncuesta());
  hoja.querySelector('[data-encuesta-seguir]').addEventListener('click',()=>{form.hidden=false;hoja.querySelector('.encuesta-confirmar').hidden=true;enviar.focus();});
  encuestaCerrarTecla=event=>{
    if(event.key!=='Escape'||['modal','confirm-overlay','user-menu'].some(id=>document.getElementById(id)?.classList.contains('open')))return;
    event.preventDefault();pedirCierre();
  };
  document.addEventListener('keydown',encuestaCerrarTecla,true);
  let comienzo=null;const agarre=hoja.querySelector('.encuesta-agarre');
  agarre.addEventListener('pointerdown',event=>{comienzo=event.clientY;agarre.setPointerCapture?.(event.pointerId);});
  agarre.addEventListener('pointerup',event=>{if(comienzo!==null&&event.clientY-comienzo>60)pedirCierre();comienzo=null;});
  agarre.addEventListener('pointercancel',()=>{comienzo=null;});
  form.addEventListener('input',actualizar);form.addEventListener('change',actualizar);actualizar();
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(enviando||enviar.disabled)return;
    if(vistaPrevia){estado.textContent='Vista previa: tu respuesta no se envió.';return;}
    enviando=true;actualizar();estado.textContent='Enviando…';
    try{
      const r=respuesta();
      const {data,error}=await supabaseClient.rpc('responder_encuesta',r);
      if(!encuestaSigue(uid,version)||!hoja.isConnected)return;
      if(error||data!==true){estado.textContent=error?.code==='42501'?'La encuesta ya no está disponible.':'No se envió tu respuesta. Intenta de nuevo.';return;}
      encuestaActiva={...e,respuesta:{opciones:r.p_opciones,texto:r.p_texto}};
      cerrarHojaEncuesta();showToast('Respuesta guardada. Puedes editarla en Ajustes · Sugerencias.');
    }catch(error){if(hoja.isConnected)estado.textContent='No se envió tu respuesta. Intenta con conexión.';}
    finally{enviando=false;if(hoja.isConnected)actualizar();}
  });
  hoja.querySelector('h2').focus({preventScroll:true});
}

function diaChileEncuesta(){
  const partes=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=tipo=>partes.find(x=>x.type===tipo).value;return `${p('year')}-${p('month')}-${p('day')}`;
}
function csvResultadosEncuesta(e,r){
  // Evita interpretar textos libres como fórmulas en Excel/Numbers.
  const celda=v=>'"'+String(v??'').replace(/^[\s]*[=+\-@]/,m=>"'"+m).replace(/"/g,'""')+'"';
  const filas=[['Pregunta','Público','Tipo','Resultado','Cantidad'],[e.pregunta,e.publico,'total','Respuestas',r.total],
    ...(r.opciones||[]).map(x=>[e.pregunta,e.publico,'opcion',x.opcion,x.total]),
    ...(r.textos||[]).map(x=>[e.pregunta,e.publico,'texto',x.texto,x.total])];
  return '\ufeff'+filas.map(f=>f.map(celda).join(',')).join('\r\n')+'\r\n';
}
function descargarResultadosEncuesta(e,r){
  const url=URL.createObjectURL(new Blob([csvResultadosEncuesta(e,r)],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='encuesta-'+e.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function renderAdminEncuestas(raiz){
  const uid=currentUser?.id,version=encuestaVersion;
  const cabecera='<div class="encuestas-admin"><div class="encuestas-admin-cabecera"><h3>Encuestas</h3><button type="button" data-encuestas-actualizar>Actualizar</button></div>';
  const pintar=contenido=>{raiz.innerHTML=cabecera+contenido+'</div>';raiz.querySelector('[data-encuestas-actualizar]').addEventListener('click',()=>renderAdminEncuestas(raiz));};
  pintar('<p role="status">Cargando…</p>');
  const vista=raiz.querySelector('.encuestas-admin');
  let lista;
  try{
    const {data,error}=await supabaseClient.rpc('admin_encuestas');
    if(!encuestaSigue(uid,version)||raiz.isConnected===false||!vista.isConnected)return;
    if(error){pintar(sqlEncuestasAusente(error)?'<p>Encuestas todavía no disponibles.</p>':'<p role="alert">No pudimos cargar las encuestas. Revisa tu acceso y conexión.</p>');return;}
    lista=Array.isArray(data)?data:[];
  }catch(e){if(encuestaSigue(uid,version)&&vista.isConnected)pintar('<p role="alert">No pudimos cargar las encuestas. Intenta de nuevo con conexión.</p>');return;}
  const publicos=[['todos','Todos'],...Object.entries(TENANTS).map(([id,t])=>[id,t.label||t.short])];
  const hoy=diaChileEncuesta();
  pintar(`<details class="encuesta-crear"><summary>Crear encuesta</summary><form>
    <label>Pregunta<input type="text" name="pregunta" maxlength="280" required></label>
    <label>Tipo<select name="tipo"><option value="una">Una opción</option><option value="varias">Varias opciones</option><option value="texto">Texto corto</option></select></label>
    <label data-opciones-admin>Opciones<textarea name="opciones" rows="3" placeholder="Una por línea, entre 2 y 6" required></textarea></label>
    <label>Público<select name="publico">${publicos.map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('')}</select></label>
    <div class="encuesta-fechas"><label>Inicio<input type="date" name="inicio" value="${hoy}" required></label><label>Término<input type="date" name="termino" value="${hoy}" required></label></div>
    <p>Fechas completas de Chile, incluido el día de término. Una encuesta simultánea por público.</p>
    <p role="status" data-crear-estado></p><button type="button" data-encuesta-preview>Vista previa</button><button type="submit" class="encuesta-enviar">Crear encuesta</button>
    </form></details><div class="encuestas-lista">${lista.map(e=>`<section data-encuesta-admin="${esc(e.id)}"><h2>${esc(e.pregunta)}</h2><p>${esc(publicos.find(([id])=>id===e.publico)?.[1]||e.publico)} · ${esc(e.inicio)} a ${esc(e.termino)} · ${e.termino<hoy?'Terminada por fecha':esc(e.estado)}</p>
    <div class="encuesta-acciones">${e.estado!=='terminada'&&e.termino>=hoy?`<button type="button" data-encuesta-cambiar="${e.estado==='activa'?'pausada':'activa'}">${e.estado==='activa'?'Pausar':'Reanudar'}</button><button type="button" data-encuesta-cambiar="terminada">Terminar</button>`:''}<button type="button" data-encuesta-resultados>Ver resultados</button></div><div data-encuesta-totales aria-live="polite"></div></section>`).join('')||'<p>Todavía no hay encuestas.</p>'}</div>`);
  const form=raiz.querySelector('.encuesta-crear form'),f=form.elements,estado=raiz.querySelector('[data-crear-estado]');
  f.tipo.addEventListener('change',()=>{const texto=f.tipo.value==='texto';raiz.querySelector('[data-opciones-admin]').hidden=texto;f.opciones.required=!texto;});
  form.querySelector('[data-encuesta-preview]').addEventListener('click',()=>{
    const pregunta=f.pregunta.value.trim(),tipo=f.tipo.value;
    const opciones=tipo==='texto'?[]:f.opciones.value.split('\n').map(x=>x.trim()).filter(Boolean);
    if(!pregunta){estado.textContent='Escribe la pregunta para ver la vista previa.';f.pregunta.focus();return;}
    if(tipo!=='texto'&&(opciones.length<2||opciones.length>6)){estado.textContent='Escribe entre 2 y 6 opciones, una por línea.';f.opciones.focus();return;}
    estado.textContent='';
    abrirHojaEncuesta({pregunta,tipo,opciones},{vistaPrevia:true});
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();const boton=form.querySelector('[type=submit]');if(boton.disabled)return;
    const opciones=f.tipo.value==='texto'?[]:f.opciones.value.split('\n').map(x=>x.trim()).filter(Boolean);
    if(f.tipo.value!=='texto'&&(opciones.length<2||opciones.length>6)){estado.textContent='Escribe entre 2 y 6 opciones, una por línea.';return;}
    boton.disabled=true;estado.textContent='Creando…';
    try{
      const {data,error}=await supabaseClient.rpc('admin_crear_encuesta',{p_pregunta:f.pregunta.value.trim(),p_tipo:f.tipo.value,p_opciones:opciones,p_publico:f.publico.value,p_inicio:f.inicio.value,p_termino:f.termino.value});
      if(!encuestaSigue(uid,version)||!form.isConnected)return;
      if(error||!data){estado.textContent=error?.message||'No se creó la encuesta. Intenta de nuevo.';return;}
      await renderAdminEncuestas(raiz);
    }catch(e){if(form.isConnected)estado.textContent='No se creó la encuesta. Revisa tu conexión.';}finally{if(form.isConnected)boton.disabled=false;}
  });
  const porId=new Map(lista.map(e=>[e.id,e]));
  raiz.querySelectorAll('[data-encuesta-admin]').forEach(caja=>{
    const e=porId.get(caja.dataset.encuestaAdmin),totales=caja.querySelector('[data-encuesta-totales]');
    caja.querySelectorAll('[data-encuesta-cambiar]').forEach(b=>b.addEventListener('click',()=>{
      const aplicar=async()=>{
        b.disabled=true;
        try{const {data,error}=await supabaseClient.rpc('admin_estado_encuesta',{p_encuesta:e.id,p_estado:b.dataset.encuestaCambiar});
          if(!encuestaSigue(uid,version)||!caja.isConnected)return;
          if(error||data!==true){totales.textContent=error?.message||'No se aplicó el cambio.';return;}await renderAdminEncuestas(raiz);
        }catch(error){if(caja.isConnected)totales.textContent='No se aplicó el cambio. Revisa tu conexión.';}finally{if(b.isConnected)b.disabled=false;}
      };
      if(b.dataset.encuestaCambiar==='terminada')showConfirm('¿Terminar esta encuesta?','Se dejarán de aceptar respuestas. Los resultados se conservan.',aplicar,{label:'Terminar',focusCancel:true});else aplicar();
    }));
    caja.querySelector('[data-encuesta-resultados]').addEventListener('click',async event=>{
      const b=event.currentTarget;if(b.disabled)return;b.disabled=true;totales.textContent='Cargando resultados…';
      try{
        const {data:r,error}=await supabaseClient.rpc('admin_resultados_encuesta',{p_encuesta:e.id});
        if(!encuestaSigue(uid,version)||!caja.isConnected)return;
        if(error||!r){totales.textContent='No pudimos leer los resultados. Verifica tu segundo factor e intenta de nuevo.';return;}
        totales.innerHTML=`<p><b>${Number(r.total)||0}</b> respuestas</p>${(r.opciones||[]).map(x=>`<p>${esc(x.opcion)}: ${Number(x.total)||0}</p>`).join('')}${(r.textos||[]).map(x=>`<blockquote>${esc(x.texto)} <span>(${Number(x.total)||0})</span></blockquote>`).join('')}<button type="button" data-encuesta-csv>Descargar CSV</button>`;
        totales.querySelector('[data-encuesta-csv]').addEventListener('click',async event=>{
          const exportar=event.currentTarget;if(exportar.disabled)return;exportar.disabled=true;
          try{
            // Vuelve a exigir MFA y trae los totales actuales antes de exportar.
            const {data:actual,error}=await supabaseClient.rpc('admin_resultados_encuesta',{p_encuesta:e.id});
            if(!encuestaSigue(uid,version)||!caja.isConnected)return;
            if(error||!actual){showToast('No pudimos exportar. Verifica tu segundo factor e intenta de nuevo.',true);return;}
            descargarResultadosEncuesta(e,actual);
          }catch(error){if(encuestaSigue(uid,version))showToast('No pudimos exportar. Intenta con conexión.',true);}
          finally{if(exportar.isConnected)exportar.disabled=false;}
        });
      }catch(error){if(caja.isConnected)totales.textContent='No pudimos leer los resultados. Revisa tu conexión.';}finally{if(b.isConnected)b.disabled=false;}
    });
  });
}
