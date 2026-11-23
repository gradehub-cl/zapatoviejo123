# Fechas de anuncios Canvas · revisión

Solo respuestas, ramos y fechas sintéticas. Sin Canvas real, cuentas ni tokens.

## Recorrido

«Traer fechas» abre la misma revisión de calendarios. I2 tiene 13/11 guardado y
se propone 20/11 17:30, sala B12, desde «Reprogramación de la I2» del 8/11.
C3 no tiene fecha: propone 23/11 10:00, sala K201. Los selectores permiten
aceptar o «No importar»; no permiten mover un cambio a otra evaluación. Cancelar
no guarda. Solo la acción principal guarda; otra edición de fecha/hora mientras
la hoja está abierta impide aplicar el lote. Las notas y los pesos no se tocan.

## Evidencia visual

Chrome, app compilada con puente simulado, 375 px claro/oscuro. Servidor local
sin SDK de Supabase ni GA, CSP sin conexiones externas, service worker omitido.
No se usó una pantalla HTML rehecha ni el calendario de otra app.

- Ancho desplazable: 375 px. Lista: 333 px al duplicar el texto.
- Selectores y botones visibles: 44 px de alto.
- Contraste mínimo de texto/controles, usando también `color(srgb ...)`:
  5,20:1 claro / 6,50:1 oscuro.
- Texto 200 %: párrafos de 28 px, sin scroll horizontal. El indicador/modal
  conserva las reglas existentes de movimiento reducido; no se añaden animaciones.
- En la hoja la fecha permanece en 13/11. Tras guardar pasa a 20/11. Descartar
  la fila no toca la cuenta.

HIG: [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
y [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data):
una tarea acotada, cancelación sin guardar, una acción principal y revisar lo
importado antes de aceptarlo. Sin CSS nuevo ni controles paralelos.

## Simulador

Compilación Debug de App y widgets con `xcodebuild`, iPhone 18 Pro, iOS Simulator,
`CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM=`: **BUILD SUCCEEDED**. No se modificó
`project.pbxproj`, Firma ni las versiones de paquetes.

Capturas adicionales: simulador aislado «GradeHub anuncios QA», iPhone 17,
iOS 27.0 (402 pt). Misma hoja y JS de la app; solo se sustituyeron las respuestas
Canvas por anuncios sintéticos en los recursos generados y se bloqueó la red.
Tras sustituir recursos se firmó ad hoc el artefacto de QA (incluida su biblioteca
Debug), sin cambiar el proyecto. El modo oscuro/claro cambió con la hoja abierta.
Los recursos de QA no forman parte del commit.

El lector también cubre casillas fijas vacías. Al guardar crea la misma nota
pendiente que el editor de casillas, con valor null; no antes. La regresión usa
un promedio 5,4 real y comprueba que no cambia al agregar solo la fecha.

## Límites deliberados

La sala, la fecha anterior y el título/publicación sirven para esta revisión y
no agregan campos persistidos. Se guardan fecha y hora usando las marcas actuales.
No se devuelve un enlace al anuncio: la proyección pedida excluye IDs y URLs.
No se implementa el aviso opcional de Inicio ni un historial de reprogramaciones.
Un caso dudoso queda sin propuesta; no se intenta completar la pauta.

Entrega sobre `origin/ios` 93b3c4b2: `npm run build`, sintaxis JS, CSS 5246/5246,
`git diff --check` y **475 archivos de tests aprobados**. La prueba Swift ejecuta
la política real, no una copia del validador en JS. Los recursos generados de QA
se retiraron con `ios:preparar`; `project.pbxproj`, Firma y Package.swift quedan
sin diferencias propias. No se añaden plugins ni paquetes.
