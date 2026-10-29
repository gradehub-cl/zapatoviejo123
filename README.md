# Cierre diario de anuncios de Inicio
Ocho variantes: 375/1280 px, claro/oscuro, texto normal/200%.
Solo datos sintéticos, llamadas Supabase simuladas y archivos locales. Service worker bloqueado.
Clic real en X: target >=44x44 y foco visible; se quita el banner y aparece el aviso por hoy.
Recarga con la misma preferencia: sigue oculto. A las 16:00 y antes de medianoche: oculto.
Al llegar la próxima fecha local: vuelve si sigue siendo elegible. Estado académico sin cambios.
359 tests aprobados; mecanismo con 68 comprobaciones, incluidos cierres antiguos y cambios de hora.
No se modifican funciones, umbral ni temporizador de medición de anuncios.
