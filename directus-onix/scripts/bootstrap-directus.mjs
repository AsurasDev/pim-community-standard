import { aliasField, collections, folder, relations } from '../src/schema.mjs';
import { clientFromEnvironment, DirectusError } from '../src/directus-client.mjs';
import { seedSampleData } from '../src/sample-data.mjs';

const client = clientFromEnvironment();
await client.login();

async function ensureCollection(definition) {
  const current = await client.exists(`/collections/${definition.collection}`);
  if (!current) {
    await client.request('/collections', { method: 'POST', body: definition });
    return 'created';
  }
  await client.request(`/collections/${definition.collection}`, {
    method: 'PATCH', body: { meta: definition.meta }
  });
  return 'updated';
}

async function ensureField(collectionName, definition) {
  const current = await client.exists(`/fields/${collectionName}/${definition.field}`);
  if (!current) {
    await client.request(`/fields/${collectionName}`, { method: 'POST', body: definition });
    return 'created';
  }
  if (definition.field !== 'id') {
    await client.request(`/fields/${collectionName}/${definition.field}`, {
      method: 'PATCH', body: { meta: definition.meta }
    });
  }
  return 'updated';
}

async function ensureRelation(relation) {
  const current = await client.exists(`/relations/${relation.manyCollection}/${relation.manyField}`);
  if (current) return 'existing';
  await client.request('/relations', {
    method: 'POST',
    body: {
      collection: relation.manyCollection,
      field: relation.manyField,
      related_collection: relation.oneCollection,
      meta: {
        many_collection: relation.manyCollection,
        many_field: relation.manyField,
        one_collection: relation.oneCollection,
        one_field: relation.oneField,
        one_deselect_action: relation.onDelete === 'CASCADE' ? 'delete' : 'nullify'
      },
      schema: { on_update: 'NO ACTION', on_delete: relation.onDelete }
    }
  });
  return 'created';
}

const stats = { collections: 0, fields: 0, aliases: 0, relations: 0 };
await ensureCollection(folder);

for (const definition of collections) {
  const { fields, ...collectionDefinition } = definition;
  await ensureCollection({ ...collectionDefinition, fields });
  stats.collections += 1;
  for (const fieldDefinition of fields) {
    await ensureField(definition.collection, fieldDefinition);
    stats.fields += 1;
  }
}

for (const relation of relations) {
  await ensureField(relation.oneCollection, aliasField(relation));
  stats.aliases += 1;
  await ensureRelation(relation);
  stats.relations += 1;
}

await client.request('/settings', {
  method: 'PATCH',
  body: {
    project_name: 'Catálogo ONIX for Books',
    project_descriptor: 'Modelo relacional sin JSON — último estado por ISBN',
    default_language: 'es-ES'
  }
});

try {
  const sample = await seedSampleData(client);
  console.log(JSON.stringify({ ok: true, ...stats, sample }, null, 2));
} catch (error) {
  if (error instanceof DirectusError) {
    console.error(JSON.stringify({ status: error.status, body: error.body }, null, 2));
  }
  throw error;
}
