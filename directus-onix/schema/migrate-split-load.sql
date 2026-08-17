-- Paso 3 de la separación a 14 colecciones.
--
-- Reparte los datos aparcados en `onix_legacy` entre las colecciones separadas.
-- Se ejecuta después de `directus schema apply`. Los UUID se conservan, así que
-- las referencias cruzadas siguen siendo válidas.

BEGIN;

-- 1. El catálogo de partes se separa en organizaciones y colaboradores.
INSERT INTO organizations (
  id, name, website, email, contact_name,
  sender_identifier, sender_identifier_type, date_created, date_updated
)
SELECT id, display_name, website, email, contact_name,
       sender_identifier, sender_identifier_type, date_created, date_updated
FROM onix_legacy.parties
WHERE party_type = 'organization'
ON CONFLICT (id) DO NOTHING;

INSERT INTO contributors (
  id, contributor_type, display_name, names_before_key, key_names,
  corporate_name, date_created, date_updated
)
SELECT id, party_type, display_name, names_before_key, key_names,
       corporate_name, date_created, date_updated
FROM onix_legacy.parties
WHERE party_type IN ('person', 'corporate')
ON CONFLICT (id) DO NOTHING;

-- 2. Libros: el maestro no cambia. El remitente es siempre una organización.
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

-- 3. El vínculo se separa por esquema de rol.
INSERT INTO book_contributors (
  id, book_id, contributor_id, role_code, sequence_number,
  is_primary, biography, date_created, date_updated
)
SELECT id, book_id, party_id, role_code, sequence_number,
       is_primary, biography, date_created, date_updated
FROM onix_legacy.book_parties
WHERE role_scheme = 'contributor'
ON CONFLICT (id) DO NOTHING;

INSERT INTO book_organizations (
  id, book_id, organization_id, publishing_role, date_created, date_updated
)
SELECT id, book_id, party_id, role_code, date_created, date_updated
FROM onix_legacy.book_parties
WHERE role_scheme = 'publishing'
ON CONFLICT (id) DO NOTHING;

-- 4. Elementos descriptivos, ya sin materias.
INSERT INTO book_values (
  id, book_id, value_group, value_type, value_code, qualifier_code,
  language_code, script_code, value_text, value_label, value_note,
  value_number, value_unit, normalized_date, sequence_number, included,
  date_created, date_updated
)
SELECT id, book_id, value_group, value_type, value_code, qualifier_code,
       language_code, script_code, value_text, value_label, value_note,
       value_number, value_unit, normalized_date, sequence_number, included,
       date_created, date_updated
FROM onix_legacy.book_values
WHERE value_group <> 'subject'
ON CONFLICT (id) DO NOTHING;

-- 5. Materias con su colección propia.
INSERT INTO book_subjects (
  id, book_id, scheme_identifier, scheme_name, scheme_version,
  subject_code, heading_text, is_main, date_created, date_updated
)
SELECT id, book_id, value_type, value_label, scheme_version,
       value_code, value_text, is_primary, date_created, date_updated
FROM onix_legacy.book_values
WHERE value_group = 'subject'
ON CONFLICT (id) DO NOTHING;

-- 6. Los contenidos se separan en textos y recursos.
INSERT INTO text_contents (
  id, book_id, text_type, content_audience, language_code, text_format,
  content, sequence_number, date_created, date_updated
)
SELECT id, book_id, content_type, content_audience, language_code, text_format,
       content, sequence_number, date_created, date_updated
FROM onix_legacy.book_contents
WHERE content_kind = 'text'
ON CONFLICT (id) DO NOTHING;

INSERT INTO supporting_resources (
  id, book_id, content_type, resource_mode, content_audience, caption,
  resource_format, file_format, width, height, resource_url,
  valid_from, valid_until, date_created, date_updated
)
SELECT id, book_id, content_type, resource_mode, content_audience, caption,
       resource_format, file_format, width, height, resource_url,
       valid_from, valid_until, date_created, date_updated
FROM onix_legacy.book_contents
WHERE content_kind = 'resource'
ON CONFLICT (id) DO NOTHING;

-- 7. Suministro y precios.
INSERT INTO book_supplies (
  id, book_id, supplier_organization_id, supplier_role, market_status,
  availability, expected_ship_date, order_time_days, date_created, date_updated
)
SELECT id, book_id, supplier_party_id, supplier_role, market_status,
       availability, expected_ship_date, order_time_days, date_created, date_updated
FROM onix_legacy.book_supplies
ON CONFLICT (id) DO NOTHING;

INSERT INTO prices (
  id, book_supply_id, price_type, amount, currency_code, valid_from, valid_until,
  tax_type, tax_rate, tax_amount, tax_included, date_created, date_updated
)
SELECT id, book_supply_id, price_type, amount, currency_code, valid_from, valid_until,
       tax_type, tax_rate, tax_amount, tax_included, date_created, date_updated
FROM onix_legacy.prices
ON CONFLICT (id) DO NOTHING;

-- 8. Los territorios de precio vuelven a su colección.
INSERT INTO price_territories (
  id, price_id, territory_type, territory_code, included, date_created, date_updated
)
SELECT id, price_id, territory_type, identifier_value, included,
       date_created, date_updated
FROM onix_legacy.identifiers
WHERE reference_kind = 'territory'
ON CONFLICT (id) DO NOTHING;

-- 9. Identificadores: la referencia a la parte se reparte según su tipo.
INSERT INTO identifiers (
  id, entity_type, book_id, contributor_id, organization_id, book_value_id,
  identifier_type, scheme_name, identifier_value, is_primary,
  date_created, date_updated
)
SELECT reference.id,
       CASE reference.entity_type
         WHEN 'book' THEN 'book'
         WHEN 'collection' THEN 'collection'
         ELSE CASE
           WHEN party.party_type = 'organization' THEN 'organization'
           ELSE 'contributor'
         END
       END,
       reference.book_id,
       CASE WHEN party.party_type IN ('person', 'corporate') THEN reference.party_id END,
       CASE WHEN party.party_type = 'organization' THEN reference.party_id END,
       reference.book_value_id,
       reference.identifier_type, reference.scheme_name,
       reference.identifier_value, reference.is_primary,
       reference.date_created, reference.date_updated
FROM onix_legacy.identifiers AS reference
LEFT JOIN onix_legacy.parties AS party ON party.id = reference.party_id
WHERE reference.reference_kind = 'identifier'
ON CONFLICT (id) DO NOTHING;

-- 10. Productos relacionados con su colección propia.
INSERT INTO related_products (
  id, book_id, related_book_id, relation_code, identifier_type,
  identifier_value, product_form, date_created, date_updated
)
SELECT id, book_id, related_book_id, relation_code, identifier_type,
       identifier_value, product_form, date_created, date_updated
FROM onix_legacy.identifiers
WHERE reference_kind = 'related_product'
ON CONFLICT (id) DO NOTHING;

COMMIT;
