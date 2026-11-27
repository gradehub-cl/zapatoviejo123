# Auditoría UX GradeHub (gradehub.cl, producción) — cuenta gpruebahark3@prueba.cl / "Diego Prueba"

## 1. Auth / Sign up — https://gradehub.cl/ (pantalla `screen-auth`)
**Qué se ve:** logo, H1 "Mejor que tu Excel.", subtítulo "Guarda tus notas y revísalas desde cualquier dispositivo.", bloque de stats ("2.222 ESTUDIANTES / 9.178 ramos / 39.025 notas"), botones "Continuar con Apple" y "Continuar con Google", divisor "o con tu correo", campos CORREO ELECTRÓNICO, CONTRASEÑA (con botón "Mostrar contraseña"), REPETIR CONTRASEÑA, botón "Crear cuenta", link "¿Ya tienes cuenta? Inicia sesión", texto legal ("Al continuar aceptas los términos y la privacidad, y declaras tener 14 años o más."), footer con Preguntas frecuentes / Calculadora de notas / Términos / Privacidad / botón "Soy profesor particular". La landing ya abre en modo **Sign up** (muestra "Repetir contraseña"), no en login.
- **No hay campo de nombre en el sign-up**: el nombre se pide recién en el onboarding (Paso 1). Coherente, pero el label "CORREO ELECTRÓNICO" hace que uno espere un email institucional.
- **Regla de contraseña no declarada en el formulario**: no hay ayuda tipo "mínimo 8 caracteres" antes de enviar. Solo aparece el error tras clic en "Crear cuenta": texto exacto `La contraseña debe tener al menos 8 caracteres.` (alert `id=auth-error`).
- Al presionar "Crear cuenta" el botón pasa a `Cargando...` (disabled). No muestra progreso adicional ni "Creamos tu cuenta…". Sin email de verificación: deja logueado directo en onboarding.
- El botón de mostrar/ocultar contraseña no tiene `aria-pressed` ni estado visible en el árbol de accesibilidad.

## 2. Onboarding Paso 1 de 4 — "¿Cómo te llamas?"
Campos NOMBRE / APELLIDO, bloque "AÑO DE INGRESO A LA UNIVERSIDAD" con ruleta (stepper `ob-generacion-ruleta`, botones "Anterior"/"Siguiente"), estado `Elige tu año de ingreso para calcular el semestre.` y luego "Vas en tu N.º semestre." con botón "Cambiar".
- **Bug/UX**: el botón "atrás" del Paso 1 dice **"Cerrar sesión"** (no "Atrás"): un gesto de retroceder cierra la sesión. En el Paso 2+ pasa a "Atrás" (inconsistencia de etiqueta).
- **Bug**: la ruleta de año **no responde al clic directo sobre el año** (clic en "2025" no cambia la selección; hay que usar las flechas "Anterior"/"Siguiente"). El `stepper` expone value pero `setValue` no lo movía (quedó en 2026 la primera vez).
- **No直觉**: piden año de ingreso, no semestre; el semestre se "calcula" y hay que confiar. Con ingreso 2025 → "Vas en tu 4.º semestre." (correcto para 2.º año, 2026-2). No se muestra el cálculo ni se puede elegir semestre directamente desde este paso (solo "Cambiar" después).
- El listado de años (2026…2000) aparece en el texto de la página pero no como nodos del árbol de accesibilidad: malo para lectores de pantalla.

## 3. Onboarding Paso 2 de 4 — "Diego, ¿cuál es tu universidad?"
"Elige dónde estudias. Podrás agregar tus ramos a mano." Grid con 5: UCH Universidad de Chile, UC Pontificia Universidad Católica, **UAI Universidad Adolfo Ibáñez**, UA Universidad de los Andes, UDD Universidad del Desarrollo.
- La UAI **sí existe** (no hizo falta otra universidad).
- **Limitado**: solo 5 universidades, sin buscador ni "Otra universidad": un alumno de la UNAB, UTFSM, PUCV, U. de Chile del resto del país queda fuera sin vía de escape visible.
- Buen detalle: usa el nombre de pila en el título ("Diego, ¿cuál es tu universidad?").
- "Continuar" deshabilitado hasta elegir. Buena señal de estado.

