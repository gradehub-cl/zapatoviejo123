-- GradeHub: revision de solo lectura, 28-10-2026.
-- Ejecutar cada bloque individualmente con rol postgres en SQL Editor.
-- No es una migracion: solo estadisticas y metadatos. No devuelve correos, tokens ni notas individuales.
-- Las cifras cambian con el uso de la app; visitas_diarias comienza el 12-10-2026.

-- health
begin read only;
set local statement_timeout = '12s';
select now() as captured_at, pg_database_size(current_database()) as database_bytes, (select stats_reset from pg_stat_database where datname=current_database()) as stats_reset, (select jsonb_agg(extname) from pg_extension) as extensions;
commit;

-- accounts
begin read only;
set local statement_timeout = '12s';
with s as (select user_id,data,updated_at from public.user_ramos),
r as (select s.user_id,s.data->>'tenant' tenant, e as ramo from s cross join lateral jsonb_array_elements(case when jsonb_typeof(data->'ramos')='array' then data->'ramos' else '[]'::jsonb end)e),
g as(select user_id,ramo,e as grupo from r cross join lateral jsonb_array_elements(case when jsonb_typeof(ramo->'grupos')='array' then ramo->'grupos' else '[]'::jsonb end)e)
select jsonb_build_object(
'auth_accounts',(select count(*) from auth.users),
'profiles',(select count(*) from public.profiles),
'states',(select count(*) from s),
'auth_without_state',(select count(*) from auth.users a where not exists(select 1 from s where s.user_id=a.id)),
'auth_without_profile',(select count(*) from auth.users a where not exists(select 1 from public.profiles p where p.id=a.id)),
'state_without_auth',(select count(*) from s where not exists(select 1 from auth.users a where a.id=s.user_id)),
'states_by_type_tenant',(select jsonb_agg(t) from(select coalesce(data->>'tipoCuenta','estudiante') tipo,coalesce(data->>'tenant','ausente') tenant,count(*) cuentas,count(*)filter(where jsonb_array_length(case when jsonb_typeof(data->'ramos')='array' then data->'ramos' else '[]'::jsonb end)>0) con_ramos from s group by 1,2)t),
'state_shape',(select jsonb_agg(t)from(select jsonb_typeof(data) tipo,jsonb_typeof(data->'ramos') tipo_ramos,count(*) cuentas from s group by 1,2)t),
'course_keys',(select jsonb_agg(t)from(select k,count(*) n from r cross join lateral jsonb_object_keys(case when jsonb_typeof(ramo)='object' then ramo else '{}'::jsonb end) k group by k order by n desc)t),
'group_keys',(select jsonb_agg(t)from(select k,count(*) n from g cross join lateral jsonb_object_keys(case when jsonb_typeof(grupo)='object' then grupo else '{}'::jsonb end) k group by k order by n desc)t),
'top_state_keys',(select jsonb_agg(t)from(select k,count(*) n from s cross join lateral jsonb_object_keys(case when jsonb_typeof(data)='object' then data else '{}'::jsonb end)k group by k order by n desc)t)
) as result;
commit;

-- activity
begin read only;
set local statement_timeout = '12s';
with d as(select (now() at time zone 'America/Santiago')::date hoy),
v as(select v.* from public.visitas_diarias v),
a as(select user_id, min(dia) primero,max(dia) ultimo,count(*) dias from v group by 1)
select jsonb_build_object('date_chile',(select hoy from d),'coverage_start',(select min(dia)from v),'coverage_end',(select max(dia)from v),'user_days',(select count(*) from v),'distinct_accounts',(select count(*)from a),
'last_7_unique',(select count(distinct user_id)from v,d where dia between hoy-6 and hoy),
'previous_7_unique',(select count(distinct user_id)from v,d where dia between hoy-13 and hoy-7),
'last_30_unique',(select count(distinct user_id)from v,d where dia between hoy-29 and hoy),
'by_day',(select jsonb_agg(t order by dia)from(select dia,count(*) cuentas from v group by 1)t),
'frequency_last_14',(select jsonb_agg(t)from(select dias,count(*) cuentas from(select user_id,count(*) dias from v,d where dia between hoy-13 and hoy group by 1)x group by 1 order by 1)t),
'new_by_week',(select jsonb_agg(t)from(select date_trunc('week',created_at at time zone 'America/Santiago')::date semana,count(*) cuentas from auth.users group by 1 order by 1)t)
) result;
commit;

