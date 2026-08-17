import pg from 'pg';

/**
 * Lectura del catálogo ONIX directamente contra PostgreSQL.
 *
 * Se lee por SQL y no por la API REST de Directus a propósito: es un ETL
 * interno, necesita recorrer todo el catálogo en pocas consultas y no debe
 * depender de un token de aplicación que caduque.
 */

export function poolFromEnvironment() {
  const connectionString = process.env.DIRECTUS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta DIRECTUS_DATABASE_URL (o DATABASE_URL) para leer el catálogo ONIX.');
  }
  return new pg.Pool({
    connectionString,
    ssl: connectionString.includes('proxy.rlwy.net') ? { rejectUnauthorized: false } : undefined,
    max: 4
  });
}

const groupBy = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row[key]) ?? [];
    list.push(row);
    map.set(row[key], list);
  }
  return map;
};

/**
 * Devuelve un libro por fila con todas sus dependencias ya resueltas.
 * `since` limita a lo modificado después de esa marca de tiempo.
 */
export async function readBooks(pool, { since = null, isbns = null } = {}) {
  const filters = [];
  const params = [];
  if (since) {
    params.push(since);
    filters.push(`books.date_updated >= $${params.length}`);
  }
  if (isbns?.length) {
    params.push(isbns);
    filters.push(`books.isbn13 = ANY($${params.length})`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows: books } = await pool.query(
    `SELECT books.* FROM books ${where} ORDER BY books.isbn13`,
    params
  );
  if (!books.length) return [];

  const ids = books.map((book) => book.id);
  const byBook = async (sql) => (await pool.query(sql, [ids])).rows;

  const [
    contributors, publishers, seriesRows, subjects, values,
    texts, resources, prices, works, related, identifiers
  ] = await Promise.all([
    byBook(`SELECT bc.book_id, bc.role_code, bc.sequence_number, bc.is_primary,
                   c.id AS contributor_id, c.display_name, c.name_identifier
            FROM book_contributors bc
            JOIN contributors c ON c.id = bc.contributor_id
            WHERE bc.book_id = ANY($1)
            ORDER BY bc.sequence_number NULLS LAST`),
    byBook(`SELECT bo.book_id, bo.publishing_role, o.id AS organization_id, o.name
            FROM book_organizations bo
            JOIN organizations o ON o.id = bo.organization_id
            WHERE bo.book_id = ANY($1)`),
    byBook(`SELECT bs.book_id, bs.sequence_number, s.id AS series_id,
                   s.collection_title, s.collection_type
            FROM book_series bs
            JOIN series s ON s.id = bs.series_id
            WHERE bs.book_id = ANY($1)`),
    byBook(`SELECT book_id, scheme_identifier, subject_code, heading_text, is_main
            FROM book_subjects WHERE book_id = ANY($1)`),
    byBook(`SELECT book_id, value_group, value_type, value_code, qualifier_code,
                   language_code, script_code, value_text, value_label, value_note,
                   value_number, value_unit, normalized_date, sequence_number, included
            FROM book_values WHERE book_id = ANY($1)`),
    byBook(`SELECT book_id, text_type, content_audience, language_code, content, sequence_number
            FROM text_contents WHERE book_id = ANY($1)
            ORDER BY sequence_number NULLS LAST`),
    byBook(`SELECT book_id, content_type, resource_url, caption, file_format, width, height
            FROM supporting_resources WHERE book_id = ANY($1)`),
    byBook(`SELECT bs.book_id, p.price_type, p.amount, p.currency_code,
                   p.tax_type, p.tax_rate, p.tax_included, p.valid_from
            FROM prices p
            JOIN book_supplies bs ON bs.id = p.book_supply_id
            WHERE bs.book_id = ANY($1)`),
    byBook(`SELECT bw.book_id, bw.work_relation_code,
                   w.id AS work_id, w.title, w.original_language, w.work_identifier
            FROM book_works bw
            JOIN works w ON w.id = bw.work_id
            WHERE bw.book_id = ANY($1)`),
    byBook(`SELECT rp.book_id, rp.relation_code, rp.identifier_value, rp.product_form,
                   target.isbn13 AS related_isbn13
            FROM related_products rp
            LEFT JOIN books target ON target.id = rp.related_book_id
            WHERE rp.book_id = ANY($1)`),
    byBook(`SELECT book_id, identifier_type, identifier_value, is_primary
            FROM book_identifiers WHERE book_id = ANY($1)`)
  ]);

  const index = {
    contributors: groupBy(contributors, 'book_id'),
    publishers: groupBy(publishers, 'book_id'),
    series: groupBy(seriesRows, 'book_id'),
    subjects: groupBy(subjects, 'book_id'),
    values: groupBy(values, 'book_id'),
    texts: groupBy(texts, 'book_id'),
    resources: groupBy(resources, 'book_id'),
    prices: groupBy(prices, 'book_id'),
    works: groupBy(works, 'book_id'),
    related: groupBy(related, 'book_id'),
    identifiers: groupBy(identifiers, 'book_id')
  };

  return books.map((book) => ({
    ...book,
    contributors: index.contributors.get(book.id) ?? [],
    publishers: index.publishers.get(book.id) ?? [],
    series: index.series.get(book.id) ?? [],
    subjects: index.subjects.get(book.id) ?? [],
    values: index.values.get(book.id) ?? [],
    texts: index.texts.get(book.id) ?? [],
    resources: index.resources.get(book.id) ?? [],
    prices: index.prices.get(book.id) ?? [],
    works: index.works.get(book.id) ?? [],
    related: index.related.get(book.id) ?? [],
    identifiers: index.identifiers.get(book.id) ?? []
  }));
}

export const valuesOfGroup = (book, group) =>
  book.values.filter((value) => value.value_group === group);
