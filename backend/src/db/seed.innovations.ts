/**
 * Imports the public ROPS social-innovation catalogue from `data/import` into
 * PostgreSQL (`sources`, `innovations`, `innovation_citations`).
 *
 * Idempotent: records are upserted by id and citations are replaced per source
 * record, so re-running refreshes the catalogue without creating duplicates.
 *
 * The import payload contains only public titles and short summaries from the
 * ROPS Innovation Library category pages — no personal data, authors, or
 * sensitive information (RODO).
 *
 * Usage: npm run db:seed:innovations [importDir]
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { inArray, sql } from 'drizzle-orm';
import { createAiGateway } from '../ai/index.js';
import { createEmbeddingProvider } from '../assistant/embedding.js';
import { PostgresProgramRepository } from '../assistant/program.repository.js';
import { bridgeInnovations } from '../assistant/seed.assistant-innovations.js';
import { importCatalogue } from '../repositories/importer.js';
import { closeDatabase, db } from './client.js';
import { innovationCitations, innovations, sources } from './schema.js';

/**
 * Resolves the import directory regardless of the process working directory
 * (e.g. `node /app/dist/db/seed.innovations.js` run from `/` in a container).
 * Order: explicit CLI arg, cwd-relative `data/import`, then paths relative to
 * the package root (`dist/db` -> `../../data/import`).
 */
function resolveImportDir(): string {
  const candidates: string[] = [];
  const explicit = process.argv[2];
  if (explicit) {
    candidates.push(isAbsolute(explicit) ? explicit : resolve(process.cwd(), explicit));
  }
  candidates.push(resolve(process.cwd(), 'data/import'));

  const here = dirname(fileURLToPath(import.meta.url));
  candidates.push(resolve(here, '../../data/import'));
  candidates.push(resolve(here, '../../../data/import'));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return join(process.cwd(), 'data/import');
}

const importDir = resolveImportDir();

async function main(): Promise<void> {
  process.stdout.write(`[seed:innovations] importing from ${importDir}...\n`);
  const result = importCatalogue(importDir);
  for (const warning of result.warnings) {
    process.stderr.write(`[seed:innovations] warning: ${warning}\n`);
  }

  for (const source of result.sources) {
    await db
      .insert(sources)
      .values({
        id: source.id,
        title: source.title,
        url: source.url ?? null,
        kind: source.kind,
        urlVerified: source.urlVerified,
        synthetic: source.synthetic,
        description: source.description ?? null,
      })
      .onConflictDoUpdate({
        target: sources.id,
        set: {
          title: sql`excluded."title"`,
          url: sql`excluded."url"`,
          kind: sql`excluded."kind"`,
          urlVerified: sql`excluded."url_verified"`,
          synthetic: sql`excluded."synthetic"`,
          description: sql`excluded."description"`,
        },
      });
  }

  const ids: string[] = [];
  for (const innovation of result.innovations) {
    ids.push(innovation.id);
    await db
      .insert(innovations)
      .values({
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
      })
      .onConflictDoUpdate({
        target: innovations.id,
        set: {
          title: sql`excluded."title"`,
          summary: sql`excluded."summary"`,
          description: sql`excluded."description"`,
          sourceId: sql`excluded."source_id"`,
          synthetic: sql`excluded."synthetic"`,
          evidenceStatus: sql`excluded."evidence_status"`,
          problemTags: sql`excluded."problem_tags"`,
          targetGroups: sql`excluded."target_groups"`,
          testedIn: sql`excluded."tested_in"`,
          applicableContexts: sql`excluded."applicable_contexts"`,
          prerequisites: sql`excluded."prerequisites"`,
          resourcesRequired: sql`excluded."resources_required"`,
          estimatedCostPln: sql`excluded."estimated_cost_pln"`,
          timeframeWeeks: sql`excluded."timeframe_weeks"`,
        },
      });
  }

  if (ids.length > 0) {
    await db.delete(innovationCitations).where(inArray(innovationCitations.innovationId, ids));
  }

  if (result.citations.length > 0) {
    await db.insert(innovationCitations).values(
      result.citations.map((citation) => ({
        innovationId: citation.innovationId,
        sourceId: citation.sourceId,
        title: citation.title,
        url: citation.url ?? null,
        page: citation.page ?? null,
        excerpt: citation.excerpt,
      })),
    );
  }

  process.stdout.write(
    `[seed:innovations] done: ${result.sources.length} sources, ${result.innovations.length} innovations, ${result.citations.length} citations.\n`,
  );

  // Make the freshly imported catalogue searchable by the assistant. Without
  // this bridge an innovation lives in `innovations` but stays invisible to the
  // chatbot, which only reads the `programs` index. Non-fatal: a transient
  // embedding failure must not fail the import.
  try {
    const embeddings = createEmbeddingProvider(createAiGateway());
    const repository = new PostgresProgramRepository(embeddings);
    const bridged = await bridgeInnovations(repository);
    process.stdout.write(
      `[seed:innovations] bridged ${bridged.upserted}/${bridged.considered} innovations into the assistant index.\n`,
    );
  } catch (error) {
    process.stderr.write(`[seed:innovations] assistant bridge failed: ${String(error)}\n`);
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[seed:innovations] failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });
