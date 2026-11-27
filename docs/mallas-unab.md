# UNAB: carreras, reglamento y fuentes

Revisión del 2026-11-26. Tenant `unab`, visible desde que entra (Lucas,
2026-11-26). Requiere aplicar antes `supabase/universidades_udp_unab.sql`.

## Fuentes

| Dato | Fuente | Estado |
|---|---|---|
| 60 carreras diurnas | `admision.unab.cl/carrera-sitemap.xml`. Su `robots.txt` permite a Claude-User y ClaudeBot | 8 nombres leídos en su ficha (Ecoturismo, Arquitectura, Artes Visuales, Bachillerato en Cs. de la Salud, Biología, Biología Marina, Bioquímica, Derecho). Las otras 52 salen del slug con tildes restituidas: **confirmar** |
| Fichas | admision.unab.cl responde 503 (Wordfence, «máximo de solicitudes por minuto») incluso a una ficha cada 10 s. Se paró ahí | Reintentar otro día, muy despacio, o pedir el listado a la UNAB |
| Mallas | `https://www.unab.cl/carreras/mallas/<archivo>.pdf` (el nombre no se deduce del slug) y la malla HTML de cada ficha | PDF con texto, por semestre, **sin siglas, créditos ni plan**. 15 revisados |
| Siglas | Informes de autoevaluación en calidad.unab.cl (p. ej. Licenciatura en Física 2022: LFIS301, FMMP111) | Solo carreras con informe publicado |
| Reglamento | Ver abajo | Falta el vigente |
| Correo | `@uandresbello.edu`, [infografía de la Intranet](https://www.unab.cl/servicioestudiante/wp-content/uploads/2026/04/Infografia-Intranet.pdf) | En `DOMINIOS_CORREO_POR_TENANT` |
| Calendario 2026 | [Pregrado semestral](https://www.unab.cl/assets/uploads/2025/12/calendario-academico-2026-Semestral-Pregrado-1225.pdf): 2-mar a 11-jul y 3-ago a 12-dic | Sin cargar |
| Marca | [Manual de marca, enero 2026](https://institucional.unab.cl/wp-content/uploads/2026/01/manual-marca-unab-0126.pdf): Pantone 296 y 187 | Sigla blanca sobre Pantone 296 (`#051C2C`) |

Fuera: vespertino, Advance (trimestral) y online, con otra oferta y calendario.

## Reglamento

El vigente es el **D.U. N° 35-2024**, alojado en un CDN que respondió 403 y no
se leyó. El PDF que se revisó es el **D.U. N° 1897/2012**, texto refundido
anterior (escaneado, leído con OCR). Sus reglas coinciden con las que cita el
informe de autoevaluación 2022:

- Art. 33: escala 1,0–7,0, aprueba con 4,0; la final redondea al décimo
  superior desde ,05. Es la regla común: no lleva entrada en
  `GH_REGLAS_NOTA_POR_TENANT`. D/A/R para prácticas y tesis, sin equivalencia
  numérica (no entra a `CALIFICACIONES_CONCEPTUALES_POR_TENANT`).
- Art. 35: final 70 % presentación + 30 % examen **salvo que el programa diga
  otra cosa**; el docente puede reemplazar una parcial por el examen. Como lo
  define el programa, no va como regla del tenant.
- Art. 36: eximición optativa por asignatura, con presentación ≥ 5,0.
- Art. 41: 75 % de asistencia en primer año; sin ella el examen vale 1,0.
- Art. 42: faltar a una evaluación es 1,0.

Antes de cargar cualquier regla UNAB en el motor hay que leer el D.U. 35-2024.

## Pendiente, en orden

1. Conseguir el D.U. 35-2024 y confirmar las reglas.
2. Confirmar los 52 nombres desde la ficha.
3. Mallas desde los PDF (por nombre, sin siglas), empezando por el
   Bachillerato en Ciencias de la Salud, tronco común de 11 carreras.
