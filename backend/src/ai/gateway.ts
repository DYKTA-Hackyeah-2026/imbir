import type { Interpretation, MatchmakingInput } from '../matchmaking/domain.js';

/**
 * Server-side AI boundary. Credentials never leave this layer and never reach
 * the browser. Implementations must be safe to call without any network.
 */
export interface AiGateway {
  readonly kind: 'deterministic' | 'http';
  /** Embeds a batch of texts. Returns one vector per input, same order. */
  embed(texts: readonly string[]): Promise<number[][]>;
  /** Interprets a problem description while preserving the user's meaning. */
  interpret(input: MatchmakingInput): Promise<Interpretation>;
  /** True when a live provider call failed and deterministic fallback was used. */
  isDegraded(): boolean;
}
