-- Apellido en el registro (Lucas, 2026-11-18).
--
-- APLÍCALO antes de mergear el PR que lo escribe. Se puede correr dos veces.
-- Columna aditiva y nullable: las cuentas que ya existen quedan en null y no se
-- les pide nada. Se exige en el onboarding a quien entra con correo; con Google
-- o Apple llega escrito si el proveedor lo trae. RLS de profiles sin cambios:
-- cada cuenta lee y escribe solo su fila, y la fila se borra con la cuenta.
alter table public.profiles
  add column if not exists apellido text check (char_length(apellido) between 1 and 60);

comment on column public.profiles.apellido is
  'Apellido escrito al crear la cuenta. Obligatorio solo al entrar con correo.';
