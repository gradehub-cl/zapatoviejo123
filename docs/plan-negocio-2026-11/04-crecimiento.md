# 04 · Adquisición y crecimiento en universidades

## 1. Canales disponibles y datos de contexto
- **WhatsApp** es la infraestructura de comunicación en Chile: 96 % de uso (Barómetro Digital de Chile 2025-2026, Nativos Digitales) y 89,7 % de usuarios de internet 16–64 (GWI Q2-2025 vía DataReportal). **Instagram** 85–86 %; **TikTok** 67,5 % (16–64) y alcance publicitario de 16,2 M adultos 18+ a fines de 2025. Fuentes: [Barómetro Digital 2025-26 (PDF)](https://www.nativosdigitales.org/wp-content/uploads/2026/05/Barometro-Digital-de-Chile-2025-2026_ResumenEjecutivo_vf.pdf); [DataReportal Digital 2026 Chile](https://datareportal.com/reports/digital-2026-chile); [Statista/DataReportal](https://www.statista.com/statistics/1369810/social-networks-penetration-chile/).
- Entre jóvenes (Encuesta UDP 2025): Instagram 74 % uso de alta frecuencia, WhatsApp 73 %, TikTok 49 % ([Comsulting, 11-nov-2025](https://comsulting.cl/observatorio/la-gen-z-chilena-entre-la-hiperconectividad-y-la-desconfianza-mediatica/)).
- Crecimiento actual de GradeHub ha sido **orgánico** (sin publicidad), concentrado en dos facultades: es la mejor evidencia de que el boca a boca funciona dentro de una generación.

## 2. Motor de crecimiento propuesto: "Generación por generación"
La unidad de crecimiento no es el usuario, es **la sección/generación de un ramo**. Si 5 personas de una sección usan GradeHub, la pauta queda validada por consenso y el valor para el sexto es inmediato.

### 2.1 Embajadores por carrera
- 1 embajador por carrera × universidad objetivo (meta: 40 en mar-2027, 80 en ago-2027).
- Perfil: delegado de generación, ayudante o "el que arma el Excel de notas".
- Incentivo: Plus gratis, $15.000–25.000 por semestre en gift card ligado a hitos (≥ 30 activos de su generación con pauta completa), certificado/recomendación, prioridad como tutor en el marketplace.
- Tareas (2 h/semana): cargar/validar pautas de los ramos de su generación en semana 1; publicar en el WhatsApp de generación; reportar errores.
- **Hacer cosas que no escalan:** los fundadores capacitan a cada embajador en persona en febrero.

### 2.2 Centros de alumnos (CA)
- Ofrecer a los CA una "página de su carrera" en GradeHub (pautas oficiales validadas, calendario de evaluaciones de la generación, directorio de tutores del CA). Ejemplo existente: el CAi UC ya mantiene un directorio de profes particulares — GradeHub puede ser su backend.
- A cambio: difusión por canales oficiales del CA (correo masivo, Instagram, WhatsApp de delegados).

### 2.3 Instagram / TikTok
- Formato ganador probable: **contenido útil y estacional**, no publicidad. Ej.: "Cuánto necesitas en el examen de Cálculo I si llevas un 3,8", "Los 5 ramos más reprobados de primer año", "Wrapped de tu semestre".
- Calendario: 3 posts/semana en semanas 1–3 y antes de cada I1/I2/examen; *reels* con estudiantes reales (embajadores).
- Paid: solo después de PMF y solo *retargeting* en semanas de pruebas (presupuesto máximo $100.000/semana de prueba en 2027).

### 2.4 WhatsApp de generación (el canal #1)
- **Tarjeta compartible**: "Necesito un 4,6 en el examen de MAT1610 para aprobar" con link al ramo → quien hace clic llega a la pauta ya cargada (*deep link*). Sin datos personales en la tarjeta salvo lo que el usuario elija.
- **Invitar a mi sección:** botón que genera mensaje prellenado para el grupo.

### 2.5 Períodos de pruebas/exámenes
- Semana previa a I1, I2 y exámenes = 3 "momentos de verdad" por semestre. Push + email + embajadores coordinados. Medir picos de ENA (North Star) en esas semanas.

### 2.6 SEO por ramo
- Páginas públicas por ramo y universidad (sin datos personales): "Pauta de evaluación IIC1103 UC 2027-1", "¿Cuánto necesito para aprobar MAT1620?", "Calculadora de nota examen FEN Microeconomía".
- Fuente de demanda: búsquedas de "calcular nota necesaria" y similares; varios sitios chilenos de calculadoras ya existen (competencia en SEO genérico), por lo que la ventaja es **la página específica por ramo** con pauta real, que nadie más tiene.
- Implementación: rutas estáticas generadas desde pautas de consenso públicas (solo ponderaciones y fechas, nunca notas individuales); `sitemap.xml`; Search Console ya configurado.

## 3. Efectos de red y loops virales
| Loop | Mecánica | Métrica |
|---|---|---|
| **Pautas de consenso** (efecto de red de datos) | Más usuarios por sección → pauta más correcta y temprana → mejor activación → más usuarios | % ramos con pauta de consenso en semana 2; tiempo hasta pauta validada |
| **"Necesito X" compartido** | Tarjeta en WhatsApp/IG → deep link → registro | Clics/compartido; K-factor |
| **Comparación anónima del curso** | "Estás sobre el 60 % de tu sección" solo si n ≥ 10 en la sección → incentivo a que más compañeros se unan | Secciones con n ≥ 10 |
| **Tutores** | Tutores invitan a sus alumnos (quieren que los encuentren); alumnos invitan a otros a clases grupales | Reservas por tutor |
| **Wrapped de fin de semestre** | Resumen visual compartible (dic y jul) → reactiva en vacaciones y trae nuevos en el semestre siguiente | Compartidos; reactivación en semana 1 |

**K-factor objetivo:** ≥ 0,3 en semanas 1–3 (cada 10 usuarios traen 3) — sumado al orgánico/embajadores.

## 4. Estrategia de beachhead y orden de expansión (Chile)
1. **Consolidar** UC + FEN U. de Chile (ya ~90 % de las cuentas): llegar a ≥ 30 % de los alumnos de 1.º–3.º año de Ingeniería UC y FEN.
2. **Adyacentes en Santiago** con ramos de alta carga evaluativa: Ingeniería U. de Chile (FCFM), USACH, UTFSM (Casa Central y San Joaquín), UAI, UAndes, UDP, UDD.
3. **Grandes privadas multi-sede** (UNAB, USS, U. Autónoma): volumen alto, competencia nativa menor, pero requieren distribución por sede.
4. **IP/CFT** (Duoc UC, INACAP): 613 mil alumnos de pregrado; validar si el dolor existe (menos evaluaciones ponderadas complejas).

## 5. Plan de crecimiento S1-2027 (resumen)
| Semana | Acción | Meta |
|---|---|---|
| Ene (inscripción) | Pautas top-30 ramos por carrera cargadas; reclutamiento de 40 embajadores | 1.000 ramos con pauta |
| Feb | Capacitación embajadores; contenido "cómo sobrevivir primer año" para mechones | 40 embajadores activos |
| Sem 1–3 | Activación en WhatsApp de generación; stands en semana mechona con CA | +4.000 registros |
| Sem 5–8 | Push I1; fake door Plus; 10 tutores estrella | ENA ≥ 3.000 |
| Sem 9–13 | Tarjetas "necesito X"; A/B precio | 5 % clic en Plus |
| Exámenes | Pico de uso; lanzamiento Plus real; tutorías | 150 pagadores, 100 clases |

## Fuentes (consultadas 26-nov-2026)
- Barómetro Digital de Chile 2025-2026: https://www.nativosdigitales.org/wp-content/uploads/2026/05/Barometro-Digital-de-Chile-2025-2026_ResumenEjecutivo_vf.pdf
- DataReportal, Digital 2026 Chile: https://datareportal.com/reports/digital-2026-chile
- Statista (GWI Q2-2025): https://www.statista.com/statistics/1369810/social-networks-penetration-chile/
- Comsulting / Encuesta UDP 2025: https://comsulting.cl/observatorio/la-gen-z-chilena-entre-la-hiperconectividad-y-la-desconfianza-mediatica/
- CAi UC, profes particulares: https://www.cai.cl/profes-particulares
