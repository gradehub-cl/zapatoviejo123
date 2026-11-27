# Auditoría UX Malla Pro (mallapro.cl) — 2026-11-26 (23:17 -03)

Nota de contexto: mallapro.cl NO redirige a universidapp.cl; es un producto distinto (Malla Pro, tool web).
La sesión previa del navegador quedó en universidapp.cl; se navega a https://mallapro.cl/ directo.

## Landing — https://mallapro.cl/
Title: "Malla Pro | Organiza tu malla curricular y calcula tus notas"

Header (sticky): logo "Malla Pro" + links ancla Funciones / Cómo funciona / Privacidad / Preguntas + botón icono
"Cambiar a modo oscuro" + botón outline "Ver mi malla" + botón negro sólido "Organizar mi semestre".
→ Dos CTTAs distintos ("Ver mi malla" y "Organizar mi semestre") sin explicar la diferencia. No hay link de "Iniciar sesión"
ni "Precios": la app es gratis y sin registro.

Hero:
- Eyebrow: "Hecho para estudiantes universitarios de Chile" (con ícono)
- H1: "Organiza tu semestre en minutos, no en pestañas." (resaltado amarillo tipo marcador sobre "no en pestañas.")
- Sub: "Revisa tu avance, calcula tus notas y arma tu horario sin perderte entre PDFs y planillas sueltas."
- CTA primario "Organizar mi semestre" (con flecha) y link secundario "Ver cómo funciona".
- Debajo, un panel DEMO interactivo real (no imagen): "Tu malla" con Semestre 1/2/3, ramos con código
  (Programación I TDFI102 Aprobada, Cálculo I MAT110 Cursando, Base de Datos TDFI103 Cursando,
  Cálculo II MAT210 Bloqueada, Algoritmos y Estructuras INF210 Bloqueada, Física General FIS110 Bloqueada),
  "Al aprobar un ramo se desbloquean los que dependen de él.", tarjeta amarilla "Avance de tu carrera 17% ·
  1 de 6 ramos aprobados" con progress indicator, tarjeta rosa "Cálculo II · nota para eximirte / Promedio en el
  50% que falta 4.8 / Nota final 5.18 / Eximido" con slider (id lp-nota), tarjeta azul "Horario · Física General"
  con botones "Sec. 300 · JU 10:00" y "Sec. 302 · MI 8:30", texto "Cálculo II ya ocupa MI 8:30" y alerta
  "Tope el miércoles a las 8:30".

OBSERVACIÓN (microinteracción): el demo es un widget autoplay: sin hacer clic, en ~segundos Cálculo I pasó de
"Cursando" a "Aprobada" y el avance subió de 17% a 33% (2 de 6), y Cálculo II cambió de "Bloqueada" a "Disponible".
Muy bueno como demo ("show, don't tell"), pero: (a) no hay control de play/pause, (b) la alerta de tope queda fija
aunque ya no aplica al estado mostrado, (c) el contraste del texto gris claro sobre las tarjetas verde/azul es bajo.

Social proof: "Ya lo usan +100 estudiantes este mes, de Santiago a Viña del Mar." (afirmación sin fuente/link).
Badges: "Gratis", "Sin registro", "Tus datos se quedan en tu dispositivo", "Pregrado Diurno".

## Sección Funciones (#funciones)
H2 "Todo tu semestre en un solo lugar" + "Malla, notas, toma de ramos y horario conectados: lo que registras en una
parte se usa en las demás."
- #malla "Tu avance, a la vista": "Marca tus ramos como pendientes, cursando o aprobados y mira qué desbloquea cada
  uno." Bullets: Prerrequisitos con conexiones / Progreso por semestre / Modo excepcional y ocultar completados.
- #notas "Calcula la nota que necesitas": "Agrega tus evaluaciones y revisa qué promedio te falta para eximirte."
  Bullets: Nota necesaria para eximirte / Modo examen si no alcanzas / Sub-notas y configuración compartible.
