import { SYNTHETIC_DISCLAIMER } from './seed.js';
import type {
  CatalogueCitation,
  CatalogueEvidence,
  CatalogueInnovation,
  CatalogueRepository,
  CatalogueSource,
  FeedbackRecord,
  MatchmakingRequestRecord,
} from './types.js';

export interface CatalogueSeed {
  sources: CatalogueSource[];
  innovations: CatalogueInnovation[];
  citations: CatalogueCitation[];
  evidence: CatalogueEvidence[];
}

/**
 * In-process catalogue used in demo mode, tests, and when PostgreSQL is not
 * reachable. It keeps request and feedback history for the process lifetime.
 */
export class MemoryCatalogueRepository implements CatalogueRepository {
  readonly kind = 'memory' as const;

  private readonly innovations: Map<string, CatalogueInnovation>;
  private readonly citations: Map<string, CatalogueCitation[]>;
  private readonly evidence: CatalogueEvidence[];
  private readonly sources: Map<string, CatalogueSource>;
  private readonly requests = new Map<string, MatchmakingRequestRecord>();
  private readonly feedback: FeedbackRecord[] = [];

  constructor(seed: CatalogueSeed) {
    this.innovations = new Map(seed.innovations.map((innovation) => [innovation.id, innovation]));
    this.citations = new Map();
    for (const citation of seed.citations) {
      const list = this.citations.get(citation.innovationId) ?? [];
      list.push(citation);
      this.citations.set(citation.innovationId, list);
    }
    this.evidence = [...seed.evidence];
    this.sources = new Map(seed.sources.map((source) => [source.id, source]));
  }

  async listInnovations(): Promise<CatalogueInnovation[]> {
    return [...this.innovations.values()];
  }

  async getInnovation(id: string): Promise<CatalogueInnovation | undefined> {
    return this.innovations.get(id);
  }

  async listCitations(innovationId: string): Promise<CatalogueCitation[]> {
    return this.citations.get(innovationId) ?? [];
  }

  async listEvidence(): Promise<CatalogueEvidence[]> {
    return [...this.evidence];
  }

  async getSource(id: string): Promise<CatalogueSource | undefined> {
    return this.sources.get(id);
  }

  async saveRequest(record: MatchmakingRequestRecord): Promise<void> {
    this.requests.set(record.requestId, record);
  }

  async getRequest(requestId: string): Promise<MatchmakingRequestRecord | undefined> {
    return this.requests.get(requestId);
  }

  async saveFeedback(record: FeedbackRecord): Promise<void> {
    this.feedback.push(record);
  }
}

export { SYNTHETIC_DISCLAIMER };
