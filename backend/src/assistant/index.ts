import type { AiGateway } from '../ai/gateway.js';
import config from '../config/config.js';
import { PostgresConversationRepository } from './conversation.repository.js';
import { createEmbeddingProvider } from './embedding.js';
import { createAssistantLlm } from './llm.js';
import { PostgresProgramRepository } from './program.repository.js';
import { PostgresSearchRepository } from './search.repository.js';
import { AssistantService } from './service.js';

/**
 * Wires the assistant use case with its PostgreSQL infrastructure. The AI
 * gateway already chooses between deterministic and HTTP embeddings.
 */
export function createAssistantService(ai: AiGateway): AssistantService {
  const embeddings = createEmbeddingProvider(ai);
  return new AssistantService({
    programs: new PostgresProgramRepository(embeddings),
    conversations: new PostgresConversationRepository(),
    searches: new PostgresSearchRepository(),
    embeddings,
    llm: createAssistantLlm(),
    similarityThreshold: config.assistant.similarityThreshold,
    candidateLimit: config.assistant.candidateLimit,
    maxRecommendations: config.assistant.maxRecommendations,
    defaultPageSize: config.assistant.defaultPageSize,
    maxPageSize: config.assistant.maxPageSize,
  });
}

export { AssistantService } from './service.js';
