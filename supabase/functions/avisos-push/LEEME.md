# avisos-push

Manda a Apple los avisos de Amigos (solicitudes, amistades aceptadas,
invitaciones a grupos y salas nuevas). La cola la llena `supabase/amigos_avisos.sql`.

## Ponerlo en marcha (una vez)

1. **Llave de Apple.** Developer → Certificates, IDs & Profiles → Keys → crear
   una llave con **Apple Push Notifications service (APNs)**. Bajar el `.p8`
   (se baja una sola vez) y anotar el Key ID. Puede ser la misma llave de
   «Entrar con Apple» si se le agrega APNs.
2. **App ID.** Identifiers → `cl.gradehub.app` → activar **Push Notifications**.
   En Xcode ya está el permiso (`aps-environment` en `App.entitlements`).
3. **SQL.** Aplicar `supabase/amigos_avisos.sql` (después de los otros de Amigos).
4. **Secretos y función** (desde la carpeta del repo, con la CLI de Supabase):

   ```bash
   supabase secrets set AVISOS_SECRETO=<algo largo al azar> APNS_TEAM_ID=PH6XQV8L2M APNS_KEY_ID=<Key ID> APNS_P8="$(cat AuthKey_XXXX.p8)"
   supabase functions deploy avisos-push --no-verify-jwt
   ```

   `--no-verify-jwt` porque la llama el webhook con su propio secreto, no una
   sesión. Para probar con una build de Xcode (desarrollo) agrega
   `APNS_SANDBOX=1`; TestFlight y App Store usan producción (sin esa variable).
5. **Disparador.** En vez del Webhook del panel, `supabase/amigos_avisos_webhook.sql`
   llama a la función con `pg_net` en cada INSERT de `avisos_salientes`. El
   secreto del header se guarda en Vault con el nombre `avisos_push_secreto`
   (el mismo valor que `AVISOS_SECRETO`), nunca en el repo.
   Puesto en marcha el 2026-11-21: llave `A9PZ8Y5P7W`, función desplegada por
   la API de administración y secreto en Vault.

## Qué no hace

- No guarda ni registra el contenido de los avisos ni los tokens.
- Si Apple dice que un token murió (410, `BadDeviceToken`, `Unregistered`),
  lo borra. La fila de la cola se borra siempre después de intentarlo.
- Sin webhook, la cola se limpia sola a las 24 horas (la primera fila nueva
  borra las viejas).
