import test from 'node:test';
import assert from 'node:assert/strict';
import { collections, relations, valueGroups } from '../src/schema.mjs';
import { lists, onixIssue } from '../src/codelists.mjs';
import { themaChoices, themaChoicesByScheme, themaVersion } from '../src/thema.mjs';

const fieldsByKey = new Map(collections.flatMap((collection) =>
  collection.fields.map((field) => [`${collection.collection}.${field.field}`, field])
));

const conditionsOf = (key) => fieldsByKey.get(key)?.meta.conditions ?? [];

test('el esquema no contiene campos JSON', () => {
  const jsonFields = collections.flatMap((collection) =>
    collection.fields.filter((field) => field.type === 'json').map((field) => `${collection.collection}.${field.field}`)
  );
  assert.deepEqual(jsonFields, []);
});

test('los códigos configurables tienen listas con opciones', () => {
  const dropdowns = collections.flatMap((collection) =>
    collection.fields.filter((field) => field.meta.interface === 'select-dropdown')
  );
  assert.ok(dropdowns.length >= 40, `solo hay ${dropdowns.length} desplegables`);
  for (const field of dropdowns) {
    const baseChoices = field.meta.options?.choices ?? [];
    const conditionalChoices = (field.meta.conditions ?? [])
      .flatMap((condition) => condition.options?.choices ?? []);
    assert.ok(baseChoices.length + conditionalChoices.length > 0, `${field.field} no tiene opciones`);

    for (const option of [...baseChoices, ...conditionalChoices]) {
      if (/^\d+$/.test(String(option.value))) {
        assert.notEqual(String(option.text).trim(), String(option.value), `${field.field} muestra solo el código ${option.value}`);
      }
      assert.equal(
        String(option.text).startsWith(`${option.value} —`),
        false,
        `${field.field} antepone el código a la descripción`
      );
    }
  }
});

test('todos los campos que citan una lista ONIX visible son seleccionables', () => {
  const offenders = collections.flatMap((collection) =>
    collection.fields
      .filter((field) => /ONIX Lista/i.test(field.meta.note ?? ''))
      .filter((field) => !field.meta.hidden && field.meta.interface !== 'select-dropdown')
      .map((field) => `${collection.collection}.${field.field}`)
  );
  assert.deepEqual(offenders, []);
});

test('las listas oficiales vigentes tienen cobertura completa', () => {
  assert.equal(onixIssue, 74);
  assert.ok(lists.productForm.length > 100);
  assert.ok(lists.formDetail.length > 300);
  assert.ok(lists.formFeatureType.length > 50);
  assert.ok(lists.languageCode.length > 300);
  assert.ok(lists.countryCode.length > 150);
  assert.ok(lists.currencyCode.length > 150);
});

test('el modelo tiene dieciocho colecciones físicas dentro del límite Core', () => {
  assert.equal(collections.length, 18);
  assert.ok(collections.length <= 25);
  assert.deepEqual(collections.map((collection) => collection.collection), [
    'organizations', 'contributors', 'books',
    'book_contributors', 'book_organizations',
    'book_values', 'book_subjects',
    'text_contents', 'supporting_resources',
    'book_identifiers', 'series', 'book_series',
    'works', 'book_works', 'related_products',
    'book_supplies', 'prices', 'price_territories'
  ]);
});

test('las colecciones se escriben una sola vez y los libros las referencian', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  assert.ok(names.has('series'));
  assert.ok(names.has('book_series'));
  assert.equal(names.has('book_collections'), false);

  // El título vive en el catálogo, no en el vínculo: no se puede repetir incoherente.
  const link = collections.find((collection) => collection.collection === 'book_series');
  const linkFields = new Set(link.fields.map((field) => field.field));
  assert.equal(linkFields.has('collection_title'), false);
  assert.ok(linkFields.has('series_id'));
  assert.ok(linkFields.has('sequence_number'));
  assert.ok(fieldsByKey.has('series.collection_title'));
  assert.equal(fieldsByKey.get('series.collection_title').schema.is_indexed, true);
});

