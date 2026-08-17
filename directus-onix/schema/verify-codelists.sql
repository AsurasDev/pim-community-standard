\pset tuples_only on
\pset format unaligned

SELECT 'visible_onix_list_fields=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog'
  AND COALESCE(fields.hidden, FALSE) = FALSE
  AND COALESCE(fields.note, '') ILIKE '%ONIX Lista%';

SELECT 'visible_onix_list_dropdowns=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog'
  AND COALESCE(fields.hidden, FALSE) = FALSE
  AND COALESCE(fields.note, '') ILIKE '%ONIX Lista%'
  AND fields.interface = 'select-dropdown';

SELECT 'dropdown_fields=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog'
  AND fields.interface = 'select-dropdown';

SELECT 'base_choices=' || COALESCE(SUM(jsonb_array_length(COALESCE(fields.options::jsonb -> 'choices', '[]'::jsonb))), 0)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
WHERE collections."group" = 'onix_catalog'
  AND fields.interface = 'select-dropdown';

SELECT 'conditional_choices=' || COUNT(*)
FROM directus_fields AS fields
JOIN directus_collections AS collections
  ON collections.collection = fields.collection
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fields.conditions::jsonb, '[]'::jsonb)) AS condition
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(condition -> 'options' -> 'choices', '[]'::jsonb)) AS choice
WHERE collections."group" = 'onix_catalog';

SELECT 'code_prefixed_labels=' || COUNT(*)
FROM (
  SELECT choice
  FROM directus_fields AS fields
  JOIN directus_collections AS collections
    ON collections.collection = fields.collection
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fields.options::jsonb -> 'choices', '[]'::jsonb)) AS choice
  WHERE collections."group" = 'onix_catalog'

  UNION ALL

  SELECT choice
  FROM directus_fields AS fields
  JOIN directus_collections AS collections
    ON collections.collection = fields.collection
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fields.conditions::jsonb, '[]'::jsonb)) AS condition
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(condition -> 'options' -> 'choices', '[]'::jsonb)) AS choice
  WHERE collections."group" = 'onix_catalog'
) AS choices
WHERE choice ->> 'text' LIKE (choice ->> 'value') || ' —%';

SELECT 'converted_fields=' || COUNT(*)
FROM directus_fields
WHERE (collection, field) IN (
  ('books', 'edition_type'),
  ('book_contributors', 'role_code'),
  ('book_organizations', 'publishing_role'),
  ('book_values', 'value_group'),
  ('book_values', 'value_type'),
  ('book_values', 'value_code'),
  ('book_values', 'qualifier_code'),
  ('book_values', 'value_unit'),
  ('book_subjects', 'subject_code'),
  ('supporting_resources', 'file_format'),
  ('related_products', 'relation_code'),
  ('book_identifiers', 'identifier_type'),
  ('series', 'collection_identifier_type'),
  ('works', 'work_identifier_type'),
  ('book_works', 'work_relation_code'),
  ('contributors', 'name_identifier_type'),
  ('price_territories', 'territory_code')
)
  AND interface = 'select-dropdown';

SELECT 'country_CO_label=' || (choice ->> 'text')
FROM directus_fields AS fields
CROSS JOIN LATERAL jsonb_array_elements(fields.options::jsonb -> 'choices') AS choice
WHERE fields.collection = 'price_territories'
  AND fields.field = 'territory_code'
  AND choice ->> 'value' = 'CO';

SELECT 'file_D502_label=' || (choice ->> 'text')
FROM directus_fields AS fields
CROSS JOIN LATERAL jsonb_array_elements(fields.options::jsonb -> 'choices') AS choice
WHERE fields.collection = 'supporting_resources'
  AND fields.field = 'file_format'
  AND choice ->> 'value' = 'D502';

SELECT 'stored_resource_format=' || file_format
FROM supporting_resources
WHERE id = '00000000-0000-4000-8000-000000002201';

SELECT 'conditional_fields=' || COUNT(*)
FROM directus_fields
WHERE jsonb_array_length(COALESCE(conditions::jsonb, '[]'::jsonb)) > 0
  AND collection IN (
    SELECT collection
    FROM directus_collections
    WHERE "group" = 'onix_catalog'
  );

SELECT
  'identifier_typing=' ||
  (SELECT COUNT(*) FROM book_identifiers WHERE identifier_type IS NOT NULL) || '/' ||
  (SELECT COUNT(*) FROM related_products WHERE relation_code IS NOT NULL) || '/' ||
  (SELECT COUNT(*) FROM price_territories WHERE territory_type IS NOT NULL);

SELECT 'custom_json_columns=' || COUNT(*)
FROM information_schema.columns AS columns
JOIN directus_collections AS collections
  ON collections.collection = columns.table_name
WHERE columns.table_schema = 'public'
  AND collections."group" = 'onix_catalog'
  AND columns.data_type IN ('json', 'jsonb');
