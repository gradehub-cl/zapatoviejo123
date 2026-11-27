# Mallas UCN: fuentes y decisiones

Revisión del 2026-11-27. Entran las tres carreras de la **Escuela de Ingeniería
de la UCN en Coquimbo**, que es la única unidad de la universidad que publica sus
mallas y los programas de cada ramo en un listado abierto:
[losvilos.ucn.cl/InstructivosEscuelaIngenieria](https://losvilos.ucn.cl/InstructivosEscuelaIngenieria/),
carpeta «E. Mallas y programas de estudios». El resto de la UCN sigue igual: la
carrera se escribe y los ramos se agregan a mano.

En GradeHub: 3 carreras declarables, las 3 con malla, 136 ramos en malla (86
nombres únicos).

| Opción en GradeHub | Código | Folleto de malla | SHA-256 |
|---|---|---|---|
| Ingeniería Civil en Computación e Informática (Coquimbo) | `UCN-COQ-ICCI` | `Malla ICCI Ingeniería Civil en Computación e Informática 2024 -.pdf` | `b9c7df38aee34096c8e9055d59e0b0def69155eece37868a306b2c6114502157` |
| Ingeniería Civil Industrial (Coquimbo) | `UCN-COQ-ICI` | `Malla ICI Ingeniería Civil Industrial 2024 -.pdf` | `faf06be72f487c4b736006166026f883c470bf1eddf50d62f20715e2adcdb411` |
| Ingeniería en Tecnologías de Información (Coquimbo) | `UCN-COQ-ITI` | `Malla ITI Ingeniería en Tecnologías de Información 2024 -.pdf` | `ded499da010c18c9d981ae95996a6be34562eca9072109ec6f1006fea6ad4686` |

Las opciones llevan «(Coquimbo)» porque Antofagasta dicta carreras del mismo
nombre con otro plan, que no está acá.

## Cómo se leyó

- **El semestre sale del folleto.** La página de la malla es una imagen, sin
  texto: se dibujó cada una a 2000 px de ancho y se leyó casillero por
  casillero. Son los planes publicados como «2024», sin atribuirles una cohorte
  que el documento no declara.
- **El nombre sale del programa de cada ramo.** La misma carpeta trae 154
  programas (60 de ICCI, 48 de ICI y 46 de ITI), ordenados por semestre. Se
  leyeron todos y se contrastó cada casillero del folleto con su programa. El
  folleto abrevia («Admin. de la Producción I», «Proyecto Form. y Ev. de
  Proyecto de Inversión»); el programa trae el nombre completo.
- La malla de ITI coincide exacta con sus programas. En ICCI e ICI hay cinco
  ramos donde no coinciden en el semestre (abajo).

El inventario de los programas, con créditos SCT, códigos y la sección de
evaluación de cada uno, está en la
[PR #1381](https://github.com/gradehub-cl/zapatoviejo123/pull/1381).

## Qué quedó fuera

Mismo criterio que las otras universidades: los casilleros que no nombran un
curso y los hitos que no son ramos.

- **Electivo Profesional** (uno por semestre desde 5° en ICCI e ICI y desde 4° en
  ITI, y todo el 9° de Industrial), **Electivo Ciencias de la Ingeniería** y
  **Formación General Electiva**.
- **Práctica Profesional**, que el folleto dibuja fuera de los semestres.

Por eso Ingeniería Civil Industrial no tiene 9°: son seis electivos
profesionales. No se inventa un semestre vacío.

## Lo que no es transcripción literal

- **Formación general con un solo nombre.** Son los mismos ramos en las tres
  carreras, pero cada documento los escribe distinto: «Diálogo, Fe - Cultura» y
  «Diálogo, Fe – Ciencia» (Industrial), «Diálogo, fe, y cultura» (Computación),
  «Inglés 1» (folletos de ICCI e ITI) e «Inglés I» (programas), «Identidad,
  Universidad y Equidad de Género» (folletos) e «Identidad, Universidad, Equidad
  y Género» (programas), «Ética Moral y Profesional» (folleto de Industrial).
  Van como «Diálogo, Fe y Cultura», «Diálogo, Fe y Ciencia», «Inglés I», «Inglés
  II», «Identidad, Universidad, Equidad y Género» y «Ética y Moral Profesional».
- **Nombres sin espacios.** Los PDF de programas de Computación traen el texto
  pegado («ÁlgebraI», «Identidad,Universidad,EquidadyGénero»). Se usó el nombre
  del archivo, que trae los espacios, con mayúsculas como en el folleto.
- **Dos nombres para un ramo que parece el mismo:** «Ingeniería y Desarrollo
  Sustentable» en Computación (folleto y programa) e «Ingeniería y Desarrollo
  Sostenible» en Industrial (folleto y programa). Quedan como los escribe cada
  carrera.
- En Industrial, el folleto dice «Proyecto Diseño de Sistemas Productivos» y
  «Capstone Project»; los programas, «Proyecto Sistemas Productivos» y «Capstone
  Project Ingeniería Industrial». Van los del programa.

## Donde el folleto y el programa no coinciden

Manda el folleto, que es la malla publicada de la carrera. Los programas de
formación general parecen compartidos entre carreras y traen el semestre de
otra. **Es una decisión para revisar:** si un estudiante de la escuela confirma
que rige el programa, se cambia el semestre de estos cinco.

| Carrera | Ramo | Folleto | Programa |
|---|---|---|---|
| ICCI | Diálogo, Fe y Ciencia | 7° | 3° |
| ICCI | Ética y Moral Profesional | 8° | 4° |
| ICI | Comunicación Efectiva II | 4° | 6° |
| ICI | Diálogo, Fe y Ciencia | 6° | 3° |
| ICI | Ética y Moral Profesional | 7° | 4° |

Además, **Mecánica** está en el 2° del folleto de Industrial, pero su carpeta de
programas no lo trae (sí está en la de Computación). Va, como dice el folleto.

## Pendiente

- **Créditos SCT.** Cada programa los declara y los folletos también; hoy la
  tabla de créditos existe solo para UC y FEN. Cargarlos le daría a la UCN el
  promedio ponderado por créditos.
- **Pautas.** 133 de los 154 programas nombran porcentajes de evaluación, pero
  en prosa y a veces como rango o recomendación. Hay que transcribirlas a mano,
  ramo por ramo; no se cargó ninguna.
- **Regla de nota.** El Reglamento General de Docencia de Pregrado (D. 64 y
  67/2024) está en el mismo listado. No se declaró nada en
  `GH_REGLAS_NOTA_POR_TENANT`: rige la regla común hasta leer sus artículos 28 a
  30 contra el PDF.
- **El resto de la UCN** (Antofagasta y las demás carreras de Coquimbo): no se
  encontró una fuente abierta equivalente.
- **Licencia:** no se localizó una licencia de reutilización en el listado ni en
  los folletos, igual que en las demás universidades.
