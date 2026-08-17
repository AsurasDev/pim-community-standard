import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourceUrl = 'https://www.editeur.org/files/Thema/1.6/v1.6_es/20250204_Thema_v1.6_es.xml';

const decodeEntities = (value) => value
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&apos;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>');

const content = (xml, tag) => decodeEntities(
  xml.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? ''
).replace(/\s+/g, ' ').trim();

const response = await fetch(sourceUrl, {
  headers: { 'User-Agent': 'directus-onix-books/1.0' }
});
if (!response.ok) throw new Error(`No se pudo descargar ${sourceUrl}: ${response.status}`);

const xml = await response.text();
const themaVersion = content(xml, 'IssueNumber');
const themaLastUpdated = content(xml, 'LastUpdated');
if (themaVersion !== '1.6') throw new Error(`Se esperaba Thema 1.6, pero se recibió ${themaVersion}.`);

const choices = [];
const seen = new Set();
for (const match of xml.matchAll(/<Code>([\s\S]*?)<\/Code>/g)) {
  const value = content(match[1], 'CodeValue');
  const text = content(match[1], 'CodeDescription');
  if (!value || !text) throw new Error('Se encontró un código Thema sin valor o descripción.');
  if (seen.has(value)) throw new Error(`El código Thema ${value} está duplicado.`);
  seen.add(value);
  choices.push({ value, text });
}

if (choices.length < 9000) {
  throw new Error(`La descarga de Thema parece incompleta: ${choices.length} códigos.`);
}

const source = `// Generado desde ${sourceUrl} — no editar manualmente.\n` +
  `// Thema ${themaVersion} en español; actualización oficial ${themaLastUpdated}.\n` +
  `export const themaVersion = ${JSON.stringify(themaVersion)};\n` +
  `export const themaLastUpdated = ${JSON.stringify(themaLastUpdated)};\n\n` +
  `export const themaChoices = Object.freeze(${JSON.stringify(choices, null, 2)});\n`;

const output = fileURLToPath(new URL('../src/thema-codelist.generated.mjs', import.meta.url));
await writeFile(output, source, 'utf8');

console.log(`Thema ${themaVersion}: ${choices.length} códigos en español sincronizados.`);
