# Auditoría UX competitiva — Malla Pro (mallapro.cl)
Auditor: sesión de [usuario] (GradeHub). Fecha de la prueba: 2026-11-26. Navegador: Chromium, desktop 1000×1000, español.

## Cierre de la revisión

**/terminos** (33 secciones, Versión 1.0 · 7 de agosto de 2026, contacto `mallaprocl@gmail.com`): texto excepcional para un proyecto indie. Cubre explícitamente Modo Excepcional, "Marcar Hasta", toma de ramos, cupos, detección de conflictos, importación de PDF, códigos compartidos, almacenamiento local, y declara `Malla Pro no ofrece actualmente un sistema operativo de cuentas` y `no existe suscripción obligatoria; plan premium`. Confirma: gratis, sin cuenta, sin sincronización remota.

**Landing en modo oscuro**: el toggle de la landing y el de la app comparten tema. Con datos locales guardados el CTA cambia de `Ver mi malla` a `Continuar en mi malla` (buen detalle de personalización). El marcador amarillo del H1 y el demo autoplay se ven bien, pero las tarjetas del demo (verde/olivo/marón sobre negro) pierden contraste y se leen sucias; `Bloqueada` casi desaparece.

**Buenas prácticas de accesibilidad observadas**: `Help:` descriptivos en casi todos los botones, `alert` en el error de PDF, roles correctos en filtros y diálogos, `image` con descripción para la barra de avance. **Malas**: botón `PR` anidado dentro del botón de la ficha, filtros que atenúan sin anunciar cantidad, foco que salta, `Listo` que selecciona toda la página.

## Límites de esta auditoría (no verificable)
- **Horario con topes / secciones / NRC / cupos / exportación**: la pantalla `Arma tu horario` sólo existe después de subir un PDF de Programación Académica de la UNAB. No hay demo, ni datos de ejemplo, ni carrera con horario precargado. No fue posible subir un PDF real (el workspace no tenía ninguno y el PDF generado por el navegador quedó fuera de la ruta permitida por el uploader). Se verificaron el estado inicial, el drag&drop y el error `El archivo no es un PDF válido.`, pero **no** la grilla, los topes ni los conflictos.
- **Móvil real**: el entorno no permite emular viewport reducido, así que la revisión móvil se limita a lo que el DOM y la landing sugieren (grilla de malla horizontal con scroll, sidebar fijo de 5 íconos, sin menú hamburguesa visible en desktop). No se pudo comprobar el comportamiento bajo 400 px.
- **Modo de carga**: ninguna pantalla mostró spinner (todo es local e instantáneo); no se pudo ver un estado de carga real salvo el procesamiento del PDF.
- No se pagó, no se ingresaron datos de pago, no se conectaron cuentas, no se publicó nada, no se envió feedback ni formularios (`Pedir mi malla` y `Sugerir carrera` quedaron sin enviar), no se borró cuenta ni contraseña, no se tocó la cuenta de Google. **Malla Pro nunca pidió cuenta**: no hay login, ni Google, ni registro (checkpoint cumplido: nada que reportar en sign_ins).

---

## Comparación con GradeHub

### (a) Qué debería COPIAR GradeHub igual
1. **Malla curricular interactiva con prerrequisitos y desbloqueo**: click aprueba, las fichas dependientes se `Desbloquean`; estados `Disponible / Cursando / Aprobada / Bloqueada`; badge de promedio sobre la ficha.
2. **Press-and-hold = Cursando** y click simple = aprobado, con leyenda `Toca un ramo para cambiar su estado` y tour que lo enseña.
3. **Modo Excepcional** (aprobar sin prerrequisitos para convalidaciones) con banner, contador de seleccionados, `Aplicar y salir` y advertencia de qué NO hace.
4. **"Marcar hasta un semestre"** para configurar el avance histórico en un click.
5. **Resumen de progreso** con ramos y créditos (SCT) aprobados / en curso / pendientes y `% de avance` en el header.
6. **Cálculo de eximición** en el idioma del estudiante: `Necesitas 5.3 en el 70% que falta para eximirte` + barra `Evaluado / Falta` + `Eximición 5.0`.
7. **Filtros por estado** (Todos / Disponibles / Cursando / Aprobados) que atenúan en vez de reordenar.
8. **Pantalla completa de la malla** y salto rápido por semestre (`Semestres 1…10`).
9. **Onboarding en tour de 7 pasos con "Saltar Tour"**.
10. **Códigos de configuración compartida** (`MP1C…`, "Copiar código", con advertencia de que no incluye notas) — una mecánica viral sin backend.
11. **Respaldo descargable `.json`** con confirmación `Respaldo descargado. Guárdalo en un lugar seguro.`
12. **Landing con demo jugable** que avanza solo y CTA que cambia a `Continuar en mi malla` si ya hay datos.
13. **Términos y Privacidad escritos en español claro** y específicos del dominio (eximición, NRC, cupos, convalidaciones).
14. **Procesamiento 100 % local de PDF** como promesa de privacidad.

