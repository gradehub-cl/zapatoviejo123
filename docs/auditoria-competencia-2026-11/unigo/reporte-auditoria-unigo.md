# Auditoría UX de UniGo (unigo.cl) — reporte por pantalla
Auditor: contexto GradeHub ([usuario]). Fecha: 2026-11-26. Dispositivo: desktop/navegador.
Alcance real: **todo lo público** (landing, /probar demo, /instalar, /preguntas, /sobre, /guias, /contacto, /reportar, /aporta, /privacidad, /terminos, learn.unigo.cl) + el flujo de acceso y de registro **hasta antes de crear cuenta**.
**No auditable:** interior de la app (notas guardadas, salas de hoy, mi horario, exámenes, buses, UniGo Games, Mi cuenta, planes de Learn) porque exige cuenta con correo UAI + PIN. No se creó cuenta ni se inventaron credenciales. No se pagó, no se conectaron cuentas, no se envió ningún formulario.

## 0. Primer contacto: splash de la landing (unigo.cl)
- **Qué veo:** pantalla completa azul oscuro, logo "UG", "UNI GO", y abajo "TOCA PARA ENTRAR". No hay contenido hasta que toco.
- **Qué siento:** atractivo, pero expectante: no sé qué hay detrás y en desktop "tocar" no es el verbo natural (no hay botón, ni "Seguir", ni flecha).
- **Qué pienso:** es un gesto de app mobile portado a web. Frena al primer visitante y a cualquier crawler que no ejecute JS.
- **No intuitivo / qué cambiaría:** que el contenido esté visible y el splash sea animación de entrada (o que se pueda saltar con scroll/tecla). Y "Toca para entrar" es exactamente el texto que un usuario asocia con un anuncio: confunde.

