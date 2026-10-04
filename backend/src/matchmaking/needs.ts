import type { IdentifiedNeed } from './domain.js';
import { normalizeText } from './text.js';

interface NeedDefinition {
  id: string;
  label: string;
  /** Folded, lower-case phrases matched on word boundaries. */
  terms: string[];
}

/**
 * Canonical need taxonomy. Identifiers and matching terms are English/Polish
 * technical values; `label` is the user-facing Polish wording.
 */
export const NEED_DEFINITIONS: readonly NeedDefinition[] = [
  {
    id: 'unemployment_activation',
    label: 'Aktywizacja zawodowa i bezrobocie',
    terms: ['bezrobot', 'bezroboci', 'zatrudnien', 'praca', 'pracodawc', 'rekrutacj', 'kwalifikacj', 'przekwalifik', 'aktywizacj zawodow', 'poszukujac prac'],
  },
  {
    id: 'senior_loneliness',
    label: 'Samotność i wsparcie seniorów',
    terms: ['senior', 'osob starsz', 'osoby starsz', 'starszych osob', 'samotn', 'izolacj spoleczn', 'emeryt', 'niesamodzieln', 'opieka nad starsz'],
  },
  {
    id: 'disability_accessibility',
    label: 'Niepełnosprawność i dostępność',
    terms: ['niepelnosprawn', 'dostepnos', 'dostepn', 'wozek', 'barier architektoniczn', 'asysten', 'rehabilitacj', 'osob z niepelnosprawn'],
  },
  {
    id: 'children_youth',
    label: 'Dzieci, młodzież i edukacja pozaszkolna',
    terms: ['dziec', 'mlodzie', 'uczni', 'szkol', 'wychowan', 'swietlic', 'mlodych', 'mlod'],
  },
  {
    id: 'family_support',
    label: 'Wsparcie rodzin i piecza zastępcza',
    terms: ['rodzin', 'rodzic', 'samotn matk', 'samotn ojc', 'piecza zastepcz', 'opieka zastepcz', 'przemoc domow'],
  },
  {
    id: 'addiction',
    label: 'Uzależnienia i profilaktyka',
    terms: ['uzaleznien', 'alkohol', 'narkot', 'hazard', 'terapi uzaleznien', 'trzezw'],
  },
  {
    id: 'mental_health',
    label: 'Zdrowie psychiczne i kryzys',
    terms: ['zdrowi psychiczn', 'zdrowia psychicznego', 'depresj', 'kryzys psychicz', 'lek', 'lękow', 'wypalen', 'psycholog', 'psychiatr', 'wsparcie psychologiczn'],
  },
  {
    id: 'migrant_integration',
    label: 'Integracja migrantów i uchodźców',
    terms: ['migrant', 'uchodzc', 'uchodz', 'cudzoziem', 'integracj', 'imigrant', 'ukeinin', 'ukrain', 'jezyk polsk jako obc'],
  },
  {
    id: 'poverty_exclusion',
    label: 'Ubóstwo i wykluczenie społeczne',
    terms: ['ubostw', 'wykluczen', 'bied', 'bezdomn', 'pomoc spoleczn', 'zywnos', 'mops', 'gopps', 'zasilek', 'niedozywien'],
  },
  {
    id: 'education_competences',
    label: 'Edukacja i kompetencje',
    terms: ['edukacj', 'kompetencj', 'ksztalcen', 'kurs', 'szkolen', 'nauk', 'czytan', 'umiejetnos'],
  },
  {
    id: 'digital_exclusion',
    label: 'Wykluczenie cyfrowe',
    terms: ['cyfrow', 'internet', 'komputer', 'smartfon', 'kompetencj cyfrow', 'e-uslug', 'wykluczen cyfrow'],
  },
  {
    id: 'volunteering_community',
    label: 'Wolontariat i społeczność lokalna',
    terms: ['wolontari', 'sasiedz', 'lokaln spoleczn', 'lokalna wspolnot', 'partycypacj', 'inicjatyw lokaln'],
  },
  {
    id: 'housing',
    label: 'Mieszkalnictwo i bezdomność',
    terms: ['mieszkal', 'lokal socjaln', 'eksmisj', 'schronien', 'noclegown', 'bezdomn'],
  },
  {
    id: 'environment',
    label: 'Ekologia i środowisko',
    terms: ['ekolog', 'srodowisk', 'klimat', 'zielon', 'recyklin', 'smog', 'zanieczyszczen'],
  },
  {
    id: 'safety_violence',
    label: 'Bezpieczeństwo i przeciwdziałanie przemocy',
    terms: ['przemoc', 'bezpieczenstw', 'ofiar', 'interwencj kryzysow', 'przestepcz', 'ochrona'],
  },
  {
    id: 'transport_rural',
    label: 'Transport i dostępność komunikacyjna',
    terms: ['transport', 'komunikacj publiczn', 'dojazd', 'wykluczen transportow', 'wiejsk', 'obszar wiejsk'],
  },
];

const NEED_BY_ID = new Map(NEED_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getNeedLabel(needId: string): string {
  return NEED_BY_ID.get(needId)?.label ?? needId;
}

interface MatchedTerm {
  term: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function confidenceFor(hits: number): number {
  if (hits <= 0) return 0;
  if (hits === 1) return 0.6;
  if (hits === 2) return 0.78;
  if (hits === 3) return 0.88;
  return 0.95;
}

/** Detects canonical needs in free Polish text using term matching. */
export function detectNeeds(rawText: string): IdentifiedNeed[] {
  const text = normalizeText(rawText);
  if (text.length === 0) return [];

  const results: IdentifiedNeed[] = [];
  for (const definition of NEED_DEFINITIONS) {
    const matched: string[] = [];
    for (const term of definition.terms) {
      if (term.length < 4) continue;
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}`, 'g');
      if (pattern.test(text)) {
        matched.push(term);
      }
    }
    if (matched.length > 0) {
      results.push({
        id: definition.id,
        label: definition.label,
        confidence: confidenceFor(matched.length),
        matchedTerms: matched,
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
