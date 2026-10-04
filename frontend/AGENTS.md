Agent Instructions
Express 5 + TypeScript (NodeNext ESM) + Drizzle/PostgreSQL, Dockerized. Goal: small, fast, safe loops. Ship a change, verify it, move on.

Fast work loop
npm run typecheck        # ALWAYS run before calling a change done
npm run dev              # tsx watch, hot reload, http://localhost:4000
docker compose -f docker-compose.dev.yml up -d db   # if you need Postgres
npm run db:generate      # after every src/db/schema.ts change
There is no lint or test runner configured. npm run typecheck is the gate. Do not invent a test framework without being asked.

Keep diffs small and single-purpose. Prefer editing existing files over new abstractions.

Spin up as many subagents as you need to speed up the work. Parallelize independent reads, searches, and edits freely; there is no cap. Keep each subagent's scope tight and single-purpose, and reconcile results before acting.