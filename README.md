# Foto del horario dentro de Calificar profesor

Todas las imágenes, ramos, siglas y notas son sintéticos. No hay datos de cuentas reales.

- `*-antes.png`: la misma hoja de sección con el botón para elegir foto.
- `*-reconocida.png`: sección propuesta por la foto, todavía sin guardar.
- `checks.json`: ocho variantes de Chrome: 375/1280 px, claro/oscuro, texto normal/200%. Prueba el selector de imágenes desde el botón, reconocimiento, solo la sigla del ramo actual, lecturas empatadas, error/reintento, cancelación durante lectura, 44 px, formulario sin desborde, respaldo antes de calificar y notas intactas. OCR simulado y funciones reales de formulario/guardado/respaldo contra Supabase simulado. Sin boot de sesión ni service worker, peticiones externas bloqueadas.
- `hoja-nativa/`: cuatro variantes adicionales en Chrome a 375 px con la clase app-nativa. Comprueba la barra de hoja y el formulario. Es una simulación de la interfaz nativa; no una prueba en un iPhone físico.
- `horario-sintetico.png` y `ocr-real.json`: una prueba adicional con Tesseract real y los assets locales de /ocr/. Reconoce ABC1234 sección 3 y XYZ5678 sección 8. No se envía la imagen a ningún servicio externo.

El tema estacional es el que ya existe en main. La lectura de la foto por sí sola no guarda nada ni agrega ramos. Continuar confirma la sección del ramo actual y usa el respaldo existente.
