# Auditoría UX GradeHub (gradehub.cl) — cuenta de prueba gpruebahark@prueba.cl
Fecha: 26-11-2026, ~22:28 -03. Navegador de escritorio (viewport ancho, app responsive con sidebar).

## 1. PORTADA / AUTENTICACIÓN — https://gradehub.cl/
Qué se ve: logo GradeHub, H1 "Mejor que tu Excel.", subtítulo "Guarda tus notas y revísalas desde cualquier dispositivo.", bloque "GradeHub en números" (2.222 estudiantes / 9.178 ramos / 39.025 notas), botones "Continuar con Apple" y "Continuar with Google", separador "o con tu correo", campos CORREO ELECTRÓNICO / CONTRASEÑA / REPETIR CONTRASEÑA (con botón "Mostrar contraseña"), botón "Crear cuenta", link "¿Ya tienes cuenta? Inicia sesión", legal "Al continuar aceptas los términos y la privacidad, y declaras tener 14 años o más.", footer con Preguntas frecuentes / Calculadora de notas / Términos / Privacidad / "Soy profesor particular". Debajo, un mockup ilustrativo de ramo y de estadísticas ("Introducción a la Microeconomía MIC1505", "Necesitas 3,4 en lo pendiente para aprobar").
- La landing llega DIRECTAMENTE en modo "Crear cuenta" (muestra REPETIR CONTRASEÑA), sin pantalla de marketing aparte. La página ya está en pantalla de auth: un usuario nuevo ve el formulario antes de entender qué hace la app.
- 🟡 El botón "Continuar con Apple" aparece en el árbol de accesibilidad pero NO en el texto visible renderizado (inconsistencia / botón oculto o mal ocultado).
- 🟠 No hay ninguna indicación de reglas de contraseña (longitud mínima, mayúsculas, etc.). El usuario recién descubre la regla si falla.
- ✅ El título "Mejor que tu Excel." y los contadores de uso comunican valor rápido. El mockup del ramo con "Necesitas 3,4 en lo pendiente para aprobar" muestra la promesa central antes de registrarse.

## 2. CREACIÓN DE CUENTA
- ✅ Sin fricción: "Crear cuenta" → sesiona al instante y entra al onboarding. **No pidió verificación de correo** (ni avisos de "revisa tu correo"). Riesgo: si el usuario escribe mal su correo, nunca lo sabrá y no tendrá recuperación.
- 🟠 No se pide nombre en el sign-up: el nombre se pide recién en el onboarding (paso 1). Cohere, pero el saludo del final depende de completar el onboarding.
- Tiempo aproximado: ~15 s (3 campos + 1 clic).

## 3. ONBOARDING — 4 pasos, 1.er año UC, 2026-2
Contador "PASO 1 DE 4" + barra de progreso. Botón de retroceso cambia de texto según el paso: en el paso 1 dice **"Cerrar sesión"** (misma posición/estilo que luego dice "Atrás"), lo que asusta: uno espera "Atrás" y lee que va a perder la sesión.

### Paso 1 — "¿Cómo te llamas?" (texto ayuda: "Tu nombre aparece en el saludo de inicio.")
Campos NOMBRE, APELLIDO. Bloque aparte "AÑO DE INGRESO A LA UNIVERSIDAD" con un selector tipo ruleta: muestra "Elegir año" centrado y 2026 / 2025 debajo, con flechas arriba/abajo y botones "Anterior" / "Siguiente".
- 🔴 Las opciones del selector (2026, 2025, "Elegir año") NO existen en el árbol de accesibilidad: el control es un stepper con Value: 0 y no es seleccionable por accesibilidad; programáticamente setValue("2026") no lo mueve. Solo funciona con los botones "Anterior/Siguiente" o clicks a ciegas.
- 🟠 Los botones del selector se llaman "Anterior"/"Siguiente", idénticos en espíritu al "Continuar" del wizard: no queda claro que sirven para elegir el año. No hay campo numérico ni lista desplegable.
- 🟡 Si ingresas en 2026 y estamos en 2026-2, calcula "Vas en tu 2.º semestre" (correcto para ingreso en 2026-1), pero no hay forma de indicar que ingresaste en el 2.º semestre. Aparece un botón "Cambiar" recién después de elegir.
- El bloque de año está visualmente separado (otra tarjeta) y no se llena con el mismo criterio que los otros; "Continuar" sigue deshabilitado sin decir por qué.

### Paso 2 — "Gonzalo, ¿cuál es tu universidad?" ("Así te mostramos los ramos de tu universidad.")
Grilla de 5 botones con sigla en cuadro de color: UCH Universidad de Chile, UC Pontificia Universidad Católica, UAI Universidad Adolfo Ibáñez, UA Universidad de los Andes, UDD Universidad del Desarrollo.
- 🔴 Solo 5 universidades y **sin buscador ni opción "otra universidad"**: un estudiante de PUCV, USM, UTFSM, UdeC o Universidad de Chile de regiones no puede continuar (y no puede decir "mi universidad no está"). Es el punto de abandono más duro del onboarding.
- 🟡 Selección requiere 2 clics (tocar tarjeta + Continuar); la tarjeta seleccionada no cambia de estado de forma evidente hasta que se lee el botón habilitado.

### Paso 3 — "¿Qué estudias?" ("Busca tu carrera. Si no aparece, puedes escribirla.")
Buscador "Buscar carrera" + grilla alfabética con ~70 carreras UC.
- ✅ Buen texto: avisa que se puede escribir la carrera si no aparece, y el buscador filtra en vivo.
- 🔴 En el catálogo UC **no existe "Ingeniería Industrial"** (sí Ingeniería Civil, Ingeniería Comercial, Ingeniería en Recursos Naturales, Ingeniería Forestal, Licenciatura en Ingeniería en Ciencia de Datos / de la Computación). Tampoco "Ingeniería Matemática" ni "Ingeniería Civil en Computación" con ese nombre. Para un alumno de Ingeniería UC hay que recurrir a "Usar «Ingeniería Industrial»".
- 🟠 Al hacer clic en "Continuar" con la carrera sin seleccionar, el botón está deshabilitado y no aparece ningún mensaje: el usuario puede creer que la app está fallando.

### Paso 4 — "Elige tus ramos"
Como la carrera fue escrita a mano: "Aún no tenemos una malla verificada para Ingeniería Industrial. Busca tus ramos o agrégalos a mano."
- 🟠 El texto **"TU SEMESTRE" aparece vacío** (sin chips ni control): parece un componente roto / carga pendiente.
- ✅ Buscador "BUSCAR POR NOMBRE O SIGLA" filtra bien y cada resultado muestra sigla, créditos y "fuera de malla". Al tocar "+" el ramo pasa a una fila con checkbox y el botón principal pasa de "Continuar sin ramos" a **"Continuar con 1 ramo"** (buen feedback).
- 🟡 El buscador **se limpia solo** al agregar un ramo: para agregar 2 ramos parecidos hay que reescribir la búsqueda.
- 🟡 Botón principal dice "Continuar sin ramos" cuando no hay ramos: empuja a saltarse el paso en vez de explicar cómo agregar.
- ✅ Botón "¿No aparece? Agregar un ramo a mano" siempre visible.

### Total onboarding
4 pasos, ~11 clics (Crear cuenta, 1 clic de año ×1, Continuar, UC, Continuar, Usar «carrera», Continuar, +ramo, Continuar con 1 ramo, + el clic de "Ver mis ramos" del modal). Tiempo total ≈ 1 min 40 s con teclado.

