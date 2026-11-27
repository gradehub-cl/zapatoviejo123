# Auditoría UX UniGo (unigo.cl) — Nov 2026

## 1. Landing https://unigo.cl/
Título de pestaña: "UniGo · La app de los estudiantes UAI: notas, salas, horario, exámenes y buses"

**Splash**: pantalla completa azul marino casi negro, logo "UG" en degradado azul/cian con glow, texto "UNI GO" espaciado abajo y "TOCA PARA ENTRAR" al pie. Al tocar se revela la landing real (portada tipo app).

**Estructura revelada (arriba abajo)**:
- Card "Entrar" (H1) con field de búsqueda placeholder "Tu nombre, alias o correo" y link "Entrar con correo y PIN".
- Card "Crear cuenta" (H2) + "Gratis · 1 minuto" + botón azul "Crear cuenta".
- Banner "🧪 Prueba la calculadora sin cuenta — Elige tu carrera, escribe notas y mira cuánto necesitas. No se guarda nada. →" (=/probar)
- Trust badges: "🎯 Hecho para la UAI · 🔌 Sin conectar nada · 🔒 Solo tú ves tus notas"
- "Más de 130 estudiantes ya usan UniGo." + carrusel de avatares con nombre y @alias (40 nombres, duplicados en el DOM para el loop).
- Banner "📲 Instala UniGo en tu celular — Como una app, a un toque. →" (=/instalar) con botón "No mostrar más".
- Banner "📚 Envía los programas de tus ramos — Así agregamos o corregimos tus ramos. 1 minuto. →" (=/aporta)
- H2 "UniGo: la app de los estudiantes de la UAI" + párrafo SEO + bullet list de funciones:
  - Calculadora de notas: escribe tus notas y mira la nota exacta que necesitas en lo que falta, con las reglas de cada ramo.
  - Salas de hoy: en qué sala y a qué hora es cada una de tus clases del día.
  - Mi horario: tu semana completa, con salas y horas.
  - Buses de acercamiento al Campus Peñalolén, con el próximo bus.
  - Fecha de tu examen según la lista oficial de la UAI, con cuenta regresiva.
  - UniGo Learn: cursos para preparar pruebas (https://learn.unigo.cl/), con clases cortas, ejercicios que se corrigen solos y tutor de IA.
  - UniGo Games: minijuegos inspirados en la UAI (Snake del campus, Escapa del control y Rompe el semestre) con ranking semanal entre estudiantes y entre carreras.
- Link "Prueba la calculadora sin crear cuenta →"
- H2 "Guías para entender tus notas" con links:
  - /guias/como-se-calcula-la-nota-final-uai
  - /guias/eximicion-del-examen-uai
  - /guias/examen-replace-la-peor-prueba (real: /guias/examen-reemplaza-la-peor-prueba)
  - /guias/notas-que-no-cuentan-controles-eliminados
  - /guias/nota-necesaria-para-aprobar
  - /guias/promedio-ponderado-paso-a-paso
  - /guias/escala-de-notas-puntaje-a-nota
  - /guias (todas)
- Footer: Preguntas frecuentes /preguntas · Sobre UniGo /sobre · Contacto /contacto · Privacidad /privacidad · Términos /terminos
- Disclaimer: "UniGo es un proyecto independiente de Agustín Hidalgo, estudiante de la UAI; no es una página oficial de la universidad. Sus cálculos son orientativos: confirma siempre con la UAI."
- Texto flotante inferior: "Privado · tus notas solo se ven con tu PIN"

**URLs descubiertas**: /entrar, /probar, /instalar, /aporta, /guias*, /preguntas, /sobre, /contacto, /privacidad, /terminos, learn.unigo.cl
**No se ven en la landing links a App Store ni Google Play** (sólo /instalar = PWA "Como una app, a un toque").

### Sensaciones / fricciones landing
- El splash "Toca para entrar" es teatral pero esconde todo el contenido hasta un toque: coste de carga percibida y ninguna razón para tocar antes de saber qué es UniGo.
- Dos CTAs de signo opuesto (Entrar / Crear cuenta) ocupan el centro; no hay captura de pantalla del producto en portada.
- El field de búsqueda de "Entrar" dice "alias", lenguaje interno poco claro para un usuario nuevo.
