# Auditoría UX GradeHub (gradehub.cl, producción) — cuenta 2: "Valentina Prueba"

Fecha: 2026-11-26 (America/Santiago). Navegador: sesión nueva, sin cuenta previa logueada (no fue necesario cerrar sesión).

## 1. Pantalla inicial / login-registro (https://gradehub.cl/)
- Título de pestaña: "GradeHub — Tu promedio universitario, claro y al instante".
- La app abre **directamente en modo "Crear cuenta"** (aparece el campo "REPETIR CONTRASEÑA" y el botón "Crear cuenta"), no en login. El botón alterno dice "¿Ya tienes cuenta? Inicia sesión".
- Copy: heading "Mejor que tu Excel." / "Guarda tus notas y revísalas desde cualquier dispositivo."
- Bloque "GradeHub en números": al cargar muestra placeholders **"–ESTUDIANTES / –RAMOS / –NOTAS"** y segundos después se animan a 2.222 ESTUDIANTES / 9.178 RAMOS / 39.025 NOTAS.
- Botones "Continuar con Apple" (btn-apple) y "Continuar con Google" (btn-google), separador "o con tu correo".
- Campos: CORREO ELECTRÓNICO (auth-user), CONTRASEÑA (auth-pass) con botón "Mostrar contraseña", REPETIR CONTRASEÑA (auth-pass2) con botón "Mostrar contraseña". Botón "Crear cuenta" (auth-btn).
- Legal: "Al continuar aceptas los términos y la privacidad, y declaras tener 14 años o más."
- Footer: Preguntas frecuentes, Calculadora de notas, Términos de uso, Privacidad y botón "Soy profesor particular".
- No hay campo de nombre en el registro: el nombre se pide (o no) más adelante.

### Validaciones probadas (texto exacto, en contenedor role=alert id="auth-error")
| Prueba | Resultado |
|---|---|
| Correo "valentina.correo" (sin @) + contraseña "aaaa" | `Ingresa un correo electrónico válido.` |
| Correo válido + contraseña "123" (3 caracteres) | `La contraseña debe tener al menos 8 caracteres.` |
| Correo válido + contraseña "12345678" (solo números) | `La contraseña debe incluir al menos una letra y un número.` |
| Contraseña "abcde123" y repetir "abcde124" | `Las contraseñas no coinciden.` |

Reglas inferidas del formulario: ≥8 caracteres, al menos una letra y un número, y coincidencia con "Repetir contraseña". No se muestran reglas ni medidor de fuerza antes de intentar enviar.

### Creación de cuenta
- Al pulsar "Crear cuenta" el botón pasa a **"Cargando…"** (deshabilitado) y luego entra directo al onboarding, sin email de verificación.

## Onboarding (4 pasos, barra de progreso)
**PASO 1 DE 4 — "¿Cómo te llamas?"** ("Tu nombre aparece en el saludo de inicio.")
- Campos NOMBRE (ob-name) y APELLIDO (ob-apellido) + "AÑO DE INGRESO A LA UNIVERSIDAD" en un **selector tipo ruleta** (stepper con botones Anterior/Siguiente y chevrones arriba/abajo).
- La ruleta no acepta el año escrito: `setValue` no la cambia; hay que pulsar "Siguiente" una vez por año. Sin teclado ni campo numérico → para volver de 2026 a 2024 son 2 clics, pero para alguien que entró en 2019 serían 7.
- Al elegir año aparece el status `Vas en tu 6.º semestre.` con botón **"Cambiar"** (no se puede editar el semestre directamente, solo recalcular por año).
- **Bug de etiqueta:** en el paso 1 el botón de retroceso se llama **"Cerrar sesión"** (ob-back). En los pasos 2-4 pasa a "Atrás". En el paso 1 "Cerrar sesión" es lo único razonable, pero da susto: uno espera "Atrás" o una X.
- "Continuar" parte deshabilitado, sin decir qué falta.