## 4. HOME POST-ONBOARDING
Sidebar izquierda (Inicio / Agenda / Estadísticas / Perfil), top bar "GradeHub UC" y un ícono de llave/engranaje arriba a la derecha (ID herramientas-boton, menú "Herramientas"). Saludo "Así va tu semestre, Gonzalo". Tarjeta PROMEDIO GENERAL · 2026-2 · 1 ramo, con un "·" como valor del promedio y "Abre un ramo para ingresar tu primera nota." + "• 1 pendiente". "Mis ramos" con "+ Agregar ramo" y menú "Ordenar ramos. Ahora: Manual". Tarjeta del ramo "Matemática I · Sin evaluaciones" con botón "Mantén presionado para mover Matemática I". Banner "APOYO ¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos. Explorar apoyo". Footer "Por estudiantes, para estudiantes. GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval".
- Modal automático "Ahora, las evaluaciones / 1 ramo agregado / Agrega las evaluaciones y sus porcentajes en cada ramo." con tarjeta destacada "Carga todos tus semestres pasados de una — Sube tu ficha académica en PDF y armamos tu historial y tu PPA." y botón "Ver mis ramos".
- 🟠 El modal **no tiene botón de cerrar (X) ni "Omitir"**: la única salida es "Ver mis ramos", y encima promociona una función de pago/PDF como si fuera el paso obligatorio. Se siente obligatorio.
- 🟡 "PROMEDIO GENERAL" muestra un punto "·" en vez de un guion o "—": parece un glitch de render.
## 5. AGREGAR RAMOS desde el Home (modal "Agregar ramo")
Modal: título "Agregar ramo", campo "NOMBRE O SIGLA DEL RAMO · lo buscamos en la malla UC", lista de sugeridos con sigla/semestre/créditos/"con programa" y botón "+", botón "Subir foto de tu horario", "Cancelar" y "Agregar ramo".
- ✅ Los sugeridos llegan precargados (aunque la carrera se haya escrito a mano) y traen la pauta completa: al agregar aparece el toast "Agregado con sus ponderaciones" y el ramo ya tiene 5-6 evaluaciones. Muchísimo mejor que un Excel.
- ✅ Los ramos que ya tienes aparecen deshabilitados con "ya lo tienes".
- ✅ Búsqueda por nombre/sigla funciona ("Física" devuelve Física Acústica FIS122F, etc., marcados "fuera de malla").
- ✅ Si no existe en la malla: "No está en tu malla — lo agregamos como ramo tuyo." y el botón "Agregar ramo" lo crea a mano.
- 🟠 El modal **se cierra después de agregar un ramo**: para cargar los 5 ramos hay que reabrirlo 5 veces (10 clics en total). Un multi-select o "agregar y seguir agregando" sería lo correcto.
- 🟡 Texto pegado en la tarjeta del home: "MAT16105 evaluaciones" (falta separador entre sigla y n.º de evaluaciones) y en el encabezado "2026-25 ramos" (debería ser "2026-2 · 5 ramos").
- 🟡 "Subir foto de tu horario" aparece dentro del modal de agregar ramo pero no agrega ramos del horario: se siente como un camino muerto si uno busca "importar mi horario".
- Ramos agregados: Matemática I (desde onboarding, sin evaluaciones), Cálculo I MAT1610, Álgebra Lineal MAT1203, Desafíos de la Ingeniería ING1004 (sugeridos) y Taller de Emprendimiento e Innovación (a mano).

## 6. PANTALLA DE RAMO (Cálculo I)
Top: "Volver", título "Cálculo I" + "MAT1610 · 10 créditos" (texto pegado: "Cálculo IMAT1610"), botón "…" (Opciones del ramo). Bajo: chip "Sin notas", banner "Necesitas 4,0 en lo pendiente para aprobar" (el 4,0 en verde), botón "Simular". Categorías con barra de progreso y "60% del ramo"; cada evaluación "Pendiente · 20% de la nota final" y un **cuadro punteado con 4,0** (nota sombra). Bloque "Notas sombra" con switch, slider "¿Cuánto quieres necesitar en el examen?" (1,0 – 7,0), botones "Bajar una décima"/"Subir una décima" y "Necesitas 4,0 en cada evaluación pendiente." Categorías multi-nota muestran "10% · promedio de 3", "+ Agregar nota", "Editar" y "Quitar la última". Al final: "Horario / Agrega los días y las horas de tus clases. / Agregar bloque" y botón "Editar evaluaciones".
- ✅ La promesa central ("qué necesito para aprobar") está arriba, sin scrollear. Excelente.
- 🟠 Los **cuadros punteados con 4,0 se ven como notas ingresadas**; un alumno nuevo puede creer que ya tiene notas. La etiqueta "Notas sombra" está 200 px más abajo, al final de la lista. Habría que marcarlas como "simulado" dentro del mismo cuadro.
- 🟠 "Quitar la última" (sin contexto) es un botón destructivo al lado de "+ Agregar nota", sin confirmación ni icono de papelero.

## 7. EDITAR EVALUACIONES (pautas y pesos)
Modal "Editar evaluaciones" + "Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas." Contador "✓ 100 / 100% · ponderaciones listas" con barra. Cada fila: combo de nombre (sugiere tipos), campo de peso con sufijo "%", botón "…" (Opciones) y "Reglas de esta evaluación" (Nota mínima, Tope de la nota final, Puntaje total, Exigencia (%), con explicaciones). "Varias notas · esperas [3]". Al final: "+ Agregar evaluación", "Requisitos que combinan evaluaciones", "Eximición del examen", Cancelar / Guardar.
- ✅ Potencia real: mínimos, topes, puntajes a nota, requisitos combinados y eximición. Nada de esto se encuentra fácil en otras apps.
- ✅ Validación viva: al cambiar Interrogación 3 a 30% el contador dice "110 / 100% · te pasas por 10%".
- 🟠 Con 110% el botón "Guardar" sigue igual de activo y **guarda sin confirmar**: recién en la pantalla del ramo aparece "Las evaluaciones suman 110% — ajústalas para que sumen 100%" y un chip "110% ponderado". El error debería bloquear o pedir confirmación dentro del modal, donde está la causa.
- 🟠 El modal es largo y el contador 100/100 no queda pegado al botones: al scrollear se pierde la única señal de validez.
- 🟡 "Reglas de esta evaluación", "Requisitos que combinan evaluaciones" y "Eximición del examen" son triángulos de divulgación sin ícono claro; no hay tooltip para "Tope" ni "Exigencia".

## 8. CONSENSO DE PONDERACIONES (no se publicó nada)
Al guardar, aparece un modal: "Tus ponderaciones ayudan a tus compañeros — Tus programas se suman en forma anónima para ayudar a tus compañeros. Nunca se comparten tus notas. Puedes desactivarlo en Ajustes." con único botón "Entendido".
- 🔴 El envío al consenso está **activado por defecto** y el modal solo se puede "Entender": no hay un "No compartir" en el momento en que corresponde decidir. Opt-in real requeriría dos toques menos para negarse.
- El ramo pasó a mostrar "3 estudiantes de tu universidad reportan otras ponderaciones. Coincidieron entre ellos. No salen del programa del curso: míralas y decide tú." con "Ver la que reportan" → modal con la lista de pesos y botones "Dejar la mía" / "Usar esta".
- ✅ "Usar esta" aplica los pesos y muestra "Ponderaciones actualizadas — tus notas se conservaron": muy buen manejo del miedo a perder notas.
- 🔴 **Bug de texto**: tras aplicar el consenso, el encabezado del ramo dice literalmente **"Ponderaciones según true estudiantes"** (se renderiza un booleano en vez del número). Pasos para reproducir: ramo con pauta → Editar evaluaciones → Guardar → aceptar aviso de consenso → "Ver la que reportan" → "Usar esta".

## 9. Ingreso de notas parciales — Cálculo I (realista: buenas y rojas)

**Qué se ve:** cada evaluación pendiente muestra un botón de estado verde: `Interrogación 2: necesitas 2,5. Toca para anotar la nota real`. Al tocarla se transforma en un campo de texto; al escribir `3,2` y Enter, la nota queda en **rojo**, el promedio grande del ramo se actualiza, aparece el eco `Promedio general 4,6 → 4,6`, un cartel `Necesitas 2,5 en lo pendiente para aprobar`, y un toast `Vas 4,6 · necesitas 2,5 en lo pendiente para aprobar`.

**Notas ingresadas:** Interrogación 1 = 5,8 · Interrogación 2 = 3,2 (roja) · Interrogación 3 = 4,7 · Laboratorio 1 = 6,1 · Laboratorio 2 = 2,9 (roja) · Laboratorio 3 = 5,4. Queda Examen (30%) pendiente.

