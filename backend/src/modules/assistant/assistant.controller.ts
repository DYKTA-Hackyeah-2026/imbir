import type { NextFunction, Request, Response } from 'express';
import type { AssistantService } from '../../assistant/service.js';
import {
  parseAssistantMessageInput,
  parseSearchId,
  parseSearchPagination,
} from '../../assistant/validation.js';

export interface AssistantController {
  sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
  getSearch(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export function createAssistantController(service: AssistantService): AssistantController {
  return {
    async sendMessage(req, res, next) {
      try {
        const input = parseAssistantMessageInput(req.body);
        const response = await service.sendMessage(input);
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },

    async getSearch(req, res, next) {
      try {
        const searchId = parseSearchId(req.params.searchId);
        const { page, pageSize } = parseSearchPagination(req.query, service.pageLimits);
        const response = await service.getSearchPage(searchId, page, pageSize);
        res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    },
  };
}
