# QA de programas PDF

Reproducir: `npm run build && node tests/programas-pdf.navegador.cjs` con Chrome.
El script sirve los archivos locales con la CSP de `_headers`, bloquea conexiones
externas y reemplaza solo Supabase por respuestas sintéticas. Usa **pdf.js real**
con PDFs mínimos generados dentro de `.cache/`, sin datos de personas.

Capturas de formulario, ficha con estado y pestaña PDFs de Admin a 375 y 1440 px,
claro y oscuro. Texto al 200 % sin scroll horizontal; controles ≥44 px y contraste
de textos del formulario ≥4,5:1 calculado desde los estilos efectivos.

Se prueba PDF falso, escaneo aceptado con aviso, texto, metadatos prellenados,
envío, estado pendiente/descartado con motivo, duplicado sin segunda carga y
revisión con motivo obligatorio. Una cuenta sintética existente conserva sus
notas y pauta byte por byte. Los permisos de Admin se comprueban aparte en SQL,
con MFA y sin MFA; el navegador no conecta con una cuenta real.

No se probó la instalación PWA ni el selector en la app iOS: no están expuestos
como superficies de interacción en esta sesión. La web usa un `input type=file`
nativo con `accept="application/pdf,.pdf"`; queda pendiente comprobar en dispositivo
Archivos/Drive y el flujo instalado antes de sacar la PR de borrador. No se añade
Share Extension para recibir un PDF directamente desde Mail.
