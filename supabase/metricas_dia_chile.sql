-- Aplicar después de clases/admin, paneles_historial.sql y anuncio_eventos.sql.
-- Reaplicable. Solo fechas de nuevas métricas; no cambia costo_campana.
begin;
create table if not exists admin.anuncio_dias_chile_inicio (
 unico boolean primary key default true check(unico),
 desde timestamptz not null default now()
);
alter table admin.anuncio_dias_chile_inicio enable row level security;
revoke all on admin.anuncio_dias_chile_inicio from public,anon,authenticated;
insert into admin.anuncio_dias_chile_inicio(unico) values(true) on conflict do nothing;
alter table public.anuncio_alcance add column if not exists dia_zona text not null default 'UTC' check(dia_zona in ('UTC','America/Santiago'));
alter table public.anuncio_alcance alter column dia_zona set default 'America/Santiago';
alter table public.anuncio_alcance alter column dia set default (now() at time zone 'America/Santiago')::date;
alter table public.anuncio_interacciones add column if not exists dia_zona text not null default 'UTC' check(dia_zona in ('UTC','America/Santiago'));
alter table public.anuncio_interacciones alter column dia_zona set default 'America/Santiago';
alter table public.anuncio_interacciones alter column dia set default (now() at time zone 'America/Santiago')::date;
alter table public.anuncio_metricas alter column dia set default (now() at time zone 'America/Santiago')::date;
alter table public.anuncio_eventos_diarios alter column dia set default (now() at time zone 'America/Santiago')::date;

