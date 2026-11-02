-- Banco interno. Aplicar después de administradores.sql y consenso_periodo.sql.
-- Reaplicable. No publica ni modifica el catálogo de estudiantes.
begin;
create or replace function public.pautas_admin_verificado()
returns boolean language sql stable security definer set search_path='' as $$
 select public.administrador_verificado();
$$;
revoke all on function public.pautas_admin_verificado() from public,anon;
grant execute on function public.pautas_admin_verificado() to authenticated;
alter table public.pautas_catalogo_registro add column if not exists fuente_catalogo text;
alter table public.pautas_catalogo_registro add column if not exists faltantes_catalogo jsonb not null default '[]';
update public.pautas_catalogo_registro p set fuente_catalogo=x.fuente,faltantes_catalogo=x.faltantes from jsonb_to_recordset('[{"tenant": "uc", "nombre_norm": "calculo i", "fuente": "Programa_CalculoI_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["El programa es del primer semestre 2026 (fechas de marzo a junio); la pauta no fija período.", "Los 3 laboratorios no salen del programa: dice solo «la nota del laboratorio se simboliza por L».", "Una primera interrogación con inasistencia justificada se reemplaza por el examen; las siguientes van a pruebas especiales (nota P). No se muestra (contingencia automática) y no se calcula: ver #630."]}, {"tenant": "uc", "nombre_norm": "quimica para ingenieria", "fuente": "Programa_QuimicaParaIngenieria_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["El programa no dice cuántas pruebas, talleres, informes ni controles hay."]}, {"tenant": "uc", "nombre_norm": "filosofia: ¿para que?", "fuente": "Programa_FilosofiaParaQue_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["No dice con qué nota se reprueba por el Podcast: se usa 3,9."]}, {"tenant": "uc", "nombre_norm": "desafios de la ingenieria", "fuente": "Programa_DesafiosDeLaIngenieria_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["Un reporte de 2026-2 trae 3 casillas de tareas; el programa (2026-1) dice 4.", "No dice cuántas actividades o cuestionarios hay.", "La evaluación de pares ajusta individualmente las notas de Presentaciones y Feria; se ingresa la nota ajustada."]}, {"tenant": "uc", "nombre_norm": "dinamica", "fuente": "Programa_Dinamica_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": []}, {"tenant": "uc", "nombre_norm": "laboratorio de dinamica", "fuente": "Reglas_LaboratorioDinamica_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["La pauta usa 25/3 / 70 / 65/3 y no 10/70/20, a propósito: la nota final es el promedio de las seis «Nota lab» de la planilla oficial (correo de coordinación a Lucas del 2026-10-14). Está explicado junto a la pauta en data.js."]}, {"tenant": "uc", "nombre_norm": "calculo ii", "fuente": "Reglas_CalculoII_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": ["Este archivo es la normativa y no publica ponderaciones. Los pesos salen del programa clase a clase MAT1620-2026-S2, que no está en la carpeta; los 3 laboratorios los confirmó Lucas.", "Una interrogación con inasistencia justificada se reemplaza por el examen; dos o más dejan nota P. No se muestra (contingencia automática) y no se calcula: ver #630."]}, {"tenant": "uc", "nombre_norm": "introduccion a la programacion", "fuente": "Programa_IntroduccionALaProgramacion_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": []}, {"tenant": "uc", "nombre_norm": "principios ecologicos y medio ambiente", "fuente": "Programa_PrincipiosDeEcologiaYMedioAmbiente_UC.pdf · referencia: docs/programas-uc-2026.json", "faltantes": []}, {"tenant": "uc", "nombre_norm": "revelacion y fe", "fuente": "Programa_RevelacionYFe_UC.docx · referencia: docs/programas-uc-2026.json", "faltantes": ["Eximición, décimas y texto voluntario siguen en noCalcula (en pausa, decisión de Lucas del 2026-10-12)."]}, {"tenant": "uc", "nombre_norm": "introduccion a la economia", "fuente": "ICS1513 - 01 - 2025 - sección 4 - Programa (1).pdf · pp. 4, 5 · referencia: docs/programas-uc-2026.json", "faltantes": ["Programa histórico 2025-1, sección 4; no se confirma que sea la pauta de 2026-2. Las fechas históricas se retienen fuera de su período.", "No fija la cantidad total de controles ni los pesos internos de las etapas del proyecto: no se inventan.", "Eliminar una interrogación y pasar su 20% al examen queda advertido en noCalcula. No se declara como reemplazo automático, porque el normalizador lo añadiría a cuentas anteriores con los mismos nombres y pesos, aunque su pauta fuera de otro semestre. No se cambian reglas de cálculo de pautas existentes."]}, {"tenant": "uc", "nombre_norm": "termodinamica", "fuente": "Programa_y_Reglas_FIS1523_1er_sem_2025 2.pdf · pp. 3, 4 · referencia: docs/programas-uc-2026.json", "faltantes": ["Programa histórico 2025-1. Declara los mismos criterios para todas las secciones de ese período, no para cualquier semestre.", "Los porcentajes registrados son de cátedra. El laboratorio aporta 30% por el vínculo existente; no se agrega un segundo bloque de laboratorio a la cátedra.", "El PDF superpone >= 4,0 y <= 4,0. Lucas decidió el 2026-10-28 tratar 4,0 como aprobado y aplicar 70/30, igual que Dinámica.", "No publica las evaluaciones internas del laboratorio FIS0152. No se crea pauta para él.", "El reemplazo por una interrogación justificada y la reprobación por justificar ambas quedan advertidos en noCalcula; no se automatizan en esta PR."]}, {"tenant": "uc", "nombre_norm": "electricidad y magnetismo", "fuente": "Programa_FIS1533_2026_1.pdf · pp. 4, 5 · referencia: docs/programas-uc-2026.json", "faltantes": ["Programa histórico 2026-1; no se confirma como pauta de 2026-2. Las fechas históricas se retienen fuera de su período.", "Los porcentajes registrados son de cátedra. El laboratorio aporta 30% por el vínculo existente.", "El PDF superpone >= 4,0 y <= 4,0. Lucas decidió el 2026-10-28 tratar 4,0 como aprobado y aplicar 70/30, igual que Dinámica.", "No publica las evaluaciones internas del laboratorio FIS0153. No se crea pauta para él.", "La sustitución de una interrogación justificada y la exclusión de un control justificado quedan advertidas en noCalcula; no se automatizan ni se elimina por defecto el peor control."]}, {"tenant": "uc", "nombre_norm": "contabilidad gerencial", "fuente": "2026-2+Programa+EAA2240-3.pdf · pp. 3, 4 · referencia: docs/programas-uc-com-2026-2.json", "faltantes": ["Cantidad y puntajes de ejercicios/casos/tareas no publicados.", "Texto ≥ 3,8 y fórmula > 3,8 discrepan en el límite.", "Calendario explícitamente tentativo."]}, {"tenant": "uc", "nombre_norm": "empresas y legislacion", "fuente": "Programa+Empresa+y+Legislacio%CC%81n+2026-2.pdf · pp. 3, 4 · referencia: docs/programas-uc-com-2026-2.json", "faltantes": ["El cuerpo no imprime el año; 2026-2 procede del nombre del archivo y los días de semana coinciden con 2026.", "Cantidad de décimas por participación/asistencia no publicada."]}, {"tenant": "uc", "nombre_norm": "estrategia competitiva", "fuente": "Programa+Estrategia+Competitiva.pdf · pp. 1, 2, 3 · referencia: docs/programas-uc-com-2026-2.json", "faltantes": ["Sin fechas de evaluaciones.", "Nivel de participación requerido para 7,0 lo decide el profesor."]}, {"tenant": "uc", "nombre_norm": "etica, economia y empresa", "fuente": "ETI209+-+Syllabus+comu%CC%81n+Segundo+Semestre+de+2026+v6ago.pdf · pp. 7, 8 · referencia: docs/programas-uc-com-2026-2.json", "faltantes": ["Fechas de las cinco actividades por sección.", "Reparto interno de las cinco actividades no explícito: se conserva bloque 25% con cinco casillas; el usuario puede ingresar la nota del bloque.", "Peso de eventual recuperativa si examen supera 60% no definido."]}, {"tenant": "uc", "nombre_norm": "marketing analytics", "fuente": "2026_2_eaa2320_marketing_analytics_programa.pdf · pp. 8, 9, 10, 12 · referencia: docs/programas-uc-com-2026-2.json", "faltantes": ["Fechas de tareas e hitos intermedios no publicadas."]}, {"tenant": "uai", "nombre_norm": "escritura argumentativa", "fuente": "Programa_EscrituraArgumentativa_UAI.docx · Sistema de evaluación; Porcentajes de las evaluaciones del semestre · referencia: docs/programas-uai-2026.json", "faltantes": ["La pauta reúne Comentario crítico y Ensayo en notas consolidadas porque el reemplazo de la escritura por la reescritura depende de alcanzar 6,3.", "El programa no fija el peso entre las dos evaluaciones entre pares ni entre actividades.", "El 20% superior para eximir no se puede inferir de las notas del estudiante."]}, {"tenant": "uai", "nombre_norm": "management", "fuente": "Programa_Management_UAI.pdf · Evaluaciones & aprobación; Régimen de controles de lectura · referencia: docs/programas-uai-2026.json", "faltantes": ["El número total de controles y tareas depende de la sección; quedan como listas abiertas.", "La asistencia mínima de 75% depende de un dato que la app no registra.", "El recuperativo por ausencia a solemne depende de una aprobación individual de Secretaría."]}, {"tenant": "uai", "nombre_norm": "introduccion a la macroeconomia", "fuente": "Programa_IntroduccionALaMacroeconomia_UAI.docx · Procedimiento de Evaluación · referencia: docs/programas-uai-2026.json", "faltantes": ["El programa no fija cuántos controles hay ni cuántos se descartan: el bloque queda consolidado.", "El incentivo por asistencia aparece como “por confirmar”; no se incorpora al cálculo."]}, {"tenant": "uai", "nombre_norm": "matematicas avanzadas ii", "fuente": "Programa_MatematicasAvanzadasII_UAI.pdf · Procedimiento de Evaluación; Reglamento · referencia: docs/programas-uai-2026.json", "faltantes": ["La eximición además requiere haber rendido todas las evaluaciones; el estudiante la confirma.", "La opción de reemplazar una prueba por el examen y las condiciones de Honor se tratan en #628; este registro no las declara."]}, {"tenant": "uai", "nombre_norm": "razonamiento cuantitativo con datos ii", "fuente": "Programa_RazonamientoCuantitativoConDatosII_UAI.pdf · Procedimiento de Evaluación · referencia: docs/programas-uai-2026.json", "faltantes": ["El programa no fija cuántas pruebas teóricas habrá; “Pruebas” queda consolidado.", "La eximición de dos partes del examen necesita el mecanismo de #629; aquí no se inventa una nota única."]}, {"tenant": "uai", "nombre_norm": "civilizacion contemporanea ii", "fuente": "Programa_CivilizacionContemporaneaII_UAI.docx · Sistema de evaluación; Exención · referencia: docs/programas-uai-2026.json", "faltantes": ["Cantidad de evaluaciones de lectura contradictoria: tabla dice 10 y cuerpo dice 11. Se eliminó el precargado de diez casillas y se conserva el peso 32,5% con una nota consolidada hasta confirmación de la sección.", "La exención depende de quedar en el 20% superior, dato que la app no conoce."]}]'::jsonb) x(tenant text,nombre_norm text,fuente text,faltantes jsonb) where p.tenant=x.tenant and p.nombre_norm=x.nombre_norm;
create table if not exists public.pautas_banco(
 id uuid primary key default gen_random_uuid(),
 tenant text not null check(tenant in('uc','fen','uai','uandes','udd')),
 sigla text not null check(length(sigla) between 1 and 160),
 periodo text not null check(periodo ~ '^[0-9]{4}-[12v]$'),
 documento_path text,documento_sha256 text,
 estado text not null default 'sin_pauta' check(estado in('confirmada','en_disputa','sin_pauta')),
 nota_interna text not null default '' check(length(nota_interna)<=4000),
 revisado_por uuid references auth.users(id) on delete set null,revisado_at timestamptz,
 unique(tenant,sigla,periodo),
 check((documento_path is null and documento_sha256 is null) or
 (documento_path is not null and documento_sha256 is not null and documento_sha256 ~ '^[0-9a-f]{64}$' and
 documento_path like tenant||'/'||sigla||'/'||periodo||'/%' and documento_path not like '%..%' and right(documento_path,4)='.pdf'))
);
alter table public.pautas_banco enable row level security;
revoke all on public.pautas_banco from public,anon,authenticated;
grant select on public.pautas_banco to authenticated;
drop policy if exists pautas_banco_admin_lectura on public.pautas_banco;
create policy pautas_banco_admin_lectura on public.pautas_banco for select to authenticated using(public.pautas_admin_verificado());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pautas-programas','pautas-programas',false,10485760,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists pautas_documentos_admin on storage.objects;
create policy pautas_documentos_admin on storage.objects for all to authenticated
 using(bucket_id='pautas-programas' and public.pautas_admin_verificado())
 with check(bucket_id='pautas-programas' and public.pautas_admin_verificado() and name not like '%..%' and right(name,4)='.pdf');

