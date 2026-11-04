-- Directorio de apoyo. Aplicar manualmente ANTES de mergear.
-- Requiere clases_particulares.sql, perfil_profesor.sql y administradores.sql.
-- Reaplicable. Después de reaplicar el SQL base de clases, reaplicar este delta
-- (el archivo base revoca permisos de columna). No altera anuncios ni cobros.
begin;
alter table public.tutor_perfiles add column if not exists directorio_id uuid not null default gen_random_uuid();
create unique index if not exists tutor_perfiles_directorio_id on public.tutor_perfiles(directorio_id);
alter table public.tutor_perfiles add column if not exists categorias text[];
alter table public.tutor_perfiles add column if not exists etiqueta text;
alter table public.tutor_perfiles add column if not exists color_tarjeta text;
alter table public.tutor_perfiles add column if not exists en_directorio boolean not null default false;
alter table public.tutor_perfiles add column if not exists contacto_tipo text;
alter table public.tutor_perfiles add column if not exists contacto_valor text;
alter table public.tutor_perfiles add column if not exists destacado_hasta timestamptz;
alter table public.tutor_perfiles drop constraint if exists directorio_categorias;
alter table public.tutor_perfiles add constraint directorio_categorias check
  (categorias is null or (cardinality(categorias) between 1 and 4 and array_position(categorias,null) is null
    and categorias <@ array['clases','material','laboratorio','otro']));
alter table public.tutor_perfiles drop constraint if exists directorio_etiqueta;
alter table public.tutor_perfiles add constraint directorio_etiqueta check
  (etiqueta is null or (char_length(btrim(etiqueta)) between 2 and 28 and etiqueta !~ E'[\\n\\r]'));
alter table public.tutor_perfiles drop constraint if exists directorio_color;
alter table public.tutor_perfiles add constraint directorio_color check
  (color_tarjeta is null or color_tarjeta ~ '^#[0-9a-f]{6}$');
alter table public.tutor_perfiles drop constraint if exists directorio_contacto;
alter table public.tutor_perfiles add constraint directorio_contacto check
  ((contacto_tipo is null and contacto_valor is null) or
    (contacto_tipo is not null and contacto_valor is not null and char_length(btrim(contacto_valor)) between 3 and 160
      and case contacto_tipo
        when 'whatsapp' then regexp_replace(contacto_valor,'[^0-9]','','g') ~ '^569[0-9]{8}$'
        when 'instagram' then contacto_valor ~ '^@?[A-Za-z0-9._]{1,30}$'
        when 'email' then contacto_valor ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
        else false end));
alter table public.tutor_perfiles drop constraint if exists directorio_consentimiento;
alter table public.tutor_perfiles add constraint directorio_consentimiento check
  (not en_directorio or (categorias is not null and etiqueta is not null and color_tarjeta is not null
    and cardinality(universidades)>0 and universidades is not null));
-- Las políticas propias y FK auth.users ON DELETE CASCADE son las del perfil.
alter table public.tutor_perfiles enable row level security;
grant select (directorio_id,categorias,etiqueta,color_tarjeta,en_directorio,contacto_tipo,contacto_valor,destacado_hasta)
  on public.tutor_perfiles to authenticated;
grant update (categorias,etiqueta,color_tarjeta,en_directorio,contacto_tipo,contacto_valor)
  on public.tutor_perfiles to authenticated;
-- Nunca se concede INSERT/UPDATE de directorio_id ni destacado_hasta.
revoke update (directorio_id,destacado_hasta) on public.tutor_perfiles from authenticated;

-- Proyección pública explícita. El uid y el correo (incluido el contacto email)
-- NO salen en la lista. Un UUID aleatorio distinto identifica la ficha pública.
create or replace function public.directorio_perfiles(p_tenant text)
returns table(id uuid,nombre_publico text,etiqueta text,categorias text[],color_tarjeta text,
  logo_path text,ramos_siglas text[],presentacion text,contacto_tipo text,contacto_valor text,
  instagram text,sitio_web text,destacado_hasta timestamptz,destacado boolean,anuncios uuid[])
language sql stable security definer set search_path='' as $$
  select p.directorio_id,p.nombre_publico,p.etiqueta,p.categorias,p.color_tarjeta,
    p.logo_aprobado_path,p.ramos_siglas,p.presentacion,
    p.contacto_tipo,
    case when p.contacto_tipo<>'email' then p.contacto_valor end,
    p.instagram,p.sitio_web,p.destacado_hasta,coalesce(p.destacado_hasta>now(),false),
    array(select a.id from public.tutor_anuncios a where a.autor_id=p.user_id and a.tenant=p_tenant
      and a.estado='publicado' and (a.vence_at is null or a.vence_at>now()) order by a.id)
  from public.tutor_perfiles p
  where auth.uid() is not null and p.estado='aprobado' and p.en_directorio
    and p_tenant=any(p.universidades);
