# Reglas de asistencia: revisión de datos

Referencias fijadas a main `b2a0086` del 2026-11-03, antes del retiro. La PR solo modifica `src/data/uc-pautas.js` en código de producción. No hay cambios de motor, normalización, pesos, compuertas, fechas ni ajustes/bonus. No se aplicó ni modificó SQL.

## Retiradas de UC

Los tres textos de Dinámica estaban realmente en `noCalcula`, no en `reglasDelCurso`: ambas listas alimentan las explicaciones de la ficha. Se retiran esos tres y la fecha administrativa de recuperación de Ficción policial.

| Preset / lista | Referencia anterior | Texto retirado |
|---|---|---|
| El misterioso caso del curso de ficción policial (Edición especial Santiago Negro) · reglasDelCurso | [src/data/uc-pautas.js:285](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L285) | Una evaluación atrasada con justificación formal se rinde el último día de clases |
| Dinámica · noCalcula | [src/data/uc-pautas.js:557](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L557) | Si faltas con justificación a un control, lo recuperas con un control recuperativo en el último taller del semestre |
| Dinámica · noCalcula | [src/data/uc-pautas.js:558](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L558) | Si faltas con justificación a las dos interrogaciones, el equipo docente evalúa tu caso |
| Dinámica · noCalcula | [src/data/uc-pautas.js:559](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L559) | Las inasistencias a talleres no se justifican |

## Conservadas en UC: decide Lucas

No se quitan las condiciones que afectan notas, pesos, eximiciones, reemplazos o la reprobación. Tampoco se modifica la primera entrada de `reglasDelCurso` de ningún preset. Por eso Ciudadanía conserva su primera y única regla, aunque menciona asistencia sin una consecuencia numérica expresa: queda identificada para que Lucas decida. Las reglas mixtas (recuperativos junto con redondeo, o quitar una ausencia que evita una sanción de nota) también se conservan completas.

