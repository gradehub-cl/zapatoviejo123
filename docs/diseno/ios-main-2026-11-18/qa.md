# main → ios: verificación del 18 de noviembre de 2026

Base ios: `2b702118`; main incorporado: `55791f86`. Merge, sin rebase.

- `npm run build`, sintaxis JS y balance CSS: aprobados.
- `npm test -- --resumen`: 472 archivos aprobados.
- `npm run ios:preparar` (sin `GRADEHUB_SERVIDOR`) y compilación Debug de App
  para el simulador: `BUILD SUCCEEDED`.
- Conflictos en `horario-importar.js` y `horario-ocr.js`: se conserva Docencia Web
  FEN (horas y salas de la grilla) y la revisión UC de ios (módulos, tipos por
  color, salas de BuscaCursos, Corregir y reemplazos desmarcados).
- Tests reales de ambos flujos: `horario-foto-fen` 23 y `horario-pantallazo` 82
  comprobaciones aprobadas, además de la suite completa. No se inventaron horarios.

## Capturas

[Inicio claro](inicio-claro.png) · [Inicio oscuro](inicio-oscuro.png).

Simulador propio iPhone 18 Pro / iOS 27. Dos ramos y una cuenta sintéticos,
sin notas ni ponderaciones. Capturas nativas reducidas proporcionalmente a 1600 px.
El transporte de autenticación y tablas se reemplazó **solo en los archivos
generados** de la copia QA; `connect-src 'none'` bloqueó la salida de red y se
omitió Analytics remoto. Se ejecutó el login y la entrada reales con respuestas
locales. No se crearon cuentas ni se consultó Supabase. La compilación original
sin esos reemplazos se verificó aparte, antes de las capturas; después se
restauraron los recursos con `ios:preparar`. El simulador QA se elimina al terminar.

No es evidencia de login de Apple/Canvas reales, firma, iPhone físico ni del
contenido de producción. No se modificó el checkout compartido de Lucas/Martín.
