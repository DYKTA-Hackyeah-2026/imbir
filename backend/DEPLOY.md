# Deploying to Dokploy (dev/staging)

This guide walks through deploying this backend to [Dokploy](https://dokploy.com) using the
repository's **Dockerfile** and a **Dokploy-managed PostgreSQL**. No prior Dokploy experience is
assumed.

The image is self-contained: on start it waits for the database, applies migrations, then runs the
API. You only need to provide environment variables in the Dokploy panel.

---

## Overview

| Item | Value |
|------|-------|
| Deploy method | Dockerfile (`backend/Dockerfile`, monorepo root context) |
| Container port | `3000` |
| Public routing | Dokploy/Traefik (HTTPS domain you assign) |
| Database | Dokploy-managed PostgreSQL |
| Migrations | Run automatically on container start (`RUN_MIGRATIONS=true`) |
| Health check | `GET /health` (Docker `HEALTHCHECK` included) |

---

## 1. Prerequisites

- A Dokploy instance reachable at `https://<your-dokploy-host>` and an account with access to a
  project.
- This repository pushed to a Git remote Dokploy can read (GitHub/GitLab/Bitbucket), branch
  `feauture` or `main`.
- A frontend origin you will allow via CORS (can be set later), e.g. `https://app.example.com`.
- The LLM cache admin token, if you will use the `/llm/admin/*` endpoints.

---

## 2. Create the PostgreSQL database

1. In Dokploy, open your **Project** → **Create Service** → **Database** → **PostgreSQL**.
2. Give it a name (e.g. `backend-db`). Note the generated **user**, **password**, and **database**.
3. After it is created, open the database's **Connection** / **Credentials** panel and copy the
   **Internal Connection URL** (the one with an internal host such as `backend-db-xxxx:5432`).

   > Use the **internal** URL for the API container. The internal host is only reachable inside the
   > Docker network Dokploy creates. The public URL is for external tools (psql/GUI) and is usually
   > not needed.

   The URL looks like:

   ```
   postgres://USER:PASSWORD@INTERNAL_HOST:5432/DBNAME
   ```

---

## 3. Create the application

1. In the same Project, **Create Service** → **Application**.
2. **Source**: connect your Git provider and select this monorepo and branch.
3. Set **Build Path** to `/` so the monorepo root is the build context.
4. **Build type**: choose **Dockerfile**.
   - **Dockerfile path**: `backend/Dockerfile`.
   - **Docker context path**: `.`.
   - Leave build args empty (none are required).
5. **Ports**: set the container port to **`3000`**. (Do not publish a host port; Traefik routes it.)
6. Save.

---

## 4. Set environment variables

Open the application's **Environment** tab and paste the following, replacing the placeholder values.
The full annotated list lives in [`.env.production.example`](./.env.production.example).

```dotenv
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Paste the Internal Connection URL from step 2:
DATABASE_URL=postgres://USER:PASSWORD@INTERNAL_HOST:5432/DBNAME
DB_SSL=false
DB_POOL_MAX=10

# Generate with: openssl rand -base64 48
JWT_ACCESS_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARS
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
PASSWORD_RESET_TTL_MINUTES=30
BCRYPT_ROUNDS=12

# Browser origins allowed to call the API (comma-separated):
CORS_ORIGINS=https://your-frontend-domain.example.com
# Behind Dokploy's Traefik:
TRUST_PROXY=true
APP_BASE_URL=https://your-frontend-domain.example.com
ADMIN_PANEL_ENABLED=false

# Remote LLM cache service:
LLM_CACHE_URL=https://llm-cache.makonew.com
LLM_CACHE_ADMIN_TOKEN=replace-with-the-service-admin-token
LLM_CACHE_TIMEOUT_MS=120000

# Startup behavior:
WAIT_FOR_DB=true
RUN_MIGRATIONS=true
DB_WAIT_TIMEOUT=60
```

Important notes:

- **`DATABASE_URL` must use the internal host.** Using the public URL will usually fail or be slower.
- **`JWT_ACCESS_SECRET` is required** and must be at least 32 characters. Rotating it invalidates all
  existing access tokens (users just re-login).
- **`TRUST_PROXY=true`** is important behind Traefik so rate limiting sees real client IPs.
- **`CORS_ORIGINS`** must include every browser origin that calls the API. If it is empty in
  production, browsers will be blocked.
- **`DB_SSL=false`** is correct for the internal Docker-network connection. Set `DB_SSL=true` only if
  your provider requires TLS.
- Set **`RUN_MIGRATIONS=false`** if you prefer to run migrations manually (see §7).

---

## 5. Configure the domain and deploy

1. Open the application's **Domains** tab → **Add Domain**.
   - Enter the hostname you want (e.g. `api.example.com`).
   - Set **Path** to `/`, **Container Port** to `3000`, enable **HTTPS** (Let's Encrypt).
2. Click **Deploy**. Dokploy builds `backend/Dockerfile` with the repository root as the context and starts the container.
3. Watch the **Logs**. A healthy start looks like:

   ```
   [entrypoint] waiting up to 60s for the database...
   [entrypoint] database is reachable
   [entrypoint] applying database migrations...
   [db] running migrations...
   [db] migrations complete
   [entrypoint] migrations complete
   [entrypoint] starting API on port 3000
   [api] listening on http://localhost:3000 (production)
   ```

---

## 6. Verify the deployment

Replace `https://api.example.com` with your domain.

```bash
# Liveness
curl https://api.example.com/health
# → {"status":"ok","env":"production","uptime":...}

# Readiness (checks the database)
curl https://api.example.com/health/ready
# → {"status":"ok","database":"up"}

# Register a user
curl -X POST https://api.example.com/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"Passw0rd!"}'
# → 201 with accessToken + refreshToken
```

If `/health/ready` returns `503` / `database":"down"`, the `DATABASE_URL` or network link is wrong
(re-check §2: internal host, correct password).

The full HTTP contract for the frontend is in [`API.md`](./API.md).

---

## 7. Migrations

Migrations run automatically on every container start (`RUN_MIGRATIONS=true`) and are idempotent —
Drizzle only applies new ones.

To load demo content on a fresh/staging environment, set `RUN_SEED=true`. This resets the content
tables (categories, topics, materials, search terms) and should **not** be enabled in production with
real content. You can also seed manually from the app Terminal: `node dist/db/seed.js`.

### Importing the ROPS Innovation Library

The image ships the public catalogue in `data/import/rops-innovations.json` (115 innovations from the
ROPS Innovation Library category pages; public titles and short summaries only, no personal data).
It loads it into `sources`, `innovations`, and `innovation_citations`.

- **On startup:** set `RUN_SEED_INNOVATIONS=true`. The import is idempotent (upsert by id) and
  non-fatal — a bad import logs a warning and the API still starts.
- **Manually:** open the application's **Terminal** and run:

  ```bash
  node dist/db/seed.innovations.js
  ```

  Or with a custom directory: `node dist/db/seed.innovations.js /app/data/import`.

Re-run it any time to refresh the catalogue; existing rows are updated, never duplicated.

The chatbot (`POST /api/assistant/messages`) only searches the `programs` table, so
`RUN_SEED_INNOVATIONS=true` also runs the assistant bridge right after the import
(`node dist/assistant/seed.assistant-innovations.js`). It upserts one `programs` row per
innovation with a deterministic embedding, which makes imported innovations show up as chat
recommendations. To run it manually from the Terminal:

```bash
node dist/assistant/seed.assistant-innovations.js
```

To run migrations manually instead:

1. Set `RUN_MIGRATIONS=false` in the app environment and redeploy.
2. Open the application's **Terminal** (Dokploy → application → Terminal) and run:

   ```bash
   node dist/db/migrate.js
   ```

**Adding a migration during development:**

```bash
# locally, with DATABASE_URL pointing at any dev DB (schema diff only):
npm run db:generate     # creates drizzle/0001_*.sql
git add drizzle && git commit && git push
# then redeploy; the new migration is applied on start
```

> The `drizzle/` folder is baked into the image, so migrations are always available at runtime.

---

## 8. Updating

Push to the connected branch. Dokploy can auto-deploy on push (enable **Auto Deploy** in the app's
settings) or you can click **Deploy** manually. The container is recreated and migrations re-run.

---

## 9. Rollbacks and data

- **Rollback code:** in Dokploy, redeploy a previous Git commit. Migrations already applied are not
  reverted automatically — if a migration changed the schema, roll it back deliberately.
- **Data:** the managed PostgreSQL stores data in its own Docker volume, independent of the API
  container, so redeploying the API does not touch your data.
- **Backups:** configure backups on the database service (Dokploy → database → Backups).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[entrypoint] database not reachable after 60s` then exit | Wrong `DATABASE_URL` (public host, bad password) or DB not started | Use the **internal** connection URL; ensure the database service is running; raise `DB_WAIT_TIMEOUT` |
| `/health/ready` → `503` | API can reach process but not DB | Re-check `DATABASE_URL`; verify `DB_SSL` matches provider |
| Browser requests blocked, no `Access-Control-Allow-Origin` | Origin not in `CORS_ORIGINS` | Add the exact frontend origin (scheme + host, no trailing slash) |
| Rate limits hit too early / wrong IP | `TRUST_PROXY` not set | Set `TRUST_PROXY=true` behind Traefik |
| `/llm/admin/*` → `500` "LLM_CACHE_ADMIN_TOKEN is not configured" | Missing token | Set `LLM_CACHE_ADMIN_TOKEN` |
| Migrations fail on start | DB user lacks DDL rights, or bad `DATABASE_URL` | Use the database owner credentials; run migrations manually in the Terminal (§7) |
| Container restarts in a loop right after start | Startup crash | Check Logs; `/health/ready` and env validation output are the usual causes |

You can also validate env locally before deploying:

```bash
docker build -t backend:test .
docker run --rm --env-file .env -p 3000:3000 backend:test
```

---

## 11. Files that make this work

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build; entrypoint waits for DB, migrates, starts API as non-root |
| `docker-entrypoint.sh` | DB wait + migrations + `exec` API (env-driven) |
| `.env.production.example` | Annotated list of all variables to paste into Dokploy |
| `drizzle/` | Migrations baked into the image |
| `docker-compose.yml` | For self-hosted Compose deployments (not used by Dokploy's Dockerfile mode) |

---

## 12. Optional: deploy the whole stack with docker-compose on Dokploy

If you prefer Dokploy to run the database and API together, use the **Docker Compose** deploy type
with the repo's `docker-compose.yml`. In that mode Dokploy reads `docker-compose.yml`, and you still
set the same variables (the compose file derives `DATABASE_URL` for the `db` service). The Dockerfile
method above is recommended because it lets you use Dokploy's managed PostgreSQL and its backups.

---

## 13. Assistant requires pgvector (important)

The assistant endpoints (`/api/assistant/*`) use a `vector(256)` column plus an HNSW index, and
`dist/db/migrate.js` runs `CREATE EXTENSION IF NOT EXISTS vector` before applying migrations.

**You do not need Node/npm on the server.** The Docker build stage installs dependencies and compiles
TypeScript; the runtime container only runs `node dist/...` via `docker-entrypoint.sh`. But the
**database must have the `vector` extension available**:

- The repo's `docker-compose.yml` already uses `pgvector/pgvector:pg17`, so the extension is present.
- **Dokploy's stock managed PostgreSQL does not ship pgvector.** Pointing the Dockerfile deployment at
  it makes the startup migration fail with `extension "vector" is not available`. Use a
  pgvector-capable database instead (the compose stack below, or a managed DB that includes pgvector).

### Recommended: deploy the prebuilt image + pgvector DB with Compose

On the server (Docker only, no npm):

```bash
git pull                       # or git clone <repo> && cd backend
cp .env.example .env           # then edit: POSTGRES_PASSWORD, JWT_ACCESS_SECRET, CORS_ORIGINS
docker compose up -d --build   # builds the image (npm runs *inside* the build), starts db + api
docker compose logs -f api
```

The container entrypoint waits for the DB, applies migrations (creating the extension and the
assistant tables), then starts the API. No `npm install`/`npm run` on the host.

Seed the example programs once (optional, idempotent) — either run the compiled seed in the container:

```bash
docker compose exec api node dist/assistant/program.seed.js
```

or set `RUN_SEED_ASSISTANT=true` in `.env` and restart the API service.

Notes:
- `CREATE EXTENSION` needs an owner/superuser. With the `pgvector/pgvector` image the `POSTGRES_USER`
  from `.env` is a superuser, so this works out of the box.
- If you keep a plain PostgreSQL server, install pgvector on it and create the extension as a
  superuser **before** first deploy, or the assistant migration will fail.
- Keep `AI_EMBEDDING_DIMENSIONS=256`; it must match the `vector(256)` column. `AI_PROVIDER=auto`
  falls back to offline deterministic embeddings when `AI_API_KEY` is empty.
- If you cannot run Docker on the server at all: build the image elsewhere
  (`docker build -t your-registry/backend:latest .`), push it, then `docker pull` and run it with the
  same env file — still no npm on the server.

