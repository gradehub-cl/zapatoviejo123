-- Calificar ramo y profesor, ronda 2 (Lucas, 2026-11-18). Aplicar A MANO
-- después de profesores.sql y ramo_calificaciones.sql. Reaplicable.
--
-- 1. Ramo: etiquetas escritas («Otro», columna `otros`) con el mismo filtro de
--    texto que las del profesor. La pregunta de horas a la semana deja de
--    hacerse: `carga` NO se borra ni se reinterpreta, las respuestas guardadas
--    se conservan y siguen en el resumen, y quien edita una opinión antigua
--    mantiene su `carga`. Las opiniones nuevas la guardan vacía.
-- 2. Etiquetas sugeridas para ramo y profesor: cuáles se eligen más en ese
--    ramo (o con ese profesor). Solo salen ids y textos, nunca conteos ni quién.
--
-- El cliente funciona antes y después de aplicar esto: sin `version: 2` en
-- ramo_calificacion_estado sigue con el formulario anterior, y sin las RPC de
-- sugeridas usa la lista fija.
begin;

-- ─── Ramo: columnas nuevas ──────────────────────────────────────────────────
alter table public.ramo_calificaciones add column if not exists otros text[] not null default '{}'::text[];
-- Las opiniones nuevas ya no traen horas: la columna queda opcional.
alter table public.ramo_calificaciones alter column carga drop not null;
alter table public.ramo_calificaciones drop constraint if exists ramo_calificaciones_otros_check;
alter table public.ramo_calificaciones add constraint ramo_calificaciones_otros_check
 check (public.profesor_otros_permitidos(otros) and cardinality(etiquetas)+cardinality(otros)<=3);

-- Normaliza las etiquetas escritas: espacios de más fuera y la misma (sin
-- tildes ni mayúsculas) cuenta una. Interna.
create or replace function public.calificacion_escritas(p_otros text[])
returns text[] language sql immutable set search_path = '' as $$
 select coalesce(array(select t from (
   select distinct on (public.profesor_normalizar(t)) t,i
   from unnest(coalesce(p_otros,'{}'::text[])) with ordinality u(x,i),
    lateral (select nullif(btrim(regexp_replace(coalesce(x,''),'[[:space:]]+',' ','g')),'') as t) n
   where t is not null order by public.profesor_normalizar(t),i) d order by i),'{}'::text[]);
$$;