## 4. Onboarding Paso 3 de 4 — "¿Qué estudias?"
Buscador "Buscar carrera" + grid de 26 carreras de la UAI (incluye "Ingeniería Comercial (Administración de Empresas)" e "Ingeniería Comercial (Economía)", dobles títulos, bachilleratos).
- El filtro funciona: al escribir "comercial" quedan 7 opciones y aparece botón **"Usar «comercial»"** (crear carrera a mano). Muy bien.

## 5. Onboarding Paso 4 de 4 — "Elige tus ramos"
Texto exacto: `No tenemos ramos sugeridos para este semestre. Busca los de tu horario o agrégalos a mano.` Campos "TU SEMESTRE", "BUSCAR OTRO RAMO", botón "¿No aparece? Agregar un ramo a mano", botón principal **"Continuar sin ramos"**.
- **Bug (contradicción)**: pese a "No tenemos ramos sugeridos para este semestre" y a pulsar "Continuar sin ramos", la app **agregó 6 ramos automáticamente** al home: Psicología Social, Organización Industrial, Contabilidad, Marketing, Taller de Expresión Oral I, Deporte IV, y el modal dice "6 ramos agregados". O sea el estado vacío del paso 4 es falso/la sugerencia sí existía, y el botón "Continuar sin ramos" no evita que se agreguen.
- "TU SEMESTRE" aparece como texto vacío en el árbol (no se ve el valor 2026-2 en ese paso).

## 6. Home tras onboarding (`screen-home`)
Header "GradeHub" + menú "Herramientas" (pop-up). Saludo: `Así va tu semestre, Diego`. Card PROMEDIO GENERAL · 2026-2 · 6 ramos, `Abre un ramo para ingresar tu primera nota.`, `6 pendientes`. "Mis ramos" con botón "Agregar ramo" y menú de orden (`Ordenar ramos. Ahora: Manual`). Cada ramo: nombre, "Sin evaluaciones", y botón "Mantén presionado para mover X". Banner "APOYO ¿Buscas apoyo en un ramo? Profes, academias y apps para tus ramos. Explorar apoyo". Botón "Simular el semestre completo". Footer "Por estudiantes, para estudiantes. GradeHub · Chile · © 2026 Martín Sotomayor y Lucas Irarrázaval".
- **Bug de texto**: saludo con coma pegada: `Así va tu semestre,Diego` (falta espacio en el HTML/AX).
- **Bug de formato**: "2026-2" y "6 ramos" pegados en la sublínea del promedio (`2026-26 ramos`).
- Modal post-onboarding: título "Ahora, las evaluaciones", "6 ramos agregados", "Agrega las evaluaciones y sus porcentajes en cada ramo.", botón "Ver mis ramos".

