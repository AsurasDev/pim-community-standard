-- Paso 3 de la simplificación de identificadores.
--
-- Se ejecuta después de `directus schema apply`, cuando ya existen
-- `book_identifiers` y `book_collections`. Los UUID se conservan.

BEGIN;

-- 1. Identificadores del producto: siguen siendo repetibles.
INSERT INTO book_identifiers (
  id, book_id, identifier_type, scheme_name, identifier_value, is_primary,
  date_created, date_updated
)
SELECT id, book_id, identifier_type, scheme_name, identifier_value, is_primary,
       date_created, date_updated
FROM onix_legacy.identifiers
WHERE entity_type = 'book'
ON CONFLICT (id) DO NOTHING;

-- 2. Las colecciones salen de book_values a su propia tabla.
INSERT INTO book_collections (
  id, book_id, collection_type, collection_title, sequence_number,
  date_created, date_updated
)
SELECT id, book_id, value_type, value_text, sequence_number,
       date_created, date_updated
FROM onix_legacy.collection_values
ON CONFLICT (id) DO NOTHING;

-- 3. Identificador principal de cada colección.
UPDATE book_collections
SET collection_identifier_type = source.identifier_type,
    collection_identifier_scheme = source.scheme_name,
    collection_identifier = source.identifier_value,
    date_updated = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (book_value_id)
         book_value_id, identifier_type, scheme_name, identifier_value
  FROM onix_legacy.identifiers
  WHERE entity_type = 'collection' AND book_value_id IS NOT NULL
  ORDER BY book_value_id, is_primary DESC NULLS LAST, date_created
) AS source
WHERE book_collections.id = source.book_value_id;

-- 4. Identificador principal de cada colaborador.
UPDATE contributors
SET name_identifier_type = source.identifier_type,
    name_identifier_scheme = source.scheme_name,
    name_identifier = source.identifier_value,
    date_updated = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (contributor_id)
         contributor_id, identifier_type, scheme_name, identifier_value
  FROM onix_legacy.identifiers
  WHERE entity_type = 'contributor' AND contributor_id IS NOT NULL
  ORDER BY contributor_id, is_primary DESC NULLS LAST, date_created
) AS source
WHERE contributors.id = source.contributor_id;

-- 5. Identificador principal de cada organización.
UPDATE organizations
SET name_identifier_type = source.identifier_type,
    name_identifier_scheme = source.scheme_name,
    name_identifier = source.identifier_value,
    date_updated = CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (organization_id)
         organization_id, identifier_type, scheme_name, identifier_value
  FROM onix_legacy.identifiers
  WHERE entity_type = 'organization' AND organization_id IS NOT NULL
  ORDER BY organization_id, is_primary DESC NULLS LAST, date_created
) AS source
WHERE organizations.id = source.organization_id;

-- 6. Las colecciones ya no son un grupo de book_values.
DELETE FROM book_values WHERE value_group = 'collection';

COMMIT;
