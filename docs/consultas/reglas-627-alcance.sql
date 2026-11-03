with ramos as (
 select u.user_id,coalesce(r->'origen'->>'tenant',u.data->>'tenant') tenant,
 translate(lower(r->>'nombre'),'áéíóú','aeiou') nombre
 from public.user_ramos u cross join lateral jsonb_array_elements(coalesce(u.data->'ramos','[]')) r
 where coalesce(u.data->>'tipoCuenta','estudiante')<>'profesor' and u.data->>'onboardingDone'='true'
), candidatos as (
 select *,case
 when tenant='uc' and nombre like '%laboratorio%dinamica%' then 'Laboratorio de Dinámica'
 when tenant='uc' and nombre like '%dinamica%' then 'Dinámica (ambas siglas)'
 when tenant='uc' and nombre like '%biologia%celula%' then 'Biología de la Célula'
 when tenant='uc' and nombre like '%transporte%' then 'Transporte'
 when tenant='fen' and nombre like '%programacion%analitica%' then 'Programación para Analítica de Datos'
 when tenant='fen' and nombre like '%gestion%personas%' then 'Gestión de Personas'
 when tenant='fen' and nombre like '%introduccion%economia%' and nombre not like '%micro%' and nombre not like '%macro%' then 'Introducción a la Economía'
 when tenant='fen' and nombre like '%ingles%iv%' then 'Inglés IV'
 when tenant='uai' and nombre like '%matematicas%avanzadas i' then 'Matemáticas Avanzadas I'
 when tenant='uai' and nombre like '%razonamiento%datos i' then 'Razonamiento Cuantitativo con Datos I'
 end ramo from ramos)
 select tenant,ramo,count(distinct user_id)::int cuentas from candidatos where ramo is not null group by 1,2 order by cuentas desc;
