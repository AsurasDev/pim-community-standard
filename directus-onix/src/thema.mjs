import {
  themaChoices,
  themaLastUpdated,
  themaVersion
} from './thema-codelist.generated.mjs';

const schemeByPrefix = Object.freeze({
  '1': '94',
  '2': '95',
  '3': '96',
  '4': '97',
  '5': '98',
  '6': '99'
});

const groups = {
  '93': [],
  '94': [],
  '95': [],
  '96': [],
  '97': [],
  '98': [],
  '99': []
};

for (const choice of themaChoices) {
  const scheme = schemeByPrefix[choice.value[0]] ?? '93';
  groups[scheme].push(choice);
}

export { themaChoices, themaLastUpdated, themaVersion };

export const themaChoicesByScheme = Object.freeze(
  Object.fromEntries(
    Object.entries(groups).map(([scheme, choices]) => [scheme, Object.freeze(choices)])
  )
);

export const themaSchemeLabels = Object.freeze({
  '93': 'Categorías de materia',
  '94': 'Calificadores de lugar',
  '95': 'Calificadores de lengua',
  '96': 'Calificadores de período temporal',
  '97': 'Calificadores de fines educativos',
  '98': 'Calificadores de interés',
  '99': 'Calificadores de estilo'
});
