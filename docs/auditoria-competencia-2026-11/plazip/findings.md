# Auditoría UX Plazip (plazip.cl) — 2026-11-26

## Landing — https://plazip.cl/
Título de pestaña: "Plazip — Planificador de mallas curriculares".

Header: logo Plazip (link "Ir al inicio"), botón "Tema actual: claro. Cambiar a tema oscuro" (toggle), botón "Entrar con Google", botón "Modo Invitado".

Modal al entrar (Radix dialog, se muestra en cada visita):
- "PLAZIP V1.6" / "Edita tu malla en conjunto"
- "Edita tu malla en vivo con otras personas: comparte el enlace para editar en conjunto y vean al instante los cambios, cursores y la casilla que cada uno tiene seleccionada."
- "Con la misma malla abierta en dos pestañas, lo que haces en una aparece al tiro en la otra, sin pisarse."
- "Y 5 novedades más en el historial completo." + link "Ver novedades" + botones "¡Entendido!" y "Cerrar".

Hero: eyebrow "PLAZIP · PLANIFICADOR DE MALLAS CURRICULARES"; H1 "Explora la malla de tu carrera" (la palabra "malla" subrayada con trazos de colores); copy: "Plazip es un planificador de mallas curriculares gratuito: explora el plan de estudios de tu carrera, marca los cursos que ya aprobaste y organiza tus próximos semestres — sin crear una cuenta. Regístrate solo si quieres guardar tu avance."

Sección "ACCESO RÁPIDO / Elige tu carrera": solo 5 tarjetas, todas de una sola institución implícita:
1. Ingeniería — Consejería Ingeniería — "Ir al último plan curricular →"
2. LICC — Consejería Ingeniería
3. LICD — Consejería LICD
4. Magíster en Ciencias de la Ingeniería — Consejería Ingeniería
5. Doctorado en Ciencias de la Ingeniería — Consejería Ingeniería
No hay buscador de carreras ni selector de universidad en la landing.

Otros: botón dark "¿Necesitas añadir tu carrera?" + texto "Para universidades, unidades académicas y representantes estudiantiles."; botón outline "¿Tienes una idea para Plazip? Mándanosla"; sección CREADORES (Mané · Producto, Rocka · Desarrollo, LinkedIn, "Conoce al equipo"); footer Política de Privacidad · Condiciones del Servicio · Novedades.
Fondo: tarjetas de malla difuminadas ("Sem 1", "Sem 2", "Sem 7", "Sem 8") como decoración, mucho espacio vacío bajo el fold.

Diseño visual: tipografía sans geométrica, H1 grande y pesado; jerarquía correcta; paleta pastel multicolor sobre fondo crema; botones redondeados; contraste del texto secundario bajo (gris claro sobre crema). No hay screenshots de producto, ni pricing, ni FAQ.

### Diálogo "Suma tu carrera a Plazip"
Copy: "Cuéntanos quién eres y qué carrera necesitas. Te contactamos para coordinar la carga de la malla y su puesta en marcha."
Segmentado "¿Desde dónde nos escribes?": Universidad o institución / Facultad o unidad académica / Representante estudiantil / Otro.
Campos: Universidad o institución*, Facultad escuela o departamento, Carrera(s) que quieres sumar*, Estudiantes aprox. (stepper), Tu nombre*, Cargo, Correo*, Teléfono, Mensaje, checkbox de consentimiento con link a Política de Privacidad. Botones "Cancelar" y "Enviar solicitud" (deshabilitado hasta completar).

## Home autenticado — https://plazip.cl/home
Tras Google: dialog "Entrar con Google" → "Iniciando sesión con Google… / Estamos verificando tu cuenta." (~4 s) → redirige a /home. Toast: "Sesión iniciada: [usuario]".

- Eyebrow "TU CUENTA", H1 "Hola, [usuario]", copy "Retoma una malla guardada, explora otra carrera o mira las oportunidades que comparte la comunidad."
- "GUARDADAS / Mis mallas  1" → tarjeta "Mi malla · Ingeniería · 22-11-2026" con "Abrir malla →" y iconos Duplicar malla / Editar malla.
- "EXPLORAR / Elige una carrera" carrusel con Anterior (deshabilitado) / Siguiente y dots "Ir a la página 1 de 2 / 2 de 2". Mismas 5 carreras → el catálogo real sigue siendo 5 planes de una sola escuela.
- Bajo el fold repite los CTA "¿Necesitas añadir tu carrera?" y "¿Tienes una idea para Plazip? Mándanosla", CREADORES. **No hay nada de "oportunidades que comparte la comunidad" / "muro" en el home**, aunque el texto lo promete y Mi información menciona "tus votos del muro": contenido prometido y ausente.
- Menú de cuenta (avatar): Mis mallas · Mi información · Proponer una mejora · — · Cerrar sesión. **No hay Ajustes, ni planes/precios, ni ayuda, ni modo oscuro aquí** (el toggle de tema está suelto en el header).