**PASO 2 DE 4 — "Valentina, ¿cuál es tu universidad?"** ("Así te mostramos los ramos de tu universidad.")
- Grilla con solo 5 botones: Universidad de Chile, Pontificia Universidad Católica, Universidad Adolfo Ibáñez, Universidad de los Andes, Universidad del Desarrollo.
- **No hay buscador ni campo libre para la universidad.** Si tu U no está (USACH, PUCV, UCN, UdeC…), no hay salida visible: la auditoría no pudo elegir USACH. Se necesita agregar universidades o permitir escritura libre como con las carreras.

**PASO 3 DE 4 — "¿Qué estudias?"** ("Busca tu carrera. Si no aparece, puedes escribirla.")
- Para Universidad de Chile la grilla trae **solo 3 carreras**: Ingeniería Comercial, Ingeniería en Información y Control de Gestión, Contador Auditor. No está Derecho (real de la U. de Chile), ni Medicina, ni Psicología.
- El buscador (ob-carrera-buscar) filtra y, si no hay match, muestra el botón **"Usar «Derecho»"** (buena solución de escape). Se seleccionó Derecho por esa vía.
- Bug menor: al cambiar el texto, el botón se renombra pero **el foco no se mueve** y no hay estado "0 resultados" claro; sólo la lista desaparece.

**PASO 4 DE 4 — "Elige tus ramos"**
- Mensaje contextual correcto: **"Aún no tenemos una malla verificada para Derecho. Busca tus ramos o agrégalos a mano."** (la app sí se adapta a carreras sin datos).
- Sección "TU SEMESTRE" vacía al inicio (buen estado vacío, aunque sin ilustración ni texto de ayuda hasta que se agrega algo).
- "BUSCAR OTRO RAMO" (ob-course-search, placeholder "Ej.: Inglés IV, Cálculo II"). Con un texto sin match aparece "No aparece en tu malla. Puedes agregarlo a mano."; con "zzzz" no aparece esa ayuda (inconsistente).
- Botón "¿No aparece? Agregar un ramo a mano" (ob-manual-name, placeholder "Ej.: Electivo de cine") + "Agregar".
  - **Bug/UX:** tras "Agregar" el formulario manual **se cierra solo**, así que agregar 3 ramos a mano son 6 clicos y volver a abrir el formulario cada vez. El primer render del formulario a veces no aparece (hubo que releer la página).
  - El ramo agregado queda marcado con el checkbox en **true** automáticamente (bien).
  - **Bug de textos largos:** un ramo de 95 caracteres ("Taller de redacción jurídica avanzada y argumentación ante tribunales superiores de justicia") se **corta sin puntos suspensivos** a "…ante tribunales superiores" y ese recorte hasta figura en el nombre accesible del checkbox. Se pierde "de justicia" sin aviso.
- Botón final "Continuar sin ramos" → "Continuar con 1 ramo" → "Continuar con 2 ramos" (excelente: el botón dice el estado).

## Pantalla de Inicio (home) tras el onboarding
- Saludo: `Así va tu semestre,Valentina` — **falta un espacio** entre la coma y el nombre.
- Tarjeta PROMEDIO GENERAL muestra `·` suelto y el subtítulo **"2026-22 ramos"**: es "2026-2" (semestre) pegado a "2 ramos". **Bug de separación/lectura**, parece un promedio mal formado.
- "Abre un ramo para ingresar tu primera nota." y chip "2 pendientes" (correcto y útil).
- "Mis ramos" con botón "Agregar ramo" y menú "Ordenar ramos. Ahora: Manual". Cada ramo tiene un botón "Mantén presionado para mover …" (drag & drop por long-press, anunciado a lectores de pantalla: bien).
- Estado vacío por ramo: "Sin evaluaciones".
- Bloque promo "APOYO — ¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos. Explorar apoyo".
- Botón "Simular el semestre completo" (sim-global-btn) en la home: a primera vista no deja claro si guarda datos o es una simulación.
- Footer: "Por estudiantes, para estudiantes. GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval" (también sin espacio tras el punto).
- Modal automática al entrar: diálogo "Ahora, las evaluaciones / 2 ramos agregados / Agrega las evaluaciones y sus porcentajes en cada ramo." con botón "Ver mis ramos". **No tiene botón de cerrar (X)**: solo el botón de acción.
- Navegación inferior: Inicio / Agenda / Estadísticas / Perfil.
- Estados vacíos de Agenda ("Agrega tus evaluaciones / Registra tus pruebas, entregas y exámenes para organizarlos acá." + botón "Agregar evaluación") y Estadísticas ("Parte con tu primera nota / 2 ramos y 0 evaluaciones configuradas. Ingresa una nota para ver cuánto necesitas." / Historial: "Agrega tus semestres anteriores para que cuenten en tu promedio de carrera." + "+ Semestre anterior"). Muy buenos textos de estado vacío.

