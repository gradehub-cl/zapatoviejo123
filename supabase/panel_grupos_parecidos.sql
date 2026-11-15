-- Aplicar manualmente DESPUÉS de #976 (profesor_alumnos.sql) y #1000
-- (panel_percentiles.sql). Reaplicable. No escribe notas del alumno.
begin;
create or replace function public.grupos_parecidos_profesor(p_id uuid,p_ramo text,p_nota_base text,p_min numeric,p_max numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pa public.profesor_alumnos;con public.profesor_alumnos;datos jsonb;r jsonb;al_r jsonb;inv jsonb;e jsonb;t text;s text;k text;f text;inicio text;
 todas jsonb;preparadas jsonb='[]';resultado jsonb;
begin
 select * into pa from public.profesor_alumnos where id=p_id;
 if not found or auth.uid() is null or pa.tutor_id<>auth.uid() or not public.panel_alumnos_activo(auth.uid()) then raise exception 'conexión no disponible';end if;
 if p_min is null or p_max is null or p_min<1 or p_max>7 or p_min>p_max then raise exception 'rango inválido';end if;
 select data into datos from public.user_ramos where user_id=pa.alumno_id;t=datos->>'tenant';
 select value into r from jsonb_array_elements(case when jsonb_typeof(datos->'ramos')='array' then datos->'ramos' else '[]'::jsonb end) where value->>'id'=p_ramo and value->>'id'=any(pa.ramos);
 if r is null then raise exception 'ramo no compartido';end if;
 s=public.clave_curso_comparacion(t,r);
 inv=public.preparacion_alumno(pa.id,p_ramo)->'ramos'->0;
 if (select count(*) from jsonb_array_elements(inv->'evaluaciones') where value->>'nota_id'=p_nota_base)<>1 then raise exception 'evaluación de partida ambigua o no disponible';end if;
 select value into e from jsonb_array_elements(inv->'evaluaciones') where value->>'nota_id'=p_nota_base and jsonb_typeof(value->'nota')='number' and not coalesce((value->>'ambigua')::boolean,false);
 if e is null then raise exception 'evaluación de partida no disponible';end if;
 k=public.clave_evaluacion(e->>'nombre');
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into todas from public.notas_comparables_panel(t,s) x;
 -- Lee solo conexiones del llamante y liga futuras con la misma regla de #976.
 for con in select * from public.profesor_alumnos where tutor_id=auth.uid() order by id loop
  select data into datos from public.user_ramos where user_id=con.alumno_id;
  if datos->>'tenant' is distinct from t then continue;end if;
  select x.fecha into f from jsonb_to_recordset(todas) x(user_id uuid,clave text,valor numeric,fecha text) where x.user_id=con.alumno_id and x.clave=k and x.valor between p_min and p_max;
  if f is null then continue;end if;
  for al_r in select value from jsonb_array_elements(case when jsonb_typeof(datos->'ramos')='array' then datos->'ramos' else '[]'::jsonb end) where value->>'id'=any(con.ramos) and public.clave_curso_comparacion(t,value)=s loop
   inv=public.preparacion_alumno(con.id,al_r->>'id')->'ramos'->0;
   inicio=coalesce(con.inicio_ramos->>(al_r->>'id'),con.inicio_clases::text,(con.created_at at time zone 'America/Santiago')::date::text);
   for e in select value from jsonb_array_elements(inv->'evaluaciones') where jsonb_typeof(value->'nota')='number' and value->>'fecha'>f and value->>'nota_id' is not null and not coalesce((value->>'ambigua')::boolean,false) loop
    if (inv->'manual'='true'::jsonb and exists(select 1 from jsonb_array_elements(inv->'marcas') m where m->>'nota_id'=e->>'nota_id' and not coalesce((m->>'huerfana')::boolean,false))) or (inv->'manual'='false'::jsonb and e->>'fecha'>=inicio) then
     preparadas=preparadas||jsonb_build_array(jsonb_build_object('user_id',con.alumno_id,'clave',public.clave_evaluacion(e->>'nombre'),'metodo',case when inv->'manual'='true'::jsonb then 'manual' else 'fecha' end));
    end if;
   end loop;
  end loop;
 end loop;
 with notas as (
  select x.*,100.0*(rank() over(partition by clave order by valor)-1+0.5*count(*) over(partition by clave,valor))/count(*) over(partition by clave) percentil
  from jsonb_to_recordset(todas) x(user_id uuid,clave text,valor numeric,fecha text)
 ), base as (select * from notas where clave=k and valor between p_min and p_max and fecha is not null),
 posteriores as (
  select n.*,b.valor inicial,b.percentil percentil_inicial,
  exists(select 1 from jsonb_to_recordset(preparadas) m(user_id uuid,clave text) where m.user_id=n.user_id and m.clave=n.clave) preparada,
  not exists(select 1 from public.profesor_alumnos a where a.tutor_id=auth.uid() and a.alumno_id=n.user_id) control
  from notas n join base b using(user_id) where n.clave<>k and n.fecha>b.fecha
 ), comunes as (
  select clave from posteriores group by clave having count(distinct user_id) filter(where control)>=5 and bool_or(preparada)
 ), finales as (
  select user_id,case when preparada then 'propios' else 'gradehub' end grupo,
   avg(valor) posterior,min(inicial) inicial,avg(percentil) percentil_posterior,min(percentil_inicial) percentil_inicial
  from posteriores where clave in(select clave from comunes) and (preparada or control) group by 1,2
 ), resumen as (
  select grupo,count(*) n,round(avg(inicial),2) inicial,round(avg(posterior),2) posterior,round(avg(posterior-inicial),2) cambio,
   round(avg(percentil_inicial),1) percentil_inicial,round(avg(percentil_posterior),1) percentil_posterior,round(avg(percentil_posterior-percentil_inicial),1) cambio_percentil
  from finales group by grupo having grupo='propios' or count(*)>=5
 ) select jsonb_object_agg(grupo,to_jsonb(resumen)-'grupo') into resultado from resumen;
 if resultado->'gradehub' is null or resultado->'propios' is null then return jsonb_build_object('disponible',false);end if;
 return resultado||jsonb_build_object('disponible',true,'metodos',(select jsonb_agg(distinct value->>'metodo') from jsonb_array_elements(preparadas)));
end;$$;
revoke all on function public.grupos_parecidos_profesor(uuid,text,text,numeric,numeric) from public,anon;
grant execute on function public.grupos_parecidos_profesor(uuid,text,text,numeric,numeric) to authenticated;
commit;
