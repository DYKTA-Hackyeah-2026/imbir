import type { AiGateway } from '../ai/gateway.js';

/**
 * Domain-facing embedding boundary. Concrete providers live in infrastructure,
 * so the assistant domain is never tied to a specific model.
 */
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

/** Adapts the shared AI gateway (deterministic or HTTP) to the embedding port. */
export function createEmbeddingProvider(ai: AiGateway): EmbeddingProvider {
  return {
    async embed(text: string): Promise<number[]> {
      const [vector] = await ai.embed([text]);
      if (!vector || vector.length === 0) {
        throw new Error('Embedding provider returned no vector');
      }
      return vector;
    },
  };
}
