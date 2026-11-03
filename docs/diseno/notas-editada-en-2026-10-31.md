# Fecha de edición de notas · etapa 4 de 5

La entrega original se conserva en `codex/notas-editada-en`. Lucas autorizó abrir todas las etapas el 2026-11-02: esta se publica desde `codex/notas-editada-pr`, con Ficha #945 como base. Se revisa ahora y se mergea después de ella. No requiere SQL ni cambios de permisos.

## Comportamiento

Se agrega `nota.editadaEn`, opcional, en ISO UTC. Se registra al crear una nota o cambiar su calificación, también al dejarla pendiente. Cambiar únicamente nombre, peso o fecha, o volver a guardar la misma calificación, no altera su cronología.

La propuesta de un agente se fecha al aceptarse; no al llegar. Las hipótesis del simulador no modifican `S`; al guardarlas como reales reciben la fecha de confirmación. Las notas antiguas no reciben fechas de relleno.

`normalize` conserva las marcas válidas y omite las inválidas, tanto en el semestre actual como en el historial. La fecha de una prueba (`fecha`) conserva exactamente su propósito anterior.

## Fusión entre dispositivos

Se conserva la fusión de tres vías actual. Solo se cambia la resolución de una colisión cuando ambos dispositivos cambiaron la misma calificación y ambas versiones tienen una marca válida: gana la más reciente, junto con su valor y su representación conceptual. Así no se combina una nota local con la fecha de otra nota remota. Los cambios independientes en nombre, fecha u otros campos se conservan.

Con datos antiguos sin esas dos marcas, se mantiene la resolución anterior. Una omisión del campo al conservar el mismo valor puede recuperar la marca conocida de la otra copia o de la base. Si una versión antigua cambia el valor sin fecharlo, no se le atribuye una fecha ajena.

Limitaciones: la hora procede del dispositivo, no de un reloj de servidor; un cliente antiguo que reescribe el JSON puede omitir el campo. No es un registro histórico de todas las modificaciones ni una señal de autorización.

## Cuentas existentes y contrato de producción

- Misma clave `gradehub_v1`, mismas notas, promedios, fechas de evaluaciones y pautas. El campo es aditivo y no se completa retroactivamente.
- Mismo JSON privado de `user_ramos.data`, mismas operaciones de subida y control de versión `_rev`, mismas RLS y mismo aislamiento entre cuentas.
- Las versiones anteriores ignoran el campo nuevo. No se aplica SQL ni se cambia una tabla o RPC.
- Se conserva la protección que impide que una copia vieja revierta una cuenta de profesor a estudiante.
- No hay cambios visuales, de navegación o interacción en esta etapa. `index.html`, `styles.css`, los renderizadores y el motor son idénticos a la base de esta PR (Ficha #945); no corresponden capturas ni una nueva decisión HIG. Las pruebas de la interfaz actual siguen ejecutándose.

## Validación

- `npm run build`, JS y CSS de AGENTS.md, `git diff --check`, `npm test` completo: **366 archivos aprobados**.
- `notas-editada-en.test.js`: cuenta antigua sin campo; guardado y recarga local reales; alta y edición; no-op; nombre/fecha sin nueva calificación; pendiente; notas conceptuales UC; aceptación de propuesta; simulación y confirmación; fechas inválidas; UTC; fusión en ambos sentidos; historial; datos de entrada inmutables y coherencia valor/letra/fecha.
- `sync-sin-perdidas.test.js`: dos dispositivos de la app completa con nube sintética. Una subida tardía de una nota más vieja no pisa el valor ni la marca recientes; el campo sobrevive al guardado/lectura del cliente de sync y al reabrir con la caché existente.
- `convertir-cuenta-profesor.test.js`: se actualiza únicamente la carga de dependencias del test aislado de fusión. El caso y las aserciones de autorización se mantienen.
- Consulta local de PGlite sobre JSONB: una fecha nueva se conserva como texto ISO junto con el valor; una nota antigua sigue sin la clave. Base efímera, sin acceso a producción.

Referencia de la guía de Supabase utilizada: [JSON y JSONB](https://supabase.com/docs/guides/database/json). La implementación conserva el contrato existente; no introduce una API ni un esquema nuevo.


## Actualización del 2026-11-02

Adaptada a main `9f1e89f` y las etapas anteriores, sin conflictos de código.
**384 tests completos aprobados**, build, JS, CSS 3497/3497 y diff. Se repitieron
los guardadores reales y los 49 casos de sync, incluidos dos dispositivos
sintéticos, subida tardía y recarga. JSONB conserva la marca opcional sin agregarla
a una nota antigua. El motor, tablas, RPC, RLS y permisos permanecen iguales.
La validación conjunta con evolución comprueba ingreso inline → editadaEn → GPA.
