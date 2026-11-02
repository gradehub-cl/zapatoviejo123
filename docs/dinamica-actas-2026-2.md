# Dinámica UC: fórmula, actas y vínculo

Revisión del 2026-11-02. Fuente de período: `programa_reglas_FIS1514_2do_sem_2026.pdf`, sección 7, p. 4, entregado por Lucas; inventariado en `docs/programas-uc-2026.json`. Declara NFC 25/25/20/30, NF 70% NFC + 30% NL si ambas cumplen 4,0, y el mínimo si alguna reprueba. **No se cambia esta fórmula.** El caso exactamente 4,0 conserva la interpretación vigente de aprobado; el PDF escribe desigualdades superpuestas.

También se consultaron, con el user agent de `bin/inventario-catalogo-uc.js`, los programas oficiales del catálogo [FIS1514](https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=FIS1514), [ICE1514](https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=ICE1514) y [FIS0154](https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=FIS0154). Son versiones de octubre de 2018: no sustituyen la pauta FIS1514 2026-2 ni certifican el período vigente de ICE1514. El programa público del laboratorio declara nota propia y 0 créditos; su promedio de informes antiguo no se usa para revertir la pauta 2026 ya verificada con coordinación.

## Respuestas de #652

1. **Laboratorio aprobado y Dinámica reprobada:** sí es compatible con el programa FIS1514 2026-2: NFC 3,0 y NL 6,0 dejan NF 3,0 y NL 6,0. **La situación inversa no está respaldada por esa fórmula:** con NFC 6,0 y NL 3,0, NF también es 3,0. NFC es el componente de cátedra, no otra nota final aprobatoria de Dinámica. No se implementa la premisa de aprobación independiente en ambos sentidos.
2. La ficha del laboratorio mantiene NL, incluso si Dinámica reprueba. Dinámica conserva NF combinada y muestra NFC/NL con su mínimo. No se reescribe la nota del laboratorio con la final de Dinámica.
3. **Conservación al repetir:** los programas consultados no dicen si se conserva el laboratorio aprobado, ni la situación inversa. Hace falta confirmación de la Escuela. No se copia una nota de un semestre a otro ni se inventa esa regla en el motor.

Termodinámica: FIS1533 2026-1 y Electricidad/Magnetismo FIS1523 2025-1 también tienen una combinación cátedra/laboratorio en los programas ya inventariados. No se tocan sus pautas ni se atribuye al catálogo antiguo una norma de 2026.

## Cambios y cuentas existentes

- `aporta.sigla` identifica FIS0154. El motor busca por sigla del ramo o `origen.ramoKey`; conserva el nombre como respaldo para ramos antiguos sin código. Un código contradictorio no se une por homónimo.
- Para un vínculo guardado sin sigla, la referencia se completa **en lectura**, desde el preset que coincide con el nombre del aporte; no migra datos. Renombrar un laboratorio con sigla deja de romper el vínculo. Si un ramo antiguo carece de identidad estable y además cambió de nombre, no se adivina cuál era.
- Si falta el laboratorio, la ficha marca **Solo cátedra**, explica el 30% y permite agregarlo por el catálogo. Si existe sin notas, pide anotarlas. Agregar no duplica un vínculo existente ni cambia notas de cátedra.
- La exclusión del laboratorio del promedio general usa el mismo vínculo: renombrarlo tampoco hace que cuente dos veces.

El registro de pautas se regeneró: Lucas o Claude reaplican `supabase/consenso_periodo.sql` antes del merge, sin migrar notas. Si se integró otra pauta mientras tanto, regenerar desde las fuentes actuales para conservarla. No se aplicó SQL aquí.

Pruebas sintéticas: 70/30, ambos lados del mínimo, 4,0, laboratorio cerrado reprobado, sigla/origen, legado, código contradictorio, promedio sin duplicación, lectura inmutable y Chrome 375 claro/oscuro agregando y renombrando. HIG Buttons/Accessibility: aviso contextual, botón de 44 pt y foco visible, sin alerta modal.
