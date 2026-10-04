import { detectNeeds } from '../matchmaking/needs.js';
import { lexicalOverlap, normalizeText, tokenize, truncate } from '../matchmaking/text.js';

export interface ProgramSearchTextInput {
  title: string;
  summary: string;
  description: string;
  targetGroups: readonly string[];
  topics: readonly string[];
  problemsAddressed: readonly string[];
}

function bullet(label: string, values: readonly string[]): string | undefined {
  const clean = values.map((value) => value.trim()).filter((value) => value.length > 0);
  if (clean.length === 0) return undefined;
  return `${label}:\n${clean.map((value) => `- ${value}`).join('\n')}`;
}

/**
 * Builds a deterministic, debuggable search document from structured program
 * fields. The embedding is generated from this text, never from the raw
 * description, so search behaviour is reproducible and inspectable.
 */
export function buildProgramSearchText(input: ProgramSearchTextInput): string {
  const sections = [
    `Program: ${input.title.trim()}`,
    input.summary.trim(),
    bullet('Dla kogo', input.targetGroups),
    bullet('Tematy', input.topics),
    bullet('Pomaga w', input.problemsAddressed),
    `Opis:\n${input.description.trim()}`,
  ].filter((section): section is string => Boolean(section && section.length > 0));

  return truncate(sections.join('\n\n'), 8000);
}

/** Explicit catalogue tags remain useful when embeddings are offline or unavailable. */
export function programSearchSimilarity(
  query: string,
  program: ProgramSearchTextInput,
  vectorSimilarity: number,
): number {
  const queryNeeds = detectNeeds(query);
  const tags = new Set([...program.topics, ...program.problemsAddressed]);
  const sharedNeeds = queryNeeds.filter((need) => tags.has(need.id));
  const lexical = lexicalOverlap(tokenize(query), tokenize(`${program.title} ${program.summary}`));
  const taxonomyScore = sharedNeeds.length > 0
    ? 0.45 + 0.15 * sharedNeeds.length / queryNeeds.length + 0.1 * lexical
    : 0;
  const title = normalizeText(program.title);
  const titleScore = title.length >= 4 && ` ${normalizeText(query)} `.includes(` ${title} `) ? 0.8 : 0;
  return Math.max(Number.isFinite(vectorSimilarity) ? vectorSimilarity : 0, taxonomyScore, titleScore);
}
