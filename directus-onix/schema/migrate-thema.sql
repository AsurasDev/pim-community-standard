BEGIN;

UPDATE book_subjects
SET scheme_name = NULL,
    scheme_version = '1.6',
    heading_text = CASE subject_code
      WHEN 'FBA' THEN 'Ficción moderna y contemporánea: literaria y general'
      WHEN 'FL' THEN 'Ciencia ficción'
      ELSE heading_text
    END,
    date_updated = CURRENT_TIMESTAMP
WHERE scheme_identifier BETWEEN '93' AND '99';

COMMIT;
