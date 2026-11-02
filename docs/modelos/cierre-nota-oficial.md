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

## Implementación, compatibilidad y acceso

Aplicar `supabase/discrepancias_nota.sql` después de `pautas_banco.sql`. No tiene
barras invertidas. Es reaplicable; no se aplicó desde esta PR.

El snapshot `ramo.cierre` conserva calculada/huella/origen/tenant/sigla/período del
instante del archivo, más el recibo local de envío. No contiene otras notas ni
identidades. Se reintenta tras un respaldo exitoso; fallo de SQL/red no bloquea
archivar. La operación es idempotente y al quitar/corregir la nota oficial puede
retirar una discrepancia propia que ya no cumple el umbral.

Una final oficial cierra el ramo aunque falten notas transcritas. Una dependencia
cátedra/laboratorio pendiente se propaga al cierre de la cátedra; si el laboratorio
tiene final oficial, el adaptador entrega una copia con esa final al mismo motor,
sin reescribir sus evaluaciones. Se conserva el tope calculado original para la
comparación, incluso si la final declarada es diferente.

- Las cuentas sin campos nuevos conservan el promedio/caché/avgOverride de antes.
- Con campos nuevos se recalcula el resumen; ramos incompletos quedan fuera.
- El nuevo dato agregado se rotula «Promedio del historial». No promete ser el
  PPA oficial: UAI tiene exclusiones normativas que el promedio genérico no
  conoce. Ver auditoría y regresión de deuda, sin borrar intentos anteriores.
- La RPC de discrepancias obtiene el usuario de auth.uid, valida tenant de su
  estado/archivo y solo modifica filas propias. No acepta un user_id del cliente.
- RLS no permite al estudiante leer ni escribir directamente la tabla. Admin
  requiere MFA tanto en tabla como en la lectura agregada del banco. Borrar una
  cuenta elimina sus discrepancias por FK cascade. No hay nombre/correo ni el
  resto de evaluaciones en la tabla. La lectura del banco no devuelve user_id.
- Un cambio de cuenta/estado durante el formulario o el envío invalida la acción;
  la prueba usa la subida real `subirConVersion` y la fusión de tres vías.

HIG: [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
para revisar antes de confirmar; [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)
para nota decimal y etiqueta persistente; [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
para una acción principal, foco y controles de 44 pt. La revisión no aparece al
arrancar ni bloquea el archivo por tener pendientes. Sin movimiento añadido.

QA en Chrome real: 375/1280 px, claro/oscuro y texto normal/grande (22 px), red
externa bloqueada y solo fixtures sintéticos. Sin desborde horizontal ni errores
de página; guardar revisión y archivar con nota del portal funcionan. Capturas
locales en `/tmp/gradehub-pautas-cierre-qa` (no son datos de producción).

QA reproducible (Playwright y Chromium disponibles, igual que los demás
`tests/browser/*.cjs`):

```bash
PLAYWRIGHT_MODULE=/ruta/a/playwright CHROME_PATH=/ruta/a/Chrome node tests/browser/pautas-cierre.cjs
```

No forma parte de la suite Node/PGlite. Comprueba los dos tamaños/apariencias,
texto grande, subida PDF con hash, estado actualizado sin borrar otros
formularios, fallo de red al abrir documento y archivo con nota del portal.
