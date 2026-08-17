import { akeneoClientFromEnvironment } from '../src/akeneo-client.mjs';
import { poolFromEnvironment, readBooks } from '../src/directus-read.mjs';
import { LOCALE } from '../src/akeneo-catalog.mjs';
import { toAkeneoProduct } from '../src/akeneo-mapping.mjs';

const argument = (name) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};

const since = argument('since');
const isbns = argument('isbn')?.split(',').map((value) => value.trim()).filter(Boolean) ?? null;
const withCovers = process.argv.includes('--covers');
const log = (message) => process.stdout.write(`${message}\n`);

export async function syncProducts({ since = null, isbns = null, withCovers = false } = {}) {
  const pool = poolFromEnvironment();
  const client = akeneoClientFromEnvironment();
  const report = {
    books: 0, options: 0, covers: 0,
    products: { ok: 0, failed: 0, errors: [] },
    associations: { ok: 0, failed: 0, errors: [] }
  };

  try {
    const books = await readBooks(pool, { since, isbns });
    report.books = books.length;
    if (!books.length) return report;

    const mapped = books.map(toAkeneoProduct);

    /* Las opciones dinámicas (editoriales, autores, colecciones) tienen que
       existir antes que el producto: Akeneo rechaza en silencio un valor de
       select cuya opción no está creada. */
    const optionsByAttribute = new Map();
    for (const { options } of mapped) {
      for (const [attribute, entries] of Object.entries(options)) {
        const current = optionsByAttribute.get(attribute) ?? new Map();
        for (const entry of entries) current.set(entry.code, entry.label);
        optionsByAttribute.set(attribute, current);
      }
    }

    for (const [attribute, entries] of optionsByAttribute) {
      if (!entries.size) continue;
      const payload = [...entries].map(([code, label]) => ({
        code,
        attribute,
        labels: { [LOCALE]: label }
      }));
      const summary = await client.upsertMany(`attributes/${attribute}/options`, payload, {
        label: attribute
      });
      report.options += summary.ok;
      if (summary.failed) {
        log(`  ⚠ ${attribute}: ${summary.failed} opciones fallidas → ${JSON.stringify(summary.errors.slice(0, 2))}`);
      }
    }

    /* Dos pasadas a propósito: las asociaciones referencian otros productos por
       identificador, y Akeneo rechaza la referencia si el destino todavía no
       existe. Primero se crean todos los productos, después se enlazan. */
    const withoutAssociations = mapped.map(({ product }) => {
      const { associations, ...rest } = product;
      return rest;
    });
    const summary = await client.upsertMany('products', withoutAssociations, { label: 'productos' });
    report.products = summary;

    const linked = mapped
      .filter(({ product }) => product.associations)
      .map(({ product }) => ({ identifier: product.identifier, associations: product.associations }));
    if (linked.length) {
      const associationSummary = await client.upsertMany('products', linked, { label: 'asociaciones' });
      report.associations = associationSummary;
      if (associationSummary.failed) {
        log(`  ⚠ asociaciones fallidas: ${JSON.stringify(associationSummary.errors.slice(0, 3))}`);
      }
    }

    if (withCovers) {
      for (const { product, cover } of mapped) {
        if (!cover?.resource_url) continue;
        try {
          await uploadCover(client, product.identifier, cover);
          report.covers += 1;
        } catch (error) {
          log(`  ⚠ cubierta de ${product.identifier}: ${error.message}`);
        }
      }
    }

    return report;
  } finally {
    await pool.end();
  }
}

/** Akeneo Community no acepta URL en los atributos de imagen: hay que subir el fichero. */
async function uploadCover(client, identifier, cover) {
  const response = await fetch(cover.resource_url);
  if (!response.ok) throw new Error(`descarga ${response.status}`);
  const blob = await response.blob();

  const form = new FormData();
  form.append(
    'product',
    JSON.stringify({ identifier, attribute: 'onix_cover', scope: null, locale: null })
  );
  form.append('file', blob, cover.resource_url.split('/').pop() || 'cover.jpg');

  const token = await client.authenticate();
  const upload = await fetch(`${client.baseUrl}/api/rest/v1/media-files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!upload.ok) throw new Error(`subida ${upload.status}: ${(await upload.text()).slice(0, 200)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await syncProducts({ since, isbns, withCovers });
  log('\n── Sincronización de productos ──');
  log(`  libros leídos en Directus: ${report.books}`);
  log(`  opciones dinámicas: ${report.options}`);
  log(`  productos: ${report.products.ok} correctos, ${report.products.failed} fallidos`);
  if (report.products.failed) {
    log(`  errores:\n${JSON.stringify(report.products.errors, null, 2)}`);
  }
  log(`  asociaciones: ${report.associations.ok} correctas, ${report.associations.failed} fallidas`);
  if (withCovers) log(`  cubiertas subidas: ${report.covers}`);
  process.exit(report.products.failed ? 1 : 0);
}
