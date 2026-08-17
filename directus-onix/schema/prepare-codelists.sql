BEGIN;

UPDATE directus_collections
SET display_template = '{{identifier_value}}'
WHERE collection = 'book_identifiers';

COMMIT;
