# Contexto de GradeHub: lee solo el tema necesario

Las reglas de trabajo viven en [AGENTS.md](../AGENTS.md). El estado actual de
ramas, PRs y trabajo local se consulta con `bash bin/estado.sh`; no se deduce de
una lista histórica de pendientes. No hace falta leer todos estos documentos.

| Tu tarea toca… | Lee |
|---|---|
| Supabase, Auth, RLS o seguridad | [Seguridad](contexto/seguridad.md) |
| Pendientes registrados o un reporte de usuario | [Cola y reportes](contexto/cola.md) |
| Decisiones de producto | [Producto](contexto/producto.md) |
| Clases, campañas, cobros o recomendación | [Marketplace](contexto/marketplace.md) |
| Una regla del programa que el motor no calcula | [Reglas del motor](contexto/reglas-motor.md) |
| Por qué se hizo algo o qué PR lo incorporó | [Antecedentes](contexto/historial.md) |

Estos textos se movieron completos; no certifican el estado de producción.
En especial, las cifras de usuarios, cobertura y reportes, los pendientes de
seguridad y las reglas antiguas de anuncios deben verificarse antes de usarlos.
Una decisión registrada no equivale a una tarea nueva ni autoriza cambiar datos.

Para localizar un párrafo sin cargar el documento entero:

```bash
npm run buscar -- "campañas" --docs
npm run buscar -- --archivo docs/contexto/marketplace.md --desde 1 --lineas 30
```
