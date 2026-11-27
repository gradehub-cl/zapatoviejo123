# Auditoría UX GradeHub (gradehub.cl, producción)
Cuenta de prueba: gpruebahark5@prueba.cl · nombre "Matías Prueba" · perfil: 1.er año (2.º semestre), salud/humanidades, Universidad de Concepción, semestre 2026-2.
Fecha de la prueba: 2026-11-26 (America/Santiago). Navegador de escritorio, ancho completo.

## Pantalla 0 — Portada / auth (https://gradehub.cl/)
Qué veo: logo, titular "Mejor que tu Excel.", texto "Guarda tus notas y revísalas desde cualquier dispositivo.", bloque "GradeHub en números" (2.222 ESTUDIANTES / 9.178 RAMOS / 39.025 NOTAS), botones "Continuar con Apple" y "Continuar con Google", separador "o con tu correo", campos CORREO ELECTRÓNICO, CONTRASEÑA, REPETIR CONTRASEÑA, botón "Crear cuenta", link "¿Ya tienes cuenta? Inicia sesión", texto legal ("Al continuar aceptas los términos y la privacidad, y declaras tener 14 años o más."), footer con Preguntas frecuentes / Calculadora de notas / Términos de uso / Privacidad y botón "Soy profesor particular". La portada trae de fondo tarjetas de ejemplo ("Introducción a la Microeconomía MIC1505", "Estadísticas Sem. 2 · 2026", "Ejemplo de un ramo", "Ejemplo de tus estadísticas").

Qué siento / pienso (usuario poco técnico): la portada se entiende y el número de usuarios da confianza. Pero llegan de golpe dos botones grandes de Apple/Google y debajo un formulario: no queda claro cuál es el camino recomendado. El formulario está en modo "Crear cuenta" por defecto, eso ayuda, pero el estado inicial depende de cómo cargó la página.

Detalles / no intuitivo:
- El titular y los números usan punto como separador de miles ("2.222", "9.178", "39.025"). En Chile se escribe así, ok, pero mezclado con notas decimales con coma ("4,9", "3,4") puede confundir: mismo símbolo (punto) para dos cosas distintas.
- "Mejor que tu Excel." asume que el estudiante usa Excel: para una carrera de humanidades/salud puede no ser su herramienta.
- Términos y privacidad abren como link a .html aparte (terminos.html / privacidad.html): rompe la app, no hay vuelta clara.
- Botón "Soy profesor particular" en el footer de la pantalla de login: no queda claro qué hace ni a quién va dirigido, mezcla dos públicos en la misma pantalla.
- Bug de accesibilidad: el botón "Continuar con Apple" (ID: btn-apple) aparece en el árbol de accesibilidad pero NO se ve ni se lee en el texto visible de la página (solo aparece "Continuar con Google"). O sea hay un control invisible/en foco tabulable.
- No hay regla de contraseña visible (mínimo de caracteres, mayúsculas, etc.) ni medidor de fuerza. Solo se sabría si falla al enviar.
- No hay checkbox explícito de aceptación de términos: se aceptan "al continuar".
- Los campos no dicen si son obligatorios y no hay ayuda bajo el campo.

## Paso 1 de 4 del onboarding — "¿Cómo te llamas?"
Qué veo: barra de progreso, "PASO 1 DE 4", título "¿Cómo te llamas?", ayuda "Tu nombre aparece en el saludo de inicio.", campos NOMBRE y APELLIDO, bloque aparte "AÑO DE INGRESO A LA UNIVERSIDAD" con un selector de ruleta (chevron arriba/abajo, texto fantasma "Elegir año", años 2026/2025/2024), estado "Elige tu año de ingreso para calcular el semestre.", botones "Cerrar sesión" (retroceso) y "Continuar" (deshabilitado hasta elegir año), nota "Puedes editar tus datos y ramos más adelante."

Qué sentí: el nombre y apellido claros. El selector de año me hizo dudar: no es una lista desplegable normal ni un campo donde escribir; hay que "girar" la ruleta.

Problemas detectados:
1. La ruleta no responde a clic sobre el año que se ve (clic en "2026" no selecciona nada) y no acepta escritura (tab setValue deja Value: 0). Solo funcionan las flechitas chevron, que no dicen "año anterior / año siguiente" en el texto visible: los botones se llaman "Anterior"/"Siguiente".
2. Sensación de dirección invertida: presionar "Siguiente" hace que el AÑO BAJE (2026 → 2025) y el semestre suba (2.º → 4.º). Para un usuario poco técnico "Siguiente" debería avanzar, no retroceder el año. Muy confuso.
3. El texto fantasma "Elegir año" sigue visible arriba del año ya elegido, da la sensación de que no se seleccionó nada.
4. Botón de retroceso de la primera pantalla se llama "Cerrar sesión" (ID: ob-back): en el paso 1 no es "atrás", es salir de la app, pero el usuario no lo entiende hasta que lo lee dos veces. Y no hay confirmación.
5. "Vas en tu 2.º semestre" usa el ordinal abreviado "2.º", que en lectura rápida parece un error tipográfico. Falta explicar cómo lo calcula (año de ingreso + semestre actual).
6. No se pide la universidad ni la carrera en el paso 1 aunque el bloque se llame "estudio" (ID: ob-estudio): uno espera elegir ahí la universidad.
7. El botón "Continuar" aparece deshabilitado sin decir por qué (no hay mensaje "elige tu año").

## Paso 2 de 4 — "Matías, ¿cuál es tu universidad?"
Qué veo: "PASO 2 DE 4", título con mi nombre, ayuda "Elige dónde estudias. Podrás agregar tus ramos a mano.", una grilla con solo 5 botones con sigla de color: "Universidad de Chile" (UCH), "Pontificia Universidad Católica" (UC), "Universidad Adolfo Ibáñez" (UAI), "Universidad de los Andes" (UA), "Universidad del Desarrollo" (UDD). Botones "Atrás" y "Continuar" (deshabilitado).

Qué sentí / pensé: el uso de mi nombre se siente cercano. Pero busqué la Universidad de Concepción y no está, y no hay buscador ni campo "escribir mi universidad" (a diferencia del paso de carreras, que sí tiene buscador y "puedes escribirla"). Sentí que la app "no es para mí".
Problemas:
- 🔴 Universidad de Concepción (y cualquier universidad regional: UdeC, UV, UTFSM, UA, UCSC…) no aparece y no hay forma de escribirla. El onboarding se trunca para fuera de la RM. Anotado en el encargo: se eligió Universidad del Desarrollo (UDD), la más cercana por tener campus en Concepción.
- 🟠 La sigla (UCH/UC/UAI/UA/UDD) es un ícono sin texto suficiente: "UC" y "UA" se confunden, y "UCH" no es la sigla habitual (se escribe "U de Chile").
- 🟡 No hay buscador de universidad ni opción "Otra / escribir".
- 🟡 No se explica si la elección define contenidos (ramos, tutores) o solo el logo.
- 🟡 "Atrás" ahora sí dice Atrás, pero en el paso 1 decía "Cerrar sesión": inconsistentes entre pasos.

## Paso 3 de 4 — "¿Qué estudias?"
Qué veo: buscador "Buscar carrera", ayuda "Busca tu carrera. Si no aparece, puedes escribirla." y una lista larga (46 botones) con carreras. Probé escribir "Trabajo Social" → la lista se vacía y aparece un botón "Usar «Trabajo Social»". Probé "enfer" → filtra a "Bachillerato en Enfermería", "Enfermería (Concepción)", "Enfermería (Santiago)" y "Usar «enfer»". Elegí "Enfermería (Concepción)".

Qué sentí: esta pantalla es la mejor del onboarding: buscar y si no está, escribirla. Se entiende sin ayuda.
Problemas:
- 🟡 La lista completa de entrada (46 botones) abruma; sería mejor mostrar un puñado y el buscador primero.
- 🟡 El botón "Usar «enfer»" aparece aunque sí existan coincidencias: quien escribe poco puede terminar creando una carrera mal escrita ("enfer" como carrera).
- 🟡 Seleccionar una carrera no muestra marca visual de selección en el diff (no queda claro cuál quedó elegida hasta Continuar).
- 🟡 No se avisa que las carreras dependen de la universidad elegida (UDD tiene "Enfermería (Concepción)", pero si tu universidad no está, nada de esto sirve).

## Paso 4 de 4 — "Elige tus ramos"
Qué veo: ayuda "Marca los que tomas este semestre. Puedes buscar y sumar otros ramos.", sección "SUGERIDOS PARA 2°" con 5 checkboxes ya marcados (Bases Químicas, Bases Biológicas, Bases del Cuidado de Enfermería, Lectura Crítica, Pensamiento Crítico), campo "BUSCAR OTRO RAMO" y botón "¿No aparece? Agregar un ramo a mano". Botón "Continuar con 5 ramos".

Qué sentí: bien que ya vienen marcados y que el botón dice cuántos ramos trae ("Continuar con 5 ramos"): eso es clarísimo.
Dudas: no sé qué es "SUGERIDOS PARA 2°" (¿2.º semestre?, ¿2.º año?); el símbolo ° sin espacio se lee raro. Tampoco sé si los ramos tienen código,_créditos o si son obligatorios.
Problemas:
- 🟡 "SUGERIDOS PARA 2°" con ordinal abreviado y sin aclarar semestre/año.
- 🟡 Los ramos sugeridos vienen marcados por defecto: si uno sigue "Continuar" sin leer, agrega ramos que no toma, y el texto "Puedes editar tus datos y ramos más adelante" no dice cómo sacarlos.
- 🟡 El onboarding termina sin pantalla de resumen ("esto es lo que configuraste"), se cae directo al Inicio.

## Modal "Ahora, las evaluaciones" (al entrar al Inicio)
Qué veo: diálogo centrado: "Ahora, las evaluaciones" / "5 ramos agregados" / "Agrega las evaluaciones y sus porcentajes en cada ramo." / botón "Ver mis ramos".

Qué sentí: buen resumen y buen siguiente paso. Pero el título "Ahora, las evaluaciones" suena a orden y no explica qué es una "evaluación" ni un "porcentaje".
Problemas:
- 🟡 El modal no tiene "X" para cerrarlo: solo "Ver mis ramos" (no hay forma de "luego"/"más tarde").
- 🟡 Faltan los tildes de la palabra "porcentajes"… ok, ok. Falta: no explica qué porcentaje (peso de cada prueba en la nota final).

## Pantalla Inicio (primera vez, sin datos)
Qué veo: barra superior "GradeHub UDD" y un ícono de llave inglesa a la derecha (sin texto). Saludo "Así va tu semestre, Matías" (en el árbol de accesibilidad aparece pegado: "Así va tu semestre,Matías"). Bloque "PROMEDIO GENERAL ·" con "2026-2" y "5 ramos" (en accesibilidad: "2026-25 ramos", sin espacio), "Abre un ramo para ingresar tu primera nota." y "• 5 pendientes". Sección "Mis ramos" con "+ Agregar ramo" y control "Manual" (Ordenar ramos. Ahora: Manual). 5 tarjetas de ramo con "Sin evaluaciones" y un botón oculto "Mantén presionado para mover …". Banner "APOYO — ¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos. / Explorar apoyo". Fila "Simular el semestre completo". Footer "Por estudiantes, para estudiantes. GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval". Navegación lateral/inferior: Inicio, Agenda, Estadísticas, Perfil.

