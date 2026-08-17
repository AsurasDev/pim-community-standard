import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const listNumbers = [
  1, 5, 13, 15, 16, 17, 21, 22, 23, 24, 27, 28, 29, 34, 44, 45, 46, 48,
  49, 50, 51, 55, 58, 64, 65, 68, 74, 76, 79, 91, 93, 96, 98, 99, 121,
  143, 148, 149, 150, 153, 154, 158, 159, 161, 163, 164, 171, 175, 176, 178,
  184, 196, 220, 242, 243, 262
];

const decodeEntities = (value) => value
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&nbsp;', ' ');

const plainText = (value) => decodeEntities(
  value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
).replace(/\s+/g, ' ').trim();

function extractChoices(html, number) {
  const choices = [];
  const rowPattern = new RegExp(
    `<tr id="[a-z]{2}_${number}_[^"]+" class="([^"]*)">([\\s\\S]*?)<\\/tr>`,
    'g'
  );

  for (const match of html.matchAll(rowPattern)) {
    const [, classes, row] = match;
    if (classes.split(/\s+/).includes('deprecated')) continue;

    const code = plainText(row.match(/<td class="code"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '');
    const labelCell = row.match(/<td class="preflabel[^"]*"[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '';
    const labelAnchor = labelCell.match(/<a [^>]*>([\s\S]*?)<\/a>/)?.[1] ?? labelCell.split(/<br\s*\/?\s*>/i)[0];
    const text = plainText(labelAnchor);

    if (code && text) choices.push({ value: code, text });
  }

  if (choices.length === 0) throw new Error(`La lista ONIX ${number} no produjo opciones.`);
  return choices;
}

async function fetchList(number) {
  const url = `https://ns.editeur.org/onix/es/${number}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'directus-onix-books/1.0' } });
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  const html = await response.text();
  const issue = Number(html.match(/Listas de códigos ONIX versión (\d+)/)?.[1]);
  if (!issue) throw new Error(`No se pudo detectar la versión de ${url}.`);
  return { number, issue, choices: extractChoices(html, number) };
}

const results = await Promise.all(listNumbers.map(fetchList));
const issues = new Set(results.map((result) => result.issue));
if (issues.size !== 1) throw new Error(`Las listas no pertenecen a una única versión: ${[...issues].join(', ')}`);

const issue = results[0].issue;
const entries = results
  .sort((left, right) => left.number - right.number)
  .map(({ number, choices }) => `  ${JSON.stringify(String(number))}: ${JSON.stringify(choices, null, 2).replaceAll('\n', '\n  ')}`)
  .join(',\n');

const source = `// Generado desde https://ns.editeur.org/onix/es — no editar manualmente.\n` +
  `// ONIX Codelists Issue ${issue}; se excluyen códigos marcados como obsoletos.\n` +
  `export const onixIssue = ${issue};\n\n` +
  `export const officialLists = Object.freeze({\n${entries}\n});\n`;

const output = fileURLToPath(new URL('../src/onix-codelists.generated.mjs', import.meta.url));
await writeFile(output, source, 'utf8');

const totalChoices = results.reduce((total, result) => total + result.choices.length, 0);
console.log(`ONIX Issue ${issue}: ${results.length} listas y ${totalChoices} opciones sincronizadas.`);