-- Guardar con el formulario nuevo. Todas las preguntas son obligatorias salvo
-- asistencia (null = no sé) y las etiquetas. Sin horas: `carga` queda vacía en
-- una opinión nueva y se conserva en una antigua.
drop function if exists public.ramo_opinar(text,integer,text,integer,boolean,integer,boolean,text[],text[]);
create or replace function public.ramo_opinar(p_ramo_id text,p_seccion integer,p_periodo text,
 p_facilidad integer,p_asistencia boolean,p_recomienda boolean,
 p_etiquetas text[] default '{}'::text[],p_otros text[] default '{}'::text[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare c record; lista text[]; escritas text[];
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 if p_facilidad is null or p_facilidad not between 1 and 5 or p_recomienda is null then raise exception 'respuestas no válidas'; end if;
 if p_etiquetas is null or array_position(p_etiquetas,null) is not null
    or not p_etiquetas <@ public.ramo_etiquetas_validas() then raise exception 'etiquetas no válidas'; end if;
 select coalesce(array_agg(distinct e order by e),'{}'::text[]) into lista from unnest(p_etiquetas) e;
 escritas:=public.calificacion_escritas(p_otros);
 if cardinality(lista)+cardinality(escritas)>3 then raise exception 'etiquetas no válidas'; end if;
 if not coalesce((select bool_and(public.profesor_texto_permitido(t)) from unnest(escritas) t),true) then
  raise exception 'texto no permitido'; end if;
 insert into public.ramo_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,carga,facilidad,asistencia,recomienda,etiquetas,otros)
 values(auth.uid(),c.tenant,c.ramo_clave,p_seccion,p_periodo,null,p_facilidad,p_asistencia,p_recomienda,lista,escritas)
 -- `carga` no está en el SET: una opinión antigua conserva sus horas.
 on conflict(user_id,tenant,ramo_clave,periodo) do update set seccion=excluded.seccion,
 facilidad=excluded.facilidad,asistencia=excluded.asistencia,recomienda=excluded.recomienda,
 etiquetas=excluded.etiquetas,otros=excluded.otros,actualizada=now();
 return true;
exception when check_violation then raise exception 'etiquetas no válidas';
end;
$$;

-- El formulario anterior (app sin actualizar) sigue guardando. Si con sus
-- etiquetas se pasaría de tres contando las escritas, las escritas se quitan.
create or replace function public.ramo_calificar(p_ramo_id text,p_seccion integer,p_periodo text,
 p_carga integer,p_facilidad integer,p_asistencia boolean,p_recomienda boolean,
 p_etiquetas text[] default '{}'::text[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare c record; lista text[];
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 if p_carga is null or p_carga not between 1 and 4 or p_facilidad is null or p_facilidad not between 1 and 5
    or p_recomienda is null then raise exception 'respuestas no válidas'; end if;
 if p_etiquetas is null or cardinality(p_etiquetas)>3 or array_position(p_etiquetas,null) is not null
    or not p_etiquetas <@ public.ramo_etiquetas_validas() then raise exception 'etiquetas no válidas'; end if;
 select coalesce(array_agg(distinct e order by e),'{}'::text[]) into lista from unnest(p_etiquetas) e;
 insert into public.ramo_calificaciones as k(user_id,tenant,ramo_clave,seccion,periodo,carga,facilidad,asistencia,recomienda,etiquetas)
 values(auth.uid(),c.tenant,c.ramo_clave,p_seccion,p_periodo,p_carga,p_facilidad,p_asistencia,p_recomienda,lista)
 on conflict(user_id,tenant,ramo_clave,periodo) do update set seccion=excluded.seccion,carga=excluded.carga,
 facilidad=excluded.facilidad,asistencia=excluded.asistencia,
 recomienda=excluded.recomienda,etiquetas=excluded.etiquetas,
 otros=case when cardinality(excluded.etiquetas)+cardinality(k.otros)>3 then '{}'::text[] else k.otros end,actualizada=now();
 return true;
end;
$$;

-- `version: 2` le dice al cliente que puede mostrar el formulario nuevo.
create or replace function public.ramo_calificacion_estado(p_ramo_id text,p_seccion integer,p_periodo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c record; mia jsonb;
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 select jsonb_build_object('carga',k.carga,'facilidad',k.facilidad,'asistencia',k.asistencia,
  'recomienda',k.recomienda,'etiquetas',k.etiquetas,'otros',k.otros)
 into mia from public.ramo_calificaciones k where k.user_id=auth.uid() and k.tenant=c.tenant and k.ramo_clave=c.ramo_clave and k.periodo=p_periodo;
 return jsonb_build_object('puede_calificar',true,'mia',mia,'version',2);
end;
$$;

-- Resumen: lo mismo de antes más las etiquetas escritas que repiten tres
-- cuentas o más.
create or replace function public.ramo_resumen_bloque(p_filas jsonb)
returns jsonb language sql stable set search_path = '' as $$
 with f as materialized (
  select x->>'user_id' as u,(x->>'carga')::int as carga,(x->>'facilidad')::int as facilidad,
   (x->>'asistencia')::boolean as asistencia,
   (x->>'recomienda')::boolean as recomienda,
   case when jsonb_typeof(x->'etiquetas')='array' then x->'etiquetas' else '[]'::jsonb end as etiquetas,
   case when jsonb_typeof(x->'otros')='array' then x->'otros' else '[]'::jsonb end as otros
  from jsonb_array_elements(case when jsonb_typeof(p_filas)='array' then p_filas else '[]'::jsonb end) x
 )
 select case when (select count(distinct u) from f)<public.ramo_piso_publicacion() then null else jsonb_build_object(
  'total',(select count(*) from f),
  'carga',(select jsonb_agg(jsonb_build_object('opcion',g,'n',(select count(*) from f where carga=g)) order by g) from generate_series(1,4) g),
  'facilidad',(select round(avg(facilidad),1) from f),
  'facilidad_distribucion',(select jsonb_agg(jsonb_build_object('opcion',g,'n',(select count(*) from f where facilidad=g)) order by g) from generate_series(1,5) g),
  'asistencia',jsonb_build_object('si',(select count(*) from f where asistencia),'no',(select count(*) from f where asistencia=false)),
  'recomiendan_de_10',(select round(avg(case when recomienda then 10 else 0 end))::integer from f),
  'etiquetas',(select coalesce(jsonb_agg(jsonb_build_object('id',e,'n',n) order by n desc,e),'[]'::jsonb)
   from (select e,count(distinct f.u) as n from f,jsonb_array_elements_text(f.etiquetas) e
         group by e having count(distinct f.u)>=3 order by n desc,e limit 6) t),
  'escritas',(select coalesce(jsonb_agg(jsonb_build_object('texto',texto,'n',n) order by n desc,normal),'[]'::jsonb)
   from (select public.profesor_normalizar(t) as normal,mode() within group (order by t) as texto,count(distinct f.u) as n
         from f,jsonb_array_elements_text(f.otros) t group by 1 having count(distinct f.u)>=3 order by n desc,1 limit 3) t)
 ) end;
$$;

-- ─── Etiquetas sugeridas ────────────────────────────────────────────────────
-- Con pocos datos no hay sugerencias: el cliente usa la lista fija. Con datos:
--  orden:   etiquetas de la lista que eligen al menos `minimo` cuentas, de la
--           más elegida a la menos (sin conteos).
--  sin_uso: con `ocultar_desde` cuentas o más, las de la lista que nadie eligió.
--  propias: textos escritos que repiten tres cuentas o más (sin quién).
-- Interna: recibe filas {u, etiquetas, otros} ya filtradas por contexto.
create or replace function public.calificacion_sugeridas(p_filas jsonb,p_validas text[],p_piso integer,p_minimo integer,p_ocultar_desde integer)
returns jsonb language sql stable set search_path = '' as $$
 with f as materialized (
  select x->>'u' as u,
   case when jsonb_typeof(x->'etiquetas')='array' then x->'etiquetas' else '[]'::jsonb end as etiquetas,
   case when jsonb_typeof(x->'otros')='array' then x->'otros' else '[]'::jsonb end as otros
  from jsonb_array_elements(case when jsonb_typeof(p_filas)='array' then p_filas else '[]'::jsonb end) x
 ), total as (select count(distinct u) as n from f),
 conteo as (select v as e,(select count(distinct f.u) from f,jsonb_array_elements_text(f.etiquetas) x where x=v) as n
  from unnest(p_validas) with ordinality t(v,i))
 select case when (select n from total)<p_piso then jsonb_build_object('disponible',false) else jsonb_build_object(
  'disponible',true,
  'orden',(select coalesce(jsonb_agg(e order by n desc,array_position(p_validas,e)),'[]'::jsonb) from conteo where n>=p_minimo),
  'sin_uso',case when (select n from total)>=p_ocultar_desde
   then (select coalesce(jsonb_agg(e order by array_position(p_validas,e)),'[]'::jsonb) from conteo where n=0) else '[]'::jsonb end,
  'propias',(select coalesce(jsonb_agg(texto order by n desc,normal),'[]'::jsonb) from (
   select public.profesor_normalizar(t) as normal,mode() within group (order by t) as texto,count(distinct f.u) as n
   from f,jsonb_array_elements_text(f.otros) t group by 1 having count(distinct f.u)>=3 order by n desc,1 limit 4) p)
 ) end;
$$;

-- Ramo: todas las opiniones del ramo (cualquier sección y semestre), una por
-- cuenta, sin cuentas de profesor. Piso de publicación del ramo (cinco).
create or replace function public.ramo_etiquetas_sugeridas(p_ramo_id text,p_seccion integer,p_periodo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c record;
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 return public.calificacion_sugeridas((select coalesce(jsonb_agg(jsonb_build_object('u',k.user_id,'etiquetas',k.etiquetas,'otros',k.otros)),'[]'::jsonb)
  from (select distinct on (k.user_id) k.* from public.ramo_calificaciones k
   where k.tenant=c.tenant and k.ramo_clave=c.ramo_clave
    and not exists(select 1 from public.user_ramos u where u.user_id=k.user_id and u.data->>'tipoCuenta'='profesor')
   order by k.user_id,k.periodo desc,k.actualizada desc) k),
  public.ramo_etiquetas_validas(),public.ramo_piso_publicacion(),3,10);
end;
$$;

-- Profesor: las calificaciones del mismo docente en este ramo (el que publica el
-- consenso de tu sección o, sin consenso, el que informaste). Un docente oculto
-- no tiene sugerencias. Piso de tres, como el promedio de estrellas.
create or replace function public.profesor_etiquetas_sugeridas(p_ramo_id text,p_seccion integer,p_periodo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c record; d text;
begin
 select * into strict c from public.profesor_contexto(p_ramo_id,p_seccion);
 d:=public.profesor_docente_publico(c.tenant,c.ramo_clave,p_seccion,p_periodo);
 if d is null then
  select a.nombre into d from public.profesor_aportes a
   where a.user_id=auth.uid() and a.tenant=c.tenant and a.ramo_clave=c.ramo_clave
    and a.seccion=p_seccion and a.periodo=p_periodo
    and not exists(select 1 from public.profesor_ocultos o where o.tenant=c.tenant and public.profesor_coinciden(o.nombre,a.nombre));
 end if;
 if d is null then return jsonb_build_object('disponible',false); end if;
 return public.calificacion_sugeridas((select coalesce(jsonb_agg(jsonb_build_object('u',k.user_id,'etiquetas',k.etiquetas,'otros',k.otros)),'[]'::jsonb)
  from public.profesor_calificaciones k join public.profesor_aportes a on a.user_id=k.user_id and a.tenant=k.tenant
   and a.ramo_clave=k.ramo_clave and a.seccion=k.seccion and a.periodo=k.periodo
  where k.tenant=c.tenant and k.ramo_clave=c.ramo_clave and public.profesor_coinciden_en_ramo(k.tenant,k.ramo_clave,a.nombre,d)),
  public.profesor_etiquetas_validas(),3,2,10);
end;
$$;

revoke all on function public.calificacion_escritas(text[]) from public,anon,authenticated;
revoke all on function public.calificacion_sugeridas(jsonb,text[],integer,integer,integer) from public,anon,authenticated;
revoke all on function public.ramo_resumen_bloque(jsonb) from public,anon,authenticated;
revoke all on function public.ramo_opinar(text,integer,text,integer,boolean,boolean,text[],text[]) from public,anon,authenticated;
revoke all on function public.ramo_calificar(text,integer,text,integer,integer,boolean,boolean,text[]) from public,anon,authenticated;
revoke all on function public.ramo_calificacion_estado(text,integer,text) from public,anon,authenticated;
revoke all on function public.ramo_etiquetas_sugeridas(text,integer,text) from public,anon,authenticated;
revoke all on function public.profesor_etiquetas_sugeridas(text,integer,text) from public,anon,authenticated;
grant execute on function public.ramo_opinar(text,integer,text,integer,boolean,boolean,text[],text[]) to authenticated;
grant execute on function public.ramo_calificar(text,integer,text,integer,integer,boolean,boolean,text[]) to authenticated;
grant execute on function public.ramo_calificacion_estado(text,integer,text) to authenticated;
grant execute on function public.ramo_etiquetas_sugeridas(text,integer,text) to authenticated;
grant execute on function public.profesor_etiquetas_sugeridas(text,integer,text) to authenticated;
commit;
