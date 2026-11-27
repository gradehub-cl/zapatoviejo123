# Auditoría UX competitiva — NORA (bynora.cl)
Fecha: 2026-11-26, ~23:25 (America/Santiago). Cuenta: [correo] (Google → Supabase OAuth).

## 0. Login
- URL de partida: https://[proyecto].supabase.co/auth/v1/authorize?provider=google&redirect_to=https://bynora.cl
- Flujo: Google "Welcome" → pide contraseña (sugiere "Try another way" para passkey) → Next → redirige directo a https://bynora.cl/app con sesión activa. NO pidió consentimiento/choice screen (cuenta ya autorizada) ni 2FA adicional.
- 1 solo intento, exitoso. Sin pantalla de "creando tu cuenta", sin loading de onboarding.

## 1. /app — "Ramos" (pantalla principal)
- Título H1 "Ramos", subtítulo "Gestiona tus cursos y notas". Logo "n" (NORA) arriba a la izquierda.
- Dos botones de ícono arriba a la derecha SIN nombre accesible (solo `button` con `image`): uno es papelera (basura) y otro "+". El de papelera en la cabecera es ambiguo y peligroso: no dice qué borra.
- Selector de semestre: combobox con valor "Segundo Semestre 2026".
- Tarjeta de resumen: promedio grande "-.-" y anillo de progreso "0%".
- Botón/banner: "Ranking anónimo — Verifica tu identidad para comparar tu progreso" (comparación social, requiere verificación de identidad).
- Tarjeta de ramo preexistente: "Cálculo I", "MAT101", etiquetas "ACTUAL -.-" y "APROBACIÓN -.-"; aparece texto "Eliminar" en el árbol (borrado en hover/deslizamiento).
- Botón "Agregar ramo" (borde punteado, estilo dashed placeholder).
- Navegación inferior (bottom tab bar, 3 tabs): "Escala" (/app/escala), "Ramos" (/app), "Ajustes" (/app/config). No hay menú de usuario, ni calendario, ni IA visible en la nav.
- No hay nombre del usuario visible en ninguna parte (no se confirma qué cuenta está sesión activa).

### Impresiones (qué veo / siento / pienso)
- VEo: dark mode por defecto, columna angosta tipo app móvil (~430 px) centrada en escritorio con grandes márgenes negros.
- SIENTO: limpio y ordenado, pero vacío y algo frío; la página de inicio no dice quién soy ni qué puede hacer NORA.
- PIENSO: es un layout mobile-first portado a desktop sin reflow; desperdicia el ancho y obliga a saltos de atención. La barra inferior en desktop es inusual (familiaridad web baja).
- NO INTUITIVO: "-.-" como valor vacío (en vez de "sin notas"); "0%" sin etiqueta de qué mide; íconos sin tooltip/etiqueta; "Escala" como nombre de tab no dice que es conversor/calculadora de notas.

## 2. Modal "➕ Agregar ramo" (bottom sheet, ancho completo)
- Campos: ÍCONO (15 botones de ícono, sin nombre accesible ni tooltip), NOMBRE DEL RAMO *, SIGLA *, CRÉDITOS * (stepper, default 10), PROFESOR (OPCIONAL), SECCIÓN (OPCIONAL, stepper default 1), GRUPO (OPCIONAL, stepper default 1).
- Botón "Crear ramo" deshabilitado hasta completar obligatorios (correcto). El botón aparece duplicado en el árbol (dos nodos "Crear ramo": una versión desktop y una mobile).
- NO hay selección de UNIVERSIDAD ni CARRERA ni semestre al crear el ramo: el onboarding/catálogo no está en el flujo.
- Placeholders usados como ejemplos ("Cálculo I", "MAT101", "Juan Pérez") y etiquetas en mayúsculas con asterisco. Los íconos son la única forma de distinguir el ramo.
- Toast de éxito: "✨ Ramo agregado" (esquina inferior derecha en desktop).
- Tras crear, el modal se cierra solo (bien), y la tarjeta del ramo aparece bajo "Cálculo I" (rama que ya venía en la cuenta).

