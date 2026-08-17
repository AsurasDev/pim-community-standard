\pset tuples_only on
\pset format unaligned

SELECT 'thema_conditions=' || jsonb_array_length(COALESCE(conditions::jsonb, '[]'::jsonb))
FROM directus_fields
WHERE collection = 'book_subjects'
  AND field = 'subject_code';

SELECT 'thema_choices=' || COUNT(*)
FROM directus_fields AS fields
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fields.conditions::jsonb, '[]'::jsonb)) AS condition
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(condition -> 'options' -> 'choices', '[]'::jsonb)) AS choice
WHERE fields.collection = 'book_subjects'
  AND fields.field = 'subject_code';

SELECT 'thema_display_choices=' || jsonb_array_length(COALESCE(display_options::jsonb -> 'choices', '[]'::jsonb))
FROM directus_fields
WHERE collection = 'book_subjects'
  AND field = 'subject_code';

SELECT 'thema_samples=' || COUNT(*)
FROM book_subjects
WHERE scheme_identifier BETWEEN '93' AND '99'
  AND scheme_name IS NULL
  AND scheme_version = '1.6';
