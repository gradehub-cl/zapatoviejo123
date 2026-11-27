# GradeHub SpA — Informe de negocio
## 00 · Resumen ejecutivo
*Preparado el 26-nov-2026. Fuentes abiertas y fechadas en cada archivo. Sin datos personales de los fundadores.*

### Qué es GradeHub
App web/PWA + iOS/Android para universitarios chilenos: promedios en escala 1,0–7,0, "necesitas X para aprobar", simulador, pautas de evaluación confirmadas por estudiantes ("consenso"), agenda `.ics`, estadísticas y un conector MCP para agentes de IA. Hoy es gratis y corre sobre Supabase. Equipo: un fundador estudiante de primer año y un cofundador técnico.

### Dónde está (datos internos, 5-nov-2026)
~1.010 cuentas, **MAU ≈ 890, WAU ≈ 737, DAU hábil ≈ 420 (DAU/MAU ≈ 47 %)**, crecimiento orgánico sin publicidad, cohorte de agosto con 75 % de actividad semanal. Fortaleza: retención y uso intensivo en temporada de pruebas. Debilidades: ≈ 90 % de cuentas en dos facultades (UC y FEN U. de Chile), estacionalidad fuerte y monetización no validada.

### Mercado (archivo 02)
- Chile 2026: **1.497.548** matrículas de educación superior; **1.372.167** en pregrado, de las cuales **759.045** son universitarias (SIES/Mineduc, 30-jul-2026).
- TAM Chile (todo el pregrado × $12.990/año) ≈ **$17.800 M CLP (~US$17 M)**; SAM universitario presencial ≈ 714 mil estudiantes; beachhead de 8 universidades de Santiago ≈ 238 mil; **SOM a 24 meses: 25.000 MAU en semestre pico y ~1.000 pagadores**.
- LatAm: México 5,76 M, Colombia 2,72 M, Perú ~1,69 M estudiantes; escalas 0–10, 0–5 y 0–20 (el motor se parametriza; el reto es contenido y distribución).
- **Conclusión honesta:** la suscripción en Chile por sí sola da un negocio pequeño; para escala de capital de riesgo se necesita **LatAm + un segundo motor de mayor ticket (tutorías / B2B2C)**.

### Modelo y precio (archivo 03)
- **Gratis para siempre** en lo esencial (la matemática de notas es el gancho y la competencia la da gratis).
- **GradeHub Plus:** **Pase Semestre $7.990** (sin renovación automática), anual $12.990, mensual $2.490. Referencias: Quizlet Plus CLP 9.990/mes en Chile; Notion gratis para estudiantes; RevenueCat 2026: freemium convierte ~2,1 % descarga→pago.
- **Tutorías:** comisión 15 % por clase ($15–25 mil/hora en el mercado) ⇒ ~$1.600 netos por clase; 4 clases valen más que un Pase Semestre. Es el motor con más potencial.

### Unit economics (archivo 07)
ARPPU neto ≈ **$5.900/semestre**; margen de contribución ~89 %; costo IA ≈ $2 por consulta; infra recomendada ~US$35/mes (Supabase Pro por backups). LTV $8.800–13.200 ⇒ **CAC máximo sostenible ≈ $300 por registro**: crecer con embajadores, WhatsApp de generación, SEO por ramo y loops, no con publicidad. Hoy la empresa es *default alive* (casi sin gasto); el recurso escaso es **el tiempo de los fundadores**.

### Legal: tres novedades que cambian prioridades (archivo 05)
1. La **Ley 21.719 de datos personales se postergó al 15-oct-2027** (Ley 21.855, publicada 23-nov-2026). Hasta entonces rige la Ley 19.628 (consentimiento expreso, informado y por escrito).
2. La **nueva API Policy de Instructure (Canvas), vigente desde el 25-nov-2026**, prohíbe el acceso a sus APIs sin "Integration Tier Partnership" o permiso expreso, y prohíbe conexiones vía servidores MCP no aprobados. No construir sobre Canvas sin acuerdo institucional (y es un riesgo para competidores que dependen de Canvas).
3. **SII:** la verificación de actividades de la SpA tiene corrección pendiente **antes del 01-12-2026**. Además: IVA 19 % a servicios desde 2023, boleta electrónica, retracto de 10 días (Ley 21.398), menores de 18 relativamente incapaces para contratar ⇒ pagos solo ≥ 18.

