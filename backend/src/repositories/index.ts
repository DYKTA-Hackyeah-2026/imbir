import config from '../config/config.js';
import { MemoryCatalogueRepository } from './memory.js';
import { loadSeed } from './seedLoader.js';
import type { CatalogueRepository } from './types.js';

export interface RepositoryResolution {
  repository: CatalogueRepository;
  warnings: string[];
  hasVerifiedCatalogue: boolean;
}

async function isPostgresReady(): Promise<boolean> {
  const { db } = await import('../db/index.js');
  const { sources } = await import('../db/schema.js');
  await db.select().from(sources).limit(1);
  return true;
}

/**
 * Resolves the backing store. In `auto` mode it prefers PostgreSQL and falls
 * back to the in-memory demonstration catalogue, disclosing the reduced mode.
 */
export async function createRepository(): Promise<RepositoryResolution> {
  const { seed, warnings: seedWarnings, hasVerifiedCatalogue } = loadSeed();
  const warnings = [...seedWarnings];

  if (config.storeMode === 'memory') {
    return { repository: new MemoryCatalogueRepository(seed), warnings, hasVerifiedCatalogue };
  }

  if (config.storeMode === 'postgres') {
    const { PostgresCatalogueRepository } = await import('./postgres.js');
    return { repository: new PostgresCatalogueRepository(), warnings, hasVerifiedCatalogue };
  }

  try {
    await isPostgresReady();
    const { PostgresCatalogueRepository } = await import('./postgres.js');
    return { repository: new PostgresCatalogueRepository(), warnings, hasVerifiedCatalogue };
  } catch {
    warnings.push(
      'Baza danych PostgreSQL jest niedostępna, więc usługa działa na danych demonstracyjnych w pamięci.',
    );
    return { repository: new MemoryCatalogueRepository(seed), warnings, hasVerifiedCatalogue };
  }
}

export type { CatalogueRepository } from './types.js';
