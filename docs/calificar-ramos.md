# Opiniones de ramos: operación y privacidad

Esta función no guarda notas académicas ni altera el promedio, la pauta o
`gradehub_v1`. Sus respuestas cerradas viven en una tabla separada de Supabase.

## SQL manual

Lucas debe revisar y aplicar `supabase/ramo_calificaciones.sql` **después de
`supabase/profesores.sql` y antes de integrar el cliente**. El archivo se puede
volver a ejecutar. No reemplaza funciones de profesores ni modifica sus tablas.

Sin ese SQL, o sin red, agregar ramos funciona igual; la hoja de opiniones
indica que no pudo cargar. No se guardan respuestas provisionalmente en la
cuenta ni se intenta migrar sus notas.

La tabla tiene RLS y no permite acceso directo desde `anon` o `authenticated`.
Las cuatro RPC autorizadas requieren sesión. Solo el autor accede a su propia
respuesta; el resto recibe agregados. Eliminar `auth.users` elimina sus
opiniones por FK `ON DELETE CASCADE`.

## Cuentas existentes

- Para escribir, el ramo y la sección deben estar en `user_ramos` del autor.
  Se rechazan cuentas de profesor, también en el servidor.
- Se puede editar o borrar una respuesta por ramo y período mientras ese
  contexto siga sincronizado. No se crean opiniones a partir de las notas.
- El historial sirve cuando ya guarda sección y universidad verificable en
  `origen.tenant` o `cierre.tenant`. Entradas antiguas sin esos datos quedan
  fuera; no se les inventan campos ni se atribuye la universidad actual.
- El aviso de la ficha exige al menos 50% evaluado o un ramo cerrado. Se marca
  al mostrarse, por cuenta, ramo y período, en una clave local separada:
  `gh_ramo_calificar_v1:…`. Esa preferencia no se sincroniza entre dispositivos.
- Calificar al profesor abre un paso opcional después de guardar sus estrellas.
  Archivar ofrece los ramos cerrados que aún no tienen respuesta. Ninguno de
  esos pasos modifica el guardado de notas o el archivo del semestre.

## Qué se publica

`ramo_piso_publicacion()` fija cinco cuentas distintas. Para no contar varias
veces a quien repite el ramo, el resumen usa su respuesta del **semestre más
reciente**, no la última edición de un semestre antiguo. Esta elección no
borra sus otras respuestas privadas.

Una etiqueta requiere tres cuentas. Los números de carga y facilidad se
muestran en colores neutros: son opiniones, no notas ni reglas del programa.
La asistencia se rotula expresamente como lo que dicen los estudiantes.

Los docentes se atribuyen mediante los aportes y el consenso existente de
sección/período. Un aporte propio que contradice el consenso no se atribuye al
docente ganador. Los nombres se presentan como docentes informados en distintos
semestres, sin prometer que dictan el siguiente.

Las estrellas conservan la consulta y el piso de tres de
`profesor_calificacion_estado`. Su carga y facilidad específicas requieren
cinco opiniones de ramo; bajo ese piso no se publica siquiera el tamaño del
subgrupo. Si el ramo completo no alcanza su piso, no se muestra ningún desglose.

Un nombre de `profesor_ocultos` nunca aparece. Sus opiniones solo contribuyen
al total si hay cinco cuentas sin ese docente. Se comprueba también a los
autores sin aporte propio que puedan asociarse por el consenso de su sección.
La receta de supresión al final del SQL debe ejecutarse **antes de borrar
`profesor_aportes`**, y luego seguir la receta existente de `profesores.sql`.

## Etiquetas propuestas para aprobación de Lucas

Mucha lectura; Controles semanales; Trabajo en grupo; Buen material;
Muy interesante; Exigente pero justo; Asistencia obligatoria;
Evaluaciones frecuentes; Práctica aplicada; Proyectos y presentaciones;
Discusión en clases; Retroalimentación útil.

No existe «Otro», texto libre ni moderación en esta etapa. La segunda fase
queda pendiente: filtros/orden por carga, facilidad y recomendación, y
comentarios escritos con moderación.

## Validación

`tests/ramo-calificaciones-sql.test.js` aplica el SQL en PGlite, lo reaplica y
comprueba piso, permisos, propiedad, historial, docentes ocultos, edición,
borrado y cascada. `tests/ramo-calificaciones-cliente.test.js` comprueba
etiquetas, aviso local, contexto, estado académico intacto y catálogo sin RPC.

Las capturas usan una cuenta sintética existente con sección y notas; hay
versiones a 375 y 1280 px, claro/oscuro, y texto al 200% en
[`tests/capturas/calificar-ramos`](../tests/capturas/calificar-ramos/).
El recorrido de navegador verifica calificar, editar, borrar, cierre de un
semestre anterior, resumen con/sin muestra, paso después del profesor y agregar
un ramo sin SQL. No se consultaron cuentas reales.

Se siguen las HIG de [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets),
[Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls)
y [Charts](https://developer.apple.com/design/human-interface-guidelines/charts):
una hoja a la vez, una acción principal, opciones excluyentes de 44 pt,
distribuciones en barras con valores también en texto, y cifras neutrales.
Se revisaron foco, movimiento reducido, lectura al 200% y contraste de texto
de al menos 4,5:1 en claro y oscuro.
