-- Consultas de solo lectura para el SQL Editor de administración.
-- Ejecutar cada bloque por separado y exportar su resultado como JSON.
-- No instala funciones ni modifica perfiles, reportes o fechas.

-- 1. Pautas compartidas: conserva las columnas del export existente.
-- universidad sale del tenant DEL REPORTE, no del nombre histórico del perfil
-- ni de la universidad actual de la cuenta. carrera sigue separada.
select
  cr.id,
  cr.created_at,
  cr.updated_at,
  cr.user_id,
  p.nombre,
  case cr.tenant
    when 'uc' then 'U. Católica'
    when 'fen' then 'U. de Chile'
    when 'uai' then 'U. Adolfo Ibáñez'
    when 'uandes' then 'U. de los Andes'
    else null -- Un tenant desconocido no permite afirmar una universidad.
  end as universidad,
  cr.tenant,
  cr.carrera,
  cr.ramo,
  cr.ramo_sigla,
  cr.ramo_norm,
  cr.nota,
  cr.estructura
from public.catalog_reports as cr
left join public.profiles as p
  on p.id = cr.user_id
order by cr.created_at desc, cr.id;

-- 2. Diferencias con el programa: los mensajes de Admin > Usuarios.
-- Son otra tabla, no las pautas compartidas de la consulta anterior.
-- La bandeja muestra los últimos 50, sin estado leído/pendiente/resuelto:
-- volver a ver uno no significa que se haya enviado de nuevo.
-- created_at es la fecha original; fecha_envio_chile facilita leerla sin
-- confundir UTC con el día local. No se filtra por «hoy» ni por updated_at.
select
  rp.id,
  rp.created_at,
  rp.created_at at time zone 'America/Santiago' as fecha_envio_chile,
  case rp.tenant
    when 'uc' then 'U. Católica'
    when 'fen' then 'U. de Chile'
    when 'uai' then 'U. Adolfo Ibáñez'
    when 'uandes' then 'U. de los Andes'
    else null
  end as universidad,
  rp.tenant,
  rp.carrera,
  rp.ramo,
  rp.evaluacion,
  rp.descripcion
from public.reportes_programa as rp
order by rp.created_at desc, rp.id
limit 50;
