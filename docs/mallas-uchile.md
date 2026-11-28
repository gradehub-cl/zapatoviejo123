# U. de Chile: carreras, mallas y fuentes

Revisión del 2026-11-26. En GradeHub la U. de Chile es el tenant `fen` (así
quedó guardado en `profiles` y `gradehub_v1`; no se renombra). Lo visible dice
«UChile» desde #1341. Hasta esta revisión solo estaban las tres carreras de la
FEN; ahora se pueden declarar las 76 de pregrado.

## Qué se puede leer y qué no

| Host | Estado | Uso |
|---|---|---|
| [admisionuchile.cl](https://admisionuchile.cl/career/) | `robots.txt` con `Disallow:` vacío. `career-sitemap.xml` lista 75 carreras | Nombre oficial de cada carrera (el `og:title` de su ficha) y enlace a su malla |
| recursos.admisionuchile.cl/descargables/ | 200. Es un bucket sin `robots.txt` (403 de S3 al pedirlo) | Los 75 PDF de malla: todos con texto, misma plantilla, por semestre y con SCT, **sin siglas**. Sello `MV202512` en 67, `MV202604`/`MV202606` en los 8 de Medicina |
| ingenieria.uchile.cl/carreras/… | `robots.txt` 404, páginas 200 | Única fuente pública con **siglas y créditos** fuera de Ucampus: tabla por semestre de cada carrera FCFM, Plan Común incluido |
| Sitios de facultad (`<facultad>.uchile.cl`) | `robots.txt` 404, páginas 200 | Tabla «Plan de formación» por semestre con SCT, decreto y duración; sin siglas salvo FCFM |
| ucampus.uchile.cl, u-cursos.cl | **Su `robots.txt` bloquea con `Disallow: /` a Claude-Code, Claude-User y ClaudeBot** | No se leen con Claude. Ucampus publica catálogos por facultad (`/m/<facultad>_catalogo/`, con siglas) que `*` sí puede leer; usarlos es decisión del equipo y lo haría un script propio, no Claude |
| uchile.cl, www.uchile.cl, admision.uchile.cl, portaluchile.uchile.cl | 403 a clientes que no son navegador | No se eludió. Ahí están los programas de los CFG con su «ponderación en nota final» |
| drive.google.com | No se abrió | Mallas de Diseño FAU, Periodismo, Cine y Veterinaria también publicadas ahí; ya están en admisión |

No se encontró una licencia de reutilización en ninguno de estos sitios (la
privacidad de Ucampus está en `docs/fuentes-publicas.md`, T-UCH). Las mallas y
nombres de carrera son información académica pública; no se guardan nombres de
docentes ni de alumnos.

## Datos sueltos verificados

- Correo de estudiantes: `@ug.uchile.cl` ([Webmail UChile](https://uchile.cl/presentacion/servicios-ayuda/webmail)). Todavía no está en `DOMINIOS_CORREO_POR_TENANT`.
- Plan Común FCFM: cuatro semestres; después se elige entre nueve especialidades de Ingeniería Civil, Geología, Geofísica y las licenciaturas en Física y Astronomía ([ingenieria.uchile.cl](https://ingenieria.uchile.cl/carreras/plan-comun)).
- «Licenciatura en Ciencias con mención en Física» existe en FCFM y en la Facultad de Ciencias con planes distintos: van como dos opciones.
- Ciencias Químicas publica en sus *Normas de Secretaría de Estudios* que, con examen, la final es 60 % presentación y 40 % examen. **Sin confirmar** contra el reglamento vigente: no entra al motor hasta revisarlo.

## Pendiente, en orden

1. **Mallas FCFM** con siglas y créditos desde ingenieria.uchile.cl (Plan Común y 13 especialidades). Archivo diferido `mallas-uchile.js`, igual que `mallas-udd.js`.
2. **Reglas propias de la FEN por facultad.** `GH_REGLAS_NOTA_POR_TENANT.fen` (descarte manual) hoy aplica a toda la Chile; un ramo de Derecho o de Beauchef no debería heredarlo.
3. **Mallas de las otras facultades** desde los PDF de admisión, con un lector por posición común a todos. Sin siglas: emparejar por nombre.
4. **Siglas fuera de FCFM**: solo están en Ucampus. Requiere decidir si un script del equipo las lee.
5. Al final: Medicina Veterinaria (currículo por unidades) y Bachillerato (casi todo electivo).

## Las 75 carreras de admisión

Ficha: `https://admisionuchile.cl/career/<ficha>/`. PDF:
`https://recursos.admisionuchile.cl/descargables/<pdf>`. El Plan Común FCFM
no aparece como carrera en admisión y se suma aparte.

| Facultad | Carrera | Ficha (`/career/…`) | PDF (`/descargables/…`) |
|---|---|---|---|
| Arquitectura y Urbanismo | Arquitectura | `arquitectura` | `arquitectura_y_urbanismo/arquitectura_y_urbanismo_uchile.pdf` |
| Arquitectura y Urbanismo | Diseño | `diseno` | `arquitectura_y_urbanismo/diseno_uchile.pdf` |
| Arquitectura y Urbanismo | Geografía | `geografia` | `arquitectura_y_urbanismo/geografia_uchile.pdf` |
| Artes | Actuación Teatral | `actuacion-teatral` | `artes/actuacion_uchile.pdf` |
| Artes | Danza | `danza` | `artes/danza_uchile.pdf` |
| Artes | Diseño Teatral | `diseno-teatral` | `artes/diseno_teatral_uchile.pdf` |
| Artes | Ingeniería en Sonido | `ingenieria-en-sonido` | `artes/ingenieria_en_sonido_uchile.pdf` |
| Artes | Interpretación Musical | `interpretacion-musical` | `artes/interpretacion_musical_uchile.pdf` |
| Artes | Licenciatura en Artes con mención en Artes Visuales | `licenciatura-artes-mencion-artes-visuales` | `artes/artes_visuales_uchile.pdf` |
| Artes | Licenciatura en Artes con mención en Composición Musical | `licenciatura-artes-mencion-composicion-musical` | `artes/composicion_musical_uchile.pdf` |
| Artes | Licenciatura en Artes con mención en Teoría e Historia del Arte | `licenciatura-artes-mencion-teoria-historia-del-arte` | `artes/teoria_e_historia_del_arte_uchile.pdf` |
| Artes | Teoría de la Música | `teoria-de-la-musica` | `artes/teoria_de_la_musica_uchile.pdf` |
| Ciencias | Biología con mención en Medio Ambiente | `biologia-mencion-medio-ambiente` | `ciencias/biologia_con_mencion_en_medio_ambiente_uchile.pdf` |
| Ciencias | Ingeniería en Biotecnología Molecular | `ingenieria-biotecnologia-molecular` | `ciencias/Ingenieria_en_biotecnologia_molecular_uchile.pdf` |
| Ciencias | Licenciatura en Ciencias con mención en Biología | `licenciatura-ciencias-mencion-biologia` | `ciencias/licenciatura_ciencias_con_mencion_en_biologia_uchile.pdf` |
| Ciencias | Licenciatura en Ciencias con mención en Física | `licenciatura-ciencias-mencion-fisica` | `ciencias/licenciatura_ciencias_con_mencion_en_fisica_uchile.pdf` |
| Ciencias | Licenciatura en Ciencias con mención en Matemáticas | `licenciatura-ciencias-mencion-matematicas` | `ciencias/licenciatura_ciencias_con_mencion_en_matematicas_uchile.pdf` |
| Ciencias | Licenciatura en Ciencias con mención en Química | `licenciatura-ciencias-mencion-quimica` | `ciencias/licenciatura_ciencias_con_mencion_en_quimica_uchile.pdf` |
| Ciencias | Pedagogía en Educación Media en Biología y Química | `pedagogia-educacion-media-biologia-quimica` | `ciencias/pedagogia_en_educacion_media_en_biologia_y_quimica_uchile.pdf` |
| Ciencias | Pedagogía en Educación Media en Matemáticas y Física | `pedagogia-educacion-media-matematicas-fisica` | `ciencias/pedagogia_en_educacion_media_en_matematicas_y_fisica_uchile.pdf` |
| Ciencias | Química Ambiental | `quimica-ambiental` | `ciencias/quimica_ambiental_uchile.pdf` |
| Ciencias Agronómicas y Ambientales | Ingeniería Agronómica | `ingenieria-agronomica` | `ciencias_agronomicas/ingenieria_agronomica_uchile.pdf` |
| Ciencias Agronómicas y Ambientales | Ingeniería en Recursos Naturales Renovables | `ingenieria-recursos-naturales-renovables` | `ciencias_agronomicas/ingenieria_en_recursos_naturales_renovables_uchile.pdf` |
| Ciencias Forestales | Ingeniería Forestal | `ingenieria-forestal` | `ciencias_forestales/Ingenieria_forestal_uchile.pdf` |
| Ciencias Forestales | Ingeniería en Recursos Hídricos | `ingenieria-recursos-hidricos` | `ciencias_forestales/Ingenieria_en_recursos_hidricos_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Geofísica | `geofisica` | `ciencias_fisicas_y_matematicas/geofisica_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Geología | `geologia` | `ciencias_fisicas_y_matematicas/geologia_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil | `ingenieria-civil` | `ciencias_fisicas_y_matematicas/ingenieria_civil_con_menciones_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil Eléctrica | `ingenieria-civil-electrica` | `ciencias_fisicas_y_matematicas/ingenieria_civil_electrica_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil Industrial | `ingenieria-civil-industrial` | `ciencias_fisicas_y_matematicas/ingenieria_civil_industrial_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil Matemática | `ingenieria-civil-matematica` | `ciencias_fisicas_y_matematicas/ingenieria_civil_matematica_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil Mecánica | `ingenieria-civil-mecanica` | `ciencias_fisicas_y_matematicas/ingenieria_civil_mecanica_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil Química | `ingenieria-civil-quimica` | `ciencias_fisicas_y_matematicas/ingenieria_civil_quimica_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil de Minas | `ingenieria-civil-de-minas` | `ciencias_fisicas_y_matematicas/ingenieria_civil_de_minas_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil en Biotecnología | `ingenieria-civil-en-biotecnologia` | `ciencias_fisicas_y_matematicas/ingenieria_civil_en_biotecnologia_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Ingeniería Civil en Computación | `ingenieria-civil-en-computacion` | `ciencias_fisicas_y_matematicas/ingenieria_civil_en_computacion_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Licenciatura en Ciencias con mención en Astronomía | `licenciatura-ciencias-mencion-astronomia` | `ciencias_fisicas_y_matematicas/licenciatura_en_ciencias_con_mencion_en_astronomia_uchile.pdf` |
| Ciencias Físicas y Matemáticas | Licenciatura en Ciencias con mención en Física | `licenciatura-ciencias-mencion-fisica-2` | `ciencias_fisicas_y_matematicas/licenciatura_en_ciencias_con_mencion_en_fisica_uchile.pdf` |
| Ciencias Químicas y Farmacéuticas | Bioquímica | `bioquimica` | `ciencias_quimicas_y_farmaceuticas/bioquimica_uchile.pdf` |
| Ciencias Químicas y Farmacéuticas | Ingeniería en Alimentos | `ingenieria-alimentos` | `ciencias_quimicas_y_farmaceuticas/ingenieria_en_alimentos_uchile.pdf` |
| Ciencias Químicas y Farmacéuticas | Química | `quimica` | `ciencias_quimicas_y_farmaceuticas/quimica_uchile.pdf` |
| Ciencias Químicas y Farmacéuticas | Química y Farmacia | `quimica-y-farmacia` | `ciencias_quimicas_y_farmaceuticas/quimica_y_farmacia_uchile.pdf` |
| Ciencias Sociales | Antropología - Arqueología | `antropologia-arqueologia` | `ciencias_sociales/antropologia_uchile.pdf` |
| Ciencias Sociales | Pedagogía en Educación Especial | `pedagogia-educacion-especial` | `ciencias_sociales/educacion_especial_uchile.pdf` |
| Ciencias Sociales | Pedagogía en Educación Física | `pedagogia-educacion-fisica` | `ciencias_sociales/educacion_fisica_uchile.pdf` |
| Ciencias Sociales | Pedagogía en Educación Parvularia | `pedagogia-educacion-parvularia` | `ciencias_sociales/educacion_parvularia_uchile.pdf` |
| Ciencias Sociales | Psicología | `psicologia` | `ciencias_sociales/psicologia_uchile.pdf` |
| Ciencias Sociales | Sociología | `sociologia` | `ciencias_sociales/sociologia_uchile.pdf` |
| Ciencias Sociales | Trabajo Social | `trabajo-social` | `ciencias_sociales/trabajo_social_uchile.pdf` |
| Ciencias Veterinarias y Pecuarias | Medicina Veterinaria | `medicina-veterinaria` | `ciencias_veterinarias/veterinaria_uchile.pdf` |
| Comunicación e Imagen | Cine y Televisión | `cine-y-television` | `comunicacion_e_imagen/cine_y_television.pdf` |
| Comunicación e Imagen | Periodismo | `periodismo` | `comunicacion_e_imagen/periodismo.pdf` |
| Derecho | Derecho | `derecho` | `derecho/derecho.pdf` |
| Economía y Negocios | Contador Auditor | `contador-auditor` | `economia_y_negocios/contador_auditor_uchile.pdf` |
| Economía y Negocios | Ingeniería Comercial | `ingenieria-comercial` | `economia_y_negocios/ingenieria_comercial_uchile.pdf` |
| Economía y Negocios | Ingeniería en Información y Control de Gestión | `ingenieria-informacion-control-gestion` | `economia_y_negocios/ingenieria_en_control_y_gestion_uchile.pdf` |
| Filosofía y Humanidades | Estudios Internacionales | `estudios-internacionales` | `filosofia_y_humanidades/estudios_internacionales_uchile.pdf` |
| Filosofía y Humanidades | Licenciatura en Filosofía | `licenciatura-filosofia` | `filosofia_y_humanidades/licenciatura_en_filosofia_uchile.pdf` |
| Filosofía y Humanidades | Licenciatura en Historia | `licenciatura-historia` | `filosofia_y_humanidades/licenciatura_en_historia_uchile.pdf` |
| Filosofía y Humanidades | Licenciatura en Lingüística y Literatura | `licenciatura-linguistica-literatura` | `filosofia_y_humanidades/licenciatura_en_linguistica_y_literatura_uchile.pdf` |
| Filosofía y Humanidades | Licenciatura en Lingüística y Literatura Inglesas | `licenciatura-linguistica-literatura-inglesas` | `filosofia_y_humanidades/licenciatura_en_linguistica_y_literatura_inglesas_uchile.pdf` |
| Filosofía y Humanidades | Pedagogía de Ed. Media en Asignaturas Científico-Humanistas | `licenciatura-educacion-media-asignaturas-cientifico-humanistas` | `filosofia_y_humanidades/pedagogia_en_educacion_media_uchile.pdf` |
| Filosofía y Humanidades | Pedagogía en Educación Básica | `pedagogia-educacion-basica` | `filosofia_y_humanidades/pedagogia_en_educacion_basica_uchile.pdf` |
| Gobierno | Administración Pública | `administracion-publica` | `gobierno/administracion_publica_uchile.pdf` |
| Gobierno | Ciencia Política | `ciencia-politica` | `gobierno/ciencia_politica_uchile.pdf` |
| Medicina | Enfermería | `enfermeria` | `medicina/enfermeria_uchile.pdf` |
| Medicina | Fonoaudiología | `fonoaudiologia` | `medicina/fonoaudiologia_uchile.pdf` |
| Medicina | Kinesiología | `kinesiologia` | `medicina/kinesiologia_uchile.pdf` |
| Medicina | Medicina | `medicina` | `medicina/medicina_uchile.pdf` |
| Medicina | Nutrición y Dietética | `nutricion-dietetica` | `medicina/nutricion_y_dietetica_uchile.pdf` |
| Medicina | Obstetricia y Puericultura | `obstetricia-puericultura` | `medicina/obstetricia_y_puericultura_uchile.pdf` |
| Medicina | Tecnología Médica | `tecnologia-medica` | `medicina/tecnologia_medica_uchile.pdf` |
| Medicina | Terapia Ocupacional | `terapia-ocupacional` | `medicina/terapia_ocupacional_uchile.pdf` |
| Odontología | Odontología | `odontologia` | `odontologia/odontologia_uchile.pdf` |
| Programa Académico de Bachillerato | Programa Académico de Bachillerato | `bachillerato` | `programa_academico_de_bachillerato/bachillerato_uchile.pdf` |
