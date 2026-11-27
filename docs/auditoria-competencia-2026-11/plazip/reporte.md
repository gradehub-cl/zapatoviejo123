# Auditoría UX de Plazip (plazip.cl) — [usuario] (GradeHub)
Fecha: 26-11-2026 · Sesión iniciada con Google (`[correo]`). Límites respetados: sin pagos ni datos de pago, sin conectar otras cuentas, nada compartido/publicado (los enlaces se generaron pero no se copiaron ni se enviaron), ningún feedback enviado, cuenta y contraseña intactas. El plan real (`/plan/[id]`) quedó verificado como estaba; la copia de prueba fue eliminada.

## 1. Landing (`/`)
**Qué veo:** modal al entrar `PLAZIP V1.6 / Edita tu malla en conjunto`; H1 `Explora la malla de tu carrera`; sección `ACCESO RÁPIDO / Elige tu carrera` con **solo 5 tarjetas** (`Ingeniería`, `LICC`, `LICD`, `Magíster en Ciencias de la Ingeniería`, `Doctorado en Ciencias de la Ingeniería`, todas rotuladas `Consejería…`); CTA `¿Necesitas añadir tu carrera?` (dialog `Suma tu carrera a Plazip`, formulario de leads con `Enviar solicitud` deshabilitado), `¿Tienes una idea para Plazip? Mándanosla`, `CREADORES` (Mané/Rocka) y footer.
**Qué siento:** limpio, cálido, tipografía grande, buen copy en chileno. Pero angosto: llego y no puedo buscar mi carrera.
**Qué pienso:** es un producto de nicho (una facultad), no una plataforma. El modal de release notes arriba del fold compite con el H1.
**No es intuitivo:** no hay buscador ni selector de universidad; si no estudias Ingeniería UC, el sitio no es para ti y no hay salida clara. El modal tapa el CTA.
**Bugs/roces:** modal sin cierre evidente al primer render; `Enviar solicitud` deshabilitado sin explicar qué falta; `Consejería Ingeniería` como subtítulo (ruidero interno).
**Diseño:** jerarquía clara, espaciado generoso, paleta pastel coherente; microinteracciones suaves. **Familiaridad:** se siente a Notion/Figma (grid de tarjetas), buen parecido con la malla real.
**Cambiaría:** buscador de carrera + chip de universidad en el fold; release notes como banner dismissible; mostrar nº de carreras/mallas disponibles.

## 2. Login con Google
Popup de Google estándar, vault autocompleta; vuelve a Plazip con toast `Sesión iniciada: [usuario]` y cae en `/home`. **Sin onboarding**: entra directo al home (no explica modos, ni qué es un slot, ni AVG). Rápido y sin fricción, pero perde la oportunidad de enseñar el modelo mental.

## 3. Home (`/home`)
**Qué veo:** eyebrow `TU CUENTA`, `Hola, [usuario]`, subtítulo `Retoma una malla guardada, explora otra carrera o mira las oportunidades que comparte la comunidad.`; `GUARDADAS / Mis mallas` con tarjetas (`Mi malla · Ingeniería · 22-11-2026`, `Abrir malla`, iconos Duplicar/Editar); `EXPLORAR / Elige una carrera` (carrusel, 2 páginas, las mismas 5); `¿Necesitas añadir tu carrera?`; `CREADORES`; footer. Menú de cuenta: `Mis mallas · Mi información · Proponer una mejora · Cerrar sesión`.
**Qué siento:** ordenado, pero vacío: el 60% del viewport es fondo decorativo.
**Qué pienso:** el copy promete `las oportunidades que comparte la comunidad` y **ese muro no existe** en ninguna parte del producto: publicidad de una feature ausente.
**No es intuitivo:** los iconos de tarjeta (duplicar/editar) son solo icono, sin etiqueta; `Editar malla` es en realidad renombrar/eliminar.
**Diseño:** buenas etiquetas eyebrow, buena tarjeta; contraste de los metadatos gris bajo.
**Cambiaría:** panel de próxima acción (semestre que sigue, ramos pendientes), accesos a PDF y avance, y quitar la promesa de comunidad o construirla.

## 4. Mi información
Read-only: `ROL Estudiante`, `ESTADO Activa`, `CONDICIONES Aceptadas 22-11-2026`, botón rojo `Eliminar mi cuenta`. **No hay Ajustes**: ni email, ni idioma, ni notificaciones, ni tema, ni zonificación. **Riesgo:** `Eliminar mi cuenta` sin confirmación escalonada visible en primera instancia (no se probó por límite).

