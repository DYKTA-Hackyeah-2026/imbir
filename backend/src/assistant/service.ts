import { ApiError } from '../http/errors.js';
import {
  EMPTY_CONVERSATION_STATE,
  buildPagination,
  type Clarification,
  type ConversationState,
  type RankedProgram,
  type Recommendation,
  type SearchPageResponse,
  type SendAssistantMessageRequest,
  type SendAssistantMessageResponse,
  type StoredSearchResult,
} from './domain.js';
import type { EmbeddingProvider } from './embedding.js';
import { evaluateEligibility } from './eligibility.js';
import { toRecommendation } from './explanation.js';
import { buildWeakResultsClarification, type AssistantLlm, type LlmAnalysis } from './llm.js';
import type { Conversation, ConversationRepository } from './conversation.repository.js';
import type { ProgramRepository } from './program.repository.js';
import { rankCandidates } from './ranking.js';
import { scorePrograms } from './relevance.js';
import type { SearchRepository } from './search.repository.js';
import { detectNeeds } from '../matchmaking/needs.js';

export interface AssistantServiceDeps {
  programs: ProgramRepository;
  conversations: ConversationRepository;
  searches: SearchRepository;
  embeddings: EmbeddingProvider;
  llm: AssistantLlm;
  similarityThreshold: number;
  candidateLimit: number;
  maxRecommendations: number;
  defaultPageSize: number;
  maxPageSize: number;
}

/** Shown when nothing in the catalogue is even remotely related to the request. */
export const NO_SOLUTION_MESSAGE =
  'Nikt nie wpadł jeszcze na taki problem. Jeśli chcesz, możesz go zgłosić.';

/** Where the "kreator pomysłów" wizard lives; the frontend renders the button. */
export const NEW_INNOVATION_HREF = '/kreator';

/** Minimum number of hits handed to the AI relevance judge (when available). */
const RERANK_POOL_SIZE = 8;

function cloneEmptyState(): ConversationState {
  return { ...EMPTY_CONVERSATION_STATE, facts: {}, needs: [] };
}

function fallbackSearchQuery(state: ConversationState): string {
  if (state.searchQuery) return state.searchQuery;
  if (state.needs.length > 0) return state.needs.join(', ');
  return state.summary || 'wsparcie dla mieszkańca';
}

export class AssistantService {
  private readonly programs: ProgramRepository;
  private readonly conversations: ConversationRepository;
  private readonly searches: SearchRepository;
  private readonly embeddings: EmbeddingProvider;
  private readonly llm: AssistantLlm;
  private readonly similarityThreshold: number;
  private readonly candidateLimit: number;
  private readonly maxRecommendations: number;
  private readonly defaultPageSize: number;
  private readonly maxPageSize: number;

  constructor(deps: AssistantServiceDeps) {
    this.programs = deps.programs;
    this.conversations = deps.conversations;
    this.searches = deps.searches;
    this.embeddings = deps.embeddings;
    this.llm = deps.llm;
    this.similarityThreshold = deps.similarityThreshold;
    this.candidateLimit = deps.candidateLimit;
    this.maxRecommendations = deps.maxRecommendations;
    this.defaultPageSize = deps.defaultPageSize;
    this.maxPageSize = deps.maxPageSize;
  }

  get pageLimits(): { defaultPageSize: number; maxPageSize: number } {
    return { defaultPageSize: this.defaultPageSize, maxPageSize: this.maxPageSize };
  }

  async sendMessage(input: SendAssistantMessageRequest): Promise<SendAssistantMessageResponse> {
    const conversation = await this.resolveConversation(input);
    this.assertClarificationAnswer(input, conversation);

    await this.conversations.appendMessage({
      conversationId: conversation.id,
      role: 'user',
      content: this.userMessageContent(input),
    });

    const analysis = await this.llm.analyze({ state: conversation.state, message: input.message });

    if (analysis.decision === 'message') {
      await this.conversations.updateState(conversation.id, analysis.state);
      await this.appendAssistant(conversation.id, analysis.assistantMessage);
      return {
        type: 'message',
        conversationId: conversation.id,
        assistantMessage: analysis.assistantMessage,
      };
    }

    if (analysis.decision === 'clarify') {
      const clarification = analysis.clarification ?? buildWeakResultsClarification(analysis.state);
      await this.conversations.updateState(conversation.id, {
        ...analysis.state,
        pendingClarification: clarification,
      });
      await this.appendAssistant(conversation.id, analysis.assistantMessage);
      return {
        type: 'clarification',
        conversationId: conversation.id,
        assistantMessage: analysis.assistantMessage,
        clarification,
      };
    }

    return this.runSearch(conversation.id, analysis);
  }

