-- Perfil de profesor o empresa. Pedido de Lucas del 2026-10-23, base de la
-- issue #643 (perfiles públicos): tipo (profesor o empresa), redes y sitio web,
-- ramos y universidades, y si el perfil se muestra en sus anuncios.
--
-- Aplícalo en el SQL Editor de Supabase DESPUÉS de clases_particulares.sql y
-- ANTES de mergear el PR que lo usa. Es aditivo y reaplicable: todo parte
-- vacío y ningún perfil queda público hasta que su profesor lo activa.
--
-- Las mismas sentencias están en clases_particulares.sql: ese archivo hace
-- `revoke all` sobre tutor_perfiles, y reaplicarlo sin ellas le quitaría al
-- profesor el permiso de editar su perfil (la lección de #559).

begin;

-- PERFIL DE PROFESOR O EMPRESA (2026-10-23, pedido de Lucas; base de #643).
-- Aditivo: todo parte vacío y el perfil NO es público hasta que el profesor lo
-- activa (consentimiento explícito, #643 punto 1). Mismas sentencias que
-- perfil_profesor.sql, que sirve como delta. Los archivos de material gratis y
-- los testimonios de #643 no van acá.
alter table public.tutor_perfiles add column if not exists tipo_perfil text
  check (tipo_perfil is null or tipo_perfil in ('profesor', 'empresa'));
alter table public.tutor_perfiles add column if not exists instagram text
  check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');
alter table public.tutor_perfiles add column if not exists sitio_web text
  check (sitio_web is null or (sitio_web ~ '^https://[^[:space:]/@]+[.][^[:space:]@]+$' and char_length(sitio_web) <= 160));
alter table public.tutor_perfiles add column if not exists universidades text[]
  check (universidades is null or (cardinality(universidades) <= 5 and universidades <@ array['fen', 'uc', 'uai', 'uandes', 'udd']));
-- `add column if not exists` no toca el check de una columna que ya existe: se
-- reemplaza por nombre para que una universidad nueva entre al reaplicar.
alter table public.tutor_perfiles drop constraint if exists tutor_perfiles_universidades_check;
alter table public.tutor_perfiles add constraint tutor_perfiles_universidades_check
  check (universidades is null or (cardinality(universidades) <= 5 and universidades <@ array['fen', 'uc', 'uai', 'uandes', 'udd']));
alter table public.tutor_perfiles add column if not exists ramos_siglas text[];
alter table public.tutor_perfiles add column if not exists perfil_publico boolean not null default false;

-- Las siglas, como en los anuncios: hasta 20, cada una de 2 a 24 caracteres.
create or replace function public.siglas_perfil_validas(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is null or (cardinality(p) <= 20 and not exists (
    select 1 from unnest(p) s where s !~ '^[A-Z0-9-]{2,24}$'));
$$;
alter table public.tutor_perfiles drop constraint if exists tutor_perfiles_ramos_siglas_check;
alter table public.tutor_perfiles add constraint tutor_perfiles_ramos_siglas_check
  check (public.siglas_perfil_validas(ramos_siglas));

-- Asociación opcional: NULL conserva exactamente la lista antigua, sin backfill.
alter table public.tutor_perfiles add column if not exists ramos_por_universidad jsonb;
create or replace function public.ramos_por_universidad_validos(p jsonb,unis text[])
returns boolean language plpgsql immutable set search_path='' as $$
declare fila record; total integer:=0; codigos text[];
begin
  if p is null then return true; end if;
  if jsonb_typeof(p)<>'object' then return false; end if;
  for fila in select * from jsonb_each(p) loop
    if not (fila.key=any(array['uc','fen','uai','uandes','udd']))
      or not coalesce(fila.key=any(unis),false) or jsonb_typeof(fila.value)<>'array' then return false; end if;
    total:=total+jsonb_array_length(fila.value);
    if total>20 then return false; end if;
    if exists(select 1 from jsonb_array_elements(fila.value) e where jsonb_typeof(e)<>'string') then return false; end if;
    select coalesce(array_agg(e),'{}'::text[]) into codigos from jsonb_array_elements_text(fila.value) e;
    if not public.siglas_perfil_validas(codigos) then return false; end if;
  end loop;
  return true;
end; $$;
revoke all on function public.ramos_por_universidad_validos(jsonb,text[]) from public,anon;
grant execute on function public.ramos_por_universidad_validos(jsonb,text[]) to authenticated;
alter table public.tutor_perfiles drop constraint if exists tutor_perfiles_ramos_por_universidad_check;
alter table public.tutor_perfiles add constraint tutor_perfiles_ramos_por_universidad_check
  check(public.ramos_por_universidad_validos(ramos_por_universidad,universidades));
-- Trigger invocador: solo deriva NEW, no consulta ni actualiza otros perfiles.
create or replace function public.unir_ramos_perfil()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.ramos_por_universidad is not null
    and public.ramos_por_universidad_validos(new.ramos_por_universidad,new.universidades) then
    select coalesce(array_agg(sigla order by uni_pos,sigla_pos),'{}'::text[]) into new.ramos_siglas
    from (select distinct on (e.sigla) e.sigla,u.uni_pos,e.sigla_pos
      from unnest(new.universidades) with ordinality u(uni,uni_pos)
      cross join lateral jsonb_array_elements_text(coalesce(new.ramos_por_universidad->u.uni,'[]'::jsonb)) with ordinality e(sigla,sigla_pos)
      order by e.sigla,u.uni_pos,e.sigla_pos) unico;
  end if;
  return new;
end; $$;
revoke all on function public.unir_ramos_perfil() from public,anon,authenticated;
drop trigger if exists tutor_perfiles_unir_ramos on public.tutor_perfiles;
create trigger tutor_perfiles_unir_ramos before insert or update on public.tutor_perfiles
  for each row execute function public.unir_ramos_perfil();

-- El profesor lee y edita lo suyo (las políticas propias ya lo limitan).
grant select (tipo_perfil, instagram, sitio_web, universidades, ramos_siglas, ramos_por_universidad, perfil_publico)
  on public.tutor_perfiles to authenticated;
grant update (tipo_perfil, instagram, sitio_web, universidades, ramos_siglas, ramos_por_universidad, perfil_publico)
  on public.tutor_perfiles to authenticated;

-- Lo que ve el estudiante desde un anuncio. El catálogo no conoce al autor, así
-- que se pide por anuncio, como el logo. Solo de un anuncio publicado y vigente,
-- de un profesor aprobado que activó su perfil. Nunca el user_id ni el correo:
-- los otros anuncios van por su id.
-- Se conserva la firma de entrada. Reaplicable incluso desde la salida antigua.
drop function if exists public.perfil_publico_de_anuncio(uuid);
create or replace function public.perfil_publico_de_anuncio(p_anuncio_id uuid)
returns table (nombre_publico text, presentacion text, tipo_perfil text, instagram text, sitio_web text,
               universidades text[], ramos_siglas text[], logo_path text, anuncios uuid[], ramos_por_universidad jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select p.nombre_publico, p.presentacion, p.tipo_perfil, p.instagram, p.sitio_web,
         p.universidades, p.ramos_siglas, p.logo_aprobado_path,
         array(select b.id from public.tutor_anuncios b
               where b.autor_id = p.user_id and b.estado = 'publicado'
                 and (b.vence_at is null or b.vence_at > now())
               order by b.publicado_at desc),p.ramos_por_universidad
  from public.tutor_anuncios a
  join public.tutor_perfiles p on p.user_id = a.autor_id
  where a.id = p_anuncio_id
    and a.estado = 'publicado'
    and (a.vence_at is null or a.vence_at > now())
    and p.estado = 'aprobado'
    and p.perfil_publico;
$$;
revoke all on function public.perfil_publico_de_anuncio(uuid) from public;
grant execute on function public.perfil_publico_de_anuncio(uuid) to anon, authenticated;

commit;
