async function syncProfile(){
  if(!supabaseClient||!currentUser)return;
  // Una cuenta solo profesor no eligió universidad ni carrera en el onboarding.
  // S.tenant conserva el valor técnico por defecto ('fen'): publicarlo en
  // profiles haría parecer que estudia en FEN y contaminaría los reportes.
  if(typeof esCuentaProfesor==='function'&&esCuentaProfesor())return;
  try{
    await supabaseClient.from('profiles').upsert({
      id:currentUser.id,
      nombre:S.userName||null,
      universidad:(TENANTS[S.tenant]&&TENANTS[S.tenant].name)||null,
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
    });
  }catch(e){}
}
// Se guarda apenas se crea la cuenta, antes del onboarding. Así no depende de
// que la persona alcance a configurar sus ramos para que exista la constancia.
// Las columnas son opcionales para no reinterpretar ni bloquear perfiles previos.
// Se llama al terminar el onboarding, que es por donde pasa toda cuenta nueva.
// No revienta hacia afuera: la persona ya está adentro y su semestre ya está
// guardado; un fallo de red acá no puede dejarla fuera de su propia cuenta.
async function registrarDeclaracionEdad({edad=null,generacion=null}={}){
  if(!supabaseClient||!currentUser)return;
  try{
    await supabaseClient.from('profiles').upsert({
      id:currentUser.id,
      edad_declarada_en:new Date().toISOString(),
    });
    // Quien entró con Google nunca vio la casilla del formulario de correo.
    await registrarAceptacionLegal();
  }catch(e){}
  // Edad y generación (#697) van aparte: si sus columnas todavía no existen,
  // la constancia de la declaración ya quedó guardada arriba igual.
  try{
    const datos={id:currentUser.id};
    if(Number.isInteger(edad)&&edad>=14&&edad<=120)datos.edad=edad;
    if(Number.isInteger(generacion)&&generacion>=2000&&generacion<=new Date().getFullYear())datos.generacion=generacion;
    if(Object.keys(datos).length>1)await supabaseClient.from('profiles').upsert(datos);
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
