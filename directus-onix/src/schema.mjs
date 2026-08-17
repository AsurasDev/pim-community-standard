import { lists, yesNoChoices } from './codelists.mjs';
import {
  themaChoices,
  themaChoicesByScheme,
  themaSchemeLabels,
  themaVersion
} from './thema.mjs';

const translation = (label) => [{ language: 'es-ES', translation: label }];

const baseMeta = (label, options = {}) => ({
  interface: options.interface ?? 'input',
  options: options.options ?? null,
  display: options.display ?? null,
  display_options: options.displayOptions ?? null,
  readonly: options.readonly ?? false,
  hidden: options.hidden ?? false,
  required: options.required ?? false,
  sort: options.sort ?? null,
  width: options.width ?? 'half',
  note: options.note ?? null,
  special: options.special ?? null,
  conditions: options.conditions ?? null,
  translations: translation(label)
});

const field = (fieldName, type, label, options = {}) => ({
  field: fieldName,
  type,
  meta: baseMeta(label, options),
  schema: options.schema === null ? null : {
    is_nullable: !(options.required ?? false),
    is_unique: options.unique ?? false,
    is_indexed: options.indexed ?? false,
    max_length: options.maxLength ?? undefined,
    default_value: options.defaultValue ?? undefined,
    numeric_precision: options.precision ?? undefined,
    numeric_scale: options.scale ?? undefined
  }
});

const str = (name, label, options = {}) => field(name, 'string', label, {
  maxLength: options.maxLength ?? 255,
  ...options
});
const text = (name, label, options = {}) => field(name, 'text', label, {
  interface: options.interface ?? 'input-multiline',
  width: 'full',
  ...options
});
const integer = (name, label, options = {}) => field(name, 'integer', label, {
  interface: 'input',
  ...options
});
const decimal = (name, label, options = {}) => field(name, 'decimal', label, {
  interface: 'input',
  precision: options.precision ?? 15,
  scale: options.scale ?? 4,
  ...options
});
const bool = (name, label, options = {}) => field(name, 'boolean', label, {
  interface: 'boolean',
  defaultValue: options.defaultValue ?? false,
  ...options
});
const flag = (name, label, options = {}) => bool(name, label, {
  interface: 'select-dropdown',
  options: { choices: yesNoChoices },
  display: 'labels',
  displayOptions: { choices: yesNoChoices },
  ...options
});
const date = (name, label, options = {}) => field(name, 'date', label, {
  interface: 'datetime',
  options: { includeSeconds: false },
  ...options
});
const choice = (name, label, choices, listNote, options = {}) => str(name, label, {
  interface: 'select-dropdown',
  options: {
    choices,
    allowOther: options.allowOther ?? false,
    placeholder: options.placeholder ?? 'Buscar por descripción'
  },
  display: 'labels',
  displayOptions: { choices: options.displayChoices ?? choices },
  note: listNote,
  ...options
});

const eq = (fieldName, value) => ({ [fieldName]: { _eq: value } });
const oneOf = (fieldName, values) => ({ [fieldName]: { _in: values } });
const rule = (...clauses) => ({ _and: clauses });
const condition = (name, ruleObject, overrides = {}) => ({
  name,
  rule: ruleObject,
  ...overrides
});
const picker = (choices, placeholder, allowOther = false) => ({
  options: { choices, allowOther, placeholder }
});

const mergedChoices = (...groups) => {
  const merged = new Map();
  for (const item of groups.flat()) {
    const current = merged.get(item.value);
    if (!current) {
      merged.set(item.value, { ...item });
    } else if (!current.text.includes(item.text)) {
      current.text = `${current.text} / ${item.text}`;
    }
  }
  return [...merged.values()];
};

const ref = (name, label, required = true) => field(name, 'uuid', label, {
  interface: 'select-dropdown-m2o',
  display: 'related-values',
  special: ['m2o'],
  required,
  indexed: true,
  width: 'full'
});

