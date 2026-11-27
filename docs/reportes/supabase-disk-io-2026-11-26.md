# Supabase Disk I/O investigation

Archived on 2026-11-26 from the supplied investigation. The figures are from that snapshot. The capture timestamp is unspecified.

## Nota del 2026-11-27: revisión contra producción

Este informe se contrastó con producción el 26-11 (solo lectura). Lo de abajo se conserva como llegó, pero su conclusión cambia:

- **Las lecturas de disco no son el problema.** La base pesa 80 MB y cabe entera en memoria (`shared_buffers` de 256 MB). Desde julio se han leído 8.881 bloques de disco en total, así que ordenar las consultas por bloques leídos no explica ningún consumo de I/O.
- **Los archivos temporales no vienen de la app.** Hay 368 GB acumulados, pero el rol `authenticated` escribió 0 bytes. Lo que alcanza a verse en `pg_stat_statements` sale del rol `postgres`: consultas de análisis, el panel y el resumen semanal.
- **Lo que sí había eran timeouts.** Cuatro funciones descomprimían el JSON completo de las cuentas en cada llamada (leer un solo campo de las 1.887 cuentas cuesta unos 160 ms) y el 26-11 se cortaron 70 veces.

| Función | Media | Timeouts 26-11 | Arreglo |
|---|---|---|---|
| `date_consensus` | 1.520 ms | 42 | #1370: pg_cron la precalcula cada 15 minutos (1,3 ms) |
| `estadisticas_publicas` | 314 ms | 18 | #1370: pg_cron la precalcula cada hora (0,6 ms) |
| `catalog_consensus_periodo` | 225 ms | 10 | #1373: revisa cada cuenta una vez, no una por reporte (UC: de 102 a 43 ms) |
| `curso_posicion` | 26 ms | 0 | #1373: una consulta en vez de dos |

Queda pendiente:

- **Ver el gráfico de Disk I/O del panel de Supabase.** No se revisó, así que no se sabe si hubo una alerta real de presupuesto ni a qué hora se consume.
- **Leer `tenant`, `onboardingDone` y `tipoCuenta` sin abrir el JSON.** Hay 46 lecturas así en `supabase/`. Toca `user_ramos`, así que se acuerda antes de hacerlo.

De las recomendaciones de más abajo, la 1 quedó hecha en #1370. La 2 (paginación del catálogo) y la 3 (escrituras de `user_ramos`) no se midieron como problema: el catálogo suma 68 llamadas y las escrituras de `user_ramos` son 2,8 GB de WAL en cuatro meses.

## Investigation notes

> I’ll check the project’s PostgreSQL guidance, installed extensions, and schema to confirm how `pg_stat_statements` is available before querying its I/O counters.
>
> `pg_stat_statements` is installed. I’m checking the current Supabase guidance for interpreting its block counters, then I’ll run a read-only ranking of the recorded statements.
>
> The counters point mostly to repeated reads from `estadisticas_publicas()` and writes from Auth token/session churn and `user_ramos` upserts. I’ll inspect the two read-heavy function definitions and their relevant indexes so the recommendations can target actual filters rather than guess.

## Findings

`pg_stat_statements` has been collecting since **2026-07-28**. These are cumulative counters, not a live view of your current Disk I/O budget. The top statements show relatively small totals over that period:

- **Reads — `public.estadisticas_publicas()`**: about **1,874 shared blocks (14.6 MiB)** across roughly **8,564 calls**. Its SQL recounts users and traverses JSONB data, including nested arrays in `user_ramos`. This is the clearest repeated-read optimization candidate.
- **Reads — `public.catalogo_uc_secciones_publicas(...)`**: about **383 blocks (3.0 MiB)** across **68 calls**. It filters on `periodo` and `vigente`, optionally filters on `sigla`, and supports offset pagination. Existing indexes include `(periodo, sigla)` and the primary key `(periodo, nrc)`.
- **Writes — Auth refresh-token activity**: refresh-token inserts account for about **1,884 blocks (14.7 MiB)** across **51,097 calls**; revocations account for about **524 blocks (4.1 MiB)** across **45,655 calls**.
- **Writes — `user_ramos` JSONB updates**: about **1,452 blocks (11.3 MiB)** across **176,329 calls**.

I would **not** conclude from these counters alone that any one query is exhausting the budget. Shared block counts are not a direct measure of physical disk traffic or billed I/O, and the recorded `shared_blk_read_time` / `shared_blk_write_time` values were `0.00 ms`. The counters therefore don’t establish what is driving the current budget pressure.

## Targeted optimizations

1. **Avoid recalculating public statistics on every request.** Cache the result of `estadisticas_publicas()` or maintain summary counters/aggregates as data changes. Its full-user counts and repeated JSONB traversal are the strongest candidate for reducing repeated reads. An index on `auth.users(last_sign_in_at)` might help the “active in the last 7 days” portion if the execution plan shows that scan is costly, but it won’t remove the full account count or JSONB scans.
2. **Review pagination for the catalog function.** Large `OFFSET` values can make the function do more work than the returned page requires. If clients paginate deeply, consider keyset pagination using the ordering columns (`sigla`, `seccion`, `nrc`). The existing `(periodo, sigla)` index already matches part of the filter; don’t add a larger index without checking the actual plan, since extra indexes also take storage and add write work.
3. **Reduce unnecessary `user_ramos` writes.** Check whether the application sends updates when `data` is unchanged, and suppress no-op writes where appropriate. If parts of this JSONB document change frequently, consider whether those frequently updated fields belong in separate rows rather than repeatedly updating the whole document.
4. **Treat Auth writes as a workload to investigate, not as a table to edit.** If the write activity is unexpected, look for excessive refresh/retry behavior or duplicate client sessions. Avoid directly modifying Supabase Auth’s internal tables.

For the active budget issue, compare the affected time window against Supabase’s Metrics and database inspection guidance. The block counters here don’t by themselves identify a current spike. [Supabase Metrics](https://supabase.com/docs/guides/observability/metrics) · [Database inspection guidance](https://supabase.com/docs/guides/observability/inspect)