### (b) Qué GradeHub ya hace MEJOR
- **Promedio ponderado sobre 7 y "necesitas X para aprobar"** como modelo central, con pautas precargadas y simulador por ramo y de semestre completo (Malla Pro calcula sólo eximición por ramo, sin simulador de semestre ni pautas).
- **Calculadora puntaje → nota** y conversiones, que Malla Pro no tiene.
- **Agenda con exportación .ics** (Malla Pro necesita un PDF de la UNAB y no exporta nada).
- **Estadísticas e historial** de largo plazo, y **conector MCP** para agentes de IA — ambos inexistentes en Malla Pro.
- **IA de estudio** (Malla Pro no tiene ninguna).
- **Catálogo multi-universidad y ramos sueltos** frente a un Malla Pro que sólo cubre 3 universidades y 14 carreras y cuya toma de ramos funciona sólo "para la Universidad Andrés Bello".
- Onboarding de GradeHub tiene paso de periodo/horario; el tour de Malla Pro omite Periodo y Horario por completo.
- Formato numérico coherente y locale correcto (Malla Pro mezcla `4.2`, `5.0` con `5,5` y usa `mm/dd/yyyy`).

### (c) Qué GradeHub debería MEJORAR o AGREGAR
- Agregar **malla interactiva con prerrequisitos/desbloqueos y % de avance** (hoy no existe; confirma la diferencia).
- **Horario con topes y detección de conflictos** y vista de secciones (confirma la diferencia; hacerlo sin exigir un PDF oficial es la oportunidad).
- **Cierre de semestre** con un flujo claro y nombrado (Malla Pro lo resuelve con "Periodo actual" + "Próximas evaluaciones" + estados; copiar el patrón de naming y del estado vacío).
- **Catálogo** amplio y búsqueda con estado vacío útil (Malla Pro tiene 14 carreras, pero su empty state con "Pedir mi malla" es mejor que el fallo actual de "Ramos de mi malla").
- **Modo excepcional / convalidaciones** como feature de planificación.
- **Respaldo exportable/importable** y **códigos compartibles** de configuración.
- **Estados vacío/carga/error** consistentes y texto de ayuda en cada botón.
- Nunca copiar: fechas que se descartan en silencio, hora deshabilitada, mezcla de coma/punto, contadores pegados.

### Top 10 problemas de Malla Pro
1. **La fecha de una evaluación no se puede ingresar de forma fiable y se descarta en silencio** (`mm/dd/yyyy`, año queda en `0026`/`42026`, `Listo` no avisa) → la agenda `Próximas evaluaciones` queda vacía para siempre. Bug más grave: rompe la promesa central del semestre.
2. **Sin horarios sin PDF**: `Arma tu horario` exige subir la Programación Académica de la UNAB; sin documento no hay topes, secciones, NRC ni conflictos, y no hay demo ni datos de ejemplo.
3. **Dos definiciones de avance**: header `42%de avance` vs `PROGRESO GENERAL 52.1%` y leyenda mal atribuida. El usuario no sabe cuál es su avance real.
4. **Falta de espacio y separadores** en números clave: `42%de avance`, `20 aprobados5 cursando23 pendientes`, `Semestre 55 ramos`, `1 ramos`, `1 carreras`.
5. **Inconsistencia de locale**: coma y punto mezclados en notas (`4.2` vs `5,5`), fecha en formato inglés, hora siempre deshabilitada.
6. **Nomenclatura que no cierra**: nav `Horario` → URL `/programacion-academica` → H1 `Arma tu horario` → chip `Defínela en Toma de Ramos` que no aparece en ninguna navegación.
7. **Excepción es un espejo de Malla**: reabre el Modo Excepcional con selección residual (`1 seleccionado`) y `Cancelar`/`Salir` redundantes; el ítem de nav no lleva a una pantalla.
8. **"Marcar hasta" sólo ofrece Semestre 1..7** en una malla de 10 semestres, y deja el botón con aspecto deshabilitado.
9. **Modo oscuro con contraste insuficiente** en fichas `Bloqueada` (y tarjetas del demo de la landing); además el filtro `Aprobados` abre la malla en Año 3 sin scrollear al primer coincidencia.
10. **Accesibilidad y detalles de foco**: botón `PR` anidado dentro del botón de la ficha, filtros que atenúan sin anunciar resultados, `Listo` que deja toda la página con el texto seleccionado, tour de 7 pasos que omite Periodo y Horario y mezcla emojis con íconos.

### Veredicto
Malla Pro es el competiente más serio de GradeHub en Chile en **planificación curricular**: su malla interactiva con prerrequisitos, desbloqueos, Modo Excepcional, "Marcar hasta", resumen de créditos y cálculo de eximición están bien pensados, en español claro, sin registro, sin pago y con una privacidad local-first creíble (términos y política de 25/33 secciones escritas para el dominio). Su diseño es limpio, con jerarquía y microinteracciones correctas, y su landing con demo jugable es una máquina de conversión.

Pero está **una sola universidad de distancia de ser un producto completo**: el 90 % del valor diferencial (toma de ramos, topes, secciones, NRC, cupos, conflictos) está bloqueado detrás de subir un PDF de la UNAB que casi nadie tiene a mano en el momento de probar, y **no hay cuentas, sincronización, historial, estadísticas ni IA**. El flujo de notas pierde la fecha en silencio, el avance se muestra con dos números distintos y hay descuidos de locale y espaciado que un estudiante nota enseguida.

GradeHub gana hoy en **cálculo, simulación, agenda, historial, IA e infraestructura de producto** (MCP, .ics, pautas); pierde en **malla interactiva y horario con topes**, que es justamente lo que Malla Pro clavó. La jugada es copiar el modelo de interacción de la malla y del periodo, y superarlo con datos precargados (sin exigir PDF), cierre de semestre claro y promedio ponderado sobre 7 dentro de la misma malla.
