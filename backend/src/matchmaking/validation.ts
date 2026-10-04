import { ApiError } from '../http/errors.js';
import {
  FEEDBACK_REASONS,
  USER_TYPES,
  type ClarificationAnswer,
  type ConstraintsInput,
  type FeedbackInput,
  type FeedbackReason,
  type LocationInput,
  type MatchmakingInput,
  type UserType,
} from './domain.js';

const MAX_DESCRIPTION = 5000;
const MIN_DESCRIPTION = 20;
const MAX_LIST_ITEMS = 20;
const MAX_ITEM_LENGTH = 160;
const MAX_ANSWER_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string, maxLength = MAX_ITEM_LENGTH): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw ApiError.validation(`Pole „${field}” musi być tekstem.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) {
    throw ApiError.validation(`Pole „${field}” jest zbyt długie (maks. ${maxLength} znaków).`);
  }
  return trimmed;
}

function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw ApiError.validation(`Pole „${field}” musi być tablicą tekstów.`);
  }
  if (value.length > MAX_LIST_ITEMS) {
    throw ApiError.validation(`Pole „${field}” może zawierać maks. ${MAX_LIST_ITEMS} pozycji.`);
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw ApiError.validation(`Każda pozycja pola „${field}” musi być tekstem.`);
    }
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_ITEM_LENGTH) {
      throw ApiError.validation(`Pozycja pola „${field}” jest zbyt długa (maks. ${MAX_ITEM_LENGTH} znaków).`);
    }
    out.push(trimmed);
  }
  return out;
}

function parseLocation(value: unknown): LocationInput | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw ApiError.validation('Pole „location” musi być obiektem.');
  }
  return {
    municipality: optionalString(value.municipality, 'location.municipality', 120),
    county: optionalString(value.county, 'location.county', 120),
  };
}

function parseConstraints(value: unknown): ConstraintsInput | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) {
    throw ApiError.validation('Pole „constraints” musi być obiektem.');
  }

  let budgetPln: number | undefined;
  if (value.budgetPln !== undefined && value.budgetPln !== null) {
    if (typeof value.budgetPln !== 'number' || !Number.isFinite(value.budgetPln) || value.budgetPln < 0) {
      throw ApiError.validation('Pole „constraints.budgetPln” musi być liczbą nieujemną.');
    }
    budgetPln = value.budgetPln;
  }

  let timeframeWeeks: number | undefined;
  if (value.timeframeWeeks !== undefined && value.timeframeWeeks !== null) {
    if (!Number.isInteger(value.timeframeWeeks) || (value.timeframeWeeks as number) <= 0) {
      throw ApiError.validation('Pole „constraints.timeframeWeeks” musi być dodatnią liczbą całkowitą.');
    }
    timeframeWeeks = value.timeframeWeeks as number;
  }

  return {
    budgetPln,
    timeframeWeeks,
    availableResources: optionalStringArray(value.availableResources, 'constraints.availableResources'),
    accessibilityNeeds: optionalStringArray(value.accessibilityNeeds, 'constraints.accessibilityNeeds'),
  };
}

function parseClarificationAnswers(value: unknown): ClarificationAnswer[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw ApiError.validation('Pole „clarificationAnswers” musi być tablicą.');
  }
  if (value.length > 10) {
    throw ApiError.validation('Pole „clarificationAnswers” może zawierać maks. 10 odpowiedzi.');
  }
  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw ApiError.validation('Każda odpowiedź doprecyzowująca musi być obiektem.');
    }
    const questionId = optionalString(entry.questionId, 'clarificationAnswers.questionId', 120);
    const answer = optionalString(entry.answer, 'clarificationAnswers.answer', MAX_ANSWER_LENGTH);
    if (!questionId || !answer) {
      throw ApiError.validation('Każda odpowiedź doprecyzowująca wymaga pól „questionId” i „answer”.');
    }
    return { questionId, answer };
  });
}

export function parseMatchmakingInput(body: unknown): MatchmakingInput {
  if (!isRecord(body)) {
    throw ApiError.validation('Treść żądania musi być obiektem JSON.');
  }

  const rawDescription = body.problemDescription;
  if (typeof rawDescription !== 'string') {
    throw ApiError.validation('Pole „problemDescription” jest wymagane i musi być tekstem.');
  }
  const problemDescription = rawDescription.trim();
  if (problemDescription.length < MIN_DESCRIPTION) {
    throw ApiError.validation(
      `Opis problemu jest zbyt krótki. Podaj co najmniej ${MIN_DESCRIPTION} znaków, aby dopasowanie było wiarygodne.`,
    );
  }
  if (problemDescription.length > MAX_DESCRIPTION) {
    throw ApiError.validation(`Opis problemu jest zbyt długi (maks. ${MAX_DESCRIPTION} znaków).`);
  }

  const rawUserType = body.userType;
  if (typeof rawUserType !== 'string' || !USER_TYPES.includes(rawUserType as UserType)) {
    throw ApiError.validation(
      `Pole „userType” musi mieć jedną z wartości: ${USER_TYPES.join(', ')}.`,
    );
  }

  return {
    problemDescription,
    userType: rawUserType as UserType,
    location: parseLocation(body.location),
    targetGroups: optionalStringArray(body.targetGroups, 'targetGroups'),
    constraints: parseConstraints(body.constraints),
    clarificationAnswers: parseClarificationAnswers(body.clarificationAnswers),
  };
}

export function parseFeedbackInput(body: unknown): FeedbackInput {
  if (!isRecord(body)) {
    throw ApiError.validation('Treść żądania musi być obiektem JSON.');
  }
  const innovationId = optionalString(body.innovationId, 'innovationId', 200);
  if (!innovationId) {
    throw ApiError.validation('Pole „innovationId” jest wymagane.');
  }
  if (typeof body.useful !== 'boolean') {
    throw ApiError.validation('Pole „useful” jest wymagane i musi być wartością logiczną.');
  }
  let reason: FeedbackReason | undefined;
  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string' || !FEEDBACK_REASONS.includes(body.reason as FeedbackReason)) {
      throw ApiError.validation(`Pole „reason” musi mieć jedną z wartości: ${FEEDBACK_REASONS.join(', ')}.`);
    }
    reason = body.reason as FeedbackReason;
  }
  return {
    innovationId,
    useful: body.useful,
    reason,
    comment: optionalString(body.comment, 'comment', MAX_ANSWER_LENGTH),
  };
}
