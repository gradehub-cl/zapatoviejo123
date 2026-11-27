# REPORTE DE AUDITORÍA UX — GradeHub (gradehub.cl, producción)

**Perfil test:** alumno de 1.er año Ingeniería Industrial UC, semestre 2026-2.
**Límites cumplidos:** no se pagó ni se ingresaron datos de pago; no se conectó Google/Canvas ni cuentas externas (Canvas y Calendario quedaron «desconectados»); no se publicó nada (flujos de consenso, «Calificar», «Ofrecer clases», «Sugerencias y comentarios» se abrieron, se describieron y se cancelaron); no se borró la cuenta.
**Duración total del recorrido:** ~1 h 20 min de navegación efectiva. **Onboarding: 4 pasos, ~11 clics, ~1 min 40 s.**
Detalle pantalla por pantalla con árboles de accesibilidad, textos exactos y capturas leídas: `hallazgos.md` (secciones 1 a 24).

---

## 1. Portada y pantalla de acceso
**Qué se ve:** landing con logo «GradeHub», claim «Tu promedio universitario, claro y al instante», botón «Comenzar» / «Sign in» / «Sign up», y opciones de Google/Apple. Título de pestaña correcto; favicon presente.
**Siento/pienso:** se lee limpio y serio, se parece a una app de productividad (Notion/Linear), no a un portal universitario. El mix de inglés («Sign in», «Sign up») en una app 100 % chilena confunde: espero «Ingresar» / «Crear cuenta».
**No intuitivo:** no queda claro en la portada que GradeHub jala las ponderaciones de los programas UC; eso es justamente el gancho.
**Bug:** ninguno en carga. 🟡 Botones en inglés con el resto del producto en español.
**Cambio:** un solo CTA en español («Crear mi cuenta»), Google/Apple debajo y el diferencial («Ponderaciones de los programas UC cargadas») arriba.

## 2. Creación de cuenta
**Qué se ve:** formulario Correo / Contraseña / Nombre, link «Iniciar sesión», checkbox de términos.
**Tiempo:** ~15 s, 4 campos, sin confirmación de correo (entra logueado directo).
**Siento/pienso:** rapidísimo, agradable. La validación de contraseña es silenciosa: no vi reglas hasta que el formulario las pidió.
**Cambio:** mostrar reglas («mínimo N caracteres, un número») en vivo y label `autocomplete` correcto.

## 3. Onboarding (4 pasos, ~11 clics, ~1 min 40 s)
**Qué se ve:** paso 1 universidad (lista de 5 instituciones), paso 2 carrera, paso 3 año/semestre de ingreso, paso 4 selección de ramos sugeridos con «con programa».
**Siento/pienso:** ritmo bueno, una decisión por pantalla, progreso visible. Se siente como el setup de Notion o Duolingo: rápido.
**No intuitivo / bugs:**
- 🔴 **El selector de año de ingreso aparece sin opciones** (`stepper` con `Value: 0`): no hay forma de elegir 2026 sin adivinar.
- 🔴 La universidad ofrece **solo 5 instituciones y sin buscador**; un alumno de la UdeC, USM o PUCV no puede continuar.
- 🔴 En el catálogo UC **no aparece «Ingeniería Industrial»**, la carrera más común de la FIC; hay que armar la carrera a mano.
- 🟠 **«Ponderaciones según true estudiantes»** — texto con un booleano de programming pegado en la UI.
- 🟠 El consenso de pautas viene **activado por defecto** (compartir tus datos, privacy) sin explicación en el onboarding.
- 🟡 Sin barra de progreso con números («Paso 2 de 4») ni botón «Atrás» claro.
**Cambio:** combobox de año poblado, buscador de universidad (todas las chilenas), catálogo UC completo, fix del `true`, switches de privacidad OFF por defecto con una línea de explicación.

