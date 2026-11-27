# Auditoría UX de GradeHub (producción), 26-nov-2026

Recorrido completo de gradehub.cl con **5 cuentas de prueba nuevas** (todas `@prueba.cl`, para borrarlas después) y una **pasada solo de diseño y familiaridad**. Cada cuenta hizo de un estudiante distinto, desde el registro hasta cerrar el semestre.

| # | Cuenta | Personaje | Foco | Archivo |
|---|---|---|---|---|
| 1 | gpruebahark@prueba.cl | Gonzalo, 1.er año Ingeniería UC | Recorrido completo hasta archivar el semestre | `01-gonzalo-uc-1ro-reporte.md` (+ `01-...-hallazgos.md` con evidencia) |
| 2 | gpruebahark2@prueba.cl | Valentina, Derecho UChile, 6.º sem | Casos borde (pesos ≠ 100 %, 1,0/7,0, coma/punto, recargar, atrás, reprobar) | `02-valentina-uchile-casos-borde.md` |
| 3 | gpruebahark3@prueba.cl | Diego, Ing. Comercial UAI, 2.º año | Otra universidad, carrera no ingeniería | `03-diego-uai-comercial.md` |
| 4 | gpruebahark4@prueba.cl | Camila, Informática USM → UDD, 4.º año | Años avanzados, electivos, semestre anterior | `04-camila-informatica-4to.md` |
| 5 | gpruebahark5@prueba.cl | Matías, Enfermería UdeC → UDD, 1.er año | Usuario poco técnico | `05-matias-enfermeria-1ro.md` |
| 6 | (cuenta 2) | Diseñador de producto | Diseño visual, claro/oscuro, familiaridad, accesibilidad | `06-diseno-familiaridad-reporte.md` (+ hallazgos) |

**Límites de la prueba:** nada pagado, ninguna cuenta externa conectada (Canvas/Google), nada publicado a usuarios reales (consenso, calificar profesor, avisos de tutores, feedback: se abrieron y se cancelaron). Las cuentas quedan creadas; hay que borrarlas. **No se pudo probar el ancho de celular** (el navegador de prueba no deja redimensionar): falta una pasada móvil a 390×844.

---

## Veredicto general

La lógica es lo mejor de la app y está por sobre cualquier competidor o Excel: "Necesitas X en lo pendiente para aprobar", simulador que no destruye nada, reglas reales (tope, eximición, requisitos combinados), calculadora de puntaje a nota. Las 5 cuentas dicen que la seguirían usando. Nota promedio de los auditores: ~7,5/10.

Lo que rompe la confianza son los bordes: secciones que cargan para siempre, notas que se pierden al guardar rápido, el cierre de semestre que deja la app vacía, y un catálogo que solo sirve en 5 universidades.

---

## Problemas que aparecieron en varias cuentas (más confiables)

### 🔴 Críticos
1. **"Apoyo" y "Ofrecer clases o material" quedan para siempre en "Revisando tu acceso…"**, sin spinner, error ni reintento (cuentas 1, 3, 4). Desde Inicio sí carga.
2. **Archivar semestre no avanza al siguiente**: 2026-2 queda como "Semestre actual" vacío y también en Historial, no se puede abrir 2027-1, Inicio queda con "PROMEDIO GENERAL ·" y sin explicar qué pasó (cuentas 1, 2). Además Estadísticas y Agenda siguen mostrando el ramo archivado hasta recargar.
3. **Pérdida de notas al guardar**: con Tab (cuenta 3, 3 veces) o con Enter antes de ~0,7 s (cuenta 1).
4. **Solo 5 universidades** (UChile, UC, UAI, UANDES, UDD), sin buscador ni "Otra": USM, USACH, UdeC no existen y el onboarding obliga a elegir una que no es (cuentas 2, 4, 5). Pocas carreras cargadas; "Ramos de mi malla" falla o dice "Aún no tenemos la malla" (cuentas 3, 4) e incluso pide "Primero elige tu carrera en Ajustes" con la carrera ya elegida (cuenta 4).
5. **Consentimiento por omisión**: el modal "Tus ponderaciones ayudan a tus compañeros" solo tiene "Entendido" y activa compartir ponderaciones y "Usar mis notas para elegir anuncios" sin opción de rechazar (cuentas 1, 2, 4). Riesgo legal/confianza.
6. **URL del conector MCP y URL de calendario en texto plano**, sin máscara ni "mostrar"; la conexión se puede crear sin nombre (queda "Agente") (cuentas 1, 3, 5, 6).

