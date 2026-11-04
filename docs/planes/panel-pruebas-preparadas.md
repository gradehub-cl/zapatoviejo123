# Evaluaciones preparadas con el profesor

Plan aprobado por Lucas el 2026-11-04; implementación en #976. Más de tres
archivos y una tabla nueva, dentro del alcance aprobado. No cambia notas,
`gradehub_v1`, el motor ni el umbral de al borde.

## Método

Sin una selección guardada, cada par alumno–ramo conserva la comparación por
fecha de inicio. Guardar la primera selección activa «Preparadas / No
preparadas». Desmarcar todas conserva el modo manual vacío. Solo «Volver a usar
la fecha de inicio» elimina la selección. Con menos de dos evaluaciones
comparables por grupo no se muestra cambio. Las referencias de GradeHub siguen
exigiendo cinco personas; las marcas no prueban causalidad.

El resumen separa los ramos manuales de los automáticos, sin una mediana que
mezcle métodos. El CSV conserva posiciones anteriores: en manual deja vacías
las columnas temporales y agrega método, condición por evaluación y resultados
por grupo al final. Una nota sin fecha puede clasificarse manualmente por id,
pero no recibe una fecha inventada para el gráfico.

## Identidad y futuras

El servidor valida sobre el JSON crudo de `user_ramos`, no ids generados por
`normalize`. Las notas existentes usan su `nota.id` único. Las casillas futuras
sin objeto nota usan ramo.id + categoría.id + número visible, con una guarda
adicional de cantidad de casillas y número inicial (`slots`, `slotStart`). Solo
se enumeran futuras de categorías directas, con cantidad conocida. Los nombres
se conservan como etiquetas, nunca como identidad.

Una lectura autenticada bajo bloqueo de conexión ata la futura una sola vez al
id persistido único. Cambiar cantidad/inicio, borrar categoría/número o encontrar
dos candidatas invalida la marca: «Marca sin evaluación: I3 de Interrogaciones».
El profesor puede borrarla y seleccionar otra. Una marca ya ligada no pasa a una
nota recreada en la misma posición. Renombrar conserva el id. No se crean notas
ni se escribe en `user_ramos`.

**Límite:** borrar/recrear una casilla todavía vacía en la misma posición y con
idéntica forma dentro de una sola sincronización es indistinguible. Antes del
id la marca refiere a esa casilla lógica. Detectar ese reemplazo requeriría ids
futuros persistidos por el alumno, fuera del acuerdo de datos de esta PR.
Una modificación transitoria que no llegue a leerse tampoco puede reconstruirse.

## SQL y permisos

Lucas/Claude deben aplicar **`supabase/profesor_alumnos.sql` antes del merge**,
con sus requisitos existentes; es reaplicable. No se aplicó en producción.
La tabla privada `profesor_alumnos_preparacion` tiene RLS y permisos de tabla
revocados. FK compuesta a conexión/propietarios y FK a ambas cuentas con cascada.
Revocar, borrar cuenta o retirar el ramo compartido elimina sus marcas.

- `preparacion_alumno`: ambos participantes leen solo conexiones propias; el
  profesor requiere panel activo y aprobación. Puede completar la identidad de
  una marca, nunca modificar notas del alumno.
- `guardar_preparacion_alumno`: solo profesor propietario aprobado con panel
  activo, validación de ramo compartido e inventario del servidor; bloqueo de
  conexión para coordinar con revocaciones.
- Helpers internos sin ejecución para clientes. RPC con `search_path` fijo,
  sin SQL dinámico; sin cambio a las firmas actuales.
- El alumno puede consultar las marcas desde Ajustes y sigue pudiendo revocar.

Sin las RPC nuevas, se conserva el panel por fecha y se ocultan los controles.
Un error de red con marcas conocidas conserva ese método y suspende el cambio
calculado; nunca finge que se guardó. Las marcas solo se cachean en memoria de
pantalla, separadas por cuenta/conexión. Una revocación se verifica en cada RPC
 y al recargar el listado; no retira remotamente una pantalla ya descargada.

## Validación

PGlite: futura sin nota, enlace único aun sin valor, renombre, borrado/recreación,
forma distinta, candidatas duplicadas, selección vacía/reset, cuentas ajenas,
alumno solo lectura, anon, tablas privadas, reaplicación, retirada/revocación y
cascada. Se verifica que leer/guardar no modifica el documento del alumno.
JS: igualdad de la regla anterior, grupos por selección, mínimos, métodos
separados, CSV y compatibilidad sin SQL/error temporal.

Chrome sin red, datos sintéticos: selección futura, guardar y volver al
automático; filas/acciones ≥44 pt, sin desbordes ni errores a 375/1280 px,
claro/oscuro y texto al 200%. Capturas en
[`docs/diseno/preparacion-2026-11-04`](../diseno/preparacion-2026-11-04).
No se hizo una sesión real de VoiceOver; controles nativos con etiquetas
asociadas implícitamente y estado marcado accesible.

HIG: [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)
y [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables):
texto junto al checkbox, selección distinta por check además del color y filas
legibles. No hay cambio de semáforo.
