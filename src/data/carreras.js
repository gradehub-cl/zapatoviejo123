// ─── CARRERAS QUE SE PUEDEN DECLARAR ─────────────────────────────────────────
// Distinto de CARRERAS y CARRERAS_UC, que son las que tienen MALLA verificada y
// por eso se pueden cargar solas. Acá va la oferta completa de pregrado, para
// que cualquier estudiante pueda decir qué estudia aunque no tengamos su malla.
//
// POR QUÉ IMPORTA QUE ESTÉN TODAS. Sin esto, alguien de Derecho UC no tenía
// cómo declararse: elegía una carrera que no era la suya o se quedaba fuera. Y
// nosotros no teníamos manera de saber que hay cuarenta esperando esa malla,
// que es justo el dato que decide cuál construir después.
//
// `malla` aparece SOLO en las que ya tienen una cargada, y su valor es el
// código que usan MALLA / MALLA_UC. Las demás no llevan código: se declaran y
// el estudiante arma sus ramos a mano.
//
// DE DÓNDE SALEN. UC: admision.uc.cl/carreras (71 programas de pregrado).
// FEN: fen.uchile.cl/es/pregrado (3). Ninguna se escribió de memoria — un
// nombre inventado acá no falla, se queda en la base y después manda a
// construir la malla equivocada.
const CARRERAS_DECLARABLES={
  // Carreras y vías verificadas en las mallas oficiales UAI. Cada licenciatura
  // o vía distinta tiene su propia opción: no se unen planes incompatibles.
  // Los códigos existentes se conservan; solo se precisa su nombre visible.
  // Fuentes y límites de la ampliación de octubre: docs/mallas-uai.md.
  uai:[
    {n:'Ingeniería Aeroespacial',malla:'UAI-INGENIERIA-AEROESPACIAL'},
    {n:'Periodismo',malla:'UAI-PERIODISMO'},
    {n:'Comunicación Estratégica',malla:'UAI-COMUNICACION-ESTRATEGICA'},
    {n:'Ciencias del Comportamiento y Negocios',malla:'UAI-CIENCIAS-DEL-COMPORTAMIENTO-Y-NEGOCIOS'},
    {n:'Arquitectura + Ing. Civil Industrial',malla:'UAI-DOBLE-TITULO-ARQUITECTURA-INGENIERIA-CIVIL-INDUSTRIAL'},
    {n:'Psicología',malla:'UAI-PSICOLOGIA'},
    {n:'Derecho',malla:'UAI-DERECHO'},
    {n:'Doble Grado Derecho + Ingeniería Comercial',malla:'UAI-DOBLE-GRADO-DERECHO-E-INGENIERIA-COMERCIAL'},
    {n:'Doble Título Ingeniería Comercial + Sociología (Administración de Empresas)',malla:'UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA'},
    {n:'Doble Título Ingeniería Comercial + Sociología (Economía)',malla:'UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA-ECONOMIA'},
    {n:'Ingeniería Comercial (Economía)',malla:'UAI-INGENIERIA-COMERCIAL'},
    {n:'Ingeniería Comercial (Administración de Empresas)',malla:'UAI-INGENIERIA-COMERCIAL-ADMINISTRACION'},
    {n:'Bachillerato de Ingeniería Comercial',malla:'UAI-BACHILLERATO-DE-INGENIERIA-COMERCIAL'},
    {n:'International Management',malla:'UAI-INTERNATIONAL-MANAGEMENT'},
    {n:'Ingeniería en Negocios y Tecnología',malla:'UAI-INGENIERIA-EN-NEGOCIOS-Y-TECNOLOGIA'},
    {n:'Ingeniería en Diseño (vía Ingeniería Civil)',malla:'UAI-INGENIERIA-EN-DISENO'},
    {n:'Ingeniería en Diseño (vía Ingeniería Comercial)',malla:'UAI-INGENIERIA-EN-DISENO-VIA-COMERCIAL'},
    {n:'Ingeniería en Computer Science',malla:'UAI-INGENIERIA-EN-COMPUTER-SCIENCE'},
    {n:'Ingeniería Civil Industrial',malla:'UAI-INGENIERIA-CIVIL-INDUSTRIAL'},
    {n:'Ingeniería Civil Informática',malla:'UAI-INGENIERIA-CIVIL-INFORMATICA'},
    {n:'Ingeniería Civil en Bioingeniería',malla:'UAI-INGENIERIA-CIVIL-EN-BIOINGENIERIA'},
    {n:'Ingeniería Civil (Obras Civiles)',malla:'UAI-INGENIERIA-CIVIL-OBRAS-CIVILES'},
    {n:'Ingeniería Civil en Energía',malla:'UAI-INGENIERIA-CIVIL-EN-ENERGIA'},
    {n:'Ingeniería Civil Mecánica',malla:'UAI-INGENIERIA-CIVIL-MECANICA'},
    {n:'Ingeniería Civil en Minería',malla:'UAI-INGENIERIA-CIVIL-EN-MINERIA'},
    {n:'Bachillerato de Ingeniería Civil',malla:'UAI-BACHILLERATO-DE-INGENIERIA-CIVIL'}
  ],
  // Las carreras y bachilleratos que la UAndes lista en admision.uandes.cl/carreras
  // (revisada el 2026-10-03), con los nombres tal como salen ahí. Quedó fuera
  // "Derecho e Historia": su enlace lleva a una página de respaldo, no a la de
  // admisión. Todas menos Arquitectura, que no publica malla, la tienen en
  // mallas-uandes.js.
  //
  // Los cuatro códigos `-UA` vienen de CARRERAS_UANDES, que era la lista
  // anterior, y hay cuentas que ya los tienen guardados en S.carrera y en el
  // origen de sus ramos. Se conservan —y sus mallas usan ese código— para que
  // esas personas sigan viendo su carrera marcada y reciban su malla. La quinta, "Ingeniería Civil" (ING-UA), no calza con
  // ninguna carrera oficial —la UAndes admite por especialidad— y no se ofrece
  // más; quien la tenga la sigue viendo por su nombre en Ajustes.
  uandes:[
    {n:'Administración de Servicios',malla:'UA-ADMINISTRACION-DE-SERVICIOS'},
    {n:'Arquitectura'},
    {n:'Ciencia Política',malla:'UA-CIENCIA-POLITICA'},
    {n:'Derecho',malla:'DER-UA'},
    {n:'Derecho y Filosofía',malla:'UA-DERECHO-Y-FILOSOFIA'},
    {n:'Educación de Párvulos con menciones',malla:'UA-EDUCACION-DE-PARVULOS'},
    {n:'Enfermería',malla:'UA-ENFERMERIA'},
    {n:'Filosofía',malla:'UA-FILOSOFIA'},
    {n:'Historia',malla:'UA-HISTORIA'},
    {n:'Ingeniería Civil Eléctrica',malla:'UA-INGENIERIA-CIVIL-ELECTRICA'},
    {n:'Ingeniería Civil en Ciencias de la Computación',malla:'UA-INGENIERIA-CIVIL-EN-CIENCIAS-DE-LA-COMPUTACION'},
    {n:'Ingeniería Civil en Obras Civiles',malla:'UA-INGENIERIA-CIVIL-EN-OBRAS-CIVILES'},
    {n:'Ingeniería Civil Industrial',malla:'UA-INGENIERIA-CIVIL-INDUSTRIAL'},
    {n:'Ingeniería Civil Química',malla:'UA-INGENIERIA-CIVIL-QUIMICA'},
    {n:'Ingeniería Comercial',malla:'COM-UA'},
    {n:'International Business',malla:'UA-INTERNATIONAL-BUSINESS'},
    {n:'Kinesiología',malla:'UA-KINESIOLOGIA'},
    {n:'Marketing y Publicidad',malla:'UA-MARKETING-Y-PUBLICIDAD'},
    {n:'Medicina',malla:'MED-UA'},
    {n:'Odontología',malla:'UA-ODONTOLOGIA'},
    {n:'Pedagogía Básica con menciones',malla:'UA-PEDAGOGIA-BASICA'},
    {n:'Pedagogía Básica Bilingüe Inglés Español',malla:'UA-PEDAGOGIA-BASICA-BILINGUE'},
    {n:'Periodismo y Comunicación Estratégica',malla:'UA-PERIODISMO-Y-COMUNICACION-ESTRATEGICA'},
    {n:'Psicología',malla:'PSI-UA'},
    {n:'Sociología',malla:'UA-SOCIOLOGIA'},
    {n:'Terapia Ocupacional',malla:'UA-TERAPIA-OCUPACIONAL'},
    {n:'Bachillerato de Derecho',malla:'UA-BACHILLERATO-DE-DERECHO'},
    {n:'Bachillerato de Enfermería',malla:'UA-BACHILLERATO-DE-ENFERMERIA'},
    {n:'Bachillerato de Ingeniería Civil',malla:'UA-BACHILLERATO-DE-INGENIERIA-CIVIL'},
    {n:'Bachillerato de Ingeniería Comercial',malla:'UA-BACHILLERATO-DE-INGENIERIA-COMERCIAL'},
    {n:'Bachillerato de Medicina',malla:'UA-BACHILLERATO-DE-MEDICINA'},
    {n:'Bachillerato de Obstetricia y Puericultura',malla:'UA-BACHILLERATO-DE-OBSTETRICIA-Y-PUERICULTURA'},
    {n:'Bachillerato de Odontología',malla:'UA-BACHILLERATO-DE-ODONTOLOGIA'},
    {n:'Bachillerato de Psicología',malla:'UA-BACHILLERATO-DE-PSICOLOGIA'},
  ],
  // Las 32 carreras, 6 bachilleratos y el Plan Común que la UDD lista en
  // udd.cl/admision-pregrado/carreras (revisada el 2026-10-31), con los nombres
  // tal como salen ahí. Concepción no tiene carreras propias: las doce que
  // ofrece se llaman igual que en Santiago.
  //
  // Una opción por malla, no por nombre: Diseño y Tecnología Médica publican
  // una malla por mención o especialidad, y Enfermería una por sede. Las
  // demás que se dictan en las dos sedes publican una sola malla. Sin malla
  // quedan Medicina (currículo por anillos, sin ramos por semestre), el Plan
  // Común de Ingeniería y dos programas nuevos de 2027 que no la publican.
  udd:[
    {n:'Arquitectura',malla:'UDD-ARQUITECTURA'},
    {n:'Bachillerato en Derecho, Ciencias Sociales y Humanidades',malla:'UDD-BACHILLERATO-EN-DERECHO-CIENCIAS-SOCIALES-Y-HUMANIDADES'},
    {n:'Bachillerato en Diseño',malla:'UDD-BACHILLERATO-EN-DISENO'},
    {n:'Bachillerato en Enfermería',malla:'UDD-BACHILLERATO-EN-ENFERMERIA'},
    {n:'Bachillerato en Ingeniería Comercial',malla:'UDD-BACHILLERATO-EN-INGENIERIA-COMERCIAL'},
    {n:'Bachillerato en Medicina'},
    {n:'Bachillerato en Psicología',malla:'UDD-BACHILLERATO-EN-PSICOLOGIA'},
    {n:'Ciencia Política y Políticas Públicas',malla:'UDD-CIENCIA-POLITICA-Y-POLITICAS-PUBLICAS'},
    {n:'Cine y Comunicación Audiovisual',malla:'UDD-CINE-Y-COMUNICACION-AUDIOVISUAL'},
    {n:'Derecho',malla:'UDD-DERECHO'},
    {n:'Diseño (Gráfico)',malla:'UDD-DISENO-GRAFICO'},
    {n:'Diseño (Espacios y Objetos)',malla:'UDD-DISENO-ESPACIOS-Y-OBJETOS'},
    {n:'Diseño (Interacción Digital)',malla:'UDD-DISENO-INTERACCION-DIGITAL'},
    {n:'Diseño (Moda y Gestión)',malla:'UDD-DISENO-MODA-Y-GESTION'},
    {n:'Doble Grado Ingeniería Comercial + Derecho',malla:'UDD-DOBLE-GRADO-INGENIERIA-COMERCIAL-DERECHO'},
    {n:'Doble Título Ingeniería Comercial + Diseño'},
    {n:'Doble Título Ingeniería Comercial + Psicología',malla:'UDD-DOBLE-TITULO-INGENIERIA-COMERCIAL-PSICOLOGIA'},
    {n:'Enfermería (Santiago)',malla:'UDD-ENFERMERIA-SANTIAGO'},
    {n:'Enfermería (Concepción)',malla:'UDD-ENFERMERIA-CONCEPCION'},
    {n:'Geología',malla:'UDD-GEOLOGIA'},
    {n:'Global Business Administration',malla:'UDD-GLOBAL-BUSINESS-ADMINISTRATION'},
    {n:'Ingeniería Civil en BioMedicina',malla:'UDD-INGENIERIA-CIVIL-EN-BIOMEDICINA'},
    {n:'Ingeniería Civil en Informática e Innovación Tecnológica',malla:'UDD-INGENIERIA-CIVIL-EN-INFORMATICA-E-INNOVACION-TECNOLOGICA'},
    {n:'Ingeniería Civil en Informática e Inteligencia Artificial',malla:'UDD-INGENIERIA-CIVIL-EN-INFORMATICA-E-INTELIGENCIA-ARTIFICIAL'},
    {n:'Ingeniería Civil en Minería',malla:'UDD-INGENIERIA-CIVIL-EN-MINERIA'},
    {n:'Ingeniería Civil en Obras Civiles',malla:'UDD-INGENIERIA-CIVIL-EN-OBRAS-CIVILES'},
    {n:'Ingeniería Civil Industrial',malla:'UDD-INGENIERIA-CIVIL-INDUSTRIAL'},
    {n:'Ingeniería Civil Plan Común'},
    {n:'Ingeniería Comercial',malla:'UDD-INGENIERIA-COMERCIAL'},
    {n:'Kinesiología',malla:'UDD-KINESIOLOGIA'},
    {n:'Medicina'},
    {n:'Negocios y Ciencia de Datos',malla:'UDD-NEGOCIOS-Y-CIENCIA-DE-DATOS'},
    {n:'Nutrición y Dietética',malla:'UDD-NUTRICION-Y-DIETETICA'},
    {n:'Obstetricia',malla:'UDD-OBSTETRICIA'},
    {n:'Odontología',malla:'UDD-ODONTOLOGIA'},
    {n:'Pedagogía en Educación Básica con Menciones',malla:'UDD-PEDAGOGIA-EN-EDUCACION-BASICA'},
    {n:'Pedagogía en Educación de Párvulos',malla:'UDD-PEDAGOGIA-EN-EDUCACION-DE-PARVULOS'},
    {n:'Periodismo y Comunicación',malla:'UDD-PERIODISMO-Y-COMUNICACION'},
    {n:'Psicología',malla:'UDD-PSICOLOGIA'},
    {n:'Publicidad y Marketing',malla:'UDD-PUBLICIDAD-Y-MARKETING'},
    {n:'Química y Farmacia',malla:'UDD-QUIMICA-Y-FARMACIA'},
    {n:'Tecnología Médica (Bioanálisis Clínico, Hematología y Medicina Transfusional)',malla:'UDD-TECNOLOGIA-MEDICA-BIOANALISIS'},
    {n:'Tecnología Médica (Imagenología y Física Médica)',malla:'UDD-TECNOLOGIA-MEDICA-IMAGENOLOGIA'},
    {n:'Tecnología Médica (Morfofisiopatología y Citodiagnóstico)',malla:'UDD-TECNOLOGIA-MEDICA-MORFOFISIOPATOLOGIA'},
    {n:'Tecnología Médica (Oftalmología y Optometría)',malla:'UDD-TECNOLOGIA-MEDICA-OFTALMOLOGIA'},
    {n:'Terapia Ocupacional',malla:'UDD-TERAPIA-OCUPACIONAL'},
  ],
  fen:[
    {n:'Ingeniería Comercial',malla:'IC'},
    {n:'Ingeniería en Información y Control de Gestión',malla:'IICG'},
    {n:'Contador Auditor'},
  ],
  uc:[
    {n:'Ingeniería',malla:'ING-PC'},
    {n:'Actuación',malla:'UC-ACTUACION'},
    {n:'Administración Pública',malla:'UC-ADMINISTRACION-PUBLICA'},
    {n:'Agronomía',malla:'UC-AGRONOMIA'},
    {n:'Antropología',malla:'UC-ANTROPOLOGIA'},
    {n:'Arqueología',malla:'UC-ARQUEOLOGIA'},
    {n:'Arquitectura',malla:'UC-ARQUITECTURA'},
    {n:'Arte',malla:'UC-ARTE'},
    {n:'Astronomía',malla:'UC-ASTRONOMIA'},
    {n:'Bachillerato Inicia en Ciencias Naturales y Matemática',malla:'UC-BACHILLERATO-EN-CIENCIAS-NATURALES-Y-MATEMATICA'},
    {n:'Bachillerato Inicia en Ciencias Naturales y Matemática - Campus Villarrica',malla:'UC-BACHILLERATO-INICIA-EN-CIENCIAS-NATURALES-Y-MATEMATICA-CAMPUS-VILLARRICA'},
    {n:'Bachillerato Inicia en Ciencias Sociales',malla:'UC-BACHILLERATO-INICIA-EN-CIENCIAS-SOCIALES'},
    {n:'Bachillerato Inicia en Ciencias Sociales - Campus Villarrica',malla:'UC-BACHILLERATO-INICIA-EN-CIENCIAS-SOCIALES-CAMPUS-VILLARRICA'},
    {n:'Biología',malla:'UC-BIOLOGIA'},
    {n:'Biología Marina',malla:'UC-BIOLOGIA-MARINA'},
    {n:'Bioquímica',malla:'UC-BIOQUIMICA'},
    {n:'Ciencia Política',malla:'UC-CIENCIA-POLITICA'},
    {n:'College Artes y Humanidades',malla:'UC-COLLEGE-ARTES-Y-HUMANIDADES'},
    {n:'College Ciencias Naturales y Matemáticas',malla:'UC-COLLEGE-CIENCIAS-NATURALES-Y-MATEMATICAS'},
    {n:'College Ciencias Sociales',malla:'UC-COLLEGE-CIENCIAS-SOCIALES'},
    {n:'Construcción Civil',malla:'UC-CONSTRUCCION-CIVIL'},
    {n:'Derecho',malla:'UC-DERECHO'},
    {n:'Dirección Audiovisual',malla:'UC-DIRECCION-AUDIOVISUAL'},
    {n:'Diseño',malla:'UC-DISENO'},
    {n:'Enfermería',malla:'UC-ENFERMERIA'},
    {n:'Estadística',malla:'UC-ESTADISTICA'},
    {n:'Estética',malla:'UC-ESTETICA'},
    {n:'Filosofía',malla:'UC-FILOSOFIA'},
    {n:'Física',malla:'UC-FISICA'},
    {n:'Fonoaudiología',malla:'UC-FONOAUDIOLOGIA'},
    {n:'Geografía',malla:'UC-GEOGRAFIA'},
    {n:'Historia',malla:'UC-HISTORIA'},
    {n:'Ingeniería Comercial',malla:'COM'},
    {n:'Ingeniería en Recursos Naturales',malla:'UC-INGENIERIA-EN-RECURSOS-NATURALES'},
    {n:'Ingeniería Forestal',malla:'UC-INGENIERIA-FORESTAL'},
    {n:'Interpretación Musical',malla:'UC-INTERPRETACION-MUSICAL'},
    {n:'Kinesiología',malla:'UC-KINESIOLOGIA'},
    {n:'Letras Hispánicas',malla:'UC-LETRAS-HISPANICAS'},
    {n:'Letras Inglesas',malla:'UC-LETRAS-INGLESAS'},
    {n:'Licenciatura en Ingeniería en Ciencia de Datos',malla:'UC-LICENCIATURA-EN-INGENIERIA-EN-CIENCIA-DE-DATOS'},
    {n:'Licenciatura en Ingeniería en Ciencia de la Computación',malla:'UC-LICENCIATURA-EN-INGENIERIA-EN-CIENCIA-DE-LA-COMPUTACION'},
    {n:'Matemática',malla:'UC-MATEMATICA'},
    {n:'Medicina',malla:'UC-MEDICINA'},
    {n:'Medicina Veterinaria',malla:'UC-MEDICINA-VETERINARIA'},
    {n:'Música',malla:'UC-MUSICA'},
    {n:'Nutrición y Dietética',malla:'UC-NUTRICION-Y-DIETETICA'},
    {n:'Odontología',malla:'UC-ODONTOLOGIA'},
    {n:'Pedagogía en Educación Especial',malla:'UC-PEDAGOGIA-EN-EDUCACION-ESPECIAL'},
    {n:'Pedagogía en Educación Física y Salud para Educación Básica y Media',malla:'UC-PEDAGOGIA-EN-EDUCACION-FISICA-Y-SALUD-PARA-EDUCACION-BASICA-Y-MEDIA'},
    {n:'Pedagogía en Educación General Básica - Santiago',malla:'UC-PEDAGOGIA-GENERAL-BASICA-SANTIAGO'},
    {n:'Pedagogía en Educación Media',malla:'UC-PEDAGOGIA-EN-EDUCACION-MEDIA'},
    {n:'Pedagogía en Educación Media en Ciencias Naturales y Biología',malla:'UC-PEDAGOGIA-EN-EDUCACION-MEDIA-EN-CIENCIAS-NATURALES-Y-BIOLOGIA'},
    {n:'Pedagogía en Educación Media en Física',malla:'UC-PEDAGOGIA-MEDIA-EN-FISICA'},
    {n:'Pedagogía en Educación Media en Matemática',malla:'UC-PEDAGOGIA-MEDIA-EN-MATEMATICA'},
    {n:'Pedagogía en Educación Media en Química',malla:'UC-PEDAGOGIA-MEDIA-EN-QUIMICA'},
    {n:'Pedagogía en Educación Parvularia - Santiago',malla:'UC-PEDAGOGIA-EN-EDUCACION-PARVULARIA-SANTIAGO'},
    {n:'Pedagogía en Educación Parvularia - Villarrica',malla:'UC-PEDAGOGIA-EN-EDUCACION-PARVULARIA-VILLARRICA'},
    {n:'Pedagogía en Inglés para Educación Básica y Media',malla:'UC-PEDAGOGIA-EN-INGLES-PARA-EDUCACION-BASICA-Y-MEDIA'},
    {n:'Pedagogía en Religión Católica',malla:'UC-PEDAGOGIA-EN-RELIGION-CATOLICA'},
    {n:'Pedagogía General Básica - Campus Villarrica',malla:'UC-PEDAGOGIA-GENERAL-BASICA-CAMPUS-VILLARRICA'},
    {n:'Periodismo',malla:'UC-PERIODISMO'},
    {n:'Planificación Urbana',malla:'UC-PLANIFICACION-URBANA'},
    {n:'Programa de Pedagogía para Profesionales',malla:'UC-PROGRAMA-DE-PEDAGOGIA-PARA-PROFESIONALES'},
    {n:'Psicología',malla:'UC-PSICOLOGIA'},
    {n:'Publicidad',malla:'UC-PUBLICIDAD'},
    {n:'Química',malla:'UC-QUIMICA'},
    {n:'Química y Farmacia',malla:'UC-QUIMICA-Y-FARMACIA'},
    {n:'Sociología',malla:'UC-SOCIOLOGIA'},
    {n:'Teología',malla:'UC-TEOLOGIA'},
    {n:'Terapia Ocupacional',malla:'UC-TERAPIA-OCUPACIONAL'},
    {n:'Trabajo Social',malla:'UC-TRABAJO-SOCIAL'},
  ],
};

