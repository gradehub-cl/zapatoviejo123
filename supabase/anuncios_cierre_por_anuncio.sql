-- Aplicar después de anuncios_cierre.sql. Requiere pg_cron habilitado en Supabase.
-- La tabla y RPC globales antiguas no se modifican.
begin;
create table if not exists public.anuncios_cierres_por_anuncio (
  user_id uuid not null references auth.users(id) on delete cascade,
  anuncio_id uuid not null references public.tutor_anuncios(id) on delete cascade,
  oculta_hasta timestamptz not null,
  primary key (user_id, anuncio_id)
);
create index if not exists anuncios_cierres_anuncio_idx on public.anuncios_cierres_por_anuncio(anuncio_id);
create index if not exists anuncios_cierres_vencimiento_idx on public.anuncios_cierres_por_anuncio(oculta_hasta);
alter table public.anuncios_cierres_por_anuncio enable row level security;
revoke all on public.anuncios_cierres_por_anuncio from public, anon, authenticated;
grant select, insert, update, delete on public.anuncios_cierres_por_anuncio to authenticated;
drop policy if exists cierres_anuncio_leer on public.anuncios_cierres_por_anuncio;
create policy cierres_anuncio_leer on public.anuncios_cierres_por_anuncio for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists cierres_anuncio_crear on public.anuncios_cierres_por_anuncio;
create policy cierres_anuncio_crear on public.anuncios_cierres_por_anuncio for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists cierres_anuncio_actualizar on public.anuncios_cierres_por_anuncio;
create policy cierres_anuncio_actualizar on public.anuncios_cierres_por_anuncio for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists cierres_anuncio_borrar on public.anuncios_cierres_por_anuncio;
create policy cierres_anuncio_borrar on public.anuncios_cierres_por_anuncio for delete to authenticated using ((select auth.uid())=user_id);

-- El reloj y la zona horaria del cliente no deciden cuánto dura un cierre.
create or replace function public.fecha_cierre_anuncio()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.oculta_hasta:=((now() at time zone 'America/Santiago')::date+1)::timestamp at time zone 'America/Santiago';
  return new;
end;
$$;
revoke all on function public.fecha_cierre_anuncio() from public, anon, authenticated;
drop trigger if exists cierre_anuncio_fecha on public.anuncios_cierres_por_anuncio;
create trigger cierre_anuncio_fecha before insert or update on public.anuncios_cierres_por_anuncio
for each row execute function public.fecha_cierre_anuncio();

create or replace function public.cerrar_anuncio_hoy(p_anuncio_id uuid)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare hasta timestamptz;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  insert into public.anuncios_cierres_por_anuncio(user_id,anuncio_id,oculta_hasta)
    values(auth.uid(),p_anuncio_id,now())
    on conflict (user_id,anuncio_id) do update set oculta_hasta=excluded.oculta_hasta
    returning oculta_hasta into hasta;
  return hasta;
end;
$$;
revoke all on function public.cerrar_anuncio_hoy(uuid) from public, anon;
grant execute on function public.cerrar_anuncio_hoy(uuid) to authenticated;

-- Además del cierre con la X: un anuncio que la cuenta ya vio en 5 días
-- distintos (en total, no necesariamente seguidos; día de Chile) deja de
-- mostrársele (Lucas, 2026-11-25). Se calcula al vuelo desde los recibos de
-- impresión, sin guardar filas nuevas; no toca cobro, alcance ni métricas.
-- security definer porque los recibos no son legibles por el cliente: solo
-- lee y borra filas de auth.uid().
create or replace function public.mis_cierres_anuncios()
returns table (anuncio_id uuid, oculta_hasta timestamptz)
language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'inicia sesión'; end if;
  delete from public.anuncios_cierres_por_anuncio c where c.user_id=uid and c.oculta_hasta<=now();
  return query select c.anuncio_id,c.oculta_hasta from public.anuncios_cierres_por_anuncio c where c.user_id=uid and c.oculta_hasta>now();
  -- Sin anuncio_eventos.sql aplicado no hay recibos: solo rige el cierre manual.
  if to_regclass('public.anuncio_eventos_recibos') is not null then
    -- El vencimiento se vuelve a calcular en cada lectura; 30 días solo evita
    -- que una copia en memoria del cliente quede oculta para siempre.
    return query select r.anuncio_id,now()+interval '30 days'
      from public.anuncio_eventos_recibos r
      where r.user_id=uid and r.tipo='impresion'
      group by r.anuncio_id
      having count(distinct (r.creado_at at time zone 'America/Santiago')::date)>=5;
  end if;
end;
$$;
revoke all on function public.mis_cierres_anuncios() from public, anon;
grant execute on function public.mis_cierres_anuncios() to authenticated;

create or replace function public.limpiar_cierres_anuncios()
returns integer language plpgsql security definer set search_path = '' as $$
declare filas integer;
begin
  delete from public.anuncios_cierres_por_anuncio where oculta_hasta<=now();
  get diagnostics filas=row_count;
  return filas;
end;
$$;
revoke all on function public.limpiar_cierres_anuncios() from public, anon, authenticated;
-- A diario, incluidos usuarios que no vuelven a abrir la app. Nombre estable:
-- volver a aplicar actualiza el trabajo en vez de duplicarlo.
do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null then
    raise exception 'Habilita pg_cron en Supabase antes de aplicar anuncios_cierre_por_anuncio.sql';
  end if;
  perform cron.schedule('gradehub-cierres-anuncios', '15 6 * * *', 'select public.limpiar_cierres_anuncios()');
end $$;
commit;