test('las obras siguen el composite RelatedWork de ONIX', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  assert.ok(names.has('works'));
  assert.ok(names.has('book_works'));

  // <RelatedWork> es repetible por producto y lleva su código de relación.
  const relation = fieldsByKey.get('book_works.work_relation_code');
  assert.equal(relation.meta.options.choices, lists.workRelationCode);
  assert.equal(relation.meta.required, true);
  const codes = new Set(lists.workRelationCode.map((choice) => choice.value));
  for (const code of ['01', '29', '06']) {
    assert.ok(codes.has(code), `la Lista 164 no trae el código ${code}`);
  }

  // El identificador de obra usa la Lista 16, que ya no incluye ISTC.
  const identifier = fieldsByKey.get('works.work_identifier_type');
  assert.equal(identifier.meta.options.choices, lists.workIdentifierType);
  assert.ok(lists.workIdentifierType.some((choice) => choice.value === '33'));
  assert.equal(lists.workIdentifierType.some((choice) => /ISTC/i.test(choice.text)), false);

  // Un producto puede relacionarse con varias obras.
  assert.ok(relations.some((r) => r.manyCollection === 'book_works' && r.oneCollection === 'books'));
  assert.ok(relations.some((r) => r.manyCollection === 'book_works' && r.oneCollection === 'works'));
});

test('los identificadores dejan de ser polimórficos', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  assert.equal(names.has('identifiers'), false);
  assert.ok(names.has('book_identifiers'));

  // book_identifiers cuelga solo del libro y usa una única lista ONIX.
  const bookIdentifier = collections.find((collection) => collection.collection === 'book_identifiers');
  const refs = bookIdentifier.fields.filter((field) => field.meta.special?.includes('m2o'));
  assert.deepEqual(refs.map((field) => field.field), ['book_id']);
  assert.equal(fieldsByKey.get('book_identifiers.identifier_type').meta.options.choices, lists.identifierType);
  assert.equal(fieldsByKey.get('book_identifiers.identifier_type').meta.conditions, null);
  assert.equal(fieldsByKey.has('book_identifiers.entity_type'), false);

  // El identificador principal del resto de entidades es una columna.
  for (const key of [
    'contributors.name_identifier', 'contributors.name_identifier_type',
    'organizations.name_identifier', 'organizations.name_identifier_type',
    'series.collection_identifier', 'series.collection_identifier_type'
  ]) {
    assert.ok(fieldsByKey.has(key), `falta ${key}`);
  }
  assert.equal(fieldsByKey.get('contributors.name_identifier_type').meta.options.choices, lists.nameIdentifierType);
  assert.equal(fieldsByKey.get('series.collection_identifier_type').meta.options.choices, lists.collectionIdentifierType);
});

test('las colecciones y series salieron de book_values', () => {
  assert.equal(valueGroups.some((group) => group.value === 'collection'), false);
  assert.ok(relations.some((relation) =>
    relation.manyCollection === 'book_series' && relation.oneCollection === 'books'));
});

test('colaboradores y organizaciones están separados en catálogo y vínculo', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  for (const name of ['contributors', 'organizations', 'book_contributors', 'book_organizations']) {
    assert.ok(names.has(name), `falta ${name}`);
  }
  assert.equal(names.has('parties'), false);
  assert.equal(names.has('book_parties'), false);

  // El rol de colaborador y la función editorial usan listas ONIX distintas.
  assert.equal(fieldsByKey.get('book_contributors.role_code').meta.options.choices, lists.contributorRole);
  assert.equal(fieldsByKey.get('book_organizations.publishing_role').meta.options.choices, lists.publishingRole);
});