- #toma-de-ramos "Encuentra tus secciones y arma tu horario": "Carga la programación y compara las secciones de cada
  ramo. Elige una por ramo y mira cómo queda tu semana: si dos clases se cruzan, Malla Pro marca el tope."
  Bullets: PDF procesado en tu dispositivo / Secciones con NRC y modalidad / Detección de topes en vivo /
  Guardar propuesta y exportar PDF.
- Nota: "La toma de ramos está disponible por ahora solo para la Universidad Andrés Bello; estamos sumando más
  universidades."

## Sección Cómo funciona (#como-funciona)
H2 "Así de simple" — "Tres pasos y tu semestre queda ordenado."
1 Marca tu avance — "Registra los ramos que aprobaste y los que estás cursando."
2 Carga la programación — "Malla Pro organiza las secciones según los ramos que te corresponden."
3 Arma tu horario — "Compara alternativas, revisa topes y guarda tu propuesta."
(No hay imágenes/video del producto en estos pasos, solo números y texto: debilita el paso 2 que es el más difícil.)

## Sección Privacidad (#privacidad)
H2 "Tus datos académicos se quedan contigo" — "Tus notas, tu progreso, tus horarios y el PDF que importas se
procesan y almacenan localmente en tu dispositivo. Usamos analítica de uso general para entender cómo se usa la
plataforma y seguir mejorándola."
Diagrama: PDF → Tu navegador → Malla Pro. Bullets: La programación no se envía a un servidor / Tu avance queda en tu
navegador / Puedes borrar tus datos locales cuando quieras / Gratis y sin registro, hoy.
Disclaimer: "Malla Pro es una herramienta independiente y no oficial, sin relación con ninguna universidad.
Actualmente cubre algunas carreras de pregrado de la Universidad Andrés Bello, la Universidad de Chile y la
Universidad de Artes, Ciencias y Comunicación; los cupos mostrados corresponden a la programación que cargaste y
pueden cambiar durante la toma real."
→ contradicción de messaging: el diagrama muestra "Malla Pro" como destino final del PDF, lo que sugiere que los
datos SÍ llegan a Malla Pro, justo lo que el texto niega. Confunde.
→ "sin registro" + "tus datos se quedan en tu dispositivo" = sin sincronización; no se dice en ningún lado que se
pierden al limpiar el navegador o cambiar de dispositivo. Riesgo de abandono.

## Sección Preguntas (#preguntas) — FAQ (6, abierta, sin acordeón)
1. ¿Es una plataforma oficial de alguna universidad? → "No. Malla Pro es un proyecto estudiantil independiente y no
   está afiliado a ninguna universidad. Las mallas se arman con información pública de cada institución."
2. ¿Sirve para cualquier modalidad? → "Por ahora, Malla Pro está enfocado exclusivamente en mallas de Pregrado
   Diurno. Vespertino, online, Advance, postgrado u otras modalidades no están cubiertas salvo que se indique."
3. ¿Qué pasa con el PDF que cargo? → "Se procesa directamente en tu dispositivo. El archivo no se envía a un servidor."
4. ¿Los cupos están actualizados en tiempo real? → "No. Se muestran los cupos informados en la programación que
   cargaste. Pueden cambiar durante la toma de ramos."
5. ¿Malla Pro inscribe mis ramos? → "No. Te ayuda a preparar tu propuesta. La inscripción se hace en las plataformas
   oficiales de la universidad."
6. ¿Puedo usar Malla Pro desde el teléfono? → "Sí. La malla, las notas y la toma de ramos están adaptadas a pantallas
   pequeñas."