## Ficha del ramo sin pauta ("Introducción al Derecho Civil")
- Al abrir un ramo recién creado: "Agrega evaluaciones para comenzar" / "Sin notas" / estado vacío "Sin evaluaciones — Agrega tus pruebas, controles o tareas con su porcentaje del ramo. Puedes incluir la fecha para que aparezcan en la Agenda." + botón "Agregar evaluaciones". Buena ayuda, clara y en buen español.
- Sección "Horario" con "Agregar bloque" y texto "Agrega los días y las horas de tus clases."

### Modal "Armar mis ponderaciones"
- Copy: "Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas." Contador vivo **"0 / 100% · faltan 100%"** con barra de progreso → muy bien.
- Botón **"Usar 100%"** que luego se vuelve **"Usar 70%"** (el resto): excelente atajo.
- Cada fila: combo "Nombre de la evaluación" (accepts custom), campo de peso con sufijo "%", menú "…" (Opciones de …) y "Reglas de esta evaluación" con: **Nota mínima**, **Tope de la nota final**, explicación "Si quedas bajo el mínimo, tu nota final no supera este tope. Deja ambos campos vacíos si no aplica.", **Puntaje total, si te la entregan en puntos**, **Exigencia (%)** y "Con puntaje total anotas los puntos que sacaste y te los pasamos a nota. Sin exigencia usamos la del ramo." (cubre exámenes reprobatorios / tope 3,0 o 4,0 tipo UC/UChile).
- **"Requisitos que combinan evaluaciones"**: "Para cuando el programa exige un mínimo sobre varias evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba." + "Agregar requisito".
- **"Eximición del examen"**: checkbox "El programa permite eximirse del examen" → despleiega Examen (select), "Tu nota de presentación es el promedio ponderado de:" (checkboxes por evaluación con su peso), "Presentación mínima para eximirte" (default 5,0), "Mínimo en una evaluación", "Asistencia mínima (%), si la piden" y la explicación "Si cumples, lo confirmas en la ficha del ramo. El examen deja de contar y tu nota final es el promedio de las demás evaluaciones. La presentación se aproxima a la décima." — nivel de detalle muy bueno.
- **Bugs / roces encontrados aquí:**
  1. 🟠 Al tocar "Agregar evaluación" se **colapsan los "Reglas de esta evaluación" / "Requisitos…" que uno ya había abierto** en las filas anteriores (el foco y el trabajo hechos se pierden de vista).
  2. 🟠 Accesibilidad: la fila 1 toma label "Peso de Prueba 1" pero la fila recién creada mantiene el label genérico **"Peso de evaluación"** (etiqueta no sincronizada con el nombre).
  3. 🟠 El diálogo no expone su título como nombre accesible en varias lecturas (`dialog` sin nombre): un lector de pantalla no anuncia "Armar mis ponderaciones".
  4. 🟡 El mensaje de validación **"Elige de qué evaluación te eximes."** aparece arriba de todo el listado, lejos del select "Examen" (aunque el foco sí salta al select).
  5. 🟡 Si se activa eximición y no se elige examen, no hay ninguna marca visual en el select hasta que se presiona Guardar.

### Guardar pesos que NO suman 100 %
- Con Prueba 1 30 % + Tarea 1 25 % (=55 %) y eximición desactivada, **Guardar funciona**: toast **"Guardado · puedes completar el resto después"** y la ficha muestra el banner ámbar **"Las evaluaciones suman 55% — ajústalas para que sumen 100%"** y arriba **"55% ponderado"**. Correcto y honesto.
- Pero el chip del hero pasa a **"Va aprobando · falta 0%"**, que con 45 % del ramo sin ponderar es engañoso: sugiere que no falta nada cuando falta casi la mitad del ramo. 🟠

### Anotar / editar notas (casos borde)
- El botón "+ Nota" se convierte en un **campo en línea** (label "Anotar nota de Prueba 1"); al guardar, pasa a "Nota de Prueba 1" editable → editar es directo, buen diseño.
- **Coma chilena**: "5,5" se acepta y muestra 5,5. ✅
- **Punto**: "6.5" se acepta y se normaliza a "6,5". ✅ (no avisa la normalización, pero no rompe)
- **Extremos**: 1,0 y 7,0 se aceptan. Con 1,0 el chip pasa a **"Ya no es posible aprobar"** y el toast "Vas 1,0 · ya no alcanza sólo con lo pendiente". Con 7,0: "Va aprobando · falta 0%" / "Vas 7,0 · tienes margen para aprobar".
- **Fuera de rango**: 0,5 → toast **"No se cambió la nota: revisa el rango y el formato. Ej: 5,5."** y el campo vuelve al valor anterior (7,0). 7,5 y "siete" también rechazados (mismo toast).
- 🟠 El error solo vive en el toast (status) y **el campo revierte en silencio** a la nota anterior: no hay resaltado ni mensaje junto al campo, y el toast tarda mucho en desaparecer.
- 🟡 Botón "Simular" dentro del ramo y "Simular el semestre completo" en la home: el nombre no aclara que no guarda nada / que es un escenario hipotético.
- 🔴 **Bug de estado**: tras cargar evaluaciones y nota, la home sigue mostrando el ramo como **"Sin evaluaciones"** y "Abre un ramo para ingresar tu primera nota" / "2 pendientes", aunque la ficha ya muestra 7,0. La home no se refresca.
- 🔴 Bug de redacción en la home: subtítulo del promedio **"2026-22 ramos"** (semestre "2026-2" pegado a "2 ramos") y saludo "Así va tu semestre,Valentina" sin espacio.
- Tras guardar la pauta aparece el modal **"Tus ponderaciones ayudan a tus compañeros"**: "Tus programas se suman en forma anónima para ayudar a tus compañeros. Nunca se comparten tus notas. Puedes desactivarlo en Ajustes." con un único botón **"Entendido"** → **no hay forma de rechazar ahí mismo** (consentimiento por omisión). Se hizo clic en Entendido para continuar y se verificó/desactivó el compartimiento en Ajustes. (Auditoría: no publicar datos.)

## Recargar a mitad de formulario
- Con el modal "Editar ramo" abierto y CRÉDITOS/SECCIÓN escritos, al recargar (F5) **el modal se cierra y lo escrito se pierde sin aviso**; la app además **vuelve a Inicio** (no recuerda que estabas en un ramo). Los datos ya guardados sí persisten (nota 7,0, ramo, pauta).
- 🟠 No hay confirmación "¿Descartar cambios?" ni autoguardado de borradores.

## Botón atrás del navegador / rutas
- La app es una SPA **sin rutas**: la URL sigue siendo `https://gradehub.cl/` aunque uno esté en Perfil, Estadísticas, un ramo o un modal. El botón atrás del navegador **saca al usuario de GradeHub** en vez de volver a la pantalla anterior. 🟠 (No hay deep links para compartir ni "volver al ramo".)

## Ficha "Editar ramo"
- Campos: NOMBRE DEL RAMO, **CRÉDITOS (SCT)**, SECCIÓN, PROFESOR, checkbox "Llevar la cuenta de mis faltas (aparece en la ficha del ramo)", COLOR, Cancelar / Guardar.
- Botón de profesor deshabilitado con el texto concatenado **"Sin profesor Agrega y guarda la sección para calificar"**: no queda claro que hay que poner la sección para poder calificar. 🟡
- Mérito útil: si el ramo no tiene créditos, la home avisa **"Promedio simple porque falta el crédito de Introducción al Derecho Civil. Si lo pones en Editar ramo, se calcula ponderado por créditos."** (excelente explicación).

