# Catálogo ONIX for Books en Directus

Modelo relacional para conservar únicamente el último estado recibido de cada producto editorial. No almacena el XML original, recepciones, versiones propias ni campos JSON.

El diagrama ER desplegado está en [`schema/onix-er.mmd`](schema/onix-er.mmd).

## Las dieciocho colecciones

| Colección | Contiene |
| --- | --- |
| `organizations` | Editoriales y distribuidores |
| `contributors` | Personas y entidades que colaboran en la obra |
| `books` | Registro maestro: un producto comercial vigente |
| `book_contributors` | Vínculo libro ↔ colaborador con su rol (Lista 17) |
| `book_organizations` | Vínculo libro ↔ organización con su función editorial (Lista 45) |
| `book_values` | Títulos, idiomas, audiencias, formatos, fechas, extensiones, medidas y derechos de venta |
| `book_subjects` | Materias, con Thema 1.6 precargado |
| `text_contents` | Textos descriptivos |
| `supporting_resources` | Recursos de apoyo enlazados |
| `book_identifiers` | ISBN, GTIN, DOI y códigos propios del producto (repetible) |
| `series` | Catálogo de colecciones: un título por fila, con su identificador |
| `book_series` | Vínculo libro ↔ colección con el número dentro de ella |
| `works` | Obras: el contenido intelectual, independiente del producto |
| `book_works` | Vínculo libro ↔ obra con su código de relación (Lista 164) |
| `related_products` | Productos relacionados |
| `book_supplies` | Cadena de suministro |
| `prices` | Precios con un tramo de impuesto aplanado |
| `price_territories` | Territorios de aplicación de cada precio |

## Decisiones del modelo

- `books` es el único registro maestro del libro/producto comercial.
- `identity_key` es la clave estable de actualización, tomada del RecordReference del origen.
- El catálogo guarda **la versión actual de cada registro, no las notificaciones recibidas**: no hay remitente (`sender`) ni tipo de notificación (ONIX Lista 1).
- `isbn13` tiene restricción única cuando está disponible.
- Los elementos repetibles de ONIX son colecciones relacionadas O2M. Cada ocurrencia ONIX es una fila independiente.
- El modelo utiliza 18 de las 25 colecciones físicas que permite Directus Core 12. Quedan 7 libres.
- **Colaboradores y editoriales están separados en los dos niveles**: catálogo (`contributors` / `organizations`) y vínculo (`book_contributors` / `book_organizations`). Cada uno usa su propia lista ONIX de rol.
- Materias, textos, recursos, colecciones, obras, productos relacionados y territorios de precio tienen colección propia; no pasan por `book_values`.
- **Las colecciones se escriben una sola vez.** `series` es el catálogo y `book_series` el vínculo con el número de cada libro. `series.collection_title` tiene restricción única, así que la base de datos rechaza que la misma colección se teclee de dos formas. El precio es que dos editoriales no pueden tener series con el título exactamente igual sin desambiguarlo.
- **Los identificadores no son polimórficos.** Solo el producto los tiene repetibles, en `book_identifiers` con la Lista 5. El identificador principal de colaboradores y organizaciones (Lista 44) y el de las colecciones (Lista 13) son tres columnas en su propia fila: `*_identifier_type`, `*_identifier_scheme` y `*_identifier`. A cambio de perder varios identificadores por persona o empresa, desaparecen el discriminador, las cuatro FK nulas y las condiciones.
- Los composites de rol, territorio, proveedor, relación de producto, versión de recurso y tramo de impuesto están aplanados en su colección funcional.
- Una actualización debe modificar `books` y sincronizar sus relaciones dentro de una transacción. Los valores que ya no estén presentes se eliminan.
- La auditoría queda en la actividad y revisiones nativas de Directus.
- Los campos de códigos se muestran con `select-dropdown` y opciones legibles asociadas a su lista ONIX.
- Las opciones se sincronizan desde las listas oficiales de EDItEUR en español. La versión desplegada es ONIX Codelists Issue 74 (56 listas, 3.276 opciones) y excluye códigos obsoletos.
- Directus almacena el código ONIX como valor, pero muestra la descripción oficial en los formularios y vistas mediante el display `labels`.
- `book_subjects.subject_code` incluye las 9.187 categorías y calificadores de Thema 1.6 en español. Las opciones se filtran automáticamente según el esquema ONIX 93–99 y se muestra la descripción mientras se conserva el código.
- `book_subjects.scheme_name` solo aparece para los esquemas propios 23 y 24; no se utiliza con Thema.

### Obras: cómo se agrupan ediciones y traducciones

ONIX no trata la obra como elemento de primer nivel: vive en `<RelatedMaterial>` → `<RelatedWork>`, que es **repetible** y solo lleva un código de relación (Lista 164) y un identificador de obra (Lista 16). Por eso el modelo usa dos colecciones y no un simple campo en `books`.