create or replace function public.admin_guardar_pauta_banco(p_tenant text,p_sigla text,p_periodo text,p_estado text,p_nota text,p_documento_path text default null,p_sha256 text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare resultado uuid;
begin
 perform admin.exigir_administrador();
 if p_documento_path is not null and not exists(select 1 from storage.objects where bucket_id='pautas-programas' and name=p_documento_path) then
  raise exception 'El documento todavía no está guardado';
 end if;
 insert into public.pautas_banco(tenant,sigla,periodo,estado,nota_interna,documento_path,documento_sha256,revisado_por,revisado_at)
 values(p_tenant,p_sigla,p_periodo,p_estado,coalesce(p_nota,''),p_documento_path,p_sha256,auth.uid(),now())
 on conflict(tenant,sigla,periodo) do update set estado=excluded.estado,nota_interna=excluded.nota_interna,
 documento_path=coalesce(excluded.documento_path,pautas_banco.documento_path),documento_sha256=coalesce(excluded.documento_sha256,pautas_banco.documento_sha256),
 revisado_por=auth.uid(),revisado_at=now() returning id into resultado;
 return resultado;
end;
$$;
create or replace function public.admin_pautas_banco(p_tenant text,p_periodo text,p_busqueda text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb;
begin
 perform admin.exigir_administrador();
 if length(coalesce(p_busqueda,''))>160 or p_periodo !~ '^[0-9]{4}-[12v]$' then raise exception 'Búsqueda inválida'; end if;
 with claves as(
 select p.clave from public.pautas_catalogo_registro p where p.tenant=p_tenant
 union select coalesce(nullif(cr.ramo_sigla,''),cr.ramo_norm) from public.catalog_reports cr where cr.tenant=p_tenant and cr.periodo=p_periodo
 union select b.sigla from public.pautas_banco b where b.tenant=p_tenant and b.periodo=p_periodo
 ), filas as(
 select c.clave,p.nombre,p.periodo periodo_catalogo,p.definicion,p.fuente_catalogo,p.faltantes_catalogo,b.estado,b.nota_interna,b.documento_path,b.documento_sha256,b.revisado_at,
 (select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) from(
 select cr.huella,cr.estructura,cr.seccion,cr.origen,count(distinct cr.user_id)::int personas,
 coalesce(jsonb_agg(distinct cr.nota) filter(where nullif(trim(cr.nota),'') is not null),'[]'::jsonb) comentarios
 from public.catalog_reports cr where cr.tenant=p_tenant and cr.periodo=p_periodo and coalesce(nullif(cr.ramo_sigla,''),cr.ramo_norm)=c.clave
 group by cr.huella,cr.estructura,cr.seccion,cr.origen
 ) v) variantes
 from claves c left join lateral(select * from public.pautas_catalogo_registro pr where pr.tenant=p_tenant and pr.clave=c.clave order by (pr.periodo=p_periodo) desc,pr.periodo desc limit 1) p on true
 left join public.pautas_banco b on b.tenant=p_tenant and b.sigla=c.clave and b.periodo=p_periodo
 where coalesce(p.nombre,c.clave) ilike '%'||coalesce(p_busqueda,'')||'%' or c.clave ilike '%'||coalesce(p_busqueda,'')||'%'
 order by coalesce(p.nombre,c.clave) limit 100
 ) select coalesce(jsonb_agg(jsonb_build_object('sigla',f.clave,'nombre',coalesce(f.nombre,f.clave),'periodo',p_periodo,
 'periodo_catalogo',nullif(f.periodo_catalogo,''),'pauta',f.definicion,
 'fuente',f.fuente_catalogo,
 'faltantes',case when f.documento_path is null and f.fuente_catalogo is null then jsonb_build_array('Documento fuente no registrado') else '[]'::jsonb end || case when coalesce(f.periodo_catalogo,'')='' and f.definicion is not null then jsonb_build_array('Período del preset no declarado') else '[]'::jsonb end || coalesce(f.definicion->'noCalcula','[]'::jsonb) || coalesce(f.faltantes_catalogo,'[]'::jsonb),
 'estado',coalesce(f.estado,case when (select count(distinct x->>'huella') from jsonb_array_elements(f.variantes) x)>1 then 'en_disputa' when f.definicion is not null then 'confirmada' else 'sin_pauta' end),
 'nota_interna',coalesce(f.nota_interna,''),'documento_path',f.documento_path,'documento_sha256',f.documento_sha256,'revisado_at',f.revisado_at,'variantes',f.variantes)),'[]'::jsonb) into resultado from filas f;
 return resultado;
end;
$$;
revoke all on function public.admin_guardar_pauta_banco(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.admin_guardar_pauta_banco(text,text,text,text,text,text,text) to authenticated;
revoke all on function public.admin_pautas_banco(text,text,text) from public,anon;
grant execute on function public.admin_pautas_banco(text,text,text) to authenticated;
commit;