## 5. Planificador (`/plan/[id]`) — pantalla núcleo
**Qué veo:** barra superior `PREGRADO Ingeniería`; tres combos `MAJOR + PLAN COMÚN` (`(M295) Major en Ingeniería en Investigación Operativa`), `MINOR` (`(N242) Minor en Innovación Tecnológica`), `TÍTULO` (`Seleccionar Título...`); `Período de ingreso 2026-1`; `70 / 400 cr.`; toolbar con `Opciones de la malla`, `Deshacer (Ctrl+Z)`, `Rehacer (Ctrl+Y)`, zoom `Alejar 100% Acercar`, `Compartir`, switches `Modo requisitos`, `Notas 12`, `Avance 35/47`; grilla `Sem 1 · 2026-1 … Sem 8 · 2029-2` con tarjetas (sigla, nombre, tipo, `SEMESTRAL · TAV`, `10 cr`, check `Aprobado`), botones por tarjeta `Eliminar slot`, `Fijar requisitos de este curso`, `Cambiar el curso de este slot`, `Ver notas del ramo`; `+ Slot`, `Insertar semestre`; leyenda `TIPO DE RAMO` al pie; topbar con `Buscar`, `En vivo`, `Lanzar confeti`, estado de guardado, `Reportar error`, cuenta.
**Qué siento:** es la mejor pantalla: densa pero legible, color por bloque, edición directa. Se parece a la malla que uno recuerda.
**Qué pienso:** el modelo Major/Minor/Título + AVG + requisitos está fielmente modelado (crédito real UC, `TAV`, `PAR`, `CONSULTAR`). Es ventaja defensable.
**No es intuitivo:** (a) `Notas` es un switch con chip de conteo pero abre un panel lateral que tapa la malla; (b) `Avance` y `Notas` no se explican; (c) `Fijar requisitos` no dice qué hace; (d) `TÍTULO` vacío permanente sin decir si aplica; (e) el estado de guardado cambia de redacción; (f) las tarjetas-botón alternan `Aprobado` al hacer clic en el centro.
**Bugs con texto exacto:** ver sección 8.
## 6. Funciones del planificador probadas
- **Popover de créditos:** `Major en Ingeniería en Investigación Operativa 50 / 270 cr.`, `Plan Común 50 / 170 cr.`, `Major 0 / 100 cr.`, `Minor en Innovación Tecnológica 0 / 50 cr.`, `Formación General 20 / 80 cr.`, `Total 70 / 400 cr.` El primer clic no lo abre.
- **Avance (`Avance 35/47`):** panel `Avance de tu malla` con `35 de 47 requisitos`, pendientes/cubiertos por bloque, `REQUISITOS ADICIONALES`, `MAJOR`, `MINOR`, `F. GENERAL`, `Faltan 10 cr`. Lo mejor del producto junto con el selector por requisito.
- **Selector por requisito (`Optativo Biológico`):** `1 seleccionados 10 cr`, chip `Optativo Biológico 10/10 cr`, buscador, grupos con créditos, `Filtro: escuela: … · nivel: 100, 1000`, nota normativa `El curso debe ser aprobado por el Comité de Pregrado…`. Excelente.
- **Buscar:** `Buscar ramo` devuelve resultados correctos pero **cada ramo aparece dos veces** (con y sin sigla).
- **Agregar programa (`Programa`):** `Magíster en Ciencias de la Ingeniería`, `LO CURSAS DESDE` (Sem 6/7/8), nota de convalidación `«Mg»`. Cancelado.
- **Compartir:** genera dos enlaces **automáticamente al abrir** (`…/join#…` editar en vivo, `…/shared#…` solo lectura), `Copiar`, `Más opciones` → única opción `Invalidar enlace`, `Personas con acceso 0 de 8 editores`, `Dueño`. Nada fue copiado ni enviado.
- **Opciones avanzadas:** `Cambiar nombre` (`El nuevo nombre se verá en «Mis mallas»`), `Duplicar malla`, `Importar avance` (`Completar avance desde tu certificado`, PDF hasta 5 MB, `No guardamos tu PDF…`), `Descargar PDF` (descarga **sin ninguna confirmación en pantalla**).
- **Simulaciones:** **no existen** como tal; no hay escenario/what-if, ni simulador de nota, ni proyección de egreso. Solo `Duplicar malla` sirve de escenario manual.
- **Horario:** no hay horarios/sección por profesor; solo `SEMESTRAL · TAV / PAR / CONSULTAR` y `Posibles topes de horario` (histórico, muy bueno).
- **Notas/promedios:** no hay promedio ponderado, nota sobre 7, ni cálculo de carga académica. `Notas` = notas informativas del catálogo, no notas del alumno.
- **Ajustes, planes/precios:** no existen (`/pricing`, `/pro` → 404). Producto sin modelo de monetización visible.
- **Modo oscuro/alto contraste:** un botón cicla claro→oscuro→alto contraste→claro.
- **Estados:** carga lenta (~3-4 s) con combos vacíos y vacío engañoso `Selecciona los bundles / para ver tu planificación personal.`; `Guardado. Tus cambios están guardados` y `Guardado. Tus cambios se guardan solos mientras editas` (dos redacciones); badge `Sin conexión` sin estar offline; 404 de marca `Esta página no está en la malla`; toasts `Malla cargada: Mi malla`, `Lanzar confeti`, badge `En vivo`.