**Qué siento / pienso:** es la mejor parte del producto. Saber «necesito 2,5 en lo pendiente» sin abrir Excel es exactamente la promesa, y está siempre visible, no escondida. El rojo/verde instantáneo genera confianza. La agrupación «Laboratorio 10% · promedio de 3 · 3/3 ingresadas 4,8» es clara y la barra de progreso del grupo («100% de su peso evaluado») ayuda.

**Qué no es intuitivo / bugs:**
- 🟠 **La nota se pierde si confirmas demasiado rápido.** Repro: tocar el botón «…Toca para anotar la nota real» y presionar Enter en menos de ~0,5 s → el Enter solo abre el campo, la nota no se guarda, el botón vuelve a su estado «Pendiente» sin ningún mensaje. Ocurrió con Interrogación 3. Pasos: abrir ramo → tocar evaluación pendiente → Enter inmediatamente → leer: campo vacío y evaluación sigue pendiente.
- 🟠 **El eco `Promedio general 4,6 → 4,6`** no dice nada cuando el promedio no cambia; sugiere un cambio inminente. Debería decir «Promedio general 4,6» a secas, o el delta (`+0,2` / `sin cambio`).
- 🟡 **No hay forma de anotar una nota «sin fecha» con good feedback**: el botón dice «necesitas 2,5», pero si quiero anotar una nota menor (p. ej. 1,0) no hay confirmación de que voy a reprobar el ramo hasta que guardo.
- 🟡 Botones grandes apilados por evaluación (`Fecha y detalle de…`, `+ Agregar nota`, `Editar`, `Quitar la última nota…`) hacen la tarjeta muy larga; en mobile hay que scrollear mucho para un solo ramo.
- 🟡 `Quitar la última nota de Laboratorio, que está vacía` es destructivo sin confirmación (aunque el nombre del botón al menos avisa).
- 🟡 El interruptor `Notas sombra` viene **activado por defecto** (`Value: 1`) y dibuja notas 4,0 punteadas que se confunden con notas reales en el promedio; debería venir apagado o explicar en el mismo héroe que el promedio NO las incluye.

## 10. Simulador de ramo (botón `Simular`)

**Qué se ve:** modal `SIMULADOR / Cálculo I` + `Escribe notas hipotéticas y mira cómo quedaría tu promedio. No se guardan hasta que confirmes.` Panel `PROMEDIO PROYECTADO 4,6` / `Tu promedio actual: 4,6`; control `Tu meta` con `− 4,0 +` y frase `Para el 4,0 necesitas 2,5 en lo que queda`; lista `EVALUACIONES` con campo `Nota hipotética` (placeholder `1,0–7,0 o D/A/R`) y botón `Falté` para las pendientes; las evaluaciones ya rendidas aparecen con su nota y una chip `Interrogación 1: 5,8`. Botones `Cerrar` y `Guardar como reales` (deshabilitado hasta escribir algo).

**Comportamiento verificado:** con meta 4,1 → `Para el 4,1 necesitas 2,8 en lo que queda`. Al escribir nota hipotética 5,0: promedio proyectado **4,7**, texto `+0,1 vs tu 4,6 actual`, la meta pasa a `Ya tienes el 4,1` y `Guardar como reales` se habilita. Con `Cerrar` no se guardó nada (Examen sigue `Pendiente`). Correcto.

**Qué siento / pienso:** muy bien. La promesa de «no se guardan hasta que confirmes» quita el miedo a experimentar, y el `+0,1 vs tu 4,6 actual` conecta el simulador con el promedio de carrera. El botón `Falté` es un detalle realista (a veces la nota es 0,0 y no querés mintear).

**Bugs / mejoras:**
- 🟡 `Laboratorio 1: 6,1Laboratorio 2: 2,9Laboratorio 3: 5,4` — texto pegado en la línea del grupo dentro del simulador.
- 🟠 Al tocar `Subir la meta` el modal **se re-renderiza completo y el campo de nota hipotética se destruye y recrea** (el nodo desaparece del árbol). Si el usuario ya había escrito, la intermitencia puede borrar su entrada; en la prueba se perdió el foco del campo. Repro: Simular → `Subir la meta` → volver a leer: el `text field` tiene nuevo ID y valor vacío.
- 🟡 La meta se mueve de 0,1 en 0,1 sin atajo a 4,0/4,5/5,0 (7 clics para pasar de 4,0 a 4,7).
- 🟡 `Guardar como reales` es un nombre que asusta: convierte notas hipotéticas en notas «reales» del ramo. Sugerir `Guardar estas notas` o `Aplicar al ramo` con confirmación.

## 11. Flujo «Calificar» (calificar profesor / ramo) — abierto y cancelado, nada publicado

**Repro:** pantalla de ramo → botón `★ Calificar` (aparece una vez que hay notas).
1. Modal `Calificar profesor` → `¿CUÁL ES TU SECCIÓN?` con campo (placeholder `Ej.: 3`), botón `Sube una foto de tu horario` y ayuda `Y te agregamos las secciones automáticamente.` Botones `Cancelar` / `Continuar`.
2. Al `Continuar` con «3», **la pantalla de ramo ya se actualiza detrás del modal** (`Sección 3` sobre el promedio) y aparece la tarjeta `¿Cómo ha sido Cálculo I?` con `Dar mi opinión` / `Ahora no`.
3. Modal 2: `¿Es tu profesor Oscar Chacón?` + link `Completar o corregir el nombre` + botones `No, es otra persona` / `Sí, es mi profesor` / link `Calificar solo el ramo`. (El nombre del profesor viene del catálogo: buena idea, cero tipeo.)
4. Modal 3 (paso final): `Oscar Chacón` + `Cambiar`, `¿Cómo era como profe?` con 5 estrellas (radios `1 de 5`…`5 de 5`) y botones `Cancelar` / `Guardar`.

**Se canceló en el paso final (`Cancelar`); no se publicó nada.** La tarjeta de opinión se descartó con `Ahora no`.

**Qué siento / pienso:** el flujo está bien pensado (confirmar profe desde catálogo, opción de calificar solo el ramo) y las 5 estrellas son instantáneas. Pero es el único punto donde mi opinión queda visible para otros estudiantes y **el modal final no dice qué se publica, si es anónimo, ni si se puede borrar**: eso frena. Además «Calificar» sugiere calificar el ramo y el primer modal es de sección, no de calificación: el título del flujo llega a `Calificar profesor` recién en el paso 2.

**Bugs / mejoras:**
- 🟠 El paso final no aclara visibilidad/anonimato/posibilidad de eliminar. Añadir 1 línea: «Se muestra a otros estudiantes de la UC como "estudiante de Cálculo I". Puedes borrarla cuando quieras.»
- 🟠 Cambiar de paso re-renderiza todo el diálogo y el foco salta (el nodo `dialog` pierde su nombre en el paso final: pasa de `dialog Calificar profesor` a `dialog` vacío), así que un lector de pantalla no anuncia en qué paso va.
- 🟡 `¿CUÁL ES TU SECCIÓN?` en mayúsculas mientras el resto del diálogo usa mayúsculas normales; inconsistente con el resto del modal.
- 🟡 El modal guarda la sección antes de que el usuario termine el flujo: si cancelo en el paso 3, `Sección 3` queda guardada igual, sin aviso.

## 12. Álgebra Lineal (MAT1203) — notas parciales y estados del ramo

**Qué se ve (al entrar sin notas):** promedio héroe `Sin notas`, cartel `Necesitas 4,0 en lo pendiente para aprobar`, y en cada evaluación `Interrogación 1: necesitas 4,0. Toca para anotar la nota real`. Debajo, el bloque `Notas sombra` (activado) con control `¿Cuánto quieres necesitar en el examen?`, stepper `− [4,0] +` y slider `sombra-rango`, más la frase `Necesitas 4,0 en cada evaluación pendiente.`

**Notas ingresadas:** IQ1 6,2 · IQ2 5,5 · IQ3 6,8 · Lab1 7,0 · Lab2 6,4 · Lab3 5,9 (Examen 30% queda pendiente para el cierre).