const CARRERAS_UC={'ING-PC':'Ingeniería · Plan Común','COM':'Ingeniería Comercial','OTRA':'Otra carrera'};
// Plan común de Ingeniería UC, currículum C2022. Los nombres y los créditos
// salen del catálogo oficial vía la API de mallas.ing.uc.cl (la herramienta de
// la propia Escuela), no de una imagen ni de memoria.
//
// QUÉ ENTRA Y QUÉ NO. Son los ramos que TODO estudiante de Ingeniería cursa,
// sin importar su major. Se obtuvieron intersectando los planes generados para
// seis majors distintos (Estructural, Computación, Construcción, Ambiental,
// Transporte y Geotécnica): lo que aparece en los seis es plan común, lo que
// difiere ya es del major.
//
// Del 4° semestre en adelante los majors divergen: EYP1113 y las tres Físicas
// con su laboratorio son lo único que sigue siendo de todos. Por eso la malla
// llega hasta ahí y no más — poner ramos de un major como si fueran de todos
// sería exactamente el tipo de dato plausible e inventado que no va.
//
// Los optativos (de ciencias, de exploración de majors) y los minors tampoco
// entran: son una elección, no un ramo. Mismo criterio que en FEN, donde los
// electivos se agregan a mano.
//
// Los laboratorios van con nombre propio aunque valgan 0 créditos: llevan nota
// y el estudiante los necesita en la app.
const MALLA_UC={
  'ING-PC':{
    1:['Cálculo I','Álgebra Lineal','Química para Ingeniería','Desafíos de la Ingeniería','Filosofía: ¿Para Qué?'],
    2:['Cálculo II','Dinámica','Laboratorio de Dinámica','Introducción a la Programación'],
    3:['Cálculo III','Ecuaciones Diferenciales','Termodinámica','Laboratorio de Termodinámica','Introducción a la Economía','Práctica I'],
    4:['Probabilidades y Estadística','Electricidad y Magnetismo','Laboratorio de Electricidad y Magnetismo'],
  },
  // Ing. Comercial UC, malla 2025 oficial (economiayadministracion.uc.cl,
  // assets/uploads/2025/07/malla-2025-1.pdf). Los ocho primeros semestres son
  // comunes: la mención —Economía o Administración— recién separa la malla en
  // IX y X, así que hasta 8° todos cursan lo mismo.
  //
  // La entrada anterior tenía un solo semestre y con errores: ponía Empresas y
  // Legislación y el curso Filosófico en 1°, cuando el oficial los tiene en 7° y
  // en 2°.
  //
  // Fuera quedan los que son una ELECCIÓN, no un ramo: los OPR (optativos de
  // profundización), los electivos en otra disciplina y el curso Teológico, que
  // es un área con muchos cursos posibles. El Filosófico sí entra con nombre
  // propio porque el plan fija FIL2001, no deja elegir.
  'COM':{
    1:['Cálculo I','Introducción a la Microeconomía','Contabilidad','Comportamiento Organizacional'],
    2:['Probabilidad y Estadística','Introducción al Álgebra Lineal','Cálculo II','Introducción a la Macroeconomía','Filosofía: ¿Para Qué?'],
    3:['Inferencia Estadística','Aplicaciones Matemáticas para Economía y Negocios','Análisis Económico: La Experiencia Chilena','Fundamentos de Finanzas'],
    4:['Econometría','Microeconomía I','Estrategia de la Organización','Fundamentos de Marketing'],
    5:['Introducción a la Programación','Microeconomía II','Macroeconomía I','Teoría Financiera'],
    6:['Estrategia Competitiva','Competencia y Mercado','Contabilidad de Costos','Ética, Economía y Empresa','Marketing Analytics'],
    7:['Empresas y Legislación','Macroeconomía II','Contabilidad Gerencial','Dirección de Personas'],
    8:['Práctica Social'],
  },
};
// Carreras UAI — sin mallas verificadas todavía, el estudiante arma sus ramos
const CARRERAS_UAI={'ING':'Ingeniería Civil','COM-UAI':'Ingeniería Comercial','DER-UAI':'Derecho','PSI':'Psicología','OTRA':'Otra carrera'};
const CARRERAS_UANDES={'ING-UA':'Ingeniería Civil','COM-UA':'Ingeniería Comercial','DER-UA':'Derecho','MED-UA':'Medicina','PSI-UA':'Psicología','OTRA':'Otra carrera'};

