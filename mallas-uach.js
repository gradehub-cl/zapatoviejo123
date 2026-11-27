// Mallas curriculares UACh, una por carrera. Se carga BAJO DEMANDA igual que las
// de las otras universidades: solo le sirve a quien estudia en la Universidad
// Austral de Chile.
//
// Hoy trae una carrera, Derecho, que es la única cuya facultad publica el plan
// ramo por ramo con el programa de cada uno
// (derecho.uach.cl/programas-y-mallas, leído el 2026-11-27). Valdivia y Puerto
// Montt comparten el plan y los programas, así que es una sola opción. Las demás
// carreras de la UACh se declaran escribiendo el nombre y agregando los ramos a
// mano.
//
// Sale de la lista por semestre de esa página y de la imagen de la malla que
// publica al lado («Datos octubre 2024»). Coinciden casillero por casillero.
// Solo SUGIERE los ramos del semestre: el estudiante confirma y edita.
//
// Mismo criterio que las otras universidades: fuera los casilleros que no
// nombran un curso —Optativo de Formación General y Optativo de Formación
// Profesional I a V— y el Examen de Licenciatura, que es un hito y no un ramo.
// Por eso no hay 10° semestre: en la malla es solo ese examen.
//
// Lo que NO es transcripción literal: «Redacción de contratos» va con mayúscula
// como el resto, y «Educación Física y Salud» va sin el asterisco con que la
// página avisa que la dicta el Centro de Deporte.
//
// Fuentes, SHA-256 y lo pendiente: docs/mallas-uach.md.
var MALLAS_UACH_EXTRA={};

// ─── Facultad de Ciencias Jurídicas y Sociales ───────────────────────────────
MALLAS_UACH_EXTRA['UACH-DERECHO']={
  1:['Sistema Jurídico','Historia del Derecho','Comunicación Oral y Escrita','Teoría Constitucional','Jurisdicción','Educación Física y Salud'],
  2:['Razonamiento Jurídico','Historia del Derecho Chileno','Conceptos Fundamentales de Derecho Privado','Derecho Constitucional Orgánico','Introducción a la Profesión Jurídica'],
  3:['Teoría de la Justicia','Acto Jurídico','Análisis Jurisprudencial','Economía','Derechos Fundamentales','Proceso Civil Ordinario'],
  4:['Bienes','Taller de Resolución de Casos Prácticos','Derecho Internacional de los Derechos Humanos','Derecho Económico','Derecho Procesal Constitucional','Derecho Probatorio'],
  5:['Derecho Societario','Obligaciones','Análisis Doctrinal','Introducción al Derecho Penal','Bases del Derecho Administrativo','Procedimientos Especiales y Recursos Civiles'],
  6:['Contratos','Teoría del Delito, del Sujeto Responsable y de la Pena','Derecho Tributario','Control y Responsabilidad de la Administración','Regulaciones Ambientales y de Recursos Naturales','Redacción de Instrumentos Administrativos'],
  7:['Redacción de Contratos','Derecho Individual del Trabajo','Responsabilidad Civil','Delitos','Mercados Regulados','Proceso Penal'],
  8:['Resolución de Conflictos del Trabajo','Títulos de Crédito e Insolvencia','Derecho y Procedimientos de Familia','Derecho y Procedimientos de Consumo','Informe Jurídico','Litigación Penal'],
  9:['Ética y Responsabilidad Profesional','Derecho Sucesorio','Pasantía Profesional','Litigación Civil de Familia y del Trabajo'],
};