-- courses
-- origen_programa es exploratorio: origen no contiene tipo=programa. No usarlo como cobertura oficial.
begin read only;
set local statement_timeout = '12s';
with s as(select * from public.user_ramos where data->>'tipoCuenta' is distinct from 'profesor'),
r as(select s.user_id,s.data->>'tenant' tenant,x as r from s cross join lateral jsonb_array_elements(data->'ramos')x),
c as(select user_id,tenant,r,x as c from r cross join lateral jsonb_array_elements(case when jsonb_typeof(r->'categorias')='array' then r->'categorias' else '[]'::jsonb end)x),
n as(select user_id,tenant,r,c,x as n from c cross join lateral jsonb_array_elements(case when jsonb_typeof(c->'notas')='array' then c->'notas' else '[]'::jsonb end)x),
rc as(select r.*,cat.creditos catalogo_creditos from r left join public.catalogo_uc cat on r.tenant='uc' and upper(btrim(r.r->>'sigla'))=cat.sigla)
select jsonb_build_object(
'by_tenant',(select jsonb_agg(x)from(select tenant,count(*) ramos,count(distinct user_id) cuentas,count(*)filter(where nullif(btrim(r->>'sigla'),'') is null) sin_sigla,count(*)filter(where jsonb_typeof(r->'creditos') is distinct from 'number') sin_creditos,count(*)filter(where r->'creditos'='0'::jsonb) creditos_cero,count(*)filter(where coalesce(r->>'seccion','')!~'^[1-9][0-9]*$') sin_seccion,count(*)filter(where r->'origen'->>'tipo'='programa') origen_programa from r group by 1)x),
'uc_credits',(select jsonb_build_object('ramos',count(*),'match_catalog',count(*)filter(where catalogo_creditos is not null),'missing_with_catalog',count(*)filter(where jsonb_typeof(r->'creditos')is distinct from 'number' and catalogo_creditos is not null),'numeric_mismatch',count(*)filter(where case when jsonb_typeof(r->'creditos')='number' then (r->>'creditos')::numeric<>catalogo_creditos else false end))from rc where tenant='uc'),
'health',(select jsonb_build_object('categories',count(*),'without_notes_array',count(*)filter(where jsonb_typeof(c->'notas')is distinct from 'array'))from c),
'grades_health',(select jsonb_build_object('slots',count(*),'filled',count(*)filter(where jsonb_typeof(n->'valor')='number'),'accounts_with_grades',count(distinct user_id)filter(where jsonb_typeof(n->'valor')='number'),'invalid_type',count(*)filter(where jsonb_typeof(n->'valor')is distinct from 'number' and jsonb_typeof(n->'valor')is distinct from 'null'),'out_of_range',count(*)filter(where case when jsonb_typeof(n->'valor')='number' then (n->>'valor')::numeric<1 or (n->>'valor')::numeric>7 else false end))from n),
'duplicate_course_ids',(select count(*)from(select user_id,r->>'id' from r group by 1,2 having count(*)>1)x),
'origin_keys',(select jsonb_agg(x)from(select r->'origen' as origen,count(*) n from r group by 1 order by n desc limit 25)x),
'category_keys',(select jsonb_agg(x)from(select k,count(*) n from c cross join lateral jsonb_object_keys(c) k group by 1 order by n desc)x),
'top_uc',(select jsonb_agg(x)from(select cat.sigla,cat.nombre,count(*) ramos,count(distinct user_id) cuentas,count(*)filter(where coalesce(r->>'seccion','')!~'^[1-9][0-9]*$') sin_seccion,count(*)filter(where jsonb_typeof(r->'creditos') is distinct from 'number') sin_creditos from r join public.catalogo_uc cat on r.tenant='uc' and upper(btrim(r->>'sigla'))=cat.sigla group by 1,2 order by cuentas desc limit 20)x)
)result;
commit;

