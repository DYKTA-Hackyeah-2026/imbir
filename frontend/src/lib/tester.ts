/**
 * API client for the tester module (moduł „Tester innowacji”):
 * browsing tests, applying to test an innovation, ratings and feedback.
 */

import { apiFetch, parseError } from "./api"

export type TestStatus = "recruiting" | "active" | "completed" | "cancelled"
export type TestApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "completed"

export type InnovationTest = {
  id: number
  innovationId: string
  title: string
  description: string | null
  instructions?: string | null
  location: string | null
  maxTesters: number | null
  startAt: string | null
  endAt: string | null
  status: TestStatus
  createdAt: string
  updatedAt?: string
  innovationTitle: string | null
  innovationSummary: string | null
  innovationSynthetic?: boolean | null
  applicationsCount?: number
  acceptedCount?: number
  slotsLeft?: number | null
}

export type TestApplication = {
  id: number
  testId: number
  userId?: number
  motivation: string | null
  status: TestApplicationStatus
  createdAt: string
  updatedAt?: string
}

export type TesterFeedback = {
  id: number
  applicationId: number
  overallRating: number
  usefulnessRating: number | null
  easeOfUseRating: number | null
  wouldUseAgain: boolean | null
  whatWorked: string | null
  problems: string | null
  suggestions: string | null
  comment: string | null
  answers: Record<string, unknown>
  createdAt: string | null
  updatedAt?: string
}

export type FeedbackEntry = TesterFeedback & {
  applicationStatus: TestApplicationStatus
}

export type InnovationFeedbackAggregate = {
  innovationId: string
  applicationCount: number
  feedbackCount: number
  averages: {
    overall: number | null
    usefulness: number | null
    easeOfUse: number | null
  }
  wouldUseAgainRatio: number | null
  data: FeedbackEntry[]
}

export type CatalogueInnovation = {
  innovationId: string
  title: string
  summary: string
  description: string
  evidenceStatus: "documented" | "partially_documented" | "synthetic"
  synthetic: boolean
  disclaimer: string
}

export type MyApplication = TestApplication & {
  test: InnovationTest & { innovation?: CatalogueInnovation | null }
  feedback: TesterFeedback | null
}

export type CreateTestPayload = {
  innovationId: string
  title: string
  description?: string
  instructions?: string
  location?: string
  maxTesters?: number
  startAt?: string
  endAt?: string
  status?: TestStatus
}

export type FeedbackPayload = {
  overallRating: number
  usefulnessRating?: number
  easeOfUseRating?: number
  wouldUseAgain?: boolean
  whatWorked?: string
  problems?: string
  suggestions?: string
  comment?: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Always revalidate so freshly created tests are never hidden by a cached list.
  const res = await apiFetch(path, { cache: "no-store", ...options })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

type DataEnvelope<T> = { message?: string; data: T }

export function listTests(params: {
  status?: TestStatus
  innovationId?: string
  limit?: number
  offset?: number
} = {}): Promise<{
  total: number
  count: number
  limit: number
  offset: number
  data: InnovationTest[]
}> {
  const search = new URLSearchParams()
  if (params.status) search.set("status", params.status)
  if (params.innovationId) search.set("innovationId", params.innovationId)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  const query = search.toString()
  return request(`/api/v1/tests${query ? `?${query}` : ""}`)
}

export async function getTest(testId: number): Promise<InnovationTest> {
  const body = await request<DataEnvelope<InnovationTest>>(`/api/v1/tests/${testId}`)
  return body.data
}

export async function createTest(payload: CreateTestPayload): Promise<InnovationTest> {
  const body = await request<DataEnvelope<InnovationTest>>("/api/v1/tests", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return body.data
}

export async function applyForTest(
  testId: number,
  motivation?: string,
): Promise<TestApplication> {
  const body = await request<DataEnvelope<TestApplication>>(
    `/api/v1/tests/${testId}/applications`,
    {
      method: "POST",
      body: JSON.stringify(motivation ? { motivation } : {}),
    },
  )
  return body.data
}

export function getMyApplications(): Promise<{ count: number; data: MyApplication[] }> {
  return request("/api/v1/tester/applications")
}

export async function submitTesterFeedback(
  applicationId: number,
  payload: FeedbackPayload,
): Promise<TesterFeedback> {
  const body = await request<DataEnvelope<TesterFeedback>>(
    `/api/v1/tester/applications/${applicationId}/feedback`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  )
  return body.data
}

export function getInnovationFeedback(
  innovationId: string,
): Promise<InnovationFeedbackAggregate> {
  return request(
    `/api/v1/innovations/${encodeURIComponent(innovationId)}/tester-feedback`,
  )
}

export async function getCatalogueInnovation(
  innovationId: string,
): Promise<CatalogueInnovation> {
  return request(`/api/v1/innovations/${encodeURIComponent(innovationId)}`)
}

export type CatalogueEvidenceStatus =
  | "documented"
  | "partially_documented"
  | "synthetic"

export type CatalogueSummary = {
  innovationId: string
  title: string
  summary: string
  synthetic: boolean
  evidenceStatus?: CatalogueEvidenceStatus
  problemTags?: string[]
  targetGroups?: string[]
  testedIn?: string[]
  applicableContexts?: string[]
  estimatedCostPln?: number | null
  timeframeWeeks?: number | null
}

export type CataloguePage = {
  total: number
  count: number
  limit: number
  offset: number
  data: CatalogueSummary[]
}

export async function listCatalogueInnovationsPage(
  params: { limit?: number; offset?: number } = {},
): Promise<CataloguePage> {
  // The backend caps `limit` at 50.
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 50)
  const offset = Math.max(params.offset ?? 0, 0)
  const search = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return request<CataloguePage>(`/api/v1/innovations?${search.toString()}`)
}

export async function listCatalogueInnovations(): Promise<CatalogueSummary[]> {
  const body = await listCatalogueInnovationsPage({ limit: 50, offset: 0 })
  return body.data
}
