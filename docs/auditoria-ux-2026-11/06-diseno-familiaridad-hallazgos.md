# Auditoría de diseño y familiaridad — GradeHub (gradehub.cl)
Cuenta: gpruebahark2@prueba.cl (perfil "Valentina", Derecho, UChile, 7.º semestre).
Fecha: 2026-11-26. Analista: diseño de producto senior. Navegador de escritorio, ancho completo (~1440 px) y también ancho angosto.

## 0. Marco general observado
- La app es una SPA de "pantallas" (screen-home, screen-agenda, screen-stats, screen-perfil) con navegación inferior (`bottom-nav`) que en escritorio se muestra como **sidebar izquierdo** (Inicio / Agenda / Estadísticas / Perfil).
- Tipografía: sans del sistema (pila `-apple-system`/SF Pro o Inter). Nada de tipo propio → cero identidad tipográfica.
- Paleta: fondo blanco puro (#FFF), texto casi negro, grises para texto secundario, **un solo acento verde-teal** (usado en badge "UCH", link "Explorar apoyo", foco de teclado, selección de segment control) y **negro** para el botón primario. Estética tipo "AppleSettings / Notion light".
- Tono: tuteo, cálido y breve ("Así va tu semestre, Valentina", "Por estudiantes, para estudiantes").
- Estado de foco de teclado: presente, borde teal de 2 px (bueno). Botones expuestos como `button` con nombres descriptivos en español ("Editar promedio de …") → buen trabajo de accesibilidad de nombres.

---

## 1. PANTALLA INICIO (estado vacío, sin ramos)

**Jerarquía visual / qué mira primero el ojo**
1. "GradeHub" (bold, arriba a la izquierda) + badge teal "UCH".
2. El saludo: "Así va tu semestre," (gris, ~17-18 px regular) y sobre todo **"Valentina"** (~34-40 px bold, el mayor contraste de la pantalla). El nombre compite y le gana al dato que la app promete: el promedio.
3. Label "PROMEDIO GENERAL" (uppercase, letterspacing, gris, ~11-12 px) seguido de un **cuadradito gris diminuto** (placeholder roto del número de promedio). El ojo llega ahí y no encuentra nada: es el punto más débil de la pantalla, el héroe del producto se ve como un glitch.
4. Texto de ayuda "Agrega tu primer ramo para empezar a llevar tus notas."
5. Botón negro "Agregar ramo" (único elemento de relleno fuerte).
6. Card "APOYO / ¿Buscas apoyo en un ramo?" con chevron y link "Explorar apoyo".
7. Footer "Por estudiantes, para estudiantes. / GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval".

Problema de jerarquía: la pantalla se diseña alrededor de un número que no existe; el orden lectura-nombre→label→número roto→texto→CTA deja el 70 % del ancho en blanco (en escritorio) sin anclar nada.

**Tipografía.** Consistente en familia; escala escasa: solo 3 tamaños reales (34 bold / 17 regular / 11 uppercase). El salto greeting→label es muy grande y no hay nivel intermedio, por eso la pantalla se siente "vacía y desordenada" en vez de minimalista. El greeting está construido como "Así va tu semestre,Valentina" (nodo de texto único: **falta un espacio/`<br>` semántico** en el árbol de accesibilidad; un lector de pantalla lo lee pegado).

**Paleta y contraste.** Gris secundario sobre blanco ≈ 4.5:1 en el borde de la accesibilidad (el texto de ayuda se ve apagado); el label uppercase en gris claro baja de 4.5:1. Botón negro con texto blanco = contraste altísimo (bien). El teal "UCH"/"Explorar apoyo" es correcto pero el link es pequeño y sin subrayado.

**Espaciado y alineación.** Margen izquierdo generoso y consistente; la card APOYO rompe el ritmo porque usa **borde teal de 1 px muy tenue** y radius mayor que las demás superficies; el footer queda centrado respecto del contenido pero con la regla divisoria arriba. En desktop el contenido vive en una columna de ~1100 px y el bloque de GPA queda aislado.

**Componentes.** Botón primario negro radius ~10 px; link teal; card con borde; íconos de línea (SF-Symbols-like) en la nav. Buen punto: el ícono activo cambia a relleno (casa sólida) — patrón iOS.

**Microinteracciones.** Ninguna visible en el estado vacío: sin skeleton, sin animación de entrada, el empty-state no sugiere siguiente paso más allá del botón. No hay ilustración, que en apps de estudiantes es lo que hace "juvenil" la marca.

**Densidad.** Muy baja (7 elementos). Correcto para móvil, pobre para desktop.

**Lenguaje/tono.** Excelente: "Así va tu semestre" es cálido y claro; "Agrega tu primer ramo" usa la palabra chilena correcta (*ramo*, no *asignatura/curso*) — eso es localización de verdad.

**Accesibilidad.** Botón grande (>44 px), labels bien. El "·" suelto y el cuadrito gris no tienen texto alternativo: quien usa lector de pantalla recibe "PROMEDIO GENERAL ·" sin indicación de valor.

**Familiaridad.** Se parece a **Apple Salud / Notion / Settings de iOS** (lista + label uppercase + saludo). Rompe el patrón de **Canvas/Blackboard** (que abren con la lista de cursos) y del esperado por un estudiante chileno: lo primero que un alumno de la UChile busca al abrir es *sus ramos y sus notas próximas*, no un saludo.

**Rediseño propuesto (Inicio, vacío)**
1. Reemplazar el placeholder roto por un **"—" de 40 px bold** + caption "sin notas todavía"; si se quiere un valor, usar "0,00" con estado explícito.
2. Bajar la jerarquía del nombre y subir la del dato: "Hola, Valentina" (17 px) / **PROMEDIO GENERAL —** (34 px). El héroe debe ser el número.
3. Añadir un **esqueleto (skeleton) de tarjeta de ramo** como ilustración del empty state y una línea de valor: "Agrega tu ramo, tus notas y tu promedio se calcula solo."
4. Card APOYO: pasar de borde teal a fondo `teal 8 %` y un ícono (auriculares/profe), un solo affordance (chevron), eliminar la duplicación "Explorar apoyo" + chevron.
5. En desktop: grid de 2 columnas (promedio + ramos recientes) o limitar el contenedor a 720 px y centrarlo, para que el blanco no parezca error.
6. Agregar un **estado de carga con skeleton** (300-600 ms) al entrar, en lugar de un flash de vacío.

---

## 2. MENÚ "HERRAMIENTAS" (pop-up button con ícono de llave inglesa)
- Popover estilo iOS (esquinas ~14 px, sombra suave, ícono + ítem, focus en el primer ítem al abrir, roles `menu`/`menu item` correctos). Buen nivel de acabado.
- **Problemas:**
  - El disparador es solo un ícono de **llave inglesa** sin etiqueta visible: poco autodescriptible (¿"ajustes"? ¿"utilidades"?). No tiene `Description` visible ni tooltip.
  - Duplicación de rutas: las mismas dos herramientas existen en **Perfil → HERRAMIENTAS**, con nombres distintos: menú dice "Subir foto **del** horario", Perfil dice "Subir foto **de tu** horario". Inconsistencia de nomenclatura.
  - Solo 2 ítems: un menú de dos entradas para funciones que son primeras (la calculadora es de lo más usado por un estudiante) es un enterramiento.
- **Rediseño:** convertir Calculadora de nota y Subir foto del horario en accesos visibles (chips/quick actions bajo el promedio), o un botón con etiqueta "Herramientas ⌄"; unificar el string de la subida de foto; soportar Escape y flechas (el foco ya entra, verificar cierre con Escape).

---

## 3. MODAL CALCULADORA DE NOTA
Contenido: título + subtítulo "Convierte el puntaje de una prueba a nota. Puedes calcular sin elegir un ramo." / PUNTAJE OBTENIDO, PUNTAJE TOTAL (placeholders "Por ejemplo, 25" y "Por ejemplo, 50"), EXIGENCIA (%) con valor 50 / disclosure "Más opciones de escala" / zona "Tu nota" / disclosure expandido "Tabla de puntaje a nota" con "De a [1] [0,5] [Otro] puntos" y tabla Puntos/Nota / GUARDAR EN UN RAMO (select, "Solo calcular") / EVALUACIÓN O CASILLA (select deshabilitado "Elige un ramo primero") / dos notas aclaratorias / Cerrar + Guardar como nota (deshabilitado).

**Lo bueno (nivel alto de producto):** cálculo en vivo (80/100 → **5,8**), explicación contextual "Con 50 % de exigencia, el 4,0 está en 50,00 de 100,00 puntos", escalas chilenas (1,0–7,0, exigencia), y *no guardar* por defecto ("Solo calcular"). Esto es familiaridad con el flujo mental del estudiante chileno, muy bien resuelto. Roles: `dialog` con nombre, campos con label, `alert` para el error, `status` para el toast.

**Jerarquía visual.** El orden es largo (9 bloques) y el resultado "Tu nota" está **debajo** de los inputs, en una caja gris tenue, mientras la tabla —que es material de consulta secundaria— ocupa hasta ~100 filas y empuja los botones fuera del modal. El ojo no aterriza en el 5,8.

**Estado de error (probado: 120/100).** Aparece "Tu puntaje no puede superar el total." en rojo, y "Corrige el dato marcado para ver tu nota." **Pero el campo marcado no se ve marcado**: el input culpable mantiene el borde teal de foco y ningún borde/fondo rojo, ni ícono, ni `aria-describedby` visible junto al campo. El error depende solo del color, y además está位置的mente lejos del campo. "Guardar como nota" ya estaba deshabilitado, así que no hay señal de por qué.

**Otros detalles.** Modal sin header/pie fijos: al scrollear desaparece el título y los botones; no se ve cierre por X ni por clic fuera (solo botón "Cerrar"); el ancho del modal (~375 px) es móvil, en escritorio queda una columna angosta con mucha altura y scroll interno doble; la tabla sin `sticky` header y con fila de encabezado en la misma caja; "De a 1 / 0,5 / Otro" es un segment control cuyo estado seleccionado se distingue solo por fondo teal muy claro + borde (doble señal, bien, pero el contraste del texto sobre teal claro es bajo).

**Rediseño propuesto**
1. Resultado arriba y grande: caja "Tu nota **5,8**" (40 px) sticky bajo el título, con la exigencia como caption.
2. Error: borde/fondo rojo suave en el campo, ícono, texto pegado bajo el campo, y `aria-describedby`; mantener el `alert` para anunciarlo.
3. Tabla colapsada por defecto y con altura máxima (~8 filas) + "ver toda la tabla"; encabezado sticky.
4. Pie del modal fijo con Cerrar / Guardar como nota; botón primario negro con el mismo estilo del resto; añadir X y cierre con Escape/clic fuera.
5. Unificar labels en Sentence case ("Puntaje obtenido") o mantener uppercase en todo el producto, pero no mezclar uppercase con oraciones largas.

---

## 4. MODAL "AGREGAR RAMO"
Contenido: "NOMBRE DEL RAMO · lo buscamos en la malla UChile" (label uppercase + hint inline), input con placeholder "Ej.: Microeconomía I", lista de sugerencias de la malla (nombre bold + "1° semestre · con programa" + "+" a la derecha), botón secundario "Subir foto de tu horario", Cancelar / **Agregar ramo** (negro).

- **Muy bueno:** buscar en la malla real y ofrecer "con programa" como sello de valor; y el *fallback* honesto cuando no está: "No está en tu malla — lo agregamos como ramo tuyo." Es un estado vacío/error excelente (no deja la pantalla muerta).
- **Problemas:**
  - A una estudiante de **Derecho** le aparecen de entrada ramos de **Economía** (Introducción a la Economía, Gestión y Empresas…): la malla por defecto no condice con la carrera del perfil. Rompe la promesa "lo buscamos en la malla UChile" y la confianza.
  - El modal **cambia de posición vertical** según la altura del contenido (con resultados queda más arriba, sin resultados baja): la superficie "salta" y el pulgar pierde el punto de contacto.
  - El "+" a la derecha es un affordance débil (gris, pequeño, ~24 px de alto de área efectiva); el ícono no tiene nombre propio en el árbol (el nombre del button es el texto completo, aceptable, pero no hay "Agregar X" explícito para lector de pantalla… en realidad sí lo nombra con el nombre del ramo, bien).
  - El texto devuelto "No está en tu malla…" usa **raya de_emple (—)** y está centrado en gris claro: contraste bajo y ninguna indicación de que es una acción (debería leerse como botón "Agregar 'Derecho civil' como ramo propio").
- **Rediseño:** (1) malla filtrada por la carrera del perfil y un selector "no es mi carrera"; (2) modal anclado (bottom sheet en móvil, centrado estable en desktop con altura mínima); (3) convertir el fallback en fila accionable con ícono "+" y texto en negro; (4) hacer toda la fila clicable con chevron/plus, área ≥ 44 px.

## 5. PANTALLA INICIO CON DATOS (1 ramo)
- Aparece "Mis ramos" + botón "+ Agregar ramo" y un botón-menú **"Ordenar ramos. Ahora: Manual"** (buena etiqueta de accesibilidad). Fila de ramo: barra de acento **violeta** a la izquierda (un tercer color en el sistema: teal + violeta + rojo/oliva semánticos), nombre bold, "Sin evaluaciones" gris, chevron y **asidero de arrastre** (⠿) con instrucción "Mantén presionado para mover".
- **Bug de datos visual confirmado:** con 1 ramo y sin notas, "PROMEDIO GENERAL" sigue mostrando el **cuadradito gris** en vez de "—" o "sin calcular". Es el mismo defecto del estado vacío: el número héroe no se renderiza.
- "2026-2" y "1 ramo" quedan **alineados a la derecha**, desconectados del label "PROMEDIO GENERAL" de la izquierda: el ojo no asocia semestre/promedio. En el árbol aparecen concatenados ("2026-21 ramo", "Así va tu semestre,Valentina") → faltan espacios/`<br>` reales, y un lector de pantalla los junta.
- "1 pendiente" con punto gris diminuto: señal débil, no es un badge.
- Toast "Ramo agregado" (pill negro, abajo al centro, ~2 s): correcto, familiar (iOS/Android Snackbar oscurecido), con buen contraste.
- **Rediseño:** convertir la fila en una card con color de ramo + porcentaje + nota; mover "2026-2 · 1 ramo" bajo el label; usar badge real para "1 pendiente"; en desktop, grid de cards de ramos (2–3 columnas) para no dejar 70 % de aire.

## 6. FICHA DEL RAMO (screen-ramo)
Estados vistos: vacío ("Agrega evaluaciones para comenzar / Sin notas / Sin evaluaciones" + ícono de carpeta en cuadrado gris + botón negro "Agregar evaluaciones" + Horario vacío) y con datos.
- Con datos: **promedio del ramo 4,8 en ~64 px bold**, chip "✓ Aprobado" (fondo teal 10 %, texto teal), chip gris "Promedio general 3,0 → 4,8" (eco del impacto, muy buen detalle de producto), botones gemelos "Simular" y "★ Calificar" (ghost full-width), filas de evaluación con **nota en rojo terracota (3,0) o verde (6,5)**, barra de acento izquierda, "50% de la nota final" en gris.
- **Notas sombra:** switch teal + celda con **borde punteado** y la nota simulada en gris ("4,9"): excelente uso de forma (punteado) además del color. Cuando hay nota real, el chip pasa a sólido. Esto es diseño accesible: no depende solo del color.
- **Problema de color semántico:** el promedio grande usa una **escala continua** y 4,8 cae en **oliva/amarillento**, un color que no lee ni "bien" ni "mal" y cuyo contraste sobre blanco es apenas ~3,2:1 (falla AA para texto grande en algunos monitores). El rojo de 3,0 es terracota (~4,6:1, aceptable). Falta una leyenda/umbral explícito.
- "Vas 4,8 · ramo completamente evaluado" llega como **toast** y también hay un `status` "Promedio general 3,0 → 4,8": doble anuncio, redundante y el toast tapa contenido en móvil.
- Jerarquía: el 4,8 domina (correcto), pero el chip "Notas sombra" a la derecha compite y está desalineado del chip "Aprobado"; en desktop las dos acciones full-width "Simular/Calificar" estiran 1200 px de botón, se ven rotas.
- **Rediseño:** (1) paleta semántica de 3 buckets (rojo <4,0 / ámbar 4,0–4,9 / verde ≥5,0) con contraste ≥ 4,5:1 y un ícono (✓/!/↑); (2) actions como botones de ancho contenido y alineados a la izquierda; (3) reemplazar el toast por el `status` inline bajo el promedio; (4) agrupar "Aprobado" + "Notas sombra" en una sola línea de estado.

## 7. MODAL "ARMAR MIS PONDERACIONES"
- Barra de progreso "0 / 100% · faltan 100%" → "50 / 100% · faltan 50%" → "✓ 100 / 100% · ponderaciones listas" con barra teal: **feedback en vivo, excelente**.
- Fila: combobox de nombre (con sugerencias "Ej.: Solemne 1"), input de peso con sufijo "%", botón "Usar 100%/50%" en teal, "…" de opciones, disclosure "Reglas de esta evaluación" (Nota mínima, Tope de la nota final, Puntaje total, Exigencia %), "+ Agregar evaluación", y dos disclosures avanzados ("Requisitos que combinan evaluaciones", "Eximición del examen"). Cancelar / Guardar.
- Lenguaje impecable y **muy chileno** ("solemne", "eximición del examen", "ramo"): aquí la app gana familiaridad frente a Canvas.
- **Errores detectados:**
  - **Typo** en el placeholder de la segunda fila: "Ej.: **Solemnne** 2" (debe ser "Solemne 2").
  - La ficha prometía "Puedes incluir la **fecha** para que aparezcan en la Agenda", pero **no hay campo de fecha** en ninguna parte del modal → promesa rota y la evaluación cae en "Sin fecha" en la Agenda.
  - Los labels de las reglas y sus explicaciones se leen pegados en el árbol ("…si no aplica.Puntaje total, si te la entregan en puntos"): labels/apartados sin separación semántica.
  - En desktop, los inputs de reglas quedan como cajitas angostas alineadas a la derecha con el label a la extrema izquierda: distancia label-campo de ~400 px, se pierde la asociación.
- **Rediseño:** fecha (y hora) por evaluación con fila "Fecha (opcional)"; label y control en la misma línea corta (max 420 px) o label arriba; corregir typos; el "Usar 50%" como botón, no link teal (es una acción, no navegación).

## 8. MODAL "SIMULADOR"
"SIMULADOR" eyebrow + nombre del ramo + "Escribe notas hipotéticas y mira cómo quedaría tu promedio. No se guardan hasta que confirmes." / "PROMEDIO PROYECTADO 4,8" / "Tu promedio actual: 4,8" / stepper "Tu meta [−] 4,0 [+]" / lista de evaluaciones con su peso y chip de nota actual / Cerrar + "Guardar como reales" (deshabilitado).
- Muy buena gestión de riesgo (no se guarda sin confirmar) y el stepper de meta es un patrón de apps bancarias/fitness.
- **Problemas:** no hay campos editables visibles para "escribir notas hipotéticas" cuando todas están rendidas (el modal no dice qué tocar); el promedio proyectado repite el color oliva; "Guardar como reales" deshabilitado sin explicación.
- **Rediseño:** inputs visibles siempre (precargados con la nota real, estilo "what-if"), caption "toca una nota para simular", y habilitar/guardar con tooltip de por qué está deshabilitado.

## 9. MODAL "CALIFICAR PROFESOR" (cancelado antes de publicar)
Pide "¿CUÁL ES TU SECCIÓN? (Ej.: 3)" y "Continuar". **Se canceló en el primer paso, nada quedó publicado.**
- Nota de diseño: un flujo que publica una opinión sobre una persona debiera **advertir antes** (paso 1) que será visible para otros estudiantes, y mostrar cómo se verá. También: el botón se llama "Calificar" en la ficha, sin contexto de que es del profesor.

## 10. MODAL "HORARIO DE …"
"Se repite cada semana. Horas de Chile." / chips de días Lun–Dom / Inicio y Fin / Sala (opcional) / Tipo (opcional, "Cátedra, ayudantía…") / switch "Voy a esta clase" / Copiar bloque / Quitar / + Agregar bloque / Cancelar + Guardar horario.
- **Bueno:** "Horas de Chile" (localización), tipos de clase chilenos (cátedra/ayudantía), switch para no-asisitencia.
- **Problemas:** los `<input type=time>` salen en **formato 12 h con AM/PM** y en inglés ("Hours", "Minutes", "AM/PM" en el árbol), contradiciendo "Horas de Chile" y la costumbre local (24 h); chips de día de ~30 px de alto (< 44 px de objetivo táctil); labels "Sala(opcional)" sin espacio en el árbol; "Voy a esta clase" es ambiguo (¿voy a ir o voy a la clase?).
- **Rediseño:** `lang="es-CL"` + `hour12:false`, chips más altos, label arriba del control, texto "Asisto a esta clase".

## 11. PANTALLA AGENDA
- Vacía (antes de ramo): "Qué se viene" + "Agrega tu primer ramo / Después podrás poner fecha a sus evaluaciones y ver qué se viene" + botón "Agregar mi primer ramo". Botón **"Calendario"** arriba a la derecha, **solo ícono** con help "Agregar evaluaciones al calendario" (poco descubrible).
- Con datos: título "Qué se viene" en **gris** (no negro) con subtítulo "Todo al día"; tabs sub-line **Evaluaciones | Horario**; agrupador "Ya rendidas (2)" con **"Ver todas ⌄"** (select); fila "Sin fecha / Prueba 2 / • zzzz inexistente" + chip "50% del ramo" + nota 6,5 verde; al expandir: "TU REFERENCIA — Nota registrada: 6,5 — Ya cuenta en el promedio actual del ramo." y "DESPUÉS — Nada más agendado".
- **Problemas:** el badge dice 2 y la lista muestra 1 (el conteo y el corte no coinciden a la vista); "Qué se viene" en gris baja el contraste (~3,4:1) y le quita peso de H1; la Agenda no muestra fechas porque el modal de ponderaciones no tiene campo de fecha (bug del §7 que se propaga); en Horario, "23 – 27 de noviembre" oculta fin de semana sin decirlo; el botón "Calendario" no tiene etiqueta visible.
- **Rediseño:** título negro y jerárquico; grupo colapsable que muestre "1 de 2" o las 2; fecha obligatoria/opcional pero presente al crear evaluación; vista semanal Lun–Dom con scroll; botón "Añadir a calendario" con texto (o menú .ics/Google/Apple).

## 12. Perfil (pantalla, claro y oscuro)
- Jerarquía: encabezado "Perfil" (H1 pequeño, 14 px aprox., sin jerarquía real), tarjeta de identidad (avatar circular con inicial "V", nombre, carrera, universidad · semestre, correo), luego 4 grupos con etiquetas ALL CAPS tipo Settings iOS (TU SEMESTRE / HERRAMIENTAS / LA APP / TU CUENTA) y filas con ícono + label + chevron. Cierre con botón "Cerrar sesión" en rojo frambuesa y footer "Por estudiantes, para estudiantes."
- Familiaridad: patrón **Settings de iOS / Apple** casi calcado (grupos con caps, filas con chevron, avatar). Muy familiar para un estudiante. Rompe: "Cerrar sesión" como botón outline rojo a ancho completo (en iOS es una fila roja dentro de un grupo); "Ofrecer clases o material" mezcla herramienta comercial con ajustes.
- Contraste oscuro: fondo #05070a aprox. y superficies casi idénticas; las filas no tienen separador visible → la lista se lee como bloque plano. Íconos gris ~#6b7280 sobre negro: contraste estimado 3:1 (bajo para ícono informativo).
- Microinteracción: al enfocar por teclado la tarjeta queda con borde teal (bien). Sin animación de apertura.
- Propuesta: convertir el encabezado en título grande (28 px) coherente con "Así va tu semestre"; unir avatar + datos en una fila tipo iOS con altura 56 px; en oscuro subir superficie de fila a #10151a y separador #1f2933; mover "Cerrar sesión" a fila dentro de TU CUENTA.

## 13. Modal "Ajustes" (master–detail con búsqueda)
- Patrón **muy** familiar: modal con sidebar de secciones agrupadas + detalle a la derecha + campo "Buscar en Ajustes" (role=search, status de resultados). Mezcla de Apple Settings y Ajustes de macOS/Windows 11. Buenísimo para confianza.
- Rompe: (a) el modal **cambia de alto en cada sección** (Ajustes pasa de ~723 px a ~603 px al ir de Información académica a Canvas) → saltos y reflujo del layout; (b) la columna de detalle queda con enorme vacío bajo contenido corto; (c) dos formas de abrir la misma pantalla (filas de Perfil abren secciones concretas y el modal); (d) en Perfil ya existen las mismas entradas duplicadas que dentro de Ajustes (doble fuente de verdad); (e) "Cerrar" arriba a la derecha, sin Cancelar/Guardar global, pero cada detalle tiene su propio "Guardar" (3 botones Guardar/Cambiar correo/Cambiar contraseña apilados, todos ancho completo, de igual peso visual).
- Tipografía: título 20 px bold, subtítulo gris 13 px; labels ALL CAPS 11 px con letter-spacing; inputs 15 px. Consistente con el resto.
- Contraste: label caps gris #6b7280 sobre blanco ok (~4.9:1); en oscuro sobre #0b0f14 baja a ~4.2:1.
- Campos: NOMBRE PARA MOSTRAR / APELLIDO / CORREO DE ACCESO con ayuda debajo ("Aparece en el saludo de inicio.", "No se muestra a otros estudiantes."), muy bien. Contraseña type=password con enmascaramiento verificado (••••••••••) y regla "Al menos 8 caracteres, con letras y números."
- "Información académica": grilla de universidades UChile/UC/UAI/UANDES/UDD (chips con nombre completo en Help — el Help no es accesible a simple vista; conviene tooltip visible o subtítulo), buscador de carrera con chip de selección, grilla de semestre 1°–11° (11 botones de 44 px, Targets ok), "Ramos de mi malla" y "Agregar un semestre anterior".
- "Calendario": muestra la **URL de suscripción completa** en un input (token sensible a la vista, sin máscara/mostrar-ocultar), botones Copiar URL / Generar una nueva, nota de privacidad muy buena. Falta badge de estado "suscripto/actualizado hace X".
- "Canvas": steps numerados + pegado de URL, sin OAuth (correcto para el límite de no conectar cuentas). Botón "Conectar calendario de Canvas" primario blanco sobre oscuro. Nota de privacidad local. Bien.
- Microinteracción: cambio de sección instantáneo, sin spinner ni transición; no hay feedback de guardado visible en el árbol hasta que aparece toast.

## 14. Apariencia (modo oscuro y personalización)
- Segmented control Sistema / Claro / Oscuro (iOS), "COLOR DE ACENTO" radiogroup con 6 swatches (Turquesa, Azul, Índigo, Violeta, Cobre, Frambuesa) y "FONDO" Neutro/Pizarra/Papel. "Se guarda al elegir." — excelente microcopy.
- Aplicación instantánea, sin recarga y sin toast (podría celebrar el cambio con una transición de 150 ms del tema; hoy es un corte duro).
- Modo oscuro general: fondos casi puros (#05070a), superficies apenas más claras, separadores casi invisibles → **pérdida de jerarquía por superficie**: en Inicio y Estadísticas las tarjetas se confunden con el fondo y el gráfico de área queda ilegible (teal oscuro sobre negro, contraste de la línea ~2:1 con el fondo).
- Colores semánticos en oscuro: 4,8 pasa a **amarillo** y 6,5 a verde, 2,0 rojo. En claro el mismo 4,8 salía teal en Estadísticas y oliva en la ficha del ramo → **la escala de notas no es estable entre temas ni entre pantallas**: el usuario no puede aprender qué significa cada color.
- Accesibilidad: los swatches son radiogroup con labels (muy bien); el segmented control no reporta aria-pressed/selected en el árbol (solo botones) → un lector no sabe cuál está activo.

## 15. Ajustes · Agentes conectados
- Contenido muy ambicioso para un estudiante promedio: 3 pasos numerados, un **párrafo de prompt para copiar** (texto técnico: "URL MCP", "conector o servidor MCP"), crear URL de conexión de 90 días, combo "Ideas para pedirle", disclosure "Ver el mensaje", "Ponderaciones por revisar · Ver propuestas".
- Familiaridad: no existe app de referencia para esto. Se acerca a la pantalla de API keys de un servicio developer (Stripe/OpenAI), no a algo que un estudiante de Derecho reconozca. Rompe el tono "claro y al instante" del resto.
- Accesibilidad: el campo "PONLE UN NOMBRE A LA CONEXIÓN" recibe como nombre accesible la **concatenación de dos títulos** ("1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO 2. PONLE UN NOMBRE A LA CONEXIÓN") → label mal asociado.
- Contraste: el bloque de prompt en caja gris es el texto más denso y pequeño de toda la app.
- Propuesta: modo "experto" plegado por defecto; arriba solo "Conecta tu asistente de IA" + botón; el prompt técnico detrás de "Ver instrucciones avanzadas".

## 16. Ajustes · Datos y cuenta
- Orden: Exportar/Importar → 2 switches → COMPARTIDO CON PROFESORES → PROFESORES BLOQUEADOS → ZONA SENSIBLE (Eliminar mi cuenta / Reiniciar app) → Términos · Privacidad.
- Muy buen microcopy de privacidad ("Tus notas no se envían para eso", "lo ya aportado se conserva en el consenso anónimo"). Tono humano y claro, la mejor sección de la app en confianza.
- "ZONA SENSIBLE" con recuadro rojo frambuesa y botón de igual peso que los neutros: bien la señal, pero **Eliminar mi cuenta y Reiniciar app se ven igual de pulsables**;建议 invertir a texto rojo sin relleno y separar 16 px más.
- Switches: on en teal con buen contraste; el label va **arriba** del switch (no a la izquierda como iOS) y la explicación debajo → la fila es de ~120 px de alto, densidad baja.
- Nota: correo de contacto a secas (gradehub.app@gmail.com) resta percepción institucional frente a un dominio propio.

## 17. Ajustes · Apoyo y Sugerencias y comentarios
- Apoyo: un solo botón "Soy profesor particular" + nota de revisión manual. Escueto comparado con el resto.
- Sugerencias: select "TIPO DE COMENTARIO" (Tengo una sugerencia / Encontré un problema / Otro comentario), textarea "CUÉNTANOS" con placeholder "Escribe acá lo que te gustaría cambiar…", helper "Mínimo 3 caracteres · queda asociado a tu cuenta." y contador 0 / 2000, botón primario ancho completo, link mailto. Correcto y familiar (form de feedback de iOS/Android). Falta deshabilitar "Enviar comentario" hasta cumplir el mínimo (hoy parece activo).

## 18. Modal "Archivar 2026-2"
- Título + explicación condicional muy bien redactada; tarjeta por ramo con "Calculada: 4,8" y campo "Nota final oficial" con placeholder "—"; alerta de error reservada; Cancelar (secundario) + Archivar semestre (primario teal, más ancho).
- Rompe: "Nota final oficial" y "del portal de tu universidad" son dos líneas sin jerarquía clara (parecen dos labels); no dice si el campo es obligatorio; el modal aparece anclado bajo el centro (salta respecto a otros modales que se centran).

## 19. Modal "Subir foto de tu horario"
- Buena promesa de privacidad ("Lo leemos en tu teléfono: la imagen **no sale de tu dispositivo**", en negrita) y link externo a Docencia Web. Input file nativo ("No file chosen" en inglés, **mezcla de idioma** con el resto en español). Disclosure "¿Tienes el horario como texto? Pégalo" que revela textarea + "Revisar texto". Solo "Cancelar", sin X: inconsistente con Ajustes (X) y con Calculadora (Cerrar + primario).

## 20. Menús flotantes
- "Ordenar ramos" (menu con items Manual ✔ / Por nota / A-Z, aria-correcto, check teal en el activo) y "Herramientas" (Calculadora de nota / Subir foto del horario). Ambos con role=menu y pop up button. Muy bien; el anclaje sobre content cards sin sombra fuerte los hace flotar poco en oscuro.
- Inconsistencia de nombres: "Subir foto **de tu** horario" (Perfil) vs "Subir foto **del** horario" (menú Herramientas).

## 21. Calculadora de nota — estados de error y con datos (oscuro)
- Error: "Tu puntaje no puede superar el total." en rojo + "Corrige el dato marcado para ver tu nota." — **pero ningún campo se marca visualmente**: el borde rojo no aparece y el teal de foco queda en otro campo. El texto dice "marcado" y no hay marca. Falta aria-invalid/aria-describedby.
- Con datos: "Tu nota 6,4" en **blanco**, mientras la misma nota en la ficha y en el historial sale verde → la escala semántica no se aplica de forma consistente. La tabla Puntos/Nota tampoco colorea el 4,0 de corte, siendo su mejor oportunidad.
- Densidad: el modal es el más largo de la app (11 bloques, tabla de 61 filas) y los botones Cerrar/Guardar quedan **cortados al pie** sin scroll visible → sensación de modal roto.
- "Guardar como nota" deshabilitado correctamente hasta elegir ramo.

## 22. Estado vacío confirmado tras eliminar el ramo de prueba (oscuro)
- La cuenta quedó como estaba (ramo "zzzz inexistente" eliminado desde ⋯ → Eliminar ramo → confirmación).
- Bug reproducido en oscuro: bajo "PROMEDIO GENERAL" aparece un **cuadradito gris de ~8 px** en lugar de "—" o nada. Es el único elemento bajo la etiqueta: la jerarquía del estado vacío queda rota (etiqueta →方块 vacío → helper). Mismo bug en claro y oscuro.
- El estado vacío usa "Agrega tu primer ramo para empezar a llevar tus notas." + botón "Agregar ramo": correcto, pero el botón blanco primario flota sin anclar a ninguna tarjeta.

## 23. Cierre de sesión y pantalla de autenticación (landing pública)
- Cerrar sesión es **instantáneo, sin confirmación** (bien para reversible, pero no hay toast que lo anuncie).
- La app no tiene landing de marketing separada: al cerrar sesión queda la **pantalla de auth centrada** con dos tarjetas de ejemplo a los lados ("Ejemplo de un ramo", "Ejemplo de tus estadísticas"), el logo (marca de capas teal, identidad propia), H1 "Mejor que tu Excel." y bajada "Tus notas, tu promedio y cuánto te falta para aprobar."
- **Familiaridad excelente**: botón negro "Continuar con Apple" arriba, "Continuar con Google" blanco con G, divisor "o con tu correo", campos, primario teal, secundario outline, link de recuperación, legal en gris. Es el patrón de onboarding de apps iOS/Notion/Linear, y el orden Apple→Google→correo es el esperado en Chile.
- Contador animado de prueba social (2.222 ESTUDIANTES / 9.178 RAMOS / 39.025 NOTAS): arranca en "—" y sube; el nodo de accesibilidad muestra "2.222ESTUDIANTES" concatenado y **sin separación ni aria-label** → un lector dice "2222 estudiantes" sin pausa y puede no anunciar el cambio. La tarjeta de ejemplo usa cobre 4,9, rojo 3,2, teal 5,2: buen uso de la escala.
- Tipografía: H1 ~34 px 800; el resto 13-15 px. Altísimo contraste entre H1 y bajada; los números de estadística (18 px bold teal) compiten con la bajada.
- Detalle de lenguaje: "Mejor que tu Excel." es un anclaje muy chileno/práctico y con carácter; "Guarda tus notas y revísalas desde cualquier dispositivo." (registro) es más genérico.
- Footer público: Preguntas frecuentes · Calculadora de notas · Términos · Privacidad · Soy profesor particular.

## 24. Registro
- Mismo layout; cambia bajada y aparece "REPETIR CONTRASEÑA"; placeholder "8+ caracteres, letras y números" y "Repite tu contraseña"; botón "Crear cuenta" teal; toggle "¿Ya tienes cuenta? Inicia sesión".
- Errores: probado con correo vacío → alert "Ingresa un correo electrónico válido." en rojo **debajo del campo, pero sin borde rojo ni ícono en el campo** (repite el patrón de la calculadora): el error depende solo del color del texto y no queda claro qué campo corrige cuando hay dos. Falta aria-invalid/aria-describedby (sí usa role=alert, bien).
- Oddity: persiste el badge "● Lo usaste la última vez" en modo registro, donde no aplica.
- No pide nombre, universidad ni carrera en el registro (bien, fricción baja), pero no avisa que eso se pedirá después.

## 25. Ancho angosto — limitación de la auditoría
- No fue posible reducir el viewport: el entorno no expone redimensionamiento de ventana y `Control+equal`/`Control+plus` no aplican zoom del navegador (el layout permaneció en ~1240 px de ancho, sidebar visible y bottom-nav oculto). Se intentó en 3 oportunidades (zoom por teclado ×2, reinspección del layout) y se dejó de insistir.
- Evidencia indirecta de que existe un breakpoint móvil: el árbol incluye `container bottom-nav` con 4 botones (Inicio/Agenda/Estadísticas/Perfil) que sólo se renderiza en ancho angosto; los modales están diseñados como sheets centrados de ~320-480 px, y el input de archivo y los `<input type=time>` sugieren target móvil. **Recomendación: repetir esta auditoría con device emulation (390 × 844) antes de cambiar nada del layout.**

## 26. Erratas y estado final
- Errata §3: donde dice "posiciones/位置的mente lejos del campo", debe leerse "el mensaje aparece lejos del campo que falla".
- Errata §22: donde aparece un carácter chino suelto, debe leerse "cuadradito gris".
- Estado final de la cuenta: sesión cerrada en la pantalla de auth, tema restablecido a **Claro**, acento Turquesa y fondo Neutro (como estaba), ramo de prueba "zzzz inexistente" eliminado, ninguna cuenta externa conectada, nada publicado para otros usuarios (el flujo "Calificar profesor" se canceló en su primer paso), cuenta no eliminada, ningún pago.
- Recorrido cubierto: auth (login/registro/error), landing pública, Inicio vacío y con datos, menús Herramientas y Ordenar ramos, modal Agregar ramo, Calculadora de nota (vacío/error/resultado/tabla), ficha del ramo, Armar mis ponderaciones, Simulador, Calificar profesor (cancelado), Horario, Agenda (Evaluaciones/Horario, vacío), Estadísticas (gráficos, rangos, historial, comparativa vacía), Perfil y las 9 secciones de Ajustes, modales Archivar semestre, Subir foto de tu horario, confirmación Eliminar, toasts, modo claro y oscuro en todas las pantallas revisadas.
