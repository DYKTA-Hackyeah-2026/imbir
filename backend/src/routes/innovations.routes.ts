import { Router } from 'express';
import { ApiError } from '../http/errors.js';
import {
  EVIDENCE_STATUSES,
  INNOVATION_SORT_FIELDS,
  type EvidenceStatus,
  type InnovationSortField,
} from '../matchmaking/domain.js';
import type { MatchmakingService } from '../matchmaking/service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_OFFSET = 10000;

function parseOptionalText(raw: unknown, field: string, maxLength: number): string | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw) || typeof raw !== 'string') {
    throw ApiError.validation(`Parametr „${field}” musi być pojedynczą wartością tekstową.`);
  }
  const value = raw.trim();
  if (value.length === 0) {
    throw ApiError.validation(`Parametr „${field}” nie może być pusty.`);
  }
  if (value.length > maxLength) {
    throw ApiError.validation(`Parametr „${field}” może mieć maksymalnie ${maxLength} znaków.`);
  }
  return value;
}

function parseInteger(raw: unknown, field: string, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  if (Array.isArray(raw) || typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw ApiError.validation(`Parametr „${field}” musi być liczbą całkowitą.`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw ApiError.validation(`Parametr „${field}” musi być liczbą z zakresu ${min}–${max}.`);
  }
  return value;
}

function parseOptionalBoolean(raw: unknown, field: string): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw ApiError.validation(`Parametr „${field}” musi mieć wartość „true” lub „false”.`);
}

export function createInnovationsRouter(service: MatchmakingService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const evidenceStatus = parseOptionalText(req.query.evidenceStatus, 'evidenceStatus', 40);
      if (evidenceStatus && !EVIDENCE_STATUSES.includes(evidenceStatus as EvidenceStatus)) {
        throw ApiError.validation(
          `Parametr „evidenceStatus” musi mieć jedną z wartości: ${EVIDENCE_STATUSES.join(', ')}.`,
        );
      }

      const sort = parseOptionalText(req.query.sort, 'sort', 20) ?? 'title';
      if (!INNOVATION_SORT_FIELDS.includes(sort as InnovationSortField)) {
        throw ApiError.validation(
          `Parametr „sort” musi mieć jedną z wartości: ${INNOVATION_SORT_FIELDS.join(', ')}.`,
        );
      }

      const response = await service.listInnovations({
        q: parseOptionalText(req.query.q, 'q', 200),
        problemTag: parseOptionalText(req.query.problemTag, 'problemTag', 120),
        targetGroup: parseOptionalText(req.query.targetGroup, 'targetGroup', 120),
        evidenceStatus: evidenceStatus as EvidenceStatus | undefined,
        synthetic: parseOptionalBoolean(req.query.synthetic, 'synthetic'),
        sort: sort as InnovationSortField,
        limit: parseInteger(req.query.limit, 'limit', DEFAULT_LIMIT, 1, MAX_LIMIT),
        offset: parseInteger(req.query.offset, 'offset', 0, 0, MAX_OFFSET),
      });
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:innovationId', async (req, res, next) => {
    try {
      const innovationId = req.params.innovationId;
      if (!innovationId || innovationId.length > 200) {
        throw ApiError.validation('Niepoprawny identyfikator innowacji.');
      }
      const detail = await service.getInnovationDetail(innovationId);
      if (!detail) {
        throw ApiError.notFound('Nie znaleziono innowacji o podanym identyfikatorze.');
      }
      res.status(200).json(detail);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
