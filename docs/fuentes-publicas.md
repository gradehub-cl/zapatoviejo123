# Fuentes públicas de universidades

Corte: **12 de noviembre de 2026, hora de Chile**. Investigación, sin lectores de
producción, workflows, consultas a Supabase ni cambios en `src/` o SQL.

Las oportunidades más concretas son fechas de evaluaciones en FEN, UC y Derecho
UDD, y salas diarias de UAI. No apareció un catálogo abierto completo con siglas,
créditos y requisitos para las cinco universidades. Un horario diario no prueba
la recurrencia semanal; una ventana de exámenes no fija la fecha de cada ramo.

## Cómo se verificó

Las lecturas directas usaron `GradeHubBot/1.0 (+https://gradehub.cl)`, una petición
a la vez y al menos 1,1 segundos entre inicios de petición, incluidos robots y
redirecciones. Se consultó robots antes de cada host. No se inició sesión ni se
usaron cuentas, cookies de usuarios, navegadores para eludir desafíos, proxies o
cambios de agente. La búsqueda web se usó para descubrir URLs; los estados HTTP
que se indican corresponden a lecturas directas identificadas.

Ante 403 se detuvo **ese host**, sin reintentos. Una página indexada no se declara
legible por el bot si su lectura falló. «No localizado» significa que no se encontró
en las páginas revisadas, no que se haya demostrado su inexistencia. La frecuencia
indicada es la granularidad del dato o una propuesta de revisión, **no un SLA**.

