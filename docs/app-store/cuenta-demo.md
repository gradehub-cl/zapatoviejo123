# Cuenta demo para App Review

Guion preparado el 18-nov-2026; **no se creó ninguna cuenta ni se tocó
producción**. Lucas carga todo desde la app con correo y contraseña. La cuenta
principal se conserva durante la revisión; una segunda cuenta permite probar
el borrado. Usuarios y contraseñas van solo en **App Store Connect → App Review
Information → Sign-In Information / Notes**, nunca en git, capturas ni issues.

## Antes de cargarla (Lucas)

1. Usar un build de `ios` preparado con `npm run ios:preparar`, con el código
   de Apple y de borrado desplegado y configurado. Seguir [checklist.md](checklist.md).
2. Crear dos cuentas de estudiante con correos controlados por GradeHub:
   «Revisión Apple» y «Revisión Apple · borrado». Sin MFA, vínculos con profesores,
   calificaciones/opiniones de profesores ni respuestas a encuestas. No usar
   personas, notas, teléfonos ni salas reales en los datos de ejemplo.
3. **Antes de entrar con ramos, excluir ambas cuentas de la medición de anuncios.**
   Hoy una cuenta demo normal sí puede generar vistas, aperturas y contactos
   cobrables. La propuesta manual al final requiere revisión y aplicación de
   Lucas; apagar recomendaciones no impide medir el catálogo. No dar permisos
   de administrador a la demo ni ocultar pantallas al revisor.
4. Elegir UC → Ingeniería (Plan Común), semestre actual y nombre público
   «Revisión Apple». El año de ingreso es sintético: elegirlo explícitamente y
   revisar el semestre sugerido antes de continuar. Seleccionar los cinco ramos
   de abajo; si la sugerencia de semestre muestra otros, buscarlos por **sigla**.
   No cerrar un semestre real ni importar un respaldo ajeno.

## Carga de la cuenta principal (unos diez minutos)

Los cinco ramos pertenecen al primer semestre de Ingeniería en `MALLA_UC['ING-PC']`
(`src/data/carreras.js`). Siglas y créditos están en `src/data/creditos.js`.
Las pautas son **las que ya existen** en `PRESETS_UC`, `src/data/uc-pautas.js`:
no escribir porcentajes nuevos ni aceptar un consenso que las sustituya.

| Buscar sigla y comprobar nombre | Pauta existente y procedencia | Notas sintéticas a escribir | Promedio esperado / semáforo |
|---|---|---|---|
| MAT1610 · Cálculo I | I1/I2/I3: 20% cada una; Laboratorio: 10%, 3 casillas; Examen: 30%. Preset existente y normativa 2026-1; no inventar una pauta 2026-2. | **5,5** en I1, I2, I3, las 3 casillas del Laboratorio y Examen. | **5,5**, verde. |
| MAT1203 · Álgebra Lineal | I1/I2/I3: 20% cada una; Laboratorio: 10%, 3 casillas; Examen: 30%. Preset existente; no se presenta como un programa nuevo. | **4,2** en I1, I2 y las 3 casillas del Laboratorio. **I3 y Examen quedan pendientes**, sin nota. | **4,2**, ámbar; todavía falta 50% por evaluar. |
| QIM100E · Química para Ingeniería | Pruebas: 44,1% (2); Ev. de Taller: 4,9% (5); Examen: 21%; Informes: 18% (5); Controles: 12% (5). Programa QIM100E V2; cantidades aclaradas en el comentario del preset. | **3,2** en todas las casillas y en Examen. | **3,2**, rojo. |
| ING1004 · Desafíos de la Ingeniería | Participación en talleres: 7,5%; Tareas: 30% (4); Actividades y cuestionarios: 12,5% (lista); Presentaciones: 30% (3); Pre-Feria: 7,5%; Feria Tecnológica: 12,5%. Programa 2026-1 y mínimos de bloque del preset. | **5,0** en cada casilla/nota directa; en la lista «Actividades y cuestionarios», «Agregar nota» y una sola actividad sintética con **5,0**. | **5,0**, verde; ambos bloques cumplen el mínimo. |
| FIL2001 · Filosofía: ¿Para Qué? | Prueba 1: 30%; Ejercicio de análisis: 20%; Prueba 2: 30%; Podcast: 20%. Programa primer semestre 2026; se conserva el mínimo del Podcast. | **4,8** en las cuatro evaluaciones. | **4,8**, ámbar; Podcast sobre su mínimo. |