## Menú "Opciones del ramo" (⋯)
- Items: **Editar ramo / Editar evaluaciones / Eliminar ramo**.
- Menú con role=menu/menuitem correcto. No se ve (ni en el menú ni en la ficha) una forma de **archivar** un ramo individual.

## Pantalla Perfil
- Cabecera: Valentina / Derecho / UChile · 6.º semestre / gpruebahark2@prueba.cl (bien). El nombre accesible del botón concatena **"ValentinaDerechoUChile · 6.º semestregpruebahark2@prueba.cl"** sin espacios. 🟡
- Secciones TU SEMESTRE (Universidad y carrera, Calendario, Canvas, Archivar semestre), HERRAMIENTAS (Calculadora de nota, Subir foto de tu horario), LA APP (Apariencia, Agentes conectados, Sugerencias y comentarios), TU CUENTA (Datos y cuenta, Ofrecer clases o material) y "Cerrar sesión".

## Ajustes ("Datos y cuenta")
- Buscador "Buscar en Ajustes" + lista de secciones (muy bien).
- Exportar mis datos / Importar datos.
- **Switch "Compartir mis ponderaciones en forma anónima" venía encendido (Value 1)** tras pulsar solo "Entendido" en el modal → se audita y **se apaga** para no publicar nada. El texto explica bien: "Se comparten los nombres y porcentajes de las evaluaciones, nunca tus notas. Al apagarlo dejas de aportar nuevas ponderaciones; lo ya aportado se conserva en el consenso anónimo y agregado."
  - 🔴 Consentimiento por omisión + modal sin botón de rechazo.
- **Switch "Usar mis notas para elegir anuncios" también encendido por defecto** (aunque aclara que el cálculo es local). 🟠
- "COMPARTIDO CON PROFESORES: No compartes tus notas con ningún profesor." + PROFESORES BLOQUEADOS + contacto gradehub.app@gmail.com.
- ZONA SENSIBLE: "Eliminar mi cuenta" y "Reiniciar app" con advertencias claras. (No se tocaron.)

## Sugerencias y comentarios (feedback) — abierto hasta el último paso y cancelado
- TIPO DE COMENTARIO: "Tengo una sugerencia / Encontré un problema / Otro comentario". CUÉNTANOS con contador y validación en vivo: con 2 caracteres → **"Mínimo 3 caracteres · te falta 1 carácter para enviarlo.2 / 2000"** (concatenación sin espacio). Con texto válido: "Queda asociado a tu cuenta para poder ayudarte.101 / 2000".
- Botón "Enviar comentario" y alternativa por correo (mailto). **No se envió** (se cerró con "Cerrar").
- 🟡 El diálogo de Ajustes tiene "Cerrar" y la pantalla Perfil tiene "Cerrar sesión": al buscar "Cerrar" hay dos destinos distintos, y el foco inicial del modal no siempre cae en "Cerrar".

