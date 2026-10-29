const PRESETS_UAI={
  // Fuente: Programa 2026 IIS CORE ESCR sec 6 y 7 (DOCX), tabla 6.3 y §6.4.
  // 75% presentación × (5,15,20,30,15,15) + 25% examen.
  // Análisis: 40/60 explícito. CC/Ensayo quedan consolidados: su reescritura
  // puede sustituir a la escritura; aplanarlos sin esa condición mentiría.
  'Escritura Argumentativa':{
    periodo:'2026-2',
    evals:[
      ['Test diagnóstico',3.75],
      ['Análisis de textos 1',4.5,{fecha:'2026-08-20'}],
      ['Análisis de textos 2',6.75,{fecha:'2026-08-27'}],
      ['Comentario crítico',15],
      ['Ensayo',22.5],
      ['Evaluación entre pares',11.25],
      ['Actividades y participación',11.25],
      ['Examen',25],
    ],
    reglasDelCurso:[
      'Programa UAI 2026-2 de Escritura Argumentativa, secciones 6 y 7. Revisa que corresponda a tu sección',
      'Test diagnóstico: ingresa la mejor nota entre el diagnóstico inicial y su reescritura',
      'Comentario crítico y Ensayo: ingresa la nota consolidada del curso, no una versión aislada. Cada uno combina esquema 10%, escritura 30% y reescritura 60%; si la reescritura llega a 6,3, reemplaza a la escritura sin cambiar el esquema',
      'Evaluación entre pares tiene dos instancias, pero el programa no fija su reparto. Ingresa la nota consolidada; lo mismo para Actividades y participación',
      'Se exige al menos 80% de asistencia. La eximición requiere estar en el 20% superior del curso, presentación de al menos 5,5 y todas las evaluaciones rendidas; la app no conoce el ranking',
    ],
  },
  // Fuente: 142134 (1).pdf, MAT124, pp. 1, 3–4. NPE=.1T+.2C+.7P;
  // sin eximición NF=.7NPE+.3EX. No se activa un recuperativo genérico: éste
  // requiere haber rendido el primer examen en la fecha indicada.
  'Matemáticas Avanzadas I':{
    periodo:'2026-2',creditos:6,
    eximicion:{evaluacion:'Examen',segun:['Talleres','Controles','Pruebas'],min:5,
      ignoraDescartes:true,comparaNotaOficial:true,sinAusenciasJustificadas:true,
      requierePautaOriginal:true},
    segundaFecha:{evaluacion:'Examen',finalMin:3.5,finalMax:3.9,requiereTodas:true,
      aviso:'Si rendiste el examen en la fecha indicada, consulta por el segundo examen. La app no calcula su resultado'},
    ausenciasJustificadas:{reemplazosCasilla:[
      {desde:'Talleres',desdeSlot:0,hacia:'Pruebas',haciaSlot:0},
      {desde:'Talleres',desdeSlot:1,hacia:'Pruebas',haciaSlot:1},
      {desde:'Talleres',desdeSlot:2,hacia:'Pruebas',haciaSlot:2},
      {desde:'Controles',desdeSlot:0,hacia:'Examen'},
      {desde:'Controles',desdeSlot:1,hacia:'Examen'},
      {desde:'Controles',desdeSlot:2,hacia:'Examen'},
      {desde:'Pruebas',desdeSlot:0,hacia:'Examen'},
      {desde:'Pruebas',desdeSlot:1,hacia:'Examen'},
      {desde:'Pruebas',desdeSlot:2,hacia:'Examen'},
    ]},
    evals:[
      ['Talleres',7,{slots:3,slotLabel:'Taller'}],
      ['Controles',14,{slots:3,slotLabel:'Control'}],
      ['Pruebas',49,{slots:3,slotLabel:'Prueba'}],
      ['Examen',30],
    ],
    noCalcula:[
      'Si apruebas el segundo examen, la final queda en 4,0; si lo repruebas, conservas la final anterior. La app solo avisa cuándo podrías rendirlo',
    ],
    reglasDelCurso:[
      'Programa MAT124 UAI 2026-2, sección 2, Santiago. Esta pauta calcula el camino con examen',
      'Si rendiste todas las pruebas y controles en sus fechas originales y obtienes al menos 4,0 en el examen, puedes reemplazar una prueba por el examen; no se otorga este beneficio con sanción de Honor',
    ],
  },
  // Fuente: Syllabus RCD I - 2do.pdf, MAT125, pp. 1, 3–4.
  // NF=.5(.7ET+.3PT)+.5(.7EP+.3PP); EP=.75C+.25Trabajo.
  // Trabajo queda en 8,75% con nota consolidada (informe30/Excel70): no se
  // redondean sus pesos internos 2,625/6,125 ni se los confunde con 30/70 final.
  'Razonamiento Cuantitativo con Datos I':{
    periodo:'2026-2',
    eximicion:{evaluaciones:['Examen teórico','Examen práctico'],etiqueta:'los exámenes teórico y práctico',
      segun:['Pruebas teóricas','Controles','Trabajo aplicado'],min:5,
      minimos:[{evaluaciones:['Pruebas teóricas'],min:4},
        {evaluaciones:['Controles','Trabajo aplicado'],min:4}],
      ignoraDescartes:true,comparaNotaOficial:true,sinAusenciasJustificadas:true,
      requierePautaOriginal:true,
      ocultaEvaluacion:true},
    ausenciasJustificadas:{reemplazosCasilla:[
      {desde:'Pruebas teóricas',desdeSlot:0,hacia:'Examen teórico'},
      {desde:'Pruebas teóricas',desdeSlot:1,hacia:'Examen teórico'},
      {desde:'Controles',desdeSlot:0,hacia:'Examen práctico'},
      {desde:'Controles',desdeSlot:1,hacia:'Examen práctico'},
      {desde:'Controles',desdeSlot:2,hacia:'Examen práctico'},
      {desde:'Controles',desdeSlot:3,hacia:'Examen práctico'},
      {desde:'Controles',desdeSlot:4,hacia:'Examen práctico'},
    ]},
    evals:[
      ['Pruebas teóricas',35,{slots:2,slotLabel:'Prueba'}],
      ['Controles',26.25,{slots:5,slotLabel:'Control'}],
      ['Trabajo aplicado',8.75],
      ['Examen teórico',15],
      ['Examen práctico',15],
    ],
    noCalcula:[
      'Tras rendir el examen, ET y EP deben ser al menos 4,0. Si no se cumple, el curso se reprueba con la menor de ET y EP; este promedio no aplica esa sustitución',
    ],
    reglasDelCurso:[
      'Programa MAT125 UAI 2026-2, cátedra de Macarena Larrain. Esta pauta calcula el camino con examen',
      'ET es el promedio de dos pruebas; EP es 75% promedio de cinco controles y 25% Trabajo aplicado',
      'En Trabajo aplicado ingresa su nota consolidada: 30% informe y 70% archivo Excel. Los trabajos no son justificables',
      'Si declaraste una ausencia justificada, tienes que rendir ambos exámenes y no puedes eximirte',
    ],
  },
  // Fuente: Syllabus Intro a la Microeconomía 2026_02.pdf, ECO122, pp.1,5–6.
  // No confundir con Micro FEN: éste no tiene mínimo de examen ni el
  // recuperativo 3,6–3,9 de FEN. El número/reparto de controles no está fijado.
  'Introducción a la Microeconomía':{
    periodo:'2026-2',creditos:6,
    reemplazosOptativos:[{tipo:'reemplazo',fuente:'Examen',destinos:['Prueba 1','Prueba 2'],
      rendidas:['Prueba 1','Prueba 2'],minFuente:4.8}],
    // ECO122 2026-2: una prueba justificada pasa su peso al examen. El
    // programa no define dos; el motor deja ese caso pendiente. El bloque
    // consolidado de controles y tareas sigue sin detalle por instancia.
    ausenciasJustificadas:{maxTraspasos:1,traspasos:[
      {desde:'Prueba 1',hacia:'Examen'},
      {desde:'Prueba 2',hacia:'Examen'},
    ]},
    evals:[
      ['Controles y tareas',20],
      ['Prueba 1',25],
      ['Prueba 2',25],
      ['Examen',30],
    ],
    noCalcula:[
      'Una ausencia justificada en un control o tarea se reemplaza por el examen, pero el bloque está consolidado y el programa no fija el peso de cada instancia. Con dos pruebas justificadas, el programa no define el destino de la segunda',
    ],
    reglasDelCurso:[
      'Programa ECO122 UAI 2026-2, sección 1, Viña del Mar. Revisa que corresponda a tu sección',
      'En Controles y tareas ingresa la nota consolidada que entrega el curso: el profesor decide la cantidad y el programa no desglosa sus pesos',
      'Se aprueba con promedio ponderado de al menos 3,95. El examen es obligatorio y no tiene nota mínima',
    ],
  },
  // Fuente: Syllabus_Programa Management Alumnos 2026_semestre 2.pdf,
  // MGT103, pp.1,3–4. Hay tres solemnes: la tercera NO es un examen adicional.
  'Management':{
    periodo:'2026-2',
    evals:[
      ['Solemne 1',20],
      ['Solemne 2',20],
      ['Solemne 3',20],
      ['Controles',25,{lista:true,dropLowest:{count:2},min:4,cap:3.9}],
      ['Tareas',15,{lista:true}],
    ],
    reglasDelCurso:[
      'Programa MGT103 UAI 2026-2, sección 2, Santiago. Revisa que corresponda a tu sección',
      'Al terminar los controles se eliminan las dos notas más bajas. Mientras agregas notas, el descarte y el promedio que muestra la app son una estimación parcial',
      'Para aprobar, el promedio de Controles debe ser al menos 4,0; si la final era aprobatoria y no cumples, queda en 3,9',
      'También se exige 75% de asistencia: si no la cumples, una final aprobatoria queda en 3,9. La app no conoce tu asistencia',
    ],
  },
  // Fuente: 03_08_2026_Syllabus Introducción a la Macroeconomía para webc -
  // 29-07-2026.pdf, ECO123, pp.1,4–6. "Al menos 8" no son 8 casillas;
  // "dos o tres" descartes no autoriza elegir una cantidad en dropLowest.
  'Introducción a la Macroeconomía':{
    periodo:'2026-2',creditos:6,
    // ECO123 2026-2: el examen reemplaza una prueba justificada. Una segunda
    // queda pendiente hasta que el curso confirme su tratamiento.
    ausenciasJustificadas:{maxReemplazos:1,reemplazos:[
      {desde:'Prueba oficial 1',hacia:'Examen final'},
      {desde:'Prueba oficial 2',hacia:'Examen final'},
      {desde:'Prueba oficial 3',hacia:'Examen final'},
    ]},
    evals:[
      ['Controles y otras evaluaciones',15],
      ['Prueba oficial 1',20],
      ['Prueba oficial 2',20],
      ['Prueba oficial 3',20],
      ['Examen final',25],
    ],
    noCalcula:['Con más de una prueba justificada, el programa no define cómo resolver las siguientes ausencias'],
    reglasDelCurso:[
      'Programa ECO123 UAI 2026-2, sección 03, Santiago. Revisa que corresponda a tu sección',
      'Ingresa el promedio consolidado de Controles y otras evaluaciones del curso: contempla al menos ocho evaluaciones y elimina dos o tres notas, sin fijar cuántas. Puede incluir participación con 50% de ese bloque a criterio del profesor',
      'El examen final es obligatorio',
    ],
  },
  // Syllabus oficial UAI 2026-2.
  //
  // El programa da los pesos en dos pisos: tres pruebas de cátedra pesan 70% de
  // la nota de presentación y tres controles el 30%, y esa nota de presentación
  // vale 70% contra un examen de 30%. Aplanado son 49 / 21 / 30, que es lo que
  // el modelo guarda.
  //
  // El "segundo examen" del reglamento —final entre 3,5 y 3,9 tras rendir el
  // examen, con opción de aprobar con 4,0— es exactamente la forma de
  // `recuperativo`, así que se declara y se calcula.
  'Matemáticas Avanzadas II':{
    periodo:'2026-2',
    recuperativo:{min:3.5,max:3.9,nota:4.0},
    reemplazosOptativos:[{tipo:'reemplazo',fuente:'Examen',destinos:['Pruebas'],
      rendidas:['Pruebas','Controles'],minFuente:4.0}],
    // `ignoraDescartes:true` es lo que hace que el motor la aplique: sin él
    // `estadoEximicion` devuelve null y el examen seguía pesando 30% aunque la
    // presentación pasara el 5,0 (reporte de un estudiante, 2026-09-25). Esta
    // pauta no tiene descartes, así que no cambia el cálculo de la presentación.
    eximicion:{evaluacion:'Examen',segun:['Pruebas','Controles'],min:5,ignoraDescartes:true,requiereConfirmacion:true,
      confirmar:'rendiste todas las pruebas y controles'},
    // El programa nombra a qué evaluación pasa la ausencia justificada, así que
    // se puede declarar: "la nota del control sea reemplazada por la del examen".
    ausenciasJustificadas:{
      reemplazos:[
        {desde:'Controles',hacia:'Examen'},
        {desde:'Pruebas',hacia:'Examen'},
      ],
    },
    evals:[
      ['Pruebas',49,{slots:3}],
      ['Controles',21,{slots:3}],
      ['Examen',30],
    ],
    reglasDelCurso:[
      'La eximición pide además haber rendido todas las evaluaciones; la app no sabe si una casilla vacía es una que no rendiste o una que no has ingresado',
    ],
  },
  // Syllabus oficial UAI 2026-2.
  //
  // Dos dimensiones que se aprueban POR SEPARADO: la nota teórica (pruebas) y
  // la práctica (laboratorios y trabajo grupal), cada una 50% de la nota de
  // presentación. "En caso de reprobar alguna de las dos áreas, la nota final
  // del curso corresponderá a la menor entre ambas" — eso es `group_min` con
  // `cap:'self'`, la misma regla que ya modela FEN.
  //
  // Aplanado, con examen: 0,5·(0,7·NT + 0,3·ET) + 0,5·(0,7·NP + 0,3·EP), y NP
  // repartido 75/25 entre laboratorios y trabajo. Da 35 / 26,25 / 8,75 / 15 /
  // 15, que son los MISMOS pesos que Razonamiento Cuantitativo con Datos I.
  //
  // "Pruebas" va SIN `slots`: el programa nunca dice cuántas son. Los
  // laboratorios sí —cinco, y cuentan los cuatro mejores.
  'Razonamiento Cuantitativo con Datos II':{
    periodo:'2026-2',
    eximicion:{evaluaciones:['Examen teórico','Examen práctico'],etiqueta:'los exámenes teórico y práctico',
      segun:['Pruebas','Laboratorios','Trabajo grupal'],min:5,
      minimos:[{evaluaciones:['Pruebas'],min:4},
        {evaluaciones:['Laboratorios','Trabajo grupal'],min:4}],
      ignoraDescartes:false,comparaNotaOficial:true,sinAusenciasJustificadas:true,
      requierePautaOriginal:true,
      requiereConfirmacion:true,confirmar:'rendiste todas las pruebas de la pauta',
      ocultaEvaluacion:true},
    evals:[
      ['Pruebas',35],
      ['Laboratorios',26.25,{slots:5,dropLowest:{count:1}}],
      ['Trabajo grupal',8.75],
      ['Examen teórico',15],
      ['Examen práctico',15],
    ],
    grupos:[
      {nombre:'Nota teórica',evals:['Pruebas','Examen teórico'],min:4.0,cap:'self'},
      {nombre:'Nota práctica',evals:['Laboratorios','Trabajo grupal','Examen práctico'],min:4.0,cap:'self'},
    ],
    reglasDelCurso:[
      'Una inasistencia justificada a prueba o laboratorio se reemplaza con la parte correspondiente del examen',
      'Si declaraste una inasistencia justificada, tienes que rendir los exámenes y no puedes eximirte',
    ],
  },
  // Programa oficial UAI 2026-2, CORE.
  //
  // OJO CON EL NOMBRE: el programa dice "Civilización Contemporánea II" y la
  // malla UAI tiene "Civilización Contemporánea", sin número, en primer
  // semestre. Se transcribe con el nombre del documento, que es el que manda.
  // Resultó que faltaba la II en la malla —el CORE dura dos semestres— y se
  // arregló allá: va en 2° de Ingeniería Comercial (mallas-uai.js).
  //
  // El documento se contradice sobre cuántas evaluaciones de lectura son: el
  // encabezado de la ponderación declara "cantidad: 10" y el cuerpo habla de
  // "las once evaluaciones semestrales". No se precargan casillas hasta que
  // la sección confirme cuál de las dos cantidades corresponde.
  'Civilización Contemporánea II':{
    periodo:'2026-2',
    evals:[
      ['Evaluaciones de lectura',32.5],
      ['Participación en clases',32.5],
      ['Ensayo breve escrito en clases',10],
      ['Examen',25],
    ],
    noCalcula:[
      'Te eximes del examen si tu nota de presentación te deja en el 20% superior del curso y además es al menos 5,5: la app no conoce las notas del resto del curso',
    ],
    reglasDelCurso:[
      'En Evaluaciones de lectura ingresa el promedio consolidado de tu sección: el programa dice 10 en la ponderación y 11 en el texto, así que no precargamos casillas',
      'El curso exige 80% de asistencia: bajo eso repruebas, con 3,9 si tu promedio era 4,0 o más, o con tu promedio si era 3,9 o menos. La app no registra asistencia',
    ],
  },
};

// Registro de contenido: sumar una universidad no exige replicar los cuatro
// selectores de pautas. UC conserva su restricción por carrera en el adaptador.
