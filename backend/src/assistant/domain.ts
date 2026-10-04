import { z } from 'zod';

/** User-facing message kinds accepted by POST /api/assistant/messages. */
export interface TextMessageInput {
  type: 'text';
  text: string;
}

export interface ClarificationAnswerInput {
  type: 'clarification_answer';
  questionId: string;
  selectedOptionIds: string[];
  additionalText?: string;
}

export type AssistantMessageInput = TextMessageInput | ClarificationAnswerInput;

export interface SendAssistantMessageRequest {
  conversationId?: string;
  message: AssistantMessageInput;
}

export const EMPLOYMENT_STATUSES = ['employed', 'unemployed', 'inactive'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const HOUSING_STATUSES = ['homeless', 'at_risk', 'housed'] as const;
export type HousingStatus = (typeof HOUSING_STATUSES)[number];

export const SELECTION_MODES = ['single', 'multiple'] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

export const PROGRAM_STATUSES = ['draft', 'active', 'inactive', 'expired'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const ELIGIBILITY_STATUSES = ['eligible', 'unknown', 'conflict'] as const;
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export const DECISIONS = ['clarify', 'search', 'message'] as const;
export type Decision = (typeof DECISIONS)[number];

export interface ClarificationOption {
  id: string;
  label: string;
}

export interface Clarification {
  id: string;
  question: string;
  selectionMode: SelectionMode;
  options: ClarificationOption[];
  allowAdditionalText: boolean;
}

export interface ConversationFacts {
  age?: number;
  location?: string;
  employmentStatus?: EmploymentStatus;
  housingStatus?: HousingStatus;
}

/** Structured, updatable state of a conversation. Never rely on raw history alone. */
export interface ConversationState {
  summary: string;
  facts: ConversationFacts;
  needs: string[];
  searchQuery?: string;
  pendingClarification?: Clarification;
  lastSearchId?: string;
}

export const clarificationOptionSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(160),
});

export const clarificationSchema = z.object({
  id: z.string().min(1).max(64),
  question: z.string().min(1).max(300),
  selectionMode: z.enum(SELECTION_MODES),
  options: z.array(clarificationOptionSchema).min(1).max(6),
  allowAdditionalText: z.boolean(),
});

export const conversationFactsSchema = z.object({
  age: z.number().int().min(0).max(130).optional(),
  location: z.string().min(1).max(120).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  housingStatus: z.enum(HOUSING_STATUSES).optional(),
});

export const conversationStateSchema = z.object({
  summary: z.string().max(1000),
  facts: conversationFactsSchema,
  needs: z.array(z.string().max(200)).max(30),
  searchQuery: z.string().max(2000).optional(),
  pendingClarification: clarificationSchema.optional(),
  lastSearchId: z.string().max(64).optional(),
});

export const EMPTY_CONVERSATION_STATE: ConversationState = {
  summary: '',
  facts: {},
  needs: [],
};

/**
 * Parses a stored JSONB state defensively: a corrupted or outdated row degrades
 * to an empty state instead of taking the whole request down.
 */
export function parseConversationState(value: unknown): ConversationState {
  const result = conversationStateSchema.safeParse(value);
  if (!result.success) {
    return { ...EMPTY_CONVERSATION_STATE, facts: {}, needs: [] };
  }
  return result.data;
}

/** Structured eligibility criteria a program may declare. */
export interface ProgramEligibility {
  minAge?: number;
  maxAge?: number;
  residentRequired?: boolean;
  employmentStatus?: EmploymentStatus[];
  housingStatus?: HousingStatus[];
}

export interface Program {
  id: string;
  title: string;
  summary: string;
  description: string;
  targetGroups: string[];
  topics: string[];
  problemsAddressed: string[];
  eligibility: ProgramEligibility | null;
  eligibilityDescription: string | null;
  searchText: string;
  status: ProgramStatus;
  url: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A candidate program returned by semantic search, with cosine similarity. */
export interface ProgramCandidate {
  program: Program;
  similarity: number;
}

/** A candidate after eligibility filtering + ranking, ready to be persisted. */
export interface RankedProgram {
  program: Program;
  similarity: number;
  eligibilityStatus: EligibilityStatus;
  score: number;
}

export interface RecommendationDetail {
  label: string;
  value: string;
}

export interface Recommendation {
  id: string;
  title: string;
  summary: string;
  matchExplanation: string;
  eligibilityStatus: EligibilityStatus;
  eligibilityDescription?: string;
  details: RecommendationDetail[];
  url?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ClarificationResponse {
  type: 'clarification';
  conversationId: string;
  assistantMessage: string;
  clarification: Clarification;
}

export interface RecommendationsResponse {
  type: 'recommendations';
  conversationId: string;
  assistantMessage: string;
  search: {
    id: string;
    recommendations: Recommendation[];
    pagination: Pagination;
  };
}

/**
 * Emitted when semantic search found nothing that matches the request. Instead of
 * re-asking the same question, the assistant offers to capture the unmet need as a
 * new innovation idea (the "kreator pomysłów" wizard).
 */
export interface NoSolutionResponse {
  type: 'no_solution';
  conversationId: string;
  assistantMessage: string;
  action: {
    label: string;
    href: string;
  };
}

export interface AssistantMessageResponse {
  type: 'message';
  conversationId: string;
  assistantMessage: string;
}

export type SendAssistantMessageResponse =
  | ClarificationResponse
  | RecommendationsResponse
  | NoSolutionResponse
  | AssistantMessageResponse;

export interface SearchPageResponse {
  searchId: string;
  recommendations: Recommendation[];
  pagination: Pagination;
}

/** Persisted, stable search header. The ranking itself lives in search_results. */
export interface StoredSearch {
  id: string;
  conversationId: string;
  searchQuery: string;
  resultCount: number;
  createdAt: Date;
}

export interface StoredSearchResult {
  programId: string;
  position: number;
  similarity: number;
  eligibilityStatus: EligibilityStatus;
}

export interface StoredSearchPage extends StoredSearchResult {
  program: Program | undefined;
}

export function buildPagination(
  page: number,
  pageSize: number,
  totalResults: number,
): Pagination {
  const totalPages = totalResults === 0 ? 0 : Math.ceil(totalResults / pageSize);
  return {
    page,
    pageSize,
    totalResults,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