### Mi información (dialog)
"Los datos con los que Plazip identifica tu cuenta." Avatar con iniciales "LI", nombre, correo. DL: ROL = Estudiante; ESTADO = Activa; CONDICIONES = Aceptadas 22-11-2026. Link a Privacidad y Condiciones. Bloque rojo "Eliminar mi cuenta — Se borran tu cuenta, tus mallas guardadas y tus votos del muro. Es permanente y no se puede deshacer." + botón rojo.
Bugs/UX: todo read-only (no se puede editar nombre, universidad, carrera, ni avatar); el botón destructivo vive en el mismo diálogo informativo que se abre desde el menú, sin confirmación a la vista; no hay onboarding en ningún momento del login (no pide carrera ni major al crearse la cuenta).

## Planificador de malla — https://plazip.cl/plan/[id]
Estado de carga real: "Cargando malla curricular / Cargando los ramos y semestres de la malla...". Luego toast "Malla cargada: Mi malla" y status "Guardado. Tus cambios están guardados".

Header del plan: "PREGRADO Ingeniería"; botón "Programas de esta malla"; combo "Período de ingreso" (help "Período de la primera columna (AAAA-S)") valor 2026-1; botón "Créditos aprobados: 70 de 400" (70 / 400 cr.); tres combos: MAJOR + PLAN COMÚN = (M295) Major en Ingeniería en Investigación Operativa, MINOR = (N242) Minor en Innovación Tecnológica, TÍTULO = "Seleccionar Título...".
**Bug de persistencia/estado**: al abrir, los combos aparecen vacíos y el body muestra el estado vacío "Selecciona los bundles / para ver tu planificación personal." durante ~1-2 s antes de restaurar los bundles guardados. Un usuario que haga click rápido elige major de nuevo / cree que perdió su plan.
**Bug de copy**: "Selecciona los bundles" usa un anglicismo interno ("bundles") que no se usa en el resto de la UI.

Toolbar: botón colapsable "Opciones de la malla", Deshacer (Ctrl+Z) / Rehacer (Ctrl+Y) (deshabilitados al cargar), zoom Alejar / 100% / Acercar, "Buscar" (help "Buscar un ramo por sigla o nombre"), "Reportar error", "Compartir malla" (help "Compartir malla: para ver o para editar en conjunto").
Switches de capas: "Modo requisitos" (off), "Notas 10" (on por defecto), "Avance 35/47" (off). La cifra va pegada al label ("Notas10", "Avance35/47") en el árbol; visualmente son chips.

Grid: columnas "Sem 1 · 2026-1  50 cr", "Sem 2 · 2026-2  50 cr", "Sem 3 · 2027-1  50 cr"… hasta Sem 8+. Cada tarjeta: sigla (MAT1610), nombre (Cálculo I), tipo (SEMESTRAL · TAV / PAR / CONSULTAR), créditos ("10 cr"), línea diagonal como placeholder de color, tilde verde "Aprobado". Botones por slot: "Eliminar slot", "Fijar requisitos de este curso", "Cambiar el curso de este slot", "Ver notas del ramo", y help "Click para marcar/desmarcar como aprobado". Slots vacíos: botón "Slot" y "+ Slot"; "Insertar semestre" entre columnas.
Slot vacío muestra "— — —" con "10 cr" (sigla ausente, difícil de leer).
Leyenda inferior: "TIPO DE RAMO: Plan Común, Major, Minor, Formación General, Otros" (fuera del viewport: hay que scrollear para verla).

### Diálogo "Notas del plan"
Se abre con el switch Notas activo. "10 notas asociadas a tu selección". Agrupa por programa: "Major en Ingeniería en Investigación Operativa (MAJOR + PLAN COMÚN)" con notas a–h, y "Minor en Innovación Tecnológica (MINOR)" con e–f. Texto real de ejemplos: "El curso debe ser aprobado por el Comité de Pregrado de la Escuela de Ingeniería."; "Todos los estudiantes deberán aprobar 10 créditos de cada una de las siguientes áreas: Ecología Integral / Sustentabilidad, Humanidades, Salud y Bienestar, Ciencias Sociales, Artes, y Área libre…". Buena fidelidad del catálogo UC, pero las letras se repiten entre programas (e y f aparecen dos veces) y el diálogo tapa media malla.

