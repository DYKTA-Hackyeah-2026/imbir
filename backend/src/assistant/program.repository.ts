import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { programs } from '../db/schema.js';
import type {
  Program,
  ProgramCandidate,
  ProgramEligibility,
  ProgramStatus,
} from './domain.js';
import { applyProgramSearchFallback, buildProgramSearchText } from './search-text.js';
import type { EmbeddingProvider } from './embedding.js';

export interface SemanticSearchInput {
  embedding: number[];
  limit: number;
  query?: string;
  similarityThreshold: number;
}

export interface ProgramWriteInput {
  title: string;
  summary: string;
  description: string;
  targetGroups: string[];
  topics: string[];
  problemsAddressed: string[];
  eligibility?: ProgramEligibility | null;
  eligibilityDescription?: string | null;
  status: ProgramStatus;
  url?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
}

/** Domain port. The domain never builds pgvector SQL itself. */
export interface ProgramRepository {
  semanticSearch(input: SemanticSearchInput): Promise<ProgramCandidate[]>;
  getByIds(ids: string[]): Promise<Program[]>;
  getById(id: string): Promise<Program | undefined>;
  createProgram(input: ProgramWriteInput): Promise<Program>;
  /** Inserts a program with a caller-supplied id (used by deterministic bridges). */
  createProgramWithId(id: string, input: ProgramWriteInput): Promise<Program>;
  updateProgram(id: string, input: ProgramWriteInput): Promise<Program | undefined>;
}

type ProgramRow = typeof programs.$inferSelect;

function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    targetGroups: row.targetGroups,
    topics: row.topics,
    problemsAddressed: row.problemsAddressed,
    eligibility: row.eligibility ?? null,
    eligibilityDescription: row.eligibilityDescription,
    searchText: row.searchText,
    status: row.status,
    url: row.url,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVectorLiteral(embedding: readonly number[]): string {
  return `[${embedding.map((value) => Number(value)).join(',')}]`;
}

function searchAffectingFieldsChanged(existing: Program, input: ProgramWriteInput): boolean {
  return (
    existing.title !== input.title ||
    existing.summary !== input.summary ||
    existing.description !== input.description ||
    JSON.stringify(existing.targetGroups) !== JSON.stringify(input.targetGroups) ||
    JSON.stringify(existing.topics) !== JSON.stringify(input.topics) ||
    JSON.stringify(existing.problemsAddressed) !== JSON.stringify(input.problemsAddressed)
  );
}

function writeValues(input: ProgramWriteInput, searchText: string) {
  return {
    title: input.title,
    summary: input.summary,
    description: input.description,
    targetGroups: input.targetGroups,
    topics: input.topics,
    problemsAddressed: input.problemsAddressed,
    eligibility: input.eligibility ?? null,
    eligibilityDescription: input.eligibilityDescription ?? null,
    searchText,
    status: input.status,
    url: input.url ?? null,
    validFrom: input.validFrom ?? null,
    validUntil: input.validUntil ?? null,
  };
}

export class PostgresProgramRepository implements ProgramRepository {
  constructor(private readonly embeddings: EmbeddingProvider) {}

  async semanticSearch({ embedding, limit, query, similarityThreshold }: SemanticSearchInput): Promise<ProgramCandidate[]> {
    const literal = toVectorLiteral(embedding);
    const distance = sql<number>`(${programs.embedding} <=> ${literal}::vector)`;

    const statement = db
      .select({ program: programs, distance })
      .from(programs)
      .where(query ? eq(programs.status, 'active') : and(eq(programs.status, 'active'), isNotNull(programs.embedding)))
      .orderBy(distance);
    // Apply the limit after tag/title matching so vector ordering cannot hide
    // relevant catalogue rows (including rows awaiting an embedding).
    const rows = await (query ? statement : statement.limit(limit));

    const candidates = rows.map((row) => {
      const program = toProgram(row.program);
      const similarity = row.distance == null ? 0 : 1 - Number(row.distance);
      return {
        program,
        similarity,
      };
    });
    return applyProgramSearchFallback(candidates, query, similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity || a.program.id.localeCompare(b.program.id))
      .slice(0, limit);
  }

  async getByIds(ids: string[]): Promise<Program[]> {
    if (ids.length === 0) return [];
    const rows = await db.select().from(programs).where(inArray(programs.id, ids));
    return rows.map(toProgram);
  }

  async getById(id: string): Promise<Program | undefined> {
    const [row] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
    return row ? toProgram(row) : undefined;
  }

  async createProgram(input: ProgramWriteInput): Promise<Program> {
    const searchText = buildProgramSearchText(input);
    const vector = await this.embeddings.embed(searchText);

    const [row] = await db
      .insert(programs)
      .values({ ...writeValues(input, searchText), embedding: vector })
      .returning();

    return toProgram(row);
  }

  async createProgramWithId(id: string, input: ProgramWriteInput): Promise<Program> {
    const searchText = buildProgramSearchText(input);
    const vector = await this.embeddings.embed(searchText);

    const [row] = await db
      .insert(programs)
      .values({ id, ...writeValues(input, searchText), embedding: vector })
      .returning();

    return toProgram(row);
  }

  async updateProgram(id: string, input: ProgramWriteInput): Promise<Program | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    if (!searchAffectingFieldsChanged(existing, input)) {
      const [row] = await db
        .update(programs)
        .set({ ...writeValues(input, existing.searchText), updatedAt: new Date() })
        .where(eq(programs.id, id))
        .returning();
      return row ? toProgram(row) : undefined;
    }

    const searchText = buildProgramSearchText(input);
    const vector = await this.embeddings.embed(searchText);

    const [row] = await db
      .update(programs)
      .set({ ...writeValues(input, searchText), embedding: vector, updatedAt: new Date() })
      .where(eq(programs.id, id))
      .returning();

    return row ? toProgram(row) : undefined;
  }
}