  async getSearchPage(searchId: string, page: number, pageSize: number): Promise<SearchPageResponse> {
    const search = await this.searches.getSearch(searchId);
    if (!search) {
      throw ApiError.notFound('Nie znaleziono wyszukiwania o podanym identyfikatorze.');
    }

    const effectivePageSize = Math.min(Math.max(1, pageSize), this.maxPageSize);
    const effectivePage = Math.max(1, page);
    const offset = (effectivePage - 1) * effectivePageSize;

    const [results, totalResults, conversation] = await Promise.all([
      this.searches.getResultPage(searchId, offset, effectivePageSize),
      this.searches.countResults(searchId),
      this.conversations.get(search.conversationId),
    ]);

    const state = conversation?.state ?? cloneEmptyState();
    const programList = await this.programs.getByIds(results.map((result) => result.programId));
    const byId = new Map(programList.map((program) => [program.id, program]));

    const recommendations: Recommendation[] = [];
    for (const result of results) {
      const program = byId.get(result.programId);
      if (!program) continue;
      recommendations.push(toRecommendation(state, program, result.eligibilityStatus));
    }

    return {
      searchId: search.id,
      recommendations,
      pagination: buildPagination(effectivePage, effectivePageSize, Math.max(totalResults, search.resultCount)),
    };
  }

  private async resolveConversation(input: SendAssistantMessageRequest): Promise<Conversation> {
    if (input.conversationId) {
      const existing = await this.conversations.get(input.conversationId);
      if (!existing) {
        throw ApiError.notFound('Nie znaleziono rozmowy o podanym identyfikatorze.');
      }
      return existing;
    }
    if (input.message.type === 'clarification_answer') {
      throw ApiError.validation('Odpowiedź na pytanie wymaga identyfikatora rozmowy.');
    }
    return this.conversations.create(cloneEmptyState());
  }

  private assertClarificationAnswer(
    input: SendAssistantMessageRequest,
    conversation: Conversation,
  ): void {
    if (input.message.type !== 'clarification_answer') return;
    const pending = conversation.state.pendingClarification;
    if (!pending || pending.id !== input.message.questionId) {
      throw ApiError.validation('To pytanie doprecyzowujące nie jest już aktualne. Rozpocznij nową wiadomość.');
    }
    const selected = input.message.selectedOptionIds;
    const validIds = new Set(pending.options.map((option) => option.id));
    if (selected.some((id) => !validIds.has(id)) || new Set(selected).size !== selected.length) {
      throw ApiError.validation('Wybierz aktualne opcje pytania bez powtórzeń.');
    }
    if (pending.selectionMode === 'single' && selected.length > 1) {
      throw ApiError.validation('W tym pytaniu możesz wybrać tylko jedną opcję.');
    }
    const additionalText = input.message.additionalText?.trim();
    if (additionalText && !pending.allowAdditionalText) {
      throw ApiError.validation('To pytanie nie pozwala na dodatkowy opis.');
    }
    if (selected.length === 0 && !additionalText) {
      throw ApiError.validation('Wybierz opcję lub opisz potrzebę.');
    }
  }

  private userMessageContent(input: SendAssistantMessageRequest): string {
    if (input.message.type === 'text') {
      return input.message.text;
    }
    const parts = [
      `Wybrane opcje: ${input.message.selectedOptionIds.join(', ') || '(brak)'}`,
      input.message.additionalText ? `Dodatkowo: ${input.message.additionalText}` : undefined,
    ];
    return parts.filter(Boolean).join('. ');
  }

  private async appendAssistant(conversationId: string, content: string): Promise<void> {
    await this.conversations.appendMessage({ conversationId, role: 'assistant', content });
  }

