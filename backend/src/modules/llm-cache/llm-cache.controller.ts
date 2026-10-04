import type { Request, RequestHandler } from 'express';
import { ApiError } from '../../http/errors.js';
import * as client from './llm-cache.client.js';

function forwardCacheHeaders(headers: Headers, res: Parameters<RequestHandler>[1]): void {
  for (const name of ['x-cache', 'x-cache-space', 'x-cache-model']) {
    const value = headers.get(name);
    if (value) {
      res.setHeader(name, value);
    }
  }
}

export const chatCompletions: RequestHandler = async (req, res) => {
  const spaceHeader = req.header('x-cache-space');
  const cacheSpace = spaceHeader && spaceHeader.trim() ? spaceHeader.trim() : undefined;

  const result = await client.chatCompletions({ body: req.body, cacheSpace });
  forwardCacheHeaders(result.headers, res);
  res.status(result.status).json(result.data);
};

export const models: RequestHandler = async (_req, res) => {
  const result = await client.getModels();
  res.status(result.status).json(result.data);
};

export const health: RequestHandler = async (_req, res) => {
  const result = await client.health();
  res.status(result.status).json(result.data);
};

function paramId(req: Request): string {
  const value = req.params.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) {
    throw ApiError.badRequest('Missing id');
  }
  return id;
}

async function forward(
  req: Request,
  res: Parameters<RequestHandler>[1],
  method: client.AdminRequest['method'],
  path: string,
): Promise<void> {
  const result = await client.adminRequest({
    method,
    path,
    query: req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '',
    body: method === 'GET' || method === 'DELETE' ? undefined : req.body,
  });
  res.status(result.status).json(result.data);
}

export const overview: RequestHandler = (req, res) => forward(req, res, 'GET', '/overview');
export const listSpaces: RequestHandler = (req, res) => forward(req, res, 'GET', '/spaces');
export const createSpace: RequestHandler = (req, res) => forward(req, res, 'POST', '/spaces');
export const updateSpace: RequestHandler = (req, res) => forward(req, res, 'PATCH', `/spaces/${paramId(req)}`);
export const pauseSpace: RequestHandler = (req, res) => forward(req, res, 'POST', `/spaces/${paramId(req)}/pause`);
export const resumeSpace: RequestHandler = (req, res) => forward(req, res, 'POST', `/spaces/${paramId(req)}/resume`);
export const makeDefaultSpace: RequestHandler = (req, res) => forward(req, res, 'POST', `/spaces/${paramId(req)}/default`);
export const moveSpace: RequestHandler = (req, res) => forward(req, res, 'POST', `/spaces/${paramId(req)}/move`);
export const deleteSpace: RequestHandler = (req, res) => forward(req, res, 'DELETE', `/spaces/${paramId(req)}`);
export const getSettings: RequestHandler = (req, res) => forward(req, res, 'GET', '/settings');
export const updateSettings: RequestHandler = (req, res) => forward(req, res, 'PUT', '/settings');
export const listEntries: RequestHandler = (req, res) => forward(req, res, 'GET', '/entries');
export const deleteEntry: RequestHandler = (req, res) => forward(req, res, 'DELETE', `/entries/${paramId(req)}`);
export const purge: RequestHandler = (req, res) => forward(req, res, 'POST', '/cache/purge');
