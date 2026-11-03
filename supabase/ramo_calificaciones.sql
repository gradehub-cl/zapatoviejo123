-- Fase 1: opiniones cerradas de ramos. Aplicar A MANO después de profesores.sql.
-- Reaplicable; no modifica user_ramos, profesores.sql ni notas académicas.
-- No ejecutar contra producción como parte de esta PR.
begin;

-- Constante de privacidad: cinco CUENTAS distintas, no cinco semestres de una
-- persona. Es mayor que el piso de estrellas por el cruce ramo/docente/período.
create or replace function public.ramo_piso_publicacion()
returns integer language sql immutable set search_path = '' as $$ select 5; $$;

-- Propuesta de 12 etiquetas cerradas pendiente de revisión de Lucas.
create or replace function public.ramo_etiquetas_validas()
returns text[] language sql immutable set search_path = '' as $$
 select array['mucha_lectura','controles_semanales','trabajo_grupo','buen_material',
 'interesante','exigente_justo','asistencia_obligatoria','evaluaciones_frecuentes',
 'practica_aplicada','proyectos_presentaciones','discusion_clase','retroalimentacion_util']::text[];
$$;

create table if not exists public.ramo_calificaciones (
 user_id uuid not null references auth.users(id) on delete cascade,
 tenant text not null check (tenant in ('uc','fen','uai','uandes','udd')),
 ramo_clave text not null check (char_length(ramo_clave) between 1 and 200),
 seccion integer not null check (seccion between 1 and 999),
 periodo text not null check (periodo ~ '^20[0-9]{2}-[12]$'),
 carga smallint not null check (carga between 1 and 4),
 facilidad smallint not null check (facilidad between 1 and 5),
 recomienda boolean not null,
 etiquetas text[] not null default '{}'::text[] check (
  cardinality(etiquetas)<=3 and array_position(etiquetas,null) is null
  and etiquetas <@ public.ramo_etiquetas_validas()),
 actualizada timestamptz not null default now(),
 primary key (user_id,tenant,ramo_clave,periodo)
);
create index if not exists ramo_calificaciones_resumen on public.ramo_calificaciones(tenant,ramo_clave,actualizada desc);
alter table public.ramo_calificaciones enable row level security;
revoke all on public.ramo_calificaciones from public, anon, authenticated;