## 4. Inicio (home)
**Qué se ve:** saludo «Así va tu semestre, Gonzalo», bloque **PROMEDIO GENERAL** en grande, delta «↑ 1,66 vs. 2025-2», chips «2 aprobados · 2 en riesgo · 1 bajo 4,0», «Mis ramos» con «+ Agregar ramo» y «Ordenar ramos (Manual)», tarjeta APOYO, «Última nota» y «Simular el semestre completo».
**Siento/pienso:** es la pantalla que uno quiere: un número grande y el semáforo por ramo. La jerarquía es clara y el color comunica solo.
**No intuitivo / bugs:** 🟡 textos pegados en el DOM («Así va tu semestre,Gonzalo», «2 aprobados2 en riesgo1 bajo 4,0», «↑ 1,66vs. 2025-2», «MAT1610100%», «2026-25 ramos · 30 créditos») que rompen lectores de pantalla y copiar/pegar. 🟠 un ramo marcado «✓ Aprobado» en su ficha cuenta como «en riesgo» en los chips. 🟡 «Promedio general 4,7 → 4,7» cuando el promedio no cambia.
**Cambio:** separar textos con `<span>`/espaciados reales, unificar el umbral «en riesgo» con el tag de la ficha, y omitir la flecha cuando el delta es 0.

## 5. Agregar ramo (búsqueda, sugeridos y a mano)
**Qué se ve:** modal «Agregar ramo», campo «NOMBRE O SIGLA DEL RAMO · lo buscamos en la malla UC» (placeholder «Ej.: IIC2333 o Cálculo II»), resultados «Cálculo I · MAT1610 · 1° semestre · con programa +», botón «Subir foto de tu horario», «Cancelar» / «Agregar ramo».
**Tiempo:** ~10-15 s por ramo. Agregar 5 ramos: ~1 min.
**Siento/pienso:** excelente: la sigla y «con programa» son exactamente lo que un alumno chequea. El toque en la fila agrega al instante con toast «Agregado con sus ponderaciones» 🟢.
**Bugs/roces:** 🟠 el botón del pie «Agregar ramo» queda **eliminado** tras tocar la fila (doble camino, estados distintos, `node is not on the page`). 🟡 ramos ya cursados/archivados siguen apareciendo como sugeridos sin marcar. 🟡 «1° semestre» de la malla sin decir a qué semestre real se agrega.
**Cambio:** dejar un solo CTA, o que el botón del pie diga «Listo» y cierre; badge «ya cursado».
## 6. Ficha de ramo
**Qué se ve:** nombre + sigla, chip de % evaluado («MAT1610 100%»), promedio grande con color, píldora «Promedio general 4,7 → 4,6», lista de evaluaciones con peso y estado, bloque «Qué necesitas para aprobar», botón «Simular», menú `ramo-mas` («Editar ramo», «Editar evaluaciones», «Eliminar ramo»).
**Siento/pienso:** es el corazón de la app y funciona: en 5 segundos sé si voy rojo. La frase «necesitas X en lo pendiente para aprobar» siempre visible es oro.
**Bugs/roces:** 🟡 sin sigla el chip queda «100%» solo (inconsistente con «MAT1610 100%»). 🟠 «Programa 2026-1» mostrado en un ramo que estoy cursando en 2026-2. 🟡 «Quitar la última nota… que está vacía» (ofrece quitar una nota inexistente).
**Cambio:** chip de % igual para todos, semestre del programa coherente, deshabilitar «quitar última nota» si no hay notas.

## 7. Pautas / «Editar evaluaciones» / «Armar mis ponderaciones»
**Qué se ve:** modal con presets («3 pruebas + examen», «2 pruebas + examen», «3 interrogaciones + laboratorio (3) + examen», «2 interrogaciones + tareas (3) + participación + examen»), aviso «Los pesos quedan en 0%. Confírmalos con el programa del curso.», «Copiar de otro ramo», barra «0 / 100% · faltan 100%» → «✓ 100 / 100% · ponderaciones listas», «Usar 100%», «Reglas de esta evaluación», «Requisitos que combinan evaluaciones», «Eximición del examen», «Cancelar»/«Guardar», toast «✓ Listo, ya suma 100%».
**Siento/pienso:** la potencia es impressionante (reglas y eximiciones que Excel no hace). La barra de progreso con tilde es de las mejores microinteracciones del producto.
**Bugs/roces:** 🔴 **Escape cierra el modal y descarta todo lo escrito sin confirmación ni borrador**. 🟠 presets dejan todos los pesos en 0 % y no hay «repartir en partes iguales». 🟠 el último campo puede quedar **bajo el pie del modal** («Node … is covered by a div»). 🟠 un ramo puede guardarse con **pauta que suma 110 %** sin advertir. 🟡 dos empty states distintos para lo mismo («Armar mis ponderaciones» vs «Agregar evaluaciones»).
**Cambio:** confirmación al salir con cambios, presets con pesos sugeridos, auto-scroll del campo enfocado, validación dura de suma = 100 %.

