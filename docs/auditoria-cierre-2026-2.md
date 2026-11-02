# Auditoría de cierre 2026-2

Revisión de código y fuentes al **2026-11-02**. No certifica todo programa de
cada universidad. No se consultaron notas ni identidades reales. Las pautas son
de período/sección concreta; los ejemplos de mecanismo son sintéticos.

## Contrato del motor

`src/engine/reglas-y-puntajes.js`: regla base 1–7, aprobación 4,0 y redondeo a
una décima; UAndes añade aproximación previa a centésima. El margen numérico de
`gh_notaOficial` evita artefactos binarios; el resolvedor conserva su borde exacto.
No hay redondeo universal de promedios intermedios: se ponderan con precisión y
se aproxima la final. Las compuertas, descartes, eximiciones, recuperativos y
vínculos cátedra/laboratorio dependen de los metadatos del preset y del mismo
árbol de cálculo. El archivo de reglas del tenant no agrega esos requisitos.

Esta PR **no cambia estas reglas**. Prioriza una final que la persona declara del
portal, conserva la calculada del instante del cierre para comparar y permite
archivar pendientes sin incorporarlos al promedio del historial.

## UC

Fuentes primarias: [Evaluación y calificación, Registros Académicos](https://registrosacademicos.uc.cl/informacion-para-estudiantes/inscripcion-y-retiro-de-cursos/evaluacion-y-calificacion-de-un-curso/)
y [índice del Reglamento del Estudiante de Pregrado](https://registrosacademicos.uc.cl/reglamentos/estudiantiles/).
La página oficial confirma escala, una décima y aprobación 4,0; las pendientes
«P» no se consideran cursadas hasta su resolución. El enlace del reglamento
actual falló al descargar: no se atribuye a 2026 el articulado de la copia de 2008.

Los programas cotejados están individualizados en
[programas-uc-2026.json](programas-uc-2026.json) y
[programas-uc-com-2026-2.json](programas-uc-com-2026-2.json), con archivo, páginas,
período y ambigüedades. Ejemplos: MAT1610 y los bloques cátedra/laboratorio de
FIS1523/FIS1533; el caso 4,0 de esos dos se resolvió por decisión expresa de
Lucas, no como una nueva regla general.

- Final: una décima coincide con lo publicado; falta una regla primaria general
  sobre empate exacto y redondeos intermedios para cada unidad.
- Intermedios: no se encontró una norma que permita redondearlos universalmente.
- Compuertas/eximición/descartes: se cotejan por programa, no por nombre del ramo.
  Los inventarios documentan lo que no define el programa; no se completa con
  prácticas de otra sección o año.

## U. de Chile, FEN

Fuente primaria de entrada: [Secretaría de Estudios FEN, reglamentos](https://secretariaestudios.fen.uchile.cl/informacion-relevante/reglamentos),
que enlaza el Decreto 0018076 y reglamentos específicos 0018083/0018084/0018077.
El documento general enlazado está en Drive y no entregó texto verificable en
esta revisión. **Falta cotejar su articulado vigente**: no se extrapola Medicina,
FCFM ni Comunicación a FEN.

- Final: el motor usa una décima; falta confirmar formalmente el procedimiento
  de aproximación con el reglamento específico.
- Intermedios: falta una norma del período; el motor no redondea cada bloque.
- Compuertas: `src/data/fen-pautas.js` declara requisitos por programa. La regla
  transversal de trabajo individual tiene confirmación del equipo, pero no una
  fuente escrita identificada: sigue como evidencia pendiente, no certificación.
- Descartes y eximiciones: dependen del programa y del número de instancias;
  condiciones que dependen de datos no declarados quedan en `noCalcula` /
  `reglasDelCurso`. No se inventa el denominador ni una nota de segunda fecha.

## UAI

Fuente primaria: [Reglamento de programas de pregrado 2026](https://uai.cdn7pm.net/documentos/reglamento-programas-de-pregrado-2026.pdf),
arts. 20–23, pp. 5–6 del PDF; art. 28, pp. 7–8.
Los arts. 21–23 asignan ponderaciones/condiciones al syllabus, expresan las notas
hasta una décima (segunda solo con norma específica), aprobación 4,0 y prohíben
fijar un mínimo en la evaluación final. No fijan allí un algoritmo universal de
redondeo de bloques; queda pendiente esa precisión.

Los programas individuales y faltantes están en
[programas-uai-2026.json](programas-uai-2026.json). Las compuertas de bloques
teórico/práctico no se confunden con una nota mínima del examen. Descartes y
eximiciones por ranking requieren los datos/confirmaciones que el programa pide;
no se infiere el ranking desde las notas de la persona.

**Límite confirmado de acumulados:** el art. 28 excluye determinadas asignaturas
y reprobaciones luego aprobadas. El promedio genérico de ramos guardados no
aplica esas exclusiones ni conoce todas esas clasificaciones. Por eso el nuevo
rótulo dice «Promedio del historial», no PPA oficial. La nota oficial de cada
ramo sí se respeta; implementar el PPA normativo requiere una PR propia y datos
para distinguir recursadas/exclusiones, sin borrar intentos históricos.
Reproductor deliberadamente fallido: `node tests/auditoria/uai-reprobado-reaprobado.cjs`.

## UAndes

Fuente primaria: [Reglamento del alumno, edición junio 2023, art. 22](https://www.uandes.cl/wp-content/uploads/2024/11/Reglamento-alumnos-pregrado-junio-2023-v1.1.pdf):
final a una décima con aproximación previa a centésima. Coincide con
`rounding:{decimals:1,previo:2}`: 3,946 → 3,95 → 4,0. La referencia histórica no
prueba por sí sola que no haya una modificación posterior. El índice oficial
actual enlaza además un Reglamento de Pregrado curricular de 2024, que es otro
documento: **falta la edición del alumno de marzo 2026 en fuente primaria**.

- Intermedios: el art. 22 no autoriza redondear cada categoría antes de ponderar.
- Compuertas, descartes y eximición: [normativas por carrera](https://www.uandes.cl/estudiantes/informacion-academica/reglamentos/normativas-por-carrera/)
y syllabus. La [normativa de Ingeniería 2026, arts. 10 y 14](https://www.uandes.cl/wp-content/uploads/2026/06/Normativa-Alumnos-Pregrado-ING-2026.pdf)
remite al syllabus y a la presentación publicada; no da una fórmula universal.
  Se mantienen los requisitos específicos del preset y sus faltantes.

## UDD

Fuente primaria vigente: [Reglamento del alumno regular, DR 50/26, marzo 2026](https://www.udd.cl/dircom/reglamentos/Reglamento-alumno-regular-de-pregrado.pdf),
arts. 34–37, pp. 9–10 del PDF. Una décima y aprobación 4,0; el procedimiento de
aproximación se remite a un instructivo de Vicerrectoría Académica no localizado.
El examen normalmente pesa 30–50%; hay excepciones autorizadas. Sin eximición
salvo excepción, examen mínimo 3,0; bajo ese mínimo, la final es la del examen.

**Brecha reproducida:** no hay presets UDD en `PRESETS_POR_TENANT` y una pauta
manual que no declare compuertas no incorpora automáticamente ese mínimo.
Con pruebas 6,0 al 60% y examen 2,9 al 40%, devuelve 4,8 en vez de 2,9 según
la regla general del art. 37. Falta representar la regla y sus excepciones con
fuente/carrera, no un `if` por universidad dentro del cálculo.

Regresión deliberadamente fallida, fuera de la suite de entrega:
`node tests/auditoria/udd-examen-minimo.cjs`. No se corrige en esta PR: requiere
su propia PR de motor/preset, con la norma y sus excepciones revisadas por Lucas.
Los redondeos intermedios/descartes particulares siguen pendientes de programas.

## Alcance y próximos controles

- La suite normal prueba lo implementado: cierre pendiente, final oficial,
  escala, acumulado del historial, Wrapped, legado, sincronización y RLS/MFA.
- Las regresiones UDD y PPA UAI son reproductores de deuda confirmada; no se ejecutan como
  tests verdes ni se oculta con una aserción que espere el resultado incorrecto.
- Una diferencia registrada no demuestra un error: puede faltar una evaluación,
  tratarse de una pauta editada o una decisión del docente. El banco muestra
  calculada/portal/huella/origen para investigar sin otras notas personales.
- No se modifican programas, compuertas, reglas ni la ventana de Wrapped en
  esta PR. Cada corrección probada se revisa y publica por separado.
