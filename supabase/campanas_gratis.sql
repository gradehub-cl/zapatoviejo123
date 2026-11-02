-- Requiere el base vigente de clases_particulares.sql (funciones canónicas),
-- seguido de admin_clases.sql y administradores.sql.
-- Publicaciones anteriores conservan su tarifa: no se completa el precio histórico.
begin;
alter table public.tutor_anuncios add column if not exists precio_campana_clp integer;
alter table public.tutor_anuncios add column if not exists configuracion_campana_aprobada jsonb;
alter table admin.anuncio_publicaciones add column if not exists precio_campana_clp integer;
alter table public.anuncio_campanas add column if not exists configuracion_previa jsonb;
alter table public.anuncio_campanas alter column tope_clp drop not null;
alter table public.anuncio_campanas drop constraint if exists anuncio_campanas_tope_clp_check;
alter table public.anuncio_campanas add constraint anuncio_campanas_tope_clp_check
  check (tope_clp is null or tope_clp between 1000 and 5000000);

create or replace function public.validar_tope_campana()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Preparar la siguiente campaña no cambia el tope ni los días de la anterior.
  -- Solo se captura en la primera edición explícita; no hay backfill masivo.
  -- El respaldo queda en la misma fila: no toma un bloqueo inverso al del
  -- publicador (que bloquea primero el anuncio y después la campaña).
  if exists (select 1 from public.tutor_anuncios a where a.id=new.anuncio_id and a.publicado_at is not null and a.configuracion_campana_aprobada is null) then
    if tg_op='UPDATE' and old.configuracion_previa is null then
      new.configuracion_previa:=jsonb_build_object('dias',old.dias,'inicio',old.inicio,'tope_clp',old.tope_clp);
    elsif tg_op='INSERT' then
      -- Un publicado heredado sin fila de campaña era ilimitado.
      new.configuracion_previa:=jsonb_build_object('dias',null,'inicio',null,'tope_clp',null);
    end if;
  end if;
  if new.tope_clp is null and not exists (select 1 from public.tutor_anuncios a where a.id=new.anuncio_id and a.precio_clp=0) then
    raise exception 'un anuncio con precio necesita un tope de campaña' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validar_tope_campana() from public, anon, authenticated;
drop trigger if exists anuncio_campanas_validar_tope on public.anuncio_campanas;
create trigger anuncio_campanas_validar_tope before insert or update of dias, inicio, tope_clp, anuncio_id on public.anuncio_campanas
for each row execute function public.validar_tope_campana();

-- Sobrecarga interna: la firma anterior mantiene íntegra la tarifa heredada.
-- La sobrecarga de tarifa vive en clases_particulares.sql.
revoke all on function public.tarifa_campana_clp(text,integer) from public, anon, authenticated;

-- public.preparar_publicacion_clase vive en clases_particulares.sql (versión vigente).

-- public.costo_campana vive en clases_particulares.sql (versión vigente).

-- La RPC anterior conserva firma y tipo. El cliente nuevo pide la marca explícita.
create or replace function public.campana_anuncio_con_tarifa(p_anuncio_id uuid)
returns table (dias integer, inicio date, tope_clp integer, dias_cobrados integer,
               vistas integer, aperturas integer, contactos integer, costo integer, agotada boolean, sin_costo boolean)
language plpgsql security definer set search_path = '' as $$
begin
  -- campana_anuncio exige dueño o admin con MFA antes de devolver datos.
  return query select c.*,coalesce(a.precio_campana_clp=0,false)
    from public.campana_anuncio(p_anuncio_id) c
    join public.tutor_anuncios a on a.id=p_anuncio_id;
end;
$$;
revoke all on function public.campana_anuncio_con_tarifa(uuid) from public, anon;
grant execute on function public.campana_anuncio_con_tarifa(uuid) to authenticated;

-- Conserva la condición aprobada también en el historial privado de publicaciones.
create or replace function admin.precio_publicacion_clase()
returns trigger language plpgsql set search_path = '' as $$
begin
  select a.precio_campana_clp into new.precio_campana_clp from public.tutor_anuncios a where a.id=new.anuncio_id;
  if new.precio_campana_clp=0 then new.cargo_clp:=0; end if;
  return new;
end;
$$;
revoke all on function admin.precio_publicacion_clase() from public, anon, authenticated;
drop trigger if exists anuncio_publicaciones_precio on admin.anuncio_publicaciones;
create trigger anuncio_publicaciones_precio before insert on admin.anuncio_publicaciones
for each row execute function admin.precio_publicacion_clase();

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
                      where a.autor_id = p.user_id and x.dia >= current_date - 30),
          'abrieron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                        where a.autor_id = p.user_id and x.tipo = 'apertura' and x.dia >= current_date - 30),
          'contactaron', (select count(*) from public.anuncio_interacciones x join public.tutor_anuncios a on a.id = x.anuncio_id
                           where a.autor_id = p.user_id and x.tipo = 'contacto' and x.dia >= current_date - 30)),
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

create or replace function public.admin_marcar_cobro_publicacion(
  p_anuncio_id uuid, p_publicado_at timestamptz, p_estado text, p_monto_clp integer
)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  actual timestamptz;
begin
  perform admin.exigir_administrador();
  if p_estado is null or p_estado not in ('cobrado', 'deuda', 'pendiente') then
    raise exception 'estado de cobro inválido';
  end if;
  select publicado_at into actual from public.tutor_anuncios where id = p_anuncio_id for update;
  if not found or p_publicado_at is null or not (
    p_publicado_at is not distinct from actual
    or exists (select 1 from admin.anuncio_publicaciones where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at)
    or exists (select 1 from admin.cobros where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at)
  ) then
    raise exception 'esa publicación no existe';
  end if;
  if p_estado <> 'pendiente' and (
    exists (select 1 from public.tutor_anuncios a where a.id=p_anuncio_id and a.publicado_at=p_publicado_at and a.precio_campana_clp=0)
    or exists (select 1 from admin.anuncio_publicaciones h where h.anuncio_id=p_anuncio_id and h.publicado_at=p_publicado_at and h.precio_campana_clp=0)
  ) then raise exception 'una campaña gratis no tiene cobro'; end if;
  if p_estado = 'pendiente' then
    delete from admin.cobros where anuncio_id = p_anuncio_id and publicado_at = p_publicado_at;
  else
    if p_monto_clp is null or p_monto_clp not between 0 and 5000000 then
      raise exception 'monto inválido';
    end if;
    insert into admin.cobros (anuncio_id, publicado_at, estado, monto_clp)
    values (p_anuncio_id, p_publicado_at, p_estado, p_monto_clp)
    on conflict (anuncio_id, publicado_at) do update
      set estado = excluded.estado, monto_clp = excluded.monto_clp, actualizado_at = now();
  end if;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'marcar_cobro', p_anuncio_id,
    jsonb_build_object('publicado_at', p_publicado_at, 'estado', p_estado, 'monto_clp', p_monto_clp));
  return true;
end;
$$;
-- Permisos explícitos también al reemplazar funciones existentes.
revoke all on function public.preparar_publicacion_clase() from public, anon, authenticated;
revoke all on function public.costo_campana(uuid) from public, anon, authenticated;
revoke all on function public.admin_panel_clases() from public, anon;
grant execute on function public.admin_panel_clases() to authenticated;
revoke all on function public.admin_marcar_cobro_publicacion(uuid,timestamptz,text,integer) from public, anon;
grant execute on function public.admin_marcar_cobro_publicacion(uuid,timestamptz,text,integer) to authenticated;
commit;
