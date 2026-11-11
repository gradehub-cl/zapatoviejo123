# Consentimiento para compartir pautas — #1071, punto 3

Borrador pendiente de una decisión de Lucas. No desplegar todavía.

## Lo comprobado

`guardarPautaManual` ofrece revisar y enviar la pauta cuando antes estaba vacía.
Además, `save` e inicio de sesión llaman a `aportarPautasAlCatalogo`: antes
se enviaban pautas completas sin consultar ninguna preferencia. Ocultar la
pregunta no impedía esos aportes. No se enviaban notas ni fechas.

Esta primera protección exige `S.aportarPautasAutomaticamente === true`, campo
opcional sin valor por defecto. Una cuenta existente sin ese campo no aporta
nuevas pautas automáticamente; conserva todo su JSON y sus reportes previos.
No se tocan el SQL, el umbral del consenso, su lectura ni el reporte explícito.

## Pregunta pendiente

¿Se conservan los aportes automáticos mediante un interruptor explícito
«Compartir mis pautas automáticamente», apagado por defecto, o se comparten
solo mediante «Enviar reporte»?

## Falta antes de revisión

- Completar la invitación de una sola vez por cuenta, con «No volver a preguntar».
- Agregar en Ajustes el control para cambiar esa preferencia.
- Resolver la pregunta sobre aportes automáticos y comprobar que ningún camino
  interprete revisar una pauta, cerrar la invitación o entrar como consentimiento.
- Probar cierre, recarga, sincronización y cuentas existentes con datos sintéticos.
- Capturas claro/oscuro del flujo final, siguiendo HIG Privacy y Toggles.

La protección queda en borrador junto con esta pregunta; la cola continúa
según la instrucción de Lucas para decisiones de producto pendientes.