// Portal por universidad: recursos oficiales según el tenant del estudiante.
const PORTAL_UC=[
  {title:'Académico',links:[
    {label:'Canvas UC',desc:'Cursos, materiales y entregas',url:'https://cursos.canvas.uc.cl',color:'#e84646'},
    {label:'SIDING',desc:'Portal del estudiante de Ingeniería',url:'https://siding.uc.cl',color:'#16387e'},
    {label:'Buscacursos',desc:'Horarios, secciones y vacantes',url:'https://buscacursos.uc.cl',color:'#16a34a'},
  ]},
  {title:'Universidad',links:[
    {label:'Portal UC',desc:'Sitio oficial de la universidad',url:'https://www.uc.cl',color:'#16387e'},
    {label:'Mi Portal UC',desc:'Trámites y servicios estudiantiles',url:'https://portal.uc.cl',color:'#7c3aed'},
  ]},
  {title:'Recursos',links:[
    {label:'Bibliotecas UC',desc:'Libros, papers y bases de datos',url:'https://bibliotecas.uc.cl',color:'#d97706'},
    {label:'Correo UC',desc:'Casilla institucional',url:'https://correo.uc.cl',color:'#ea580c'},
    {label:'Bienestar Estudiantil',desc:'Apoyo, salud y acompañamiento',url:'https://desarrolloestudiantil.uc.cl',color:'#475569'},
  ]},
];

