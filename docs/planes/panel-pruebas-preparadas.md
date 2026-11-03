# Plan: evaluaciones preparadas con el profesor

Fecha: 2026-11-03. Rama: `codex/panel-pruebas-preparadas`.
Estado: **propuesta pendiente del OK explícito de Lucas**. Esta PR solo contiene
este plan: no implementa la función, no incluye DDL y no aplica SQL.

## Problema y alcance

La fecha de inicio por ramo no demuestra que el alumno prepare todas las pruebas
posteriores con ese profesor. Mantenerla como única clasificación mezcla, por
ejemplo, una I2 preparada con una I3 que no preparó. Las marcas serán una
clasificación declarada por el profesor de esa conexión, no una prueba de que las
clases causaron una mejora. No cambian notas ni el motor de cálculo.

### Lo comprobado en main (`0625f5b`)

- `metricasAlumnoPanel` y `metricasGrupoPanel`, en
  `src/marketplace/alumnos-comparaciones.js`, usan `inicioRamoPanel`: fecha del
  ramo, fecha general y finalmente fecha en que compartió. Exigen dos
  evaluaciones comparables a cada lado para mostrar un cambio.
- `profesor_alumnos.id` identifica la conexión. Sus dos propietarios tienen FK
  a `auth.users ON DELETE CASCADE`. `dejar_de_compartir` y `quitar_alumno` borran
  la conexión; `mis_alumnos` devuelve únicamente los ramos compartidos.
- La escritura normal conserva `categorias[].notas[].id`: editar nombre, nota,
  fecha o posición no requiere cambiarlo (`confirmEditNota`, `setSlotNota`).
  `normalize` conserva ids válidos y `ramoParaPanel` lo usa al leer.
- **No todas las casillas dibujadas tienen un id persistido:** una categoría
  vacía o un slot aún no creado puede tener solo el id de categoría o su posición.
  Además, `idSeguro` genera uno si el importado está ausente o es inválido; ese
  id generado durante la lectura del profesor no es una identidad guardada.
  Vaciar una casilla sin fecha puede borrar su nota; recrearla crea otra identidad.
- El alumno ya ve sus conexiones y puede revocarlas en
  `pintarCompartidosProfesor` (`src/marketplace/alumnos-compartir.js`).

## Propuesta que recomiendo aprobar

Conservar el esquema de Lucas con tres precisiones para evitar ambigüedades:

1. **Modo automático o selección manual por conexión y ramo.** Sin selección
   guardada, se mantiene exactamente la comparación por fecha de hoy. Una primera
   marca guardada activa el modo manual y solo las evaluaciones seleccionadas
   cuentan como preparadas. No se copian silenciosamente todas las posteriores
   a la fecha a esa selección.
2. **Desmarcar la última no reactiva el automático.** Se conserva la selección
   manual vacía: ninguna preparada, sin cambio calculable. Una acción separada,
   «Volver a usar la fecha de inicio», elimina la selección y vuelve al resultado
   anterior. Esto evita que quitar la última marca vuelva a atribuir la I3.
3. **No mezclar ambos métodos en una sola mediana del grupo.** Cuando convivan
   ramos con marcas y sin ellas, separar el resumen en «Por evaluaciones marcadas»
   y «Por fecha de inicio». Cada fila declara su método. No llamar «preparadas» a
   pruebas que solo se infirieron por fecha. Si todos usan un método, se muestra
   un solo resumen. Se conserva el conteo por par alumno–ramo de #973.

Estas precisiones cambian la propuesta inicial; quedan para decisión de Lucas
antes de escribir implementación.

### Identidad: requisito previo, sin migración oculta

La clave será **conexión + ramo.id + nota.id**, tomada del JSON crudo ya guardado
en `user_ramos`, antes de normalizar. Los ids son texto, no necesariamente UUID.
Validar que el ramo siga compartido y que cada nota pertenezca a él y sea única;
rechazar ids duplicados, inválidos, inexistentes o generados solo en el navegador.
Nunca identificar por índice, slot, nombre, fecha ni sigla.

Solo podrán marcarse evaluaciones con ese id persistido, incluidas pendientes
que ya tengan un objeto nota guardado. Una casilla sin id quedará sin control
editable y explicará «La evaluación aún no está guardada por el alumno». El
profesor no creará notas en la cuenta del alumno para obtener un id.

Si Lucas requiere marcar también casillas que aún no existen en los datos,
**esa parte queda bloqueada**: necesitaría otra propuesta de identidad y su
migración explícita. No se construirá con ids inventados. Si se borra una nota,
su marca no pasa a otra al reutilizar el nombre o el slot; al leer se ignora el
id que ya no existe, sin reactivar el modo automático.

