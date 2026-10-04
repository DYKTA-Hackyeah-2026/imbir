/**
 * API client for the creator ("kreator pomysłów") endpoints of the backend:
 * `GET/POST/PUT /innovations`. Responses are persisted in PostgreSQL by the
 * backend; `draft` records can be saved and resumed later.
 */

import { API_BASE, apiFetch, parseError } from "./api"

export type InnovationStatus =
  | "draft"
  | "completed"
  | "submitted"
  | "approved"
  | "rejected"

export type InnovationRecord = {
  id: number
  userId: number
  title: string
  description: string | null
  innovationType: string | null
  socialInclusionDescription: string | null
  deinstitutionalizationDescription: string | null
  innovationUniqueness: string | null
  existingSolutions: string | null
  problemDescription: string | null
  problemStatistics: string | null
  problemSources: string | null
  socialChallengesMapReference: string | null
  audienceDescription: string | null
  audienceNeeds: string | null
  exclusionRiskDescription: string | null
  expectedChange: string | null
  socialInclusionImpact: string | null
  futureVision: string | null
  scalabilityDescription: string | null
  implementationEase: string | null
  requestedGrantAmount: string | null
  teamExperience: string | null
  affordability: string | null
  simplicity: string | null
  status: InnovationStatus
  currentStep: number
  createdAt: string
  updatedAt: string
  problem?: {
    intensity: string | null
    frequency: string | null
    scale: string | null
  } | null
  actors?: { type: string; name: string; description: string | null }[]
  costs?: {
    type: string
    name: string
    amount: string | null
    description: string | null
  }[]
  audiences?: { type: string; value: string; customValue: string | null }[]
  revenue?: {
    validation: string | null
    mainSource: string | null
    scalability: string | null
    additionalSource: string | null
  } | null
  teamMembers?: {
    name: string
    role: string | null
    experience: string | null
    organization: string | null
  }[]
}

export type InnovationPayload = Record<string, unknown>

// ---------------------------------------------------------------------------
// Public catalogue (`/api/v1/innovations`) — library and innovation details
// ---------------------------------------------------------------------------

export type EvidenceStatus = "documented" | "partially_documented" | "synthetic"

export type InnovationSummary = {
  innovationId: string
  title: string
  summary: string
  sourceId: string
  evidenceStatus: EvidenceStatus
  synthetic: boolean
  problemTags: string[]
  targetGroups: string[]
  testedIn: string[]
  applicableContexts: string[]
  estimatedCostPln: number | null
  timeframeWeeks: number | null
}

export type InnovationListResponse = {
  total: number
  count: number
  limit: number
  offset: number
  mode: "live" | "demo"
  data: InnovationSummary[]
  warnings: string[]
}

export type InnovationDetail = {
  innovationId: string
  title: string
  summary: string
  description: string
  evidenceStatus: EvidenceStatus
  synthetic: boolean
  source: {
    sourceId: string
    title: string
    url?: string
    urlVerified: boolean
    kind: string
    synthetic: boolean
  }
  problemTags: string[]
  targetGroups: string[]
  testedIn: string[]
  applicableContexts: string[]
  prerequisites: string[]
  resourcesRequired: string[]
  estimatedCostPln: number | null
  timeframeWeeks: number | null
  citations: {
    sourceId: string
    title: string
    url?: string
    page?: number
    excerpt: string
  }[]
  disclaimer: string
}

export function listInnovations(
  params: {
    q?: string
    problemTag?: string
    targetGroup?: string
    evidenceStatus?: EvidenceStatus
    synthetic?: boolean
    sort?: "title" | "cost" | "timeframe"
    limit?: number
    offset?: number
  } = {},
): Promise<InnovationListResponse> {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.problemTag) search.set("problemTag", params.problemTag)
  if (params.targetGroup) search.set("targetGroup", params.targetGroup)
  if (params.evidenceStatus) search.set("evidenceStatus", params.evidenceStatus)
  if (params.synthetic !== undefined) search.set("synthetic", String(params.synthetic))
  if (params.sort) search.set("sort", params.sort)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  const query = search.toString()
  const path = `/api/v1/innovations${query ? `?${query}` : ""}`
  return fetchCatalogue<InnovationListResponse>(path)
}

export function getInnovationDetail(innovationId: string): Promise<InnovationDetail> {
  return fetchCatalogue<InnovationDetail>(
    `/api/v1/innovations/${encodeURIComponent(innovationId)}`,
  )
}

async function fetchCatalogue<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  })
  if (!res.ok) {
    const error = new Error(`Request failed (${res.status})`)
    ;(error as Error & { status?: number }).status = res.status
    throw error
  }
  return (await res.json()) as T
}

type DataEnvelope<T> = { message?: string; data: T }

export async function createInnovation(
  payload: InnovationPayload,
): Promise<InnovationRecord> {
  const res = await apiFetch("/innovations", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as DataEnvelope<InnovationRecord>
  return body.data
}

export async function updateInnovation(
  id: number,
  payload: InnovationPayload,
): Promise<InnovationRecord> {
  const res = await apiFetch(`/innovations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as DataEnvelope<InnovationRecord>
  return body.data
}

export async function getInnovation(id: number): Promise<InnovationRecord> {
  const res = await apiFetch(`/innovations/${id}`)
  if (!res.ok) throw await parseError(res)
  const body = (await res.json()) as DataEnvelope<InnovationRecord>
  return body.data
}
