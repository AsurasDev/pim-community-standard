-- Paso 1 de la simplificación de identificadores.
--
-- `identifiers` deja de ser polimórfica: los del libro pasan a `book_identifiers`
-- y el identificador principal de colaboradores, organizaciones y colecciones se
-- convierte en columnas. Las colecciones salen de `book_values` a tabla propia.
--
-- Aquí solo se copia lo que `directus schema apply` va a destruir.

BEGIN;

CREATE SCHEMA IF NOT EXISTS onix_legacy;

DROP TABLE IF EXISTS onix_legacy.identifiers;
DROP TABLE IF EXISTS onix_legacy.collection_values;

CREATE TABLE onix_legacy.identifiers AS
SELECT * FROM identifiers;

CREATE TABLE onix_legacy.collection_values AS
SELECT * FROM book_values WHERE value_group = 'collection';

COMMIT;
