import {
  CHANNEL,
  CURRENCY,
  FAMILY,
  LOCALE,
  associationTypeFor,
  localeOf,
  themaToAkeneo
} from './akeneo-catalog.mjs';
import { valuesOfGroup } from './directus-read.mjs';

/** Código de opción estable y legible para entidades que vienen de Directus. */
export const slugCode = (value) => {
  const slug = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
  return slug || 'sin_nombre';
};

const scalar = (value) => (value === null || value === undefined || value === '' ? null : value);

const textValue = (data) => [{ locale: null, scope: null, data }];
const localizedValue = (data, locale = LOCALE) => [{ locale, scope: null, data }];

/** ONIX Lista 17: A01–A99 y B01–B99 son autoría; el resto, otros colaboradores. */
const isAuthorship = (roleCode) => /^(A\d\d|B\d\d)$/.test(String(roleCode ?? ''));

/**
 * Convierte un libro de Directus en el cuerpo que espera la API de Akeneo.
 * Devuelve también las opciones dinámicas que hay que crear antes del producto.
 */
export function toAkeneoProduct(book) {
  const values = {};
  const options = { onix_publisher: [], onix_author: [], onix_contributor_other: [], onix_collection: [] };
  const set = (attribute, payload) => {
    if (payload !== null && payload !== undefined) values[attribute] = payload;
  };

  /* --------------------------------------------------------- identidad */
  set('onix_gtin13', scalar(book.gtin13) && textValue(book.gtin13));
  set('onix_identity_key', scalar(book.identity_key) && textValue(book.identity_key));

  /* ------------------------------------------------------- descripción */
  set('onix_title', scalar(book.title) && localizedValue(book.title));
  set('onix_subtitle', scalar(book.subtitle) && localizedValue(book.subtitle));
  set('onix_product_form', scalar(book.product_form) && textValue(book.product_form));
  set('onix_edition_type', scalar(book.edition_type) && textValue(book.edition_type));
  set('onix_edition_number', scalar(book.edition_number) && textValue(book.edition_number));
  set('onix_edition_statement', scalar(book.edition_statement) && localizedValue(book.edition_statement));
  set('onix_publishing_status', scalar(book.publishing_status) && textValue(book.publishing_status));
  set('onix_page_count', book.page_count ? textValue(book.page_count) : null);

  /* ------------------------------------------------- valores agrupados */
  const languages = valuesOfGroup(book, 'language')
    .map((value) => value.value_code)
    .filter(Boolean);
  if (languages.length) set('onix_language', textValue([...new Set(languages)]));

  const formDetails = valuesOfGroup(book, 'form_detail')
    .map((value) => value.value_type)
    .filter(Boolean);
  if (formDetails.length) set('onix_form_detail', textValue([...new Set(formDetails)]));

  const audience = valuesOfGroup(book, 'audience').find((value) => value.value_code);
  set('onix_audience', audience ? textValue(audience.value_code) : null);

  // Lista 163 código 01 = fecha de publicación.
  const publicationDate = valuesOfGroup(book, 'date')
    .find((value) => value.value_type === '01' && value.normalized_date);
  if (publicationDate) {
    const date = new Date(publicationDate.normalized_date).toISOString().slice(0, 10);
    set('onix_publication_date', textValue(date));
  }

  // Lista 48: 01 alto, 02 ancho, 08 peso.
  const measures = valuesOfGroup(book, 'measure');
  const measure = (type, attribute, unit) => {
    const row = measures.find((value) => value.value_type === type && value.value_number !== null);
    if (row) set(attribute, textValue({ amount: String(row.value_number), unit }));
  };
  measure('01', 'onix_height', 'MILLIMETER');
  measure('02', 'onix_width', 'MILLIMETER');
  measure('08', 'onix_weight', 'GRAM');

  const territories = valuesOfGroup(book, 'sales_right')
    .filter((value) => value.included && value.qualifier_code === 'country' && value.value_code)
    .map((value) => value.value_code);
  if (territories.length) set('onix_sales_territory', textValue([...new Set(territories)]));

  /* ------------------------------------------------------ clasificación */
  const thema = book.subjects
    .filter((subject) => subject.scheme_identifier >= '93' && subject.scheme_identifier <= '99')
    .map((subject) => themaToAkeneo(subject.subject_code))
    .filter(Boolean);
  if (thema.length) set('onix_thema', textValue([...new Set(thema)]));

  /* ------------------------------------------- personas y editorial */
  // Lista 45 código 01 = editorial.
  const publisher = book.publishers.find((row) => row.publishing_role === '01') ?? book.publishers[0];
  if (publisher) {
    const code = slugCode(publisher.name);
    options.onix_publisher.push({ code, label: publisher.name });
    set('onix_publisher', textValue(code));
  }

  const authors = [];
  const others = [];
  for (const contributor of book.contributors) {
    const code = slugCode(contributor.display_name);
    const entry = { code, label: contributor.display_name };
    if (isAuthorship(contributor.role_code)) {
      options.onix_author.push(entry);
      authors.push(code);
    } else {
      options.onix_contributor_other.push(entry);
      others.push(code);
    }
  }
  if (authors.length) set('onix_author', textValue([...new Set(authors)]));
  if (others.length) set('onix_contributor_other', textValue([...new Set(others)]));

  const series = book.series[0];
  if (series) {
    const code = slugCode(series.collection_title);
    options.onix_collection.push({ code, label: series.collection_title });
    set('onix_collection', textValue(code));
    if (series.sequence_number !== null) {
      set('onix_collection_number', textValue(series.sequence_number));
    }
  }

  /* ---------------------------------------------------------- obra */
  // Lista 164 código 01 = manifestación de.
  const work = book.works.find((row) => row.work_relation_code === '01') ?? book.works[0];
  if (work) {
    set('onix_work_identifier', scalar(work.work_identifier) && textValue(work.work_identifier));
    set('onix_work_title', scalar(work.title) && textValue(work.title));
  }

  /* ------------------------------------------------------------ textos */
  // Lista 153 código 03 = descripción larga; 02 es reseña corta.
  const description = book.texts.find((row) => row.text_type === '03') ?? book.texts[0];
  if (description?.content) {
    set('onix_description', localizedValue(description.content, localeOf(description.language_code)));
  }

  /* ----------------------------------------------------------- precio */
  const prices = book.prices
    .filter((row) => row.amount !== null)
    .map((row) => ({ amount: String(row.amount), currency: row.currency_code ?? CURRENCY }));
  if (prices.length) {
    const unique = new Map(prices.map((price) => [price.currency, price]));
    set('onix_price', textValue([...unique.values()]));
  }

  /* ----------------------------------------------------- asociaciones */
  const associations = {};
  for (const relation of book.related) {
    const isbn = relation.related_isbn13 ?? relation.identifier_value;
    if (!isbn) continue;
    const type = associationTypeFor(relation.relation_code);
    associations[type] ??= { products: [] };
    if (!associations[type].products.includes(isbn)) associations[type].products.push(isbn);
  }

  const product = {
    identifier: book.isbn13,
    family: FAMILY,
    enabled: Boolean(book.active),
    categories: [],
    values: {
      sku: textValue(book.isbn13),
      ...values
    }
  };
  if (Object.keys(associations).length) product.associations = associations;

  return { product, options, cover: book.resources.find((row) => row.content_type === '01') ?? null };
}

export { CHANNEL, LOCALE };
