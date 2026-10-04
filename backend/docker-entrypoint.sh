#!/bin/sh
# Container entrypoint for production/staging deployments (e.g. Dokploy).
#
# Behavior:
#   1. Optionally wait until the database accepts connections (WAIT_FOR_DB=true).
#   2. Optionally run pending Drizzle migrations (RUN_MIGRATIONS=true, default true).
#   3. Start the API as PID 1 (exec), so SIGTERM is handled gracefully.
#
# All flags are env-driven so the same image works for any environment.

set -eu

log() {
  printf '[entrypoint] %s\n' "$*"
}

RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEED="${RUN_SEED:-false}"
RUN_SEED_ASSISTANT="${RUN_SEED_ASSISTANT:-false}"
RUN_SEED_INNOVATIONS="${RUN_SEED_INNOVATIONS:-false}"
WAIT_FOR_DB="${WAIT_FOR_DB:-true}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"

wait_for_db() {
  if [ "$WAIT_FOR_DB" != "true" ]; then
    log "WAIT_FOR_DB=$WAIT_FOR_DB, skipping database wait"
    return 0
  fi

  log "waiting up to ${DB_WAIT_TIMEOUT}s for the database..."
  waited=0
  until node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    pool.query('select 1').then(() => { pool.end(); process.exit(0); }).catch(() => { pool.end(); process.exit(1); });
  " >/dev/null 2>&1; do
    waited=$((waited + 2))
    if [ "$waited" -ge "$DB_WAIT_TIMEOUT" ]; then
      log "database not reachable after ${DB_WAIT_TIMEOUT}s, giving up"
      return 1
    fi
    sleep 2
  done
  log "database is reachable"
}

run_migrations() {
  if [ "$RUN_MIGRATIONS" != "true" ]; then
    log "RUN_MIGRATIONS=$RUN_MIGRATIONS, skipping migrations"
    return 0
  fi
  log "applying database migrations..."
  node dist/db/migrate.js
  log "migrations complete"
}

run_developer_seed() {
  if [ "$RUN_SEED" != "true" ]; then
    return 0
  fi
  log "seeding demo content (RUN_SEED=true)..."
  node dist/db/seed.js
  log "seed complete"
}

run_innovations_seed() {
  if [ "$RUN_SEED_INNOVATIONS" != "true" ]; then
    return 0
  fi
  log "importing ROPS innovations (RUN_SEED_INNOVATIONS=true)..."
  # Idempotent upsert; non-fatal so a bad import never blocks API startup.
  if node dist/db/seed.innovations.js; then
    log "innovations import complete"
    # Make the imported innovations searchable by the assistant/chatbot.
    log "bridging innovations into the assistant programme index..."
    if node dist/assistant/seed.assistant-innovations.js; then
      log "assistant innovation bridge complete"
    else
      log "assistant innovation bridge failed (continuing startup)"
    fi
  else
    log "innovations import failed (continuing startup)"
  fi
}

run_assistant_seed() {
  if [ "$RUN_SEED_ASSISTANT" != "true" ]; then
    return 0
  fi
  log "seeding assistant programs (RUN_SEED_ASSISTANT=true)..."
  # Idempotent (skips when programs already exist) and non-fatal: a transient
  # failure must not prevent the API from starting.
  if node dist/assistant/program.seed.js; then
    log "assistant seed complete"
  else
    log "assistant seed failed (continuing startup)"
  fi
}

wait_for_db
run_migrations
run_developer_seed
run_innovations_seed
run_assistant_seed

log "starting API on port ${PORT:-3000}"
exec node dist/index.js
