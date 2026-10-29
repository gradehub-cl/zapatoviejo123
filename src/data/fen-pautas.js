
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
// salen de acá (así salió "se elimina el 25% de los controles", que hoy calcula
// `dropLowest`).
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
    // Fechas del calendario 2026-2 entregado por Martín el 2026-09-18. El
    // examen lo fija la Facultad y no tiene fecha; la segunda fecha del examen
    // (3 dic) no es una evaluación aparte, así que no va como fila.
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
    evals:[['Solemne 1',20,{fecha:'2026-08-28'}],['Solemne 2',20,{fecha:'2026-09-26'}],['Solemne 3',20,{fecha:'2026-11-06'}],['Examen Final',40,{min:3.0,cap:3.9}]],
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
      // La solemne y los controles traen fecha del calendario; el examen lo
      // fija la Escuela dentro de un rango (18 nov–2 dic) y un rango no es fecha.
      ['Solemne',30,{fecha:'2026-09-30'}],
      ['Control 1',10,{fecha:'2026-08-21'}],
      ['Control 2',10,{fecha:'2026-10-16'}],
      ['Control 3',10,{fecha:'2026-11-06'}],
      // Las pruebas sorpresa no llevan fecha a propósito: son sorpresa.
      ['Pruebas sorpresa',5,{slots:5}],
      ['Examen',35],
    ],
  },
  // Verificado contra el programa oficial ENGEP 155/0, sección 4.2.
  'Gestión de Personas':{
    creditos:6,
    noCalcula:['Te eximes del examen si promedias 5,5 o más en los Casos y no tienes ninguna nota bajo 4,0 en dos o más de ellos. En ese caso el examen se reemplaza por el promedio de Casos y ensayos con Participación'],
    // El ajuste sale de cómo te evalúan tus compañeros: es un dato que solo
    // existe cuando el curso lo entrega. La app no puede anticiparlo.
    reglasDelCurso:['La nota del trabajo grupal se ajusta ±10 décimas según la evaluación entre compañeros'],
    // El programa desglosa el 30% del trabajo en grupo y el 20% de participación
    // en partes con nombre y peso PROPIOS (10/60/30 y 25/50/25 de su bloque). Una
    // casilla agrupada las promediaría a partes iguales, que no es lo que dice el
    // programa: van en filas propias con el peso ya llevado al total del ramo.
    // Casos y ensayos NO lleva slots: el programa nunca dice cuántos son.
    evals:[
      ['Casos y ensayos',40],
      ['Trabajo en grupo: Propuesta',3],
      ['Trabajo en grupo: Experiencia de aprendizaje',18],
      ['Trabajo en grupo: Informe Final',9],
      ['Participación: Asistencia a ayudantías y reuniones',5],
      ['Participación: Contribuciones en clases',10],
      ['Participación: Asistencia a clases',5],
      ['Examen Integrativo',10],
    ],
    // "Si alguno de los requisitos no se cumple, la nota final será la más baja
    //  entre los dos" → dos compuertas de grupo con tope en su propio promedio.
    grupos:[
      {nombre:'Trabajo individual',evals:['Casos y ensayos','Participación: Asistencia a ayudantías y reuniones','Participación: Contribuciones en clases','Participación: Asistencia a clases','Examen Integrativo'],min:4.0,cap:'self'},
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
    // el motor ya lo aplica vía `dropLowest`. El 75% de asistencia NO se puede
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
      // El examen lo fija la Escuela entre el 18 nov y el 2 dic: sin fecha.
      ['Examen',25,{min:3.0,cap:3.4}],
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
      ['Examen',30],
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
    reglasDelCurso:[
      'Si tu promedio en las evaluaciones individuales (Solemne, Controles y Examen) queda bajo 4,0, las notas grupales no se consideran y tu nota final pasa a ser ese promedio individual',
      'La nota del trabajo grupal se ajusta con un modificador por evaluación de pares, normalmente entre -0,9 y +0,9, aunque el rango cambia cada semestre',
      'Las evaluaciones no se repiten. Con prueba recuperativa autorizada se recupera solo una, Solemne o Examen, y nunca los controles',
    ],
    evals:[
      ['Solemne',25],
      ['Controles',25,{lista:true}],
      ['Trabajo Práctico',25],
      ['Examen Final',25,{min:3.0,cap:3.9}],
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
  // tomaron. `dropLowest` funciona igual con los que agregue.
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
      ['Final Exam',30],
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
};

// UAI · programas entregados por Lucas el 2026-09-08. Son pautas de secciones
// concretas, no reglas de toda la universidad. El ámbito aparece en la ficha.
// Los pesos son de la NOTA FINAL: no se copia como final un % de presentación.
// Los bloques cuyo reparto interno no está fijado reciben la nota consolidada
// del curso. No se inventan casillas, fechas de examen ni créditos ausentes.
