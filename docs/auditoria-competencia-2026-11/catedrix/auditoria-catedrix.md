# Auditoría UX Catedrix (catedrix.vercel.app) — 2026-11-26, [usuario] (GradeHub)

## Pantalla 1 — Inicio / "Ramos y horario" (sin cuenta)
URL: https://catedrix.vercel.app/ (título: "Catedrix")

**Qué hay**
- Header: logo rombo azul + "Catedrix" + chip "2026-2"; nav central con 5 botones: **Ramos y horario · Mis ramos · Notas · Comunidad** (help: "Amigos, horarios compartidos y preguntas") · **Mi perfil** (help: "Tus datos, solicitudes de amistad y amigos"); a la derecha botón **Entrar con correo UC** (help: "Guarda tus ramos y tu horario en tu cuenta").
- Banner de aviso (role=status): "🌶️ Reseña tus ramos para ayudar a la toma 2027-1!! Cada reseña es información que le sirve a un compañero, es sólo un par de minutos" con botón "Cerrar aviso".
- Panel izquierdo "Buscar ramos": search field con placeholder "Sigla, nombre o profesor (ej. IIC2333, cálculo, Rojas)"; chips Todos / **Ingeniería** (activo por defecto) / OFG; checkbox "Con vacantes"; grupo "Con reseñas:" con checkboxes "Solo reseñados", "Poca carga (≤ 5 h)", "Sin asistencia en todas las clases"; combo "Orden" con opciones: por sigla / Menos carga primero / Más fácil sacarse buena nota / Más recomendados (OFG).
- Caja de acentuada: botón-link "Carga tus ramos aprobados" + texto "(pegando tu avance curricular) para ver qué ramos puedes tomar y qué requisito te falta."
- Nota gris: "Ramos de la Escuela de Ingeniería y 57 de otras facultades que son requisito de ellos (Cálculo, Física, Química…). Los mínimos exactos de tu plan llegarán cuando la app tenga tu malla."
- Contador "702 ramos" y lista de tarjetas (colapsables) con sigla, nombre, "10 cr · N secciones", chip "Requisito en Ingeniería" y, si hay, "★ N reseñas · ~4,0 h/sem · dificultad 3,7/5". Botón "+ Horario" en cada tarjeta. Botón final "Ver más (662 restantes)" (carga de a 40).
- Panel derecho "Mi horario" (H2): estado vacío "Todavía no agregas ramos." + "Busca un ramo y toca + Horario. Puedes elegir la sección tú o dejar que la app busque las combinaciones sin choques."
- Footer: "Datos de Buscacursos UC. Tus ramos y tu horario se guardan solo en este dispositivo." · DisclosureTriangle "Sugerencias y contacto · Guías y apuntes ▾" · "© 2026 Milagros Ardizzoni · Catedrix. Todos los derechos reservados. Prohibida su copia o reproducción." · links Términos de uso (/terminos.html) y Todos los ramos (/ramos).

**Qué se siente / qué se piensa**
- Visual muy sobrio, estilo "dashboard SaaS": fondo gris #f5f7fa, cards blancas, azul #2f5fd0, radio de 8px, tipografía system/Inter. Familiar para un estudiante que usa Buscacursos o Canvas, pero sin personalidad: no hay ilustración, empty state sin graphic, cero branding.
- La promesa de venta (horario sin choques) está en el estado vacío, no en el hero: no hay pitch de "qué es Catedrix" en ninguna parte. Un estudiante nuevo no sabe qué está mirando.
- El chip "Ingeniería" viene activo por defecto y el contador dice 702 ramos, pero la lista muestra BIO/DNO/EAE/FIZ "Requisito en Ingeniería": confunde "Ingeniería" (facultad) con "requisito".

**No intuitivo / bugs observados**
1. Botón "Carga tus ramos aprobados" y el texto entre paréntesis van separados: la frase "(pegando tu avance curricular)" se lee como continuación del botón, el CTA cortado a la mitad.
2. La etiqueta del filtro dice "Con reseñas:" pero el primer checkbox es "Solo reseñados": redundante y ambiguo.
3. "Sin asistencia en todas las clases" es un filtro de doble lectura (¿sin asistencia en *todas* las clases o *no* asistencia obligatoria?). Falta tilde/redacción: "No toman asistencia" sería más claro.
4. Orden "Más fácil sacarse buena nota" es una promesa basada en datos que casi no existen (la mayoría de ramos no tiene reseña); no dice cuántas reseñas se necesitan.
5. "Ver más (662 restantes)" obliga a 17 clicks para ver los 702; no hay "cargar todo" ni virtual scroll.
6. Faltan tildes en varios nombres de ramos del catálogo ("Biologia", "Introduccion", "Diseno y Manufactura Digital Cad/Cam", "Teoria Electromagnetica", "Administracion"): se ve descuidado frente a Buscacursos.
7. El banner de aviso usa role=status pero no desaparece solo y tapa parte del buscador en pantallas chicas.
## Pantalla 2 — Buscador y filtros (sin cuenta)
- Búsqueda en vivo, sin botón: al escribir "IIC2333" la lista se filtra sola (no hace falta Enter). Placeholder bueno: "Sigla, nombre o profesor (ej. IIC2333, cálculo, Rojas)".
- **Bug de concordancia**: el contador dice literalmente **"1 ramos"** (debería ser "1 ramo"). También "702 ramos" sin formato de miles.
- Filtros: chips Todos / Ingeniería / OFG; checkbox "Con vacantes"; grupo "Con reseñas:" con "Solo reseñados", "Poca carga (≤ 5 h)", "Sin asistencia en todas las clases"; select "Orden" (por sigla / Menos carga primero / Más fácil sacarse buena nota / Más recomendados (OFG)).
- No hay forma de limpiar la búsqueda con un botón "✕" visible en el campo, ni filtro por día/horario (ej. "solo ramos de mañana" o "sin ramo el miércoles"), que es justamente el dolor que resuelve un generador de horarios.
- El filtro "Ingeniería" sigue mostrando ramos de otras facultades etiquetados "Requisito en Ingeniería": la etiqueta del chip no describe el filtro real.

