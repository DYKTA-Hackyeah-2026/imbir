/**
 * TEMPORARY local integration server (not part of the app).
 *
 * Serves the real assistant HTTP layer (router + validation + controller +
 * service + ranking + explanation + deterministic LLM) backed by the same
 * in-memory fakes used by src/assistant/assistant.test.ts. This lets the
 * frontend be tested end-to-end against the actual backend behaviour without
 * PostgreSQL/pgvector.
 */
import cors from 'cors';
import express from 'express';
import type { Conversation, ConversationRepository } from '../src/assistant/conversation.repository.js';
import type {
  ConversationState,
  Program,
  ProgramCandidate,
  StoredSearch,
  StoredSearchResult,
} from '../src/assistant/domain.js';
import type { EmbeddingProvider } from '../src/assistant/embedding.js';
import { createAssistantLlm } from '../src/assistant/llm.js';
import type { ProgramRepository, ProgramWriteInput } from '../src/assistant/program.repository.js';
import { buildProgramSearchText } from '../src/assistant/search-text.js';
import type { CreateSearchInput, SearchRepository } from '../src/assistant/search.repository.js';
import { AssistantService } from '../src/assistant/service.js';
import { cosineSimilarity, hashEmbedding } from '../src/matchmaking/text.js';
import { createAssistantRouter } from '../src/modules/assistant/assistant.routes.js';

const DIMENSIONS = 256;
const PORT = Number(process.env.ASSISTANT_TEST_PORT ?? 4100);

const programVectors = new Map<string, number[]>();

function makeProgram(
  id: string,
  title: string,
  summary: string,
  problems: string[],
  extra: Partial<Program> = {},
): Program {
  const base = {
    title,
    summary,
    description: summary,
    targetGroups: extra.targetGroups ?? ['mieszkańcy'],
    topics: extra.topics ?? ['wsparcie'],
    problemsAddressed: problems,
  };
  programVectors.set(id, hashEmbedding(buildProgramSearchText(base), DIMENSIONS));
  return {
    id,
    ...base,
    eligibility: extra.eligibility ?? null,
    eligibilityDescription: extra.eligibilityDescription ?? null,
    searchText: buildProgramSearchText(base),
    status: 'active',
    url: extra.url ?? null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

const PROGRAMS: Program[] = [
  makeProgram('p1', 'Cyfrowy Senior', 'Pomoc w obsłudze telefonu i internetu', [
    'obsługa paczkomatu',
    'wykluczenie cyfrowe',
  ], {
    targetGroups: ['seniorzy'],
    topics: ['kompetencje cyfrowe'],
    eligibility: { minAge: 60 },
    eligibilityDescription: 'Program dla mieszkańców gminy powyżej 60 lat.',
    url: '/programs/p1',
  }),
  makeProgram('p2', 'Aktywni Zawodowo', 'Pomoc w znalezieniu pracy', ['brak pracy'], {
    eligibility: { employmentStatus: ['unemployed'] },
  }),
  makeProgram('p3', 'Pomoc Żywnościowa', 'Pomoc z jedzeniem', ['brak jedzenia']),
  makeProgram('p4', 'Wsparcie Mieszkaniowe', 'Sprawy mieszkaniowe', ['bezdomność'], {
    eligibility: { housingStatus: ['homeless'] },
  }),
  makeProgram('p5', 'Wsparcie Psychologiczne', 'Wsparcie zdrowotne', ['kryzys psychiczny']),
  makeProgram('p6', 'Klub Seniora', 'Miejsce spotkań dla starszych osób', ['samotność'], {
    targetGroups: ['seniorzy'],
    eligibility: { minAge: 55 },
    url: 'https://example.org/klub-seniora',
  }),
  makeProgram('p7', 'Transport na badania', 'Dofinansowanie dojazdów', ['transport', 'mobilność']),
  makeProgram('p8', 'Poradnictwo obywatelskie', 'Bezpłatne porady prawne', [
    'dokumenty',
    'sprawy urzędowe',
  ]),
];

const embeddings: EmbeddingProvider = {
  async embed(text) {
    return hashEmbedding(text, DIMENSIONS);
  },
};

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
    throw new Error('not used');
  }
  async createProgramWithId(_id: string, _input: ProgramWriteInput): Promise<Program> {
    throw new Error('not used');
  }
  async updateProgram(): Promise<Program | undefined> {
    throw new Error('not used');
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
  async createSearch(input: CreateSearchInput): Promise<StoredSearch> {
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

const service = new AssistantService({
  programs: new FakeProgramRepository(PROGRAMS),
  conversations: new FakeConversationRepository(),
  searches: new FakeSearchRepository(),
  embeddings,
  llm: createAssistantLlm(),
  similarityThreshold: -1,
  candidateLimit: 20,
  defaultPageSize: 3,
  maxPageSize: 20,
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/assistant', createAssistantRouter(service));
app.listen(PORT, () => {
  process.stdout.write(`[assistant-test] listening on http://localhost:${PORT}\n`);
});
