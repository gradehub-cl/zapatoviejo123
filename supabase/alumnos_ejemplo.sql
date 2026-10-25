-- Alumnos de ejemplo en el panel de un profesor.
--
-- APLÍCALO a mano en el SQL Editor, DESPUÉS de clases_particulares.sql,
-- administradores.sql y profesor_alumnos.sql, y ANTES de mergear el PR que
-- llama a estas funciones. Es aditivo y reaplicable.
--
-- DECISIÓN DE LUCAS (2026-10-22): un administrador lo activa para el profesor
-- que elija (para probar el panel con su propia cuenta, o para mostrárselo a
-- un profesor que todavía no tiene alumnos). Ese profesor ve su pestaña
-- Alumnos con alumnos y compañeros SINTÉTICOS que arma su navegador, con una
-- franja que dice que son de ejemplo. Nada de eso se guarda ni entra a ningún
-- promedio: esta columna es lo único que vive en la base.
--
-- ACCESO: el profesor no lee ni escribe la columna directo (no entra a los
-- grant de columnas de tutor_perfiles). La consulta por mis_alumnos_ejemplo,
-- que responde solo por su propia cuenta. Activarla o desactivarla exige
-- administrador con segundo factor, y queda en admin.acciones.

begin;

alter table public.tutor_perfiles
  add column if not exists alumnos_ejemplo boolean not null default false;

-- ¿Mi panel va con alumnos de ejemplo? Solo para un profesor aprobado.
create or replace function public.mis_alumnos_ejemplo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.alumnos_ejemplo from public.tutor_perfiles p
                   where p.user_id = auth.uid() and p.estado = 'aprobado'), false);
$$;

-- Para el panel de Administración: qué profesores lo tienen activo.
create or replace function public.admin_alumnos_ejemplo()
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, admin
as $$
begin
  perform admin.exigir_administrador();
  return query select p.user_id from public.tutor_perfiles p where p.alumnos_ejemplo;
end;
$$;

create or replace function public.admin_fijar_alumnos_ejemplo(p_user_id uuid, p_activo boolean)
returns boolean
language plpgsql
security definer
set search_path = public, admin
as $$
declare
  filas integer := 0;
begin
  perform admin.exigir_administrador();
  if p_activo is null then
    raise exception 'valor inválido';
  end if;
  update public.tutor_perfiles set alumnos_ejemplo = p_activo
   where user_id = p_user_id and alumnos_ejemplo <> p_activo;
  get diagnostics filas = row_count;
  if filas = 1 then
    insert into admin.acciones (admin_id, accion, objetivo, detalle)
    values (auth.uid(), 'alumnos_ejemplo', p_user_id, jsonb_build_object('activo', p_activo));
  end if;
  return filas = 1;
end;
$$;

revoke all on function public.mis_alumnos_ejemplo() from public, anon;
revoke all on function public.admin_alumnos_ejemplo() from public, anon;
revoke all on function public.admin_fijar_alumnos_ejemplo(uuid, boolean) from public, anon;
grant execute on function public.mis_alumnos_ejemplo() to authenticated;
grant execute on function public.admin_alumnos_ejemplo() to authenticated;
grant execute on function public.admin_fijar_alumnos_ejemplo(uuid, boolean) to authenticated;

commit;
