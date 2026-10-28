# Centrado del título del anuncio
Datos sintéticos y renderer/CSS de GradeHub. Sin acceso a Supabase.
Antes: origin/main 99d9ef5. Después: df1bdad.
128 combinaciones: 375/768/1280/1920 px, claro/oscuro, texto 100/200%, título corto/largo, con/sin datos, con/sin logo.
Se comprueba que arriba y abajo del título quede el mismo espacio entre etiqueta y acción en anuncios en grilla sin datos (diferencia <=1,1 px).
Para anuncios sin datos: sin recorte horizontal del título, contenido dentro de la tarjeta y botón principal >=44 px. Los anuncios con datos conservan la misma geometría que antes. Sin errores JavaScript.
Las capturas de celular antes/después son idénticas.
358 tests aprobados y comprobaciones JS/CSS.