## 3. Detalle de ramo — /app/ramos/{uuid}
- Cabecera: botón "‹ Ramos" (back), botón de menú "Opciones del ramo" (⋮) con solo dos ítems: "Editar información" y "Eliminar ramo".
- Título H1 nombre del ramo, sigla, "Prof Prueba HARK · 8 créditos".
- Tarjeta "ACTUAL –.–" y "APROBACIÓN –.––" (al inicio, antes de poner pesos, no se calcula nada).
- Texto de peso acumulado: "0.0% / 100%" en color ámbar.
- "+ Agregar grupo de evaluaciones" → modal "📂 Tipo de grupo" con 6 opciones: "📝 Interrogaciones", "🔬 Laboratorios", "🛠️ Talleres", "📋 Controles", "📖 Examen", "➕ Otro". Un clic crea el grupo (toast "✨ Grupo creado"). No pide peso: el grupo nace en 0%.
- El grupo se colapsa/expande; en su header muestra "Interrogaciones 5.5 30%"; su menú (⋮) tiene solo "Agregar nota mínima" y "Eliminar grupo".
- "+ Agregar Evaluación" agrega una fila INLINE (no modal): nombre autogenerado "I1 ·", campo % (default 0), campo nota (placeholder "–"), y "Promedio –.–".
  * BUG/UX: la fila es ilegible en el ancho de columna: el nombre queda en ~30 px, el campo de nota salta a una segunda línea y "Promedio –.–" flota a la derecha desalineado. No hay etiquetas visibles ("Peso", "Nota").
  * El nombre "I1" se genera por tipo de grupo pero no hay campo claro para editarlo (no aparece como text field en el árbol).
- Comportamiento matemático observado: el peso del grupo es la SUMA de los pesos de sus evaluaciones (30% → "30.0% / 100%"). Con una sola nota 5.5 al 30%: ACTUAL 5.5, APROBACIÓN 3.29. No hay texto que explique qué significa "APROBACIÓN" ni cómo se calcula, y no aparece el clásico "necesitas X para aprobar" en lenguaje natural.

### Validación de pesos (bug de severidad media)
- Con pesos 30% + 80% el sistema acepta 110% sin mensaje de error: solo el texto "110.0% / 100%" y el "110%" del grupo pasan a rojo. No hay toast, ni tooltip, ni impedimento de guardar. Un alumno puede quedar meses con un promedio mal calculado sin saber por qué.
- Con 100% exacto, "APROBACIÓN" vuelve a "–.––" sin explicar que ya no hay ponderación pendiente.
- "Promedio –.–" aparece dentro de cada fila de evaluación incluso cuando el ramo ya muestra promedio: etiqueta confusa (parece promedio de la evaluación, que no tiene sentido) y nunca se llena.

## 4. /app/escala — "Escala de Notas"
- Subtítulo: "Calculadora de conversión puntaje-nota".
- PARÁMETROS: PUNTAJE MÁXIMO (100), EXIGENCIA (%) (50), NOTA MÍNIMA (1.0), NOTA MÁXIMA (7.0), INCREMENTO (combobox, 1) y botón "Generar tabla".
- Genera "TABLA DE ESCALA" con dos columnas (100 filas), separadas por "≥ 4.0" (verde) y "< 4.0" (ámbar). Equivale a la calculadora puntaje→nota de GradeHub, pero en modo tabla.
- FROTIQUES: la tabla es la única salida (no se puede escribir un puntaje y obtener la nota directo), no hay botón de copiar/exportar, no queda guardada entre visitas, y 100 filas en una columna angosta obligan a scroll largo. El separador "≥ 4.0 / < 4.0" aparece arriba pero las columnas no se ordenan por bloques claros.

## 5. /app/config — "Configuración" ("Personaliza tu experiencia")
- Perfil: avatar genérico, nombre "[usuario]", correo "[correo]", botón "Editar" que despliega NOMBRE, APELLIDO, UNIVERSIDAD, CARRERA, AÑO DE INGRESO (inline, con ✕ y ✔ como íconos sin nombre).
- CATÁLOGO (dato clave competitivo): el selector de UNIVERSIDAD tiene **UNA SOLA opción: "Pontificia Universidad Católica de Chile"**. CARRERA tiene 6: College, Derecho, Ingeniería, Ingeniería Comercial, Medicina, Psicología. AÑO DE INGRESO: combobox (2026).
  * La lista de universidades se abre como popup que se monta sobre el campo CARRERA y no tiene buscador: con una sola opción no hay nada que filtrar, y no hay forma de "otra universidad".
- "Nota objetivo": "Tu meta mínima para aprobar ramos", campo 3.95 + "Guardar". Explica el número "APROBACIÓN" del ramo: con nota objetivo 3.95, peso 30% y nota 5.5 → 3.29 = (3.95 − 5.5·0.30)/0.70. El cálculo es correcto pero la app nunca lo explica ni lo formula en lenguaje natural.
- Tema: radiogroup Oscuro (activo) / Claro / Sistema.
- "Sugerencias" (feedback) — NO se envió.
- LEGAL: "Términos y Condiciones — Aceptado el 11-09-2026 · v1.0-2026-02" y "Política de Privacidad — Aceptado el 11-09-2026 · v1.0-2026-02".
- CUENTA: "Cambiar correo", "Cambiar contraseña", "Cerrar sesión", "Eliminar cuenta" (todos a un toque, sin separación de riesgo).
- NO EXISTEN en Ajustes: integraciones (Canvas/Google Calendar), notificaciones, planes/límites, import/export, backups, opción de borrar solo datos de prueba, ni control de visibilidad del ranking.

