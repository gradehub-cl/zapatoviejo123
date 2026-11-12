# Propuesta: completar y respaldar las siglas del catálogo

Estado: propuesta para Lucas/Claude. **Sin implementación.** Esta PR solo agrega
este documento; no cambia el comportamiento de la app ni ejecuta SQL.

Cuando un ramo del catálogo ya tiene créditos pero aún no tiene `sigla`, la
recuperación actual lo omite. Además, una sigla completada por `normalize()`
puede quedarse solo en el dispositivo. Se propone completar únicamente los
identificadores inequívocos y respaldarlos con la sincronización existente,
sin esperar a que el estudiante cambie una nota.

## Diagnóstico comprobado el 4 de noviembre de 2026

Consultas agregadas de solo lectura, sin recuperar notas ni identificar cuentas.
Son una fotografía del momento, no contadores permanentes.

- En `user_ramos`, 218 ramos UC no tenían `sigla` guardada. De ellos, 176 tenían
  origen de catálogo; 140 de esos 176 ya tenían créditos. En 75 se conservaba
  un código existente en `catalogo_uc` dentro de `origen.ramoKey`.
- De los 176, 169 coincidían por nombre normalizado con una sola sigla del
  catálogo. Esa coincidencia mide cobertura: no autoriza una actualización
  masiva ni resuelve por sí sola todos los casos de identidad.
- En FEN, 105 ramos con origen de catálogo y sin sigla coincidían con nombres
  para los que la app ya declara un código.
- En `catalog_reports`, los 309 reportes FEN dejaban `ramo_sigla` vacío. Es el
  contrato actual: fuera de UC, `siglaReporteUC()` devuelve `null` y el consenso
  usa el nombre. Completar `user_ramos` no debe cambiar ese contrato.
- Los 9 reportes UC sin sigla eran antiguos, ninguno creado en los últimos
  siete días, y el resolver SQL vigente no encontraba una sigla para ellos.
  Quedan pendientes, sin asignarles un código por aproximación.

### Dos fallos reproducibles

1. `src/app/catalogo-remoto.js:completarCreditosUCPendientes` selecciona solo
   ramos sin créditos. Con un ramo sintético sin sigla y con 10 créditos retorna
   `false` sin consultar; al dejar sus créditos en `null`, inicia la carga.
   El filtro de `showMainApp` y el recorrido de
   `completarCreditosUCTrasCarga` tienen la misma limitación.
2. `normalize()` llama a `sellarDatosCatalogo`. Al entrar desde la nube,
   `aplicarNubeAlEntrar` solo detecta correcciones por `firmaEstructuraSync`,
   que mira ids/pesos de categorías. Una sigla completada no cambia esa firma:
   se escribe la copia local, pero no se pide subir esa mejora al servidor.

## Solución propuesta

### 1. Resolver solo con identidad suficiente

Una única resolución conservadora para **completar el campo ausente**:

- Conservar toda sigla ya guardada. Una discrepancia con el catálogo no se
  corrige automáticamente.
- Si el ramo del catálogo conserva su identificador en `origen.ramoKey`, usar
  esa identidad antes que el nombre visible, que la persona puede haber editado.
  Confirmar esa identidad contra los datos del catálogo; su forma por sí sola
  no acredita un código. Usar el contrato vigente: hay códigos oficiales que no
  siguen el patrón de tres letras y cuatro cifras.
- Usar códigos declarados inequívocamente por el catálogo local de su universidad
  o una coincidencia exacta y única del catálogo remoto UC.
- Si distintas fuentes proponen códigos distintos o hay varios homónimos, dejar
  el campo vacío. No elegir la primera fila ni resolver por parecido textual.
- Mantener `origen` y `origen.ramoKey`; esta tarea no reclasifica ni renombra un
  ramo. Los ramos manuales sin origen conservan el tratamiento actual: no se
  les asigna sigla ni procedencia por su nombre.
- Universidades cuyo catálogo actual no declara códigos siguen usando sus
  identificadores por nombre. No se inventan siglas.

### 2. Recuperar siglas independientemente de los créditos

- Ampliar la selección de pendientes y la condición del arranque para incluir
  ramos UC del catálogo sin sigla, aunque ya tengan créditos.
- Consultar por código conocido; si solo queda el nombre, pedir todas sus
  coincidencias exactas. Una respuesta incompleta no prueba unicidad.
- Conservar la recuperación actual de créditos: solo rellenar ausentes y nunca
  reemplazar un valor ya guardado. La falta de sigla no obliga a cambiar créditos.
- Aplicar los resultados en un recorrido, con una sola llamada al guardado
  habitual si hubo mejoras. Una segunda ejecución sin novedades no escribe.
- Conservar el respaldo del catálogo completo ante fallos de red, sin bloquear
  la carga de ramos ni el ingreso de notas. Un fallo conserva los datos previos.
- Antes de aplicar una respuesta asíncrona, revalidar cuenta, universidad e
  identidad del ramo. Descartarla si cambió la cuenta, se borró el ramo o se
  modificó su identidad durante la consulta.

