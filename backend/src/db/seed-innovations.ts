/**
 * Seeds the catalogue tables (`sources`, `innovations`, `innovation_citations`,
 * `evidence_documents`) with the same example records the in-memory demo store
 * uses. Idempotent: re-running resets only the catalogue tables.
 *
 * Usage: npm run db:seed:innovations
 */
import { closeDatabase, db } from './client.js';
import {
  evidenceDocuments,
  innovationCitations,
  innovations,
  sources,
} from './schema.js';
import {
  CITATION_SEED,
  EVIDENCE_SEED,
  INNOVATION_SEED,
  SOURCE_SEED,
} from '../repositories/seed.js';

async function main(): Promise<void> {
  process.stdout.write('[seed] resetting catalogue tables...\n');
  await db.delete(innovationCitations);
  await db.delete(evidenceDocuments);
  await db.delete(innovations);
  await db.delete(sources);

  process.stdout.write(`[seed] inserting ${SOURCE_SEED.length} sources...\n`);
  await db.insert(sources).values(
    SOURCE_SEED.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url ?? null,
      kind: source.kind,
      urlVerified: source.urlVerified,
      synthetic: source.synthetic,
      description: source.description ?? null,
    })),
  );

  process.stdout.write(`[seed] inserting ${INNOVATION_SEED.length} innovations...\n`);
  await db.insert(innovations).values(
    INNOVATION_SEED.map((innovation) => ({
      id: innovation.id,
      title: innovation.title,
      summary: innovation.summary,
      description: innovation.description,
      sourceId: innovation.sourceId,
      synthetic: innovation.synthetic,
      evidenceStatus: innovation.evidenceStatus,
      problemTags: innovation.problemTags,
      targetGroups: innovation.targetGroups,
      testedIn: innovation.testedIn,
      applicableContexts: innovation.applicableContexts,
      prerequisites: innovation.prerequisites,
      resourcesRequired: innovation.resourcesRequired,
      estimatedCostPln: innovation.estimatedCostPln,
      timeframeWeeks: innovation.timeframeWeeks,
      embedding: innovation.embedding ?? null,
    })),
  );

  if (CITATION_SEED.length > 0) {
    process.stdout.write(`[seed] inserting ${CITATION_SEED.length} citations...\n`);
    await db.insert(innovationCitations).values(
      CITATION_SEED.map((citation) => ({
        innovationId: citation.innovationId,
        sourceId: citation.sourceId,
        title: citation.title,
        url: citation.url ?? null,
        page: citation.page ?? null,
        excerpt: citation.excerpt,
      })),
    );
  }

  if (EVIDENCE_SEED.length > 0) {
    process.stdout.write(`[seed] inserting ${EVIDENCE_SEED.length} evidence documents...\n`);
    await db.insert(evidenceDocuments).values(
      EVIDENCE_SEED.map((item) => ({
        id: item.id,
        sourceId: item.sourceId,
        title: item.title,
        kind: item.kind,
        summary: item.summary,
        url: item.url ?? null,
        synthetic: item.synthetic,
        problemTags: item.problemTags,
        embedding: item.embedding ?? null,
      })),
    );
  }

  process.stdout.write('[seed] catalogue done.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[seed] catalogue failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });
