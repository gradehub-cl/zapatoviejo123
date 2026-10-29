// ─── CURSOS UC SIN SEMESTRE ──────────────────────────────────────────────────
// Cursos que existen en la UC pero que NO pertenecen a un semestre de ninguna
// malla: los OFG y los optativos son una elección, no un ramo que curse todo
// el mundo. Van acá para que el buscador los encuentre; la malla no los carga
// sola y nadie los recibe sin pedirlos.
//
// No es una lista teórica. De los quince ramos que los estudiantes escribieron
// a mano en la primera noche, nueve eran de esta clase: tres pidieron
// "biocel" —cada uno con una grafía distinta— y tres pidieron un teológico.
// Tenían que escribirlo porque la app solo conocía ramos de malla.
//
// Fuente: BuscaCursos UC (buscacursos.uc.cl), oferta 2026-2, consultada el
// 2026-08-18. Se corrigieron tildes y mayúsculas rotas que trae el sistema
// ("Revelacion" → "Revelación", "Siglo Xxi" → "Siglo XXI"); eso no afecta la
// búsqueda, que compara sin tildes, y evita mostrarle al estudiante un nombre
// mal escrito.
//
// TRES CURSOS DE ESTA CLASE NO ESTÁN ACÁ y es a propósito: "Revelación y Fe"
// (TTF012), "Principios Ecológicos y Medio Ambiente" (BIO143M) y "Biología de
// Organismos y Comunidades" (BIO110C) ya tienen su
// pauta oficial en PRESETS_UC y entran al buscador por `presetsFueraDeMalla`.
// Repetirlos acá los mostraría dos veces, una con ponderaciones y otra sin
// ellas. El segundo se llamaba "Principios de Ecología y Medio Ambiente" hasta
// que se comprobó contra BuscaCursos que su nombre oficial es este.
//
// SOLO NOMBRE Y SIGLA. Ninguno trae pauta: no tenemos sus programas, y
// rellenar ponderaciones plausibles es exactamente lo que no se hace acá. Si
// más adelante aparece el programa de uno, su pauta va a PRESETS_UC como
// cualquier otra. Si aparece el dato de a qué semestre pertenece, pasa a la
// malla y sale de esta lista.
const CURSOS_UC=[
  // Optativos biológicos que pidieron los estudiantes. BIO110C salió de acá
  // el 2026-09-26: ya tiene pauta en PRESETS_UC y entra por
  // `presetsFueraDeMalla`, como los dos de abajo.
  ['BIO141C','Biología de la Célula'],
  ['BIO141T','Taller de Biología de la Célula'],
  // Formación Teológica (OFG). Un estudiante cursa uno de estos, no todos.
  ['TTF010','Teología Fundamental'],
  ['TTF013','Tópicos de Ética Social Cristiana'],
  ['TTF019','Psicología y Religión Cristiana'],
  ['TTF026','Introducción a la Biblia'],
  ['TTF047','Dios en el Siglo XXI'],
  ['TTF068','El Matrimonio Cristiano Hoy'],
  ['TTF073','Fin de los Tiempos. Mitos y Realidad'],
  ['TTF079','Experiencia Cristiana y Compromiso Social'],
  ['TTF081','Cristianismo y Disidencia: Una Mirada Histórica'],
  ['TTF083','Cristianismo y Derechos Humanos'],
  ['TTF087','¿Está Dios en el Escenario Humano?'],
  ['TTF091','Leer el Evangelio en el Siglo XXI'],
  ['TTF100','Arte y Revelación'],
  ['TTF111','Ética Teológica de la Tecnología Moderna'],
];

const SIGLAS_UC={
  'ING-PC':{
    'Cálculo I':'MAT1610', 'Álgebra Lineal':'MAT1203', 'Química para Ingeniería':'QIM100E',
    'Desafíos de la Ingeniería':'ING1004', 'Filosofía: ¿Para Qué?':'FIL2001',
    'Cálculo II':'MAT1620', 'Dinámica':'FIS1514', 'Laboratorio de Dinámica':'FIS0154',
    'Introducción a la Programación':'IIC1103', 'Cálculo III':'MAT1630',
    'Ecuaciones Diferenciales':'MAT1640', 'Termodinámica':'FIS1523',
    'Laboratorio de Termodinámica':'FIS0152', 'Introducción a la Economía':'ICS1513',
    'Práctica I':'ING1001', 'Probabilidades y Estadística':'EYP1113',
    'Electricidad y Magnetismo':'FIS1533', 'Laboratorio de Electricidad y Magnetismo':'FIS0153',
    // Cursos de especialidad con programa oficial 2026-2. ICT2904 conserva la
    // sigla del catálogo y del nombre del archivo recibido: el PDF contiene un
    // rótulo interno ICT3103 que contradice ambos y no se usa para renombrarlo.
    'Econometría Aplicada':'ICS2563', 'Métodos de Optimización':'ICS2121',
    'Ingeniería de Sistemas de Transporte':'ICT2904',
    'Programación como Herramienta para la Ingeniería':'IIC2115',
  },
  'COM':{
    'Cálculo I':'MAT1610', 'Introducción a la Microeconomía':'EAE1110',
    'Contabilidad':'EAA1210', 'Comportamiento Organizacional':'EAA1110',
    'Probabilidad y Estadística':'EAA1510', 'Introducción al Álgebra Lineal':'MAT1279',
    'Cálculo II':'MAT1620', 'Introducción a la Macroeconomía':'EAE1210',
    'Filosofía: ¿Para Qué?':'FIL2001', 'Inferencia Estadística':'EAA1520',
    'Aplicaciones Matemáticas para Economía y Negocios':'EAF2010',
    'Análisis Económico: La Experiencia Chilena':'EAE1220', 'Fundamentos de Finanzas':'EAA1220',
    'Econometría':'EAE2510', 'Microeconomía I':'EAE2110',
    'Estrategia de la Organización':'EAA2410', 'Fundamentos de Marketing':'EAA2310',
    'Introducción a la Programación':'IIC1103', 'Microeconomía II':'EAE2120',
    'Macroeconomía I':'EAE2210', 'Teoría Financiera':'EAA2210',
    'Estrategia Competitiva':'EAA2420', 'Competencia y Mercado':'EAE2130',
    'Contabilidad de Costos':'EAA2220', 'Ética, Economía y Empresa':'ETI209',
    'Marketing Analytics':'EAA2320', 'Empresas y Legislación':'EAA2230',
    'Macroeconomía II':'EAE2220', 'Contabilidad Gerencial':'EAA2240',
    'Dirección de Personas':'EAA2110', 'Práctica Social':'EAF2500',
  },
};
