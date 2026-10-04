import { truncate } from '../matchmaking/text.js';

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