## 7. Ficha de ramo (`screen-ramo`) — Contabilidad
Header: nombre del ramo + "10 créditos" (pegados: texto AX `Contabilidad10 créditos`), botón "Volver", menú "Opciones del ramo" (`ramo-mas`). Chip "Sección 2", "Reportada por 3 estudiantes, sin confirmar", promedio grande, "Necesitas 4,0 en lo pendiente para aprobar", switch "Notas sombra" (on por defecto), botones "Simular" y "Calificar", bloque "Faltas / Anota cada clase a la que no fuiste." con − 0 +, categorías de evaluación colapsables (C: "20% · promedio de 6 · 6/6 ingresadas", P: "80% del ramo"), filas por evaluación con botones de accesibilidad excelentes (`C 1: necesitas 4,0. Toca para anotar la nota real`, `Fecha y detalle de C 1`), "+ Agregar nota", "Editar", "Quitar la última", "Horario / Agrega los días y las horas de tus clases", botón "Editar evaluaciones".
- **Bug (flash de estado vacío)**: al abrir el ramo aparece primero "Todavía no tenemos las ponderaciones de este ramo / Ármalas con el programa del curso… / Armar mis ponderaciones" y después de ~1 s se reemplaza por las ponderaciones comunitarias ya cargadas. El estado vacío se muestra antes de consultar.
- **Bug**: el home dice "Sin evaluaciones" para un ramo que sí tiene 9 evaluaciones precargadas por la comunidad.
- **Bug (sincronización de profesor)**: al guardar la sección 2 aparece toast `Este ramo o sección aún no está sincronizado. Espera un momento y reintenta.` y un botón "Reintentar" que reemplaza visualmente a "Calificar" en una fila de botón primario, fuera del bloque del profesor. Al pulsar "Reintentar" el botón **desaparece sin ningún mensaje**: no se sabe si falló, si no existe el profesor o si ya no hay nada que hacer.
- **Muy bien**: foco y cálculo se actualizan al instante; tras anotar una nota el foco salta a la siguiente evaluación pendiente; toast `Vas 5,1 · buen margen en lo pendiente`; `Promedio general 5,5 → 5,6`; `Con estas notas ya alcanzas para aprobar.`; al completar todo: `✓ Aprobado`, `Vas 5,3 · ramo completamente evaluado`.
- **Detalles**: la fila del profesor desaparece por completo cuando no se encuentra (no queda "Sin profesor" ni un camino alternativo claro). El switch "Notas sombra" y el chip de estado desaparecen cuando el ramo ya está 100% evaluado.
- **Bug de texto**: `Va aprobando · falta 0%Notas sombra` (dos textos pegados).

## 8. Menú "Opciones del ramo"
Solo 3 ítems: **Editar ramo / Editar evaluaciones / Eliminar ramo**. No hay "Compartir pauta al consenso" ni "Ver programa/pauta" en la ficha (la pauta aparece solo como ponderaciones). No hay "Duplicar ramo" ni "Archivar".

## 9. Modal "Editar ramo"
Campos: NOMBRE DEL RAMO, CRÉDITOS (SCT), PROMEDIO ACADÉMICO (select: Incluido / Educación Física / Extraprogramática / Convalidada), SECCIÓN, PROFESOR (botón deshabilitado `Sin profesor` + `Agrega y guarda la sección para calificar`), checkbox "Llevar la cuenta de mis faltas (aparece en la ficha del ramo)" → al activarlo aparece "MÁXIMO DE FALTAS (opcional)", y COLOR. Botones Cancelar / Guardar.
- Buen Progressive disclosure. **No直觉**: "COLOR" queda pegado al label del checkbox en el árbol (`…ficha del ramo)COLOR`), y no se ve un selector de color accesible con nombre.

## 10. "Calificar profesor" (se abrió y se canceló, nada publicado)
Paso A: título "Calificar profesor", campo "NOMBRE, SEGUNDO NOMBRE Y APELLIDO" (placeholder `Ej.: María José Pérez`), ayuda "Puedes seguir sin el segundo nombre si no lo sabes.", botones Cancelar / Continuar, y link "Calificar solo el ramo".
Paso B: repite el nombre con botón "Cambiar", pregunta "¿Cómo era como profe?" con 5 radios ("1 de 5"…"5 de 5", se ven como estrellas), botones Cancelar / Guardar.
- **Se canceló en el paso B** para no publicar (límite de la auditoría). No hay paso de comentario/texto libre ni categorías (exigencia, claridad, etc.): una sola estrella 1-5 se queda corto.
- **Riesgo de datos**: pide el nombre completo del profesor sin autocompletar desde la sección ya guardada, aunque el ramo ya tenía sección.

