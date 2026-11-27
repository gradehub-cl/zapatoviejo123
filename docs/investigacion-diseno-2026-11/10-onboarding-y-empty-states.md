# 10 · Onboarding, demo sin registro y estados vacíos

Fuentes abiertas: [NN/g, Mobile-App Onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/) · [NN/g, Empty states en apps complejas](https://www.nngroup.com/articles/empty-state-interface-design/) · [Laws of UX (Paradox of the Active User, Hick, Goal-Gradient)](https://lawsofux.com/) · [WCAG 2.2 (3.3.7 Redundant Entry, 3.3.8 Accessible Authentication)](https://www.w3.org/TR/WCAG22/) · [NN/g, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [Material 3 Expressive (hero moments)](https://m3.material.io/blog/building-with-m3-expressive)

---

## 1. Principio: el mejor onboarding es no necesitarlo
NN/g: el onboarding tiene **mayor costo de interacción**, los usuarios lo saltan, y su investigación sobre tutoriales tipo "mazo de cartas" mostró que **no mejoraron el desempeño en tareas**; recomiendan **evitar el onboarding cuando sea posible** e invertir en hacer la UI más usable; el onboarding de *features* nuevas para usuarios existentes sí puede servir si es corto y saltable ([NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/)). Laws of UX: "los usuarios nunca leen manuales, empiezan a usar el software de inmediato" ([Laws of UX](https://lawsofux.com/)).

El onboarding actual de GradeHub (4 pasos, ~11 clics, ~1:40 min, sin verificar correo) es corto y fue valorado. Los problemas son de **contenido**, no de largo:
- Obliga a elegir entre 5 universidades sin "Otra" ni buscador (usuarios de USM, USACH, UdeC quedan fuera o mienten).
- El modal "Tus ponderaciones ayudan a tus compañeros" activa compartir datos con un único botón "Entendido" (consentimiento por omisión).

## 2. Flujo recomendado (valor antes que registro)

### Paso 0 · Demo sin registro (lo que hacen bien competidores)
- Desde la landing: **"Probar sin cuenta"** abre la app con un semestre de ejemplo (3 ramos ficticios) etiquetado "Ejemplo" y un banner fijo: "Estás viendo un ejemplo. [Empezar con mis ramos]".
- Todo editable; nada se pierde: si luego crea cuenta, se ofrece "¿Quieres conservar lo que hiciste?".
- La calculadora (puntaje → nota, "¿cuánto necesito?") funciona 100 % sin cuenta.

### Paso 1 · Universidad (con búsqueda y "Otra")
- Autocompletar con todas las universidades chilenas; si no hay datos de mallas para la elegida: "Aún no tenemos la malla de USM, pero puedes agregar tus ramos a mano en 1 minuto". Nunca bloquear.
- Hick's Law: un buscador vence a una lista larga ([Laws of UX](https://lawsofux.com/)).

### Paso 2 · Carrera y ramos del semestre
- Si hay malla: preseleccionar los ramos típicos del semestre (editable). Si no: "Agregar ramo" con nombre + créditos.
- **Redundant Entry (3.3.7)**: no volver a pedir universidad/carrera en Ajustes ni en "Ramos de mi malla" (auditoría: "Primero elige tu carrera en Ajustes" con la carrera ya elegida) ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

### Paso 3 · Primera nota → primer "Necesitas X"
- El momento "ajá" es ver **cuánto necesito para aprobar**. Llevar al usuario a ingresar una nota de un ramo y mostrar el resultado de inmediato. Ese es el fin del onboarding.

### Paso 4 · Privacidad explícita (no por omisión)
- Opciones con **dos botones equivalentes** y estado por defecto **apagado** para compartir ponderaciones y para anuncios basados en notas:
  - "Compartir mis ponderaciones de forma anónima para ayudar a otros" [Sí, compartir] [Ahora no]
  - "Usar mis notas para elegir anuncios" → mejor no pedirlo en el onboarding.
- Ver `11-ux-writing-es-cl.md` para el texto.

### Cuenta
- Pedir cuenta **cuando aporta valor**: "Crea tu cuenta para no perder tus notas y verlas en el celular y el computador".
- **3.3.8 Accessible Authentication**: permitir pegar contraseñas y gestores, ofrecer Google/Apple y enlace mágico; no CAPTCHAs cognitivos sin alternativa ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
- Recuperar contraseña como flujo real con pantalla de confirmación ("Te enviamos un enlace a c•••@uc.cl. Revisa también spam.") (auditoría: hoy no existe).
- Cerrar sesión vuelve a "Iniciar sesión" (no a "Crear cuenta").

## 3. Onboarding contextual (después del primer día)
- **Tips de un solo uso** en el punto de uso: al abrir el simulador por primera vez, una línea: "Aquí puedes probar notas sin cambiar las reales". Descartable, no vuelve.
- **Checklist de activación** opcional (Zeigarnik/Goal-gradient): "Agrega tus ramos ✓ · Pon una nota ✓ · Agrega una fecha de prueba · Activa recordatorios". Con 4 ítems máximo y que desaparece al completarse.
- **Novedades**: tarjeta corta y saltable solo para features realmente nuevas (lo que NN/g sí valida ([NN/g](https://www.nngroup.com/articles/mobile-app-onboarding/))).

## 4. Estados vacíos que enseñan
NN/g: los estados totalmente vacíos generan dudas (¿terminó?, ¿carga?, ¿error?, ¿filtré mal?); úsalos para **comunicar el estado del sistema**, **dar pistas de aprendizaje** y **ofrecer caminos directos a tareas clave** ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)).

### Anatomía
1. **Qué es esta vista** (una línea).
2. **Por qué está vacía** (primera vez / filtro / error / sin permiso).
3. **Acción principal** (un botón).
4. (Opcional) **Vista previa** con datos de ejemplo en gris o ilustración sobria.

### Catálogo para GradeHub
| Vista | Título | Texto | Acción |
|---|---|---|---|
| Inicio sin ramos | Arma tu semestre | Agrega tus ramos y te diremos cuánto necesitas en cada prueba para aprobar. | [Agregar ramos] · [Ver un ejemplo] |
| KPI promedio sin notas | — | Tu promedio aparece cuando pongas tu primera nota. | [Poner una nota] |
| Ramo sin evaluaciones | Este ramo no tiene evaluaciones | Copia la pauta del programa o usa una de tus compañeros. | [Agregar evaluación] · [Usar pauta sugerida] |
| Agenda vacía | Nada pendiente esta semana | Cuando agregues fechas a tus evaluaciones, aparecerán aquí. | [Agregar fecha] · [Importar calendario (.ics)] |
| Agenda con filtro sin resultados | No hay evaluaciones de Física en noviembre | — | [Quitar filtro] |
| Estadísticas sin datos | Aún no hay suficientes notas | Con 3 notas o más te mostramos tu tendencia. | [Poner nota] |
| Historial vacío | Aquí quedan tus semestres cerrados | Cuando cierres un semestre lo verás aquí con su promedio. | — |
| Semestre recién archivado | ¡Cerraste 2026-2! | Promedio final 5,4 · 6 ramos · 5 aprobados. ¿Empezamos 2027-1? | [Crear 2027-1] · [Ver resumen] |

El último es el **momento final (Peak-End)** que hoy falla (la app queda vacía con "PROMEDIO GENERAL ·"). M3 Expressive sugiere concentrar la expresividad en 1–2 "momentos héroe" ([M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive)): cerrar el semestre es el mejor candidato.

### CSS de referencia
```css
.vacio{ display:grid; justify-items:center; text-align:center; gap:var(--space-3);
        padding:var(--space-12) var(--space-6); color:var(--fg-muted); }
.vacio h2{ color:var(--fg); font-size:var(--text-title-3); text-wrap:balance; }
.vacio p{ max-inline-size:36ch; text-wrap:pretty; }
.vacio .btn-primario{ margin-block-start:var(--space-2); }
```

## 5. Antipatrones
- Tour de 5 pantallas antes de dejar usar la app.
- Elegir universidad de una lista cerrada sin "Otra".
- Consentimiento con un solo botón "Entendido".
- Pedir permisos de notificaciones al abrir la app por primera vez.
- Estado vacío = cuadrado gris, "Sin datos", o gráfico con ejes vacíos.
- Cierre de semestre que deja la app vacía sin siguiente paso.

## 6. Checklist
- [ ] Demo sin cuenta con datos de ejemplo claramente marcados.
- [ ] Universidad con búsqueda y "Otra"; nunca bloquear por falta de malla.
- [ ] Primera nota → "Necesitas X" en ≤2 minutos desde el primer toque.
- [ ] Consentimientos con opción equivalente de rechazo, apagados por defecto.
- [ ] Cada vista tiene diseñados sus estados vacío (primera vez y filtro).
- [ ] Cierre de semestre con resumen y paso siguiente.
