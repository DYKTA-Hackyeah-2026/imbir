import { and, asc, desc, eq, gt, ilike, inArray, lt, ne, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chatConversations as conversations, chatParticipants as participants, chatMessages as messages, chatRequests as requests, chatInvitations as invitations, users } from '../db/schema.js';
import { HttpError } from '../utils/http-error.js';
import { emitChat } from './events.js';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const pair = (a: number, b: number) => [a, b].sort((x, y) => x - y).join(':');
const publicUser = (user: { id: number; name: string }) => ({ id: user.id, name: user.name || `Użytkownik ${user.id}` });
async function pairLock(tx: Transaction, a: number, b: number) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${pair(a, b)}, 0))`);
}
export async function requireParticipant(userId: number, conversationId: string) {
  const [participant] = await db.select().from(participants).where(and(eq(participants.userId, userId), eq(participants.conversationId, conversationId)));
  if (!participant) throw HttpError.notFound('Conversation not found');
  return participant;
}
async function recipients(conversationId: string) {
  return (await db.select({ userId: participants.userId }).from(participants).where(eq(participants.conversationId, conversationId))).map(p => p.userId);
}
async function ensureConversation(tx: Transaction, a: number, b: number) {
  const [existing] = await tx.select().from(conversations).where(eq(conversations.pairKey, pair(a, b)));
  if (existing) return existing;
  const [created] = await tx.insert(conversations).values({ pairKey: pair(a, b) }).returning();
  await tx.insert(participants).values([{ conversationId: created.id, userId: a }, { conversationId: created.id, userId: b }]);
  return created;
}
async function validateRecipient(userId: number, recipientId: number) {
  if (userId === recipientId) throw HttpError.badRequest('Choose another user');
  const [recipient] = await db.select({ id: users.id }).from(users).where(eq(users.id, recipientId));
  if (!recipient) throw HttpError.notFound('User not found');
}
export async function listConversations(userId: number) {
  const rows = await db.select({ conversation: conversations, participant: participants }).from(participants)
    .innerJoin(conversations, eq(conversations.id, participants.conversationId)).where(eq(participants.userId, userId)).orderBy(desc(conversations.updatedAt));
  if (!rows.length) return [];
  const ids = rows.map(r => r.conversation.id);
  const others = await db.select({ conversationId: participants.conversationId, id: users.id, name: users.name }).from(participants)
    .innerJoin(users, eq(users.id, participants.userId)).where(and(inArray(participants.conversationId, ids), ne(participants.userId, userId)));
  return Promise.all(rows.map(async ({ conversation, participant }) => {
    const [lastMessage] = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(desc(messages.createdAt), desc(messages.id)).limit(1);
    const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.conversationId, conversation.id), ne(messages.senderId, userId), participant.lastReadAt ? gt(messages.createdAt, participant.lastReadAt) : undefined));
    const other = others.find(o => o.conversationId === conversation.id)!;
    return { id: conversation.id, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt, otherUser: publicUser(other), unreadCount: count.value, lastMessage: lastMessage ?? null };
  }));
}
export async function createConversation(userId: number, recipientId: number) {
  await validateRecipient(userId, recipientId);
  // Conversations exist only after the recipient accepts a chat request.
  // Resolve an existing one; never create one here, or a sender could bypass acceptance.
  const [conversation] = await db.select().from(conversations).where(eq(conversations.pairKey, pair(userId, recipientId)));
  if (!conversation) throw HttpError.forbidden('A chat request must be accepted first');
  return (await listConversations(userId)).find(c => c.id === conversation.id)!;
}
export async function loadMessages(userId: number, conversationId: string, before?: string) {
  await requireParticipant(userId, conversationId);
  let cursor: typeof messages.$inferSelect | undefined;
  if (before) {
    [cursor] = await db.select().from(messages).where(and(eq(messages.id, before), eq(messages.conversationId, conversationId)));
    if (!cursor) throw HttpError.badRequest('Invalid message cursor');
  }
  const rows = await db.select().from(messages).where(and(eq(messages.conversationId, conversationId), cursor ? or(lt(messages.createdAt, cursor.createdAt), and(eq(messages.createdAt, cursor.createdAt), lt(messages.id, cursor.id))) : undefined)).orderBy(desc(messages.createdAt), desc(messages.id)).limit(51);
  return { messages: rows.slice(0, 50).reverse(), hasMore: rows.length > 50 };
}
export async function sendMessage(userId: number, conversationId: string, content: string, clientMessageId: string) {
  await requireParticipant(userId, conversationId);
  const message = await db.transaction(async tx => {
    // Serialize writes to ensure a read timestamp can never cover a later committed message.
    await tx.select().from(conversations).where(eq(conversations.id, conversationId)).for('update');
    const [prior] = await tx.select().from(messages).where(and(eq(messages.senderId, userId), eq(messages.clientMessageId, clientMessageId)));
    if (prior) {
      if (prior.conversationId !== conversationId || prior.content !== content) throw HttpError.conflict('Message identifier already used');
      return prior;
    }
    // PostgreSQL timestamps are microsecond precision, while the JSON/JS boundary is
    // milliseconds. Keep the stored cursor precise at that boundary and strictly
    // increasing even when two writes occur in the same millisecond.
    const [updated] = await tx.update(conversations).set({ updatedAt: sql`date_trunc('milliseconds', greatest(clock_timestamp(), ${conversations.updatedAt} + interval '1 millisecond'))` }).where(eq(conversations.id, conversationId)).returning();
    const [created] = await tx.insert(messages).values({ conversationId, senderId: userId, content, clientMessageId, createdAt: updated.updatedAt }).onConflictDoNothing().returning();
    if (!created) {
      const [existing] = await tx.select().from(messages).where(and(eq(messages.senderId, userId), eq(messages.clientMessageId, clientMessageId)));
      if (!existing || existing.conversationId !== conversationId || existing.content !== content) throw HttpError.conflict('Message identifier already used');
      return existing;
    }
    return created;
  });
  emitChat(await recipients(conversationId), 'message:new', { message });
  return message;
}
export async function markRead(userId: number, conversationId: string, messageId: string) {
  await requireParticipant(userId, conversationId);
  const [message] = await db.select().from(messages).where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));
  if (!message) throw HttpError.notFound('Message not found');
  const [participant] = await db.update(participants).set({ lastReadAt: sql`greatest(coalesce(${participants.lastReadAt}, '-infinity'::timestamptz), ${message.createdAt})` }).where(and(eq(participants.userId, userId), eq(participants.conversationId, conversationId))).returning();
  emitChat(await recipients(conversationId), 'message:read', { conversationId, userId, lastReadAt: participant.lastReadAt });
  return { lastReadAt: participant.lastReadAt };
}
export async function searchUsers(userId: number, query: string) {
  // Never list the whole directory: require a non-empty term before searching.
  const term = query.trim();
  if (!term) return [];
  const escaped = term.replace(/[\\%_]/g, '\\$&');
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(and(ne(users.id, userId), ilike(users.name, `%${escaped}%`))).orderBy(asc(users.name), asc(users.id)).limit(20);
  return rows.map(publicUser);
}
export async function listRequests(userId: number) {
  const rows = await db.select({ request: requests, sender: { id: users.id, name: users.name } }).from(requests).innerJoin(users, eq(users.id, requests.senderId)).where(and(eq(requests.recipientId, userId), eq(requests.status, 'pending'))).orderBy(desc(requests.createdAt));
  return rows.map(({ request, sender }) => ({ id: request.id, sender: publicUser(sender), status: request.status, createdAt: request.createdAt }));
}
async function insertRequest(tx: Transaction, senderId: number, recipientId: number) {
  await pairLock(tx, senderId, recipientId);
  const [conversation] = await tx.select().from(conversations).where(eq(conversations.pairKey, pair(senderId, recipientId)));
  if (conversation) return null;
  const [existing] = await tx.select().from(requests).where(and(eq(requests.pairKey, pair(senderId, recipientId)), eq(requests.status, 'pending')));
  if (existing) return existing;
  const [request] = await tx.insert(requests).values({ pairKey: pair(senderId, recipientId), senderId, recipientId }).returning();
  return request;
}
async function notifyRequest(request: typeof requests.$inferSelect | null) {
  if (!request) return;
  const [sender] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, request.senderId));
  emitChat([request.recipientId], 'chat_request:new', { request: { id: request.id, sender: publicUser(sender), status: request.status, createdAt: request.createdAt } });
}
export async function sendRequest(userId: number, recipientId: number) {
  await validateRecipient(userId, recipientId);
  const request = await db.transaction(tx => insertRequest(tx, userId, recipientId));
  await notifyRequest(request);
  return { success: true };
}
export async function respondToRequest(userId: number, requestId: string, accept: boolean) {
  const result = await db.transaction(async tx => {
    // Lock canonical pair first, keeping lock ordering consistent with all creation paths.
    const [initial] = await tx.select().from(requests).where(and(eq(requests.id, requestId), eq(requests.recipientId, userId)));
    if (!initial) throw HttpError.notFound('Request not found');
    await pairLock(tx, initial.senderId, userId);
    const [request] = await tx.select().from(requests).where(eq(requests.id, requestId)).for('update');
    if (request.status !== 'pending') throw HttpError.conflict('Request already resolved');
    await tx.update(requests).set({ status: accept ? 'accepted' : 'declined', updatedAt: new Date() }).where(eq(requests.id, requestId));
    const conversation = accept ? await ensureConversation(tx, request.senderId, userId) : null;
    return { request, conversation };
  });
  const ids = [userId, result.request.senderId];
  emitChat(ids, accept ? 'chat_request:accepted' : 'chat_request:declined', { requestId, ...(result.conversation ? { conversationId: result.conversation.id } : {}) });
  if (result.conversation) {
    emitChat(ids, 'conversation:created', { conversationId: result.conversation.id });
    return (await listConversations(userId)).find(c => c.id === result.conversation!.id)!;
  }
  return { success: true };
}
export async function inviteByEmail(userId: number, email: string) {
  // Always persist the same record and return the same response, regardless of account existence.
  await db.insert(invitations).values({ senderId: userId, email }).onConflictDoNothing();
  const [recipient] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (recipient) await claimInvitations(recipient.id, email);
  return { success: true };
}
export async function claimInvitations(userId: number, email: string) {
  const pending = await db.select().from(invitations).where(and(eq(invitations.email, email), eq(invitations.status, 'pending')));
  for (const invitation of pending) {
    const request = await db.transaction(async tx => {
      const request = invitation.senderId === userId ? null : await insertRequest(tx, invitation.senderId, userId);
      await tx.update(invitations).set({ status: 'claimed' }).where(eq(invitations.id, invitation.id));
      return request;
    });
    await notifyRequest(request);
  }
}