| Preset / lista | Referencia | Regla conservada |
|---|---|---|
| Filosofía: ¿para qué? · reglasDelCurso | [src/data/uc-pautas.js:114](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L114) | Necesitas al menos 75% de asistencia a clases: si no, el curso queda con nota R, que equivale a 3,0. La app no registra asistencia |
| Desafíos de la Ingeniería · reglasDelCurso | [src/data/uc-pautas.js:149](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L149) | Si no asistes sin justificación a la Actividad de Trabajo Grupal que sigue a una tarea, esa tarea queda con nota máxima 4,0 |
| Desafíos de la Ingeniería · reglasDelCurso | [src/data/uc-pautas.js:150](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L150) | Contestar el 90% de los cuestionarios te permite borrar una ausencia o atraso a las presentaciones |
| Desafíos de la Ingeniería · reglasDelCurso | [src/data/uc-pautas.js:151](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L151) | Faltar sin justificación a una presentación te deja con la mitad de la nota de tu equipo |
| El misterioso caso del curso de ficción policial (Edición especial Santiago Negro) · reglasDelCurso | [src/data/uc-pautas.js:284](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L284) | Necesitas asistir al menos al 75% de las clases; el programa indica que no cumplirlo reprueba el curso |
| Ciudadanía y Derechos humanos: Enfoques interdisciplinarios · reglasDelCurso | [src/data/uc-pautas.js:302](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L302) | Necesitas rendir todas las evaluaciones y tener al menos 60% de asistencia; la app no registra asistencia |
| Programación como Herramienta para la Ingeniería · reglasDelCurso | [src/data/uc-pautas.js:432](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L432) | Si tienes 2 o más ausencias justificadas a sesiones con ticket, el equipo docente ajustará la regla de Participación; el programa no publica la fórmula de ese ajuste |
| Introducción a la Economía · noCalcula | [src/data/uc-pautas.js:452](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L452) | Puedes eliminar una sola interrogación, sin justificar, y pasar su 20% al examen. Este ajuste no se aplica automáticamente |
| Introducción a la Economía · reglasDelCurso | [src/data/uc-pautas.js:458](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L458) | El examen es obligatorio y no hay eximición. Si no asistes, la nota es 1,0, salvo que el curso apruebe el procedimiento de nota pendiente |
| Termodinámica · noCalcula | [src/data/uc-pautas.js:474](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L474) | El examen puede reemplazar una sola interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente |
| Termodinámica · noCalcula | [src/data/uc-pautas.js:475](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L475) | Si justificas ambas interrogaciones, el programa exige reprobar el ramo. La app no aplica esa reprobación por inasistencias |
| Termodinámica · reglasDelCurso | [src/data/uc-pautas.js:481](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L481) | No hay eximición ni pruebas recuperativas. Las notas de las evaluaciones y la final se redondean a una décima |
| Electricidad y Magnetismo · noCalcula | [src/data/uc-pautas.js:497](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L497) | El examen reemplaza una única interrogación con inasistencia justificada. Este ajuste no se aplica automáticamente; con dos o más inasistencias, debes consultar a tu facultad |
| Electricidad y Magnetismo · noCalcula | [src/data/uc-pautas.js:498](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L498) | Puedes justificar como máximo un control y eliminarlo del promedio. La app no elimina controles por justificación ni descarta por defecto el peor |
| Electricidad y Magnetismo · reglasDelCurso | [src/data/uc-pautas.js:504](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L504) | No hay eximición ni pruebas recuperativas. La nota final se redondea a una décima |
| Laboratorio de Dinámica · noCalcula | [src/data/uc-pautas.js:604](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L604) | Si faltas a un experimento sin justificación, tu informe de ese experimento queda con nota 1 |
| Laboratorio de Dinámica · noCalcula | [src/data/uc-pautas.js:605](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L605) | Puedes justificar una sola inasistencia en el semestre y optar al laboratorio recuperativo; una segunda inasistencia reprueba el laboratorio |
| Dinámica (ICE1514) · noCalcula | [src/data/uc-pautas.js:650](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L650) | Faltar a un taller, con o sin justificación, es un 1,0 en ese taller |
| Contabilidad Gerencial · reglasDelCurso | [src/data/uc-pautas.js:741](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L741) | La recuperativa por una prueba justificada es el 12 de diciembre después del examen; si no la rindes, la prueba justificada queda en 1,0. El examen no puede ponderar más de 56%; sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario |
| Empresas y Legislación · noCalcula | [src/data/uc-pautas.js:754](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L754) | Las preguntas bonus pueden sumar hasta 0,3 a cada prueba. La participación, tareas voluntarias y 100% de asistencia a clases y ayudantías pueden dar décimas; su asignación depende del profesor |
| Empresas y Legislación · reglasDelCurso | [src/data/uc-pautas.js:757](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L757) | El examen no puede superar 70% del curso: justificar ambas pruebas trasladaría 100% y no cumple el requisito. No hay eximición |
| Marketing Analytics · reglasDelCurso | [src/data/uc-pautas.js:787](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L787) | Para rendir examen debes haber sido evaluado en al menos 40% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba regular. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario |
| Marketing Analytics · reglasDelCurso | [src/data/uc-pautas.js:788](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L788) | La recuperativa por una prueba justificada es el 11 de diciembre a las 17:30; si no la rindes, la prueba justificada queda en 1,0 |
| Estrategia Competitiva · reglasDelCurso | [src/data/uc-pautas.js:817](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L817) | Para rendir examen debes haber sido evaluado en al menos 33% de la ponderación final sin contar la recuperativa y haber rendido al menos una prueba. El examen no puede superar 70%: el exceso se califica con 1,0. Sin derecho a examen, la final es la presentación si está bajo 4,0, o 3,9 en caso contrario |
| Estrategia Competitiva · reglasDelCurso | [src/data/uc-pautas.js:818](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L818) | Una prueba justificada se recupera en la fecha de Facultad; no rendir la recuperativa implica 1,0 en esa prueba. Si faltas a ambas pruebas, no puedes rendir recuperativa ni examen y ambas quedan en 1,0 |
| Ética, Economía y Empresa · noCalcula | [src/data/uc-pautas.js:900](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L900) | Si las pruebas justificadas hacen que el examen supere 60%, se exige una recuperativa adicional cuya ponderación define el profesor. El resultado queda pendiente hasta resolver esa evaluación |
| Ética, Economía y Empresa · reglasDelCurso | [src/data/uc-pautas.js:909](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L909) | Si el traspaso por pruebas justificadas hace que el examen supere 60%, habrá una recuperativa adicional definida por el profesor, que puede ser oral. En ese caso ajusta la pauta con sus instrucciones |
| Revelación y Fe · noCalcula | [src/data/uc-pautas.js:1140](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uc-pautas.js#L1140) | Si tienes más de 75% de asistencia y una nota de presentación igual o superior a 6,00, te eximes del Examen final; tu nota de presentación se calcula como el promedio simple de Evaluación 1, Evaluación 2 y Evaluación 3, sin usar sus ponderaciones |

## FEN — Martín

No se edita ningún preset de esta universidad. Se listan las candidatas y las condiciones mixtas/numéricas para revisión del responsable; una regla que cambia la nota debe conservarse salvo decisión expresa.

| Preset / lista | Archivo y línea | Texto / revisión |
|---|---|---|
| Introducción a la Microeconomía · reglasDelCurso | [src/data/fen-pautas.js:87](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L87) | Si faltas al Examen tienes que dar el recuperativo |
| Comunicación · reglasDelCurso | [src/data/fen-pautas.js:142](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L142) | Faltar sin justificar al pitch inicial, a las clases de expertos, a la solemne o al examen se evalúa con 1,0 |
| Contabilidad · reglasDelCurso | [src/data/fen-pautas.js:174](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L174) | Rendir menos del 75% de los controles sorpresa reprueba el curso con 3,9 |
| Tecnología y Sistemas de Información · reglasDelCurso | [src/data/fen-pautas.js:254](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L254) | Las dos solemnes y el examen comparten una única recuperativa, que se rinde después del examen y a la que solo accede quien justificó su inasistencia |
| Tecnología y Sistemas de Información · reglasDelCurso | [src/data/fen-pautas.js:255](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L255) | La asistencia a las ayudantías es obligatoria, y los controles se rinden en ese horario |
| Marketing · reglasDelCurso | [src/data/fen-pautas.js:289](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L289) | Las evaluaciones no se repiten. Con prueba recuperativa autorizada se recupera solo una, Solemne o Examen, y nunca los controles |
| Introducción a la Economía · noCalcula | [src/data/fen-pautas.js:323](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L323) | Si faltas a un control o a la Solemne con justificativo aprobado por la Escuela, ese porcentaje se acumula para el Examen |
| Introducción a la Economía · reglasDelCurso | [src/data/fen-pautas.js:327](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L327) | Solo puedes dar Examen Recuperativo si no pudiste rendir el Examen por causa justificada y aprobada por la Escuela de Pregrado |
| Métodos Matemáticos I · reglasDelCurso | [src/data/fen-pautas.js:359](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L359) | Una inasistencia a una solemne o al examen justificada por la Secretaría también puede dar derecho al Examen de Segunda Fecha. La app no conoce esa resolución |
| Programación para Analítica de Datos · noCalcula | [src/data/fen-pautas.js:374](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L374) | El examen recuperativo puede reemplazar cada control o solemne que haya quedado bajo la nota que saques en él, salvo las notas puestas por medidas disciplinarias |
| Gestión y Empresas · noCalcula | [src/data/fen-pautas.js:398](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L398) | Toda ausencia a una exigencia del curso se califica con 1,0 |
| Gestión y Empresas · reglasDelCurso | [src/data/fen-pautas.js:401](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L401) | La Solemne y el Examen tienen fecha única. Avisando por escrito dentro de 24 horas por razones médicas, solo se puede recuperar una de las dos |
| Gestión y Empresas · reglasDelCurso | [src/data/fen-pautas.js:402](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/fen-pautas.js#L402) | Los controles parciales y el Plan de Negocios no son recuperables por ninguna causa |

## UAndes — Martín

No se edita ningún preset de esta universidad. Se listan las candidatas y las condiciones mixtas/numéricas para revisión del responsable; una regla que cambia la nota debe conservarse salvo decisión expresa.

Todas las entradas siguientes dicen «Se exige al menos 60% de asistencia», salvo La Belleza en el Arte (75%). Son candidatas por ser un requisito de asistencia sin consecuencia numérica explícita en esa frase; no se elimina ninguna.

| Preset / lista | Archivo y línea | Texto / revisión |
|---|---|---|
| Creación y Cuidado del Mundo · reglasDelCurso | [src/data/uandes-pautas.js:31](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L31) | Asistencia 60% |
| Desafíos Sociales del Cristianismo · reglasDelCurso | [src/data/uandes-pautas.js:41](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L41) | Asistencia 60% |
| La Iglesia · reglasDelCurso | [src/data/uandes-pautas.js:50](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L50) | Asistencia 60% |
| Los Vicios Capitales · reglasDelCurso | [src/data/uandes-pautas.js:59](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L59) | Asistencia 60% |
| Mundo: Realidad Divina · reglasDelCurso | [src/data/uandes-pautas.js:68](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L68) | Asistencia 60% |
| Padres de la Iglesia · reglasDelCurso | [src/data/uandes-pautas.js:79](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L79) | Asistencia 60% |
| Mundo, Trabajo y Redención · reglasDelCurso | [src/data/uandes-pautas.js:89](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L89) | Asistencia 60% |
| Actualidad y Fe · reglasDelCurso | [src/data/uandes-pautas.js:99](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L99) | Asistencia 60% |
| Lectura del Apocalipsis · reglasDelCurso | [src/data/uandes-pautas.js:110](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L110) | Asistencia 60% |
| Apreciación de la Arquitectura · reglasDelCurso | [src/data/uandes-pautas.js:120](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L120) | Asistencia 60% |
| Apreciación de la Pintura Occidental · reglasDelCurso | [src/data/uandes-pautas.js:129](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L129) | Asistencia 60% |
| Arte y Cultura Griega · reglasDelCurso | [src/data/uandes-pautas.js:139](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L139) | Asistencia 60% |
| Cuento de Fantasía y Ficción · reglasDelCurso | [src/data/uandes-pautas.js:148](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L148) | Asistencia 60% |
| De Bach al Rock · reglasDelCurso | [src/data/uandes-pautas.js:157](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L157) | Asistencia 60% |
| Genios del Arte · reglasDelCurso | [src/data/uandes-pautas.js:166](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L166) | Asistencia 60% |
| Poesía y Experiencia Humana · reglasDelCurso | [src/data/uandes-pautas.js:175](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L175) | Asistencia 60% |
| Revolución Artística del Renacimiento · reglasDelCurso | [src/data/uandes-pautas.js:185](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L185) | Asistencia 60% |
| El Impresionismo · reglasDelCurso | [src/data/uandes-pautas.js:194](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L194) | Asistencia 60% |
| La Belleza en el Arte · reglasDelCurso | [src/data/uandes-pautas.js:203](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L203) | Asistencia 75% |
| Grandes Libros: Interioridad (EDU) · reglasDelCurso | [src/data/uandes-pautas.js:214](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L214) | Asistencia 60% |
| Vanguardias Artísticas del Siglo XX · reglasDelCurso | [src/data/uandes-pautas.js:223](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L223) | Asistencia 60% |
| Astronomía · reglasDelCurso | [src/data/uandes-pautas.js:235](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L235) | Asistencia 60% |
| Biología Acuática · reglasDelCurso | [src/data/uandes-pautas.js:244](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L244) | Asistencia 60% |
| De la Imprenta a Chat GTP · reglasDelCurso | [src/data/uandes-pautas.js:255](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L255) | Asistencia 60% |
| Grandes Teoremas Matemáticos · reglasDelCurso | [src/data/uandes-pautas.js:264](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L264) | Asistencia 60% |
| Hacia el Espacio · reglasDelCurso | [src/data/uandes-pautas.js:274](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L274) | Asistencia 60% |
| El Mundo visto desde la Ciencia · reglasDelCurso | [src/data/uandes-pautas.js:283](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L283) | Asistencia 60% |
| Sismología y Vulcanología · reglasDelCurso | [src/data/uandes-pautas.js:292](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L292) | Asistencia 60% |
| Textos de Grandes Científicos · reglasDelCurso | [src/data/uandes-pautas.js:303](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L303) | Asistencia 60% |
| Zoología · reglasDelCurso | [src/data/uandes-pautas.js:312](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L312) | Asistencia 60% |
| Cambio Climático · reglasDelCurso | [src/data/uandes-pautas.js:323](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L323) | Asistencia 60% |
| Grandes Expediciones Científicas · reglasDelCurso | [src/data/uandes-pautas.js:330](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L330) | Asistencia 60% |
| Problemáticas Urbanas · reglasDelCurso | [src/data/uandes-pautas.js:338](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L338) | Asistencia 60% |
| Reconocimiento Natural de la Fertilidad · reglasDelCurso | [src/data/uandes-pautas.js:346](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L346) | Asistencia 60% |
| Actualidad Internacional · reglasDelCurso | [src/data/uandes-pautas.js:355](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L355) | Asistencia 60% |
| Arte y Política · reglasDelCurso | [src/data/uandes-pautas.js:366](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L366) | Asistencia 60% |
| Grandeza y Decadencia de Roma · reglasDelCurso | [src/data/uandes-pautas.js:376](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L376) | Asistencia 60% |
| Grandes Batallas de la Humanidad · reglasDelCurso | [src/data/uandes-pautas.js:387](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L387) | Asistencia 60% |
| Grandes Exploradores · reglasDelCurso | [src/data/uandes-pautas.js:397](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L397) | Asistencia 60% |
| Grandes Visiones de la Historia · reglasDelCurso | [src/data/uandes-pautas.js:407](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L407) | Asistencia 60% |
| La Guerra del Pacífico · reglasDelCurso | [src/data/uandes-pautas.js:418](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L418) | Asistencia 60% |
| Mitología Europea · reglasDelCurso | [src/data/uandes-pautas.js:428](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L428) | Asistencia 60% |
| Historia de las Revoluciones · reglasDelCurso | [src/data/uandes-pautas.js:438](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L438) | Asistencia 60% |
| Los Terremotos en Chile · reglasDelCurso | [src/data/uandes-pautas.js:449](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L449) | Asistencia 60% |
| El mundo después de Roma · reglasDelCurso | [src/data/uandes-pautas.js:460](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L460) | Asistencia 60% |
| De Emperatrices a Reinas · reglasDelCurso | [src/data/uandes-pautas.js:472](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L472) | Asistencia 60% |
| Héroes de la Historia de Chile · reglasDelCurso | [src/data/uandes-pautas.js:482](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L482) | Asistencia 60% |
| Revelando el Nuevo Mundo · reglasDelCurso | [src/data/uandes-pautas.js:493](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uandes-pautas.js#L493) | Asistencia 60% |

## UDD — sin editar

No se edita ningún preset de esta universidad. Se listan las candidatas y las condiciones mixtas/numéricas para revisión del responsable; una regla que cambia la nota debe conservarse salvo decisión expresa.

Las seis referencias usan `REGLA_ASISTENCIA_ARQ_UDD`: «La asistencia es obligatoria según la Dirección de Carrera: sin ella no rindes examen y la final es 1,0 (Reglamento Académico, art. 45)», definida en [src/data/udd-pautas.js:32](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L32). Cambia la nota: conservar. No se encontró una regla puramente administrativa de asistencia para retirar en UDD.

| Preset / lista | Archivo y línea | Texto / revisión |
|---|---|---|
| Componentes de la Matemática · reglasDelCurso | [src/data/udd-pautas.js:286](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L286) | Sin asistencia, final 1,0: conservar |
| Arquitectura Moderna Siglo XX · reglasDelCurso | [src/data/udd-pautas.js:302](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L302) | Sin asistencia, final 1,0: conservar |
| Sustentabilidad · reglasDelCurso | [src/data/udd-pautas.js:315](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L315) | Sin asistencia, final 1,0: conservar |
| Diseño y Laboratorio Estructural: Sismoresistencia · reglasDelCurso | [src/data/udd-pautas.js:329](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L329) | Sin asistencia, final 1,0: conservar |
| Instalaciones Constructivas · reglasDelCurso | [src/data/udd-pautas.js:342](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L342) | Sin asistencia, final 1,0: conservar |
| Apreciación, Evaluación y Crítica Arquitectónica · reglasDelCurso | [src/data/udd-pautas.js:355](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/udd-pautas.js#L355) | Sin asistencia, final 1,0: conservar |

## UAI — sin editar

No se edita ningún preset de esta universidad. Se listan las candidatas y las condiciones mixtas/numéricas para revisión del responsable; una regla que cambia la nota debe conservarse salvo decisión expresa.

| Preset / lista | Archivo y línea | Texto / revisión |
|---|---|---|
| Escritura Argumentativa · reglasDelCurso | [src/data/uai-pautas.js:23](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L23) | Se exige al menos 80% de asistencia. La eximición requiere estar en el 20% superior del curso, presentación de al menos 5,5 y todas las evaluaciones rendidas; la app no conoce el ranking |
| Razonamiento Cuantitativo con Datos I · reglasDelCurso | [src/data/uai-pautas.js:96](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L96) | En Trabajo aplicado ingresa su nota consolidada: 30% informe y 70% archivo Excel. Los trabajos no son justificables |
| Razonamiento Cuantitativo con Datos I · reglasDelCurso | [src/data/uai-pautas.js:97](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L97) | Si declaraste una ausencia justificada, tienes que rendir ambos exámenes y no puedes eximirte |
| Introducción a la Microeconomía · noCalcula | [src/data/uai-pautas.js:121](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L121) | Una ausencia justificada en un control o tarea se reemplaza por el examen, pero el bloque está consolidado y el programa no fija el peso de cada instancia. Con dos pruebas justificadas, el programa no define el destino de la segunda |
| Management · reglasDelCurso | [src/data/uai-pautas.js:144](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L144) | También se exige 75% de asistencia: si no la cumples, una final aprobatoria queda en 3,9. La app no conoce tu asistencia |
| Introducción a la Macroeconomía · noCalcula | [src/data/uai-pautas.js:166](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L166) | Con más de una prueba justificada, el programa no define cómo resolver las siguientes ausencias |
| Razonamiento Cuantitativo con Datos II · reglasDelCurso | [src/data/uai-pautas.js:247](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L247) | Una inasistencia justificada a prueba o laboratorio se reemplaza con la parte correspondiente del examen |
| Razonamiento Cuantitativo con Datos II · reglasDelCurso | [src/data/uai-pautas.js:248](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L248) | Si declaraste una inasistencia justificada, tienes que rendir los exámenes y no puedes eximirte |
| Civilización Contemporánea II · reglasDelCurso | [src/data/uai-pautas.js:276](https://github.com/gradehub-cl/GradeHub/blob/b2a0086/src/data/uai-pautas.js#L276) | El curso exige 80% de asistencia: bajo eso repruebas, con 3,9 si tu promedio era 4,0 o más, o con tu promedio si era 3,9 o menos. La app no registra asistencia |

## Verificación y cuentas existentes

- Se compararon los 74 presets UC con main: solo cambian los cuatro avisos retirados. Todos los demás campos, fuentes/primeras reglas, pesos, fechas, compuertas y bonus permanecen idénticos. FEN/UAndes/UDD/UAI no se editaron.
- Chrome con una cuenta sintética realmente guardada con la versión anterior y luego recargada con esta PR: `gradehub_v1` idéntico, misma nota, bonus de talleres con `entrada:'faltas'` intacto; los tres avisos desaparecen. No se copia una pauta nueva sobre la guardada.
- El test de regresión también conserva las categorías personalizadas y prueba que un ramo manual sin origen no hereda reglas.
- `tests/vocabulario.test.js`, `tests/decimas-bonus.test.js`, build, JS, CSS y los 393 tests completos pasan.

### Copia histórica del registro SQL

`supabase/consenso_periodo.sql` contiene una copia de los cuatro textos antiguos en la semilla del registro. Se deja intacta para respetar el alcance solo de datos del cliente. No afecta la lectura de reglas de la ficha: `reglasDelPreset` consulta el catálogo local por origen. El Banco de pautas del admin puede seguir mostrando esos avisos históricos hasta una futura regeneración de la semilla. No hay SQL que aplicar para esta PR.

`tests/consenso-periodo.test.js` exceptúa **solo esos cuatro textos, en esos dos presets UC**, de la comparación con la semilla histórica. No se ignoran las demás reglas ni datos: la comparación completa restante y los casos de mayoría, períodos, validación y RLS siguen pasando. El test nuevo impide que los avisos reaparezcan en el cliente. Lleva el comentario pedido por Lucas.
