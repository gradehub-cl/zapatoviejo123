-- Aplicar manualmente después de visitas_diarias.sql, clases_particulares.sql,
-- administradores.sql y admin_estadisticas.sql. Reaplicable, solo lectura.
-- No modifica medición, retención, segmentación ni cobro.
begin;
create or replace function public.admin_anuncio_publico(p_anuncio_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.tutor_anuncios;desde date;hasta date;total bigint;con_ramo bigint;vistas bigint;aperturas bigint;contactos bigint;
begin
 perform admin.exigir_administrador();
 select * into a from public.tutor_anuncios where id=p_anuncio_id;
 if not found or a.publicado_at is null then return null;end if;
 desde=(a.publicado_at at time zone 'America/Santiago')::date;
 hasta=(least(now(),coalesce(a.vence_at,now())) at time zone 'America/Santiago')::date;
 with activas as (select distinct v.user_id from public.visitas_diarias v where v.dia between desde and hasta)
 select count(*),count(*) filter(where exists(
  select 1 from public.user_ramos u cross join lateral jsonb_array_elements(case when jsonb_typeof(u.data->'ramos')='array' then u.data->'ramos' else '[]'::jsonb end) r
  where u.user_id=x.user_id and u.data->>'tenant'=a.tenant and coalesce(u.data->>'tipoCuenta','estudiante')<>'profesor'
  and coalesce(r->'origen'->>'tenant',a.tenant)=a.tenant
  and upper(btrim(coalesce(nullif(r->>'sigla',''),r->'origen'->>'ramoKey')))=any(a.ramos_siglas)
 )) into total,con_ramo from activas x;
 select coalesce(sum(h.vistas),0),coalesce(sum(h.aperturas),0),coalesce(sum(h.contactos),0) into vistas,aperturas,contactos
 from admin.historial_anuncios_diario() h where h.anuncio_id=a.id and h.publicacion=a.medicion_desde and h.dia between desde and hasta;
 return jsonb_build_object('desde',desde,'hasta',hasta,'activos',total,'activos_ramo',con_ramo,'vieron',vistas,'abrieron',aperturas,'contactaron',contactos,
  'ramos_actuales',true,'visitas_retencion_parcial',desde<(now() at time zone 'America/Santiago')::date-interval '13 months');
end;$$;
revoke all on function public.admin_anuncio_publico(uuid) from public,anon;
grant execute on function public.admin_anuncio_publico(uuid) to authenticated;
commit;
