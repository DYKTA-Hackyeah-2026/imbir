import { normalizeText, stem, tokenize } from '../matchmaking/text.js';
import type { Program } from './domain.js';

/**
 * Hybrid relevance scoring for the innovation catalogue.
 *
 * The offline (deterministic) embedding is a hashed bag-of-words vector: its
 * cosine similarity is noisy for short queries against long catalogue entries,
 * so a fixed similarity gate discards perfectly relevant innovations. This
 * scorer combines three grounded signals instead:
 *
 *   1. IDF-weighted lexical overlap between the query and the indexed document,
 *      so distinctive terms ("telefon", "paczkomat") dominate common ones;
 *      the overlap saturates, so a vague query is not punished for its filler;
 *   2. structured need agreement against the catalogue taxonomy (`topics` /
 *      `problemsAddressed`, which carry ROPS problem tags). Each detected need
 *      matches either its canonical id (`digital_exclusion`) or its Polish label
 *      ("Wykluczenie cyfrowe"), so imported and hand-written records both work;
 *   3. semantic similarity from pgvector, which still helps when a live
 *      embedding model is configured.
 *
 * The result is a relevance score in [0, 1] used both for ranking and for the
 * "no solution" gate, replacing the old raw-cosine threshold.
 */
export interface ScoredProgram {
  program: Program;
  /** Raw vector similarity, exposed for debugging and eligibility ranking. */
  similarity: number;
  /** IDF-weighted query coverage of the document, in [0, 1]. */
  lexicalScore: number;
  /** Share of detected needs matched by the program taxonomy, in [0, 1]. */
  tagScore: number;
  /** Combined relevance, in [0, 1]. */
  relevance: number;
}

/** A detected need and the aliases (id, label) that identify it in the catalogue. */
export interface NeedMatch {
  id: string;
  aliases: readonly string[];
}

export interface ScoreProgramsInput {
  programs: readonly Program[];
  query: string;
  /** Needs detected in the query, matched against the catalogue taxonomy. */
  needs: readonly NeedMatch[];
  /** Vector similarity per program id, usually the top pgvector candidates. */
  vectorSimilarity: ReadonlyMap<string, number>;
}

const LEXICAL_WEIGHT = 0.6;
const TAG_WEIGHT = 0.25;
const VECTOR_WEIGHT = 0.15;

function stemmedTokens(text: string): string[] {
  return tokenize(text).map(stem);
}

function normalizeTag(value: string): string {
  return normalizeText(value);
}

/**
 * Scores every program against the query. Precomputation (tokens, document
 * frequency) is shared across the catalogue so this stays linear in its size.
 */
export function scorePrograms(input: ScoreProgramsInput): ScoredProgram[] {
  const queryTokens = [...new Set(stemmedTokens(input.query))];
  const documentTokens = new Map<string, Set<string>>();
  const documentFrequency = new Map<string, number>();
  const programTags = new Map<string, Set<string>>();

  for (const program of input.programs) {
    const tokens = new Set(stemmedTokens(program.searchText));
    documentTokens.set(program.id, tokens);
    for (const token of tokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
    programTags.set(
      program.id,
      new Set([...program.topics, ...program.problemsAddressed].map(normalizeTag)),
    );
  }

  const catalogueSize = Math.max(1, input.programs.length);
  const tokenWeights = new Map<string, number>();
  let totalWeight = 0;
  for (const token of queryTokens) {
    const frequency = documentFrequency.get(token) ?? 0;
    const weight = Math.log(1 + catalogueSize / (1 + frequency));
    tokenWeights.set(token, weight);
    totalWeight += weight;
  }

  const needs = input.needs.map((need) => ({
    aliases: [...new Set([need.id, ...need.aliases].map(normalizeTag))].filter(
      (alias) => alias.length > 0,
    ),
  }));

  return input.programs.map((program) => {
    const tokens = documentTokens.get(program.id) ?? new Set<string>();
    let matchedWeight = 0;
    for (const token of queryTokens) {
      if (tokens.has(token)) matchedWeight += tokenWeights.get(token) ?? 0;
    }
    // IDF-weighted coverage: a document must account for the distinctive query
    // terms, not just a pile of common ones, so generic matches score low.
    const lexicalScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    const tags = programTags.get(program.id) ?? new Set<string>();
    let matchedNeeds = 0;
    for (const need of needs) {
      if (need.aliases.some((alias) => tags.has(alias))) matchedNeeds += 1;
    }
    const tagScore = needs.length === 0 ? 0 : matchedNeeds / needs.length;

    const similarity = Math.max(0, input.vectorSimilarity.get(program.id) ?? 0);
    const relevance =
      LEXICAL_WEIGHT * lexicalScore + TAG_WEIGHT * tagScore + VECTOR_WEIGHT * similarity;

    return { program, similarity, lexicalScore, tagScore, relevance };
  });
}
