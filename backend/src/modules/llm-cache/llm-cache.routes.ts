import { Router } from 'express';
import * as controller from './llm-cache.controller.js';

const llmRouter = Router();

llmRouter.get('/health', controller.health);
llmRouter.get('/models', controller.models);
llmRouter.post('/chat/completions', controller.chatCompletions);

llmRouter.get('/admin/overview', controller.overview);
llmRouter.get('/admin/spaces', controller.listSpaces);
llmRouter.post('/admin/spaces', controller.createSpace);
llmRouter.patch('/admin/spaces/:id', controller.updateSpace);
llmRouter.post('/admin/spaces/:id/pause', controller.pauseSpace);
llmRouter.post('/admin/spaces/:id/resume', controller.resumeSpace);
llmRouter.post('/admin/spaces/:id/default', controller.makeDefaultSpace);
llmRouter.post('/admin/spaces/:id/move', controller.moveSpace);
llmRouter.delete('/admin/spaces/:id', controller.deleteSpace);
llmRouter.get('/admin/settings', controller.getSettings);
llmRouter.put('/admin/settings', controller.updateSettings);
llmRouter.get('/admin/entries', controller.listEntries);
llmRouter.delete('/admin/entries/:id', controller.deleteEntry);
llmRouter.post('/admin/cache/purge', controller.purge);

export default llmRouter;
