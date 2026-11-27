# 01 · Fundamentos de startups aplicados a GradeHub

> Informe de negocio GradeHub SpA · preparado el 26-nov-2026 · fuentes consultadas entre el 26-nov-2026 (fechas de publicación indicadas en cada cita).

## 1. Qué dice Y Combinator y por qué importa aquí

### 1.1 Startup School (YC)
- Curso online **gratuito** de YC sobre cómo empezar una startup; ~7 semanas a 1–2 h/semana; incluye herramienta de *weekly update* para registrar crecimiento y la plataforma de *co-founder matching*. Fuente: [startupschool.org](https://www.startupschool.org/) (abierto 26-nov-2026).
- **Aplicación a GradeHub:** inscribir a ambos fundadores y usar el *weekly update* como disciplina: cada lunes, 1 métrica norte + 1 aprendizaje + 1 objetivo. Esto es exactamente el material que piden Platanus, Start-Up Chile y YC al postular.

### 1.2 "Do Things That Don't Scale" (Paul Graham, jul-2013)
- Idea central: las startups no despegan solas; "despegan porque los fundadores las hacen despegar", reclutando usuarios a mano y dándoles una experiencia que no escala. Fuente: [paulgraham.com/ds.html](https://www.paulgraham.com/ds.html) (ensayo de julio 2013).
- **Para GradeHub, "no escalar" significa:**
  1. Cargar a mano las pautas de los 30 ramos más masivos de cada carrera objetivo antes de cada semestre (la pauta pre-cargada es el "momento ajá").
  2. Ir sala por sala / WhatsApp por WhatsApp en la semana de inscripción de ramos y en la semana previa a la I1.
  3. Responder cada mensaje de soporte en < 1 h durante semanas de pruebas.
  4. Entrevistar 5 usuarios/semana (15 min) y llevar un registro.

### 1.3 "Default Alive or Default Dead?" (Paul Graham, oct-2015)
- Pregunta: *con los gastos constantes y el crecimiento de ingresos de los últimos meses, ¿llegas a rentabilidad con la plata que te queda?* Graham advierte que la mitad de los fundadores no sabe la respuesta, y que contratar demasiado rápido es "por lejos" el mayor asesino de startups que levantan capital. Fuente: [paulgraham.com/aord.html](https://www.paulgraham.com/aord.html) (abierto 26-nov-2026).
- **Diagnóstico GradeHub (nov-2026):** gasto mensual muy bajo (Supabase en plan Free, cuentas Apple US$99/año y Google US$25 una vez, dominio, sin sueldos) ⇒ hoy es *default alive* por costos, no por ingresos. El riesgo real no es quedarse sin caja, sino **quedarse sin tiempo de los fundadores** (universidad) y sin aprendizaje de monetización. Ver [07-unit-economics.md](07-unit-economics.md).
- Regla propuesta: mantener *burn* < $300.000 CLP/mes hasta validar monetización (≥ 1 fuente de ingreso con 100 pagadores recurrentes).

## 2. Product-Market Fit (PMF)

### 2.1 Test de Sean Ellis / motor de Superhuman
- Pregunta: *"¿Cómo te sentirías si ya no pudieras usar GradeHub?"* → Muy decepcionado / Algo decepcionado / No decepcionado. Umbral: **≥ 40 % "muy decepcionado"**; Ellis lo calibró comparando ~100 startups. Rahul Vohra (Superhuman) lo convirtió en un "motor": segmentar a los "muy decepcionados", entender qué valoran, y construir para convertir a los "algo decepcionados". Resultados direccionales desde ~40 respuestas. Fuentes: [First Round Review, 12-nov-2018](https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/); [blog Superhuman](https://blog.superhuman.com/how-superhuman-built-an-engine-to-find-product-market-fit).
- RevenueCat/otros recomiendan encuestar **solo a usuarios activos** (≥ 2 usos recientes), no a registros.
- **Implementación GradeHub (diciembre 2026 y cada semestre):**
  - Encuesta in-app a usuarios con ≥ 2 sesiones en los últimos 14 días y ≥ 1 ramo con notas.
  - 4 preguntas: (1) Ellis; (2) ¿qué tipo de persona se beneficia más?; (3) ¿beneficio principal?; (4) ¿qué mejorarías?
  - Segmentar por universidad/carrera/año: es probable que el PMF sea fuerte en Ingeniería/Comercial (ramos con muchas evaluaciones ponderadas) y débil en carreras con pocas notas.
  - Meta: ≥ 40 % en el segmento núcleo antes de invertir en adquisición pagada.

### 2.2 Retención y cohortes (la prueba dura de PMF)
- Benchmarks de **retención de usuarios a 6 meses** (Lenny Rachitsky + Casey Winters, encuesta a 20 expertos, jun-2020): *consumer social* ~25 % bueno / ~45 % excelente; *consumer SaaS* (suscriptores pagados) ~40 % bueno / ~70 % excelente. Fuente: [Lenny's Newsletter, 9-jun-2020](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29).
- **DAU/MAU** (a16z para apps sociales): 25 % OK, 40 % bueno, 50 %+ excelente. Fuente: [a16z, 3-mar-2023](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app) (extracto de búsqueda).
- **Datos internos GradeHub (base de datos, 5-nov-2026):** ~1.010 cuentas; WAU ≈ 737; MAU ≈ 890; DAU de día hábil ≈ 420 ⇒ **DAU/MAU ≈ 47 %** y **WAU/MAU ≈ 83 %**; la cohorte de agosto tenía 75 % activo en los últimos 7 días. Son números de nivel "bueno-excelente", pero (a) medidos en plena temporada de pruebas, (b) con base pequeña y concentrada (UC + FEN U. de Chile ≈ 90 % de cuentas).
- **Particularidad de GradeHub — retención estacional:** el uso natural es semestral (mar–jul, ago–dic). Medir retención por **semestre académico**, no por mes calendario:
  - *Retención de semestre:* % de usuarios activos en S2-2026 que vuelven a cargar notas en S1-2027 (dentro de las primeras 4 semanas de clases).
  - *Retención intra-semestre:* % de activos de la semana 2 que siguen activos en la semana de exámenes.
  - Cohortes por **semestre de registro** × universidad × carrera.
  - La caída de diciembre–febrero **no** es churn; reportar "usuarios retenidos al reinicio".

### 2.3 North Star Metric (propuesta)
- **"Estudiantes semanales con notas al día" (ENA):** usuarios únicos que en la semana registraron o consultaron una nota/“necesitas X” en al menos un ramo con pauta completa.
  - Captura el valor central (saber dónde estás y qué necesitas), no vanidad (descargas).
  - Se puede romper en: activación (ramo con pauta completa en < 3 min), frecuencia (sesiones/semana en semana de pruebas), profundidad (ramos por usuario), red (pautas confirmadas por consenso).
- Métricas de apoyo: % de ramos con pauta de consenso, tiempo a primera "necesitas X", K-factor (invitados por usuario), Ellis score, retención semestre-a-semestre, pagadores (cuando exista Plus).

## 3. Qué significa esto en la práctica (resumen accionable)
| Principio | Acción GradeHub | Cuándo |
|---|---|---|
| Hacer cosas que no escalan | Pautas pre-cargadas a mano para top-30 ramos por carrera objetivo; embajadores sala por sala | Ene–mar 2027 |
| Default alive | Burn < $300 mil/mes; sin sueldos hasta validar ingresos | Siempre |
| PMF medible | Encuesta Ellis cada semestre a activos; meta ≥ 40 % en núcleo | Dic-2026, may-2027, oct-2027 |
| Retención | Dashboard de cohortes por semestre en PostHog/Supabase | Antes de mar-2027 |
| North Star | ENA semanal + reporte lunes (Startup School weekly update) | Desde ya |

## Fuentes (consultadas 26-nov-2026)
- YC Startup School: https://www.startupschool.org/
- P. Graham, *Do Things That Don't Scale* (jul-2013): https://www.paulgraham.com/ds.html
- P. Graham, *Default Alive or Default Dead?* (oct-2015): https://www.paulgraham.com/aord.html
- First Round Review, *How Superhuman Built an Engine to Find PMF* (12-nov-2018): https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/
- Lenny Rachitsky, *What is good retention* (9-jun-2020): https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29
- a16z, *How to benchmark your social app* (3-mar-2023, extracto): https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app
- Datos internos de uso de GradeHub (base Supabase, corte 5-nov-2026).
