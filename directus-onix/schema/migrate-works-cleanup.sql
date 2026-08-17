-- Paso 4: informar de la deduplicación y eliminar el aparcado.

\pset tuples_only on
\pset format unaligned

-- Filas de colección que se fusionaron por compartir tipo y título.
SELECT 'collections_deduplicated=' ||
       (COUNT(*) - COUNT(DISTINCT (collection_type, collection_title)))
FROM onix_legacy.book_collections;

SELECT 'unmapped_book_series=' || COUNT(*)
FROM onix_legacy.book_collections AS legacy
WHERE NOT EXISTS (SELECT 1 FROM book_series WHERE book_series.id = legacy.id);

DROP SCHEMA onix_legacy CASCADE;
