# Cuenta solo profesor: compartir notas, #811

`compartir_con_profesor` rechaza `tipoCuenta='profesor'`. `mis_alumnos` no entrega sus vínculos antiguos y esos vínculos tampoco habilitan `comparacion_ramo_profesor`. Los agregados ya filtraban sus notas: se conserva ese filtro. Ser tutor aprobado en una cuenta estudiante no activa esta exclusión.

No se borra `profesor_alumnos`, `user_ramos`, `curso_notas` ni un historial. Las cuentas sin `tipoCuenta` conservan el comportamiento estudiante. El bloqueo opera en la RPC, aunque un cliente antiguo siga ofreciendo el enlace.

Lucas o Claude deben reaplicar **`supabase/profesor_alumnos.sql`** antes del merge. Reaplicable, sin tablas nuevas ni ampliación de permisos; no se aplicó en producción. El archivo parte de main con UDD de #920.

## Comparación de producción, solo lectura, 2026-11-02

Los cuerpos base coinciden exactamente con `md5(prosrc)` de producción antes de modificar estas tres funciones:

| Función | md5 base = producción |
|---|---|
| compartir_con_profesor | `1b4f7aad6eddd8c0bb0f28f32965d787` |
| mis_alumnos | `427d36cb10bc539bda70049dc2bbd9ed` |
| comparacion_ramo_profesor | `7f5e712f8862cbbb655c7f28229be30c` |

Antes de aplicar, volver a comparar: si alguna función cambió, revisar el nuevo cuerpo para no hacer retroceder cambios ajenos.

```sql
select p.oid::regprocedure as funcion, md5(p.prosrc) as md5
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
and p.proname in ('compartir_con_profesor','mis_alumnos','comparacion_ramo_profesor');
```

El encargo describía una cuenta convertida sin ramos. La consulta agregada actual encuentra **0 cuentas solo profesor con un consentimiento antiguo aún guardado**; no se consultaron notas ni identidades. La protección sigue siendo necesaria para nuevos intentos o conversiones futuras.

PGlite prueba estudiante → consentimiento → conversión, bloqueo con y sin ramos, ocultación sin borrar, autorización de comparación, mínimo de cinco, UDD y reaplicación del SQL. No modifica la UI ni el Wrapped.
