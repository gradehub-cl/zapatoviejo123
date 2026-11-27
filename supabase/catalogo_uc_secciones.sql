-- Aplicar A MANO después de catalogo_uc.sql y profesores.sql. Reaplicable.
-- Datos públicos de cursos, no cuentas: sin FK a auth.users. Nombres docentes
-- solo se leen mediante la RPC filtrada; la base y la preparación son privadas.
begin;
create table if not exists public.catalogo_uc_secciones (
 periodo text not null check(periodo ~ '^20[0-9]{2}-[12]$'),
 nrc integer not null check(nrc>0),
 sigla text not null check(sigla ~ '^[A-Z][A-Z0-9_]{2,11}$'),
 seccion integer not null check(seccion>0), nombre text not null check(length(nombre) between 1 and 200),
 profesores text[] not null default '{}',campus text not null,formato text not null,
 creditos integer not null check(creditos between 0 and 1000),
 vacantes_total integer not null check(vacantes_total>=0),
 vacantes_disponibles integer not null check(vacantes_disponibles between 0 and vacantes_total),
 horario jsonb not null check(jsonb_typeof(horario)='array'),
 retirable boolean not null,ingles boolean not null,aprobacion_especial boolean not null,
 vista_por_ultima_vez timestamptz not null default now(),vigente boolean not null default true,
 primary key(periodo,nrc)
);
create index if not exists catalogo_uc_secciones_sigla on public.catalogo_uc_secciones(periodo,sigla);
alter table public.catalogo_uc_secciones enable row level security;
revoke all on public.catalogo_uc_secciones from public,anon,authenticated;
grant select,insert,update,delete on public.catalogo_uc_secciones to service_role;

-- Los lotes de hasta 1000 filas se preparan aquí. Un fallo de red NO publica
-- media corrida. La consolidación, los cursos nuevos y las bajas son atómicos.
create table if not exists public.catalogo_uc_secciones_lotes (
 carga_id uuid not null,periodo text not null,nrc integer not null,
 datos jsonb not null check(jsonb_typeof(datos)='object' and datos->>'periodo'=periodo and (datos->>'nrc')::integer=nrc),
 recibida timestamptz not null default now(),primary key(carga_id,periodo,nrc)
);
alter table public.catalogo_uc_secciones_lotes enable row level security;
revoke all on public.catalogo_uc_secciones_lotes from public,anon,authenticated;
grant select,insert,update,delete on public.catalogo_uc_secciones_lotes to service_role;
drop policy if exists catalogo_uc_secciones_servicio on public.catalogo_uc_secciones;
create policy catalogo_uc_secciones_servicio on public.catalogo_uc_secciones for all to service_role using(true) with check(true);
drop policy if exists catalogo_uc_lotes_servicio on public.catalogo_uc_secciones_lotes;
create policy catalogo_uc_lotes_servicio on public.catalogo_uc_secciones_lotes for all to service_role using(true) with check(true);