Qué sentí: limpio y ordenado, pero con el promedio vacío (un "·") y 5 "pendientes" que no sé cuáles son. Como usuario nuevo no sé a dónde ir primero salvo por el modal.
Problemas:
- 🟠 "Así va tu semestre,Matías" y "2026-25 ramos": faltan espacios al concatenar textos (bug visual y de lectores de pantalla).
- 🟠 Ícono de llave inglesa arriba a la derecha sin etiqueta de texto: no se entiende que abre "Herramientas".
- 🟡 "5 pendientes" no es clickeable ni dice qué son los pendientes.
- 🟡 El promedio general muestra un punto "·" en vez de "sin notas" o "—".
- 🟡 Botón de arrastre "Mantén presionado para mover" es solo accesible (no hay ícono claro ni texto visible); en escritorio no es obvio que las tarjetas se mueven.
- 🟡 "APOYO / Explorar apoyo": mezcla publicidad de terceros dentro del flujo de un alumno nuevo.

## Ficha de ramo ("Bases Químicas", sin datos)
Qué veo: botón "Volver", título con el nombre, ícono "…" arriba a la derecha (Opciones del ramo), "Agrega evaluaciones para comenzar", "Sin notas", un recuadro con ícono de carpeta y el texto "Todavía no tenemos las ponderaciones de este ramo / Ármalas con el programa del curso: el nombre de cada evaluación y su porcentaje." + botón "Armar mis ponderaciones". Más abajo "Horario" con botón "Agregar bloque" y "Agrega los días y las horas de tus clases."

Dudas de usuario nuevo:
- "Ponderaciones" es palabra técnica: no sé que sea "el porcentaje que pesa cada prueba". El texto lo explica recién en la segunda línea, bien, pero el botón "Armar mis ponderaciones" usa el término raro.
- "Armar" suena a construir mueble. "Crear / completar mis evaluaciones" se entiende mejor.
- "No tenemos las ponderaciones de este ramo" suena a error del sistema ("no tenemos"), cuando en realidad es que yo todavía no las ingreso.
- "Agregar bloque" (de horario) no dice qué es un bloque: ¿día + hora? ¿una clase semanal?

## Modal "Armar mis ponderaciones"
Qué veo: título, ayuda "Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas.", contador "0 / 100% · faltan 100%", una fila con combo "Nombre de la evaluación" (placeholder "Ej: Prueba 1"), campo de peso con "0 %" y link "Usar 100%"; "▸ Reglas de esta evaluación" (al abrirlo: Nota mínima, Tope de la nota final, "Si quedas bajo el mínimo, tu nota final no supera este tope. Deja ambos campos vacíos si no aplica.", "Puntaje total, si te la entregan en puntos", "Exigencia (%)", "Con puntaje total anotas los puntos que sacaste y te los pasamos a nota. Sin exigencia usamos la del ramo."); botón "+ Agregar evaluación"; "▸ Requisitos que combinan evaluaciones" ("Para cuando el programa exige un mínimo sobre varias evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba." + "+ Agregar requisito"); "▸ Eximición del examen" con checkbox "El programa permite eximirse del examen"; botones Cancelar / Guardar.

Experiencia: muy completo y el contador que dice "faltan 70%" y el botón "Usar 70%" son un acierto enorme. Al llegar a 100% el contador pasa a "✓ 100 / 100% · ponderaciones listas" y el toast dice "✓ Listo, ya suma 100%".

Problemas:
- 🟠 Vocabulario muy técnico para 1.er año de Enfermería: "ponderaciones", "eximición", "exigencia", "tope de la nota final", "requisitos que combinan evaluaciones", "SCT". Un alumno de primer año no sabe qué es "eximición" ni "SCT" (créditos del Sistema de Créditos Transables, nunca explicado).
- 🟠 La primera fila no tiene botón para quitarla y el campo de peso arranca en "0 %" (no vacío): si guardo así, la pauta queda raro.
- 🟠 El nombre es un combo box (con flecha ▼) sin opciones visibles: no sé qué va a sugerir. En la primera evaluación no sugiere nada.
- 🟠 Bug: al escribir en un campo, los "▸ Reglas de esta evaluación" que había expandido se cierran solos (se pierde lo que estaba viendo).
- 🟡 Bug de accesibilidad: el diálogo pierde el nombre accesible tras la primera edición (queda "dialog" sin título).
- 🟡 El botón "…" de cada fila se llama "Opciones de evaluación" pero su id es m-pauta-quitar: es solo para quitar, el nombre asusta.
- 🟡 No hay ejemplo de pauta típica (30/30/40) ni botón "usar pauta del curso".

## Modal "Tus ponderaciones ayudan a tus compañeros" (aparece al guardar)
Texto exacto: "Tus ponderaciones ayudan a tus compañeros / Tus programas se suman en forma anónima para ayudar a tus compañeros. Nunca se comparten tus notas. Puedes desactivarlo en Ajustes." Botón: "Entendido".

🔴 Importantísimo (privacidad / límite del encargo): la pauta se comparte en el consenso por defecto (opt-out, no opt-in). Un usuario que no lee el aviso publica su pauta sin darse cuenta, y no hay forma de no compartir en el momento: hay que ir a Ajustes después. Un aviso con "Entendido" no es consentimiento. Debería ser casilla "Compartir mi pauta anónimamente" desmarcada o un botón "No compartir".

## Menú "…" (Opciones del ramo)
Contenido: "Editar ramo", "Editar evaluaciones", "Eliminar ramo" (en rojo). Bien: acción destructiva en rojo. Pero no se vio confirmación al abrirla (no la probé para no borrar). El botón es solo ícono "…" sin etiqueta.

## Modal "Editar ramo"
Campos: NOMBRE DEL RAMO, CRÉDITOS (SCT) (placeholder "Ej: 10"), SECCIÓN (placeholder "Ej: 3"), PROFESOR con botón deshabilitado "Sin profesor / Agrega y guarda la sección para calificar", checkbox "Llevar la cuenta de mis faltas (aparece en la ficha del ramo)", COLOR (9 puntos de color sin nombre), Cancelar / Guardar.
- 🟠 "(SCT)" es una sigla sin explicar.
- 🟠 "Sin profesor — Agrega y guarda la sección para calificar": el botón de calificar está bloqueado y no explica por qué (hay que guardar sección primero). Además empuja a calificar a un profesor real.
- 🟡 Los colores no tienen nombres ni tooltips; solo se eligen por vista.
- 🟡 Bug: tras guardar, el encabezado de la ficha queda "Bases Químicas10 créditos" (falta espacio/salto en el árbol de accesibilidad).

## Ingreso de notas (flujo inline)
Al tocar "+ Nota" aparece un campo en la misma fila; al escribir 5,2 y presionar Enter, la ficha muestra 5,2 grande, "Necesitas 3,5 en lo pendiente para aprobar", barra de avance, el toast "Vas 5,2 · buen margen en lo pendiente" y un chip "Promedio general 5,2 → 4,8" (después "4,8 → 4,9"). Al completar todo: "✓ Aprobado" y toast "Vas 4,9 · ramo completamente evaluado". El foco salta solo al siguiente "+ Nota": excelente.
- ✅ Muy bueno: cálculo instantáneo, "qué necesito para aprobar" siempre visible, eco del promedio general.
- 🟠 El chip "Promedio general 4,8 → 4,9" usa flecha y aparece solo a veces (aparece recién con la segunda nota); confunde leer "5,2 → 4,8" cuando el número grande dice 4,9.
- 🟠 Al completar el ramo aparece un botón "★ Calificar" (calificar al profesor) sin que uno lo pida: empuja a publicar una opinión sobre un profesor real justo en el momento de la recompensa.
- 🟡 El campo de nota no dice el rango permitido (1,0 a 7,0) ni acepta/niega formatos; hay que probar.
## Pantalla 9 — Ramo: botón "Simular" (modal "SIMULADOR")

**Qué veo**: modal con título "SIMULADOR / Bases Químicas" y el texto "Escribe notas hipotéticas y mira cómo quedaría tu promedio. No se guardan hasta que confirmes." Bloque "PROMEDIO PROYECTADO 4,9", "Tu promedio actual: 4,9", control "Tu meta" con botones "−"/"+" y valor 4,0, sección "EVALUACIONES" que lista cada evaluación repetida dos veces ("Prueba 1 / 30% del ramo / 5,2 / Prueba 1: 5,2"), y botones "Cerrar" y "Guardar como reales" (deshabilitado).

**Qué siento**: promete algo que no puedo hacer. No hay ninguna caja donde escribir una nota hipotética: solo leo mis notas reales.

**Qué pienso**: el simulador solo sirve cuando faltan notas por ingresar. Como el ramo ya está completo, queda inútil y el botón "Guardar como reales" apagado no explica por qué.

**Qué no es intuitivo**: "PROMEDIO PROYECTADO" y "Tu meta" son términos de ingeniería/finanzas; la palabra "hipotéticas" es rebuscada. Los "+" y "−" de la meta no dicen de cuánto en cuánto sube (sube de 0,1? acá subió a 4,2 con dos clics, o sea de 0,1).

**Bugs**
1. El modal dice "Escribe notas hipotéticas" pero **no hay campos editables** cuando el ramo ya está evaluado. Pasos: ramo con todas las notas → "Simular" → no hay dónde escribir.
2. En "EVALUACIONES" cada nota aparece **duplicada** ("5,2" y bajo el chip "Prueba 1: 5,2"). Texto exacto y visible.
3. "Guardar como reales" deshabilitado **sin motivo a la vista**.
4. Al apretar "+" de la meta aparece "Ya tienes el 4,2", que se contradice con que la meta sigue subiendo: no se puede bajar de lo que ya tengo pero el botón sigue activo.

**Qué cambiaría**: si no hay evaluaciones pendientes, ocultar "Simular" o mostrar "Ya no hay nada que simular en este ramo"; permitir simular aunque haya notas (proyección con notas propias); quitar la duplicación y poner título accesible al diálogo (lo toma del nombre del ramo, sin decir "Simulador").

## Pantalla 10 — Ramo: botón "★ Calificar" (flujo de calificar profesor) — **ABIERTO Y CANCELADO, no publicado**

**Qué veo**: al completar el ramo aparece el botón "★ Calificar". Al tocarlo se abre el modal "**Calificar profesor**" con la pregunta "¿CUÁL ES TU SECCIÓN?" y un campo con placeholder "Ej.: 3", más botones "Cancelar" y "Continuar".

**Qué siento**: susto breve — implica que lo que escriba lo van a leer otras personas. Y me pide la sección, que nunca configuré (el ramo dice "Sin profesor").

**Qué pienso**: si no puse profesor ni sección, el flujo debería pedirme primero eso, o decirme que al continuar mi calificación se publicará para otros estudiantes.

**Límite cumplido**: apreté "**Cancelar**" y el modal se cerró. **No se publicó nada.** (Paso 1 de 1 visto: "¿CUÁL ES TU SECCIÓN?" → Cancelar.)

**Qué cambiaría**: aviso explícito "Tu calificación se comparte con otros estudiantes de la UDD" antes de "Continuar"; acceso directo desde la ficha del profesor; no mostrar "Calificar" si el ramo no tiene profesor ni sección cargada.
## Pantalla 11 — Agenda (pestaña "Evaluaciones")

**Qué veo**: título "Agenda", botón "Calendario" (arriba a la derecha), saludo "Qué se viene" y bajo él "Todo al día". Dos pestañas: "Evaluaciones" (activa) / "Horario". Sección "Ya rendidas 3" con botón "Ver todas" y una tarjeta "Sin fecha / Examen final / Bases Químicas / 40% del ramo / 5,0".

**Qué siento**: vacío raro. El saludo "Qué se viene" con "Todo al día" no me dice si es bueno o si falta algo.

**Qué no es intuitivo**:
- La palabra "rendidas" ("Ya rendidas") es formal-escolar; muchos la entienden, pero "Ya pasadas" o "Ya realizadas" es más neutro.
- La tarjeta dice "Sin fecha" y aun así está en "Qué se viene": no entiendo por qué aparece si no tiene fecha.
- Al expandir la tarjeta aparece "TU REFERENCIA / Nota registrada: 5,0 / Ya cuenta en el promedio actual del ramo" y "DESPUÉS / Nada más agendado / Es la última evaluación pendiente con fecha". Contradicción: arriba dice "Sin fecha" y abajo "pendiente con fecha", y además la nota ya está puesta o sea que **no** está pendiente.

