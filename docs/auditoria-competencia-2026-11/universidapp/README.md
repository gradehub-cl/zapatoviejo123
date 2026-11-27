# Auditoría UX de UniversidApp (universidapp.cl) — 26-nov-2026, 22:56 (America/Santiago)

Cuenta: cuenta real de estudiante UC con Canvas conectado. Login con Google vía Supabase Auth → redirige a https://universidapp.cl/inicio con sesión activa.
ID de sesión no visible. No se pagó nada, no se conectó Canvas, no se envió feedback.

## Pantalla 1 — Inicio (/inicio)

**Qué se ve**
- Sidebar izquierdo: logo "UniversidApp" + botón "Abrir barra lateral" (colapsable). Links: Inicio, Calendario,
  Aprender, Ramos. Al expandir Ramos aparece lista de cursos: Introduccion a la Programacion, Dinamica,
  Calculo II, Laboratorio de Dinamica, "Todos los cursos".
- Barra superior derecha: botón pop-up "Danos feedback"; chip de usuario "L [Nombre Apellido] / UC" (link a /yo).
- H1 "Buenas noches, [Nombre]"; subtítulo "Jueves, 26 de noviembre".
- Botón de campana: "Notificaciones, 1 sin leer" (luego renombra a "Por hacer, novedades y mensajes, 1 sin leer").
- Botón "Editar horario".
- Semana visual Lun23…Sáb28 con columna horaria 08–18+ y pastillas de evaluaciones:
  "Interrogación 2 · 23:59" (Cálculo II, azul), "Tarea 3 (T3)" (Intro a la Programación, rosado),
  "Tarea 2 · 23:59" (Lab de Cálculo II, verde).
- Sección "Para ti" (3 tarjetas con botones "Eliminar" y "Ahora no"):
  1) "Tarea 2 — Preparar prueba — Laboratorio de Cálculo II · Mañana, 23:59 — Próxima evaluación · Según tu Agenda", link "Preparar prueba de Tarea 2".
  2) "Examen de Calculo II es en 4 días y todavía no has estudiado ese ramo con el Tutor." + link "Estudiar" · "Prueba cerca · Según tu Agenda y tus sesiones".
  3) "Ya está publicado tu resultado. 13,9 de 18 puntos (I2). Canvas lo muestra en puntos, sin nota sobre 7." · "Nota publicada · Dinamica · Desde Canvas" + link "Ver nota".
- Sección "Pendientes": editor tipo Notion ("Escribe / para ver los tipos de línea", botón "Agregar una línea debajo",
  menú "Mover o abrir las opciones de la línea", drag & drop con DndLiveRegion) y panel "Guardados"
  ("Arrastra aquí un título para guardarlo, o elige «Guardar grupo» en el menú de la línea").

**Qué siento / pienso**
- Sensación: sobria, clara, buena jerarquía del saludo, paleta pastel agradable. Se siente "producto real", no demo.
- El día actual (Jue 26) sí está destacado, pero **no hay ninguna clase en la semana**: el horario está vacío y la
  parrilla 08–18 queda enorme y en blanco (estado vacío sin mensaje: no dice "no tienes clases este semestre"
  ni invita a agregarlas). Mucho espacio muerto.
- Las pastillas de evaluaciones aparecen arriba de la grilla, flotando en la fila 08 aunque su hora sea 23:59:
  **la posición no corresponde a la hora declarada** (bug de layout).
- "Para ti" es la mejor idea de la app (insight contextual cruzando Agenda + Canvas + uso del Tutor), pero las
  tarjetas mezclan 3 intenciones distintas (preparar, estudiar, ver nota) y los botones "Ahora no"/"Eliminar"
  son redundantes y sin diferencia explicada.

**Fricción / no intuitivo**
- El nombre del ramo se corta en la barra lateral: "Introduccion a la Progr…" (y "Dinamica", "Calculo II" sin
  tildes ni acentos: datos importados mal formateados desde Canvas: "Introduccion a la Programacion").
- "Editar horario" no dice qué edita (¿la vista semanal? ¿tus clases?).
- No hay CTA principal (todo es lectura). No hay "agregar ramo" visible en Inicio.
- Incrustar un editor de notas tipo Notion en el dashboard sin contexto de guardado/auto-guardado es confuso y
  compite con el foco de la app.

## Pantalla 2 — Ramos (/ramos?vista=portada)

- Encabezado "Ramos" + ícono de lupa (campo "Buscar en tus ramos"), selector "Semestre 2026-2, el de ahora.
  Cambiar" y botón "+" ("Agregar un ramo"). Grilla de tarjetas con cabecera de color + chip "2026-2",
  nombre, profesor y sigla: Introduccion a la Programacion (Cristian Ruz, IIC1103-11), Dinamica (FIS1514-13,
  sin profesor), Calculo II (MAT1620-2), Laboratorio de Dinamica (FIS0154-1), Principios Ecologicos y Medio
  (BIO143M-1), Revelacion y Fe (TTF012-1), Laboratorio de Cálculo II (MAT1620L). 7 ramos.
- Link "Ver todos los cursos" y botón fijo abajo "Traer cursos desde Canvas" (Help: "Canvas, conectado").
- Menú por ramo ("Opciones de Calculo II"): **Ver programa / Actualizar programa / Ajustes**.
- "Ver programa" abre en un **tab nuevo el PDF crudo desde Supabase Storage**
  (…/storage/v1/object/sign/syllabi/…/1794967968096-Clase_a_clase.pdf?token=[omitido]). No hay visor dentro de la app,
  ni nombre amigable, ni fecha de actualización.

**Sensación / problemas**
- Colores de cabecera asignados al azar y muy saturados (magenta, naranja, azul, verdes, violeta): rompen la
  sobriedad del resto y no comunican nada (no son color por facultad ni por elección).
- No hay ninguna métrica en la tarjeta: ni progreso (% evaluado), ni nota estimada, ni próxima evaluación.
  La portada de ramos es solo una lista de nombres → desaprovecha el dato que la app ya tiene.
- Nombres sin tildes ("Dinamica", "Calculo II", "Revelacion y Fe") importados de Canvas: descuido de limpieza.
- Abajo a la derecha/arriba queda un **spinner rojo de carga que permanece visible** en varias pantallas
  (esquina superior derecha) sin contenido asociado.

## Pantalla 3 — Rama por dentro (Calculo II) — pestañas Material / Anuncios / Tareas / Notas / Requisitos / Personas / Módulos

URL amigable pero con UUID: /ramos?ramo=b13e1d9f-…&tab=… (diffícil de compartir/recordar).

**Material**: radiogroup "Cómo ordenar tu material" → Amplia / Detallada / Del profesor (con descripción en Help,
buena idea), botón "Subir archivos" y carpetas "Clases 2 archivos", "Ejercicios 2", "Otros materiales 2",
"Tareas 9". Drag & drop (DndLiveRegion). Buen estado, vacío no aplica.

**Anuncios**: "20 anuncios", buscador, estrella "Destacar", punto azul de no-leído, fecha corta ("26 nov").
Al hacer clic se expande inline con el texto y botón "Ver anuncio completo"; al abrirlo pasa a leído.
Bien, pero: todas las fechas sin año, y 20 sin leer acumulados sin forma de "marcar todo como leído".

**Tareas**: "13 tareas", agrupación "Próximas 1 tarea" / "Pasadas 12 tareas", ícono de calendario y
"Vence 30 nov", "Vence 25 nov a las 23:59", subtítulo "Tareas · Vence 6 nov a las 14:00 · 6 pts".
Ojo: mezcla evaluaciones (Interrogación, Examen) con tareas ("I3-P1") bajo el título "Tareas" y repite
"Tareas ·" en el subtítulo → redundante. No dice estado de entrega ni nota obtenida.

**Notas** (la pantalla más fuerte):
- Número grande del promedio (– cuando no hay notas), "Con lo que va · 0 % evaluado", botón "Meta 4,0",
  y la frase clave: **"Para terminar con 4,0 necesitas un 4,0 en lo que queda."**
