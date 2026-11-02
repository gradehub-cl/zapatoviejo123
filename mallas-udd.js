// Mallas curriculares UDD, una por carrera. Se carga BAJO DEMANDA igual que
// mallas-uc.js, mallas-uai.js y mallas-uandes.js: solo le sirve a quien
// estudia en la Universidad del Desarrollo.
//
// Salen de los PDF que la UDD publica en udd.cl/mallas/, enlazados desde la
// página de cada carrera (revisados el 2026-10-31). Tienen texto: se leyeron
// por posición, una columna por semestre, y cada malla se comparó contra la
// imagen. Solo SUGIEREN los ramos del semestre: el estudiante confirma y edita.
//
// Mismo criterio que la UC, la UAI y la UAndes: fuera los casilleros que no
// nombran un curso —Electivo, Major, Minor, Mención, la especialización o el
// magíster a elegir, Créditos Extradisciplinares de Libre Elección, el
// Programa Complementario de Inglés— y los hitos que no son ramos (Examen de
// Grado o de Título, prácticas dibujadas como barra vertical, ramos que el
// documento marca como optativos).
//
// Lo que NO es transcripción literal, y por qué:
//   · "Comunicación Oral / Comunicación Escrita" y "Lectura Crítica /
//     Pensamiento Crítico" son dos asignaturas cada casillero: los programas
//     oficiales las publican por separado, con sigla propia y duración
//     bimestral (Lectura Crítica de Derecho es DDCP13). Van como dos ramos.
//   · "(Inglés)" avisa que el ramo se dicta en inglés y no es parte del nombre;
//     "(Verano)" en la pasantía de Negocios y Ciencia de Datos, tampoco. Los
//     asteriscos de nota al pie tampoco.
//   · Erratas corregidas: "Mécanica", "Estrcturas", "Fluídos", "Metalogénisis",
//     "Geothecnics", "Ingles Técnico", "Terapeúticas", "Ánalisis",
//     "Ciéntífico", "Comunicacion". Informática e IA dice "Taller de
//     Comunicación Electiva" donde las otras siete ingenierías dicen
//     "Efectiva": va como "Efectiva".
//   · Un casillero que abarca dos semestres (los Talleres de Arquitectura, el
//     Taller de Largometraje II de Cine) se sugiere al comienzo del bloque.
//
// Medicina no está: su malla es un currículo integrado por anillos de varios
// semestres, con temas y no ramos por semestre. Bachillerato en Medicina, el
// Doble Título Ingeniería Comercial + Diseño (nuevos 2027) e Ingeniería Civil
// Plan Común no publican malla. Fuentes, decisiones y SHA-256 de cada PDF:
// docs/mallas-udd.md.
var MALLAS_UDD_EXTRA={};

// ─── Arquitectura y Arte ─────────────────────────────────────────────────────
// Los Talleres 1–3 y las Experiencias Detonantes abarcan dos semestres: van al
// comienzo del bloque. Lab Interdisciplinario es optativo y los Electivos de
// Mención son a elegir. 10° y 11° siguen la vía Anteproyecto + Proyecto de
// Título; la otra vía es el magíster.
MALLAS_UDD_EXTRA['UDD-ARQUITECTURA']={
  1:['Taller 1: Formación, Representación y Espacio','Experiencia Detonante I: Contacto con el Territorio','Componentes de la Matemática','Composición Bidimensional','Comunicación Oral','Comunicación Escrita'],
  2:['Ciudad y Arquitectura Antigua y Clásica','Componentes de la Física','Composición Tridimensional','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller 2: Fundamentación, Lugar y Proyecto','Arquitectura Moderna Siglo XX','Componentes Estructurales y Materialidad','Medios Digitales I','Medios Digitales II'],
  4:['Teoría de la Ciudad Moderna y Contemporánea','Análisis Estructural','Sistemas Constructivos I','Geometría Digital','Semana i'],
  5:['Taller 3: Habitabilidad, Prototipado y Materialidad','Experiencia Detonante II: Contacto con la Materia','Arquitectura Contemporánea','Diseño y Gestión Urbana y Territorial','Sistemas Constructivos II','Metodología BIM','Práctica Materialidad y Proceso'],
  6:['Arquitectura Latinoamericana Contemporánea','Elementos de la Ciudad y el Paisaje','Diseño y Laboratorio Estructural: Sismoresistencia','Sustentabilidad'],
  7:['Taller 4: Territorio, Forma y Proyecto Urbano','Metodología de la Investigación','Ética y Normativa de Proyecto','Programación BIM'],
  8:['Taller 5: Entorno y Proyecto Integrado','Apreciación, Evaluación y Crítica Arquitectónica','Administración y Evaluación de Proyectos'],
  9:['Taller 6: Proyecto Complejo','Instalaciones en el Proyecto','Experiencia Detonante III: Contacto con la Profesión','Seminario de Investigación'],
  10:['Anteproyecto de Título','Estrategia Proyectual','Gestión y Legislación Aplicada'],
  11:['Proyecto de Título'],
};

// ─── Bachilleratos (vía de ingreso alternativa, un año) ──────────────────────
MALLAS_UDD_EXTRA['UDD-BACHILLERATO-EN-DERECHO-CIENCIAS-SOCIALES-Y-HUMANIDADES']={
  1:['Emprendimiento y Liderazgo','Teoría General del Derecho','Introducción a la Economía','Derecho Romano I','Comunicación Oral','Comunicación Escrita','Taller de Aprendizaje Estratégico','Taller de Comunicación No Verbal'],
  2:['Análisis de Actualidad','Debate y Argumentación','Fundamentos y Bases Constitucionales','Derecho Romano II','Responsabilidad Pública','Lectura Crítica','Pensamiento Crítico'],
};
MALLAS_UDD_EXTRA['UDD-BACHILLERATO-EN-DISENO']={
  1:['Fundamentos del Diseño','Representación','Dibujo Técnico','Tecnologías para Prototipar','Historia del Diseño','Comunicación Oral','Taller de Aprendizaje Estratégico','Taller de Comunicación No Verbal'],
  2:['Taller de Ideación y Creatividad','Observación y Pensamiento Sistémico','Representación Digital','Taller de Debate y Argumentación','Comunicación Escrita','Lectura Crítica','Responsabilidad Pública'],
};
// Viene en el mismo PDF que Enfermería Santiago (enfermeria_scl.pdf).
MALLAS_UDD_EXTRA['UDD-BACHILLERATO-EN-ENFERMERIA']={
  1:['Introducción a la Biología','Introducción a la Química','Anatomía Humana I','Bases Matemáticas','Cuidado Enfermería I y Primeros Auxilios','Programa Desarrollo y Profesional I'],
  2:['Ciencias Integradas','Química Aplicada','Anatomía II','Bases Teóricas de Enfermería y Bioética','Bases Estadísticas','Cuidado Enfermería II','Programa Desarrollo y Profesional II'],
};
MALLAS_UDD_EXTRA['UDD-BACHILLERATO-EN-INGENIERIA-COMERCIAL']={
  1:['Fundamentos de la Economía','Pensamiento Matemático','Principios Contables','Introducción al Management','Emprendimiento y Liderazgo','Taller de Aprendizaje Estratégico','Mi Primer Año','Comunicación Oral','Comunicación Escrita'],
  2:['Introducción a la Economía','Álgebra','Contabilidad I','Pensamiento y Actualidad Económica','Business Tech','Análisis de Actualidad','Lectura Crítica','Pensamiento Crítico'],
};
MALLAS_UDD_EXTRA['UDD-BACHILLERATO-EN-PSICOLOGIA']={
  1:['Introducción a la Psicología','Procesos Psicológicos I','Bases Neurofisiológicas del Comportamiento','Aprendizaje y Transformación I','Comunicación Oral','Comunicación Escrita','Taller de Aprendizaje Estratégico','Taller de Comunicación No Verbal'],
  2:['Antropología Filosófica','Procesos Psicológicos II','Bases Neurológicas','Aprendizaje y Transformación II','Sociedad Contemporánea','Taller de Debate y Argumentación','Taller de Computación'],
};

// ─── Gobierno ────────────────────────────────────────────────────────────────
// Acá Lectura Crítica va en 1° y Pensamiento Crítico en 2°, en casilleros
// separados: así lo dibuja el documento.
MALLAS_UDD_EXTRA['UDD-CIENCIA-POLITICA-Y-POLITICAS-PUBLICAS']={
  1:['Introducción a la Ciencia Política','Procesos, Instituciones y Política Comparada','Matemáticas I','Pre práctica I','Comunicación Oral','Comunicación Escrita','Lectura Crítica'],
  2:['Ética I','Microeconomía I','Sistema Político Chileno y Derecho Constitucional','Matemáticas II','Introducción a las Relaciones Internacionales','Pre práctica II','Pensamiento Crítico'],
  3:['Teoría Política I','Microeconomía II','Administración Pública','Estadísticas','Procesos Políticos y Sociales del Mundo Contemporáneo','Pre práctica III'],
  4:['Macroeconomía','Formación de la Ley y Asesoría Parlamentaria','Taller de Herramientas Estadísticas','Estructura y Dinámica de la Sociedad Internacional','Sistemas Electorales y Partidos Políticos','Semana i'],
  5:['Teoría Política II','Economía Política y Políticas Públicas','Métodos Cualitativos','Métodos Cuantitativos','Proyección de Asia en el Sistema Internacional','Comportamiento Electoral'],
  6:['Teoría Política III','Políticas Públicas I','Gobiernos Regionales y Locales','Evaluación de Programas Gubernamentales','Global Political Economy','Estrategias de Campaña y Marketing Político','Práctica profesional'],
  7:['Políticas Públicas II','Análisis de Política Exterior','Opinión Pública y Análisis de Stakeholders','Pre Seminario'],
  8:['Evaluación Social de Proyectos','Seminario'],
};