**Bugs**
1. Desapareció el botón "**Agregar evaluación**" y el texto "Agrega tus evaluaciones / Registra tus pruebas, entregas y exámenes para organizarlos acá" en cuanto existió una evaluación: **ya no hay forma de agregar una evaluación desde la Agenda**. Pasos: iniciar agenda con evaluaciones creadas en el ramo → pestaña "Evaluaciones" → no hay botón "+".
2. Etiquetas en mayúsculas tipo sistema ("TU REFERENCIA", "DESPUÉS") mezcladas con texto normal.

## Pantalla 12 — Agenda (pestaña "Horario") y modal "Horario de Bases Químicas"

**Qué veo** (estado vacío): "Arma tu horario / Agrega los días y las horas de tus clases" y botón "Agregar clase" (en el ramo el mismo botón se llama "Agregar bloque": **dos nombres para la misma acción**).

**Flujo completo probado**: "Agregar clase" → modal "¿De qué ramo es la clase?" (lista de mis 5 ramos + "Cancelar") → elijo "Bases Químicas" → modal "**Horario de Bases Químicas**" con "Se repite cada semana. Horas de Chile." y "Bloque 1": días "Lun Mar Mié Jue Vie Sáb Dom", "Inicio", "Fin", "Sala (opcional)", "Tipo (opcional)" con placeholder "Cátedra, ayudantía…", switch "Voy a esta clase" (activado por defecto), botones "Copiar bloque", "Quitar", "+ Agregar bloque", "Cancelar", "Guardar horario". Marco Mié, escribo 09:00 y 10:30, sala A-101, y guardo → toast "**Horario guardado**" y la clase aparece en la semana.

**Qué se ve después**: fila de días "Lun 23 / Mar 24 / Mié 25 / Jue 26 / Vie 27" (Jue 26 marcado como "hoy"), "Nada agendado para hoy.", heading "Semana completa" con grilla de horas 09:00, 10:00, 11:00 y el bloque "Bases Químicas / A-101", botón "Editar horario" y link "4 ramos sin horario → Completar".

**Qué no es intuitivo / bugs**
1. 🔴 **Formato de hora en 12 h con AM/PM**: los campos muestran "--:-- --" y quedó "09:00 AM". En Chile se usa las 24 horas; un alumno de primer año no sabe qué es "AM". El texto dice "Horas de Chile" pero el control está en inglés.
2. 🟠 El selector de hora no acepta escritura directa para AM/PM: hay que hacer clic en el segmentito y teclear "a"; sin eso el horario queda incompleto y **no hay mensaje de error visible** hasta guardar.
3. 🟡 Etiquetas pegadas: "Sala(opcional)" y "Tipo(opcional)" en el árbol de accesibilidad (en pantalla se ven en dos líneas, pero el lector de pantalla las junta).
4. 🟡 Días abreviados sin texto completo en botones ("Lun", "Mié"), y "Mié25" pegado en la vista compacta.
5. 🟡 "Voy a esta clase" como interruptor: no queda claro qué pasa si lo apago.

## Pantalla 13 — Agenda: botón "Calendario" (modal "Conecta GradeHub y tu calendario")

**Qué veo**: título "Conecta GradeHub y tu calendario", texto "Todavía no tienes fechas. Tráelas desde tu calendario.", sección "IMPORTAR ARCHIVO .ICS" con "Desde Apple, Google u Outlook. Revisas cada fecha antes de agregarla.", botones "Importar fechas" y "Cerrar".

**Qué siento**: miedo. "Conecta" suena a que voy a dar permiso a mi cuenta de Google, y el límite que me puse es no conectar cuentas externas.

**Qué pienso**: el texto de ayuda del botón dice "**Agregar evaluaciones al calendario**" (dirección GradeHub → calendario), pero el modal hace lo contrario: importar **desde** el calendario. Mismo botón, dos promesas distintas.

**Límite cumplido**: no toqué "Importar fechas" ni subí archivo. Cerré con "Cerrar".

**Qué cambiaría**: titular "Importar fechas de tu calendario" y explicar que no se conecta nada, solo se sube un archivo exportado; usar "archivo de calendario (.ics)" en vez de "ARCHIVO .ICS" a secas.
## Pantalla 14 — Estadísticas

**Qué veo**: título "Estadísticas" y botón "Editar"; subtítulo "Sem. 2 · 2026-2"; tarjeta "Tu promedio en el tiempo" con "Semestre actual · 2026-2", "4,9", "+0,06 con Examen final de Bases Químicas", un gráfico de área sin puntos visibles, eje "6 / 5 / 4,0", "26 nov" en ambos extremos del eje X, línea punteada "4,0 · referencia", botones de rango "Semana / Mes / Semestre" (Semestre activo al entrar), link "+ Ver línea de tiempo", tarjeta "Peso evaluado 100% / Del peso evaluable de tus ramos."; sección "Cómo vas respecto a los demás" que al principio aparece **vacía** y un segundo después muestra "Aún no hay suficientes datos para compararte con los demás."; "Historial" con botón "+ Semestre anterior".

**Qué siento**: el gráfico no me dice nada: una línea casi plana sin marcas, y el mismo día ("26 nov") en los dos extremos. Como usuario no técnico no sé si estoy bien o mal; recién entiendo con el "+0,06".

**Qué no es intuitivo**
- "Peso evaluado" y "Del peso evaluable de tus ramos": lenguaje estadístico. Mejor "Ya entró el 100% de las notas de tus ramos".
- "4,0 · referencia" no explica que 4,0 es la nota mínima de aprobación.
- "Sem. 2 · 2026-2" repite dos veces la idea de semestre.
- "Cómo vas respecto a los demás" suena a ranking y no aclara si mis datos se comparten.

**Bugs**
1. 🔴 **"+ Ver línea de tiempo" no responde al primer clic.** Pasos: Estadísticas → clic en "+ Ver línea de tiempo" → no pasa nada; hay que volver a hacer clic. Al segundo clic se expande y muestra la lista "Notas de más reciente a más antigua" con "Examen final / Bases Químicas / 26 nov / Nota 5,00 / Promedio 4,9 ↑ +0,06 puntos".
2. 🟠 Al expandirse, el triángulo sigue enfocando pero el texto sigue diciendo "−Ver línea de tiempo" pegado (sin espacio).
3. 🟠 El gráfico no tiene etiquetas de valores ni puntos; con un solo día de datos la línea cruza todo el ancho sugiriendo una tendencia inexistente.
4. 🟡 "Peso evaluado100%" (sin espacio).
5. 🟡 La comparación "Cómo vas respecto a los demás" aparece tardíamente (flash de zona vacía).

## Pantalla 15 — "Editar Estadísticas"

**Qué veo**: modal con "Ordena las secciones o esconde las que no miras. Se guarda al momento y solo cambia tu pantalla." y seis filas con flechas "Subir"/"Bajar" e interruptores "Mostrar …": "Tu promedio en el tiempo", "Qué mirar primero", "Qué mueve tu promedio", "Cómo vas en tus ramos", "Rango del semestre", "Historial" y botón "Listo".

**Qué siento**: buena idea (poder esconder lo que no entiendo), pero las flechitas ↑↓ sin texto se ven chico.

**Bugs**
1. 🟠 La lista del modal **no coincide con la pantalla**: "Qué mirar primero", "Qué mueve tu promedio", "Cómo vas en tus ramos" y "Rango del semestre" no aparecen en Estadísticas (solo están "Tu promedio en el tiempo", "Cómo vas respecto a los demás" e "Historial"), y "Cómo vas respecto a los demás" no está en el modal. El usuario mueve secciones que no ve.
2. 🟡 El diálogo pierde su nombre accesible tras re-render (aparece como "dialog" sin título) y cada cambio de interruptor vuelve a numerar los nodos.
3. 🟡 "Se guarda al momento" pero el botón "Listo" sugiere que hay que confirmar.

## Pantalla 16 — "+ Semestre anterior" (historial)

**Qué veo**: modal "Agregar un semestre anterior" con "Elige los ramos y pon la nota final de cada uno. No necesitas las evaluaciones."; "QUÉ SEMESTRE FUE" con combo "Año" (2026…2017) y botones "1° / 2° / Verano" (con texto de ayuda "Primer semestre", "Segundo semestre", "Temporada de verano"); "BUSCA TUS RAMOS" con campo "Nombre o sigla". Escribo "Química" → aparecen 25 resultados y el botón "Agregar «Química»". Elijo "Bases Químicas" → "TUS RAMOS DE ESE SEMESTRE" con "Quitar Bases Químicas" → "Continuar" → segundo paso "Notas finales de 2026-1" con "La nota con la que cerraste cada ramo. Puedes dejar en blanco los que no recuerdes: esos no entran al promedio.", campo "Nota final de Bases Químicas", aviso "Pon al menos una nota para guardar el semestre" y botones "Atrás" / "Guardar semestre". Escribo 5,5 → el aviso cambia a "1 de 1 con nota · promedio 5,50" → guardo → toast "**2026-1 agregado al historial**".

**Qué siento**: este flujo es el más claro de la app: dos pasos, texto explicativo y confirmación. El aviso que cambia a "1 de 1 con nota" es un muy buen eco.

**Qué no es intuitivo / bugs**
1. 🟠 "Sigla" y "Período/Verano" son términos que un alumno de primer año entiende, pero "sigla" está en el placeholder y no se explica; mejor "nombre o código".
2. 🟠 El año por defecto es 2026 (el año actual) y el período por defecto "1°": si quiero el semestre inmediatamente anterior tengo que adivinar cuál era. Un botón "Semestre anterior" directo ayudaría.
3. 🟡 "Guardar semestre" se ve activo aunque no haya puesto ninguna nota (solo avisa después, si se intenta).
4. 🟡 Tras guardar, la pantalla salta y el gráfico "Promedio por semestre" queda bajo el pliegue.

## Efecto en Inicio tras agregar historial (observado)

El encabezado de Inicio pasa a mostrar "4,9" con "**↓ 0,59 vs. 2026-1**" (con flecha roja hacia abajo), "2026-25 ramos · 10 créditos" y los chips "**1 en riesgo**" y "4 pendientes". La flecha roja puede leerse como "voy mal" aunque el 4,9 del semestre siga aprobado. El chip "1 en riesgo" no identifica a qué ramo corresponde.

---

## Pantalla 17 — "Perfil" (menú de ajustes)
Fuente: https://gradehub.cl/ (SPA, pestaña única)

**Qué veo:** tarjeta de perfil con avatar circular "M", nombre "Matías", "Enfermería (Concepción)", "UDD · 2.º semestre", correo completo `gpruebahark5@prueba.cl`. Cuatro grupos con encabezados en mayúsculas y chequeado fino:
- **TU SEMESTRE**: Universidad y carrera · Calendario · Archivar semestre
- **HERRAMIENTAS**: Calculadora de nota
- **LA APP**: Apariencia · Agentes conectados · Sugerencias y comentarios
- **TU CUENTA**: Datos y cuenta · Ofrecer clases o material
- Botón **"Cerrar sesión"** al fondo (texto en color de acento/rojo) y pie "Por estudiantes, para estudiantes. GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval".

**Diseño visual:** jerarquía clara (encabezados de grupo en mayúsculas + ícono de 16 px por fila), espaciado generoso, filas con chevron `>` a la derecha: patrón idéntico a Ajustes de iOS, muy **familiar**. El ícono de "Calendario" se repite con el del botón Calendario de Agenda (buena consistencia). Lo único desafuente: **"Cerrar sesión"** queda visualmente igual de importante que una fila de navegación (misma tipografía, sin separador), y el pie de página con los nombres de los fundadores está casi pegado al botón.