## 1. Landing (unigo.cl) después del toque
- **Qué veo:** dos cards grandes, "Entrar" (con buscador "Tu nombre, alias o correo" y link a /entrar) y "Crear cuenta · Gratis · 1 minuto". Banner a /probar ("probar sin cuenta"), banner a /instalar con "No mostrar más", banner a /aporta. Badges: "Hecho para la UAI · Sin conectar nada · Solo tú ves tus notas". Prueba social: **"Más de 130 estudiantes ya usan UniGo"** con 40 avatares. Luego 7 funciones (calculadora de notas, salas de hoy, mi horario, buses Campus Peñalolén, fecha de examen, UniGo Learn, UniGo Games), guías y footer (/preguntas /sobre /contacto /privacidad /terminos). Disclaimer: proyecto independiente de Agustín Hidalgo, no oficial de la UAI.
- **Qué siento:** clara, honesta, con jerarquía y copy en español chileno concreto. Se entiende en 10 segundos qué hace.
- **Qué pienso:** el "sin conectar nada" y "solo tú ves tus notas" son la promesa central y están bien elegidos (es la objeción #1 de una app de notas).
- **No intuitivo / bugs:**
  - La card "Entrar" con buscador **finge un login**: escribo mi nombre y no hay botón; termino en /entrar igual. Un link "Entrar" bastaría.
  - "Más de 130 estudiantes" es una cifra baja mostrada con orgullo: resta, no suma (y los 40 avatares parecen más de 130).
  - En desktop aparece **publicidad (iframe de Google AdSense, id `aswift_1`)** en la landing: rompe el tono "app de estudiantes" y compite visualmente con las cards.
  - Tres banners apilados arriba compiten con las dos actions principales.
- **Qué cambiaría:** un hero con captura real de la demo + "Probar sin cuenta" como botón primario; contador de usuarios solo cuando pase de ~1.000; publicidad fuera del primer pliegue.

## 2. /entrar — el muro de acceso
- **Qué veo:** "Correo" + "PIN" (6 dígitos) + botón "Entrar". Nada más.
- **Qué siento:** fricción dura; y desconfianza leve: ¿qué PIN? ¿por qué no mi clave normal?
- **Qué pienso:** al no haber "Olvidé mi PIN" ni "No tengo cuenta" a la vista, quien se equivoca o llega sin cuenta queda botado.
- **Bugs/fallas concretas (texto exacto):**
  1. **No existe el link «Olvidé mi PIN» en /entrar**, pero /contacto y la FAQ lo prometen: *"Si olvidaste tu PIN, no hace falta escribirnos: en la pantalla del PIN toca «Olvidé mi PIN»."*
  2. **No ofrece Google, Apple ni SSO institucional** (y la tarea pedía usar Google solo si lo ofreciera: no lo ofrece).
  3. No hay enlace a "Crear cuenta" desde /entrar, aunque la landing sí lo tiene.
- **Consecuencia para la auditoría:** aquí se detuvo el recorrido interior. **Anotado y seguido con lo público**, sin crear cuenta.

## 3. /probar — la demo pública (lo mejor del producto)
- **Qué veo:** selección Carrera (6) y Semestre, ramos con sus ponderaciones (Pruebas 70% / Controles 20% / Talleres 10% / Examen 30%), campos de notas, bloque "RESULTADO" con barra de 1,0 a 7,0, "Cada nota que falta", "Ver cómo se calcula", mapa "¿CÓMO FUNCIONA ESTE RAMO?", "Resumen general" y "PRIORIDAD DE ESTUDIO".
- **Qué siento:** es la pantalla más madura del producto: inmediata, sin registro, explica el cálculo. Da confianza.
- **Qué pienso:** el "Ver cómo se calcula" y el "cada nota que falta" resuelven la caja negra de las calculadoras de promedio. Bien.
- **Bugs/fallas con texto exacto:**
  1. **Falta el 3.º semestre** en el selector de /probar, aunque el registro sí lo lista ("3.º semestre · aún sin ramos"). Incoherencia de datos.
  2. **Bug grave, reproducido 2 veces:** en /probar, sin cuenta, al tocar **"✉ Enviarme el informe por correo"** la app navega a unigo.cl y muestra **"Tu sesión venció. Entra de nuevo."** Se pierde todo lo ingresado. (Un anónimo no tiene sesión que vencer: el texto es peor que el bug.)
  3. Formato inconsistente de notas: **"5,1" vs "5,10"** en la misma pantalla.
  4. La "PRIORIDAD DE ESTUDIO" pide **"Necesitas 3,1"** cuando el ramo muestra **4,8** como nota a calcular: no dice a qué objetivo corresponde.
  5. Reescala ponderaciones sin decirlo: se ven **"78% 22% 10% 100% 30%"** (los pesos que uno puso suman otra cosa) y ninguna línea lo explique.
  6. Tip que ofrece una función inexistente en la demo: sugiere **"📅 Programar una prueba"**, que solo existe con cuenta.
  7. Badge **"Faltan notas"** junto a un NP que sí está calculado: contradictorio.
  8. Sin mensaje de validación visible cuando una nota sale de rango (el botón no avanza y no explica).

## 4. /instalar — PWA, no app de tienda
- **Qué veo:** "UniGo es una Progressive Web App… sin pasar por ninguna tienda de apps", instrucciones separadas para iPhone y Android con selector, y botón de instalación.
- **Qué siento:** alivio (no hay que bajar nada) y a la vez dudas: sin tienda no hay reseñas, ni rating, ni actualización automática, ni presencia en búsquedas de "app UAI".
- **Bugs/fallas:** **no hay ficha en App Store ni en Google Play** (verificado buscando `site:apps.apple.com` y `site:play.google.com`: cero resultados de UniGo/UAI). Tampoco link de descarga en la landing, que es lo que un usuario busca. El banner /instalar se puede cerrar ("No mostrar más"), bien.
- **Qué cambiaría:** publicar en tiendas (o al menos en App Store con el wrapper ya existente) para capturar las búsquedas y las reseñas, que son el principal motor de installs en universidades.

## 5. /preguntas — FAQ
- Gratuidad "con publicidad discreta"; **no conecta la cuenta UAI ni Google**; ramos armados desde programas oficiales; "lista oficial de exámenes" y "programación diaria que publica la UAI… se actualiza cada hora"; buses oficiales; **el PIN no se guarda**; sesión de 60 días; borrar cuenta en "Mi cuenta › Eliminar mi perfil"; /reportar para errores.
- **Siento:** tranquilidad (es la página que derriba objeciones). **Pienso:** debería estar enlazada desde /entrar, que es donde aparecen las dudas.
- **No intuitivo:** promete «Olvidé mi PIN» que /entrar no tiene; habla de "10.º semestre" cuando el registro llega a 12.º.

## 6. /sobre
- Explica que es un proyecto independiente de un estudiante (Agustín Hidalgo), no oficial, y de dónde saca los datos. Bien por transparencia; **pero no hay Captura de pantalla real de la app dentro** (solo texto), y ninguna vía de contacto directo visible.

## 7. /guias — 12 guías SEO muy buenas
- Reglas reales de la UAI: eximición, controles eliminados, **TETS 3,94**, parte teórica/práctica. Tono cercano y resolutivo. Es el canal de adquisición del producto y se nota trabajo.
- **Falla:** las guías prometen funciones que requieren cuenta; no hay CTA a /probar donde se puede tocar algo sin registrarse.

## 8. learn.unigo.cl (UniGo Learn)
- **Portada:** abre con el gate "Entra a UniGo Learn" (campo "Nombre, alias o correo") **antes** del H1 de venta: primero la puerta, después el valor.
- **2 cursos** (Matemáticas Avanzadas II; RCD II · Prueba 2, en `learn.unigo.cl/learn/rcd2p2/`, ruta con "learn" duplicado). Copy excelente: "⏱️Una hora, no más", "✅Preguntas con corrección al tiro — Cada alternativa incorrecta te dice cuál fue el error", "🧠«Explícamelo más fácil»", "🤖Tutor de IA al lado".
- **Probado sin cuenta:** "Pruébalo ahora: así se ve una clase" funciona. "Mostrar el siguiente paso (2/4)" y "Mostrar todo" despliegan pasos con MathML real (60/900 ≈ 6,7 %; 40/100 = 40 %). En la pregunta marqué B y respondió **"✘ No es correcto" / "Para eso, cada tramo de edad tendría que sumar 100 %." / "Respuesta correcta: Respecto del total de cada género"** + "Intentar otra vez": corrección por distractor, impecable.
- **Bugs de texto exactos:** *"así que está **relativizadorespecto** del total de cada género"* (falta espacio) y *"Respuesta No se puede concluir: hay que comparar…"* (falta dos puntos tras "Respuesta").
- **No intuitivo:** un curso marcado "GRATIS" muestra **6 accordions con 🔒** ("Los contenidos se desbloquean al obtener el curso (es gratis)"); botón "Salir" arriba en una página donde no hay sesión; y **el modo claro/oscuro de Learn sí funciona** (mientras la app principal no lo promete).

## 9. /aporta, /contacto, /reportar (sin enviar nada)
- /aporta: dropzone de programas, con "los programas se procesan todos los días a las 17:00 (hora de Chile)". Buena expectativa puesta. **No se subió nada** (límite).
- /contacto: router de 4 intenciones, sin formulario y **sin mailto** (hola@unigo.cl solo aparece en Privacidad).
- /reportar: formulario en 3 pasos numerados con radios ("Le falta un ramo a mi carrera" / "Hay un error en un ramo" / "Otra cosa") y pie "Privado · solo yo veo lo que envías". **No se envió.** Su combo de semestre llega solo a **10.º** (el registro llega a 12.º). Etiquetas de vuelta desiguales entre páginas hermanas: "Ir a UniGo" (/contacto), "Volver a la calculadora" (/reportar), "Volver a UniGo" (/privacidad).

## 10. /privacidad y /terminos — de lo mejor del sitio
- Privacidad v2.0 (noviembre 2026), adaptada a la **Ley N° 21.719**, con resumen "En corto", retenciones concretas (games 8 semanas, uso 70 días, correos 12 meses, respaldos 30 días), proveedores (Cloudflare, Resend, Brevo, **Flow**, Google/Apple/Mozilla/Microsoft, Fonts, AdSense), portabilidad **JSON** y borrado desde "Mi cuenta › Eliminar mi perfil". Términos v1.0 con "los cálculos son orientativos" y "no te pide ni usa tu cuenta institucional".
- Revelan lo que hay dentro: **notificaciones push por clase**, **"Mi horario › «Llevar a mi calendario»" con link privado para Google Calendar/iPhone/Outlook**, ranking semanal de UniGo Games, **programa de afiliados con datos bancarios cifrados** y **plan "con devolución" de Learn** (foto de la nota, verificación manual, transferencia por Flow).
- **Riesgo UX:** hay cobro (afiliados y plan con devolución) que **no aparece en la landing** ni en /preguntas en términos de precio: la monetización se descubre tarde.

## 11. Flujo de registro (detenido antes de crear cuenta)
- "Crea tu cuenta" — **Paso 1 de 3 · Tu carrera**: 10 carreras, semestres 1.º–12.º con etiqueta "aún sin ramos". **Paso 2 de 3 · Tus datos**: nombre, apellido, alias único, foto. Validaciones que sí bloquean: **"Elige qué semestre cursas."** y **"Escribe tu nombre (mínimo 2 letras)."** Paso 3 (no alcanzado) pediría correo + PIN.
- **Siento:** progreso claro y corto. **No intuitivo:** pide nombre/apellido/alias/foto **antes** de mostrar valor y **antes** del correo (la recuperación depende de él); el "alias único" no explica para qué sirve (aparece en la portada y en el ranking de Games).

## 12. Diseño visual y familiaridad
- **Sistema:** azul oscuro en splash/acento, tarjetas blancas sobre fondo celeste muy claro, radios de esquina grandes, tipografía sans redondeada, emojis como iconografía de funciones, barra de promedio 1,0–7,0, MathML real en Learn. Oscuro parejo y bien contrastado en Learn.
- **Familiaridad:** se lee como app de estudio moderna (Quizlet/Notion/GradeHub): card por función, eyebrow en mayúsculas, botones grandes. No imita el estilo de la UAI (que es más corporativo), y eso le sirve: parece hecho por y para estudiantes.
- **Debilidades visuales:** 3 banners apilados + AdSense en la portada restan aire; la barra de notas y los badges ("Faltan notas") compiten en peso con el resultado; inconsistencias de formato numérico ("5,1"/"5,10") delatan falta de un formateador único; el candado 🔒 en contenido gratis comunica "pago" donde no lo hay.

## 13. Cómo se integra con la UAI (de dónde saca notas y horario)
- **No hay integración institucional**: términos y FAQ lo dicen explícito —"no te pide ni usa tu cuenta institucional"—, no hay OAuth/SSO ni scraping de portal alumno. **Las notas las ingresa el estudiante**; nadie las valida.
- **Horario/salas/exámenes/buses:** información que **la UAI publica**, reempaquetada (programas de ramos recibidos por /aporta, "lista oficial de exámenes", "programación diaria que publica la UAI… se actualiza cada hora", buses oficiales). Los ramos y ponderaciones son **curados a mano por el autor** + syllabi que suben los estudiantes (proceso diario 17:00).
- **Salida:** calendario vía **link privado (feed)** a Google Calendar/Apple/Outlook, en vez de archivo .ics descargable.
- **Consecuencia:** cero riesgo de credenciales y cero dependencia de APIs, pero cero sincronía: si la UAI cambia un horario o una ponderación, UniGo depende de que alguien reporte el error.

## 14. Comparativa con GradeHub
### (a) Qué COPIAR igual de UniGo
1. **Demo pública sin cuenta (/probar)**: probar la calculadora antes de registrarse. Es su mejor máquina de conversión.
2. **"Ver cómo se calcula"** y **"Cada nota que falta"**: mostrar la fórmula y la nota mínima por evaluación, no solo el promedio.
3. **Metas por ramo** ("Aprobar/Sacar un 4,0", "Eximirme/No dar el examen", "Un promedio/Elegir mi nota final") — el marco de objetivo antes del número.
4. **"PRIORIDAD DE ESTUDIO"**: prioriza en qué ramo invertir, con la nota que falta.
5. **"¿CÓMO FUNCIONA ESTE RAMO?"**: tarjeta de reglas de evaluación (eximición, pesos, parte teórica/práctica) por ramo.
6. **Mapa de pesos reescalado** y resumen general del semestre.
7. **Guías SEO con reglas reales de la universidad** (eximición, TETS, controles eliminados) como canal de adquisición.
8. **PWA con /instalar y instrucciones por iPhone/Android** + "No mostrar más" en el banner.
9. **Privacidad con "En corto"**, retenciones concretas, portabilidad JSON y borrado en un clic.
10. **/reportar como canal de corrección de datos + /aporta para syllabi**, con hora de procesamiento prometida.
11. **Modo oscuro con toggle visible** y Learn con "Explícamelo más fácil" / tutor IA al lado de cada diapositiva.
12. **Corrección por distractor**: decir por qué cada alternativa está mal.

### (b) Qué GradeHub ya hace MEJOR
- **Nota sobre 7 y promedio ponderado** con la misma rigurosidad, y **"necesitas X para aprobar"** explícito (UniGo lo tiene, pero inconsistente entre meta y cálculo).
- **Simulador por ramo y de semestre completo** (scenarios y proyección), más potente que "cada nota que falta".
- **Pautas precargadas** y **calculadora puntaje→nota** (de puntaje a nota), que UniGo no ofrece.
- **Agenda .ics descargable** sin link privado ni suscripción (menos riesgo de filtración).
- **Estadísticas e historial** del avance, **conector MCP** (automatización/integración con IA externa), **modo oscuro** en toda la app, **onboarding de 4 pasos** que muestra valor antes de pedir datos.
- **Cobertura de 5 universidades** vs **1 sola (UAI)**: mercado direccionable mucho mayor.
- Sin publicidad embebida en la experiencia.

### (c) Qué GradeHub debería MEJORAR o AGREGAR
1. **Demo pública sin registro** (el gap más grande; cerrar el registro antes de probar cuesta installs).
2. **Metas por ramo** (aprobar/eximirme/promedio objetivo) y **prioridad de estudio** cruzando ramos.
3. **Reglas de evaluación por ramo** (eximición, corte, parte teórica/práctica) cargadas por defecto, no solo ponderaciones.
4. **Calendario en modo suscripción** (feed Google/Apple/Outlook) además del .ics, y **notificaciones** ("tu clase en 20 min", "prueba mañana").
5. **Tutor/IA de estudio y repaso con preguntas corregidas al tiro** — el área donde UniGo Learn ya está y GradeHub no.
6. **Corrección por distractor** y "explícamelo más fácil" en cualquier ejercicio/pauta.
7. **Canal de reporte de errores y de sílabos** visible, con SLA ("se procesa todos los días a las 17:00").
8. **Guías SEO por universidad/regla** (eximición, TETS, ponderaciones) como adquisición.
9. **PWA instalable + modo oscuro en todo** + página de privacidad "En corto" con portabilidad JSON.
10. **Arreglar lo propio antes de copiar:** catálogo de 5 universidades, cierre de semestre confuso, secciones que cargan para siempre, y falta de integración institucional.

## 15. TOP 10 PROBLEMAS DE UNIGO (severidad alta → baja)
1. **/probar pierde el trabajo y miente:** "✉ Enviarme el informe por correo" sin cuenta → redirige a unigo.cl con **"Tu sesión venció. Entra de nuevo."** (reproducido 2 veces).
2. **«Olvidé mi PIN» no existe en /entrar** aunque /contacto y la FAQ lo indican: usuario sin acceso y sin ruta de recuperación visible.
3. **Muro de acceso total:** sin cuenta UAI no hay forma de ver el interior; no hay demo de salas/horario/buses/exámenes.
4. **Falta el 3.º semestre en /probar** mientras el registro sí lo ofrece; semestres 10.º/12.º inconsistentes entre /reportar, FAQ y registro.
5. **Reescala de ponderaciones sin explicación** ("78% 22% 10% 100% 30%"): el usuario no entiende qué pesos se están usando.
6. **Números contradictorios:** "Necesitas 3,1" en Prioridad vs 4,8 del ramo; badge "Faltan notas" junto a NP calculado; "5,1" vs "5,10".
7. **Sin validación visible** en campos de nota (no avanza y no dice por qué).
8. **Tip que ofrece una función inexistente en la demo** ("📅 Programar una prueba").
9. **Publicidad AdSense en la landing** y 3 banners sobre las actions: rompe confianza y jerarquía; y no hay fichas en App Store/Google Play (cero reseñas, cero descubrimiento).
10. **Registro pide identidad (nombre, apellido, alias único, foto) antes que valor**, y la monetización (afiliados, plan con devolución de Learn) se descubre solo en Privacidad. Menores: splash obligatorio en desktop + texto "TOCA PARA ENTRAR".

## 16. VEREDICTO
UniGo es **el mejor "vecino" competitivo posible para GradeHub**: un producto de una sola universidad, hecho por un estudiante, con **copy, privacidad y transparencia de nivel profesional** y una **demo pública que convierte**. Su promesa ("sin conectar nada", "solo tú ves tus notas") está bien elegida y su cálculo está explicado, lo que genera confianza en un segmento desconfiado.
Pero su arquitectura de confianza también es su techo: **sin cuenta no se ve nada del interior**, **el acceso por correo + PIN sin recuperación visible es un embudo que sangra**, los **datos curados a mano** producen huecos e incoherencias (3.º semestre, pesos, metas) y **la retención depende de que el estudiante ingrese todo**.
Para GradeHub, la jugada es clara: **copiar la demo pública, las metas por ramo, las reglas de evaluación y la prioridad de estudio; superarlos en simulación, pautas, historial, MCP e integración con IA**, y cerrar los propios problemas de catálogo y de cargas eternas. Si GradeHub abre una demo pública sin registro y agrega metas + reglas por ramo, le pasa por encima en la categoría; si no lo hace, UniGo gana el corazón (y el boca a boca) de su nicho.

## Pages from the result
- url: https://unigo.cl/entrar
- aporta: https://unigo.cl/aporta
- contacto: https://unigo.cl/contacto
- guias: https://unigo.cl/guias
- instalar: https://unigo.cl/instalar
- landing: https://unigo.cl/
- learn: https://learn.unigo.cl/
- learn_rcd2p2_demo: https://learn.unigo.cl/learn/rcd2p2/
- preguntas: https://unigo.cl/preguntas
- privacidad: https://unigo.cl/privacidad
- probar: https://unigo.cl/probar
- reportar: https://unigo.cl/reportar
- sobre: https://unigo.cl/sobre
- terminos: https://unigo.cl/terminos