  /**
   * Final relevance pass. When the AI provider is available it judges the
   * strongest hybrid hits and keeps only the ones that match the request;
   * otherwise this is a plain top-N slice.
   */
  private async selectCandidates(
    ranked: RankedProgram[],
    query: string,
  ): Promise<RankedProgram[]> {
    const rerank = this.llm.rerank;
    if (!rerank || ranked.length <= 1) {
      return ranked.slice(0, this.maxRecommendations);
    }

    const pool = ranked.slice(0, Math.max(this.maxRecommendations, RERANK_POOL_SIZE));
    let relevantIds: string[];
    try {
      relevantIds = await rerank({
        query,
        candidates: pool.map((item) => ({
          id: item.program.id,
          title: item.program.title,
          summary: item.program.summary,
          topics: item.program.topics,
          targetGroups: item.program.targetGroups,
        })),
      });
    } catch {
      relevantIds = pool.map((item) => item.program.id);
    }

    const allowed = new Set(relevantIds);
    const filtered = pool.filter((item) => allowed.has(item.program.id));
    const result = filtered.length > 0 ? filtered : ranked;
    return result.slice(0, this.maxRecommendations);
  }

  private async runSearch(
    conversationId: string,
    analysis: LlmAnalysis,
  ): Promise<SendAssistantMessageResponse> {
    const state = analysis.state;
    const searchQuery = analysis.searchQuery ?? fallbackSearchQuery(state);
    const embedding = await this.embeddings.embed(searchQuery);

    // Hybrid retrieval: the semantic candidates provide vector similarity, the
    // full active catalogue provides the lexical + taxonomy signal the offline
    // embedding lacks. The domain scores and gates them together.
    const [catalogue, candidates] = await Promise.all([
      this.programs.listActivePrograms(),
      this.programs.semanticSearch({ embedding, limit: this.candidateLimit }),
    ]);

    const vectorSimilarity = new Map(
      candidates.map((candidate) => [candidate.program.id, candidate.similarity]),
    );
    const retrievalText = state.summary.trim().length > 0 ? state.summary : searchQuery;
    const needs = detectNeeds(retrievalText).map((need) => ({
      id: need.id,
      aliases: [need.label],
    }));

    const ranked = rankCandidates(
      scorePrograms({
        programs: catalogue,
        query: retrievalText,
        needs,
        vectorSimilarity,
      })
        .filter((candidate) => candidate.relevance >= this.similarityThreshold)
        .map((candidate) => ({
          program: candidate.program,
          similarity: candidate.relevance,
          eligibilityStatus: evaluateEligibility(state, candidate.program),
        })),
    );

    // No candidate clears the relevance bar (or there are none at all): stop
    // re-searching and offer to capture the unmet need as a new innovation.
    if (ranked.length === 0) {
      await this.conversations.updateState(conversationId, {
        ...state,
        searchQuery,
        pendingClarification: undefined,
      });
      await this.appendAssistant(conversationId, NO_SOLUTION_MESSAGE);
      return {
        type: 'no_solution',
        conversationId,
        assistantMessage: NO_SOLUTION_MESSAGE,
        action: { label: 'Zgłoś nową innowację', href: NEW_INNOVATION_HREF },
      };
    }

    // Keep only the strongest matches so the answer stays precise, then let the
    // AI judge drop hits that only share a broad category with the request.
    const selected = await this.selectCandidates(ranked, retrievalText);

    const storedResults: StoredSearchResult[] = selected.map((item, index) => ({
      programId: item.program.id,
      position: index + 1,
      similarity: item.similarity,
      eligibilityStatus: item.eligibilityStatus,
    }));

    const search = await this.searches.createSearch({
      conversationId,
      searchQuery,
      results: storedResults,
    });

    await this.conversations.updateState(conversationId, {
      ...state,
      searchQuery,
      pendingClarification: undefined,
      lastSearchId: search.id,
    });
    await this.appendAssistant(conversationId, analysis.assistantMessage);

    const pageSize = this.defaultPageSize;
    const pageItems = selected.slice(0, pageSize);
    const recommendations = pageItems.map((item) =>
      toRecommendation(state, item.program, item.eligibilityStatus),
    );

    return {
      type: 'recommendations',
      conversationId,
      assistantMessage: analysis.assistantMessage,
      search: {
        id: search.id,
        recommendations,
        pagination: buildPagination(1, pageSize, selected.length),
      },
    };
  }
}
