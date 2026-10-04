import { API_BASE, parseError } from "./api"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MaterialType =
  | "innovation"
  | "report"
  | "publication"
  | "guide"
  | "webinar"
  | "checklist"
  | "video"
  | "challenge_map"
  | "case_study"

export type MaterialFormat = "article" | "pdf" | "video" | "map"
export type ReportType = "report" | "publication"
export type LearningType = "guide" | "webinar" | "checklist"
export type SortOrder = "publishedAt" | "-publishedAt" | "title"

export type Category = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  accent: string
  materialCount: number
  sortOrder: number
}

export type Topic = {
  id: string
  slug: string
  name: string
  icon: string
  materialCount: number
}

export type CategoryRef = { id: string; slug: string; name: string }
export type TopicRef = { id: string; slug: string; name: string }

export type MaterialSummary = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  type: string
  typeLabel: string
  format: string
  publishedAt: string | null
  updatedAt: string
  coverUrl: string | null
  thumbnailUrl: string | null
  tags: string[]
  category: CategoryRef | null
  topics: TopicRef[]
  author: string | null
  region: string | null
  language: string
  isFeatured: boolean
  fileUrl: string | null
  fileType: string | null
  fileSizeBytes: number | null
  durationSeconds: number | null
  pages: number | null
  videoUrl: string | null
  badge?: string
}

export type Attachment = {
  name: string
  url: string
  type: string
  sizeBytes: number | null
}

export type MaterialDetail = MaterialSummary & {
  body: string | null
  gallery: string[]
  attachments: Attachment[]
  related: MaterialSummary[]
}

export type Facet = { slug: string; name: string; count: number }
export type Facets = { categories: Facet[]; topics: Facet[]; types: Facet[] }

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type Paginated<T> = { data: T[]; meta: PaginationMeta }
export type SearchResult = Paginated<MaterialSummary> & { facets: Facets }
export type PopularSearch = { term: string; searches: number }

export type HomeAggregate = {
  categories: Category[]
  topics: Topic[]
  featured: MaterialSummary[]
  reports: MaterialSummary[]
  learning: MaterialSummary[]
  mostSearched: PopularSearch[]
}

export type ContactInput = {
  name: string
  email: string
  subject?: string
  message: string
}

export type FieldError = { path: string; message: string }

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function toCsv(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return value.length ? value.join(",") : undefined
  return value.trim() !== "" ? value : undefined
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null || raw === "") continue
    const value = Array.isArray(raw)
      ? toCsv(raw as string[])
      : String(raw as string | number | boolean)
    if (value !== undefined && value !== "") search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

async function contentGet<T>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}${buildQuery(params)}`, {
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export type MaterialsQuery = {
  type?: string | string[]
  category?: string
  topic?: string | string[]
  featured?: boolean
  search?: string
  sort?: SortOrder
  page?: number
  limit?: number
}

export function getHome(): Promise<HomeAggregate> {
  return contentGet<HomeAggregate>("/content/home")
}

export async function getCategories(): Promise<Category[]> {
  return (await contentGet<{ data: Category[] }>("/content/categories")).data
}

export async function getTopics(): Promise<Topic[]> {
  return (await contentGet<{ data: Topic[] }>("/content/topics")).data
}

export function getMaterials(
  query: MaterialsQuery = {},
): Promise<Paginated<MaterialSummary>> {
  return contentGet<Paginated<MaterialSummary>>("/content/materials", {
    ...query,
  })
}

export async function getFeaturedMaterials(params: {
  limit?: number
  topic?: string | string[]
  category?: string
} = {}): Promise<MaterialSummary[]> {
  return (
    await contentGet<{ data: MaterialSummary[] }>(
      "/content/materials/featured",
      params,
    )
  ).data
}

export function getMaterial(slug: string): Promise<MaterialDetail> {
  return contentGet<MaterialDetail>(
    `/content/materials/${encodeURIComponent(slug)}`,
  )
}

/** URL that redirects (302) to the file with Content-Disposition. Use in an <a>. */
export function getMaterialDownloadUrl(id: string): string {
  return `${API_BASE}/content/materials/${encodeURIComponent(id)}/download`
}

export type ReportsQuery = {
  type?: ReportType
  year?: number
  topic?: string | string[]
  category?: string
  sort?: SortOrder
  page?: number
  limit?: number
}

export function getReports(
  query: ReportsQuery = {},
): Promise<Paginated<MaterialSummary>> {
  return contentGet<Paginated<MaterialSummary>>("/content/reports", { ...query })
}

export type LearningQuery = {
  type?: LearningType
  topic?: string | string[]
  category?: string
  sort?: SortOrder
  page?: number
  limit?: number
}

export function getLearning(
  query: LearningQuery = {},
): Promise<Paginated<MaterialSummary>> {
  return contentGet<Paginated<MaterialSummary>>("/content/learning", {
    ...query,
  })
}

export type SearchQuery = {
  q?: string
  type?: string | string[]
  category?: string
  topic?: string | string[]
  page?: number
  limit?: number
}

export function searchContent(query: SearchQuery = {}): Promise<SearchResult> {
  return contentGet<SearchResult>("/content/search", { ...query })
}

export async function getPopularSearches(
  limit = 5,
): Promise<PopularSearch[]> {
  return (
    await contentGet<{ data: PopularSearch[] }>("/content/search/popular", {
      limit,
    })
  ).data
}

export async function submitContact(input: ContactInput): Promise<void> {
  const res = await fetch(`${API_BASE}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw await parseError(res)
}

// ---------------------------------------------------------------------------
// Formatting & localization helpers
// ---------------------------------------------------------------------------

export function formatDuration(
  seconds: number | null | undefined,
): string {
  if (seconds == null || seconds < 0) return ""
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return ""
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const CONTACT_VALIDATION_MESSAGES: Record<string, string> = {
  "Name is required": "Podaj imię i nazwisko.",
  "Name must be at least 2 characters": "Imię i nazwisko musi mieć co najmniej 2 znaki.",
  "Invalid email address": "Podaj poprawny adres e-mail.",
  "Invalid email": "Podaj poprawny adres e-mail.",
  "Subject must be at most 300 characters": "Temat może mieć maksymalnie 300 znaków.",
  "Message must be at least 10 characters": "Wiadomość musi mieć co najmniej 10 znaków.",
  "Message must be at most 5000 characters": "Wiadomość może mieć maksymalnie 5000 znaków.",
}

export function localizeFieldErrors(details: FieldError[]): Record<string, string> {
  return Object.fromEntries(
    details.map((detail) => [
      detail.path,
      CONTACT_VALIDATION_MESSAGES[detail.message] ?? detail.message,
    ]),
  )
}
