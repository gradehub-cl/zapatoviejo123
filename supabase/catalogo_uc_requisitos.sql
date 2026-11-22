-- Aplicar A MANO. Reaplicable. Requisitos de cursos UC tal como los publica
-- catalogo.uc.cl (view=requisitos): prerrequisitos, relación, restricciones y
-- equivalencias. Datos públicos de cursos, no de cuentas: sin FK a auth.users.
-- Lectura pública (anon y authenticated); solo la clave secreta escribe, desde
-- bin/catalogo-uc-requisitos.js. Los textos se guardan como los escribe el
-- catálogo, sin interpretar: el cliente los lee con evaluarRequisitosUC.
-- «No tiene» se guarda como null.
begin;
create table if not exists public.catalogo_uc_requisitos (
 sigla text primary key check(sigla ~ '^[A-Z][A-Z0-9_]{2,11}$'),
 prerrequisitos text,
 relacion text check(relacion is null or relacion in ('y','o')),
 restricciones text,
 equivalencias text,
 leido_en timestamptz not null default now()
);
-- Los largos van como restricciones con nombre para poder cambiarlos al
-- reaplicar. 20.000 y no 2.000: ACT181 escribe completa la combinatoria
-- «3 de 10» y pasa de 2.300 caracteres (2026-11-21).
alter table public.catalogo_uc_requisitos drop constraint if exists catalogo_uc_requisitos_prerrequisitos_check;
alter table public.catalogo_uc_requisitos drop constraint if exists catalogo_uc_requisitos_restricciones_check;
alter table public.catalogo_uc_requisitos drop constraint if exists catalogo_uc_requisitos_equivalencias_check;
alter table public.catalogo_uc_requisitos add constraint catalogo_uc_requisitos_prerrequisitos_check check(prerrequisitos is null or length(prerrequisitos) between 1 and 20000);
alter table public.catalogo_uc_requisitos add constraint catalogo_uc_requisitos_restricciones_check check(restricciones is null or length(restricciones) between 1 and 20000);
alter table public.catalogo_uc_requisitos add constraint catalogo_uc_requisitos_equivalencias_check check(equivalencias is null or length(equivalencias) between 1 and 20000);
alter table public.catalogo_uc_requisitos enable row level security;
revoke all on public.catalogo_uc_requisitos from public,anon,authenticated;
grant select on public.catalogo_uc_requisitos to anon,authenticated;
grant select,insert,update on public.catalogo_uc_requisitos to service_role;
drop policy if exists catalogo_uc_requisitos_leer on public.catalogo_uc_requisitos;
create policy catalogo_uc_requisitos_leer on public.catalogo_uc_requisitos for select to anon,authenticated using(true);
drop policy if exists catalogo_uc_requisitos_servicio on public.catalogo_uc_requisitos;
create policy catalogo_uc_requisitos_servicio on public.catalogo_uc_requisitos for all to service_role using(true) with check(true);
commit;
