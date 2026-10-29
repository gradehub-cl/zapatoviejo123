# Revisión de Supabase — GradeHub
28 de octubre de 2026. Proyecto `lsulsnswzesyekpsvlql`. Solo lectura.

Consultas entre 19:43 y 19:49 de Chile (22:43–22:49 UTC). Logs en una ventana fija: 27-10-2026 22:49 UTC a 28-10-2026 22:49 UTC. Las consultas son fotografías separadas de una base en uso: algunos conteos cambiaron ligeramente durante la revisión. Para el resumen se usa `closing_snapshot`, incluido como último bloque general en consultas.sql. Los resultados JSON originales se conservaron en el artefacto local de la revisión; no hacen falta para repetir las comprobaciones.

> Traspaso a Martín y su Claude, preparado el 29-10-2026 por encargo explícito de Lucas.
> Este informe describe la fotografía del 28-10; no se ha vuelto a consultar producción al preparar el traspaso.
> Encargo: revisar la evidencia, repetir solo los bloques de lectura necesarios y decidir qué implementar, descartar o seguir investigando. No es autorización para aplicar cambios de datos, permisos, Auth ni migraciones.

## Para retomar

1. Lee AGENTS.md y docs/contexto.md. Este paquete contiene datos agregados; no se usan cuentas ni notas reales como fixtures.
2. [consultas.sql](consultas.sql) contiene los 17 bloques Postgres de solo lectura. Ejecutar uno por uno; los apartados exploratorios traen advertencias y no son defectos confirmados.
3. [logs-clickhouse.sql](logs-clickhouse.sql) va en Logs Explorer, con su ventana explícita. No se ejecuta en SQL Editor.
4. Contrasta con main y con lo que ya esté desplegado: las PR #883, #884, #885, #886 y #887 ya están mergeadas; #889 cambia las calificaciones por nombre y #891 amplía la foto a FEN. Evitar rehacerlas o atribuir errores antiguos a esas versiones nuevas.
5. Deja por hallazgo una decisión (hacer / investigar / descartar), evidencia actual, impacto, responsable y siguiente prueba. Si se implementa, una PR por tema, datos sintéticos y riesgo para cuentas existentes documentado. Lucas mantiene la decisión de merge y los cambios persistidos se acuerdan antes.

Las cifras de producto, avisos y tiempos de consulta son históricos. Los grants y avisos del advisor requieren contraste antes de calificar una exposición; no se probó una vulneración de cuentas.

---

## Qué priorizaría
1. Comprobar la carga de la app y los errores al consultar profesores.
2. Cerrar la brecha de créditos en cuentas existentes y optimizar las búsquedas del catálogo.
3. Facilitar el ingreso de sección y medir el retorno de cuentas nuevas.
4. Reducir llamadas de comparaciones y ordenar la atención del feedback.
5. Endurecer permisos y resolver alertas de rendimiento según uso real.

No cambié datos, permisos, funciones, índices ni configuración. No ejecuté funciones de negocio que escriben ni envié correos o avisos.

## Estado general
| Indicador | Resultado |
|---|---:|
| Cuentas existentes en Auth | 860 |
| Cuentas con estado guardado | 833 |
| Estados de estudiante / solo profesor | 832 / 1 |
| Ramos actuales de estudiantes | 4.561 |
| Notas numéricas guardadas | 12.694 |
| Cuentas con alguna nota numérica actual | 674 |
| Notas numéricas fuera de 1–7 / valores de nota de tipo incorrecto | 0 / 0 |
| Ramos con ID repetido dentro de la misma cuenta | 0 |
| Estados sin cuenta Auth | 0 |
| Tablas de public/admin con RLS | 35 de 35 |
| Sesiones bloqueadas en el corte final | 0 |
| Tamaño de base según pg_database_size al inicio | 34.770.067 bytes, aprox. 33,2 MiB |

Los ceros son comprobaciones acotadas, no una garantía integral de seguridad o exactitud del motor. No recalculé promedios reales ni descargué notas individuales.

## Hallazgos por impacto

