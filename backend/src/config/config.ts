import { env, isProduction, isTest } from './env.js';

export type StoreMode = 'auto' | 'postgres' | 'memory';
export type AiProviderMode = 'auto' | 'deterministic' | 'http';

interface AiConfig {
  readonly provider: AiProviderMode;
  /** Base URL of an OpenAI-compatible API. Never exposed to the client. */
  readonly baseUrl: string;
  /** Server-side credential. Never sent to the browser. */
  readonly apiKey: string | undefined;
  /** Chat/completions model used for structured interpretation. */
  readonly model: string;
  /** Embeddings model. */
  readonly embeddingModel: string;
  /** Fixed dimensionality of locally computed embeddings. */
  readonly embeddingDimensions: number;
  /** Milliseconds before an upstream AI request is aborted. */
  readonly timeoutMs: number;
}

// Browsers send the Origin header without a trailing slash, so normalize
// configured origins the same way. A trailing slash would otherwise silently
// break CORS matching and WebSocket upgrade origin checks.
const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter((origin) => origin.length > 0);

const config = {
  nodeEnv: env.NODE_ENV,
  isProduction,
  isTest,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,

  databaseUrl: env.DATABASE_URL,
  dbSsl: env.DB_SSL,
  dbPoolMax: env.DB_POOL_MAX,

  jwtAccessSecret: env.JWT_ACCESS_SECRET,
  jwtAccessTtlSeconds: env.JWT_ACCESS_TTL_SECONDS,
  refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  passwordResetTtlMinutes: env.PASSWORD_RESET_TTL_MINUTES,
  bcryptRounds: env.BCRYPT_ROUNDS,

  corsOrigins,
  trustProxy: env.TRUST_PROXY,
  appBaseUrl: env.APP_BASE_URL,
  adminPanelEnabled: env.ADMIN_PANEL_ENABLED,

  llmCacheUrl: env.LLM_CACHE_URL.replace(/\/+$/, ''),
  llmCacheAdminToken: env.LLM_CACHE_ADMIN_TOKEN,
  llmCacheTimeoutMs: env.LLM_CACHE_TIMEOUT_MS,

  storeMode: env.STORE_MODE as StoreMode,
  /** Optional directory of manually imported (operator supplied) documents. */
  importDir: env.MATCHMAKING_IMPORT_DIR,
  ai: {
    provider: env.AI_PROVIDER as AiProviderMode,
    baseUrl: env.AI_BASE_URL,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
    embeddingModel: env.AI_EMBEDDING_MODEL,
    embeddingDimensions: env.AI_EMBEDDING_DIMENSIONS,
    timeoutMs: env.AI_TIMEOUT_MS,
  } satisfies AiConfig,

  assistant: {
    /** Minimum hybrid relevance (lexical + taxonomy + semantic) to recommend. */
    similarityThreshold: env.ASSISTANT_SIMILARITY_THRESHOLD,
    /** pgvector candidates retrieved before eligibility filtering and ranking. */
    candidateLimit: env.ASSISTANT_CANDIDATE_LIMIT,
    /** Maximum recommendations stored and returned for a single search. */
    maxRecommendations: env.ASSISTANT_MAX_RESULTS,
    defaultPageSize: env.ASSISTANT_PAGE_SIZE,
    maxPageSize: env.ASSISTANT_MAX_PAGE_SIZE,
  },
} as const;

export default config;
export type Config = typeof config;
