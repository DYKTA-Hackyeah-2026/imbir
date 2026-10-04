import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { createAssistantLlm } from './llm.js';
import { AssistantService } from './service.js';
import type { ProgramRepository, SemanticSearchInput } from './program.repository.js';
import config from '../config/config.js';
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
import { applyProgramSearchFallback, buildProgramSearchText, programSearchSimilarity } from './search-text.js';
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

  async semanticSearch({ embedding, limit, query, similarityThreshold }: SemanticSearchInput): Promise<ProgramCandidate[]> {
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
    const candidates = [...this.items.values()]
      .map((program) => {
        const similarity = cosine(embedding, this.vectors.get(program.id) ?? []);
        return { program, similarity };
      });
    return applyProgramSearchFallback(candidates, query, similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
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
      similarityThreshold: config.assistant.similarityThreshold,
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

  test('retrieves imported innovations at the default cutoff even with incompatible stored vectors', async () => {
    const catalogue = JSON.parse(readFileSync(new URL('../../data/import/rops-innovations.json', import.meta.url), 'utf8')) as {
      innovations: InnovationRow[];
    };
    // Simulate an embedding provider change/outage: query and catalogue vectors
    // have no similarity, so only explicit catalogue evidence can recover results.
    const storedEmbeddings: EmbeddingProvider = { async embed() { return [1, 0]; } };
    const queryEmbeddings: EmbeddingProvider = { async embed() { return [0, 1]; } };
    const programs = new InMemoryProgramRepository(storedEmbeddings);
    for (const innovation of catalogue.innovations) {
      await programs.add(programIdForInnovation(innovation.id), innovationToProgram(innovation));
    }
    const service = new AssistantService({
      programs,
      conversations: new InMemoryConversationRepository() as any,
      searches: new InMemorySearchRepository() as any,
      embeddings: queryEmbeddings,
      llm: createAssistantLlm(),
      similarityThreshold: config.assistant.similarityThreshold,
      candidateLimit: 20,
      defaultPageSize: 3,
      maxPageSize: 20,
    });
    for (const text of [
      'Szukamy wsparcia dla samotnych seniorów w naszej gminie.',
      'Chcemy pomóc osobom bezrobotnym wrócić do pracy.',
      'Potrzebujemy innowacji dla osób z niepełnosprawnością.',
    ]) {
      const response = await service.sendMessage({ message: { type: 'text', text } });
      assert.equal(response.type, 'recommendations', text);
      if (response.type !== 'recommendations') continue;
      assert.ok(response.search.recommendations.length > 0);
      const page = await service.getSearchPage(response.search.id, 1, 3);
      assert.deepEqual(page.recommendations, response.search.recommendations);
    }
  });

  test('does not treat generic support language as a catalogue match', () => {
    const program = innovationToProgram(makeInnovation());
    assert.equal(programSearchSimilarity('Szukamy pomocy i wsparcia.', program, 0), 0);
    assert.equal(programSearchSimilarity('Potrzebujemy transportu publicznego.', program, 0), 0);
    assert.ok(programSearchSimilarity('Szukam innowacji BaWita', program, 0) >= config.assistant.similarityThreshold);
  });

  test('shows tag and title fallback matches only when no embedding match clears the cutoff', async () => {
    const programs = new InMemoryProgramRepository({ async embed() { return [1, 0]; } });
    await programs.add('semantic-match', innovationToProgram(makeInnovation({ title: 'Semantic match', problemTags: [] })));
    await programs.add('fallback-match', innovationToProgram(makeInnovation()));
    const [semantic, fallback] = await programs.getByIds(['semantic-match', 'fallback-match']);
    const candidates = [{ program: semantic, similarity: 0.5 }, { program: fallback, similarity: 0.1 }];
    const query = 'Szukamy wsparcia dla seniorów, na przykład BaWita';
    assert.deepEqual(applyProgramSearchFallback(candidates, query, 0.35), [candidates[0]]);
    const recovered = applyProgramSearchFallback(candidates, query, 0.6);
    assert.ok(recovered.find((candidate) => candidate.program.id === 'fallback-match')!.similarity >= 0.6);
    assert.equal(recovered.find((candidate) => candidate.program.id === 'semantic-match')!.similarity, 0.5);
  });
});
