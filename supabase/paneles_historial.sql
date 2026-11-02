-- Aplicar manualmente ANTES del merge, después de clases_particulares.sql,
-- administradores.sql y admin_estadisticas.sql. Aditivo y reaplicable.
-- No cambia registro de eventos, medición, tarifas ni facturación.
-- Conserva solo conteos sin identidades antes de la limpieza ya existente.
begin;

create table if not exists admin.anuncio_historial_diario (
  anuncio_id uuid not null references public.tutor_anuncios(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  publicacion timestamptz not null,
  dia date not null,
  vistas bigint not null default 0 check (vistas >= 0),
  aperturas bigint not null default 0 check (aperturas >= 0),
  contactos bigint not null default 0 check (contactos >= 0),
  primary key (anuncio_id, publicacion, dia)
);
alter table admin.anuncio_historial_diario enable row level security;
revoke all on admin.anuncio_historial_diario from public, anon, authenticated;

-- Cada persona ya se cuenta una vez por publicación en las tablas originales.
-- max combina una instantánea con filas aún no limpiadas; nunca las suma dos veces.
create or replace function admin.historial_anuncios_diario()
returns table (anuncio_id uuid, publicacion timestamptz, dia date,
  vistas bigint, aperturas bigint, contactos bigint)
language sql stable security definer set search_path = '' as $$
  with fuentes as (
    select h.anuncio_id,h.publicacion,h.dia,h.vistas,h.aperturas,h.contactos
      from admin.anuncio_historial_diario h
    union all
    select a.anuncio_id,a.publicacion,a.dia,count(*)::bigint,0::bigint,0::bigint
      from public.anuncio_alcance a group by a.anuncio_id,a.publicacion,a.dia
    union all
    select i.anuncio_id,i.publicacion,i.dia,0::bigint,
      count(*) filter(where i.tipo='apertura')::bigint,
      count(*) filter(where i.tipo='contacto')::bigint
      from public.anuncio_interacciones i group by i.anuncio_id,i.publicacion,i.dia
  )
  select f.anuncio_id,f.publicacion,f.dia,max(f.vistas),max(f.aperturas),max(f.contactos)
    from fuentes f group by f.anuncio_id,f.publicacion,f.dia;
$$;
revoke all on function admin.historial_anuncios_diario() from public, anon, authenticated;

-- Solo se archiva lo que corresponde limpiar. Una llamada posterior no pisa
-- lo guardado si una de las dos tablas ya se limpió.
create or replace function admin.archivar_historial_anuncios(p_dias integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_dias is null or p_dias < 30 then
    raise exception 'el plazo mínimo de conservación es 30 días';
  end if;
  insert into admin.anuncio_historial_diario as destino
    (anuncio_id,autor_id,publicacion,dia,vistas,aperturas,contactos)
  select h.anuncio_id,t.autor_id,h.publicacion,h.dia,h.vistas,h.aperturas,h.contactos
    from admin.historial_anuncios_diario() h
    join public.tutor_anuncios t on t.id=h.anuncio_id
    where exists (select 1 from public.anuncio_alcance a
      join public.tutor_anuncios t on t.id=a.anuncio_id
      where a.anuncio_id=h.anuncio_id and a.publicacion=h.publicacion and a.dia=h.dia
        and coalesce(a.vence_publicacion,t.vence_at)<now()-make_interval(days=>p_dias))
    or exists (select 1 from public.anuncio_interacciones i
      join public.tutor_anuncios t on t.id=i.anuncio_id
      where i.anuncio_id=h.anuncio_id and i.publicacion=h.publicacion and i.dia=h.dia
        and coalesce(i.vence_publicacion,t.vence_at)<now()-make_interval(days=>p_dias))
  on conflict (anuncio_id,publicacion,dia) do update set
    vistas=greatest(destino.vistas,excluded.vistas),
    aperturas=greatest(destino.aperturas,excluded.aperturas),
    contactos=greatest(destino.contactos,excluded.contactos);
end;
$$;
revoke all on function admin.archivar_historial_anuncios(integer) from public, anon, authenticated;

create or replace function public.limpiar_alcance_anuncios(p_dias integer default 90)
returns integer language plpgsql security definer set search_path = '' as $$
declare filas integer;
begin
  perform admin.archivar_historial_anuncios(p_dias);
  delete from public.anuncio_alcance a using public.tutor_anuncios t
    where t.id=a.anuncio_id and coalesce(a.vence_publicacion,t.vence_at)<now()-make_interval(days=>p_dias);
  get diagnostics filas=row_count;
  return filas;
end;
$$;
create or replace function public.limpiar_interacciones_anuncios(p_dias integer default 90)
returns integer language plpgsql security definer set search_path = '' as $$
declare filas integer;
begin
  perform admin.archivar_historial_anuncios(p_dias);
  delete from public.anuncio_interacciones i using public.tutor_anuncios t
    where t.id=i.anuncio_id and coalesce(i.vence_publicacion,t.vence_at)<now()-make_interval(days=>p_dias);
  get diagnostics filas=row_count;
  return filas;
end;
$$;
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
create or replace function public.totales_metricas_anuncio(p_anuncio_id uuid)
returns table (vista text,clave text,tipo text,eventos integer)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'hay que haber iniciado sesión' using errcode='42501'; end if;
  if not exists(select 1 from public.tutor_anuncios a where a.id=p_anuncio_id and a.autor_id=auth.uid()) then
    perform admin.exigir_administrador();
  end if;
  return query with m as (select * from public.anuncio_metricas x where x.anuncio_id=p_anuncio_id
    and x.publicacion=(select a.medicion_desde from public.tutor_anuncios a where a.id=p_anuncio_id))
    select 'total'::text,''::text,m.tipo,sum(m.eventos)::integer from m group by m.tipo having sum(m.eventos)>0
    union all select 'dia',m.dia::text,m.tipo,sum(m.eventos)::integer from m group by m.dia,m.tipo having sum(m.eventos)>0
    union all select 'ramo',m.ramo_sigla,m.tipo,sum(m.eventos)::integer from m group by m.ramo_sigla,m.tipo having sum(m.eventos)>=15;
end;
$$;
revoke all on function public.totales_metricas_anuncio(uuid) from public, anon;
grant execute on function public.totales_metricas_anuncio(uuid) to authenticated;
commit;