// ─── Comunicaciones ──────────────────────────────────────────────────────────
// Taller de Largometraje II ocupa 9° y 10°: va en 9°.
MALLAS_UDD_EXTRA['UDD-CINE-Y-COMUNICACION-AUDIOVISUAL']={
  1:['Taller de Ficción I','Lenguaje Audiovisual','Fotografía y Cámara','Sonido','Introducción a la Edición','Producción I','Fundamentos de la Dramaturgia','Comunicación Escrita','Comunicación Oral'],
  2:['Taller de Documental I','Montaje I','Movimientos Culturales y Artísticos','Cine y sus Orígenes','Producción II','Trabajo en equipos de rodaje','Guion I','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Ficción II','Taller Dirección de Arte I','Taller Dirección de Actores I','Montaje II','Historia de la Ficción','Guion II','Semana i'],
  4:['Taller de Documental II','Taller de Nuevos Medios y Plataformas Digitales','Dirección de Fotografía','Banda Sonora','Historia del Documental','Guion III','Introducción al Medio Audiovisual'],
  5:['Taller de Ficción III','Taller Dirección de Arte II','Taller Dirección de Actores II','Audiencias','Prepráctica'],
  6:['Taller de Documental III','Cinematography','Soundtrack Creation','Flujo de Video','Executive Production I','Desarrollo de Proyectos','Ética Profesional'],
  7:['Taller de Ficción IV','Montaje III','Contemporary Cinema','Guion IV','Metodología de la Investigación'],
  8:['Taller de Largometraje I','Cine Chileno y Latinoamericano','Executive Production II','Marketing','Seminario de Grado'],
  9:['Taller de Largometraje II'],
};
// La malla base (periodismo.pdf). Los Major, Minor Complementario, Minor en
// Comunicación Digital y Minor de Especialidad son casilleros sin curso
// nombrado. Las dobles titulaciones tienen su propio PDF y no están acá.
MALLAS_UDD_EXTRA['UDD-PERIODISMO-Y-COMUNICACION']={
  1:['Alfabetización Mediática 1','Tendencias en el Periodismo y la Comunicación','Redacción Periodística 1','Taller de Ortografía y Gramática 1','Fotoperiodismo','Mundo Contemporáneo','Comunicación Oral','Comunicación Escrita'],
  2:['Alfabetización Mediática 2','Redacción Periodística 2','Taller de Ortografía y Gramática 2','Taller de Lenguaje Audiovisual','Chile Contemporáneo','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Periodismo Informativo','Taller de Periodismo Radial','Actualidad Nacional e Instituciones','Comunicación Organizacional','Pensamiento Económico'],
  4:['Periodismo Audiovisual','Taller de Edición Digital','Lab de Innovación en Comunicaciones','Actualidad e Instituciones Económicas','Semana i'],
  5:['Teoría de la Comunicación','Estadística y Opinión Pública','Ética Profesional','Prepráctica 1'],
  6:['Métodos de Investigación en Comunicación','Taller de Análisis y Visualización de Datos','Prepráctica 2'],
  7:['Global View'],
  8:['Proyecto de Título','Práctica Profesional'],
};
// La malla base (publicidad.pdf). Los ramos de los tres minors (Ecosistema
// Digital, Marketing Experiencial, Creatividad e Innovación) son a elegir.
MALLAS_UDD_EXTRA['UDD-PUBLICIDAD-Y-MARKETING']={
  1:['Taller I','Lenguaje Audiovisual','Branding','Sociedad y Cultura','Comunicación Oral','Comunicación Escrita'],
  2:['Taller II','Taller de Creación Escrita','Dirección de Arte','Dinámicas de Marketing','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller III','Chile en la Actualidad','Herramientas Digitales','Investigación de Mercado'],
  4:['Taller IV','Teoría de la Comunicación','Ética Profesional','Planificación Estratégica de Marketing','Prepráctica','Semana i'],
  5:['Taller V','Storytelling','Global Business','Planificación de Medios'],
  6:['Taller VI','Creativity and Prototype Performance','Herramientas Financieras','Análisis de Datos'],
  7:['Seminario de Investigación','Innovation and Seed Capital','Evaluación de Resultados'],
  8:['Proyecto de Título'],
};

// ─── Derecho ─────────────────────────────────────────────────────────────────
// 10° son los seis Electivos de Especialización. Clínica Jurídica II ocupa 7° y
// 8°: va en 7°.
MALLAS_UDD_EXTRA['UDD-DERECHO']={
  1:['Derecho Romano','Teoría General del Derecho','Historia del Derecho','Fundamentos y Bases Constitucionales','Taller de Aprendizaje Estratégico','Comunicación Escrita','Comunicación Oral'],
  2:['Teoría de la Ley y Sujetos de Derecho','Derecho Procesal Orgánico','Derechos Fundamentales','Introducción a la Economía','Taller de Resolución de Casos','Lectura Crítica','Pensamiento Crítico'],
  3:['Ética I','Teoría del Acto Jurídico','Normas Comunes de Procedimiento','Acciones y Órganos Constitucionales','Regulación Económica'],
  4:['Ética II','Derechos Reales','Procedimientos Ordinarios','Derecho Administrativo I','Derecho Internacional Público','Taller de Herramientas Digitales e Inteligencia Artificial en Derecho','Semana i'],
  5:['Obligaciones','Procedimientos Ejecutivos','Derecho Administrativo II','Derecho del Trabajo I','Derecho Penal Parte General I'],
  6:['Contratos','Recursos Procesales','Derecho Ambiental','Derecho del Trabajo II','Derecho Penal Parte General II','Clínica Jurídica I'],
  7:['Responsabilidad Civil','Derecho Procesal Penal','Derecho Comercial I','Derecho Penal Parte Especial','Clínica Jurídica II','Taller de Análisis de Datos e Investigación Jurídica'],
  8:['Derecho de Familia','Derecho Comercial II','Derecho Tributario I','Destrezas de Litigación y Negociación','Inglés Jurídico I'],
  9:['Derecho Sucesorio','Derecho Tributario II','Seminario de Investigación','Taller de Habilidades Profesionales','Inglés Jurídico II','Seminario Aplicado Derecho Civil y Procesal'],
};

