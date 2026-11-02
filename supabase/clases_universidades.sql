-- Universidades del marketplace de clases particulares: la del anuncio, la de
-- sus métricas y las que el profesor declara en su perfil. Suma la UDD.
--
-- Aplícalo ANTES de mergear el PR que la ofrece: desde ese deploy el editor y
-- el perfil muestran la UDD. Reaplicable: reemplaza los tres checks por nombre,
-- y como el nuevo solo amplía, las filas que ya existen lo cumplen.
--
-- Son copia EXACTA de las sentencias de clases_particulares.sql y
-- perfil_profesor.sql (tests/clases-universidades-sql.test.js exige que sean
-- idénticas). No reapliques clases_particulares.sql para esto:
-- campanas_gratis.sql y paneles_historial.sql redefinen funciones suyas que
-- producción ya usa, y reaplicarlo solo las devuelve a la versión anterior.

begin;

alter table public.tutor_anuncios drop constraint if exists tutor_anuncios_tenant_check;
alter table public.tutor_anuncios add constraint tutor_anuncios_tenant_check
  check (tenant in ('fen', 'uc', 'uai', 'uandes', 'udd'));
alter table public.anuncio_metricas drop constraint if exists anuncio_metricas_tenant_check;
alter table public.anuncio_metricas add constraint anuncio_metricas_tenant_check
  check (tenant in ('fen', 'uc', 'uai', 'uandes', 'udd'));
alter table public.tutor_perfiles drop constraint if exists tutor_perfiles_universidades_check;
alter table public.tutor_perfiles add constraint tutor_perfiles_universidades_check
  check (universidades is null or (cardinality(universidades) <= 5 and universidades <@ array['fen', 'uc', 'uai', 'uandes', 'udd']));

commit;
