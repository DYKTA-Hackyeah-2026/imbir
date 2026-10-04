import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({
  path: [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'],
  quiet: true,
});

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/backend',
  },
  strict: true,
  verbose: true,
});
