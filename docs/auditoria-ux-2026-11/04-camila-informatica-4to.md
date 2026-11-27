# Auditoría UX GradeHub (gradehub.cl, producción)
Fecha de la prueba: 2026-11-26 (noche), Chile.

## Pantalla 0 — Landing / auth (https://gradehub.cl/)
Qué veo: heading "Mejor que tu Excel.", "Guarda tus notas y revísalas desde cualquier dispositivo.", contadores
(2.222 estudiantes / 9.178 ramos / 39.025 notas), botones "Continuar con Apple" y "Continuar with Google",
separador "o con tu correo", campos Correo electrónico / Contraseña / Repetir contraseña, botón "Crear cuenta",
link "¿Ya tienes cuenta? Inicia sesión", texto legal y footer (Preguntas frecuentes, Calculadora de notas,
Términos, Privacidad, "Soy profesor particular"). El form ya está en modo "Crear cuenta" al abrir el sitio.
- 🟡 El botón "Continuar con Apple" aparece en el árbol de accesibilidad pero NO se ve ni está etiquetado en el
  texto visible de la página (el texto visible solo muestra "Continuar con Google"): incoherencia DOM/visual.
- 🟠 El formulario de creación de cuenta NO muestra ninguna regla de contraseña (mínimo de caracteres, mayúsculas,
  etc.). No hay forma de saber si la contraseña es válida hasta presionar "Crear cuenta".
- 🟡 No hay checkbox explícito de aceptación de términos; la aceptación es implícita ("Al continuar aceptas...").
- Lo que sí está bien: el toggle "¿Ya tienes cuenta? Inicia sesión" es claro, el campo "Repetir contraseña" solo
  aparece en modo sign up, y el botón "Mostrar contraseña" existe en ambos campos.

## Paso 1 de 4 — "¿Cómo te llamas?"
Campos NOMBRE y APELLIDO. Luego un bloque "AÑO DE INGRESO A LA UNIVERSIDAD" con una *ruleta* (stepper no editable,
con flechas "Anterior"/"Siguiente") y un status que calcula el semestre: "Elige tu año de ingreso para calcular el
semestre." → al elegir 2023: "Vas en tu 8.º semestre." con botón "Cambiar".
- 🟠 Bug/UX: el control de año es un stepper (role=spinbutton) que NO acepta digitación ni pegado: setValue y
  tipear no cambian el valor (queda en 0). Solo funciona con las flechas. Para llegar a 2023 hay que hacer 3 clicks.
  Texto exacto del valor en el árbol: `stepper (settable) Description: AÑO DE INGRESO A LA UNIVERSIDAD, Value: 0`.
- 🟠 El onboarding NO pregunta la carrera ni permite elegir el semestre directamente: el semestre se infiere del
  año de ingreso. Alguien que repitió un año, entró en 2.º semestre o cambió de carrera queda con el semestre mal.
- 🟠 En el paso 1, el botón de retroceso se llama "Cerrar sesión" (ID: ob-back). En el paso 2 pasa a llamarse
  "Atrás". Cambiar de "Cerrar sesión" a "Atrás" según el paso es peligroso: en el paso 1 un usuario que quiere
  "volver" cierra la sesión recién creada. (En paso 1 no hay a dónde atrás, pero el label invita a destruir la cuenta.)
- Bien: el progreso "PASO 1 DE 4" y barra de progreso; el cálculo automático del semestre con "Cambiar" es un buen detalle.

## Paso 2 de 4 — "Camila, ¿cuál es tu universidad?"
Texto: "Elige dónde estudias. Podrás agregar tus ramos a mano."
Solo 5 botones, sin buscador y sin opción "otra universidad":
Universidad de Chile, Pontificia Universidad Católica, Universidad Adolfo Ibáñez, Universidad de los Andes,
Universidad del Desarrollo.
- 🔴 La Universidad Técnica Federico Santa María NO existe en el catálogo, y no hay buscador ni "otra": una alumna
  de la Santa María queda literalmente fuera del producto en el paso 2 del onboarding, sin salida.
  (En esta prueba se seleccionó **Universidad del Desarrollo** como alternativa regional y queda anotado.)
- 🟠 Botón "Continuar" deshabilitado sin explicación; no hay mensaje de "selecciona una universidad".
- 🟡 El status `ob-tenant-estado` existe pero no dice nada (no anuncia la selección a lectores de pantalla).

## Paso 3 de 4 — "¿Qué estudias?"
Texto: "Busca tu carrera. Si no aparece, puedes escribirla." Buscador + grilla con 46 carreras de la UDD.
- Muy bien: el buscador filtra al instante y aparece "Usar «Ingeniería Civil Informática»" cuando nada coincide, así
  que la carrera exacta de la Santa María sí se pudo escribir a mano. Se usó el nombre exacto del task.