$$;
revoke all on function public.directorio_perfiles(text) from public,anon;
grant execute on function public.directorio_perfiles(text) to authenticated;

-- Solo el gesto Contactar pide el contacto, también si es email. Nunca auth.users.email.
create or replace function public.contacto_directorio_perfil(p_perfil uuid,p_tenant text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('tipo',p.contacto_tipo,'valor',p.contacto_valor)
  from public.tutor_perfiles p where auth.uid() is not null and p.directorio_id=p_perfil
    and p.estado='aprobado' and p.en_directorio and p_tenant=any(p.universidades);
$$;
revoke all on function public.contacto_directorio_perfil(uuid,text) from public,anon;
grant execute on function public.contacto_directorio_perfil(uuid,text) to authenticated;

-- El logo también se puede firmar sin un anuncio, únicamente para perfiles
-- que consintieron aparecer. Conserva la visibilidad histórica desde anuncios.
create or replace function public.logo_profesor_visible(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.tutor_perfiles p
    where p.logo_aprobado_path=p_path and p.estado='aprobado'
      and ((auth.uid() is not null and p.en_directorio)
        or exists(select 1 from public.tutor_anuncios a where a.autor_id=p.user_id
          and a.estado='publicado' and (a.vence_at is null or a.vence_at>now()))));
$$;

-- Cambios de texto: mismo flujo vigente del perfil (sin nueva revisión).
-- Se consume solo logo_aprobado_path, respetando el flujo vigente del logo.
create or replace function public.admin_destacado_perfil(p_user_id uuid,p_hasta timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare filas integer;
begin
  perform admin.exigir_administrador();
  if p_hasta is not null and p_hasta<=now() then raise exception 'Elige una fecha futura'; end if;
  update public.tutor_perfiles set destacado_hasta=p_hasta where user_id=p_user_id and estado='aprobado';
  get diagnostics filas=row_count;
  if filas=1 then
    insert into admin.acciones(admin_id,accion,objetivo,detalle)
    values(auth.uid(),'destacado_perfil',p_user_id,jsonb_build_object('hasta',p_hasta));
  end if;
  return filas=1;
end;
$$;
create or replace function public.admin_directorio_perfiles()
returns table(user_id uuid,destacado_hasta timestamptz,etiqueta text,en_directorio boolean)
language plpgsql stable security definer set search_path='' as $$
begin
  perform admin.exigir_administrador();
  return query select p.user_id,p.destacado_hasta,p.etiqueta,p.en_directorio from public.tutor_perfiles p;
end;
$$;
revoke all on function public.admin_destacado_perfil(uuid,timestamptz) from public,anon;
revoke all on function public.admin_directorio_perfiles() from public,anon;
grant execute on function public.admin_destacado_perfil(uuid,timestamptz),public.admin_directorio_perfiles() to authenticated;

-- Métricas del directorio: agregados sin identidad de quien miró. Los recibos
-- privados siguen anuncio_eventos.sql (decisión Lucas, 2026-11-04): cuenta y
-- evento aleatorio, máximos 4/2/1 por perfil, tipo y día de Chile. No facturan.
create table if not exists public.perfil_eventos_diarios (
  perfil uuid not null references auth.users(id) on delete cascade
    references public.tutor_perfiles(user_id) on delete cascade,
  dia date not null default (now() at time zone 'America/Santiago')::date,
  vistas bigint not null default 0 check(vistas>=0),
  aperturas bigint not null default 0 check(aperturas>=0),
  contactos bigint not null default 0 check(contactos>=0),
  primary key(perfil,dia)
);
alter table public.perfil_eventos_diarios enable row level security;
revoke all on public.perfil_eventos_diarios from public,anon,authenticated;
create table if not exists public.perfil_eventos_recibos (
  user_id uuid not null references auth.users(id) on delete cascade,
  evento_id uuid not null,
  perfil uuid not null references auth.users(id) on delete cascade
    references public.tutor_perfiles(user_id) on delete cascade,
  tipo text not null check(tipo in ('vista','apertura','contacto')),
  creado_at timestamptz not null default now(),
  primary key(user_id,evento_id)
);
create index if not exists perfil_recibos_cupo on public.perfil_eventos_recibos(user_id,perfil,tipo,creado_at);
create index if not exists perfil_recibos_retencion on public.perfil_eventos_recibos(creado_at);
alter table public.perfil_eventos_recibos enable row level security;
revoke all on public.perfil_eventos_recibos from public,anon,authenticated;
create or replace function public.registrar_evento_perfil(p_perfil uuid,p_tenant text,p_tipo text,p_evento_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  p public.tutor_perfiles%rowtype;
  uid uuid:=auth.uid();
  limite integer;
  dia_chile date:=(now() at time zone 'America/Santiago')::date;
  desde timestamptz:=dia_chile::timestamp at time zone 'America/Santiago';
  hasta timestamptz:=(dia_chile+1)::timestamp at time zone 'America/Santiago';
  filas integer;
begin
  if uid is null then raise exception 'sin acceso' using errcode='42501'; end if;
  if p_tipo is null or p_tipo not in ('vista','apertura','contacto') or p_evento_id is null then
    raise exception 'evento inválido' using errcode='22023'; end if;
  select * into p from public.tutor_perfiles where directorio_id=p_perfil for update;
  if not found then return false; end if;
  if p.estado<>'aprobado' or not p.en_directorio or not coalesce(p_tenant=any(p.universidades),false)
    or p.user_id=uid or public.es_administrador(uid)
    or not exists(select 1 from public.user_ramos where user_id=uid) then return false; end if;
  limite:=case p_tipo when 'vista' then 4 when 'apertura' then 2 else 1 end;
  if (select count(*) from (select 1 from public.perfil_eventos_recibos
    where user_id=uid and perfil=p.user_id and tipo=p_tipo and creado_at>=desde and creado_at<hasta limit limite) r)>=limite
    then return false; end if;
  insert into public.perfil_eventos_recibos(user_id,evento_id,perfil,tipo)
    values(uid,p_evento_id,p.user_id,p_tipo) on conflict do nothing;
  get diagnostics filas=row_count;
  if filas=0 then return false; end if;
  insert into public.perfil_eventos_diarios(perfil,dia,vistas,aperturas,contactos)
    values(p.user_id,dia_chile,(p_tipo='vista')::integer,(p_tipo='apertura')::integer,(p_tipo='contacto')::integer)
    on conflict(perfil,dia) do update set vistas=public.perfil_eventos_diarios.vistas+excluded.vistas,
      aperturas=public.perfil_eventos_diarios.aperturas+excluded.aperturas,contactos=public.perfil_eventos_diarios.contactos+excluded.contactos;
  -- Retención acotada e indexada; nunca toca los totales ni registros cobrables.
  delete from public.perfil_eventos_recibos where creado_at<now()-interval '90 days';
  return true;
end;
$$;
revoke all on function public.registrar_evento_perfil(uuid,text,text,uuid) from public,anon;
grant execute on function public.registrar_evento_perfil(uuid,text,text,uuid) to authenticated;

-- Igual que anuncio_metricas: quince eventos por métrica para el dueño. Un
-- número desconocido es NULL, nunca un cero inventado. Admin con MFA ve todo.
create or replace function public.resumen_directorio_perfil(p_perfil uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare propietario uuid; es_admin boolean; v bigint; a bigint; c bigint;
begin
  if auth.uid() is null then raise exception 'sin acceso' using errcode='42501'; end if;
  es_admin:=public.es_administrador(auth.uid());
  if es_admin then perform admin.exigir_administrador(); end if;
  select user_id into propietario from public.tutor_perfiles
    where (p_perfil is null and user_id=auth.uid()) or directorio_id=p_perfil;
  if propietario is null or (propietario<>auth.uid() and not es_admin) then
    raise exception 'sin acceso' using errcode='42501'; end if;
  select coalesce(sum(vistas),0),coalesce(sum(aperturas),0),coalesce(sum(contactos),0) into v,a,c
    from public.perfil_eventos_diarios where perfil=propietario;
  return jsonb_build_object('vistas',case when es_admin or v>=15 then v end,
    'aperturas',case when es_admin or a>=15 then a end,'contactos',case when es_admin or c>=15 then c end,'umbral',15);
end;
$$;
create or replace function public.admin_metricas_directorio()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  perform admin.exigir_administrador();
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,
    'metricas',public.resumen_directorio_perfil(p.directorio_id))),'[]'::jsonb) from public.tutor_perfiles p);
end;
$$;
revoke all on function public.resumen_directorio_perfil(uuid),public.admin_metricas_directorio() from public,anon;
grant execute on function public.resumen_directorio_perfil(uuid),public.admin_metricas_directorio() to authenticated;

commit;