-- operations
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'feedback',(select jsonb_agg(x)from(select categoria,count(*) cantidad,count(*)filter(where solucionado_at is not null) resueltos,min(created_at)filter(where solucionado_at is null) pendiente_mas_antiguo,count(*)filter(where solucionado_at is not null and solucion_vista_at is null) aviso_sin_ver from public.user_feedback group by 1)x),
'proposals',(select jsonb_agg(x)from(select tipo,status,count(*) cantidad,min(created_at) desde,max(created_at) hasta from public.agent_pauta_proposals group by 1,2)x),
'ratings',(select jsonb_build_object('ratings',count(*),'accounts',count(distinct user_id),'course_sections',count(distinct(tenant,ramo_clave,seccion,periodo)),'five_stars',count(*)filter(where estrellas=5),'with_other',count(*)filter(where otro is not null or cardinality(otros)>0))from public.profesor_calificaciones),
'teacher_contributions',(select count(*)from public.profesor_aportes),
'teacher_profiles',(select jsonb_agg(x)from(select estado,count(*) cantidad,count(*)filter(where panel_alumnos) con_panel,count(*)filter(where alumnos_ejemplo) modo_ejemplo from public.tutor_perfiles group by 1)x),
'teacher_students',(select count(*)from public.profesor_alumnos),
'ads',(select jsonb_agg(x)from(select estado,count(*) cantidad,count(*)filter(where descuento_gradehub_pct is not null) descuento,count(*)filter(where vence_at<now()) expirados from public.tutor_anuncios group by 1)x),
'errors',(select jsonb_agg(x)from(select tipo,plataforma,count(*) cantidad,count(distinct user_id) cuentas,min(creado) desde,max(creado) hasta from public.errores_app group by 1,2)x),
'reports',(select jsonb_build_object('total',count(*),'accounts',count(distinct user_id),'with_section',count(*)filter(where seccion is not null),'last7',count(*)filter(where updated_at>=now()-interval '7 days'))from public.catalog_reports),
'surveys',(select jsonb_agg(x)from(select estado,count(*) cantidad from public.encuestas group by 1)x),
'survey_answers',(select count(*)from public.encuesta_respuestas)
)result;
commit;

