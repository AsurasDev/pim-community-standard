-- Paso 1: catálogo de colecciones separado del vínculo, y alta de obras.
--
-- `book_collections` repetía el título de la colección en cada libro, así que la
-- misma serie podía escribirse de varias formas. Pasa a ser `series` (catálogo,
-- un título por fila) más `book_series` (vínculo con el número de la colección).
-- Aquí solo se copia lo que `directus schema apply` va a destruir.

BEGIN;

CREATE SCHEMA IF NOT EXISTS onix_legacy;
DROP TABLE IF EXISTS onix_legacy.book_collections;

CREATE TABLE onix_legacy.book_collections AS
SELECT * FROM book_collections;

COMMIT;
