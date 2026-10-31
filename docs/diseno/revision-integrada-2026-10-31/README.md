# Revisión para Martín · rediseño del estudiante

Las cinco etapas están implementadas y guardadas en Git. **No se mergeó nada.** La única PR abierta de esta entrega es [#910 · Inicio](https://github.com/gradehub-cl/GradeHub/pull/910). Lucas pidió abrir cada siguiente PR después del merge anterior; las demás quedan como ramas publicadas para continuar esa secuencia.

## Qué revisar y en qué orden

| Orden | Rama original publicada | Commit original | Commit en esta integración | Informe, capturas y límites |
| --- | --- | --- | --- | --- |
| 1 · Inicio | `codex/inicio-racional-estudiante` | `f063f3a` | `ab704cf` | [Inicio](../inicio-estudiante-2026-10-30/README.md) · PR #910 |
| 2 · Agenda | `codex/agenda-racional-estudiante` | `b3f53b4` | `87bece7` | [Agenda](../agenda-estudiante-2026-10-30/README.md) |
| 3 · Ficha del ramo | `codex/ficha-racional-estudiante` | `2378f46` | `78b452b` | [Ficha](../ficha-estudiante-2026-10-31/README.md) |
| 4 · Fecha de edición | `codex/notas-editada-en` | `f569f6a` | `c92905f` | [Persistencia y fusión entre dispositivos](../notas-editada-en-2026-10-31.md) |
| 5 · Evolución del promedio | `codex/estadisticas-evolucion-estudiante` | `fa293f3` | `2d78a57` | [Estadísticas](../estadisticas-estudiante-2026-10-31/README.md) |

Las ramas originales conservan cada entrega. La quinta contiene además su prerrequisito de la cuarta; no debe publicarse aislada antes de ella. Los informes de cada etapa describen su validación individual; este documento agrega la validación conjunta.

## Probar el resultado completo

`codex/estudiante-revision-integrada` reúne las cinco etapas sobre `origin/main` en `a870e93`, incluido el cambio de permisos de #911. **Es una rama de revisión; no una PR para saltarse el orden acordado.**

```bash
git fetch origin
git worktree add ../gradehub-revision-martin origin/codex/estudiante-revision-integrada
cd ../gradehub-revision-martin
npm ci
npm test
```

Se sirve como la app normal del repo. Para inspección visual, usar únicamente una cuenta de prueba o datos inventados. No iniciar sesión con cuentas reales ni copiar notas reales a fixtures. Las capturas de abajo se generaron sin iniciar sesión y bloqueando la red externa.

Las únicas colisiones al reunir las etapas fueron inserciones contiguas al final de `styles.css`. Se conservaron íntegros los bloques de Inicio, Agenda, Ficha y Estadísticas, cada uno limitado a su pantalla y antes del bloque de iOS. No se descartó ninguna regla de main. La comprobación textual confirmó que los cuatro bloques originales están completos en esta integración.

## Abrir las PRs sin arrastrar etapas anteriores

Después de que quede mergeada la etapa anterior, crear una rama nueva desde el main actualizado y tomar **solo el commit integrado de la fila correspondiente**. Sus diferencias ya están adaptadas a las etapas previas; evita duplicar `editadaEn` si la cuarta se mergeó con squash.

Ejemplo para Agenda, **solo después de que quede #910**:

```bash
git fetch origin
git switch -c ms/agenda-racional-estudiante origin/main
git cherry-pick 87bece7
npm run build
node -e 'const vm=require("vm"),fs=require("fs");["data.js","app.js"].forEach(f=>new vm.Script(fs.readFileSync(f,"utf8")));console.log("JS OK")'
node -e 'const c=require("fs").readFileSync("styles.css","utf8");const o=(c.match(/\{/g)||[]).length,x=(c.match(/\}/g)||[]).length;if(o!==x)process.exit(1);console.log("CSS OK")'
npm test
git diff --check
```

Abrir la PR usando el informe de esa etapa como base, con enlaces de capturas apuntando a la rama/commit publicado, y explicar cualquier adaptación al main de ese momento. Repetir con Ficha, Fecha y Evolución, una por vez. Si otra persona ya resolvió una parte en main, revisar su equivalencia antes de traerla otra vez.

Las ramas originales también se pueden seguir: antes de actualizar una rama existente, revisar `git log --oneline --merges origin/main..HEAD`. Si tiene merges, `git merge origin/main`, nunca rebase. Esta entrega no reescribe ramas compartidas.

## Validación conjunta

- `npm run build`: 146 fuentes, siete scripts clásicos; orden de carga conservado.
- Sintaxis de `data.js`, `app.js` y `render-main.js`; CSS **3479/3479** llaves; `git diff --check`.
- `npm test` completo sobre las cinco etapas y el main de base: **369 archivos aprobados**.
- Chrome real: Inicio, Agenda, Ficha y Estadísticas a 375 y 1280 px, claro y oscuro, sin errores de JavaScript ni desborde horizontal.
- Flujo integrado: «+ Nota» abre la casilla, Enter guarda la nota con `editadaEn` y Estadísticas presenta exactamente el GPA que devuelve el motor después del cambio.
- Las pruebas y capturas por etapa incluyen texto al 200%, estados vacíos, notas sin fecha, metas imposibles, compuertas, contraste en los tres fondos, teclado, foco y movimiento reducido. Evolución añade tacto, filtros sin salto de scroll, una nota, 25 semestres y caché con 500 notas.
- No hay SQL de esta entrega que aplicar. La etapa 4 añade una clave opcional dentro del JSON privado existente; no cambia RLS, tablas, RPC ni permisos. No se ejecutó nada en Supabase.

## Capturas de la integración

| Pantalla | 375 claro | 375 oscuro | 1280 claro | 1280 oscuro |
| --- | --- | --- | --- | --- |
| Inicio | [Ver](home-375-claro.png) | [Ver](home-375-oscuro.png) | [Ver](home-1280-claro.png) | [Ver](home-1280-oscuro.png) |
| Agenda | [Ver](agenda-375-claro.png) | [Ver](agenda-375-oscuro.png) | [Ver](agenda-1280-claro.png) | [Ver](agenda-1280-oscuro.png) |
| Ficha | [Ver](ficha-375-claro.png) | [Ver](ficha-375-oscuro.png) | [Ver](ficha-1280-claro.png) | [Ver](ficha-1280-oscuro.png) |
| Estadísticas | [Ver](stats-375-claro.png) | [Ver](stats-375-oscuro.png) | [Ver](stats-1280-claro.png) | [Ver](stats-1280-oscuro.png) |

## Decisiones y límites que no deben perderse

- Dirección aprobada: Racional + Whoop + bozu, con HIG, `--font-ui`, acento del tema y semáforo semántico. Cada informe enlaza las guías de Apple aplicadas y sus medidas de contraste.
- El medidor de exigencia queda **original**, con degradado y raya; subido 6 px respecto de la cifra. La ficha usa «al lado» como variante provisional y conserva la clase de presentación `medidor-debajo` para revisar la alternativa. No se guarda una preferencia nueva.
- El gráfico reconstruye la secuencia con notas y pauta actuales; no afirma recuperar versiones antiguas ni fechas desconocidas. Carrera tiene un punto por semestre. La hora de edición procede del dispositivo.
- Las cuentas antiguas conservan sus datos; no se rellenan marcas retroactivas. Leer la interfaz no escribe. El test de sync usa dos dispositivos y nube sintéticos para verificar la coherencia de valor y fecha.
- No se alteran motor, catálogos académicos, anuncios, medición, paneles de profesor/admin, Wrapped, onboarding ni service worker. La lista de ramos de Inicio conserva su HTML.