const territoryCode = (name = 'territory_code', typeField = 'territory_type') =>
  choice(name, 'Territorio', lists.countryCode, 'ONIX Lista 91 para países o Lista 49 para regiones', {
    required: true,
    displayChoices: mergedChoices(lists.countryCode, lists.regionCode),
    conditions: [
      condition('País', rule(eq(typeField, 'country')), {
        ...picker(lists.countryCode, 'Buscar país')
      }),
      condition('Región', rule(eq(typeField, 'region')), {
        ...picker(lists.regionCode, 'Buscar región')
      })
    ]
  });

const timestamps = [
  field('date_created', 'timestamp', 'Creado', {
    interface: 'datetime', special: ['date-created'], readonly: true, hidden: true
  }),
  field('date_updated', 'timestamp', 'Actualizado', {
    interface: 'datetime', special: ['date-updated'], readonly: true, hidden: true
  })
];

const uuidId = {
  field: 'id',
  type: 'uuid',
  meta: baseMeta('ID', {
    interface: 'input', special: ['uuid'], readonly: true, hidden: true, required: true
  }),
  schema: { is_primary_key: true, is_nullable: false, is_unique: true, is_indexed: true }
};

const collection = (name, label, icon, fields, options = {}) => ({
  collection: name,
  label,
  meta: {
    icon,
    note: options.note ?? null,
    display_template: options.displayTemplate ?? null,
    hidden: options.hidden ?? true,
    singleton: false,
    accountability: 'all',
    versioning: false,
    group: options.group === false ? null : 'onix_catalog',
    translations: translation(label),
    sort: options.sort ?? null
  },
  schema: { name },
  fields: [uuidId, ...fields, ...timestamps]
});

export const folder = {
  collection: 'onix_catalog',
  meta: {
    icon: 'local_library',
    note: 'Modelo relacional ONIX for Books',
    hidden: false,
    singleton: false,
    accountability: 'all',
    translations: translation('Catálogo ONIX')
  },
  schema: null
};

/* --------------------------------------------------------------------------
 * book_values — elementos repetibles cuya estructura es «tipo + código + valor».
 * Las materias, los textos, los recursos, los productos relacionados y los
 * territorios de precio tienen colección propia y no pasan por aquí.
 * ------------------------------------------------------------------------ */

export const valueGroups = [
  { value: 'title', text: 'Título' },
  { value: 'language', text: 'Idioma' },
  { value: 'audience', text: 'Audiencia' },
  { value: 'form_detail', text: 'Detalle de formato' },
  { value: 'form_feature', text: 'Característica de formato' },
  { value: 'date', text: 'Fecha de publicación' },
  { value: 'extent', text: 'Extensión' },
  { value: 'measure', text: 'Medida' },
  { value: 'sales_right', text: 'Derecho de venta' }
];

const groupLabel = Object.fromEntries(valueGroups.map((item) => [item.value, item.text]));

// Lista ONIX que alimenta value_type en cada grupo.
const valueTypeLists = [
  ['title', lists.titleType, 'ONIX Lista 15', 'Buscar tipo de título'],
  ['language', lists.languageRole, 'ONIX Lista 22', 'Buscar función del idioma'],
  ['audience', lists.audienceCodeType, 'ONIX Lista 28', 'Buscar tipo de código'],
  ['form_detail', lists.formDetail, 'ONIX Lista 175', 'Buscar detalle de formato'],
  ['form_feature', lists.formFeatureType, 'ONIX Lista 79', 'Buscar característica'],
  ['date', lists.dateRole, 'ONIX Lista 163', 'Buscar función de fecha'],
  ['extent', lists.extentType, 'ONIX Lista 23', 'Buscar tipo de extensión'],
  ['measure', lists.measureType, 'ONIX Lista 48', 'Buscar tipo de medida'],
  ['sales_right', lists.rightsType, 'ONIX Lista 46', 'Buscar tipo de derecho']
];

