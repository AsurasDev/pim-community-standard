-- Paso 4 de la simplificación de identificadores.
--
-- Informa de lo que el modelo nuevo no puede representar y elimina el aparcado.
-- Ejecútalo solo después de revisar `verify.sql`.

\pset tuples_only on
\pset format unaligned

-- Entidades que tenían más de un identificador: solo se conserva el principal.
SELECT 'dropped_extra_identifiers=' || COALESCE(SUM(extras), 0)
FROM (
  SELECT COUNT(*) - 1 AS extras
  FROM onix_legacy.identifiers
  WHERE entity_type IN ('contributor', 'organization', 'collection')
  GROUP BY entity_type, COALESCE(contributor_id, organization_id, book_value_id)
  HAVING COUNT(*) > 1
) AS multiple;

SELECT 'unmapped_book_identifiers=' || COUNT(*)
FROM onix_legacy.identifiers AS legacy
WHERE legacy.entity_type = 'book'
  AND NOT EXISTS (SELECT 1 FROM book_identifiers WHERE book_identifiers.id = legacy.id);

SELECT 'unmapped_collections=' || COUNT(*)
FROM onix_legacy.collection_values AS legacy
WHERE NOT EXISTS (SELECT 1 FROM book_collections WHERE book_collections.id = legacy.id);

DROP SCHEMA onix_legacy CASCADE;
