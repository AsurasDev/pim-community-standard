import { akeneoClientFromEnvironment } from '../src/akeneo-client.mjs';
import {
  CHANNEL,
  CURRENCY,
  LOCALE,
  attributeGroups,
  attributes,
  associationTypes,
  family,
  optionPayload,
  rejectedChoices
} from '../src/akeneo-catalog.mjs';

const dryRun = process.argv.includes('--dry-run');
const skipOptions = process.argv.includes('--skip-options');
const log = (message) => process.stdout.write(`${message}\n`);

/* ---------------------------------------------------------------- validación */

const problems = [];
let totalOptions = 0;

for (const attribute of attributes) {
  const choices = attribute.choices ?? [];
  totalOptions += choices.length;
  const rejected = rejectedChoices(choices, attribute.encodeCode);
  if (rejected.length) {
    problems.push(`${attribute.code}: ${rejected.length} códigos no válidos para Akeneo → ${rejected.slice(0, 8).join(', ')}`);
  }
}

log('── Validación de códigos ──');
log(`  atributos: ${attributes.length}`);
log(`  opciones desde listas ONIX: ${totalOptions}`);
if (problems.length) {
  for (const problem of problems) log(`  ⚠ ${problem}`);
} else {
  log('  ✓ todos los códigos ONIX encajan en el patrón [a-zA-Z0-9_] de Akeneo');
}

if (dryRun) {
  log('\nPasada en seco: no se ha escrito nada en Akeneo.');
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) {
  throw new Error('Hay códigos ONIX incompatibles; revísalos antes de escribir en Akeneo.');
}

/* ------------------------------------------------------------------ escritura */

const client = akeneoClientFromEnvironment();

log('\n── Canal y locales ──');
const channel = await client.request(`/channels/${CHANNEL}`);
const locales = [...new Set([...(channel.locales ?? []), LOCALE])];
const currencies = [...new Set([...(channel.currencies ?? []), CURRENCY])];
await client.upsert('channels', CHANNEL, {
  code: CHANNEL,
  locales,
  currencies,
  category_tree: channel.category_tree
});
log(`  ${CHANNEL}: locales ${locales.join(', ')} · monedas ${currencies.join(', ')}`);

log('\n── Grupos de atributos ──');
const groupSummary = await client.upsertMany('attribute-groups', attributeGroups, {
  label: 'grupos'
});
log(`  ${groupSummary.ok} creados o actualizados, ${groupSummary.failed} fallidos`);
if (groupSummary.failed) log(`  ${JSON.stringify(groupSummary.errors, null, 2)}`);

log('\n── Atributos ──');
const attributePayload = attributes.map(({ choices, dynamicOptions, encodeCode, ...attribute }) => ({
  ...attribute,
  localizable: attribute.localizable ?? false,
  scopable: attribute.scopable ?? false
}));
const attributeSummary = await client.upsertMany('attributes', attributePayload, {
  label: 'atributos'
});
log(`  ${attributeSummary.ok} creados o actualizados, ${attributeSummary.failed} fallidos`);
if (attributeSummary.failed) log(`  ${JSON.stringify(attributeSummary.errors, null, 2)}`);

log(`\n── Opciones de las listas ONIX ──${skipOptions ? ' (omitidas)' : ''}`);
for (const attribute of skipOptions ? [] : attributes) {
  const choices = attribute.choices ?? [];
  if (!choices.length) continue;
  const payload = optionPayload(attribute.code, choices, attribute.encodeCode);
  const summary = await client.upsertMany(`attributes/${attribute.code}/options`, payload, {
    label: attribute.code
  });
  log(`  ${attribute.code}: ${summary.ok} opciones (${summary.failed} fallidas)`);
  if (summary.failed) log(`    ${JSON.stringify(summary.errors.slice(0, 3), null, 2)}`);
}

log('\n── Tipos de asociación ──');
const associationSummary = await client.upsertMany(
  'association-types',
  associationTypes.map(({ onixCodes, ...type }) => type),
  { label: 'asociaciones' }
);
log(`  ${associationSummary.ok} creados o actualizados, ${associationSummary.failed} fallidos`);

log('\n── Familia ──');
await client.upsert('families', family.code, family);
log(`  ${family.code}: ${family.attributes.length} atributos`);

log('\n✓ Estructura sincronizada.');
