import type { AiGateway } from '../ai/gateway.js';
import type { CatalogueInnovation } from '../repositories/types.js';
import type { Interpretation } from './domain.js';
import { getNeedLabel } from './needs.js';
import { cosineSimilarity, lexicalOverlap, normalizeText, tokenize } from './text.js';

export interface Candidate {
  innovation: CatalogueInnovation;
  problemFit: number;
  targetGroupFit: number;
  contextFit: number;
  constraintsFit: number;
  evidenceScore: number;
  score: number;
  matchedNeedIds: string[];
  matchedNeedLabels: string[];
  matchedTargetGroups: string[];
  matchedContexts: string[];
  embeddingSimilarity: number;
  lexicalScore: number;
}

const WEIGHTS = {
  problemFit: 0.42,
  targetGroupFit: 0.16,
  contextFit: 0.14,
  constraintsFit: 0.16,
  evidenceScore: 0.12,
} as const;

const EVIDENCE_SCORES: Record<string, number> = {
  documented: 1,
  partially_documented: 0.65,
  synthetic: 0.25,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function innovationDocumentText(innovation: CatalogueInnovation): string {
  return [
    innovation.title,
    innovation.summary,
    innovation.description,
    innovation.problemTags.join(' '),
    innovation.targetGroups.join(' '),
    innovation.applicableContexts.join(' '),
  ].join(' ');
}

function needFit(interpretation: Interpretation, innovation: CatalogueInnovation): {
  score: number;
  matchedNeedIds: string[];
} {
  if (interpretation.needs.length === 0) return { score: 0, matchedNeedIds: [] };
  const tags = new Set(innovation.problemTags.map((tag) => normalizeText(tag)));
  let totalConfidence = 0;
  let matchedConfidence = 0;
  const matchedNeedIds: string[] = [];
  for (const need of interpretation.needs) {
    totalConfidence += need.confidence;
    if (tags.has(normalizeText(need.id)) || need.matchedTerms.some((term) => tags.has(normalizeText(term)))) {
      matchedConfidence += need.confidence;
      matchedNeedIds.push(need.id);
    }
  }
  if (totalConfidence === 0) return { score: 0, matchedNeedIds };
  return { score: matchedConfidence / totalConfidence, matchedNeedIds };
}

function targetGroupFit(interpretation: Interpretation, innovation: CatalogueInnovation): {
  score: number;
  matchedTargetGroups: string[];
} {
  const wanted = [...interpretation.recipients];
  if (wanted.length === 0) return { score: 0.5, matchedTargetGroups: [] };
  const wantedTokens = new Set(wanted.flatMap((group) => tokenize(group).map((token) => token)));
  const innovationTokens = new Set(innovation.targetGroups.flatMap((group) => tokenize(group)));
  const matchedTargetGroups = innovation.targetGroups.filter((group) =>
    tokenize(group).some((token) => wantedTokens.has(token)),
  );
  let shared = 0;
  for (const token of wantedTokens) if (innovationTokens.has(token)) shared += 1;
  const lexical = wantedTokens.size === 0 ? 0 : shared / wantedTokens.size;
  const exact = matchedTargetGroups.length > 0 ? 0.5 : 0;
  return { score: clamp01(exact + lexical * 0.5), matchedTargetGroups };
}

function contextFit(interpretation: Interpretation, innovation: CatalogueInnovation): {
  score: number;
  matchedContexts: string[];
} {
  if (interpretation.localContext.length === 0) return { score: 0.5, matchedContexts: [] };
  if (innovation.applicableContexts.length === 0) return { score: 0.5, matchedContexts: [] };
  const contexts = innovation.applicableContexts.map((context) => normalizeText(context));
  const matchedContexts: string[] = [];
  let hits = 0;
  for (const local of interpretation.localContext) {
    const normalizedLocal = normalizeText(local.replace(/^(gmina|powiat):\s*/i, ''));
    const localTokens = new Set(tokenize(normalizedLocal));
    for (const context of contexts) {
      const contextTokens = tokenize(context);
      if (contextTokens.some((token) => localTokens.has(token))) {
        hits += 1;
        matchedContexts.push(innovation.applicableContexts[contexts.indexOf(context)] ?? context);
        break;
      }
    }
  }
  if (hits === 0) return { score: 0.3, matchedContexts };
  return { score: clamp01(0.6 + 0.2 * hits), matchedContexts };
}

function constraintsFit(interpretation: Interpretation, innovation: CatalogueInnovation): number {
  const parts: number[] = [];
  const budget = interpretation.constraints.budgetPln;
  if (budget !== undefined) {
    if (innovation.estimatedCostPln === null) parts.push(0.5);
    else parts.push(innovation.estimatedCostPln <= budget ? 1 : 0.2);
  } else {
    parts.push(0.5);
  }

  const timeframe = interpretation.constraints.timeframeWeeks;
  if (timeframe !== undefined) {
    if (innovation.timeframeWeeks === null) parts.push(0.5);
    else parts.push(innovation.timeframeWeeks <= timeframe ? 1 : 0.3);
  } else {
    parts.push(0.5);
  }

  const available = interpretation.availableResources;
  if (available.length > 0) {
    const wanted = new Set(available.flatMap((item) => tokenize(item)));
    const needed = new Set(
      [...innovation.resourcesRequired, ...innovation.prerequisites].flatMap((item) => tokenize(item)),
    );
    let shared = 0;
    for (const token of wanted) if (needed.has(token)) shared += 1;
    parts.push(wanted.size === 0 ? 0.5 : clamp01(0.3 + 0.7 * (shared / wanted.size)));
  } else {
    parts.push(0.5);
  }

  const accessibility = interpretation.constraints.accessibilityNeeds;
  if (accessibility && accessibility.length > 0) {
    const tags = new Set(innovation.problemTags.map((tag) => normalizeText(tag)));
    const related =
      tags.has('disability_accessibility') ||
      tags.has('transport_rural') ||
      innovation.applicableContexts.some((context) => normalizeText(context).includes('dostepn'));
    parts.push(related ? 0.9 : 0.4);
  }

  return clamp01(parts.reduce((sum, value) => sum + value, 0) / parts.length);
}

export interface RetrievalResult {
  candidates: Candidate[];
  /** True when the query embedding came from the live provider. */
  usedLiveEmbeddings: boolean;
}

/** Retrieves and scores every catalogue candidate for one interpretation. */
export async function retrieveCandidates(
  innovations: CatalogueInnovation[],
  interpretation: Interpretation,
  queryText: string,
  ai: AiGateway,
): Promise<RetrievalResult> {
  if (innovations.length === 0) return { candidates: [], usedLiveEmbeddings: false };

  const [queryEmbedding] = await ai.embed([queryText]);
  const documentTexts = innovations.map(innovationDocumentText);
  const computed = await ai.embed(documentTexts);

  const candidates: Candidate[] = innovations.map((innovation, index) => {
    const documentTokens = tokenize(documentTexts[index]);
    const lexical = clamp01(lexicalOverlap(interpretation.keywords, documentTokens) * 1.15);
    const need = needFit(interpretation, innovation);
    const embedding = innovation.embedding ?? computed[index] ?? [];
    const embeddingSimilarity = clamp01(cosineSimilarity(queryEmbedding ?? [], embedding));
    const problemFit = clamp01(0.35 * lexical + 0.45 * need.score + 0.2 * embeddingSimilarity);

    const target = targetGroupFit(interpretation, innovation);
    const context = contextFit(interpretation, innovation);
    const constraints = constraintsFit(interpretation, innovation);
    const evidenceScore = EVIDENCE_SCORES[innovation.evidenceStatus] ?? 0.4;

    const score = clamp01(
      WEIGHTS.problemFit * problemFit +
        WEIGHTS.targetGroupFit * target.score +
        WEIGHTS.contextFit * context.score +
        WEIGHTS.constraintsFit * constraints +
        WEIGHTS.evidenceScore * evidenceScore,
    );

    return {
      innovation,
      problemFit,
      targetGroupFit: target.score,
      contextFit: context.score,
      constraintsFit: constraints,
      evidenceScore,
      score,
      matchedNeedIds: need.matchedNeedIds,
      matchedNeedLabels: need.matchedNeedIds.map((id) => getNeedLabel(id)),
      matchedTargetGroups: target.matchedTargetGroups,
      matchedContexts: context.matchedContexts,
      embeddingSimilarity,
      lexicalScore: lexical,
    };
  });

  return { candidates, usedLiveEmbeddings: ai.kind === 'http' };
}
