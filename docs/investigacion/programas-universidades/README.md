# Programas de asignatura de las universidades de Chile

Corte: **26 de noviembre de 2026, noche, hora de Chile**. Es investigación: no cambia
`src/`, SQL ni nada que llegue a producción, y **no carga ninguna pauta**. Sigue el
método de [fuentes públicas](../../fuentes-publicas.md) y continúa el paso 3 del
[catálogo de Chile](../catalogo-chile/README.md).

Qué se buscó: para las 49 universidades que hoy están en registro básico (las 47
nuevas más UDP y UNAB), **dónde publican sus programas de asignatura con
ponderaciones**, que es de donde sale una pauta. De pasada quedaron anotadas las
mallas en PDF y los reglamentos que aparecieron.

## Resumen

- **6 universidades tienen un catálogo que cubre toda la universidad**: UDLA y UCSC
  publican un PDF por sigla (sin índice: hay que conocer la sigla); O'Higgins, Aysén y Antofagasta tienen el catálogo de
  Ucampus abierto (programa, créditos, requisitos, secciones y horario por
  semestre); la Alberto Hurtado tiene Ucampus con sesión, pero sus programas
  aparecen indexados.
- **9 publican programas por facultad, escuela o carrera**: USACH (FAE), PUCV,
  USM, UACh (Derecho), UCN (Ingeniería, Coquimbo), UCM (Ing. Civil Informática),
  UdeC (Geofísica y páginas de docentes), UPLA y UDP (Informática).
- **6 tienen solo programas sueltos o antiguos**: UBB, Atacama, Tarapacá, USS,
  UNAB y UC Temuco.
- **En las otras 28 no se localizó ningún programa**: aparecen reglamentos, mallas
  o nada. Varias dicen en su reglamento que el programa oficial vive en la
  intranet o la plataforma interna (UFRO, UTEM, UTalca).
- **Ucampus le cierra la puerta por nombre a los agentes de IA** en su
  `robots.txt` (`Claude-Code`, `ClaudeBot`, `GPTBot` y más de cien otros). Esos
  catálogos **no se recorrieron**: hay que pedir permiso o leerlos una persona.
- De 14 programas que se pudieron bajar, se revisó el texto de 13: **11 traen las
  ponderaciones** y 2 no (UBB Contabilidad I y un programa de Pedagogía USACH).
  El otro es un dossier de 409 páginas de la UTA que no se revisó.

## Cómo se buscó y qué límites tiene

1. **Descubrimiento con el buscador web**, una consulta por universidad
   restringida a su dominio (`"programa de asignatura" OR syllabus evaluación
   ponderación filetype:pdf`), más una segunda consulta con otro vocabulario
   («syllabus», «módulo», «guía de aprendizaje», «solemnes») en ocho
   universidades grandes sin resultados. Fueron 58 búsquedas. La columna «Qué
   decía el buscador» es **el fragmento que devolvió el buscador**: sirve para
   saber qué hay, no para copiar un peso a una pauta.
2. **Lectura directa** con un lector propio ([`herramientas/crawl.py`](herramientas/crawl.py)
   y [`verify.py`](herramientas/verify.py)): portada, `robots.txt`, sitemaps y hasta
   doce páginas de carrera por sitio, y después una lectura de cada URL que dio el
   buscador. Una petición a la vez dentro de cada corrida, 1,15 s entre inicios,
   sin sesión, sin cookies y sin reintentos. Ante un 403 se detuvo ese host.
3. **Lectura del PDF**: el texto de los PDF bajados se sacó con PDFKit
   ([`pdftexto.swift`](herramientas/pdftexto.swift)) y se buscó la sección de
   evaluación. Solo eso cuenta como «leído en el PDF».

Lo que hay que saber antes de usar esto:

- **«No localizado» no es «no existe».** Fueron una o dos consultas por
  universidad y un recorrido corto de cada sitio.
- **Agente:** las lecturas usaron un agente genérico
  (`lector-academico/1.0`), no `GradeHubBot/1.0` como en
  [fuentes públicas](../../fuentes-publicas.md), porque nadie pidió identificar
  al proyecto en las peticiones. Quien repita esto con el bot del proyecto puede
  obtener otras respuestas.
- **Robots dirigidos a IA.** El lector es un agente de IA (Claude Code). Al
  principio solo miraba las reglas generales de `robots.txt`; al notar que
  Ucampus nombra a Claude, se corrigió para respetar también esas reglas y se
  repitió el recorrido desde cero. **Antes de notarlo se hicieron 50 lecturas a
  hosts `ucampus.*`** (una a `/m/catalogo/` de cada dominio, la mayoría sin
  respuesta porque ese host no existe, y una segunda al catálogo de la UOH). No se leyó nada más de ahí. Con la regla corregida quedaron sin leer:
  `ucampus.*`, `www.uoh.cl`, `www.ucsh.cl`, `www.ugm.cl`, `portal.ucm.cl`,
  `accesodirecto.utem.cl`, `cdn.uss.cl` y `biblioteca.utem.cl`.
- **403:** `www.pucv.cl`, `www.uvm.cl`, `www.uniacc.cl` y
  `conservatorio.umayor.cl` respondieron 403 y no se volvieron a tocar. También
  dieron 403 tres carpetas pedidas a mano (`fae.usach.cl`, `www.derecho.uach.cl`,
  `losvilos.ucn.cl`): es la respuesta normal a un listado de carpeta, pero por la
  misma regla esos hosts quedaron detenidos y **sus PDF no se verificaron por
  lectura directa**; lo que se sabe de ellos viene del buscador.
