BEGIN;

UPDATE directus_settings
SET project_name = 'Catálogo ONIX for Books',
    project_descriptor = 'Modelo relacional sin JSON — último estado por libro',
    default_language = 'es-ES';

INSERT INTO organizations (
  id, name, website, email, contact_name,
  name_identifier_type, name_identifier_scheme, name_identifier,
  date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'Distribuciones Medusa — Datos de ejemplo', NULL, 'metadata@example.com',
    'Equipo de metadatos', NULL, NULL, NULL,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000010', 'Editorial Horizonte Demo',
    'https://example.com/editorial-horizonte', 'editorial@example.com',
    NULL, '01', 'Código editorial', 'HORIZONTE-DEMO',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000011', 'Distribuidora Andina Demo',
    'https://example.com/distribuidora-andina', 'ventas@example.com',
    NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  website = EXCLUDED.website,
  email = EXCLUDED.email,
  contact_name = EXCLUDED.contact_name,
  name_identifier_type = EXCLUDED.name_identifier_type,
  name_identifier_scheme = EXCLUDED.name_identifier_scheme,
  name_identifier = EXCLUDED.name_identifier,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO contributors (
  id, contributor_type, display_name, names_before_key, key_names,
  corporate_name, name_identifier_type, name_identifier_scheme, name_identifier,
  date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000020', 'person', 'Lucía Herrera Demo',
    'Lucía', 'Herrera', NULL, '16', 'ISNI de ejemplo', '0000-0002-1825-0097',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000021', 'person', 'Mateo Salcedo Demo',
    'Mateo', 'Salcedo', NULL, NULL, NULL, NULL,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  contributor_type = EXCLUDED.contributor_type,
  display_name = EXCLUDED.display_name,
  names_before_key = EXCLUDED.names_before_key,
  key_names = EXCLUDED.key_names,
  corporate_name = EXCLUDED.corporate_name,
  name_identifier_type = EXCLUDED.name_identifier_type,
  name_identifier_scheme = EXCLUDED.name_identifier_scheme,
  name_identifier = EXCLUDED.name_identifier,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO books (
  id, identity_key, record_reference, isbn13, gtin13,
  title, subtitle, product_form, product_form_description,
  edition_type, edition_number, edition_statement, publishing_status,
  page_count, active, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    'BOOK-0001', 'BOOK-0001', '9789580000013', '9789580000013',
    'Cartografías de la memoria', 'Relatos de una ciudad imaginada',
    'BC', 'Tapa blanda con solapas', 'NED', '1', 'Primera edición', '04',
    288, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'BOOK-0002', 'BOOK-0002', '9789580000020', '9789580000020',
    'El jardín de las órbitas', 'Una novela de ciencia y asombro',
    'ED', 'EPUB descargable', 'NED', '1', 'Edición digital', '02',
    224, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  identity_key = EXCLUDED.identity_key,
  record_reference = EXCLUDED.record_reference,
  isbn13 = EXCLUDED.isbn13,
  gtin13 = EXCLUDED.gtin13,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  product_form = EXCLUDED.product_form,
  product_form_description = EXCLUDED.product_form_description,
  edition_type = EXCLUDED.edition_type,
  edition_number = EXCLUDED.edition_number,
  edition_statement = EXCLUDED.edition_statement,
  publishing_status = EXCLUDED.publishing_status,
  page_count = EXCLUDED.page_count,
  active = EXCLUDED.active,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_contributors (
  id, book_id, contributor_id, role_code, sequence_number, is_primary,
  biography, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000020',
    'A01', 1, TRUE,
    'Autora colombiana ficticia utilizada para demostrar el modelo.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000021',
    'A01', 1, TRUE,
    'Autor ficticio utilizado para demostrar el modelo.',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  contributor_id = EXCLUDED.contributor_id,
  role_code = EXCLUDED.role_code,
  sequence_number = EXCLUDED.sequence_number,
  is_primary = EXCLUDED.is_primary,
  biography = EXCLUDED.biography,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_organizations (
  id, book_id, organization_id, publishing_role, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000001101',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000010',
    '01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001102',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000010',
    '01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  organization_id = EXCLUDED.organization_id,
  publishing_role = EXCLUDED.publishing_role,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_values (
  id, book_id, value_group, value_type, value_code, qualifier_code,
  language_code, script_code, value_text, value_label, value_note,
  value_number, value_unit, normalized_date, sequence_number, included,
  date_created, date_updated
)
VALUES
  -- Título alternativo en inglés.
  (
    '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101',
    'title', '03', '01', NULL, 'eng', 'Latn', 'Maps of Memory', NULL, NULL,
    NULL, NULL, NULL, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Idiomas del texto.
  (
    '00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000101',
    'language', '01', 'spa', 'CO', NULL, 'Latn', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000102',
    'language', '01', 'spa', 'CO', NULL, 'Latn', NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Audiencias.
  (
    '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000101',
    'audience', '01', '01', NULL, NULL, NULL, NULL, NULL, 'Público general',
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000902', '00000000-0000-4000-8000-000000000102',
    'audience', '01', '01', NULL, NULL, NULL, NULL, NULL, 'Público general',
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Detalle y característica de formato.
  (
    '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101',
    'form_detail', 'B102', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101',
    'form_feature', '01', 'GRN', NULL, NULL, NULL, NULL, NULL, 'Cubierta verde',
    NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Fechas de publicación.
  (
    '00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-000000000101',
    'date', '01', NULL, '00', NULL, NULL, '20260515', NULL, NULL,
    NULL, NULL, DATE '2026-05-15', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001202', '00000000-0000-4000-8000-000000000102',
    'date', '01', NULL, '00', NULL, NULL, '20260901', NULL, NULL,
    NULL, NULL, DATE '2026-09-01', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Extensión y medida.
  (
    '00000000-0000-4000-8000-000000001301', '00000000-0000-4000-8000-000000000101',
    'extent', '00', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    288, '03', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001401', '00000000-0000-4000-8000-000000000101',
    'measure', '01', NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    230, 'mm', NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  -- Derechos de venta por territorio.
  (
    '00000000-0000-4000-8000-000000001601', '00000000-0000-4000-8000-000000000101',
    'sales_right', '01', 'CO', 'country', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001602', '00000000-0000-4000-8000-000000000101',
    'sales_right', '01', 'ES', 'country', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001603', '00000000-0000-4000-8000-000000000101',
    'sales_right', '01', 'MX', 'country', NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  value_group = EXCLUDED.value_group,
  value_type = EXCLUDED.value_type,
  value_code = EXCLUDED.value_code,
  qualifier_code = EXCLUDED.qualifier_code,
  language_code = EXCLUDED.language_code,
  script_code = EXCLUDED.script_code,
  value_text = EXCLUDED.value_text,
  value_label = EXCLUDED.value_label,
  value_note = EXCLUDED.value_note,
  value_number = EXCLUDED.value_number,
  value_unit = EXCLUDED.value_unit,
  normalized_date = EXCLUDED.normalized_date,
  sequence_number = EXCLUDED.sequence_number,
  included = EXCLUDED.included,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_subjects (
  id, book_id, scheme_identifier, scheme_name, scheme_version,
  subject_code, heading_text, is_main, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000801',
    '00000000-0000-4000-8000-000000000101',
    '93', NULL, '1.6', 'FBA', 'Ficción moderna y contemporánea: literaria y general', TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000802',
    '00000000-0000-4000-8000-000000000102',
    '93', NULL, '1.6', 'FL', 'Ciencia ficción', TRUE,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  scheme_identifier = EXCLUDED.scheme_identifier,
  scheme_name = EXCLUDED.scheme_name,
  scheme_version = EXCLUDED.scheme_version,
  subject_code = EXCLUDED.subject_code,
  heading_text = EXCLUDED.heading_text,
  is_main = EXCLUDED.is_main,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO text_contents (
  id, book_id, text_type, content_audience, language_code, text_format,
  content, sequence_number, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000001001',
    '00000000-0000-4000-8000-000000000101',
    '03', '00', 'spa', '07',
    'Una cartógrafa reconstruye la memoria de una ciudad que cambia cada noche.',
    1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001002',
    '00000000-0000-4000-8000-000000000102',
    '03', '00', 'spa', '07',
    'Una astrónoma descubre un jardín cuyas flores siguen órbitas imposibles.',
    1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  text_type = EXCLUDED.text_type,
  content_audience = EXCLUDED.content_audience,
  language_code = EXCLUDED.language_code,
  text_format = EXCLUDED.text_format,
  content = EXCLUDED.content,
  sequence_number = EXCLUDED.sequence_number,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO supporting_resources (
  id, book_id, content_type, resource_mode, content_audience, caption,
  resource_format, file_format, width, height, resource_url,
  valid_from, valid_until, date_created, date_updated
)
VALUES (
  '00000000-0000-4000-8000-000000002201',
  '00000000-0000-4000-8000-000000000101',
  '01', '01', '00', 'Cubierta de demostración',
  '02', 'D502', 1200, 1800,
  'https://example.com/onix/covers/9789580000013.jpg',
  DATE '2026-05-01', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  content_type = EXCLUDED.content_type,
  resource_mode = EXCLUDED.resource_mode,
  content_audience = EXCLUDED.content_audience,
  caption = EXCLUDED.caption,
  resource_format = EXCLUDED.resource_format,
  file_format = EXCLUDED.file_format,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  resource_url = EXCLUDED.resource_url,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_identifiers (
  id, book_id, identifier_type, scheme_name, identifier_value, is_primary,
  date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    '15', 'ISBN-13', '9789580000013', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    '15', 'ISBN-13', '9789580000020', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  identifier_type = EXCLUDED.identifier_type,
  scheme_name = EXCLUDED.scheme_name,
  identifier_value = EXCLUDED.identifier_value,
  is_primary = EXCLUDED.is_primary,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO series (
  id, collection_type, collection_title,
  collection_identifier_type, collection_identifier_scheme, collection_identifier,
  date_created, date_updated
)
VALUES (
  gen_random_uuid(),
  '10', 'Biblioteca Horizonte',
  '01', 'Código de colección', 'BH-DEMO',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (collection_title) DO UPDATE SET
  collection_type = EXCLUDED.collection_type,
  collection_identifier_type = EXCLUDED.collection_identifier_type,
  collection_identifier_scheme = EXCLUDED.collection_identifier_scheme,
  collection_identifier = EXCLUDED.collection_identifier,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_series (
  id, book_id, series_id, sequence_number, date_created, date_updated
)
SELECT
  '00000000-0000-4000-8000-000000001501',
  '00000000-0000-4000-8000-000000000101',
  series.id,
  7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM series
WHERE series.collection_title = 'Biblioteca Horizonte'
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  series_id = EXCLUDED.series_id,
  sequence_number = EXCLUDED.sequence_number,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO works (
  id, title, original_language,
  work_identifier_type, work_identifier_scheme, work_identifier,
  date_created, date_updated
)
VALUES
  (
    gen_random_uuid(),
    'Cartografías de la memoria', 'spa',
    '01', 'Código de obra propio', 'WORK-CARTOGRAFIAS',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'El jardín de las órbitas', 'spa',
    '01', 'Código de obra propio', 'WORK-JARDIN',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (work_identifier) DO UPDATE SET
  title = EXCLUDED.title,
  original_language = EXCLUDED.original_language,
  work_identifier_type = EXCLUDED.work_identifier_type,
  work_identifier_scheme = EXCLUDED.work_identifier_scheme,
  work_identifier = EXCLUDED.work_identifier,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_works (
  id, book_id, work_id, work_relation_code, date_created, date_updated
)
SELECT link.id, link.book_id, works.id, '01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('00000000-0000-4000-8000-000000002401'::uuid,
     '00000000-0000-4000-8000-000000000101'::uuid, 'WORK-CARTOGRAFIAS'),
    ('00000000-0000-4000-8000-000000002402'::uuid,
     '00000000-0000-4000-8000-000000000102'::uuid, 'WORK-JARDIN')
) AS link(id, book_id, work_identifier)
JOIN works ON works.work_identifier = link.work_identifier
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  work_id = EXCLUDED.work_id,
  work_relation_code = EXCLUDED.work_relation_code,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO related_products (
  id, book_id, related_book_id, relation_code, identifier_type,
  identifier_value, product_form, date_created, date_updated
)
VALUES (
  '00000000-0000-4000-8000-000000002101',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102',
  '06', '15', '9789580000020', 'ED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  related_book_id = EXCLUDED.related_book_id,
  relation_code = EXCLUDED.relation_code,
  identifier_type = EXCLUDED.identifier_type,
  identifier_value = EXCLUDED.identifier_value,
  product_form = EXCLUDED.product_form,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO book_supplies (
  id, book_id, supplier_organization_id, supplier_role, market_status,
  availability, expected_ship_date, order_time_days, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000001701',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000011',
    '03', '04', '21', NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001702',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000011',
    '03', '02', '20', DATE '2026-09-01', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_id = EXCLUDED.book_id,
  supplier_organization_id = EXCLUDED.supplier_organization_id,
  supplier_role = EXCLUDED.supplier_role,
  market_status = EXCLUDED.market_status,
  availability = EXCLUDED.availability,
  expected_ship_date = EXCLUDED.expected_ship_date,
  order_time_days = EXCLUDED.order_time_days,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO prices (
  id, book_supply_id, price_type, amount, currency_code, valid_from, valid_until,
  tax_type, tax_rate, tax_amount, tax_included, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000001801',
    '00000000-0000-4000-8000-000000001701',
    '02', 69000, 'COP', DATE '2026-05-15', NULL,
    '01', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001802',
    '00000000-0000-4000-8000-000000001702',
    '02', 45000, 'COP', DATE '2026-09-01', NULL,
    '01', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  book_supply_id = EXCLUDED.book_supply_id,
  price_type = EXCLUDED.price_type,
  amount = EXCLUDED.amount,
  currency_code = EXCLUDED.currency_code,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  tax_type = EXCLUDED.tax_type,
  tax_rate = EXCLUDED.tax_rate,
  tax_amount = EXCLUDED.tax_amount,
  tax_included = EXCLUDED.tax_included,
  date_updated = CURRENT_TIMESTAMP;

INSERT INTO price_territories (
  id, price_id, territory_type, territory_code, included, date_created, date_updated
)
VALUES
  (
    '00000000-0000-4000-8000-000000001901',
    '00000000-0000-4000-8000-000000001801',
    'country', 'CO', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000001902',
    '00000000-0000-4000-8000-000000001802',
    'country', 'CO', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO UPDATE SET
  price_id = EXCLUDED.price_id,
  territory_type = EXCLUDED.territory_type,
  territory_code = EXCLUDED.territory_code,
  included = EXCLUDED.included,
  date_updated = CURRENT_TIMESTAMP;

COMMIT;
