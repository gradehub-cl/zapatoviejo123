# Cola registrada y reportes de usuarios

> Extraído de `docs/contexto.md` sin cambiar el contenido. Sus fechas, cifras y
> estados describen el momento en que se anotaron: verifica el código y git
> antes de tratarlos como actuales. [Índice](../contexto.md).

## En vuelo

Lo que está tomado ahora mismo. Se borra cuando se mergea. Si tu tarea no está
acá, pregunta antes de empezar — hay tres agentes sobre cuatro archivos.

### Lucas · tomado el 2026-10-12

Lo del 2026-10-12 ya está en `main` y en `ios` (#694), salvo:

| Issue | PR | Estado |
|---|---|---|
| #647 Canvas en la web (fuente de calendario) | #689 | encima de #670; se mergea después de #670 |

**Pendiente, sin dueño todavía:**

- #631, **en pausa por decisión de Lucas**: Econometría Aplicada (falta su
  programa) y Revelación y Fe (falta confirmar si «la nota más baja» incluye el
  examen). No se retoman sin ese dato.
- #664: los testimonios (#643). La «entrada» barata **no se hace**: una clase
  de prueba se publica con precio $0, como el Salvatón (Lucas, 2026-10-12).
- #663: precio del panel, Universal Links y comparación del ramo para UAI y
  UAndes.
- #630: «la inasistencia es 1,0» no tiene dónde vivir: no existe «marcar
  ausente», solo «Falté con justificativo».
- #639: `pendientes()` ya existe en la rama `ios` (#676); falta la pantalla.

### Pedidas por Martín, sin dueño todavía

**Meter a la Universidad de los Andes.** En marcha desde el 2026-10-03, carril
`ms` (acordado con Lucas). Estado:

