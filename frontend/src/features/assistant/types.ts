// Shared API contract types for the AI assistant.
//
// Mirrors the backend contract described in docs/AI-AGENT-CONTRACT.md:
//   POST /api/assistant/messages
//   GET  /api/assistant/searches/:searchId?page=&pageSize=

export type TextMessageInput = {
  type: "text"
  text: string
}

export type ClarificationAnswerInput = {
  type: "clarification_answer"
  questionId: string
  selectedOptionIds: string[]
  additionalText?: string
}

export type AssistantMessageInput = TextMessageInput | ClarificationAnswerInput

export type SendAssistantMessageRequest = {
  conversationId?: string
  message: AssistantMessageInput
}

export type ClarificationOption = {
  id: string
  label: string
}

export type ClarificationSelectionMode = "single" | "multiple"

export type Clarification = {
  id: string
  question: string
  selectionMode: ClarificationSelectionMode
  options: ClarificationOption[]
  allowAdditionalText: boolean
}

export type ClarificationResponse = {
  type: "clarification"
  conversationId: string
  assistantMessage: string
  clarification: Clarification
}

export type RecommendationEligibility = "eligible" | "unknown"

export type RecommendationDetail = {
  label: string
  value: string
}

export type Recommendation = {
  id: string
  title: string
  summary: string
  matchExplanation: string
  eligibilityStatus: RecommendationEligibility
  eligibilityDescription?: string
  details: RecommendationDetail[]
  url?: string
}

export type Pagination = {
  page: number
  pageSize: number
  totalResults: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type SearchResult = {
  id: string
  recommendations: Recommendation[]
  pagination: Pagination
}

export type RecommendationsResponse = {
  type: "recommendations"
  conversationId: string
  assistantMessage: string
  search: SearchResult
}

export type AssistantMessageResponse = {
  type: "message"
  conversationId: string
  assistantMessage: string
}

export type AssistantAction = {
  label: string
  href: string
}

export type NoSolutionResponse = {
  type: "no_solution"
  conversationId: string
  assistantMessage: string
  action: AssistantAction
}

export type SendAssistantMessageResponse =
  | ClarificationResponse
  | RecommendationsResponse
  | NoSolutionResponse
  | AssistantMessageResponse

export type SearchPageResponse = {
  searchId: string
  recommendations: Recommendation[]
  pagination: Pagination
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

export type ClarificationAnswer = {
  selectedOptionIds: string[]
  additionalText?: string
}
