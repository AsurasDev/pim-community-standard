import { collections, relations } from '../src/schema.mjs';
import { clientFromEnvironment } from '../src/directus-client.mjs';
import { themaChoices } from '../src/thema.mjs';

const client = clientFromEnvironment();
await client.login();

const remoteCollections = await client.request('/collections');
const customNames = new Set(collections.map((item) => item.collection));
const present = remoteCollections.data.filter((item) => customNames.has(item.collection));
if (present.length !== collections.length) {
  throw new Error(`Colecciones esperadas: ${collections.length}; presentes: ${present.length}.`);
}

const fields = await client.request('/fields');
const customFields = fields.data.filter((item) => customNames.has(item.collection));
const jsonFields = customFields.filter((item) => item.type === 'json');
if (jsonFields.length) throw new Error(`Se encontraron campos JSON: ${jsonFields.map((item) => `${item.collection}.${item.field}`).join(', ')}`);

const choiceFields = customFields.filter((item) => item.meta?.interface === 'select-dropdown');
const incompleteChoices = choiceFields.filter((item) => {
  const baseChoices = item.meta?.options?.choices ?? [];
  const conditionalChoices = (item.meta?.conditions ?? [])
    .flatMap((condition) => condition.options?.choices ?? []);
  return baseChoices.length + conditionalChoices.length === 0;
});
if (incompleteChoices.length) throw new Error('Hay listas desplegables sin opciones configuradas.');

const codePrefixedLabels = choiceFields.flatMap((item) => [
  ...(item.meta?.options?.choices ?? []),
  ...(item.meta?.conditions ?? []).flatMap((condition) => condition.options?.choices ?? [])
]).filter((option) => String(option.text).startsWith(`${option.value} —`));
if (codePrefixedLabels.length) throw new Error('Hay listas que anteponen el código a la descripción.');

const subjectCode = customFields.find((item) =>
  item.collection === 'book_subjects' && item.field === 'subject_code'
);
const remoteThemaChoices = (subjectCode?.meta?.conditions ?? [])
  .flatMap((condition) => condition.options?.choices ?? []);
if (remoteThemaChoices.length !== themaChoices.length) {
  throw new Error(`Códigos Thema esperados: ${themaChoices.length}; configurados: ${remoteThemaChoices.length}.`);
}
if ((subjectCode?.meta?.display_options?.choices ?? []).length !== themaChoices.length) {
  throw new Error('El display del código de materia no contiene todas las descripciones Thema.');
}

const remoteRelations = await client.request('/relations');
const relationKeys = new Set(remoteRelations.data.map((item) => `${item.collection}.${item.field}`));
for (const relation of relations) {
  const key = `${relation.manyCollection}.${relation.manyField}`;
  if (!relationKeys.has(key)) throw new Error(`Falta la relación ${key}.`);
}

const books = await client.request('/items/books?limit=10&fields=id,title,isbn13,product_form,publishing_status,active');
if (books.data.length < 2) throw new Error('No están disponibles los dos libros de ejemplo.');

const counts = {};
for (const name of [
  'organizations', 'contributors', 'identifiers', 'book_contributors', 'book_organizations',
  'book_values', 'book_subjects', 'text_contents', 'supporting_resources',
  'related_products', 'book_supplies', 'prices', 'price_territories'
]) {
  const response = await client.request(`/items/${name}?aggregate[count]=id`);
  counts[name] = Number(response.data[0].count.id);
  if (counts[name] < 1) throw new Error(`La colección ${name} no contiene ejemplos.`);
}

console.log(JSON.stringify({
  ok: true,
  collections: present.length,
  fields: customFields.length,
  choice_fields: choiceFields.length,
  thema_choices: remoteThemaChoices.length,
  relations: relations.length,
  json_fields: 0,
  books: books.data,
  sample_counts: counts
}, null, 2));