## Cierre / archivo de semestre ("Archivar 2026-2")
- Diálogo "Archivar 2026-2": "Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo." Por ramo muestra "Falta: Tarea 1" / "Falta: Revisa las ponderaciones y las notas de este ramo", botón "Completar evaluaciones" y campo **"Nota final oficial del portal de tu universidad"** (texto visible concatenado "Nota final oficialdel portal de tu universidad").
- Se puso 2,0 (reprobado) y 5,5 y se pulsó "Archivar semestre": archivó **sin confirmación adicional** y sin toast de éxito.
- Después de archivar (antes de recargar) quedan **datos fantasma**: Estadísticas sigue mostrando "Sem. 6 · 2026-2" con 7,0, "Tus prioridades hoy" y el rango 4,3–7,0, y la Agenda sigue listando "Tarea 1" y "Prueba 1" del ramo archivado. 🟠 Tras recargar, la Agenda sí queda vacía.
- Tras recargar: Historial muestra **"Promedio del historial: 3,8"** (2,0 y 5,5 → 3,75 ≈ 3,8, correcto) y "2026-2 · Sem. 6 · 2 ramos · 3,8"; al expandir, cada ramo con su nota final (2,0 en rojo). **No dice "Reprobado" ni "Aprobado" en ninguna parte**, solo color. 🟡
- 🟠 Tras archivar, **el semestre no avanza**: sigue diciendo "Semestre actual · 2026-2" (y Perfil "6.º semestre"), de modo que 2026-2 aparece a la vez como semestre actual vacío y en el Historial. En la home el bloque PROMEDIO GENERAL queda con un "·" suelto y sin etiqueta de período.
- Historial ofrece "Editar" y "Eliminar semestre" (no se pulsó Eliminar).

## Modal "Agregar ramo"
- Buscador con label "NOMBRE DEL RAMO · lo buscamos en la malla UChile" y resultados con "1° semestre · con programa +". Botones: "Subir foto de tu horario", "Cancelar", "Agregar ramo".
- Vacío → alerta: **"Escribe el nombre o la sigla del ramo para agregarlo."** (correcto).
- Ramo inexistente en la malla → **"No está en tu malla — lo agregamos como ramo tuyo."** y se agrega igual. Muy buen manejo.
- Toast **"Ramo agregado"** (bien). 🟡 El nodo `status` del toast queda en el DOM mucho rato (seguía diciendo "Ramo agregado" several minutos y decenas de interacciones después), por lo que un lector de pantalla puede volver a anunciarlo.
- Nombre muy largo ("Derecho procesal civil avanzado y recursos extraordinarios ante la Corte Suprema"): **wrapea bien en la tarjeta de la home y en la ficha** (sin elipsis ni corte). 👍
- 🟡 Home: "PROMEDIO GENERAL" queda con un **"·" suelto** cuando no hay promedio; y el subtítulo se lee **"2026-21 ramo"** (texto pegado, sin separador ni espacio).

## Ficha del ramo nuevo (estado vacío)
- "Agrega evaluaciones para comenzar" · "Sin notas" · bloque "Sin evaluaciones / Agrega tus pruebas, controles o tareas con su porcentaje del ramo…" + "Agregar evaluaciones". Bloque **Horario** con "Agregar bloque" y "Agrega los días y las horas de tus clases." Estados vacíos claros y redactados en lenguaje humano. 👍
- Menú ⋯ ("Opciones del ramo"): Editar ramo / Editar evaluaciones / **Eliminar ramo**.
- "Eliminar ramo" abre diálogo **"Eliminar «…nombre…»"** con "Se eliminarán todas las secciones y notas. Esta acción no se puede deshacer." y Cancelar/Eliminar (focus en Eliminar). 👍 Confirmación excelente.
- Tras Eliminar vuelve a Inicio y el estado vacío vuelve, **pero sin toast "Ramo eliminado"** (inconsistente con "Ramo agregado"). 🟡

## Calculadora de nota (menú Herramientas / Perfil)
- Campo PUNTAJE OBTENIDO / PUNTAJE TOTAL / EXIGENCIA (%) con default 50, "Más opciones de escala", "Tu nota", tabla "Tabla de puntaje a nota" e incremento De a 1 / 0,5 / otro.
- Con coma decimal funciona: 47,5 / 68 con 50 % → **"5,2"** y explicación **"Con 50 % de exigencia, el 4,0 está en 34,00 de 68,00 puntos."** 👍
- Puntaje 100 con total 68 → **"Tu puntaje no puede superar el total."** + "Corrige el dato marcado para ver tu nota." y "Tu nota" muestra "–". 👍
- "GUARDAR EN UN RAMO" (Solo calcular) y "EVALUACIÓN O CASILLA" deshabilitado con "Elige un ramo primero"; "Guardar como nota" deshabilitado. Claros.
- 🟡 La tabla es enorme (68 filas) y no está colapsada por defecto ni tiene tope/scroll; en móvil empuja todo el contenido.

