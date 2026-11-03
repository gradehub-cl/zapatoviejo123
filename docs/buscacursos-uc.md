# Base UC desde Buscacursos

## Aplicar y ejecutar

Lucas aplica **`supabase/catalogo_uc_secciones.sql`**, después de
`catalogo_uc.sql` y `profesores.sql`. Se puede volver a ejecutar. La PR no aplica
SQL ni actualiza datos de producción. No cambia el cliente ni `gradehub_v1`.

```sh
npm run build
node bin/buscacursos-uc.js --periodo 2026-2
# Sin --periodo: semestre actual y el siguiente SOLO si el selector lo publica.
node bin/buscacursos-uc-subir.js
```

El uploader lee `SUPABASE_SECRET_KEY` del entorno. Sin clave avisa y termina
con éxito sin subir nada. Nunca se imprime ni se escribe esa clave. La URL
pública sale del helper existente `urlDelProyecto()`.

El lector guarda `.cache/buscacursos-uc.json` solo al completar todos los
períodos. Si ese archivo ya existe, usa sus conteos como referencia. También
acepta `--anterior <archivo>` con una corrida previa o `{ "conteos": { "2026-2": 8000 } }`.
El workflow consulta la referencia vigente de Supabase antes de leer la UC.
No se deben publicar los JSON/HTML crudos como artifacts: contienen docentes
sin el filtro de oposición. El workflow solo publica conteos en el log.

## Consultas y límites

Se identifica con `GradeHubBot/1.0 (+https://gradehub.cl)`. El uso es indexación
para búsqueda: **nunca entrenamiento ni ajuste de modelos**. Solo páginas
públicas, sin cookies de sesión UC, proxies o ejecución de scripts de desafío.
El robots.txt se verificó el 2026-11-03: permite búsqueda y uso de referencia,
prohíbe entrenamiento. Si cambia ese permiso debe revisarse antes de continuar.

Una consulta a la vez, al menos un segundo entre inicios, máximo tres reintentos
con espera creciente para errores transitorios. HTTP 403/429 o una página de
captcha/desafío detienen toda la corrida sin reintentos. La inyección pasiva
`jsd/main.js` en una página normal con resultados no se ejecuta ni se confunde
con una página de bloqueo. El parser exige estructura y encabezados conocidos.

El formulario enumera las unidades académicas y los períodos publicados. Una
consulta por unidad normalmente cubre sus secciones. La página avisa el recorte
actual de **500 filas**; también se divide al llegar a 500 aunque falte el aviso.
Las unidades recortadas se dividen por caracteres de sigla, recursivamente.

Importante: el filtro de sigla busca por **contenido**, no es un prefijo anclado.
Cada rama cubre todas las siglas que empiezan por ella y puede devolver otras;
se unen por NRC. Se consultan todos los caracteres admitidos, no solo los que
ya conocemos en `cursos-uc.js`. Si una sola sigla llega al límite o la respuesta
ignora el filtro, se falla sin publicar. No hay una consulta adicional por NRC,
profesor, sala o vacante: todo sale de la fila principal.

Los horarios se guardan como `{dias,modulo,tipo,sala}`. Los campos parciales
reales (`:`, `L:`, `:8`) conservan lo conocido y usan `[]`/`null` para lo que la
fuente no informa. Domingo es `D`. Los nombres se conservan en el orden de la
UC: no se infiere cuál palabra es nombre o apellido.

## Protección de la base

- Si un período trae menos del 70% de las secciones anteriores o no se reconoce
  el HTML, el lector no reemplaza su archivo de salida.
- El uploader valida todos los períodos contra la referencia remota antes de
  escribir lotes. Los lotes de hasta 1000 filas van a
  `catalogo_uc_secciones_lotes`, con id de carga aleatorio.
- La RPC de consolidación comprueba cantidad completa y guarda del 70% otra
  vez, bajo bloqueo por período. Publicación, cursos nuevos y bajas ocurren en
  una transacción. Una preparación incompleta no altera la base vigente.
- Secciones ausentes quedan `vigente=false`; no se borra su historia.
  Preparaciones abandonadas se limpian después de siete días, tras una carga
  completa. No hay datos de cuentas en estas tablas.
