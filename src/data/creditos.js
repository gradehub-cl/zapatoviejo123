
// ─── CRÉDITOS SCT DE INGENIERÍA UC ───────────────────────────────────────────
// nombre del ramo → [créditos, sigla]
//
// POR QUÉ EXISTE ESTA TABLA APARTE. Los créditos son el dato más estable del
// currículum: un ramo cambia de ponderaciones todos los semestres y de SCT casi
// nunca. Atarlos a los presets sería desperdiciarlos — hay 10 presets UC y 146
// ramos acá. Un estudiante que carga su malla obtiene su PPA ponderado sin que
// exista una sola pauta oficial de sus ramos.
//
// DE DÓNDE SALEN. Ingeniería sale del catálogo oficial C2022 vía la API de
// mallas.ing.uc.cl: se recorrieron los 34 majors generando su plan completo y
// se pidió el detalle de cada sigla. Comercial sale de su malla oficial 2025
// (economiayadministracion.uc.cl/assets/uploads/2025/07/malla-2025-1.pdf), con
// las siglas contrastadas contra la Resolución VRA N°080/2019, Anexo III
// (registrosacademicos.uc.cl/wp-content/uploads/2024/06/m_050014_2025.pdf).
// Ninguno se escribió a mano.
//
// La sigla va al lado del crédito y no se usa para calcular: sirve para
// verificar el dato contra catalogo.uc.cl sin tener que adivinar de qué ramo se
// está hablando cuando dos se llaman parecido.
//
// LOS DE 0 CRÉDITOS SON REALES, no un dato faltante. Los tres laboratorios de
// Física y Práctica I valen 0 SCT en el plan y aun así llevan nota. Hoy
// `gpaMode` exige créditos > 0 en TODOS los ramos con nota, así que uno de estos
// tumba la ponderación de todo el semestre. Está pendiente decidir cómo tratarlos
// —Lucas está consiguiendo el programa del laboratorio— y por eso acá se
// registran tal cual: el dato oficial es 0 y falsearlo para que el promedio
// funcione sería exactamente lo que este proyecto no hace.
const CREDITOS_UC={
  'Introducción a la Arquitectura':[10,'AQH0000'],
  'Taller de Formación y Representación I':[20,'AQT0000'],
  'Ciudad y Paisaje I: Introducción a la Forma Urbana y Territorial':[10,'AQU0000'],
  'Fisiología':[10,'BIO135C'],
  'Biología de Microorganismos':[10,'BIO151E'],
  'Bases Fisicas de los Procesos Biologicos':[10,'BIO152C'],
  'Bioquímica y Genética Molecular':[10,'BIO228C'],
  'Probabilidades y Estadística':[10,'EYP1113'],
  // Comercial la llama igual, pero usa EAA1520. Como ambos planes le dan 10
  // SCT, esta tabla por nombre conserva el crédito; SIGLAS_UC guarda la sigla
  // correcta según carrera para no mezclarlos en el catálogo.
  'Inferencia Estadística':[10,'EYP2114'],
  'Metodos Bayesianos':[10,'EYP280I'],
  'Filosofía: ¿Para Qué?':[10,'FIL2001'],
  'Laboratorio de Termodinámica':[0,'FIS0152'],
  'Laboratorio de Electricidad y Magnetismo':[0,'FIS0153'],
  'Laboratorio de Dinámica':[0,'FIS0154'],
  'Dinámica':[10,'FIS1514'],
  // No es un duplicado: el plan común admite FIS1514 o ICE1514. Como ambos
  // se llaman oficialmente Dinámica, el código va en la etiqueta para que el
  // estudiante pueda elegir el que aparece en su horario. No entra a la malla
  // sugerida porque es una alternativa, no un ramo adicional.
  'Dinámica (ICE1514)':[10,'ICE1514'],
  'Termodinámica':[10,'FIS1523'],
  'Electricidad y Magnetismo':[10,'FIS1533'],
  'Diseño en Ingeniería Biomédica I (Capstone)':[10,'IBM2122'],
  'Diseño en Ingeniería Biomédica II (Capstone)':[10,'IBM2123'],
  'Diseño en Ingeniería Biológica (Capstone)':[10,'IBM2222'],
  'Materiales de Ingeniería Civil':[10,'ICC2105'],
  'Planificación y Control de Proyectos':[10,'ICC2204'],
  'Ingeniería de Construcción':[10,'ICC2304'],
  'Instalaciones en Edificios':[10,'ICC2312'],
  'Topografía y Geoinformación Aplicada':[10,'ICC2414'],
  'Construcción de Obras Civiles':[10,'ICC2424'],
  'Ingeniería Vial':[10,'ICC2514'],
  'Taller de Mejoramiento en Ingeniería de Construcción':[10,'ICC2904'],
  'Tecnologias de Informacion en Construccion':[10,'ICC2913'],
  'Estática':[10,'ICE2006'],
  'Estratigrafía y Procesos Sedimentarios y Volcánicos':[10,'ICE2022'],
  'Geología y Geodinámica Andina':[10,'ICE2024'],
  'Geoquímica y Petrogénesis':[10,'ICE2025'],
  'Geología de Campo I (Capstone)':[5,'ICE2026'],
  'Geologia de Campo II (Capstone)':[5,'ICE2027'],
  'Mineralogía y Petrología':[10,'ICE2028'],
  'Procesos Superficiales y Peligros Geológicos':[10,'ICE2029'],
  'Análisis Estructural I':[10,'ICE2114'],
  'Mecánica de Sólidos':[10,'ICE2313'],
  'Diseño Estructural':[10,'ICE2403'],
  'Hormigón Armado':[10,'ICE2413'],
  'Estructuras de Acero':[10,'ICE2533'],
  'Fundamentos de Geotecnia':[10,'ICE2604'],
  'Mecánica de Suelos':[10,'ICE2614'],
  'Introducción a la Geología Física':[10,'ICE2623'],
  'Geofisica General':[10,'ICE2630'],
  'Geología Estructural y Tectónica':[10,'ICE2633'],
  'Recursos y Exploración Geológica':[10,'ICE2640'],
  'Métodos Geofísicos para Ingeniería':[10,'ICE2643'],
  'Ingeniería Antisísmica':[10,'ICE2703'],
  'Proyecto de Diseño Estructural y Geotécnico':[10,'ICE2880'],
  'Mecánica de Fluidos':[10,'ICH1104'],
  'Evaluación Ambiental de Proyectos (Capstone)':[10,'ICH2103'],
  'Ingeniería Hidráulica':[10,'ICH2114'],
  'Análisis y Diseño Hidráulico':[10,'ICH2124'],
  'Hidrología':[10,'ICH2204'],
  'Ingeniería Ambiental':[10,'ICH2304'],
  'Calidad del Agua':[10,'ICH2314'],
  'Taller de Obras Hidráulicas':[10,'ICH2574'],
  'Principios de Tratamiento de Agua':[10,'ICH2604'],
  'Diseño Mecánico':[10,'ICM2022'],
  'Proyecto de Diseño Mecánico (Capstone)':[10,'ICM2026'],
  'Conversión de Energía':[10,'ICM2213'],
  'Transferencia de Calor':[10,'ICM2223'],
  'Ciencia de los Materiales':[10,'ICM2403'],
  'Procesos de Manufactura':[10,'ICM2503'],
  'Dinámica de Sistemas Mecánicos':[10,'ICM2803'],
  'Control de Sistemas Mecánicos':[10,'ICM2813'],
  'Optimización':[10,'ICS1113'],
  'Optimización-Honors':[10,'ICS113H'],
  'Introducción a la Economía':[10,'ICS1513'],
  'Métodos de Optimización':[10,'ICS2121'],
  'Taller de Investigación Operativa (Capstone)':[10,'ICS2122'],
  'Modelos Estocásticos':[10,'ICS2123'],
  'Microeconomía':[10,'ICS2523'],
  'Contabilidad y Control de Gestión':[10,'ICS2613'],
  'Organización y Comportamiento en la Empresa':[10,'ICS2813'],
  'Taller de Ingeniería de Transporte (Capstone)':[10,'ICT2154'],
  'Modelos de Demanda de Transporte':[10,'ICT2213'],
  'Modelos de Tráfico':[10,'ICT2223'],
  'Flujo en Redes':[10,'ICT2233'],
  'Ingeniería de Sistemas de Transporte':[10,'ICT2904'],
  'Señales y Sistemas':[10,'IEE2103'],
  'Teoría Electromagnética':[10,'IEE2113'],
  'Circuitos Eléctricos':[10,'IEE2123'],
  'Laboratorio de Mediciones Eléctricas':[5,'IEE2183'],
  'Máquinas Eléctricas':[10,'IEE2213'],
  'Electrónica':[10,'IEE2413'],
  'Laboratorio de Electrónica Analógica y Digital':[5,'IEE2473'],
  'Comunicaciones':[10,'IEE2513'],
  'Control Automático':[10,'IEE2613'],
  'Sistemas Digitales':[10,'IEE2713'],
  'Diseño Eléctrico (Capstone)':[10,'IEE2913'],
  'Introducción a la Programación':[10,'IIC1103'],
  'Matemáticas Discretas':[10,'IIC1253'],
  'Diseño Detallado de Software':[10,'IIC2113'],
  'Estructuras de Datos y Algoritmos':[10,'IIC2133'],
  'Ingeniería de Software':[10,'IIC2143'],
  'Proyecto de Especialidad':[10,'IIC2154'],
  'Arquitectura de Sistemas de Software':[10,'IIC2173'],
  'Programación Avanzada':[10,'IIC2233'],
  'Sistemas Operativos y Redes':[10,'IIC2333'],
  'Arquitectura de Computadores':[10,'IIC2343'],
  'Bases de Datos':[10,'IIC2413'],
  'Tecnologías y Aplicaciones Web':[10,'IIC2513'],
  'Inteligencia Artificial':[10,'IIC2613'],
  'Sistemas de Información':[10,'IIC2713'],
  'Modelos de Procesos':[10,'IIC2733'],
  'Conocimiento, Cultura y Tecnología':[10,'IIC2764'],
  'Fenómenos de Transporte':[10,'IIQ2003'],
  'Operaciones Unitarias I':[10,'IIQ2013'],
  'Operaciones Unitarias II':[10,'IIQ2023'],
  'Fisicoquímica':[10,'IIQ2043'],
  'Diseño de Reactores':[10,'IIQ2113'],
  'Procesos Químicos':[10,'IIQ2133'],
  'Diseño de Procesos Químicos (Capstone)':[10,'IIQ2243'],
  'Dinámica y Control de Procesos':[10,'IIQ2313'],
  'Residuos Sólidos y Peligrosos':[10,'IIQ2363'],
  'Bioseparaciones':[10,'IIQ2673'],
  'Minería a Cielo Abierto':[10,'IMM2013'],
  'Procesos Mineralúrgicos':[10,'IMM2023'],
  'Geoestadística':[10,'IMM2033'],
  'Minería Subterránea':[10,'IMM2043'],
  'Procesos Metalúrgicos':[10,'IMM2053'],
  'Minería Sustentable':[10,'IMM2073'],
  'Mecánica de Rocas para Minería':[10,'IMM2083'],
  'Taller de Planificación Minera (Capstone)':[10,'IMM2583'],
  'Álgebra Lineal Numérica':[10,'IMT2111'],
  'Taller de Matemáticas Aplicadas (Capstone)':[10,'IMT2116'],
  'Práctica I':[0,'ING1001'],
  'Desafíos de la Ingeniería':[10,'ING1004'],
  'Investigación, Innovación y Emprendimiento':[10,'ING2030'],
  'Diseño Colaborativo en Aic (Arquitectura, Ingeniería y Construcción) (Capstone)':[10,'ING2983'],
  'Fundamentos de Robótica':[10,'IRB2001'],
  'Diseño de Sistemas Robóticos (Capstone)':[10,'IRB2002'],
  'Álgebra Lineal':[10,'MAT1203'],
  'Cálculo I':[10,'MAT1610'],
  'Cálculo II':[10,'MAT1620'],
  'Cálculo III':[10,'MAT1630'],
  'Ecuaciones Diferenciales':[10,'MAT1640'],
  'Análisis Real':[10,'MAT251I'],
  'Teoría de Integración':[10,'MAT253I'],
  'Cálculo Científico I':[10,'MAT2605'],
  'Química para Ingeniería':[10,'QIM100E'],
  'Bioquímica':[10,'QIM117B'],
  'Química Orgánica Fundamental':[10,'QIM200'],

  // Ingeniería Comercial UC · malla oficial 2025. Los cuatro nombres que
  // coincide con Ingeniería (Cálculo I y II, Programación y Filosofía) ya
  // están arriba con el mismo crédito; acá van los 26 propios de Comercial.
  'Introducción a la Microeconomía':[10,'EAE1110'],
  'Contabilidad':[10,'EAA1210'],
  'Comportamiento Organizacional':[10,'EAA1110'],
  'Probabilidad y Estadística':[10,'EAA1510'],
  'Introducción al Álgebra Lineal':[10,'MAT1279'],
  'Introducción a la Macroeconomía':[10,'EAE1210'],
  'Aplicaciones Matemáticas para Economía y Negocios':[10,'EAF2010'],
  'Análisis Económico: La Experiencia Chilena':[10,'EAE1220'],
  'Fundamentos de Finanzas':[10,'EAA1220'],
  'Econometría':[10,'EAE2510'],
  'Microeconomía I':[10,'EAE2110'],
  'Estrategia de la Organización':[10,'EAA2410'],
  'Fundamentos de Marketing':[10,'EAA2310'],
  'Microeconomía II':[10,'EAE2120'],
  'Macroeconomía I':[10,'EAE2210'],
  'Teoría Financiera':[10,'EAA2210'],
  'Estrategia Competitiva':[10,'EAA2420'],
  'Competencia y Mercado':[10,'EAE2130'],
  'Contabilidad de Costos':[10,'EAA2220'],
  'Ética, Economía y Empresa':[10,'ETI209'],
  'Marketing Analytics':[10,'EAA2320'],
  'Empresas y Legislación':[5,'EAA2230'],
  'Macroeconomía II':[10,'EAE2220'],
  'Contabilidad Gerencial':[10,'EAA2240'],
  'Dirección de Personas':[10,'EAA2110'],
  'Práctica Social':[10,'EAF2500'],
  // Los teológicos con pauta (arriba, en PRESETS_UC). Van también acá porque
  // esta tabla es de dónde salen la sigla y los créditos de un ramo fuera de
  // malla: sin su fila, el buscador los mostraba sin sigla —el reporte del
  // 2026-09-11— y sin créditos, que además arrastra el promedio ponderado del
  // semestre entero a promedio simple. Los 10 SCT son los del catálogo UC.
  'La Biblia de Jesús':[10,'TTF036'],
  'La Belleza de la Fragilidad Humana':[10,'TTF109'],
  'Virgen María y Feminismo: ¿Diálogo o Confrontación?':[10,'TTF115'],
  'Arquitectura Sacra':[10,'TTF116'],
  'Esperanza Cristiana, Muerte y Más Allá':[10,'TTF118'],
  'Búsquedas Religiosas y Cristianismo':[10,'TTF202'],
  '¿Quién Es Jesús de Nazareth?':[10,'TTF205'],
  'El Padrenuestro: la Oración de Jesús':[10,'TTF206'],
  'Doctrina Social de la Iglesia':[10,'TTF207'],
  'Fe y Razón: Una Perspectiva Histórica':[10,'TTF208'],
  'Experiencia Creyente y Secularismo':[10,'TTF210'],
  'Para Pensar la Muerte':[10,'TTF211'],
  'Espiritualidad Laical y Cultura Moderna':[10,'TTF213'],
  'Teología y Ecología':[10,'TTF215'],
  '¿Creer o No Creer?':[10,'TTF216'],
  '¿Es Necesaria la Iglesia?':[10,'TTF217'],
  'Lectura Contemporánea de la Biblia':[10,'TTF218'],
  'Existencia Humana y la Búsqueda de Sentido':[10,'TTF219'],
  'Teología del Cuerpo Humano':[10,'TTF220'],
  'Cristianismo y Crisis Ecológica':[10,'TTF222'],
  'Fe y Ciencia':[10,'TTF225'],
  'Religión y Política':[10,'TTF226'],
  'Teología Feminista: Un Signo de los Tiempos':[10,'TTF232'],
  'Teología y Literatura':[10,'TTF233'],
};