1. **Carreras declarables** — hecho (#594): las 34 de admision.uandes.cl. Los
   códigos antiguos `COM-UA`, `DER-UA`, `MED-UA` y `PSI-UA` se conservan.
2. **Mallas** — hecho (#597): `mallas-uandes.js`, 33 carreras desde sus PDF
   oficiales (Arquitectura no publica malla).
3. **Vocabulario** — hecho (#614): Prueba, Control de lectura, Certamen…; nunca
   "Solemne" ni "Interrogación".
4. **Motor por universidad** — hecho (#615): la UAndes redondea a la centésima y
   después a la décima (art. 22). Compuertas `exacto` para el art. 27.
5. **Pautas** — 44 cursos PEG del 2° semestre 2026, de la página oficial del
   Centro de Estudios Generales, con la compuerta del art. 27. Las de carrera
   viven en Canvas, detrás del login: hay que conseguir los programas.

**Créditos:** la UAndes no publica créditos en sus mallas. Sus ramos no los
traen, y el promedio general cae a promedio simple, que es también lo que dice
su reglamento para planes sin créditos (art. 31).

### Pedidas por Lucas, sin dueño todavía

Están acá para que no se pierdan, no porque alguien las esté haciendo. **Las
puede tomar cualquiera de los dos lados** —Lucas o Martín, con sus agentes—; lo
único que se respeta es el carril del archivo que toque. Avisa antes de partir
para que no la tomen dos.

El contexto de cada una sale de mirar el código, no del pedido: sirve para
dimensionar antes de empezar.

**Los metadatos y la licencia del repositorio siguen pendientes.** El README ya
explica qué es GradeHub, cómo correrlo y cómo contribuir, pero GitHub todavía no
tiene descripción, sitio ni topics. Tampoco hay un archivo `LICENSE`: que el
repo sea público permite verlo y bifurcarlo dentro de GitHub, pero no concede
un permiso general de uso, modificación o distribución. Lucas tiene que elegir
la licencia antes de agregarla; ningún agente debe decidirla por su cuenta.

Ojo con una cosa al hacerlo: este mismo archivo es público en github.com, **con
la lista de lo que todavía no está asegurado**. Lucas lo decidió el 2026-08-18:
**el repo se queda público**, y la respuesta es cerrar los huecos, no taparlos.
Por eso los cuatro puntos de la auditoría de seguridad pasan a ser lo PRIMERO
que hace Martín, antes que cualquier cosa de esta cola. Mientras sigan abiertos,
están descritos en un archivo que cualquiera puede leer.

**Las pautas vencidas YA están resueltas. Lo que queda es declarar el período
en las que faltan.** Al 2026-08-31: `periodo` existe en el preset,
`estadoPeriodoPauta()` decide si sigue vigente, `presetRamo()` retiene las
fechas cuando venció y la ficha muestra "Pauta del 2026-2" o "período sin
confirmar" (`pauta-periodo` en `render-main.js`). Las diez evaluaciones con
fecha fija del catálogo pertenecen todas a pautas que sí declaran su período, y
`tests/pautas-con-fecha-declaran-periodo.test.js` lo exige de acá en adelante.

Lo que falta es transcripción, no código: **15 pautas con ponderaciones no
declaran período** —7 de FEN y 8 de la UC— y salen como "período sin confirmar".
El dato no está en el repo: sale de mirar el PDF de cada programa. No se deduce
del comentario ni del año: "programa oficial actualizado julio 2026" no dice si
es 2026-1 o 2026-2, y esa diferencia es justo la que decide si sus fechas se
entregan o se retienen.

**Las ponderaciones y las fechas NO envejecen igual.** Los porcentajes de un
programa suelen repetirse entre semestres; las fechas de las pruebas cambian
siempre. Así que la pauta de 2026-2 probablemente sigue sirviendo en 2027-1 y
sus fechas con seguridad no. Tratarlas como una sola cosa lleva a descartar
pautas todavía buenas o a cargar fechas falsas: son dos decisiones separadas y
el modelo tiene que poder decirlas por separado.

**No priorizar PWA instalada ni notificaciones por ahora.** La gente usa
GradeHub desde el navegador; antes de invertir en push, widgets o permisos hay
que resolver necesidades visibles en ese camino y volver a medir la adopción.

**Aceptar términos al crear la cuenta, y actualizar la política.** Se pide un
paso explícito de aceptación en el registro. Dos cosas que hay que resolver
antes de escribirlo: qué pasa con las cuentas que ya existen —se registraron sin
aceptar nada, y pedirles aceptación al entrar es una interrupción que hay que
diseñar, no improvisar— y dónde queda constancia de que aceptaron, porque si no
se guarda, el paso es decorativo. La política se actualiza junto con esto para
que las dos páginas digan lo mismo.

**Reactivar la verificación por correo. Ya no hay nada que la bloquee.** El
correo propio está resuelto desde el 2026-09-06 (#150, cerrado): Resend como
SMTP en Supabase, `gradehub.cl` con SPF, DKIM y DMARC propios, remitente
`hola@gradehub.cl` —que además recibe, vía Email Routing— y el límite subido de
2 a 30 correos por hora. Una recuperación de contraseña real llegó a bandeja de
entrada en 2 segundos con SPF, DKIM y DMARC en `pass`.

Lo que falta es la decisión y un texto. **Activarla obliga a reescribir el aviso
del registro el mismo día**: hoy dice "Ya puedes entrar con ese correo y tu
contraseña" justamente porque no se manda ningún correo, y con la confirmación
encendida esa frase pasa a ser falsa. Está anotado en `app.js`, junto a
`MSG_VERIFICA`. La plantilla en español ya está escrita, en
`supabase/plantillas-correo.md`.

Y no es solo higiene: **es el control que sostiene el consenso de reportes.** Ese
umbral son tres `user_id` distintos, y mientras crear una cuenta no cueste nada,
"tres personas" no significa tres personas.

### Reportes de usuarios todavía abiertos

Revisados el 2026-09-12 contra la tabla de sugerencias. Se dejan solo los que
NO están resueltos; los que sí (apagar secciones de Estadísticas, borrar y
renombrar un semestre del historial, las dos Dinámicas, "sigue a tu teléfono"
en iPad, los fondos pizarra y neutro) ya salieron y no vuelven a la cola.
Después salieron también: las notas que desaparecían en una categoría de
varias notas (acedbe1), "Controles 1" en vez de "Control 1" (b275c72), la
sección del ramo y su horario desde una foto o BuscaCursos, los créditos UC
que no llegaban (926ceef) y cambiar la contraseña estando dentro (#729).

**5. "No me muestra cómo voy comparado al resto del curso."** Reportado el
2026-09-12. Puede ser el mínimo de 5 participantes funcionando como se diseñó
—y entonces el problema es que en la práctica casi nadie llega a verlo— o puede
ser que no esté subiendo la nota. Antes de tocar nada, mirar `curso_notas` y
contar cuántas filas hay por sigla.

**6. "Está mal la sigla del teológico."** De otro usuario, el 2026-09-11.
Probablemente es lo que arregla el PR de la sigla de los presets, donde la
sigla salía vacía. Pero el reporte dice "mal", no "falta": hay que confirmarlo
con esa persona después del deploy en vez de darlo por cerrado.