## Apariencia
- Modo **Sistema / Claro / Oscuro** ("Se guarda al elegir."), COLOR DE ACENTO (Turquesa, Azul, Índigo, Violeta, Cobre, Frambuesa) y FONDO (Neutro, Pizarra, Papel). Radiogroups con nombre accesible. 👍
- Modo oscuro aplicado: contraste bueno, el modal y las tarjetas se ven correctos. Volví a Claro.

## Canvas (Ajustes → Canvas)
- Título "Fechas de **Canvas FEN**" con pasos 1-2 y campo "URL DE LA FUENTE DE CALENDARIO" + "Conectar calendario de calendario" ("Conectar calendario de Canvas"). Aviso de privacidad muy bueno: "Quien tenga esa URL ve tu calendario: la guardamos solo en este dispositivo y no la sincronizamos." 👍
- **No conecté nada** (límite). Con la URL vacía: **"Esa no es la URL de la fuente de calendario de Canvas FEN. Debe empezar con https://canvas.fen.uchile.cl/feeds/calendars/"**
- 🟠 Para una alumna de Derecho UChile el conector está atado a **canvas.fen.uchile.cl** (FEN = Economía y Negocios): no hay soporte genérico de Canvas LMS ni opción para otro dominio, así que el paso "Canvas" de su propio perfil no le sirve.

## Agentes conectados (solo mirado, no conectado)
- Explica permisos: "Ver tus ramos, notas y fechas, simular escenarios, agregar un ramo y proponerte ponderaciones que tú confirmas. No puede escribir tus notas ni borrar nada." 👍
- Paso 1 con mensaje listo para copiar, paso 2 nombre, paso 3 "Crear URL de conexión" ("Dura 90 días y se muestra una vez"), lista vacía "Todavía no tienes agentes conectados.", "Ideas para pedirle" con 3 prompts, "Ponderaciones por revisar / Ver propuestas". 👍
- 🟡 Bug de accesibilidad: el campo "2. PONLE UN NOMBRE A LA CONEXIÓN" toma como label los dos encabezados: **"1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO 2. PONLE UN NOMBRE A LA CONEXIÓN"**.
- 🟡 No se valida/oculta "Crear URL de conexión" si el nombre está vacío (no lo probé para no generar credenciales).

## Apoyo / "Ofrecer clases o material" (abierto y cancelado)
- Ajustes → **Apoyo**: "Ofrece clases, material o tu app. Si haces clases particulares, publica tus avisos acá. Tus notas no se muestran ni se usan en tu anuncio." + botón "Soy profesor particular" + "Revisamos cada postulación antes de que puedas publicar." 👍
- "Soy profesor particular" abre diálogo **"Postula para ofrecer clases"**: "Tu cuenta de estudiante sigue igual. Un miembro de nuestro equipo revisará tu postulación. Mientras esperas, podrás preparar un borrador de anuncio." Campos NOMBRE PÚBLICO y "QUÉ RAMOS ENSEÑAS Y QUÉ EXPERIENCIA TIENES" (required), "Nadie verá tus notas. Cada anuncio que prepares necesitará otra aprobación.", **Cancelar / Enviar postulación**.
- Se pulsó **Cancelar** (no se envió nada). 🟠 El diálogo no avisa que al cancelar se pierde lo escrito.
- 🟡 El ítem de Perfil dice "Ofrecer clases o material" pero la sección de Ajustes se llama "Apoyo": dos nombres para lo mismo.