**Estados que aparecen y que están muy bien:**
- `Va aprobando · falta 10%` → `falta 7%` → `falta 3%` a medida que se anota.
- Al asegurar la aprobación: `Ya aprobaste, aunque saques 1,0 en lo que queda.` + `Con estas notas ya alcanzas para aprobar.` y el botón `Bajar una décima` se **deshabilita** correctamente.
- Eco `Promedio general 4,6 → 5,4`.
- Home: chip `1 va aprobando1 en riesgo3 pendientes` y sub-título `2026-25 ramos · 30 créditos`; tarjeta `Última nota` (`Laboratorio Álgebra Lineal 5,9 Nota`).

**Bugs / fricciones:**
- 🟠 **Chips de home pegados, sin separador**: `1 va aprobando1 en riesgo3 pendientes` y `MAT161070% evaluado`. Son 3 datos distintos que se leen como una palabra. Repro: tener ≥2 ramos con estados distintos y ver `PROMEDIO GENERAL` en Inicio.
- 🟠 El eco del promedio **retrocede**: tras anotar IQ3 = 6,8 el texto dice `Promedio general 5,4 → 5,2` (baja) porque el promedio anterior incluía notas sombra y el nuevo no; sin explicación se lee como bug. Repro: ramo con notas sombra activadas → anotar nota alta → mirar eco.
- 🟠 reaparece el mismo error de la pauta guardada: no hay forma de saber si el ramo tiene pauta propia o consenso (en Cálculo I decía `Ponderaciones según true estudiantes`).
- 🟡 `Laboratorio 10% · promedio de 3 ·` (sin valor cuando no hay notas) deja la línea colgando con el `·` final.
- 🟡 Persiste la pérdida de nota si Enter llega muy rápido después de tocar el botón (reproducido otra vez con Interrogación 3 y Laboratorio 1; hubo que repetir la anotación).
- 🟡 `Notas sombra` sigue activado por defecto en cada ramo nuevo.

## 13. Desafíos de la Ingeniería (ING1004) — ramo sugerido con pauta real y reglas del programa

**Qué se ve:** encabezado `Desafíos de la IngenieríaING1004 · 10 créditos`, etiqueta `Programa 2026-1`, `Sin notas`, `Necesitas 4,0 en lo pendiente para aprobar`, `Simular`, y un acordeón **`6 reglas del programa que el promedio no incluye`** con dos listas:
- «Reglas de tu curso que el promedio no incluye. Están en el programa, pero dependen de información que la app no puede tener:» (5 viñetas, p. ej. «Las notas de las Presentaciones y de la Feria se ajustan según tu evaluación de pares: ingresa la nota ya ajustada», «…esa tarea queda con nota máxima 4,0»).
- «Reglas que todavía no calculamos. Las vamos a incorporar. Por ahora el promedio no considera:» (1 viñeta: «Si en tres de las cuatro evaluaciones de pares quedas bajo el promedio de tu equipo, repruebas con el mínimo entre tu nota y 3,9»).
- Cierre: `Compáralo con el programa del curso.`

Evaluaciones del ramo: `Participación en talleres 7.5%`, `Tareas 30% · promedio de 4`, `Actividades y cuestionarios 12.5% · 0 notas`, `Presentaciones 30% · promedio de 3`, `Pre-Feria 7.5%`, `Feria Tecnológica 12.5%`. Las evaluaciones sueltas traen botón `+ Nota` (`Anotar nota de Pre-Feria`), no el botón verde de «necesitas X».

**Notas ingresadas:** Participación en talleres 6,5 → `Promedio general 5,4 → 5,8`, toast `Vas 6,5 · buen margen en lo pendiente`. Pre-Feria 3,9 → aparece la regla aplicada: **`Evaluación grupal va 3,9 (mín. 4,0): topa tu nota final`** y el eco baja a `5,8 → 4,9`.

**Qué siento / pienso:** es el momento «wow» del producto: la app conoce el ramo real, sabe que hay evaluación de pares y te avisa que el promedio no la incluye. Como alumno de primer año eso da mucha confianza, y el aviso del tope (3,9 topa la nota) es justo lo que un Excel no te dice.

**Bugs / mejoras:**
- 🟠 `Programa 2026-1` en un ramo que cursé en `2026-2`: o el catálogo está desactualizado o la etiqueta no sigue el semestre elegido en el onboarding. Confunde (¿me está mostrando el programa viejo?).
- 🟠 Los porcentajes usan punto decimal (`7.5%`, `12.5%`) mientras el resto de la app usa coma (`4,0`, `6,5`). Inconsistente para Chile.
- 🟡 El aviso dice `6 reglas…` y muestra 5 + 1 repartidas en dos listas con encabezados distintos: el título debiera decir «5 que no incluye + 1 que todavía no calcula» o separar el conteo.
- 🟡 Para ramos con evaluaciones sueltas no aparece el botón verde `necesitas X`, así que el cálculo estrella («qué necesito para aprobar») no está disponible en todo el ramo: inconsistencia con Cálculo I/Álgebra.
- 🟡 `Actividades y cuestionarios 12.5% · 0 notas ·` termina en `·` y obliga a entrar al grupo para poder anotar.

---

## 13. AGENDA (评测/evaluaciones) — ~5 min
**URL:** https://gradehub.cl/ (pestaña `Agenda`). **Layout:** título "Agenda" + botón "Calendario" (tooltip: "Agregar evaluaciones al calendario"); H1 "Qué se viene" + conteador; segmentado "Evaluaciones | Horario"; link "Ver mes"; bloque "Tus prioridades" con orden (Fecha | Recomendado | Peso); tarjetas grandes "PRÓXIMA EVALUACIÓN" y "SIGUIENTE"; listas "Pendientes (n)" y "Ya rendidas (n)" con "Ver todas"/"Ver menos".

### Buenas ideas confirmadas
- "Tus prioridades" + chip de orden "Recomendado" (no solo fecha) y "Peso".
- Tarjeta SIGUIENTE trae gauge y texto: "Feria Tecnológica · Desafíos de la Ingeniería · En 2 semanas · 10 dic · 12.5% del ramo · **Necesitas 4,0 promedio en lo pendiente para aprobar el ramo. Al alcance.**" → el cálculo de aprobación llega hasta la agenda. Muy bien.
- "5 compañeros la tienen 30 nov" / "3 compañeros la tienen 2 dic": dato social que ayuda (o presiona).
- Calendario mensual ("Ver mes" → "Ocultar mes") con marca "hoy" y "Lunes 30 de noviembre, 1 evaluación"; al tocar el día aparece "Lunes 30 de noviembre" + evaluación. Botones "Mes anterior / Mes siguiente / Hoy".
- **La primera vez no había botón de importar .ics**; el botón "Calendario" solo abre un modal de AYUDA ("Todavía no tienes fechas. Tráelas desde tu calendario.") — y lo decía **aunque ya había 2 fechas** (Examen sin fecha, Pre-Feria sin fecha). Ver bug B-11.

### B-11 (🟠) Modal de calendario dice "Todavía no tienes fechas" habiendo evaluaciones
1. Ir a Agenda con evaluaciones creadas (todas sin fecha).
2. Tocar "Calendario".
3. Resultado: modal con copy de estado vacío ("Todavía no tienes fechas. Tráelas desde tu calendario.") y recién entonces el campo "Importar .ics". El botón se llama "Calendario" y su tooltip dice "Agregar evaluaciones al calendario", pero su primera función es importar. **No se entiende que exista importación de .ics.**
**Cambio:** botón separado "Importar .ics" visible en la barra de Agenda; el modal de ayuda solo cuando no hay nada.

