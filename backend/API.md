# Backend API ÔÇö Integration Guide

This document describes the complete HTTP API of the **backend** service. It is written for
frontend developers who have never seen the source code. After reading it you should be able to
configure a client (web app, mobile app, another service) to talk to this API.

There are **three independent surfaces**:

| Surface | Base path | Auth | Purpose |
|---------|-----------|------|---------|
| Health | `/health` | none | Liveness / readiness probes |
| Auth | `/auth` | Bearer access token (only `/auth/me`) | User accounts, sessions, password reset |
| LLM Cache | `/llm` | none (admin endpoints use a server-side token) | Chat completions through an external cache service, plus cache administration |

--- 

## Table of contents

1. [Base URL and how to run the API](#1-base-url-and-how-to-run-the-api)
2. [Conventions](#2-conventions)
3. [Authentication model (how you will use it)](#3-authentication-model)
4. [Error format](#4-error-format)
5. [Rate limiting](#5-rate-limiting)
6. [CORS](#6-cors)
7. [Health endpoints](#7-health-endpoints)
8. [Auth endpoints](#8-auth-endpoints)
9. [LLM Cache endpoints](#9-llm-cache-endpoints)
10. [Recommended frontend flows](#10-recommended-frontend-flows)
11. [Complete client example](#11-complete-client-example)
12. [Quick reference](#12-quick-reference)
13. [Content (knowledge base)](#13-content-knowledge-base)
14. [Contact](#14-contact)

---

## 1. Base URL and how to run the API

### Base URL

- Local development (no Docker): `http://localhost:4000`
- Local development (Docker, `docker compose -f docker-compose.dev.yml up`): `http://localhost:4000`
- Production: `https://<your-host>` (TLS is terminated by a reverse proxy).

Throughout this document, `{{BASE_URL}}` means the base URL of this backend
(for example `http://localhost:4000`). All paths below are appended to it:

```
{{BASE_URL}}/auth/login
{{BASE_URL}}/llm/chat/completions
```

### Running it yourself (for local testing)

```bash
# everything (Postgres + API + migrations) with Docker:
docker compose -f docker-compose.dev.yml up --build
# API is then at http://localhost:4000
```

There is also a browser-based tester at `http://localhost:4000/panel/` where you can click every
endpoint and inspect requests and responses.

---

## 2. Conventions

- **Transport:** HTTP/1.1 or HTTP/2. HTTPS in production.
- **Request bodies:** JSON, `Content-Type: application/json`. Max body size: **1 MB**.
- **Responses:** JSON, UTF-8. Every response has a `Content-Type: application/json` header, except:
  - `204 No Content` responses (no body at all ÔÇö important, see the flow examples),
  - static files under `/panel/`.
- **Field naming:** `camelCase` for all auth fields; the LLM admin surface passes through the
  upstream service's `snake_case` fields unchanged (documented per endpoint).
- **IDs:** UUID v4 strings, e.g. `"0f3c1a1e-7b2d-4a4a-9c2e-1a2b3c4d5e6f"`.
- **Timestamps:** ISO-8601 UTC strings, e.g. `"2026-10-03T12:34:56.789Z"`.
- **Trailing slashes:** not required. `/auth/login` and `/auth/login/` both work.
- **Unknown routes:** return `404` in the standard error envelope.

### Required headers cheat-sheet

| Header | When | Example |
|--------|------|---------|
| `Content-Type: application/json` | Any request with a JSON body | `application/json` |
| `Authorization: Bearer <accessToken>` | Protected endpoints (`/auth/me`) | `Bearer eyJhbGciOi...` |
| `x-cache-space: <name>` | Optional, on `/llm/chat/completions` | `default` |

---

## 3. Authentication model

The API uses **short-lived JWT access tokens** plus **long-lived refresh tokens**.

| Token | What it is | Lifetime (default) | Where to store it (recommended) |
|-------|-----------|--------------------|---------------------------------|
| `accessToken` | Signed JWT, sent as `Authorization: Bearer` | 900 s (15 min) | In memory (JS variable) |
| `refreshToken` | Opaque random string, used to get new tokens | 30 days | `httpOnly` cookie, or secure storage |

**How it works:**

1. The user **registers** or **logs in**. The response contains `accessToken`, `refreshToken`,
   `expiresIn` (seconds until the access token expires) and the `user`.
2. The client attaches `accessToken` to protected requests via the `Authorization` header.
3. When a request returns `401` because the access token expired, the client calls
   `POST /auth/refresh` with the `refreshToken`.
4. **Refresh rotates the token**: the old refresh token is invalidated and a **new** refresh token
   is returned. You must replace your stored refresh token with the new one every time.
5. To end the session, call `POST /auth/logout` with the current refresh token.

> There is no server-side logout for access tokens. An access token stays valid until it expires
> (max 15 minutes by default). Logging out only revokes the refresh token, so the user cannot mint
> new access tokens. This is normal and expected.

### What the frontend must persist

| Value | Persist? | Notes |
|-------|----------|-------|
| `accessToken` | Optional | Can live in memory only; re-fetch via refresh on page reload. |
| `refreshToken` | **Yes** | Needed to stay logged in across reloads. Store securely. |
| `user.id`, `user.email` | Optional | Convenience only; you can re-fetch with `GET /auth/me`. |
| `expiresIn` | Optional | Use to schedule a proactive refresh before expiry. |

---

## 4. Error format

Every error from the auth and health surfaces (and any non-LLM route) uses this envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "path": "password", "message": "Password must contain a digit" }
    ]
  }
}
```

- `code` ÔÇö stable, machine-readable string. **Branch on this, not on `message`.**
- `message` ÔÇö human-readable; may change. Do not show raw messages to end users without review.
- `details` ÔÇö optional; present for `VALIDATION_ERROR` (array of field errors) and sometimes
  `INTERNAL_SERVER_ERROR`.

### Error codes

| `code` | HTTP | Meaning | Typical cause |
|--------|------|---------|---------------|
| `BAD_REQUEST` | 400 | Malformed request | Invalid JSON body, bad query param |
| `UNAUTHORIZED` | 401 | Missing/invalid credentials | No/expired token, wrong password |
| `FORBIDDEN` | 403 | Authenticated but not allowed | (Reserved; not currently returned) |
| `NOT_FOUND` | 404 | Unknown route or resource | Wrong URL, missing user |
| `CONFLICT` | 409 | Resource already exists | Registering a taken email |
| `VALIDATION_ERROR` | 422 | Body failed schema validation | Weak password, bad email |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded | Too many auth attempts |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error | Bug, DB/downstream failure |

> **Important:** validation errors use **`422`**, not `400`. JSON parse errors use `400`.

### LLM surface error format

The `/llm/chat/completions` endpoint **passes the external cache service's response through
verbatim**, including its status code and body. Those bodies follow the upstream service's own
shape (often `{ "error": { "message": ... } }` or `{ "error": "code" }`), not the envelope above.

Our own `/llm` endpoints (the admin ones) forward the upstream admin error shape too, e.g.:

```json
{ "error": "unauthorized", "message": "Valid admin token required" }
```

If our backend cannot reach the cache service, it returns:

```json
{ "error": { "code": "INTERNAL_SERVER_ERROR", "message": "LLM cache unreachable: <reason>" } }
```
with HTTP `502`.

---

## 5. Rate limiting

Rate limits apply to auth endpoints only. Exceeding a limit returns HTTP `429` with code
`TOO_MANY_REQUESTS`.

| Scope | Endpoints | Limit |
|-------|-----------|-------|
| General auth | `POST /auth/register`, `/refresh`, `/logout` | 60 requests / 15 min / IP |
| Sensitive auth | `POST /auth/login`, `/forgot-password`, `/reset-password` | 10 **failed** requests / 15 min / IP |

Notes:
- The "sensitive" limiter counts **only unsuccessful** requests (`skipSuccessfulRequests`), so normal
  logins do not consume the budget.
- When `TRUST_PROXY=true` (production behind a proxy), limits are per real client IP from
  `X-Forwarded-For`.
- Standard `RateLimit-*` headers are returned.

**Frontend advice:** on `429`, back off and show a "too many attempts, try again later" message.
Do not retry immediately in a loop.

---

## 6. CORS

CORS is controlled by the backend env var `CORS_ORIGINS` (comma-separated list of allowed origins).

- **If `CORS_ORIGINS` is set:** only those exact origins are allowed. Requests from other origins do
  not receive an `Access-Control-Allow-Origin` header and will be blocked by the browser.
- **If `CORS_ORIGINS` is empty:**
  - in **development** the request origin is reflected (any origin allowed),
  - in **production** cross-origin browser requests are **rejected**.

`Access-Control-Allow-Credentials: true` is always sent for allowed origins.

The example env files ship with `CORS_ORIGINS=http://localhost:5173`, so by default only
`http://localhost:5173` can call the API from a browser. If your frontend runs on a different
origin, the backend operator must add it, e.g.:

```
CORS_ORIGINS=https://app.example.com,https://admin.example.com
```

### Reading response headers like `x-cache`

By default the browser can only read a small set of "safe" response headers. The `x-cache`,
`x-cache-space`, and `x-cache-model` headers from `/llm/chat/completions` are **not** readable in
the browser unless the backend adds an `Access-Control-Expose-Headers` directive. The current
backend does **not** set it, so:

- for browser frontends, treat `res.headers.get("x-cache")` as possibly `null` (code defensively),
- for server-side/Node clients, the headers are always available.

If you need these headers in a browser, ask the backend operator to expose them (one-line change to
the CORS config).

Since auth uses tokens in headers (not cookies), you do **not** need `credentials: 'include'` unless
you choose to store the refresh token in a cookie yourself.

---

## 7. Health endpoints

### `GET /health` ÔÇö liveness

Returns `200` if the process is running. Does **not** check the database.

**Response `200`:**

```json
{ "status": "ok", "env": "development", "uptime": 123.45 }
```

| Field | Type | Meaning |
|-------|------|---------|
| `status` | string | Always `"ok"` |
| `env` | string | `development` \| `production` \| `test` |
| `uptime` | number | Seconds since process start |

### `GET /health/ready` ÔÇö readiness

Returns `200` if the database is reachable, otherwise `503`.

**Response `200`:**

```json
{ "status": "ok", "database": "up" }
```

**Response `503`:**

```json
{ "status": "unavailable", "database": "down" }
```

Use `/health/ready` for load-balancer readiness probes and to show a "backend unavailable" banner.

---

## 8. Auth endpoints

Base path: `/auth`.

### 8.1 `POST /auth/register`

Creates an account and immediately returns a logged-in session (tokens).

**Request body:**

```json
{ "email": "user@example.com", "password": "Passw0rd!" }
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Valid email, max 320 chars. Trimmed and lowercased by the server. |
| `password` | string | 8ÔÇô64 chars; must contain a lowercase letter, an uppercase letter, and a digit; ÔëĄ 72 UTF-8 bytes. |

**Response `201 Created`:**

```json
{
  "user": { "id": "<uuid>", "email": "user@example.com", "createdAt": "2026-10-03T12:34:56.789Z" },
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "expiresIn": 900
}
```

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `409` | `CONFLICT` | Email already registered |
| `422` | `VALIDATION_ERROR` | Invalid email or weak password (`details` explains each field) |

**Example:**

```bash
curl -X POST {{BASE_URL}}/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

> Note: emails are normalized. `"USER@Example.com "` becomes `"user@example.com"`.

---

### 8.2 `POST /auth/login`

Exchanges credentials for tokens.

**Request body:**

```json
{ "email": "user@example.com", "password": "Passw0rd!" }
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Valid email, max 320 chars (normalized). |
| `password` | string | 1ÔÇô64 chars. |

**Response `200 OK`:** same shape as register (see ┬ž8.1).

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHORIZED` | Wrong email **or** wrong password (message is always `Invalid email or password`, so attackers cannot tell if an account exists) |
| `422` | `VALIDATION_ERROR` | Missing/malformed fields |

```bash
curl -X POST {{BASE_URL}}/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

---

### 8.3 `POST /auth/refresh`

Rotates the refresh token and returns a fresh token pair.

**Request body:**

```json
{ "refreshToken": "<opaque refresh token>" }
```

**Response `200 OK`:** same shape as register. The response contains a **new `refreshToken`**; the
one you sent is now revoked. Persist the new one.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHORIZED` | Token unknown, expired, revoked, or already rotated |

```bash
curl -X POST {{BASE_URL}}/auth/refresh \
  -H 'content-type: application/json' \
  -d '{"refreshToken":"<token>"}'
```

**Frontend behavior on `401` here:** treat this as "session expired". Clear stored tokens and send
the user to the login screen.

---

### 8.4 `POST /auth/logout`

Revokes a refresh token. Idempotent: logging out an already-revoked/unknown token still succeeds.

**Request body:**

```json
{ "refreshToken": "<opaque refresh token>" }
```

**Response `204 No Content`** ÔÇö **no body.** Do not attempt to `JSON.parse` it.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `422` | `VALIDATION_ERROR` | Missing `refreshToken` |

```bash
curl -i -X POST {{BASE_URL}}/auth/logout \
  -H 'content-type: application/json' \
  -d '{"refreshToken":"<token>"}'
```

**Frontend behavior:** clear stored tokens regardless of the result (even 422), then show logged-out
state.

---

### 8.5 `GET /auth/me`

Returns the currently authenticated user.

**Headers:** `Authorization: Bearer <accessToken>` (**required**)

**Response `200 OK`:**

```json
{ "user": { "id": "<uuid>", "email": "user@example.com", "createdAt": "2026-10-03T12:34:56.789Z" } }
```

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHORIZED` | Header missing/malformed, or token invalid/expired |
| `404` | `NOT_FOUND` | Token valid but the user no longer exists (e.g. deleted account) |

```bash
curl {{BASE_URL}}/auth/me -H "authorization: Bearer <accessToken>"
```

---

### 8.6 `POST /auth/forgot-password`

Starts the password-reset flow. **Always** responds `202`, whether or not the email exists. This is
intentional (prevents account enumeration). Do not branch UI behavior on the result.

**Request body:**

```json
{ "email": "user@example.com" }
```

**Response `202 Accepted`:**

```json
{ "message": "If an account with that email exists, a password reset link has been sent." }
```

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `422` | `VALIDATION_ERROR` | Invalid email format |

**What happens behind the scenes:** the server creates a single-use, time-limited reset token and
emails a link to `{{APP_BASE_URL}}/reset-password?token=<token>`.

> ÔÜá´ŞĆ **Current implementation note for integrators:** emails are a *console stub* ÔÇö the reset link
> is written to the API server logs, not actually emailed. In local dev you can read it with:
>
> ```bash
> docker compose -f docker-compose.dev.yml logs api | grep reset-password
> ```
>
> A real SMTP/provider integration is not yet wired up. The frontend contract does not change when
> it is. Your reset-password **page** must read the `token` query parameter from the URL and send it
> to ┬ž8.7.

```bash
curl -X POST {{BASE_URL}}/auth/forgot-password \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com"}'
```

---

### 8.7 `POST /auth/reset-password`

Completes the reset using the token from the email link.

**Request body:**

```json
{ "token": "<token from the reset link>", "password": "NewPassw0rd!" }
```

| Field | Type | Rules |
|-------|------|-------|
| `token` | string | 1ÔÇô512 chars; the value of the `token` query param in the reset link |
| `password` | string | Same rules as registration (┬ž8.1) |

**Response `204 No Content`** ÔÇö **no body.**

**Side effects:** the reset token is consumed (single use) and **all of the user's refresh tokens are
revoked**, so every existing session must log in again.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `400` | `BAD_REQUEST` | Token invalid, expired, or already used |
| `422` | `VALIDATION_ERROR` | Weak password / missing fields |

```bash
curl -i -X POST {{BASE_URL}}/auth/reset-password \
  -H 'content-type: application/json' \
  -d '{"token":"<token>","password":"NewPassw0rd!"}'
```

**Frontend behavior:** after `204`, redirect to login and tell the user to sign in with the new
password.

---

## 9. LLM Cache endpoints

Base path: `/llm`. This backend is a **thin client** of an external LLM cache service. These
endpoints forward to that service and relay its responses.

- No API key is needed from the frontend for **chat** or **models**.
- The **admin** endpoints under `/llm/admin/*` require the backend to hold the service's admin token
  (configured server-side). The frontend does **not** send any admin token.
- Upstream status codes and bodies are passed through unchanged.

### 9.1 `GET /llm/health`

Liveness of the external cache service.

**Response `200` (example):**

```json
{ "status": "ok", "uptime": 3255.18, "timestamp": "2026-10-03T12:42:27.902Z" }
```

If the backend cannot reach the service, you get `502` with the standard error envelope.

---

### 9.2 `GET /llm/models`

Returns the upstream model catalog (OpenAI/OpenRouter-compatible shape).

**Response `200` (abridged):**

```json
{
  "data": [
    {
      "id": "inclusionai/ling-3.1-flash",
      "name": "inclusionAI: Ling 3.1 Flash",
      "context_length": 262144,
      "pricing": { "prompt": "0", "completion": "0" }
    }
  ]
}
```

Use `data[].id` as the `model` value in chat requests.

---

### 9.3 `POST /llm/chat/completions`

Cached OpenAI/OpenRouter-compatible chat completion. **This is the main endpoint for chat UIs.**

**Headers:**

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | yes | `application/json` |
| `x-cache-space` | no | Namespace, e.g. `default`. Omit to use the service's default space. |

**Request body:** standard OpenAI chat-completions body.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `model` | string | no | If omitted, the service's default model is used. A server-side *forced* model overrides whatever you send. |
| `messages` | array | yes | Each item has `role` (`system`\|`user`\|`assistant`\|`tool`\|`developer`) and `content` (string or content-parts array). |
| `stream` | boolean | no | If `true`, the request bypasses the cache (see response headers). |
| `temperature`, `max_tokens`, `tools`, ... | any | no | Forwarded to the upstream provider. |

```json
{
  "model": "inclusionai/ling-3.1-flash",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Say hi in one word." }
  ]
}
```

**Response headers (always present on proxied responses):**

| Header | Values | Meaning |
|--------|--------|---------|
| `x-cache` | `HIT` | Served from cache; upstream not called |
| | `MISS` | Upstream called; response stored (or upstream error) |
| | `BYPASS-PAUSED` | The space is paused; cache bypassed |
| | `BYPASS-STREAM` | `stream: true`; passthrough, not cached |
| | `NO-SPACE` | No matching space; passthrough only |
| `x-cache-space` | space name or `none` | Space actually used |
| `x-cache-model` | model id | Model actually sent upstream |

**Response body `200`:** standard OpenAI completion:

```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1791030861,
  "model": "inclusionai/ling-3.1-flash",
  "choices": [
    { "index": 0, "message": { "role": "assistant", "content": "Hi" }, "finish_reason": "stop" }
  ],
  "usage": { "prompt_tokens": 12, "completion_tokens": 1, "total_tokens": 13 }
}
```

**Errors:** whatever the upstream returns, relayed as-is. Common:
`401 { "error": { "message": "User not found.", "code": 401 } }` means the **cache service's own
upstream provider credentials** are misconfigured ÔÇö this is a backend/ops issue, not a frontend bug.
Surface it as a generic "chat is temporarily unavailable" message.

**Caching rules (informational):**

- Only `POST /v1/chat/completions` is cached (i.e. this endpoint).
- `stream: true` is never read from or written to cache.
- The cache key is derived from the request body (ignoring `stream`/`stream_options`) plus the
  resolved model. Identical requests Ôćĺ `HIT`.
- Only successful (2xx) upstream responses are stored.

```bash
# MISS (first time), then HIT (repeat)
curl -D - {{BASE_URL}}/llm/chat/completions \
  -H 'content-type: application/json' \
  -H 'x-cache-space: default' \
  -d '{"messages":[{"role":"user","content":"Say hi in one word."}]}'
```

> **Frontend advice:** read `x-cache` from the response headers if you want to display whether a
> reply was cached. Note that a browser `fetch` can only read these headers if the backend exposes
> them via CORS (`Access-Control-Expose-Headers`). If you need them and cannot read them, ask the
> backend operator to add them.

---

### 9.4 Admin endpoints under `/llm/admin/*`

These forward to the cache service's Admin API. Response bodies use the **service's** shapes
(`snake_case`, `{ "error": "code" }`). They are intended for dashboards/ops tooling, not for end
users. If the backend has no admin token configured, every call returns `500`:

```json
{ "error": { "code": "INTERNAL_SERVER_ERROR", "message": "LLM_CACHE_ADMIN_TOKEN is not configured" } }
```

| Method | Path | Body / query | Returns |
|--------|------|--------------|---------|
| GET | `/llm/admin/overview` | ÔÇö | Stats, spaces, settings, 24h events, effective config |
| GET | `/llm/admin/spaces` | ÔÇö | Array of spaces |
| POST | `/llm/admin/spaces` | `{ "name", "description"?, "isDefault"? }` | Created space |
| PATCH | `/llm/admin/spaces/:id` | `{ "name"?, "description"?, "status"? }` | Updated space |
| POST | `/llm/admin/spaces/:id/pause` | ÔÇö | Updated space (paused) |
| POST | `/llm/admin/spaces/:id/resume` | ÔÇö | Updated space (active) |
| POST | `/llm/admin/spaces/:id/default` | ÔÇö | Updated space (default) |
| POST | `/llm/admin/spaces/:id/move` | `{ "targetId" }` or `{ "targetName" }` | `{ "moved", "dropped" }` |
| DELETE | `/llm/admin/spaces/:id` | ÔÇö | `{ "ok": true }` |
| GET | `/llm/admin/settings` | ÔÇö | Settings map |
| PUT | `/llm/admin/settings` | `{ "default_model"?, "force_model"?, "cache_ttl_seconds"?, "upstream_base_url"? }` | Settings map |
| GET | `/llm/admin/entries` | `?spaceId=&limit=ÔëĄ200&offset=` | `{ "rows", "total" }` |
| DELETE | `/llm/admin/entries/:id` | ÔÇö | `{ "ok": true }` |
| POST | `/llm/admin/cache/purge` | `{ "spaceId" }` or `{ "expired": true }` | `{ "removed" }` |

**Space object (example):**

```json
{
  "id": "<uuid>",
  "name": "default",
  "description": "Automatically created default cache space",
  "status": "active",
  "isDefault": true,
  "createdAt": "2026-10-03T11:38:48.143Z",
  "updatedAt": "2026-10-03T11:42:44.569Z",
  "entries": 0,
  "hits": 0
}
```

**Overview object (example, abridged):**

```json
{
  "spaces": [ /* Space[] */ ],
  "settings": {
    "default_model": "inclusionai/ling-3.1-flash",
    "force_model": null,
    "cache_ttl_seconds": 0,
    "upstream_base_url": "https://openrouter.ai/api/v1"
  },
  "totals": { "entries": 0, "hits": 0, "tokens": 0 },
  "eventsLast24h": { "hit": 0, "miss": 0, "store": 0 },
  "effective": {
    "model": "inclusionai/ling-3.1-flash",
    "forcedModel": null,
    "ttlSeconds": 0,
    "upstreamBaseUrl": "https://openrouter.ai/api/v1"
  }
}
```

**Admin error codes (from the service):**

| Status | Body | When |
|--------|------|------|
| `400` | `{ "error": "invalid_body", "issues": {...} }` | Validation failed |
| `400` | `{ "error": "cannot_delete_last_space" }` | Deleting the only space |
| `400` | `{ "error": "provide spaceId or expired:true" }` | Purge without target |
| `401` | `{ "error": "unauthorized", ... }` | Backend's admin token rejected |
| `404` | `{ "error": "not_found", "path": "..." }` | Unknown admin route |
| `409` | `{ "error": "name_taken" }` | Duplicate space name |
| `500` | `{ "error": "internal_error", "message": "..." }` | Unhandled error |

```bash
curl {{BASE_URL}}/llm/admin/overview
curl -X POST {{BASE_URL}}/llm/admin/spaces \
  -H 'content-type: application/json' \
  -d '{"name":"experiment-a","description":"A/B test"}'
curl -X POST {{BASE_URL}}/llm/admin/cache/purge \
  -H 'content-type: application/json' \
  -d '{"expired":true}'
```

---

## 10. Recommended frontend flows

### 10.1 Register

```
POST /auth/register {email, password}
  Ôćĺ 201: store accessToken + refreshToken, go to app
  Ôćĺ 409: show "email already in use"
  Ôćĺ 422: show field errors from error.details
```

### 10.2 Login

```
POST /auth/login {email, password}
  Ôćĺ 200: store accessToken + refreshToken, go to app
  Ôćĺ 401: show "invalid email or password"
  Ôćĺ 429: show "too many attempts, try later"
```

### 10.3 Authenticated request with automatic refresh

```
function apiFetch(path, options):
  attach Authorization: Bearer accessToken
  response = fetch(...)
  if response.status == 401:
     refreshed = POST /auth/refresh { refreshToken }
     if refreshed.ok:
        store new accessToken + new refreshToken   # rotation!
        retry the original request once
     else:
        clear tokens, redirect to login
```

### 10.4 Logout

```
POST /auth/logout { refreshToken }   # 204, no body
clear stored tokens, redirect to login
```

### 10.5 Forgot / reset password

```
Step 1 - user enters email:
  POST /auth/forgot-password {email}
   Ôćĺ always 202: show "if the account exists, we sent an email"

Step 2 - user opens the link {{APP_BASE_URL}}/reset-password?token=...
  read `token` from the URL query string
  user enters a new password
  POST /auth/reset-password {token, password}
   Ôćĺ 204: redirect to login ("password changed, please sign in")
   Ôćĺ 400: show "link invalid or expired, request a new one"
   Ôćĺ 422: show password rule errors
```

### 10.6 Chat

```
POST /llm/chat/completions
  headers: { content-type, x-cache-space: "default" }
  body: { model?, messages: [...] }
   Ôćĺ 200: read response.choices[0].message.content; optionally read x-cache header
   Ôćĺ others: show generic "chat unavailable"; log body for debugging
```

---

## 11. Complete client example

A minimal, dependency-free TypeScript client. Copy-paste ready.

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem("refreshToken");

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "UNKNOWN";
  let message = res.statusText;
  let details: unknown;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? body.error ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, String(code), message, details);
}

/** Core request helper with automatic refresh-once on 401. */
async function api(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry && refreshToken && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) return api(path, options, false);
  }
  return res;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    logoutLocal();
    return false;
  }
  const data = await res.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken; // rotation: always replace
  localStorage.setItem("refreshToken", refreshToken!);
  return true;
}

function logoutLocal() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("refreshToken");
}

// ---- Auth API ----

export async function register(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  localStorage.setItem("refreshToken", data.refreshToken);
  return data.user;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  localStorage.setItem("refreshToken", data.refreshToken);
  return data.user;
}

export async function me() {
  const res = await api("/auth/me");
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  return data.user;
}

export async function logout() {
  if (refreshToken) {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  logoutLocal();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await parseError(res);
}

export async function resetPassword(token: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) throw await parseError(res); // 204 has no body
}

// ---- LLM API ----

export async function chat(
  messages: { role: string; content: string }[],
  opts: { model?: string; space?: string } = {},
) {
  const res = await fetch(`${BASE_URL}/llm/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(opts.space ? { "x-cache-space": opts.space } : {}),
    },
    body: JSON.stringify({ ...(opts.model ? { model: opts.model } : {}), messages }),
  });
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    cache: res.headers.get("x-cache"), // may be null depending on CORS config
    raw: data,
  };
}

export async function listModels() {
  const res = await fetch(`${BASE_URL}/llm/models`);
  if (!res.ok) throw await parseError(res);
  return (await res.json()).data ?? [];
}
```

### Browser notes

- **401 handling:** the example retries once after refreshing. Because the refresh token **rotates**,
  serialize concurrent refreshes (e.g. a single in-flight promise) to avoid invalidating tokens
  twice. A simple mutex/queue around `refreshSession()` is recommended if you fire many parallel
  requests.
- **On reload:** call `refreshSession()` using the stored refresh token to obtain a fresh access
  token; if it fails, show the login screen.
- **Don't store tokens in `localStorage` if you can avoid it** for high-security apps; prefer a
  `httpOnly` cookie for the refresh token (requires backend/cookie changes). The current API returns
  the refresh token in the JSON body, so `localStorage` is the simplest option.

---

## 12. Quick reference

### Auth

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/auth/register` | ÔÇö | `{email, password}` | `201` tokens + user |
| POST | `/auth/login` | ÔÇö | `{email, password}` | `200` tokens + user |
| POST | `/auth/refresh` | ÔÇö | `{refreshToken}` | `200` tokens + user (rotates) |
| POST | `/auth/logout` | ÔÇö | `{refreshToken}` | `204` (no body) |
| GET | `/auth/me` | Bearer | ÔÇö | `200` `{user}` |
| POST | `/auth/forgot-password` | ÔÇö | `{email}` | `202` (always) |
| POST | `/auth/reset-password` | ÔÇö | `{token, password}` | `204` (no body) |

### Health

| Method | Path | Auth | Success |
|--------|------|------|---------|
| GET | `/health` | ÔÇö | `200` `{status, env, uptime}` |
| GET | `/health/ready` | ÔÇö | `200` `{status, database}` / `503` |

### LLM

| Method | Path | Auth | Success |
|--------|------|------|---------|
| GET | `/llm/health` | ÔÇö | `200` upstream liveness |
| GET | `/llm/models` | ÔÇö | `200` `{data: [...]}` |
| POST | `/llm/chat/completions` | ÔÇö | `200` OpenAI completion + `x-cache*` headers |
| GET | `/llm/admin/overview` | backend token | `200` overview |
| GET/POST | `/llm/admin/spaces` | backend token | `200` |
| PATCH/DELETE | `/llm/admin/spaces/:id` | backend token | `200` |
| POST | `/llm/admin/spaces/:id/{pause,resume,default,move}` | backend token | `200` |
| GET/PUT | `/llm/admin/settings` | backend token | `200` |
| GET | `/llm/admin/entries` | backend token | `200` `{rows,total}` |
| DELETE | `/llm/admin/entries/:id` | backend token | `200` |
| POST | `/llm/admin/cache/purge` | backend token | `200` `{removed}` |

### Field rules at a glance

| Field | Rule |
|-------|------|
| `email` | valid email, ÔëĄ 320 chars; server trims + lowercases |
| `password` (register/reset) | 8ÔÇô64 chars, Ôëą1 lowercase, Ôëą1 uppercase, Ôëą1 digit, ÔëĄ72 bytes |
| `password` (login) | 1ÔÇô64 chars (not re-validated against strength rules) |
| `refreshToken` | 1ÔÇô512 chars |
| `token` (reset) | 1ÔÇô512 chars |
| `x-cache-space` | optional string; omit for the service default |
| `messages` | non-empty array of `{role, content}` |

---

## 13. Content (knowledge base)

Public, read-only knowledge base. Base path `/content`. **No authentication is required for any GET.**
Only materials with `status = "published"` are ever returned (drafts are never exposed).

### Conventions

- **Caching.** Every `GET` in this section sets `ETag: W/"<sha1 of body>"` and
  `Cache-Control: public, max-age=<n>, stale-while-revalidate=300`. If you send `If-None-Match` with
  the current ETag, the server replies **`304 Not Modified` with no body**.
- **Pagination.** `?page=1&limit=20` (`limit` ÔëĄ 100). List responses use
  `{ "data": [...], "meta": { page, limit, total, totalPages } }`. `totalPages` is `0` when empty.
- **CSV filters.** `type` and `topic` accept comma-separated values, e.g. `type=guide,webinar`.
- **`category`** accepts a category **slug or UUID**. **`topic`** accepts topic **slugs**.
- **Unknown filter values** (e.g. a category slug that does not exist) match nothing and return an
  empty `data` array ÔÇö not an error.
- **Sorting.** `sort=publishedAt` (oldest first) ┬Ě `sort=-publishedAt` (newest first, **default**) ┬Ě `sort=title` (AÔćĺZ).
- **Errors** use the standard envelope; query validation failures are **`422 VALIDATION_ERROR`**.

### Enums

- **`type`:** `innovation` ┬Ě `report` ┬Ě `publication` ┬Ě `guide` ┬Ě `webinar` ┬Ě `checklist` ┬Ě `video` ┬Ě `challenge_map` ┬Ě `case_study`
- **`format`:** `article` ┬Ě `pdf` ┬Ě `video` ┬Ě `map`
- **Reports `type`:** `report` ┬Ě `publication` (default `report`)
- **Learning `type`:** `guide` ┬Ě `webinar` ┬Ě `checklist` (omit to match all three)
- **Category `accent`:** `blue` ┬Ě `rose` ┬Ě `emerald` ┬Ě `violet` ┬Ě `amber` ┬Ě `teal`
- **Category/topic `icon`:** `lightbulb` ┬Ě `file-text` ┬Ě `graduation-cap` ┬Ě `play` ┬Ě `map-pin` ┬Ě `users`
  (topics additionally use `heart-pulse`, `accessibility`, `wifi`, `users-round`, `user-round`)

**`typeLabel` mapping** (server-computed; also used as `badge`):

| `type` | `typeLabel` |
|--------|-------------|
| `innovation` | Innowacja |
| `report` | Raport |
| `publication` | Publikacja |
| `guide` | Poradnik |
| `webinar` | Webinar |
| `checklist` | Lista kontrolna |
| `video` | Wideo |
| `challenge_map` | Mapa wyzwa┼ä |
| `case_study` | Studium przypadku |

### `GET /content/categories`

All categories with a count of **published** materials. `Cache-Control: max-age=300`.

```json
{ "data": [
  {
    "id": "uuid",
    "slug": "gotowe-innowacje",
    "name": "Gotowe innowacje",
    "description": "Sprawdzone rozwi─ůzania i dobre praktyki.",
    "icon": "lightbulb",
    "accent": "blue",
    "materialCount": 3,
    "sortOrder": 1
  }
]}
```

Ordered by `sortOrder` then `name`. `materialCount` always equals
`GET /content/materials?category=<slug>` `meta.total`.

### `GET /content/topics`

All topics with a published-material count. `Cache-Control: max-age=300`.

```json
{ "data": [
  { "id": "uuid", "slug": "seniorzy", "name": "Seniorzy", "icon": "users", "materialCount": 6 }
]}
```

Ordered by `materialCount` desc then `name`. `materialCount` always equals
`GET /content/materials?topic=<slug>` `meta.total`.

### MaterialSummary (shape used by all list endpoints)

```json
{
  "id": "uuid",
  "slug": "cyfrowi-seniorzy-blizej-swiata",
  "title": "Cyfrowi Seniorzy ÔÇô bli┼╝ej ┼Ťwiata",
  "excerpt": "Program wspieraj─ůcy osoby starsze...",
  "type": "innovation",
  "typeLabel": "Innowacja",
  "format": "article",
  "publishedAt": "2024-03-01T00:00:00.000Z",
  "updatedAt": "2024-03-10T00:00:00.000Z",
  "coverUrl": "https://.../cover.jpg",
  "thumbnailUrl": "https://.../thumb.jpg",
  "tags": ["Seniorzy", "Wykluczenie cyfrowe"],
  "category": { "id": "uuid", "slug": "gotowe-innowacje", "name": "Gotowe innowacje" },
  "topics": [{ "id": "uuid", "slug": "seniorzy", "name": "Seniorzy" }],
  "author": "Fundacja ...",
  "region": "Ma┼éopolska",
  "language": "pl",
  "isFeatured": true,
  "fileUrl": "https://.../plik.pdf",
  "fileType": "pdf",
  "fileSizeBytes": 734003,
  "durationSeconds": 3720,
  "pages": 48,
  "videoUrl": null
}
```

Notes: `publishedAt`/`category` may be `null`. `pages` is meaningful for reports; `videoUrl` for
video items. List items from `featured`, `reports`, and `learning` additionally carry `badge`
(equal to `typeLabel`).

### `GET /content/materials`

Paginated, filtered list. `Cache-Control: max-age=60`.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | CSV | ÔÇö | material types |
| `category` | string | ÔÇö | slug or UUID |
| `topic` | CSV | ÔÇö | topic slugs |
| `featured` | `true`/`false` | ÔÇö | `true` Ôćĺ featured only |
| `search` | string | ÔÇö | 1ÔÇô200 chars; matches `title`, `excerpt`, `body`, tags |
| `sort` | enum | `-publishedAt` | `publishedAt` ┬Ě `-publishedAt` ┬Ě `title` |
| `page` | int | `1` | Ôëą 1 |
| `limit` | int | `20` | 1ÔÇô100 |

Response: `{ "data": [MaterialSummary], "meta": {...} }`.

```bash
curl "{{BASE_URL}}/content/materials?type=guide,webinar&sort=-publishedAt&page=1&limit=10"
```

### `GET /content/materials/featured`

Featured only, newest first. `Cache-Control: max-age=120`.

| Query | Type | Default |
|-------|------|---------|
| `limit` | int | `4` |
| `topic` | CSV | ÔÇö |
| `category` | string | ÔÇö |

Response: `{ "data": [ /* MaterialSummary with badge */ ] }`.

### `GET /content/materials/:slug`

Full detail. `Cache-Control: max-age=120`.

Response = all `MaterialSummary` fields **plus**:

| Field | Type | Meaning |
|-------|------|---------|
| `body` | string \| null | Full content (HTML) |
| `gallery` | string[] | image URLs |
| `attachments` | `{name,url,type,sizeBytes}[]` | downloadable files |
| `related` | MaterialSummary[] | up to 4 related published materials |

**Errors:** `404 NOT_FOUND` if missing or not published.

### `GET /content/materials/:id/download`

`:id` is the material **UUID**. On success responds **`302`** with `Location: <fileUrl>` and
`Content-Disposition: attachment; filename="..."`. Returns `404` if the material is missing, not
published, or has no file (`This material has no downloadable file`).

```bash
curl -i "{{BASE_URL}}/content/materials/<uuid>/download"
```

### `GET /content/reports`

Paginated reports/publications. `Cache-Control: max-age=300`.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | enum | `report` | `report` \| `publication` |
| `year` | int | ÔÇö | matches publication year |
| `topic` | CSV | ÔÇö | topic slugs |
| `category` | string | ÔÇö | slug or UUID |
| `sort` | enum | `-publishedAt` | `publishedAt` ┬Ě `-publishedAt` ┬Ě `title` |
| `page`,`limit` | int | `1`,`20` | limit ÔëĄ 100 |

Each item has `badge` and `pages` (page count).

### `GET /content/learning`

Paginated learning materials (Poradnik/Webinar/Lista kontrolna). `Cache-Control: max-age=120`.

| Query | Type | Default | Notes |
|-------|------|---------|-------|
| `type` | enum | ÔÇö | `guide` \| `webinar` \| `checklist`; omit = all |
| `topic` | CSV | ÔÇö | topic slugs |
| `category` | string | ÔÇö | slug or UUID |
| `sort` | enum | `-publishedAt` | `publishedAt` ┬Ě `-publishedAt` ┬Ě `title` |
| `page`,`limit` | int | `1`,`20` | limit ÔëĄ 100 |

Webinar/video items carry `videoUrl` and `durationSeconds`.

### `GET /content/search`

Search across published materials, with facet counts. `Cache-Control: max-age=30`.

| Query | Type | Default |
|-------|------|---------|
| `q` | string | `''` (empty returns all published) |
| `type` | CSV | ÔÇö |
| `category` | string | ÔÇö |
| `topic` | CSV | ÔÇö |
| `page`,`limit` | int | `1`,`20` |

```json
{
  "data": [ /* MaterialSummary[] */ ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 },
  "facets": {
    "categories": [{ "slug": "gotowe-innowacje", "name": "Gotowe innowacje", "count": 2 }],
    "topics":     [{ "slug": "seniorzy", "name": "Seniorzy", "count": 5 }],
    "types":      [{ "slug": "innovation", "name": "Innowacja", "count": 2 }]
  }
}
```

A non-empty `q` increments the popular-searches counter.

### `GET /content/search/popular`

`?limit=5` (1ÔÇô50). Response: `{ "data": [{ "term": "innowacje dla senior├│w", "searches": 120 }] }`,
ordered by `searches` desc.

### `GET /content/home`

Single request for the landing page. Response:

```json
{
  "categories": [ /* CategoryDTO[] */ ],
  "topics": [ /* TopicDTO[] */ ],
  "featured": [ /* MaterialSummary[] (4) */ ],
  "reports": [ /* MaterialSummary[] (4) */ ],
  "learning": [ /* MaterialSummary[] (4) */ ],
  "mostSearched": [ /* { term, searches }[] (5) */ ]
}
```

---

## 14. Contact

### `POST /contact`

Stores a message and sends an acknowledgement email to the sender. No authentication. Rate-limited by
the **sensitive** limiter (10 failed requests / 15 min / IP).

Request:

```json
{ "name": "Jan Kowalski", "email": "jan@example.com", "subject": "Pytanie", "message": "Dzie┼ä dobry, prosz─Ö o kontakt." }
```

| Field | Required | Rules |
|-------|----------|-------|
| `name` | yes | 2ÔÇô200 chars, trimmed |
| `email` | yes | valid email, ÔëĄ 320 chars; trimmed + lowercased |
| `subject` | no | ÔëĄ 300 chars |
| `message` | yes | 10ÔÇô5000 chars |

Response `202 Accepted`:

```json
{ "message": "Thank you. We received your message and will get back to you soon." }
```

**Errors:** `422 VALIDATION_ERROR` (fields listed in `details`), `429 TOO_MANY_REQUESTS`.

---

# Part 2 — AI Matchmaking API

# AI Matchmaking API ÔÇö frontend integration guide

This document is the integration contract for the frontend. It describes the
HTTP endpoints, payloads, enums, error handling and the UX rules the UI must
respect. The machine-readable source of truth is the OpenAPI 3.1 document at
`GET /openapi.json` (also `GET /api/v1/openapi.json`).

- Audience: frontend developers integrating the AI Matchmaking feature.
- Language: technical documentation in English; all user-facing strings returned
  by the API are **plain Polish** and should be rendered as-is.
- Scope of this service: problem intake, interpretation, retrieval, ranked
  recommendations, innovation details and usefulness feedback. No grant
  applications, messaging, partner matching or admin dashboard.

---

## 1. Conventions

| Topic | Value |
|---|---|
| Base path | `/api/v1` |
| Local base URL | `http://localhost:4000` (dev) / `http://localhost:3000` (prod) |
| Content type | `application/json; charset=utf-8` |
| Character encoding | UTF-8 (Polish diacritics supported) |
| Authentication | **None currently.** Do not send credentials. |
| Request body size limit | 256 KB |
| CORS | **Not enabled.** See "Cross-origin" below. |
| Correlation header | `x-request-id` (optional request, always returned) |

### Correlation id

Every response carries an `x-request-id` header. You may send your own
`x-request-id` (allowed characters: letters, digits, `.`, `:`, `-`, `_`; max 128
chars); otherwise the server generates one. Error bodies include the same id as
`error.requestId`. Log it on the frontend for support.

### Cross-origin

The API does **not** send CORS headers and does not handle preflight requests.
The frontend must either:

- be served from the same origin as the API, or
- use a dev proxy / reverse proxy (recommended), e.g. proxy `/api` to the API.

If a cross-origin browser deployment is required, the backend must add a CORS
policy first. Do not rely on cross-origin `fetch` working today.

### No pagination / rate limiting

`GET /api/v1/innovations/{id}` returns a single resource. The matchmaking
response is capped at 5 matches. There is currently no rate limiting; debounce
submissions and do not auto-retry aggressively.

---

## 2. Error envelope

All non-2xx responses (and unknown routes) use this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Opis problemu jest zbyt kr├│tki. Podaj co najmniej 20 znak├│w, aby dopasowanie by┼éo wiarygodne.",
    "requestId": "3f1c0b6e-2b1a-4a2e-9d3c-6f0b8e2a1c77",
    "retryable": false
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `error.code` | string | Machine-readable code, see table below. |
| `error.message` | string | **Safe Polish message** ÔÇö display directly to the user. |
| `error.requestId` | string | Correlation id; also in the `x-request-id` header. |
| `error.retryable` | boolean | `true` means a retry may succeed; show a "try again" affordance. |

### Error codes and HTTP status

| HTTP | `code` | Meaning | Retryable |
|---|---|---|---|
| 400 | `validation_error` | Malformed JSON or invalid fields. | `false` |
| 404 | `not_found` | Unknown innovation id, unknown `requestId`, or unknown route. | `false` |
| 413 | `payload_too_large` | Request body exceeds 256 KB. | `false` |
| 415 | `unsupported_media_type` | Unsupported request encoding. | `false` |
| 500 | `internal_error` | Unexpected server error. | `true` |
| 200* | `service_degraded` | Reserved code from the shared taxonomy; degraded results are normally reported in the response body via `status: "degraded"`, not as an error. | `true` |

---

## 3. Enums

```ts
type UserType       = 'resident' | 'ngo' | 'local_government' | 'institution';
type MatchStatus    = 'matched' | 'needs_clarification' | 'no_match' | 'degraded';
type ServiceMode    = 'live' | 'demo';
type Relevance      = 'high' | 'medium' | 'low';
type EvidenceStatus = 'documented' | 'partially_documented' | 'synthetic';
type FeedbackReason =
  | 'not_relevant'
  | 'target_group_mismatch'
  | 'constraints_mismatch'
  | 'insufficient_evidence'
  | 'already_known'
  | 'other';
```

---

## 4. `POST /api/v1/matchmaking`

Interpret a problem description and return ranked innovations.

### Request body

| Field | Type | Required | Constraints |
|---|---|---|---|
| `problemDescription` | string | yes | 20ÔÇô5000 chars (trimmed). |
| `userType` | `UserType` | yes | One of the enum values. |
| `location` | object | no | `{ municipality?: string ÔëĄ120, county?: string ÔëĄ120 }`. |
| `targetGroups` | string[] | no | ÔëĄ20 items, each ÔëĄ160 chars. |
| `constraints` | object | no | See below. |
| `constraints.budgetPln` | number | no | Finite, `>= 0`. |
| `constraints.timeframeWeeks` | integer | no | `> 0`. |
| `constraints.availableResources` | string[] | no | ÔëĄ20 items, each ÔëĄ160 chars. |
| `constraints.accessibilityNeeds` | string[] | no | ÔëĄ20 items, each ÔëĄ160 chars. |
| `clarificationAnswers` | array | no | ÔëĄ10 items of `{ questionId: string ÔëĄ120, answer: string ÔëĄ2000 }`. |

Unknown top-level fields are ignored. Empty strings are treated as absent.

### Request example

```json
{
  "problemDescription": "W naszej gminie wiele os├│b starszych mieszka samotnie i nie ma kontaktu z innymi. Chcemy zorganizowa─ç wsparcie s─ůsiedzkie i zaj─Öcia dla senior├│w.",
  "userType": "local_government",
  "location": { "municipality": "Krak├│w", "county": "krakowski" },
  "targetGroups": ["Seniorzy"],
  "constraints": {
    "budgetPln": 20000,
    "timeframeWeeks": 24,
    "availableResources": ["wolontariusze", "┼Ťwietlica"],
    "accessibilityNeeds": ["dojazd"]
  },
  "clarificationAnswers": [
    { "questionId": "location", "answer": "gmina Wieliczka" }
  ]
}
```

### Response body (`200`)

| Field | Type | Notes |
|---|---|---|
| `requestId` | string | Opaque id. **Persist it** ÔÇö required to submit feedback. |
| `status` | `MatchStatus` | See behavior rules in ┬ž7. |
| `mode` | `ServiceMode` | `live` if a verified catalogue is loaded, else `demo`. |
| `problemSummary` | string | Condensed restatement of the problem (Polish). |
| `identifiedNeeds` | string[] | Polish need labels detected in the text. |
| `clarifyingQuestions` | `{ id, question }[]` | 0ÔÇô3 items; only when `status = needs_clarification`. |
| `matches` | `Match[]` | 0ÔÇô5 items. |
| `relatedEvidence` | `RelatedEvidence[]` | Contextual evidence items (0ÔÇô4). |
| `warnings` | string[] | Disclosures, assumptions, source limitations (Polish). **Display these.** |

`Match`:

| Field | Type | Notes |
|---|---|---|
| `innovationId` | string | Use with `GET /api/v1/innovations/{id}`. |
| `title` | string | |
| `summary` | string | |
| `relevance` | `Relevance` | Suitability for the need ÔÇö **not** a success probability. |
| `whyItMatches` | string[] | Grounded Polish reasons. |
| `limitations` | string[] | Prerequisites, unknowns, evidence gaps (Polish). |
| `suggestedNextSteps` | string[] | Polish; each entry is prefixed `Sugestia:`. |
| `evidenceStatus` | `EvidenceStatus` | `synthetic` = demonstration record. |
| `citations` | `Citation[]` | See below. |

`Citation`:

| Field | Type | Notes |
|---|---|---|
| `sourceId` | string | |
| `title` | string | |
| `url` | string? | **Only render a link when present**; it is absent for unverified/synthetic sources. |
| `page` | integer? | |
| `excerpt` | string | Short supporting text (Polish). |

`RelatedEvidence`:

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `sourceId` | string | |
| `title` | string | |
| `kind` | string | e.g. `synthetic_evidence`, `report`, `statistics`. |
| `summary` | string | |
| `url` | string? | Only render when present. |
| `synthetic` | boolean | |

### Response example ÔÇö `matched`

```json
{
  "requestId": "9b2f5a1c-7e4d-4c6a-8f10-2d9c3a5b7e01",
  "status": "matched",
  "mode": "demo",
  "problemSummary": "W naszej gminie wiele os├│b starszych mieszka samotnie i nie ma kontaktu z innymi. Chcemy zorganizowa─ç wsparcie s─ůsiedzkie i zaj─Öcia dla senior├│w. Zidentyfikowane potrzeby: Samotno┼Ť─ç i wsparcie senior├│w, Wolontariat i spo┼éeczno┼Ť─ç lokalna.",
  "identifiedNeeds": [
    "Samotno┼Ť─ç i wsparcie senior├│w",
    "Wolontariat i spo┼éeczno┼Ť─ç lokalna"
  ],
  "clarifyingQuestions": [],
  "matches": [
    {
      "innovationId": "syn-senior-neighborhood",
      "title": "S─ůsiedzkie Centra Wsparcia Senior├│w",
      "summary": "Lokalne punkty w kt├│rych wolontariusze i s─ůsiedzi pomagaj─ů seniorom w codziennych sprawach i przeciwdzia┼éaj─ů samotno┼Ťci.",
      "relevance": "medium",
      "whyItMatches": [
        "Odnosi si─Ö do zidentyfikowanych potrzeb: Samotno┼Ť─ç i wsparcie senior├│w, Wolontariat i spo┼éeczno┼Ť─ç lokalna.",
        "Profil odbiorc├│w obejmuje: Seniorzy.",
        "Poziom udokumentowania: rekord syntetyczny (demonstracyjny)."
      ],
      "limitations": [
        "To rekord demonstracyjny (syntetyczny). Nie potwierdzono jego skuteczno┼Ťci, koszt├│w ani rzeczywistego wdro┼╝enia.",
        "Nie podano koszt├│w ÔÇö wysoko┼Ť─ç bud┼╝etu pozostaje nieznana.",
        "Wymagania wst─Öpne: Lokal do prowadzenia punktu; Koordynator lub lider lokalny. Ich spe┼énienie nie zosta┼éo zweryfikowane.",
        "Dokumentacja ┼║r├│d┼éowa jest niepe┼éna; przed decyzj─ů zalecana jest r─Öczna weryfikacja.",
        "Dopasowanie oznacza przydatno┼Ť─ç dla opisanego problemu, a nie gwarancj─Ö skuteczno┼Ťci ani dow├│d, ┼╝e rozwi─ůzanie dzia┼éa."
      ],
      "suggestedNextSteps": [
        "Sugestia: potwierd┼║ warunki wdro┼╝enia bezpo┼Ťrednio u autora lub podmiotu prowadz─ůcego rozwi─ůzanie.",
        "Sugestia: zaplanuj warsztat z u┼╝yciem Social Innovation Canvas, aby dostosowa─ç model do lokalnego kontekstu.",
        "Sugestia: zweryfikuj dost─Öpny bud┼╝et, czas i zasoby, zanim podejmiesz decyzj─Ö.",
        "Sugestia: potraktuj ten rekord wy┼é─ůcznie jako inspiracj─Ö i poszukaj zweryfikowanych ┼║r├│de┼é w Bibliotece Innowacji."
      ],
      "evidenceStatus": "synthetic",
      "citations": [
        {
          "sourceId": "src-synthetic-note",
          "title": "Notatka demonstracyjna (syntetyczna)",
          "excerpt": "Rekord demonstracyjny (syntetyczny). Nie jest zweryfikowan─ů innowacj─ů ROPS i nie opisuje rzeczywistego wdro┼╝enia."
        }
      ]
    }
  ],
  "relatedEvidence": [
    {
      "id": "ev-syn-seniors",
      "sourceId": "src-synthetic-catalogue",
      "title": "Dow├│d demonstracyjny: samotno┼Ť─ç senior├│w",
      "kind": "synthetic_evidence",
      "summary": "Tre┼Ť─ç demonstracyjna (syntetyczna) ilustruj─ůca kontekst samotno┼Ťci senior├│w. Nie jest to zweryfikowane ustalenie statystyczne ROPS.",
      "synthetic": true
    }
  ],
  "warnings": [
    "Tre┼Ťci ┼║r├│de┼é ROPS nie zosta┼éy pobrane w tej instancji ÔÇö ┼║r├│d┼éa wskazano jako lokalizacje do r─Öcznej weryfikacji.",
    "Us┼éuga dzia┼éa w trybie demonstracyjnym: rekomendacje oparte s─ů na rekordach syntetycznych i nie s─ů zweryfikowanymi innowacjami ROPS.",
    "Za┼éo┼╝enie: Odbiorc├│w wywnioskowano z opisu problemu.",
    "Za┼éo┼╝enie: Przyj─Öto, ┼╝e rozwi─ůzanie ma by─ç zastosowane w Ma┼éopolsce.",
    "Za┼éo┼╝enie: Nie przyj─Öto ┼╝adnych za┼éo┼╝onych zasob├│w ÔÇö traktujemy je jako nieznane."
  ]
}
```

### Response example ÔÇö `needs_clarification`

`matches` and `relatedEvidence` are empty. Render each question as a form field,
collect answers, then re-POST the **same** `problemDescription` with a
`clarificationAnswers` array echoing each `id`.

```json
{
  "requestId": "1d8e2f44-0a3b-4c5d-9e6f-7a8b9c0d1e2f",
  "status": "needs_clarification",
  "mode": "demo",
  "problemSummary": "Mamy problem w naszej gminie.",
  "identifiedNeeds": [],
  "clarifyingQuestions": [
    {
      "id": "problem_detail",
      "question": "Opisz prosz─Ö problem bardziej szczeg├│┼éowo: co si─Ö dzieje, kogo dotyczy i od kiedy?"
    },
    {
      "id": "target_group",
      "question": "Kogo przede wszystkim dotyczy problem (np. senior├│w, m┼éodzie┼╝y, rodzin)?"
    }
  ],
  "matches": [],
  "relatedEvidence": [],
  "warnings": [
    "Tre┼Ťci ┼║r├│de┼é ROPS nie zosta┼éy pobrane w tej instancji ÔÇö ┼║r├│d┼éa wskazano jako lokalizacje do r─Öcznej weryfikacji.",
    "Us┼éuga dzia┼éa w trybie demonstracyjnym: rekomendacje oparte s─ů na rekordach syntetycznych i nie s─ů zweryfikowanymi innowacjami ROPS.",
    "Aby poprawi─ç dopasowanie, odpowiedz na pytania doprecyzowuj─ůce."
  ]
}
```

Known `clarifyingQuestions[].id` values: `problem_detail`, `target_group`,
`location`. Echo the exact `id` you received; do not hard-code a fixed set.

### Response example ÔÇö `no_match`

```json
{
  "requestId": "5c7a1b90-3e2d-4f56-a7b8-c9d0e1f2a3b4",
  "status": "no_match",
  "mode": "demo",
  "problemSummary": "Zg┼éoszony problem nie odpowiada profilom dost─Öpnych innowacji.",
  "identifiedNeeds": ["Ekologia i ┼Ťrodowisko"],
  "clarifyingQuestions": [],
  "matches": [],
  "relatedEvidence": [],
  "warnings": [
    "Tre┼Ťci ┼║r├│de┼é ROPS nie zosta┼éy pobrane w tej instancji ÔÇö ┼║r├│d┼éa wskazano jako lokalizacje do r─Öcznej weryfikacji.",
    "Us┼éuga dzia┼éa w trybie demonstracyjnym: rekomendacje oparte s─ů na rekordach syntetycznych i nie s─ů zweryfikowanymi innowacjami ROPS.",
    "Nie znaleziono wystarczaj─ůco dopasowanych innowacji w dost─Öpnym katalogu."
  ]
}
```

### Response example ÔÇö `degraded`

Returned when a live AI provider failed and the offline path was used. `matches`
may still be present but should be presented as lower-confidence.

```json
{
  "requestId": "0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9",
  "status": "degraded",
  "mode": "live",
  "problemSummary": "ÔÇŽ",
  "identifiedNeeds": ["Samotno┼Ť─ç i wsparcie senior├│w"],
  "clarifyingQuestions": [],
  "matches": [],
  "relatedEvidence": [],
  "warnings": [
    "Cz─Ö┼Ť─ç us┼éug AI by┼éa niedost─Öpna ÔÇö zastosowano analiz─Ö offline o ograniczonej dok┼éadno┼Ťci.",
    "Nie mo┼╝na by┼éo w pe┼éni potwierdzi─ç dopasowa┼ä ze wzgl─Ödu na ograniczon─ů dost─Öpno┼Ť─ç us┼éug AI."
  ]
}
```

---

## 5. `GET /api/v1/innovations/{innovationId}`

Returns full details and source references for one catalogue record.

### Path parameter

| Name | Type | Constraints |
|---|---|---|
| `innovationId` | string | ÔëĄ200 chars; e.g. `syn-senior-neighborhood`. |

### Response body (`200`)

| Field | Type | Notes |
|---|---|---|
| `innovationId` | string | |
| `title` | string | |
| `summary` | string | |
| `description` | string | |
| `evidenceStatus` | `EvidenceStatus` | |
| `synthetic` | boolean | `true` for demonstration records. |
| `source` | object | `{ sourceId, title, url?, urlVerified: boolean, kind, synthetic }`. |
| `problemTags` | string[] | Canonical tags (may be technical ids). |
| `targetGroups` | string[] | |
| `testedIn` | string[] | Places where it was documented as tested. **Not** a claim about where it fits. |
| `applicableContexts` | string[] | Contexts it can apply to (e.g. `obszar wiejski`). |
| `prerequisites` | string[] | |
| `resourcesRequired` | string[] | |
| `estimatedCostPln` | number \| null | `null` = unknown. **Do not render as 0.** |
| `timeframeWeeks` | integer \| null | `null` = unknown. |
| `citations` | `Citation[]` | |
| `disclaimer` | string | Polish disclaimer; display it. |

### Example (`200`)

```json
{
  "innovationId": "syn-senior-neighborhood",
  "title": "S─ůsiedzkie Centra Wsparcia Senior├│w",
  "summary": "Lokalne punkty w kt├│rych wolontariusze i s─ůsiedzi pomagaj─ů seniorom w codziennych sprawach i przeciwdzia┼éaj─ů samotno┼Ťci.",
  "description": "Model zak┼éada tworzenie sta┼éych punkt├│w s─ůsiedzkich, w kt├│rych starsze osoby mog─ů spotka─ç si─Ö, uzyska─ç pomoc w za┼éatwianiu spraw oraz wzi─ů─ç udzia┼é w zaj─Öciach towarzyskich. Kluczowa jest wsp├│┼épraca z lokalnymi organizacjami i koordynatora ds. senior├│w.",
  "evidenceStatus": "synthetic",
  "synthetic": true,
  "source": {
    "sourceId": "src-synthetic-catalogue",
    "title": "Katalog demonstracyjny (syntetyczny)",
    "urlVerified": false,
    "kind": "synthetic_catalogue",
    "synthetic": true
  },
  "problemTags": ["senior_loneliness", "volunteering_community", "digital_exclusion"],
  "targetGroups": ["Seniorzy", "Osoby starsze mieszkaj─ůce samotnie"],
  "testedIn": ["(rekord demonstracyjny)"],
  "applicableContexts": ["obszar miejski", "obszar wiejski", "gmina"],
  "prerequisites": ["Lokal do prowadzenia punktu", "Koordynator lub lider lokalny"],
  "resourcesRequired": ["Wolontariusze", "Pomieszczenie", "Wsp├│┼épraca z NGO"],
  "estimatedCostPln": null,
  "timeframeWeeks": 24,
  "citations": [
    {
      "sourceId": "src-synthetic-note",
      "title": "Notatka demonstracyjna (syntetyczna)",
      "excerpt": "Rekord demonstracyjny (syntetyczny). Nie jest zweryfikowan─ů innowacj─ů ROPS i nie opisuje rzeczywistego wdro┼╝enia."
    }
  ],
  "disclaimer": "Rekord demonstracyjny (syntetyczny). Nie jest zweryfikowan─ů innowacj─ů ROPS i nie opisuje rzeczywistego wdro┼╝enia."
}
```

### Errors

- `404 not_found` ÔÇö unknown id.

---

## 6. `POST /api/v1/matchmaking/{requestId}/feedback`

Records usefulness feedback for one recommendation from a previous matchmaking
response. The `requestId` and `innovationId` must come from the **same**
matchmaking response.

### Path parameter

| Name | Type | Constraints |
|---|---|---|
| `requestId` | string | The `requestId` from the matchmaking response. |

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `innovationId` | string | yes | ÔëĄ200 chars; must be one of the matches in that response. |
| `useful` | boolean | yes | |
| `reason` | `FeedbackReason` | no | Send when `useful = false`. |
| `comment` | string | no | ÔëĄ2000 chars. |

```json
{
  "innovationId": "syn-senior-neighborhood",
  "useful": false,
  "reason": "constraints_mismatch",
  "comment": "Brakuje informacji o kosztach."
}
```

### Response body (`201`)

```json
{
  "feedbackId": "b1e2d3c4-5f60-7182-93a4-b5c6d7e8f901",
  "requestId": "9b2f5a1c-7e4d-4c6a-8f10-2d9c3a5b7e01",
  "innovationId": "syn-senior-neighborhood",
  "recorded": true,
  "message": "Dzi─Ökujemy. Informacja zwrotna zosta┼éa zapisana i pos┼éu┼╝y do oceny jako┼Ťci rekomendacji."
}
```

### Errors

- `404 not_found` ÔÇö unknown `requestId` (e.g. server restarted in `memory` mode).
- `400 validation_error` ÔÇö invalid body, or `innovationId` not part of that request.

---

## 7. UX behavior rules (must respect)

1. **`status` drives the view**
   - `needs_clarification` Ôćĺ show the questions, collect answers, re-submit with
     `clarificationAnswers` (same `problemDescription`). Do not show matches.
   - `matched` Ôćĺ render matches.
   - `no_match` Ôćĺ honest "no suitable innovation found" message. Never fabricate
     recommendations or fall back to unrelated ones.
   - `degraded` Ôćĺ show results (if any) with a reduced-confidence notice.
2. **Always display `warnings`.** They carry assumptions and source limitations.
3. **Label synthetic data.** When `mode === "demo"` or `evidenceStatus ===
   "synthetic"`, show a clear "Dane demonstracyjne / rekord syntetyczny" badge.
   Never present synthetic records as verified ROPS innovations.
4. **Relevance is suitability, not success.** Do not phrase `high`/`medium`/`low`
   as a probability or guarantee. Keep the API's disclaimer visible.
5. **Unknowns stay unknown.** Render `estimatedCostPln: null` /
   `timeframeWeeks: null` as "nieznane", never as `0`.
6. **Citations**: render a link only when `url` is present; otherwise show the
   title and excerpt as text.
7. **Feedback** is bound to `(requestId, innovationId)`. Use the `reason` values
   only for negative feedback. Store the returned `feedbackId` if you track it.
8. **`requestId`** must be retained client-side to submit feedback. In `memory`
   store mode, requests are not persisted across server restarts, so feedback on
   an old id will return `404`.

---

## 8. OpenAPI and generated types

- OpenAPI document: `GET /openapi.json` (also `GET /api/v1/openapi.json`).
- Generate TypeScript types for the frontend from the spec:

  ```bash
  npm run openapi:emit      # writes openapi.json from src/openapi.ts
  npm run types:generate    # writes web/api-types.ts via openapi-typescript
  npm run types:check       # type-checks web/client-example.ts against the spec
  ```

- Usage with the generated types:

  ```ts
  import type { components } from './api-types';

  type MatchmakingRequest = components['schemas']['MatchmakingRequest'];
  type MatchmakingResponse = components['schemas']['MatchmakingResponse'];
  type Match = components['schemas']['Match'];
  type InnovationDetail = components['schemas']['InnovationDetail'];
  type FeedbackRequest = components['schemas']['FeedbackRequest'];
  type ErrorEnvelope = components['schemas']['ErrorEnvelope'];
  ```

### Minimal client example

```ts
async function findMatches(input: MatchmakingRequest): Promise<MatchmakingResponse> {
  const response = await fetch('/api/v1/matchmaking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const { error } = (await response.json()) as ErrorEnvelope;
    throw new Error(error.message);
  }
  return (await response.json()) as MatchmakingResponse;
}

async function sendFeedback(requestId: string, feedback: FeedbackRequest): Promise<void> {
  const response = await fetch(`/api/v1/matchmaking/${encodeURIComponent(requestId)}/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(feedback),
  });
  if (!response.ok) {
    const { error } = (await response.json()) as ErrorEnvelope;
    throw new Error(error.message);
  }
}
```

A type-checked example client lives at `web/client-example.ts`.

---

## 9. Other (non-matchmaking) endpoints

These exist from the starter and are **not** part of this integration:

- `GET /health` Ôćĺ `{ status, env, uptime }`.

Do not depend on them for the matchmaking feature.

---

## 10. Versioning

- API version is part of the path (`/api/v1`).
- The OpenAPI `info.version` is `1.0.0`.
- Additive changes (new optional response fields) are non-breaking. Breaking
  changes will be introduced under a new path version.
