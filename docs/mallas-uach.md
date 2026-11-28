# Mallas UACh: fuentes y decisiones

Revisión del 2026-11-27. Entra una carrera, **Derecho**, que es la única de la
UACh cuya facultad publica el plan ramo por ramo con el programa de cada uno:
[derecho.uach.cl/programas-y-mallas](https://derecho.uach.cl/programas-y-mallas/).
El resto de la UACh sigue igual: la carrera se escribe y los ramos se agregan a
mano.

En GradeHub: 1 carrera declarable con malla, 51 ramos en 9 semestres.

| Opción en GradeHub | Código | Documento | SHA-256 |
|---|---|---|---|
| Derecho | `UACH-DERECHO` | [`Plan_de_Estudos_Derecho_ATUALIZADO_page-0001.jpg`](https://derecho.uach.cl/_wp/wp-content/uploads/2020/01/Plan_de_Estudos_Derecho_ATUALIZADO_page-0001.jpg) | `521e4939c5b7550d6c682427ee3c04e3cae2bff013fa35746f7590343502ab4a` |

Valdivia y Puerto Montt comparten el plan: los programas traen el código de las
dos sedes (`DPRI115-23` / `ICJU115-23`). Por eso es una sola opción.

## Cómo se leyó

- La página lista los diez semestres con sus casilleros y, al lado, publica la
  malla como imagen («Datos octubre 2024»). Se leyó la imagen casillero por
  casillero y **coincide con la lista de la página** en los diez semestres.
- La página enlaza además el programa de 47 ramos obligatorios, vigentes (2025 y
  2026).

## Qué quedó fuera

Mismo criterio que las otras universidades: los casilleros que no nombran un
curso y los hitos que no son ramos.

- **Optativo de Formación General** (4°) y **Optativo de Formación Profesional I
  a V** (5° a 9°).
- **Examen de Licenciatura**, que es lo único del 10° semestre. Por eso la malla
  llega hasta 9°.

Educación Física y Salud y Pasantía Profesional nombran un ramo y van.

## Lo que no es transcripción literal

- «Redacción de contratos» va como «Redacción de Contratos», igual que en la
  imagen de la malla.
- «Educación Física y Salud» va sin el asterisco con que la página avisa que la
  dicta el Centro de Deporte y Recreación.
- Van los nombres de la página. La imagen abrevia o cambia tres: «Derecho
  Internacional de los DDHH», «Conceptos Fundamentales del Derecho Privado» y
  «Títulos de Créditos e Insolvencia».
- El programa de «Litigación Civil de Familia y del Trabajo» lo titula con coma
  («Litigación Civil, de Familia y del Trabajo»); va como en la página y la
  malla.

## Donde la malla y el programa no coinciden

**Redacción de Instrumentos Administrativos** está en 6° en la página y en la
imagen de la malla; su programa dice «VII semestre». Va en 6°.

## Pautas

En `src/data/uach-pautas.js` hay **23 pautas**, transcritas el 2026-11-27 de los
programas que enlaza la misma página. Cada una lleva al lado el código de sus
dos sedes, el período que declara el programa y la URL del PDF.

**Qué entró.** Solo los programas que traen la lista «Evaluaciones (fechas y
ponderaciones)» y son coherentes consigo mismos. Todos escriben igual: las
parciales forman la nota de presentación a examen (NPE), y la final pondera NPE
y examen. En el archivo va el peso sobre la nota final («NPE 65%: dos pruebas de
50%» son 32,5 y 32,5).

| Semestre | Ramos con pauta | NPE / examen |
|---|---|---|
| 1° | Sistema Jurídico, Historia del Derecho, Jurisdicción | 70 / 30 |
| 2° | Razonamiento Jurídico, Conceptos Fundamentales de Derecho Privado, Derecho Constitucional Orgánico | 70 / 30 |
| 2° | Introducción a la Profesión Jurídica | sin examen |
| 3° | Acto Jurídico | 65 / 35 |
| 4° | Bienes, Derecho Internacional de los Derechos Humanos, Derecho Económico, Derecho Procesal Constitucional | 65 / 35 |
| 5° | Bases del Derecho Administrativo | 60 / 40 |
| 6° | Contratos, Derecho Tributario, Control y Responsabilidad de la Administración, Regulaciones Ambientales y de Recursos Naturales | 60 / 40 |
| 7° | Redacción de Contratos | 60 / 40 |
| 8° | Resolución de Conflictos del Trabajo, Títulos de Crédito e Insolvencia, Derecho y Procedimientos de Familia, Derecho y Procedimientos de Consumo | 60 / 40 |
| 8° | Litigación Penal | sin examen |

**Qué quedó fuera y por qué.**

- **Dos programas que se contradicen.** Historia del Derecho Chileno reparte la
  presentación en 35%, 30% y 45%, que suman 110%. Derecho Probatorio dice «NPE en
  un sesenta por ciento (65%) y de NEF en un cuarenta por ciento (35%)». No se
  elige por ellos.
- **22 programas con los pesos dentro de la tabla de unidades** («40% de NPE»,
  «Examen Final 40% NF»), sin la lista. Hay que transcribirlos leyendo cada PDF.
- Los dos ramos cuyo enlace abre el programa de Bienes (Taller de Resolución de
  Casos Prácticos e Informe Jurídico) y los tres sin programa.

**El reglamento.** Los programas remiten al Título IV del
[Reglamento Interno de la Carrera de Derecho](https://derecho.uach.cl/_wp/wp-content/uploads/documentos/11-Reglamento-Interno-de-la-Carrera-de-Derecho.pdf)
(Resolución N° 075 de 2017; SHA-256
`8c85acf72491e73319abb991917b3da12bb391321f62fac8a2f8badea6310768`). Es un PDF
escaneado: se leyeron las páginas 4, 5 y 6 como imagen.

- **Art. 16:** para rendir el examen hay que tener 3,5 de presentación,
  aproximada a la décima. «En caso contrario, la nota final en la asignatura
  será la nota de presentación a examen.» Es la compuerta de cada pauta con
  examen: `min:3.5`, `cap:'self'`, sin `exacto`.
- **Art. 10:** el examen final es obligatorio. No hay eximición ni nota mínima
  de examen.
- **Art. 13:** al menos dos parciales, ninguna sobre el 50% de la presentación.
  El refundido de 2025 agrega «ni superior a tres»; Derecho Tributario publica
  cuatro y va como su programa.
- **Art. 20:** la final es 60% presentación y 40% examen, a la décima, y se
  aprueba con 4,0.

Los programas de 2025 y 2026 ya usan 70/30 en 1° y 2° y 65/35 en 3° y 4°, que es
lo que dice el
[texto refundido de 2025](https://derecho.uach.cl/_wp/wp-content/uploads/documentos/1195-Nuevo-texto-refundido-del-Reglamento-Interno-de-la-Carrera-de-Derecho.pdf)
(SHA-256 `4315a9c4886e0d84ab5a4448c488be191bb9912e9aef729ce39736f74b2bb8da`),
publicado «a la espera de ser aprobado por la Dirección de Pregrado». Manda lo
que dice cada programa. El refundido cambia además el art. 16: con menos de 3,5
«la asignatura se entenderá reprobada», sin decir con qué nota; la compuerta da
el mismo resultado, reprobado.

**Redondeo.** La presentación completa se aproxima a la décima según el
art. 16, antes de ponderarla con el examen. Por ejemplo, en Contratos, con
parciales 3,5 y 3,6, la presentación es 3,6. Con examen 4,5, la nota final es 4,0.

**Vigencia.** Cada pauta lleva su `periodo`. Solo cuatro son de 2026-2; las otras
19 (una de 2025-1, trece de 2025-2 y cinco de 2026-1) se muestran como de un
período anterior. Los programas cambian
cada semestre: hay que volver a leerlos.

**Servidor.** `supabase/consenso_periodo.sql` trae el registro de pautas
oficiales regenerado con estas 23. **Hay que aplicarlo a mano en producción**;
mientras no se aplique, el servidor no las reconoce como oficiales frente al
consenso de estudiantes.

## Pendiente

- **Las otras 22 pautas**, que tienen los pesos dentro de la tabla de unidades, y
  las dos que se contradicen, si la Escuela las corrige.
- **Regla de nota del tenant.** No se declaró nada en `GH_REGLAS_NOTA_POR_TENANT`:
  rige la regla común (1 a 7, 4,0, a la décima), que es lo que dice el art. 20.
  Ese reglamento es de Derecho, no de toda la UACh.
- **Ocho enlaces de la página llevan al programa de otro ramo** («Informe
  Jurídico» y «Taller de Resolución de Casos Prácticos» abren el de Bienes). No
  afecta la malla, pero sí a quien quiera transcribir esas pautas.
- **El resto de la UACh:** no se buscó una fuente equivalente.
- **Licencia:** no se localizó una licencia de reutilización.