// ─── Diseño: una malla por mención ───────────────────────────────────────────
// diseno.pdf trae las cuatro; 1° y 2° son comunes. La Práctica Técnica y la
// Profesional son barras verticales entre semestres, y Taller de Título ocupa
// 9° y 10°: va en 9°. Los minors de 7° y 8° son a elegir.
MALLAS_UDD_EXTRA['UDD-DISENO-GRAFICO']={
  1:['Fundamentos del Diseño','Observación y Pensamiento Sistémico','Representación Visual','Tecnologías para Prototipar','Historia del Diseño','Pasaporte Diseño UDD','Comunicación Oral'],
  2:['Taller de Ideación y Creatividad','Fundamentos de Investigación','Representación Digital','Pensamiento Computacional y Programación','Diseño Contemporáneo','Lectura Crítica','Comunicación Escrita'],
  3:['Taller Gráfico I','Métodos de Investigación','Laboratorio de Tipografía','Exploración Gráfica','Innovación desde el Diseño'],
  4:['Taller Gráfico II','Investigación Cualitativa','Fundamentos del Diseño UX / UI','Fabricación Digital','Gestión de la Sostenibilidad en Diseño'],
  5:['Taller Gráfico III','Procesos de Producción y Ciclo de Vida','Proyectos Digitales','Administración y Gestión de Empresas'],
  6:['Taller IV Integrado','Data Driven Design','Diseño de Servicios','Gráfica en Movimiento','Mercado y Entorno','Semana i'],
  7:['Taller Gráfico V','Ética, Normativa y Transferencia','Dirección de Arte','Diseño de Información','Marketing'],
  8:['Taller Gráfico VI','Seminario de Investigación','Diseño Estratégico','Packaging','Design and Entrepreneurship'],
  9:['Taller de Título','Portafolio','Estrategia de Negocios'],
};
MALLAS_UDD_EXTRA['UDD-DISENO-ESPACIOS-Y-OBJETOS']={
  1:['Fundamentos del Diseño','Observación y Pensamiento Sistémico','Representación Visual','Tecnologías para Prototipar','Historia del Diseño','Pasaporte Diseño UDD','Comunicación Oral'],
  2:['Taller de Ideación y Creatividad','Fundamentos de Investigación','Representación Digital','Pensamiento Computacional y Programación','Diseño Contemporáneo','Lectura Crítica','Comunicación Escrita'],
  3:['Taller de Espacios y Objetos I','Métodos de Investigación','Procesos de Producción','Modelos Espaciales','Innovación desde el Diseño'],
  4:['Taller de Espacios y Objetos II','Investigación Cualitativa','Modelos Estructurales','Representación Tecnológica','Gestión de la Sostenibilidad en Diseño'],
  5:['Taller de Espacios y Objetos III','Acondicionamiento Ambiental','Diseño Paramétrico','Administración y Gestión de Empresas'],
  6:['Taller IV Integrado','Data Driven Design','Diseño Universal','Fabricación Digital','Mercado y Entorno','Semana i'],
  7:['Taller de Espacios y Objetos V','Ética, Normativa y Transferencia','Objetos Industriales','Tecnología de la Iluminación','Marketing'],
  8:['Taller de Espacios y Objetos VI','Seminario de Investigación','Objetos Sustentables','Proyectos de Iluminación','Design and Entrepreneurship'],
  9:['Taller de Título','Objetos Tecnológicos','Estrategia de Negocios'],
};
MALLAS_UDD_EXTRA['UDD-DISENO-INTERACCION-DIGITAL']={
  1:['Fundamentos del Diseño','Observación y Pensamiento Sistémico','Representación Visual','Tecnologías para Prototipar','Historia del Diseño','Pasaporte Diseño UDD','Comunicación Oral'],
  2:['Taller de Ideación y Creatividad','Fundamentos de Investigación','Representación Digital','Pensamiento Computacional y Programación','Diseño Contemporáneo','Lectura Crítica','Comunicación Escrita'],
  3:['Taller de Interacción Digital I','Métodos de Investigación','Narrativa','Programación Avanzada','Innovación desde el Diseño'],
  4:['Taller de Interacción Digital II','Investigación Cualitativa','Programación Creativa','Fabricación Digital','Gestión de la Sostenibilidad en Diseño'],
  5:['Taller de Interacción Digital III','Diseño de Interacción Física','Diseño de Interfaces y Productos Digitales','Administración y Gestión de Empresas'],
  6:['Taller IV Integrado','Data Driven Design','Diseño y Tecnologías Emergentes','Animación Digital','Mercado y Entorno','Semana i'],
  7:['Taller de Interacción Digital V','Ética, Normativa y Transferencia','Diseño de Tecnología Aplicada','Diseño de Videojuegos','Marketing'],
  8:['Taller de Interacción Digital VI','Seminario de Investigación','Diseño de Productos Inteligentes','Diseño de Realidades Extendidas','Design and Entrepreneurship'],
  9:['Taller de Título','Diseño de Experiencias Inmersivas','Estrategia de Negocios'],
};
MALLAS_UDD_EXTRA['UDD-DISENO-MODA-Y-GESTION']={
  1:['Fundamentos del Diseño','Observación y Pensamiento Sistémico','Representación Visual','Tecnologías para Prototipar','Historia del Diseño','Pasaporte Diseño UDD','Comunicación Oral'],
  2:['Taller de Ideación y Creatividad','Fundamentos de Investigación','Representación Digital','Pensamiento Computacional y Programación','Diseño Contemporáneo','Lectura Crítica','Comunicación Escrita'],
  3:['Taller de Moda y Gestión I','Métodos de Investigación','Procesos de Confección I','Ilustración de Moda','Innovación desde el Diseño'],
  4:['Taller de Moda y Gestión II','Investigación Cualitativa','Procesos de Confección II','Herramientas Digitales','Gestión de la Sostenibilidad en Diseño'],
  5:['Taller de Moda y Gestión III','Procesos de Confección III','Textiles Inteligentes','Administración y Gestión de Empresas'],
  6:['Taller IV Integrado','Data Driven Design','Joyería y Complementos','Fabricación Digital','Mercado y Entorno','Semana i'],
  7:['Taller de Moda y Gestión V','Ética, Normativa y Transferencia','Historia y Teoría de la Moda','Producción y Comunicación de Moda','Marketing'],
  8:['Taller de Moda y Gestión VI','Seminario de Investigación','Visual Merchandising y Comercialización','Portafolio','Design and Entrepreneurship'],
  9:['Taller de Título','Diseño de Autor','Estrategia de Negocios'],
};

// ─── Economía y Negocios ─────────────────────────────────────────────────────
// 7°–10° son la especialización o el magíster que cada uno elige: el
// documento no nombra asignaturas ahí.
MALLAS_UDD_EXTRA['UDD-INGENIERIA-COMERCIAL']={
  1:['Introducción a la Economía','Pensamiento y Actualidad Económica','Introducción al Management','Álgebra','Mi Primer Año UDD','Comunicación Oral','Comunicación Escrita'],
  2:['Macroeconomía','Business Tech','Contabilidad I','Cálculo','Lectura Crítica','Pensamiento Crítico'],
  3:['Microeconomía','Comportamiento Organizacional','Contabilidad II','Probabilidades e Inferencia','Desarrollo Profesional I'],
  4:['Derecho y Empresa','Ética de los Negocios','Marketing I','Herramientas para el Análisis de Datos','Emprender con Impacto','Métodos Estadísticos','Semana i'],
  5:['Competencia y Mercados','Organizaciones Ágiles','Business Innovation Technologies','Estrategia de Visualización de Datos','Finanzas'],
  6:['Estrategia','Marketing II','Proyecto de Análisis de Datos','Emprendimiento Innovador','Finanzas Corporativas','Desarrollo Profesional II'],
};
// 9° y 10° son el doble grado en una universidad extranjera.
MALLAS_UDD_EXTRA['UDD-GLOBAL-BUSINESS-ADMINISTRATION']={
  1:['Economics 101','Management 101','Desafíos Globales','Álgebra','Mi Primer Año','Comunicación Oral','Comunicación Escrita'],
  2:['Macroeconomics','Business Tech','Contabilidad I','Cálculo','Lectura Crítica','Pensamiento Crítico'],
  3:['Microeconomics','Organizational Behavior - Intercultural Teams','International Business','Contabilidad II','Probabilidades e Inferencia','Desarrollo Profesional I'],
  4:['Doing Business in Global Markets','Derecho y Empresa','Ética de los Negocios','Marketing I','Herramientas para el Análisis de Datos','Innovation Changemaker','Métodos Estadísticos','Semana i'],
  5:['Competitive Strategy and Industrial Organization','Agile Organizations','Business Innovation Technologies','Estrategia de Visualización de Datos','Finanzas'],
  6:['Global Business Strategy','Marketing II','Proyecto de Análisis de Datos','Entrepreneurship Innovation','Finanzas Corporativas','Desarrollo Profesional II'],
  7:['Práctica Profesional I'],
  8:['Capstone: Proyecto Aplicado','Práctica Profesional II','Inserción Laboral'],
};
MALLAS_UDD_EXTRA['UDD-NEGOCIOS-Y-CIENCIA-DE-DATOS']={
  1:['Introducción a la Programación','Fundamentos de Data Science','Introducción al Management','Matemática Avanzada','Mi Primer Año','Comunicación Oral','Comunicación Escrita'],
  2:['Herramientas Básicas de Data Analysis','Probabilidades e Inferencia','Introducción a la Economía','Business Tech','Lectura Crítica','Pensamiento Crítico'],
  3:['Visualización de Datos','Comportamiento Organizacional','Métodos estadísticos','Creatividad e Innovación','Contabilidad I','Desarrollo Profesional I'],
  4:['Bases de Datos','Macroeconomía','Emprender con Impacto','Marketing I','Contabilidad II','Pasantía','Semana i'],
  5:['Business Intelligence','Inteligencia Artificial','Organizaciones Ágiles','Derecho y Empresa','Microeconomía','Business Innovation Technologies','Finanzas'],
  6:['Big Data','Ética y Tecnología','Emprendimiento Innovador','Marketing II','Finanzas Corporativas','Desarrollo Profesional II'],
  7:['Productos de Datos','Estrategia','Competencia y Mercados','Práctica Profesional I'],
  8:['Datos e IA como Activos Estratégicos','Práctica Profesional II'],
  9:['Evaluación y Gestión de Proyectos','Proyecto Aplicado I'],
  10:['Inserción Laboral','Proyecto Aplicado II'],
};
// Nuevos 2027. Comercial + Derecho: Bases Constitucionales y los dos talleres
// cortos de 2° van juntos en el documento; Práctica Operativa es casillero
// propio en 4°. "Mi primer año / Taller Aprendizaje Estratégico" son dos ramos,
// como las demás parejas de la línea de habilidades.
MALLAS_UDD_EXTRA['UDD-DOBLE-GRADO-INGENIERIA-COMERCIAL-DERECHO']={
  1:['Teoría General del Derecho','Evolución de las Instituciones Jurídicas','Instituciones Políticas','Introducción al Management','Álgebra','Comunicación Oral','Comunicación Escrita','Mi primer año','Taller Aprendizaje Estratégico'],
  2:['Teoría de la Ley y Sujetos de Derecho','Bases Constitucionales','Taller de Resolución de Casos','Taller de Herramientas Digitales e IA en Derecho','Introducción a la Economía y Regulación Constitucional','Contabilidad I','Cálculo','Lectura Crítica','Pensamiento Crítico'],
  3:['Teoría del Acto Jurídico','Derecho Procesal Orgánico y Normas Comunes de Procedimiento','Derechos Fundamentales y Acciones Constitucionales','Comportamiento Organizacional','Contabilidad II','Herramientas para el Análisis de Datos'],
  4:['Derechos Reales','Procedimientos Ordinarios','Órganos Constitucionales','Macroeconomía','Business Tech','Probabilidades e Inferencia','Práctica Operativa','Semana i'],
  5:['Obligaciones','Procedimientos Ejecutivos y Especiales','Derecho Penal I','Microeconomía','Ética','Métodos Estadísticos'],
  6:['Contratos','Recursos Procesales','Derecho Penal II','Marketing I','Finanzas','Estrategia de Visualización de Datos'],
  7:['Responsabilidad Civil','Derecho Procesal Penal','Derecho Penal Económico','Marketing II','Competencia, Mercados y Regulación','Proyecto de Análisis de Datos'],
  8:['Instituciones Patrimoniales de Familia y Sucesión','Derecho Administrativo','Derecho del Trabajo y Gestión del Talento I','Emprendimiento Innovador','Finanzas Corporativas','Business Innovation Technologies','Desarrollo Profesional'],
  9:['Derecho Comercial I','Derecho Ambiental','Derecho del Trabajo y Gestión del Talento II','Estrategia','Práctica Profesional I: Clínica Jurídica'],
  10:['Derecho Comercial II','Derecho Tributario I','Derecho del Trabajo y Gestión del Talento III','Evaluación Legal y Gestión de Proyectos','Práctica Profesional II'],
  11:['Derecho Comercial III','Derecho Tributario II','Legal English','Capstone: Proyecto Aplicado'],
  12:['Seminario Aplicado Derecho Civil','Planificación y Sostenibilidad Tributaria','Seminario Integrado Derecho Procesal y Habilitación de Grado','Inserción Laboral'],
};
// Nuevo 2027. Los niveles de inglés van como ramos porque el documento los
// dibuja en su semestre; el Examen de Grado de 7° es un hito.
MALLAS_UDD_EXTRA['UDD-DOBLE-TITULO-INGENIERIA-COMERCIAL-PSICOLOGIA']={
  1:['Psicología Social','Psicología del Desarrollo en la Infancia','Procesos Psicológicos','Fundamentos Filosóficos de la Psicología','Introducción al Management','Álgebra','Comunicación Oral','Comunicación Escrita'],
  2:['Bases Neurológicas','Psicología del Desarrollo en la Adolescencia y Adultez','Investigación en Psicología','Taller de Proyecto Vocacional','Introducción a la Economía','Contabilidad I','Pensamiento Crítico','Lectura Crítica','Inglés A2-'],
  3:['Neurociencias','Psicología del Desarrollo en Personas Mayores','Bienestar y Salud','Taller de Habilidades Interpersonales','Métodos de Investigación','Comportamiento Organizacional','Cálculo','Business Tech','Inglés A2+'],
  4:['Teorías Cognitivo Conductuales','Personalidad','Psiquiatría Infantojuvenil','Macroeconomía','Contabilidad II','Probabilidades e Inferencia','Marketing I','Semana i'],
  5:['Teorías Sistémicas','Psicología Clínica','Psiquiatría en la Adultez','Dilemas Éticos','Microeconomía','Herramientas para el Análisis de Datos','Modelos Estadísticos','Inglés B1-'],
  6:['Diagnóstico Clínico','Técnicas Cualitativas','Aprendizaje y Transformación','Taller de Integración','Emprender con Impacto','Finanzas','Marketing II','Pasantía'],
  7:['Diagnóstico Neuropsicológico','Taller de Proyecto Profesional II','Taller de Conducción Grupal','Competencias y Mercados','Derecho y Empresa','Estrategia de Visualización de Datos','Emprendimiento Innovador','Inglés B1+'],
  8:['Taller de Consejería','Organizaciones Ágiles','Finanzas Corporativas','People Analytics','Estrategia','Business Innovation Technologies'],
  9:['Taller de Intervención en Crisis','Intervención Basada en la Evidencia','Diseño Organizacional','Gestión del Talento','Bienestar y Clima Organizacional','Legislación Laboral','Inglés B2-'],
  10:['Práctica Profesional (Clínica)','Seminario de Habilitación Profesional'],
  11:['Evaluación y Gestión de Proyectos','Gestión del Cambio','Business Consulting','Práctica Profesional I','Inglés B2+'],
  12:['Capstone: Proyecto Aplicado','Inserción Laboral','Práctica Profesional II'],
};

