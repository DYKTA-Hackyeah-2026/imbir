import { ApiError } from './errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Query/route text parameter that must be a single, non-empty value when present. */
export function parseRequiredText(raw: unknown, field: string, maxLength: number): string | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw) || typeof raw !== 'string') {
    throw ApiError.validation(`Parametr „${field}” musi być pojedynczą wartością tekstową.`);
  }
  const value = raw.trim();
  if (value.length === 0) {
    throw ApiError.validation(`Parametr „${field}” nie może być pusty.`);
  }
  if (value.length > maxLength) {
    throw ApiError.validation(`Parametr „${field}” może mieć maksymalnie ${maxLength} znaków.`);
  }
  return value;
}

/** Optional query text: absent or blank becomes undefined. */
export function parseOptionalText(raw: unknown, field: string, maxLength: number): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw) || typeof raw !== 'string') {
    throw ApiError.validation(`Parametr „${field}” musi być pojedynczą wartością tekstową.`);
  }
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (value.length > maxLength) {
    throw ApiError.validation(`Parametr „${field}” może mieć maksymalnie ${maxLength} znaków.`);
  }
  return value;
}

/** Optional JSON body text: absent or blank becomes undefined. */
export function parseBodyText(raw: unknown, field: string, maxLength: number): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') {
    throw ApiError.validation(`Pole „${field}” musi być tekstem.`);
  }
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (value.length > maxLength) {
    throw ApiError.validation(`Pole „${field}” może mieć maksymalnie ${maxLength} znaków.`);
  }
  return value;
}

export function parseOptionalEmail(raw: unknown, field = 'contactEmail'): string | undefined {
  const value = parseBodyText(raw, field, 320);
  if (!value) return undefined;
  if (!EMAIL_PATTERN.test(value)) {
    throw ApiError.validation(`Pole „${field}” musi być poprawnym adresem e-mail.`);
  }
  return value;
}

export function parseInteger(
  raw: unknown,
  field: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined) return fallback;
  if (Array.isArray(raw) || typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw ApiError.validation(`Parametr „${field}” musi być liczbą całkowitą.`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw ApiError.validation(`Parametr „${field}” musi być liczbą z zakresu ${min}–${max}.`);
  }
  return value;
}

export function parsePositiveId(raw: unknown, field: string): number {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw ApiError.validation(`Niepoprawny identyfikator: „${field}”.`);
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw ApiError.validation(`Niepoprawny identyfikator: „${field}”.`);
  }
  return value;
}

/** Body number that must be an integer inside `[min, max]` when present. */
export function parseOptionalIntInRange(
  raw: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) {
    throw ApiError.validation(`Pole „${field}” musi być liczbą całkowitą z zakresu ${min}–${max}.`);
  }
  return raw;
}

/** Boolean sent as the query-string literal `"true"` / `"false"`. */
export function parseBooleanParam(raw: unknown, field: string): boolean | undefined {
  if (raw === undefined) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw ApiError.validation(`Parametr „${field}” musi mieć wartość „true” lub „false”.`);
}

/** Boolean sent as a real JSON boolean. */
export function parseBodyBoolean(raw: unknown, field: string): boolean | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'boolean') {
    throw ApiError.validation(`Pole „${field}” musi być wartością logiczną.`);
  }
  return raw;
}

export function parseOptionalDate(raw: unknown, field: string): Date | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') {
    throw ApiError.validation(`Pole „${field}” musi być datą w formacie ISO 8601.`);
  }
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    throw ApiError.validation(`Pole „${field}” musi być poprawną datą w formacie ISO 8601.`);
  }
  return value;
}
