# Edición de anuncios desde Admin · evidencia sintética

Fuente: `codex/admin-editar-anuncio`, commit `baccfcf` (main con #839 mergeada).

Chrome local, sin red externa y con service worker bloqueado. Solo datos e imágenes sintéticas. El mock de Supabase y el servidor de prueba son locales y no se incorporan a la app.

Se comprobó guardar solo el título conservando `criterios: null`, confirmar antes de cambiar un publicado, ocultar Editar anuncio sin la RPC, las dos vistas previas con flyer/logo y pack con descuento, 44 × 44 px, foco visible, ausencia de desborde horizontal, aviso fechado al profesor, apertura de su anuncio y acuse. Estado y costo ocupan filas propias para no superponerse con texto grande.

| Pantalla | Texto | Editor | Vista previa | Guardar | Aviso | Anuncio abierto |
| --- | --- | --- | --- | --- | --- | --- |
| 375 px · claro | 100% | [Ver](375-claro-editor.png) | [Ver](375-claro-vista-previa.png) | [Ver](375-claro-guardar.png) | [Ver](375-claro-aviso.png) | [Ver](375-claro-profesor.png) |
| 375 px · claro | 200% | [Ver](375-claro-texto200-editor.png) | [Ver](375-claro-texto200-vista-previa.png) | [Ver](375-claro-texto200-guardar.png) | [Ver](375-claro-texto200-aviso.png) | [Ver](375-claro-texto200-profesor.png) |
| 375 px · oscuro | 100% | [Ver](375-oscuro-editor.png) | [Ver](375-oscuro-vista-previa.png) | [Ver](375-oscuro-guardar.png) | [Ver](375-oscuro-aviso.png) | [Ver](375-oscuro-profesor.png) |
| 375 px · oscuro | 200% | [Ver](375-oscuro-texto200-editor.png) | [Ver](375-oscuro-texto200-vista-previa.png) | [Ver](375-oscuro-texto200-guardar.png) | [Ver](375-oscuro-texto200-aviso.png) | [Ver](375-oscuro-texto200-profesor.png) |
| 1280 px · claro | 100% | [Ver](1280-claro-editor.png) | [Ver](1280-claro-vista-previa.png) | [Ver](1280-claro-guardar.png) | [Ver](1280-claro-aviso.png) | [Ver](1280-claro-profesor.png) |
| 1280 px · claro | 200% | [Ver](1280-claro-texto200-editor.png) | [Ver](1280-claro-texto200-vista-previa.png) | [Ver](1280-claro-texto200-guardar.png) | [Ver](1280-claro-texto200-aviso.png) | [Ver](1280-claro-texto200-profesor.png) |
| 1280 px · oscuro | 100% | [Ver](1280-oscuro-editor.png) | [Ver](1280-oscuro-vista-previa.png) | [Ver](1280-oscuro-guardar.png) | [Ver](1280-oscuro-aviso.png) | [Ver](1280-oscuro-profesor.png) |
| 1280 px · oscuro | 200% | [Ver](1280-oscuro-texto200-editor.png) | [Ver](1280-oscuro-texto200-vista-previa.png) | [Ver](1280-oscuro-texto200-guardar.png) | [Ver](1280-oscuro-texto200-aviso.png) | [Ver](1280-oscuro-texto200-profesor.png) |

[Resultados de las comprobaciones](checks.json). Estas imágenes no prueban políticas de Storage en producción; se conservaron sin cambios y la UI avisa si una imagen guardada no se puede leer.
