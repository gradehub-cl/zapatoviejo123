# Campañas gratis: modelo propuesto antes del SQL

Decisión de Lucas del 2026-10-31. El modelo actual no conserva el precio al aprobar; el costo se deriva de métricas de la publicación vigente. Se propone agregar `tutor_anuncios.precio_campana_clp`, escrito solo por servidor al comenzar una nueva publicación, con el precio aprobado. NULL identifica publicaciones anteriores y conserva íntegramente el cálculo previo, aun cuando su precio actual sea cero. No hay backfill ni reclasificación de campañas vigentes. La instantánea se conserva también en admin.anuncio_publicaciones para proteger el historial de cobros.

Las publicaciones nuevas aprobadas con precio cero cuestan cero y no se agotan por tope. Cambiar el precio mediante el editor admin no modifica esa instantánea; al aprobar una publicación nueva se renueva. Los días, medición e historial siguen sus reglas actuales. Un tope NULL solo se acepta al guardar la campaña de un anuncio gratuito. El precio se vuelve a comprobar al aprobar para impedir aprobar un anuncio pagado sin tope.

Una respuesta ampliada de campaña, compatible con la RPC anterior, identifica expresamente la gratuidad para que las métricas no infieran cobros usando el precio actual. La UI no presenta presupuesto ni tarifas en campañas gratuitas. El SQL se entregará reaplicable y se aplica manualmente antes del merge; no se ejecuta contra producción durante el desarrollo.