## 11. Simulador por ramo (modal "SIMULADOR / Contabilidad · Sección 2")
Texto: "Escribe notas hipotéticas y mira cómo quedaría tu promedio. No se guardan hasta que confirmes." Muestra PROMEDIO PROYECTADO, "Tu promedio actual: 5,3", "Tu meta" con − / + (`4,0` → `4,1`) y "Ya tienes el 4,1", lista EVALUACIONES con chips.
- **🔴 Bug /死角**: cuando el ramo ya está 100% evaluado, las notas aparecen como chips de solo texto (no hay campos editables), así que **no se puede simular nada** y "Guardar como reales" queda permanentemente deshabilitado. El simulador queda inservible justo en el caso más útil (probar escenarios "¿y si me va mal en la última?"). Debería permitir editar/copiar las notas en la simulación.

## 12. "Editar evaluaciones" (la "pauta")
Texto: "Escribe cada evaluación con su porcentaje. Puedes guardar aunque falten algunas." Chip de control `✓ 100 / 100% · ponderaciones listas`. Por evaluación: combo "Nombre de la evaluación" (C, P1, P2, P3), "Peso de X" (%), menú "Opciones de X", y para C "Varias notas · esperas [6]".
- "Reglas de esta evaluación" (details): "Cantidad de notas que se pueden borrar" (+ "Se descartan las más bajas y siempre queda al menos una nota que cuenta."), "Nota mínima", "Tope de la nota final" (+ "Si quedas bajo el mínimo, tu nota final no supera este tope. Deja ambos campos vacíos si no aplica."), "Puntaje total, si te la entregan en puntos", "Exigencia (%)" (+ "Con puntaje total anotas los puntos que sacaste y te los pasamos a nota. Sin exigencia usamos la del ramo.").
- "Requisitos que combinan evaluaciones": "Para cuando el programa exige un mínimo sobre varias evaluaciones juntas, o aprobar cada parte por separado. El promedio usa los pesos de arriba." + botón "Agregar requisito".
- "Eximición del examen": checkbox "El programa permite eximirse del examen".
- Botones Cancelar / Guardar. **Muy bien** para ramos chilenos (descarte de notas, eximición, puntos a nota). **Bug de texto**: `…si no aplica.Puntaje total, si te la entregan en puntos` (falta espacio/párrafo).

## 13. Home actualizado tras ingresar notas
Promedio `5,3`, sublínea `2026-26 ramos · 10 créditos` (**bug: falta separador entre "2026-2" y "6 ramos"**), tags `1 aprobado5 pendientes` (**bug: falta espacio**), "Última nota" con `P3 Contabilidad 4,3 Nota`, y el ramo Contabilidad ahora muestra `100%` y `5,3`.
## Agregar ramo (modal) — https://gradehub.cl/
- Campo "NOMBRE DEL RAMO · lo buscamos en la malla UAI", placeholder "Ej.: Microeconomía I".
- CON BÚSQUEDA VACÍA ya muestra resultados, y son de otra carrera: "Civilización Contemporánea 1° semestre", "Escritura Argumentativa 2° semestre · con programa", "Destrezas Forenses fuera de malla", "Historia del Derecho fuera de malla", "Sistema Jurídico fuera de malla", "Derecho Constitucional: El Estado fuera de malla" (Derecho, no Ingeniería Comercial).
- Buscando "Microeconomía": "Microeconomía 3° semestre", "Introducción a la Microeconomía 1° semestre · con programa", "Microeconomía Intermedia fuera de malla".
- Tocar un resultado AGREGA el ramo de inmediato (toast "Ramo agregado") y cierra el modal; el botón negro "Agregar ramo" queda redundante/inútil (nunca se usa). Al tocar el resultado el botón "Agregar ramo" desaparece del DOM.
- Bug resumen inicio: "2026-26 ramos · 10 créditos" -> al agregar uno pasa a "2026-27 ramos · 10 créditos". Es "2026-2" + conteo sin separador. Los créditos no se actualizan (sigue 10 créditos con 7 ramos).

