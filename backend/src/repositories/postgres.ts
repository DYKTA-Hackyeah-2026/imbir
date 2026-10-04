import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  evidenceDocuments,
  innovationCitations,
  innovations,
  matchmakingFeedback,
  matchmakingRequests,
  sources,
} from '../db/schema.js';
import type { EvidenceStatus, MatchStatus, ServiceMode, UserType } from '../matchmaking/domain.js';
import type {
  CatalogueCitation,
  CatalogueEvidence,
  CatalogueInnovation,
  CatalogueRepository,
  CatalogueSource,
  FeedbackRecord,
  MatchmakingRequestRecord,
} from './types.js';

function optional(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

/** PostgreSQL backing store. Embeddings are stored as jsonb arrays for portability. */
export class PostgresCatalogueRepository implements CatalogueRepository {
  readonly kind = 'postgres' as const;

  async listInnovations(): Promise<CatalogueInnovation[]> {
    const rows = await db.select().from(innovations);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      description: row.description,
      sourceId: row.sourceId,
      synthetic: row.synthetic,
      evidenceStatus: row.evidenceStatus as EvidenceStatus,
      problemTags: row.problemTags,
      targetGroups: row.targetGroups,
      testedIn: row.testedIn,
      applicableContexts: row.applicableContexts,
      prerequisites: row.prerequisites,
      resourcesRequired: row.resourcesRequired,
      estimatedCostPln: row.estimatedCostPln ?? null,
      timeframeWeeks: row.timeframeWeeks ?? null,
      embedding: row.embedding ?? undefined,
    }));
  }

  async getInnovation(id: string): Promise<CatalogueInnovation | undefined> {
    const [row] = await db.select().from(innovations).where(eq(innovations.id, id)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      description: row.description,
      sourceId: row.sourceId,
      synthetic: row.synthetic,
      evidenceStatus: row.evidenceStatus as EvidenceStatus,
      problemTags: row.problemTags,
      targetGroups: row.targetGroups,
      testedIn: row.testedIn,
      applicableContexts: row.applicableContexts,
      prerequisites: row.prerequisites,
      resourcesRequired: row.resourcesRequired,
      estimatedCostPln: row.estimatedCostPln ?? null,
      timeframeWeeks: row.timeframeWeeks ?? null,
      embedding: row.embedding ?? undefined,
    };
  }

  async listCitations(innovationId: string): Promise<CatalogueCitation[]> {
    const rows = await db
      .select()
      .from(innovationCitations)
      .where(eq(innovationCitations.innovationId, innovationId));
    return rows.map((row) => ({
      innovationId: row.innovationId,
      sourceId: row.sourceId,
      title: row.title,
      url: optional(row.url),
      page: row.page ?? undefined,
      excerpt: row.excerpt,
    }));
  }

  async listEvidence(): Promise<CatalogueEvidence[]> {
    const rows = await db.select().from(evidenceDocuments);
    return rows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      title: row.title,
      kind: row.kind,
      summary: row.summary,
      url: optional(row.url),
      synthetic: row.synthetic,
      problemTags: row.problemTags,
      embedding: row.embedding ?? undefined,
    }));
  }

  async getSource(id: string): Promise<CatalogueSource | undefined> {
    const [row] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      url: optional(row.url),
      kind: row.kind,
      urlVerified: row.urlVerified,
      synthetic: row.synthetic,
      description: optional(row.description),
    };
  }

  async saveRequest(record: MatchmakingRequestRecord): Promise<void> {
    await db.insert(matchmakingRequests).values({
      requestId: record.requestId,
      userType: record.userType,
      status: record.status,
      mode: record.mode,
      problemSummary: record.problemSummary,
      identifiedNeeds: record.identifiedNeeds,
      input: record.input,
      response: record.response,
      createdAt: record.createdAt,
    });
  }

  async getRequest(requestId: string): Promise<MatchmakingRequestRecord | undefined> {
    const [row] = await db
      .select()
      .from(matchmakingRequests)
      .where(eq(matchmakingRequests.requestId, requestId))
      .limit(1);
    if (!row) return undefined;
    return {
      requestId: row.requestId,
      userType: row.userType as UserType,
      status: row.status as MatchStatus,
      mode: row.mode as ServiceMode,
      problemSummary: row.problemSummary,
      identifiedNeeds: row.identifiedNeeds,
      input: row.input,
      response: row.response,
      createdAt: row.createdAt,
    };
  }

  async saveFeedback(record: FeedbackRecord): Promise<void> {
    await db.insert(matchmakingFeedback).values({
      feedbackId: record.feedbackId,
      requestId: record.requestId,
      innovationId: record.innovationId,
      useful: record.useful,
      reason: record.reason,
      comment: record.comment,
      createdAt: record.createdAt,
    });
  }
}
