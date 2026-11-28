// ─── PAUTAS UACh · DERECHO ───────────────────────────────────────────────────
// Salen de los programas de asignatura que la Facultad de Ciencias Jurídicas y
// Sociales publica en derecho.uach.cl/programas-y-mallas, leídos el 2026-11-27.
// Cada pauta lleva al lado el código de sus dos sedes (Valdivia y Puerto Montt
// comparten programa), el período que declara el programa y la URL del PDF. Los
// SHA-256, lo que quedó fuera y por qué están en docs/mallas-uach.md.
//
// Solo los programas que traen la lista «Evaluaciones (fechas y ponderaciones)»
// y son coherentes consigo mismos: 23. Otros 22 tienen los pesos repartidos
// dentro de la tabla de unidades y hay que transcribirlos leyendo cada PDF. Dos
// quedaron fuera porque el programa se contradice: Historia del Derecho Chileno
// suma 110% y Derecho Probatorio dice «sesenta por ciento (65%)».
//
// Todos escriben la pauta igual: las evaluaciones parciales forman la nota de
// presentación a examen (NPE) y la final pondera NPE y examen. Acá va el peso
// sobre la nota final: «NPE 65%: dos pruebas de 50%» son 32,5 y 32,5. Cuánto
// pesa la NPE lo dice cada programa (70, 65 o 60 según el semestre).
//
// Reglamento Interno de la Carrera de Derecho (Resolución N° 075 de 2017, al
// que remiten los programas), Título IV:
//   · Art. 16: para rendir el examen hay que tener 3,5 de presentación,
//     aproximada a la décima; con menos, la nota final ES la de presentación.
//     Es la compuerta `cap:'self'` sobre las parciales, sin `exacto` porque el
//     artículo aproxima.
//   · Art. 10: el examen final es obligatorio; no hay eximición.
// El art. 20 de 2017 fija 60/40 para todo; los programas de 2025 y 2026 ya usan
// 70/30 y 65/35 en los primeros semestres, como el texto refundido de 2025, que
// la página publica «a la espera de ser aprobado». Manda lo que dice cada
// programa.
//
// Sin sigla ni créditos: cada ramo tiene dos códigos, uno por sede, y los
// programas no declaran SCT. La clave es el nombre de mallas-uach.js.
const REGLA_PRESENTACION_UACH='Para rendir el examen necesitas 3,5 de presentación; con menos repruebas y tu nota final es la de presentación (Reglamento Interno de Derecho, art. 16)';
const REGLA_EXAMEN_UACH='El examen final es obligatorio: no se exime (Reglamento Interno de Derecho, art. 10)';
const presentacionUach=evals=>({nombre:'Presentación a examen',evals,min:3.5,cap:'self'});
const PRESETS_UACH={
  // ── 1° semestre ──
  // DPRI050-23 (Valdivia) / ICJU050-23 (Puerto Montt), 2025, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2020/01/SISTEMA_JURIDICO_2025_VD.pdf
  // Presentación 70% × (32% + 33% + 35%) + examen 30%. El tercer control es oral.
  'Sistema Jurídico':{
    periodo:'2025-1',
    evals:[
      ['Control Parcial 1',22.4],
      ['Control Parcial 2',23.1],
      ['Control Parcial 3',24.5],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Control Parcial 1','Control Parcial 2','Control Parcial 3'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI050-23, 2025, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPRI055-23 (Valdivia) / ICJU055-23 (Puerto Montt), 2026, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1411-HISTORIA-DEL-DERECHO.pdf
  // Presentación 70% × (35% + 30% + 35%) + examen 30%. La segunda es oral y no se puede sustituir.
  'Historia del Derecho':{
    periodo:'2026-1',
    evals:[
      ['Primera Evaluación',24.5],
      ['Segunda Evaluación',21],
      ['Tercera Evaluación',24.5],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Primera Evaluación','Segunda Evaluación','Tercera Evaluación'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI055-23, 2026, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPUB065-23 (Valdivia) / ICJU065-23 (Puerto Montt), 2026, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1405-JURISDICCION.pdf
  // Presentación 70% × (100%) + examen 30%. Dos evaluaciones de 50% cada una.
  'Jurisdicción':{
    periodo:'2026-1',
    evals:[
      ['Evaluaciones parciales',70,{slots:2,slotLabel:'Evaluación'}],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Evaluaciones parciales'])],
    reglasDelCurso:['Programa de Derecho UACh DPUB065-23, 2026, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 2° semestre ──
  // DPRI075-23 (Valdivia) / ICJU075-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1233-RAZONAMIENTO-JURIDICO2025V1-RevLM.pdf
  // Presentación 70% × (20% + 40% + 40%) + examen 30%.
  'Razonamiento Jurídico':{
    periodo:'2025-2',
    evals:[
      ['Exposición y participación en clase práctica',14],
      ['Primera prueba parcial',28],
      ['Segunda prueba parcial',28],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Exposición y participación en clase práctica','Primera prueba parcial','Segunda prueba parcial'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI075-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2026, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/CONCEPTOS-FUNDAMENTALES-DE-Do-PRIVADO_2026_VD.pdf
  // Presentación 70% × (50% + 50%) + examen 30%. Prueba I escrita y Prueba II oral.
  'Conceptos Fundamentales de Derecho Privado':{
    periodo:'2026-2',
    evals:[
      ['Prueba I',35],
      ['Prueba II',35],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Prueba I','Prueba II'])],
    reglasDelCurso:['Programa de Derecho UACh, 2026, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPUB085-23 (Valdivia) / ICJU085-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1228-DERECHO-CONSTITUCIONAL-ORGANICO2025V1.pdf
  // Presentación 70% × (50% + 50%) + examen 30%.
  'Derecho Constitucional Orgánico':{
    periodo:'2025-2',
    evals:[
      ['Primera evaluación',35],
      ['Segunda evaluación',35],
      ['Examen',30],
    ],
    grupos:[presentacionUach(['Primera evaluación','Segunda evaluación'])],
    reglasDelCurso:['Programa de Derecho UACh DPUB085-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPUB083-25 (Valdivia) / ICJU084-24 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1206-INTRODUCCION-A-LA-PROFESION-JURIDICA2025V1.pdf
  // Sin examen: 30% + 30% + 40%. «Por las características de la asignatura, esta no contempla examen final.» Solo el control escrito se puede sustituir.
  'Introducción a la Profesión Jurídica':{
    periodo:'2025-2',
    evals:[
      ['Reporte de salida a terreno',30],
      ['Control escrito',30],
      ['Asistencia',40],
    ],
    reglasDelCurso:['Programa de Derecho UACh DPUB083-25, 2025, segundo semestre. Revisa que corresponda a tu curso','Este ramo no tiene examen final: lo dice su programa'],
  },
  // ── 3° semestre ──
  // DPRI115-23 (Valdivia) / ICJU115-23 (Puerto Montt), 2026, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/ACTO-JURIDICO_2026_VD.pdf
  // Presentación 65% × (50% + 50%) + examen 35%. Prueba I oral y Prueba II escrita.
  'Acto Jurídico':{
    periodo:'2026-1',
    evals:[
      ['Prueba I',32.5],
      ['Prueba II',32.5],
      ['Examen',35],
    ],
    grupos:[presentacionUach(['Prueba I','Prueba II'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI115-23, 2026, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 4° semestre ──
  // 2026, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/BIENES_2026-VD.pdf
  // Presentación 65% × (50% + 50%) + examen 35%.
  'Bienes':{
    periodo:'2026-2',
    evals:[
      ['Prueba escrita',32.5],
      ['Prueba oral',32.5],
      ['Examen',35],
    ],
    grupos:[presentacionUach(['Prueba escrita','Prueba oral'])],
    reglasDelCurso:['Programa de Derecho UACh, 2026, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1209-DERECHO-INTERNACIONAL-DE-LOS-DERECHOS-HUMANOS2025V1.pdf
  // Presentación 65% × (40% + 40% + 20%) + examen 35%.
  'Derecho Internacional de los Derechos Humanos':{
    periodo:'2025-2',
    evals:[
      ['Control de lectura',26],
      ['Prueba parcial',26],
      ['Trabajo grupal',13],
      ['Examen',35],
    ],
    grupos:[presentacionUach(['Control de lectura','Prueba parcial','Trabajo grupal'])],
    reglasDelCurso:['Programa de Derecho UACh, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1222-DERECHO-ECONOMICO2025V1.pdf
  // Presentación 65% × (50% + 50%) + examen 35%. «Al menos 1 control de lectura»: el programa no fija cuántos, así que va como lista abierta.
  'Derecho Económico':{
    periodo:'2025-2',
    evals:[
      ['Control de lectura',32.5,{lista:true}],
      ['Prueba',32.5],
      ['Examen',35],
    ],
    grupos:[presentacionUach(['Control de lectura','Prueba'])],
    reglasDelCurso:['Programa de Derecho UACh, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1213-DERECHO-PROCESAL-CONSTITUCIONAL2025V1.pdf
  // Presentación 65% × (50% + 50%) + examen 35%.
  'Derecho Procesal Constitucional':{
    periodo:'2025-2',
    evals:[
      ['Interrogación oral',32.5],
      ['Prueba escrita',32.5],
      ['Examen',35],
    ],
    grupos:[presentacionUach(['Interrogación oral','Prueba escrita'])],
    reglasDelCurso:['Programa de Derecho UACh, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 5° semestre ──
  // DPUB204-23 (Valdivia) / ICJU204-23 (Puerto Montt), 2026, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/BASES-DEL-DERECHO-ADMINISTRATIVO_2026_VD.pdf
  // Presentación 60% × (50% + 50%) + examen 40%.
  'Bases del Derecho Administrativo':{
    periodo:'2026-1',
    evals:[
      ['Primera evaluación parcial',30],
      ['Segunda evaluación parcial',30],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Primera evaluación parcial','Segunda evaluación parcial'])],
    reglasDelCurso:['Programa de Derecho UACh DPUB204-23, 2026, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 6° semestre ──
  // 2026, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/CONTRATOS_2026-VD.pdf
  // Presentación 60% × (50% + 50%) + examen 40%.
  'Contratos':{
    periodo:'2026-2',
    evals:[
      ['Prueba I',30],
      ['Prueba II',30],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Prueba I','Prueba II'])],
    reglasDelCurso:['Programa de Derecho UACh, 2026, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1219-DERECHO-TRIBUTARIO2025V1.pdf
  // Presentación 60% × (80% + 20%) + examen 40%. Dos individuales de 40% y dos grupales de 10% de la presentación.
  'Derecho Tributario':{
    periodo:'2025-2',
    evals:[
      ['Evaluaciones individuales escritas',48,{slots:2,slotLabel:'Evaluación individual'}],
      ['Evaluaciones grupales escritas',12,{slots:2,slotLabel:'Evaluación grupal'}],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Evaluaciones individuales escritas','Evaluaciones grupales escritas'])],
    reglasDelCurso:['Programa de Derecho UACh, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // 2026, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/2026/10/CONTROL-Y-RESPONSABILIDAD-DE-LA-ADMINISTRACION_2026-VD.pdf
  // Presentación 60% × (50% + 50%) + examen 40%.
  'Control y Responsabilidad de la Administración':{
    periodo:'2026-2',
    evals:[
      ['Primera evaluación parcial',30],
      ['Segunda evaluación parcial',30],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Primera evaluación parcial','Segunda evaluación parcial'])],
    reglasDelCurso:['Programa de Derecho UACh, 2026, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPUB220-23 (Valdivia) / ICJU220-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1215-REGULACIONES-AMBIENTALES-Y-DE-RECURSOS-NATURALES2025V1.pdf
  // Presentación 60% × (70% + 30%) + examen 40%. Dos pruebas de 35% cada una.
  'Regulaciones Ambientales y de Recursos Naturales':{
    periodo:'2025-2',
    evals:[
      ['Pruebas escritas',42,{slots:2,slotLabel:'Prueba escrita'}],
      ['Trabajo grupal de investigación',18],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Pruebas escritas','Trabajo grupal de investigación'])],
    reglasDelCurso:['Programa de Derecho UACh DPUB220-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 7° semestre ──
  // 2026, primer semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1388-REDACCION-DE-CONTRATOS.pdf
  // Presentación 60% × (40% + 40% + 20%) + examen 40%.
  'Redacción de Contratos':{
    periodo:'2026-1',
    evals:[
      ['Prueba escrita',24],
      ['Trabajo escrito',24],
      ['Participación y trabajos prácticos',12],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Prueba escrita','Trabajo escrito','Participación y trabajos prácticos'])],
    reglasDelCurso:['Programa de Derecho UACh, 2026, primer semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // ── 8° semestre ──
  // DPRI231-23 (Valdivia) / ICJU231-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1212-RESOLUCION-DE-CONFLICTOS-DEL-TRABAJO2025V1.pdf
  // Presentación 60% × (100%) + examen 40%. Dos evaluaciones de 50% cada una.
  'Resolución de Conflictos del Trabajo':{
    periodo:'2025-2',
    evals:[
      ['Evaluaciones parciales',60,{slots:2,slotLabel:'Evaluación'}],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Evaluaciones parciales'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI231-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPRI232-23 (Valdivia) / ICJU232-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1221-TITULOS-DE-CREDITO-E-INSOLVENCIA2025V1.pdf
  // Presentación 60% × (50% + 50%) + examen 40%.
  'Títulos de Crédito e Insolvencia':{
    periodo:'2025-2',
    evals:[
      ['Primera prueba',30],
      ['Taller práctico',30],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Primera prueba','Taller práctico'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI232-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPRI233-23 (Valdivia) / ICJU233-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1220-DERECHO-Y-PROCEDIMIENTOS-DE-FAMILIA2025V1.pdf
  // Presentación 60% × (100%) + examen 40%. Dos pruebas de 50% cada una.
  'Derecho y Procedimientos de Familia':{
    periodo:'2025-2',
    evals:[
      ['Pruebas escritas',60,{slots:2,slotLabel:'Prueba'}],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Pruebas escritas'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI233-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPRI244-23 (Valdivia) / ICJU244-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1232-DERECHO-Y-PROCEDIMIENTOS-DE-CONSUMO2025V1.pdf
  // Presentación 60% × (100%) + examen 40%. Dos pruebas de 50% cada una.
  'Derecho y Procedimientos de Consumo':{
    periodo:'2025-2',
    evals:[
      ['Pruebas parciales',60,{slots:2,slotLabel:'Prueba parcial'}],
      ['Examen',40],
    ],
    grupos:[presentacionUach(['Pruebas parciales'])],
    reglasDelCurso:['Programa de Derecho UACh DPRI244-23, 2025, segundo semestre. Revisa que corresponda a tu curso',REGLA_PRESENTACION_UACH,REGLA_EXAMEN_UACH],
  },
  // DPUB254-23 (Valdivia) / ICJU254-23 (Puerto Montt), 2025, segundo semestre, https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1214-LITIGACION-PENAL2025V1modificaciones-2do-semestre-2025.pdf
  // Sin examen: 25% + 50% + 25%. «Por tratarse de un ramo eminentemente práctico, el curso no tiene examen final.»
  'Litigación Penal':{
    periodo:'2025-2',
    evals:[
      ['Control de lectura',25],
      ['Participación en talleres',50],
      ['Informe de juicio oral',25],
    ],
    reglasDelCurso:['Programa de Derecho UACh DPUB254-23, 2025, segundo semestre. Revisa que corresponda a tu curso','Este ramo no tiene examen final: lo dice su programa'],
  },
};
