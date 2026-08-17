-- Paso 3 de la consolidación a 8 colecciones.
--
-- Traslada los datos aparcados en `onix_legacy` al modelo nuevo. Se ejecuta
-- después de `directus schema apply`, cuando las ocho tablas ya existen.
-- Los UUID se conservan, así que las referencias cruzadas siguen siendo válidas.

BEGIN;

-- 1. Partes: remitentes, organizaciones y colaboradores.
INSERT INTO parties (
  id, party_type, display_name, names_before_key, key_names, corporate_name,
  website, email, contact_name, sender_identifier, sender_identifier_type,
  date_created, date_updated
)
SELECT id, 'organization', name, NULL, NULL, name,
       NULL, email, contact_name, identifier, identifier_type,
       date_created, date_updated
FROM onix_legacy.senders
UNION ALL
SELECT id, 'organization', name, NULL, NULL, name,
       website, email, NULL, NULL, NULL,
       date_created, date_updated
FROM onix_legacy.organizations
UNION ALL
SELECT id, contributor_type, display_name, names_before_key, key_names, corporate_name,
       NULL, NULL, NULL, NULL, NULL,
       date_created, date_updated
FROM onix_legacy.contributors
ON CONFLICT (id) DO NOTHING;

-- 2. Libros: el maestro no cambia.
INSERT INTO books (
  id, sender_id, identity_key, record_reference, isbn13, gtin13,
  notification_type, title, subtitle, product_form, product_form_description,
  edition_type, edition_number, edition_statement, publishing_status,
  page_count, active, date_created, date_updated
)
SELECT id, sender_id, identity_key, record_reference, isbn13, gtin13,
       notification_type, title, subtitle, product_form, product_form_description,
       edition_type, edition_number, edition_statement, publishing_status,
       page_count, active, date_created, date_updated
FROM onix_legacy.books
ON CONFLICT (id) DO NOTHING;

-- 3. Elementos descriptivos: once colecciones antiguas en una sola.
INSERT INTO book_values (
  id, book_id, value_group, value_type, value_code, qualifier_code,
  language_code, script_code, value_text, value_label, value_note,
  value_number, value_unit, scheme_version, normalized_date,
  sequence_number, is_primary, included, date_created, date_updated
)
-- La primera rama fija el tipo de cada columna del UNION.
SELECT id, book_id, 'title', title_type, element_level, NULL::varchar,
       language_code, script_code, title_text, subtitle, NULL::text,
       NULL::numeric, NULL::varchar, NULL::varchar, NULL::date,
       sequence_number, FALSE, NULL::boolean, date_created, date_updated
FROM onix_legacy.book_titles
UNION ALL
SELECT id, book_id, 'collection', collection_type, NULL, NULL,
       NULL, NULL, collection_title, NULL, NULL,
       NULL, NULL, NULL, NULL,
       sequence_number, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_collections
UNION ALL
SELECT id, book_id, 'language', language_role, language_code, country_code,
       NULL, script_code, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_languages
UNION ALL
SELECT id, book_id, 'subject', scheme_identifier, subject_code, NULL,
       NULL, NULL, heading_text, scheme_name, NULL,
       NULL, NULL, scheme_version, NULL,
       NULL, is_main, NULL, date_created, date_updated
FROM onix_legacy.book_subjects
UNION ALL
SELECT id, book_id, 'audience', code_type, audience_code, NULL,
       NULL, NULL, NULL, qualifier, description,
       NULL, NULL, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_audiences
UNION ALL
SELECT id, book_id, 'form_detail', detail_code, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_form_details
UNION ALL
SELECT id, book_id, 'form_feature', feature_type, feature_value, NULL,
       NULL, NULL, NULL, NULL, description,
       NULL, NULL, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_form_features
UNION ALL
SELECT id, book_id, 'date', date_role, NULL, date_format,
       NULL, NULL, date_value, NULL, NULL,
       NULL, NULL, NULL, normalized_date,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.publishing_dates
UNION ALL
SELECT id, book_id, 'extent', extent_type, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL,
       extent_value, extent_unit, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_extents
UNION ALL
SELECT id, book_id, 'measure', measure_type, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL,
       measurement, measure_unit, NULL, NULL,
       NULL, FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_measures
UNION ALL
SELECT id, book_id, 'sales_right', rights_type, territory_code, territory_type,
       NULL, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL,
       NULL, FALSE, included, date_created, date_updated
FROM onix_legacy.sales_rights
ON CONFLICT (id) DO NOTHING;

