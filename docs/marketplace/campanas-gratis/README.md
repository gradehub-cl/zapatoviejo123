# Campañas gratuitas · PR #915

**Antes del merge, Lucas debe aplicar `supabase/campanas_gratis.sql` en producción. No se aplicó desde Codex.** Requiere las versiones vigentes de `clases_particulares.sql`, `admin_clases.sql` y `administradores.sql`. El archivo nuevo es reaplicable y va después de esos tres; si se vuelven a aplicar sus definiciones antiguas, reaplicar también este archivo al final.

Un profesor puede enviar una clase o material gratis con tope vacío. El precio $0 oculta el tope y las tarifas, mantiene días/inicio/término y muestra «Publicar una clase gratis no tiene costo». Volver a un precio positivo restaura el tope de $10.000. El rango de $1.000–$5.000.000 se valida al guardar/enviar, sin errores prematuros al escribir.

## Precio aprobado y campañas existentes

El modelo anterior no guardaba el precio al aprobar. La [propuesta](../campanas-gratis-modelo.md) se publicó como primer commit de la PR antes de escribir SQL. La implementación agrega `tutor_anuncios.precio_campana_clp`, escrito solo por el trigger de una publicación nueva, y conserva esa condición en el historial privado `admin.anuncio_publicaciones`. También guarda `configuracion_campana_aprobada` (días, inicio y tope). Preparar la siguiente campaña no puede quitarle el límite ni cambiar los días de la publicación anterior; en una heredada se captura la configuración previa al editarla explícitamente, conservando su tarifa. Ese respaldo heredado queda en `anuncio_campanas.configuracion_previa`, sin permisos de escritura del profesor y sin tomar bloqueos inversos a los del publicador.

- `NULL` significa publicación anterior a esta regla: mantiene exactamente su tope y su cálculo, **aunque el anuncio sea gratis**. No se completa ni recalcula nada retroactivamente.
- Cero significa que la publicación se aprobó gratis: cada tarifa es $0, su costo es $0 con cualquier cantidad de vistas/aperturas/contactos y no se agota por presupuesto. Sí vence o se pausa como siempre.
- Un precio positivo conserva las tarifas y el tope actuales.
- Editar el precio de un anuncio ya publicado no cambia su tarifa aprobada. La próxima publicación aprobada sí toma el precio vigente. Un anuncio que pasó a tener precio no se puede aprobar con un tope vacío.
- La instantánea también queda en el historial para impedir registrar una deuda de una publicación gratuita después de republicar el anuncio como pagado. Los cobros anteriores se conservan.

El check de `tope_clp` admite NULL o el rango anterior; un trigger valida NULL contra el precio del anuncio al guardar configuración y se comprueba otra vez al aprobar. La pausa interna no se confunde con una edición de configuración.

## Métricas y compatibilidad

La nueva RPC `campana_anuncio_con_tarifa` agrega `sin_costo` y conserva la autorización de `campana_anuncio`: dueño o admin con MFA. La RPC antigua mantiene su firma y sus datos. Solo ausencia explícita de SQL permite usar el camino anterior; un error de red o permisos no se oculta con un fallback.

El profesor conserva sus conteos, sin «Va costando», presupuesto ni saldo del tope en campañas gratuitas. Los resúmenes mixtos suman los presupuestos de las pagadas. El admin ve $0 y no tiene editor para registrar deuda en una gratuita; el servidor también lo impide. Las confirmaciones de publicación y término explican que no genera cobros.

No cambian la medición, sus deduplicaciones, umbrales, canales, fechas, datos académicos ni permisos de edición del profesor. No hay una tabla nueva de usuarios. Los clientes anteriores pueden consultar la RPC antigua; para mostrar correctamente la gratuidad necesitan actualizar sus assets, porque su estimación local anterior no conocía esta regla.

## Validación

- `npm run build`, JS de AGENTS.md más `marketplace.js`, CSS 3322/3322 y `git diff --check`.
- `npm test` completo: **367 archivos aprobados**.
- `campanas-gratis.test.js`: validación gratuita/pagada; PGlite con SQL completo y dos aplicaciones del archivo nuevo; campaña antigua intacta; métricas registradas por una cuenta sintética; clase y material gratis; precio congelado al aprobar en ambos sentidos; historial gratuito sin deuda; preparación de una siguiente campaña gratis sin destopar ni recalcular la anterior; columnas internas protegidas; lectura propia y rechazo de ajena; tarifa cliente/SQL idéntica y compatibilidad sin degradar por red.
- `tarifa-campana.test.js` ahora incluye la gratuidad. En los tests de métricas, profesor y admin se actualizan los mocks al nombre ampliado de RPC y las expectativas de esa llamada; se conservan las comprobaciones previas.
- Chrome real, 375 px, claro y oscuro: campos que desaparecen/reaparecen, tope por omisión, métricas gratuitas y ausencia de editor de deuda. Datos inventados y red externa bloqueada.
- [HIG Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields): campos rotulados, formato de pesos, teclado numérico y validación al guardar. [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): objetivos y foco existentes de 44 pt, sin una acción principal nueva, sin controles requeridos ocultos en el recorrido de teclado. Se conservan tipografía, colores y movimiento reducido del editor.

## Capturas a 375 px

| Estado | Claro | Oscuro |
| --- | --- | --- |
| Con precio y tope | [Ver](pagada-375-claro.png) | [Ver](pagada-375-oscuro.png) |
| Gratis, sin tope ni tarifas | [Ver](gratis-375-claro.png) | [Ver](gratis-375-oscuro.png) |
| Métricas del profesor | [Ver](metricas-profesor-375-claro.png) | [Ver](metricas-profesor-375-oscuro.png) |
| Detalle del admin | [Ver](detalle-admin-375-claro.png) | [Ver](detalle-admin-375-oscuro.png) |