## Datos, RPC y seguridad propuestos

Usar `supabase/profesor_alumnos.sql`, como pidió Lucas, sin archivo SQL adicional.
Después del OK, la aplicación manual será responsabilidad de Lucas/Claude,
antes del merge; nunca se ejecutará contra producción desde esta tarea.

- Una tabla `public.profesor_alumnos_preparacion`, una fila por conexión y ramo.
  Guarda el conjunto de `nota.id` preparadas y `updated_at`; una fila presente
  con conjunto vacío sigue siendo modo manual. Ausencia de fila = automático.
- PK por conexión y ramo. FK a la conexión con `ON DELETE CASCADE`; FK directas
  a las cuentas profesor y alumno con cascada. Vincular conjuntamente conexión
  y propietarios con una FK compuesta, respaldada por unicidad en el padre,
  para que no se puedan asociar propietarios de otra conexión.
- RLS activada, sin acceso directo a tablas para `PUBLIC`, `anon` o
  `authenticated`, siguiendo el patrón privado del panel existente. Leer y
  escribir mediante RPC con autorización explícita; RLS no sustituye esos
  controles dentro de una función privilegiada.
- RPC de lectura nueva, por conexión y ramo, para ambos participantes. El
  profesor necesita `panel_alumnos_activo(auth.uid())`; el alumno solo puede
  consultar sus propias conexiones. No devuelve correos ni ids de cuentas.
  Una lectura vacía y un error de carga se distinguen.
- RPC de escritura solo para el profesor propietario, aprobado y con panel
  activo. Recibe la selección completa; valida contra los datos persistidos,
  no contra una lista enviada por el profesor. Escritura atómica y bloqueo de
  la conexión al validar/guardar, para no competir con una revocación.
- Volver al automático elimina esa fila mediante la misma autorización. No
  permite borrar la conexión ni editar fecha de inicio, notas o ramos del alumno.
- Funciones con `auth.uid()`, `search_path` fijo, sin SQL dinámico; revocar
  ejecución de `PUBLIC`/`anon` y conceder solo las RPC necesarias. Usar
  `SECURITY DEFINER` únicamente para acceder a las tablas privadas tras validar
  al llamante, como las RPC existentes. Auditar permisos además de RLS.
- Revocar toda la conexión o borrar cualquiera de las dos cuentas elimina las
  selecciones en cascada. Un trigger sobre el cambio de ramos compartidos
  elimina selecciones de los ramos retirados: compartirlos de nuevo no resucita
  marcas anteriores. Las lecturas también comprueban que el ramo y nota sigan
  existiendo en `user_ramos`; la FK no alcanza al interior de un JSON.
- SQL reaplicable: tabla/índices con `IF NOT EXISTS`, funciones con
  `CREATE OR REPLACE` y triggers reemplazables. Conservar las firmas de las RPC
  actuales (`mis_alumnos`, `mis_profesores`) para la compatibilidad en caché.
  Probar el orden de reaplicación y que no borre selecciones guardadas.

## Cliente y estadísticas propuestos

- Ficha del alumno y ramo: una casilla «Preparó conmigo» por evaluación elegible,
  junto a nombre/fecha. Sin selección manual, indicar que se sigue usando la
  fecha, sin mostrar checks inferidos como si fueran declaraciones del profesor.
  Guardar la primera selección antes de cambiar las estadísticas. Fallar al
  guardar no debe parecer éxito ni activar un modo distinto.
- En manual, presentar «Preparadas / No preparadas» y «Cambio entre grupos»;
  en automático, conservar «Antes / Desde que empezó» con la fecha de inicio.
  No imponer la fecha de inicio a una prueba marcada: puede ser anterior a ella.
- Mantener `MIN_EVALS_COMPARACION` por lado y par alumno–ramo, el ajuste contra
  el agregado de la misma evaluación y su mínimo de cinco personas. No mostrar
  un cambio cuando falten datos. Una evaluación sin nota no aporta al promedio.
- En manual, una nota guardada sin fecha sí puede clasificarse por id; puede
  aparecer en la tabla, pero no inventar una fecha para ponerla en el gráfico.
  En automático, mantener exactamente la exclusión actual por falta de fecha.