En Inicio, tocar cada ramo. En cada fila, tocar la nota o la casilla pendiente,
escribir el valor y terminar con Listo/salir del campo para guardarlo. En los
grupos, llenar **cada casilla**, no reemplazar el grupo por una sola nota.
Volver a Inicio para comprobar los tres colores. Verde es desde 5,0; ámbar es
4,0–4,9, que aprueba pero queda cerca del mínimo; rojo es bajo 4,0. No significa
que la universidad haya cerrado/aprobado oficialmente el ramo.

Los valores de la tabla se comprobaron con `presetRamo`, `ramoAvg`,
`notaFinalOficial` y `nivelRamo` reales de esta rama, tenant `uc`, carrera
`ING-PC`. No se cambiaron las reglas ni el motor para la demostración.

### Evaluación próxima (un minuto)

En **Álgebra Lineal**, tocar el **nombre** «Interrogación 3» → Editar evaluación:
poner fecha **mañana**, hora **10:00**, Guardar. Mantener su nota vacía y el
peso 20% original. Así la Agenda y «Próxima evaluación» tienen contenido en los
próximos siete días. Examen queda sin fecha y sin nota. Estas fechas son
**inventadas para la demo**, no fechas oficiales del curso.

Revisar y mover esta fecha antes de enviar cada build y mientras dure la
revisión: una fecha fija de noviembre caducaría. En un iPhone fuera de Chile,
comprobar su fecha/hora local antes de programar avisos.

### Horario semanal (un minuto)

En cada ficha → **Horario → Agregar bloque**. Marcar todos los días indicados,
elegir Inicio/Fin en los controles nativos, sala **DEMO** y tipo **Cátedra**;
dejar «Voy a esta clase» activado → **Guardar horario**.

| Ramo | Días | Inicio–Fin | Sala |
|---|---|---|---|
| MAT1610 | lunes y miércoles | 08:20–09:30 | DEMO |
| MAT1203 | martes y jueves | 10:00–11:10 | DEMO |
| QIM100E | lunes y miércoles | 11:30–12:40 | DEMO |
| ING1004 | viernes | 10:00–11:10 | DEMO |
| FIL2001 | martes y jueves | 15:30–16:40 | DEMO |

Es una semana sintética: no describe secciones, horarios ni salas oficiales UC.
Si se prueba el widget en fin de semana, «Próxima clase» toma el próximo día
con clases; no tiene por qué aparecer una tarjeta «Hoy» vacía en Inicio.

### Avisos, Actividad en Vivo y simulador (dos minutos)

1. **Ajustes → Calendario → Avisos antes de tus evaluaciones → Activar avisos**;
   aceptar el permiso de iOS. Se activa en ese iPhone: no viene activado por
   iniciar sesión en otro dispositivo.
2. El aviso de la noche anterior es a las 20:00; el siguiente, 15 minutos antes;
   al terminar aparece «¿Cómo te fue?». La Actividad en Vivo acompaña desde
   **seis horas antes**. Agendar una evaluación para mañana no la muestra hoy.
3. Para comprobarlo durante la revisión, editar I3 para **hoy, dentro de
   30 minutos** (o mañana si ya terminó el día), guardar y bloquear la pantalla.
   Si iOS tiene desactivadas las Actividades en Vivo, habilitarlas para GradeHub.
   El sistema decide su presentación; no prometer un aviso ya pasado. Después,
   devolver I3 a mañana a las 10:00 para que quede una evaluación futura.
4. En Álgebra Lineal → **Simular**: I3 hipotética **6,0**, Examen hipotético
   **4,2**. La proyección final es **4,6** (4,56 antes del redondeo UC).
   Cerrar con **Cerrar**, sin tocar «Guardar como reales»: el promedio guardado
   sigue siendo 4,2 y las dos evaluaciones siguen pendientes.
5. En la pantalla de inicio de iOS, mantener pulsado → Editar → Agregar widget
   → GradeHub → «Próxima evaluación» o «Próxima clase». Abrir la app una vez con
   esta cuenta y luego comprobar el widget. El revisor lo agrega en su teléfono;
   no se instala por sincronizar la cuenta.

