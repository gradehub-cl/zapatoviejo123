-- Registro de docentes por sección (#569) y sus calificaciones: estrellas,
-- etiquetas de una lista y etiquetas cortas escritas, sin perfiles ni reseñas.
-- Aplicación manual: no ejecutar contra producción como parte de este PR.
-- Reaplicable. user_ramos(user_id, data) ya existe en Supabase; solo se lee.
-- El semestre activo es data.ramos; data.historial nunca habilita un aporte.
-- RPC recibe id local, sección, período y nombre: nunca notas ni datos de cuenta.
begin;

create table if not exists public.profesor_aportes (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant text not null check (tenant in ('uc','fen','uai','uandes')),
  ramo_clave text not null check (char_length(ramo_clave) between 1 and 200),
  seccion integer not null check (seccion between 1 and 999),
  periodo text not null check (periodo ~ '^20[0-9]{2}-[12]$'),
  nombre text not null check (char_length(nombre) between 3 and 100),
  primary key (user_id, tenant, ramo_clave, seccion, periodo)
);
create index if not exists profesor_aportes_curso
  on public.profesor_aportes(tenant, ramo_clave, seccion, periodo);
alter table public.profesor_aportes enable row level security;
-- Sin acceso directo, incluso al propio aporte: las RPC proyectan solo nombres.
revoke all on public.profesor_aportes from public, anon, authenticated;

create or replace function public.profesor_normalizar(p_texto text)
returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(translate(lower(normalize(coalesce(p_texto,''), NFC)),
    'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g'));
$$;

-- Adaptación conservadora de la distancia de edición de #445. Una errata en
-- nombres de al menos diez letras; no agrupa nombres por parecido transitivo.
create or replace function public.profesor_coinciden(a text, b text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare x text := public.profesor_normalizar(a); y text := public.profesor_normalizar(b);
  fila integer[]; arriba integer; diagonal integer; i integer; j integer;
begin
  if x = '' or y = '' then return false; end if;
  if x = y then return true; end if;
  if least(length(x),length(y)) < 10 or abs(length(x)-length(y)) > 1
     or left(x,1) <> left(y,1) then return false; end if;
  select array_agg(n) into fila from generate_series(0,length(y)) n;
  for i in 1..length(x) loop
    diagonal := fila[1]; fila[1] := i;
    for j in 1..length(y) loop
      arriba := fila[j+1];
      fila[j+1] := least(arriba+1,fila[j]+1,diagonal+case when substr(x,i,1)=substr(y,j,1) then 0 else 1 end);
      diagonal := arriba;
    end loop;
  end loop;
  return fila[length(y)+1] <= 1;
end;
$$;

create or replace function public.profesor_periodo_actual()
returns text language sql stable set search_path = '' as $$
  -- Igual a semester(): enero/febrero cierran el segundo semestre anterior.
  select case when extract(month from d) <= 2 then (extract(year from d)::int-1)::text||'-2'
    when extract(month from d) <= 7 then extract(year from d)::int::text||'-1'
    else extract(year from d)::int::text||'-2' end
  from (select current_timestamp at time zone 'America/Santiago' as d) fecha;
$$;

create or replace function public.profesor_contexto(p_ramo_id text, p_seccion integer)
returns table(tenant text, ramo_clave text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  return query
    select u.data->>'tenant', public.profesor_normalizar(coalesce(
      nullif(r->>'sigla',''), nullif(r->'origen'->>'ramoKey',''),r->>'nombre'))
    from public.user_ramos u
    cross join lateral jsonb_array_elements(case when jsonb_typeof(u.data->'ramos')='array'
      then u.data->'ramos' else '[]'::jsonb end) r
    where u.user_id=auth.uid() and r->>'id'=p_ramo_id
      and p_seccion between 1 and 999 and r->>'seccion'=p_seccion::text
      and u.data->>'tenant' in ('uc','fen','uai','uandes')
      and coalesce(r->'origen'->>'tenant',u.data->>'tenant')=u.data->>'tenant'
    limit 1;
  if not found then raise exception 'ramo o sección no sincronizados en tu semestre actual'; end if;
end;
$$;

-- Docentes que pidieron no aparecer (privacidad.html#profesores). Solo el equipo
-- la toca, desde el SQL Editor; ninguna RPC la lee ni la escribe hacia afuera.
-- Ocultar es por universidad y tolera la misma errata que el consenso.
--   Oponerse (deja de mostrarse en todos sus ramos y no se vuelve a publicar):
--     insert into public.profesor_ocultos(tenant,nombre) values('uc','Nombre Apellido');
--   Rectificar un nombre mal escrito:
--     update public.profesor_aportes set nombre='Nombre Correcto'
--       where tenant='uc' and public.profesor_coinciden(nombre,'Nombre Mal Escrito');
--   Suprimir, en este orden (cada calificación es del docente que informó su autor):
--     delete from public.profesor_calificaciones k using public.profesor_aportes a where a.user_id=k.user_id
--       and a.tenant=k.tenant and a.ramo_clave=k.ramo_clave and a.seccion=k.seccion and a.periodo=k.periodo
--       and k.tenant='uc' and public.profesor_coinciden(a.nombre,'Nombre Apellido');
--     delete from public.profesor_aportes where tenant='uc' and public.profesor_coinciden(nombre,'Nombre Apellido');
--     insert into public.profesor_ocultos(tenant,nombre,motivo) values('uc','Nombre Apellido','supresion');
create table if not exists public.profesor_ocultos (
  tenant text not null check (tenant in ('uc','fen','uai','uandes')),
  nombre text not null check (char_length(nombre) between 3 and 100),
  motivo text not null default 'oposicion' check (motivo in ('oposicion','supresion','abuso')),
  creado timestamptz not null default now(),
  primary key (tenant, nombre)
);
alter table public.profesor_ocultos enable row level security;
revoke all on public.profesor_ocultos from public, anon, authenticated;

-- Consenso de una sección: el nombre con al menos tres cuentas que coinciden.
-- Interna: la usan el estado del docente y las calificaciones.
create or replace function public.profesor_docente_publico(p_tenant text, p_ramo_clave text, p_seccion integer, p_periodo text)
returns text language sql stable security definer set search_path = '' as $$
  with aportes as materialized (
    select a.* from public.profesor_aportes a
    where a.tenant=p_tenant and a.ramo_clave=p_ramo_clave and a.seccion=p_seccion and a.periodo=p_periodo
  ), grupos as (
    select b.nombre, count(distinct a.user_id) as cantidad
    from (select distinct nombre from aportes) b join aportes a
      on public.profesor_coinciden(b.nombre,a.nombre)
    group by b.nombre having count(distinct a.user_id)>=3
  ), ganadores as (
    select * from grupos where cantidad=(select max(cantidad) from grupos)
  )
  select g.nombre from ganadores g
    -- Un empate entre docentes distintos no publica uno por azar.
    where not exists(select 1 from ganadores otro where not public.profesor_coinciden(g.nombre,otro.nombre))
      -- Quien pidió no aparecer no se publica, y sin docente no se califica.
      and not exists(select 1 from public.profesor_ocultos o
        where o.tenant=p_tenant and public.profesor_coinciden(o.nombre,g.nombre))
    order by (select count(*) from aportes a where a.nombre=g.nombre) desc, g.nombre limit 1;
$$;

create or replace function public.profesor_docente_estado(p_ramo_id text, p_seccion integer, p_periodo text)
returns table(nombre_publico text, mi_nombre text)
language sql stable security definer set search_path = '' as $$
  select public.profesor_docente_publico(c.tenant,c.ramo_clave,p_seccion,p_periodo),
    (select a.nombre from public.profesor_aportes a where a.user_id=auth.uid() and a.tenant=c.tenant
      and a.ramo_clave=c.ramo_clave and a.seccion=p_seccion and a.periodo=p_periodo)
  from public.profesor_contexto(p_ramo_id,p_seccion) c;
$$;

create or replace function public.profesor_docente_informar(p_ramo_id text, p_seccion integer, p_periodo text, p_nombre text)
returns void language plpgsql security definer set search_path = '' as $$
declare c record; nombre_limpio text; cp integer;
begin
  if p_periodo is distinct from public.profesor_periodo_actual() then raise exception 'período no vigente'; end if;
  select * into strict c from public.profesor_contexto(p_ramo_id,p_seccion);
  nombre_limpio := regexp_replace(coalesce(p_nombre,''),'[[:cntrl:]]',' ','g');
  foreach cp in array array[8203,8204,8205,8206,8207,8234,8235,8236,8237,8238,8294,8295,8296,8297,65279]
  loop nombre_limpio := replace(nombre_limpio,chr(cp),''); end loop;
  nombre_limpio := btrim(regexp_replace(nombre_limpio,'[[:space:]]+',' ','g'));
  if length(nombre_limpio) not between 3 and 100 or length(public.profesor_normalizar(nombre_limpio))<3
    then raise exception 'nombre inválido'; end if;
  insert into public.profesor_aportes(user_id,tenant,ramo_clave,seccion,periodo,nombre)
    values(auth.uid(),c.tenant,c.ramo_clave,p_seccion,p_periodo,nombre_limpio)
    on conflict(user_id,tenant,ramo_clave,seccion,periodo) do update set nombre=excluded.nombre;
end;
$$;

revoke all on function public.profesor_normalizar(text) from public, anon, authenticated;
revoke all on function public.profesor_coinciden(text,text) from public, anon, authenticated;
revoke all on function public.profesor_periodo_actual() from public, anon, authenticated;
revoke all on function public.profesor_contexto(text,integer) from public, anon, authenticated;
revoke all on function public.profesor_docente_publico(text,text,integer,text) from public, anon, authenticated;
revoke all on function public.profesor_docente_estado(text,integer,text) from public, anon, authenticated;
revoke all on function public.profesor_docente_informar(text,integer,text,text) from public, anon, authenticated;
grant execute on function public.profesor_docente_estado(text,integer,text) to authenticated;
grant execute on function public.profesor_docente_informar(text,integer,text,text) to authenticated;
-- Calificaciones: una por cuenta, ramo, sección y período. Cuentan para el
-- docente que esa cuenta informó, y solo en secciones donde el consenso dice lo
-- mismo: quien dijo «es otra persona» no suma al publicado.

-- Etiquetas sobre cómo es el profe, no sobre la clase (Lucas, 2026-10-27):
-- positivas, una neutra y negativas sin insultos. El panel sugiere unas u otras
-- según las estrellas; acá se acepta cualquiera de la lista. Mismas claves que
-- PROFESOR_ETIQUETAS en data.js (tests/profesores-calificaciones.test.js).
create or replace function public.profesor_etiquetas_validas()
returns text[] language sql immutable set search_path = '' as $$
  select array['buena_onda','amable','paciente','flexible','puntual','motiva','escucha','exigente',
    'cuesta_entenderle','distante','poco_paciente','inflexible','impuntual','responde_poco']::text[];
$$;

-- «Otro»: una etiqueta escrita, corta, solo con letras y sin insultos ni
-- acusaciones. Es el mayor riesgo para la honra de un profe, así que el filtro
-- vive en la base, no solo en la app.
create or replace function public.profesor_texto_permitido(p_texto text)
returns boolean language sql immutable set search_path = '' as $$
  select p_texto ~ '^[[:alpha:]]+( [[:alpha:]]+)*$' and char_length(p_texto) between 3 and 20
    and public.profesor_normalizar(p_texto) !~ ('(^| )(' || array_to_string(array[
      'wn','wna','wea','weas','ql','qlo','ctm','csm','ptm','pico','raja','zorra','perra','perro','cerdo','cerda',
      'tonto','tonta','idiota','imbecil','estupido','estupida','pendejo','pendeja','cabron','gil','gila','longi',
      'inutil','basura','asco','asqueroso','asquerosa','flaite','facho','facha','nazi','racista','machista',
      'ladron','ladrona','corrupto','corrupta','mentiroso','mentirosa','acosador','acosadora','abusador',
      'abusadora','violador','violadora','pedofilo','pedofila','enfermo','enferma','loco','loca','drogadicto',
      'borracho','borracha'],'|') || ')( |$)')
    and public.profesor_normalizar(p_texto) !~ '(weon|weona|hueon|huevon|aweona|culia|conchetu|conchesu|maric|mierd|put[ao]|chuch|verga|cul[oa]s? )';
$$;

-- Hasta tres etiquetas escritas, cada una permitida y sin repetirse (sin contar
-- tildes ni mayúsculas).
create or replace function public.profesor_otros_permitidos(p_otros text[])
returns boolean language sql immutable set search_path = '' as $$
  select cardinality(p_otros) <= 3
    and coalesce(bool_and(public.profesor_texto_permitido(t)), true)
    and count(distinct public.profesor_normalizar(t)) = count(t)
  from unnest(p_otros) t;
$$;

create table if not exists public.profesor_calificaciones (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant text not null check (tenant in ('uc','fen','uai','uandes')),
  ramo_clave text not null check (char_length(ramo_clave) between 1 and 200),
  seccion integer not null check (seccion between 1 and 999),
  periodo text not null check (periodo ~ '^20[0-9]{2}-[12]$'),
  estrellas smallint not null check (estrellas between 1 and 5),
  etiquetas text[] not null default '{}',
  actualizada timestamptz not null default now(),
  primary key (user_id, tenant, ramo_clave, seccion, periodo)
);
alter table public.profesor_calificaciones add column if not exists otro text;
-- Las etiquetas escritas viven en `otros`. `otro` queda como copia de la primera
-- para la app anterior y para volver atrás; se borra en una migración aparte.
alter table public.profesor_calificaciones add column if not exists otros text[] not null default '{}';
create index if not exists profesor_calificaciones_ramo
  on public.profesor_calificaciones(tenant, ramo_clave);
alter table public.profesor_calificaciones enable row level security;
-- Al cambiar la lista se quitan de las filas las etiquetas que ya no existen
-- (las estrellas se conservan) y recién ahí se cambia la regla.
update public.profesor_calificaciones k set etiquetas=array(select e from unnest(k.etiquetas) e
  where e=any(public.profesor_etiquetas_validas()) order by e)
  where not k.etiquetas <@ public.profesor_etiquetas_validas();
update public.profesor_calificaciones k set otro=null
  where k.otro is not null and not public.profesor_texto_permitido(k.otro);
update public.profesor_calificaciones k set otros=array(select t from unnest(k.otros) with ordinality u(t,i)
  where public.profesor_texto_permitido(t) order by i)
  where not coalesce((select bool_and(public.profesor_texto_permitido(t)) from unnest(k.otros) t), true);
-- Calificaciones guardadas antes de `otros`: su «Otro» pasa a ser la primera.
update public.profesor_calificaciones k set otros=array[k.otro]
  where k.otro is not null and k.otros='{}';
alter table public.profesor_calificaciones drop constraint if exists profesor_calificaciones_etiquetas_check;
alter table public.profesor_calificaciones add constraint profesor_calificaciones_etiquetas_check
  check (cardinality(etiquetas) <= 3 and etiquetas <@ public.profesor_etiquetas_validas());
alter table public.profesor_calificaciones drop constraint if exists profesor_calificaciones_otro_check;
alter table public.profesor_calificaciones add constraint profesor_calificaciones_otro_check
  check (otro is null or public.profesor_texto_permitido(otro));
alter table public.profesor_calificaciones drop constraint if exists profesor_calificaciones_otros_check;
alter table public.profesor_calificaciones add constraint profesor_calificaciones_otros_check
  check (public.profesor_otros_permitidos(otros) and cardinality(etiquetas) + cardinality(otros) <= 3);
revoke all on public.profesor_calificaciones from public, anon, authenticated;

-- Promedio del docente en este ramo. Las estrellas se juntan por el nombre que
-- informó cada cuenta, en cualquier sección y semestre: dos votos de la 13 y uno
-- de la 14 ya son tres (Lucas, 2026-10-28). La sección solo decide qué nombre se
-- publica; sin consenso en la tuya, cuenta el docente que informaste. Bajo tres
-- calificaciones no se publica nada agregado: una o dos delatan a quien calificó.
-- Una etiqueta de la lista aparece con dos cuentas; una escrita, con tres que
-- escriben lo mismo (sin contar tildes, mayúsculas ni espacios).
drop function if exists public.profesor_calificacion_estado(text,integer,text);
create function public.profesor_calificacion_estado(p_ramo_id text, p_seccion integer, p_periodo text)
returns table(docente text, total integer, promedio numeric, etiquetas jsonb,
  mi_estrellas integer, mi_etiquetas text[], mi_otro text, puede_calificar boolean, mi_otros text[])
language plpgsql stable security definer set search_path = '' as $$
declare c record; d text; mia record;
begin
  select * into strict c from public.profesor_contexto(p_ramo_id,p_seccion);
  d := public.profesor_docente_publico(c.tenant,c.ramo_clave,p_seccion,p_periodo);
  if d is null then
    select a.nombre into d from public.profesor_aportes a
      where a.user_id=auth.uid() and a.tenant=c.tenant and a.ramo_clave=c.ramo_clave
        and a.seccion=p_seccion and a.periodo=p_periodo
        and not exists(select 1 from public.profesor_ocultos o
          where o.tenant=c.tenant and public.profesor_coinciden(o.nombre,a.nombre));
  end if;
  select k.estrellas, k.etiquetas, k.otros[1] as otro, k.otros into mia from public.profesor_calificaciones k
    where k.user_id=auth.uid() and k.tenant=c.tenant and k.ramo_clave=c.ramo_clave
      and k.seccion=p_seccion and k.periodo=p_periodo;
  if d is null then
    return query select null::text, 0, null::numeric, '[]'::jsonb, mia.estrellas::integer, mia.etiquetas, mia.otro,
      p_periodo=public.profesor_periodo_actual(), mia.otros;
    return;
  end if;
  return query
    with notas as materialized (
      select k.user_id, k.estrellas, k.etiquetas, k.otros from public.profesor_calificaciones k
      join public.profesor_aportes a on a.user_id=k.user_id and a.tenant=k.tenant
        and a.ramo_clave=k.ramo_clave and a.seccion=k.seccion and a.periodo=k.periodo
      where k.tenant=c.tenant and k.ramo_clave=c.ramo_clave and public.profesor_coinciden(a.nombre,d)
    ), conteo as (select count(*)::integer as n from notas),
    destacadas as (
      select jsonb_build_object('etiqueta',e) as j, count(*)::integer as n, e as orden
        from notas, unnest(notas.etiquetas) e group by e having count(*)>=2
      union all
      select jsonb_build_object('texto',mode() within group (order by t)), count(distinct notas.user_id)::integer,
        public.profesor_normalizar(t)
        from notas, unnest(notas.otros) t
        group by public.profesor_normalizar(t) having count(distinct notas.user_id)>=3
    )
    select d, conteo.n,
      case when conteo.n>=3 then (select round(avg(estrellas),1) from notas) end,
      case when conteo.n>=3 then coalesce((select jsonb_agg(t.j||jsonb_build_object('n',t.n) order by t.n desc, t.orden)
        from (select * from destacadas order by n desc, orden limit 3) t),'[]'::jsonb)
        else '[]'::jsonb end,
      mia.estrellas::integer, mia.etiquetas, mia.otro, p_periodo=public.profesor_periodo_actual(), mia.otros
    from conteo;
end;
$$;

-- p_otros trae las etiquetas escritas. p_otro (una sola) es de la app anterior y
-- sigue funcionando, igual que la llamada sin ninguna de las dos.
drop function if exists public.profesor_calificar(text,integer,text,integer,text[]);
drop function if exists public.profesor_calificar(text,integer,text,integer,text[],text);
create or replace function public.profesor_calificar(p_ramo_id text, p_seccion integer, p_periodo text,
  p_estrellas integer, p_etiquetas text[], p_otro text default null, p_otros text[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare c record; limpias text[]; escritas text[];
begin
  if p_periodo is distinct from public.profesor_periodo_actual() then raise exception 'período no vigente'; end if;
  select * into strict c from public.profesor_contexto(p_ramo_id,p_seccion);
  -- El panel pide primero el nombre: la calificación es para ese docente.
  if not exists(select 1 from public.profesor_aportes a where a.user_id=auth.uid() and a.tenant=c.tenant
      and a.ramo_clave=c.ramo_clave and a.seccion=p_seccion and a.periodo=p_periodo) then
    raise exception 'profesor sin informar';
  end if;
  -- Quien pidió no aparecer tampoco recibe calificaciones nuevas.
  if exists(select 1 from public.profesor_aportes a join public.profesor_ocultos o
      on o.tenant=a.tenant and public.profesor_coinciden(o.nombre,a.nombre)
      where a.user_id=auth.uid() and a.tenant=c.tenant and a.ramo_clave=c.ramo_clave
        and a.seccion=p_seccion and a.periodo=p_periodo) then
    raise exception 'profesor oculto';
  end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then raise exception 'calificación inválida'; end if;
  limpias := array(select distinct e from unnest(coalesce(p_etiquetas,'{}'::text[])) e where e is not null order by e);
  -- Espacios de más fuera; la misma etiqueta escrita dos veces cuenta una.
  escritas := array(select t from (
      select distinct on (public.profesor_normalizar(t)) t, i
      from unnest(coalesce(p_otros, array[p_otro])) with ordinality u(x,i),
        lateral (select nullif(btrim(regexp_replace(coalesce(x,''),'[[:space:]]+',' ','g')),'') as t) n
      where t is not null order by public.profesor_normalizar(t), i) d order by i);
  if cardinality(limpias) + cardinality(escritas) > 3 then raise exception 'etiquetas inválidas'; end if;
  if not coalesce((select bool_and(public.profesor_texto_permitido(t)) from unnest(escritas) t), true) then
    raise exception 'texto no permitido';
  end if;
  insert into public.profesor_calificaciones(user_id,tenant,ramo_clave,seccion,periodo,estrellas,etiquetas,otros,otro)
    values(auth.uid(),c.tenant,c.ramo_clave,p_seccion,p_periodo,p_estrellas,limpias,escritas,escritas[1])
    on conflict(user_id,tenant,ramo_clave,seccion,periodo)
    do update set estrellas=excluded.estrellas, etiquetas=excluded.etiquetas, otros=excluded.otros,
      otro=excluded.otro, actualizada=now();
exception when check_violation then raise exception 'etiquetas inválidas';
end;
$$;

create or replace function public.profesor_calificacion_borrar(p_ramo_id text, p_seccion integer, p_periodo text)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into strict c from public.profesor_contexto(p_ramo_id,p_seccion);
  delete from public.profesor_calificaciones k where k.user_id=auth.uid() and k.tenant=c.tenant
    and k.ramo_clave=c.ramo_clave and k.seccion=p_seccion and k.periodo=p_periodo;
end;
$$;

-- Selección privada para el futuro video del Wrapped. La relación ya queda
-- guardada al calificar: no se duplica ni se conserva una preferencia retirada.
-- Lee también semestres archivados, sin depender de los ramos activos actuales.
-- Devuelve el nombre que informó esta cuenta, no el consenso de otra sección.
-- Una fila por ramo/sección: no identifica ni agrupa profesores por parecido.
-- Cliente: rpc('profesores_cinco_estrellas', {p_periodo:'2026-2'}).
create or replace function public.profesores_cinco_estrellas(p_periodo text)
returns table(tenant text, ramo_clave text, seccion integer, periodo text, nombre text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  if p_periodo is null or p_periodo !~ '^20[0-9]{2}-[12]$' then
    raise exception 'período inválido';
  end if;
  return query
    select k.tenant, k.ramo_clave, k.seccion, k.periodo, a.nombre
    from public.profesor_calificaciones k
    join public.profesor_aportes a using (user_id, tenant, ramo_clave, seccion, periodo)
    where k.user_id=auth.uid() and k.periodo=p_periodo and k.estrellas=5
      and not exists(select 1 from public.profesor_ocultos o
        where o.tenant=k.tenant and public.profesor_coinciden(o.nombre,a.nombre))
    order by k.tenant, k.ramo_clave, k.seccion;
end;
$$;

revoke all on function public.profesor_etiquetas_validas() from public, anon, authenticated;
revoke all on function public.profesor_texto_permitido(text) from public, anon, authenticated;
revoke all on function public.profesor_otros_permitidos(text[]) from public, anon, authenticated;
revoke all on function public.profesor_calificacion_estado(text,integer,text) from public, anon, authenticated;
revoke all on function public.profesor_calificar(text,integer,text,integer,text[],text,text[]) from public, anon, authenticated;
revoke all on function public.profesor_calificacion_borrar(text,integer,text) from public, anon, authenticated;
revoke all on function public.profesores_cinco_estrellas(text) from public, anon, authenticated;
grant execute on function public.profesor_calificacion_estado(text,integer,text) to authenticated;
grant execute on function public.profesor_calificar(text,integer,text,integer,text[],text,text[]) to authenticated;
grant execute on function public.profesor_calificacion_borrar(text,integer,text) to authenticated;
grant execute on function public.profesores_cinco_estrellas(text) to authenticated;
commit;
