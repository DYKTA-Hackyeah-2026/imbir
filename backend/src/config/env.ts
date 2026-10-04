import { config as loadEnv } from 'dotenv';
import { z } from 'zod';
import { EMBEDDING_DIMENSIONS } from './constants.js';

const nodeEnv = process.env.NODE_ENV ?? 'development';

loadEnv({
  path: [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'],
  quiet: true,
});

const booleanish = z.enum(['true', 'false']).transform((value) => value === 'true');

const DEV_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/backend';
const DEV_JWT_SECRET = 'dev-secret-change-me-at-least-32-characters-long';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .default(nodeEnv === 'production' ? 'info' : 'debug'),

  // The default is dev-only; production must supply DATABASE_URL via .env.
  DATABASE_URL: z.string().url().default(DEV_DATABASE_URL),
  DB_SSL: booleanish.default(false),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),

  // The default is dev-only; production must supply a strong secret.
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters').default(DEV_JWT_SECRET),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGINS: z.string().default(''),
  TRUST_PROXY: booleanish.default(false),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  ADMIN_PANEL_ENABLED: booleanish.default(nodeEnv !== 'production'),

  // Remote LLM cache service (see API.md). This backend is a client of that service.
  LLM_CACHE_URL: z.string().url().default('https://llm-cache.makonew.com'),
  LLM_CACHE_ADMIN_TOKEN: z.string().default(''),
  LLM_CACHE_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(120_000),

  // Matchmaking catalogue store: auto prefers PostgreSQL, then falls back to memory.
  STORE_MODE: z.enum(['auto', 'postgres', 'memory']).default('auto'),
  MATCHMAKING_IMPORT_DIR: z.string().optional(),

  // AI provider. `auto` uses the offline deterministic provider unless AI_API_KEY is set.
  AI_PROVIDER: z.enum(['auto', 'deterministic', 'http']).default('auto'),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(EMBEDDING_DIMENSIONS),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(15_000),

  // Assistant (program matchmaking) tuning. A candidate below this cosine
  // similarity is treated as "no solution" (the assistant offers to submit a new
  // idea) rather than being surfaced as a weak recommendation.
  ASSISTANT_SIMILARITY_THRESHOLD: z.coerce.number().min(-1).max(1).default(0.35),
  ASSISTANT_CANDIDATE_LIMIT: z.coerce.number().int().positive().max(100).default(20),
  ASSISTANT_PAGE_SIZE: z.coerce.number().int().positive().max(50).default(3),
  ASSISTANT_MAX_PAGE_SIZE: z.coerce.number().int().positive().max(100).default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  process.stderr.write(`Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

if (isProduction && env.JWT_ACCESS_SECRET === DEV_JWT_SECRET) {
  process.stderr.write('JWT_ACCESS_SECRET must be set to a strong value in production.\n');
  process.exit(1);
}

if (isProduction && env.DATABASE_URL === DEV_DATABASE_URL) {
  process.stderr.write('DATABASE_URL must be set to the production database in production.\n');
  process.exit(1);
}
