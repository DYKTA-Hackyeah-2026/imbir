import { getNeedLabel } from '../matchmaking/needs.js';
import { truncate } from '../matchmaking/text.js';
import type {
  ConversationState,
  EligibilityStatus,
  Program,
  Recommendation,
  RecommendationDetail,
} from './domain.js';

/**
 * Grounded explanation built only from the conversation state and the concrete
 * program record. The LLM never gets to invent programs, names, URLs or criteria.
 */
export function buildMatchExplanation(state: ConversationState, program: Program): string {
  const needs = state.needs.slice(0, 2);
  const focus =
    needs.length > 0
      ? `Odpowiada na zgłoszone potrzeby: ${needs.join(', ')}.`
      : 'Odpowiada na zgłoszoną potrzebę.';
  const audience =
    program.targetGroups.length > 0 ? ` Dla kogo: ${program.targetGroups.join(', ')}.` : '';
  return truncate(`${focus}${audience}`, 400);
}

/** Canonical ROPS need ids (`digital_exclusion`) become readable Polish labels. */
function humanize(value: string): string {
  return getNeedLabel(value.trim());
}

function uniqueValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = humanize(raw);
    const key = value.toLocaleLowerCase('pl');
    if (value.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function sameValues(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a.map((value) => value.toLocaleLowerCase('pl')));
  return b.every((value) => set.has(value.toLocaleLowerCase('pl')));
}

function detail(label: string, values: readonly string[]): RecommendationDetail | undefined {
  const clean = values.map((value) => value.trim()).filter((value) => value.length > 0);
  if (clean.length === 0) return undefined;
  return { label, value: truncate(clean.join(', '), 300) };
}

function toDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toRecommendation(
  state: ConversationState,
  program: Program,
  eligibilityStatus: EligibilityStatus,
): Recommendation {
  const topics = uniqueValues(program.topics);
  const problems = uniqueValues(program.problemsAddressed);

  const details = [
    detail('Dla kogo', program.targetGroups),
    detail('Tematy', topics),
    // Imported innovations carry the same tags as topics and problems; only show
    // the second list when it actually adds information.
    sameValues(topics, problems) ? undefined : detail('Pomaga w', problems),
    program.validUntil ? { label: 'Dostępny do', value: toDate(program.validUntil) } : undefined,
  ].filter((entry): entry is RecommendationDetail => entry !== undefined);

  return {
    id: program.id,
    title: program.title,
    summary: program.summary,
    matchExplanation: buildMatchExplanation(state, program),
    eligibilityStatus,
    ...(program.eligibilityDescription
      ? { eligibilityDescription: truncate(program.eligibilityDescription, 300) }
      : {}),
    details,
    ...(program.url ? { url: program.url } : {}),
  };
}
