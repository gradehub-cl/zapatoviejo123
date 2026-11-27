# Catálogo de universidades de Chile

Material para continuar el [PR borrador #1367](https://github.com/gradehub-cl/zapatoviejo123/pull/1367). La aplicación usa códigos propios de universidad. El paquete relaciona esos códigos con el directorio de Mineduc y la oferta SIES 2026.

## Archivos

- [Catálogo verificado v0.2](gradehub_catalogo_chile_v0.2_verificado.zip). Contiene 55 universidades, 3.587 carreras, 7.144 ofertas de pregrado y una extensión de 8.781 ofertas de posgrado y postítulo. Incluye los esquemas JSON, las fuentes oficiales, la fila de origen de cada oferta, la cobertura y los pendientes.
- [Entrega inicial de Neo v0.1](gradehub_catalogo_chile_v0.1_scaffold.zip). Contiene los esquemas originales y la lista inicial de candidatos para consultar como referencia.

## Leer y validar la entrega

Ejecuta desde la raíz del repo.

```bash
catalogo=$(mktemp -d)
unzip -q docs/investigacion/catalogo-chile/gradehub_catalogo_chile_v0.2_verificado.zip -d "$catalogo"
python3 "$catalogo/scripts/validar_paquete.py"
```

Dentro del ZIP, empieza por `README.md`, `cobertura.csv` y `pendientes.jsonl`. El manifiesto registra conteos y hashes de los archivos.

## Continuación para integrar en GradeHub

1. Usa `gradehub_universidades.csv` para cruzar el identificador de cada institución con el tenant de la app. Conserva códigos existentes como `fen`, `udp` y `unab`. Las fuentes del paquete documentan 53 universidades vigentes y dos en cierre. La Universidad La República requiere revisar su aparición en el selector del borrador. [Aviso de cierre de la Subsecretaría de Educación Superior](https://educacionsuperior.mineduc.cl/2026/04/28/subsecretaria-de-educacion-superior-formaliza-el-nombramiento-de-fernando-de-la-jara-goyeneche-como-administrador-de-cierre-de-la-universidad-la-republica/)
2. Revisa `universidades.jsonl`, `carreras.jsonl` y `ofertas.jsonl` para preparar las listas del onboarding. Conserva sede, modalidad, jornada, versión y año. Usa `admision_nueva` y `convenio_reubicacion` al decidir qué ofertas mostrar y cómo identificarlas. [Directorio Mineduc](https://ayudamineduc.cl/ficha/instituciones-vigentes-reconocidas-por-el-mineduc) · [Oferta Académica SIES 2026](https://www.mifuturo.cl/bases-de-datos-de-oferta-academica/)
3. Contrasta el catálogo con los PR de U. de Chile, UDP y UNAB. Mantén el ingreso manual disponible para carreras y ramos sin catálogo. Para llenar `mallas.jsonl`, `ramos.jsonl` y `requisitos.jsonl`, busca las mallas y los catálogos oficiales por carrera, sede, plan y cohorte. Conserva siglas y unidades de créditos publicadas y registra cada fuente por URL y página, hoja o fila.
4. Verifica el contrato de `profiles.universidad` antes de activar los nuevos tenants y prueba el ciclo registro, ramo manual y nuevo inicio de sesión con cuentas sintéticas. El catálogo es material de investigación para revisión e integración.
