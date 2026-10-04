import { Router } from 'express';
import { ApiError } from '../http/errors.js';
import { parseBooleanParam, parseInteger, parseRequiredText } from '../http/parse.js';
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

export function createInnovationsRouter(service: MatchmakingService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const evidenceStatus = parseRequiredText(req.query.evidenceStatus, 'evidenceStatus', 40);
      if (evidenceStatus && !EVIDENCE_STATUSES.includes(evidenceStatus as EvidenceStatus)) {
        throw ApiError.validation(
          `Parametr „evidenceStatus” musi mieć jedną z wartości: ${EVIDENCE_STATUSES.join(', ')}.`,
        );
      }

      const sort = parseRequiredText(req.query.sort, 'sort', 20) ?? 'title';
      if (!INNOVATION_SORT_FIELDS.includes(sort as InnovationSortField)) {
        throw ApiError.validation(
          `Parametr „sort” musi mieć jedną z wartości: ${INNOVATION_SORT_FIELDS.join(', ')}.`,
        );
      }

      const response = await service.listInnovations({
        q: parseRequiredText(req.query.q, 'q', 200),
        problemTag: parseRequiredText(req.query.problemTag, 'problemTag', 120),
        targetGroup: parseRequiredText(req.query.targetGroup, 'targetGroup', 120),
        evidenceStatus: evidenceStatus as EvidenceStatus | undefined,
        synthetic: parseBooleanParam(req.query.synthetic, 'synthetic'),
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
