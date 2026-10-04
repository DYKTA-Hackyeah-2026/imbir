import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cosineSimilarity, hashEmbedding } from '../matchmaking/text.js';
import type { Conversation, ConversationRepository } from './conversation.repository.js';
import type {
  ConversationState,
  EligibilityStatus,
  Program,
  ProgramCandidate,
  StoredSearch,
  StoredSearchResult,
} from './domain.js';
import type { EmbeddingProvider } from './embedding.js';
import { createAssistantLlm, type AssistantLlm } from './llm.js';
import type { ProgramRepository, ProgramWriteInput } from './program.repository.js';
import type { SearchRepository } from './search.repository.js';
import { buildProgramSearchText } from './search-text.js';
import { AssistantService } from './service.js';

const DIMENSIONS = 256;

const embeddings: EmbeddingProvider = {
  async embed(text) {
    return hashEmbedding(text, DIMENSIONS);
  },
};

const programVectors = new Map<string, number[]>();

function makeProgram(id: string, title: string, summary: string, problems: string[]): Program {
  const base = {
    title,
    summary,
    description: summary,
    targetGroups: ['mieszkańcy'],
    topics: ['wsparcie'],
    problemsAddressed: problems,
  };
  programVectors.set(id, hashEmbedding(buildProgramSearchText(base), DIMENSIONS));
  return {
    id,
    ...base,
    eligibility: null,
    eligibilityDescription: null,
    searchText: buildProgramSearchText(base),
    status: 'active',
    url: null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

class FakeProgramRepository implements ProgramRepository {
  constructor(private readonly items: Program[]) {}

  async semanticSearch({ embedding, limit }: { embedding: number[]; limit: number }): Promise<ProgramCandidate[]> {
    return this.items
      .map((program) => ({
        program,
        similarity: cosineSimilarity(embedding, programVectors.get(program.id) ?? embedding),
      }))
      .slice(0, limit);
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    return this.items.filter((program) => ids.includes(program.id));
  }

  async getById(id: string): Promise<Program | undefined> {
    return this.items.find((program) => program.id === id);
  }

  async createProgram(_input: ProgramWriteInput): Promise<Program> {
    throw new Error('not used in tests');
  }

  async createProgramWithId(_id: string, _input: ProgramWriteInput): Promise<Program> {
    throw new Error('not used in tests');
  }

  async updateProgram(): Promise<Program | undefined> {
    throw new Error('not used in tests');
  }
}

class FakeConversationRepository implements ConversationRepository {
  private readonly store = new Map<string, Conversation>();
  private counter = 0;

  async create(state: ConversationState): Promise<Conversation> {
    this.counter += 1;
    const conversation = { id: `conv_${this.counter}`, state };
    this.store.set(conversation.id, conversation);
    return conversation;
  }

  async get(id: string): Promise<Conversation | undefined> {
    return this.store.get(id);
  }

  async updateState(id: string, state: ConversationState): Promise<void> {
    const existing = this.store.get(id);
    if (existing) existing.state = state;
  }

  async appendMessage(): Promise<void> {}
}

class FakeSearchRepository implements SearchRepository {
  private readonly searches = new Map<string, StoredSearch>();
  private readonly results = new Map<string, StoredSearchResult[]>();
  private counter = 0;

  async createSearch(input: {
    conversationId: string;
    searchQuery: string;
    results: StoredSearchResult[];
  }): Promise<StoredSearch> {
    this.counter += 1;
    const search: StoredSearch = {
      id: `search_${this.counter}`,
      conversationId: input.conversationId,
      searchQuery: input.searchQuery,
      resultCount: input.results.length,
      createdAt: new Date(0),
    };
    this.searches.set(search.id, search);
    this.results.set(search.id, input.results);
    return search;
  }

  async getSearch(id: string): Promise<StoredSearch | undefined> {
    return this.searches.get(id);
  }

  async getResultPage(searchId: string, offset: number, limit: number): Promise<StoredSearchResult[]> {
    return (this.results.get(searchId) ?? []).slice(offset, offset + limit);
  }

  async countResults(searchId: string): Promise<number> {
    return (this.results.get(searchId) ?? []).length;
  }
}

function buildService(programs: Program[], overrides: { similarityThreshold?: number; llm?: AssistantLlm } = {}): AssistantService {
  return new AssistantService({
    programs: new FakeProgramRepository(programs),
    conversations: new FakeConversationRepository(),
    searches: new FakeSearchRepository(),
    embeddings,
    llm: overrides.llm ?? createAssistantLlm(),
    similarityThreshold: overrides.similarityThreshold ?? -1,
    candidateLimit: 20,
    defaultPageSize: 2,
    maxPageSize: 20,
  });
}

const PROGRAMS: Program[] = [
  makeProgram('p1', 'Cyfrowy Senior', 'Pomoc w obsłudze telefonu i internetu', ['obsługa paczkomatu']),
  makeProgram('p2', 'Aktywni Zawodowo', 'Pomoc w znalezieniu pracy', ['brak pracy']),
  makeProgram('p3', 'Pomoc Żywnościowa', 'Pomoc z jedzeniem', ['brak jedzenia']),
  makeProgram('p4', 'Wsparcie Mieszkaniowe', 'Sprawy mieszkaniowe', ['bezdomność']),
  makeProgram('p5', 'Wsparcie Psychologiczne', 'Wsparcie zdrowotne', ['kryzys psychiczny']),
];

describe('AssistantService', () => {
  test('extracts explicit ages and Polish locations without treating counts as ages', async () => {
    const llm = createAssistantLlm();
    for (const [text, expectedAge, expectedLocation] of [
      ['Mam 2 dzieci i potrzebuję pomocy dla rodziny.', undefined, undefined],
      ['Mam 72 lata. Mieszkam w Warszawie i potrzebuję pomocy z telefonem.', 72, 'Warszawie'],
      ['Mam 34 lata i mieszkam w Nowym Sączu.', 34, 'Nowym Sączu'],
      ['Potrzebuję pomocy w mieście Kraków.', undefined, 'Kraków'],
      ['Mieszkam w warszawie i szukam pracy.', undefined, 'warszawie'],
    ] as const) {
      const analysis = await llm.analyze({
        state: { summary: '', facts: {}, needs: [] },
        message: { type: 'text', text },
      });
      assert.equal(analysis.state.facts.age, expectedAge, text);
      assert.equal(analysis.state.facts.location, expectedLocation, text);
    }
  });

  test('validates clarification choices and allows an additional-text-only answer', async () => {
    const service = buildService(PROGRAMS);
    const response = await service.sendMessage({ message: { type: 'text', text: 'Potrzebuję pomocy.' } });
    if (response.type !== 'clarification') throw new Error('expected clarification');
    for (const selectedOptionIds of [[], ['not-offered'], ['job', 'job']]) {
      await assert.rejects(service.sendMessage({
        conversationId: response.conversationId,
        message: { type: 'clarification_answer', questionId: response.clarification.id, selectedOptionIds },
      }), (error: unknown) => error instanceof Error && 'statusCode' in error && error.statusCode === 400);
    }
    const answer = await service.sendMessage({
      conversationId: response.conversationId,
      message: {
        type: 'clarification_answer', questionId: response.clarification.id,
        selectedOptionIds: [], additionalText: 'Potrzebuję pomocy z telefonem.',
      },
    });
    assert.equal(answer.type, 'recommendations');
  });

  test('respects single-choice questions and disabled additional text', async () => {
    const llm: AssistantLlm = {
      kind: 'deterministic',
      async analyze({ state }) {
        return {
          state, decision: 'clarify', assistantMessage: 'Wybierz opcję.',
          clarification: {
            id: 'single-question', question: 'Jaka potrzeba?', selectionMode: 'single',
            options: [{ id: 'job', label: 'Praca' }, { id: 'food', label: 'Jedzenie' }],
            allowAdditionalText: false,
          },
        };
      },
    };
    const service = buildService(PROGRAMS, { llm });
    const first = await service.sendMessage({ message: { type: 'text', text: 'Pomoc' } });
    for (const message of [
      { selectedOptionIds: ['job', 'food'] },
      { selectedOptionIds: ['job'], additionalText: 'Dodatkowy opis' },
    ]) {
      await assert.rejects(service.sendMessage({
        conversationId: first.conversationId,
        message: { type: 'clarification_answer', questionId: 'single-question', ...message },
      }), (error: unknown) => error instanceof Error && 'statusCode' in error && error.statusCode === 400);
    }
    const valid = await service.sendMessage({
      conversationId: first.conversationId,
      message: { type: 'clarification_answer', questionId: 'single-question', selectedOptionIds: ['job'] },
    });
    assert.equal(valid.type, 'clarification');
  });

  test('excludes weak matches from recommendations and persisted pagination', async () => {
    const message = { type: 'text' as const, text: 'Mam 72 lata i nie umiem korzystać z paczkomatu.' };
    const analysis = await createAssistantLlm().analyze({ state: { summary: '', facts: {}, needs: [] }, message });
    const queryVector = await embeddings.embed(analysis.searchQuery!);
    const scores = PROGRAMS.map((program) => ({
      id: program.id,
      score: cosineSimilarity(queryVector, programVectors.get(program.id)!),
    })).sort((a, b) => b.score - a.score);
    const threshold = (scores[0].score + scores[1].score) / 2;
    assert.ok(scores[0].score > scores[1].score);
    const service = buildService(PROGRAMS, { similarityThreshold: threshold });
    const response = await service.sendMessage({ message });
    if (response.type !== 'recommendations') throw new Error('expected recommendations');
    assert.deepEqual(response.search.recommendations.map((program) => program.id), [scores[0].id]);
    assert.equal(response.search.pagination.totalResults, 1);
    const persisted = await service.getSearchPage(response.search.id, 1, 2);
    assert.deepEqual(persisted.recommendations.map((program) => program.id), [scores[0].id]);
    assert.equal(persisted.pagination.totalResults, 1);
    assert.equal(persisted.pagination.hasNextPage, false);
  });

  test('asks for clarification on a vague request without a conversation id', async () => {
    const service = buildService(PROGRAMS);
    const response = await service.sendMessage({ message: { type: 'text', text: 'Potrzebuję pomocy.' } });

    assert.equal(response.type, 'clarification');
    if (response.type !== 'clarification') return;
    assert.equal(typeof response.conversationId, 'string');
    assert.ok(response.clarification.options.length >= 2);
    assert.equal(response.clarification.allowAdditionalText, true);
  });

  test('starts a stable, paginated search for a concrete request', async () => {
    const service = buildService(PROGRAMS);
    const response = await service.sendMessage({
      message: { type: 'text', text: 'Mam 72 lata i nie umiem korzystać z paczkomatu.' },
    });

    assert.equal(response.type, 'recommendations');
    if (response.type !== 'recommendations') return;
    assert.equal(response.search.pagination.page, 1);
    assert.equal(response.search.pagination.pageSize, 2);
    assert.equal(response.search.pagination.totalResults, PROGRAMS.length);
    assert.equal(response.search.pagination.totalPages, 3);
    assert.equal(response.search.pagination.hasNextPage, true);
    assert.equal(response.search.recommendations.length, 2);

    const page2 = await service.getSearchPage(response.search.id, 2, 2);
    assert.equal(page2.pagination.page, 2);
    assert.equal(page2.pagination.hasPreviousPage, true);
    assert.equal(page2.pagination.hasNextPage, true);
    assert.equal(page2.recommendations.length, 2);

    const page1Again = await service.getSearchPage(response.search.id, 1, 2);
    assert.deepEqual(
      page1Again.recommendations.map((item) => item.id),
      response.search.recommendations.map((item) => item.id),
      'pagination must be stable across reads',
    );
  });

  test('rejects a stale clarification answer', async () => {
    const service = buildService(PROGRAMS);
    const first = await service.sendMessage({ message: { type: 'text', text: 'Potrzebuję pomocy.' } });
    if (first.type !== 'clarification') throw new Error('expected clarification');

    await assert.rejects(
      service.sendMessage({
        conversationId: first.conversationId,
        message: {
          type: 'clarification_answer',
          questionId: 'question_stale',
          selectedOptionIds: ['job'],
        },
      }),
    );
  });

  test('returns no_solution with a submit-idea action when nothing matches', async () => {
    // Empty catalogue: semantic search finds no candidate at all.
    const service = buildService([]);
    const response = await service.sendMessage({
      message: {
        type: 'text',
        text: 'Mam problem z telefonem i nie rozumiem jego działania.',
      },
    });

    assert.equal(response.type, 'no_solution');
    if (response.type !== 'no_solution') return;
    assert.equal(
      response.assistantMessage,
      'Nikt nie wpadł jeszcze na taki problem. Jeśli chcesz, możesz go zgłosić.',
    );
    assert.deepEqual(response.action, { label: 'Zgłoś nową innowację', href: '/kreator' });
  });

  test('returns no_solution when matches are only weak', async () => {
    // Catalogue exists but nothing clears the similarity gate.
    const service = buildService(PROGRAMS, { similarityThreshold: 0.99 });
    const response = await service.sendMessage({
      message: { type: 'text', text: 'Mam 72 lata i nie umiem korzystać z paczkomatu.' },
    });

    assert.equal(response.type, 'no_solution');
    if (response.type !== 'no_solution') return;
    assert.deepEqual(response.action, { label: 'Zgłoś nową innowację', href: '/kreator' });
  });
});
