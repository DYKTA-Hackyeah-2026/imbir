import { randomUUID } from 'node:crypto';
import type { AiGateway } from '../ai/gateway.js';
import { ApiError } from '../http/errors.js';
import type {
  CatalogueInnovation,
  CatalogueRepository,
  CatalogueSource,
} from '../repositories/types.js';
import { SYNTHETIC_DISCLAIMER } from '../repositories/seed.js';
import type {
  EvidenceStatus,
  FeedbackInput,
  FeedbackResponse,
  InnovationDetail,
  InnovationListOptions,
  InnovationListResponse,
  InnovationSortField,
  InnovationSummary,
  Interpretation,
  MatchmakingInput,
  MatchmakingResponse,
  RelatedEvidence,
  ServiceMode,
} from './domain.js';
import { buildMatch } from './explanation.js';
import { buildClarifyingQuestions, interpretProblem } from './interpreter.js';
import { retrieveCandidates } from './retrieval.js';
import { rankCandidates } from './ranking.js';
import { normalizeText, stemTokens, tokenize, truncate, uniqueStrings } from './text.js';

export interface MatchmakingServiceDeps {
  repository: CatalogueRepository;
  ai: AiGateway;
  seedWarnings?: string[];
  hasVerifiedCatalogue: boolean;
}

const SOURCE_UNVERIFIED_NOTE =
  'Treści źródeł ROPS nie zostały pobrane w tej instancji — źródła wskazano jako lokalizacje do ręcznej weryfikacji.';

const SYNTHETIC_MODE_NOTE =
  'Usługa działa w trybie demonstracyjnym: rekomendacje oparte są na rekordach syntetycznych i nie są zweryfikowanymi innowacjami ROPS.';

function searchableTokens(innovation: CatalogueInnovation): Set<string> {
  return new Set(
    stemTokens(
      tokenize(
        [
          innovation.title,
          innovation.summary,
          innovation.description,
          innovation.problemTags.join(' '),
          innovation.targetGroups.join(' '),
          innovation.testedIn.join(' '),
          innovation.applicableContexts.join(' '),
        ].join(' '),
      ),
    ),
  );
}