## 8. Consenso de pautas
**Qué se ve:** bloque de consenso con la pauta que otros subieron y botones «Usar esta» / compartir la propia.
**Siento/pienso:** la idea es muy buena y se entiende; «Usar esta» aplica la pauta al instante.
**Bugs/roces:** 🟠 el consenso está **ON por defecto**, así que la primera impresión es que mis datos se comparten; el flujo de «compartir pauta al consenso» se abrió y se canceló (no publicado).
**Cambio:** opt-in explícito y aviso de qué se publica antes de enviar.

## 9. Ingreso de notas y «qué necesito para aprobar»
**Qué se ve:** cada evaluación pendiente dice «Examen: necesitas 4,0. Toca para anotar la nota real»; al tocar se transforma en campo; al guardar, toast «Vas 5,0 · ramo completamente evaluado» o «Evaluación grupal quedó en 3,9 · nota topada en 3,9» y «Vas 4,9 · necesitas 2,9 en lo pendiente para aprobar».
**Tiempo:** ~10 s por nota; las 5 asignaturas completas (~30 notas) tomaron ~10 min.
**Siento/pienso:** la mejor parte del producto. Es más rápido que el Excel y me explica cosas que el Excel no explica.
**Bugs/roces:** 🟠 **si Confirmar (Enter) llega antes de ~0,7 s la nota se pierde** sin aviso. 🟠 tras guardar salta a Inicio en algunos caminos (pierdo el contexto). 🟠 Estadísticas muestra valores **stale** («Desafíos 3,9 / Álgebra 6,2») hasta recargar.
**Cambio:** guardar al perder foco, no exigir Enter; mantenerme en la ficha; invalidar caché de Estadísticas al guardar.

## 10. Simulador (por ramo y global)
**Qué se ve:** «Simular el semestre» — «Cambia la nota final de cada ramo y mira tu promedio. No se guarda.», PROMEDIO PROYECTADO, steppers −/+, «Actual 5,0 · 100% evaluado», «Volver al real», «Reiniciar todo», «Listo».
**Siento/pienso:** claro y no destructivo, se comprueba que no guarda.
**Bugs/roces:** 🟡 los ramos «Sin evaluaciones» muestran un guion y **no aceptan escritura** (solo +/− de 1 en 1). 🟡 cada toque re-renderiza la lista.
**Cambio:** permitir teclear la nota simulada y paso de 0,1.

## 11. «Calificar» (profesor/ramo) — abierto y cancelado
**Qué se ve:** flujo de opinión/calificación tras cerrar el semestre («¿Cómo fueron tus ramos? / Si quieres, deja tu opinión de los que cerraste.»).
**Decisión de test:** no se publicó (contenido visible para otros usuarios). 🟠 de 5 ramos cerrados solo ofrece calificar 1.
**Cambio:** listar todos los ramos cerrados y dejar claro que es público antes de enviar.

## 12. Agenda e importar .ics
**Qué se ve:** «Agenda», botón «Calendario» (help «Agregar evaluaciones al calendario»), «Qué se viene · 4 pendientes · 2 por venir», conmutador «Evaluaciones / Horario», «Editar horario», vista semanal/mes, «Tus prioridades». Subida de `evaluaciones.ics` (3 VEVENT) → revisión previa → «Agregar fechas elegidas» → toast «2 fechas agregadas».
**Siento/pienso:** subir el .ics y revisar antes de guardar se siente profesional.
**Bugs/roces:** 🟠 **de 3 eventos solo importó 2** y nunca propuso coincidirlos con ramos: todos quedaron «Sin asignar». 🟠 el modal de calendario sigue diciendo «Todavía no tienes fechas…» cuando ya hay fechas. 🟡 eje X «26 nov»/«30 nov», horarios en AM/PM en algunas vistas.
**Cambio:** matching fuzzy ramo/curso, explicar por qué un evento no se agregó, coherencia de formato horario.

