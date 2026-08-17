-- Reconcilia colecciones repetidas antes de aplicar el título único.
--
-- Conserva la fila más antigua de cada título, repunta los vínculos hacia ella
-- y elimina el resto. Es idempotente.

BEGIN;

WITH canonical AS (
  SELECT DISTINCT ON (collection_title) collection_title, id
  FROM series
  ORDER BY collection_title, date_created, id
)
UPDATE book_series
SET series_id = canonical.id,
    date_updated = CURRENT_TIMESTAMP
FROM series AS duplicated
JOIN canonical ON canonical.collection_title = duplicated.collection_title
WHERE book_series.series_id = duplicated.id
  AND duplicated.id <> canonical.id;

DELETE FROM series
WHERE id NOT IN (
  SELECT DISTINCT ON (collection_title) id
  FROM series
  ORDER BY collection_title, date_created, id
);

COMMIT;
