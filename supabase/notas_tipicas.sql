-- Fase 1, manual y reaplicable. NO APLICAR antes de que Lucas apruebe y
-- publique el texto de privacidad.html propuesto en esta PR: este archivo
-- activa captura de notas individuales privadas al sincronizar user_ramos.
-- Requiere profesor_alumnos.sql (clave_curso_comparacion / clave_evaluacion).
-- No cambia el cierre, user_ramos.data, gradehub_v1, motor ni notas sombra.
begin;

create or replace function public.notas_tipicas_piso()
returns integer language sql immutable set search_path='' as $$
 -- Cinco PERSONAS distintas por evaluación, no cinco filas/semestres.
 select 5;
$$;
create or replace function public.notas_tipicas_periodo_actual()
returns text language sql stable set search_path='' as $$
 select case when extract(month from d)<=2 then (extract(year from d)::int-1)::text||'-2'
 when extract(month from d)<=7 then extract(year from d)::int::text||'-1'
 else extract(year from d)::int::text||'-2' end
 from (select now() at time zone 'America/Santiago' as d) fecha;
$$;
create or replace function public.notas_tipicas_en_escala(p_tenant text,p_nota numeric)
returns boolean language sql immutable set search_path='' as $$
 -- Mismos límites actuales de GH_REGLAS_NOTA_POR_TENANT/base. El test compara
 -- con el motor; una futura escala nueva exige actualizar este dato también.
 select exists(select 1 from (values('uc',1,7),('fen',1,7),('uai',1,7),('uandes',1,7),('udd',1,7)) e(tenant,minimo,maximo)
 where e.tenant=p_tenant and p_nota between e.minimo and e.maximo);
$$;
create table if not exists public.evaluacion_notas(
 user_id uuid not null references auth.users(id) on delete cascade,
 tenant text not null,periodo text not null check(periodo ~ '^20[0-9]{2}-[12]$'),
 ramo_clave text not null check(length(ramo_clave)>0),
 evaluacion_clave text not null check(length(evaluacion_clave)>0),
 nota numeric not null check(public.notas_tipicas_en_escala(tenant,nota)),
 actualizada timestamptz not null default now(),
 primary key(user_id,tenant,periodo,ramo_clave,evaluacion_clave)
);
create index if not exists evaluacion_notas_ramo on public.evaluacion_notas(tenant,ramo_clave,evaluacion_clave);
alter table public.evaluacion_notas enable row level security;
revoke all on public.evaluacion_notas from public,anon,authenticated;

-- Los ejemplos del panel no se sincronizan. Para cuentas de prueba con sesión,
-- Lucas debe aprobar y poner raw_app_meta_data.gradehub_datos_sinteticos=true
-- ANTES de aplicar la carga inicial. Es metadato administrativo de Auth, no
-- user_metadata editable ni un campo nuevo de gradehub_v1. No se infiere por
-- nombre/correo ni se leen otros datos de Auth para tomar esa decisión.
create or replace function public.notas_tipicas_participa(p_usuario uuid,p_datos jsonb)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(p_datos->>'tipoCuenta','estudiante') not in ('profesor','demo','sintetica')
 and exists(select 1 from auth.users u where u.id=p_usuario
  and not coalesce(u.is_anonymous,false)
  and coalesce(u.raw_app_meta_data->>'gradehub_datos_sinteticos','false')<>'true');
$$;

