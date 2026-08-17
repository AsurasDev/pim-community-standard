-- Paso 4 de la separación a 14 colecciones.
--
-- Comprueba que no queda nada sin repartir y elimina el esquema aparcado.
-- Ejecútalo solo después de revisar la salida de `verify.sql`.

\pset tuples_only on
\pset format unaligned

SELECT 'unmapped_values=' || COUNT(*)
FROM onix_legacy.book_values AS legacy
WHERE NOT EXISTS (SELECT 1 FROM book_values WHERE book_values.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM book_subjects WHERE book_subjects.id = legacy.id);

SELECT 'unmapped_contents=' || COUNT(*)
FROM onix_legacy.book_contents AS legacy
WHERE NOT EXISTS (SELECT 1 FROM text_contents WHERE text_contents.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM supporting_resources WHERE supporting_resources.id = legacy.id);

SELECT 'unmapped_references=' || COUNT(*)
FROM onix_legacy.identifiers AS legacy
WHERE NOT EXISTS (SELECT 1 FROM identifiers WHERE identifiers.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM related_products WHERE related_products.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM price_territories WHERE price_territories.id = legacy.id);

SELECT 'unmapped_parties=' || COUNT(*)
FROM onix_legacy.parties AS legacy
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM contributors WHERE contributors.id = legacy.id);

SELECT 'unmapped_book_parties=' || COUNT(*)
FROM onix_legacy.book_parties AS legacy
WHERE NOT EXISTS (SELECT 1 FROM book_contributors WHERE book_contributors.id = legacy.id)
  AND NOT EXISTS (SELECT 1 FROM book_organizations WHERE book_organizations.id = legacy.id);

DROP SCHEMA onix_legacy CASCADE;