## Pantalla 3 — Detalle de ramo expandible (IIC2333 / IIC2343)
Al tocar la tarjeta se expande *inline* (no es página nueva, no cambia la URL → no se puede compartir ni volver atrás):
- "Ingeniería · 2 profesores"; lista de definición "Prerrequisitos: IIC2343" / "Equivalencias: IIC2512" (botones que llevan al otro ramo, buen detalle); en IIC2343: "Prerrequisitos: IIC2233 **(en paralelo)**" — conserva el matiz UC, muy bueno.
- Tabla de secciones: Sec. | Profesor(es) | Horario | Vac. (con help "Vacantes disponibles / totales") | botón **Usar**. Ej.: "Ruz Cristian · San Joaquín · Presencial · NRC 12451 · L-W M2 · AYU V M1 · 37/60".
- Bloque "Lo que dicen quienes lo tomaron" con botón "Reseñar este ramo" y vacío: "Todavía no hay reseñas. Si lo tomaste, cuéntales a los demás cómo es (es anónimo)."
- Bloque "Pregúntale a quienes lo tomaron" con botón "Hacer una pregunta" (colapsable).

**Sensaciones / fricción**
- Notación de horario UC sin traducir: "L-W M2 · AYU V M1 · TAL M M5-6". Un alumno de primer año no sabe que M2 = 8:20 ni que TAL = taller. Falta leyenda o texto legible ("Lunes y Miércoles, bloque 2 (08:20)").
- **Nombre de profesor invertido**: "Ruz Cristian", "Quintana Álvaro", "Valenzuela Felipe" (apellido antes, tal cual Buscacursos) — se ve a error y complica buscar "profe Cristian Ruz".
- **Bug de datos**: taller con **"sala SIN SALA"** (tooltip "IIC2343 sec. 2 · Taller · sala SIN SALA") y el bloque del grid dice solo "IIC2343TAL".
- Abreviatura "CLAS" en el aviso de choques (debería "Clase"), y "AYU" sin explicar.
- El botón "Usar" es confuso junto a "+ Horario": dos CTA para lo mismo; tras usarlo queda "**Elegida**" en gris (discapacitado) y el de la tarjeta pasa a "✓ En horario", buen feedback.

## Pantalla 4 — "Mi horario" y generador de combinaciones sin choque
Estado vacío: "Todavía no agregas ramos." + "Busca un ramo y toca **+ Horario**. Puedes elegir la sección tú o dejar que la app busque las combinaciones sin choques."
Tras agregar: "2 ramos · 20 créditos"; aviso "Carga tus ramos en **Mis ramos** para que el horario revise los requisitos."
Por ramo: sigla (botón), nombre, select de sección ("Sin elegir / Sec. 1 · Ruz Cristian / Sec. 2 · Quintana Álvaro"), botón "Quitar", y botón **"Acepto cualquier sección ▾"** que despliega "Marca las secciones que te sirven (por profesor u horario). La búsqueda de combinaciones solo usa estas." con checkbox por sección.
Control de búsqueda: botón azul "Buscar combinaciones sin choque", select "Ordenar combinaciones" (Menos ventanas / Más días libres / Terminar más temprano / Empezar más tarde), checkbox "Permitir choques con ayudantías", resumen "Libre: martes, jueves · 0 ventanas · de M1 a M2", paginación "Anterior / Opción 1 de 2 / Siguiente", "Usar esta", "Volver a mi horario".
Grid Lun–Vie × M1..M8 con horas (8:20, 9:40, 11:00, 12:20, **fila "Almuerzo"**, 14:50, 16:10, 17:30, 18:50) y bloques de color por ramo con tooltip ("IIC2333 sec. 1 · Clase · sala BC23").
Detección de choques: banner rojo **"⚠ 2 choques: Lun M1 (IIC2333 CLAS / IIC2343 CLAS); Mié M1 (IIC2333 CLAS / IIC2343 CLAS)"** y borde rojo en los bloques. **Funciona bien y es el mejor detalle del producto.**

