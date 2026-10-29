// ─── PAUTAS UANDES ───────────────────────────────────────────────────────────
// Por ahora solo los cursos PEG (Programa de Estudios Generales), que toman
// estudiantes de todas las carreras. Fuente: la página oficial del Centro de
// Estudios Generales, uandes.cl/universidad/centro-de-estudios-generales/
// programas-de-estudios-generales/, "Cursos para el 2° Semestre 2026", que
// publica las ponderaciones de cada sección (NRC). Leída el 2026-10-05. Donde
// un curso tiene varias secciones, todas traen la misma pauta.
//
// Quedan fuera tres: "Aprender a Ver Cine" e "Investigación Biomédica" no
// publican ponderaciones, y "Tomás Moro: arte y libertad" trae la misma pauta Y
// la misma descripción que "Grandes Libros: Interioridad": parece un bloque
// copiado en la página, y antes de cargar una pauta dudosa, no se carga.
//
// "2 pruebas 70%" es un grupo de dos casillas que suma 70%. Cuando el texto no
// dice cuántas son ("Controles de lectura 45%"), va como lista abierta.
//
// Toda pauta con examen final lleva la compuerta del art. 27 del Reglamento del
// Alumno: solo da examen quien tiene 3,0 de presentación "sin aproximación"
// (`exacto:true`), y si no, reprueba con su nota de presentación (`cap:'self'`,
// como lo explica la Facultad de Educación en sus "Consideraciones acerca de la
// evaluación"). "Ensayo o examen final" no la lleva: con ensayo no hay examen.
const PRESETS_UANDES={
  // ── Teología III ──
  'Creación y Cuidado del Mundo':{
    periodo:'2026-2',
    evals:[
      ['Reseña final clase a clase',40],
      ['Prueba 1',30],
      ['Prueba 2',30],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 7729. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Desafíos Sociales del Cristianismo':{
    periodo:'2026-2',
    evals:[
      ['Evaluación 1',25],
      ['Evaluación 2',25],
      ['Evaluación 3',30],
      ['Participación y actividades en clases',20],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 4373. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'La Iglesia':{
    periodo:'2026-2',
    evals:[
      ['Control 1',30],
      ['Control 2',35],
      ['Control 3',35],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 6375. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Los Vicios Capitales':{
    periodo:'2026-2',
    evals:[
      ['Ensayos',70,{slots:2,slotLabel:'Ensayo'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Ensayos'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 2199, 7944. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Mundo: Realidad Divina':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:2,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 4135, 6719. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Padres de la Iglesia':{
    periodo:'2026-2',
    evals:[
      ['Prueba',25],
      ['Control de lectura',25],
      ['Análisis de textos en clase',20],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Prueba', 'Control de lectura', 'Análisis de textos en clase'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 7818. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Mundo, Trabajo y Redención':{
    periodo:'2026-2',
    evals:[
      ['Bitácoras',35,{lista:true}],
      ['Tareas semanales',35,{lista:true}],
      ['Ensayo o examen final',30],
    ],
    noCalcula:['Puedes elegir entre ensayo y examen final. Con ensayo la nota máxima del curso es 6,0; con examen, 7,0. Este promedio no aplica ese tope'],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 5440. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Actualidad y Fe':{
    periodo:'2026-2',
    evals:[
      ['Asistencia y participación',35],
      ['Ensayo',35],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Asistencia y participación', 'Ensayo'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 7728. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Lectura del Apocalipsis':{
    periodo:'2026-2',
    evals:[
      ['Control de lectura 1',20],
      ['Control de lectura 2',20],
      ['Prueba',20],
      ['Examen oral',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Control de lectura 1', 'Control de lectura 2', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Teología III), NRC 6726. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  // ── Arte y Literatura ──
  'Apreciación de la Arquitectura':{
    periodo:'2026-2',
    evals:[
      ['Controles',60,{slots:3,slotLabel:'Control'}],
      ['Examen',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Controles'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 5417. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Apreciación de la Pintura Occidental':{
    periodo:'2026-2',
    evals:[
      ['Control',50],
      ['Examen',50],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Control'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 5320. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Arte y Cultura Griega':{
    periodo:'2026-2',
    evals:[
      ['Seminarios socráticos',40,{slots:4,slotLabel:'Seminario socrático'}],
      ['Prueba',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Seminarios socráticos', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1659. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Cuento de Fantasía y Ficción':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:2,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6362. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'De Bach al Rock':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:2,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1653. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Genios del Arte':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:3,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6358. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Poesía y Experiencia Humana':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:2,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1658. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Revolución Artística del Renacimiento':{
    periodo:'2026-2',
    evals:[
      ['Seminarios socráticos',40,{slots:4,slotLabel:'Seminario socrático'}],
      ['Prueba',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Seminarios socráticos', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 1660. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'El Impresionismo':{
    periodo:'2026-2',
    evals:[
      ['Control',50],
      ['Examen',50],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Control'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6702. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'La Belleza en el Arte':{
    periodo:'2026-2',
    evals:[
      ['Bitácoras',40,{slots:12,slotLabel:'Bitácora'}],
      ['Trabajo final grupal',40],
      ['Crítica de arte',20],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 7933. Revisa que corresponda a tu sección', 'Se exige al menos 75% de asistencia'],
  },
  'Grandes Libros: Interioridad (EDU)':{
    periodo:'2026-2',
    evals:[
      ['Cuestionarios semanales',25,{lista:true}],
      ['Participación',25],
      ['Prácticas para el ensayo final',20],
      ['Examen final',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Cuestionarios semanales', 'Participación', 'Prácticas para el ensayo final'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 7738, 7740, 7739. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen final y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Vanguardias Artísticas del Siglo XX':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',70,{slots:3,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Arte y Literatura), NRC 6360. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  // ── Ciencias ──
  'Astronomía':{
    periodo:'2026-2',
    evals:[
      ['Cuestionarios',14,{lista:true}],
      ['Controles de lectura',35,{slots:2,slotLabel:'Control de lectura'}],
      ['Trabajo',21],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Cuestionarios', 'Controles de lectura', 'Trabajo'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 6361, 1614. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Biología Acuática':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',60,{slots:3,slotLabel:'Prueba'}],
      ['Examen',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 1608. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  // "Chat GTP" es como lo escribe la página oficial; así se busca en Banner.
  'De la Imprenta a Chat GTP':{
    periodo:'2026-2',
    evals:[
      ['Controles',40,{slots:2,slotLabel:'Control'}],
      ['Participación',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Controles', 'Participación'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 6367. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandes Teoremas Matemáticos':{
    periodo:'2026-2',
    evals:[
      ['Controles de lectura',50,{slots:2,slotLabel:'Control de lectura'}],
      ['Actividades semanales',20,{lista:true}],
      ['Prueba',30],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 6441. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Hacia el Espacio':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',50,{slots:2,slotLabel:'Prueba'}],
      ['Presentación noticia',10],
      ['Examen final',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas', 'Presentación noticia'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 7731. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen final y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'El Mundo visto desde la Ciencia':{
    periodo:'2026-2',
    evals:[
      ['Control de lectura',30],
      ['Actividades semanales',30,{lista:true}],
      ['Prueba',40],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 1610. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  // 70% sin cantidad de evaluaciones: pautaPresetSuficiente no la carga.
  'Sismología y Vulcanología':{
    periodo:'2026-2',
    evals:[
      ['Evaluación clase a clase',70,{lista:true}],
      ['Trabajo final',30],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 6365. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  // 70% sin cantidad de evaluaciones: pautaPresetSuficiente no la carga.
  'Textos de Grandes Científicos':{
    periodo:'2026-2',
    evals:[
      ['Bitácoras',35,{lista:true}],
      ['Tareas semanales',35,{lista:true}],
      ['Ensayo o examen final',30],
    ],
    noCalcula:['Puedes elegir entre ensayo y examen final. Con ensayo la nota máxima del curso es 6,0; con examen, 7,0. Este promedio no aplica ese tope'],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 1606. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Zoología':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',60,{slots:3,slotLabel:'Prueba'}],
      ['Examen',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 5392. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  // "70% (3 pruebas 90%, asistencia y participación 10%), examen 30%": 0,7×90 = 63 y 0,7×10 = 7.
  'Cambio Climático':{
    periodo:'2026-2',
    evals:[
      ['Pruebas',63,{slots:3,slotLabel:'Prueba'}],
      ['Asistencia y participación',7],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Pruebas', 'Asistencia y participación'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 7743. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandes Expediciones Científicas':{
    periodo:'2026-2',
    evals:[
      ['Evaluaciones',100,{slots:4,slotLabel:'Evaluación'}],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 7934. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Problemáticas Urbanas':{
    periodo:'2026-2',
    evals:[
      ['Trabajos grupales',60,{slots:3,slotLabel:'Trabajo grupal'}],
      ['Trabajos individuales',40,{lista:true}],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 6464. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  'Reconocimiento Natural de la Fertilidad':{
    periodo:'2026-2',
    evals:[
      ['Trabajo: avance',20],
      ['Entrega final de trabajo y reflexión escrita',80],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Ciencias), NRC 7747. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  // ── Historia y Actualidad ──
  'Actualidad Internacional':{
    periodo:'2026-2',
    evals:[
      ['Trabajo de investigación',70,{slots:2,slotLabel:'Entrega'}],
      ['Controles',30,{slots:3,slotLabel:'Control'}],
    ],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 4011. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia'],
  },
  // 60% sin cantidad de evaluaciones: pautaPresetSuficiente no la carga.
  'Arte y Política':{
    periodo:'2026-2',
    evals:[
      ['Tareas',50,{lista:true}],
      ['Controles',10,{lista:true}],
      ['Examen (trabajo)',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Tareas', 'Controles'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 5372. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen (trabajo) y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandeza y Decadencia de Roma':{
    periodo:'2026-2',
    evals:[
      ['Trabajos',40,{slots:2,slotLabel:'Trabajo'}],
      ['Ensayo',20],
      ['Examen (ensayo)',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Trabajos', 'Ensayo'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6693. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen (ensayo) y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandes Batallas de la Humanidad':{
    periodo:'2026-2',
    evals:[
      ['Control de lectura 1',20],
      ['Control de lectura 2',20],
      ['Prueba de materia',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Control de lectura 1', 'Control de lectura 2', 'Prueba de materia'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1672. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandes Exploradores':{
    periodo:'2026-2',
    evals:[
      ['Controles de lectura',45,{slots:3,slotLabel:'Control de lectura'}],
      ['Prueba',25],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Controles de lectura', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1671. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Grandes Visiones de la Historia':{
    periodo:'2026-2',
    evals:[
      ['Participación',10],
      ['Ensayos',60,{slots:2,slotLabel:'Ensayo'}],
      ['Examen oral',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Participación', 'Ensayos'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6366. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'La Guerra del Pacífico':{
    periodo:'2026-2',
    evals:[
      ['Control de lectura 1',20],
      ['Control de lectura 2',20],
      ['Prueba de materia',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Control de lectura 1', 'Control de lectura 2', 'Prueba de materia'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6369. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Mitología Europea':{
    periodo:'2026-2',
    evals:[
      ['Controles de lectura',45,{lista:true}],
      ['Prueba',25],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Controles de lectura', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1676. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Historia de las Revoluciones':{
    periodo:'2026-2',
    evals:[
      ['Taller',20],
      ['Ensayos',50,{slots:2,slotLabel:'Ensayo'}],
      ['Examen oral',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Taller', 'Ensayos'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7734. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen oral y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Los Terremotos en Chile':{
    periodo:'2026-2',
    evals:[
      ['Bitácora',20],
      ['Control',35],
      ['Participación',10],
      ['Examen (trabajo final)',35],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Bitácora', 'Control', 'Participación'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7733. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen (trabajo final) y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  // "1 evaluación 10%, 3 evaluaciones 20% y examen 30%": 20% cada una es la única lectura que suma 100.
  'El mundo después de Roma':{
    periodo:'2026-2',
    evals:[
      ['Primera evaluación',10],
      ['Evaluaciones',60,{slots:3,slotLabel:'Evaluación'}],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Primera evaluación', 'Evaluaciones'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7735. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'De Emperatrices a Reinas':{
    periodo:'2026-2',
    evals:[
      ['Solemne 1',20],
      ['Control de lectura 1',10],
      ['Control de lectura 2',10],
      ['Trabajo',20],
      ['Examen',40],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Solemne 1', 'Control de lectura 1', 'Control de lectura 2', 'Trabajo'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 7936. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Héroes de la Historia de Chile':{
    periodo:'2026-2',
    evals:[
      ['Controles de lectura',45,{slots:3,slotLabel:'Control de lectura'}],
      ['Prueba',25],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Controles de lectura', 'Prueba'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 1674. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
  'Revelando el Nuevo Mundo':{
    periodo:'2026-2',
    evals:[
      ['Taller de análisis de fuentes 1',20],
      ['Taller de análisis de fuentes 2',20],
      ['Actividades y participación en clase',30],
      ['Examen',30],
    ],
    grupos:[{nombre:'Presentación a examen',evals:['Taller de análisis de fuentes 1', 'Taller de análisis de fuentes 2', 'Actividades y participación en clase'],min:3.0,cap:'self',exacto:true}],
    reglasDelCurso:['PEG UAndes 2° semestre 2026 (Historia y Actualidad), NRC 6433. Revisa que corresponda a tu sección', 'Se exige al menos 60% de asistencia', 'Con presentación bajo 3,0, sin aproximación, no puedes dar examen y repruebas con esa nota (Reglamento del Alumno, art. 27)'],
  },
};
