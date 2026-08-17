# Integración ONIX → Akeneo → Medusa, orquestada con n8n

Cadena desplegada en Railway. Directus es la autoridad bibliográfica, Akeneo la
comercial y Medusa la tienda; n8n mueve los datos entre ellos.

```
Directus (ONIX)          onix-sync              Akeneo PIM            n8n            Medusa
18 colecciones    →   POST /sync/products  →   2026.3 CE      →   sondeo 10 min  →  backend
                          (delta)                 30 atributos       + firma HMAC     /admin/akeneo/webhook
```

## Servicios

| Servicio | Proyecto Railway | URL |
| --- | --- | --- |
| Directus | `directus-onix-books` | <https://directus-production-2ff7.up.railway.app> |
| `onix-sync` | `directus-onix-books` | <https://onix-sync-production.up.railway.app> |
| n8n | `directus-onix-books` | <https://n8n-production-ca08.up.railway.app> |
| Akeneo | `akeneo-pim-community` | <https://akeneo-production.up.railway.app> |
| Medusa backend | `libreria-medusa` | <https://backend-production-c60ba.up.railway.app> |

## La idea que sostiene el mapeo

`src/onix-codelists.generated.mjs` tiene 56 listas oficiales de EDItEUR con
`value` = código ONIX y `text` = descripción en español. Esas mismas listas
generan los atributos de Akeneo y sus opciones, así que **el código de la opción
en Akeneo es el código ONIX**. La transformación entre los dos sistemas es la
identidad para todo campo codificado: no hay tabla de conversión que mantener.

Única excepción: 4.170 calificadores Thema usan guion (`1DDB-BE-B`) y Akeneo solo
acepta `[a-zA-Z0-9_]`. Se aplica `-` ↔ `_`, que es una biyección comprobada — el
guion es el único carácter no alfanumérico de la lista, ningún código lleva guion
bajo y no hay ni una colisión en los 9.187.

## Guiones

```bash
# Valida que todo código ONIX encaje en Akeneo, sin escribir nada
npm run sync:akeneo:structure -- --dry-run

# Crea grupos, atributos, 10.611 opciones, tipos de asociación y la familia
npm run sync:akeneo:structure

# Reintentos rápidos: omite las opciones, que son lo lento
npm run sync:akeneo:structure -- --skip-options

# Productos: carga completa, delta o un ISBN suelto
npm run sync:akeneo:products
npm run sync:akeneo:products -- --since=2026-08-01T00:00:00Z
npm run sync:akeneo:products -- --isbn=9789580000013 --covers
```

El servicio `onix-sync` expone lo mismo por HTTP para que n8n lo dispare:

```bash
curl -X POST https://onix-sync-production.up.railway.app/sync/products \
  -H "Authorization: Bearer $SYNC_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"since": null, "withCovers": true}'
```

## Decisiones que conviene conocer

- **Dos pasadas al escribir productos.** Las asociaciones referencian otros
  productos por identificador y Akeneo rechaza la referencia si el destino aún no
  existe. Primero se crean todos los productos, después se enlazan.
- **Las opciones dinámicas van antes que el producto.** Editoriales, autores y
  colecciones se crean como opciones a partir de los datos de Directus; si el
  producto llegara primero, Akeneo descartaría el valor en silencio.
- **La lectura de Directus es por SQL, no por su API REST.** Es un ETL interno que
  recorre el catálogo en pocas consultas y no debe depender de un token que caduque.
- **Akeneo Community no tiene webhooks** — los eventos son de Enterprise. Por eso
  el flujo 2 sondea `updated > marca` en vez de esperar aviso. El filtro exige
  `yyyy-MM-dd HH:mm:ss`; con ISO 8601 responde 400 sin explicar el motivo.
- **La marca de tiempo solo avanza si la pasada fue limpia.** Si algo falla, la
  siguiente ejecución reintenta el mismo rango. Se solapan 5 minutos a propósito.
- **Nunca se borra en Akeneo.** Un libro inactivo llega como `enabled: false`.

## Flujos de n8n

Los JSON versionados están en [`deploy/n8n/workflows/`](deploy/n8n/workflows/) y
se importan por API. Variables que necesitan: `ONIX_SYNC_URL`, `ONIX_SYNC_SECRET`,
`AKENEO_BASE_URL`, `AKENEO_USERNAME`, `AKENEO_PASSWORD`, `AKENEO_LOCALE`,
`AKENEO_WEBHOOK_SECRET`, `MEDUSA_BASE_URL`.

Tres ajustes del entorno de n8n que hicieron falta y no son evidentes:

| Variable | Por qué |
| --- | --- |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | Sin ella, `$env.X` en expresiones da «access to env vars denied» |
| `NODE_FUNCTION_ALLOW_BUILTIN=crypto` | El Code node necesita `crypto` para la firma HMAC |
| `N8N_RUNNERS_ENABLED=false` | Con runners activos, el proceso aislado no hereda la lista blanca anterior |

La imagen se construye desde [`deploy/n8n/Dockerfile`](deploy/n8n/Dockerfile): el
volumen de Railway se monta como root y la imagen oficial corre como `node`, así
que el entrypoint ajusta el propietario y baja privilegios antes de arrancar.

## Cierre del salto a Medusa

El conector vivía solo en ramas de funcionalidad, mezclado con trabajo en curso.
Se llevó a `main` en un commit quirúrgico (`81591d8`) con **solo** los ocho
ficheros del conector, sin nada del WIP de diseño, y verificando antes que el
backend siguiera compilando con 0 errores.

Dos cosas que descubrimos por el camino y conviene tener presentes:

- **El enlace de GitHub de Railway está roto.** Al reconectar la fuente responde
  `Resource not accessible by integration`: la app de GitHub de Railway no tiene
  acceso al repositorio. Por eso el push a `main` no disparó nada y el último
  despliegue con éxito seguía siendo el commit del 1 de julio. Se desplegó por
  subida directa (`railway up`) para cerrar hoy, pero **conviene volver a
  autorizar la app de GitHub** y reconectar la fuente para recuperar el flujo
  GitOps; mientras tanto, cada despliegue del backend hay que lanzarlo a mano.
- **El orden de los eventos importa.** El conector marca un producto como
  `retrying` si su autoría todavía no existe como categoría. El flujo emite
  primero los eventos de autoría y después los de producto, en el mismo lote.
- **La autoría se deriva de las opciones de `onix_author`**, no de Reference
  Entities: eso es Enterprise. Y el conector lee `labels.es`, así que el flujo
  emite `es` y `es_ES`; con solo `es_ES` la categoría se quedaba con el código
  como nombre.

Verificación de extremo a extremo, sobre una ejecución programada real:

```
Firmar eventos   → 4 eventos (2 de autoría + 2 de producto)
Evaluar entrega  → HTTP 200 · aplicados 4 · reintentando 0 · fallidos 0
Medusa           → Cartografías de la memoria  handle 9789580000013  published
                   El jardín de las órbitas     handle 9789580000020  published
                   Lucía Herrera Demo           categoría de autoría
Firma inválida   → 401
```