// Listas dependientes de FormFeatureType para el valor de la característica.
const featureValueLists = [
  [['01', '02', '26', '27', '55', '57', '58', '59'], lists.colorCode, 'Buscar color', false],
  [['04'], lists.coverMaterial, 'Buscar material', false],
  [['05'], lists.dvdRegion, 'Buscar región', false],
  [['06'], lists.operatingSystem, 'Buscar sistema', false],
  [['09'], lists.accessibility, 'Buscar característica', false],
  [['10'], lists.formatVersion, 'Buscar o escribir versión', true],
  [['12'], lists.usHazard, 'Buscar aviso', false],
  [['13'], lists.euHazard, 'Buscar aviso', false],
  [['15'], lists.formatVersion, 'Buscar versión', false],
  [['19'], lists.batteryType, 'Buscar batería', false],
  [['21'], lists.dangerousGoods, 'Buscar clasificación', false],
  [['41', '42', '43', '44', '45', '46'], lists.certificationScheme, 'Buscar certificación', false],
  [['47'], lists.countryCode, 'Buscar país o escribir valor', true],
  [['52'], lists.countryCode, 'Buscar país o escribir lista', true]
];

const valueTypeConditions = valueTypeLists.map(([group, choices, note, placeholder]) =>
  condition(`${groupLabel[group]} · ${note}`, rule(eq('value_group', group)), {
    hidden: false,
    required: true,
    ...picker(choices, placeholder)
  })
);

const valueCodeConditions = [
  condition('Título · nivel del elemento (ONIX Lista 149)', rule(eq('value_group', 'title')), {
    hidden: false,
    ...picker(lists.titleElementLevel, 'Buscar nivel')
  }),
  condition('Idioma · código ISO 639-2', rule(eq('value_group', 'language')), {
    hidden: false,
    required: true,
    ...picker(lists.languageCode, 'Buscar idioma')
  }),
  condition('Audiencia · código (ONIX Lista 29)', rule(eq('value_group', 'audience')), {
    hidden: false,
    ...picker(lists.audienceCode, 'Buscar audiencia')
  }),
  condition('Característica de formato · valor', rule(eq('value_group', 'form_feature')), {
    hidden: false,
    ...picker([], 'Escribir valor de la característica', true)
  }),
  condition('Derecho de venta · país (ONIX Lista 91)', rule(
    eq('value_group', 'sales_right'),
    eq('qualifier_code', 'country')
  ), {
    hidden: false,
    required: true,
    ...picker(lists.countryCode, 'Buscar país')
  }),
  condition('Derecho de venta · región (ONIX Lista 49)', rule(
    eq('value_group', 'sales_right'),
    eq('qualifier_code', 'region')
  ), {
    hidden: false,
    required: true,
    ...picker(lists.regionCode, 'Buscar región')
  }),
  // Valor dependiente del tipo de característica de formato.
  ...featureValueLists.map(([types, choices, placeholder, allowOther]) =>
    condition(`Característica de formato · tipos ${types.join(', ')}`, rule(
      eq('value_group', 'form_feature'),
      oneOf('value_type', types)
    ), {
      hidden: false,
      ...picker(choices, placeholder, allowOther)
    })
  )
];

const qualifierConditions = [
  condition('Idioma · país (ONIX Lista 91)', rule(eq('value_group', 'language')), {
    hidden: false,
    ...picker(lists.countryCode, 'Buscar país')
  }),
  condition('Fecha · formato (ONIX Lista 55)', rule(eq('value_group', 'date')), {
    hidden: false,
    required: true,
    ...picker(lists.dateFormat, 'Buscar formato de fecha')
  }),
  condition('Derecho de venta · tipo de territorio', rule(eq('value_group', 'sales_right')), {
    hidden: false,
    required: true,
    ...picker(lists.territoryType, 'País o región')
  })
];

const unitConditions = [
  condition('Extensión · unidad (ONIX Lista 24)', rule(eq('value_group', 'extent')), {
    hidden: false,
    required: true,
    ...picker(lists.extentUnit, 'Buscar unidad')
  }),
  condition('Medida · unidad (ONIX Lista 50)', rule(eq('value_group', 'measure')), {
    hidden: false,
    required: true,
    ...picker(lists.measureUnit, 'Buscar unidad')
  })
];

// Revela un campo genérico solo en los grupos que lo utilizan.
const shownFor = (groups, label, overrides = {}) => [
  condition(
    `${label} — visible en: ${groups.map((group) => groupLabel[group]).join(', ')}`,
    rule(oneOf('value_group', groups)),
    { hidden: false, ...overrides }
  )
];

// Materias: Thema 1.6 filtrado por el esquema ONIX 93–99.
const themaConditions = Object.entries(themaChoicesByScheme).map(([scheme, choices]) =>
  condition(`Thema ${themaVersion}: ${themaSchemeLabels[scheme]}`, rule(eq('scheme_identifier', scheme)), {
    ...picker(choices, `Buscar en ${themaSchemeLabels[scheme].toLowerCase()}`)
  })
);

export const collections = [
  collection('organizations', 'Organizaciones', 'business', [
    str('name', 'Nombre', { required: true, indexed: true, width: 'full' }),
    str('website', 'Sitio web'),
    str('email', 'Correo'),
    str('contact_name', 'Contacto'),
    choice('name_identifier_type', 'Tipo de identificador', lists.nameIdentifierType, 'ONIX Lista 44'),
    str('name_identifier_scheme', 'Nombre del esquema'),
    str('name_identifier', 'Identificador', { indexed: true })
  ], {
    hidden: false,
    displayTemplate: '{{name}}',
    note: 'Editoriales y distribuidores.',
    sort: 3
  }),

  collection('contributors', 'Colaboradores', 'person', [
    choice('contributor_type', 'Tipo', lists.contributorType, 'Persona o entidad', { required: true }),
    str('display_name', 'Nombre para mostrar', { required: true, indexed: true, width: 'full' }),
    str('names_before_key', 'Nombres'),
    str('key_names', 'Apellidos'),
    str('corporate_name', 'Nombre corporativo', { width: 'full' }),
    choice('name_identifier_type', 'Tipo de identificador', lists.nameIdentifierType, 'ONIX Lista 44'),
    str('name_identifier_scheme', 'Nombre del esquema'),
    str('name_identifier', 'Identificador', { indexed: true })
  ], { hidden: false, displayTemplate: '{{display_name}}', sort: 2 }),

  collection('books', 'Libros', 'menu_book', [
    str('identity_key', 'Clave de identidad', {
      required: true, unique: true, indexed: true,
      note: 'Clave estable de actualización, tomada del RecordReference del origen.'
    }),
    str('record_reference', 'Referencia del registro', { required: true, indexed: true }),
    str('isbn13', 'ISBN-13', { unique: true, indexed: true, maxLength: 13 }),
    str('gtin13', 'GTIN-13', { indexed: true, maxLength: 13 }),
    str('title', 'Título', { required: true, width: 'full' }),
    str('subtitle', 'Subtítulo', { width: 'full' }),
    choice('product_form', 'Formato del producto', lists.productForm, 'ONIX Lista 150', { required: true }),
    str('product_form_description', 'Descripción del formato', { width: 'full' }),
    choice('edition_type', 'Tipo de edición', lists.editionType, 'ONIX Lista 21'),
    str('edition_number', 'Número de edición'),
    str('edition_statement', 'Declaración de edición', { width: 'full' }),
    choice('publishing_status', 'Estado de publicación', lists.publishingStatus, 'ONIX Lista 64'),
    integer('page_count', 'Número de páginas'),
    bool('active', 'Activo', { defaultValue: true })
  ], {
    hidden: false,
    displayTemplate: '{{title}} — {{isbn13}}',
    note: 'Un único registro vigente por ISBN/producto comercial. Guarda el estado actual, no las notificaciones recibidas.',
    sort: 1
  }),

  collection('book_contributors', 'Colaboradores del libro', 'group', [
    ref('book_id', 'Libro'),
    ref('contributor_id', 'Colaborador'),
    choice('role_code', 'Rol', lists.contributorRole, 'ONIX Lista 17', { required: true }),
    integer('sequence_number', 'Secuencia'),
    bool('is_primary', 'Principal'),
    text('biography', 'Biografía')
  ], { displayTemplate: '{{contributor_id.display_name}}' }),

  collection('book_organizations', 'Organizaciones del libro', 'account_balance', [
    ref('book_id', 'Libro'),
    ref('organization_id', 'Organización'),
    choice('publishing_role', 'Función editorial', lists.publishingRole, 'ONIX Lista 45', { required: true })
  ], { displayTemplate: '{{publishing_role}} — {{organization_id.name}}' }),

  collection('book_values', 'Elementos descriptivos', 'list_alt', [
    ref('book_id', 'Libro'),
    choice('value_group', 'Grupo', valueGroups, 'Determina qué campos y qué lista ONIX se aplican', { required: true }),
    choice('value_type', 'Tipo', [], 'Lista ONIX dependiente del grupo: 15, 22, 28, 175, 79, 163, 23, 48 o 46', {
      hidden: true,
      displayChoices: mergedChoices(...valueTypeLists.map(([, choices]) => choices)),
      conditions: valueTypeConditions
    }),
    choice('value_code', 'Código', [], 'Código principal del elemento; la lista depende del grupo y del tipo', {
      hidden: true,
      indexed: true,
      allowOther: true,
      placeholder: 'Escribir código',
      displayChoices: mergedChoices(
        lists.titleElementLevel,
        lists.languageCode,
        lists.audienceCode,
        lists.countryCode,
        lists.regionCode,
        lists.colorCode,
        lists.coverMaterial,
        lists.dvdRegion,
        lists.operatingSystem,
        lists.accessibility,
        lists.formatVersion,
        lists.usHazard,
        lists.euHazard,
        lists.batteryType,
        lists.dangerousGoods,
        lists.certificationScheme
      ),
      conditions: valueCodeConditions
    }),
    choice('qualifier_code', 'Calificador', [], 'País del idioma, formato de fecha o tipo de territorio', {
      hidden: true,
      displayChoices: mergedChoices(lists.countryCode, lists.dateFormat, lists.territoryType),
      conditions: qualifierConditions
    }),
    choice('language_code', 'Idioma del texto', lists.languageCode, 'ISO 639-2', {
      hidden: true,
      conditions: shownFor(['title'], 'Idioma del texto')
    }),
    choice('script_code', 'Escritura', lists.scriptCode, 'ISO 15924', {
      hidden: true,
      conditions: shownFor(['title', 'language'], 'Escritura')
    }),
    str('value_text', 'Texto principal', {
      width: 'full',
      hidden: true,
      note: 'Título del libro o valor ONIX de la fecha.',
      conditions: shownFor(['title', 'date'], 'Texto principal')
    }),
    str('value_label', 'Texto secundario', {
      width: 'full',
      hidden: true,
      note: 'Subtítulo del título o calificador de la audiencia.',
      conditions: shownFor(['title', 'audience'], 'Texto secundario')
    }),
    text('value_note', 'Descripción', {
      hidden: true,
      conditions: shownFor(['audience', 'form_feature'], 'Descripción')
    }),
    decimal('value_number', 'Valor numérico', {
      scale: 3,
      hidden: true,
      note: 'Extensión o medida.',
      conditions: shownFor(['extent', 'measure'], 'Valor numérico', { required: true })
    }),
    choice('value_unit', 'Unidad', [], 'ONIX Lista 24 para extensiones y Lista 50 para medidas', {
      hidden: true,
      displayChoices: mergedChoices(lists.extentUnit, lists.measureUnit),
      conditions: unitConditions
    }),
    date('normalized_date', 'Fecha normalizada', {
      hidden: true,
      conditions: shownFor(['date'], 'Fecha normalizada')
    }),
    integer('sequence_number', 'Secuencia', {
      hidden: true,
      conditions: shownFor(['title'], 'Secuencia')
    }),
    flag('included', 'Incluido', {
      hidden: true,
      note: 'Inclusión o exclusión del territorio.',
      conditions: shownFor(['sales_right'], 'Incluido')
    })
  ], {
    displayTemplate: '{{value_group}} — {{value_type}}',
    note: 'Títulos, idiomas, audiencias, formatos, fechas, extensiones, medidas y derechos.'
  }),

  collection('book_subjects', 'Materias', 'category', [
    ref('book_id', 'Libro'),
    choice('scheme_identifier', 'Esquema', lists.subjectScheme, 'ONIX Lista 27', { required: true }),
    str('scheme_name', 'Nombre del esquema', {
      hidden: true,
      note: 'Solo se utiliza para esquemas propios o privados.',
      conditions: [
        condition('Código propio de la editorial', rule(eq('scheme_identifier', '23')), { hidden: false, required: true }),
        condition('Esquema propio o privado', rule(eq('scheme_identifier', '24')), { hidden: false, required: true })
      ]
    }),
    str('scheme_version', 'Versión', {
      note: `Para los esquemas Thema 93–99, utilice ${themaVersion}.`
    }),
    choice('subject_code', 'Código', [], `Código del esquema seleccionado. Thema ${themaVersion} precargado desde EDItEUR.`, {
      indexed: true,
      allowOther: true,
      placeholder: 'Escribir código del esquema',
      displayChoices: themaChoices,
      conditions: themaConditions
    }),
    str('heading_text', 'Materia', { indexed: true, width: 'full' }),
    bool('is_main', 'Materia principal')
  ], { displayTemplate: '{{subject_code}} — {{heading_text}}' }),

  collection('text_contents', 'Textos descriptivos', 'notes', [
    ref('book_id', 'Libro'),
    choice('text_type', 'Tipo de texto', lists.textType, 'ONIX Lista 153', { required: true }),
    choice('content_audience', 'Audiencia', lists.contentAudience, 'ONIX Lista 154'),
    choice('language_code', 'Idioma', lists.languageCode, 'ISO 639-2'),
    choice('text_format', 'Formato', lists.textFormat, 'ONIX Lista 34'),
    text('content', 'Contenido', { required: true, interface: 'input-rich-text-html' }),
    integer('sequence_number', 'Secuencia')
  ], { displayTemplate: '{{text_type}}' }),

  collection('supporting_resources', 'Recursos de apoyo', 'perm_media', [
    ref('book_id', 'Libro'),
    choice('content_type', 'Tipo de contenido', lists.resourceContentType, 'ONIX Lista 158', { required: true }),
    choice('resource_mode', 'Modo', lists.resourceMode, 'ONIX Lista 159', { required: true }),
    choice('content_audience', 'Audiencia', lists.contentAudience, 'ONIX Lista 154'),
    str('caption', 'Descripción', { width: 'full' }),
    choice('resource_format', 'Formato del recurso', lists.resourceFormat, 'ONIX Lista 161'),
    choice('file_format', 'Formato de archivo', lists.fileFormat, 'ONIX Lista 178'),
    integer('width', 'Ancho'),
    integer('height', 'Alto'),
    str('resource_url', 'URL', { required: true, width: 'full' }),
    date('valid_from', 'Válido desde'),
    date('valid_until', 'Válido hasta')
  ], { displayTemplate: '{{content_type}} — {{resource_url}}' }),

  collection('book_identifiers', 'Identificadores del libro', 'fingerprint', [
    ref('book_id', 'Libro'),
    choice('identifier_type', 'Tipo de identificador', lists.identifierType, 'ONIX Lista 5', { required: true }),
    str('scheme_name', 'Nombre del esquema', {
      note: 'Solo para esquemas propios o privados.'
    }),
    str('identifier_value', 'Valor', { required: true, indexed: true }),
    bool('is_primary', 'Principal')
  ], {
    displayTemplate: '{{identifier_value}}',
    note: 'ISBN, GTIN, DOI y códigos propios del producto. Repetible.'
  }),

  collection('series', 'Colecciones y series', 'collections_bookmark', [
    choice('collection_type', 'Tipo', lists.collectionType, 'ONIX Lista 148', { required: true }),
    str('collection_title', 'Título', {
      required: true, unique: true, indexed: true, width: 'full',
      note: 'Único en el catálogo: impide que la misma colección se escriba de dos formas.'
    }),
    choice('collection_identifier_type', 'Tipo de identificador', lists.collectionIdentifierType, 'ONIX Lista 13'),
    str('collection_identifier_scheme', 'Nombre del esquema'),
    str('collection_identifier', 'Identificador', { indexed: true })
  ], {
    hidden: false,
    displayTemplate: '{{collection_title}}',
    note: 'Catálogo de colecciones. Cada título se escribe una sola vez y los libros lo referencian.',
    sort: 4
  }),

  collection('book_series', 'Colecciones del libro', 'bookmarks', [
    ref('book_id', 'Libro'),
    ref('series_id', 'Colección'),
    integer('sequence_number', 'Número en la colección')
  ], { displayTemplate: '{{series_id.collection_title}}' }),

  collection('works', 'Obras', 'auto_stories', [
    str('title', 'Título de la obra', { required: true, indexed: true, width: 'full' }),
    choice('original_language', 'Idioma original', lists.languageCode, 'ISO 639-2'),
    choice('work_identifier_type', 'Tipo de identificador', lists.workIdentifierType, 'ONIX Lista 16'),
    str('work_identifier_scheme', 'Nombre del esquema', {
      note: 'Obligatorio para el tipo 01, propio o privado. ISTC ya no forma parte de la Lista 16.'
    }),
    str('work_identifier', 'Identificador', {
      unique: true, indexed: true,
      note: 'Único cuando está presente: es la clave que agrupa las ediciones de una obra.'
    })
  ], {
    hidden: false,
    displayTemplate: '{{title}}',
    note: 'Contenido intelectual, independiente del producto. Agrupa ediciones, formatos y traducciones.',
    sort: 5
  }),

  collection('book_works', 'Obras del libro', 'account_tree', [
    ref('book_id', 'Libro'),
    ref('work_id', 'Obra'),
    choice('work_relation_code', 'Relación con la obra', lists.workRelationCode, 'ONIX Lista 164', {
      required: true,
      note: 'ONIX Lista 164. 01 para la obra que el producto materializa; 29 para el original del que se tradujo.'
    })
  ], { displayTemplate: '{{work_relation_code}} — {{work_id.title}}' }),

  collection('related_products', 'Productos relacionados', 'device_hub', [
    ref('book_id', 'Libro'),
    ref('related_book_id', 'Libro relacionado', false),
    choice('relation_code', 'Relación', lists.relationCode, 'ONIX Lista 51', { required: true }),
    choice('identifier_type', 'Tipo de identificador', lists.identifierType, 'ONIX Lista 5'),
    str('identifier_value', 'Identificador'),
    choice('product_form', 'Formato', lists.productForm, 'ONIX Lista 150')
  ], { displayTemplate: '{{identifier_value}}' }),

  collection('book_supplies', 'Suministro', 'local_shipping', [
    ref('book_id', 'Libro'),
    ref('supplier_organization_id', 'Proveedor', false),
    choice('supplier_role', 'Función del proveedor', lists.supplierRole, 'ONIX Lista 93'),
    choice('market_status', 'Estado en el mercado', lists.marketPublishingStatus, 'ONIX Lista 68'),
    choice('availability', 'Disponibilidad', lists.availability, 'ONIX Lista 65'),
    date('expected_ship_date', 'Fecha esperada de envío'),
    integer('order_time_days', 'Plazo de pedido en días')
  ], { displayTemplate: '{{availability}}' }),

  collection('prices', 'Precios', 'payments', [
    ref('book_supply_id', 'Suministro'),
    choice('price_type', 'Tipo de precio', lists.priceType, 'ONIX Lista 58', { required: true }),
    decimal('amount', 'Importe', { required: true, precision: 15, scale: 4 }),
    choice('currency_code', 'Moneda', lists.currencyCode, 'ISO 4217', { required: true }),
    date('valid_from', 'Válido desde'),
    date('valid_until', 'Válido hasta'),
    choice('tax_type', 'Tipo de impuesto', lists.taxType, 'ONIX Lista 171'),
    decimal('tax_rate', 'Tasa', { scale: 4 }),
    decimal('tax_amount', 'Importe de impuesto', { scale: 4 }),
    flag('tax_included', 'Impuesto incluido en el precio')
  ], {
    displayTemplate: '{{amount}} {{currency_code}}',
    note: 'Un único tramo de impuesto por precio.'
  }),

  collection('price_territories', 'Territorios de precio', 'language', [
    ref('price_id', 'Precio'),
    choice('territory_type', 'Tipo de territorio', lists.territoryType, 'País o región', { required: true }),
    territoryCode(),
    flag('included', 'Incluido', {
      required: true,
      note: 'Inclusión o exclusión'
    })
  ], { displayTemplate: '{{territory_code}}' })
];

