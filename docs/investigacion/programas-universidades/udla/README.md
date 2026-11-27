# UDLA: hasta dónde se llega desde afuera

Corte: **27 de noviembre de 2026**. Continúa el [inventario](../README.md), que
ponía a la UDLA como el mejor punto de partida. Al intentarlo apareció el límite:
**el catálogo es público sigla por sigla, pero no hay de dónde sacar las siglas**.
Sigue siendo investigación: no carga ninguna pauta ni malla.

## Qué publica la UDLA

- **Mallas:** [admision.udla.cl/mallas](https://admision.udla.cl/mallas/) enlaza 31
  folletos de carrera («…-UDLA-2027.pdf»). Cada uno trae una página «Malla
  curricular» con los **nombres** de los ramos por semestre. **No traen siglas ni
  créditos.**
- **Programas:** `https://programas.udla.cl/<período><SIGLA>.pdf`, por ejemplo
  [`202610CBI302`](https://programas.udla.cl/202610CBI302.pdf). El período es año
  más `10` o `20`. El sitio no tiene índice ni buscador.
- **Robots:** `admision.udla.cl` permite todo, `www.udla.cl` nombra a ClaudeBot con
  `Allow: /` y `programas.udla.cl` no tiene `robots.txt`.

## Qué se hizo

1. Se bajaron los 31 folletos y se extrajo el texto de la página de la malla.
2. El buscador web solo tiene indexados **25 programas** de `programas.udla.cl`;
   devolvió los mismos para todas las consultas. Esas 25 siglas fueron el punto
   de partida.
3. Cada programa declara sus prerrequisitos con sigla. Se siguió esa cadena hasta
   agotarla, **pidiendo solo siglas escritas en algún programa**, sin adivinar
   ninguna. De cada sigla se probó la versión `202620`, `202610`, `202520` y
   `202510`, en ese orden.
4. De cada programa se leyó la identificación y la tabla «7.1 Ponderaciones».

Fueron unas 570 peticiones a `programas.udla.cl`, una a la vez y con 1,15 s entre
inicios.

## Qué salió

- **222 siglas pedidas, 188 programas encontrados.** Las otras 34 no existen en
  esos cuatro períodos; casi todas son siglas antiguas citadas como requisito.
- **Son vigentes:** 162 son versión `202610`, 18 `202620`, 4 `202510` y 4 están
  en el formato antiguo (2015–2016), que no trae la tabla.
- **El formato es regular.** Todos traen sigla, nombre, créditos SCUDLA,
  vigencia, modalidad y requisito. La tabla separa componentes (cátedra,
  ejercicio, examen, a veces diagnóstico, práctica o teoría) y subcomponentes,
  cada uno con su porcentaje, y agrega la regla de eximición en texto.
- **La tabla se leyó sola en 166 de 188.** Quedaron aparte 13 de dos niveles
  (práctica y teoría por un lado, examen por otro), 5 con una tabla distinta por
  jornada y los 4 antiguos sin tabla. Todo está en
  [`programas.tsv`](programas.tsv), con la columna `estado_tabla`.

Cómo se leyó la tabla: PDFKit entrega el texto con las celdas combinadas
intercaladas entre las filas, así que
[`udla_tabla.py`](../herramientas/udla_tabla.py) decide qué es componente y qué
subcomponente buscando la única combinación en que los componentes suman 100. Si
no hay exactamente una, la deja en «revisar». Se compararon a mano tres tablas
cerradas contra su texto original (ING1207, CBI302 y LIC310) y calzan. **No es
una transcripción revisada: antes de usar un peso hay que abrir el PDF.**

## Cuánto cubre de las mallas

Se buscó el nombre de cada programa dentro de la página de malla de cada folleto.
Es un piso, porque el texto del folleto pierde el orden de las celdas.

| Carrera | Semestres | Nombres de la malla con algún programa |
|---|---|---|
| Enfermeria | 10 | 37 |
| Kinesiologia | 10 | 20 |
| Terapia Ocupacional | 10 | 19 |
| Fonoaudiologia | 10 | 14 |
| Ingenieria Civil Quimica | 10 | 14 |
| Nutricion y Dietetica | 10 | 14 |
| Agronomia | 10 | 13 |
| Ingenieria Civil Industrial | 10 | 12 |
| Ingenieria Civil Informatica | 10 | 12 |
| Ingenieria Civil en Ciencia de Datos e Inteligencia Artificial | 10 | 10 |
| Construccion Civil | 10 | 9 |
| Contador Auditor | 8 | 9 |
| Obstetricia y Puericultura | 10 | 9 |
| Trabajo Social | 10 | 9 |
| Ingenieria Comercial | 10 | 8 |
| Licenciatura en Ciencias de la Actividad Fisica | 8 | 8 |
| Medicina Veterinaria | 10 | 8 |
| Psicologia | 10 | 8 |
| Gastronomia y Negocios Gastronomicos | 8 | 6 |
| Educacion Parvularia | 10 | 5 |
| Pedagogia Educacion Basica | 10 | 5 |
| Pedagogia Educacion Diferencial | 10 | 5 |
| Traduccion Ingles Espanol | 10 | 5 |
| Administracion Publica | 10 | 4 |
| Comunicacion Audiovisual y Multimedia | 8 | 4 |
| Diseno | 9 | 4 |
| Pedagogia Educacion Fisica | 10 | 4 |
| Periodismo | 10 | 4 |
| Animacion Digital | 8 | 2 |
| Derecho | 10 | 2 |
| Arquitectura | 10 | 0 |

Solo Enfermería pasa de 20, y una malla tiene del orden de 50 ramos. El detalle
está en [`cruce_mallas.tsv`](cruce_mallas.tsv).

**Que el nombre calce no dice qué sigla le toca a cada estudiante.** Un mismo
ramo tiene varias siglas según la modalidad, y pueden pesar distinto: Matemática
General es `MAT100` (cátedra 40, ejercicio 25, examen 30, diagnóstico 5) y
también `MAT1007`, a distancia (cátedra 30, ejercicio 30, examen 35,
diagnóstico 5). Inglés I es `LCE001`, `LCE0016` y `LCE0017`.

## Qué significa

- **No se puede armar la UDLA completa desde afuera.** Faltan las siglas: las
  mallas públicas no las traen y el buscador conoce 25.
- **Sí se puede resolver ramo por ramo.** Con la sigla que cada estudiante ve en
  MiUDLA, la dirección del programa oficial es directa, y de ahí salen créditos,
  requisitos y ponderaciones. Es la misma vía «cada estudiante trae su programa»
  de la UAI, pero aquí basta la sigla.
- **La lista completa la tiene la Dirección de Catálogo Curricular de la UDLA**,
  que es quien publica los programas. Pedirla es la otra vía.
- No se localizó licencia de reutilización (T0), igual que en el resto.

## Archivos

- [`programas.tsv`](programas.tsv): los 188 programas, con su URL, lo leído de la
  identificación y la tabla.
- [`cruce_mallas.tsv`](cruce_mallas.tsv): por carrera, qué nombres de la malla
  tienen algún programa y con qué siglas.
- En [`../herramientas/`](../herramientas/): `udla.py` (bajada),
  `udla_tabla.py` (lectura de la tabla) y `udla_armar.py` (estos dos archivos).
  No se guardó ningún PDF en el repo.