## Ramo nuevo sin ponderaciones (Microeconomía)
- Estado inicial muestra DOS tarjetas contradictorias a la vez: "Ponderaciones sugeridas · Compárala con el programa de tu curso antes de usarla · Reportada por 1 estudiante, sin confirmar" (con Ahora no / Usar estas ponderaciones) Y "Todavía no tenemos las ponderaciones de este ramo · Ármalas con el programa del curso" (Armar mis ponderaciones).
- "Usar estas ponderaciones" crea Control 15% (3 notas), Prueba 60% (3 notas), Examen 25% y dispara "Editar evaluaciones" enfocado.
- "Notas sombra" (switch prendido por defecto) muestra nota especular en cada pendiente y slider "¿Cuánto quieres necesitar en el examen?" 1,0–7,0.

## Ingreso de notas: bug de foco/pérdida de notas (reproducido 3 veces)
Pasos: abrir ramo con pendientes -> tocar evaluación pendiente -> escribir nota (ej. 5.5) -> presionar Tab.
- A veces guarda y pasa al siguiente pendiente (bien), pero al segundo Tab el foco salta a "Agregar una nota en Control" / "Editar evaluación Control" y lo tipeado se PIERDE sin aviso. El valor queda pendiente.
- Con clic + tipeo + Return siempre guarda. Conclusión: el manejo de re-render del input al guardar hace que la entrada rápida (Tab encadenado) pierda notas.
- Detalle: el campo acepta punto ("5.2") y normaliza a coma ("5,2"); sin coma el valor no se comitea hasta Return o blur.

## Microeconomía final
- 6,0 · "Aprobado" · "Vas 6,0 · ramo completamente evaluado" · "Promedio general 5,6 → 5,6" (eco no-op).
- Botones por ramo: Simular, Calificar, Agregar nota, Editar, Quitar la última, Editar evaluaciones, Horario/Agregar bloque, Opciones del ramo (•••).
## Simular el semestre (Inicio → "Simular el semestre completo")
- Modal "Simular el semestre · Cambia la nota final de cada ramo y mira tu promedio. No se guarda." PROMEDIO PROYECTADO 5,64; al simular muestra "↓ 0,21 vs 5,64 actual" y botón "Volver al real" por ramo; "Reiniciar todo" y "Listo". Funciona bien.
- Detalle: tras poner nota simulada el ramo sigue diciendo "Sin evaluaciones" debajo.
- Resumen inicio ahora: "Promedio simple porque falta el crédito de Microeconomía. Si lo pones en Editar ramo, se calcula ponderado por créditos." (buen copy) pero "2026-27 ramos" sigue mal.

## Agenda
- Estados: "Qué se viene / Todo al día", tabs Evaluaciones | Horario, botón "Calendario" (tooltip "Agregar evaluaciones al calendario").
- Evaluaciones: grupo "Ya rendidas 16" con "Ver todas"/"Ver última"; cada fila dice "Sin fecha · X% del ramo · [evaluación] · [ramo] · nota".
- BUG: ponderaciones con decimales sin formato es: "3.33% del ramo C 1 Contabilidad 5,1" (punto decimal y 2 decimales, debiera ser "3,3%").
- BUG/contradicción: la evaluación ya rendida con nota aparece como "Es la última evaluación pendiente con fecha" y "TU REFERENCIA Nota registrada: 5,9 / DESPUÉS Nada más agendado".
- Al existir evaluaciones desaparece el botón "Agregar evaluación" (el estado vacío lo ofrecía); para fechar hay que ir al ramo o usar Calendario.
- Calendario → modal "Conecta GradeHub y tu calendario · Todavía no tienes fechas. Tráelas desde tu calendario · IMPORTAR ARCHIVO .ICS · Desde Apple, Google u Outlook. Revisas cada fecha antes de agregarla." Botones "Importar fechas" / "Cerrar". (No se importó nada: no se conectan cuentas.)
- Horario: "Arma tu horario · Agrega los días y las horas de tus clases" + "Agregar clase" → modal "¿De qué ramo es la clase?" (lista de ramos) → "Horario de [ramo] · Se repite cada semana. Horas de Chile." con Días (Lun..Dom), Inicio, Fin, Sala (opcional), Tipo (opcional, combo: Cátedra, ayudantía…), switch "Voy a esta clase", "Copiar bloque", "Quitar", "+ Agregar bloque", Cancelar / Guardar horario.
- BUG: al guardar sin horas aparece el globito nativo del navegador en INGLÉS: "Please fill out this field." (sin validación propia en español).
- UX: hora en formato 12 h con AM/PM ("10:15 AM") aunque dice "Horas de Chile"; el segmento AM/PM no se completa fácil y queda "--" (bloque sin AM/PM igual se guardó y muestra "de 10:15 a 11:30").
- Tras guardar: toast "Horario guardado", vista "Semana completa" con bloque "Microeconomía K201", header de días "Lun 23 … Jue 26 (hoy)", "Elegir día", "Editar horario" y banner "6 ramos sin horario / Completar".

