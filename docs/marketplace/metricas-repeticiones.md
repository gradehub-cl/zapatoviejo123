# Personas y repeticiones de anuncios

Decisión de Lucas, 2026-11-01: medir personas y repeticiones por separado. El
cobro sigue contando cada cuenta una sola vez por anuncio/publicación; las
cuentas admin, el autor y cuentas sin ramos siguen excluidas.

## Aplicación manual antes del merge

Aplicar **`supabase/anuncio_eventos.sql`**, después de los SQL existentes de
clases y administradores. No se aplica desde el deploy. Es aditivo y reaplicable:
no cambia anuncios, tarifas, cobros, campañas ni los RPC anteriores. Si se
reaplican los SQL principales, este complemento no reemplaza sus funciones.

Si existe `pg_cron`, instala una tarea diaria a las 06:25 UTC para limpiar
recibos vencidos. Sin esa extensión, quien administra la base debe programar
`select public.limpiar_eventos_anuncios();` diariamente con un rol de servicio.
No está disponible para clientes autenticados o anónimos.

## Qué cuenta

- `anuncio_alcance` / `anuncio_interacciones` y `costo_campana` siguen siendo
  la fuente de personas y cobro. No se modifican.
- `registrar_evento_anuncio` registra una exposición, apertura o contacto después
  de confirmar su registro único. Una clave UUID por evento impide duplicar
  reintentos, incluso si el servidor guardó pero la respuesta se perdió.
- Inicio conserva el umbral de 50% visible durante un segundo. Repintar dentro
  de una apertura conserva su clave; volver a abrir permite otra exposición.
  En catálogo, volver a abrirlo permite otro evento; buscar o repintar conserva
  la deduplicación de la visita por canal. Cada nuevo clic puede contar otra vez.
- La publicación enviada debe coincidir con la del anuncio. Internamente se
  separan por `medicion_desde`. No se mezclan campañas ni se aceptan eventos de
  anuncios no disponibles, salvo completar la marca pendiente del primer evento
  que alcanzó el tope, igual que en el mecanismo anterior.
- Son **veces medidas**, no una promesa de capturar todas las vistas físicas:
  una app antigua, desconexiones o una llamada que nunca llegó no se reconstruyen.
  El servidor no puede verificar que una vista ocurrió físicamente en pantalla.
  Estos eventos adicionales nunca aumentan la facturación.
- Cupo diario por cuenta, anuncio, publicación y tipo: **20 impresiones,
  10 aperturas y 5 contactos**, en UTC, como el agregado diario. El evento que
  excede el cupo devuelve `false`, sin recibo ni agregado, y el cliente no lo
  reintenta. El índice del cupo usa los recibos existentes; no hay otra tabla
  de identidad. El bloqueo del anuncio evita superar el límite por concurrencia.
  El cupo limita el abuso de una cuenta; no garantiza autenticidad física ni
  evita abuso coordinado con muchas cuentas. No se recortan cifras anteriores.

## Cuentas y anuncios existentes

El cambio cubre anuncios nuevos y existentes: los que siguen publicados empiezan
a registrar repeticiones sin republicarse, y los pausados o terminados conservan
sus personas y cobros. Si tuvieron medición nueva, también conservan esas veces
al pausarse o terminar. Una campaña que venció antes de instalar este SQL indica
«Esta campaña terminó antes de medir repeticiones», sin inventar tres ceros ni
mostrar una fecha de inicio posterior a su término.

No hay backfill: el agregado antiguo también estaba deduplicado y no permite
recuperar las repeticiones. La pantalla mantiene las personas históricas y
muestra «veces medidas» con fecha/hora de inicio de la medición. Es normal que
al principio ese total sea menor que las personas históricas. Los gráficos de
desglose anteriores conservan sus registros y se identifican como históricos;
no son un gráfico completo de las nuevas repeticiones.

Si falta el SQL nuevo, el cliente sigue usando el RPC anterior y conserva el
cobro. La pantalla omite la segunda columna y explica que el total de veces
todavía no está disponible. No sustituye repeticiones con el agregado viejo.

## Acceso y borrado

`anuncio_eventos_recibos` conserva cuenta autenticada, clave por evento, anuncio,
publicación, tipo y fecha, para idempotencia. Tiene RLS, sin permisos directos de
cliente, FK a `auth.users ON DELETE CASCADE` y borrado a los 90 días del fin de
la publicación. No recibe notas, nombre, carrera, criterio, búsqueda ni ID de
dispositivo. `anuncio_eventos_diarios` conserva únicamente agregados anónimos
por anuncio/publicación/día UTC/tipo. Borrar el anuncio elimina ambas tablas por
FK; borrar la cuenta elimina sus recibos y conserva el agregado sin identidad.

`resumen_eventos_anuncio` solo devuelve lo del autor o de un admin con MFA. El
admin ve los totales exactos; el autor ve cero o al menos 15, y una raya para
totales entre 1 y 14. No expone recibos ni identidades.

## Validación y diseño

PGlite prueba permisos, MFA, exclusiones, idempotencia, independencia del cobro,
umbral de privacidad, retención, cascadas y reaplicación. Las pruebas del cliente
cubren respuesta perdida, reapertura, umbral visible, cambio de cuenta y ausencia
del SQL. Se actualizaron las pruebas que buscaban «veces en total» a «veces
medidas» y fixtures con la nueva fuente.

La suite completa pasa (374 archivos), junto con los chequeos de JS y CSS.
Se verificó el componente real con datos sintéticos en Chrome a 375 y 1280 px,
claro/oscuro y texto al 150%, sin desbordes.

Se conserva la tipografía, los colores y el componente existente. La guía de
Apple [Charts](https://developer.apple.com/design/human-interface-guidelines/charts)
orienta las etiquetas y el contexto temporal: personas y eventos no se presentan
como cifras equivalentes ni se dibuja un cero cuando el dato está oculto.
