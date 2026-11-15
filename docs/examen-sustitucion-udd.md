# Examen UDD: sustitución, no tope

Fuente: [Reglamento del alumno regular de pregrado, DR50/26, marzo de 2026](https://www.udd.cl/dircom/reglamentos/Reglamento-alumno-regular-de-pregrado.pdf), artículos 36 y 37, página 10. Bajo el mínimo de examen, la nota final es la del examen. Esto difiere de limitar el promedio: parciales 2,0 al 70% y examen 2,8 al 30% deben dar 2,8, no 2,2.

El preset declara `efecto:'reemplazar'` en su compuerta. Las compuertas sin esa declaración conservan el tope: no se cambia silenciosamente su significado. El resolvedor de nota necesaria respeta ambas operaciones. El reproductor de la auditoría está en `tests/examen-reemplazo.test.js`; falló antes del arreglo (2,2 frente a 2,8) y ahora pasa.

## Cuentas existentes

No se reescriben notas ni pautas guardadas. Una pauta oficial antigua conserva su operación hasta que la persona acepte la actualización habitual; el detector ahora distingue la operación y explica el cambio. Los ramos nuevos usan el preset corregido. Las pautas personalizadas y las demás universidades conservan su comportamiento.

Consulta agregada de solo lectura del 2026-11-02: 1 cuenta UDD con 8 ramos activos; ninguno con compuerta `cap:'self'`. No se devolvieron notas ni identidades. No se interpreta este conteo como número de errores de calificación.

```sql
select count(*) as ramos, count(distinct u.user_id) as cuentas
from public.user_ramos u
cross join lateral jsonb_array_elements(coalesce(u.data->'ramos','[]')) r
where coalesce(r->'origen'->>'tenant',u.data->>'tenant')='udd'
  and coalesce(u.data->>'tipoCuenta','estudiante')<>'profesor'
  and u.data->>'onboardingDone'='true'
  and exists (select 1 from jsonb_array_elements(coalesce(r->'gates','[]')) g
              where g->>'type'='group_min' and g->>'cap'='self');
```

## Registro del banco

Lucas o Claude deben reaplicar `supabase/consenso_periodo.sql` antes del merge para actualizar el registro de pautas. Es el archivo vigente regenerado con `bin/actualizar-registro-pautas.js`; no migra notas. No se aplicó SQL de producción desde esta PR.

Esta PR se abre sobre main, independiente de #948. Comparten el soporte de sustitución del motor; al integrar ambas debe conservarse el uso de compuertas efectivas de #948 en el resolvedor, además del metadato de esta PR.