### 3. Respaldar lo completado al normalizar

- Comparar la copia cruda recibida y la normalizada en el punto de entrada de
  la cuenta: detectar específicamente siglas ausentes que se completaron para
  el mismo ramo de catálogo.
- Pedir la subida silenciosa ya existente para correcciones, conservando la
  base cruda y el control de versión. Evitar una bandera global en `normalize`:
  esa función también se usa al leer alumnos y no debe disparar escrituras
  sobre la cuenta que está mirando el panel.
- Preservar las notas locales pendientes y la fusión de dispositivos. Si otra
  pestaña guardó una sigla explícita durante la consulta/subida, el completado
  automático no debe sobrescribirla. Esta colisión necesita una prueba propia;
  no basta añadir `sigla` a una firma y asumir que toda fusión será segura.
- Si hace falta distinguir un completado automático pendiente durante esa
  colisión, mantener esa información solo en memoria, por cuenta y ramo. No
  agregar un campo persistente sin acordarlo antes.
- Tras una subida confirmada, el siguiente arranque no vuelve a enviar lo mismo.
  Sin conexión, la mejora y las notas siguen disponibles localmente y se usa el
  reintento normal de sync.

## Archivos previstos para implementar, si se aprueba

| Fuente | Cambio previsto |
|---|---|
| `src/app/catalogo-identidad.js` | Resolución segura al completar una sigla del catálogo. |
| `src/app/catalogo-remoto.js` | Selección de pendientes por sigla/créditos, consultas exactas y guardas de respuesta tardía. |
| `src/app/catalogo-carga.js` | Aplicar mejoras aunque ya existan créditos; guardar una sola vez. |
| `src/app/instalacion-nativa.js` | Ejecutar la recuperación al entrar también cuando solo falta sigla. |
| `src/app-session/entrada-cuenta.js` | Detectar la mejora de metadatos al leer la nube y solicitar su respaldo. |
| `src/app-session/sync-fusion.js` | Soporte de comparación/conciliación que requiera la prueba de colisión. |
| `tests/creditos-uc-servidor.test.js` | Recuperación, ambigüedad, identidad, respuesta tardía y fallos. |
| `tests/sync-sin-perdidas.test.js` | Cuenta existente, respaldo único, modo sin conexión y dos dispositivos. |

Si la prueba de colisión exige tocar también `sync-escritura.js`, se debe
explicar y acordar ese cambio antes de ampliar la implementación. Esta tabla
es un plan de revisión, no una autorización para editar esos archivos ahora.

## Pruebas de aceptación, con datos sintéticos

1. Ramo UC del catálogo sin sigla y con créditos: recupera su código y conserva
   créditos, ids, categorías, pesos, fechas, notas y compuertas.
2. Identificador confirmado en `ramoKey` y nombre editado: conserva esa identidad.
3. Ramo FEN del catálogo con código local: al entrar se guarda también en la
   nube, sin exigir editar una nota.
4. Dos códigos con el mismo nombre, incluso con iguales créditos: no completar
   la sigla por nombre. Una sigla ya guardada nunca se reemplaza.
5. Ramo manual sin origen: no recibe sigla, procedencia ni pauta. Conservar las
   reglas existentes para créditos manuales.
6. Catálogo remoto sin tabla, sin red, con respuesta parcial o inválida: sin
   pérdida de datos ni bloqueo de la app.
7. Cambio de cuenta/universidad, borrado o edición de identidad mientras llega
   la consulta: ninguna respuesta vieja modifica la nueva cuenta o el ramo.
8. Cuenta existente con nube y caché antiguas: completa y respalda una vez.
   El siguiente arranque no vuelve a escribir.
9. Nota local sin subir y nota nueva en otro dispositivo: ambas sobreviven al
   respaldo de la sigla. Una sigla explícita concurrente no se pisa.
10. Sin conexión y posterior reconexión: se conserva la edición académica y se
    completa el respaldo mediante la ruta habitual.
11. Cuenta de profesor y normalización de un alumno en su panel: no disparan
    el completado/sync de ramos del estudiante en la cuenta del profesor.
12. El contrato de reportes por nombre fuera de UC se mantiene intacto.

## Alcance y riesgos para las cuentas existentes

La actualización sería gradual: completa lo que falta al volver a abrir la app.
Las cuentas que no regresen conservarán sus registros como están. No hay un
backfill masivo ni una migración SQL en esta propuesta. Los semestres archivados
y los reportes históricos quedan fuera de la corrección automática.

Aunque no se toca el motor, una sigla participa en comparaciones, recomendaciones
y vinculación de ramos. Por eso la identidad inequívoca y las pruebas de homónimos
son requisitos de seguridad de datos, no detalles cosméticos. La sincronización
es un camino crítico: no se aprueba sin probar la fusión y el caso sin conexión.

No cambia la forma de `gradehub_v1`: se completa un campo opcional ya existente.
La implementación se entrega en otra revisión de esta misma PR solo después del
OK de Lucas, con `npm run build`, los dos chequeos de AGENTS.md y
`npm test -- --resumen` en verde.
