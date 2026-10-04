/**
 * API client for the hackathon backend.
 *
 * By default requests are sent to the same origin (relative paths). In
 * development the Vite dev server proxies `/auth`, `/llm` and `/health` to the
 * backend, which sidesteps the backend's cross-origin restrictions. Set
 * `VITE_API_URL` to talk to the backend directly (e.g. in production).
 */

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/+$/,
  "",
) ?? ""

const REFRESH_TOKEN_KEY = "acme.refreshToken"

function url(path: string): string {
  return `${API_BASE}${path}`
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export type FieldError = { path: string; message: string }

export async function parseError(res: Response): Promise<ApiError> {
  let code = "UNKNOWN"
  let message = res.statusText || `Request failed (${res.status})`
  let details: unknown

  try {
    const body: unknown = await res.json()
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>
      const err = record.error
      if (typeof err === "string") {
        code = err
        if (typeof record.message === "string") message = record.message
      } else if (err && typeof err === "object") {
        const inner = err as Record<string, unknown>
        if (inner.code !== undefined) code = String(inner.code)
        if (typeof inner.message === "string") message = inner.message
        details = inner.details
      } else if (typeof record.message === "string") {
        message = record.message
      }
    }
  } catch {
    /* non-JSON error body */
  }

  return new ApiError(res.status, code, message, details)
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "429" || /rate.?limit/i.test(error.message)) {
      return "Usługa jest chwilowo ograniczona. Spróbuj ponownie za chwilę."
    }
    if (error.code === "TOO_MANY_REQUESTS" || error.status === 429) {
      return "Zbyt wiele prób. Poczekaj chwilę i spróbuj ponownie."
    }
    if (error.status === 502 || error.code === "INTERNAL_SERVER_ERROR") {
      return "Usługa jest chwilowo niedostępna. Spróbuj ponownie później."
    }
    if (error.status >= 500) {
      return "Wystąpił błąd serwera. Spróbuj ponownie później."
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return "Coś poszło nie tak."
}

const VALIDATION_MESSAGES: Record<string, string> = {
  "Name must be at least 2 characters": "Nazwa musi mieć co najmniej 2 znaki.",
  "Name must be at most 60 characters": "Nazwa może mieć maksymalnie 60 znaków.",
  "Password must contain a digit": "Hasło musi zawierać cyfrę.",
  "Password must contain a lowercase letter": "Hasło musi zawierać małą literę.",
  "Password must contain an uppercase letter": "Hasło musi zawierać wielką literę.",
  "Password must be at most 72 bytes": "Hasło jest zbyt długie.",
  "Invalid email": "Nieprawidłowy adres e-mail.",
  "Invalid input": "Nieprawidłowa wartość.",
}

export function validationDetails(error: unknown): FieldError[] {
  if (error instanceof ApiError && Array.isArray(error.details)) {
    return error.details
      .filter(
        (item): item is FieldError =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as FieldError).path === "string" &&
          typeof (item as FieldError).message === "string",
      )
      .map((item) => ({
        path: item.path,
        message: VALIDATION_MESSAGES[item.message] ?? item.message,
      }))
  }
  return []
}

// ---------------------------------------------------------------------------
// Session / token storage
// ---------------------------------------------------------------------------

export type User = {
  id: string
  name: string
  email: string
  role: string
  isAdmin: boolean
  createdAt: string
}

export type AuthSession = {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}

let accessToken: string | null = null
let refreshToken: string | null = localStorage.getItem(REFRESH_TOKEN_KEY)

function storeSession(session: AuthSession): void {
  accessToken = session.accessToken
  refreshToken = session.refreshToken
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
}

