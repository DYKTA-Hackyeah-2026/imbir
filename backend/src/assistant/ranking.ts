import type { EligibilityStatus, Program, RankedProgram } from './domain.js';

/** Eligible programs are nudged above equally-similar unknowns, never below a conflict-free ranking. */
const ELIGIBLE_BOOST = 0.05;

export interface RankableCandidate {
  program: Program;
  similarity: number;
  eligibilityStatus: EligibilityStatus;
}

/**
 * Filters explicit conflicts and produces a deterministic, stable order.
 * Ties are broken by title and id so pagination never reshuffles results.
 */
export function rankCandidates(candidates: readonly RankableCandidate[]): RankedProgram[] {
  return candidates
    .filter((candidate) => candidate.eligibilityStatus !== 'conflict')
    .map((candidate) => ({
      ...candidate,
      score: candidate.similarity + (candidate.eligibilityStatus === 'eligible' ? ELIGIBLE_BOOST : 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.program.title.localeCompare(b.program.title, 'pl') ||
        a.program.id.localeCompare(b.program.id),
    );
}