### Financiamiento (archivo 06)
- **CORFO Semilla Inicia:** hasta $15 M (75 %), exige **< 18 meses de inicio y sin ventas** ⇒ calza hoy; convocatoria nacional informada para el 17-nov al 17-dic-2026 (verificar en corfo.gob.cl). **No vender antes de postular.**
- Start-Up Chile Build ($15 M, 90 %) cerró el 24-nov-2026 y exige full-time; apuntar a **Ignite ($30 M)** en 2027 con datos de S1-2027.
- Equity: Platanus US$200 mil por 7 %; YC US$500 mil (US$125 mil por 7 % + US$375 mil SAFE MFN). Solo tras validar ingresos y con al menos un fundador full-time.

### Plan 2027 (archivo 09)
- **T1 (ene–mar):** Supabase Pro + seguridad + privacidad v2; pautas top-30 ramos × carrera en 8 universidades; 40 embajadores. Meta MAU mar ≥ 4.000.
- **T2 (abr–jun):** lanzar Plus y 10 tutores estrella; Ellis ≥ 40 % en el núcleo. Meta 150 pagadores, 100 clases, MAU pico ≥ 8.000.
- **T3 (jul–sep):** **decidir motor principal en julio**; 80 embajadores; retención al reinicio ≥ 55 %.
- **T4 (oct–dic):** cumplimiento Ley 21.719 antes del 15-oct; escalas LatAm; MAU pico ≥ 12.000.
- **2028:** piloto Perú (S1-2028), pagos in-app de tutorías, piloto B2B2C; SOM 25.000 MAU.
- Presupuesto 2027 ≈ **$12,4 M CLP** (calza con Semilla Inicia); versión mínima sin fondos ≈ $3,5 M.

### North Star
**"Estudiantes semanales con notas al día"** (usuarios que en la semana registraron o consultaron una nota/"necesitas X" en un ramo con pauta completa). Retención medida por **semestre académico**, no por mes.

### Las 10 decisiones de ahora (detalle en 09 §9)
1. Resolver la verificación de actividades del SII antes del 01-12-2026 y contratar contador.
2. Postular a Semilla Inicia y no registrar ventas antes de la ventana de elegibilidad.
3. Validar en S1-2027 Plus **y** tutorías; elegir motor en julio 2027 por margen por usuario activo.
4. Pacto de accionistas con vesting 4 años / cliff 1 año + cesión de PI, antes de cualquier fondo.
5. Fijar dedicación y roles 2027 de cada fundador (condiciona Start-Up Chile/Platanus/YC).
6. Beachhead: UC + FEN + 4–6 universidades adyacentes; ninguna facultad > 50 % de MAU.
7. No depender de Canvas/LMS; ingreso manual excelente y acuerdos institucionales a futuro.
8. Seguridad y privacidad antes de marzo; hoja de ruta Ley 21.719 al 15-oct-2027.
9. Política de edad: gratis desde 16; pagos/tutorías presenciales ≥ 18.
10. Proteger activos: repo privado, marca INAPI, Play como organización, Small Business Program de Apple.

### Índice
| Archivo | Contenido |
|---|---|
| 01-fundamentos-startup.md | YC Startup School, "Do things that don't scale", default alive, PMF (Ellis/Superhuman), retención por cohortes, North Star |
| 02-mercado.md | Matrícula SIES 2025-2026 por institución, calendario 2027 y estacionalidad, LatAm y escalas, TAM/SAM/SOM, competencia |
| 03-modelo-de-negocio-y-pricing.md | Benchmarks de precios, modelos evaluados, pricing propuesto, experimentos |
| 04-crecimiento.md | Embajadores, CA, IG/TikTok, WhatsApp, SEO por ramo, loops y efectos de red, plan S1-2027 |
| 05-legal-y-regulatorio.md | SpA, SII/IVA, Leyes 19.628/21.719/21.855, menores, consumidor, PI, Canvas, tiendas |
| 06-financiamiento.md | CORFO, Start-Up Chile, incubadoras UC, Platanus, YC, ángeles y VC |
| 07-unit-economics.md | Costos, ARPPU, LTV, CAC, payback, escenarios (modelo en modelo.py) |
| 08-riesgos-y-oportunidades.md | Oportunidades, matriz de riesgo P×I con mitigaciones, alertas tempranas |
| 09-plan-y-roadmap.md | Propuesta de valor, segmentos, Lean Canvas, roadmap trimestral 2027–2028, presupuesto, equipo, 10 decisiones |