## 6. "Ranking anónimo" (comparación social) — /app
- El botón dice: "Ranking anónimo — Verifica tu identidad para comparar tu progreso". Al tocarlo, la tarjeta se expande IN SITU (no es modal) con el título "Verificación de ranking" y el texto "Compara tu progreso con otros estudiantes de forma anónima en todos tus ramos."
- Pide: Universidad (fija, "Pontificia Universidad Católica de Chile") y **RUT** (placeholder "12.345.678-9"). El campo autocompleta formato (se escribe 123456789 → "12.345.678-9") y el botón "Verificar" se habilita al escribir un RUT con formato válido.
- Microcopy de confianza incluido: "Tu RUT no se comparte ni se muestra públicamente", "Se usa solo para garantizar una participación única", "Preserva la precisión y equidad del ranking". Botones: "Cancelar" / "Verificar".
- **No se verificó ni se unió al ranking** (límite de la auditoría): se describió el flujo y se canceló. Riesgos detectados: (1) pide una cédula de identidad para un feature cosmético, sin decir qué se publica ni mostrar vista previa del ranking; (2) la Política de Privacidad NO menciona el ranking, el RUT ni la comparación social por universidad: vacío legal/privacy; (3) no hay casilla de consentimiento explícito ni forma de desactivarlo después en Ajustes (solo aparece nombrado en el diálogo de "Eliminar cuenta": "…y participación en el ranking"); (4) no hay forma de verificar que sea realmente un alumno de esa universidad.

## 7. Semestres y progreso
- El selector de semestre tiene **una sola opción** ("Segundo Semestre 2026"): no se puede crear, archivar ni cerrar un semestre, ni volver a un semestre pasado → no hay historial.
- Tarjeta de resumen: promedio ponderado del semestre (5.85 con un ramo de 8 créditos al 100% ponderado y otro sin notas) y un anillo "44%" sin etiqueta que explique qué mide.
- Papelera roja en la cabecera (sin nombre accesible ni tooltip) abre "Eliminar semestre": "Se eliminarán todos los ramos y evaluaciones de este semestre (Segundo Semestre 2026). Esta acción no se puede deshacer." con Cancelar / Eliminar. La confirmación está bien, pero el disparador es un ícono anónimo junto al "+".

## 8. Funciones que NO existen (rutas probadas)
- /app/calendario → 404 · /app/ia → 404 · /app/ranking → 404 · /app/notificaciones → 404 · /app/integraciones → 404.
- No hay calendario/agenda, ni export .ics, ni IA de estudio, ni integraciones (Canvas/Google Calendar), ni notificaciones, ni planes/precios/límites dentro de la app.
- La página 404 está en **inglés** en una app 100 % en español: heading "404", "Oops! Page not found" y link "Return to Home". Bug de i18n.

---

## Limpieza de datos de prueba (2026-11-26, ~23:55 -03)

- `Ramos` → tarjeta "Algebra Prueba HARK / PRH101" → ⋮ "Opciones del ramo" → "Eliminar ramo".
- Diálogo: "🗑️ Eliminar ramo — ¿Estás seguro de eliminar Algebra Prueba HARK? Esto eliminará todas sus evaluaciones y notas. Esta acción no se puede deshacer." Botones "Cancelar" / "Eliminar".
- Tras "Eliminar": toast "🗑️ Ramo eliminado" y volver a `/app`. Queda solo el ramo preexistente "Cálculo I / MAT101" (no creado por esta tarea). Promedio vuelve a "-.-" y progreso a 0%.
- No se pagó, no se conectó Canvas ni otras cuentas, no se publicó nada, no se envió feedback, no se cambió correo/contraseña, no se eliminó la cuenta. El ranking quedó sin verificar (se canceló antes de "Verificar").

## Top 10 problemas (severidad alta → baja)

