import { aliasField, collections, folder, relations } from '../src/schema.mjs';

const dataTypes = {
  boolean: 'boolean',
  date: 'date',
  decimal: 'numeric',
  integer: 'integer',
  string: 'character varying',
  text: 'text',
  timestamp: 'timestamp with time zone',
  uuid: 'uuid'
};

const relationByField = new Map(
  relations.map((relation) => [`${relation.manyCollection}.${relation.manyField}`, relation])
);

const collectionMeta = (definition) => ({
  accountability: definition.meta.accountability ?? 'all',
  archive_app_filter: true,
  archive_field: null,
  archive_value: null,
  autosave_revision_interval: null,
  collapse: 'open',
  collection: definition.collection,
  color: null,
  display_template: definition.meta.display_template ?? null,
  group: definition.meta.group ?? null,
  hidden: definition.meta.hidden ?? false,
  icon: definition.meta.icon ?? null,
  item_duplication_fields: null,
  note: definition.meta.note ?? null,
  preview_url: null,
  singleton: definition.meta.singleton ?? false,
  sort: definition.meta.sort ?? null,
  sort_field: null,
  status: 'active',
  translations: definition.meta.translations ?? null,
  unarchive_value: null,
  versioning: definition.meta.versioning ?? false
});

const fieldMeta = (collection, definition, sort) => ({
  collection,
  conditions: definition.meta.conditions ?? null,
  display: definition.meta.display ?? null,
  display_options: definition.meta.display_options ?? null,
  field: definition.field,
  group: null,
  hidden: definition.meta.hidden ?? false,
  interface: definition.meta.interface ?? null,
  note: definition.meta.note ?? null,
  options: definition.meta.options ?? null,
  readonly: definition.meta.readonly ?? false,
  required: definition.meta.required ?? false,
  searchable: true,
  sort: definition.meta.sort ?? sort,
  special: definition.meta.special ?? null,
  translations: definition.meta.translations ?? null,
  validation: null,
  validation_message: null,
  width: definition.meta.width ?? 'full'
});

const fieldSchema = (collection, definition) => {
  if (definition.schema === null || definition.type === 'alias') return null;

  const relation = relationByField.get(`${collection}.${definition.field}`);
  return {
    name: definition.field,
    table: collection,
    data_type: dataTypes[definition.type],
    default_value: definition.schema.default_value ?? null,
    max_length: definition.type === 'string' ? (definition.schema.max_length ?? 255) : null,
    numeric_precision: definition.type === 'decimal'
      ? (definition.schema.numeric_precision ?? 15)
      : definition.type === 'integer' ? 32 : null,
    numeric_scale: definition.type === 'decimal'
      ? (definition.schema.numeric_scale ?? 4)
      : definition.type === 'integer' ? 0 : null,
    is_nullable: definition.schema.is_nullable ?? true,
    is_unique: definition.schema.is_unique ?? false,
    is_indexed: definition.schema.is_primary_key ? false : (definition.schema.is_indexed ?? false),
    is_primary_key: definition.schema.is_primary_key ?? false,
    is_generated: false,
    generation_expression: null,
    has_auto_increment: false,
    foreign_key_column: relation ? 'id' : null,
    foreign_key_table: relation?.oneCollection ?? null
  };
};

const snapshotCollections = [folder, ...collections].map((definition) => ({
  collection: definition.collection,
  meta: collectionMeta(definition),
  schema: definition.schema
}));

const snapshotFields = collections.flatMap((definition) => {
  const physicalFields = definition.fields.map((item, index) => ({
    collection: definition.collection,
    field: item.field,
    type: item.type,
    meta: fieldMeta(definition.collection, item, index + 1),
    schema: fieldSchema(definition.collection, item)
  }));

  const aliasFields = relations
    .filter((relation) => relation.oneCollection === definition.collection)
    .map((relation, index) => {
      const item = aliasField(relation);
      return {
        collection: definition.collection,
        field: item.field,
        type: item.type,
        meta: fieldMeta(definition.collection, item, definition.fields.length + index + 1),
        schema: null
      };
    });

  return [...physicalFields, ...aliasFields];
});

const snapshotRelations = relations.map((relation) => ({
  collection: relation.manyCollection,
  field: relation.manyField,
  related_collection: relation.oneCollection,
  meta: {
    junction_field: null,
    many_collection: relation.manyCollection,
    many_field: relation.manyField,
    one_allowed_collections: null,
    one_collection: relation.oneCollection,
    one_collection_field: null,
    one_deselect_action: relation.onDelete === 'CASCADE' ? 'delete' : 'nullify',
    one_field: relation.oneField,
    sort_field: null
  },
  schema: {
    table: relation.manyCollection,
    column: relation.manyField,
    foreign_key_table: relation.oneCollection,
    foreign_key_column: 'id',
    constraint_name: `${relation.manyCollection}_${relation.manyField}_foreign`,
    on_update: 'NO ACTION',
    on_delete: relation.onDelete
  }
}));

const snapshot = {
  version: 1,
  directus: '12.1.1',
  vendor: 'postgres',
  collections: snapshotCollections,
  fields: snapshotFields,
  systemFields: [],
  relations: snapshotRelations
};

process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
