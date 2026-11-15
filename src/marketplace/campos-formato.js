
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
const EJEMPLO_CONTACTO_CLASE={whatsapp:'+56 9 1234 5678',instagram:'@tu_usuario',enlace:'https://example.org/contacto'};

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
    // Reutiliza esta lectura propia para reconocer la tarjeta del dueño y su
    // asociación de ramos. Sin SQL o sin permiso, retrocede de a un campo.
    const pedir=async campos=>{
      const leer=extra=>supabaseClient.from('tutor_perfiles').select(campos+extra).eq('user_id',uid).maybeSingle();
      const msg=r=>String(r.error?.message||'');
      let r=await leer(',directorio_id,ramos_por_universidad');
      // Falta solo el mapa (#1105 sin SQL): conserva directorio_id.
      if(faltaColumnaClase(r.error)&&msg(r).includes('ramos_por_universidad')&&!msg(r).includes('directorio_id')){
        r=await leer(',directorio_id');
        if(!(r.error?.code==='42501'||faltaColumnaClase(r.error)&&msg(r).includes('directorio_id')))return r;
        return leer('');
      }
      if(r.error?.code==='42501'||faltaColumnaClase(r.error)&&/directorio_id|ramos_por_universidad/.test(msg(r)))r=await leer('');
      return r;
    };
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
