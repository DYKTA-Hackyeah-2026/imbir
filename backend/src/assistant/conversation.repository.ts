import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, messages } from '../db/schema.js';
import { parseConversationState, type ConversationState } from './domain.js';

export interface Conversation {
  id: string;
  state: ConversationState;
}

export type MessageRole = 'user' | 'assistant';

export interface ConversationRepository {
  create(state: ConversationState): Promise<Conversation>;
  get(id: string): Promise<Conversation | undefined>;
  updateState(id: string, state: ConversationState): Promise<void>;
  appendMessage(input: { conversationId: string; role: MessageRole; content: string }): Promise<void>;
}

export class PostgresConversationRepository implements ConversationRepository {
  async create(state: ConversationState): Promise<Conversation> {
    const [row] = await db.insert(conversations).values({ state }).returning();
    return { id: row.id, state: parseConversationState(row.state) };
  }

  async get(id: string): Promise<Conversation | undefined> {
    const [row] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return row ? { id: row.id, state: parseConversationState(row.state) } : undefined;
  }

  async updateState(id: string, state: ConversationState): Promise<void> {
    await db
      .update(conversations)
      .set({ state, updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async appendMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
  }): Promise<void> {
    await db.insert(messages).values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    });
  }
}
