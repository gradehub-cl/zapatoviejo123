# UCN, Escuela de Ingeniería (Coquimbo)

Corte: **27 de noviembre de 2026**. Continúa el [inventario](../README.md). Acá el
resultado es el contrario al de la [UDLA](../udla/README.md): **tres carreras
completas, con todos sus programas ordenados por semestre**. Sigue siendo
investigación: no carga ninguna pauta ni malla.

## Qué publica

La Escuela de Ingeniería mantiene un listado público de documentos:
[losvilos.ucn.cl/InstructivosEscuelaIngenieria](https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/).
Tiene 254 archivos ([`listado.tsv`](listado.tsv)). Lo que importa:

| Carpeta | Qué trae |
|---|---|
| E. Mallas y programas de estudios / Programas | **154 programas en PDF**, por carrera y semestre: ICCI (Ing. Civil en Computación e Informática, 60), ICI (Ing. Civil Industrial, 48) e ITI (Ing. en Tecnologías de Información, 46) |
| E. … / Mallas | Las tres mallas (folletos de admisión, sin códigos) |
| B. Calendarios | **Calendario de evaluaciones del semestre por carrera** (2026-1): ramo, semestre, docente, horario y sala por fecha |
| C. Calendario Académico | Calendarización general del semestre 2026-1 |
| D. Electivos EIC | Electivos profesionales y ocho minors; los programas de los minors son imágenes, sin texto |
| J. Reglamentos | Reglamento General de Docencia de Pregrado (D. 64 y 67/2024), reglamento de permanencia y otros |

El listado se recorre con los enlaces `?path=` que ofrece la propia página. Pedir
una carpeta directamente da 403; eso fue lo que detuvo este host en la primera
pasada del inventario. `robots.txt` no existe (404).

## Qué se hizo

Se recorrió el listado (29 lecturas) y se bajaron 218 PDF de esas carpetas (109
MB, una petición a la vez con 1,15 s entre inicios; ninguno quedó en el repo). De
cada programa se leyó la identificación y la sección «Orientaciones y criterios
para la evaluación». Una primera bajada falló completa por un error del lector
con los espacios de las direcciones: no llegó ninguna petición al sitio.

## Qué salió

| | ICCI | ICI | ITI |
|---|---|---|---|
| Programas | 60 | 48 | 46 |
| Con código | 60 | 43 | 45 |
| La evaluación nombra porcentajes | 54 | 37 | 42 |
| La evaluación no nombra porcentajes | 5 | 8 | 4 |
| Sin sección de evaluación | 1 | 3 | 0 |

- **Los 154 traen nombre**, y todos menos uno, créditos SCT y semestre en la
  malla. 148 traen código (`DCCB-00107`, `ECIN-00701`).
- **Prerrequisitos:** en ICI vienen separados («Pre-requisitos» y «Requisito
  para») y por nombre. En ICCI e ITI las dos columnas quedan mezcladas en el
  texto; van en la columna `requisitos_sin_separar`.
- **La evaluación viene en prosa, no en tabla.** Por ejemplo Álgebra I: «Se
  contemplarán 3 evaluaciones con porcentajes 30%, 30% y 40%», con 70% de
  asistencia. [`programas.tsv`](programas.tsv) guarda ese texto completo y la
  lista de porcentajes que nombra; **no los interpreta**. Varios programas dan
  rangos o recomendaciones («debiera ser de 60% para cátedra y 40% para
  taller»), no una pauta cerrada.
- Se leyeron tres al azar contra su texto (Proyecto Introducción a la
  Ingeniería, Electrotecnia e Identidad, Universidad, Equidad y Género) y lo
  extraído calza.

## El reglamento

El listado trae el Reglamento General de Docencia de Pregrado en PDF con OCR. De
ese texto, **sin confirmar contra la imagen del PDF**:

- **Art. 28:** escala de 1,0 a 7,0.
- **Art. 29:** la nota final se expresa hasta con un decimal y es el promedio
  ponderado. Si un ramo exige aprobar por separado cátedra y práctica y una no
  alcanza, la nota final se reemplaza por 3,3, sin examen recuperativo.
- **Art. 30:** aprueba con 4,0, con exigencia de 60%.
- **Examen de recuperación:** para quien termina la cátedra entre 3,4 y 3,9; si
  lo aprueba, la nota final es 4,0.

Lo del 3,3 y lo del examen de recuperación son compuertas de pauta. La regla del
tenant sería la común (1 a 7, 4,0, a la décima), pero hay que leer el artículo
antes de declararla.

## Qué significa

- **Es la primera fuente con la que se podría armar carreras completas** de una
  universidad nueva: malla por semestre, créditos, códigos y evaluación de cada
  ramo, para tres carreras de una sede.
- **El calendario de evaluaciones sirve para Agenda**, igual que los de FEN, UC y
  Derecho UDD que registra [fuentes públicas](../../../fuentes-publicas.md).
- **Límites:** es una escuela de una sede (Coquimbo), no la UCN entera. Los
  programas son del plan vigente («2024»), no de una cohorte declarada. La
  evaluación en prosa exige transcripción a mano, ramo por ramo. Y no se
  localizó licencia de reutilización (T0).

## Archivos

- [`programas.tsv`](programas.tsv): los 154 programas con su URL, identificación,
  texto de evaluación y porcentajes nombrados.
- [`listado.tsv`](listado.tsv): los 254 archivos del listado, con carpeta y URL.
- En [`../herramientas/`](../herramientas/): `ucn_arbol.py` (recorrido),
  `ucn_bajar.py` (bajada y texto) y `ucn_leer.py` (extracción).
