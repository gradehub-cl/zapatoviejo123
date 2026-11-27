# Mallas PUCV: fuentes y decisiones

Revisión del 2026-11-27. Entra una carrera, **Ingeniería Civil**, que es la única
de la PUCV cuya escuela publica el plan ramo por ramo con el programa de cada
uno: [eic.pucv.cl/estudia-con-nosotros/plan-de-estudios](https://eic.pucv.cl/estudia-con-nosotros/plan-de-estudios/).
El resto de la PUCV sigue igual: la carrera se escribe y los ramos se agregan a
mano.

En GradeHub: 1 carrera declarable con malla, 49 ramos en 11 semestres.

| Opción en GradeHub | Código | Documento | SHA-256 |
|---|---|---|---|
| Ingeniería Civil | `PUCV-INGENIERIA-CIVIL` | [`plan_de_estudios_ingenieria_civil_pucv_2021.pdf`](https://eic.pucv.cl/wp-content/uploads/2022/12/plan_de_estudios_ingenieria_civil_pucv_2021.pdf) | `1aaaa6fbbaa31952de47b0708cb9579ff53419f6fb81ca1351ba65170c9c4a75` |

## Cómo se leyó

- La página «Plan de estudios» lista los 11 semestres con sus ramos. El PDF
  «Malla curricular actual» que enlaza trae texto y lista **los mismos 56 ramos**;
  se comprobó nombre por nombre que no falta ni sobra ninguno.
- La página enlaza además el programa en PDF de 41 ramos. En los 40 que traen el
  dato, el semestre del programa coincide con el de la página.
- Es el plan publicado como «2021» (decreto de programa de estudio 2/2020 en
  los programas), sin atribuirle una cohorte que el documento no declara. La
  misma página enlaza la malla 2004–2016, que no se cargó.

## Qué quedó fuera

Mismo criterio que las otras universidades: los casilleros que no nombran un
curso.

- **Electivo 1 a 4** (semestres 9, 10 y 11).
- **Formación Fundamental 1 a 3** (semestres 6, 7 y 8): son cursos a elegir.

Inglés 1 a 4, Antropología Cristiana y Ética Cristiana nombran un ramo y van,
aunque la página no publica su programa. Las prácticas profesionales aparecen
como nota al pie de la malla, no como ramo.

## Lo que no es transcripción literal

- **Mayúsculas.** La página y la malla escriben «Álgebra lineal», «Cálculo
  diferencial e integral», «Cálculo en varias variables», «Física General
  Termodinámica y ondas» e «Innovación y emprendimiento». Van con mayúsculas
  como el resto de los ramos.
- **«Diseño en Acero»** es como lo escriben la página y la malla. El programa
  del ramo (CIV4035) dice «Diseño de Acero». Va el de la malla.

## Cuidado con el nombre de la carrera

La PUCV tiene varias ingenierías civiles (Industrial, Informática, Química,
Eléctrica y otras), que son carreras distintas y no están acá. La opción se
llama «Ingeniería Civil», que es su nombre oficial. Buscar «Ingeniería Civil
Industrial» no la devuelve, porque el buscador exige que el nombre de la opción
contenga lo buscado; pero quien recorre la lista ve una sola opción. Si aparece
gente de otra ingeniería eligiéndola por error, la salida es declarar también
esas carreras, sin malla.

## Pendiente

- **Siglas, créditos y requisitos.** Los 40 programas con identificación los
  traen (`MAT1001`, 6 créditos PUCV). Hoy la tabla de créditos existe solo para
  UC y FEN.
- **Pautas.** Solo 11 de los 41 programas nombran porcentajes; el resto dice
  «según las disposiciones del profesor». No se cargó ninguna. El detalle está
  en la [PR #1381](https://github.com/gradehub-cl/zapatoviejo123/pull/1381).
- **Regla de nota.** No se leyó el reglamento de la PUCV: rige la regla común.
  Varios programas usan `NF = 0,67 NP + 0,33 NE` con eximición, que es compuerta
  de cada pauta, no regla del tenant.
- **El resto de la PUCV:** el sitio central (`www.pucv.cl`) respondió 403 y no se
  leyó.
- **Licencia:** no se localizó una licencia de reutilización.