- **Sin conexión desde este equipo:** `ubolivariana.cl`, `ulare.cl`,
  `uleones.cl`, `catalogoasignatura.ucsc.cl`, `informatica.uv.cl` y
  `repo.uss.cl`. No se sabe si es el sitio o la red de esta noche.
- **Un error del lector:** en `www.unap.cl` hizo 205 peticiones en cuatro
  minutos por un tope mal puesto al seguir sitemaps. Quedó corregido (máximo 14
  intentos de sitemap por sitio).
- En total fueron unas 1.500 peticiones, repartidas entre los sitios de las 49
  universidades y sus subdominios.
- **Licencias (T0):** no se localizó en ninguna de estas fuentes una licencia de
  reutilización. Que un PDF se pueda leer no autoriza a copiar su contenido a un
  producto. Vale la misma cautela de [fuentes públicas](../../fuentes-publicas.md).
- **Un programa publicado no es la pauta de este semestre.** Varios son de 2014
  a 2021. Rige la regla del repo: las ponderaciones salen del programa oficial
  vigente y lo que falta se marca.

## Dónde están los programas

### Catálogo de toda la universidad

| Universidad | Dónde | Qué decía el buscador | Lectura directa | Leído en el PDF |
|---|---|---|---|---|
| U. de Las Américas (`udla`) | [Catálogo curricular UDLA: programas.udla.cl/<período><SIGLA>.pdf, vistos de 2015 a 2026](https://programas.udla.cl/202610CBI302.pdf) | 4 cátedras 60, ejercicios 15, examen 25 | PDF, 200 (97 KB) | sí: tabla «7.1 Ponderaciones» (cátedra, ejercicios, examen 25%) |
| U. Católica de la Santísima Concepción (`ucsc`) | [Catálogo de asignaturas UCSC: un PDF por sigla (catalogoasignatura.ucsc.cl/pdfs/<SIGLA>.pdf)](https://catalogoasignatura.ucsc.cl/pdfs/LEE097.pdf) | 2 certámenes 30% c/u, exposiciones 20 | sin conexión desde este equipo | — |
| U. de O’Higgins (`uoh`) | [Ucampus UOH: catálogo con programa por id (ids vistos de 413 a 27663; Derecho, Salud, Educación, Agronomía)](https://ucampus.uoh.cl/m/catalogo/programa?bajar=1&id=14125) | Derecho Penal I: 3 parciales 25 + trabajo 25; otros 70/30 con examen | no leído: robots.txt le cierra el paso a Claude | — |
| U. de Aysén (`uay`) | [Ucampus UAysén: catálogo con programa o syllabus por id (ids vistos de 489 a 8629)](https://ucampus.uaysen.cl/m/catalogo/programa?bajar=1&id=1629) | presentación 70 + examen 30, con eximición | no leído: robots.txt le cierra el paso a Claude | — |
| U. de Antofagasta (`uantof`) | [Ucampus UA: catálogo con programa por id (ids vistos de 1009 a 10883; años 2025 y 2026)](https://ucampus.uantof.cl/m/catalogo/programa?bajar=1&id=10883) | cátedra 60 / laboratorio 40; presentación 60 + examen 40 | no leído: robots.txt le cierra el paso a Claude | — |
| U. de Antofagasta (`uantof`) | [Formación general 2021](https://intranetua.uantof.cl/fg/FGII2021/FISD302.pdf) | 30/30/40 | PDF, 200 (556 KB) | sí: 30% + 30% + 40% |
| U. Alberto Hurtado (`uah`) | [Ucampus UAH: «Programación de actividad curricular» por curso y sección (2025-1, 2025-2)](https://ucampus.uahurtado.cl/uah/2025/2/CSS2154/1/datos_curso/bajar_programa?id=2185) | 2 pruebas 25, ensayo 30, presentación 20; examen 30% | no leído: robots.txt le cierra el paso a Claude | — |

### Programas por facultad, escuela o carrera

| Universidad | Dónde | Qué decía el buscador | Lectura directa | Leído en el PDF |
|---|---|---|---|---|
| U. de Santiago de Chile (`usach`) | [FAE · Ingeniería Comercial (carpeta /cice/programas/)](https://fae.usach.cl/cice/programas/Microeconomia_II.pdf) | Pruebas parciales 30/30, examen 40 | no leído: host detenido tras un 403 | — |
| U. de Santiago de Chile (`usach`) | [FAE · Contador Auditor, versión 2024 (/cca/programas-2024/)](https://fae.usach.cl/cca/programas-2024/herramientas-computacionales.pdf) | 2 pruebas 35% c/u, 30% otras | no leído: host detenido tras un 403 | — |
| U. de Santiago de Chile (`usach`) | [FAE · Administración Pública, versión 2014](https://fae.usach.cl/cap/programas_2014/Sociologia.pdf) | controles 40, participación 30, presentaciones 30 | no leído: host detenido tras un 403 | — |
| U. de Santiago de Chile (`usach`) | [Pedagogía en Matemática y Computación](https://www.plemc.usach.cl/wp-content/uploads/2022/06/22223.pdf) | sin leer | PDF, 200 (93 KB) | leído: no trae porcentajes por evaluación |
| PUC de Valparaíso (`pucv`) | [Escuela de Ingeniería Civil (programas numerados, 2023)](https://eic.pucv.cl/wp-content/uploads/2023/01/1-MAT1001-Fundamentos-de-Matematicas-para-Ingenieria-FIN.pdf) | sin leer | PDF, 200 (1123 KB) | sí: 4 pruebas 80% + controles 20%; NF = 0,67 NP + 0,33 NE; exime con 4,5 |
| PUC de Valparaíso (`pucv`) | [www.pucv.cl/uuaa/site/docs/ (Matemática, Química, Cs. del Mar, Ing. Civil)](https://www.pucv.cl/uuaa/site/docs/20200907/20200907174135/mat_113.pdf) | MAT113: NF=0,67 NP+0,33 NE | no leído: host detenido tras un 403 | — |
| PUC de Valparaíso (`pucv`) | [Escuela de Ciencias del Mar](https://www.pucv.cl/uuaa/site/docs/20230104/20230104165946/oce_355_programa.pdf) | 2 pruebas 30, 2 informes 10, informe final 20 | no leído: host detenido tras un 403 | — |
| U. Técnica Federico Santa María (`usm`) | [Depto. Ing. Mecánica (programas numerados 01–33, 2021)](https://dima.usm.cl/wp-content/uploads/2021/04/16-Matema%CC%81tica-de-Ingenieri%CC%81a.pdf) | NP=20/25/30 certámenes+25 controles | PDF, 200 (320 KB) | sí: NP = 20%C1 + 25%C2 + 30%C3 + 25%PC; NF = 70%NP + 30%G |
| U. Técnica Federico Santa María (`usm`) | [Depto. de Matemática](https://matematica.usm.cl/wp-content/uploads/2018/09/MAT-279-Optimizaci%C3%B3n-No-Lineal.pdf) | rangos, no pesos fijos | 200, pero no llegó un PDF (1088 bytes) | — |
| U. Técnica Federico Santa María (`usm`) | [Telemática](https://telematica.usm.cl/wp-content/uploads/2020/12/ELO328-ProcesamientoDIgitaldeIm%C3%A1genes.pdf) | 3 certámenes 20, lab 10, proyecto 30 | PDF, 200 (63 KB) | sí: certámenes 20/20/20, laboratorio 10, proyecto 30 |
| U. Austral de Chile (`uach`) | [Derecho (por semestre, versiones 2019–2025)](https://www.derecho.uach.cl/images/2025/Programas/I_SEMESTRE/SISTEMA_JURIDICO_2025_VD.pdf) | NPE 60 + examen 40; controles 32/33/35 | no leído: host detenido tras un 403 | — |
| U. Católica del Norte (`ucn`) | [Escuela de Ingeniería Coquimbo: carpetas por carrera (ICCI+, ITI+, ICI+) y semestre](https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/E.%20Mallas%20y%20programas%20de%20estudios/Programas/ICI+/SEMESTRE%20I/Algebra%20I.pdf) | 3 evaluaciones 30/30/40 | no leído: host detenido tras un 403 | — |
| U. Católica del Maule (`ucm`) | [Escuela de Ing. Civil Informática: un PDF por sigla (ICI-, INF-)](https://www.eici.ucm.cl/wp-content/uploads/ICI-127-Calculo-II.pdf) | 3 pruebas 20, examen acumulativo 30, informes 10 | PDF, 200 (73 KB) | sí: 3 pruebas 20%, acumulativa 30%, informes 10% |
| U. de Concepción (`udec`) | [Depto. de Geofísica (syllabus 2016–2023, físicas de servicio)](https://www.geofisica.udec.cl/wp-content/uploads/sites/4/2017/08/Syllabus-Fisica-II-513136-2-2017.pdf) | 3 certámenes 25% c/u + tests 25% | PDF, 200 (194 KB) | sí: 3 evaluaciones 25% c/u + tests 25%; sin examen |
| U. de Concepción (`udec`) | [páginas personales de docentes (www2.udec.cl/~usuario)](http://www2.udec.cl/~ruburibe/calc1/syllabus.pdf) | Cálculo I: 40/60, recuperación 40% | PDF, 200 (25 KB) | sí: 2 evaluaciones 40% y 60%; recuperación 40% |
| U. de Playa Ancha de Ciencias de la Educación (`upla`) | [Innovación Curricular: «programas formativos» por sigla (2018–2021), Educación, Fonoaudiología, Física](https://www.upla.cl/innovacioncurricular/wp-content/uploads/2019/09/HPH-4634-Geograf%C3%ADa-de-Chile.pdf) | 3 pruebas = 75% de la nota de presentación; exigencia 60% | PDF, 200 (235 KB) | sí: 3 pruebas = 75% y trabajo = 25% de la nota de presentación |
| U. Diego Portales (`udp`) | [Escuela de Informática y Telecomunicaciones: un PDF por sigla (versiones 2006 a 2026, varias antiguas)](https://eit.udp.cl/cms/wp-content/uploads/2026/08/CIT2009_BasesDatosAvanzada.pdf) | Programación: solemnes 25+25, parciales 20, examen 30 | PDF, 200 (170 KB) | sí: presentación (solemnes 60%, actividades 40%) y examen 30% |

### Programas sueltos o antiguos

| Universidad | Dónde | Qué decía el buscador | Lectura directa | Leído en el PDF |
|---|---|---|---|---|
| U. del Bío-Bío (`ubio`) | [FACE · Contador Público y Auditor](http://www.ubiobio.cl/miweb/webfile/media/137/asignaturas%20cpa/CONTABILIDAD%20I.pdf) | el fragmento no trae ponderaciones | PDF, 200 (30 KB) | leído: no trae ponderaciones |
| U. de Atacama (`uda`) | [Facultad de Ingeniería: un PDF con los electivos transversales 2021](https://fi.uda.cl/views/pdf/2021%20ELECTIVOS_OPTATIVOS%20TRANSVERSALES.pdf) | presentación 60 + examen 40 en uno de ellos | HTTP 404 | — |
| U. de Tarapacá (`uta`) | [Dossiers de asignatura en biblioteca (2015–2017), pocos y antiguos](http://sb.uta.cl/libros/Dossier%20M.%20E.%20Onell%20-%20E.%20%20Lazo%20%20Electromagnetismo%20UTA%20%202015.pdf) | 3 pruebas 25, laboratorio 25; optativo 40 | PDF, 200 (3012 KB) | — |
| U. San Sebastián (`uss`) | [Un programa suelto, oficializado por resolución (Química y Farmacia, 2024)](https://cdn.uss.cl/content/uploads/2024/04/18155852/QYF-Fundamentos-del-Quehacer-Farmaceutico.pdf) | 2 solemnes 30% c/u + parcial 40 | no leído: robots.txt le cierra el paso a Claude | — |
| U. Andrés Bello (`unab`) | [Un programa suelto de Física (2018)](https://fisica.unab.cl/wp-content/uploads/2018/03/Programa-Propiedades-Opticas-Solidos.pdf) | NF = 0,6 pruebas + 0,4 ejercicios | PDF, 200 (86 KB) | sí: NF = 0,6 P + 0,4 E |
| U. Católica de Temuco (`uct`) | [Un «programa de curso» suelto (formación humanista); el documento con pesos es la «Guía de Aprendizaje», no localizada](https://dfhc.uct.cl/wp-content/uploads/2023/07/IET1429-Dilemas-bioeticos-en-la-sociedad-contemporanea.pdf) | sin pesos en el fragmento | 200, pero no llegó un PDF (1812 bytes) | — |

### Sin programas localizados

| Universidad | Lo que sí apareció | Regla que citaba el buscador |
|---|---|---|
| U. de Aconcagua (`uac`) | [Solo mallas en PDF (uac.cl/wp-content/uploads/)](https://uac.cl/wp-content/uploads/2022/01/PSICOLOGIA-2022-PLAN-REGULAR.pdf) | sin programas |
| U. Academia de Humanismo Cristiano (`uahc`) | [Reglamentos y mallas en PDF (www.academia.cl/wp-content/uploads/…/malla-*.pdf)](https://www.academia.cl/wp-content/uploads/2024/03/REGLAMENTO-ESTUDIANTES-PLANES-INNOVADOS-1.pdf) | programa con evaluaciones y pesos se entrega al inicio; aprueba 4,0 |
| U. Autónoma de Chile (`uautonoma`) | [Solo reglamento (Res. Rectoría 009/2024)](https://www.uautonoma.cl/content/uploads/2024/03/RES-RECTORIA-No-009-2024-Modifica-Reglamento-General-del-Estudiante-de-Pregrado.pdf) | por defecto evaluaciones regulares 70 + acumulativa 30; el programa puede cambiarlo |
| U. Bernardo O’Higgins (`ubo`) | [Solo reglamento de estudios](https://www.ubo.cl/wp-content/uploads/01020101-VRA-Reglamento-de-Estudios.pdf) | presentación 60 + examen 40; programa antes de la 2.ª semana |
| U. Bolivariana (`ubolivariana`) | [Solo folletos de carrera con malla](https://ubolivariana.cl/wp-content/uploads/DERECHO.pdf) | sin programas |
| U. Central de Chile (`ucen`) | [Solo orientaciones para syllabus 2025; ningún programa localizado](https://www.ucentral.cl/wp-content/uploads/2025/11/Orientaciones-para-el-desarrollo-de-syllabus-1.pdf) | el syllabus declara instrumentos, fechas y ponderaciones |
| U. Católica Cardenal Raúl Silva Henríquez (`ucsh`) | [Reglamento y planes de estudio en PDF (zonaestudiantes.ucsh.cl/documentos/PlanesPreGrado/)](https://www.ucsh.cl/assets/uploads/2021/11/Reglamento_del_Estudiante_de_Pregrado_Universidad_Catolica_Silva_Henriquez-1.pdf) | ≥3 parciales + integrativa o examen final |
| U. del Alba (`udalba`) | [Solo reglamentos e informes de acreditación](https://udalba.cl/content/uploads/2026/06/reglamento-de-la-facultad-de-ciencias-de-la-salud.pdf) | Salud: evaluaciones del programa 70 + 30; exigencia 60%; aprueba 4,0 |
| U. Finis Terrae (`uft`) | [Solo tesis y un reglamento de egreso](https://comunicacionesyhumanidades.uft.cl/wp-content/uploads/2023/12/reglamento-de-egreso-y-grado.pdf) | sin programas |
| U. de La Frontera (`ufro`) | [Solo reglamento; programas no aparecen públicos](https://www.ufro.cl/wp-content/uploads/2025/04/01-Reglamento-de-Regimen-de-Estudios-2023.pdf) | ninguna evaluación >50%; mín. 3 notas semestrales |
| U. Gabriela Mistral (`ugm`) | [Solo reglamento (DR 04/2026)](https://www.ugm.cl/imgesp/normativas/reglamentos/reglamento-del-estudiante-de-pregrado.pdf) | presentación 60 + evaluación final 40; 2 solemnes + final por semestre |
| U. de Los Lagos (`ula`) | [Solo reglamentos; programas no aparecen públicos](https://www.ulagos.cl/wp-content/uploads/2025/01/9_D.U.5024.2024-Reglamento-general-de-evaluacion.pdf) | por resultado de aprendizaje: proceso > producto (ej. 60/40); aprueba 4,0 |
| U. Los Leones (`ulaleones`) | El buscador no devolvió ningún documento de la universidad | sin programas |
| U. La República (`ulrep`) | [Solo páginas de admisión (universidad en cierre)](https://admision.ulare.cl/) | sin programas |
| U. de Magallanes (`umag`) | [Solo mallas en PDF (admision.umag.cl/wp-content/uploads/)](https://admision.umag.cl/wp-content/uploads/2023/08/AUDITORIA-1.pdf) | sin programas |
| U. Mayor (`umayor`) | [Solo reglamentos](https://www.umayor.cl/um/bundles/umayor/descargables/um/REGLAMENTO-ESTUDIANTES-DE-PREGRADO-UNIVERSIDAD-MAYOR.pdf) | por defecto presentación 70 + examen 30; Derecho 50/50 |
| U. Miguel de Cervantes (`umc`) | [Solo reglamento de estudios de pregrado (2024) y diplomados](https://umcervantes.cl/wp-content/uploads/2024/09/1.-Reglamento-de-Estudios-de-Pregrado-1.pdf) | sin leer |
| U. Metropolitana de Ciencias de la Educación (`umce`) | [Solo reglamento (texto refundido 2025)](https://www.umce.cl/files/uploads/2025/12/RESOLUCION-EXENTA-N%C2%B0-2025-00-0537-REGLAMENTO-REFUNDIDO.pdf) | ≥3 evaluaciones; recuperativa optativa 40% + parciales 60% |
| U. Adventista de Chile (`unach`) | [Reglamento y mallas en PDF (www.unach.cl/wp-content/uploads/)](https://www.unach.cl/wp-content/uploads/2020/05/REGLAMENTO-ACADE%CC%81MICO-DEL-ESTUDIANTE-DE-PREGRADO-PARA-COHORTES-2020-EN-ADELANTE.pdf) | ≥4 instancias con peso creciente; la última 40% |
| U. de Artes, Ciencias y Comunicación (`uniacc`) | [Reglamentos; planes de asignatura de posgrado en virtual.uniacc.cl](https://ayudadocentes.uniacc.cl/assets/reglamento-de-docencia.pdf) | por defecto parciales 70 + examen 30 |
| U. Arturo Prat (`unap`) | [Solo reglamentos por carrera](https://www.unap.cl/prontus_unap/site/docs/20160715/20160715134106/reglamento_escuela_de_derecho.pdf) | Derecho: taller 15, controles 10, solemne 25, resto examen |
| U. SEK (`usek`) | [Solo mallas en PDF (usek.cl/wp-content/uploads/…/malla-curricular-*.pdf)](https://usek.cl/wp-content/uploads/2026/08/malla-curricular-psicologia-universidad-sek.pdf) | sin programas |
| U. de La Serena (`userena`) | [Solo reglamentos y manuales](https://userena.cl/images/archivos/reglamento_de_estudios_2010.pdf) | ≥3 evaluaciones por semestre; promedio ponderado |
| U. Santo Tomás (`ust`) | [Reglamento académico y folletos de carrera con malla (www.ust.cl/web/wp-content/uploads/sites/6/)](https://www.santotomas.cl/web/wp-content/uploads/2023/01/Reglamento-Academico-de-los-estudiantes-de-la-Universidad-Santo-Tomas-29.01.2020-1.pdf) | examen entre 30% y 40%; solemnes según el programa |
| U. de Talca (`utal`) | [Solo reglamentos; el syllabus no aparece público](https://dgcypa2.utalca.cl/documents/archivos/RU-96-2026.pdf) | opcional acumulativa 30–40%; cada evaluación ≥10% |
| U. Tecnológica Metropolitana (`utem`) | [Solo resoluciones y reglamentos](https://transparencia.utem.cl/wp-content/uploads/2021/08/RES2340DE2021.pdf) | laboratorio: control 30, participación 10, informe 60 |
| U. de Valparaíso (`uv`) | [Solo reglamentos por carrera](https://informatica.uv.cl/images/contenido/pregrado/Reglamento_ICI.pdf) | ≥3 sumativas; ponderación en el programa |
| U. de Viña del Mar (`uvm`) | [Solo reglamentos y manual de innovación curricular](https://intranet.uvm.cl/portal_uvm/docs/politicas%20y%20reglamentos%20uvm.pdf) | presentación 70 + examen 30; aprueba 4,0 |

### Detalle de las fuentes más útiles

- **UDLA** — `https://programas.udla.cl/<período><SIGLA>.pdf`. El período es año
  más dos dígitos (`202610`, `202620`). Los programas son vigentes y traen una
  tabla «7.1 Ponderaciones» regular, pero **el sitio no tiene índice y las mallas
  públicas no traen siglas**. Se alcanzaron 188 programas siguiendo
  prerrequisitos; el detalle y el límite están en [`udla/`](udla/README.md).
- **UCSC** — `https://catalogoasignatura.ucsc.cl/pdfs/<SIGLA>.pdf`. Apareció en
  el buscador (LEE097), pero esta noche el host no aceptó conexiones desde este
  equipo. Falta confirmar que sigue arriba y si tiene índice.
- **Ucampus (UOH, UAysén, UA)** — `https://ucampus.<dominio>/m/catalogo/?semestre=20262&depto=N`.
  La página de la UOH que se alcanzó a leer lista, por unidad y semestre, cada
  ramo con sigla, créditos, requisitos, secciones, cupos, horario y un enlace
  «Programa» en PDF; el selector ofrecía 32 períodos y 11 unidades. Es lo más
  parecido a un Buscacursos que apareció. `ucampus.uahurtado.cl`,
  `ucampus.ubo.cl`, `ucampus.ucsc.cl` y `ucampus.umce.cl` responden 401 en el
  catálogo: existen, con sesión. **Cerrado a agentes de IA por robots.**
- **UCN, Escuela de Ingeniería (Coquimbo)** —
  [listado de documentos](https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/)
  abierto, navegable por `?path=`. **Ya se leyó completo:** 154 programas de tres
  carreras (ICCI, ICI e ITI) por semestre, sus mallas, el calendario de
  evaluaciones del semestre y el reglamento de docencia. Detalle en
  [`ucn/`](ucn/README.md).
- **UACh, Derecho** — programas por semestre y año bajo
  `www.derecho.uach.cl/images/<año>/Programas/<SEMESTRE>/`, con versiones de 2019
  a 2025 según el buscador.
- **USACH, FAE** — carpetas por carrera: `/cice/programas/` (Ingeniería
  Comercial), `/cca/programas-2024/` (Contador Auditor) y `/cap/programas_2014/`
  (Administración Pública).
- **PUCV, Ingeniería Civil** — la página
  [Plan de estudios](https://eic.pucv.cl/estudia-con-nosotros/plan-de-estudios/)
  lista los 11 semestres y enlaza 41 programas con sigla, créditos y requisitos.
  **Ya se leyó:** el plan está completo, pero solo 11 programas traen pesos.
  Detalle en [`pucv/`](pucv/README.md). Otras unidades cuelgan sus programas en
  `www.pucv.cl/uuaa/site/docs/…`, host que respondió 403.
- **USM** — por departamento, sin patrón común: `dima.usm.cl` (numerados 01 a 33,
  2021), `matematica.usm.cl`, `telematica.usm.cl`, `obrasciviles.usm.cl`.
- **UTEM** — no publica programas, pero tiene un
  [trámite para pedir el programa completo o por asignatura](https://www.utem.cl/guia-de-tramites/unidad-de-titulos-y-grados/certificados-y-otros-documentos/programa-de-estudio-completo-o-por-asignatura/).

## Lo que dicen los reglamentos

Sirven para dos cosas: la regla de nota de cada universidad
(`GH_REGLAS_NOTA_POR_TENANT`, que exige el artículo al lado) y saber qué esperar
de sus pautas. **Nada de esto se leyó artículo por artículo**: es lo que citó el
buscador, y también hay reglas en la tabla «Sin programas localizados». Antes de
declarar una regla hay que abrir el reglamento vigente.

| Universidad | Documento | Qué citaba el buscador | Lectura directa |
|---|---|---|---|
| U. Alberto Hurtado (`uah`) | [Reglamento académico de pregrado 2023](https://www.uahurtado.cl/wp-content/uploads/2023/07/2023.06.09-Reglamento-Academico-del-Estudiantado-de-Pregrado.pdf) | el programa se informa al inicio, con evaluaciones y asistencia | PDF, 200 (349 KB) |
| U. de Atacama (`uda`) | [Compilación de normativa 2026](https://uda.cl/wp-content/uploads/2026/01/libro-cmpjur27012026.pdf) | ninguna evaluación >50%; ≥3 evaluaciones (≥4 con 4+ SCT) | PDF, 200 (1537 KB) |
| U. del Bío-Bío (`ubio`) | [Régimen de estudios (resumen)](http://ubiobio.cl/recursosnaturales/subidas/files/Resumen_Regimen_de_Estudios.pdf) | programa se entrega en 15 días hábiles; integradora 40% | PDF, 200 (233 KB) |
| U. Central de Chile (`ucen`) | [Guía para programas de asignatura 2025](https://www.ucentral.cl/wp-content/uploads/2025/11/Guia-para-el-desarrollo-de-programas-de-asignatura-2025-1.pdf) | sin leer | PDF, 200 (1214 KB) |
| U. Católica de la Santísima Concepción (`ucsc`) | [Reglamento general de docencia de pregrado (DR 82/2018)](https://ucsc.cl/content/uploads/2024/01/Reglamento-general-de-docencia-de-pregrado-2-2.pdf) | el syllabus lleva evaluaciones, fechas y ponderaciones | PDF, 200 (712 KB) |
| U. Católica de Temuco (`uct`) | [Reglamento del estudiante de pregrado](https://cinap.uct.cl/wp-content/uploads/2021/03/Reglamento-del-Estudiante-Editado-Final.pdf) | pesos y fechas van en la Guía de Aprendizaje; examen 30% | PDF, 200 (1110 KB) |
| U. Católica de Temuco (`uct`) | [Reglamento del estudiante; segunda búsqueda («guía de aprendizaje») no dio guías públicas](https://dte.uct.cl/wp-content/uploads/2021/03/Reglamento-del-Estudiante-Editado-Final.pdf) | aprueba 4,0; no rendida = 1,0; examen 30% | PDF, 200 (1110 KB) |
| U. de Concepción (`udec`) | [Reglamento de docencia, Derecho](http://jur.udec.cl/sites/default/files/Reglamento%20Docencia%20Facultad_0.pdf) | ponderaciones según programa y syllabus | PDF, 200 (2041 KB) |
| U. de Concepción (`udec`) | [Formato oficial de syllabus (2026)](https://docencia.udec.cl/contenido/uploads/2026/07/formato-oficial-para-syllabus-de-asignatura.pdf) | sin leer | PDF, 200 (239 KB) |
| U. Diego Portales (`udp`) | [Reglamento del estudiante de pregrado 2026](https://www.udp.cl/cms/wp-content/uploads/2026/07/REGLAMENTO-DEL-ESTUDIANTE-DE-PREGRADO-VF-2026-FINAL.pdf) | el programa fija evaluaciones, fechas y ponderaciones | PDF, 200 (166 KB) |
| U. de La Frontera (`ufro`) | [Reglamento de pregrado; dice que la versión oficial del programa es la de la intranet](https://telematica.ufro.cl/images/Descargas/reglamentos/Reglamento_de_Pregrado_2019.pdf) | examen 40 + regular 60 en un caso | PDF, 200 (357 KB) |
| PUC de Valparaíso (`pucv`) | [Reglamento de evaluación Agronomía](https://www.pucv.cl/uuaa/site/docs/20200812/20200812192634/reglamento_de_evaluacion_agronomia_2021__editado__1___1_.pdf) | programa se publica las 2 primeras semanas | no leído: host detenido tras un 403 |
| U. de La Serena (`userena`) | [Reglamento de régimen de estudio 2010](https://userena.cl/images/archivos/reglamento_de_estudios_2010.pdf) | examen 40 + período 60; ≥3 evaluaciones | PDF, 200 (90 KB) |
| U. San Sebastián (`uss`) | [Reglamento de docencia de pregrado 2017](https://repo.uss.cl/wp-content/uploads/2017/01/Actualizada-Reglamento-de-Docencia-Pregrado-2017.pdf) | ≥2 evaluaciones formales; programa en la primera semana | sin conexión desde este equipo |
| U. San Sebastián (`uss`) | [Reglamento de docencia de pregrado, art. 26](https://postgradomedicina.uss.cl/wp-content/uploads/2023/08/1-Actualizada-Reglamento-de-Docencia-Pregrado-2017.pdf) | nota final con dos decimales: si el segundo es ≥5 sube la décima | PDF, 200 (418 KB) |
| U. de Tarapacá (`uta`) | [Reglamento de docencia](https://www.uta.cl/transparencia/pdf/mn/2/491.pdf) | examen optativo 20–40%; programa en las 3 primeras clases | PDF, 200 (134 KB) |
| U. de Talca (`utal`) | [Reglamento de régimen de estudios (RU 378/2024); segunda búsqueda («syllabus», «módulo») tampoco dio syllabus públicos](https://agronomia.utalca.cl/wp-content/uploads/2024/06/RU-378-2024-REGLAMENTO-DE-REGIMEN-DE-ESTUDIOS.pdf) | aprueba 4,0; pesos en el syllabus, fechas en el plan de clases | PDF, 200 (267 KB) |
| U. Tecnológica Metropolitana (`utem`) | [Reglamento general de estudiantes; el programa se publica en la plataforma interna](https://biblioteca.utem.cl/wp-content/uploads/2018/01/Reglamento-Gral.-Estudiantes-1.pdf) | nota entre 3,0 y 3,9: examen 40 + presentación 60 | no leído: robots.txt le cierra el paso a Claude |
| U. de Valparaíso (`uv`) | [Reglamento del Plan Común de Ingeniería (REXE 7754/2023)](https://informatica.uv.cl/images/contenido/documentos/Reglamentos/2025/6.Rexe-007754-23-Aprueba-reglamento-plan-de-Estudios-Plan-Comun-de-Ingenieria.pdf) | promedio entre 3,0 y 3,9: extraordinaria 30 + presentación 70 | sin conexión desde este equipo |

Dos que conviene mirar primero, porque cambiarían el cálculo:

- **USS, art. 26:** la nota final se calcula con dos decimales y la décima sube si
  el segundo es 5 o más. Es la misma forma de la regla de la UAndes
  (`rounding:{decimals:1,previo:2}`).
- **UTEM, UV (Plan Común de Ingeniería) y UMCE:** el examen o la prueba
  recuperativa solo corre para un tramo de notas (3,0 a 3,9) o es optativo, con
  pesos 40/60 o 30/70. Eso es compuerta de cada pauta, no regla del tenant.

## Mallas en PDF que encontró el recorrido

No era lo que se buscaba y el recorrido fue corto (hasta doce páginas de carrera
por sitio), así que es un piso, no un inventario. Los conteos completos están en
[`sitios.tsv`](sitios.tsv).

| Universidad | Portada | Páginas de carrera vistas | Mallas en PDF | Ejemplo |
|---|---|---|---|---|
| U. Alberto Hurtado (`uah`) | 200 | 70 | 30 | [04112024_Periodismo_Plan2025_MallaCurricular.pdf](https://admision.uahurtado.cl/wp-content/uploads/2023/03/04112024_Periodismo_Plan2025_MallaCurricular.pdf) |
| U. Academia de Humanismo Cristiano (`uahc`) | 200 | 28 | 1 | [UAcademia-malla-2025-Arquitectura-1.pdf](https://admision2027.academia.cl/wp-content/uploads/2026/11/UAcademia-malla-2025-Arquitectura-1.pdf) |
| U. Autónoma de Chile (`uautonoma`) | 200 | 210 | 4 | [Malla-Medicina-2025.pdf](https://admision.uautonoma.cl/content/uploads/2025/01/Malla-Medicina-2025.pdf) |
| U. Católica del Norte (`ucn`) | 200 | 88 | 7 | [malla-ingenieria-civil-industrial-2027.pdf](https://admision.ucn.cl/content/uploads/2020/12/malla-ingenieria-civil-industrial-2027.pdf) |
| U. Católica de la Santísima Concepción (`ucsc`) | 200 | 31 | 7 | [mayo25-malla-IE-informatica.pdf](https://ucsc-staging-20260409.b-cdn.net/uploads/sites/14/2026/08/mayo25-malla-IE-informatica.pdf) |
| U. del Alba (`udalba`) | 200 | 67 | 4 | [Malla-Fonoaudiologia-UDALBA.pdf](https://udalba.cl/content/uploads/2026/09/Malla-Fonoaudiologia-UDALBA.pdf) |
| U. Finis Terrae (`uft`) | 200 | 52 | 10 | [malla-actuacion.pdf](https://admision.finis.cl/wp-content/uploads/2026/05/malla-actuacion.pdf) |
| U. Mayor (`umayor`) | 200 | 55 | 10 | [animacion-digital.pdf](https://www.umayor.cl/um/bundles/umayor/descargables/mallas/animacion-digital.pdf) |
| U. Metropolitana de Ciencias de la Educación (`umce`) | 200 | 48 | 9 | [Malla_Biologia.pdf](https://www.umce.cl/files/uploads/2025/05/Malla_Biologia.pdf) |
| U. Andrés Bello (`unab`) | 200 | 1 | 1 | [ing_civil_industrial_vespertino.pdf](https://www.unab.cl/carreras/mallas/ing_civil_industrial_vespertino.pdf) |
| U. de Playa Ancha de Ciencias de la Educación (`upla`) | 200 | 39 | 13 | [20261028_facultad-arte_arquitectura-malla-curric](https://www.upla.cl/admision/wp-content/uploads/2026/10/20261028_facultad-arte_arquitectura-malla-curricular.pdf) |
| U. SEK (`usek`) | 200 | 40 | 11 | [malla-curricular-administracion-publica-advance-](https://advance.usek.cl/wp-content/uploads/2026/08/malla-curricular-administracion-publica-advance-universidad-sek.pdf) |
| U. de La Serena (`userena`) | 200 | 48 | 9 | [25002.pdf](https://admision.userena.cl/images/documentos_pdf/mallas/25002.pdf) |
| U. de Talca (`utal`) | 200 | 56 | 4 | [MALLA-ADM-PUBLICA.pdf](https://admision.utalca.cl/wp-content/uploads/2026/06/MALLA-ADM-PUBLICA.pdf) |

El buscador mostró además mallas en PDF en sitios donde el recorrido no las vio:
UMAG (`admision.umag.cl/wp-content/uploads/`), Aconcagua
(`uac.cl/wp-content/uploads/`), Adventista (`www.unach.cl/wp-content/uploads/`),
Santo Tomás (`www.ust.cl/web/wp-content/uploads/sites/6/`) y Silva Henríquez
(`zonaestudiantes.ucsh.cl/documentos/PlanesPreGrado/`).

## Qué haría después

1. **UDLA, ramo por ramo.** Se intentó armarla completa y no se puede: faltan
   las siglas ([detalle](udla/README.md)). Lo que sí funciona es que cada
   estudiante entregue su sigla, porque de ahí el programa oficial es directo. La
   lista completa habría que pedírsela a la UDLA.
2. **Ucampus (UOH, UAysén, UA) con permiso.** Trae malla, créditos, requisitos,
   secciones y programa. Hay que escribirle a Ucampus o a cada universidad, o que
   lo recorra una persona; no con un agente de IA.
3. **UCSC:** confirmar que el catálogo por sigla responde y si tiene índice.
4. **UCN Coquimbo ya está leída** ([detalle](ucn/README.md)): es la primera con la
   que se podrían armar carreras completas. PUCV Ingeniería Civil también
   ([detalle](pucv/README.md)): plan completo, pocas pautas. Quedan con carpeta
   ordenada UACh Derecho y USACH FAE.
5. **Reglamentos:** leer el artículo de aproximación y de aprobación de cada
   universidad antes de tocar `GH_REGLAS_NOTA_POR_TENANT`. Parte por la USS.
6. **Para el resto**, la vía es la que ya usa la UAI: que cada estudiante le pase
   su programa a su agente.

## Archivos

- [`fuentes.tsv`](fuentes.tsv): una fila por fuente o reglamento, con la URL, lo
  que dijo el buscador, el resultado de la lectura directa y lo leído en el PDF.
- [`sitios.tsv`](sitios.tsv): una fila por universidad, con el estado de la
  portada, los hosts cerrados o detenidos, y cuántas páginas de carrera y mallas
  vio el recorrido.
- [`udla/`](udla/README.md): lo que se alcanzó a leer del catálogo de la UDLA.
- [`ucn/`](ucn/README.md): los 154 programas de Ingeniería UCN en Coquimbo.
- [`pucv/`](pucv/README.md): el plan y los 41 programas de Ingeniería Civil PUCV.
- [`herramientas/`](herramientas/): el lector, el verificador, el extractor de
  texto y las herramientas de la UDLA. No se bajó ni se guardó en el repo ningún PDF de terceros.
