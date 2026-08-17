BEGIN;

UPDATE identifiers
SET product_identifier_type = identifier_type,
    date_updated = CURRENT_TIMESTAMP
WHERE entity_type = 'book'
  AND product_identifier_type IS NULL
  AND identifier_type IS NOT NULL;

UPDATE identifiers
SET collection_identifier_type = identifier_type,
    date_updated = CURRENT_TIMESTAMP
WHERE entity_type = 'collection'
  AND collection_identifier_type IS NULL
  AND identifier_type IS NOT NULL;

UPDATE identifiers
SET name_identifier_type = identifier_type,
    date_updated = CURRENT_TIMESTAMP
WHERE entity_type IN ('contributor', 'organization')
  AND name_identifier_type IS NULL
  AND identifier_type IS NOT NULL;

COMMIT;
