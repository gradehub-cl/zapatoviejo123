# Canvas: sección, profesor y ayudantes

Datos exclusivamente sintéticos: curso MAT1620, sección 2, docente y ayudante
inventados, nota 5,4. No se conectó un Canvas ni una cuenta real. La red de QA
queda aislada del backend; RPC simuladas con los mismos contratos del cliente.

## Comportamiento comprobado

- Traer ramos y Traer fechas leen el código de curso y el equipo. Una sección
  vacía se propone; una sección 5 no se reemplaza por la sección 2 de Canvas.
  Si hay dos secciones candidatas y el ramo no tiene sección, no se adivina.
- Leer, cancelar o seguir solo con fechas conserva el JSON. Guardar la sección
  usa `seccion` y mantiene la pauta personalizada y su nota 5,4. El programa por
  sección se resuelve con `programaQueCalza`; su pauta se acepta por el flujo
  existente, no se reemplaza silenciosamente la pauta de la persona.
- El equipo se muestra solo después de confirmar. Vive en memoria durante la
  sesión y no viaja a respaldo, exportación, historial ni sincronización. Se
  elimina al olvidar la cuenta o desconectar Canvas. Hay que volver a traerlo
  y confirmarlo tras reiniciar la app.
- El profesor único se propone en la confirmación existente al calificar. Con
  varios profesores, se ofrecen nombres y se pide elegir; los ayudantes no se
  proponen como profesores. El nombre propio o público ya informado mantiene
  su prioridad. No hubo llamadas a informar/reportar/calificar antes de guardar
  una calificación. No se agregan nombres o siglas a las métricas.
- Un equipo vacío o una RPC nativa no disponible no bloquea ramos ni fechas.
  Los datos de un período futuro o no reconocible no se usan como equipo del
  semestre activo. Se mantiene la protección contra cambios de cuenta, período
  o sección durante la lectura y durante la revisión.
- La ruta nativa solo admite `courses/N/users` con filtros teacher y ta e
  `include[]=enrollments`, máximo tres páginas. Cada página conserva los filtros.
  La política Swift real reduce cada resultado a nombre y rol, sin ID, correo,
  avatar ni objeto Enrollment, y excluye estudiantes, invitados y otros cursos.

## Privacidad y compatibilidad

No se añade un campo a `gradehub_v1`. `supabase/profesor_alumnos.sql`, función
`mis_alumnos`, devuelve el JSON completo de los ramos compartidos. Persistir un
campo de equipo habría ampliado esos datos; la caché de sesión evita ese cambio
sin modificar SQL ni el contrato de sync. El profesor se informa exclusivamente
mediante `profesor_docente_informar` al guardar la calificación existente.

Las pruebas ejecutan las funciones reales de guardado, normalización,
exportación/importación y subida `subirConVersion` con transporte simulado.
Comprueban que sección y notas sobreviven, y que ningún nombre del equipo
aparece en el estado local, el respaldo o el payload enviado.

## Revisión visual

- Navegador Chromium aislado, 375 × 900 px, claro y oscuro: hoja de revisión,
  ficha con equipo confirmado y confirmación del profesor. Sin errores JS ni
  desplazamiento horizontal. Texto al 200 %: ancho 375 px, sin desbordamiento.
- Hoja: controles de 44 px como mínimo; contraste mínimo medido 5,20:1 en claro
  y 6,50:1 en oscuro. Usa los componentes existentes de hojas; no incorpora
  animaciones ni CSS nuevo.
- Simulador iPhone 17, iOS 27.0: hoja real de la app, claro y oscuro. Fixture
  local temporal; recursos de QA retirados al terminar. La proyección Swift se
  prueba compilando la política real, además de compilar la app completa.
- Web: los puntos de entrada nuevos y la ficha quedan detrás de `enAppNativa`;
  el host está oculto por defecto. No se muestra ni consulta el equipo en web.

Capturas `375-*.png`: navegador. `simulador-*.png`: app en simulador.
`mediciones.json` conserva los valores medidos del navegador.

HIG aplicada: [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
una acción de confirmación y salida sin guardar, con los datos antes de decidir;
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility),
controles de 44 pt, contraste y texto ampliado. Se reutiliza la hoja nativa
existente, incluida su adaptación a movimiento reducido y áreas seguras.

## Validación

- `npm run build`.
- Revisión de sintaxis JS y balance CSS de AGENTS.md.
- `npm test -- --resumen`: 475 pruebas aprobadas.
- `tests/canvas-docencia.test.js`, `canvas-ajustes.test.js` y
  `canvas-nativo.test.js`: aprobadas, incluida compilación de la política Swift.
- `xcodebuild`, esquema App, Debug, iPhone 18 Pro: BUILD SUCCEEDED.
  DerivedData aislado; firma de simulador, sin Team ni Bundle ID escritos en el
  proyecto. `ENABLE_DEBUG_DYLIB=NO` solo en el comando local para ejecutar en el
  simulador; no se cambió el proyecto de Xcode.
