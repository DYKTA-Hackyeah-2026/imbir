/**
 * Shared, environment-independent constants. The embedding dimensionality is the
 * contract between the configured embedding model and the pgvector column, so it
 * lives in one place and is referenced by both the schema and the config schema.
 */
export const EMBEDDING_DIMENSIONS = 256;
