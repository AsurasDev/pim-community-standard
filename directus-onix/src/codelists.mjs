import { officialLists, onixIssue } from './onix-codelists.generated.mjs';

const list = (number) => {
  const choices = officialLists[String(number)];
  if (!choices) throw new Error(`No está disponible la lista ONIX ${number}.`);
  return choices;
};

const choice = (value, text) => ({ value, text });

export { onixIssue };

export const lists = {
  notificationType: list(1),
  identifierType: list(5),
  collectionIdentifierType: list(13),
  workIdentifierType: list(16),
  titleType: list(15),
  contributorRole: list(17),
  editionType: list(21),
  languageRole: list(22),
  extentType: list(23),
  extentUnit: list(24),
  subjectScheme: list(27),
  audienceCodeType: list(28),
  audienceCode: list(29),
  textFormat: list(34),
  nameIdentifierType: list(44),
  publishingRole: list(45),
  rightsType: list(46),
  measureType: list(48),
  regionCode: list(49),
  measureUnit: list(50),
  relationCode: list(51),
  dateFormat: list(55),
  priceType: list(58),
  publishingStatus: list(64),
  availability: list(65),
  marketPublishingStatus: list(68),
  languageCode: list(74),
  dvdRegion: list(76),
  formFeatureType: list(79),
  countryCode: list(91),
  supplierRole: list(93),
  currencyCode: list(96),
  colorCode: list(98),
  coverMaterial: list(99),
  scriptCode: list(121),
  usHazard: list(143),
  collectionType: list(148),
  titleElementLevel: list(149),
  productForm: list(150),
  textType: list(153),
  contentAudience: list(154),
  resourceContentType: list(158),
  resourceMode: list(159),
  resourceFormat: list(161),
  dateRole: list(163),
  workRelationCode: list(164),
  taxType: list(171),
  formDetail: list(175),
  operatingSystem: list(176),
  fileFormat: list(178),
  euHazard: list(184),
  accessibility: list(196),
  formatVersion: list(220),
  batteryType: list(242),
  dangerousGoods: list(243),
  certificationScheme: list(262),
  contributorType: [
    choice('person', 'Persona'),
    choice('corporate', 'Entidad corporativa')
  ],
  territoryType: [
    choice('country', 'País'),
    choice('region', 'Región')
  ],
  identifierEntity: [
    choice('book', 'Libro'),
    choice('contributor', 'Colaborador'),
    choice('organization', 'Organización'),
    choice('collection', 'Colección o serie')
  ]
};

export const yesNoChoices = [choice(true, 'Sí'), choice(false, 'No')];
