-- Cerrar las recomendaciones de Inicio también en los otros dispositivos.
-- Aplicar manualmente antes del merge. No modifica anuncios ni medición.
begin;

create table if not exists public.anuncios_cierre (
  user_id uuid primary key references auth.users(id) on delete cascade,
  oculta_hasta timestamptz not null
);
alter table public.anuncios_cierre enable row level security;
revoke all on public.anuncios_cierre from public, anon, authenticated;
grant select, insert, update on public.anuncios_cierre to authenticated;
drop policy if exists anuncios_cierre_leer on public.anuncios_cierre;
create policy anuncios_cierre_leer on public.anuncios_cierre for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists anuncios_cierre_crear on public.anuncios_cierre;
create policy anuncios_cierre_crear on public.anuncios_cierre for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists anuncios_cierre_actualizar on public.anuncios_cierre;
create policy anuncios_cierre_actualizar on public.anuncios_cierre for update
  to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sin parámetro consulta; con fecha guarda el cierre. El cliente calcula la
-- próxima medianoche local. Una petición retrasada nunca acorta otro cierre.
create or replace function public.mi_cierre_anuncios(p_hasta timestamptz default null)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare hasta timestamptz;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if p_hasta > now() + interval '27 hours' then
    raise exception 'el cierre solo puede durar hasta el día siguiente';
  end if;
  if p_hasta > now() then
    insert into public.anuncios_cierre(user_id, oculta_hasta)
    values (auth.uid(), p_hasta)
    on conflict (user_id) do update
      set oculta_hasta = greatest(anuncios_cierre.oculta_hasta, excluded.oculta_hasta);
  end if;
  select oculta_hasta into hasta from public.anuncios_cierre where user_id = auth.uid();
  return hasta;
end;
$$;
revoke all on function public.mi_cierre_anuncios(timestamptz) from public, anon;
grant execute on function public.mi_cierre_anuncios(timestamptz) to authenticated;
commit;
