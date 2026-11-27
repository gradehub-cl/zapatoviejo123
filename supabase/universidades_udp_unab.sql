-- UDP y UNAB entran como universidades (tenants `udp` y `unab`).
--
-- Producción guarda la lista de universidades en checks de tabla y en
-- funciones. `create table if not exists` no cambia un check que ya existe, y
-- reaplicar los archivos de origen uno por uno podría devolver una versión
-- vieja de una función que hoy vive en otro archivo. Por eso este archivo
-- parte de lo que HAY en producción:
--
--   1. Cada check de `public` que nombra 'udd' y todavía no nombra 'udp' se
--      vuelve a crear con el mismo nombre, sumando 'udp' y 'unab'. Es un
--      superconjunto: ninguna fila existente queda fuera.
--   2. Las diez funciones con la lista escrita se reescriben desde su propia
--      definición actual (pg_get_functiondef), cambiando solo la lista.
--      Si una no tiene el patrón esperado, se detiene todo: mejor un error
--      que una función a medias.
--
-- Reaplicable: lo que ya tiene 'udp' se salta. Los archivos de origen
-- (profesores.sql, encuestas.sql, ramo_calificaciones.sql, …) ya traen las
-- listas nuevas, así que reaplicarlos después no deshace esto.
--
-- Va ANTES de mergear la PR que muestra UDP o UNAB en la app: sin esto, el
-- perfil de una cuenta UDP no se guarda (profiles_universidad_tenant_check).

begin;

do $$
declare
  r record;
  def text;
  nuevo text;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public' and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%''udd''::text%'
      and pg_get_constraintdef(c.oid) not like '%''udp''::text%'
  loop
    nuevo := replace(r.def, '''udd''::text', '''udd''::text, ''udp''::text, ''unab''::text');
    execute format('alter table %s drop constraint %I, add constraint %I %s',
                   r.tabla, r.conname, r.conname, nuevo);
  end loop;

  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'admin_crear_encuesta', 'amigos_username_reservado', 'clave_curso_comparacion',
        'codigo_universidad_perfil', 'encuestas_universidad', 'profesor_contexto',
        'ramo_calificacion_contexto', 'ramo_resumen_publico',
        'ramos_por_universidad_validos', 'registrar_discrepancia_nota'])
      and p.prosrc like '%''udd''%'
      and p.prosrc not like '%''udp''%'
  loop
    def := pg_get_functiondef(r.oid);
    nuevo := def;
    nuevo := replace(nuevo, '''uandes'',''udd''', '''uandes'',''udd'',''udp'',''unab''');
    nuevo := replace(nuevo, '''uandes'', ''udd''', '''uandes'', ''udd'', ''udp'', ''unab''');
    nuevo := replace(nuevo, '''udd'',''uandes'',''uchile''', '''udd'',''udp'',''unab'',''uandes'',''uchile''');
    nuevo := replace(nuevo,
      'when ''udd'',''u. del desarrollo'' then return ''udd'';',
      'when ''udd'',''u. del desarrollo'' then return ''udd'';'
      || ' when ''udp'',''u. diego portales'' then return ''udp'';'
      || ' when ''unab'',''u. andrés bello'' then return ''unab'';');
    nuevo := replace(nuevo,
      'when ''udd'' then ''udd''',
      'when ''udd'' then ''udd'' when ''udp'' then ''udp'' when ''unab'' then ''unab''');
    if nuevo = def then
      raise exception 'universidades_udp_unab: % no tiene la lista esperada; revisar a mano', r.proname;
    end if;
    execute nuevo;
  end loop;
end $$;

-- Lo que quede con 'udd' y sin 'udp' es una lista que este archivo no conoce.
do $$
declare faltan text;
begin
  select string_agg(x, ', ') into faltan from (
    select c.conrelid::regclass::text || '.' || c.conname as x
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public' and pg_get_constraintdef(c.oid) like '%''udd''::text%'
      and pg_get_constraintdef(c.oid) not like '%''udp''::text%'
    union all
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%''udd''%' and p.prosrc not like '%''udp''%'
  ) s;
  if faltan is not null then
    raise notice 'universidades_udp_unab: siguen sin udp/unab: %', faltan;
  end if;
end $$;

commit;
