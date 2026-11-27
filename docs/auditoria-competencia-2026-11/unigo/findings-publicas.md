## 4. /instalar — "Instala UniGo en tu celular · Gratis, en 1 minuto"
- Chip "APP", H1, copy "Queda con su ícono en tu pantalla, como cualquier app."
- Caja "Ábrelo desde tu celular / Abre unigo.cl/instalar en tu teléfono." (en desktop muestra la URL y el texto cortados: "Abreunigo.cl/instalaren tu teléfono" sin espacios visibles entre tokens).
- "Tu celular permite instalarla con un toque" + botón "📲 Instalar UniGo" + "Se agrega sola a tu pantalla de inicio." (en desktop el botón aparece pero no puede cumplir: no es un entorno con prompt de instalación).
- Selector "Mi celular es: iPhone / Android" (funciona: cambia el contenido). Pasos ilustrados 1-4 para Safari (Compartir › Agregar a pantalla de inicio › Agregar) y Chrome (⋮ › Instalar app › Instalar), con mockups dibujados en CSS. Nota iPhone: "En iPhone, la primera vez que abras la app te pedirá tu PIN (el iPhone guarda la app aparte de Safari). Después queda abierta." Bonus Samsung Internet.
- "¿Qué ganas con la app?": 📍 salas de hoy y 🚌 buses a un toque · 🧮 notas sin buscar la página · 📶 se abre aunque tengas mala señal · 🔒 datos protegidos con tu PIN.
- **No hay ni un link a App Store ni Google Play: UniGo es 100% PWA.** FAQ lo confirma: "Sí, sin pasar por ninguna tienda de apps."

## 5. /preguntas — "Preguntas frecuentes · UniGo"
Secciones: Lo básico · Notas y cálculos · Salas y buses · Tu cuenta · ¿Algo más? (18 preguntas, acordeones; una viene expandida por defecto: "¿Quién puede ver mis notas?").
Contenido clave (texto fiel, resumido):
- ¿Qué es UniGo? "Una herramienta gratuita para estudiantes de la UAI: calcula tu promedio y la nota que necesitas para aprobar o eximirte con las ponderaciones de tus ramos, te dice en qué sala tienes clases hoy y te muestra los horarios de los buses de acercamiento."
- ¿Es gratis? "Sí, completamente. UniGo se mantiene con publicidad discreta al final de algunas pantallas, nunca entre tus notas."
- ¿Tengo que conectar mi cuenta de la universidad o de Google? "No. UniGo no te pide tu cuenta de la universidad, de Google ni de ninguna otra plataforma. Creas tu cuenta en un minuto con tu nombre, un alias, tu correo y un PIN de 6 números, y tus ramos aparecen solos."
- ¿Es una página oficial de la UAI? "No. … Usa información pública de la universidad (programas de los ramos, lista de exámenes, salas y buses), pero no está afiliado a la UAI."
- ¿Qué carreras y semestres están disponibles? "Un semestre se habilita cuando tiene al menos 1 ramo con sus ponderaciones; si aún le faltan ramos, la calculadora te lo avisa… los programas se procesan todos los días a las 17:00 (hora de Chile). También puedes agregar cualquier ramo a mano."
- ¿De dónde salen las ponderaciones? "De los programas oficiales de cada ramo. Si en tu sección el profesor usa otras, puedes cambiarlas en el menú ⋮ del ramo › «Editar ramo». Ese cambio solo afecta a tu cuenta."
- ¿Cómo escribo una nota? "«5,5», «5.5» o «55» se leen igual. Solo se aceptan notas entre 1,0 y 7,0."
- ¿Cómo encuentro la fecha de mi examen? "En cada ramo con examen toca «🔎 Buscar mi examen» y elige tu profesor o sección. La fecha sale de la lista oficial de exámenes de la UAI y queda guardada con una cuenta regresiva."
- ¿Puedo recibir un resumen de mis notas? "Al final de la calculadora toca «Enviarme el informe por correo»: te llega un resumen con tus promedios y un plan de estudio…"
- ¿Cómo funciona «Mis salas de hoy»? "…según la programación diaria que publica la UAI. Se actualiza cada hora."
- ¿De dónde salen los horarios de los buses? "De la información oficial de buses de acercamiento al Campus Peñalolén que publica la UAI, revisada varias veces al día."
- ¿Quién puede ver mis notas? "Solo tú, entrando con tu PIN… ni otros estudiantes, ni profesores, ni la UAI, ni quien administra UniGo (el panel de administración no muestra notas). En la portada solo aparecen nombres, alias y fotos, nunca notas. Tu PIN no se guarda en ningún lado: solo un código derivado de él…"
- Olvidé mi PIN: "En la pantalla del PIN toca «Olvidé mi PIN» y escribe tu correo: te mandamos un código temporal para crear uno nuevo."
- ¿Funciona sin señal? offline caching, cambios se suben solos.
- Sesión: "solo se cierra si tocas «Salir», cambias tu PIN o pasan 60 días sin entrar."
- ¿Cómo borro mi cuenta? "En «Mi cuenta» › «Eliminar mi perfil»…"
- Cierre: link a /reportar (reporte de errores/ramos faltantes) y /contacto.

