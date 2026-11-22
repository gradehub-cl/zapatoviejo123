-- avisos-push: cada fila nueva de avisos_salientes llama a la Edge Function
-- avisos-push con pg_net, igual que un Database Webhook del panel (mismo
-- cuerpo: type, table, schema, record). Va después de amigos_avisos.sql.
-- El secreto del header vive en Vault con el nombre 'avisos_push_secreto'
-- (el mismo valor que AVISOS_SECRETO de la función), nunca en este archivo.
-- Sin ese secreto en Vault, el disparador no llama a nada y la cola se limpia
-- sola a las 24 horas. Reaplicable.

create or replace function public.avisos_salientes_llamar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'avisos_push_secreto' limit 1;
  if s is null then return new; end if;
  perform net.http_post(
    url := 'https://lsulsnswzesyekpsvlql.supabase.co/functions/v1/avisos-push',
    body := jsonb_build_object('type', 'INSERT', 'table', 'avisos_salientes', 'schema', 'public', 'record', to_jsonb(new), 'old_record', null),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-avisos-secreto', s),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke all on function public.avisos_salientes_llamar() from public, anon, authenticated;

drop trigger if exists avisos_push on public.avisos_salientes;
create trigger avisos_push
  after insert on public.avisos_salientes
  for each row execute function public.avisos_salientes_llamar();
