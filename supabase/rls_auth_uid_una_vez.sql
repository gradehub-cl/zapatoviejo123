-- RLS: auth.uid() se evalúa una vez por consulta y no una vez por fila.
--
-- El advisor de rendimiento de Supabase (lint 0003, auth_rls_initplan) marca 15
-- políticas que comparan contra auth.uid() directamente. Escrito así, Postgres
-- puede llamar a la función por cada fila que revisa; envuelto en un SELECT lo
-- resuelve una sola vez (InitPlan) y reutiliza el valor. Ya lo recomendaba el
-- informe del 2026-10-28 (docs/revisiones/supabase-2026-10-28/INFORME.md) y es
-- el patrón que usan las políticas más nuevas del repo (anuncios_cierre.sql).
--
-- Los permisos quedan exactamente iguales: ALTER POLICY solo reemplaza la
-- expresión y conserva el comando (SELECT/INSERT/UPDATE/DELETE) y los roles de
-- cada política. Sin sesión, (select auth.uid()) es NULL igual que auth.uid(),
-- y NULL = columna no deja pasar ninguna fila.
--
-- Las políticas de profiles, user_ramos y catalog_reports se crearon desde el
-- Dashboard antes de que el SQL viviera en el repo; las de encuestas vienen de
-- encuestas.sql, que queda con el mismo patrón.
--
-- Se puede correr de nuevo: deja las mismas expresiones.
--
-- Cómo comprobar después de aplicar (no debe devolver filas):
--   select tablename, policyname from pg_policies
--    where schemaname='public'
--      and tablename in ('profiles','user_ramos','catalog_reports',
--                        'encuesta_respuestas','encuesta_visitas','encuestas_cuentas')
--      and (coalesce(qual,'') ~ 'auth\.uid\(\)' and coalesce(qual,'') !~* 'select auth\.uid\(\)'
--        or coalesce(with_check,'') ~ 'auth\.uid\(\)' and coalesce(with_check,'') !~* 'select auth\.uid\(\)');
begin;

alter policy profiles_select_own on public.profiles using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy profiles_delete_own on public.profiles using ((select auth.uid()) = id);

alter policy user_ramos_select_own on public.user_ramos using ((select auth.uid()) = user_id);
alter policy user_ramos_insert_own on public.user_ramos with check ((select auth.uid()) = user_id);
alter policy user_ramos_update_own on public.user_ramos using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy user_ramos_delete_own on public.user_ramos using ((select auth.uid()) = user_id);

alter policy reports_select_own on public.catalog_reports using ((select auth.uid()) = user_id);
alter policy reports_insert_own on public.catalog_reports with check ((select auth.uid()) = user_id);
alter policy reports_update_own on public.catalog_reports using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy reports_delete_own on public.catalog_reports using ((select auth.uid()) = user_id);

alter policy encuesta_respuesta_propia on public.encuesta_respuestas using (user_id = (select auth.uid()));
alter policy encuesta_visita_propia on public.encuesta_visitas using (user_id = (select auth.uid()));
alter policy encuestas_cuenta_propia on public.encuestas_cuentas using (user_id = (select auth.uid()));

commit;
