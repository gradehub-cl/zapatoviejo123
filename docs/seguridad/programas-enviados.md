# Programas PDF: revisión de acceso y borrado

Reabierta el 12 de noviembre de 2026 por la incorporación de documentos privados.
Pruebas con cuentas, archivos y notas sintéticas; SQL sin aplicar a producción.

## Datos y acceso

- Bucket `programas` privado, exclusivamente `application/pdf`, hasta 10 MiB.
  La ruta es `<auth.uid()>/<uuid>.pdf`; no contiene carrera, sigla ni nombre.
- La selección, el encabezado `%PDF-`, tamaño, páginas y presencia de texto se
  revisan en el dispositivo con el mismo pdf.js de la ficha académica. Un escaneo
  se acepta con aviso. No se extraen ni envían líneas como telemetría.
- El PDF completo puede contener datos personales impresos por la universidad.
  Solo el dueño y administradores con MFA pueden descargarlo. La revisión y la
  publicación de la pauta son pasos humanos separados: subir o marcar «Publicado»
  no escribe presets ni el consenso.
- `programas_enviados` tiene RLS y FK a `auth.users ON DELETE CASCADE`. El dueño
  consulta solo sus filas; no hay INSERT/UPDATE/DELETE directo para estudiantes.
  La RPC fija al usuario desde `auth.uid()`, nunca desde parámetros del cliente.
- Admin consulta la cola por RPC con `aal2`, sin nombres ni correos del remitente.
  La descarga usa un enlace firmado por 60 segundos; no se guarda ese enlace.
  Como todo enlace firmado, quien lo reciba puede usarlo hasta que venza.
- `ramo_id` es una asociación privada con la ficha, para que corregir la sigla o
  el nombre antes de mandar el archivo no haga desaparecer el estado del envío.
- La RPC limita cinco envíos por día de Chile. Storage limita también cargas
  incompletas y usa el mismo bloqueo por persona. El duplicado se consulta antes
  de subir; si hay una carrera entre dos envíos, el cliente elimina su copia por
  Storage API antes de confirmar «Ya lo tenemos, gracias». El SHA y los metadatos
  enviados por el cliente no certifican que el contenido sea oficial: se revisa.

## Borrado de cuenta

1. Si no hay archivos, se conserva `eliminar_mi_cuenta()` como antes.
2. Si hay archivos (también cargas incompletas), el cliente llama al servidor
   `/cuenta-programas` con su JWT. El servidor verifica la sesión con Auth;
   ignora cualquier identidad enviada en el cuerpo. No utiliza claves elevadas.
3. El servidor lista y elimina los archivos de la carpeta propia mediante
   **Storage API** en lotes. Borrar `storage.objects` por SQL dejaría el binario
   huérfano y no está permitido en este flujo.
4. Solo después de vaciar la carpeta invoca la RPC de borrado existente con la
   misma sesión. Un trigger en `auth.users` comprueba nuevamente que esté vacía,
   bajo el mismo bloqueo de las cargas, y falla si aparece otro archivo.
5. Si Storage falla, se conserva la cuenta, el estado local y las notas. Puede
   haberse eliminado parte de los PDFs antes del fallo; reintentar completa el
   proceso. No es una transacción atómica entre Storage y Auth.

El trigger también protege un cliente antiguo o una eliminación administrativa
que intente borrar Auth antes de los archivos. Un borrado administrativo debe
vaciar primero `programas/<user_id>/` por Storage API con autorización adecuada.
No se alteran aquí los otros archivos o servicios del borrado anterior.

## Instalación y compatibilidad

1. Verificar que ya estén `administradores.sql` y `eliminar_mi_cuenta.sql`.
2. Aplicar **solo** `supabase/programas_enviados.sql`, reaplicable, y refrescar la
   caché de esquema de PostgREST si el entorno lo necesita. No se modifica ni se
   reaplica `reporte_programa.sql`.
3. Desplegar cliente y `functions/cuenta-programas.js` juntos; la función se
   incluye expresamente en la lista cerrada de `.github/workflows/deploy.yml`.
   No requiere una nueva clave secreta.

Si llega el cliente antes del SQL, la ficha funciona y el envío muestra que aún
no está disponible antes de subir un archivo. El borrado sin esa RPC continúa
por el camino anterior. Si hay PDFs pero falta la función del servidor, el
borrado falla conservando la cuenta; no elimina Auth dejando archivos.
Reaplicar este SQL al final si se reinstalan bases que cambien permisos.

## Evidencia y límites

- `tests/programas-enviados-sql.test.js`: Postgres en memoria, reaplicación,
  dos dueños, administrador con/sin MFA, deduplicación, día de Chile, cuota,
  permisos, ruta propia, cascade y bloqueo de borrado con archivos.
- `tests/cuenta-programas-servidor.test.js`: limpieza por API antes de Auth,
  identidad verificada, fallos, ausencia de token en errores, CORS nativo y
  presencia de la función en el despliegue.
- `tests/programas-pdf.test.js`: validación, estados, reintentos, deduplicación,
  compatibilidad sin SQL y cuenta conservada si falla el borrado.
- `tests/programas-pdf.navegador.cjs`: HTML y funciones reales con pdf.js local,
  CSP de producción y servicios simulados; conserva notas y pauta existentes.

No se ha ejecutado contra Storage de producción. La prueba del selector en la
app iOS instalada queda pendiente: el simulador existe, pero no está disponible
como superficie de interacción en esta sesión. No se reemplazó ninguna app ni
se usó una cuenta existente del simulador. Tampoco se añade recepción mediante
Share Extension desde Mail/Drive; el selector nativo de archivos sigue siendo
el punto de entrada. La ayuda opcional de ponderaciones en Admin queda fuera.
