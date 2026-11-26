# Reglas del ramo · revisión de diseño

Solo datos sintéticos, Chrome con la app compilada y el puente nativo simulado;
sin Supabase, sin login, sin tráfico externo y sin service worker. No es una
prueba del binario en iPhone. Esta PR no modifica Swift ni plugins.

## Composición

La ficha responde «¿qué condiciones afectan mi nota y de dónde salen?». Primero
la explicación, después barras de pesos con escala común de 0 a 100 %, y las
citas plegadas. Se conserva el ingreso de notas y los contadores. La explicación
reemplaza la tarjeta duplicada de eximición automática solo en la app. El catálogo
no siempre tiene la cita literal: en ese caso se identifica como texto registrado
o se dice que no hay cita, en vez de inventarla.

Se reutiliza la barra paralela de Estadísticas, extraída a su archivo de piezas
compartidas, sin cambiar sus llamadas existentes. Gris para el reparto; ningún
color decorativo. --font-ui y cifras tabulares. Las frases explicativas son una
exigencia expresa del prompt; son una excepción al criterio habitual de reducir
texto en un dashboard.

## Casos y medidas

- Reparto sintético E1 20 / E2 20 / E3 30 / Examen 30; presentación 70 %.
  Eximición 5,95 y hasta 6 faltas, promedio actual 6,0; con 7 faltas deja de
  aparecer como activa. Bonus de texto inicialmente sin confirmar.
- Fuente Canvas sintética con dos fragmentos; abrir/cerrar la cita funciona.
  El fragmento importado queda «por revisar»: no se convierte en una regla.
- Consenso de 7 estudiantes se identifica como tal; manual sin reglas no muestra
  la sección. La web no muestra esta nueva sección.
- 375 px, claro y oscuro, revisión visual de las tres capturas adjuntas. Sin
  scroll horizontal. Las cinco pistas miden 335 px: los subpesos no cambian de
  escala física. Targets de disclosure: mínimo 44 px.
- Contraste mínimo medido para textos nuevos: 7,51:1 claro / 9,73:1 oscuro.
- Texto al 200 %: explicación 32 px, ancho desplazable 375 px, targets ≥ 44 px.
- Reducir movimiento: transición del indicador 0 s.
- Sonda de layout a 1440 y 3440 px: sin overflow y escala común. En la primera base revisada, la emulación
  de app nativa en escritorio mostró una barra de navegación previa deformada;
  no se adjuntan esas capturas como evidencia de una pantalla correcta ni se
  cambia esa navegación fuera del alcance. La entrega visual exigida es a 375 px.

HIG: [Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls),
[Charts](https://developer.apple.com/design/human-interface-guidelines/charts) y
[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).
