
// ─── PERFIL DE PROFESOR O EMPRESA (2026-10-23, base de #643) ─────────────────
// El profesor elige si es profesor o academia, sus redes, ramos y
// universidades, y si el perfil se muestra en sus anuncios. Nada es público
// hasta que lo activa (supabase/perfil_profesor.sql).
const CAMPOS_PERFIL_PROFESOR=',tipo_perfil,instagram,sitio_web,universidades,ramos_siglas,perfil_publico';
// También son las de un anuncio (editor y validarBorradorClase). Calzan con
// los checks de clases_particulares.sql y perfil_profesor.sql.
const UNIVERSIDADES_PERFIL=[['uc','UC'],['fen','FEN'],['uai','UAI'],['uandes','UAndes'],['udd','UDD']];
const TIPOS_PERFIL=[['profesor','Profesor'],['empresa','Academia o empresa']];
function tienePerfilCompleto(perfil){return !!perfil&&Object.prototype.hasOwnProperty.call(perfil,'perfil_publico');}
function validarPerfilProfesor(e){
  const nombre=String(e.nombre_publico||'').trim(),presentacion=String(e.presentacion||'').trim();
  if(nombre.length<2||nombre.length>100)return {ok:false,campo:'nombre',error:'Escribe un nombre público de 2 a 100 caracteres.'};
  if(presentacion.length<20||presentacion.length>1500)return {ok:false,campo:'presentacion',error:'Escribe una descripción de 20 a 1500 caracteres.'};
  const tipo=e.tipo_perfil==='empresa'?'empresa':e.tipo_perfil==='profesor'?'profesor':null;
  const insta=String(e.instagram||'').trim().replace(/^@/,'');
  if(insta&&!/^[A-Za-z0-9._]{1,30}$/.test(insta))return {ok:false,campo:'instagram',error:'Escribe tu usuario de Instagram, por ejemplo @tu_usuario.'};
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
  const directorio=Object.prototype.hasOwnProperty.call(e,'en_directorio')?validarPerfilDirectorio(e):{ok:true,datos:{}};
  if(!directorio.ok)return directorio;
  return {ok:true,datos:{...directorio.datos,nombre_publico:nombre,presentacion,tipo_perfil:tipo,instagram:insta||null,sitio_web:web?new URL(web).href:null,
    universidades:universidades.length?universidades:null,ramos_siglas:ramos.length?ramos:null,perfil_publico:!!e.perfil_publico}};
}
async function guardarPerfilProfesor(entrada){
  const valido=validarPerfilProfesor(entrada);if(!valido.ok)return valido;
  const uid=sesionProfesorClase();if(!uid)return {ok:false,error:'Inicia sesión para guardar tu perfil.'};
  try{
    const {data,error}=await supabaseClient.from('tutor_perfiles').update(valido.datos).eq('user_id',uid)
      .select('nombre_publico'+CAMPOS_PERFIL_PROFESOR+(Object.prototype.hasOwnProperty.call(valido.datos,'en_directorio')?','+CAMPOS_DIRECTORIO:'')).maybeSingle();
    if(uid!==sesionProfesorClase())return {ok:false,error:'La sesión cambió. Vuelve a abrir tu perfil.'};
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

// El contacto es explícito del perfil; nunca se toma el correo de la cuenta.
function validarPerfilDirectorio(e){
  const error=(campo,error)=>({ok:false,campo,error});
  const categorias=[...new Set(Array.isArray(e.categorias)?e.categorias:[])];
  if(categorias.some(c=>!CATEGORIAS_DIRECTORIO.some(([v])=>v===c))||categorias.length>4)
    return error('categorias','Elige las categorías de la lista.');
  const etiqueta=String(e.etiqueta||'').trim(),color=String(e.color_tarjeta||'').toLowerCase();
  if((etiqueta||e.en_directorio)&&(etiqueta.length<2||etiqueta.length>28||/[\n\r]/.test(etiqueta)))
    return error('etiqueta','Escribe una etiqueta de 2 a 28 caracteres, en una sola línea.');
  if(!/^#[0-9a-f]{6}$/.test(color))return error('color','Elige un color para tu tarjeta.');
  if(e.en_directorio&&!categorias.length)return error('categorias','Elige al menos una categoría para aparecer.');
  if(e.en_directorio&&!(e.universidades||[]).some(t=>UNIVERSIDADES_PERFIL.some(([v])=>v===t)))
    return error('universidades','Elige dónde ofreces apoyo para aparecer en el directorio.');
  const tipo=String(e.contacto_tipo||''),valor=String(e.contacto_valor||'').trim();
  if(tipo||valor){
    if(tipo==='whatsapp'&&!whatsappChilenoCompleto(valor))return error('contacto',ERROR_WHATSAPP_CHILE);
    if(!['whatsapp','instagram','email'].includes(tipo)||!valor||valor.length>160||valor.length<3||!enlaceContactoClase(tipo,valor))
      return error('contacto','Revisa el contacto: usa WhatsApp, Instagram o email.');
  }
  return {ok:true,datos:{categorias:categorias.length?categorias:null,etiqueta:etiqueta||null,color_tarjeta:color,
    en_directorio:e.en_directorio===true,contacto_tipo:tipo||null,contacto_valor:valor||null}};
}
