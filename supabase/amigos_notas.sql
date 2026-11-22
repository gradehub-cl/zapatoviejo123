-- Amigos: compartir el promedio de los ramos en común (opcional y recíproco).
--
-- APLÍCALO a mano en el SQL Editor (+ New query) DESPUÉS de amigos.sql, y
-- ANTES de mergear el PR que llama a estas funciones. Se puede correr dos
-- veces. Sin pgcrypto. Si no está aplicado, la app no ofrece compartir notas.
--
-- QUÉ ES (Lucas, 2026-11-20): comparar cómo le va a cada uno en los ramos que
-- toman juntos. Parte apagado. Se enciende desde Amigos → Privacidad.
--
-- CÓMO PROTEGE LAS NOTAS
--   - Apagado por defecto. Sin fila en amigos_notas, nadie ve nada.
--   - Lo que se comparte lo calcula la app con el motor de siempre
--     (ramoAvg/notaFinalOficial) y lo publica ella misma: por ramo, sigla,
--     nombre, promedio redondeado, % evaluado y nivel del semáforo. El servidor
--     nunca lee evaluaciones ni notas sueltas de user_ramos para esto.
--   - Recíproco: solo ve notas de sus amigos quien también comparte las suyas.
--   - Solo ramos en común: de cada amigo se entregan únicamente los ramos cuya
--     sigla está también en el user_ramos de quien pregunta, y solo entre
--     cuentas de la misma universidad (la misma sigla puede ser otro ramo).
--   - Solo amistades aceptadas. Eliminar, bloquear o apagar corta al tiro;
--     apagar borra la fila.
--
-- ACCESO Y BORRADO (reabre la auditoría, AGENTS.md)
--   - amigos_notas: RLS sin políticas y sin permisos; user_id → auth.users ON
--     DELETE CASCADE. Borrar la cuenta borra lo publicado.
begin;

create table if not exists public.amigos_notas (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  ramos      jsonb not null default '[]'::jsonb check (jsonb_typeof(ramos) = 'array' and jsonb_array_length(ramos) <= 30),
  updated_at timestamptz not null default now()
);
alter table public.amigos_notas enable row level security;
revoke all on public.amigos_notas from public, anon, authenticated;

-- Las siglas del semestre de una persona, igual que amigos_ramos_publicos.
create or replace function public.amigos_siglas(p_data jsonb)
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct upper(btrim(s))) filter (where s is not null and btrim(s) <> ''), '{}')
    from jsonb_array_elements(case when jsonb_typeof(p_data -> 'ramos') = 'array' then p_data -> 'ramos' else '[]'::jsonb end) r,
         lateral (select coalesce(nullif(r ->> 'sigla', ''), r -> 'origen' ->> 'ramoKey') s) x
   where jsonb_typeof(r) = 'object'
$$;
revoke all on function public.amigos_siglas(jsonb) from public, anon, authenticated;

create or replace function public.amigos_notas_estado()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  return jsonb_build_object('comparte', exists (select 1 from public.amigos_notas where user_id = uid),
                            'updated_at', (select updated_at from public.amigos_notas where user_id = uid));
end;
$$;

-- Publica (o actualiza) lo que la app calculó. Se guarda solo lo que pasa el
-- filtro: lo demás se descarta, no se rechaza, para no frenar una sincronización.
create or replace function public.publicar_mis_notas(p_ramos jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); limpio jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'sigla', upper(btrim(r ->> 'sigla')),
           'nombre', left(btrim(coalesce(r ->> 'nombre', '')), 80),
           'promedio', case when jsonb_typeof(r -> 'promedio') = 'number' and (r ->> 'promedio')::numeric between 1 and 7
                            then round((r ->> 'promedio')::numeric, 1) end,
           'avance', case when jsonb_typeof(r -> 'avance') = 'number' and (r ->> 'avance')::numeric between 0 and 100
                          then round((r ->> 'avance')::numeric)::integer end,
           'nivel', case when r ->> 'nivel' in ('good', 'warn', 'bad', 'neutral') then r ->> 'nivel' else 'neutral' end)), '[]'::jsonb)
    into limpio
    from (select r from jsonb_array_elements(case when jsonb_typeof(p_ramos) = 'array' then p_ramos else '[]'::jsonb end) r
           where jsonb_typeof(r) = 'object' and coalesce(btrim(r ->> 'sigla'), '') ~ '^[A-Za-z0-9 _.-]{2,20}$'
           limit 30) t;
  insert into public.amigos_notas(user_id, ramos) values (uid, limpio)
  on conflict (user_id) do update set ramos = excluded.ramos, updated_at = now();
  return jsonb_array_length(limpio);
end;
$$;

create or replace function public.dejar_de_compartir_notas()
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion();
begin
  delete from public.amigos_notas where user_id = uid;
  return true;
end;
$$;

-- Por amistad aceptada: los ramos en común que ese amigo publicó.
-- Vacío si quien pregunta no comparte las suyas.
create or replace function public.amigos_notas()
returns table(id uuid, ramos jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := public.amigos_exigir_sesion(); mias text[];
begin
  if not exists (select 1 from public.amigos_notas where user_id = uid) then return; end if;
  select public.amigos_siglas(d.data) into mias from public.user_ramos d where d.user_id = uid;
  if mias is null or cardinality(mias) = 0 then return; end if;
  return query
  select a.id, coalesce((select jsonb_agg(r) from jsonb_array_elements(n.ramos) r where r ->> 'sigla' = any (mias)), '[]'::jsonb)
    from public.amistades a
    join public.amigos_notas n on n.user_id = case when a.de = uid then a.para else a.de end
   where (a.de = uid or a.para = uid) and a.estado = 'aceptada'
     -- La misma sigla puede ser otro ramo en otra universidad.
     and (select p.universidad from public.profiles p where p.id = n.user_id)
         is not distinct from (select p.universidad from public.profiles p where p.id = uid);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['amigos_notas_estado()', 'publicar_mis_notas(jsonb)', 'dejar_de_compartir_notas()', 'amigos_notas()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
