async function syncProfile(){
  if(!supabaseClient||!currentUser)return;
  await copiarNombreAAuth();
  // Una cuenta solo profesor no eligió universidad ni carrera en el onboarding.
  // S.tenant conserva el valor técnico por defecto ('fen'): publicarlo en
  // profiles haría parecer que estudia en FEN y contaminaría los reportes.
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return;
  try{
    await supabaseClient.from('profiles').upsert({
      id:currentUser.id,
      nombre:S.userName||null,
      universidad:TENANTS[S.tenant]?S.tenant:null,
      // Se manda lo DECLARADO, no el código: 'Derecho' vale para saber qué
      // malla construir; 'null' —que es lo que había cuando no tenemos su
      // malla— no vale para nada. Los códigos viejos siguen siendo válidos y
      // se distinguen porque están en CARRERAS_DECLARABLES.
      carrera:S.carreraNombre||S.carrera||null,
      // En TAV no hay número de semestre.
      semestre:(typeof enVerano==='function'&&enVerano())?null:(S.careerSemestre||null),
      // Columna de #697: si todavía no existe, esta subida falla entera; por
      // eso solo va cuando hay generación, que tienen solo las cuentas nuevas.
      ...(S.generacion?{generacion:S.generacion}:{}),
      // Igual que generación: solo cuando hay apellido (cuentas nuevas), para
      // que una cuenta antigua nunca dependa de la columna nueva.
      ...(S.userApellido?{apellido:S.userApellido}:{}),
    });
  }catch(e){}
}
// El nombre del onboarding también va a los metadatos de Auth, que es lo que
// muestra la columna «Display name» del panel de Supabase. Google y Apple ya
// lo traen; quien se registró con correo solo lo escribió en el onboarding
// (o en Ajustes, si es una cuenta anterior al campo de apellido).
// Nunca pisa un nombre que ya esté ahí (el de Google, el de Apple o uno
// anterior), y un fallo no bloquea nada: se reintenta en la próxima entrada.
async function copiarNombreAAuth(){
  const cliente=supabaseClient,user=currentUser;
  if(!cliente?.auth?.updateUser||!user?.id)return;
  const meta=user.user_metadata||{};
  if(String(meta.full_name||meta.name||'').trim())return;
  // Solo con nombre Y apellido: como nunca se pisa, un nombre de pila suelto
  // quedaría fijo en Auth aunque después agregue su apellido en Ajustes.
  const [nom,ape]=[S.userName,S.userApellido].map(v=>String(v||'').replace(/\s+/g,' ').trim());
  if(!nom||!ape)return;
  const nombre=(nom+' '+ape).slice(0,100);
  try{
    const r=await cliente.auth.updateUser({data:{full_name:nombre}});
    if(currentUser!==user||supabaseClient!==cliente)return;
    if(!r?.error&&r?.data?.user?.id===user.id)currentUser=r.data.user;
  }catch(e){}
}
// Se guarda apenas se crea la cuenta, antes del onboarding. Así no depende de
// que la persona alcance a configurar sus ramos para que exista la constancia.
// Las columnas son opcionales para no reinterpretar ni bloquear perfiles previos.
// Se llama al terminar el onboarding, que es por donde pasa toda cuenta nueva.
// No revienta hacia afuera: la persona ya está adentro y su semestre ya está
// guardado; un fallo de red acá no puede dejarla fuera de su propia cuenta.
async function registrarDeclaracionEdad({generacion=null}={}){
  if(!supabaseClient||!currentUser)return;
  try{
    await supabaseClient.from('profiles').upsert({
      id:currentUser.id,
      edad_declarada_en:new Date().toISOString(),
    });
    // Quien entró con Google nunca vio la casilla del formulario de correo.
    await registrarAceptacionLegal();
  }catch(e){}
  // La generación (#697) va aparte: si su columna todavía no existe, la
  // constancia de la declaración ya quedó guardada arriba igual. La edad ya no
  // se pregunta ni se sube (2026-11-03); la que guardaron cuentas anteriores
  // queda como está y se borra con la cuenta.
  try{
    if(Number.isInteger(generacion)&&generacion>=2000&&generacion<=new Date().getFullYear())
      await supabaseClient.from('profiles').upsert({id:currentUser.id,generacion});
  }catch(e){}
}
async function registrarAceptacionLegal(){
  if(!supabaseClient||!currentUser)throw new Error('No pudimos registrar la aceptación.');
  const {error}=await supabaseClient.from('profiles').upsert({
    id:currentUser.id,
    terminos_aceptados_en:new Date().toISOString(),
    terminos_version:LEGAL_ACCEPTANCE_VERSION,
  });
  if(error)throw error;
}
// Lo que no alcanzó a subir vive solo en este dispositivo, y cerrar sesión borra
// la copia local: una nota anotada sin conexión se perdía sin aviso, aunque la
// app ya hubiera dicho "No cierres sesión". Antes de salir se intenta subir y,
// si no se puede, se pregunta.
// ¿Tiene esta pestaña algo que la nube todavía no tiene?
