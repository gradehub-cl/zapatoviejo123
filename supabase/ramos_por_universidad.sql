-- Ramos del perfil de Apoyo asociados a cada universidad (#1105).
-- Aplicar DESPUÉS de perfil_profesor.sql, directorio_perfiles.sql,
-- campanas_gratis.sql y metricas_dia_chile.sql. Reaplicable; sin backfill.
-- Delta mínimo: NO reaplicar administradores.sql ni los SQL base para esto,
-- porque sus copias de admin_panel_clases y admin_marcar_cobro_publicacion
-- son anteriores a las de producción. Si se reaplica un SQL base, volver a
-- aplicar este archivo al final.
begin;
-- Asociación opcional: NULL conserva exactamente la lista antigua, sin backfill.
alter table public.tutor_perfiles add column if not exists ramos_por_universidad jsonb;
create or replace function public.ramos_por_universidad_validos(p jsonb,unis text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare fila record; total integer:=0; codigos text[];
begin
  if p is null then return true; end if;
  if jsonb_typeof(p)<>'object' then return false; end if;
  for fila in select * from jsonb_each(p) loop
    if not (fila.key=any(array['uc','fen','uai','uandes','udd']))
      or not coalesce(fila.key=any(unis),false) or jsonb_typeof(fila.value)<>'array' then return false; end if;
    total:=total+jsonb_array_length(fila.value);
    if total>20 then return false; end if;
    if exists(select 1 from jsonb_array_elements(fila.value) e where jsonb_typeof(e)<>'string') then return false; end if;
    select coalesce(array_agg(e),'{}'::text[]) into codigos from jsonb_array_elements_text(fila.value) e;
    if not public.siglas_perfil_validas(codigos) then return false; end if;
  end loop;
  return true;
end; $$;
revoke all on function public.ramos_por_universidad_validos(jsonb,text[]) from public,anon;
grant execute on function public.ramos_por_universidad_validos(jsonb,text[]) to authenticated;
alter table public.tutor_perfiles drop constraint if exists tutor_perfiles_ramos_por_universidad_check;
alter table public.tutor_perfiles add constraint tutor_perfiles_ramos_por_universidad_check
  check(public.ramos_por_universidad_validos(ramos_por_universidad,universidades));
-- Trigger invocador: solo deriva NEW, no consulta ni actualiza otros perfiles.
create or replace function public.unir_ramos_perfil()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.ramos_por_universidad is not null
    and public.ramos_por_universidad_validos(new.ramos_por_universidad,new.universidades) then
    select coalesce(array_agg(sigla order by uni_pos,sigla_pos),'{}'::text[]) into new.ramos_siglas
    from (select distinct on (e.sigla) e.sigla,u.uni_pos,e.sigla_pos
      from unnest(new.universidades) with ordinality u(uni,uni_pos)
      cross join lateral jsonb_array_elements_text(coalesce(new.ramos_por_universidad->u.uni,'[]'::jsonb)) with ordinality e(sigla,sigla_pos)
      order by e.sigla,u.uni_pos,e.sigla_pos) unico;
  end if;
  return new;
end; $$;
revoke all on function public.unir_ramos_perfil() from public,anon,authenticated;
drop trigger if exists tutor_perfiles_unir_ramos on public.tutor_perfiles;
create trigger tutor_perfiles_unir_ramos before insert or update on public.tutor_perfiles
  for each row execute function public.unir_ramos_perfil();

-- El profesor lee y edita lo suyo (las políticas propias ya lo limitan).
grant select (tipo_perfil, instagram, sitio_web, universidades, ramos_siglas, ramos_por_universidad, perfil_publico)
  on public.tutor_perfiles to authenticated;
grant update (tipo_perfil, instagram, sitio_web, universidades, ramos_siglas, ramos_por_universidad, perfil_publico)
  on public.tutor_perfiles to authenticated;

-- Lo que ve el estudiante desde un anuncio. El catálogo no conoce al autor, así
-- que se pide por anuncio, como el logo. Solo de un anuncio publicado y vigente,
-- de un profesor aprobado que activó su perfil. Nunca el user_id ni el correo:
-- los otros anuncios van por su id.
-- Se conserva la firma de entrada. Reaplicable incluso desde la salida antigua.
drop function if exists public.perfil_publico_de_anuncio(uuid);
create or replace function public.perfil_publico_de_anuncio(p_anuncio_id uuid)
returns table (nombre_publico text, presentacion text, tipo_perfil text, instagram text, sitio_web text,
               universidades text[], ramos_siglas text[], logo_path text, anuncios uuid[], ramos_por_universidad jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select p.nombre_publico, p.presentacion, p.tipo_perfil, p.instagram, p.sitio_web,
         p.universidades, p.ramos_siglas, p.logo_aprobado_path,
         array(select b.id from public.tutor_anuncios b
               where b.autor_id = p.user_id and b.estado = 'publicado'
                 and (b.vence_at is null or b.vence_at > now())
               order by b.publicado_at desc),p.ramos_por_universidad
  from public.tutor_anuncios a
  join public.tutor_perfiles p on p.user_id = a.autor_id
  where a.id = p_anuncio_id
    and a.estado = 'publicado'
    and (a.vence_at is null or a.vence_at > now())
    and p.estado = 'aprobado'
    and p.perfil_publico;
$$;
revoke all on function public.perfil_publico_de_anuncio(uuid) from public;
grant execute on function public.perfil_publico_de_anuncio(uuid) to anon, authenticated;

-- Proyecciones públicas: misma consulta y permisos que hoy, más el mapa.
drop function if exists public.directorio_perfiles(text);
create or replace function public.directorio_perfiles(p_tenant text)
returns table(id uuid,nombre_publico text,etiqueta text,categorias text[],color_tarjeta text,
  logo_path text,ramos_siglas text[],presentacion text,contacto_tipo text,contacto_valor text,
  instagram text,sitio_web text,destacado_hasta timestamptz,destacado boolean,anuncios uuid[],ramos_por_universidad jsonb)
language sql stable security definer set search_path='' as $$
  select p.directorio_id,p.nombre_publico,p.etiqueta,p.categorias,p.color_tarjeta,
    p.logo_aprobado_path,p.ramos_siglas,p.presentacion,
    p.contacto_tipo,
    case when p.contacto_tipo<>'email' then p.contacto_valor end,
    p.instagram,p.sitio_web,p.destacado_hasta,coalesce(p.destacado_hasta>now(),false),
    array(select a.id from public.tutor_anuncios a where a.autor_id=p.user_id and a.tenant=p_tenant
      and a.estado='publicado' and (a.vence_at is null or a.vence_at>now()) order by a.id),p.ramos_por_universidad
  from public.tutor_perfiles p
  where auth.uid() is not null and p.estado='aprobado' and p.en_directorio
    and p_tenant=any(p.universidades);
$$;

create or replace function public.perfil_apoyo_de_anuncio(p_anuncio_id uuid,p_tenant text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',p.directorio_id,'nombre_publico',p.nombre_publico,
    'etiqueta',p.etiqueta,'tipo_perfil',p.tipo_perfil,'presentacion',p.presentacion,
    'universidades',p.universidades,'ramos_siglas',p.ramos_siglas,'ramos_por_universidad',p.ramos_por_universidad,'logo_path',p.logo_aprobado_path,
    'instagram',p.instagram,'sitio_web',p.sitio_web,'contacto_tipo',p.contacto_tipo,
    'contacto_valor',case when p.contacto_tipo<>'email' then p.contacto_valor end,
    'anuncios',array(select a.id from public.tutor_anuncios a where a.autor_id=p.user_id
      and a.tenant=p_tenant and a.estado='publicado' and (a.vence_at is null or a.vence_at>now()) order by a.id))
  from public.tutor_perfiles p join public.tutor_anuncios a on a.autor_id=p.user_id
  where auth.uid() is not null and a.id=p_anuncio_id and a.tenant=p_tenant
    and p.estado='aprobado' and p.perfil_publico and a.estado='publicado' and (a.vence_at is null or a.vence_at>now());
$$;

revoke all on function public.directorio_perfiles(text),public.perfil_apoyo_de_anuncio(uuid,text) from public,anon;
grant execute on function public.directorio_perfiles(text),public.perfil_apoyo_de_anuncio(uuid,text) to authenticated;
grant select (ramos_por_universidad) on public.tutor_perfiles to authenticated;
grant update (ramos_por_universidad) on public.tutor_perfiles to authenticated;

-- Ficha de Admin: la versión vigente (campanas_gratis/metricas_dia_chile) más
-- universidades y ramos. Acceso con MFA intacto.
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
        'universidades', to_jsonb(p)->'universidades',
        'ramos_siglas', to_jsonb(p)->'ramos_siglas',
        'ramos_por_universidad', to_jsonb(p)->'ramos_por_universidad',
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

revoke all on function public.admin_panel_clases() from public,anon;
grant execute on function public.admin_panel_clases() to authenticated;
commit;
