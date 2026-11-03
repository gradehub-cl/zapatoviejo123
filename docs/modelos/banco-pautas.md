# Propuesta previa a implementar: banco de pautas

Publicada en la PR antes de escribir su código.

- Tabla `public.pautas_banco`: id, tenant, sigla/clave canónica, período,
  `documento_path`, `documento_sha256`, estado (confirmada / en disputa /
  sin pauta), nota interna, revisado_por (FK auth.users, SET NULL al borrar
  al revisor), revisado_at. Única por tenant/clave/período. No almacena alumnos.
- Lectura y escritura administrativas con MFA. RPC security definer exige
  `admin.exigir_administrador()` antes de consultar. RLS sin acceso de
  estudiantes/profesores. Escritura solo por RPC, que fija el revisor real.
- `pautas-programas`, bucket privado PDF, máximo 10 MiB. Ruta
  tenant/clave/período/UUID.pdf, sin identidad del estudiante. Storage tiene
  políticas separadas que también exigen admin+MFA. Descarga con URL firmada
  breve. El cliente calcula SHA-256 del archivo antes de subirlo; ruta y hash
  quedan juntos en el registro. El PDF no se publica al catálogo.
- El registro de presets del punto 4 proporciona la pauta del catálogo. Si no
  hay URL/documento original registrado se indica como faltante; nunca se
  inventa una fuente. Se conserva el período real, incluso si es desconocido.
- Las variantes provienen de `catalog_reports`, agrupadas por huella, sección
  y origen en el período elegido; cuentan personas distintas. Devuelve los
  comentarios y estructura, nunca identificadores, nombres ni correos.
- El banco añade notas/documentos/estado interno; no edita presets, pautas
  aplicadas ni consenso. Publicar un programa al catálogo continúa mediante PR.
- Auditoría reabierta: probar admin con/sin MFA, estudiante/profesor, Storage,
  tabla/RPC, FK del revisor y contenido anónimo de la respuesta.

Depende del punto 4. Aplicación prevista: SQL nuevo reaplicable; ningún SQL se
aplica desde esta PR. Lucas o Claude revisan y mergean.

## Implementación y auditoría de acceso

Aplicar `supabase/pautas_banco.sql` después de las dependencias. Sin barras
invertidas; reaplicable. No se aplicó en producción. Los archivos fuente y las
ambigüedades conocidas se toman de los tres inventarios de programas UC/UAI en
`docs/programas-*.json`, y las 23 referencias UDD de `docs/mallas-udd.md`
integradas desde #940. La fecha de subida de un PDF no se confunde con su
período de vigencia, que permanece desconocido si no está declarado. Una referencia de archivo no implica que el PDF esté
subido: «Abrir programa» aparece solo si hay documento privado asociado. Los
ramos sin una referencia conservan el faltante visible.

- Tabla con RLS, SELECT solo admin+MFA y mutación exclusivamente por RPC.
- La RPC fija `revisado_por=auth.uid()`; no acepta un revisor declarado.
- Cada RPC exige admin antes de leer/escribir; el tab no es la autorización.
- Bucket no público, PDF y 10 MiB; políticas Storage separadas con MFA.
- La ruta debe pertenecer a la universidad/ramo/período del registro, existir
  en Storage y acompañarse de SHA-256 válido. El navegador calcula el hash del
  archivo. No se afirma verificación criptográfica del contenido por Postgres:
  Storage y el registro están bajo la responsabilidad del admin que lo sube.
- RLS de Storage se prueba con los permisos base de Supabase en el harness,
  para no confundir ausencia de GRANT con protección de filas.
- Al borrar una cuenta revisora, el programa se conserva y el revisor queda null.
- No se devuelven `user_id`, nombres ni correos al banco. Los comentarios son
  texto de reportes y se escapan antes de mostrarlos.

HIG aplicadas: [Tab views](https://developer.apple.com/design/human-interface-guidelines/tab-views)
para cinco áreas relacionadas y navegación por teclado;
[Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields)
para etiquetas persistentes y texto largo en textarea;
[Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
y [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
para acción de guardar por bloque, foco, controles de 44 pt y colores del tema.
Sin animación nueva. No hay conflictos con semáforo o tipografía.
