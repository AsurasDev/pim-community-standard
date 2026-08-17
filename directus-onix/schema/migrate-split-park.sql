-- Paso 1 de la separación a 14 colecciones.
--
-- Aparca las ocho colecciones consolidadas en el esquema `onix_legacy` y borra
-- sus metadatos de Directus, para que `directus schema apply` pueda crear el
-- modelo separado sin colisiones de nombres de índices ni restricciones.

BEGIN;

CREATE SCHEMA IF NOT EXISTS onix_legacy;

DO $$
DECLARE
  legacy_tables CONSTANT text[] := ARRAY[
    'parties', 'books', 'book_parties', 'book_values',
    'book_contents', 'identifiers', 'book_supplies', 'prices'
  ];
  target text;
BEGIN
  FOREACH target IN ARRAY legacy_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = target
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA onix_legacy', target);
    END IF;
  END LOOP;

  DELETE FROM directus_fields WHERE collection = ANY (legacy_tables);
  DELETE FROM directus_relations
  WHERE many_collection = ANY (legacy_tables)
     OR one_collection = ANY (legacy_tables);
  DELETE FROM directus_presets WHERE collection = ANY (legacy_tables);
  DELETE FROM directus_permissions WHERE collection = ANY (legacy_tables);
  DELETE FROM directus_collections WHERE collection = ANY (legacy_tables);
END $$;

COMMIT;
