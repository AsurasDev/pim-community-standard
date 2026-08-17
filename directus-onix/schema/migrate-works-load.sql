-- Paso 3: repartir las colecciones aparcadas entre catálogo y vínculo.
--
-- Se ejecuta después de `directus schema apply`. Los títulos repetidos colapsan
-- en una sola fila de `series`; el vínculo conserva su UUID original.

BEGIN;

-- 1. Catálogo: una fila por combinación de tipo y título.
INSERT INTO series (
  id, collection_type, collection_title,
  collection_identifier_type, collection_identifier_scheme, collection_identifier,
  date_created, date_updated
)
SELECT DISTINCT ON (collection_title)
       gen_random_uuid(), collection_type, collection_title,
       collection_identifier_type, collection_identifier_scheme, collection_identifier,
       date_created, date_updated
FROM onix_legacy.book_collections
ORDER BY collection_title, collection_identifier NULLS LAST, date_created;

-- 2. Vínculo: cada libro apunta a su fila del catálogo.
INSERT INTO book_series (
  id, book_id, series_id, sequence_number, date_created, date_updated
)
SELECT legacy.id, legacy.book_id, series.id, legacy.sequence_number,
       legacy.date_created, legacy.date_updated
FROM onix_legacy.book_collections AS legacy
JOIN series ON series.collection_title = legacy.collection_title
ON CONFLICT (id) DO NOTHING;

COMMIT;
