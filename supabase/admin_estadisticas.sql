-- El alcance de todos los anuncios, día por día, para la pestaña
-- Estadísticas del panel de administración.
--
-- Por día: cuántas cuentas vieron un anuncio por primera vez en su campaña
-- (anuncio_alcance), cuántas lo abrieron y cuántas contactaron al profesor
-- (anuncio_interacciones). Son las mismas filas que ya cobra costo_campana(),
-- sumadas para toda la página: no sale el anuncio, ni la cuenta, ni la
-- universidad. El día es el que guardan esas tablas (current_date).
--
-- Exige administrador con segundo factor, como el resto del panel. Sin esta
-- función el panel sigue funcionando: el gráfico de alcance no aparece.
--
-- Depende de clases_particulares.sql y administradores.sql.
-- APLÍCALO a mano en el SQL Editor. Se puede aplicar más de una vez.

begin;

create or replace function public.admin_alcance_diario(p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dias integer := least(greatest(coalesce(p_dias, 30), 7), 90);
  desde date := current_date - (dias - 1);
begin
  if not public.administrador_verificado() then
    raise exception 'administración requiere segundo factor' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'vieron', coalesce(v.n, 0),
        'abrieron', coalesce(i.abrieron, 0),
        'contactaron', coalesce(i.contactaron, 0)) order by d.dia), '[]'::jsonb)
    from (select (desde + k) as dia from generate_series(0, dias - 1) k) d
    left join (select x.dia, count(*)::integer as n from public.anuncio_alcance x
                where x.dia >= desde group by x.dia) v on v.dia = d.dia
    left join (select x.dia,
                      count(*) filter (where x.tipo = 'apertura')::integer as abrieron,
                      count(*) filter (where x.tipo = 'contacto')::integer as contactaron
                 from public.anuncio_interacciones x
                where x.dia >= desde group by x.dia) i on i.dia = d.dia
  );
end;
$$;
revoke all on function public.admin_alcance_diario(integer) from public, anon, authenticated;
grant execute on function public.admin_alcance_diario(integer) to authenticated;

commit;
