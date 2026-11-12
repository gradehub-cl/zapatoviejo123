-- Aplicar DESPUÉS de metricas_dia_chile.sql. Reaplicable; sin backfill.
-- Solo métricas informativas: no cambia tarifas, costo_campana ni personas/canales cobrables.
begin;
create index if not exists anuncio_eventos_recibos_abuso_diario
 on public.anuncio_eventos_recibos(user_id,anuncio_id,tipo,creado_at);
-- Conserva ambos hitos: los eventos anteriores tenían cupos 4/2/1 y dependían del cobro.
-- Esos registros son un mínimo histórico; no se inventan repeticiones perdidas.
alter table admin.anuncio_eventos_inicio add column if not exists cada_vez_desde timestamptz not null default now();
create or replace function public.registrar_evento_anuncio(
  p_anuncio_id uuid,p_tipo text,p_ramo_sigla text,p_evento_id uuid,p_publicacion timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  a public.tutor_anuncios%rowtype;
  uid uuid:=auth.uid();
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
  -- Una tarjeta ya mostrada puede seguir abierta al agotarse/pausarse el cobro.
  -- No habilita nuevas publicaciones, borradores, profesores suspendidos ni vencidos.
  if a.estado not in ('publicado','pausado') or a.publicado_at>now()
    or a.vence_at<=now() or not public.tutor_aprobado(a.autor_id) then return false; end if;
  if not (upper(btrim(coalesce(p_ramo_sigla,'')))=any(a.ramos_siglas)) then
    raise exception 'la sigla no corresponde al anuncio' using errcode='22023';
  end if;
  -- Conserva el agregado auxiliar anterior, solo si ya existe su fila.
  -- Su booleano NO condiciona el total; no crea personas ni modifica el costo.
  perform public.registrar_metrica_anuncio(a.id,p_tipo,p_ramo_sigla);
  -- Un reintento puede completar esa marca si el alcance se confirmó después.
  if exists(select 1 from public.anuncio_eventos_recibos where user_id=uid and evento_id=p_evento_id) then
    return false;
  end if;
  -- El bloqueo del anuncio serializa también este cupo: dos llamadas en
  -- paralelo no pueden superar el máximo. El exceso no suma ni deja recibo.
  -- Límites locales equivalentes al día de creado_at en America/Santiago;
  -- usa el índice y respeta días de 23/25 horas, sin asumir 24 horas.
  -- Protección contra abuso, NO deduplicación de personas ni tarifa.
  -- Se descartan silenciosamente las repeticiones que excedan el cupo.
  limite:=case p_tipo when 'impresion' then 30 when 'clic' then 15 else 10 end;
  if (select count(*) from (select 1 from public.anuncio_eventos_recibos
      where user_id=uid and anuncio_id=a.id and tipo=p_tipo
        and creado_at>=inicio_dia and creado_at<fin_dia
      limit limite) recibos_del_dia)>=limite then
    return false;
  end if;
  -- No consulta cuenta_para_campana ni exige una fila cobrable.
  insert into public.anuncio_eventos_recibos(user_id,evento_id,anuncio_id,publicacion,tipo,vence_publicacion)
    values(uid,p_evento_id,a.id,a.medicion_desde,p_tipo,a.vence_at) on conflict do nothing;
  get diagnostics filas=row_count;
  if filas=0 then return false; end if;
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
  return jsonb_build_object('cada_vez_desde',(select greatest(i.cada_vez_desde,a.medicion_desde) from admin.anuncio_eventos_inicio i where unico),'anterior',anterior,'desde',case when anterior then null else desde end,
    'impresion',case when es_admin or n_vistas=0 or n_vistas>=15 then n_vistas else null end,
    'clic',case when es_admin or n_clics=0 or n_clics>=15 then n_clics else null end,
    'contacto',case when es_admin or n_contactos=0 or n_contactos>=15 then n_contactos else null end);
end;
$$;

-- Añade totales a los días del historial sin sustituir las personas cobrables.
-- FULL JOIN conserva también días que solo tienen eventos informativos.
create or replace function public.admin_historial_anuncios(p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform admin.exigir_administrador();
  if p_dias is not null and p_dias<1 then raise exception 'rango inválido'; end if;
  return (with eventos as (
    select e.anuncio_id,e.publicacion,e.dia,
      sum(e.eventos) filter(where e.tipo='impresion') vistas,
      sum(e.eventos) filter(where e.tipo='clic') aperturas,
      sum(e.eventos) filter(where e.tipo='contacto') contactos
    from public.anuncio_eventos_diarios e group by e.anuncio_id,e.publicacion,e.dia
  ), dias as (
    select coalesce(h.anuncio_id,e.anuncio_id) anuncio_id,coalesce(h.publicacion,e.publicacion) publicacion,
      coalesce(h.dia,e.dia) dia,coalesce(h.vistas,0) vistas,coalesce(h.aperturas,0) aperturas,coalesce(h.contactos,0) contactos,
      greatest(coalesce(h.vistas,0),coalesce(e.vistas,0)) vistas_total,
      greatest(coalesce(h.aperturas,0),coalesce(e.aperturas,0)) aperturas_total,
      greatest(coalesce(h.contactos,0),coalesce(e.contactos,0)) contactos_total
    from admin.historial_anuncios_diario() h full join eventos e using(anuncio_id,publicacion,dia)
  ) select coalesce(jsonb_agg(to_jsonb(d) order by d.dia,d.anuncio_id),'[]'::jsonb) from dias d
    where p_dias is null or (now() at time zone 'America/Santiago')::date-d.dia<p_dias);
end;
$$;
-- Los SQL base revocan permisos: volver a aplicar este complemento al final.
revoke all on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz),
 public.resumen_eventos_anuncio(uuid),public.admin_historial_anuncios(integer) from public,anon;
grant execute on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz),
 public.resumen_eventos_anuncio(uuid),public.admin_historial_anuncios(integer) to authenticated;
-- limpiar_eventos_anuncios sigue eliminando los recibos 90 días tras vencer
-- la publicación (o su creación si no hay vencimiento). No toca los agregados.
commit;
