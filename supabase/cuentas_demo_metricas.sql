-- Aprobado por Lucas el 2026-11-18. Reaplicable, sin IDs reales ni backfill.
-- Aplicar después de clases_particulares.sql, administradores.sql,
-- anuncio_eventos.sql, metricas_dia_chile.sql y anuncio_totales.sql.
-- Registrar las cuentas demo ANTES de su primera visita con ramos.
-- No cambia tarifas, costo_campana, permisos del producto ni datos anteriores.
begin;
create table if not exists admin.cuentas_excluidas_metricas (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table admin.cuentas_excluidas_metricas enable row level security;
revoke all on admin.cuentas_excluidas_metricas from public, anon, authenticated;

-- La tabla es privada, sin RPC ni permisos de cliente. Solo una operación del
-- servidor/SQL Editor con privilegios puede inscribir una cuenta. Un trigger
-- evita duplicar las RPC de cobro y sigue vigente si se reaplica el SQL base.
create or replace function admin.omitir_metrica_cuenta_demo()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from admin.cuentas_excluidas_metricas where user_id=new.user_id) then
    return null;
  end if;
  return new;
end;
$$;
revoke all on function admin.omitir_metrica_cuenta_demo() from public, anon, authenticated;

drop trigger if exists omitir_demo_alcance on public.anuncio_alcance;
create trigger omitir_demo_alcance before insert on public.anuncio_alcance
 for each row execute function admin.omitir_metrica_cuenta_demo();
drop trigger if exists omitir_demo_interaccion on public.anuncio_interacciones;
create trigger omitir_demo_interaccion before insert on public.anuncio_interacciones
 for each row execute function admin.omitir_metrica_cuenta_demo();
-- registrar_evento_anuncio solo suma el agregado diario si insertó el recibo.
-- Sin recibo tampoco suma a los totales; no consume el cupo contra abuso.
drop trigger if exists omitir_demo_recibo on public.anuncio_eventos_recibos;
create trigger omitir_demo_recibo before insert on public.anuncio_eventos_recibos
 for each row execute function admin.omitir_metrica_cuenta_demo();
commit;
