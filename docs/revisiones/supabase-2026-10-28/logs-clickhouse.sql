-- Logs Explorer (ClickHouse), no SQL Editor de Postgres.
-- Ventana usada: 2026-10-27T22:49:00Z a 2026-10-28T22:49:00Z.
-- Configurar la ventana en el explorador o con los argumentos del conector.
-- No devuelve identificadores: solo cantidades de cuentas por ruta/metodo/estado.
select
  if(startsWith(log_attributes['request.path'], '/rest/v1/'), log_attributes['request.path'], splitByChar('/', log_attributes['request.path'])[2]) as route,
  log_attributes['request.method'] as method,
  log_attributes['response.status_code'] as http_status,
  count() as requests,
  uniqExactIf(log_attributes['request.sb.auth_user'],log_attributes['request.sb.auth_user']!='') as authenticated_accounts
from logs
where source='edge_logs'
group by route,method,http_status
order by requests desc;

