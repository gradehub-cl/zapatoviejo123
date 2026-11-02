# Dirección del producto

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

### Hacia dónde va el producto

**GradeHub tiene que entender tu semestre, no solo llevar la cuenta.** Decisión
de Lucas del 2026-08-18. La app deja de pensarse como un registro de notas y
pasa a ser el lugar que sabe qué viene, cuánto pesa, qué necesitas y qué pasa si
te va mal. "¿Qué nota necesito para aprobar?" sigue siendo el corazón, pero deja
de ser el techo.

Dos cosas que conviene tener claras antes de construir hacia allá:

**El foso es la pauta, no las funciones.** "Segundo cerebro" es la categoría más
poblada que existe —Notion, Obsidian, las notas del teléfono— y ninguna de esas
sabe si vas a aprobar Cálculo II. Lo que solo GradeHub puede hacer es lo que
pasa alrededor de una evaluación, porque es el único que tiene las
ponderaciones. Una función que podría vivir igual de bien en una app de notas
genérica es una función que se va a comparar con gigantes y va a perder.

**Notificaciones y widgets NO son del mismo tamaño.** Las notificaciones se
pueden hacer sin tienda: iOS las soporta en PWA desde 16.4 si el estudiante la
agregó a su pantalla de inicio, `sw.js` ya existe —solo le falta el handler de
push— y Supabase trae `pg_cron` instalado para disparar el aviso diario. Los
widgets, en cambio, **no se pueden hacer desde una PWA**: los de iOS necesitan
WidgetKit y una app nativa. O sea, widgets implica App Store, y eso arrastra
US$99 al año, la revisión de Apple —que rechaza envoltorios de sitios web— y su
comisión sobre pagos digitales, que choca con la decisión de monetización
todavía abierta. Notificaciones primero; widgets solo si se decide ir a nativo.