test('materias, textos, recursos, relacionados y territorios tienen colección propia', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  for (const name of [
    'book_subjects', 'text_contents', 'supporting_resources',
    'related_products', 'price_territories', 'book_identifiers', 'series'
  ]) {
    assert.ok(names.has(name), `falta ${name}`);
  }
  assert.equal(names.has('book_contents'), false);

  // Ninguno de esos elementos sigue dentro de book_values.
  assert.equal(valueGroups.some((group) => group.value === 'subject'), false);
  assert.equal(fieldsByKey.has('book_values.scheme_version'), false);
});

test('books guarda el estado actual y no rastrea notificaciones', () => {
  const bookFields = new Set(
    collections.find((collection) => collection.collection === 'books').fields.map((field) => field.field)
  );
  for (const removed of ['sender_id', 'notification_type']) {
    assert.equal(bookFields.has(removed), false, `books todavía tiene ${removed}`);
  }

  const organizationFields = new Set(
    collections.find((collection) => collection.collection === 'organizations').fields.map((field) => field.field)
  );
  for (const removed of ['sender_identifier', 'sender_identifier_type']) {
    assert.equal(organizationFields.has(removed), false, `organizations todavía tiene ${removed}`);
  }

  // Sin remitente no queda ninguna relación de envío.
  assert.equal(relations.some((relation) => relation.manyField === 'sender_id'), false);

  // La clave estable de actualización sigue existiendo.
  assert.equal(fieldsByKey.get('books.identity_key').schema.is_unique, true);
});

test('books sigue siendo el único registro maestro', () => {
  const names = new Set(collections.map((collection) => collection.collection));
  assert.ok(names.has('books'));
  assert.equal(names.has('product_records'), false);
  assert.equal(names.has('onix_receptions'), false);
  assert.ok(relations.filter((relation) => relation.oneCollection === 'books').length >= 10);
});

test('cada grupo de book_values tiene su lista ONIX de tipo', () => {
  const typeConditions = conditionsOf('book_values.value_type');
  assert.equal(typeConditions.length, valueGroups.length);

  const covered = typeConditions.map((condition) => condition.rule._and[0].value_group._eq);
  assert.deepEqual(covered.sort(), valueGroups.map((group) => group.value).sort());

  for (const condition of typeConditions) {
    assert.ok(condition.options.choices.length > 0, `${condition.name} no tiene opciones`);
    assert.equal(condition.hidden, false);
  }
});

test('Thema 1.6 está precargado y separado por esquema ONIX', () => {
  assert.equal(themaVersion, '1.6');
  assert.ok(themaChoices.length > 9000);
  assert.equal(new Set(themaChoices.map((choice) => choice.value)).size, themaChoices.length);

  const subjectCode = fieldsByKey.get('book_subjects.subject_code');
  assert.equal(subjectCode.meta.interface, 'select-dropdown');
  assert.equal(subjectCode.meta.options.allowOther, true);
  assert.equal(subjectCode.meta.display_options.choices.length, themaChoices.length);
  assert.equal(subjectCode.meta.conditions.length, 7);

  const conditionalChoices = subjectCode.meta.conditions
    .flatMap((condition) => condition.options.choices);
  assert.equal(conditionalChoices.length, themaChoices.length);
  assert.deepEqual(Object.keys(themaChoicesByScheme), ['93', '94', '95', '96', '97', '98', '99']);

  for (const condition of subjectCode.meta.conditions) {
    assert.ok(/^9[3-9]$/.test(condition.rule._and[0].scheme_identifier._eq));
  }
});

test('el nombre del esquema de materia solo aparece para esquemas propios', () => {
  const schemeName = fieldsByKey.get('book_subjects.scheme_name');
  assert.equal(schemeName.meta.hidden, true);
  assert.deepEqual(
    schemeName.meta.conditions.map((condition) => condition.rule._and[0].scheme_identifier._eq),
    ['23', '24']
  );
});

