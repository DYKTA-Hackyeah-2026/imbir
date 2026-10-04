import type { Relevance } from './domain.js';
import type { Candidate } from './retrieval.js';
import { normalizeText } from './text.js';

const MIN_PROBLEM_FIT = 0.18;
const MIN_SCORE = 0.34;
const MIN_LEXICAL_SIGNAL = 0.28;
const HIGH_SCORE = 0.62;
const MEDIUM_SCORE = 0.42;

export interface RankedMatch {
  candidate: Candidate;
  relevance: Relevance;
}

function relevanceFor(score: number): Relevance {
  if (score >= HIGH_SCORE) return 'high';
  if (score >= MEDIUM_SCORE) return 'medium';
  return 'low';
}

/**
 * Filters, de-duplicates and orders candidates. Relevance describes suitability
 * for the described need, not a probability that the innovation works.
 */
export function rankCandidates(candidates: Candidate[], limit = 5): RankedMatch[] {
  const suitable = candidates
    .filter(
      (candidate) =>
        candidate.problemFit >= MIN_PROBLEM_FIT &&
        candidate.score >= MIN_SCORE &&
        (candidate.matchedNeedIds.length > 0 || candidate.lexicalScore >= MIN_LEXICAL_SIGNAL),
    )
    .sort((a, b) => b.score - a.score || b.problemFit - a.problemFit);

  const seen = new Set<string>();
  const ranked: RankedMatch[] = [];
  for (const candidate of suitable) {
    const titleKey = normalizeText(candidate.innovation.title);
    const summaryKey = normalizeText(candidate.innovation.summary).slice(0, 80);
    if (seen.has(titleKey) || seen.has(summaryKey)) continue;
    seen.add(titleKey);
    seen.add(summaryKey);
    ranked.push({ candidate, relevance: relevanceFor(candidate.score) });
    if (ranked.length >= limit) break;
  }
  return ranked;
}
