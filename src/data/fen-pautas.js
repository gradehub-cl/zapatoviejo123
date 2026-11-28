
// ─── PRESETS FEN ─────────────────────────────────────────────────────────────
// Tronco común de 2° semestre (Ing. Comercial, Contador Auditor e Ing. en
// Información y Control de Gestión). Transcritos de los programas oficiales
// Primavera 2026. `grupo` define una compuerta sobre un CONJUNTO de
// evaluaciones: con cap 'self' el tope es el promedio del propio grupo.
//
// Dos listas para dos cosas distintas, y la diferencia le importa al estudiante:
//
// `noCalcula` — reglas que el motor TODAVÍA no sabe representar y que sí va a
// saber. Es una deuda nuestra con fecha de vencimiento. Cuando se implementan,
// salen de acá (así salió "se elimina el 25% de los controles", que hoy declara
// `dropLowest`; en la FEN la nota la borra el estudiante: `descarte_manual`).
//
// `reglasDelCurso` — reglas del programa que el promedio NUNCA va a incluir,
// porque dependen de información que la app no puede tener: un dato que el
// programa no da (¿cuántos controles sorpresa son?), algo que decide el profesor
// caso a caso (una recuperativa autorizada), o una aproximación deliberada del
// motor. No son una deuda: son cómo funciona el curso.
//
// Ninguna de las dos es documentación interna: las dos se le muestran al
// estudiante, porque su promedio real puede diferir del que ve y tiene derecho a
// saber por qué. Callarlo es peor que no tener el preset.
//
// Al transcribir un programa, la pregunta para decidir dónde va una regla es:
// ¿con la información que el estudiante puede darnos, esto se podría calcular
// algún día? Si sí, `noCalcula`. Si no, `reglasDelCurso`.
//
// Regla de la U para TODO ramo con trabajo en grupo, lo diga o no su programa:
// si el promedio de las evaluaciones individuales queda bajo 4,0, repruebas. El
// trabajo en grupo sube el promedio, pero no te ayuda a pasar. No hay documento
// que la escriba; la confirmó Martín el 2026-10-19 como práctica de todos los
// ramos. Se modela con un grupo 'Evaluaciones individuales' (min 4,0, cap
// 'self'): el veredicto es exacto, y el número bajo 4,0 es aproximado porque la
// regla solo dice que repruebas. Un preset nuevo con evaluación grupal lo lleva.
const PRESETS_FEN={
  'Métodos Matemáticos II':{
    // Fechas del calendario 2026-2 entregado por Martín el 2026-09-18; la del
    // examen, del calendario de exámenes que entregó el 2026-11-02. La segunda
    // fecha del examen (3 dic) no es una evaluación aparte, así que no va como fila.
    periodo:'2026-2',
    creditos:6,
    segundaFecha:{evaluacion:'Examen Final',examenMenorQue:3,promedioPonderadoMin:3.95,
      requiereTodas:true,aviso:'Confirma con la Escuela los requisitos y la fecha. La app no calcula el resultado'},
    // El programa lista los tres solemnes por separado: van como filas propias,
    // y así cada uno lleva su fecha a la agenda.
    //
    // OJO, esto NO es solo cosmético. Antes eran una casilla al 60% con slots:3.
    // Con los tres rendidos da lo mismo, pero si falta alguno Y el examen ya está
    // puesto, el número cambia: la casilla agrupada asumía que los solemnes que
    // faltan van a salir como los rendidos, y en filas separadas el que falta se
    // descarta y se repondera sobre lo evaluado — que es lo que hace el motor con
    // cualquier otra categoría vacía. Con un solo solemne rendido la diferencia
    // llega a más de un punto. Se eligió la forma consistente con el resto.
    evals:[['Solemne 1',20,{fecha:'2026-08-28'}],['Solemne 2',20,{fecha:'2026-09-26'}],['Solemne 3',20,{fecha:'2026-11-06'}],['Examen Final',40,{min:3.0,cap:3.9,fecha:'2026-11-21'}]],
  },
  // Introducción a la Microeconomía · ENMIC155 · programa oficial actualizado
  // julio 2026. Los tres controles van en filas propias porque el programa los
  // enumera uno por uno, con fecha cada uno (21 de agosto, 16 de octubre y 6 de
  // noviembre) y con reglas de reemplazo DISTINTAS: si faltas al 1 te ponen la
  // Solemne, si faltas al 2 o al 3 te ponen el Examen. No son intercambiables.
  // Las pruebas sorpresa sí se quedan agrupadas: el programa dice que son cinco
  // pero no las identifica ni las fecha — son sorpresa, no hay agenda que poner.
  //
  // Las tres fechas estaban acá arriba, en este comentario, desde que se
  // transcribió el programa: escritas pero fuera del alcance de la app, así que
  // ningún estudiante las veía en su Agenda. Ahora van en la pauta. El programa
  // las enumera en este orden, que además es el cronológico.
  'Introducción a la Microeconomía':{
    creditos:6,
    periodo:'2026-2',
    recuperativo:{min:3.6,max:3.9,nota:4.0},
    // El programa dice exactamente qué ocurre en cada caso. Reemplazar una
    // nota y mover un peso no son la misma regla: se declaran separadas para
    // no convertir el segundo caso en una nota ficticia.
    ausenciasJustificadas:{
      reemplazos:[
        {desde:'Control 1',hacia:'Solemne'},
        {desde:'Solemne',hacia:'Examen'},
        {desde:'Control 2',hacia:'Examen'},
        {desde:'Control 3',hacia:'Examen'},
      ],
      traspasos:[{desde:'Pruebas sorpresa',hacia:'Examen'}],
    },
    // No es un cálculo: es procedimiento del curso.
    reglasDelCurso:[
      'Si faltas al Examen tienes que dar el recuperativo',
    ],
    evals:[
      // La solemne y los controles traen fecha del calendario; la del examen
      // sale del calendario de exámenes 2026-2 (entregado el 2026-11-02).
      ['Solemne',30,{fecha:'2026-09-30'}],
      ['Control 1',10,{fecha:'2026-08-21'}],
      ['Control 2',10,{fecha:'2026-10-16'}],
      ['Control 3',10,{fecha:'2026-11-06'}],
      // Las pruebas sorpresa no llevan fecha a propósito: son sorpresa.
      ['Pruebas sorpresa',5,{slots:5}],
      ['Examen',35,{fecha:'2026-11-27'}],
    ],
  },
  // Verificado contra el programa oficial ENGEP 155/0, sección 4.2.
  'Gestión de Personas':{
    creditos:6,
    noCalcula:['Te eximes del examen si promedias 5,5 o más en los Casos y no tienes ninguna nota bajo 4,0 en dos o más de ellos. En ese caso el examen se reemplaza por el promedio de Casos y ensayos con Participación'],
    // El ajuste sale de cómo te evalúan tus compañeros: es un dato que solo
    // existe cuando el curso lo entrega. La app no puede anticiparlo.
    reglasDelCurso:['La nota del trabajo grupal se ajusta ±10 décimas según la evaluación entre compañeros'],
    // El programa desglosa el 30% del trabajo en grupo en partes con nombre y peso
    // PROPIOS (10/60/30 de su bloque). Una casilla agrupada las promediaría a
    // partes iguales, que no es lo que dice el programa: van en filas propias con
    // el peso ya llevado al total del ramo.
    //
    // El 20% de participación también viene desglosado (25/50/25), pero en la
    // práctica es una sola nota: Martín lo confirmó el 2026-11-03 con quienes
    // tienen el ramo. `nombresAnteriores` lleva los pesos de las filas antiguas
    // para que aceptar esta pauta no mueva el promedio de quien ya las llenó.
    // Casos y ensayos NO lleva slots: el programa nunca dice cuántos son.
    evals:[
      ['Casos y ensayos',40],
      ['Trabajo en grupo: Propuesta',3],
      ['Trabajo en grupo: Experiencia de aprendizaje',18],
      ['Trabajo en grupo: Informe Final',9],
      ['Participación',20,{nombresAnteriores:[
        {nombre:'Participación: Asistencia a ayudantías y reuniones',peso:5},
        {nombre:'Participación: Contribuciones en clases',peso:10},
        {nombre:'Participación: Asistencia a clases',peso:5},
      ]}],
      ['Examen Integrativo',10],
    ],
    // La pauta de antes, con la participación en tres filas, era error nuestro:
    // quien la tenga tal cual pasa sola a una fila (`corrigePautas` en
    // normalize()), con sus notas y su promedio. Si solo llenó algunas de las
    // tres, juntarlas movería su promedio, y ahí se le sigue preguntando.
    corrigePautas:[[
      ['Casos y ensayos',40],['Trabajo en grupo: Propuesta',3],['Trabajo en grupo: Experiencia de aprendizaje',18],
      ['Trabajo en grupo: Informe Final',9],['Participación: Asistencia a ayudantías y reuniones',5],
      ['Participación: Contribuciones en clases',10],['Participación: Asistencia a clases',5],['Examen Integrativo',10],
    ]],
    // "Si alguno de los requisitos no se cumple, la nota final será la más baja
    //  entre los dos" → dos compuertas de grupo con tope en su propio promedio.
    grupos:[
      {nombre:'Trabajo individual',evals:['Casos y ensayos','Participación','Examen Integrativo'],min:4.0,cap:'self'},
      {nombre:'Trabajo de grupo',evals:['Trabajo en grupo: Propuesta','Trabajo en grupo: Experiencia de aprendizaje','Trabajo en grupo: Informe Final'],min:4.0,cap:'self'},
    ],
  },
  // Programa oficial ENCOM1005, Primavera 2026. El programa se titula
  // "Comunicación I"; la clave es 'Comunicación' porque así se llama en la malla.
  'Comunicación':{
    periodo:'2026-2',
    creditos:2,
    // El programa dice que sin 4,0 en lo individual las notas grupales "no son
    // válidas" y que el estudiante reprueba, sin decir con qué nota. Es la regla
    // general de la cabecera; el número bajo 4,0 queda aproximado y se avisa abajo.
    reglasDelCurso:[
      'Si tu promedio en las evaluaciones individuales queda bajo 4,0, las notas grupales dejan de contar y repruebas el curso. El programa no dice con qué nota, así que la app te deja en tu promedio individual',
      'Necesitas al menos 6 de las 11 actividades hechas en clases para aprobar',
      'Las notas grupales se ajustan según cómo te evalúan tus compañeros, y pueden moverse hasta un 100%',
      'Faltar sin justificar al pitch inicial, a las clases de expertos, a la solemne o al examen se evalúa con 1,0',
      'Cada profesor puede agregar evaluaciones propias de su sección que dan décimas adicionales',
    ],
    // El examen final son dos productos con peso propio sobre la nota final
    // —presentación grupal 20% y video storytelling individual 10%—, no dos
    // partes de un bloque de 30%. Van en filas propias.
    evals:[
      ['Pitch inicial individual',15],
      ['Columna de opinión',15],
      ['Solemne: elevator pitch',20],
      // El único requisito que el programa sí cuantifica: bajo 4,0 acá la final
      // es "el mínimo entre su promedio final ponderado y 3,8". El tope es 3,8
      // explícito en el programa, no el 3,9 que usamos cuando no lo dicen.
      ['Participación y trabajo en clases',20,{min:4.0,cap:3.8}],
      ['Examen: presentación grupal',20],
      ['Examen: video storytelling',10],
    ],
    // Grupal es solo la presentación del examen (confirmado por Martín el 2026-10-19).
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Pitch inicial individual','Columna de opinión','Solemne: elevator pitch','Participación y trabajo en clases','Examen: video storytelling'],min:4.0,cap:'self'},
    ],
  },
  'Contabilidad':{
    // El programa identifica explícitamente Primavera 2026. Sus porcentajes
    // quedan disponibles después; estas fechas solo se ofrecen en 2026-2.
    periodo:'2026-2',
    creditos:6,
    // "Se elimina el 25% de los controles sorpresa rendidos" salió de noCalcula:
    // `dropLowest` lo declara y en la FEN lo aplica cada estudiante borrando su
    // nota (`descarte_manual`); la ficha lo avisa. El 75% de asistencia NO se puede
    // calcular y se queda: el programa dice "entre 4 y 6 controles", así que no
    // existe el denominador contra el cual medir el 75%.
    // Sin noCalcula: no queda ninguna regla pendiente de implementar.
    reglasDelCurso:['Rendir menos del 75% de los controles sorpresa reprueba el curso con 3,9'],
    // Los mínimos de 1,5 (tope 3,9) que tuvo cada control hasta el 2026-09-23
    // se sacaron a propósito (36db509). Un ramo creado antes los trae guardados
    // y el aviso de pauta cambiada no los ve, porque mira nombres y pesos: se
    // quitan solos al cargar (`retiraCompuertas` en normalize()). Lo confirmó un
    // reporte del 2026-10-12. El mínimo del Examen se queda.
    retiraCompuertas:[{min:1.5,cap:3.9}],
    evals:[
      // Los controles de lectura y los de ejercicios van en filas propias, cada
      // una con su fecha, porque el programa da las dos cosas: cuántos son y
      // cuándo. Los de ejercicios traen "40 % (10% cada uno)" textual, así que el
      // reparto no lo inventamos nosotros. Y en los dos dice "No se elimina nota
      // alguna": nada de `dropLowest` acá.
      //
      // El 10% de los de lectura no se divide exacto en tres. El tercero lleva
      // 3,34 en vez de 3,33 para que la suma dé 100 justo: es un centésimo de
      // punto porcentual, invisible en cualquier nota.
      //
      // El mínimo de 1,5 es POR CONTROL, no por grupo — "nota mínima de 1,5 en
      // controles (lectura, ejercicios y sorpresa) y solemne" —, y por eso cada
      // fila lleva su compuerta. Agruparlos la movía al promedio del grupo, que
      // es una regla distinta y más blanda que la del programa.
      ['Control de Lectura 1',3.33,{fecha:'2026-08-07'}],
      ['Control de Lectura 2',3.33,{fecha:'2026-08-28'}],
      ['Control de Lectura 3',3.34,{fecha:'2026-11-06'}],
      ['Control de Ejercicios 1',10,{fecha:'2026-08-21'}],
      ['Control de Ejercicios 2',10,{fecha:'2026-09-11'}],
      ['Control de Ejercicios 3',10,{fecha:'2026-10-16'}],
      ['Control de Ejercicios 4',10,{fecha:'2026-10-30'}],
      // Los sorpresa sí quedan como lista abierta: "entre 4 y 6 durante el
      // semestre" es el único número que el programa no fija, y son los únicos
      // con descarte (se elimina el 25% de los rendidos).
      ['Controles Sorpresa',5,{lista:true,dropLowest:{fraction:0.25}}],
      ['Solemne',20,{fecha:'2026-09-22'}],
      // Fecha del calendario de exámenes 2026-2 (entregado el 2026-11-02).
      ['Examen',25,{min:3.0,cap:3.4,fecha:'2026-11-19'}],
    ],
  },
  // Tecnologías y Sistemas de Información · ENGIN1505/05 · programa oficial
  // Primavera 2026 (sección 05, profesora Mónica Stambuk). La clave es
  // 'Tecnología y Sistemas de Información' —en singular— porque así se llama en
  // la malla; el programa lo titula "Tecnologías".
  //
  // Este reemplaza la presentación de la clase 1 que teníamos, que declaraba su
  // propia ponderación como provisoria y por eso nunca se transcribió.
  //
  // El programa da la fórmula cerrada y suma 100 exacto:
  //   NF = 20% NS1 + 20% NS2 + 5% JITT + 10% NC + 15% NTF + 30% NE
  //
  // PERO en la práctica no hay JITT: el consenso de los reportes (3 estudiantes,
  // catalog_consensus('fen') al 2026-10-19) trae Controles 15% con dos casillas
  // y nada más distinto. Martín lo dio por oficial ese día. Si un programa
  // posterior vuelve a separar el JITT, se revierte acá.
  //
  // Las dos solemnes van en filas propias porque el programa les da peso propio
  // (20% cada una, no un bloque de 40%), igual que en Métodos Matemáticos II: si
  // falta una y el examen ya está puesto, filas separadas reponderan sobre lo
  // rendido en vez de asumir que la que falta saldrá como la otra.
  //
  // Los Controles sí llevan `slots:2`: el número no se dedujo, el programa dice
  // "dos controles en el semestre" y define NC como su promedio.
  //
  // OJO con las fechas: el programa las daba como rangos que fijan las Escuelas
  // de Pregrado. La solemne 1 ya quedó fijada (25 de septiembre, calendario
  // entregado por Martín el 2026-09-18); el examen sigue en rango (18 nov–2 dic)
  // y la solemne 2 está por confirmar. Un rango no es una fecha, así que esas
  // dos no van a la agenda.
  'Tecnología y Sistemas de Información':{
    periodo:'2026-2',
    creditos:6,
    // Ninguna evaluación tiene nota mínima propia ni hay eximición. El programa
    // no lo dice, pero el Trabajo Final es grupal y aplica la regla general de
    // la cabecera (confirmado por Martín el 2026-10-19).
    //
    // La primera regla sale del programa: las solemnes y el examen son el
    // "componente común" y el 30% restante es "de definición libre de la
    // sección". Los 33 reportes de catalog_reports al 2026-10-27 lo confirman:
    // todos traen 20/20/30 y reparten ese 30% de al menos cinco formas.
    reglasDelCurso:[
      'Las solemnes y el examen (70%) son iguales en todas las secciones, pero el 30% restante lo reparte cada sección a su manera. Si en la tuya no son Controles 15% y Trabajo Final 15%, edita la pauta',
      'Las dos solemnes y el examen comparten una única recuperativa, que se rinde después del examen y a la que solo accede quien justificó su inasistencia',
      'La asistencia a las ayudantías es obligatoria, y los controles se rinden en ese horario',
    ],
    evals:[
      ['Controles',15,{slots:2}],
      ['Trabajo Final',15],
      ['Solemne 1',20,{fecha:'2026-09-25'}],
      ['Solemne 2',20],
      ['Examen',30,{fecha:'2026-11-24'}],
    ],
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Controles','Solemne 1','Solemne 2','Examen'],min:4.0,cap:'self'},
    ],
  },
  // Marketing · ENMKT205 · programa oficial Primavera 2026 (Ing. Comercial).
  // Cuatro evaluaciones de 25% parejo, sin sorpresas en las ponderaciones.
  //
  // Dos cosas quedaron sin `slots` a propósito:
  //   Controles — "al terminar cada unidad del curso", y nunca dice cuántas
  //     unidades son. La agenda del programa lista 9 sesiones pero se declara
  //     "tentativa", así que 9 sería un número plausible e inventado.
  //   Trabajo Práctico — dice que son 2 entregas, pero no dice cuánto vale cada
  //     una ni si se califican por separado. Repartir 12,5 y 12,5 sería
  //     inventarlo. Sin slots el estudiante ingresa las notas que le pongan.
  'Marketing':{
    periodo:'2026-2',
    creditos:6,
    // Las tres son permanentes, cada una por su motivo. La primera el motor sí la
    // modela, con `group_min` y cap 'self': el veredicto aprobado/reprobado
    // coincide siempre (barrido de las 6561 combinaciones), y el número solo
    // difiere cuando ya estás reprobado por los dos caminos. Es una aproximación
    // deliberada y por eso se declara, no una deuda.
    //
    // La cuarta no sale del programa: la confirmó Martín el 2026-11-11. Los 20
    // reportes de catalog_reports a esa fecha traen todos Solemne 25% y reparten
    // el resto de al menos seis formas (Examen 30 o 35, Trabajo Práctico 20 o 30,
    // Controles 15 a 25), como Tecnología y Sistemas de Información. Los pesos no
    // se tocan: siguen siendo los del programa.
    reglasDelCurso:[
      'Si tu promedio en las evaluaciones individuales (Solemne, Controles y Examen) queda bajo 4,0, las notas grupales no se consideran y tu nota final pasa a ser ese promedio individual',
      'La nota del trabajo grupal se ajusta con un modificador por evaluación de pares, normalmente entre -0,9 y +0,9, aunque el rango cambia cada semestre',
      'Las evaluaciones no se repiten. Con prueba recuperativa autorizada se recupera solo una, Solemne o Examen, y nunca los controles',
      'La Solemne (25%) es igual en todas las secciones, pero el resto lo reparte cada sección a su manera. Si en la tuya Controles, Trabajo Práctico y Examen Final no valen 25% cada uno, edita la pauta',
    ],
    evals:[
      ['Solemne',25],
      ['Controles',25,{lista:true}],
      ['Trabajo Práctico',25],
      ['Examen Final',25,{min:3.0,cap:3.9,fecha:'2026-12-01'}],
    ],
    // "Para aprobar se requiere un promedio ponderado ≥ 4,0 en las evaluaciones
    //  individuales. Las notas grupales sólo se consideran si se cumple eso."
    //
    // No es exactamente cap:'self'. La regla dice que bajo 4,0 el trabajo grupal
    // deja de contar (final = promedio individual); cap:'self' topa la final en
    // el promedio individual, que es un pelo más abajo cuando el trabajo grupal
    // salió malo. Barrí las 6561 combinaciones: difieren en el número en 1171,
    // hasta 0,74 — pero el veredicto aprobado/reprobado coincide en TODAS, y
    // siempre estando ya reprobado. Por eso se usa igual, y la regla textual va
    // arriba en noCalcula para que el estudiante sepa de dónde sale su número.
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Solemne','Controles','Examen Final'],min:4.0,cap:'self'},
    ],
  },
  // Introducción a la Economía · ENECO105 · programa oficial Otoño 2026, común a
  // las nueve secciones. Es el mejor documentado de todos: da el peso de cada
  // control por separado, y no son iguales entre sí (8, 8, 10, 10).
  //
  // Las evaluaciones extra (pruebas online + curso de Educación Financiera) NO
  // están acá a propósito: no son parte del 100%, solo pueden subir la final y
  // con una fórmula condicional que el motor no sabe representar. Va a noCalcula.
  'Introducción a la Economía':{
    periodo:'2026-1',
    creditos:6,
    noCalcula:[
      'Las evaluaciones extra (pruebas online semanales y el curso de Educación Financiera) solo suben la nota si apruebas las obligatorias con 4,0 o más, y solo si te va mejor en ellas: ahí la final pasa a ser 90% obligatorias más 10% extra',
      'Si faltas a un control o a la Solemne con justificativo aprobado por la Escuela, ese porcentaje se acumula para el Examen',
    ],
    // Quién puede dar el recuperativo lo decide la Escuela, no un cálculo.
    reglasDelCurso:[
      'Solo puedes dar Examen Recuperativo si no pudiste rendir el Examen por causa justificada y aprobada por la Escuela de Pregrado',
    ],
    evals:[
      ['Control 1',8],
      ['Control 2',8],
      ['Solemne',22],
      ['Control 3',10],
      ['Control 4',10],
      ['Tarea Grupal',10],
      ['Examen',32],
    ],
    // Regla general de la cabecera: el programa no la menciona.
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Control 1','Control 2','Solemne','Control 3','Control 4','Examen'],min:4.0,cap:'self'},
    ],
  },
  // Métodos Matemáticos I · ENMEM1005 · común a las nueve secciones.
  // Tres solemnes de 20% y examen de 40%. Confirmado por Martín el 2026-08-31,
  // y es la misma en otoño y en primavera.
  //
  // La versión anterior decía C1*0,15 + C2*0,15 + C3*0,15 + S*0,25 + Exa*0,3 y
  // estaba vieja. La cazaron los estudiantes antes que nosotros: cinco
  // reportaron esta misma pauta por separado, cuatro de ellos escribiendo
  // "Solemne 1/2/3". Es el primer dato del catálogo que llega por esa vía.
  'Métodos Matemáticos I':{
    creditos:6,
    periodo:'2026-2',
    segundaFecha:{evaluacion:'Examen',examenMenorQue:3,promedioPonderadoMin:3.95,
      requiereTodas:true,aviso:'Confirma con la Escuela los requisitos y la fecha. La app no calcula el resultado'},
    noCalcula:[
      'Cada evaluación que no rindas se califica con 1,0',
    ],
    reglasDelCurso:['Una inasistencia a una solemne o al examen justificada por la Secretaría también puede dar derecho al Examen de Segunda Fecha. La app no conoce esa resolución'],
    evals:[
      ['Solemne 1',20],
      ['Solemne 2',20],
      ['Solemne 3',20],
      ['Examen',40,{min:3.0,cap:3.9}],
    ],
  },
  // Programación para Analítica de Datos · ENGIN105 · programa oficial.
  // Los controles van sin `slots`: el programa dice que valen 30% pero nunca
  // dice cuántos son, así que el estudiante agrega los que le tomen.
  'Programación para Analítica de Datos':{
    creditos:6,
    noCalcula:[
      'Si la Prueba Solemne II queda bajo 4,0, tu nota final pasa a ser la más baja entre tu promedio ponderado y la nota del Examen',
      'El examen recuperativo puede reemplazar cada control o solemne que haya quedado bajo la nota que saques en él, salvo las notas puestas por medidas disciplinarias',
    ],
    // Sanción disciplinaria: no sale de las notas.
    reglasDelCurso:[
      'Copiar en una tarea, solemne o examen deja la nota final del curso en 1,0',
    ],
    evals:[
      ['Controles',30],
      ['Prueba Solemne',30],
      ['Examen',40],
    ],
  },
  // Gestión y Empresas · programa 2026 de la sección 07 (profesora Andrea Triat).
  // OJO: es el programa de UNA sección, no el común del ramo. Las otras secciones
  // pueden ponderar distinto. Si aparece el programa común, este se reemplaza.
  //
  // Los controles de lectura van sin `slots`, y NO es que falte confirmar el
  // número: cambia de una sección a otra. Es lo único que varía entre secciones
  // — el resto de la pauta es igual para todas. Aunque aparezca el cronograma
  // completo de una sección, ese número no sirve para las demás, así que esta
  // fila se queda sin `slots` para siempre y el estudiante agrega los que le
  // tomaron. El aviso de `dropLowest` sirve igual con los que agregue.
  'Gestión y Empresas':{
    noCalcula:[
      'Toda ausencia a una exigencia del curso se califica con 1,0',
    ],
    reglasDelCurso:[
      'La Solemne y el Examen tienen fecha única. Avisando por escrito dentro de 24 horas por razones médicas, solo se puede recuperar una de las dos',
      'Los controles parciales y el Plan de Negocios no son recuperables por ninguna causa',
      'El aporte en clases suma décimas según tu participación',
    ],
    evals:[
      ['Solemne',25],
      ['Controles de Lectura',20,{lista:true,dropLowest:{count:1}}],
      ['Proyecto Empresa',25,{min:3.0,cap:3.9}],
      ['Examen Final',30,{min:3.0,cap:3.9}],
    ],
    // "Para aprobar, el promedio de las evaluaciones individuales tiene que ser
    // 4,0 o más", sin decir la nota: regla general de la cabecera.
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Solemne','Controles de Lectura','Examen Final'],min:4.0,cap:'self'},
    ],
  },
  // Inglés IV · sección IC 3506 · calendario oficial 2026. Los nombres quedan en
  // inglés porque así aparecen en el calendario que recibe el estudiante.
  //
  // Quizzes (15%) y Labs (15%) vienen como bloque, pero cada uno tiene fecha
  // propia en el calendario y el Quiz 1 es oral mientras el 2 es escrito, así que
  // van en filas separadas. El reparto en partes iguales dentro de cada bloque
  // es supuesto nuestro: el calendario no da el peso individual.
  // El Entrepreneurship Project sí trae su reparto explícito, 40% Business Plan
  // y 60% Business Pitch sobre su 15%, o sea 6 y 9 puntos.
  //
  // Solo el Midterm lleva fecha: el calendario ubica Quizzes, Business Plan y
  // Pitch por número de clase ("clases 8–10"), que no es una fecha, y el Final
  // Exam cae en el rango que fija la Escuela (18 nov–2 dic).
  'Inglés IV':{
    periodo:'2026-2',
    noCalcula:[
      'El Busuu es reprobatorio: hay que completar las 169 actividades del Complete English Intermediate B2, con un mínimo de 117, y su nota se arma con 70% actividades y 30% certificado',
    ],
    evals:[
      ['Busuu',10],
      ['Quiz 1',7.5],
      ['Quiz 2',7.5],
      ['Lab 1',5],
      ['Lab 2',5],
      ['Lab 3',5],
      ['Business Plan',6],
      ['Business Pitch',9],
      ['Midterm',15,{fecha:'2026-09-21'}],
      ['Final Exam',30,{fecha:'2026-11-18'}],
    ],
  },
  // ─── Pautas del consenso de reportes ─────────────────────────────────────
  // Estos tres ramos no tienen programa transcrito: la pauta es la que
  // coincidieron en reportar los estudiantes (catalog_consensus('fen') al
  // 2026-10-19) y Martín la dejó como oficial ese día. Si aparece el programa,
  // se reemplaza.
  //
  // Nombres, mayúsculas y ORDEN son los del consenso a propósito, aunque no sea
  // el orden del semestre. Quien ya tenía la pauta del consenso puesta sola
  // guardó `pautaHuella` con ese orden y esos nombres exactos, y huellaPauta()
  // compara las dos cosas: cualquier diferencia le mostraría "La pauta de este
  // ramo cambió" sin ningún cambio real que mostrar.
  //
  // Inglés II · 9 estudiantes.
  'Inglés II':{
    periodo:'2026-2',
    creditos:2,
    evals:[
      ['busuu',15],
      ['Final Exam',40],
      ['Midterm test',15],
      ['Oral quiz',20],
      ['written quiz',10],
    ],
  },
  // Introducción al Pensamiento Económico y Político · 3 estudiantes. Es una
  // sola solemne aunque se llame "Solemne 1": así la reportaron.
  'Introducción al Pensamiento Económico y Político':{
    periodo:'2026-2',
    creditos:4,
    evals:[
      ['Control 1',15],
      ['Control 2',15],
      ['Examen',40],
      ['Solemne 1',30],
    ],
  },
  // Métodos Matemáticos IV · 3 estudiantes. Nadie reportó mínimo en el examen
  // (Métodos Matemáticos I sí lo tiene); no se copia de allá.
  'Métodos Matemáticos IV':{
    periodo:'2026-2',
    creditos:6,
    evals:[
      ['Examen',40],
      ['Solemne 1',20],
      ['Solemne 2',20],
      ['Solemne 3',20],
    ],
  },

  // ─── Programas del catálogo de intercambio (Nexo Internacional FEN) ────────
  // Los once que siguen salen de los programas que la propia Facultad enlaza
  // en su catálogo público para estudiantes de intercambio
  // (nexointernacional.fen.uchile.cl/wp-content/uploads/2026/05/Course-Catalog-Summary-1.pdf,
  // leído el 2026-11-26). Ese catálogo enlaza 244 programas: 152 se pueden
  // bajar sin sesión, y de esos solo se transcribieron los que declaran 2026 y
  // calzan con un ramo de la malla que no tenía pauta. Los demás son de 2011 a
  // 2024 o no dicen de cuándo son, y un programa viejo no se carga como vigente.
  //
  // Todos son de Otoño 2026: llevan `periodo:'2026-1'`, así que la app ofrece
  // los porcentajes y ninguna fecha, y el registro del servidor solo los
  // protege del consenso automático en ese período. Por eso quedaron fuera los
  // dos de Verano 2026 (Ética y Negocios, Toma de Decisiones Bajo
  // Incertidumbre): sin período declarado bloquearían el consenso de todos los
  // semestres con la pauta de un curso de verano. También Negocios I, cuyo
  // único programa público es el de la sección que se dicta en inglés, y
  // Métodos Cuantitativos I de Ing. Comercial, que tiene un programa por mención.
  //
  // Las inasistencias justificadas van como texto y no como
  // `ausenciasJustificadas`: esa regla se resuelve contra la pauta guardada de
  // quien ya tiene el ramo, y un programa del semestre pasado no debe escribir
  // nada ahí.
  //
  // Los créditos son los que declara el catálogo junto a cada sigla.

  // Introducción a la Macroeconomía · ENMAC2005 (el programa lo cita ENMAC205)
  // · Otoño 2026, secciones 01 y 02. Controles y examen (80%) son coordinados
  // entre todas las secciones; el 20% restante es de este profesor.
  'Introducción a la Macroeconomía':{
    periodo:'2026-1',
    creditos:6,
    // "Promedio simple entre Controles y Examen Final igual o superior a 3.5":
    // la compuerta de grupo pondera por peso (50 y 30), que no es un promedio
    // simple. No se aproxima con la regla equivocada.
    noCalcula:[
      'Además del 4,0 final, para aprobar necesitas 3,5 o más en el promedio simple entre tu nota de Controles y el Examen',
    ],
    reglasDelCurso:[
      'Los controles y el examen (80%) son comunes a todas las secciones; el 20% restante lo define cada profesor. Esta pauta es la de las secciones 01 y 02 de Otoño 2026: si en la tuya es distinto, edita la pauta',
      'Si faltas justificadamente a más de un control, ese porcentaje pasa al Examen',
      'Si después del examen no cumples los criterios de aprobación puedes dar un recuperativo, que sirve para cumplirlos pero no para subir tu nota más allá de eso',
      'Cada reporte de Seguimiento Macro pierde un punto por cada 24 horas de atraso',
    ],
    evals:[
      // "Seis (6) controles… se eliminará el control con la peor nota."
      ['Controles',50,{slots:6,slotLabel:'Control',dropLowest:{count:1}}],
      ['Examen',30],
      ['Seguimiento Macro',5],
      // "Al menos cinco": la cantidad no está fijada, así que es lista abierta.
      ['Análisis Flash',5,{lista:true,dropLowest:{count:2}}],
      ['Macro Influencers',10],
    ],
    // Macro Influencers es grupal: regla general de la cabecera.
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Controles','Examen','Seguimiento Macro','Análisis Flash'],min:4.0,cap:'self'},
    ],
  },
  // Estadística II · ENMES2505 (el programa lo cita MES-250) · Otoño 2026,
  // común a las cuatro secciones. No hay examen: la Solemne 2 se rinde en el
  // período de exámenes.
  //   NF = 0,25·NSOL1 + 0,25·NSOL2 + 0,5·NC
  // y para aprobar: NF ≥ 3,95, NC ≥ 3,95, NSOL1 ≥ 3,45 y NSOL2 ≥ 3,45. Los tres
  // mínimos van con `exacto` porque el programa los da a la centésima.
  'Estadística II':{
    periodo:'2026-1',
    creditos:6,
    // Quien reprueba queda con "el mínimo entre NF, NC, (NSOL1+NSOL2)/2 y 3,7".
    // Las compuertas solo ponen el 3,7; lo otro queda avisado.
    noCalcula:[
      'Si repruebas, tu nota final es la más baja entre tu promedio ponderado, tu nota de Controles, el promedio de las dos solemnes y 3,7. La app solo aplica el tope de 3,7',
      'Si cumples tres de las cuatro condiciones para aprobar puedes dar un Examen Recuperativo Oral: con 4,0 o más apruebas el curso con un 4,0, y con menos repruebas',
    ],
    reglasDelCurso:[
      'Si faltas justificadamente a un control, lo recuperas con preguntas de la solemne siguiente; si faltas a una solemne, la recuperas en el Examen Recuperativo Oral',
    ],
    evals:[
      ['Solemne 1',25,{min:3.45,cap:3.7,exacto:true}],
      ['Solemne 2',25,{min:3.45,cap:3.7,exacto:true}],
      // "En total habrá 6 notas de controles. No se eliminará ninguna nota."
      ['Controles',50,{slots:6,slotLabel:'Control',min:3.95,cap:3.7,exacto:true}],
    ],
  },
  // Microeconomía I · ENMIC3005 (el programa lo cita ENMIC305) · Otoño 2026,
  // profesores Duarte y Rivera. Dos solemnes de 30% y examen de 40%; el programa
  // no trae mínimos ni eximición.
  'Microeconomía I':{
    periodo:'2026-1',
    creditos:6,
    evals:[
      ['Solemne 1',30],
      ['Solemne 2',30],
      ['Examen',40],
    ],
  },
  // Macroeconomía I · ENMAC3005 · Otoño 2026, sección del profesor Céspedes.
  // Controles, solemne y examen son comunes con la otra sección.
  'Macroeconomía I':{
    periodo:'2026-1',
    creditos:6,
    // El descarte depende de la asistencia, que la app no conoce: no va como
    // `dropLowest` con una cantidad elegida por nosotros.
    reglasDelCurso:[
      'Con más de 80% de asistencia a cátedra se eliminan tus dos peores controles, y entre 70% y 80% se elimina uno. Borra tú esas notas',
      'Si faltas justificadamente a la solemne, su porcentaje pasa al examen',
      'Un control al que faltas justificadamente se reemplaza por la nota de la solemne si era anterior a ella, o por la del examen. Sin justificar es un 1,0',
    ],
    evals:[
      ['Solemne',40],
      ['Examen',40],
      // "Se realizarán nueve controles."
      ['Controles',20,{slots:9,slotLabel:'Control'}],
    ],
  },
  // Historia Económica · ENHEC3005 (el programa lo cita ENHEC300/01) · Otoño
  // 2026, sección 01. Los dos controles traen peso propio (15% cada uno).
  'Historia Económica':{
    periodo:'2026-1',
    creditos:6,
    noCalcula:[
      'La presentación oral voluntaria mueve tu nota de presentación al examen entre −2 y +5 décimas, y participar en los foros suma hasta 3 décimas más',
    ],
    evals:[
      ['Control 1',15],
      ['Control 2',15],
      ['Solemne',30],
      ['Examen',40],
    ],
  },
  // Microeconomía II · ENMIC3505 (el programa lo cita ENMIC355) · Otoño 2026.
  // "Que el promedio de la solemne y el examen supere el 3,5": pesan lo mismo,
  // así que la compuerta de grupo es exactamente ese promedio. El programa no
  // dice con qué nota se reprueba: va el 3,9 de cuando no lo dicen.
  'Microeconomía II':{
    periodo:'2026-1',
    creditos:6,
    reglasDelCurso:[
      'El programa no dice con qué nota repruebas si la solemne y el examen no promedian 3,5: la app te deja en 3,9',
      'La nota de Asistencia es proporcional a las sesiones a las que vas, y las faltas a clases no se justifican',
      'Si faltas justificadamente a la solemne o al examen das una prueba recuperativa acumulativa, más difícil, en el período de exámenes. Si faltas a las dos no puedes aprobar',
    ],
    evals:[
      ['Solemne',35],
      ['Examen',35],
      ['Tareas',20],
      ['Asistencia',10],
    ],
    grupos:[
      {nombre:'Solemne y Examen',evals:['Solemne','Examen'],min:3.5,cap:3.9,exacto:true},
    ],
  },
  // Macroeconomía III · ENMAC4005 · Otoño 2026, profesor Micco. "El promedio
  // simple entre Solemne y Examen debe ser mayor a 3.45": pesan lo mismo.
  'Macroeconomía III':{
    periodo:'2026-1',
    creditos:6,
    reglasDelCurso:[
      'El programa no dice con qué nota repruebas si la solemne y el examen no promedian 3,45: la app te deja en 3,9',
      'Necesitas 75% de asistencia presencial a cátedra y ayudantía para aprobar',
      'Faltar sin justificar a una evaluación es un 1,0',
    ],
    evals:[
      // "De los controles de lectura se eliminará uno": no dice cuántos son.
      ['Controles de Lectura',25,{lista:true,dropLowest:{count:1}}],
      ['Solemne',30],
      ['Examen',30],
      ['Trabajo Grupal',15],
    ],
    grupos:[
      {nombre:'Solemne y Examen',evals:['Solemne','Examen'],min:3.45,cap:3.9,exacto:true},
      // El trabajo es grupal: regla general de la cabecera.
      {nombre:'Evaluaciones individuales',evals:['Controles de Lectura','Solemne','Examen'],min:4.0,cap:'self'},
    ],
  },
  // Microeconomía IV · ENMIC4505 (el programa lo cita ENMIC455) · Otoño 2026,
  // profesor Pino. "El promedio entre controles de lectura, controles sorpresa,
  // solemne y examen debe ser igual o superior a 3.95", con las mismas
  // ponderaciones de la nota final: es la compuerta de lo individual, y las
  // tareas son lo único grupal.
  'Microeconomía IV':{
    periodo:'2026-1',
    creditos:6,
    reglasDelCurso:[
      'Si faltas justificadamente a la solemne, su porcentaje pasa al examen',
      'Si justificas la falta a un control de lectura, se te considera el promedio de los otros dos; si justificas dos, das un control recuperativo al final del semestre',
      'Los controles sorpresa no se recuperan, y las tareas atrasadas no se reciben',
    ],
    evals:[
      ['Controles de lectura',20,{slots:3,slotLabel:'Control'}],
      // "6-8 controles sorpresa… se borrará la peor nota."
      ['Controles sorpresa',10,{lista:true,dropLowest:{count:1}}],
      ['Solemne',25],
      ['Examen',25],
      ['Tareas',20,{slots:2,slotLabel:'Tarea'}],
    ],
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Controles de lectura','Controles sorpresa','Solemne','Examen'],min:4.0,cap:'self'},
    ],
  },
  // Macroeconomía IV · ENMAC4505 (el programa lo cita ENMAC 455/01) · Otoño
  // 2026. Los tres controles de lectura traen peso propio (10% cada uno).
  'Macroeconomía IV':{
    periodo:'2026-1',
    creditos:6,
    // "Aprobación si promedio pruebas ≥ 4,0 & promedio ponderado ≥ 4,0." No
    // dice qué cuenta como prueba ni si ese promedio es simple o ponderado.
    reglasDelCurso:[
      'Para aprobar necesitas, además del 4,0 final, promedio 4,0 o más en las pruebas. El programa no dice cómo se calcula ese promedio: la app usa tus evaluaciones individuales con sus ponderaciones',
      'Necesitas más de 75% de asistencia para aprobar',
      'Los controles que no rindas con justificación se acumulan al Examen',
      'Las presentaciones de las tareas en clases pueden sumar o restar',
    ],
    evals:[
      ['Control de Lectura 1',10],
      ['Control de Lectura 2',10],
      ['Control de Lectura 3',10],
      ['Tareas',20,{slots:2,slotLabel:'Tarea'}],
      ['Ensayo',10],
      ['Examen',40],
    ],
    // Las tareas se pueden hacer en grupo: regla general de la cabecera.
    grupos:[
      {nombre:'Evaluaciones individuales',evals:['Control de Lectura 1','Control de Lectura 2','Control de Lectura 3','Ensayo','Examen'],min:4.0,cap:'self'},
    ],
  },
  // Investigación Operativa · ENGIN3505 (el programa lo cita ENOPE300) · Otoño
  // 2026, profesores Miranda y Herl. El programa da fórmulas cerradas:
  //   NC = (C1+C2+C3)/3 · NTC = 0,3·TC1 + 0,7·TC2
  //   NP = 0,5·S1 + 0,3·NC + 0,2·NTC · NF = 0,4·EX + 0,6·NP
  // Los pesos de abajo son esos productos ya llevados a la nota final, y suman
  // 100 exacto. "Si cumple NF ≥ 4,0 pero no NEX ≥ 3,0, su nota final será 3,8".
  'Investigación Operativa':{
    periodo:'2026-1',
    creditos:6,
    noCalcula:[
      'Te eximes del examen si tu nota de presentación (solemne 50%, controles 30% y talleres 20%) es 5,5 o más',
    ],
    reglasDelCurso:[
      'Si faltas justificadamente a la solemne, su nota se reemplaza por la del examen',
      'Un control al que faltas justificadamente se reemplaza por la nota de una pregunta de la solemne, que elige el equipo docente',
      'Faltar sin certificado médico y bono de la consulta es un 1,0 en esa evaluación',
    ],
    evals:[
      ['Solemne',30],
      ['Control 1',6],
      ['Control 2',6],
      ['Control 3',6],
      ['Taller Computacional 1',3.6],
      ['Taller Computacional 2',8.4],
      ['Examen',40,{min:3.0,cap:3.8}],
    ],
  },
  // Métodos Cuantitativos · ENMEC3015 (el programa lo titula "MEC 310 Métodos
  // Cuantitativos I") · Otoño 2026, secciones 01 y 02. Es el de Auditoría e
  // Ing. en Información y Control de Gestión, que en la malla va sin número; el
  // 'Métodos Cuantitativos I' de Ing. Comercial es otro programa y no recibe
  // esta pauta. El catálogo le da una sigla distinta de la MEC3005 que anota
  // CREDITOS_FEN: queda pendiente de revisar con Martín.
  //
  // "0,5·NSOL + 0,5·NEX ≥ 3,45", y quien no cumple queda en
  // min{3,9; promedio ponderado}: es la compuerta de grupo tal cual.
  'Métodos Cuantitativos':{
    periodo:'2026-1',
    creditos:6,
    reglasDelCurso:[
      'Si faltas a la solemne o a un control tienes una evaluación recuperativa oral después del examen. Solo se puede recuperar una',
    ],
    evals:[
      ['Solemne',30],
      ['Examen',30],
      // "6 controles… promedio simple de los 4 mejores."
      ['Controles',30,{slots:6,slotLabel:'Control',dropLowest:{count:2}}],
      // "Tendremos tareas semanales": no dice cuántas.
      ['Tareas',10,{lista:true}],
    ],
    grupos:[
      {nombre:'Solemne y Examen',evals:['Solemne','Examen'],min:3.45,cap:3.9,exacto:true},
    ],
  },
};

// UAI · programas entregados por Lucas el 2026-09-08. Son pautas de secciones
// concretas, no reglas de toda la universidad. El ámbito aparece en la ficha.
// Los pesos son de la NOTA FINAL: no se copia como final un % de presentación.
// Los bloques cuyo reparto interno no está fijado reciben la nota consolidada
// del curso. No se inventan casillas, fechas de examen ni créditos ausentes.