### "Opciones de la malla" → "OPCIONES AVANZADAS"
Menú desplegable con: Cambiar nombre · Duplicar malla · Importar avance (help "Marcar los ramos aprobados desde tu certificado de avance") · Descargar PDF (help "Descargar malla en PDF").
El menú se monta sobre la grilla y tapa la fila de switches; "Eliminar malla" NO está aquí (solo existe "Eliminar mi cuenta" en Mi información): no hay forma de borrar una malla duplicada desde el plan.

### Duplicar malla
Dialog "Duplicar malla — Se creará una copia de «Mi malla», con tus cambios, y se abrirá para que la modifiques sin tocar la original." Campo Nombre precargado "Mi malla (copia)", botones Cancelar / Duplicar.
Prueba hecha: copia "TEST UX GradeHub (borrar)" → /plan/[id-prueba]. Toasts: "Malla cargada: TEST UX GradeHub (borrar)" y "Copia creada: TEST UX GradeHub (borrar)". Funciona muy bien como escenario de prueba.

### Capas / modos de visualización (switches)
- "Modo requisitos" (off→on): oscurece/engrisa lo que no está disponible y resalta con borde amarillo o verde lo que sí se puede tomar. Muy útil y claro, aunque no hay leyenda que explique verde vs amarillo.
- "Notas" (chipe con contador): abre el diálogo lateral "Notas del plan".
- "Avance 35/47": abre "Avance de tu malla": "35 de 47 requisitos cubiertos con tu plan · 11 aprobados"; leyenda "falta en tu plan / en tu plan / aprobado / convalidado" y "Las cifras («0/1 curso», «10/20 cr») cuentan solo lo aprobado."; agrupa por PLAN COMÚN / REQUISITOS ADICIONALES / MAJOR / MINOR / F. GENERAL con secciones colapsables "N pendientes" / "N cubiertos con tu plan", ítems tipo "Termodinámica — 0/1 curso — Falta 1 curso" y requisitos de créditos "Mínimo FG · Arte — 0/10 cr — Faltan 10 cr". Excelente: es el mejor módulo del producto.

### "Posibles topes de horario" (dentro de Notas del plan)
"2 posibles topes pendientes · 10 notas asociadas a tu selección" y bloque "Posibles topes de horario" con checkbox "Marcar Posible tope en semestre 2 como revisado":
"Posible tope en semestre 2. BIO143M y TTF012 no tuvieron una combinación de secciones sin tope en semestres históricos equivalentes a esta columna, considerando los bloques distintos de ayudantía. Revisa los horarios publicados antes de inscribirlos."
Misma advertencia para semestre 8 (DEM298 e ICS2122). Detector de conflictos basado en datos históricos: diferencial fuerte.

### Bugs observados en el planificador
1. **Cerrar el diálogo "Notas del plan" apaga el switch "Notas"** (Value pasa de 1 a 0) y lo guarda: la preferencia del usuario se pierde al cerrar. Pasó dos veces (plan original y copia).
2. **Contador de notas inconsistente**: el chipe dice "Notas 12" pero el diálogo dice "10 notas asociadas a tu selección" (más 2 topes = 12, sin explicación).
3. **Copia de sesión/BADGE "Sin conexión"** con help "Sin conexión: se guarda al reconectar" aparece junto a "Guardado. Tus cambios están guardados" en la misma barra, sin que la red esté cortada: señal contradictoria.
4. El texto del status cambia entre "Tus cambios están guardados" y "Tus cambios se guardan solos mientras editas" sin razón aparente (dos redacciones para lo mismo).
5. **Carga lenta del plan** (~3-4 s) con estado vacío intermedio que dice "Selecciona los bundles / para ver tu planificación personal." y los combos vacíos, aunque el plan sí tenía Major y Minor guardados. Riesgo de que el usuario vuelva a seleccionar y pise su plan.
6. Slots vacíos muestran "— — —" sueltos; no hay etiqueta "Curso libre / pendiente" clara.
7. Microinteracciones presentes y divertidas: botón "Lanzar confeti" (help "Confeti para todos 🎉") y badge "En vivo" (help "Edición en vivo") en el header.
## Selector de ramo por requisito (muy bueno)
Al hacer clic en el icono del ramo aparece el diálogo `Optativo Biológico`: `1 seleccionados` `10 cr`, chip de cumplido `Optativo Biológico 10/10 cr`, buscador `Buscar cursos por sigla o nombre`, grupo `OPTATIVO BIOLÓGICO 1` con BIO110C / BIO141C / BIO135C / BIO143M (cada uno con `10 cr` y un ícono de info), segundo grupo vacío `OTRO CURSO DEL ÁREA MEDICINA, BIOLOGÍA O AGRONOMÍA (NIVEL 100 O 1000) 0`, nota normativa `El curso debe ser aprobado por el Comité de Pregrado de la Escuela de Ingeniería.`, `Filtro: escuela: Ciencias Biológicas, Agronomía Y Sistemas Naturales, Escuela De Medicina, Medicina Veterinaria · nivel: 100, 1000` y `Busca arriba por sigla o nombre para elegir cualquier curso del catálogo.`: la mejor pantalla del producto.

