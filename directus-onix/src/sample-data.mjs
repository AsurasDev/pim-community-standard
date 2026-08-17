const eqFilter = (filter) => {
  const params = new URLSearchParams({ limit: '1', fields: 'id' });
  for (const [field, value] of Object.entries(filter)) {
    params.set(`filter[${field}][_eq]`, String(value));
  }
  return params;
};

async function upsert(client, collection, filter, payload) {
  const result = await client.request(`/items/${collection}?${eqFilter(filter)}`);
  const existing = result.data[0];
  if (existing) {
    const updated = await client.request(`/items/${collection}/${existing.id}`, {
      method: 'PATCH', body: payload
    });
    return updated.data;
  }
  const created = await client.request(`/items/${collection}`, { method: 'POST', body: payload });
  return created.data;
}

export async function seedSampleData(client) {
  await upsert(client, 'organizations', { name: 'Distribuciones Medusa — Datos de ejemplo' }, {
    name: 'Distribuciones Medusa — Datos de ejemplo',
    contact_name: 'Equipo de metadatos',
    email: 'metadata@example.com'
  });

  const publisher = await upsert(client, 'organizations', { name: 'Editorial Horizonte Demo' }, {
    name: 'Editorial Horizonte Demo',
    website: 'https://example.com/editorial-horizonte',
    email: 'editorial@example.com',
    name_identifier_type: '01',
    name_identifier_scheme: 'Código editorial',
    name_identifier: 'HORIZONTE-DEMO'
  });
  const distributor = await upsert(client, 'organizations', { name: 'Distribuidora Andina Demo' }, {
    name: 'Distribuidora Andina Demo',
    website: 'https://example.com/distribuidora-andina',
    email: 'ventas@example.com'
  });

  const lucia = await upsert(client, 'contributors', { display_name: 'Lucía Herrera Demo' }, {
    contributor_type: 'person', display_name: 'Lucía Herrera Demo',
    names_before_key: 'Lucía', key_names: 'Herrera',
    name_identifier_type: '16',
    name_identifier_scheme: 'ISNI de ejemplo',
    name_identifier: '0000-0002-1825-0097'
  });
  const mateo = await upsert(client, 'contributors', { display_name: 'Mateo Salcedo Demo' }, {
    contributor_type: 'person', display_name: 'Mateo Salcedo Demo',
    names_before_key: 'Mateo', key_names: 'Salcedo'
  });

  const bookOne = await upsert(client, 'books', { identity_key: 'BOOK-0001' }, {
    identity_key: 'BOOK-0001',
    record_reference: 'BOOK-0001',
    isbn13: '9789580000013',
    gtin13: '9789580000013',
    title: 'Cartografías de la memoria',
    subtitle: 'Relatos de una ciudad imaginada',
    product_form: 'BC',
    product_form_description: 'Tapa blanda con solapas',
    edition_type: 'NED',
    edition_number: '1',
    edition_statement: 'Primera edición',
    publishing_status: '04',
    page_count: 288,
    active: true
  });

  const bookTwo = await upsert(client, 'books', { identity_key: 'BOOK-0002' }, {
    identity_key: 'BOOK-0002',
    record_reference: 'BOOK-0002',
    isbn13: '9789580000020',
    gtin13: '9789580000020',
    title: 'El jardín de las órbitas',
    subtitle: 'Una novela de ciencia y asombro',
    product_form: 'ED',
    product_form_description: 'EPUB descargable',
    edition_type: 'NED',
    edition_number: '1',
    edition_statement: 'Edición digital',
    publishing_status: '02',
    page_count: 224,
    active: true
  });

  for (const [book, isbn] of [[bookOne, '9789580000013'], [bookTwo, '9789580000020']]) {
    await upsert(client, 'book_identifiers', {
      book_id: book.id, identifier_value: isbn
    }, {
      book_id: book.id, identifier_type: '15',
      scheme_name: 'ISBN-13', identifier_value: isbn, is_primary: true
    });
  }

  const value = (book, group, payload) =>
    upsert(client, 'book_values', { book_id: book.id, value_group: group, value_type: payload.value_type }, {
      book_id: book.id, value_group: group, ...payload
    });

  await value(bookOne, 'title', {
    value_type: '03', value_code: '01', language_code: 'eng', script_code: 'Latn',
    value_text: 'Maps of Memory', sequence_number: 1
  });
  const series = await upsert(client, 'series', { collection_title: 'Biblioteca Horizonte' }, {
    collection_type: '10', collection_title: 'Biblioteca Horizonte',
    collection_identifier_type: '01',
    collection_identifier_scheme: 'Código de colección',
    collection_identifier: 'BH-DEMO'
  });
  await upsert(client, 'book_series', { book_id: bookOne.id, series_id: series.id }, {
    book_id: bookOne.id, series_id: series.id, sequence_number: 7
  });

  for (const [book, title] of [
    [bookOne, 'Cartografías de la memoria'],
    [bookTwo, 'El jardín de las órbitas']
  ]) {
    const work = await upsert(client, 'works', { title }, {
      title, original_language: 'spa', work_identifier_type: '01',
      work_identifier_scheme: 'Código de obra propio',
      work_identifier: `WORK-${title.split(' ').pop().toUpperCase()}`
    });
    // 01 = «Manifestación de»: el producto materializa esta obra.
    await upsert(client, 'book_works', { book_id: book.id, work_id: work.id }, {
      book_id: book.id, work_id: work.id, work_relation_code: '01'
    });
  }

  await value(bookOne, 'form_detail', { value_type: 'B102' });
  await value(bookOne, 'form_feature', {
    value_type: '01', value_code: 'GRN', value_note: 'Cubierta verde'
  });
  await value(bookOne, 'extent', { value_type: '00', value_number: 288, value_unit: '03' });
  await value(bookOne, 'measure', { value_type: '01', value_number: 230, value_unit: 'mm' });

  await value(bookOne, 'date', {
    value_type: '01', qualifier_code: '00', value_text: '20260515', normalized_date: '2026-05-15'
  });
  await value(bookTwo, 'date', {
    value_type: '01', qualifier_code: '00', value_text: '20260901', normalized_date: '2026-09-01'
  });

  for (const book of [bookOne, bookTwo]) {
    await value(book, 'language', {
      value_type: '01', value_code: 'spa', qualifier_code: 'CO', script_code: 'Latn'
    });
    await value(book, 'audience', {
      value_type: '01', value_code: '01', value_note: 'Público general'
    });
    await upsert(client, 'book_organizations', {
      book_id: book.id, organization_id: publisher.id
    }, {
      book_id: book.id, organization_id: publisher.id, publishing_role: '01'
    });
  }

  for (const country of ['CO', 'ES', 'MX']) {
    await upsert(client, 'book_values', {
      book_id: bookOne.id, value_group: 'sales_right', value_code: country
    }, {
      book_id: bookOne.id, value_group: 'sales_right', value_type: '01',
      qualifier_code: 'country', value_code: country, included: true
    });
  }

  await upsert(client, 'book_subjects', { book_id: bookOne.id, subject_code: 'FBA' }, {
    book_id: bookOne.id, scheme_identifier: '93', scheme_name: null, scheme_version: '1.6',
    subject_code: 'FBA', heading_text: 'Ficción moderna y contemporánea: literaria y general', is_main: true
  });
  await upsert(client, 'book_subjects', { book_id: bookTwo.id, subject_code: 'FL' }, {
    book_id: bookTwo.id, scheme_identifier: '93', scheme_name: null, scheme_version: '1.6',
    subject_code: 'FL', heading_text: 'Ciencia ficción', is_main: true
  });

  await upsert(client, 'book_contributors', { book_id: bookOne.id, contributor_id: lucia.id }, {
    book_id: bookOne.id, contributor_id: lucia.id, role_code: 'A01', sequence_number: 1,
    is_primary: true, biography: 'Autora colombiana ficticia utilizada para demostrar el modelo.'
  });
  await upsert(client, 'book_contributors', { book_id: bookTwo.id, contributor_id: mateo.id }, {
    book_id: bookTwo.id, contributor_id: mateo.id, role_code: 'A01', sequence_number: 1,
    is_primary: true, biography: 'Autor ficticio utilizado para demostrar el modelo.'
  });

  await upsert(client, 'text_contents', { book_id: bookOne.id, text_type: '03' }, {
    book_id: bookOne.id, text_type: '03', content_audience: '00', language_code: 'spa',
    text_format: '07', sequence_number: 1,
    content: 'Una cartógrafa reconstruye la memoria de una ciudad que cambia cada noche.'
  });
  await upsert(client, 'text_contents', { book_id: bookTwo.id, text_type: '03' }, {
    book_id: bookTwo.id, text_type: '03', content_audience: '00', language_code: 'spa',
    text_format: '07', sequence_number: 1,
    content: 'Una astrónoma descubre un jardín cuyas flores siguen órbitas imposibles.'
  });
  await upsert(client, 'supporting_resources', { book_id: bookOne.id, content_type: '01' }, {
    book_id: bookOne.id, content_type: '01', resource_mode: '01', content_audience: '00',
    caption: 'Cubierta de demostración', resource_format: '02', file_format: 'D502',
    width: 1200, height: 1800,
    resource_url: 'https://example.com/onix/covers/9789580000013.jpg', valid_from: '2026-05-01'
  });

  const supplyOne = await upsert(client, 'book_supplies', { book_id: bookOne.id, availability: '21' }, {
    book_id: bookOne.id, supplier_organization_id: distributor.id, supplier_role: '03',
    market_status: '04', availability: '21', order_time_days: 2
  });
  const supplyTwo = await upsert(client, 'book_supplies', { book_id: bookTwo.id, availability: '20' }, {
    book_id: bookTwo.id, supplier_organization_id: distributor.id, supplier_role: '03',
    market_status: '02', availability: '20', expected_ship_date: '2026-09-01', order_time_days: 0
  });

  const priceOne = await upsert(client, 'prices', { book_supply_id: supplyOne.id, currency_code: 'COP' }, {
    book_supply_id: supplyOne.id, price_type: '02', amount: 69000, currency_code: 'COP',
    valid_from: '2026-05-15', tax_type: '01', tax_rate: 0, tax_amount: 0, tax_included: true
  });
  const priceTwo = await upsert(client, 'prices', { book_supply_id: supplyTwo.id, currency_code: 'COP' }, {
    book_supply_id: supplyTwo.id, price_type: '02', amount: 45000, currency_code: 'COP',
    valid_from: '2026-09-01', tax_type: '01', tax_rate: 0, tax_amount: 0, tax_included: true
  });

  for (const price of [priceOne, priceTwo]) {
    await upsert(client, 'price_territories', { price_id: price.id, territory_code: 'CO' }, {
      price_id: price.id, territory_type: 'country', territory_code: 'CO', included: true
    });
  }

  await upsert(client, 'related_products', { book_id: bookOne.id, identifier_value: '9789580000020' }, {
    book_id: bookOne.id, related_book_id: bookTwo.id, relation_code: '06', identifier_type: '15',
    identifier_value: '9789580000020', product_form: 'ED'
  });

  return { books: [bookOne.id, bookTwo.id] };
}