## 7. Bugs (texto exacto y pasos)
1. **Cerrar «Notas del plan» apaga el switch `Notas` y lo guarda.** Pasos: plan → clic en `Notas` → panel abre → clic en la X (o Escape) → `switch Notas Value: 0` + `Guardado. Tus cambios se guardan solos mientras editas`. Reproducido 3 veces (copia y plan real).
2. **El panel `Notas del plan` se reabre solo al recargar** (`dialog Notas del plan` presente tras `reload` con el switch encendido).
3. **Conteo inconsistente:** chip `Notas 12` vs panel `10 notas asociadas a tu selección` (y `Notas10`/`Notas12` alternando entre lecturas).
4. **Doble resultado en buscador:** `ING2030 Investigación, Innovación y Emprendimiento Sem 5` y `Investigación, Innovación y Emprendimiento Sem 5`.
5. **Primer clic en `Créditos aprobados: 70 de 400` no abre** el popover (requires segundo clic).
6. **Badge `Sin conexión` visible junto a `Guardado`** sin estar offline.
7. **Vacío engañoso durante la carga:** `Selecciona los bundles / para ver tu planificación personal.` (anglicismo + estado vacío mal disparado).
8. **Clic en el centro de la tarjeta alterna `Aprobado`** (sube `70 / 400 cr.` → `80 / 400 cr.`) sin confirmación; los botones anidados (`Ver notas del ramo`, `Fijar requisitos…`, `Cambiar el curso…`) se solapan y son difíciles de acertar.
9. **Slots vacíos `— — —`** con créditos pero sin tipo ni explicación; y `Descargar PDF` no muestra feedback.
10. **Changelog salta v1.4 → v1.6.**

## 8. Comparación con GradeHub
**(a) Qué COPIAR igual de Plazip:** (1) panel de avance por bloque/requisito con `35 de 47` y `Faltan 10 cr`; (2) selector de ramo por requisito con filtro `escuela/nivel` y nota normativa; (3) `Importar avance` desde PDF con promesa de privacidad (`No guardamos tu PDF…`); (4) edición en vivo + `En vivo` + deshacer/rehacer + confeti; (5) `Posibles topes de horario` con datos históricos; (6) exportación PDF y 404 de marca; (7) `Duplicar`/escenarios; (8) changelog público con copy cercano.
**(b) Qué GradeHub ya hace MEJOR:** promedio ponderado y nota sobre 7; `necesitas X para aprobar`; simulador por ramo y por semestre; calculadora puntaje→nota; pautas precargadas; agenda `.ics`; estadísticas e historial; conector MCP; onboarding de 4 pasos; ajustes/tema con menú. Plazip no tiene nada de notas, evaluación ni calendario.
**(c) Qué GradeHub debería MEJORAR o AGREGAR:** malla/planificador por semestre con prerrequisitos y créditos institucionales (hoy Plazip lo gana); avance por requisitos con pendientes y cubiertos; importación de PDF académico con privacidad explícita; compartir link de solo lectura/edición; escenarios duplicados; estados de guardado y toasts consistentes; onboarding corto que explique el modelo; fix de las debilidades propias: ampliar catálogo (5 universidades), arreglar `Ramos de mi malla`, aclarar cierre de semestre, evitar secciones que cargan para siempre, y agregar IA de estudio.

## 9. Top 10 problemas de Plazip
1. Cerrar el panel de notas apaga el switch y lo persiste.
2. Tarjeta-botón que alterna `Aprobado` al clic central + botones anidados solapados.
3. Catálogo: 5 carreras de una sola facultad, sin buscador ni universidad.
4. Sin onboarding/ayuda de conceptos (`AVG`, `Fijar requisitos`, `Avance`, `Notas`).
5. Promesas de copy sin feature (`oportunidades que comparte la comunidad`).
6. Carga lenta con vacío engañoso y anglicismo `Selecciona los bundles…`.
7. Conteos inconsistentes (`Notas 12` vs `10 notas asociadas`) y doble resultado en búsqueda.
8. Sin ajustes, sin planes/precios, sin exportación de datos (`.ics`/CSV), sin control de enlaces compartidos (solo `Invalidar enlace`).
9. Sin notas, promedio, simulación de carga ni escenario/what-if dentro de la malla.
10. Modo oscuro de bajo contraste y ciclado forzado por alto contraste; dos redacciones de guardado y badge `Sin conexión` fantasma.

## 10. Veredicto
Plazip es el mejor planner de mallas de Chile: modela la malla real (mayor/menor/título, AVG, prerrequisitos, créditos) y la edita en vivo. Su diseño es cálido y la pantalla del planificador es excelente. Pero es un producto **una sola facultad, sin onboarding, sin ajustes, sin monetización y sin capa académica** (notas, promedio, simulación, calendario). Frente a GradeHub, Plazip gana en *estructura curricular* y GradeHub gana en *vida académica del semestre*. La jugada obvia para GradeHub: copiar avance por requisitos + selector por requisito + importación de PDF, y sumar un planificador de malla propio antes de que Plazip agregue notas.
