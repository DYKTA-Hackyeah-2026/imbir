# Floating user chat

Chat uses the existing bearer JWT authentication and PostgreSQL/Drizzle database. It is separate from the AI assistant. Apply the generated migrations with `npm run db:migrate` before deploying the backend, then deploy the frontend. No external messaging broker or email service is required.

The floating launcher is mounted at the application root and keeps its state across navigation. Guests see a sign-in prompt; authenticated users get their conversations and requests. Its badge combines unread incoming messages and pending requests. One-to-one conversations have a unique ordered participant pair; requests also coalesce by pair. Message retries use a client-generated UUID, preventing duplicate persistence after a lost HTTP response.

## HTTP API

All routes below start with `/api/v1/chat`, require `Authorization: Bearer <accessToken>`, and return `{ "data": ... }`. Conversation and request identifiers are UUIDs; user identifiers are integers. Authorization is checked server-side on every operation.

| Method and route | Input | Result |
| --- | --- | --- |
| `GET /users?q=...` | Public name search | Public user IDs/names; no email directory |
| `GET /conversations` | — | Conversations, latest message, unread count, other participant |
| `POST /conversations` | `{ recipientId }` | Existing or new direct conversation |
| `GET /conversations/:id/messages` | Optional `before` message UUID | `{ messages, hasMore }`, chronological page |
| `POST /conversations/:id/messages` | `{ content, clientMessageId }` | Persisted message; identical retries return the same message |
| `POST /conversations/:id/read` | `{ messageId }` | Advances read state through an actually displayed message |
| `GET /requests` | — | Incoming pending chat requests |
| `POST /requests` | `{ recipientId }` | Pending chat request |
| `POST /requests/:id/accept` | — | Creates or activates the conversation |
| `POST /requests/:id/decline` | — | Removes the request from pending state |
| `POST /invitations` | `{ email }` | Same acknowledgement for registered and unregistered emails |
| `POST /ws-ticket` | — | `{ ticket, expiresAt }` for one WebSocket upgrade |

Invitations are stored, not emailed. For a registered recipient, the invitation creates a request. For an unregistered email, registration attaches the stored invitation to the new account and creates one request. The acknowledgement does not reveal which case occurred.

## Real-time transport

First obtain a short-lived, single-use ticket through the authenticated HTTP endpoint, then connect to `ws(s)://<same-host>/api/v1/chat/ws?ticket=<ticket>`. Access tokens never appear in the WebSocket URL. The server chooses the authenticated user's event channel; clients cannot subscribe to other users or arbitrary conversations. Events are JSON `{ type, payload }` envelopes:

- `message:new`: `{ message }`
- `message:read`: `{ conversationId, userId, lastReadAt }`
- `chat_request:new`: `{ request }`
- `chat_request:accepted`: `{ requestId, conversationId }`
- `chat_request:declined`: `{ requestId }`
- `conversation:created`: `{ conversationId }`

Writes use HTTP; events are emitted after database persistence. The frontend reconnects with a fresh ticket and refetches conversations, requests, and selected message history, recovering events missed during disconnection. PostgreSQL remains the source of truth.

The event registry and tickets are process-local. Deploy a single backend instance for this architecture. Multiple replicas require routing a user's HTTP writes and WebSocket connection to the same process, or a shared event bus/ticket store added deliberately. Do not log WebSocket query strings: tickets are short-lived credentials.

The frontend's Vite proxy enables WebSockets for `/api/v1`. The production nginx template has a dedicated `/api/v1/chat` block with HTTP/1.1, `Upgrade`/`Connection` headers, disabled buffering, and a long read timeout. Any additional reverse proxy must preserve these upgrades. Use HTTPS/WSS in production and keep `BACKEND_URL` pointed at the deployed backend.

## Verification

Use an isolated local PostgreSQL database and local backend; the script refuses remote hosts. From `backend`, run:

```sh
npx tsx scripts/chat-e2e.ts http://127.0.0.1:4000
```

It registers uniquely named test accounts and checks authenticated sockets, ticket reuse rejection, request acceptance/decline, direct conversation deduplication under concurrency, bidirectional real-time messaging, persistence, unread/read state, sender spoofing and outsider authorization, retry idempotency, offline recovery, email privacy, and invitation attachment on registration. The test accounts remain in the isolated database; discard that database after the run.

Also verify the floating UI at desktop and mobile widths: navigation/scroll keeps the launcher fixed, minimize preserves selection/drafts, long history scrolls inside the panel, new messages update the closed launcher badge, Enter sends, Shift+Enter adds a line, and empty/loading/error/reconnecting states stay usable.