## 13. Horario y «Subir foto de tu horario»
**Qué se ve:** «Agregar a mano» → bloque Lun 08:30–10:00, toast «Horario guardado». Modal «Subir foto de tu horario» con alternativa «¿Tienes el horario como texto? Pégalo» → «Ramos reconocidos: 3 ramos ya están en tu semestre. / No hay ramos nuevos para agregar…».
**Siento/pienso:** el reconocimiento funciona y avisa; la alternativa de texto es un acierto.
**Bugs/roces:** 🟡 pegar texto con tabulaciones **corrompe el textarea** («20251álculo I»). 🟡 sin preview de bloques reconocidos sobre la foto.
**Cambio:** normalizar tabs/NBSP al pegar, preview con checkbox por bloque.
## 14. Estadísticas
**Qué se ve:** «Tu promedio en el tiempo» con gráfico de área, slider «Explorar tu promedio en el tiempo», «4,0 · referencia», «+Ver línea de tiempo», rango «Semana / Mes / Semestre», «Peso evaluado 62 %» (luego 100 %), «Qué mueve tu promedio» (álgebra +0,26 … Matemática I −0,38), «Cómo vas respecto a los demás» («Igual o por sobre el 63 % de tus 60 compañeros»), «Rango del semestre 3,8–6,1», «Tus prioridades hoy», «Historial», «Editar» (modal «Editar Estadísticas»).
**Siento/pienso:** mucho valor; «qué mueve tu promedio» es el tipo de insight que hace volver. El gráfico se ve como Apple Fitness/Notion.
**Bugs/roces:** 🟠 estado **stale** tras editar notas (B-16) y tras archivar (sigue diciendo «Semestre actual · 2026-2»). 🟠 «Peso evaluado62 %» pegado. 🟡 percentil sin fuente ni explicación, y solo cubre 2 de 5 ramos. 🟡 etiquetas del modal «Editar Estadísticas» distintas a las de la pantalla. 🟡 al no haber pendientes el gráfico queda con una barrita de carga y «Todavía no hay notas para este rango».
**Cambio:** recálculo reactivo, tooltip «sobre X ramos con consenso», explicar de dónde salen los compañeros.

## 15. Perfil / Ajustes
**Qué se ve:** cabecera (inicial, nombre, «Ingeniería Industrial», «UC · 2.° semestre», correo) y secciones **TU SEMESTRE** (Universidad y carrera, Calendario, Canvas, Archivar semestre), **HERRAMIENTAS** (Calculadora de nota, Cargar semestres pasados, Subir foto de tu horario), **LA APP** (Apariencia, Agentes conectados, Sugerencias y comentarios), **TU CUENTA** (Datos y cuenta, Ofrecer clases o material), «Cerrar sesión». Modal «Ajustes» con buscador.
**Siento/pienso:** orden excelente, familiar (Ajustes de iOS). El buscador de ajustes es un detalle fino.
**Bugs/roces:** 🟠 **no existe ninguna sección de notificaciones**: buscar «notifica» devuelve «0 secciones encontradas» (el avisador de «toca para anotar la nota real» no se puede configurar). 🟡 «2.° semestre» hardcodeado/ambiguo. 🟠 switches de privacidad ON por defecto. 🟡 «Enviar comentario» habilitado con 0 caracteres. No se pulsaron «Eliminar»/«Reiniciar» ni se envió el comentario.
**Cambio:** sección de recordatorios/notificaciones (email/ push) y desactivar envío vacío.