- "5 evaluaciones" + botones **Simular** y **Editar**.
- Simular: banner ámbar "Simulando. Nada de esto se guarda." + "Salir"; cada fila se vuelve campo
  ("Simular nota de Interrogación 1"). Al poner 5,5 y 3,0 recalcula al instante: **4,3**, "Simulado · 40 %
  evaluado" y "Para terminar con 4,0 necesitas un 3,9 en lo que queda." → funciona muy bien (acepta coma
  chilena).
- Editar: "Editar notas", "✓ Los pesos suman 100 %", filas con "–" eliminar, nombre editable, etiqueta
  "parejo", chevron "Detalles" y asa de arrastre; "+ Evaluación" y "+ Grupo".
- Menú de detalle de evaluación: "Fecha y detalles ›", "Archivo del profesor ›", "Dividir en subnotas ›",
  "Lo que pasó ›", "Eliminar evaluación".
- Modal "Editar evaluación": Nombre*, % de la nota final, Nota (placeholder "Aún sin nota"), Fecha
  ("lun, 31 ago 2026"), Hora ("Seleccione una hora"), Nota mínima ("Sin mínimo"), "Archivar evaluación",
  Cancelar / Guardar. Se canceló sin guardar.

**Requisitos**: "1 requisito", botón "Agregar una regla", lista colapsable "Notas — Aprobar con 4,0" y la nota
"Salen de **Clase a clase.pdf**." + "Actualizar programa". Buena trazabilidad del dato, pero la pestaña
también muestra "Equipo docente" (contenido que pertenece a Personas): **contenido duplicado/mezclado entre
pestañas**.

**Personas**: "210 personas", buscador, filtros "Rol" y "Filtros", avatares con iniciales, rol y siglas
("Profesor · MAT1620-1-14182 · MAT1620-2-14178"), paginación (Página 1, 2, …, 11, siguiente) y
"Mostrar las 210 personas". **Estado de carga lento**: aparece "Cargando las personas del curso." y tarda
varios segundos (4 s+); sin esqueleto de carga.

**Módulos**: "3 módulos", "Expandir todo", "Documentos 4 elementos", "Ayudantías 2 elementos",
"Material personal 9 elementos" + "Subir archivos". Colapsadas por defecto (el usuario debe expandir para ver
nada).

## Pantalla 4 — Aprender (/aprender)

- H1 centrado "Aprender" (fuera de la alineación del resto de la app, que es a la izquierda).
- Tres tarjetas de fuente: **Cargar** ("Archivos o tus ramos"), **Enlace de YouTube** ("Pega el enlace"),
  **Grabar** ("Grabar clase").
- Campo grande "Pregúntale al tutor" con "Dictar por voz" y botón "Enviar mensaje" (deshabilitado hasta escribir).
- "Recientes" con buscador "Buscar en lo que estudiaste", "Filtros" y tarjeta de un espacio:
  "Tarea 3 · Laboratorio de Cálculo II · 2 materiales · hace 4 días" con menú de opciones.
- **No hay estado vacío** cuando sí hay historial, pero tampoco hay sugerencias ("estudia tu próxima prueba"),
  ni acceso directo a flashcards/exámenes guardados.

### Bug bloqueante (Tutor de IA)
Al enviar "Explícame la regla de la cadena con un ejemplo y un error común" aparece:
> "El tutor no puede responder por ahora por un problema de nuestra cuenta con el proveedor de IA.
> Tu mensaje está a salvo y ya estamos al tanto."
Segundo intento: el texto **queda en la caja, sin indicador de envío ni nuevo error** (no hay feedback de
reintento). El mensaje no se pierde (bien), pero el usuario no sabe si se envió.

## Pantalla 5 — Espacio de estudio (/aprender/espacio/f63af4cf-…)

Layout de 3 zonas: documentos (visor PDF/Excel con pestañas, "Fijar al inicio", "Sacar de este espacio",
pantalla completa, paginación "1 / 6", "Alejar / Zoom 100 %. Ajustar al ancho / Acercar"), separador
arrastrable ("Arrastra para cambiar el ancho. Doble clic para volver al de siempre.") y panel derecho
"Herramientas de estudio": **Tutor · Resumen · Mapa conceptual · Flashcards · Podcast · Examen**.

- **Tutor**: conversación previa con MathML renderizado (fórmulas reales), acciones por mensaje
  ("Copiar mensaje", "Editar mensaje", "Regenerar respuesta"), "Expandir el Tutor", chip "2 fuentes".
  Existe un comando tipo slash "/plan-estudio" y sugerencias "/ruta-completa", "/explicación": buen detalle,
  pero **no hay autocomplete visible ni ayuda de comandos** (se descobren solo por el historial).
- Menú "Opciones del espacio de estudio": "Cambiar nombre", "Ramo Laboratorio de Cálculo II",
  "Instrucciones del Tutor — Solo aquí", "Cómo usar Espacio de estudio".
- Panel "Archivos de esta conversación": estado vacío correcto
  ("Cuando el Tutor te cree un documento, aparecerá aquí.").
