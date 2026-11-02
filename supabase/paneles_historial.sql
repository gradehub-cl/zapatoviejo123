-- Aplicar manualmente ANTES del merge, después de clases_particulares.sql,
-- administradores.sql y admin_estadisticas.sql. Aditivo y reaplicable.
-- No cambia registro de eventos, medición, tarifas ni facturación.
-- Conserva solo conteos sin identidades antes de la limpieza ya existente.
begin;

-- El archivo diario y sus helpers viven en clases_particulares.sql.


-- public.limpiar_alcance_anuncios vive en clases_particulares.sql (versión vigente).
-- public.limpiar_interacciones_anuncios vive en clases_particulares.sql (versión vigente).
revoke all on function public.limpiar_alcance_anuncios(integer) from public, anon, authenticated;
revoke all on function public.limpiar_interacciones_anuncios(integer) from public, anon, authenticated;

-- null = desde el inicio. Se limita al primer dato existente, no a 90 días.
create or replace function public.admin_alcance_diario(p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare desde date;
begin
  perform admin.exigir_administrador();
  if p_dias is not null and p_dias<1 then raise exception 'rango inválido'; end if;
  select coalesce(min(h.dia),(now() at time zone 'America/Santiago')::date) into desde from admin.historial_anuncios_diario() h;
  if p_dias is not null and p_dias < (now() at time zone 'America/Santiago')::date-desde+1 then desde:=(now() at time zone 'America/Santiago')::date-(p_dias-1); end if;
  return (with h as (select * from admin.historial_anuncios_diario())
    select coalesce(jsonb_agg(jsonb_build_object('dia',d.dia,
      'vieron',coalesce(v.vistas,0),'abrieron',coalesce(v.aperturas,0),
      'contactaron',coalesce(v.contactos,0)) order by d.dia),'[]'::jsonb)
    from (select desde+k as dia from generate_series(0,(now() at time zone 'America/Santiago')::date-desde) k) d
    left join (select h.dia,sum(h.vistas) vistas,sum(h.aperturas) aperturas,sum(h.contactos) contactos
      from h where h.dia>=desde group by h.dia) v using(dia));
end;
$$;
revoke all on function public.admin_alcance_diario(integer) from public, anon;
grant execute on function public.admin_alcance_diario(integer) to authenticated;

-- Un solo pedido alimenta las cifras globales y las filas de anuncios.
create or replace function public.admin_historial_anuncios(p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform admin.exigir_administrador();
  if p_dias is not null and p_dias<1 then raise exception 'rango inválido'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(h) order by h.dia,h.anuncio_id),'[]'::jsonb)
    from admin.historial_anuncios_diario() h
    where p_dias is null or (now() at time zone 'America/Santiago')::date-h.dia < p_dias);
end;
$$;
revoke all on function public.admin_historial_anuncios(integer) from public, anon;
grant execute on function public.admin_historial_anuncios(integer) to authenticated;

-- El profesor solo ve sus propios anuncios; el admin exige segundo factor.
create or replace function public.historial_anuncio(p_anuncio_id uuid,p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'hay que haber iniciado sesión' using errcode='42501'; end if;
  if not exists(select 1 from public.tutor_anuncios a where a.id=p_anuncio_id and a.autor_id=auth.uid()) then
    perform admin.exigir_administrador();
  end if;
  if p_dias is not null and p_dias<1 then raise exception 'rango inválido'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(d) order by d.dia),'[]'::jsonb) from
    (select h.dia,sum(h.vistas) vistas,sum(h.aperturas) aperturas,sum(h.contactos) contactos
      from admin.historial_anuncios_diario() h where h.anuncio_id=p_anuncio_id
        and (p_dias is null or (now() at time zone 'America/Santiago')::date-h.dia < p_dias) group by h.dia) d);
end;
$$;
revoke all on function public.historial_anuncio(uuid,integer) from public, anon;
grant execute on function public.historial_anuncio(uuid,integer) to authenticated;

-- Totales y una dimensión temporal gruesa desde el primer evento. El corte
-- por ramo y el desglose simultáneo día/ramo conservan quince eventos.
-- public.totales_metricas_anuncio vive en clases_particulares.sql (versión vigente).
revoke all on function public.totales_metricas_anuncio(uuid) from public, anon;
grant execute on function public.totales_metricas_anuncio(uuid) to authenticated;
commit;