- `works` guarda la identidad de la obra. El identificador es único cuando está presente: es la clave que agrupa las ediciones.
- `book_works` es el `<RelatedWork>`: un producto puede apuntar a varias obras con códigos distintos.
- El `title` y el `original_language` de `works` son comodidad nuestra. ONIX no da título a la obra — la Lista 149 llega hasta colección y elemento de contenido, pero no tiene nivel de obra.

Códigos de la Lista 164 que resuelven los casos habituales:

| Código | Significado | Uso |
| --- | --- | --- |
| `01` | Manifestación de | agrupa ediciones y editoriales de una misma obra |
| `29` | Derivado mediante traducción | enlaza la obra traducida con su original |
| `06` | Manifestación de la obra original | edición bilingüe o facsímil |
| `28` / `48` | Derivado mediante revisión | ediciones revisadas |
| `04` / `05` | Otra obra en la misma colección / con la misma autoría | descubrimiento |

Una edición española traducida del inglés lleva dos filas en `book_works`: `01` hacia su obra y `29` hacia la obra original. «Dame todas las ediciones de esta obra» es un join por `work_relation_code = '01'`.

**Atención con la Lista 16: ya no incluye ISTC.** Los identificadores de obra vigentes son `01` propio, `06` DOI, `15` ISBN-13, `18` ISRC, `19` ISAN, `31` EIDR, `32` GLIMIR, `33` OWI y `39` ISCC. Un ISTC recibido de un proveedor solo cabe como tipo `01` con su nombre de esquema.

`related_products` no desaparece: sigue siendo producto ↔ producto (formatos alternativos, sustituciones, saldos). Las obras cubren «mismo contenido intelectual», que es otra cosa.

### Cómo funciona `book_values`

`book_values` agrupa los elementos repetibles cuya estructura es «tipo + código + valor». `value_group` decide qué columnas se usan y qué lista ONIX alimenta cada desplegable; las condiciones nativas de Directus ocultan lo que no aplica y cambian las opciones sobre la marcha.

| Grupo | `value_type` | `value_code` | `qualifier_code` | Otras columnas |
| --- | --- | --- | --- | --- |
| `title` | Lista 15 | Lista 149 | — | `language_code`, `script_code`, `value_text` (título), `value_label` (subtítulo), `sequence_number` |
| `language` | Lista 22 | ISO 639-2 | Lista 91 | `script_code` |
| `audience` | Lista 28 | Lista 29 | — | `value_label` (calificador), `value_note` |
| `form_detail` | Lista 175 | — | — | — |
| `form_feature` | Lista 79 | Lista dependiente del tipo | — | `value_note` |
| `date` | Lista 163 | — | Lista 55 | `value_text` (valor ONIX), `normalized_date` |
| `extent` | Lista 23 | — | — | `value_number`, `value_unit` (Lista 24) |
| `measure` | Lista 48 | — | — | `value_number`, `value_unit` (Lista 50) |
| `sales_right` | Lista 46 | Lista 91 o 49 | `country` / `region` | `included` |

El coste de agrupar es que las etiquetas de estos campos son fijas: Directus puede cambiar opciones y visibilidad por condición, pero no el nombre del campo. La tabla anterior es la referencia de lectura.

## Infraestructura Railway

- Proyecto: `directus-onix-books`
- URL: <https://directus-production-2ff7.up.railway.app>
- Directus 12.1.1, fijado por la plantilla oficial
- PostgreSQL/PostGIS 17 con volumen persistente
- Redis
- Almacenamiento S3 de Railway provisionado por la plantilla oficial, aunque este modelo no conserva el archivo ONIX

## Primer acceso

El esquema y los ejemplos ya están desplegados. Abre `/admin` en la URL pública y completa el formulario de propietario con tu propio correo y contraseña. No se almacena una credencial administrativa en este repositorio.

## Migraciones aplicadas

El modelo pasó de 25 colecciones a 8, de 8 a 14 y de 14 a las 15 actuales. Todas las migraciones siguen el mismo patrón: aparcar en el esquema `onix_legacy` lo que `directus schema apply` va a destruir, en lugar de borrarlo. Así los datos se conservan, no hay colisiones de nombres de índices y —en las dos primeras— el proyecto baja del límite de 25 colecciones que bloquea `schema apply`.

| Migración | Guiones |
| --- | --- |
| 25 → 8 (consolidación) | `migrate-radical-park.sql`, `migrate-radical-load.sql`, `migrate-radical-cleanup.sql` |
| 8 → 14 (separación) | `migrate-split-park.sql`, `migrate-split-load.sql`, `migrate-split-cleanup.sql` |
| 14 → 15 (identificadores planos) | `migrate-flatten-park.sql`, `migrate-flatten-load.sql`, `migrate-flatten-cleanup.sql` |
| 15 → 18 (obras y catálogo de colecciones) | `migrate-works-park.sql`, `migrate-works-load.sql`, `migrate-works-dedupe.sql`, `migrate-works-cleanup.sql` |
| Retirada del remitente | `migrate-drop-sender.sql` y después `directus schema apply` |

La retirada del remitente ya no necesita aparcar nada: con 14 colecciones el proyecto está por debajo del límite, así que `schema apply` aplica el diff y elimina las columnas directamente. `migrate-drop-sender.sql` se ejecuta **antes**, para normalizar `identity_key` mientras la información de origen todavía existe.

```bash
# 1. Aparcar el modelo anterior y liberar el cupo de colecciones
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/migrate-split-park.sql

# 2. Crear las colecciones nuevas
npm run --silent snapshot | railway ssh --service Directus --environment production -- \
  sh -lc 'umask 077; tee /tmp/onix-schema.json >/dev/null'

railway ssh --service Directus --environment production -- \
  npx directus schema apply --yes \
  --ignoreRules directus_activity,directus_oauth_clients,directus_oauth_codes,directus_oauth_consents,directus_oauth_tokens,directus_revisions,directus_sessions \
  /tmp/onix-schema.json

# 3. Repartir los datos conservando los UUID
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/migrate-split-load.sql

railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/prepare-codelists.sql

# 4. Verificar y, solo entonces, eliminar el esquema aparcado
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/verify.sql

railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/migrate-split-cleanup.sql

railway restart --service Directus --environment production --yes
```

`migrate-split-cleanup.sql` cuenta las filas que no encontraron destino (`unmapped_*`) antes de borrar nada. En el despliegue actual todas fueron 0.

## Reaplicar el esquema

Con 14 colecciones, `schema apply` no necesita rodeos:

```bash
npm run --silent snapshot | railway ssh --service Directus --environment production -- \
  sh -lc 'umask 077; tee /tmp/onix-schema.json >/dev/null'

railway ssh --service Directus --environment production -- \
  npx directus schema apply --yes \
  --ignoreRules directus_activity,directus_oauth_clients,directus_oauth_codes,directus_oauth_consents,directus_oauth_tokens,directus_revisions,directus_sessions \
  /tmp/onix-schema.json
```

Para actualizar en el futuro las listas estáticas desde EDItEUR:

```bash
npm run sync:codelists
npm run sync:thema
npm test
```

Si prefieres actualizar solo los metadatos de Thema sin recrear colecciones:

```bash
node scripts/render-thema-metadata-sql.mjs | railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1'

railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/migrate-thema.sql

railway restart --service Directus --environment production --yes
```

Para volver a cargar los ejemplos de forma idempotente:

```bash
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/seed.sql
```

También se conserva un bootstrap por API para instalaciones donde ya existe un administrador:

```bash
export DIRECTUS_URL="https://directus.example.com"
export DIRECTUS_EMAIL="admin@onix.local"
export DIRECTUS_PASSWORD="..."
npm run bootstrap
```

El comando crea o actualiza colecciones, campos, listas, relaciones y los dos libros de demostración.

## Verificación

```bash
npm test
npm run verify
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/verify.sql
railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/verify-codelists.sql

railway ssh --service PostGIS --environment production -- \
  sh -lc 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' < schema/verify-thema.sql
```

La verificación remota comprueba:

- las dieciocho colecciones del modelo y sus 19 relaciones;
- el margen frente al límite Core de 25 colecciones;
- ausencia total de campos `json`;
- listas desplegables con opciones configuradas;
- descripciones visibles en lugar de etiquetas que comienzan por el código;
- listas dependientes y condiciones compuestas;
- la distribución de `value_group`, el reparto de identificadores planos, la reutilización de colecciones y los códigos de relación de obra;
- que no queda rastro del esquema `onix_legacy`;
- dos libros y datos relacionados de ejemplo.

Última verificación en producción:

```
physical_collections=18  relations=19            custom_json_columns=0
dropdown_lists=46        legacy_schema_present=0 code_prefixed_labels=0
flat_identifiers=2/1/1/1 thema_choices=9187      orphan_values=0
series_reuse=1 catálogo / 1 vínculos             duplicate_series_titles=0
work_relations=01:2
thema_conditions=7       thema_choices=9187      code_prefixed_labels=0
```

## Datos de ejemplo

- `9789580000013` — *Cartografías de la memoria*.
- `9789580000020` — *El jardín de las órbitas*.

Los nombres, metadatos, organizaciones y URLs son ficticios y están marcados como demostración.
