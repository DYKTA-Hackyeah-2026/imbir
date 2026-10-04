import config from '../config/config.js';
import { createDeterministicGateway } from './deterministic.js';
import type { AiGateway } from './gateway.js';
import { createHttpGateway } from './http.js';

/** Chooses the AI provider from configuration, always with an offline fallback. */
export function createAiGateway(): AiGateway {
  const deterministic = createDeterministicGateway(config.ai.embeddingDimensions);
  const wantHttp = config.ai.provider === 'http' || (config.ai.provider === 'auto' && Boolean(config.ai.apiKey));
  if (!wantHttp || !config.ai.apiKey) {
    return deterministic;
  }
  return createHttpGateway(
    {
      baseUrl: config.ai.baseUrl,
      apiKey: config.ai.apiKey,
      model: config.ai.model,
      embeddingModel: config.ai.embeddingModel,
      embeddingDimensions: config.ai.embeddingDimensions,
      timeoutMs: config.ai.timeoutMs,
    },
    deterministic,
  );
}

export type { AiGateway } from './gateway.js';