export function clearSession(): void {
  accessToken = null
  refreshToken = null
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function hasStoredSession(): boolean {
  return Boolean(refreshToken)
}

let refreshInFlight: Promise<AuthSession | null> | null = null

async function performRefresh(): Promise<AuthSession | null> {
  if (!refreshToken) return null
  try {
    const res = await fetch(url("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearSession()
      return null
    }
    const session = (await res.json()) as AuthSession
    storeSession(session)
    return session
  } catch {
    return null
  }
}

/** Refresh the access token, serializing concurrent callers. */
export function refreshSession(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

/** Restore a session on page load using the stored refresh token. */
export async function restoreSession(): Promise<User | null> {
  if (!refreshToken) return null
  const session = await refreshSession()
  return session?.user ?? null
}

// ---------------------------------------------------------------------------
// Core fetch helper (automatic refresh-once on 401)
// ---------------------------------------------------------------------------

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<Response> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)

  const res = await fetch(url(path), { ...options, headers })

  const canRefresh =
    res.status === 401 &&
    retry &&
    Boolean(refreshToken) &&
    path !== "/auth/refresh" &&
    path !== "/auth/login" &&
    path !== "/auth/register"

  if (canRefresh) {
    const session = await refreshSession()
    if (session) return apiFetch(path, options, false)
  }

  return res
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options)
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(url("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  })
  if (!res.ok) throw await parseError(res)
  const session = (await res.json()) as AuthSession
  storeSession(session)
  return session
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(url("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw await parseError(res)
  const session = (await res.json()) as AuthSession
  storeSession(session)
  return session
}

export async function logout(): Promise<void> {
  if (refreshToken) {
    try {
      await fetch(url("/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      /* ignore network errors on logout */
    }
  }
  clearSession()
}

export async function me(): Promise<User> {
  const data = await requestJson<{ user: User }>("/auth/me")
  return data.user
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(url("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw await parseError(res)
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  const res = await fetch(url("/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  })
  if (!res.ok) throw await parseError(res)
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type Health = { status: string; env: string; uptime: number }
export type Readiness = { status: string; database: string }

export function health(): Promise<Health> {
  return requestJson<Health>("/health")
}

export function ready(): Promise<Readiness> {
  return requestJson<Readiness>("/health/ready")
}

// ---------------------------------------------------------------------------
// LLM
// ---------------------------------------------------------------------------

export type LlmHealth = { status: string; uptime: number; timestamp: string }

export function llmHealth(): Promise<LlmHealth> {
  return requestJson<LlmHealth>("/llm/health")
}

export type ModelInfo = {
  id: string
  name?: string
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
}

export async function listModels(): Promise<ModelInfo[]> {
  const data = await requestJson<{ data?: ModelInfo[] }>("/llm/models")
  return data.data ?? []
}

export type ChatRole = "system" | "user" | "assistant" | "tool" | "developer"

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ChatOptions = {
  model?: string
  space?: string
  temperature?: number
  signal?: AbortSignal
}

export type ChatCompletion = {
  id?: string
  model?: string
  error?: unknown
  choices?: {
    index?: number
    finish_reason?: string | null
    message?: { role?: string; content?: string; reasoning?: string | null }
  }[]
  usage?: Record<string, unknown>
}

export type CacheStatus =
  | "HIT"
  | "MISS"
  | "BYPASS-PAUSED"
  | "BYPASS-STREAM"
  | "NO-SPACE"
  | string
  | null

export type ChatResult = {
  content: string
  reasoning: string
  cache: CacheStatus
  model: string | null
  usage?: Record<string, unknown>
  raw: ChatCompletion
}

function chatHeaders(opts: ChatOptions, stream: boolean): Headers {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (opts.space) headers.set("x-cache-space", opts.space)
  if (stream) headers.set("Accept", "text/event-stream")
  return headers
}

function chatBody(messages: ChatMessage[], opts: ChatOptions, stream: boolean) {
  return JSON.stringify({
    ...(opts.model ? { model: opts.model } : {}),
    ...(opts.temperature !== undefined
      ? { temperature: opts.temperature }
      : {}),
    ...(stream ? { stream: true } : {}),
    messages,
  })
}

export async function chat(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<ChatResult> {
  const res = await fetch(url("/llm/chat/completions"), {
    method: "POST",
    headers: chatHeaders(opts, false),
    body: chatBody(messages, opts, false),
    signal: opts.signal,
  })
  if (!res.ok) throw await parseError(res)

  const raw = (await res.json()) as ChatCompletion
  if (raw.error) throw llmErrorFromBody(raw)

  const message = raw.choices?.[0]?.message
  return {
    content: message?.content ?? "",
    reasoning: message?.reasoning ?? "",
    cache: res.headers.get("x-cache"),
    model: res.headers.get("x-cache-model") ?? raw.model ?? null,
    usage: raw.usage,
    raw,
  }
}

export type ChatStreamHandlers = {
  onStart?: (info: { cache: CacheStatus; model: string | null }) => void
  onDelta?: (text: string) => void
  onReasoning?: (text: string) => void
  onUsage?: (usage: Record<string, unknown>) => void
}

type StreamChunk = {
  model?: string
  error?: unknown
  choices?: {
    delta?: { content?: string | null; reasoning?: string | null }
    finish_reason?: string | null
  }[]
  usage?: Record<string, unknown>
}

function llmErrorFromBody(body: unknown): ApiError {
  const error = (body as { error?: unknown } | null)?.error
  if (error && typeof error === "object") {
    const inner = error as { message?: string; code?: string | number }
    return new ApiError(
      Number(inner.code) || 502,
      String(inner.code ?? "LLM_ERROR"),
      inner.message ?? "The model provider returned an error.",
    )
  }
  return new ApiError(
    502,
    "LLM_ERROR",
    typeof error === "string" ? error : "The model provider returned an error.",
  )
}

/** Stream a chat completion, invoking handlers as tokens arrive. */
export async function chatStream(
  messages: ChatMessage[],
  opts: ChatOptions,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const res = await fetch(url("/llm/chat/completions"), {
    method: "POST",
    headers: chatHeaders(opts, true),
    body: chatBody(messages, opts, true),
    signal: opts.signal,
  })
  if (!res.ok) throw await parseError(res)

  handlers.onStart?.({
    cache: res.headers.get("x-cache"),
    model: res.headers.get("x-cache-model"),
  })

  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  // The backend may deliver the SSE stream directly, or JSON-encoded as a
  // string (e.g. "data: {...}\n\n..."), and errors may arrive as plain JSON
  // bodies with a 2xx status. Track the shape and decode defensively.
  let mode: "unknown" | "sse" | "json-string" | "json" = "unknown"
  let raw = ""
  let sseText = ""
  let jsonStringPending = ""
  let processed = 0
  let sawEvent = false

  const consumeEvents = () => {
    let index: number
    while ((index = sseText.indexOf("\n\n", processed)) !== -1) {
      const event = sseText.slice(processed, index)
      processed = index + 2
      for (const line of event.split("\n")) {
        if (!line.startsWith("data:")) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === "[DONE]") continue
        sawEvent = true
        let chunk: StreamChunk
        try {
          chunk = JSON.parse(payload) as StreamChunk
        } catch {
          continue
        }
        if (chunk.error) throw llmErrorFromBody(chunk)
        const delta = chunk.choices?.[0]?.delta
        if (delta?.reasoning) handlers.onReasoning?.(delta.reasoning)
        if (delta?.content) handlers.onDelta?.(delta.content)
        if (chunk.usage) handlers.onUsage?.(chunk.usage)
      }
    }
  }

  const decodeJsonString = (text: string) => {
    jsonStringPending += text
    let output = ""
    let i = 0
    while (i < jsonStringPending.length) {
      const char = jsonStringPending[i]
      if (char === "\\") {
        if (i + 1 >= jsonStringPending.length) break
        const next = jsonStringPending[i + 1]
        if (next === "u") {
          if (i + 5 >= jsonStringPending.length) break
          output += String.fromCharCode(
            Number.parseInt(jsonStringPending.slice(i + 2, i + 6), 16),
          )
          i += 6
        } else {
          const escapes: Record<string, string> = {
            n: "\n",
            t: "\t",
            r: "\r",
            '"': '"',
            "\\": "\\",
            "/": "/",
            b: "\b",
            f: "\f",
          }
          output += escapes[next] ?? next
          i += 2
        }
      } else if (char === '"') {
        i += 1
        break
      } else {
        output += char
        i += 1
      }
    }
    jsonStringPending = jsonStringPending.slice(i)
    sseText += output
    consumeEvents()
  }

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    raw += text

    if (mode === "unknown") {
      const trimmed = text.trimStart()
      if (!trimmed) continue
      if (trimmed.startsWith('"')) {
        mode = "json-string"
        decodeJsonString(text.slice(text.indexOf('"') + 1))
      } else if (trimmed.startsWith("{")) {
        mode = "json"
      } else {
        mode = "sse"
        sseText += text
        consumeEvents()
      }
      continue
    }

    if (mode === "json-string") decodeJsonString(text)
    else if (mode === "sse") {
      sseText += text
      consumeEvents()
    }
  }

  if (sawEvent) return

  // No SSE events parsed: the payload was a plain JSON body or a JSON string
  // wrapping one. Resolve it and either surface the error or the completion.
  const candidate = (mode === "json-string" ? sseText : raw).trim()
  if (!candidate) return

  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch {
    return
  }

  if (typeof parsed === "string") {
    sseText += parsed
    consumeEvents()
    return
  }

  const record = parsed as ChatCompletion | null
  if (record && record.error) throw llmErrorFromBody(record)
  const message = record?.choices?.[0]?.message
  if (message?.reasoning) handlers.onReasoning?.(message.reasoning)
  if (message?.content) handlers.onDelta?.(message.content)
  if (record?.usage) handlers.onUsage?.(record.usage)
}

// ---------------------------------------------------------------------------
// LLM admin
// ---------------------------------------------------------------------------

export type Space = {
  id: string
  name: string
  description: string | null
  status: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
  entries: number
  hits: number
}

export type Settings = {
  default_model?: string | null
  force_model?: string | null
  cache_ttl_seconds?: number
  upstream_base_url?: string | null
  [key: string]: unknown
}

export type Overview = {
  spaces: Space[]
  settings: Settings
  totals: { entries: number; hits: number; tokens: number }
  eventsLast24h: Record<string, number>
  effective: {
    model: string | null
    forcedModel: string | null
    ttlSeconds: number
    upstreamBaseUrl: string | null
  }
}

export type CacheEntry = {
  id: string
  [key: string]: unknown
}

export type EntriesPage = { rows: CacheEntry[]; total: number }

export function adminOverview(): Promise<Overview> {
  return requestJson<Overview>("/llm/admin/overview")
}

export function adminSpaces(): Promise<Space[]> {
  return requestJson<Space[]>("/llm/admin/spaces")
}

export function adminCreateSpace(body: {
  name: string
  description?: string
  isDefault?: boolean
}): Promise<Space> {
  return requestJson<Space>("/llm/admin/spaces", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function adminUpdateSpace(
  id: string,
  body: { name?: string; description?: string; status?: string },
): Promise<Space> {
  return requestJson<Space>(`/llm/admin/spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function adminSpaceAction(
  id: string,
  action: "pause" | "resume" | "default",
): Promise<Space> {
  return requestJson<Space>(`/llm/admin/spaces/${id}/${action}`, {
    method: "POST",
  })
}

export function adminMoveSpace(
  id: string,
  target: { targetId: string } | { targetName: string },
): Promise<{ moved: number; dropped: number }> {
  return requestJson<{ moved: number; dropped: number }>(
    `/llm/admin/spaces/${id}/move`,
    { method: "POST", body: JSON.stringify(target) },
  )
}

export function adminDeleteSpace(id: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/llm/admin/spaces/${id}`, {
    method: "DELETE",
  })
}

export function adminSettings(): Promise<Settings> {
  return requestJson<Settings>("/llm/admin/settings")
}

export function adminUpdateSettings(body: {
  default_model?: string | null
  force_model?: string | null
  cache_ttl_seconds?: number
  upstream_base_url?: string
}): Promise<Settings> {
  return requestJson<Settings>("/llm/admin/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function adminEntries(params: {
  spaceId?: string
  limit?: number
  offset?: number
}): Promise<EntriesPage> {
  const search = new URLSearchParams()
  if (params.spaceId) search.set("spaceId", params.spaceId)
  if (params.limit !== undefined) search.set("limit", String(params.limit))
  if (params.offset !== undefined) search.set("offset", String(params.offset))
  const query = search.toString()
  return requestJson<EntriesPage>(
    `/llm/admin/entries${query ? `?${query}` : ""}`,
  )
}

export function adminDeleteEntry(id: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/llm/admin/entries/${id}`, {
    method: "DELETE",
  })
}

export function adminPurge(
  body: { spaceId: string } | { expired: true },
): Promise<{ removed: number }> {
  return requestJson<{ removed: number }>("/llm/admin/cache/purge", {
    method: "POST",
    body: JSON.stringify(body),
  })
}
