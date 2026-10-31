# Cierre por anuncio: modelo propuesto antes del SQL

Decisión de Lucas del 2026-10-31. Se propone una tabla nueva `public.anuncios_cierres_por_anuncio`: clave primaria (`user_id`, `anuncio_id`), `oculta_hasta timestamptz`. Ambas FK llevan ON DELETE CASCADE, hacia auth.users y tutor_anuncios. RLS y permisos explícitos permiten leer y escribir únicamente filas propias; la RPC recibe solo el id del anuncio y obtiene cuenta y próxima medianoche de America/Santiago en el servidor.

La tabla y RPC antiguas anuncios_cierre / mi_cierre_anuncios permanecen sin cambios. El cliente nuevo consulta también el cierre global y respeta uno vigente hasta su vencimiento. No interpreta los cierres nuevos como cierres globales. Apps antiguas conservan su contrato.

La copia local sigue en gradehub_marketplace_v1, con ids y día de Chile, aislados por cuenta; conserva los campos globales anteriores hasta vencer. Se descartan ids cerrados al seleccionar. La medición no cambia: cerrar no registra apertura ni contacto y no envía notas ni ramos.

Retención: se depuran filas propias vencidas al consultar/escribir; además, una función de mantenimiento sin permisos de cliente elimina las vencidas de todas las cuentas. Se propone un trabajo diario de pg_cron cuando la extensión esté disponible; en su ausencia, el SQL deja una instrucción explícita para programarlo antes del merge. La limpieza nunca borra anuncios ni cierres vigentes. La auditoría incluye RLS con dos cuentas, permisos, cascadas al borrar cuenta/anuncio, vencimientos y reaplicación.

El SQL se escribirá después de publicar esta propuesta en la PR. No se aplica en producción; Lucas lo aplica antes del merge.

