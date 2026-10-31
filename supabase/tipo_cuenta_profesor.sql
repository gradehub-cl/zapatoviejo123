-- Conversión manual de UNA cuenta existente. Revisar el correo antes de ejecutar.
-- No borra ramos, evaluaciones, notas ni historial dentro de user_ramos.data.
-- Aplicar antes del deploy de la app que concilia tipoCuenta con la nube.
begin;

-- Una pestaña con JS antiguo podría sobrescribir el JSON completo. Al escribir
-- como usuario autenticado, conservar el tipo profesor ya establecido. Lucas
-- puede revertir la conversión desde SQL Editor si algún día lo decide.
create or replace function public.conservar_tipo_cuenta_profesor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and old.data->>'tipoCuenta' = 'profesor' then
    new.data := jsonb_set(coalesce(new.data,'{}'::jsonb),'{tipoCuenta}','"profesor"'::jsonb,true);
  end if;
  return new;
end;
$$;
revoke all on function public.conservar_tipo_cuenta_profesor() from public, anon, authenticated;
drop trigger if exists conservar_tipo_cuenta_profesor on public.user_ramos;
create trigger conservar_tipo_cuenta_profesor before update on public.user_ramos
for each row execute function public.conservar_tipo_cuenta_profesor();

do $$
declare
  -- Sustituir solo este marcador por el correo de la cuenta a convertir.
  objetivo_correo text := 'CORREO_DE_LA_CUENTA';
  objetivo uuid;
  anterior jsonb;
begin
  if position('@' in objetivo_correo)=0 then
    raise exception 'Completa el correo de la cuenta a convertir';
  end if;
  select id into objetivo from auth.users
  where lower(email)=lower(trim(objetivo_correo));
  if objetivo is null then raise exception 'No se encontró la cuenta indicada'; end if;
  select data into anterior from public.user_ramos where user_id=objetivo for update;
  if not found then raise exception 'La cuenta no tiene fila en user_ramos'; end if;
  -- onboardingDone también: sin él, en un navegador sin copia local la app lo
  -- mandaba al onboarding en vez de a Clases (2026-10-31). Una cuenta ya
  -- convertida a la que le falte se corrige al volver a correr esto.
  if anterior->>'tipoCuenta' = 'profesor' and anterior->>'onboardingDone' = 'true' then return; end if;
  update public.user_ramos
  set data=jsonb_set(jsonb_set(
    jsonb_set(anterior,'{tipoCuenta}','"profesor"'::jsonb,true),
    '{onboardingDone}','true'::jsonb,true),
    '{_rev}',to_jsonb(coalesce((anterior->>'_rev')::integer,0)+1),true)
  where user_id=objetivo;
end;
$$;
commit;