## Segunda cuenta: prueba de borrado (un minuto)

Lucas crea la cuenta «Revisión Apple · borrado», también excluida de métricas
antes de cargar ramos. Elegir UC / Ingeniería, completar onboarding, agregar
**solo MAT1610** con su preset y escribir **5,0 en Interrogación 1**. Nada más:
sin compartir notas, sin profesor vinculado, sin anuncios, sin Apple ID ajeno.
No activar MFA. Su contraseña se entrega aparte solo en App Store Connect.

El revisor cierra sesión en la principal, entra con esta segunda cuenta y va a
**Ajustes → Datos y cuenta → Eliminar mi cuenta**, lee y confirma el borrado que
pide la app. Al terminar vuelve al acceso y esa cuenta ya no permite entrar.
La cuenta principal queda intacta. Si se usa Apple con una cuenta del propio
revisor, el flujo pide reautenticación con Apple antes de borrarla; las cuentas
demo con correo no demuestran esa revocación. Lucas repone solo la desechable
si otro revisor necesita repetir la prueba.

## Anuncios: riesgo encontrado y propuesta sin aplicar

El repo **no reconoce hoy cuentas demo**:

- `supabase/clases_particulares.sql`, `cuenta_para_campana`: excluye al autor,
  a administradores y a quien no tiene `user_ramos`. Una demo de estudiante con
  ramos sí puede contar. `registrar_alcance_anuncio` escribe vistas y
  `registrar_interaccion_anuncio` escribe aperturas/contactos; `costo_campana`
  los suma, además de los días. **No debe usarse esta cuenta en anuncios reales
  hasta excluirla.** Apagar «Usar mis notas para elegir anuncios» no es suficiente.
- `supabase/anuncio_totales.sql`, `registrar_evento_anuncio`, agrega los totales
  informativos incluso si la campaña ya agotó su tope. También aceptaría la demo.

**Propuesta para aprobación de Lucas:** [cuentas_demo_metricas.sql](../../supabase/cuentas_demo_metricas.sql).
No se aplicó. Es manual y reaplicable, va **después** de los SQL de clases/admin,
`anuncio_eventos.sql`, `metricas_dia_chile.sql` y `anuncio_totales.sql`.

Crea un registro privado de UUID excluidos en `admin`, sin permisos de cliente
ni RPC pública, con RLS y FK `auth.users ON DELETE CASCADE`. Tres triggers omiten
las inserciones de esas cuentas en alcance, interacciones y recibos. Sin recibo,
la RPC no suma el agregado diario. Las cuentas normales conservan su medición y
las tarifas y la función de costo no cambian. Los triggers sobreviven a reaplicar
las funciones base. No convierte al revisor en admin ni restringe lo que puede ver.

Después de revisar/aplicar el archivo, Lucas inscribe **ambos UUID recién creados**
en `admin.cuentas_excluidas_metricas` por el SQL Editor con privilegios de servidor,
antes de entrar con ramos. No poner UUID ni correos reales en este documento.
No hay acceso desde la app para inscribirse o quitarse de esta lista.

Auditoría de acceso/borrado de esta propuesta: ni `anon` ni `authenticated`
pueden leer/escribir el registro o ejecutar su función interna. Se guarda solo
el UUID; al borrar Auth, la FK quita su exclusión. No se necesita modificar el
borrado del cliente ni Storage. Es **preventiva**, no corrige cobros ni métricas
anteriores: inscribir una cuenta ya usada requeriría revisar ese historial aparte.
No se borran datos existentes. Tras reaplicar SQL base, comprobar la protección
con el test sintético antes de usar la demo. El uso de la demo en visitas de la
app/otras estadísticas no publicitarias no está excluido por esta propuesta.

## Notas al revisor

El recorrido en inglés y su referencia en español están en [ficha.md](ficha.md),
sin duplicar el bloque de anuncios acordado con Lucas. La cuenta no es una
versión distinta del producto y no oculta funciones de pago o contenido.
Guía de entrega: [App Review 2.1 — App Completeness](https://developer.apple.com/app-store/review/guidelines/#app-completeness),
acceso completo con cuenta de demostración y notas que permiten revisar las
funciones; [HIG — Writing](https://developer.apple.com/design/human-interface-guidelines/writing),
instrucciones concretas con los rótulos que usa la app.
