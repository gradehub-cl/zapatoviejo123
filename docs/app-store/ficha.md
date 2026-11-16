# Ficha de la App Store — BORRADOR

> **BORRADOR para revisión (Claude / Lucas).** Nada de esto está cargado en App
> Store Connect. Textos en español de Chile, basados solo en lo que la app hace
> hoy según el código (`src/`, `ios/`) y el `README.md`. Los límites de
> caracteres se contaron con espacios.

App en App Store Connect: Apple ID **6834207639** · bundle `cl.gradehub.app` ·
idioma principal sugerido: **Español (México)** es el único español
latinoamericano que ofrece App Store Connect; usar ese, con textos chilenos.

## Nombre (≤30)

`GradeHub` (8)

Alternativa con palabra clave en el nombre, si Lucas la prefiere:
`GradeHub: notas y promedio` (26)

## Subtítulo (≤30)

`Tus notas, promedio y agenda` (28)

Alternativas: `Cuánto necesito para aprobar` (28) · `Notas y promedio de la U` (24)

## Texto promocional (≤170)

> Sabe cuánto necesitas en la próxima prueba antes de darla. Anota tus notas,
> mira tu promedio ponderado al tiro y deja la agenda del semestre en tu pantalla de inicio.

(166)

## Descripción (≤4000)

```
GradeHub es la app para llevar tus notas de la universidad sin planillas. Anotas lo que te sacaste y la app te dice cómo va cada ramo, tu promedio y cuánto necesitas en lo que queda para aprobar.

TUS RAMOS, CON SU PAUTA
• Agrega tus ramos y GradeHub les carga la pauta de evaluación cuando la tiene: ponderaciones, controles, solemnes, exámenes y reglas de aprobación.
• Pautas y mallas para cursos de la UC, la FEN de la Universidad de Chile, la UAI, la Universidad de los Andes y la UDD. Si tu ramo no está, lo armas a mano en un minuto.
• La fuente de verdad siempre es el programa oficial del curso: puedes revisar y corregir la pauta cuando quieras.

PROMEDIO Y "CUÁNTO NECESITO"
• Promedio ponderado de cada ramo y del semestre, calculado al instante.
• La nota que necesitas en las evaluaciones que quedan para llegar a tu meta.
• Simulador: prueba escenarios ("¿y si me saco un 4,5 en el examen?") sin tocar tus notas reales.

AGENDA
• Tus próximas evaluaciones ordenadas por fecha y por cuánto pesan.
• Suscribe tus evaluaciones a Google Calendar, Apple Calendar u Outlook: se agregan una vez y se actualizan solas.
• Importa fechas desde un archivo .ics y revisa cada una antes de guardarla.
• Saca una foto de tu horario y GradeHub reconoce las siglas de tus ramos (el reconocimiento corre en tu teléfono).

EN TU IPHONE
• Widgets para la pantalla de inicio y de bloqueo: Próxima evaluación, Promedio general, Pendientes y Estadísticas.
• Avisos antes de una evaluación con hora y una Actividad en Vivo que te acompaña las horas previas (opcionales).

ESTADÍSTICAS
• Cómo vas en el semestre, tu avance y lo que más te exige.
• Historial de semestres anteriores.
• Compárate de forma anónima con quienes cursan el mismo ramo: solo ves un porcentaje y únicamente cuando hay al menos cinco personas.

TUS DATOS
• Funciona sin conexión: tus notas se guardan en tu teléfono.
• Con una cuenta, se sincronizan entre tu iPhone y gradehub.cl.
• No vendemos tus datos ni se los pasamos a tu universidad. Puedes borrar tu cuenta desde Ajustes cuando quieras.

GradeHub es gratis. Puede mostrar clases particulares de tus ramos, siempre marcadas como publicidad.

GradeHub es un proyecto independiente, sin relación con ninguna universidad.
```

(≈2.240 caracteres; holgura de sobra.)

## Palabras clave (≤100, separadas por coma, sin espacios)

```
notas,promedio,ponderado,universidad,ramos,pruebas,examen,calculadora,agenda,UC,uchile,semestre
```

(95) — no repetir "GradeHub" (el nombre ya cuenta). Revisar si conviene
cambiar `UC,uchile` por `PUC,FEN` según búsquedas reales.

## Categoría

- Principal: **Educación**
- Secundaria (opcional): **Productividad**

## URLs

- Soporte: `https://gradehub.cl/preguntas.html` (preguntas frecuentes; el
  correo de contacto `gradehub.app@gmail.com` está en `privacidad.html` y
  `terminos.html`). Si Apple pide una página con contacto visible arriba, usar
  `https://gradehub.cl/terminos.html` o agregar el correo a `preguntas.html`.
- Marketing: `https://gradehub.cl`
- Política de privacidad: `https://gradehub.cl/privacidad.html` (ver `privacidad.md`).

## Derechos de autor

`2026 GradeHub SpA`

## Notas para el revisor (App Review Information → Notes) — borrador

```
GradeHub calcula promedios y la nota necesaria a partir de la pauta de cada ramo. La cuenta demo trae ramos y notas ficticias para ver la Agenda, Estadísticas y los widgets con datos. Los avisos marcados "Publicidad · Clase particular" son clases particulares pagadas por profesores revisados por nuestro equipo; el contacto se abre fuera de la app. La cuenta se elimina en Ajustes → Datos y cuenta → Eliminar mi cuenta.
```

## Pendiente de revisar

- [ ] Que cada función nombrada siga visible en la versión iOS 1.0 (widgets,
      Actividad en Vivo, foto del horario, suscripción de calendario).
- [ ] Capturas: 6,9" (1320×2868) obligatorias; 6,5" opcionales. No están en este PR.
- [ ] Si #1112 (Entrar con Apple) entra antes, mencionarlo en "Tus datos".
