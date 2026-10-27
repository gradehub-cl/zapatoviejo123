-- sql-produccion: manual (una sola vez, en el SQL Editor; el workflow nunca lo aplica solo)
-- Restos de #445 (pestaña Profes con reseñas), que nunca se mergeó pero cuyo SQL
-- quedó aplicado en producción: cinco tablas vacías y funciones ejecutables
-- incluso por anon. Nada en main las usa; las reemplazan profesor_aportes y
-- profesor_calificaciones (supabase/profesores.sql).
-- Una sola vez, a mano. Aborta sin tocar nada si alguna tabla tiene filas.
-- No toca profesor_por_codigo ni profesor_alumnos (panel de alumnos).
begin;

do $$
declare t text; n bigint;
begin
  foreach t in array array['profesores','profesor_menciones','profesor_asociaciones',
    'profesor_resenas','profesor_resena_reportes'] loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then raise exception 'public.% tiene % filas: no se borra nada', t, n; end if;
    end if;
  end loop;
end $$;

drop function if exists public.profesor_detalle(uuid);
drop function if exists public.profesor_ramo_estado(text,text,integer,text);
drop function if exists public.profesor_reconciliar(text,text,integer,text);
drop function if exists public.profesor_reportar(text,text,text,integer,text,text);
drop function if exists public.profesor_resena_eliminar(uuid);
drop function if exists public.profesor_resena_guardar(uuid,integer,text);
drop function if exists public.profesor_resena_reportar(uuid,text);
drop function if exists public.profesores_listar(text,text);
drop table if exists public.profesor_resena_reportes, public.profesor_resenas,
  public.profesor_asociaciones, public.profesor_menciones, public.profesores;
drop function if exists public.profesor_mencion_borrada_reconciliar();
drop function if exists public.profesor_texto_limpio(text,integer);
drop function if exists public.profesor_nombres_coinciden(text,text);
drop function if exists public.profesor_nombre_normalizar(text);

commit;
