-- Repeticiones separadas del alcance/cobro. Aplicar ANTES del merge.
-- Requiere clases_particulares.sql y administradores.sql. Reaplicable.
-- No modifica el registro cobrable, tarifas, métricas antiguas ni sus RPC.
begin;

create table if not exists admin.anuncio_eventos_inicio (
  unico boolean primary key default true check (unico),
  desde timestamptz not null default now()
);
insert into admin.anuncio_eventos_inicio(unico) values(true) on conflict do nothing;
alter table admin.anuncio_eventos_inicio enable row level security;
revoke all on admin.anuncio_eventos_inicio from public, anon, authenticated;

-- Recibos de idempotencia: una clave aleatoria POR EVENTO, no por dispositivo.
-- No almacena notas, nombre, carrera, canal ni la búsqueda del estudiante.
create table if not exists public.anuncio_eventos_recibos (
  user_id uuid not null references auth.users(id) on delete cascade,
  evento_id uuid not null,
  anuncio_id uuid not null references public.tutor_anuncios(id) on delete cascade,
  publicacion timestamptz not null,
  tipo text not null check(tipo in ('impresion','clic','contacto')),
  creado_at timestamptz not null default now(),
  vence_publicacion timestamptz,
  primary key(user_id,evento_id)
);
create index if not exists anuncio_eventos_recibos_retencion on public.anuncio_eventos_recibos(vence_publicacion);
alter table public.anuncio_eventos_recibos enable row level security;
revoke all on public.anuncio_eventos_recibos from public, anon, authenticated;

-- Totales anónimos. Nunca son una fuente para costo_campana o facturación.
create table if not exists public.anuncio_eventos_diarios (
  anuncio_id uuid not null references public.tutor_anuncios(id) on delete cascade,
  publicacion timestamptz not null,
  dia date not null,
  tipo text not null check(tipo in ('impresion','clic','contacto')),
  eventos bigint not null check(eventos>0),
  primary key(anuncio_id,publicacion,dia,tipo)
);
alter table public.anuncio_eventos_diarios enable row level security;
revoke all on public.anuncio_eventos_diarios from public, anon, authenticated;

create or replace function public.registrar_evento_anuncio(
  p_anuncio_id uuid,p_tipo text,p_ramo_sigla text,p_evento_id uuid,p_publicacion timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare
  a public.tutor_anuncios%rowtype;
  uid uuid:=auth.uid();
  pendiente boolean;
  filas integer;
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
    values(a.id,a.medicion_desde,(now() at time zone 'UTC')::date,p_tipo,1)
    on conflict(anuncio_id,publicacion,dia,tipo) do update
      set eventos=public.anuncio_eventos_diarios.eventos+1;
  return true;
end;
$$;
revoke all on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz) from public,anon;
grant execute on function public.registrar_evento_anuncio(uuid,text,text,uuid,timestamptz) to authenticated;

create or replace function public.resumen_eventos_anuncio(p_anuncio_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  a public.tutor_anuncios%rowtype;
  es_admin boolean;
  desde timestamptz;
  n_vistas bigint;
  n_clics bigint;
  n_contactos bigint;
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
  -- Una campaña que terminó antes de instalar la medición nunca tuvo una
  -- ventana medible. No convertir esa ausencia histórica en tres ceros.
  if a.vence_at<=desde and n_vistas=0 and n_clics=0 and n_contactos=0 then
    return jsonb_build_object('anterior',true,'desde',null,
      'impresion',null,'clic',null,'contacto',null);
  end if;
  return jsonb_build_object('desde',desde,
    'impresion',case when es_admin or n_vistas=0 or n_vistas>=15 then n_vistas else null end,
    'clic',case when es_admin or n_clics=0 or n_clics>=15 then n_clics else null end,
    'contacto',case when es_admin or n_contactos=0 or n_contactos>=15 then n_contactos else null end);
end;
$$;
revoke all on function public.resumen_eventos_anuncio(uuid) from public,anon;
grant execute on function public.resumen_eventos_anuncio(uuid) to authenticated;

create or replace function public.limpiar_eventos_anuncios()
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  delete from public.anuncio_eventos_recibos
    where coalesce(vence_publicacion,creado_at)<now()-interval '90 days';
  get diagnostics n=row_count;
  return n;
end;
$$;
revoke all on function public.limpiar_eventos_anuncios() from public,anon,authenticated;
do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if not exists(select 1 from cron.job where jobname='gradehub-eventos-anuncios') then
      perform cron.schedule('gradehub-eventos-anuncios','25 6 * * *','select public.limpiar_eventos_anuncios()');
    end if;
  end if;
end;
$$;
commit;
