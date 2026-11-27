# UACh, Derecho

Corte: **27 de noviembre de 2026**. Continúa el [inventario](../README.md). Es una
carrera, Derecho (Valdivia y Puerto Montt), y es **la fuente más completa para
pautas** de las leídas hasta ahora: programas vigentes y todos con sus pesos.
Investigación: no carga ninguna pauta ni malla.

## Qué publica

La página [Programas y Malla](https://derecho.uach.cl/programas-y-mallas/) de la
Facultad lista los diez semestres de ramos obligatorios y las optativas, y enlaza
el programa en PDF de cada uno. El sitio no tiene reglas de robots contra agentes
de IA.

En el inventario este host quedó detenido porque se pidió una carpeta a mano y
respondió 403. Esta vez se leyó solo la página y los PDF que ella enlaza.

## Qué se hizo

Se leyó la página y se bajaron los 71 PDF distintos que enlaza (75 peticiones en
dos corridas, una a la vez con 1,15 s entre inicios; ninguno quedó en el repo).
La primera corrida dejó fuera diez enlaces relativos por un error del lector, que
se corrigió. De cada programa se leyó la identificación y las evaluaciones. **No
se copiaron nombres ni correos de docentes**, que los programas sí traen.

## Qué salió

- **58 casilleros obligatorios en 10 semestres.** 47 son ramos con su propio
  programa.
- **Los 47 nombran sus porcentajes.** 25 traen una lista «Evaluaciones (fechas y
  ponderaciones)»; en los otros 22 los pesos van dentro de la tabla de unidades
  («40% de NPE», «Examen Final 40% NF»).
- **Son vigentes:** 24 dicen «2026, primer semestre», 4 «2026, segundo semestre»
  y 18 son de 2025; uno no trae el período.
- **La forma se repite:** una nota de presentación a examen (NPE) hecha de dos o
  tres evaluaciones, más un examen final. Los pesos cambian por ramo. Tres
  leídos contra su texto:
  - Acto Jurídico: NPE 65% (dos pruebas de 50%) y examen 35%.
  - Historia del Derecho: tres evaluaciones de 35%, 30% y 35% forman la NPE; NPE
    70% y examen 30%.
  - Derecho Tributario: dos pruebas de 40% y dos grupales de 10% forman la NPE;
    examen 40% de la nota final.
- **Códigos por sede:** 36 programas traen el código de Valdivia y el de Puerto
  Montt (`DPRI115-23` / `ICJU115-23`). El programa es el mismo para las dos.
- **17 optativas** (5 de formación general, 11 de formación profesional y 1
  transversal) también tienen programa con pesos.

Lo que no tiene programa propio:

- **Ocho enlaces de la página llevan al programa de otro ramo.** «Taller de
  Resolución de Casos Prácticos» e «Informe Jurídico» abren el de Bienes; los
  cinco «Optativo de Formación…» abren el de una optativa de ejemplo, y «Examen de
  Licenciatura» abre un documento sin nombre de asignatura. Están marcados en la
  columna `enlace_calza`.
- **Tres no tienen enlace:** Educación Física y Salud (la dicta el Centro de
  Deporte), Optativo de Formación Profesional I y Teoría del Delito, del Sujeto
  Responsable y de la Pena.
- Un programa (Redacción de Instrumentos Administrativos) dice VII semestre y la
  página lo lista en el VI.

[`programas.tsv`](programas.tsv) guarda el texto de las evaluaciones y la lista
de porcentajes; **no arma la pauta**. En los 22 de tabla el texto son las líneas
con porcentaje, sueltas: hay que leerlas contra el PDF.

## El reglamento

Todos los programas remiten al **Título IV del Reglamento Interno de la carrera
de Derecho** (Resolución N° 075 del 20 de julio de 2017, Vicerrectoría Académica)
para los requisitos de aprobación. No se leyó. Ahí debería estar si hay
eximición o nota mínima de examen, que serían compuertas de cada pauta.

## Qué significa

- **Es la primera fuente con la que se podrían transcribir pautas a escala** para
  una universidad nueva: 47 ramos obligatorios vigentes, con pesos, de una sola
  carrera.
- **La malla sale de la misma página**, con el mismo criterio de las otras
  (fuera los optativos y el examen de licenciatura).
- Los programas cambian cada semestre (traen docente, horario y fechas): la
  pauta cargada habría que revisarla al cambiar el período.
- Es una carrera. No se buscó una fuente equivalente para el resto de la UACh.
- No se localizó licencia de reutilización (T0).

## Archivos

- [`programas.tsv`](programas.tsv): los 75 casilleros de la página, con sección,
  semestre, si el enlace calza, código, período, texto de evaluaciones,
  porcentajes, URL y SHA-256.
- En [`../herramientas/`](../herramientas/): `uach_derecho.py` (página y bajada)
  y `uach_leer.py` (extracción).
