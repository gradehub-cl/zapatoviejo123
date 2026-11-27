## 2. /entrar — "Entrar con correo y PIN · UniGo"
- H1 "Entrar con correo y PIN"; copy: "Usa el correo con el que creaste tu cuenta y tu PIN de 6 dígitos."
- Campos: "Correo" (required), "PIN" (required), botón "Entrar". Links: "Volver al inicio", "Probar la calculadora sin cuenta". Footer Guías/Preguntas/Privacidad/Términos.
- **NO ofrece Google/Apple/SSO ni OAuth.** No hay "¿Olvidaste tu PIN?" ni "no tengo cuenta" en la pantalla.
- Consecuencia para esta auditoría: sin cuenta UAI no hay forma de entrar → el interior de la app (salas, horario, exámenes, buses, ajustes) NO es auditable. No se creó cuenta ni se inventaron credenciales (límite respetado).

## 3. /probar — "Prueba la calculadora de notas UAI · Sin crear cuenta" (demo pública usable)
Chip "🧪 Calculadora de prueba" + H1 "Prueba UniGo sin crear cuenta" + copy: "Elige tu carrera y semestre, toca un ramo y escribe notas (reales o inventadas): te dice cuánto necesitas para aprobar o eximirte, con las reglas del programa de cada ramo. Aquí no se guarda nada: con tu cuenta gratis tus notas quedan guardadas y además tienes tus salas de hoy, la fecha de tus exámenes y los buses."
Botones: "Crear cuenta gratis" / "Ya tengo cuenta: entrar".

**Selectores**: Carrera = Ingeniería Comercial, Ingeniería Civil, International Management, Derecho, Bachillerato de Ingeniería Comercial, Doble Título Ingeniería Comercial + Sociología (6).
Semestre = 1.º, 2.º, **4.º, 5.º, 6.º — falta el 3.º semestre** (hueco de datos visible).

**Ramos de Ing. Comercial 1.º**: Matemáticas Avanzadas I, Razonamiento Cuantitativo con Datos I, Introducción a la Microeconomía, Management. Cada ramo es un acordeón con badge de estado ("Faltan notas", luego "Eximido parcial").

**Al expandir un ramo**: "¿Qué quieres lograr?" con 3 botones segmentados: "Aprobar / Sacar un 4,0", "Eximirme / No dar el examen", "Un promedio / Elegir mi nota final". Ponderaciones del programa: Pruebas 70%, Controles 20%, Talleres 10%, Examen 30% (Examen con nota al 30% junto a un 70/20/10 = 100%+30%: el examen se integra al 30% y las otras al 70/20/10; el mapa muestra "78% 22% 10% 100% 30%" cuando ya hay notas).
- Cada ítem trae 3 casillas con placeholder 4,0 y botones "+" (Ayuda: "Agregar otra nota") y "–" ("Quitar la última casilla (solo si está vacía)"; deshabilitado si hay notas).
- Nota al pie por ítem: "Se hacen en grupo, en el módulo de taller" (Talleres), "Solo si no te eximes" (Examen).
- "RESULTADO": barra NP sobre escala 1,0–7,0 con marcas "Aprueba 4,0" y "Exime 5,0"; tarjetas "NP parcial" y "🎯 Cada nota que falta 3,7 — aprobar · en 5 casillas vacías"; hint "💡 Para eximirte (NP 5,0) necesitas promedio 5,0 en el 100% que falta."
- Disclosure "▸ Ver cómo se calcula" → "Promedio pruebas (70%) 4,0 / Promedio controles (20%) 5,75 / Promedio talleres (10%) — / NP parcial · Sobre lo evaluado hasta ahora 4,39 / Nota necesaria para un 5,0 · La misma nota en cada casilla vacía 5,2".
- Mapa "¿CÓMO FUNCIONA ESTE RAMO?" (diagrama de flujo Pruebas/Controles/Talleres → NP → Nota final, con leyenda "con notas / aún sin notas: su peso lo toma lo que sí tiene").

