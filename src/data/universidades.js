
// ─── MULTI-TENANT (universidad → identidad visual) ───────────────────────────
// `mono` es la sigla que se dibuja en el monograma (ver tenantBadge). No es el
// logo ni el escudo de la universidad: es una etiqueta con iniciales en la
// tipografía de GradeHub. Nunca reproducir marcas registradas acá.
const TENANTS={
  fen:{name:'U. de Chile · FEN', short:'FEN', mono:'FEN', sub:'Economía y Negocios'},
  // `name` ya está persistido en profiles.universidad. Se conserva para no
  // partir los conteos existentes; `sub` aclara que la opción no es solo para
  // Ingeniería mientras se diseña una migración al código estable `uc`.
    // `name` es el valor que se PERSISTE en `profiles` y no se cambia sin migrar
  // las cuentas que ya lo tienen escrito; `label` es lo que ve la persona. Se
  // separaron porque la UC en GradeHub ya no es solo Ingeniería —son 71
  // carreras declarables— y decir "U. Católica · Ingeniería" en la pantalla
  // donde alguien elige su universidad deja fuera a todo el resto.
  uc :{name:'U. Católica · Ingeniería', label:'U. Católica', short:'UC', mono:'UC', sub:'Ingeniería, Comercial y más carreras'},
  // oculto:true → no se ofrece al elegir universidad, pero sigue funcionando
  // completo (tema, carreras, presets) para quien ya lo tenga seleccionado.
  // Quitar la marca cuando se quiera lanzar.
  uai:{name:'U. Adolfo Ibáñez', short:'UAI', mono:'UAI', sub:'Todas las carreras'},
  // Las mallas de la UAndes viven en mallas-uandes.js. Pautas todavía no hay:
  // no se inventan ponderaciones.
  uandes:{name:'U. de los Andes', short:'UANDES', mono:'UA', sub:'Todas las carreras'},
  // Las mallas de la UDD viven en mallas-udd.js. Pautas todavía no hay: no se
  // inventan ponderaciones.
  udd:{name:'U. del Desarrollo', short:'UDD', mono:'UDD', sub:'Todas las carreras'},
};

// El dominio del correo institucional de los estudiantes, por universidad. Al
// entrar por primera vez con uno de estos correos (Google o correo), el paso 2
// del onboarding llega con esa universidad ya marcada; se puede cambiar. Solo
// dominios de ESTUDIANTES y verificados: miuandes.cl es el dominio de Google
// Workspace de los alumnos UAndes (su acceso al correo usa hd=miuandes.cl).
const DOMINIOS_CORREO_POR_TENANT={
  uandes:['miuandes.cl'],
};

// Equivalencias institucionales para calificaciones que sí participan del
// promedio. Son dato por universidad: no se aplican a otro tenant por parecido.
// La "C" UC queda fuera a propósito: no tiene equivalencia numérica y el modelo
// todavía no sabe representar un ramo aprobado que no entra al promedio.
const CALIFICACIONES_CONCEPTUALES_POR_TENANT={
  uc:{D:7.0,A:5.0,R:3.0},
};

// ─── GLIFOS DE UNIVERSIDAD ───────────────────────────────────────────────────
// Marcas de línea, sin texto, en el mismo lenguaje de trazo que el resto de los
// íconos de la app. Cada escudo se reduce a su elemento dominante: a 26px un
// escudo de 4 cuadrantes es una mancha, el motivo principal sí se reconoce.
//
// Para reemplazar uno: cambia su entrada acá por el <path> del SVG nuevo.
// Requisitos: viewBox 0 0 48 48, sin fill, trazo heredado (stroke:currentColor).
// Vacío a propósito. Mientras no haya un SVG real de la marca se usa la sigla,
// que el estudiante reconoce al instante. Un símbolo genérico inventado —una
// estrella, una cruz— no identifica a ninguna universidad.
//
// Para activar el logo de una: registra su SVG acá.
//   viewBox="0 0 48 48" · solo trazos · sin fill ni color propio (heredan el tema)
//   máximo ~5 trazos, o no se lee a 20px.
const TENANT_GLYPHS={
  // fen: '<path d="…"/>',
  // uc:  '<path d="…"/>',
};
