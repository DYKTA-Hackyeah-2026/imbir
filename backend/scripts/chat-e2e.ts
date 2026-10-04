/** Real HTTP/WebSocket integration checks. Run only against an isolated local test database. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4000');
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Refusing to create test accounts on a remote server');
const prefix = `chat-e2e-${randomUUID()}`;
type User = { token: string; id: number; email: string; name: string };
type Event = { type: string; payload: Record<string, any> };
const sockets: WebSocket[] = [];
let checks = 0;

async function request(method: string, path: string, token?: string, body?: unknown, status = 200) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(result)}`);
  return result;
}
const chat = (path: string) => `/api/v1/chat${path}`;
async function register(suffix: string): Promise<User> {
  const email = `${prefix}-${suffix}@example.com`;
  const name = `Tester ${suffix}`;
  const result = await request('POST', '/auth/register', undefined, { name, email, password: 'ChatTest123!' }, 201);
  assert.equal(result.user.name, name, 'register must echo the chosen name');
  return { token: result.accessToken, id: Number(result.user.id), email, name };
}
function check(label: string, condition: unknown) { assert(condition, label); checks++; console.log(`PASS ${label}`); }

async function connect(user: User) {
  const { data } = await request('POST', chat('/ws-ticket'), user.token, {});
  const url = new URL(chat('/ws'), base);
  url.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('ticket', data.ticket);
  const socket = new WebSocket(url);
  sockets.push(socket);
  const events: Event[] = [];
  socket.on('message', (raw) => events.push(JSON.parse(raw.toString())));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5_000);
    socket.once('open', () => { clearTimeout(timer); resolve(); });
    socket.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
  return {
    socket, events, url,
    async event(type: string, predicate: (payload: Event['payload']) => boolean = () => true) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const event = events.find((item) => item.type === type && predicate(item.payload));
        if (event) return event;
        await delay(50);
      }
      throw new Error(`Missing ${type} event. Received types: ${events.map((event) => event.type).join(', ')}`);
    },
  };
}
async function rejectedSocket(url: URL) {
  const socket = new WebSocket(url);
  sockets.push(socket);
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(new Error('Rejected socket timeout')); }, 5_000);
    socket.once('unexpected-response', (_req, response) => { clearTimeout(timer); response.resume(); socket.terminate(); resolve(response.statusCode!); });
    socket.once('open', () => { clearTimeout(timer); socket.close(); reject(new Error('Unauthorized socket opened')); });
    socket.on('error', () => {});
  });
}

try {
  const [a, b, outsider] = await Promise.all([register('a'), register('b'), register('outsider')]);
  const [sa, sb, sc] = await Promise.all([connect(a), connect(b), connect(outsider)]);
  check('GET /auth/me exposes the chosen name', (await request('GET', '/auth/me', a.token)).user.name === a.name);
  const loggedIn = await request('POST', '/auth/login', undefined, { email: a.email, password: 'ChatTest123!' });
  check('Login response exposes the chosen name', loggedIn.user.name === a.name);
  check('WebSocket tickets are single use', await rejectedSocket(sb.url) === 401);
  const badSocket = new URL(chat('/ws?ticket=invalid'), base); badSocket.protocol = 'ws:';
  check('Unauthenticated WebSocket rejected', await rejectedSocket(badSocket) === 401);
  await request('GET', chat('/conversations'), undefined, undefined, 401);

  await request('POST', chat('/requests'), a.token, { recipientId: b.id });
  const pending = (await request('GET', chat('/requests'), b.token)).data;
  const requestId = pending.find((item: any) => item.sender.id === a.id)?.id;
  check('Request persisted and delivered in real time', requestId && (await sb.event('chat_request:new')).payload.request.id === requestId);
  check('Chat exposes the registered username to the other participant', (await sb.event('chat_request:new')).payload.request.sender.name === a.name);
  await request('POST', chat('/requests'), a.token, { recipientId: b.id });
  check('Duplicate requests coalesce', (await request('GET', chat('/requests'), b.token)).data.length === 1);
  await request('POST', chat(`/requests/${requestId}/accept`), outsider.token, {}, 404);
  await request('POST', chat(`/requests/${requestId}/decline`), outsider.token, {}, 404);
  const accepted = (await request('POST', chat(`/requests/${requestId}/accept`), b.token, {})).data;
  const conversationId = accepted.id;
  check('Accept creates conversation and notifies requester', conversationId && (await sa.event('chat_request:accepted')).payload.conversationId === conversationId);
  check('Accepted request removed from pending list', (await request('GET', chat('/requests'), b.token)).data.length === 0);
  const direct = await Promise.all(Array.from({ length: 4 }, () => request('POST', chat('/conversations'), a.token, { recipientId: b.id })));
  check('Concurrent direct creation never duplicates conversation', direct.every((item) => item.data.id === conversationId) && (await request('GET', chat('/conversations'), a.token)).data.length === 1);

  const clientMessageId = randomUUID();
  await request('POST', chat(`/conversations/${conversationId}/messages`), a.token, { content: 'Hello in real time', clientMessageId, senderId: outsider.id }, 422);
  const message = (await request('POST', chat(`/conversations/${conversationId}/messages`), a.token, { content: 'Hello in real time', clientMessageId })).data;
  check('Authenticated sender cannot be spoofed', message.senderId === a.id);
  check('Recipient receives persisted message immediately', (await sb.event('message:new', (event) => event.message.id === message.id)).payload.message.content === message.content);
  const beforeRead = (await request('GET', chat('/conversations'), b.token)).data.find((item: any) => item.id === conversationId);
  check('Closed chat has unread count', beforeRead.unreadCount === 1);
  const retry = (await request('POST', chat(`/conversations/${conversationId}/messages`), a.token, { content: message.content, clientMessageId })).data;
  check('Network retry is idempotent', retry.id === message.id);
  const history = (await request('GET', chat(`/conversations/${conversationId}/messages`), b.token)).data.messages;
  check('History persists across reload/refetch with timestamps', history.length === 1 && history[0].id === message.id && Number.isFinite(Date.parse(history[0].createdAt)));
  await request('POST', chat(`/conversations/${conversationId}/read`), b.token, { messageId: message.id });
  await sa.event('message:read', (event) => event.conversationId === conversationId && event.userId === b.id);
  check('Reading clears unread state', (await request('GET', chat('/conversations'), b.token)).data.find((item: any) => item.id === conversationId).unreadCount === 0);

  await request('GET', chat(`/conversations/${conversationId}/messages`), outsider.token, undefined, 404);
  await request('POST', chat(`/conversations/${conversationId}/messages`), outsider.token, { content: 'Intrusion', clientMessageId: randomUUID() }, 404);
  await request('POST', chat(`/conversations/${conversationId}/read`), outsider.token, { messageId: message.id }, 404);
  check('Outsider cannot read/send/mark messages or see conversation', (await request('GET', chat('/conversations'), outsider.token)).data.length === 0);
  await request('POST', chat(`/conversations/${conversationId}/messages`), a.token, { content: '   ', clientMessageId: randomUUID() }, 422);

  const reply = (await request('POST', chat(`/conversations/${conversationId}/messages`), b.token, { content: 'Reply', clientMessageId: randomUUID() })).data;
  await sa.event('message:new', (event) => event.message.id === reply.id);
  check('Messaging works in both directions', reply.senderId === b.id);
  sb.socket.close();
  await delay(100);
  const missed = (await request('POST', chat(`/conversations/${conversationId}/messages`), a.token, { content: 'While offline', clientMessageId: randomUUID() })).data;
  const reconnected = await connect(b);
  const recovered = (await request('GET', chat(`/conversations/${conversationId}/messages`), b.token)).data.messages;
  check('Reconnect recovers missed events without persisted duplicates', recovered.length === 3 && recovered.some((item: any) => item.id === missed.id) && new Set(recovered.map((item: any) => item.id)).size === 3);

  // Rapid writes exercise millisecond timestamp precision, cursor boundaries, and read races.
  const burst = [];
  for (let index = 0; index < 51; index++) {
    burst.push((await request('POST', chat(`/conversations/${conversationId}/messages`), (index % 2 ? b : a).token, { content: `History ${index}`, clientMessageId: randomUUID() })).data);
  }
  const newestPage = (await request('GET', chat(`/conversations/${conversationId}/messages`), b.token)).data;
  const olderPage = (await request('GET', chat(`/conversations/${conversationId}/messages?before=${newestPage.messages[0].id}`), b.token)).data;
  const allIds = [...olderPage.messages, ...newestPage.messages].map((item: any) => item.id);
  check('Message pagination has no gaps or duplicates during rapid writes', newestPage.hasMore && !olderPage.hasMore && allIds.length === 54 && new Set(allIds).size === 54);
  await request('POST', chat(`/conversations/${conversationId}/read`), b.token, { messageId: burst.at(-2).id });
  check('Reading an earlier message preserves newer unread messages', (await request('GET', chat('/conversations'), b.token)).data.find((item: any) => item.id === conversationId).unreadCount === 1);
  await request('POST', chat(`/conversations/${conversationId}/read`), b.token, { messageId: burst.at(-1).id });
  await request('POST', chat(`/conversations/${conversationId}/read`), b.token, { messageId: message.id });
  check('Delayed read receipts never regress read state', (await request('GET', chat('/conversations'), b.token)).data.find((item: any) => item.id === conversationId).unreadCount === 0);

  await request('POST', chat('/requests'), a.token, { recipientId: outsider.id });
  const declineId = (await request('GET', chat('/requests'), outsider.token)).data[0].id;
  await request('POST', chat(`/requests/${declineId}/decline`), outsider.token, {});
  await sa.event('chat_request:declined', (event) => event.requestId === declineId);
  check('Decline removes pending request and notifies sender', (await request('GET', chat('/requests'), outsider.token)).data.length === 0);

  const existingInvite = await request('POST', chat('/invitations'), outsider.token, { email: b.email });
  const unknownEmail = `${prefix}-invite@example.com`;
  const unknownInvite = await request('POST', chat('/invitations'), outsider.token, { email: unknownEmail });
  check('Email invitations do not expose registration status', JSON.stringify(existingInvite) === JSON.stringify(unknownInvite));
  await reconnected.event('chat_request:new', (event) => event.request.sender.id === outsider.id);
  await request('POST', chat('/invitations'), outsider.token, { email: unknownEmail });
  const invited = await register('invite');
  const invitedRequests = (await request('GET', chat('/requests'), invited.token)).data;
  check('Unknown-email invitation attaches once on registration', invitedRequests.length === 1 && invitedRequests[0].sender.id === outsider.id);
  await delay(100);
  check('WebSocket events are isolated to participants', !sc.events.some((event) => event.type === 'message:new'));
  console.log(`\n${checks} chat integration scenarios passed. Accounts use prefix ${prefix}.`);
} finally {
  for (const socket of sockets) socket.terminate();
}
