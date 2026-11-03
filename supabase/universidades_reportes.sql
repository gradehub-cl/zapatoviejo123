-- Universidad = tenant, no facultad/carrera. Aplicar antes del merge.
-- Reaplicable. No reescribe reportes existentes ni cambia el consenso.
begin;
create or replace function public.codigo_universidad_perfil(p_valor text)
returns text language plpgsql immutable set search_path='' as $$
declare valor text:=lower(nullif(btrim(p_valor),''));
begin
 if valor is null then return null; end if;
 case valor
  when 'uc','u. católica · ingeniería','u. católica' then return 'uc';
  when 'fen','u. de chile · fen','u. de chile' then return 'fen';
  when 'uai','u. adolfo ibáñez' then return 'uai';
  when 'uandes','u. de los andes' then return 'uandes';
  when 'udd','u. del desarrollo' then return 'udd';
  else raise exception 'universidad desconocida: revisar antes de migrar' using errcode='22023';
 end case;
end;
$$;
revoke all on function public.codigo_universidad_perfil(text) from public,anon;
grant execute on function public.codigo_universidad_perfil(text) to authenticated;
create or replace function public.normalizar_universidad_perfil()
returns trigger language plpgsql set search_path='' as $$
begin
 new.universidad:=public.codigo_universidad_perfil(new.universidad);
 return new;
end;
$$;
revoke all on function public.normalizar_universidad_perfil() from public,anon,authenticated;
update public.profiles set universidad=public.codigo_universidad_perfil(universidad)
 where universidad is distinct from public.codigo_universidad_perfil(universidad);
alter table public.profiles drop constraint if exists profiles_universidad_tenant_check;
alter table public.profiles add constraint profiles_universidad_tenant_check
 check(universidad is null or universidad in ('uc','fen','uai','uandes','udd'));
drop trigger if exists profiles_universidad_codigo on public.profiles;
create trigger profiles_universidad_codigo before insert or update of universidad on public.profiles
 for each row execute function public.normalizar_universidad_perfil();

create or replace function public.submit_catalog_report(
  p_tenant text,
  p_carrera text,
  p_ramo text,
  p_ramo_norm text,
  p_ramo_sigla text,
  p_estructura jsonb,
  p_huella text,
  p_nota text default null,
  p_seccion integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  total numeric;
  sigla text := nullif(upper(trim(p_ramo_sigla)), '');
  tenant_guardado text;
  onboarding_guardado boolean;
begin
  if uid is null then
    raise exception 'No hay sesión activa';
  end if;

  if coalesce(trim(p_tenant), '') = ''
     or coalesce(trim(p_ramo), '') = ''
     or coalesce(trim(p_ramo_norm), '') = ''
     or coalesce(trim(p_huella), '') = '' then
    raise exception 'Faltan datos del reporte';
  end if;

  -- La interfaz trae maxlength, pero cualquiera puede llamar la RPC directo.
  -- Estos límites son la frontera real contra spam y payloads desproporcionados.
  if length(p_tenant) > 20
     or length(coalesce(p_carrera, '')) > 80
     or length(p_ramo) > 160
     or length(p_ramo_norm) > 160
     or length(coalesce(p_ramo_sigla, '')) > 40
     or length(p_huella) > 4000
     or length(coalesce(p_nota, '')) > 500 then
    raise exception 'El reporte excede el largo permitido';
  end if;

  -- El navegador puede estar en una pestaña vieja o tener una universidad por
  -- defecto mientras termina el onboarding. El tenant enviado no autoriza su
  -- propio reporte: se contrasta con el estado académico ya sincronizado.
  -- Si la nube aún no tiene el onboarding, el aporte queda pendiente en la app
  -- y se puede reintentar tras sincronizar; nunca se cuenta como FEN por defecto.
  select u.data->>'tenant', u.data->>'onboardingDone' = 'true'
    into tenant_guardado, onboarding_guardado
    from public.user_ramos as u
   where u.user_id = uid;
  if not coalesce(onboarding_guardado, false)
     or tenant_guardado is distinct from p_tenant then
    raise exception 'La universidad del reporte no coincide con la cuenta sincronizada';
  end if;

  if p_seccion is not null and p_seccion not between 1 and 999 then
    raise exception 'La sección debe estar entre 1 y 999';
  end if;

  if jsonb_typeof(p_estructura) <> 'array'
     or jsonb_array_length(p_estructura) not between 1 and 30
     or octet_length(p_estructura::text) > 32768 then
    raise exception 'La estructura debe tener entre 1 y 30 evaluaciones y un tamaño razonable';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_estructura) as e(valor)
    where jsonb_typeof(e.valor) <> 'object'
       or jsonb_typeof(e.valor->'nombre') <> 'string'
       or length(trim(e.valor->>'nombre')) not between 1 and 120
       or jsonb_typeof(e.valor->'peso') <> 'number'
       or case when jsonb_typeof(e.valor->'peso') = 'number'
          then (e.valor->>'peso')::numeric not between 0 and 100 else false end
       or (e.valor ? 'slots' and (
         jsonb_typeof(e.valor->'slots') <> 'number'
         or case when jsonb_typeof(e.valor->'slots') = 'number'
            then (e.valor->>'slots')::numeric <> trunc((e.valor->>'slots')::numeric)
              or (e.valor->>'slots')::numeric not between 1 and 100
            else false end
       ))
       or (e.valor ? 'min' and (
         jsonb_typeof(e.valor->'min') <> 'number'
         or case when jsonb_typeof(e.valor->'min') = 'number'
            then (e.valor->>'min')::numeric not between 1 and 7 else false end
       ))
       or (e.valor ? 'cap' and (
         jsonb_typeof(e.valor->'cap') <> 'number'
         or case when jsonb_typeof(e.valor->'cap') = 'number'
            then (e.valor->>'cap')::numeric not between 1 and 7 else false end
       ))
  ) then
    raise exception 'La estructura contiene una evaluación inválida';
  end if;

  select coalesce(sum((e.valor->>'peso')::numeric), 0)
    into total
    from jsonb_array_elements(p_estructura) as e(valor);

  if abs(total - 100) >= 0.05 then
    raise exception 'Las ponderaciones deben sumar 100%%';
  end if;

  -- Un nombre no es una sigla (ver es_sigla_uc más arriba).
  if p_tenant = 'uc' and not public.es_sigla_uc(sigla) then
    sigla := public.sigla_catalogo_uc(p_ramo);
  end if;

  -- Si el estudiante ya reportó ese ramo, actualiza su aporte sin reescribir
  -- la carrera histórica. Un reporte nuevo guarda null; p_carrera se conserva
  -- en la firma para apps viejas y no decide la identidad de la pauta.
  -- También toma reportes antiguos sin sigla por nombre, para migrarlos al
  -- identificador canónico la próxima vez que su autor los actualice.
  update public.catalog_reports
     set ramo = p_ramo,
         ramo_norm = p_ramo_norm,
         ramo_sigla = sigla,
         estructura = p_estructura,
         huella = public.huella_catalogo(p_estructura),
         nota = nullif(trim(p_nota), ''),
         -- Una app vieja no manda sección: no borra la que ya estaba.
         seccion = coalesce(p_seccion, seccion),
         updated_at = now()
   where user_id = uid
     and tenant = p_tenant
     and (
       (sigla is not null and ramo_sigla = sigla)
       or (ramo_sigla is null and ramo_norm = p_ramo_norm)
       -- Su reporte viejo con el nombre como sigla se corrige, no se duplica.
       or (ramo_norm = p_ramo_norm and not public.es_sigla_uc(ramo_sigla))
     );

  if not found then
    insert into public.catalog_reports
      (user_id, tenant, carrera, ramo, ramo_norm, ramo_sigla, estructura, huella, nota, seccion)
    values
      (uid, p_tenant, null, p_ramo, p_ramo_norm, sigla,
       p_estructura, public.huella_catalogo(p_estructura), nullif(trim(p_nota), ''), p_seccion);
  end if;
end;
$$;
revoke all on function public.submit_catalog_report(text,text,text,text,text,jsonb,text,text,integer) from public,anon;
grant execute on function public.submit_catalog_report(text,text,text,text,text,jsonb,text,text,integer) to authenticated;
commit;
