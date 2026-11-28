-- Aplicar después de administradores.sql y eliminar_mi_cuenta.sql. Reaplicable.
-- Bucket privado, envíos para revisión humana. Nunca publica una pauta.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('programas','programas',false,10485760,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf'];
create table if not exists public.programas_enviados(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 tenant text not null,
 carrera text check(carrera is null or char_length(carrera) between 1 and 100),
 sigla text check(sigla is null or sigla ~ '^[A-Z0-9_-]{1,40}$'),
 ramo text not null check(char_length(btrim(ramo)) between 1 and 160),
 periodo text not null check(char_length(btrim(periodo)) between 1 and 32),
 ruta text not null unique,
 bytes integer not null check(bytes between 5 and 10485760),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 paginas integer not null check(paginas>0),con_texto boolean not null,
 estado text not null default 'pendiente' check(estado in ('pendiente','publicado','descartado')),
 motivo text check(motivo is null or char_length(btrim(motivo)) between 3 and 240),
 revisado_por uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),revisado_at timestamptz,
 -- Asociación privada con la ficha, incluso si se corrigen nombre o sigla.
 ramo_id text not null check(ramo_id ~ '^[A-Za-z0-9_-]{1,64}$'),
 constraint programa_ruta_propia check(ruta=user_id::text||'/'||id::text||'.pdf')
);
-- La correspondencia validada es del ramo y período. Solo el equipo registra
-- si un documento cubre todo el ramo o una sección concreta.
create table if not exists public.programas_alcances(
 tenant text not null,
 sigla text not null check(sigla ~ '^[A-Z0-9_-]{1,40}$'),
 periodo text not null check(periodo ~ '^[0-9]{4}-[12v]$'),
 coordinado boolean not null,
 secciones_catalogo integer[] not null default '{}',
 primary key(tenant,sigla,periodo),
 check(not coordinado or secciones_catalogo in ('{}'::integer[],array[0]))
);
alter table public.programas_alcances enable row level security;
revoke all on public.programas_alcances from public,anon,authenticated;

-- Programas con período y alcance documentados en los presets UC y su guía de coordinación.
-- Cero significa que la fuente aplica al ramo completo.
insert into public.programas_alcances(tenant,sigla,periodo,coordinado,secciones_catalogo) values
 ('uc','MAT1610','2026-1',true,array[0]),
 ('uc','TTF012','2026-2',false,array[1,2]),
 ('uc','DER002P','2026-2',false,array[5]),
 ('uc','DER003R','2026-2',false,array[3]),
 ('uc','DER004C','2026-2',false,array[1]),
 ('uc','DER005L','2026-2',false,array[7]),
 ('uc','DER009C','2026-2',false,array[1]),
 ('uc','ETI188','2026-2',false,array[4])
 on conflict do nothing;

-- Aditivo: un envío antiguo sin sección conserva su estado y queda revisable.
alter table public.programas_enviados drop constraint if exists programas_enviados_tenant_check;
alter table public.programas_enviados add column if not exists seccion integer check(seccion between 1 and 999);
create or replace function public.programas_tenant_valido(p_tenant text)
returns boolean language plpgsql stable set search_path='' as $$
begin
 if p_tenant in ('uc','fen','uai','uandes','udd','udp','unab') then return true; end if;
 if to_regprocedure('public.universidades_basicas()') is null then return false; end if;
 return coalesce(p_tenant=any(public.universidades_basicas()),false);
end;
$$;
drop index if exists public.programas_deduplicados;
create index if not exists programas_por_curso
 on public.programas_enviados(tenant,sigla,periodo,seccion)
 where estado in ('pendiente','publicado') and sigla is not null;
create index if not exists programas_cupo on public.programas_enviados(user_id,created_at);
create index if not exists programas_cola on public.programas_enviados(tenant,created_at) where estado='pendiente';
alter table public.programas_enviados enable row level security;
revoke all on public.programas_enviados from public,anon,authenticated;
grant select on public.programas_enviados to authenticated;
drop policy if exists programas_propios on public.programas_enviados;
create policy programas_propios on public.programas_enviados for select to authenticated using(user_id=(select auth.uid()));

create or replace function public.programas_es_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->>'aal','')='aal2'
  and exists(select 1 from admin.administradores a where a.user_id=auth.uid());