// ─── Educación ───────────────────────────────────────────────────────────────
// Desde 6° van los ramos de las dos menciones (Inglés; Educación Especial e
// Inclusión): el estudiante desmarca los de la otra. El Programa de Formación
// Pedagógica en Educación Especial es un semestre adicional (doble título).
MALLAS_UDD_EXTRA['UDD-PEDAGOGIA-EN-EDUCACION-BASICA']={
  1:['Desarrollo Psicológico, Emocional y Aprendizaje','Literatura Infantil y Juvenil','Enseñanza de los Números y Operatoria I','English Phonetics','English Language Learning I','Leer, Pensar y Escribir'],
  2:['Práctica en Terreno I','Enseñar con Materiales Curriculares','Aprendizajes Fundamentales para la Enseñanza de la Lengua','English Grammar','English Language Learning II','Comunicación Oral','Pensamiento Crítico'],
  3:['Práctica en Terreno II','Evaluar para el Aprendizaje','Enseñanza de la Lectura y Escritura Inicial','Enseñanza de los Números y Operatoria II','Enseñanza de los Seres Vivos y el Medio','English Language Learning III'],
  4:['Psicología, Neurociencia y Aprendizaje','Equidad e Inclusión en el Aula','Fundamentos Filosóficos de la Educación','Enseñanza de la Comunicación Oral','Enseñanza de los Números y Operatoria III','Enseñanza de la Historia y Ciudadanía I','English Language Learning IV','Semana i'],
  5:['Práctica en Terreno III','Promoviendo la Participación Efectiva en el Aula','Enseñanza de la Lectura','Enseñanza de la Historia y Ciudadanía II','Enseñanza de las Ciencias de la Tierra','English Language Learning V'],
  6:['Práctica en Terreno IV','Jefatura de Curso y Trabajo con Familias','Desarrollo del Pensamiento a través del Currículum Escolar','Enseñanza de la Escritura','Enseñanza del Álgebra, Datos y Azar','Teaching English to Young Learners','Divergencias: Enfoque y Normativas'],
  7:['Práctica en Terreno V','Habilidades de Investigación','Enseñanza de la Geometría y Medición','Enseñanza de las Ciencias Físicas y Químicas','Methods and Approaches in ELT','Diversificación para el Aprendizaje'],
  8:['Investigación para Aprender','Taller de Fortalecimiento Docente I','Políticas Educativas y su Impacto en la Escuela','Enseñanza de la Geografía y Ciencias Sociales','Artes Creativas','Teaching, Reading and Writing','Evaluación Inclusiva'],
  9:['Práctica Profesional I','Ética Profesional','English Across the Curriculum','Bienestar y Desarrollo Socioemocional en un Ambiente Inclusivo'],
  10:['Práctica Profesional II','Taller de Fortalecimiento Docente II','C1 Preparation','Construcción de una Comunidad Inclusiva'],
};
// Desde 6° van los ramos de las tres menciones (parvulos_M1/M2/M3.pdf: Aire
// Libre, Inglés, Educación Especial e Inclusión), uno por semestre cada una.
MALLAS_UDD_EXTRA['UDD-PEDAGOGIA-EN-EDUCACION-DE-PARVULOS']={
  1:['Enseñar con Instrumentos Curriculares','Psicología del Desarrollo y Aprendizaje','Construcción del Pensamiento Lógico Matemático','Literatura Infantil','English Language Learning I','Leer, Pensar y Escribir'],
  2:['Práctica en Terreno I','Desarrollo de Pensamiento a través del Currículum','El Juego en la Educación Parvularia','Ambientes e Interacciones para el Aprendizaje','Enseñanza de la Apreciación y Expresión Corporal','English Language Learning II','Fundamentos Filosóficos y Antropológicos de la Educación','Comunicación Oral','Pensamiento Crítico'],
  3:['Práctica en Terreno II','Evaluar para el Aprendizaje','Enseñanza de la Matemática Temprana I','Desarrollo y Enseñanza del Lenguaje Oral','English Language Learning III','Ética profesional'],
  4:['Modelos Curriculares en Educación Parvularia','Desarrollo Socioemocional y Aprendizaje','Salud y Bienestar del Niño y de la Niña','Enseñanza de la Apreciación y Expresión Musical','Desarrollo del Pensamiento Científico','English Phonetics','Semana i'],
  5:['Práctica en Terreno III','Inclusión y Diversidad en Educación Parvularia','Desarrollo de Identidad, Autonomía y Convivencia','Desarrollo Corporal y Movimiento','Enseñanza de la Exploración del Entorno Natural','English Grammar'],
  6:['Práctica en Terreno IV','Análisis de Datos y Evidencias para el Aprendizaje','Enseñanza de la Matemática Temprana II','Enseñanza del Lenguaje Escrito','Enseñanza de la Apreciación y Expresión Artística Visual','Enseñanza de la Comprensión del Entorno Sociocultural','Aprendizaje al Aire Libre, Fundamento de un Desarrollo Sustentable','Teaching English to Young Learners','Divergencias: Enfoque y Normativas'],
  7:['Práctica en Terreno V','Experiencias Integrales de Enseñanza Aprendizaje','Formación Ciudadana y Enfoque de Derechos en la Primera Infancia','Desarrollo de Habilidades de Investigación','Enseñanza Integrada del Lenguaje Verbal','Estrategias de Enseñanza al Aire Libre','Play and Learn','Diversificación para el Aprendizaje'],
  8:['Práctica en Terreno VI','Familia, Comunidad y Educación','Liderazgo y Gestión Pedagógica del Aula','Seminario de Investigación','Taller de Fortalecimiento Docente I','Políticas Educativas en Educación Parvularia','Conformación de Espacios Pedagógicos al Aire Libre','Literacy in Early Language Learning','Evaluación Inclusiva'],
  9:['Práctica Profesional I','Enseñanza Experiencial de las Ciencias al Aire Libre','English Across the Curriculum','Bienestar y Desarrollo Socioemocional en un Ambiente Inclusivo'],
  10:['Práctica Profesional II','Taller de Fortalecimiento Docente II','Oportunidades de Aprendizaje en el Propio Entorno','English Certification Preparation','Construcción de una Comunidad Inclusiva'],
};