export const relations = [
  ['book_contributors', 'book_id', 'books', 'contributors', 'CASCADE'],
  ['book_contributors', 'contributor_id', 'contributors', 'books', 'RESTRICT'],
  ['book_organizations', 'book_id', 'books', 'organizations', 'CASCADE'],
  ['book_organizations', 'organization_id', 'organizations', 'books', 'RESTRICT'],
  ['book_values', 'book_id', 'books', 'values', 'CASCADE'],
  ['book_subjects', 'book_id', 'books', 'subjects', 'CASCADE'],
  ['text_contents', 'book_id', 'books', 'text_contents', 'CASCADE'],
  ['supporting_resources', 'book_id', 'books', 'supporting_resources', 'CASCADE'],
  ['book_identifiers', 'book_id', 'books', 'identifiers', 'CASCADE'],
  ['book_series', 'book_id', 'books', 'series', 'CASCADE'],
  ['book_series', 'series_id', 'series', 'books', 'RESTRICT'],
  ['book_works', 'book_id', 'books', 'works', 'CASCADE'],
  ['book_works', 'work_id', 'works', 'books', 'RESTRICT'],
  ['related_products', 'book_id', 'books', 'related_products', 'CASCADE'],
  ['related_products', 'related_book_id', 'books', 'referenced_by', 'SET NULL'],
  ['book_supplies', 'book_id', 'books', 'supplies', 'CASCADE'],
  ['book_supplies', 'supplier_organization_id', 'organizations', 'supplies', 'RESTRICT'],
  ['prices', 'book_supply_id', 'book_supplies', 'prices', 'CASCADE'],
  ['price_territories', 'price_id', 'prices', 'territories', 'CASCADE']
].map(([manyCollection, manyField, oneCollection, oneField, onDelete]) => ({
  manyCollection,
  manyField,
  oneCollection,
  oneField,
  onDelete
}));

export const aliasField = (relation) => ({
  field: relation.oneField,
  type: 'alias',
  meta: baseMeta(relation.oneField.replaceAll('_', ' '), {
    interface: 'list-o2m',
    special: ['o2m'],
    width: 'full',
    options: { enableCreate: true, enableSelect: true, limit: 15 },
    sort: 100
  }),
  schema: null
});
