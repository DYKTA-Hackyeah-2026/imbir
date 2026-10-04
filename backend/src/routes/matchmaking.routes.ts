import { Router } from 'express';
import type { MatchmakingService } from '../matchmaking/service.js';
import { parseFeedbackInput, parseMatchmakingInput } from '../matchmaking/validation.js';

export function createMatchmakingRouter(service: MatchmakingService): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const input = parseMatchmakingInput(req.body);
      const response = await service.match(input);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:requestId/feedback', async (req, res, next) => {
    try {
      const feedback = parseFeedbackInput(req.body);
      const response = await service.submitFeedback(req.params.requestId, feedback);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
