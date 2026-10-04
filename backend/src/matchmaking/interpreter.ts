import type {
  ClarificationAnswer,
  ClarifyingQuestion,
  Interpretation,
  MatchmakingInput,
} from './domain.js';
import { detectNeeds } from './needs.js';
import { normalizeText, tokenize, truncate, uniqueStrings } from './text.js';

interface RecipientDefinition {
  label: string;
  terms: string[];
}

const RECIPIENT_DEFINITIONS: readonly RecipientDefinition[] = [
  { label: 'Seniorzy', terms: ['senior', 'osob starsz', 'osoby starsz', 'emeryt'] },
  { label: 'Dzieci i młodzież', terms: ['dziec', 'mlodzie', 'uczni'] },
  { label: 'Rodziny', terms: ['rodzin', 'rodzic', 'samotn matk', 'samotn ojc'] },
  {
    label: 'Osoby z niepełnosprawnościami',
    terms: ['niepelnosprawn', 'osob z niepelnosprawn'],
  },
  { label: 'Osoby bezrobotne', terms: ['bezrobot', 'poszukujac prac'] },
  { label: 'Migranci i uchodźcy', terms: ['migrant', 'uchodzc', 'cudzoziem', 'ukrain'] },
  { label: 'Osoby w kryzysie psychicznym', terms: ['kryzys psychicz', 'zdrowi psychiczn', 'depresj'] },
  { label: 'Osoby doświadczające przemocy', terms: ['przemoc'] },
  { label: 'Osoby bezdomne', terms: ['bezdomn'] },
  { label: 'Osoby z uzależnieniami', terms: ['uzaleznien', 'alkohol', 'narkot'] },
  { label: 'Społeczność lokalna i wolontariusze', terms: ['sasiedz', 'wolontari', 'lokaln spoleczn'] },
];

const GOAL_MARKERS = [
  'chcemy',
  'celem',
  'aby',
  'popraw',
  'zwieksz',
  'zmniejsz',
  'wzrost',
  'redukcj',
  'wsparcie',
  'wspierac',
  'aktywizacj',
  'integracj',
  'zapobieg',
  'edukacj',
  'wzmacnian',
  'rozwoj',
  'przeciwdzial',
  'wlaczen',
  'usamodzielnien',
  'rehabilitacj',
];

function firstSentences(value: string, count: number, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length === 0) return '';
  const parts = clean.match(/[^.!?]+[.!?]?/g) ?? [clean];
  return truncate(parts.slice(0, count).join(' ').trim(), maxLength);
}

function detectRecipients(text: string): string[] {
  const normalized = normalizeText(text);
  const recipients: string[] = [];
  for (const definition of RECIPIENT_DEFINITIONS) {
    if (definition.terms.some((term) => normalized.includes(term))) {
      recipients.push(definition.label);
    }
  }
  return recipients;
}

function detectDesiredChange(text: string): string | undefined {
  const normalized = normalizeText(text);
  const clauses = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
  for (const clause of clauses) {
    const folded = normalizeText(clause);
    if (GOAL_MARKERS.some((marker) => folded.includes(marker))) {
      return truncate(clause, 200);
    }
  }
  if (GOAL_MARKERS.some((marker) => normalized.includes(marker))) {
    return truncate(text, 200);
  }
  return undefined;
}

function detectResourceMentions(text: string): string[] {
  const normalized = normalizeText(text);
  const resources: Array<[string, string[]]> = [
    ['wolontariusze', ['wolontari']],
    ['budżet', ['budzet']],
    ['pomieszczenie', ['swietlic', 'sala', 'pomieszczen']],
    ['partnerzy lokalni', ['partner', 'ngo', 'organizacj pozarzadow']],
    ['personel', ['pracownik', 'kadr', 'personel']],
  ];
  const found: string[] = [];
  for (const [label, terms] of resources) {
    if (terms.some((term) => normalized.includes(term))) found.push(label);
  }
  return found;
}

interface StructuredClarifications {
  appendedText: string;
  recipients: string[];
  resources: string[];
  location: string[];
  desiredChange?: string;
  extraConstraints: string[];
}

function applyClarifications(
  answers: ClarificationAnswer[] | undefined,
  input: MatchmakingInput,
): StructuredClarifications {
  const result: StructuredClarifications = {
    appendedText: '',
    recipients: [],
    resources: [],
    location: [],
    extraConstraints: [],
  };
  if (!answers || answers.length === 0) return result;

  const parts: string[] = [];
  for (const answer of answers) {
    const text = typeof answer.answer === 'string' ? answer.answer.trim() : '';
    if (text.length === 0) continue;
    parts.push(text);
    const id = answer.questionId.toLowerCase();
    if (id.includes('target') || id.includes('odbior')) result.recipients.push(text);
    else if (id.includes('location') || id.includes('obszar') || id.includes('lokaliz')) result.location.push(text);
    else if (id.includes('resource') || id.includes('zasob') || id.includes('budget') || id.includes('budzet')) {
      result.resources.push(text);
    } else if (id.includes('desired') || id.includes('zmian')) result.desiredChange = text;
    else if (id.includes('constraint') || id.includes('ograniczen')) result.extraConstraints.push(text);
  }
  result.appendedText = parts.join(' ');
  return result;
}