### Importación .ics (probada con archivo propio de 3 VEVENT)
- Campo "Seleccionar archivo / Importar calendario (.ics)"; al subir aparece modal **"Revisa las fechas"** con la lista de eventos, columna RAMO y EVALUACIÓN, y botones "Cancelar" / "Agregar fechas elegidas".
- Copy excelente: "Máximo 500 KB y 250 eventos. **Solo leemos títulos y fechas; tus notas no se tocan.**" → privacidad clara.
- **Bug B-12 (🟠): el emparejamiento automático nunca funcionó.** Con eventos titulados "Examen Final Calculo I MAT1610" y ramo "Cálculo I / MAT1610" en la app, las 3 filas quedaron en "**Sin asignar**" y "Elegir ramo" (aunque el título coincide casi exacto). Recién al elegir el ramo aparece la etiqueta "Coincidencia propuesta". Si el texto promete coincidencias, deberían proponerse al menos las obvias.
- **Bug B-13 (🟡): el desplegable EVALUACIÓN duplica opciones** ("Interrogación 1" dos veces, "Interrogación 2" dos veces, "Pre-Feria" dos veces, "Participación en talleres" dos veces) y a la vez ofrece opciones del ramo que no existen ("Laboratorio", "Laboratorio 1" repetida). Imposible saber a cuál asigna.
- Tras elegir: toast "**2 fechas agregadas**" y la agenda pasa a "4 pendientes · **2 por venir**"; las fechas reaparecen en "Tus prioridades" con "En 4 días · 30 nov". Buen feedback.

## 14. AGENDA → pestaña "Horario"
- Estado vacío: "**Arma tu horario** / Sube el pantallazo de «Carga Académica» de Mi UC y armamos tu semana. **Antes de guardar, lo revisas.**" con "Subir foto del horario" y "Agregar a mano". Muy buena promesa (no conecta cuentas, revisas antes).
- "Agregar a mano" → modal 1 paso "**¿De qué ramo es la clase?**" (lista de ramos) → "**Horario de Cálculo I**" con: "Se repite cada semana. Horas de Chile.", checkboxes Lunes…Domingo, Inicio/Fin, Sala (opcional), Tipo (opcional) (Teórica…), switch "Voy a esta clase", "Copiar bloque", "Quitar", "+ Agregar bloque", "Cancelar", "Guardar horario".
- **Bug/localización B-14 (🟠):** los campos Inicio/Fin son `<input type=time>` en formato **12 h con AM/PM** ("-- : -- --", steppers Hours/Minutes/AM-PM). En Chile se usa horario 24 h (08:30–10:00); un estudiante UC no pensará en AM/PM. **Cambio:** `formato 24h` o texto "08:30" sin AM/PM.
- **B-15 (🟡):** etiquetas pegadas "Sala(opcional)" y "Tipo(opcional)"; hay un nodo `alert` vacío en el modal (contenedor de avisos sin contenido).
- Al guardar: toast "Horario guardado", bloque renderizado en la semana (Lun 23, 08:30–10:00, "MAT1610"), link "Editar horario" y aviso "4 ramos sin horario / Completar". Bien.
- **Rozamiento 🟡:** el panel del día elegido ("Jue 26 · Nada agendado para hoy") convive con "Semana completa" donde sí hay bloque; la relación día/semana confunde, y el bloque solo muestra la sigla (MAT1610), no el nombre del ramo ni el tipo.

---

## 15. ESTADÍSTICAS (con 14 notas) — ~4 min
**Confirmado:** el bug de estado vacío **es de actualización (stale render)**: al entrar la primera vez (después de cargar notas) seguía diciendo "Parte con tu primera nota / 1 ramo y 0 evaluaciones configuradas"; en la segunda visita ya muestra todo. **B-16 (🔴) Reproducir:** crear cuenta → agregar ramos/notas → ir a Estadísticas (montada antes de los datos) → muestra estado vacío; volver a entrar y recién carga. **Cambio:** re-renderizar `stats-body` al activar la pantalla.

Con datos, la pantalla tiene:
- "Sem. 2 · 2026-2" + botón "Editar".
- "Tu promedio en el tiempo": 4,9, "−0,87 con Pre-Feria de Desafíos de la Ingeniería", gráfico con línea de referencia "4,0 · referencia", **slider "Explorar tu promedio en el tiempo"**, rango "Semana | Mes | Semestre", "＋Ver línea de tiempo" → lista "Notas de más reciente a más antigua" con "Nota 3,90 / Promedio 4,9 ↓ −0,87 puntos" y "Ver más".
- "Peso evaluado 52% · Del peso evaluable de tus ramos."
- "Tus prioridades hoy": ramos ordenados con "Vas 3,9 · En lo que te queda necesitas: 4,0 · AL ALCANCE".
- "Qué mueve tu promedio": "Álgebra Lineal +0,43 / Cálculo I −0,10 / Desafíos −0,33" + "Cuánto sube o baja cada ramo tu 4,9, según sus créditos."
- "Cómo vas respecto a los demás": "Igual o por sobre el 52% de tus 60 compañeros".
- "Rango del semestre": "TU PROMEDIO FINAL PUEDE QUEDAR ENTRE **3,3 y 6,2** · El rango considera sacar entre 1,0 y 7,0 en todo lo pendiente, incluidas las reglas que pueden topar una nota."
- "Historial / + Semestre anterior".
- "Editar Estadísticas": modal con "Ordena las secciones o esconde las que no miras. Se guarda al momento y solo cambia tu pantalla." Subir/Bajar + checkbox Mostrar por sección y "Listo".

**Bugs / roces:**
- 🟠 **B-17** Eje X del gráfico muestra "**26 nov**" en los dos extremos (inicio y fin iguales) con un solo punto real: parece error de escala.
- 🟠 **B-18** "Igual o por sobre el **100%** de tus 47 compañeros" ( Álgebra ) — percentil 100% imposible/redondeo; confunde ("¿soy el mejor del curso con 6,2?").
- 🟡 **B-19** Los nombres del modal "Editar Estadísticas" no coinciden con los de la pantalla: "Qué mirar primero" vs "Tus prioridades hoy"; "Cómo vas en tus ramos" vs "Cómo vas respecto a los demás".
- 🟡 **B-20** Textos pegados: "Peso evaluado52%", "Pre-FeriaDesafíos de la Ingeniería26 nov", "Nota3,90", "Promedio 5,4↓ −0,01 puntos".
- 🟡 Mezcla de precisión: promedio con 1 decimal (5,4) y delta con 2 (−0,01 / "Sin cambio").
- 🟢 Muy bien: "Qué mueve tu promedio", rango 1,0–7,0 y que la edición de secciones guarde al instante.

## 16. PERFIL + AJUSTES — ~7 min
**Perfil** (`nav-perfil`): tarjeta "Gonzalo / Ingeniería Industrial / UC · 2.º semestre / gpruebahark@prueba.cl" (botón "Editar tu nombre y tu cuenta"), y 4 grupos: **TU SEMESTRE** (Universidad y carrera, Calendario, Canvas, Archivar semestre), **HERRAMIENTAS** (Calculadora de nota, Cargar semestres pasados, Subir foto de tu horario), **LA APP** (Apariencia, Agentes conectados, Sugerencias y comentarios), **TU CUENTA** (Datos y cuenta, Ofrecer clases o material) + "Cerrar sesión".
Cada ítem abre el **mismo modal "Ajustes"** con sidebar + buscador ("Buscar en Ajustes", "1 sección encontrada", y estado vacío útil: "No encontramos esa opción. Prueba con «carrera», «correo» o «fondo»."). Buena arquitectura, pero **duplica** los accesos de Perfil (🟡: el usuario no sabe si está en "Ajustes" o en "Perfil").