-- Solo el secreto puede consolidar. SECURITY INVOKER mantiene ese límite;
-- no es una RPC disponible para la app, aun con sesión.
create or replace function public.catalogo_uc_secciones_consolidar(p_carga_id uuid,p_periodo text,p_total integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare filas jsonb; anteriores integer; nuevas integer; cambiadas integer; bajas integer; cursos integer;
begin
 perform pg_advisory_xact_lock(hashtext('catalogo_uc_secciones'),hashtext(p_periodo));
 if p_periodo !~ '^20[0-9]{2}-[12]$' or p_total is null or p_total<1 then raise exception 'corrida inválida';end if;
 select jsonb_agg(l.datos order by l.nrc) into filas from public.catalogo_uc_secciones_lotes l where l.carga_id=p_carga_id and l.periodo=p_periodo;
 if coalesce(jsonb_array_length(filas),0)<>p_total then raise exception 'lotes incompletos: no se publica nada';end if;
 select count(*) into anteriores from public.catalogo_uc_secciones where periodo=p_periodo and vigente;
 if p_total<anteriores*0.7 then raise exception 'guarda del 70%%: % de % secciones, no se publica nada',p_total,anteriores;end if;
 select count(*) filter(where s.nrc is null),count(*) filter(where s.nrc is not null and
  ((to_jsonb(s)-'vista_por_ultima_vez'-'vigente') is distinct from
   (to_jsonb(e)-'vista_por_ultima_vez'-'vigente') or not s.vigente)) into nuevas,cambiadas
 from jsonb_populate_recordset(null::public.catalogo_uc_secciones,filas) e
 left join public.catalogo_uc_secciones s on s.periodo=e.periodo and s.nrc=e.nrc;
 -- Las claves de los lotes y el período del JSON deben coincidir incluso si
 -- quien usa la clave secreta llama la RPC sin pasar por nuestro script.
 if exists(select 1 from jsonb_populate_recordset(null::public.catalogo_uc_secciones,filas) e where e.periodo is distinct from p_periodo) then raise exception 'período inconsistente';end if;
 insert into public.catalogo_uc_secciones
 select e.periodo,e.nrc,e.sigla,e.seccion,e.nombre,e.profesores,e.campus,e.formato,e.creditos,
  e.vacantes_total,e.vacantes_disponibles,e.horario,e.retirable,e.ingles,e.aprobacion_especial,now(),true
 from jsonb_populate_recordset(null::public.catalogo_uc_secciones,filas) e
 on conflict(periodo,nrc) do update set sigla=excluded.sigla,seccion=excluded.seccion,nombre=excluded.nombre,
  profesores=excluded.profesores,campus=excluded.campus,formato=excluded.formato,creditos=excluded.creditos,
  vacantes_total=excluded.vacantes_total,vacantes_disponibles=excluded.vacantes_disponibles,horario=excluded.horario,
  retirable=excluded.retirable,ingles=excluded.ingles,aprobacion_especial=excluded.aprobacion_especial,
  vista_por_ultima_vez=excluded.vista_por_ultima_vez,vigente=true;
 update public.catalogo_uc_secciones s set vigente=false where s.periodo=p_periodo and s.vigente
  and not exists(select 1 from jsonb_populate_recordset(null::public.catalogo_uc_secciones,filas) e where e.nrc=s.nrc);
 get diagnostics bajas=row_count;
 -- El nombre de búsqueda se calcula en JS con busquedaDe, la MISMA función
 -- del CSV. Nunca sobreescribir créditos existentes: solo insertar siglas nuevas.
 insert into public.catalogo_uc(sigla,nombre,creditos,busqueda)
 select distinct on (e->>'sigla') e->>'sigla',e->>'nombre',(e->>'creditos_catalogo')::integer,e->>'busqueda'
 from jsonb_array_elements(filas) e order by e->>'sigla',(e->>'nrc')::integer
 on conflict(sigla) do nothing;
 get diagnostics cursos=row_count;
 delete from public.catalogo_uc_secciones_lotes where carga_id=p_carga_id and periodo=p_periodo;
 -- Solo preparación abandonada; nunca se borra una sección histórica.
 delete from public.catalogo_uc_secciones_lotes where recibida<now()-interval '7 days';
 return jsonb_build_object('periodo',p_periodo,'leidas',p_total,'nuevas',nuevas,'cambiadas',cambiadas,'dejaron_de_estar',bajas,'cursos_nuevos',cursos);
end;$$;
revoke all on function public.catalogo_uc_secciones_consolidar(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.catalogo_uc_secciones_consolidar(uuid,text,integer) to service_role;
-- No se amplía la lectura pública de catalogo_uc; conserva su RLS anterior.
grant select,insert on public.catalogo_uc to service_role;
drop policy if exists catalogo_uc_insertar_servicio on public.catalogo_uc;
create policy catalogo_uc_insertar_servicio on public.catalogo_uc for insert to service_role with check(true);
drop policy if exists catalogo_uc_leer_servicio on public.catalogo_uc;
create policy catalogo_uc_leer_servicio on public.catalogo_uc for select to service_role using(true);

-- La UC escribe «Apellido Nombre»; profesor_ocultos usa el nombre que informó
-- el docente. Se comparan las rotaciones de palabras, sin alterar el original
-- ni inventar cuál es apellido. Se privilegia ocultar ante una coincidencia.
create or replace function public.catalogo_uc_secciones_publicas(p_periodo text,p_sigla text default null,p_desde integer default 0)
returns setof public.catalogo_uc_secciones language sql stable security definer set search_path='' as $$
 select s.periodo,s.nrc,s.sigla,s.seccion,s.nombre,
  array(select case when exists(select 1 from public.profesor_ocultos o
   cross join lateral (select string_to_array(public.profesor_normalizar(prof),' ') as palabras) w
   cross join lateral generate_series(0,cardinality(w.palabras)-1) i
   where o.tenant='uc' and public.profesor_coinciden(o.nombre,
    array_to_string(w.palabras[i+1:cardinality(w.palabras)]||w.palabras[1:i],' '))) then 'Sin informar' else prof end
   from unnest(s.profesores) with ordinality as p(prof,orden) order by orden),
  s.campus,s.formato,s.creditos,s.vacantes_total,s.vacantes_disponibles,s.horario,
  s.retirable,s.ingles,s.aprobacion_especial,s.vista_por_ultima_vez,s.vigente
 from public.catalogo_uc_secciones s where s.periodo=p_periodo and s.vigente
  and (p_sigla is null or s.sigla=p_sigla) order by s.sigla,s.seccion,s.nrc
 limit 1000 offset greatest(0,least(coalesce(p_desde,0),100000));
$$;
revoke all on function public.catalogo_uc_secciones_publicas(text,text,integer) from public,anon,authenticated;
grant execute on function public.catalogo_uc_secciones_publicas(text,text,integer) to anon,authenticated;
commit;
