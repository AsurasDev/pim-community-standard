import { lists } from './codelists.mjs';
import { themaChoices } from './thema.mjs';

/**
 * Estructura del catálogo de Akeneo derivada de las listas ONIX.
 *
 * La idea central: el código de la opción en Akeneo ES el código ONIX. Así la
 * transformación entre Directus y Akeneo es la identidad para todo campo
 * codificado, y regenerar las listas desde EDItEUR no rompe nada.
 */

export const LOCALE = 'es_ES';
export const CHANNEL = 'ecommerce';
export const CURRENCY = 'COP';

/** ONIX usa ISO 639-2; Akeneo usa locales. */
export const localeOf = (languageCode) => ({
  spa: 'es_ES',
  eng: 'en_US'
})[languageCode] ?? LOCALE;

/** Akeneo acepta [a-zA-Z0-9_] en los códigos. */
const CODE_PATTERN = /^[a-zA-Z0-9_]+$/;

export const isValidCode = (value) => CODE_PATTERN.test(String(value));

/**
 * Thema es la única lista con códigos fuera del patrón: 4.170 calificadores
 * compuestos usan guion (`1DDB-BE-B`). El guion es el único carácter no
 * alfanumérico de la lista y ningún código lleva guion bajo, así que
 * `-` ↔ `_` es una biyección comprobada: 0 colisiones sobre 9.187 códigos.
 */
export const themaToAkeneo = (code) => String(code).replaceAll('-', '_');
export const akeneoToThema = (code) => String(code).replaceAll('_', '-');

export const attributeGroups = [
  { code: 'onix_identidad', labels: { [LOCALE]: 'ONIX · Identidad' }, sort_order: 1 },
  { code: 'onix_descriptivo', labels: { [LOCALE]: 'ONIX · Descripción' }, sort_order: 2 },
  { code: 'onix_clasificacion', labels: { [LOCALE]: 'ONIX · Clasificación' }, sort_order: 3 },
  { code: 'onix_personas', labels: { [LOCALE]: 'ONIX · Personas y editorial' }, sort_order: 4 },
  { code: 'onix_fisico', labels: { [LOCALE]: 'ONIX · Físico' }, sort_order: 5 },
  { code: 'onix_comercial', labels: { [LOCALE]: 'ONIX · Comercial' }, sort_order: 6 }
];

const select = (code, label, group, choices, { multi = false, ...rest } = {}) => ({
  code,
  type: multi ? 'pim_catalog_multiselect' : 'pim_catalog_simpleselect',
  group,
  labels: { [LOCALE]: label },
  choices,
  ...rest
});

const field = (code, type, label, group, extra = {}) => ({
  code,
  type,
  group,
  labels: { [LOCALE]: label },
  ...extra
});

/**
 * Atributos del catálogo. `choices` marca los que se alimentan de una lista
 * ONIX; `dynamicOptions` los que se alimentan de datos de Directus (editoriales,
 * autores, colecciones) y por tanto se rellenan durante la sincronización.
 */