## Información académica (Ajustes → Universidad y carrera / Información académica)
- UNIVERSIDAD: solo **UChile, UC, UAI, UANDES, UDD** (5 botones, sin buscador). Ayuda "Cambia tu catálogo disponible. Tus ramos y notas no se tocan." CARRERA con buscador + botón "Derecho". SEMESTRE DE CARRERA 1°–11° (ruleta/grid). "Guardar", "Ramos de mi malla", y "SEMESTRES QUE YA CURSASTE / Agrega los que cursaste antes de usar GradeHub, con la nota final de cada ramo" + "Agregar un semestre anterior". 👍
- Se cambió 6° → **7°** y se guardó: toast **"Cambios guardados"**, el modal se cierra y Perfil pasa a "UChile · 7.º semestre". 👍
- 🟠 El cambio de semestre **no crea ni avanza el semestre actual**: Estadísticas sigue en "Semestre actual · 2026-2" (el mismo período ya archivado en Historial). No hay "Iniciar 2027-1" ni forma de abrir un semestre nuevo.
- 🟠 **USACH no existe** en la lista, y para UChile solo 3 carreras cargadas (hay que escribir "Derecho" a mano). Un usuario de otra universidad no puede usar el catálogo (mallas, programas).

## Cerrar sesión
- Botón "Cerrar sesión" en Perfil: **cierra la sesión de inmediato, sin confirmación** y sin toast. Devuelve a la pantalla de acceso. 🟡
- 🟠 La pantalla de acceso **queda en modo "Crear cuenta"** (muestra REPETIR CONTRASEÑA y el botón "Crear cuenta"): un usuario que acaba de cerrar sesión tiene que tocar "¿No tienes cuenta? Crea una"… en realidad el toggle dice "¿Ya tienes cuenta? Inicia sesión", es decir hay que cambiar de modo en cada visita.
- 🟡 "GradeHub en números" aparece primero con **"— ESTUDIANTES / — RAMOS / — NOTAS"** y un segundo después carga 2.222 / 9.178 / 39.025; los tres números se leen pegados a su etiqueta ("2.222ESTUDIANTES").

## Recuperar contraseña (mirado, no completado)
- El link **"¿Olvidaste tu contraseña?"** **solo aparece en el modo "Inicia sesión"**, nunca en "Crear cuenta".
- Al tocarlo con el correo vacío, la app responde con la alerta: **"Escribe tu correo arriba y vuelve a tocar \"¿Olvidaste tu contraseña?\"."** (usa comillas y el verbo "tocar", lenguaje de celular, en pantalla de escritorio).
- 🟠 No hay pantalla/paso propio de recuperación ni indicación de qué va a pasar (correo, link, código): el flujo es "escribir correo y volver a tocar el mismo botón", sin feedback de envío. No se completó (límite de la auditoría y no se envían datos al correo).

## Volver a entrar / persistencia
- Se inició sesión con la cuenta guardada (gpruebahark2@prueba.cl). Botón pasa a **"Cargando…"** (deshabilitado) y aterriza en Inicio. 👍
- **Persisten** nombre (Valentina), universidad/carrera/semestre (UChile · 7.º semestre), el historial archivado ("Promedio del historial: 3,8", "2026-2 · Sem. 6 · 2 ramos · 3,8" con 2,0 y 5,5) y los ajustes (Apariencia, switch de ponderaciones apagado). 👍
- 🟡 No hay toast/mensaje "Sesión iniciada" ni indicador de carga de datos; la home aparece vacía ("Agrega tu primer ramo") aunque el historial sí tiene datos, porque el semestre actual quedó sin ramos tras archivar.

## Notas de accesibilidad generales (recuento)
- Textos concatenados sin separador en nombres accesibles y en pantalla: "Así va tu semestre,Valentina", "2026-21 ramo", "1 va aprobando1 pendiente", "Nota final oficialdel portal…", "Mínimo 3 caracteres · te falta 1 carácter para enviarlo.2 / 2000", "ValentinaDerechoUChile · 6.º semestregpruebahark2@prueba.cl", "Introducción al Derecho Civil2,0", "2.222ESTUDIANTES", label del campo de Agentes con dos encabezados.
- Bueno: roles menu/menuitem, dialog con nombre, radiogroups con nombre, campos con labels, estados vacíos redactados, "Mostrar contraseña", switch con estado, controles de rango del gráfico.
- Botón atrás del navegador: sale de la app (no hay hash/history routing) y recargar cierra modales perdiendo lo escrito.