/** Deterministic interpretation of a free-text Polish problem description. */
export function interpretProblem(input: MatchmakingInput): Interpretation {
  const clarifications = applyClarifications(input.clarificationAnswers, input);
  const effectiveText = [input.problemDescription, clarifications.appendedText].filter(Boolean).join(' ');

  const needs = detectNeeds(effectiveText);
  const recipientsFromText = detectRecipients(effectiveText);
  const providedTargetGroups = (input.targetGroups ?? []).map((group) => group.trim()).filter(Boolean);

  const recipients = uniqueStrings([
    ...providedTargetGroups,
    ...clarifications.recipients,
    ...recipientsFromText,
  ]);

  const desiredChange = clarifications.desiredChange ?? detectDesiredChange(effectiveText);

  const localContext: string[] = [];
  if (input.location?.municipality) localContext.push(`gmina: ${input.location.municipality}`);
  if (input.location?.county) localContext.push(`powiat: ${input.location.county}`);
  localContext.push(...clarifications.location);
  const normalizedText = normalizeText(effectiveText);
  if (normalizedText.includes('wiejsk') || normalizedText.includes('wies')) localContext.push('obszar wiejski');
  if (normalizedText.includes('miast') || normalizedText.includes('miejsk')) localContext.push('obszar miejski');

  const providedResources = (input.constraints?.availableResources ?? []).map((item) => item.trim()).filter(Boolean);
  const availableResources = uniqueStrings([
    ...providedResources,
    ...clarifications.resources,
    ...detectResourceMentions(effectiveText),
  ]);

  const missingInfo: string[] = [];
  if (recipients.length === 0) missingInfo.push('Nie wskazano odbiorców działań (grup docelowych).');
  if (localContext.length === 0) missingInfo.push('Nie wskazano obszaru, którego dotyczy problem.');
  if (!desiredChange) missingInfo.push('Nie wskazano wprost oczekiwanej zmiany.');
  if (input.constraints?.budgetPln === undefined && input.constraints?.timeframeWeeks === undefined) {
    missingInfo.push('Nie podano budżetu ani horyzontu czasowego.');
  }

  const assumptions: string[] = [];
  if (recipients.length > 0 && providedTargetGroups.length === 0) {
    assumptions.push('Odbiorców wywnioskowano z opisu problemu.');
  }
  if (localContext.length === 0) {
    assumptions.push('Przyjęto, że rozwiązanie ma być zastosowane w Małopolsce.');
  }
  if (availableResources.length === 0) {
    assumptions.push('Nie przyjęto żadnych założonych zasobów — traktujemy je jako nieznane.');
  }

  const tokenCount = tokenize(effectiveText).length;
  const mainProblem = firstSentences(input.problemDescription, 2, 320) || truncate(input.problemDescription, 320);

  return {
    mainProblem,
    recipients,
    desiredChange: desiredChange ?? 'Nie wskazano wprost oczekiwanej zmiany.',
    localContext,
    availableResources,
    constraints: { ...input.constraints, availableResources: availableResources.length > 0 ? availableResources : undefined },
    missingInfo,
    needs,
    keywords: tokenize(effectiveText).slice(0, 40),
    assumptions: tokenCount < 6 ? ['Opis problemu jest bardzo krótki — interpretacja może być niepełna.'] : assumptions,
  };
}

/**
 * Builds at most three clarifying questions, and only for information that
 * materially changes matching. Returns an empty list when nothing is needed.
 */
export function buildClarifyingQuestions(
  input: MatchmakingInput,
  interpretation: Interpretation,
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];
  const hasAnswers = (input.clarificationAnswers?.length ?? 0) > 0;
  if (hasAnswers) return questions;

  const tokenCount = tokenize(input.problemDescription).length;
  const needs = interpretation.needs;

  if (needs.length === 0 || tokenCount < 6) {
    questions.push({
      id: 'problem_detail',
      question: 'Opisz proszę problem bardziej szczegółowo: co się dzieje, kogo dotyczy i od kiedy?',
    });
  }

  const hasTargetGroup = interpretation.recipients.length > 0 || (input.targetGroups?.length ?? 0) > 0;
  const hasLocation = interpretation.localContext.length > 0;
  if (!hasTargetGroup && tokenCount < 25 && questions.length < 3) {
    questions.push({
      id: 'target_group',
      question: 'Kogo przede wszystkim dotyczy problem (np. seniorów, młodzieży, rodzin)?',
    });
  }
  if (!hasLocation && interpretation.needs.length > 0 && tokenCount < 12 && questions.length < 3) {
    questions.push({
      id: 'location',
      question: 'Jakiego obszaru dotyczy problem (gmina lub powiat)?',
    });
  }

  return questions.slice(0, 3);
}
