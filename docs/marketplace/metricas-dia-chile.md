# Día de las métricas: Chile (decisión de Lucas, 2026-11-02)

Aplicar primero `supabase/metricas_dia_chile.sql`, después de los SQL vigentes de
clases/admin, historial y eventos. Es reaplicable. No se aplicó desde Codex.
El cambio rige **desde el instante de aplicación**, registrado sin reiniciarlo
al reaplicar en `admin.anuncio_dias_chile_inicio.desde`:

```sql
select desde, desde at time zone 'America/Santiago' desde_chile
from admin.anuncio_dias_chile_inicio;
```

Las nuevas fechas de alcance, interacciones, el agregado auxiliar y eventos se
cuentan en `America/Santiago`. La métrica auxiliar conserva el día de la primera
interacción que está completando; las primeras interacciones nuevas ya lo
capturan en Chile. No se cambia `TimeZone` globalmente ni se altera el cobro.
`costo_campana` cuenta filas por publicación y duración por timestamps: no filtra
por `dia`. Las pruebas conservan el costo antes/después.

Las fechas antiguas sin hora se conservan. `dia_zona` marca las filas anteriores
de alcance/interacciones como UTC y las nuevas como Chile. La adaptación de
`resumen_eventos_anuncio` mantiene el total de #930: compara cada fila con el
inicio de medición en su zona original. No toma una fila chilena de la noche
como si fuera una primera vista anterior a la medición UTC.

Profesor/Admin delimitan Hoy y los rangos en Chile, independientemente del huso
del dispositivo. El calendario del eje se recorre por fechas, no sumando 24 h
a un instante local: no pierde/duplica días en abril y septiembre. El histórico
sigue con sus etiquetas originales UTC; el corte no permite reconstruir horas
que nunca se guardaron y las franjas del día de transición no son comparables.

## Recálculo con hora exacta: paso manual separado

`anuncio_eventos_recibos.creado_at` sí tiene la hora de cada repetición.
`anuncio_metricas.updated_at` solo es la última actualización de un agregado:
no permite recuperar la hora de sus contribuciones. No se utiliza para repartirlas.

Después del archivo anterior, Lucas puede aplicar
`supabase/recalcular_eventos_dia_chile.sql`, marcado `-- sql-produccion: manual`.
Solo reconstruye grupos anuncio/publicación/tipo cuya cantidad total coincide
con todos sus recibos. Omite grupos incompletos por retención o borrado de cuenta,
sin estimarlos. Guarda el agregado anterior en un respaldo privado con RLS y FK
al anuncio (borrado en cascada). No copia recibos ni identidades de estudiantes.

La ejecución es transaccional y bloquea las escrituras durante la reconstrucción.
Deja el número de grupos y filas antes/después en
`admin.eventos_dia_chile_recalculo`, y devuelve esa cuenta. Al reaplicarse es un
no-op. Conserva la suma de eventos, los totales del aviso y el cobro.

Consulta agregada de solo lectura antes del cambio: **2 grupos completos,
2 filas antes y 2 después; 0 grupos incompletos**. Es una estimación del estado
consultado; los contadores que devuelve la aplicación manual son los definitivos.

## Verificación

PGlite cubre UTC antiguo/Chile nuevo en el mismo corte, defaults, aplicación doble,
reconstrucción completa y omisión parcial, respaldo privado, total/cobro intactos.
SQL y JavaScript coinciden alrededor del cambio de horario de abril/septiembre;
los días del cupo 4/2/1 siguen siendo chilenos (PR anterior).

El esquema/cron de las repeticiones conserva retención y permisos. Las RPC de
admin conservan MFA; las nuevas tablas internas tienen RLS sin acceso directo.

HIG: [Charts](https://developer.apple.com/design/human-interface-guidelines/charts),
calendario y valores del eje coherentes con el período que se está consultando.
No cambia el diseño de los controles ni la fuente del sistema.
