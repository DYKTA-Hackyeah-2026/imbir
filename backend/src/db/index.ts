import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import config from '../config/config.js';
import * as schema from './schema.js';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (error) => {
  process.stderr.write(`[db] idle client error: ${error.message}\n`);
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

export async function pingDatabase(): Promise<void> {
  await pool.query('select 1');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
