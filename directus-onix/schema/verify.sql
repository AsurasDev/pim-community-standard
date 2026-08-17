\pset tuples_only on
\pset format unaligned

SELECT 'physical_collections=' || COUNT(*)
FROM information_schema.tables AS tables
JOIN directus_collections AS collections
  ON collections.collection = tables.table_name
WHERE tables.table_schema = 'public'
  AND collections."group" = 'onix_catalog';

SELECT 'configured_fields=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog';

SELECT 'relations=' || COUNT(*)
FROM directus_relations AS relations
JOIN directus_collections AS collections
  ON collections.collection = relations.many_collection
WHERE collections."group" = 'onix_catalog';

SELECT 'dropdown_lists=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog'
  AND fields.interface = 'select-dropdown';

SELECT 'custom_json_columns=' || COUNT(*)
FROM information_schema.columns AS columns
JOIN directus_collections AS collections
  ON collections.collection = columns.table_name
WHERE columns.table_schema = 'public'
  AND collections."group" = 'onix_catalog'
  AND columns.data_type IN ('json', 'jsonb');

SELECT 'legacy_schema_present=' || COUNT(*)
FROM information_schema.schemata
WHERE schema_name = 'onix_legacy';

SELECT 'books=' || COUNT(*) || ',unique_identity_keys=' || COUNT(DISTINCT identity_key)
FROM books;

SELECT
  isbn13 || '|' || title ||
  '|contributors=' || (SELECT COUNT(*) FROM book_contributors WHERE book_id = books.id) ||
  '|organizations=' || (SELECT COUNT(*) FROM book_organizations WHERE book_id = books.id) ||
  '|values=' || (SELECT COUNT(*) FROM book_values WHERE book_id = books.id) ||
  '|subjects=' || (SELECT COUNT(*) FROM book_subjects WHERE book_id = books.id) ||
  '|identifiers=' || (SELECT COUNT(*) FROM book_identifiers WHERE book_id = books.id) ||
  '|series=' || (SELECT COUNT(*) FROM book_series WHERE book_id = books.id) ||
  '|works=' || (SELECT COUNT(*) FROM book_works WHERE book_id = books.id) ||
  '|texts=' || (SELECT COUNT(*) FROM text_contents WHERE book_id = books.id) ||
  '|resources=' || (SELECT COUNT(*) FROM supporting_resources WHERE book_id = books.id) ||
  '|supplies=' || (SELECT COUNT(*) FROM book_supplies WHERE book_id = books.id) ||
  '|prices=' || (
    SELECT COUNT(*)
    FROM prices
    JOIN book_supplies ON book_supplies.id = prices.book_supply_id
    WHERE book_supplies.book_id = books.id
  )
FROM books
ORDER BY isbn13;

SELECT 'value_groups=' || string_agg(value_group || ':' || total, ',' ORDER BY value_group)
FROM (
  SELECT value_group, COUNT(*) AS total
  FROM book_values
  GROUP BY value_group
) AS grouped;

SELECT 'orphan_values=' || COUNT(*)
FROM book_values
WHERE value_group NOT IN (
  'title', 'language', 'audience', 'form_detail',
  'form_feature', 'date', 'extent', 'measure', 'sales_right'
);

SELECT 'flat_identifiers=' ||
  (SELECT COUNT(*) FROM book_identifiers) || '/' ||
  (SELECT COUNT(*) FROM contributors WHERE name_identifier IS NOT NULL) || '/' ||
  (SELECT COUNT(*) FROM organizations WHERE name_identifier IS NOT NULL) || '/' ||
  (SELECT COUNT(*) FROM series WHERE collection_identifier IS NOT NULL);

SELECT 'series_reuse=' ||
  (SELECT COUNT(*) FROM series) || ' catálogo / ' ||
  (SELECT COUNT(*) FROM book_series) || ' vínculos';

SELECT 'duplicate_series_titles=' || COUNT(*)
FROM (
  SELECT collection_type, collection_title
  FROM series
  GROUP BY collection_type, collection_title
  HAVING COUNT(*) > 1
) AS duplicated;

SELECT 'work_relations=' || COALESCE(string_agg(work_relation_code || ':' || total, ',' ORDER BY work_relation_code), 'ninguna')
FROM (
  SELECT work_relation_code, COUNT(*) AS total
  FROM book_works
  GROUP BY work_relation_code
) AS grouped;

SELECT 'sampled_collections=' || COUNT(*)
FROM (
  SELECT 'organizations' AS collection WHERE EXISTS (SELECT 1 FROM organizations)
  UNION ALL SELECT 'contributors' WHERE EXISTS (SELECT 1 FROM contributors)
  UNION ALL SELECT 'books' WHERE EXISTS (SELECT 1 FROM books)
  UNION ALL SELECT 'book_contributors' WHERE EXISTS (SELECT 1 FROM book_contributors)
  UNION ALL SELECT 'book_organizations' WHERE EXISTS (SELECT 1 FROM book_organizations)
  UNION ALL SELECT 'book_values' WHERE EXISTS (SELECT 1 FROM book_values)
  UNION ALL SELECT 'book_subjects' WHERE EXISTS (SELECT 1 FROM book_subjects)
  UNION ALL SELECT 'text_contents' WHERE EXISTS (SELECT 1 FROM text_contents)
  UNION ALL SELECT 'supporting_resources' WHERE EXISTS (SELECT 1 FROM supporting_resources)
  UNION ALL SELECT 'book_identifiers' WHERE EXISTS (SELECT 1 FROM book_identifiers)
  UNION ALL SELECT 'series' WHERE EXISTS (SELECT 1 FROM series)
  UNION ALL SELECT 'book_series' WHERE EXISTS (SELECT 1 FROM book_series)
  UNION ALL SELECT 'works' WHERE EXISTS (SELECT 1 FROM works)
  UNION ALL SELECT 'book_works' WHERE EXISTS (SELECT 1 FROM book_works)
  UNION ALL SELECT 'related_products' WHERE EXISTS (SELECT 1 FROM related_products)
  UNION ALL SELECT 'book_supplies' WHERE EXISTS (SELECT 1 FROM book_supplies)
  UNION ALL SELECT 'prices' WHERE EXISTS (SELECT 1 FROM prices)
  UNION ALL SELECT 'price_territories' WHERE EXISTS (SELECT 1 FROM price_territories)
) AS populated;
