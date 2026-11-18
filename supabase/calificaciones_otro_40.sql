-- Etiquetas escritas («Otro») de ramos y profesores: de 20 a 40 caracteres.
-- Reaplicable. Solo amplía el límite, así que todas las filas guardadas siguen
-- cumpliendo los check que usan esta función. Misma definición que
-- supabase/profesores.sql.
create or replace function public.profesor_texto_permitido(p_texto text)
returns boolean language sql immutable set search_path = '' as $$
  select p_texto ~ '^[[:alpha:]]+( [[:alpha:]]+)*$' and char_length(p_texto) between 3 and 40
    and public.profesor_normalizar(p_texto) !~ ('(^| )(' || array_to_string(array[
      'wn','wna','wea','weas','ql','qlo','ctm','csm','ptm','pico','raja','zorra','perra','perro','cerdo','cerda',
      'tonto','tonta','idiota','imbecil','estupido','estupida','pendejo','pendeja','cabron','gil','gila','longi',
      'inutil','basura','asco','asqueroso','asquerosa','flaite','facho','facha','nazi','racista','machista',
      'ladron','ladrona','corrupto','corrupta','mentiroso','mentirosa','acosador','acosadora','abusador',
      'abusadora','violador','violadora','pedofilo','pedofila','enfermo','enferma','loco','loca','drogadicto',
      'borracho','borracha'],'|') || ')( |$)')
    and public.profesor_normalizar(p_texto) !~ '(weon|weona|hueon|huevon|aweona|culia|conchetu|conchesu|maric|mierd|put[ao]|chuch|verga|cul[oa]s? )';
$$;

revoke all on function public.profesor_texto_permitido(text) from public, anon, authenticated;
