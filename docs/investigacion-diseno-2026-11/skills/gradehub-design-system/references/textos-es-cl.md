# Textos de interfaz (español de Chile)

Tono: como un compañero que sabe del tema. Directo, cálido, sin tecnicismos,
sin exclamaciones de marketing, sin "¡Ups!". Tuteo. Sentence case.

## Reglas

1. **Verbo + objeto en botones**: "Agregar ramo", "Guardar nota",
   "Eliminar evaluación". Nunca "OK", "Enviar", "Aceptar" a secas.
2. **Mismo verbo en todo el flujo**: botón "Archivar semestre" → confirmación
   "¿Archivar 2026-2?" → toast "Semestre archivado".
3. **Errores**: qué pasó + qué hacer. Sin disculpas, sin culpar, sin códigos.
4. **Vacíos**: qué va aquí + una acción.
5. **Cifras con contexto**: "Necesitas 4,6 en el examen para aprobar con 4,0",
   no "Necesitas 4,6".
6. **Nada de jerga interna**: "sincronizar", "tenant", "preset", "RLS" no se
   muestran. "Pauta" sí (es vocabulario del estudiante).
7. **Vocabulario por universidad** (`tests/vocabulario.test.js`): usa la
   palabra que usa esa universidad (ramo/curso, certamen/solemne/prueba…).
8. **Inclusivo sin barras**: "Te damos la bienvenida", no "Bienvenido/a".
9. **Longitud**: toasts ≤ 60 caracteres, títulos ≤ 40, ayudas ≤ 2 líneas a
   390 px.
10. **Signos**: abre "¿" y "¡"; comillas latinas « » o “ ” de forma consistente;
    guion largo — sin espacios raros; puntos suspensivos "…" (un carácter) en
    estados de carga.

## Glosario (usar / evitar)

| Usar | Evitar |
|---|---|
| Nota | Calificación (salvo en textos legales), score |
| Promedio | Media, GPA (salvo tenant que lo use) |
| Nota necesaria / "Necesitas X" | Target, objetivo numérico |
| Ponderación / "vale 30 %" | Peso relativo, weight |
| Pauta de evaluación | Preset, plantilla |
| Al borde | Riesgo medio, warning |
| Sin nota | null, —, N/A |
| Guardado en este dispositivo | Local storage, caché |
| Sin conexión | Offline, error de red |

## Plantillas

| Situación | Texto |
|---|---|
| Vacío: sin ramos | **Agrega tu primer ramo** · Busca por sigla o nombre y cargamos su pauta. · [Agregar ramo] |
| Vacío: ramo sin notas | **Todavía no hay notas** · Cuando ingreses la primera, calculamos tu promedio y lo que necesitas. · [Ingresar nota] |
| Vacío: búsqueda | **No encontramos "MAT16"** · Revisa la sigla o crea el ramo a mano. · [Crear ramo] |
| Vacío: agenda | **Nada para esta semana** · Las fechas de tus evaluaciones aparecen acá. |
| Carga lenta (>3 s) | Sigue cargando… |
| Timeout | **Está tardando más de lo normal** · Vuelve a intentarlo en un momento. · [Reintentar] |
| Sin conexión | Estás sin conexión. Te mostramos lo guardado en este dispositivo. |
| Guardado pendiente | Sin sincronizar · Lo subimos apenas vuelva la conexión. |
| Error al guardar | No pudimos guardar la nota. Revisa tu conexión y vuelve a intentarlo. [Reintentar] |
| Nota inválida | Escribe una nota entre 1,0 y 7,0 |
| Ponderaciones ≠ 100 % | Las ponderaciones suman 90 %. Falta asignar 10 %. |
| Borrado reversible | Evaluación eliminada · [Deshacer] |
| Deshacer aplicado | Listo, la recuperamos |
| Confirmación irreversible | **¿Eliminar tu cuenta?** · Se borran tus ramos y notas de este dispositivo y de la nube. No se puede deshacer. · [Eliminar cuenta] [Cancelar] |
| Aprobado | Aprobado con 5,2 |
| Al borde | Necesitas 4,6 en el examen para aprobar |
| Imposible | Aunque saques 7,0 no alcanzas el 4,0 con esta pauta. |
| Ya asegurado | Ya aprobaste: aunque saques 1,0 terminas con 4,1 |
| Ramo cerrado (100 %) | Ramo cerrado · Nota final 5,6 *(tono neutro: es cierre, no celebración)* |
