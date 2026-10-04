export const USER_TYPES = ['resident', 'ngo', 'local_government', 'institution'] as const;
export type UserType = (typeof USER_TYPES)[number];

export const RELEVANCE_LEVELS = ['high', 'medium', 'low'] as const;
export type Relevance = (typeof RELEVANCE_LEVELS)[number];

export const EVIDENCE_STATUSES = ['documented', 'partially_documented', 'synthetic'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const MATCH_STATUSES = ['matched', 'needs_clarification', 'no_match', 'degraded'] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const SERVICE_MODES = ['live', 'demo'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const FEEDBACK_REASONS = [
  'not_relevant',
  'target_group_mismatch',
  'constraints_mismatch',
  'insufficient_evidence',
  'already_known',
  'other',
] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export interface LocationInput {
  municipality?: string;
  county?: string;
}

export interface ConstraintsInput {
  budgetPln?: number;
  timeframeWeeks?: number;
  availableResources?: string[];
  accessibilityNeeds?: string[];
}

export interface ClarificationAnswer {
  questionId: string;
  answer: string;
}

export interface MatchmakingInput {
  problemDescription: string;
  userType: UserType;
  location?: LocationInput;
  targetGroups?: string[];
  constraints?: ConstraintsInput;
  clarificationAnswers?: ClarificationAnswer[];
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
}

export interface Citation {
  sourceId: string;
  title: string;
  url?: string;
  page?: number;
  excerpt: string;
}

export interface Match {
  innovationId: string;
  title: string;
  summary: string;
  relevance: Relevance;
  whyItMatches: string[];
  limitations: string[];
  suggestedNextSteps: string[];
  evidenceStatus: EvidenceStatus;
  citations: Citation[];
}

export interface RelatedEvidence {
  id: string;
  sourceId: string;
  title: string;
  kind: string;
  summary: string;
  url?: string;
  synthetic: boolean;
}

export interface MatchmakingResponse {
  requestId: string;
  status: MatchStatus;
  mode: ServiceMode;
  problemSummary: string;
  identifiedNeeds: string[];
  clarifyingQuestions: ClarifyingQuestion[];
  matches: Match[];
  relatedEvidence: RelatedEvidence[];
  warnings: string[];
}

export interface FeedbackInput {
  innovationId: string;
  useful: boolean;
  reason?: FeedbackReason;
  comment?: string;
}

export interface FeedbackResponse {
  feedbackId: string;
  requestId: string;
  innovationId: string;
  recorded: true;
  message: string;
}

export interface SourceSummary {
  sourceId: string;
  title: string;
  url?: string;
  urlVerified: boolean;
  kind: string;
  synthetic: boolean;
}

export interface InnovationDetail {
  innovationId: string;
  title: string;
  summary: string;
  description: string;
  evidenceStatus: EvidenceStatus;
  synthetic: boolean;
  source: SourceSummary;
  problemTags: string[];
  targetGroups: string[];
  testedIn: string[];
  applicableContexts: string[];
  prerequisites: string[];
  resourcesRequired: string[];
  estimatedCostPln: number | null;
  timeframeWeeks: number | null;
  citations: Citation[];
  disclaimer: string;
}

export const INNOVATION_SORT_FIELDS = ['title', 'cost', 'timeframe'] as const;
export type InnovationSortField = (typeof INNOVATION_SORT_FIELDS)[number];

export interface InnovationListOptions {
  q?: string;
  problemTag?: string;
  targetGroup?: string;
  evidenceStatus?: EvidenceStatus;
  synthetic?: boolean;
  sort: InnovationSortField;
  limit: number;
  offset: number;
}

export interface InnovationSummary {
  innovationId: string;
  title: string;
  summary: string;
  sourceId: string;
  evidenceStatus: EvidenceStatus;
  synthetic: boolean;
  problemTags: string[];
  targetGroups: string[];
  testedIn: string[];
  applicableContexts: string[];
  estimatedCostPln: number | null;
  timeframeWeeks: number | null;
}

export interface InnovationListResponse {
  total: number;
  count: number;
  limit: number;
  offset: number;
  mode: ServiceMode;
  data: InnovationSummary[];
  warnings: string[];
}

/** Canonical, language-independent identifier of a need detected in free text. */
export interface IdentifiedNeed {
  id: string;
  label: string;
  confidence: number;
  matchedTerms: string[];
}

export interface Interpretation {
  mainProblem: string;
  recipients: string[];
  desiredChange: string;
  localContext: string[];
  availableResources: string[];
  constraints: ConstraintsInput;
  missingInfo: string[];
  needs: IdentifiedNeed[];
  keywords: string[];
  assumptions: string[];
}
