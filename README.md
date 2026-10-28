# Pautas históricas UC: período visible

Datos sintéticos, sin cuentas, notas ni correos reales. Tres cursos: Intro a la Economía (2025-1, fuente de sección 4), Termodinámica (2025-1) y Electricidad y Magnetismo (2026-1).

24 capturas en Chrome: 375/1280 px, claro/oscuro, texto normal/200%, cada una con la ficha de uno de los tres ramos. El aviso existente de pauta queda arriba del promedio: Pauta del 2025-1 o Pauta del 2026-1, con fechas no incluidas.

La prueba usa normalize, la carga de pautas y renderRamo reales, sin boot de sesión, service worker bloqueado y peticiones externas bloqueadas. Verifica que no precargue fechas históricas ni notas y que el período esté visible arriba, sin desborde horizontal. Los resultados de las 24 variantes están en checks.json.

No se modificaron HTML ni CSS. El tema estacional ya existe en main. Los PDF originales no se incluyen en esta evidencia; el registro de fuentes y páginas se deja en la PR.