1. **Catálogo inexistente**: 1 sola universidad y 6 carreras; cualquier estudiante de otra U queda fuera. No hay buscador ni creación de carrera propia.
2. **"Compara con el curso" pide RUT** con verificación anónima, sin explicación del cálculo, sin control posterior en Ajustes y sin mención en la Política de Privacidad (v1.0-2026-02). Riesgo legal (Ley 21.719) y de confianza.
3. **Cero ayuda contextual**: ningún tooltip, ni "¿cómo funciona?", ni ejemplo de fórmula. "APROBACIÓN 3.29" aparece sin decir que significa "necesitas 3.29 en lo que queda".
4. **Acepta ponderaciones inválidas (110.0% / 100%) sin mensaje de error**, solo texto rojo; el promedio sigue calculando y el estado "Completado 0%" no cuadra con las notas.
5. **Fila de evaluación ilegible**: nombre de ~30 px, campo de nota que salta de línea, "Promedio –.–" que nunca se completa.
6. **Sin calendario/agenda ni exportación .ics**; cero integración con Canvas/Moodle.
7. **Sin IA ni asistencia de estudio** pese a que el landing promete una "compañera académica".
8. **Semestres rígidos**: un solo semestre disponible, sin crear/archivar/cerrar; la papelera de cabecera dispara "Eliminar semestre".
9. **Accesibilidad e i18n**: botones de cabecera y menú sin nombre accesible ni tooltip; 404 en inglés ("Oops! Page not found" / "Return to Home").
10. **Fricción en formularios**: modal "Agregar ramo" sin universidad/carrera/semestre; "Guardar cambios" deshabilitado hasta escribir (y sin validación en vivo); sin plantillas de ponderaciones ni autoguardado visible.

## Comparación con GradeHub

### (a) Qué COPIAR igual de NORA
- **Escala puntaje→nota con tabla de 100 filas** y resaltado verde/ámbar según ≥4.0 (`/app/escala`): superior a la calculadora actual.
- **Nota objetivo personalizable** (3.95 en vez de 3.0 fijada) que alimenta la simulación de "necesitas X para aprobar".
- **Cálculo de aprobación por grupo** ((objetivo − nota·peso)/(1−peso)) mostrado junto a cada evaluación.
- **Grupos de evaluación con emojis y pesos** (📝 Interrogaciones, 🔬 Laboratorios, 🛠️ Talleres, 📋 Controles, 📖 Examen, ➕ Otro).
- **Confirmaciones destructivas claras** ("Esta acción no se puede deshacer") y toasts de confirmación.
- **Barra de progreso del ramo** y badge "ACTUAL".
- **Tema Oscuro/Claro/Sistema** con conmutador visible en Ajustes.
- **Microcopy de privacidad** en el punto de captura ("no se muestra tu nombre") — aunque en NORA es insuficiente, la idea de explicar en el momento de la captura es copiable.

### (b) Qué GradeHub ya hace MEJOR
- Multi-universidad y catálogo ampliable (NORA: 1 universidad).
- Nota y promedio sobre 7 con ponderación explícita y cierre de asignatura.
- Simulador por ramo y de semestre completo, con lenguaje natural ("necesitas X para aprobar").
- Pautas precargadas y ponderaciones compartidas por compañeros ("consenso").
- Agenda con exportación .ics; estadísticas e historial entre semestres.
- Conector MCP e integraciones; onboarding de 4 pasos guiado.
- Ayuda contextual/tooltip y explicaciones del cálculo, cosa que NORA no tiene.

### (c) Qué GradeHub debería MEJORAR o AGREGAR
- **Escala/puntaje→nota** tipo NORA (para pruebas con puntajes, no notas).
- **Nota objetivo editable** por ramo/carrera.
- **Simulación de aprobación por grupo individual**, no solo ponderado global.
- **Comparación social anónima y opcional** (agregando lo que NORA omitió: política clara, opt-in explícito, control para salirse, y sin RUT real).
- **Cierre de semestre claro** (archivar, no "eliminar") para arreglar su propio punto débil.
- **Estados de carga con esqueletos y estados vacíos accionables**.
- **IA de estudio** (resúmenes, predicción de nota, alertas de riesgo): ningún producto de la categoría la tiene todavía; es la oportunidad.

## Veredicto
NORA es un MVP vertical bien logrado para un solo perfil (PUC, 6 carreras, 2.° semestre 2026): rápido, oscuro, con la mejor escala puntaje→nota y la mejor nota objetivo del segmento, pero sin catálogo, sin calendario, sin IA, sin integraciones y con una función estrella ("Compara con el curso") que pide la cédula de identidad sin soporte legal ni control. Su matemática es correcta pero muda: nunca explica en lenguaje natural lo que calcula. GradeHub gana en cobertura, simulación y consenso; debería copiar la escala, la nota objetivo y la claridad de confirmación de NORA, y ganar la carrera con IA de estudio y cierre de semestre.

## image_url from the result
- Logo/mascota 'Nora' en cabecera de /app: https://bynora.cl/assets/nora-logo-n-Dh78wd0j.webp

## Pages from the result
- url: https://bynora.cl/app/escala