-- 4. Partes del libro: colaboradores y funciones editoriales.
INSERT INTO book_parties (
  id, book_id, party_id, role_scheme, role_code, sequence_number,
  is_primary, biography, date_created, date_updated
)
SELECT id, book_id, contributor_id, 'contributor', role_code, sequence_number,
       is_primary, biography, date_created, date_updated
FROM onix_legacy.book_contributors
UNION ALL
SELECT id, book_id, organization_id, 'publishing', publishing_role, NULL,
       FALSE, NULL, date_created, date_updated
FROM onix_legacy.book_organizations
ON CONFLICT (id) DO NOTHING;

-- 5. Contenidos: textos descriptivos y recursos de apoyo.
INSERT INTO book_contents (
  id, book_id, content_kind, content_type, content_audience, language_code,
  sequence_number, text_format, content, resource_mode, caption,
  resource_format, file_format, width, height, resource_url,
  valid_from, valid_until, date_created, date_updated
)
-- La primera rama fija el tipo de cada columna del UNION.
SELECT id, book_id, 'text', text_type, content_audience, language_code,
       sequence_number, text_format, content, NULL::varchar, NULL::varchar,
       NULL::varchar, NULL::varchar, NULL::integer, NULL::integer, NULL::varchar,
       NULL::date, NULL::date, date_created, date_updated
FROM onix_legacy.text_contents
UNION ALL
SELECT id, book_id, 'resource', content_type, content_audience, NULL,
       NULL, NULL, NULL, resource_mode, caption,
       resource_format, file_format, width, height, resource_url,
       valid_from, valid_until, date_created, date_updated
FROM onix_legacy.supporting_resources
ON CONFLICT (id) DO NOTHING;

-- 6. Suministro.
INSERT INTO book_supplies (
  id, book_id, supplier_party_id, supplier_role, market_status,
  availability, expected_ship_date, order_time_days, date_created, date_updated
)
SELECT id, book_id, supplier_organization_id, supplier_role, market_status,
       availability, expected_ship_date, order_time_days, date_created, date_updated
FROM onix_legacy.book_supplies
ON CONFLICT (id) DO NOTHING;

-- 7. Precios con el tramo de impuesto aplanado. Si un precio tenía varios
--    tramos se conserva el primero; el resto se informa en la verificación.
INSERT INTO prices (
  id, book_supply_id, price_type, amount, currency_code, valid_from, valid_until,
  tax_type, tax_rate, tax_amount, tax_included, date_created, date_updated
)
SELECT price.id, price.book_supply_id, price.price_type, price.amount,
       price.currency_code, price.valid_from, price.valid_until,
       tax.tax_type, tax.tax_rate, tax.tax_amount, tax.included,
       price.date_created, price.date_updated
FROM onix_legacy.prices AS price
LEFT JOIN LATERAL (
  SELECT tax_type, tax_rate, tax_amount, included
  FROM onix_legacy.price_taxes
  WHERE price_taxes.price_id = price.id
  ORDER BY price_taxes.date_created, price_taxes.id
  LIMIT 1
) AS tax ON TRUE
ON CONFLICT (id) DO NOTHING;

-- 8. Identificadores, productos relacionados y territorios de precio.
INSERT INTO identifiers (
  id, reference_kind, entity_type, book_id, party_id, book_value_id, price_id,
  related_book_id, identifier_type, relation_code, product_form, territory_type,
  scheme_name, identifier_value, is_primary, included, date_created, date_updated
)
-- La primera rama fija el tipo de cada columna del UNION.
SELECT id, 'identifier',
       CASE entity_type
         WHEN 'book' THEN 'book'
         WHEN 'collection' THEN 'collection'
         ELSE 'party'
       END,
       book_id,
       COALESCE(contributor_id, organization_id),
       book_collection_id,
       NULL::uuid, NULL::uuid,
       COALESCE(product_identifier_type, collection_identifier_type,
                name_identifier_type, identifier_type),
       NULL::varchar, NULL::varchar, NULL::varchar,
       scheme_name, identifier_value, is_primary, NULL::boolean,
       date_created, date_updated
FROM onix_legacy.identifiers
UNION ALL
SELECT id, 'related_product', NULL,
       book_id, NULL, NULL, NULL,
       related_book_id,
       identifier_type, relation_code, product_form, NULL,
       NULL, COALESCE(identifier_value, '—'), FALSE, NULL,
       date_created, date_updated
FROM onix_legacy.related_products
UNION ALL
SELECT id, 'territory', NULL,
       NULL, NULL, NULL, price_id,
       NULL,
       NULL, NULL, NULL, territory_type,
       NULL, territory_code, FALSE, included,
       date_created, date_updated
FROM onix_legacy.price_territories
ON CONFLICT (id) DO NOTHING;

COMMIT;