- 🟡 Al hacer click en una universidad del paso 2, el onboarding AVANZA solo al paso 3 (no espera "Continuar").
  El botón "Continuar" aparece ahí, deshabilitado, y nunca se usó: inconsistente con el paso 1.
- 🟠 El paso 3 no recuerda/valida nada del semestre: no hay forma de corregir el semestre aquí.

## Paso 4 de 4 — "Elige tus ramos"
Texto: "Aún no tenemos una malla verificada para Ingeniería Civil Informática. Busca tus ramos o agrégalos a mano."
- 🔴 Bug: el bloque "TU SEMESTRE" aparece como un rótulo vacío — no muestra 2026-2 ni 8.º semestre, no hay nada
  debajo. La etiqueta queda sola con una línea divisoria. (Reproducible: onboarding → paso 4 → ver "TU SEMESTRE".)
- Bien: buscador de ramos funciona ("Bases" devuelve 6 ramos, "Bases de Datos" devuelve 1), etiqueta "fuera de malla"
  y botón "¿No aparece? Agregar un ramo a mano". Al seleccionar, el botón "+" pasa a checkbox tildado y el CTA pasa
  de "Continuar sin ramos" a "Continuar con 1 ramo" (bueno).
- 🟡 El buscador de ramos se limpia solo al seleccionar, sin mostrar los ya elegidos en una sección propia: se ve
  como "se perdió" la selección (hay que mirar el checkbox).

## Home después del onboarding (así va tu semestre)
- Saludo "Así va tu semestre, Camila" 🟡 (la coma pega el nombre a la línea; en el árbol sale "Así va tu semestre,Camila").
- "PROMEDIO GENERAL" muestra solo un punto/"·" 🟡 — estado vacío sin jerarquía; el número 2026-2 y "1 ramo" a la derecha.
- "Abre un ramo para ingresar tu primera nota." + "1 pendiente" 🟡 ("1 pendiente" sin explicar qué pendiente).
- 🟠 Modal "Ahora, las evaluaciones / 1 ramo agregado / Agrega las evaluaciones y sus porcentajes en cada ramo." con
  un solo botón "Ver mis ramos" y SIN botón de cierre (no hay "X" ni "Más tarde"). Al presionar "Ver mis ramos" el
  modal se cierra pero la página NO baja a "Mis ramos" ni abre nada: el botón promete algo que no hace.
- Nav lateral: Inicio / Agenda / Estadísticas / Perfil. Arriba a la derecha un ícono de llave inglesa sin rótulo
  (en el árbol: pop up button "Herramientas") 🟡 — icono ambiguo, parece "configuración" pero es "Herramientas".
- Tarjeta "APOYO — ¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos. Explorar apoyo": es publicidad
  de tutores; no se puede ocultar 🟡.
- Footer con nombres reales de los fundadores (Martín Sotomayor y Lucas Irarrázaval) — bien, transparencia.

## Agregar ramos desde el home (modal "Agregar ramo")
Campo "NOMBRE DEL RAMO · lo buscamos en la malla UDD", resultados con etiqueta "fuera de malla" (y "· con programa"),
botones Cancelar / Agregar ramo. Para un ramo inexistente aparece "No está en tu malla — lo agregamos como ramo tuyo."
Se agregaron 5: Bases de Datos, Ingeniería de Software, Computación Cuántica Aplicada (fuera de catálogo),
Aprendizaje Automático, Seguridad de la Información.
- 🟠 Bug: al tocar un resultado de la búsqueda el ramo **se agrega de inmediato y el modal se cierra**, de modo que
  el botón primario "Agregar ramo" queda muerto (intenta presionarlo después de elegir y da `node ... is not on the
  page`). Dos caminos, uno de ellos confuso.
- 🟡 El contador del home se pega al número: "2026-25 ramos" (debería ser "2026-2 · 5 ramos"). Ocurre con
  "2026-21 ramo", "2026-22 ramos", etc.
- 🟡 "Aprendizaje Automático" y "Seguridad de la Información" no están en la malla UDD mostrada: un electivo típico de
  4.º año queda "fuera de malla", o sea la malla de la carrera no cubre los electivos avanzados.
- 🟠 La pantalla de Estadísticas sigue diciendo "1 ramo y 0 evaluaciones configuradas" y "Falta configurar las
  evaluaciones de 1 ramo" cuando ya hay 5 ramos: el texto del estado vacío queda obsoleto (no se refresca).
- 🟡 "Simular el semestre completo" aparece recién cuando hay ramos, abajo de todo, después de la tarjeta de
  publicidad de apoyo: fácil de perder.