test('los códigos usados por los ejemplos existen en sus listas', () => {
  const includes = (choices, value) => choices.some((choice) => choice.value === value);
  for (const [name, value] of [
    ['productForm', 'BC'], ['productForm', 'ED'],
    ['editionType', 'NED'], ['publishingStatus', '04'], ['identifierType', '15'],
    ['nameIdentifierType', '16'], ['collectionIdentifierType', '01'],
    ['formDetail', 'B102'], ['formFeatureType', '01'], ['colorCode', 'GRN'],
    ['contributorRole', 'A01'], ['languageCode', 'spa'], ['countryCode', 'CO'],
    ['scriptCode', 'Latn'], ['subjectScheme', '93'], ['currencyCode', 'COP'],
    ['fileFormat', 'D502'], ['publishingRole', '01'], ['collectionType', '10'],
    ['titleType', '03'], ['titleElementLevel', '01'], ['dateRole', '01'],
    ['extentType', '00'], ['extentUnit', '03'], ['measureType', '01'],
    ['rightsType', '01'], ['taxType', '01'], ['relationCode', '06']
  ]) {
    assert.ok(includes(lists[name], value), `${name} no contiene ${value}`);
  }
});

test('las listas dependientes usan condiciones nativas de Directus', () => {
  for (const key of [
    'book_values.value_type',
    'book_values.value_code',
    'book_values.qualifier_code',
    'book_values.value_unit',
    'book_subjects.subject_code',
    'price_territories.territory_code'
  ]) {
    assert.ok(conditionsOf(key).length > 0, `${key} no tiene condiciones`);
  }
});

test('el territorio de los derechos depende del calificador', () => {
  const territoryConditions = conditionsOf('book_values.value_code').filter((condition) =>
    condition.name.startsWith('Derecho de venta ·')
  );
  assert.equal(territoryConditions.length, 2);
  assert.deepEqual(
    territoryConditions.map((condition) => condition.rule._and[1].qualifier_code._eq),
    ['country', 'region']
  );
});

test('los campos genéricos solo se muestran en los grupos que los usan', () => {
  const groupsFor = (key) => conditionsOf(key)
    .flatMap((condition) => {
      const clause = condition.rule._and[0].value_group;
      return clause._in ?? [clause._eq];
    });

  assert.deepEqual(groupsFor('book_values.value_number'), ['extent', 'measure']);
  assert.deepEqual(groupsFor('book_values.normalized_date'), ['date']);
  assert.deepEqual(groupsFor('book_values.included'), ['sales_right']);
  assert.deepEqual(groupsFor('book_values.value_text'), ['title', 'date']);

  for (const key of [
    'book_values.value_number', 'book_values.normalized_date',
    'book_values.included', 'book_values.value_text'
  ]) {
    assert.equal(fieldsByKey.get(key).meta.hidden, true, `${key} debería estar oculto por defecto`);
  }
});

test('cada relación referencia colecciones y campos existentes', () => {
  const byName = new Map(collections.map((collection) => [collection.collection, collection]));
  for (const relation of relations) {
    assert.ok(byName.has(relation.manyCollection), relation.manyCollection);
    assert.ok(byName.has(relation.oneCollection), relation.oneCollection);
    const many = byName.get(relation.manyCollection);
    assert.ok(many.fields.some((field) => field.field === relation.manyField), `${relation.manyCollection}.${relation.manyField}`);
  }
});

test('los alias O2M no chocan con campos físicos', () => {
  for (const collection of collections) {
    const physical = new Set(collection.fields.map((field) => field.field));
    const aliases = relations
      .filter((relation) => relation.oneCollection === collection.collection)
      .map((relation) => relation.oneField);
    assert.equal(new Set(aliases).size, aliases.length, `${collection.collection} repite un alias`);
    for (const alias of aliases) {
      assert.equal(physical.has(alias), false, `${collection.collection}.${alias} choca con un campo físico`);
    }
  }
});