---

## Turns 80–127 (segunda parte de la auditoría) — gradehub.cl, cuenta gpruebahark3@prueba.cl


### Estadísticas → Historial → "+ Semestre anterior"
- Diálogo "Agregar un semestre anterior": año 2017–2026, período 1°/2°/Verano, botón "BUSCA TUS RAMOS".
- Resultados mezclan carreras de otras facultades y traen duplicados: "Introducción a la Macroeconomía" vs "Introducción a la Macro economía".
- "Continuar" deshabilitado hasta elegir ramo (correcto).
- Segundo paso "Notas finales de 2025-1": dice "Pon al menos una nota para guardar el semestre." pero **"Guardar semestre" aparece habilitado sin ninguna nota** (bug de validación).
- Al guardar: toast "2025-1 agregado al historial"; delta "↑ 0,14vs. 2025-1" (falta espacio); "Promedio por semestre5,6" (concatenación); "2025-1 1 ramo 5,5"; "PPA estimado del historial: —. Revisa las exclusiones en Editar ramo: los ramos sin marcar se incluyen. Se requieren créditos conocidos."
- Tras guardar, el rango del gráfico queda en "Semestre" y el eje sigue mostrando "26 nov" en ambos extremos.

### Menú "Herramientas" → Calculadora de nota
- Único ítem del menú. Modal correcto: 32/50 → "Tu nota 4,8"; "Con 50 % de exigencia, el 4,0 está en 25,00 de 50,00 puntos."; "Más opciones de escala" (NOTA MÍNIMA / APROBACIÓN / MÁXIMA, "Truncar en vez de redondear"), tabla puntaje→nota, "GUARDAR EN UN RAMO", "EVALUACIÓN O CASILLA" deshabilitado con "Elige un ramo primero", "Guardar como nota" disabled. Se cerró sin guardar. Bien logrado.

### Menú "Ordenar ramos" (Manual / Por nota / A-Z)
- Funciona. Al elegir un orden automático desaparece el control "Mantén presionado para mover" (correcto), pero **no hay aviso de que el reordenamiento manual quedó inactivo**.

### Inicio → "Explorar apoyo"
- Diálogo con nombre accesible **"Ventana"** (bug de a11y: falta aria-label/role adequado). Heading "Encuentra tu apoyo", filtros Todos/Clases/Material/Laboratorios/Plataformas y apps/Otro.
- Estado "Buscando perfiles…" → "1 resultado" (MentorIA, "Sin valoraciones").
- Con filtro "Clases": "No encontramos perfiles con estos filtros." **más** un heading "Todos" desactualizado y "Prueba con otro ramo o tipo de apoyo." → doble empty state contradictorio.

