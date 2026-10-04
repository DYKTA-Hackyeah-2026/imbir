import type { EvidenceStatus, MatchStatus, ServiceMode, UserType } from '../matchmaking/domain.js';

export interface CatalogueInnovation {
  id: string;
  title: string;
  summary: string;
  description: string;
  sourceId: string;
  synthetic: boolean;
  evidenceStatus: EvidenceStatus;
  problemTags: string[];
  targetGroups: string[];
  testedIn: string[];
  applicableContexts: string[];
  prerequisites: string[];
  resourcesRequired: string[];
  estimatedCostPln: number | null;
  timeframeWeeks: number | null;
  embedding?: number[];
}

export interface CatalogueCitation {
  innovationId: string;
  sourceId: string;
  title: string;
  url?: string;
  page?: number;
  excerpt: string;
}

export interface CatalogueEvidence {
  id: string;
  sourceId: string;
  title: string;
  kind: string;
  summary: string;
  url?: string;
  synthetic: boolean;
  problemTags: string[];
  embedding?: number[];
}

export interface CatalogueSource {
  id: string;
  title: string;
  url?: string;
  kind: string;
  urlVerified: boolean;
  synthetic: boolean;
  description?: string;
}

export interface MatchmakingRequestRecord {
  requestId: string;
  userType: UserType;
  status: MatchStatus;
  mode: ServiceMode;
  problemSummary: string;
  identifiedNeeds: string[];
  input: Record<string, unknown>;
  response: Record<string, unknown>;
  createdAt: Date;
}

export interface FeedbackRecord {
  feedbackId: string;
  requestId: string;
  innovationId: string;
  useful: boolean;
  reason?: string;
  comment?: string;
  createdAt: Date;
}

export interface CatalogueRepository {
  readonly kind: 'postgres' | 'memory';
  listInnovations(): Promise<CatalogueInnovation[]>;
  getInnovation(id: string): Promise<CatalogueInnovation | undefined>;
  listCitations(innovationId: string): Promise<CatalogueCitation[]>;
  listEvidence(): Promise<CatalogueEvidence[]>;
  getSource(id: string): Promise<CatalogueSource | undefined>;
  saveRequest(record: MatchmakingRequestRecord): Promise<void>;
  getRequest(requestId: string): Promise<MatchmakingRequestRecord | undefined>;
  saveFeedback(record: FeedbackRecord): Promise<void>;
}