## 16. Modo oscuro / Apariencia
**Qué se ve:** «Apariencia» con claro/oscuro/auto; al elegir oscuro toda la app cambia al instante.
**Siento/pienso:** el modo oscuro está **bien hecho**: negros reales, verde-teal de acento, rojo ámbar para notas, buen contraste, sin texto ilegible.
**Bugs/roces:** 🟡 algún chip y el borde de foco quedan un poco bajos de contraste; transición sin animación (corte seco).
**Cambio:** transición de 150-200 ms y revisar foco visible.

## 17. Canvas, Calendario y «Agentes conectados» (MCP)
**Qué se ve:** Canvas (descripto, **no conectado** — límite del test), Calendario con URL de suscripción, «Agentes conectados» con conexión «Prueba Hark» creada y luego desconectada (toast «Agente desconectado») y copia de la URL del conector. Página del conector con la promesa «No puede escribir tus notas ni borrar nada».
**Siento/pienso:** que una app para chilenos tenga página de conector MCP y la explique en una línea es muy adelantado; la frase de permisos baja la ansiedad.
**Bugs/roces:** 🟠 la **URL del conector se muestra en texto plano** (credential visible). 🟡 no hay explicación de qué hace un «agente» para quien no lo conoce.
**Cambio:** ocultar/truncar la URL con botón «Copiar», badge «solo lectura», y 2 líneas de contexto.

## 18. Calculadora de nota
**Qué se ve:** puntos obtenidos / posibles (41/50), exigencia (50), «Tu nota 5,9», botón para guardarla en el ramo.
**Siento/pienso:** «Mejor que tu Excel.» es la mejor frase del producto y se cumple. Guardarla directo en el ramo es el detalle que falta en las calculadoras web.
**Bugs/roces:** 🟡 no muestra la fórmula ni el tramo de la escala; si algo no cuadra con mi profe, no sé por qué.

## 19. Cargar semestres pasados (avance curricular)
**Qué se ve:** modal «Cargar tus semestres anteriores» con PDF y alternativa «Pegar el avance curricular»; revisión «Revisa antes de guardar»; «Agregar 3 ramos» → toast «3 ramos agregados a tu historial».
**Bugs/roces:** 🔴 el parser **renombra ramos** («MAT1004 Cálculo I» → «Matemáticas Finitas»). 🔴 **las notas importadas se pierden y el Historial inventa 3,0 en rojo**, lo que contamina el delta de Inicio («↑ 1,66 vs. 2025-2»). 🟠 solo acepta el formato «Semestre 2025-1» y responde «No hay semestres nuevos para agregar. / Sin agregar: sin semestre (4).» sin explicar el formato esperado. 🟠 pegar con tabs corrompe el textarea. 🟠 la revisión previa **no muestra la nota** y los créditos quedan «10 cr». 🟠 «Usar nota del portal» llega vacía y reemplaza el modal.
**Cambio:** validar/avisar formato con ejemplo, mostrar nota y créditos detectados, nunca inventar nota cuando no viene.

## 20. Cierre y archivo del semestre
**Qué se ve:** «Archivar 2026-2» — «Revisa tus finales. Si falta alguna evaluación, puedes archivar igual; ese ramo queda fuera del promedio acumulado hasta completarlo.» —, tarjeta por ramo con «Calculada: 2,8» y campo «Nota final oficial / del portal de tu universidad», «Cancelar» / «Archivar semestre». Resultado: Inicio vacío, «PROMEDIO GENERAL ·», modal «¿Cómo fueron tus ramos?». Historial: «2026-2 · Sem. 2 · 5 ramos · 4,7» con notas por color y «Editar» / «Eliminar semestre».
**Siento/pienso:** archivar se siente definitivo y bien planteado (nota oficial del portal), pero **el momento más emocional del semestre es el que menos celebra**: no hay resumen («cerraste 2026-2 con 4,7 · 4 aprobados, 1 reprobado»), no hay toast, y el historial no dice aprobado/reprobado.
**Bugs/roces:** 🔴 archivar **no confirma ni resume** y deja Inicio en blanco. 🔴 Estadísticas sigue mostrando el semestre archivado como «actual» hasta recargar. 🟠 el pie del modal queda **fuera de pantalla** y el clic no registra. 🟠 la nota oficial no se conserva visible. 🟡 «2026-2» duplicado tras volver a agregar un ramo.
**Cambio:** tarjeta de resumen del semestre (promedio, aprobados/reprobados, delta), persistir nota oficial, modal con footer fijo, recalcular Estadísticas al archivar.

