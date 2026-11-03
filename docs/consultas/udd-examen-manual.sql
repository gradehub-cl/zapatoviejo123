-- Solo lectura. Alcance potencial de la regla; no devuelve notas ni identidades.
with ramos as (
select u.user_id,r from user_ramos u cross join lateral jsonb_array_elements(coalesce(u.data->'ramos','[]')) r
where coalesce(r->'origen'->>'tenant',u.data->>'tenant')='udd'
and coalesce(u.data->>'tipoCuenta','estudiante')<>'profesor' and u.data->>'onboardingDone'='true'
and coalesce(jsonb_array_length(r->'gates'),0)=0
), candidatos as (
select user_id from ramos where (select count(*) from jsonb_array_elements(coalesce(r->'categorias','[]')) c
where coalesce((c->>'peso')::numeric,0)>0 and coalesce(c->>'fueraDePauta','false')<>'true'
and translate(lower(trim(c->>'nombre')),'áéíóú','aeiou') in('examen','examen final','evaluacion final'))=1)
select count(*)::integer ramos,count(distinct user_id)::integer cuentas from candidatos;
