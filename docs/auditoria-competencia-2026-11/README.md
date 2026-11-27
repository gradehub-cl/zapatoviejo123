# Auditoría UX competitiva — noviembre 2026

Recorrido completo de cada competidor (26-nov-2026), por pantalla: qué se ve, qué se siente, qué no es intuitivo, bugs con texto exacto y pasos, diseño visual. Cada carpeta cierra con: qué copiar igual, qué GradeHub ya hace mejor y qué GradeHub debe mejorar o agregar.

| App | Enfoque | Acceso usado | Carpeta |
|---|---|---|---|
| UniversidApp | Canvas + IA de estudio (tutor, flashcards, exámenes, podcast) | Cuenta real con Canvas UC | `universidapp/` |
| Malla Pro | Malla interactiva + eximición + horario (UNAB) | Sin cuenta (local-first) | `mallapro/` |
| UniGo | App UAI: notas, salas, horario, buses | Solo público + demo (exige cuenta UAI) | `unigo/` |
| Plazip | Planificador de malla UC (major/minor) | Cuenta real (se probó en copia) | `plazip/` |
| NORA | Notas, escala puntaje→nota, ranking del curso | Cuenta real | `nora/` |
| Catedrix | Ing. UC: horario sin choques, reseñas, malla, notas | Sin cuenta (login propio por código) | `catedrix/` |

## Lo que se repite
- **GradeHub gana en la matemática de la nota**: promedio sobre 7, "necesitas X", simulador, pautas, historial, .ics, MCP.
- **Brechas de GradeHub**: malla interactiva con prerrequisitos (Malla Pro, Plazip, Catedrix), horario con combinaciones sin choque (Catedrix), importar avance/programa por PDF o pegado (Plazip, Catedrix, UniversidApp), Canvas (UniversidApp), IA de estudio (UniversidApp), reseñas de ramos (Catedrix), demo sin registro (UniGo, Malla Pro).
- **Errores comunes a no repetir**: textos y números pegados ("42%de avance", "Mis ramos5"), plurales rotos, coma/punto mezclados, éxitos mostrados como error, ponderaciones que suman 110 % sin error, cargas sin timeout.
