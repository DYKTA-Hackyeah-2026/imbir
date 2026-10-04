// Backwards-compatible alias for the canonical database singleton in `index.ts`.
// The auth/content/seed modules historically imported from `client.js`.
export { db, pool, pingDatabase, closeDatabase } from './index.js';
export type { Database } from './index.js';