## CTA final + footer
H2 "Arranca tu semestre organizado." + "Revisa tus ramos, calcula tus notas y arma tu horario desde un solo lugar."
+ botón "Organizar mi semestre" + "Gratis. Sin registro. De estudiantes para estudiantes."
Footer: links Malla / Notas / Toma de ramos (anclas) / Privacidad (/privacidad) / Términos de uso (/terminos) /
Instagram (instagram.com/mallapro.cl_) / Abrir app (/app). "Malla Pro es una herramienta independiente y no oficial.
No corresponde a una plataforma oficial de ninguna universidad." "© 2026 Malla Pro · De estudiantes para estudiantes."

## Diseño visual (landing)
- Fondo crema/beige cálido (~#F4F1EA), tarjetas pastel verde/azul/amarillo/rosa/celeste. Header blanco, CTA negro.
- Tipografía: display sans bold de gran cuerpo para H1, sans regular para cuerpo; mono/tabular para notas (5.18).
- Jerarquía clara y buena; el resaltado amarillo del H1 es memorable y da identidad.
- Espaciado generoso, secciones bien separadas; el bloque demo es denso (6 mini-tarjetas) y compite con el CTA.
- Puntos débiles: botones de sección del demo sin estado hover visible en captura; los bullets de funciones son
  simple texto (sin íconos), la sección "Cómo funciona" no tiene screenshot; cero microinteracciones salvo el autoplay.
- Sin cookie banner (no se vio).

## Acceso / "Ver mi malla" y "Organizar mi semestre"
Ambos CTA y el link "Abrir app" llevan a https://mallapro.cl/app. **NO pide cuenta**: no hay login, Google ni registro.
Buenísimo para fricción cero (no fue necesario tocar Google). Header en la app: link "Volver al inicio", logo, botón
"Cambiar a modo oscuro".

## Onboarding — pantalla "Elige tu carrera" (/app)
- H1 "Elige tu carrera" (con resaltado amarillo en "carrera"), subtítulo: "Tu avance se guarda solo en este dispositivo.
  No necesitas crear una cuenta."
- Buscador con placeholder "Busca por carrera o universidad" y atajo "/" a la derecha.
- Filtro lateral "UNIVERSIDAD": "Todas (3 universidades · 14 carreras)", "UNAB Universidad Andrés Bello 9 carreras",
  "UCH Universidad de Chile 4 carreras", "UNIACC Universidad de Artes, Ciencias y Comunicación 1 carreras".
- Chips "Filtrar por área": Todas / Ingeniería / Salud / Ciencias / Ciencias sociales / Arte y diseño. Contador "14 carreras".
- CATÁLOGO COMPLETO (14 carreras, 3 universidades):
  UNAB: Ingeniería Civil Industrial (10 sem.), Ingeniería en Computación e Informática (8), Geología (10),
  Ingeniería en Marina Mercante (8), Ingeniería Civil Informática (10), Ingeniería Civil en Minas (10),
  Medicina (12), Tecnología Médica (10), Psicología (10).
  UCH: Bioquímica (11), Ingeniería en Alimentos (11), Química (11), Química y Farmacia (11).
  UNIACC: Diseño de Interiores y Ambientes (10).
- CTA permanente: "¿No está tu carrera? Pásanos tu malla y la agregamos."
- Estado vacío de búsqueda: "No encontramos “zzzzz”" + "Pásanos tu malla y la agregamos para que puedas usarla." +
  botón negro "Pedir mi malla". (No se envió nada.)
- BUG UX: al no haber resultados desaparecen los chips de área (queda solo "Todas") y el contador "0 carreras";
  la búsqueda no tiene botón para limpiar (hay que borrar a mano).
- BUG microcopy: "1 carreras" (debería ser "1 carrera").

## Tour de bienvenida (7 pasos, modal centrado, sin spotlight sobre la UI)
1. "¡Bienvenido a Malla Pro!" — "Gestionar tu carrera nunca había sido tan fácil ni se había visto tan bien. Te daremos
   un recorrido rápido por las herramientas principales para que domines tu malla."
2. "Ver Prerrequisitos y Desbloqueos" — "Haz clic sobre el botón de relaciones PR (icono de conexiones) en la esquina
   superior derecha de cualquier asignatura. Esto la seleccionará, mostrando visualmente mediante líneas de flujo sus
   prerrequisitos (Amarillo) y ramos que desbloquea (Verde), sin alterar su estado."
3. "Aprobar un Ramo" — "Haz clic o toca sobre el cuerpo de cualquier ramo para marcarlo o desmarcarlo inmediatamente
   como Aprobado (Verde). Esto habilitará automáticamente los ramos que dependen de él."
4. "Ramos en Curso" — "Mantén presionada cualquier asignatura (clic largo en PC o pulsación táctil prolongada en móvil)
   para marcarla como Cursando (Azul)."
5. "Calcula tus Notas" — "Haz clic derecho sobre cualquier asignatura (o mantén presionado el botón PR en móvil) para
   abrir el menú de opciones y seleccionar 'Gestionar notas'. Esto abrirá la calculadora avanzada para ingresar tus
   evaluaciones y ponderaciones."
6. "Promedio en Vivo" — "Al ingresar notas en una asignatura, aparecerá una pequeña insignia en su esquina superior
   derecha indicando tu promedio actual calculado en tiempo real."
7. "Tema y Modo Excepcional" — "En la barra superior puedes cambiar el tema visual de la página. También encontrarás el
   'Modo Excepcional', el cual te permite forzar aprobaciones de asignaturas saltándote sus prerrequisitos bloqueados."
   Botón final: "¡Comenzar!" / en todos los pasos "Saltar Tour".
PROBLEMAS del tour: (a) no explica "Periodo" (toma de ramos) ni "Horario", que son el gancho del landing; (b) enseña
gestos escondidos (clic derecho / mantén presionado) sin mostrarlos en la UI real ni hacer spotlight; (c) no hay botón
"Anterior" ni indicador de progreso claro (una rayita chica arriba); (d) mezcla íconos de línea con emojis (🧮 📈 🎨),
rompe consistencia; (e) dice "clic derecho" pero el menú real se abre también con el botón PR.

## Malla interactiva (Malla)
Header: nombre de carrera + "UNAB" + botón "Cambiar malla"; "6% de avance" (BUG: renderiza "6%de avance", sin espacio);
"3 aprobados1 cursando44 pendientes" (BUG: sin separadores); barra de progreso verde/azul; chips Todos/Disponibles/
Cursando/Aprobados; botones "Marcar hasta" (menú), "Modo excepcional", "Resumen", "Ocultar completados",
"Pantalla completa". Sidebar izquierda: Malla / Periodo / Horario, abajo Excepción y Ajustes.
Grilla: columnas por Año y Semestre (1..10), tarjetas con sigla "PR", nombre, código · SCT y estado
(Disponible / Bloqueada / Cursando / Aprobada). Abajo "Semestres 1..10" con tooltip "Semestre 1: 3 de 4 aprobados".
Scroll horizontal para ver los 10 semestres (Año 4/5 quedan fuera de pantalla).
PRUEBAS: click simple marca Aprobada y desbloquea dependientes (Base de Datos y Cálculo Diferencial pasaron de
"Bloqueada" a "Disponible" al aprobar Semestre 1); press-and-hold (~1,2 s) marca "Cursando"; botón "PR" abre drawer
"Detalle de Física General" con "Estado de la asignatura" (select Pendiente / Cursando actualmente / Aprobada),
"Gestionar notas y calificaciones", "Prerrequisitos / Requerido — Esta asignatura no tiene prerrequisitos.",
"Asignaturas que desbloquea / Desbloquea — Física Experimental (CFIS328)"; la tarjeta seleccionada se resalta y las
demás se atenúan, con línea punteada de relación. Tras poner notas, la tarjeta muestra insignia "4.6" (promedio en vivo).
BUG/accesibilidad: la tarjeta es un <button> cuyo nombre accesible empieza con "PR …" y el botón PR queda anidado; sin
focus/etiqueta propia al leer el árbol (aparece recién como "button PR, Help: Ver prerrequisitos / Opciones" al
seleccionar). El gesto primario (aprobar) es click y el secundario (cursando) es mantener presionado: nada lo sugiere
en la UI fuera del tour.

## Resumen de progreso (botón "Resumen")
Drawer "Resumen de progreso / Vista general de tu avance académico": tarjetas "3 Aprobadas / 1 En curso / 48 Total";
"PROGRESO GENERAL 8,3%" con barra y leyenda "Aprobadas (8.3%) · En curso (2.1%)"; "Detalle de asignaturas" Aprobadas
3 ramos / En curso 1 ramos / Pendientes 44 ramos; "Créditos SCT" Aprobados 50 SCT / En curso 18 SCT / Pendientes 601 SCT.
BUGS: (1) el header dice "6% de avance" y el resumen "8,3%" para el mismo estado; (2) la leyenda atribuye 8.3% a
"Aprobadas" cuando aprobadas son 3/48 = 6.3% (8.3% incluye cursando); (3) mezcla de coma y punto decimal en un mismo
panel ("8,3%" vs "(8.3%)"); (4) "1 ramos" (singular/plural).

## Calculadora de notas ("Gestionar notas y calificaciones")
Modal con título del ramo y "CFIS310 · 18 SCT · Cursando".
Estado vacío: "Aún no hay evaluaciones" + "Agrega tus solemnes, controles o tareas con su porcentaje, y te decimos
cuánto necesitas para eximirte." + botón "Agregar la primera"; "Eximición", "Importar configuración",
"Compartir configuración" deshabilitado con tooltip "Configura al menos una evaluación para poder compartir.".
Form "Nueva evaluación": Nombre (placeholder "Solemne 1"), Porcentaje (stepper, default 25), Nota (opcional)
(placeholder 5.5), Fecha (opcional) mm/dd/yyyy, Hora (opcional) DESHABILITADA, Cancelar / Registrar, ayuda
"Queda 100% por distribuir."
Con Solemne 1 25% y nota 5.5: titular "Necesitas 4.8 en el 75% que falta para eximirte"; barra por segmentos
(25% azul / "Sin asignar" 75%); "Evaluado 25% · Falta 75%"; "Promedio 5.50 · Eximición 5.0 · 1 evaluación".
Con Control 1 30% y nota 3.9: "Necesitas 5.5 en el 45% que falta para eximirte", "Promedio 4.63".
"Eximición" despliega "Parámetros de la nota final": Nota de eximición (5), % presentación (70), % examen (30).
Cada evaluación: nombre, %, nota editable, botones Fecha, "Desglosar" (Help: "Desglosa esta evaluación en varias notas;
la nota será su promedio") y "Quitar …".
"Compartir configuración" abre un segundo modal encima: "Compartir configuración / Evaluaciones y porcentajes de este
ramo / Comparte las evaluaciones y porcentajes de este ramo con tus compañeros." + "2 evaluaciones · Ponderación total:
55%" + "Los porcentajes actualmente suman 55%. Puedes compartir igualmente." + nota "El código comparte únicamente
nombres y porcentajes. Tus notas y datos personales no se incluyen." + "Código de configuración" (código tipo MP1C…) +
"Copiar código" / "Cerrar". Muy buena idea (spread de grupo) y buena advertencia de privacidad.
BUGS: (1) formatos de nota inconsistentes: "Promedio 5.50" con punto vs "Eximición 5.0" y barra "5,5 / 3,9" con coma;
(2) al registrar una evaluación el formulario "Nueva evaluación" queda abierto con los valores anteriores y el texto
"Queda 75% por distribuir." contradiciendo el "Falta 45%" del titular (reproducir: Agregar la primera → Registrar);
(3) "Hora (opcional)" siempre deshabilitada, sin explicación; (4) modales apilados (Compartir sobre Notas) y varios
botones "Cerrar" duplicados en el árbol; el cierre del modal de compartir deja el modal de notas con scroll bloqueado
un instante; (5) no hay botón "Guardar": todo se aplica al instante, pero tampoco hay confirmación ni deshacer al
"Quitar" una evaluación.

---

## Malla interactiva — herramientas (continuación)

Fuente: https://mallapro.cl/app (Ingeniería Civil Informática, UNAB, 48 ramos / 10 semestres)

**"Marcar hasta" → "Aprobar hasta" → Semestre 1..7**: deja 19 aprobados y "40%de avance". Después del click el botón queda con aspecto deshabilitado (gris) aunque la malla sí cambió. La lista llega solo hasta Semestre 7 aunque la malla tiene 10 semestres.

**Modo excepcional** (button, help "Aprobar ramos sin cumplir prerrequisitos"):
- Banner superior: `Modo Excepcional` + `0 seleccionados` + botón `Qué es una excepción` + texto `Sirve para marcar ramos como aprobados aunque no cumplas los prerrequisitos, por ejemplo convalidaciones o casos especiales.` + botones `Cancelar` y `Salir`.
- Al seleccionar un ramo bloqueado: `1 seleccionado` y el botón pasa a `Aplicar y salir`. La ficha pasa a estado `Excepcional` (accent naranja, ícono ⚡).
- Al aplicar: avance 40% → 42%, `20 aprobados0 cursando28 pendientes`. Funciona bien y es un diferencial real.
- El ícono lateral `Excepción` cambia a naranja y muestra badge `1`.
- Bug: al volver a entrar por `Excepción` (nav) se restaura una selección previa (`1 seleccionado`) sin avisar, y el banner vuelve a ofrecer `Cancelar` / `Salir`. No hay pantalla propia de Excepción: reutiliza la Malla, así que el ítem de navegación no lleva a ningún lado nuevo.
- El naranja del modo excepcional es un color de acento que no aparece en el resto del sistema (verde/azul/rojo).

**Ocultar completados / Mostrar todo**: alterna etiqueta y help (`Ocultar semestres completados` / `Mostrar todos los semestres). Con filtro "Aprobados" activo la malla arranca en Año 3 (scroll automático) y hay que pulsar "Mostrar todo" para volver arriba: el filtro no hace scroll al primer ramo coincidente.

**Filtros** Todos / Disponibles / Cursando / Aprobados: no ocultan, atenúan (opacidad) las fichas que no coinciden. Visualmente correcto, pero el árbol de accesibilidad sigue exponiendo todas las fichas y no hay forma de saber cuántas coinciden.

**Pantalla completa**: cambia a vista limpia con título `Visualización Curricular` y botón `Salir` (arriba a la derecha). Se pierden el header de avance, el resumen y los filtros: no hay forma de marcar ramos desde allí. El botón pasa a `Salir de pantalla completa` en el árbol pero en pantalla sólo dice `Salir`.

**Tarjetas de ramo**: `PR` (botón anidado dentro del botón de la ficha → problema de accesibilidad), código y SCT, estado (`Disponible`, `Cursando`, `Aprobada`, `Bloqueada`, `Excepcional`) y badge de promedio (`4.6`, `4.2`). Click = aprobar; press-and-hold (~900 ms) = cursando. Ninguna pista visible de ese gesto hasta el tour.

---

## Periodo actual (toma de ramos / semestre en curso)

Fuente: https://mallapro.cl/app (nav `Periodo`)

- Estado vacío sin ramos cursando: heading `Periodo actual`, `0 asignaturas activas`, panel con ícono de libro, `No estás cursando asignaturas` y `Marca ramos como "Cursando" en tu malla curricular para gestionarlos y simular sus calificaciones.` Excelente estado vacío.
- Con 5 ramos cursando: `5 asignaturas activas`, botón `Agregar evaluación` (menú), sección `TU AGENDA` / `Próximas evaluaciones`, grilla `Asignaturas (5)` + `Evaluaciones (0)`.
- Ficha de asignatura: `Promedio —`, chip `Sin sección asignada. Defínela en Toma de Ramos.`, `Sin evaluaciones / Aún no hay notas registradas`, botón `Notas`. El aviso de sección remite a "Toma de Ramos", pero la pantalla de toma de ramos vive bajo el ítem `Horario` (`Arma tu horario`): desalineación de nombres.
- Panel `Notas` (diálogo): heading ramo, `FMSP316 · 20 SCT · Cursando`, `Cerrar`; estado vacío `Aún no hay evaluaciones` + `Agrega tus solemnes, controles o tareas con su porcentaje, y te decimos cuánto necesitas para eximirte.` + `Agregar la primera`; pie con `Eximición`, `Importar`, `Compartir` (deshabilitado con help `Configura al menos una evaluación para poder compartir.`).
- Alta: `Nueva evaluación`, campos `Nombre` (placeholder `Solemne 1`), `Porcentaje` (25), `Nota (opcional)` (5,5), `Fecha (opcional)` mm/dd/yyyy, `Hora (opcional)` **siempre deshabilitada**, `Cancelar`, `Registrar`, ayuda `Queda 100% por distribuir.`
- Tras registrar Control 1 30% nota 4,2: titular `Necesitas 5.3 en el 70% que falta para eximirte`, barra `Evaluado 30%` / `Falta 70%`, `Promedio 4.20`, `Eximición 5.0`, `1 evaluación`, fila con nota editable, `Fecha`, `Desglosar` (help: "Desglosa esta evaluación en varias notas; la nota será su promedio"), `Quitar Control 1`, `Agregar evaluación`. Muy bueno: matemática correcta y lenguaje claro.
- Bug de fecha: escribir `12/04/2026` en el input de fecha produce año `0026` o `42026` y, al pulsar `Listo`, la fecha **se descarta en silencio** (vuelve a `mm/dd/yyyy`, sin validación ni error). `Próximas evaluaciones` sigue en estado vacío. La hora nunca se habilita. Con eso la agenda del semestre queda inutilizable.
- Al pulsar `Listo` el diálogo además selecciona todo el texto de la página (texto resaltado en toda la vista).

---

## Horario / Arma tu horario

Fuente: https://mallapro.cl/programacion-academica (el ítem de nav dice `Horario` pero la URL y el H1 son otros: `Arma tu horario`, `/programacion-academica`)

- Sub-título: `Parte desde tu horario actual y prueba cambios sin perder lo que ya tienes inscrito.`
- `Carga tus documentos` + `Añade uno o ambos archivos. Malla Pro combina la información automáticamente.`
- Dos zonas de carga: `Ya tengo mi horario inscrito` (`Sube tu horario y detectamos los ramos que ya tienes inscritos.`) y `Quiero probar otras secciones` (`Sube la Programación Académica para ver todas las secciones, NRC, profesores y cupos.`), ambas con `Arrastra el PDF aquí o selecciónalo` y `Subir PDF`.
- Nota de privacidad: `Los archivos se procesan solo en tu dispositivo. No se envían a ningún servidor.`
- Estado de error verificado (subo de archivo .md): alert en rojo `El archivo no es un PDF válido.` Correcto y accesible (role alert).
- **Límite de la auditoría**: no fue posible subir un PDF real de programación académica (no hay archivo de prueba en el workspace y el PDF generado desde la propia página no pudo subirse porque el uploader restringe la ruta). Por tanto **no se pudieron ver** la grilla de horario, los topes de horario, las secciones/NRC/cupos, ni exportación. Se reporta como no verificable, no como ausente.

---

## Ajustes (popover del ícono de engranaje)

Fuente: https://mallapro.cl/app

Contenido: `Ingeniería Civil Informática / UNAB`, `Resumen de progreso`, `Tutorías (Pronto)`, grupo `Apariencia` → `Modo oscuro` (switch), grupo `Configuración` → `Ver guía interactiva`, `Sugerir carrera`, `Descargar respaldo`, `Cargar respaldo`, `Cambiar de malla` (rojo), grupo `Información` → `Privacidad`, `Términos de uso`, `@mallapro.cl_`.

- `Modo oscuro` funciona y persiste; la malla se re-estima bien, **pero las fichas `Bloqueada` quedan en gris muy oscuro sobre fondo casi negro** (contraste insuficiente, difícil de leer). En claro el contraste es correcto.
- `Descargar respaldo` genera `mallapro-respaldo-2026-11-26.json` y muestra `Respaldo descargado. Guárdalo en un lugar seguro.` Excelente.
- `Resumen de progreso` (panel lateral): `Vista general de tu avance académico`, tarjetas `20 Aprobadas / 5 En curso / 48 Total`, `PROGRESO GENERAL 52.1%`, leyenda `Aprobadas (41.7%)`, `En curso (10.4%)`, `Detalle de asignaturas` (20/5/23 ramos), `Créditos SCT` (279 / 66 / 324). Bien hecho, pero **contradice el header**: el header dice `42%` y aquí `52.1%`; el número del header es sólo aprobados (41,7%) redondeado, y la leyenda atribuye mal los porcentajes. Botón `Cerrar panel` que a veces no cierra al primer click.
- **No existe pantalla de planes ni precios**: todo es gratis (la landing lo dice). No hay upsell, no hay cuenta, no hay "pro". Tampoco hay botón de **borrar todos mis datos** pese al discurso local-first (sólo "Cargar/Descargar respaldo").
- No hay sección de ayuda/FAQ dentro de la app, ni atajo de teclado documentado.

---

## Bugs resumidos (texto exacto)

1. `42%de avance` / `40%de avance` — falta espacio entre número y texto.
2. `20 aprobados5 cursando23 pendientes` — contadores pegados, sin separadores.
3. Header `42%` vs `PROGRESO GENERAL 52.1%` y leyenda `Aprobadas (41.7%)` — dos definiciones de "avance" sin explicar.
4. `1 ramos` / `1 carreras` — plurales no corregidos.
5. Mezcla de coma y punto en notas: `4.2`, `Promedio 4.20`, `Eximición 5.0` vs placeholder `5,5` y entrada `4,2`.
6. Fecha de evaluación no acepta el año escrito (`0026`, `42026`) y se descarta en silencio al pulsar `Listo`; `Próximas evaluaciones` nunca se llena.
7. `Hora (opcional)` permanentemente deshabilitada (aún con fecha).
8. `Hora` y `Fecha` en formato `mm/dd/yyyy` (inglés) en una app chilena.
9. `Marcar aprobados hasta un semestre` ofrece sólo Semestre 1..7 con malla de 10.
10. Botón `PR` anidado dentro del botón de la ficha (anidamiento inválido, focos duplicados).
11. Nav `Horario` → URL `/programacion-academica` y H1 `Arma tu horario`; chip `Defínela en Toma de Ramos` no coincide con ningún ítem de nav.
12. `Excepción` reabre Modo Excepcional con selección residual (`1 seleccionado`) y dos botones casi redundantes (`Cancelar` / `Salir`).
13. En modo oscuro, estado `Bloqueada` con contraste insuficiente.
14. Filtro `Aprobados` no hace scroll al primer ramo coincidente; la malla abre en Año 3.
15. `Listo` deja toda la página con el texto seleccionado.
16. Tour de 7 pasos sin paso de Periodo/Horario, sin spotlight sobre los elementos reales, sin botón "Anterior", emojis mezclados con íconos de línea.