-- priorities
-- approved_teacher_without_teacher_type NO es un error: un estudiante puede tener perfil de profesor aprobado.
begin read only;
set local statement_timeout = '12s';
with r as(select u.user_id,u.updated_at,u.data->>'tenant' tenant,x r from public.user_ramos u cross join lateral jsonb_array_elements(u.data->'ramos')x where u.data->>'tipoCuenta' is distinct from 'profesor'),
cs as(select user_id,tenant,r,x c from r cross join lateral jsonb_array_elements(case when jsonb_typeof(r->'categorias')='array' then r->'categorias' else '[]'::jsonb end)x),
ns as(select user_id,tenant,r,c,x n from cs cross join lateral jsonb_array_elements(c->'notas')x),
g as(select distinct user_id from ns where jsonb_typeof(n->'valor')='number'),
v as(select distinct user_id from public.visitas_diarias where dia between (now() at time zone 'America/Santiago')::date-6 and (now() at time zone 'America/Santiago')::date)
select jsonb_build_object(
'uc_missing_credits',(select jsonb_build_object('courses',count(*),'accounts',count(distinct r.user_id),'accounts_active7',count(distinct r.user_id)filter(where v.user_id is not null),'courses_active7',count(*)filter(where v.user_id is not null),'accounts_with_any_grades',count(distinct r.user_id)filter(where g.user_id is not null))from r join public.catalogo_uc cat on cat.sigla=upper(btrim(r->>'sigla')) left join v on v.user_id=r.user_id left join g on g.user_id=r.user_id where tenant='uc' and jsonb_typeof(r->'creditos')is distinct from 'number' and cat.creditos is not null),
'missing_credit_top',(select jsonb_agg(t)from(select cat.sigla,cat.nombre,cat.creditos,count(*) courses from r join public.catalogo_uc cat on cat.sigla=upper(btrim(r->>'sigla')) where tenant='uc' and jsonb_typeof(r->'creditos')is distinct from 'number' and cat.creditos is not null group by 1,2,3 order by courses desc limit 12)t),
'no_rubric',(select jsonb_agg(t)from(select tenant,count(*) ramos,count(distinct user_id) cuentas from r where jsonb_array_length(r->'categorias')=0 group by 1)t),
'profile_state_mismatch',(select jsonb_build_object('state_without_profile',count(*)filter(where p.id is null),'completed_without_profile',count(*)filter(where p.id is null and u.data->>'onboardingDone'='true'),'active7_without_profile',count(*)filter(where p.id is null and v.user_id is not null),'professor_states',count(*)filter(where u.data->>'tipoCuenta'='profesor'),'approved_teacher_without_teacher_type',count(*)filter(where tp.estado='aprobado' and u.data->>'tipoCuenta' is distinct from 'profesor'))from public.user_ramos u left join public.profiles p on p.id=u.user_id left join v on v.user_id=u.user_id left join public.tutor_perfiles tp on tp.user_id=u.user_id),
'rating_funnel',(select jsonb_build_object('uc_courses',count(*),'uc_accounts',count(distinct user_id),'courses_with_section',count(*)filter(where coalesce(r->>'seccion','')~'^[1-9][0-9]*$'),'accounts_with_section',count(distinct user_id)filter(where coalesce(r->>'seccion','')~'^[1-9][0-9]*$'))from r where tenant='uc'),
'state_note_coverage',(select jsonb_agg(t)from(select coalesce(data->>'tenant','ausente') tenant,count(*) accounts,count(*)filter(where data->>'onboardingDone'='true') onboarded,count(*)filter(where g.user_id is not null) with_grades,count(*)filter(where v.user_id is not null) active7 from public.user_ramos u left join g on g.user_id=u.user_id left join v on v.user_id=u.user_id where data->>'tipoCuenta' is distinct from 'profesor' group by 1)t)
)result;
commit;

-- index_and_errors
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'catalog_indexes',(select jsonb_agg(t)from(select indexname,indexdef from pg_indexes where schemaname='public' and tablename='catalogo_uc')t),
'error_groups',(select jsonb_agg(t)from(select tipo,case when mensaje ~* '(not defined|find variable)' then 'Referencia a variable inexistente' when mensaje ~* '(fetch|network|load failed|connection)' then 'Red o carga de recurso' when mensaje ~* '(permission|denied|42501)' then 'Permisos' when mensaje ~* '(function .*does not exist|PGRST202)' then 'RPC ausente' when mensaje ~* '(null|undefined)' then 'Acceso a valor null/undefined' else 'Otro: requiere inspección controlada' end clase,count(*) eventos,count(distinct user_id) cuentas,max(creado) ultimo,count(*)filter(where creado>=now()-interval '7 days') last7 from public.errores_app group by 1,2 order by eventos desc)t),
'critical_rpcs',(select jsonb_agg(t)from(select n.nspname schema,p.proname,p.prosecdef,p.proconfig,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('profesor_calificar','profesor_calificacion_estado','profesor_favoritos_wrapped','feedback_soluciones','feedback_solucion_vista','admin_editar_anuncio','admin_descuento_anuncio'))t),
'row_sizes',(select jsonb_build_object('avg_bytes',round(avg(octet_length(data::text))),'p95_bytes',percentile_disc(.95)within group(order by octet_length(data::text)),'max_bytes',max(octet_length(data::text)))from public.user_ramos),
'rut_field',(select count(*)from public.user_ramos where data?'rut')
)result;
commit;

