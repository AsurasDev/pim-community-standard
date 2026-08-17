-- Paso 4 de la consolidación a 8 colecciones.
--
-- Informa de lo que el modelo nuevo no puede representar y elimina el esquema
-- aparcado. Ejecútalo solo después de comprobar la salida de `verify.sql`.

\pset tuples_only on
\pset format unaligned

SELECT 'dropped_extra_tax_bands=' || COUNT(*)
FROM (
  SELECT price_id
  FROM onix_legacy.price_taxes
  GROUP BY price_id
  HAVING COUNT(*) > 1
) AS multi;

DROP SCHEMA onix_legacy CASCADE;
