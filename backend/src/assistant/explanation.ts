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
  const needs = state.needs.slice(0, 3);
  const focus =
    needs.length > 0
      ? `Odpowiada na zgłoszone potrzeby: ${needs.join(', ')}.`
      : 'Odpowiada na zgłoszoną potrzebę.';
  const audience =
    program.targetGroups.length > 0 ? ` Dla kogo: ${program.targetGroups.join(', ')}.` : '';
  return truncate(`${focus}${audience}`, 400);
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
  const details = [
    detail('Dla kogo', program.targetGroups),
    detail('Tematy', program.topics),
    detail('Pomaga w', program.problemsAddressed),
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
