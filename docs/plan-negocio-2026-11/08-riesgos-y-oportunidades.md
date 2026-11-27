# 08 · Oportunidades y riesgos

## 1. Oportunidades
| # | Oportunidad | Por qué ahora | Evidencia |
|---|---|---|---|
| O1 | **Ser la "capa de notas" neutral y multi-universidad** | Los competidores son mono-universidad (NORA, Catedrix, UniGo, Malla Pro) o centrados en estudio con IA (UniversidApp) | Auditoría de competencia nov-2026 |
| O2 | **Marketplace de tutorías con contexto** (ramo, sección, nota, fecha de prueba) | El mercado de clases particulares es informal y está disperso en directorios de CA y WhatsApp | [CAi UC](https://www.cai.cl/profes-particulares); [Tutorea](https://tutorea.cl/) |
| O3 | **Política de API de Canvas** endurece el acceso de terceros | Competidores basados en Canvas quedan expuestos; GradeHub no depende de Canvas | [Instructure API Policy, vigente 25-nov-2026](https://www.instructure.com/policies/canvas-api-policy) |
| O4 | **Postergación de la Ley 21.719 a oct-2027** | Da ~10 meses para llegar con cumplimiento ejemplar como argumento de confianza (y ante universidades) | [BCN Ley 21.855](https://www.bcn.cl/leychile/navegar?idNorma=1230520) |
| O5 | **Agentes de IA (MCP)** | GradeHub ya tiene conector MCP propio: los estudiantes que usan asistentes de IA pueden consultar/actualizar sus notas por chat; diferenciador real | Producto actual |
| O6 | **Mayor permanencia en educación superior** | Crecimiento universitario 2026 viene de retención/continuidad ⇒ más semestres por usuario | [Subsecretaría Ed. Superior, 30-jul-2026](https://educacionsuperior.mineduc.cl/2026/07/30/matricula-en-educacion-superior-crece-por-quinto-ano-consecutivo) |
| O7 | **LatAm hispanohablante** (MX 5,8 M; CO 2,7 M; PE 1,7 M) con escalas distintas pero el mismo dolor | El motor de cálculo se parametriza; el contenido se crowdsourcea | Ver 02 |
| O8 | **B2B2C de alerta temprana** con universidades (agregado, anónimo) | Retención estudiantil es prioridad institucional | Hipótesis 2028 |

## 2. Matriz de riesgo
Probabilidad (P) e Impacto (I) de 1 a 5; Severidad = P × I.

| # | Riesgo | P | I | Sev. | Mitigación | Dueño / disparador |
|---|---|---|---|---|---|---|
| R1 | **Tiempo de los fundadores** (universidad, exámenes coinciden con picos de uso) | 5 | 4 | **20** | Calendario de releases fuera de semanas de exámenes; automatizar soporte; embajadores; reglas de "congelamiento" de features en exámenes; decidir explícitamente quién lidera qué (ver 09 §8) | Ambos; revisión cada fin de semestre |
| R2 | **Competencia gratuita** (UniversidApp con IA, Catedrix, NORA, planillas Excel) | 5 | 3 | **15** | No cobrar por la matemática básica; diferenciarse en pautas de consenso multi-universidad, tutorías, MCP; velocidad de ejecución | Producto; trimestral |
| R3 | **Monetización no valida** (estudiantes no pagan) | 4 | 4 | **16** | Experimentos de precio S1-2027; segundo motor (tutorías); costos mínimos; criterios de decisión en jul-2027 | CEO; jul-2027 |
| R4 | **Universidad o LMS lanza algo similar** (Canvas/Ucampus agregan "necesitas X"; universidad crea app oficial) | 3 | 4 | 12 | Ser multi-universidad y social (consenso, tutores); ofrecer alianza/LTI en vez de competir; construir marca estudiantil | CEO; monitoreo semestral de roadmap de Canvas/Ucampus |
| R5 | **Estacionalidad** (dic–feb, jul casi sin uso; ingresos concentrados) | 5 | 2 | 10 | Pase Semestre; "Wrapped", malla/planificación en vacaciones; Temporada de Verano; LatAm con calendarios desfasados (México ago–dic / ene–may) | Producto |
| R6 | **Privacidad / brecha de datos** (notas son datos académicos privados) | 2 | 5 | 10 | RLS revisada, backups (Supabase Pro), principio de mínimo acceso, logs, plan de respuesta a brechas, umbral n ≥ 10 en comparaciones, cumplimiento 21.719 antes de oct-2027 | CTO; auditoría antes de mar-2027 |
| R7 | **Dependencia de datos** (pautas incorrectas o tardías; usuarios sin ingresar notas) | 4 | 3 | 12 | Consenso + embajadores + ayudantes; importación desde programa (PDF→IA con revisión humana); señal de "pauta verificada" | Producto/comunidad |
| R8 | **Acceso a datos oficiales bloqueado** (Canvas API Policy, TI universitaria restrictiva) | 4 | 2 | 8 | No construir sobre scraping/tokens de estudiantes; LTI o acuerdos institucionales; ingreso manual excelente | CEO |
| R9 | **Concentración** (≈ 90 % de cuentas en 2 facultades) | 4 | 3 | 12 | Plan de beachhead ampliado (02/04); meta: ninguna facultad > 35 % de MAU a dic-2027 | Crecimiento |
| R10 | **Plataformas** (rechazo App Store, cambios de comisión, cuenta Play personal vs organización) | 2 | 3 | 6 | Cumplir guías (reporte de contenido, cuenta demo), PWA como respaldo, cuenta de organización con D-U-N-S | CTO |
| R11 | **Legal/tributario** (verificación de actividades SII, IVA mal aplicado, retracto) | 3 | 3 | 9 | Contador online desde dic-2026; boletas electrónicas; términos con retracto claro | CEO; inmediato |
| R12 | **Conflicto entre socios / salida de un fundador** | 2 | 5 | 10 | Pacto de accionistas con vesting 4 años / cliff 1 año, cesión de PI, roles escritos | Ambos; antes de cualquier fondo |
| R13 | **Calidad/seguridad en tutorías** (tutores no idóneos, menores de edad, integridad académica) | 3 | 4 | 12 | Verificación de identidad y nota; reseñas; política de integridad ("no se resuelven pruebas"); botón de reporte; solo ≥ 18 en tutorías presenciales | Producto |
| R14 | **Costo de IA desbocado** en plan gratis | 2 | 2 | 4 | Cuotas por usuario, modelo barato, caché, IA solo en Plus | CTO |

**Top-5 por severidad:** R1 tiempo de fundadores · R3 monetización · R2 competencia gratuita · R4/R7/R9/R13 (empate 12).

## 3. Mapa visual (P × I)
```
Impacto 5 |        R6,R12            
        4 |        R4      R3   R1  
        3 |   R10  R11  R7,R9,R13 R2
        2 |   R14       R8          R5
        1 |
          +----------------------------
            1    2    3    4    5   Probabilidad
```

## 4. Señales de alerta temprana (revisar cada mes lectivo)
- Ellis "muy decepcionado" < 30 % en el núcleo → pausar adquisición, volver a producto.
- Retención al reinicio de semestre < 40 % → problema de hábito/valor.
- % ramos con pauta de consenso en semana 2 < 50 % → reforzar embajadores.
- Competidor lanza "necesitas X" gratis en una universidad beachhead → acelerar diferenciadores (consenso, tutores).
- Horas de fundadores < 10/semana en dos semanas seguidas fuera de exámenes → re-planificar alcance.

## Fuentes (consultadas 26-nov-2026)
Instructure API Policy; BCN Ley 21.855; Subsecretaría Ed. Superior; CAi UC; Tutorea; auditorías internas de competencia (nov-2026). URLs en tabla.