-- weekly_return
-- comparison_currentness es exploratorio: no replica siglaDeRamo/claveRamoCurso. No prueba notas obsoletas.
begin read only;
set local statement_timeout = '12s';
with today as(select (now() at time zone 'America/Santiago')::date d),
a as(select distinct user_id from public.visitas_diarias where dia between date '2026-10-12' and date '2026-10-18'),
b as(select distinct user_id from public.visitas_diarias where dia between date '2026-10-19' and date '2026-10-25'),
coh as(select id,(created_at at time zone 'America/Santiago')::date alta from auth.users,today where (created_at at time zone 'America/Santiago')::date between date '2026-10-13' and d-8),
course as(select distinct user_id,tenant,upper(btrim(coalesce(nullif(r->>'sigla',''),r->'origen'->>'ramoKey'))) sigla from(select u.user_id,u.data->>'tenant' tenant,r from public.user_ramos u cross join lateral jsonb_array_elements(u.data->'ramos')r)x)
select jsonb_build_object(
'complete_weeks',(select jsonb_build_object('week1_start','2026-10-12','week1_accounts',(select count(*)from a),'week2_start','2026-10-19','week2_accounts',(select count(*)from b),'returned',(select count(*)from a join b using(user_id)))),
'cohort_return',(select jsonb_build_object('signup_from',min(alta),'signup_to',max(alta),'accounts',count(*),'D1',count(*)filter(where exists(select 1 from public.visitas_diarias v where v.user_id=coh.id and v.dia=coh.alta+1)),'D7',count(*)filter(where exists(select 1 from public.visitas_diarias v where v.user_id=coh.id and v.dia=coh.alta+7)))from coh),
'comparison_currentness',(select jsonb_build_object('rows',count(*),'older30days',count(*)filter(where updated_at<=now()-interval '30 days'),'fresh_without_current_course',count(*)filter(where updated_at>now()-interval '30 days' and not exists(select 1 from course c where c.user_id=n.user_id and c.tenant=n.tenant and c.sigla=n.ramo_sigla)),'fresh_professor_rows',count(*)filter(where updated_at>now()-interval '30 days' and exists(select 1 from public.user_ramos u where u.user_id=n.user_id and data->>'tipoCuenta'='profesor')))from public.curso_notas n),
'auth_no_state_age',(select jsonb_build_object('total',count(*),'older7days',count(*)filter(where created_at<now()-interval '7 days'),'older30days',count(*)filter(where created_at<now()-interval '30 days'))from auth.users a where not exists(select 1 from public.user_ramos r where r.user_id=a.id))
)result;
commit;

-- catalog_plan
begin read only;
set local statement_timeout = '12s';
explain (format json) select sigla,nombre,creditos,busqueda from public.catalogo_uc where busqueda=any(array['calculo 2','biologia de la celula']) limit 20;
commit;

-- rating_http_context
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'error_boot',(select jsonb_agg(t)from(select mensaje,version,count(*) events,count(distinct user_id) accounts,min(creado) first_seen,max(creado) last_seen from public.errores_app where mensaje in ('app.js no cargó','app.js cargó al reintentar') group by 1,2 order by last_seen desc)t),
'no_rubric_top',(select jsonb_agg(t)from(select cat.sigla,cat.nombre,count(*) courses from public.user_ramos u cross join lateral jsonb_array_elements(u.data->'ramos')r join public.catalogo_uc cat on cat.sigla=upper(btrim(r->>'sigla')) where data->>'tenant'='uc' and jsonb_array_length(r->'categorias')=0 group by 1,2 order by courses desc limit 10)t),
'catalog_credit_affected_with_graded_course',(select jsonb_build_object('courses',count(*),'accounts',count(distinct u.user_id))from public.user_ramos u cross join lateral jsonb_array_elements(u.data->'ramos')r join public.catalogo_uc cat on cat.sigla=upper(btrim(r->>'sigla')) where data->>'tenant'='uc' and jsonb_typeof(r->'creditos')is distinct from 'number' and cat.creditos is not null and exists(select 1 from jsonb_array_elements(r->'categorias')c cross join lateral jsonb_array_elements(c->'notas')n where jsonb_typeof(n->'valor')='number'))
)result;
commit;