// Créditos SCT de la FEN. Misma forma que CREDITOS_UC: [créditos, sigla].
//
// Los 32 primeros salen de la planilla oficial de oferta de secciones de
// Primavera 2026, con su sigla. Como es la oferta y no la malla, trae varias
// filas por ramo —una por sección— y las versiones "(DICTADO EN INGLÉS)" del
// mismo curso: se deduplicaron por nombre, y en todos los casos las secciones
// de un mismo ramo declaraban los mismos créditos.
//
// Los 7 del final los aportó Martín: son ramos que ya cursó, así que no
// aparecen en la oferta de este semestre. Van sin sigla porque la planilla no
// los trae, y `creditosDe` solo lee el primer elemento.
//
// 39 de los 88 ramos de la malla. El promedio general se pondera por créditos
// SOLO si todos los ramos con nota los tienen, así que hasta completarla esto
// no cambia ningún número: prepara el terreno.
const CREDITOS_FEN={
  'Comunicación':[2,'COM1005'],
  // La planilla lo lista como "COMUNICACIÓN I" (prerrequisito COM1005) y la
  // malla lo llama "Comunicación II". Martín confirmó que son el mismo ramo.
  'Comunicación II':[2,'COM3005'],
  'Contabilidad':[6,'CON1005'],
  'Contabilidad Empresarial I':[6,'CON3005'],
  'Contabilidad Empresarial II':[6,'CON3505'],
  'Economía Aplicada':[6,'MIC2505'],
  'Economía para los Negocios':[6,'NEG3005'],
  'Estadística I':[6,'MES2005'],
  'Estadística II':[6,'MES2505'],
  'Finanzas':[6,'FIN2505'],
  'Finanzas I':[6,'FIN3505'],
  'Finanzas II':[6,'FIN4505'],
  'Gestión de Personas':[6,'GEP1505'],
  'Gestión de Personas I':[6,'GEP3005'],
  'Gestión de Personas II':[6,'GEP4505'],
  'Inglés IV':[4,'IDI3506'],
  'Introducción a la Macroeconomía':[6,'MAC2005'],
  'Introducción a la Microeconomía':[6,'MIC1505'],
  'Introducción al Pensamiento Económico y Político':[4,'CSH2005'],
  'Marketing':[6,'MKT2005'],
  'Marketing I':[6,'MKT3505'],
  'Marketing II':[6,'MKT4505'],
  'Métodos Cuantitativos I':[6,'MEC3005'],
  // IICG y CA lo cursan sin número: es el mismo MEC3005 de IC. Ver SINONIMOS.
  'Métodos Cuantitativos':[6,'MEC3005'],
  // Confirmado por Martín el 2026-09-04. Va sin código porque todavía no lo
  // tenemos y no se inventa: siete entradas más de esta tabla están igual, y
  // en FEN el código no participa de ningún cálculo ni del consenso.
  'Métodos Cuantitativos II':[6],
  // Los seis ramos troncales de 5º y 6º. Confirmados por Martín el 2026-09-04
  // de memoria, no contra el catálogo oficial: van sin código y con esta nota
  // para que se sepa de dónde salieron. La tabla no es uniforme —los talleres
  // valen 2 y los idiomas 2 o 4— así que el 6 no es un default, es el dato.
  'Microeconomía I':[6],
  'Microeconomía II':[6],
  'Macroeconomía I':[6],
  'Macroeconomía II':[6],
  'Historia Económica':[6],
  'Métodos Matemáticos II':[6,'MEM1505'],
  'Métodos Matemáticos III':[6,'MEM2005'],
  'Métodos Matemáticos IV':[6,'MEM2505'],
  'Negocios I':[6,'NEG3510'],
  'Negocios II':[6,'NEG4005'],
  'Negocios III':[6,'NEG4505'],
  'Razonamiento Basado en Datos':[6,'GIN2505'],
  'Taller de Negocios':[2,'NEG3505'],
  'Tecnología y Sistemas de Información':[6,'GIN1505'],
  // Sin sigla: no están en la oferta de este semestre.
  'Gestión y Empresas':[6,null],
  'Inglés I':[2,null],
  'Inglés II':[2,null],
  'Inglés III':[2,null],
  'Introducción a la Economía':[6,null],
  // Sigla de Docencia Web FEN (Catedra=ENMEM1005), sin el prefijo EN como el
  // resto de CREDITOS_FEN. Verificada el 2026-10-02 contra ENMEM1505 →
  // Métodos Matemáticos II = MEM1505.
  'Métodos Matemáticos I':[6,'MEM1005'],
  'Programación para Analítica de Datos':[6,null],

  // ─── Por la regla de créditos de la FEN, no ramo por ramo ───────────────
  // Martín la fijó el 2026-09-04: los ramos troncales valen 6, los talleres y
  // electivos 2, Inglés I a III 2 e Inglés IV 4. La tabla de arriba ya la
  // cumplía en sus 46 entradas, así que acá se aplica al resto de las mallas.
  //
  // Es la primera vez que este archivo se llena con una regla en vez de con un
  // dato por ramo. Va anotado para que se sepa: si aparece el catálogo oficial
  // y alguno no calza, el catálogo manda y esto se corrige sin discusión.
  'Microeconomía III':[6,null],
  'Microeconomía IV':[6,null],
  'Macroeconomía III':[6,null],
  'Macroeconomía IV':[6,null],
  'Fundamentos de Costos':[6,null],
  'Ética y Negocios':[6,null],
  'Gestión de Riesgos y Control Interno':[6,null],
  'Contabilidad Financiera':[6,null],
  'Sistemas Tributación en la Renta':[6,null],
  'Análisis Contable':[6,null],
  'Fundamentos de Auditoría':[6,null],
  'Sistemas de Tributación Tipo Consumo':[6,null],
  'Análisis Financiero e Inversiones':[6,null],
  'Sistemas de Aplicaciones':[6,null],
  'Estrategia y Presupuesto':[6,null],
  'Estrategia y Presupuestos':[6,null],
  'Desarrollo de Auditoría':[6,null],
  'Economía de los Impuestos':[6,null],
  'Gestión Financiera Corporativa':[6,null],
  'Investigación Operativa':[6,null],
  'Auditoría de Tecnología de la Información':[6,null],
  'Derecho y Empresa':[6,null],
  'Gestión Legal Tributaria':[6,null],
  'Machine Learning':[6,null],
  'Gestión de Procesos de Negocios':[6,null],
  'Contabilidad Avanzada':[6,null],
  'Control Financiero':[6,null],
  'Sistemas de Administración de Bases de Datos':[6,null],
  'Planificación y Diseño Organizacional':[6,null],
  'Control de Gestión I':[6,null],
  'Control de Gestión II':[6,null],
  'Transformación Digital':[6,null],
  'Toma de Decisiones Bajo Incertidumbre':[6,null],
  'Juegos y Estrategias':[6,null],

  // Talleres de semestre, como Taller de Negocios que ya estaba en 2.
  'Taller de Política Pública':[2,null],
  'Taller Práctico Profesional/Social I':[2,null],
  'Taller Práctico Profesional/Social II':[2,null],

  // Quedan fuera a propósito, porque la regla no los alcanza:
  //   Práctica Profesional, Taller de Práctica Profesional, Taller de
  //   Integración Profesional y AFE (Trabajo de Cierre) son el ÚNICO ramo de
  //   su semestre, así que cargan el semestre entero y 2 sería absurdo.
  //   Inglés V salió de la malla: la serie termina en el IV.
};

// Lo que el horario oficial le antepone a la sigla de la tabla de créditos,
// para leer la sección desde una foto. El de la FEN dice "ENMEM1505/02":
// MEM1505 (Métodos Matemáticos II), sección 2; es el mismo EN que se le saca
// a las siglas de Docencia Web arriba. Sin entrada no se ofrece la foto.
const PREFIJO_SIGLA_HORARIO={uc:'',fen:'EN'};

// Siglas de TODOS los ramos UC que hoy se pueden cargar desde una malla.
//
// La sigla es la identidad académica de un ramo: los nombres pueden repetirse
// entre facultades ("Probabilidad y Estadística" es EYP1113 en Ingeniería y
// EAA1510 en Comercial), pero las siglas no. Por eso el consenso de cambios de
// pauta usa esta tabla y no junta por accidente dos ramos que solo se llaman
// parecido.
//
// Ingeniería · Plan Común: catálogo C2022 de la Escuela de Ingeniería.
// Comercial: Resolución VRA N°262/2024, Anexo III, plan vigente 2025
// (registrosacademicos.uc.cl/m_050014_2025.pdf). No son ponderaciones ni
// créditos nuevos: solo el identificador oficial del curso.
