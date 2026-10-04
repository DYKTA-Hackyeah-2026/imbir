import { createAiGateway } from './ai/index.js';
import { createApp } from './app.js';
import { createAssistantService } from './assistant/index.js';
import config from './config/config.js';
import { closeDatabase, pingDatabase } from './db/index.js';
import { initDatabase } from './db/init.js';
import { MatchmakingService } from './matchmaking/service.js';
import { createRepository } from './repositories/index.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const DB_CONNECT_ATTEMPTS = 5;
const DB_CONNECT_RETRY_MS = 2_000;

async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await pingDatabase();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[db] connection attempt ${attempt}/${DB_CONNECT_ATTEMPTS} failed: ${message}\n`);
      if (attempt === DB_CONNECT_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, DB_CONNECT_RETRY_MS));
    }
  }
}

async function start(): Promise<void> {
  let databaseReachable = false;

  if (config.storeMode === 'memory') {
    process.stderr.write('[api] STORE_MODE=memory: skipping database connection\n');
  } else {
    try {
      await waitForDatabase();
      databaseReachable = true;
    } catch {
      if (config.storeMode === 'postgres') {
        process.stderr.write('[api] unable to reach the database, exiting\n');
        process.exit(1);
      }
      process.stderr.write('[api] database unavailable, falling back to the in-memory store\n');
    }
  }

  if (databaseReachable) {
    void initDatabase().catch((err) => {
      process.stderr.write(`[db] Failed to seed database: ${err instanceof Error ? err.stack : String(err)}\n`);
    });
  }

  const { repository, warnings, hasVerifiedCatalogue } = await createRepository();
  const ai = createAiGateway();
  const matchmakingService = new MatchmakingService({
    repository,
    ai,
    seedWarnings: warnings,
    hasVerifiedCatalogue,
  });
  const assistantService = databaseReachable ? createAssistantService(ai) : undefined;
  const app = createApp({ matchmakingService, assistantService });

  for (const warning of warnings) {
    process.stderr.write(`[api] warning: ${warning}\n`);
  }
  process.stdout.write(
    `[api] catalogue store=${repository.kind} mode=${hasVerifiedCatalogue ? 'live' : 'demo'} ai=${ai.kind}\n`,
  );

  const server = app.listen(config.port, () => {
    process.stdout.write(
      `[api] listening on http://localhost:${config.port} (${config.nodeEnv})\n`,
    );
  });

  let shuttingDown = false;

  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    process.stdout.write(`[api] ${signal} received, shutting down\n`);

    const forceExit = setTimeout(() => {
      process.stderr.write('[api] graceful shutdown timed out, forcing exit\n');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => shutdown(signal));
  }

  process.on('unhandledRejection', (reason) => {
    process.stderr.write(`[api] unhandled rejection: ${String(reason)}\n`);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    process.stderr.write(`[api] uncaught exception: ${error.message}\n`);
    shutdown('uncaughtException');
  });
}

void start();
