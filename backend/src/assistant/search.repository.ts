import { asc, count, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { searchResults, searches } from '../db/schema.js';
import type { EligibilityStatus, StoredSearch, StoredSearchResult } from './domain.js';

export interface CreateSearchInput {
  conversationId: string;
  searchQuery: string;
  results: StoredSearchResult[];
}

/** Persists a stable ranking snapshot; pagination reads it without re-searching. */
export interface SearchRepository {
  createSearch(input: CreateSearchInput): Promise<StoredSearch>;
  getSearch(id: string): Promise<StoredSearch | undefined>;
  getResultPage(searchId: string, offset: number, limit: number): Promise<StoredSearchResult[]>;
  countResults(searchId: string): Promise<number>;
}

export class PostgresSearchRepository implements SearchRepository {
  async createSearch(input: CreateSearchInput): Promise<StoredSearch> {
    return db.transaction(async (tx) => {
      const [search] = await tx
        .insert(searches)
        .values({
          conversationId: input.conversationId,
          searchQuery: input.searchQuery,
          resultCount: input.results.length,
        })
        .returning();

      if (input.results.length > 0) {
        await tx.insert(searchResults).values(
          input.results.map((result) => ({
            searchId: search.id,
            programId: result.programId,
            position: result.position,
            similarity: result.similarity,
            eligibilityStatus: result.eligibilityStatus,
          })),
        );
      }

      return {
        id: search.id,
        conversationId: search.conversationId,
        searchQuery: search.searchQuery,
        resultCount: search.resultCount,
        createdAt: search.createdAt,
      };
    });
  }

  async getSearch(id: string): Promise<StoredSearch | undefined> {
    const [row] = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      conversationId: row.conversationId,
      searchQuery: row.searchQuery,
      resultCount: row.resultCount,
      createdAt: row.createdAt,
    };
  }

  async getResultPage(
    searchId: string,
    offset: number,
    limit: number,
  ): Promise<StoredSearchResult[]> {
    const rows = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.searchId, searchId))
      .orderBy(asc(searchResults.position))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      programId: row.programId,
      position: row.position,
      similarity: row.similarity,
      eligibilityStatus: row.eligibilityStatus as EligibilityStatus,
    }));
  }

  async countResults(searchId: string): Promise<number> {
    const [row] = await db
      .select({ value: count(searchResults.searchId) })
      .from(searchResults)
      .where(eq(searchResults.searchId, searchId));
    return Number(row?.value ?? 0);
  }
}