// PORTAL quedó sin uso al reemplazar la pestaña por la Agenda; se conserva por si
// se reintroduce como sección de recursos.
const PORTAL=[
  {title:'Académico',links:[
    {label:'Canvas',desc:'Plataforma de cursos y tareas',url:'https://uchile.instructure.com',color:'#e84646'},
    {label:'Docencia Web FEN',desc:'Portal académico de la facultad',url:'https://docencia.fen.uchile.cl',color:'#2563eb'},
    {label:'U-Campus',desc:'Inscripción de ramos, horarios y más',url:'https://ucampus.uchile.cl',color:'#16a34a'},
  ]},
  {title:'Facultad',links:[
    {label:'FEN UChile',desc:'Sitio oficial de la facultad',url:'https://fen.uchile.cl',color:'#0891b2'},
    {label:'Universidad de Chile',desc:'Portal oficial UChile',url:'https://uchile.cl',color:'#7c3aed'},
  ]},
  {title:'Recursos',links:[
    {label:'Biblioteca UChile',desc:'Acceso a libros, papers y recursos',url:'https://buscador.uchile.cl',color:'#d97706'},
    {label:'Correo UChile',desc:'Gmail institucional',url:'https://mail.uchile.cl',color:'#ea580c'},
    {label:'Mi Portal UChile',desc:'Servicios estudiantiles',url:'https://mi.uchile.cl',color:'#475569'},
  ]},
];