## 21. Apoyo / tutores y clases particulares
**Qué se ve:** tarjeta Inicio «APOYO · ¿Buscas apoyo en un ramo? · Profes, academias y apps para tus ramos · Explorar apoyo» y «Ofrecer clases o material» en Perfil, que abre Ajustes › **Apoyo** («Ofrece clases, material o tu app»).
**Bugs/roces:** 🔴 **se queda en «Revisando tu acceso…» para siempre** (>10 s), igual que «Explorar apoyo»: la sección entera de tutores es inutilizable en la práctica. No se publicó ningún aviso (límite del test).
**Cambio:** timeout con reintento y texto de error; si requiere verificación, decir cuánto tarda.

## 22. Diseño visual (global)
**Jerarquía:** muy buena — un número grande por pantalla, etiquetas en versalitas (PROMEDIO GENERAL, TU SEMESTRE), secundario en gris. **Tipografía:** sans geometrica consistente, tamaños bien escalados; las notas en grande ayudan a escanear. **Color:** semáforo 0-7 bien usado; el teal de acento es coherente; el rojo se reserva para rojo real. **Espaciado:** generoso y regular, aunque varios modales aprietan el pie (botones cortados). **Consistencia de componentes:** botones y chips parejos, pero hay 2 empty states y 2 nombres para la misma acción, chips «100%» con y sin sigla, AM/PM y 24 h, y textos pegados en el DOM. **Íconos:** set lineal limpio y del mismo grosor; algunos botones son solo ícono sin label (wrench, calendario). **Microinteracciones:** toasts, píldora de promedio, barra de ponderaciones con tilde, stepper y «Toca para anotar la nota real» — muy bien. **Estados de carga:** «Revisando tu acceso…» eterno, barrita de carga persistente en Estadísticas, modales que no bloquean el doble clic.

## 23. Familiaridad
Se parece más a **Notion / Linear / Apple Health** que a Canvas: modos de densidad parecida, tarjetas, versalitas, gráfico de área, ajustes agrupados tipo iOS. Los patrones esperados están: buscador con sugerencias, «+» para agregar, swipe/mantener presionado para ordenar, subo de .ics con revisión, dark mode. Lo que **no** se parece a nada conocido (y por eso confunde): «consenso», «eximición del examen», «requisitos que combinan evaluaciones», «Agentes conectados / MCP» — todos potentes pero sin una línea de explicación la primera vez. Y lo que un alumno espera de Canvas y falta: un calendario tipo cronograma del curso y avisos/recordatorios.
## 24. Tiempos y clics medidos
| Paso | Clics | Tiempo aprox. |
|---|---|---|
| Crear cuenta + entrar | 4 | 15 s |
| Onboarding (4 pasos) | ~11 | 1 min 40 s |
| Agregar 5 ramos (3 sugeridos, 1 buscado, 1 a mano) | ~16 | 1 min |
| Editar/guardar pauta Cálculo I | 5 | 25 s |
| Armar pauta de cero (Matemática I, 4 evaluaciones) | ~14 | 1 min 30 s |
| Ingresar ~30 notas (5 ramos) | ~60 | 10 min |
| Simular ramo + simulador global | 8 | 40 s |
| Importar .ics (3 eventos) | 5 | 35 s (2 importados) |
| Agregar bloque de horario a mano | 6 | 30 s |
| Perfil/ajustes + modo oscuro | 9 | 45 s |
| Crear y desconectar agente MCP | 5 | 40 s |
| Cargar semestres pasados (3 intentos) | 12 | 3 min |
| Archivar semestre | 8 | 50 s |

