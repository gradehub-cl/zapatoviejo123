# Desplegar

> Detalle de [AGENTS.md](../../AGENTS.md). Léelo antes de tocar workflows, `sw.js`, el deploy o si un deploy sale malo.

## Desplegar

**Mergear a `main` publica en gradehub.cl.** El workflow corre los tests primero
y solo despliega si pasan. No hay paso manual y no hace falta que nadie tenga
Wrangler autenticado en su máquina.

Para republicar sin un commit nuevo (reintentar un deploy caído): pestaña
Actions → `deploy` → *Run workflow*.

**Si un deploy sale malo, primero se vuelve atrás y después se investiga.**
Cloudflare Pages guarda los despliegues anteriores y deja volver a uno desde su
panel: es inmediato y no depende de que el CI esté sano, que es justo lo que no
se puede asumir en ese momento. Ojo con la trampa: eso NO toca el repo. Si no
revierte también el commit en `main`, el próximo merge vuelve a publicar lo
mismo y el sitio se rompe de nuevo sin que nadie entienda por qué.

**El `CACHE_NAME` de `sw.js` ya no se toca.** Lo sella el deploy con el SHA del
commit; en el repo dice `gradehub-dev` y así se queda. Si tu PR cambia `sw.js`
solo para subir un número, sácalo del diff.

Era un contador de una línea que todas las ramas querían escribir a la vez:
seis conflictos, uno publicó un service worker con marcadores de conflicto
adentro, y la última vez tres PRs reclamaron `gradehub-v73` en paralelo. La
guarda los dejó pasar a los tres porque comparaba contra la base del PR, no
contra el `main` del momento del merge.

**El deploy publica `dist/`, no el repo.** El workflow copia los archivos de la
app a `dist/` y excluye `tests/`, `supabase/`, `bin/`, los `.md` y los
`package*.json`. Antes se le pasaba `.` a Wrangler y gradehub.cl servía el repo
completo: `AGENTS.md` con la lista de lo que todavía no está asegurado, el
esquema en `supabase/*.sql` y los tests, que describen los vectores conocidos
con carga útil incluida. La lista es de exclusión y no de inclusión a propósito
— si alguien agrega un archivo y olvida esta lista, se publica igual en vez de
desaparecer del sitio sin que nadie lo note —, y hay una comprobación que
revienta el deploy si falta cualquier archivo de la app.

El deploy manual sigue existiendo por si el CI está caído (`npm run deploy`),
pero necesita Wrangler autenticado en la máquina de quien lo corra. Lucas y
Martín tienen acceso de administrador a la cuenta de Cloudflare; tener Wrangler
autenticado localmente es otra cosa y se hace aparte.

## El SQL de Supabase

Hasta el 2026-10-27 cada archivo de `supabase/` se copiaba a mano al SQL Editor, y a
veces quedaba sin aplicar sin que nadie lo notara (`errores_app` estuvo días así).
Ahora lo aplica el workflow `sql-produccion`, con permiso:

1. Un PR cambia o agrega `supabase/<tema>.sql` y se mergea a `main`.
2. El job **revisar** lista qué archivos se van a aplicar, en qué orden y con su
   diff, en el resumen de la corrida. No tiene acceso a la base.
3. El job **aplicar** espera la aprobación de Martín (environment `produccion-sql`,
   *Required reviewers*). GitHub le avisa; aprueba en *Review deployments*.
4. Cada archivo corre entero o no corre: sin `begin;` propio va en una sola
   transacción, y con `begin;`/`commit;` se respeta el suyo
   (`bin/sql-produccion.js`). Si uno falla, los siguientes no se aplican y la
   corrida queda en rojo con el error de Postgres.

Reglas para quien escribe SQL:

- **Se tiene que poder correr de nuevo.** El mismo archivo se vuelve a aplicar cada
  vez que se edita: `create or replace function`, `create table if not exists`,
  `drop policy if exists` antes de `create policy`.
- **Lo de una sola vez** (respaldos, limpiezas, la prueba de aislamiento) lleva
  `-- sql-produccion: manual` en la primera línea y nunca se aplica solo.
- Para aplicar algo que ya está en `main`: Actions → `sql-produccion` → *Run
  workflow* con la lista de archivos. También pide aprobación.

La conexión (`PRODUCCION_DB_URL`, la del *Session pooler*: GitHub no tiene IPv6)
vive solo en el environment, restringido a `main`. Ningún agente la tiene.
