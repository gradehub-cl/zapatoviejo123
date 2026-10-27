# Mallas UAI: fuentes de la ampliación de octubre

Revisión del 2026-10-04. Se contrastaron los nombres **y las columnas del
diagrama**, no solo el texto extraído, con los PDF enlazados desde la
[página oficial de mallas y folletos](https://www.uai.cl/admision/mallas-curriculares-y-folletos).
Son los planes publicados al consultar, sin atribuirles una cohorte que el
documento no declara. Las sugerencias se confirman contra el horario personal.

| Plan añadido | ID en GradeHub | Fuente oficial |
|---|---|---|
| Comercial, Licenciatura en Administración de Empresas | `UAI-INGENIERIA-COMERCIAL-ADMINISTRACION` | [PDF](https://uai.cdn7pm.net/documentos/malla-licenciatura-administracion-de-empresas.pdf) |
| Comercial + Sociología, Licenciaturas en Economía y Sociología | `UAI-DOBLE-TITULO-INGENIERIA-COMERCIAL-SOCIOLOGIA-ECONOMIA` | [PDF](https://uai.cdn7pm.net/documentos/malla-doble-titulo-ingeneria-comercial-sociologia-economia.pdf) |
| Diseño, ingreso vía plan común de Comercial | `UAI-INGENIERIA-EN-DISENO-VIA-COMERCIAL` | [PDF](https://uai.cdn7pm.net/documentos/malla-ingenieria-en-diseno-via-ing-comercial.pdf) |

Los tres planes se mantienen separados de Comercial-Economía,
Comercial + Sociología-Administración y Diseño vía Civil. Esas opciones
anteriores conservan su ID y sus mallas; su etiqueta ahora identifica el plan.
La lista pasa de 23 a 26 opciones con malla. No son tres carreras nuevas de
admisión: son tres vías o licenciaturas que faltaban.

### Decisiones de transcripción

- No se copian Electivos, Optativos, Major I–VII, Disciplinar Historia ni
  bloques de especialización como si fueran cursos. Tampoco se inventan
  créditos, códigos, requisitos, fechas o ponderaciones a partir del diagrama.
- Los CORE dibujados sobre dos semestres se sugieren al comienzo del bloque,
  sin inventar una separación I/II. En los tres PDF nuevos, Escritura
  Argumentativa está en la segunda columna. La excepción antigua de
  Civilización Contemporánea II en Comercial se conserva, sin extenderla a
  otras carreras a partir de una inferencia.
- Comercial-Administración tiene cursos nombrados hasta sexto semestre; los
  bloques del séptimo al décimo no identifican asignaturas.
- En Sociología-Economía los bimestres de décimo y undécimo se agrupan en su
  semestre. Sociología de las Crisis y Taller Práctico abarcan ambos: se
  sugieren al comienzo del bloque, en décimo. En undécimo se incluyen
  Fundamentos Teóricos I y II; no se duplican ni se inventan fechas.
- Diseño vía Comercial tiene sus propios nombres: Taller de Interfaces,
  Del Átomo al Bit, Taller de Espacios, Diseño y Construcción de Interfaces y
  Taller Complejo. La columna sexta está después de una separación más ancha;
  no se confunde con séptimo. Noveno y décimo solo publican magísteres.
- Se conservan las diferencias de nombre entre documentos, sin afirmar
  equivalencias académicas sin código. Por ejemplo, Seminario **del** Diseño
  Aplicado y Seminario **de** Diseño Aplicado. La búsqueda existente ya ignora
  tildes y mayúsculas; no se añaden aliases ni se reinterpretan ramos guardados.
- `Modelación 2_3D y Gráfica` se transcribe como `Modelación 2D, 3D y Gráfica`,
  igual que el nombre ya utilizado en la vía Civil. No se le atribuye código.

### Pendientes que requieren otra fuente

- [Comunicación Estratégica + Comercial](https://uai.cdn7pm.net/documentos/malla-articulacion-comunicacion-estrategica-con-ingenieria-comercial.pdf)
  se titula **“Propuesta de malla curricular”**. No se presenta como plan
  verificado hasta confirmar su vigencia y a quién aplica.
- Los Talleres de Lanzamiento I–III de Comercial son franjas laterales entre
  columnas. Su ubicación gráfica no confirma un semestre de inscripción.
  Faltan programa o catálogo para incorporarlos con esa precisión.
- La [vía Civil de Diseño](https://uai.cdn7pm.net/documentos/malla-ing-en-diseno-via-ing-civil.pdf)
  publica **Física II en segundo y tercer semestre**. No se cambia segundo a
  Física I por analogía con otras ingenierías. También merece confirmar los
  CORE de la transcripción anterior antes de mover sugerencias entre semestres.
- La página ofrece más dobles titulaciones de Diseño y articulaciones de
  Industrial con especialidades. No se mezclan en una malla general ni se
  anuncian como transcritas en esta ampliación.
- El selector de semestre del onboarding ofrece primero a undécimo. El curso
  de titulación de duodécimo de Sociología-Economía está en el catálogo y se
  puede buscar y agregar, pero ampliar ese selector requiere otra revisión
  de los límites del flujo; esta PR de contenido no los cambia.
- Estos PDF no publican SCT ni evaluaciones. Los programas que sí incluyen
  esos datos siguen siendo una fuente distinta y requieren verificar sección
  y período; las mallas nuevas no cambian los presets de la UAI.

### Identificación de los PDF revisados

SHA-256 del archivo descargado, para reconocer cambios posteriores en una URL
que no declara versión:

```text
68df8d5a2ebc3f9b88c7493c6a4471fe59491d32c9ce4e2b46c0a288e0aa075c  malla-licenciatura-administracion-de-empresas.pdf
17a56469ff4861484b9dbd99d0153f8860d2f737d4924574bf78c9c2087bddae  malla-doble-titulo-ingeneria-comercial-sociologia-economia.pdf
ab8c563426d144be7c615c5eee7a4acb717b2d84f5529c64fdc17a146b3f6ca8  malla-ingenieria-en-diseno-via-ing-comercial.pdf
119c2fca8f71143e1fba75e044950473db8fa477bb32551c9be34fb3bee7a433  malla-ing-en-diseno-via-ing-civil.pdf
fb04b6a34d22f45dcb60a2c5a222641674944a20532c4bd916b152e80619a98b  malla-articulacion-comunicacion-estrategica-con-ingenieria-comercial.pdf
```

### Cuentas existentes y verificación

No hay SQL ni migración: `gradehub_v1`, los IDs de carrera, el origen de los
ramos, créditos, notas y pautas existentes se conservan. Ningún ramo se agrega
automáticamente a una cuenta ya creada. Quien quiera cambiar de plan puede
elegirlo explícitamente en el selector existente.

`tests/mallas-uai-planes.test.js` comprueba las sugerencias por semestre,
separación de las tres vías, búsqueda desde otra carrera UAI, ausencia de
datos inventados y reapertura de cuentas sintéticas con pauta propia.
Los tests anteriores de Comercial y onboarding siguen comprobando los planes
antiguos y sus enlaces.