## Ficha del ramo (Bases de Datos)
Header: "Volver", nombre, "10 créditos", menú "…" (Opciones del ramo: Editar ramo / Editar evaluaciones / Eliminar ramo).
Estado vacío: "Agrega evaluaciones para comenzar", "Sin notas", "Todavía no tenemos las ponderaciones de este ramo",
"Ármalas con el programa del curso: el nombre de cada evaluación y su porcentaje.", botón "Armar mis ponderaciones",
sección "Horario" con "Agregar bloque".
- 🟠 Al guardar el ramo con sección aparece un botón gris de ancho completo "Reintentar" (accesible:
  "Reintentar consultar al profesor") sin ningún título ni explicación, y un toast
  "Este ramo o sección aún no está sincronizado. Espera un momento y reintenta." El guardado sí funcionó, pero el
  mensaje hace creer que falló. Pasos: Editar ramo → poner sección → Guardar.
- 🟡 El botón "Sumar una falta"/"Restar una falta" y "FaltasTe quedan 2 de 2." van pegados sin espacio.
- 🟡 En el modal "Editar ramo", la etiqueta "COLOR" queda pegada al texto del checkbox ("...ficha del ramo)COLOR").
- 🟡 "Sin profesor / Agrega y guarda la sección para calificar": la calificación de profesores está bloqueada hasta
  guardar sección, y el botón deshabilitado no explica el motivo con claridad.