## 25. TOP 15 PROBLEMAS POR GRAVEDAD
1. 🔴 **Apoyo/tutores inutilizable:** «Ofrecer clases o material» y «Explorar apoyo» quedan en «Revisando tu acceso…» indefinidamente.
2. 🔴 **El parser de avance curricular renombra ramos** («MAT1004 Cálculo I» → «Matemáticas Finitas»).
3. 🔴 **Notas importadas se pierden y el Historial inventa 3,0 en rojo**, contaminando el promedio acumulado y el delta de Inicio.
4. 🔴 **Archivar semestre no confirma ni resume:** Inicio queda en blanco con «PROMEDIO GENERAL ·» y sin decir qué se cerró.
5. 🔴 **Escape cierra «Armar mis ponderaciones» y borra todo** sin confirmación ni borrador.
6. 🔴 **Onboarding inhabilitante:** stepper de año de ingreso sin opciones, 5 universidades sin buscador, sin «Ingeniería Industrial» en la malla UC.
7. 🔴 **URL del conector MCP expuesta en texto plano** (credential legible en pantalla).
8. 🟠 **Estadísticas con estado stale** tras guardar notas y tras archivar (sigue mostrando el semestre archivado como «Semestre actual»).
9. 🟠 **Nota se pierde si Enter llega < ~0,7 s** después de tipearla, sin aviso.
10. 🟠 **Contradicción aprobado/en riesgo:** ramos con «✓ Aprobado» cuentan como «en riesgo» en los chips de Inicio.
11. 🟠 **Pautas:** presets con 0 %, sin «repartir en partes iguales», se guarda una pauta que **suma 110 %** sin advertir, campo bajo el pie del modal.
12. 🟠 **Botones primarios bajo el borde del modal** («Archivar semestre», último peso): el clic no registra («covered by a div»).
13. 🟠 **.ics:** importa 2 de 3 eventos y deja todo «Sin asignar», sin explicar por qué.
14. 🟠 **Consensus/privacidad activado por defecto** y «Calificar» ofrece solo 1 de los 5 ramos cerrados.
15. 🟡 **Pulido de textos y etiquetas:** «Ponderaciones según true estudiantes», «Así va tu semestre,Gonzalo», «2 aprobados2 en riesgo1 bajo 4,0», «Peso evaluado62 %», «MAT1610100%», «2026-25 ramos», «↑ 1,66vs. 2025-2», «Promedio general 4,7 → 4,7», AM/PM vs 24 h, empty states duplicados, sin sección de notificaciones, «Programa 2026-1» en ramo 2026-2.

## 26. TOP 5 COSAS QUE ESTÁN MUY BIEN
1. **«Qué necesitas para aprobar» siempre visible** y en lenguaje humano («Vas 4,9 · necesitas 2,9 en lo pendiente para aprobar», «Evaluación grupal quedó en 3,9 · nota topada en 3,9»). Es el diferencial real.
2. **Pautas con programas UC cargados y reglas reales** (topes, eximición, combinaciones) + barra «✓ 100 / 100% · ponderaciones listas».
3. **Simulador no destructivo** (por ramo y «Simular el semestre completo») con «No se guarda», «Volver al real» y «Reiniciar todo».
4. **Modo oscuro y sistema visual consistentes**, con semáforo de notas y jerarquía clara; se siente como Notion/Apple, no como portal universitario.
5. **Revisión antes de guardar** (subida de .ics y del avance curricular), toasts claros y promesa de permisos del agente («No puede escribir tus notas ni borrar nada»). Y el tono de copy: «Mejor que tu Excel.»

## 27. VEREDICTO
**Sí, la seguiría usando.** Como alumno de primer año, con 3 ramos que tienen programa, GradeHub reemplaza mi Excel de notas desde el primer día: ingreso una nota y me dice qué necesito, cuánto pesa y cómo se mueve mi promedio. Es más rápido y más claro que cualquier cosa que haya usado en la UC.
**Lo que me haría dudar:** el onboarding (si no encuentro mi universidad o mi carrera, me voy), que se pierdan notas al guardar y que Estadísticas muestre datos viejos —son los tres que rompen la confianza. Y el cierre de semestre, que hoy deja la app vacía sin explicarme qué pasó con mi 4,7.
**Si arreglan el top 7 de esta lista, GradeHub pasa de «excelente experimental» a «la app que le muestro a todo el curso el primer día de ramo».**