// ─── Ingeniería ──────────────────────────────────────────────────────────────
// Sin la especialización a elegir de 9° y 10°, ni las páginas 2 y 3 del PDF
// (Programa Ingeniería con la Empresa y la doble titulación con Informática).
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-INDUSTRIAL']={
  1:['Introducción al Cálculo','Álgebra','Desafíos de la Ingeniería Industrial','Taller de Exploración Tecnológica y Prototipado','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Cálculo Diferencial','Geometría','Taller de Innovación y Diseño','Gestión de Empresas','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Química','Cálculo Integral','Álgebra Lineal','Taller de Programación','Gestión de Procesos','Taller de Habilidades Socioemocionales'],
  4:['Física','Cálculo Multivariable','Probabilidades y Estadística','Bases de Datos','Capstone de Ciencias, Tecnología y Diseño','Semana i'],
  5:['Mecánica','Ecuaciones Diferenciales','Taller de Visualización de la Información','Contabilidad y Costos','Optimización','Gestión de Proyectos'],
  6:['Termodinámica','Análisis de Datos','Economía','Tópicos de Optimización','Research Seminar','Taller de Liderazgo'],
  7:['Mecánica de Fluidos','Business Intelligence','Finanzas','Taller de Métodos de Innovación Ágiles','Gestión de Operaciones','Simulación y Decisiones bajo Incertidumbre'],
  8:['Ingeniería y Sostenibilidad','Digital Transformation','Evaluación Económica de Proyectos','Gestión de la Cadena de Suministros','Taller de Evaluación Técnica de Proyectos','Capstone Analytics','Taller de Comunicación Efectiva'],
  9:['Dirección de Personas','Strategic Management','Gestión de Servicios'],
  10:['Habilidades Directivas y Toma de Decisiones','Strategic Marketing','Ética Profesional','Capstone Consultoría','Taller de Empleabilidad'],
};
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-EN-OBRAS-CIVILES']={
  1:['Taller de Edificación','Desafío de Ingeniería Estructural','Álgebra','Introducción al Cálculo','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Taller de Dibujo','Taller de Análisis de Datos para la Ingeniería Estructural','Geometría','Cálculo Diferencial','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Topografía','Construcción Sustentable','Estática','Física','Cálculo Integral','Herramientas Tecnológicas para la Vida Universitaria'],
  4:['Taller de Gestión de la Construcción','Análisis del Impacto Ambiental','Mecánica de Sólidos','Álgebra Lineal','Cálculo Multivariable','Semana i'],
  5:['Taller de Materiales de Ingeniería','Dirección de Proyectos','Análisis Estructural','Probabilidades y Estadística','Ecuaciones Diferenciales','Camino al Egreso'],
  6:['Concrete Technology','Planificación y Control de Proyectos','Herramientas Computacionales para el Costeo de Proyectos','Herramientas Computacionales para la Ingeniería Estructural','Diseño Estructural','Análisis de Datos'],
  7:['Taller de Tecnologías de Información en Construcción','Análisis y Estimación de Costos','Dirección de Obras de Construcción','Structural Dynamics','Geotechnics','Mecánica de Fluidos','Taller de Liderazgo'],
  8:['Taller de BIM para la Toma de Decisiones','Gestión Financiera de Proyectos','Seminario de Investigación','Hormigón Armado','Mecánica de Suelos','Hidráulica'],
  9:['Taller de Resolución de Problemas en Ingeniería','Construcción de Obras Civiles e Industriales','Taller de Diseño de Estructuras de Hormigón','Taller de Empleabilidad'],
  10:['Taller de Estudio de Propuestas','Ética Profesional'],
};
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-EN-MINERIA']={
  1:['Introducción a la Minería','Procesos Geológicos','Álgebra','Introducción al Cálculo','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Taller de Fundamentos del Negocio Minero','Mineralogía y Petrografía','Química','Cálculo Diferencial','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Geología y Yacimientos','Física','Geometría','Cálculo Integral'],
  4:['Dominios Estructurales en Minería','Álgebra Lineal','Probabilidades y Estadística','Mecánica','Taller de Habilidades Socioemocionales','Semana i'],
  5:['Ingeniería de Costos','Ecuaciones Diferenciales','Cálculo Multivariable','Mecánica de Rocas','Taller de Programación','Taller de Liderazgo'],
  6:['Taller de Diseño Minería a Cielo Abierto','Taller de Diseño Minería Subterránea','Information Technologies in Mining','Análisis de Datos','Mecánica de Fluidos'],
  7:['Planificación y Control de Proyectos','Taller de Evaluación de Recursos','Procesamiento de Minerales','Automatización Minera','Optimización','Electrotecnia','Taller de Comunicación Efectiva'],
  8:['Evaluación de Proyectos Mineros','Taller de Perforación y Tronadura','Fundamentos de Geometalurgia','Manejo de Materiales','Simulación y Decisiones Bajo Incertidumbre','Termodinámica'],
  9:['Legislación Minera y Ambiental','Taller de Planificación Minería a Cielo Abierto','Taller de Planificación Minería Subterránea','Information Systems in Mining'],
  10:['Gestión Empresarial en Minería','Gestión Ambiental y Relaciones Comunitarias','Work Ethics','Taller de Proyecto Minero','Taller de Empleabilidad'],
};
// Desde 5° los semestres tienen dos columnas de casilleros. Fuera los
// Electivos y el Programa Ingeniería con la Empresa (Desafío Empresa I–II,
// Trabajo en Empresa I–IV), que es una de las vías de titulación.
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-EN-INFORMATICA-E-INNOVACION-TECNOLOGICA']={
  1:['Taller de Programación','Desafíos de la Ingeniería Informática','Introducción al Cálculo','Álgebra','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Taller de Obtención y Preparación de Datos','BootCamp Lenguajes de Programación','Cálculo Diferencial','Geometría','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Estructuras de Datos y Algoritmos','Taller de Diseño de Servicios y Prototipado','Cálculo Integral','Álgebra Lineal','Física'],
  4:['Base de Datos','Taller de Visualización de Datos','Cálculo Multivariable','Ecuaciones Diferenciales','Probabilidades y Estadística','Taller de Habilidades Socioemocionales','Semana i'],
  5:['Ingeniería de Software','Ética en Informática','Análisis de Datos e Inferencia Estadística','Advanced Databases Workshop','Métodos Numéricos','Taller de Métodos de Innovación Ágiles','Optimización Aplicada a Negocios','Taller de Experiencia del Usuario UX/UI','Certificación de Fundamentos de la Nube','Software Development Certification I','Taller de Comunicación Efectiva'],
  6:['Arquitectura de Sistemas','Tecnologías y Aplicaciones Web y Móviles','Redes de Computadores','Business Intelligence','Software Development Certification II'],
  7:['Taller de Ciencia de Redes','Computación Paralela y Distribuida','Artificial Intelligence Workshop','Formulación y Evaluación de Proyectos','Big Data Certification'],
  8:['Seguridad y Protección de Datos','Tecnologías Emergentes','Deep Learning Workshop','Innovación y Emprendimiento Tecnológico','Advanced Certification I','Taller de Liderazgo'],
  9:['Big Data Engineering','Gestión de Proyectos Informáticos','Advanced Certification II','Taller de Empleabilidad'],
  10:['Proyecto de Título','Digital Transformation Workshop'],
};
// Mismo diseño que Informática e Innovación: dos columnas desde 5°, y fuera
// los Electivos y el Programa Ingeniería con la Empresa.
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-EN-INFORMATICA-E-INTELIGENCIA-ARTIFICIAL']={
  1:['Desafíos de la Inteligencia Artificial','Taller de Programación','Introducción al Cálculo','Álgebra','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Taller de Obtención y Preparación de Datos','Bootcamp de Lenguajes de Programación','Cálculo Diferencial','Geometría','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Taller de Estructuras de Datos y Algoritmos','Taller de Diseño de Servicios y Prototipado','Cálculo Integral','Álgebra Lineal','Física'],
  4:['Bases de Datos','Taller de Visualización de Datos','Cálculo Multivariable','Ecuaciones Diferenciales','Probabilidades y Estadística','Taller de Habilidades Socioemocionales','Semana i'],
  5:['Análisis de Datos e Inferencia Estadística','Computación Paralela y Distribuida','Métodos Numéricos','Inteligencia Artificial para los Negocios','Business Intelligence','Artificial Intelligence Workshop','Optimización Aplicada a Negocios','Innovación y Emprendimiento Tecnológico','Certificación de Fundamentos de la Nube','Certificación Fundamentos de IA'],
  6:['Taller de Ciencia de Redes','Representación del Conocimiento','Introducción al Machine Learning','Formulación y Evaluación de Proyectos','AI Engineering Certification I','Taller de Comunicación Efectiva'],
  7:['Big Data Engineering','Ética en Informática','Seguridad y Protección de Datos','Machine Learning Avanzado','Gestión de Proyectos Informáticos','AI Engineering Certification II','Taller de Liderazgo'],
  8:['Introducción al Procesamiento de Lenguaje Natural','Inteligencia Artificial Generativa','Deep Learning Workshop','Productos y Servicio de IA','Big Data Certification'],
  9:['Procesamiento de Lenguaje Natural Avanzado','Robótica','Visión Computacional','Designing and Implementing Cloud AI Solution Certification','Taller de Empleabilidad'],
  10:['Proyecto de Título','Regulación y Gobernanza en IA','Machine Learning para Big Data'],
};
// Ingeniería en Campo Clínico / Empresa se repite de 7° a 10° con el mismo
// nombre: así está en el documento. Los Electivos 1–4 quedan fuera.
MALLAS_UDD_EXTRA['UDD-INGENIERIA-CIVIL-EN-BIOMEDICINA']={
  1:['Matemática Aplicada I','Química General','BIOS: Biología Celular, Biología Molecular y Bioquímica','Introducción a la Ingeniería en BioMedicina','Lab de Exploración Tecnológica','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Matemática Aplicada II','Química Aplicada','Anatomía Humana Funcional','Taller de Práctica Médica','Taller de Programación','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Matemática Aplicada III','Fundamentos de Física I: Mecánica','Fisiología y Fisiopatología','Taller de Diseño y Prototipado en Salud','Preparación y Visualización de Datos Biomédicos'],
  4:['Matemática Aplicada IV','Fundamentos de Física II: Electromagnetismo','Health Systems','Taller de Investigación y Desarrollo','Electrónica Biomédica','Taller de Habilidades Socioemocionales','Semana i'],
  5:['Física Médica I','Health Strategy & Management','Probabilidad y Estadística','Lab de Diseño y Desarrollo de Dispositivos Biomédicos','Biomaterials','Taller de Comunicación Efectiva'],
  6:['Física Médica II','Taller de Evaluación de Proyectos','Optimización e Investigación de Operaciones','Bioinformatics','Instrumentación Biomédica'],
  7:['Bioética y Legislación Biomédica','Taller de Gestión de Operaciones y Logística en Salud','Inteligencia Artificial I','Health Informatics','Biomecánica','Ingeniería en Campo Clínico / Empresa'],
  8:['Business Intelligence Workshop','Inteligencia Artificial II','Lab de Bioseñales','Ingeniería en Campo Clínico / Empresa','Taller de Liderazgo'],
  9:['Project Management','Procesamiento de Imágenes','Lab de Emprendimiento e Innovación en Salud','Ingeniería en Campo Clínico / Empresa','Taller de Empleabilidad'],
  10:['Taller X: Integración (Capstone Titulación)','Ingeniería en Campo Clínico / Empresa'],
};
MALLAS_UDD_EXTRA['UDD-GEOLOGIA']={
  1:['Geología General','Paleontología','Álgebra','Introducción al Cálculo','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Geomorfología','Mineralogía y Petrografía','Geometría','Cálculo Diferencial','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Sistema de Información Geográfica','Representaciones Geológicas en el Espacio','Fundamentos de Geofísica','Fundamentos de Geoquímica','Cálculo Integral'],
  4:['Geología Estructural','Herramientas para el Levantamiento Geológico','Petrología Sedimentaria y Estratigrafía','Geoquímica','Probabilidades y Estadística','Taller de Habilidades Socioemocionales','Semana i'],
  5:['Mineralogía Óptica','Petrología Metamórfica','Petrología Ígnea','Geofísica Aplicada','Ecuaciones Diferenciales','Taller de Liderazgo'],
  6:['Microscopía de Menas','Geología de Campo I','Geología Andina','Depósitos Minerales'],
  7:['Geología de Campo II','Geoestadística','Metalogénesis','Hidrogeología','Taller de Comunicación Efectiva'],
  8:['Proyectos de Exploración','Geometalurgia','Geología de Minas','Geotechnics'],
  9:['Proyecto de Título I','Environmental Geology'],
  10:['Proyecto de Título II','Geoethics','Taller de Empleabilidad'],
};