**Bugs concretos (reproducibles)**
1. **Grid se queda viejo al agregar un ramo estando en vista de combinaciones**: con "Opción 1 de 2" activa, al tocar "Usar" en IIC2343 el contador sigue en "Opción 1 de 2" y el grid **no dibuja IIC2343** (solo IIC2333), aunque el chip "2 ramos · 20 créditos" sí lo cuenta. Pasos: +Horario IIC2333 → Buscar combinaciones → Acepto cualquier sección → +Horario/Usar IIC2343 → el grid no muestra el segundo ramo.
2. **"Volver a mi horario" cambia solo la sección elegida**: tras volver, IIC2333 pasó de "Sec. 2 · Quintana Álvaro" a "Sec. 1 · Ruz Cristian" sin aviso.
3. Resumen engañoso: "de M1 a M1" cuando hay bloques en M1 y ayudantía en M1; y "3 ventanas" con bloques M1 y M5-M6 (no define qué es ventana).
4. El select de sección queda **discapacitado** cuando "Acepto cualquier sección" está activo, pero no se explica por qué; hay que volver a abrir el desplegable para entenderlo.
5. No hay botón "Limpiar horario", ni "Descargar a calendario / .ics", ni guardado del horario como opción ("Opción 2 de 2" no se puede guardar ni comparar lado a lado).
6. No hay scroll horizontal ni vista "adaptada" en ancho chico (a revisar en móvil); el grid usa toda la columna derecha y deja gran espacio vacío abajo.
## Pantalla 5 — "Mis ramos" (tabs Malla / Lista y avance)
Flujo de carga (sin cuenta y con cuenta):
- Tarjeta superior: "Con tus ramos aprobados, el buscador y el horario te dicen qué ramos puedes tomar y qué requisito te falta." · "Sin entrar se guardan solo en este dispositivo. Entra con tu correo UC para tenerlos en tu cuenta (y tu horario también)." + botón "Entrar con correo UC".
- "Tu carrera" (select, placeholder "Se llena sola al pegar tu avance") y "Año de ingreso" (Ingreso 2027…2012). Nota de privacidad: "Quedan guardados en tu cuenta. Se usan para las estadísticas generales de la app y, si participas, para compararte con tu generación en Notas; nadie ve los tuyos."
- **"Pega tu avance curricular"** con 3 pasos: 1. "En **Mi Portal UC**, abre tu avance curricular (o la concentración de notas)." 2. "Selecciona toda la página (Ctrl+A, en el celular 'Seleccionar todo') y cópiala." 3. "Pégala aquí. No importa que venga texto de más: solo se leen las siglas, notas y estados." + textarea con ejemplo realista ("MAT1610 Cálculo I 5,5 2025-1…") + "El texto no se guarda en ninguna parte: solo la sigla, el estado, la nota y el semestre de cada ramo."
- Botón "Leer" (deshabilitado hasta pegar). Con 4 líneas de ejemplo sintetizó **"Encontré 4 ramos. Revisa el estado de cada uno antes de guardar."** y una tabla Ramo/Estado/Nota/Semestre/Sección con checkbox "Guardar …" y select de estado (Aprobado/Cursando/Reprobado). Botones "Guardar 4 ramos" / "Volver" y nota "Los ramos que ya tenías y no aparecen aquí se mantienen. Si una sigla ya estaba, se reemplaza por lo nuevo." → **flujo excelente, con preview editable: muy superior a subir un PDF.**
- Truco adicional: "Agregar una sigla (ej. MAT1610)" + estado + "Agregar", y checkbox marcado por defecto "Contar los que estoy cursando como aprobados (para armar el próximo semestre)".
- Confirmación: "Listo: 4 ramos guardados en este dispositivo." y nudge "★ Reseña los ramos que ya tomaste (te faltan 4): son unos 4 minutos por ramo, es anónimo y ayuda a quienes los toman después."
- Lista "Aprobados · 4 ramos · 40 créditos*" con "Reseñar", select de estado, "Quitar", y "* Créditos solo de los ramos que se dictan en 2026-2." + "Borrar todos".

**Tab Malla** (impresionante): "Licenciatura en Ciencias de la Ingeniería" + "Diagrama curricular sugerido · Res. VRA N°089/2021 (mod. junio 2024), con Introducción a la Economía en IV y el Optativo de Biología en II (orden habitual). Columnas = semestre sugerido de la malla." Barra "Créditos por tipo" con 40 de 400 créditos aprobados 10 % y desglose Mínimos 30/110, Fundamentos de Ingeniería 10/60, Major 0/100, Minor 0/50, Formación General 0/60, Teológico 0/10, Filosófico 0/10. Columnas I–VIII con ramos reales, equivalencias ("FIS1523 / IIQ1003 / ICM1003 / IIQ103H"), casillas "Vacío", legibilidad con colores por tipo y leyenda. "Todos tus ramos están en la malla. Para mover uno que ubicaste, tócalo o arrástralo a otro cuadro." y "Lo que ubicas se guarda en este dispositivo".

**Bugs / fricción de Mis ramos**
1. El badge del contador va pegado al texto: el nombre accesible del botón es **"Mis ramos5"** y del título "Mis ramos4"; igual en Notas ("Notas1") y en la malla "40de 400 créditos aprobados10 %", "Mínimos30/110", "Dinámica4,2 · 2026-1". Lee mal con lector de pantalla y se ve sin separación.
2. **"Cursando · 1 ramos"**: mismo error de plural que "1 ramos".
3. Al pegar el avance, la tarjeta "Tu carrera / Año de ingreso" **desaparece** durante la previsualización y vuelve después; no se ve la carrera detectada hasta guardar.
4. "Tipo" en Notas/Malla queda en "Mínimo" por defecto aunque la app sabe que IIC2333 es Fundamentos/Major: debería autocompletar.
5. Sección inscrita se autocompleta con la del horario ("Secc. 2 · Quintana Álvaro") sin decir que viene del horario; si uno cambia el horario, no está claro si se desincroniza.
6. No hay deshacer: "Borrar todos" borra directo, sin confirmación visible en el árbol (a revisar).

## Pantalla 6 — "Notas 2026-2"
- Cabecera: chip "Solo en este dispositivo" + botones **Traer de Canvas**, **Importar Excel**, **Descargar Excel** (descarga real: `Notas_2026-2.xlsx`, 112 KB).
- Métricas: Promedio actual —, Avance del semestre 0 %, Créditos inscritos 10, Créditos aprobados 0, Promedio final (cerrados) —.
- Explicación: "Notas de 1,0 a 7,0 (ej. 5,4). Vacío = pendiente; X = la rendiste y no tiene nota publicada. Se aprueba con 3,95. El Excel trae esta hoja con las mismas fórmulas, más tus semestres anteriores (de Mis ramos) para el PPA…"
- Estado vacío correcto y con CTA "Ir a Mis ramos".
- Bloque por ramo (IIC2333, chip "En curso"): Profesor (autocompletado), Tipo (Mínimo/OFG/FG Teológico/FG Filosofía/Exploración Major/Major/Minor/Optativo/Otro), Grupos (opcional), tabla Evaluación | % | Nota | Mín. con botones "+ Evaluación", "+ Promedio de notas", "Empezar con I1, I2, I3, Examen y Controles" (plantilla que **desaparece** en cuanto agregas una evaluación), tarjetas resumen **Promedio actual / Avance / Nota mín. necesaria / Suma % / Nota final calculada / Nota oficial / Para promedio y PPA**, y "Reglas especiales del curso" (placeholder "ej. Examen reprobatorio: necesario ≥ 3,0").
- Con Control 1 30 % nota 5,0 y Examen 70 % con mín. 3,0: **Nota mín. necesaria 3,50** y "Suma % OK". Cálculo correcto y más útil que GradeHub porque exige mínimo por evaluación.
- **Bugs**: (a) con solo Control 1 cargado, "Avance 100 %" pese a "Suma % 30,0 %" (mide completitud de filas, no % ponderado: confunde); (b) "Nota mín. necesaria: Completo" en vez de indicar que falta el 70 %; (c) "Promedio actual 5,00" normalizado sin avisar que ignora el 70 % faltante; (d) "Para promedio y PPA —" no explica por qué está vacío si el ramo está en curso.

### Diálogo "Traer notas de Canvas" (abierto y cancelado, sin conectar)
"La app puede leer las notas que tus profesores publican en Canvas. Para eso necesita un **token** de tu cuenta de Canvas:" 1) "Abre Canvas UC → Cuenta → Configuración" (link real a cursos.canvas.uc.cl/profile/settings) 2) "Baja hasta Integraciones aprobadas y presiona + Nuevo token de acceso." 3) "En Propósito escribe *Catedrix*; en Fecha de vencimiento, la más lejana que permita (Canvas UC deja hasta 30 días). Presiona Generar token." 4) "Copia el token (Canvas lo muestra una sola vez) y pégalo aquí." Botones Conectar (disabled) / Cancelar. Nota final: "El token queda guardado **solo en este dispositivo** (no en tu cuenta de la app). La app solo lee tus cursos y notas; no escribe nada en Canvas. Igual trátalo como una contraseña… Lo puedes borrar en Canvas cuando quieras. Cuando venza, la app te pedirá uno nuevo."
**Pros**: transparencia y pasos exactos. **Contras**: el campo "Token de Canvas" es text field **sin enmascarar** (no es type=password), no ofrece OAuth/silent re-auth, exige revincular cada 30 días, y no avisa qué pasa con las notas ya traídas si el token vence.

### Diálogo "Importar notas desde Excel"
"Sirve el Excel que descarga esta app, la planilla de notas con el mismo formato, o cualquier tabla con una fila por evaluación (también en .csv). El archivo se lee en tu dispositivo: no se sube a ningún lado." + botón "Elegir archivo". **Bug**: el rótulo "Elegir archivo" se repite como texto y como botón; el diálogo es tan chico que tapa el botón "Descargar Excel" que está justo detrás, y no hay enlace a un archivo de ejemplo descargable ni vista previa antes de importar.

## Pantalla 7 — "Comunidad" (sin cuenta)
Solo una tarjeta: "En cada ramo puedes preguntarle (de forma anónima) a quienes ya lo tomaron, y responder las preguntas de los ramos que cursaste. En **Mi perfil** agregas amigos, ven sus horarios y se ponen de acuerdo para tomar ramos juntos." + botón **azul de ancho completo** "Entrar con correo UC".
- **Fricción**: ninguna muestra, ni foro de ejemplo, ni contador de preguntas; pantalla casi vacía (mucho espacio muerto) y el botón gigante se siente a "paywall". Lo mismo ocurre en Notas ("Compararte con los demás": "Es anónimo y voluntario: hay que entrar con tu correo UC.").
- Las preguntas por ramo sí existen sin cuenta (botón "Hacer una pregunta" en el detalle del ramo), pero Comunidad no lo dice: incoherencia entre pantallas.

## Pantalla 8 · Reseñas y preguntas (sin cuenta) — https://catedrix.vercel.app/
- Al expandir un ramo: heading "Lo que dicen quienes lo tomaron" + botón "Reseñar este ramo"; heading "Pregúntale a quienes lo tomaron" + botón "Hacer una pregunta".
- **Reseña (dialog "Reseñar: IIC2343 · Arquitectura de Computadores")**: texto "Para reseñar, entra con tu correo UC. Es anónima: nadie ve quién respondió, y solo se publican resúmenes." y "El correo sirve para que cada estudiante reseñe una vez cada ramo y pueda editar o borrar lo suyo." + botón "Entrar con correo UC".
  - **Muy buen diseño de confianza**: explica anonimato, un envío por ramo, y derecho a editar/borrar. Falta: el formulario de reseña no es visible antes de entrar (no se ven las preguntas/campos: carga, evaluaciones, asistencia), así que el usuario no sabe el esfuerzo que le pides. CTA grande único, sin "ahora no".
- **Pregunta**: el botón "Hacer una pregunta" se expande y muestra **sí** el campo "Tu pregunta" y bajo él el botón "Entrar para preguntar". Inconsistente con reseña (allí no se ve el formulario). Buen patrón el de pregunta: deja escribir y recién pide login al enviar.
- Sin reseñas: "Todavía no hay reseñas. Si lo tomaste, cuéntales a los demás cómo es (es anónimo)." Buen vacío con CTA.

## Pie de página (todas las vistas)
- "Datos de Buscacursos UC. Tus ramos y tu horario se guardan solo en este dispositivo." — **contradicción**: con cuenta, los datos se guardan en la cuenta; el aviso nunca se actualiza y asusta respecto de privacidad.
- `<details>` "Sugerencias y contacto · Guías y apuntes ▾": "¿Qué mejorarías? / Cuéntanos ideas, errores o lo que te falta. Se abre tu correo con el mensaje listo para enviar." Botones tipo segmented "Sugerencia | Error encontrado | Consulta", campo "Escribe aquí (opcional)", link mailto "Enviar por correo" a **optimiza.ramos@gmail.com**, link de correo + "Copiar". No se envió nada (solo mailto).
- "Guías y apuntes": "Guías de estudio de Mili Ardizzoni (Ingeniería), en OneDrive." link externo "Abrir carpeta ↗" a uccl0-my.sharepoint.com (OneDrive personal de estudiante).
- "© 2026 Milagros Ardizzoni · Catedrix. Todos los derechos reservados. Prohibida su copia o reproducción." + links "Términos de uso" y "Todos los ramos".

## Términos de uso — https://catedrix.vercel.app/terminos.html
- Título "Términos de uso", "Última actualización: 24 de noviembre de 2026". 8 secciones: Qué es (no oficial UC), De quién es (código/diseño/textos/nombre/logo/**la forma en que se organizan los datos**, Ley N°17.336), Qué puedes hacer (gratis, personal/académico, **instalada en tu celular** = PWA), Qué no está permitido (copiar/reproducir/modificar, crear otra app a partir del código/diseo/funciones, **scraping masivo incluidas las reseñas**, ver/cambiar datos de otros, usar nombre/logo), Lo que tú escribes (tuyas, licencia para mostrar, anónimas cuando se indique, sin insultos/datos personales/falso, pueden ocultar/borrar, **reportes de otros**), Información puede tener errores (fuente Buscacursos UC, sin garantías), Cambios, Contacto.
- **Falta POLITICA DE PRIVACIDAD**: no hay sección de qué datos personales guarda (correo UC, ramos, notas, token de Canvas), con quién se comparten (comparación anónima con generación/curso), por cuánto tiempo, ni cómo se ejerce el derecho a borrar (Ley 21.719 Chile). Para una app que pide correo UC y notas, es el vacío más grande.
- Reclamo de propiedad sobre "la forma en que se organizan los datos" choca con que los datos vienen de Buscacursos UC. Cláusula que prohíbe "crear otra app... a partir de... las funciones" es inusual y difícil de hacer valer; relevante para análisis competitivo.

## Catálogo SEO — https://catedrix.vercel.app/ramos
- "Ramos UC 2026-2: secciones, profesores y horarios | Catedrix". H1 "Todos los ramos UC del segundo semestre de 2026", "4517 ramos con sus secciones, profesores, horarios y requisitos." + CTA "Abrir Catedrix para buscar y armar tu horario sin choques."
- Lista completa por carrera (Actividades Universitarias, Actuación, Agronomía, Antropología, Arquitectura, Arte...), sin filtros ni buscador visible en el HTML: página de aterrizaje SEO muy larga (más de 170k caracteres de texto).

## Pantalla 9 · Comunidad (sin cuenta) — vista "Comunidad"
- H2 "Comunidad" + párrafo: "En cada ramo puedes preguntarle (de forma anónima) a quienes ya lo tomaron, y responder las preguntas de los ramos que cursaste. En **Mi perfil** agregas amigos, ven sus horarios y se ponen de acuerdo para tomar ramos juntos." + botón ancho completo "Entrar con correo UC".
- Captura tomada (vista de una sola tarjeta, con gran espacio vacío bajo ella porque el pie "Sugerencias y contacto" queda expandido y empuja el footer al fondo).

## Pantalla 10 · Mi perfil (sin cuenta)
- H2 "Mi perfil" + "Crea tu perfil para agregar amigos, ver sus horarios y ponerse de acuerdo para tomar ramos juntos." + botón "Entrar con correo UC".
- **Error de redacción**: "ponerse" en tercera persona cuando el resto habla en segunda ("agregas", "ven sus horarios"). Debería ser "pongan" / "ponerte".
- Repetición: Comunidad y Mi perfil dicen casi lo mismo y ambas terminan en el mismo botón; dos vistas que sin cuenta son el mismo muro.

## Flujo de login — diálogo "Entrar con tu correo UC"
- Dialog con heading "Entrar con tu correo UC", tab group "Forma de entrar" con tabs **"Con código"** (seleccionada) y **"Con contraseña"**.
- "Con código": campo "Correo UC" + botón "Enviar código" (deshabilitado hasta escribir un correo). **No es Microsoft UC / SSO**: no hay botón "Iniciar sesión con Microsoft", así que el login guardado de uc.cl no aplica y la bóveda no lo escribe en otro dominio.
- "Con contraseña": contraseña propia de Catedrix, con "Mostrar contraseña" y link "Mándame un código".
- Ayuda del botón del encabezado: "Guarda tus ramos y tu horario en tu cuenta".
- Resultado: **no se inició sesión** por indicación del usuario (pidió seguir sin cuenta). La auditoría de todo lo que vive detrás de la cuenta no fue posible: perfil con datos, solicitudes de amistad y horarios de amigos, foro/publicar respuestas, reseñas propias, comparación anónima de PPA con generación y curso, importación desde Canvas conectada, malla sincronizada y ajustes/privacidad.

## Estados de vacío, carga y error (probados)
- **Buscador sin resultados**: valor "zzzzqqqñññ" → contador "0 ramos" y mensaje centrado "No encontré ramos con esa búsqueda." Sin sugerencia ("revisa la sigla", "limpiar") ni botón de limpiar dentro del mensaje; el header del counter "0 ramos" sigue en singular/plural raro.
- **Error de pegado sin siglas**: texto sin siglas → banner rojo "No encontré siglas de ramos en el texto (por ejemplo MAT1610). ¿Copiaste la tabla completa?" (buen mensaje: ejemplo + causa + siguiente paso).
- **Éxito con estilo de error**: al guardar se muestra "Listo: 5 ramos guardados en este dispositivo." **en el mismo banner rojo/rosado que los errores**. El color de éxito debería ser verde/neutro; ahora el usuario duda de si salió bien.
- **Aviso rojo persistente**: en "Mi horario" queda "⚠ Revisa IIC2343: el detalle está bajo cada ramo." sin poder descartarlo.
- **Carga**: no se observaron skeletons ni spinners en las vistas locales (todo es dato ya cargado); el primer carga de la app es la única espera y no muestra estado de carga propio.

## Flujo "Pega tu avance curricular" (Mis ramos · Lista y avance) — muy logrado
- Paso a paso: "1. En **Mi Portal UC**, abre tu **avance curricular** (o la concentración de notas). 2. Selecciona toda la página (Ctrl+A, en el celular "Seleccionar todo") y cópiala. 3. Pégala aquí. No importa que venga texto de más: solo se leen las siglas, notas y estados."
- Bajo el campo: "El texto no se guarda en ninguna parte: solo la sigla, el estado, la nota y el semestre de cada ramo." (buen aviso de privacidad).
- Con texto de ejemplo pegado y "Leer": "Encontré 5 ramos. Revisa el estado de cada uno antes de guardar." + tabla de revisión con columnas Ramo / Estado / Nota / Semestre / Sección, checks de selección, combos de estado (detectó bien Aprobado, **Reprobado**, y "Cursando" con la ayuda "dice en curso"), y "Guardar 5 ramos" / "Volver". Nota: repite la nota como texto doble ("5,2" y arriba "nota 5,2"), ruido para lector de pantalla.
- Checkbox "Poner los ramos que estoy cursando en mi horario de 2026-2 (con la sección elegida)" y aviso "Los ramos que ya tenías y no aparecen aquí se mantienen. Si una sigla ya estaba, se reemplaza por lo nuevo."
- Tras guardar: "Aprobados · 3 ramos · 30 créditos*", "Cursando · 1 ramo · 10 créditos*", "Reprobados (no cuentan) · 1 ramo · 10 créditos*" y nota "* Créditos solo de los ramos que se dictan en 2026-2. Borrar todos". Bien por nombrar explícitamente que los reprobados no cuentan.
- **Bug**: el combo "Tu carrera" queda vacío con placeholder "Se llena sola al pegar tu avance" y "Año de ingreso" sin seleccionar, aunque el pegado detectó la malla. No hay forma de ver/corregir la carrera detectada desde ahí.

## Pantalla 11 · Malla (con datos de ejemplo)
- H3 "Licenciatura en Ciencias de la Ingeniería" (detectada sola), nota de fuente: "Diagrama curricular sugerido · Res. VRA N°089/2021 (mod. junio 2024), con Introducción a la Economía en IV y el Optativo de Biología en II (orden habitual). Columnas = semestre sugerido de la malla."
- Barra "30 de 400 créditos aprobados 8 %" (render bug: "30de 400…aprobados8 %" sin espacios ni separación) + mínimos por tipo: Mínimos 20/110, Fundamentos de Ingeniería 10/60, Major 0/100, Minor 0/50, Formación General 0/60, Teológico 0/10, Filosófico 0/10.
- "Ramos sin ubicar (1). Arrástralos al cuadro que corresponda (Major, Minor, Formación General…) o tócalos y luego toca el cuadro." → buena alternativa táctil al drag.
- Grid I–VIII con ramos, colores por tipo (Formación básica / Cursos de la Licenciatura / Electivos en otra disciplina / Major-Minor-FG), estados ✓ aprobado, **Cursando**, ✗ reprobado · tenue = pendiente; "Esp. de Comp. Fund." y "Vacío" como marcadores.
- Pie: "Lo que ubicas se guarda en este dispositivo (entra con tu correo UC para tenerlo también en tu cuenta)."
- Sensación: es la pantalla más impressive y la más densa; el grid de 8 columnas no cabe en ancho de laptop sin scroll horizontal y el texto de los ramos se corta ("Optativo de Fundamentos de Ciencias o…", "Capstone (Curso Major)").

## Pantalla 12 · Notas 2026-2 (a fondo, con datos de ejemplo)
- Encabezado: H2 "Notas 2026-2" + chip "Solo en este dispositivo" + botones "Traer de Canvas", "Importar Excel", "Descargar Excel" (este último azul, el único resaltado).
- KPIs en fila: "Promedio actual 5,00", "Avance del semestre 30 %", "Créditos inscritos 10", "Créditos aprobados 0", "Promedio final (cerrados) —". **Bug de etiquetas**: los rótulos y valores van pegados ("Promedio actual5,00"), y "Avance del semestre 30 %" con Suma % OK se lee raro.
- Ayuda: "Notas de 1,0 a 7,0 (ej. 5,4). Vacío = pendiente; X = la rendiste y no tiene nota publicada. **Se aprueba con 3,95**. El Excel trae esta hoja con las mismas fórmulas, más tus semestres anteriores (de Mis ramos) para el PPA. Si ya llevas tus notas en un Excel, usa **Importar Excel** para traerlas; las que tus profesores publican en Canvas, con **Traer de Canvas**." (excelente: explica convención X y el origen de los datos).
- "Compárate con los demás": "Mira en qué parte de tu generación está tu PPA y cómo va tu promedio de cada ramo frente al del curso. Es anónimo y voluntario: hay que entrar con tu correo UC." + botón "Entrar con correo UC" → **la comparación es opt-in y está explicada antes de entrar**, buen diseño de privacidad.
- Ficha de ramo "IIC2333 Sistemas Operativos y Redes · 10 cr" con chip de estado ("En curso" / "Aprobado" / "Reprobado" según calcule), campos Profesor, Tipo (Mínimo / …), Grupos (opcional, ej. Cátedra / ej. Laboratorio), tabla Evaluación | % | Nota | Mín. con botones "+" (promedio de varias notas) y "X" (quitar), y "+ Evaluación" / "+ Promedio de notas" ("Una evaluación que es el promedio de varias notas: tú pones el % total y cuántas son").
- Resultado en vivo: Promedio actual, Avance, **Nota mín. necesaria**, Suma % (OK), Nota final calculada, "Para promedio y PPA", Nota oficial, y "Reglas especiales del curso" con placeholder "ej. Examen reprobatorio: necesario ≥ 3,0".
- Prueba 1 (Control 30 % nota 5,0; Examen 70 % vacío): Promedio actual 5,00, Avance 30 %, Nota mín. necesaria **3,50**, Nota final — . Cálculo correcto y responde exactamente a "cuánto necesitas para aprobar".
- Prueba 2 (Examen 1,0): chip "Reprobado", Promedio final 2,20 y el aviso "Una evaluación está bajo su nota mínima: con eso se reprueba el ramo." Muy bien: explica la regla, no solo el número.
- Prueba 3 (Examen 6,0): chip "Aprobado", Nota final 5,7, Créditos aprobados 10, "Para promedio y PPA 5,7". **Bug**: "Nota mín. necesaria: Completo" — palabra suelta que no se entiende (debería ser "—", "ya no aplica" o "no puedes bajar de 3,0"); y "Avance 100 %" aparece solo por llenar una nota, sin cerrar el semestre.

## Estados de vacío y carga (completados)
- **Carga**: al recargar, la app muestra un estado de carga propio: "Cargando ramos…" (una línea, sin skeleton ni barra de progreso). Desaparece solo al cargar los 702 ramos de Ingeniería filtrados.
- **Horario vacío**: "Todavía no agregas ramos." + "Busca un ramo y toca **+ Horario**. Puedes elegir la sección tú o dejar que la app busque las combinaciones sin choques." (buen vacío: enseña el camino).
- **Notas vacío**: "Aquí aparece un bloque por cada ramo que estás cursando. Primero márcalos como **Cursando** en Mis ramos (o pega tu avance curricular)." + botones "Ir a Mis ramos" e "Importar desde Excel". **Hoyo**: en este vacío no aparece "Traer de Canvas", aunque Canvas podría crear los bloques. **Inconsistencia**: acá "Importar desde Excel" y en Notas "Importar Excel".
- **Mis ramos vacío**: "Todavía no tienes ramos guardados."
- **Buscador**: "No encontré ramos con esa búsqueda."
- **Requisitos sin malla**: banner "Carga tus ramos aprobados (pegando tu avance curricular) para ver qué ramos puedes tomar y qué requisito te falta."

## Confirmaciones y borrado
- "Borrar todos" pide confirmación con **dialog nativo del navegador**: "¿Borrar todos tus ramos guardados?" (el click queda bloqueado hasta responder; el diálogo nativo rompe el estilo de la app y no avisa que también se pierde la ubicación en la malla).
- Tras aceptar: ramos, malla y badges desaparecen ("Mis ramos" sin número). Al recargar, nada vuelve: **no quedó dato de ejemplo**. Se quitaron también los dos ramos del horario ("Quitar" sin confirmación, acción irreversible sin deshacer).
- **Bug menor**: el texto pegado en "Pega tu avance curricular" sigue en el campo después de guardar y después de borrar todo; y la búsqueda ("zzzzqqqñññ") persiste al cambiar de vista.

## Vista móvil
- No se pudo emular un ancho de celular en este entorno (sin control de viewport). Evidencia indirecta a favor: los textos dicen "en el celular 'Seleccionar todo'" y los términos prometen la app "instalada en tu celular" (PWA); los controles dicen "tócalos y luego toca el cuadro", así que el drag tiene alternativa táctil.
- Riesgo visto en escritorio de 1280 px: la malla de 8 columnas y el grid de horario M1–M8 se comprimen mucho; en 390 px es casi seguro que la malla exija scroll horizontal y que los chips pegados ("30de 400 créditos") empeoren.

## Funciones que quedan detrás de la cuenta (no auditées por no iniciar sesión)
Perfil y datos, solicitudes de amistad y horarios de amigos, foro (publicar/Responder), reseñas propias y su edición/borrado, "Compárate con los demás" (PPA vs generación y promedio vs curso), importar desde Canvas conectado, malla/horario sincronizados entre dispositivos, ajustes y controles de privacidad/eliminación de cuenta.

# Comparación con GradeHub

## (a) Qué COPIAR igual de Catedrix a GradeHub
1. **Generador de combinaciones sin choque** con orden por objetivo ("Menos ventanas", "Más días libres", "Terminar más temprano", "Empezar más tarde") + checkbox "Permitir choques con ayudantías" y resumen "Libre: martes, viernes · 3 ventanas · de M1 a M6". Es exactamente lo que GradeHub no tiene.
2. **Aviso de choque preciso**: "⚠ 2 choques: Lun M1 (IIC2333 CLAS / IIC2343 CLAS); Mié M1 (…)" — día, bloque y ramos, no un "hay conflictos" genérico.
3. **Prerrequisitos con estado y "en paralelo"**: "Te falta IIC2233 (puede ser en paralelo). Igual puedes agregarlo al horario para planificar." Deja agregar aunque falte el requisito, pero avisa. GradeHub debería copiar esa tolerancia.
4. **Pegar el avance curricular con tabla de revisión** ("Encontré 5 ramos. Revisa el estado de cada uno antes de guardar."), detección de Aprobado/Reprobado/Cursando, y "El texto no se guarda en ninguna parte". Muy superior a "Ramos de mi malla" de GradeHub.
5. **Malla real con fuente citada** (Res. VRA N°089/2021 + modificaciones), créditos por tipo (Mínimos/Fundamentos/Major/Minor/FG/Teológico/Filosófico) y "Ramos sin ubicar (1)" con drag o toque.
6. **Biblioteca de filtros** que un estudiante de verdad usa: Con vacantes, Solo reseñados, Poca carga (≤ 5 h), Sin asistencia en todas las clases, Orden: por sigla / Menos carga primero / Más fácil sacarse buena nota / Más recomendados (OFG).
7. **Convención de estados de nota** explicada en una línea: "Vacío = pendiente; X = la rendiste y no tiene nota publicada. Se aprueba con 3,95."
8. **"Reglas especiales del curso"** ("ej. Examen reprobatorio: necesario ≥ 3,0"): campo libre que absorbe la variabilidad real de ramos.
9. **"Una evaluación está bajo su nota mínima: con eso se reprueba el ramo."** — explica la regla, no solo el número.
10. **Aviso de privacidad de la comparación antes de entrar**: "Es anónimo y voluntario: hay que entrar con tu correo UC." y en reseñas "Es anónima: nadie ve quién respondió, y solo se publican resúmenes" + "cada estudiante reseña una vez cada ramo y puede editar o borrar lo suyo".
11. **Vacios que enseñan el camino** ("Busca un ramo y toca + Horario", "Primero márcalos como Cursando en Mis ramos") y estados de carga con texto.
12. **Pie de página de sugerencias** con tipo (Sugerencia / Error encontrado / Consulta) que abre el correo redactado: cero fricción para recibir feedback.
13. **Página SEO de todos los ramos** (4517 ramos) que trae tráfico desde Google.

## (b) Qué GradeHub ya hace MEJOR
1. **Login real institucional**: Microsoft/SSO UC. Catedrix pide correo + código propio o contraseña propia, más fricción y más superficie de credenciales.
2. **Pautas precargadas y ponderaciones compartidas ("consenso")**: Catedrix no tiene pautas; cada ramo empieza en blanco y hay que escribir evaluaciones y % a mano.
3. **Calculadora puntaje → nota** y simulador de semestre completo: Catedrix calcula nota final y "nota mín. necesaria" por ramo, pero no simula el semestre entero ni traduce puntajes.
4. **Modo oscuro** (Catedrix es solo claro).
5. **Onboarding de 4 pasos**: Catedrix no tiene tour ni primera vez guiada; se entiende todo explorando.
6. **Estadísticas e historial entre semestres**: Catedrix muestra créditos y avance del semestre, pero no series históricas de promedio.
7. **Conector MCP / automatización**: Catedrix no expone nada parecido.
8. **Cierre de semestre explícito**: Catedrix marca "Aprobado/Cursando" y "Promedio final (cerrados)" de forma más clara que GradeHub en ese punto, pero GradeHub gana en todo lo demás del cálculo.
9. **Rendimiento percibido**: Catedrix carga 702+ ramos con un solo "Cargando ramos…" sin progreso; GradeHub con 5 universidades es más liviano (aunque su catálogo es su punto débil).

## (c) Qué GradeHub debería MEJORAR o AGREGAR
**Agregar (copiando el patrón de Catedrix):** horario y combinaciones sin choque con orden por objetivos; buscador de ramos por sigla/nombre/profesor con requisitos y vacantes; reseñas anónimas con resúmenes y carga/evaluaciones/asistencia; prerrequisitos y "puede ser en paralelo" aplicados al horario; malla por semestres con créditos por tipo y arrastrar para ubicar; foro de preguntas por ramo; amigos y sus horarios superpuestos; importación desde Canvas y descarga a Excel con fórmulas; PPA comparado anónimo y opt-in; filtros de carga y asistencia; página pública por ramo para SEO.
**Mejorar en lo suyo:** catálogo (pasar de 5 universidades y arreglar "Ramos de mi malla" con un importador pegable tipo avance curricular); cierre de semestre (hacerlo un botón explícito con consecuencia visible, no un estado ambiguo); secciones que cargan para siempre (estado de error + reintento, como Catedrix con sus vacíos); explicar cada regla en una línea ("se aprueba con 3,95", "una evaluación bajo su mínima reprueba").

# Top 10 problemas de Catedrix
1. **Éxito con estilo de error**: "Listo: 5 ramos guardados en este dispositivo." usa el banner rojo de error (duda sobre si funcionó).
2. **Contradicción de privacidad**: footer "Tus ramos y tu horario se guardan solo en este dispositivo" convive con "Quedan guardados en tu cuenta… para compararte con tu generación". El usuario no sabe dónde están sus datos.
3. **Sin política de privacidad** (solo Términos de uso): nada sobre correo UC, notas, token de Canvas, retención ni borrado.
4. **"Nota mín. necesaria: Completo"**: palabra suelta incomprensible cuando ya no hay margen.
5. **Badges pegados y plural roto**: "Mis ramos5", "Notas1", "30de 400 créditos aprobados8 %", "1 ramos" / "0 ramos", "2 secciones" junto a "1 sección".
6. **Select de sección deshabilitado sin explicación** y botón "Elegida" deshabilitado; no hay forma de cambiar de sección si ya hay una elegida sin quitar el ramo.
7. **Confirmación nativa del navegador** para "Borrar todos" (rompe el diseño, no explica el alcance) y "Quitar" de un ramo del horario sin confirmación ni deshacer.
8. **Datos pegados y no limpiados**: el texto pegado queda en el campo tras guardar/borrar y la búsqueda queda entre vistas; tampoco hay botón "limpiar" en "No encontré ramos con esa búsqueda."
9. **Nomenclatura y tipografía de datos**: "(en paralelo)", "CLAS"/"AYU", "sala SIN SALA", profesores "Ruz Cristian" (nombre y apellido invertidos), "Ramos sin ubicar", "Esp. de Comp. Fund." truncado.
10. **Densidad sin onboarding**: la malla y el horario de M1–M8 se comprimen en 1280 px, no hay tour, y dos vistas sin cuenta (Comunidad y Mi perfil) son el mismo muro con el mismo CTA; en móvil es de alto riesgo.

# Veredicto
Catedrix es la mejor idea de producto para la UC que vi: ataca el dolor real (armar horario sin choques y saber qué ramos puedes tomar) con datos oficiales, y su flujo de pegar el avance curricular y su malla con créditos por tipo son referencia de diseño. Su debilidad es de ejecución y confianza: lenguaje de datos descuidado (badges pegados, plurales, invertidos, "Completo"), una capa de privacidad contradictoria y sin política, colores que confunden éxito con error, confirmaciones nativas y controles deshabilitados sin explicación, y todo el valor social (reseñas, foro, amigos, comparación) tras un login propio sin SSO que además no muestra el formulario antes de pedir la cuenta. GradeHub gana en cálculo, pautas, consenso, SSO y pulido de modo/onboarding; Catedrix gana en catálogo, horario, requisitos, malla y comunidad. Para GradeHub, las tres jugadas de mayor retorno: (1) horario + combinaciones sin choque, (2) importación pegable del avance curricular con malla y requisitos, (3) reseñas anónimas con resúmenes y carga/evaluaciones.
