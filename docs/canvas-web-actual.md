# Canvas web: reemplazo de #689

Sobre main actualizado con #954. No depende de la PR nativa: la conexión web usa la fuente de calendario; el token personal de API sigue exclusivamente en iPhone. La foto del horario no sustituye traer fechas. El emparejamiento y la revisión común de #806 se conservan.

En Ajustes → Calendario, una cuenta estudiante UC con sesión ve Canvas UC fuera de la app nativa. Se puede conectar con la URL de la fuente, actualizar o desconectar con confirmación. Se acepta webcal como entrada y se normaliza a HTTPS. Las fechas se revisan antes de confirmar: no se importan notas, ponderaciones ni se pisan fechas guardadas.

## URL privada y función de servidor

La URL permite leer el calendario y se trata como credencial: solo se guarda localmente en `gradehub_canvas_ics`, fuera de S/gradehub_v1/Supabase, asociada a la cuenta. Otra cuenta no la usa; cerrar sesión o desconectar la elimina. Una respuesta tardía tras cambiar de cuenta no abre propuestas ni guarda la URL. No entra a analítica ni registros.

`functions/canvas-calendario.js` verifica el JWT contra Auth antes de pedir el calendario. Acepta solo el host de Canvas UC y la ruta exacta de feed personal, sin puerto/usuario/query/fragmento, y rechaza redirects. Lee en streaming con límites de 2.000 bytes de entrada y 512 KiB de calendario, plazo de 8 segundos y respuesta no-store. Errores genéricos sin repetir URL ni contenido. La clave usada es pública y coincide con el cliente; no hay service role.

Se añadió la función a la lista cerrada del deploy. No se publica nada desde esta PR: el merge autorizado posteriormente hará el deploy habitual. Sin SQL ni bindings nuevos.

## Fechas y cuentas existentes

La hora UTC del feed se convierte al día de Chile. Los nombres explícitos se emparejan antes de desduplicar destinos: una segunda I2 no ocupa la I3 por parecido de tipo. Lo que no calza queda en el revisor y lo ajeno a los ramos no se importa. La importación .ics anterior conserva su salida y comportamiento; solo Canvas pide el inicio crudo adicional para convertir zona horaria.

Una cuenta existente no cambia nada hasta conectar y confirmar propuestas. Una URL antigua válida, si venía de la rama experimental, conserva su asociación local. No se sincroniza ni migra a otra cuenta. Un feed válido sin fechas futuras puede quedar conectado para actualizarlo después.

## Comprobación y fuentes

386 tests completos, JS/CSS/build/diff; sesión ausente/rechazada, 13 URLs inválidas, redirects, tamaños, calendario inválido, errores sin URL, Chile/UTC, revisión y separación por cuenta, incluida respuesta tardía. Chrome en Ajustes real a 375 px, claro/oscuro: campo y acción de 44 pt, error en contexto y sin desborde.

HIG [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) y [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy). Fuentes técnicas: [Cloudflare Functions](https://developers.cloudflare.com/pages/functions/api-reference/), [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) y [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser). No se usaron calendarios, tokens ni datos de alumnos reales.
