-- Las universidades de Chile entran con registro básico: el perfil guarda su
-- código (`usach`, `pucv`, …) aunque la app todavía no tenga su malla ni pautas.
--
-- Solo toca el perfil, que es lo único que hoy rechaza a una universidad nueva:
--   1. `universidades_basicas()`: la lista, en un solo lugar.
--   2. `codigo_universidad_perfil` se reescribe desde su definición actual en
--      producción (pg_get_functiondef) para aceptar esos códigos. Si no tiene
--      la forma esperada, se detiene todo: mejor un error que una función a medias.
--   3. `profiles_universidad_tenant_check` se vuelve a crear con lo que ya
--      aceptaba más la lista. Es un superconjunto: ninguna fila queda fuera.
--
-- No toca encuestas, clases particulares, calificaciones, banco de pautas ni
-- discrepancias: esas listas siguen con las universidades que tienen catálogo.
-- Una cuenta de registro básico simplemente no ve encuestas
-- (`encuestas_universidad()` le devuelve null).
--
-- Reaplicable. universidades_reportes.sql trae la misma lista, así que
-- reaplicarlo después no deshace esto. Va DESPUÉS de universidades_udp_unab.sql
-- y ANTES de mergear la PR que muestra estas universidades en la app.

begin;

create or replace function public.universidades_basicas()
returns text[] language sql immutable set search_path='' as $$
 select array[
  'pucv','uac','uach','uah','uahc','uantof','uautonoma','uay',
  'ubio','ubo','ubolivariana','ucen','ucm','ucn','ucsc','ucsh',
  'uct','uda','udalba','udec','udla','ufro','uft','ugm',
  'ula','ulaleones','ulrep','umag','umayor','umc','umce','unach',
  'unap','uniacc','uoh','upla','usach','usek','userena','usm',
  'uss','ust','uta','utal','utem','uv','uvm'];
$$;
revoke all on function public.universidades_basicas() from public,anon;
grant execute on function public.universidades_basicas() to authenticated;

do $$
declare
  f oid := to_regprocedure('public.codigo_universidad_perfil(text)');
  def text;
  nuevo text;
begin
  if f is null then
    raise exception 'universidades_chile: falta codigo_universidad_perfil';
  end if;
  if (select prosrc from pg_proc where oid = f) not like '%universidades_basicas%' then
    def := pg_get_functiondef(f);
    nuevo := regexp_replace(def, '(\n\s*)case valor',
      '\1if valor=any(public.universidades_basicas()) then return valor; end if;\1case valor');
    if nuevo = def then
      raise exception 'universidades_chile: codigo_universidad_perfil no tiene la forma esperada; revisar a mano';
    end if;
    execute nuevo;
  end if;

  select pg_get_constraintdef(c.oid) into def from pg_constraint c
   where c.conrelid = 'public.profiles'::regclass and c.conname = 'profiles_universidad_tenant_check';
  if def is null or def not like 'CHECK (%)' then
    raise exception 'universidades_chile: profiles_universidad_tenant_check no tiene la forma esperada; revisar a mano';
  end if;
  if def not like '%universidades_basicas%' then
    execute format(
      'alter table public.profiles drop constraint profiles_universidad_tenant_check, '
      'add constraint profiles_universidad_tenant_check check ((%s) or universidad = any (public.universidades_basicas()))',
      substring(def from 8 for length(def) - 8));
  end if;

  -- Lo de antes sigue igual y lo nuevo entra; si no, no se confirma nada.
  if public.codigo_universidad_perfil('usach') is distinct from 'usach'
     or public.codigo_universidad_perfil('U. de Chile · FEN') is distinct from 'fen' then
    raise exception 'universidades_chile: codigo_universidad_perfil no quedó como se esperaba';
  end if;
end $$;

commit;