### Inconsistencias detectadas
- La FAQ promete un link "Olvidé mi PIN" **en la pantalla del PIN**, pero /entrar no lo muestra (solo Correo, PIN, Entrar, Volver al inicio, Probar calculadora).
- La FAQ dice "Al final de la calculadora toca «Enviarme el informe por correo»" sin aclarar que **requiere cuenta**: en la demo sin cuenta ese botón produce "Tu sesión venció. Entra de nuevo."
- FAQ dice que las notas solo se ven con PIN y que la sesión dura 60 días, pero el error "Tu sesión venció" aparece en una demo que nunca inició sesión.
## 6. Flujo "Crea tu cuenta" (desde el botón de la landing, SPA sin URL propia)
- "Crea tu cuenta" + barra de progreso + "Paso 1 de 3 · Tu carrera" → "¿Qué estudias?" (10 opciones: Ingeniería Comercial, Ingeniería Civil, International Management, Derecho, Bachillerato de Ing. Comercial, Bachillerato de Ing. Civil, Doble Título Ing. Comercial + Sociología, Ingeniería en Computer Science, Ingeniería en Negocios y Tecnología, Otra carrera) + "¿Qué semestre cursas?" (1.º a 12.º; los no cubiertos dicen "3.º semestre · aún sin ramos", 7.º–12.º igual) + "Siguiente".
- Pie: "🔒 Tus notas solo las ves tú · Sin conectar tu cuenta UAI" y aviso legal con links a Términos y Privacidad.
- "Paso 2 de 3 · Tus datos": Tu nombre (placeholder "Ej.: Camila"), Tu apellido ("Ej.: Soto"), "Tu alias (único) @" (placeholder "@camila_soto"), "Lo armamos con tu nombre. Puedes cambiarlo.", "Foto (opcional)" con botón "Elegir foto", botones "Atrás"/"Siguiente".
- Validaciones observadas (texto exacto, en rojo): "Elige qué semestre cursas." y "Escribe tu nombre (mínimo 2 letras)." — el paso NO avanza si fallan (correcto), y el campo con error queda con borde azul enfocado.
- **No se creó cuenta** (límite del encargo): no se llegó al paso 3, que según la FAQ pide correo + PIN de 6 números. No hay registro con cuenta UAI ni Google.

## 7. /sobre — "Sobre UniGo · Hecho por un estudiante, para estudiantes"
Secciones: Por qué existe · Qué puedes hacer · Quién está detrás · Lo que lo hace distinto · Cómo cuidamos tus datos · Cómo se financia.
- Integración con la UAI (texto fiel): "usa información que la UAI publica (programas de los ramos, lista de exámenes, salas y buses)"; "Cada ramo se arma a partir de su programa oficial. Muchos de ellos los envían los mismos estudiantes… Los programas se procesan todos los días a las 17:00 (hora de Chile)." → **no hay integración institucional ni API: es curación/scraping de información pública + crowdsourcing de syllabus.**
- Diferenciadores declarados: Simple (cuenta en un minuto con PIN, ramos ya armados) · Sin conectar nada · Hecho a la medida de la UAI · "Te dice qué hacer" · Privado de verdad · Sin señal también · En cualquier celular (sin tienda de apps).
- Financiamiento: "gratis y se mantiene con publicidad discreta, ubicada al final de algunas pantallas y nunca entre tus notas."