## Bug de usabilidad/accesibilidad: tarjeta-botón con botones anidados
`BIO143M` es un `button` cuyo centro alterna aprobado (`Help: Click para marcar como aprobado`); al hacer clic en el centro de la tarjeta se marca **Aprobado** y sube `70 / 400 cr.` → `80 / 400 cr.` sin confirmación. Los botones `Ver notas del ramo`, `Fijar requisitos de este curso` y `Cambiar el curso de este slot` quedan anidados y se solapan: dos clics intentando `Ver notas` terminaron en `Aprobado` y en el diálogo de cambio de curso. **Deshacer (Ctrl+Z)** restauró `70 / 400 cr.` correctamente.

## Compartir
`Compartir «TEST UX GradeHub (borrar)»` → `Invita a editarla contigo en vivo o comparte una vista de solo lectura.` Dos enlaces generados **sin confirmación**: `https://plazip.cl/join#…` (`Quien lo abra con su cuenta edita esta misma malla contigo, en vivo.`) y `https://plazip.cl/shared#…` (`La ven al día y pueden guardar su propia copia; tu malla no cambia. Tu correo no se comparte.`), botón `Copiar` en cada uno, `Más opciones` con única opción `Invalidar enlace`, y `Personas con acceso` `0 de 8 editores` con `[usuario] (tú) Dueño` y `Todavía nadie más edita esta malla. Comparte el enlace para editar en conjunto.` No se copió ni pegó ningún enlace (límite de la auditoría). Riesgo: link de edición con token en el fragment, sin expiración ni revocación granular visible.
## Popover de créditos (bueno)
`Créditos aprobados: 70 de 400` abre: `Major en Ingeniería en Investigación Operativa 50 / 270 cr.`, `Plan Común 50 / 170 cr.`, `Major 0 / 100 cr.`, `Minor en Innovación Tecnológica 0 / 50 cr.`, `Formación General 20 / 80 cr.`, `Total 70 / 400 cr.` **Bug de aritmética/información:** `Major en Ingeniería en Investigación Operativa 50 / 270` y además `Plan Común 50 / 170` y `Major 0 / 100`: la fila padre 270 ≠ 170+100=270 OK, pero la sumatoria visible confunde (270+100 no se entienden con el Total 400: 270+50+80=400). El primer clic en el botón **no abre** el popover (hubo que volver a hacer clic).

## Agregar programa (botón `Programa`)
`Agregar programa` / `Suma otro programa a esta malla. Cada uno lleva su propio semestre de ingreso y su conteo de créditos.` RADIO único `Magíster en Ciencias de la Ingeniería — Magíster · malla 2026 y posteriores`, `LO CURSAS DESDE` con botones `2028-2 Sem 6`, `2029-1 Sem 7`, `2029-2 Sem 8` + combo `Período de ingreso`, nota `Se agregan los ramos del programa desde ese semestre y 2 semestres AVG al final. Un ramo que sirve en ambos puede contar en el pregrado, en el magíster o en los dos: lo sumas con «Mg» en su tarjeta.` Cancelar / `Agregar magíster`. **No se agregó** (se canceló).

## Importar avance (función estrella, copiar)
`Opciones de la malla` → popover `OPCIONES AVANZADAS` con `Cambiar nombre`, `Duplicar malla`, `Importar avance` (Help `Marcar los ramos aprobados desde tu certificado de avance`), `Descargar PDF`. Diálogo `Completar avance desde tu certificado`: `Sube tu Ficha Académica Acumulada o tu Informe de Avance Curricular y marcamos por ti los ramos que ya aprobaste.` `Arrastra el PDF o haz clic para elegirlo` `PDF, hasta 5 MB` y `No guardamos tu PDF. Lo leemos en el momento para marcar tus ramos y lo descartamos; no queda en nuestros servidores ni asociado a tu cuenta, y nunca leemos tu nombre ni tu RUT.`

