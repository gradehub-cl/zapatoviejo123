# Decisiones de clases particulares

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

### Marketplace de clases: decisiones cerradas, todavía sin activar

El diseño aprobado está en `docs/marketplace-clases.md`. Una misma identidad de
Supabase puede tener un espacio de estudiante y una ficha separada de profesor;
ser estudiante no habilita a ofrecer clases. Lucas aprueba primero al profesor y
después cada anuncio. Suspender al profesor oculta todas sus campañas sin borrar
el historial.

La recomendación usa universidad, sigla, promedio y avance, pero se decide dentro
de GradeHub y el profesor recibe solo agregados. Se muestra solo en Inicio, una
vez en la mañana (hasta las 14:00) y una en la tarde: en la primera entrada de
cada franja, y no vuelve si la persona entra de nuevo en la misma franja o la
cerró. La primera vez que se cierra una clase se esconde hasta la próxima
franja; la segunda, no vuelve más en ese dispositivo y recién ahí se avisa "no
te la volvemos a mostrar" (decisión de Lucas del 2026-09-25). Los anuncios también se pueden explorar en un
catálogo general.

Desde el 2026-10-31, las nuevas campañas aprobadas con precio $0 no tienen
costo (clase o material). `campanas_gratis.sql` conserva el precio aprobado;
las campañas anteriores mantienen su cálculo y tope, sin backfill. Al reaplicar
los SQL principales de clases/admin, este complemento se aplica al final.
Detalle de compatibilidad y validación: `docs/marketplace/campanas-gratis/README.md`.

La tarifa cambió el 2026-09-25 (decisión de Lucas): $100 por día publicada y,
por persona, $10 si la vio, $50 si la abrió y $1.000 si contactó. Cada persona
cuenta una vez por anuncio. El profesor elige los días (o las fechas: puede dejar
el anuncio programado) y un tope, que es lo máximo que pagaría; al llegar, la
clase deja de mostrarse. Filtrar por nota no cuesta más. No cuentan el propio
profesor ni cuentas sin ramos. En el piloto no se cobra: se muestra lo que
costaría. La tarifa vive en `tarifa_campana_clp` (SQL) y `TARIFA_CAMPANA`
(marketplace.js), y `tests/tarifa-campana.test.js` exige que coincidan. El
contacto es solo por WhatsApp, con el número oculto tras un botón.

Desde el 2026-09-25 están el flujo de profesor, el catálogo, la tarjeta junto
al ramo en Inicio y el alcance por camino (recomendación, búsqueda, lista).
El SQL de `clases_particulares.sql` y `admin_clases.sql` se aplica a mano. Esta última necesita una tabla privada con FK a
`auth.users`, `ON DELETE CASCADE`, retención de 90 días y SQL aplicado a mano;
por eso su PR será borrador. `anuncio_metricas` cuenta eventos y no se usa para
facturar personas.