- **Apariencia:** "Modo, acento y fondo · Se guarda al elegir." Sistema/Claro/**Oscuro** (funciona, tema oscuro impecable, sin contrastes rotos en las pantallas probadas), COLOR DE ACENTO (Turquesa, Azul, Índigo, Violeta, Cobre, Frambuesa), FONDO (Neutro, Pizarra, Papel). 🟢
- **🔴 B-21 "Apoyo" (Ajustes) se queda cargando para siempre:** Ajustes → Apoyo → queda "Ofrece clases, material o tu app / **Revisando tu acceso…**" más de 10 s, sin contenido, sin error, sin reintento. Pasos: abrir Ajustes → Apoyo (o Perfil → Ofrecer clases o material). **No hay forma de entrar al marketplace de tutores.** **Cambio:** timeout + botón "Reintentar" y estado "Aún no puedes ofrecer" con motivo.
- **🟠 B-22 No existe ninguna sección de NOTIFICACIONES.** Búsqueda "notifica" → "0 secciones encontradas". Ni recordatorios de evaluación ni avisos de "va aprobando". **Cambio:** al menos "Recordatorio N días antes de una evaluación".
- **Canvas** (no conectado, solo descripto): "Fechas de Canvas UC · 1. En Canvas UC abre Calendario y toca Fuente de calendario, abajo a la derecha. 2. Copia la URL y pégala acá." + campo "URL DE LA FUENTE DE CALENDARIO" + "Conectar calendario de Canvas" + aviso "Quien tenga esa URL ve tu calendario: la guardamos solo en este dispositivo y no la sincronizamos." 🟢隐私 claro.
- **Calendario:** "TU URL DE SUSCRIPCIÓN" (campo con `https://gradehub.cl/cal/<token>`), "Copiar URL", "Generar una nueva", "En Google Calendar: Otros calendarios · + · Desde URL.", "Quien tenga esta URL ve tus evaluaciones y fechas. Tus notas no salen nunca. Si se filtra, genera una nueva." + "TRAER FECHAS DESDE UN CALENDARIO / Importar archivo .ics". 🟠 **B-23** la URL token se muestra en texto plano y no hay que acepte nada para revelarla: bien el aviso, pero se debería ofuscar/permitir "mostrar" y advertir que no se comparte. **
- **Agentes conectados (página del conector MCP):** "Qué puede hacer: Ver tus ramos, notas y fechas, simular escenarios, agregar un ramo y proponerte ponderaciones que tú confirmas. **No puede escribir tus notas ni borrar nada.**" 1) "PREGÚNTALE A TU SECCIÓN…", mensaje listo para copiar ("Quiero conectar GradeHub a este agente mediante una URL MCP… No me pidas que envíe la URL por el chat…") + "Copiar mensaje para mi agente"; 2) nombre de la conexión; 3) "Crear URL de conexión · Dura 90 días y se muestra una vez". Lista "AGENTES CONECTADOS / Actualizar lista / Todavía no tienes agentes conectados", "Ideas para pedirle" (combo: Ponerme al día una vez a la semana / Un plan para mi próxima evaluación / Un plan para lo que queda del semestre) + "Ver el mensaje" + "Copiar", "Ponderaciones por revisar · Nada cambia hasta que la confirmes" + "Ver propuestas" (toast "No tienes ponderaciones pendientes"). 🟢🟢 Es lo mejor de la app en claridad.
  - Probado: crear conexión "Prueba Hark" → aparece la URL en texto plano ("Es como una contraseña: quien la tenga ve tus ramos y notas… No se vuelve a mostrar."), ítem en la lista con "Conectado desde 26 nov 2026, 10:36 p. m.", ÚLTIMO USO "Aún no se ha usado", VENCE "24 feb 2027, 10:36 p. m.", "Desconectar" → confirmación "¿Desconectar Prueba Hark? Dejará de ver tus notas, ramos y fechas al tiro." → toast "Agente desconectado". 🟢
  - 🟡 **B-24** La URL del conector se muestra en texto plano en el DOM y el campo no es de tipo password/oculto; no hay botón "Mostrar/Ohultar" ni expiración visible hasta conectar. 🟡 **B-25** El label accesible del campo de nombre es la concatenación de dos títulos ("1. PREGÚNTALE… 2. PONLE UN NOMBRE A LA CONEXIÓN").
- **Datos y cuenta:** "Respaldos, reinicio y eliminación", "Exportar mis datos", "Importar datos", switch "**Compartir mis ponderaciones en forma anónima**" (**ON por defecto**, con explicación buena), switch "**Usar mis notas para elegir anuncios**" (**ON por defecto** 🟠 B-26: personalización de anuncios activada sin preguntar en una app usada por estudiantes), "COMPARTIDO CON PROFESORES", "PROFESORES BLOQUEADOS", "ZONA SENSIBLE: Eliminar mi cuenta / Reiniciar app" + Términos y Privacidad. *(No se pulsó Eliminar ni Reiniciar, por límite de la prueba.)*
- **Sugerencias y comentarios:** combo "Tengo una sugerencia / Encontré un problema / Otro comentario", "CUÉNTANOS" (0 / 2000, "Mínimo 3 caracteres · queda asociado a tu cuenta"), "Enviar comentario", enlace de correo. 🟡 **B-27** "Enviar comentario" se ve habilitado con 0 caracteres (no refleja la validación de 3). *(No se envió, por límite.)*
- **Información académica:** UNIVERSIDAD solo 5 botones (UChile, UC, UAI, UANDES, UDD), CARRERA con buscador, SEMESTRE DE CARRERA 1°…11°, "Guardar", "Ramos de mi malla", "SEMESTRES QUE YA CURSASTE / Agregar un semestre anterior". 🟠 **B-28** al buscar "Ingeniería" en el catálogo UC **no existe "Ingeniería Industrial"** (solo Ingeniería Civil + majors e Ingeniería Comercial), y sin embargo el perfil de esta cuenta quedó guardado como "Ingeniería Industrial": hay carreras visibles en el perfil que el catálogo no puede volver a seleccionar.
## 17. Herramienta «Cargar semestres pasados» (pegar avance curricular) — Perfil › Herramientas

**Modal «Cargar tus semestres anteriores»** (diseño: modal oscuro centrado, tipografía clara, pasos numerados, link azul al «Sistema de Avance Curricular», botón blanco primario «Subir ficha en PDF», énfasis en negrita en «el archivo no sale de tu dispositivo»). Texto: «Sube tu ficha académica acumulada en PDF. La leemos en tu teléfono: el archivo no sale de tu dispositivo, y antes de agregar nada vas a poder revisarlo.» Pasos 1-2-3 + ayuda «También llegas desde Mi UC › Información Académica › Avance curricular. Si el portal muestra un error, entra de nuevo por ahí.» Disclosure «Pegar el avance curricular como alternativa» con textarea (`m-avance-texto`) y botón «Revisar texto».

**Diseño visual:** muy buena jerarquía y microcopy (privacidad arriba, en negrita). `DisclosureTriangle` nativo sin ícono propio visible (solo el triángulo del navegador), inconsistente con los chevrones del resto de la app.

**Familiaridad:** el flujo imita un importador de Notion/Import-wizard (subir → revisar → agregar), con revisión previa. Bien.

**Pruebas y bugs:**
- **B-22 🟠 El pegado de texto destruye el contenido.** Al escribir/pegar texto con tabulaciones (formato real del avance curricular copiado de HTML), el textarea quedó «20251álculo I 20251álculo II…»: se pierden la tabulación **y la letra siguiente**. Reproducir: Perfil › Cargar semestres pasados › Pegar el avance curricular como alternativa › pegar texto con tabs › mirar el campo.
- **B-23 🟠 El parser solo acepta «Semestre 2025-1».** Con «20251 MAT1004 Cálculo I 3,0 5,1» (formato real del PDF/portal, período 20251) responde: «No hay semestres nuevos para agregar.» / «Sin agregar: sin semestre (4).» y botón deshabilitado «Agregar 0 ramos» — sin decir qué formato entiende ni ejemplo. Con «Semestre 2025-1 MAT1004 Cálculo I 3,0 5,1» sí parsea.
- **B-24 🔴 El parser reemplaza el nombre del ramo por el de su catálogo y no avisa.** Pégué «MAT1004 Cálculo I» y «MAT1005 Cálculo II» y la revisión muestra **«Matemáticas Finitas MAT1004»** y **«Matemática Discreta MAT1005»**. Para una ficha real con ramos renumerados/homónimos, el alumno confía en un nombre equivocado.
- **B-25 🟠 La nota no aparece en la revisión.** «Revisa antes de guardar» muestra nombre, sigla y un número (3,0 = créditos), pero **no la nota** (5,1 / 4,3 / 3,8). Dice «Compara con tu portal y desmarca lo que no calce», pero no se puede comparar la nota. Tampoco se ve la nota en el historial después.
- 🟡 Un checkbox pierde el semestre en su descripción (`Matemática Discreta MAT1005 3,0` sin «2025-1» pese a estar agrupado bajo 2025-1).
- 🟡 Tras «Agregar 3 ramos» la app salta a **Inicio** en vez de quedarse en Perfil; el toast anterior («Vas 5,0 · ramo completamente evaluado») seguía pegado en pantalla.
- 🟢 **Acierto:** tras cargar, Inicio muestra **«↑ 2,03 vs. 2025-2»** bajo el promedio: el delta contra el semestre anterior ya funciona con historial real.
- 🟡 Tras la carga, el subtítulo sigue diciendo **«2026-25 ramos · 30 créditos»**: el texto pegado «2026-2» + «5 ramos» y no aclara si los 30 créditos incluyen los semestres importados.
## 18. Estadísticas con historial importado (revisita)

**Qué se ve:** «Sem. 2 · 2026-2»; «Tu promedio en el tiempo» 5,0 con «+0,13 con Examen de Cálculo I»; slider; Semana/Mes/**Semestre**; «+ Ver línea de tiempo»; «Peso evaluado 62% · Del peso evaluable de tus ramos.»; «Tus prioridades hoy» (Desafíos 3,9 necesita 4,0 — AL ALCANCE; Álgebra 6,2 necesita 1,0 — AL ALCANCE); «Qué mueve tu promedio» (+0,39 / −0,01 / −0,38); «Cómo vas respecto a los demás» (Cálculo I 63% de 60 compañeros; Álgebra **100% de tus 47 compañeros**); «Rango del semestre: TU PROMEDIO FINAL PUEDE QUEDAR ENTRE 3,8 y 6,1» con barra y marca «hoy 5,0»; «Historial» con botón «+ Semestre anterior», «Promedio del historial: 3,0», gráfico «Promedio por semestre 5,0 / Actual · 2026-2», botones «Semestre pasado / Últimos 5 / Desde el inicio» y filas «2025-2 · 1 ramo · 3,0», «2025-1 · 2 ramos · 3,0», que al expandirse muestran «Matemáticas Finitas 10 cr 3,0», «Matemática Discreta 10 cr 3,0», más «Editar» y «Eliminar semestre».

**B-26 🔴 Las notas importadas se pierden y el historial se inventa 3,0.** Pégue «… Cálculo I 3,0 **5,1**» y «… Cálculo II 3,0 **4,3**» (2025-1) y «… Álgebra Lineal 3,0 **3,8**» (2025-2). El historial muestra **3,0 en rojo para ambos semestres** (2025-1 debería ser 4,7). El rojo de «nota reprobada» aparece en ramos que aprobé. Además contamina el delta de Inicio («↑ 2,03 vs. 2025-2»). Reproducir: pegar avance con notas → Agregar → Estadísticas › Historial.

**B-27 🟠 Créditos mal parseados.** Con «3,0» (créditos UC típicos) cada ramo queda **«10 cr»**.

**B-28 🟠 «Usar nota del portal» llega vacía y reemplaza el modal.** El modal «Corrige el promedio final de este ramo en 2025-1. No se tocan sus evaluaciones» con campo `PROMEDIO FINAL (1,0 – 7,0)` = 3,0 y botones «Usar nota del portal / Restaurar / Guardar». Al tocar «Usar nota del portal» el contenido se cambia a «Nota final del portal de tu universidad. No cambia tus evaluaciones.» con «NOTA FINAL OFICIAL» **vacío («—»)** y botones «Cancelar / Guardar» — sin la nota que sí venía en el texto pegado, y desaparece «Restaurar». Como «Guardar» queda en verde primario, un usuario puede guardar una nota oficial vacía.

**Diseño visual:** el Historial es lo mejor de la pantalla: caption «Promedio del historial», gráfico de área, chips de rango temporal, filas expansibles. Detalle 🟡: el eje Y muestra «6 / 5 / 4,0 (línea de referencia punteada) / 3» y el 4,0 de referencia se confunde con un tick; la fila expandida no separa créditos de nota con espaciado («Matemáticas Finitas10 cr3,0» pegado). Los botones «Editar»/«Eliminar semestre» aparecen solo al expandir, sin ícono de más/unir que lo sugiera.

**Familiaridad:** los toggles Semana/Mes/Semestre y «Últimos 5 / Desde el inicio» imitan bien Apple Fitness/Notion; el patrón de fila que se expande es el esperado. 🟡 «Eliminar semestre» sin confirmación visible al primer toque (no confirmé pulsándolo para no arriesgar datos).
## 19. Simulador global «Simular el semestre completo» (Inicio)

Modal «Simular el semestre» — «Cambia la nota final de cada ramo y mira tu promedio. No se guarda.» PROMEDIO PROYECTADO grande en verde, lista de los 5 ramos con botón −, campo de nota, botón +, línea «Actual 5,0 · 100% evaluado» o «Sin evaluaciones», «Reiniciar todo» y «Listo». Al tocar + aparece «Volver al real» y el delta «↑ 0,02 vs 5,03 actual».

**Diseño visual:** excelente jerarquía (número grande arriba, ramos con punto de color por estado, botones −/+ tipo stepper). 🟡 Los campos de nota de ramos «Sin evaluaciones» no tienen valor ni placeholder visible (solo un guion largo), y **no se puede escribir en ellos**: `setValue` falla («no element_id, no x/y…») y solo sirven los botones +/− (paso de 1,0, sin décimas). 🟡 Cada toque re-renderiza la lista completa (los índices se invalidan).
🟢 «Reiniciar todo» y «No se guarda» cumplen: al cerrar, el promedio real no cambia.

## 20. Cierre del semestre (llenado total de notas)

Notas ingresadas para cerrar 2026-2: **Álgebra Lineal** Examen 5,4 → 6,0 ✓ Aprobado. **Desafíos de la Ingeniería**: Tareas 5,2 / 6,4 / 3,5 / 5,8 (promedio 5,2), Actividades y cuestionarios 6,1 / 4,4 (5,3), Presentaciones 5,0 / 3,4 / 4,8 (4,4), Feria Tecnológica 4,2 → **4,8 ✓ Aprobado**. **Matemática I**: hubo que armar la pauta (ver §21) y se puso 3,0 / 2,5 / 3,5 / 2,0 → **2,8 ✕ Reprobado**. **Taller de Emprendimiento e Innovación**: pauta nueva 30/30/40 y 5,5 / 4,8 / 4,1 → **4,7 ✓ Aprobado**.

**Qué muestra la app al cerrar:**
- Ficha de ramo: número grande 2,8 en rojo + chip **«✕ Reprobado»** (rojo) o **«✓ Aprobado»** (verde), píldora «Promedio general 4,7 → 4,6» y toast «Vas 2,8 · ramo completamente evaluado».
- Inicio: PROMEDIO GENERAL 4,7 (amarillo), «↑ 1,66 vs. 2025-2», chips «2 aprobados · 2 en riesgo · 1 bajo 4,0», «Última nota».
- Estadísticas: «Peso evaluado 100%», desaparecen «Tus prioridades hoy» y «Rango del semestre» (correcto, ya no hay pendiente), «Qué mueve tu promedio» con −0,38 de Matemática I, Historial.

**Bugs / roces del cierre:**
- **B-29 🟠 Un ramo «✓ Aprobado» aparece como «en riesgo» en Inicio.** Desafíos 4,8 y Taller 4,7 dicen «✓ Aprobado» en su ficha pero en los chips de Inicio cuentan como **«2 en riesgo»**. Contradicción entre pantallas.
- **B-30 🟠 «Promedio general 4,7 → 4,7»** (flecha de ida y vuelta sin cambio) en Taller: cuando el promedio no se mueve debería decir «Promedio general 4,7» o no mostrarse.
- **B-31 🟠 El promedio general queda «simple» y la app culpa a los créditos.** «Promedio simple porque faltan los créditos de Matemática I y 1 más. Si los pones en Editar ramo, se calcula ponderado por créditos.» Los ramos sugeridos sí traían créditos (Cálculo 70%, Álgebra 10 cr); los agregados a mano/no, y el aviso dice «falta el crédito» en singular y luego «y 1 más».
- 🟡 En la ficha de Matemática I y Taller el chip de % queda «100%» sin sigla, mientras los otros dicen «MAT1610 100%»: inconsistencia de formato.
- 🟡 «Cómo vas respecto a los demás» solo cubre 2 de 5 ramos y sigue diciendo «Igual o por sobre el 98% de tus 47 compañeros» sin explicar de dónde salen los compañeros.
- 🟢 El feedback al anotar nota es excelente: toast con nota y estado, píldora del promedio general, y el «Examen: necesitas 4,0. Toca para anotar la nota real» que se transforma en campo.

## 21. «Armar mis ponderaciones» (pauta a mano desde cero)

Empty state de ramo sin pauta: ícono de carpeta, «Sin notas» / «Agrega evaluaciones para comenzar» / «Todavía no tenemos las ponderaciones de este ramo» / «Ármalas con el programa del curso: el nombre de cada evaluación y su porcentaje.» y botón **«Armar mis ponderaciones»**. **En otro ramo sin pauta el empty state es distinto**: «Sin evaluaciones» / «Agrega tus pruebas, controles o tareas con su porcentaje del ramo. Puedes incluir la fecha para que aparezcan en la Agenda.» y botón **«Agregar evaluaciones»** (que abre el mismo modal). 🟠 Dos nombres y dos textos para la misma acción.

Modal: «Parte con una estructura» con 4 presets («3 pruebas + examen», «2 pruebas + examen», «3 interrogaciones + laboratorio (3) + examen», «2 interrogaciones + tareas (3) + participación + examen»), aviso «Los pesos quedan en 0%. Confírmalos con el programa del curso.», «Copiar de otro ramo» (combo con los ramos y nº de evaluaciones), barra de progreso «0 / 100% · faltan 100%» → «✓ 100 / 100% · ponderaciones listas», filas con combobox de nombre + campo de peso + «Usar 100%» + «Reglas de esta evaluación», «+ Agregar evaluación», «Requisitos que combinan evaluaciones», «Eximición del examen», «Cancelar» / «Guardar». Toast final «✓ Listo, ya suma 100%».

- **B-32 🔴 Escape cierra el modal y borra todo lo escrito, sin confirmación ni borrador.** Toqué Escape (después de que un menú «Opciones de Prueba 3» quedara abierto) y al volver a entrar la pauta estaba vacío. Reproducir: ramo sin pauta → Armar mis ponderaciones → preset → escribir pesos → Escape.
- 🟠 Los presets dejan **todos los pesos en 0 %** y no hay botón «repartir en partes iguales»; el único atajo es «Usar 100 %» por fila, que no es lo que uno espera de un preset.
- 🟠 Al escribir el peso del último ramo, el campo puede quedar **cubierto por el pie del modal** («Node … is covered by a div»): hay que scrollear el modal; el modal no auto-scrolla el campo enfocado.
- 🟡 El botón «…» de cada fila se abre con un simple clic en el campo de peso vecino (área de clic muy amplia) y el menú queda flotando sobre las filas.
- 🟢 Buenas microinteracciones: barra de progreso que pasa a verde con tilde, combobox de nombre, y que «Guardar» funcione aunque falten porcentajes («Puedes guardar aunque falten algunas»).
## 22. «Archivar semestre» (cierre real del semestre) — Perfil › TU SEMESTRE

Modal **«Archivar 2026-2»** — «Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo.» Una tarjeta por ramo: nombre, **«Calculada: 2,8»** y campo **«Nota final oficial / del portal de tu universidad»** (Value «—»). `alert` vacío con id `cierre-error`, «Cancelar» y **«Archivar semestre»**.

**Diseño visual:** tarjetas oscuras con borde, «Calculada» en gris y el campo con guion largo; muy claro y familiar (es el patrón de «nota oficial del portal» que todo estudiante conoce). 🟠 Las notas calculadas **no vienen precargadas** en el campo: hay que reescribir a mano las 5 notas que la app ya conoce. 🟠 **El pie del modal (Cancelar / Archivar semestre) queda fuera de la pantalla** en alto de 900 px: al pulsar el nodo la app responde «Node … is covered by a div, so nothing was clicked» y `scroll` del `modal-content` no lo trae; hay que clicar las coordenadas del botón a medias. 🔴 Riesgo alto: el botón primario a mitad de la pantalla, medio cortado.

**Qué muestra al archivar (lo que pasó):**
- El semestre desaparece de Inicio: **«PROMEDIO GENERAL ·»**, «Agrega tu primer ramo para empezar a llevar tus notas.» y botón «Agregar ramo». **No dice en ninguna parte que el semestre se archivó, ni su promedio final, ni que quedó guardado.** No hubo toast ni pantalla de resumen («Cerraste 2026-2 con promedio 4,7 · 4 aprobados, 1 reprobado»).
- El ítem **«Archivar semestre» desaparece de Perfil** (ya no hay semestre activo que archivar), sin reemplazo visible tipo «Semestre archivado».
- Aparece modal **«¿Cómo fueron tus ramos? / Si quieres, deja tu opinión de los que cerraste.»** con un solo ramo («Cálculo I») y «Ahora no». 🟠 De 5 ramos cerrados solo ofrece calificar 1.
- **Estadísticas NO se actualiza:** sigue mostrando «Semestre actual · 2026-2», «Peso evaluado 100%», «Qué mueve tu promedio… tu 4,7» y «4,7 Actual · 2026-2» con los ramos ya archivados (B-16 ampliado: el estado de Estadísticas queda **stale** tras archivar; hay que recargar).
- 🟠 El promedio del semestre archivado **no aparece en «Historial»** (que sigue mostrando solo 2025-2 y 2025-1 con 3,0), así que «el promedio acumulado» que promete el texto del modal no se ve por ningún lado.

**Reproducir (B-34 🔴):** tener un semestre con notas → Perfil › Archivar semestre → completar/«Archivar semestre» → Inicio queda vacío con «PROMEDIO GENERAL ·» y sin confirmación; Estadísticas sigue mostrando el semestre archivado como «Semestre actual».
## 23. Menú «Herramientas» (Inicio) y comportamiento tras archivar

Botón de wrench arriba a la derecha (`herramientas-boton`) → menú `herramientas-menu` con 3 ítems con ícono: **Calculadora de nota**, **Subir foto del horario**, **Cargar semestres pasados**. Bien (patrón de menú esperado), 🟡 el botón es solo un ícono sin label visible ni tooltip.

**Tras archivar, «Agregar ramo» sigue funcionando y vuelve a crear el mismo semestre 2026-2**: Inicio muestra «2026-2 · 1 ramo», «Abre un ramo para ingresar tu primera nota», «1 pendiente» y PROMEDIO GENERAL «·»; en Estadísticas el mismo 2026-2 aparece dos veces (archivado en Historial con 4,7 y «Semestre actual · 2026-2» arriba). 🟡 Además el buscador sigue sugiriendo **Cálculo I y Álgebra Lineal**, ya cursados/aprobados, sin marcarlos.

**Microinteracción a favor:** tocar la fila del ramo en «Agregar ramo» lo agrega al instante con toast «Agregado con sus ponderaciones» 🟢. 🟠 Pero al hacerlo el botón «Agregar ramo» del pie del modal desaparece, y si se había pulsado antes el nodo queda inválido («node 125 is not on the page»): la misma acción tiene dos caminos con estados distintos.

## 24. Historial con el semestre cerrado (Estadísticas)

Al expandir **2026-2 · Sem. 2 · 5 ramos · 4,7** (amarillo) lista cada ramo con su nota final coloreada: Matemática I **2,8** rojo, Cálculo I 10 cr **5,0** verde, Álgebra Lineal 10 cr **6,0** verde, Desafíos 10 cr **4,8** amarillo, Taller **4,7** amarillo. Botones «Editar» / «Eliminar semestre». Gráfico «Promedio por semestre» con línea verde y área, «Promedio del historial: 4,0» y chips «Semestre pasado / Últimos 5 / Desde el inicio».

- 🟠 **No dice aprobado/reprobado** en el historial, solo el color de la nota; «✕ Reprobado» desaparece al cerrar. Para un alumno que reprobó Matemática I, el dato clave (reprobé) no queda registrado visualmente.
- 🟠 La «nota final oficial del portal» ingresada al archivar no se distingue en ningún lado.
- 🟡 Donde no había créditos, la fila no muestra «cr» (Math I y Taller), y el «Promedio del historial: 4,0» es simple, no ponderado, sin decirlo.
- 🟢 Buen uso del color (semáforo 0-7) y buen gráfico de área; familiar (Apple Health / Notion).