Se contrastaron `src/data/`, las mallas de raíz cargadas bajo demanda y la guía de
datos. Las mallas UAndes/UDD no están en `src/data/`: son `mallas-uandes.js` y
`mallas-udd.js`. Se leyó el plan de Buscacursos en el checkout principal, solo en
lectura: `.claude/prompt-codex-buscacursos.md` no está versionado en este main.
También se contrastó la [PR #986](https://github.com/gradehub-cl/zapatoviejo123/pull/986),
abierta: su corrida y sus permisos no se dan por desplegados.

### Convenciones de permisos

Cada fila remite a un código **R** del registro de robots al final y a estas notas:

- **T0:** no se localizó una licencia de reutilización en el documento/pie revisado.
  Poder leer una página y robots permisivo no conceden por sí solos esa licencia.
- **T-UAI:** [Términos UAI](https://www.uai.cl/terminos-y-condiciones), HTTP 200.
  Mencionan uso particular y no comercial, y otra cláusula permite reproducción
  con atribución. Incluyen subdominios. **Pedir aclaración/autorización antes de
  incorporar estas fuentes a un producto comercial**; no tratar la segunda
  cláusula como permiso ilimitado. Esta PR solo investiga.
- **T-UA:** [Política UAndes](https://www.uandes.cl/informacion-general/politicas-de-privacidad/),
  HTTP 200: también limita a uso particular/no comercial y permite reproducción
  con fuente. Misma cautela antes de producción; revisar alcance para Admisión.
- **T-UC:** [Políticas UC](https://protecciondedatos.uc.cl/politicas), ver estado en
  R18. La página respondió **403**: no se leyó el texto ni se certifica una licencia.
- **T-UDD:** [Privacidad UDD](https://www.udd.cl/politicas-de-privacidad/), HTTP 200;
  no se encontró una autorización de extracción/reutilización en ese texto.
- **T-UCH:** [Privacidad Ucampus](https://ucampus.uchile.cl/m/paginas/privacy),
  HTTP 200; no se encontró una licencia de catálogo. No autoriza datos privados.

## UC (`uc`)

| Dato y URL exacta | Formato y acceso | Actualización / cobertura comprobada | Robots y términos | Lectura | Qué hay hoy / qué se gana |
|---|---|---|---|---|---|
| Catálogo, siglas, créditos y requisitos: [Catálogo UC](https://catalogo.uc.cl/); [ficha MAT1610 ya citada en el benchmark](https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=MAT1610) | HTML público según lector/benchmark existente; no se repitió la extracción | Catálogo por versión de curso, no necesariamente por sección. Evidencia local de fichas: septiembre 2026; no se atribuye vigencia 2027 | R2; T0/T-UC | HTML frágil, lector existente | `catalogo_uc`, `cursos-uc.js`, `bin/catalogo-uc-*`; mantenerlos. Los requisitos detallados aún no se integran como relaciones de malla |
| Mallas/cohortes: [Admisión](https://admision.uc.cl/carreras/) y [Mallas Ingeniería](https://mallas.ing.uc.cl/) | Admisión: 403/desafío, detener. Ingeniería: SPA HTML 200, sin explorar API nueva | Las fuentes ya usadas incluyen C2022 de Ingeniería y malla 2025 de Comercial; el año del PDF no reemplaza la cohorte. No se verificó una serie completa de cohortes | R3, R4; T0/T-UC | PDF/SPA que puede cambiar | `mallas-uc.js`, `carreras.js`, `creditos.js`. No reemplazar mallas de alumnos antiguos por la última admisión |
| Secciones, docente, módulo, sala y vacantes: [Buscacursos](https://buscacursos.uc.cl/?cxml_semestre=2026-2&cxml_sigla=FIS1514) | HTML público ya investigado en #986; aquí solo robots | #986 documenta lectura local de 2026-2. No se reconsultó el selector ni se presume publicado 2027-1 | R1; T0; `ai-train=no` | HTML frágil con parser y guarda ya propuestos | **No hacer otro lector.** #986 cubre NRC/sección, horarios y vacantes. Faltan comprobar Actions, SQL manual y consumo del cliente. Requisitos están fuera de esa PR |
| Calendario académico: [Registros Académicos](https://registrosacademicos.uc.cl/calendario-academico-uc/) | HTML; **403** con verificación de seguridad | No se certificó el contenido actual. La portada sí respondió 200 antes del bloqueo | R5; T0/T-UC | No automatizable desde esta sesión | Una futura agenda institucional debe esperar acceso permitido. No sustituir el calendario UC con el de una facultad |
| Evaluaciones por ramo: [Derecho UC](https://derecho.uc.cl/carrera-y-programas/carrera-de-derecho/alumnos/evaluaciones/), [calendario escrito 2026-2](https://derecho.uc.cl/wp-content/uploads/2026/07/Calendario-evaluaciones-escrito-2026-2.pdf) | HTML y PDF públicos; verificación directa | 2026-2; la página enlaza también exámenes de fechas particulares y rezagos | R6; T0/T-UC | PDF que cambia cada semestre | Fechas oficiales complementan Agenda; solo Derecho y los cursos de esa publicación. Distinguir escrito, oral, rezago y sección |
| Evaluaciones de otras unidades: [Construcción Civil](https://construccioncivil.uc.cl/pregrado/normativas-e-informacion/), [Matemáticas 2026-2](https://construccioncivil.uc.cl/wp-content/uploads/2026/07/Calendario-de-Interrogaciones-y-Examenes-2026-segundo-semestre.-MATEMATICAS.pdf) | HTML índice + PDF público 200; también enlaza Física/Economía/Construcción | 2026-2; revisión semestral y ante cambios del índice | R7; T0/T-UC | PDF que cambia cada semestre | Hay fechas por sigla/sección en publicaciones parciales. **MAT1100 y MAT1610 no son equivalentes**; tampoco se extiende una fecha de una sección a otras |
| Programas con ponderaciones: [fichas del Catálogo](https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=IIC1103) | HTML público documentado por benchmark existente; no se volvió a descargar | Versión de ficha, no garantía de programa de una sección/período actual | R2; T0/T-UC | HTML frágil | Ya hay pautas transcritas en `uc-pautas.js` y revisión de candidatos. No publicar automáticamente un programa genérico como pauta vigente de todas las secciones |
| Módulo → hora: [PDF oficial desde 2023-2](https://registrosacademicos.uc.cl/wp-content/uploads/2023/05/Estructura-de-modulacion-horaria-desde-2023-22.pdf) | PDF ya verificado en la tarea «Clases hoy»; no se reintentó tras el 403 | Tabla vigente desde 2023-2 según documento; no se certifica una modificación posterior | R5; T0/T-UC | PDF estable de referencia | La [PR #1107](https://github.com/gradehub-cl/zapatoviejo123/pull/1107) propone la tabla de datos; no duplicarla aquí. Es hora local de Chile; no confundir módulos de clases con bloques de examen |

## FEN y fuentes generales de U. de Chile (`fen`)

| Dato y URL exacta | Formato y acceso | Actualización / cobertura comprobada | Robots y términos | Lectura | Qué hay hoy / qué se gana |
|---|---|---|---|---|---|
| Catálogo FEN: [Ucampus FEN](https://ucampus.uchile.cl/m/fen_catalogo/). Comparación: [catálogo FCFM](https://ucampus.uchile.cl/m/fcfm_catalogo/) | FEN: **401**, requiere acceso; no se inició sesión. FCFM es otra facultad, ver estado R11 | No se verificó catálogo abierto completo de FEN por período | R11; T-UCH | No disponible para FEN sin sesión | `carreras.js` y créditos/mallas locales no se completan copiando FCFM. Una API de Ucampus no es pública solo porque exista una ruta |
| Mallas: [Comercial](https://pregrado.fen.uchile.cl/ic_malla/), [IICG](https://pregrado.fen.uchile.cl/iicg_malla/), [Auditoría](https://pregrado.fen.uchile.cl/ca_malla/) | HTML + PDF enlazados, índices 200 sin sesión | Enlaces actuales `malla_ic_le2026b.pdf`, `malla_ic_la2026b.pdf`, `malla_iicg2026C.pdf`, `malla_ca2026C.pdf`, bajo `/wp-content/uploads/2026/11/`. Publicación no prueba cohorte aplicable | R8; T0 | PDF que cambia al cambiar plan | Ya hay tres mallas. Ganancia: detectar versiones nuevas y revisar manualmente diferencias; no actualizar una cuenta automáticamente |
| Secciones, horarios, salas y vacantes: [Ucampus](https://ucampus.uchile.cl/) / [portal de Pregrado](https://pregrado.fen.uchile.cl/) | Portadas públicas 200; detalle de FEN no confirmado abierto | No se obtuvo oferta FEN de 2026-2 con esos campos | R8, R11; T0/T-UCH | HTML/portal; sin feed abierto verificado | No hay equivalente de Buscacursos FEN confirmado en esta revisión. `docencia.fen.uchile.cl` citado en datos no resolvió DNS: R10 |
| Calendario propio: [Secretaría de Estudios](https://secretariaestudios.fen.uchile.cl/calendario-de-actividades) | HTML 200 sin sesión, actividades/fechas y vista mensual | Portada identifica Primavera 2026; calendario vivo, revisar al menos al cambiar semestre | R9; T0 | Estable con estructura HTML; necesita probar selector/vista mensual | Se pueden incorporar fechas institucionales con alcance FEN, separadas de las evaluaciones individuales |
| Calendario general: [U. de Chile](https://uchile.cl/presentacion/asuntos-academicos/pregrado/calendario-academico/calendario-academico) | HTML descubierto por índice; lectura directa no completada porque robots cerró conexión | Índice describe 2026 e indica que las facultades fijan sus calendarios particulares. **No verificado por bot** | R12; T0 | Pendiente de acceso | Referencia general, no reemplazo del calendario FEN ni fechas de cada examen |
| Exámenes: [anuncio oficial Primavera 2026](https://secretariaestudios.fen.uchile.cl/noticia/ver/publicacion-del-calendario-de-examenes-primavera-2026) → [hoja pública](https://docs.google.com/spreadsheets/d/1F5-F97Qy0g5gWTE9mq16m_iC3asG7y55/edit) | HTML + hoja de cálculo Google, **200 sin sesión**, título `Examenes_Primavera_2026.xlsx`; tabla visible en HTML | Primavera 2026; la hoja puede corregirse durante el semestre. No se probó exportación CSV/API | R9, R13; T0 | Estable con estructura de hoja, enlace/columnas frágiles | **Alta prioridad:** fechas por asignatura y docente. Verificar identificación de sección antes de asignar; no guardar nombres/correos innecesarios |
| Solemnes: [anuncio](https://secretariaestudios.fen.uchile.cl/noticia/ver/solemnes-primavera-2026) → [hoja pública](https://docs.google.com/spreadsheets/d/12_ZGFCxEGuZb13qzulx4eL6Xy7k5wLqfolMrLFsUvJc/edit) | Hoja Google 200, tabla pública; incluye campos de asignatura, profesor, fecha y sala | Primavera 2026; revisar cambios junto con exámenes | R9, R13; T0 | Estable con estructura de hoja | Amplía Agenda más allá de exámenes. No confundir una fecha de solemne con la de examen final |
| Programas con ponderaciones: [Pregrado FEN](https://pregrado.fen.uchile.cl/) / [Ucampus FEN](https://ucampus.uchile.cl/m/fen_catalogo/) | No se localizó un índice público general de syllabi vigentes con ponderaciones; Ucampus FEN 401 | Las pautas actuales citan programas Primavera 2026 recibidos, no una API pública | R8, R11; T0/T-UCH | No hay lector público general verificado | `fen-pautas.js` sigue transcripción humana. Pedir programa a estudiantes es distinto de iniciar sesión en sus cuentas |

## UAI (`uai`)

| Dato y URL exacta | Formato y acceso | Actualización / cobertura comprobada | Robots y términos | Lectura | Qué hay hoy / qué se gana |
|---|---|---|---|---|---|
| Catálogo con siglas/créditos/requisitos: [mallas y folletos](https://www.uai.cl/admision/mallas-curriculares-y-folletos) | HTML 200 con nombres y documentos; **no catálogo exhaustivo** con esos campos | Oferta de admisión incluye folleto 2027; no prueba asignaturas impartidas 2027 | R14; T-UAI | HTML frágil | Las mallas locales conservan nombres; no se inventan códigos ni SCT. No se verificó catálogo público completo equivalente a UC |
| Mallas por carrera: [índice oficial](https://www.uai.cl/admision/mallas-curriculares-y-folletos), ejemplo ya usado [Administración](https://uai.cdn7pm.net/documentos/malla-licenciatura-administracion-de-empresas.pdf) | Índice 200; **CDN robots 403**, no se descargó ningún PDF de ese host | Índice actual muestra oferta nueva y enlaces PDF. Cohorte exacta pendiente de revisar en cada documento | R14, R16; T-UAI | PDF que cambia por plan; acceso del bot bloqueado al CDN | `mallas-uai.js` ya tiene planes. Detectar enlace nuevo puede servir de aviso, sin reemplazar la malla de cuentas existentes |
| Clases/salas hoy: [Hoy UAI](https://hoy.uai.cl/) | HTML/Next.js con JSON incrustado, **200 sin sesión**; no se llamó API privada | Eventos observados del **12-11-2026**; datos diarios, sin historia ni próximos siete días verificados | R15; T-UAI | HTML frágil; JSON estructurado dentro del protocolo RSC, no API estable | Contiene `Tipo`, `Evento`, `Fecha`, `Inicio`, `Fin`, `Sala`, `Edificio`, `Campus`. Permite «sala de hoy»; no acredita créditos, vacantes ni horario recurrente |
| Calendario académico: [índice 2026](https://www.uai.cl/calendario) → [PDF enlazado](https://uai.cdn7pm.net/documentos/calendario-academico-uai-2026.pdf) | HTML 200; el PDF **no se solicitó** por 403 en robots del CDN | Índice dice 2026. No se verificó calendario 2027 ni sustitución del PDF | R14, R16; T-UAI | PDF que cambia cada año | Inscripción, recesos y temporadas de examen. No usar una copia indexada antigua si el índice cambia |
| Fechas oficiales de examen por ramo: [Secretaría Académica](https://alumno.uai.cl/santiago/informacion-academica/secretaria-academica/) | HTML 200. **No se localizó la URL de la lista oficial** indicada por Lucas | Período/cobertura de esa lista no verificados. Hoy UAI solo acredita el día observado | R17; T-UAI | Pendiente de identificar documento | No afirmar que no existe: el caso de UniGo es una pista, no evidencia de fuente ni licencia. Queda explícitamente pendiente localizar el enlace de Secretaría antes de programar un lector |
| Syllabi/ponderaciones: [Webcursos](https://webcursos.uai.cl/login/index.php), enlazado por [A un click](https://www.uai.cl/a-un-click) | Destino de login; **no se abrió ni inició sesión**. No se localizó repositorio oficial público completo | Pautas locales recibidas de 2026-2; no generalizar entre secciones | R14 para el índice; robots del login no consultado porque no se accedió; T-UAI | No apto para lectura pública | `uai-pautas.js` no cambia. Los porcentajes de repositorios de apuntes no se toman como fuente oficial |
| Buses: [Peñalolén](https://www.uai.cl/campus/buses-de-acercamiento-penalolen), [Viña del Mar](https://www.uai.cl/campus/buses-de-acercamiento-vina-del-mar) | HTML público 200, rutas/horarios y enlace a horarios adicionales | Información operativa actual sin versión académica explícita; revisar cambios, no atribuir periodicidad fija | R14; T-UAI | HTML frágil | Utilidad diaria adicional; separado del ramo y del calendario de evaluaciones. No hay feed ICS verificado |

Hoy UAI mezcla cátedras, reuniones, ceremonias y otros eventos; algunos textos
incluyen nombres. Un futuro lector debe limitarse a clases académicas y eliminar
nombres/correos de personas al formar la referencia del ramo. Si no identifica
sin ambigüedad ramo/sección/campus, no asigna una sala. **No convertir cada evento
del jueves en una clase recurrente de todos los jueves.**

## UAndes (`uandes`)

| Dato y URL exacta | Formato y acceso | Actualización / cobertura comprobada | Robots y términos | Lectura | Qué hay hoy / qué se gana |
|---|---|---|---|---|---|
| Catálogo: [Ingeniería Civil Industrial](https://admision.uandes.cl/carreras/area-ingenieria-y-administracion/ingenieria-civil-industrial) y [PEG](https://www.uandes.cl/universidad/centro-de-estudios-generales/programas-de-estudios-generales/) | HTML público. No se encontró catálogo global de todas las siglas, SCT y requisitos | Admisión por plan; PEG 2026-2 | R19, R20; T-UA/T0 | HTML frágil | `carreras.js`, mallas y pautas PEG. La oferta PEG no equivale al catálogo de todas las carreras |
| Mallas/cohortes: [malla Industrial enlazada por Admisión](https://admision.uandes.cl/docs/default-source/carreras/documentos-area-ingenieria-y-administracion/ingenieria-civil-industrial/malla-ingenieria-civil-industrial.pdf) | PDF público **200**, una página **sin texto extraíble** en la muestra | Página de admisión enlaza esa versión; no se certifica un archivo por cada cohorte histórica | R20; T-UA/T0 | PDF/imagen que cambia por plan | Las mallas locales ya combinaron extracción y transcripción visual. Un parser de texto no puede reemplazar esa revisión |
| Secciones/horarios/salas: [PEG](https://www.uandes.cl/universidad/centro-de-estudios-generales/programas-de-estudios-generales/); [preguntas frecuentes oficiales](https://www.uandes.cl/informacion-general/preguntas-frecuentes/) | PEG público con NRC y hora; FAQ dirige al horario en AppUandes. No se entró a esa app/portal | PEG 2° semestre 2026; **no se verificó oferta global ni vacantes** | R19; T-UA | HTML frágil para PEG; resto requiere acceso de estudiante | Hay un subconjunto útil; no extrapolar datos PEG a otra sección ni a carreras completas |
| Calendario: [Calendario Académico](https://www.uandes.cl/estudiantes/informacion-academica/calendario-academico/) | HTML **200**; artículos con `data-date`, `data-category`, `data-scope`, `data-title` | **2026**; fechas de clases, inscripción, retiro, feriados y período de examen | R19; T-UA | **Estable con estructura**, sujeto a cambios de atributos | Excelente candidato de bajo esfuerzo. Filtrar alcance público y categorías académicas: el HTML también incluye procesos internos |
| Exámenes por ramo/sección: [calendario anterior](https://www.uandes.cl/estudiantes/informacion-academica/calendario-academico/) y [información académica](https://www.uandes.cl/estudiantes/informacion-academica/) | El calendario da ventanas generales; no se localizó lista abierta general por ramo | 2026 para ventanas; fechas individuales no verificadas | R19; T-UA | No hay lector de fechas por ramo demostrado | No convertir inicio de período en fecha del examen de cada ramo. Consultar fuente de cada carrera antes de extender |
| Programas con ponderaciones: [Programa de Estudios Generales](https://www.uandes.cl/universidad/centro-de-estudios-generales/programas-de-estudios-generales/) | HTML **200** con NRC, horario, ponderaciones y asistencia | Cursos del **2° semestre 2026** | R19; T-UA | HTML frágil, bloques de texto por curso | Fuente ya usada por `uandes-pautas.js`. Vigilar cambios y revisar manualmente; no cargar los cursos que omiten porcentajes o muestran contenido aparentemente copiado |
| Buses: [servicio oficial](https://www.uandes.cl/estudiantes/servicios-y-beneficios/buses/) | HTML público 200 | Información operativa, sin período/versionado verificado | R19; T-UA | HTML frágil | Posible utilidad semanal; no se investigó un feed de posiciones en vivo |

## UDD (`udd`)

| Dato y URL exacta | Formato y acceso | Actualización / cobertura comprobada | Robots y términos | Lectura | Qué hay hoy / qué se gana |
|---|---|---|---|---|---|
| Catálogo parcial: [oferta de carreras](https://www.udd.cl/admision-pregrado/carreras/), ejemplo de programa [SPF115](https://www.udd.cl/wp-content/uploads/2025/06/spf115.pdf) | HTML 200 y PDF con texto; el programa trae código, SCT/créditos y prerrequisitos | Oferta Admisión **2027**; el PDF está publicado en 2025 y no prueba sección/semestre vigente | R21; T-UDD/T0 | PDF con estructura, variable por facultad | `udd-pautas.js`, mallas/créditos locales. Hay ficha rica por asignatura, **no se comprobó un catálogo único completo** |
| Mallas: [carreras oficiales](https://www.udd.cl/admision-pregrado/carreras/) → PDFs de cada carrera bajo [mallas](https://www.udd.cl/mallas/) | Índice 200; ruta de documentos según transcripción existente. No se presume que `/mallas/` liste directorio | Oferta 2027, planes de distintos años. Año de URL no prueba año de ingreso | R21; T-UDD/T0 | PDF que cambia por plan/sede | `mallas-udd.js` ya transcrito en octubre. Detectar una versión no autoriza reemplazar planes ni pautas personalizadas |
| Horarios/secciones: [Derecho Santiago](https://derecho.udd.cl/i-academica-santiago/), [PDF 2026-2](https://derecho.udd.cl/files/2026/07/horario-2026-2-1-1.pdf) | HTML + **PDF 200 con texto, 44 páginas**; lectura de muestra local | 2026-2, versiones/contraciclos dentro del mismo archivo; sin vacantes verificadas | R24; T-UDD/T0 | PDF que cambia cada semestre | Horarios por carrera/plan, sin pretender cobertura UDD completa. Revisar sección y contraciclo antes de relacionarlo con un ramo |
| Otra oferta de horarios: [Ingeniería](https://ingenieria.udd.cl/conoce-tu-calendario-academico-y-horarios-por-carrera/) | HTML **200**, pero los enlaces apuntan a horarios **2022/12** y calendario **2023** | **Desactualizada para 2026** aunque el buscador la muestre reciente | R25; T-UDD/T0 | HTML frágil y documentos antiguos | No usarla para «mis clases hoy». Ejemplo concreto de por qué fecha de rastreo no es vigencia del dato |
| Calendario por sede: [Santiago](https://alumnos-scl.udd.cl/calendario-academico/), [Concepción](https://alumnos-ccp.udd.cl/calendario-academico/) | HTML 200 + PDF; **ambos índices ya enlazan 2026 y 2027** | Santiago: [2027](https://alumnos-scl.udd.cl/files/2026/11/calendario-academico-2027-udd-sede-santiago.pdf). Concepción: [2027](https://alumnos-ccp.udd.cl/files/2026/11/calendario-academico-alumnos-udd-sede-concepcion-2027.pdf), 7 páginas con texto | R22, R23; T-UDD/T0 | PDF que cambia cada año y puede corregirse | Muy útil para toma/retiro/recesos. Mantener sede y versión. La descarga de muestra de Santiago se limitó a 6 MiB: se verificó HTTP/tipo, **no lectura completa** |
| Evaluaciones/exámenes: [Derecho Santiago](https://derecho.udd.cl/i-academica-santiago/), [calendario 2026-2](https://derecho.udd.cl/files/2026/10/calendario-de-evaluaciones-2026-2.pdf) | HTML + **PDF 200 con texto, una página**, certámenes, recuperativos, exámenes y extraordinarios | 2026-2; enlazado actualmente, puede cambiar durante semestre | R24; T-UDD/T0 | PDF que cambia cada semestre | **Alta prioridad:** fechas por asignatura/año. Identificar plan y sección; no asignar a una sección si el documento no lo permite |
| Programas con ponderaciones: [SPF115](https://www.udd.cl/wp-content/uploads/2025/06/spf115.pdf), demás citas en `udd-pautas.js` | PDF **200**, seis páginas, texto y porcentajes verificados localmente | Publicación 2025; no atribuirle automáticamente vigencia 2026-2 o una sección | R21; T-UDD/T0 | PDF con estructura variable | Ya hay transcripción de Psicología/Arquitectura. Sirve para ampliar cobertura con revisión humana; fecha de subida no es nueva versión del programa |

## Lo que no está demostrado abierto

- Catálogo global con siglas, requisitos, créditos y secciones de FEN, UAI,
  UAndes o UDD. Sí hay fuentes parciales y programas con algunos de esos campos.
- Vacantes globales fuera de Buscacursos UC; horarios recurrentes globales fuera
  de esa fuente ya planificada. Hoy UAI acredita solo una fecha observada.
- Lista oficial de exámenes UAI señalada por Lucas: **enlace exacto no localizado**.
  No se reemplaza por el calendario anual ni por datos de UniGo.
- API estable o ICS institucional para los conjuntos revisados. Un JSON incrustado
  de Next.js o una hoja pública no se presentan como API contractual.
- Todos los syllabi vigentes por sección. Los programas recibidos por estudiantes
  y los documentos de apuntes de terceros no equivalen a un repositorio oficial.

## Prioridad propuesta: valor semanal frente a esfuerzo

La prioridad es una recomendación de investigación; no crea workflows ni autoriza
reutilización comercial. Antes de programar, resolver permisos y comprobar alcance.

| Prioridad | Fuente / valor | Esfuerzo y primer mecanismo |
|---|---|---|
| 1 | **FEN, exámenes y solemnes públicos**: fechas de evaluación de todo el semestre, sin pedir carga manual a cada estudiante | Bajo/medio. **Script manual** sobre una copia pública autorizada de la hoja; validar columnas y sección. Después, workflow programado con detección de cambios. No se probó endpoint CSV |
| 2 | **UC, evaluaciones de Construcción Civil y Derecho**: pruebas/exámenes, algunos con sigla y sección | Medio. **Script manual por PDF**, comparar resultado visualmente y cargar datos revisados. No hay plantilla única ni cobertura UC global |
| 3 | **Derecho UDD, evaluaciones + horarios 2026-2**: agenda y clase semanal dentro de un ámbito identificable | Medio. **Script manual** con revisión de plan, contraciclo y sección; luego carga de datos a mano. No ampliar a las demás carreras por parecido |
| 4 | **Hoy UAI**, sala y hora del día: mayor utilidad diaria que una malla | Medio, condicionado a T-UAI. **Workflow programado**, solo tras autorización, una lectura diaria y correcciones acotadas; descartar eventos no académicos y no inventar recurrencia |
| 5 | **Calendarios institucionales UAndes y UDD por sede**: semanas de examen, retiro, recesos y toma | Bajo para HTML UAndes (condicionado a T-UA), medio para PDF UDD. **Carga de datos a mano por año** con revisión de cambios; automatizar avisos antes que reemplazar fechas de alumnos |

**Buscacursos ya tiene su proyecto (#986):** la prioridad pendiente es terminar su
acceso/instalación y el consumo de horarios; este inventario no lo duplica. La
conversión módulo→hora está propuesta en #1107. Los requisitos de catálogo y el
histórico de cohortes siguen siendo trabajos distintos.

## Riesgos y límites de uso

1. **Permisos:** robots permite rastreo, no licencia contenidos. T-UAI y T-UA
   requieren resolver el uso comercial antes de implementar; no interpretar
   `ai-train=no` como prohibición de mostrar un horario, ni ignorar esa señal.
   Nada de estos datos se usa para entrenar o ajustar modelos.
2. **Bloqueos:** 403 en Registros Académicos UC, Admisión UC y robots del CDN UAI.
   Se detuvo cada host. `docencia.fen.uchile.cl` no resolvió DNS; robots de
   `uchile.cl` cerró la conexión. No se intentaron vías alternativas para eludirlos.
3. **Vigencia:** conservar URL, período, sede/plan, fecha de lectura y huella del
   documento. Una corrección no borra el dato anterior hasta validarse. Ingeniería
   UDD muestra enlaces antiguos; hay distintos PDF anuales 2026 en buscadores.
4. **Identidad académica:** buscar por sigla normalizada y sección explícita; no
   crear equivalencias de nombres/siglas, pesos, SCT o profesores. Nunca extender
   una pauta entre secciones. Un dato sin sección no se atribuye a una por azar.
5. **Datos personales:** los documentos pueden incluir docentes, correos o eventos
   con nombres. No guardar correos ni nombres de estudiantes; no copiar reuniones
   personales. El inventario no contiene listados de personas ni sus documentos.
   Un lector futuro de docentes UC debe mantener el filtro de `profesor_ocultos`
   definido por #986, no exponer su tabla cruda.
6. **Cuentas existentes:** esta PR no cambia la app ni datos guardados. Un futuro
   lector solo propondría información; no debe pisar notas, pauta propia o fechas
   confirmadas por el estudiante. No se afirma que este documento habilite esa
   migración.

## Proyectos estudiantiles y licencias

Licencias contrastadas con la propiedad `license.spdx_id` de la API pública de
GitHub el día del corte (no solo con el nombre del repositorio). No se copió código.

| Proyecto | Qué lee/muestra | Licencia comprobada | Uso para GradeHub cerrado |
|---|---|---|---|
| [open-source-uc/ramos-uc](https://github.com/open-source-uc/ramos-uc) | Buscacursos UC; referencia ya analizada en #986 | **MIT**, [metadatos](https://api.github.com/repos/open-source-uc/ramos-uc) | Reutilizable con aviso y atribución; comprobar licencia del archivo concreto |
| [kovaxis/buscacursos-dl](https://github.com/kovaxis/buscacursos-dl) | Buscacursos y Catálogo UC; referencia ya analizada en #986 | **MIT**, [metadatos](https://api.github.com/repos/kovaxis/buscacursos-dl) | Reutilizable con atribución. Un release histórico no es una fuente viva |
| [open-source-uc/BuscaRamos-v2](https://github.com/open-source-uc/BuscaRamos-v2) | Búsqueda/experiencia UC; usa datos del ecosistema UC | **AGPL-3.0**, [metadatos](https://api.github.com/repos/open-source-uc/BuscaRamos-v2) | Solo referencia de comportamiento, sin copiar código/estructuras |
| [igbasly/BC_API](https://github.com/igbasly/BC_API) | API de Buscacursos | **GPL-3.0**, [metadatos](https://api.github.com/repos/igbasly/BC_API) | Solo referencia |
| [aurmeneta/BuscaCursosUC](https://github.com/aurmeneta/BuscaCursosUC) | Buscador UC | **Sin licencia declarada** (`license:null`), [metadatos](https://api.github.com/repos/aurmeneta/BuscaCursosUC) | No reutilizar código |
| [UniGo](https://unigo.cl/) | Referente UAI: notas, salas y buses | No se localizó repositorio/licencia pública; **no se presume reutilizable** | Solo referencia. Robots bloquea `/api/` y `/ref/`; no se consultaron. Los JS públicos no revelaron la URL de la lista oficial de exámenes; no se copió código |

No se verificaron otros lectores estudiantiles abiertos para FEN, UAndes o UDD
en esta muestra. Esto no prueba que no existan. MIT/Apache del software tampoco
resuelven la licencia de los datos universitarios que ese software descarga.

## Prueba pequeña y reproducible

`node bin/fuentes-publicas-prueba.js` ejecuta, **sin red**, la lectura de un HTML
completamente sintético con los atributos observados del calendario UAndes. Prueba
fecha ISO válida, entidades, filtrado de eventos internos/sociales y fallo ante
estructura desconocida o fecha imposible. Fixture:
`tests/fixtures/fuentes/calendario-uandes-sintetico.html`.

La misma función leyó **73 fechas públicas académicas/feriados/toma de ramos**
de la muestra oficial guardada temporalmente. No se publicaron esos eventos.
Se comprobó además, solo en archivos temporales locales, que Hoy UAI incluye
campos de eventos dentro de RSC; las hojas FEN tienen tablas visibles sin login;
y los PDF UDD y UC elegidos se pueden extraer como texto con el pdf.js ya incluido.
La muestra de malla Industrial UAndes no dio texto: necesita revisión visual.
No se versionan páginas/PDF originales ni nombres de personas. El script mínimo
no tiene cliente HTTP, no produce cambios en la app y no es un lector listo para
producción.

Comprobaciones de entrega: build, sintaxis JS, balance CSS, **446 tests aprobados**
y prueba local anterior. Sin cambios de interfaz; no corresponden capturas ni
una adaptación HIG en esta PR. Este inventario no prescribe una interfaz ni altera el diseño de la app.

## Registro de robots y acceso

Lectura del corte. «Sin Content-Signal» significa ausente en el robots obtenido,
no una autorización implícita. Un 404 de robots se distingue de un bloqueo 403.
Las reglas se evalúan para **GradeHubBot**, no para agentes de entrenamiento.

| Código | Robots exacto y respuesta | Reglas / acceso de contenido | Content-Signal |
|---|---|---|---|
| R1 | [buscacursos.uc.cl/robots.txt](https://buscacursos.uc.cl/robots.txt) · 200 | Permite `/` para GradeHubBot; bloquea agentes de entrenamiento. No se repitió lectura del catálogo. | search=yes,ai-train=no,use=reference |
| R2 | [catalogo.uc.cl/robots.txt](https://catalogo.uc.cl/robots.txt) · 200 | Bloquea directorios técnicos Joomla y crawlers nombrados; no bloquea la ficha citada para GradeHubBot. Sin nueva extracción. | No declarada |
| R3 | [admision.uc.cl/robots.txt](https://admision.uc.cl/robots.txt) · 200 | Robots permite `/`, pero `/carreras/` responde **403** con desafío: detener host. | search=yes,ai-train=no,use=reference |
| R4 | [mallas.ing.uc.cl/robots.txt](https://mallas.ing.uc.cl/robots.txt) · 200 | `robots.txt` devuelve **HTML de la SPA**, no reglas de robots reconocibles. Portada 200; no se probó API. | No declarada |
| R5 | [registrosacademicos.uc.cl/robots.txt](https://registrosacademicos.uc.cl/robots.txt) · 200 | Robots permite `/`; portada 200, calendario **403**: detener host. No volver a pedir módulos/privacidad. | search=yes,ai-train=no,use=reference |
| R6 | [derecho.uc.cl/robots.txt](https://derecho.uc.cl/robots.txt) · 200 | Bloquea `/wp-admin/`; índice evaluaciones y PDF 200. | No declarada |
| R7 | [construccioncivil.uc.cl/robots.txt](https://construccioncivil.uc.cl/robots.txt) · 200 | Bloquea `/wp-admin/`, permite admin-ajax; índice y PDF 200. | No declarada |
| R8 | [pregrado.fen.uchile.cl/robots.txt](https://pregrado.fen.uchile.cl/robots.txt) · 200 | Bloquea `/wp-admin/`, permite admin-ajax; tres índices de malla 200. | No declarada |
| R9 | [secretariaestudios.fen.uchile.cl/robots.txt](https://secretariaestudios.fen.uchile.cl/robots.txt) · 200 | Solo contiene directivas comentadas, sin bloqueo efectivo; páginas de calendario/exámenes 200. | No declarada |
| R10 | [docencia.fen.uchile.cl/robots.txt](https://docencia.fen.uchile.cl/robots.txt) · DNS no resuelve | No resolvió DNS al pedir robots; **detenido**, sin lectura de contenido. | Sin señal verificable |
| R11 | [ucampus.uchile.cl/robots.txt](https://ucampus.uchile.cl/robots.txt) · 200 | Bloquea `/v/`, `/auth/`, `/api/`, `/doodle`, `/index2`, `/usuario` y agentes concretos. GradeHubBot puede leer `/m/`; **FEN 401**, FCFM redirige a 20262 y responde 200. No se confunden facultades. | No declarada |
| R12 | [uchile.cl/robots.txt](https://uchile.cl/robots.txt) · Error de conexión | Conexión cerrada al pedir robots; **detenido**, contenido solo descubierto por índice. | Sin señal verificable |
| R13 | [docs.google.com/robots.txt](https://docs.google.com/robots.txt) · 200 | `Crawl-delay: 1`; rutas de las dos hojas permitidas para GradeHubBot. Ambas respondieron 200 sin login; no se probó export CSV. | No declarada |
| R14 | [www.uai.cl/robots.txt](https://www.uai.cl/robots.txt) · 200 | `User-agent: *`, `Disallow:` vacío; páginas revisadas 200. **T-UAI limita uso**. | No declarada |
| R15 | [hoy.uai.cl/robots.txt](https://hoy.uai.cl/robots.txt) · 404 | Robots **404**; portada 200. No se localizó declaración específica en esa portada; considerar T-UAI de subdominios. | No declarada |
| R16 | [uai.cdn7pm.net/robots.txt](https://uai.cdn7pm.net/robots.txt) · 403 | Robots **403**: **detener**, no pedir los PDF aunque estén indexados por terceros. | Sin señal verificable |
| R17 | [alumno.uai.cl/robots.txt](https://alumno.uai.cl/robots.txt) · 200 | Bloquea `/wp-admin/`, permite admin-ajax; Secretaría 200. | No declarada |
| R18 | [protecciondedatos.uc.cl/robots.txt](https://protecciondedatos.uc.cl/robots.txt) · 200 | Robots permite `/`, política **403**: detener. No se leyó ni se presume permiso de reutilización. | search=yes,ai-train=no,use=reference |
| R19 | [www.uandes.cl/robots.txt](https://www.uandes.cl/robots.txt) · 200 | Bloquea `/wp-admin/` y `/comunicaciones/`, permite admin-ajax; calendario/PEG/FAQ/buses/política 200. **T-UA limita uso**. | No declarada |
| R20 | [admision.uandes.cl/robots.txt](https://admision.uandes.cl/robots.txt) · 404 | Robots **404**. La ruta corta adivinada de carrera dio 404 y se descartó; ruta enlazada/descubierta por área y PDF 200. | No declarada |
| R21 | [www.udd.cl/robots.txt](https://www.udd.cl/robots.txt) · 200 | Sin `Disallow` efectivo para GradeHubBot en las rutas revisadas; carreras/programa/privacidad 200. | ai-train=yes, search=yes, ai-input=yes |
| R22 | [alumnos-scl.udd.cl/robots.txt](https://alumnos-scl.udd.cl/robots.txt) · 404 | Robots **404**; índice 200, enlaces 2026 y 2027. Muestra 2027 truncada a 6 MiB, sin afirmar lectura completa. | No declarada |
| R23 | [alumnos-ccp.udd.cl/robots.txt](https://alumnos-ccp.udd.cl/robots.txt) · 404 | Robots **404**; índice y PDF 2027 200; muestra de PDF con texto. | No declarada |
| R24 | [derecho.udd.cl/robots.txt](https://derecho.udd.cl/robots.txt) · 200 | `Disallow:` vacío; índice, horarios y evaluaciones 200. | No declarada |
| R25 | [ingenieria.udd.cl/robots.txt](https://ingenieria.udd.cl/robots.txt) · 200 | `Disallow:` vacío; índice 200 pero documentos enlazados de **2022/2023**, no vigentes para 2026. | No declarada |
| R26 | [fen.uchile.cl/robots.txt](https://fen.uchile.cl/robots.txt) · 200 | `Disallow:` vacío; portada FEN 200, remite a Pregrado. | No declarada |
| R27 | [api.github.com/robots.txt](https://api.github.com/robots.txt) · 404 | Robots **404**; metadatos de cinco repos 200. Sin descarga de código. | No declarada |
| R28 | [unigo.cl/robots.txt](https://unigo.cl/robots.txt) · 200 | Permite `/`, **bloquea `/api/` y `/ref/`**. Solo portada y JS público leído para localizar una URL oficial; sin llamadas a esas rutas ni código copiado. | No declarada |

### Evidencia técnica mínima

Metadatos de las respuestas del corte; SHA-256 del cuerpo **de la muestra leída**.
No se versionan esos cuerpos: pueden incluir nombres. Los hashes sirven para
identificar la muestra, no para comprobar vigencia futura ni identidad de personas.

| Fuente | HTTP | Bytes de muestra | SHA-256 (12 primeros caracteres) |
|---|---|---:|---|
| [Hoy UAI](https://hoy.uai.cl/) | 200 | 246604 | `6448e86a7ebf` |
| [Calendario UAndes](https://www.uandes.cl/estudiantes/informacion-academica/calendario-academico/) | 200 | 705453 | `0013f5040dc1` |
| [Evaluaciones Derecho UDD 2026-2](https://derecho.udd.cl/files/2026/10/calendario-de-evaluaciones-2026-2.pdf) | 200 | 227609 | `71f36ffa9da7` |
| [Horario Derecho UDD 2026-2](https://derecho.udd.cl/files/2026/07/horario-2026-2-1-1.pdf) | 200 | 385208 | `f17ba3ef3a8a` |
| [Exámenes FEN Primavera 2026](https://docs.google.com/spreadsheets/d/1F5-F97Qy0g5gWTE9mq16m_iC3asG7y55/edit) | 200 | 292408 | `11bae89a130d` |
| [Solemnes FEN Primavera 2026](https://docs.google.com/spreadsheets/d/12_ZGFCxEGuZb13qzulx4eL6Xy7k5wLqfolMrLFsUvJc/edit) | 200 | 299326 | `f2ab85b64de0` |
| [Matemáticas UC 2026-2](https://construccioncivil.uc.cl/wp-content/uploads/2026/07/Calendario-de-Interrogaciones-y-Examenes-2026-segundo-semestre.-MATEMATICAS.pdf) | 200 | 93808 | `ced199970f78` |
| [Derecho UC escrito 2026-2](https://derecho.uc.cl/wp-content/uploads/2026/07/Calendario-evaluaciones-escrito-2026-2.pdf) | 200 | 208842 | `ed1b16ece542` |
