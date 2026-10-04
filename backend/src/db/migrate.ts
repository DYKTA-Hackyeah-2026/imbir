import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDatabase, db, pool } from './client.js';

async function main(): Promise<void> {
  process.stdout.write('[db] ensuring pgvector extension...\n');
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
  process.stdout.write('[db] running migrations...\n');
  await migrate(db, { migrationsFolder: './drizzle' });
  process.stdout.write('[db] migrations complete\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[db] migration failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });
