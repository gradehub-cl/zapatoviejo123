-- Permisos de las tablas base: las que se crearon desde el Dashboard antes de
-- que el SQL viviera en el repo, así que ningún otro archivo las declara.
--
-- Supabase les dio a anon y authenticated todos los privilegios. La app usa
-- SELECT, INSERT, UPDATE y DELETE, siempre detrás de RLS. Los otros tres no los
-- usa nada y TRUNCATE salta RLS: vacía la tabla entera sin mirar políticas.
-- PostgREST no expone TRUNCATE, así que hoy no hay una puerta abierta; esto es
-- cerrar la que no hace falta (#892, hallazgo 9b). REFERENCES y TRIGGER son
-- crear FK y triggers sobre la tabla, y tampoco los pide la app. Quitar TRIGGER
-- no apaga los triggers que ya existen.
--
-- Se puede correr de nuevo: revocar lo que ya no está no hace nada.
revoke truncate, references, trigger
  on public.user_ramos, public.profiles, public.catalog_reports
  from public, anon, authenticated;
