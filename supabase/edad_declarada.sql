-- Declaración de edad al crear cuenta.
--
-- APLÍCALO UNA VEZ en el SQL Editor de Supabase ANTES de mergear el PR que
-- escribe esta columna. Cloudflare Pages no ejecuta SQL.
--
-- POR QUÉ 14 Y NO 13. La referencia que se suele citar es COPPA, que en
-- Estados Unidos pone la línea en 13. GradeHub es chileno y la Ley 21.719 la
-- pone en 14: bajo esa edad el tratamiento de datos necesita autorización de
-- quien tenga el cuidado personal. 14 cumple las dos.
--
-- QUÉ GUARDA Y QUÉ NO. Solo la marca de tiempo de la declaración. NO se pide
-- ni se guarda fecha de nacimiento: para saber que alguien puede usar la app
-- basta con que lo declare, y pedir el dato exacto sería recolectar más de lo
-- necesario para el fin — justo lo contrario de lo que exige la ley.
alter table public.profiles
  add column if not exists edad_declarada_en timestamptz;

comment on column public.profiles.edad_declarada_en is
  'Cuándo la persona declaró tener 14 años o más. Sin fecha de nacimiento: solo la declaración.';

-- EDAD Y GENERACIÓN (#697, decisión de Lucas del 2026-10-12). Desde ahora sí
-- se guardan: la edad que la persona elige en la ruleta del onboarding y su
-- generación, el año en que entró a la universidad. Sirven para comprobar la
-- edad mínima y para estadísticas en totales por edad y generación; la política
-- de privacidad lo dice. Siguen sin fecha de nacimiento. Son columnas aditivas
-- y nullable: las cuentas que ya existen quedan en null y no se les pide nada.
-- RLS de profiles: cada cuenta lee y escribe solo su fila.
--
-- APLÍCALO antes de mergear el PR que las escribe. Se puede correr dos veces.
alter table public.profiles
  add column if not exists edad smallint check (edad between 14 and 120);
alter table public.profiles
  add column if not exists generacion smallint check (generacion between 2000 and 2100);

comment on column public.profiles.edad is
  'Edad que la persona eligió al crear su cuenta. Para la edad mínima y estadísticas en totales.';
comment on column public.profiles.generacion is
  'Año de ingreso a la universidad, elegido al crear la cuenta. Para estadísticas en totales.';
