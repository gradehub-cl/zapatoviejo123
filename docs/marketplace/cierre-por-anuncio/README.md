# Cerrar solo el anuncio elegido · PR #916

**Antes del merge, Lucas debe habilitar `pg_cron` y aplicar `supabase/anuncios_cierre_por_anuncio.sql` en producción, después de `supabase/anuncios_cierre.sql`. Codex no aplicó SQL.** El archivo nuevo se puede ejecutar de nuevo. Si no está disponible el programador, falla dentro de la transacción: no deja la tabla instalada sin mantenimiento.

La X oculta solo ese anuncio hasta la próxima medianoche de Chile. Otro anuncio que calce puede aparecer inmediatamente; si se cierran todos, no aparece ninguno. El día siguiente vuelven a ser candidatos. El mensaje y el nombre accesible dicen «este anuncio».

## Modelo y compatibilidad

La [propuesta de modelo](../cierres-anuncio-modelo.md) se publicó en esta PR antes de escribir SQL. Se implementa la tabla nueva `anuncios_cierres_por_anuncio`, con clave `(user_id, anuncio_id)` y `oculta_hasta`. La cuenta y el límite los fija el servidor; la RPC de escritura recibe únicamente `p_anuncio_id`.

`anuncios_cierre` y `mi_cierre_anuncios` permanecen intactas. Un cierre global antiguo sigue ocultando todos los anuncios hasta que venza. Una app vieja puede continuar llamando la RPC anterior. El cliente nuevo lee ambos modelos y nunca convierte un cierre individual en global.

La copia de los ids con su día chileno y la cola pendiente viven en `gradehub_marketplace_v1`, separadas por cuenta; no se usa `gradehub_v1`. Se conservan los campos heredados y su vencimiento. Sin red, el cierre se conserva para reintentar; si el almacenamiento está bloqueado, la memoria permite ocultarlo y enviarlo mientras la página siga abierta. El mensaje distingue si no se pudo guardar en los otros dispositivos.

Las lecturas en vuelo se comparten. Se refresca al volver a la app, recuperar conexión o recibir un cambio de storage; una respuesta tardía queda asociada a su cuenta original. Un cambio de cuenta no envía sus pendientes como si fueran de otra.

La selección usa los ids cerrados como exclusiones y conserva la rotación entre los restantes. Cerrar no registra apertura ni contacto. El seguimiento de visibilidad de un anuncio que efectivamente se muestre mantiene sus umbrales, canales y deduplicación anteriores.

## Auditoría de acceso, borrado y retención

- RLS habilitada y permisos explícitos. `SELECT`, `INSERT`, `UPDATE` y `DELETE` solo sobre filas propias; `UPDATE` comprueba dueño antes y después. Anon no accede a tabla ni RPC.
- Las dos FK llevan `ON DELETE CASCADE`: borrar la cuenta elimina sus cierres; borrar el anuncio elimina los asociados. Los índices cubren cuenta/anuncio, borrado por anuncio y vencimiento.
- El trigger fija siempre la próxima medianoche de `America/Santiago`, incluso si se intenta escribir una fecha lejana directamente. El reloj/zona del dispositivo no decide el vencimiento remoto.
- `mis_cierres_anuncios` depura filas propias vencidas y devuelve solo las vigentes. La función de mantenimiento `limpiar_cierres_anuncios`, sin permiso de ejecución para clientes, borra las vencidas de todas las cuentas.
- Un trabajo diario de pg_cron, `gradehub-cierres-anuncios`, ejecuta la limpieza a las 06:15 UTC. No depende de que vuelva el usuario. Volver a aplicar el SQL actualiza el trabajo por nombre; no lo duplica. No se borran anuncios ni cierres vigentes.
- No se modifican notas, perfiles, consentimientos, anuncios ni medición. La información nueva es solo una preferencia de cierre por cuenta/anuncio y su vencimiento.

## Validación

- `npm run build`, JS de AGENTS.md más `marketplace.js`, CSS 3322/3322 y `git diff --check`.
- `npm test` completo: **367 archivos aprobados**.
- `cierres-por-anuncio.test.js`: PGlite, reaplicación, trabajo único, dos clientes con discos independientes, cierre en uno leído en el otro, cola offline, storage bloqueado, concurrencia, cambio de cuenta, cruce de medianoche de Chile, RLS con controles positivos, suplantación/reasignación/borrado ajeno rechazados, limpieza y cascadas de cuenta/anuncio.
- `recomendacion-clases.test.js`: A cerrada deja B, ambas cerradas dejan vacío, reaparece al otro día, fines de mes/año y cambios de hora, cierre global heredado respetado, texto accesible y contrato anterior de tabla/RPC global. Las pruebas de sincronización se trasladan al nuevo mecanismo por anuncio; se conservan los casos de red, cola y cuentas.
- El programador se simula en PGlite: se verifica el registro y su idempotencia, y se ejecuta la función real de limpieza. No es una prueba de que haya corrido pg_cron en producción. Después de aplicar SQL, comprobar el trabajo en `cron.job`.
- Chrome real a 375 px, claro y oscuro: A → X → B, luego ambas cerradas → sin banner. Se verifica que el cierre envía solo el id y no llama al registro de apertura/contacto. Sin cuentas ni datos reales.
- [HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons): X existente de 44 pt, nombre accesible que describe su alcance y respuesta inmediata. [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) y [Writing](https://developer.apple.com/design/human-interface-guidelines/writing): confirmación breve, clara y específica; conserva foco, estilos y compatibilidad con movimiento reducido.

## Capturas a 375 px

| Estado | Claro | Oscuro |
| --- | --- | --- |
| Anuncio A | [Ver](antes-cerrar-375-claro.png) | [Ver](antes-cerrar-375-oscuro.png) |
| Cerrar A deja B visible | [Ver](despues-cerrar-a-375-claro.png) | [Ver](despues-cerrar-a-375-oscuro.png) |
| Ambos cerrados | [Ver](despues-cerrar-ambos-375-claro.png) | [Ver](despues-cerrar-ambos-375-oscuro.png) |
