/**
 * Bridges the imported ROPS innovation catalogue into the assistant's semantic
 * search index. The chatbot only retrieves rows from `programs`, so imported
 * innovations in `innovations` are otherwise invisible to it.
 *
 * For every non-synthetic innovation this script upserts a deterministic
 * `programs` row (same uuid as the innovation) and computes its embedding from
 * the shared search-text builder. Idempotent: re-running updates existing rows
 * only when their search-affecting fields changed.
 *
 * Public data only — titles and short summaries from the ROPS Library, no
 * personal or sensitive information (RODO).
 *
 * Usage: npm run db:seed:assistant-innovations
 */
import { and, eq } from 'drizzle-orm';
import { createAiGateway } from '../ai/index.js';
import { closeDatabase, db } from '../db/client.js';
import { innovations, sources } from '../db/schema.js';
import { createEmbeddingProvider } from './embedding.js';
import {
  PostgresProgramRepository,
  type ProgramRepository,
  type ProgramWriteInput,
} from './program.repository.js';

const SOURCE_ID = 'src-library';
const BRIDGE_DESCRIPTION_PREFIX = 'Innowacja społeczna z Biblioteki Innowacji Społecznych ROPS.';

/**
 * Stable uuid derived from the innovation id, so the same innovation always maps
 * to the same `programs.id` without persisting an extra mapping table.
 */
export function programIdForInnovation(innovationId: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < innovationId.length; i += 1) {
    const code = innovationId.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ code, 0x85ebca6b) + i) >>> 0;
  }
  const hex = (value: number) => value.toString(16).padStart(8, '0');
  const a = hex(h1);
  const b = hex(h2);
  const c = hex((h1 ^ h2) >>> 0);
  const d = hex((Math.imul(h1, 31) ^ h2) >>> 0);
  // RFC 4122 v4 shape: version nibble '4' in group 3, variant '8' in group 4.
  return `${a}-${b.slice(0, 4)}-4${b.slice(4, 7)}-8${c.slice(0, 3)}-${c.slice(4)}${d}`;
}

function compact(values: string[] | null | undefined): string[] {
  if (!values) return [];
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

/**
 * Builds the assistant program view of an innovation. `topics` carries the
 * problem tags so the chatbot's "Tematy" details stay meaningful.
 */
export function innovationToProgram(
  innovation: typeof innovations.$inferSelect,
): ProgramWriteInput {
  const problemTags = compact(innovation.problemTags);
  return {
    title: innovation.title,
    summary: innovation.summary,
    description: `${BRIDGE_DESCRIPTION_PREFIX}\n\n${innovation.description}`,
    targetGroups: compact(innovation.targetGroups),
    topics: problemTags,
    problemsAddressed: problemTags,
    eligibility: null,
    eligibilityDescription: null,
    status: 'active',
    url: null,
  };
}

export interface BridgeResult {
  considered: number;
  upserted: number;
  skippedSynthetic: number;
}

export async function bridgeInnovations(
  repository: ProgramRepository,
  options: { sourceId?: string; includeSynthetic?: boolean } = {},
): Promise<BridgeResult> {
  const sourceId = options.sourceId ?? SOURCE_ID;
  const where = options.includeSynthetic
    ? eq(innovations.sourceId, sourceId)
    : and(eq(innovations.sourceId, sourceId), eq(innovations.synthetic, false));

  const rows = await db.select().from(innovations).where(where);

  const result: BridgeResult = { considered: rows.length, upserted: 0, skippedSynthetic: 0 };
  for (const row of rows) {
    if (row.synthetic && !options.includeSynthetic) {
      result.skippedSynthetic += 1;
      continue;
    }
    const id = programIdForInnovation(row.id);
    const input = innovationToProgram(row);
    const existing = await repository.getById(id);
    if (existing) {
      await repository.updateProgram(id, input);
    } else {
      await repository.createProgramWithId(id, input);
    }
    result.upserted += 1;
  }
  return result;
}

async function main(): Promise<void> {
  const [source] = await db.select().from(sources).where(eq(sources.id, SOURCE_ID)).limit(1);
  if (!source) {
    process.stdout.write(
      `[seed:bridge] source ${SOURCE_ID} not found — run "npm run db:seed:innovations" first. Nothing to do.\n`,
    );
    return;
  }

  const embeddings = createEmbeddingProvider(createAiGateway());
  const repository = new PostgresProgramRepository(embeddings);

  process.stdout.write('[seed:bridge] bridging imported innovations into assistant programs...\n');
  const result = await bridgeInnovations(repository);
  process.stdout.write(
    `[seed:bridge] done: ${result.upserted}/${result.considered} programs upserted ` +
      `(${result.skippedSynthetic} synthetic skipped).\n`,
  );
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1]?.includes('seed.assistant-innovations')) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(`[seed:bridge] failed: ${String(error)}\n`);
      process.exitCode = 1;
    })
    .finally(() => {
      void closeDatabase();
    });
}