### Ficha de ramo (Contabilidad) y menú "Opciones del ramo"
- Menú solo ofrece: Editar ramo / Editar evaluaciones / Eliminar ramo. **No existe ninguna entrada para compartir pauta ni consenso** en la ficha (el consenso aparece solo en Ajustes → Datos y cuenta como switch anónimo).
- Modal "Editar evaluaciones": "✓ 100 / 100% · ponderaciones listas", "Varias notas · esperas", "Reglas de esta evaluación" (descarte, nota mínima, tope, puntaje total, exigencia), "Requisitos que combinan evaluaciones", "Eximición del examen". Bug de texto: "…si no aplica.Puntaje total, si te la entregan en puntos" (falta salto/espacio). Se canceló sin guardar.

### Perfil
- Diego / Ingeniería Comercial (Administración de Empresas) / UAI · 4.º semestre / gpruebahark3@prueba.cl. **Ojo: cuenta creada como 2.º año pero el perfil dice "4.º semestre"** (inconsistente con 2.º año).
- Secciones: TU SEMESTRE (Universidad y carrera, Calendario, Archivar semestre), HERRAMIENTAS (Calculadora de nota), LA APP (Apariencia, Agentes conectados, Sugerencias y comentarios), TU CUENTA (Datos y cuenta, Ofrecer clases o material), Cerrar sesión.

### Ajustes (diálogo con nav + detalle + "Buscar en Ajustes")
- Nav: TU CUENTA (Perfil, Agentes conectados, Datos y cuenta, Apoyo), TU SEMESTRE (Información académica, Calendario), LA APP (Apariencia, Sugerencias y comentarios).
- **La nav de Ajustes no coincide con la de Perfil**: en Ajustes faltan "Archivar semestre", "Calculadora de nota" y "Ofrecer clases o material"; en Perfil no existen "Apoyo" e "Información académica". Doble mapa de navegación para lo mismo.
- Información académica: universidades disponibles solo UChile / UC / UAI / UANDES / UDD. "Ramos de mi malla" → toast "Aún no tenemos la malla de tu carrera — agrega tus ramos con el botón +" (gap de data UAI/IC).
- Apariencia: Modo Sistema/Claro/Oscuro, 6 acentos, 3 fondos, "Se guarda al elegir." (sin toast). Oscuro aplicado al instante; se revisó Inicio en oscuro y se volvió a Claro.
- **Agentes conectados (MCP): bug — "Crear URL de conexión" crea la conexión aunque se deje el nombre vacío** (aparece como "Agente") y muestra la credencial en texto plano. Lista: "AgenteConectado desde 26 nov 2026, 10:41 p. m." (sin espacio), ÚLTIMO USO "Aún no se ha usado", VENCE "24 feb 2027, 10:41 p. m.". Confirm "¿Desconectar Agente?" → toast "Agente desconectado". Label accesible del campo de nombre es "1. PREGÚNTALE A TU AGENTE DÓNDE CONECTARLO 2. PONLE UN NOMBRE A LA CONEXIÓN" (mal asociado).
- Datos y cuenta: "Exportar mis datos" → toast "✓ Datos copiados al portapapeles"; "Importar datos"; switches "Compartir mis ponderaciones en forma anónima" (on) y "Usar mis notas para elegir anuncios" (on); COMPARTIDO CON PROFESORES; PROFESORES BLOQUEADOS ("Denunciar o bloquear", gradehub.app@gmail.com); ZONA SENSIBLE con "Eliminar mi cuenta" y "Reiniciar app". Confirm de borrado: "Eliminar tu cuenta / Se borran tus 7 ramos con 16 notas, tu perfil y tu cuenta. En este dispositivo y en la nube. Esto no se puede deshacer." → **se canceló** (no se borró nada). Links a /terminos.html y /privacidad.html.
- Sugerencias y comentarios: combo TIPO DE COMENTARIO (Tengo una sugerencia / Encontré un problema / Otro comentario), "CUÉNTANOS" con contador "0 / 2000". Con 2 caracteres y "Enviar comentario" → toast rojo "Escribe al menos 3 caracteres" y el helper pasa a "te falta 1 carácter para enviarlo" (validación correcta, **no se envió nada**).
- **Apoyo: BUG — queda permanentemente en "Revisando tu acceso…"**, sin spinner, sin error ni reintento. Reproducido 2× (también desde "Ofrecer clases o material" de Perfil, que abre exactamente ese mismo diálogo). Sección inutilizable.
- Calendario: URL de suscripción (token opaco), "Copiar URL", "Generar una nueva", "En Google Calendar: Otros calendarios · + · Desde URL.", aviso "Quien tenga esta URL ve tus evaluaciones y fechas. Tus notas no salen nunca.", "Importar archivo .ics".

### Archivar semestre
- Diálogo "Archivar 2026-2": "Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo." Cada ramo con "Calculada: X" o "Falta: Revisa las ponderaciones y las notas de este ramo" + botón "Completar evaluaciones" + campo "Nota final oficial del portal de tu universidad". Botones Cancelar / Archivar semestre.
- Bug de texto repetido 7×: "Nota final oficialdel portal de tu universidad" (falta espacio). Orden de ramos arbitrario (Microeconomía al final). Sin botón de cierre (X) ni escape visible en el header. **Se canceló** para no alterar el estado.

### Persistencia
- Tras reload completo: sigue la sesión, los 7 ramos, las notas (5,6 / 6,0 / 5,3), el historial 2025-1 y el horario. OK.
- Detalle tras reload: en Estadísticas, "Cómo vas respecto a los demás" queda sin cuerpo (el empty state "Aún no hay suficientes datos para compararte con los demás." no se renderiza hasta después).

### Flujos sociales / límites (no publicados)
- Búsquedas en el texto de Inicio, Estadísticas, Agenda y Perfil para "tutor", "aviso", "unirse", "calificar", "consenso", "compartir", "profesor": **sin coincidencias en las pantallas principales**. En este build no hay entrada visible a "avisos de tutores", "unirse a clases" ni "calificar profesores" para una cuenta nueva de UAI; por lo tanto no se publicó nada.
- Las únicas superficies con posible publicación son: "Explorar apoyo" (solo lectura de perfiles), "Ofrecer clases o material" / Ajustes → Apoyo (atasado en "Revisando tu acceso…", imposible publicar) y "Compartir mis ponderaciones en forma anónima" (switch, **se dejó como estaba, sin activar/desactivar para no aportar al consenso**).
- "Editar evaluaciones" y "Completar evaluaciones" permiten compartir pauta al consenso; se abrió y se canceló sin guardar.

### Cerrar sesión / volver a iniciar sesión (final)
- "Cerrar sesión" en Perfil **cierra la sesión de inmediato, sin confirmación** (riesgo: pérdida de contexto; no hay toast "Sesión cerrada").
- Tras cerrar sesión, la app aterriza en la pantalla de auth **en modo "Crear cuenta"** (muestra "REPETIR CONTRASEÑA" y "Crear cuenta"), no en "Iniciar sesión". Un usuario que acaba de cerrar sesión debe tocar "¿Ya tienes cuenta? Inicia sesión". Bug de estado.
- Contadores de la pantalla de auth: estado de carga "—ESTUDIANTES / —RAMOS / —NOTAS" (sin espacio y con guion suelto) → al cargar "2.222ESTUDIANTES / 9.178RAMOS / 39.025NOTAS" en el árbol de accesibilidad.
- Botón "Iniciar sesión" pasa a **"Cargando..."** deshabilitado (buen estado de carga) y luego carga Inicio completo: promedio 5,6, 7 ramos, notas, historial 2025-1, horario. Login con credenciales guardadas OK.
- Nota de matiz para el reporte: varias concatenaciones ("Así va tu semestre,Diego", "2026-27 ramos", "2 aprobados5 pendientes", "Peso evaluado100%", "MicroeconomíaK201", "Promedio por semestre5,6") se ven bien visualmente porque son bloques separados, pero **en el árbol de accesibilidad / lectores de pantalla se leen pegadas**: son bugs de semántica y espaciado para tecnología asistiva, y delatan markup sin separación.
