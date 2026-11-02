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
