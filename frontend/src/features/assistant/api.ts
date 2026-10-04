import { API_BASE, ApiError, parseError } from "@/lib/api"

import type {
  Clarification,
  ClarificationResponse,
  NoSolutionResponse,
  Pagination,
  Recommendation,
  RecommendationsResponse,
  SearchPageResponse,
  SearchResult,
  SendAssistantMessageRequest,
  SendAssistantMessageResponse,
} from "./types"

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Fetch with a hard timeout. The assistant endpoint returns a complete JSON
 * response (no streaming), so a single bounded request is enough.
 */
async function assistantFetch(
  path: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "Przekroczono czas oczekiwania.")
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

export async function sendAssistantMessage(
  request: SendAssistantMessageRequest,
): Promise<SendAssistantMessageResponse> {
  const res = await assistantFetch("/api/assistant/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(request),
  })
  if (!res.ok) throw await parseError(res)
  return parseSendResponse(await res.json())
}

export async function getSearchPage(
  searchId: string,
  page: number,
  pageSize = 3,
): Promise<SearchPageResponse> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  const res = await assistantFetch(
    `/api/assistant/searches/${encodeURIComponent(searchId)}?${query.toString()}`,
    { headers: { Accept: "application/json" } },
  )
  if (!res.ok) throw await parseError(res)
  return parseSearchPage(await res.json())
}

// ---------------------------------------------------------------------------
// Friendly messages
// ---------------------------------------------------------------------------

export function assistantErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "TIMEOUT" || error.status === 408) {
      return "Odpowiedź trwa zbyt długo. Sprawdź połączenie z internetem i spróbuj ponownie."
    }
    if (error.code === "INVALID_RESPONSE") {
      return "Nie udało się odczytać odpowiedzi asystenta. Spróbuj ponownie za chwilę."
    }
    if (error.status === 429) {
      return "Zbyt wiele zapytań naraz. Poczekaj chwilę i spróbuj ponownie."
    }
    if (error.status >= 500) {
      return "Usługa jest chwilowo niedostępna. Spróbuj ponownie później."
    }
    if (error.status >= 400) {
      return "Nie udało się przetworzyć Twojego pytania. Spróbuj ponownie."
    }
    return error.message
  }
  if (error instanceof TypeError) {
    return "Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie."
  }
  return "Coś poszło nie tak. Spróbuj ponownie."
}

// ---------------------------------------------------------------------------
// Defensive response validation (never trust the payload shape blindly)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function invalidResponse(): ApiError {
  return new ApiError(502, "INVALID_RESPONSE", "Odpowiedź serwera ma nieoczekiwany format.")
}

function parseRecommendation(value: unknown): Recommendation | null {
  if (!isRecord(value)) return null
  const id = asString(value.id)
  const title = asString(value.title)
  if (!id || !title) return null

  const details = Array.isArray(value.details)
    ? value.details
        .filter(isRecord)
        .map((detail) => ({
          label: asString(detail.label),
          value: asString(detail.value),
        }))
        .filter((detail) => detail.label && detail.value)
    : []

  const eligibilityStatus =
    value.eligibilityStatus === "eligible" ? "eligible" : "unknown"

  return {
    id,
    title,
    summary: asString(value.summary),
    matchExplanation: asString(value.matchExplanation),
    eligibilityStatus,
    eligibilityDescription: asString(value.eligibilityDescription) || undefined,
    details,
    url: asString(value.url) || undefined,
  }
}

function parseRecommendations(value: unknown): Recommendation[] {
  if (!Array.isArray(value)) return []
  return value
    .map(parseRecommendation)
    .filter((item): item is Recommendation => item !== null)
}

function parsePagination(value: unknown, total = 0): Pagination {
  if (!isRecord(value)) {
    return {
      page: 1,
      pageSize: total || 3,
      totalResults: total,
      totalPages: total > 0 ? 1 : 0,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  }
  const page = Math.max(1, asNumber(value.page, 1))
  const pageSize = Math.max(1, asNumber(value.pageSize, 3))
  const totalResults = Math.max(0, asNumber(value.totalResults, total))
  const totalPages = Math.max(0, asNumber(value.totalPages, totalResults > 0 ? 1 : 0))
  return {
    page,
    pageSize,
    totalResults,
    totalPages,
    hasNextPage: value.hasNextPage === true || page < totalPages,
    hasPreviousPage: value.hasPreviousPage === true || page > 1,
  }
}

function parseSearch(value: unknown): SearchResult {
  if (!isRecord(value)) throw invalidResponse()
  const recommendations = parseRecommendations(value.recommendations)
  return {
    id: asString(value.id),
    recommendations,
    pagination: parsePagination(value.pagination, recommendations.length),
  }
}

export function parseSendResponse(data: unknown): SendAssistantMessageResponse {
  if (!isRecord(data)) throw invalidResponse()
  const conversationId = asString(data.conversationId)
  if (!conversationId || typeof data.type !== "string") throw invalidResponse()

  if (data.type === "clarification") {
    if (!isRecord(data.clarification)) throw invalidResponse()
    const raw = data.clarification
    const id = asString(raw.id)
    const question = asString(raw.question)
    if (!id || !question) throw invalidResponse()

    const options = Array.isArray(raw.options)
      ? raw.options
          .filter(isRecord)
          .map((option) => ({ id: asString(option.id), label: asString(option.label) }))
          .filter((option) => option.id && option.label)
      : []

    const clarification: Clarification = {
      id,
      question,
      selectionMode: raw.selectionMode === "single" ? "single" : "multiple",
      options,
      allowAdditionalText: raw.allowAdditionalText === true,
    }

    const response: ClarificationResponse = {
      type: "clarification",
      conversationId,
      assistantMessage: asString(data.assistantMessage),
      clarification,
    }
    return response
  }

  if (data.type === "recommendations") {
    const search = parseSearch(data.search)
    if (!search.id) throw invalidResponse()
    const response: RecommendationsResponse = {
      type: "recommendations",
      conversationId,
      assistantMessage: asString(data.assistantMessage),
      search,
    }
    return response
  }

  if (data.type === "message") {
    return {
      type: "message",
      conversationId,
      assistantMessage: asString(data.assistantMessage),
    }
  }

  if (data.type === "no_solution") {
    if (!isRecord(data.action)) throw invalidResponse()
    const label = asString(data.action.label)
    const href = asString(data.action.href)
    if (!label || !href) throw invalidResponse()
    const response: NoSolutionResponse = {
      type: "no_solution",
      conversationId,
      assistantMessage: asString(data.assistantMessage),
      action: { label, href },
    }
    return response
  }

  throw invalidResponse()
}

export function parseSearchPage(data: unknown): SearchPageResponse {
  if (!isRecord(data)) throw invalidResponse()
  const searchId = asString(data.searchId)
  if (!searchId) throw invalidResponse()
  const recommendations = parseRecommendations(data.recommendations)
  return {
    searchId,
    recommendations,
    pagination: parsePagination(data.pagination, recommendations.length),
  }
}
