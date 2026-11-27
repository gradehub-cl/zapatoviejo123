# UDP: carreras, reglamento y fuentes

Revisión del 2026-11-26. Tenant `udp`, visible desde que entra (Lucas,
2026-11-26). Requiere aplicar antes `supabase/universidades_udp_unab.sql`.

## Fuentes

Ningún host UDP bloquea por `robots.txt` (solo excluyen `/cms/wp-admin/`).
No hay página de términos ni licencia; solo «© Universidad Diego Portales».

| Dato | Fuente | Estado |
|---|---|---|
| 48 carreras | [admision.udp.cl/carrera-sitemap.xml](https://admision.udp.cl/carrera-sitemap.xml), nombre desde el `og:title` de cada ficha | En `CARRERAS_DECLARABLES.udp` |
| Mallas | PDF de admisión 2026 bajo `admision.udp.cl/cms/wp-content/uploads/2025/0{8,9}/`, uno por programa (42 distintos) | Con texto, por semestre, **sin siglas ni créditos**; la tabla sale desordenada al extraerla |
| Siglas y créditos | [eit.udp.cl/asignaturas](https://eit.udp.cl/asignaturas/) (Informática y Telecom., 174 descriptores), [eit.udp.cl/asignaturas-2](https://eit.udp.cl/asignaturas-2/) (Ciencia de Datos, 42), [eii.udp.cl](https://eii.udp.cl/carrera-udp/malla-curricular/) (Industrial, plan 2018) | Solo esas escuelas |
| Oferta académica | `estudiantes.udp.cl/oa/<CARRERA>.xls` | 404 hasta el 28-12-2026; podría traer siglas |
| Reglamento | [Reglamento del Estudiante de Pregrado, Res. 16/2026](https://www.udp.cl/cms/wp-content/uploads/2026/07/REGLAMENTO-DEL-ESTUDIANTE-DE-PREGRADO-VF-2026-FINAL.pdf) | Leído |
| Derecho | [Res. 07/2026, Reglamento de la Facultad](https://www.udp.cl/cms/wp-content/uploads/2026/03/RESOLUCION-DE-RECTORIA-No-07-APRUEBA-MODIFICACION-REGLAMENTO-DE-DERECHO-2026.pdf) | Leído; no cargado |
| Correo | [@mail.udp.cl](https://estudiantes.udp.cl/servicios-academicos/webmail/) | En `DOMINIOS_CORREO_POR_TENANT` |
| Módulos | Guía del Estudiante 2026, p. 59: 10 módulos de 1 h 20 min desde las 8:30 | Sin cargar |
| Marca | No se encontró un manual de marca público | Sin `colores`: la sigla usa el acento de la app |

## Reglamento general (Res. 16/2026)

- Art. 26: escala 1,0–7,0, notas con un decimal; la final redondea al décimo
  superior desde ,05; aprueba con 4,0. Es la regla común del motor: no lleva
  entrada en `GH_REGLAS_NOTA_POR_TENANT`.
- Art. 24: al menos 3 evaluaciones con un examen o evaluación final; si esta
  pesa más que las otras, no pasa de 40 %. Presentación mínima 3,5 o 4,0
  según la carrera; sin ella se reprueba con la presentación como final.
  Como el mínimo depende de la carrera, no va como regla del tenant.
- Art. 25: recuperativas, examen reprobatorio y eximición los define cada unidad.
- Art. 27: AD = 7,0, AP = 5,0, RP = 3,0 → `CALIFICACIONES_CONCEPTUALES_POR_TENANT.udp`.
- Art. 37: sin la asistencia no rinde examen; con promedio ≥ 4,0 la final es
  RI = 3,9. Pendiente de modelar.
- PGP: [según la UDP](https://estudiantes.udp.cl/formacion-academica/evaluaciones-y-reconocimiento-academico/)
  pondera por **número de sesiones**, con tope de 6 CFG. GradeHub pondera por
  créditos: el promedio general UDP es aproximado (decisión de Lucas,
  2026-11-26; el aviso va en otra PR).

## Derecho (Res. 07/2026), pendiente

- Plan 5.3 y anteriores (art. 55): final 60 % presentación + 40 % examen;
  presentación 50 % solemne + 50 % parciales.
- Plan 6.0, disciplinares (arts. 66, 68 y 70): 70/30; una parcial de 40 % y
  las demás de hasta 30 %; eximición con 6,0; rinde con 3,5; examen bajo 3,0
  deja la final en 3,9.

## Pendiente, en orden

1. Aviso de promedio general aproximado.
2. Pautas de Derecho por plan (5.3 y 6.0).
3. Mallas de Informática y Telecomunicaciones y de Ciencia de Datos con siglas.
4. Resto de mallas desde los PDF, limpiando la tabla a mano; siglas desde la
   oferta XLS si las trae.
