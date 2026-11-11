-- Aplicar manualmente después de profesor_alumnos.sql. Aditivo y reaplicable.
-- No escribe notas ni cambia los promedios de comparación existentes.
begin;
-- Dataset privado, con el mismo corte de la comparación de evaluaciones:
-- ramos activos, una media por persona/prueba; no mezcla archivos históricos.
create or replace function public.notas_comparables_panel(p_tenant text,p_sigla text,p_seccion integer default null)
returns table(user_id uuid,clave text,valor numeric,fecha text)
language sql stable set search_path='' as $$
 select u.user_id,public.clave_evaluacion(coalesce(nullif(btrim(n->>'nombre'),''),c->>'nombre')),avg((n->>'valor')::numeric),
 max(case when coalesce(n->>'fecha',c->>'fecha') ~ '^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$' then coalesce(n->>'fecha',c->>'fecha') end)
 from public.user_ramos u
 cross join lateral jsonb_array_elements(case when jsonb_typeof(u.data->'ramos')='array' then u.data->'ramos' else '[]'::jsonb end) r
 cross join lateral jsonb_array_elements(case when jsonb_typeof(r->'categorias')='array' then r->'categorias' else '[]'::jsonb end) c
 cross join lateral jsonb_array_elements(case when jsonb_typeof(c->'notas')='array' then c->'notas' else '[]'::jsonb end) n
 where u.data->>'tenant'=p_tenant and u.data->>'tipoCuenta' is distinct from 'profesor'
 and public.clave_curso_comparacion(p_tenant,r)=p_sigla and public.seccion_calza(r,p_seccion)
 and case when jsonb_typeof(n->'valor')='number' then (n->>'valor')::numeric between 1 and 7 else false end
 and public.clave_evaluacion(coalesce(nullif(btrim(n->>'nombre'),''),c->>'nombre')) is not null
 group by 1,2;
$$;
revoke all on function public.notas_comparables_panel(text,text,integer) from public,anon,authenticated;

create or replace function public.percentiles_alumno(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pa public.profesor_alumnos;datos jsonb;r jsonb;c jsonb;n jsonb;t text;s text;k text;seccion integer;ref jsonb;ref_sec jsonb;salida jsonb='[]';v numeric;todas jsonb;misma_seccion jsonb;
begin
 select * into pa from public.profesor_alumnos where id=p_id;
 if not found or auth.uid() is null or pa.tutor_id<>auth.uid() or not public.panel_alumnos_activo(auth.uid()) then raise exception 'conexión no disponible';end if;
 select data into datos from public.user_ramos where user_id=pa.alumno_id;t=datos->>'tenant';
 for r in select value from jsonb_array_elements(case when jsonb_typeof(datos->'ramos')='array' then datos->'ramos' else '[]'::jsonb end) where value->>'id'=any(pa.ramos) loop
  s=public.clave_curso_comparacion(t,r);if s is null then continue;end if;
  seccion=case when r->>'seccion' ~ '^\d{1,3}$' and (r->>'seccion')::int between 1 and 999 then (r->>'seccion')::int end;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into todas from public.notas_comparables_panel(t,s) x;
  misma_seccion='[]';if seccion is not null then select coalesce(jsonb_agg(to_jsonb(x)),'[]') into misma_seccion from public.notas_comparables_panel(t,s,seccion) x;end if;
  for c in select value from jsonb_array_elements(case when jsonb_typeof(r->'categorias')='array' then r->'categorias' else '[]'::jsonb end) loop
   for n in select value from jsonb_array_elements(case when jsonb_typeof(c->'notas')='array' then c->'notas' else '[]'::jsonb end) loop
    if jsonb_typeof(n->'valor') is distinct from 'number' or jsonb_typeof(n->'id') is distinct from 'string' then continue;end if;
    v=(n->>'valor')::numeric;if v<1 or v>7 then continue;end if;
    k=public.clave_evaluacion(coalesce(nullif(btrim(n->>'nombre'),''),c->>'nombre'));
    select case when count(*)>=5 then jsonb_build_object('personas',count(*),'percentil',round(100.0*(count(*) filter(where valor<v)+0.5*count(*) filter(where valor=v))/count(*))) end into ref from jsonb_to_recordset(todas) x(clave text,valor numeric) where clave=k;
    ref_sec=null;
    if seccion is not null then select case when count(*)>=5 then jsonb_build_object('personas',count(*),'percentil',round(100.0*(count(*) filter(where valor<v)+0.5*count(*) filter(where valor=v))/count(*))) end into ref_sec from jsonb_to_recordset(misma_seccion) x(clave text,valor numeric) where clave=k;end if;
    salida=salida||jsonb_build_array(jsonb_build_object('ramo_id',r->>'id','nota_id',n->>'id','ramo',ref,'seccion',ref_sec));
   end loop;
  end loop;
 end loop;
 return salida;
end;$$;
revoke all on function public.percentiles_alumno(uuid) from public,anon;
grant execute on function public.percentiles_alumno(uuid) to authenticated;
commit;
