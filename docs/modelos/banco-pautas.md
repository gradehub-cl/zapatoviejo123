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