// ─── Psicología ──────────────────────────────────────────────────────────────
// Fuera los Electivos I–V, los Cursos de Especialización I–IV y los exámenes
// de grado y título.
MALLAS_UDD_EXTRA['UDD-PSICOLOGIA']={
  1:['Psicología Social','Procesos Psicológicos','Psicología del Desarrollo en la Infancia','Fundamentos Filosóficos de la Psicología','Taller de Proyecto Profesional I','Herramientas Tecnológicas','Comunicación Escrita','Comunicación Oral'],
  2:['Mente Relacional','Bases Neurológicas','Psicología del Desarrollo en la Adolescencia y Adultez','Investigación en Psicología','Psicología y Tecnología','Lectura Crítica','Pensamiento Crítico'],
  3:['Teorías Psicodinámicas','Neurociencias','Psicología del Desarrollo en Personas Mayores','Métodos de Investigación','Taller de Habilidades Interpersonales','Bienestar y Salud'],
  4:['Teorías Cognitivo Conductuales','Aprendizaje y Transformación','Psiquiatría Infantojuvenil','Taller de Integración','Personalidad','Semana i'],
  5:['Teorías Sistémicas','Psiquiatría en la Adultez','Técnicas Cuantitativas','Taller de Conducción Grupal','Psicología Clínica'],
  6:['Técnicas Cualitativas','Taller de Intervención en Crisis','Taller de Consejería','Psicología Educacional','Psicología Organizacional','Diagnóstico Clínico'],
  7:['Problemáticas Psicosociales','Integración en Investigación','Taller de Proyecto Profesional II','Psicología de la Salud','Diagnóstico Neuropsicológico'],
  8:['Emprendimiento e Innovación','Dilemas Éticos','Prepráctica I'],
  9:['Intervención basada en la Evidencia','Prepráctica II'],
  10:['Seminario de Habilitación Profesional','Práctica Profesional'],
};