**Qué siento / pienso (usuario poco técnico):** "Archivar semestre" me da miedo (¿pierdo mis notas?), "Agentes conectados" no lo entiendo, "Ofrecer clases o material" suena a que voy a vender algo.

**No intuitivo (lenguaje):**
- 🔴 **"Agentes conectados"**: nombre críptico; un estudiante no técnico no sabe si es IA, integraciones o un chat. (Se abrió y se describió abajo, sin conectar nada.)
- 🟠 **"Archivar semestre"** sin explicación: no dice si borra o guarda.
- 🟡 **"Calculadora de nota"** bajo "HERRAMIENTAS" pero la app ya tiene simulador y "qué necesito para aprobar": tres herramientas de cálculo con nombres parecidos.
- 🟡 No hay versión de la app, ni "Ayuda"/"Preguntas frecuentes" ni "Tutoriales" en Perfil: para un usuario que entra por primera vez no hay forma de volver a ver el onboarding.

---

## Pantalla 18 — "Datos y cuenta" (diálogo "Ajustes")
Fuente: https://gradehub.cl/

Árbol exacto: heading `Datos y cuenta` (Valor 2) + "Respaldos, reinicio y eliminación" + "Guarda una copia antes de cambiar de dispositivo." + botones **Exportar mis datos** / **Importar datos** (no pulsados: importar/exportar no forma parte de la auditoría y puede tocar datos).