-- Mismo recorrido que comparacion_ramo_profesor: ramos -> categorias -> notas,
-- nombre de casilla si existe, categoría solo como fallback de NOMBRE. Nunca
-- c.valor, avgOverride, notaOficial, propuestas ni un promedio de categoría.
-- La reducción de nombres duplicados por persona también coincide con el panel.
create or replace function public.notas_tipicas_extraer(p_tenant text,p_ramos jsonb)
returns table(ramo_clave text,evaluacion_clave text,nota numeric)
language sql stable set search_path='' as $$
 with hojas as materialized(
  select public.clave_curso_comparacion(p_tenant,r) as ramo,
   public.clave_evaluacion(coalesce(nullif(btrim(n->>'nombre'),''),c->>'nombre')) as evaluacion,
   case when jsonb_typeof(n->'valor')='number' then (n->>'valor')::numeric end as valor
  from jsonb_array_elements(case when jsonb_typeof(p_ramos)='array' then p_ramos else '[]'::jsonb end) r
  cross join lateral jsonb_array_elements(case when jsonb_typeof(r->'categorias')='array' then r->'categorias' else '[]'::jsonb end) c
  cross join lateral jsonb_array_elements(case when jsonb_typeof(c->'notas')='array' then c->'notas' else '[]'::jsonb end) n
  where coalesce(r#>>'{origen,tenant}',p_tenant)=p_tenant
   and coalesce(n->>'id','') not like 'sombra:%'
   and coalesce(n->>'sombra','false')<>'true' and coalesce(n->>'simulada','false')<>'true'
   and coalesce(n->>'propuesta','false')<>'true'
 ) select ramo,evaluacion,avg(valor) from hojas
 where ramo is not null and evaluacion is not null and public.notas_tipicas_en_escala(p_tenant,valor)
 group by ramo,evaluacion;
$$;

-- Parámetros privados para probar el reloj y la carga inicial sin abrir una
-- RPC que permita enviar calificaciones arbitrarias o de otra persona.
create or replace function public.notas_tipicas_capturar(p_usuario uuid,p_datos jsonb,p_anteriores jsonb,p_periodo text,p_conservar_ausentes boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare archivados jsonb; fuentes jsonb; notas jsonb; viejos jsonb;
begin
 if p_periodo is null or p_periodo !~ '^20[0-9]{2}-[12]$' then raise exception 'período inválido';end if;
 if p_datos is null then
  if not p_conservar_ausentes then delete from public.evaluacion_notas where user_id=p_usuario and periodo=p_periodo;end if;return;
 end if;
 if not public.notas_tipicas_participa(p_usuario,p_datos) then
  delete from public.evaluacion_notas where user_id=p_usuario;return;
 end if;
 -- Un historial sin tenant verificable NO se atribuye a la universidad actual.
 select coalesce(jsonb_agg(jsonb_build_object('tenant',coalesce(r#>>'{cierre,tenant}',r#>>'{origen,tenant}'),'ramo',r)),'[]'::jsonb)
 into archivados
 from jsonb_array_elements(case when jsonb_typeof(p_datos->'historial')='array' then p_datos->'historial' else '[]'::jsonb end) h
 cross join lateral jsonb_array_elements(case when jsonb_typeof(h->'ramos')='array' then h->'ramos' else '[]'::jsonb end) r
 where h->>'label'=p_periodo and coalesce(r#>>'{cierre,tenant}',r#>>'{origen,tenant}') is not null
  and (r#>>'{cierre,tenant}' is null or r#>>'{origen,tenant}' is null or r#>>'{cierre,tenant}'=r#>>'{origen,tenant}');
 fuentes=jsonb_build_array(jsonb_build_object('tenant',p_datos->>'tenant','ramos',p_datos->'ramos','prioridad',3));
 select fuentes||coalesce(jsonb_agg(jsonb_build_object('tenant',a->>'tenant','ramos',jsonb_build_array(a->'ramo'),'prioridad',2)),'[]'::jsonb)
 into fuentes from jsonb_array_elements(archivados) a;
 -- Si un cliente antiguo archiva sin casillas, recuperar su última copia ya
 -- sincronizada. No reinterpretar avgOverride como nota de una evaluación.
 select coalesce(jsonb_agg(r),'[]'::jsonb) into viejos
 from jsonb_array_elements(case when jsonb_typeof(p_anteriores->'ramos')='array' then p_anteriores->'ramos' else '[]'::jsonb end) r
 where exists(select 1 from jsonb_array_elements(archivados) a where a#>>'{ramo,id}'=r->>'id' and a->>'tenant'=p_anteriores->>'tenant');
 fuentes=fuentes||jsonb_build_array(jsonb_build_object('tenant',p_anteriores->>'tenant','ramos',viejos,'prioridad',1));
 select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) into notas from (
  select distinct on (f->>'tenant',n.ramo_clave,n.evaluacion_clave) f->>'tenant' as tenant,n.*
  from jsonb_array_elements(fuentes) f
  cross join lateral public.notas_tipicas_extraer(f->>'tenant',f->'ramos') n
  order by f->>'tenant',n.ramo_clave,n.evaluacion_clave,(f->>'prioridad')::integer desc
 ) e;
 if not p_conservar_ausentes then
  delete from public.evaluacion_notas e where e.user_id=p_usuario and e.periodo=p_periodo
   and not exists(select 1 from jsonb_to_recordset(notas) n(tenant text,ramo_clave text,evaluacion_clave text,nota numeric)
    where n.tenant=e.tenant and n.ramo_clave=e.ramo_clave and n.evaluacion_clave=e.evaluacion_clave)
   and not exists(select 1 from jsonb_array_elements(archivados) a
    where a->>'tenant'=e.tenant and public.clave_curso_comparacion(a->>'tenant',a->'ramo')=e.ramo_clave);
 end if;
 insert into public.evaluacion_notas(user_id,tenant,periodo,ramo_clave,evaluacion_clave,nota)
 select p_usuario,n.tenant,p_periodo,n.ramo_clave,n.evaluacion_clave,n.nota
 from jsonb_to_recordset(notas) n(tenant text,ramo_clave text,evaluacion_clave text,nota numeric)
 on conflict(user_id,tenant,periodo,ramo_clave,evaluacion_clave) do update set nota=excluded.nota,actualizada=now()
 where public.evaluacion_notas.nota is distinct from excluded.nota;
end;$$;

create or replace function public.notas_tipicas_al_sincronizar()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  perform public.notas_tipicas_capturar(old.user_id,null,null,public.notas_tipicas_periodo_actual());return old;
 elsif tg_op='INSERT' then
  perform public.notas_tipicas_capturar(new.user_id,new.data,null,public.notas_tipicas_periodo_actual());
 else
  perform public.notas_tipicas_capturar(new.user_id,new.data,old.data,public.notas_tipicas_periodo_actual());
 end if;
 return new;
end;$$;
drop trigger if exists evaluacion_notas_al_sincronizar on public.user_ramos;
create trigger evaluacion_notas_al_sincronizar after insert or update of data or delete on public.user_ramos
 for each row execute function public.notas_tipicas_al_sincronizar();

create or replace function public.notas_tipicas_ramo_interno(p_tenant text,p_ramo_clave text,p_periodo_actual text)
returns table(evaluacion_clave text,promedio numeric,personas integer,periodos text[])
language sql stable security definer set search_path='' as $$
 with validas as materialized(
  select e.* from public.evaluacion_notas e left join public.user_ramos u on u.user_id=e.user_id
  where e.tenant=p_tenant and e.ramo_clave=p_ramo_clave and e.periodo<p_periodo_actual
   and public.notas_tipicas_participa(e.user_id,u.data)
 ), personas as (
  select v.evaluacion_clave,v.user_id,avg(v.nota) as nota from validas v group by v.evaluacion_clave,v.user_id
 ) select p.evaluacion_clave,round(avg(p.nota),2),count(*)::integer,
  (select array_agg(distinct v.periodo order by v.periodo) from validas v where v.evaluacion_clave=p.evaluacion_clave)
 from personas p group by p.evaluacion_clave having count(*)>=public.notas_tipicas_piso() order by p.evaluacion_clave;
$$;
create or replace function public.notas_tipicas_ramo(p_tenant text,p_ramo_clave text)
returns table(evaluacion_clave text,promedio numeric,personas integer,periodos text[])
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'hay que haber iniciado sesión';end if;
 return query select * from public.notas_tipicas_ramo_interno(p_tenant,p_ramo_clave,public.notas_tipicas_periodo_actual());
end;$$;

revoke all on function public.notas_tipicas_piso() from public,anon,authenticated;
revoke all on function public.notas_tipicas_periodo_actual() from public,anon,authenticated;
revoke all on function public.notas_tipicas_en_escala(text,numeric) from public,anon,authenticated;
revoke all on function public.notas_tipicas_participa(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.notas_tipicas_extraer(text,jsonb) from public,anon,authenticated;
revoke all on function public.notas_tipicas_capturar(uuid,jsonb,jsonb,text,boolean) from public,anon,authenticated;
revoke all on function public.notas_tipicas_al_sincronizar() from public,anon,authenticated;
revoke all on function public.notas_tipicas_ramo_interno(text,text,text) from public,anon,authenticated;
revoke all on function public.notas_tipicas_ramo(text,text) from public,anon,authenticated;
grant execute on function public.notas_tipicas_ramo(text,text) to authenticated;

-- Carga inicial 2026-2, en la misma transacción. Repetir no duplica ni borra
-- registros históricos ausentes. Si se aplica más tarde, NO asignar a 2026-2
-- los ramos activos de 2027: rescatar solo un historial explícito de 2026-2.
do $$declare u record; datos jsonb;
begin
 for u in select user_id,data from public.user_ramos loop
  datos=u.data;
  if public.notas_tipicas_periodo_actual()<>'2026-2' then datos=jsonb_set(datos,'{ramos}','[]'::jsonb);end if;
  perform public.notas_tipicas_capturar(u.user_id,datos,null,'2026-2',true);
 end loop;
end;$$;
commit;
