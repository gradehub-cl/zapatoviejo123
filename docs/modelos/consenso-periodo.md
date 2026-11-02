# Propuesta previa a la implementación: consenso por período

Esta propuesta se publica en la PR antes de escribir su implementación.

- `catalog_reports` conserva cada reporte histórico; suma `periodo` (año y
  semestre) y `origen` (`automatico` por defecto para filas y apps viejas,
  `explicito` para el botón Reportar pauta). Período legado: fecha de creación
  en Chile, sin inventar el semestre de otra pauta. Los nuevos pueden declarar
  el período del ramo. Una actualización alcanza solo esa cuenta/ramo/período.
- Registro de presets del catálogo en servidor, generado del repositorio:
  tenant, clave canónica, nombre y período conocido o sin período. El cliente
  no decide si existe pauta oficial. Un automático no cuenta frente a un preset
  oficial; un explícito sí. La existencia de un preset sin período se trata de
  forma conservadora como protección del catálogo, sin atribuirle vigencia.
- Consenso: un voto por cuenta (el más reciente), mínimo tres y 60% de las
  cuentas elegibles del ramo/período. Para una sección, incluye sus reportes y
  los sin sección. Si las secciones declaran variantes diferentes, no se ofrece
  una pauta genérica a quien no tiene sección. Un empate no es consenso.
- RPC de lectura por período/sección; firma anterior conserva su forma y sirve
  solo el período actual sin consenso genérico ambiguo. Caché cliente incluye
  período/sección; nunca ofrece el de otro semestre. Ninguna pauta ya aplicada
  se reemplaza ni se recorre para migrarla.
- La misma validación de completitud se usa al reportar manualmente y al aportar
  automáticamente: nombres presentes, todos los pesos positivos, suma 100 y más
  de una evaluación. El servidor también valida, incluso llamadas directas.
- La PR compara ambos criterios con consultas agregadas de solo lectura; no
  publica identidades, notas ni comentarios de estudiantes.

Aplicación prevista: SQL reaplicable después del de universidades/reportes. El
registro de presets no publica ni modifica el catálogo estudiantil.

## Comparación de solo lectura (2026-11-02)

| Universidad | Regla anterior, todos los períodos | Nueva, 2026-2, cualquier sección elegible |
|---|---:|---:|
| UC | 4 | 0 |
| U. de Chile | 8 | 0 |
| UAI | 1 | 0 |
| UAndes | 2 | 2 |
| UDD | 0 | 0 |

La consulta conserva los filtros de cuenta/onboarding/tenant del consenso
anterior. Para la nueva regla simula todos los reportes anteriores como
`automatico`, deriva el período de creación en Chile, excluye incompletos y
presets protegidos, toma el último aporte por persona y calcula ≥3 y ≥60%
por ámbito (sección + aportes sin sección). Cuenta ramos distintos, no variantes.
El cambio de universo temporal es intencional: la regla anterior mezclaba años.
Son cifras de una instantánea; pueden variar antes de aplicar el SQL.

## Aplicación y compatibilidad

Aplicar `supabase/consenso_periodo.sql` después de `universidades_reportes.sql`
y del base `catalog_consensus.sql`. No reaplicar las definiciones antiguas de
reporte/consenso después del parche sin volver a aplicar este archivo.
Las firmas antiguas siguen disponibles: un envío antiguo se clasifica automático,
con período derivado de la fecha; la lectura antigua devuelve solo el período
actual y no devuelve un genérico ambiguo. El cliente nuevo requiere las RPC por
período y no retrocede a una firma que pierda ese contexto.

Los presets sin período declarado protegen contra aportes automáticos, sin que
eso los presente como programas vigentes. El registro se toma del catálogo del
repo; para actualizarlo se revisa el preset y se ejecuta
`node bin/actualizar-registro-pautas.js` junto a su PR (no aplica SQL). El test
coteja todas las definiciones y detecta si el catálogo avanza sin la semilla.
La integración de main incluye las 23 pautas UDD de #940: 169 en total.
La información incompleta sigue en las tablas para auditoría: no se borra.

Consulta reproducible de la instantánea previa, con la misma semilla de presets:
[consenso-antes-despues.sql](../reportes/consenso-antes-despues.sql). Es SELECT
únicamente; no depende de instalar las tablas del parche para obtener la cuenta.
