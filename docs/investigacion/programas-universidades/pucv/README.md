# PUCV, Escuela de Ingeniería Civil

Corte: **27 de noviembre de 2026**. Continúa el [inventario](../README.md). Es una
carrera, Ingeniería Civil, con **el plan completo y las siglas, pero con pocas
ponderaciones**. Investigación: no carga ninguna pauta ni malla.

## Qué publica

La página [Plan de estudios](https://eic.pucv.cl/estudia-con-nosotros/plan-de-estudios/)
de la escuela lista los 11 semestres de la carrera, ramo por ramo, y enlaza el
programa en PDF de los que lo tienen. También enlaza la malla vigente
(`plan_de_estudios_ingenieria_civil_pucv_2021.pdf`) y la anterior (2004–2016).

`eic.pucv.cl` no tiene reglas de robots contra agentes de IA. El sitio central
`www.pucv.cl` respondió 403 en el inventario y no se tocó.

## Qué se hizo

Se leyó la página y se bajaron los 41 programas y las dos mallas (45 peticiones,
una a la vez con 1,15 s entre inicios; ningún PDF quedó en el repo). De cada
programa se leyó la identificación y la sección «VI. Evaluación de los
resultados de aprendizaje».

## Qué salió

- **56 ramos en 11 semestres; 41 tienen programa publicado.** Sin programa quedan
  15: los cuatro Inglés, Antropología y Ética Cristiana, las tres Formación
  Fundamental, los cuatro Electivos, «Comunicación, Liderazgo y Equipos» e
  «Innovación y emprendimiento».
- **El formato es uniforme.** 40 de los 41 traen sigla (`MAT1001`, `CIV3022`),
  créditos PUCV, semestre y requisitos con la sigla del ramo previo. El semestre
  del programa coincide con el de la página en todos.
- **Solo 11 programas nombran porcentajes.** Los otros 27 con sección de
  evaluación dicen que habrá evaluaciones sumativas y formativas «según las
  disposiciones del profesor», sin pesos; 3 no tienen la sección.

Los 11 con pesos:

| Sem. | Sigla | Ramo | Lo que dice |
|---|---|---|---|
| 1° | MAT1001 | Fundamentos de Matemáticas para Ingeniería | pruebas 80%, controles y tareas 20%; NF = 0,67 NP + 0,33 NE |
| 2° | MAT1004 | Álgebra lineal | 80% y 20%; NF = 0,67 NP + 0,33 NE |
| 2° | MAT1002 | Cálculo diferencial e integral | 80% y 20%; NF = 0,67 NP + 0,33 NE |
| 2° | FIS1002 | Física para Ingeniería | 60% y 40% |
| 3° | MAT1003 | Cálculo en varias variables | 80% y 20%; NF = 0,67 NP + 0,33 NE |
| 4° | MAT1005 | Ecuaciones Diferenciales | 80% y 20%; NF = 0,67 NP + 0,33 NE |
| 8° | CIV4041 | Ingeniería Sísmica | presentación 70% + examen 30% |
| 8° | CIV4043 | Planificación y Control de Proyectos | presentación 70% + examen 30% |
| 9° | CIV5046 | Mecánica de Suelos Aplicada | 75% y 25% |
| 9° | CIV5047 | Ingeniería Sanitaria | 65% y 35% |
| 10° | CIV5052 | Proyecto Integrador | informes de avance 60% + informe final 40% |

Son los de Matemática y Física, que dicta otra unidad, y cinco de los siete
programas resubidos en enero de 2025. Los de la escuela subidos en 2023 no traen pesos. La
columna es lo que el extractor encontró en el texto: **antes de usar un peso hay
que abrir el PDF**, cuya URL y SHA-256 están en [`programas.tsv`](programas.tsv).

## Qué significa

- **Sirve para armar la malla de Ingeniería Civil PUCV** con nombres, siglas,
  créditos y requisitos: es la primera fuente del inventario que trae las cuatro
  cosas juntas y limpias.
- **No sirve como fuente de pautas**, salvo esos 11 ramos. Los de primer año de
  Matemática (`MAT1001` a `MAT1005`) son de servicio, así que probablemente
  valgan para otras ingenierías de la PUCV; no se comprobó.
- Es una carrera de una escuela. Otras unidades de la PUCV cuelgan sus programas
  en `www.pucv.cl/uuaa/…`, host que no se pudo leer.
- No se localizó licencia de reutilización (T0).

## Archivos

- [`programas.tsv`](programas.tsv): los 56 ramos del plan, con su semestre, y para
  los 41 con programa: sigla, créditos, requisitos, decreto, texto de evaluación,
  porcentajes y fórmulas nombradas, URL y SHA-256.
- En [`../herramientas/`](../herramientas/): `pucv_eic.py` (página y bajada) y
  `pucv_leer.py` (extracción).
