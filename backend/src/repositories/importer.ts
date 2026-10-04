import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { EvidenceStatus } from '../matchmaking/domain.js';
import type { CatalogueCitation, CatalogueEvidence, CatalogueInnovation, CatalogueSource } from './types.js';

interface ImportResult {
  sources: CatalogueSource[];
  innovations: CatalogueInnovation[];
  citations: CatalogueCitation[];
  evidence: CatalogueEvidence[];
  warnings: string[];
}

const EVIDENCE_STATUSES: readonly EvidenceStatus[] = ['documented', 'partially_documented', 'synthetic'];

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function collectJsonFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectJsonFiles(full));
    } else if (entry.toLowerCase().endsWith('.json')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Loads operator-supplied catalogue documents from a directory of JSON files.
 * Imported records are treated as non-synthetic unless explicitly flagged.
 * Malformed records are skipped and reported instead of being invented.
 */
export function importCatalogue(importDir: string): ImportResult {
  const result: ImportResult = { sources: [], innovations: [], citations: [], evidence: [], warnings: [] };
  let files: string[];
  try {
    files = collectJsonFiles(importDir);
  } catch {
    result.warnings.push(`Nie udało się odczytać katalogu importu: ${importDir}.`);
    return result;
  }

  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      result.warnings.push(`Pominięto niepoprawny plik importu: ${file}.`);
      continue;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      result.warnings.push(`Pominięto plik importu bez poprawnej struktury: ${file}.`);
      continue;
    }
    const payload = parsed as Record<string, unknown>;

    for (const raw of Array.isArray(payload.sources) ? payload.sources : []) {
      const source = raw as Record<string, unknown>;
      const id = asString(source.id);
      const title = asString(source.title);
      if (!id || !title) continue;
      result.sources.push({
        id,
        title,
        url: asString(source.url),
        kind: asString(source.kind) ?? 'imported',
        urlVerified: source.urlVerified === true,
        synthetic: false,
        description: asString(source.description),
      });
    }

    for (const raw of Array.isArray(payload.innovations) ? payload.innovations : []) {
      const item = raw as Record<string, unknown>;
      const id = asString(item.id);
      const title = asString(item.title);
      const summary = asString(item.summary);
      const description = asString(item.description);
      if (!id || !title || !summary || !description) {
        result.warnings.push(`Pominięto rekord innowacji bez wymaganych pól w pliku ${file}.`);
        continue;
      }
      const rawStatus = asString(item.evidenceStatus);
      const evidenceStatus: EvidenceStatus = EVIDENCE_STATUSES.includes(rawStatus as EvidenceStatus)
        ? (rawStatus as EvidenceStatus)
        : 'partially_documented';
      result.innovations.push({
        id,
        title,
        summary,
        description,
        sourceId: asString(item.sourceId) ?? 'imported',
        synthetic: item.synthetic === true,
        evidenceStatus,
        problemTags: asStringArray(item.problemTags),
        targetGroups: asStringArray(item.targetGroups),
        testedIn: asStringArray(item.testedIn),
        applicableContexts: asStringArray(item.applicableContexts),
        prerequisites: asStringArray(item.prerequisites),
        resourcesRequired: asStringArray(item.resourcesRequired),
        estimatedCostPln: asNumber(item.estimatedCostPln),
        timeframeWeeks: asNumber(item.timeframeWeeks),
      });
      for (const rawCitation of Array.isArray(item.citations) ? item.citations : []) {
        const citation = rawCitation as Record<string, unknown>;
        const excerpt = asString(citation.excerpt);
        const citationTitle = asString(citation.title);
        if (!excerpt || !citationTitle) continue;
        result.citations.push({
          innovationId: id,
          sourceId: asString(citation.sourceId) ?? 'imported',
          title: citationTitle,
          url: asString(citation.url),
          page: typeof citation.page === 'number' ? citation.page : undefined,
          excerpt,
        });
      }
    }

    for (const raw of Array.isArray(payload.evidence) ? payload.evidence : []) {
      const item = raw as Record<string, unknown>;
      const id = asString(item.id);
      const title = asString(item.title);
      const summary = asString(item.summary);
      if (!id || !title || !summary) continue;
      result.evidence.push({
        id,
        sourceId: asString(item.sourceId) ?? 'imported',
        title,
        kind: asString(item.kind) ?? 'imported',
        summary,
        url: asString(item.url),
        synthetic: item.synthetic === true,
        problemTags: asStringArray(item.problemTags),
      });
    }
  }

  return result;
}