### 1. P1 — Revisar la estabilidad del arranque antes de ampliar funcionalidades
**Evidencia:** `errores_app` tiene 17 registros de «app.js no cargó», asociados a 14 cuentas; el último es del 26-10 a las 23:10 UTC. Hay otros 3 registros de «app.js cargó al reintentar», de 3 cuentas, todos el 28-10. También hay errores de referencias a S y showTab, compatibles con fallos de carga, pero no está probada su relación evento a evento.

**Conclusión:** hay evidencia de fallos de entrada y de recuperaciones mediante el reintento. El código actual ya incorpora recuperación de carga; no corresponde afirmar que todos los fallos antiguos siguen abiertos.

**Propuesta:** verificar la eficacia del reintento existente por versión; probar con datos sintéticos el primer arranque, actualización del service worker, red intermitente y recuperación. Separar «falló y se recuperó» de «no pudo entrar» en el monitoreo. Los registros actuales no prueban si la causa fue red, caché, despliegue u otra.

**Cómo validar:** caída de errores de arranque por versión y una prueba reproducible de actualización con sesión y datos sintéticos existentes. No atribuir los avisos de extensiones o ResizeObserver a defectos propios: también aparecen en el histórico y parte de su filtrado ya está implementado.

SQL: `error_signatures`, `rating_http_context.error_boot`.

### 2. P1 — Hay errores observables en las consultas de profesores
**Evidencia, últimas 24 horas, solo POST:**
- `profesor_calificacion_estado`: 190 respuestas 200 y 27 respuestas 400; las 400 se asocian a 12 cuentas. Son 12,4% de las 217 respuestas POST observadas.
- `profesor_docente_estado`: 183 respuestas 200 y 25 respuestas 400; las 400 se asocian a 12 cuentas. Son 12,0% de 208 respuestas POST.

Son cuentas distintas por ruta: no se deben sumar como 24 personas afectadas. Ambas funciones existen en producción. Las respuestas OPTIONS se excluyeron.

**Conclusión:** es una señal para investigar el flujo, no una demostración de que faltó aplicar SQL. Algunas 400 pueden corresponder a validaciones esperadas o pruebas internas.

**Propuesta:** reproducir con cuenta sintética el paso «ingresar sección → guardar en nube → consultar/calificar». La función viva `profesor_contexto` exige que ramo y sección ya estén en el estado del servidor. Comprobar ese orden y mostrar un error útil si la copia aún no está al día. Mantener intacta esa autorización.

**Cómo validar:** caso de red lenta con sección recién agregada, reintento seguro y clasificación del código/motivo de las 400 sin guardar cuerpos con datos académicos. Los logs consultados no permiten atribuir todas las 400 a esa causa.

SQL: `rpc_definitions`. Logs: `http_fixed_24h`.

### 3. P1 — Completar créditos conocidos tiene impacto en el promedio mostrado
**Evidencia:**
- 109 ramos UC carecen de créditos numéricos y tienen un valor conocido en `catalogo_uc`; pertenecen a 52 cuentas.
- 44 de esos ramos pertenecen a 23 cuentas con una visita registrada en los últimos 7 días.
- 47 ramos sin créditos conocidos ya tienen al menos una nota numérica; pertenecen a 25 cuentas.
- El catálogo también contiene créditos cero legítimos; no se confundieron con ausencia.

**Por qué importa:** según el contrato del cliente, si un ramo con promedio no tiene créditos, el promedio general usa media simple. No probé que los 47 casos cambien el promedio efectivo: las compuertas y vínculos también intervienen.

**Propuesta:** verificar primero el mecanismo de recuperación de créditos que ya existe en `app.js` y si estas cuentas aún no han recibido/ejecutado esa versión. Resolver por sigla exacta y conservar créditos editados por la persona. No hacer un UPDATE masivo ni inferir equivalencias a partir de nombres ambiguos.

Mayor concentración: CLG0030 (12), GEO103 (9), ANT100 (9), ICP0101 (9), QIM100 (7). La lista completa agregada está en los resultados.

**Cómo validar:** cuenta sintética existente con créditos null, catálogo con SCT conocido y notas previas; demostrar que se completan solo los faltantes, sin alterar notas o pautas personalizadas, y comprobar el modo de promedio mostrado.

SQL: `priorities.uc_missing_credits`, `priorities.missing_credit_top`, `rating_http_context.catalog_credit_affected_with_graded_course`.

