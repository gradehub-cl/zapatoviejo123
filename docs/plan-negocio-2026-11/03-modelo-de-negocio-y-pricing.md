# 03 · Modelos de monetización y propuesta de pricing

## 1. Precios de referencia (consultados 26-nov-2026)
| Producto | Precio | Notas | Fuente |
|---|---|---|---|
| Quizlet Plus (Chile, App Store) | **CLP 9.990/mes** | Plus Unlimited US$44,99/año (web US) | [subscriptionrank.com, 22-nov-2026](https://subscriptionrank.com/education-pricing/quizlet/); [quizlet.com/upgrade](https://quizlet.com/upgrade?source=footer) |
| Quizlet Plus (web EE.UU.) | US$35,99/año (≈US$3/mes); Unlimited US$44,99/año | 62 % de descuento anual vs mensual | quizlet.com/upgrade |
| Súper Duolingo (Chile) | ≈ CLP 6.700/mes (referencial) | Precio varía por cuenta (tests A/B) | [regiongap.com (oct-2026)](https://regiongap.com/app-price-index/chile/) |
| Notion Plus | US$10/licencia/mes; **gratis para estudiantes** (1 miembro) | El estándar del mercado es "gratis para estudiantes" en productividad | [notion.com/es/pricing](https://www.notion.com/es/pricing) |
| Studocu Premium | US$34,99/trimestre o US$79,99/año (iOS) | Precio local varía por país | [silentstudent.com, 9-jun-2026](https://silentstudent.com/vs/quizlet); [ayuda Studocu](https://help.studocu.com/hc/es/articles/360054174612--Cu%C3%A1nto-cuesta-la-suscripci%C3%B3n-Premium) |
| Chegg Study | US$15,95/mes; Study Pack US$19,95 | Sin plan anual publicado | [learnco.ai, 3-nov-2026](https://www.learnco.ai/blog/study-app-pricing-compared) |
| UniGo (UAI) "Learn" | Plan pagado vía Flow + afiliados | Precio exacto: ver auditoría de competencia | Auditoría interna nov-2026 |
| Clases particulares universitarias (Chile) | $15.000–25.000/hora; grupales $10.000–15.000 p/p | Directorio CAi UC | [cai.cl/profes-particulares](https://www.cai.cl/profes-particulares) |

**Benchmarks de conversión** (RevenueCat, *State of Subscription Apps 2026*, >115.000 apps): freemium convierte **2,1 %** descarga→pago a D35 vs **10,7 %** con *hard paywall*, pero a un año la retención de ambos modelos es casi idéntica; Educación tiene 6,5 % descarga→trial; en freemium **23 % de las conversiones ocurren después de la semana 6**. Renovación anual en Educación ~24 % (las metas de estudio son "de temporada"). Fuentes: [RevenueCat SOSA 2026](https://revenuecat.com/state-of-subscription-apps-2026) (abierto); [RevenueCat, renovaciones por categoría](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category) (extracto).

## 2. Opciones de monetización evaluadas
| Modelo | Encaje con GradeHub | Potencial | Riesgo | Veredicto |
|---|---|---|---|---|
| **Freemium + suscripción estudiantil (CLP)** | Alto: el "necesitas X" es gancho gratuito; valor extra en simulación, alertas, IA, historial | Bajo-medio en Chile (ticket bajo) | Competencia gratis (UniversidApp, Catedrix, NORA); estacionalidad | **Sí, como primer ingreso** (valida disposición a pagar) |
| **Marketplace de tutorías** (comisión o pago por lead) | Muy alto: GradeHub sabe *en qué ramo y con qué nota* está cada alumno, justo antes de la prueba | **El mayor** (ticket $15–25 mil/hora) | Calidad de tutores, desintermediación por WhatsApp, competencia (Tutorea) | **Sí, motor principal a validar** (ya existe piloto: tutores, avisos, 0 inscripciones a nov-2026) |
| **B2B2C con centros de alumnos (CA/CAi)** | Medio: CAs ya listan tutores; podrían "patrocinar" GradeHub Plus para su generación | Bajo en $, alto en distribución | CAs rotan cada año; poco presupuesto | **Sí como canal**, no como ingreso |
| **B2B2C con universidades** (alerta temprana de reprobación, analítica agregada) | Medio-alto a futuro | Alto (contratos institucionales) | Ciclos de venta largos; universidad puede preferir construirlo; privacidad | **Explorar desde 2028** con datos agregados y consentimiento |
| **Publicidad** | Bajo: rompe confianza en una app de notas | Bajo con < 50 mil MAU | Privacidad, Ley 21.719 | **No** (salvo patrocinio no segmentado por notas, ej. ferias laborales) |
| **Afiliados** (preu de intercambio, cursos de idiomas, libros, laptops, seguros de estudiante) | Medio | Bajo-medio | Relevancia | **Sí, oportunista**, sin datos de notas |
| **API/MCP para agentes** (pago por uso) | Diferenciador técnico | Bajo hoy | Nicho | Incluir en Plus; no cobrar aparte aún |

## 3. Propuesta de pricing concreta (para lanzar en marzo 2027)

### 3.1 Plan Gratis (para siempre)
- Promedios por ramo y semestre (escala 1,0–7,0), "necesitas X para aprobar", simulador básico (1 escenario), pautas de consenso (lectura y voto), agenda `.ics`, historial, PWA + iOS/Android, sin anuncios.
- Límite deliberado: **no** limitar la matemática básica (es el gancho y lo que la competencia da gratis).

### 3.2 GradeHub Plus (estudiante)
| Opción | Precio (IVA incluido) | Por qué |
|---|---|---|
| **Pase Semestre** (recomendado) | **$7.990** pago único, cubre el semestre en curso hasta exámenes | Calza con estacionalidad; sin renovación automática ⇒ menos fricción y menos reclamos por retracto/cobros no deseados |
| Anual | **$12.990** (2 semestres) | Ahorra 19 % vs dos pases |
| Mensual | $2.490 | Para probar; peor valor a propósito |
| Precio de lanzamiento / embajadores | 50 % primer semestre | Early adopters y referidos |

**Incluye:** simulador multi-escenario y "qué pasa si", alertas push (próxima evaluación, "te falta X"), comparación anónima con el curso (umbral mínimo de n), estadísticas avanzadas e historial multi-semestre, widgets iOS, importación de programa de curso (PDF→pauta con IA, con revisión), conector MCP para agentes de IA con más cuota, exportación, tema y personalización.

**Posicionamiento:** Plus anual ($12.990) ≈ 1,3 meses de Quizlet Plus en Chile ($9.990/mes) y < 1 hora de clase particular. Mensaje: *"Menos que una clase particular, todo el semestre."*

### 3.3 Tutorías (marketplace)
- **Tutor:** perfil gratis; GradeHub cobra **15 % por clase reservada y pagada en la app** (o $2.000 fijos por clase ≤ $15.000). Alternativa de arranque: *pago por lead* ($1.500 por contacto verificado) mientras no haya pagos in-app.
- **Estudiante:** Plus da 1 clase con 20 % de descuento por semestre (puente entre los dos motores).
- Diferenciador: matching por **ramo exacto + sección + profesor + nota del tutor en ese ramo** (verificada con consentimiento) y en la ventana justa (antes de I1/I2/examen).
- Pagos: Flow o Mercado Pago (2,89 %–3,19 % + IVA; ver 07). Los tutores emiten su boleta de honorarios; GradeHub factura/boletea solo su comisión (validar con contador).

### 3.4 Centros de alumnos y universidades
- **"GradeHub para tu generación":** el CA compra Pases Semestre en bloque a $3.990 c/u (mín. 50) o recibe gratis 100 pases a cambio de difusión oficial + pautas validadas por ayudantes.
- **Universidades (2028+):** licencia anual por facultad para "alerta temprana" con datos **agregados y anónimos**, sujeta a convenio de datos; precio a descubrir (anclar en costo de un ayudante/tutor por cohorte).

### 3.5 Qué cobrar en las tiendas vs web
- iOS/Android: compra in-app obligatoria para desbloquear funciones digitales dentro de la app (comisión 15 % en programas para pequeños desarrolladores, ver 05).
- Web (gradehub.cl): Flow/Mercado Pago, ~3,4–3,8 % efectivo. Mantener **paridad de precio** al principio por simplicidad.

## 4. Experimentos de precio (primer semestre 2027)
1. **Fake door** en semana 6 (antes de I1): botón "Activar Plus — $7.990/semestre" → medir clics/MAU (meta ≥ 5 %).
2. **Van Westendorp** (4 preguntas de sensibilidad al precio) a 200 usuarios activos en abril.
3. A/B de anclaje: Pase Semestre $7.990 vs $5.990 en dos facultades equivalentes.
4. Tutorías: 10 tutores "estrella" en 5 ramos masivos (Cálculo I/II, Álgebra Lineal, Física, Intro Programación, Microeconomía); meta 100 clases reservadas en S1-2027.

**Criterio de éxito para decidir el motor principal (julio 2027):** el motor que logre más **margen bruto por usuario activo** en S1-2027 recibe el 70 % del tiempo de producto en S2-2027.

## Fuentes (consultadas 26-nov-2026)
- RevenueCat, State of Subscription Apps 2026: https://revenuecat.com/state-of-subscription-apps-2026
- Quizlet: https://quizlet.com/upgrade?source=footer ; precios Chile: https://subscriptionrank.com/education-pricing/quizlet/
- Notion: https://www.notion.com/es/pricing
- Studocu/Quizlet/Chegg comparativa: https://silentstudent.com/vs/quizlet ; https://www.learnco.ai/blog/study-app-pricing-compared
- Duolingo Chile (referencial): https://regiongap.com/app-price-index/chile/
- CAi UC profes particulares: https://www.cai.cl/profes-particulares ; TutoresChile: https://tutoreschile.cl/cuanto-cobra-un-profesor-particular/ ; Tutorea: https://tutorea.cl/