**Comportamientos probados**:
- Con 5,0/4,0/3,0 y 6,0/5,5: NP parcial 4,39, "Cada nota que falta 3,7 aprobar · en 5 casillas vacías", "💡 Con las notas actuales ya no alcanzas eximirte (NP 5,0) solo con lo que falta."
- "Eximirme" → "⚠ No te puedes eximir matemáticamente." y "🎯 Cada nota que falta No alcanza eximirte · en 4 casillas vacías".
- "Un promedio" → field "Quiero terminar con al menos" (5,0) → "Cada nota que falta 5,2 un 5,0 · en 5 casillas vacías".
- Con nota 5,75: badge "Eximido parcial", banner "Parcial Eximición", y el tip largo: "💡 Vas eximido por ahora (NP 5,10), pero aún te faltan notas: si te sacas notas bajas puedes perder la eximición (con 1,0 en todo lo que falta, tu NP bajaría a 3,69). Prepárate para el examen por si acaso." y en el detalle "Eximición · Aún depende de las notas que faltan · PARCIAL".
- "Resumen general": "— Promedio general (aún sin ramos terminados)", "5,10 Promedio parcial con lo ingresado".
- "PRIORIDAD DE ESTUDIO" con dos modos: "Aprobación — Qué ramo es más probable que repruebes" y "Mis objetivos — Qué tan lejos estás de lo que quieres lograr". Estados: "Ingresa tus notas y te digo en qué ramos concentrarte." → "Con lo ingresado no hay ramos en riesgo por ahora." + lista con % y etiquetas (Baja/Alta). En modo Mis objetivos: "Empieza por Matemáticas Avanzadas I." y "Quieres un promedio final de 5,0: necesitas 4,8 en lo que falta · Alta 49%".
- Nota final: "Los cálculos de UniGo son orientativos: el programa oficial de cada ramo manda siempre."

### Bugs / fricciones detectadas en /probar
1. **BUG GRAVE — el CTA "✉ Enviarme el informe por correo" saca de la demo**: al tocarlo en la calculadora sin cuenta, la app navega a la raíz (unigo.cl) y muestra en rojo "Tu sesión venció. Entra de nuevo." Se pierden las notas ingresadas y no se envía informe alguno. Texto exacto del error: "Tu sesión venció. Entra de nuevo." Pasos: /probar → escribir notas → tocar "✉ Enviarme el informe por correo" → landing con error de sesión.
2. **Inconsistencia de formato numérico**: el mismo valor aparece "5,1" (header, barra NP, mapa) y "5,10" (Promedio parcial, tip de eximición).
3. **Inconsistencia entre resultado y prioridad**: con la meta puesta en "Un promedio 5,0", la lista de prioridad en modo "Aprobación" sigue diciendo "Necesitas 3,1 en lo que falta", cifra que no aparece en el ramo (allí se muestra 4,8).
4. Prioridad de ramos sin notas: los 3 ramos sin notas reciben 26%/30%/17% y se ordenan antes/después del ramo con notas de forma poco estable; etiqueta "Sin notas" junto a un porcentaje invita a creer que hay riesgo calculado.
5. El tip "💡 Programa tus pruebas en cada ramo («📅 Programar una prueba») y las sumo a tu prioridad." referencia un control que **no existe en la demo** (única mención en la página): instruye a hacer algo imposible ahí.
6. Semestre 3.º ausente del selector.
7. Ponderaciones suman 100% + Examen 30%; el mapa reescala a "78% 22% 10% 100% 30%" sin explicar la renormalización, confuso para entender la regla del 70/30.
8. Badge "Faltan notas" conviviendo con un NP ya calculado y con "NP parcial" en el header: orden "4,39 NP" (valor antes que etiqueta).
9. No hay validación visible: escribir texto o valores fuera de escala no muestra mensaje de error (el campo simplemente no lo toma).
10. En la landing aparece un iframe de publicidad ("Advertisement", id aswift_1) en una app de estudiantes.