### 4. P2 — El catálogo busca por nombre sin un índice que acompañe esa búsqueda
**Evidencia:** `catalogo_uc` contiene 11.853 filas y solo tiene su índice primario en sigla. EXPLAIN de una búsqueda exacta por `busqueda = ANY(...)` da Seq Scan. En las estadísticas acumuladas:
- Consulta por nombres exactos: 127 ejecuciones del rol authenticated, 87,205 ms de media.
- Consulta por siglas exactas: 820 ejecuciones, 3,392 ms de media.
- Búsqueda por ILIKE en sigla/nombre: 2.056 ejecuciones, 29,453 ms de media.

Son formas y muestras distintas, acumuladas desde el reinicio de pg_stat_statements del 28-07; la diferencia no es una prueba A/B ni latencia completa del navegador. Una consulta administrativa histórica de diagnóstico promedió 21,7 segundos: se excluye como evidencia de lentitud de la app.

**Propuesta:** evaluar un B-tree sobre `busqueda` para igualdad y candidatos con pg_trgm para los patrones ILIKE reales. pg_trgm ya está instalado. Validar planes y mediciones en un entorno local con el catálogo público antes de proponer índices. No hay evidencia que justifique ampliar capacidad de la base ahora.

**Cómo validar:** misma consulta y datos antes/después; latencia y buffers, tamaño del índice y efecto de límites/OR. Para RLS, el advisor también detecta 15 políticas con auth.uid()/current_setting evaluados por fila: revisar el patrón `(select auth.uid())`, conservando exactamente los permisos. [Guía de rendimiento y RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).

SQL: `index_and_errors.catalog_indexes`, `catalog_plan`, `query_patterns`, `perf`.

### 5. P2 — Para crecer en calificaciones, la principal brecha observable es la sección
**Evidencia:** solo 50 de 2.374 ramos UC tienen sección positiva guardada: 2,1%. Son 23 de las 432 cuentas UC con ramos. Hay 19 calificaciones UC de 7 cuentas; en todas las universidades, 24 calificaciones de 9 cuentas.

**Conclusión:** traer más nombres ayuda a sugerir profesores, pero por sí solo no elimina la falta de sección. Estos conteos no prueban cuántas personas intentaron calificar: el snapshot no contiene ese embudo.

**Propuesta:** priorizar el formulario breve de sección y la foto de horario ya desarrollados; verificar su despliegue y funcionamiento con cuentas existentes antes de agregar otra pantalla. Mantener el requisito de sección para calificar. Medir de forma agregada inicio, sección confirmada, guardado exitoso y calificación, sin nombres ni notas.

Como referencia de alcance: Cálculo II está en 323 cuentas y 311 ramos no tienen sección; Introducción a la Programación, 271 y 263; Dinámica, 213 y 206.

SQL: `priorities.rating_funnel`, `courses.top_uc`, `operations.ratings`, `fk_adoption.rating_courses_by_tenant`.

### 6. P2 — Las comparaciones generan muchas llamadas pequeñas
**Evidencia, ventana fija de 24 horas, POST:**
- `curso_nota_set`: 9.156 respuestas 204, asociadas a 259 cuentas; otras 2 respuestas 401.
- `curso_posicion`: 4.626 respuestas 200, asociadas a 250 cuentas.
- El cliente recorre ramos y hace una llamada de escritura por cada uno; guarda una firma en memoria para evitar repeticiones dentro de la sesión.

**Conclusión:** hay una oportunidad de reducir viajes de red; no demuestra por sí sola un bug, costo excesivo o duplicación accidental. Los promedios también se renuevan para la ventana de vigencia de 30 días.

**Propuesta:** evaluar una RPC por lote para los promedios propios y otra lectura por lote para posiciones. El motor sigue calculando en el cliente; la RPC conserva dueño auth.uid(), exclusión de cuentas solo profesor, borrado con null, escala y vigencia. Una optimización de caché no debe dejar fuera a personas activas ni revivir ramos archivados.

**Cómo validar:** mismo resultado y aislamiento con datos sintéticos, menos solicitudes por visita y sin cambios en la ventana de 30 días. No modificar la medición de anuncios.

Logs: `http_fixed_24h`. Código revisado: `app.js:subirNotasCurso`.

