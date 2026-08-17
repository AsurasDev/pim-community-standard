import { collections } from '../src/schema.mjs';

const targetFields = ['scheme_name', 'scheme_version', 'subject_code'];

const subjectFields = collections
  .find((collection) => collection.collection === 'book_subjects')
  .fields.filter((field) => targetFields.includes(field.field));

const sqlString = (value) => value === null || value === undefined
  ? 'NULL'
  : `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => value === null || value === undefined
  ? 'NULL'
  : `${sqlString(JSON.stringify(value))}::json`;
const sqlBoolean = (value) => value ? 'TRUE' : 'FALSE';

const statements = subjectFields.map((field) => `UPDATE directus_fields
SET interface = ${sqlString(field.meta.interface)},
    options = ${sqlJson(field.meta.options)},
    display = ${sqlString(field.meta.display)},
    display_options = ${sqlJson(field.meta.display_options)},
    hidden = ${sqlBoolean(field.meta.hidden)},
    required = ${sqlBoolean(field.meta.required)},
    note = ${sqlString(field.meta.note)},
    conditions = ${sqlJson(field.meta.conditions)}
WHERE collection = 'book_subjects'
  AND field = ${sqlString(field.field)};`);

process.stdout.write(`BEGIN;\n\n${statements.join('\n\n')}\n\nCOMMIT;\n`);
