# Universidad en perfiles y reportes

Aplicar `supabase/universidades_reportes.sql` antes del merge. Es transaccional,
reaplicable y no contiene barras invertidas. No se aplicó desde esta PR.

## Auditoría de solo lectura

Revisión de producción: 459 perfiles UC, 334 FEN, 35 UAI, 28 UAndes y 9 sin
universidad; 865 en total. No se consultaron nombres, correos ni notas.

- Dependencias de vistas sobre la columna mediante `pg_depend`: ninguna.
- Funciones que mencionan conjuntamente `profiles` y `universidad`: ninguna.
- Trigger de perfiles: `profiles_touch`, solo actualiza `updated_at`.
- Políticas: ninguna lee esta columna. La segmentación de encuestas usa
  `encuestas_universidad()`, que consulta el tenant de `user_ramos`.
- `resumen_semanal.sql` y admin agrupan por tenant académico. No consumen el
  nombre histórico del perfil. Esto cubre producción y los consumidores del
  repositorio; no demuestra ausencia de herramientas externas no registradas.

## Compatibilidad

Se migra solo el nombre conocido al código correspondiente. Un valor desconocido
aborta la transacción para revisión; no se borra ni se adivina. Null sigue null.
El trigger normaliza también escrituras de apps antiguas. Reaplicar no vuelve a
actualizar perfiles ya normalizados. Las políticas de acceso permanecen iguales.

`p_carrera` sigue en la firma de reportes. Un reporte nuevo guarda null; actualizar
uno antiguo conserva su carrera histórica. No se cambia la función de consenso.
El perfil mantiene su carrera declarada: no es la identidad de una pauta.

El nombre visible de universidad procede de `TENANTS[t].label || name`; UC queda
como «U. Católica» y Chile como «U. de Chile». No cambian tenant ni carrera del
estado académico, mallas, pautas ni notas.