function matchesQuery(innovation: CatalogueInnovation, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true;
  const documentTokens = searchableTokens(innovation);
  return stemTokens(queryTokens).every((token) => documentTokens.has(token));
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

function compareInnovations(a: CatalogueInnovation, b: CatalogueInnovation, sort: InnovationSortField): number {
  const byTitle = a.title.localeCompare(b.title, 'pl');
  if (sort === 'cost') return compareNullableNumbers(a.estimatedCostPln, b.estimatedCostPln) || byTitle;
  if (sort === 'timeframe') return compareNullableNumbers(a.timeframeWeeks, b.timeframeWeeks) || byTitle;
  return byTitle;
}

function toInnovationSummary(innovation: CatalogueInnovation): InnovationSummary {
  return {
    innovationId: innovation.id,
    title: innovation.title,
    summary: innovation.summary,
    sourceId: innovation.sourceId,
    evidenceStatus: innovation.evidenceStatus as EvidenceStatus,
    synthetic: innovation.synthetic,
    problemTags: innovation.problemTags,
    targetGroups: innovation.targetGroups,
    testedIn: innovation.testedIn,
    applicableContexts: innovation.applicableContexts,
    estimatedCostPln: innovation.estimatedCostPln,
    timeframeWeeks: innovation.timeframeWeeks,
  };
}

function buildProblemSummary(interpretation: Interpretation): string {
  const base = interpretation.mainProblem.trim();
  const needs = interpretation.needs.map((need) => need.label);
  const needPart = needs.length > 0 ? ` Zidentyfikowane potrzeby: ${needs.join(', ')}.` : '';
  return truncate(`${base}${needPart}`, 500);
}

export class MatchmakingService {
  private readonly repository: CatalogueRepository;
  private readonly ai: AiGateway;
  private readonly seedWarnings: string[];
  private readonly hasVerifiedCatalogue: boolean;

  constructor(deps: MatchmakingServiceDeps) {
    this.repository = deps.repository;
    this.ai = deps.ai;
    this.seedWarnings = deps.seedWarnings ?? [];
    this.hasVerifiedCatalogue = deps.hasVerifiedCatalogue;
  }

  private baseWarnings(): string[] {
    const warnings = [...this.seedWarnings, SOURCE_UNVERIFIED_NOTE];
    if (!this.hasVerifiedCatalogue) warnings.push(SYNTHETIC_MODE_NOTE);
    return warnings;
  }

  private get mode(): ServiceMode {
    return this.hasVerifiedCatalogue ? 'live' : 'demo';
  }

  async match(input: MatchmakingInput): Promise<MatchmakingResponse> {
    const requestId = randomUUID();
    const interpretation = await this.ai.interpret(input);
    const clarifyingQuestions = buildClarifyingQuestions(input, interpretation);
    const warnings = this.baseWarnings();

    if (clarifyingQuestions.length > 0) {
      const response: MatchmakingResponse = {
        requestId,
        status: 'needs_clarification',
        mode: this.mode,
        problemSummary: buildProblemSummary(interpretation),
        identifiedNeeds: interpretation.needs.map((need) => need.label),
        clarifyingQuestions,
        matches: [],
        relatedEvidence: [],
        warnings: uniqueStrings([
          ...warnings,
          'Aby poprawić dopasowanie, odpowiedz na pytania doprecyzowujące.',
        ]),
      };
      await this.persist(requestId, input, response);
      return response;
    }

    const innovations = await this.repository.listInnovations();
    const queryText = [input.problemDescription, interpretation.keywords.join(' ')].join(' ');
    const { candidates } = await retrieveCandidates(innovations, interpretation, queryText, this.ai);
    const ranked = rankCandidates(candidates, 5);

    const degraded = this.ai.isDegraded();
    if (degraded) {
      warnings.push('Część usług AI była niedostępna — zastosowano analizę offline o ograniczonej dokładności.');
    }
    for (const assumption of interpretation.assumptions) {
      warnings.push(`Założenie: ${assumption}`);
    }

    const matches = [];
    for (const item of ranked) {
      const citations = await this.repository.listCitations(item.candidate.innovation.id);
      matches.push(buildMatch(item, interpretation, citations));
    }

    const relatedEvidence = await this.buildRelatedEvidence(interpretation);

    let status: MatchmakingResponse['status'];
    if (degraded) {
      status = 'degraded';
    } else if (matches.length === 0) {
      status = 'no_match';
      warnings.push('Nie znaleziono wystarczająco dopasowanych innowacji w dostępnym katalogu.');
    } else {
      status = 'matched';
    }

    if (matches.length === 0 && status === 'degraded') {
      warnings.push('Nie można było w pełni potwierdzić dopasowań ze względu na ograniczoną dostępność usług AI.');
    }

    const response: MatchmakingResponse = {
      requestId,
      status,
      mode: this.mode,
      problemSummary: buildProblemSummary(interpretation),
      identifiedNeeds: interpretation.needs.map((need) => need.label),
      clarifyingQuestions: [],
      matches,
      relatedEvidence,
      warnings: uniqueStrings(warnings),
    };
    await this.persist(requestId, input, response);
    return response;
  }

  private async buildRelatedEvidence(interpretation: Interpretation): Promise<RelatedEvidence[]> {
    const evidence = await this.repository.listEvidence();
    if (evidence.length === 0) return [];
    const neededTags = new Set(interpretation.needs.map((need) => normalizeText(need.id)));

    const scored = evidence
      .map((item) => {
        const tags = item.problemTags.map((tag) => normalizeText(tag));
        const shared = tags.filter((tag) => neededTags.has(tag)).length;
        return { item, shared };
      })
      .filter((entry) => (neededTags.size === 0 ? false : entry.shared > 0))
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 4);

    return scored.map(({ item }) => ({
      id: item.id,
      sourceId: item.sourceId,
      title: item.title,
      kind: item.kind,
      summary: truncate(item.summary, 400),
      url: item.url,
      synthetic: item.synthetic,
    }));
  }

  private async persist(
    requestId: string,
    input: MatchmakingInput,
    response: MatchmakingResponse,
  ): Promise<void> {
    try {
      await this.repository.saveRequest({
        requestId,
        userType: input.userType,
        status: response.status,
        mode: response.mode,
        problemSummary: response.problemSummary,
        identifiedNeeds: response.identifiedNeeds,
        input: input as unknown as Record<string, unknown>,
        response: response as unknown as Record<string, unknown>,
        createdAt: new Date(),
      });
    } catch {
      // Persistence failure must not break the user journey; it is surfaced via warnings.
      response.warnings = uniqueStrings([
        ...response.warnings,
        'Nie udało się zapisać zgłoszenia do historii — wynik pozostaje dostępny.',
      ]);
    }
  }

  async listInnovations(options: InnovationListOptions): Promise<InnovationListResponse> {
    const innovations = await this.repository.listInnovations();
    const queryTokens = options.q ? tokenize(options.q) : [];
    const problemTag = options.problemTag ? normalizeText(options.problemTag) : undefined;
    const targetGroup = options.targetGroup ? normalizeText(options.targetGroup) : undefined;

    const filtered = innovations.filter((innovation) => {
      if (
        problemTag &&
        !innovation.problemTags.some((tag) => normalizeText(tag) === problemTag)
      ) {
        return false;
      }
      if (
        targetGroup &&
        !innovation.targetGroups.some((group) => normalizeText(group) === targetGroup)
      ) {
        return false;
      }
      if (options.evidenceStatus && innovation.evidenceStatus !== options.evidenceStatus) {
        return false;
      }
      if (options.synthetic !== undefined && innovation.synthetic !== options.synthetic) {
        return false;
      }
      return matchesQuery(innovation, queryTokens);
    });

    const sorted = [...filtered].sort((a, b) => compareInnovations(a, b, options.sort));
    const page = sorted.slice(options.offset, options.offset + options.limit);

    return {
      total: filtered.length,
      count: page.length,
      limit: options.limit,
      offset: options.offset,
      mode: this.mode,
      data: page.map(toInnovationSummary),
      warnings: this.baseWarnings(),
    };
  }

  async getInnovationDetail(innovationId: string): Promise<InnovationDetail | undefined> {
    const innovation = await this.repository.getInnovation(innovationId);
    if (!innovation) return undefined;
    const citations = await this.repository.listCitations(innovationId);
    const source: CatalogueSource = (await this.repository.getSource(innovation.sourceId)) ?? {
      id: innovation.sourceId,
      title: 'Źródło nieznane',
      url: undefined,
      kind: 'unknown',
      urlVerified: false,
      synthetic: innovation.synthetic,
    };

    const disclaimer = innovation.synthetic
      ? SYNTHETIC_DISCLAIMER
      : 'Dopasowanie oznacza przydatność dla opisanego problemu, a nie gwarancję skuteczności. Zweryfikuj informacje w źródle.';

    return {
      innovationId: innovation.id,
      title: innovation.title,
      summary: innovation.summary,
      description: innovation.description,
      evidenceStatus: innovation.evidenceStatus as EvidenceStatus,
      synthetic: innovation.synthetic,
      source: {
        sourceId: source.id,
        title: source.title,
        url: source.url,
        urlVerified: source.urlVerified,
        kind: source.kind,
        synthetic: source.synthetic,
      },
      problemTags: innovation.problemTags,
      targetGroups: innovation.targetGroups,
      testedIn: innovation.testedIn,
      applicableContexts: innovation.applicableContexts,
      prerequisites: innovation.prerequisites,
      resourcesRequired: innovation.resourcesRequired,
      estimatedCostPln: innovation.estimatedCostPln,
      timeframeWeeks: innovation.timeframeWeeks,
      citations: citations.map((citation) => ({
        sourceId: citation.sourceId,
        title: citation.title,
        url: citation.url,
        page: citation.page,
        excerpt: truncate(citation.excerpt, 300),
      })),
      disclaimer,
    };
  }

  async submitFeedback(requestId: string, input: FeedbackInput): Promise<FeedbackResponse> {
    const request = await this.repository.getRequest(requestId);
    if (!request) {
      throw ApiError.notFound('Nie znaleziono zgłoszenia o podanym identyfikatorze.');
    }

    const responseMatches = request.response.matches;
    const matchIds = Array.isArray(responseMatches)
      ? responseMatches
          .map((match) => (match as { innovationId?: unknown }).innovationId)
          .filter((id): id is string => typeof id === 'string')
      : [];
    if (!matchIds.includes(input.innovationId)) {
      throw ApiError.validation('Wybrana rekomendacja nie należy do tego zgłoszenia.');
    }

    const feedbackId = randomUUID();
    await this.repository.saveFeedback({
      feedbackId,
      requestId,
      innovationId: input.innovationId,
      useful: input.useful,
      reason: input.reason,
      comment: input.comment,
      createdAt: new Date(),
    });

    return {
      feedbackId,
      requestId,
      innovationId: input.innovationId,
      recorded: true,
      message: 'Dziękujemy. Informacja zwrotna została zapisana i posłuży do oceny jakości rekomendacji.',
    };
  }
}
