-- Temas festivos: un interruptor global que prende el admin (Martín, 2026-11-02).
-- Aplicar después de administradores.sql. Reaplicable. No toca datos de usuarios:
-- es una sola fila con el tema activo (o ninguno), que todos pueden leer.
begin;

create table if not exists admin.tema_festivo (
  id boolean primary key default true check(id),
  tema text check(tema in ('halloween','navidad')),
  cambiado_at timestamptz not null default now()
);
-- Parte apagado: el tema se prende desde el panel, no al aplicar el archivo.
insert into admin.tema_festivo(id) values(true) on conflict do nothing;
alter table admin.tema_festivo enable row level security;
revoke all on admin.tema_festivo from public, anon, authenticated;

-- También antes de entrar: la pantalla de acceso lleva el tema.
create or replace function public.tema_festivo_activo()
returns text language sql stable security definer set search_path=pg_catalog,admin as $$
  select tema from admin.tema_festivo where id;
$$;
revoke all on function public.tema_festivo_activo() from public;
grant execute on function public.tema_festivo_activo() to anon, authenticated;

-- null apaga. Exige admin con segundo factor, como el resto del panel.
create or replace function public.admin_tema_festivo(p_tema text)
returns text language plpgsql security definer set search_path=pg_catalog,public,admin as $$
begin
  perform admin.exigir_administrador();
  if p_tema is not null and p_tema not in ('halloween','navidad') then raise exception 'Tema desconocido.'; end if;
  update admin.tema_festivo set tema=p_tema, cambiado_at=now() where id;
  return p_tema;
end; $$;
revoke all on function public.admin_tema_festivo(text) from public, anon;
grant execute on function public.admin_tema_festivo(text) to authenticated;

commit;