### 7. P2 — Hay base para medir retorno; conviene separar cuentas nuevas de las habituales
**Evidencia:**
- Registro diario desde el 12-10; 676 cuentas con al menos una visita en esa cobertura.
- Del 12 al 18-10: 408 cuentas registradas como activas. Del 19 al 25-10: 500; 339 aparecieron en ambas semanas, 83,1% de la primera.
- Cohorte de altas del 13 al 20-10, con D7 ya completamente observado: 120 cuentas; 41 volvieron exactamente al día siguiente (34,2%) y 23 exactamente al séptimo día (19,2%).
- En los últimos 7 días hay 40 cuentas de estudiante con visita registrada y ninguna nota numérica actual.

**Conclusión:** el retorno de cuentas nuevas merece seguimiento aparte del retorno de la base habitual. No se puede atribuir la diferencia a onboarding, adquisición o calidad de pautas sin cruzar más evidencia.

**Propuesta:** usar una tabla semanal de cohortes maduras, por universidad y origen de adquisición si existe una fuente compatible, y observar con pruebas sintéticas dónde cuesta ingresar la primera nota. No perseguir crecimiento de cuentas registradas como única señal.

**Límites:** una visita es una apertura registrada con sesión; no prueba trabajo académico. La primera fecha puede estar incompleta por el despliegue de la medición. Se incluyen cuentas internas/de prueba porque no hay una lista validada para excluirlas. Se excluyen cuentas borradas, sesiones sin cuenta y uso solo local/offline. D1/D7 son retorno en el día exacto, no «cualquier momento durante la semana». Hoy y la semana actual están incompletos. No se usó last_sign_in_at como actividad.

SQL: `activity`, `weekly_return`, `fk_adoption.active_without_notes`.

### 8. P2 — Ordenar el feedback y las cuentas con configuración incompleta
**Evidencia:**
- 19 feedbacks: 18 sin marca de solución. Incluyen 7 problemas, 10 sugerencias y 1 «otro».
- El problema sin resolver más antiguo es del 25-08. La ausencia de marca no prueba que no se haya trabajado.
- La única solución marcada tiene el aviso aún sin ver; no corresponde volver a enviarlo por este diagnóstico.
- 27 cuentas Auth no tienen estado guardado; 24 tienen más de 7 días y 10 más de 30.
- 20 estados no tienen fila profiles; 2 figuran con onboarding completo y 6 registran visita en los últimos 7 días. Una cuenta de profesor puede no tener perfil académico por diseño.

**Propuesta:** revisar el backlog con estados de seguimiento y confirmar soluciones antes de marcar/responder. Investigar los 2 estados completos sin perfil mediante el flujo de sincronización con fixtures sintéticos: el SDK devuelve errores que un catch no necesariamente captura. No borrar cuentas «inactivas» ni asumir pérdida de notas.

SQL: `operations.feedback`, `accounts`, `priorities.profile_state_mismatch`, `weekly_return.auth_no_state_age`.

### 9. P2 — Fortalecer permisos sin confundir alertas con exposición demostrada
**Evidencia:**
- 35/35 tablas de public/admin tienen RLS. La vista administrativa no tiene SELECT para anon/authenticated y esos roles no tienen USAGE en admin ni en los esquemas de respaldo.
- Las funciones SECURITY DEFINER revisadas tienen search_path fijado. Los 7 avisos de search_path mutable corresponden a funciones SECURITY INVOKER.
- Las funciones admin revisadas exigen administrador con MFA, directamente mediante exigir_administrador o mediante administrador_verificado. Esta última comprueba aal2.
- Auth informa que está deshabilitada la protección de contraseñas filtradas. Hay 263 cuentas con credencial de contraseña no vacía.
- Cinco tablas conservan grants de TRUNCATE para anon y authenticated: user_ramos, profiles, catalog_reports, agent_links y agent_link_codes. También conservan otros grants amplios.

**Propuesta:** revisar/activar la protección de contraseñas filtradas y reducir grants a los que la aplicación necesita. El grant de TRUNCATE es endurecimiento pendiente: no ejecuté TRUNCATE ni demostré una ruta para invocarlo a través de PostgREST. No equivale a afirmar que cualquiera pueda vaciar esas tablas desde la web.