export const attributes = [
  // Identidad
  field('onix_gtin13', 'pim_catalog_text', 'GTIN-13', 'onix_identidad', { max_characters: 13 }),
  field('onix_identity_key', 'pim_catalog_text', 'Clave de identidad ONIX', 'onix_identidad'),
  field('onix_work_identifier', 'pim_catalog_text', 'Identificador de obra', 'onix_identidad'),
  field('onix_work_title', 'pim_catalog_text', 'Título de la obra', 'onix_identidad'),

  // Descripción
  field('onix_title', 'pim_catalog_text', 'Título', 'onix_descriptivo', { localizable: true }),
  field('onix_subtitle', 'pim_catalog_text', 'Subtítulo', 'onix_descriptivo', { localizable: true }),
  field('onix_description', 'pim_catalog_textarea', 'Descripción', 'onix_descriptivo', {
    localizable: true,
    wysiwyg_enabled: true
  }),
  select('onix_product_form', 'Formato del producto', 'onix_descriptivo', lists.productForm),
  select('onix_form_detail', 'Detalle de formato', 'onix_descriptivo', lists.formDetail, { multi: true }),
  select('onix_edition_type', 'Tipo de edición', 'onix_descriptivo', lists.editionType),
  field('onix_edition_number', 'pim_catalog_text', 'Número de edición', 'onix_descriptivo'),
  field('onix_edition_statement', 'pim_catalog_text', 'Declaración de edición', 'onix_descriptivo', {
    localizable: true
  }),
  select('onix_publishing_status', 'Estado de publicación', 'onix_descriptivo', lists.publishingStatus),
  field('onix_publication_date', 'pim_catalog_date', 'Fecha de publicación', 'onix_descriptivo'),
  field('onix_cover', 'pim_catalog_image', 'Cubierta', 'onix_descriptivo', {
    allowed_extensions: ['jpg', 'jpeg', 'png', 'gif', 'tiff']
  }),

  // Clasificación
  select('onix_language', 'Idioma', 'onix_clasificacion', lists.languageCode, { multi: true }),
  select('onix_audience', 'Audiencia', 'onix_clasificacion', lists.audienceCode),
  select('onix_thema', 'Materia Thema', 'onix_clasificacion', themaChoices, {
    multi: true,
    encodeCode: themaToAkeneo
  }),

  // Personas y editorial
  select('onix_publisher', 'Editorial', 'onix_personas', [], { dynamicOptions: true }),
  select('onix_author', 'Autoría', 'onix_personas', [], { multi: true, dynamicOptions: true }),
  select('onix_contributor_other', 'Otros colaboradores', 'onix_personas', [], {
    multi: true,
    dynamicOptions: true
  }),
  select('onix_collection', 'Colección', 'onix_personas', [], { dynamicOptions: true }),
  field('onix_collection_number', 'pim_catalog_number', 'Número en la colección', 'onix_personas', {
    negative_allowed: false,
    decimals_allowed: false
  }),

  // Físico
  field('onix_page_count', 'pim_catalog_number', 'Número de páginas', 'onix_fisico', {
    negative_allowed: false,
    decimals_allowed: false
  }),
  field('onix_height', 'pim_catalog_metric', 'Alto', 'onix_fisico', {
    metric_family: 'Length',
    default_metric_unit: 'MILLIMETER',
    negative_allowed: false,
    decimals_allowed: true
  }),
  field('onix_width', 'pim_catalog_metric', 'Ancho', 'onix_fisico', {
    metric_family: 'Length',
    default_metric_unit: 'MILLIMETER',
    negative_allowed: false,
    decimals_allowed: true
  }),
  field('onix_weight', 'pim_catalog_metric', 'Peso', 'onix_fisico', {
    metric_family: 'Weight',
    default_metric_unit: 'GRAM',
    negative_allowed: false,
    decimals_allowed: true
  }),

  // Comercial
  field('onix_price', 'pim_catalog_price_collection', 'Precio de venta', 'onix_comercial', {
    decimals_allowed: true
  }),
  select('onix_sales_territory', 'Territorios de venta', 'onix_comercial', lists.countryCode, {
    multi: true
  })
];

export const FAMILY = 'libro';

export const family = {
  code: FAMILY,
  labels: { [LOCALE]: 'Libro' },
  attribute_as_label: 'onix_title',
  attributes: ['sku', ...attributes.map((attribute) => attribute.code)],
  attribute_requirements: {
    [CHANNEL]: ['sku', 'onix_product_form']
  }
};

/** Códigos de la Lista 51 que se convierten en tipos de asociación de Akeneo. */
export const associationTypes = [
  { code: 'onix_alternative_format', labels: { [LOCALE]: 'Formato alternativo' }, onixCodes: ['06', '13', '27', '28', '29'] },
  { code: 'onix_other_language', labels: { [LOCALE]: 'Versión en otro idioma' }, onixCodes: ['11'] },
  { code: 'onix_replaces', labels: { [LOCALE]: 'Sustituye a' }, onixCodes: ['03', '16'] },
  { code: 'onix_replaced_by', labels: { [LOCALE]: 'Sustituido por' }, onixCodes: ['05', '17'] },
  { code: 'onix_related', labels: { [LOCALE]: 'Producto relacionado' }, onixCodes: [] }
];

export const associationTypeFor = (relationCode) =>
  associationTypes.find((type) => type.onixCodes.includes(relationCode))?.code ?? 'onix_related';

const identity = (value) => String(value);

/** Convierte una lista de opciones ONIX en el cuerpo que espera Akeneo. */
export const optionPayload = (attributeCode, choices, encodeCode = identity) =>
  choices.map((choice, index) => ({
    code: encodeCode(choice.value),
    attribute: attributeCode,
    sort_order: index,
    labels: { [LOCALE]: String(choice.text).slice(0, 255) }
  }));

/** Opciones cuyo código sigue sin encajar tras aplicar la codificación. */
export const rejectedChoices = (choices, encodeCode = identity) =>
  choices.filter((choice) => !isValidCode(encodeCode(choice.value))).map((choice) => choice.value);