## "Armar mis ponderaciones" (constructor de pauta)
Texto: "Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas."
Barra "0 / 100% · faltan 100%" → "40 / 100% · faltan 60%" → "✓ 100 / 100% · ponderaciones listas". Botón "Usar 100%"
que luego pasa a "Usar 60%". Por evaluación: combo de nombre (sugiere Solemne/Control/Examen), peso, "…" y
"Reglas de esta evaluación" (Nota mínima, Tope de la nota final, Puntaje total si te la entregan en puntos,
Exigencia (%)). Abajo: "Requisitos que combinan evaluaciones" ("Para cuando el programa exige un mínimo sobre varias
evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba." + "Agregar requisito")
y "Eximición del examen".
- Muy bien: es lo más potente del producto para años avanzados (nota mínima, tope, puntajes, exigencia, requisitos,
  eximición). La barra de progreso y "Usar X%" ahorran muchos clics.
- 🟡 El link "Usar 20%" de la última fila sigue visible cuando ya dice "✓ 100 / 100% · ponderaciones listas".
- 🟡 El rótulo del campo de peso dice "Peso de evaluación" en la fila recién agregada y solo después pasa a
  "Peso de Solemne", o sea la última fila queda sin nombre accesible hasta que se agrega otra.
- 🟡 Al agregar una fila se cierran los "Reglas de esta evaluación" que estaban abiertos.

## Ajustes → Herramientas (🔧) y BKP

**Ruta:** Perfil → Ajustes → botón "🔧" (sin rótulo) → menú: `Exportar mis datos (CSV)` / `Hacer copia de seguridad (BKP)` / `Restaurar desde una copia (BKP)` / `Pegar copia de seguridad`.
- "Exportar mis datos (CSV)" abre modal "Exportar mis datos" con botones `CSV` y `Imprimir en PDF`, ambos `disabled` hasta elegir semestres. Bien pensado, pero **el menú 🔧 no tiene nombre accesible ni rótulo** (🟡).
- "Hacer copia de seguridad (BKP)" abre modal "Copia de seguridad": texto "Una copia BKP guarda todo lo tuyo (perfiles, ramos, evaluaciones y notas) en un archivo que puedes guardar y volver a subir más tarde, aunque cambies de cuenta o de dispositivo." Botón `Crear y descargar .bkp` descarga un archivo que **sí puede contener datos de otra cuenta**: se descargó `gradehub-1782117572-bkp-otracuenta-…` con datos de la cuenta anterior. OJO: la copia de respaldo parece mezclar/leer perfiles de otras cuentas en el mismo navegador (posible fuga entre cuentas).

## Ficha de ramo (Bases de Datos)
- Botón "Agregar evaluación" sin rama → toast **"Primero crea una rama, o usa «Sin grupo»"**: útil, pero obliga a un paso extra que no se explica en la UI (🟡).
- "Armar rama" pide nombre de rama y peso **en dos pasos** para crear una sola evaluación (🟡).
- "Armar mis ponderaciones": filas con Nombre / Porcentaje (%), botón "Usar 20%" que sigue visible cuando ya hay 100/100 (🟡), botón `+ Agregar otra evaluación`, validación inline **"Suman 80 %. Debe dar 100 %."** y "✓ 100 / 100% · ponderaciones listas". Muy bueno.
- Al guardar aparece modal **"Ahora, las evaluaciones"** ("Agrega las evaluaciones de «Bases de Datos» y GradeHub calcula tu nota final al instante.") con un solo botón "Ver mis ramos" que **no navega a ninguna parte**; sin botón de cierre (X) (🟠).
- Reglas por evaluación (clic en el título de la evaluación): `Nota mínima` (ej. 3,0), `Tope de la nota final` (ej. 5,5), `Puntaje total` (ej. 100), `Exigencia (%)` (ej. 60) + "Puntaje obtenido (opcional)". Excelente para años avanzados.
- Horario: modal "Horario de Bases de Datos" ("Se repite cada semana. Horas de Chile."), bloques con días, Inicio/Fin (input de hora en formato **12 h AM/PM**, no 24 h como se usa en Chile 🟡), Sala, Tipo (Cátedra/Laboratorio), switch "Voy a esta clase", `Copiar bloque`, `Quitar`, `+ Agregar bloque`, `Guardar horario` → toast "Horario guardado" y bloque en la ficha "lun 09:00–10:30 Cátedra · A-204".
- Menú "…" del ramo: `Editar ramo`, `Editar evaluaciones`, `Eliminar ramo`.

## Notas y cálculo
- Notas 5,5 / 4,5 / 3,1 / 4,0 → nota final **4,5** y chip "✓ Aprobado"; "Promedio general 4,7 → 4,5".
- Validación: al poner 8,5 → toast **"No se cambió la nota: revisa el rango y el formato. Ej: 5,5."** y la nota vuelve a su valor. Muy bien.
- "¿Qué necesito para aprobar?" con examen sin nota: "Necesitas **4,0** en lo pendiente para aprobar"; al cambiar el 4,5 a 3,0 → "Necesitas **5,3**" y "Para 6,0" → **7,7**. Recalcula bien.
- Simulador: modal "Bases de Datos · Sección 3", "PROMEDIO PROYECTADO", "Tu promedio actual", "Tu meta" con −/+ y "Sin nota" y chips por evaluación. Funciona, pero **no explicita la nota mínima de cada evaluación** (el examen exige 4,0 y el simulador proyecta 3,0 sin avisar que eso deja el ramo sin aprobar).

## Ponderaciones: copiar de otro ramo, reglas y validaciones (Ingeniería de Software, Computación Cuántica Aplicada)
- Buena idea: select **"Copiar de otro ramo"** (opciones "Bases de Datos · 4 evaluaciones", "Ingeniería de Software · 4 evaluaciones") + confirmación "Usar las ponderaciones de Bases de Datos — Vas a copiar 4 evaluaciones y sus porcentajes desde Bases de Datos. No se copian notas ni fechas. Podrás ajustarla antes de guardar." Botones `Cancelar` / `Usar ponderaciones`. Excelente patrón (confirmación explícita).
- **BUG 🟠 — validación de "Nota mínima" sin "Tope":** al poner solo *Nota mínima* 4,0 y pulsar `Guardar`, el modal **no guarda** y muestra el alert `Escribe un tope entre 1 y 7.` **arriba del todo del modal**, lejos del campo (el campo queda abajo, fuera del viewport, y el modal no hace scroll hacia el error). El texto de ayuda incluso dice "Deja ambos campos vacíos si no aplica", pero no dice que sean obligatorio-ambos. Repro: Armar mis ponderaciones → expandir Reglas de esta evaluación → Nota mínima 4,0 → Guardar.
- **BUG 🟡 — los `DisclosureTriangle` se cierran solos:** al pulsar `+ Agregar evaluación` / `+ Agregar requisito` se colapsan "Requisitos que combinan evaluaciones" y "Eximición del examen" que estaban expandidos.
- **🟡 "Usar 20%" / "Usar 100%" sigue visible** cuando la ponderación ya está completa (100/100) y el peso ya tiene valor.
- **🟡 Inconsistencia de CTA:** en un ramo sin pauta el botón dice **"Agregar evaluaciones"** (Computación Cuántica Aplicada) pero en otro sin pauta dice **"Armar mis ponderaciones"** (Bases de Datos / Ingeniería de Software), aunque abren el mismo modal.
- **🟠 Formato de fecha en inglés (mm/dd/yyyy):** el campo "FECHA (opcional — aparece en la Agenda)" del modal "Editar evaluación" usa stepper `mm / dd / yyyy` y la hora en 12 h (`--:-- --`), aunque la app dice "Horas de Chile". Un estudiante chileno espera dd/mm/yyyy y 24 h.
- **🟡 "NOMBRE" / "PONDERACIÓN EN EL RAMO" / "FECHA"** en mayúsculas tipo overline, mientras el resto de la app usa oración capitalizada ("Solemne", "Hora (opcional)"): mezcla de dos sistemas tipográficos.
- **Positivo:** el botón "Falté con justificativo" y la nota "Te decimos a dónde va su 20%." es un patrón muy bueno y poco común.
- **Positivo:** "Requisitos que combinan evaluaciones" ("Para cuando el programa exige un mínimo sobre varias evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba.") con Nombre, checkboxes de evaluaciones, "Nota mínima del promedio", "Si no llegas" → "La final queda topada" / "La final es este promedio", "Tope de la nota final". Potencia real para mallas chilenas.
- **Positivo:** "Notas sombra" con switch y slider "¿Cuánto quieres necesitar en el examen?" (1,0–7,0, min. 4,0) y explicación "El examen queda en 4,0 porque es su mínimo: aunque te sobre, tienes que pasarlo."
- **🟡 Botón "Examen: necesitas 1,2. Toca para fijar o anotar la nota real"** está marcado `expanded` pero al primer toque solo despliega "Notas sombra"; hay que volver a tocarlo para que aparezca el campo de nota real. No hay affordance visual de que es un control de dos acciones.

## Notas y cálculo (Ingeniería de Software, Computación Cuántica Aplicada)
- Tras guardar ponderaciones aparecen filas "Pendiente · 20% de la nota final" y botón `+ Nota` (accesible "Anotar nota de Tarea"). Al anotar, el campo queda editable inline (`Nota de Tarea`).
- Héroe del ramo: promedio grande + chip "✓ Aprobado" + eco "Promedio general 4,9 → 4,8" + banda "Necesitas 3,3 en lo pendiente para aprobar". Muy bueno.
- **🟡 El banner "Necesitas 4,0 en lo pendiente para aprobar" no se recalculó** al ingresar la primera nota en Computación Cuántica Aplicada (se mantuvo 4,0 con 3 evaluaciones pendientes cuando el resto ya pedía otras cifras).
- **🟡 Barra de progreso de rama** dice en accesibilidad "Controles: 40% del ramo, 50% de su peso evaluado" — bien — pero el color de la barra cambia de gris a verde/rojo sin leyenda.
## Historial / Estadísticas comparadas (2026-11-26, ~21:40)

Flujo "+ Semestre anterior" (modal "Agregar un semestre anterior"):
- Paso 1: select "Año" (2026…2017), botones Período "1° / 2° / Verano" (tooltips "Primer semestre", etc.), campo "BUSCA TUS RAMOS" (`m-hist-buscar`, placeholder "Nombre o sigla"), "Continuar" deshabilitado hasta elegir un ramo.
- Microinteracción: al elegir un ramo el buscador se limpia y el ramo pasa a "TUS RAMOS DE ESE SEMESTRE" con botón "Quitar <ramo>". Muy bien.
- Paso 2: "Notas finales de 2025-1" + ayuda "La nota con la que cerraste cada ramo. Puedes dejar en blanco los que no recuerdes: esos no entran al promedio." Aviso `m-hist-aviso`: "Pon al menos una nota para guardar el semestre." (desaparece al poner nota). Botones "Atrás" / "Guardar semestre".
- Toast final: "2025-1 agregado al historial".
- Resultado: Historial muestra "Promedio del historial: 4,7", gráfico "Promedio por semestre 4,6 / Actual · 2026-2", toggles "Semestre pasado / Últimos 5 / Desde el inicio", fila expandible "2025-1 · 2 ramos · 4,7" con "Editar promedio de Bases de Datos / de Cálculo" y botones "Editar" y "Eliminar semestre". Home pasa a mostrar delta "↓ 0,09 vs. 2025-1" (correcto: 4,562 vs 4,65).
- 🟠 **Bug de accesibilidad/estableidad del modal**: los botones de Período no exponen estado seleccionado en el árbol de accesibilidad (no hay `selected`/`pressed`), y al hacer clic se re-renderiza todo el diálogo y los nodos quedan obsoletos. Reproducible: abrir "+ Semestre anterior" → clic en "1°" → el select "Año" pierde su id y el nodo anterior deja de ser accionable ("node could not be scrolled into view").
- 🟡 El catálogo de ramos del buscador mezcla carreras de salud (Bases Clínicas I/II, Bases del Cuidado de Enfermería, Bases Neurofisiológicas del Comportamiento) sin filtro por carrera: para un alumno de ISI aparece ruido; la lista de "Bases" trae 19 opciones de otras facultades.
- 🟡 Gráfico "Promedio por semestre": ejes solo 5 y 4,0, línea casi plana y sin etiquetas de semestre en el eje X; con 2 semestres las tres vistas (Semestre pasado / Últimos 5 / Desde el inicio) se ven idénticas, no hay retroalimentación clara del cambio.
- 🟡 "Cómo vas respecto a los demás": "Aún no hay suficientes datos para compararte con los demás." aunque ya hay historial; no explica qué hace falta ni cuándo se activará.

## Agenda (2026-11-26)

- Header "Agenda" + botón "Calendario" (tooltip "Agregar evaluaciones al calendario", id `agenda-export-btn`), subtítulo dinámico "Todo al día", tabs "Evaluaciones / Horario", link "Ver mes" ↔ "Ocultar mes".
- Calendario: "Noviembre 2026" con botones "Hoy", "Mes anterior", "Mes siguiente"; días con nombre accesible completo ("Lunes 14 de diciembre, 1 evaluación") y punto de color; al seleccionar un día el listado inferior cambia a "Lunes 14 de diciembre" y muestra la evaluación. Muy bien (buenos nombres accesibles, `Hoy` aparece solo cuando corresponde).
- 🟠 Bug: con todas las evaluaciones rendidas, la tarjeta "Nada pendiente. Todas tus evaluaciones con fecha ya están rendidas." sigue apareciendo **incluida cuando se selecciona un día que sí tiene una evaluación ya rendida** (14 dic, Examen Ingeniería de Software), y esa evaluación se muestra dos veces (en el listado del día y en "Ya rendidas 20").
- 🟡 Al hacer clic en la evaluación del calendario la app navega a la ficha del ramo (Ingeniería de Software) y no a un detalle de la evaluación; no hay forma desde Agenda de marcar "rendida" o editar la fecha.
- 🟡 "Ya rendidas 20 / Ver todas" es un disclosure; la etiqueta "Ver todas" queda colapsada y poco visible.

## Detalle de ramo (desde Agenda) y menú ⋯

- Ficha: promedio grande "4,6 / 4,56", chip "✓ Aprobado", botones "Simular" y "★ Calificar", grupos Solemne/Controles/Examen con pesos, bloque Horario con "Agregar bloque" ("Agrega los días y las horas de tus clases."), botón final "Editar evaluaciones".
- Menú ⋯ (`ramo-mas`, "Opciones del ramo"): Editar ramo / Editar evaluaciones / Eliminar ramo (en rojo). Cierra con Escape. Bien.
- 🟠 El menú "Herramientas" del header de Inicio (`herramientas-boton`) está **cubierto por la barra de navegación** cuando se está en otra pantalla: `tab.click` reporta "Node 160 is covered by a nav, so nothing was clicked". No es alcanzable sin volver a Inicio.

## Perfil / Ajustes

- Pantalla Perfil: tarjeta "Camila / Ingeniería Civil Informática / UDD · 8.º semestre / gpruebahark4@prueba.cl" y grupos TU SEMESTRE (Universidad y carrera, Calendario, Archivar semestre), HERRAMIENTAS (Calculadora de nota), LA APP (Apariencia, Agentes conectados, Sugerencias y comentarios), TU CUENTA (Datos y cuenta, Ofrecer clases o material) + "Cerrar sesión".
- 🟡 Duplicación: los mismos ítems del menú Perfil reaparecen como secciones dentro del modal "Ajustes" (con otros nombres: "Información académica" vs "Universidad y carrera"), y el modal "Ajustes" se abre desde "Editar tu nombre y tu cuenta". Dos rutas, dos vocabularios.
- Modal Ajustes con buscador ("Buscar en Ajustes"), estado vacío útil: "No encontramos esa opción. Prueba con «carrera», «correo» o «fondo»." + "0 secciones encontradas" + botón limpiar ✕. Muy bien.
- 🔴 **Bug "Ramos de mi malla"** (Ajustes → Información académica): al pulsarlo aparece el toast "Primero elige tu carrera en Ajustes" **aunque la carrera ya está elegida y visible** ("Ingeniería Civil Informática" seleccionada). Segundo intento, con la carrera volviendo a pulsar, mismo resultado: el botón nunca abre la malla. Pasos: Perfil → Editar tu nombre y tu cuenta → Información académica → "Ramos de mi malla".
- 🟠 El toast de error se muestra **fuera del modal**, abajo de la viewport, y el modal no hace scroll ni enfoca el campo al que se refiere.
- Información académica: UNIVERSIDAD = solo 5 botones (UChile, UC, UAI, UANDES, UDD), "Cambia tu catálogo disponible. Tus ramos y notas no se tocan.", CARRERA con buscador, SEMESTRE DE CARRERA 1°–11°, "Guardar", "Ramos de mi malla", "SEMESTRES QUE YA CURSASTE / Agregar un semestre anterior". Confirma que **no existe UTFSM ni campo libre**.
- Calendario (Ajustes): "TUS EVALUACIONES EN GOOGLE CALENDAR, APPLE CALENDAR U OUTLOOK. Se agrega una vez y se actualiza sola cada algunas horas.", URL de suscripción larga con "Copiar URL" y "Generar una nueva", nota de privacidad "Quien tenga esta URL ve tus evaluaciones y fechas. Tus notas no salen nunca. Si se filtra, genera una nueva.", "TRAER FECHAS DESDE UN CALENDARIO / Sube un archivo .ics…" + "Importar archivo .ics". Buena explicación de riesgos. (No se conectó ni importó nada, por límites.)
- Apariencia: Modo (Sistema "Como tu dispositivo" / Claro / Oscuro), COLOR DE ACENTO (Turquesa, Azul, Índigo, Violeta, Cobre, Frambuesa), FONDO (Neutro, Pizarra, Papel), "Se guarda al elegir". Cambio inmediato, sin reload, estados seleccionados correctos. Muy bien. 🟡 Las muestras de acento/fondo son círculos/medias lunas muy chicos, difíciles de distinguir entre Índigo y Azul.
## Apoyo / tópicos restringidos, Calculadora, Ajustes restantes (2026-11-26, noche)

### Apoyo (tutores) — tarjeta "¿Buscas apoyo en un ramo?" del Inicio
- Modal "Encuentra tu apoyo" / "Profes, academias y apps para tus ramos", buscador ("Cálculo, MAT1620, clases particulares…"), chips de filtro Todos / Clases / Material / Laboratorios / Plataformas y apps / Otro, "1 resultado", tarjeta "Plataforma de aprendizaje · MentorIA · Sin valoraciones · MAT1610 · MAT1620 · MAT1203".
- Nota de privacidad: "Ordenamos los ramos según tu carrera, en tu dispositivo. No usamos tus notas ni enviamos esta información." Muy bien.
- Detalle del perfil: ← Volver / Cerrar, descripción larga, bloque "Contactar a MentorIA" con enlaces Instagram y Sitio web (abren externo), "Ramos 12 ramos" con chips + "+6" + disclosure "Ver los 12 ramos", botón "Denunciar o bloquear".
- Flujo "Denunciar este perfil": radios (Ofensivo, discriminatorio o acoso / Engañoso o posible estafa / Spam o no corresponde a GradeHub / Expone datos personales / Otro motivo), "CUÉNTANOS MÁS OPCIONAL" 0/500, "Cancelar" / "Enviar denuncia", nota "Una persona del equipo la revisa dentro de 24 horas y nadie más sabe quién denunció…", y "Bloquear a MentorIA" con "Dejas de ver sus clases, su perfil y sus anuncios. No se le avisa, y puedes deshacerlo en Ajustes." **Se abrió y se canceló con "Cancelar"** (nada publicado).
- 🟠 Bug: el diálogo no tiene nombre accesible útil: el árbol lo reporta como `dialog "Ventana"`.
- 🟡 No apareció ninguna opción "unirse a a un clase"/"agruparse" porque el único proveedor del catálogo es una plataforma; no hay forma de probar ese flujo con esta cuenta (anotado, no bloqueado por error).

### Ajustes → Apoyo / "Ofrecer clases o material"
- 🔴 **Bug de estado de carga**: la sección "Apoyo" (también accesible desde el ítem de menú "Ofrecer clases o material") queda trancada para siempre en "Revisando tu acceso…", sin spinner, sin error y sin salida. Reproducido 3 veces, esperas de 2,5 s y 5 s, y saliendo/volviendo a entrar a la sección. Texto exacto en pantalla: "Apoyo / Ofrece clases, material o tu app / Revisando tu acceso…". Pasos: Perfil → (Ofrecer clases o material) o Ajustes → sección "Apoyo". En cambio, la misma función desde el Inicio ("Explorar apoyo") sí carga.

### Calculadora de nota (menú 🔧 "Herramientas" del Inicio)
- "Convierte el puntaje de una prueba a nota. Puedes calcular sin elegir un ramo." PUNTAJE OBTENIDO (placeholder "Por ejemplo, 25"), PUNTAJE TOTAL ("Por ejemplo, 50"), EXIGENCIA (%) con 50 por defecto.
- Con 38/50 y 50 % → "Tu nota 5,6" + "Con 50 % de exigencia, el 4,0 está en 25,00 de 50,00 puntos." Correcto.
- "Más opciones de escala": NOTA MÍNIMA 1, NOTA DE APROBACIÓN 4, NOTA MÁXIMA 7, checkbox "Truncar en vez de redondear".
- "Tabla de puntaje a nota" con "De a 1 / 0,5 / Otro puntos" y tabla Puntos/Nota. Muy útil y familiar.
- 🟡 La tabla se despliega completa dentro del modal (0 a 50 de a 1 = 51 filas) y el modal crece hasta la viewport sin contenedor con scroll propio; hay que scrollear toda la página para llegar a "Guardar en un ramo".
- 🟡 Con "Solo calcular", "Guardar como nota" sigue deshabilitado sin explicación (sí se entiende por la etiqueta, pero falta un hint).
- 🟡 El menú "Herramientas" tiene un solo ítem; el ícono 🔧 sugiere más herramientas de las que hay.

### Ajustes → Agentes conectados
- "Qué puede hacer: Ver tus ramos, notas y fechas, simular escenarios, agregar un ramo y proponerte ponderaciones que tú confirmas. No puede escribir tus notas ni borrar nada." Pasos 1-2-3 con mensaje para copiar, "Crear URL de conexión" (dura 90 días y se muestra una vez), "Actualizar lista", "Todavía no tienes agentes conectados", "Ideas para pedirle" con selector. **No se conectó nada** (límite).
- 🟠 El campo "2. PONLE UN NOMBRE A LA CONEXIÓN" (placeholder "Ej: Mi agente") no tiene etiqueta propia en accesibilidad: su nombre accesible es la concatenación "1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO 2. PONLE UN NOMBRE A LA CONEXIÓN".

### Ajustes → Datos y cuenta
- "Guarda una copia antes de cambiar de dispositivo." "Exportar mis datos" → toast "✓ Datos copiados al portapapeles" (no genera archivo). "Importar datos".
- Switches **activos por defecto**: "Compartir mis ponderaciones en forma anónima" (Value: 1) y "Usar mis notas para elegir anuncios" (Value: 1), ambos con explicación clara.
- "COMPARTIDO CON PROFESORES / No compartes tus notas con ningún profesor.", "PROFESORES BLOQUEADOS / No has bloqueado a ningún profesor." + correo gradehub.app@gmail.com.
- "ZONA SENSIBLE": "Eliminar mi cuenta" ("Borra tu cuenta y todas tus notas, en este dispositivo y en la nube. No se puede deshacer.") y "Reiniciar app". **No se pulsaron** (límite).
- Links Términos de uso y Política de privacidad.
- 🟠 "Exportar mis datos" promete un archivo y termina en el portapapeles, y el toast de confirmación aparece al fondo de la pantalla, medio oculto tras el modal.
- 🟠 Dos switches de privacidad activados por defecto en la creación de cuenta, sin paso de consentimiento en el onboarding.

### Ajustes → Sugerencias y comentarios
- "¿Algo no se entiende, está fallando o podría ser mejor? Lo leemos nosotros.", selector TIPO DE COMENTARIO (Tengo una sugerencia / Encontré un problema / Otro comentario), CUÉNTANOS ("Escribe acá lo que te gustaría cambiar…"), contador "0 / 2000" y aviso "Mínimo 3 caracteres · queda asociado a tu cuenta." que al escribir pasa a "Queda asociado a tu cuenta para poder ayudarte. 3 / 2000". Link de correo. **NO se envió** (cancelado cerrando el modal).
- 🟡 El botón "Enviar comentario" no muestra estado deshabilitado con texto insuficiente: no hay forma de saber si está listo hasta pulsarlo.

### Perfil → Archivar semestre
- Modal "Archivar 2026-2": "Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo." Por ramo: nombre, "Calculada: 4,5" y campo "Nota final oficial del portal de tu universidad". "Cancelar" / "Archivar semestre". **Se abrió y se canceló** para no alterar el semestre.
- 🟡 En pantalla el texto se ve pegado: "Nota final oficialdel portal de tu universidad" (falta salto/espacio entre línea y sublínea).
- 🟡 No se explica qué pasa con el semestre siguiente ni si se puede deshacer el archivo.

### Orden de ramos y otros
- Menú "Ordenar ramos. Ahora: Manual" → Manual / Por nota / A-Z; al aplicar "Por nota" los íconos de arrastre desaparecen y aparecen chevrons; el rótulo del botón refleja el orden. Muy bien.
- Dark mode (Apariencia → Oscuro): aplicado al instante sin recargar, buen contraste general; 🟡 "Cerrar sesión" en rojo sobre fondo oscuro y el botón "Simular el semestre completo" casi sin borde, bajan la legibilidad.
