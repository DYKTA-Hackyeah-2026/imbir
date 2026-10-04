# Backend

Express 5 + TypeScript API with PostgreSQL, Drizzle ORM, JWT auth, a content knowledge base
and AI matchmaking. Docker for dev and deployment.

## Stack

- Express 5, TypeScript (NodeNext / ESM), `tsx` for dev-time hot reload (`tsx watch`)
- PostgreSQL 17 with [Drizzle ORM](https://orm.drizzle.team) + `pg`
- Auth: short-lived JWT access tokens (`jose`, HS256) + opaque, DB-backed, rotating refresh tokens
- Validation with `zod`, password hashing with `bcrypt`
- Hardening: `helmet`, configurable CORS, rate limiting on auth endpoints
- docker-compose for both dev and prod deployment

## Features

- `GET /health` liveness and `GET /health/ready` readiness (checks DB)
- Register, login, refresh (rotating), logout, current user
- Password reset (single-use, hashed, expiring tokens)
- Email delivery is a console stub (`src/mail/mailer.ts`) — swap it for SMTP/a provider later
- Built-in admin panel to exercise every endpoint from the browser (dev only by default)
- LLM cache client: this backend is a thin client of an external LLM cache service
  (`https://llm-cache.makonew.com`), exposing `/llm/*` endpoints that proxy the service's
  `/v1/*` and `/admin/api/*` surfaces
- Content (knowledge base): public `/content/*` endpoints (categories, topics, materials, featured,
  reports, learning, search with facets, home aggregate, detail, download) and `POST /contact`
- AI matchmaking between a described social problem and existing social innovations, documented
  cases and contextual evidence

## AI Matchmaking

AI-assisted matchmaking between a described social problem and existing social
innovations, documented cases and contextual evidence. Relevance means
suitability for the described need, not a probability of success. The public
contract is served as OpenAPI at `GET /openapi.json` (also at
`GET /api/v1/openapi.json`).

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/matchmaking` | Interpret a problem and return up to five ranked innovations. |
| `GET` | `/api/v1/innovations/{innovationId}` | Innovation details and source references. |
| `POST` | `/api/v1/matchmaking/{requestId}/feedback` | Record usefulness feedback for a recommendation. |
| `GET` | `/openapi.json` | OpenAPI 3.1 contract (source of truth for the frontend types). |

`POST /api/v1/matchmaking` returns `status` of `matched`, `needs_clarification`,
`no_match` or `degraded`, and `mode` of `live` or `demo`. Requests and feedback
are persisted when a store is available.

### Running and verifying

```bash
npm install
cp .env.development.example .env.development
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm run test` | run the test suite (`tsx --test`) |
| `npm run typecheck` | type-check without emitting |
| `npm run build` | compile to `dist/` |
| `npm run openapi:emit` | write `openapi.json` from `src/openapi.ts` |
| `npm run types:generate` | emit OpenAPI, then generate `web/api-types.ts` |
| `npm run types:check` | type-check the generated frontend types |
| `npm run verify` | typecheck + test + build + types:generate + types:check |

### Storage modes

`STORE_MODE` selects the catalogue and storage backend:

- `postgres` — require PostgreSQL.
- `memory` — always use the in-memory demo catalogue (no database needed).
- `auto` (default) — prefer PostgreSQL and, when it is unreachable, fall back to
  the in-memory demo catalogue and emit a warning.

The matchmaking tables (`sources`, `innovations`, `innovation_citations`,
`evidence_documents`, `matchmaking_requests`, `matchmaking_feedback`) are created
with `npm run db:generate` followed by `npm run db:migrate`. Embeddings are stored
as `jsonb` arrays of numbers; pgvector is a planned scale-out and is **not**
required for the MVP.

### AI providers

The default provider is deterministic and works fully offline. An
OpenAI-compatible HTTP provider is used only when `AI_API_KEY` is set (or
`AI_PROVIDER=http`). Credentials stay server-side and are never sent to the
browser. If the provider call fails, the service degrades to the offline path and
sets `status: "degraded"` with an explanatory warning.

### Manual import

Set `MATCHMAKING_IMPORT_DIR` to a directory of JSON files. Every `.json` file
(found recursively) may contain `sources`, `innovations` (with `citations`) and
`evidence`. Imported records are treated as non-synthetic unless a record sets
`synthetic: true`; malformed records are skipped and reported as warnings instead
of being invented. See `examples/import/catalogue.example.json` for the schema.

### ROPS Innovation Library import

`data/import/rops-innovations.json` holds the public social-innovation records
scraped from the ROPS Innovation Library category pages (115 innovations across
9 categories). It contains only public titles and short summaries — no personal
data, authors, or sensitive information (RODO).

Load it into PostgreSQL (idempotent upsert) with:

```bash
npm run db:seed:innovations
```

The assistant/chatbot retrieves rows from the `programs` table. API startup
automatically bridges imported ROPS innovations into that search index. To
refresh the index immediately after importing while the API is running:

```bash
npm run db:seed:assistant-innovations
```

`RUN_SEED_INNOVATIONS=true` runs both steps automatically on container start
(import first, then the assistant bridge); the bridge is idempotent and non-fatal.

Search combines embedding similarity with explicit catalogue need tags and exact
innovation titles, so offline embeddings or an embedding-provider outage do not
hide matching catalogue entries. Generic support language alone does not match
the tag/title fallback. The candidate limit is applied after this combined ranking.

### Synthetic demo data

With no manual import and no database, the service runs on clearly labelled
synthetic records (`mode: "demo"`, `evidenceStatus: "synthetic"`). These are
**not** verified ROPS innovations and are fabricated for demonstration only.

### Source limitations

The ROPS source URLs in `src/repositories/seed.ts` are configured locations that
were not fetched in this build. Their contents are never invented; citations for
synthetic records say so explicitly.

### Assumptions and limitations

- Relevance means suitability for the described need, not a predicted outcome.
- The MVP stores embeddings as `jsonb`; there is no vector index or pgvector
  requirement yet.
- With no database and no import, the catalogue is synthetic and labelled as such.
- Configured and imported sources are pointers unless fetched and verified.
- AI output is treated as untrusted data and constrained to an allow-list.

## Content knowledge base

The public `/content/*` surface powers the knowledge base frontend: categories, topics, materials,
featured items, reports, learning items, full-text search with facets, a home aggregate, material
detail and downloads. `POST /contact` stores a contact message and sends a confirmation email.
The content tables are seeded with `npm run db:seed`.

## Admin panel

When `ADMIN_PANEL_ENABLED` is on, a dependency-free HTML panel is served at
`http://localhost:4000/panel/`. It can:

- call every endpoint and show status, response body and timing
- assert expected results (e.g. duplicate register → 409, reuse of a rotated refresh token → 401,
  cache MISS then HIT)
- run a full sequential suite with one click

`reset-password` needs a token that is only written to the API logs, so paste it into the panel:

```bash
docker compose -f docker-compose.dev.yml logs api | grep reset-password
```

The panel is enabled by default outside production and disabled in production. Set
`ADMIN_PANEL_ENABLED=true` to force it on.

## LLM cache client

The LLM cache itself is a separate service (contract in `API.md`, deployed at
`LLM_CACHE_URL`, default `https://llm-cache.makonew.com`). This backend does **not** implement the
cache; it is a thin HTTP client that exposes the service under `/llm/*`:

| Our endpoint | Forwards to | Notes |
|--------------|-------------|-------|
| `GET /llm/health` | `GET /health` | liveness of the cache service |
| `GET /llm/models` | `GET /v1/models` | upstream model catalog |
| `POST /llm/chat/completions` | `POST /v1/chat/completions` | cached completions; `x-cache-space` forwarded |
| `GET /llm/admin/*` | `/admin/api/*` | spaces, settings, entries, purge |

- The `x-cache`, `x-cache-space` and `x-cache-model` response headers from the service are passed
  through to our caller.
- Admin calls are authenticated server-side with `LLM_CACHE_ADMIN_TOKEN`; callers of our
  `/llm/admin/*` endpoints do **not** need the token. If it is unset, admin calls return `500`.
- The chat endpoint returns the cache service's status and body verbatim (including upstream
  errors such as `401`).

## Local dev (no Docker)

```bash
npm install
cp .env.development.example .env.development
# start a Postgres instance and set DATABASE_URL in .env.development
npm run db:migrate
npm run dev
```

Runs on `http://localhost:4000` by default. On every save the code is rebuilt with hot reload.

## Dev with Docker (hot reload + Postgres)

```bash
docker compose -f docker-compose.dev.yml up --build
```

- starts Postgres 17 and the API, waits for the DB, runs migrations, then `npm run dev`
- source is bind-mounted over `/app`, so edits on the host restart the API
- API at `http://localhost:4000`, Postgres at `localhost:5432`
- change `API_PORT_DEV` / `POSTGRES_PORT` in `.env.development` for different ports

## Production deployment (docker compose)

```bash
cp .env.example .env
# edit .env: set JWT_ACCESS_SECRET, POSTGRES_PASSWORD, DATABASE_URL, CORS_ORIGINS, APP_BASE_URL
docker compose up -d --build
```

- multi-stage Dockerfile builds `dist/` with dev deps pruned
- runs as non-root user with a healthcheck on `/health`
- the entrypoint waits for the DB, runs `dist/db/migrate.js`, then starts the API
- change `API_PORT` in `.env` to change host port

## Deploying to Dokploy

See **[DEPLOY.md](./DEPLOY.md)** for a step-by-step guide (Dockerfile deploy + Dokploy-managed
PostgreSQL, auto-migrations on start). Environment variables to paste into the Dokploy panel are in
[`.env.production.example`](./.env.production.example).

## Migrations

Schema lives in `src/db/schema.ts`; SQL migrations are generated into `drizzle/`.

```bash
npm run db:generate   # generate a new migration from src/db/schema.ts
npm run db:migrate    # apply pending migrations
npm run db:seed       # load demo content (categories, topics, materials, popular searches)
npm run db:seed:innovations  # load the example catalogue (sources, innovations, citations, evidence)
npm run db:push       # push schema directly (dev only)
npm run db:studio     # open Drizzle Studio
```

Run the above against a running postgres (e.g. `docker compose -f docker-compose.dev.yml up -d db`);
`drizzle-kit` uses `DATABASE_URL` from `.env` or the fallback in `drizzle.config.ts`.

## Env vars

| Name | Default | Description |
|------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `3000` | port the API listens on |
| `LOG_LEVEL` | `debug` / `info` | logging level |
| `DATABASE_URL` | — | PostgreSQL connection string (required in production) |
| `DB_SSL` | `false` | enable TLS for the DB connection |
| `DB_POOL_MAX` | `10` | max Postgres pool size |
| `JWT_ACCESS_SECRET` | — | access token signing secret, min 32 chars (required in production) |
| `JWT_ACCESS_TTL_SECONDS` | `900` | access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | refresh token lifetime |
| `PASSWORD_RESET_TTL_MINUTES` | `30` | password reset token lifetime |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost (`10`–`15`) |
| `CORS_ORIGINS` | — | comma-separated allowed origins; empty = allow all in dev, deny in prod |
| `TRUST_PROXY` | `false` | trust `X-Forwarded-*` (set `true` behind a reverse proxy) |
| `APP_BASE_URL` | `http://localhost:5173` | base URL used to build password reset links |
| `ADMIN_PANEL_ENABLED` | `true` (non-prod) | serve the `/panel` testing panel |
| `LLM_CACHE_URL` | `https://llm-cache.makonew.com` | base URL of the external LLM cache service |
| `LLM_CACHE_ADMIN_TOKEN` | — | server-side token for the service's `/admin/api/*` |
| `LLM_CACHE_TIMEOUT_MS` | `120000` | timeout for calls to the cache service |
| `STORE_MODE` | `auto` | catalogue store: `auto` / `postgres` / `memory` |
| `MATCHMAKING_IMPORT_DIR` | _(unset)_ | directory of manual import JSON files |
| `AI_PROVIDER` | `auto` | AI provider: `auto` / `deterministic` / `http` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `AI_API_KEY` | _(unset)_ | server-side credential; enables the HTTP provider |
| `AI_MODEL` | `gpt-4o-mini` | chat/completions model |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` | embeddings model |
| `AI_EMBEDDING_DIMENSIONS` | `256` | fixed dimensionality of local embeddings |
| `AI_TIMEOUT_MS` | `15000` | upstream AI request timeout (ms) |
| `API_PORT` / `API_PORT_DEV` | `3000` / `4000` | host port mapping in prod / dev compose |
| `WAIT_FOR_DB` | `true` | entrypoint waits for the database before starting |
| `RUN_MIGRATIONS` | `true` | entrypoint applies pending migrations on start |
| `RUN_SEED` | `false` | entrypoint loads demo content on start (resets content tables) |
| `DB_WAIT_TIMEOUT` | `60` | seconds the entrypoint waits for the database |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | `backend` / `backend` / `backend` / `5432` | Postgres container settings |

## API

Full HTTP contract: [`API.md`](./API.md) (overall + AI matchmaking) and [`API2.md`](./API2.md)
(content/knowledge-base integration guide for the frontend, with a ready-to-paste TypeScript client).

Run the end-to-end endpoint tests against a running instance:

```bash
npm run test:e2e                 # defaults to http://localhost:4000
BASE_URL=https://host npm run test:e2e
```

Base path for auth: `/auth`. Errors use a consistent envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [] } }
```

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness |
| GET | `/health/ready` | — | Readiness (DB connectivity) |
| POST | `/auth/register` | — | Create an account, returns tokens |
| POST | `/auth/login` | — | Exchange credentials for tokens |
| POST | `/auth/refresh` | refresh token | Rotate refresh token, returns new pair |
| POST | `/auth/logout` | refresh token | Revoke a refresh token |
| GET | `/auth/me` | Bearer access token | Current user |
| POST | `/auth/forgot-password` | — | Send a reset link (always 202) |
| POST | `/auth/reset-password` | — | Set a new password from a reset token |

### LLM cache (client of the external service)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/llm/health` | — | Cache service liveness |
| GET | `/llm/models` | — | Model catalog |
| POST | `/llm/chat/completions` | — | Cached chat completion (`x-cache-space` forwarded) |
| GET | `/llm/admin/overview` | service token | Stats, spaces, settings, 24h events, effective config |
| GET/POST | `/llm/admin/spaces` | service token | List / create cache spaces |
| PATCH/DELETE | `/llm/admin/spaces/:id` | service token | Update / delete a space |
| POST | `/llm/admin/spaces/:id/{pause,resume,default,move}` | service token | Space lifecycle |
| GET/PUT | `/llm/admin/settings` | service token | Read / update settings |
| GET | `/llm/admin/entries` | service token | List entries (`spaceId`, `limit` ≤ 200, `offset`) |
| DELETE | `/llm/admin/entries/:id` | service token | Delete one entry |
| POST | `/llm/admin/cache/purge` | service token | Purge by `spaceId` or `{ expired: true }` |

### Examples

```bash
# register
curl -X POST http://localhost:4000/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'

# login
curl -X POST http://localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'

# authenticated request
curl http://localhost:4000/auth/me -H "authorization: Bearer <accessToken>"

# refresh (rotates: the old refresh token is revoked)
curl -X POST http://localhost:4000/auth/refresh \
  -H 'content-type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'

# forgot password (in dev the reset link is printed to the API logs)
curl -X POST http://localhost:4000/auth/forgot-password \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com"}'

# reset password
curl -X POST http://localhost:4000/auth/reset-password \
  -H 'content-type: application/json' \
  -d '{"token":"<token>","password":"NewPassw0rd!"}'
```

## Security notes

- Passwords hashed with bcrypt (cost from `BCRYPT_ROUNDS`); login equalizes timing when the user does not exist.
- Refresh tokens are random 256-bit values stored only as SHA-256 hashes, rotated on every use, and revoked on logout or password reset. Reset tokens are single-use and hashed too.
- Access tokens are short-lived HS256 JWTs; there is no token revocation list, so keep the TTL short.
- `helmet` sets secure headers; CORS is origin-restricted via `CORS_ORIGINS`; auth endpoints are rate limited.
- Email is a console stub — do not treat password reset as production-ready until a real provider is wired up.
- Set strong `JWT_ACCESS_SECRET` and `POSTGRES_PASSWORD` values, and `TRUST_PROXY=true` when behind a reverse proxy.
