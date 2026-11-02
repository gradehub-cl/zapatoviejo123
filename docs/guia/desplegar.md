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
app a `dist/` y excluye `src/`, `tests/`, `supabase/`, `bin/`, los `.md` y los
`package*.json`. Antes se le pasaba `.` a Wrangler y gradehub.cl servía el repo
completo: `AGENTS.md` con la lista de lo que todavía no está asegurado, el
esquema en `supabase/*.sql` y los tests, que describen los vectores conocidos
con carga útil incluida. La lista es de exclusión y no de inclusión a propósito
— si alguien agrega un archivo y olvida esta lista, se publica igual en vez de
desaparecer del sitio sin que nadie lo note —, y hay una comprobación que
revienta el deploy si falta cualquier archivo de la app.

Antes de copiar, `npm ci` y `npm test` ensamblan los scripts desde
`src/orden.json`. Los nombres, el orden, el sellado y el precache se conservan.
`npm run deploy` también ensambla antes de publicar; la preparación de iOS lo
hace incluso si se llama directamente al shell. Ver [fuentes-js.md](fuentes-js.md).

El deploy manual sigue existiendo por si el CI está caído (`npm run deploy`),
pero necesita Wrangler autenticado en la máquina de quien lo corra. Lucas y
Martín tienen acceso de administrador a la cuenta de Cloudflare; tener Wrangler
autenticado localmente es otra cosa y se hace aparte.

## El SQL de Supabase

Ningún deploy aplica `supabase/*.sql`. Hasta el 2026-10-27 cada archivo se copiaba
a mano al SQL Editor, y a veces quedaba sin aplicar sin que nadie lo notara
(`errores_app` estuvo días así). Ahora hay un atajo desde el Mac de Martín:

```bash
node bin/sql-produccion.js aplicar supabase/<tema>.sql   # pide confirmación
node bin/sql-produccion.js consultar "select …"           # solo lectura
```

- **aplicar** muestra un diálogo de macOS por archivo ("Aplicar" / "Cancelar") que
  tiene que apretar una persona; sin ese clic no se manda nada. Cada archivo corre
  entero o nada: sin `begin;` propio va en una transacción, y con `begin;`/`commit;`
  se respeta el suyo. Los marcados `-- sql-produccion: manual` no se aplican.
- **consultar** comprueba antes que la sesión sea de solo lectura y, si no, no
  corre. Sirve para revisar errores, comentarios o la salud de los datos sin pegar
  resultados a mano.
- Usa la API de administración de Supabase con un token personal guardado en el
  Llavero (servicio `gradehub-supabase`): nunca en el repo ni en el chat.

Reglas para quien escribe SQL:

- **Se tiene que poder correr de nuevo**: `create or replace function`,
  `create table if not exists`, `drop policy if exists` antes de `create policy`.
- **Lo de una sola vez** (respaldos, limpiezas, la prueba de aislamiento) lleva
  `-- sql-produccion: manual` en la primera línea.

Se descartó aplicarlo desde GitHub Actions con aprobación: con el repo privado en
el plan gratis de la organización, GitHub no ofrece *Required reviewers* y la
contraseña de la base quedaría al alcance de cualquier rama.

### Orden del SQL de Clases y sus métricas

Para una instalación completa de este subsistema, aplicar en este orden. No es
una instrucción para ejecutar automáticamente todos los SQL del repositorio:

1. `supabase/clases_particulares.sql`
2. `supabase/admin_clases.sql`
3. `supabase/administradores.sql`
4. `supabase/admin_no_cuenta.sql`
5. `supabase/admin_estadisticas.sql`
6. `supabase/campanas_gratis.sql`
7. `supabase/paneles_historial.sql`
8. `supabase/anuncio_eventos.sql`

El archivo base conserva las definiciones vigentes de `costo_campana`,
`preparar_publicacion_clase`, `limpiar_alcance_anuncios`,
`limpiar_interacciones_anuncios` y `totales_metricas_anuncio`, más sus dependencias
internas de precio aprobado e historial. Reaplicar **solo el base** no revierte
esas cinco funciones. Los complementos de campañas gratis e historial añaden sus
otras RPC y permisos, sin volver a definirlas. No se rellena el precio histórico
ni se cambian campañas existentes. Si se instala en una base antigua, conserva
las precauciones de respaldo que encabezan el SQL.

`tests/clases-base-vigente.test.js` lee este orden, instala el subsistema con
PGlite y comprueba los md5 de producción antes y después de reaplicar el base.