-- Contexto propio, actual o histórico. No se acepta tenant/clave del cliente.
-- Historial sin universidad verificable en origen o cierre no habilita opinión.
-- No usa notas, nota oficial ni promedios como autorización.
create or replace function public.ramo_calificacion_contexto(p_ramo_id text,p_seccion integer,p_periodo text)
returns table(tenant text,ramo_clave text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'sin sesión'; end if;
 if exists(select 1 from public.user_ramos u where u.user_id=auth.uid() and u.data->>'tipoCuenta'='profesor') then
  raise exception 'una cuenta de profesor no califica ramos';
 end if;
 if p_periodo is null or p_periodo !~ '^20[0-9]{2}-[12]$'
    or p_periodo>public.profesor_periodo_actual() then raise exception 'período no válido'; end if;
 return query
 with documento as (select u.data from public.user_ramos u where u.user_id=auth.uid()),
 candidatos as (
  select d.data->>'tenant' as t,r from documento d,
   jsonb_array_elements(case when jsonb_typeof(d.data->'ramos')='array' then d.data->'ramos' else '[]'::jsonb end) r
   where p_periodo=public.profesor_periodo_actual()
    and coalesce(r->'origen'->>'tenant',d.data->>'tenant')=d.data->>'tenant'
  union all
  select coalesce(r->'origen'->>'tenant',r->'cierre'->>'tenant') as t,r from documento d,
   jsonb_array_elements(case when jsonb_typeof(d.data->'historial')='array' then d.data->'historial' else '[]'::jsonb end) h,
   jsonb_array_elements(case when jsonb_typeof(h->'ramos')='array' then h->'ramos' else '[]'::jsonb end) r
   where h->>'label'=p_periodo
    and (r->'origen'->>'tenant' is null or r->'cierre'->>'tenant' is null
         or r->'origen'->>'tenant'=r->'cierre'->>'tenant')
 )
 select c.t,public.profesor_normalizar(coalesce(nullif(c.r->>'sigla',''),nullif(c.r->'origen'->>'ramoKey',''),c.r->>'nombre'))
 from candidatos c where c.r->>'id'=p_ramo_id and p_seccion between 1 and 999
  and c.r->>'seccion'=p_seccion::text and c.t in ('uc','fen','uai','uandes','udd')
 limit 1;
 if not found then raise exception 'ramo o sección no sincronizados en ese semestre'; end if;
end;
$$;

create or replace function public.ramo_calificar(p_ramo_id text,p_seccion integer,p_periodo text,
 p_carga integer,p_facilidad integer,p_recomienda boolean,p_etiquetas text[] default '{}'::text[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare c record; lista text[];
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 if p_carga is null or p_carga not between 1 and 4 or p_facilidad is null or p_facilidad not between 1 and 5
    or p_recomienda is null then raise exception 'respuestas no válidas'; end if;
 if p_etiquetas is null or cardinality(p_etiquetas)>3 or array_position(p_etiquetas,null) is not null
    or not p_etiquetas <@ public.ramo_etiquetas_validas() then raise exception 'etiquetas no válidas'; end if;
 select coalesce(array_agg(distinct e order by e),'{}'::text[]) into lista from unnest(p_etiquetas) e;
 insert into public.ramo_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,carga,facilidad,recomienda,etiquetas)
 values(auth.uid(),c.tenant,c.ramo_clave,p_seccion,p_periodo,p_carga,p_facilidad,p_recomienda,lista)
 on conflict(user_id,tenant,ramo_clave,periodo) do update set seccion=excluded.seccion,carga=excluded.carga,
 facilidad=excluded.facilidad,recomienda=excluded.recomienda,etiquetas=excluded.etiquetas,actualizada=now();
 return true;
end;
$$;

create or replace function public.ramo_calificacion_borrar(p_ramo_id text,p_seccion integer,p_periodo text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c record;
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 delete from public.ramo_calificaciones k where k.user_id=auth.uid() and k.tenant=c.tenant and k.ramo_clave=c.ramo_clave and k.periodo=p_periodo;
 return found;
end;
$$;

create or replace function public.ramo_calificacion_estado(p_ramo_id text,p_seccion integer,p_periodo text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c record; mia jsonb;
begin
 select * into strict c from public.ramo_calificacion_contexto(p_ramo_id,p_seccion,p_periodo);
 select jsonb_build_object('carga',k.carga,'facilidad',k.facilidad,'recomienda',k.recomienda,'etiquetas',k.etiquetas)
 into mia from public.ramo_calificaciones k where k.user_id=auth.uid() and k.tenant=c.tenant and k.ramo_clave=c.ramo_clave and k.periodo=p_periodo;
 return jsonb_build_object('puede_calificar',true,'mia',mia);
end;
$$;

-- Consenso INTERNO previo al filtro de ocultos: permite comprobar el piso SIN
-- respuestas de un docente oculto aunque profesor_docente_publico devuelva null.
-- Misma elección conservadora de profesores.sql: tres aportes, sin desempate
-- arbitrario ni coincidencia transitiva. Nunca es una RPC pública.
create or replace function public.ramo_docente_interno(p_tenant text,p_clave text,p_seccion integer,p_periodo text)
returns text language sql stable security definer set search_path = '' as $$
 with aportes as materialized(select a.* from public.profesor_aportes a
  where a.tenant=p_tenant and a.ramo_clave=p_clave and a.seccion=p_seccion and a.periodo=p_periodo),
 grupos as(select b.nombre,count(distinct a.user_id) as n from (select distinct nombre from aportes) b
  join aportes a on public.profesor_coinciden(b.nombre,a.nombre) group by b.nombre having count(distinct a.user_id)>=3),
 ganadores as(select * from grupos where n=(select max(n) from grupos))
 select g.nombre from ganadores g where not exists(select 1 from ganadores otro where not public.profesor_coinciden(g.nombre,otro.nombre))
 order by (select count(*) from aportes a where a.nombre=g.nombre) desc,g.nombre limit 1;
$$;

create or replace function public.ramo_resumen_publico(p_tenant text,p_ramo_clave text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare resultado jsonb; clave text:=public.profesor_normalizar(p_ramo_clave); piso integer:=public.ramo_piso_publicacion();
begin
 if auth.uid() is null then raise exception 'sin sesión'; end if;
 if p_tenant is null or p_tenant not in ('uc','fen','uai','uandes','udd') or char_length(clave) not between 1 and 200 then
  return jsonb_build_object('disponible',false); end if;
 with contextos as materialized (
  select a.seccion,a.periodo,public.ramo_docente_interno(p_tenant,clave,a.seccion,a.periodo) as docente
  from (select distinct k.seccion,k.periodo from public.ramo_calificaciones k where k.tenant=p_tenant and k.ramo_clave=clave
        union select distinct a.seccion,a.periodo from public.profesor_aportes a where a.tenant=p_tenant and a.ramo_clave=clave) a
 ),
 -- Una sola opinión por cuenta para «personas»: conserva su respuesta más
 -- reciente, aunque haya cursado y calificado el ramo en varios semestres.
 ultimas as materialized (
  select distinct on (k.user_id) k.*,
   case when a.nombre is null or public.profesor_coinciden(a.nombre,c.docente) then c.docente end as docente,
   exists(select 1 from public.profesor_ocultos o where o.tenant=k.tenant and (
    public.profesor_coinciden(o.nombre,c.docente) or public.profesor_coinciden(o.nombre,a.nombre))) as oculto
  from public.ramo_calificaciones k left join contextos c on c.seccion=k.seccion and c.periodo=k.periodo
  left join public.profesor_aportes a on a.user_id=k.user_id and a.tenant=k.tenant and a.ramo_clave=k.ramo_clave and a.seccion=k.seccion and a.periodo=k.periodo
  where k.tenant=p_tenant and k.ramo_clave=clave
   and not exists(select 1 from public.user_ramos u where u.user_id=k.user_id and u.data->>'tipoCuenta'='profesor')
  order by k.user_id,k.periodo desc,k.actualizada desc
 ),
 permiso as (select count(*) filter(where not oculto)>=piso as ok from ultimas),
 datos as materialized(select u.* from ultimas u where (select ok from permiso)),
 docentes as (
  select min(c.docente) as nombre,public.profesor_normalizar(c.docente) as normal from contextos c
  where c.docente is not null and not exists(select 1 from public.profesor_ocultos o where o.tenant=p_tenant and public.profesor_coinciden(o.nombre,c.docente))
  group by public.profesor_normalizar(c.docente)
 ),
 resumen_docentes as (
  select d.nombre,
   (select jsonb_build_object('total',count(*),'promedio',round(avg(k.estrellas),1))
    from public.profesor_calificaciones k join public.profesor_aportes a on a.user_id=k.user_id and a.tenant=k.tenant and a.ramo_clave=k.ramo_clave and a.seccion=k.seccion and a.periodo=k.periodo
    where k.tenant=p_tenant and k.ramo_clave=clave and public.profesor_coinciden(a.nombre,d.nombre) having count(*)>=3) as estrellas,
   (select jsonb_build_object('total',count(*),'facilidad',round(avg(u.facilidad),1),'carga',
     (select jsonb_agg(jsonb_build_object('opcion',g,'n',(select count(*) from datos x where not x.oculto and public.profesor_coinciden(x.docente,d.nombre) and x.carga=g)) order by g) from generate_series(1,4) g))
    from datos u where not u.oculto and public.profesor_coinciden(u.docente,d.nombre) having count(*)>=piso) as ramo
  from docentes d
 )
 select case when not (select ok from permiso) then jsonb_build_object('disponible',false)
 else jsonb_build_object('disponible',true,'total',(select count(*) from datos),
  'carga',(select jsonb_agg(jsonb_build_object('opcion',g,'n',(select count(*) from datos where carga=g)) order by g) from generate_series(1,4) g),
  'facilidad',(select round(avg(facilidad),1) from datos),
  'facilidad_distribucion',(select jsonb_agg(jsonb_build_object('opcion',g,'n',(select count(*) from datos where facilidad=g)) order by g) from generate_series(1,5) g),
  'recomiendan_de_10',(select round(avg(case when recomienda then 10 else 0 end))::integer from datos),
  'etiquetas',(select coalesce(jsonb_agg(jsonb_build_object('id',e,'n',n) order by n desc,e),'[]'::jsonb)
   from (select e,count(distinct user_id) as n from datos,unnest(etiquetas) e group by e having count(distinct user_id)>=3 order by n desc,e limit 6) t),
  'docentes',(select coalesce(jsonb_agg(jsonb_build_object('nombre',nombre,'estrellas',estrellas,'ramo',ramo) order by nombre),'[]'::jsonb) from resumen_docentes)) end into resultado;
 return resultado;
end;
$$;

revoke all on function public.ramo_piso_publicacion() from public,anon,authenticated;
revoke all on function public.ramo_etiquetas_validas() from public,anon,authenticated;
revoke all on function public.ramo_calificacion_contexto(text,integer,text) from public,anon,authenticated;
revoke all on function public.ramo_docente_interno(text,text,integer,text) from public,anon,authenticated;
revoke all on function public.ramo_calificar(text,integer,text,integer,integer,boolean,text[]) from public,anon,authenticated;
revoke all on function public.ramo_calificacion_borrar(text,integer,text) from public,anon,authenticated;
revoke all on function public.ramo_calificacion_estado(text,integer,text) from public,anon,authenticated;
revoke all on function public.ramo_resumen_publico(text,text) from public,anon,authenticated;
grant execute on function public.ramo_calificar(text,integer,text,integer,integer,boolean,text[]) to authenticated;
grant execute on function public.ramo_calificacion_borrar(text,integer,text) to authenticated;
grant execute on function public.ramo_calificacion_estado(text,integer,text) to authenticated;
grant execute on function public.ramo_resumen_publico(text,text) to authenticated;

-- Supresión de un docente (A MANO, además de la receta de profesores.sql):
-- 1. Primero elimina estas opiniones: después de borrar profesor_aportes ya no
--    se podría asociar la sección con el docente que informó su autor.
--    Ejecutar AMBOS deletes siguientes antes de la receta de profesores.sql.
-- delete from public.ramo_calificaciones k using public.profesor_aportes a
-- where a.user_id=k.user_id and a.tenant=k.tenant and a.ramo_clave=k.ramo_clave
--   and a.seccion=k.seccion and a.periodo=k.periodo and k.tenant='uc'
--   and public.profesor_coinciden(a.nombre,'Nombre Apellido');
-- Para oposición sin supresión basta profesor_ocultos; se oculta el desglose y
-- el agregado de ramo solo se publica si alcanza cinco cuentas SIN ese docente.
-- Las opiniones sin aporte propio pero asociadas por consenso también se deben
-- eliminar ANTES de profesor_aportes, usando ramo_docente_interno por sección.
-- delete from public.ramo_calificaciones k where k.tenant='uc'
-- and public.profesor_coinciden(public.ramo_docente_interno(k.tenant,k.ramo_clave,k.seccion,k.periodo),'Nombre Apellido');
-- 2. Ejecuta ahora la receta de profesores.sql, incluido profesor_ocultos.
commit;