$$;
create or replace function public.programa_archivo_permitido(p_ruta text,p_escritura boolean default false)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then return false; end if;
 if p_escritura then
  perform pg_advisory_xact_lock(hashtextextended('programas:'||uid::text,0));
  return exists(select 1 from auth.users where id=uid)
   and p_ruta ~ ('^'||uid::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$')
   and (select count(*) from public.programas_enviados where user_id=uid and created_at>=((now() at time zone 'America/Santiago')::date::timestamp at time zone 'America/Santiago'))<5
   and (select count(*) from storage.objects where bucket_id='programas' and split_part(name,'/',1)=uid::text and created_at>=((now() at time zone 'America/Santiago')::date::timestamp at time zone 'America/Santiago'))<5;
 end if;
 -- Un administrador sin segundo factor no usa el permiso de dueño para saltarlo.
 if exists(select 1 from admin.administradores a where a.user_id=uid) then return public.programas_es_admin(); end if;
 return split_part(p_ruta,'/',1)=uid::text;
end;
$$;
drop policy if exists programas_storage_insert on storage.objects;
create policy programas_storage_insert on storage.objects for insert to authenticated
 with check(bucket_id='programas' and public.programa_archivo_permitido(name,true));
drop policy if exists programas_storage_select on storage.objects;
create policy programas_storage_select on storage.objects for select to authenticated
 using(bucket_id='programas' and public.programa_archivo_permitido(name,false));
drop policy if exists programas_storage_delete on storage.objects;
create policy programas_storage_delete on storage.objects for delete to authenticated
 using(bucket_id='programas' and public.programa_archivo_permitido(name,false));
-- Sin UPDATE: ni overwrite ni mover un archivo a la carpeta de otra persona.

create or replace function public.programa_ya_recibido(p_tenant text,p_sigla text,p_periodo text,p_sha256 text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.programas_enviados where tenant=p_tenant and coalesce(sigla,'')=coalesce(upper(nullif(btrim(p_sigla),'')),'') and periodo=btrim(p_periodo) and sha256=p_sha256);
$$;
create or replace function public.estado_programa_curso(p_tenant text,p_sigla text,p_periodo text,p_seccion integer)
returns text language plpgsql stable security definer set search_path='' as $$
declare a public.programas_alcances%rowtype; codigo text:=upper(nullif(btrim(p_sigla),''));
begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
 if not public.programas_tenant_valido(p_tenant) or p_periodo is null or p_periodo !~ '^[0-9]{4}-[12v]$'
    or (codigo is not null and codigo !~ '^[A-Z0-9_-]{1,40}$')
    or (p_seccion is not null and p_seccion not between 1 and 999) then
   raise exception 'Revisa los datos del programa' using errcode='22023';
 end if;
 if codigo is null then return 'disponible'; end if;
 select * into a from public.programas_alcances where tenant=p_tenant and sigla=codigo and periodo=p_periodo;
 if a.coordinado=false and p_seccion is null then return 'falta_seccion'; end if;
 if (case when a.coordinado then 0 else p_seccion end)=any(a.secciones_catalogo) then return 'publicado'; end if;
 -- Sin coordinación verificada una sección nunca bloquea otra.
 return coalesce((select estado from public.programas_enviados
  where tenant=p_tenant and sigla=codigo and periodo=p_periodo
    and (a.coordinado is true or seccion is not distinct from p_seccion)
    and estado in ('pendiente','publicado')
  order by (estado='publicado') desc limit 1),'disponible');
end;
$$;
drop function if exists public.enviar_programa(text,text,text,text,text,text,text,integer,text,integer,boolean);
create or replace function public.enviar_programa(p_tenant text,p_carrera text,p_sigla text,p_ramo text,p_periodo text,p_ramo_id text,p_ruta text,p_bytes integer,p_sha256 text,p_paginas integer,p_con_texto boolean,p_seccion integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.programas_enviados%rowtype;nuevo uuid;estado_curso text;codigo text;dia date:=(now() at time zone 'America/Santiago')::date;
begin
 if uid is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
 if not public.programas_tenant_valido(p_tenant) or p_ramo is null or char_length(btrim(p_ramo)) not between 1 and 160
  or p_periodo is null or btrim(p_periodo) !~ '^[0-9]{4}-[12v]$'
  or p_ramo_id is null or p_ramo_id !~ '^[A-Za-z0-9_-]{1,64}$'
  or p_ruta is null or p_ruta !~ ('^'||uid::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$')
  or p_bytes is null or p_bytes not between 5 and 10485760 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$'
  or p_paginas is null or p_paginas<1 or p_con_texto is null
  or (nullif(btrim(p_carrera),'') is not null and char_length(btrim(p_carrera))>100)
  or (nullif(btrim(p_sigla),'') is not null and upper(btrim(p_sigla)) !~ '^[A-Z0-9_-]{1,40}$') then
  raise exception 'Revisa los datos del programa' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('programas:'||uid::text,0));
 -- Reintentar una respuesta perdida confirma la MISMA fila y nunca borra su PDF.
 select * into p from public.programas_enviados where user_id=uid and ruta=p_ruta;
 if found then return jsonb_build_object('id',p.id); end if;
 codigo:=upper(nullif(btrim(p_sigla),''));
 -- El mismo lock serializa confirmaciones y la verificación de coordinación.
 perform pg_advisory_xact_lock(hashtextextended('programa-curso:'||p_tenant||':'||coalesce(codigo,'')||':'||btrim(p_periodo),0));
 estado_curso:=public.estado_programa_curso(p_tenant,codigo,btrim(p_periodo),p_seccion);
 if estado_curso='falta_seccion' then raise exception 'Indica la sección de este ramo' using errcode='22023'; end if;
 if estado_curso<>'disponible' or (codigo is null and exists(
   select 1 from public.programas_enviados where tenant=p_tenant and sigla is null and periodo=btrim(p_periodo)
     and lower(ramo)=lower(btrim(p_ramo)) and sha256=p_sha256 and seccion is not distinct from p_seccion
     and estado in ('pendiente','publicado')
 )) then return jsonb_build_object('duplicado',true); end if;
 if (select count(*) from public.programas_enviados e where e.user_id=uid and e.created_at>=dia::timestamp at time zone 'America/Santiago')>=5 then
  raise exception 'Puedes mandar hasta 5 programas al día. Intenta mañana.' using errcode='P0001';
 end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='programas' and o.name=p_ruta and (o.metadata->>'size')::bigint=p_bytes) then raise exception 'El archivo no terminó de subir. Intenta de nuevo.'; end if;
 nuevo:=replace(split_part(p_ruta,'/',2),'.pdf','')::uuid;
 insert into public.programas_enviados(id,user_id,tenant,carrera,sigla,ramo,periodo,ramo_id,ruta,bytes,sha256,paginas,con_texto,seccion)
 values(nuevo,uid,p_tenant,nullif(btrim(p_carrera),''),upper(nullif(btrim(p_sigla),'')),btrim(p_ramo),btrim(p_periodo),p_ramo_id,p_ruta,p_bytes,p_sha256,p_paginas,p_con_texto,p_seccion);
 return jsonb_build_object('id',nuevo);
end;
$$;
create or replace function public.mis_programas_enviados(p_ramo_id text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'tenant',tenant,'ramo',ramo,'periodo',periodo,'estado',estado,'motivo',motivo,'created_at',created_at) order by created_at desc),'[]'::jsonb)
 from public.programas_enviados where user_id=auth.uid() and ramo_id=p_ramo_id;