## Reportar error (bueno)
`Reportar un error` / `Cuéntanos qué está mal en la malla que estás viendo y lo revisaremos.` `MOTIVO` `Puedes marcar más de uno`, grupos `La malla` (Malla mal definida, Requisitos mal definidos, Créditos incorrectos, Faltan cursos u optativos, Nombre o sigla incorrecta, Curso en el semestre equivocado, El plan está desactualizado) y `La aplicación` (Problema técnico de la app, Sugerencia de mejora, Otro), `DETALLE`, `ARCHIVO (OPCIONAL)` `Adjuntar archivo`, `SE ENVIARÁ CON TU REPORTE` con contexto automático de malla/plan. **No se envió** (límite).

## Buscador de ramos
`Buscar` (Help `Buscar un ramo por sigla o nombre`) abre `Buscar ramo` con query `Innovación`: resultados correctos (ING2030, IDI2031, ICS2031, IIC2713, COM903, DER105E) con `Sem N`. **Bug:** cada ramo aparece **dos veces** (una con sigla y otra sin sigla): `ING2030 Investigación, Innovación y Emprendimiento Sem 5` y `Investigación, Innovación y Emprendimiento Sem 5`. No hay filtro por universidad/malla ni por requisito.

## Cambiar nombre
Diálogo `Cambiar nombre` / `El nuevo nombre se verá en «Mis mallas»`, campo `Nombre`, Cancelar/Guardar. Correcto, se canceló.
## Novedades / changelog (`/changelog`)
`Historial de versiones` · `Novedades de Plazip` · `Última actualización: 17 de noviembre de 2026` · `Cada tanto agregamos cosas nuevas, arreglamos bichos y hacemos la malla un poco más agradable de planificar. Acá va el historial completo.` Versiones v1.6 (17-11-2026, edición en conjunto, confeti, abandono tras AVG), v1.4 (28-10-2026), v1.3 (27-10-2026), v1.2 (17-10-2026), v1.1 (02-08-2026). **Bug de consistencia:** no existe v1.5 (salto 1.4 → 1.6). Copy en chileno cercano ("al tiro", "bichos").

## Pages de planes/precios: NO EXISTEN
`https://plazip.cl/pricing` y `https://plazip.cl/pro` → 404. No hay planes, precios, ni upsell en landing, home ni menú de cuenta. El producto hoy parece gratuito.

## Página 404 (muy buena, copiar)
`Error 404` / `Esta página no está en la malla` / `El enlace que abriste no existe o cambió de dirección. Vuelve al inicio para retomar tus mallas guardadas.` `Volver al inicio`, `¿Buscabas otra cosa?` `Explorar carreras · Novedades · Créditos`, con tarjetas de ramos de mentira (`Sin ramo asignado`, `EDF1581 Ecuaciones Diferenciales`). Cada carga cambia los ramos mostrados.

## Temas (3 estados)
Un solo botón cicla: `Tema actual: claro. Cambiar a tema oscuro` → `Tema actual: oscuro. Cambiar a tema de alto contraste` → `Tema actual: de alto contraste. Cambiar a tema claro`. **Problema:** no hay menú, así que para volver a claro hay que pasar por alto contraste; en oscuro, las tarjetas pastel pierden contraste (títulos y `10 cr` se ven apagados sobre fondo oliva/marrón) y la leyenda al pie queda casi ilegible.

## Restauración del plan real (1144)
- Copia `TEST UX GradeHub (borrar)` eliminada desde `Editar malla` → `Eliminar malla` → confirmación `¿Eliminar esta malla?` / `Se eliminará la malla «TEST UX GradeHub (borrar)» de tu cuenta. Esta acción no se puede deshacer.` Queda solo `Mi malla` (22-11-2026). **Buena confirmación destructiva.**
- **Bug reproducido 3 veces** (copia y plan real): cerrar `Notas del plan` con la X o con Escape deja el switch `Notas` en Value 0 y el cambio queda guardado (`Guardado. Tus cambios se guardan solos mientras editas`).
- El panel `Notas del plan` **se reabre solo al recargar** cuando el switch está encendido.
- Estado final verificado tras reload: `Créditos aprobados: 70 de 400`, Major/Minor/Título como estaban, `Notas` encendido, tema claro.

## Pages from the result
- rutas_revisadas: https://plazip.cl/changelog
- rutas_revisadas: https://plazip.cl/contributors