- Adaptar encabezados, leyendas, lector de pantalla, tabla y CSV al método. En
  CSV, conservar el orden de columnas existentes. En modo manual, dejar vacías
  las columnas históricas de antes/desde y su cambio, en vez de reinterpretarlas;
  agregar al final el método, condición por evaluación y resultados de los grupos
  preparados/no preparados. En automático, las columnas actuales quedan iguales.
  No presentar una selección manual como un corte temporal.
- El alumno podrá abrir, desde su conexión en Ajustes, una lista de solo lectura
  con el método y las evaluaciones marcadas por ese profesor. Mantener visible
  «Dejar de compartir»; no permitirle editar declaraciones del profesor.
- Sin la nueva RPC (`PGRST202`/`42883`), conservar el panel de hoy y ocultar los
  controles que no funcionarían. Un error transitorio no debe reinterpretar una
  selección manual conocida como automática: mostrar error y permitir reintento.
- Tras revocar, el servidor deniega lecturas y escrituras. Al recargar o volver
  al panel se revalida la conexión y se retira el alumno, sin conservar marcas
  en almacenamiento persistente del profesor. Datos ya descargados no se pueden
  retirar remotamente de una pantalla sin conexión; no prometerlo.

## Archivos previstos y coordinación

Más de tres archivos y una tabla nueva: el OK solicitado abarca este plan,
incluidas las nuevas RPC y la lectura del alumno. Aún no están implementados.

| Pieza | Archivos previstos |
|---|---|
| Tabla, RPC, permisos y borrado | `supabase/profesor_alumnos.sql` |
| Carga/guardado y controles | `src/marketplace/alumnos-pantalla.js`, `alumno-editorial.js` |
| Clasificación y resúmenes | `src/marketplace/alumnos-comparaciones.js`, `alumnos-evolucion.js` |
| CSV | `src/marketplace/alumnos-resumen.js` |
| Lectura del alumno | `src/marketplace/alumnos-compartir.js` |
| Estilos mínimos | `styles.css` (fuera del carril habitual, incluido en el OK solicitado) |
| Pruebas y guía | tests sintéticos JS/PGlite y documentación del panel |

Coordinar antes de implementar con #972, #973 y #974 (abiertas al redactar):
explicación de topes, filas por alumno–ramo y tamaño de muestra respectivamente.
No copiarlas a esta rama ni mergearlas para desbloquear el plan. Actualizar desde
el main del momento y mantener los tres contratos al resolver conflictos.

## Comprobaciones para aprobar la implementación futura

- Sin selecciones: igualdad exacta con resultados actuales, incluidos corte por
  ramo, límites, datos sin fecha y muestras insuficientes.
- I2 marcada e I3 sin marcar, ambas después del inicio: grupos distintos. La
  selección es propia de cada ramo y conexión, no de la academia o del alumno
  globalmente. Nota anterior al inicio marcada también queda preparada.
- Primera marca, selección vacía posterior y vuelta explícita al automático;
  conjuntos mixtos del grupo no se agregan bajo una etiqueta engañosa.
- Renombrar/reordenar/editar conserva la marca; borrar y recrear no la transfiere.
  Id ausente, inventado, duplicado o nota de otro ramo se rechaza. Casilla sin
  objeto persistido no ofrece escritura.
- PGlite con profesor A/B, alumno y tercero, más `anon`: permisos positivos y
  negativos de lectura/escritura, profesor suspendido/panel desactivado, intento
  de cambiar propietarios, revocación concurrente, eliminación de ambos tipos
  de cuenta y reaplicación sin pérdida de datos.
- Retirar un ramo y volver a compartirlo no recupera marcas. Revocar la conexión
  deja de devolver alumno, marcas y acceso a RPC; una nueva conexión empieza
  automática. Cliente sin SQL y error temporal también se prueban.
- Navegador sintético a 375/1280, claro/oscuro, texto al 200%, teclado/VoiceOver,
  44 pt y foco; `npm run build`, comprobaciones JS/CSS, vocabulario y suite completa.

HIG: [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)
y [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables).
Selección identificable además del color, filas tocables, texto junto al control,
sin alterar el semáforo de las notas. Seguridad:
[RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Estado de este borrador

Solo se revisaron fuentes y se documentó la propuesta. El chequeo inicial de
`bash bin/estado.sh` pasó la suite existente. En esta rama también pasaron build,
comprobación JS, balance CSS, `git diff --check` y los 393 archivos de tests de
main; esto **no valida la función futura**.
No hay feature, tabla, RPC, migración aplicada ni capturas de una implementación.
Lucas debe aprobar o corregir las tres precisiones y la cobertura limitada a ids
persistidos antes de continuar. No marcar esta PR lista ni mergearla como feature.
