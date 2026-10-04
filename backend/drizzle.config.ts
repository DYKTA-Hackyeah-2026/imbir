import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({
  path: [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'],
  quiet: true,
});

// The fallback credentials are dev-only; production must supply DATABASE_URL.
const databaseUrl =
  process.env.DATABASE_URL ??
  (nodeEnv === 'production' ? undefined : 'postgres://postgres:postgres@localhost:5432/backend');

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set to run drizzle-kit');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