// ─── Salud (Medicina Clínica Alemana y Ciencias de la Salud) ─────────────────
// Santiago y Concepción publican mallas distintas: en Concepción Lectura y
// Pensamiento Crítico van en 2°; en Santiago, en 4°. Los Fundamentos de la
// Fisiología y de la Bioquímica de 3° (Santiago) son solo para quien entra por
// el Bachillerato, y los "Lab / Optativos" de 10° son a elegir.
MALLAS_UDD_EXTRA['UDD-ENFERMERIA-SANTIAGO']={
  1:['Morfología','Bases Matemáticas y Estadísticas','Bases Teóricas de Enfermería y Bioética','Comunicación Oral','Comunicación Escrita'],
  2:['Bases Químicas','Bases Biológicas','Bases del Cuidado de Enfermería'],
  3:['Salud Pública y Epidemiología','Fisiología Básica','Microbiología','Bioquímica','Enfermería Familiar y de la Comunidad'],
  4:['Farmacología Clínica','Fisiopatología','Psicología de la Salud','Inglés Técnico','Cuidados de Enfermería Clínico','Lectura Crítica','Pensamiento Crítico','Semana i'],
  5:['Enfermería Psicosocial','Enfermería de la Mujer y el Recién Nacido','Educación para la Salud','Cuidados de Enfermería del Adulto I'],
  6:['Enfermería en Psiquiatría','Fundamentos Socio Antropológicos de la Salud','Cuidados de Enfermería de Adulto II','Physical Exam'],
  7:['Enfermería en Urgencia','Enfermería en Salud Comunitaria','Investigación Cualitativa y Cuantitativa'],
  8:['Gestión en Enfermería','Enfermería Gerontogeriátrica','Enfermería del Niño y del Adolescente','Diseño de Proyecto de Investigación'],
  9:['Internado Comunitario','Investigación Aplicada en Salud'],
  10:['Internado Hospitalario'],
};
MALLAS_UDD_EXTRA['UDD-ENFERMERIA-CONCEPCION']={
  1:['Morfología','Bases Matemáticas y Estadísticas','Bases Teóricas de Enfermería y Bioética','Comunicación Oral','Comunicación Escrita'],
  2:['Bases Químicas','Bases Biológicas','Bases del Cuidado de Enfermería','Lectura Crítica','Pensamiento Crítico'],
  3:['Salud Pública y Epidemiología','Fisiología Básica','Microbiología','Bioquímica','Enfermería Familiar y de la Comunidad'],
  4:['Farmacología Clínica','Fisiopatología','Psicología de la Salud','Inglés Técnico','Cuidados de Enfermería Clínico','Semana i'],
  5:['Enfermería Psicosocial','Enfermería de la Mujer y el Recién Nacido','Educación para la Salud','Cuidados de Enfermería del Adulto I'],
  6:['Enfermería en Psiquiatría','Fundamentos Socio Antropológicos de la Salud','Cuidados de Enfermería de Adulto II','Physical Exam'],
  7:['Enfermería en Urgencia','Enfermería en Salud Comunitaria','Investigación Cualitativa y Cuantitativa'],
  8:['Gestión en Enfermería','Enfermería Gerontogeriátrica','Enfermería del Niño y del Adolescente','Diseño de Proyecto de Investigación'],
  9:['Internado Comunitario','Investigación Aplicada en Salud'],
  10:['Internado Hospitalario'],
};
// Santiago y Concepción publican la misma malla. Fuera los Electivos I–II.
MALLAS_UDD_EXTRA['UDD-KINESIOLOGIA']={
  1:['Morfología','Biofísica','Práctica Kinésica Básica','Actividad Física y Deporte','Comunicación Oral','Comunicación Escrita'],
  2:['Bases Biológicas','Biofísica Aplicada al Movimiento','Bases Químicas de la Vida','Anatomía Funcional','Lectura Crítica','Pensamiento Crítico'],
  3:['Fisiología Básica','Biomecánica y Fisiología Articular','Psicología y Atención Integral del Paciente','Salud Pública'],
  4:['Semiología Kinésica','Análisis Biomecánico del Movimiento','Ética','Neurociencias','Semana i'],
  5:['Fisiología del Movimiento','Evaluación Kinésica','Neurología Niños y Adultos','Metodología de la Investigación','Función y Disfunción de Sistemas'],
  6:['Fisiología Clínica del Movimiento','Intervención Musculoesquelética y del Envejecimiento','Inglés Técnico','Metodología de la Investigación y Bioestadística','Terapia por Agentes Físicos'],
  7:['Terapia Cardiorrespiratoria I','Rehabilitación Musculoesquelética I','Neurorrehabilitación I','Proyecto de Desarrollo Científico I'],
  8:['Terapia Cardiorrespiratoria II','Rehabilitación Musculoesquelética II','Neurorrehabilitación II','Proyecto de Desarrollo Científico II','Administración y Gestión de Salud'],
  9:['Internado Clínico y Habilitación Profesional con Orientación Cardiorrespiratoria','Internado Clínico y Habilitación Profesional con Orientación Musculoesquelética'],
  10:['Internado Clínico y Habilitación con Orientación en Neurorrehabilitación','Internado Clínico y Habilitación Profesional Electivo'],
};
// Los magísteres de 9° y 10° (Nutrición Clínica, Nutrición Deportiva) son a
// elegir.
MALLAS_UDD_EXTRA['UDD-NUTRICION-Y-DIETETICA']={
  1:['Ciencias para la Nutrición','Anatomía e Histología','Bases para la Alimentación y Nutrición','Alimentos y Técnicas Dietéticas','Matemática Aplicada','Introducción a la Vida Universitaria','Comunicación Oral','Comunicación Escrita'],
  2:['Fisiología y Fisiopatología','Evaluación Nutricional en Adulto y Persona Mayor','Bioquímica Nutricional y Biología Molecular','Alimentación y Planificación Alimentaria del Adulto y Persona Mayor','Taller de Habilidades para la Autogestión','Lectura Crítica','Pensamiento Crítico'],
  3:['Unidad Clínica Adulto y Persona Mayor I','Bioética','Inglés Técnico','Epidemiología y Nutrición Pública','Gastronomía Saludable y Sustentable'],
  4:['Unidad Clínica del Adulto y Persona Mayor II','Habilidades Clínico Nutricionales I','Antropología de la Alimentación','Tecnología, Marketing e IA','Administración en Servicios de Alimentación I','Microbiología y Parasitología','Semana i'],
  5:['Alimentación y Evaluación del Estado Nutricional Infanto Juvenil','Educación en Alimentación y Nutrición','Nutrición y Ejercicio','Emprendimiento e Innovación para la Salud','Administración en Servicios de Alimentación II','Tecnología de los Alimentos'],
  6:['Unidad Clínica Infanto Juvenil I','Estrategias de Promoción de Salud','Gestión de Calidad en Servicios de Alimentación y Nutrición','Bromatología','Nutrición Basada en la Evidencia'],
  7:['Unidad Clínica Infanto Juvenil II','Habilidades Clínico Nutricionales II','Nutrición Comunitaria','Unidad de Industria Alimentaria, Formulación y Gestión de Proyectos'],
  8:['Internado Clínico','Internado Salud Pública','Internado en Gestión','Trabajo de Grado I','Liderazgo y Comunicación Efectiva en Salud'],
  9:['Trabajo de Grado II'],
  10:['Trabajo de Grado III'],
};
MALLAS_UDD_EXTRA['UDD-OBSTETRICIA']={
  1:['Morfología','Bases Biológicas','Embriología y Genética','Rol de la Obstetricia en un Mundo Global','Comunicación Oral','Comunicación Escrita'],
  2:['Bases Químicas','Agentes Infecciosos','Bases Matemáticas y Estadísticas','Fisiología','Atención Integral de Matronería','Lectura Crítica','Pensamiento Crítico'],
  3:['Fisiopatología','Farmacología','Clínica Atención Integral de Matronería I','Matronería en el Entorno Hospitalario','Inglés Técnico','Psicología en la Atención de Matronería'],
  4:['Fisiología del Embarazo, Parto y Puerperio','Fisiología del Recién Nacido','Anticoncepción e Infecciones de Transmisión Sexual','Salud Pública y Epidemiología','Antropología e Interculturalidad','Semana i'],
  5:['Clínica Atención Integral de Matronería II','Educación y Salud','Patología Ginecológica'],
  6:['Patología del Embarazo, Parto y Puerperio','Patología del Recién Nacido','Salud Reproductiva y Sexología Clínica','Corporalidad y Parto en Movimiento','Gestión, Innovación y Liderazgo I'],
  7:['Atención del Recién Nacido Crítico','Gestión, Innovación y Liderazgo II','Investigación Cuantitativa','Aspectos Legales en la Matronería','Bioética'],
  8:['Clínica Atención Integral de Matronería III','Principios Básicos de la Ultrasonografía Obstétrica','Matronería y Piso Pélvico','Investigación Cualitativa'],
  9:['Internado de Atención Primaria','Internado de Obstetricia'],
  10:['Internado de Ginecología','Internado de Neonatología'],
};
// Santiago y Concepción publican la misma malla (la de Concepción con dos
// erratas). Bienestar, Inteligencia Artificial y Transformación Digital es una
// línea que cruza toda la carrera, no un ramo de un semestre; el Examen de
// Habilitación Profesional de 11° es un hito.
MALLAS_UDD_EXTRA['UDD-ODONTOLOGIA']={
  1:['Morfología I','Bases Científicas I','Fundamentos Biológicos I','Introducción a la Odontología','Bienestar y Acompañamiento I','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología II','Bases Científicas II','Fundamentos Biológicos II','Acercamiento Temprano a la Odontología','Lectura Crítica','Pensamiento Crítico'],
  3:['Fundamentos de Fisiopatología','Diagnóstico Integrado I','Enfoque Odontológico Integrado I','Salud Pública y Epidemiología','Bases Clínicas I','Rehabilitación I','Bienestar y Acompañamiento II'],
  4:['Fisiopatología Oral','Diagnóstico Integrado II','Enfoque Odontológico Integrado II','Inglés Disciplinar','Bases Clínicas II','Rehabilitación II','Investigación en Odontología I','Semana i'],
  5:['Clínica Simulada Periodoncia','Clínica Simulada Endodoncia','Rehabilitación III','Formación Clínica Odontológica','Bioética','Gestión y Liderazgo','Investigación en Odontología II'],
  6:['Psicología','Clínica Integral Niños y Adolescentes I','Clínica Integral Adultos I','Cirugía Oral I','Investigación basada en la Evidencia'],
  7:['Gestión y Calidad','Clínica Integral Niños y Adolescentes II','Clínica Integral Adultos II','Cirugía Oral II','Protocolo de Investigación'],
  8:['Clínica Integral Niños y Adolescentes III','Clínica Integral Adultos III','Cirugía Oral III','Proyecto de Investigación'],
  9:['Clínica Integral Niños y Adolescentes IV','Clínica Integral Adultos IV','Cirugía Oral IV','Salud Pública y Seguridad Social'],
  10:['Internado Comunitario I','Gestión y Emprendimiento'],
  11:['Internado Comunitario II','Plataforma Laboral'],
};
// 9° y 10° son un bloque de Prácticas e Internados Profesionales y otro de
// Proyecto de Título, sin asignaturas nombradas. Fuera los Electivos I–III.
MALLAS_UDD_EXTRA['UDD-QUIMICA-Y-FARMACIA']={
  1:['Química General I','Matemáticas','Química y Farmacia: Rol del Profesional','Biología Celular','Comunicación Oral','Comunicación Escrita'],
  2:['Química General II','Cálculo','Física','Trabajo en Equipos Interdisciplinarios de Salud','Biología Molecular','Lectura Crítica','Pensamiento Crítico'],
  3:['Química Orgánica','Bioquímica','Microbiología e Inmunología','Bioética'],
  4:['Química Analítica','Fisicoquímica','Fisiología','Bioestadística','Semana i'],
  5:['Química Farmacéutica I','Botánica y Farmacognosia','Fisiopatología','Salud Pública y Epidemiología','Inteligencia y Gestión de Datos'],
  6:['Química Farmacéutica II','Farmacología General','Economía en Salud','Innovación y Tecnología Farmacéutica'],
  7:['Farmacología Clínica I','Legislación Farmacéutica','Toxicología','Emprendimiento y Gestión de Farmacias Comunitarias','Fundamentos de la Investigación','Metodología de la Investigación','Tecnología Farmacéutica y Cosmética'],
  8:['Farmacología Clínica II','Control de Calidad','Farmacogenómica','Taller de Simulación Centrada en el Paciente','Farmacia Clínica y Atención Farmacéutica','Marketing Farmacéutico y Comunicación Estratégica','Diseños de Proyectos de Investigación','Ejecución Proyecto de Investigación'],
};
// Una malla por especialidad; 1° a 3° son comunes. Fuera los TM Electivo I–II.
MALLAS_UDD_EXTRA['UDD-TECNOLOGIA-MEDICA-BIOANALISIS']={
  1:['Bases Biológicas','Bases Químicas','Matemáticas y Física','Rol Profesional y Competencias Digitales en Tecnología Médica','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología','Fundamentos en Investigación y Data Science','Bioquímica General','Gestión y Liderazgo en Tecnología Médica','Agentes Infecciosos','Lectura Crítica','Pensamiento Crítico'],
  3:['Biología Molecular y Genética','Psicología y Atención Integral del Paciente','Bioestadística','Inmunología General','Presentaciones Científicas Efectivas','Artificial Intelligence for Scientific and Critical Analysis'],
  4:['Salud Pública y Epidemiología','Fisiología Básica','Aplicaciones Informáticas en Gestión e Investigación','Gestión y Administración en Salud','Parasitología','Semana i'],
  5:['Mecanismos de Enfermedad y Farmacología','Ética Profesional','Bioquímica Aplicada','Hematología Asistida por Algoritmos de Inteligencia Artificial','Gestión en Bioseguridad'],
  6:['Bioanálisis Clínico','Sistemas Inteligentes en Informática Médica','Informática Médica','Inmunología Clínica y Citometría de Flujo'],
  7:['Metodología de la Investigación','Microbiología General','Gestión de Calidad y Analítica Predictiva','Laboratorio Broncopulmonar y Dermatología','Inteligencia Artificial en Genómica y Medicina de Precisión'],
  8:['Integración Clínica en la Especialidad','Seminario de Investigación','Microbiología Clínica','Inmunohematología y Medicina Transfusional','Citogenética Clínica'],
  9:['Internado Clínico','Seminario de Investigación Aplicado'],
  10:['Internado Electivo','Interpretación Diagnóstica Integral'],
};
MALLAS_UDD_EXTRA['UDD-TECNOLOGIA-MEDICA-IMAGENOLOGIA']={
  1:['Bases Biológicas','Bases Químicas','Matemáticas y Física','Rol Profesional y Competencias Digitales en Tecnología Médica','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología','Fundamentos en Investigación y Data Science','Bioquímica General','Gestión y Liderazgo en Tecnología Médica','Agentes Infecciosos','Lectura Crítica','Pensamiento Crítico'],
  3:['Biología Molecular y Genética','Psicología y Atención Integral del Paciente','Bioestadística','Inmunología General','Presentaciones Científicas Efectivas','Artificial Intelligence for Scientific and Critical Analysis'],
  4:['Salud Pública y Epidemiología','Fisiología Básica','Aplicaciones Informáticas en Gestión e Investigación','Gestión y Administración en Salud','Anatomía Topográfica con Inteligencia Artificial','Semana i'],
  5:['Mecanismos de Enfermedad y Farmacología','Ética Profesional','Imagenología Radiológica I','Protección Radiológica y Dosimetría','Anatomía y Patología Imagenológica'],
  6:['Imagenología Radiológica II','Física Aplicada en Tecnología Médica y Control de Calidad','Neuroanatomía','Gestión Inteligente de Sistemas RIS-PACS y TI'],
  7:['Metodología de la Investigación','Imagenología en Ecografía','Imagenología en Tomografía Computada','Imagenología en Resonancia Magnética','Gestión Inteligente de la Calidad'],
  8:['Integración Clínica en la Especialidad','Seminario de Investigación','Imágenes Mamarias','Imagenología en Medicina Nuclear','Imagenología Diagnóstica Intervencional','Radioterapia'],
  9:['Internado Clínico','Seminario de Investigación Aplicado'],
  10:['Internado Electivo','Interpretación Diagnóstica Integral'],
};
MALLAS_UDD_EXTRA['UDD-TECNOLOGIA-MEDICA-MORFOFISIOPATOLOGIA']={
  1:['Bases Biológicas','Bases Químicas','Matemáticas y Física','Rol Profesional y Competencias Digitales en Tecnología Médica','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología','Fundamentos en Investigación y Data Science','Bioquímica General','Gestión y Liderazgo en Tecnología Médica','Agentes Infecciosos','Lectura Crítica','Pensamiento Crítico'],
  3:['Biología Molecular y Genética','Psicología y Atención Integral del Paciente','Bioestadística','Inmunología General','Presentaciones Científicas Efectivas','Artificial Intelligence for Scientific and Critical Analysis'],
  4:['Salud Pública y Epidemiología','Fisiología Básica','Aplicaciones Informáticas en Gestión e Investigación','Gestión y Administración en Salud','Microscopía Avanzada y Digitalización de Imágenes Biomédicas','Semana i'],
  5:['Mecanismos de Enfermedad y Farmacología','Ética Profesional','Procesamiento de Tejidos y Aplicaciones en Patología Digital I','Histología Digital Aplicada al Diagnóstico','Gestión en Bioseguridad'],
  6:['Procesamiento de Tejidos y Aplicaciones en Patología Digital II','Histopatología','Gestión de Calidad en Anatomía Patológica','Inmunología Clínica y Citometría de Flujo'],
  7:['Metodología de la Investigación','Histoquímica e Inmunohistoquímica','Citodiagnóstico Ginecológico','Laboratorio Broncopulmonar y Dermatología','Biología Molecular Diagnóstica'],
  8:['Integración Clínica en la Especialidad','Seminario de Investigación','Medicina Legal y Toxicología','Citodiagnóstico de Misceláneas','Citogenética Clínica','Bioinformática en el Diagnóstico Molecular'],
  9:['Internado Clínico','Seminario de Investigación Aplicado'],
  10:['Internado Electivo','Interpretación Diagnóstica Integral'],
};
MALLAS_UDD_EXTRA['UDD-TECNOLOGIA-MEDICA-OFTALMOLOGIA']={
  1:['Bases Biológicas','Bases Químicas','Matemáticas y Física','Rol Profesional y Competencias Digitales en Tecnología Médica','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología','Fundamentos en Investigación y Data Science','Bioquímica General','Gestión y Liderazgo en Tecnología Médica','Agentes Infecciosos','Lectura Crítica','Pensamiento Crítico'],
  3:['Biología Molecular y Genética','Psicología y Atención Integral del Paciente','Bioestadística','Inmunología General','Presentaciones Científicas Efectivas','Artificial Intelligence for Scientific and Critical Analysis'],
  4:['Salud Pública y Epidemiología','Fisiología Básica','Aplicaciones Informáticas en Gestión e Investigación','Gestión y Administración en Salud','Óptica Clínica','Semana i'],
  5:['Mecanismos de Enfermedad y Farmacología','Ética Profesional','Morfofisiología del Sistema Visual','Exploración y Evaluación Oftalmológica','Calidad en Oftalmología: Inteligencia Artificial y Herramientas para la Gestión'],
  6:['Fisiopatología del Sistema Visual','Estudio del Estrabismo','Optometría Clínica I','Estudio e Interpretación del Campo Visual'],
  7:['Metodología de la Investigación','Atención Primaria Oftalmológica, Trauma Ocular y Baja Visión','Imagenología Ocular','Optometría Clínica II','Exámenes Funcionales del Segmento Anterior'],
  8:['Integración Clínica en la Especialidad','Seminario de Investigación','Neurooftalmología','Estudio Clínico de la Retina y Diagnóstico Asistido por Inteligencia Artificial','Ortóptica y Pleóptica','Biometría Ocular y Cirugía Refractiva'],
  9:['Internado Clínico','Seminario de Investigación Aplicado'],
  10:['Internado Electivo','Interpretación Diagnóstica Integral'],
};
MALLAS_UDD_EXTRA['UDD-TERAPIA-OCUPACIONAL']={
  1:['Psicología General','Bases Biológicas','Introducción a la Terapia Ocupacional','Laboratorio de Creatividad e Innovación','Comunicación Oral','Comunicación Escrita'],
  2:['Morfología','Fundamentos de la Terapia Ocupacional y Ciencia de la Ocupación','Discapacidad e Inclusión','Salud Digital e Inteligencia Artificial','Lectura Crítica','Pensamiento Crítico'],
  3:['Fisiología Básica','Anatomía Funcional y Biomecánica','Neuroanatomía','Ocupación y Razonamiento Profesional','Antropología e Interculturalidad'],
  4:['Psicología y Atención Integral al Paciente','Salud Pública y Epidemiología','Neurociencias Aplicadas','Anatomía Aplicada a la Ocupación','Desarrollo de la Infancia y la Adolescencia','Diversidad y Participación Social'],
  5:['Enfoque y Modelos de Práctica','Estrategias Terapéuticas Basadas en la Ocupación','Estilos de Vida y Bienestar','Fisiopatología del Curso de Vida','Atención Primaria y Salud Familiar','Bioética Clínica'],
  6:['Proceso de Evaluación en Terapia Ocupacional','Ayudas Técnicas y Tecnologías de Asistencia','Gerontología','Psicopatología y Salud Mental del Curso de Vida','Comunidad e Inclusión','Metodología de la Investigación','Semana i'],
  7:['Ortótica','Inglés Técnico','Abordaje en Condiciones de Salud Mental','Abordaje en Condiciones de Salud Física I','Inclusión Laboral','Gestión e Innovación en Salud','Proyecto de Investigación I'],
  8:['Abordaje en Persona Mayor','Abordaje en Condiciones de Salud Física II','Abordaje en Infancia y Adolescencia','Inclusión Educativa','Proyecto de Investigación II'],
  9:['Internado I','Internado II'],
  10:['Internado III','Internado Electivo'],
};
