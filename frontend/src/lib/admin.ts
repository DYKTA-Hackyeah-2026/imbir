/**
 * API client for the admin area (panel administratora): aggregate statistics
 * and the innovation acceptance workflow. All endpoints require an admin
 * session (Bearer token injected by `apiFetch`).
 */

import { apiFetch, parseError } from "./api"

export type SubmissionStatus =
  | "draft"
  | "completed"
  | "submitted"
  | "approved"
  | "rejected"

export type AdminSubmission = {
  id: number
  title: string
  description: string | null
  status: SubmissionStatus
  isAccepted: boolean
  currentStep: number
  createdAt: string
  updatedAt: string
  authorEmail: string | null
  authorName: string | null
}

export type AdminSubmissionList = {
  total: number
  count: number
  limit: number
  offset: number
  counts: { pending: number; accepted: number; rejected: number }
  data: AdminSubmission[]
}

export type AdminStats = {
  generatedAt: string
  users: { total: number; newThisWeek: number }
  innovations: { catalogue: number }
  submissions: {
    total: number
    pending: number
    accepted: number
    rejected: number
    newThisWeek: number
  }
  problemReports: {
    total: number
    new: number
    inReview: number
    planned: number
    resolved: number
    rejected: number
    newThisWeek: number
  }
  tests: { total: number; recruiting: number; active: number }
  testerApplications: { total: number; pending: number }
  matchmaking: { requests: number; feedback: number }
  categories: { category: string; count: number }[]
  activityByDay: { date: string; submissions: number; reports: number }[]
  recentSubmissions: Pick<
    AdminSubmission,
    "id" | "title" | "status" | "isAccepted" | "createdAt" | "authorEmail"
  >[]
  recentReports: {
    id: number
    title: string
    status: string
    category: string | null
    createdAt: string
  }[]
  recentActivity: {
    type: "submission" | "report" | "application" | "test"
    title: string
    at: string
    status: string
  }[]
}

export type AdminSubmissionUpdate = {
  isAccepted?: boolean
  status?: SubmissionStatus
}

type DataEnvelope<T> = { message?: string; data: T }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Always revalidate so freshly reviewed submissions are never hidden by a cache.
  const res = await apiFetch(path, { cache: "no-store", ...options })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/api/v1/admin/stats")
}

export function listAdminSubmissions(
  params: {
    q?: string
    accepted?: boolean
    status?: SubmissionStatus
    limit?: number
    offset?: number
  } = {},
): Promise<AdminSubmissionList> {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.accepted !== undefined) search.set("accepted", String(params.accepted))
  if (params.status) search.set("status", params.status)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  const query = search.toString()
  return request(`/api/v1/admin/submissions${query ? `?${query}` : ""}`)
}

export async function updateAdminSubmission(
  id: number,
  payload: AdminSubmissionUpdate,
): Promise<AdminSubmission> {
  const body = await request<DataEnvelope<AdminSubmission>>(
    `/api/v1/admin/submissions/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  )
  return body.data
}