- Switch **"Compartir mis ponderaciones en forma anónima"** (`s-compartir-pautas`, Value 0 tras apagarlo). Texto de ayuda: "Se comparten los nombres y porcentajes de las evaluaciones, nunca tus notas. Al apagarlo dejas de aportar nuevas ponderaciones; lo ya aportado se conserva en el consenso anónimo y agregado." → **excelente redacción de privacidad**, la mejor del sitio.
- **Bug 🟠: apagar el switch no produce ningún eco** — no hay toast, ni cambio de texto, ni confirmación. Un usuario no técnico no sabe si el cambio quedó guardado (en otras partes la app sí usa toasts).
- Switch **"Usar mis notas para elegir anuncios"** (`s-anuncios-notas`, Value 1, **encendido por defecto**). Ayuda: "Las clases particulares recomendadas en Inicio se eligen en este dispositivo según tus ramos y notas; tus notas no se envían para eso. Si lo apagas, no verás recomendaciones en Inicio y puedes seguir buscando en Apoyo." → 🟠 **personalización de anuncios activada por omisión** en una app de notas, y con la palabra "anuncios" que un estudiante no espera aquí.
- **COMPARTIDO CON PROFESORES**: "Los profesores a los que les aceptaste el link ven tus notas de los ramos que elegiste." / "No compartes tus notas con ningún profesor." (correcto, sin datos que publicar).
- **PROFESORES BLOQUEADOS**: "No ves sus clases, perfiles ni anuncios. Para denunciar algo, toca «Denunciar o bloquear» en el anuncio o el perfil, o escríbenos a gradehub.app@gmail.com." → 🟠 menciona un control («Denunciar o bloquear») que **no existe en ninguna pantalla** que yo haya visto (ningún anuncio/perfil de profesor se muestra en el flujo de una carrera no-ingeniería sin clases en el mercado); el correo de contacto es Gmail genérico, no un dominio propio.
- **ZONA SENSIBLE**: botón **Eliminar mi cuenta** ("Borra tu cuenta y todas tus notas, en este dispositivo y en la nube. No se puede deshacer.") y **Reiniciar app** ("Borra los datos de este dispositivo y cierra sesión. Tus notas en la nube se conservan."). ✅ **No pulsados** (límite: no borrar cuenta). Buen uso de encabezado de advertencia y de textos que distinguen dispositivo/nube.
- Links **Términos de uso** (https://gradehub.cl/terminos.html) y **Política de privacidad** (https://gradehub.cl/privacidad.html).

## Pantalla 19 — Buscador de Ajustes (defectuoso)
- Campo `Buscar en Ajustes` (`settings-search`) + estado `settings-search-status` ("1 sección encontrada").
- 🟠 **Bug A**: escribo `anun` → "1 sección encontrada" y la lista muestra **"Apoyo"** (grupo LA APP), **ocultando "Datos y cuenta"**, que es la sección que realmente contiene la palabra "anuncios". El resultado mostrado no contiene el término buscado.
- 🟠 **Bug B**: escribo `anuncios` (plural, como aparece en la pantalla) → **"0 secciones encontradas / No encontramos esa opción. Prueba con «carrera», «correo» o «fondo»."** Es decir: busca solo por **título de sección**, no por el contenido, y el plural falla aunque el singular "anun" devuelva otra cosa.
- 🟡 **Bug C**: el botón para limpiar la búsqueda **no aparece en el árbol de accesibilidad** y `setValue(…,"")` no vacía el campo: no hay forma ratonil/lector de pantalla de limpiar la búsqueda sin cerrar el diálogo.
- 🟡 El conteo "1 sección encontrada" se anuncia como `status` pero no dice **dónde** está la sección; el diálogo mantiene el foco y no navega al resultado.
- Comparación de familiaridad: en iOS/Android/Google el buscador de ajustes coincide con **cualquier texto** de la pantalla; aquí no, así que el usuario conclude que "la opción no existe".

## Pantalla 20 — "Apariencia"
Fuente: https://gradehub.cl/

- Texto: "Modo, acento y fondo" / "Se guarda al elegir." Grupo de modos **Sistema ("Como tu dispositivo") / Claro / Oscuro**; **COLOR DE ACENTO** con radiogroup `s-acento-grid`: Turquesa, Azul, Índigo, Violeta, Cobre, Frambuesa; **FONDO** con radiogroup `s-fondo-grid`: Neutro, Pizarra, Papel.
- ✅ Microinteracción y feedback **inmediato y sin recarga**: al pulsar **Oscuro** toda la app (incluida la página detrás del diálogo) pasa a tema oscuro; al pulsar **Azul** cambian el color de acento, los chips seleccionados y el resaltado de la navegación; al volver a **Claro** se revierte. Estado seleccionado con borde + relleno tintado, muy legible. Los radios exponen nombre accesible correcto (Turquesa/Azul/… Valor 1/0).
- 🟡 **Diseño**: las muestras de **FONDO** (Neutro / Pizarra / Papel) se dibujan como un **óvalo partido en negro y blanco**, que no comunica el color real del fondo (un "Papel" beige y un "Neutro" blanco se ven iguales); la muestra del acento sí funciona. Falta contraste/etiqueta de previsualización.
- 🟡 Falta **previsualización** del tema aplicado en el propio diálogo (la app de atrás cambia, pero el diálogo no muestra un ejemplo de gráfico con el acento nuevo).
- 🟡 No hay control de **tamaño de letra / accesibilidad** (contraste alto, reducir movimiento), esperado en una app revisada por un usuario no técnico.

## Pantalla 21 — "Agentes conectados" (NO se conectó nada; límite respetado)
Fuente: https://gradehub.cl/

**Qué veo:** heading `Agentes conectados` / "Conectar o desconectar un agente" · caja verde "Qué puede hacer: Ver tus ramos, notas y fechas, simular escenarios, agregar un ramo y proponerte ponderaciones que tú confirmas. No puede escribir tus notas ni borrar nada." · 3 pasos numerados: **1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO** ("Pégalo en el chat y te dirá dónde agregar el conector.") con bloque de texto del prompt y botón **Copiar mensaje para mi agente**; **2. PONLE UN NOMBRE A LA CONEXIÓN** (campo con placeholder "Ej: Mi agente"); **3. CREA LA URL Y AGRÉGALA AL CONECTOR** ("Pégala donde te indicó tu agente. Dura 90 días y se muestra una vez.") botón **Crear URL de conexión** · "AGENTES CONECTADOS / Los puedes desconectar cuando quieras." + **Actualizar lista** + "Todavía no tienes agentes conectados." · "Ideas para pedirle" con `<select>` ("Ponerme al día una vez a la semana" / "Un plan para mi próxima evaluación" / "Un plan para lo que queda del semestre"), **Ver el mensaje** (revela un prompt largo y bien escrito) y **Copiar** · "Ponderaciones por revisar / Nada cambia hasta que la confirmes." + **Ver propuestas** → toast **"No tienes ponderaciones pendientes"** ✅.

**Qué siento / pienso (usuario de humanidades, poco técnico):** no entiendo nada. "Agente", "URL MCP", "conector o servidor MCP", "tareas programadas" son términos de ingeniería. Un estudiante de Enfermería no sabe qué es un agente de IA ni dónde se pega un prompt.

**Bugs / no intuitivo:**
- 🔴 **Lenguaje técnico puro**: "PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO", "mediante una URL MCP", "conector o servidor MCP". Sin glosario, sin ejemplo de qué es un agente, sin links a ayuda.
- 🔴 **Fuga de texto al árbol de accesibilidad**: el campo de nombre (`s-agent-url-nombre`) queda **etiquetado por dos encabezados** — su nombre accesible es "1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO 2. PONLE UN NOMBRE A LA CONEXIÓN" en vez de "Ponle un nombre a la conexión". Un lector de pantalla lee los pasos anteriores como si fueran la instrucción del campo. El placeholder "Ej: Mi agente" no funciona como etiqueta.
- 🟠 **Sección para público equivocado**: aparece en el menú principal "LA APP" de un usuario recién llegado, mezclada con Ajustes básicos, y no hay forma de ocultarla.
- 🟡 El `<select>` de "Ideas para pedirle" se **corta visualmente** ("Ponerme al día una vez a la sem ▾"): ancho fijo sin elipsis.
- 🟡 **Doble botón "Copiar"** con el mismo nombre en la misma pantalla (uno por paso y uno en Ideas) → ambiguo para lector de pantalla.
- 🟡 Al expandir "Ver el mensaje" y hacer scroll, la **lista de secciones de Ajustes se desplaza y pierde el buscador**; no hay zona de scroll fija como en un patrón maestro-detalle habitual.
- ✅ Bueno: "Qué puede hacer / No puede escribir tus notas ni borrar nada" y "Nada cambia hasta que la confirmes" explican permisos sin tecnicismos (salvo "ponderaciones").

## Pantalla 22 — "Sugerencias y comentarios" (abierta y CERRADA sin enviar; nada publicado)
- Heading `Sugerencias y comentarios` / "Cuéntanos qué mejorar" / "¿Algo no se entiende, está fallando o podría ser mejor? Lo leemos nosotros."
- `TIPO DE COMENTARIO` (`s-feedback-type`): "Tengo una sugerencia" / "Encontré un problema" / "Otro comentario". `CUÉNTANOS` (`s-feedback-message`), ayuda "Mínimo 3 caracteres · queda asociado a tu cuenta." y contador **"0 / 2000"**; botón **Enviar comentario**; "¿Prefieres escribirnos por correo? gradehub.app@gmail.com" (mailto).
- ✅ Patrón familiar (tipo/comentario/contador), texto de privacidad honesto, botón de envío deshabilitado hasta escribir.
- 🟠 **No se puede adjuntar pantalla ni se captura versión/dispositivo**: el fundador recibe solo texto, y el usuario no puede reportar un bug con evidencia.
- 🟡 El placeholder "Escribe acá lo que te gustaría cambiar…" no cambia al seleccionar "Encontré un problema" (pista poco útil para describir un fallo).
- 🟡 **No hay checkbox de consentimiento** para asociar el comentario a la cuenta, aunque el texto lo advierte.

## Pantalla 23 — "Información académica" (= "Universidad y carrera" en Perfil)
- Heading `Información académica` / "Universidad, carrera y semestre". **UNIVERSIDAD**: 5 botones-chip `UChile` (Help: U. de Chile), `UC` (U. Católica), `UAI`, `UANDES`, `UDD` — **confirma que la U. de Concepción sigue sin existir** y no hay campo "escribir mi universidad". 🟠 **Siglas sin nombre completo visible** (el nombre largo sólo está en el tooltip `Help`, invisible en táctil y para lector de pantalla que no recorre ayuda).
- "Cambia tu catálogo disponible. Tus ramos y notas no se tocan." ✅ tranquilizador.
- **CARRERA**: buscador `s-carrera-buscar` ("Busca tu carrera") + chip seleccionado "Enfermería (Concepción)".
- **SEMESTRE DE CARRERA**: grilla 1° … 11° (2° seleccionado). 🟡 no usa "1.º/2.º" como el resto de la app ("Vas en tu 2.º semestre", "UDD · 2.º semestre"): **inconsistencia tipográfica de ordinal** (1° vs 2.º).
- Botones **Guardar** (negro, ancho completo) y **Ramos de mi malla**; **SEMESTRES QUE YA CURSASTE** + "Agregar un semestre anterior".
- **Bug 🟠**: al pulsar **Ramos de mi malla** la app muestra sólo un toast — **"Aún no tenemos la malla de tu carrera — agrega tus ramos con el botón +"** — pero el botón queda con estilo "activo/seleccionado" y no pasa nada más. El "+" no existe en esta pantalla (el botón de la app se llama "Agregar ramo"), así que la instrucción del toast **no es accionable aquí**.
- 🟡 "Guardar" negro de ancho completo compite visualmente con "Ramos de mi malla" y "Agregar un semestre anterior", que son acciones distintas (jerarquía de 3 botones en una sola columna).

## Pantalla 24 — Diálogo "Archivar 2026-2" (abierto, completado a medias y **CANCELADO**)
Fuente: https://gradehub.cl/ → Perfil → Archivar semestre

**Qué veo:** título `Archivar 2026-2`; "Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo." Una tarjeta por ramo: "Bases Químicas / **Calculada: 4,9**" y las otras cuatro con "**Falta: Revisa las ponderaciones y las notas de este ramo**" + botón **Completar evaluaciones**; en todas, campo **Nota final oficial** con subtítulo "del portal de tu universidad" (placeholder **"—"**); `alert` oculto `cierre-error`; botones **Cancelar** / **Archivar semestre**.

**Qué siento / pienso:** es la pantalla más clara del flujo de cierre: explica la consecuencia de archivar incompleto y separa "Calculada" de la nota "oficial". El botón "Completar evaluaciones" lleva directo al ramo (buena salida).

**No intuitivo / visual:**
- 🟡 Placeholder **"–" (raya)** en "Nota final oficial": no dice formato ni rango (¿5,2? ¿1,0-7,0?). Mejor "Ej.: 5,2".
- 🟡 "Nota final oficial**del portal de tu universidad**" va pegado sin espacio al nombre del campo en el árbol (label + sublabel en la misma línea, y en el árbol se leen como una sola palabra).
- 🟡 El diálogo no muestra un **resumen** (promedio del semestre, ramos aprobados/reprobados) antes de archivar.
- 🟡 No hay indicación de qué pasa con el semestre archivado (¿vuelve a "Estadísticas"?), aunque el texto de "Fuera del promedio acumulado" ayuda.
- ✅ Familiar: lista de tarjetas + botón de peligro suave; dos botones al pie (Cancelar a la izquierda), estándar.

## Pantalla 25 — Diálogo "Calculadora de nota" (HERRAMIENTAS)
- "Convierte el puntaje de una prueba a nota. Puedes calcular sin elegir un ramo." Campos **PUNTAJE OBTENIDO** ("Por ejemplo, 25"), **PUNTAJE TOTAL** ("Por ejemplo, 50"), **EXIGENCIA (%)** (50). Disclosure **Más opciones de escala** → NOTA MÍNIMA 1 / NOTA DE APROBACIÓN 4 / NOTA MÁXIMA 7 / checkbox "Truncar en vez de redondear" (off). Resultado en caja gris: **Tu nota 5,6** y "Con 50 % de exigencia, el 4,0 está en 25,00 de 50,00 puntos." ✅ correcto para 38/50.
- **Tabla de puntaje a nota** expandida por defecto con "De a 1 / 0,5 / Otro [ ] puntos" y tabla Puntos↔Nota que para 50 puntos genera **51 filas** dentro del modal.
- **GUARDAR EN UN RAMO** (`Solo calcular` + 5 ramos) y **EVALUACIÓN O CASILLA** deshabilitado con "Elige un ramo primero"; avisos "Las secciones de varias notas se editan en la ficha del ramo." y "El puntaje obtenido y el total no se guardan."; botones **Cerrar** / **Guardar como nota** (deshabilitado).
- ✅ Buena idea, cálculos correctos, escala chilena 1,0-7,0 por defecto, y avisa qué no se guarda. Los labels en mayúsculas y los placeholders con "Por ejemplo, 25" son el mejor patrón del sitio.
- 🟠 **Microinteracción**: el resultado "Tu nota" **no aparece hasta escribir ambos campos** y no hay ningún estado de carga/animación; el cambio de "–" a 5,6 es instantáneo y sin énfasis, y la tabla se re-renderiza completa sin indicar actualización.
- 🟠 **Tabla de 51 filas** en un modal sin altura máxima ni scroll propio: obliga a scrollear toda la página del diálogo y tapa los botones Cerrar/Guardar (hay que bajar hasta el final). Mejor: tabla colapsada por defecto o con scroll interno y tope.
- 🟡 **"De a 1 | 0,5 | Otro [ ] puntos"** mezcla botones tipo chip con un campo de texto en la misma fila, sin separación clara; "Otro" queda como un chip vacío que en realidad es un input.
- 🟡 Se llama "Calculadora de nota" pero calcula puntaje→nota (no el promedio que falta para aprobar, que hace el simulador): dos nombres parecidos para cosas distintas.

## Pantalla 26 — "Apoyo" (menú Perfil → "Ofrecer clases o material") — **BUG DE CAGA COLGADA**
Fuente: https://gradehub.cl/ → Perfil → Ofrecer clases o material

- El diálogo se abre con heading `Apoyo` y subtítulo **"Ofrece clases, material o tu app"** y queda para siempre en **"Revisando tu acceso…"** (verificado con 3 s y 5 s de espera y con un segundo clic en la sección: el texto no cambia, no aparece spinner, ni error, ni botón de reintento, ni contenido).
- 🔴 **Bug (estado de carga sin fin).** Pasos para reproducir: Perfil → "Ofrecer clases o material" → la columna derecha muestra "Ofrece clases, material o tu app" y "Revisando tu acceso…" indefinidamente. La cuenta es nueva, sin rol de profesor: la app nunca resuelve ese estado.
- 🔴 **Inconsistencia de nombres**: el ítem del menú dice "Ofrecer clases o material", la sección se llama "Apoyo" y en Inicio el bloque se llama "¿Buscas apoyo en un ramo? / APOYO". Tres etiquetas para dos cosas distintas (buscar apoyo vs. ofrecer apoyo).
- 🟠 El texto "tu app" ("Ofrece clases, material o tu app") sorprende: no se entiende qué es "ofrecer tu app".
- 🟠 **El estado de carga no usa el patrón del resto de la app** (que sí tiene skeleton/spinner en onboarding): aquí es solo texto gris, sin indicador visual, así que el usuario no distingue "cargando" de "no funciona".

## Pantalla 27 — "Calendario" (Ajustes) — suscripción ICS
- Heading `Calendario` / "Importar fechas o suscribirte" / "Tus evaluaciones en Google Calendar, Apple Calendar u Outlook. Se agrega una vez y se actualiza sola cada algunas horas." · **TU URL DE SUSCRIPCIÓN** (campo de solo lectura con `https://gradehub.cl/cal/<64-hex>`) + **Copiar URL** + **Generar una nueva** · "En Google Calendar: Otros calendarios · + · Desde URL." · aviso "Quien tenga esta URL ve tus evaluaciones y fechas. Tus notas no salen nunca. Si se filtra, genera una nueva." · **TRAER FECHAS DESDE UN CALENDARIO**: "Sube un archivo .ics de tu calendario. Revisas cada fecha antes de agregarla." + **Importar archivo .ics** (**no** se importó ni suscribió nada: límite de no conectar cuentas externas).
- ✅ Muy buen texto: explica el mecanismo, el alcance de lo que se comparte y el plan B si se filtra. Es el mejor copy de privacidad del sitio junto con el de "Compartir mis ponderaciones".
- 🔴 **Seguridad/privacidad**: la **URL con el token se muestra en texto completo** en un campo de solo lectura, sin control "mostrar/ocultar", sin enmascarar por defecto y sin advertir que el enlace queda expuesto a quien mire la pantalla (o una captura). Un token de acceso debería ocultarse por omisión con botón "Mostrar". 
- 🟠 El campo es de solo lectura y **no admite selección con el lector de pantalla** (su valor no es copiable sin el botón), pero al menos el botón existe: bien.
- 🟡 Convive con el botón "Calendario" de Agenda, cuyo tooltip dice "Agregar evaluaciones al calendario" y abre un diálogo de **importación .ics**; aquí la misma palabra "Calendario" significa además **suscripción saliente**. Dos modelos mentales bajo un nombre.

## Pantalla 28 — "Perfil" (Ajustes) = "Editar tu nombre y tu cuenta"
- Heading `Perfil` / "Tu nombre, correo y contraseña". Campos: **NOMBRE PARA MOSTRAR** ("Matías", ayuda "Aparece en el saludo de inicio."), **APELLIDO** ("Prueba", ayuda "No se muestra a otros estudiantes."), **Guardar** (negro), **CORREO DE ACCESO** (`gpruebahark5@prueba.cl`, ayuda "Te mandaremos un enlace a la dirección nueva para confirmarla. Revisa que esté bien escrita: con ella entras y recuperas tu cuenta.") + **Cambiar correo**; **NUEVA CONTRASEÑA** / **REPITE LA CONTRASEÑA** + ayuda "Al menos 8 caracteres, con letras y números." + **Cambiar contraseña**. (No se cambió correo ni contraseña para no arriesgar la cuenta.)
- ✅ Buenas ayudas bajo cada campo; el correo se confirma con enlace; la regla de contraseña se muestra antes de escribir.
- 🟠 **Seguridad**: para cambiar la contraseña **no se pide la contraseña actual** ni se advierte que se cerrará sesión en otros dispositivos.
- 🟠 **Tres acciones de cuenta en una sola columna** (Guardar / Cambiar correo / Cambiar contraseña) con separadores débiles: el "Guardar" negro parece guardar todo el formulario, pero sólo guarda nombre y apellido.
- 🟡 No hay botón "mostrar contraseña" (los otros formularios del sitio tampoco lo tienen).
- 🟡 **Inconsistencia de nombre de sección**: el botón de Perfil dice "Editar tu nombre y tu cuenta", la sección se llama "Perfil" y el diálogo de Ajustes ya tenía un ítem "Perfil" en TU CUENTA → dos entradas "Perfil" con contenidos distintos ("Perfil" de Ajustes y la tarjeta de Perfil).

## Pantalla 29 — Diálogo "Eliminar tu cuenta" (abierto, descrito y **CANCELADO**; cuenta NO borrada)
- Overlay `confirm-overlay` + dialog `Eliminar tu cuenta`: **"Se borran tus 5 ramos con 3 notas, tu perfil y tu cuenta. En este dispositivo y en la nube. Esto no se puede deshacer."** Botones **Cancelar** y **Continuar** (`confirm-action`, en rojo, con foco inicial).
- ✅ Excelente: **cuantifica lo que se va a borrar** ("5 ramos con 3 notas"), dice el alcance (dispositivo y nube) y que es irreversible. Botón peligroso en rojo y Cancelar a la izquierda.
- 🟠 **El foco inicial está en "Continuar"**, el botón destructivo: con Enter o con lector de pantalla se borra la cuenta sin querer. Debería abrir con foco en "Cancelar".
- 🟠 **Un solo paso** para una acción irreversible: "Continuar" no pide confirmación adicional (escribir "ELIMINAR" ni reautenticar).
- 🟡 No ofrece exportar antes de borrar ni propone un plazo de gracia.
- 🟡 El overlay es `clickable`: un clic fuera del diálogo puede cerrarlo o, según el orden de capas, pulsar algo. (No se comprobó para no arriesgar el borrado.)
## 30. Menú "Herramientas" y orden de ramos (Inicio)
- El botón de solapa "Herramientas" (`#herramientas-boton`) abre un menú con **un solo ítem**; un menú de una opción no aporta y confunde (parece que faltan entradas).
- "Ordenar ramos. Ahora: Manual" (menú emergente, sin texto visible, solo ícono): opciones **Manual / Por nota / A-Z**. Al elegir un orden automático, las asas de arrastre ("Mantén presionado para mover") se reemplazan por "›" sin explicar el cambio.
- **Diseño visual:** correcto, ítems alineados; el ícono de orden no tiene etiqueta en pantalla. **Familiaridad:** el patrón de ordenamiento es el esperable (Apps de notas/carpetas), pero ocultar el cambio de modo de orden resta claridad.

## 31. Diálogo "Agregar ramo"
- Campo con label **"NOMBRE DEL RAMO · lo buscamos en la malla UDD"** (mayúsculas + punto medio, lenguaje algo técnico) y placeholder "Ej.: Microeconomía I" (ejemplo de otra carrera).
- Al no existir malla real de Enfermería UDD, la búsqueda devuelve ramos de Diseño/Arquitectura rotulados **"fuera de malla"** (ej. "Taller 1: Formación, Representación y Espacio", "Composición Bidimensional"). **Bug de datos 🟠/🔴 para una carrera de salud**: un estudiante de Enfermería ve ramos de Arquitectura.
- Con "Cuidado" sí aparecen ramos reales y "Bases del Cuidado de Enfermería 2° semestre **ya lo tienes**" (deshabilitado, buen estado).
- Sin coincidencias: **"No está en tu malla — lo agregamos como ramo tuyo."** + botón "Agregar ramo" → muy claro y buena microcopy.
- Alta manual de "Farmacología" OK: toast **"Ramo agregado"**, contador pasa a 6 ramos.
- **Bug 🟠:** el ramo nuevo **no tiene créditos** y el Inicio queda **"2026-2 6 ramos"** sin el número de créditos, con aviso: *"Promedio simple porque falta el crédito de Farmacología. Si lo pones en Editar ramo, se calcula ponderado por créditos."* (texto correcto pero aparece recién en el promedio; el aviso no se muestra al crear el ramo).
- **Microinteracción buena:** foco automático en el campo, búsqueda al escribir, estado vacío útil.

## 32. Ficha de ramo con pauta sugerida por consenso (Bases Biológicas)
- Estado vacío: eyebrow "Agrega evaluaciones para comenzar", H2 "Sin notas", tarjeta *"Todavía no tenemos las ponderaciones de este ramo / Ármalas con el programa del curso: el nombre de cada evaluación y su porcentaje."* + botón **"Armar mis ponderaciones"**.
- Aparece tarjeta **"Ponderaciones sugeridas"** con: *"Compárala con el programa de tu curso antes de usarla."* y *"Reportada por 1 estudiante, sin confirmar"* + desglose Controles 14% / Prueba 1 15% / Prueba 2 18% / Prueba 3 22% / Seminario 5% / Taller 14% / Tareas 12% (suma 100 %) y botones **Ahora no / Usar estas ponderaciones**. ✅ Muy buena idea y buen advertencia de fuente.
- **Bug 🟡 de legibilidad:** el desglose de la pauta se lee como texto corrido en el árbol ("Reportada por 1 estudiante, sin confirmarControles14%Prueba 115%…"): en pantalla se ve como tabla/etiquetas pero no está marcado como tabla/lista, así que un lector de pantalla lo lee todo seguido.
- **Bug 🟡 tras aplicar:** el eyebrow superior pasa a decir **"Reportada por 1 estudiante, sin confirmar"** en la cabecera de la ficha (queda como si fuera el estado del ramo, no el origen de la pauta).
- Aplicar sugerencia es inmediato, sin confirmación adicional; no publica nada (correcto para el límite de auditoría).

## 33. Diálogo "Armar mis ponderaciones" (Farmacología)
- Texto: *"Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas."*; contador **"0 / 100% · faltan 100%"** → **"✓ 100 / 100% · ponderaciones listas"** (excelente feedback).
- Botón **"Usar 100%"** que se recalcula a "Usar 80%", "Usar 60%" (muy útil, evita cuentas a mano).
- **"Copiar de otro ramo"** (select "Elegir / Bases Químicas · 3 evaluaciones") ✅ gran atajo.
- Disclosures: "Reglas de esta evaluación", "Requisitos que combinan evaluaciones", **"Eximición del examen"** (término técnico para un alumno de 1.er año; ayudaría un ejemplo).
- Cada fila pasa a etiqueta accesible "Peso de Control 1" al poner nombre ✅. Botón "Opciones de Control 1" (⋯) sin texto.
- Toast al guardar: **"✓ Listo, ya suma 100%"** ✅.
- La ficha muestra enseguida **"Necesitas 4,0 en lo pendiente para aprobar"**, botón **Simular** y, una vez completo, **Calificar**.

## 34. Ingreso de notas (flujo rápido por teclado)
- "+ Nota" se convierte en campo en línea; al guardar con **Return** el **foco salta al siguiente "+ Nota"** → se pueden llenar 6-7 notas seguidas sin tocar el mouse. 👏 Excelente para el fin de semestre.
- Eco tras cada nota: *"Vas 5,1 · buen margen en lo pendiente"*, *"Vas 4,7 · ramo completamente evaluado"*, y píldora **"Promedio general 4,9 → 4,8"** ✅ (transparencia muy buena).
- **Bug 🟠 (automatización/accesibilidad):** los nodos de "+ Nota" se invalidan al re-renderizar y `tab.click` lanzó *"node 1266/1385 could not be scrolled into view"*; el clic sí se aplicaba (el campo quedaba abierto y enfocado) pero la API reporta error. Con lector de pantalla el salto de foco puede ser confuso porque el botón desaparece y aparece un campo.
- Al completar un ramo aparece el botón **"★ Calificar"** junto a **Simular**, y el estado **"✓ Aprobado"** en verde.
## 35. "Copiar de otro ramo" (Lectura Crítica)
- El select **"Copiar de otro ramo"** lista los ramos con pauta ("Bases Químicas · 3 evaluaciones", "Bases Biológicas · 7 evaluaciones"…). Al elegir uno aparece un diálogo de confirmación: **"Usar las ponderaciones de Bases Químicas"** / *"Vas a copiar 3 evaluaciones y sus porcentajes desde Bases Químicas. No se copian notas ni fechas. Podrás ajustarla antes de guardar."* ✅ texto excelente.
- **Bug 🟠 de color semántico:** el botón de confirmación **"Usar ponderaciones" es rojo** (color destructivo, el mismo de "Eliminar"), aunque la acción es constructiva. Invita a creer que se borra algo.
- **Bug 🟡 de accesibilidad/automatización:** el `<select>` vuelve a "Elegir" tras seleccionar (el componente se auto-resetéa) y la opción no es seleccionable por accesibilidad; el diálogo de confirmación queda montado sobre el modal (dos capas de diálogo) y el botón primario no aparece de forma estable en el árbol.
- Tras confirmar, las 3 evaluaciones aparecen con sus pesos y el contador en **"✓ 100 / 100% · ponderaciones listas"**. Muy buen atajo para el mundo real.

## 36. Fin de semestre simulado (los 6 ramos con todas las notas)
Ramos y notas cargadas: Bases Químicas 4,9 · Bases Biológicas 5,0 (pauta sugerida por consenso) · Bases del Cuidado de Enfermería 4,7 · Lectura Crítica 4,6 · Pensamiento Crítico 4,8 · Farmacología 4,7 (ramo propio). Todos con 100 % del peso evaluado y **"✓ Aprobado"** en su ficha.
- Buenas microinteracciones: eco *"Vas X · ramo completamente evaluado"*, píldora **"Promedio general 4,8 → 4,8"**, salto de foco a la siguiente nota, nota **3,9 en rojo** (buen uso del color).
- **Bug 🔴 (contradicción de estados):** en Inicio las etiquetas dicen **"1 aprobado · 5 en riesgo"** cuando las 6 fichas dicen "✓ Aprobado" y ninguna nota está bajo 4,0. El contador de riesgo no coincide con el estado real de los ramos. Reproduce: crea 6 ramos, pon pauta y notas finales ≥4,0 en todos → Inicio muestra "1 aprobado, 5 en riesgo".
- **Bug 🟠 (stale):** recién ingresada la última nota (Pensamiento Crítico), el bloque **"Última nota"** del Inicio sigue mostrando **"Examen final · Farmacología 4,5"**; no refleja la última nota anotada (ninguna evaluación tiene fecha).
- **Bug 🟡:** tras guardar la pauta en Lectura Crítica, el eyebrow de la ficha sigue diciendo **"Agrega evaluaciones para comenzar"** junto a "Sin notas" hasta que se anota la primera nota (en Farmacología sí desaparece al guardar).
- **Aviso 🟠:** *"Promedio simple porque faltan los créditos de Bases Biológicas y 4 más. Si los pones en Editar ramo, se calcula ponderado por créditos."* El aviso es claro, pero aparece **después** y nunca se pidió el crédito al crear el ramo; además no hay enlace real a "Editar ramo" (texto plano).
- **Diseño visual:** las tarjetas de ramo quedan con la barra de progreso al 100 % y la nota en verde/oliva; la nota 4,6-4,9 se muestra en oliva/verde, lo que puede leerse como "riesgo" cuando el ramo está aprobado (poco contraste semántico entre "aprobado" y "en riesgo").

## 37. Estadísticas con semestre completo
- "Tu promedio en el tiempo" actualizado: **4,8**, *"−0,07 con Examen final de Pensamiento Crítico"*, línea de tendencia teal con degradado, referencia punteada **4,0**.
- **Bug 🟡 del gráfico:** el eje X muestra **"26 nov" en ambos extremos** (inicio y fin del rango) porque las evaluaciones no tienen fecha; con "Semana" activa, la curva no tiene sentido temporal.
- **"Qué mueve tu promedio"** (nuevo, aparece al completar ramos): barras +0,03 / +0,02 / 0,00 / −0,01 / −0,02 / −0,03 con texto *"Cuánto sube o baja cada ramo tu 4,8."* ✅ muy clarificador, y cada barra trae descripción accesible ("Sube tu promedio en 0,03").
- **"Peso evaluado 100%"** con la leyenda *"Del peso evaluable de tus ramos."* — "peso evaluable" es término técnico; la tarjeta tiene un borde teal grueso que pesa más que el contenido (jerarquía discutible).
- "Cómo vas respecto a los demás" sigue sin datos (*"Aún no hay suficientes datos para compararte con los demás."*) ✅ honesto, aunque no explica qué hace falta.
- **Familiaridad:** el gráfico de área y las barras divergentes son patrones conocidos (banca/apps de finanzas), pero el slider de "Explorar tu promedio en el tiempo" no tiene instrucción visible (no hay texto que diga que se puede arrastrar).
## 38. Modal "Simular el semestre" (desde Inicio)
- Texto: *"Cambia la nota final de cada ramo y mira tu promedio. No se guarda."* y **PROMEDIO PROYECTADO 4,77** con fila por ramo (− / nota / +) y *"Actual 4,9 · 100% evaluado"*. Botones **Reiniciar todo** y **Listo**. ✅ Excelente promesa de reversibilidad.
- Al bajar una nota aparece **"↓ 0,02 vs 4,77 actual"** y un enlace **"Volver al real"** por ramo ✅ muy bueno.
- **Inconsistencia 🟡:** el promedio proyectado se muestra con **2 decimales (4,77)** mientras todo lo demás usa 1 decimal (4,8).
- **Bug 🟠 de color semántico:** cada fila lleva un **punto de color** (violeta, verde, naranja, azul, amarillo) que es el acento del ramo, pero dentro de un simulador se lee como **semáforo de riesgo** (Bases del Cuidado en naranja, "Pensamiento Crítico" en amarillo).
- **Bug 🟡 de layout:** al aparecer "Volver al real" la fila crece y el contenido se desplaza (layout shift); el clic siguiente en la misma posición cae en otro control.
- **Diseño visual:** muy limpio, buen contraste, botones − / + grandes (target táctil correcto). El modal no es scrolleable en anchos bajos: con 6 ramos, la última fila (Farmacología) y los botones quedan al filo.
- **Familiaridad:** patrón de calculadora con步进 +/- conocido (apps de bancas e calculadoras).

## 39. Directorio "Encuentra tu apoyo" (APOYO)
- Tarjeta de Inicio: eyebrow **APOYO**, *"¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos."* y enlace **Explorar apoyo** (la tarjeta completa es un botón y además tiene "›" a la derecha: doble affordance).
- Modal: heading **"Encuentra tu apoyo"**, *"Profes, academias y apps para tus ramos."*, buscador con placeholder *"Cálculo, MAT1620, clases particulares…"*, chips **Todos / Clases / Material / Laboratorios / Plataformas y apps / Otro**, contador *"1 resultado"* y nota de privacidad: *"Ordenamos los ramos según tu carrera, en tu dispositivo. No usamos tus notas ni enviamos esta información."* 👏 (buen aviso de privacidad en lenguaje simple).
- Perfil de **MentorIA** (único resultado): tarjeta con tipo, logo, *"Sin valoraciones"*, descripción, botones **Instagram** (rosa) y **Sitio web** (verde claro), **Ramos: 12 ramos** con chips de siglas (MAT1610, MAT1620, MAT1203, MAT1279, EAA1510, MAT209, +6), **Ver los 12 ramos** y **Denunciar o bloquear**. (No se pulsaron los enlaces externos.)
- "Ver los 12 ramos" despliega la lista completa, pero **repite las mismas siglas** que ya estaban en los chips y **el chip "+6" sigue visible** aunque todo esté expandido (🟡).
- **Denunciar este perfil** (abierto y **cancelado**, nada enviado): *"¿Qué pasa?"* con 5 radios (Ofensivo, discriminatorio o acoso / Engañoso o posible estafa / Spam o no corresponde a GradeHub / Expone datos personales / Otro motivo), campo **CUÉNTANOS MÁS OPCIONAL** con placeholder "Qué viste y dónde" y contador **0/500**, botones **Cancelar / Enviar denuncia**, nota *"Una persona del equipo la revisa dentro de 24 horas y nadie más sabe quién denunció. ¿Es urgente? Escríbenos a gradehub.app@gmail.com"* y sección **Bloquear a MentorIA** con *"Dejas de ver sus clases, su perfil y sus anuncios. No se le avisa, y puedes deshacerlo en Ajustes."* ✅ texto y estructura muy buenos.
- **Bugs / roces:**
  - El diálogo se expone ante lector de pantalla como **dialog "Ventana"** (sin nombre accesible) aunque el heading dice "Encuentra tu apoyo" 🟡.
  - Al elegir un chip de filtro (p. ej. Laboratorios) el heading de sección **sigue diciendo "Todos"** 🟡.
  - El campo de búsqueda **no se puede limpiar con teclado/automatización fácil**: tiene "×" visible pero el botón de limpiar no está en el árbol; hay que seleccionar todo y borrar 🟡.
  - Estado vacío correcto: *"No encontramos perfiles con estos filtros." / "Prueba con otro ramo o tipo de apoyo."* ✅.
- **Para una carrera no-ingeniería:** el único perfil disponible es de **Cálculo para la UC** (siglas MAT/EAA/ECM/MA/IIM). Para Enfermería UDD el directorio queda prácticamente vacío y el placeholder ("Cálculo, MAT1620") refuerza que la app está pensada para ingeniería/UC. 🟠

---

## 40. Agenda → "Editar horario" y "Horario de Farmacología" (probado al final, para cerrar los botones de la Agenda) — https://gradehub.cl/ (pestaña única, la URL no cambia)

### Botón "Editar horario" (esquina superior derecha de la vista "Horario")
- Abre el modal **"Tu horario"** con un resumen por ramo: "1 clase a la semana", y una lista con cada ramo, su día/hora o "Sin horario", y a la derecha un botón de texto **"Editar"** o **"Agregar"**. Abajo, **"Agregar clase"** y el botón negro full-width **"Listo"**.
- **Qué veo:** buen resumen, muy claro; los mismos colores-testigo del ramo a la izquierda. **"Listo"** como confirmación de un diálogo que no obliga a nada está bien elegido (en vez de "Guardar").
- **Qué siento:** orden y calma; es la mejor pantalla del flujo de horario.
- **Qué pienso:** "Editar/Agregar" a la derecha, alineados, se leen como columna de acciones ✔.
- **Familiaridad:** idéntico a la lista de alarmas/registros de una app de banco. ✔

### Modal "Horario de Farmacología" (al tocar "Agregar")
- Contenido: "Se repite cada semana. Horas de Chile." · **"Bloque 1"** · **7 chips-día** (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) · **Inicio** y **Fin** (controles nativos de hora) · **"Sala (opcional)"** con placeholder "Ej.: K201" · **"Tipo (opcional)"** (combobox: Cátedra, ayudantía…) · switch **"Voy a esta clase"** (activado por defecto) · **"Copiar bloque"**, **"Quitar"**, **"+ Agregar bloque"**, **"Cancelar"**, **"Guardar horario"**.
- **Bugs visuales 🟡 (texto exacto de las etiquetas):** los labels se dibujan **sin espacio** antes del paréntesis: **"Sala(opcional)"** y **"Tipo(opcional)"** en la pantalla, aunque el nombre accesible sí lleva espacio ("Sala (opcional)"). Falta de consistencia con el resto de la app.
- **Formato de hora 🟡:** el sitio dice "Horas de Chile" pero usa el control nativo de hora del navegador; en un navegador en inglés se muestra **"10:00 AM / 11:30 AM"** (12 h con AM/PM) y en español 24 h. Un estudiante chileno espera **10:00** sin sufijo. La app no fuerza el formato 24 h ni lo documenta.
- **Buen detalle ✔:** el switch "Voy a esta clase" (por defecto sí) permite tener un ramo "que no tomo" sin borrarlo; "Copiar bloque" es exactamente lo que necesita alguien con secciones.
- **No es intuitivo 🟡:** no hay indicación de qué pasa si el bloque no cubre una hora completa o si "Fin" es anterior a "Inicio" (probado: al guardar, la app no protesta porque las horas son válidas, pero **no valida solapamientos**).
- **Microinteracción ✔:** al guardar, toast **"Horario guardado"** y el modal "Tu horario" se actualiza en vivo a "2 clases a la semana" con la nueva línea "Ayudantía mié 10:00–11:30".

### Vista semanal con dos clases: **colisión sin aviso** 🟠 (reproducir)
1. Ramo A con clase mié 09:00–10:30. 2. "Editar horario" → "Agregar" en otro ramo → mié 10:00–11:30 → "Guardar horario".
- **Resultado:** la app **acepta la superposición sin avisar**, y en "Semana completa" las dos tarjetas **se dibujan encima una de otra** (Farmacología cubre parcialmente Bases Químicas); no hay columnas lado a lado, ni borde rojo, ni mensaje del tipo "se empalma con Bases Químicas".
- **Qué siento:** el horario "queda bonito" pero está mal; recién cuando las tarjetas se montan noto el error, y ya lo guardé.
- **Qué cambiaría:** aviso al guardar ("Empalma con Bases Químicas (10:00–10:30)") y/o layout en dos columnas como Google Calendar.

### Otros detalles de la Agenda
- El día de hoy (Jue 26) viene **seleccionado por defecto** y en negro, con "Nada agendado para hoy." ✔ (mejor que un espacio vacío).
- Botones **"Semana anterior" / "Semana siguiente"** con flechas solas, **sin texto** 🟡 (el nombre accesible sí lo tienen).
- La etiqueta **"Lun23", "Mar24"…** se lee sin espacio en el árbol de accesibilidad (visualmente el salto de línea lo separa; igual conviene separar con un `·` o espacio real).
- **"4 ramos sin horario · Completar"** sigue abajo como recordatorio ✔ (baja de 5 a 4 al agregar Farmacología, dato vivo).
- El botón **"Calendario"** (esquina) repite su tooltip "Agregar evaluaciones al calendario" ✔, y su diálogo sigue expuesto como `dialog "Ventana"` 🟡 (hallazgo 38).

---

## 41. Perfil → Tu semestre → "Calendario": diálogo "Conecta GradeHub y tu calendario" (abierto, descrito y **cerrado**; no conecté nada) — https://gradehub.cl/ (pestaña única, la URL no cambia)

- Al tocar "Calendario" en Perfil, **la app me lleva a la pantalla Agenda** y abre arriba el diálogo `Conecta GradeHub y tu calendario`.
- Texto exacto: **"Todavía no tienes fechas. Tráelas desde tu calendario."** · eyebrow **"IMPORTAR ARCHIVO .ICS"** · **"Desde Apple, Google u Outlook. Revisas cada fecha antes de agregarla."** · botones **"Importar fechas"** y **"Cerrar"**.
- **Qué veo:** un diálogo limpio, dos botones apilados (el de importar arriba, secundario con borde; "Cerrar" gris abajo).
- **Qué siento:** la promesa de "revisas cada fecha antes de agregarla" tranquiliza ✔; pero "Todavía no tienes fechas" **contradice** lo que acabo de ver: tengo 6 ramos con notas y un horario con clases. Lo que no tengo son *fechas de evaluaciones* — la app debiera decirlo con esas palabras.
- **Bug de redacción 🟠:** mensaje genérico-incorrecto. Reproduce: crear semestre con ramos y notas (sin fechas) → Perfil → Calendario → "Todavía no tienes fechas", aunque el ramo y el horario existen.
- **No es intuitivo 🟡:** **"Importar archivo .ics"** — "ICS" es jerga; un estudiante no técnico no sabe qué es un ".ics" ni cómo lo consigue. Falta "Exporta tu calendario desde la web de tu universidad" o un link de ayuda.
- **Jerarquía 🟡:** el botón **primario** ("Importar fechas", la acción que la app quiere que hagas) se ve secundario (borde, fondo blanco) y **"Cerrar"**, que es salirse, es la pastilla gris más pesada. Inversión de jerarquía visual.
- **Familiaridad:** el flujo (importar .ics / conectar Apple, Google, Outlook) es el patrón esperado de Google Calendar ✔, y el hecho de que la app **no pida OAuth** sino un archivo es coherente con el límite de "no conectar cuentas externas": lo cerré sin importar.

## 42. Constancia: funciones del encargo que **no existen** en la app (buscado en toda la app)
Búsquedas de texto sobre el DOM completo de la SPA (todas las pantallas quedan montadas), con `findText`, todas **"No matches found"**:
- **"tutor"** → no hay avisos de tutores ni pantalla de tutores.
- **"unirse" / "únete" / "unete"** → no existe "unirse a clases" ni crear/unirse a una clase compartida.
- **"aviso"** → no hay bandeja ni centro de avisos/notificaciones.
- **"feedback" / "opinar"** → no hay encuestas de feedback.
- Sí existe el equivalente de feedback: **Sugerencias y comentarios** (probado y cancelado) y **Calificar** (probado y cancelado), y el directorio de apoyo con **"Denunciar este perfil"** y **"Bloquear a MentorIA"** (probados y cancelados).
- Conclusión para el fundador: no hay riesgo de que un usuario nuevo publique algo que vean otros desde estas secciones porque **no están construidas**; los únicos caminos de publicación son Calificar, Sugerencias y compartir pauta al consenso.

---

## 43. Limitación técnica de la auditoría: **no se pudo probar el ancho más angosto** 🔴 (del propio entorno de prueba, no de GradeHub)
- Intentos (todos sin efecto en el render, verificado con captura antes/después): `ctrl+plus` (tecla no soportada), `F12` (no soportada), `ctrl+equal` (sin cambio), `ctrl+minus` (sin cambio). La API de navegador de esta auditoría no permite redimensionar la ventana ni aplicar zoom, y la app es una SPA a pantalla completa sin control propio de "vista previa móvil".
- Lo que **sí** se observó de comportamiento responsive: el DOM ya trae montada una **`bottom-nav`** (Inicio · Agenda · Estadísticas · Perfil) que convive con el sidebar izquierdo, y varios diálogos se exponen con rol `dialog "Ventana"`; es decir, la app contempla un layout angosto, pero **no se pudo verificar visualmente** (corte del sidebar, toque de 44 px, solapamiento de tarjetas ni scroll horizontal).
- Recomendación: repetir esa parte con DevTools device-toolbar o en un teléfono real. Queda como **única sección no verificada** del encargo.

## 44. Diseño visual y familiaridad (consolidado de las 41 pantallas)
**Jerarquía.** Muy buena en Inicio: saludo → "PROMEDIO GENERAL" en eyebrow → número gigante (4,8) → delta → contexto → ramos. El promedio se entiende en un segundo. Se pierde jerarquía en (a) los diálogos donde el botón primario se ve secundario ("Importar fechas" vs "Cerrar", "Usar ponderaciones" en rojo), (b) fichas de ramo donde el eyebrow de estado ("Sin notas" / "Agrega evaluaciones para comenzar…") queda viejo y compite con el dato real, y (c) Estadísticas, donde el gráfico y sus controles ("Semana / Mes / Semestre", "Ver línea de tiempo") pesan lo mismo que el promedio.
**Tipografía.** Una sola familia, bien escalada; los números grandes con coma decimal son un acierto chileno ✔. Debilidades: textos de ayuda en gris muy claro sobre blanco (contraste justo, ej. "Desde Apple, Google u Outlook…", "Cuánto sube o baja cada ramo tu 4,8"), etiquetas pegadas ("Lun23", "Sala(opcional)", "↓ 0,73vs. 2026-1" en el árbol), y **dos precisiones numéricas distintas** conviviendo (4,8 en todo lado vs 4,77 en el simulador).
**Colores.** Sistema de testigo por ramo (borde izquierdo) muy útil para escanear ✔; verde/rojo para notas bien usado (3,9 en rojo, "Aprobado" en verde). Problemas: (a) los **puntos de color por ramo del simulador se leen como semáforo** de rendimiento cuando solo identifican el ramo; (b) el **rojo destructivo aplicado a un botón de confirmación** ("Usar ponderaciones"); (c) el rojo de "5 en riesgo" con datos equivocados asusta sin razón; (d) en el gráfico, ejes y líneas de referencia en gris casi invisible.
**Espaciado.** Consistente y generoso en Inicio y Perfil; apretado en la ficha de ramo (eyebrow, título y botones en pocas líneas) y en el modal de horario (labels "Sala(opcional)").
**Consistencia de componentes.** Botones negros full-width = confirmar, pastilla gris = secundario, link verde = acción navegable: lenguaje claro y mayormente respetado. Excepciones: el rojo mencionado, "Manual" y "Calendario" como botones de borde sin texto de apoyo, y el mismo concepto "Ventana" rotulado distinto en cada diálogo.
**Íconos.** Varios sin texto: flechas "‹ ›" de semana, el wrench/llave de "Herramientas", el "×"/"⋯", la flecha "›" de tarjeta. Tienen nombre accesible ✔ pero para un usuario poco técnico un ícono solo es una apuesta. Los chips de día y el switch sí están bien resueltos.
**Microinteracciones.** Buenas: toasts ("Ramo agregado", "Horario guardado"), píldora viva "Promedio general 4,8 → 4,8" al anotar, transiciones de modales, el delta que se recalcula. Fallan: *layout shift* cuando aparece "Volver al real" en el simulador, el `<select>` de "Copiar de otro ramo" que se autorresetea, y el cuelgue de "Ofrecer clases o material" en "Revisando tu acceso…".
**Estados de carga.** "Revisando tu acceso…" es el único estado de carga visible y **se queda colgado** sin timeout ni mensaje de error 🔴; el resto de las pantallas no muestra skeletons ni spinners, lo que en una conexión lenta de campus se sentirá como "no pasó nada".
**Legibilidad / accesibilidad.** Contraste correcto en texto grande, flojo en ayudas; el desglose de ponderaciones sugeridas no está marcado como tabla; el buscador de ramos no se puede limpiar; "Ventana" como nombre de diálogo; foco inicial en "Continuar" dentro del diálogo de eliminar cuenta.
**Familiaridad.** Los patrones son los que un estudiante ya conoce: tarjeta de resumen tipo banco (promedio, delta, historial), agenda tipo Google Calendar, listas de ajustes tipo iOS (Perfil con secciones TU SEMESTRE / HERRAMIENTAS / LA APP / TU CUENTA), onboarding de una pregunta por pantalla tipo Duolingo/Notion, y "copiar de otro ramo"/"copiar pauta" como atajo social. Lo menos familiar: "PROMEDIO GENERAL" vs "promedio ponderado por créditos" (dos modelos en la misma pantalla), el consenso de pautas ("Reportada por 1 estudiante, sin confirmar"), y el vocabulario "malla" / "fuera de malla" cuando la app no tiene la malla de mi carrera.

## 45. Top 10 problemas por gravedad
1. 🔴 **Inicio miente del todo:** dice **"1 aprobado · 5 en riesgo"** cuando las 6 fichas dicen "✓ Aprobado" y el promedio es 4,8. Es el dato más visible de la app. *(Reproduce: semestre 2026-2 con 6 ramos al 100 % y notas ≥4,0; volver a Inicio.)*
2. 🔴 **"Ofrecer clases o material" cuelga en "Revisando tu acceso…"** sin timeout, error ni salida; hay que abandonar la pantalla.
3. 🔴 **No existe la Universidad de Concepción** y no hay buscador ni campo libre (solo UChile, UC, UAI, UANDES, UDD). Un usuario regional se queda fuera en el paso 2 del onboarding; aquí tuve que elegir UDD y anotarlo.
4. 🔴 **La cuenta queda sin "créditos" para casi todos los ramos** y el promedio se calcula "simple", con un aviso largo que aparece en Inicio y no se resuelve desde ahí; el flujo de alta de ramos no pide créditos.
5. 🟠 **Agregar ramos de una malla inexistente devuelve ramos ajenos** (Diseño, Arquitectura) marcados "fuera de malla": datos equivocados para Enfermería.
6. 🟠 **"Última nota" de Inicio queda staled:** sigue mostrando "Examen final · Farmacología · 4,5" después de anotar más tarde Pensamiento Crítico.
7. 🟠 **Botón rojo destructivo para confirmar:** "Usar ponderaciones" en rojo, y en "Armar mis ponderaciones" el `<select>` de "Copiar de otro ramo" se autorreseta y su opción no es clicable.
8. 🟠 **Horario permite empalmar clases sin avisar** y las tarjetas se dibujan encimadas en "Semana completa" (Bases Químicas 09:00–10:30 vs Farmacología 10:00–11:30).
9. 🟠 **"Todavía no tienes fechas" en el diálogo de calendario** aunque el semestre tiene ramos, horario y notas; y el diálogo "Ventana" no se puede limpiar de su buscador en el directorio de apoyo.
10. 🟡 **Fricciones menores pero visibles:** Eyebrow "Agrega evaluaciones para comienza… / Sin notas" que no se actualiza al guardar pauta; precisión 4,77 vs 4,8; eje X del gráfico con "26 nov" en ambos extremos; etiquetas "Sala(opcional)" y "Lun23" sin espacio; hora nativa en "10:00 AM" pese a "Horas de Chile"; chips del directorio que no actualizan el heading "Todos" y "Ver los 12 ramos" que repite siglas dejando "+6"; el buscador de Ajustes solo coincide con títulos; diálogo de eliminar cuenta abre con foco en "Continuar".

## 46. Qué está muy bien
- El **flujo de notas por teclado**: Return activa "+ Nota", se tipea la nota, Return guarda y salta al siguiente campo; la píldora "Promedio general 4,8 → 4,8" enseña la consecuencia al instante. Es lo mejor de la app.
- **"Qué necesito para aprobar" / Calculadora de nota** y **"Simular el semestre completo"** (con "No se guarda" y "Volver al real"): traducen la fórmula a una pregunta de estudiante.
- **Lenguaje mayormente chileno y sin anglicismos**, coma decimal, "ramos", "pauta", "ayudantía", "semestre", y explicaciones de una línea bajo cada cifra.
- **Coping del consenso**: "Reportada por 1 estudiante, sin confirmar" es honesto sobre la incertidumbre (aunque haya que marcarlo mejor visualmente).
- **Perfil tipo ajustes de iOS**, toasts que confirman, "4 ramos sin horario · Completar" como recordatorio vivo, y avisos de riesgo antes de acciones irreversibles.
- **Nada de pagos ni muros**: todo lo probado es usable sin tarjeta.

## 47. ¿Qué tan bien funciona para una carrera no-ingeniería?
**Medio, con la base buena.** El cálculo, el simulador y la agenda son agnósticos de carrera y funcionan igual para Enfermería o Derecho. Lo que empuja al usuario de humanidades/salida a afuera: (1) **no está su universidad** (UdeC ausente); (2) si la estuviera, **no hay mallas de salud/humanidades**, y el buscador de ramos devuelve ramos de Diseño/Arquitectura "fuera de malla"; (3) el **crédaje** (créditos UC vs créditos SCT/FIC de salud) no se explica ni se pide al crear el ramo; (4) el **apoyo** sugerido (MentorIA, siglas MAT/EAA/ECM, "Cálculo") está tarjeteado hacia ingeniería. Con 6 ramos creados a mano, pautas copiadas y notas completas, la app **sí** acompañó todo el semestre de un estudiante de Enfermería; el problema no es el motor, es la cobertura de datos y el vocabulario.

## 48. Veredicto
GradeHub se siente hecho por estudiantes chilenos y para estudiantes chilenos: claro, rápido, honesto en el lenguaje y con dos funciones (qué necesito para aprobar y simular el semestre) que ninguna hoja de cálculo reemplaza bien. Un alumno técnico lo adopta en una tarde. Pero hoy **la primera milla está rota para quien no es de las cinco universidades cargadas ni de ingeniería** (onboarding sin universidad, mallas que no existen, créditos sin explicar), y **la pantalla más vista miente** ("1 aprobado · 5 en riesgo" sobre un semestre aprobado) mientras el simulador y el horario guardan errores silenciosos (4,77 vs 4,8, clases empalmadas). Prioridad 1: corregir el conteño de estado de Inicio, el cuelgue de "Revisando tu acceso…" y la ausencia de universidad/malla; prioridad 2: créditos, jerarquía de botones y precisión numérica. Con eso, la app pasa de "buena idea bien dibujada" a "la app que un estudiante instala en febrero y no desinstala". **Recomendado, con correcciones previas al lanzamiento fuera de la UChile/UC.**
