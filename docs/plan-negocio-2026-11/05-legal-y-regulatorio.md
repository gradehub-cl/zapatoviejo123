# 05 · Aspectos legales y regulatorios (Chile)

> No es asesoría legal. Es un mapa de obligaciones y riesgos para conversar con contador y abogado. Fuentes consultadas el 26-nov-2026.

## 0. Tres hallazgos que cambian prioridades
1. **La Ley 21.719 ya NO entra en vigencia en diciembre de 2026.** La **Ley 21.855** (promulgada 19-nov-2026, publicada 23-nov-2026) fijó su entrada en vigor el **15 de octubre de 2027**. Obligaciones y multas no cambian. Hasta el 14-oct-2027 rige la Ley 19.628 en su texto actual. Fuentes: [BCN, Ley 21.855](https://www.bcn.cl/leychile/navegar?idNorma=1230520) (abierta); [Carey, 24-nov-2026](https://www.carey.cl/se-publica-ley-que-posterga-la-entrada-en-vigencia-de-la-ley-de-proteccion-de-datos-personales-al-15-de-octubre-de-2027-y-amplia-el-consejo-directivo-de-la-agencia); [Garrigues, 23-nov-2026](https://www.garrigues.com/es_ES/noticia/chile-aplaza-octubre-2027-entrada-vigencia-nueva-ley-proteccion-datos-personales-modifica).
2. **Nueva Política de API de Instructure (Canvas), vigente desde el 25-nov-2026:** prohíbe usar las APIs **sin una suscripción "Integration Tier Partnership"** o permiso expreso de Instructure, y prohíbe conectarse "usando servidores *model context protocol* u otras tecnologías no aprobadas por Instructure". Fuente: [instructure.com/policies/canvas-api-policy](https://www.instructure.com/policies/canvas-api-policy) (abierta). Esto afecta a cualquier app de terceros que lea Canvas con tokens de estudiantes (incluido un competidor clave) y descarta que GradeHub construya su ventaja sobre Canvas sin acuerdo.
3. **Obligación SII en curso:** la empresa tiene una solicitud de **Verificación de Actividades** con corrección pedida por el SII **antes del 01-12-2026** (respaldar cada giro declarado con contratos u órdenes de compra). Prioridad de esta semana.

## 1. Sociedad por Acciones (SpA)
- GradeHub SpA ya está constituida (oct-2026), con inicio de actividades ante el SII y dos socios fundadores.
- La SpA permite un solo accionista, series de acciones con derechos distintos y regular en estatutos materias típicas de pactos (ventaja para vesting y futuras rondas). Fuente: [Legal Prisma, 20-feb-2026](https://www.legalprisma.cl/pactos-de-accionistas-en-startups); [Anguita Osorio, *Crear una SpA*, 25-sep-2026](https://www.anguitaosorio.cl/es/crear-una-spa).
- **Pendientes recomendados:** pacto de accionistas + vesting (ver [09-plan-y-roadmap.md](09-plan-y-roadmap.md) §8), libro de accionistas al día, cuenta bancaria empresa, contador online.

## 2. SII: tributación
| Tema | Qué aplica | Fuente |
|---|---|---|
| IVA a servicios | Desde el **1-ene-2023** (Ley 21.420) **todos los servicios** prestados en Chile están afectos a IVA 19 %, salvo exenciones (educación formal, honorarios de personas naturales, etc.). El desarrollo/licencia de software también está gravado. | [SII, noticia 21-dic-2022](https://www.sii.cl/noticias/2022/211222noti01aav.htm); [SII FAQ software](https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_2449.htm) |
| Suscripciones vendidas por web a consumidores | Emitir **boleta electrónica** afecta (19 % incluido en el precio). El comprobante de pago con tarjeta vale como boleta para el consumidor, pero la empresa debe tener habilitada la boleta electrónica. | [SII boleta electrónica](https://www.sii.cl/destacados/boletas_electronicas/index.html) |
| Ventas a empresas (CA con RUT, universidades, tutores-empresa) | **Factura electrónica** afecta | — |
| "IVA digital" (Ley 21.210) | Aplica a **proveedores extranjeros** que venden servicios a consumidores en Chile (ej. Supabase, Apple, Google cobran 19 % a GradeHub). GradeHub, como empresa chilena contribuyente de IVA, puede necesitar emitir **factura de compra** por servicios de proveedores extranjeros si les informó su condición de contribuyente. | [SII FAQ IVA digital](https://www.sii.cl/preguntas_frecuentes/iva_serv_digitales/001_200_7767.htm); [SII FAQ factura de compra](https://www.sii.cl/preguntas_frecuentes/iva_serv_digitales/001_200_7773.htm) |
| Ventas por App Store / Google Play | La tienda vende al usuario y paga a GradeHub *proceeds*. Tratamiento tributario del ingreso (¿exportación de servicios?, ¿quién declara el IVA al consumidor chileno?) **debe validarlo el contador** con los informes fiscales de App Store Connect / Play Console. | Supuesto a validar |
| Comisión de tutorías | GradeHub factura/boletea **su comisión** (afecta a IVA); el tutor persona natural emite su boleta de honorarios por la clase. | Validar con contador |
| Declaraciones | F29 mensual (aunque sea sin movimiento); F22 anual; régimen tributario elegido en oct-2026 (confirmar cuál en la carpeta tributaria). | — |

## 3. Datos personales
### 3.1 Hoy (hasta 14-oct-2027): Ley 19.628
- Art. 4: el tratamiento requiere autorización legal o **consentimiento expreso** del titular, **informado** del propósito, y "la autorización debe constar por escrito" (revocable). Fuente: [BCN Ley 19.628](https://www.bcn.cl/leychile/Navegar?idNorma=141599).
- Práctica: checkbox de consentimiento separado (no pre-marcado) + política de privacidad clara + registro de la aceptación (fecha, versión).

### 3.2 Desde el 15-oct-2027: Ley 21.719 (reforma a la 19.628)
- Consentimiento "libre, informado y específico… previo y inequívoco", por declaración o acto afirmativo (art. 12); derechos de acceso, rectificación, supresión, oposición y portabilidad; deber de información; seguridad y notificación de brechas; Agencia de Protección de Datos Personales. Fuente: [BCN Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719).
- Multas: hasta **20.000 UTM** por infracciones gravísimas y hasta 4 % de ingresos anuales en reincidencia; las **empresas de menor tamaño** pueden recibir solo amonestación escrita durante el primer año. UTM nov-2026: $72.440. Fuentes: [Garrigues, 23-nov-2026](https://www.garrigues.com/es_ES/noticia/chile-aplaza-octubre-2027-entrada-vigencia-nueva-ley-proteccion-datos-personales-modifica); [Banco Central (UTM)](https://www.bcentral.cl/inicio/-/details/278).
- **Niños, niñas y adolescentes (art. 16 quáter):** tratamiento solo atendiendo al interés superior y autonomía progresiva; datos de **niños** requieren consentimiento de padres; los de **adolescentes** pueden tratarse con las reglas de adultos, salvo datos sensibles (regla especial). Fuente: [BCN Ley 21.719](https://www.bcn.cl/leychile/navegar?idLey=21719).
- **¿Son "sensibles" las notas?** Las calificaciones no están en la lista típica de datos sensibles, pero son datos académicos privados; tratarlas con estándar alto: cifrado en tránsito, RLS en Supabase, mínimo de acceso interno, agregación con umbral (n ≥ 10) para cualquier estadística comparativa, nunca vender ni usar notas para publicidad.
- **Checklist antes de oct-2027:** registro de actividades de tratamiento; política de privacidad v2; flujo de ejercicio de derechos (botón "descargar mis datos" y "borrar mi cuenta"); contrato de encargo con proveedores (Supabase, PostHog, Cloudflare, proveedor de IA); procedimiento de brechas; evaluación de impacto para funciones de comparación y tutorías.

## 4. Menores de 18
- Civilmente, los **menores adultos** (12/14 a 18) son relativamente incapaces: sus contratos sin autorización del representante legal adolecen de nulidad relativa (Código Civil art. 1447). Fuente: [BCN, Código Civil](https://www.bcn.cl/leychile/Navegar?idNorma=172986&idParte=8719380&idVersion=); [Rev. Derecho Privado, 2021](http://www.scielo.org.co/scielo.php?pid=S0123-43662021000100149&script=sci_arttext).
- Muchos estudiantes de primer año tienen 17 años al ingresar.
- **Recomendación:** (a) plan gratuito accesible desde 16 años con consentimiento informado; (b) **compras (Plus, tutorías) solo para ≥ 18** o con declaración de que paga/autoriza un adulto; (c) en tutorías presenciales con menores, política de seguridad y verificación de tutores.

## 5. Consumidor (Ley 19.496 / Ley Pro Consumidor 21.398)
- **Derecho a retracto:** en contratos por medios electrónicos, 10 días desde la contratación del servicio y antes de su prestación; en servicios el proveedor puede excluirlo si lo informa de forma "inequívoca, destacada y fácilmente accesible" antes del pago; si no se envía confirmación escrita del contrato, el plazo se extiende a 90 días. Fuentes: [BCN Ley 21.398](https://www.bcn.cl/leychile/navegar?idNorma=1170464); [SERNAC](https://www.sernac.cl/portal/618/w3-propertyvalue-20982.html).
- Aplicación: email de confirmación con condiciones tras cada compra; política de retracto/reembolso visible; Pase Semestre sin renovación automática reduce reclamos.

## 6. Términos de uso y privacidad (contenido mínimo)
- Términos: objeto, cuentas, uso aceptable (prohibido subir pruebas/solucionarios con derechos de terceros), **licencia del usuario a GradeHub** sobre pautas y datos aportados para el consenso (no exclusiva, para operar el servicio), moderación y *takedown*, limitación de responsabilidad (GradeHub **no** es fuente oficial de notas: "verifica siempre en el sistema oficial"), pagos y retracto, menores, ley aplicable y domicilio, IA (qué hace, sus límites).
- Privacidad: responsable (GradeHub SpA), finalidades, base de licitud, destinatarios/encargados (y países: Supabase sa-east-1, PostHog UE), plazos de conservación, derechos y cómo ejercerlos, menores, cookies/analítica, cambios con aviso.

## 7. Propiedad intelectual
- **Pautas (ponderaciones, fechas):** son hechos/datos; difícilmente protegibles por derecho de autor. Los **programas de curso, enunciados de pruebas y apuntes** sí son obras (Ley 17.336). Regla: GradeHub guarda solo datos estructurados (% y fechas), **no** aloja PDFs de programas ni pruebas; si un usuario sube un programa para extraer la pauta con IA, procesarlo y descartarlo. Fuente: [Ley 17.336 (texto)](https://www.egeda.cl/documentos/1.%20Ley%2017.336.pdf); [DDI](https://www.propiedadintelectual.gob.cl/legislacion).
- **Código y marca:** en Chile, el software creado por *dependientes* pertenece al empleador (Ley 17.336 art. 8), pero los fundadores **no** son empleados ⇒ firmar **cesión de PI** de ambos fundadores (y de cualquier colaborador) a GradeHub SpA. Registrar la marca "GradeHub" en INAPI (clases 9, 41, 42); el nombre se usa en el extranjero (ej. otros "GradeHub"), por lo que conviene búsqueda de anterioridad.
- El repositorio es público: revisar licencia (si no hay licencia, el código no es libre, pero es visible para competidores); considerar hacerlo privado.

## 8. Relación con universidades y LMS
- **Canvas (Instructure):** ver §0.2. Además, la documentación OAuth de Canvas indica que pedir a otros usuarios que generen tokens manuales e ingresarlos en una app "es una violación de la API Policy"; apps multiusuario deben usar OAuth con *developer key* habilitada por la institución. Fuente: [Canvas OAuth2](https://developer.instructure.com/doc/api/file.oauth.html) (extracto). Instructure dijo en ago-2026 que las instituciones seguirán pudiendo construir sus propias integraciones y que LTI sigue soportado sin costo ([comunidad Instructure, 13-ago-2026](https://community.instructure.com/en/discussion/666822/strengthening-the-future-of-the-canvas-open-ecosystem-an-update-on-api-integrations), extracto).
- **Conclusión:** la ruta legítima a datos oficiales es **con la universidad** (LTI o developer key institucional), o vía exportación hecha por el propio estudiante (copiar/pegar, archivo). Experiencia propia: la UC denegó permisos avanzados a apps de terceros en su Microsoft 365 en oct-2026 — las TI universitarias son conservadoras.
- Uso de marcas/logos de universidades: no usar logos oficiales sin permiso; usar nombres solo de forma descriptiva.

## 9. App Store y Google Play
| Tema | Apple | Google |
|---|---|---|
| Comisión | 15 % en el **App Store Small Business Program** (≤ US$1 M de proceeds año anterior o nuevos desarrolladores); 15 % en renovaciones de suscripción tras el primer año | 15 % en suscripciones con Google Play Billing (en Chile rige el esquema clásico; el nuevo 10 % + 5 % aplica a EE.UU./EEE/UK/AU/JP) |
| Fuente | [developer.apple.com/app-store/small-business-program](https://developer.apple.com/app-store/small-business-program/) | [Play Console Help, service fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en) |
| Cuenta de organización | Requiere **D-U-N-S** de la persona jurídica, web con dominio propio, correo del dominio y autoridad para obligar a la empresa ([Apple enroll](https://developer.apple.com/programs/enroll)) — **GradeHub ya está inscrita como organización** | Requiere **D-U-N-S** desde 2023 para cuentas de organización ([Android Developers Blog, 12-jul-2023](https://android-developers.googleblog.com/2023/07/boosting-trust-and-transparency-in-google-play.html)); cuentas **personales** nuevas deben hacer prueba cerrada con 12 testers por 14 días antes de producción ([getfeedbackkit, 2-sep-2026](https://www.getfeedbackkit.com/blog/google-play-developer-account), secundaria) |
| Acción | Inscribirse en Small Business Program **antes** de la primera venta | Verificar que la cuenta Play sea de **organización** (con el D-U-N-S ya emitido); si es personal, migrar o cumplir el test cerrado |
- Pagos fuera de la tienda para funciones digitales dentro de la app no están permitidos en general; las **tutorías** (servicio entre personas fuera de la app) normalmente pueden cobrarse con pasarela propia — validar con las guías vigentes de cada tienda antes de lanzar.
- Reporte de contenido generado por usuarios (perfiles/avisos de tutores) es requisito de revisión (guía 1.2 de Apple).

## Fuentes (consultadas 26-nov-2026)
URLs indicadas en cada tabla y párrafo. Principales: BCN (Leyes 21.855, 21.719, 19.628, 21.398, Código Civil); Instructure API Policy (vigente 25-nov-2026); SII (Ley 21.420, IVA digital, boleta electrónica); Apple Developer; Google Play Console Help.
