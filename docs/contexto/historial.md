# Antecedentes y trabajo ya realizado

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

### Con qué parte cada uno

**Codex — la revisión estética, PR 3 en adelante.** Los PR 1 (tokens de
movimiento) y 2 (el momento de la nota) ya están en producción. Sigue jerarquía
de Home, después los vacíos, estadísticas y Agenda. Su carril es `app.js` y,
durante la revisión estética, `styles.css`.

**La auditoría de movimiento está cerrada.** Salió de correr la skill
`improve-animations` sobre `styles.css` y `app.js` el 2026-08-11. Se arreglaron
tres defectos (#90: hover pegado en táctil, 340ms de `screenIn` que nunca
corrían, dos `transition:all`) y el modal, que aparecía y desaparecía de golpe
(#91). Después cayeron los cuatro pendientes: las duraciones salen de la escala
(#99), `prefers-reduced-motion` dejó de ser nuclear (#95), `button:active` ya
tiene su transición, y las dos barras de progreso pasaron de animar `width` a
`scaleX()`. Queda dicho porque la lista sobrevivió a tres de sus arreglos: un
traspaso que enumera trabajo ya hecho manda a rehacerlo.

`tests/movimiento.test.js` fija lo arreglado y cuatro reglas más: nada de
`ease-in`, nada de `transition:all`, nada de `scale(0)`, ningún `@keyframes`
huérfano, y ninguna transición sobre propiedades de layout — `width`, `height`,
`top`, `margin` y compañía recalculan el layout en cada fotograma.

**Dos cosas que hacen perder tiempo al verificar movimiento**, y que costaron
descubrir: un documento oculto pausa el compositor, así que si mides una
transición con el panel del navegador escondido siempre vas a leer el valor
inicial congelado — usa `document.getAnimations()` en vez de `getComputedStyle`.
Y en local el `CACHE_NAME` es siempre `gradehub-dev`, así que el service worker
se queda pegado con la copia vieja entre sesiones: desregístralo y borra las
cachés antes de creerle a lo que ves.

Los detalles de Agenda son un acordeón exclusivo. Al cerrar una evaluación que
está más arriba, conserva la posición en pantalla de la que se acaba de tocar;
si no compensas ese cambio de altura, en móvil la fila salta bajo el dedo.

**El consenso de reportes ya está construido. Lo que falta son reportes.** El
recorrido completo existe: `submit_catalog_report` y `catalog_consensus` en
`supabase/catalog_consensus.sql` —agrupa por (ramo, huella) y exige **tres
personas distintas**, no tres reportes; la huella la calcula el servidor con
`huella_catalogo()` y junta la misma pauta escrita distinto, incluido "Control
1, 2 y 3" del mismo peso con "Controles" en 3 casillas—, y `aplicarConsensoAuto()` en
`app.js` lo aplica solo. **Solo donde no hay nada que pisar**: ramos del catálogo
sin pauta. Si hay programa oficial transcrito, ese manda; si el estudiante editó
la suya, manda la suya; y lo aplicado queda marcado con `consensoRespaldos`, con
la ficha diciendo que lo reportaron estudiantes. Sin esa etiqueta sería la
ponderación inventada que prohíbe la regla de más arriba.

El pronóstico del traspaso anterior se cumplió al pie de la letra: decía que si
en dos semanas había tres reportes, el problema no era el consenso sino que
nadie reporta. Al 2026-08-29 hay **3 reportes de 3 personas en 2 ramos**, o sea
ningún grupo llega a tres y el consenso devuelve vacío. Por eso ahora se le pide
el dato a quien corrige una pauta oficial (`pautaEditada()`): esa persona ya
demostró saber cuál es la buena. Antes de agregar nada más acá, **mira cuántos
reportes hay**:

```sql
select count(*) reportes, count(distinct user_id) personas from public.catalog_reports;
```

Si el número no se mueve, el problema sigue siendo ese y no el consenso.

**Martín — las pegas manuales de Supabase y Cloudflare.** Desde el 2026-08-17
tiene administrador en los dos paneles, así que los cuatro puntos de la
auditoría de seguridad de más arriba son suyos. Ninguno se puede hacer desde el
repo: Cloudflare publica archivos estáticos y no ejecuta SQL ni toca Auth.

Las preguntas frecuentes (issue #86) ya se mergearon: están en
`/preguntas.html`.

**Claude de Martín — pautas oficiales.** El traspaso anterior decía que el
consenso de reportes era "lo único" que podía llevar el catálogo a 88 porque no
había más programas oficiales. Resultó que sí había: con ocho PDFs el catálogo
pasó de 5 a 10 pautas en una tarde, y el pipeline de extracción quedó
documentado y probado. Mientras sigan apareciendo programas, transcribirlos es
más rápido y más exacto que cualquier consenso, y además es `data.js` puro: no
sale del carril de contenido.

### Ya hechas, no las vuelvas a proponer

Se sacaron de la cola cuando se mergearon. Están acá con su PR porque lo que se
borra sin dejar rastro se vuelve a pedir, y porque si alguna se rompe conviene
saber dónde empezar a mirar.

| Pedido | Dónde quedó |
|---|---|
| Las estadísticas tienen que decir algo que importe | #203 — rango del promedio final y qué necesitas en cada ramo, en vez de mejor/peor nota |
| Faltan términos de uso y un descargo honesto | #206 — `terminos.html` |
| Tocar una evaluación en la Agenda no muestra nada más | #180 — se expande con su detalle |
| La barra de orden de la Agenda ocupa demasiado | #207 — se subió al encabezado |
| El orden manual no se puede arrastrar | *"El orden manual ahora se puede decidir de verdad"* + #176 (el ícono) y #204 (el foco con teclado) |
| El consenso de reportes no lo consume nadie | #234 — se aplica solo en ramos sin pauta, etiquetado como reportado por estudiantes |
| El consenso no se veía en los ramos que ya tienen pauta | #274 — se ofrece, con la pauta a la vista, y nunca se aplica solo |
| El correo salía 2 por hora y sin autenticar | #150 — Resend + SPF/DKIM/DMARC propios, 30 por hora, entregado en 2 s |
| Las plantillas de correo estaban en inglés | #320 — en español y versionadas en `supabase/plantillas-correo.md` |
| El feed de calendario se cacheaba público | #314 — `private`, y el plegado del .ics pasó a contar octetos |
| El consenso guardaba texto ajeno sin limpiar | #315 — bidi, ancho cero y control se filtran al entrar; rangos revalidados |
| Una evaluación en 0% rompía el consenso | #272 — no viaja en el reporte: cinco personas de acuerdo daban cinco grupos de una |
| Actualizar la pauta oficial borraba notas | #235 — se emparejan por nombre normalizado y lo que sale de la pauta queda en 0% con sus notas |
| Contabilidad no se podía reportar (la pauta sumaba 99,9) | #236 — `estructuraDe` redondeaba a un decimal; de paso el orden dejó de depender del idioma del dispositivo |
| Gestión de Personas y Marketing solo aparecían en un semestre | #225 — van en 2° y en 3°, que es como se cursan |
| "Contabilidad I" no encontraba su pauta | #261 — `claveCatalogo()`, y OJO: no fusiona los pares que sí son ramos distintos |
| Métodos Cuantitativos con y sin número contaban aparte | #262 — tabla `SINONIMOS` de pares verificados contra el código del ramo |
| `bin/estado.sh` no mostraba las issues asignadas | #257 |

**Cada evaluación de un grupo puede tener su propia fecha.** Hecho el
2026-09-12. El modelo y la Agenda ya lo soportaban —`agendaEvents` lo dice y lo
comenta— pero no había cómo ponerla: una casilla solo aceptaba el número, y la
fecha existía únicamente para el grupo entero. "Controles" tenía una sola fecha
para los tres.

Al hacerlo apareció una pérdida silenciosa que ya estaba: `setSlotNota` borraba
la nota de la casilla y la volvía a crear en cada cambio, así que escribir la
nota del Control 2 borraba que era el 18 de octubre. Nada fallaba; la
evaluación simplemente desaparecía de la Agenda. Ahora la casilla se edita en
vez de rehacerse, y vaciar la nota la deja pendiente si tiene fecha.

Ojo con el contador del grupo: cuenta casillas CON NOTA, no casillas
registradas. Una casilla creada solo para fecharla no puede sumar al "2/3
ingresadas".
**Tres cosas pedidas por Lucas el 2026-09-12 para la pantalla de Ajustes y la
conexión de agentes.** Las tres están implementadas.

**1. Sacar el camino del código (Claude Code y Codex) — implementado.**
Ajustes solo ofrece la conexión por URL. Se retiraron el desplegable, las
instrucciones de comandos, la generación del código y su temporizador del cliente.
La lista y la desconexión conservan todos los agentes existentes, aunque se hayan
vinculado por código. No se revoca ni migra ningún acceso.

`crear_codigo_agente` y `canjear_codigo_agente` siguen en Supabase y no las llama
la interfaz: retirarlas requiere otra migración explícita. Este cambio no toca
SQL ni el servidor MCP. Los tests conservan el handshake, la URL y la revocación;
las garantías de errores y sesión vencida ahora se prueban sobre la URL.

**2. Ordenar Ajustes y poner un buscador arriba — implementado.** Las siete
secciones se reúnen en Tu cuenta, Tu semestre y La app. El buscador filtra por
título, bajada y opciones internas: "cambiar mi carrera" y "borrar mi cuenta"
encuentran su sección. Buscar solo repinta la navegación, no el formulario.
El correo de acceso vive en Perfil; respaldos y eliminación siguen en Datos y
cuenta. `tests/ajustes-orden.test.js` fija estos caminos sin guardar preferencias.

**3. Explicar de verdad cómo conectar un agente, empezando por un prompt —
implementado.** La pantalla primero entrega un mensaje inocuo para pegarle al
agente. Ese mensaje le pide que explique dónde se configura un conector MCP en
la app que la persona ya usa. Después se nombra la conexión y recién al final se
crea la URL.

El prompt no lleva el token. La URL se copia aparte y la pantalla dice que debe
pegarse solo en el campo del conector que indicó el agente, nunca en el chat. Así
no mantenemos instrucciones de productos que cambian solos ni dejamos una llave
guardada dentro de una conversación.

**Un agente propone notas; no las escribe.** Pedido por Lucas el 2026-09-12 y
hecho: `proponer_notas` deja una propuesta pendiente y la ficha del ramo la
muestra con Aceptar, Editar y Rechazar, con la nota anterior tachada al lado de
la nueva cuando hay una.

Esto NO relaja la regla de que un agente no escribe notas: es su forma. La regla
nunca fue "el agente no nombra notas" sino "la nota que queda guardada la acepta
el estudiante". Lo que sigue prohibido, y lo vigila
`tests/agente-permisos.test.js`, es que una herramienta de tipo `escritura`
reciba una nota como argumento — ahí sí entraría sola. El test también exige lo
contrario: toda herramienta que reciba notas tiene que ser de tipo `propuesta`,
así que cambiarle el tipo a `proponer_notas` revienta en vez de pasar callado.

Dos decisiones que conviene no deshacer sin pensarlas. La propuesta se marca
resuelta en el servidor ANTES de tocar el ramo, para que una red caída no deje
una propuesta aplicable dos veces. Y editar aplica lo editado: un campo que
quedó vacío se OMITE en vez de guardarse como 1,0, porque vaciarlo es lo que la
persona quiso decir.
