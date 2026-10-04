import { ApiError } from '../http/errors.js';
import type { AssistantMessageInput, SendAssistantMessageRequest } from './domain.js';

const MAX_CONVERSATION_ID = 100;
const MAX_TEXT = 5000;
const MAX_ADDITIONAL_TEXT = 2000;
const MAX_SELECTED_OPTIONS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw ApiError.validation(`Pole „${field}” musi być tekstem.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw ApiError.validation(`Pole „${field}” jest wymagane.`);
  }
  if (trimmed.length > maxLength) {
    throw ApiError.validation(`Pole „${field}” jest zbyt długie (maks. ${maxLength} znaków).`);
  }
  return trimmed;
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredString(value, field, maxLength);
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function strictPositiveInt(value: string, field: string): number {
  if (!/^\d+$/.test(value)) {
    throw ApiError.validation(`Parametr „${field}” musi być liczbą całkowitą.`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw ApiError.validation(`Parametr „${field}” musi być dodatnią liczbą całkowitą.`);
  }
  return parsed;
}

function parseMessage(value: unknown): AssistantMessageInput {
  if (!isRecord(value)) {
    throw ApiError.validation('Pole „message” musi być obiektem.');
  }

  if (value.type === 'text') {
    return { type: 'text', text: requiredString(value.text, 'message.text', MAX_TEXT) };
  }

  if (value.type === 'clarification_answer') {
    const questionId = requiredString(value.questionId, 'message.questionId', MAX_CONVERSATION_ID);

    if (!Array.isArray(value.selectedOptionIds)) {
      throw ApiError.validation('Pole „message.selectedOptionIds” musi być tablicą identyfikatorów.');
    }
    if (value.selectedOptionIds.length > MAX_SELECTED_OPTIONS) {
      throw ApiError.validation(
        `Pole „message.selectedOptionIds” może zawierać maks. ${MAX_SELECTED_OPTIONS} pozycji.`,
      );
    }
    const selectedOptionIds = value.selectedOptionIds.map((optionId, index) =>
      requiredString(optionId, `message.selectedOptionIds[${index}]`, MAX_CONVERSATION_ID),
    );

    return {
      type: 'clarification_answer',
      questionId,
      selectedOptionIds,
      additionalText: optionalString(
        value.additionalText,
        'message.additionalText',
        MAX_ADDITIONAL_TEXT,
      ),
    };
  }

  throw ApiError.validation('Pole „message.type” musi mieć wartość „text” lub „clarification_answer”.');
}

export function parseAssistantMessageInput(body: unknown): SendAssistantMessageRequest {
  if (!isRecord(body)) {
    throw ApiError.validation('Treść żądania musi być obiektem JSON.');
  }
  return {
    conversationId: optionalString(body.conversationId, 'conversationId', MAX_CONVERSATION_ID),
    message: parseMessage(body.message),
  };
}

export function parseSearchId(value: unknown): string {
  return requiredString(value, 'searchId', MAX_CONVERSATION_ID);
}

export function parseSearchPagination(
  query: Record<string, unknown>,
  limits: { defaultPageSize: number; maxPageSize: number },
): { page: number; pageSize: number } {
  const rawPage = firstQueryValue(query.page);
  const rawPageSize = firstQueryValue(query.pageSize);

  const page = rawPage === undefined ? 1 : strictPositiveInt(rawPage, 'page');
  const pageSize =
    rawPageSize === undefined ? limits.defaultPageSize : strictPositiveInt(rawPageSize, 'pageSize');

  if (pageSize > limits.maxPageSize) {
    throw ApiError.validation(`Parametr „pageSize” może wynosić maks. ${limits.maxPageSize}.`);
  }

  return { page, pageSize };
}
