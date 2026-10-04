import type { Interpretation, MatchmakingInput } from '../matchmaking/domain.js';
import { interpretProblem } from '../matchmaking/interpreter.js';
import { hashEmbedding } from '../matchmaking/text.js';
import type { AiGateway } from './gateway.js';

/**
 * Offline-first provider. It never calls the network, so the feature works in
 * demo mode and during tests while still producing deterministic results.
 */
export function createDeterministicGateway(embeddingDimensions: number): AiGateway {
  return {
    kind: 'deterministic',
    async embed(texts: readonly string[]): Promise<number[][]> {
      return texts.map((text) => hashEmbedding(text, embeddingDimensions));
    },
    async interpret(input: MatchmakingInput): Promise<Interpretation> {
      return interpretProblem(input);
    },
    isDegraded(): boolean {
      return false;
    },
  };
}