- Panel "Cuaderno de esta conversación": estado vacío correcto
  ("Tu Cuaderno está vacío — Selecciona una explicación o fórmula del Tutor y guárdala aquí para revisarla
  después.").
- **Resumen**: Fuentes, "Nivel de detalle" (Completo / Repaso rápido, con explicación), "Enfoque adicional
  (Opcional)", "Crear resumen".
- **Mapa conceptual**: "Los conceptos clave y cómo se relacionan entre sí." + "Crear mapa conceptual".
- **Flashcards**: placeholder de ejemplo ("Por ejemplo: 30 tarjetas, solo de definiciones") + "Crear flashcards".
  Resultado: **"Esta vez no resultó. Intenta de nuevo en un rato."** + botón "Intentar de nuevo".
- **Podcast**: "Duración" (Corta · 3 min / Estándar · 7 min / Larga · 12 min) + "Crear podcast".
- **Examen**: muy bien pensado — "Una prueba armada con tus fuentes, como una real. Al entregarla ves tu nota
  de 1,0 a 7,0 y los temas que te faltan.", con Preguntas (5/10/15), Tipo (Mixto/Alternativas/Desarrollo),
  Dificultad (Baja/Media/Alta), checkbox "Con tiempo, como en la prueba".
  Resultado: **"El último examen no se pudo armar. Intenta de nuevo."**
- **Bug de conteo**: tras dos intentos fallidos el chip dice "· 2 creados" y luego "· 1 creado"/"· 2 creados"
  aunque nada se creó: cuenta intentos, no éxitos.
- **Inconsistencia**: los botones "Archivos" y "Cuaderno" solo aparecen en la cabecera cuando la pestaña
  activa es Tutor; al cambiar a Resumen/Flashcards/Examen desaparecen sin razón visible.
- El chip "· N creados" es un pop-up que agrupa artefactos, pero no se entiende sin abrirlo (etiqueta vaga).
## 7. Aprender → "Preparar prueba de Tarea 2" (flujo de evaluación) — 2026-11-27
URL: https://universidapp.cl/aprender/espacio/2595c597-c03f-45e4-90f9-89fe8183dc96

**Pantalla "¿Qué entra en Tarea 2?" (buena idea, bien redactada):**
- Heading: «¿Qué entra en Tarea 2?»
- Texto: «Ni el programa ni los anuncios de Laboratorio de Cálculo II dicen qué materia entra. Elige el material desde el que quieres estudiar y armamos tu repaso con eso.» → honestidad excelente (reconoce que no sabe).
- Agrupa el material en categorías con conteos: Enunciados 5, Códigos 8, Apuntes de clases 3, Tareas 6, Otros materiales 3, Solucionarios 2. Buscador «Buscar por nombre…», checkbox por archivo, botón «Ver <archivo>» (vista previa).
- Botón secundario: «No sé qué entra, usa el material desde mi última evaluación».
- **Microcopy confuso**: texto de ayuda «Elige uno o más archivos» convive con el botón deshabilitado «Estudiar con»; no hay contador de seleccionados.

**Al pulsar «Estudiar con»** crea un espacio de estudio nuevo titulado «Tarea 2 · Laboratorio de Cálculo II» y **precarga un prompt gigante** en el cuadro del Tutor (con el texto completo de un anuncio, truncado a media palabra: «…no estarán sujetas a nuevas revisiones. Las solicitud»). El prompt usa un comando tipo «/plan-estudio» que nunca se explica a la vista.

**Panel emergente «Encontré 6 archivos en Laboratorio de Cálculo II»** (sube a 6 fuentes): checklist con checkboxes, «Elegir yo» / «Usar 6 archivos» / «Cerrar sin traer archivos». Botones pasan a «Cargando…» y aparece diálogo «Agregar al material»:
- Texto: «Quedan como documentos al lado, y el Tutor los usa como fuentes. No tienes que mandar un mensaje.»
- **Error parcial (texto exacto)**: «No pude traer: Hoja de respuesta tarea2, Hoja de respuesta tarea 3, Hoja de respuesta tarea 1. Lo demás quedó listo para subir.» → 3 de 6 archivos no se pueden traer (los .nb / hojas de respuesta). Botones «Agregar más» y «Subir 3».
- Al reintentar con otros 4: «No pude traer esos archivos ahora. Prueba con «Elegir yo» o inténtalo de nuevo.» → **bucle**: el panel «Encontré N archivos…» reaparece en cada envío, bloqueando el chat.

**Tutor (segundo intento, ahora sí responde):** «Pensando la respuesta…» → respuesta rica, con tabla y MathML renderizado:
- Heading «Contenidos evaluados» + «El plan se estructuró utilizando únicamente los archivos seleccionados», cita los 2 PDF elegidos con sus laboratorios.
- «Nota sobre tu calendario: En tu Agenda coinciden dos evaluaciones el viernes 27 de noviembre (Tarea 2 de Laboratorio de Cálculo II y Tarea 3 de Introducción a la Programación).» → **cruza datos reales de la agenda, muy buen diferencial**.
- Heading «Desglose de temas a partir del material» y tabla «Macro-tema / Subtemas clave / Tipo de ejercicio» (Visualización 3D y Curvas de Nivel, Reconocimiento de Extremos Locales, Derivadas Parciales de Primer Orden, Razón de Cambio y Derivada Direccional…).
- **No detecta que el PDF «Enunciado Tarea 1» dice «Primer Semestre de 2026»** (material del semestre equivocado mezclado en el ramo).
- Acciones del mensaje: Copiar, Editar, Reenviar/Regenerar. Field pasa a «Añadir mensajes a la cola» y botón «Detener la respuesta». Sugerencia «/ruta-completa» en el autocompletar.

**Bug de estado de IA (repetido)**: el primer intento del Tutor en otro espacio devolvió el error de proveedor y la Flashcards/Examen siguientes fallaron; al tercer/sexto intento funciona. La app **no avisa que la IA del proveedor está caída de forma global**, solo por pantalla, y no ofrece un reintento explícito desde el error del examen.
## 8. Calendario — https://universidapp.cl/calendario

**Lo que se ve:**
- Header: botón «‹ 2026», heading «Noviembre 2026» (con emoji 📅), botón «Hoy», botón «Conectar con Google Calendar».
- Columnas Lun–Dom, pero el cuerpo es un **scroll vertical continuo de 24 meses** (Noviembre 2025 → Noviembre 2027), con secciones «Noviembre», «Diciembre»… y heading «Noviembre 2026» repetido. No hay vista semanal ni vista día/agenda del calendario: solo este rollo gigante.
- Encabezado duplicado/confuso: dice «Noviembre 2026» arriba pero el primer bloque del scroll es «Noviembre 2025»; «Enero», «Febrero»… aparecen **sin año** hasta «Enero 2027». Difícil saber a qué año pertenece cada mes.
- Chips de evaluación por color de ramo, con hora («Tarea 2 · 23:59»). Los días sin nada quedan vacíos (buen estado vacío).
- Sidebar derecha «Evaluaciones» con buscador, Filtros y segmentador **Semana / Mes / Todos**; los chips del sidebar sí tienen «Esta semana».
- **Filtros** (menú): Ordenar → «Cronológico» / «Tipo de evaluación»; Ramo → «Todos los ramos» + 7 ramos con punto de color. No hay filtro por tipo de evaluación ni por estado (pendiente/pasada).

**Diálogo «+» = «Agregar evaluación»** (no permite agregar otro tipo de evento: clases, entregas, personales):
- Campos: Nombre* (placeholder «Ej. Certamen 2», contador 0/200), Ramo (default «Introduccion a la Programacion»), Tipo de evaluación* (Prueba, Control, Examen, Trabajo, Tarea, Otro), Fecha* («jue, 26 nov 2026»), Hora («Selecciona una hora»), Notificación (switch «Avisarme» ON, «Alertas», «Con tu configuración: 3 días antes, 19:00, El día antes, 19:00, El mismo día, 8:00», botón «Personalizar» → lista con «Cambiar la alerta…», «Quitar…», «Agregar alerta», «Usar mi configuración»), Descripción («Nota interna (opcional)», 0/200). Botones Cancelar / Agregar.
- **Bug de accesibilidad/etiquetas**: el selector de Ramo ofrece opciones que no son ramos: «Extra», «Trabajo», «Personal», «Sin ramo», «Nuevo ramo».
- El diálogo no muestra vista previa ni dice si la evaluación entrará al promedio.

**Detalle al hacer clic en una evaluación → «Editar evaluación»**:
- Banner «Estudiar con el Tutor — Arma tu plan para esta evaluación con tu material. [Empezar]» → puente calendario→IA, muy bueno.
- Mismos campos + «Quitar hora», y **«Origen: Del programa» / «La app la leyó del programa del ramo: Examen Final.»** → trazabilidad excelente.
- Botones Eliminar / Cancelar / Guardar. No permite marcar "completada" ni registrar nota desde aquí.

**Conectar con Google Calendar (cancelado, límite respetado):** lleva a OAuth de Google (`accounts.google.com/v3/signin/accountchooser…scope=calendar.events&redirect_uri=https://universidapp.cl/api/google-calendar/callback`, `prompt=consent`, `access_type=offline`). Se describió y se canceló volviendo a universidapp.cl/calendario, sin seleccionar cuenta. La app **no avisa antes qué permisos pedirá** ni explica qué sincroniza (una o dos vías).

**Contraste GradeHub:** GradeHub exporta .ics; UniversidApp no ofrece export/descarga de calendario (no hay botón), solo importación vía Google. GradeHub no tiene notificaciones por evaluación; UniversidApp sí y son superiores.
## 9. «Yo» — https://universidapp.cl/yo
Tarjeta de perfil (avatar «L», «[Nombre Apellido]», «@[usuario] · [correo]», «Ingeniería Civil · Pontificia Universidad Católica de Chile»). Secciones: **Cuenta** (Configuración), **Canvas** (Avance académico, Calificaciones, Traer cursos desde Canvas → todas apuntan a /ramos), **Ayuda** (Cómo usar la app, Danos feedback), **Actividad**: «Uso semanal», «Se renueva el 1 de diciembre», barra con «1% de tu uso semanal», «Se gasta cuando usas el Tutor y las herramientas de estudio, como resúmenes, flashcards, exámenes y podcasts». Link a Política de privacidad.
- Buena explicación del límite de IA. **Falta**: ningún link a «Planes»/precio ni a qué pasa al llegar al 100% (no hay mención de plan gratuito vs pago en toda la app).

## 10. Configuración — /yo/configuracion
«Personaliza tu cuenta y la experiencia de estudio.» Agrupaciones: Cuenta (Perfil), Preferencias (Notificaciones, Apariencia, Pendientes), Privacidad (Funciones con IA [Activadas], Memoria, RUT para tus notas), Integraciones (Canvas), Ayuda (Cómo usar la app, Ayuda), botón **Cerrar sesión**.

### Perfil (/yo/configuracion/perfil)
- Información personal: Nombre, Apellido, Correo electrónico (con lock), Contraseña (•••••••• + «Solicitar cambio»).
- **Raro para un login con Google**: muestra contraseña y «Solicitar cambio» sin explicar que la cuenta es de Google.
- Información académica: Universidad, Carrera, Semestre actual (2026-2) + «Editar información»; **Eliminar cuenta** al pie.
- **Diálogo «Editar información»**: Nombre/Apellido, Universidad y Carrera (combos buscables), Semestre actual.
  - **BUG**: al escribir en el buscador de Universidad el texto se inserta en el medio del valor actual: «Pontificia Univ**Universidad de**ersidad Católica de Chile».
  - **Catálogo corto**: buscando «Universidad de» no aparece ninguna (solo «No encuentro mi universidad»). Escape del problema: «Escribe el nombre como lo usas tú. Lo guardamos así y lo sumamos al listado más adelante.» (buena solución, pero deja basura de datos).
  - Semestre actual: solo «2026-2» + «Agregar nuevo semestre» → campo libre «Nombre del semestre» (p. ej. 2026-2), «Guardar» deshabilitado hasta escribir. **No hay forma de archivar/cerrar el semestre actual ni de marcar uno como pasado.**

### Notificaciones (/yo/configuracion/notificaciones)
- Estado de error/bloqueo muy bien resuelto: «Las notificaciones están bloqueadas» + «Permite las notificaciones de UniversidApp en la configuración de tu navegador o de tu dispositivo, y vuelve a esta pantalla.»
- «Qué te avisamos»: Evaluaciones (3 días antes, el día antes, un rato antes), Material nuevo, Anuncios. Switches ON.
- **Falta botón «Permitir notificaciones» / «Reintentar»**: el usuario debe adivinar cómo desbloquear.

### Apariencia (/yo/configuracion/apariencia)
- Tema: Sistema / Claro / Oscuro / Por horario, con explicación honesta («Se guarda en este dispositivo… si usas UniversidApp desde otro tienes que elegirlo de nuevo ahí»). «Por horario» muestra «Oscuro desde» y «Hasta» (time pickers 12 h AM/PM).
- **Modo oscuro real y bastante consistente** (fondo negro puro, tarjetas #1c1c1c, acento azul). Peros: fondo negro puro sin elevación suficiente, y los **chips pastel de eventos del calendario/Inicio quedan con contraste muy bajo** (texto sobre verde/rosado tenue casi ilegible).

### Pendientes (/yo/configuracion/pendientes)
Opciones excelente, con explicaciones: «Tareas hechas» (Se quedan donde están / Bajan al final de su lista / Van a «Hechas», plegado), «Tachar las tareas hechas» (Sí/No), «Espaciado» (Cómodo/Compacto).

### Funciones con IA (/yo/configuracion/funciones-ia)
Transparencia ejemplar: nombra **Google (Gemini), Anthropic (Claude), AssemblyAI y Groq**, qué se envía, «no usamos tu contenido para entrenar una IA propia», link a privacidad, botón «Desactivar».

### Memoria (/yo/configuracion/memoria)
«Lo que la app recuerda de ti… puedes olvidar cualquier cosa.» Campo «Pídele que recuerde algo» (placeholder «Por ejemplo: explicame con ejemplos de la vida real, o estudio mejor de noche»), botón «Recordar» deshabilitado. Estado vacío: «Todavía no hay nada guardado…».

### RUT para tus notas (/yo/configuracion/rut)
Idea diferencial (leer planillas/PDF de notas y encontrar tu fila). Checkbox de consentimiento largo y claro + explicación de hashing («guardamos un código que se calcula a partir de tu RUT… nadie puede leer tu RUT desde ahí», «Nunca lo mandamos a una IA»). Guardar deshabilitado.

### Canvas (/yo/configuracion/canvas)
«Canvas conectado», «Última sincronización: 26 de noviembre a las 10:59 p. m.», botón «Desconectar» (no se pulsó, por límites). **Falta «Sincronizar ahora»** y detalle de qué se sincroniza.

### Cómo usar la app (/yo/configuracion/como-usar)
Vídeos cortos por sección: Tutor, Mis Ramos, Inicio, Espacio de estudio, Calendario, con duraciones (37 s, 40 s, 20 s, 39 s, 28 s). Excelente onboarding diferido.

### Ayuda (/yo/configuracion/ayuda)
FAQ acordeón (5 preguntas). Ej.: «¿Cómo se calcula mi uso semanal?» → «Cada cuenta tiene un crédito que se renueva cada semana, contada desde el día en que te registraste…»; «¿Qué pasa con mis ramos y notas si cambio de universidad o carrera?» → «Nada se borra…». Contacto soporte@universidapp.cl. No hay buscador de ayuda ni chat.

## 10. Buzón de notificaciones global (pantalla Inicio)

**Acceso:** campana en la cabecera de Inicio, con badge numérico ("17 sin leer"). Botón accessible:
"Por hacer, novedades y mensajes".

**Diálogo "Por hacer, novedades y mensajes"** (panel flotante a la derecha, ~255 px de ancho, se superpone
el horario):
- Header con resumen destacado: «Material nuevo en Dinamica, Laboratorio de Cálculo II y 1 ramo más /
  Lo encuentras en Material, con un puntito en lo que no has abierto. (sin leer)».
- Tres pestañas: **Por hacer** | **Novedades 2 sin leer** | **Mensajes 14 sin leer**. Botón Cerrar (x).

**Pestaña Por hacer:** 1 sola tarjeta → «Buzon de Rezagados Tarea 3 2026-2 60 pts Laboratorio de Cálculo II
vie 27 nov a las 23:59».
- **Inconsistencia:** el horario de la semana muestra 3 evaluaciones (Interrogación 2, Tarea 3, Tarea 2) y
  el badge decía 17 sin leer, pero "Por hacer" lista solo 1. No dice por qué las otras no aparecen
  (¿ya estudiadas? ¿no pendientes?). Se siente incompleto.
- **Conteo inestable:** el badge baja de 17 → 16 → 15 solo con abrir pestañas y mensajes, sin marcar
  explícitamente nada. No hay control "Marcar todo como leído".

**Pestaña Novedades:** «Taller prompts efectivos #2 — Introduccion a la Programacion — 23 nov (sin leer)»,
«Foro Tarea 3 2026-2 — Laboratorio de Cálculo II — 18 nov (sin leer)».

**Pestaña Mensajes:** conversación tipo correo/chat, orden cronológico inverso, 30+ ítems (la lista sigue
fuera del viewport, se scrollea). Cada fila: avatar con iniciales, asunto, hora o fecha, snippet de 2 líneas
y punto azul de "sin leer"; al final «Con <nombre del docente>».
- **Falta el ramo** en la fila (solo aparece el autor dentro del detalle: «Juan Pablo Espinosa Arce ·
  Revelacion y Fe»). Con 5 ramos, no se puede escanear visualmente.
- **No hay buscador, filtro por ramo, ni agrupación.** Para 100+ mensajes de un semestre es poco usable.
- **Detalles de texto:** snippets cortados a media palabra («les envío las informacione…», «1. Hoy 09.1…»).

**Detalle de mensaje:** al abrir, se ven **DOS botones "Volver a Mensajes" apilados** (uno arriba del otro,
bug de layout). Debajo: heading con el asunto, autor · ramo, fecha, burbuja de chat con el cuerpo completo y
hora; abajo campo «Escribe un mensaje» + botón «Enviar» (deshabilitado hasta escribir).
- **Riesgo UX/privacidad:** el campo sugiere que se puede responder una comunicación oficial del docente
  desde la app. Debería advertir si la respuesta se publica en el foro/anuncio del ramo o deshabilitar la
  respuesta en anuncios masivos.
- No hay adjuntos visibles (el mensaje menciona "adjunto la rúbrica" y no se ve el archivo).
- No hay botón "Marcar como no leído" ni "Archivar".

**Comparativa GradeHub:** GradeHub no tiene mensajería (no sincroniza Canvas), pero sí **exporta .ics** su
agenda; UniversidApp no exporta. La idea de "Por hacer / Novedades" es buena y GradeHub podría copiar el
concepto de un feed de pendientes priorizado.

## 11. Modal "Danos feedback" (global)

Diálogo centrado con backdrop que oscurece todo. Contenido:
- Heading «Danos feedback», botón Cerrar (x).
- Texto: «Gracias por ayudarnos a mejorar UniversidApp. Cuéntanos qué pasó, qué esperabas que ocurriera o qué
  crees que podríamos mejorar. Mientras más detalle nos des, más fácil será entenderlo y solucionarlo.»
- Textarea con placeholder de ejemplo muy bueno: «Por ejemplo: subí el programa de Cálculo II y las fechas de las
  pruebas quedaron un día corridas. Esperaba que tomara las del calendario del curso.» + contador 0/4000.
- Botón «Adjuntar imagen» + ayuda «Pega una captura con Ctrl+V o adjunta hasta 5 imágenes de 10 MB.»
- Botones Cancelar / «Enviar feedback» (deshabilitado hasta escribir). **No se envió** (límite de la auditoría).
- **Falta:** categoría/tipo de problema (bug, sugerencia, duda) y email de contacto pre-rellenado; sin categoría,
  el equipo no puede priorizar. El botón está siempre visible en la cabecera de todas las pantallas: algo ruido.

## 12. Ramos: portada, semestre y menú de ramo

**Portada de Ramos:** título H1, buscador «Buscar en tus ramos», selector «Semestre 2026-2» (+), grilla de 7
tarjetas con gradiente de color, chip «2026-2», nombre, académico y sección. Link «Ver todos los cursos».
Botón flotante inferior «Traer cursos desde Canvas» (Help: «Canvas, conectado»).
- **Bug visual:** queda un **spinner girando arriba a la derecha** (esquina superior derecha de la pantalla,
  fuera del contenido) durante la carga de cursos; no hay skeleton ni mensaje, solo el spinner suelto.
- **Datos incompletos:** las tarjetas de Cálculo II, Dinámica, Laboratorio de Dinámica, Principios Ecológicos y
  Laboratorio de Cálculo II muestran sólo sigla, sin académico (Introduction a la Programación sí lo muestra).
  Inconsistencia entre tarjetas de la misma grilla.
- Las tarjetas tienen gradiente de saturación alta sobre fondo negro: buen impacto, pero el texto blanco sobre
  la franja clara del gradiente baja el contraste en algunos colores (Ámbar/Naranjo).

**Selector de semestre:** menú con UNA sola opción: «2026-2 — Segundo semestre · En curso».
- **Cierre de semestre:** no existe. No hay forma de archivar/cerrar el semestre, ni de ver semestres
  anteriores, ni de promediar el semestre completo. Cuando termine 2026-2 el usuario no tiene dónde ver su
  histórico ni su promedio acumulado. (En el perfil solo aparece «Agregar nuevo semestre».)
- **Comparativa GradeHub:** GradeHub tiene simulador de semestre completo e historial; UniversidApp no cierra
  el semestre. Es la debilidad compartida del brief, pero UniversidApp ni siquiera muestra promedio ponderado
  acumulado entre ramos.

**Menú "..." de cada ramo:** Ver programa / Actualizar programa / Ajustes. Sin «Archivar ramo», «Duplicar al
próximo semestre» ni «Ocultar».

**Diálogo "Editar ramo":** Nombre*, Semestre («2026-2 (actual)»), Color (10 swatches con nombres: Azul, Violeta,
Fucsia, Rojo, Naranjo, Ámbar, Verde oliva, Verde, Teal, Gris azulado + «Elegir otro color»), Cancelar/Guardar.
Sección «Info del ramo» (colapsable): Profesor (nombre + correo + link ✉ mailto), Ayudante, Sala, Horario
(«M-J:2»). Bloque «Eliminar»: «Programa — Quita el archivo del programa. Tus evaluaciones y requisitos se
quedan.» y «Ramo — Se pierden sus notas, asistencia, material y evaluaciones del calendario.»
- **Bueno:** textos de consecuencia claros, mailto útil, buen detalle de «Ocultar info del ramo».
- **Riesgo:** «Eliminar ramo» es destructivo y está en el mismo diálogo, sin confirmación visible ni doble paso.
  Un clic desde el menú llega hasta el botón rojo.
- **Falta:** campo créditos del ramo, sin «peso»/créditos no se puede armar promedio ponderado por semestre.

## 13. Rama: pestaña Requisitos (muy buen acierto)

Header «2 requisitos» + botón «+» (solo ícono, poca pista de que agrega una regla). Tarjeta de Equipo docente
(sin título, aparece arriba de los requisitos: jerarquía confusa, parece parte de los requisitos).
- **Notas — «Aprobar con 4,0 · Con condiciones»**, desplegable con dos bloques:
  - «LO QUE DICE EL PROGRAMA»: `NF = 15% × I1 + 20% × I2 + 30% × E + 5% × T1 + 5% × T2 + 5% × T3 + 16% × NP + 4% × TIA`,
    las condiciones textuales y la regla del techo 3,9.
  - «EN SIMPLE»: «Para aprobar necesitas que el promedio ponderado de las interrogaciones y el examen sea al
    menos 4,0 y que tu nota final también alcance un 4,0; de lo contrario, tu nota máxima será 3,9.»
- **Asistencia — «5 reglas»**: cada regla citada del programa con botón «Corregir esta regla».
- Fuente citada: «Salen de Programa_2026_2.pdf y Calendario_intro.pdf. Actualizar programa».
- **Es lo mejor de la app frente a GradeHub:** GradeHub pide pautas manuales; aquí se extraen del PDF con
  explicación en lenguaje simple y trazabilidad al archivo.

## 14. Rama: pestaña Notas (URL real `tab=calificaciones`)

- Cabecera: número grande «–» (sin notas), barra de progreso, «Con lo que va · 0 % evaluado», botón «Meta 4,0»,
  y la frase clave: **«Para terminar con 4,0 necesitas un 4,0 en lo que queda.»**
- «8 evaluaciones» + botones **Simular** y **Editar**. Lista de evaluaciones con peso y fecha; a la derecha
  «necesitas 4,0» en las que aún no se dan.
- Al hacer clic en una fila se abre **edición inline**: campo «Nota de Interrogación 1 (I1)」 + botones
  «Justifiqué», «No la di», «Otro acuerdo» (casos especiales chilenos, muy buen detalle).
- **Bugs / mejoras:**
  1. El menú de «Meta» (4,0 / 4,5 / 5,0 / 5,5 / 6,0) se superpone sobre los botones Simular y Editar, y no se
     cierra con Escape: quedan los elementosEncimándose.
  2. Con 0 % evaluado el bloque superior queda casi vacío (un guión y una barra) y la página tiene un enorme
     espacio en blanco debajo: estado vacío sin guía («Sincroniza con Canvas o agrega tus notas»).
  3. La URL del tab dice `calificaciones` pero el tab se llama «Notas»: inconsistencia interna.
  4. El botón «Meta» no explica que cambia el cálculo; no hay tooltip.
- **Comparativa GradeHub:** el «necesitas X para aprobar» existe y es igual de claro, y la meta editable es un
  plus de GradeHub (allá es por ramo y por semestre; acá solo por ramo, sin simulador de semestre).

## 15. Herramientas de IA del espacio de estudio (prueba real, resultado)

Fuente: https://universidapp.cl/aprender/espacio/2595c597-c03f-45e4-90f9-89fe8183dc96
Espacio «Tarea 2 · Laboratorio de Cálculo II», 6 fuentes (1 XLS + 5 PDF). Panel derecho con tabs
de herramienta: Tutor · Resumen · Mapa conceptual · Flashcards · Podcast · Examen.

**Comportamiento general (muy buen patrón de estado de carga):**
- Cada herramienta abre con su formulario de opciones (fuentes, cantidad, tipo, dificultad, enfoque adicional).
- Estado de carga con `status`, barra de progreso y botón **Cancelar**: «Generando… Un resumen completo toma uno o dos minutos. Puedes seguir estudiar o salir: queda guardado aquí.» / «Generando… Toma alrededor de medio minuto. Puedes seguir estudiando o salir: queda guardado aquí.»
- La pestaña se renombra «Creándose Resumen» → «Listo Resumen» (igual «Listo Podcast», «Listo Examen»). **Buen microcopy y buen feedback de progreso**, y permite salir sin perder el trabajo.
- Barra de acciones por resultado: herramienta / **Crear otro con las mismas fuentes** / **Borrar** / **Pantalla completa** («Ver a todo el ancho»), más **Descargar** donde aplica.
- Contador «· 5 creados» junto al nombre del espacio.
- **Bug de layout:** el grupo de tabs de herramientas se corta horizontalmente en el ancho por defecto («Tutor» queda parcialmente oculto, sin flechas de scroll ni indicador de más tabs). El separador de ancho («Arrastra para cambiar el ancho. Doble clic para volver al de siempre.») ayuda, pero el desbordamiento inicial hace que la primera herramienta se vea cortada.

### 15.1 Tutor
Respondió con tabla, MathML y cruce real con la Agenda: «coinciden dos evaluaciones el viernes 27 de noviembre». Fuente: espacio de estudio, tab Tutor. Excelente: cita el material y conecta con calendario.

### 15.2 Resumen
Opciones: Completo / Repaso rápido + «Enfoque adicional». Resultado con índice «En este resumen», secciones, bloque «Cómo se conecta», «Errores frecuentes», y botones «Preguntarle al Tutor» por sección. Descarga disponible. **Funciona bien y es lo más completo del producto.**

### 15.3 Mapa conceptual
Generado: pregunta central, nodos con relaciones etiquetadas («se rige por», «establece», «sanciona con», «modula mediante», «representa el»), MathML dentro de nodos, «Conexiones entre ramas», «Puntos críticos». Controles: Alejar / 100% (Ver todo el mapa) / Acercar / Ver todo / Vertical: la idea arriba / Pantalla completa; botones «Plegar esta rama». Descargar como imagen.
**Problema:** el grafo se dibuja más ancho que el panel y los nodos quedan cortados por el borde derecho hasta que el usuario descubre «Ver todo» o arrastra el separador. **Falta:** botón de reorganizar/exportar a PDF, y guardado de la posición del zoom.

### 15.4 Flashcards
13 tarjetas creadas. Vista: «Tarjeta 1 de 13», barra «Avance de esta vuelta», «La sabías 0 · Por repasar 0 · Te quedan 13», «Barajar lo que queda», «Marcar para repasar (M)», atajos «Espacio da vuelta la tarjeta · ← → recorren · M marca para repasar».
Al voltear: «Respuesta» + botones **Necesito repasarla (1)** y **La sabía (2)** y «Ver pregunta». Buena repetición espaciada aparente.
**Problema:** el botón «Ver respuesta» y la tarjeta son a la vez «clickable» y botón (doble área de clic), y la respuesta de ejemplo («Domingo 25 de octubre de 2026 hasta las 23:59 horas») contradice el PDF visible al lado («domingo 4 de octubre»): **la IA mezcló fechas de distintos enunciados → riesgo de alucinación en datos críticos**. Falta cita/página en cada flashcard (el examen sí cita página).

### 15.5 Podcast
Resultado: «Estudio de Tarea 2: Aproximaciones y Zonas de Inundación», reproductor con slider «Avance», 0:00 / −2:04, **Velocidad 1×**, **Retroceder 15 s**, **Reproducir**, **Adelantar 30 s**, **Descargar**, nota «Sigue sonando con la pantalla bloqueada o en otra pestaña. Escucharlo sin conexión llega con la app de iPhone.», y **Transcripción** completa por hablantes (Sofía / Mateo), con párrafos clicables. Opciones de duración Corta / Estándar / Larga. **Excelente; supera cualquier cosa de GradeHub.**
**Falta:** saltar a un minuto desde la transcripción resaltada (sí son botones, pero no se ve sincronía con el audio) y elegir voces/idioma.

### 15.6 Examen
Opciones: 5 / 10 / 15 preguntas; Tipo Mixto / Alternativas / Desarrollo; Dificultad Baja / Media / Alta; checkbox «Con tiempo, como en la prueba»; «Enfoque adicional».
Al abrir: «Evaluación de Laboratorio de Cálculo II - Tarea 2», «Pregunta 1 de 10 · 0 respondidas», **Salir** (help: «Sale sin perder lo respondido: lo retomas cuando quieras»), **Entregar**, navegador de preguntas «Ir a una pregunta» (Pregunta 1…10 con estado sin responder/respondida).
- Preguntas con MathML y cita de origen: «PREGUNTA 1 DE 10 · APROXIMACIÓN LINEAL LOCAL · PÁGINA 4» — **excelente procedencia**.
- Confirmación al entregar: diálogo «¿Entregar con preguntas sin responder?» — «Te faltan las preguntas 2, 5, 6, 7, 8, 9 y 10. Las que no respondas cuentan como incorrectas.» + «Con «Seguir respondiendo» vas a la primera que falta. Los números de arriba llevan a cualquiera.» Botones **Cerrar / Seguir respondiendo / Entregar igual**. **Buen manejo de estado y de error de usuario.**
- Resultado: **nota «2,0»** en escala chilena 1,0–7,0 + «Todavía no» + «2 de 10 puntos · 20 %» + «Te falta repasar Reglamento y normativas de entregas, Validez de aproximaciones locales, Aproximación lineal local y Análisis de niveles y curvas de nivel. Al final te decimos dónde está cada tema en el material.» + «Por tema» con porcentajes (0 %, 0 %, 33 %, 50 %) + «Revisión» (Todas · 10 / Por repasar · 8) + por pregunta «Correcta» / «Tu respuesta» y bloque «Por qué» con explicación y MathML.
- **No se vio** el botón «Crear otro con las mismas fuentes» ni «Borrar» en la pantalla de resultado del examen entregado (sí en las otras herramientas). **Falta:** registrar el intento en un historial de estadísticas (GradeHub tiene historial; aquí no se guarda el resultado en ninguna parte visible).

## 16. Aprender: fuentes nuevas, paneles y limpieza

Fuente: https://universidapp.cl/aprender y /aprender/espacio/3b3ddd80-8664-44d3-8281-071a9c84a7cc

**Tres tarjetas de fuente:** «Cargar — Archivos o tus ramos», «Enlace de YouTube — Pega el enlace», «Grabar — Grabar clase». Debajo, campo «Pregúntale al tutor» + «Dictar por voz» + «Enviar mensaje» (deshabilitado hasta escribir). Lista «Recientes» con buscador («Buscar en lo que estudiaste»), «Filtros» y menú «…» por tarjeta (Cambiar nombre / Cambiar ramo / **Borrar estudio**).

**Enlace de YouTube (probado con un enlace real):** diálogo «Enlace de YouTube — Pega el enlace de un video para estudiarlo con su transcripción al lado», campo con placeholder `https://www.youtube.com/watch?v=…`, botones Cancelar / **Abrir** (deshabilitado hasta pegar). Al abrir: chip «YT · Voy a ver este video para responderte» + «Se abre con tu material al lado del Tutor», y crea un espacio nuevo.
- Estado de carga con skeleton y «Abriendo el video… Esto toma unos segundos.»; navega solo a `/aprender/espacio/<id>`.
- **Bug de contenido:** el embed mostró **«This video is unavailable»** (3Blue1Brown bloquea embed) y el panel de transcripción se quedó para siempre en «La transcripción empieza sola en cuanto el video termina de cargar.» → **no hay estado de error ni timeout para la transcripción**: queda cargando indefinidamente (mismo tipo de falla que GradeHub con secciones que cargan para siempre).
- El Tutor respondió: **«No pudimos generar la respuesta por una falla nuestra. Tu mensaje sigue en el cuadro de texto.»** + «Volver a intentar». El reintento volvió al mismo error 2 veces (por el video no transcribible). Buen texto de error (dice que no se perdió el mensaje), pero no explica la causa real (video sin captions/embed bloqueado).
- Buen detalle: botón **«Tengo una duda 0:00»** + «Pausa donde no entiendas y pregunta: el Tutor sabe en qué momento del video estás.»
- Al crear el espacio pide ramo: «¿De qué ramo es este material?» con chips de ramos + «Otro ramo» + «No corresponde a ningún ramo» + «Ahora no». **Bien** (onboarding de 1 paso).
- Nombre automático genérico «Video de YouTube» (no usa el título del video).

**Grabar (diálogo, no se grabó para no pedir micrófono):** «Grabar una clase — Queda como un archivo más de tu espacio de estudio, transcrito con sus minutos», campo «Nombre de la clase» con valor por defecto «Clase del 26 de noviembre», fecha «Jueves, 26 de noviembre», cronómetro 0:00, «Toca el botón rojo para empezar. Deja el teléfono cerca de quien habla.», botones **Empezar a grabar** / Cancelar. **Falta:** aviso de permiso de micrófono, duración máxima y aviso de qué pasa si se va la conexión.

**Paneles del espacio (nuevos hallazgos):** botones «Archivos» (Ayuda: «Archivos de esta conversación», vacío: «Cuando el Tutor te cree un documento, aparecerá aquí.») y «Cuaderno» («Tu Cuaderno está vacío — Selecciona una explicación o fórmula del Tutor y guárdala aquí para revisarla después.»). **Borrar estudio** borra **sin confirmación** pero muestra toast «Estudio borrado» con **«Deshacer»** — buen patrón de undo.

**Opciones del espacio de estudio:** Cambiar nombre / Ramo … / **Instrucciones del Tutor (Solo aquí)** / **Cómo usar Espacio de estudio**. El diálogo de ayuda es un onboarding de 3 pasos con animación y enlaces «Todas las lecciones», «Ver de nuevo», «Ir a Espacio de estudio». **Muy bueno.**
«· 5 creados» abre diálogo «Lo que creaste» con las 5 herramientas generadas (examen, flashcards, mapa, podcast, resumen) y sus fuentes.

## 17. Configuración (todas las subpáginas)

Fuente: https://universidapp.cl/yo/configuracion y sus subrutas.
Grupos: **Cuenta** (Perfil) · **Preferencias** (Notificaciones, Apariencia, Pendientes) · **Privacidad** (Funciones con IA «Activadas», Memoria, RUT para tus notas) · **Integraciones** (Canvas) · **Ayuda** (Cómo usar la app, Ayuda) · botón **Cerrar sesión**.

- **Memoria** (/funciones… /memoria): «Lo que la app recuerda de ti… Tú decides qué se queda: puedes olvidar cualquier cosa», campo «Pídele que recuerde algo» + botón Recordar (deshabilitado), vacío: «Todavía no hay nada guardado…». **Excelente control sobre la memoria de la IA.**
- **RUT para tus notas**: explica el caso de uso (PDF/planilla con notas del curso), checkbox de consentimiento largo y claro, y dos bloques de transparencia: «Cómo lo protegemos: guardamos un código que se calcula a partir de tu RUT y que no se puede revertir…» y «Nunca lo mandamos a una IA, nunca lo mostramos en una notificación y no guardamos las notas de tus compañeros…». **Mejor práctica de privacidad que GradeHub no tiene.** (No se ingresó RUT.)
- **Funciones con IA**: enumera proveedores (Google Gemini, Anthropic Claude, AssemblyAI, Groq), qué se envía, «no usamos tu contenido para entrenar una IA propia», botón **Desactivar** y enlace a privacidad. **No se desactivó.**
- **Pendientes**: «Tareas hechas» (Se quedan donde están / Bajan al final de su lista / Van a «Hechas», plegado), «Tachar las tareas hechas» (Sí/No), «Espaciado» (Cómodo/Compacto). Buen control fino, con microcopy explicativo.
- **Cómo usar la app**: «Un video corto de cada parte, con la app de verdad», índice por parte (Tutor, Mis Ramos, Inicio, Espacio de estudio, Calendario) y lecciones con duración («Conecta tu Canvas… 40 s», «Crea material para estudiar… 39 s»). **Onboarding de referencia.**
- **Ayuda**: 5 preguntas frecuentes desplegables (todas abren bien) y correo `soporte@universidapp.cl`. Textos clave: uso semanal = «Cada cuenta tiene un crédito que se renueva cada semana… La barra en "Yo" muestra cuánto llevas gastado»; «¿Qué pasa si elimino mi cuenta? Se borran tus sesiones y tus planes generados, sin vuelta atrás…».
- **Planes/límites:** no existe página de planes ni precio; el único indicio es «Uso semanal 1 % … Se renueva el 1 de diciembre» en «Yo» y esta FAQ. **La monetización es invisible** (ni límite, ni plan, ni qué pasa al agotarlo).
- **Apariencia:** Tema Sistema / Claro / Oscuro / Por horario, con «Oscuro desde 08:00 PM» / «Hasta 07:00 AM» (InputTime). **Bug de accesibilidad:** los botones de tema no exponen estado seleccionado/`aria-pressed` en el árbol, y el reloj usa formato AM/PM en una app en español (debería 24 h o es/CL).

## 18. Modo claro y «Para ti» (Inicio, tras las pruebas)

En claro (/inicio): fondo roto-blanco cálido, jerarquía clara, buen contraste de tarjetas suaves. El horario muestra evaluaciones como pastillas de color por ramo y hoy destacado.
**«Para ti»** ahora genera recomendaciones basadas en lo probado:
- «Repasa «Reglamento y normativas de entregas» antes del Tarea 2.» — «En tus exámenes de práctica de Laboratorio de Cálculo II fallaste preguntas de este tema en tu último examen, y el Tarea 2 es mañana.» + enlace Estudiar + procedencia «Recomendación · Laboratorio de Cálculo II · Según tus exámenes de práctica».
- «Examen de Calculo II es en 4 días y todavía no has estudiado ese ramo con el Tutor.» (Prueba cerca · Según tu Agenda y tus sesiones).
- «Ya está publicado tu resultado. Ver nota — 13,9 de 18 puntos · I2 · Canvas lo muestra en puntos, sin nota sobre 7.» (**aquí GradeHub gana: UniversidApp no convierte puntos a nota 1,0–7,0 ni muestra promedio**).
Cada tarjeta tiene «Ahora no» y «Eliminar». **Buena procedencia de cada recomendación.**
Pendientes: editor tipo bloque («Escribe / para ver los tipos de línea», «Agregar una línea debajo», «Mover o abrir las opciones de la línea») y «Guardados» («Arrastra aquí un título para guardarlo…»). **Sin tareas precargadas ni guía en el estado vacío.**
Nombre de ramo mal formateado: «Calculo II», «Introduccion a la Programacion», «Dinamica» (sin tildes, viene del import).

## 19. Semestre, cierre de semestre y «Editar ramo»

Fuente: https://universidapp.cl/ramos y /ramos?ramo=<id>&tab=material

**Selector de semestre:** botón «Semestre 2026-2, el de ahora. Cambiar» (Help: Elegir semestre) abre un menú `Semestre` con **una sola opción**: «2026-2 · Segundo semestre · En curso».
- **No hay semestres anteriores ni histórico**: al ser la primera importación, no aparece nada cerrado. **No existe ningún «cierre de semestre»**: ningún flujo de fin de período, nota final acumulada, archivo de ramos ni «ver semestres pasados». Es el mismo hueco que GradeHub, pero aquí además falta la noción de período pasado.
- Las tarjetas de ramo repiten el código «2026-2» delante del nombre (ruído: «2026-2 Dinamica FIS1514-13»).

**Menú «Opciones de <ramo>»:** Ver programa / Actualizar programa / Ajustes.

**Diálogo «Editar ramo»** (bueno en general): «Nombre del ramo*» (con asterisco de obligatorio), «Semestre» (2026-2 (actual)), **Color** con 10 nombres (Azul, Violeta, Fucsia, Rojo, Naranjo, Ámbar, Verde oliva, Verde, Teal, Gris azulado) + «Elegir otro color», Cancelar / Guardar; sección «Info del ramo» (botón «Info del ramo», Help «Ocultar info del ramo») con Profesor (Nombre, correo), Ayudante (Nombre, correo), Sala, Horario; y bloque **Eliminar** con dos niveles y su consecuencia explicada: «Programa — Quita el archivo del programa. Tus evaluaciones y requisitos se quedan.» / «Ramo — Se pierden sus notas, asistencia, material y evaluaciones del calendario.». **No se guardó ni se eliminó nada.**
- **Faltas:** no hay **créditos HTS/CR**, ni **pesos de las evaluaciones**, ni **fecha de inicio/término del semestre**, ni campo «nota mínima / nota de aprobación» del ramo (GradeHub pide pesos y umbral de aprobación para su simulador).
- Buen detalle de arquitectura: el diálogo mantiene los nombres de color en español y un color propio por ramo, que se usa después en el calendario y el horario (consistencia de color muy lograda).

**Pestañas del ramo (7):** Material, Anuncios, Tareas, Notas, Requisitos, Personas, Módulos. **«Cómo ordenar tu material»**: radio group Amplia / Detallada / Del profesor, cada una con Help que explica el criterio. Buena opción para el desorden real de Canvas.

## 20. Comparativa GradeHub vs UniversidApp (resumen)

**(a) Qué GradeHub debería COPIAR igual:** conexión real a Canvas (import de ramos, notas, anuncios, material, «Traer cursos desde Canvas»); import de programa/PDF con extracción de evaluaciones y fechas; «Cómo ordenar tu material» (Amplia/Detallada/Del profesor); «Para ti» con procedencia («Según tus exámenes de práctica», «Según tu Agenda y tus sesiones»); **Espacio de estudio** con Tutor anclado a fuentes, Resumen, Mapa conceptual, Flashcards, Podcast, Examen de práctica (5/10/15, tipo, dificultad, con/sin tiempo, revisión «Por qué»); «Cuaderno» y «Archivos» como destino de lo que genera la IA; «Instrucciones del Tutor (Solo aquí)»; onboarding en videos cortos («Cómo usar la app»); «Editar ramo» con color y consecuencia explicada al eliminar; diálogos de confirmación («¿Entregar con preguntas sin responder?»); toast con **Deshacer**; Help/Tooltips casi en cada control; modo «Por horario» del tema oscuro.

**(b) Qué GradeHub ya hace MEJOR:** promedio ponderado y **nota sobre 7,0** (UniversidApp muestra «13,9 de 18 puntos · Canvas lo muestra en puntos, sin nota sobre 7» y no la calcula); «necesitas X para aprobar»; simulador por ramo y de semestre; pautas precargadas; calculadora puntaje→nota; agenda con **.ics** exportable; estadísticas e historial; **conector MCP** para agentes de IA; catálogo de universidades y planes de estudio (UniversidApp depende de Canvas: sin Canvas, el import es manual); curvas de distribución y ranking.

**(c) Qué GradeHub debería MEJORAR o AGREGAR:** herramientas de estudio con IA (tutor con fuentes, flashcards, exámenes de práctica, resumen, mapa, podcast) — hoy no tiene; import desde LMS (Canvas) y sincronización de notas/anuncios; carga de PDF del programa con fechas automáticas; calendario semanal visual con pastillas por ramo; recomendaciones con procedencia; memorias/preferencias de IA con control de olvido; privacidad explícita (no entrenar con tu contenido, RUT hasheado, «nunca lo mandamos a una IA»); onboarding en video; notificaciones y buzón; modo oscuro automático; exportar lo generado (el mapa como imagen ya lo hace UniversidApp; sumar PDF y .ics de estudio); multi-idioma/no mezclar inglés («This video is unavailable», AM/PM). Y arreglar sus propios puntos débiles: catálogo de universidades, cierre de semestre claro, secciones que cargan para siempre.

## 21. Top 10 problemas de UniversidApp

1. **No convierte puntos a nota 1,0–7,0 ni calcula promedio ponderado** (nota clave del encargo). Solo «13,9 de 18 puntos».
2. **No existe «¿cuánto necesito para aprobar?» ni simulador** de examen/nota final, ni peso de evaluaciones configurable.
3. **Sin historial ni cierre de semestre**: selector de semestre con una sola opción, sin períodos pasados, sin nota final acumulada ni archivo.
4. **Transcripción de YouTube puede quedar cargando para siempre** («La transcripción empieza sola en cuanto el video termina de carga…») sin error ni timeout; el embed muestra «This video is unavailable».
5. **Falla real del Tutor** con video no transcribible: «No pudimos generar la respuesta por una falla nuestra.» ×2; el texto no dice la causa.
6. **Alucinación de fecha en flashcards** («Domingo 25 de octubre de 2026» cuando el PDF dice 4 de octubre) — sin cita de la fuente en cada tarjeta.
7. **Monetización invisible**: no hay página de planes/precio, solo «Uso semanal 1 %… Se renueva el 1 de diciembre»; no se sabe qué pasa al agotarse.
8. **Accesibilidad**: botones de tema sin estado seleccionado (`aria-pressed`), grupo de tabs de IA cortado horizontalmente, reloj en AM/PM en una app en español, diálogos con foco difuso, texto de Help no siempre anunciado.
9. **Borrado sin confirmación** de estudios («Borrar estudio») — tiene Deshacer, pero el de ramo es irreversible y sin casilla de confirmar; y nombres de ramos importados sin tildes («Calculo II», «Dinamica», «Introduccion a la Programacion») sin opción de corregir en masa.
10. **Estados vacíos sin acción** en Inicio/Pendientes/Guardados (un editor tipo bloque sin guía), y «Pendientes» no se alimenta de las evaluaciones de Canvas: se pierde la conexión entre la agenda y las tareas.

## 22. Veredicto

UniversidApp es **la mejor app de estudio en español que hay hoy para quien usa Canvas**: gana en conexión real con el LMS, orden del material, calendario/horario visual, tono de texto humano y en herramientas de IA amplias y bien integradas (Tutor con fuentes, resumen, mapa, flashcards, podcast, examen de práctica con revisión «por qué»), y su transparencia de privacidad es de referencia. GradeHub **gana donde a la mayoría le juegan los exámenes: la matemática de la nota** — promedio ponderado, nota sobre 7, «necesitas X para aprobar», simulador, pautas, calculadora puntaje→nota, historial y .ics/MCP. El producto ganador sería la capa de notas y simulación de GradeHub dentro del flujo de cursos y la IA de UniversidApp. Riesgos a vigilar de UniversidApp: dependencia de Canvas, la nota 7 ausente, el crédito semanal invisible y los estados de carga eternos.

## Pages from the result
- screens_audited: https://universidapp.cl/aprender/espacio/<id>
- screens_audited: https://universidapp.cl/ramos?ramo=<id>&tab=material|anuncios|tareas|notas|requisitos|personas|modulos