## 8. /guias — "Guías para entender tus notas" (12 guías SEO, con ejemplos numéricos)
Listado: promedio ponderado paso a paso; de puntaje a nota (escala 1–7, exigencia 60 %, tabla al 60 % y 50 %); **resultado provisional y notas en gris** (explica "Faltan notas" y "Resultado provisional"); cómo se calcula la nota final UAI; eximición y nota de presentación; examen que reemplaza la peor prueba; controles eliminados (Management elimina 2 controles, RCD I elimina 1, International Business elimina un reading test); examen recuperativo y segundo examen; qué nota necesitas para aprobar; ramos con parte teórica y práctica que no se compensan (RCD I); TETS (reprobatorio con 3,94 o menos); cómo decidir qué ramo estudiar primero.
- Fuente declarada: "se basan en los programas (syllabus) de algunos ramos del segundo semestre de 2026 y las revisa Agustín Hidalgo".
- Cierre con CTA cruzado a UniGo Learn.

## 9. learn.unigo.cl — "UniGo Learn: prepara tus pruebas de la UAI"
- Portada con **toggle "Cambiar entre modo claro y oscuro"** (funciona; el tema no se ve persistido al entrar a /cursos/…, que aparece en oscuro).
- Gate: "Entra a UniGo Learn — Usa tu cuenta de UniGo (la misma de la calculadora). Escribe tu nombre, tu alias o tu correo." (field) + "¿Aún no tienes cuenta? Créala en unigo.cl". Sin cuenta no se entra.
- Catálogo: solo 2 cursos — Matemáticas Avanzadas II y Razonamiento Cuantitativo II (repaso Prueba 2).
- Página del curso MA2: métricas "21 clases", "400 preguntas", "2 simulacros", "152 tarjetas"; "cuaderno de errores"; tutor de IA con botón "Explícamelo más fácil"; temario por unidades 0–5; FAQ honesta ("¿El tutor de IA puede equivocarse? Sí… Tiene un tope de mensajes por día").

## 10. learn.unigo.cl/learn/rcd2p2/ — repaso RCD II Prueba 2 (público hasta el gate)
- Badge "La prueba ya se rindió" (26 de noviembre) — contenido fechado, queda útil como repaso pero el gancho pierde fuerza.
- "Gratis · Sin pago ni suscripción · un dispositivo a la vez", CTA "Entrar con mi cuenta y obtenerlo gratis".
- Temario con candados 🔒 por clase, min y nº de ejercicios, bullets de aprendizaje.
- **Demo interactiva real sin cuenta**: "Pruébalo ahora: así se ve una clase" con pasos "Mostrar el siguiente paso (2/4)" / "Mostrar todo" y una pregunta de alternativas con botón "Comprobar" y etiqueta "Básico". Buena idea de preview.

## 11. /aporta — "Envía los programas de tus ramos"
Badge "Sin cuenta ni PIN · PDF, foto o enlace · Varios a la vez · Toma 1 minuto". Paso 1 carrera, paso 2 dropzone "Suelta aquí los archivos o toca para elegirlos · PDF, Word, foto o captura · hasta 8 por envío · 8 MB cada uno · También puedes pegar una captura con Ctrl+V" + botones "📁 Elegir archivos / 📷 Sacar foto / 🔗 Pegar un enlace", paso 3 notas opcionales, nombre y correo opcionales, botón "Enviar programa" (no se envió: límite de no enviar formularios).

## 15. /contacto — "Escríbenos" (buena práctica: router deintención, sin formulario)
- Texto: "Elige lo que necesitas. Leemos todos los mensajes y, si dejas tu correo, te respondemos." 4 cards-link: "Hay un error en un ramo" / "Falta un ramo o mi carrera" / "Enviar el programa de un ramo" / "Otra cosa" → todas a /reportar (pre-seleccionando tipo) o /aporta.
- Cierre útil: "Antes de escribir, quizás tu duda ya está respondida en las preguntas frecuentes. Si olvidaste tu PIN, no hace falta escribirnos: en la pantalla del PIN toca «Olvidé mi PIN»."
- **Inconsistencia**: /contacto promete «Olvidé mi PIN» en la pantalla del PIN, pero /entrar no muestra ese link (confirmado leyendo /entrar). Y el correo (hola@unigo.cl / contacto@unigo.cl) solo aparece en Privacidad, nunca en /contacto: no hay mailto visible.
- Link superior dice "Ir a UniGo" en /contacto, "Volver a la calculadora" en /reportar y "Volver a UniGo" en /privacidad: **etiquetas de back desiguales entre páginas hermanas**.