$$;
create or replace function public.admin_programas_enviados(p_tenant text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.programas_es_admin() then raise exception 'Sin acceso' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from
  (select id,tenant,carrera,sigla,ramo,periodo,seccion,ruta,bytes,paginas,con_texto,estado,motivo,created_at from public.programas_enviados
   where estado='pendiente' and (p_tenant is null or tenant=p_tenant) order by created_at limit 100) x);
end;
$$;
create or replace function public.admin_revisar_programa(p_id uuid,p_estado text,p_motivo text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.programas_es_admin() then raise exception 'Sin acceso' using errcode='42501'; end if;
 if p_estado is null or p_estado not in ('publicado','descartado') or p_motivo is null or char_length(btrim(p_motivo)) not between 3 and 240 then raise exception 'Elige un estado y explica el motivo'; end if;
 update public.programas_enviados set estado=p_estado,motivo=btrim(p_motivo),revisado_por=auth.uid(),revisado_at=now()
  where id=p_id and estado='pendiente';
 return found;
end;
$$;
create or replace function public.programas_cuenta_tiene_archivos()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from storage.objects where bucket_id='programas' and split_part(name,'/',1)=auth.uid()::text);
$$;
revoke all on function public.programas_cuenta_tiene_archivos() from public,anon;
grant execute on function public.programas_cuenta_tiene_archivos() to authenticated;
-- El FK borra filas, NO binarios. Exige Storage API antes de cualquier DELETE
-- de auth.users, incluso desde un cliente antiguo o un borrado administrativo.
create or replace function public.exigir_borrado_programas_cuenta()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('programas:'||old.id::text,0));
 if exists(select 1 from storage.objects where bucket_id='programas' and split_part(name,'/',1)=old.id::text) then
  raise exception 'Borra primero los programas de Storage con la API' using errcode='23503';
 end if;
 return old;
end;
$$;
revoke all on function public.exigir_borrado_programas_cuenta() from public,anon,authenticated;
drop trigger if exists exigir_borrado_programas_cuenta on auth.users;
create trigger exigir_borrado_programas_cuenta before delete on auth.users for each row execute function public.exigir_borrado_programas_cuenta();
revoke all on function public.programas_es_admin(),public.programa_archivo_permitido(text,boolean),public.programa_ya_recibido(text,text,text,text),public.estado_programa_curso(text,text,text,integer),public.enviar_programa(text,text,text,text,text,text,text,integer,text,integer,boolean,integer),public.mis_programas_enviados(text),public.admin_programas_enviados(text),public.admin_revisar_programa(uuid,text,text) from public,anon;
grant execute on function public.programas_es_admin(),public.programa_archivo_permitido(text,boolean),public.programa_ya_recibido(text,text,text,text),public.estado_programa_curso(text,text,text,integer),public.enviar_programa(text,text,text,text,text,text,text,integer,text,integer,boolean,integer),public.mis_programas_enviados(text),public.admin_programas_enviados(text),public.admin_revisar_programa(uuid,text,text) to authenticated;
revoke all on function public.programas_tenant_valido(text) from public,anon,authenticated;
-- Auditoría de acceso/borrado: no público; dueño carpeta propia; admin solo
-- aal2; no escritura directa; FK CASCADE; borrar binarios por API y recién
-- después auth.users. Reaplicar al final si se reinstalan bases y sus grants.
commit;