Los 30 avisos «RLS sin políticas» incluyen tablas cerradas que se usan exclusivamente mediante RPC, y los 99 avisos de funciones definer accesibles a authenticated incluyen funciones protegidas por MFA. No se deben «corregir» abriendo policies o quitando RPC necesarias.

**Cómo validar:** permisos efectivos, regresiones de aislamiento entre cuentas sintéticas, llamadas anon/authenticated y MFA aal1/aal2. La revisión de metadatos actual no reemplaza esas pruebas de extremo a extremo. [Protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

SQL: `security_catalog`, `security_details`. Referencias de remediación: consultar el advisor actual de Supabase; los avisos corresponden a la fecha del corte.

### 10. P3 — Contenido y panel de alumnos: priorizar demanda antes de ampliar
**Evidencia:** 557 ramos actuales tienen cero categorías: UC 305, FEN 121, UAI 68 y UAndes 63. Es configuración actual, no falta demostrada en el catálogo. Entre los UC identificados están ICS1513 (15), CLG0030 (12) y QIM100 (10). ICS1513 ya está abordado en la PR #884 (ya mergeada al preparar este traspaso), con pauta histórica y su período: no corresponde duplicar ese trabajo ni aplicar la pauta silenciosamente.

Hay 4 perfiles de profesor aprobados con panel habilitado, 3 en modo ejemplo y 0 vínculos profesor–alumno. Un estudiante también puede tener perfil de profesor aprobado: no es una inconsistencia de tipo de cuenta.

**Propuesta:** buscar programas oficiales de los ramos con más demanda y verificar cómo se ofrece una pauta a quienes ya tienen el ramo. Para el panel, probar el recorrido invitar → aceptar → compartir ramos y conversar con profesores que lo usen antes de invertir más en gráficos. Las cifras pueden incluir cuentas internas y no demuestran un fallo de invitaciones.

El advisor detecta 22 FK sin índice de cobertura: 12 en public/admin y 10 en respaldos. Hay 9 tablas sin PK, todas en respaldos. No añadir índices o borrar respaldos solo para limpiar el advisor: priorizar accesos/borrado de cuenta y documentar la conservación de respaldos. Tres índices sin uso sobre anuncios pequeños tampoco justifican eliminarlos.

SQL: `priorities.no_rubric`, `rating_http_context.no_rubric_top`, `operations.teacher_profiles`. Advisor performance.

## Alcance, validación y limitaciones
- Se ejecutaron consultas de agregado y catálogo SQL con transacciones READ ONLY y timeout local de 12 segundos. EXPLAIN se usó sin ANALYZE.
- Se consultaron los advisors de seguridad/rendimiento y logs agregados, separando POST de OPTIONS.
- No se exportaron correos, nombres de alumnos, IDs de usuarios, tokens, textos libres de feedback ni notas individuales. Nombres de cursos provienen del catálogo público; firmas de error se devolvieron saneadas y agrupadas.
- No se ejecutaron cambios ni pruebas de aislamiento con cuentas reales. No se leyó Vault, contraseñas, tokens o archivos del servidor. La consulta de credenciales solo contó si existe una contraseña; no devolvió su contenido.
- Las consultas exploratorias de comparación de cursos no replican completamente siglaDeRamo/claveRamoCurso. Sus 45 filas candidatas NO se presentan como defecto confirmado; FEN deriva siglas y UAI/UAndes pueden usar claves normalizadas. Tampoco es un error que un estudiante tenga un perfil de profesor aprobado.
- No hay pruebas de carga ni métricas completas de CPU/memoria/costo. Un promedio SQL acumulado no es p95 ni latencia de la interfaz.
- Esta es una auditoría de lectura, sin cambios de repositorio; npm test no valida las conclusiones de producción y no se requirió una nueva batería de código.
- La metodología se contrastó con [inspección de Supabase](https://supabase.com/docs/guides/observability/inspect) y [detección de problemas](https://supabase.com/docs/guides/observability/detecting).

## Archivos
- consultas.sql: 17 bloques Postgres ejecutados en esta revisión; correr por bloque. Incluye advertencias para campos exploratorios.
- logs-clickhouse.sql: consulta reproducible de tráfico agregado, en Logs Explorer y con la ventana indicada.
- Este traspaso lleva el informe y los SQL; el JSON original no se incorpora para evitar duplicar salidas internas y consultas exploratorias.