### 🟠 Importantes
7. **Textos pegados sin espacio**, en pantalla y en lectores de pantalla: "Así va tu semestre,Gonzalo", "2026-25 ramos", "2 aprobados2 en riesgo1 bajo 4,0", "Peso evaluado62 %", "Nota final oficialdel portal…", contador de la landing "2.222ESTUDIANTES" (todas las cuentas).
8. **Contradicciones de estado**: "✓ Aprobado" en el ramo vs chip "en riesgo" o "1 bajo 4,0" en Inicio (cuentas 1, 4); Inicio no refresca y queda "Sin evaluaciones" con notas ya puestas (cuenta 2); Estadísticas con datos viejos tras guardar (cuenta 1).
9. **Validaciones que mienten**: pautas que se guardan sumando 110 % o 55 % (cuentas 1, 2); "Guardar semestre" activo sin notas pese a decir "Pon al menos una nota" (cuenta 3); error de tope que sale fuera del modal (cuenta 4); errores sin borde rojo ni aria-invalid (cuenta 6).
10. **Modales largos con el botón final cortado o tapado** ("covered by a div"), especialmente Calculadora y Armar ponderaciones; Escape cierra "Armar mis ponderaciones" y descarta todo sin preguntar (cuentas 1, 6).
11. **Navegación**: Perfil y Ajustes son dos caminos para lo mismo ("Archivar semestre" está en uno y no en el otro); botón atrás del navegador saca de la app (sin rutas ni deep links); recargar a mitad de formulario pierde lo escrito sin avisar (cuentas 2, 3, 6).
12. **Agenda**: evaluaciones "Sin fecha", .ics importa 2 de 3 eventos y deja todo "Sin asignar", día con evaluación dice "Nada pendiente", horas en AM/PM y fechas mm/dd pese a "Horas de Chile", "Please fill out this field." en inglés (cuentas 1, 3, 4).
13. **Importar avance curricular renombra ramos** ("MAT1004 Cálculo I" → "Matemáticas Finitas") y el Historial inventa un 3,0 en rojo que contamina el promedio acumulado (cuenta 1).
14. **Recuperar contraseña** no es un flujo real (sin pantalla ni confirmación de envío); cerrar sesión sin confirmar y siempre vuelve a "Crear cuenta" en vez de "Iniciar sesión" (cuentas 2, 3).

### 🟡 Menores
- "Ponderaciones según true estudiantes" (bug de plantilla), year picker lento y sin teclado, ícono 🔧 sin rótulo, "No file chosen" en inglés, historial sin "Aprobado/Reprobado" (solo color), tabla de 50–68 filas sin scroll propio, acentos Índigo y Azul casi iguales, diálogos con nombre accesible "Ventana".

---

## Diseño y familiaridad (resumen de la cuenta 6)

**Identidad:** sí tiene, y es su mayor fortaleza: logo de capas teal, "Mejor que tu Excel.", lenguaje chileno real (ramo, solemne, "al tiro"). Se siente entre Notion/Linear (austeridad) y apps bancarias chilenas (números grandes protagonistas). Ajustes es igual a Settings de iOS: muy familiar.

**Top cambios (impacto/esfuerzo):**
1. Tokenizar la escala de colores de notas y usarla igual en todas partes: hoy el mismo 4,8 es teal, oliva o amarillo según la pantalla y el modo (Alto/Bajo).
2. Errores con marca roja en el campo + aria-invalid (Alto/Bajo).
3. Estado vacío de "PROMEDIO GENERAL": hoy un cuadradito gris; poner "—" y un vacío ilustrado (Alto/Bajo).
4. Modo oscuro de verdad: hoy es "pintado", superficies casi iguales, separadores invisibles, gráficos ilegibles (Alto/Medio).
5. Pies de modal fijos con scroll interno (Alto/Medio).
6. Altura estable del modal de Ajustes (salta 723→603 px entre secciones).
7. Un solo botón primario por sección.
8. Color semántico siempre con ícono o etiqueta (accesibilidad daltónica).
9. Zona sensible: "Eliminar mi cuenta" y "Reiniciar app" con el mismo peso; pedir escribir "ELIMINAR".
10. Revisar el breakpoint móvil (bottom-nav, objetivos táctiles ≥44 px, modales como sheets).

**Vocabulario que confunde a un usuario nuevo** (cuentas 3, 5): consenso anónimo, PPA estimado, ponderaciones sugeridas, exención, agentes/MCP. Falta una línea de explicación en el momento de uso.

---

## Lo que está muy bien (coinciden todas las cuentas)
- "Necesitas X en lo pendiente para aprobar", siempre visible y en lenguaje humano.
- Simulador por ramo y del semestre completo, no destructivo ("No se guarda", "Volver al real", "Reiniciar todo").
- Pautas UC precargadas con reglas reales y barra "✓ 100 / 100 %".
- Calculadora de nota ("el 4,0 está en 25,00 de 50,00 puntos") con tabla.
- Decimales con coma, modo oscuro instantáneo, datos que persisten entre sesiones.
- Microcopy cercano y avisos de privacidad claros.
- Onboarding corto (4 pasos, ~11 clics, ~1:40 min) y sin verificar correo.

## Si solo se arreglan 5 cosas
1. Apoyo cargando para siempre.
2. Cierre de semestre que no avanza y deja la app vacía.
3. Pérdida de notas al guardar con Tab/Enter.
4. Buscador de universidades + "Otra".
5. Modal de consentimiento con opción de rechazar.

## Cuentas para borrar
gpruebahark@prueba.cl, gpruebahark2@prueba.cl, gpruebahark3@prueba.cl, gpruebahark4@prueba.cl, gpruebahark5@prueba.cl. La cuenta 1 creó y desconectó una conexión MCP "Prueba Hark"; las cuentas 3 y 5 generaron URLs de calendario/MCP.
