# Propuesta previa a implementar: cierre y nota del portal

Publicada en la PR antes de escribir código.

## Estado académico aditivo

- Cada ramo archivado puede tener `notaOficial` (número 1–7), independiente de
  sus notas y de `avgOverride`. La ausencia conserva exactamente la lectura
  histórica. No se convierten ni renombran campos existentes.
- `cierreIncompleto: true` se añade solo al archivar con pendientes sin nota
  oficial. Queda visible en el historial. Se excluye de promedios hasta completar
  las evaluaciones o confirmar su final del portal; un final conocido cierra el
  ramo aunque no se hayan transcrito todas sus evaluaciones a GradeHub.
- La revisión de pendientes se comparte con `cierreWrapped`, sin duplicar reglas
  de eximición, compuertas ni descartes. Archivar permite revisar ramo por ramo,
  escribir finales oficiales o continuar igualmente. No bloquea el archivado.
- Historial, promedio acumulado y Wrapped priorizan la nota oficial si existe.
  La caché histórica se conserva para cuentas anteriores; con campos nuevos se
  recalcula al leer. La ventana `WRAPPED_DESDE` no cambia.
- La sincronización preserva los campos nuevos sin subir una migración masiva.

## Discrepancias

`discrepancias_nota`: id, user_id (FK auth.users ON DELETE CASCADE), tenant,
sigla/clave, período, huella, calculada, oficial, pauta_origen (oficial/editada),
created_at. Única por cuenta/ramo/período/huella; se actualiza al corregir la nota,
y se retira si ya no difiere. Solo registra diferencias ≥0,1 después del redondeo
oficial vigente. No incluye otras notas, nombre ni correo.

Escritura autenticada de la propia cuenta validando tenant sincronizado y escala;
lectura solo admin con MFA mediante el banco. RLS y sin lectura de otros alumnos.
Si el SQL o la red faltan, se archiva localmente y se reintenta al sincronizar:
no se pierde la nota ni se bloquea el cierre. Un reintento conserva la huella y
la nota calculada del instante del cierre, para no recalcularla con otro motor.

## Auditoría

`docs/auditoria-cierre-2026-2.md` separa reglas verificadas con artículo/programa,
comportamiento del motor y faltantes. No inferir una regla general de un programa
particular. Una contradicción demostrada exige regresión y corrección en otra PR;
este punto no cambia ponderaciones ni reglas universitarias.

Depende del banco del punto 5. SQL nuevo reaplicable y aplicación manual antes
del merge. Lucas o Claude revisan y mergean.
