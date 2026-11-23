-- El agente puede VER sus propuestas pendientes y RETIRAR una. Aplícalo en el
-- SQL Editor después de `agente_ramos_propuestas.sql` y ANTES de mergear el PR.
-- Es reaplicable: solo crea o reemplaza dos funciones.
--
-- Para qué: una propuesta mala (un peso mal leído, una nota en la evaluación
-- equivocada) quedaba viva hasta que la persona la rechazara, y el agente que se
-- dio cuenta no tenía cómo sacarla. Ni siquiera podía saber qué había dejado.
--
-- NADA NUEVO EN LA TABLA. Retirar es lo mismo que ya hace una propuesta nueva
-- de notas, fechas o ramos con la pendiente anterior: pasa a 'descartada'. No
-- toca `user_ramos`, no aplica nada y solo actúa sobre propuestas PENDIENTES de
-- la dueña del token: una aceptada o rechazada ya es decisión de la persona.
-- Sin tabla nueva no cambian RLS ni el borrado de cuenta: la tabla sigue sin
-- políticas y con su FK a auth.users ON DELETE CASCADE.

create or replace function public.listar_propuestas_agente(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_lista jsonb;
begin
  select user_id into v_user
    from public.agent_links
   where token = p_token and expires_at > now();
  if v_user is null then raise exception 'La conexión ya no es válida. Vuelve a vincular el agente.'; end if;

  -- Solo lo que sigue esperando a la persona, lo más nuevo primero. El tope
  -- es holgado: cada tipo deja como mucho una pendiente por ramo.
  select coalesce(jsonb_agg(fila order by creada desc), '[]'::jsonb) into v_lista
    from (
      select jsonb_build_object(
               'id', id, 'tipo', tipo, 'ramo', ramo,
               'contenido', evaluaciones, 'fuente', fuente, 'creada', created_at
             ) as fila, created_at as creada
        from public.agent_pauta_proposals
       where user_id = v_user and status = 'pendiente'
       order by created_at desc
       limit 50
    ) pendientes;
  return v_lista;
end;
$$;

create or replace function public.retirar_propuesta_agente(p_token text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select user_id into v_user
    from public.agent_links
   where token = p_token and expires_at > now();
  if v_user is null then raise exception 'La conexión ya no es válida. Vuelve a vincular el agente.'; end if;

  update public.agent_pauta_proposals
     set status = 'descartada', resolved_at = now()
   where id = p_id and user_id = v_user and status = 'pendiente';
  if not found then
    raise exception 'No se encontró esa propuesta pendiente: puede que la persona ya la haya aceptado o rechazado.';
  end if;

  update public.agent_links set last_used_at = now() where token = p_token;
  return true;
end;
$$;

revoke all on function public.listar_propuestas_agente(text) from public, authenticated;
revoke all on function public.retirar_propuesta_agente(text, uuid) from public, authenticated;
grant execute on function public.listar_propuestas_agente(text) to anon, authenticated;
grant execute on function public.retirar_propuesta_agente(text, uuid) to anon, authenticated;
