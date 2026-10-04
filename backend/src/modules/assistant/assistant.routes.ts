import { Router } from 'express';
import type { AssistantService } from '../../assistant/service.js';
import { createAssistantController } from './assistant.controller.js';

export function createAssistantRouter(service: AssistantService): Router {
  const router = Router();
  const controller = createAssistantController(service);

  router.post('/messages', controller.sendMessage);
  router.get('/searches/:searchId', controller.getSearch);

  return router;
}
