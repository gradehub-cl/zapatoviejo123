-- El profesor edita su anuncio publicado y le pone descuento (Lucas, 2026-11-24).
--
-- Hasta ahora un anuncio publicado solo lo corregía GradeHub
-- (admin_editar_anuncio) y el descuento «por venir de GradeHub» con su código
-- lo fijaba solo un admin (admin_descuento_codigo_anuncio). Con esto:
--
-- 1. El profesor dueño corrige el contenido de su anuncio publicado, pausado
--    o programado sin volver a revisión. Público, ramos, universidad y tipo
--    NO se cambian acá: definen a quién se le muestra y lo que se cobra.
--    Editar no toca estado, publicado_at, campaña, medición ni cobro, así que
--    no cuenta como publicación nueva ni reinicia métricas.
-- 2. El descuento y el código los pone el profesor solo si su perfil tiene
--    descuento_propio = true. Parte apagado para todos; se habilita por
--    profesor con admin.descuento_propio_profesor (abajo). Para abrirlo a
--    todos los profesores, ver el final del archivo.
--
-- Cada cambio queda en admin.acciones con accion 'editar_anuncio_profesor'
-- (no dispara el aviso «editado por GradeHub», que mira 'editar_anuncio').
-- Requiere clases_particulares.sql, clases_pack_descuento.sql y
-- administradores.sql aplicados. Reaplicable: no cambia anuncios ni perfiles.

begin;

alter table public.tutor_perfiles add column if not exists descuento_propio boolean not null default false;
-- El profesor la lee (para saber si mostrar el descuento); nadie la escribe
-- desde el cliente: no hay grant de update sobre esta columna.
grant select (descuento_propio) on public.tutor_perfiles to authenticated;

-- Habilitar o quitar el descuento propio a un profesor, desde el SQL Editor:
--   select admin.descuento_propio_profesor('<user_id del profesor>', true);
create or replace function admin.descuento_propio_profesor(p_user_id uuid, p_permitir boolean)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update public.tutor_perfiles set descuento_propio = coalesce(p_permitir, false) where user_id = p_user_id;
  if not found then raise exception 'no existe ese profesor'; end if;
  return case when p_permitir then 'puede poner descuento' else 'sin descuento propio' end;
end;
$$;
revoke all on function admin.descuento_propio_profesor(uuid, boolean) from public, anon, authenticated;

create or replace function public.puedo_poner_descuento()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.descuento_propio from public.tutor_perfiles p
    where p.user_id = auth.uid() and p.estado = 'aprobado'), false);
$$;
revoke all on function public.puedo_poner_descuento() from public, anon;
grant execute on function public.puedo_poner_descuento() to authenticated;

create or replace function public.profesor_editar_anuncio(p_anuncio_id uuid, p_datos jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  anterior public.tutor_anuncios%rowtype;
  nuevo public.tutor_anuncios%rowtype;
  campos text[] := array['titulo','descripcion','precio_clp','pack_clases','modalidad','modalidad_otra',
    'ubicacion','ubicacion_otra','detalles','linea_datos','contacto_tipo','contacto_valor',
    'descuento_gradehub_pct','codigo_descuento'];
  cambios jsonb;
  codigo text;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'los datos deben ser un objeto';
  end if;
  if exists (select 1 from jsonb_object_keys(p_datos) k where not (k = any(campos))) then
    raise exception 'campo no permitido';
  end if;
  if not exists (select 1 from public.tutor_perfiles p where p.user_id = auth.uid() and p.estado = 'aprobado') then
    raise exception 'tu perfil de profesor no está aprobado';
  end if;
  if (p_datos ? 'descuento_gradehub_pct' or p_datos ? 'codigo_descuento') and not public.puedo_poner_descuento() then
    raise exception 'tu cuenta no puede poner descuentos';
  end if;
  select * into anterior from public.tutor_anuncios
    where id = p_anuncio_id and autor_id = auth.uid() for update;
  if not found then return false; end if;
  if anterior.estado not in ('publicado','pausado') then
    raise exception 'este anuncio no se edita desde acá';
  end if;
  nuevo := jsonb_populate_record(anterior, p_datos);
  -- El código va en mayúsculas; vacío = sin código; sin descuento no hay código.
  codigo := nullif(upper(btrim(coalesce(nuevo.codigo_descuento, ''))), '');
  if nuevo.descuento_gradehub_pct is not null and nuevo.descuento_gradehub_pct not between 1 and 50 then
    raise exception 'el descuento va de 1 a 50';
  end if;
  if codigo is not null and nuevo.descuento_gradehub_pct is null then
    raise exception 'un código necesita un descuento';
  end if;
  if codigo is not null and codigo !~ '^[A-Z0-9][A-Z0-9_-]{2,19}$' then
    raise exception 'el código usa de 3 a 20 letras, números, guion o guion bajo';
  end if;
  nuevo.codigo_descuento := codigo;
  select jsonb_object_agg(k, jsonb_build_object('antes', to_jsonb(anterior)->k, 'despues', to_jsonb(nuevo)->k))
    into cambios from unnest(campos) k
    where (to_jsonb(anterior)->k) is distinct from (to_jsonb(nuevo)->k);
  if cambios is null then return false; end if;
  -- Solo columnas de contenido: estado, publicado_at, campaña y medición quedan intactos.
  update public.tutor_anuncios set
    titulo = nuevo.titulo, descripcion = nuevo.descripcion, precio_clp = nuevo.precio_clp,
    pack_clases = nuevo.pack_clases, modalidad = nuevo.modalidad, modalidad_otra = nuevo.modalidad_otra,
    ubicacion = nuevo.ubicacion, ubicacion_otra = nuevo.ubicacion_otra, detalles = nuevo.detalles,
    linea_datos = nuevo.linea_datos, contacto_tipo = nuevo.contacto_tipo, contacto_valor = nuevo.contacto_valor,
    descuento_gradehub_pct = nuevo.descuento_gradehub_pct, codigo_descuento = nuevo.codigo_descuento
  where id = p_anuncio_id;
  insert into admin.acciones (admin_id, accion, objetivo, detalle)
  values (auth.uid(), 'editar_anuncio_profesor', p_anuncio_id, cambios);
  return true;
end;
$$;
revoke all on function public.profesor_editar_anuncio(uuid, jsonb) from public, anon;
grant execute on function public.profesor_editar_anuncio(uuid, jsonb) to authenticated;

commit;

-- ABRIRLO A TODOS LOS PROFESORES (solo si Lucas lo decide; una vez):
--   alter table public.tutor_perfiles alter column descuento_propio set default true;
--   update public.tutor_perfiles set descuento_propio = true;
