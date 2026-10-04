import config from '../config/config.js';
import { importCatalogue } from './importer.js';
import type { CatalogueSeed } from './memory.js';
import { CITATION_SEED, EVIDENCE_SEED, INNOVATION_SEED, SOURCE_SEED } from './seed.js';
import type { CatalogueSource } from './types.js';

export interface LoadedSeed {
  seed: CatalogueSeed;
  warnings: string[];
  /** True when at least one non-synthetic innovation is available. */
  hasVerifiedCatalogue: boolean;
}

function mergeSources(base: CatalogueSource[], extra: CatalogueSource[]): CatalogueSource[] {
  const map = new Map(base.map((source) => [source.id, source]));
  for (const source of extra) map.set(source.id, source);
  return [...map.values()];
}

/**
 * Builds the catalogue: synthetic demonstration records plus, when configured,
 * operator-supplied imports. Imports override synthetic records with the same id.
 */
export function loadSeed(): LoadedSeed {
  const seed: CatalogueSeed = {
    sources: [...SOURCE_SEED],
    innovations: [...INNOVATION_SEED],
    citations: [...CITATION_SEED],
    evidence: [...EVIDENCE_SEED],
  };
  const warnings: string[] = [];

  if (config.importDir) {
    const imported = importCatalogue(config.importDir);
    warnings.push(...imported.warnings);
    seed.sources = mergeSources(seed.sources, imported.sources);

    const innovationsById = new Map(seed.innovations.map((innovation) => [innovation.id, innovation]));
    for (const innovation of imported.innovations) innovationsById.set(innovation.id, innovation);
    seed.innovations = [...innovationsById.values()];

    const evidenceById = new Map(seed.evidence.map((item) => [item.id, item]));
    for (const item of imported.evidence) evidenceById.set(item.id, item);
    seed.evidence = [...evidenceById.values()];

    seed.citations = [...seed.citations, ...imported.citations];
  }

  const hasVerifiedCatalogue = seed.innovations.some((innovation) => !innovation.synthetic);
  return { seed, warnings, hasVerifiedCatalogue };
}
