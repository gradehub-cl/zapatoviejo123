-- Entrar con Google o Apple a una cuenta creada con correo deja sin efecto la
-- contraseña anterior y cierra las sesiones que esa cuenta tenía abiertas.
--
-- POR QUÉ. La confirmación de correo al registrarse está apagada, así que
-- cualquiera puede crear una cuenta con correo y contraseña usando el Gmail de
-- otra persona. Supabase marca ese correo como confirmado y, cuando la dueña
-- real entra después con Google, une su Google a ESA cuenta: la que creó otro,
-- con una contraseña que la dueña no conoce. El que la creó sigue entrando con
-- su contraseña y ve todo lo que ella anote. Lucas lo reprodujo en producción
-- el 2026-11-23 con un Gmail desechable.
--
-- QUÉ HACE. Cuando se agrega una identidad de Google o Apple a un usuario que ya
-- tenía identidad de correo:
--   1. Borra la contraseña (`encrypted_password = ''`). Con eso, entrar con la
--      contraseña anterior responde «credenciales inválidas».
--   2. Borra las sesiones que ese usuario ya tenía (y con ellas sus refresh
--      tokens). Un token de acceso ya emitido dura hasta que vence (1 hora).
-- La sesión de Google o Apple que se está abriendo no se toca: Supabase la crea
-- DESPUÉS de insertar la identidad, en la misma transacción.
--
-- COSTO PARA CUENTAS LEGÍTIMAS. Quien creó su cuenta con correo y un día toca
-- «Continuar con Google» pierde la contraseña: sigue entrando con Google, y si
-- quiere volver a usar contraseña la elige con «¿Olvidaste tu contraseña?». El
-- mensaje de contraseña incorrecta ya le dice que entre con Google o Apple.
-- Pasa una sola vez por cuenta (solo al AGREGAR la identidad, no en cada
-- ingreso).
--
-- NO ES RETROACTIVO. Las cuentas que ya quedaron unidas antes de aplicar esto no
-- se tocan: se revisan con la consulta del PR y se decide aparte.
--
-- LO QUE NO CUBRE. Si la dueña real nunca usa Google ni Apple y recupera la
-- cuenta con «¿Olvidaste tu contraseña?», la contraseña cambia pero las sesiones
-- del que la creó siguen abiertas. Lo cierra de verdad volver a pedir la
-- confirmación de correo al registrarse (necesita un SMTP propio).
--
-- Reaplicable: reemplaza la función y vuelve a crear el disparador.

create or replace function public.gh_union_sin_clave_previa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider not in ('google', 'apple') then
    return new;
  end if;
  if not exists (
    select 1 from auth.identities i
    where i.user_id = new.user_id and i.provider = 'email' and i.id <> new.id
  ) then
    return new;
  end if;
  update auth.users
     set encrypted_password = ''
   where id = new.user_id
     and coalesce(encrypted_password, '') <> '';
  delete from auth.sessions where user_id = new.user_id;
  return new;
end;
$$;

alter function public.gh_union_sin_clave_previa() owner to postgres;
revoke all on function public.gh_union_sin_clave_previa() from public, anon, authenticated;

drop trigger if exists gh_union_sin_clave_previa on auth.identities;
create trigger gh_union_sin_clave_previa
  after insert on auth.identities
  for each row execute function public.gh_union_sin_clave_previa();