- `catalogo_uc` recibe solo siglas nuevas, con `ON CONFLICT DO NOTHING`; no se
  modifica ningún crédito existente. Para siglas del respaldo se conservan sus
  créditos y se registran diferencias en el log. `busquedaDe` se importa del
  generador CSV; no hay una segunda normalización.
- El log de consolidación entrega leídas, nuevas, cambiadas, ausentes y cursos
  nuevos. La lectura entrega consultas y duración. Sin SQL/secreto no se
  inventan cifras de cambios contra producción.

## Lectura pública y oposición de docentes

Ambas tablas tienen RLS. `anon` y `authenticated` no leen la base ni los lotes;
solo `service_role` escribe. `catalogo_uc_secciones_publicas(periodo,sigla,desde)`
lee como máximo 1000 secciones vigentes por página, con orden estable.

Esta RPC es la única lectura pública nueva: reemplaza cada docente coincidente
con `profesor_ocultos` por **«Sin informar»** usando `profesor_coinciden`.
También compara las rotaciones del nombre porque Buscacursos usa apellido antes
del nombre; ante coincidencia se privilegia ocultar. La exclusión se consulta
al leer: no depende de esperar otra actualización de Buscacursos. El resto de
los campos de la sección sigue público. No hay FK a `auth.users`: son datos de
oferta de cursos, no de usuarios. PGlite comprueba tabla privada, RPC pública,
rol de escritura, ocultación y reaplicación.

## Automatización y prueba de Actions

El cron despierta cada hora. `buscacursos-uc-config.js` permite una corrida a
las **03:17 de Chile** al día y cada hora durante ventanas inclusivas de toma.
La lista está vacía: Lucas debe poner las fechas reales; 2027-1 no se inventó.
La zona `America/Santiago` absorbe el horario de verano sin mover el cron.

El job que sube usa el environment `supabase`, que debe seguir restringido a
`main`. Los permisos son `contents: read` y la concurrencia no cancela corridas.
Un dispatch en `main` actualiza el período elegido. Un dispatch en otra rama
solo prueba acceso HTTP desde Actions: no recibe secretos y no escribe SQL.

GitHub exige que el workflow nuevo exista en la rama predeterminada para
admitir `workflow_dispatch`. Por eso, mientras esta PR siga sin mergear, la
prueba de acceso desde Actions puede quedar pendiente; no se toca `main` para
forzarla. Cuando exista allí, ejecutar en una rama la opción manual y revisar
si da acceso o 403/429/desafío. Si se bloquea, se detiene: Lucas decide si pide
permiso a la UC o corre el lector desde otro lugar.

## Pruebas y referencias

`node tests/buscacursos-uc.test.js` no usa red: fixtures de tres búsquedas reales
recortadas al mínimo, variantes sintéticas y PGlite. Cubre horarios múltiples,
varios/sin profesores, cero vacantes, vacío válido, HTML desconocido, partición,
ritmo/reintentos/bloqueos, guarda del 70%, búsqueda compartida, lotes, créditos,
RLS, docentes ocultos, bajas conservadas y publicación atómica.

Se revisaron las consultas, límites y parser de las referencias **MIT**:
- https://github.com/open-source-uc/ramos-uc
- https://github.com/kovaxis/buscacursos-dl

El parser JavaScript es propio; el algoritmo de partición se adapta a su
comportamiento documentado. Releases de 2023 no se usan como fuente actual.
BuscaRamos-v2 (AGPL) y BC_API (GPL) se revisaron como descripción de producto;
no se copió su código ni sus estructuras. Tampoco se reutilizó un repo sin licencia.

No se implementan requisitos, armador de horarios, vacantes del cliente ni
sugerencias nuevas de profesor. Leer requisitos de catalogo.uc.cl requiere otra
petición por sigla; se propone evaluar una tabla por sigla en una siguiente PR,
con aprobación de Lucas y una medición separada de costo/cobertura. Los tres
respaldos existentes se mantienen intactos.

### Aviso MIT de las referencias

```text
MIT License

Copyright (c) 2021 Nicolás Mc Intyre

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