create or replace function public.registrar_evento_anuncio(
  p_anuncio_id uuid,p_tipo text,p_ramo_sigla text,p_evento_id uuid,p_publicacion timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  a public.tutor_anuncios%rowtype;
  uid uuid:=auth.uid();
  pendiente boolean;
  filas integer;
  limite integer;
  dia_chile date := (now() at time zone 'America/Santiago')::date;
  inicio_dia timestamptz := dia_chile::timestamp at time zone 'America/Santiago';
  fin_dia timestamptz := (dia_chile+1)::timestamp at time zone 'America/Santiago';
begin
  if uid is null then raise exception 'hay que haber iniciado sesión' using errcode='42501'; end if;
  if p_evento_id is null or p_publicacion is null or p_tipo is null or p_tipo not in ('impresion','clic','contacto') then
    raise exception 'evento inválido' using errcode='22023';
  end if;
  select * into a from public.tutor_anuncios where id=p_anuncio_id for update;
  if not found then return false; end if;
  if public.es_administrador(uid) or a.autor_id=uid
    or not exists(select 1 from public.user_ramos where user_id=uid) then return false; end if;
  if p_publicacion is distinct from a.publicado_at then return false; end if;
  if not (upper(btrim(coalesce(p_ramo_sigla,'')))=any(a.ramos_siglas)) then
    raise exception 'la sigla no corresponde al anuncio' using errcode='22023';
  end if;
  if exists(select 1 from public.anuncio_eventos_recibos where user_id=uid and evento_id=p_evento_id) then
    return false;
  end if;
  -- El bloqueo del anuncio serializa también este cupo: dos llamadas en
  -- paralelo no pueden superar el máximo. False no escribe ni deja recibo.
  -- Límites locales equivalentes al día de creado_at en America/Santiago;
  -- usa el índice y respeta días de 23/25 horas, sin asumir 24 horas.
  limite:=case p_tipo when 'impresion' then 4 when 'clic' then 2 else 1 end;
  if (select count(*) from (select 1 from public.anuncio_eventos_recibos
      where user_id=uid and anuncio_id=a.id and publicacion=a.medicion_desde and tipo=p_tipo
        and creado_at>=inicio_dia and creado_at<fin_dia
      limit limite) recibos_del_dia)>=limite then
    return false;
  end if;
  -- Permite completar el primer evento que acaba de alcanzar el tope. Consume
  -- la marca auxiliar existente dentro de ESTA transacción: no habilita luego
  -- repeticiones en una campaña agotada/pausada ni cambia el cobro.
  if p_tipo='impresion' then
    select exists(select 1 from public.anuncio_alcance where anuncio_id=a.id and user_id=uid
      and publicacion=a.medicion_desde and not metrica_aux_registrada) into pendiente;
  else
    select exists(select 1 from public.anuncio_interacciones where anuncio_id=a.id and user_id=uid
      and publicacion=a.medicion_desde and tipo=case p_tipo when 'clic' then 'apertura' else 'contacto' end
      and not metrica_aux_registrada) into pendiente;
  end if;
  if not public.cuenta_para_campana(a.id,uid) and not pendiente then return false; end if;
  -- Nunca registra un evento sin su fila cobrable previa confirmada.
  if p_tipo='impresion' then
    if not exists(select 1 from public.anuncio_alcance where anuncio_id=a.id and user_id=uid
      and publicacion=a.medicion_desde) then return false; end if;
  elsif not exists(select 1 from public.anuncio_interacciones where anuncio_id=a.id and user_id=uid
      and publicacion=a.medicion_desde and tipo=case p_tipo when 'clic' then 'apertura' else 'contacto' end) then
    return false;
  end if;
  insert into public.anuncio_eventos_recibos(user_id,evento_id,anuncio_id,publicacion,tipo,vence_publicacion)
    values(uid,p_evento_id,a.id,a.medicion_desde,p_tipo,a.vence_at) on conflict do nothing;
  get diagnostics filas=row_count;
  if filas=0 then return false; end if;
  perform public.registrar_metrica_anuncio(a.id,p_tipo,p_ramo_sigla);
  insert into public.anuncio_eventos_diarios(anuncio_id,publicacion,dia,tipo,eventos)
    values(a.id,a.medicion_desde,(now() at time zone 'America/Santiago')::date,p_tipo,1)
    on conflict(anuncio_id,publicacion,dia,tipo) do update
      set eventos=public.anuncio_eventos_diarios.eventos+1;
  return true;
end;
$$;

create or replace function public.resumen_eventos_anuncio(p_anuncio_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  a public.tutor_anuncios%rowtype;
  es_admin boolean;
  desde timestamptz;
  n_vistas bigint;
  n_clics bigint;
  n_contactos bigint;
  desde_dia date;
  previas record;
  personas record;
  anterior boolean;
begin
  if auth.uid() is null then raise exception 'sin acceso' using errcode='42501'; end if;
  select * into a from public.tutor_anuncios where id=p_anuncio_id;
  if not found then raise exception 'sin acceso' using errcode='42501'; end if;
  es_admin:=public.es_administrador(auth.uid());
  if es_admin then perform admin.exigir_administrador();
  elsif a.autor_id<>auth.uid() then raise exception 'sin acceso' using errcode='42501'; end if;
  select greatest(i.desde,a.medicion_desde) into desde from admin.anuncio_eventos_inicio i where unico;
  select coalesce(sum(eventos)filter(where tipo='impresion'),0),coalesce(sum(eventos)filter(where tipo='clic'),0),
    coalesce(sum(eventos)filter(where tipo='contacto'),0) into n_vistas,n_clics,n_contactos
    from public.anuncio_eventos_diarios where anuncio_id=a.id and publicacion=a.medicion_desde;
  -- Veces en total, para campañas pasadas y futuras (Lucas, 2026-11-02). Antes
  -- de la medición solo se guardaba la primera vez de cada persona: esas
  -- cuentan una vez y se suman a lo medido desde entonces. Las repeticiones de
  -- esa época no se recuperan, así que es un mínimo, y nunca menos que las
  -- personas distintas (una app vieja en caché registra la persona sin el evento).
  -- Las fechas anteriores conservan UTC; las nuevas declaran su zona.
  -- Se compara cada fila con el corte de su propia zona, sin reinterpretarla.
  desde_dia:=(desde at time zone 'UTC')::date;
  select count(*) filter (where dia<case when coalesce(to_jsonb(alc)->>'dia_zona','UTC')='America/Santiago' then (desde at time zone 'America/Santiago')::date else desde_dia end) as antes,count(*) as todas into previas
    from public.anuncio_alcance alc where anuncio_id=a.id and publicacion=a.medicion_desde;
  select count(*) filter (where tipo='apertura' and dia<case when coalesce(to_jsonb(it)->>'dia_zona','UTC')='America/Santiago' then (desde at time zone 'America/Santiago')::date else desde_dia end) as clic_antes,
         count(*) filter (where tipo='contacto' and dia<case when coalesce(to_jsonb(it)->>'dia_zona','UTC')='America/Santiago' then (desde at time zone 'America/Santiago')::date else desde_dia end) as contacto_antes,
         count(*) filter (where tipo='apertura') as clic,
         count(*) filter (where tipo='contacto') as contacto into personas
    from public.anuncio_interacciones it where anuncio_id=a.id and publicacion=a.medicion_desde;
  anterior:=a.vence_at<=desde and n_vistas=0 and n_clics=0 and n_contactos=0;
  n_vistas:=greatest(n_vistas+previas.antes,previas.todas);
  n_clics:=greatest(n_clics+personas.clic_antes,personas.clic);
  n_contactos:=greatest(n_contactos+personas.contacto_antes,personas.contacto);
  return jsonb_build_object('anterior',anterior,'desde',case when anterior then null else desde end,
    'impresion',case when es_admin or n_vistas=0 or n_vistas>=15 then n_vistas else null end,
    'clic',case when es_admin or n_clics=0 or n_clics>=15 then n_clics else null end,
    'contacto',case when es_admin or n_contactos=0 or n_contactos>=15 then n_contactos else null end);
end;
$$;

create or replace function public.admin_panel_clases()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, admin
as $$
begin
  perform admin.exigir_administrador();
  return coalesce((
    select jsonb_agg(prof order by (prof ->> 'estado') = 'pendiente' desc, prof ->> 'nombre')
    from (
      select jsonb_build_object(
        'user_id', p.user_id,
        'nombre', p.nombre_publico,
        'estado', p.estado,
        'correo', u.email,
        'solicitado_at', p.solicitado_at,
        'presentacion', p.presentacion,
        'logo_aprobado_path', to_jsonb(p)->>'logo_aprobado_path',
        'tiene_historial', admin.profesor_tiene_historial(p.user_id),
        'alumnos_conectados', admin.alumnos_conectados(p.user_id),
        -- to_jsonb: sin profesor_alumnos.sql aplicado la columna no existe.
        'panel_alumnos', coalesce((to_jsonb(p)->>'panel_alumnos')::boolean, true),
        'nota', (select n.texto from admin.notas_profesor n where n.user_id = p.user_id),
        'ultimos_30_dias', jsonb_build_object(
          'vieron', (select count(*) from public.anuncio_alcance x join public.tutor_anuncios a on a.id = x.anuncio_id
                      where a.autor_id = p.user_id and x.dia >= (now() at time zone 'America/Santiago')::date - 30),
          'abrieron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                        where a.autor_id = p.user_id and x.tipo = 'apertura' and x.dia >= (now() at time zone 'America/Santiago')::date - 30),
          'contactaron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                           where a.autor_id = p.user_id and x.tipo = 'contacto' and x.dia >= (now() at time zone 'America/Santiago')::date - 30)),
        'historial', coalesce((select jsonb_agg(h order by h->>'fecha' desc) from (
            select jsonb_build_object('accion', c.accion, 'fecha', c.created_at, 'admin', au.email, 'detalle', c.detalle) h
              from admin.acciones c left join auth.users au on au.id = c.admin_id
             where c.objetivo = p.user_id
                or c.objetivo in (select a.id from public.tutor_anuncios a where a.autor_id = p.user_id)
             order by c.created_at desc limit 10) z), '[]'::jsonb),
        'anuncios', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', a.id,
            'titulo', a.titulo,
            'estado', a.estado,
            'tenant', a.tenant,
            'ramos_siglas', a.ramos_siglas,
            'precio_clp', a.precio_clp,
            'tipo', coalesce(to_jsonb(a)->>'tipo', 'clase'),
            'pack_clases', to_jsonb(a)->'pack_clases',
            'descuento_gradehub_pct', to_jsonb(a)->'descuento_gradehub_pct',
            'codigo_descuento', to_jsonb(a)->'codigo_descuento',
            'descripcion', a.descripcion,
            'modalidad', a.modalidad,
            'modalidad_otra', a.modalidad_otra,
            'ubicacion', a.ubicacion,
            'ubicacion_otra', a.ubicacion_otra,
            'detalles', a.detalles,
            'linea_datos', a.linea_datos,
            'contacto_tipo', a.contacto_tipo,
            'contacto_valor', a.contacto_valor,
            'flyer_path', a.flyer_path,
            'criterios', a.criterios,
            'configuracion_campana', (select jsonb_build_object('dias', k.dias, 'inicio', k.inicio, 'tope_clp', k.tope_clp)
                                       from public.anuncio_campanas k where k.anuncio_id = a.id),
            'publicaciones_anteriores', (select count(*) from admin.anuncio_publicaciones h where h.anuncio_id = a.id),
            'publicado_at', a.publicado_at,
            'vence_at', a.vence_at,
            'created_at', a.created_at,
            'campana', (select to_jsonb(k) || jsonb_build_object('sin_costo',coalesce(a.precio_campana_clp=0,false)) from public.costo_campana(a.id) k),
            'cobros', coalesce((select jsonb_agg(jsonb_build_object(
              'publicado_at', h.publicado_at, 'estado', h.estado, 'monto_clp', h.monto_clp,
              'actualizado_at', h.actualizado_at) order by h.publicado_at desc)
              from admin.cobros h where h.anuncio_id = a.id), '[]'::jsonb),
            'cobro', (select jsonb_build_object('estado', c.estado, 'monto_clp', c.monto_clp, 'actualizado_at', c.actualizado_at)
                        from admin.cobros c where c.anuncio_id = a.id and c.publicado_at = a.publicado_at)
          ) order by a.created_at desc)
          from public.tutor_anuncios a where a.autor_id = p.user_id), '[]'::jsonb)
      ) as prof
      from public.tutor_perfiles p
      left join auth.users u on u.id = p.user_id
    ) x), '[]'::jsonb);
end;
$$;

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
revoke all on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz),public.resumen_eventos_anuncio(uuid),public.admin_panel_clases(),public.admin_alcance_diario(integer),public.admin_historial_anuncios(integer),public.historial_anuncio(uuid,integer) from public,anon;
grant execute on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz),public.resumen_eventos_anuncio(uuid),public.admin_panel_clases(),public.admin_alcance_diario(integer),public.admin_historial_anuncios(integer),public.historial_anuncio(uuid,integer) to authenticated;
commit;