-- error_signatures
begin read only;
set local statement_timeout = '12s';
select tipo,
case when mensaje ~* '(not defined|find variable)' then coalesce(substring(mensaje from '([A-Za-z_$][A-Za-z0-9_$]*) is not defined'),substring(mensaje from 'find variable: ([A-Za-z_$][A-Za-z0-9_$]*)'),'variable no identificada')
else left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(mensaje,'https?://[^[:space:]]+','[url]','g'),'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}','[email]','gi'),'[0-9a-f]{8}-[0-9a-f-]{27,}','[id]','gi'),'[0-9]{3,}','[numero]','g'),150) end as firma,
count(*) eventos,count(distinct user_id) cuentas,max(creado) ultimo
from public.errores_app group by 1,2 order by eventos desc limit 15;
commit;

-- security_catalog
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'policies',(select jsonb_agg(t) from(select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','admin','storage') order by 1,2,3)t),
'definers',(select jsonb_agg(t)from(select n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,p.proconfig config,has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') authenticated_execute,position('exigir_administrador' in p.prosrc)>0 exige_admin,position('auth.uid()' in p.prosrc)>0 usa_uid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','admin') and p.prosecdef order by 1,2)t),
'views',(select jsonb_agg(t)from(select n.nspname schema,c.relname name,c.reloptions,has_table_privilege('anon',c.oid,'select') anon_select,has_table_privilege('authenticated',c.oid,'select') authenticated_select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','admin') and c.relkind in ('v','m'))t),
'schema_grants',(select jsonb_agg(t)from(select nspname,has_schema_privilege('anon',oid,'usage') anon_usage,has_schema_privilege('authenticated',oid,'usage') auth_usage,has_schema_privilege('anon',oid,'create') anon_create,has_schema_privilege('authenticated',oid,'create') auth_create from pg_namespace where nspname in ('public','admin') or nspname like 'respaldo%')t),
'grants',(select jsonb_agg(t)from(select grantee,table_schema,table_name,string_agg(privilege_type,', ' order by privilege_type) privileges from information_schema.role_table_grants where table_schema in ('public','admin') and grantee in ('anon','authenticated','PUBLIC') group by 1,2,3 order by 2,3,1)t)
) result;
commit;

-- security_details
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'function_definitions',(select jsonb_agg(t)from(select n.nspname schema,p.proname name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','admin') and p.proname in ('exigir_administrador','administrador_verificado','admin_alcance_diario','agente_datos','canjear_codigo_agente','profesor_calificacion_estado','curso_posicion','admin_editar_anuncio'))t),
'foreign_keys_to_auth',(select jsonb_agg(t)from(select n.nspname schema,c.relname tabla,k.conname,k.confdeltype from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f' and k.confrelid='auth.users'::regclass and n.nspname in ('public','admin'))t),
'auth_password_accounts',(select count(*) from auth.users where encrypted_password is not null and encrypted_password<>'')
)result;
commit;

-- perf
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'top_queries',(select jsonb_agg(t)from(select queryid,calls,round(total_exec_time::numeric,1) total_ms,round(mean_exec_time::numeric,3) mean_ms,rows,shared_blks_hit,shared_blks_read,case when query ilike '%user_ramos%' then 'user_ramos' when query ilike '%catalogo_uc%' then 'catalogo_uc' when query ilike '%curso_notas%' then 'curso_notas' when query ilike '%auth.%' then 'auth' else 'other' end category,case when query ~* '^\s*select' then 'SELECT' when query ~* '^\s*insert' then 'INSERT' when query ~* '^\s*update' then 'UPDATE' else 'other' end operation from extensions.pg_stat_statements where query ilike '%user_ramos%' or query ilike '%catalogo_uc%' or query ilike '%curso_notas%' order by total_exec_time desc limit 15)t),
'stats_info',(select to_jsonb(x)from extensions.pg_stat_statements_info x),
'table_stats',(select jsonb_agg(t)from(select schemaname,relname,n_live_tup,n_dead_tup,seq_scan,seq_tup_read,idx_scan,n_tup_ins,n_tup_upd,n_tup_del,last_autovacuum,last_autoanalyze from pg_stat_user_tables where schemaname in ('public','admin') order by n_dead_tup desc)t),
'mutable_functions',(select jsonb_agg(t)from(select p.proname,p.prosecdef,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('linea_datos_clase_valida','touch_updated_at','calendar_feed_new_token','detalles_clase_validos','rango_canal_alcance','tarifa_campana_clp','clave_evaluacion'))t)
)result;
commit;

-- query_patterns
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'edge_http',(select null),
'query_patterns',(select jsonb_agg(t)from(select queryid::text queryid,r.rolname,calls,round(mean_exec_time::numeric,3) mean_ms,round(total_exec_time::numeric,1) total_ms, left(regexp_replace(query,$q$'([^']|'')*'$q$,'?', 'g'),900) pattern from extensions.pg_stat_statements s join pg_roles r on r.oid=s.userid where (query ilike '%user_ramos%' or query ilike '%catalogo_uc%' or query ilike '%curso_notas%') order by total_exec_time desc limit 8)t)
) result;
commit;

-- closing_snapshot
begin read only;
set local statement_timeout = '12s';
with s as(select user_id,data,updated_at from public.user_ramos),
r as(select user_id,data->>'tenant' tenant,e r from s cross join lateral jsonb_array_elements(data->'ramos')e where data->>'tipoCuenta' is distinct from 'profesor'),
n as(select user_id,tenant,r,z n from r cross join lateral jsonb_array_elements(r->'categorias')c cross join lateral jsonb_array_elements(c->'notas')z),
d as(select (now() at time zone 'America/Santiago')::date hoy)
select jsonb_build_object(
'captured_at',now(),'auth_accounts',(select count(*)from auth.users),'states',(select count(*)from s),'student_states',(select count(*)from s where data->>'tipoCuenta' is distinct from 'profesor'),
'courses',(select count(*)from r),'uc_courses',(select count(*)from r where tenant='uc'),'uc_sections',(select count(*)from r where tenant='uc' and coalesce(r->>'seccion','')~'^[1-9][0-9]*$'),
'uc_missing_known_credits',(select count(*)from r join public.catalogo_uc cat on cat.sigla=upper(btrim(r->>'sigla')) where tenant='uc' and jsonb_typeof(r->'creditos')is distinct from 'number' and cat.creditos is not null),
'notes',(select count(*)from n where jsonb_typeof(n->'valor')='number'),
'accounts_with_notes',(select count(distinct user_id)from n where jsonb_typeof(n->'valor')='number'),
'bad_grades',(select count(*)from n where jsonb_typeof(n->'valor')='number' and case when jsonb_typeof(n->'valor')='number' then (n->>'valor')::numeric<1 or (n->>'valor')::numeric>7 else false end),
'non_number_notes',(select count(*)from n where jsonb_typeof(n->'valor') not in ('number','null')),
'rls_counts',(select jsonb_build_object('tables',count(*),'enabled',count(*)filter(where relrowsecurity))from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname in ('public','admin') and relkind='r'),
'blocked_sessions',(select count(*)from pg_stat_activity where cardinality(pg_blocking_pids(pid))>0),
'password_accounts',(select count(*)from auth.users where encrypted_password is not null and encrypted_password<>'')
)result;
commit;

-- fk_adoption
begin read only;
set local statement_timeout = '12s';
select jsonb_build_object(
'rating_courses_by_tenant',(select jsonb_agg(t)from(select tenant,count(*) ratings,count(distinct user_id) accounts from public.profesor_calificaciones group by 1)t),
'student_no_courses',(select count(*)from public.user_ramos where data->>'tipoCuenta' is distinct from 'profesor' and jsonb_array_length(data->'ramos')=0),
'legacy_private_field',(select jsonb_build_object('accounts_with_rut_field',count(*),'nonempty',count(*)filter(where nullif(btrim(data->>'rut'),'')is not null))from public.user_ramos where data?'rut'),
'active_without_notes',(select count(*)from public.user_ramos u where data->>'tipoCuenta'is distinct from 'profesor' and exists(select 1 from public.visitas_diarias v where v.user_id=u.user_id and dia between (now() at time zone 'America/Santiago')::date-6 and (now() at time zone 'America/Santiago')::date) and not exists(select 1 from jsonb_array_elements(u.data->'ramos')r cross join lateral jsonb_array_elements(r->'categorias')c cross join lateral jsonb_array_elements(c->'notas')n where jsonb_typeof(n->'valor')='number'))
)result;
commit;


