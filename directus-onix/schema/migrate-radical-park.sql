-- Paso 1 de la consolidación a 8 colecciones.
--
-- Mueve las 25 tablas del modelo anterior al esquema `onix_legacy` y borra sus
-- metadatos de Directus. Mover la tabla de esquema arrastra sus índices y
-- restricciones, así que las colecciones nuevas pueden crearse después sin
-- colisiones de nombres. Al quedar el proyecto por debajo del límite de 25
-- colecciones, `directus schema apply` vuelve a estar disponible.

BEGIN;

CREATE SCHEMA IF NOT EXISTS onix_legacy;

DO $$
DECLARE
  legacy_tables CONSTANT text[] := ARRAY[
    'senders', 'books', 'identifiers', 'book_titles', 'book_form_details',
    'book_form_features', 'contributors', 'book_contributors', 'book_languages',
    'book_subjects', 'book_audiences', 'text_contents', 'organizations',
    'book_organizations', 'publishing_dates', 'book_extents', 'book_measures',
    'book_collections', 'sales_rights', 'book_supplies', 'prices',
    'price_territories', 'price_taxes', 'related_products', 'supporting_resources'
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
