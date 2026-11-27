# 07 · Unit economics (modelo simple)

> Modelo reproducible en `/workspace/work/negocio/modelo.py`. Tipo de cambio: $1.044 CLP/US$ (dólar observado 26-nov-2026, [Banco Central](https://si3.bcentral.cl/Bdemovil/BDE/Series/MOV_ID_TC1)). Todas las cifras son **supuestos** salvo las tarifas citadas.

## 1. Costos de infraestructura (tarifas publicadas)
| Componente | Tarifa | Fuente |
|---|---|---|
| Supabase Free | US$0; 50.000 MAU; 500 MB DB; 5 GB egress; **sin backups automáticos**; se pausa tras 1 semana de inactividad; máx. 2 proyectos | [supabase.com/pricing](https://supabase.com/pricing) (abierta 26-nov-2026) |
| Supabase Pro | Desde **US$25/mes** (incluye US$10 de cómputo = 1 Micro); 100.000 MAU incluidos y luego US$0,00325/MAU; 8 GB disco; 250 GB egress; **backups diarios 7 días**; proyectos adicionales desde US$10/mes | ídem |
| IA (Gemini 3.5 Flash-Lite, recomendado para nuevos proyectos) | US$0,30 / 1 M tokens entrada; US$2,50 / 1 M salida | [vantacalc (lista de precios Google)](https://www.vantacalc.com/technology/llm-pricing/google/) (secundaria). Gemini 2.5 Flash-Lite (US$0,10/0,40) ya no está disponible para cuentas nuevas desde sep-2026 ([Google AI Studio](https://aistudio.google.com/docs/models/gemini-2.5-flash-lite)) |
| Apple Developer Program | US$99/año | [developer.apple.com](https://developer.apple.com/programs/enroll) |
| Google Play | US$25 una vez | [Play Console Help](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) |
| Pasarela web (Flow) | 2,89 % + IVA (abono 3.er día hábil) ≈ **3,44 %** efectivo; reembolso $202 + IVA | [web.flow.cl/es-cl/tarifas](https://web.flow.cl/es-cl/tarifas) (extracto) |
| Mercado Pago (suscripciones) | 3,19 % + IVA al instante o 2,89 % + IVA a 10 días | [catalizadora.ai](https://catalizadora.ai/blog/comparativa-stripe-vs-mercadopago-para-saas-latam) (secundaria) |
| Comisión tiendas | 15 % (Small Business Program / suscripciones Google Play) | ver 05 §9 |
| Hosting web/CDN (Cloudflare), analítica (PostHog free) | ~US$0 al volumen actual | planes gratuitos en uso |

**Costo IA por consulta** (3.000 tokens entrada + 500 salida): US$0,00215 ≈ **$2,2 CLP**. Un usuario Plus con 60 consultas/mes ≈ $135 CLP/mes; un usuario gratis con 8 consultas/mes ≈ $18 CLP/mes. ⇒ La IA es barata por usuario, **pero** un plan gratis con IA ilimitada para decenas de miles de usuarios no lo es: limitar IA en el plan gratis.

**Infra fija recomendada desde marzo 2027:** Supabase Pro + un segundo proyecto (staging) ≈ US$35/mes ≈ $36.500 CLP/mes (~$440.000/año). El paso a Pro es casi obligatorio por **backups** (las notas de los usuarios son el activo) y para evitar pausas.

## 2. Ingreso neto por pagador (precios propuestos en 03)
| Plan | Precio bruto (IVA incl.) | Neto web (− IVA − Flow) | Neto tienda (− IVA − 15 %)* |
|---|---|---|---|
| Mensual | $2.490 | $2.007 | $1.779 |
| Pase Semestre | $7.990 | $6.439 | $5.707 |
| Anual | $12.990 | $10.469 | $9.279 |
\* Supuesto: la tienda descuenta impuestos sobre el precio al consumidor; validar con los reportes de App Store Connect / Play Console.

**ARPPU neto por semestre** (mix 60 % Pase, 25 % anual, 15 % mensual × 3,5 meses; 60 % web / 40 % tiendas) ≈ **$5.940 CLP** (~US$5,7). Margen de contribución después de IA ≈ **$5.270 CLP/semestre** (~89 %).

## 3. LTV, CAC y payback
| Retención semestre-a-semestre de pagadores | LTV (margen) |
|---|---|
| 40 % | $8.800 CLP (~US$8,4) |
| 50 % | $10.500 CLP (~US$10,1) |
| 60 % | $13.200 CLP (~US$12,6) |

Referencia: renovación anual en apps de Educación ~24 % (RevenueCat), por eso el modelo usa semestres y una retención optimista solo si el producto es "de todos los semestres de la carrera".

| CAC por registro | Conversión registro→pago | CAC por pagador | Payback (semestres) |
|---|---|---|---|
| $300 | 3 % | $10.000 | 1,9 |
| $300 | 5 % | $6.000 | 1,1 |
| $800 | 3 % | $26.700 | 5,1 |
| $800 | 5 % | $16.000 | 3,0 |
| $1.500 | 3 % | $50.000 | 9,5 |

**Conclusión:** con suscripción sola, GradeHub **solo puede pagar adquisición de ~$300 por registro**. Eso significa crecimiento **orgánico + embajadores + loops** (CAC efectivo bajo), no publicidad pagada. Un embajador que activa 60 usuarios por $20.000 al semestre ⇒ CAC ≈ $333 por registro: justo en el límite. La publicidad en redes debe reservarse para *retargeting* y semanas de exámenes.

## 4. Tutorías: el motor de mayor margen
- Precio de mercado de una clase: $15.000–25.000 ([CAi UC](https://www.cai.cl/profes-particulares)).
- Comisión 15 % de $17.500 = **$2.625** por clase; neto de pasarela (~3,4 % sobre el total) y de IVA sobre la comisión ≈ **$1.600–1.700 por clase**.
- Un estudiante que toma 4 clases en un semestre deja ≈ $6.600 — **más que un Pase Semestre**. Con CAC de tutor bajo (tutores se registran solos) el motor escala mejor, siempre que se resuelva la desintermediación (pago in-app con valor: agenda, garantía de reembolso, reseñas, verificación de nota).

## 5. Escenarios a 24 meses (fin 2028; supuestos)
| Escenario | MAU semestre pico | Conv. a pago | Pagadores | Ingreso neto suscripción/año | Infra + IA/año |
|---|---|---|---|---|---|
| Conservador | 6.000 | 2,5 % | 150 | ~$1,3 M CLP | ~$1,4 M CLP |
| Base | 15.000 | 4 % | 600 | ~$5,3 M CLP | ~$3,1 M CLP |
| Optimista | 35.000 | 6 % | 2.100 | ~$18,7 M CLP | ~$7,7 M CLP |
(Sumar tutorías: en el escenario base, 1.500 clases/año ≈ $2,5 M CLP neto adicional.)

## 6. Default alive / default dead
- **Hoy:** gasto ≈ US$10–20/mes efectivo (cuentas de tiendas prorrateadas, dominio). Sin sueldos. ⇒ *Default alive* por diseño.
- **2027 con Semilla Inicia** ($20 M de proyecto en 10 meses): burn ≈ $2 M/mes financiado 75 % por CORFO. Al terminar el proyecto, volver a burn < $300 mil/mes salvo que existan ingresos.
- **Con sueldos (escenario full-time 2 fundadores a $800 mil c/u):** burn ≈ $2 M/mes ⇒ requiere equity o ≥ 2.500 pagadores activos. Por eso full-time **solo** después de validar un motor de ingresos o levantar capital.

## 7. Métricas a instrumentar desde ya
CAC por canal (código de embajador/UTM), conversión a pago por cohorte de semestre, ARPPU neto por canal (web vs tienda), costo IA por usuario, % de ingresos por tutorías, payback, margen de contribución por MAU.

## Fuentes (consultadas 26-nov-2026)
Supabase pricing (abierta); Flow tarifas; Mercado Pago (secundaria); precios Gemini (secundaria + Google AI Studio); Apple/Google developer; RevenueCat SOSA 2026; CAi UC. URLs en tabla §1.
