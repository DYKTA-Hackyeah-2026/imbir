import { Router, type RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { decodeJwt } from 'jose';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { HttpError } from '../utils/http-error.js';
import * as service from './service.js';
import { issueChatTicket } from './websocket.js';

const recipientSchema = z.object({ recipientId: z.number().int().positive().max(2147483647) }).strict();
const messageSchema = z.object({ content: z.string().trim().min(1).max(4000), clientMessageId: z.uuid() }).strict();
const readSchema = z.object({ messageId: z.uuid() }).strict();
const emailSchema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()) }).strict();
const asyncRoute = (handler: (...args: Parameters<RequestHandler>) => Promise<void>): RequestHandler =>
  async (req, res, next) => {
    try { await handler(req, res, next); } catch (error) { next(error); }
  };
const uuidParam = (value: unknown) => {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw HttpError.badRequest('Invalid identifier');
  return parsed.data;
};
export const chatRouter = Router();
chatRouter.use(requireAuth);
chatRouter.use(asyncRoute(async (req, _res, next) => {
  const userId = Number(req.user?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) throw HttpError.unauthorized();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw HttpError.unauthorized('Account no longer exists');
  next();
}));
const limit = (max: number) => rateLimit({ windowMs: 60_000, limit: max, keyGenerator: req => req.user!.id, standardHeaders: 'draft-8', legacyHeaders: false });
chatRouter.use(limit(240));
const messagesLimit = limit(60);
const requestsLimit = limit(15);
const id = (req: Parameters<RequestHandler>[0]) => Number(req.user!.id);
chatRouter.get('/conversations', asyncRoute(async (req, res) => { res.json({ data: await service.listConversations(id(req)) }); }));
chatRouter.post('/conversations', requestsLimit, validateBody(recipientSchema), asyncRoute(async (req, res) => {
  res.json({ data: await service.createConversation(id(req), req.body.recipientId) });
}));
chatRouter.get('/conversations/:id/messages', validateQuery(z.object({ before: z.uuid().optional() }).strict()), asyncRoute(async (req, res) => {
  res.json({ data: await service.loadMessages(id(req), uuidParam(req.params.id), res.locals.query.before) });
}));
chatRouter.post('/conversations/:id/messages', messagesLimit, validateBody(messageSchema), asyncRoute(async (req, res) => {
  res.json({ data: await service.sendMessage(id(req), uuidParam(req.params.id), req.body.content, req.body.clientMessageId) });
}));
chatRouter.post('/conversations/:id/read', validateBody(readSchema), asyncRoute(async (req, res) => {
  res.json({ data: await service.markRead(id(req), uuidParam(req.params.id), req.body.messageId) });
}));
chatRouter.get('/users', validateQuery(z.object({ q: z.string().trim().max(80).default('') }).strict()), asyncRoute(async (req, res) => {
  res.json({ data: await service.searchUsers(id(req), res.locals.query.q) });
}));
chatRouter.get('/requests', asyncRoute(async (req, res) => { res.json({ data: await service.listRequests(id(req)) }); }));
chatRouter.post('/requests', requestsLimit, validateBody(recipientSchema), asyncRoute(async (req, res) => {
  res.json({ data: await service.sendRequest(id(req), req.body.recipientId) });
}));
chatRouter.post('/requests/:id/accept', requestsLimit, asyncRoute(async (req, res) => {
  res.json({ data: await service.respondToRequest(id(req), uuidParam(req.params.id), true) });
}));
chatRouter.post('/requests/:id/decline', requestsLimit, asyncRoute(async (req, res) => {
  res.json({ data: await service.respondToRequest(id(req), uuidParam(req.params.id), false) });
}));
chatRouter.post('/invitations', requestsLimit, validateBody(emailSchema), asyncRoute(async (req, res) => {
  res.json({ data: await service.inviteByEmail(id(req), req.body.email) });
}));
chatRouter.post('/ws-ticket', limit(10), asyncRoute(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // requireAuth already verified this token; read its verified expiration here
  // so a socket cannot extend a nearly expired HTTP session by a full token TTL.
  const expiresAt = decodeJwt(req.headers.authorization!.split(' ')[1]!).exp;
  if (typeof expiresAt !== 'number') throw HttpError.unauthorized('Token expiration required');
  res.json({ data: issueChatTicket(id(req), expiresAt * 1000) });
}));
