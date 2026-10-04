import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createAssistantLlm } from './llm.js';
import { AssistantService } from './service.js';
import type { ProgramRepository } from './program.repository.js';
import {
  innovationToProgram,
  programIdForInnovation,
} from './seed.assistant-innovations.js';
import type { innovations } from '../db/schema.js';
import type {
  Program,
  ProgramCandidate,
  StoredSearch,
  StoredSearchResult,
} from './domain.js';
import { hashEmbedding } from '../matchmaking/text.js';
import { buildProgramSearchText } from './search-text.js';
import type { EmbeddingProvider } from './embedding.js';

type InnovationRow = typeof innovations.$inferSelect;

function makeInnovation(overrides: Partial<InnovationRow> = {}): InnovationRow {
  return {
    id: 'rops-bawita',
    title: 'BaWita',
    summary: 'Tablica manipulacyjno-terapeutyczna dla seniorów z chorobami dementywnymi.',
    description: 'BaWita - tablica manipulacyjno terapeutyczna dla seniorów.',
    sourceId: 'src-library',
    synthetic: false,
    evidenceStatus: 'partially_documented',
    problemTags: ['seniorzy', 'senior_loneliness'],
    targetGroups: ['Seniorzy'],
    testedIn: ['Małopolska'],
    applicableContexts: ['gmina'],
    prerequisites: [],
    resourcesRequired: [],
    estimatedCostPln: null,
    timeframeWeeks: null,
    embedding: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  } as InnovationRow;
}

describe('innovationToProgram', () => {
  test('maps taxonomy into the assistant program shape', () => {
    const input = innovationToProgram(makeInnovation());
    assert.equal(input.title, 'BaWita');
    assert.equal(input.summary, 'Tablica manipulacyjno-terapeutyczna dla seniorów z chorobami dementywnymi.');
    assert.deepEqual(input.targetGroups, ['Seniorzy']);
    assert.deepEqual(input.topics, ['seniorzy', 'senior_loneliness']);
    assert.deepEqual(input.problemsAddressed, ['seniorzy', 'senior_loneliness']);
    assert.equal(input.eligibility, null);
    assert.equal(input.status, 'active');
    assert.match(input.description, /Biblioteki Innowacji Społecznych ROPS/);
    assert.match(input.description, /BaWita - tablica/);
  });

  test('drops empty/blank taxonomy entries', () => {
    const input = innovationToProgram(
      makeInnovation({ problemTags: ['  ', 'seniorzy'], targetGroups: [] }),
    );
    assert.deepEqual(input.topics, ['seniorzy']);
    assert.deepEqual(input.targetGroups, []);
  });
});

describe('programIdForInnovation', () => {
  test('is deterministic and a valid uuid', () => {
    const a = programIdForInnovation('rops-bawita');
    const b = programIdForInnovation('rops-bawita');
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('differs across innovation ids', () => {
    assert.notEqual(
      programIdForInnovation('rops-bawita'),
      programIdForInnovation('rops-senior-cuder'),
    );
  });
});

/** In-memory program store that emulates semantic search with real embeddings. */
class InMemoryProgramRepository implements ProgramRepository {
  private readonly items = new Map<string, Program>();
  constructor(private readonly embeddings: EmbeddingProvider) {}

  async add(id: string, program: Parameters<typeof buildProgramSearchText>[0]): Promise<void> {
    const vector = await this.embeddings.embed(buildProgramSearchText(program));
    this.items.set(id, {
      id,
      title: program.title,
      summary: program.summary,
      description: program.description,
      targetGroups: [...program.targetGroups],
      topics: [...program.topics],
      problemsAddressed: [...program.problemsAddressed],
      eligibility: null,
      eligibilityDescription: null,
      searchText: buildProgramSearchText(program),
      status: 'active',
      url: null,
      validFrom: null,
      validUntil: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    });
    this.vectors.set(id, vector);
  }

  private readonly vectors = new Map<string, number[]>();

  async semanticSearch({ embedding, limit }: { embedding: number[]; limit: number }): Promise<ProgramCandidate[]> {
    const cosine = (a: number[], b: number[]): number => {
      let dot = 0;
      let na = 0;
      let nb = 0;
      for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    };
    return [...this.items.values()]
      .map((program) => ({ program, similarity: cosine(embedding, this.vectors.get(program.id) ?? []) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async listActivePrograms(): Promise<Program[]> {
    return [...this.items.values()];
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    return ids.map((id) => this.items.get(id)).filter((p): p is Program => Boolean(p));
  }

  async getById(id: string): Promise<Program | undefined> {
    return this.items.get(id);
  }

  async createProgram(): Promise<Program> {
    throw new Error('not used');
  }

  async createProgramWithId(id: string, program: Parameters<typeof buildProgramSearchText>[0]): Promise<Program> {
    await this.add(id, program);
    return this.items.get(id)!;
  }

  async updateProgram(): Promise<Program | undefined> {
    return undefined;
  }
}

class InMemoryConversationRepository {
  private readonly store = new Map<string, { id: string; state: any }>();
  private counter = 0;
  async create(state: any) {
    this.counter += 1;
    const conversation = { id: `conv_${this.counter}`, state };
    this.store.set(conversation.id, conversation);
    return conversation;
  }
  async get(id: string) {
    return this.store.get(id);
  }
  async updateState(id: string, state: any) {
    const existing = this.store.get(id);
    if (existing) existing.state = state;
  }
  async appendMessage() {}
}

class InMemorySearchRepository {
  private readonly searches = new Map<string, StoredSearch>();
  private readonly results = new Map<string, StoredSearchResult[]>();
  private counter = 0;
  async createSearch(input: { conversationId: string; searchQuery: string; results: StoredSearchResult[] }) {
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
  async getSearch(id: string) {
    return this.searches.get(id);
  }
  async getResultPage(searchId: string, offset: number, limit: number) {
    return (this.results.get(searchId) ?? []).slice(offset, offset + limit);
  }
  async countResults(searchId: string) {
    return (this.results.get(searchId) ?? []).length;
  }
}

describe('chatbot retrieves a bridged innovation', () => {
  test('an imported innovation becomes a recommendation to a matching problem', async () => {
    const embeddings: EmbeddingProvider = {
      async embed(text: string) {
        return hashEmbedding(text, 256);
      },
    };

    const programs = new InMemoryProgramRepository(embeddings);
    const id = programIdForInnovation('rops-bawita');
    await programs.add(id, innovationToProgram(makeInnovation()));

    const service = new AssistantService({
      programs,
      conversations: new InMemoryConversationRepository() as any,
      searches: new InMemorySearchRepository() as any,
      embeddings,
      llm: createAssistantLlm(),
      similarityThreshold: 0.05,
      candidateLimit: 20,
      defaultPageSize: 3,
      maxPageSize: 20,
    });

    const response = await service.sendMessage({
      message: {
        type: 'text',
        text: 'W naszej gminie wiele osób starszych mieszka samotnie. Szukamy wsparcia dla seniorów.',
      },
    });

    assert.equal(response.type, 'recommendations');
    if (response.type !== 'recommendations') return;
    assert.ok(response.search.recommendations.length >= 1);
    const top = response.search.recommendations[0];
    assert.equal(top.id, id);
    assert.equal(top.title, 'BaWita');
    assert.ok(top.details.some((detail) => detail.label === 'Tematy'));
  });
});