## 16. /reportar — "¿Falta un ramo o hay un error?" (no se envió nada)
- Eyebrow "AYÚDAME A MEJORARLA" (primera persona del dev, tono cercano). Formulario en 3 pasos numerados: 1 ¿Qué pasa? (radios "Le falta un ramo a mi carrera" / "Hay un error en un ramo" / "Otra cosa") · 2 ¿De qué carrera y ramo? (Carrera, Semestre (opcional), Ramo (opcional)) · 3 Cuéntame (Qué pasa, Tu nombre (opcional), Tu correo (opcional)) + botón "Enviar reporte".
- Pie: "Privado · solo yo veo lo que envías" y nota en el link a /aporta: "los programas se procesan todos los días a las 17:00 (hora de Chile)".
- **Inconsistencia**: el combo de Semestre de /reportar llega solo hasta **10.º semestre**, mientras el registro llega a **12.º semestre** y la FAQ habla de 10.

## 17. learn.unigo.cl — portada con gate y cursos
- Portada abre con **"Entra a UniGo Learn"** y un solo campo "Nombre, alias o correo" ("Usa tu cuenta de UniGo (la misma de la calculadora)"), y recién debajo el H1 de SEO "Prepara tus pruebas de la UAI con clases cortas, ejercicios y tutor de IA". El gate va **antes** del valor: sin cuenta no hay demo del curso MA2.
- 2 cursos: "Matemáticas Avanzadas II" (gratis con cuenta) y "RCD II · Prueba 2" — su link lleva a `learn.unigo.cl/learn/rcd2p2/` (ruta duplicada "learn/unigo.cl/learn/…", fea y difícil de compartir).
- 4 guías de estudio (cómo estudiar MA2, intervalos de crecimiento, temario MA2, cómo estudiar Intro. a la Macroeconomía).

## 18. learn.unigo.cl/learn/rcd2p2/ — repaso público, probado
- Vendido claro: "GRATIS · UNA HORA · PRUEBA 2 DE RCD II", "La prueba ya se rindió" (badge de actualidad), "Gratis Sin pago ni suscripción · un dispositivo a la vez".
- Beneficios con copy muy bueno: "⏱️Una hora, no más", "✅Preguntas con corrección al tiro — Cada alternativa incorrecta te dice cuál fue el error", "🧠«Explícamelo más fácil»", "🤖Tutor de IA al lado".
- Temario con 6 accordions **🔒 bloqueados** ("6 clases · 50+ ejercicios · 30 tarjetas. Los contenidos se desbloquean al obtener el curso (es gratis)") → fricción: un curso gratis muestra candados.
- **"Pruébalo ahora: así se ve una clase"** funciona sin cuenta: "Mostrar el siguiente paso (2/4)" y "Mostrar todo" despliegan los 4 pasos con fórmulas MathML (60/900 ≈ 6,7 %; 40/100 = 40 %). Pregunta "Básico" con A/B/C/D + "Comprobar".
- **Prueba real**: marqué B ("Respecto del total de cada tramo de edad") y respondió `✘ No es correcto` + "Para eso, cada tramo de edad tendría que sumar 100 %." + "Respuesta correcta: Respecto del total de cada género" + "Explicación" + "Intentar otra vez". Corrección y explicación por distractor, impecable.
- **Bugs de texto exactos**: "así que está **relativizadorespecto** del total de cada género" (falta espacio: "relativizando respecto"); y "Respuesta No se puede concluir: hay que comparar la tasa de reclamo de cada grupo." (falta dos puntos o guión tras "Respuesta").
- Botón "Salir" arriba a la derecha en una página donde no hay sesión activa (no hace nada útil ahí). "Compartir el curso con un amigo" presente.
- **Modo claro/oscuro funciona** en Learn (botón "Cambiar entre modo claro y oscuro"): oscuro azulado muy parejo, buen contraste de verde/rojo de acierto/error. Capturas: https://learn.unigo.cl/logo-512.png (logo) y pantallazos de la prueba en modo claro y oscuro.
- Diseño general: tarjetas blancas sobre fondo celeste muy claro, acento azul, radio de esquinas grande, tipografía sans redondeada, iconos emoji, MathML real. Familiar para quien viene de apps de estudio tipo Quizlet/Notion.
