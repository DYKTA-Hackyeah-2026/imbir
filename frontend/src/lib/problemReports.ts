/**
 * API client for grassroots problem reports ("Zgłoś problem"): residents,
 * NGOs and institutions signal local problems; the list shows the review
 * status and the ROPS response.
 */

import { apiFetch, parseError } from "./api"

export type ProblemReportStatus =
  | "new"
  | "in_review"
  | "planned"
  | "resolved"
  | "rejected"

export type ProblemReporterType =
  | "resident"
  | "ngo"
  | "local_government"
  | "institution"
  | "other"

export type ProblemReport = {
  id: number
  title: string
  description: string
  category: string | null
  municipality: string | null
  county: string | null
  reporterType: ProblemReporterType
  status: ProblemReportStatus
  adminResponse: string | null
  createdAt: string
  updatedAt: string
}

export type CreateProblemReportPayload = {
  title: string
  description: string
  category?: string
  municipality?: string
  county?: string
  reporterType?: ProblemReporterType
  contactEmail?: string
}

export type ProblemReportUpdatePayload = {
  status?: ProblemReportStatus
  adminResponse?: string
}

type DataEnvelope<T> = { message?: string; data: T }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function listProblemReports(
  params: { status?: ProblemReportStatus; limit?: number; offset?: number } = {},
): Promise<{
  total: number
  count: number
  limit: number
  offset: number
  data: ProblemReport[]
}> {
  const search = new URLSearchParams()
  if (params.status) search.set("status", params.status)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  const query = search.toString()
  return request(`/api/v1/problem-reports${query ? `?${query}` : ""}`)
}

export async function createProblemReport(
  payload: CreateProblemReportPayload,
): Promise<ProblemReport> {
  const body = await request<DataEnvelope<ProblemReport>>("/api/v1/problem-reports", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return body.data
}

export async function getProblemReport(id: number): Promise<ProblemReport> {
  const body = await request<DataEnvelope<ProblemReport>>(`/api/v1/problem-reports/${id}`)
  return body.data
}

export async function updateProblemReport(
  id: number,
  payload: ProblemReportUpdatePayload,
): Promise<ProblemReport> {
  const body = await request<DataEnvelope<ProblemReport>>(
    `/api/v1/problem-reports/${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  )
  return body.data
}
