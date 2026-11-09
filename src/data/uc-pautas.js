
// ─── PRESETS UC (ponderaciones oficiales 2026-2) → auto-carga de secciones ───
// El formato antiguo puede ser directamente `evals`; los programas con fechas,
// compuertas o reglas usan {evals, grupos, noCalcula, reglasDelCurso}. Un 3er
// elemento {min,cap} marca un PISO de aprobación en esa sección (regla
// min_grade_required): si su nota < min, la final se topa en cap.
// Caso real: el Podcast de FIL2001. El piso lo aplica ramoAvg vía r.gates.
// ING1004 (Desafíos de la Ingeniería) estuvo fuera porque su requisito es por
// bloque (Individual/Grupal). Desde que existe `grupos` con tope numérico, cabe:
// ver su entrada más abajo.
// QUÉ REGLA SE MUESTRA Y CUÁL NO. Transcribimos el programa completo, pero no
// se muestra completo: una tarjeta con doce reglas no se lee, y lo que importa
// queda enterrado entre normativa que es igual en toda la universidad.
//
// Se muestra una regla solo si el estudiante PUEDE HACER ALGO con ella y eso
// CAMBIA SU NÚMERO: décimas que se ganan asistiendo, una eximición que se
// alcanza, un tope que se evita entregando algo a tiempo.
//
// No se muestran:
//   · Disciplina y formato — copia, Turnitin, lápiz pasta, letra legible,
//     celulares, registrar la asistencia. Es el reglamento de la universidad,
//     no la pauta del ramo, y no cambia cómo se calcula tu promedio.
//   · Contingencias automáticas — "si faltas justificadamente a una
//     interrogación, esa nota se reemplaza por la del examen". No la eliges y
//     no puedes prepararla; a quien le pase se entera por su profesor.
//   · Lo que solo describe el curso — "no hay eximición del examen final".
//
// Lo que se saca de acá NO se pierde: sigue en el programa oficial, y el ramo
// muestra "Compáralo con la pauta del curso" justamente por eso.
// `periodo` pertenece al PRESET, no a cada evaluación: las ponderaciones
// suelen seguir sirviendo después, pero las fechas solo se precargan mientras
// ese período siga vigente. Si un programa no declara el período, se omite el
// campo y la app conserva los pesos sin presentar sus fechas como actuales.
const PRESETS_UC={
  // MAT1610, programa 2026-1: la primera interrogación justificada toma la
  // nota del examen; las siguientes se recuperan con pruebas especiales (P).
  'Cálculo I':{
    evals:[['Interrogación 1',20],['Interrogación 2',20],['Interrogación 3',20],['Laboratorio',10,{slots:3}],['Examen',30]],
    ausenciasJustificadas:{maxReemplazos:1,excesoReemplazos:'rezago',reemplazos:[
      {desde:'Interrogación 1',hacia:'Examen'},
      {desde:'Interrogación 2',hacia:'Examen'},
      {desde:'Interrogación 3',hacia:'Examen'},
    ]},
  },
  'Álgebra Lineal':[['Interrogación 1',20],['Interrogación 2',20],['Interrogación 3',20],['Laboratorio',10,{slots:3}],['Examen',30]],
  // Ingeniería Comercial · 2° semestre. Transcripción de la pauta 2026-2
  // confirmada por Lucas el 17-08-2026. La regla de aprobación de Álgebra
  // aparece cortada en la fuente, así que no se modela ni se muestra.
  'Introducción al Álgebra Lineal':[
    ['Interrogación 1',20],['Interrogación 2',25],['Interrogación 3',25],['Examen',30],
  ],
  // Entendiendo a Rusia: Historia, Cultura y Presente del Gigante Eurasiatico
  // (IHI0534). No tenemos el programa: Lucas la confirmó el 27-09-2026 a partir
  // de dos reportes que dan los mismos pesos escritos distinto — afiche 30%,
  // cinco discusiones bibliográficas de 6% cada una y prueba 40%.
  'Entendiendo a Rusia: Historia, Cultura y Presente del Gigante Eurasiatico':{
    sigla:'IHI0534',
    evals:[
      ['Afiche académico',30],
      ['Discusiones bibliográficas',30,{slots:5,slotLabel:'Discusión bibliográfica'}],
      ['Prueba escrita',40],
    ],
  },
  // Biología de Organismos y Comunidades (BIO110C). No tenemos el programa:
  // Lucas la confirmó el 26-09-2026 a partir del reporte de un estudiante que
  // conoce, y coincide con otros cuatro reportes independientes: 5 controles
  // de 4% cada uno, 3 interrogaciones de 20% y 4 talleres de 5% cada uno.
  'Biología de Organismos y Comunidades':{
    sigla:'BIO110C',
    evals:[
      ['Controles',20,{slots:5,slotLabel:'Control'}],
      ['Interrogación 1',20],['Interrogación 2',20],['Interrogación 3',20],
      ['Talleres',20,{slots:4,slotLabel:'Taller'}],
    ],
  },
  // Distribución y nombres confirmados por Lucas el 12-09-2026 a partir de
  // información entregada por un estudiante que está cursando estos ramos.
  'Introducción a la Macroeconomía':[
    ['Control 1',16,{nombresAnteriores:['C1']}],
    ['Prueba 1',22,{nombresAnteriores:['P1']}],
    ['Prueba 2',22,{nombresAnteriores:['P2']}],
    ['Parte del profesor',10,{nombresAnteriores:['PP']}],
    ['Examen',30],
  ],
  'Probabilidad y Estadística':[
    ['Control 1',10,{nombresAnteriores:['C1']}],
    ['Control 2',10,{nombresAnteriores:['C2']}],
    ['Control 3',10,{nombresAnteriores:['C3']}],
    ['Prueba 1',20,{nombresAnteriores:['P1']}],
    ['Prueba 2',20,{nombresAnteriores:['P2']}],
    ['Controles sorpresa',5,{slots:3,slotLabel:'Control sorpresa',nombresAnteriores:[
      {nombre:'Control sorpresa 1',slot:0},
      {nombre:'Control sorpresa 2',slot:1},
      {nombre:'Control sorpresa 3',slot:2},
    ]}],
    ['Examen',25],
  ],
  // Los pesos son del programa (QIM100E V2); las cantidades no las dice. Son 2
  // interrogaciones —la planilla oficial de notas trae I1 e I2 al 45% de
  // Pruebas— y 5 informes, 5 controles y 5 talleres según dos reportes de
  // estudiantes con esta misma pauta (2026-10-13). Decisión de Lucas: un
  // reporte que coincide en pesos completa las cantidades.
  'Química para Ingeniería':[
    ['Pruebas',44.1,{slots:2,slotLabel:'Interrogación'}],['Ev. de Taller',4.9,{slots:5,slotLabel:'Taller'}],['Examen',21],
    ['Informes',18,{slots:5,slotLabel:'Informe'}],['Controles',12,{slots:5,slotLabel:'Control'}],
  ],
  // Programa FIL2001 (Primer Semestre 2026): 30/20/30/20 y el Podcast bajo 4,0
  // es "causal de reprobación del curso, independientemente del promedio";
  // como no dice con qué nota, va el 3,9 de siempre. La asistencia mínima pasa
  // el filtro de reglas visibles: el estudiante puede cumplirla y cambia su nota.
  'Filosofía: ¿para qué?':{
    evals:[['Prueba 1',30],['Ejercicio de análisis',20],['Prueba 2',30],['Podcast',20,{min:4.0,cap:3.9}]],
    reglasDelCurso:[
      'Necesitas al menos 75% de asistencia a clases: si no, el curso queda con nota R, que equivale a 3,0. La app no registra asistencia',
    ],
  },
  // Desafíos de la Ingeniería · ING1004 · programa del Primer Semestre 2026.
  // Dos bloques de 50% que se aprueban por separado: "Para aprobar el curso es
  // requisito poseer un promedio ponderado tanto en la evaluación individual
  // como en la grupal superior o igual a 4,0. Si se reprueba una de las dos
  // instancias la nota de reprobación será el mínimo entre la nota obtenida y
  // un 3,9" → dos `grupos` con tope 3,9.
  //   Individual 50%: Participación en talleres 15%, 4 tareas de 15% cada una
  //     (60%) y Actividades/cuestionarios 25%.
  //   Grupal 50%: Presentaciones 1-3 de 20% cada una (60%), Pre-Feria 15% y
  //     Feria Tecnológica 25%.
  // Aplanado: 7,5 / 30 (4×7,5) / 12,5 / 30 (3×10) / 7,5 / 12,5. Un reporte de
  // 2026-2 da los mismos pesos con 3 casillas de tareas; el programa dice 4.
  // Las actividades en clase no dicen cuántas son: van como lista.
  'Desafíos de la Ingeniería':{
    sigla:'ING1004',periodo:'2026-1',
    evals:[
      ['Participación en talleres',7.5],
      ['Tareas',30,{slots:4,slotLabel:'Tarea'}],
      ['Actividades y cuestionarios',12.5,{lista:true}],
      ['Presentaciones',30,{slots:3,slotLabel:'Presentación'}],
      ['Pre-Feria',7.5],
      ['Feria Tecnológica',12.5],
    ],
    grupos:[
      {nombre:'Evaluación individual',evals:['Participación en talleres','Tareas','Actividades y cuestionarios'],min:4.0,cap:3.9},
      {nombre:'Evaluación grupal',evals:['Presentaciones','Pre-Feria','Feria Tecnológica'],min:4.0,cap:3.9},
    ],
    noCalcula:[
      'Si en tres de las cuatro evaluaciones de pares quedas bajo el promedio de tu equipo, repruebas con el mínimo entre tu nota y 3,9',
    ],
    reglasDelCurso:[
      'Las notas de las Presentaciones y de la Feria se ajustan según tu evaluación de pares: ingresa la nota ya ajustada',
      'Si no asistes sin justificación a la Actividad de Trabajo Grupal que sigue a una tarea, esa tarea queda con nota máxima 4,0',
      'Contestar el 90% de los cuestionarios te permite borrar una ausencia o atraso a las presentaciones',
      'Faltar sin justificación a una presentación te deja con la mitad de la nota de tu equipo',
      'Un grupo que no entrega su archivo presenta sin apoyo audiovisual y queda con nota máxima 4,0',
    ],
  },
  'Introducción a la Programación':{
    periodo:'2026-2',
    evals:[
      ['Interrogación 1',15,{fecha:'2026-09-24'}],['Interrogación 2',20,{fecha:'2026-10-22'}],['Examen',30,{fecha:'2026-12-10'}],
      // La agenda del curso publica inicio y fin de cada tarea. La evaluación
      // es la entrega, por eso Agenda recibe el cierre y no el hito de apertura.
      ['Tarea 1',5,{fecha:'2026-10-02'}],['Tarea 2',5,{fecha:'2026-10-27'}],['Tarea 3',5,{fecha:'2026-11-27'}],
      ['Nota de participación',16],
      // "Uso responsable de IA: cómo se evalúa" (2026-2): el 4% son dos notas
      // de 2%. Cápsulas es una sola nota sobre las 18 preguntas de los 6 videos;
      // Talleres, una sola sobre las 6 preguntas de los 2 talleres —no hay nota
      // por taller—. Estaba como un solo "Talleres" al 4%: quien anotaba su nota
      // de talleres la hacía pesar el doble y las cápsulas no tenían dónde ir.
      // Dos casillas iguales de un 4% son exactamente dos notas de 2%.
      ['Trabajos de Inteligencia Artificial',4,{slots:2,nombresCasillas:['Cápsulas','Talleres'],
        nombresAnteriores:[{nombre:'Talleres de Inteligencia Artificial',slot:1}]}],
    ],
    // La pauta que publicamos mal: quien la tenga tal cual se corrige al
    // cargar, sin preguntar (ver `corrigePautas` en normalize()). Una nota ya
    // escrita en el Talleres de antes pasa a la casilla Talleres.
    corrigePautas:[[
      ['Interrogación 1',15],['Interrogación 2',20],['Examen',30],['Tarea 1',5],['Tarea 2',5],['Tarea 3',5],
      ['Nota de participación',16],['Talleres de Inteligencia Artificial',4],
    ]],
    grupos:[{nombre:'Evaluaciones principales',evals:['Interrogación 1','Interrogación 2','Examen'],min:4.0,cap:3.9}],
    // Sin reglas visibles: el programa solo trae la sustitución automática por
    // inasistencia justificada y la sanción por no registrar asistencia.
    // Ninguna de las dos es algo que el estudiante pueda usar a su favor.
  },
  'Principios Ecológicos y Medio Ambiente':{
    sigla:'BIO143M',
    // El calendario 2026-2 la nombra "Biología"; sus I1, I2 e I3 calzan con
    // las tres Pruebas del programa. Se conserva el nombre oficial del curso.
    // Lucas confirmó el 2026-08-24 que son el mismo ramo: no es una inferencia
    // por parecido de nombres, así que estas fechas no se "corrigen" sin hablar
    // con él primero.
    periodo:'2026-2',
    evals:[
      ['Prueba 1',25,{fecha:'2026-09-01'}],
      ['Prueba 2',40,{fecha:'2026-11-03'}],
      ['Prueba 3',35,{fecha:'2026-12-01'}],
    ],
    // Programa 2026-2: los talleres "son instancias para sumar décimas (5
    // décimas máximo) a la nota final, sólo para los estudiantes que tengan
    // nota superior a 4.0 en las interrogaciones respetando la ponderación
    // final de estas". Superior: 4,0 justo no alcanza.
    bonus:[
      {id:'talleres',pregunta:'Décimas de talleres',entrada:'decimas',max:5,a:'final',
        si:{evals:['Prueba 1','Prueba 2','Prueba 3'],mayorQue:4.0},
        ayuda:'Si tu promedio ponderado de las Pruebas supera 4,0, las décimas que ganes en los talleres se suman a tu nota final, con un máximo de 5 décimas'},
    ],
  },
  // Biología de la Célula · BIO141C · secciones 4 y 5 · programa oficial
  // 2026-2. Los porcentajes de Interrogaciones, Talleres, Trabajos prácticos y
  // Trabajo grupal forman la nota de presentación; esa nota vale 70% y el
  // Examen final el 30% restante. Los pesos de abajo son ese producto exacto.
  //
  // El programa confirma tres Interrogaciones y dos Trabajos prácticos, pero
  // no reparte su porcentaje interno. Se mantienen como categorías con
  // casillas, en vez de inventar tercios. Tampoco se precargan las fechas de
  // las Interrogaciones: asociar una fecha única a una categoría agrupada sería
  // presentar como cierta una división que el documento no declara.
  'Biología de la Célula':{
    sigla:'BIO141C',
    periodo:'2026-2',
    creditos:10,
    evals:[
      ['Interrogaciones',45.5,{slots:3,slotLabel:'Interrogación'}],
      ['Talleres',14,{lista:true}],
      ['Trabajos prácticos',7,{slots:2,slotLabel:'Trabajo práctico'}],
      ['Trabajo grupal',3.5],
      ['Examen final',30],
    ],
    // La app puede comprobar la presentación y los mínimos de notas, pero no
    // sabe cuántos Talleres faltó la persona ni cuántos controles habrá. Por
    // eso llegar al 5,0 solo OFRECE la eximición: el estudiante confirma que
    // ingresó todo y que cumple la asistencia antes de sacar el Examen.
    eximicion:{
      evaluacion:'Examen final',
      segun:['Interrogaciones','Talleres','Trabajos prácticos','Trabajo grupal'],
      min:5,
      ignoraDescartes:true,
      requiereConfirmacion:true,
      confirmar:'cumples la asistencia de Taller exigida por tu sección',
      ocultaEvaluacion:true,
      minimos:[
        {evaluacion:'Interrogaciones',min:4,cadaNota:true},
        {evaluacion:'Talleres',min:4},
      ],
    },
    noCalcula:[
      'Con 100% de los controles de Taller puedes eliminar la peor nota, pero el programa no especifica cuántos controles habrá durante el semestre',
      'El Examen es reprobatorio bajo las condiciones de Interrogaciones y Talleres que define el programa, pero no publica la fórmula con que se transforma esa situación en la nota final',
    ],
  },
  // Formación General UC · programa recibido con el nombre de archivo
  // "CFG FON 104", pero el propio documento declara la sigla como pendiente.
  // Por eso la pauta se encuentra por nombre y no se inventa un código para la
  // búsqueda o el consenso. El cronograma viene fechado en 2025 aunque el
  // archivo se titula 2024: sus porcentajes sirven como estructura, pero esas
  // fechas no son una pauta vigente y no se cargan en Agenda.
  'Fundamentos Básicos de Cultura Sorda y Lengua de Señas Chilena':{
    sigla:'FON104',
    creditos:10,
    evals:[
      ['Deletreo manual',10],
      ['Exposición grupal Cultura Sorda',20],
      ['Diálogo en parejas LSCh',15],
      ['Conversación con Instructor Sordo',15],
      ['Proyecto final grupal (A+S)',30],
      ['Participación: autoevaluación',5],
      ['Participación: coevaluación',5],
    ],
  },
  // Formación General UC · LET202G-1 · programa de la edición especial
  // Santiago Negro recibido en septiembre de 2026. El diagnóstico vale 0% y
  // queda fuera de la pauta. El documento enumera tres controles, pero no les
  // asigna porcentajes distintos: se modelan como tres casillas de un mismo
  // bloque de 30%, no como tres 10% inventados. No trae calendario de fechas.
  'El misterioso caso del curso de ficción policial (Edición especial Santiago Negro)':{
    creditos:10,
    evals:[
      ['Controles de lectura',30,{slots:3,slotLabel:'Control'}],
      ['Exposiciones orales',15],
      ['Co evaluación',10],
      ['Participación en foros',15],
      ['Dossier Santiago Negro',30],
    ],
    reglasDelCurso:[
      'Necesitas asistir al menos al 75% de las clases; el programa indica que no cumplirlo reprueba el curso',
    ],
  },
  // Formación General UC · TSL-596 · programa oficial 2026-2. La infografía
  // y las presentaciones se realizan en más de una sesión; el programa no
  // asigna una fecha individual a cada estudiante, así que no se fuerza una
  // fecha falsa en Agenda. El Ensayo personal sí tiene una entrega única.
  'Ciudadanía y Derechos humanos: Enfoques interdisciplinarios':{
    periodo:'2026-2',
    creditos:10,
    evals:[
      ['Infografía',30],
      ['Ensayo personal',30,{fecha:'2026-10-27'}],
      ['Presentaciones orales',30],
      ['Actividades asincrónicas',10],
    ],
    reglasDelCurso:[
      'Necesitas rendir todas las evaluaciones y tener al menos 60% de asistencia; la app no registra asistencia',
    ],
  },
  // Los pesos y las fechas salen del programa clase a clase (MAT1620-2026-S2),
  // no del documento de normativa: ese es solo reglamento y no publica ninguna
  // ponderación. Las cuatro fechas caen lunes en 2026, como dice el programa.
  //
  // El Laboratorio pesa 10% y son 3, igual que en Cálculo I. Ojo: eso NO sale
  // del programa clase a clase —ahí dice "Laboratorio (10%)" y nada más—, lo
  // confirmó Lucas. Queda anotado porque si mañana alguien lo contrasta contra
  // el PDF no lo va a encontrar y va a creer que es un número inventado.
  //
  // Sin reglas visibles a propósito: las de la normativa son sustituciones
  // automáticas por inasistencia justificada y sanciones de disciplina, y
  // ninguna pasa el filtro de arriba.
  'Cálculo II':{
    periodo:'2026-2',
    // Normativa MAT1620 2026-2, punto 9: una justificada toma el examen;
    // con dos o tres, solo la primera y las demás quedan en nota P pendiente.
    ausenciasJustificadas:{maxReemplazos:1,excesoReemplazos:'rezago',reemplazos:[
      {desde:'Interrogación 1',hacia:'Examen'},
      {desde:'Interrogación 2',hacia:'Examen'},
      {desde:'Interrogación 3',hacia:'Examen'},
    ]},
    evals:[
      ['Interrogación 1',20,{fecha:'2026-08-31'}],
      ['Interrogación 2',20,{fecha:'2026-10-05'}],
      ['Interrogación 3',20,{fecha:'2026-11-02'}],
      ['Examen',30,{fecha:'2026-11-30'}],
      ['Laboratorio',10,{slots:3}],
    ],
  },
  // Programas oficiales de especialidad · Ingeniería UC · 2026-2.
  //
  // Econometría publica 25% para el conjunto de tres tareas, pero no reparte
  // ese porcentaje entre T1/T2/T3. Se conserva como una sola categoría con
  // tres casillas: dividirla en 8,33% sería inventar una igualdad que el
  // programa no declara. Por la misma razón, las fechas preliminares de los
  // informes no se fuerzan como fechas de tres evaluaciones independientes.
  'Econometría Aplicada':{
    sigla:'ICS2563',
    periodo:'2026-2',
    creditos:10,
    evals:[
      ['Interrogación 1',25,{fecha:'2026-08-31'}],
      ['Interrogación 2',25,{fecha:'2026-10-16'}],
      ['Examen',25,{fecha:'2026-11-30'}],
      ['Tareas',25,{slots:3}],
    ],
    grupos:[
      {nombre:'Interrogaciones y Examen',evals:['Interrogación 1','Interrogación 2','Examen'],min:3.95,cap:3.9},
      {nombre:'Tareas',evals:['Tareas'],min:3.95,cap:3.9},
    ],
    noCalcula:[
      'Los tickets de participación pueden sumar hasta 2 décimas a cada interrogación o al examen, según la cantidad completada en su período',
      'Si rindes ambas interrogaciones, cumples los tickets y tu peor interrogación es al menos 2,0, puedes reemplazarla por la nota del examen',
    ],
  },
  // NP pesa 80%: I1 25%, I2 35% y Examen 40% dentro de NP. NT pesa 20%:
  // T1 30%, T2 30% y T3 40% dentro de NT. Los pesos de abajo son el producto
  // exacto de ambos niveles, no una aproximación; así las compuertas de NP y
  // NT siguen calculándose con su proporción interna correcta.
  'Métodos de Optimización':{
    periodo:'2026-2',
    creditos:10,
    reemplazosOptativos:[{tipo:'mezcla',fuente:'Control optativo',destinos:['Interrogación 2'],fraccion:0.3}],
    evals:[
      ['Interrogación 1',20,{fecha:'2026-09-07'}],
      ['Interrogación 2',28,{fecha:'2026-11-09'}],
      ['Examen',32,{fecha:'2026-12-02'}],
      ['Tarea 1',6],['Tarea 2',6],['Tarea 3',8],
      ['Control optativo',0,{optativa:true,fecha:'2026-10-09'}],
    ],
    grupos:[
      {nombre:'Pruebas',evals:['Interrogación 1','Interrogación 2','Examen'],min:4.0,cap:3.9},
      {nombre:'Tareas',evals:['Tarea 1','Tarea 2','Tarea 3'],min:4.0,cap:3.9},
    ],
    // El motor pondera sin redondear NP y NT por separado: con NP 5,16 y NT 6,0
    // el programa da 5,4 (5,2 y 6,0) y la app 5,3. Las compuertas sí calzan,
    // porque se miden a la décima.
    noCalcula:[
      'El programa redondea la nota de Pruebas y la de Tareas a un decimal antes de calcular la final, así que tu nota oficial puede diferir en una décima',
    ],
    reglasDelCurso:[
      'Las actividades de taller pueden bonificar una nota final aprobada; la regla de acumulación se informa durante el semestre en Canvas',
    ],
  },
  // El programa define C4 mejores como el promedio de los cuatro mejores de
  // cinco controles. Deben seguir juntos: cinco filas de 9% impedirían que el
  // motor descarte una nota entre ellas. Por eso sus fechas quedan en el
  // programa y el Examen y los cuatro Memes sí entran individualmente a Agenda.
  'Ingeniería de Sistemas de Transporte':{
    periodo:'2026-2',
    creditos:10,
    reemplazosOptativos:[{tipo:'reemplazo',fuente:'Examen',destinos:['Controles']}],
    evals:[
      ['Controles',45,{slots:5,dropLowest:{count:1}}],
      ['Meme 1',5,{fecha:'2026-08-24'}],
      ['Meme 2',5,{fecha:'2026-09-25'}],
      ['Meme 3',5,{fecha:'2026-10-23'}],
      ['Meme 4',5,{fecha:'2026-11-20'}],
      ['Examen',35,{fecha:'2026-12-02',min:3.0,cap:3.9}],
    ],
    grupos:[
      {nombre:'Cuatro mejores controles',evals:['Controles'],min:3.0,cap:'self'},
      {nombre:'Promedio de Memes',evals:['Meme 1','Meme 2','Meme 3','Meme 4'],min:4.0,cap:'self'},
      {nombre:'Evaluaciones escritas',evals:['Controles','Examen'],min:4.0,cap:'self'},
    ],
    // El derecho se mide sobre los CINCO controles antes de descartar el peor.
    // Si se cumple y el Examen sigue vacío, la app lo deja fuera de lo pendiente:
    // la fórmula ya repondera Controles y Memes correctamente sobre el 65%.
    eximicion:{evaluacion:'Examen',segun:['Controles'],min:5.5,ignoraDescartes:true},
    noCalcula:[
      'Si no cumples el mínimo de Memes o de los cuatro mejores Controles, no tienes derecho a rendir el Examen',
    ],
  },
  // Fuente viva del curso: github.com/IIC2115/Syllabus, programa 2026-2.
  // Son cuatro laboratorios, uno por capítulo, y el propio programa declara
  // que L es su promedio simple: separarlos en cuatro filas de 20% conserva la
  // fórmula exacta y permite llevar las fechas publicadas a Agenda.
  'Programación como Herramienta para la Ingeniería':{
    sigla:'IIC2115',
    periodo:'2026-2',
    creditos:10,
    evals:[
      ['Laboratorio 1',20,{fecha:'2026-08-24'}],
      ['Laboratorio 2',20,{fecha:'2026-09-28'}],
      ['Laboratorio 3',20,{fecha:'2026-10-26'}],
      ['Laboratorio 4',20,{fecha:'2026-11-23'}],
      ['Participación',20,{slots:10,dropLowest:{count:2}}],
    ],
    grupos:[
      {nombre:'Laboratorios',evals:['Laboratorio 1','Laboratorio 2','Laboratorio 3','Laboratorio 4'],min:3.95,cap:3.9},
      {nombre:'Participación',evals:['Participación'],min:3.95,cap:3.9},
    ],
    reglasDelCurso:[
      'Si tienes 2 o más ausencias justificadas a sesiones con ticket, el equipo docente ajustará la regla de Participación; el programa no publica la fórmula de ese ajuste',
    ],
  },
  // Programas históricos recibidos por Lucas el 28-10-2026. El período va
  // declarado: se ofrecen los pesos, pero nunca sus fechas como si fueran
  // del semestre actual. Las pautas personales existentes no se reemplazan.
  // ICS1513 - 01 - 2025 - sección 4 - Programa, pp. 4-5.
  'Introducción a la Economía':{
    sigla:'ICS1513',periodo:'2025-1',creditos:10,
    evals:[
      ['Interrogación 1',20,{fecha:'2025-04-26'}],
      ['Interrogación 2',20,{fecha:'2025-06-06'}],
      ['Examen',30,{fecha:'2025-07-10'}],
      ['Controles',15,{lista:true,dropLowest:{count:3}}],
      ['Proyecto escrito',15],
    ],
    // No se declara como reemplazo optativo automático: normalize lo agrega
    // también a cuentas anteriores con los mismos nombres y pesos, aunque
    // sean de otro semestre. Esta pauta histórica no autoriza ese cambio.
    noCalcula:[
      'Puedes eliminar una sola interrogación, sin justificar, y pasar su 20% al examen. Este ajuste no se aplica automáticamente',
    ],
    reglasDelCurso:[
      'Programa 2025-1, sección 4. Revisa que esta pauta corresponda a tu curso',
      'Se eliminan los tres peores controles. El programa no fija cuántos habrá; mientras agregas notas, el promedio es parcial',
      'El proyecto tiene una etapa grupal y otra individual, pero este programa no publica sus pesos internos: ingresa la nota final del proyecto',
      'El examen es obligatorio y no hay eximición. Si no asistes, la nota es 1,0, salvo que el curso apruebe el procedimiento de nota pendiente',
    ],
  },
  // Programa_y_Reglas_FIS1523_1er_sem_2025, pp. 3-4. Los pesos de abajo
  // son de CÁTEDRA; el laboratorio FIS0152 aporta el 30% de la nota final.
  // El PDF superpone ≥ y ≤ en 4,0. Lucas confirmó el 28-10-2026 que 4,0
  // cuenta como aprobado, igual que en Dinámica; se usa el vínculo existente.
  'Termodinámica':{
    sigla:'FIS1523',periodo:'2025-1',creditos:10,
    evals:[
      ['Interrogación 1',30,{fecha:'2025-04-07'}],
      ['Interrogación 2',30,{fecha:'2025-05-19'}],
      ['Examen',40,{fecha:'2025-06-30'}],
    ],
    aporta:{ramo:'Laboratorio de Termodinámica',peso:30,min:4.0},
    noCalcula:[
      'El examen puede reemplazar una sola interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente',
      'Si justificas ambas interrogaciones, el programa exige reprobar el ramo. La app no aplica esa reprobación por inasistencias',
    ],
    reglasDelCurso:[
      'Programa 2025-1. El documento indica los mismos criterios para todas las secciones de ese período; confirma que sigan vigentes en tu curso',
      'La nota final combina 70% de cátedra y 30% del Laboratorio de Termodinámica. Si una parte reprueba, queda la menor de ambas notas; 4,0 cuenta como aprobado',
      'El programa no detalla la pauta interna del laboratorio: ingresa sus evaluaciones según las instrucciones de ese curso',
      'No hay eximición ni pruebas recuperativas. Las notas de las evaluaciones y la final se redondean a una décima',
    ],
  },
  // Programa_FIS1533_2026_1, pp. 4-5. Tres controles, sin descarte general:
  // se puede excluir uno solo si su inasistencia fue justificada.
  // Mismo límite de 4,0 aclarado por Lucas para ambas físicas (28-10-2026).
  'Electricidad y Magnetismo':{
    sigla:'FIS1533',periodo:'2026-1',creditos:10,
    evals:[
      ['Interrogación 1',30,{fecha:'2026-04-17'}],
      ['Interrogación 2',30,{fecha:'2026-06-05'}],
      ['Examen',30,{fecha:'2026-07-02'}],
      ['Controles',10,{slots:3,slotLabel:'Control'}],
    ],
    aporta:{ramo:'Laboratorio de Electricidad y Magnetismo',peso:30,min:4.0},
    noCalcula:[
      'El examen reemplaza una única interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente; con dos o más inasistencias, debes consultar a tu facultad',
      'Puedes justificar como máximo un control y eliminarlo del promedio. La app no elimina controles por justificación ni descarta por defecto el peor',
    ],
    reglasDelCurso:[
      'Programa 2026-1. Revisa que esta pauta corresponda a tu curso',
      'La nota final combina 70% de cátedra y 30% del Laboratorio de Electricidad y Magnetismo. Si una parte reprueba, queda la menor de ambas notas; 4,0 cuenta como aprobado',
      'El programa no detalla la pauta interna del laboratorio: ingresa sus evaluaciones según las instrucciones de ese curso',
      'No hay eximición ni pruebas recuperativas. La nota final se redondea a una décima',
    ],
  },
  // ── Dinámica y su laboratorio: dos ramos, una nota ────────────────────────
  // La UC los inscribe como dos cursos (FIS1514 y FIS0154) con dos actas, y así
  // se muestran. Pero la nota final de Dinámica se calcula CON la del
  // laboratorio, y eso el estudiante no lo puede hacer a mano cada vez:
  //
  //   NF  = 0,7·NFC + 0,3·NL      si NL ≥ 4,0 Y NFC ≥ 4,0
  //   NF  = min(NFC, NL)          si cualquiera de los dos baja de 4,0
  //
  // `aporta` es lo que ata los dos ramos: dice de dónde sale el 30% que no está
  // en las evaluaciones de este ramo, y con qué mínimo. Es el único caso del
  // catálogo hasta ahora, y por eso vive en el dato y no en un `if` del código.
  'Dinámica':{
    periodo:'2026-2',
    // Estas cuatro son la NFC del programa y suman 100 entre ellas: el 30% del
    // laboratorio no está acá, viene por `aporta`.
    evals:[
      ['Interrogación 1',25,{fecha:'2026-09-29'}],
      ['Interrogación 2',25,{fecha:'2026-11-13'}],
      // El calendario fija C1/C2/C3, pero el programa solo da 20% al conjunto.
      // Separarlos o repartir su peso inventaría ponderaciones; las tres fechas
      // requieren soporte de fechas por casilla, no una fecha falsa del grupo.
      ['Controles',20,{slots:3}],
      ['Examen',30,{fecha:'2026-12-01'}],
    ],
    // Los controles se rinden en horario de taller, que no es el mismo en
    // todas las secciones. Solo cargamos las de secciones confirmadas: la 13
    // (Lucas, 2026-10-08) usa las fechas del programa.
    fechasPorSeccion:{
      13:{'Controles':['2026-08-28','2026-10-09','2026-11-06']},
    },
    aporta:{ramo:'Laboratorio de Dinámica',sigla:'FIS0154',peso:30,min:4.0},
    // Conservación de actas al repetir: no definida por los programas consultados.
    // El programa dice que la nota de la interrogación "será reemplazada por la
    // nota del examen"; en la práctica del curso su porcentaje pasa al examen
    // (decisión de Lucas, 2026-10-08). Faltar a las dos es "caso a caso" y no
    // se modela.
    ausenciasJustificadas:{
      traspasos:[
        {desde:'Interrogación 1',hacia:'Examen'},
        {desde:'Interrogación 2',hacia:'Examen'},
      ],
    },
    // El programa dice "6 o más sesiones" y, en la misma frase, "como máximo
    // podrá faltar a 2 talleres, independiente de la justificación". La
    // profesora aclaró después que son 8. Se pregunta por las faltas, que es
    // como el programa la opera y no depende de cuántos talleres hay en total.
    bonus:[
      {id:'talleres',pregunta:'Talleres a los que has faltado',entrada:'faltas',hasta:2,suma:0.5,a:'Controles',
        ayuda:'Si faltas como máximo a 2 talleres, con o sin justificación, sumas 5 décimas al promedio de los Controles'},
    ],
    noCalcula:[
      'El programa no indica si se conserva el laboratorio al repetir la cátedra o al revés: confirma en tu Escuela',
    ],
  },
  // El laboratorio tiene nota propia: se aprueba o se reprueba por sí solo, y
  // la evaluación de pares bajo 4,0 lo reprueba aunque el resto vaya bien.
  // 5 experimentos presenciales con control, informe y evaluación de pares, más
  // un Lab 0 online con informe y pares: 5 controles, 6 informes, 6 pares.
  //
  // La nota final del laboratorio es el PROMEDIO DE LAS 6 "NOTA LAB", y el
  // Lab 0 vale lo mismo que los otros (coordinación del laboratorio, correo a
  // Lucas del 2026-10-14). Cada "Nota lab" sale de la planilla oficial, con la
  // misma fórmula en todas las secciones:
  //
  //   Lab 0 (online, sin control):  0,7·Informe + 0,3·Pares
  //   Labs 1–5:                     0,7·Informe + 0,1·Control + 0,2·Pares
  //
  // Repartido sobre el ramo: cada informe 7/60, cada control 1/60, la
  // evaluación de pares del Lab 0 3/60 y las otras 2/60. Por eso Controles
  // pesa 25/3 % (no 10) y Evaluación de pares 65/3 % (no 20), con la casilla
  // del Lab 0 pesando 1,5 veces las demás (`pesosCasillas`). Antes eran 10 y
  // 20 parejos: el lab quedaba corrido en (pares del Lab 0 − promedio de
  // controles) ÷ 60, hasta una décima.
  //
  // El mínimo de 4,0 en pares es sobre el promedio simple de las seis
  // (decisión de Lucas, 2026-10-15); 3,95 ya cuenta, y si la nota del lab ya
  // es menor que 3,9 queda esa y no 3,9 (coordinación).
  'Laboratorio de Dinámica':{
    // A mitad de semestre, la planilla da el promedio de los laboratorios ya
    // hechos: cada nota pesa lo que pesa en su laboratorio, no lo que pesa su
    // evaluación entera. Comprobado contra la planilla: 630 de 630 iguales.
    promedioParcial:'por-casilla',
    // La pauta de antes (10/70/20 parejos) era un error nuestro: se corrige
    // sola al cargar, conservando las notas (ver `corrigePautas` en normalize).
    corrigePautas:[[['Controles',10],['Informes',70],['Evaluación de pares',20]]],
    evals:[
      ['Controles',8.333333333333334,{slots:5,slotLabel:'Control'}],
      // El Lab 0 online también tiene informe y pares. La categoría conserva
      // el plural porque es su nombre en el programa, pero cada casilla se
      // nombra como la entrega real: Informe 0 … Informe 5.
      ['Informes',70,{slots:6,slotLabel:'Informe',slotStart:0}],
      ['Evaluación de pares',21.666666666666668,{slots:6,slotStart:0,pesosCasillas:[1.5,1,1,1,1,1],min:4.0,cap:3.9}],
    ],
    noCalcula:[
      'Si no realizas un Control, tu nota máxima en el Informe de ese experimento queda en 4,0',
      'Tu nota de evaluación de pares se calcula promediando la nota que te asignan tus compañeros y tu autoevaluación; si no respondes la autoevaluación, esa parte queda con nota 1',
      'Si faltas a un experimento sin justificación, tu informe de ese experimento queda con nota 1',
      'Puedes justificar una sola inasistencia en el semestre y optar al laboratorio recuperativo; una segunda inasistencia reprueba el laboratorio',
    ],
  },
  // ── Dinámica ICE1514 ──────────────────────────────────────────────────────
  // Programa oficial del 5-agosto-2026, segundo semestre 2026. Es la otra
  // Dinámica del plan común y comparte el mismo laboratorio (FIS0154): si se
  // aprueban los dos, la nota final es 70% esta cátedra y 30% el laboratorio.
  //
  // El programa da el peso de cada control ("10% c.u.") y de cada interrogación
  // ("20% c.u."), así que van separados y cada uno con su fecha. Los talleres
  // son "~11": no hay un número exacto, así que quedan como lista abierta en vez
  // de inventar casillas, y se elimina el peor como dice el programa.
  //
  // `min` del laboratorio: el programa dice que cátedra y laboratorio "son ambas
  // reprobatorias", pero no con qué nota queda el ramo si una baja de 4,0. Sin
  // `min` un laboratorio reprobado se promediaría y el ramo saldría aprobado.
  // Con `min` se ve reprobado con la más baja de las dos, igual que FIS1514, y
  // la ficha avisa que ese número no sale del programa.
  //
  // El programa advierte que las ponderaciones podrían cambiar entre secciones
  // ICE. Si una sección tiene otra, la edita y el consenso de reportes lo dirá.
  'Dinámica (ICE1514)':{
    periodo:'2026-2',
    // Programa del 5-ago-2026: una justificada en control o interrogación
    // toma el promedio ponderado de las otras sumativas, sin talleres;
    // la segunda inasistencia cuenta como 1,0. El examen sí es sumativo.
    // El orden declara cuál fue la primera ausencia según las fechas del preset.
    ausenciasJustificadas:{maxPromedios:1,notaExceso:1,promedios:[
      {desde:'Control 1',de:['Control 2','Control 3','Interrogación 1','Interrogación 2','Examen']},
      {desde:'Interrogación 1',de:['Control 1','Control 2','Control 3','Interrogación 2','Examen']},
      {desde:'Control 2',de:['Control 1','Control 3','Interrogación 1','Interrogación 2','Examen']},
      {desde:'Control 3',de:['Control 1','Control 2','Interrogación 1','Interrogación 2','Examen']},
      {desde:'Interrogación 2',de:['Control 1','Control 2','Control 3','Interrogación 1','Examen']},
    ]},
    evals:[
      ['Control 1',10,{fecha:'2026-09-04'}],
      ['Control 2',10,{fecha:'2026-10-16'}],
      ['Control 3',10,{fecha:'2026-10-30'}],
      ['Interrogación 1',20,{fecha:'2026-09-29'}],
      ['Interrogación 2',20,{fecha:'2026-11-13'}],
      ['Examen',20,{fecha:'2026-12-01'}],
      ['Talleres',10,{lista:true,dropLowest:{count:1}}],
    ],
    aporta:{ramo:'Laboratorio de Dinámica',sigla:'FIS0154',peso:30,min:4.0},
    // Conservación de actas al repetir: no definida por los programas consultados.
    noCalcula:[
      'Faltar a un taller, con o sin justificación, es un 1,0 en ese taller',
      'Si repruebas la cátedra o el laboratorio, repruebas Dinámica: el programa no dice con qué nota quedas, así que mostramos la más baja de las dos',
      'El programa no indica si se conserva el laboratorio al repetir la cátedra o al revés: confirma en tu Escuela',
    ],
  },
  // ── PAUTAS DEL CATÁLOGO OFICIAL UC ────────────────────────────────────────
  // Transcritas el 2026-09-17 desde catalogo.uc.cl —la ficha oficial de cada
  // sigla— con `bin/proponer-pautas-uc.js`, y revisadas una por una acá.
  //
  // QUÉ SON Y QUÉ NO. Son las ponderaciones del programa REGISTRADO del curso:
  // oficiales, pero genéricas. No son las de una sección ni las de este
  // semestre, y el catálogo no declara período, así que la ficha las muestra
  // como "período sin confirmar" y ninguna trae fechas. Si a alguien su sección
  // le cambió los pesos, edita su pauta y el consenso de reportes hace el resto.
  //
  // Dos decisiones de transcripción, ninguna inventada:
  // · Un conjunto en plural cuyo número el catálogo NO dice ("Pruebas 40%") va
  //   como lista abierta. Poner tres casillas sería inventar cuántas son.
  // · Cuando el catálogo sí dice cuántas ("Controles (5 en total)"), van con sus
  //   casillas.
  // Los nombres son los del catálogo; solo se les pusieron las tildes que le
  // faltaban. Nada más se tocó: renombrar para que se lea mejor sería escribir
  // una pauta que el documento no dice.
  'Comportamiento Organizacional':{
    evals:[
      ['Pruebas',50,{lista:true}],
      ['Trabajo en grupo y presentación oral en clases',20],
      ['Examen final escrito',30],
    ],
  },
  // El catálogo no dice cuántos controles ni cuántas pruebas. Las cantidades
  // salen de un reporte de estudiante con los mismos totales (2026-10-13):
  // Control 1 y 2 al 10%, controles sorpresa y tarea al 10%, e Interrogación 1
  // y 2 al 20%. Decisión de Lucas: un reporte que coincide en pesos completa
  // las cantidades. Otra sección puede tener otras; edita su pauta.
  'Contabilidad':{
    evals:[
      ['Controles',30,{slots:3,nombresCasillas:['Control 1','Control 2','Controles sorpresa y tarea']}],
      ['Pruebas',40,{slots:2,slotLabel:'Interrogación'}],
      ['Examen',30],
    ],
  },
  'Fundamentos de Finanzas':{
    evals:[
      ['Pruebas y controles',60,{lista:true}],
      ['Tareas en Excel',10,{lista:true}],
      ['Examen final escrito',30],
    ],
  },
  'Dirección de Personas':{
    evals:[
      ['Controles',40,{slots:5}],
      ['Prueba 1',20],
      ['Prueba 2',20],
      ['Examen',20],
    ],
  },
  'Contabilidad de Costos':{
    evals:[
      ['Pruebas y controles',70,{lista:true}],
      ['Examen final escrito',30],
    ],
  },
  // OJO: `data.js` tenía las siglas de este ramo y de Empresas y Legislación
  // cambiadas entre sí, y por eso la primera transcripción les puso la pauta del
  // otro. El catálogo oficial dice EAA2240 = Contabilidad Gerencial (10 cr) y
  // EAA2230 = Empresa y Legislación (5 cr); los créditos de cada nombre ya
  // calzaban, solo estaba mal el código.
  // Programa 2026-2 de Luis Camilla, pp. 3-4 (PDF recibido por Lucas).
  'Contabilidad Gerencial':{
    sigla:'EAA2240',periodo:'2026-2',
    evals:[
      ['Ejercicios, casos y tareas',20],
      ['Prueba 1',24,{fecha:'2026-10-05'}],
      ['Prueba 2',24,{fecha:'2026-11-09'}],
      ['Examen',32,{fecha:'2026-12-12',nombresAnteriores:['Examen final escrito']}],
    ],
    formulasCondicionales:[
      {nombre:'Tareas ≥ 4,0 y promedio de pruebas/examen < 3,8: se excluyen tareas',
        cuando:[{tipo:'promedio_min',evals:['Ejercicios, casos y tareas'],min:4},
          {tipo:'promedio_menor',evals:['Prueba 1','Prueba 2','Examen'],min:3.8}],
        pesos:[{evaluacion:'Ejercicios, casos y tareas',peso:0},{evaluacion:'Prueba 1',peso:30},{evaluacion:'Prueba 2',peso:30},{evaluacion:'Examen',peso:40}]},
      {nombre:'Tareas ≥ 4,0 y promedio de pruebas/examen exactamente 3,8',ambigua:true,
        cuando:[{tipo:'promedio_min',evals:['Ejercicios, casos y tareas'],min:4},
          {tipo:'promedio_igual',evals:['Prueba 1','Prueba 2','Examen'],min:3.8}]},
    ],
    noCalcula:[
      'En el caso exacto de 3,8 en pruebas y examen, con tareas ≥ 4,0, el programa se contradice: texto ≥ 3,8 y fórmula > 3,8. El resultado queda pendiente hasta confirmar con el profesor',
      'La nota de ejercicios, casos y tareas se calcula por puntos acumulados, con 7,0 al 90% del puntaje máximo y escala lineal. Ingresa la nota del bloque entregada por el profesor',
    ],
    reglasDelCurso:[
      'Programa 2026-2 de Luis Camilla. Calendario tentativo: pruebas a las 17:30 y examen a las 08:20; confirma cambios con el curso',
      'La recuperativa por una prueba justificada es el 12 de diciembre después del examen; si no la rindes, la prueba justificada queda en 1,0. El examen no puede ponderar más de 56%; sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario',
    ],
  },
  // Empresa y Legislación, EAA2230, Luis Enrique Seguel, pp. 3-4.
  // Conservamos la clave plural de la malla para no romper ramos existentes.
  'Empresas y Legislación':{
    sigla:'EAA2230',periodo:'2026-2',
    evals:[
      ['Prueba 1',30,{fecha:'2026-09-26'}],
      ['Prueba 2',30,{fecha:'2026-11-03'}],
      ['Examen',40,{fecha:'2026-12-02'}],
    ],
    limiteAusencias:{nombre:'Traspaso de pruebas justificadas al examen',desde:['Prueba 1','Prueba 2'],hacia:'Examen',max:70},
    noCalcula:['Las preguntas bonus pueden sumar hasta 0,3 a cada prueba. La participación, tareas voluntarias y 100% de asistencia a clases y ayudantías pueden dar décimas; su asignación depende del profesor'],
    reglasDelCurso:[
      'Programa recibido como 2026-2 de Luis Enrique Seguel. Prueba 1: 09:40; Prueba 2: 17:30; Examen: 13:30',
      'El examen no puede superar 70% del curso: justificar ambas pruebas trasladaría 100% y no cumple el requisito. No hay eximición',
    ],
  },
  'Fundamentos de Marketing':{
    evals:[
      ['Pruebas',25,{lista:true}],
      ['Controles',25,{lista:true}],
      ['Trabajos grupales',20,{lista:true}],
      ['Examen final escrito',30],
    ],
  },
  // EAA2320, programa 2026-2, pp. 8-12. El ensayo pesa 20%:
  // sus hitos 20/30/50 internos equivalen a 4/6/10 de la nota final.
  'Marketing Analytics':{
    sigla:'EAA2320',periodo:'2026-2',
    evals:[
      ['Tareas',40,{slots:3,slotLabel:'Tarea'}],
      ['Prueba 1',10,{fecha:'2026-09-30'}],
      ['Prueba 2',10,{fecha:'2026-11-05'}],
      ['Examen',20,{fecha:'2026-12-11',nombresAnteriores:['Examen final']}],
      ['Ensayo: primer hito',4],
      ['Ensayo: segundo hito',6],
      ['Ensayo: entrega final',10,{fecha:'2026-11-24'}],
    ],
    // El requisito usa el promedio redondeado a una décima: ≥ 4,0
    // equivale a un promedio sin redondear ≥ 3,95. No exigimos 4,0 crudo.
    grupos:[{nombre:'Competencias técnicas (promedio redondeado ≥ 4,0)',evals:['Prueba 1','Prueba 2','Examen'],min:3.95,cap:3.9}],
    reglasDelCurso:[
      'Programa 2026-2: pruebas a las 17:30; examen el 11 de diciembre a las 13:30; entrega final del ensayo el 24 de noviembre a las 17:30. Fechas de tareas e hitos intermedios por anunciar',
      'Para aprobar, 25% Prueba 1 + 25% Prueba 2 + 50% Examen debe llegar a 4,0 redondeado a la décima; de lo contrario, la final se topa en 3,9',
      'Para rendir examen debes haber sido evaluado en al menos 40% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba regular. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario',
      'La recuperativa por una prueba justificada es el 11 de diciembre a las 17:30; si no la rindes, la prueba justificada queda en 1,0',
    ],
  },
  'Estrategia de la Organización':{
    evals:[
      ['Pruebas',40,{lista:true}],
      ['Controles de lectura',20,{lista:true}],
      ['Examen final escrito',40],
    ],
  },
  // Gastón Llanes, programa 2026-2 versión 13-08-26, pp. 1-3.
  'Estrategia Competitiva':{
    sigla:'EAA2420',periodo:'2026-2',
    evals:[
      ['Participación',10],
      ['Actividades',10,{slots:4,slotLabel:'Actividad',dropLowest:{count:1}}],
      ['Prueba 1',23],
      ['Prueba 2',23],
      ['Examen',34,{nombresAnteriores:['Examen final escrito']}],
    ],
    formulasCondicionales:[{
      nombre:'Se excluyen participación y actividades si ninguna prueba/examen llega a 4,0 o el promedio técnico está bajo 3,75 (28,75% / 28,75% / 42,5%)',
      // Cuando falla un requisito se usa solo la fórmula de pruebas y examen.
      cuando:[{tipo:'no_cumple_requisitos',evals:['Prueba 1','Prueba 2','Examen'],min:3.75,algunaMin:4}],
      pesos:[{evaluacion:'Participación',peso:0},{evaluacion:'Actividades',peso:0},
        {evaluacion:'Prueba 1',peso:28.75},{evaluacion:'Prueba 2',peso:28.75},{evaluacion:'Examen',peso:42.5}],
    }],
    reglasDelCurso:[
      'Programa 2026-2 de Gastón Llanes. Hay cuatro actividades y se promedian las tres mejores; las fechas las anuncia el curso',
      'Para rendir examen debes haber sido evaluado en al menos 33% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba. El examen no puede superar 70%: el exceso se califica con 1,0. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario',
      'Una prueba justificada se recupera en la fecha de Facultad; no rendir la recuperativa implica 1,0 en esa prueba. Si faltas a ambas pruebas, no puedes rendir recuperativa ni examen y ambas quedan en 1,0',
    ],
  },
  // INTRO A LA MICROECONOMÍA (EAE1110). El catálogo la publica como Guías 20 /
  // Pruebas 45 / Examen 35, pero quienes la cursan en 2026-2 reportan otra
  // estructura. Quedó sin pauta hasta que llegaran a tres, y llegaron: tres
  // estudiantes de Comercial dan exactamente estos pesos (un cuarto reparte los
  // controles con participación). Lucas la confirmó el 27-09-2026. No es el
  // programa oficial: si aparece el del semestre, ese manda.
  'Introducción a la Microeconomía':{
    sigla:'EAE1110',
    evals:[
      ['Control 1',10],['Control 2',10],
      ['Prueba 1',22.5],['Prueba 2',22.5],
      ['Trabajo grupal',5],
      ['Examen',30],
    ],
  },
  'Análisis Económico: La Experiencia Chilena':{
    evals:[
      ['Pruebas',25,{slots:2}],
      ['Trabajo grupal',20],
      ['Email cortos',10,{lista:true}],
      ['Controles de lectura',15,{lista:true}],
      ['Control de repaso',5],
      ['Examen final',25],
    ],
  },
  'Microeconomía I':{
    evals:[
      ['Tareas y controles',20,{lista:true}],
      ['Pruebas escritas',48,{lista:true}],
      ['Examen final escrito',32],
    ],
  },
  'Microeconomía II':{
    evals:[
      ['Pruebas',48,{lista:true}],
      ['Tareas',20,{lista:true}],
      ['Examen final escrito',32],
    ],
  },
  'Competencia y Mercado':{
    evals:[
      ['Pruebas',40,{lista:true}],
      ['Controles',25,{lista:true}],
      ['Examen final escrito',35],
    ],
  },
  'Macroeconomía I':{
    evals:[
      ['Pruebas',48,{lista:true}],
      ['Controles y tareas',20,{lista:true}],
      ['Examen final escrito',32],
    ],
  },
  'Macroeconomía II':{
    evals:[
      ['Pruebas',50,{lista:true}],
      ['Controles',20,{lista:true}],
      ['Examen final escrito',30],
    ],
  },
  'Aplicaciones Matemáticas para Economía y Negocios':{
    evals:[
      ['Pruebas escritas',50,{lista:true}],
      ['Examen final',30],
      ['Tareas grupales',20,{lista:true}],
    ],
  },
  'Práctica Social':{
    evals:[
      ['Evaluación socio comunitario',30],
      ['Co-evaluación de estudiantes',20],
      ['Registro de portafolio',30],
      ['Presentación final Feria de proyectos',20],
    ],
  },
  // ETI209, syllabus común 2026-2 versión 6 de agosto, pp. 7-8.
  'Ética, Economía y Empresa':{
    sigla:'ETI209',periodo:'2026-2',
    limiteAusencias:{nombre:'Traspaso de pruebas justificadas al examen',desde:['Prueba 1','Prueba 2'],hacia:'Examen',max:60},
    noCalcula:['Si las pruebas justificadas hacen que el examen supere 60%, se exige una recuperativa adicional cuya ponderación define el profesor. El resultado queda pendiente hasta resolver esa evaluación'],
    evals:[
      ['Prueba 1',20,{fecha:'2026-09-10'}],
      ['Prueba 2',20,{fecha:'2026-10-26'}],
      ['Actividades participativas',25,{slots:5,slotLabel:'Actividad'}],
      ['Examen',35,{fecha:'2026-12-14'}],
    ],
    reglasDelCurso:[
      'Syllabus común 2026-2 para las tres secciones: pruebas a las 17:30 y examen a las 08:20. Las cinco actividades se anuncian por sección',
      'Si el traspaso por pruebas justificadas hace que el examen supere 60%, habrá una recuperativa adicional definida por el profesor, que puede ser oral. En ese caso ajusta la pauta con sus instrucciones',
    ],
  },
  'Cálculo III':{
    evals:[
      ['Evaluaciones sumativas',60,{lista:true}],
      ['Laboratorios',10,{lista:true}],
      ['Examen final escrito',30],
    ],
  },
  // ── FORMACIÓN TEOLÓGICA: LOS 24 QUE PUBLICAN SU PAUTA ─────────────────────
  // Misma fuente y mismo criterio que el bloque de arriba: catalogo.uc.cl, el
  // 2026-09-17. Importan porque TODO estudiante UC cursa uno de estos y hasta
  // hoy ninguno traía ponderaciones: las escribía a mano el 100% de ellos.
  //
  // Llevan su `sigla` declarada porque no están en ninguna malla: entran al
  // buscador por `presetsFueraDeMalla`, y por eso salen de la lista `CURSOS_UC`
  // —que es solo nombre y sigla— para no aparecer dos veces, una con
  // ponderaciones y otra sin ellas.
  //
  // Los teológicos que NO están acá son los que el catálogo no publica con
  // porcentajes, o los publica sumando distinto de 100. Esos siguen en
  // `CURSOS_UC` sin pauta, que es lo honesto mientras no haya un programa.
  'La Biblia de Jesús':{
    sigla:'TTF036',
    evals:[
      ['Infografía digital',20],
      ['Corto de video',20],
      ['Aplicación de lectura bíblica',30],
      ['Ensayo',30],
    ],
  },
  'La Belleza de la Fragilidad Humana':{
    sigla:'TTF109',
    evals:[
      ['Fichas de lectura',30,{lista:true}],
      ['Relatos autobiográficos',30,{lista:true}],
      ['Texto autoetnográfico',40],
    ],
  },
  'Virgen María y Feminismo: ¿Diálogo o Confrontación?':{
    sigla:'TTF115',
    evals:[
      ['Control personal de contenido y lecturas',20],
      ['Tareas grupales',30,{lista:true}],
      ['Pre-entrega del trabajo del video',10],
      ['Presentación y exposición del video final',40],
    ],
  },
  'Arquitectura Sacra':{
    sigla:'TTF116',
    evals:[
      ['Prueba escrita',30],
      ['Informe análisis de caso individual',15],
      ['Informe de análisis de caso grupal',15],
      ['Ensayo final',40],
    ],
  },
  'Esperanza Cristiana, Muerte y Más Allá':{
    sigla:'TTF118',
    evals:[
      ['Tareas grupales en clases',40,{lista:true}],
      ['Presentación grupal',20],
      ['Co evaluación',20],
      ['Informe de síntesis y sistematización',20],
    ],
  },
  'Búsquedas Religiosas y Cristianismo':{
    sigla:'TTF202',
    evals:[
      ['Síntesis de debates',40,{lista:true}],
      ['Controles de lectura',30,{lista:true}],
      ['Prueba',30],
    ],
  },
  '¿Quién Es Jesús de Nazareth?':{
    sigla:'TTF205',
    evals:[
      ['Infografía grupal',30],
      ['Producción escrita',30],
      ['Podcast',40],
    ],
  },
  'El Padrenuestro: la Oración de Jesús':{
    sigla:'TTF206',
    evals:[
      ['Informes investigación',20,{lista:true}],
      ['Informes de lectura',30,{lista:true}],
      ['Controles escritos',30,{lista:true}],
      ['Presentación oral (final)',20],
    ],
  },
  'Doctrina Social de la Iglesia':{
    sigla:'TTF207',
    evals:[
      ['Pruebas',40,{lista:true}],
      ['Controles de lectura',20,{lista:true}],
      ['Ensayos',40,{lista:true}],
    ],
  },
  'Fe y Razón: Una Perspectiva Histórica':{
    sigla:'TTF208',
    evals:[
      ['Pruebas',30,{lista:true}],
      ['Informes de lectura',30,{lista:true}],
      ['Trabajo grupal',40],
    ],
  },
  'Experiencia Creyente y Secularismo':{
    sigla:'TTF210',
    evals:[
      ['Prueba de desarrollo',30],
      ['Tareas',20,{lista:true}],
      ['Producción audiovisual grupal',10],
      ['Ensayo',40],
    ],
  },
  'Para Pensar la Muerte':{
    sigla:'TTF211',
    evals:[
      ['Ensayos individuales',60,{lista:true}],
      ['Interrogaciones grupales',40,{lista:true}],
    ],
  },
  'Espiritualidad Laical y Cultura Moderna':{
    sigla:'TTF213',
    evals:[
      ['Controles de lecturas',50,{lista:true}],
      ['Pruebas',20,{lista:true}],
      ['Informe escrito grupal',30],
    ],
  },
  'Teología y Ecología':{
    sigla:'TTF215',
    evals:[
      ['Presentación síntesis de contenidos',30],
      ['Informe escrito',35],
      ['Análisis de caso grupal',35],
    ],
  },
  '¿Creer o No Creer?':{
    sigla:'TTF216',
    evals:[
      ['Pruebas',40,{lista:true}],
      ['Informes de lectura',20,{lista:true}],
      ['Trabajo grupal',30],
      ['Asistencia',10],
    ],
  },
  '¿Es Necesaria la Iglesia?':{
    sigla:'TTF217',
    evals:[
      ['Pruebas',40,{lista:true}],
      ['Trabajo grupal (entrevistas y análisis)',35],
      ['Ensayo individual',25],
    ],
  },
  'Lectura Contemporánea de la Biblia':{
    sigla:'TTF218',
    evals:[
      ['Presentaciones grupales',30,{lista:true}],
      ['Análisis de casos individual',40],
      ['Ensayo final',30],
    ],
  },
  'Existencia Humana y la Búsqueda de Sentido':{
    sigla:'TTF219',
    evals:[
      ['Prueba escrita',30],
      ['Informe de análisis de caso grupal',30],
      ['Ensayo final',40],
    ],
  },
  'Teología del Cuerpo Humano':{
    sigla:'TTF220',
    evals:[
      ['Presentaciones grupales',60,{lista:true}],
      ['Análisis de casos individual',25],
      ['Ensayo final',15],
    ],
  },
  'Cristianismo y Crisis Ecológica':{
    sigla:'TTF222',
    evals:[
      ['Controles de lectura',50,{lista:true}],
      ['Evaluación de pares',20],
      ['Portafolio',30],
    ],
  },
  'Fe y Ciencia':{
    sigla:'TTF225',
    evals:[
      ['Control escrito de contenidos',35],
      ['Ensayo',30],
      ['Trabajo colaborativo y exposición',35],
    ],
  },
  'Religión y Política':{
    sigla:'TTF226',
    evals:[
      ['Pruebas',60,{lista:true}],
      ['Exposiciones grupales',30,{lista:true}],
      ['Participación en el curso',10],
    ],
  },
  'Teología Feminista: Un Signo de los Tiempos':{
    sigla:'TTF232',
    evals:[
      ['Tareas',20,{lista:true}],
      ['Control de lectura',25],
      ['Análisis de casos',25],
      ['Portafolio',10],
      ['Presentación oral grupal',20],
    ],
  },
  'Teología y Literatura':{
    sigla:'TTF233',
    evals:[
      ['Informe de lectura',15],
      ['Ejercicios grupales',60,{lista:true}],
      ['Relectura final individual',25],
    ],
  },
  'Revelación y Fe':{
    sigla:'TTF012',
    periodo:'2026-2',
    // BuscaCursos 2026-2 (las 4 secciones de TTF012). Sin este dato los créditos
    // salían del homónimo TEB110 (8) o quedaban vacíos. Reportado el 2026-10-01.
    creditos:10,
    evals:[['Evaluación 1',20,{fecha:'2026-09-07'}],['Evaluación 2',20,{fecha:'2026-10-14'}],['Evaluación 3',30,{fecha:'2026-11-16'}],['Examen final',30]],
    noCalcula:[
      'Si tienes más de 75% de asistencia y una nota de presentación igual o superior a 6,00, te eximes del Examen final; tu nota de presentación se calcula como el promedio simple de Evaluación 1, Evaluación 2 y Evaluación 3, sin usar sus ponderaciones',
      'Si te eximes del Examen final, la nota del Examen final se reemplaza por la nota más alta que obtuviste entre Evaluación 1, Evaluación 2 y Evaluación 3',
      'Si obtienes décimas en los talleres, se agregan al finalizar el semestre a tu nota más baja',
      'Si presentas voluntariamente uno de los textos del curso cumpliendo las condiciones indicadas, obtienes un 7,0 que se promedia con tu nota más baja entre Evaluación 1, Evaluación 2 y Evaluación 3',
    ],
  },
  // ─── Derecho UC · formularios de condiciones y evaluaciones 2026-2 ───
  // Ramos NO coordinados (`coordinado:false`, confirmado por Lucas el
  // 2026-11-04): cada sección arma su propia pauta. Tener varios profesores no
  // basta para decir que un ramo no es coordinado; aquí sí lo es. La Facultad
  // solo fija la fecha de la Solemne y del Examen y el rango del examen
  // (50%–75%). La pauta va en `porSeccion` y no arriba: solo se carga a quien
  // está en esa sección (profesores por sección en PROFESORES_PROPUESTOS). Las demás secciones no tienen pauta hasta que
  // llegue su programa; nada de copiar la de otra.
  // Formularios recibidos: los de las secciones de la carga de Lucas
  // (2026-11-04). Ningún examen admite eximición.
  // No se muestran: el 2,0 por no presentarse sin justificar al examen, el
  // rezago en comisión ni que una ausencia justificada a la Solemne pase su
  // porcentaje al examen. Son contingencias, no algo que se prepare.
  'Derecho Penal Parte General II':{
    sigla:'DER002P',
    periodo:'2026-2',
    creditos:10,
    coordinado:false,
    porSeccion:{
      // Magdalena Ossandón. Asistencia libre.
      5:{evals:[
        ['Control 1',10,{fecha:'2026-09-10'}],
        ['Solemne',30,{fecha:'2026-10-09'}],
        ['Control 2',10,{fecha:'2026-11-05'}],
        ['Examen',50,{fecha:'2026-11-26'}],
      ]},
    },
  },
  'Procedimientos Civiles I':{
    sigla:'DER003R',
    periodo:'2026-2',
    creditos:10,
    coordinado:false,
    porSeccion:{
      // José Domingo Ilharreborde y Gonzalo Vial. La tabla del formulario dice
      // «Controles, 11/09/2026, 25%» y su descripción habla de «dos solemnes
      // escritas que valen lo mismo»: es una sola evaluación de 25% además de
      // la Solemne. Se conserva el nombre de la tabla en singular.
      // Asistencia libre.
      3:{evals:[
        ['Control',25,{fecha:'2026-09-11'}],
        ['Solemne',25,{fecha:'2026-10-02'}],
        ['Examen',50,{fecha:'2026-12-09'}],
      ]},
    },
  },
  // El formulario titula «Fuentes de las Obligaciones I»; la clave usa el
  // nombre del catálogo UC para que el buscador y la sigla calcen.
  'Fuentes de Obligaciones I':{
    sigla:'DER004C',
    periodo:'2026-2',
    creditos:10,
    coordinado:false,
    porSeccion:{
      // Carmen Domínguez. La Simulación es una gymkana grupal de un día, sin
      // justificación posible.
      1:{
        evals:[
          ['Control de lectura',15,{fecha:'2026-09-10'}],
          ['Solemne',25,{fecha:'2026-09-25'}],
          ['Simulación o actividad práctica',10,{fecha:'2026-11-06'}],
          ['Examen',50,{fecha:'2026-11-20'}],
        ],
        reglasDelCurso:[
          'Necesitas al menos 60% de asistencia a clases; si no, no puedes rendir el Examen',
        ],
      },
    },
  },
  // No está en el catálogo UC del repo, así que no se ponen créditos.
  'Derecho Administrativo II':{
    sigla:'DER005L',
    periodo:'2026-2',
    coordinado:false,
    porSeccion:{
      // Daniela Rivera. Cuatro talleres de 5% cada uno, uno por unidad, en
      // semanas y no en días (1ª de septiembre, 4ª de septiembre, 3ª de
      // octubre y 2ª de noviembre): sin fecha en Agenda.
      7:{
        evals:[
          ['Talleres',20,{slots:4,slotLabel:'Taller'}],
          ['Solemne',30,{fecha:'2026-10-23'}],
          ['Examen',50,{fecha:'2026-12-15'}],
        ],
        reglasDelCurso:[
          'Necesitas al menos 60% de asistencia a clases; si no, no puedes rendir el Examen',
        ],
      },
    },
  },
  'Derecho de Sociedades':{
    sigla:'DER009C',
    periodo:'2026-2',
    creditos:10,
    coordinado:false,
    porSeccion:{
      // Miguel Ángel Nacrur y Wildo Moya.
      1:{
        evals:[
          ['Control de lectura',20,{fecha:'2026-09-04'}],
          ['Solemne',30,{fecha:'2026-10-16'}],
          ['Examen',50,{fecha:'2026-12-02'}],
        ],
        reglasDelCurso:[
          'Necesitas al menos 60% de asistencia a clases; si no la cumples, igual puedes rendir el Examen si tu promedio es 6,0 o más',
        ],
      },
    },
  },
  // Ética para Ingeniería · ETI188 · syllabus 2026-2 de la sección 4 (Constanza
  // Guajardo). BuscaCursos da otros profesores en las secciones 2 y 3, y la 1,
  // aunque es de la misma profesora, no tiene syllabus recibido: por eso va en
  // `porSeccion` y no se copia a otra. No coordinado: confirmado por Martín
  // el 2026-11-09.
  // NP = 35% Prueba 1 + 35% Prueba 2 + 30% Trabajo final, y con examen
  // NF = 70% NP + 30% Examen. Los pesos son ese producto exacto; al eximirse,
  // repondera sobre el 70% y vuelve a dar 35/35/30. Trabajo final no lleva
  // fecha: los grupos exponen sus casos entre el 26-10 y el 18-11.
  'Ética para Ingeniería':{
    sigla:'ETI188',
    periodo:'2026-2',
    creditos:10,
    coordinado:false,
    porSeccion:{
      4:{
        evals:[
          ['Prueba 1',24.5,{fecha:'2026-08-31'}],
          ['Prueba 2',24.5,{fecha:'2026-10-07'}],
          ['Trabajo final',21],
          ['Examen',30,{fecha:'2026-11-25'}],
        ],
        // La app no sabe a cuántas charlas fue la persona: llegar al 5,0 solo
        // ofrece la eximición, y ella confirma la asistencia.
        eximicion:{
          evaluacion:'Examen',
          segun:['Prueba 1','Prueba 2','Trabajo final'],
          min:5,
          ignoraDescartes:true,
          requiereConfirmacion:true,
          confirmar:'asististe al menos a ¾ de las charlas del Auditorio Luksic',
        },
        noCalcula:[
          'El syllabus exime «sobre 5,0» sin aclarar si un 5,0 exacto alcanza: confírmalo con tu profesora',
        ],
        reglasDelCurso:[
          'La profesora puede sumar décimas al promedio final por asistencia y participación sobresalientes',
        ],
      },
    },
  },
};

// PRESETS_UC nació con la malla de Ingeniería. Comercial usa el mismo registro
// solo para estos ramos confirmados: compartir todo por nombre podría aplicar
// la pauta de otra facultad a un curso homónimo.
