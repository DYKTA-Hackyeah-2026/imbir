# Agent Instructions

Express 5 + TypeScript (NodeNext ESM) + Drizzle/PostgreSQL, Dockerized. Goal: **small, fast, safe loops**. Ship a change, verify it, move on.

## Fast work loop

```bash
npm run typecheck        # ALWAYS run before calling a change done
npm run dev              # tsx watch, hot reload, http://localhost:4000
docker compose -f docker-compose.dev.yml up -d db   # if you need Postgres
npm run db:generate      # after every src/db/schema.ts change
```

There is no lint or test runner configured. `npm run typecheck` is the gate. Do not invent a test framework without being asked.

Keep diffs small and single-purpose. Prefer editing existing files over new abstractions.

**Spin up as many subagents as you need to speed up the work.** Parallelize independent reads, searches, and edits freely; there is no cap. Keep each subagent's scope tight and single-purpose, and reconcile results before acting.

## Project shape

- `src/app.ts` — express app, middleware, route mounting
- `src/index.ts` — server bootstrap, graceful shutdown
- `src/config/config.ts` — **the only** place that reads `process.env`
- `src/db/schema.ts` — Drizzle tables; migrations generated into `drizzle/`
- `src/db/index.ts` — `pool` + `db` singleton
- `src/routes/*.routes.ts` — one router per resource

## Non-negotiable conventions

1. **ESM imports need `.js` extensions.** `import x from './foo.js'` even though the file is `foo.ts` (NodeNext). Getting this wrong breaks prod build only.
2. **Never read `process.env` outside `src/config/config.ts`.** Add the field to the `Env` interface and export it via `config`.
3. **Routes throw to `next(err)`.** Wrap async handlers in `try/catch` and call `next(err)`; an un-awaited rejection crashes the whole process (`index.ts` exits on `unhandledRejection`).
4. **SQL goes through Drizzle.** Use `eq()`, `and()`, placeholders — never string-concatenate SQL. User input is not SQL.
5. **Validate every request input.** Check types/ranges before use; do not trust `req.body`, `req.params`, or `req.query`. Reject with `400`.
6. **Update `src/db/schema.ts` + run `db:generate`** for schema changes. Never hand-edit files in `drizzle/`.

## Security guardrails

- **Secrets never enter git.** `.env` is gitignored; only `*.example` files are committed. Never paste real credentials into code, docs, logs, or compose defaults.
- **The `postgres:postgres` default in `config.ts`, `drizzle.config.ts`, and `docker-compose.yml` is dev-only.** Production must supply `DATABASE_URL` via `.env`. Do not ship a change that relies on the hardcoded password.
- **Keep `express.json({ limit: '1mb' })`.** Removing/raising the body limit is a DoS footgun.
- **Keep `app.disable('x-powered-by')`.**
- **Do not leak internals.** There is currently **no error-handling middleware** in `app.ts`: Express's default handler returns stack traces and HTML. When adding error handling, log server-side and return a generic JSON error (never `err.message`/stack) in production.
- **Do not log secrets or full request bodies.** Error logs must not include credentials, tokens, or connection strings.
- **Non-root + `init: true` in Docker are intentional.** Preserve the non-root `USER app` in `Dockerfile`; don't run the API as root.
- **`db:push` is dev-only.** Production uses generated migrations (`db:migrate`), never `db:push`.
- **Bind only what you need.** Don't expose Postgres ports publicly in prod; only the API port should be published.

## Known gaps (fix when you touch the area)

- `app.ts` has no error handler despite routes calling `next(err)`.
- `Number.parseInt(req.params.id, 10)` accepts `"12abc"`; use a strict integer check.
- Prod compose hardcodes the DB password (`docker-compose.yml:20,34`).
- No test/lint tooling; add deliberately, not by reflex.

## Definition of done

`npm run typecheck` passes, the touched endpoint still works against a running DB, no secret is added to the diff, and the change stays scoped to the task.
