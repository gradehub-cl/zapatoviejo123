// ─── PAUTAS UDD ──────────────────────────────────────────────────────────────
// Salen de los programas de asignatura que la UDD publica en
// udd.cl/wp-content/uploads/<año>/<mes>/, leídos el 2026-10-31. Cada pauta
// lleva la URL de su PDF y la fecha en que se subió; los SHA-256 y la lista de
// todo lo revisado, con lo que quedó fuera y por qué, están en docs/mallas-udd.md.
//
// Solo programas subidos desde 2025 que fijan cuánto pesa cada evaluación. Los
// de Ingeniería, Derecho y Economía y Negocios nombran las evaluaciones sin
// porcentajes, y Diseño deja el detalle a la calendarización de cada curso: de
// esas facultades no hay pauta que cargar.
//
// Psicología y Arquitectura escriben la pauta igual: evaluaciones parciales
// 70%, repartidas entre sí, y examen 30%. Acá va el peso sobre la nota final:
// "parciales 70%: certámenes 25% y 35%" son 17,5 y 24,5. Un grupo con cantidad
// ("2 certámenes: 60%") son casillas iguales; sin cantidad ("Controles de
// lectura 25%"), lista abierta.
//
// Toda pauta con examen lleva la compuerta de los arts. 37 y 38 del Reglamento
// Académico del Alumno Regular de Pregrado: el examen no se exime, exige 3,0 y
// bajo eso repruebas con la nota del examen. Es `cap:'self'` sobre el examen
// solo. El art. 38 dice que la final ES la del examen; la compuerta la topa ahí,
// así que si el resto del ramo promedia menos que ese examen, la app muestra el
// promedio, más bajo. Las dos reprueban; el detalle, en docs/mallas-udd.md.
//
// La sigla y los créditos SCT salen del programa; si no trae SCT, no van. La
// clave es el nombre de mallas-udd.js cuando el programa es ese ramo. Los
// programas de Psicología describen otro plan que su malla publicada (otros
// ramos por semestre): si el nombre difiere, no se le asigna, porque puede ser
// otro curso.
const EXAMEN_UDD={nombre:'Examen',evals:['Examen'],min:3.0,cap:'self'};
const REGLA_EXAMEN_UDD='El examen no se exime: con menos de 3,0 repruebas y tu nota final es la del examen (Reglamento Académico, arts. 37 y 38)';
const REGLA_ASISTENCIA_ARQ_UDD='La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)';
const PRESETS_UDD={
  // ── Psicología ──
  // SPF115, https://www.udd.cl/wp-content/uploads/2025/06/spf115.pdf (subido el
  // 2025-06-19). Parciales 70% × (25, 35, 15, 25) + examen 30%.
  'Procesos Psicológicos':{
    sigla:'SPF115',creditos:5,
    evals:[
      ['Certamen 1',17.5],
      ['Certamen 2',24.5],
      ['Trabajo grupal',10.5],
      ['Controles de lectura y ejercicios',17.5,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SPF115 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SFF118, https://www.udd.cl/wp-content/uploads/2025/11/sff118_fundamentos-filosoficos-de-la-psicologia.pdf
  // (subido el 2025-11-25). Bimestral. Parciales 70% × (70, 30) + examen 30%.
  'Fundamentos Filosóficos de la Psicología':{
    sigla:'SFF118',creditos:2,
    evals:[
      ['Certamen',49],
      ['Trabajo y/o ejercicio',21,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SFF118 (Psicología, bimestral). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SFS111, https://www.udd.cl/wp-content/uploads/2025/11/sfs111_fundamentos-epistemologicos-de-la-psicologia.pdf
  // (subido el 2025-11-25). Bimestral. Parciales 70% × (70, 30) + examen 30%.
  'Fundamentos Epistemológicos de la Psicología':{
    sigla:'SFS111',creditos:2,
    evals:[
      ['Certamen',49],
      ['Trabajo y/o ejercicio',21,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SFS111 (Psicología, bimestral). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SCC114, https://www.udd.cl/wp-content/uploads/2025/11/scc114_fundamentos-socioculturales-de-la-psicologia.pdf
  // (subido el 2025-11-25). Parciales 70% × (35, 35, 30) + examen 30%.
  'Fundamentos Socioculturales de la Psicología':{
    sigla:'SCC114',creditos:5,
    evals:[
      ['Certamen 1',24.5],
      ['Certamen 2',24.5],
      ['Controles de lectura y/o ejercicios prácticos',21,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SCC114 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SCA119, https://www.udd.cl/wp-content/uploads/2025/11/sca119-_coloquios-de-actualidad-en-psicologia.pdf
  // (subido el 2025-11-25). Parciales 70% × (30, 40, 15, 15) + examen 30%: la
  // bitácora (30%) es 15% de trabajo en el semestre y 15% de entrega final. El
  // programa dice "Créditos 6" sin SCT.
  'Coloquios de Actualidad en Psicología':{
    sigla:'SCA119',
    evals:[
      ['Certamen 1',21],
      ['Certamen 2',28],
      ['Bitácora: trabajo del semestre',10.5],
      ['Bitácora: entrega final',10.5],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SCA119 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // STS 122, https://www.udd.cl/wp-content/uploads/2025/11/sts-122_teorias-psicodinamicas-semestral.pdf
  // (subido el 2025-11-25). Semestral; el STS121 bimestral de 2023 traía otra
  // pauta. Presentación 70% × (35, 35, 30) + examen 30%.
  'Teorías Psicodinámicas':{
    sigla:'STS122',creditos:3,
    evals:[
      ['Certamen 1',24.5],
      ['Certamen 2',24.5],
      ['Trabajos y controles de lectura',21,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD STS122 (Psicología, semestral). Si tu curso es bimestral, su pauta es otra',REGLA_EXAMEN_UDD],
  },
  // SNC123, https://www.udd.cl/wp-content/uploads/2026/06/snc123_neurociencia_td.pdf
  // (subido el 2026-06-11). Parciales 70% × (35, 35, 10, 20) + examen 30%. Es
  // "Neurociencia", en singular: la malla publicada trae "Neurociencias" en
  // otro semestre, y Kinesiología tiene la suya.
  'Neurociencia':{
    sigla:'SNC123',creditos:5,
    evals:[
      ['Certamen 1',24.5],
      ['Certamen 2',24.5],
      ['Ejercicio de aprendizaje basado en problemas',7],
      ['Controles de lectura',14,{slots:4,slotLabel:'Control de lectura'}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SNC123 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // STH129, https://www.udd.cl/wp-content/uploads/2026/06/sth129_teorias-humanistas.pdf
  // (subido el 2026-06-11). Bimestral. Parciales 70% × (70, 30) + examen 30%.
  'Teorías Humanistas':{
    sigla:'STH129',creditos:2,
    evals:[
      ['Certamen',49],
      ['Trabajo',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD STH129 (Psicología, bimestral). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // STS210, https://www.udd.cl/wp-content/uploads/2025/11/sts210_teorias-sistemicas.pdf
  // (subido el 2025-11-25). Parciales 70% × (35, 35, 10, 20) + examen 30%.
  'Teorías Sistémicas':{
    sigla:'STS210',creditos:3,
    evals:[
      ['Certamen 1',24.5],
      ['Certamen 2',24.5],
      ['Controles de lectura',7,{slots:4,slotLabel:'Control de lectura'}],
      ['Análisis de caso',14],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD STS210 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SHI214, https://www.udd.cl/wp-content/uploads/2025/11/shi214_habilidades-profesionales-interpersonales.pdf
  // (subido el 2025-11-25). Parciales 70% × (60 los dos certámenes, 30, 10) +
  // examen 30%, que es un reporte escrito.
  'Habilidades Profesionales Interpersonales':{
    sigla:'SHI214',creditos:3,
    evals:[
      ['Certámenes',42,{slots:2,slotLabel:'Certamen'}],
      ['Trabajos prácticos en taller',21,{lista:true}],
      ['Autoevaluación',7],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SHI214 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SCA312, https://www.udd.cl/wp-content/uploads/2025/06/sca312.pdf (subido el
  // 2025-06-19). Parciales 70% × (30, 30, 15, 10, 15) + examen 30%.
  'Psicología Educacional en Contextos Actuales':{
    sigla:'SCA312',creditos:5,
    evals:[
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Trabajo grupal',10.5],
      ['Controles de lectura',7,{lista:true}],
      ['Ejercicios de aplicación',10.5,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SCA312 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // STC324, https://www.udd.cl/wp-content/uploads/2025/06/stc324.pdf (subido el
  // 2025-06-19). Parciales 70% × (55 los dos certámenes, 15, 30) + examen 30%.
  'Técnicas Cualitativas de Investigación en Psicología':{
    sigla:'STC324',creditos:5,
    evals:[
      ['Certámenes',38.5,{slots:2,slotLabel:'Certamen'}],
      ['Ejercicios y controles de lectura',10.5,{lista:true}],
      ['Proyecto de investigación',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD STC324 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SDN321, https://www.udd.cl/wp-content/uploads/2026/06/sdn321_diagnostico-neuropsicologico.pdf
  // (subido el 2026-06-11). Parciales 70% × (25, 25, 30, 20) + examen 30%.
  'Diagnóstico Neuropsicológico':{
    sigla:'SDN321',creditos:5,
    evals:[
      ['Certamen o avance 1',17.5],
      ['Certamen o avance 2',17.5],
      ['Informe',21],
      ['Controles de lectura y ejercicios',14,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SDN321 (Psicología). Revisa que corresponda a tu curso','Los certámenes pueden ser entregas de avance de la evaluación; el examen es la entrega final del informe',REGLA_EXAMEN_UDD],
  },
  // SDA423, https://www.udd.cl/wp-content/uploads/2026/06/sda423_diagnostico-psicologico-en-la-adultez.pdf
  // (subido el 2026-06-11). Parciales 70% × (30, 35, 15, 20) + examen 30%.
  'Diagnóstico Psicológico en la Adultez':{
    sigla:'SDA423',creditos:5,
    evals:[
      ['Certamen 1',21],
      ['Certamen 2',24.5],
      ['Ejercicios de entrevista e instrumentos',10.5,{lista:true}],
      ['Controles bibliográficos',14,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SDA423 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SPP425, https://www.udd.cl/wp-content/uploads/2026/06/spp425_politicas-publicas-y-problematicas-en-contextos-psicosociales.pdf
  // (subido el 2026-06-11). Parciales 70% × (25, 25, 30, 20) + examen 30%.
  'Políticas Públicas y Problemáticas en Contextos Psicosociales':{
    sigla:'SPP425',creditos:5,
    evals:[
      ['Certamen 1',17.5],
      ['Certamen 2',17.5],
      ['Trabajo grupal',21],
      ['Evaluación de proceso',14],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SPP425 (Psicología). Revisa que corresponda a tu curso','Uno de los certámenes es la entrega de avance del trabajo de investigación',REGLA_EXAMEN_UDD],
  },
  // SGE424, https://www.udd.cl/wp-content/uploads/2025/06/sge424.pdf (subido el
  // 2025-06-19). Parciales 70% × (30, 30, 15, 10, 15) + examen 30%.
  'Gestión del Cambio en la Institución Educativa':{
    sigla:'SGE424',creditos:5,
    evals:[
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Trabajo grupal',10.5],
      ['Controles de lectura',7,{lista:true}],
      ['Ejercicios de aplicación',10.5,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SGE424 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // SGO426, https://www.udd.cl/wp-content/uploads/2025/06/sgo426.pdf (subido el
  // 2025-06-19). Parciales 70% × (30, 30, 15, 10, 15) + examen 30%.
  'Gestión e Intervención en Organizaciones':{
    sigla:'SGO426',creditos:5,
    evals:[
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Trabajo grupal',10.5],
      ['Ayudantía y controles de lectura',7,{lista:true}],
      ['Análisis de casos',10.5,{lista:true}],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD SGO426 (Psicología). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD],
  },
  // ── Arquitectura ──
  // Sus programas no traen SCT ("Créditos 8"), así que estos ramos no los traen.
  // AAM113, https://www.udd.cl/wp-content/uploads/2026/07/aam113_componentes-de-la-matematica_2024.pdf
  // (subido el 2026-07-06). Presentación 70% × (30, 10, 30, 30) + examen 30%.
  'Componentes de la Matemática':{
    sigla:'AAM113',
    evals:[
      ['Ejercicios, controles y tareas',21,{lista:true}],
      ['Participación en ayudantía',7],
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD AAM113 (Arquitectura). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
  // AAH215, https://www.udd.cl/wp-content/uploads/2026/07/aah215_arquitectura-moderna-y-siglo-xx.pdf
  // (subido el 2026-07-06). Presentación 70% × (40, 30, 30) + examen 30%. El
  // programa lo titula "Arquitectura Moderna y Siglo XX"; va con el nombre de
  // la malla porque es su mismo ramo de 3°: Arquitectura publica programas y
  // malla del mismo plan, con los mismos nombres y semestres.
  'Arquitectura Moderna Siglo XX':{
    sigla:'AAH215',
    evals:[
      ['Tareas y entregas de lecturas',28,{lista:true}],
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD AAH215 (Arquitectura). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
  // AAS323, https://www.udd.cl/wp-content/uploads/2026/06/aas323_sustentabilidad.pdf
  // (subido el 2026-06-09). Presentación 70% × (40, 30, 30) + examen 30%.
  'Sustentabilidad':{
    sigla:'AAS323',
    evals:[
      ['Trabajos y tareas',28,{lista:true}],
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD AAS323 (Arquitectura). Revisa que corresponda a tu curso','Los dos certámenes son la entrega consolidada del trabajo de investigación',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
  // ATE322, https://www.udd.cl/wp-content/uploads/2026/06/ate322_diseno-y-laboratorio-estructural-sismo-resistencia.pdf
  // (subido el 2026-06-09). Presentación 70% × (20, 20, 30, 30) + examen 30%.
  'Diseño y Laboratorio Estructural: Sismoresistencia':{
    sigla:'ATE322',
    evals:[
      ['Ejercicios individuales',14,{lista:true}],
      ['Trabajo grupal',14],
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD ATE322 (Arquitectura). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
  // AAI412, https://www.udd.cl/wp-content/uploads/2026/06/aai412.pdf (subido el
  // 2026-06-09). Presentación 70% × (40, 30, 30) + examen 30%.
  'Instalaciones Constructivas':{
    sigla:'AAI412',
    evals:[
      ['Trabajos',28,{lista:true}],
      ['Certamen 1',21],
      ['Certamen 2',21],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD AAI412 (Arquitectura). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
  // AAA426, https://www.udd.cl/wp-content/uploads/2026/06/aaa426_-apreciacion-evaluacion-y-critica-arquitectonica.pdf
  // (subido el 2026-06-09). Presentación 70% × (30, 35, 35) + examen 30%.
  'Apreciación, Evaluación y Crítica Arquitectónica':{
    sigla:'AAA426',
    evals:[
      ['Ensayos y/o trabajos',21,{lista:true}],
      ['Certamen 1',24.5],
      ['Certamen 2',24.5],
      ['Examen',30],
    ],
    grupos:[EXAMEN_UDD],
    reglasDelCurso:['Programa UDD AAA426 (Arquitectura). Revisa que corresponda a tu curso',REGLA_EXAMEN_UDD,REGLA_ASISTENCIA_ARQ_UDD],
  },
};
